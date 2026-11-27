"use client";
/** Messaging and streaming visuals: queue vs log, consumer groups, MapReduce, windows and watermarks. */
import { useState } from "react";
import { motion } from "motion/react";
import { Btn, Frame, Predict, SimControls, Slider, Stat, NODE, useSim } from "./kit";
import { cn } from "../../ui";

// ───────── queue vs log ─────────
export function QueueLog() {
  const [made, setMade] = useState(0);
  const [queue, setQueue] = useState<number[]>([]);
  const [workers, setWorkers] = useState(2);
  const [done, setDone] = useState<Record<number, number[]>>({ 0: [], 1: [], 2: [] });
  const [log, setLog] = useState<number[]>([]);
  const [off, setOff] = useState({ search: 0, analytics: 0 });
  const [note, setNote] = useState("Produce a few messages, then consume.");
  const produce = () => { const ids = [made + 1, made + 2, made + 3]; setMade(made + 3); setQueue((q) => [...q, ...ids]); setLog((l) => [...l, ...ids]); setNote(`Produced m${ids[0]}–m${ids[2]}. The queue holds them until a worker takes each; the log appends them at offsets ${log.length}–${log.length + 2}.`); };
  const consume = () => {
    const take = queue.slice(0, workers);
    setQueue((q) => q.slice(workers));
    setDone((d) => { const n = { ...d }; take.forEach((m, i) => { n[i] = [...(n[i] ?? []), m]; }); return n; });
    setOff((o) => ({ search: Math.min(log.length, o.search + 1), analytics: Math.min(log.length, o.analytics + 1) }));
    setNote(take.length ? `Queue: ${take.map((m, i) => `worker ${i + 1} took m${m}`).join(", ")}; those messages are gone from the queue. Log: each consumer group moved its own offset forward by one; nothing was deleted.` : "Nothing left in the queue. The log still has every message.");
  };
  const replay = () => { setOff((o) => ({ ...o, analytics: 0 })); setNote("Analytics reset its offset to 0 to recompute history (say, after a bug fix). The search indexer is unaffected. A queue cannot do this: consumed messages are gone."); };
  return (
    <Frame title="Queue vs log" q="Two systems need every order event, and you want to recompute history after a bug. Which one works?"
      about="The same messages go into a task queue (left) and an event log (right). Workers compete for queue messages; consumer groups read the log independently."
      foot={note}>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          <Btn on onClick={produce}>Produce 3 messages</Btn>
          <Btn onClick={consume}>Consume one round</Btn>
          <Btn onClick={() => setWorkers((w) => Math.min(3, w + 1))} disabled={workers >= 3}>Add a queue worker</Btn>
          <Btn onClick={replay} disabled={!log.length}>Replay analytics from offset 0</Btn>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-line bg-bg p-3">
            <div className="mb-2 text-[13px] font-semibold">Task queue</div>
            <div className="flex min-h-8 flex-wrap gap-1">{queue.map((m) => <motion.span layout key={m} className="rounded-md border border-line px-1.5 py-0.5 font-mono text-[11px]">m{m}</motion.span>)}{!queue.length && <span className="text-[12px] text-faint">empty</span>}</div>
            <div className="mt-2 space-y-1">
              {Array.from({ length: workers }, (_, i) => (
                <div key={i} className="flex items-center gap-2 text-[12px]"><span className="w-16 shrink-0" style={{ color: NODE[i] }}>worker {i + 1}</span><span className="font-mono text-[11px] text-mute">{(done[i] ?? []).map((m) => `m${m}`).join(" ") || "–"}</span></div>
              ))}
            </div>
            <p className="mt-2 text-[11.5px] text-faint">Each message goes to exactly one worker and is deleted once acknowledged.</p>
          </div>
          <div className="rounded-xl border border-line bg-bg p-3">
            <div className="mb-2 text-[13px] font-semibold">Event log (one partition)</div>
            <div className="flex min-h-8 flex-wrap gap-1">{log.map((m, i) => (
              <span key={m} className={cn("relative rounded-md border px-1.5 py-0.5 font-mono text-[11px]", i < off.search || i < off.analytics ? "border-line text-mute" : "border-[#2f3550] text-faint")}>
                <span className="text-[9px] text-faint">{i}:</span>m{m}
              </span>))}{!log.length && <span className="text-[12px] text-faint">empty</span>}</div>
            <div className="mt-2 space-y-1 text-[12px]">
              <div><span className="text-hld">search indexer</span> offset <span className="num font-semibold">{off.search}</span></div>
              <div><span className="text-lld">analytics</span> offset <span className="num font-semibold">{off.analytics}</span></div>
            </div>
            <p className="mt-2 text-[11.5px] text-faint">Messages stay; each consumer group keeps its own position and can rewind.</p>
          </div>
        </div>
      </div>
    </Frame>
  );
}

// ───────── consumer groups ─────────
const NP = 6, PROD = 10, CAP = 24, PAUSE = 2000;
type CG = { t: number; owner: number[]; lag: number[]; pausedUntil: number[]; consumers: number };
const assign = (c: number) => Array.from({ length: NP }, (_, p) => p % c);
export function ConsumerGroups() {
  const [mode, setMode] = useState<"eager" | "coop">("coop");
  const sim = useSim<CG>(() => ({ t: 0, owner: assign(2), lag: Array(NP).fill(0), pausedUntil: Array(NP).fill(0), consumers: 2 }), (s) => {
    s.t += 100;
    const load = Array(s.consumers).fill(0);
    s.owner.forEach((o, p) => { if (s.pausedUntil[p] <= s.t) load[o]++; });
    s.lag = s.lag.map((l, p) => {
      const add = PROD / 10;
      const active = s.pausedUntil[p] <= s.t;
      const take = active ? CAP / 10 / Math.max(1, load[s.owner[p]]) : 0;
      return Math.max(0, l + add - take);
    });
  }, [mode], 3);
  const setConsumers = (c: number) => sim.act((s) => {
    const next = assign(c);
    s.pausedUntil = s.pausedUntil.map((u, p) => (mode === "eager" || next[p] !== s.owner[p] ? s.t + PAUSE : u));
    s.owner = next; s.consumers = c;
  });
  const s = sim.s;
  const idle = Math.max(0, s.consumers - NP);
  return (
    <Frame title="Consumer group rebalancing" q="Each consumer handles 24 messages/s; each of 6 partitions receives 10/s. How many consumers keep up, and what does adding one cost?"
      about="Partitions (rows) are assigned to consumers (colours). Bars show lag. Changing the number of consumers triggers a rebalance: in eager mode every partition pauses; in cooperative mode only the partitions that move."
      foot={idle ? `${idle} consumer${idle > 1 ? "s are" : " is"} idle: a group can't use more consumers than partitions.` : s.consumers < 3 ? "Each consumer owns several partitions and needs more than 24 messages/s, so lag keeps growing." : "Every consumer can keep up; lag drains to zero (until the next rebalance pause)."}>
      <div className="space-y-3">
        <Predict q="6 partitions, 8 consumers in one group. How many consumers receive messages?" options={["8", "6", "4"]} answer={1} why="Each partition is assigned to exactly one consumer in a group, so 2 consumers sit idle." />
        <div className="flex flex-wrap items-center gap-2">
          <SimControls sim={sim} stepLabel="+1 s" stepN={10} />
          <span className="text-[12px] text-faint">Consumers:</span>
          {[1, 2, 3, 4, 6, 8].map((c) => <Btn key={c} on={s.consumers === c} onClick={() => setConsumers(c)}>{c}</Btn>)}
          <Btn on={mode === "coop"} onClick={() => setMode(mode === "coop" ? "eager" : "coop")}>{mode === "coop" ? "Cooperative rebalance" : "Eager rebalance"}</Btn>
        </div>
        <div className="space-y-1.5 rounded-xl border border-line bg-bg p-3">
          {s.lag.map((l, p) => (
            <div key={p} className="flex items-center gap-2">
              <span className="w-8 font-mono text-[11px] text-faint">P{p}</span>
              <span className="w-24 text-[11.5px]" style={{ color: NODE[s.owner[p]] }}>consumer {s.owner[p] + 1}{s.pausedUntil[p] > s.t ? " ⏸" : ""}</span>
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-[#161a27]"><motion.div className="h-full rounded-full" animate={{ width: `${Math.min(100, l / 3)}%` }} style={{ background: l > 150 ? "var(--color-bad)" : NODE[s.owner[p]] }} /></div>
              <span className="num w-14 text-right text-[11px] text-mute">{Math.round(l)}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <Stat k="Total lag (messages)" v={Math.round(s.lag.reduce((a, b) => a + b, 0))} />
          <Stat k="Idle consumers" v={idle} tone={idle ? "var(--color-warn)" : undefined} />
          <Stat k="Time" v={`${(s.t / 1000).toFixed(1)} s`} />
        </div>
      </div>
    </Frame>
  );
}

// ───────── MapReduce ─────────
const SPLITS = ["the cat sat", "the dog sat", "the cat ran the race"];
const STAGES = ["Input splits", "Map", "Combine", "Shuffle", "Reduce"];
const red = (w: string) => (w.charCodeAt(0) + w.length) % 2; // which of 2 reducers owns a word
export function MapReduce() {
  const [stage, setStage] = useState(0);
  const [combine, setCombine] = useState(true);
  const mapped = SPLITS.map((s) => s.split(" ").map((w) => [w, 1] as [string, number]));
  const combined = mapped.map((ps) => Object.entries(ps.reduce<Record<string, number>>((m, [w]) => ({ ...m, [w]: (m[w] ?? 0) + 1 }), {})) as [string, number][]);
  const out = combine ? combined : mapped;
  const shuffled = [0, 1].map((r) => out.flat().filter(([w]) => red(w) === r));
  const reduced = shuffled.map((ps) => Object.entries(ps.reduce<Record<string, number>>((m, [w, n]) => ({ ...m, [w]: (m[w] ?? 0) + n }), {})));
  const pairs = out.flat().length;
  const Pair = ({ p, r }: { p: [string, number]; r?: number }) => <span className="rounded border border-line px-1 font-mono text-[11px]" style={{ color: r === undefined ? undefined : NODE[r + 1] }}>({p[0]}, {p[1]})</span>;
  const eff = stage === 2 && !combine ? 3 : stage;
  return (
    <Frame title="Word count with MapReduce" q="How do thousands of machines count words together without one machine seeing everything?"
      about="Three input splits, three mappers, two reducers. Step through the phases. Colours show which reducer each word belongs to (by hashing the word)."
      foot={`${pairs} pairs cross the network in the shuffle${combine ? ` (instead of ${mapped.flat().length} without the combiner)` : ""}. On real data the combiner often cuts shuffle traffic by 10× or more.`}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {STAGES.map((st, i) => <Btn key={st} on={stage === i} onClick={() => setStage(i)}>{i + 1}. {st}</Btn>)}
          <Btn on={combine} onClick={() => setCombine(!combine)}>Combiner {combine ? "on" : "off"}</Btn>
        </div>
        <div className="grid gap-2 md:grid-cols-3">
          {SPLITS.map((s, i) => (
            <div key={i} className="rounded-xl border border-line bg-bg p-2.5">
              <div className="mb-1 text-[11px] text-faint">split {i + 1} → mapper {i + 1}</div>
              <div className="font-mono text-[12px] text-mute">&ldquo;{s}&rdquo;</div>
              {eff >= 1 && <div className="mt-1.5 flex flex-wrap gap-1">{(eff >= 2 && combine ? combined[i] : mapped[i]).map((p, k) => <Pair key={k} p={p} r={eff >= 3 ? red(p[0]) : undefined} />)}</div>}
            </div>
          ))}
        </div>
        {eff >= 3 && (
          <div className="grid gap-2 md:grid-cols-2">
            {[0, 1].map((r) => (
              <div key={r} className="rounded-xl border p-2.5" style={{ borderColor: NODE[r + 1] }}>
                <div className="mb-1 text-[11px]" style={{ color: NODE[r + 1] }}>reducer {r + 1}{eff === 3 ? ": receives (sorted by word)" : ": sums each word"}</div>
                <div className="flex flex-wrap gap-1">
                  {eff === 3 ? [...shuffled[r]].sort((a, b) => a[0].localeCompare(b[0])).map((p, k) => <Pair key={k} p={p} r={r} />) : reduced[r].map(([w, n]) => <span key={w} className="rounded bg-accent/15 px-1.5 font-mono text-[12px] text-accent">{w}: {n}</span>)}
                </div>
              </div>
            ))}
          </div>
        )}
        <Stat k="Pairs shuffled across the network" v={eff >= 3 ? pairs : "–"} />
      </div>
    </Frame>
  );
}

// ───────── windows and watermarks ─────────
// events: [event time (s), arrival delay (s)]; one-second tumbling windows over event time 0–8
const EVS: [number, number][] = [[0.2, 0.3], [0.5, 0.4], [0.9, 2.6], [1.1, 0.2], [1.4, 0.5], [1.7, 0.3], [2.2, 0.4], [2.5, 4.6], [2.8, 0.3], [3.1, 0.6], [3.3, 0.2], [3.9, 1.6], [4.4, 0.3], [4.6, 0.4], [5.2, 0.5], [5.5, 0.2], [5.8, 3.1], [6.3, 0.4], [6.9, 0.3], [7.2, 0.6], [7.5, 0.2]];
export function Watermarks() {
  const [slack, setSlack] = useState(0.5);
  const [late, setLate] = useState(2);
  const sim = useSim(() => ({ t: 0 }), (s) => { s.t = Math.min(13, s.t + 0.02); }, [slack, late], 1);
  const t = sim.s.t, wm = Math.max(0, t - slack);
  const windows = Array.from({ length: 8 }, (_, w) => {
    const evs = EVS.filter(([e]) => Math.floor(e) === w).map(([e, d]) => {
      const arrive = e + d, wmAtArrival = Math.max(0, arrive - slack);
      const isLate = wmAtArrival > w + 1, dropped = isLate && wmAtArrival > w + 1 + late;
      return { e, arrive, isLate, dropped, seen: arrive <= t };
    });
    const fired = wm >= w + 1;
    const firstCount = evs.filter((x) => !x.isLate && x.seen).length;
    const corrections = evs.filter((x) => x.isLate && !x.dropped && x.seen).length;
    return { w, evs, fired, count: firstCount + corrections, firstCount, corrections, dropped: evs.filter((x) => x.dropped && x.seen).length };
  });
  const W = 600, x = (v: number) => 20 + (v / 8) * (W - 40);
  return (
    <Frame title="Windows and watermarks" q="Events from phones arrive late and out of order. When can you publish the count for 2:00–2:01?"
      about="Each box is a one-minute tumbling window in event time (time units are 'minutes'). Dots drop into the window where they happened, at the moment they arrive. A window fires when the watermark passes its end; late events within the allowed lateness update it; later ones are dropped."
      foot="A larger watermark slack makes first results more complete but later. Allowed lateness turns would-be losses into corrections, at the cost of keeping window state longer and sending updated results downstream.">
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Slider label="Watermark slack (how long to wait)" value={slack} min={0} max={3} step={0.25} onChange={setSlack} fmt={(v) => `${v} min`} />
          <Slider label="Allowed lateness after firing" value={late} min={0} max={4} step={0.5} onChange={setLate} fmt={(v) => `${v} min`} />
        </div>
        <SimControls sim={sim} stepLabel="+0.5 min" stepN={25} extra={<span className="num text-[12px] text-faint">processing time {t.toFixed(1)} · watermark {wm.toFixed(1)}</span>} />
        <div className="overflow-x-auto rounded-xl border border-line bg-bg p-2">
          <svg viewBox={`0 0 ${W} 170`} style={{ width: "100%", minWidth: 520 }} role="img" aria-label="Event-time windows with arriving events and the watermark">
            {windows.map((wd) => (
              <g key={wd.w}>
                <rect x={x(wd.w) + 2} y={18} width={x(1) - x(0) - 4} height={100} rx={8} fill={wd.fired ? "rgb(200 245 71 / .06)" : "#11131c"} stroke={wd.fired ? "#c8f547" : "#262b3d"} strokeOpacity={wd.fired ? 0.6 : 1} />
                <text x={x(wd.w + 0.5)} y={14} textAnchor="middle" className="fill-[#5d637c] text-[9.5px]">{wd.w}:00–{wd.w + 1}:00</text>
                {wd.evs.filter((ev) => ev.seen).map((ev, k) => <motion.circle key={k} initial={{ cy: 22, opacity: 0 }} animate={{ cy: 108 - k * 12, opacity: 1 }} cx={x(ev.e)} r={4.5} fill={ev.dropped ? "#ff6b6b" : ev.isLate ? "#ffb454" : "#7aa7ff"} />)}
                <text x={x(wd.w + 0.5)} y={136} textAnchor="middle" className={cn("text-[11px] font-semibold", wd.fired ? "fill-[#c8f547]" : "fill-[#5d637c]")}>{wd.fired ? `${wd.count}${wd.corrections ? " (updated)" : ""}` : "open"}</text>
                {wd.dropped > 0 && <text x={x(wd.w + 0.5)} y={150} textAnchor="middle" className="fill-[#ff6b6b] text-[9.5px]">{wd.dropped} dropped</text>}
              </g>
            ))}
            <line x1={x(Math.min(8, wm))} x2={x(Math.min(8, wm))} y1={18} y2={122} stroke="#c8f547" strokeWidth={2} />
            <text x={x(Math.min(8, wm)) + 3} y={128} className="fill-[#c8f547] text-[9px]">watermark</text>
            <line x1={x(Math.min(8, t))} x2={x(Math.min(8, t))} y1={18} y2={122} stroke="#9096ad" strokeDasharray="3 3" />
          </svg>
        </div>
        <div className="flex flex-wrap gap-3 text-[11.5px] text-faint"><span><span className="text-hld">●</span> on time</span><span><span className="text-lld">●</span> late, within allowed lateness (corrects the result)</span><span><span className="text-bad">●</span> too late (dropped)</span><span>dashed line: processing time</span></div>
      </div>
    </Frame>
  );
}
