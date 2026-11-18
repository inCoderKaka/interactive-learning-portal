"use client";
import { useEffect, useRef, useState } from "react";
import { CalendarClock, Cloud, Download, History, Repeat2, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { useItems, useTrackTime } from "@/lib/hooks";
import { mockSlots } from "@/lib/schedule";
import { Button, Md, PageHead, Pill, fmtClock } from "@/components/ui";
import { RatingBar, Spinner } from "@/components/Work";
import { Setup, engineWithinBudget, type StartOpts } from "@/components/interview/Setup";
import { Room } from "@/components/interview/Room";
import { Replay } from "@/components/interview/Replay";
import { ReverseDebrief, ReverseRoom, type ReverseResult } from "@/components/interview/ReverseRoom";
import { PeerRoom } from "@/components/interview/PeerRoom";
import { PredictDecision, ScorecardView } from "@/components/interview/Scorecard";
import type { Rating } from "@/lib/types";
import type { InterviewQuestion, Kind, SessionConfig } from "@/lib/interview/core/types";
import { DECISIONS, DECISION_LABEL, DIMENSIONS, scoreOf, type Decision } from "@/lib/interview/core/scoring";
import { answerAfter, redoFrom } from "@/lib/interview/core/replay";
import { fragment } from "@/lib/interview/core/templates";
import { LOBBY_MS, icsFor, lobbyOpen, missed, upcoming, type Booking } from "@/lib/interview/core/booking";
import { committeeDecision, committeePrompt, defaultLoop, parseCommittee, roundConfig, type Committee, type LoopPlan } from "@/lib/interview/core/loop";
import type { ReverseFeedback, ReverseGrade } from "@/lib/interview/core/reverse";
import { InterviewSession } from "@/lib/interview/session";
import { ReverseSession } from "@/lib/interview/reverse-session";
import { drawQuestion, generateQuestion } from "@/lib/interview/questions";
import { loadHistory, makeRecord, mergeHistory, saveRecord, scoreSession, scorecardProvenance, toFeedback, transcriptText, type SessionRecord } from "@/lib/interview/results";
import { deliveryStats } from "@/lib/interview/core/analytics";
import { RoundRecorder } from "@/lib/interview/recorder";
import { loadMedia, pruneMedia, saveMedia, type RoundMedia } from "@/lib/interview/media";
import { CloudLog, downloadMedia, loadRemoteLog, syncInterviews, uploadMedia, uploadRecord, uploadScorecard } from "@/lib/interview/sync";
import { getAi, providerReady, runTask } from "@/lib/interview/tasks";
import { privateSettings } from "@/lib/interview/privacy";

type Stage = "setup" | "live" | "predict" | "review" | "drill-review" | "reverse" | "peer" | "loop-break" | "loop-debrief" | "lobby";

interface LoopState { plan: LoopPlan; base: SessionConfig; seed: number; index: number; ids: string[]; cards: Record<string, SessionRecord>; breakUntil: number; committee?: Committee; deciding?: boolean }

/** Coach mode: recurring gaps from the last few scorecards of this kind. */
function coachNotes(kind: Kind, history: SessionRecord[]): string {
  const past = history.filter((h) => h.cfg.kind === kind && h.scorecard).slice(0, 3);
  if (!past.length) return "";
  const dims = DIMENSIONS[kind].map((d) => ({ d, avg: past.reduce((a, h) => a + (h.scorecard!.ratings.find((r) => r.dimension === d.key)?.score ?? 3), 0) / past.length }));
  const weak = dims.filter((x) => x.avg < 2.75).map((x) => `${x.d.label.toLowerCase()} (${x.avg.toFixed(1)}/4: ${x.d.what})`);
  const imp = past.flatMap((h) => h.scorecard!.improvements).slice(0, 4);
  return [weak.length && `weak on ${weak.join("; ")}`, imp.length && `previous advice: ${imp.join(" | ")}`].filter(Boolean).join(". ");
}

function downloadIcs(b: Booking) {
  const blob = new Blob([icsFor(b, `${window.location.origin}/mock?booking=${b.id}`)], { type: "text/calendar" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = `ascent-mock-${new Date(b.at).toISOString().slice(0, 10)}.ics`; a.click();
}

export default function Mock() {
  const settings = useStore((s) => s.settings);
  const progress = useStore((s) => s.progress);
  const custom = useStore((s) => s.custom);
  const attempts = useStore((s) => s.attempts);
  const user = useStore((s) => s.user);
  const items = useItems();
  const { complete, addAttempt, addXp, setSettings } = useStore.getState();
  useTrackTime();

  const [stage, setStage] = useState<Stage>("setup");
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [reverse, setReverse] = useState<ReverseSession | null>(null);
  const [peerKind, setPeerKind] = useState<Kind>("coding");
  const [record, setRecord] = useState<SessionRecord | null>(null);
  const [media, setMedia] = useState<RoundMedia | undefined>(undefined);
  const [predicted, setPredicted] = useState<Decision | undefined | null>(null); // null = not answered yet
  const [scoringN, setScoringN] = useState(0); // several loop-day scorecards can run at once
  const scoring = scoringN > 0;
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [notice, setNotice] = useState("");
  const [history, setHistory] = useState<SessionRecord[]>([]);
  const [remote, setRemote] = useState<SessionRecord[]>([]);
  const [initial, setInitial] = useState<Partial<SessionConfig> | undefined>(undefined);
  const [ready, setReady] = useState(false);
  const [viewing, setViewing] = useState(false); // a past round from history: no rating
  const [drill, setDrill] = useState<{ of: SessionRecord; seq: number; comment: string; loading: boolean } | null>(null);
  const [loop, setLoop] = useState<LoopState | null>(null);
  const [lobby, setLobby] = useState<Booking | null>(null);
  const [now, setNow] = useState(0);
  const back = () => { setStage("setup"); setRecord(null); setMedia(undefined); setViewing(false); setDrill(null); setReverse(null); };
  const sessionRef = useRef<InterviewSession | null>(null);
  const recorderRef = useRef<RoundRecorder | null>(null);
  const detachRef = useRef<(() => void) | null>(null);
  const loopRef = useRef(loop);
  loopRef.current = loop;
  const drillRef = useRef(drill);
  drillRef.current = drill;
  const bookings = (settings.mockBookings ?? []) as Booking[];

  useEffect(() => {
    setHistory(loadHistory());
    void pruneMedia();
    setNow(Date.now());
    const q = new URLSearchParams(window.location.search);
    // roadmap links pass a recommended configuration
    const kind = q.get("kind") as Kind | null;
    const topics = q.get("topics")?.split(",").filter(Boolean);
    if (kind && ["coding", "hld", "lld", "behavioral"].includes(kind)) setInitial({ kind, ...(topics?.length ? { selection: { mode: "random-pool", pool: { topics } } } : {}) });
    setReady(true);
    return () => { void sessionRef.current?.stop("error"); void recorderRef.current?.stop(); };
  }, []);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  // a booking link (or an open lobby window) opens the lobby
  useEffect(() => {
    if (!ready || stage !== "setup") return;
    const id = new URLSearchParams(window.location.search).get("booking");
    const b = (id && bookings.find((x) => x.id === id && !x.startedAt)) || lobbyOpen(bookings, Date.now());
    if (b && b.at - Date.now() <= LOBBY_MS + 1000) { setLobby(b); setStage("lobby"); }
  }, [ready, now >= 0 && Math.floor(now / 15000)]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (stage === "lobby" && lobby && now >= lobby.at) {
      setSettings({ mockBookings: bookings.map((x) => (x.id === lobby.id ? { ...x, startedAt: Date.now() } : x)) });
      void launch(lobby.cfg, !!lobby.outOfCurriculum, { loopDay: !!(lobby.cfg as SessionConfig & { loopDay?: boolean }).loopDay });
    }
  }, [now, stage, lobby]); // eslint-disable-line react-hooks/exhaustive-deps

  // signed in: reconcile rounds with the cloud (push what it lacks, list what this device lacks)
  useEffect(() => {
    if (!user) { setRemote([]); return; }
    let live = true;
    syncInterviews(loadHistory().filter((r) => !r.cfg.privacy)).then((r) => { if (live) setRemote(r); }).catch(() => {});
    return () => { live = false; };
  }, [user]);

  const refresh = () => setHistory(loadHistory());
  const keep = (r: SessionRecord) => { saveRecord(r); refresh(); if (!r.cfg.privacy) void uploadRecord(r); };

  /** Route a start request to the right mode. */
  const launch = async (cfg: SessionConfig, outOfCurriculum: boolean, opts: StartOpts) => {
    if (cfg.format === "peer") { setPeerKind(cfg.kind); setStage("peer"); return; }
    if (opts.loopDay) return startLoop(cfg);
    if (cfg.format === "reverse") return startReverse(cfg, outOfCurriculum);
    return start(cfg, outOfCurriculum);
  };

  const pickQuestion = async (cfg: SessionConfig, outOfCurriculum: boolean): Promise<InterviewQuestion> => {
    const q = outOfCurriculum
      ? await generateQuestion(settings, cfg.kind, cfg.level, items.filter((i) => progress[i.id]?.status === "done").map((i) => i.title))
      : drawQuestion(cfg.kind, cfg.selection, custom, progress, cfg.seed);
    if (!q) throw new Error("No question matches. Change the pool.");
    return q;
  };

  const start = async (cfg: SessionConfig, outOfCurriculum: boolean, fixed?: InterviewQuestion) => {
    setErr(""); setNotice(""); setBusy(true);
    try {
      const eff = cfg.privacy ? privateSettings(settings) : settings;
      const within = engineWithinBudget(cfg, eff);
      if (within.note) setNotice(within.note);
      const q = fixed ?? (await pickQuestion(cfg, outOfCurriculum));
      const full = { ...cfg, engine: within.engine, coachNotes: cfg.mode === "coach" ? coachNotes(cfg.kind, history) : undefined };
      const s = new InterviewSession(full, q, eff);
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
      if (!full.privacy) detachRef.current = CloudLog.attach(s);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      void recorderRef.current?.stop(); recorderRef.current = null;
      setStage(loopRef.current ? "loop-break" : "setup"); setSession(null);
    } finally { setBusy(false); }
  };

  const score = (r: SessionRecord, s: InterviewSession, then?: (next: SessionRecord) => void) => {
    const eff = s.cfg.privacy ? privateSettings(settings) : settings;
    setScoringN((n) => n + 1);
    scoreSession(eff, s.cfg, s.state, s.log)
      .then((card) => {
        const next = { ...r, scorecard: card, model: scorecardProvenance(eff, s.cfg) };
        saveRecord(next); refresh();
        if (!s.cfg.privacy) void uploadScorecard(next);
        addAttempt(r.question.id, `mock:${s.cfg.kind}`, transcriptText(s.log), toFeedback(card));
        setRecord((cur) => (cur?.id === next.id ? { ...next, predicted: cur.predicted } : cur));
        then?.(next);
      })
      .catch((e) => setErr(`Scoring failed: ${e instanceof Error ? e.message : e}`))
      .finally(() => setScoringN((n) => n - 1));
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
      if (s.cfg.record?.cloud && audio && !s.cfg.privacy) void uploadMedia(m);
    }
    setRecord(r);
    const candidateTurns = s.log.filter((x) => x.e.type === "turn.candidate").length;
    const eff = s.cfg.privacy ? privateSettings(settings) : settings;
    const canScore = candidateTurns >= 2 && providerReady(eff, eff.provider);

    if (s.cfg.redo) { saveRecord(r); refresh(); setStage("drill-review"); void compareDrill(r); return; }

    // loop day: scorecards stay sealed until the end; a break, then the next interviewer
    if (s.cfg.loop) {
      keep(r);
      setLoop((l) => (l ? { ...l, ids: [...l.ids, r.id], cards: { ...l.cards, [r.id]: r }, breakUntil: Date.now() + l.plan.breakMin * 60000 } : l));
      if (canScore) score(r, s, (next) => setLoop((l) => (l ? { ...l, cards: { ...l.cards, [next.id]: next } } : l)));
      setStage(s.cfg.loop.index + 1 >= s.cfg.loop.total ? "loop-debrief" : "loop-break");
      return;
    }

    keep(r);
    if (!canScore) { setStage(candidateTurns < 2 ? "review" : "predict"); return; }
    setStage("predict");
    score(r, s);
  };

  // ---- loop day ----
  const startLoop = async (base: SessionConfig) => {
    const plan = defaultLoop(base.level, crypto.randomUUID());
    const l: LoopState = { plan, base, seed: base.seed, index: 0, ids: [], cards: {}, breakUntil: 0 };
    setLoop(l);
    await startLoopRound(l, 0);
  };
  const startLoopRound = async (l: LoopState, index: number) => {
    setLoop({ ...l, index });
    const ai = getAi(settings);
    const voiceProvider = l.base.engine === "realtime" ? ai.realtime.provider : undefined;
    await start(roundConfig(l.base, l.plan, index, l.seed, voiceProvider), false);
  };
  useEffect(() => {
    if (stage !== "loop-debrief" || !loop || loop.committee || loop.deciding) return;
    const outcomes = loop.plan.rounds.map((r, i) => ({ title: r.title, kind: r.kind, card: loop.cards[loop.ids[i]]?.scorecard }));
    if (scoring) return; // wait for the last scorecard
    const rule = committeeDecision(outcomes);
    if (!providerReady(settings, settings.provider) || !rule) { setLoop({ ...loop, committee: rule ? { decision: rule, level: "", summary: "", concerns: [], next: [], rule } : undefined }); return; }
    setLoop({ ...loop, deciding: true });
    const p = committeePrompt(loop.plan, outcomes, loop.base.prompts);
    runTask(settings, "committee", p.system, [{ role: "user", content: p.user }])
      .then((t) => setLoop((x) => (x ? { ...x, committee: parseCommittee(t, rule), deciding: false } : x)))
      .catch(() => setLoop((x) => (x ? { ...x, committee: { decision: rule, level: "", summary: "", concerns: [], next: [], rule }, deciding: false } : x)));
  }, [stage, loop, scoring]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- reverse mode ----
  const startReverse = async (cfg: SessionConfig, outOfCurriculum: boolean) => {
    setErr(""); setBusy(true);
    try {
      const eff = cfg.privacy ? privateSettings(settings) : settings;
      const q = await pickQuestion(cfg, outOfCurriculum);
      const r = new ReverseSession({ ...cfg, engine: engineWithinBudget(cfg, eff).engine }, q, eff);
      await r.start();
      setReverse(r); setStage("reverse");
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); setStage("setup"); }
    finally { setBusy(false); }
  };
  const reverseDone = (r: ReverseSession, res: ReverseResult) => {
    const log = r.toLog();
    const rec: SessionRecord = {
      id: r.id, at: r.startedAt || Date.now(), cfg: r.cfg, question: r.question, tone: "neutral",
      persona: { name: r.name, role: "AI candidate", team: "", years: 0, likes: "", dislikes: "", advice: "" },
      picked: r.cfg.selection.mode === "exact", log, finalDigests: {}, stats: deliveryStats(log), hints: 0, engine: r.cfg.engine, endedAt: Date.now(),
      extra: { reverse: { planted: r.planted.map((m) => m.id), feedback: res.feedback, grade: res.grade } },
    };
    keep(rec);
    addXp(80, "Reverse mock: interviewed an AI candidate");
  };

  const pick = (d: Decision | undefined) => {
    setPredicted(d);
    setRecord((cur) => { if (!cur) return cur; const next = { ...cur, predicted: d }; saveRecord(next); if (next.scorecard && !next.cfg.privacy) void uploadScorecard(next); return next; });
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
      ...of.cfg, minutes: 5, redo: rd, arc: { intro: false, aboutYou: false, curveball: false, questionsForMe: false }, layout: "desk",
      curveballs: { frequency: "none", disabled: [] }, record: { audio: false, cloud: false }, loop: undefined, tone: of.tone, seed: of.cfg.seed,
    };
    void start(cfg, false, of.question);
  };

  const compareDrill = async (r: SessionRecord) => {
    const d = drillRef.current;
    if (!d || !providerReady(settings, settings.provider)) return;
    setDrill((x) => (x ? { ...x, loading: true } : x));
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

  // ---- bookings ----
  const book = (cfg: SessionConfig, outOfCurriculum: boolean, at: number, opts: StartOpts) => {
    const b: Booking = { id: crypto.randomUUID(), at, title: `Mock interview: ${opts.loopDay ? "loop day" : cfg.format === "reverse" ? "reverse" : cfg.kind}`, cfg: { ...cfg, ...(opts.loopDay ? { loopDay: true } : {}) } as SessionConfig, outOfCurriculum, createdAt: Date.now() };
    setSettings({ mockBookings: [...bookings.filter((x) => x.at + 86400000 > Date.now()), b] });
    setNotice(`Booked for ${new Date(at).toLocaleString()}. Keep Ascent open in a tab; it reminds you and opens the lobby a few minutes before.`);
    try { if (typeof Notification !== "undefined" && Notification.permission === "default") void Notification.requestPermission(); } catch { /* unavailable */ }
    downloadIcs(b);
  };
  const cancelBooking = (id: string) => setSettings({ mockBookings: bookings.filter((x) => x.id !== id) });

  // ---- render ----
  if (stage === "lobby" && lobby) {
    const wait = Math.max(0, Math.round((lobby.at - now) / 1000));
    return (
      <div className="mx-auto max-w-xl space-y-5 py-10 text-center">
        <PageHead eyebrow="Lobby" title={lobby.title} sub={`Starts at ${new Date(lobby.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}. Your interviewer will join on time.`} />
        <div className="num font-mono text-5xl font-semibold">{fmtClock(wait)}</div>
        <p className="text-[13.5px] leading-relaxed text-mute">Use the minutes the way you would before a real one: water, a quiet room, headphones, a pen. Close other tabs. Breathe out slowly a few times.</p>
        <div className="flex justify-center gap-2"><Button variant="primary" onClick={() => { setSettings({ mockBookings: bookings.map((x) => (x.id === lobby.id ? { ...x, startedAt: Date.now() } : x)) }); void launch(lobby.cfg, !!lobby.outOfCurriculum, { loopDay: !!(lobby.cfg as SessionConfig & { loopDay?: boolean }).loopDay }); }}>Start now</Button><Button variant="ghost" onClick={() => { setLobby(null); setStage("setup"); }}>Not now</Button></div>
      </div>
    );
  }

  if (stage === "peer") return <PeerRoom settings={settings} custom={custom} progress={progress} kind={peerKind} onSaved={keep} onLeave={back} />;

  if (stage === "reverse" && reverse) return (
    <div className="space-y-4">
      <ReverseRoom session={reverse} settings={settings} onDone={(res) => reverseDone(reverse, res)} />
      <Button variant="ghost" onClick={() => { void reverse.stop(); back(); }}>Back to setup</Button>
    </div>
  );

  if (stage === "live" && session) return (
    <>
      {notice && <p className="mb-3 rounded-xl border border-warn/30 bg-warn/10 p-2.5 text-[13px] text-warn">{notice}</p>}
      {session.cfg.loop && <p className="mb-3 text-[12.5px] text-faint">Loop day: round {session.cfg.loop.index + 1} of {session.cfg.loop.total} · {loop?.plan.rounds[session.cfg.loop.index]?.title}</p>}
      <Room session={session} settings={settings} onEnd={() => {}} />
    </>
  );

  if ((stage === "loop-break" || stage === "loop-debrief") && loop) {
    const doneRounds = loop.ids.length;
    if (stage === "loop-break") {
      const wait = Math.max(0, Math.round((loop.breakUntil - now) / 1000));
      const next = loop.plan.rounds[doneRounds];
      return (
        <div className="mx-auto max-w-xl space-y-5 py-10 text-center">
          <PageHead eyebrow={`Loop day · ${doneRounds} of ${loop.plan.rounds.length} done`} title="Break" sub={next ? `Next: ${next.title} (${next.minutes} min) with a different interviewer.` : undefined} />
          {err && <p role="alert" className="text-[13px] text-bad">{err}</p>}
          <div className="num font-mono text-5xl font-semibold">{fmtClock(wait)}</div>
          <p className="text-[13.5px] text-mute">Stand up, drink water, and let the last round go: each interviewer only sees their own round. Feedback stays sealed until the end.</p>
          <div className="flex justify-center gap-2"><Button variant="primary" disabled={busy} onClick={() => void startLoopRound(loop, doneRounds)}>{wait ? "Start the next round now" : "Start the next round"}</Button><Button variant="ghost" onClick={() => setStage("loop-debrief")}>End the loop here</Button></div>
        </div>
      );
    }
    const c = loop.committee;
    return (
      <div className="space-y-5">
        <PageHead eyebrow="Loop day · hiring committee" title={c ? DECISION_LABEL[c.decision] : "The committee is reading your packet"} sub={c?.summary || `${doneRounds} round${doneRounds === 1 ? "" : "s"} at the ${loop.plan.level} bar.`} />
        {(!c || scoring) && <div className="card p-5"><Spinner label={scoring ? "Waiting for the last scorecard" : "Deciding"} /></div>}
        {c && (c.concerns.length > 0 || c.next.length > 0) && (
          <div className="grid gap-4 md:grid-cols-2">
            {c.concerns.length > 0 && <div className="card p-4"><div className="eyebrow mb-2">Concerns</div><ul className="space-y-1 text-[13.5px]">{c.concerns.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
            {c.next.length > 0 && <div className="card p-4"><div className="eyebrow mb-2">Before the real loop</div><ul className="space-y-1 text-[13.5px]">{c.next.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
          </div>
        )}
        {c?.rule && c.rule !== c.decision && <p className="text-[12.5px] text-faint">The deterministic committee rule gives {DECISION_LABEL[c.rule]}; the AI committee weighed the evidence differently.</p>}
        <section className="card overflow-hidden"><ul className="divide-y divide-line/60">{loop.plan.rounds.map((r, i) => {
          const rec = loop.cards[loop.ids[i]];
          return (
            <li key={i}><button disabled={!rec} className="flex w-full items-center gap-3 px-5 py-3 text-left text-[13.5px] hover:bg-white/[0.025] disabled:opacity-50" onClick={() => rec && void open(rec)}>
              <span className="w-8 text-faint">{i + 1}</span><span className="min-w-0 flex-1">{r.title}{rec && <span className="text-mute"> · {rec.question.title} · {rec.persona.name}</span>}</span>
              <span className="text-[12.5px] text-mute">{rec ? (rec.scorecard ? DECISION_LABEL[rec.scorecard.decision] : "not scored") : "not taken"}</span>
            </button></li>
          );
        })}</ul></section>
        <Button onClick={() => { setLoop(null); back(); }}>Done</Button>
      </div>
    );
  }

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
    const rev = record.extra?.reverse as { planted: string[]; feedback: ReverseFeedback; grade: ReverseGrade } | undefined;
    const peerFb = record.extra?.peerFeedback as { decision: string; notes: string } | undefined;
    return (
      <div className="space-y-5">
        <PageHead eyebrow={record.cfg.format === "reverse" ? "Reverse mode" : record.cfg.format === "peer" ? "Peer mock" : "Debrief"} title={record.question.title} sub={`${Math.max(1, Math.round(record.stats.minutes || 0))} minute${Math.round(record.stats.minutes || 0) > 1 ? "s" : ""} with ${record.persona.name}.`} />
        {err && <p role="alert" className="rounded-xl border border-bad/30 bg-bad/10 p-3 text-[13px] text-bad">{err}</p>}
        {rev && <ReverseDebrief name={record.persona.name} kind={record.cfg.kind} feedback={rev.feedback} grade={rev.grade} planted={rev.planted} />}
        {peerFb && <div className="card p-5"><div className="eyebrow">{record.persona.name}&apos;s feedback</div><div className="mt-1 font-semibold">{DECISION_LABEL[peerFb.decision as Decision] ?? peerFb.decision}</div><div className="mt-2 text-[13.5px]"><Md>{peerFb.notes}</Md></div></div>}
        {stage === "predict" && <PredictDecision onPick={pick} />}
        {stage === "review" && !rev && (scoring ? <div className="card p-5 text-[14px] text-mute"><Spinner label="The committee is reading the transcript" /></div>
          : card ? <ScorecardView r={{ ...record, predicted: predicted ?? undefined }} />
          : <div className="card p-5 text-[13.5px] text-mute">{record.log.filter((x) => x.e.type === "turn.candidate").length < 2 ? "Too short to score: the interviewer needs at least two of your replies." : "No AI provider is connected, so there is no scorecard."} Rate yourself below, at least as strictly as an interviewer would.</div>)}
        {stage === "review" && record.log.length > 0 && <Replay record={record} media={media} onRedo={record.cfg.redo || rev || record.cfg.format === "peer" ? undefined : (seq) => redo(record, seq)} />}
        {stage === "review" && !scoring && !viewing && !rev && <RatingBar suggested={card ? (d >= 5 ? 3 : d >= 4 ? 2 : d >= 3 ? 1 : 0) : undefined} onRate={rate} />}
        {(viewing || rev) && <Button onClick={back}>Back to setup</Button>}
      </div>
    );
  }

  const done = mockSlots(settings.weeks).filter((m) => progress[m.id]?.status === "done").length;
  const all = mergeHistory(history, remote);
  const soon = now ? upcoming(bookings, now) : [];
  const lost = now ? missed(bookings, now).filter((b) => b.at > now - 7 * 86400000) : [];
  return (
    <div>
      <PageHead eyebrow="Dress rehearsal" title="Mock interview" sub="A timed round, by voice or text, with an interviewer who underspecifies the question, follows your whiteboard and code, cuts in when something is off, and writes the feedback a hiring committee would read." right={<Pill color="var(--color-accent)">{done} of {mockSlots(settings.weeks).length} planned mocks done</Pill>} />
      {err && <p role="alert" className="mb-4 rounded-xl border border-bad/30 bg-bad/10 p-3 text-[13px] text-bad">{err} <button className="underline" onClick={() => setErr("")}>Dismiss</button></p>}
      {notice && <p className="mb-4 rounded-xl border border-warn/30 bg-warn/10 p-3 text-[13px] text-warn">{notice}</p>}
      {(soon.length > 0 || lost.length > 0) && (
        <section className="card mb-5 overflow-hidden">
          <div className="flex items-center gap-2 border-b border-line px-5 py-3"><CalendarClock size={15} className="text-mute" /><div className="eyebrow">Booked mocks</div></div>
          <ul className="divide-y divide-line/60">
            {soon.map((b) => <li key={b.id} className="flex items-center gap-3 px-5 py-2.5 text-[13.5px]"><span className="min-w-0 flex-1">{b.title}</span><span className="text-mute">{new Date(b.at).toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span><button title="Download calendar file" onClick={() => downloadIcs(b)} className="text-faint hover:text-text"><Download size={14} /></button><button title="Cancel" onClick={() => cancelBooking(b.id)} className="text-faint hover:text-bad"><Trash2 size={14} /></button></li>)}
            {lost.map((b) => <li key={b.id} className="flex items-center gap-3 px-5 py-2.5 text-[13px] text-faint"><span className="min-w-0 flex-1">Missed: {b.title}, {new Date(b.at).toLocaleString()}</span><button onClick={() => cancelBooking(b.id)} className="hover:text-text">Dismiss</button></li>)}
          </ul>
        </section>
      )}
      {ready && <Setup key={JSON.stringify(initial ?? {})} settings={settings} progress={progress} custom={custom} attempts={attempts} items={items} initial={initial} onStart={(c, o, x) => void launch(c, o, x)} onBook={book} busy={busy} />}
      {all.length > 0 && (
        <section className="card mt-6 overflow-hidden">
          <div className="flex items-center gap-2 border-b border-line px-5 py-3"><History size={15} className="text-mute" /><div className="eyebrow">Past rounds</div>{remote.length > 0 && <span className="text-[11.5px] text-faint">including {remote.length} from your other devices</span>}</div>
          <ul className="divide-y divide-line/60">{all.slice(0, 15).map((h) => (
            <li key={h.id}><button disabled={busy} className="flex w-full items-center gap-3 px-5 py-3 text-left text-[13.5px] hover:bg-white/[0.025]" onClick={() => void open(h)}>
              <span className="min-w-0 flex-1 truncate">{h.question.title}</span>
              {h.remote && <Cloud size={13} className="text-faint" aria-label="from the cloud" />}
              {h.cfg.redo && <Pill className="border-line text-faint">drill</Pill>}
              {h.cfg.loop && <Pill className="border-line text-faint">loop {h.cfg.loop.index + 1}/{h.cfg.loop.total}</Pill>}
              {h.cfg.format && h.cfg.format !== "standard" && <Pill className="border-line text-faint">{h.cfg.format}</Pill>}
              {h.cfg.privacy && <Pill className="border-line text-faint">private</Pill>}
              {h.picked && <Pill className="border-line text-faint">picked</Pill>}
              <Pill className="border-line text-mute">{h.cfg.kind}</Pill>
              <span className="w-32 text-right text-[12.5px] text-mute">{h.scorecard ? DECISION_LABEL[h.scorecard.decision] : (h.extra?.reverse as { grade?: ReverseGrade } | undefined)?.grade ? `caught ${(h.extra!.reverse as { grade: ReverseGrade }).grade.caught.filter((c) => c.caught).length}` : "not scored"}</span>
              <span className="num w-24 text-right text-[12px] text-faint">{new Date(h.at).toLocaleDateString()}</span>
            </button></li>
          ))}</ul>
        </section>
      )}
    </div>
  );
}
