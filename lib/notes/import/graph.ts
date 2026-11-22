// A small state-graph runtime in the style of LangGraph: named nodes that return state patches,
// fixed and conditional edges, human-in-the-loop interrupts and a checkpoint after every node, so a
// run survives a closed tab and resumes exactly where it stopped. Pure: no I/O, no React.

export const END = "__end__";

export interface Checkpoint<S> {
  state: S;
  next: string | null;              // node to run next; null when the graph has finished
  interrupt?: { node: string; payload: unknown };
  step: number;
}

/** Thrown by `ctx.interrupt` to pause the graph until the caller resumes it with a value. */
export class Interrupt extends Error {
  node: string;
  payload: unknown;
  constructor(node: string, payload: unknown) { super(`Interrupted at ${node}`); this.node = node; this.payload = payload; }
}

export interface NodeCtx<S> {
  node: string;
  signal: AbortSignal;
  /** Pause for a human decision. Returns the resume value when the run is resumed. */
  interrupt<T>(payload: unknown): T;
  /** Persist intermediate progress inside a long node (counts toward the next checkpoint). */
  save(patch: Partial<S>): void;
  state(): S;
}

export type NodeFn<S> = (state: S, ctx: NodeCtx<S>) => Promise<Partial<S> | void> | Partial<S> | void;

export interface RunHooks<S> {
  signal?: AbortSignal;
  resume?: unknown;                         // value for the interrupted node
  onNode?: (node: string, phase: "start" | "end" | "error", state: S, err?: unknown) => void;
  onCheckpoint?: (cp: Checkpoint<S>) => void | Promise<void>;
  /** progress saved inside a node; the checkpoint points back at that node so a crash resumes there */
  onSave?: (cp: Checkpoint<S>) => void;
  maxSteps?: number;
}

export class StateGraph<S extends object> {
  private nodes = new Map<string, NodeFn<S>>();
  private edges = new Map<string, (s: S) => string>();
  private entry: string | null = null;

  addNode(id: string, fn: NodeFn<S>) { this.nodes.set(id, fn); return this; }
  addEdge(from: string, to: string) { this.edges.set(from, () => to); return this; }
  addConditionalEdges(from: string, route: (s: S) => string) { this.edges.set(from, route); return this; }
  setEntry(id: string) { this.entry = id; return this; }
  get nodeIds() { return [...this.nodes.keys()]; }

  start(state: S): Checkpoint<S> {
    if (!this.entry) throw new Error("Graph has no entry node");
    return { state, next: this.entry, step: 0 };
  }

  /** Run from a checkpoint until the graph ends, is interrupted, aborted or fails. */
  async run(cp: Checkpoint<S>, hooks: RunHooks<S> = {}): Promise<Checkpoint<S>> {
    const signal = hooks.signal ?? new AbortController().signal;
    let state = cp.state;
    let next = cp.next;
    let step = cp.step;
    let resume = cp.interrupt ? { node: cp.interrupt.node, value: hooks.resume } : null;
    const max = hooks.maxSteps ?? 200;

    while (next && next !== END) {
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
      if (++step > max) throw new Error(`Graph exceeded ${max} steps (a loop that never ends?)`);
      const fn = this.nodes.get(next);
      if (!fn) throw new Error(`Unknown node "${next}"`);
      const node = next;
      let pending: Partial<S> = {};
      const ctx: NodeCtx<S> = {
        node,
        signal,
        interrupt<T>(payload: unknown): T {
          if (resume && resume.node === node) { const v = resume.value as T; resume = null; return v; }
          throw new Interrupt(node, payload);
        },
        save(patch) { pending = { ...pending, ...patch }; state = { ...state, ...patch }; hooks.onSave?.({ state, next: node, step: step - 1 }); },
        state: () => state,
      };
      hooks.onNode?.(node, "start", state);
      try {
        const patch = await fn(state, ctx);
        state = { ...state, ...pending, ...(patch ?? {}) };
      } catch (e) {
        if (e instanceof Interrupt) {
          const out: Checkpoint<S> = { state, next: node, interrupt: { node, payload: e.payload }, step: step - 1 };
          await hooks.onCheckpoint?.(out);
          return out;
        }
        hooks.onNode?.(node, "error", state, e);
        // keep partial progress so a retry continues instead of starting over
        await hooks.onCheckpoint?.({ state, next: node, step: step - 1 });
        throw e;
      }
      hooks.onNode?.(node, "end", state);
      const route = this.edges.get(node);
      next = route ? route(state) : END;
      await hooks.onCheckpoint?.({ state, next: next === END ? null : next, step });
    }
    return { state, next: null, step };
  }
}
