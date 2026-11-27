"use client";
/** Estimation visuals: the latency ladder (real vs human-scaled time) and a live single-server queue. */
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Btn, Chips, Frame, Predict, SimControls, Slider, Stat, ms, pct, rng, useSim } from "./kit";
import { cn } from "../../ui";

// ───────── latency ladder ─────────
// Values: order-of-magnitude figures after Jeff Dean's "numbers everyone should know" and Brendan Gregg's
// scaled latency table (Systems Performance, 2nd ed.). The scale maps one 0.3 ns CPU cycle to one second.
const RUNGS: [label: string, ns: number, where: string][] = [
  ["One CPU cycle", 0.3, "cpu"],
  ["L1 cache read", 1, "cpu"],
  ["L3 cache read", 15, "cpu"],
  ["Main memory (RAM) read", 100, "mem"],
  ["Read 1 MB sequentially from RAM", 10_000, "mem"],
  ["SSD random read (4 KB)", 100_000, "disk"],
  ["Round trip inside a data centre", 500_000, "net"],
  ["Read 1 MB sequentially from SSD", 1_000_000, "disk"],
  ["HDD disk seek", 10_000_000, "disk"],
  ["Round trip across a continent", 40_000_000, "net"],
  ["Round trip across an ocean", 80_000_000, "net"],
  ["Round trip to the other side of the world", 180_000_000, "net"],
  ["TCP retransmission timeout", 1_000_000_000, "net"],
];
const TONE: Record<string, string> = { cpu: "#4fd1c5", mem: "#7aa7ff", disk: "#ffb454", net: "#ff8fb3" };
const fmtReal = (ns: number) => ns < 1000 ? `${ns} ns` : ns < 1e6 ? `${+(ns / 1000).toPrecision(3)} µs` : ns < 1e9 ? `${+(ns / 1e6).toPrecision(3)} ms` : `${+(ns / 1e9).toPrecision(3)} s`;
function fmtHuman(ns: number) {
  const s = ns / 0.3; // one cycle → one second
  const u: [number, string][] = [[31_536_000, "year"], [2_592_000, "month"], [86_400, "day"], [3600, "hour"], [60, "minute"], [1, "second"]];
  const [d, name] = u.find(([v]) => s >= v) ?? [1, "second"];
  const n = s / d, v = n >= 10 ? Math.round(n) : +n.toFixed(1);
  return `${v.toLocaleString()} ${name}${v === 1 ? "" : "s"}`;
}

export function LatencyLadder() {
  const [shown, setShown] = useState(4);
  const [human, setHuman] = useState(true);
  const [a, setA] = useState(3), [b, setB] = useState(5);
  const max = Math.log10(RUNGS[RUNGS.length - 1][1] / 0.1);
  const ratio = RUNGS[b][1] / RUNGS[a][1];
  return (
    <Frame title="The latency ladder" q="If one CPU cycle lasted a second, how long would a disk seek or a trip across the ocean take?"
      about="Reveal the rungs one at a time. Bars use a logarithmic scale: each grid line is 10× the one before. Click two rungs to compare them."
      foot="The gaps, not the exact numbers, are what to remember: memory → SSD is ~1,000×, a data-centre round trip beats a disk seek, and long-distance trips are set by the speed of light.">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Btn onClick={() => setShown((s) => Math.min(RUNGS.length, s + 1))} disabled={shown >= RUNGS.length} on>Next rung</Btn>
          <Btn onClick={() => setShown(RUNGS.length)}>Show all</Btn>
          <Btn onClick={() => setShown(1)}>Start over</Btn>
          <Chips value={human ? "h" : "r"} options={[["h", "Human scale"], ["r", "Real time"]]} onChange={(v) => setHuman(v === "h")} />
        </div>
        <div className="space-y-1">
          {RUNGS.slice(0, shown).map(([label, ns, where], i) => {
            const w = (Math.log10(ns / 0.1) / max) * 100;
            const sel = i === a || i === b;
            return (
              <motion.button key={label} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} onClick={() => { if (i === a) return; setB(a); setA(i); }}
                className={cn("grid w-full grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)_auto] items-center gap-2 rounded-lg px-2 py-1 text-left transition", sel ? "bg-white/[0.04]" : "hover:bg-white/[0.02]")}>
                <span className={cn("truncate text-[12.5px]", sel ? "text-text" : "text-mute")}>{label}</span>
                <span className="relative h-3 overflow-hidden rounded-full bg-[#161a27]">
                  <motion.span className="absolute inset-y-0 left-0 rounded-full" initial={{ width: 0 }} animate={{ width: `${w}%` }} transition={{ duration: 0.5 }} style={{ background: TONE[where] }} />
                </span>
                <span className="num w-[120px] text-right font-mono text-[12px]" style={{ color: TONE[where] }}>{human ? fmtHuman(ns) : fmtReal(ns)}</span>
              </motion.button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-3 text-[11.5px] text-faint">{Object.entries({ cpu: "CPU", mem: "Memory", disk: "Storage", net: "Network" }).map(([k, v]) => <span key={k} className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: TONE[k] }} />{v}</span>)}</div>
        {a < shown && b < shown && (
          <div className="rounded-xl border border-line bg-bg px-3.5 py-2.5 text-[13.5px]">
            <span className="text-text">{RUNGS[b][0]}</span> takes <span className="num font-semibold text-accent">{ratio >= 1 ? `${Math.round(ratio).toLocaleString()}×` : `1/${Math.round(1 / ratio).toLocaleString()}`}</span> as long as <span className="text-text">{RUNGS[a][0].toLowerCase()}</span>.
          </div>
        )}
      </div>
    </Frame>
  );
}

// ───────── queueing ─────────
type Mode = "steady" | "random" | "bursty";
type Q = { t: number; q: number[]; busy: number; cur: number; done: number[]; r: () => number; nextArr: number; samples: number; inSys: number };
const S = 10; // mean service time, ms

export function Queueing() {
  const [rho, setRho] = useState(0.7);
  const [mode, setMode] = useState<Mode>("random");
  const lambda = rho / S; // arrivals per ms
  const service = (r: () => number) => mode === "steady" ? S : mode === "random" ? -Math.log(1 - r()) * S : (r() < 0.9 ? 5 : 55);
  const gap = (r: () => number) => mode === "steady" ? 1 / lambda : mode === "random" ? -Math.log(1 - r()) / lambda : (-Math.log(1 - r()) / lambda) * 5;

  const sim = useSim<Q>(() => { const r = rng(11); return { t: 0, q: [], busy: 0, cur: 0, done: [], r, nextArr: 0, samples: 0, inSys: 0 }; }, (s) => {
    // advance 1 ms
    while (s.nextArr <= s.t) {
      const batch = mode === "bursty" ? 5 : 1;
      for (let i = 0; i < batch; i++) s.q.push(s.nextArr);
      s.nextArr += gap(s.r);
    }
    let budget = 1;
    while (budget > 0) {
      if (s.busy <= 0) { if (!s.q.length) break; s.busy = service(s.r); s.cur = s.q.shift()!; }
      const use = Math.min(budget, s.busy);
      s.busy -= use; budget -= use;
      if (s.busy <= 0) { s.done.push(s.t + (1 - budget) - s.cur); if (s.done.length > 2000) s.done.shift(); }
    }
    s.samples++; s.inSys += s.q.length + (s.busy > 0 ? 1 : 0);
    s.t += 1;
  }, [rho, mode], 8);

  const s = sim.s;
  const warm = s.done.length > 150;
  const mean = warm ? s.done.reduce((x, y) => x + y, 0) / s.done.length : 0, p99 = warm ? pct(s.done, 99) : 0;
  const L = s.samples ? s.inSys / s.samples : 0;
  // the curve: response / service vs utilisation, for the random (M/M/1) model, with Kingman for the others
  const W = 300, H = 150, X = (u: number) => 28 + u * (W - 40), Y = (r: number) => H - 18 - (Math.min(r, 25) / 25) * (H - 30);
  const curve = useMemo(() => Array.from({ length: 98 }, (_, i) => (i + 1) / 100).map((u) => `${X(u)},${Y(1 / (1 - u))}`).join(" "), []);
  return (
    <Frame title="Why servers get slow before they are full" q="A server is busy 90% of the time. How long does a request wait, compared with the work it needs?"
      about="Requests (dots) arrive and wait for one server that takes 10 ms each on average. Drag the load and watch the line and the response time; switch between steady, random and bursty traffic."
      foot={warm ? `Measured: average response ${ms(mean)} (${(mean / S).toFixed(1)}× the 10 ms of work), p99 ${ms(p99)}. Little's law check: ${L.toFixed(1)} requests in the system on average vs λ × W = ${(lambda * mean).toFixed(1)}.` : "Press Play and let it run a few seconds so the numbers settle."}>
      <div className="space-y-4">
        <Predict q="At 90% utilisation with random arrivals, the average response time is about…" options={["1.1× the service time", "2× the service time", "10× the service time"]} answer={2}
          why="Response ≈ service ÷ (1 − utilisation) = 10 ms ÷ 0.1 = 100 ms: only 10% idle time is left to clear bursts." />
        <div className="grid gap-3 sm:grid-cols-2">
          <Slider label="Load (utilisation)" value={rho} min={0.1} max={0.98} step={0.02} onChange={setRho} fmt={(v) => `${Math.round(v * 100)}%`} />
          <div className="space-y-1"><div className="text-[12.5px] text-mute">Traffic shape</div><Chips value={mode} options={[["steady", "Steady (evenly spaced, fixed work)"], ["random", "Random"], ["bursty", "Bursty, mixed sizes"]]} onChange={setMode} /></div>
        </div>
        <SimControls sim={sim} stepLabel="+50 ms" stepN={50} />
        <div className="grid gap-4 md:grid-cols-[1fr_300px]">
          <div className="space-y-2">
            <div className="flex items-center gap-2 rounded-xl border border-line bg-bg p-3">
              <span className="w-14 shrink-0 text-[11px] text-faint">queue</span>
              <div className="flex min-h-5 min-w-0 flex-1 flex-row-reverse flex-wrap items-center justify-end gap-[3px]">
                {s.q.slice(0, 80).map((at, i) => <span key={at + "-" + i} className="h-2.5 w-2.5 rounded-full bg-hld" />)}
                {s.q.length > 80 && <span className="font-mono text-[11px] text-bad">+{s.q.length - 80}</span>}
              </div>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border-2" style={{ borderColor: s.busy > 0 ? "var(--color-accent)" : "#2f3550" }}>
                <span className={cn("h-3 w-3 rounded-full", s.busy > 0 ? "bg-accent" : "bg-transparent")} />
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              <Stat k="In queue" v={s.q.length} tone={s.q.length > 20 ? "var(--color-bad)" : undefined} />
              <Stat k="Avg response" v={warm ? ms(mean) : "–"} />
              <Stat k="p99" v={warm ? ms(p99) : "–"} tone={p99 > 200 ? "var(--color-bad)" : p99 > 80 ? "var(--color-warn)" : "var(--color-ok)"} />
              <Stat k="Theory (random)" v={ms(S / (1 - rho))} sub="10 ms ÷ (1 − ρ)" />
            </div>
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-xl border border-line bg-bg" role="img" aria-label="Response time grows as utilisation approaches 100%">
            {[0.25, 0.5, 0.75, 1].map((u) => <g key={u}><line x1={X(u)} x2={X(u)} y1={8} y2={H - 18} stroke="#1f2333" /><text x={X(u)} y={H - 5} textAnchor="middle" className="fill-[#5d637c] text-[9px]">{u * 100}%</text></g>)}
            {[1, 5, 10, 20].map((r) => <g key={r}><line x1={28} x2={W - 12} y1={Y(r)} y2={Y(r)} stroke="#1f2333" /><text x={24} y={Y(r) + 3} textAnchor="end" className="fill-[#5d637c] text-[9px]">{r}×</text></g>)}
            <polyline points={curve} fill="none" stroke="#7aa7ff" strokeWidth={1.6} />
            <line x1={X(0)} x2={X(0.99)} y1={Y(1)} y2={Y(1)} stroke="#4fd1c5" strokeDasharray="3 3" />
            <line x1={X(rho)} x2={X(rho)} y1={8} y2={H - 18} stroke="#c8f547" strokeOpacity={0.4} />
            {warm && <circle cx={X(rho)} cy={Y(mean / S)} r={4.5} fill="#c8f547" />}
            <text x={X(0.03)} y={Y(1) - 4} className="fill-[#4fd1c5] text-[9px]">steady traffic: no waiting</text>
            <text x={X(0.55)} y={Y(9)} className="fill-[#7aa7ff] text-[9px]">random: service ÷ (1 − ρ)</text>
          </svg>
        </div>
      </div>
    </Frame>
  );
}
