"use client";
/** Storage and search visuals: erasure coding, adaptive bitrate, inverted index, geohash, HyperLogLog. */
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Btn, Chips, Frame, Predict, SimControls, Slider, Spark, Stat, useSim } from "./kit";
import { cn } from "../../ui";

// ───────── erasure coding vs replication ─────────
const DISKS = 6;
const EC = ["D1", "D2", "D3", "D4", "P1", "P2"]; // 4 data + 2 parity pieces, one per disk (each in a different rack)
const REP = [0, 2, 4]; // three full copies on disks 1, 3, 5
export function Erasure() {
  const [down, setDown] = useState<number[]>([]);
  const ecLost = down.length, ecOk = ecLost <= 2, repOk = REP.some((d) => !down.includes(d));
  return (
    <Frame title="Replication vs erasure coding" q="Both schemes keep one object safe on six disks. Which survives more disk failures, and which uses less space?"
      about="Click disks to fail them. Erasure coding (4+2) stores 4 data pieces and 2 parity pieces, one per disk; any 4 of the 6 rebuild the object. Replication stores 3 full copies on disks 1, 3 and 5."
      foot={`Erasure coding: ${ecOk ? `${6 - ecLost} of 6 pieces left, at least 4 needed: recoverable` : "fewer than 4 pieces left: object LOST"}. Replication: ${repOk ? "at least one full copy survives" : "all three copies lost: object LOST"}. Storage: 1.5× vs 3×. Rebuilding one lost erasure piece reads 4 pieces; rebuilding a lost replica reads 1 copy.`}>
      <div className="space-y-3">
        <Predict q="Both schemes survive any 2 disk failures here. Which stores less data to do it?" options={["Erasure coding (4+2)", "3× replication", "The same"]} answer={0} why="4 data + 2 parity pieces of a quarter-size each = 1.5× the object; three full copies = 3×. The price is that rebuilding a lost piece reads 4 pieces instead of 1 copy." />
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {Array.from({ length: DISKS }, (_, d) => {
            const dead = down.includes(d);
            return (
              <button key={d} onClick={() => setDown((x) => (dead ? x.filter((y) => y !== d) : [...x, d]))} className={cn("rounded-xl border p-2 text-left transition", dead ? "border-bad/50 bg-bad/10" : "border-line bg-bg hover:border-[#3a4160]")}>
                <div className={cn("text-[11px] font-semibold", dead ? "text-bad line-through" : "text-mute")}>disk {d + 1} · rack {d + 1}</div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  <span className={cn("rounded px-1.5 font-mono text-[11px]", dead ? "text-bad/60" : EC[d].startsWith("P") ? "bg-lld/20 text-lld" : "bg-hld/20 text-hld")}>{EC[d]}</span>
                  {REP.includes(d) && <span className={cn("rounded px-1.5 font-mono text-[11px]", dead ? "text-bad/60" : "bg-ok/20 text-ok")}>copy {REP.indexOf(d) + 1}</span>}
                </div>
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-1.5"><Btn onClick={() => setDown([])}>Repair all</Btn><Btn onClick={() => setDown([0, 2, 4])}>Fail 1, 3, 5</Btn><Btn onClick={() => setDown([1, 3])}>Fail 2 and 4</Btn></div>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          <Stat k="Erasure coding" v={ecOk ? "safe" : "LOST"} tone={ecOk ? "var(--color-ok)" : "var(--color-bad)"} sub={`tolerates any 2 failures`} />
          <Stat k="Replication ×3" v={repOk ? "safe" : "LOST"} tone={repOk ? "var(--color-ok)" : "var(--color-bad)"} sub="tolerates 2 copy losses" />
          <Stat k="Space used" v="1.5× vs 3×" />
          <Stat k="Repair reads per lost piece" v="4 vs 1" />
        </div>
      </div>
    </Frame>
  );
}

// ───────── adaptive bitrate ─────────
const LADDER = [0.4, 1, 2.5, 5, 8]; // Mbit/s
const SEG = 4; // seconds of video per segment
const bwAt = (t: number) => (t < 20 ? 9 : t < 40 ? 1.6 : t < 55 ? 3.5 : 9); // the network's real bandwidth over time
type P = { t: number; buffer: number; stalls: number; rendition: number; dl: number; dlLeft: number; est: number; hist: { bw: number[]; br: number[]; buf: number[] }; playing: boolean };
export function Abr() {
  const [algo, setAlgo] = useState<"tput" | "buffer">("buffer");
  const sim = useSim<P>(() => ({ t: 0, buffer: 0, stalls: 0, rendition: 1, dl: 0, dlLeft: 0, est: 2, hist: { bw: [], br: [], buf: [] }, playing: false }), (s) => {
    const dt = 0.25, bw = bwAt(s.t);
    if (s.dlLeft <= 0 && s.buffer < 30) { // pick the next segment's rendition
      const tputPick = LADDER.reduce((best, r, i) => (r <= s.est * 0.8 ? i : best), 0);
      let pick = tputPick;
      if (algo === "buffer") { if (s.buffer < 8) pick = Math.min(tputPick, Math.max(0, s.rendition - 1)); if (s.buffer < 4) pick = 0; }
      s.rendition = pick; s.dlLeft = LADDER[pick] * SEG; s.dl = 0;
    }
    if (s.dlLeft > 0) { const got = bw * dt; s.dlLeft -= got; s.dl += dt; if (s.dlLeft <= 0) { s.buffer += SEG; s.est = 0.6 * s.est + 0.4 * (LADDER[s.rendition] * SEG) / s.dl; } }
    if (!s.playing && s.buffer >= SEG) s.playing = true;
    if (s.playing) { if (s.buffer > 0) s.buffer = Math.max(0, s.buffer - dt); else { s.playing = false; s.stalls++; } }
    s.t += dt;
    if (Math.abs(s.t % 1) < 0.01) { s.hist.bw.push(bw); s.hist.br.push(LADDER[s.rendition]); s.hist.buf.push(s.buffer); }
  }, [algo], 1);
  const s = sim.s;
  return (
    <Frame title="Adaptive bitrate playback" q="The network drops from 9 to 1.6 Mbit/s mid-video. Does the player stall?"
      about="Renditions: 0.4, 1, 2.5, 5 and 8 Mbit/s, in 4-second segments. The player picks a rendition before each segment. Compare picking by recent throughput only with also watching the buffer."
      foot={algo === "tput" ? "Throughput-only picks react to past downloads; after the drop it keeps requesting big segments until the slow downloads update its estimate, draining the buffer, so watch for stalls." : "Watching the buffer, the player steps down as soon as the buffer shrinks, so playback continues at lower quality instead of stalling."}>
      <div className="space-y-3">
        <Chips label="Player" value={algo} options={[["tput", "Throughput only"], ["buffer", "Throughput + buffer"]]} onChange={setAlgo} />
        <SimControls sim={sim} stepLabel="+5 s" stepN={20} extra={<span className="num text-[12px] text-faint">t = {s.t.toFixed(0)} s · network {bwAt(s.t)} Mbit/s</span>} />
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-line bg-bg p-3"><div className="mb-1 text-[10.5px] uppercase tracking-wider text-faint">Network (grey) vs chosen bitrate (blue), Mbit/s</div>
            <div className="relative"><Spark data={s.hist.bw} max={9} color="#4a5170" h={70} label="Network bandwidth" /><div className="absolute inset-0"><Spark data={s.hist.br} max={9} color="var(--color-hld)" h={70} label="Chosen bitrate" /></div></div></div>
          <div className="rounded-xl border border-line bg-bg p-3"><div className="mb-1 text-[10.5px] uppercase tracking-wider text-faint">Buffer (seconds of video ready)</div><Spark data={s.hist.buf} max={30} color="var(--color-ok)" h={70} label="Buffer level" /></div>
        </div>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          <Stat k="Current rendition" v={`${LADDER[s.rendition]} Mbit/s`} />
          <Stat k="Buffer" v={`${s.buffer.toFixed(1)} s`} tone={s.buffer < 4 ? "var(--color-bad)" : undefined} />
          <Stat k="Stalls" v={s.stalls} tone={s.stalls ? "var(--color-bad)" : "var(--color-ok)"} />
          <Stat k="Throughput estimate" v={`${s.est.toFixed(1)} Mbit/s`} />
        </div>
      </div>
    </Frame>
  );
}

// ───────── inverted index ─────────
const DOCS = ["The cat sat on the mat", "A dog chased the cat", "Running shoes for trail running", "The dog runs on the trail"];
const STOP = new Set(["the", "a", "on", "for"]);
const stem = (w: string) => w.replace(/(ning|ing|s)$/, "").replace(/nn$/, "n");
const terms = (s: string) => s.toLowerCase().split(/\W+/).filter((w) => w && !STOP.has(w)).map(stem);
export function InvertedIndex() {
  const [q, setQ] = useState("cat AND dog");
  const index = useMemo(() => { const ix: Record<string, number[]> = {}; DOCS.forEach((d, i) => new Set(terms(d)).forEach((t) => (ix[t] ??= []).push(i + 1))); return ix; }, []);
  const op = /\bOR\b/.test(q) ? "OR" : "AND";
  const qt = terms(q.replace(/\b(AND|OR)\b/g, " "));
  const lists = qt.map((t) => ({ t, ids: index[t] ?? [] }));
  const result = !lists.length ? [] : op === "AND" ? lists.reduce<number[]>((acc, l, i) => (i ? acc.filter((x) => l.ids.includes(x)) : l.ids), []) : [...new Set(lists.flatMap((l) => l.ids))].sort();
  return (
    <Frame title="An inverted index" q="How does a search engine find documents containing both words without reading every document?"
      about="Four tiny documents are tokenised (lower-cased, stop words removed, simple stemming: 'running' → 'run'). The index maps each term to the sorted list of documents containing it. Type a query with AND or OR."
      foot={`${op} query: ${op === "AND" ? "intersect the posting lists (start with the shortest)" : "merge the posting lists"} → documents ${result.join(", ") || "none"}. The documents themselves were never scanned.`}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Query" className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-bg px-3 font-mono text-[13px] outline-none focus:border-accent/60" />
          {["cat AND dog", "dog OR mat", "running AND trail", "trail AND cat"].map((x) => <Btn key={x} on={q === x} onClick={() => setQ(x)}>{x}</Btn>)}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1 rounded-xl border border-line bg-bg p-3">
            <div className="mb-1 text-[10.5px] uppercase tracking-wider text-faint">Documents</div>
            {DOCS.map((d, i) => <div key={i} className={cn("rounded px-1.5 py-0.5 text-[12.5px]", result.includes(i + 1) ? "bg-accent/15 text-text" : "text-mute")}><span className="font-mono text-faint">{i + 1}</span> {d}</div>)}
          </div>
          <div className="rounded-xl border border-line bg-bg p-3">
            <div className="mb-1 text-[10.5px] uppercase tracking-wider text-faint">Index: term → posting list</div>
            <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 font-mono text-[12px]">
              {Object.keys(index).sort().map((t) => { const hit = qt.includes(t); return [<span key={t + "a"} className={hit ? "text-accent" : "text-faint"}>{t}</span>, <span key={t + "b"} className={hit ? "text-text" : "text-faint"}>[{index[t].join(", ")}]</span>]; })}
            </div>
          </div>
        </div>
        <Stat k="Result" v={result.length ? `docs ${result.join(", ")}` : "no documents"} tone="var(--color-accent)" />
      </div>
    </Frame>
  );
}

// ───────── geohash ─────────
const B32 = "0123456789bcdefghjkmnpqrstuvwxyz";
function encode(lat: number, lng: number, p: number) {
  const latR = [-90, 90], lngR = [-180, 180];
  let bit = 0, ch = 0, even = true, out = "";
  while (out.length < p) {
    const r = even ? lngR : latR, v = even ? lng : lat, mid = (r[0] + r[1]) / 2;
    if (v >= mid) { ch = (ch << 1) | 1; r[0] = mid; } else { ch = ch << 1; r[1] = mid; }
    even = !even;
    if (++bit === 5) { out += B32[ch]; bit = 0; ch = 0; }
  }
  return out;
}
const cellSize = (p: number) => { const bits = 5 * p, lngBits = Math.ceil(bits / 2), latBits = Math.floor(bits / 2); return { w: 360 / 2 ** lngBits, h: 180 / 2 ** latBits }; };
const PLACES = Array.from({ length: 70 }, (_, i) => [Math.sin(i * 12.9898) * 43758.5453 % 1, Math.sin(i * 78.233) * 12543.24 % 1].map((x) => Math.abs(x)));
const START = { lat: 37.7762, lng: -122.4195 };
export function Geohash() {
  const [p, setP] = useState(6);
  const [pos, setPos] = useState(START);
  const { w, h } = cellSize(p);
  const here = encode(pos.lat, pos.lng, p);
  const lng0 = Math.floor((pos.lng + 180) / w) * w - 180, lat0 = Math.floor((pos.lat + 90) / h) * h - 90;
  const cells = [1, 0, -1].flatMap((dy) => [-1, 0, 1].map((dx) => ({ dx, dy, gh: encode(lat0 + (dy + 0.5) * h, lng0 + (dx + 0.5) * w, p) })));
  // places sit at fixed map positions around the starting point (a 5×5-cell area), so they don't move with you
  const aLng0 = Math.floor((START.lng + 180) / w) * w - 180, aLat0 = Math.floor((START.lat + 90) / h) * h - 90;
  const places = PLACES.map(([a, b]) => ({ lat: aLat0 - 2 * h + a * 5 * h, lng: aLng0 - 2 * w + b * 5 * w }))
    .filter((pl) => pl.lat >= lat0 - h && pl.lat <= lat0 + 2 * h && pl.lng >= lng0 - w && pl.lng <= lng0 + 2 * w);
  const R = Math.min(w, h) * 0.8; // search radius in degrees, about one cell
  const inR = (pl: { lat: number; lng: number }) => Math.hypot((pl.lat - pos.lat) / h, (pl.lng - pos.lng) / w) <= R / Math.min(w, h);
  const S = 300, X = (lng: number) => ((lng - (lng0 - w)) / (3 * w)) * S, Y = (lat: number) => S - ((lat - (lat0 - h)) / (3 * h)) * S;
  const common = (a: string, b: string) => { let i = 0; while (i < a.length && a[i] === b[i]) i++; return i; };
  const nudge = (dLat: number, dLng: number) => setPos((q) => ({ lat: q.lat + dLat * h * 0.35, lng: q.lng + dLng * w * 0.35 }));
  return (
    <Frame title="Geohash cells and neighbours" q="To find places near you, why isn't searching your own geohash cell enough?"
      about="The 3×3 grid shows your cell (centre) and its eight neighbours at the chosen precision, with their geohashes. Dots are places; green ones are within the search radius (circle). Move your position toward an edge."
      foot={`Your cell is ${here}. Places near a border sit in neighbouring cells, and some neighbours share only ${Math.min(...cells.map((c) => common(c.gh, here)))} leading characters with you, so a prefix search on your own cell would miss them. Query all 9 cells, then filter by real distance.`}>
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <Slider label="Precision (characters)" value={p} min={3} max={8} onChange={setP} fmt={(v) => `${v} → cell ≈ ${(cellSize(v).h * 111).toFixed(cellSize(v).h * 111 < 1 ? 2 : 0)} km tall`} />
          <div className="flex items-center gap-1"><Btn onClick={() => nudge(0, -1)}>←</Btn><Btn onClick={() => nudge(1, 0)}>↑</Btn><Btn onClick={() => nudge(-1, 0)}>↓</Btn><Btn onClick={() => nudge(0, 1)}>→</Btn></div>
        </div>
        <div className="grid gap-3 md:grid-cols-[320px_1fr]">
          <svg viewBox={`0 0 ${S} ${S}`} className="w-full rounded-xl border border-line bg-[#0c0e15]" role="img" aria-label="Geohash grid">
            {cells.map((c) => (
              <g key={c.dx + "," + c.dy}>
                <rect x={(c.dx + 1) * (S / 3)} y={(1 - c.dy) * (S / 3)} width={S / 3} height={S / 3} fill={c.dx === 0 && c.dy === 0 ? "rgb(200 245 71 / .07)" : "transparent"} stroke="#2f3550" />
                <text x={(c.dx + 1) * (S / 3) + 6} y={(1 - c.dy) * (S / 3) + 14} className="font-mono text-[10px]">
                  <tspan fill="#c8f547">{c.gh.slice(0, common(c.gh, here))}</tspan><tspan fill="#9096ad">{c.gh.slice(common(c.gh, here))}</tspan>
                </text>
              </g>
            ))}
            <circle cx={X(pos.lng)} cy={Y(pos.lat)} r={(R / (3 * Math.min(w, h))) * S} fill="none" stroke="#c8f547" strokeOpacity={0.4} strokeDasharray="4 4" />
            {places.map((pl, i) => <circle key={i} cx={X(pl.lng)} cy={Y(pl.lat)} r={3.5} fill={inR(pl) ? "#5be49b" : "#4a5170"} />)}
            <motion.circle animate={{ cx: X(pos.lng), cy: Y(pos.lat) }} r={6} fill="#c8f547" stroke="#0b1000" strokeWidth={2} />
          </svg>
          <div className="space-y-2 text-[12.5px]">
            <Stat k="Your geohash" v={<span className="font-mono">{here}</span>} />
            <Stat k="Places in radius" v={places.filter(inR).length} sub={`in your own cell only: ${places.filter((pl) => inR(pl) && encode(pl.lat, pl.lng, p) === here).length}`} />
            <p className="text-faint">Green prefix: characters shared with your cell. Neighbours across a high-level boundary can share very few.</p>
          </div>
        </div>
      </div>
    </Frame>
  );
}

// ───────── HyperLogLog ─────────
const fmix = (h: number) => { h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return h >>> 0; };
const hash32 = (i: number) => fmix(Math.imul(i + 0x9e3779b9, 0x27d4eb2d) ^ 0x165667b1);
export function Hll() {
  const [logN, setLogN] = useState(4);
  const [b, setB] = useState(6);
  const n = Math.round(10 ** logN), m = 2 ** b;
  const reg = useMemo(() => {
    const r = new Uint8Array(m);
    for (let i = 0; i < n; i++) {
      const h = hash32(i), j = h >>> (32 - b), rest = (h << b) >>> 0;
      const rho = rest === 0 ? 32 - b + 1 : Math.clz32(rest) + 1;
      if (rho > r[j]) r[j] = rho;
    }
    return r;
  }, [n, m, b]);
  const alpha = m === 16 ? 0.673 : m === 32 ? 0.697 : m === 64 ? 0.709 : 0.7213 / (1 + 1.079 / m);
  let sum = 0, zeros = 0; reg.forEach((v) => { sum += 2 ** -v; if (!v) zeros++; });
  let est = (alpha * m * m) / sum;
  if (est <= 2.5 * m && zeros) est = m * Math.log(m / zeros); // small-range correction
  const err = (est - n) / n;
  return (
    <Frame title="HyperLogLog: counting distinct items" q="How can a few hundred bytes estimate how many distinct users visited, to within a few percent?"
      about="Each item is hashed. The first bits pick a register; the register keeps the longest run of leading zeros seen in the rest of the hash (+1). Long runs are rare, so they reveal how many distinct items went by. Change the true count and the number of registers."
      foot={`True distinct count ${n.toLocaleString()}, estimate ${Math.round(est).toLocaleString()} (${(err * 100).toFixed(1)}% off). Expected error ≈ 1.04/√m = ${((1.04 / Math.sqrt(m)) * 100).toFixed(1)}% with ${m} registers (${m} bytes). Adding the same items again changes nothing: duplicates hash identically.`}>
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Slider label="Distinct items added" value={logN} min={2} max={5.3} step={0.1} onChange={setLogN} fmt={() => n.toLocaleString()} />
          <Slider label="Registers (m)" value={b} min={4} max={10} onChange={setB} fmt={(v) => `${2 ** v}`} />
        </div>
        <div className="flex flex-wrap gap-[3px] rounded-xl border border-line bg-bg p-2">
          {Array.from(reg).map((v, i) => <span key={i} title={`register ${i}: ${v}`} className="grid h-5 w-5 place-items-center rounded-sm font-mono text-[9px]" style={{ background: `rgb(122 167 255 / ${Math.min(0.9, v / 22)})`, color: v > 10 ? "#0b1000" : "#9096ad" }}>{v}</span>)}
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <Stat k="True distinct" v={n.toLocaleString()} />
          <Stat k="HLL estimate" v={Math.round(est).toLocaleString()} tone="var(--color-accent)" />
          <Stat k="Error" v={`${(err * 100).toFixed(1)}%`} tone={Math.abs(err) > 0.15 ? "var(--color-warn)" : "var(--color-ok)"} />
        </div>
      </div>
    </Frame>
  );
}
