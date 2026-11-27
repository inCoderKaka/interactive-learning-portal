"use client";
/**
 * Google-papers visuals: Bigtable row-key design (where writes land, what queries cost), TrueTime commit wait on a
 * true-time axis, and a Borg-style scheduler packing production and batch tasks with preemption and reclamation.
 */
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Btn, Chips, Frame, Predict, SimControls, Stat, rng, useSim } from "./kit";
import { cn } from "../../ui";

// ───────── Bigtable row keys ─────────
type Key = "time" | "user" | "salt";
const SERVERS = 8;
const KEYS: [Key, string][] = [["time", "timestamp#user"], ["user", "user#timestamp"], ["salt", "bucket(0–7)#timestamp#user"]];
/** Position of a new write in the sorted key space [0, 1). Existing data covers 30 days; new writes are "now". */
function keyPos(k: Key, user: number, r: () => number) {
  if (k === "time") return 0.97 + r() * 0.029; // after all older timestamps: the very end of the table
  if (k === "user") return (user + r() * 0.99) / 1000; // spread by user, newest at the end of each user's range
  const b = user % 8; return (b + 0.97 + r() * 0.029) / 8; // end of each bucket's range
}
export function BigtableKeys() {
  const [k, setK] = useState<Key>("time");
  const sim = useSim(() => ({ r: rng(9), load: Array(SERVERS).fill(0) as number[], dots: [] as { p: number; id: number }[], n: 0 }), (s) => {
    for (let i = 0; i < 4; i++) {
      const user = Math.floor(s.r() * 1000), p = keyPos(k, user, s.r);
      s.load[Math.min(SERVERS - 1, Math.floor(p * SERVERS))]++;
      s.dots.push({ p, id: s.n++ }); if (s.dots.length > 60) s.dots.shift();
    }
  }, [k], 1);
  const s = sim.s, total = s.load.reduce((a, b) => a + b, 0) || 1, hottest = Math.max(...s.load) / total;
  const cost: Record<Key, [string, string, string]> = {
    time: ["1 scan · 60k rows", "1 big scan · 1.44M rows read", "All writes hit the last tablet"],
    user: ["1,000 scans · 60k rows", "1 scan · 1,440 rows", "Spread evenly"],
    salt: ["8 scans · 60k rows", "8 scans · 1.44M rows read", "Spread over 8 ranges"],
  };
  const W = 600;
  return (
    <Frame title="Where do the writes land?" q="An events table gets a write every minute from each of 1,000 users. Which row key keeps one tablet server from melting?"
      about="Rows are sorted by key and each of the 8 tablet servers holds one contiguous slice. The table already holds 30 days. Press play to stream new events and watch where they land; the stats compare two common queries: everything from the last hour (60,000 events) and one user's last day (1,440 events)."
      foot={k === "time" ? "Every new key starts with the current time, which sorts after everything already stored: one tablet at the end takes all writes. Splitting it doesn't help, because the newest range is always the last one." : k === "user" ? "Leading with the user spreads writes across the whole key space, and one user's history is a single short scan. The price: 'everything in the last hour' needs a scan per user." : "Salting with 8 buckets spreads writes over 8 places while keeping time order inside each bucket, so recent-events queries cost 8 scans. Per-user queries got worse. Pick the key from the queries you must serve."}>
      <div className="space-y-3">
        <Predict q="Row key timestamp#user, 8 tablet servers. What share of new writes does the busiest server take?" options={["About 1/8", "About half", "Nearly all"]} answer={2} why="New timestamps sort after all old ones, so every write goes to the final tablet." />
        <div className="flex flex-wrap items-center gap-2">
          <Chips label="Row key" value={k} options={KEYS} onChange={setK} />
          <SimControls sim={sim} stepLabel="+40 writes" stepN={10} />
        </div>
        <div className="overflow-x-auto rounded-xl border border-line bg-[#0c0e15] p-2">
          <svg viewBox={`0 0 ${W} 120`} style={{ width: "100%", minWidth: 500 }} role="img" aria-label="Sorted key space split into 8 tablets with new writes">
            <text x={10} y={14} className="text-[9px]" fill="#5d637c">sorted row keys →</text>
            {Array.from({ length: SERVERS }, (_, i) => {
              const x = 10 + (i * (W - 20)) / SERVERS, w = (W - 20) / SERVERS - 3, share = s.load[i] / total;
              return (
                <g key={i}>
                  <rect x={x} y={22} width={w} height={40} rx={5} fill="#151826" stroke={share > 0.5 ? "#ff6b6b" : "#2f3550"} />
                  <text x={x + w / 2} y={76} textAnchor="middle" className="text-[9px]" fill="#8a90a8">server {i + 1}</text>
                  <rect x={x} y={84} width={w} height={8} rx={3} fill="#1d2132" />
                  <motion.rect x={x} y={84} height={8} rx={3} fill={share > 0.5 ? "#ff6b6b" : "#c8f547"} animate={{ width: w * Math.min(1, share * (SERVERS / 2)) }} />
                  <text x={x + w / 2} y={106} textAnchor="middle" className="num text-[9px]" fill="#e9ebf4">{Math.round(share * 100)}%</text>
                </g>
              );
            })}
            {s.dots.map((d) => <motion.circle key={d.id} cx={10 + d.p * (W - 20)} r={2.6} fill="#c8f547" initial={{ cy: 22, opacity: 1 }} animate={{ cy: 56, opacity: 0.35 }} transition={{ duration: 0.5 }} />)}
          </svg>
        </div>
        <div className="grid gap-1.5 sm:grid-cols-3">
          <Stat k="Busiest server's share" v={`${Math.round(hottest * 100)}%`} tone={hottest > 0.5 ? "var(--color-bad)" : "var(--color-ok)"} sub={cost[k][2]} />
          <Stat k="Query: all events, last hour" v={<span className="text-[12.5px]">{cost[k][0]}</span>} />
          <Stat k="Query: one user's last day" v={<span className="text-[12.5px]">{cost[k][1]}</span>} />
        </div>
      </div>
    </Frame>
  );
}

// ───────── TrueTime commit wait ─────────
type Off = "worst" | "zero" | "best";
function Interval({ x, eps, y, at, o, label, color }: { x: (t: number) => number; eps: number; y: number; at: number; o: number; label: string; color: string }) {
  return (
    <g>
      <rect x={x(at + o - eps)} y={y - 5} width={Math.max(2, x(at + o + eps) - x(at + o - eps))} height={10} rx={3} fill={color} opacity={0.25} stroke={color} />
      <line x1={x(at)} x2={x(at)} y1={y - 9} y2={y + 9} stroke="#e9ebf4" strokeWidth={1.2} />
      <text x={x(at + o + eps) + 4} y={y + 3} className="text-[9px]" fill={color}>{label}</text>
    </g>
  );
}
export function TrueTime() {
  const [eps, setEps] = useState(4);
  const [wait, setWait] = useState(true);
  const [off, setOff] = useState<Off>("worst");
  const d = 1; // ms for the client to learn of T1's commit and start T2 on another server
  const r = useMemo(() => {
    const offA = off === "worst" ? eps : off === "best" ? -eps : 0, offB = off === "worst" ? -eps : off === "best" ? eps : 0;
    const t0 = 10;
    const s1 = t0 + offA + eps; // TT.now().latest at A
    const ack = wait ? t0 + 2 * eps : t0; // commit wait: until A's earliest > s1
    const t2 = ack + d;
    const s2 = t2 + offB + eps;
    return { offA, offB, t0, s1, ack, t2, s2, ok: s2 > s1 };
  }, [eps, wait, off]);
  const lo = Math.max(0, Math.min(r.t0 + r.offA - eps, r.t2 + r.offB - eps) - 3), hi = Math.max(r.s2, r.s1, r.ack, r.t2 + r.offB + eps) + Math.max(6, eps * 0.6);
  const W = 600, x = (t: number) => 30 + ((t - lo) / (hi - lo)) * (W - 50);
  return (
    <Frame title="Commit wait on a true-time axis" q="T1 commits in Iowa. A moment later, T2 starts in Belgium. Must T2's timestamp be larger than T1's?"
      about="Each server's clock is off by up to ε; TrueTime returns an interval [earliest, latest] that surely contains the true time (white tick). T1 takes the top of its interval as its timestamp s1. Change ε, the clock errors, and whether Spanner waits before acknowledging."
      foot={r.ok ? (wait ? `Commit wait held T1's acknowledgement until true time ${r.ack.toFixed(0)} ms, when s1 was certainly past on every clock. T2 started later, so s2 > s1 regardless of clock errors. Cost: ${2 * eps} ms per commit.` : "This time the clock errors happened to be favourable, so the order came out right by luck. Try the worst case.") : `Without commit wait, T2 started right after T1 was acknowledged but got a SMALLER timestamp (${r.s2.toFixed(0)} < ${r.s1.toFixed(0)}). A snapshot read at s2 would not see T1, although T1 had already committed: external consistency is broken.`}>
      <div className="space-y-3">
        <Predict q="No commit wait. Iowa's clock is ε fast, Belgium's ε slow, and T2 starts 1 ms after T1's ack. With ε = 4 ms, which timestamp is larger?" options={["T2's, always", "T1's", "They're equal"]} answer={1} why="s1 ≈ t0 + 2ε while s2 ≈ t0 + 1 ms: Belgium's slow clock gives T2 an earlier timestamp." />
        <div className="flex flex-wrap items-center gap-3">
          <Chips label="ε" value={String(eps)} options={[["1", "1 ms"], ["4", "4 ms (Spanner typical)"], ["7", "7 ms"], ["50", "50 ms (NTP-like)"]]} onChange={(v) => setEps(Number(v))} />
          <Chips label="Clock errors" value={off} options={[["worst", "Iowa fast, Belgium slow"], ["zero", "Both exact"], ["best", "Iowa slow, Belgium fast"]]} onChange={setOff} />
          <Btn on={wait} onClick={() => setWait(!wait)}>Commit wait {wait ? "on" : "off"}</Btn>
        </div>
        <div className="overflow-x-auto rounded-xl border border-line bg-[#0c0e15] p-2">
          <svg viewBox={`0 0 ${W} 150`} style={{ width: "100%", minWidth: 520 }} role="img" aria-label="TrueTime intervals and commit timestamps">
            <line x1={30} x2={W - 20} y1={130} y2={130} stroke="#2f3550" />
            <text x={W - 20} y={144} textAnchor="end" className="text-[9px]" fill="#5d637c">true time (ms) →</text>
            {[Math.round(lo), Math.round((lo + hi) / 2), Math.round(hi) - 4].map((t) => <text key={t} x={x(t)} y={144} textAnchor="middle" className="num text-[9px]" fill="#5d637c">{t}</text>)}
            <text x={4} y={34} className="text-[9px] font-semibold" fill="#7aa7ff">Iowa</text>
            <Interval x={x} eps={eps} y={30} at={r.t0} o={r.offA} label="TT.now() at T1 commit" color="#7aa7ff" />
            <line x1={x(r.s1)} x2={x(r.s1)} y1={18} y2={130} stroke="#7aa7ff" strokeDasharray="3 3" />
            <text x={x(r.s1)} y={14} textAnchor="middle" className="text-[9.5px] font-semibold" fill="#7aa7ff">s1</text>
            {wait && <g><rect x={x(r.t0)} y={50} width={Math.max(2, x(r.ack) - x(r.t0))} height={8} rx={3} fill="#ffc857" opacity={0.7} /><text x={x(r.t0)} y={70} className="text-[9px]" fill="#ffc857">commit wait ({2 * eps} ms)</text></g>}
            <line x1={x(r.ack)} x2={x(r.ack)} y1={46} y2={84} stroke="#5be49b" /><text x={x(r.ack) + 3} y={82} className="text-[9px]" fill="#5be49b">ack to client</text>
            <text x={4} y={108} className="text-[9px] font-semibold" fill="#ff8fb3">Belgium</text>
            <Interval x={x} eps={eps} y={104} at={r.t2} o={r.offB} label="TT.now() at T2 start" color="#ff8fb3" />
            <line x1={x(r.s2)} x2={x(r.s2)} y1={92} y2={130} stroke={r.ok ? "#ff8fb3" : "#ff6b6b"} strokeWidth={r.ok ? 1 : 2} strokeDasharray="3 3" />
            <text x={x(r.s2)} y={126} textAnchor="middle" className="text-[9.5px] font-semibold" fill={r.ok ? "#ff8fb3" : "#ff6b6b"}>s2</text>
          </svg>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <Stat k="s1 (T1)" v={`${r.s1.toFixed(0)} ms`} />
          <Stat k="s2 (T2)" v={`${r.s2.toFixed(0)} ms`} tone={r.ok ? "var(--color-ok)" : "var(--color-bad)"} sub={r.ok ? "later than s1 ✓" : "earlier than s1 ✕"} />
          <Stat k="Added to each commit" v={wait ? `${2 * eps} ms` : "0 ms"} sub={wait ? "overlaps the Paxos round trip" : undefined} />
        </div>
      </div>
    </Frame>
  );
}

// ───────── Borg scheduler ─────────
type Kind = "prod" | "batch";
type Task = { id: number; kind: Kind; m: number | null };
const CAP = 16, MACHINES = 6, PROD_REQ = 4, PROD_USE = 1.6, BATCH = 2;
type Mode = "separate" | "shared";
type BState = { tasks: Task[]; evicted: number; next: number };
function place(st: BState, mode: Mode, kind: Kind) {
  const on = (m: number) => st.tasks.filter((t) => t.m === m);
  const pool = (k: Kind) => Array.from({ length: MACHINES }, (_, i) => i).filter((m) => mode === "shared" || (k === "prod" ? m < 3 : m >= 3));
  const prodReq = (m: number) => on(m).filter((t) => t.kind === "prod").length * PROD_REQ;
  const prodUse = (m: number) => on(m).filter((t) => t.kind === "prod").length * PROD_USE;
  const batchReq = (m: number) => on(m).filter((t) => t.kind === "batch").length * BATCH;
  const task: Task = { id: st.next++, kind, m: null };
  if (kind === "prod") {
    // feasible if production requests fit; batch there can be preempted. Best fit = fullest feasible machine.
    // score: fewest preemptions first (as Borg does), then best fit (fullest machine)
    const evictions = (m: number) => Math.max(0, Math.ceil((batchReq(m) - (CAP - (mode === "shared" ? prodUse(m) + PROD_USE : prodReq(m) + PROD_REQ))) / BATCH));
    const cand = pool("prod").filter((m) => prodReq(m) + PROD_REQ <= CAP).sort((a, b) => evictions(a) - evictions(b) || prodReq(b) + batchReq(b) - (prodReq(a) + batchReq(a)));
    if (cand.length) {
      task.m = cand[0];
      // keep batch within what production leaves: shared mode lends production's unused reservation (usage-based); separate mode never mixes
      const m = cand[0];
      const budget = () => CAP - (mode === "shared" ? prodUse(m) + PROD_USE : prodReq(m) + PROD_REQ);
      const victims: Task[] = [];
      while (batchReq(m) > budget()) { const victim = on(m).find((t) => t.kind === "batch")!; victim.m = null; st.evicted++; victims.push(victim); }
      st.tasks.push(task);
      // evicted batch tasks go back to the scheduler and land wherever there's room
      for (const v of victims) { st.tasks = st.tasks.filter((t) => t !== v); place(st, mode, "batch"); }
      return;
    }
  } else {
    const fits = (m: number) => (mode === "shared" ? prodUse(m) : prodReq(m)) + batchReq(m) + BATCH <= CAP;
    const cand = pool("batch").filter(fits).sort((a, b) => batchReq(b) - batchReq(a));
    if (cand.length) task.m = cand[0];
  }
  st.tasks.push(task);
}
const initB = (mode: Mode): BState => { const st: BState = { tasks: [], evicted: 0, next: 0 }; for (let i = 0; i < 10; i++) place(st, mode, "prod"); return st; };
export function BorgSched() {
  const [mode, setMode] = useState<Mode>("separate");
  const [st, setSt] = useState<BState>(() => initB("separate"));
  const act = (fn: (s: BState) => void) => setSt((prev) => { const s: BState = { ...prev, tasks: prev.tasks.map((t) => ({ ...t })) }; fn(s); return s; });
  const switchMode = (m: Mode) => { setMode(m); setSt(initB(m)); };
  const running = (k: Kind) => st.tasks.filter((t) => t.kind === k && t.m !== null).length;
  const pending = (k: Kind) => st.tasks.filter((t) => t.kind === k && t.m === null).length;
  const used = st.tasks.filter((t) => t.m !== null).reduce((a, t) => a + (t.kind === "prod" ? PROD_USE : BATCH), 0);
  const UNIT = 11;
  return (
    <Frame title="Packing a cell" q="Production services reserve 4 CPUs per task but use only 1.6. Can batch work use the rest?"
      about={`A small cell of ${MACHINES} machines with ${CAP} CPUs each (CPU only, for clarity). Ten production tasks are running. Add batch jobs and a production surge, with separate machine pools or one shared cell that lends unused reservations to batch.`}
      foot={mode === "separate" ? "Separate pools: production machines sit mostly idle (reserved, not used), and batch can only use its own three machines. A production surge beyond its pool can't be placed at all." : "Shared cell: batch borrows the CPUs production reserved but isn't using, and production can always reclaim them by preempting batch. Far more work fits on the same machines; evicted batch tasks are rescheduled elsewhere or wait."}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Chips label="Cell" value={mode} options={[["separate", "Separate pools (3 prod + 3 batch)"], ["shared", "Shared, with reclamation"]]} onChange={switchMode} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Btn onClick={() => act((s) => { for (let i = 0; i < 12; i++) place(s, mode, "batch"); })}>+ batch job (12 × 2 CPU)</Btn>
          <Btn tone="bad" onClick={() => act((s) => { for (let i = 0; i < 3; i++) place(s, mode, "prod"); })}>+ production surge (3 × 4 CPU)</Btn>
          <Btn onClick={() => act((s) => { s.tasks.filter((t) => t.kind === "batch" && t.m === null).forEach((t) => { s.tasks = s.tasks.filter((x) => x !== t); place(s, mode, "batch"); }); })}>Retry pending batch</Btn>
          <Btn onClick={() => setSt(initB(mode))}>Reset</Btn>
        </div>
        <div className="flex gap-2 overflow-x-auto rounded-xl border border-line bg-[#0c0e15] p-3">
          {Array.from({ length: MACHINES }, (_, m) => {
            const ts = st.tasks.filter((t) => t.m === m).sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "prod" ? -1 : 1));
            return (
              <div key={m} className="flex flex-col items-center gap-1">
                <div className="relative flex flex-col-reverse rounded-md border border-line bg-[#151826]" style={{ width: 54, height: CAP * UNIT + 4, padding: 2 }}>
                  {ts.map((t) => t.kind === "prod" ? (
                    <motion.div layout key={t.id} className="relative mb-px rounded-sm border border-[#7aa7ff]/70" style={{ height: (mode === "shared" ? PROD_USE : PROD_REQ) * UNIT - 1 }}>
                      <div className="absolute inset-x-0 bottom-0 rounded-sm bg-[#7aa7ff]/80" style={{ height: PROD_USE * UNIT - 1 }} />
                    </motion.div>
                  ) : (
                    <motion.div layout key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-px rounded-sm bg-[#c8f547]/75" style={{ height: BATCH * UNIT - 1 }} />
                  ))}
                </div>
                <span className={cn("text-[10px]", mode === "separate" ? (m < 3 ? "text-[#7aa7ff]" : "text-[#c8f547]") : "text-faint")}>{mode === "separate" ? (m < 3 ? "prod pool" : "batch pool") : `m${m + 1}`}</span>
              </div>
            );
          })}
          <div className="ml-2 space-y-1.5 self-start text-[11.5px] text-mute">
            <div className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-sm border border-[#7aa7ff]/70" />production reservation</div>
            <div className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-sm bg-[#7aa7ff]/80" />production actual use</div>
            <div className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-sm bg-[#c8f547]/75" />batch task</div>
            {mode === "shared" && <div className="max-w-[160px] text-faint">In the shared cell, production&apos;s unused reservation is lent out, so only its real use is drawn.</div>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          <Stat k="Batch running" v={running("batch")} sub={pending("batch") ? `${pending("batch")} pending` : undefined} />
          <Stat k="Production pending" v={pending("prod")} tone={pending("prod") ? "var(--color-bad)" : "var(--color-ok)"} />
          <Stat k="Batch evictions" v={st.evicted} tone={st.evicted ? "var(--color-warn)" : undefined} />
          <Stat k="CPUs actually used" v={`${Math.round((used / (CAP * MACHINES)) * 100)}%`} />
        </div>
      </div>
    </Frame>
  );
}
