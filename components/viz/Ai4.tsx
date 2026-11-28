"use client";
// AI deep-pass visuals, part 4: data and classic models (req3). Loaded through components/viz/AiDeep.tsx.
import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { motion } from "motion/react";
import { Pause, Play, RotateCcw, StepForward } from "lucide-react";
import { Button } from "../ui";
import { AI, Chips, Frame, Slider, Stat, gauss, pct, rand } from "./ai-kit";

const LIME = "#c8f547";
const MUTE = "#5d637c";
const RED = "#ff8fa3";
const BLUE = "#7cc4ff";
const CLS = [AI, LIME, BLUE, "#f5b547", RED];

type Pt = { x: number; y: number; c: number };
const sig = (z: number) => 1 / (1 + Math.exp(-z));

/** Run a callback on an interval while `on` is true. */
function useTicker(on: boolean, ms: number, f: () => void) {
  const ref = useRef(f);
  ref.current = f;
  useEffect(() => { if (!on) return; const t = setInterval(() => ref.current(), ms); return () => clearInterval(t); }, [on, ms]);
}

// ---------- feature hashing ----------

const CITIES = "Tokyo Delhi Shanghai Dhaka Cairo Mumbai Beijing Osaka Chongqing Karachi Istanbul Kinshasa Lagos Manila Tianjin Guangzhou Lahore Moscow Shenzhen Bangalore Paris Bogota Jakarta Chennai Lima Bangkok Seoul Nagoya Hyderabad London Tehran Chicago Chengdu Nanjing Wuhan Luanda Ahmedabad Riyadh Baghdad Santiago Surat Madrid Suzhou Pune Houston Dallas Toronto Miami Belo Atlanta Singapore Philadelphia Barcelona Johannesburg Sydney Berlin Rome Kyiv Lisbon Dublin Oslo Vienna Prague Zurich Warsaw Athens Budapest Hamburg Munich Milan Naples Seville Porto Accra Nairobi".split(" ");
const fnv = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

function FeatureHashing() {
  const [b, setB] = useState(64);
  const [n, setN] = useState(40);
  const items = CITIES.slice(0, n);
  const buckets = useMemo(() => { const m = new Map<number, string[]>(); for (const c of items) { const k = fnv(c) % b; m.set(k, [...(m.get(k) ?? []), c]); } return m; }, [items, b]);
  const shared = items.filter((c) => (buckets.get(fnv(c) % b)?.length ?? 0) > 1).length;
  const [hover, setHover] = useState<number | null>(null);
  const cols = Math.min(b, 32), rows = Math.ceil(b / cols), cell = 560 / cols;
  const drive = () => [
    { say: "Forty city names hashed into sixty-four buckets: some buckets already hold two cities. Those cities will share one learned weight.", act: () => { setN(40); setB(64); } },
    { say: "Shrink to sixteen buckets and most cities collide. Memory is tiny, but the model can no longer tell many cities apart.", act: () => setB(16) },
    { say: "With five hundred and twelve buckets, collisions become rare, at the cost of a bigger embedding table.", act: () => setB(512) },
  ];
  return (
    <Frame title="The hashing trick: buckets and collisions" about="Each category (a city name) is hashed into one of B buckets; each bucket gets one weight or embedding. Fewer buckets save memory but make unrelated values share a slot." drive={drive}>
      <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
        <Slider label="Buckets B" value={Math.log2(b)} min={2} max={10} onChange={(v) => setB(2 ** v)} fmt={() => `${b}`} />
        <Slider label="Distinct values n" value={n} min={5} max={CITIES.length} onChange={setN} />
      </div>
      <svg viewBox={`0 0 560 ${Math.max(40, rows * Math.min(cell, 34) + 4)}`} className="mt-3 w-full rounded-xl border border-line bg-bg" role="img" aria-label="Hash buckets">
        {Array.from({ length: b }, (_, k) => {
          const cnt = buckets.get(k)?.length ?? 0, x = (k % cols) * cell, y = Math.floor(k / cols) * Math.min(cell, 34);
          return <rect key={k} x={x + 1} y={y + 2} width={cell - 2} height={Math.min(cell, 34) - 2} rx={3} fill={cnt === 0 ? "#171b29" : cnt === 1 ? AI : "var(--color-bad)"} opacity={cnt === 0 ? 1 : cnt === 1 ? 0.55 : 0.85} onMouseEnter={() => setHover(k)} onMouseLeave={() => setHover(null)} />;
        })}
      </svg>
      <p className="mt-1 min-h-[1.4em] text-[12.5px] text-mute">{hover !== null ? `Bucket ${hover}: ${(buckets.get(hover) ?? ["empty"]).join(", ")}` : "Hover a bucket to see which values landed in it. Red buckets hold more than one value."}</p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <Stat k="Values sharing a bucket" v={`${shared} / ${n}`} tone={shared ? "var(--color-bad)" : LIME} sub={pct(shared / n)} />
        <Stat k="Expected (≈1 − e^(−n/B))" v={pct(1 - Math.exp(-(n - 1) / b))} />
        <Stat k="Memory (64-d float32)" v={`${((b * 64 * 4) / 1024).toFixed(0)} KB`} sub="buckets × dims × 4 bytes" />
      </div>
    </Frame>
  );
}

// ---------- least squares ----------

const LS0: [number, number][] = [[1, 2.1], [2, 2.9], [3, 3.6], [4, 4.8], [5, 5.1], [6, 6.3], [7, 6.8], [8, 8.2]];
function olsFit(p: [number, number][]) {
  const n = p.length, mx = p.reduce((a, q) => a + q[0], 0) / n, my = p.reduce((a, q) => a + q[1], 0) / n;
  const sxy = p.reduce((a, q) => a + (q[0] - mx) * (q[1] - my), 0), sxx = p.reduce((a, q) => a + (q[0] - mx) ** 2, 0);
  const m = sxy / (sxx || 1);
  return { m, c: my - m * mx };
}

function LeastSquares() {
  const [pts, setPts] = useState(LS0);
  const [manual, setManual] = useState(false);
  const [m, setM] = useState(0.6);
  const [c, setC] = useState(2);
  const [drag, setDrag] = useState<number | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const fit = olsFit(pts);
  const line = manual ? { m, c } : fit;
  const sse = (l: { m: number; c: number }) => pts.reduce((a, [x, y]) => a + (y - (l.m * x + l.c)) ** 2, 0);
  const X = (x: number) => 30 + x * 48, Y = (y: number) => 230 - y * 22;
  const move = (e: React.PointerEvent) => {
    if (drag === null || !svg.current) return;
    const r = svg.current.getBoundingClientRect(), sx = 480 / r.width;
    const y = Math.max(0, Math.min(10, (230 - (e.clientY - r.top) * sx) / 22));
    setPts((p) => p.map((q, i) => (i === drag ? [q[0], +y.toFixed(2)] : q)));
  };
  const drive = () => [
    { say: "The best-fit line minimises the total area of these squares, one for each point's vertical error.", act: () => { setPts(LS0); setManual(false); } },
    { say: "Drag one point far away and the line swings toward it: a single outlier's square is huge, so squared error lets it dominate.", act: () => setPts((p) => p.map((q, i) => (i === 7 ? [8, 1] : q))) },
    { say: "Switch to a manual line. Any other line has more total square area than least squares.", act: () => { setManual(true); setM(0.6); setC(2); } },
  ];
  return (
    <Frame title="Least squares: minimising the squares" about="Drag points up or down. Each shaded square is a residual squared; least squares picks the line with the smallest total area. Switch to manual to try to beat it." drive={drive}>
      <div className="flex flex-wrap items-center gap-2">
        <Chips value={manual ? 1 : 0} onChange={(v) => setManual(!!v)} options={[{ id: 0, label: "Least-squares line" }, { id: 1, label: "Your line" }]} />
        <Button size="sm" onClick={() => setPts(LS0)}><RotateCcw size={14} />Reset points</Button>
      </div>
      {manual && <div className="mt-2 grid gap-x-4 sm:grid-cols-2"><Slider label="Slope" value={m} min={-0.5} max={2} step={0.01} onChange={setM} fmt={(v) => v.toFixed(2)} /><Slider label="Intercept" value={c} min={-2} max={6} step={0.05} onChange={setC} fmt={(v) => v.toFixed(2)} /></div>}
      <svg ref={svg} viewBox="0 0 480 250" className="mt-3 w-full touch-none rounded-xl border border-line bg-bg" onPointerMove={move} onPointerUp={() => setDrag(null)} onPointerLeave={() => setDrag(null)} role="img" aria-label="Points and fitted line">
        {pts.map(([x, y], i) => { const r = y - (line.m * x + line.c), s = Math.abs(r) * 22; return <rect key={`s${i}`} x={X(x)} y={r > 0 ? Y(y) : Y(y) - s} width={Math.min(s, 120)} height={s} fill={RED} opacity={0.18} stroke={RED} strokeOpacity={0.4} />; })}
        <line x1={X(0)} y1={Y(line.c)} x2={X(9.5)} y2={Y(line.m * 9.5 + line.c)} stroke={AI} strokeWidth={2.5} />
        {manual && <line x1={X(0)} y1={Y(fit.c)} x2={X(9.5)} y2={Y(fit.m * 9.5 + fit.c)} stroke={MUTE} strokeDasharray="5 4" />}
        {pts.map(([x, y], i) => <circle key={i} cx={X(x)} cy={Y(y)} r={7} fill={LIME} className="cursor-ns-resize" onPointerDown={(e) => { (e.target as Element).setPointerCapture?.(e.pointerId); setDrag(i); }} />)}
      </svg>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat k={manual ? "Your total square area" : "Total square area (SSE)"} v={sse(line).toFixed(2)} tone={AI} />
        <Stat k="Least-squares SSE" v={sse(fit).toFixed(2)} tone={LIME} sub="the minimum possible" />
        <Stat k="Line" v={`y = ${line.m.toFixed(2)}x + ${line.c.toFixed(2)}`} />
      </div>
    </Frame>
  );
}

// ---------- logistic regression boundary ----------

type LData = "separable" | "overlap" | "xor" | "xor-cross";
function logData(kind: LData): Pt[] {
  const r = rand(kind.length * 13 + 1), out: Pt[] = [];
  for (let i = 0; i < 80; i++) {
    const c = i % 2;
    if (kind.startsWith("xor")) { const q = Math.floor(i / 2) % 2; const sx = q ? 1 : -1, sy = (c ? 1 : -1) * sx; out.push({ x: sx * 1.2 + gauss(r) * 0.45, y: sy * 1.2 + gauss(r) * 0.45, c }); }
    else { const d = kind === "separable" ? 1.6 : 0.7; out.push({ x: (c ? d : -d) + gauss(r) * 0.7, y: (c ? d : -d) * 0.6 + gauss(r) * 0.8, c }); }
  }
  return out;
}
const feats = (p: { x: number; y: number }, kind: LData) => (kind === "xor-cross" ? [p.x, p.y, p.x * p.y] : [p.x, p.y]);

function LogisticBoundary() {
  const [kind, setKind] = useState<LData>("overlap");
  const [lr, setLr] = useState(0.5);
  const [state, setState] = useState({ w: [0, 0, 0], b: 0, step: 0, losses: [] as number[] });
  const [run, setRun] = useState(false);
  const data = useMemo(() => logData(kind), [kind]);
  const reset = () => { setState({ w: [0, 0, 0], b: 0, step: 0, losses: [] }); setRun(false); };
  useEffect(reset, [kind]);
  const pred = (p: { x: number; y: number }, s = state) => sig(feats(p, kind).reduce((a, f, j) => a + f * s.w[j], s.b));
  const step = () => setState((s) => {
    const d = kind === "xor-cross" ? 3 : 2, gw = Array(3).fill(0);
    let gb = 0, loss = 0;
    for (const p of data) { const f = feats(p, kind), q = sig(f.reduce((a, v, j) => a + v * s.w[j], s.b)), e = q - p.c; f.forEach((v, j) => (gw[j] += (e * v) / data.length)); gb += e / data.length; loss -= (p.c ? Math.log(q + 1e-9) : Math.log(1 - q + 1e-9)) / data.length; }
    const w = s.w.map((v, j) => (j < d ? v - lr * (gw[j] + 1e-3 * v) : 0));
    return { w, b: s.b - lr * gb, step: s.step + 1, losses: [...s.losses, loss].slice(-200) };
  });
  useTicker(run, 60, () => { if (state.step >= 300) setRun(false); else step(); });
  const acc = data.filter((p) => (pred(p) > 0.5 ? 1 : 0) === p.c).length / data.length;
  const S = 46, O = 130, P = (x: number, y: number) => [O + x * S, O - y * S];
  const grid: { x: number; y: number; p: number }[] = [];
  for (let gx = -2.8; gx <= 2.8; gx += 0.2) for (let gy = -2.8; gy <= 2.8; gy += 0.2) grid.push({ x: gx, y: gy, p: pred({ x: gx, y: gy }) });
  const maxL = Math.max(0.8, ...state.losses);
  const drive = () => [
    { say: "Two overlapping classes. Each step of gradient descent nudges the weights by X transpose times p minus y. Watch the boundary settle.", act: () => { setKind("overlap"); setRun(true); }, settle: 2500 },
    { say: "XOR: no straight line can separate these. The loss gets stuck near 0.69, which is a coin flip.", act: () => { setKind("xor"); setTimeout(() => setRun(true), 50); }, settle: 2500 },
    { say: "Add one crossed feature, x times y, and the same linear model separates them easily. Feature engineering changed what 'linear' means.", act: () => { setKind("xor-cross"); setTimeout(() => setRun(true), 50); }, settle: 2500 },
  ];
  return (
    <Frame title="Logistic regression learning a boundary" about="Background shade is the predicted probability of the lime class; the line is where it equals 50%. Run gradient descent and watch the loss fall, or not." drive={drive}>
      <div className="flex flex-wrap items-center gap-2">
        <Chips value={kind} onChange={setKind} options={[{ id: "separable", label: "Separable" }, { id: "overlap", label: "Overlapping" }, { id: "xor", label: "XOR" }, { id: "xor-cross", label: "XOR + x·y feature" }]} />
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-[260px_1fr]">
        <svg viewBox="0 0 260 260" className="w-full rounded-xl border border-line bg-bg" role="img" aria-label="Decision boundary">
          {grid.map((g, i) => { const [x, y] = P(g.x, g.y); return <rect key={i} x={x - 4.6} y={y - 4.6} width={9.2} height={9.2} fill={g.p > 0.5 ? LIME : AI} opacity={Math.abs(g.p - 0.5) * 0.5} />; })}
          {data.map((p, i) => { const [x, y] = P(p.x, p.y); return <circle key={i} cx={x} cy={y} r={3.6} fill={p.c ? LIME : AI} stroke="#0b0d14" strokeWidth={0.8} />; })}
        </svg>
        <div className="space-y-3">
          <Slider label="Learning rate" value={lr} min={0.05} max={3} step={0.05} onChange={setLr} fmt={(v) => v.toFixed(2)} />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setRun((r) => !r)}>{run ? <Pause size={14} /> : <Play size={14} />}{run ? "Pause" : "Run"}</Button>
            <Button size="sm" onClick={step}><StepForward size={14} />One step</Button>
            <Button size="sm" onClick={reset}><RotateCcw size={14} />Reset</Button>
          </div>
          <svg viewBox="0 0 300 90" className="w-full rounded-xl border border-line bg-bg" role="img" aria-label="Loss curve">
            <line x1={0} x2={300} y1={90 - (0.693 / maxL) * 80} y2={90 - (0.693 / maxL) * 80} stroke={MUTE} strokeDasharray="3 3" />
            <path d={state.losses.map((l, i) => `${i ? "L" : "M"}${(i / 200) * 300},${90 - (l / maxL) * 80}`).join("")} fill="none" stroke={AI} strokeWidth={2} />
          </svg>
          <div className="grid grid-cols-3 gap-2">
            <Stat k="Step" v={state.step} />
            <Stat k="Log-loss" v={(state.losses.at(-1) ?? 0.693).toFixed(3)} tone={AI} sub="0.693 = coin flip" />
            <Stat k="Accuracy" v={pct(acc)} tone={LIME} />
          </div>
        </div>
      </div>
    </Frame>
  );
}

// ---------- decision tree split ----------

function treeData(): Pt[] {
  const r = rand(5), out: Pt[] = [];
  for (let i = 0; i < 60; i++) { const x = r() * 10, y = r() * 10; const c = (x > 6 && y > 3) || (x < 3 && y > 7) ? 1 : 0; out.push({ x, y, c: r() < 0.08 ? 1 - c : c }); }
  return out;
}
const gini = (pos: number, n: number) => (n ? 1 - (pos / n) ** 2 - (1 - pos / n) ** 2 : 0);

function TreeSplit() {
  const data = useMemo(() => treeData(), []);
  const [feat, setFeat] = useState<"x" | "y">("x");
  const [t, setT] = useState(5);
  const [crit, setCrit] = useState<"gini" | "entropy">("gini");
  const imp = (pos: number, n: number) => { if (!n) return 0; if (crit === "gini") return gini(pos, n); const p = pos / n; return p <= 0 || p >= 1 ? 0 : -(p * Math.log2(p) + (1 - p) * Math.log2(1 - p)); };
  const at = (th: number) => {
    const L = data.filter((p) => p[feat] < th), R = data.filter((p) => p[feat] >= th);
    const lp = L.filter((p) => p.c).length, rp = R.filter((p) => p.c).length, P = lp + rp;
    const parent = imp(P, data.length), w = (L.length * imp(lp, L.length) + R.length * imp(rp, R.length)) / data.length;
    return { L, R, lp, rp, parent, w, gain: parent - w, il: imp(lp, L.length), ir: imp(rp, R.length) };
  };
  const cur = at(t);
  const curve = useMemo(() => Array.from({ length: 101 }, (_, i) => ({ th: i / 10, g: at(i / 10).gain })), [feat, crit, data]); // eslint-disable-line react-hooks/exhaustive-deps
  const best = curve.reduce((a, b) => (b.g > a.g ? b : a));
  const S = 24, P = (x: number, y: number) => [10 + x * S, 250 - y * S];
  const maxG = Math.max(0.05, best.g);
  const drive = () => [
    { say: "Split on x at 5. Both sides are still mixed, so the impurity drops only a little.", act: () => { setFeat("x"); setT(5); } },
    { say: "The lower chart shows the gain for every threshold. Move to the peak, around 6: the right side becomes mostly lime.", act: () => setT(best.th) },
    { say: "Try the other feature. The tree checks every feature and every threshold, and keeps the single best split.", act: () => setFeat("y") },
  ];
  return (
    <Frame title="Choosing a decision-tree split" about="Pick a feature and slide the threshold. The tree scores each split by how much it lowers impurity (weighted by side size); the gain curve below shows every threshold at once." drive={drive}>
      <div className="flex flex-wrap items-center gap-3">
        <Chips label="Feature" value={feat} onChange={setFeat} options={[{ id: "x", label: "x (horizontal)" }, { id: "y", label: "y (vertical)" }]} />
        <Chips label="Impurity" value={crit} onChange={setCrit} options={[{ id: "gini", label: "Gini" }, { id: "entropy", label: "Entropy" }]} />
      </div>
      <Slider label="Threshold" value={t} min={0} max={10} step={0.1} onChange={setT} fmt={(v) => v.toFixed(1)} />
      <div className="mt-2 grid gap-3 md:grid-cols-[260px_1fr]">
        <svg viewBox="0 0 260 260" className="w-full rounded-xl border border-line bg-bg" role="img" aria-label="Data and split">
          {feat === "x" ? <rect x={P(t, 0)[0]} y={10} width={250 - P(t, 0)[0]} height={240} fill={LIME} opacity={0.06} /> : <rect x={10} y={10} width={240} height={P(0, t)[1] - 10} fill={LIME} opacity={0.06} />}
          {data.map((p, i) => { const [x, y] = P(p.x, p.y); return <circle key={i} cx={x} cy={y} r={4} fill={p.c ? LIME : AI} />; })}
          {feat === "x" ? <motion.line animate={{ x1: P(t, 0)[0], x2: P(t, 0)[0] }} y1={10} y2={250} stroke="#fff" strokeWidth={2} /> : <motion.line animate={{ y1: P(0, t)[1], y2: P(0, t)[1] }} x1={10} x2={250} stroke="#fff" strokeWidth={2} />}
        </svg>
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Stat k={feat === "x" ? "Left side" : "Below"} v={`${cur.lp}/${cur.L.length} lime`} sub={`${crit} ${cur.il.toFixed(3)}`} />
            <Stat k={feat === "x" ? "Right side" : "Above"} v={`${cur.rp}/${cur.R.length} lime`} sub={`${crit} ${cur.ir.toFixed(3)}`} />
            <Stat k="Parent impurity" v={cur.parent.toFixed(3)} />
            <Stat k="Gain" v={cur.gain.toFixed(3)} tone={Math.abs(cur.gain - best.g) < 1e-9 ? LIME : AI} sub={`best ${best.g.toFixed(3)} at ${best.th.toFixed(1)}`} />
          </div>
          <svg viewBox="0 0 300 80" className="w-full rounded-xl border border-line bg-bg" role="img" aria-label="Gain by threshold">
            <path d={curve.map((c, i) => `${i ? "L" : "M"}${c.th * 30},${75 - (c.g / maxG) * 65}`).join("")} fill="none" stroke={AI} strokeWidth={2} />
            <line x1={t * 30} x2={t * 30} y1={0} y2={80} stroke="#fff" opacity={0.4} />
            <circle cx={best.th * 30} cy={75 - (best.g / maxG) * 65} r={3.5} fill={LIME} />
          </svg>
        </div>
      </div>
    </Frame>
  );
}

// ---------- gradient boosting on residuals ----------

type Leaf = { lo: number; hi: number; v: number };
function regTree(xs: number[], rs: number[], depth: number, lo = 0, hi = 1): Leaf[] {
  const idx = xs.map((x, i) => i).filter((i) => xs[i] >= lo && xs[i] < hi);
  const mean = idx.length ? idx.reduce((a, i) => a + rs[i], 0) / idx.length : 0;
  if (depth === 0 || idx.length < 4) return [{ lo, hi, v: mean }];
  const sorted = idx.sort((a, b) => xs[a] - xs[b]);
  let best = { sse: Infinity, t: 0 }, sl = 0, sl2 = 0, tot = 0, tot2 = 0;
  for (const i of sorted) { tot += rs[i]; tot2 += rs[i] ** 2; }
  for (let k = 1; k < sorted.length; k++) {
    const v = rs[sorted[k - 1]]; sl += v; sl2 += v * v;
    const nl = k, nr = sorted.length - k, sr = tot - sl, sr2 = tot2 - sl2;
    const sse = sl2 - (sl * sl) / nl + sr2 - (sr * sr) / nr;
    if (sse < best.sse) best = { sse, t: (xs[sorted[k - 1]] + xs[sorted[k]]) / 2 };
  }
  return [...regTree(xs, rs, depth - 1, lo, best.t), ...regTree(xs, rs, depth - 1, best.t, hi)];
}
const evalTree = (t: Leaf[], x: number) => t.find((l) => x >= l.lo && x < l.hi)?.v ?? 0;
const bTruth = (x: number) => Math.sin(6 * x) * 0.8 + x * 1.2;

function BoostingResiduals() {
  const [eta, setEta] = useState(0.3);
  const [depth, setDepth] = useState(1);
  const [m, setM] = useState(0);
  const [run, setRun] = useState(false);
  const { tr, va } = useMemo(() => {
    const r = rand(17), mk = (n: number) => Array.from({ length: n }, () => { const x = r(); return { x, y: bTruth(x) + gauss(r) * 0.25 }; });
    return { tr: mk(50), va: mk(200) };
  }, []);
  const model = useMemo(() => {
    const xs = tr.map((p) => p.x), base = tr.reduce((a, p) => a + p.y, 0) / tr.length, trees: Leaf[][] = [];
    const F = tr.map(() => base), errs: { tr: number; va: number }[] = [];
    const Fv = va.map(() => base);
    const mse = (f: number[], d: { y: number }[]) => f.reduce((a, v, i) => a + (d[i].y - v) ** 2, 0) / d.length;
    errs.push({ tr: mse(F, tr), va: mse(Fv, va) });
    for (let k = 0; k < 150; k++) {
      const t = regTree(xs, tr.map((p, i) => p.y - F[i]), depth);
      trees.push(t);
      tr.forEach((p, i) => (F[i] += eta * evalTree(t, p.x)));
      va.forEach((p, i) => (Fv[i] += eta * evalTree(t, p.x)));
      errs.push({ tr: mse(F, tr), va: mse(Fv, va) });
    }
    return { base, trees, errs };
  }, [tr, va, eta, depth]);
  useTicker(run, 120, () => setM((x) => { if (x >= 150) { setRun(false); return x; } return x + 1; }));
  const predict = (x: number, upto: number) => model.base + model.trees.slice(0, upto).reduce((a, t) => a + eta * evalTree(t, x), 0);
  const X = (x: number) => 14 + x * 392, Y = (y: number) => 200 - y * 70;
  const curve = (f: (x: number) => number) => Array.from({ length: 201 }, (_, i) => i / 200).map((x, i) => `${i ? "L" : "M"}${X(x)},${Y(f(x))}`).join("");
  const last = m > 0 ? model.trees[m - 1] : null;
  const bestVa = model.errs.reduce((a, e, i) => (e.va < model.errs[a].va ? i : a), 0);
  const maxE = model.errs[0].va * 1.05;
  const drive = () => [
    { say: "We start from the average. Each new tree is a tiny correction fitted to the remaining errors, the residuals, and only a fraction eta of it is added.", act: () => { setM(1); setEta(0.3); setDepth(1); } },
    { say: "Add trees one after another: the ensemble's curve bends toward the data.", act: () => setRun(true), settle: 3500 },
    { say: "Deeper trees with a high learning rate fit the training data fast, and then validation error starts climbing: that's where early stopping would end training.", act: () => { setRun(false); setDepth(3); setEta(0.9); setM(150); } },
  ];
  return (
    <Frame title="Gradient boosting, one tree at a time" about="Lime points are training data. The purple curve is the ensemble so far; the dashed step function is the newest tree, fitted to the current residuals. The chart tracks training and validation error." drive={drive}>
      <div className="grid gap-x-4 gap-y-2 sm:grid-cols-3">
        <Slider label="Learning rate η" value={eta} min={0.05} max={1} step={0.05} onChange={setEta} fmt={(v) => v.toFixed(2)} />
        <Slider label="Tree depth" value={depth} min={1} max={4} onChange={setDepth} />
        <Slider label="Trees added" value={m} min={0} max={150} onChange={setM} />
      </div>
      <div className="mt-1 flex flex-wrap gap-2">
        <Button size="sm" onClick={() => setRun((r) => !r)}>{run ? <Pause size={14} /> : <Play size={14} />}{run ? "Pause" : "Add trees"}</Button>
        <Button size="sm" onClick={() => setM((x) => Math.min(150, x + 1))}><StepForward size={14} />Add one</Button>
        <Button size="sm" onClick={() => { setM(0); setRun(false); }}><RotateCcw size={14} />Reset</Button>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-[1.5fr_1fr]">
        <svg viewBox="0 0 420 230" className="w-full rounded-xl border border-line bg-bg" role="img" aria-label="Boosted fit">
          {tr.map((p, i) => { const y0 = Y(predict(p.x, m)); return <g key={i}><line x1={X(p.x)} x2={X(p.x)} y1={y0} y2={Y(p.y)} stroke={RED} opacity={0.35} /><circle cx={X(p.x)} cy={Y(p.y)} r={3.2} fill={LIME} /></g>; })}
          <path d={curve((x) => predict(x, m))} fill="none" stroke={AI} strokeWidth={2.5} />
          {last && <path d={curve((x) => predict(x, m - 1) + eta * evalTree(last, x))} fill="none" stroke="#fff" strokeOpacity={0.35} strokeDasharray="4 3" />}
        </svg>
        <svg viewBox="0 0 260 230" className="w-full rounded-xl border border-line bg-bg" role="img" aria-label="Error by number of trees">
          {(["tr", "va"] as const).map((k) => <path key={k} d={model.errs.map((e, i) => `${i ? "L" : "M"}${10 + (i / 150) * 240},${210 - Math.min(1, e[k] / maxE) * 195}`).join("")} fill="none" stroke={k === "tr" ? LIME : AI} strokeWidth={2} />)}
          <line x1={10 + (m / 150) * 240} x2={10 + (m / 150) * 240} y1={10} y2={210} stroke="#fff" opacity={0.3} />
          <circle cx={10 + (bestVa / 150) * 240} cy={210 - (model.errs[bestVa].va / maxE) * 195} r={4} fill={AI} />
          <text x={16} y={24} className="fill-faint text-[10px]"><tspan fill="var(--color-ai)">validation</tspan> · <tspan fill={LIME}>training</tspan> error</text>
        </svg>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat k="Training MSE" v={model.errs[m].tr.toFixed(3)} tone={LIME} />
        <Stat k="Validation MSE" v={model.errs[m].va.toFixed(3)} tone={AI} />
        <Stat k="Early-stopping point" v={`${bestVa} trees`} sub="lowest validation error" />
      </div>
    </Frame>
  );
}

// ---------- k-nearest neighbours ----------

function moonData(): Pt[] {
  const r = rand(21), out: Pt[] = [];
  for (let i = 0; i < 90; i++) {
    const c = i % 2, a = Math.PI * r();
    const x = c ? 1 - Math.cos(a) : Math.cos(a), y = c ? 0.5 - Math.sin(a) : Math.sin(a);
    out.push({ x: x + gauss(r) * 0.18, y: y + gauss(r) * 0.18, c });
  }
  return out;
}

function KnnBoundary() {
  const data = useMemo(() => moonData(), []);
  const [k, setK] = useState(5);
  const [q, setQ] = useState<{ x: number; y: number }>({ x: 0.5, y: 0.25 });
  const svg = useRef<SVGSVGElement>(null);
  const S = 90, OX = 110, OY = 160, P = (x: number, y: number) => [OX + x * S, OY - y * S];
  const nearest = (p: { x: number; y: number }) => data.map((d, i) => ({ i, d: (d.x - p.x) ** 2 + (d.y - p.y) ** 2 })).sort((a, b) => a.d - b.d).slice(0, k);
  const vote = (p: { x: number; y: number }) => nearest(p).reduce((a, n) => a + data[n.i].c, 0) / k;
  const cells = useMemo(() => { const out: { x: number; y: number; v: number }[] = []; for (let x = -1.2; x <= 2.2; x += 0.08) for (let y = -0.9; y <= 1.5; y += 0.08) out.push({ x, y, v: vote({ x, y }) }); return out; }, [k]); // eslint-disable-line react-hooks/exhaustive-deps
  const nn = nearest(q), qv = nn.reduce((a, n) => a + data[n.i].c, 0) / k;
  const click = (e: React.MouseEvent) => { if (!svg.current) return; const r = svg.current.getBoundingClientRect(), s = 420 / r.width; setQ({ x: ((e.clientX - r.left) * s - OX) / S, y: (OY - (e.clientY - r.top) * s) / S }); };
  const drive = () => [
    { say: "With k equal to one, every training point owns its own little territory, so the boundary is jagged and noisy points carve out islands.", act: () => setK(1) },
    { say: "With k equal to fifteen the vote smooths things out and the two moons are separated cleanly.", act: () => setK(15) },
    { say: "With k equal to seventy-five, the vote is dominated by far-away points and the boundary is too blunt: high bias.", act: () => setK(75) },
  ];
  return (
    <Frame title="k-nearest neighbours: the effect of k" about="Background colour is the class a kNN vote would predict at each spot. Click anywhere to place a query point and see its k nearest neighbours." drive={drive}>
      <Slider label="k (neighbours voting)" value={k} min={1} max={75} step={2} onChange={setK} />
      <svg ref={svg} viewBox="0 0 420 260" onClick={click} className="mt-2 w-full cursor-crosshair rounded-xl border border-line bg-bg" role="img" aria-label="kNN decision regions">
        {cells.map((c, i) => { const [x, y] = P(c.x, c.y); return <rect key={i} x={x - 3.7} y={y - 3.7} width={7.4} height={7.4} fill={c.v > 0.5 ? LIME : AI} opacity={0.12 + Math.abs(c.v - 0.5) * 0.25} />; })}
        {nn.map((n) => { const [x1, y1] = P(q.x, q.y), [x2, y2] = P(data[n.i].x, data[n.i].y); return <line key={n.i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#fff" opacity={0.35} />; })}
        {data.map((p, i) => { const [x, y] = P(p.x, p.y); return <circle key={i} cx={x} cy={y} r={3.4} fill={p.c ? LIME : AI} stroke="#0b0d14" strokeWidth={0.8} />; })}
        <circle cx={P(q.x, q.y)[0]} cy={P(q.x, q.y)[1]} r={6} fill="none" stroke="#fff" strokeWidth={2} />
      </svg>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat k="Query vote" v={`${Math.round(qv * k)} lime / ${k}`} tone={qv > 0.5 ? LIME : AI} sub={qv > 0.5 ? "predict lime" : "predict purple"} />
        <Stat k="Training accuracy" v={pct(data.filter((p) => (vote(p) > 0.5 ? 1 : 0) === p.c).length / data.length)} sub={k === 1 ? "always 100% at k = 1" : "includes the point itself"} />
        <Stat k="Regime" v={k <= 3 ? "High variance" : k >= 45 ? "High bias" : "Balanced"} />
      </div>
    </Frame>
  );
}

// ---------- k-means ----------

type KData = "blobs" | "unequal" | "moons";
function kData(kind: KData): { x: number; y: number }[] {
  const r = rand(kind.length * 7 + 3), out: { x: number; y: number }[] = [];
  if (kind === "moons") return moonData().map((p) => ({ x: p.x * 1.6 - 0.8, y: p.y * 1.6 - 0.2 }));
  const centres = kind === "blobs" ? [[-1.3, 1], [1.2, 1.1], [0, -1.1], [1.5, -1]] : [[-1, 0], [1.4, 0.8], [1.4, -0.8]];
  const spread = kind === "blobs" ? [0.35, 0.35, 0.35, 0.35] : [0.8, 0.18, 0.18];
  for (let i = 0; i < 120; i++) { const c = i % centres.length; out.push({ x: centres[c][0] + gauss(r) * spread[c], y: centres[c][1] + gauss(r) * spread[c] }); }
  return out;
}

function KMeans() {
  const [kind, setKind] = useState<KData>("blobs");
  const [k, setK] = useState(4);
  const [init, setInit] = useState<"random" | "bad" | "pp">("random");
  const [seed, setSeed] = useState(1);
  const data = useMemo(() => kData(kind), [kind]);
  const start = useMemo(() => {
    const r = rand(seed * 101 + k);
    if (init === "bad") return Array.from({ length: k }, (_, j) => ({ x: -1.8 + j * 0.15, y: 1.6 }));
    if (init === "random") return Array.from({ length: k }, () => ({ ...data[Math.floor(r() * data.length)] }));
    const C = [{ ...data[Math.floor(r() * data.length)] }];
    while (C.length < k) {
      const d2 = data.map((p) => Math.min(...C.map((c) => (p.x - c.x) ** 2 + (p.y - c.y) ** 2)));
      let u = r() * d2.reduce((a, b) => a + b, 0), i = 0;
      while (u > d2[i]) u -= d2[i++];
      C.push({ ...data[Math.min(i, data.length - 1)] });
    }
    return C;
  }, [data, k, init, seed]);
  const [st, setSt] = useState({ C: start, labels: data.map(() => -1), phase: "assign" as "assign" | "update", it: 0 });
  useEffect(() => setSt({ C: start, labels: data.map(() => -1), phase: "assign", it: 0 }), [start, data]);
  const [run, setRun] = useState(false);
  const step = () => setSt((s) => {
    if (s.phase === "assign") return { ...s, labels: data.map((p) => s.C.reduce((b, c, j) => ((p.x - c.x) ** 2 + (p.y - c.y) ** 2 < (p.x - s.C[b].x) ** 2 + (p.y - s.C[b].y) ** 2 ? j : b), 0)), phase: "update" };
    const C = s.C.map((c, j) => { const m = data.filter((_, i) => s.labels[i] === j); return m.length ? { x: m.reduce((a, p) => a + p.x, 0) / m.length, y: m.reduce((a, p) => a + p.y, 0) / m.length } : c; });
    return { ...s, C, phase: "assign", it: s.it + 1 };
  });
  useTicker(run, 450, () => { if (st.it > 15) setRun(false); else step(); });
  const inertia = st.labels[0] < 0 ? 0 : data.reduce((a, p, i) => a + (p.x - st.C[st.labels[i]].x) ** 2 + (p.y - st.C[st.labels[i]].y) ** 2, 0);
  const S = 70, P = (x: number, y: number) => [180 + x * S, 130 - y * S];
  const drive = () => [
    { say: "Four blobs, four centroids. Step: assign every point to its nearest centroid, then move each centroid to the middle of its points.", act: () => { setKind("blobs"); setK(4); setInit("random"); setRun(true); }, settle: 5000 },
    { say: "Start all centroids bunched in a corner: k-means can get stuck in a poor arrangement. This is why we use k-means plus plus and several restarts.", act: () => { setRun(false); setInit("bad"); setTimeout(() => setRun(true), 100); }, settle: 5000 },
    { say: "On two interlocking moons, k-means still cuts straight lines, because it only knows distance to a centre. Shapes like these need density-based clustering.", act: () => { setRun(false); setKind("moons"); setK(2); setInit("pp"); setTimeout(() => setRun(true), 100); }, settle: 4000 },
  ];
  return (
    <Frame title="k-means, step by step" about="Crosses are centroids. Each step alternates: assign points to the nearest centroid, then move centroids to their points' mean. Inertia (total squared distance) can only fall." drive={drive}>
      <div className="flex flex-wrap items-center gap-3">
        <Chips value={kind} onChange={setKind} options={[{ id: "blobs", label: "Blobs" }, { id: "unequal", label: "Unequal sizes" }, { id: "moons", label: "Moons" }]} />
        <Chips label="Start" value={init} onChange={setInit} options={[{ id: "random", label: "Random points" }, { id: "bad", label: "Bunched" }, { id: "pp", label: "k-means++" }]} />
      </div>
      <div className="mt-2 grid gap-x-4 sm:grid-cols-[1fr_auto]">
        <Slider label="k" value={k} min={2} max={6} onChange={setK} />
        <div className="flex flex-wrap items-end gap-2">
          <Button size="sm" onClick={() => setRun((r) => !r)}>{run ? <Pause size={14} /> : <Play size={14} />}{run ? "Pause" : "Run"}</Button>
          <Button size="sm" onClick={step}><StepForward size={14} />{st.phase === "assign" ? "Assign" : "Update"}</Button>
          <Button size="sm" onClick={() => { setRun(false); setSeed((s) => s + 1); }}><RotateCcw size={14} />Restart</Button>
        </div>
      </div>
      <svg viewBox="0 0 360 260" className="mt-3 w-full rounded-xl border border-line bg-bg" role="img" aria-label="k-means clustering">
        {data.map((p, i) => { const [x, y] = P(p.x, p.y), l = st.labels[i]; return <motion.circle key={i} cx={x} cy={y} r={3.4} animate={{ fill: l < 0 ? MUTE : CLS[l % CLS.length] }} />; })}
        {st.C.map((c, j) => { const [x, y] = P(c.x, c.y); return <motion.g key={j} animate={{ x, y }} transition={{ duration: 0.35 }}><path d="M-7,-7L7,7M-7,7L7,-7" stroke={CLS[j % CLS.length]} strokeWidth={4} /><path d="M-7,-7L7,7M-7,7L7,-7" stroke="#0b0d14" strokeWidth={1.2} /></motion.g>; })}
      </svg>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat k="Iteration" v={st.it} />
        <Stat k="Next step" v={st.phase === "assign" ? "Assign" : "Update"} />
        <Stat k="Inertia" v={inertia ? inertia.toFixed(1) : "—"} tone={AI} sub="sum of squared distances" />
      </div>
    </Frame>
  );
}

// ---------- PCA projection ----------

function PcaProjection() {
  const data = useMemo(() => { const r = rand(9); return Array.from({ length: 80 }, () => { const a = gauss(r) * 1.3, b = gauss(r) * 0.4; return { x: a * 0.85 - b * 0.5, y: a * 0.5 + b * 0.85 }; }); }, []);
  const [deg, setDeg] = useState(100);
  const th = (deg * Math.PI) / 180, u = [Math.cos(th), Math.sin(th)];
  const proj = data.map((p) => p.x * u[0] + p.y * u[1]);
  const variance = proj.reduce((a, v) => a + v * v, 0) / data.length;
  const total = data.reduce((a, p) => a + p.x * p.x + p.y * p.y, 0) / data.length;
  const sxx = data.reduce((a, p) => a + p.x * p.x, 0) / data.length, syy = data.reduce((a, p) => a + p.y * p.y, 0) / data.length, sxy = data.reduce((a, p) => a + p.x * p.y, 0) / data.length;
  const pc = (0.5 * Math.atan2(2 * sxy, sxx - syy) * 180) / Math.PI;
  const pcDeg = ((pc % 180) + 180) % 180;
  const curve = Array.from({ length: 181 }, (_, d) => { const t = (d * Math.PI) / 180; return sxx * Math.cos(t) ** 2 + 2 * sxy * Math.cos(t) * Math.sin(t) + syy * Math.sin(t) ** 2; });
  const S = 52, O = [150, 130], P = (x: number, y: number) => [O[0] + x * S, O[1] - y * S];
  const drive = () => [
    { say: "Project every point onto the white line. The spread of the projected points, their variance, is small in this direction.", act: () => setDeg(120) },
    { say: "Rotate the line to the first principal component: the projected spread is as large as it can be. That direction is the top eigenvector of the covariance matrix.", act: () => setDeg(Math.round(pcDeg)) },
    { say: "At ninety degrees from it is the second component, which holds the little variance that's left. Dropping it loses only a small fraction of the information.", act: () => setDeg(Math.round((pcDeg + 90) % 180)) },
  ];
  return (
    <Frame title="PCA: the direction of greatest spread" about="Rotate the white line. Each point drops onto it (thin lines); the chart shows how spread out the projected points are at every angle. PCA picks the angle with the most spread." drive={drive}>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1"><Slider label="Direction angle" value={deg} min={0} max={179} onChange={setDeg} fmt={(v) => `${v}°`} /></div>
        <Button size="sm" onClick={() => setDeg(Math.round(pcDeg))}>Snap to first component</Button>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-[300px_1fr]">
        <svg viewBox="0 0 300 260" className="w-full rounded-xl border border-line bg-bg" role="img" aria-label="Projection">
          <line x1={P(-u[0] * 4, -u[1] * 4)[0]} y1={P(-u[0] * 4, -u[1] * 4)[1]} x2={P(u[0] * 4, u[1] * 4)[0]} y2={P(u[0] * 4, u[1] * 4)[1]} stroke="#fff" strokeWidth={2} />
          {data.map((p, i) => { const [x, y] = P(p.x, p.y), [px, py] = P(proj[i] * u[0], proj[i] * u[1]); return <g key={i}><line x1={x} y1={y} x2={px} y2={py} stroke={MUTE} opacity={0.5} /><circle cx={x} cy={y} r={3} fill={AI} /><circle cx={px} cy={py} r={2.4} fill={LIME} /></g>; })}
        </svg>
        <div className="space-y-2">
          <svg viewBox="0 0 300 120" className="w-full rounded-xl border border-line bg-bg" role="img" aria-label="Variance by angle">
            <path d={curve.map((v, d) => `${d ? "L" : "M"}${d * (300 / 180)},${112 - (v / Math.max(...curve)) * 100}`).join("")} fill="none" stroke={AI} strokeWidth={2} />
            <line x1={deg * (300 / 180)} x2={deg * (300 / 180)} y1={0} y2={120} stroke="#fff" opacity={0.4} />
            <circle cx={pcDeg * (300 / 180)} cy={12} r={4} fill={LIME} />
          </svg>
          <div className="grid grid-cols-2 gap-2">
            <Stat k="Projected variance" v={variance.toFixed(2)} tone={AI} sub={`${pct(variance / total)} of total`} />
            <Stat k="First component at" v={`${pcDeg.toFixed(0)}°`} tone={LIME} sub="top eigenvector" />
          </div>
        </div>
      </div>
    </Frame>
  );
}

export const AI_WIDGETS_4: Record<string, ComponentType> = {
  "feature-hashing": FeatureHashing, "least-squares": LeastSquares, "logistic-boundary": LogisticBoundary, "tree-split": TreeSplit,
  "boosting-residuals": BoostingResiduals, "knn-boundary": KnnBoundary, kmeans: KMeans, "pca-projection": PcaProjection,
};
