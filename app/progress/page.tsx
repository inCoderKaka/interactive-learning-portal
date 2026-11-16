"use client";
import Link from "next/link";
import { useMemo } from "react";
import { motion } from "motion/react";
import { Award, Clock, Flame, Gauge, Lock, Scale, ShieldCheck, Sparkles, Target } from "lucide-react";
import { useStore, selectXp } from "@/lib/store";
import { useItems } from "@/lib/hooks";
import { badges, levelOf, streakOf } from "@/lib/gamify";
import { addDays, todayISO } from "@/lib/srs";
import { AREAS, TOPICS, areaOf } from "@/content";
import { Bar, PageHead, Pill, Ring, cn, fmtMin } from "@/components/ui";

function Stat({ icon: Icon, label, value, sub, color }: { icon: typeof Award; label: string; value: React.ReactNode; sub?: string; color: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-mute"><Icon size={14} style={{ color }} />{label}</div>
      <div className="display num mt-2 text-3xl font-semibold">{value}</div>
      {sub && <div className="mt-0.5 text-[12.5px] text-faint">{sub}</div>}
    </div>
  );
}

export default function ProgressPage() {
  const progress = useStore((s) => s.progress);
  const activity = useStore((s) => s.activity);
  const attempts = useStore((s) => s.attempts);
  const settings = useStore((s) => s.settings);
  const xp = useStore(selectXp);
  const items = useItems();
  const today = todayISO();

  const lvl = levelOf(xp), streak = streakOf(activity);
  const totalMin = Object.values(activity).reduce((a, d) => a + (d.min || 0), 0);
  const active = items.filter((i) => settings.areas[i.area]);
  const done = active.filter((i) => progress[i.id]?.status === "done");
  const bs = useMemo(() => badges(progress, activity, items), [progress, activity, items]);

  // a year of activity, columns = weeks, rows = Sun..Sat
  const weeks = useMemo(() => {
    const end = new Date(today + "T12:00:00");
    const start = addDays(today, -(51 * 7 + end.getDay()));
    return Array.from({ length: 52 }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)));
  }, [today]);
  const target = Math.max(30, settings.hoursPerDay * 60);

  const topics = useMemo(() => TOPICS.filter((t) => settings.areas[t.area]).map((t) => {
    const its = items.filter((i) => i.topic === t.id);
    const d = its.filter((i) => progress[i.id]?.status === "done");
    const sc = its.map((i) => progress[i.id]?.score).filter((x): x is number => x != null);
    const lapses = its.reduce((a, i) => a + (progress[i.id]?.lapses ?? 0), 0);
    return { t, total: its.length, done: d.length, avg: sc.length ? Math.round(sc.reduce((a, b) => a + b, 0) / sc.length) : null, lapses };
  }), [items, progress, settings.areas]);

  // calibration: predicted confidence (1-5) against the score that followed
  const calib = useMemo(() => {
    const rows = Object.values(progress).filter((p) => p.conf && p.score != null);
    const buckets = [1, 2, 3, 4, 5].map((c) => { const r = rows.filter((p) => p.conf === c); return { c, n: r.length, avg: r.length ? Math.round(r.reduce((a, p) => a + p.score!, 0) / r.length) : null }; });
    const gap = rows.length ? Math.round(rows.reduce((a, p) => a + (p.conf! * 20 - p.score!), 0) / rows.length) : null;
    return { buckets, gap, n: rows.length };
  }, [progress]);

  // balance: where the time actually went versus what the loop weighs
  const balance = useMemo(() => {
    const WEIGHT = { dsa: 0.55, hld: 0.22, lld: 0.15, craft: 0.08 };
    const spent = { dsa: 0, hld: 0, lld: 0, craft: 0 };
    for (const i of done) spent[i.area] += i.est;
    const sum = Object.values(spent).reduce((a, b) => a + b, 0);
    const on = AREAS.filter((a) => settings.areas[a.id]);
    const wsum = on.reduce((a, x) => a + WEIGHT[x.id], 0);
    return on.map((a) => ({ a, share: sum ? spent[a.id] / sum : 0, want: WEIGHT[a.id] / wsum }));
  }, [done, settings.areas]);
  const problems = active.filter((i) => i.kind === "problem");
  const byDiff = (lo: number, hi: number) => { const p = problems.filter((i) => i.est > lo && i.est <= hi); return { n: p.length, d: p.filter((i) => progress[i.id]?.status === "done").length }; };
  const easy = byDiff(0, 20), med = byDiff(20, 35), hard = byDiff(35, 99);
  const avoidHard = hard.n > 0 && done.length >= 10 && hard.d / hard.n < (easy.d / Math.max(1, easy.n)) * 0.4;

  const core = active.filter((i) => i.tier === 1);
  const coreLeft = core.filter((i) => progress[i.id]?.status !== "done");
  const weakest = topics.filter((x) => x.avg !== null || x.lapses > 0).sort((a, b) => (a.avg ?? 100) - b.lapses * 5 - ((b.avg ?? 100) - a.lapses * 5)).slice(0, 5);
  const recent = attempts.filter((a) => a.score != null).slice(0, 8);

  return (
    <div className="space-y-6">
      <PageHead eyebrow="Evidence, not feelings" title="Progress" sub="Everything here is measured from what you actually did: time on task, review outcomes, and AI scores against your own predictions." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card flex items-center gap-4 p-5">
          <Ring value={lvl.pct} size={72} stroke={6}><span className="text-lg">{lvl.level}</span></Ring>
          <div><div className="text-[12px] font-semibold uppercase tracking-wider text-mute">Level</div><div className="display text-xl font-semibold">{lvl.rank}</div><div className="num text-[12.5px] text-faint">{xp} XP · {lvl.next - xp} to next</div></div>
        </div>
        <Stat icon={Flame} label="Streak" value={<>{streak.cur}<span className="text-base text-mute"> days</span></>} sub={`Best ${streak.best} · ${streak.doneToday ? "today counted" : "nothing logged today yet"}`} color="var(--color-lld)" />
        <Stat icon={Clock} label="Time on task" value={fmtMin(totalMin)} sub="Only counted while the tab is visible" color="var(--color-hld)" />
        <Stat icon={Target} label="Completed" value={<>{done.length}<span className="text-base text-mute"> / {active.length}</span></>} sub={`${core.length - coreLeft.length} of ${core.length} must-know items`} color="var(--color-accent)" />
      </div>

      <section className="card p-5">
        <div className="flex items-center justify-between"><div className="eyebrow">Last 12 months</div><div className="flex items-center gap-1.5 text-[11px] text-faint">less{[0.12, 0.35, 0.6, 1].map((o) => <span key={o} className="h-3 w-3 rounded-[3px] bg-accent" style={{ opacity: o }} />)}more</div></div>
        <div className="mt-4 grid grid-flow-col auto-cols-fr gap-[3px] sm:gap-[5px]">
          {weeks.map((w, wi) => (
            <div key={wi} className="grid gap-[3px] sm:gap-[5px]">
              {w.map((d) => {
                const m = activity[d]?.min ?? 0, future = d > today;
                return <div key={d} title={future ? d : `${d}: ${m} min, ${activity[d]?.done ?? 0} completed`} className={cn("aspect-square w-full rounded-[2px] sm:rounded-[4px]", future ? "bg-transparent" : m ? "bg-accent" : "bg-[#171a26]", d === today && "ring-1 ring-text/60")} style={m && !future ? { opacity: 0.2 + Math.min(1, m / target) * 0.8 } : undefined} />;
              })}
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <div className="eyebrow flex items-center gap-1.5 text-hld"><Gauge size={13} />Calibration: do you know what you know?</div>
          {calib.n < 3 ? <p className="mt-3 text-[13.5px] leading-relaxed text-mute">Pick a confidence level before each attempt and get it reviewed. After a few, this chart shows whether your gut feeling matches the result, which is the bias that costs candidates the most.</p> : (
            <>
              <div className="mt-4 flex h-40 items-end gap-3">
                {calib.buckets.map((b) => (
                  <div key={b.c} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                    <span className="num text-[11px] text-mute">{b.avg ?? ""}</span>
                    <div className="relative w-full flex-1 rounded-lg bg-[#151826]">
                      <div className="absolute inset-x-0 border-t border-dashed border-faint" style={{ bottom: `${b.c * 20}%` }} title="A perfectly calibrated score" />
                      {b.avg !== null && <motion.div initial={{ height: 0 }} animate={{ height: `${b.avg}%` }} className="absolute inset-x-0 bottom-0 rounded-lg" style={{ background: Math.abs(b.avg - b.c * 20) <= 20 ? "var(--color-ok)" : b.avg < b.c * 20 ? "var(--color-bad)" : "var(--color-hld)", opacity: 0.8 }} />}
                    </div>
                    <span className="num text-[11.5px] text-faint">{b.c}/5 · {b.n}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-mute">Bars are your average score at each confidence level; the dashed line is where a calibrated learner lands. {calib.gap! > 12 ? <b className="text-bad">You run about {calib.gap} points overconfident: slow down and test more edge cases before saying “done”.</b> : calib.gap! < -12 ? <b className="text-hld">You underrate yourself by about {-calib.gap!} points. Commit to answers faster.</b> : <b className="text-ok">Your predictions are well calibrated.</b>}</p>
            </>
          )}
        </section>

        <section className="card p-5">
          <div className="eyebrow flex items-center gap-1.5 text-craft"><Scale size={13} />Balance: are you avoiding something?</div>
          <div className="mt-4 space-y-3.5">
            {balance.map(({ a, share, want }) => (
              <div key={a.id}>
                <div className="mb-1 flex justify-between text-[12.5px]"><span style={{ color: a.color }} className="font-semibold">{a.short}</span><span className="num text-mute">{Math.round(share * 100)}% of your effort · loop weight {Math.round(want * 100)}%</span></div>
                <div className="relative"><Bar value={share} color={a.color} /><span className="absolute -top-0.5 h-2.5 w-0.5 bg-text" style={{ left: `${want * 100}%` }} /></div>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[12px]">
            {[["Easy", easy, "var(--color-ok)"], ["Medium", med, "var(--color-warn)"], ["Hard", hard, "var(--color-bad)"]].map(([l, v, c]) => { const x = v as { n: number; d: number }; return <div key={l as string} className="rounded-xl border border-line bg-panel2 py-2"><div className="num text-base font-semibold" style={{ color: c as string }}>{x.d}/{x.n}</div><div className="text-faint">{l as string}</div></div>; })}
          </div>
          {avoidHard && <p className="mt-3 text-[13px] text-warn">You are finishing easy problems far faster than hard ones. Google rounds sit at medium to hard: schedule one hard problem next.</p>}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="card p-5">
          <div className="eyebrow">Mastery by topic</div>
          <div className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {topics.filter((x) => x.total > 0).map(({ t, total, done: d, avg }) => (
              <Link key={t.id} href={`/learn/${t.id}`} className="group block">
                <div className="mb-1 flex items-center justify-between gap-2 text-[12.5px]"><span className="truncate text-[#d5d8e6] group-hover:text-accent">{t.title}</span><span className="num shrink-0 text-faint">{avg !== null && <span className={cn("mr-2", avg >= 70 ? "text-ok" : avg >= 45 ? "text-warn" : "text-bad")}>{avg}</span>}{d}/{total}</span></div>
                <Bar value={d / total} color={areaOf(t.area).color} />
              </Link>
            ))}
          </div>
        </section>

        <div className="space-y-6">
          <section className="card p-5">
            <div className="eyebrow flex items-center gap-1.5 text-accent"><ShieldCheck size={13} />Coverage audit</div>
            <div className="display mt-2 text-xl font-semibold">{coreLeft.length ? `${coreLeft.length} must-know item${coreLeft.length > 1 ? "s" : ""} open` : "Every must-know item is covered"}</div>
            <ul className="mt-3 space-y-1.5">
              {coreLeft.slice(0, 6).map((i) => <li key={i.id}><Link href={i.href} className="flex items-center gap-2 text-[13.5px] text-mute hover:text-text"><span className="h-1.5 w-1.5 rounded-full" style={{ background: areaOf(i.area).color }} /><span className="truncate">{i.title}</span></Link></li>)}
            </ul>
            {coreLeft.length > 6 && <Link href="/roadmap" className="mt-2 block text-[12.5px] text-accent">and {coreLeft.length - 6} more on the roadmap →</Link>}
          </section>
          {weakest.length > 0 && (
            <section className="card p-5">
              <div className="eyebrow text-warn">Weakest by evidence</div>
              <ul className="mt-3 space-y-2">
                {weakest.map(({ t, avg, lapses }) => <li key={t.id}><Link href={`/learn/${t.id}`} className="flex items-center justify-between gap-2 text-[13.5px] hover:text-accent"><span className="truncate">{t.title}</span><span className="num shrink-0 text-[12px] text-faint">{avg !== null ? `score ${avg}` : ""}{lapses ? ` · forgot ${lapses}×` : ""}</span></Link></li>)}
              </ul>
            </section>
          )}
        </div>
      </div>

      <section className="card p-5">
        <div className="eyebrow flex items-center gap-1.5"><Award size={13} />Badges · {bs.filter((b) => b.got).length} of {bs.length}</div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {bs.map((b, i) => (
            <motion.div key={b.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }} title={b.desc}
              className={cn("rounded-2xl border p-3 text-center", b.got ? "border-accent/40 bg-accent/5" : "border-line opacity-55")}>
              <div className={cn("mx-auto grid h-10 w-10 place-items-center rounded-full", b.got ? "bg-accent text-ink" : "bg-panel2 text-faint")}>{b.got ? <Sparkles size={17} /> : <Lock size={15} />}</div>
              <div className="mt-2 text-[12.5px] font-semibold leading-tight">{b.name}</div>
              <div className="mt-0.5 text-[10.5px] leading-snug text-faint">{b.desc}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {recent.length > 0 && (
        <section className="card overflow-hidden">
          <div className="eyebrow px-5 pt-5">Recent AI reviews</div>
          <ul className="mt-3 divide-y divide-line">
            {recent.map((a) => {
              const it = items.find((i) => i.id === a.item);
              return (
                <li key={a.id}><Link href={it?.href ?? "/mock"} className="flex items-center gap-3 px-5 py-3 text-[13.5px] hover:bg-white/[0.025]">
                  <span className={cn("num w-9 font-semibold", a.score! >= 70 ? "text-ok" : a.score! >= 45 ? "text-warn" : "text-bad")}>{a.score}</span>
                  <span className="min-w-0 flex-1 truncate">{it?.title ?? a.item}</span>
                  <Pill className="border-line text-mute">{a.kind.replace(/^stage:/, "stage · ").replace(/^mock:/, "mock · ")}</Pill>
                  <span className="hidden text-[12px] text-faint sm:block">{new Date(a.at).toLocaleDateString()}</span>
                </Link></li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
