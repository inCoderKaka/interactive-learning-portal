"use client";
/** Replication visual: a network partition between two regions, in CP or AP mode. */
import { useState } from "react";
import { motion } from "motion/react";
import { Unplug, Plug } from "lucide-react";
import { Btn, Chips, Frame, Predict } from "./kit";
import { cn } from "../../ui";

type Rep = { id: string; side: "A" | "B"; v: string; ts: number };
type Ev = { ok: boolean; text: string };
const START: Rep[] = [{ id: "A1", side: "A", v: "x = 0", ts: 0 }, { id: "A2", side: "A", v: "x = 0", ts: 0 }, { id: "B1", side: "B", v: "x = 0", ts: 0 }];

export function PartitionSim() {
  const [mode, setMode] = useState<"cp" | "ap">("cp");
  const [link, setLink] = useState(true);
  const [reps, setReps] = useState<Rep[]>(START);
  const [log, setLog] = useState<Ev[]>([]);
  const [clock, setClock] = useState(1);
  const [n, setN] = useState({ A: 0, B: 0 });
  const add = (e: Ev) => setLog((l) => [e, ...l].slice(0, 8));
  const reset = () => { setReps(START); setLog([]); setLink(true); setClock(1); setN({ A: 0, B: 0 }); };

  const write = (side: "A" | "B") => {
    const k = n[side] + 1; setN({ ...n, [side]: k });
    const val = `x = ${side.toLowerCase()}${k}`, ts = clock; setClock(clock + 1);
    if (link) { setReps((r) => r.map((x) => ({ ...x, v: val, ts }))); add({ ok: true, text: `Write ${val} via region ${side}: replicated to all 3 replicas.` }); return; }
    if (mode === "cp" && side === "B") { add({ ok: false, text: `Write ${val} via region B refused: B has 1 of 3 replicas, no majority. The client gets an error (try later).` }); return; }
    setReps((r) => r.map((x) => (x.side === side ? { ...x, v: val, ts } : x)));
    add({ ok: true, text: mode === "cp" ? `Write ${val} via region A accepted: A holds 2 of 3 replicas, a majority.` : `Write ${val} accepted locally in region ${side} (only its own replicas have it).` });
  };
  const read = (side: "A" | "B") => {
    const local = reps.find((x) => x.side === side)!;
    const newest = [...reps].sort((a, b) => b.ts - a.ts)[0];
    if (!link && mode === "cp" && side === "B") { add({ ok: false, text: "Read via region B refused: it cannot confirm it has the latest value without a majority." }); return; }
    const stale = local.ts < newest.ts;
    add({ ok: !stale, text: `Read via region ${side} returned ${local.v}${stale ? `, but the latest write was ${newest.v}: a stale read` : ""}.` });
  };
  const heal = () => {
    setLink(true);
    const a = reps.find((x) => x.side === "A")!, b = reps.find((x) => x.side === "B")!;
    if (a.ts === b.ts) { add({ ok: true, text: "Link restored. Replicas already agree." }); return; }
    const win = a.ts > b.ts ? a : b, lose = win === a ? b : a;
    setReps((r) => r.map((x) => ({ ...x, v: win.v, ts: win.ts })));
    add(mode === "ap" && lose.ts > 0 && lose.v !== "x = 0"
      ? { ok: false, text: `Link restored. Both sides wrote; last-writer-wins keeps ${win.v} and silently discards ${lose.v}.` }
      : { ok: true, text: `Link restored. Region ${lose.side} catches up to ${win.v}.` });
  };

  const sideBox = (side: "A" | "B") => (
    <div className={cn("flex-1 rounded-xl border p-3", side === "A" ? "border-hld/30" : "border-lld/30")}>
      <div className="mb-2 flex items-center justify-between"><span className="text-[13px] font-semibold">Region {side}</span><span className="text-[11px] text-faint">{side === "A" ? "2 of 3 replicas" : "1 of 3 replicas"}</span></div>
      <div className="flex flex-wrap gap-2">
        {reps.filter((r) => r.side === side).map((r) => (
          <motion.div key={r.id} layout className="rounded-lg border border-line bg-panel2 px-2.5 py-1.5 font-mono text-[12px]">
            <div className="text-[10px] text-faint">{r.id}</div>
            <motion.div key={r.v} initial={{ color: "#c8f547" }} animate={{ color: "#e9ebf4" }} transition={{ duration: 1.2 }}>{r.v}</motion.div>
          </motion.div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5"><Btn onClick={() => write(side)}>Write via {side}</Btn><Btn onClick={() => read(side)}>Read via {side}</Btn></div>
    </div>
  );
  return (
    <Frame title="A network partition: consistency or availability?" q="The link between two regions breaks. Should the cut-off region keep answering?"
      about="Three replicas of x: two in region A, one in region B. Cut the link, write and read on both sides in each mode, then heal it."
      foot={mode === "cp" ? "CP: the majority side keeps working; the minority side refuses, so nobody ever reads stale data or creates a conflict. Users in region B see errors until the link heals." : "AP: both sides keep answering, so users never see errors, but reads can be stale and concurrent writes conflict; something (here last-writer-wins) must resolve them later."}>
      <div className="space-y-3">
        <Predict q="CP mode, link cut. A user in region B tries to write. What happens?" options={["Accepted locally", "Refused with an error", "Silently queued"]} answer={1} why="Region B holds only 1 of 3 replicas. Accepting a write without a majority could create a second, conflicting history." />
        <div className="flex flex-wrap items-center gap-2">
          <Chips label="Mode" value={mode} options={[["cp", "CP: stay consistent"], ["ap", "AP: stay available"]]} onChange={(m) => { setMode(m); reset(); }} />
          {link ? <Btn tone="bad" onClick={() => { setLink(false); add({ ok: false, text: "Link cut: regions A and B can't reach each other." }); }}><Unplug size={13} />Cut the link</Btn>
            : <Btn tone="ok" onClick={heal}><Plug size={13} />Heal the link</Btn>}
          <Btn onClick={reset}>Reset</Btn>
        </div>
        <div className="flex flex-col items-stretch gap-2 md:flex-row md:items-center">
          {sideBox("A")}
          <div className="flex shrink-0 items-center justify-center px-1"><span className={cn("rounded-full border px-2 py-0.5 text-[11px]", link ? "border-ok/40 text-ok" : "border-bad/50 text-bad")}>{link ? "⟷ link up" : "✕ partitioned"}</span></div>
          {sideBox("B")}
        </div>
        <div className="space-y-1 rounded-xl border border-line bg-bg p-2.5">
          {log.length ? log.map((e, i) => <div key={i} className={cn("text-[12.5px]", i ? "text-mute" : "", e.ok ? "" : "text-bad")}>{e.ok ? "✓ " : "✕ "}{e.text}</div>) : <div className="text-[12.5px] text-faint">Events appear here.</div>}
        </div>
      </div>
    </Frame>
  );
}
