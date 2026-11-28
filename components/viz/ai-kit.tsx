"use client";
// Shared frame and controls for the AI widgets. The frame registers a reader adapter, so the article reader can
// introduce a widget and then drive it (move sliders, press buttons) while it explains what changes.

import { useCallback, useRef, type ReactNode } from "react";
import { useReadable, type ReadCtx, type ReadStep } from "@/lib/reader/registry";
import { cn } from "../ui";

export type Drive = (ctx: ReadCtx, $: (sel?: string) => Element | null) => ReadStep[];

export function Frame({ title, about, children, drive, className, tone = "var(--color-ai)" }: { title: string; about: string; children: ReactNode; drive?: Drive; className?: string; tone?: string }) {
  const root = useRef<HTMLElement | null>(null);
  const $ = (sel?: string) => (sel ? root.current?.querySelector(sel) ?? root.current : root.current);
  const adapter = useReadable<HTMLElement>((ctx) => {
    const intro: ReadStep = { say: `Here's an interactive demo: ${title}. ${about}`, focus: () => root.current, pause: 300 };
    if (!drive || !ctx.interact) return [intro, { say: "Play with it yourself when you're ready.", focus: () => root.current }];
    return [intro, ...drive(ctx, $), { say: "Now it's your turn to play with it.", focus: () => root.current, pause: 300 }];
  });
  const ref = useCallback((el: HTMLElement | null) => { root.current = el; adapter(el); }, [adapter]);
  return (
    <section ref={ref} data-read-block className={cn("card overflow-hidden", className)}>
      <div className="border-b border-line px-5 py-3.5" style={{ background: `linear-gradient(90deg, color-mix(in srgb, ${tone} 8%, transparent), transparent 70%)` }}>
        <div className="eyebrow" style={{ color: tone }}>Play with it</div>
        <div className="display text-[17px] font-semibold">{title}</div>
        <p className="mt-1 text-[13px] text-mute">{about}</p>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

export const Stat = ({ k, v, tone, sub }: { k: string; v: ReactNode; tone?: string; sub?: ReactNode }) => (
  <div className="min-w-0 rounded-xl border border-line bg-bg px-3 py-2">
    <div className="truncate text-[10.5px] uppercase tracking-wider text-faint">{k}</div>
    <div className="num display truncate text-lg font-semibold" style={{ color: tone }}>{v}</div>
    {sub && <div className="truncate text-[11px] text-faint">{sub}</div>}
  </div>
);

export const Slider = ({ label, value, min, max, step = 1, onChange, fmt, hint }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; fmt?: (v: number) => string; hint?: string }) => (
  <label className="block">
    <div className="mb-1 flex justify-between gap-2 text-[12.5px]"><span className="text-mute">{label}</span><span className="num font-semibold">{fmt ? fmt(value) : value}</span></div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} className="w-full" aria-label={label} />
    {hint && <div className="mt-0.5 text-[11px] text-faint">{hint}</div>}
  </label>
);

export function Chips<T extends string | number>({ value, options, onChange, label, tone }: { value: T; options: { id: T; label: ReactNode }[]; onChange: (v: T) => void; label?: string; tone?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label={label}>
      {label && <span className="mr-1 text-[12px] text-faint">{label}</span>}
      {options.map((o) => (
        <button key={String(o.id)} role="radio" aria-checked={value === o.id} onClick={() => onChange(o.id)}
          style={tone && value === o.id ? { borderColor: `color-mix(in srgb, ${tone} 60%, transparent)`, background: `color-mix(in srgb, ${tone} 15%, transparent)` } : undefined}
          className={cn("rounded-full border px-2.5 py-1 text-[12px] font-medium transition", value === o.id ? (tone ? "text-text" : "border-ai/60 bg-ai/15 text-text") : "border-line text-mute hover:text-text")}>{o.label}</button>
      ))}
    </div>
  );
}

/** Seeded random numbers, so demos look the same on every visit. */
export function rand(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function gauss(r: () => number) {
  const u = Math.max(1e-9, r()), v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
export const softmax = (xs: number[], t = 1) => { const m = Math.max(...xs); const e = xs.map((x) => Math.exp((x - m) / t)); const z = e.reduce((a, b) => a + b, 0); return e.map((x) => x / z); };
export const pct = (x: number, d = 0) => `${(x * 100).toFixed(d)}%`;
export const AI = "var(--color-ai)";
export const fmtBig = (n: number) => (n >= 1e12 ? `${+(n / 1e12).toFixed(2)}T` : n >= 1e9 ? `${+(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `${+(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${+(n / 1e3).toFixed(1)}K` : `${Math.round(n)}`);
