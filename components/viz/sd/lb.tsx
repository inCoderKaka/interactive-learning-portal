"use client";
/**
 * Load-balancer race. Two strategies receive exactly the same requests (same arrival times, same costs), so any
 * difference in queues and tail latency is caused by the strategy alone. Requests are dots: small = cheap (20 ms),
 * big = expensive (200 ms). One server can be made slow. "Stale load info" models many balancers that only learn
 * each server's load from a report every 250 ms, which is what makes "always pick the least loaded" stampede.
 */
import { useMemo, useState } from "react";
import { Btn, Chips, Frame, Predict, SimControls, Slider, Spark, Stat, ms, pct, rng, useSim } from "./kit";
import { cn } from "../../ui";

type Algo = "rr" | "random" | "least" | "p2c";
const NAME: Record<Algo, string> = { rr: "Round robin", random: "Random", least: "Least connections", p2c: "Power of two choices" };
type Req = { id: number; at: number; cost: number; heavy: boolean };
type Srv = { q: Req[]; cur: Req | null; left: number };
type Run = { algo: Algo; srv: Srv[]; lat: number[]; series: number[]; rr: number; r: () => number; rejected: number; maxQ: number; last: string; view: number[] };
type St = { t: number; id: number; arr: () => number; runs: Run[] };

const N = 5, DT = 10, LIGHT = 20, HEAVY = 200, CAP = 30, REPORT = 250;
const inflight = (s: Srv) => s.q.length + (s.cur ? 1 : 0);

function route(run: Run, req: Req, live: boolean) {
  const view = live ? run.srv.map(inflight) : run.view;
  let pick = 0, why = "";
  if (run.algo === "rr") { pick = run.rr++ % N; why = "next in turn"; }
  else if (run.algo === "random") { pick = Math.floor(run.r() * N); why = "picked at random"; }
  else if (run.algo === "least") {
    const lo = Math.min(...view), start = run.rr++ % N;
    for (let k = 0; k < N; k++) { const i = (start + k) % N; if (view[i] === lo) { pick = i; break; } }
    why = `fewest in flight${live ? "" : " (per the last report)"}: ${lo}`;
  } else {
    const a = Math.floor(run.r() * N); let b = Math.floor(run.r() * (N - 1)); if (b >= a) b++;
    pick = view[a] <= view[b] ? a : b;
    why = `sampled s${a + 1} (${view[a]}) and s${b + 1} (${view[b]}), kept the lighter`;
  }
  const s = run.srv[pick];
  if (s.q.length >= CAP) { run.rejected++; run.last = `#${req.id} → s${pick + 1}: queue full, rejected (503)`; return; }
  s.q.push(req);
  run.last = `#${req.id} (${req.heavy ? "200 ms" : "20 ms"}) → s${pick + 1}: ${why}`;
}

function serve(run: Run, t: number, slow: number, factor: number) {
  run.srv.forEach((s, i) => {
    let budget = DT;
    while (budget > 0) {
      if (!s.cur) { const n = s.q.shift(); if (!n) break; s.cur = n; s.left = n.cost * (i === slow ? factor : 1); }
      const use = Math.min(budget, s.left);
      s.left -= use; budget -= use;
      if (s.left <= 0) { run.lat.push(t + (DT - budget) - s.cur.at); s.cur = null; }
    }
    run.maxQ = Math.max(run.maxQ, s.q.length);
  });
  if (run.lat.length > 400) run.lat.splice(0, run.lat.length - 400);
}

export function LbRace() {
  const [a, setA] = useState<Algo>("rr");
  const [b, setB] = useState<Algo>("p2c");
  const [util, setUtil] = useState(0.7);
  const [heavy, setHeavy] = useState(0.1);
  const [factor, setFactor] = useState(4);
  const [slow, setSlow] = useState(2);
  const [stale, setStale] = useState(false);
  const meanCost = (1 - heavy) * LIGHT + heavy * HEAVY;
  const capacity = Array.from({ length: N }, (_, i) => 1000 / (meanCost * (i === slow ? factor : 1))).reduce((x, y) => x + y, 0);
  const rate = util * capacity; // requests per second

  const sim = useSim<St>(() => ({
    t: 0, id: 0, arr: rng(7),
    runs: [a, b].map((algo, k) => ({ algo, srv: Array.from({ length: N }, () => ({ q: [], cur: null, left: 0 })), lat: [], series: [], rr: 0, r: rng(100 + k), rejected: 0, maxQ: 0, last: "", view: Array(N).fill(0) })),
  }), (s) => {
    // Poisson arrivals for this tick, shared by both runs
    const mean = (rate * DT) / 1000;
    const u = s.arr();
    let k = 0, p = Math.exp(-mean), acc = p;
    while (u > acc && k < 20) { k++; p *= mean / k; acc += p; }
    for (let j = 0; j < k; j++) {
      const isHeavy = s.arr() < heavy;
      const req: Req = { id: ++s.id, at: s.t, cost: isHeavy ? HEAVY : LIGHT, heavy: isHeavy };
      s.runs.forEach((run) => route(run, { ...req }, !stale));
    }
    s.t += DT;
    s.runs.forEach((run) => {
      serve(run, s.t, slow, factor);
      if (s.t % REPORT === 0) run.view = run.srv.map(inflight);
      if (s.t % 100 === 0) { run.series.push(pct(run.lat, 99)); if (run.series.length > 150) run.series.shift(); }
    });
  }, [a, b, util, heavy, factor, slow, stale], 2);

  const runs = sim.s.runs;
  const p99 = runs.map((r) => pct(r.lat, 99)), p50 = runs.map((r) => pct(r.lat, 50));
  const top = Math.max(400, ...runs.flatMap((r) => r.series));
  const insight = useMemo(() => {
    if (sim.s.t < 3000) return null;
    const [ra, rb] = runs, worse = p99[0] >= p99[1] ? 0 : 1, better = 1 - worse, ratio = p99[worse] / Math.max(1, p99[better]);
    const w = runs[worse], slowQ = w.srv[slow].q.length;
    if (ra.algo === rb.algo) return "Both sides run the same strategy: pick a different one on the right to compare.";
    if (ratio < 1.3) return `${NAME[ra.algo]} and ${NAME[rb.algo]} perform about the same here. Make one server slower, add expensive requests, raise the load or switch on stale load info until they separate.`;
    const why = (w.algo === "rr" || w.algo === "random") && slowQ > 6
      ? `it keeps sending the slow server its equal share (1 in ${N}) however far behind it is, so that queue is ${slowQ} deep`
      : w.algo === "least" && stale
        ? "on stale numbers every balancer sends everything to whichever server looked emptiest at the last report, then the next one: a herd that moves from server to server"
        : "expensive requests pile up behind each other on servers it cannot see are busy";
    return `${NAME[w.algo]}'s p99 is ${ratio.toFixed(1)}× ${NAME[runs[better].algo]}'s: ${why}.`;
  }, [sim.s.t]); // eslint-disable-line react-hooks/exhaustive-deps

  const opts = (Object.keys(NAME) as Algo[]).map((k) => [k, NAME[k]] as [Algo, string]);
  return (
    <Frame title="Load-balancing race" q="Same requests, two strategies: which one keeps the slowest requests fast?"
      about="Each dot is a request waiting on a server (small = 20 ms of work, big = 200 ms). Both panels get identical traffic. Click a server's name to make it the slow one."
      foot={insight ?? "Press Play. Watch the queues, then the p99 (the latency that 1 request in 100 is slower than): averages hide exactly the users who suffer."}>
      <div className="space-y-4">
        <Predict q={`One server is ${factor}× slower than the others. Which strategy's slowest requests suffer most?`} options={["Round robin", "Least connections", "Power of two choices"]} answer={0}
          why="Round robin ignores load: the slow server keeps getting 1 request in 5, more than it can finish, so its queue only grows. Strategies that look at load route around it." />
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5"><div className="text-[12px] text-faint">Left</div><Chips value={a} options={opts} onChange={setA} /></div>
          <div className="space-y-1.5"><div className="text-[12px] text-faint">Right</div><Chips value={b} options={opts} onChange={setB} /></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Slider label="Load (share of total capacity)" value={util} min={0.3} max={0.95} step={0.05} onChange={setUtil} fmt={(v) => `${Math.round(v * 100)}%`} />
          <Slider label="Expensive requests" value={heavy} min={0} max={0.3} step={0.05} onChange={setHeavy} fmt={(v) => `${Math.round(v * 100)}%`} />
          <Slider label="Slow server is slower by" value={factor} min={1} max={8} onChange={setFactor} fmt={(v) => (v === 1 ? "not slow" : `${v}×`)} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SimControls sim={sim} stepLabel="One tick" />
          <Btn on={stale} onClick={() => setStale(!stale)} title="Balancers see each server's load only from a report every 250 ms">Stale load info (several balancers)</Btn>
          <span className="num text-[12px] text-faint">{Math.round(rate)} requests/s · t = {(sim.s.t / 1000).toFixed(1)} s</span>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {runs.map((run, k) => (
            <div key={k} className="rounded-xl border border-line bg-bg p-3">
              <div className="mb-2 flex items-center justify-between"><span className="text-[13px] font-semibold">{NAME[run.algo]}</span><span className="text-[11px] text-faint">{k ? "right" : "left"}</span></div>
              <div className="space-y-1.5">
                {run.srv.map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <button onClick={() => setSlow(i)} className={cn("w-[52px] shrink-0 rounded-md border px-1 py-0.5 text-left font-mono text-[11px]", i === slow && factor > 1 ? "border-warn/50 text-warn" : "border-transparent text-faint hover:text-mute")} title="Make this the slow server">
                      s{i + 1}{i === slow && factor > 1 ? ` ×${factor}` : ""}
                    </button>
                    <span className={cn("grid h-4 w-4 shrink-0 place-items-center rounded-full border", s.cur ? "border-accent" : "border-line")}>{s.cur && <span className={cn("rounded-full bg-accent", s.cur.heavy ? "h-2.5 w-2.5" : "h-1.5 w-1.5")} />}</span>
                    <div className="flex h-4 min-w-0 flex-1 items-center gap-[3px] overflow-hidden">
                      {s.q.slice(0, 24).map((r) => <span key={r.id} className={cn("shrink-0 rounded-full", r.heavy ? "h-3 w-3 bg-lld" : "h-1.5 w-1.5 bg-dsa")} />)}
                      {s.q.length > 24 && <span className="ml-1 font-mono text-[10px] text-bad">+{s.q.length - 24}</span>}
                    </div>
                    <span className={cn("num w-6 text-right text-[11px]", s.q.length > 12 ? "text-bad" : "text-faint")}>{s.q.length}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-4 gap-1.5">
                <Stat k="p50" v={ms(p50[k])} />
                <Stat k="p99" v={ms(p99[k])} tone={p99[k] > 1000 ? "var(--color-bad)" : p99[k] > 400 ? "var(--color-warn)" : "var(--color-ok)"} />
                <Stat k="Worst queue" v={run.maxQ} />
                <Stat k="Rejected" v={run.rejected} tone={run.rejected ? "var(--color-bad)" : undefined} />
              </div>
              <div className="mt-2"><div className="mb-0.5 text-[10.5px] uppercase tracking-wider text-faint">p99 over time (same scale both sides)</div><Spark data={run.series} max={top} color={k ? "var(--color-hld)" : "var(--color-lld)"} label={`p99 trend, ${NAME[run.algo]}`} /></div>
              <div className="mt-1.5 truncate font-mono text-[11px] text-mute" title={run.last}>{run.last || "Last decision appears here."}</div>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}
