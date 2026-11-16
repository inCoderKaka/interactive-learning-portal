"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { AlertTriangle, Check, ChevronDown, Flag, Moon } from "lucide-react";
import { useStore } from "@/lib/store";
import { usePlan } from "@/lib/hooks";
import { todayISO } from "@/lib/srs";
import { AREAS, areaOf } from "@/content";
import { Bar, PageHead, Pill, cn, fmtMin } from "@/components/ui";
import type { Area } from "@/lib/types";

export default function Roadmap() {
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);
  const progress = useStore((s) => s.progress);
  const plan = usePlan();
  const today = todayISO();
  const weeks = useMemo(() => {
    const m = new Map<number, typeof plan.days>();
    plan.days.forEach((d) => m.set(d.week, [...(m.get(d.week) ?? []), d]));
    return [...m.entries()];
  }, [plan]);
  const [open, setOpen] = useState<number | null>(null);
  const openWeek = open ?? weeks[0]?.[0];
  const fits = plan.coverage >= 0.995;

  return (
    <div>
      <PageHead eyebrow="Roadmap" title="Your trail to the summit" sub="Everything is scheduled backwards from your target date. Change the dials and the plan re-flows instantly; finished items never come back, unfinished ones roll forward." />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="card space-y-5 p-5">
            <label className="block">
              <div className="mb-1.5 flex justify-between text-[13px]"><span className="text-mute">Duration</span><span className="num font-semibold">{settings.weeks} weeks</span></div>
              <input type="range" min={2} max={24} value={settings.weeks} onChange={(e) => setSettings({ weeks: +e.target.value })} className="w-full" />
            </label>
            <label className="block">
              <div className="mb-1.5 flex justify-between text-[13px]"><span className="text-mute">Daily study time</span><span className="num font-semibold">{settings.hoursPerDay} h</span></div>
              <input type="range" min={0.5} max={8} step={0.5} value={settings.hoursPerDay} onChange={(e) => setSettings({ hoursPerDay: +e.target.value })} className="w-full" />
            </label>
            <div>
              <div className="mb-1.5 text-[13px] text-mute">Study days per week</div>
              <div className="grid grid-cols-4 gap-1.5">{[4, 5, 6, 7].map((n) => <button key={n} onClick={() => setSettings({ daysPerWeek: n })} className={cn("num rounded-lg border py-1.5 text-[13px] font-semibold", settings.daysPerWeek === n ? "border-accent/60 bg-accent/10 text-accent" : "border-line text-mute hover:text-text")}>{n}</button>)}</div>
            </div>
            <label className="block">
              <div className="mb-1.5 text-[13px] text-mute">Start date</div>
              <input type="date" value={settings.startDate} onChange={(e) => e.target.value && setSettings({ startDate: e.target.value })} className="h-10 w-full rounded-xl border border-line bg-bg px-3 text-sm outline-none focus:border-accent/60" />
            </label>
            <div>
              <div className="mb-1.5 text-[13px] text-mute">Tracks</div>
              <div className="flex flex-wrap gap-1.5">
                {AREAS.map((a) => {
                  const on = settings.areas[a.id];
                  return <button key={a.id} aria-pressed={on} onClick={() => setSettings({ areas: { ...settings.areas, [a.id]: !on } as Record<Area, boolean> })} className={cn("rounded-full border px-3 py-1 text-[12.5px] font-medium transition", on ? "" : "border-line text-faint")} style={on ? { color: a.color, borderColor: `color-mix(in srgb, ${a.color} 45%, transparent)`, background: `color-mix(in srgb, ${a.color} 10%, transparent)` } : undefined}>{a.short}</button>;
                })}
              </div>
            </div>
          </div>

          <div className={cn("card p-5", !fits && "border-warn/40")}>
            <div className="flex items-center justify-between"><div className="eyebrow">Coverage</div><span className="num display text-2xl font-semibold" style={{ color: fits ? "var(--color-ok)" : "var(--color-warn)" }}>{Math.round(plan.coverage * 100)}%</span></div>
            <Bar className="mt-3" value={plan.coverage} color={fits ? "var(--color-ok)" : "var(--color-warn)"} />
            <p className="mt-3 text-[13px] leading-relaxed text-mute">
              {fmtMin(plan.totalMin)} of material left; {fmtMin(plan.capacityMin)} available before {new Date(plan.endDate + "T12:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}. One fifth of each day is kept free for spaced reviews.
            </p>
            {!fits && (
              <p className="mt-3 flex gap-2 rounded-xl border border-warn/30 bg-warn/5 p-3 text-[12.5px] leading-relaxed text-[#ffe6a8]"><AlertTriangle size={15} className="mt-0.5 shrink-0" />
                <span>{plan.overflow.length} lower-priority items do not fit. Must-know items are scheduled first, so nothing essential is dropped. To fit everything, study about <b>{plan.neededHoursPerDay} h/day</b> or add weeks.</span></p>
            )}
          </div>
        </aside>

        <div className="space-y-3">
          {weeks.map(([w, days]) => {
            const its = days.flatMap((d) => d.items), done = its.filter((i) => progress[i.id]?.status === "done").length;
            const isOpen = openWeek === w, hasToday = days.some((d) => d.date === today);
            const mix = AREAS.map((a) => ({ a, m: its.filter((i) => i.area === a.id).reduce((x, i) => x + i.est, 0) })).filter((x) => x.m);
            const totalM = mix.reduce((x, y) => x + y.m, 0) || 1;
            return (
              <section key={w} className={cn("card overflow-hidden", hasToday && "border-accent/40")}>
                <button onClick={() => setOpen(isOpen ? -1 : w)} aria-expanded={isOpen} className="flex w-full items-center gap-4 px-5 py-4 text-left">
                  <span className={cn("display grid h-11 w-11 shrink-0 place-items-center rounded-xl text-lg font-semibold num", hasToday ? "bg-accent text-ink" : "bg-panel2 text-mute")}>{w}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">Week {w}</span>{hasToday && <Pill color="var(--color-accent)">this week</Pill>}{w === settings.weeks && <Pill color="var(--color-craft)"><Flag size={11} />final</Pill>}</div>
                    <div className="mt-1.5 flex h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-[#1d2132]">{mix.map(({ a, m }) => <div key={a.id} style={{ width: `${(m / totalM) * 100}%`, background: a.color }} />)}</div>
                  </div>
                  <span className="num text-[13px] text-mute">{its.length} items · {fmtMin(its.reduce((x, i) => x + i.est, 0))}{done ? ` · ${done} done` : ""}</span>
                  <ChevronDown size={18} className={cn("shrink-0 text-faint transition", isOpen && "rotate-180")} />
                </button>
                {isOpen && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-t border-line">
                    {days.map((d) => (
                      <div key={d.date} className={cn("grid gap-2 border-b border-line/60 px-5 py-3 last:border-0 sm:grid-cols-[120px_1fr]", d.date === today && "bg-accent/[0.04]")}>
                        <div className="text-[13px]"><div className={cn("font-semibold", d.date === today && "text-accent")}>{new Date(d.date + "T12:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</div><div className="num text-[11.5px] text-faint">{d.rest ? "rest" : fmtMin(d.minutes)}</div></div>
                        <div className="flex flex-wrap gap-1.5">
                          {d.rest && <span className="flex items-center gap-1.5 text-[13px] text-faint"><Moon size={13} />Rest day</span>}
                          {d.items.map((it) => {
                            const dn = progress[it.id]?.status === "done";
                            return <Link key={it.id} href={it.href} className={cn("flex max-w-full items-center gap-1.5 rounded-lg border border-line bg-panel2 px-2.5 py-1 text-[12.5px] transition hover:border-[#3a4160]", dn && "opacity-55")}>
                              {dn ? <Check size={12} className="text-ok" /> : <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: areaOf(it.area).color }} />}<span className="truncate">{it.title}</span></Link>;
                          })}
                          {!d.rest && !d.items.length && <span className="text-[13px] text-faint">Buffer: reviews and catch-up</span>}
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </section>
            );
          })}
          {!weeks.length && <div className="card p-10 text-center text-sm text-mute">The plan&apos;s end date has passed. Extend the duration or move the start date.</div>}
          {plan.overflow.length > 0 && (
            <details className="card p-5">
              <summary className="cursor-pointer text-sm font-semibold">Stretch list: {plan.overflow.length} items beyond the current timeline</summary>
              <div className="mt-3 flex flex-wrap gap-1.5">{plan.overflow.map((it) => <Link key={it.id} href={it.href} className="rounded-lg border border-line px-2.5 py-1 text-[12.5px] text-mute hover:text-text">{it.title}</Link>)}</div>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
