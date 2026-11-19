"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Radar } from "lucide-react";
import { useStore } from "@/lib/store";
import { useItems, useTrackTime } from "@/lib/hooks";
import { TOPICS, areaOf, topicById } from "@/content";
import { XP } from "@/lib/gamify";
import Viz from "@/components/viz";
import { RatingBar } from "@/components/Work";
import { Flashcards } from "@/components/Flashcards";
import { References } from "@/components/References";
import { AreaPill, Button, DIFF, Empty, Md, Pill, cn, fmtMin } from "@/components/ui";
import type { Quiz, Topic } from "@/lib/types";

function QuizBlock({ quiz, onDone }: { quiz: Quiz[]; onDone: (score: number) => void }) {
  const [answers, setAnswers] = useState<(number | null)[]>(() => quiz.map(() => null));
  const addXp = useStore((s) => s.addXp);
  const answered = answers.filter((a) => a !== null).length;
  const correct = answers.filter((a, i) => a === quiz[i].answer).length;
  return (
    <section className="card p-5">
      <div className="flex items-center justify-between"><div><div className="eyebrow">Check yourself</div><div className="display text-[17px] font-semibold">Objective questions</div></div><span className="num text-[13px] text-mute">{correct}/{quiz.length} correct</span></div>
      <div className="mt-4 space-y-6">
        {quiz.map((q, qi) => (
          <div key={qi}>
            <p className="text-[15px] font-medium leading-snug">{qi + 1}. {q.q}</p>
            <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
              {q.options.map((o, i) => {
                const pick = answers[qi];
                const st = pick === null ? "idle" : i === q.answer ? "right" : i === pick ? "wrong" : "off";
                return <button key={i} disabled={pick !== null} onClick={() => { const next = answers.map((a, k) => (k === qi ? i : a)); setAnswers(next); if (i === q.answer) addXp(XP.quiz); if (next.every((a) => a !== null)) onDone(Math.round((next.filter((a, k) => a === quiz[k].answer).length / quiz.length) * 100)); }}
                  className={cn("rounded-xl border px-3.5 py-2.5 text-left text-[13.5px] transition", st === "idle" && "border-line bg-panel2 hover:border-[#3a4160]", st === "right" && "border-ok/60 bg-ok/10 text-ok", st === "wrong" && "border-bad/60 bg-bad/10 text-bad", st === "off" && "border-line opacity-45")}>{o}</button>;
              })}
            </div>
            {answers[qi] !== null && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 text-[13px] leading-relaxed text-mute">{q.why}</motion.p>}
          </div>
        ))}
      </div>
      {answered === quiz.length && <p className="mt-5 text-[13px] text-mute">{correct === quiz.length ? "Clean sweep." : "Re-read the parts you missed: the explanation matters more than the tick."}</p>}
    </section>
  );
}

export default function TopicPage() {
  const { id } = useParams<{ id: string }>();
  const t = topicById.get(id) as Topic | undefined;
  const items = useItems();
  const progress = useStore((s) => s.progress);
  const complete = useStore((s) => s.complete);
  const patch = useStore((s) => s.patch);
  const [showCode, setShowCode] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  useTrackTime();
  const item = useMemo(() => items.find((i) => i.id === `t-${id}`), [items, id]);
  const children = useMemo(() => items.filter((i) => i.topic === id && i.kind !== "topic"), [items, id]);
  if (!t || !item) return <Empty title="Topic not found"><Link href="/learn" className="text-accent underline">Back to the map</Link></Empty>;
  const a = areaOf(t.area);
  const idx = TOPICS.findIndex((x) => x.id === id), prev = TOPICS[idx - 1], next = TOPICS[idx + 1];
  const done = progress[item.id]?.status === "done";

  return (
    <article className="mx-auto max-w-4xl space-y-6">
      <Link href={`/learn#${t.area}`} className="inline-flex items-center gap-1.5 text-[13px] text-mute hover:text-text"><ArrowLeft size={14} />{a.name}</Link>
      <header className="animate-rise">
        <div className="mb-3 flex flex-wrap items-center gap-2"><AreaPill area={t.area} /><Pill className="border-line text-mute">{t.tier === 1 ? "Must know" : t.tier === 2 ? "Expected" : "Stretch"}</Pill><Pill className="border-line text-mute">{fmtMin(t.est)}</Pill>{done && <Pill color="var(--color-ok)"><Check size={12} />Completed</Pill>}</div>
        <h1 className="display text-3xl font-semibold sm:text-[2.5rem] sm:leading-[1.1]">{t.title}</h1>
        <p className="mt-3 text-[16px] leading-relaxed text-mute">{t.blurb}</p>
      </header>

      <section className="card p-5">
        <div className="eyebrow flex items-center gap-1.5" style={{ color: a.color }}><Radar size={13} />Reach for this when</div>
        <ul className="mt-3 space-y-2">{t.signals.map((s) => <li key={s} className="flex gap-2.5 text-[14.5px] leading-relaxed"><span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: a.color }} />{s}</li>)}</ul>
      </section>

      <Viz id={t.viz} />

      <section className="card p-6 sm:p-8"><Md className="text-[15.5px]">{t.lesson}</Md></section>

      {t.template && (
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5"><div><div className="eyebrow">Template</div><div className="text-[13px] text-mute">Try writing it from memory first.</div></div><Button size="sm" onClick={() => setShowCode((x) => !x)}>{showCode ? "Hide" : "Reveal code"}</Button></div>
          <AnimatePresence>{showCode && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden"><pre className="code !rounded-none !border-x-0 !border-b-0">{t.template}</pre></motion.div>}</AnimatePresence>
        </section>
      )}

      <References key={"r" + t.id} refs={t.refs} embed />

      <section className="card p-5">
        <div className="eyebrow flex items-center gap-1.5 text-warn"><AlertTriangle size={13} />Where candidates slip</div>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">{t.pitfalls.map((p) => <li key={p} className="rounded-xl border border-line bg-panel2 px-3.5 py-2.5 text-[13.5px] leading-relaxed">{p}</li>)}</ul>
      </section>

      {t.quiz.length > 0 && <QuizBlock key={t.id} quiz={t.quiz} onDone={(sc) => { setQuizScore(sc); patch(item.id, { score: sc, status: progress[item.id]?.status ?? "doing" }); }} />}
      {!!t.cards?.length && <Flashcards key={"c" + t.id} cards={t.cards!} />}

      {children.length > 0 && (
        <section>
          <h2 className="display mb-3 text-xl font-semibold">Practise it</h2>
          <div className="card divide-y divide-line overflow-hidden">
            {children.map((c) => {
              const d = progress[c.id]?.status === "done";
              const diff = c.kind === "problem" ? (c.est <= 20 ? "E" : c.est <= 35 ? "M" : "H") : null;
              return (
                <Link key={c.id} href={c.href} className="group flex items-center gap-3 px-5 py-3 transition hover:bg-white/[0.025]">
                  <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full border", d ? "border-ok bg-ok text-ink" : "border-line")}>{d && <Check size={13} />}</span>
                  <span className={cn("min-w-0 flex-1 truncate text-[14.5px] font-medium", d && "text-mute")}>{c.title}</span>
                  {c.tier === 1 && <span className="hidden text-[11px] text-faint sm:block">core</span>}
                  {diff ? <Pill color={DIFF[diff].color}>{DIFF[diff].label}</Pill> : <Pill className="border-line text-mute">{fmtMin(c.est)}</Pill>}
                  <ArrowRight size={15} className="text-faint transition group-hover:translate-x-1 group-hover:text-accent" />
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <RatingBar done={done} suggested={quizScore === null ? undefined : quizScore >= 100 ? 2 : quizScore >= 50 ? 1 : 0} onRate={(r) => complete(item, r, quizScore === null ? {} : { score: quizScore })} />

      <nav className="flex justify-between gap-3 pt-2">
        {prev ? <Link href={`/learn/${prev.id}`} className="card card-hover min-w-0 flex-1 p-4"><div className="text-[11.5px] text-faint">Previous</div><div className="truncate text-sm font-semibold">{prev.title}</div></Link> : <span className="flex-1" />}
        {next ? <Link href={`/learn/${next.id}`} className="card card-hover min-w-0 flex-1 p-4 text-right"><div className="text-[11.5px] text-faint">Next</div><div className="truncate text-sm font-semibold">{next.title}</div></Link> : <span className="flex-1" />}
      </nav>
    </article>
  );
}
