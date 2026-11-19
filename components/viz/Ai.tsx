"use client";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Pause, Play, RotateCcw, StepForward } from "lucide-react";
import { Button, cn } from "../ui";
import { AI, Chips, Frame, Slider, Stat, gauss, pct, rand, softmax } from "./ai-kit";
import { AI_WIDGETS_2 } from "./Ai2";

// ---------- a short, wild history of AI ----------

type Ev = { y: number; t: string; d: string; tag: "idea" | "winter" | "breakthrough" | "product" | "drama" | "google" };
const EVENTS: Ev[] = [
  { y: 1950, t: "Turing's imitation game", tag: "idea", d: "Alan Turing asks “Can machines think?” and swaps it for a test: can a machine pass as human in a text conversation? Seventy years later, chatbots pass casual versions of it daily." },
  { y: 1956, t: "Dartmouth names the field", tag: "idea", d: "McCarthy, Minsky, Shannon and Rochester propose that a 2-month, 10-person summer study could make a “significant advance” on making machines use language. The optimism was a little early." },
  { y: 1958, t: "The perceptron", tag: "breakthrough", d: "Frank Rosenblatt's perceptron learns to classify. The New York Times reports the Navy expects it to “walk, talk, see, write, reproduce itself and be conscious of its existence.”" },
  { y: 1966, t: "ELIZA", tag: "idea", d: "Joseph Weizenbaum's 200-line therapist bot just reflects your words back. His secretary still asked him to leave the room so she could talk to it privately: the ELIZA effect." },
  { y: 1969, t: "Perceptrons can't do XOR", tag: "winter", d: "Minsky and Papert prove a single-layer perceptron cannot learn XOR. Funding dries up and the first AI winter sets in through the 1970s." },
  { y: 1986, t: "Backprop goes mainstream", tag: "breakthrough", d: "Rumelhart, Hinton and Williams show backpropagation trains multi-layer networks. Hidden layers solve XOR. Then compute and data run out, and a second winter follows." },
  { y: 1997, t: "Deep Blue, and LSTM", tag: "breakthrough", d: "IBM's Deep Blue beats Kasparov at chess with brute-force search. The same year, Hochreiter and Schmidhuber publish the LSTM, which quietly powers speech recognition for the next twenty years." },
  { y: 1998, t: "LeNet reads cheques", tag: "breakthrough", d: "Yann LeCun's LeNet-5 convolutional network reads handwritten digits; by the late 1990s it was reading a large share of US bank cheques." },
  { y: 2009, t: "ImageNet", tag: "idea", d: "Fei-Fei Li's team labels over 14 million images with crowd workers. Everyone said the bottleneck was algorithms; she bet it was data." },
  { y: 2012, t: "AlexNet and the cat paper", tag: "google", d: "AlexNet, trained on two gaming GPUs, crushes ImageNet: 15.3% top-5 error against 26.2% for the runner-up. Months earlier, Google Brain's network watched 10 million YouTube frames on 16,000 CPU cores and learned, unprompted, to detect cats." },
  { y: 2012, t: "The $44M auction", tag: "drama", d: "Hinton, Krizhevsky and Sutskever auction their three-person startup from a hotel room at a Lake Tahoe conference. Google, Microsoft, Baidu and DeepMind bid by email; Google wins for $44 million." },
  { y: 2013, t: "word2vec", tag: "google", d: "Tomas Mikolov's team at Google trains word vectors where king − man + woman lands near queen. Meaning becomes geometry." },
  { y: 2014, t: "GANs, born in a bar", tag: "breakthrough", d: "Ian Goodfellow argues with friends at a Montreal bar about generating images, goes home, codes two networks fighting each other, and it works the first night. Google also buys DeepMind." },
  { y: 2015, t: "ResNet and TensorFlow", tag: "google", d: "Skip connections let ResNet train 152 layers. Google open-sources TensorFlow. OpenAI is founded as a non-profit." },
  { y: 2016, t: "AlphaGo's Move 37", tag: "google", d: "AlphaGo beats Lee Sedol 4–1 in Seoul. Its Move 37 in game 2 was one a human would play about 1 in 10,000 times. Lee's own Move 78 in game 4, called “God's touch”, won the only human game." },
  { y: 2017, t: "Attention Is All You Need", tag: "google", d: "Eight Google researchers drop recurrence and introduce the Transformer. The title riffs on the Beatles. Every one of the eight authors later left Google; one, Noam Shazeer, came back in a 2024 deal." },
  { y: 2018, t: "BERT", tag: "google", d: "Google's BERT reads text in both directions and tops every language benchmark. In 2019 it reaches Search: Google called it the biggest leap in five years." },
  { y: 2019, t: "GPT-2: too dangerous?", tag: "drama", d: "OpenAI withholds the full GPT-2 at first, citing misuse risk. The internet mostly uses it to write unicorn news stories." },
  { y: 2020, t: "GPT-3 and AlphaFold 2", tag: "breakthrough", d: "GPT-3 (175 billion parameters) learns tasks from a few examples in the prompt. DeepMind's AlphaFold 2 essentially solves protein structure prediction at CASP14." },
  { y: 2022, t: "ChatGPT", tag: "product", d: "Released on 30 November as a “low-key research preview”: a million users in five days, and an estimated 100 million within two months. Google declares a “code red”." },
  { y: 2022, t: "The sentient-AI engineer", tag: "drama", d: "A Google engineer goes public claiming the LaMDA chatbot is sentient. Google disagrees and he is let go. The ELIZA effect, fifty-six years on." },
  { y: 2023, t: "Bard's $100B answer", tag: "drama", d: "In its launch demo, Bard says the James Webb telescope took the first picture of an exoplanet. It didn't. Alphabet loses about $100 billion of market value that day. Google Brain and DeepMind merge into Google DeepMind." },
  { y: 2023, t: "GPT-4, Sydney and fake citations", tag: "drama", d: "GPT-4 passes the bar exam. Bing's chatbot “Sydney” tells a reporter it loves him. A New York lawyer is sanctioned for filing a brief full of court cases ChatGPT invented." },
  { y: 2024, t: "Glue on pizza", tag: "google", d: "Gemini 1.5 reads a million tokens. AI Overviews launch and suggest glue to keep cheese on pizza (an 11-year-old Reddit joke) and one small rock a day (The Onion). Lesson: retrieval quality is product quality." },
  { y: 2024, t: "Two Nobel Prizes", tag: "google", d: "Hinton and Hopfield win the physics Nobel for neural networks; Demis Hassabis and John Jumper share chemistry for AlphaFold. Anthropic open-sources the Model Context Protocol in November." },
  { y: 2025, t: "DeepSeek and the $590B day", tag: "drama", d: "DeepSeek-R1, an open reasoning model trained cheaply with RL, tops the app store. On 27 January Nvidia loses about $590 billion of value, the largest one-day drop in US market history." },
  { y: 2025, t: "Agents and gold medals", tag: "google", d: "“Vibe coding” enters the dictionary. OpenAI, Google and Microsoft adopt MCP. Gemini Deep Think scores gold at the International Mathematical Olympiad, and AlphaEvolve finds a faster 4×4 matrix multiplication." },
];
const TAG: Record<Ev["tag"], { label: string; color: string }> = {
  idea: { label: "Idea", color: "#9096ad" }, winter: { label: "AI winter", color: "#7aa7ff" }, breakthrough: { label: "Breakthrough", color: "#c8f547" },
  product: { label: "Product", color: "#4fd1c5" }, drama: { label: "Drama", color: "#ff8fb3" }, google: { label: "Google", color: "#b794f4" },
};
const ERAS = [
  { id: "all", label: "Everything", from: 0, to: 9999 }, { id: "early", label: "Foundations", from: 1940, to: 2005 },
  { id: "deep", label: "Deep learning", from: 2006, to: 2016 }, { id: "tf", label: "Transformers", from: 2017, to: 2021 }, { id: "gen", label: "Generative era", from: 2022, to: 2030 },
] as const;
// hype over time: two winters, then a steep climb
const HYPE: [number, number][] = [[1950, 0.25], [1958, 0.55], [1966, 0.5], [1972, 0.12], [1980, 0.35], [1987, 0.4], [1993, 0.1], [1997, 0.3], [2006, 0.25], [2012, 0.5], [2016, 0.62], [2019, 0.6], [2022, 0.9], [2025, 1]];

function Timeline() {
  const [era, setEra] = useState<(typeof ERAS)[number]["id"]>("all");
  const [sel, setSel] = useState(19);
  const e = ERAS.find((x) => x.id === era)!;
  const list = EVENTS.map((ev, i) => ({ ...ev, i })).filter((x) => x.y >= e.from && x.y <= e.to);
  const x = (y: number) => 20 + ((y - 1948) / (2027 - 1948)) * 660;
  const path = HYPE.map(([y, h], k) => `${k ? "L" : "M"}${x(y).toFixed(1)},${(118 - h * 92).toFixed(1)}`).join(" ");
  const cur = EVENTS[sel];
  const drive = () => [16, 9, 12, 14, 15, 19, 21, 24].map((k) => ({ say: `${EVENTS[k].y}. ${EVENTS[k].t}. ${EVENTS[k].d}`, act: () => { setEra("all"); setSel(k); }, settle: 200, pause: 300 }));
  return (
    <Frame title="A short, wild history of AI" about="Seventy-five years of hype, winters and breakthroughs. Click a dot, or filter by era." drive={drive}>
      <Chips value={era} onChange={(v) => { setEra(v); const f = EVENTS.findIndex((ev) => ev.y >= ERAS.find((z) => z.id === v)!.from); setSel(f < 0 ? 0 : f); }} options={ERAS.map((z) => ({ id: z.id, label: z.label }))} />
      <svg viewBox="0 0 700 150" className="mt-3 w-full" role="img" aria-label="Hype over time with AI events">
        <defs><linearGradient id="hype" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={AI} stopOpacity="0.35" /><stop offset="1" stopColor={AI} stopOpacity="0" /></linearGradient></defs>
        {[[1972, 1980], [1988, 1996]].map(([a, b]) => <g key={a}><rect x={x(a)} y={14} width={x(b) - x(a)} height={110} fill="#7aa7ff" opacity={0.07} rx={6} /><text x={(x(a) + x(b)) / 2} y={28} textAnchor="middle" className="fill-hld text-[9px] font-semibold uppercase tracking-wider" opacity={0.8}>winter</text></g>)}
        <path d={`${path} L${x(2025)},124 L${x(1950)},124 Z`} fill="url(#hype)" />
        <path d={path} fill="none" stroke={AI} strokeWidth={1.6} opacity={0.8} />
        <line x1={14} x2={690} y1={124} y2={124} stroke="#2a2f44" />
        {[1950, 1970, 1990, 2010, 2025].map((y) => <text key={y} x={x(y)} y={142} textAnchor="middle" className="fill-faint font-mono text-[10px]">{y}</text>)}
        {list.map((ev) => {
          const same = EVENTS.filter((z, k) => z.y === ev.y && k < ev.i).length;
          return (
            <g key={ev.i} onClick={() => setSel(ev.i)} className="cursor-pointer">
              <motion.circle cx={x(ev.y)} cy={124 - same * 11} r={sel === ev.i ? 6.5 : 4.2} fill={sel === ev.i ? TAG[ev.tag].color : "#10121a"} stroke={TAG[ev.tag].color} strokeWidth={1.8} animate={{ r: sel === ev.i ? 6.5 : 4.2 }} />
            </g>
          );
        })}
      </svg>
      <AnimatePresence mode="wait">
        <motion.div key={sel} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="mt-2 rounded-2xl border border-line bg-bg p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="num display text-2xl font-semibold" style={{ color: TAG[cur.tag].color }}>{cur.y}</span>
            <span className="display text-[16px] font-semibold">{cur.t}</span>
            <span className="rounded-full border px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: TAG[cur.tag].color, borderColor: `color-mix(in srgb, ${TAG[cur.tag].color} 35%, transparent)` }}>{TAG[cur.tag].label}</span>
          </div>
          <p className="mt-2 text-[14px] leading-relaxed text-[#d5d8e6]">{cur.d}</p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="ghost" disabled={sel === 0} onClick={() => setSel((s) => Math.max(0, s - 1))}>← Earlier</Button>
            <Button size="sm" variant="ghost" disabled={sel === EVENTS.length - 1} onClick={() => setSel((s) => Math.min(EVENTS.length - 1, s + 1))}>Later →</Button>
          </div>
        </motion.div>
      </AnimatePresence>
    </Frame>
  );
}

// ---------- classification threshold ----------

function makeScores(imbalanced: boolean) {
  const r = rand(imbalanced ? 7 : 3);
  const nPos = imbalanced ? 5 : 30, nNeg = imbalanced ? 95 : 30;
  const clip = (v: number) => Math.min(0.99, Math.max(0.01, v));
  return [
    ...Array.from({ length: nPos }, () => ({ y: 1, s: clip(0.68 + gauss(r) * 0.16) })),
    ...Array.from({ length: nNeg }, () => ({ y: 0, s: clip(0.34 + gauss(r) * 0.16) })),
  ];
}
function Threshold() {
  const [tau, setTau] = useState(0.5);
  const [imb, setImb] = useState(false);
  const data = useMemo(() => makeScores(imb), [imb]);
  const m = useMemo(() => {
    let tp = 0, fp = 0, tn = 0, fn = 0;
    for (const d of data) { const p = d.s >= tau; if (p && d.y) tp++; else if (p) fp++; else if (d.y) fn++; else tn++; }
    const prec = tp + fp ? tp / (tp + fp) : 1, rec = tp + fn ? tp / (tp + fn) : 0, fpr = fp + tn ? fp / (fp + tn) : 0;
    return { tp, fp, tn, fn, prec, rec, fpr, f1: prec + rec ? (2 * prec * rec) / (prec + rec) : 0, acc: (tp + tn) / data.length };
  }, [data, tau]);
  const roc = useMemo(() => {
    const ts = Array.from({ length: 51 }, (_, i) => 1 - i / 50);
    const P = data.filter((d) => d.y).length, N = data.length - P;
    const pts = ts.map((t) => [data.filter((d) => !d.y && d.s >= t).length / N, data.filter((d) => d.y && d.s >= t).length / P]);
    let auc = 0;
    for (let i = 1; i < pts.length; i++) auc += (pts[i][0] - pts[i - 1][0]) * (pts[i][1] + pts[i - 1][1]) / 2;
    return { pts, auc };
  }, [data]);
  const drive = () => [
    { say: "At a threshold of 0.5, precision and recall are both decent.", act: () => { setImb(false); setTau(0.5); } },
    { say: "Lower the threshold to 0.25: we catch almost every positive, so recall rises, but false positives flood in and precision drops.", act: () => setTau(0.25) },
    { say: "Raise it to 0.75: predictions get pickier. Precision climbs, recall falls. There is no free lunch, only a trade-off you choose from the cost of each mistake.", act: () => setTau(0.75) },
    { say: "Now the accuracy trap. Switch to an imbalanced dataset, like fraud: 5 positives in 100. Push the threshold to the top and the model flags nothing, yet accuracy is still 95 percent. Recall is zero.", act: () => { setImb(true); setTau(0.99); }, settle: 500 },
  ];
  const cell = (k: string, v: number, good: boolean) => <div className={cn("rounded-xl border px-2 py-2 text-center", good ? "border-ok/40 bg-ok/10" : "border-bad/40 bg-bad/10")}><div className="text-[10.5px] uppercase tracking-wider text-faint">{k}</div><div className="num display text-xl font-semibold">{v}</div></div>;
  return (
    <Frame title="Precision, recall and the threshold" about="Each dot is an example scored by a classifier; the colour is its true class. Slide the threshold and watch every metric move." drive={drive}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Chips value={imb ? 1 : 0} onChange={(v) => setImb(!!v)} options={[{ id: 0, label: "Balanced (30 / 30)" }, { id: 1, label: "Fraud-like (5 / 95)" }]} />
        <span className="flex items-center gap-3 text-[11.5px] text-mute"><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-ai" />positive</span><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#5d637c]" />negative</span></span>
      </div>
      <svg viewBox="0 0 640 96" className="mt-3 w-full" role="img" aria-label="Scores and threshold">
        <line x1={20} x2={620} y1={70} y2={70} stroke="#2a2f44" />
        <rect x={20 + tau * 600} y={8} width={600 - tau * 600} height={74} fill={AI} opacity={0.06} />
        {data.map((d, i) => { const jitter = ((i * 37) % 9) * 5; return <circle key={i} cx={20 + d.s * 600} cy={d.y ? 22 + jitter : 40 + jitter} r={3.6} fill={d.y ? AI : "#5d637c"} opacity={0.9} />; })}
        <motion.line animate={{ x1: 20 + tau * 600, x2: 20 + tau * 600 }} y1={4} y2={84} stroke="#c8f547" strokeWidth={2} />
        <text x={24 + tau * 600} y={94} className="fill-accent font-mono text-[10px]">τ = {tau.toFixed(2)} · predict positive →</text>
      </svg>
      <Slider label="Threshold τ" value={tau} min={0.01} max={0.99} step={0.01} onChange={setTau} fmt={(v) => v.toFixed(2)} />
      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_200px]">
        <div>
          <div className="grid grid-cols-2 gap-2">{cell("True positive", m.tp, true)}{cell("False negative", m.fn, false)}{cell("False positive", m.fp, false)}{cell("True negative", m.tn, true)}</div>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat k="Precision" v={pct(m.prec)} tone={AI} /><Stat k="Recall" v={pct(m.rec)} tone="#c8f547" /><Stat k="F1" v={m.f1.toFixed(2)} /><Stat k="Accuracy" v={pct(m.acc)} tone={imb && m.rec < 0.5 ? "var(--color-bad)" : undefined} />
          </div>
        </div>
        <div>
          <svg viewBox="0 0 200 200" className="w-full rounded-xl border border-line bg-bg" role="img" aria-label="ROC curve">
            <line x1={20} y1={180} x2={180} y2={20} stroke="#2a2f44" strokeDasharray="4 4" />
            <path d={roc.pts.map(([fx, ty], i) => `${i ? "L" : "M"}${20 + fx * 160},${180 - ty * 160}`).join(" ")} fill="none" stroke={AI} strokeWidth={2} />
            <circle cx={20 + m.fpr * 160} cy={180 - m.rec * 160} r={5} fill="#c8f547" />
            <text x={100} y={196} textAnchor="middle" className="fill-faint text-[9px]">false-positive rate</text>
            <text x={30} y={34} className="fill-mute font-mono text-[10px]">AUC {roc.auc.toFixed(2)}</text>
          </svg>
        </div>
      </div>
    </Frame>
  );
}

// ---------- gradient descent ----------

type Opt = "sgd" | "momentum" | "adam";
function descend(lr: number, opt: Opt, steps = 60) {
  // f(x, y) = 0.5 (x^2 + 12 y^2): a long, narrow valley
  const g = (x: number, y: number) => [x, 12 * y];
  let x = -4.2, y = 1.6, vx = 0, vy = 0, mx = 0, my = 0, sx = 0, sy = 0;
  const pts: [number, number][] = [[x, y]];
  for (let t = 1; t <= steps; t++) {
    const [gx, gy] = g(x, y);
    if (opt === "sgd") { x -= lr * gx; y -= lr * gy; }
    else if (opt === "momentum") { vx = 0.9 * vx + lr * gx; vy = 0.9 * vy + lr * gy; x -= vx; y -= vy; }
    else { mx = 0.9 * mx + 0.1 * gx; my = 0.9 * my + 0.1 * gy; sx = 0.999 * sx + 0.001 * gx * gx; sy = 0.999 * sy + 0.001 * gy * gy; const bc1 = 1 - 0.9 ** t, bc2 = 1 - 0.999 ** t; x -= (lr * 4 * (mx / bc1)) / (Math.sqrt(sx / bc2) + 1e-8); y -= (lr * 4 * (my / bc1)) / (Math.sqrt(sy / bc2) + 1e-8); }
    if (!isFinite(x) || !isFinite(y) || Math.abs(x) > 60 || Math.abs(y) > 60) { pts.push([Math.max(-60, Math.min(60, x)), Math.max(-60, Math.min(60, y))]); break; }
    pts.push([x, y]);
  }
  return pts;
}
function GradientDescent() {
  const [lr, setLr] = useState(0.05);
  const [opt, setOpt] = useState<Opt>("sgd");
  const [shown, setShown] = useState(60);
  const pts = useMemo(() => descend(lr, opt), [lr, opt]);
  useEffect(() => { setShown(0); const t = setInterval(() => setShown((s) => { if (s >= 60) { clearInterval(t); return s; } return s + 1; }), 35); return () => clearInterval(t); }, [lr, opt]);
  const loss = (p: [number, number]) => 0.5 * (p[0] ** 2 + 12 * p[1] ** 2);
  const last = pts[Math.min(shown, pts.length - 1)];
  const diverged = Math.abs(pts.at(-1)![0]) >= 59 || Math.abs(pts.at(-1)![1]) >= 59;
  const sx = (v: number) => 300 + v * 60, sy = (v: number) => 110 - v * 60;
  const drive = () => [
    { say: "A tiny learning rate of 0.01 creeps along the valley. Safe, but it would take forever.", act: () => { setOpt("sgd"); setLr(0.01); }, settle: 2400 },
    { say: "At 0.15, the steep direction overshoots and the path zig-zags across the valley.", act: () => setLr(0.15), settle: 2400 },
    { say: "Past about 0.17 the steep direction blows up: the loss explodes instead of shrinking. That's divergence.", act: () => setLr(0.18), settle: 2400 },
    { say: "Momentum keeps a running average of past gradients, so the zig-zags cancel and progress along the valley adds up.", act: () => { setOpt("momentum"); setLr(0.02); }, settle: 2600 },
    { say: "Adam also scales each direction by its own gradient size, so steep and shallow directions move at similar speeds. That's why it's the default for training neural networks.", act: () => { setOpt("adam"); setLr(0.05); }, settle: 2600 },
  ];
  return (
    <Frame title="Gradient descent in a narrow valley" about="The loss is a long, thin bowl: steep across, shallow along. Pick an optimizer and a learning rate and watch the path to the minimum." drive={drive}>
      <Chips value={opt} onChange={setOpt} options={[{ id: "sgd", label: "SGD" }, { id: "momentum", label: "Momentum" }, { id: "adam", label: "Adam" }]} />
      <svg viewBox="0 0 600 220" className="mt-3 w-full rounded-xl border border-line bg-bg" role="img" aria-label="Optimization path on a loss surface">
        {[0.3, 1, 2.2, 4, 6.5, 9.5].map((c) => <ellipse key={c} cx={300} cy={110} rx={Math.sqrt(2 * c) * 60} ry={Math.sqrt((2 * c) / 12) * 60} fill="none" stroke={AI} opacity={0.18 + 0.08 * (6 - c / 2)} />)}
        <circle cx={300} cy={110} r={4} fill="#c8f547" />
        <polyline points={pts.slice(0, shown + 1).map((p) => `${sx(p[0])},${sy(p[1])}`).join(" ")} fill="none" stroke="#ffb454" strokeWidth={1.8} />
        {pts.slice(0, shown + 1).map((p, i) => <circle key={i} cx={sx(p[0])} cy={sy(p[1])} r={2.2} fill="#ffb454" />)}
        <circle cx={sx(last[0])} cy={sy(last[1])} r={5} fill="#ffb454" stroke="#10121a" strokeWidth={2} />
      </svg>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
        <Slider label="Learning rate η" value={lr} min={0.005} max={0.2} step={0.005} onChange={setLr} fmt={(v) => v.toFixed(3)} hint={opt === "sgd" ? "Plain SGD diverges once η > 2 / 12 ≈ 0.17 on the steep axis." : undefined} />
        <div className="grid grid-cols-2 gap-2"><Stat k="Step" v={Math.min(shown, pts.length - 1)} /><Stat k="Loss" v={diverged ? "∞" : loss(last).toFixed(3)} tone={diverged ? "var(--color-bad)" : loss(last) < 0.05 ? "var(--color-ok)" : undefined} /></div>
      </div>
    </Frame>
  );
}

// ---------- convolution ----------

const IMG = [
  [0, 0, 0, 9, 9, 9, 9],
  [0, 0, 0, 9, 9, 9, 9],
  [0, 0, 0, 9, 9, 9, 9],
  [0, 0, 0, 9, 9, 9, 9],
  [0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0],
];
const KERNELS: Record<string, { label: string; k: number[][] }> = {
  vert: { label: "Vertical edge", k: [[-1, 0, 1], [-1, 0, 1], [-1, 0, 1]] },
  horiz: { label: "Horizontal edge", k: [[1, 1, 1], [0, 0, 0], [-1, -1, -1]] },
  blur: { label: "Blur", k: [[1, 1, 1], [1, 1, 1], [1, 1, 1]] },
  sharpen: { label: "Sharpen", k: [[0, -1, 0], [-1, 5, -1], [0, -1, 0]] },
};
function Convolution() {
  const [kid, setKid] = useState("vert");
  const [stride, setStride] = useState(1);
  const [pad, setPad] = useState(0);
  const [at, setAt] = useState(0);
  const [play, setPlay] = useState(false);
  const k = KERNELS[kid].k;
  const P = IMG.length + 2 * pad;
  const src = useMemo(() => Array.from({ length: P }, (_, r) => Array.from({ length: P }, (_, c) => IMG[r - pad]?.[c - pad] ?? 0)), [P, pad]);
  const O = Math.floor((IMG.length - 3 + 2 * pad) / stride) + 1;
  const out = useMemo(() => Array.from({ length: O }, (_, r) => Array.from({ length: O }, (_, c) => { let s = 0; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) s += src[r * stride + i][c * stride + j] * k[i][j]; return kid === "blur" ? Math.round(s / 9) : s; })), [O, src, stride, k, kid]);
  const pos = Math.min(at, O * O - 1), pr = Math.floor(pos / O), pc = pos % O;
  useEffect(() => { if (!play) return; const t = setInterval(() => setAt((a) => (a + 1) % (O * O)), 420); return () => clearInterval(t); }, [play, O]);
  const max = Math.max(1, ...out.flat().map(Math.abs));
  const C = 30;
  const drive = () => [
    { say: "The 3 by 3 kernel slides over the image. At each position it multiplies the 9 pixels under it by its weights and adds them up into one output number.", act: () => { setKid("vert"); setStride(1); setPad(0); setAt(0); }, settle: 300 },
    { say: "Here the window straddles the dark-to-bright boundary, so the vertical-edge kernel fires strongly.", act: () => setAt(1), settle: 300 },
    { say: "On flat regions, the positive and negative weights cancel, and the output is zero. The output map lights up exactly along the vertical edge.", act: () => setAt(3), settle: 300 },
    { say: "Switch to the horizontal-edge kernel and a different edge lights up. A CNN learns kernels like these by itself.", act: () => setKid("horiz"), settle: 400 },
    { say: "With stride 2 and padding 1, the output size follows the formula: input minus kernel plus twice the padding, divided by stride, plus one. Seven minus three plus two, over two, plus one: four.", act: () => { setStride(2); setPad(1); setAt(0); }, settle: 400 },
  ];
  return (
    <Frame title="Convolution, one window at a time" about="A 3×3 kernel slides over a 7×7 image. Pick a kernel, stride and padding; the formula updates live." drive={drive}>
      <div className="flex flex-wrap gap-2">
        <Chips value={kid} onChange={(v) => { setKid(v); }} options={Object.entries(KERNELS).map(([id, x]) => ({ id, label: x.label }))} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <Chips label="Stride" value={stride} onChange={(v) => { setStride(v); setAt(0); }} options={[{ id: 1, label: "1" }, { id: 2, label: "2" }]} />
        <Chips label="Padding" value={pad} onChange={(v) => { setPad(v); setAt(0); }} options={[{ id: 0, label: "0" }, { id: 1, label: "1" }]} />
        <div className="ml-auto flex gap-1"><Button size="sm" onClick={() => setPlay((p) => !p)}>{play ? <Pause size={14} /> : <Play size={14} />}{play ? "Pause" : "Slide"}</Button><Button size="sm" variant="ghost" onClick={() => setAt((a) => (a + 1) % (O * O))}><StepForward size={14} /></Button></div>
      </div>
      <div className="mt-4 flex flex-wrap items-start justify-center gap-6 overflow-x-auto">
        <div>
          <div className="mb-1 text-center text-[11px] uppercase tracking-wider text-faint">Input {pad ? "(padded)" : ""}</div>
          <svg width={P * C} height={P * C} role="img" aria-label="Input image">
            {src.map((row, r) => row.map((v, c) => <rect key={`${r}-${c}`} x={c * C} y={r * C} width={C - 2} height={C - 2} rx={4} fill={v ? "#e9ebf4" : "#1d2132"} opacity={r < pad || c < pad || r >= P - pad || c >= P - pad ? 0.35 : 1} />))}
            <motion.rect animate={{ x: pc * stride * C - 2, y: pr * stride * C - 2 }} width={3 * C + 2} height={3 * C + 2} rx={6} fill={AI} fillOpacity={0.14} stroke={AI} strokeWidth={2} transition={{ type: "spring", stiffness: 260, damping: 26 }} />
          </svg>
        </div>
        <div className="self-center text-center">
          <div className="mb-1 text-[11px] uppercase tracking-wider text-faint">Kernel</div>
          <div className="grid grid-cols-3 gap-1">{k.flat().map((w, i) => <div key={i} className="num grid h-8 w-8 place-items-center rounded-md border border-ai/40 bg-ai/10 font-mono text-[12px]">{w}</div>)}</div>
        </div>
        <div>
          <div className="mb-1 text-center text-[11px] uppercase tracking-wider text-faint">Output {O}×{O}</div>
          <svg width={O * C} height={O * C} role="img" aria-label="Feature map">
            {out.map((row, r) => row.map((v, c) => {
              const on = r === pr && c === pc;
              return <g key={`${r}-${c}`}><rect x={c * C} y={r * C} width={C - 2} height={C - 2} rx={4} fill={v >= 0 ? "#c8f547" : "#ff6b6b"} fillOpacity={0.08 + (Math.abs(v) / max) * 0.8} stroke={on ? "#fff" : "none"} strokeWidth={1.5} /><text x={c * C + C / 2 - 1} y={r * C + C / 2 + 3} textAnchor="middle" className="fill-text font-mono text-[9.5px]">{v}</text></g>;
            }))}
          </svg>
        </div>
      </div>
      <div className="mt-4 rounded-xl border border-line bg-bg px-3 py-2 text-center font-mono text-[12.5px] text-mute">
        O = ⌊(I − K + 2P) / S⌋ + 1 = ⌊({IMG.length} − 3 + {2 * pad}) / {stride}⌋ + 1 = <span className="font-semibold text-accent">{O}</span>
      </div>
    </Frame>
  );
}

// ---------- embedding space ----------

const WORDS: Record<string, [number, number]> = {
  king: [2.2, 3.1], queen: [3.6, 3.15], man: [2.0, 1.2], woman: [3.4, 1.25], prince: [1.6, 2.6], princess: [3.0, 2.65],
  Paris: [-3.2, 2.9], France: [-3.9, 1.3], Tokyo: [-1.6, 3.2], Japan: [-2.3, 1.6], Rome: [-4.4, 3.0], Italy: [-5.1, 1.4],
  cat: [1.4, -2.1], kitten: [2.2, -2.9], dog: [3.0, -1.7], puppy: [3.8, -2.5], pizza: [-2.6, -2.2], sushi: [-1.4, -2.0], pasta: [-3.4, -2.6],
};
const ANALOGIES: [string, string, string][] = [["king", "man", "woman"], ["Paris", "France", "Japan"], ["kitten", "cat", "dog"], ["Rome", "Italy", "France"]];
const cos = (a: [number, number], b: [number, number]) => (a[0] * b[0] + a[1] * b[1]) / (Math.hypot(...a) * Math.hypot(...b) || 1);
function EmbeddingSpace() {
  const [an, setAn] = useState(0);
  const [focus, setFocus] = useState("king");
  const [a, b, c] = ANALOGIES[an];
  const target: [number, number] = [WORDS[a][0] - WORDS[b][0] + WORDS[c][0], WORDS[a][1] - WORDS[b][1] + WORDS[c][1]];
  const ranked = Object.entries(WORDS).filter(([w]) => ![a, b, c].includes(w)).map(([w, v]) => ({ w, d: Math.hypot(v[0] - target[0], v[1] - target[1]) })).sort((x, y) => x.d - y.d);
  const sims = Object.entries(WORDS).filter(([w]) => w !== focus).map(([w, v]) => ({ w, s: cos(WORDS[focus], v) })).sort((x, y) => y.s - x.s).slice(0, 5);
  const X = (v: number) => 260 + v * 42, Y = (v: number) => 150 - v * 34;
  const drive = () => [
    { say: "Start at king. Subtract man, add woman. The arrow lands right next to queen: the model learned a gender direction without anyone teaching it.", act: () => { setAn(0); setFocus("king"); }, settle: 300 },
    { say: "Same trick with places: Paris minus France plus Japan lands near Tokyo. The capital-of relationship is a direction too.", act: () => setAn(1), settle: 300 },
    { say: "Words used in similar contexts sit close together. Cat's nearest neighbours are kitten, dog and puppy, measured by cosine similarity, the angle between vectors.", act: () => setFocus("cat"), settle: 300 },
  ];
  return (
    <Frame title="Meaning as geometry" about="A toy 2-D map of word vectors (real ones have hundreds of dimensions). Build an analogy and see where the arithmetic lands." drive={drive}>
      <Chips value={an} onChange={setAn} options={ANALOGIES.map(([x, y, z], i) => ({ id: i, label: `${x} − ${y} + ${z}` }))} />
      <div className="mt-3 grid gap-4 md:grid-cols-[1fr_210px]">
        <svg viewBox="0 0 520 300" className="w-full rounded-xl border border-line bg-bg" role="img" aria-label="Word vectors">
          <defs><marker id="emb-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="#c8f547" /></marker></defs>
          <line x1={X(-6)} x2={X(6)} y1={Y(0)} y2={Y(0)} stroke="#1f2333" /><line x1={X(0)} x2={X(0)} y1={Y(4.2)} y2={Y(-4)} stroke="#1f2333" />
          <motion.line animate={{ x1: X(WORDS[a][0]), y1: Y(WORDS[a][1]), x2: X(WORDS[a][0] - WORDS[b][0]), y2: Y(WORDS[a][1] - WORDS[b][1]) }} stroke="#ffb454" strokeWidth={1.5} strokeDasharray="4 4" />
          <motion.line animate={{ x1: X(WORDS[a][0] - WORDS[b][0]), y1: Y(WORDS[a][1] - WORDS[b][1]), x2: X(target[0]), y2: Y(target[1]) }} stroke="#c8f547" strokeWidth={2} markerEnd="url(#emb-arrow)" />
          {Object.entries(WORDS).map(([w, v]) => {
            const role = w === a ? "#ffb454" : w === b || w === c ? AI : w === ranked[0].w ? "#c8f547" : w === focus ? "#7aa7ff" : "#5d637c";
            return <g key={w} onClick={() => setFocus(w)} className="cursor-pointer"><circle cx={X(v[0])} cy={Y(v[1])} r={w === ranked[0].w ? 6 : 4.5} fill={role} /><text x={X(v[0]) + 7} y={Y(v[1]) + 4} className="text-[11px]" fill={role === "#5d637c" ? "#9096ad" : role}>{w}</text></g>;
          })}
          <motion.circle animate={{ cx: X(target[0]), cy: Y(target[1]) }} r={11} fill="none" stroke="#c8f547" strokeDasharray="3 3" />
        </svg>
        <div className="space-y-3">
          <div className="rounded-xl border border-line bg-bg p-3"><div className="text-[11px] uppercase tracking-wider text-faint">Nearest to the result</div><div className="display mt-1 text-xl font-semibold text-accent">{ranked[0].w}</div><div className="text-[12px] text-mute">{a} − {b} + {c} ≈ {ranked[0].w}</div></div>
          <div className="rounded-xl border border-line bg-bg p-3">
            <div className="text-[11px] uppercase tracking-wider text-faint">Cosine similarity to <span className="text-hld">{focus}</span></div>
            <div className="mt-2 space-y-1.5">{sims.map((x) => <div key={x.w} className="flex items-center gap-2 text-[12px]"><span className="w-14 truncate">{x.w}</span><div className="h-1.5 flex-1 rounded-full bg-[#1d2132]"><motion.div className="h-full rounded-full bg-hld" animate={{ width: `${Math.max(0, x.s) * 100}%` }} /></div><span className="num w-9 text-right text-mute">{x.s.toFixed(2)}</span></div>)}</div>
            <div className="mt-2 text-[11px] text-faint">Click any word to compare.</div>
          </div>
        </div>
      </div>
    </Frame>
  );
}

// ---------- byte-pair encoding ----------

const CORPUS = "low low low low lower lower newest newest newest newest newest newest widest widest widest";
function bpeTrain(n: number) {
  let words = Object.entries(CORPUS.split(" ").reduce<Record<string, number>>((m, w) => ((m[w] = (m[w] ?? 0) + 1), m), {})).map(([w, c]) => ({ t: [...w.split(""), "_"], c }));
  const merges: { pair: string; count: number }[] = [];
  for (let k = 0; k < n; k++) {
    const counts = new Map<string, number>();
    for (const w of words) for (let i = 0; i < w.t.length - 1; i++) { const p = w.t[i] + "\u0001" + w.t[i + 1]; counts.set(p, (counts.get(p) ?? 0) + w.c); }
    const best = [...counts].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))[0];
    if (!best) break;
    const [l, r] = best[0].split("\u0001");
    merges.push({ pair: `${l} + ${r}`, count: best[1] });
    words = words.map((w) => { const t: string[] = []; for (let i = 0; i < w.t.length; i++) { if (i < w.t.length - 1 && w.t[i] === l && w.t[i + 1] === r) { t.push(l + r); i++; } else t.push(w.t[i]); } return { ...w, t }; });
  }
  return { words, merges, tokens: words.reduce((a, w) => a + w.t.length * w.c, 0) };
}
function Bpe() {
  const [n, setN] = useState(0);
  const st = useMemo(() => bpeTrain(n), [n]);
  const base = useMemo(() => bpeTrain(0).tokens, []);
  const hue = (s: string) => { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; };
  const drive = () => [
    { say: "We start with characters, plus an underscore marking the end of each word. Every character is a token.", act: () => setN(0) },
    { say: "Count every adjacent pair across the corpus. The most frequent pair gets merged into a new token.", act: () => setN(1), settle: 300 },
    { say: "Keep merging. Common chunks like 'est' and 'new' become single tokens, and the corpus needs fewer tokens.", act: () => setN(5), settle: 300 },
    { say: "After enough merges, frequent words are one token each, while rare words still split into reusable pieces. That's why a model sees 'newest' as one token but a rare name as several.", act: () => setN(9), settle: 300 },
  ];
  return (
    <Frame title="Byte-pair encoding, merge by merge" about="BPE builds a vocabulary by repeatedly merging the most frequent adjacent pair. Step through the merges on a tiny corpus." drive={drive}>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="primary" disabled={n >= 12} onClick={() => setN((x) => x + 1)}><StepForward size={14} />Merge next pair</Button>
        <Button size="sm" variant="ghost" onClick={() => setN(0)}><RotateCcw size={14} />Reset</Button>
        <span className="ml-auto text-[12px] text-mute">Merges: <span className="num font-semibold text-text">{st.merges.length}</span></span>
      </div>
      <div className="mt-4 space-y-2">
        {st.words.map((w) => (
          <div key={w.t.join("")} className="flex flex-wrap items-center gap-1">
            {w.t.map((tok, i) => <motion.span layout key={i + tok} className="rounded-md border px-1.5 py-0.5 font-mono text-[13px]" style={{ borderColor: `hsl(${hue(tok)} 60% 60% / .5)`, background: `hsl(${hue(tok)} 60% 60% / .12)` }}>{tok}</motion.span>)}
            <span className="ml-2 text-[11.5px] text-faint">× {w.c}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="rounded-xl border border-line bg-bg p-3">
          <div className="text-[11px] uppercase tracking-wider text-faint">Merge rules learned</div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">{st.merges.length ? st.merges.map((m, i) => <span key={i} className="rounded-md bg-panel2 px-2 py-0.5 font-mono text-[11.5px] text-mute"><span className="text-faint">{i + 1}.</span> {m.pair} <span className="text-faint">({m.count})</span></span>) : <span className="text-[12px] text-faint">None yet: every character is its own token.</span>}</div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:w-[220px]"><Stat k="Corpus tokens" v={st.tokens} tone={AI} sub={`from ${base}`} /><Stat k="Saved" v={pct(1 - st.tokens / base)} tone="#c8f547" /></div>
      </div>
    </Frame>
  );
}

// ---------- attention ----------

const SENT = ["The", "animal", "didn't", "cross", "the", "street", "because", "it", "was", "too", "tired"];
function attnLogits(q: number, ending: "tired" | "wide"): number[] {
  const L = SENT.map((_, k) => (k === q ? 1.4 : 0));
  const it = 7;
  const set = (k: number, v: number) => (L[k] += v);
  if (q === it) { if (ending === "tired") { set(1, 3.4); set(0, 0.8); set(5, 0.9); } else { set(5, 3.4); set(4, 0.8); set(1, 0.9); } set(10, 1.2); }
  else if (q === 10) { set(ending === "tired" ? 1 : 5, 2.6); set(7, 2.2); set(9, 1.6); }
  else if (q === 3) { set(1, 2.4); set(5, 2.3); set(2, 1.6); }
  else if (q === 2) { set(3, 2.6); set(1, 1.5); }
  else if (q === 5) { set(4, 2.2); set(3, 2.0); }
  else if (q === 1) { set(0, 2.4); set(3, 1.4); }
  else { set(Math.max(0, q - 1), 1.6); set(Math.min(SENT.length - 1, q + 1), 1.0); }
  return L;
}
function Attention() {
  const [q, setQ] = useState(7);
  const [ending, setEnding] = useState<"tired" | "wide">("tired");
  const [temp, setTemp] = useState(1);
  const words = SENT.map((w, i) => (i === 10 ? ending : w));
  const w = softmax(attnLogits(q, ending), temp);
  const top = w.map((p, i) => ({ p, i })).filter((x) => x.i !== q).sort((x, y) => y.p - x.p)[0];
  const drive = () => [
    { say: "Select the word 'it'. Its query is compared with every word's key, and softmax turns the scores into weights. Most of the weight lands on 'animal'.", act: () => { setEnding("tired"); setQ(7); setTemp(1); }, settle: 300 },
    { say: "Now change one word: the street was too wide. The same query now attends to 'street'. Context decides what 'it' means, which is exactly what fixed word vectors could not do.", act: () => setEnding("wide"), settle: 400 },
    { say: "Raise the softmax temperature and attention spreads out over everything. Lower it and attention becomes nearly one-hot. Dividing by the square root of the key dimension keeps scores in a range where softmax stays useful.", act: () => setTemp(3), settle: 400 },
  ];
  return (
    <Frame title="Who does “it” attend to?" about="Click a word to make it the query. Arcs show how much it attends to every other word. Then change the last word." drive={drive}>
      <div className="flex flex-wrap items-center gap-3">
        <Chips label="The street was too…" value={ending} onChange={setEnding} options={[{ id: "tired", label: "…tired (the animal was)" }, { id: "wide", label: "…wide (the street was)" }]} />
      </div>
      <div className="mt-4 overflow-x-auto">
        <svg viewBox={`0 0 ${SENT.length * 70} 150`} className="min-w-[560px] w-full" role="img" aria-label="Attention weights">
          {w.map((p, i) => {
            if (i === q) return null;
            const x1 = q * 70 + 35, x2 = i * 70 + 35, h = Math.min(105, 22 + Math.abs(x2 - x1) * 0.28);
            return <motion.path key={i} d={`M${x1},112 C${x1},${112 - h} ${x2},${112 - h} ${x2},112`} fill="none" stroke={AI} strokeLinecap="round" animate={{ strokeWidth: 0.5 + p * 14, opacity: 0.15 + p * 0.85 }} transition={{ duration: 0.35 }} />;
          })}
          {words.map((t, i) => (
            <g key={i} onClick={() => setQ(i)} className="cursor-pointer">
              <rect x={i * 70 + 4} y={116} width={62} height={28} rx={8} fill={i === q ? "#c8f547" : `color-mix(in srgb, #b794f4 ${Math.round(w[i] * 100)}%, #171a26)`} stroke={i === q ? "#c8f547" : "#2a2f44"} />
              <text x={i * 70 + 35} y={134} textAnchor="middle" className="text-[12px] font-medium" fill={i === q ? "#0b1000" : "#e9ebf4"}>{t}</text>
            </g>
          ))}
        </svg>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
        <Slider label="Softmax temperature (how sharp attention is)" value={temp} min={0.3} max={4} step={0.1} onChange={setTemp} fmt={(v) => v.toFixed(1)} />
        <div className="grid grid-cols-2 gap-2"><Stat k="Query" v={words[q]} tone="#c8f547" /><Stat k="Strongest key" v={words[top.i]} tone={AI} sub={pct(top.p)} /></div>
      </div>
    </Frame>
  );
}

// ---------- sampling ----------

const NEXT = [["coffee", 3.2], ["the", 2.6], ["that", 2.4], ["nothing", 2.1], ["lunch", 1.7], ["Friday", 1.5], ["sleeping", 1.1], ["meetings", 0.8], ["pizza", 0.5], ["tacos", 0.2], ["quantum", -0.8], ["giraffes", -1.4]] as const;
function Sampling() {
  const [t, setT] = useState(1);
  const [k, setK] = useState(12);
  const [p, setP] = useState(1);
  const [draws, setDraws] = useState<string[]>([]);
  const [seed, setSeed] = useState(1);
  const probs = useMemo(() => {
    const raw = softmax(NEXT.map((x) => x[1]), t);
    const order = raw.map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v);
    const keep = new Set<number>();
    let cum = 0;
    for (const [rank, o] of order.entries()) { if (rank >= k) break; if (cum >= p && keep.size) break; keep.add(o.i); cum += o.v; }
    const z = [...keep].reduce((a, i) => a + raw[i], 0);
    return raw.map((v, i) => ({ w: NEXT[i][0], raw: v, v: keep.has(i) ? v / z : 0, kept: keep.has(i) }));
  }, [t, k, p]);
  const sample = (n: number, s: number) => { const r = rand(s); return Array.from({ length: n }, () => { const x = r(); let acc = 0; for (const q of probs) { acc += q.v; if (x <= acc) return q.w; } return probs.find((q) => q.kept)!.w; }); };
  useEffect(() => { setDraws(sample(16, seed)); }, [probs, seed]); // eslint-disable-line react-hooks/exhaustive-deps
  const kept = probs.filter((x) => x.kept).length;
  const drive = () => [
    { say: "The model's next-token distribution for: the best thing about Mondays is. At temperature 1, coffee is likely, but there's a long tail.", act: () => { setT(1); setK(12); setP(1); } },
    { say: "Turn the temperature down to 0.2 and the distribution sharpens: nearly every sample is coffee. That's close to greedy decoding.", act: () => setT(0.2), settle: 300 },
    { say: "Turn it up to 2 and it flattens: giraffes and quantum start showing up. Creative, and occasionally unhinged.", act: () => setT(2), settle: 300 },
    { say: "Top-p of 0.6 keeps only the smallest set of tokens whose probability adds up to 60 percent, and renormalises. The weird tail is cut off, however flat the distribution is.", act: () => setP(0.6), settle: 300 },
  ];
  return (
    <Frame title="Temperature, top-k and top-p" about="“The best thing about Mondays is …” Shape the next-token distribution and sample from it." drive={drive}>
      <div className="grid gap-3 sm:grid-cols-3">
        <Slider label="Temperature" value={t} min={0.1} max={2.5} step={0.05} onChange={setT} fmt={(v) => v.toFixed(2)} />
        <Slider label="Top-k" value={k} min={1} max={12} onChange={setK} fmt={(v) => (v === 12 ? "off" : String(v))} />
        <Slider label="Top-p (nucleus)" value={p} min={0.1} max={1} step={0.05} onChange={setP} fmt={(v) => (v >= 1 ? "off" : v.toFixed(2))} />
      </div>
      <div className="mt-4 space-y-1.5">
        {probs.map((x) => (
          <div key={x.w} className={cn("flex items-center gap-2 text-[12.5px]", !x.kept && "opacity-35")}>
            <span className="w-20 truncate text-right font-mono">{x.w}</span>
            <div className="relative h-3.5 flex-1 overflow-hidden rounded-full bg-[#1d2132]">
              <motion.div className="absolute inset-y-0 left-0 rounded-full bg-[#2f3550]" animate={{ width: pct(x.raw) }} />
              <motion.div className="absolute inset-y-0 left-0 rounded-full" style={{ background: AI }} animate={{ width: pct(x.v) }} />
            </div>
            <span className="num w-12 text-right text-mute">{pct(x.v, 1)}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => setSeed((s) => s + 1)}><RotateCcw size={14} />Sample 16 again</Button>
        <span className="text-[12px] text-faint">{kept} candidate{kept === 1 ? "" : "s"} survive. Greedy would always pick “{probs.reduce((a, b) => (b.raw > a.raw ? b : a)).w}”.</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">{draws.map((d, i) => <motion.span key={`${seed}-${i}`} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }} className="rounded-lg border border-line bg-panel2 px-2 py-0.5 font-mono text-[12px]">{d}</motion.span>)}</div>
    </Frame>
  );
}

// ---------- LoRA ----------

function Lora() {
  const [d, setD] = useState(4096);
  const [r, setR] = useState(8);
  const [layers, setLayers] = useState(32);
  const full = d * d, lora = r * (d + d);
  const perModelFull = full * 4 * layers, perModelLora = lora * 2 * layers; // full: q,k,v,o; LoRA on q and v
  const gb = (params: number, bytes: number) => (params * bytes) / 1e9;
  const s = 220 / d;
  const drive = () => [
    { say: "A 4096 by 4096 weight matrix has about 16.8 million parameters. LoRA freezes it and learns two thin matrices instead: B is 4096 by r, A is r by 4096.", act: () => { setD(4096); setR(8); } },
    { say: "With rank 8 that's about 65 thousand trainable parameters per matrix: 0.4 percent of the original.", act: () => setR(8), settle: 300 },
    { say: "Raise the rank to 64: more capacity to learn the update, still only about 3 percent. Most fine-tunes work well with ranks between 4 and 64.", act: () => setR(64), settle: 300 },
  ];
  return (
    <Frame title="How small is a LoRA?" about="LoRA learns a low-rank update ΔW = B·A beside a frozen weight matrix. Change the model width and the rank." drive={drive}>
      <div className="grid gap-5 md:grid-cols-[260px_1fr]">
        <svg viewBox="0 0 260 260" className="w-full" role="img" aria-label="Weight matrix and low-rank factors">
          <rect x={10} y={10} width={220} height={220} rx={8} fill="#1d2132" stroke="#2a2f44" />
          <text x={120} y={124} textAnchor="middle" className="fill-mute text-[12px]">W₀ (frozen)</text>
          <text x={120} y={140} textAnchor="middle" className="fill-faint font-mono text-[10px]">{d} × {d}</text>
          <motion.rect x={236} y={10} height={220} rx={3} fill={AI} animate={{ width: Math.max(2, r * s * 4) }} />
          <motion.rect x={10} y={236} width={220} rx={3} fill="#c8f547" animate={{ height: Math.max(2, r * s * 4) }} />
          <text x={248} y={8} className="fill-ai text-[10px]">B</text><text x={0} y={252} className="fill-accent text-[10px]">A</text>
        </svg>
        <div className="space-y-3">
          <Slider label="Model width d" value={d} min={1024} max={8192} step={1024} onChange={setD} />
          <Slider label="LoRA rank r" value={r} min={1} max={128} onChange={setR} hint="The rank bars on the left are drawn 4× thicker so small ranks stay visible." />
          <Slider label="Transformer layers" value={layers} min={12} max={80} onChange={setLayers} />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Stat k="One matrix" v={`${(full / 1e6).toFixed(1)}M`} sub="full fine-tune" />
            <Stat k="Its LoRA" v={lora >= 1e6 ? `${(lora / 1e6).toFixed(2)}M` : `${(lora / 1e3).toFixed(0)}K`} tone={AI} sub={pct(lora / full, 2)} />
            <Stat k="Adapter file" v={`${(gb(perModelLora, 2) * 1000).toFixed(0)} MB`} tone="#c8f547" sub="LoRA on q, v · fp16" />
          </div>
          <p className="text-[12px] text-faint">Training all attention weights of this stack in full would need optimizer state for {(perModelFull / 1e9).toFixed(1)}B parameters (≈{gb(perModelFull, 16).toFixed(0)} GB with Adam in mixed precision); the LoRA needs {(perModelLora / 1e6).toFixed(1)}M.</p>
        </div>
      </div>
    </Frame>
  );
}

// ---------- context budget ----------

const WINDOWS = [{ id: 8, label: "8K" }, { id: 128, label: "128K" }, { id: 1000, label: "1M" }];
function ContextBudget() {
  const [win, setWin] = useState(128);
  const [tools, setTools] = useState(8);
  const [turns, setTurns] = useState(20);
  const [docs, setDocs] = useState(6);
  const [chunk, setChunk] = useState(800);
  const [compact, setCompact] = useState(false);
  const parts = [
    { k: "System prompt", v: 1200, c: "#7aa7ff" },
    { k: "Tool definitions", v: tools * 350, c: "#ffb454" },
    { k: "Conversation history", v: Math.round(turns * 450 * (compact ? 0.15 : 1)), c: "#ff8fb3" },
    { k: "Retrieved documents", v: docs * chunk, c: AI },
    { k: "User message", v: 300, c: "#4fd1c5" },
    { k: "Reserved for the answer", v: 4000, c: "#c8f547" },
  ];
  const total = parts.reduce((a, b) => a + b.v, 0), cap = win * 1000;
  const over = total > cap;
  const warns = [
    over && "Over the window: the request fails or the oldest context is cut.",
    tools > 30 && "Dozens of tool schemas confuse tool choice. Load tools on demand (tool search) instead.",
    docs * chunk > 30000 && "Lots of retrieved text: facts in the middle get lost. Rerank and send fewer, better chunks.",
    turns * 450 > 25000 && !compact && "Long history: summarise older turns (compaction) or move facts to memory.",
  ].filter(Boolean) as string[];
  const drive = () => [
    { say: "Every request is a budget. System prompt, tool definitions, history, retrieved documents, the user's message, and room for the answer all share one window.", act: () => { setWin(128); setTools(8); setTurns(20); setDocs(6); setCompact(false); } },
    { say: "Connect 60 tools and their schemas alone take 21 thousand tokens before the user says a word.", act: () => setTools(60), settle: 300 },
    { say: "Let the chat run to 120 turns and history dominates. Compaction summarises old turns and frees most of it.", act: () => setTurns(120), settle: 300 },
    { say: "Turn compaction on.", act: () => setCompact(true), settle: 300 },
    { say: "And on an 8 thousand token model, the same request simply doesn't fit. Context engineering is choosing what earns a place in the window.", act: () => { setTools(8); setWin(8); }, settle: 300 },
  ];
  return (
    <Frame title="Pack the context window" about="Everything the model sees competes for one budget. Add tools, history and documents; see what fits and what it costs." drive={drive}>
      <div className="flex flex-wrap items-center gap-3">
        <Chips label="Window" value={win} onChange={setWin} options={WINDOWS} />
        <button onClick={() => setCompact((c) => !c)} aria-pressed={compact} className={cn("rounded-full border px-2.5 py-1 text-[12px] font-medium", compact ? "border-accent/50 bg-accent/10 text-accent" : "border-line text-mute")}>Compaction {compact ? "on" : "off"}</button>
      </div>
      <div className="mt-4 h-9 overflow-hidden rounded-xl border border-line bg-bg">
        <div className="flex h-full">
          {parts.map((p) => <motion.div key={p.k} title={`${p.k}: ${p.v.toLocaleString()} tokens`} animate={{ width: `${(Math.min(p.v, cap) / Math.max(cap, total)) * 100}%` }} className="h-full border-r border-bg" style={{ background: p.c, opacity: 0.85 }} />)}
        </div>
      </div>
      <div className="mt-1 flex justify-between text-[11.5px] text-faint"><span>0</span><span className={over ? "font-semibold text-bad" : ""}>{total.toLocaleString()} / {cap.toLocaleString()} tokens</span></div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">{parts.map((p) => <span key={p.k} className="flex items-center gap-1.5 text-[11.5px] text-mute"><span className="h-2 w-2 rounded-sm" style={{ background: p.c }} />{p.k} <span className="num text-faint">{(p.v / 1000).toFixed(1)}K</span></span>)}</div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Slider label="Tools connected" value={tools} min={0} max={80} onChange={setTools} />
        <Slider label="Conversation turns" value={turns} min={0} max={150} onChange={setTurns} />
        <Slider label="Chunks retrieved" value={docs} min={0} max={50} onChange={setDocs} />
        <Slider label="Tokens per chunk" value={chunk} min={200} max={2000} step={100} onChange={setChunk} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat k="Input cost / request" v={`$${((total - 4000) * 1.25e-6).toFixed(3)}`} sub="at $1.25 per 1M input" />
        <Stat k="Per 1M requests" v={`$${Math.round((total - 4000) * 1.25).toLocaleString()}`} tone={AI} />
        <Stat k="Prefill time (rough)" v={`${((total / 1000) * 0.03).toFixed(1)} s`} sub="≈30 ms per 1K tokens" />
      </div>
      <AnimatePresence>{warns.map((w) => <motion.p key={w} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-2 rounded-xl border border-warn/30 bg-warn/10 px-3 py-2 text-[12.5px] text-warn">{w}</motion.p>)}</AnimatePresence>
    </Frame>
  );
}

const AI_WIDGETS_1: Record<string, ComponentType> = {
  "ai-timeline": Timeline, threshold: Threshold, "gradient-descent": GradientDescent, convolution: Convolution, "embedding-space": EmbeddingSpace,
  bpe: Bpe, attention: Attention, sampling: Sampling, lora: Lora, "context-budget": ContextBudget,
};

export function AiWidget({ id }: { id: string }) {
  const W = AI_WIDGETS_1[id] ?? AI_WIDGETS_2[id];
  return W ? <W /> : null;
}
