"use client";
/**
 * LLD visuals, chapter 3 (creational and structural patterns): a call travelling through stacked decorators,
 * and a recursive size() over a composite tree.
 */
import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Btn, Chips, Frame, Stat } from "./kit";
import { cn } from "../../ui";

// ───────────────────────── decorator-onion ─────────────────────────

type LayerK = "metrics" | "cache" | "retry" | "logging";
const LAYER: Record<LayerK, { name: string; color: string }> = {
  metrics: { name: "MetricsDecorator", color: "#b794f4" },
  cache: { name: "CachingDecorator", color: "#4fd1c5" },
  retry: { name: "RetryingDecorator (3 tries)", color: "#ffb454" },
  logging: { name: "LoggingDecorator", color: "#7aa7ff" },
};
type Ev = { layer: number; text: string; tone?: "bad" | "ok" };

function simulate(order: LayerK[], failures: number, warm: boolean) {
  const evs: Ev[] = [];
  let remoteCalls = 0, logLines = 0, failLeft = failures, ms = 0;
  const core = order.length;
  const call = (i: number): boolean => {           // returns true on success
    if (i === core) {
      remoteCalls++; ms += 80;
      evs.push({ layer: core, text: `remote quote(p42) call #${remoteCalls}` });
      if (failLeft > 0) { failLeft--; evs.push({ layer: core, text: "✗ timeout", tone: "bad" }); return false; }
      evs.push({ layer: core, text: "✓ ₹499", tone: "ok" }); return true;
    }
    const k = order[i];
    if (k === "metrics") { evs.push({ layer: i, text: "start timer" }); const ok = call(i + 1); evs.push({ layer: i, text: `record latency ${ms} ms, ${ok ? "success" : "error"}` }); return ok; }
    if (k === "logging") { logLines++; evs.push({ layer: i, text: "log: quote(p42) →" }); const ok = call(i + 1); logLines++; evs.push({ layer: i, text: ok ? "log: ← ₹499" : "log: ← error", tone: ok ? undefined : "bad" }); return ok; }
    if (k === "cache") {
      if (warm) { evs.push({ layer: i, text: "hit: ₹499 (nothing below runs)", tone: "ok" }); return true; }
      evs.push({ layer: i, text: "miss → forward" }); const ok = call(i + 1); if (ok) evs.push({ layer: i, text: "store p42 → ₹499" }); return ok;
    }
    for (let a = 1; a <= 3; a++) {
      evs.push({ layer: i, text: `attempt ${a}` });
      if (call(i + 1)) return true;
      if (a < 3) { ms += 50 * a; evs.push({ layer: i, text: `back off ${50 * a} ms, retry`, tone: "bad" }); }
    }
    evs.push({ layer: i, text: "give up after 3", tone: "bad" }); return false;
  };
  const ok = call(0);
  return { evs, ok, remoteCalls, logLines, ms };
}

export function DecoratorOnion() {
  const [order, setOrder] = useState<LayerK[]>(["metrics", "cache", "retry", "logging"]);
  const [fails, setFails] = useState<"0" | "1" | "3">("1");
  const [warm, setWarm] = useState(false);
  const run = useMemo(() => simulate(order, +fails, warm), [order, fails, warm]);
  const [i, setI] = useState(-1);
  const [playing, setPlaying] = useState(false);
  useEffect(() => { setI(-1); setPlaying(false); }, [run]);
  useEffect(() => {
    if (!playing) return;
    if (i >= run.evs.length - 1) { setPlaying(false); return; }
    const t = setTimeout(() => setI((x) => x + 1), 650);
    return () => clearTimeout(t);
  }, [playing, i, run.evs.length]);
  const cur = i >= 0 ? run.evs[i] : null;
  const move = (j: number, d: -1 | 1) => setOrder((o) => { const n = [...o]; const k = j + d; if (k < 0 || k >= n.length) return o; [n[j], n[k]] = [n[k], n[j]]; return n; });
  return (
    <Frame title="A call through stacked decorators" q="Each layer has the same interface. In what order do they act, and what changes when you reorder them?"
      about="A price lookup goes in through every wrapper to the remote client and the answer comes back out. Reorder the layers, make the remote call fail, or warm the cache, then play."
      foot="Try logging outside retry (one log pair per call) versus inside (one pair per attempt), and the cache above versus below retry: below it, a warm cache still sits behind the retry loop. Each decorator is one small class; the stacking order is a design decision.">
      <div className="flex flex-wrap items-center gap-3">
        <Chips label="Remote fails" value={fails} onChange={setFails} options={[["0", "never"], ["1", "once"], ["3", "3 times"]]} />
        <Btn on={warm} onClick={() => setWarm((w) => !w)}>{warm ? "Cache: warm" : "Cache: cold"}</Btn>
        <Btn onClick={() => { if (i >= run.evs.length - 1) setI(-1); setPlaying(true); }}>Play</Btn>
        <Btn onClick={() => { setPlaying(false); setI((x) => Math.min(run.evs.length - 1, x + 1)); }}>Step</Btn>
        <Btn onClick={() => { setPlaying(false); setI(-1); }}>Reset</Btn>
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-[1.1fr_1fr]">
        <div className="rounded-xl border border-line bg-bg p-3">
          {[...order, "core" as const].map((k, j) => {
            const isCore = k === "core";
            const active = cur?.layer === j;
            const c = isCore ? "#c8f547" : LAYER[k as LayerK].color;
            return (
              <div key={k} className={cn("rounded-xl border p-2 transition-all", active && "shadow-[0_0_0_2px_rgba(200,245,71,.35)]")} style={{ marginLeft: j * 14, marginTop: j ? 6 : 0, borderColor: active ? c : "var(--color-line)", background: active ? `${c}18` : undefined }}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[12px] font-semibold" style={{ color: c }}>{isCore ? "RemotePriceClient (the real thing)" : LAYER[k as LayerK].name}</span>
                  {!isCore && <span className="flex gap-1"><button aria-label="Move outward" onClick={() => move(j, -1)} className="text-faint hover:text-text"><ArrowUp size={13} /></button><button aria-label="Move inward" onClick={() => move(j, 1)} className="text-faint hover:text-text"><ArrowDown size={13} /></button></span>}
                </div>
                {active && <div className={cn("mt-0.5 text-[12px]", cur?.tone === "bad" ? "text-bad" : cur?.tone === "ok" ? "text-ok" : "text-text")}>{cur?.text}</div>}
              </div>
            );
          })}
        </div>
        <div>
          <div className="grid grid-cols-2 gap-2">
            <Stat k="Result" v={i >= run.evs.length - 1 ? (run.ok ? "₹499" : "error") : "…"} tone={i >= run.evs.length - 1 ? (run.ok ? "#5be49b" : "#ff8f8f") : undefined} />
            <Stat k="Remote calls" v={run.remoteCalls} />
            <Stat k="Log lines" v={run.logLines} />
            <Stat k="Latency" v={`${run.ms} ms`} />
          </div>
          <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-line bg-panel2/40 p-2 font-mono text-[11.5px] leading-relaxed">
            {run.evs.slice(0, i + 1).map((e, j) => <div key={j} className={e.tone === "bad" ? "text-bad" : e.tone === "ok" ? "text-ok" : "text-mute"}><span className="text-faint">{"  ".repeat(e.layer)}{e.layer === order.length ? "core" : order[e.layer]}: </span>{e.text}</div>)}
            {i < 0 && <span className="text-faint">Press Play.</span>}
          </div>
        </div>
      </div>
    </Frame>
  );
}

// ───────────────────────── composite-tree ─────────────────────────

type TNode = { id: string; name: string; size?: number; kids?: TNode[] };
const TREE: TNode = {
  id: "/", name: "/", kids: [
    { id: "/docs", name: "docs/", kids: [
      { id: "/docs/cv.pdf", name: "cv.pdf", size: 120 },
      { id: "/docs/notes.md", name: "notes.md", size: 4 },
      { id: "/docs/img", name: "img/", kids: [{ id: "/docs/img/a.png", name: "a.png", size: 300 }, { id: "/docs/img/b.png", name: "b.png", size: 500 }] },
    ] },
    { id: "/music", name: "music/", kids: [{ id: "/music/song.mp3", name: "song.mp3", size: 4000 }] },
    { id: "/todo.txt", name: "todo.txt", size: 1 },
  ],
};
const find = (n: TNode, id: string): TNode | null => (n.id === id ? n : (n.kids ?? []).reduce<TNode | null>((a, k) => a ?? find(k, id), null));
type TEv = { id: string; kind: "call" | "ret"; val?: number; depth: number };
function walk(n: TNode, depth: number, out: TEv[]): number {
  out.push({ id: n.id, kind: "call", depth });
  const v = n.kids ? n.kids.reduce((s, k) => s + walk(k, depth + 1, out), 0) : n.size!;
  out.push({ id: n.id, kind: "ret", val: v, depth });
  return v;
}

export function CompositeTree() {
  const [root, setRoot] = useState("/");
  const evs = useMemo(() => { const o: TEv[] = []; walk(find(TREE, root)!, 0, o); return o; }, [root]);
  const [i, setI] = useState(-1);
  const [playing, setPlaying] = useState(false);
  useEffect(() => { setI(-1); }, [root]);
  useEffect(() => {
    if (!playing) return;
    if (i >= evs.length - 1) { setPlaying(false); return; }
    const t = setTimeout(() => setI((x) => x + 1), 380);
    return () => clearTimeout(t);
  }, [playing, i, evs.length]);
  const done = new Map<string, number>(), active = new Set<string>();
  evs.slice(0, i + 1).forEach((e) => { if (e.kind === "call") active.add(e.id); else { active.delete(e.id); done.set(e.id, e.val!); } });
  const cur = i >= 0 ? evs[i] : null;
  const calls = evs.slice(0, i + 1).filter((e) => e.kind === "call").length;
  const depth = active.size;
  const Row = ({ n, d }: { n: TNode; d: number }) => {
    const isDir = !!n.kids;
    return (
      <>
        <button onClick={() => { if (isDir) { setRoot(n.id); setI(-1); setPlaying(true); } }} className={cn("flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1 text-left font-mono text-[12.5px] transition",
          cur?.id === n.id ? (cur.kind === "call" ? "bg-accent/15 text-accent" : "bg-ok/15 text-ok") : active.has(n.id) ? "bg-panel2" : "", isDir ? "hover:bg-panel2" : "cursor-default")} style={{ paddingLeft: 8 + d * 18 }}>
          <span>{isDir ? "📁" : "📄"} {n.name}{n.id === root && <span className="ml-2 text-[10.5px] text-faint">← size() called here</span>}</span>
          <span className="num text-[11.5px]">{done.has(n.id) ? `${done.get(n.id)} KB` : !isDir ? <span className="text-faint">{n.size} KB</span> : ""}</span>
        </button>
        {n.kids?.map((k) => <Row key={k.id} n={k} d={d + 1} />)}
      </>
    );
  };
  return (
    <Frame title="size() on a tree of files and folders" q="How does one call on a folder add up everything beneath it, without ever asking 'is this a file or a folder?'"
      about="Click any folder to call size() on it. Highlighted rows are calls in progress; green rows have returned their total."
      foot="A file answers with its own size. A folder answers by asking each child the same question and adding the answers. The same recursive shape works for price of a bundle, salary of a department or rendering a UI tree.">
      <div className="grid gap-3 lg:grid-cols-[1.3fr_1fr]">
        <div className="rounded-xl border border-line bg-bg p-2"><Row n={TREE} d={0} /></div>
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2"><Stat k="size() calls so far" v={calls} /><Stat k="Call-stack depth" v={depth} /></div>
          <div className="rounded-xl border border-line bg-panel2/40 p-2.5 text-[12.5px] leading-relaxed">
            {cur ? (cur.kind === "call"
              ? <><span className="font-mono text-accent">{find(TREE, cur.id)!.name}.size()</span> <span className="text-mute">{find(TREE, cur.id)!.kids ? "asks each child for its size" : "is a file: returns its own size"}</span></>
              : <><span className="font-mono text-ok">{find(TREE, cur.id)!.name} → {cur.val} KB</span> <span className="text-mute">{find(TREE, cur.id)!.kids ? "(sum of its children)" : ""}</span></>)
              : <span className="text-faint">Click a folder.</span>}
          </div>
          <pre className="code text-[11px] leading-relaxed">{"// File\nlong size() { return bytes; }\n\n// Folder\nlong size() {\n  return children.stream()\n      .mapToLong(Node::size).sum();\n}"}</pre>
          <Btn onClick={() => { setI(-1); setPlaying(true); }}>Replay</Btn>
        </div>
      </div>
    </Frame>
  );
}
