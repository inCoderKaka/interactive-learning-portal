"use client";
/** Partitioning visuals: where load lands under range vs hash (and hot keys), rebalancing, Snowflake IDs. */
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Btn, Chips, Frame, Predict, Slider, Stat, NODE } from "./kit";
import { cn } from "../../ui";

// ───────── partition load ─────────
const P = 4, KEYS = 1000;
const h32 = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
type W = "time" | "users" | "celeb";
function writes(w: W): string[] {
  const out: string[] = [];
  for (let i = 0; i < 2000; i++) {
    if (w === "time") out.push(String(900 + (i % 100)).padStart(4, "0")); // keys are timestamps: all new writes are the newest keys
    else if (w === "users") out.push(String(h32("u" + i) % KEYS).padStart(4, "0"));
    else out.push(i % 10 < 3 ? "0420" : String(h32("u" + i) % KEYS).padStart(4, "0")); // one key takes 30% of all writes
  }
  return out;
}
export function PartitionLoad() {
  const [w, setW] = useState<W>("time");
  const [scheme, setScheme] = useState<"range" | "hash">("range");
  const [split, setSplit] = useState(false);
  const load = useMemo(() => {
    const c = Array(P).fill(0);
    writes(w).forEach((k, i) => {
      if (split && k === "0420") {
        // salting: the hot key becomes 8 keys, "s#0420" for s = 0..7. Hash spreads them; with ranges, the salt
        // prefix leads the key, so salts 0–1, 2–3, 4–5, 6–7 fall in different quarters of the key space.
        const salt = i % 8;
        c[scheme === "range" ? Math.floor(salt / 2) : h32(`${salt}#${k}`) % P]++;
        return;
      }
      c[scheme === "range" ? Math.min(P - 1, Math.floor(Number(k) / (KEYS / P))) : h32(k) % P]++;
    });
    return c;
  }, [w, scheme, split]);
  const max = Math.max(...load), avg = load.reduce((a, b) => a + b, 0) / P;
  const rangeCost = scheme === "range" ? 1 : P;
  return (
    <Frame title="Where does the load land?" q="Same writes, two ways of splitting the data. Which partition melts?"
      about="2,000 writes over keys 0000–0999, split across 4 partitions. Range: each partition owns a quarter of the key range. Hash: hash(key) picks the partition."
      foot={w === "time" && scheme === "range" ? "Timestamps only grow, so every new write falls in the newest range: one partition takes everything while three idle. Hashing spreads it, at the cost of range scans." : w === "celeb" && !split ? "One key takes 30% of all writes. No scheme can spread a single key: it always maps to one partition. Split it into sub-keys." : split && w === "celeb" ? "The hot key is now 8 sub-keys spread over partitions; readers sum (or merge) the 8 pieces." : "Load is even. Note the range-query cost: with hash partitioning, 'keys 0400–0499' must ask every partition."}>
      <div className="space-y-3">
        <Predict q="Keys are timestamps and the store is range-partitioned. Where do new writes go?" options={["Spread evenly", "All to the newest range's partition"]} answer={1} why="New timestamps are always the largest keys, so they all fall into the last range." />
        <div className="flex flex-wrap gap-3">
          <Chips label="Keys" value={w} options={[["time", "Timestamps (always increasing)"], ["users", "User IDs (random)"], ["celeb", "User IDs + one celebrity (30%)"]]} onChange={setW} />
          <Chips label="Scheme" value={scheme} options={[["range", "Range"], ["hash", "Hash"]]} onChange={setScheme} />
          {w === "celeb" && <Btn on={split} onClick={() => setSplit(!split)}>Split the hot key ×8</Btn>}
        </div>
        <div className="flex h-40 items-end gap-3 rounded-xl border border-line bg-bg p-3">
          {load.map((v, i) => (
            <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
              <span className="num text-[11px] text-mute">{v}</span>
              <motion.div className="w-full rounded-t-md" animate={{ height: `${(v / Math.max(1, max)) * 85}%` }} style={{ background: v > avg * 1.8 ? "var(--color-bad)" : NODE[i], minHeight: 3 }} />
              <span className="font-mono text-[10.5px] text-faint">P{i + 1}{scheme === "range" ? ` ${String(i * 250).padStart(4, "0")}–${String(i * 250 + 249).padStart(4, "0")}` : ""}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <Stat k="Busiest partition" v={`${Math.round((max / 2000) * 100)}%`} tone={max > avg * 1.8 ? "var(--color-bad)" : "var(--color-ok)"} sub="ideal 25%" />
          <Stat k="Imbalance (max ÷ avg)" v={`${(max / avg).toFixed(1)}×`} />
          <Stat k="Range query 0400–0499" v={`${rangeCost} partition${rangeCost > 1 ? "s" : ""}`} tone={rangeCost > 1 ? "var(--color-warn)" : "var(--color-ok)"} />
        </div>
      </div>
    </Frame>
  );
}

// ───────── rebalancing ─────────
const PARTS = 12;
function place(nodes: number, prev?: number[]): number[] {
  if (!prev) return Array.from({ length: PARTS }, (_, i) => i % nodes);
  // fixed partitions: the new node steals partitions from the most loaded nodes until balanced; others stay put
  const a = [...prev];
  const target = Math.floor(PARTS / nodes);
  const newNode = nodes - 1;
  while (a.filter((x) => x === newNode).length < target) {
    const counts = Array.from({ length: nodes }, (_, n) => a.filter((x) => x === n).length);
    const donor = counts.indexOf(Math.max(...counts));
    const i = a.lastIndexOf(donor); a[i] = newNode;
  }
  return a;
}
export function Rebalance() {
  const [hist, setHist] = useState<number[][]>([place(3)]);
  const cur = hist[hist.length - 1], prev = hist[hist.length - 2];
  const nodes = Math.max(...cur) + 1;
  const moved = prev ? cur.filter((x, i) => x !== prev[i]).length : 0;
  const modMoved = prev ? 1 - 1 / nodes : 0;
  return (
    <Frame title="Adding a node: what moves?" q="A fourth server joins three. How much data has to move?"
      about="12 fixed partitions spread over the servers. Adding a server hands it whole partitions taken from the others; keys never change partition. Compare with re-hashing every key with hash % N."
      foot={prev ? `${moved} of ${PARTS} partitions moved (${Math.round((moved / PARTS) * 100)}% of the data). Re-hashing with hash % ${nodes} instead of % ${nodes - 1} would move about ${Math.round(modMoved * 100)}% of all keys.` : "Press Add a server."}>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          <Btn on onClick={() => setHist((h) => [...h, place(nodes + 1, cur)])} disabled={nodes >= 6}>Add a server</Btn>
          <Btn onClick={() => setHist([place(3)])}>Reset</Btn>
        </div>
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${nodes}, minmax(0, 1fr))` }}>
          {Array.from({ length: nodes }, (_, n) => (
            <div key={n} className="rounded-xl border border-line bg-bg p-2">
              <div className="mb-1.5 text-[11.5px] font-semibold" style={{ color: NODE[n] }}>server {n + 1}</div>
              <div className="flex flex-wrap gap-1">
                {cur.map((x, p) => x === n && (
                  <motion.span key={p} layoutId={`p${p}`} className={cn("grid h-7 w-9 place-items-center rounded-md border font-mono text-[11px]", prev && prev[p] !== x ? "border-accent bg-accent/15 text-accent" : "border-line text-mute")}>P{p + 1}</motion.span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <Stat k="Moved with fixed partitions" v={prev ? `${Math.round((moved / PARTS) * 100)}%` : "–"} tone="var(--color-ok)" />
          <Stat k="Moved with hash % N" v={prev ? `≈ ${Math.round(modMoved * 100)}%` : "–"} tone="var(--color-bad)" />
        </div>
      </div>
    </Frame>
  );
}

// ───────── Snowflake ─────────
const EPOCH = BigInt("1288834974657"); // Twitter's epoch (Nov 2010), in ms
export function Snowflake() {
  const [offset, setOffset] = useState(0); // ms after a fixed moment, so the demo is deterministic
  const [machine, setMachine] = useState(37);
  const [seq, setSeq] = useState(0);
  const base = BigInt("1764201600000"); // 2025-11-27 00:00 UTC
  const ms = base + BigInt(offset);
  const t = ms - EPOCH;
  const id = (t << BigInt(22)) | (BigInt(machine) << BigInt(12)) | BigInt(seq);
  const bits = id.toString(2).padStart(64, "0");
  const groups: [string, string, string][] = [[bits.slice(0, 1), "sign", "#5d637c"], [bits.slice(1, 42), "41-bit timestamp (ms since 2010-11-04)", "#7aa7ff"], [bits.slice(42, 52), "10-bit machine", "#ffb454"], [bits.slice(52), "12-bit sequence", "#4fd1c5"]];
  return (
    <Frame title="Building a Snowflake ID" q="How can 1,024 machines each make millions of unique IDs per second without talking to each other?"
      about="A 64-bit ID is a timestamp, the generating machine's number, and a counter within the millisecond. Change the inputs and watch the bits."
      foot="Because the timestamp sits in the highest bits, sorting IDs sorts them by creation time. Uniqueness needs only unique machine numbers and a clock that never goes backwards.">
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <Slider label="Time (ms later)" value={offset} min={0} max={5000} step={1} onChange={(v) => { setOffset(v); setSeq(0); }} fmt={(v) => `+${v} ms`} />
          <Slider label="Machine ID (0–1023)" value={machine} min={0} max={1023} onChange={setMachine} />
          <Slider label="Sequence in this ms (0–4095)" value={seq} min={0} max={4095} onChange={setSeq} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Btn on onClick={() => setSeq((s) => (s < 4095 ? s + 1 : s))}>Next ID in the same millisecond</Btn>
          <Btn onClick={() => { setOffset((o) => o + 1); setSeq(0); }}>Next millisecond</Btn>
        </div>
        <div className="overflow-x-auto rounded-xl border border-line bg-bg p-3">
          <div className="flex min-w-[560px] flex-wrap gap-y-2 font-mono text-[12px]">
            {groups.map(([b, label, c]) => (
              <div key={label} className="mr-2">
                <div className="flex">{b.split("").map((x, i) => <span key={i} className="w-[7.5px] text-center" style={{ color: c }}>{x}</span>)}</div>
                <div className="mt-0.5 text-[10px]" style={{ color: c }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          <Stat k="ID (decimal)" v={<span className="font-mono text-[13px]">{id.toString()}</span>} />
          <Stat k="Created at (UTC)" v={<span className="text-[12px]">{new Date(Number(ms)).toISOString().replace("T", " ").slice(0, 23)}</span>} />
          <Stat k="Per machine" v="4,096/ms" sub="≈ 4.1 million/s" />
          <Stat k="Timestamp range" v="≈ 69 years" sub="2⁴¹ ms" />
        </div>
      </div>
    </Frame>
  );
}
