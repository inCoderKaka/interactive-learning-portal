"use client";
import { useEffect, useRef, useState } from "react";
import { Cloud, History, Repeat2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { useItems, useTrackTime } from "@/lib/hooks";
import { mockSlots } from "@/lib/schedule";
import { Button, Md, PageHead, Pill } from "@/components/ui";
import { RatingBar, Spinner } from "@/components/Work";
import { Setup, engineWithinBudget } from "@/components/interview/Setup";
import { Room } from "@/components/interview/Room";
import { Replay } from "@/components/interview/Replay";
import { PredictDecision, ScorecardView } from "@/components/interview/Scorecard";
import type { Rating } from "@/lib/types";
import type { InterviewQuestion, Kind, SessionConfig } from "@/lib/interview/core/types";
import { DECISIONS, DECISION_LABEL, DIMENSIONS, scoreOf, type Decision } from "@/lib/interview/core/scoring";
import { answerAfter, redoFrom } from "@/lib/interview/core/replay";
import { fragment } from "@/lib/interview/core/templates";
import { InterviewSession } from "@/lib/interview/session";
import { drawQuestion, generateQuestion } from "@/lib/interview/questions";
import { loadHistory, makeRecord, mergeHistory, saveRecord, scoreSession, scorecardProvenance, toFeedback, transcriptText, type SessionRecord } from "@/lib/interview/results";
import { RoundRecorder } from "@/lib/interview/recorder";
import { loadMedia, pruneMedia, saveMedia, type RoundMedia } from "@/lib/interview/media";
import { CloudLog, downloadMedia, loadRemoteLog, syncInterviews, uploadMedia, uploadRecord, uploadScorecard } from "@/lib/interview/sync";
import { providerReady, runTask } from "@/lib/interview/tasks";

type Stage = "setup" | "live" | "predict" | "review" | "drill-review";

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
  const user = useStore((s) => s.user);
  const items = useItems();
  const { complete, addAttempt, addXp } = useStore.getState();
  useTrackTime();

  const [stage, setStage] = useState<Stage>("setup");
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [record, setRecord] = useState<SessionRecord | null>(null);
  const [media, setMedia] = useState<RoundMedia | undefined>(undefined);
  const [predicted, setPredicted] = useState<Decision | undefined | null>(null); // null = not answered yet
  const [scoring, setScoring] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [notice, setNotice] = useState("");
  const [history, setHistory] = useState<SessionRecord[]>([]);
  const [remote, setRemote] = useState<SessionRecord[]>([]);
  const [initial, setInitial] = useState<Partial<SessionConfig> | undefined>(undefined);
  const [ready, setReady] = useState(false);
  const [viewing, setViewing] = useState(false); // a past round from history: no rating
  const [drill, setDrill] = useState<{ of: SessionRecord; seq: number; comment: string; loading: boolean } | null>(null);
  const back = () => { setStage("setup"); setRecord(null); setMedia(undefined); setViewing(false); setDrill(null); };
  const sessionRef = useRef<InterviewSession | null>(null);
  const recorderRef = useRef<RoundRecorder | null>(null);
  const detachRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setHistory(loadHistory());
    void pruneMedia();
    // roadmap links pass a recommended configuration
    const q = new URLSearchParams(window.location.search);
    const kind = q.get("kind") as Kind | null;
    const topics = q.get("topics")?.split(",").filter(Boolean);
    if (kind && ["coding", "hld", "lld", "behavioral"].includes(kind)) setInitial({ kind, ...(topics?.length ? { selection: { mode: "random-pool", pool: { topics } } } : {}) });
    setReady(true);
    return () => { void sessionRef.current?.stop("error"); void recorderRef.current?.stop(); };
  }, []);

  // signed in: reconcile rounds with the cloud (push what it lacks, list what this device lacks)
  useEffect(() => {
    if (!user) { setRemote([]); return; }
    let live = true;
    syncInterviews(loadHistory()).then((r) => { if (live) setRemote(r); }).catch(() => {});
    return () => { live = false; };
  }, [user]);

  const start = async (cfg: SessionConfig, outOfCurriculum: boolean, fixed?: InterviewQuestion) => {
    setErr(""); setNotice(""); setBusy(true);
    try {
      const within = engineWithinBudget(cfg, settings);
      if (within.note) setNotice(within.note);
      const q = fixed ?? (outOfCurriculum
        ? await generateQuestion(settings, cfg.kind, cfg.level, items.filter((i) => progress[i.id]?.status === "done").map((i) => i.title))
        : drawQuestion(cfg.kind, cfg.selection, custom, progress, cfg.seed));
      if (!q) throw new Error("No question matches. Change the pool.");
      const full = { ...cfg, engine: within.engine, coachNotes: cfg.mode === "coach" ? coachNotes(cfg.kind, history) : undefined };
      const s = new InterviewSession(full, q, settings);
      sessionRef.current = s;
      s.onEnded(() => void finish(s));
      if (full.record?.audio && RoundRecorder.supported()) {
        try {
          const rec = await RoundRecorder.start();
          recorderRef.current = rec;
          s.onOutput = (st) => rec.addOutput(st);
        } catch (e) { setNotice(`Recording is off: ${e instanceof Error ? e.message : e}`); }
      }
      setSession(s); setRecord(null); setMedia(undefined); setPredicted(null); setStage("live");
      await s.start();
      detachRef.current = CloudLog.attach(s);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      void recorderRef.current?.stop(); recorderRef.current = null;
      setStage("setup"); setSession(null);
    } finally { setBusy(false); }
  };

  const finish = async (s: InterviewSession) => {
    if (sessionRef.current !== s) return;
    sessionRef.current = null;
    detachRef.current?.(); detachRef.current = null;
    const r = makeRecord(s.cfg, s.state, s.log, s.id, s.engineNow);
    // media first, so the replay is ready with the debrief
    const rec = recorderRef.current;
    recorderRef.current = null;
    const audio = await rec?.stop().catch(() => null);
    if (audio || s.frames.length) {
      const m: RoundMedia = { id: s.id, at: r.at, audio: audio ?? undefined, audioOffsetMs: rec ? rec.startedAt - s.state.startedAt : 0, interviewerAudio: !!rec?.interviewerAudio, frames: s.frames };
      r.hasMedia = true;
      await saveMedia(m).catch(() => {});
      setMedia(m);
      if (s.cfg.record?.cloud && audio) void uploadMedia(m);
    }
    setRecord(r);

    if (s.cfg.redo) { saveRecord(r); setHistory(loadHistory()); setStage("drill-review"); void compareDrill(r); return; }

    setStage("predict");
    const candidateTurns = s.log.filter((x) => x.e.type === "turn.candidate").length;
    if (candidateTurns < 2 || !providerReady(settings, settings.provider)) { saveRecord(r); setHistory(loadHistory()); void uploadRecord(r); setStage(candidateTurns < 2 ? "review" : "predict"); return; }
    setScoring(true);
    void uploadRecord(r);
    scoreSession(settings, s.cfg, s.state, s.log)
      .then((card) => {
        setRecord((cur) => {
          const next = { ...(cur ?? r), scorecard: card, model: scorecardProvenance(settings, s.cfg) };
          saveRecord(next);
          void uploadScorecard(next);
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
    setRecord((cur) => { if (!cur) return cur; const next = { ...cur, predicted: d }; saveRecord(next); if (next.scorecard) void uploadScorecard(next); return next; });
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

  /** Open a past round: fetch its log and media from the cloud when this device does not have them. */
  const open = async (h: SessionRecord) => {
    setErr("");
    let r = h;
    if (h.remote && !h.log.length) { setBusy(true); r = { ...h, log: await loadRemoteLog(h.id) }; setBusy(false); }
    setRecord(r); setPredicted(r.predicted); setViewing(true); setStage("review");
    setMedia((await loadMedia(r.id)) ?? (r.hasMedia ? await downloadMedia(r.id) : undefined));
  };

  /** "Redo this moment" (MI-FB-4): a five-minute drill from an interviewer turn, with the same context. */
  const redo = (of: SessionRecord, seq: number) => {
    const rd = redoFrom(of.log, seq);
    if (!rd) return;
    setDrill({ of, seq, comment: "", loading: false });
    const cfg: SessionConfig = {
      ...of.cfg, minutes: 5, redo: rd, arc: { intro: false, aboutYou: false, curveball: false, questionsForMe: false },
      curveballs: { frequency: "none", disabled: [] }, record: { audio: false, cloud: false }, loop: undefined, tone: of.tone, seed: of.cfg.seed,
    };
    void start(cfg, false, of.question);
  };

  const compareDrill = async (r: SessionRecord) => {
    setDrill((d) => (d ? { ...d, loading: true } : d));
    const d = drillRef.current;
    if (!d || !providerReady(settings, settings.provider)) { setDrill((x) => (x ? { ...x, loading: false } : x)); return; }
    const before = answerAfter(d.of.log, d.seq);
    const after = r.log.flatMap(({ e }) => (e.type === "turn.candidate" ? [e.text] : [])).join(" ");
    const question = d.of.log.find((x) => x.seq === d.seq)?.e;
    try {
      const out = await runTask(settings, "stage.grade", fragment("redo.compare", r.cfg.prompts), [{ role: "user", content: `Interviewer question: ${question && question.type === "turn.interviewer" ? question.text : ""}\n\nFirst answer: ${before || "(no answer)"}\n\nRetry: ${after || "(no answer)"}` }]);
      setDrill((x) => (x ? { ...x, comment: out.trim(), loading: false } : x));
    } catch (e) {
      setDrill((x) => (x ? { ...x, comment: `Could not compare: ${e instanceof Error ? e.message : e}`, loading: false } : x));
    }
  };
  const drillRef = useRef(drill);
  drillRef.current = drill;

  if (stage === "live" && session) return (
    <>
      {notice && <p className="mb-3 rounded-xl border border-warn/30 bg-warn/10 p-2.5 text-[13px] text-warn">{notice}</p>}
      <Room session={session} settings={settings} onEnd={() => {}} />
    </>
  );

  if (stage === "drill-review" && record && drill) {
    const before = answerAfter(drill.of.log, drill.seq);
    const after = record.log.flatMap(({ e }) => (e.type === "turn.candidate" ? [e.text] : [])).join(" ");
    const q = drill.of.log.find((x) => x.seq === drill.seq)?.e;
    return (
      <div className="space-y-5">
        <PageHead eyebrow="Redo this moment" title={drill.of.question.title} sub={q && q.type === "turn.interviewer" ? `“${q.text}”` : undefined} />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="card p-4"><div className="eyebrow mb-2">First time</div><p className="text-[13.5px] leading-relaxed">{before || <span className="text-faint">No answer recorded.</span>}</p></div>
          <div className="card p-4"><div className="eyebrow mb-2">Retry</div><p className="text-[13.5px] leading-relaxed">{after || <span className="text-faint">You did not answer in the drill.</span>}</p></div>
        </div>
        <div className="card p-4 text-[13.5px] leading-relaxed">{drill.loading ? <Spinner label="Comparing the two answers" /> : drill.comment ? <Md>{drill.comment}</Md> : <span className="text-mute">Connect an AI provider to get a comparison.</span>}</div>
        <div className="flex gap-2"><Button onClick={() => redo(drill.of, drill.seq)}><Repeat2 size={14} />Try again</Button><Button variant="ghost" onClick={() => { void open(drill.of); setDrill(null); }}>Back to the replay</Button></div>
      </div>
    );
  }

  if ((stage === "predict" || stage === "review") && record) {
    const card = record.scorecard;
    const d = card ? DECISIONS.indexOf(card.decision) : -1;
    return (
      <div className="space-y-5">
        <PageHead eyebrow="Debrief" title={record.question.title} sub={`${Math.max(1, Math.round(record.stats.minutes || 0))} minute${Math.round(record.stats.minutes || 0) > 1 ? "s" : ""} with ${record.persona.name}.`} />
        {err && <p role="alert" className="rounded-xl border border-bad/30 bg-bad/10 p-3 text-[13px] text-bad">{err}</p>}
        {stage === "predict" && <PredictDecision onPick={pick} />}
        {stage === "review" && (scoring ? <div className="card p-5 text-[14px] text-mute"><Spinner label="The committee is reading the transcript" /></div>
          : card ? <ScorecardView r={{ ...record, predicted: predicted ?? undefined }} />
          : <div className="card p-5 text-[13.5px] text-mute">{record.log.filter((x) => x.e.type === "turn.candidate").length < 2 ? "Too short to score: the interviewer needs at least two of your replies." : "No AI provider is connected, so there is no scorecard."} Rate yourself below, at least as strictly as an interviewer would.</div>)}
        {stage === "review" && record.log.length > 0 && <Replay record={record} media={media} onRedo={record.cfg.redo ? undefined : (seq) => redo(record, seq)} />}
        {stage === "review" && !scoring && !viewing && <RatingBar suggested={card ? (d >= 5 ? 3 : d >= 4 ? 2 : d >= 3 ? 1 : 0) : undefined} onRate={rate} />}
        {viewing && <Button onClick={back}>Back to setup</Button>}
      </div>
    );
  }

  const done = mockSlots(settings.weeks).filter((m) => progress[m.id]?.status === "done").length;
  const all = mergeHistory(history, remote);
  return (
    <div>
      <PageHead eyebrow="Dress rehearsal" title="Mock interview" sub="A timed round, by voice or text, with an interviewer who underspecifies the question, follows your whiteboard and code, cuts in when something is off, and writes the feedback a hiring committee would read." right={<Pill color="var(--color-accent)">{done} of {mockSlots(settings.weeks).length} planned mocks done</Pill>} />
      {err && <p role="alert" className="mb-4 rounded-xl border border-bad/30 bg-bad/10 p-3 text-[13px] text-bad">{err} <button className="underline" onClick={() => setErr("")}>Dismiss</button></p>}
      {notice && <p className="mb-4 rounded-xl border border-warn/30 bg-warn/10 p-3 text-[13px] text-warn">{notice}</p>}
      {ready && <Setup key={JSON.stringify(initial ?? {})} settings={settings} progress={progress} custom={custom} attempts={attempts} items={items} initial={initial} onStart={start} busy={busy} />}
      {all.length > 0 && (
        <section className="card mt-6 overflow-hidden">
          <div className="flex items-center gap-2 border-b border-line px-5 py-3"><History size={15} className="text-mute" /><div className="eyebrow">Past rounds</div>{remote.length > 0 && <span className="text-[11.5px] text-faint">including {remote.length} from your other devices</span>}</div>
          <ul className="divide-y divide-line/60">{all.slice(0, 15).map((h) => (
            <li key={h.id}><button disabled={busy} className="flex w-full items-center gap-3 px-5 py-3 text-left text-[13.5px] hover:bg-white/[0.025]" onClick={() => void open(h)}>
              <span className="min-w-0 flex-1 truncate">{h.question.title}</span>
              {h.remote && <Cloud size={13} className="text-faint" aria-label="from the cloud" />}
              {h.cfg.redo && <Pill className="border-line text-faint">drill</Pill>}
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
