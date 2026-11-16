"use client";
import { create } from "zustand";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Coffee, Pause, Play, RotateCcw, Timer, Wind, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button, cn, fmtClock } from "./ui";

type Mode = "idle" | "focus" | "break";
interface FocusState {
  mode: Mode;
  endsAt: number; // ms epoch while running
  left: number; // seconds left while paused
  paused: boolean;
  sessions: number;
  breather: boolean;
  start: (mode: Exclude<Mode, "idle">, minutes: number) => void;
  toggle: () => void;
  stop: () => void;
  setBreather: (b: boolean) => void;
}
export const useFocus = create<FocusState>((set, get) => ({
  mode: "idle", endsAt: 0, left: 0, paused: false, sessions: 0, breather: false,
  start: (mode, minutes) => set({ mode, endsAt: Date.now() + minutes * 60000, paused: false, left: minutes * 60 }),
  toggle: () => {
    const s = get();
    if (s.mode === "idle") return;
    if (s.paused) set({ paused: false, endsAt: Date.now() + s.left * 1000 });
    else set({ paused: true, left: Math.max(0, Math.round((s.endsAt - Date.now()) / 1000)) });
  },
  stop: () => set({ mode: "idle", paused: false }),
  setBreather: (breather) => set({ breather }),
}));

function chime() {
  try {
    const ctx = new AudioContext();
    [660, 880].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = f; o.type = "sine";
      g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.18);
      g.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + i * 0.18 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.18 + 0.6);
      o.connect(g).connect(ctx.destination); o.start(ctx.currentTime + i * 0.18); o.stop(ctx.currentTime + i * 0.18 + 0.7);
    });
  } catch { /* audio unavailable */ }
}

/** Compact timer control for the top bar. */
export function FocusChip() {
  const f = useFocus();
  const { focusMin, breakMin } = useStore((s) => s.settings);
  const [, tick] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (f.mode === "idle" || f.paused) return;
    const t = setInterval(() => {
      tick((n) => n + 1);
      const s = useFocus.getState();
      if (s.mode !== "idle" && !s.paused && Date.now() >= s.endsAt) {
        chime();
        if (s.mode === "focus") useFocus.setState({ mode: "idle", sessions: s.sessions + 1, breather: true });
        else useFocus.setState({ mode: "idle" });
      }
    }, 500);
    return () => clearInterval(t);
  }, [f.mode, f.paused]);

  const left = f.mode === "idle" ? 0 : f.paused ? f.left : Math.max(0, Math.round((f.endsAt - Date.now()) / 1000));
  const active = f.mode !== "idle";

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-label="Focus timer"
        className={cn("flex h-9 items-center gap-2 rounded-xl border px-3 text-[13px] font-medium transition",
          active ? (f.mode === "focus" ? "border-accent/40 bg-accent/10 text-accent" : "border-hld/40 bg-hld/10 text-hld") : "border-line bg-panel text-mute hover:text-text")}>
        {f.mode === "break" ? <Coffee size={15} /> : <Timer size={15} />}
        <span className="num">{active ? fmtClock(left) : "Focus"}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.97 }}
            className="card absolute right-0 top-11 z-50 w-72 p-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="eyebrow">{active ? (f.mode === "focus" ? "Deep work" : "Break") : "Focus timer"}</div>
              <button onClick={() => setOpen(false)} aria-label="Close" className="text-faint hover:text-text"><X size={15} /></button>
            </div>
            <div className="display num my-3 text-center text-5xl font-semibold">{fmtClock(active ? left : focusMin * 60)}</div>
            {active ? (
              <div className="flex gap-2">
                <Button className="flex-1" onClick={f.toggle}>{f.paused ? <Play size={15} /> : <Pause size={15} />}{f.paused ? "Resume" : "Pause"}</Button>
                <Button variant="ghost" onClick={f.stop} aria-label="Reset"><RotateCcw size={15} /></Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Button variant="primary" onClick={() => f.start("focus", focusMin)}><Play size={15} />{focusMin} min focus</Button>
                <Button onClick={() => f.start("break", breakMin)}><Coffee size={15} />{breakMin} min break</Button>
              </div>
            )}
            <button onClick={() => { f.setBreather(true); setOpen(false); }} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg py-2 text-[13px] text-mute hover:bg-white/5 hover:text-text">
              <Wind size={14} /> Take a one-minute breather
            </button>
            <div className="mt-2 text-center text-[11.5px] text-faint">{f.sessions} focus session{f.sessions === 1 ? "" : "s"} this visit · lengths in Settings</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const PATTERNS = {
  box: { name: "Box 4·4·4·4", steps: [["Breathe in", 4], ["Hold", 4], ["Breathe out", 4], ["Hold", 4]] as [string, number][], note: "Steadies attention before a hard problem." },
  calm: { name: "Calm 4·7·8", steps: [["Breathe in", 4], ["Hold", 7], ["Breathe out", 8]] as [string, number][], note: "Longer exhale lowers heart rate after frustration." },
  sigh: { name: "Double inhale", steps: [["Inhale", 2], ["Sip more air", 1], ["Long exhale", 6]] as [string, number][], note: "Fastest reset when you feel stuck." },
};
const TIPS = ["Look at something 20 feet away for 20 seconds.", "Roll your shoulders back and unclench your jaw.", "Stand up. Refill your water.", "Stuck on a bug? Explain it out loud to nobody.", "Stretch your wrists: you will need them."];

export function Breather() {
  const open = useFocus((s) => s.breather);
  const setBreather = useFocus((s) => s.setBreather);
  const start = useFocus((s) => s.start);
  const breakMin = useStore((s) => s.settings.breakMin);
  const [pat, setPat] = useState<keyof typeof PATTERNS>("box");
  const [t, setT] = useState(0);
  const [tip] = useState(() => Math.floor(Math.random() * TIPS.length));

  useEffect(() => {
    if (!open) return;
    setT(0);
    const i = setInterval(() => setT((x) => x + 0.1), 100);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setBreather(false);
    window.addEventListener("keydown", esc);
    return () => { clearInterval(i); window.removeEventListener("keydown", esc); };
  }, [open, pat, setBreather]);

  const steps = PATTERNS[pat].steps;
  const cycle = steps.reduce((a, s) => a + s[1], 0);
  let rem = t % cycle, idx = 0;
  while (rem >= steps[idx][1]) { rem -= steps[idx][1]; idx++; }
  const [label, dur] = steps[idx];
  const target = (i: number): number => {
    const l = steps[i][0];
    if (/out|exhale/i.test(l)) return 0.55;
    if (/in|sip/i.test(l)) return 1;
    return i === 0 ? 0.55 : target(i - 1); // a hold keeps the previous size
  };
  const scale = target(idx);
  const moving = !/hold/i.test(label);
  const cycles = Math.floor(t / cycle);

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-label="Breather"
          className="fixed inset-0 z-[100] grid place-items-center bg-[#05060a]/92 backdrop-blur-xl">
          <button onClick={() => setBreather(false)} aria-label="Close breather" className="absolute right-6 top-6 text-mute hover:text-text"><X /></button>
          <div className="flex flex-col items-center px-6 text-center">
            <div className="eyebrow mb-10">Breather · {cycles} cycle{cycles === 1 ? "" : "s"}</div>
            <div className="relative grid h-72 w-72 place-items-center">
              <motion.div animate={{ scale }} transition={{ duration: moving ? dur : 0.3, ease: "easeInOut" }}
                className="absolute h-64 w-64 rounded-full" style={{ background: "radial-gradient(circle at 35% 30%, rgb(200 245 71 / .55), rgb(79 209 197 / .25) 55%, transparent 72%)", filter: "blur(2px)" }} />
              <motion.div animate={{ scale: scale * 0.82 }} transition={{ duration: moving ? dur : 0.3, ease: "easeInOut" }}
                className="absolute h-64 w-64 rounded-full border border-accent/40" />
              <div className="relative">
                <div className="display text-2xl font-semibold">{label}</div>
                <div className="num mt-1 text-sm text-mute">{Math.ceil(dur - rem)}</div>
              </div>
            </div>
            <div className="mt-10 flex flex-wrap justify-center gap-2">
              {(Object.keys(PATTERNS) as (keyof typeof PATTERNS)[]).map((k) => (
                <button key={k} onClick={() => setPat(k)} className={cn("rounded-full border px-3 py-1 text-[13px] transition", pat === k ? "border-accent/50 bg-accent/10 text-accent" : "border-line text-mute hover:text-text")}>{PATTERNS[k].name}</button>
              ))}
            </div>
            <p className="mt-4 max-w-sm text-sm text-mute">{PATTERNS[pat].note}</p>
            <p className="mt-6 max-w-sm text-[13px] text-faint">{TIPS[tip]}</p>
            <div className="mt-8 flex gap-2">
              <Button onClick={() => { start("break", breakMin); setBreather(false); }}><Coffee size={15} />Start {breakMin} min break</Button>
              <Button variant="primary" onClick={() => setBreather(false)}>Back to it</Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
