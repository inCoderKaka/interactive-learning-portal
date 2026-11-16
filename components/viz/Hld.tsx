"use client";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { Minus, Plus, Zap } from "lucide-react";
import { Button, cn } from "../ui";

function Frame({ title, about, children }: { title: string; about: string; children: ReactNode }) {
  return (
    <section className="card overflow-hidden">
      <div className="border-b border-line px-5 py-3.5">
        <div className="eyebrow">Play with it</div>
        <div className="display text-[17px] font-semibold">{title}</div>
        <p className="mt-1 text-[13px] text-mute">{about}</p>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}
const Stat = ({ k, v, tone }: { k: string; v: ReactNode; tone?: string }) => (
  <div className="rounded-xl border border-line bg-bg px-3 py-2">
    <div className="text-[11px] uppercase tracking-wider text-faint">{k}</div>
    <div className="num display text-lg font-semibold" style={{ color: tone }}>{v}</div>
  </div>
);
const Slider = ({ label, value, min, max, step = 1, onChange, fmt }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; fmt?: (v: number) => string }) => (
  <label className="block">
    <div className="mb-1 flex justify-between text-[12.5px]"><span className="text-mute">{label}</span><span className="num font-semibold">{fmt ? fmt(value) : value}</span></div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} className="w-full" />
  </label>
);

// ---------- consistent hashing ----------
const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 3600) / 10; };
const NODE_COLORS = ["#4fd1c5", "#7aa7ff", "#ffb454", "#ff8fb3", "#c8f547", "#b794f4", "#f6ad55"];
function ConsistentHash() {
  const [nodes, setNodes] = useState(["A", "B", "C"]);
  const [vn, setVn] = useState(1);
  const [moved, setMoved] = useState<number | null>(null);
  const keys = useMemo(() => Array.from({ length: 48 }, (_, i) => `key-${i * 7 + 3}`), []);
  const ring = useMemo(() => nodes.flatMap((n) => Array.from({ length: vn }, (_, v) => ({ n, a: hash(`${n}#${v}`) }))).sort((x, y) => x.a - y.a), [nodes, vn]);
  const owner = (k: string) => { if (!ring.length) return ""; const a = hash(k); return (ring.find((r) => r.a >= a) ?? ring[0]).n; };
  const prev = useRef<Record<string, string>>({});
  const assign = useMemo(() => Object.fromEntries(keys.map((k) => [k, owner(k)])), [ring, keys]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const p = prev.current;
    if (Object.keys(p).length) setMoved(keys.filter((k) => p[k] !== assign[k]).length);
    prev.current = assign;
  }, [assign, keys]);
  const colorOf = (n: string) => NODE_COLORS[(n.charCodeAt(0) - 65) % NODE_COLORS.length];
  const pt = (a: number, r: number) => [150 + r * Math.cos(((a - 90) * Math.PI) / 180), 150 + r * Math.sin(((a - 90) * Math.PI) / 180)];
  const counts = nodes.map((n) => keys.filter((k) => assign[k] === n).length);
  const naive = keys.length - Math.round(keys.length / Math.max(1, nodes.length));
  return (
    <Frame title="Consistent hashing ring" about="Keys walk clockwise to the next node. Add or remove a node and watch how few keys move; raise virtual nodes to even out the load.">
      <div className="grid gap-6 md:grid-cols-[300px_1fr]">
        <svg viewBox="0 0 300 300" className="mx-auto w-full max-w-[300px]" role="img" aria-label="Hash ring">
          <circle cx={150} cy={150} r={112} fill="none" stroke="#2a2f44" strokeWidth={1.5} />
          {keys.map((k) => { const [x, y] = pt(hash(k), 112); return <motion.circle key={k} cx={x} cy={y} r={3.2} animate={{ fill: colorOf(assign[k] || "A") }} transition={{ duration: 0.5 }} />; })}
          {ring.map((r, i) => { const [x, y] = pt(r.a, 112); const [lx, ly] = pt(r.a, 134); return (
            <g key={r.n + i}><motion.circle initial={{ r: 0 }} animate={{ r: vn > 1 ? 6 : 9 }} cx={x} cy={y} fill="#10121a" stroke={colorOf(r.n)} strokeWidth={2.5} />
              {vn <= 3 && <text x={lx} y={ly + 4} textAnchor="middle" className="font-mono text-[11px] font-bold" fill={colorOf(r.n)}>{r.n}</text>}</g>); })}
          <text x={150} y={146} textAnchor="middle" className="fill-mute text-[11px]">{keys.length} keys</text>
          <text x={150} y={162} textAnchor="middle" className="fill-faint text-[10px]">{nodes.length} nodes × {vn} vnode{vn > 1 ? "s" : ""}</text>
        </svg>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={nodes.length >= 7} onClick={() => setNodes((n) => [...n, String.fromCharCode(65 + [0, 1, 2, 3, 4, 5, 6].find((i) => !n.includes(String.fromCharCode(65 + i)))!)])}><Plus size={14} />Add node</Button>
            {nodes.map((n) => <Button key={n} size="sm" variant="ghost" disabled={nodes.length <= 1} onClick={() => setNodes((x) => x.filter((y) => y !== n))} style={{ color: colorOf(n) }}><Minus size={13} />{n}</Button>)}
          </div>
          <Slider label="Virtual nodes per server" value={vn} min={1} max={24} onChange={setVn} />
          <div className="space-y-1.5">
            {nodes.map((n, i) => (
              <div key={n} className="flex items-center gap-2 text-[12.5px]"><span className="w-4 font-mono font-bold" style={{ color: colorOf(n) }}>{n}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#1d2132]"><motion.div className="h-full rounded-full" animate={{ width: `${(counts[i] / keys.length) * 100}%` }} style={{ background: colorOf(n) }} /></div>
                <span className="num w-6 text-right text-mute">{counts[i]}</span></div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat k="Keys moved by last change" v={moved ?? "–"} tone="var(--color-accent)" />
            <Stat k="hash % N would move ≈" v={naive} tone="var(--color-bad)" />
          </div>
        </div>
      </div>
    </Frame>
  );
}

// ---------- token bucket ----------
function TokenBucket() {
  const [cap, setCap] = useState(8);
  const [rate, setRate] = useState(2);
  const [tokens, setTokens] = useState(8);
  const [log, setLog] = useState<{ id: number; ok: boolean }[]>([]);
  const [auto, setAuto] = useState(0);
  const tk = useRef(tokens);
  tk.current = tokens;
  useEffect(() => { const t = setInterval(() => setTokens((x) => Math.min(cap, x + rate / 10)), 100); return () => clearInterval(t); }, [cap, rate]);
  const fire = () => { const ok = tk.current >= 1; if (ok) setTokens((x) => x - 1); setLog((l) => [{ id: Date.now() + Math.random(), ok }, ...l].slice(0, 40)); };
  useEffect(() => { if (!auto) return; const t = setInterval(fire, 1000 / auto); return () => clearInterval(t); }, [auto]);
  useEffect(() => { setTokens((x) => Math.min(x, cap)); }, [cap]);
  const allowed = log.filter((l) => l.ok).length;
  return (
    <Frame title="Token bucket" about="Tokens refill at a steady rate up to the bucket's capacity. Each request spends one. Bursts are allowed until the bucket is empty.">
      <div className="grid gap-6 md:grid-cols-[180px_1fr]">
        <div className="mx-auto flex flex-col items-center">
          <div className="relative h-44 w-28 overflow-hidden rounded-b-3xl rounded-t-md border-2 border-line bg-bg">
            <motion.div className="absolute inset-x-0 bottom-0" animate={{ height: `${(tokens / cap) * 100}%` }} transition={{ duration: 0.15 }} style={{ background: "linear-gradient(180deg, rgb(200 245 71 / .85), rgb(79 209 197 / .5))" }} />
            <div className="absolute inset-0 grid place-items-center"><span className="num display text-2xl font-semibold mix-blend-difference">{Math.floor(tokens)}</span></div>
          </div>
          <div className="mt-2 text-[11px] text-faint">+{rate} tokens/s</div>
        </div>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Slider label="Capacity (burst size)" value={cap} min={1} max={20} onChange={setCap} />
            <Slider label="Refill rate (per second)" value={rate} min={0.5} max={10} step={0.5} onChange={setRate} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={fire}><Zap size={15} />Send request</Button>
            <Button onClick={() => { for (let i = 0; i < 10; i++) setTimeout(fire, i * 40); }}>Burst of 10</Button>
            {[0, 1, 3, 6].map((r) => <Button key={r} size="sm" variant={auto === r ? "soft" : "ghost"} className={cn("h-10", auto === r && "border-accent/50 text-accent")} onClick={() => setAuto(r)}>{r ? `${r}/s` : "Manual"}</Button>)}
          </div>
          <div className="flex h-9 flex-wrap items-center gap-1 overflow-hidden">
            {log.map((l) => <motion.span key={l.id} initial={{ scale: 0 }} animate={{ scale: 1 }} className="h-5 w-2.5 rounded-sm" style={{ background: l.ok ? "var(--color-ok)" : "var(--color-bad)" }} title={l.ok ? "200" : "429"} />)}
            {!log.length && <span className="text-[13px] text-faint">Send some requests…</span>}
          </div>
          <div className="grid grid-cols-3 gap-2"><Stat k="Allowed" v={allowed} tone="var(--color-ok)" /><Stat k="429s" v={log.length - allowed} tone="var(--color-bad)" /><Stat k="Sustained max" v={`${rate}/s`} /></div>
        </div>
      </div>
    </Frame>
  );
}

// ---------- quorum ----------
function Quorum() {
  const [n, setN] = useState(5), [w, setW] = useState(3), [r, setR] = useState(3), [down, setDown] = useState<number[]>([]);
  useEffect(() => { setW((x) => Math.min(x, n)); setR((x) => Math.min(x, n)); setDown((d) => d.filter((i) => i < n)); }, [n]);
  const up = n - down.length, strong = r + w > n, canW = up >= w, canR = up >= r;
  return (
    <Frame title="Quorum explorer (N, W, R)" about="A write succeeds after W acknowledgements, a read after R replies. If R + W > N every read overlaps the latest write. Click replicas to fail them.">
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <div className="flex flex-wrap justify-center gap-3 py-2">
            {Array.from({ length: n }, (_, i) => {
              const dead = down.includes(i), alive = Array.from({ length: n }, (_, k) => k).filter((k) => !down.includes(k));
              const inW = !dead && alive.indexOf(i) < w, inR = !dead && alive.slice().reverse().indexOf(i) < r;
              return (
                <button key={i} onClick={() => setDown((d) => (dead ? d.filter((x) => x !== i) : [...d, i]))} aria-label={`Replica ${i + 1} ${dead ? "down" : "up"}`}
                  className={cn("relative grid h-16 w-16 place-items-center rounded-2xl border-2 font-mono text-sm font-bold transition", dead ? "border-bad/40 bg-bad/10 text-bad line-through" : "border-line bg-panel2")}>
                  R{i + 1}
                  {inW && <span className="absolute -top-2 left-1 rounded bg-lld px-1 text-[9px] font-bold text-ink">W</span>}
                  {inR && <span className="absolute -top-2 right-1 rounded bg-hld px-1 text-[9px] font-bold text-ink">R</span>}
                  {inW && inR && <span className="absolute -bottom-2 rounded bg-accent px-1 text-[9px] font-bold text-ink">overlap</span>}
                </button>
              );
            })}
          </div>
          <p className="mt-4 text-center text-[12px] text-faint">Worst case shown: writes land on the first live replicas, reads hit the last ones.</p>
        </div>
        <div className="space-y-3">
          <Slider label="N: replicas" value={n} min={1} max={7} onChange={setN} />
          <Slider label="W: write quorum" value={w} min={1} max={n} onChange={setW} />
          <Slider label="R: read quorum" value={r} min={1} max={n} onChange={setR} />
          <div className="grid grid-cols-2 gap-2">
            <Stat k={`R + W ${strong ? ">" : "≤"} N`} v={strong ? "Reads see latest write" : "Stale reads possible"} tone={strong ? "var(--color-ok)" : "var(--color-warn)"} />
            <Stat k="Failures tolerated" v={`write ${n - w} · read ${n - r}`} />
            <Stat k="Writes right now" v={canW ? "Available" : "Unavailable"} tone={canW ? "var(--color-ok)" : "var(--color-bad)"} />
            <Stat k="Reads right now" v={canR ? "Available" : "Unavailable"} tone={canR ? "var(--color-ok)" : "var(--color-bad)"} />
          </div>
        </div>
      </div>
    </Frame>
  );
}

// ---------- bloom filter ----------
function Bloom() {
  const M = 32, K = 3;
  const [bits, setBits] = useState<number[]>(Array(M).fill(0));
  const [added, setAdded] = useState<string[]>([]);
  const [word, setWord] = useState("google.com");
  const [probe, setProbe] = useState<{ idx: number[]; verdict: string; tone: string } | null>(null);
  const idx = (s: string) => Array.from({ length: K }, (_, k) => Math.floor((hash(s + "|" + k * 31) / 360) * M) % M);
  const add = () => { if (!word.trim()) return; const ix = idx(word); setBits((b) => b.map((v, i) => (ix.includes(i) ? 1 : v))); setAdded((a) => (a.includes(word) ? a : [...a, word])); setProbe({ idx: ix, verdict: `Added "${word}": set bits ${ix.join(", ")}`, tone: "var(--color-accent)" }); };
  const check = () => { const ix = idx(word), all = ix.every((i) => bits[i]); const really = added.includes(word);
    setProbe({ idx: ix, verdict: !all ? `"${word}" is definitely NOT in the set (a 0 bit proves it)` : really ? `"${word}" is probably in the set (and it is)` : `False positive: every bit is 1, but "${word}" was never added`, tone: !all ? "var(--color-ok)" : really ? "var(--color-hld)" : "var(--color-bad)" }); };
  const fill = bits.filter(Boolean).length / M;
  return (
    <Frame title="Bloom filter" about={`${M} bits, ${K} hash functions. Membership answers are "definitely not" or "probably yes". Add a few items, then test ones you never added.`}>
      <div className="flex flex-wrap gap-1.5">
        {bits.map((b, i) => <motion.div key={i} animate={{ backgroundColor: b ? "rgb(200 245 71 / .85)" : "#161926", scale: probe?.idx.includes(i) ? 1.18 : 1 }} className={cn("grid h-8 w-8 place-items-center rounded-md border font-mono text-[11px] font-bold", probe?.idx.includes(i) ? "border-white" : "border-line", b ? "text-ink" : "text-faint")}>{b}</motion.div>)}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <input value={word} onChange={(e) => setWord(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} aria-label="Item" className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-bg px-3 font-mono text-sm outline-none focus:border-accent/60" />
        <Button variant="primary" onClick={add}>Add</Button><Button onClick={check}>Might contain?</Button>
        <Button variant="ghost" onClick={() => { setBits(Array(M).fill(0)); setAdded([]); setProbe(null); }}>Reset</Button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">{["youtube.com", "maps.google.com", "example.org", "leetcode.com", "a.b", "zzz"].map((s) => <button key={s} onClick={() => setWord(s)} className="rounded-full border border-line px-2 py-0.5 font-mono text-[11px] text-mute hover:text-text">{s}</button>)}</div>
      <p className="mt-4 min-h-6 text-[14px] font-medium" style={{ color: probe?.tone }} aria-live="polite">{probe?.verdict ?? " "}</p>
      <div className="mt-3 grid grid-cols-3 gap-2"><Stat k="Items" v={added.length} /><Stat k="Bits set" v={`${Math.round(fill * 100)}%`} /><Stat k="False-positive rate ≈" v={`${(Math.pow(fill, K) * 100).toFixed(1)}%`} tone="var(--color-warn)" /></div>
    </Frame>
  );
}

// ---------- capacity estimator ----------
const si = (n: number, units = ["", "K", "M", "B", "T"]) => { let i = 0; while (n >= 1000 && i < units.length - 1) { n /= 1000; i++; } return `${n >= 100 ? Math.round(n) : n.toFixed(1)}${units[i]}`; };
const bytes = (n: number) => si(n, ["B", "KB", "MB", "GB", "TB", "PB", "EB"]).replace(/(\d)([KMGTPE]?B)$/, "$1 $2");
function Estimator() {
  const [dau, setDau] = useState(8), [acts, setActs] = useState(10), [ratio, setRatio] = useState(20), [size, setSize] = useState(3), [peak, setPeak] = useState(3), [years, setYears] = useState(5);
  const users = Math.pow(10, dau), objBytes = Math.pow(10, size);
  const reads = users * acts, writes = reads / ratio, rqps = reads / 86400, wqps = writes / 86400;
  const perDay = writes * objBytes, total = perDay * 365 * years * 3;
  const servers = Math.ceil((rqps * peak) / 10000);
  return (
    <Frame title="Back-of-the-envelope calculator" about="Drag the assumptions and watch the numbers that actually drive design decisions. Say each assumption out loud in the interview.">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <Slider label="Daily active users" value={dau} min={4} max={9.5} step={0.5} onChange={setDau} fmt={(v) => si(Math.pow(10, v))} />
          <Slider label="Reads per user per day" value={acts} min={1} max={100} onChange={setActs} />
          <Slider label="Read : write ratio" value={ratio} min={1} max={200} onChange={setRatio} fmt={(v) => `${v} : 1`} />
          <Slider label="Size of one written object" value={size} min={2} max={7} step={0.5} onChange={setSize} fmt={(v) => bytes(Math.pow(10, v))} />
          <Slider label="Peak multiplier" value={peak} min={1} max={10} onChange={setPeak} fmt={(v) => `${v}×`} />
          <Slider label="Retention (years)" value={years} min={1} max={10} onChange={setYears} />
        </div>
        <div className="grid grid-cols-2 content-start gap-2">
          <Stat k="Read QPS (avg)" v={si(rqps)} tone="var(--color-hld)" /><Stat k="Read QPS (peak)" v={si(rqps * peak)} tone="var(--color-hld)" />
          <Stat k="Write QPS (avg)" v={si(wqps)} tone="var(--color-lld)" /><Stat k="Write QPS (peak)" v={si(wqps * peak)} tone="var(--color-lld)" />
          <Stat k="New data per day" v={bytes(perDay)} /><Stat k={`${years} yr, 3× replicated`} v={bytes(total)} />
          <Stat k="Read bandwidth" v={`${bytes(rqps * objBytes)}/s`} /><Stat k="App servers at peak (10k QPS each)" v={servers} />
          <div className="col-span-2 rounded-xl border border-accent/30 bg-accent/5 p-3 text-[13px] leading-relaxed text-[#dfe7c4]">
            {total > 5e13 ? "Storage exceeds a single node by far: you must partition the data. " : "Storage fits on one replicated node: partitioning is optional for now. "}
            {rqps * peak > 50000 ? "Read load demands caching and replicas. " : "Read load is modest: a cache is a latency choice, not a necessity. "}
            {wqps * peak > 5000 ? "Write rate is beyond a single primary: shard writes or use an LSM/wide-column store." : "A single primary database can absorb these writes."}
          </div>
        </div>
      </div>
    </Frame>
  );
}

// ---------- load balancer ----------
function LoadBalancer() {
  const N = 5;
  const [algo, setAlgo] = useState<"rr" | "random" | "least" | "p2c">("rr");
  const [load, setLoad] = useState<number[]>(Array(N).fill(0));
  const [slow, setSlow] = useState(2);
  const [peakMax, setPeakMax] = useState(0);
  const rr = useRef(0), ld = useRef(load);
  ld.current = load;
  useEffect(() => { setLoad(Array(N).fill(0)); setPeakMax(0); }, [algo, slow]);
  useEffect(() => {
    const t = setInterval(() => {
      const L = ld.current;
      let pick = 0;
      if (algo === "rr") pick = rr.current++ % N;
      else if (algo === "random") pick = Math.floor(Math.random() * N);
      else if (algo === "least") pick = L.indexOf(Math.min(...L));
      else { const a = Math.floor(Math.random() * N), b = Math.floor(Math.random() * N); pick = L[a] <= L[b] ? a : b; }
      setLoad((x) => { const y = x.map((v, i) => (i === pick ? v + 1 : v)); setPeakMax((m) => Math.max(m, ...y)); return y; });
      setTimeout(() => setLoad((x) => x.map((v, i) => (i === pick ? Math.max(0, v - 1) : v))), pick === slow ? 2600 : 700);
    }, 170);
    return () => clearInterval(t);
  }, [algo, slow]);
  const NAMES = { rr: "Round robin", random: "Random", least: "Least connections", p2c: "Power of two choices" };
  return (
    <Frame title="Load balancing strategies" about="One backend is slow (click a server to move the slowness). Compare how each strategy copes with in-flight requests piling up.">
      <div className="mb-4 flex flex-wrap gap-2">{(Object.keys(NAMES) as (keyof typeof NAMES)[]).map((k) => <Button key={k} size="sm" variant={algo === k ? "primary" : "soft"} onClick={() => setAlgo(k)}>{NAMES[k]}</Button>)}</div>
      <div className="flex h-44 items-end justify-around gap-3 rounded-xl border border-line bg-bg p-4">
        {load.map((v, i) => (
          <button key={i} onClick={() => setSlow(i)} className="flex h-full flex-1 flex-col items-center justify-end gap-2" aria-label={`Server ${i + 1}${i === slow ? " (slow)" : ""}`}>
            <span className="num text-[12px] text-mute">{v}</span>
            <motion.div animate={{ height: `${Math.min(100, v * 7)}%` }} className="w-full max-w-14 rounded-t-lg" style={{ background: v > 10 ? "var(--color-bad)" : i === slow ? "var(--color-warn)" : "var(--color-dsa)", minHeight: 4 }} />
            <span className={cn("font-mono text-[11px]", i === slow ? "text-warn" : "text-faint")}>{i === slow ? "slow" : `s${i + 1}`}</span>
          </button>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2"><Stat k="In flight" v={load.reduce((a, b) => a + b, 0)} /><Stat k="Worst backlog seen" v={peakMax} tone={peakMax > 10 ? "var(--color-bad)" : "var(--color-ok)"} /><Stat k="Strategy" v={<span className="text-sm">{NAMES[algo]}</span>} /></div>
    </Frame>
  );
}

export const WIDGETS: Record<string, () => ReactNode> = {
  "consistent-hash": ConsistentHash, "token-bucket": TokenBucket, quorum: Quorum, bloom: Bloom, estimator: Estimator, "load-balancer": LoadBalancer,
};
