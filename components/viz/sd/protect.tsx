"use client";
/** Overload-protection visuals: five rate limiters on the same traffic, and a retry-storm / load-shedding simulator. */
import { useMemo, useState } from "react";
import { Chips, Frame, Predict, SimControls, Spark, Stat, rng, useSim } from "./kit";

// ───────── rate limiter race ─────────
// Limit: 10 requests per 10 seconds. Traffic: a light trickle plus a burst straddling the 10 s boundary and one at 20 s.
const LIMIT = 10, WIN = 10, DUR = 30;
const TRAFFIC: number[] = (() => {
  const out: number[] = [];
  for (let t = 0.5; t < DUR; t += 1.7) out.push(+t.toFixed(2));
  for (let i = 0; i < 8; i++) out.push(+(9.2 + i * 0.09).toFixed(2));
  for (let i = 0; i < 8; i++) out.push(+(10.05 + i * 0.09).toFixed(2));
  for (let i = 0; i < 12; i++) out.push(+(20.1 + i * 0.07).toFixed(2));
  return out.sort((a, b) => a - b);
})();
type Res = { at: number; ok: boolean; sentAt?: number };
function fixedWindow(): Res[] { const c: Record<number, number> = {}; return TRAFFIC.map((t) => { const w = Math.floor(t / WIN); c[w] = (c[w] ?? 0) + 1; return { at: t, ok: c[w] <= LIMIT }; }); }
function slidingLog(): Res[] { const acc: number[] = []; return TRAFFIC.map((t) => { while (acc.length && acc[0] <= t - WIN) acc.shift(); const ok = acc.length < LIMIT; if (ok) acc.push(t); return { at: t, ok }; }); }
function slidingCounter(): Res[] {
  const c: Record<number, number> = {};
  return TRAFFIC.map((t) => { const w = Math.floor(t / WIN), frac = 1 - (t - w * WIN) / WIN; const est = (c[w] ?? 0) + (c[w - 1] ?? 0) * frac; const ok = est < LIMIT; if (ok) c[w] = (c[w] ?? 0) + 1; return { at: t, ok }; });
}
function tokenBucket(): Res[] { let tokens = LIMIT, last = 0; return TRAFFIC.map((t) => { tokens = Math.min(LIMIT, tokens + (t - last) * (LIMIT / WIN)); last = t; const ok = tokens >= 1; if (ok) tokens -= 1; return { at: t, ok }; }); }
function leakyBucket(): Res[] { const QCAP = 5, rate = LIMIT / WIN; let nextFree = 0; const queue: number[] = []; return TRAFFIC.map((t) => { while (queue.length && queue[0] <= t) queue.shift(); if (queue.length >= QCAP) return { at: t, ok: false }; const send = Math.max(t, nextFree); nextFree = send + 1 / rate; queue.push(send); return { at: t, ok: true, sentAt: send }; }); }
const ALGOS: [string, string, () => Res[]][] = [["fixed", "Fixed window", fixedWindow], ["log", "Sliding log", slidingLog], ["counter", "Sliding window counter", slidingCounter], ["token", "Token bucket (cap 10, 1/s)", tokenBucket], ["leaky", "Leaky bucket (queue 5, 1/s)", leakyBucket]];
const maxIn = (xs: number[]) => Math.max(0, ...xs.map((t) => xs.filter((u) => u >= t && u < t + WIN).length));

export function RlRace() {
  const res = useMemo(() => ALGOS.map(([k, name, f]) => ({ k, name, r: f() })), []);
  const W = 600, x = (t: number) => 160 + (t / DUR) * (W - 176);
  return (
    <Frame title="Five rate limiters, same traffic" q="The limit is 10 requests per 10 seconds. A burst straddles the 10-second mark. Which limiters let 16 requests through in about one second?"
      about="Each row shows the same incoming requests: green accepted, red rejected (429). For the leaky bucket, blue lines show how long each accepted request waits in the queue before being sent on."
      foot="The fixed window counts 0–10 s and 10–20 s separately, so a burst across the boundary gets the full limit twice. Sliding approaches and the token bucket cap any 10-second span near 10; the leaky bucket accepts a few into its queue and releases them at a steady 1 per second.">
      <div className="space-y-3">
        <Predict q="Which limiter allows the most requests within the 10-second span around the boundary?" options={["Sliding log", "Fixed window", "Token bucket"]} answer={1} why="Its counter resets at 10 s, so 8 requests just before and 8 just after are both within 'their' window's limit." />
        <div className="overflow-x-auto rounded-xl border border-line bg-bg p-2">
          <svg viewBox={`0 0 ${W} ${res.length * 34 + 26}`} style={{ width: "100%", minWidth: 540 }} role="img" aria-label="Accepted and rejected requests per rate limiter">
            {[0, 10, 20, 30].map((t) => <g key={t}><line x1={x(t)} x2={x(t)} y1={6} y2={res.length * 34 + 8} stroke="#262b3d" strokeDasharray={t % 10 === 0 ? "3 3" : undefined} /><text x={x(t)} y={res.length * 34 + 20} textAnchor="middle" className="fill-[#5d637c] text-[9px]">{t} s</text></g>)}
            {res.map((a, i) => {
              const y = 22 + i * 34, acc = a.r.filter((r) => r.ok).map((r) => r.sentAt ?? r.at);
              return (
                <g key={a.k}>
                  <text x={4} y={y + 3} className="fill-[#e9ebf4] text-[10.5px] font-semibold">{a.name}</text>
                  <text x={4} y={y + 15} className="fill-[#5d637c] text-[9px]">max in any 10 s: {maxIn(acc)} · rejected {a.r.filter((r) => !r.ok).length}</text>
                  {a.r.map((r, k) => (
                    <g key={k}>
                      {r.sentAt !== undefined && r.sentAt > r.at + 0.05 && <line x1={x(r.at)} x2={x(r.sentAt)} y1={y + 6 - (k % 3) * 3} y2={y + 6 - (k % 3) * 3} stroke="#7aa7ff" strokeOpacity={0.6} />}
                      <circle cx={x(r.at)} cy={y} r={3} fill={r.ok ? "#5be49b" : "#ff6b6b"} />
                    </g>
                  ))}
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </Frame>
  );
}

// ───────── retry storm ─────────
type Mode = "none" | "naive" | "smart" | "shed";
const MNAME: Record<Mode, string> = { none: "No retries", naive: "Naive retries (3, immediate)", smart: "Backoff + jitter + 10% retry budget", shed: "Load shedding at the door + smart retries" };
type Q = { enq: number; attempt: number; timedOut: boolean };
type St = { t: number; carry: number; q: Q[]; retries: { at: number; attempt: number }[]; budget: number; r: () => number; offered: number[]; good: number[]; o: number; g: number; wasted: number; rejected: number; series: { o: number[]; g: number[] } };
const CAPS = 100, TMO = 2, DT = 0.1;
export function RetryStorm() {
  const [mode, setMode] = useState<Mode>("naive");
  const sim = useSim<St>(() => ({ t: 0, carry: 0, q: [], retries: [], budget: 20, r: rng(9), offered: [], good: [], o: 0, g: 0, wasted: 0, rejected: 0, series: { o: [], g: [] } }), (s) => {
    const base = s.t >= 5 && s.t < 12 ? 140 : 80; // a 7-second spike to 140% of capacity
    s.carry += base * DT;
    const n = Math.floor(s.carry); s.carry -= n;
    const arrivals: { attempt: number }[] = Array.from({ length: n }, () => ({ attempt: 0 }));
    s.budget = Math.min(50, s.budget + n * 0.1); // each new request earns 0.1 retry tokens
    s.retries = s.retries.filter((r) => { if (r.at <= s.t) { arrivals.push({ attempt: r.attempt }); return false; } return true; });
    const scheduleRetry = (attempt: number) => {
      if (mode === "none" || attempt >= 3) return;
      if (mode === "naive") { s.retries.push({ at: s.t, attempt: attempt + 1 }); return; }
      if (s.budget < 1) return; // budget exhausted: give up instead of piling on
      s.budget -= 1;
      s.retries.push({ at: s.t + Math.pow(2, attempt) * (0.5 + s.r()), attempt: attempt + 1 });
    };
    for (const a of arrivals) {
      s.o++;
      if (mode === "shed" && s.q.length / CAPS > TMO * 0.8) { s.rejected++; scheduleRetry(a.attempt); continue; } // reject early: queue too long to answer in time
      s.q.push({ enq: s.t, attempt: a.attempt, timedOut: false });
    }
    for (const it of s.q) if (!it.timedOut && s.t - it.enq >= TMO) { it.timedOut = true; scheduleRetry(it.attempt); } // client gives up
    let cap = CAPS * DT;
    while (cap >= 1 && s.q.length) { const it = s.q.shift()!; cap--; if (it.timedOut) s.wasted++; else s.g++; }
    s.t = +(s.t + DT).toFixed(2);
    if (Math.abs(s.t - Math.round(s.t)) < 1e-6) { s.series.o.push(s.o); s.series.g.push(s.g); s.o = 0; s.g = 0; if (s.series.o.length > 40) { s.series.o.shift(); s.series.g.shift(); } }
  }, [mode], 2);
  const s = sim.s;
  const lastG = s.series.g.at(-1) ?? 0, lastO = s.series.o.at(-1) ?? 0;
  const top = Math.max(200, ...s.series.o);
  return (
    <Frame title="Retry storms and load shedding" q="Traffic spikes to 140% of capacity for 7 seconds, then returns to 80%. Does the service recover?"
      about={`The service completes ${CAPS} requests/s; clients give up after ${TMO} s. Offered load includes retries. Goodput is requests answered before their client gave up.`}
      foot={mode === "naive" ? "Timed-out requests are retried at once, so offered load stays far above capacity even after the spike ends: the system stays collapsed (a 'metastable failure') with the servers fully busy on work nobody is waiting for." : mode === "smart" ? "Backoff spreads retries out and the budget caps them, so once the spike passes the system recovers, though only after the server has worked through a backlog of requests whose clients had already given up (goodput is near zero meanwhile). Shedding avoids even that." : mode === "shed" ? "Requests that couldn't be answered in time are rejected immediately instead of queueing, so the server only works on requests that can still succeed: goodput stays near capacity throughout." : "Without retries, the spike's excess simply fails; the system recovers as soon as the spike ends (but those users got errors)."}>
      <div className="space-y-3">
        <Predict q="With naive immediate retries, what happens after the spike ends and traffic returns to 80%?" options={["Recovers immediately", "Stays overloaded because retries keep load above capacity"]} answer={1} why="Each timeout produces another request, so the backlog of retries alone exceeds capacity: the overload sustains itself." />
        <Chips value={mode} options={(Object.keys(MNAME) as Mode[]).map((k) => [k, MNAME[k]])} onChange={setMode} />
        <SimControls sim={sim} stepLabel="+1 s" stepN={10} extra={<span className="num text-[12px] text-faint">t = {s.t.toFixed(1)} s {s.t >= 5 && s.t < 12 ? "· SPIKE" : ""}</span>} />
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-line bg-bg p-3"><div className="mb-1 text-[10.5px] uppercase tracking-wider text-faint">Offered load per second (dashed: capacity)</div><Spark data={s.series.o} max={top} line={CAPS} color="var(--color-warn)" h={70} label="Offered load over time" /></div>
          <div className="rounded-xl border border-line bg-bg p-3"><div className="mb-1 text-[10.5px] uppercase tracking-wider text-faint">Goodput per second</div><Spark data={s.series.g} max={top} line={CAPS} color="var(--color-ok)" h={70} label="Goodput over time" /></div>
        </div>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          <Stat k="Offered (last s)" v={lastO} tone={lastO > CAPS ? "var(--color-bad)" : undefined} />
          <Stat k="Goodput (last s)" v={lastG} tone={lastG < 70 ? "var(--color-bad)" : "var(--color-ok)"} />
          <Stat k="Queue" v={s.q.length} />
          <Stat k="Wasted (served too late)" v={s.wasted} tone={s.wasted ? "var(--color-warn)" : undefined} sub={mode === "shed" ? `rejected early: ${s.rejected}` : undefined} />
        </div>
      </div>
    </Frame>
  );
}

