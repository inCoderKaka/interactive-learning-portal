"use client";
// AI deep-pass visuals, part 3: maths and statistics foundations (req3). Loaded on demand by components/viz/index.tsx.
import { useMemo, useState, type ComponentType } from "react";
import { motion } from "motion/react";
import { Play, RotateCcw } from "lucide-react";
import { Button, cn } from "../ui";
import { AI, Chips, Frame, Slider, Stat, gauss, pct, rand } from "./ai-kit";

const LIME = "#c8f547";
const MUTE = "#5d637c";
const GRID = "#2a2f44";

// ---------- matrix as a transformation ----------

type M2 = [number, number, number, number]; // [a b; c d]
const PRESETS: { id: string; label: string; m: M2 }[] = [
  { id: "id", label: "Identity", m: [1, 0, 0, 1] },
  { id: "stretch", label: "Stretch", m: [1.8, 0, 0, 0.6] },
  { id: "rot", label: "Rotate 45°", m: [0.71, -0.71, 0.71, 0.71] },
  { id: "shear", label: "Shear", m: [1, 1, 0, 1] },
  { id: "sym", label: "Symmetric", m: [1.5, 0.6, 0.6, 0.8] },
  { id: "flat", label: "Flatten (rank 1)", m: [1, 2, 0.5, 1] },
];

function eig(m: M2) {
  const [a, b, c, d] = m;
  const tr = a + d, det = a * d - b * c, disc = tr * tr - 4 * det;
  if (disc < -1e-9) return [] as { l: number; v: [number, number] }[];
  const s = Math.sqrt(Math.max(0, disc));
  const out: { l: number; v: [number, number] }[] = [];
  for (const l of disc < 1e-9 ? [tr / 2] : [(tr + s) / 2, (tr - s) / 2]) {
    // (A - lI)v = 0 → pick a non-zero row
    let v: [number, number] = Math.abs(b) > 1e-6 ? [b, l - a] : Math.abs(c) > 1e-6 ? [l - d, c] : Math.abs(a - l) < 1e-6 ? [1, 0] : [0, 1];
    const n = Math.hypot(v[0], v[1]) || 1;
    v = [v[0] / n, v[1] / n];
    if (!out.some((o) => Math.abs(o.v[0] * v[1] - o.v[1] * v[0]) < 1e-6)) out.push({ l, v });
  }
  return out;
}

function MatrixTransform() {
  const [m, setM] = useState<M2>([1.5, 0.6, 0.6, 0.8]);
  const [a, b, c, d] = m;
  const det = a * d - b * c;
  const rank = Math.abs(det) > 1e-3 ? 2 : Math.abs(a) + Math.abs(b) + Math.abs(c) + Math.abs(d) > 1e-3 ? 1 : 0;
  const es = useMemo(() => eig(m), [m]);
  const S = 34, O = 150; // pixels per unit, origin
  const P = (x: number, y: number) => [O + (a * x + b * y) * S, O - (c * x + d * y) * S] as const;
  const lines: string[] = [];
  for (let k = -4; k <= 4; k++) {
    const [x1, y1] = P(k, -4), [x2, y2] = P(k, 4);
    const [x3, y3] = P(-4, k), [x4, y4] = P(4, k);
    lines.push(`M${x1},${y1}L${x2},${y2}`, `M${x3},${y3}L${x4},${y4}`);
  }
  const sq = [P(0, 0), P(1, 0), P(1, 1), P(0, 1)].map(([x, y]) => `${x},${y}`).join(" ");
  const set = (i: number) => (v: number) => setM((o) => { const n = [...o] as M2; n[i] = v; return n; });
  const drive = () => [
    { say: "This matrix is symmetric: its two eigenvectors, the dashed lines, are at right angles. Along them, the matrix only stretches.", act: () => setM([1.5, 0.6, 0.6, 0.8]) },
    { say: "A rotation turns every direction, so it has no real eigenvectors at all.", act: () => setM([0.71, -0.71, 0.71, 0.71]) },
    { say: "Now a rank-one matrix: the whole plane is squashed onto a single line. The determinant is zero, so the unit square has no area left, and no inverse can undo it.", act: () => setM([1, 2, 0.5, 1]) },
  ];
  return (
    <Frame title="A matrix is a transformation of space" about="The grid and the unit square show where the matrix sends every point. Dashed lines are eigenvectors: directions it only stretches." drive={drive}>
      <Chips value={PRESETS.find((p) => p.m.every((x, i) => Math.abs(x - m[i]) < 1e-6))?.id ?? ""} onChange={(id) => setM(PRESETS.find((p) => p.id === id)!.m)} options={PRESETS.map((p) => ({ id: p.id, label: p.label }))} />
      <div className="mt-3 grid gap-4 md:grid-cols-[300px_1fr]">
        <svg viewBox="0 0 300 300" className="w-full rounded-xl border border-line bg-bg" role="img" aria-label="Transformed grid">
          <defs><clipPath id="mt-clip"><rect width={300} height={300} /></clipPath></defs>
          <g clipPath="url(#mt-clip)">
            <path d={lines.join("")} stroke={GRID} strokeWidth={1} fill="none" />
            <line x1={0} x2={300} y1={O} y2={O} stroke="#3a4060" /><line y1={0} y2={300} x1={O} x2={O} stroke="#3a4060" />
            <motion.polygon animate={{ points: sq }} fill={AI} opacity={0.18} stroke={AI} />
            {es.map((e, i) => <line key={i} x1={O - e.v[0] * 200} y1={O + e.v[1] * 200} x2={O + e.v[0] * 200} y2={O - e.v[1] * 200} stroke={LIME} strokeDasharray="5 5" opacity={0.7} />)}
            {[[1, 0, "#ff8fa3"], [0, 1, "#7cc4ff"]].map(([x, y, col]) => { const [px, py] = P(x as number, y as number); return <motion.line key={String(col)} animate={{ x2: px, y2: py }} x1={O} y1={O} stroke={col as string} strokeWidth={3} />; })}
          </g>
        </svg>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <Slider label="a (top left)" value={a} min={-2} max={2} step={0.05} onChange={set(0)} fmt={(v) => v.toFixed(2)} />
            <Slider label="b (top right)" value={b} min={-2} max={2} step={0.05} onChange={set(1)} fmt={(v) => v.toFixed(2)} />
            <Slider label="c (bottom left)" value={c} min={-2} max={2} step={0.05} onChange={set(2)} fmt={(v) => v.toFixed(2)} />
            <Slider label="d (bottom right)" value={d} min={-2} max={2} step={0.05} onChange={set(3)} fmt={(v) => v.toFixed(2)} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Stat k="Determinant" v={det.toFixed(2)} sub="area scale of the square" />
            <Stat k="Rank" v={rank} tone={rank < 2 ? "var(--color-bad)" : undefined} sub={rank < 2 ? "plane flattened" : "full rank"} />
            <Stat k="Eigenvalues" v={es.length ? es.map((e) => e.l.toFixed(2)).join(", ") : "none real"} tone={LIME} sub={es.length ? "stretch along dashes" : "it rotates every direction"} />
          </div>
          <p className="text-[12.5px] text-mute">Red arrow: where the first axis goes (the first column, <span className="font-mono">[a, c]</span>). Blue: the second column, <span className="font-mono">[b, d]</span>. Every output is a mix of these two columns.</p>
        </div>
      </div>
    </Frame>
  );
}

// ---------- likelihood, prior and posterior ----------

const lbeta = (x: number, y: number) => lgamma(x) + lgamma(y) - lgamma(x + y);
function lgamma(z: number): number {
  // Lanczos approximation
  const g = 7, c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lgamma(1 - z);
  z -= 1;
  let x = c[0];
  for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}
const betaPdf = (p: number, x: number, y: number) => Math.exp((x - 1) * Math.log(p) + (y - 1) * Math.log(1 - p) - lbeta(x, y));

function Likelihood() {
  const [n, setN] = useState(10);
  const [h, setH] = useState(7);
  const [prior, setPrior] = useState(1);
  const heads = Math.min(h, n);
  const ps = useMemo(() => Array.from({ length: 199 }, (_, i) => (i + 1) / 200), []);
  const curves = useMemo(() => {
    const lik = ps.map((p) => betaPdf(p, heads + 1, n - heads + 1)); // likelihood, normalised to a density
    const pri = ps.map((p) => betaPdf(p, prior, prior));
    const post = ps.map((p) => betaPdf(p, heads + prior, n - heads + prior));
    const top = Math.max(...lik, ...pri, ...post);
    return { lik, pri, post, top };
  }, [ps, heads, n, prior]);
  const mle = heads / n;
  const map = n + 2 * prior - 2 > 0 ? (heads + prior - 1) / (n + 2 * prior - 2) : 0.5;
  const nll = -(heads * Math.log(Math.max(mle, 1e-9)) + (n - heads) * Math.log(Math.max(1 - mle, 1e-9)));
  const W = 600, H = 190;
  const path = (ys: number[]) => ys.map((y, i) => `${i ? "L" : "M"}${20 + ps[i] * (W - 40)},${H - 20 - (y / curves.top) * (H - 40)}`).join("");
  const drive = () => [
    { say: "Seven heads in ten flips. The likelihood curve peaks at 0.7: that's the maximum likelihood estimate.", act: () => { setN(10); setH(7); setPrior(1); } },
    { say: "Add a prior that believes coins are usually fair. The MAP estimate is pulled toward one half: this pull is exactly what regularisation does to weights.", act: () => setPrior(20) },
    { say: "Now gather much more data: seventy heads in a hundred flips. The likelihood becomes sharp and outweighs the prior, so MAP moves back toward the data.", act: () => { setN(100); setH(70); } },
  ];
  return (
    <Frame title="Likelihood, prior and posterior for a coin" about="Pick how many flips you saw and how many were heads. The likelihood peaks at the maximum-likelihood estimate; a prior pulls the estimate (MAP) toward a fair coin." drive={drive}>
      <div className="grid gap-x-4 gap-y-2 sm:grid-cols-3">
        <Slider label="Flips" value={n} min={1} max={200} onChange={(v) => { setN(v); setH((x) => Math.min(x, v)); }} />
        <Slider label="Heads" value={heads} min={0} max={n} onChange={setH} />
        <Slider label="Prior strength (fair-coin belief)" value={prior} min={1} max={60} onChange={setPrior} fmt={(v) => (v === 1 ? "none" : `${v}`)} hint="Beta(k, k) prior; like L2 strength" />
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full rounded-xl border border-line bg-bg" role="img" aria-label="Likelihood curves">
        <line x1={20} x2={W - 20} y1={H - 20} y2={H - 20} stroke={GRID} />
        {[0, 0.25, 0.5, 0.75, 1].map((t) => <text key={t} x={20 + t * (W - 40)} y={H - 6} textAnchor="middle" className="fill-faint font-mono text-[10px]">{t}</text>)}
        {prior > 1 && <path d={path(curves.pri)} fill="none" stroke={MUTE} strokeWidth={2} strokeDasharray="5 4" />}
        <path d={path(curves.lik)} fill="none" stroke={AI} strokeWidth={2.5} />
        {prior > 1 && <path d={path(curves.post)} fill="none" stroke={LIME} strokeWidth={2.5} />}
        <line x1={20 + mle * (W - 40)} x2={20 + mle * (W - 40)} y1={14} y2={H - 20} stroke={AI} strokeDasharray="3 3" />
        {prior > 1 && <line x1={20 + map * (W - 40)} x2={20 + map * (W - 40)} y1={14} y2={H - 20} stroke={LIME} strokeDasharray="3 3" />}
      </svg>
      <div className="mt-2 flex flex-wrap gap-3 text-[11.5px] text-mute">
        <span className="flex items-center gap-1"><span className="h-0.5 w-4 bg-ai" />likelihood of the data</span>
        <span className="flex items-center gap-1"><span className="h-0.5 w-4" style={{ background: MUTE }} />prior</span>
        <span className="flex items-center gap-1"><span className="h-0.5 w-4" style={{ background: LIME }} />posterior (likelihood × prior)</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat k="MLE" v={mle.toFixed(3)} tone={AI} sub="heads / flips" />
        <Stat k="MAP" v={prior > 1 ? map.toFixed(3) : "= MLE"} tone={LIME} sub="pulled toward 0.5" />
        <Stat k="NLL at MLE" v={nll.toFixed(2)} sub="the loss, in nats" />
        <Stat k="Std. error" v={Math.sqrt((mle * (1 - mle)) / n).toFixed(3)} sub="shrinks with √flips" />
      </div>
    </Frame>
  );
}

// ---------- A/B test simulator ----------

type Run = { z: number; sig: boolean; stoppedAt?: number };
const LOOKS = 10;

function simulate(p0: number, lift: number, n: number, peek: boolean, seed: number, runs = 200): Run[] {
  const r = rand(seed);
  const p1 = p0 * (1 + lift);
  const chunk = n / LOOKS;
  const out: Run[] = [];
  for (let k = 0; k < runs; k++) {
    let ca = 0, cb = 0, z = 0, stoppedAt: number | undefined;
    for (let l = 1; l <= LOOKS; l++) {
      // normal approximation to the binomial count of conversions in each chunk
      ca += Math.max(0, chunk * p0 + gauss(r) * Math.sqrt(chunk * p0 * (1 - p0)));
      cb += Math.max(0, chunk * p1 + gauss(r) * Math.sqrt(chunk * p1 * (1 - p1)));
      const m = chunk * l, pa = ca / m, pb = cb / m, pp = (ca + cb) / (2 * m);
      z = (pb - pa) / Math.sqrt(Math.max(1e-12, pp * (1 - pp) * (2 / m)));
      if (peek && Math.abs(z) > 1.96) { stoppedAt = l; break; }
    }
    out.push({ z, sig: Math.abs(z) > 1.96, stoppedAt });
  }
  return out;
}

function AbTestSim() {
  const [p0, setP0] = useState(0.05);
  const [lift, setLift] = useState(0);
  const [n, setN] = useState(20000);
  const [peek, setPeek] = useState(false);
  const [seed, setSeed] = useState(7);
  const runs = useMemo(() => simulate(p0, lift, n, peek, seed), [p0, lift, n, peek, seed]);
  const rate = runs.filter((x) => x.sig).length / runs.length;
  const delta = p0 * Math.max(lift, 0.02);
  const need = Math.ceil((16 * p0 * (1 - p0)) / (delta * delta));
  const drive = () => [
    { say: "No real difference, twenty thousand users per group, no peeking. About five percent of experiments still come out significant. That's the false-positive rate we agreed to.", act: () => { setLift(0); setPeek(false); setN(20000); } },
    { say: "Now peek ten times and stop at the first significant result. The false-positive rate jumps to roughly twenty percent.", act: () => setPeek(true) },
    { say: "Give the treatment a real five percent lift, stop peeking. With twenty thousand users we only detect it a minority of the time: the test is underpowered.", act: () => { setPeek(false); setLift(0.05); } },
    { say: "Raise the sample to around a hundred and fifty thousand per group, near what the sample-size rule asks for, and power climbs to about eighty percent.", act: () => setN(150000) },
  ];
  const W = 600, H = 120;
  return (
    <Frame title="A/B test simulator: false positives, power and peeking" about="Each dot is one simulated experiment's z-score. Dots beyond the dashed lines are 'significant' at 5%. Change the true lift, the sample size, and whether you peek." drive={drive}>
      <div className="grid gap-x-4 gap-y-2 sm:grid-cols-3">
        <Slider label="Baseline conversion" value={p0} min={0.01} max={0.2} step={0.005} onChange={setP0} fmt={(v) => pct(v, 1)} />
        <Slider label="Users per group" value={n} min={2000} max={300000} step={1000} onChange={setN} fmt={(v) => v.toLocaleString()} />
        <div className="space-y-2">
          <Chips label="True lift" value={lift} onChange={setLift} options={[0, 0.02, 0.05, 0.1].map((v) => ({ id: v, label: v ? `+${v * 100}%` : "none" }))} />
          <Chips label="Peeking" value={peek ? 1 : 0} onChange={(v) => setPeek(!!v)} options={[{ id: 0, label: "fixed end" }, { id: 1, label: "stop when p<0.05 (10 looks)" }]} />
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full rounded-xl border border-line bg-bg" role="img" aria-label="z-scores of simulated experiments">
        {[-1.96, 1.96].map((t) => <line key={t} x1={W / 2 + t * 50} x2={W / 2 + t * 50} y1={6} y2={H - 16} stroke={LIME} strokeDasharray="4 4" />)}
        <line x1={W / 2} x2={W / 2} y1={6} y2={H - 16} stroke={GRID} />
        {runs.map((x, i) => <circle key={i} cx={Math.max(6, Math.min(W - 6, W / 2 + x.z * 50))} cy={12 + ((i * 53) % 88)} r={3} fill={x.sig ? (lift ? LIME : "var(--color-bad)") : MUTE} opacity={0.85} />)}
        <text x={W / 2} y={H - 4} textAnchor="middle" className="fill-faint font-mono text-[10px]">z-score (0 = no difference observed)</text>
      </svg>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div className="grid flex-1 grid-cols-3 gap-2">
          <Stat k={lift ? "Power (detected)" : "False positives"} v={pct(rate)} tone={lift ? LIME : rate > 0.08 ? "var(--color-bad)" : undefined} sub={lift ? "aim for 80%" : "should be ≈5%"} />
          <Stat k="Experiments" v={runs.length} sub={peek ? `${runs.filter((x) => x.stoppedAt).length} stopped early` : "each runs to the end"} />
          <Stat k="n for 80% power" v={need.toLocaleString()} sub={`per group, ${pct(Math.max(lift, 0.02))} lift`} />
        </div>
        <Button size="sm" onClick={() => setSeed((s) => s + 1)}><Play size={14} />Run again</Button>
        <Button size="sm" onClick={() => { setP0(0.05); setLift(0); setN(20000); setPeek(false); setSeed(7); }}><RotateCcw size={14} />Reset</Button>
      </div>
      <p className={cn("mt-2 text-[12.5px] text-mute")}>Sample size uses Lehr&apos;s rule, n ≈ 16σ²/δ², for the chosen lift (2% when there is none).</p>
    </Frame>
  );
}


// ---------- bias and variance: fitting polynomials ----------

const truth = (x: number) => Math.sin(Math.PI * x) + 0.3 * x; // on [-1, 1]
const cheb = (x: number, d: number) => { const t = [1, x]; for (let k = 2; k <= d; k++) t.push(2 * x * t[k - 1] - t[k - 2]); return t.slice(0, d + 1); };
function solve(A: number[][], b: number[]) {
  const n = b.length, M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    [M[c], M[piv]] = [M[piv], M[c]];
    const d = M[c][c] || 1e-12;
    for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / d; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
  }
  return M.map((r, i) => r[n] / (r[i] || 1e-12));
}
function polyFit(xs: number[], ys: number[], d: number) {
  const k = d + 1, A = Array.from({ length: k }, () => Array(k).fill(0)), b = Array(k).fill(0);
  xs.forEach((x, i) => { const t = cheb(x, d); for (let a = 0; a < k; a++) { b[a] += t[a] * ys[i]; for (let c = 0; c < k; c++) A[a][c] += t[a] * t[c]; } });
  for (let a = 0; a < k; a++) A[a][a] += 1e-7;
  const w = solve(A, b);
  return (x: number) => cheb(x, d).reduce((s, t, i) => s + t * w[i], 0);
}
function sample(n: number, noise: number, seed: number) {
  const r = rand(seed), xs: number[] = [], ys: number[] = [];
  for (let i = 0; i < n; i++) { const x = -1 + 2 * r(); xs.push(x); ys.push(truth(x) + gauss(r) * noise); }
  return { xs, ys };
}

function BiasVariance() {
  const [deg, setDeg] = useState(3);
  const [n, setN] = useState(20);
  const [seed, setSeed] = useState(1);
  const [ghosts, setGhosts] = useState(true);
  const noise = 0.25;
  const data = useMemo(() => sample(n, noise, seed), [n, seed]);
  const fit = useMemo(() => polyFit(data.xs, data.ys, deg), [data, deg]);
  const others = useMemo(() => (ghosts ? [11, 12, 13, 14, 15, 16].map((s) => { const d = sample(n, noise, s * 97 + seed); return polyFit(d.xs, d.ys, deg); }) : []), [ghosts, n, deg, seed]);
  const curve = useMemo(() => {
    const test = sample(400, noise, 999);
    return Array.from({ length: 15 }, (_, i) => {
      const d = i + 1;
      let tr = 0, te = 0;
      for (let s = 0; s < 6; s++) {
        const smp = sample(n, noise, s * 31 + 5), f = polyFit(smp.xs, smp.ys, d);
        tr += smp.xs.reduce((a, x, j) => a + (f(x) - smp.ys[j]) ** 2, 0) / n;
        te += test.xs.reduce((a, x, j) => a + Math.min(4, (f(x) - test.ys[j]) ** 2), 0) / test.xs.length;
      }
      return { d, tr: tr / 6, te: te / 6 };
    });
  }, [n]);
  const W = 420, H = 230, X = (x: number) => 14 + ((x + 1) / 2) * (W - 28), Y = (y: number) => H / 2 - y * 70;
  const line = (f: (x: number) => number) => Array.from({ length: 121 }, (_, i) => -1 + i / 60).map((x, i) => `${i ? "L" : "M"}${X(x)},${Math.max(-40, Math.min(H + 40, Y(f(x))))}`).join("");
  const cur = curve[deg - 1];
  const verdict = deg <= 1 ? "underfitting: too rigid (high bias)" : cur.te > curve.reduce((m, c) => Math.min(m, c.te), 9) * 1.5 && deg > 5 ? "overfitting: chasing noise (high variance)" : "a good balance";
  const maxE = Math.max(...curve.map((c) => c.te)) * 1.05;
  const drive = () => [
    { say: "A straight line can't bend to follow the curve. Training and test error are both high: that's bias.", act: () => { setDeg(1); setN(20); setGhosts(true); } },
    { say: "Degree three follows the shape and ignores most of the noise. The faint fits, each trained on a different sample, all agree.", act: () => setDeg(3) },
    { say: "Degree twelve passes near every training point but wiggles wildly, and each resampled fit wiggles differently: that disagreement is variance.", act: () => setDeg(12) },
    { say: "Keep degree twelve but give it sixty points. More data pins the curve down and the variance shrinks.", act: () => setN(60) },
  ];
  return (
    <Frame title="Underfitting, overfitting, bias and variance" about="Fit a polynomial to noisy points from the dashed curve. Faint lines are the same model trained on other samples: their spread is variance. The right chart shows average training and test error by degree." drive={drive}>
      <div className="grid gap-x-4 gap-y-2 sm:grid-cols-3">
        <Slider label="Polynomial degree (capacity)" value={deg} min={1} max={15} onChange={setDeg} />
        <Slider label="Training points" value={n} min={8} max={80} onChange={setN} />
        <div className="flex flex-wrap items-end gap-2">
          <Chips value={ghosts ? 1 : 0} onChange={(v) => setGhosts(!!v)} options={[{ id: 1, label: "show other samples" }, { id: 0, label: "hide" }]} />
          <Button size="sm" onClick={() => setSeed((s) => s + 1)}><RotateCcw size={14} />New sample</Button>
        </div>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-[1.4fr_1fr]">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-xl border border-line bg-bg" role="img" aria-label="Polynomial fit">
          <defs><clipPath id="bv-clip"><rect width={W} height={H} /></clipPath></defs>
          <g clipPath="url(#bv-clip)">
            {others.map((f, i) => <path key={i} d={line(f)} fill="none" stroke={AI} strokeWidth={1} opacity={0.22} />)}
            <path d={line(truth)} fill="none" stroke={MUTE} strokeWidth={2} strokeDasharray="5 4" />
            <path d={line(fit)} fill="none" stroke={AI} strokeWidth={2.5} />
            {data.xs.map((x, i) => <circle key={i} cx={X(x)} cy={Y(data.ys[i])} r={3.2} fill={LIME} />)}
          </g>
        </svg>
        <svg viewBox="0 0 260 230" className="w-full rounded-xl border border-line bg-bg" role="img" aria-label="Error by degree">
          {(["tr", "te"] as const).map((k) => <path key={k} d={curve.map((c, i) => `${i ? "L" : "M"}${20 + (c.d - 1) * 16},${200 - (c[k] / maxE) * 180}`).join("")} fill="none" stroke={k === "tr" ? LIME : AI} strokeWidth={2} />)}
          <line x1={20 + (deg - 1) * 16} x2={20 + (deg - 1) * 16} y1={12} y2={200} stroke="#fff" opacity={0.3} strokeDasharray="3 3" />
          <text x={130} y={222} textAnchor="middle" className="fill-faint text-[10px]">degree 1 → 15</text>
          <text x={24} y={22} className="fill-faint text-[10px]"><tspan fill="var(--color-ai)">test error</tspan> · <tspan fill={LIME}>training error</tspan></text>
        </svg>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat k="Training error" v={cur.tr.toFixed(3)} tone={LIME} />
        <Stat k="Test error" v={cur.te.toFixed(3)} tone={AI} sub={`noise floor ${(noise * noise).toFixed(3)}`} />
        <Stat k="Verdict" v={deg <= 1 ? "High bias" : verdict.startsWith("over") ? "High variance" : "Balanced"} sub={verdict} />
      </div>
    </Frame>
  );
}

// ---------- loss shapes ----------

function LossShapes() {
  const [mode, setMode] = useState<"cls" | "reg">("cls");
  const [gamma, setGamma] = useState(2);
  const [delta, setDelta] = useState(1);
  const [tau, setTau] = useState(0.5);
  const [outlier, setOutlier] = useState(9);
  const W = 420, H = 220;
  const sig = (z: number) => 1 / (1 + Math.exp(-z));
  const cls: { k: string; col: string; f: (m: number) => number }[] = [
    { k: "0–1 (accuracy)", col: MUTE, f: (m) => (m < 0 ? 1 : 0) },
    { k: "log-loss", col: AI, f: (m) => Math.log(1 + Math.exp(-m)) },
    { k: "hinge", col: LIME, f: (m) => Math.max(0, 1 - m) },
    { k: "squared", col: "#ff8fa3", f: (m) => (1 - m) ** 2 / 4 },
    { k: `focal γ=${gamma}`, col: "#7cc4ff", f: (m) => -((1 - sig(m)) ** gamma) * Math.log(sig(m)) },
  ];
  const huber = (e: number) => (Math.abs(e) <= delta ? 0.5 * e * e : delta * (Math.abs(e) - 0.5 * delta));
  const reg: { k: string; col: string; f: (e: number) => number }[] = [
    { k: "squared (MSE)", col: "#ff8fa3", f: (e) => e * e },
    { k: "absolute (MAE)", col: LIME, f: (e) => Math.abs(e) },
    { k: `Huber δ=${delta}`, col: AI, f: huber },
    { k: `quantile τ=${tau}`, col: "#7cc4ff", f: (e) => Math.max(tau * e, (tau - 1) * e) },
  ];
  const curves = mode === "cls" ? cls : reg;
  const X = (v: number) => 20 + ((v + 3) / 6) * (W - 40), Y = (l: number) => H - 24 - Math.min(l, 4) * ((H - 40) / 4);
  // the constant each regression loss would predict for nine points plus one outlier
  const pts = [2, 2.5, 3, 3.2, 3.5, 3.8, 4, 4.5, 5, outlier];
  const best = (f: (e: number) => number) => { let bc = 0, bl = Infinity; for (let c = 0; c <= 12; c += 0.01) { const l = pts.reduce((a, y) => a + f(y - c), 0); if (l < bl) { bl = l; bc = c; } } return bc; };
  const drive = () => [
    { say: "These are classification losses plotted against the margin: positive means the prediction is on the correct side. Accuracy is a step with no slope to follow. Log-loss is its smooth stand-in.", act: () => setMode("cls") },
    { say: "Hinge loss goes flat after a margin of one: it stops caring about examples that are already safely right. Focal loss shrinks easy examples even faster.", act: () => setGamma(3) },
    { say: "Now regression. Drag the outlier far out: the mean, which squared error predicts, chases it; the median from absolute error hardly moves; Huber sits in between.", act: () => { setMode("reg"); setOutlier(12); } },
  ];
  return (
    <Frame title="Loss functions, side by side" about="How much each loss charges for a mistake. Classification losses are plotted against the margin (correct side is positive); regression losses against the error. Below, see what single number each regression loss predicts when one point is an outlier." drive={drive}>
      <Chips value={mode} onChange={setMode} options={[{ id: "cls", label: "Classification (margin)" }, { id: "reg", label: "Regression (error)" }]} />
      <div className="mt-3 grid gap-3 md:grid-cols-[1.4fr_1fr]">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-xl border border-line bg-bg" role="img" aria-label="Loss curves">
          <line x1={20} x2={W - 20} y1={H - 24} y2={H - 24} stroke={GRID} /><line x1={X(0)} x2={X(0)} y1={8} y2={H - 24} stroke={GRID} />
          {curves.map((c) => <path key={c.k} d={Array.from({ length: 241 }, (_, i) => -3 + i / 40).map((v, i) => `${i ? "L" : "M"}${X(v)},${Y(c.f(v))}`).join("")} fill="none" stroke={c.col} strokeWidth={2.2} />)}
          <text x={W / 2} y={H - 6} textAnchor="middle" className="fill-faint text-[10px]">{mode === "cls" ? "margin y·s  (← wrong side | right side →)" : "error y − ŷ"}</text>
        </svg>
        <div className="space-y-2">
          {curves.map((c) => <div key={c.k} className="flex items-center gap-2 text-[12.5px]"><span className="h-0.5 w-5" style={{ background: c.col }} />{c.k}</div>)}
          {mode === "cls" ? <Slider label="Focal γ" value={gamma} min={0} max={5} step={0.5} onChange={setGamma} /> : <>
            <Slider label="Huber δ" value={delta} min={0.2} max={3} step={0.1} onChange={setDelta} fmt={(v) => v.toFixed(1)} />
            <Slider label="Quantile τ" value={tau} min={0.05} max={0.95} step={0.05} onChange={setTau} fmt={(v) => v.toFixed(2)} />
          </>}
        </div>
      </div>
      {mode === "reg" && (
        <div className="mt-3 rounded-xl border border-line bg-bg p-3">
          <Slider label="Outlier value" value={outlier} min={5} max={12} step={0.1} onChange={setOutlier} fmt={(v) => v.toFixed(1)} />
          <svg viewBox="0 0 600 56" className="mt-2 w-full" role="img" aria-label="Constant predicted by each loss">
            <line x1={20} x2={580} y1={30} y2={30} stroke={GRID} />
            {pts.map((y, i) => <circle key={i} cx={20 + (y / 12) * 560} cy={30} r={4} fill={i === pts.length - 1 ? "var(--color-bad)" : MUTE} />)}
            {reg.map((c, i) => { const v = best(c.f); return <g key={c.k}><motion.line animate={{ x1: 20 + (v / 12) * 560, x2: 20 + (v / 12) * 560 }} y1={8 + i * 3} y2={52 - i * 3} stroke={c.col} strokeWidth={2.5} /></g>; })}
          </svg>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{reg.map((c) => <Stat key={c.k} k={c.k} v={best(c.f).toFixed(2)} tone={c.col} />)}</div>
        </div>
      )}
    </Frame>
  );
}

// ---------- L1 vs L2 regularisation ----------

function regData() {
  const r = rand(42), n = 80, X: number[][] = [], y: number[] = [];
  const beta = [3, -2, 1, 0.5, 0, 0];
  for (let i = 0; i < n; i++) {
    const a = gauss(r), row = [a, gauss(r), gauss(r), gauss(r), a * 0.9 + gauss(r) * 0.3, gauss(r)]; // feature 5 correlates with 1
    X.push(row);
    y.push(row.reduce((s, x, j) => s + x * beta[j], 0) + gauss(r) * 1.2);
  }
  return { X, y };
}
function ridge(X: number[][], y: number[], lam: number) {
  const p = X[0].length, n = X.length, A = Array.from({ length: p }, () => Array(p).fill(0)), b = Array(p).fill(0);
  X.forEach((row, i) => { for (let a = 0; a < p; a++) { b[a] += row[a] * y[i] / n; for (let c = 0; c < p; c++) A[a][c] += row[a] * row[c] / n; } });
  for (let a = 0; a < p; a++) A[a][a] += lam;
  return solve(A, b);
}
function lasso(X: number[][], y: number[], lam: number) {
  const p = X[0].length, n = X.length, w = Array(p).fill(0);
  const col2 = Array.from({ length: p }, (_, j) => X.reduce((s, r) => s + r[j] * r[j], 0) / n);
  for (let it = 0; it < 200; it++) for (let j = 0; j < p; j++) {
    let rho = 0;
    for (let i = 0; i < n; i++) { let pred = 0; for (let k = 0; k < p; k++) if (k !== j) pred += X[i][k] * w[k]; rho += X[i][j] * (y[i] - pred) / n; }
    w[j] = Math.sign(rho) * Math.max(0, Math.abs(rho) - lam / 2) / col2[j];
  }
  return w;
}
const FEAT = ["x₁ (strong)", "x₂ (strong, −)", "x₃", "x₄ (weak)", "x₅ (copy of x₁)", "x₆ (noise)"];
const FCOL = [AI, "#ff8fa3", LIME, "#7cc4ff", "#f5b547", MUTE];

function RegularisationPaths() {
  const [s, setS] = useState(0.35);
  const [kind, setKind] = useState<"l1" | "l2">("l1");
  const data = useMemo(regData, []);
  const grid = useMemo(() => Array.from({ length: 41 }, (_, i) => i / 40), []);
  const paths = useMemo(() => grid.map((g) => { const lam = 10 ** (-3 + 4 * g); return kind === "l1" ? lasso(data.X, data.y, lam * 2) : ridge(data.X, data.y, lam * 3); }), [grid, data, kind]);
  const lam = 10 ** (-3 + 4 * s);
  const w = kind === "l1" ? lasso(data.X, data.y, lam * 2) : ridge(data.X, data.y, lam * 3);
  const zeros = w.filter((x) => Math.abs(x) < 1e-6).length;
  // 2-D picture: quadratic loss around w* and the constraint ball of radius t
  const ws: [number, number] = [2.4, 0.45];
  const t = 2.6 * (1 - s);
  const lossAt = (a: number, b: number) => { const da = a - ws[0], db = b - ws[1]; return da * da * 1 + db * db * 2.5 + da * db * 1.2; };
  const sol = useMemo(() => {
    if ((kind === "l1" ? Math.abs(ws[0]) + Math.abs(ws[1]) : Math.hypot(ws[0], ws[1])) <= t) return ws;
    let best: [number, number] = [0, 0], bl = Infinity;
    for (let k = 0; k < 1440; k++) {
      const th = (k / 1440) * 2 * Math.PI, c = Math.cos(th), sn = Math.sin(th);
      const r = kind === "l1" ? t / (Math.abs(c) + Math.abs(sn)) : t;
      const a = r * c, b = r * sn, l = lossAt(a, b);
      if (l < bl) { bl = l; best = [a, b]; }
    }
    return best;
  }, [kind, t]);
  const S2 = 40, O2 = 110, P2 = (a: number, b: number) => [O2 + a * S2, O2 - b * S2];
  const level = lossAt(sol[0], sol[1]);
  const ellipse = (L: number) => Array.from({ length: 121 }, (_, i) => {
    const th = (i / 120) * 2 * Math.PI, c = Math.cos(th), sn = Math.sin(th);
    const q = c * c * 1 + sn * sn * 2.5 + c * sn * 1.2, r = Math.sqrt(L / q);
    const [x, y] = P2(ws[0] + r * c, ws[1] + r * sn); return `${i ? "L" : "M"}${x},${y}`;
  }).join("");
  const ball = kind === "l1" ? [P2(t, 0), P2(0, t), P2(-t, 0), P2(0, -t)].map(([x, y]) => `${x},${y}`).join(" ") : "";
  const drive = () => [
    { say: "With L1 and weak regularisation every feature keeps a weight. Increase the strength: the noise feature and the weak one hit exactly zero first, and stay there.", act: () => { setKind("l1"); setS(0.55); } },
    { say: "On the right, the diamond is the L1 budget. The loss contours touch it at a corner, where one weight is exactly zero.", act: () => setS(0.6) },
    { say: "Switch to L2. Now the budget is a circle: the contours touch it at a generic point, so weights shrink together but none becomes exactly zero.", act: () => setKind("l2") },
  ];
  return (
    <Frame title="L1 vs L2: shrinking weights" about="Left: each feature's weight as regularisation strength grows. Right: the same idea in two dimensions: loss contours meet the penalty's budget shape (diamond for L1, circle for L2)." drive={drive}>
      <div className="flex flex-wrap items-center gap-3">
        <Chips value={kind} onChange={setKind} options={[{ id: "l1", label: "L1 (lasso)" }, { id: "l2", label: "L2 (ridge)" }]} />
        <div className="min-w-[220px] flex-1"><Slider label="Regularisation strength" value={s} min={0} max={1} step={0.01} onChange={setS} fmt={() => `λ = ${lam < 0.01 ? lam.toExponential(1) : lam.toFixed(2)}`} /></div>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-[1.4fr_1fr]">
        <svg viewBox="0 0 420 220" className="w-full rounded-xl border border-line bg-bg" role="img" aria-label="Coefficient paths">
          <line x1={20} x2={400} y1={110} y2={110} stroke={GRID} />
          {FEAT.map((_, j) => <path key={j} d={paths.map((p, i) => `${i ? "L" : "M"}${20 + grid[i] * 380},${110 - p[j] * 30}`).join("")} fill="none" stroke={FCOL[j]} strokeWidth={2} />)}
          <line x1={20 + s * 380} x2={20 + s * 380} y1={8} y2={212} stroke="#fff" opacity={0.35} strokeDasharray="3 3" />
          <text x={210} y={214} textAnchor="middle" className="fill-faint text-[10px]">weak → strong regularisation</text>
        </svg>
        <svg viewBox="0 0 220 220" className="w-full rounded-xl border border-line bg-bg" role="img" aria-label="Constraint geometry">
          <line x1={0} x2={220} y1={O2} y2={O2} stroke={GRID} /><line y1={0} y2={220} x1={O2} x2={O2} stroke={GRID} />
          {[0.25, 1, 2.2].map((m) => <path key={m} d={ellipse(level * m)} fill="none" stroke={AI} opacity={m === 1 ? 0.9 : 0.35} />)}
          {kind === "l1" ? <polygon points={ball} fill={LIME} opacity={0.15} stroke={LIME} /> : <circle cx={O2} cy={O2} r={t * S2} fill={LIME} opacity={0.15} stroke={LIME} />}
          <circle cx={P2(...ws)[0]} cy={P2(...ws)[1]} r={3} fill={AI} />
          <motion.circle animate={{ cx: P2(sol[0], sol[1])[0], cy: P2(sol[0], sol[1])[1] }} r={5} fill="#fff" />
          <text x={6} y={14} className="fill-faint text-[9.5px]">● unregularised best · ○ regularised</text>
        </svg>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-mute">{FEAT.map((f, j) => <span key={f} className="flex items-center gap-1"><span className="h-0.5 w-4" style={{ background: FCOL[j] }} />{f}: <span className="num font-mono">{w[j].toFixed(2)}</span></span>)}</div>
      <div className="mt-2 grid grid-cols-2 gap-2"><Stat k="Weights exactly zero" v={`${zeros} of 6`} tone={zeros ? LIME : undefined} /><Stat k="2-D solution" v={`(${sol[0].toFixed(2)}, ${sol[1].toFixed(2)})`} sub={kind === "l1" && Math.min(Math.abs(sol[0]), Math.abs(sol[1])) < 0.03 ? "on a corner: one weight is 0" : "no exact zero"} /></div>
    </Frame>
  );
}

export const AI_WIDGETS_3: Record<string, ComponentType> = {
  "matrix-transform": MatrixTransform, likelihood: Likelihood, "ab-test-sim": AbTestSim,
  "bias-variance": BiasVariance, "loss-shapes": LossShapes, "regularisation-paths": RegularisationPaths,
};
