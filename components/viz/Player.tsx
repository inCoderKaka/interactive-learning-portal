"use client";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from "lucide-react";
import { ALGOS, type GEdge, type GNode, type Row, type S, type Step } from "./algos";
import { cn } from "../ui";

const COLOR: Record<S, { bg: string; bd: string; fg: string }> = {
  cur: { bg: "rgb(200 245 71 / .18)", bd: "#c8f547", fg: "#eaffb0" },
  hit: { bg: "rgb(200 245 71 / .9)", bd: "#c8f547", fg: "#0b1000" },
  done: { bg: "rgb(79 209 197 / .16)", bd: "#4fd1c5", fg: "#b9f3ec" },
  front: { bg: "rgb(255 180 84 / .16)", bd: "#ffb454", fg: "#ffe0b3" },
  bad: { bg: "rgb(255 107 107 / .16)", bd: "#ff6b6b", fg: "#ffc9c9" },
  dim: { bg: "rgb(16 18 26 / 0)", bd: "#1f2333", fg: "#4b5169" },
};
const BASE = { bg: "#161926", bd: "#2a2f44", fg: "#e9ebf4" };
const col = (s?: S) => (s ? COLOR[s] : BASE);

function Rows({ rows }: { rows: Row[] }) {
  return (
    <div className="flex flex-col gap-5 overflow-x-auto pb-1">
      {rows.map((row, ri) => {
        const wide = row.cells.some((c) => String(c).length > 3);
        const w = wide ? 64 : 44;
        return (
          <div key={ri} className="flex items-start gap-3">
            <div className="w-14 shrink-0 pt-3 text-right font-mono text-[11px] uppercase tracking-wider text-faint">{row.label}</div>
            <div className="relative flex gap-1.5 pb-6">
              {row.range && row.range[1] >= row.range[0] && (
                <motion.div layout className="absolute -top-1.5 h-[52px] rounded-xl border border-dashed border-accent/40 bg-accent/[0.04]"
                  animate={{ left: row.range[0] * (w + 6) - 4, width: (row.range[1] - row.range[0] + 1) * (w + 6) + 2 }} transition={{ type: "spring", stiffness: 260, damping: 28 }} />
              )}
              {row.cells.map((c, i) => {
                const k = col(row.hi?.[i]);
                const ptrs = Object.entries(row.ptr ?? {}).filter(([, v]) => v === i).map(([n]) => n);
                return (
                  <div key={i} className="relative">
                    <motion.div animate={{ backgroundColor: k.bg, borderColor: k.bd, color: k.fg, scale: row.hi?.[i] === "cur" || row.hi?.[i] === "hit" ? 1.06 : 1 }} transition={{ duration: 0.25 }}
                      className="grid h-10 place-items-center rounded-lg border font-mono text-[13px] font-medium" style={{ width: w }}>{c}</motion.div>
                    {ptrs.length > 0 && <div className="absolute left-1/2 top-11 -translate-x-1/2 whitespace-nowrap font-mono text-[10.5px] font-semibold text-accent">▲ {ptrs.join(",")}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Graph({ nodes, edges }: { nodes: GNode[]; edges: GEdge[] }) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const w = Math.max(620, ...nodes.map((n) => n.x + 60)), h = Math.max(200, ...nodes.map((n) => n.y + 60));
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="mx-auto block" style={{ width: "100%", maxWidth: w, minWidth: Math.min(w, 420) }} role="img" aria-label="Graph visualisation">
        <defs>
          {(["base", "cur", "done", "dim"] as const).map((k) => (
            <marker key={k} id={`arr-${k}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0L10 5L0 10z" fill={k === "base" ? "#4a5170" : k === "dim" ? "#232738" : COLOR[k].bd} />
            </marker>
          ))}
        </defs>
        {edges.map((e) => {
          const a = byId.get(e.a), b = byId.get(e.b);
          if (!a || !b) return null;
          const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1, r = 23;
          const x1 = a.x + (dx / len) * r, y1 = a.y + (dy / len) * r, x2 = b.x - (dx / len) * r, y2 = b.y - (dy / len) * r;
          const key = e.s === "cur" ? "cur" : e.s === "done" ? "done" : e.s === "dim" ? "dim" : "base";
          const stroke = key === "base" ? "#4a5170" : key === "dim" ? "#232738" : COLOR[key].bd;
          return (
            <g key={e.a + ">" + e.b}>
              <motion.line animate={{ x1, y1, x2, y2, stroke }} strokeWidth={key === "cur" || key === "done" ? 2.4 : 1.6} markerEnd={e.dir ? `url(#arr-${key})` : undefined} strokeDasharray={key === "dim" ? "4 4" : undefined} transition={{ duration: 0.35 }} />
              {e.w != null && <text x={(x1 + x2) / 2 + (dy / len) * 11} y={(y1 + y2) / 2 - (dx / len) * 11 + 4} textAnchor="middle" className="fill-mute font-mono text-[11px]">{e.w}</text>}
            </g>
          );
        })}
        <AnimatePresence>
          {nodes.map((n) => {
            const k = col(n.s);
            const wide = (n.label?.length ?? 0) > 3;
            return (
              <motion.g key={n.id} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1, x: n.x, y: n.y }} exit={{ opacity: 0 }} transition={{ type: "spring", stiffness: 240, damping: 24 }}>
                {wide ? <rect x={-30} y={-17} width={60} height={34} rx={10} fill="#10121a" /> : <circle r={21} fill="#10121a" />}
                {wide ? <motion.rect x={-30} y={-17} width={60} height={34} rx={10} animate={{ fill: k.bg, stroke: k.bd }} strokeWidth={1.6} />
                  : <motion.circle r={21} animate={{ fill: k.bg, stroke: k.bd }} strokeWidth={1.6} />}
                <motion.text textAnchor="middle" dy={4.5} animate={{ fill: k.fg }} className="font-mono text-[12.5px] font-semibold">{n.label}</motion.text>
                {n.sub && <text textAnchor="middle" y={wide ? 32 : 37} className="fill-mute font-mono text-[10.5px]">{n.sub}</text>}
              </motion.g>
            );
          })}
        </AnimatePresence>
      </svg>
    </div>
  );
}

function Grid({ g }: { g: NonNullable<Step["grid"]> }) {
  return (
    <div className="overflow-x-auto">
      <table className="mx-auto border-separate border-spacing-1.5 font-mono text-[13px]">
        {g.colH && <thead><tr>{g.rowH && <th />}{g.colH.map((c, i) => <th key={i} className="pb-1 text-center text-[11px] font-medium text-faint">{c}</th>)}</tr></thead>}
        <tbody>
          {g.cells.map((row, r) => (
            <tr key={r}>
              {g.rowH && <th className="pr-2 text-right text-[11px] font-medium text-faint">{g.rowH[r]}</th>}
              {row.map((c, j) => {
                const k = col(g.s?.[r]?.[j]);
                return <td key={j}><motion.div animate={{ backgroundColor: k.bg, borderColor: k.bd, color: k.fg, scale: g.s?.[r]?.[j] === "cur" ? 1.08 : 1 }} transition={{ duration: 0.25 }} className="grid h-10 w-10 place-items-center rounded-lg border font-medium sm:h-11 sm:w-11">{c}</motion.div></td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Player({ id }: { id: string }) {
  const algo = ALGOS[id];
  const steps = useMemo(() => algo?.steps() ?? [], [algo]);
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  useEffect(() => { setI(0); setPlaying(false); }, [id]);
  useEffect(() => {
    if (!playing) return;
    if (i >= steps.length - 1) { setPlaying(false); return; }
    const t = setTimeout(() => setI((x) => x + 1), 1700 / speed);
    return () => clearTimeout(t);
  }, [playing, i, steps.length, speed]);

  if (!algo) return null;
  const st = steps[i];
  return (
    <section className="card overflow-hidden" aria-label={`Visualiser: ${algo.title}`}
      onKeyDown={(e) => { if (e.key === "ArrowRight") setI((x) => Math.min(steps.length - 1, x + 1)); if (e.key === "ArrowLeft") setI((x) => Math.max(0, x - 1)); if (e.key === " ") { e.preventDefault(); setPlaying((p) => !p); } }} tabIndex={0}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <div className="min-w-0">
          <div className="eyebrow">See it run</div>
          <div className="display text-[17px] font-semibold">{algo.title}</div>
        </div>
        <div className="flex items-center gap-1.5">
          <button aria-label="Restart" onClick={() => { setI(0); setPlaying(false); }} className="grid h-8 w-8 place-items-center rounded-lg text-mute hover:bg-white/5 hover:text-text"><RotateCcw size={15} /></button>
          <button aria-label="Previous step" onClick={() => setI((x) => Math.max(0, x - 1))} className="grid h-8 w-8 place-items-center rounded-lg text-mute hover:bg-white/5 hover:text-text"><ChevronLeft size={17} /></button>
          <button aria-label={playing ? "Pause" : "Play"} onClick={() => { if (i >= steps.length - 1) setI(0); setPlaying((p) => !p); }} className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-ink">{playing ? <Pause size={16} /> : <Play size={16} />}</button>
          <button aria-label="Next step" onClick={() => setI((x) => Math.min(steps.length - 1, x + 1))} className="grid h-8 w-8 place-items-center rounded-lg text-mute hover:bg-white/5 hover:text-text"><ChevronRight size={17} /></button>
          <button aria-label="Playback speed" onClick={() => setSpeed((s) => (s === 1 ? 2 : s === 2 ? 0.5 : 1))} className="num h-8 rounded-lg px-2 text-[12px] font-semibold text-mute hover:bg-white/5 hover:text-text">{speed}×</button>
        </div>
      </div>
      <div className="px-5 pt-3 text-[13px] text-mute">{algo.about}</div>
      <div className="min-h-[230px] px-5 py-6">
        {st.rows && <Rows rows={st.rows} />}
        {st.graph && <div className={cn(st.rows && "mt-4")}><Graph {...st.graph} /></div>}
        {st.grid && <Grid g={st.grid} />}
        {st.vars && (
          <div className="mt-5 flex flex-wrap gap-2">
            {Object.entries(st.vars).map(([k, v]) => (
              <div key={k} className="rounded-lg border border-line bg-bg px-2.5 py-1 font-mono text-[12px]"><span className="text-faint">{k} </span><span className="text-text">{String(v)}</span></div>
            ))}
          </div>
        )}
      </div>
      <div className="border-t border-line bg-bg/40 px-5 py-4">
        <AnimatePresence mode="wait">
          <motion.p key={i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="min-h-[44px] text-[14.5px] leading-relaxed" aria-live="polite">{st.note}</motion.p>
        </AnimatePresence>
        <div className="mt-3 flex items-center gap-3">
          <input type="range" min={0} max={steps.length - 1} value={i} onChange={(e) => { setI(+e.target.value); setPlaying(false); }} className="w-full" aria-label="Step" />
          <span className="num shrink-0 text-[12px] text-faint">{i + 1} / {steps.length}</span>
        </div>
      </div>
    </section>
  );
}
