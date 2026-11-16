"use client";
import clsx from "clsx";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { Area } from "@/lib/types";
import { areaOf } from "@/content";

export const cn = clsx;

export function Md({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn("md", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "soft" | "danger"; size?: "sm" | "md" };
export function Button({ variant = "soft", size = "md", className, ...p }: BtnProps) {
  return (
    <button
      {...p}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition active:scale-[0.97] disabled:opacity-40 whitespace-nowrap",
        size === "sm" ? "h-8 px-3 text-[13px]" : "h-10 px-4 text-sm",
        variant === "primary" && "bg-accent text-ink hover:brightness-110 shadow-[0_0_24px_-6px_var(--color-accent)]",
        variant === "soft" && "bg-panel2 border border-line hover:border-[#3a4160] text-text",
        variant === "ghost" && "text-mute hover:text-text hover:bg-white/5",
        variant === "danger" && "bg-bad/10 text-bad border border-bad/30 hover:bg-bad/20",
        className,
      )}
    />
  );
}

export function Pill({ children, color, className }: { children: ReactNode; color?: string; className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11.5px] font-medium", className)}
      style={color ? { color, borderColor: `color-mix(in srgb, ${color} 35%, transparent)`, background: `color-mix(in srgb, ${color} 10%, transparent)` } : undefined}
    >
      {children}
    </span>
  );
}

export function AreaPill({ area }: { area: Area }) {
  const a = areaOf(area);
  return <Pill color={a.color}>{a.short}</Pill>;
}

export const DIFF = { E: { label: "Easy", color: "var(--color-ok)" }, M: { label: "Medium", color: "var(--color-warn)" }, H: { label: "Hard", color: "var(--color-bad)" } };

export function Ring({ value, size = 56, stroke = 5, color = "var(--color-accent)", children }: { value: number; size?: number; stroke?: number; color?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value || 0));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#232738" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v)} style={{ transition: "stroke-dashoffset .8s cubic-bezier(.2,.8,.2,1)" }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-xs font-semibold num">{children}</div>
    </div>
  );
}

export function Bar({ value, color = "var(--color-accent)", className }: { value: number; color?: string; className?: string }) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-[#1d2132]", className)}>
      <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.max(0, Math.min(1, value || 0)) * 100}%`, background: color }} />
    </div>
  );
}

export function PageHead({ eyebrow, title, sub, right }: { eyebrow?: string; title: ReactNode; sub?: ReactNode; right?: ReactNode }) {
  return (
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4 animate-rise">
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
        <h1 className="display text-3xl font-semibold sm:text-4xl">{title}</h1>
        {sub && <p className="mt-2 max-w-2xl text-[15px] text-mute">{sub}</p>}
      </div>
      {right}
    </header>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="card grid place-items-center px-6 py-14 text-center">
      <div className="display text-lg font-semibold">{title}</div>
      {children && <div className="mt-2 max-w-md text-sm text-mute">{children}</div>}
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: ReactNode }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-xl border border-line bg-panel p-1" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)}
          className={cn("whitespace-nowrap rounded-lg px-3 py-1.5 text-[13px] font-medium transition", value === t.id ? "bg-panel2 text-text shadow-inner" : "text-mute hover:text-text")}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

export const fmtMin = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}` : `${m}m`);
export const fmtClock = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(Math.max(0, sec) % 60).padStart(2, "0")}`;
