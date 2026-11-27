"use client";
/** Database visuals: index seek vs scan, B-tree vs LSM write and read paths, row vs column storage. */
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Btn, Chips, Frame, Predict, Stat } from "./kit";
import { cn } from "../../ui";

// ───────── index explorer ─────────
type Row = { id: number; cust: number; day: number; total: number; status: "paid" | "pending" | "refunded" };
const ROWS: Row[] = Array.from({ length: 24 }, (_, i) => ({
  id: i + 1, cust: [3, 7, 1, 7, 5, 2, 7, 3, 9, 1, 4, 7, 2, 5, 8, 3, 6, 7, 1, 9, 4, 2, 6, 8][i],
  day: [2, 4, 5, 7, 8, 9, 11, 12, 13, 15, 16, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30][i],
  total: [40, 12, 99, 25, 60, 33, 18, 75, 51, 20, 44, 87, 15, 66, 29, 38, 92, 57, 11, 70, 23, 48, 81, 35][i],
  status: (i % 5 === 3 ? "pending" : i % 11 === 6 ? "refunded" : "paid"),
}));
type Ix = "pk" | "cust_day" | "day" | "status";
const IXNAME: Record<Ix, string> = { pk: "id (primary key)", cust_day: "(customer, day)", day: "(day)", status: "(status)" };
type Query = { key: string; sql: string; match: (r: Row) => boolean; uses: (ix: Set<Ix>) => { ix: Ix | null; why: string }; limit?: number; order?: (a: Row, b: Row) => number };
const QUERIES: Query[] = [
  { key: "id", sql: "SELECT * FROM orders WHERE id = 17", match: (r) => r.id === 17, uses: () => ({ ix: "pk", why: "The primary-key index finds id 17 in a few page reads." }) },
  { key: "cust", sql: "WHERE customer = 7 ORDER BY day DESC LIMIT 3", match: (r) => r.cust === 7, limit: 3, order: (a, b) => b.day - a.day,
    uses: (s) => s.has("cust_day") ? { ix: "cust_day", why: "(customer, day) is sorted by customer, then day: seek to customer 7, read the last 3 entries in order. No sort needed." } : { ix: null, why: "No index starts with customer: scan every row, then sort the matches." } },
  { key: "day", sql: "WHERE day >= 25", match: (r) => r.day >= 25,
    uses: (s) => s.has("day") ? { ix: "day", why: "The (day) index jumps to day 25 and reads forward." } : { ix: null, why: s.has("cust_day") ? "(customer, day) can't help: days are scattered across every customer (leftmost-prefix rule). Full scan." : "No index on day: full scan." } },
  { key: "status", sql: "WHERE status = 'paid'", match: (r) => r.status === "paid",
    uses: (s) => ({ ix: null, why: s.has("status") ? "An index on status exists, but 'paid' matches most rows. Fetching nearly every row through the index costs more than one sequential scan, so the planner scans." : "No index on status: full scan." }) },
];
const keyOf = (ix: Ix, r: Row) => ix === "pk" ? `${r.id}` : ix === "cust_day" ? `c${r.cust}·d${String(r.day).padStart(2, "0")}` : ix === "day" ? `d${String(r.day).padStart(2, "0")}` : r.status;
const sortRows = (ix: Ix) => [...ROWS].sort((a, b) => ix === "pk" ? a.id - b.id : ix === "cust_day" ? a.cust - b.cust || a.day - b.day : ix === "day" ? a.day - b.day : a.status.localeCompare(b.status) || a.id - b.id);

export function IndexExplorer() {
  const [qk, setQk] = useState("cust");
  const [ixs, setIxs] = useState<Set<Ix>>(new Set(["pk"]));
  const q = QUERIES.find((x) => x.key === qk)!;
  const plan = q.uses(ixs);
  const matches = ROWS.filter(q.match).sort(q.order ?? (() => 0)).slice(0, q.limit ?? 99);
  const read = plan.ix ? matches.map((r) => r.id) : ROWS.map((r) => r.id);
  const sorted = plan.ix ? sortRows(plan.ix) : [];
  const toggle = (ix: Ix) => setIxs((s) => { const n = new Set(s); if (n.has(ix)) n.delete(ix); else n.add(ix); n.add("pk"); return n; });
  const cost = plan.ix ? 3 + matches.length : ROWS.length; // ~3 page reads down the tree, then one per matching row
  return (
    <Frame title="Index seek or full scan?" q="Which rows does the database have to read to answer each query?"
      about="A tiny orders table (24 rows standing in for millions). Choose a query and which indexes exist. Highlighted rows are the ones the database reads."
      foot={plan.why}>
      <div className="space-y-3">
        <Predict q="With only an index on (customer, day), can 'WHERE day >= 25' use it?" options={["Yes", "No"]} answer={1} why="The index is sorted by customer first; days are spread across all customers, like first names in a phone book sorted by surname." />
        <Chips label="Query" value={qk} options={QUERIES.map((x) => [x.key, x.sql] as [string, string])} onChange={setQk} />
        <div className="flex flex-wrap items-center gap-1.5"><span className="mr-1 text-[12px] text-faint">Indexes</span>
          {(Object.keys(IXNAME) as Ix[]).map((ix) => <Btn key={ix} on={ixs.has(ix)} disabled={ix === "pk"} onClick={() => toggle(ix)}>{IXNAME[ix]}</Btn>)}
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full font-mono text-[11.5px]">
              <thead className="bg-panel2 text-faint"><tr>{["id", "customer", "day", "total", "status"].map((h) => <th key={h} className="px-2 py-1 text-left font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {ROWS.map((r) => { const hit = matches.some((m) => m.id === r.id), touched = read.includes(r.id); return (
                  <tr key={r.id} className={cn("border-t border-line transition", hit ? "bg-accent/[0.12] text-text" : touched ? "bg-bad/[0.07] text-mute" : "text-faint")}>
                    <td className="px-2 py-0.5">{r.id}</td><td className="px-2 py-0.5">{r.cust}</td><td className="px-2 py-0.5">{r.day}</td><td className="px-2 py-0.5">{r.total}</td><td className="px-2 py-0.5">{r.status}</td>
                  </tr>
                ); })}
              </tbody>
            </table>
          </div>
          <div className="space-y-2">
            {plan.ix ? (
              <div className="rounded-xl border border-line bg-bg p-2">
                <div className="mb-1 text-[10.5px] uppercase tracking-wider text-faint">Index {IXNAME[plan.ix]}: sorted entries</div>
                <div className="flex max-h-[300px] flex-col gap-[2px] overflow-y-auto">
                  {sorted.map((r) => <motion.div key={r.id} layout className={cn("flex justify-between rounded px-1.5 font-mono text-[11px]", matches.some((m) => m.id === r.id) ? "bg-accent/20 text-accent" : "text-faint")}><span>{keyOf(plan.ix!, r)}</span><span>→ row {r.id}</span></motion.div>)}
                </div>
              </div>
            ) : <div className="rounded-xl border border-dashed border-bad/40 p-3 text-[12.5px] text-bad">Full table scan: every row is read and checked.</div>}
            <div className="grid grid-cols-2 gap-1.5">
              <Stat k="Rows read" v={read.length} tone={read.length > 10 ? "var(--color-bad)" : "var(--color-ok)"} />
              <Stat k="≈ page reads" v={cost} sub={plan.ix ? "3 down the tree + rows" : "every page"} />
            </div>
            <p className="text-[11.5px] leading-relaxed text-faint">At 500 million rows, a scan reads every page; the index seek still reads about the same handful.</p>
          </div>
        </div>
      </div>
    </Frame>
  );
}

// ───────── B-tree vs LSM ─────────
type Op = { k: number; v?: string; del?: boolean };
const OPS: Op[] = [42, 7, 93, 15, 61, 28, 77, 3, 50, 88, 19, 64].map((k): Op => ({ k })).concat([{ k: 42, v: "v2" }, { k: 7, del: true }, { k: 33 }, { k: 70 }] as Op[]);
const LEAF = 4, MEM = 4;
type BTree = { leaves: number[][]; randomWrites: number; splits: number };
type Lsm = { mem: Map<number, string>; ssts: { id: number; keys: Map<number, string>; level: number }[]; seqWrites: number; rewritten: number; next: number; flushes: number; compactions: number };
function bInsert(t: BTree, k: number) {
  const leaves = t.leaves.map((l) => [...l]);
  let i = leaves.findIndex((l, j) => j === leaves.length - 1 || k < leaves[j + 1][0]);
  if (i < 0) i = 0;
  if (leaves[i].includes(k)) { t.randomWrites++; return { ...t, leaves }; } // update in place: rewrite the page
  leaves[i] = [...leaves[i], k].sort((a, b) => a - b);
  let { randomWrites, splits } = t;
  randomWrites++;
  if (leaves[i].length > LEAF) { const l = leaves[i]; leaves.splice(i, 1, l.slice(0, 2), l.slice(2)); splits++; randomWrites += 2; } // two halves + parent page
  return { leaves, randomWrites, splits };
}
function bDelete(t: BTree, k: number) { return { ...t, leaves: t.leaves.map((l) => l.filter((x) => x !== k)).filter((l, i, all) => l.length || all.length === 1), randomWrites: t.randomWrites + 1 }; }
function lsmWrite(s: Lsm, k: number, v: string): Lsm {
  const mem = new Map(s.mem); mem.set(k, v);
  let out: Lsm = { ...s, mem };
  if (mem.size >= MEM) {
    const sst = { id: s.next, keys: new Map([...mem].sort((a, b) => a[0] - b[0])), level: 0 };
    out = { ...out, mem: new Map(), ssts: [sst, ...s.ssts], seqWrites: s.seqWrites + 1, next: s.next + 1, flushes: s.flushes + 1 };
    const l0 = out.ssts.filter((x) => x.level === 0);
    if (l0.length >= 3) { // compaction: merge level 0 (and the old level 1) into one level-1 file, newest value wins, tombstones dropped
      const merged = new Map<number, string>();
      const inputs = [...out.ssts].reverse(); // oldest first, so newer values overwrite
      inputs.forEach((f) => f.keys.forEach((val, key) => merged.set(key, val)));
      const live = new Map([...merged].filter(([, val]) => val !== "✝").sort((a, b) => a[0] - b[0]));
      const bytes = inputs.reduce((n, f) => n + f.keys.size, 0);
      out = { ...out, ssts: [{ id: out.next, keys: live, level: 1 }], next: out.next + 1, rewritten: out.rewritten + bytes, compactions: out.compactions + 1, seqWrites: out.seqWrites + 1 };
    }
  }
  return out;
}

export function BtreeLsm() {
  const [n, setN] = useState(0);
  const [probe, setProbe] = useState<number | null>(null);
  const { bt, lsm } = useMemo(() => {
    let bt: BTree = { leaves: [[]], randomWrites: 0, splits: 0 };
    let lsm: Lsm = { mem: new Map(), ssts: [], seqWrites: 0, rewritten: 0, next: 1, flushes: 0, compactions: 0 };
    OPS.slice(0, n).forEach((op) => {
      if (op.del) { bt = bDelete(bt, op.k); lsm = lsmWrite(lsm, op.k, "✝"); }
      else { bt = bInsert(bt, op.k); lsm = lsmWrite(lsm, op.k, op.v ?? "v1"); }
    });
    return { bt, lsm };
  }, [n]);
  const op = n > 0 ? OPS[n - 1] : null;
  const lsmProbe = probe === null ? null : (() => {
    const steps: { where: string; found: boolean; skipped?: boolean }[] = [{ where: "memtable", found: lsm.mem.has(probe) }];
    if (!lsm.mem.has(probe)) for (const f of lsm.ssts) {
      const has = f.keys.has(probe);
      // each file's Bloom filter says "definitely not here" for keys it lacks (a real filter is wrong ~1% of the time)
      steps.push({ where: `SST ${f.id}`, found: has, skipped: !has });
      if (has) break;
    }
    return steps;
  })();
  const say = !op ? "Press Next write. Both engines receive the same 16 operations: inserts, an update of key 42 and a delete of key 7." :
    op.del ? `Delete ${op.k}. The B-tree removes it from its page in place. The LSM tree cannot change written files, so it writes a tombstone (✝) that hides older copies until compaction removes them.` :
    op.v ? `Update ${op.k}. The B-tree rewrites the page holding ${op.k}. The LSM tree just writes the new version; the old one stays in an older file until compaction.` :
    `Insert ${op.k}. The B-tree finds the right leaf and writes that page (a random write, plus a split if the page was full). The LSM tree adds it to the in-memory memtable; when the memtable fills, it is written out as one sorted file in a single sequential write.`;
  return (
    <Frame title="B-tree vs LSM tree" q="Why can some databases take far more writes than others, and what do they pay for it?"
      about="Pages hold 4 keys; the memtable holds 4 keys. After three level-0 files pile up, compaction merges everything into one level-1 file."
      foot={say}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Btn on onClick={() => setN((x) => Math.min(OPS.length, x + 1))} disabled={n >= OPS.length}>Next write</Btn>
          <Btn onClick={() => setN(OPS.length)}>All writes</Btn>
          <Btn onClick={() => { setN(0); setProbe(null); }}>Reset</Btn>
          <span className="ml-2 text-[12px] text-faint">Read a key:</span>
          {[42, 7, 50, 3].map((k) => <Btn key={k} on={probe === k} onClick={() => setProbe(probe === k ? null : k)}>get {k}</Btn>)}
          <span className="num ml-auto text-[12px] text-faint">{n} / {OPS.length} operations</span>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-line bg-bg p-3">
            <div className="mb-2 text-[13px] font-semibold">B-tree: update pages in place</div>
            <div className="mb-1 flex justify-center"><span className="rounded-md border border-line px-2 py-1 font-mono text-[11px] text-mute">root: {bt.leaves.slice(1).map((l) => l[0]).join(" | ") || "—"}</span></div>
            <div className="flex flex-wrap justify-center gap-1.5">
              {bt.leaves.map((l, i) => <motion.div layout key={i} className="flex min-w-[70px] gap-1 rounded-md border border-[#2f3550] bg-panel2 px-1.5 py-1 font-mono text-[11px]">
                {l.map((k) => <span key={k} className={cn("rounded px-1", probe === k ? "bg-accent text-ink" : op && op.k === k && !op.del ? "bg-hld/30" : "")}>{k}</span>)}
                {Array.from({ length: LEAF - l.length }).map((_, j) => <span key={"e" + j} className="px-1 text-[#2a2f44]">·</span>)}
              </motion.div>)}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              <Stat k="Random page writes" v={bt.randomWrites} tone="var(--color-warn)" />
              <Stat k="Page splits" v={bt.splits} />
              <Stat k={probe === null ? "Read cost" : `get ${probe}`} v={probe === null ? "2 pages" : bt.leaves.some((l) => l.includes(probe)) ? "2 pages ✓" : "2 pages ✗"} sub="root → leaf" />
            </div>
          </div>
          <div className="rounded-xl border border-line bg-bg p-3">
            <div className="mb-2 text-[13px] font-semibold">LSM tree: append, flush, merge</div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2"><span className="w-20 text-[11px] text-faint">memtable (RAM)</span>
                <div className="flex min-h-7 flex-1 gap-1 rounded-md border border-dashed border-hld/50 px-1.5 py-1 font-mono text-[11px]">{[...lsm.mem].sort((a, b) => a[0] - b[0]).map(([k, v]) => <span key={k} className={cn("rounded px-1", v === "✝" ? "text-bad" : "")}>{k}{v === "v2" ? "′" : ""}{v === "✝" ? "✝" : ""}</span>)}</div></div>
              {lsm.ssts.map((f) => (
                <motion.div layout key={f.id} className="flex items-center gap-2"><span className="w-20 text-[11px] text-faint">SST {f.id} · L{f.level}</span>
                  <div className={cn("flex flex-1 flex-wrap gap-1 rounded-md border px-1.5 py-1 font-mono text-[11px]", f.level ? "border-ok/40" : "border-[#2f3550]")}>{[...f.keys].map(([k, v]) => <span key={k} className={cn("rounded px-1", probe === k ? "bg-accent text-ink" : v === "✝" ? "text-bad" : "")}>{k}{v === "v2" ? "′" : ""}{v === "✝" ? "✝" : ""}</span>)}</div></motion.div>
              ))}
              {!lsm.ssts.length && <div className="text-[11.5px] text-faint">No files on disk yet.</div>}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              <Stat k="Sequential file writes" v={lsm.seqWrites} tone="var(--color-ok)" />
              <Stat k="Keys rewritten by compaction" v={lsm.rewritten} />
              <Stat k={probe === null ? "Read cost" : `get ${probe}`} v={lsmProbe ? `${lsmProbe.length} checked, ${lsmProbe.filter((s) => !s.skipped).length} read` : "memtable + files"} sub={lsmProbe ? lsmProbe.map((s) => `${s.where}${s.skipped ? " (Bloom: no)" : s.found ? " ✓" : " ✗"}`).join(" → ") : "Bloom filters skip files"} />
            </div>
          </div>
        </div>
      </div>
    </Frame>
  );
}

// ───────── row vs column ─────────
const COLS = [["id", 8], ["name", 40], ["country", 2], ["total", 8], ["status", 10], ["created", 8], ["address", 120]] as const;
const ROWB = COLS.reduce((n, [, b]) => n + b, 0);
type RQ = "sum" | "one";
export function RowColumn() {
  const [q, setQ] = useState<RQ>("sum");
  const [compress, setCompress] = useState(false);
  const need = q === "sum" ? ["country", "total"] : COLS.map(([c]) => c);
  const rows = 1e9;
  const rowBytes = q === "sum" ? rows * ROWB : 8192; // one page for a single-row lookup
  const colRaw = q === "sum" ? rows * COLS.filter(([c]) => need.includes(c)).reduce((n, [, b]) => n + b, 0) : COLS.length * 8192;
  const colBytes = compress && q === "sum" ? colRaw / 6 : colRaw;
  const fmt = (b: number) => b >= 1e12 ? `${(b / 1e12).toFixed(1)} TB` : b >= 1e9 ? `${(b / 1e9).toFixed(1)} GB` : b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`;
  return (
    <Frame title="Row store vs column store" q="An analyst sums order totals by country over a billion orders. How much data does each layout read?"
      about="The same 7-column orders table stored two ways. Highlighted cells are what the query must read from disk."
      foot={q === "sum" ? `Row store: every byte of every row (${fmt(rowBytes)}). Column store: only country and total (${fmt(colBytes)})${compress ? ", compressed about 6× because similar values sit together" : ""}.` : "For one complete row, the row store reads a single page; the column store must visit every column's file. That is why transactional apps use row stores."}>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-3">
          <Chips label="Query" value={q} options={[["sum", "SUM(total) GROUP BY country"], ["one", "SELECT * WHERE id = 7"]]} onChange={setQ} />
          <Btn on={compress} onClick={() => setCompress(!compress)}>Column compression</Btn>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-line bg-bg p-3">
            <div className="mb-2 text-[13px] font-semibold">Row store: pages of whole rows</div>
            {[0, 1, 2].map((p) => (
              <div key={p} className="mb-1.5 rounded-md border border-[#2f3550] p-1">
                <div className="mb-0.5 text-[10px] text-faint">page {p + 1}</div>
                {[0, 1].map((r) => <div key={r} className="flex gap-[2px]">{COLS.map(([c, b]) => <span key={c} className={cn("h-3 rounded-sm", (q === "sum" || (p === 0 && r === 0)) ? "bg-bad/50" : "bg-[#1d2132]")} style={{ width: Math.max(6, b / 2) }} title={c} />)}</div>)}
              </div>
            ))}
            <Stat k="Bytes read" v={fmt(rowBytes)} tone={q === "sum" ? "var(--color-bad)" : "var(--color-ok)"} />
          </div>
          <div className="rounded-xl border border-line bg-bg p-3">
            <div className="mb-2 text-[13px] font-semibold">Column store: one file per column</div>
            {COLS.map(([c, b]) => { const used = need.includes(c); const w = Math.min(100, (b / 120) * 100) * (compress && used && q === "sum" ? 0.35 : 1); return (
              <div key={c} className="mb-1 flex items-center gap-2"><span className="w-16 font-mono text-[11px] text-faint">{c}</span>
                <motion.span className={cn("h-3 rounded-sm", used ? "bg-ok/60" : "bg-[#1d2132]")} animate={{ width: `${Math.max(4, w)}%` }} /></div>
            ); })}
            <Stat k="Bytes read" v={fmt(colBytes)} tone={q === "sum" ? "var(--color-ok)" : "var(--color-warn)"} />
          </div>
        </div>
      </div>
    </Frame>
  );
}
