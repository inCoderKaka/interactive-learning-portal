"use client";
/**
 * Shared building blocks for the HLD visuals.
 * - Frame: every visual opens with the one question it answers (guided attention, not a sandbox).
 * - useSim: a seeded, deterministic tick engine (play / pause / step / reset / speed). Two runs with the same seed
 *   see identical traffic, so strategies can race fairly.
 * - Stat, Slider, Chips, Spark, Predict: the metrics strip, inputs and the "predict first" prompt.
 * Simulations start paused: the learner presses play, which also respects reduced-motion preferences.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import { cn } from "../../ui";

export function Frame({ title, q, about, children, foot }: { title: string; q?: string; about: string; children: ReactNode; foot?: ReactNode }) {
  return (
    <section className="card overflow-hidden" data-read-block data-read-intro="An interactive demo." data-read-text={`${title}. ${q ? q + " " : ""}${about} Try it yourself when I'm done.`}>
      <div className="border-b border-line px-5 py-3.5">
        <div className="eyebrow">Play with it</div>
        <div className="display text-[17px] font-semibold">{title}</div>
        {q && <p className="mt-1 text-[14px] font-medium text-[#dfe7c4]">{q}</p>}
        <p className="mt-1 text-[13px] text-mute">{about}</p>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
      {foot && <div className="border-t border-line bg-bg/40 px-5 py-3 text-[13px] leading-relaxed text-mute">{foot}</div>}
    </section>
  );
}

export const Stat = ({ k, v, tone, sub }: { k: string; v: ReactNode; tone?: string; sub?: ReactNode }) => (
  <div className="min-w-0 rounded-xl border border-line bg-bg px-3 py-2">
    <div className="truncate text-[10.5px] uppercase tracking-wider text-faint">{k}</div>
    <div className="num display truncate text-[17px] font-semibold" style={{ color: tone }}>{v}</div>
    {sub && <div className="truncate text-[11px] text-faint">{sub}</div>}
  </div>
);

export const Slider = ({ label, value, min, max, step = 1, onChange, fmt }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; fmt?: (v: number) => string }) => (
  <label className="block min-w-0">
    <div className="mb-1 flex justify-between gap-2 text-[12.5px]"><span className="truncate text-mute">{label}</span><span className="num shrink-0 font-semibold">{fmt ? fmt(value) : value}</span></div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} className="w-full" />
  </label>
);

export function Chips<T extends string>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (v: T) => void; label?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label={label}>
      {label && <span className="mr-1 text-[12px] text-faint">{label}</span>}
      {options.map(([k, name]) => (
        <button key={k} role="radio" aria-checked={value === k} onClick={() => onChange(k)}
          className={cn("rounded-lg border px-2.5 py-1 text-[12.5px] transition", value === k ? "border-accent/60 bg-accent/10 font-semibold text-accent" : "border-line text-mute hover:text-text")}>{name}</button>
      ))}
    </div>
  );
}

export const Btn = ({ children, onClick, on, disabled, title, tone }: { children: ReactNode; onClick: () => void; on?: boolean; disabled?: boolean; title?: string; tone?: "bad" | "ok" }) => (
  <button onClick={onClick} disabled={disabled} title={title}
    className={cn("inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[12.5px] font-medium transition disabled:opacity-40",
      on ? "border-accent/60 bg-accent/10 text-accent" : tone === "bad" ? "border-bad/40 text-bad hover:bg-bad/10" : tone === "ok" ? "border-ok/40 text-ok hover:bg-ok/10" : "border-line text-mute hover:text-text")}>{children}</button>
);

/** mulberry32: small, fast, seedable. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function pct(xs: number[], p: number) {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
}
export const ms = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)} s` : `${Math.round(v)} ms`);

/**
 * Tick engine. `make()` builds the initial state (put any RNG inside it); `tick(state)` advances one tick in place.
 * `perFrame` ticks run per animation frame at speed 1. Returns the live state plus controls.
 */
export function useSim<S>(make: () => S, tick: (s: S) => void, deps: unknown[], perFrame = 1) {
  const ref = useRef<S>(null as unknown as S);
  const [, bump] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [ticks, setTicks] = useState(0);
  const mk = useRef(make), tk = useRef(tick);
  mk.current = make; tk.current = tick;
  const reset = useCallback(() => { ref.current = mk.current(); setTicks(0); bump((x) => x + 1); }, []);
  if (ref.current === null) ref.current = make();
  useEffect(() => { reset(); }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  const advance = useCallback((n: number) => { for (let i = 0; i < n; i++) tk.current(ref.current); setTicks((t) => t + n); bump((x) => x + 1); }, []);
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const loop = () => { advance(Math.max(1, Math.round(perFrame * speed))); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, perFrame, advance]);
  return { s: ref.current, ticks, playing, setPlaying, speed, setSpeed, reset, step: (n = 1) => advance(n) };
}

export function SimControls({ sim, stepLabel = "Step", stepN = 1, extra }: { sim: { playing: boolean; setPlaying: (p: boolean) => void; speed: number; setSpeed: (n: number) => void; reset: () => void; step: (n?: number) => void }; stepLabel?: string; stepN?: number; extra?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Btn onClick={() => sim.setPlaying(!sim.playing)} on={sim.playing}>{sim.playing ? <Pause size={13} /> : <Play size={13} />}{sim.playing ? "Pause" : "Play"}</Btn>
      <Btn onClick={() => { sim.setPlaying(false); sim.step(stepN); }}><SkipForward size={13} />{stepLabel}</Btn>
      <Btn onClick={() => { sim.setPlaying(false); sim.reset(); }}><RotateCcw size={13} />Reset</Btn>
      <span className="ml-1 text-[12px] text-faint">Speed</span>
      {[0.5, 1, 3].map((v) => <Btn key={v} on={sim.speed === v} onClick={() => sim.setSpeed(v)}>{v}×</Btn>)}
      {extra}
    </div>
  );
}

/** A tiny line chart. `max` fixes the scale so two charts side by side compare honestly. */
export function Spark({ data, max, color = "var(--color-hld)", h = 40, label, line }: { data: number[]; max?: number; color?: string; h?: number; label?: string; line?: number }) {
  const W = 240, top = max ?? Math.max(1, ...data);
  const pts = data.map((v, i) => `${(i / Math.max(1, data.length - 1)) * W},${h - (Math.min(v, top) / top) * (h - 2) - 1}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${h}`} className="block w-full" style={{ height: h }} role="img" aria-label={label ?? "trend"} preserveAspectRatio="none">
      {line != null && <line x1={0} x2={W} y1={h - (Math.min(line, top) / top) * (h - 2) - 1} y2={h - (Math.min(line, top) / top) * (h - 2) - 1} stroke="#ffc857" strokeDasharray="3 3" strokeWidth={1} vectorEffect="non-scaling-stroke" />}
      {data.length > 1 && <polyline points={pts} fill="none" stroke={color} strokeWidth={1.6} vectorEffect="non-scaling-stroke" />}
    </svg>
  );
}

/** Ask for a prediction before the learner runs the demo; the explanation shows once they commit. */
export function Predict({ q, options, answer, why }: { q: string; options: string[]; answer: number; why: string }) {
  const [pick, setPick] = useState<number | null>(null);
  return (
    <div className="rounded-xl border border-accent/25 bg-accent/[0.04] p-3">
      <div className="text-[12px] font-semibold uppercase tracking-wider text-accent">Predict first</div>
      <div className="mt-1 text-[13.5px]">{q}</div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {options.map((o, i) => (
          <button key={o} disabled={pick !== null} onClick={() => setPick(i)}
            className={cn("rounded-lg border px-2.5 py-1 text-[12.5px] transition", pick === null ? "border-line text-mute hover:text-text" : i === answer ? "border-ok/60 text-ok" : i === pick ? "border-bad/60 text-bad" : "border-line text-faint")}>{o}</button>
        ))}
      </div>
      {pick !== null && <p className="mt-2 text-[13px] leading-relaxed text-mute"><span className={pick === answer ? "text-ok" : "text-warn"}>{pick === answer ? "Right. " : "Not quite. "}</span>{why} Now run it and watch.</p>}
    </div>
  );
}

export const NODE = ["#4fd1c5", "#7aa7ff", "#ffb454", "#ff8fb3", "#c8f547", "#b794f4", "#f6ad55", "#63b3ed"];
