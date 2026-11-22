"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useMotionValue, useTransform } from "motion/react";
import { ArrowLeft, ArrowRight, Check, RotateCcw, X } from "lucide-react";
import { derange, fmtNum, guessOk, rng, shuffle } from "@/lib/drills";
import type { Drill } from "@/lib/types";
import { Button, cn } from "@/components/ui";

type Of<K extends Drill["kind"]> = Extract<Drill, { kind: K }>;
export interface DrillProps<D extends Drill = Drill> { d: D; done: boolean; seed: number; onAnswer: (ok: boolean) => void }

/** Key presses for the active drill only. */
function useKeys(on: boolean, f: (e: KeyboardEvent) => void) {
  const ref = useRef(f);
  ref.current = f;
  useEffect(() => {
    if (!on) return;
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey || (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) && (t as HTMLInputElement).type !== "range")) return;
      ref.current(e);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [on]);
}

const KEY = ["1", "2", "3", "4", "5", "6"];
const optCls = (st: "idle" | "right" | "wrong" | "off") => cn(
  "group relative flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left text-[14px] leading-snug transition duration-200",
  st === "idle" && "border-line bg-panel2 hover:-translate-y-0.5 hover:border-[#3a4160] hover:bg-[#1b1f2e] active:scale-[0.98]",
  st === "right" && "border-ok/60 bg-ok/10 text-ok shadow-[0_0_30px_-10px_var(--color-ok)]",
  st === "wrong" && "animate-shake border-bad/60 bg-bad/10 text-bad",
  st === "off" && "border-line opacity-40",
);
const Kbd = ({ k }: { k: string }) => <kbd className="hidden h-5 min-w-5 shrink-0 place-items-center rounded-md border border-line px-1 font-mono text-[10.5px] text-faint sm:grid">{k}</kbd>;

/* ---------- choose one: pick, blank, odd ---------- */
function Choices({ options, answer, done, onPick, grid }: { options: string[]; answer: number; done: boolean; onPick: (i: number) => void; grid?: boolean }) {
  const [pick, setPick] = useState<number | null>(null);
  const choose = (i: number) => { if (done || pick !== null) return; setPick(i); onPick(i); };
  useKeys(!done, (e) => { const i = KEY.indexOf(e.key); if (i >= 0 && i < options.length) { e.preventDefault(); choose(i); } });
  return (
    <div className={cn("grid gap-2", grid ? "grid-cols-2" : "sm:grid-cols-2")}>
      {options.map((o, i) => {
        const st = pick === null && !done ? "idle" : i === answer ? "right" : i === pick ? "wrong" : "off";
        return (
          <motion.button key={o} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 * i }} disabled={done || pick !== null} onClick={() => choose(i)} className={optCls(st)}>
            <Kbd k={KEY[i]} /><span className="min-w-0 flex-1">{o}</span>
            {st === "right" && <Check size={16} className="shrink-0" />}{st === "wrong" && <X size={16} className="shrink-0" />}
          </motion.button>
        );
      })}
    </div>
  );
}

function Pick({ d, done, onAnswer }: DrillProps<Of<"pick">>) {
  return <Choices options={d.options} answer={d.answer} done={done} onPick={(i) => onAnswer(i === d.answer)} />;
}

function Odd({ d, done, onAnswer }: DrillProps<Of<"odd">>) {
  return <Choices grid options={d.items} answer={d.odd} done={done} onPick={(i) => onAnswer(i === d.odd)} />;
}

function Blank({ d, done, onAnswer }: DrillProps<Of<"blank">>) {
  const [fill, setFill] = useState<number | null>(null);
  const [a, b] = d.text.split("___");
  const shown = fill ?? (done ? d.answer : null);
  return (
    <div className="space-y-4">
      <p className="text-[17px] font-medium leading-relaxed sm:text-lg">
        {a}
        <motion.span key={shown ?? -1} initial={{ scale: 0.8, opacity: 0.4 }} animate={{ scale: 1, opacity: 1 }}
          className={cn("mx-1 inline-block min-w-[5.5rem] rounded-lg border-b-2 px-2 text-center", shown === null ? "border-accent/60 bg-accent/5 text-transparent" : shown === d.answer ? "border-ok bg-ok/10 text-ok" : "border-bad bg-bad/10 text-bad line-through")}>
          {shown === null ? "____" : d.options[shown]}
        </motion.span>
        {fill !== null && fill !== d.answer && <span className="mx-1 rounded-lg border-b-2 border-ok bg-ok/10 px-2 text-ok">{d.options[d.answer]}</span>}
        {b}
      </p>
      <Choices options={d.options} answer={d.answer} done={done} onPick={(i) => { setFill(i); onAnswer(i === d.answer); }} />
    </div>
  );
}

/* ---------- true / false: tap, keys, or swipe the card ---------- */
function TrueFalse({ d, done, onAnswer }: DrillProps<Of<"tf">>) {
  const [pick, setPick] = useState<boolean | null>(null);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 220], [-10, 10]);
  const tint = useTransform(x, [-160, 0, 160], ["rgb(255 107 107 / 0.16)", "rgb(255 255 255 / 0)", "rgb(91 228 155 / 0.16)"]);
  const answer = (v: boolean) => { if (done || pick !== null) return; setPick(v); onAnswer(v === d.t); };
  useKeys(!done, (e) => {
    const k = e.key.toLowerCase();
    if (k === "t" || e.key === "ArrowRight") { e.preventDefault(); answer(true); }
    if (k === "f" || e.key === "ArrowLeft") { e.preventDefault(); answer(false); }
  });
  const res = (v: boolean) => (pick === null && !done ? "idle" : v === d.t ? "right" : v === pick ? "wrong" : "off");
  return (
    <div className="space-y-4">
      <motion.div drag={done || pick !== null ? false : "x"} dragConstraints={{ left: 0, right: 0 }} dragElastic={0.75} style={{ x, rotate, background: tint }}
        onDragEnd={(_, i) => { if (i.offset.x > 110) answer(true); else if (i.offset.x < -110) answer(false); }}
        className={cn("relative cursor-grab touch-pan-y select-none rounded-2xl border border-line p-6 text-center active:cursor-grabbing sm:p-8", pick !== null && (pick === d.t ? "border-ok/50" : "animate-shake border-bad/50"))}>
        <p className="display text-[19px] font-medium leading-snug sm:text-[22px]">{d.s}</p>
        {!done && pick === null && <p className="mt-4 text-[11.5px] text-faint">Swipe right for true, left for false, or use the buttons</p>}
        {(done || pick !== null) && <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={cn("mx-auto mt-4 inline-flex rounded-full px-3 py-1 text-[12px] font-bold tracking-wider", d.t ? "bg-ok/15 text-ok" : "bg-bad/15 text-bad")}>{d.t ? "TRUE" : "FALSE"}</motion.div>}
      </motion.div>
      <div className="grid grid-cols-2 gap-2">
        <button disabled={done || pick !== null} onClick={() => answer(false)} className={optCls(res(false))}><ArrowLeft size={15} className="text-faint" /><span className="flex-1 text-center font-semibold">False</span><Kbd k="F" /></button>
        <button disabled={done || pick !== null} onClick={() => answer(true)} className={optCls(res(true))}><Kbd k="T" /><span className="flex-1 text-center font-semibold">True</span><ArrowRight size={15} className="text-faint" /></button>
      </div>
    </div>
  );
}

/* ---------- order: tap the steps in sequence ---------- */
function Order({ d, done, seed, onAnswer }: DrillProps<Of<"order">>) {
  const deck = useMemo(() => derange(d.steps.length, rng(seed)), [d, seed]);
  const [seq, setSeq] = useState<number[]>([]);
  const finished = seq.length === d.steps.length;
  const ok = finished && seq.every((s, i) => s === i);
  const tap = (i: number) => {
    if (done || finished) return;
    const next = [...seq, i];
    setSeq(next);
    if (next.length === d.steps.length) onAnswer(next.every((s, k) => s === k));
  };
  useKeys(!done && !finished, (e) => {
    const k = KEY.indexOf(e.key), left = deck.filter((i) => !seq.includes(i));
    if (k >= 0 && k < left.length) { e.preventDefault(); tap(left[k]); }
    if (e.key === "Backspace") { e.preventDefault(); setSeq((s) => s.slice(0, -1)); }
  });
  const showFix = done || finished;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-faint">Tap in order</div>
        <div className="space-y-2">
          {deck.filter((i) => !seq.includes(i)).map((i, k) => (
            <motion.button layout key={i} onClick={() => tap(i)} className={optCls("idle")}><Kbd k={KEY[k]} /><span className="flex-1">{d.steps[i]}</span></motion.button>
          ))}
          {!showFix && seq.length === 0 && <p className="text-[12px] text-faint">Pick the first step.</p>}
          {showFix && <p className={cn("rounded-xl border px-3 py-2 text-[13px]", ok ? "border-ok/40 text-ok" : "border-bad/40 text-bad")}>{ok ? "Perfect sequence." : "Not quite: the right order is on the right."}</p>}
        </div>
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-widest text-faint">
          <span>Your sequence</span>
          {!showFix && seq.length > 0 && <button onClick={() => setSeq((s) => s.slice(0, -1))} className="flex items-center gap-1 normal-case tracking-normal text-mute hover:text-text"><RotateCcw size={12} />Undo</button>}
        </div>
        <ol className="space-y-2">
          {(showFix && !ok ? d.steps.map((_, i) => i) : seq).map((s, i) => {
            const right = showFix ? (ok ? true : seq[i] === s) : null;
            return (
              <motion.li layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} key={`${s}-${showFix}`}
                className={cn("flex items-start gap-3 rounded-xl border px-3.5 py-2.5 text-[14px]", right === null ? "border-accent/40 bg-accent/5" : right ? "border-ok/50 bg-ok/10" : "border-warn/50 bg-warn/10")}>
                <span className="num mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/10 text-[11px] font-bold">{i + 1}</span>
                <span className="flex-1">{d.steps[s]}</span>
              </motion.li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

/* ---------- match: tap one item on each side ---------- */
const PAIR = ["#4fd1c5", "#7aa7ff", "#ffb454", "#ff8fb3", "#b794f4"];
function Match({ d, done, seed, onAnswer }: DrillProps<Of<"match">>) {
  const r = useMemo(() => rng(seed), [seed]);
  const left = useMemo(() => shuffle(d.pairs.map((_, i) => i), r), [d, r]);
  const right = useMemo(() => { const p = derange(d.pairs.length, r); return left.map((_, k) => left[p[k]]); }, [d, r, left]);
  const [sel, setSel] = useState<{ side: "l" | "r"; i: number } | null>(null);
  const [got, setGot] = useState<number[]>([]);
  const [miss, setMiss] = useState(0);
  const [flash, setFlash] = useState<{ l: number; r: number } | null>(null);
  const complete = got.length === d.pairs.length;
  const tap = (side: "l" | "r", i: number) => {
    if (done || complete || got.includes(i)) return;
    if (!sel || sel.side === side) { setSel({ side, i }); return; }
    const l = side === "l" ? i : sel.i, rr = side === "r" ? i : sel.i;
    setSel(null);
    if (l === rr) {
      const next = [...got, l];
      setGot(next);
      if (next.length === d.pairs.length) onAnswer(miss === 0);
    } else { setMiss((m) => m + 1); setFlash({ l, r: rr }); setTimeout(() => setFlash(null), 520); }
  };
  const col = (i: number) => PAIR[got.indexOf(i) % PAIR.length];
  const cell = (side: "l" | "r", i: number, text: string) => {
    const matched = got.includes(i) || done;
    const c = matched ? (got.includes(i) ? col(i) : "var(--color-faint)") : undefined;
    const isSel = sel?.side === side && sel.i === i;
    const bad = flash && (side === "l" ? flash.l === i : flash.r === i);
    return (
      <motion.button layout key={side + i} onClick={() => tap(side, i)} disabled={matched}
        className={cn("w-full rounded-xl border px-3 py-2.5 text-left text-[13.5px] leading-snug transition", !matched && !isSel && "border-line bg-panel2 hover:border-[#3a4160]", isSel && "border-accent bg-accent/10 shadow-[0_0_24px_-10px_var(--color-accent)]", bad && "animate-shake border-bad bg-bad/10")}
        style={matched ? { borderColor: `color-mix(in srgb, ${c} 55%, transparent)`, background: `color-mix(in srgb, ${c} 12%, transparent)`, color: c } : undefined}>
        {text}
      </motion.button>
    );
  };
  return (
    <div>
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <div className="space-y-2">{left.map((i) => cell("l", i, d.pairs[i][0]))}</div>
        <div className="space-y-2">{right.map((i) => cell("r", i, d.pairs[i][1]))}</div>
      </div>
      <p className="mt-3 text-[12px] text-faint">{complete || done ? (miss === 0 ? "Flawless: every pair on the first try." : `Matched with ${miss} wrong pairing${miss > 1 ? "s" : ""}. Flawless counts as correct.`) : `Tap one on each side. ${got.length}/${d.pairs.length} matched${miss ? ` · ${miss} miss${miss > 1 ? "es" : ""}` : ""}`}</p>
    </div>
  );
}

/* ---------- bug: tap the wrong line ---------- */
function Bug({ d, done, onAnswer }: DrillProps<Of<"bug">>) {
  const [pick, setPick] = useState<number | null>(null);
  const choose = (i: number) => { if (done || pick !== null) return; setPick(i); onAnswer(i === d.line); };
  const show = done || pick !== null;
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-[#0c0e15] font-mono text-[12.5px] leading-[1.7] sm:text-[13px]">
      {d.code.map((ln, i) => {
        const st = !show ? "idle" : i === d.line ? "right" : i === pick ? "wrong" : "off";
        return (
          <button key={i} onClick={() => choose(i)} disabled={show}
            className={cn("group flex w-full items-start gap-3 px-3 py-0.5 text-left transition", st === "idle" && "hover:bg-accent/[0.07]", st === "right" && "bg-ok/15", st === "wrong" && "animate-shake bg-bad/15", st === "off" && "opacity-60")}>
            <span className={cn("num w-5 shrink-0 select-none text-right", st === "right" ? "text-ok" : st === "wrong" ? "text-bad" : "text-faint group-hover:text-accent")}>{i + 1}</span>
            <span className="min-w-0 flex-1 whitespace-pre-wrap break-words text-[#cfd6ea]">{ln || " "}</span>
            {st === "right" && <Check size={14} className="mt-1 shrink-0 text-ok" />}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- guess: slider with tolerance ---------- */
function Guess({ d, done, onAnswer }: DrillProps<Of<"guess">>) {
  const toV = (t: number) => (d.log ? 10 ** (Math.log10(d.min) + (t / 1000) * (Math.log10(d.max) - Math.log10(d.min))) : d.min + (t / 1000) * (d.max - d.min));
  const toT = (v: number) => (d.log ? ((Math.log10(v) - Math.log10(d.min)) / (Math.log10(d.max) - Math.log10(d.min))) * 1000 : ((v - d.min) / (d.max - d.min)) * 1000);
  const [t, setT] = useState(500);
  const [locked, setLocked] = useState<number | null>(null);
  const raw = toV(t);
  const v = !d.log && d.max - d.min >= 20 ? Math.round(raw) : raw;
  const lock = () => { if (done || locked !== null) return; setLocked(v); onAnswer(guessOk(d, v)); };
  useKeys(!done && locked === null, (e) => { if (e.key === "Enter") { e.preventDefault(); lock(); } });
  const show = locked !== null || done;
  const fmt = (x: number) => (d.unit === "$" ? `$${fmtNum(x)}` : `${fmtNum(x)}${d.unit ? ` ${d.unit}` : ""}`);
  const ok = locked !== null && guessOk(d, locked);
  const lo = d.log ? d.answer / (1 + d.tol) : d.answer - d.tol, hi = d.log ? d.answer * (1 + d.tol) : d.answer + d.tol;
  const pct = (x: number) => `${Math.max(0, Math.min(100, toT(Math.max(d.min, Math.min(d.max, x))) / 10))}%`;
  return (
    <div className="space-y-4">
      <div className="text-center">
        <motion.div key={show ? "a" : "v"} initial={{ scale: 0.9 }} animate={{ scale: 1 }} className={cn("num display text-4xl font-semibold sm:text-5xl", show ? (ok ? "text-ok" : "text-warn") : "text-text")}>{fmt(show ? d.answer : v)}</motion.div>
        <div className="mt-1 text-[12px] text-faint">{show ? (locked !== null ? `You said ${fmt(locked)}: ${ok ? "inside the zone" : "outside the zone"}` : "The answer") : d.log ? "Log scale: each notch multiplies" : "Drag to estimate"}</div>
      </div>
      <div className="relative px-1 pb-2 pt-3">
        {show && <span className="absolute top-3 h-2 rounded-full bg-ok/30" style={{ left: pct(lo), width: `calc(${pct(hi)} - ${pct(lo)})` }} />}
        <input type="range" min={0} max={1000} value={show && locked !== null ? toT(locked) : t} disabled={show} onChange={(e) => setT(+e.target.value)} aria-label="Your estimate" className="relative w-full" />
        {show && <span className="absolute top-1 h-6 w-[3px] -translate-x-1/2 rounded bg-ok" style={{ left: pct(d.answer) }} />}
        <div className="mt-1 flex justify-between text-[11px] text-faint"><span>{fmt(d.min)}</span><span>{fmt(d.max)}</span></div>
      </div>
      {!show && <div className="flex justify-center"><Button variant="primary" onClick={lock}>Lock it in<Kbd k="↵" /></Button></div>}
    </div>
  );
}

const PROMPT: Record<Drill["kind"], (d: Drill) => string> = {
  tf: () => "", pick: (d) => (d as Of<"pick">).q, order: (d) => (d as Of<"order">).q, match: (d) => (d as Of<"match">).q,
  odd: (d) => (d as Of<"odd">).q, blank: () => "", bug: (d) => (d as Of<"bug">).q, guess: (d) => (d as Of<"guess">).q,
};
export const promptOf = (d: Drill) => PROMPT[d.kind](d);

export function DrillView(p: DrillProps) {
  const d = p.d;
  switch (d.kind) {
    case "tf": return <TrueFalse {...p} d={d} />;
    case "pick": return <Pick {...p} d={d} />;
    case "order": return <Order {...p} d={d} />;
    case "match": return <Match {...p} d={d} />;
    case "odd": return <Odd {...p} d={d} />;
    case "blank": return <Blank {...p} d={d} />;
    case "bug": return <Bug {...p} d={d} />;
    case "guess": return <Guess {...p} d={d} />;
  }
}
