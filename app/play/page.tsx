"use client";
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { CalendarCheck, Flame, Gamepad2, Heart, Play, Sparkles, Timer, Trophy } from "lucide-react";
import { useStore } from "@/lib/store";
import { dailyRound, dailyStreak, pool, topicEntries, usePlay, type Entry } from "@/lib/play";
import { todayISO } from "@/lib/srs";
import { AREAS, TOPICS, areaOf } from "@/content";
import { DRILLS } from "@/content/drills";
import type { Area } from "@/lib/types";
import { Button, PageHead, Ring, cn } from "@/components/ui";
import { QuickPlay, type Mode } from "@/components/play/QuickPlay";

type Game = { mode: Mode; entries: Entry[]; color: string; topicId?: string; title: string };

export default function Arcade() {
  const areas = useStore((s) => s.settings.areas);
  const play = usePlay();
  const [area, setArea] = useState<Area | "all">("all");
  const [game, setGame] = useState<Game | null>(null);
  const today = todayISO();
  const daily = useMemo(() => dailyRound(areas, today), [areas, today]);
  const doneToday = play.daily[today];
  const streak = dailyStreak(play.daily, today);
  const total = useMemo(() => Object.values(DRILLS).reduce((n, d) => n + d.length, 0), []);
  const color = area === "all" ? "var(--color-accent)" : areaOf(area).color;
  const mixed = () => (area === "all" ? pool(areas) : pool(undefined, area));
  const start = (g: Game) => { setGame(g); window.scrollTo({ top: 0, behavior: "smooth" }); };

  if (game) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex items-center gap-2 text-[13px] text-mute"><Gamepad2 size={15} />{game.title}</div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card relative overflow-clip p-5 sm:p-7" style={{ borderColor: `color-mix(in srgb, ${game.color} 30%, var(--color-line))` }}>
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full blur-3xl" style={{ background: `color-mix(in srgb, ${game.color} 14%, transparent)` }} />
          <div className="relative"><QuickPlay key={game.title} {...game} onExit={() => setGame(null)} /></div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHead eyebrow="Arcade" title="Quick play" sub={`${total} bite-sized challenges across every area: true or false, spot the bug, put it in order, match up, estimate. Each takes seconds and trains recall, not recognition.`}
        right={<div className="flex gap-2">
          <Stat icon={Flame} label="Daily streak" v={`${streak}d`} hot={streak > 0} />
          <Stat icon={Trophy} label="Lightning best" v={String(play.best.lightning ?? 0)} />
          <Stat icon={Sparkles} label="Answered" v={String(play.played)} />
        </div>} />

      {/* daily round */}
      <section className="card relative overflow-clip p-6 sm:p-8">
        <div className="pointer-events-none absolute inset-0 opacity-60" style={{ background: "radial-gradient(600px 240px at 90% 0%, rgb(200 245 71 / 0.12), transparent 70%), radial-gradient(500px 260px at 0% 100%, rgb(183 148 244 / 0.1), transparent 70%)" }} />
        <div className="relative flex flex-wrap items-center gap-6">
          <div className="min-w-0 flex-1">
            <div className="eyebrow flex items-center gap-1.5 text-accent"><CalendarCheck size={13} />Daily round · {new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</div>
            <h2 className="display mt-2 text-2xl font-semibold sm:text-3xl">{doneToday ? `Today: ${doneToday.score}/${doneToday.total}` : "Seven questions. One shot a day."}</h2>
            <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-mute">{doneToday ? `Done for today${streak > 1 ? `, and that's ${streak} days in a row` : ""}. A new mix unlocks at midnight. Keep the streak alive tomorrow.` : "A fresh mix from every area you study, the same for everyone today. Finish it to grow your daily streak."}</p>
            <div className="mt-4 flex gap-1.5">{Array.from({ length: 7 }, (_, k) => { const d = new Date(Date.now() - (6 - k) * 86400000); const iso = todayISO(d); const r = play.daily[iso]; return <div key={k} title={iso} className={cn("grid h-9 w-9 place-items-center rounded-xl border text-[11px] font-semibold", r ? "border-accent/50 bg-accent/15 text-accent" : iso === today ? "border-dashed border-accent/50 text-mute" : "border-line text-faint")}>{r ? <Flame size={14} /> : d.toLocaleDateString(undefined, { weekday: "narrow" })}</div>; })}</div>
          </div>
          {!doneToday && daily.length > 0 && <Button variant="primary" className="h-12 px-6 text-[15px]" onClick={() => start({ mode: "daily", entries: daily, color: "var(--color-accent)", title: "Daily round" })}><Play size={17} fill="currentColor" />Play today&apos;s round</Button>}
        </div>
      </section>

      {/* arcade modes */}
      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <h2 className="display text-xl font-semibold">Arcade modes</h2>
          <div className="flex flex-wrap gap-1.5">
            {(["all", ...AREAS.map((a) => a.id)] as const).map((id) => {
              const c = id === "all" ? "var(--color-accent)" : areaOf(id).color;
              return <button key={id} onClick={() => setArea(id)} className={cn("rounded-full border px-3 py-1 text-[12.5px] font-medium transition", area === id ? "text-ink" : "border-line text-mute hover:text-text")} style={area === id ? { background: c, borderColor: c } : undefined}>{id === "all" ? "Everything" : areaOf(id).short}</button>;
            })}
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <ModeCard icon={Timer} color={color} title="Lightning" sub="60 seconds. As many as you can. Combos earn bonus XP." best={play.best.lightning} onPlay={() => start({ mode: "lightning", entries: mixed(), color, title: `Lightning · ${area === "all" ? "everything" : areaOf(area).short}` })} />
          <ModeCard icon={Heart} color={color} title="Survival" sub="Three lives. No clock. How long can you last?" best={play.best.survival} onPlay={() => start({ mode: "survival", entries: mixed(), color, title: `Survival · ${area === "all" ? "everything" : areaOf(area).short}` })} />
        </div>
      </section>

      {/* by topic */}
      <section>
        <h2 className="display mb-1 text-xl font-semibold">Pick a topic</h2>
        <p className="mb-4 text-[13px] text-mute">Every topic has its own round. The ring is your best score.</p>
        <div className="space-y-6">
          {AREAS.filter((a) => area === "all" || a.id === area).map((a) => (
            <div key={a.id}>
              <div className="mb-2 text-[12px] font-semibold uppercase tracking-widest" style={{ color: a.color }}>{a.name}</div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {TOPICS.filter((t) => t.area === a.id && DRILLS[t.id]?.length).map((t) => {
                  const best = play.topics[t.id];
                  return (
                    <button key={t.id} onClick={() => start({ mode: "topic", entries: topicEntries(t.id), color: a.color, topicId: t.id, title: t.title })} className="card card-hover group flex items-center gap-3 p-3 text-left">
                      <Ring value={(best ?? 0) / 100} size={38} stroke={3.5} color={a.color}>{best === undefined ? <Play size={11} className="text-faint transition group-hover:text-text" /> : <span className="text-[10px]">{best}</span>}</Ring>
                      <span className="min-w-0 flex-1"><span className="block truncate text-[14px] font-medium">{t.title}</span><span className="text-[11.5px] text-faint">{DRILLS[t.id].length} challenges</span></span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ icon: Icon, label, v, hot }: { icon: typeof Flame; label: string; v: string; hot?: boolean }) {
  return <div className={cn("rounded-xl border px-3 py-2 text-center", hot ? "border-lld/40 bg-lld/10 text-lld" : "border-line bg-panel")}><div className="num flex items-center justify-center gap-1 text-lg font-semibold"><Icon size={15} />{v}</div><div className="text-[10.5px] text-faint">{label}</div></div>;
}

function ModeCard({ icon: Icon, color, title, sub, best, onPlay }: { icon: typeof Timer; color: string; title: string; sub: string; best?: number; onPlay: () => void }) {
  return (
    <motion.button whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }} onClick={onPlay} className="card group relative overflow-clip p-5 text-left">
      <div className="pointer-events-none absolute -bottom-16 -right-10 h-40 w-40 rounded-full blur-3xl transition-opacity group-hover:opacity-100" style={{ background: `color-mix(in srgb, ${color} 18%, transparent)`, opacity: 0.6 }} />
      <div className="relative flex items-start gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl" style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}><Icon size={22} /></span>
        <div className="min-w-0 flex-1">
          <div className="display text-lg font-semibold">{title}</div>
          <p className="mt-1 text-[13px] leading-relaxed text-mute">{sub}</p>
          <div className="mt-3 flex items-center gap-3 text-[12.5px]"><span className="inline-flex items-center gap-1 font-semibold" style={{ color }}><Play size={13} fill="currentColor" />Play</span>{best ? <span className="num text-faint"><Trophy size={12} className="mr-1 inline text-warn" />Best {best}</span> : null}</div>
        </div>
      </div>
    </motion.button>
  );
}
