"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Brain, CalendarClock, Check, Compass, EyeOff, Flame, Gamepad2, Play, RefreshCw, Sparkles, Target } from "lucide-react";
import { dailyStreak, usePlay } from "@/lib/play";
import { useStore } from "@/lib/store";
import { useDue, useItems, usePlan, useMockLabels } from "@/lib/hooks";
import { addDays, daysBetween, todayISO } from "@/lib/srs";
import { AREAS, TOPICS, areaOf } from "@/content";
import { aiReady } from "@/lib/ai";
import { XP } from "@/lib/gamify";
import { AreaPill, Bar, Button, Pill, Ring, cn, fmtMin } from "@/components/ui";
import type { Quiz } from "@/lib/types";

function WarmUp() {
  const progress = useStore((s) => s.progress);
  const addXp = useStore((s) => s.addXp);
  const [seed] = useState(() => Math.random());
  const [pick, setPick] = useState<number | null>(null);
  const q = useMemo(() => {
    const done = TOPICS.filter((t) => progress[`t-${t.id}`]?.status === "done" && t.quiz.length);
    const pool = (done.length ? done : TOPICS.slice(0, 3)).flatMap((t) => t.quiz.map((quiz) => ({ quiz, t })));
    return pool[Math.floor(seed * pool.length)] as { quiz: Quiz; t: (typeof TOPICS)[number] };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);
  const blind = useStore((s) => s.settings.blind);
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between"><div className="eyebrow flex items-center gap-1.5"><Brain size={13} />60-second warm-up</div>{!blind && <span className="text-[11.5px] text-faint">{q.t.title}</span>}</div>
      <p className="mt-3 text-[15px] font-medium leading-snug">{q.quiz.q}</p>
      <div className="mt-3 grid gap-2">
        {q.quiz.options.map((o, i) => {
          const state = pick === null ? "idle" : i === q.quiz.answer ? "right" : i === pick ? "wrong" : "off";
          return (
            <button key={i} disabled={pick !== null} onClick={() => { setPick(i); if (i === q.quiz.answer) addXp(XP.quiz, "Warm-up"); }}
              className={cn("rounded-xl border px-3.5 py-2.5 text-left text-[13.5px] transition", state === "idle" && "border-line bg-panel2 hover:border-[#3a4160]", state === "right" && "border-ok/60 bg-ok/10 text-ok", state === "wrong" && "border-bad/60 bg-bad/10 text-bad", state === "off" && "border-line opacity-50")}>{o}</button>
          );
        })}
      </div>
      {pick !== null && <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-3 text-[13px] leading-relaxed text-mute">{q.quiz.why}</motion.p>}
    </div>
  );
}

/** The daily quick-play round: a pull back every day, with its streak. */
function DailyPlay() {
  const play = usePlay();
  const today = todayISO();
  const done = play.daily[today];
  const streak = dailyStreak(play.daily, today);
  return (
    <Link href="/play" className={cn("card card-hover group relative block overflow-clip p-5", !done && "border-accent/40")}>
      <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-accent/10 blur-3xl transition group-hover:bg-accent/20" />
      <div className="relative flex items-center justify-between">
        <div className="eyebrow flex items-center gap-1.5 text-accent"><Gamepad2 size={13} />Daily round</div>
        {streak > 0 && <span className="num inline-flex items-center gap-1 rounded-full bg-lld/10 px-2 py-0.5 text-[11.5px] font-semibold text-lld"><Flame size={12} />{streak} day{streak > 1 ? "s" : ""}</span>}
      </div>
      <div className="display relative mt-2 text-xl font-semibold">{done ? `${done.score}/${done.total} today. Nice.` : "7 quick challenges, 2 minutes"}</div>
      <p className="relative mt-1 text-[13px] leading-relaxed text-mute">{done ? "New round at midnight. Fancy a 60-second lightning round meanwhile?" : "True or false, spot the bug, put it in order, estimate. Keep your streak alive."}</p>
      <div className="relative mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent">{done ? <>Open the arcade<ArrowRight size={14} className="transition group-hover:translate-x-1" /></> : <><Play size={13} fill="currentColor" />Play now</>}</div>
    </Link>
  );
}

export default function Today() {
  const s = useStore();
  const items = useItems();
  const plan = usePlan();
  const mockLabels = useMockLabels();
  const due = useDue();
  const today = todayISO();
  const day = plan.days.find((d) => d.date === today);
  const log = s.activity[today] ?? { min: 0, xp: 0, done: 0 };
  const target = Math.round(s.settings.hoursPerDay * 60);
  const total = items.filter((i) => s.settings.areas[i.area]);
  const doneCount = total.filter((i) => s.progress[i.id]?.status === "done").length;
  const dayNo = Math.max(1, daysBetween(s.settings.startDate, today) + 1);
  const left = Math.max(0, daysBetween(today, plan.endDate));
  const fresh = doneCount === 0 && !Object.keys(s.activity).length;
  const hour = new Date().getHours();
  const hello = hour < 5 ? "Burning the midnight oil" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  // neglected topic: started area, least recent activity. Counteracts the pull toward favourite topics.
  const neglected = useMemo(() => {
    const scored = TOPICS.filter((t) => s.settings.areas[t.area] && t.tier <= 2).map((t) => {
      const its = items.filter((i) => i.topic === t.id);
      const d = its.filter((i) => s.progress[i.id]?.status === "done");
      const scores = its.map((i) => s.progress[i.id]?.score).filter((x): x is number => x != null);
      const last = Math.max(0, ...its.map((i) => s.progress[i.id]?.updated ?? 0));
      return { t, ratio: d.length / Math.max(1, its.length), avg: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null, last, started: d.length > 0 };
    });
    const weak = scored.filter((x) => x.avg !== null && x.avg < 60).sort((a, b) => a.avg! - b.avg!)[0];
    const stale = scored.filter((x) => x.started && x.ratio < 1 && Date.now() - x.last > 5 * 86400000).sort((a, b) => a.last - b.last)[0];
    return weak ? { ...weak, why: `Your average review score here is ${Math.round(weak.avg!)}.` } : stale ? { ...stale, why: `Untouched for ${Math.round((Date.now() - stale.last) / 86400000)} days and only ${Math.round(stale.ratio * 100)}% done.` } : null;
  }, [items, s.progress, s.settings.areas]);

  const queue = day?.items ?? [];
  const next = queue.find((i) => s.progress[i.id]?.status !== "done");

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 animate-rise">
        <div>
          <div className="eyebrow mb-2">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })} · Day {dayNo} of {s.settings.weeks * 7}</div>
          <h1 className="display text-3xl font-semibold sm:text-[2.6rem] sm:leading-[1.1]">{hello}{s.settings.name ? `, ${s.settings.name}` : ""}.</h1>
          <p className="mt-2 text-[15px] text-mute">{left} days to your target date. {plan.coverage >= 0.995 ? "You are on pace to cover everything." : `At this pace you will cover ${Math.round(plan.coverage * 100)}% of what is left.`}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right"><div className="num display text-2xl font-semibold">{log.min}<span className="text-base text-mute"> / {target} min</span></div><div className="text-[12px] text-faint">studied today · +{log.xp} XP</div></div>
          <Ring value={log.min / target} size={64} stroke={6}>{Math.min(100, Math.round((log.min / target) * 100))}%</Ring>
        </div>
      </header>

      {fresh && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card relative overflow-hidden p-6">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-accent/10 blur-3xl" />
          <div className="eyebrow flex items-center gap-1.5 text-accent"><Compass size={13} />Start here</div>
          <h2 className="display mt-2 text-2xl font-semibold">Three decisions, then you climb.</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {[
              { n: "1", t: "Set your timeline", d: `Currently ${s.settings.weeks} weeks at ${s.settings.hoursPerDay} h/day. The plan re-flows whenever you change it.`, href: "/roadmap", cta: "Tune the roadmap", ok: false },
              { n: "2", t: "Connect an AI reviewer", d: "Gemini, Claude, OpenAI or your local-server grades code and designs and runs the voice interviewer. Keys stay in this browser.", href: "/settings#ai", cta: "Add a key", ok: aiReady(s.settings) },
              { n: "3", t: "Save across devices", d: "Sign in to keep progress, notes and reviews in your account. Guest mode works too.", href: "/login", cta: "Sign in", ok: !!s.user },
            ].map((x) => (
              <Link key={x.n} href={x.href} className="card card-hover block bg-panel2 p-4">
                <div className="flex items-center gap-2"><span className={cn("grid h-6 w-6 place-items-center rounded-full text-[12px] font-bold", x.ok ? "bg-ok text-ink" : "bg-accent/15 text-accent")}>{x.ok ? <Check size={13} /> : x.n}</span><span className="font-semibold">{x.t}</span></div>
                <p className="mt-2 text-[13px] leading-relaxed text-mute">{x.d}</p>
                <div className="mt-3 flex items-center gap-1 text-[13px] font-medium text-accent">{x.cta}<ArrowRight size={14} /></div>
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.55fr_1fr]">
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <div><div className="eyebrow flex items-center gap-1.5"><Target size={13} />Today&apos;s trail</div><div className="mt-0.5 text-[13px] text-mute">{queue.length ? `${queue.filter((i) => s.progress[i.id]?.status === "done").length} of ${queue.length} done · about ${fmtMin(day!.minutes)} of new material` : day?.rest ? "Rest day. Reviews only, if you feel like it." : "Nothing scheduled: your plan is complete or outside its dates."}</div></div>
            {next && <Link href={next.href}><Button variant="primary">Continue<ArrowRight size={15} /></Button></Link>}
          </div>
          <ol className="divide-y divide-line">
            {queue.map((it, i) => {
              const done = s.progress[it.id]?.status === "done";
              const a = areaOf(it.area);
              const ml = it.kind === "mock" && !done ? mockLabels.get(it.id) : undefined;
              return (
                <motion.li key={it.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                  <Link href={ml?.href ?? it.href} title={ml?.reason} className="group flex items-center gap-4 px-5 py-3.5 transition hover:bg-white/[0.025]">
                    <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full border text-[12px] font-semibold num", done ? "border-ok bg-ok text-ink" : it === next ? "border-accent text-accent" : "border-line text-faint")}>{done ? <Check size={15} /> : i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className={cn("truncate text-[15px] font-medium", done && "text-mute line-through decoration-faint")}>{ml?.title ?? it.title}</div>
                      <div className="mt-0.5 flex items-center gap-2 text-[12px] text-faint"><span className="h-1.5 w-1.5 rounded-full" style={{ background: a.color }} />{a.short} · {it.kind === "topic" ? "concept lesson" : it.kind === "mock" ? "mock interview" : it.kind === "checkpoint" ? "interview checkpoint" : it.kind === "design" ? "design exercise" : "problem"} · {fmtMin(it.est)}</div>
                    </div>
                    <ArrowRight size={16} className="shrink-0 text-faint transition group-hover:translate-x-1 group-hover:text-accent" />
                  </Link>
                </motion.li>
              );
            })}
            {!queue.length && <li className="px-5 py-10 text-center text-sm text-mute">Open the <Link href="/roadmap" className="text-accent underline underline-offset-4">roadmap</Link> to adjust dates, or pick anything from <Link href="/learn" className="text-accent underline underline-offset-4">Learn</Link>.</li>}
          </ol>
        </section>

        <div className="space-y-6">
          <Link href="/review" className={cn("card card-hover block p-5", due.length && "border-accent/40")}>
            <div className="flex items-center justify-between">
              <div className="eyebrow flex items-center gap-1.5"><RefreshCw size={13} />Spaced review</div>
              {due.length > 0 && <Pill color="var(--color-accent)">{due.length} due</Pill>}
            </div>
            <div className="display mt-2 text-xl font-semibold">{due.length ? `${due.length} item${due.length > 1 ? "s" : ""} about to fade` : "Memory is fresh"}</div>
            <p className="mt-1 text-[13px] leading-relaxed text-mute">{due.length ? `About ${fmtMin(due.length * 4)}. Reviews are shown blind and mixed across topics, so you practise recognising the pattern, not just executing it.` : "Completed items come back here right before you would forget them."}</p>
          </Link>
          <DailyPlay />
          <WarmUp />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between"><div className="eyebrow">Readiness by area</div><span className="num text-[13px] text-mute">{doneCount} / {total.length} items</span></div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {AREAS.filter((a) => s.settings.areas[a.id]).map((a) => {
              const its = total.filter((i) => i.area === a.id), d = its.filter((i) => s.progress[i.id]?.status === "done").length;
              const core = its.filter((i) => i.tier === 1), cd = core.filter((i) => s.progress[i.id]?.status === "done").length;
              return (
                <Link key={a.id} href={`/learn#${a.id}`} className="rounded-xl border border-line bg-panel2 p-4 transition hover:border-[#3a4160]">
                  <div className="flex items-center justify-between"><span className="font-semibold" style={{ color: a.color }}>{a.short}</span><span className="num text-[12px] text-mute">{d}/{its.length}</span></div>
                  <div className="mt-1 text-[12px] text-faint">{a.tag}</div>
                  <Bar className="mt-3" value={d / Math.max(1, its.length)} color={a.color} />
                  <div className="mt-2 text-[11.5px] text-mute">Must-know core: <span className="num font-semibold text-text">{cd}/{core.length}</span></div>
                </Link>
              );
            })}
          </div>
        </section>
        <section className="space-y-6">
          <div className="card p-5">
            <div className="eyebrow flex items-center gap-1.5"><CalendarClock size={13} />Last 14 days</div>
            <div className="mt-3 flex items-end gap-1.5">
              {Array.from({ length: 14 }, (_, i) => addDays(today, i - 13)).map((d) => {
                const m = s.activity[d]?.min ?? 0, h = Math.min(1, m / target);
                return <div key={d} title={`${d}: ${m} min`} className="flex h-16 flex-1 items-end rounded-md bg-[#151826]"><div className="w-full rounded-md" style={{ height: `${Math.max(m ? 12 : 0, h * 100)}%`, background: d === today ? "var(--color-accent)" : "var(--color-dsa)", opacity: 0.35 + h * 0.65 }} /></div>;
              })}
            </div>
          </div>
          {neglected ? (
            <Link href={`/learn/${neglected.t.id}`} className="card card-hover block p-5">
              <div className="eyebrow flex items-center gap-1.5 text-craft"><EyeOff size={13} />Blind spot</div>
              <div className="mt-2 flex items-center gap-2"><span className="font-semibold">{neglected.t.title}</span><AreaPill area={neglected.t.area} /></div>
              <p className="mt-1 text-[13px] leading-relaxed text-mute">{neglected.why} We drift toward what already feels good; ten minutes here is worth more than another favourite.</p>
            </Link>
          ) : (
            <Link href="/learn/biases" className="card card-hover block p-5">
              <div className="eyebrow flex items-center gap-1.5 text-craft"><Sparkles size={13} />Train honestly</div>
              <p className="mt-2 text-[13px] leading-relaxed text-mute">Recognising a solution is not the same as producing one. See the twelve traps this portal is built to counter.</p>
            </Link>
          )}
        </section>
      </div>
    </div>
  );
}
