"use client";
// AI deep-pass visuals, part 5: metrics, neural networks, PyTorch and CNNs (req3). Loaded through components/viz/AiDeep.tsx.
import { useMemo, useState, type ComponentType } from "react";
import { motion } from "motion/react";
import { ChevronDown, ChevronUp, RotateCcw, Shuffle, StepBack, StepForward } from "lucide-react";
import { Button, cn } from "../ui";
import { AI, Chips, Frame, Slider, Stat, gauss, pct, rand } from "./ai-kit";

const LIME = "#c8f547";
const MUTE = "#5d637c";
const GRID = "#2a2f44";
const RED = "#ff8fa3";
const BLUE = "#7cc4ff";
const sig = (z: number) => 1 / (1 + Math.exp(-z));
const logit = (p: number) => Math.log(p / (1 - p));

// ---------- calibration ----------

function calData(over: number) {
  const r = rand(3), out: { s: number; y: number }[] = [];
  for (let i = 0; i < 3000; i++) {
    const z = gauss(r) * 1.6 - 0.6, pTrue = sig(z), s = sig(z * over); // the model's logit is the true one times "over"
    out.push({ s, y: r() < pTrue ? 1 : 0 });
  }
  return out;
}
function pav(xs: { s: number; y: number }[]) {
  const sorted = [...xs].sort((a, b) => a.s - b.s);
  const blocks: { sum: number; n: number; lo: number; hi: number }[] = [];
  for (const p of sorted) {
    blocks.push({ sum: p.y, n: 1, lo: p.s, hi: p.s });
    while (blocks.length > 1 && blocks[blocks.length - 2].sum / blocks[blocks.length - 2].n > blocks[blocks.length - 1].sum / blocks[blocks.length - 1].n) {
      const b = blocks.pop()!, a = blocks.pop()!;
      blocks.push({ sum: a.sum + b.sum, n: a.n + b.n, lo: a.lo, hi: b.hi });
    }
  }
  return (s: number) => { const b = blocks.find((x) => s <= x.hi) ?? blocks[blocks.length - 1]; return Math.min(0.999, Math.max(0.001, b.sum / b.n)); };
}

function Calibration() {
  const [over, setOver] = useState(2.2);
  const [fix, setFix] = useState<"raw" | "temp" | "iso">("raw");
  const data = useMemo(() => calData(over), [over]);
  const T = useMemo(() => { let best = 1, bl = Infinity; for (let t = 0.3; t <= 4; t += 0.02) { const l = data.reduce((a, d) => { const p = sig(logit(Math.min(0.9999, Math.max(1e-4, d.s))) / t); return a - (d.y ? Math.log(p) : Math.log(1 - p)); }, 0); if (l < bl) { bl = l; best = t; } } return best; }, [data]);
  const iso = useMemo(() => pav(data), [data]);
  const f = (s: number) => (fix === "raw" ? s : fix === "temp" ? sig(logit(Math.min(0.9999, Math.max(1e-4, s))) / T) : iso(s));
  const bins = Array.from({ length: 10 }, (_, b) => { const inb = data.filter((d) => Math.min(9, Math.floor(f(d.s) * 10)) === b); return { n: inb.length, p: inb.length ? inb.reduce((a, d) => a + f(d.s), 0) / inb.length : 0, o: inb.length ? inb.reduce((a, d) => a + d.y, 0) / inb.length : 0 }; });
  const ece = bins.reduce((a, b) => a + (b.n / data.length) * Math.abs(b.p - b.o), 0);
  const auc = useMemo(() => { const s = [...data].sort((a, b) => a.s - b.s); let rank = 0, pos = 0; s.forEach((d, i) => { if (d.y) { rank += i + 1; pos++; } }); return (rank - (pos * (pos + 1)) / 2) / (pos * (data.length - pos)); }, [data]);
  const P = (x: number, y: number) => [20 + x * 220, 240 - y * 220];
  const drive = () => [
    { say: "This model ranks well, but it's over-confident: when it says 90 percent, the true rate is far lower. The bars sit off the diagonal.", act: () => { setOver(2.2); setFix("raw"); } },
    { say: "Temperature scaling divides the logits by one number fitted on validation data. The bars move onto the diagonal, and the AUC doesn't change at all.", act: () => setFix("temp") },
    { say: "Isotonic regression fits a monotone step function instead: more flexible, but it needs more data.", act: () => setFix("iso") },
  ];
  return (
    <Frame title="Calibration: do the probabilities mean what they say?" about="Predictions are grouped into ten buckets by predicted probability. Each bar's height is how often those examples were really positive. A calibrated model's bars sit on the diagonal." drive={drive}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[220px] flex-1"><Slider label="Model's over-confidence" value={over} min={0.4} max={3} step={0.1} onChange={setOver} fmt={(v) => (v > 1.05 ? `${v.toFixed(1)}× (over)` : v < 0.95 ? `${v.toFixed(1)}× (under)` : "calibrated")} /></div>
        <Chips value={fix} onChange={setFix} options={[{ id: "raw", label: "Raw scores" }, { id: "temp", label: `Temperature T=${T.toFixed(2)}` }, { id: "iso", label: "Isotonic" }]} />
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-[260px_1fr]">
        <svg viewBox="0 0 260 260" className="w-full rounded-xl border border-line bg-bg" role="img" aria-label="Reliability diagram">
          <line x1={P(0, 0)[0]} y1={P(0, 0)[1]} x2={P(1, 1)[0]} y2={P(1, 1)[1]} stroke={MUTE} strokeDasharray="4 4" />
          {bins.map((b, i) => b.n ? <motion.rect key={i} x={P(i / 10, 0)[0] + 2} width={18} animate={{ y: P(0, b.o)[1], height: b.o * 220 }} fill={AI} opacity={0.7} /> : null)}
          {bins.map((b, i) => b.n ? <circle key={`p${i}`} cx={P(b.p, 0)[0]} cy={P(0, b.p)[1]} r={3} fill={LIME} /> : null)}
          <text x={130} y={256} textAnchor="middle" className="fill-faint text-[9px]">predicted probability</text>
        </svg>
        <div className="space-y-2 text-[13px] text-mute">
          <p>Purple bars: observed positive rate per bucket. Lime dots: average prediction in the bucket. The gap between them is miscalibration.</p>
          <div className="grid grid-cols-3 gap-2">
            <Stat k="ECE" v={pct(ece, 1)} tone={ece < 0.03 ? LIME : "var(--color-bad)"} sub="expected calibration error" />
            <Stat k="ROC-AUC" v={auc.toFixed(3)} sub="unchanged by fixes" />
            <Stat k="Method" v={fix === "raw" ? "none" : fix === "temp" ? "Platt-like" : "isotonic"} />
          </div>
        </div>
      </div>
    </Frame>
  );
}

// ---------- NDCG and friends ----------

const ITEMS0 = [{ t: "Exact answer page", r: 3 }, { t: "Good tutorial", r: 2 }, { t: "Forum thread", r: 1 }, { t: "Spam page", r: 0 }, { t: "Related guide", r: 2 }, { t: "Off-topic news", r: 0 }];
function rankMetrics(rels: number[], k: number) {
  const g = (r: number) => 2 ** r - 1, disc = (i: number) => Math.log2(i + 2);
  const dcg = rels.slice(0, k).reduce((a, r, i) => a + g(r) / disc(i), 0);
  const idcg = [...rels].sort((a, b) => b - a).slice(0, k).reduce((a, r, i) => a + g(r) / disc(i), 0);
  const relv: number[] = rels.map((r) => (r >= 2 ? 1 : 0)), R = relv.reduce((a, b) => a + b, 0);
  const first = relv.indexOf(1);
  let hits = 0, ap = 0;
  relv.forEach((v, i) => { if (v) { hits++; ap += hits / (i + 1); } });
  return { dcg, idcg, ndcg: idcg ? dcg / idcg : 0, pk: relv.slice(0, k).reduce((a, b) => a + b, 0) / k, mrr: first < 0 ? 0 : 1 / (first + 1), ap: R ? ap / R : 0 };
}

function NdcgRanking() {
  const [items, setItems] = useState(ITEMS0);
  const [k, setK] = useState(4);
  const m = rankMetrics(items.map((x) => x.r), k);
  const move = (i: number, d: number) => setItems((xs) => { const j = i + d; if (j < 0 || j >= xs.length) return xs; const n = [...xs]; [n[i], n[j]] = [n[j], n[i]]; return n; });
  const drive = () => [
    { say: "Grades run from zero, useless, to three, perfect. Each result's gain is two to the grade minus one, divided by a log discount for its position.", act: () => { setItems(ITEMS0); setK(4); } },
    { say: "Sort the list ideally: the perfect answer first. DCG now equals the ideal DCG, so NDCG is exactly one.", act: () => setItems([...ITEMS0].sort((a, b) => b.r - a.r)) },
    { say: "Bury the perfect answer at the bottom: NDCG drops sharply, and MRR, which only looks at the first good result, changes too.", act: () => setItems([...ITEMS0].sort((a, b) => a.r - b.r).reverse().slice(1).concat(ITEMS0[0])) },
  ];
  return (
    <Frame title="Ranking metrics: reorder the results" about="Each result has a relevance grade (0–3). Move results up or down and watch NDCG, precision@k, MRR and average precision react. Grades 2 and 3 count as 'relevant' for the binary metrics." drive={drive}>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => setItems([...items].sort((a, b) => b.r - a.r))}>Ideal order</Button>
        <Button size="sm" onClick={() => setItems([...items].sort(() => Math.random() - 0.5))}><Shuffle size={14} />Shuffle</Button>
        <div className="min-w-[180px] flex-1"><Slider label="k (cut-off)" value={k} min={1} max={6} onChange={setK} /></div>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-[1.3fr_1fr]">
        <ol className="space-y-1.5">
          {items.map((it, i) => { const g = 2 ** it.r - 1, d = Math.log2(i + 2); return (
            <motion.li layout key={it.t} className={cn("flex items-center gap-2 rounded-xl border px-3 py-2 text-[13px]", i < k ? "border-ai/40 bg-ai/5" : "border-line opacity-60")}>
              <span className="w-5 text-faint">{i + 1}</span>
              <span className="flex-1">{it.t}</span>
              <span className="flex gap-0.5">{[0, 1, 2].map((s) => <span key={s} className={cn("h-2.5 w-2.5 rounded-sm", s < it.r ? "bg-accent" : "bg-panel2")} />)}</span>
              <span className="num w-24 text-right font-mono text-[11px] text-mute">{i < k ? `${g}/${d.toFixed(2)} = ${(g / d).toFixed(2)}` : "beyond k"}</span>
              <button aria-label="Move up" onClick={() => move(i, -1)} className="text-mute hover:text-text"><ChevronUp size={16} /></button>
              <button aria-label="Move down" onClick={() => move(i, 1)} className="text-mute hover:text-text"><ChevronDown size={16} /></button>
            </motion.li>
          ); })}
        </ol>
        <div className="grid grid-cols-2 content-start gap-2">
          <Stat k={`NDCG@${k}`} v={m.ndcg.toFixed(3)} tone={AI} sub={`DCG ${m.dcg.toFixed(2)} / ideal ${m.idcg.toFixed(2)}`} />
          <Stat k={`Precision@${k}`} v={m.pk.toFixed(2)} tone={LIME} />
          <Stat k="Reciprocal rank" v={m.mrr.toFixed(2)} sub="1 / first relevant position" />
          <Stat k="Average precision" v={m.ap.toFixed(2)} sub="over the whole list" />
        </div>
      </div>
    </Frame>
  );
}

// ---------- activation functions ----------

const ACTS: Record<string, { f: (x: number) => number; d: (x: number) => number; col: string }> = {
  sigmoid: { f: sig, d: (x) => sig(x) * (1 - sig(x)), col: RED },
  tanh: { f: Math.tanh, d: (x) => 1 - Math.tanh(x) ** 2, col: BLUE },
  ReLU: { f: (x) => Math.max(0, x), d: (x) => (x > 0 ? 1 : 0), col: LIME },
  "leaky ReLU": { f: (x) => (x > 0 ? x : 0.05 * x), d: (x) => (x > 0 ? 1 : 0.05), col: "#f5b547" },
  GELU: { f: (x) => 0.5 * x * (1 + Math.tanh(0.7978845608 * (x + 0.044715 * x ** 3))), d: (x) => { const h = 1e-4; return (ACTS.GELU.f(x + h) - ACTS.GELU.f(x - h)) / (2 * h); }, col: AI },
  SiLU: { f: (x) => x * sig(x), d: (x) => sig(x) * (1 + x * (1 - sig(x))), col: "#e7a2ff" },
};

function Activations() {
  const [on, setOn] = useState<string[]>(["sigmoid", "ReLU", "GELU"]);
  const [x, setX] = useState(2.5);
  const [view, setView] = useState<"f" | "d">("f");
  const X = (v: number) => 20 + ((v + 5) / 10) * 380, Y = (v: number) => 120 - v * (view === "f" ? 22 : 80);
  const toggle = (k: string) => setOn((xs) => (xs.includes(k) ? xs.filter((y) => y !== k) : [...xs, k]));
  const drive = () => [
    { say: "Here are the functions themselves. Sigmoid squashes everything into zero to one; ReLU is zero for negatives and the identity for positives; GELU is a smooth ReLU.", act: () => { setOn(["sigmoid", "ReLU", "GELU"]); setView("f"); } },
    { say: "Now their slopes, which is what backpropagation multiplies. The sigmoid's slope never exceeds a quarter and almost vanishes at plus or minus five.", act: () => setView("d") },
    { say: "Move to an input of three. Through ten sigmoid layers the gradient is that slope to the tenth power: effectively zero. Through ReLU it stays one.", act: () => setX(3) },
  ];
  return (
    <Frame title="Activation functions and their gradients" about="Toggle functions and switch between the function and its derivative. The table shows what survives of a gradient after passing through ten such layers at the chosen input." drive={drive}>
      <div className="flex flex-wrap items-center gap-1.5">
        {Object.keys(ACTS).map((k) => <button key={k} onClick={() => toggle(k)} className={cn("rounded-full border px-2.5 py-1 text-[12px]", on.includes(k) ? "border-ai/60 bg-ai/15 text-text" : "border-line text-mute")}><span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: ACTS[k].col }} />{k}</button>)}
        <span className="ml-2"><Chips value={view} onChange={setView} options={[{ id: "f", label: "f(x)" }, { id: "d", label: "slope f′(x)" }]} /></span>
      </div>
      <Slider label="Input x" value={x} min={-5} max={5} step={0.1} onChange={setX} fmt={(v) => v.toFixed(1)} />
      <div className="mt-2 grid gap-3 md:grid-cols-[1.4fr_1fr]">
        <svg viewBox="0 0 420 220" className="w-full rounded-xl border border-line bg-bg" role="img" aria-label="Activation plot">
          <line x1={20} x2={400} y1={120} y2={120} stroke={GRID} /><line x1={X(0)} x2={X(0)} y1={6} y2={214} stroke={GRID} />
          {on.map((k) => <path key={k} d={Array.from({ length: 201 }, (_, i) => -5 + i / 20).map((v, i) => `${i ? "L" : "M"}${X(v)},${Math.max(4, Math.min(216, Y(view === "f" ? ACTS[k].f(v) : ACTS[k].d(v))))}`).join("")} fill="none" stroke={ACTS[k].col} strokeWidth={2.2} />)}
          <line x1={X(x)} x2={X(x)} y1={6} y2={214} stroke="#fff" opacity={0.3} strokeDasharray="3 3" />
        </svg>
        <table className="w-full text-[12.5px]">
          <thead><tr className="text-faint"><th className="text-left font-normal">at x = {x.toFixed(1)}</th><th className="text-right font-normal">f</th><th className="text-right font-normal">f′</th><th className="text-right font-normal">f′¹⁰</th></tr></thead>
          <tbody>{on.map((k) => { const d = ACTS[k].d(x); return <tr key={k} className="border-t border-line"><td style={{ color: ACTS[k].col }}>{k}</td><td className="num text-right font-mono">{ACTS[k].f(x).toFixed(3)}</td><td className="num text-right font-mono">{d.toFixed(3)}</td><td className={cn("num text-right font-mono", Math.abs(d) ** 10 < 0.01 ? "text-bad" : "text-ok")}>{(Math.abs(d) ** 10).toExponential(1)}</td></tr>; })}</tbody>
        </table>
      </div>
    </Frame>
  );
}

// ---------- backprop step by step ----------

type BNode = { id: string; label: string; x: number; y: number };
const BN: BNode[] = [
  { id: "x", label: "x", x: 30, y: 40 }, { id: "w", label: "w", x: 30, y: 130 }, { id: "z1", label: "×", x: 130, y: 85 }, { id: "b", label: "b", x: 130, y: 170 },
  { id: "z", label: "+", x: 225, y: 120 }, { id: "p", label: "σ", x: 320, y: 120 }, { id: "t", label: "target", x: 320, y: 200 }, { id: "e", label: "−", x: 410, y: 160 }, { id: "L", label: "²", x: 500, y: 160 },
];
const BE: [string, string][] = [["x", "z1"], ["w", "z1"], ["z1", "z"], ["b", "z"], ["z", "p"], ["p", "e"], ["t", "e"], ["e", "L"]];

function BackpropSteps() {
  const [w, setW] = useState(0.5), [b, setB] = useState(0.2), [x, setX] = useState(2), [t, setT] = useState(1);
  const [step, setStep] = useState(0);
  const z1 = w * x, z = z1 + b, p = sig(z), e = p - t, L = e * e;
  const dL = 1, de = 2 * e * dL, dp = de, dz = dp * p * (1 - p), dz1 = dz, db = dz, dw = dz1 * x, dx = dz1 * w;
  const val: Record<string, number> = { x, w, b, t, z1, z, p, e, L };
  const grad: Record<string, number> = { L: dL, e: de, p: dp, z: dz, z1: dz1, b: db, w: dw, x: dx, t: -de };
  const FWD = ["z1", "z", "p", "e", "L"], BWD = ["L", "e", "p", "z", "z1", "w"];
  const total = FWD.length + BWD.length;
  const shownVal = (id: string) => ["x", "w", "b", "t"].includes(id) || FWD.indexOf(id) < step;
  const shownGrad = (id: string) => { const k = step - FWD.length; if (k <= 0) return false; const order = ["L", "e", "p", "z", "z1", "b", "w", "x"]; const lim = BWD.slice(0, k).reduce((a, n) => Math.max(a, order.indexOf(n)), -1); return order.indexOf(id) <= lim + (BWD[k - 1] === "z" ? 1 : 0) + (BWD[k - 1] === "w" ? 1 : 0); };
  const note = step === 0 ? "Inputs are set. Press Next to run the forward pass." : step <= FWD.length ? `Forward: compute ${["w·x", "w·x + b", "σ(z)", "p − target", "(p − target)²"][step - 1]}.` : [
    "Backward starts at the loss: dL/dL = 1.",
    "Square node: local slope 2e, so dL/de = 2e.",
    "Subtraction passes the gradient straight to p.",
    "Sigmoid node: multiply by its local slope p(1 − p).",
    "Add node: the gradient is copied to both inputs, z₁ and b.",
    "Multiply node swaps: dL/dw = upstream × x and dL/dx = upstream × w.",
  ][step - FWD.length - 1];
  const drive = () => [
    { say: "The forward pass computes values left to right and remembers them.", act: () => setStep(FWD.length) },
    { say: "The backward pass starts with a gradient of one at the loss, and each node multiplies the incoming gradient by its own local slope.", act: () => setStep(FWD.length + 4) },
    { say: "At the multiply node, the gradient for w is the upstream gradient times x. That number is what gradient descent uses to update w.", act: () => setStep(total) },
  ];
  return (
    <Frame title="Backpropagation, one node at a time" about="A one-neuron network: L = (σ(w·x + b) − target)². Step forward to compute values (top numbers), then backward to compute gradients (bottom numbers), each node multiplying by its local derivative." drive={drive}>
      <div className="grid gap-x-4 gap-y-1 sm:grid-cols-4">
        <Slider label="w" value={w} min={-2} max={2} step={0.1} onChange={setW} fmt={(v) => v.toFixed(1)} />
        <Slider label="b" value={b} min={-2} max={2} step={0.1} onChange={setB} fmt={(v) => v.toFixed(1)} />
        <Slider label="x" value={x} min={-3} max={3} step={0.1} onChange={setX} fmt={(v) => v.toFixed(1)} />
        <Slider label="target" value={t} min={0} max={1} step={1} onChange={setT} />
      </div>
      <svg viewBox="0 0 560 240" className="mt-2 w-full rounded-xl border border-line bg-bg" role="img" aria-label="Computational graph">
        {BE.map(([a, c]) => { const A = BN.find((n) => n.id === a)!, C = BN.find((n) => n.id === c)!; return <line key={a + c} x1={A.x + 22} y1={A.y} x2={C.x - 22} y2={C.y} stroke={GRID} strokeWidth={2} />; })}
        {BN.map((n) => (
          <g key={n.id}>
            <rect x={n.x - 22} y={n.y - 16} width={44} height={32} rx={8} fill="#141826" stroke={shownGrad(n.id) ? RED : shownVal(n.id) ? AI : GRID} />
            <text x={n.x} y={n.y + 5} textAnchor="middle" className="fill-text font-mono text-[13px]">{n.label}</text>
            {shownVal(n.id) && <text x={n.x} y={n.y - 22} textAnchor="middle" className="font-mono text-[10.5px]" fill={AI}>{val[n.id].toFixed(3)}</text>}
            {shownGrad(n.id) && n.id !== "t" && <text x={n.x} y={n.y + 31} textAnchor="middle" className="font-mono text-[10.5px]" fill={RED}>∂ {grad[n.id].toFixed(3)}</text>}
          </g>
        ))}
      </svg>
      <p className="mt-2 min-h-[1.5em] text-[13px] text-mute">{note}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => setStep((s) => Math.max(0, s - 1))}><StepBack size={14} />Back</Button>
        <Button size="sm" onClick={() => setStep((s) => Math.min(total, s + 1))}><StepForward size={14} />Next</Button>
        <Button size="sm" onClick={() => setStep(0)}><RotateCcw size={14} />Reset</Button>
        <span className="text-[12px] text-faint">step {step} / {total} · purple: values · red: gradients ∂L/∂(node)</span>
      </div>
    </Frame>
  );
}

// ---------- learning-rate schedules ----------

type Sched = "constant" | "step" | "cosine" | "warmup-cosine" | "wsd";
function lrAt(s: Sched, i: number, n: number, peak: number, warm: number) {
  const w = Math.max(1, Math.round(warm * n));
  if (s === "constant") return peak;
  if (s === "step") return peak * (i < n * 0.5 ? 1 : i < n * 0.75 ? 0.1 : 0.01);
  if (s === "cosine") return peak * (0.1 + 0.9 * 0.5 * (1 + Math.cos((Math.PI * i) / n)));
  if (i < w) return (peak * (i + 1)) / w;
  if (s === "warmup-cosine") return peak * (0.1 + 0.9 * 0.5 * (1 + Math.cos((Math.PI * (i - w)) / (n - w))));
  return i < n * 0.85 ? peak : peak * (0.1 + 0.9 * (1 - (i - n * 0.85) / (n * 0.15)));
}
function lrSim(s: Sched, peak: number, warm: number) {
  // toy: noisy gradient descent on a 1-D bowl whose curvature is sharp early (like a freshly initialised network)
  const r = rand(11), n = 400, losses: number[] = [];
  let wv = 3, dead = false;
  for (let i = 0; i < n; i++) {
    const h = 1 + 39 * Math.exp(-i / 25), lr = lrAt(s, i, n, peak, warm);
    wv -= lr * (h * wv + gauss(r) * 2.5);
    if (!dead && Math.abs(wv) > 1e4) dead = true;
    losses.push(dead ? NaN : Math.min(50, 0.5 * wv * wv));
  }
  return { losses, dead, final: dead ? NaN : losses.slice(-40).reduce((a, b) => a + b, 0) / 40 };
}

function LrSchedules() {
  const [s, setS] = useState<Sched>("warmup-cosine");
  const [peak, setPeak] = useState(0.12);
  const [warm, setWarm] = useState(0.08);
  const sim = useMemo(() => lrSim(s, peak, warm), [s, peak, warm]);
  const n = 400;
  const drive = () => [
    { say: "With a constant learning rate the loss stops improving: the noise in each step keeps it bouncing around the bottom.", act: () => { setS("constant"); setPeak(0.04); } },
    { say: "Raise the peak rate without warmup and training blows up in the first steps, when the landscape is sharpest.", act: () => { setS("cosine"); setPeak(0.12); } },
    { say: "Warmup ramps the rate up gently, then cosine decay lets the weights settle: the lowest final loss.", act: () => { setS("warmup-cosine"); setWarm(0.08); } },
  ];
  return (
    <Frame title="Learning-rate schedules" about="Top: the learning rate over training. Bottom: a toy noisy training run whose loss surface is sharp at the start (like a freshly initialised network). See why warmup and decay help." drive={drive}>
      <Chips value={s} onChange={setS} options={[{ id: "constant", label: "Constant" }, { id: "step", label: "Step decay" }, { id: "cosine", label: "Cosine" }, { id: "warmup-cosine", label: "Warmup + cosine" }, { id: "wsd", label: "Warmup-stable-decay" }]} />
      <div className="mt-2 grid gap-x-4 sm:grid-cols-2">
        <Slider label="Peak learning rate" value={peak} min={0.01} max={0.2} step={0.005} onChange={setPeak} fmt={(v) => v.toFixed(3)} />
        <Slider label="Warmup (share of steps)" value={warm} min={0.01} max={0.3} step={0.01} onChange={setWarm} fmt={(v) => pct(v)} />
      </div>
      <svg viewBox="0 0 600 200" className="mt-3 w-full rounded-xl border border-line bg-bg" role="img" aria-label="Schedule and loss">
        <path d={Array.from({ length: n }, (_, i) => `${i ? "L" : "M"}${10 + (i / n) * 580},${80 - (lrAt(s, i, n, peak, warm) / 0.2) * 70}`).join("")} fill="none" stroke={LIME} strokeWidth={2} />
        <line x1={10} x2={590} y1={90} y2={90} stroke={GRID} />
        <path d={sim.losses.map((l, i) => (Number.isNaN(l) ? "" : `${i && !Number.isNaN(sim.losses[i - 1]) ? "L" : "M"}${10 + (i / n) * 580},${195 - Math.min(1, Math.log10(1 + l) / Math.log10(51)) * 100}`)).join("")} fill="none" stroke={AI} strokeWidth={1.6} />
        <text x={14} y={20} className="fill-faint text-[10px]">learning rate</text><text x={14} y={104} className="fill-faint text-[10px]">loss (log scale)</text>
      </svg>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Stat k="Outcome" v={sim.dead ? "Diverged" : "Trained"} tone={sim.dead ? "var(--color-bad)" : LIME} />
        <Stat k="Final loss (last 10%)" v={sim.dead ? "NaN" : sim.final.toFixed(3)} tone={AI} sub="lower is better" />
      </div>
    </Frame>
  );
}

// ---------- activation statistics through depth ----------

type Init = "small" | "xavier" | "he" | "large";
function deepStats(act: "tanh" | "relu", init: Init, norm: boolean, res: boolean, depth = 20, width = 64, batch = 32) {
  const r = rand(4);
  let h = Array.from({ length: batch }, () => Array.from({ length: width }, () => gauss(r)));
  const Ws: number[][][] = [], pre: number[][][] = [], ins: number[][][] = [];
  const std = init === "small" ? 0.01 : init === "xavier" ? Math.sqrt(1 / width) : init === "he" ? Math.sqrt(2 / width) : Math.sqrt(4 / width);
  const fwd: number[] = [];
  const sd = (m: number[][]) => { let s = 0, s2 = 0, n = 0; for (const row of m) for (const v of row) { s += v; s2 += v * v; n++; } return Math.sqrt(Math.max(0, s2 / n - (s / n) ** 2)); };
  for (let l = 0; l < depth; l++) {
    const W = Array.from({ length: width }, () => Array.from({ length: width }, () => gauss(r) * std));
    Ws.push(W);
    let x = h;
    if (norm) x = x.map((row) => { const m = row.reduce((a, b) => a + b, 0) / width, v = row.reduce((a, b) => a + (b - m) ** 2, 0) / width; return row.map((u) => (u - m) / Math.sqrt(v + 1e-5)); });
    ins.push(x);
    const z = x.map((row) => W[0].map((_, j) => row.reduce((a, u, i) => a + u * W[i][j], 0)));
    pre.push(z);
    const a = z.map((row) => row.map((u) => (act === "relu" ? Math.max(0, u) : Math.tanh(u))));
    h = res ? h.map((row, i) => row.map((u, j) => u + a[i][j])) : a;
    fwd.push(sd(h));
  }
  // backward: random upstream gradient, ignoring the norm's own Jacobian (a simplification shown in the caption)
  let g = Array.from({ length: batch }, () => Array.from({ length: width }, () => gauss(r)));
  const bwd: number[] = Array(depth).fill(0);
  for (let l = depth - 1; l >= 0; l--) {
    const dz = g.map((row, i) => row.map((u, j) => u * (act === "relu" ? (pre[l][i][j] > 0 ? 1 : 0) : 1 - Math.tanh(pre[l][i][j]) ** 2)));
    const dx = dz.map((row) => Ws[l].map((wrow) => wrow.reduce((a, wv, j) => a + wv * row[j], 0)));
    g = res ? g.map((row, i) => row.map((u, j) => u + dx[i][j])) : dx;
    bwd[l] = sd(g);
  }
  return { fwd, bwd };
}

function DepthStats({ title, about, defaults, focus }: { title: string; about: string; defaults: { act: "tanh" | "relu"; init: Init; norm: boolean; res: boolean }; focus: "fwd" | "bwd" }) {
  const [act, setAct] = useState(defaults.act);
  const [init, setInit] = useState<Init>(defaults.init);
  const [norm, setNorm] = useState(defaults.norm);
  const [res, setRes] = useState(defaults.res);
  const st = useMemo(() => deepStats(act, init, norm, res), [act, init, norm, res]);
  const series = focus === "fwd" ? st.fwd : st.bwd;
  const lg = (v: number) => Math.log10(Math.max(1e-12, v));
  const drive = () => focus === "fwd" ? [
    { say: "Twenty tanh layers with tiny initial weights: the signal shrinks to nothing within a few layers.", act: () => { setAct("tanh"); setInit("small"); setNorm(false); setRes(false); } },
    { say: "ReLU with Xavier initialisation still halves the variance each layer, because ReLU zeroes half its inputs.", act: () => { setAct("relu"); setInit("xavier"); } },
    { say: "He initialisation doubles the variance to compensate, and the spread stays roughly constant across all twenty layers.", act: () => setInit("he") },
  ] : [
    { say: "A plain twenty-layer stack: the gradient reaching the first layers is many times smaller than at the top.", act: () => { setRes(false); setInit("xavier"); setAct("relu"); } },
    { say: "Add residual connections. The identity path carries the gradient straight down, so early layers get a healthy signal.", act: () => setRes(true) },
  ];
  return (
    <Frame title={title} about={about} drive={drive}>
      <div className="flex flex-wrap items-center gap-3">
        <Chips label="Activation" value={act} onChange={setAct} options={[{ id: "tanh", label: "tanh" }, { id: "relu", label: "ReLU" }]} />
        <Chips label="Init" value={init} onChange={setInit} options={[{ id: "small", label: "std 0.01" }, { id: "xavier", label: "Xavier" }, { id: "he", label: "He" }, { id: "large", label: "too large" }]} />
        <Chips label="LayerNorm" value={norm ? 1 : 0} onChange={(v) => setNorm(!!v)} options={[{ id: 0, label: "off" }, { id: 1, label: "on" }]} />
        <Chips label="Residual" value={res ? 1 : 0} onChange={(v) => setRes(!!v)} options={[{ id: 0, label: "off" }, { id: 1, label: "on" }]} />
      </div>
      <svg viewBox="0 0 600 190" className="mt-3 w-full rounded-xl border border-line bg-bg" role="img" aria-label="Spread per layer">
        {[-6, -3, 0, 3].map((e) => <g key={e}><line x1={40} x2={590} y1={95 - e * 13} y2={95 - e * 13} stroke={GRID} /><text x={4} y={98 - e * 13} className="fill-faint font-mono text-[9px]">1e{e}</text></g>)}
        {series.map((v, i) => { const y = 95 - Math.max(-6.5, Math.min(6.5, lg(v))) * 13; return <motion.rect key={i} x={46 + i * 27} width={20} animate={{ y, height: Math.max(1, 180 - y) }} fill={focus === "fwd" ? AI : RED} opacity={0.8} />; })}
        <text x={315} y={186} textAnchor="middle" className="fill-faint text-[10px]">layer 1 → 20 · bar = standard deviation of {focus === "fwd" ? "activations (forward)" : "gradients (backward)"}, log scale</text>
      </svg>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat k={focus === "fwd" ? "Layer 1 spread" : "Gradient at layer 20"} v={(focus === "fwd" ? series[0] : series[series.length - 1]).toExponential(1)} />
        <Stat k={focus === "fwd" ? "Layer 20 spread" : "Gradient at layer 1"} v={(focus === "fwd" ? series[series.length - 1] : series[0]).toExponential(1)} tone={AI} />
        <Stat k="Ratio" v={(series[series.length - 1] / series[0]).toExponential(1)} sub={Math.abs(lg(series[series.length - 1] / series[0])) > 2 ? "vanishing or exploding" : "healthy"} tone={Math.abs(lg(series[series.length - 1] / series[0])) > 2 ? "var(--color-bad)" : LIME} />
      </div>
    </Frame>
  );
}
const ActivationStats = () => <DepthStats title="Signals through 20 layers: initialisation and normalisation" about="A real 20-layer network runs on random inputs. Each bar is the spread of activations after a layer. Healthy networks keep it roughly constant." defaults={{ act: "tanh", init: "small", norm: false, res: false }} focus="fwd" />;
const ResnetBlock = () => <DepthStats title="Residual connections and the gradient highway" about="The same 20-layer network, measuring the spread of gradients flowing backward to each layer. Toggle residual connections and watch the early layers' gradient." defaults={{ act: "relu", init: "xavier", norm: false, res: false }} focus="bwd" />;

// ---------- loss-curve doctor ----------

const SYMPTOMS = {
  healthy: { label: "Healthy", tr: (i: number) => 2.3 * Math.exp(-i / 18) + 0.25, va: (i: number) => 2.3 * Math.exp(-i / 18) + 0.33, dx: "Both curves fall and flatten together with a small gap. Keep going; tune the schedule; add capacity if both plateau high." },
  flat: { label: "Flat from the start", tr: () => 2.3, va: () => 2.31, dx: "Nothing is learning: learning rate far too low, gradients not flowing (detached tensors, frozen parameters, optimiser built before model changes), or the loss gets the wrong inputs. Check gradient norms per layer and overfit one batch." },
  diverge: { label: "Spikes then NaN", tr: (i: number) => (i < 30 ? 2.3 * Math.exp(-i / 12) + 0.6 : i < 36 ? 0.8 + (i - 30) ** 2 * 0.3 : NaN), va: (i: number) => (i < 30 ? 2.3 * Math.exp(-i / 12) + 0.7 : NaN), dx: "Learning rate too high, missing warmup or clipping, fp16 overflow, log(0) or a bad batch. Lower LR, warm up, clip at 1.0, use bf16, find the batch." },
  overfit: { label: "Validation turns up", tr: (i: number) => 2.3 * Math.exp(-i / 12) + 0.05, va: (i: number) => 2.3 * Math.exp(-i / 12) + 0.35 + Math.max(0, i - 25) * 0.025, dx: "Overfitting: keep the checkpoint at the validation minimum (early stopping), add regularisation (weight decay, dropout, augmentation) or more data." },
  plateau: { label: "Plateau, high loss", tr: (i: number) => 1.4 + 0.9 * Math.exp(-i / 5), va: (i: number) => 1.45 + 0.9 * Math.exp(-i / 5), dx: "Underfitting or stuck: model too small, dead ReLUs, saturation, bad initialisation, or learning rate too low to make progress. Bigger model, He init, normalisation, LR sweep." },
  chance: { label: "Train ↓, validation at chance", tr: (i: number) => 2.3 * Math.exp(-i / 10) + 0.05, va: () => 2.31, dx: "The model learns something that doesn't exist in validation: pipeline mismatch (different preprocessing), label mapping bug, or leakage only in training data. Inspect validation inputs and predictions." },
} as const;

function LossDoctor() {
  const [k, setK] = useState<keyof typeof SYMPTOMS>("overfit");
  const s = SYMPTOMS[k];
  const pts = (f: (i: number) => number) => Array.from({ length: 60 }, (_, i) => f(i)).map((v, i, a) => (Number.isNaN(v) ? "" : `${i && !Number.isNaN(a[i - 1]) ? "L" : "M"}${20 + i * 9.5},${190 - Math.min(2.6, v) * 68}`)).join("");
  const drive = () => (Object.keys(SYMPTOMS) as (keyof typeof SYMPTOMS)[]).slice(1, 5).map((key) => ({ say: `${SYMPTOMS[key].label}. ${SYMPTOMS[key].dx}`, act: () => setK(key) }));
  return (
    <Frame title="Loss-curve doctor" about="Pick a symptom to see what the curves look like and what usually causes it." drive={drive}>
      <Chips value={k} onChange={setK} options={(Object.keys(SYMPTOMS) as (keyof typeof SYMPTOMS)[]).map((id) => ({ id, label: SYMPTOMS[id].label }))} />
      <div className="mt-3 grid gap-3 md:grid-cols-[1.3fr_1fr]">
        <svg viewBox="0 0 600 200" className="w-full rounded-xl border border-line bg-bg" role="img" aria-label="Loss curves">
          <line x1={20} x2={590} y1={190} y2={190} stroke={GRID} />
          <path d={pts(s.tr)} fill="none" stroke={LIME} strokeWidth={2} />
          <path d={pts(s.va)} fill="none" stroke={AI} strokeWidth={2} />
          <text x={26} y={18} className="fill-faint text-[10px]"><tspan fill={LIME}>training</tspan> · <tspan fill="var(--color-ai)">validation</tspan> loss over epochs</text>
        </svg>
        <p className="rounded-xl border border-line bg-bg p-3 text-[13.5px] leading-relaxed text-mute">{s.dx}</p>
      </div>
    </Frame>
  );
}

// ---------- broadcasting ----------

const parseShape = (s: string) => s.split(/[,×x\s]+/).map((x) => x.trim()).filter(Boolean).map(Number).filter((n) => Number.isInteger(n) && n > 0);
function broadcast(a: number[], b: number[]) {
  const n = Math.max(a.length, b.length), A = Array(n - a.length).fill(null).concat(a), B = Array(n - b.length).fill(null).concat(b);
  const out: (number | null)[] = [], ok: boolean[] = [];
  for (let i = 0; i < n; i++) {
    const x = A[i] ?? 1, y = B[i] ?? 1;
    const good = x === y || x === 1 || y === 1;
    ok.push(good);
    out.push(good ? Math.max(x, y) : null);
  }
  return { A, B, out, ok, fine: ok.every(Boolean) };
}
const BPRE: [string, string, string][] = [["32, 128", "128", "bias per row"], ["64, 1", "64", "the silent (n,1) vs (n,) bug"], ["8, 1, 5", "3, 1", "mixed"], ["32, 128", "64", "mismatch"], ["16, 1, 64", "1, 20, 64", "pairwise (queries × keys)"]];

function Broadcasting() {
  const [a, setA] = useState("64, 1");
  const [b, setB] = useState("64");
  const A = parseShape(a), B = parseShape(b), r = broadcast(A, B);
  const drive = () => [
    { say: "Shapes are lined up from the right. A bias of length 128 added to a 32 by 128 matrix is copied to every row.", act: () => { setA("32, 128"); setB("128"); } },
    { say: "Here's the classic bug: predictions of shape 64 by 1 minus targets of shape 64. The size-one axis stretches, and the result is a 64 by 64 matrix of every prediction against every target.", act: () => { setA("64, 1"); setB("64"); } },
    { say: "When two sizes differ and neither is one, broadcasting fails.", act: () => { setA("32, 128"); setB("64"); } },
  ];
  return (
    <Frame title="Broadcasting: line shapes up from the right" about="Type two tensor shapes. Each axis must be equal, or one of them must be 1 (or missing), and size-1 axes are stretched to match." drive={drive}>
      <div className="flex flex-wrap gap-1.5">{BPRE.map(([x, y, l]) => <button key={l} onClick={() => { setA(x); setB(y); }} className="rounded-full border border-line px-2.5 py-1 text-[12px] text-mute hover:text-text">{l}</button>)}</div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-[12.5px] text-mute">Shape of A<input value={a} onChange={(e) => setA(e.target.value)} className="mt-1 w-full rounded-lg border border-line bg-bg px-3 py-2 font-mono text-[14px] text-text" /></label>
        <label className="text-[12.5px] text-mute">Shape of B<input value={b} onChange={(e) => setB(e.target.value)} className="mt-1 w-full rounded-lg border border-line bg-bg px-3 py-2 font-mono text-[14px] text-text" /></label>
      </div>
      <table className="mt-3 w-full border-separate border-spacing-1 text-center font-mono text-[14px]">
        <tbody>
          {([["A", r.A], ["B", r.B]] as const).map(([k, row]) => <tr key={k}><td className="w-16 text-left text-[12px] text-faint">{k}</td>{row.map((v, i) => <td key={i} className={cn("rounded-lg border py-1.5", v === null ? "border-dashed border-line text-faint" : v === 1 && r.out[i] !== 1 ? "border-accent/50 text-accent" : "border-line")}>{v ?? "·"}</td>)}</tr>)}
          <tr><td className="text-left text-[12px] text-faint">result</td>{r.out.map((v, i) => <td key={i} className={cn("rounded-lg border py-1.5 font-semibold", r.ok[i] ? "border-ai/50 bg-ai/10" : "border-bad/60 bg-bad/10 text-bad")}>{v ?? "✕"}</td>)}</tr>
        </tbody>
      </table>
      <p className={cn("mt-2 text-[13px]", r.fine ? "text-mute" : "text-bad")}>{r.fine ? `Result shape (${r.out.join(", ")}). Lime cells are size-1 axes being stretched.` : "Error: an axis differs and neither side is 1, so these shapes can't broadcast."}</p>
    </Frame>
  );
}

// ---------- roofline ----------

const CHIPS = { H100: { tf: 990, bw: 3.35 }, A100: { tf: 312, bw: 2.0 }, "TPU v5e": { tf: 197, bw: 0.82 }, "Laptop CPU": { tf: 1.5, bw: 0.1 } } as const;

function Roofline() {
  const [chip, setChip] = useState<keyof typeof CHIPS>("H100");
  const [n, setN] = useState(4096);
  const [batch, setBatch] = useState(1);
  const c = CHIPS[chip], ridge = c.tf / c.bw; // FLOPs per byte
  const ops = [
    { k: `matmul ${n}×${n}×${n}`, I: (2 * n ** 3) / (3 * n * n * 2), col: LIME },
    { k: "LayerNorm / ReLU", I: 0.6, col: RED },
    { k: `LLM decode, batch ${batch}`, I: batch * 1.0, col: AI },
    { k: "softmax over attention scores", I: 1.2, col: BLUE },
  ];
  const att = (I: number) => Math.min(c.tf, I * c.bw);
  const X = (I: number) => 30 + ((Math.log10(I) + 1) / 6) * 540, Y = (f: number) => 190 - ((Math.log10(f) + 1) / 4.5) * 175;
  const drive = () => [
    { say: "The slanted line is the memory limit: attainable speed is bandwidth times arithmetic intensity. The flat line is the compute limit. They meet at the ridge point.", act: () => { setChip("H100"); setN(4096); setBatch(1); } },
    { say: "A big matrix multiply sits far to the right: compute-bound, using the chip well. Layer norms and activations sit far left: memory-bound.", act: () => setN(8192) },
    { say: "Decoding a language model one request at a time is memory-bound. Batch 256 requests together and the same weight reads serve many more FLOPs.", act: () => setBatch(256) },
  ];
  return (
    <Frame title="The roofline: compute-bound or memory-bound?" about="Attainable speed (log scale) versus arithmetic intensity, FLOPs per byte moved. Points left of the ridge are limited by memory bandwidth; points right of it by compute." drive={drive}>
      <div className="flex flex-wrap items-center gap-3">
        <Chips value={chip} onChange={setChip} options={(Object.keys(CHIPS) as (keyof typeof CHIPS)[]).map((id) => ({ id, label: id }))} />
      </div>
      <div className="mt-2 grid gap-x-4 sm:grid-cols-2">
        <Slider label="Matrix size n" value={Math.log2(n)} min={6} max={14} onChange={(v) => setN(2 ** v)} fmt={() => `${n}`} />
        <Slider label="Decode batch size" value={Math.log2(batch)} min={0} max={9} onChange={(v) => setBatch(2 ** v)} fmt={() => `${batch}`} />
      </div>
      <svg viewBox="0 0 600 205" className="mt-2 w-full rounded-xl border border-line bg-bg" role="img" aria-label="Roofline">
        <path d={`M${X(0.1)},${Y(0.1 * c.bw)} L${X(ridge)},${Y(c.tf)} L${X(1e5)},${Y(c.tf)}`} fill="none" stroke="#fff" strokeWidth={2} opacity={0.8} />
        <line x1={X(ridge)} x2={X(ridge)} y1={Y(c.tf)} y2={195} stroke={MUTE} strokeDasharray="3 3" />
        <text x={X(ridge) + 4} y={192} className="fill-faint font-mono text-[9.5px]">ridge ≈ {ridge.toFixed(0)} FLOP/byte</text>
        {ops.map((o) => { const I = Math.max(0.1, Math.min(1e5, o.I)); return <g key={o.k}><circle cx={X(I)} cy={Y(att(I))} r={6} fill={o.col} /><text x={X(I) + 8} y={Y(att(I)) - 6} className="text-[10px]" fill={o.col}>{o.k}</text></g>; })}
      </svg>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {ops.map((o) => <Stat key={o.k} k={o.k} v={`${att(o.I).toFixed(att(o.I) < 10 ? 2 : 0)} TF/s`} tone={o.col} sub={o.I < ridge ? `memory-bound (${pct(att(o.I) / c.tf)} of peak)` : "compute-bound"} />)}
      </div>
    </Frame>
  );
}

// ---------- receptive field ----------

type Layer = { k: number; s: number; label: string };
const LAYER_KINDS: Layer[] = [{ k: 3, s: 1, label: "conv 3×3" }, { k: 3, s: 2, label: "conv 3×3, stride 2" }, { k: 2, s: 2, label: "pool 2×2" }, { k: 5, s: 1, label: "conv 5×5" }, { k: 1, s: 1, label: "conv 1×1" }];

function ReceptiveField() {
  const [layers, setLayers] = useState<Layer[]>([LAYER_KINDS[0], LAYER_KINDS[0], LAYER_KINDS[2], LAYER_KINDS[0]]);
  const rows = layers.reduce<(Layer & { rf: number; jump: number })[]>((acc, l) => { const prev = acc[acc.length - 1] ?? { rf: 1, jump: 1 }; return [...acc, { ...l, rf: prev.rf + (l.k - 1) * prev.jump, jump: prev.jump * l.s }]; }, []);
  const rf = rows[rows.length - 1]?.rf ?? 1;
  const N = 41, cell = 6.4, c = Math.floor(N / 2), half = Math.min(c, Math.floor(rf / 2));
  const drive = () => [
    { say: "Three 3 by 3 convolutions with stride one: each output sees a 7 by 7 patch of the input.", act: () => setLayers([LAYER_KINDS[0], LAYER_KINDS[0], LAYER_KINDS[0]]) },
    { say: "Put a 2 by 2 pooling layer in the middle: every layer after it covers twice as much ground per step, so the receptive field grows much faster.", act: () => setLayers([LAYER_KINDS[0], LAYER_KINDS[2], LAYER_KINDS[0], LAYER_KINDS[0]]) },
  ];
  return (
    <Frame title="How the receptive field grows" about="Build a stack of layers. The highlighted square is the patch of the input image that one output value in the last layer can see." drive={drive}>
      <div className="flex flex-wrap gap-1.5">
        {LAYER_KINDS.map((l) => <button key={l.label} onClick={() => setLayers((x) => (x.length < 8 ? [...x, l] : x))} className="rounded-full border border-line px-2.5 py-1 text-[12px] text-mute hover:text-text">+ {l.label}</button>)}
        <Button size="sm" onClick={() => setLayers((x) => x.slice(0, -1))}>Remove last</Button>
        <Button size="sm" onClick={() => setLayers([])}><RotateCcw size={14} />Clear</Button>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-[270px_1fr]">
        <svg viewBox={`0 0 ${N * cell} ${N * cell}`} className="w-full rounded-xl border border-line bg-bg" role="img" aria-label="Receptive field on the input">
          {Array.from({ length: N * N }, (_, i) => { const x = i % N, y = Math.floor(i / N), inside = Math.abs(x - c) <= half && Math.abs(y - c) <= half; return <rect key={i} x={x * cell + 0.4} y={y * cell + 0.4} width={cell - 0.8} height={cell - 0.8} fill={x === c && y === c ? LIME : inside ? AI : "#171b29"} opacity={inside ? 0.75 : 1} />; })}
        </svg>
        <div>
          <table className="w-full text-[12.5px]">
            <thead><tr className="text-faint"><th className="text-left font-normal">layer</th><th className="text-right font-normal">receptive field</th><th className="text-right font-normal">jump</th></tr></thead>
            <tbody>{rows.map((r, i) => <tr key={i} className="border-t border-line"><td>{i + 1}. {r.label}</td><td className="num text-right font-mono">{r.rf}×{r.rf}</td><td className="num text-right font-mono">{r.jump}</td></tr>)}</tbody>
          </table>
          <p className="mt-2 text-[12px] text-faint">r ← r + (k − 1) × jump; jump ← jump × stride. Grid shows a 41×41 input; fields larger than that are clipped.</p>
          <div className="mt-2"><Stat k="Final receptive field" v={`${rf}×${rf} pixels`} tone={AI} /></div>
        </div>
      </div>
    </Frame>
  );
}

// ---------- IoU and NMS ----------

type Box = { x1: number; y1: number; x2: number; y2: number; s: number };
const BOXES: Box[] = [
  { x1: 40, y1: 40, x2: 160, y2: 150, s: 0.95 }, { x1: 50, y1: 55, x2: 170, y2: 160, s: 0.88 }, { x1: 30, y1: 30, x2: 140, y2: 140, s: 0.72 },
  { x1: 200, y1: 60, x2: 300, y2: 170, s: 0.91 }, { x1: 215, y1: 70, x2: 310, y2: 180, s: 0.6 }, { x1: 140, y1: 100, x2: 240, y2: 200, s: 0.55 },
  { x1: 330, y1: 30, x2: 420, y2: 120, s: 0.83 }, { x1: 340, y1: 45, x2: 430, y2: 130, s: 0.79 },
];
const iouOf = (a: Box, b: Box) => { const ix = Math.max(0, Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1)), iy = Math.max(0, Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1)), inter = ix * iy; const u = (a.x2 - a.x1) * (a.y2 - a.y1) + (b.x2 - b.x1) * (b.y2 - b.y1) - inter; return u > 0 ? inter / u : 0; };

function IouNms() {
  const [thr, setThr] = useState(0.5);
  const [step, setStep] = useState(0);
  const [sel, setSel] = useState<number[]>([0, 1]);
  const trace = useMemo(() => {
    const order = BOXES.map((_, i) => i).sort((a, b) => BOXES[b].s - BOXES[a].s);
    const states: { keep: number[]; gone: number[]; cur: number | null }[] = [{ keep: [], gone: [], cur: null }];
    const keep: number[] = [], gone: number[] = [];
    let rest = [...order];
    while (rest.length) {
      const i = rest[0];
      keep.push(i);
      const drop = rest.slice(1).filter((j) => iouOf(BOXES[i], BOXES[j]) > thr);
      gone.push(...drop);
      rest = rest.slice(1).filter((j) => !drop.includes(j));
      states.push({ keep: [...keep], gone: [...gone], cur: i });
    }
    return states;
  }, [thr]);
  const st = trace[Math.min(step, trace.length - 1)];
  const pick = (i: number) => setSel((s) => (s.includes(i) ? s : [s[1] ?? s[0], i].slice(-2)));
  const drive = () => [
    { say: "Eight candidate boxes for three objects. NMS sorts them by score and keeps the best one.", act: () => setStep(1) },
    { say: "Every remaining box overlapping a kept box by more than the IoU threshold is removed. Then repeat with the next best survivor.", act: () => setStep(trace.length - 1) },
    { say: "Lower the threshold to 0.2 and even the separate box between the two objects is suppressed: too aggressive. Raise it to 0.8 and duplicates survive.", act: () => setThr(0.2) },
  ];
  return (
    <Frame title="IoU and non-maximum suppression" about="Click two boxes to see their IoU. Step through greedy NMS: the best remaining box is kept (lime) and boxes overlapping it above the threshold are suppressed (faded)." drive={drive}>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1"><Slider label="IoU threshold" value={thr} min={0.1} max={0.9} step={0.05} onChange={(v) => { setThr(v); setStep(0); }} fmt={(v) => v.toFixed(2)} /></div>
        <Button size="sm" onClick={() => setStep((s) => Math.max(0, s - 1))}><StepBack size={14} />Back</Button>
        <Button size="sm" onClick={() => setStep((s) => Math.min(trace.length - 1, s + 1))}><StepForward size={14} />Next</Button>
        <Button size="sm" onClick={() => setStep(0)}><RotateCcw size={14} />Reset</Button>
      </div>
      <svg viewBox="0 0 460 220" className="mt-3 w-full rounded-xl border border-line bg-bg" role="img" aria-label="Boxes">
        {BOXES.map((b, i) => { const kept = st.keep.includes(i), gone = st.gone.includes(i); return (
          <g key={i} onClick={() => pick(i)} className="cursor-pointer">
            <motion.rect x={b.x1} y={b.y1} width={b.x2 - b.x1} height={b.y2 - b.y1} fill={sel.includes(i) ? "rgba(255,255,255,0.06)" : "transparent"} animate={{ opacity: gone ? 0.15 : 1 }} stroke={kept ? LIME : st.cur === i ? "#fff" : AI} strokeWidth={kept ? 3 : sel.includes(i) ? 2.5 : 1.5} strokeDasharray={kept ? undefined : "4 3"} />
            <text x={b.x1 + 4} y={b.y1 + 13} className="font-mono text-[10px]" fill={kept ? LIME : AI} opacity={gone ? 0.3 : 1}>{b.s.toFixed(2)}</text>
          </g>
        ); })}
      </svg>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat k={`IoU of selected pair`} v={iouOf(BOXES[sel[0]], BOXES[sel[1] ?? sel[0]]).toFixed(2)} tone={AI} sub={`boxes ${sel.map((i) => BOXES[i].s.toFixed(2)).join(" & ")}`} />
        <Stat k="Kept" v={st.keep.length} tone={LIME} />
        <Stat k="Suppressed" v={st.gone.length} sub={step >= trace.length - 1 ? "done" : "step to continue"} />
      </div>
    </Frame>
  );
}

export const AI_WIDGETS_5: Record<string, ComponentType> = {
  calibration: Calibration, "ndcg-ranking": NdcgRanking, activations: Activations, "backprop-steps": BackpropSteps, "lr-schedules": LrSchedules,
  "activation-stats": ActivationStats, "resnet-block": ResnetBlock, "loss-doctor": LossDoctor, broadcasting: Broadcasting, roofline: Roofline,
  "receptive-field": ReceptiveField, "iou-nms": IouNms,
};
