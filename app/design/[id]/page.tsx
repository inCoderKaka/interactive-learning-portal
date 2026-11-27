"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, ArrowLeft, ArrowRight, BookOpen, Check, ChevronDown, Compass, Eye, GitBranch, ListOrdered, Sparkles, TimerReset, TrendingUp } from "lucide-react";
import { useStore } from "@/lib/store";
import { useItems, useStopwatch, useTrackTime } from "@/lib/hooks";
import { aiReady, gradeStage } from "@/lib/ai";
import { areaOf, designById, topicById } from "@/content";
import { References } from "@/components/References";
import { DesignVideos } from "@/components/VideoLibrary";
import { PathsMap } from "@/components/interview/PathsMap";
import { interviewById, isUnlocked, missing, mockHref } from "@/lib/interviews";
import { Mic } from "lucide-react";
import { ConfidencePick, FeedbackView, NeedAI, RatingBar, Spinner } from "@/components/Work";
import { AreaPill, Button, Empty, Md, Pill, btnClass, cn, fmtClock, fmtMin } from "@/components/ui";
import type { Feedback } from "@/lib/types";

const Loading = () => <div className="grid h-[420px] place-items-center text-sm text-faint animate-pulse-soft">Drawing the diagram…</div>;
const ArchCanvas = dynamic(() => import("@/components/Diagrams").then((m) => m.ArchCanvas), { ssr: false, loading: Loading });
const ClassDiagram = dynamic(() => import("@/components/Diagrams").then((m) => m.ClassDiagram), { ssr: false, loading: Loading });

export default function DesignPage() {
  const { id } = useParams<{ id: string }>();
  const d = designById.get(id);
  const items = useItems();
  const item = useMemo(() => items.find((i) => i.id === id), [items, id]);
  const settings = useStore((s) => s.settings);
  const prog = useStore((s) => s.progress[id]);
  const notes = useStore((s) => s.notes);
  const attempts = useStore((s) => s.attempts);
  const { setNote, patch, complete, addAttempt } = useStore.getState();

  const [step, setStep] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [fbs, setFbs] = useState<Record<string, Feedback>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [conf, setConf] = useState<number | undefined>();
  const [steerN, setSteerN] = useState(0);
  const [varN, setVarN] = useState(0);
  const [showFlow, setShowFlow] = useState(false);
  const [showDiagram, setShowDiagram] = useState(false);
  const [sec, setSec] = useStopwatch(true);
  const [from, setFrom] = useState<string | undefined>(undefined);
  useEffect(() => { setFrom(new URLSearchParams(window.location.search).get("from") ?? undefined); }, []);
  const progressAll = useStore((s) => s.progress);
  useTrackTime();

  useEffect(() => {
    setStep(0); setDrafts({}); setRevealed({}); setFbs({}); setErr(""); setConf(undefined); setSteerN(0); setVarN(0); setShowFlow(false); setShowDiagram(false); setSec(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!d || !item) return <Empty title="Exercise not found"><Link href="/learn" className="text-accent underline">Back to the map</Link></Empty>;

  const a = areaOf(d.area);
  const topic = topicById.get(d.topic);
  const st = d.stages[step];
  const key = `${id}:a:${st.key}`;
  const answer = drafts[st.key] ?? notes[key]?.body ?? "";
  const saved = (k: string) => (drafts[k] ?? notes[`${id}:a:${k}`]?.body ?? "").trim();
  const prevFb = (k: string) => fbs[k] ?? attempts.find((x) => x.item === id && x.kind === `stage:${k}`)?.feedback ?? null;
  const fb = prevFb(st.key);
  const ready = aiReady(settings);
  const limit = d.est * 60;
  const scores = d.stages.map((s) => prevFb(s.key)?.score).filter((x): x is number => x != null);
  const avg = scores.length ? Math.round(scores.reduce((x, y) => x + y, 0) / scores.length) : null;
  const diagramLabel = d.arch ? "reference architecture" : "reference class diagram";
  const hasDiagram = !!(d.arch || d.classes);

  const save = () => { if (drafts[st.key] !== undefined && drafts[st.key] !== (notes[key]?.body ?? "")) setNote(key, drafts[st.key]); };
  const grade = async () => {
    save(); setBusy(true); setErr("");
    try {
      const f = await gradeStage(settings, d, st, answer);
      setFbs((x) => ({ ...x, [st.key]: f }));
      addAttempt(id, `stage:${st.key}`, answer, f);
      const all = d.stages.map((s) => (s.key === st.key ? f.score : prevFb(s.key)?.score)).filter((x): x is number => x != null);
      patch(id, { score: Math.round(all.reduce((x, y) => x + y, 0) / all.length), conf, status: prog?.status === "done" ? "done" : "doing" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  const go = (n: number) => { save(); setStep(n); setErr(""); };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={from ?? (topic ? `/learn/${topic.id}` : "/learn")} className="inline-flex items-center gap-1.5 text-[13px] text-mute hover:text-text"><ArrowLeft size={14} />{from ? "Back to the course" : topic?.title ?? "Curriculum"}</Link>
        <div className={cn("num flex h-9 items-center gap-2 rounded-xl border px-3 font-mono text-[13px]", sec > limit ? "border-bad/50 bg-bad/10 text-bad" : sec > limit * 0.75 ? "border-warn/50 text-warn" : "border-line text-mute")} title={`A real round gives you about ${d.est} minutes`}>
          <TimerReset size={14} />{fmtClock(sec)}<span className="text-faint">/ {fmtClock(limit)}</span>
          <button onClick={() => setSec(0)} className="text-faint hover:text-text" aria-label="Reset timer">↺</button>
        </div>
      </div>

      <header className="card relative overflow-hidden p-6 animate-rise">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full blur-3xl" style={{ background: `color-mix(in srgb, ${a.color} 14%, transparent)` }} />
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <AreaPill area={d.area} />
          <Pill className="border-line text-mute">{d.tier === 1 ? "Must know" : d.tier === 2 ? "Expected" : "Stretch"}</Pill>
          <Pill className="border-line text-mute">{fmtMin(d.est)}</Pill>
          {prog?.status === "done" && <Pill color="var(--color-ok)"><Check size={12} />Done</Pill>}
          {avg !== null && <Pill color="var(--color-hld)">avg score {avg}</Pill>}
        </div>
        <h1 className="display text-2xl font-semibold sm:text-3xl">{d.title}</h1>
        <p className="mt-3 max-w-3xl text-[15.5px] leading-relaxed text-[#d5d8e6]">{d.prompt}</p>
        {interviewById.get(d.id) && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-accent/25 bg-accent/[0.04] p-3">
            <Link href={mockHref(d, from)} className={btnClass("primary", "md")}><Mic size={15} />{(progressAll[d.id]?.mocks ?? 0) > 0 ? "Mock interview: explore another path" : "Start mock interview"}</Link>
            <span className="min-w-0 flex-1 text-[13px] text-mute">{isUnlocked(d, progressAll) ? "The real thing: an AI interviewer, a whiteboard and a 45-minute clock. Or practise stage by stage below." : `You haven't finished ${missing(d, progressAll).length} page${missing(d, progressAll).length > 1 ? "s" : ""} this question needs yet. You can still try it, or practise stage by stage below.`}</span>
          </div>
        )}
        <div className="mt-4"><ConfidencePick value={conf} onChange={setConf} /></div>
      </header>

      {(d.words || d.flow) && (
        <div className="grid gap-5 lg:grid-cols-2 items-start">
          {d.words && (
            <section className="card p-5" data-read-block>
              <div className="eyebrow flex items-center gap-1.5" style={{ color: a.color }}><BookOpen size={13} />Words you&apos;ll meet</div>
              <Md className="mt-2 text-[13.5px]">{d.words}</Md>
            </section>
          )}
          {d.flow && (
            <section className="card overflow-hidden">
              <button onClick={() => setShowFlow((x) => !x)} aria-expanded={showFlow} className="flex w-full items-center justify-between gap-3 p-5 text-left">
                <span><span className="eyebrow flex items-center gap-1.5 text-hld"><ListOrdered size={13} />How the 45 minutes go</span><span className="mt-1 block text-[13px] text-mute">What a strong candidate covers, minute by minute. Read it before you start, or after as a check.</span></span>
                <ChevronDown size={17} className={cn("shrink-0 text-mute transition", showFlow && "rotate-180")} />
              </button>
              {showFlow && <div className="border-t border-line px-5 pb-5 pt-3"><Md className="text-[13.5px]">{d.flow}</Md></div>}
            </section>
          )}
        </div>
      )}

      {/* stage stepper */}
      <nav aria-label="Stages" className="flex gap-1.5 overflow-x-auto pb-1">
        {d.stages.map((s, i) => {
          const has = !!saved(s.key), sc = prevFb(s.key)?.score;
          return (
            <button key={s.key} onClick={() => go(i)} aria-current={i === step ? "step" : undefined}
              className={cn("flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-[13px] font-medium transition", i === step ? "border-accent/50 bg-accent/10 text-text" : "border-line bg-panel text-mute hover:text-text")}>
              <span className={cn("num grid h-5 w-5 place-items-center rounded-full text-[11px] font-bold", sc != null ? "bg-ok text-ink" : has ? "bg-hld/25 text-hld" : "bg-panel2 text-faint")}>{sc != null ? <Check size={12} /> : i + 1}</span>
              {s.title}
              {sc != null && <span className="num text-[11px] text-faint">{sc}</span>}
            </button>
          );
        })}
      </nav>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
        <div className="space-y-5">
          <AnimatePresence mode="wait">
            <motion.section key={st.key} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.18 }} className="card space-y-4 p-5">
              <div>
                <div className="eyebrow" style={{ color: a.color }}>Stage {step + 1} of {d.stages.length}</div>
                <h2 className="display mt-1 text-xl font-semibold">{st.title}</h2>
                <p className="mt-1.5 text-[14.5px] leading-relaxed text-mute">{st.ask}</p>
              </div>
              <textarea value={answer} onChange={(e) => setDrafts((x) => ({ ...x, [st.key]: e.target.value }))} onBlur={save} rows={10} aria-label={`Your answer for ${st.title}`}
                placeholder="Write what you would say and draw. Bullet points are fine; numbers and trade-offs are what get scored."
                className="w-full resize-y rounded-xl border border-line bg-bg p-3.5 text-[14px] leading-relaxed outline-none focus:border-accent/60" />
              <div className="flex flex-wrap items-center gap-2.5">
                {ready ? <Button variant="primary" disabled={busy || answer.trim().length < 30} onClick={grade}>{busy ? <Spinner label="Grading this stage" /> : <><Sparkles size={15} />Grade with AI</>}</Button> : null}
                <Button disabled={revealed[st.key]} onClick={() => { save(); setRevealed((x) => ({ ...x, [st.key]: true })); }}><Eye size={15} />{answer.trim().length < 30 ? "Skip: show a model answer" : "Compare with a model answer"}</Button>
                <span className="ml-auto flex gap-2">
                  {step > 0 && <Button variant="ghost" onClick={() => go(step - 1)}><ArrowLeft size={15} />Back</Button>}
                  {step < d.stages.length - 1 && <Button onClick={() => go(step + 1)}>Next stage<ArrowRight size={15} /></Button>}
                </span>
              </div>
              {!ready && <NeedAI />}
              {answer.trim().length < 30 && <p className="text-[12px] text-faint">Write at least a few lines before grading. Reading the model answer first feels productive but skips the part that builds the skill.</p>}
              {err && <p role="alert" className="rounded-xl border border-bad/30 bg-bad/10 p-3 text-[13px] text-bad">Grading did not complete: {err}</p>}
            </motion.section>
          </AnimatePresence>

          {fb && <FeedbackView key={st.key + "fb"} f={fb} predicted={conf} />}

          {revealed[st.key] && (
            <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card p-5">
              <div className="eyebrow text-accent">One strong answer</div>
              <Md className="mt-3 text-[14.5px]">{st.model}</Md>
              <p className="mt-4 text-[12px] text-faint">This is a reference, not the answer. A different design with clearly argued trade-offs scores just as well.</p>
            </motion.section>
          )}

          {hasDiagram && (
            <section className="card overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div><div className="eyebrow">Interactive {diagramLabel}</div><div className="mt-0.5 text-[13px] text-mute">{d.arch ? "Drag components, click one to see what it does, then kill it to watch what breaks." : "Drag the classes around; click one to see its members."}</div></div>
                <Button size="sm" onClick={() => setShowDiagram((x) => !x)}>{showDiagram ? "Hide" : "Reveal"}</Button>
              </div>
              {!showDiagram && <p className="border-t border-line px-5 py-4 text-[13px] text-faint">Sketch your own on paper first. Then compare box by box: what did you add that this lacks, and what did you miss?</p>}
              {showDiagram && <div className="border-t border-line">{d.arch ? <ArchCanvas arch={d.arch} /> : <ClassDiagram boxes={d.classes!.boxes} rels={d.classes!.rels} />}</div>}
            </section>
          )}

          <DesignVideos key={"dv" + id} id={id} color={a.color} />
        </div>

        <aside className="space-y-5">
          <section className="card p-5">
            <div className="eyebrow flex items-center gap-1.5 text-craft"><Compass size={13} />Where the interviewer can steer</div>
            <p className="mt-1.5 text-[13px] text-mute">Answer each push out loud before you reveal what a strong answer covers.</p>
            <ul className="mt-3 space-y-2.5">
              {d.steer.map(([push, strong], i) => (
                <li key={push} className="rounded-xl border border-line bg-panel2 p-3.5">
                  <div className="text-[14px] font-medium leading-snug">{push}</div>
                  {i < steerN ? <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1.5 text-[13px] leading-relaxed text-mute">{strong}</motion.p>
                    : i === steerN ? <button onClick={() => setSteerN((n) => n + 1)} className="mt-1.5 text-[12.5px] font-medium text-accent hover:underline">I have answered: show what is expected</button> : null}
                </li>
              ))}
            </ul>
          </section>

          {interviewById.get(d.id) && <PathsMap d={d} progress={progressAll} attempted={(progressAll[d.id]?.mocks ?? 0) > 0} />}

          {!!d.variants?.length && (
            <section className="card p-5">
              <div className="eyebrow flex items-center gap-1.5 text-ai"><GitBranch size={13} />Variations the interviewer can switch to</div>
              <p className="mt-1.5 text-[13px] text-mute">The same question often arrives in a different form. Say what changes before you reveal it.</p>
              <ul className="mt-3 space-y-2.5">
                {d.variants.map(([v, change], i) => (
                  <li key={v} className="rounded-xl border border-line bg-panel2 p-3.5">
                    <div className="text-[14px] font-medium leading-snug">{v}</div>
                    {i < varN ? <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}><Md className="mt-1.5 text-[13px] text-mute">{change}</Md></motion.div>
                      : i === varN ? <button onClick={() => setVarN((n) => n + 1)} className="mt-1.5 text-[12.5px] font-medium text-accent hover:underline">I have thought it through: show what changes</button> : null}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {d.level && (
            <section className="card p-5">
              <div className="eyebrow flex items-center gap-1.5 text-hld"><TrendingUp size={13} />What each level looks like on this question</div>
              <Md className="mt-2 text-[13.5px]">{d.level}</Md>
            </section>
          )}

          <section className="card p-5">
            <div className="eyebrow flex items-center gap-1.5 text-warn"><AlertTriangle size={13} />Where candidates slip</div>
            <ul className="mt-3 space-y-2">{d.pitfalls.map((p) => <li key={p} className="flex gap-2.5 text-[13.5px] leading-relaxed"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-warn" />{p}</li>)}</ul>
          </section>

          <References refs={d.refs} columns={1} embed />
        </aside>
      </div>

      <RatingBar done={prog?.status === "done"} suggested={avg === null ? undefined : avg >= 90 ? 3 : avg >= 70 ? 2 : avg >= 45 ? 1 : 0}
        onRate={(r) => { save(); complete(item, r, { conf, time: (prog?.time ?? 0) + sec, ...(avg !== null ? { score: avg } : {}) }); }} />
    </div>
  );
}
