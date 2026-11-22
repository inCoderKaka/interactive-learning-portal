"use client";
// Import runs: start, pause, resume and approve the graph from anywhere in the app. A run lives in a
// module-level runner (not a component), so it keeps going while the learner browses, and every
// checkpoint is written to IndexedDB, so a closed tab resumes where it stopped.

import { create } from "zustand";
import { useStore } from "@/lib/store";
import { aiReady } from "@/lib/ai";
import { llmCostUsd } from "@/lib/interview/core/usage";
import { TOPICS, topicById } from "@/content";
import { idbAll, idbDel, idbPut } from "../idb";
import { useNotes } from "../store";
import { dataUriToBlob, putMedia } from "../media";
import { uid, type NoteBlock, type NoteColor, type PortalNote } from "../types";
import type { Checkpoint } from "./graph";
import type { ParsedDoc } from "./doc";
import { makeLlm, stepTarget, type CallRecord } from "./llm";
import { buildImportGraph, draftHash, estimate, initialState, renderDraft, type AiStep, type Estimate, type ImportConfig, type ImportEnv, type ImportState } from "./pipeline";
import { fnv } from "./text";

export type RunStatus = "running" | "waiting" | "paused" | "failed" | "done" | "cancelled";

export interface RunRecord {
  id: string;
  name: string;
  created: number;
  updated: number;
  status: RunStatus;
  cp: Checkpoint<ImportState>;
  calls: CallRecord[];
  error?: string;
  undone?: boolean;
}

interface ImportsState {
  runs: Record<string, RunRecord>;
  loaded: boolean;
  toast: { id: string; text: string; key: number } | null;
}

export const useImports = create<ImportsState>()(() => ({ runs: {}, loaded: false, toast: null }));

const controllers = new Map<string, AbortController>();
const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();

const AREA_COLOR: Record<string, NoteColor> = { dsa: "teal", hld: "blue", lld: "amber", craft: "pink", ai: "violet" };

function setRun(id: string, p: Partial<RunRecord>, persist: "now" | "soon" = "soon") {
  const cur = useImports.getState().runs[id];
  if (!cur) return;
  const next = { ...cur, ...p, updated: Date.now() };
  useImports.setState((s) => ({ runs: { ...s.runs, [id]: next } }));
  clearTimeout(saveTimers.get(id));
  if (persist === "now") void idbPut("runs", id, next);
  else saveTimers.set(id, setTimeout(() => void idbPut("runs", id, useImports.getState().runs[id]), 1200));
}

const toast = (id: string, text: string) => useImports.setState({ toast: { id, text, key: Date.now() } });

export async function loadRuns() {
  if (useImports.getState().loaded) return;
  const all = await idbAll<RunRecord>("runs").catch(() => []);
  const runs = Object.fromEntries(all.map((r) => [r.id, r.status === "running" ? { ...r, status: "paused" as const } : r]));
  useImports.setState({ runs, loaded: true });
  // a run that was working when the tab closed carries on by itself
  const s = useStore.getState().settings;
  for (const r of all) if (r.status === "running" && aiReady(s)) setTimeout(() => void execute(r.id), 1500);
}

function env(id: string): ImportEnv {
  const settings = useStore.getState().settings;
  const config = () => useImports.getState().runs[id]?.cp.state.config;
  const prior = Object.values(useNotes.getState().notes).filter((n) => n.kind === "imported" && !n.deleted && n.src?.run !== id);
  return {
    llm: makeLlm(settings, () => config()!, (rec) => {
      const r = useImports.getState().runs[id];
      if (r) setRun(id, { calls: [...r.calls, rec] });
    }),
    catalog: TOPICS.map((t) => ({ id: t.id, area: t.area, title: t.title, blurb: t.blurb })),
    prior: prior.map((n) => ({ id: n.id, topic: n.topic, text: [n.title ?? "", ...n.blocks.map((b) => (b.t === "text" ? b.md : ""))].join("\n"), hash: n.src?.section, at: n.created })),
    models: modelsFor(() => config()!),
    commit: (s) => commitRun(s),
  };
}

function modelsFor(config: () => ImportConfig) {
  return (step: AiStep) => {
    const t = stepTarget(useStore.getState().settings, config(), step);
    return { provider: t.provider, model: t.model, tier: t.tier, webUsd: t.webUsd, concurrency: t.concurrency, batchChars: t.batchChars, price: (i: number, o: number) => llmCostUsd(t.provider, t.model, i, o) };
  };
}

/** Cost and time for a state under a (possibly edited) config, without running anything. */
export function estimateFor(s: ImportState, config: ImportConfig): Estimate {
  return estimate({ ...s, config }, { llm: async () => { throw new Error("preview"); }, catalog: TOPICS.map((t) => ({ id: t.id, area: t.area, title: t.title, blurb: t.blurb })), prior: [], models: modelsFor(() => config), commit: async () => [] });
}

/** Create a run from a parsed document and start it. */
export function startRun(doc: ParsedDoc, config: ImportConfig): string {
  const id = uid();
  const graph = buildImportGraph(env(id));
  const rec: RunRecord = { id, name: doc.name, created: Date.now(), updated: Date.now(), status: "running", cp: graph.start(initialState(id, doc, config)), calls: [] };
  useImports.setState((s) => ({ runs: { ...s.runs, [id]: rec } }));
  void idbPut("runs", id, rec);
  void execute(id);
  return id;
}

async function execute(id: string, resume?: unknown) {
  const rec = useImports.getState().runs[id];
  if (!rec || controllers.has(id)) return;
  const ctl = new AbortController();
  controllers.set(id, ctl);
  setRun(id, { status: "running", error: undefined }, "now");
  const graph = buildImportGraph(env(id));
  try {
    const out = await graph.run(rec.cp, {
      signal: ctl.signal,
      resume,
      onSave: (cp) => setRun(id, { cp }),
      onCheckpoint: (cp) => setRun(id, { cp }, "now"),
    });
    if (out.interrupt) {
      setRun(id, { cp: out, status: "waiting" }, "now");
      const kind = (out.interrupt.payload as { kind: string }).kind;
      toast(id, kind === "plan" ? `${rec.name}: the plan is ready for your approval` : kind === "final" ? `${rec.name}: notes are ready for your final review` : `${rec.name}: checkpoint, take a look`);
    } else {
      setRun(id, { cp: out, status: "done" }, "now");
      const n = out.state.committed?.length ?? 0;
      toast(id, `${rec.name}: ${n} note${n === 1 ? "" : "s"} added`);
    }
  } catch (e) {
    const aborted = e instanceof DOMException && e.name === "AbortError";
    const cur = useImports.getState().runs[id];
    if (cur?.status !== "cancelled") setRun(id, { status: aborted ? "paused" : "failed", error: aborted ? undefined : e instanceof Error ? e.message : String(e) }, "now");
  } finally {
    controllers.delete(id);
  }
}

/** Answer the interrupt the run is waiting on (plan approval, a checkpoint or the final review). */
export function resumeRun(id: string, value?: unknown) {
  const r = useImports.getState().runs[id];
  if (!r || r.status === "running") return;
  void execute(id, r.status === "waiting" ? value : undefined);
}

export function pauseRun(id: string) { controllers.get(id)?.abort(); }

export function cancelRun(id: string) {
  setRun(id, { status: "cancelled" }, "now");
  controllers.get(id)?.abort();
}

/** Change the run's settings while it waits or is paused (optional steps, approvals, scopes, tuning). */
export function setRunConfig(id: string, config: ImportConfig) {
  const r = useImports.getState().runs[id];
  if (r) setRun(id, { cp: { ...r.cp, state: { ...r.cp.state, config } } }, "now");
}

/** Switch a running import to background mode: no more approvals or checkpoints. */
export function backgroundRun(id: string) {
  const r = useImports.getState().runs[id];
  if (!r) return;
  const c = r.cp.state.config;
  setRunConfig(id, { ...c, approvals: { plan: false, final: false }, checkpoints: { firstBatch: false, afterExtract: false, afterVerify: false, afterEnrich: false } });
}

export function callFeedback(id: string, callId: string, feedback: string) {
  const r = useImports.getState().runs[id];
  if (r) setRun(id, { calls: r.calls.map((c) => (c.id === callId ? { ...c, feedback } : c)) }, "now");
}

export async function deleteRun(id: string) {
  controllers.get(id)?.abort();
  useImports.setState((s) => { const runs = { ...s.runs }; delete runs[id]; return { runs }; });
  await idbDel("runs", id);
}

/** Remove every note an import added (they stay restorable from the Notes tab's trash). */
export function undoRun(id: string) {
  const { notes, remove } = useNotes.getState();
  for (const n of Object.values(notes)) if (n.src?.run === id && !n.deleted) remove(n.id);
  setRun(id, { undone: true }, "now");
}

export function redoRun(id: string) {
  const { notes, restore } = useNotes.getState();
  for (const n of Object.values(notes)) if (n.src?.run === id && n.deleted) restore(n.id);
  setRun(id, { undone: false }, "now");
}

async function commitRun(s: ImportState): Promise<string[]> {
  const media = new Map<string, string>();
  const imageBlock = async (src: string, alt?: string): Promise<NoteBlock> => {
    if (!src.startsWith("data:")) return { id: uid(), t: "text", md: `![${alt ?? ""}](${src})` };
    const key = fnv(src);
    let m = media.get(key);
    if (!m) { const blob = dataUriToBlob(src); if (!blob) return { id: uid(), t: "text", md: `_(an image from the document could not be read)_` }; m = await putMedia(blob); media.set(key, m); }
    return { id: uid(), t: "image", media: m, alt };
  };
  const now = Date.now();
  const secHash = new Map(s.doc.sections.map((x) => [x.id, x.hash]));
  const out: PortalNote[] = [];
  for (const d of Object.values(s.drafts)) {
    if (!d.accepted || d.dupOf) continue;
    const blocks: NoteBlock[] = [];
    for (const p of renderDraft(s, d).parts) blocks.push(p.t === "md" ? { id: uid(), t: "text", md: p.md } : await imageBlock(p.block.src ?? "", p.block.alt));
    const sec = s.doc.sections.find((x) => x.id === d.section);
    const area = d.topic ? topicById.get(d.topic)?.area : undefined;
    out.push({
      id: uid(), kind: "imported", page: "", topic: d.topic, title: d.title, blocks, color: area ? AREA_COLOR[area] : "lime",
      src: { run: s.runId, doc: s.doc.name, path: (sec?.path ?? []).filter((p, i) => !(i === 0 && p === s.doc.name && (sec?.path.length ?? 0) > 1)), blocks: d.covers, hash: draftHash(s, d), section: secHash.get(d.section) },
      verify: d.verify, web: d.web, created: now, updated: now,
    });
  }
  useNotes.getState().upsertMany(out);
  return out.map((n) => n.id);
}

export const activeRun = (runs: Record<string, RunRecord>) =>
  Object.values(runs).filter((r) => r.status === "running" || r.status === "waiting" || r.status === "paused").sort((a, b) => b.updated - a.updated)[0];
