"use client";
import { useEffect, useRef, useState } from "react";
import { History } from "lucide-react";
import { useStore } from "@/lib/store";
import { useItems, useTrackTime } from "@/lib/hooks";
import { mockSlots } from "@/lib/schedule";
import { Button, PageHead, Pill } from "@/components/ui";
import { RatingBar, Spinner } from "@/components/Work";
import { Setup } from "@/components/interview/Setup";
import { Room } from "@/components/interview/Room";
import { PredictDecision, ScorecardView } from "@/components/interview/Scorecard";
import type { Rating } from "@/lib/types";
import type { Kind, SessionConfig } from "@/lib/interview/core/types";
import { DECISIONS, DECISION_LABEL, DIMENSIONS, scoreOf, type Decision } from "@/lib/interview/core/scoring";
import { InterviewSession } from "@/lib/interview/session";
import { drawQuestion, generateQuestion } from "@/lib/interview/questions";
import { loadHistory, makeRecord, saveRecord, scoreSession, toFeedback, transcriptText, type SessionRecord } from "@/lib/interview/results";

type Stage = "setup" | "live" | "predict" | "review";

/** Coach mode: recurring gaps from the last few scorecards of this kind. */
function coachNotes(kind: Kind, history: SessionRecord[]): string {
  const past = history.filter((h) => h.cfg.kind === kind && h.scorecard).slice(0, 3);
  if (!past.length) return "";
  const dims = DIMENSIONS[kind].map((d) => ({ d, avg: past.reduce((a, h) => a + (h.scorecard!.ratings.find((r) => r.dimension === d.key)?.score ?? 3), 0) / past.length }));
  const weak = dims.filter((x) => x.avg < 2.75).map((x) => `${x.d.label.toLowerCase()} (${x.avg.toFixed(1)}/4: ${x.d.what})`);
  const imp = past.flatMap((h) => h.scorecard!.improvements).slice(0, 4);
  return [weak.length && `weak on ${weak.join("; ")}`, imp.length && `previous advice: ${imp.join(" | ")}`].filter(Boolean).join(". ");
}

export default function Mock() {
  const settings = useStore((s) => s.settings);
  const progress = useStore((s) => s.progress);
  const custom = useStore((s) => s.custom);
  const attempts = useStore((s) => s.attempts);
  const items = useItems();
  const { complete, addAttempt, addXp } = useStore.getState();
  useTrackTime();

  const [stage, setStage] = useState<Stage>("setup");
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [record, setRecord] = useState<SessionRecord | null>(null);
  const [predicted, setPredicted] = useState<Decision | undefined | null>(null); // null = not answered yet
  const [scoring, setScoring] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [history, setHistory] = useState<SessionRecord[]>([]);
  const [initial, setInitial] = useState<Partial<SessionConfig> | undefined>(undefined);
  const [ready, setReady] = useState(false);
  const [viewing, setViewing] = useState(false); // a past round from history: no rating
  const back = () => { setStage("setup"); setRecord(null); setViewing(false); };
  const sessionRef = useRef<InterviewSession | null>(null);

  useEffect(() => {
    setHistory(loadHistory());
    // roadmap links pass a recommended configuration
    const q = new URLSearchParams(window.location.search);
    const kind = q.get("kind") as Kind | null;
    const topics = q.get("topics")?.split(",").filter(Boolean);
    if (kind && ["coding", "hld", "lld", "behavioral"].includes(kind)) setInitial({ kind, ...(topics?.length ? { selection: { mode: "random-pool", pool: { topics } } } : {}) });
    setReady(true);
    return () => { void sessionRef.current?.stop("error"); };
  }, []);

  const start = async (cfg: SessionConfig, outOfCurriculum: boolean) => {
    setErr(""); setBusy(true);
    try {
      const q = outOfCurriculum
        ? await generateQuestion(settings, cfg.kind, cfg.level, items.filter((i) => progress[i.id]?.status === "done").map((i) => i.title))
        : drawQuestion(cfg.kind, cfg.selection, custom, progress, cfg.seed);
      if (!q) throw new Error("No question matches. Change the pool.");
      const full = { ...cfg, coachNotes: cfg.mode === "coach" ? coachNotes(cfg.kind, history) : undefined };
      const s = new InterviewSession(full, q, settings);
      sessionRef.current = s;
      s.onEnded(() => finish(s));
      setSession(s); setRecord(null); setPredicted(null); setStage("live");
      await s.start();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setStage("setup"); setSession(null);
    } finally { setBusy(false); }
  };

  const finish = (s: InterviewSession) => {
    if (sessionRef.current !== s) return;
    sessionRef.current = null;
    const r = makeRecord(s.cfg, s.state, s.log);
    setRecord(r);
    setStage("predict");
    const candidateTurns = s.log.filter((x) => x.e.type === "turn.candidate").length;
    if (candidateTurns < 2) { saveRecord(r); setHistory(loadHistory()); setStage("review"); return; }
    setScoring(true);
    scoreSession(settings, s.cfg, s.state, s.log)
      .then((card) => {
        setRecord((cur) => {
          const next = { ...(cur ?? r), scorecard: card };
          saveRecord(next);
          addAttempt(r.question.id, `mock:${s.cfg.kind}`, transcriptText(s.log), toFeedback(card));
          setHistory(loadHistory());
          return next;
        });
      })
      .catch((e) => setErr(`Scoring failed: ${e instanceof Error ? e.message : e}`))
      .finally(() => setScoring(false));
  };

  const pick = (d: Decision | undefined) => {
    setPredicted(d);
    setRecord((cur) => { if (!cur) return cur; const next = { ...cur, predicted: d }; saveRecord(next); return next; });
    setStage("review");
  };

  const rate = (r: Rating) => {
    const card = record?.scorecard;
    const extra = card ? { score: scoreOf(card) } : {};
    const slot = mockSlots(settings.weeks).find((m) => progress[m.id]?.status !== "done");
    if (slot) complete({ ...slot, title: `Mock: ${record?.question.title ?? "interview"}` }, r, extra);
    else addXp(150, "Extra mock interview");
    // the question joins spaced review so its weak points return
    const it = items.find((x) => x.id === record?.question.id);
    if (it && progress[it.id]?.status !== "done") complete(it, r, extra);
    setSession(null);
    back();
  };

  if (stage === "live" && session) return <Room session={session} settings={settings} onEnd={() => {}} />;

  if ((stage === "predict" || stage === "review") && record) {
    const card = record.scorecard;
    const d = card ? DECISIONS.indexOf(card.decision) : -1;
    return (
      <div className="space-y-5">
        <PageHead eyebrow="Debrief" title={record.question.title} sub={`${Math.max(1, Math.round(record.stats.minutes))} minute${Math.round(record.stats.minutes) > 1 ? "s" : ""} with ${record.persona.name}.`} />
        {err && <p role="alert" className="rounded-xl border border-bad/30 bg-bad/10 p-3 text-[13px] text-bad">{err}</p>}
        {stage === "predict" && <PredictDecision onPick={pick} />}
        {stage === "review" && (scoring ? <div className="card p-5 text-[14px] text-mute"><Spinner label="The committee is reading the transcript" /></div>
          : card ? <ScorecardView r={{ ...record, predicted: predicted ?? undefined }} />
          : <div className="card p-5 text-[13.5px] text-mute">Too short to score: the interviewer needs at least two of your replies. Rate yourself below, at least as strictly as an interviewer would.</div>)}
        {stage === "review" && !scoring && !viewing && <RatingBar suggested={card ? (d >= 5 ? 3 : d >= 4 ? 2 : d >= 3 ? 1 : 0) : undefined} onRate={rate} />}
        {viewing && <Button onClick={back}>Back to setup</Button>}
      </div>
    );
  }

  const done = mockSlots(settings.weeks).filter((m) => progress[m.id]?.status === "done").length;
  return (
    <div>
      <PageHead eyebrow="Dress rehearsal" title="Mock interview" sub="A timed round, by voice or text, with an interviewer who underspecifies the question, follows your whiteboard and code, cuts in when something is off, and writes the feedback a hiring committee would read." right={<Pill color="var(--color-accent)">{done} of {mockSlots(settings.weeks).length} planned mocks done</Pill>} />
      {err && <p role="alert" className="mb-4 rounded-xl border border-bad/30 bg-bad/10 p-3 text-[13px] text-bad">{err} <button className="underline" onClick={() => setErr("")}>Dismiss</button></p>}
      {ready && <Setup key={JSON.stringify(initial ?? {})} settings={settings} progress={progress} custom={custom} attempts={attempts} items={items} initial={initial} onStart={start} busy={busy} />}
      {history.length > 0 && (
        <section className="card mt-6 overflow-hidden">
          <div className="flex items-center gap-2 border-b border-line px-5 py-3"><History size={15} className="text-mute" /><div className="eyebrow">Past rounds on this device</div></div>
          <ul className="divide-y divide-line/60">{history.slice(0, 10).map((h) => (
            <li key={h.id}><button className="flex w-full items-center gap-3 px-5 py-3 text-left text-[13.5px] hover:bg-white/[0.025]" onClick={() => { setRecord(h); setPredicted(h.predicted); setViewing(true); setStage("review"); }}>
              <span className="min-w-0 flex-1 truncate">{h.question.title}</span>
              {h.picked && <Pill className="border-line text-faint">picked</Pill>}
              <Pill className="border-line text-mute">{h.cfg.kind}</Pill>
              <span className="w-32 text-right text-[12.5px] text-mute">{h.scorecard ? DECISION_LABEL[h.scorecard.decision] : "not scored"}</span>
              <span className="num w-24 text-right text-[12px] text-faint">{new Date(h.at).toLocaleDateString()}</span>
            </button></li>
          ))}</ul>
        </section>
      )}
    </div>
  );
}
