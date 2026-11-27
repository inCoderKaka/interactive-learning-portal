"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, ArrowLeft, ArrowRight, BookOpen, Check, ChevronDown, HelpCircle, Library, NotebookPen, Radar } from "lucide-react";
import { useStore } from "@/lib/store";
import { useItems, useTrackTime } from "@/lib/hooks";
import { PAGE_ORDER, areaOf, problemById, subsOf, topicById } from "@/content";
import { XP } from "@/lib/gamify";
import Viz from "@/components/viz";
import { RatingBar } from "@/components/Work";
import { Flashcards } from "@/components/Flashcards";
import { RefLink, References } from "@/components/References";
import { VideoLibrary, type LibProblem } from "@/components/VideoLibrary";
import { Exercises } from "@/components/Exercises";
import { GlossaryArea } from "@/components/Glossary";
import { ReviseView } from "@/components/Revise";
import { useDeepTopic } from "@/lib/deep";
import { TreeLayout } from "@/components/tree/TreeRail";
import { AreaPill, Button, DIFF, Empty, Md, Pill, cn, fmtMin } from "@/components/ui";
import { Lesson } from "@/components/Lesson";
import { TopicPlay } from "@/components/play/TopicPlay";
import { ImportedNotes } from "@/components/notes/ImportedNotes";
import { ReadingProgress, popFrom } from "@/components/Juice";
import { ListenButton, ReadScope } from "@/components/reader/Reader";
import { sleep, until, useReadable, type ReadStep } from "@/lib/reader/registry";
import type { Item, Problem, Quiz, Topic } from "@/lib/types";

const LETTER = ["A", "B", "C", "D", "E", "F"];

function QuizBlock({ quiz, onDone }: { quiz: Quiz[]; onDone: (score: number) => void }) {
  const [answers, setAnswers] = useState<(number | null)[]>(() => quiz.map(() => null));
  const addXp = useStore((s) => s.addXp);
  const answered = answers.filter((a) => a !== null).length;
  const correct = answers.filter((a, i) => a === quiz[i].answer).length;
  const live = useRef(answers);
  live.current = answers;
  // the reader asks each question, waits for the learner's pick (or pauses and tells), then explains
  const readRef = useReadable<HTMLElement>((ctx) => {
    const root = () => document.querySelector("[data-quiz]");
    const steps: ReadStep[] = [{ say: `Time for a quick check: ${quiz.length} question${quiz.length > 1 ? "s" : ""}.`, focus: root }];
    quiz.forEach((q, qi) => {
      const qEl = () => document.querySelector(`[data-q="${qi}"]`);
      const opts = q.options.map((o, k) => `${LETTER[k]}: ${o}`).join("; ");
      steps.push({ say: `Question ${qi + 1}. ${q.q} Is it ${opts}?`, focus: qEl });
      if (ctx.quiz === "wait" && live.current[qi] === null) {
        steps.push({ say: "Pick your answer.", focus: qEl, waitLabel: "Your turn: pick an answer, or press skip", waitFor: (sig) => until(() => live.current[qi] !== null, sig) });
        steps.push({
          get say() {
            const pick = live.current[qi];
            if (pick === null) return `The answer is ${LETTER[q.answer]}: ${q.options[q.answer]}. ${q.why}`;
            return `${pick === q.answer ? "Correct!" : `Not quite. The answer is ${LETTER[q.answer]}: ${q.options[q.answer]}.`} ${q.why}`;
          },
          focus: () => document.querySelector(`[data-q="${qi}"] [data-opt="${q.answer}"]`) ?? qEl(), pause: 500,
        });
      } else {
        steps.push({ say: live.current[qi] === null ? "Think about it for a moment." : "", focus: qEl, pause: live.current[qi] === null ? 2600 : 0 });
        steps.push({ say: `The answer is ${LETTER[q.answer]}: ${q.options[q.answer]}. ${q.why}`, focus: () => document.querySelector(`[data-q="${qi}"] [data-opt="${q.answer}"]`) ?? qEl(), pause: 500 });
      }
    });
    return steps.filter((x) => x.say || x.waitFor || x.pause);
  });
  return (
    <section ref={readRef} data-read-block data-quiz className="card p-5">
      <div className="flex items-center justify-between"><div><div className="eyebrow">Check yourself</div><div className="display text-[17px] font-semibold">Objective questions</div></div><span className="num text-[13px] text-mute">{correct}/{quiz.length} correct</span></div>
      <div className="mt-4 space-y-6">
        {quiz.map((q, qi) => (
          <div key={qi} data-q={qi}>
            <p className="text-[15px] font-medium leading-snug">{qi + 1}. {q.q}</p>
            <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
              {q.options.map((o, i) => {
                const pick = answers[qi];
                const st = pick === null ? "idle" : i === q.answer ? "right" : i === pick ? "wrong" : "off";
                return <button key={i} data-opt={i} disabled={pick !== null} onClick={(e) => { if (i === q.answer) popFrom(e.currentTarget); const next = answers.map((a, k) => (k === qi ? i : a)); setAnswers(next); if (i === q.answer) addXp(XP.quiz); if (next.every((a) => a !== null)) onDone(Math.round((next.filter((a, k) => a === quiz[k].answer).length / quiz.length) * 100)); }}
                  className={cn("rounded-xl border px-3.5 py-2.5 text-left text-[13.5px] transition", st === "idle" && "border-line bg-panel2 hover:border-[#3a4160]", st === "right" && "border-ok/60 bg-ok/10 text-ok", st === "wrong" && "animate-shake border-bad/60 bg-bad/10 text-bad", st === "off" && "border-line opacity-45")}>{o}</button>;
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


/** Learn / Revise, kept in the URL hash so the tree can link straight to a sheet. */
function useMode(): ["learn" | "revise", (m: "learn" | "revise") => void] {
  const [mode, set] = useState<"learn" | "revise">("learn");
  useEffect(() => {
    const read = () => set(location.hash === "#revise" ? "revise" : "learn");
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  const setMode = (m: "learn" | "revise") => { history.replaceState(null, "", m === "revise" ? "#revise" : location.pathname); set(m); window.scrollTo({ top: 0, behavior: "smooth" }); };
  return [mode, setMode];
}

function Doubts({ doubts, math, color }: { doubts: [string, string][]; math?: boolean; color: string }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="card p-5">
      <div className="eyebrow flex items-center gap-1.5" style={{ color }}><HelpCircle size={13} />Common doubts</div>
      <p className="mt-1 text-[13px] text-mute">The questions learners actually get stuck on. Try answering each before you open it.</p>
      <div className="mt-3 divide-y divide-line overflow-hidden rounded-xl border border-line">
        {doubts.map(([q, a], i) => (
          <div key={i} data-read-block data-read-text={`${q} ${a.replace(/[`*_#>]/g, "")}`}>
            <button onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i} className="flex w-full items-start gap-3 px-4 py-3 text-left text-[14.5px] font-medium transition hover:bg-white/[0.02]">
              <span className="flex-1">{q}</span><ChevronDown size={16} className={cn("mt-1 shrink-0 text-faint transition", open === i && "rotate-180")} />
            </button>
            <AnimatePresence initial={false}>
              {open === i && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden"><Md math={math} className="px-4 pb-4 text-[14.5px]">{a}</Md></motion.div>}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </section>
  );
}

function Practice({ list, progress, title = "Practise it", extra = [] }: { list: { id: string; title: string; href: string; tier: number; est: number; kind: string }[]; progress: Record<string, { status?: string }>; title?: string; extra?: Problem[] }) {
  const [more, setMore] = useState(false);
  if (!list.length && !extra.length) return null;
  const listed = list.slice(0, 3).map((c) => c.title);
  return (
    <section data-read-block data-read-text={`To practise, there ${list.length === 1 ? "is one exercise" : `are ${list.length} exercises`}: ${listed.join(", ")}${list.length > 3 ? ", and more" : ""}.`}>
      <h2 className="display mb-3 text-xl font-semibold">{title}</h2>
      <div className="card divide-y divide-line overflow-hidden">
        {list.map((c) => {
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
        {extra.length > 0 && (
          <div>
            <button onClick={() => setMore((m) => !m)} aria-expanded={more} className="flex w-full items-center gap-3 px-5 py-3 text-left text-[13.5px] text-mute transition hover:bg-white/[0.025] hover:text-text">
              <Library size={15} /><span className="flex-1">More practice: {extra.length} LeetCode problems with video walkthroughs <span className="text-faint">(outside the plan until you start one)</span></span><ChevronDown size={15} className={cn("transition", more && "rotate-180")} />
            </button>
            {more && (
              <div className="grid gap-x-4 border-t border-line px-5 py-3 sm:grid-cols-2">
                {extra.map((p) => {
                  const d = progress[p.id]?.status === "done";
                  return <Link key={p.id} href={`/problem/${p.id}`} className="flex items-center gap-2 py-1 text-[13px] hover:text-accent"><span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: DIFF[p.diff].color }} /><span className={cn("truncate", d && "text-mute line-through")}><span className="num text-faint">{p.lc}.</span> {p.title}</span>{p.premium && <span className="text-[10px] text-warn">Premium</span>}</Link>;
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

const libOf = (ps: Problem[]): LibProblem[] => ps.filter((p) => p.lc).map((p) => ({ id: p.id, title: p.title, lc: p.lc!, diff: p.diff, extra: p.extra }));

export default function TopicPage() {
  const { id } = useParams<{ id: string }>();
  const base = topicById.get(id) as Topic | undefined;
  const loaded = useDeepTopic(base);
  return loaded === null ? <TreeLayout current={id}><div className="space-y-4" aria-busy><div className="h-10 w-2/3 animate-pulse-soft rounded-xl bg-panel2" /><div className="h-5 w-full animate-pulse-soft rounded-lg bg-panel2" /><div className="card h-64 animate-pulse-soft" /></div></TreeLayout> : <TopicBody key={id} id={id} t={loaded} />;
}

function TopicBody({ id, t }: { id: string; t: Topic | undefined }) {
  const items = useItems();
  const progress = useStore((s) => s.progress);
  const complete = useStore((s) => s.complete);
  const patch = useStore((s) => s.patch);
  const [showCode, setShowCode] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [mode, setMode] = useMode();
  const preRef = useRef<HTMLPreElement>(null);
  useTrackTime();
  const templateRead = useReadable<HTMLElement>(async (ctx) => {
    if (!t?.template) return [];
    const intro: ReadStep = { say: ctx.interact ? "Here's the template. Try writing it from memory first; I'll reveal it now." : "There's a code template here. Try writing it from memory, then reveal it.", act: () => setShowCode(true), settle: 450, focus: () => document.querySelector("[data-template]") };
    if (!ctx.interact && !showCode) return [intro];
    await sleep(0);
    return [intro, ...(await ctx.code(t.template, "", () => preRef.current))];
  });
  const item = useMemo(() => items.find((i) => i.id === `t-${id}`), [items, id]) as Item | undefined;
  const chapterId = t?.chapter ?? id;
  const subs = useMemo(() => (t && !t.chapter ? subsOf(t.id) : []), [t]);
  const allProblems = useMemo(() => [...problemById.values()].filter((p) => p.topic === chapterId), [chapterId]);
  // practice on this page: a subtopic lists its own problems; a chapter lists what no subtopic claims, plus designs
  const mine = useMemo(() => (t?.chapter ? allProblems.filter((p) => p.sub === id) : allProblems.filter((p) => !p.sub || !subs.some((s) => s.id === p.sub))), [t, allProblems, id, subs]);
  const children = useMemo(() => {
    const ids = new Set(mine.filter((p) => !p.extra).map((p) => p.id));
    return items.filter((i) => i.topic === chapterId && i.kind !== "topic" && (ids.has(i.id) || (!t?.chapter && i.kind === "design")));
  }, [items, mine, chapterId, t]);
  const extras = useMemo(() => mine.filter((p) => p.extra && !children.some((c) => c.id === p.id)).sort((a, b) => a.lc! - b.lc!), [mine, children]);

  if (!t || !item) return <Empty title="Topic not found"><Link href="/learn" className="text-accent underline">Back to the map</Link></Empty>;
  const a = areaOf(t.area);
  const chapter = t.chapter ? topicById.get(t.chapter) : undefined;
  const idx = PAGE_ORDER.findIndex((x) => x.id === id), prev = PAGE_ORDER[idx - 1], next = PAGE_ORDER[idx + 1];
  const done = progress[item.id]?.status === "done";
  const math = t.area === "ai";
  const isSub = !!t.chapter;
  const canRevise = isSub ? !!t.revise : !subs.length;

  return (
    <GlossaryArea area={t.area}>
    <TreeLayout current={id}>
    <article>
     <ReadingProgress color={a.color} />
     <ReadScope className="space-y-6">
      <div data-read-skip className="flex flex-wrap items-center gap-1.5 text-[13px] text-mute">
        <Link href={`/learn#${t.area}`} className="inline-flex items-center gap-1.5 hover:text-text"><ArrowLeft size={14} />{a.name}</Link>
        {chapter && <><span className="text-faint">/</span><Link href={`/learn/${chapter.id}`} className="hover:text-text">{chapter.title}</Link></>}
      </div>
      <header className="animate-rise">
        <div data-read-skip className="mb-3 flex flex-wrap items-center gap-2"><AreaPill area={t.area} /><Pill className="border-line text-mute">{t.tier === 1 ? "Must know" : t.tier === 2 ? "Expected" : "Stretch"}</Pill><Pill className="border-line text-mute">{fmtMin(t.est)}</Pill>{subs.length > 0 && <Pill className="border-line text-mute">{subs.length} pages</Pill>}{done && <Pill color="var(--color-ok)"><Check size={12} />Completed</Pill>}<ListenButton className="ml-auto" /></div>
        <h1 data-read-block data-read-kind="heading" data-read-title className="display text-3xl font-semibold sm:text-[2.5rem] sm:leading-[1.1]">{t.title}</h1>
        <p data-read-block className="mt-3 text-[16px] leading-relaxed text-mute">{t.blurb}</p>
        {canRevise && (
          <div data-read-skip className="mt-4 inline-flex rounded-xl border border-line p-1" role="tablist" aria-label="Learn or revise">
            {(["learn", "revise"] as const).map((m) => (
              <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={cn("flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[13.5px] font-medium transition", mode === m ? "bg-panel2 text-text" : "text-mute hover:text-text")}>
                {m === "learn" ? <BookOpen size={14} /> : <NotebookPen size={14} />}{m === "learn" ? "Learn" : "Revise"}
              </button>
            ))}
          </div>
        )}
      </header>

      {mode === "revise" && canRevise ? <ReviseView t={t} item={item} /> : <>
      <section data-read-block className="card p-5">
        <div className="eyebrow flex items-center gap-1.5" style={{ color: a.color }}><Radar size={13} />Reach for this when</div>
        <ul className="mt-3 space-y-2">{t.signals.map((s) => <li key={s} className="flex gap-2.5 text-[14.5px] leading-relaxed"><span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: a.color }} />{s}</li>)}</ul>
      </section>

      {subs.length > 0 && (
        <section data-read-block data-read-text={`This chapter has ${subs.length} pages: ${subs.map((s) => s.title).join(", ")}.`}>
          <h2 className="display mb-3 text-xl font-semibold">In this chapter</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {subs.map((s, k) => {
              const d = progress[`t-${s.id}`]?.status === "done";
              return (
                <Link key={s.id} href={`/learn/${s.id}`} className="card card-hover group flex gap-3 p-4">
                  <span className={cn("num grid h-8 w-8 shrink-0 place-items-center rounded-lg border text-[13px] font-semibold", d ? "border-ok bg-ok text-ink" : "border-line text-mute")} style={d ? undefined : { color: a.color }}>{d ? <Check size={14} /> : k + 1}</span>
                  <span className="min-w-0"><span className="block font-semibold leading-snug">{s.title}</span><span className="mt-1 line-clamp-2 block text-[12.5px] text-mute">{s.blurb}</span><span className="mt-1.5 block text-[11px] text-faint">{fmtMin(s.est)}{s.tier === 3 ? " · stretch" : ""}</span></span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {!(t.viz && t.lesson.includes(`[[widget:${t.viz}]]`)) && <Viz id={t.viz} />}
      {t.widgets?.filter((w) => !t.lesson.includes(`[[widget:${w}]]`)).map((w) => <Viz key={w} id={w} />)}

      <section className="card p-6 sm:p-8">
        {subs.length > 0 && <div data-read-skip className="eyebrow mb-3">Chapter overview · the summary the pages above expand</div>}
        <Lesson text={t.lesson} math={math} className="text-[15.5px]" />
      </section>

      {!!t.doubts?.length && <Doubts doubts={t.doubts} math={math} color={a.color} />}

      {!!t.exercises?.length && <Exercises key={"x" + t.id} list={t.exercises} color={a.color} />}

      {t.template && (
        <section ref={templateRead} data-read-block data-template className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5"><div><div className="eyebrow">Template</div><div className="text-[13px] text-mute">Try writing it from memory first.</div></div><Button size="sm" onClick={() => setShowCode((x) => !x)}>{showCode ? "Hide" : "Reveal code"}</Button></div>
          <AnimatePresence>{showCode && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden"><pre ref={preRef} className="code !rounded-none !border-x-0 !border-b-0">{t.template}</pre></motion.div>}</AnimatePresence>
        </section>
      )}

      <ImportedNotes key={"n" + t.id} topicId={t.id} color={a.color} />

      {!isSub && <TopicPlay key={"p" + t.id} topicId={t.id} color={a.color} />}

      <VideoLibrary key={"v" + t.id} pages={[t.id]} problems={libOf(mine)} color={a.color} />

      {!!t.sources?.length && (
        <section data-read-block data-read-text={`There are ${t.sources.length} primary sources listed for going deeper.`} className="card p-5">
          <div className="eyebrow">Primary sources</div>
          <p className="mt-1 text-[13px] text-mute">Papers, textbook chapters and official documentation behind this page.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">{t.sources.map((r) => <RefLink key={r.url} r={r} />)}</div>
        </section>
      )}

      {!!t.refs?.length && (
        <div data-read-block data-read-text={`To go deeper, there ${t.refs.length === 1 ? "is one reference" : `are ${t.refs.length} references`} below, starting with ${t.refs[0].title} by ${t.refs[0].by}.`}>
          <References key={"r" + t.id} refs={t.refs} embed />
        </div>
      )}

      <section data-read-block className="card p-5">
        <div className="eyebrow flex items-center gap-1.5 text-warn"><AlertTriangle size={13} />Where candidates slip</div>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">{t.pitfalls.map((p) => <li key={p} className="rounded-xl border border-line bg-panel2 px-3.5 py-2.5 text-[13.5px] leading-relaxed">{p}</li>)}</ul>
      </section>

      {t.quiz.length > 0 && <QuizBlock key={t.id} quiz={t.quiz} onDone={(sc) => { setQuizScore(sc); patch(item.id, { score: sc, status: progress[item.id]?.status ?? "doing" }); }} />}
      {!!t.cards?.length && <Flashcards key={"c" + t.id} cards={t.cards!} />}

      <Practice list={children} progress={progress} extra={extras} title={subs.length ? "Practise the chapter" : "Practise it"} />
      {(() => {
        const rel = (t.featured ?? []).map((n) => problemById.get(`p-${n}`)).filter((p): p is Problem => !!p && p.sub !== t.id && p.topic !== chapterId);
        return rel.length > 0 && (
          <div data-read-skip className="flex flex-wrap items-center gap-1.5 text-[12.5px]">
            <span className="text-faint">Related practice on other pages:</span>
            {rel.map((p) => <Link key={p.id} href={`/problem/${p.id}`} className="rounded-lg border border-line px-2.5 py-1 text-mute hover:border-accent/50 hover:text-text"><span className="num text-faint">{p.lc}.</span> {p.title}</Link>)}
          </div>
        );
      })()}

      <div data-read-skip><RatingBar done={done} suggested={quizScore === null ? undefined : quizScore >= 100 ? 2 : quizScore >= 50 ? 1 : 0} onRate={(r) => complete(item, r, quizScore === null ? {} : { score: quizScore })} /></div>
      </>}

      <nav data-read-skip data-read-next={next ? `/learn/${next.id}` : undefined} data-read-next-title={next?.title} className="flex justify-between gap-3 pt-2">
        {prev ? <Link href={`/learn/${prev.id}${mode === "revise" && (prev.revise || !subsOf(prev.id).length) ? "#revise" : ""}`} className="card card-hover min-w-0 flex-1 p-4"><div className="text-[11.5px] text-faint">Previous</div><div className="truncate text-sm font-semibold">{prev.title}</div></Link> : <span className="flex-1" />}
        {next ? <Link href={`/learn/${next.id}${mode === "revise" && (next.revise || !subsOf(next.id).length) ? "#revise" : ""}`} className="card card-hover min-w-0 flex-1 p-4 text-right"><div className="text-[11.5px] text-faint">Next</div><div className="truncate text-sm font-semibold">{next.title}</div></Link> : <span className="flex-1" />}
      </nav>
     </ReadScope>
    </article>
    </TreeLayout>
    </GlossaryArea>
  );
}
