"use client";
/** Reliability visuals: error-budget burn with burn-rate alerts, a circuit breaker protecting a caller, gossip spread. */
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Btn, Chips, Frame, Predict, SimControls, Stat, rng, useSim } from "./kit";
import { cn } from "../../ui";

// ───────── error budget ─────────
type Inc = "deploy" | "leak" | "outage";
const HOURS = 720; // 30 days
const BASE = 0.0002; // normal error rate 0.02%
function errorAt(h: number, inc: Inc) {
  if (inc === "deploy" && h >= 240 && h < 242) return 0.05;
  if (inc === "leak" && h >= 300 && h < 540) return 0.003;
  if (inc === "outage" && h === 480) return 0.5;
  return BASE;
}
export function ErrorBudget() {
  const [slo, setSlo] = useState("0.999");
  const [inc, setInc] = useState<Inc>("deploy");
  const budget = 1 - Number(slo);
  const data = useMemo(() => {
    let used = 0;
    const errs = Array.from({ length: HOURS }, (_, h) => errorAt(h, inc));
    const pts: { h: number; left: number; page: boolean; ticket: boolean }[] = [];
    errs.forEach((e, h) => {
      used += e / HOURS;
      const burn1h = e / budget, burn6h = errs.slice(Math.max(0, h - 5), h + 1).reduce((a, b) => a + b, 0) / Math.min(6, h + 1) / budget;
      const burn3d = errs.slice(Math.max(0, h - 71), h + 1).reduce((a, b) => a + b, 0) / Math.min(72, h + 1) / budget;
      pts.push({ h, left: 1 - used / budget, page: burn1h >= 14.4 || burn6h >= 6, ticket: burn3d >= 1 });
    });
    return pts;
  }, [inc, budget]);
  const W = 600, H = 150, x = (h: number) => 34 + (h / HOURS) * (W - 44), y = (v: number) => 12 + (1 - Math.max(-0.2, Math.min(1, v))) / 1.2 * (H - 30);
  const end = data[HOURS - 1].left, firstPage = data.find((d) => d.page), firstTicket = data.find((d) => d.ticket);
  return (
    <Frame title="Spending an error budget" q="Which incidents should wake someone up at night, and which can wait for a ticket?"
      about="A 30-day window. The line shows the error budget remaining. Red marks are pages (fast burn: 14.4× over an hour or 6× over six hours); amber marks are tickets (slow burn: over 1× across three days). Change the SLO and the incident."
      foot={`Budget at the end of the month: ${(end * 100).toFixed(0)}%. ${firstPage ? `Paged at hour ${firstPage.h} (day ${Math.floor(firstPage.h / 24) + 1}).` : "No page."} ${firstTicket ? `Ticket opened at hour ${firstTicket.h}.` : "No ticket."} The same incident can be noise under a loose SLO and an emergency under a strict one.`}>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-3">
          <Chips label="SLO" value={slo} options={[["0.99", "99%"], ["0.999", "99.9%"], ["0.9995", "99.95%"], ["0.9999", "99.99%"]]} onChange={setSlo} />
          <Chips label="Incident" value={inc} options={[["deploy", "Bad deploy: 5% errors for 2 h"], ["leak", "Slow leak: 0.3% for 10 days"], ["outage", "Outage: 50% errors for 1 h"]]} onChange={setInc} />
        </div>
        <div className="overflow-x-auto rounded-xl border border-line bg-bg p-2">
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", minWidth: 520 }} role="img" aria-label="Error budget remaining over 30 days">
            {[1, 0.5, 0].map((v) => <g key={v}><line x1={34} x2={W - 10} y1={y(v)} y2={y(v)} stroke="#1f2333" /><text x={30} y={y(v) + 3} textAnchor="end" className="fill-[#5d637c] text-[9px]">{v * 100}%</text></g>)}
            {[0, 7, 14, 21, 28].map((d) => <text key={d} x={x(d * 24)} y={H - 2} textAnchor="middle" className="fill-[#5d637c] text-[9px]">day {d + 1}</text>)}
            <polyline points={data.map((d) => `${x(d.h)},${y(d.left)}`).join(" ")} fill="none" stroke={end < 0 ? "#ff6b6b" : "#5be49b"} strokeWidth={1.8} />
            {data.filter((d, i) => d.ticket && !data[i - 1]?.ticket).map((d) => <rect key={"t" + d.h} x={x(d.h) - 2} y={8} width={4} height={8} fill="#ffc857" />)}
            {data.filter((d, i) => d.page && !data[i - 1]?.page).map((d) => <rect key={"p" + d.h} x={x(d.h) - 2} y={18} width={4} height={8} fill="#ff6b6b" />)}
          </svg>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <Stat k="Budget (minutes/month)" v={Math.round(budget * 43200)} />
          <Stat k="Left at month end" v={`${(end * 100).toFixed(0)}%`} tone={end < 0 ? "var(--color-bad)" : "var(--color-ok)"} />
          <Stat k="Alert" v={firstPage ? "page" : firstTicket ? "ticket" : "none"} tone={firstPage ? "var(--color-bad)" : firstTicket ? "var(--color-warn)" : undefined} />
        </div>
      </div>
    </Frame>
  );
}

// ───────── circuit breaker ─────────
type Dep = "healthy" | "slow" | "down";
type BS = { t: number; state: "closed" | "open" | "half"; openedAt: number; window: boolean[]; inflight: { done: number; ok: boolean }[]; served: number; fallback: number; failedCaller: number; calls: number; r: () => number; series: number[] };
const RATE = 40, POOL = 30, TIMEOUT = 2000, COOL = 3000;
export function Breaker() {
  const [dep, setDep] = useState<Dep>("healthy");
  const [on, setOn] = useState(true);
  const sim = useSim<BS>(() => ({ t: 0, state: "closed", openedAt: 0, window: [], inflight: [], served: 0, fallback: 0, failedCaller: 0, calls: 0, r: rng(4), series: [] }), (s) => {
    s.t += 50;
    // finish calls whose time has come
    const doneNow = s.inflight.filter((c) => c.done <= s.t);
    s.inflight = s.inflight.filter((c) => c.done > s.t);
    for (const c of doneNow) {
      if (c.ok) s.served++; else s.fallback++;
      s.window.push(c.ok); if (s.window.length > 20) s.window.shift();
      if (on && s.state === "half") { s.state = c.ok ? "closed" : "open"; s.openedAt = s.t; if (c.ok) s.window = []; }
      else if (on && s.state === "closed" && s.window.length >= 10 && s.window.filter((x) => !x).length / s.window.length >= 0.5) { s.state = "open"; s.openedAt = s.t; }
    }
    if (on && s.state === "open" && s.t - s.openedAt >= COOL) s.state = "half";
    // new requests this tick
    for (let i = 0; i < (RATE * 50) / 1000; i++) {
      if (on && s.state === "open") { s.fallback++; continue; } // fail fast, cached fallback
      if (on && s.state === "half" && s.inflight.length) { s.fallback++; continue; } // one trial call at a time
      if (s.inflight.length >= POOL) { s.failedCaller++; continue; } // caller's own threads exhausted
      s.calls++;
      const lat = dep === "healthy" ? 30 + s.r() * 40 : dep === "slow" ? 5000 : 15;
      const ok = dep === "healthy";
      s.inflight.push({ done: s.t + Math.min(lat, TIMEOUT), ok: ok && lat < TIMEOUT });
    }
    if (s.t % 500 === 0) { s.series.push(s.inflight.length); if (s.series.length > 60) s.series.shift(); }
  }, [dep, on], 2);
  const s = sim.s;
  const STATES: [BS["state"], string][] = [["closed", "Closed: calls pass"], ["open", "Open: fail fast"], ["half", "Half-open: trial call"]];
  return (
    <Frame title="A circuit breaker protecting its caller" q="The recommendations service becomes very slow. What happens to the page service that calls it?"
      about={`The page service gets ${RATE} requests/s and has ${POOL} threads for this dependency; each call times out after 2 s. Make the dependency slow or down, with the breaker on or off.`}
      foot={!on && dep === "slow" ? "Without a breaker, every request waits up to 2 s, the 30 threads fill, and the page service starts failing requests itself: the slow dependency has spread its failure upward." : on && dep !== "healthy" ? "The breaker opened after half of recent calls failed: requests get the cached fallback instantly, threads stay free, and every 3 s a single trial call checks whether the dependency has recovered." : "Healthy dependency: calls pass through the closed breaker."}>
      <div className="space-y-3">
        <Predict q="Breaker off, dependency slow (5 s per call, 2 s timeout). How many of the 30 threads end up busy?" options={["About 3", "About 15", "All 30, and new requests fail"]} answer={2} why="Little's law: 40 requests/s × 2 s each = 80 in flight needed, far more than 30 threads." />
        <div className="flex flex-wrap items-center gap-2">
          <Chips label="Dependency" value={dep} options={[["healthy", "Healthy"], ["slow", "Slow (5 s)"], ["down", "Down (errors)"]]} onChange={setDep} />
          <Btn on={on} onClick={() => setOn(!on)}>Breaker {on ? "on" : "off"}</Btn>
          <SimControls sim={sim} stepLabel="+1 s" stepN={20} />
        </div>
        {on && <div className="flex flex-wrap gap-1.5">{STATES.map(([k, label]) => <span key={k} className={cn("rounded-lg border px-2.5 py-1 text-[12px]", s.state === k ? (k === "closed" ? "border-ok/60 text-ok" : k === "open" ? "border-bad/60 text-bad" : "border-warn/60 text-warn") : "border-line text-faint")}>{label}</span>)}</div>}
        <div className="rounded-xl border border-line bg-bg p-3">
          <div className="mb-1.5 text-[10.5px] uppercase tracking-wider text-faint">Caller threads busy on this dependency ({s.inflight.length} / {POOL})</div>
          <div className="flex flex-wrap gap-1">{Array.from({ length: POOL }, (_, i) => <motion.span key={i} className="h-4 w-4 rounded-sm" animate={{ backgroundColor: i < s.inflight.length ? (s.inflight.length >= POOL ? "#ff6b6b" : "#ffb454") : "#1d2132" }} />)}</div>
        </div>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          <Stat k="Served normally" v={s.served} tone="var(--color-ok)" />
          <Stat k="Fallback (degraded)" v={s.fallback} tone="var(--color-warn)" />
          <Stat k="Failed (threads exhausted)" v={s.failedCaller} tone={s.failedCaller ? "var(--color-bad)" : undefined} />
          <Stat k="Calls to dependency" v={s.calls} />
        </div>
      </div>
    </Frame>
  );
}

// ───────── gossip ─────────
const GN = 32, FAN = 2;
export function Gossip() {
  const [fan, setFan] = useState(FAN);
  const sim = useSim(() => ({ round: 0, known: new Set<number>([0]), dead: 17, r: rng(77), last: [] as [number, number][] }), (s) => {
    if (s.known.size >= GN - 1) return;
    const told: [number, number][] = [];
    for (const n of [...s.known]) for (let k = 0; k < fan; k++) {
      let peer = Math.floor(s.r() * GN); if (peer === n || peer === s.dead) peer = (peer + 1) % GN;
      if (peer !== s.dead) { told.push([n, peer]); s.known.add(peer); }
    }
    s.last = told; s.round++;
  }, [fan], 1);
  const s = sim.s;
  const pos = (i: number) => { const a = (i / GN) * Math.PI * 2 - Math.PI / 2; return [160 + 130 * Math.cos(a), 150 + 130 * Math.sin(a)]; };
  return (
    <Frame title="Gossip: spreading 'node 17 is dead'" q="Node 1 noticed node 17 stopped answering. How many rounds until all 31 others know, if each informed node tells just a couple of random peers per round?"
      about="Each round, every node that knows the news tells a few random peers (lines show this round's messages). Watch how quickly it spreads compared with the cluster size."
      foot={`Round ${s.round}: ${s.known.size} of ${GN - 1} live nodes know. Informed nodes roughly multiply each round, so news reaches everyone in about log(N) rounds; ${Math.ceil(Math.log(GN) / Math.log(fan + 1))} would be the ideal for ${GN} nodes with ${fan} peers per round.`}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Btn on onClick={() => sim.step(1)}>Next round</Btn>
          <Btn onClick={() => sim.reset()}>Reset</Btn>
          <Chips label="Peers per round" value={String(fan)} options={[["1", "1"], ["2", "2"], ["3", "3"]]} onChange={(v) => setFan(Number(v))} />
        </div>
        <svg viewBox="0 0 320 300" className="mx-auto w-full max-w-[420px] rounded-xl border border-line bg-[#0c0e15]" role="img" aria-label="Gossip spread across a cluster">
          {s.last.map(([a, b], i) => { const [x1, y1] = pos(a), [x2, y2] = pos(b); return <motion.line key={s.round + "-" + i} initial={{ opacity: 0.9 }} animate={{ opacity: 0.25 }} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#c8f547" strokeWidth={1} />; })}
          {Array.from({ length: GN }, (_, i) => { const [x, y] = pos(i); const dead = i === s.dead, k = s.known.has(i); return (
            <g key={i}><circle cx={x} cy={y} r={9} fill={dead ? "#2a1418" : k ? "rgb(200 245 71 / .85)" : "#161a27"} stroke={dead ? "#ff6b6b" : k ? "#c8f547" : "#2f3550"} />
              <text x={x} y={y + 3} textAnchor="middle" className="text-[8px] font-bold" fill={dead ? "#ff6b6b" : k ? "#0b1000" : "#5d637c"}>{dead ? "✕" : i + 1}</text></g>
          ); })}
        </svg>
      </div>
    </Frame>
  );
}

