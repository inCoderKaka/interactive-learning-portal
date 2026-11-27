"use client";
/** Caching visuals: four eviction policies on the same request stream, and a cache stampede simulator. */
import { useMemo, useState } from "react";
import { Chips, Frame, Predict, SimControls, Slider, Spark, Stat, ms, pct, rng, useSim } from "./kit";
import { cn } from "../../ui";

// ───────── eviction race ─────────
type Work = "zipf" | "scan" | "shift";
const ITEMS = 500, N = 6000, SCAN_AT = 2500, SCAN_LEN = 600;
function stream(work: Work): number[] {
  const r = rng(5);
  const w = Array.from({ length: ITEMS }, (_, i) => 1 / (i + 1));
  const total = w.reduce((a, b) => a + b, 0);
  const cdf: number[] = []; let acc = 0;
  for (const x of w) { acc += x / total; cdf.push(acc); }
  const pick = () => { const u = r(); let lo = 0, hi = ITEMS - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (cdf[m] < u) lo = m + 1; else hi = m; } return lo; };
  const out: number[] = [];
  let scanned = 0;
  for (let i = 0; i < N; i++) {
    // during the scan, every other request is a one-off item from a batch job; users keep browsing meanwhile
    if (work === "scan" && i >= SCAN_AT && i < SCAN_AT + SCAN_LEN * 2 && i % 2 === 0) { out.push(10_000 + scanned++); continue; }
    const rank = pick();
    out.push(work === "shift" ? (rank + Math.floor(i / 1500) * 137) % ITEMS : rank); // popularity moves every 1,500 requests
  }
  return out;
}
type Pol = "fifo" | "lru" | "lfu" | "tiny";
const PNAME: Record<Pol, string> = { fifo: "FIFO", lru: "LRU", lfu: "LFU", tiny: "LRU + TinyLFU admission" };
const PCOL: Record<Pol, string> = { fifo: "#9096ad", lru: "#7aa7ff", lfu: "#ffb454", tiny: "#4fd1c5" };
type Cache = { pol: Pol; map: Map<number, number>; hits: number; seen: number; window: boolean[]; series: number[] };

function access(c: Cache, k: number, cap: number, freq: Map<number, number>) {
  const user = k < 10_000; // only user traffic is scored; the batch job's one-off reads are not
  if (user) c.seen++;
  const hit = c.map.has(k);
  if (hit) {
    if (c.pol === "lru" || c.pol === "tiny") { c.map.delete(k); c.map.set(k, 0); } // move to most-recent end
    if (c.pol === "lfu") c.map.set(k, c.map.get(k)! + 1);
    if (user) c.hits++;
  } else {
    if (c.map.size >= cap) {
      let victim: number;
      if (c.pol === "lfu") { let best = Infinity; victim = -1; for (const [key, n] of c.map) if (n < best) { best = n; victim = key; } }
      else victim = c.map.keys().next().value!; // oldest inserted (FIFO) or least recently used (LRU)
      if (c.pol === "tiny" && (freq.get(k) ?? 0) <= (freq.get(victim) ?? 0)) { if (user) record(c, false); return; } // not admitted
      c.map.delete(victim);
    }
    c.map.set(k, c.pol === "lfu" ? 1 : 0);
  }
  if (user) record(c, hit);
}
function record(c: Cache, hit: boolean) {
  c.window.push(hit); if (c.window.length > 300) c.window.shift();
  if (c.seen % 40 === 0) c.series.push(c.window.filter(Boolean).length / c.window.length);
}

export function EvictionRace() {
  const [work, setWork] = useState<Work>("scan");
  const [cap, setCap] = useState(50);
  const reqs = useMemo(() => stream(work), [work]);
  const sim = useSim(() => ({ i: 0, freq: new Map<number, number>(), caches: (["fifo", "lru", "lfu", "tiny"] as Pol[]).map((pol) => ({ pol, map: new Map(), hits: 0, seen: 0, window: [], series: [] }) as Cache) }), (s) => {
    if (s.i >= reqs.length) return;
    const k = reqs[s.i++];
    s.freq.set(k, (s.freq.get(k) ?? 0) + 1);
    if (s.i % (cap * 10) === 0) for (const [key, n] of s.freq) s.freq.set(key, n >> 1); // ageing, as TinyLFU does
    s.caches.forEach((c) => access(c, k, cap, s.freq));
  }, [work, cap], 12);
  const s = sim.s;
  return (
    <Frame title="Eviction policies, same requests" q="A cache holds 10% of the items. Which policy keeps the hit rate up when a one-off scan or a change in popularity comes along?"
      about="6,000 requests over 500 items with skewed popularity (a few items are very popular). All four caches see exactly the same requests. Charts show the hit rate of user requests (the last 300); in the scan workload a batch job reads 600 one-off items in between (the orange band)."
      foot={work === "scan" ? "During the scan, LRU and FIFO let the batch job's one-off items push out the popular ones, so users' hit rate drops and takes a while to recover; LFU and TinyLFU admission keep the popular items." : work === "shift" ? "When popularity moves, plain LFU clings to yesterday's favourites (their old counts are high), while recency-based policies adapt; TinyLFU ages its counts so it adapts too." : "With stable skewed popularity, frequency-aware policies edge ahead; all beat FIFO."}>
      <div className="space-y-3">
        <Predict q="A nightly job scans 600 items once each through the cache. Which policy's hit rate collapses most?" options={["LFU", "LRU", "TinyLFU admission"]} answer={1} why="Every scanned item becomes 'most recently used', so LRU evicts the genuinely popular items to make room for items nobody will ask for again." />
        <div className="grid gap-3 sm:grid-cols-2">
          <Chips label="Workload" value={work} options={[["zipf", "Skewed, stable"], ["scan", "Skewed + one-off scan"], ["shift", "Popularity shifts"]]} onChange={setWork} />
          <Slider label="Cache size (items)" value={cap} min={10} max={150} step={10} onChange={setCap} fmt={(v) => `${v} of ${ITEMS} (${Math.round((v / ITEMS) * 100)}%)`} />
        </div>
        <SimControls sim={sim} stepLabel="+500 requests" stepN={500} extra={<span className="num text-[12px] text-faint">{s.i.toLocaleString()} / {N.toLocaleString()} requests</span>} />
        <div className="grid gap-2 sm:grid-cols-2">
          {s.caches.map((c) => (
            <div key={c.pol} className="rounded-xl border border-line bg-bg p-3">
              <div className="flex items-baseline justify-between"><span className="text-[13px] font-semibold" style={{ color: PCOL[c.pol] }}>{PNAME[c.pol]}</span><span className="num text-[13px]">{c.seen ? `${Math.round((c.hits / c.seen) * 100)}% hits` : "–"}</span></div>
              <div className="mt-1"><Spark data={c.series} max={1} color={PCOL[c.pol]} label={`Hit rate over time, ${PNAME[c.pol]}`} /></div>
              {work === "scan" && <div className="relative mt-0.5 h-1.5 rounded bg-[#161a27]"><div className="absolute inset-y-0 rounded bg-warn/50" style={{ left: `${(SCAN_AT / N) * 100}%`, width: `${((SCAN_LEN * 2) / N) * 100}%` }} /></div>}
              <div className="mt-1 flex h-3 items-center gap-[2px] overflow-hidden">{c.window.slice(-60).map((h, i) => <span key={i} className={cn("h-2 w-1 shrink-0 rounded-sm", h ? "bg-ok" : "bg-bad/70")} />)}</div>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

// ───────── stampede ─────────
type Strat = "none" | "lock" | "swr" | "early";
const SNAME: Record<Strat, string> = { none: "No protection", lock: "Request coalescing (lock)", swr: "Stale-while-revalidate", early: "Probabilistic early refresh" };
type Q = { left: number; waiters: number[] };
type St = { t: number; carry: number; expiry: number; ttl: number; rebuild: Q | null; db: Q[]; lat: number[]; series: number[]; latSeries: number[]; maxDb: number; dbTotal: number; r: () => number; bucket: number[] };
const DT = 10, CAP = 20, TTL_MS = 4000, HIT = 1;

export function Stampede() {
  const [strat, setStrat] = useState<Strat>("none");
  const [rate, setRate] = useState(2000);
  const [cost, setCost] = useState(300);
  const sim = useSim<St>(() => ({ t: 0, carry: 0, expiry: 1500, ttl: TTL_MS, rebuild: null, db: [], lat: [], series: [], latSeries: [], maxDb: 0, dbTotal: 0, r: rng(3), bucket: [] }), (s) => {
    const finishRebuild = () => { s.expiry = s.t + s.ttl; s.rebuild = null; };
    // database: runs up to CAP queries at once; the rest wait their turn in a queue
    for (const q of s.db.slice(0, CAP)) q.left -= DT;
    const done = s.db.filter((q) => q.left <= 0);
    s.db = s.db.filter((q) => q.left > 0);
    for (const q of done) {
      for (const at of q.waiters) { s.lat.push(s.t - at); s.bucket.push(s.t - at); }
      if (q === s.rebuild || strat === "none") finishRebuild();
    }
    // arrivals this tick
    s.carry += (rate * DT) / 1000;
    const n = Math.floor(s.carry); s.carry -= n;
    const startQuery = (waiter?: number) => { const q: Q = { left: cost, waiters: waiter === undefined ? [] : [waiter] }; s.db.push(q); s.dbTotal++; return q; };
    for (let i = 0; i < n; i++) {
      const fresh = s.t < s.expiry;
      if (fresh) {
        s.lat.push(HIT); s.bucket.push(HIT);
        if (strat === "early" && !s.rebuild && s.t - cost * Math.log(s.r()) >= s.expiry) s.rebuild = startQuery(); // XFetch
        continue;
      }
      if (strat === "none") { startQuery(s.t); continue; }
      if (strat === "swr") { s.lat.push(HIT); s.bucket.push(HIT); if (!s.rebuild) s.rebuild = startQuery(); continue; }
      if (s.rebuild) s.rebuild.waiters.push(s.t); else s.rebuild = startQuery(s.t);
    }
    s.maxDb = Math.max(s.maxDb, s.db.length);
    if (s.lat.length > 4000) s.lat.splice(0, s.lat.length - 4000);
    s.t += DT;
    if (s.t % 100 === 0) {
      s.series.push(s.db.length); s.latSeries.push(pct(s.bucket, 99)); s.bucket = [];
      if (s.series.length > 120) { s.series.shift(); s.latSeries.shift(); }
    }
  }, [strat, rate, cost], 3);
  const s = sim.s;
  const state = s.rebuild ? "refreshing" : s.t < s.expiry ? "fresh" : "expired";
  return (
    <Frame title="Cache stampede" q="A key read thousands of times a second expires. How many database queries follow, and what do users feel?"
      about={`One hot key with a ${TTL_MS / 1000} s TTL. Rebuilding it is a database query; the database runs ${CAP} queries at a time and queues the rest. Pick a defence and press Play.`}
      foot={strat === "none" ? "Every request that arrives while the value is missing runs the same query. Hundreds of identical queries queue up at the database, which then spends seconds working through them, and the users behind them wait (watch the latency spike after each expiry)." : strat === "lock" ? "One request rebuilds; the others wait for its result. One query per expiry, but users arriving during the rebuild still wait for it." : strat === "swr" ? "Users always get an instant answer (briefly stale) while a single background query refreshes the key." : "A request shortly before expiry refreshes the key early, so it almost never expires at all."}>
      <div className="space-y-3">
        <Predict q={`${rate.toLocaleString()} requests/s, a ${cost} ms rebuild. With no protection, about how many identical queries start when the key expires?`} options={["1", `~${Math.round((rate * cost) / 1000).toLocaleString()} (more as the database slows)`, "Exactly 20"]} answer={1} why="Every request arriving during the rebuild window misses and starts its own query: rate × rebuild time, and the window stretches as the database overloads." />
        <Chips label="Defence" value={strat} options={(Object.keys(SNAME) as Strat[]).map((k) => [k, SNAME[k]])} onChange={setStrat} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Slider label="Reads of this key per second" value={rate} min={200} max={8000} step={200} onChange={setRate} fmt={(v) => v.toLocaleString()} />
          <Slider label="Rebuild (database query) time" value={cost} min={50} max={800} step={50} onChange={setCost} fmt={(v) => `${v} ms`} />
        </div>
        <SimControls sim={sim} stepLabel="+100 ms" stepN={10} extra={<span className={cn("ml-1 rounded-md border px-2 py-0.5 text-[11.5px]", state === "fresh" ? "border-ok/40 text-ok" : state === "refreshing" ? "border-hld/40 text-hld" : "border-bad/40 text-bad")}>key: {state}</span>} />
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-line bg-bg p-3">
            <div className="mb-1 text-[10.5px] uppercase tracking-wider text-faint">Database queries running + queued (dashed: {CAP} run at once)</div>
            <Spark data={s.series} max={Math.max(CAP * 3, ...s.series)} line={CAP} color="var(--color-bad)" h={70} label="Database queries in flight over time" />
          </div>
          <div className="rounded-xl border border-line bg-bg p-3">
            <div className="mb-1 text-[10.5px] uppercase tracking-wider text-faint">User p99 latency per 100 ms</div>
            <Spark data={s.latSeries} max={Math.max(500, ...s.latSeries)} color="var(--color-warn)" h={70} label="User p99 latency over time" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          <Stat k="Most queries at once" v={s.maxDb.toLocaleString()} tone={s.maxDb > CAP ? "var(--color-bad)" : "var(--color-ok)"} />
          <Stat k="Total queries" v={s.dbTotal.toLocaleString()} />
          <Stat k="User p99" v={ms(pct(s.lat, 99))} tone={pct(s.lat, 99) > 200 ? "var(--color-bad)" : undefined} />
          <Stat k="Time" v={`${(s.t / 1000).toFixed(1)} s`} />
        </div>
      </div>
    </Frame>
  );
}
