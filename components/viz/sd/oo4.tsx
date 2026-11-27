"use client";
/**
 * LLD visuals, chapter 6 (concurrency foundations): cores and threads on a timeline, stepping two threads through a
 * race, lock kinds under the same workload, a two-lock deadlock, and compare-and-set retries.
 */
import { useMemo, useState } from "react";
import { Btn, Chips, Frame, Slider, Stat, rng, useSim, SimControls } from "./kit";
import { cn } from "../../ui";

// ───────────────────────── cores-lab ─────────────────────────

type Seg = ["cpu" | "io", number];
type Cell = "run" | "io" | "ready" | "done" | "blocked";
function schedule(tasks: Seg[][], cores: number, threads: number) {
  const n = tasks.length;
  const rows: Cell[][] = tasks.map(() => []);
  if (threads === 1) {
    // one thread runs the tasks one after another; it blocks during I/O
    let t = 0;
    tasks.forEach((segs, i) => {
      for (let k = 0; k < t; k++) rows[i].push("ready");
      for (const [kind, len] of segs) for (let k = 0; k < len; k++) rows[i].push(kind === "cpu" ? "run" : "blocked");
      t = rows[i].length;
    });
    const total = Math.max(...rows.map((r) => r.length));
    rows.forEach((r) => { while (r.length < total) r.push("done"); });
    return { rows, total };
  }
  const pos = tasks.map(() => ({ seg: 0, left: tasks[0] ? 0 : 0 }));
  tasks.forEach((segs, i) => { pos[i].left = segs[0][1]; });
  let rr = 0, t = 0;
  while (pos.some((p, i) => p.seg < tasks[i].length) && t < 400) {
    const wantCpu = tasks.map((segs, i) => pos[i].seg < segs.length && segs[pos[i].seg][0] === "cpu");
    const order = [...Array(n).keys()].map((k) => (k + rr) % n).filter((i) => wantCpu[i]);
    const running = new Set(order.slice(0, cores));
    rr = (rr + 1) % n;
    for (let i = 0; i < n; i++) {
      const p = pos[i];
      if (p.seg >= tasks[i].length) { rows[i].push("done"); continue; }
      const kind = tasks[i][p.seg][0];
      if (kind === "io") { rows[i].push("io"); p.left--; }
      else if (running.has(i)) { rows[i].push("run"); p.left--; }
      else { rows[i].push("ready"); }
      if (p.left === 0) { p.seg++; if (p.seg < tasks[i].length) p.left = tasks[i][p.seg][1]; }
    }
    t++;
  }
  const total = Math.max(...rows.map((r) => { let k = r.length; while (k > 0 && r[k - 1] === "done") k--; return k; }));
  return { rows: rows.map((r) => r.slice(0, total)), total };
}
const CELL_COLOR: Record<Cell, string> = { run: "#5be49b", io: "#7aa7ff", ready: "#ff6b6b55", done: "transparent", blocked: "#7aa7ff" };

export function CoresLab() {
  const [work, setWork] = useState<"cpu" | "io">("io");
  const [cores, setCores] = useState<"1" | "2" | "4">("1");
  const [threads, setThreads] = useState<"1" | "4">("4");
  const tasks: Seg[][] = useMemo(() => [0, 1, 2, 3].map(() => (work === "cpu" ? [["cpu", 6]] : [["cpu", 1], ["io", 4], ["cpu", 1], ["io", 4], ["cpu", 1]]) as Seg[]), [work]);
  const { rows, total } = useMemo(() => schedule(tasks, +cores, +threads), [tasks, cores, threads]);
  const serial = tasks.flat().reduce((s, [, l]) => s + l, 0);
  return (
    <Frame title="Four tasks, some cores, some threads" q="When do more threads make work finish sooner, and when do they not?"
      about="Each row is one task over time. Green: running on a core. Blue: waiting for I/O (no core needed). Red: ready to run but no free core. Change the workload, cores and threads."
      foot="CPU-bound tasks finish faster only with more cores: four threads on one core just take turns. I/O-bound tasks finish faster with more threads even on one core, because while one waits for the network, another uses the CPU.">
      <div className="flex flex-wrap gap-3">
        <Chips label="Work" value={work} onChange={setWork} options={[["cpu", "CPU-bound"], ["io", "I/O-bound"]]} />
        <Chips label="Cores" value={cores} onChange={setCores} options={[["1", "1"], ["2", "2"], ["4", "4"]]} />
        <Chips label="Threads" value={threads} onChange={setThreads} options={[["1", "1 thread"], ["4", "4 threads"]]} />
      </div>
      <div className="mt-3 space-y-1.5 overflow-x-auto rounded-xl border border-line bg-bg p-3">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-14 shrink-0 font-mono text-[11.5px] text-mute">task {i + 1}</span>
            <div className="flex">{r.map((c, k) => <span key={k} className="h-4 w-[9px] border-r border-bg" style={{ background: CELL_COLOR[c], opacity: c === "blocked" ? 0.5 : 1 }} title={c} />)}</div>
          </div>
        ))}
        <div className="flex items-center gap-2"><span className="w-14 shrink-0" /><div className="font-mono text-[10.5px] text-faint">time →</div></div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat k="Finish time" v={`${total} units`} tone={total < serial ? "#5be49b" : undefined} />
        <Stat k="All work one after another" v={`${serial} units`} />
        <Stat k="Speed-up" v={`${(serial / total).toFixed(1)}×`} />
      </div>
    </Frame>
  );
}

// ───────────────────────── interleave ─────────────────────────

type Prog = "count" | "seat";
const STEPS: Record<Prog, string[]> = {
  count: ["r = count", "r = r + 1", "count = r"],
  seat: ["free = seat.isFree()", "if (free) …", "seat.owner = me"],
};
export function Interleave() {
  const [prog, setProg] = useState<Prog>("count");
  const [locked, setLocked] = useState(false);
  const [pc, setPc] = useState<[number, number]>([0, 0]);
  const [count, setCount] = useState(0);
  const [owner, setOwner] = useState<string | null>(null);
  const [reg, setReg] = useState<[number | boolean | null, number | boolean | null]>([null, null]);
  const [holder, setHolder] = useState<number | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [booked, setBooked] = useState<string[]>([]);
  const body = STEPS[prog];
  const full = locked ? ["lock()", ...body, "unlock()"] : body;
  const reset = (p = prog) => { setPc([0, 0]); setCount(0); setOwner(null); setReg([null, null]); setHolder(null); setLog([]); setBooked([]); setProg(p); };
  const canStep = (t: number) => pc[t] < full.length && !(locked && full[pc[t]] === "lock()" && holder !== null && holder !== t);
  const step = (t: number) => {
    if (!canStep(t)) return;
    const s = full[pc[t]];
    const name = `T${t + 1}`;
    const r = [...reg] as typeof reg;
    if (s === "lock()") setHolder(t);
    else if (s === "unlock()") setHolder(null);
    else if (prog === "count") {
      if (s === "r = count") r[t] = count;
      if (s === "r = r + 1") r[t] = (r[t] as number) + 1;
      if (s === "count = r") setCount(r[t] as number);
    } else {
      if (s.startsWith("free =")) r[t] = owner === null;
      if (s === "seat.owner = me") { if (r[t]) { setOwner(name); setBooked((b) => [...b, name]); } }
    }
    setReg(r);
    setLog((l) => [...l, `${name}: ${s}${s === "r = count" ? ` → r${t + 1} = ${count}` : ""}${s.startsWith("free =") ? ` → ${owner === null}` : ""}`]);
    setPc((p) => (t === 0 ? [p[0] + 1, p[1]] : [p[0], p[1] + 1]));
  };
  const done = pc[0] >= full.length && pc[1] >= full.length;
  const bad = prog === "count" ? done && count !== 2 : booked.length > 1;
  const auto = () => {
    reset();
    // replay the worst order (alternate threads every step) through the same rules
    let c = 0, own: string | null = null, h: number | null = null; const p = [0, 0]; const rr: (number | boolean | null)[] = [null, null]; const lg: string[] = []; const bk: string[] = [];
    let want = 0;
    for (let guard = 0; guard < 40 && (p[0] < full.length || p[1] < full.length); guard++) {
      const ok = (x: number) => p[x] < full.length && !(locked && full[p[x]] === "lock()" && h !== null && h !== x);
      const t = ok(want) ? want : 1 - want;
      want = 1 - t;
      if (!ok(t)) break;
      const s = full[p[t]];
      const name = `T${t + 1}`;
      if (s === "lock()") h = t; else if (s === "unlock()") h = null;
      else if (prog === "count") { if (s === "r = count") rr[t] = c; if (s === "r = r + 1") rr[t] = (rr[t] as number) + 1; if (s === "count = r") c = rr[t] as number; }
      else { if (s.startsWith("free =")) rr[t] = own === null; if (s === "seat.owner = me" && rr[t]) { own = name; bk.push(name); } }
      lg.push(`${name}: ${s}`); p[t]++;
    }
    setPc([p[0], p[1]]); setCount(c); setOwner(own); setReg([rr[0], rr[1]]); setHolder(h); setLog(lg); setBooked(bk);
  };
  return (
    <Frame title="Step two threads through the same code" q="Which orders of steps lose an update or sell one seat twice, and what does a lock change?"
      about="You are the scheduler: press T1 or T2 to run that thread's next step. Try running both reads before either write. Then turn the lock on and try again."
      foot="Without the lock, any order where both threads read before either writes loses an update (count ends at 1) or books the seat twice. With the lock, the second thread can't start its read until the first has written and unlocked, so every order gives the right answer.">
      <div className="flex flex-wrap items-center gap-3">
        <Chips value={prog} onChange={(p) => reset(p)} options={[["count", "count++"], ["seat", "book the last seat"]]} />
        <Btn on={locked} onClick={() => { setLocked((x) => !x); reset(); }}>{locked ? "Lock: ON" : "Lock: OFF"}</Btn>
        <Btn onClick={auto}>Worst-case order</Btn>
        <Btn onClick={() => reset()}>Reset</Btn>
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1fr_0.9fr]">
        {[0, 1].map((t) => (
          <div key={t} className="rounded-xl border border-line bg-bg p-3">
            <div className="flex items-center justify-between"><span className="font-mono text-[12.5px] font-semibold">Thread T{t + 1}</span><Btn onClick={() => step(t)} disabled={!canStep(t)}>Run next step</Btn></div>
            <ol className="mt-2 space-y-1 font-mono text-[12px]">
              {full.map((s, i) => <li key={i} className={cn("rounded px-1.5 py-0.5", i < pc[t] ? "text-faint line-through" : i === pc[t] ? (canStep(t) ? "bg-accent/15 text-accent" : "bg-bad/15 text-bad") : "text-mute")}>{s}{i === pc[t] && !canStep(t) && pc[t] < full.length ? "   (waiting for lock)" : ""}</li>)}
            </ol>
            <div className="mt-2 text-[11.5px] text-faint">{prog === "count" ? `register r${t + 1} = ${reg[t] ?? "–"}` : `free (as seen) = ${reg[t] ?? "–"}`}</div>
          </div>
        ))}
        <div className="space-y-2">
          <Stat k={prog === "count" ? "Shared count" : "Seat owner"} v={prog === "count" ? count : owner ?? "free"} tone={bad ? "#ff8f8f" : done ? "#5be49b" : undefined} sub={prog === "count" ? "expected 2 after both" : `booked by: ${booked.join(", ") || "nobody yet"}`} />
          {locked && <Stat k="Lock held by" v={holder === null ? "nobody" : `T${holder + 1}`} />}
          <div className={cn("rounded-xl border p-2 text-[12.5px]", bad ? "border-bad/40 text-bad" : done ? "border-ok/40 text-ok" : "border-line text-faint")}>
            {bad ? (prog === "count" ? "Lost update: two increments, count = " + count : "Double booking: both threads saw the seat free") : done ? "Correct result" : "Keep stepping…"}
          </div>
          <div className="max-h-32 overflow-y-auto font-mono text-[11px] text-mute">{log.map((l, i) => <div key={i}>{l}</div>)}</div>
        </div>
      </div>
    </Frame>
  );
}

// ───────────────────────── lock-lab ─────────────────────────

type Mode = "mutex" | "rw" | "striped";
type Th = { st: "idle" | "wait" | "hold"; op: "r" | "w"; key: number; left: number; waited: number; hist: string[] };
function makeLock(seed: number) {
  const r = rng(seed);
  return { r, ths: Array.from({ length: 8 }, () => ({ st: "idle", op: "r", key: 0, left: 0, waited: 0, hist: [] }) as Th), done: 0, waitSum: 0, ticks: 0 };
}
export function LockLab() {
  const [mode, setMode] = useState<Mode>("mutex");
  const [reads, setReads] = useState(90);
  const sim = useSim(() => makeLock(7), (s) => {
    s.ticks++;
    // new requests
    for (const t of s.ths) if (t.st === "idle" && s.r() < 0.5) { t.st = "wait"; t.op = s.r() * 100 < reads ? "r" : "w"; t.key = Math.floor(s.r() * 8); t.left = t.op === "r" ? 3 : 4; t.waited = 0; }
    // grants
    for (const t of s.ths.filter((x) => x.st === "wait").sort((a, b) => b.waited - a.waited)) {   // longest waiter first
      const hs = s.ths.filter((x) => x.st === "hold");
      let ok = false;
      if (mode === "mutex") ok = hs.length === 0;
      else if (mode === "striped") ok = !hs.some((h) => h.key % 4 === t.key % 4);
      else {
        const writerWaitingAhead = s.ths.some((x) => x.st === "wait" && x.op === "w" && x.waited > t.waited);
        ok = t.op === "r" ? !hs.some((h) => h.op === "w") && !writerWaitingAhead : hs.length === 0;
      }
      if (ok) t.st = "hold";
    }
    for (const t of s.ths) {
      t.hist.push(t.st === "hold" ? t.op : t.st === "wait" ? "x" : ".");
      if (t.hist.length > 60) t.hist.shift();
      if (t.st === "wait") { t.waited++; }
      else if (t.st === "hold") { t.left--; if (t.left === 0) { t.st = "idle"; s.done++; s.waitSum += t.waited; } }
    }
  }, [mode, reads], 1);
  const s = sim.s;
  const C: Record<string, string> = { r: "#5be49b", w: "#ffb454", x: "#ff6b6b", ".": "#2a2f3d" };
  return (
    <Frame title="Same workload, three kinds of lock" q="Eight threads read and write a shared map. How much time do they spend waiting under each locking scheme?"
      about="Green = holding the lock to read, orange = holding to write, red = waiting. A mutex lets one thread in; a read-write lock lets readers share; striping gives each group of keys its own lock."
      foot="With mostly reads, the read-write lock lets readers overlap, and striping lets operations on different keys overlap. Push the read share down and the read-write lock loses its advantage, because writers need the lock alone.">
      <div className="flex flex-wrap items-center gap-3">
        <Chips value={mode} onChange={setMode} options={[["mutex", "One mutex"], ["rw", "Read-write lock"], ["striped", "4 striped locks"]]} />
        <div className="w-48"><Slider label="Reads" value={reads} min={10} max={100} step={10} onChange={setReads} fmt={(v) => `${v}%`} /></div>
      </div>
      <div className="mt-2"><SimControls sim={sim} /></div>
      <div className="mt-3 space-y-1 rounded-xl border border-line bg-bg p-3">
        {s.ths.map((t, i) => (
          <div key={i} className="flex items-center gap-2"><span className="w-10 font-mono text-[11px] text-mute">T{i + 1}</span><div className="flex">{t.hist.map((h, k) => <span key={k} className="h-3 w-[7px] border-r border-bg" style={{ background: C[h] }} />)}</div></div>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat k="Operations done" v={s.done} />
        <Stat k="Per 100 ticks" v={s.ticks ? Math.round((s.done / s.ticks) * 100) : 0} />
        <Stat k="Avg wait" v={s.done ? `${(s.waitSum / s.done).toFixed(1)} ticks` : "–"} />
      </div>
    </Frame>
  );
}

// ───────────────────────── deadlock-lab ─────────────────────────

export function DeadlockLab() {
  const [ordered, setOrdered] = useState(false);
  const progs = useMemo(() => {
    const t1 = ["lock(A)", "lock(B)", "move ₹100 A→B", "unlock(B)", "unlock(A)"];
    const t2 = ordered ? ["lock(A)", "lock(B)", "move ₹50 B→A", "unlock(B)", "unlock(A)"] : ["lock(B)", "lock(A)", "move ₹50 B→A", "unlock(A)", "unlock(B)"];
    return [t1, t2];
  }, [ordered]);
  const [pc, setPc] = useState([0, 0]);
  const [owner, setOwner] = useState<Record<string, number | null>>({ A: null, B: null });
  const want = (t: number) => { const s = progs[t][pc[t]]; const m = s?.match(/^lock\((\w)\)$/); return m ? m[1] : null; };
  const blocked = (t: number) => { const w = want(t); return !!w && owner[w] !== null && owner[w] !== t; };
  const finished = (t: number) => pc[t] >= progs[t].length;
  const deadlock = [0, 1].every((t) => !finished(t) && blocked(t));
  const step = (t: number) => {
    if (finished(t) || blocked(t)) return;
    const s = progs[t][pc[t]];
    const lk = s.match(/^lock\((\w)\)$/), ul = s.match(/^unlock\((\w)\)$/);
    if (lk) setOwner((o) => ({ ...o, [lk[1]]: t }));
    if (ul) setOwner((o) => ({ ...o, [ul[1]]: null }));
    setPc((p) => (t === 0 ? [p[0] + 1, p[1]] : [p[0], p[1] + 1]));
  };
  const reset = () => { setPc([0, 0]); setOwner({ A: null, B: null }); };
  const worst = () => {
    // T1 takes its first lock, then T2 takes its first lock
    setOwner(ordered ? { A: 0, B: null } : { A: 0, B: 1 });
    setPc(ordered ? [1, 0] : [1, 1]);
  };
  const lockBox = (k: string) => (
    <div className={cn("rounded-xl border p-3 text-center", owner[k] === null ? "border-line" : "border-accent/60 bg-accent/10")}>
      <div className="text-[11px] uppercase tracking-wider text-faint">Account {k} lock</div>
      <div className="mt-1 font-mono text-[14px] font-semibold">{owner[k] === null ? "free" : `held by T${owner[k]! + 1}`}</div>
      {[0, 1].filter((t) => want(t) === k && blocked(t)).map((t) => <div key={t} className="mt-1 text-[12px] text-bad">T{t + 1} waiting</div>)}
    </div>
  );
  return (
    <Frame title="Two transfers, two locks" q="T1 moves money A→B, T2 moves money B→A, at the same time. When do they freeze forever?"
      about="Run each thread's next step, or press 'Worst timing'. Then switch to 'lock in id order', where both threads lock A before B."
      foot="Each thread holds one lock and waits for the other's: a cycle, so neither can ever continue. Locking accounts in a fixed global order (lower id first) makes the cycle impossible: whoever gets A first also gets B, and the other simply waits its turn.">
      <div className="flex flex-wrap items-center gap-3">
        <Chips value={ordered ? "ord" : "arg"} onChange={(v) => { setOrdered(v === "ord"); reset(); }} options={[["arg", "Lock in argument order"], ["ord", "Lock in id order"]]} />
        <Btn onClick={worst}>Worst timing</Btn><Btn onClick={reset}>Reset</Btn>
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_0.8fr_1fr]">
        {[0, 1].map((t) => (
          <div key={t} className={cn("rounded-xl border bg-bg p-3", t === 1 && "lg:order-3")}>
            <div className="flex items-center justify-between"><span className="font-mono text-[12.5px] font-semibold">T{t + 1}: transfer({t === 0 ? "A, B" : "B, A"})</span><Btn onClick={() => step(t)} disabled={finished(t) || blocked(t)}>Next step</Btn></div>
            <ol className="mt-2 space-y-1 font-mono text-[12px]">{progs[t].map((s, i) => <li key={i} className={cn("rounded px-1.5 py-0.5", i < pc[t] ? "text-faint line-through" : i === pc[t] ? (blocked(t) ? "bg-bad/15 text-bad" : "bg-accent/15 text-accent") : "text-mute")}>{s}</li>)}</ol>
            {finished(t) && <div className="mt-2 text-[12px] text-ok">finished</div>}
          </div>
        ))}
        <div className="space-y-2 lg:order-2">{lockBox("A")}{lockBox("B")}
          <div className={cn("rounded-xl border p-2 text-center text-[12.5px] font-semibold", deadlock ? "border-bad/50 text-bad" : "border-line text-faint")}>{deadlock ? "DEADLOCK: T1 waits for T2, T2 waits for T1" : finished(0) && finished(1) ? "Both transfers done" : "no cycle"}</div>
        </div>
      </div>
    </Frame>
  );
}

// ───────────────────────── cas-lab ─────────────────────────

type CT = { phase: "read" | "think" | "cas" | "done"; seen: number; wait: number; made: number; fails: number; cell: number };
function makeCas(n: number, seed: number) {
  const r = rng(seed);
  return { r, value: 0, ths: Array.from({ length: n }, () => ({ phase: "read", seen: 0, wait: 0, made: 0, fails: 0, cell: 0 }) as CT), casOps: 0, ticks: 0 };
}
export function CasLab() {
  const [n, setN] = useState(4);
  const [adder, setAdder] = useState(false);
  const K = 10;
  const sim = useSim(() => makeCas(n, 11), (s) => {
    s.ticks++;
    const order = s.ths.map((_, i) => i).sort(() => s.r() - 0.5);
    for (const i of order) {
      const t = s.ths[i];
      if (t.phase === "done") continue;
      if (adder) { if (s.r() < 0.6) { t.cell++; t.made++; s.casOps++; if (t.made >= K) t.phase = "done"; } continue; }
      if (t.phase === "read") { t.seen = s.value; t.phase = "think"; t.wait = 1 + Math.floor(s.r() * 2); }
      else if (t.phase === "think") { if (--t.wait <= 0) t.phase = "cas"; }
      else if (t.phase === "cas") {
        s.casOps++;
        if (s.value === t.seen) { s.value = t.seen + 1; t.made++; t.phase = t.made >= K ? "done" : "read"; }
        else { t.fails++; t.phase = "read"; }
      }
    }
  }, [n, adder], 1);
  const s = sim.s;
  const total = adder ? s.ths.reduce((a, t) => a + t.cell, 0) : s.value;
  const fails = s.ths.reduce((a, t) => a + t.fails, 0);
  const done = s.ths.every((t) => t.phase === "done");
  return (
    <Frame title="Compare-and-set under contention" q="Each thread adds 1 ten times using read → compute → CAS. How many attempts are wasted as more threads compete?"
      about="A CAS succeeds only if the value is still what the thread read. Otherwise it fails and the thread re-reads and retries. Switch to LongAdder, where each thread counts in its own cell."
      foot="With one thread every CAS succeeds. With more threads, others keep changing the value between a thread's read and its CAS, so failed attempts grow. The final count is still exact: nothing is lost, only retried. LongAdder avoids the fight by giving each thread its own cell and summing on read.">
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-44"><Slider label="Threads" value={n} min={1} max={8} onChange={setN} /></div>
        <Chips value={adder ? "add" : "cas"} onChange={(v) => setAdder(v === "add")} options={[["cas", "AtomicLong (CAS loop)"], ["add", "LongAdder (cells)"]]} />
      </div>
      <div className="mt-2"><SimControls sim={sim} /></div>
      <div className="mt-3 grid gap-2 sm:grid-cols-4">
        <Stat k="Value" v={total} sub={`target ${n * K}`} tone={done ? "#5be49b" : undefined} />
        <Stat k="Successful updates" v={s.ths.reduce((a, t) => a + t.made, 0)} />
        <Stat k="Failed CAS (retries)" v={adder ? 0 : fails} tone={fails ? "#ffb454" : undefined} />
        <Stat k="Wasted attempts" v={adder || !s.casOps ? "0%" : `${Math.round((fails / s.casOps) * 100)}%`} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {s.ths.map((t, i) => (
          <div key={i} className="rounded-lg border border-line bg-bg px-2 py-1.5 font-mono text-[11px]">
            <div className="flex justify-between"><span>T{i + 1}</span><span className={t.phase === "done" ? "text-ok" : t.phase === "cas" ? "text-accent" : "text-mute"}>{adder ? (t.phase === "done" ? "done" : "add") : t.phase}</span></div>
            <div className="text-faint">{adder ? `cell = ${t.cell}` : `saw ${t.seen} · ✓${t.made} ✗${t.fails}`}</div>
          </div>
        ))}
      </div>
    </Frame>
  );
}

// ───────────────────────── buffer-lab ─────────────────────────

type BState = { r: () => number; q: number[]; prod: number; cons: number; dropped: number; pBlocked: number; cBlocked: number; seq: number; hist: number[]; busy: number[] };
export function BufferLab() {
  const [producers, setProducers] = useState(2);
  const [consumers, setConsumers] = useState(1);
  const [cap, setCap] = useState(8);
  const [unbounded, setUnbounded] = useState(false);
  const [policy, setPolicy] = useState<"put" | "offer">("put");
  const sim = useSim<BState>(() => ({ r: rng(5), q: [], prod: 0, cons: 0, dropped: 0, pBlocked: 0, cBlocked: 0, seq: 0, hist: [], busy: [] }), (s) => {
    const limit = unbounded ? Infinity : cap;
    for (let p = 0; p < producers; p++) {
      if (s.r() < 0.5) {
        if (s.q.length < limit) { s.q.push(++s.seq); s.prod++; }
        else if (policy === "put") s.pBlocked++;
        else s.dropped++;
      }
    }
    for (let c = 0; c < consumers; c++) {
      if (!s.busy[c]) { if (s.q.length) { s.q.shift(); s.busy[c] = 2; } else s.cBlocked++; }
      else { s.busy[c]--; if (s.busy[c] === 0) s.cons++; }
    }
    s.hist.push(s.q.length); if (s.hist.length > 80) s.hist.shift();
  }, [producers, consumers, cap, unbounded, policy], 1);
  const s = sim.s;
  const shown = unbounded ? Math.max(cap, Math.min(s.q.length, 60)) : cap;
  return (
    <Frame title="Producers, consumers and a bounded queue" q="What happens when work arrives faster than it's processed, with and without a bound on the queue?"
      about="Each producer adds an item about every other tick; each consumer takes 3 ticks per item. Adjust the numbers, the capacity and what producers do when the queue is full."
      foot="With more production than consumption, an unbounded queue just grows (in a real system, until memory runs out). A bounded queue forces a choice: block the producers (backpressure: they slow to the consumers' pace) or drop and count. Consumers with nothing to do sleep in take() instead of spinning.">
      <div className="grid gap-3 sm:grid-cols-3">
        <Slider label="Producers" value={producers} min={1} max={4} onChange={setProducers} />
        <Slider label="Consumers" value={consumers} min={1} max={4} onChange={setConsumers} />
        <Slider label="Capacity" value={cap} min={2} max={20} onChange={setCap} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <Btn on={unbounded} onClick={() => setUnbounded((u) => !u)}>{unbounded ? "Unbounded queue" : "Bounded queue"}</Btn>
        {!unbounded && <Chips label="When full" value={policy} onChange={setPolicy} options={[["put", "put(): block"], ["offer", "offer(): drop"]]} />}
      </div>
      <div className="mt-2"><SimControls sim={sim} /></div>
      <div className="mt-3 rounded-xl border border-line bg-bg p-3">
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: shown }, (_, i) => <span key={i} className={cn("h-6 w-6 rounded border text-center text-[10px] leading-6", i < s.q.length ? "border-accent/60 bg-accent/20 text-accent" : "border-line text-faint")}>{i < s.q.length ? s.q[i] % 100 : ""}</span>)}
          {unbounded && s.q.length > shown && <span className="text-[12px] text-bad">+{s.q.length - shown} more…</span>}
        </div>
        <div className="mt-2 text-[11.5px] text-faint">queue length over time</div>
        <svg viewBox="0 0 240 40" className="w-full" style={{ height: 40 }} preserveAspectRatio="none">
          <polyline fill="none" stroke="var(--color-lld)" strokeWidth={1.6} vectorEffect="non-scaling-stroke" points={s.hist.map((v, i) => `${(i / 79) * 240},${40 - (Math.min(v, unbounded ? Math.max(40, ...s.hist) : cap) / (unbounded ? Math.max(40, ...s.hist) : cap)) * 38 - 1}`).join(" ")} />
        </svg>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Stat k="In queue" v={s.q.length} tone={unbounded && s.q.length > 40 ? "#ff8f8f" : undefined} />
        <Stat k="Produced" v={s.prod} />
        <Stat k="Consumed" v={s.cons} />
        <Stat k={policy === "put" ? "Producer waits" : "Dropped"} v={policy === "put" ? s.pBlocked : s.dropped} tone={(policy === "put" ? s.pBlocked : s.dropped) ? "#ffb454" : undefined} />
        <Stat k="Consumer idle" v={s.cBlocked} />
      </div>
    </Frame>
  );
}

// ───────────────────────── pool-lab ─────────────────────────

type PState = { r: () => number; workers: { left: number; id: number }[]; queue: number[]; rejected: number; callerRuns: number; callerBusy: number; done: number; seq: number; arrivedPaused: number };
export function PoolLab() {
  const [rate, setRate] = useState(60);
  const [queueCap, setQueueCap] = useState<"4" | "16" | "inf">("4");
  const [policy, setPolicy] = useState<"abort" | "caller">("abort");
  const CORE = 2, MAX = 5, WORK = 6;
  const sim = useSim<PState>(() => ({ r: rng(9), workers: [], queue: [], rejected: 0, callerRuns: 0, callerBusy: 0, done: 0, seq: 0, arrivedPaused: 0 }), (s) => {
    const qcap = queueCap === "inf" ? Infinity : +queueCap;
    // workers make progress
    for (const w of s.workers) if (w.left > 0) { w.left--; if (w.left === 0) s.done++; }
    // idle workers take from the queue; extra idle workers above core retire
    for (const w of s.workers) if (w.left === 0 && s.queue.length) { w.id = s.queue.shift()!; w.left = WORK; }
    s.workers = s.workers.filter((w, i) => w.left > 0 || i < CORE);
    // the caller runs a task itself under CallerRuns and can't submit meanwhile
    if (s.callerBusy > 0) { s.callerBusy--; if (s.callerBusy === 0) s.done++; if (s.r() * 100 < rate) s.arrivedPaused++; return; }
    if (s.r() * 100 < rate) {
      const id = ++s.seq;
      const idle = s.workers.find((w) => w.left === 0);
      if (s.workers.length < CORE) s.workers.push({ left: WORK, id });
      else if (idle && !s.queue.length) { idle.id = id; idle.left = WORK; }
      else if (s.queue.length < qcap) s.queue.push(id);
      else if (s.workers.length < MAX) s.workers.push({ left: WORK, id });
      else if (policy === "abort") s.rejected++;
      else { s.callerRuns++; s.callerBusy = WORK; }
    }
  }, [rate, queueCap, policy], 1);
  const s = sim.s;
  return (
    <Frame title="Inside a ThreadPoolExecutor" q="Core 2, max 5 threads. When does the pool add threads, queue tasks or reject them?"
      about="Tasks arrive at the chosen rate; each takes 6 ticks. Watch the order of decisions: core threads first, then the queue, then extra threads up to max, then the rejection policy."
      foot="Extra threads only appear once the queue is full, so with an unbounded queue the pool never grows past its 2 core threads and never rejects: the queue just grows. CallerRuns makes the submitting thread do the work itself, which pauses new submissions: backpressure.">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <Slider label="Arrival chance per tick" value={rate} min={10} max={100} step={10} onChange={setRate} fmt={(v) => `${v}%`} />
        <Chips label="Queue" value={queueCap} onChange={setQueueCap} options={[["4", "4"], ["16", "16"], ["inf", "unbounded"]]} />
        <Chips label="When saturated" value={policy} onChange={setPolicy} options={[["abort", "Abort"], ["caller", "CallerRuns"]]} />
      </div>
      <div className="mt-2"><SimControls sim={sim} /></div>
      <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-xl border border-line bg-bg p-3">
          <div className="text-[11px] uppercase tracking-wider text-faint">Threads ({s.workers.length} of max {MAX}; core {CORE})</div>
          <div className="mt-1.5 space-y-1">
            {Array.from({ length: MAX }, (_, i) => { const w = s.workers[i]; return (
              <div key={i} className="flex items-center gap-2 font-mono text-[11.5px]">
                <span className={cn("w-16", i < CORE ? "text-text" : "text-mute")}>{i < CORE ? "core" : "extra"} {i + 1}</span>
                {w ? <div className="h-3 flex-1 rounded bg-panel2"><div className="h-3 rounded bg-ok/70" style={{ width: `${w.left ? ((WORK - w.left) / WORK) * 100 : 0}%` }} /></div> : <span className="text-faint">not started</span>}
                {w && <span className="w-12 text-right text-faint">{w.left ? `#${w.id}` : "idle"}</span>}
              </div>
            ); })}
            <div className="flex items-center gap-2 font-mono text-[11.5px]"><span className="w-16 text-warn">caller</span>{s.callerBusy ? <div className="h-3 flex-1 rounded bg-panel2"><div className="h-3 rounded bg-warn/70" style={{ width: `${((WORK - s.callerBusy) / WORK) * 100}%` }} /></div> : <span className="text-faint">submitting</span>}</div>
          </div>
        </div>
        <div className="rounded-xl border border-line bg-bg p-3">
          <div className="text-[11px] uppercase tracking-wider text-faint">Work queue ({s.queue.length}{queueCap === "inf" ? "" : ` / ${queueCap}`})</div>
          <div className="mt-1.5 flex flex-wrap gap-1">{s.queue.slice(0, 48).map((id) => <span key={id} className="rounded border border-accent/50 bg-accent/10 px-1 font-mono text-[10px] text-accent">#{id}</span>)}{s.queue.length > 48 && <span className="text-[11px] text-bad">+{s.queue.length - 48}</span>}</div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat k="Completed" v={s.done} />
        <Stat k="Queued now" v={s.queue.length} tone={queueCap === "inf" && s.queue.length > 20 ? "#ff8f8f" : undefined} />
        <Stat k="Rejected" v={s.rejected} tone={s.rejected ? "#ff8f8f" : undefined} />
        <Stat k="Run by caller" v={s.callerRuns} tone={s.callerRuns ? "#ffb454" : undefined} />
      </div>
    </Frame>
  );
}

// ───────────────────────── timing-wheel ─────────────────────────

type Timer = { id: number; slot: number; rounds: number; label: string };
type WState = { cur: number; tick: number; timers: Timer[]; fired: string[]; seq: number };
const SLOTS = 12;
export function TimingWheel() {
  const sim = useSim<WState>(() => ({ cur: 0, tick: 0, timers: [], fired: [], seq: 0 }), (s) => {
    s.tick++; s.cur = (s.cur + 1) % SLOTS;
    const due = s.timers.filter((t) => t.slot === s.cur);
    for (const t of due) {
      if (t.rounds === 0) { s.fired.push(`tick ${s.tick}: ${t.label} fired`); s.timers = s.timers.filter((x) => x !== t); }
      else t.rounds--;
    }
    if (s.fired.length > 8) s.fired = s.fired.slice(-8);
  }, [], 1);
  const s = sim.s;
  const add = (d: number) => sim.act((st) => { const id = ++st.seq; st.timers.push({ id, slot: (st.cur + d) % SLOTS, rounds: Math.floor((d - 1) / SLOTS), label: `T${id} (+${d})` }); });
  const cancel = (id: number) => sim.act((st) => { st.timers = st.timers.filter((t) => t.id !== id); st.fired.push(`T${id} cancelled (O(1) removal)`); });
  const R = 92, C = 120;
  return (
    <Frame title="A hashed timing wheel" q="How can a server keep millions of timeouts and still add, cancel and fire each one in constant time?"
      about="12 slots, one tick each. A timer due in d ticks goes into slot (current + d) mod 12 with rounds = how many full turns it must wait. Add timers, cancel one by clicking it, and step the wheel."
      foot="Adding and cancelling never search or sort: you index straight into a slot. Each tick only looks at one slot. Timers further away than one turn carry a rounds count and are skipped until it reaches zero. The cost is precision: nothing fires between ticks.">
      <div className="flex flex-wrap items-center gap-1.5">
        {[2, 5, 9, 15, 30].map((d) => <Btn key={d} onClick={() => add(d)}>+ timer in {d}</Btn>)}
      </div>
      <div className="mt-2"><SimControls sim={sim} stepLabel="Tick" /></div>
      <div className="mt-3 grid gap-3 lg:grid-cols-[260px_1fr]">
        <svg viewBox="0 0 240 240" className="mx-auto w-full max-w-[260px]">
          {Array.from({ length: SLOTS }, (_, i) => {
            const a = (i / SLOTS) * Math.PI * 2 - Math.PI / 2;
            const x = C + Math.cos(a) * R, y = C + Math.sin(a) * R;
            const here = s.timers.filter((t) => t.slot === i);
            return (
              <g key={i}>
                <circle cx={x} cy={y} r={17} fill={i === s.cur ? "rgba(200,245,71,.18)" : "#161a24"} stroke={i === s.cur ? "#c8f547" : "#3a4153"} strokeWidth={i === s.cur ? 2 : 1} />
                <text x={x} y={y - 3} textAnchor="middle" fontSize="9" fill="#9aa3b8">{i}</text>
                <text x={x} y={y + 8} textAnchor="middle" fontSize="9.5" fontWeight={700} fill={here.length ? "#ffb454" : "#3a4153"}>{here.length ? `${here.length}⏱` : "·"}</text>
              </g>
            );
          })}
          <line x1={C} y1={C} x2={C + Math.cos((s.cur / SLOTS) * Math.PI * 2 - Math.PI / 2) * (R - 22)} y2={C + Math.sin((s.cur / SLOTS) * Math.PI * 2 - Math.PI / 2) * (R - 22)} stroke="#c8f547" strokeWidth={2} />
          <text x={C} y={C + 4} textAnchor="middle" fontSize="11" fill="#e6ebf5">tick {s.tick}</text>
        </svg>
        <div className="space-y-2">
          <div className="rounded-xl border border-line bg-bg p-2.5">
            <div className="text-[11px] uppercase tracking-wider text-faint">Pending timers (click to cancel)</div>
            <div className="mt-1 flex flex-wrap gap-1">{s.timers.length ? s.timers.map((t) => <button key={t.id} onClick={() => cancel(t.id)} className="rounded border border-warn/40 px-1.5 py-0.5 font-mono text-[11px] text-warn hover:bg-warn/10">{t.label} · slot {t.slot}{t.rounds ? ` · rounds ${t.rounds}` : ""}</button>) : <span className="text-[12px] text-faint">none</span>}</div>
          </div>
          <div className="min-h-[90px] rounded-xl border border-line bg-panel2/40 p-2 font-mono text-[11.5px] text-ok">{s.fired.length ? s.fired.map((f, i) => <div key={i} className={f.includes("cancel") ? "text-mute" : ""}>{f}</div>) : <span className="text-faint">Add a few timers, then press Play.</span>}</div>
        </div>
      </div>
    </Frame>
  );
}
