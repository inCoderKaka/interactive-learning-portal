"use client";
/**
 * Sequence player: actors as lanes, messages as arrows, one step at a time, with a narration line, the state each
 * actor is in, and a message log (time, from, to, message) like a packet capture. A scenario has variants: the
 * normal run and the "break it" runs (a crash, a lost packet, an expired lease), so the learner sees what changes.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from "lucide-react";
import { Btn, Chips, Frame, Predict } from "./kit";
import { cn } from "../../ui";

export type Actor = { id: string; label: string; sub?: string };
export type Step = {
  from: string;
  to: string; // same as from: something happens locally (a note on that lane)
  label: string;
  say: string;
  t?: number; // milliseconds since the start, shown in the log
  kind?: "req" | "res" | "async" | "drop" | "bad" | "ok";
  set?: Record<string, string>; // state badges that change at this step
};
export type Variant = { key: string; label: string; steps: Step[]; end?: string };
export type Scenario = {
  title: string;
  q?: string;
  about: string;
  actors: Actor[];
  variants: Variant[];
  predict?: { q: string; options: string[]; answer: number; why: string };
  init?: Record<string, string>;
};

const TONE: Record<NonNullable<Step["kind"]>, string> = {
  req: "#7aa7ff", res: "#4fd1c5", async: "#b794f4", drop: "#ff6b6b", bad: "#ff6b6b", ok: "#5be49b",
};

export function Seq({ sc }: { sc: Scenario }) {
  const [vk, setVk] = useState(sc.variants[0].key);
  const v = sc.variants.find((x) => x.key === vk) ?? sc.variants[0];
  const [cur, setCur] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => { setCur(-1); setPlaying(false); }, [vk]);
  useEffect(() => {
    if (!playing) return;
    if (cur >= v.steps.length - 1) { setPlaying(false); return; }
    const t = setTimeout(() => setCur((c) => c + 1), cur < 0 ? 300 : 1500);
    return () => clearTimeout(t);
  }, [playing, cur, v.steps.length]);
  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" }); }, [cur]);

  const n = sc.actors.length;
  const W = Math.max(560, n * 150), M = 70, ROW = 34, TOP = 62;
  const x = (id: string) => { const i = sc.actors.findIndex((a) => a.id === id); return M + (i * (W - 2 * M)) / Math.max(1, n - 1); };
  const H = TOP + v.steps.length * ROW + 16;
  const state = useMemo(() => {
    const st: Record<string, string> = { ...(sc.init ?? {}) };
    v.steps.slice(0, cur + 1).forEach((s) => Object.assign(st, s.set ?? {}));
    return st;
  }, [v, cur, sc.init]);
  const now = cur >= 0 ? v.steps[cur] : null;
  const done = cur === v.steps.length - 1;

  return (
    <Frame title={sc.title} q={sc.q} about={sc.about}>
      <div className="space-y-3">
        {sc.variants.length > 1 && <Chips label="Run" value={vk} options={sc.variants.map((x) => [x.key, x.label])} onChange={setVk} />}
        {sc.predict && <Predict {...sc.predict} />}
        <div className="flex flex-wrap items-center gap-1.5">
          <Btn onClick={() => { if (done) setCur(-1); setPlaying(!playing); }} on={playing}>{playing ? <Pause size={13} /> : <Play size={13} />}{playing ? "Pause" : done ? "Replay" : "Play"}</Btn>
          <Btn onClick={() => { setPlaying(false); setCur((c) => Math.max(-1, c - 1)); }} disabled={cur < 0}><ChevronLeft size={13} />Back</Btn>
          <Btn onClick={() => { setPlaying(false); setCur((c) => Math.min(v.steps.length - 1, c + 1)); }} disabled={done}>Next<ChevronRight size={13} /></Btn>
          <Btn onClick={() => { setPlaying(false); setCur(-1); }}><RotateCcw size={13} />Reset</Btn>
          <span className="num ml-auto text-[12px] text-faint">step {Math.max(0, cur + 1)} / {v.steps.length}</span>
        </div>
        <div className="min-h-[52px] rounded-xl border border-line bg-bg px-3.5 py-2.5 text-[14px] leading-relaxed" aria-live="polite">
          {now ? now.say : <span className="text-faint">Press Play, or Next to go one message at a time.</span>}
          {done && v.end && <div className="mt-1.5 border-t border-line pt-1.5 text-[13px] font-medium text-accent">{v.end}</div>}
        </div>
        <div className="overflow-x-auto rounded-xl border border-line bg-[#0c0e15]">
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", minWidth: Math.min(W, 520) }} role="img" aria-label={`Message sequence: ${sc.title}`}>
            <defs>
              {Object.entries(TONE).map(([k, c]) => <marker key={k} id={`sq-${k}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill={c} /></marker>)}
              <marker id="sq-dim" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#4a5170" /></marker>
            </defs>
            {sc.actors.map((a) => (
              <g key={a.id}>
                <line x1={x(a.id)} x2={x(a.id)} y1={TOP - 10} y2={H - 6} stroke="#262b3d" strokeDasharray="3 4" />
                <rect x={x(a.id) - 62} y={6} width={124} height={state[a.id] ? 44 : 30} rx={9} fill="#141724" stroke="#2f3550" />
                <text x={x(a.id)} y={25} textAnchor="middle" className="fill-[#e9ebf4] text-[12px] font-semibold">{a.label}</text>
                {state[a.id] && <motion.text key={state[a.id]} initial={{ opacity: 0 }} animate={{ opacity: 1 }} x={x(a.id)} y={42} textAnchor="middle" className="fill-[#c8f547] font-mono text-[10px]">{state[a.id].slice(0, 22)}</motion.text>}
              </g>
            ))}
            {v.steps.map((s, k) => {
              if (k > cur) return null;
              const y = TOP + k * ROW + 18, x1 = x(s.from), x2 = x(s.to), live = k === cur;
              const kind = s.kind ?? (x2 >= x1 ? "req" : "res");
              const c = live ? TONE[kind] : "#4a5170";
              if (s.from === s.to) {
                const w = Math.min(190, 14 + s.label.length * 6.2);
                return (
                  <motion.g key={k} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <rect x={x1 - w / 2} y={y - 12} width={w} height={22} rx={6} fill={live ? "#1d2338" : "#131624"} stroke={c} />
                    <text x={x1} y={y + 3} textAnchor="middle" className={cn("font-mono text-[10.5px]", live ? "fill-[#e9ebf4]" : "fill-[#7d849e]")}>{s.label}</text>
                  </motion.g>
                );
              }
              const dir = Math.sign(x2 - x1), end = kind === "drop" ? x1 + (x2 - x1) * 0.55 : x2 - dir * 4;
              return (
                <g key={k}>
                  <motion.line initial={{ x2: x1 }} animate={{ x2: end }} transition={{ duration: live ? 0.55 : 0 }} x1={x1 + dir * 3} y1={y} y2={y} stroke={c} strokeWidth={live ? 2.2 : 1.4}
                    strokeDasharray={kind === "async" ? "5 4" : undefined} markerEnd={kind === "drop" ? undefined : `url(#${live ? "sq-" + kind : "sq-dim"})`} />
                  {kind === "drop" && <text x={end + dir * 8} y={y + 4} textAnchor="middle" className="fill-[#ff6b6b] text-[13px] font-bold">✕</text>}
                  <text x={(x1 + x2) / 2} y={y - 6} textAnchor="middle" className={cn("font-mono text-[10.5px]", live ? "fill-[#e9ebf4]" : "fill-[#7d849e]")}>{s.label}</text>
                </g>
              );
            })}
          </svg>
        </div>
        <div ref={logRef} className="max-h-40 overflow-y-auto rounded-xl border border-line">
          <table className="w-full text-left font-mono text-[11.5px]">
            <thead className="sticky top-0 bg-panel2 text-faint"><tr><th className="px-2 py-1">#</th><th className="px-2 py-1">time</th><th className="px-2 py-1">from → to</th><th className="px-2 py-1">message</th></tr></thead>
            <tbody>
              {v.steps.slice(0, cur + 1).map((s, k) => {
                const a = sc.actors.find((q) => q.id === s.from)?.label, b = sc.actors.find((q) => q.id === s.to)?.label;
                return (
                  <tr key={k} className={cn("border-t border-line", k === cur ? "bg-accent/[0.06] text-text" : "text-mute")}>
                    <td className="px-2 py-1">{k + 1}</td><td className="px-2 py-1">{s.t != null ? `${s.t} ms` : "–"}</td>
                    <td className="px-2 py-1">{s.from === s.to ? a : `${a} → ${b}`}</td>
                    <td className={cn("px-2 py-1", (s.kind === "drop" || s.kind === "bad") && "text-bad")}>{s.label}</td>
                  </tr>
                );
              })}
              {cur < 0 && <tr><td colSpan={4} className="px-2 py-2 text-faint">The log fills as messages are sent.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </Frame>
  );
}
