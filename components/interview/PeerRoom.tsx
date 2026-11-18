"use client";
// Peer mode (MI-X-2): lobby (create or join a room, choose a role, consent), the call, and the debrief
// (the interviewer's written feedback plus the AI observer's scorecard for the candidate).
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { Brain, Copy, Flag, Mic, MicOff, Presentation, Send, TimerReset, Users } from "lucide-react";
import { Button, Md, Pill, cn, fmtClock } from "@/components/ui";
import { Spinner } from "@/components/Work";
import type { Problem, Progress, Settings } from "@/lib/types";
import { CONSENT_TEXT, normaliseCode, roomCode, validCode, type PeerRole } from "@/lib/interview/core/peer";
import { DECISIONS, DECISION_LABEL, DIMENSIONS } from "@/lib/interview/core/scoring";
import { initBrain } from "@/lib/interview/core/brain";
import type { Kind, SessionConfig } from "@/lib/interview/core/types";
import { PeerSession, type PeerView } from "@/lib/interview/peer-session";
import { allQuestions, drawQuestion } from "@/lib/interview/questions";
import { makeRecord, scoreSession, type SessionRecord } from "@/lib/interview/results";
import { getAi, providerReady } from "@/lib/interview/tasks";
import { cloudEnabled } from "@/lib/supabase";
import { KINDS, baseConfig } from "./Setup";
import { ScorecardView } from "./Scorecard";
import type { WhiteboardHandle } from "./WhiteboardCanvas";

const Whiteboard = dynamic(() => import("./WhiteboardCanvas"), { ssr: false });
const Board = dynamic(() => import("./ReplayBoard"), { ssr: false });

export function PeerRoom({ settings, custom, progress, kind, onSaved, onLeave }: {
  settings: Settings; custom: Problem[]; progress: Record<string, Progress>; kind: Kind;
  onSaved: (r: SessionRecord) => void; onLeave: () => void;
}) {
  const [session, setSession] = useState<PeerSession | null>(null);
  const [v, setV] = useState<PeerView | null>(null);
  const [role, setRole] = useState<PeerRole>("candidate");
  const [joinCode, setJoinCode] = useState("");
  const [consent, setConsent] = useState(false);
  const [name, setName] = useState(settings.name || "");
  const [err, setErr] = useState("");
  const [qid, setQid] = useState("");
  const [minutes, setMinutes] = useState(KINDS.find((k) => k.id === kind)!.min);
  const [input, setInput] = useState("");
  const [code, setCode] = useState(""), [notes, setNotes] = useState("");
  const [left, setLeft] = useState(0);
  const [fb, setFb] = useState({ decision: "leaning_hire", notes: "" });
  const [sent, setSent] = useState(false);
  const [record, setRecord] = useState<SessionRecord | null>(null);
  const [scoring, setScoring] = useState(false);
  const [tab, setTab] = useState<"board" | "notes">("board");
  const board = useRef<WhiteboardHandle | null>(null);
  const questions = useMemo(() => allQuestions(kind, custom), [kind, custom]);
  const lang = getAi(settings).speech.lang;

  useEffect(() => (session ? session.subscribe(setV) : undefined), [session]);
  useEffect(() => () => { void session?.leave(); }, [session]);
  useEffect(() => {
    if (!v || v.stage !== "live") return;
    const t = setInterval(() => setLeft(Math.max(0, v.minutes * 60 - Math.round((Date.now() - v.startedAt) / 1000))), 500);
    return () => clearInterval(t);
  }, [v?.stage, v?.minutes, v?.startedAt]); // eslint-disable-line react-hooks/exhaustive-deps
  // the candidate shares the workspace as they type
  useEffect(() => { if (session && role === "candidate" && v?.stage === "live") { const t = setTimeout(() => session.shareDoc("code", code), 600); return () => clearTimeout(t); } }, [code]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (session && role === "candidate" && v?.stage === "live") { const t = setTimeout(() => session.shareDoc("notes", notes), 600); return () => clearTimeout(t); } }, [notes]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = async (host: boolean) => {
    setErr("");
    const c = host ? roomCode() : normaliseCode(joinCode);
    if (!host && !validCode(c)) { setErr("That code doesn't look right: it is six letters and digits."); return; }
    const q = role === "interviewer" ? (questions.find((x) => x.id === qid) ?? drawQuestion(kind, { mode: "random-all", preferUnseen: false }, custom, progress, Date.now() % 100000)) : undefined;
    const s = new PeerSession({ role, code: c, host, name, lang, question: q ?? undefined, minutes });
    try { await s.join(); setSession(s); } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
  };

  /** The candidate's browser drafts the AI observer's scorecard from its own copy of the transcript. */
  const finish = async (s: PeerSession, st: PeerView) => {
    const q = st.question;
    if (!q) return;
    const cfg: SessionConfig = { ...baseConfig(q.kind, "text"), format: "peer", minutes: st.minutes, tone: "neutral", seed: 1 };
    const brain = initBrain(cfg, q, st.startedAt);
    const digests: SessionRecord["finalDigests"] = {};
    for (const { e } of s.log) if (e.type === "digest") digests[e.surface] = e.full;
    const state = { ...brain, digests };
    const r: SessionRecord = { ...makeRecord(cfg, state, s.log), persona: { name: st.peerName || "your partner", role: "peer interviewer", team: "", years: 0, likes: "", dislikes: "", advice: "" }, extra: { peer: { role: s.role, partner: st.peerName } } };
    setRecord(r);
    if (role !== "candidate" || !providerReady(settings, settings.provider) || s.log.filter((x) => x.e.type === "turn.candidate").length < 2) { onSaved(r); return; }
    setScoring(true);
    try { const card = await scoreSession(settings, cfg, state, s.log); const next = { ...r, scorecard: card }; setRecord(next); onSaved(next); }
    catch (e) { setErr(`Scoring failed: ${e instanceof Error ? e.message : e}`); onSaved(r); }
    finally { setScoring(false); }
  };
  useEffect(() => { if (session && v?.stage === "ended" && !record) void finish(session, v); }, [v?.stage]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (record && v?.feedback) { const next = { ...record, extra: { ...record.extra, peerFeedback: v.feedback } }; setRecord(next); onSaved(next); } }, [v?.feedback]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!cloudEnabled) return <div className="card p-5 text-[13.5px] text-mute">Peer mode needs Ascent&apos;s cloud connection for setting up the call. It is not configured in this deployment.</div>;

  // ---- lobby ----
  if (!session || !v) return (
    <section className="card space-y-5 p-5">
      <div className="flex items-center gap-2"><Users size={16} className="text-accent" /><div className="eyebrow">Peer mock: interview each other</div></div>
      <p className="text-[13px] leading-relaxed text-mute">A direct call between two browsers. The interviewer gets the question and a packet; the candidate gets a whiteboard and doc that the interviewer can see. Each browser transcribes its own microphone, and at the end an AI observer drafts the candidate&apos;s scorecard from the transcript, using the candidate&apos;s own AI key. Audio is not recorded.</p>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-[13px] text-mute">Your name<input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-line bg-bg px-3 text-sm outline-none focus:border-accent/60" /></label>
        <div><div className="mb-1 text-[13px] text-mute">Your role</div><div className="flex gap-2">{(["candidate", "interviewer"] as const).map((r) => <button key={r} onClick={() => setRole(r)} aria-pressed={role === r} className={cn("rounded-xl border px-3 py-1.5 text-[13px] capitalize", role === r ? "border-accent/60 bg-accent/10 text-accent" : "border-line text-mute")}>{r}</button>)}</div></div>
      </div>
      {role === "interviewer" && (
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-[13px] text-mute">Question
            <select value={qid} onChange={(e) => setQid(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-line bg-bg px-2 text-sm"><option value="">Random {KINDS.find((k) => k.id === kind)!.label.toLowerCase()} question</option>{questions.map((q) => <option key={q.id} value={q.id}>{q.title}</option>)}</select>
          </label>
          <label className="block text-[13px] text-mute">Length: {minutes} min<input type="range" min={15} max={60} step={5} value={minutes} onChange={(e) => setMinutes(+e.target.value)} className="mt-3 w-full" /></label>
        </div>
      )}
      <label className="flex cursor-pointer items-start gap-2 text-[13px] text-mute"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 accent-[var(--color-accent)]" />{CONSENT_TEXT}</label>
      {err && <p role="alert" className="text-[13px] text-bad">{err}</p>}
      <div className="flex flex-wrap items-end gap-3">
        <Button variant="primary" disabled={!consent || !name.trim()} onClick={() => void go(true)}>Create a room</Button>
        <span className="text-[12.5px] text-faint">or</span>
        <input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="Room code" aria-label="Room code" className="h-9 w-36 rounded-lg border border-line bg-bg px-3 font-mono text-sm uppercase tracking-widest outline-none focus:border-accent/60" />
        <Button disabled={!consent || !name.trim() || !joinCode.trim()} onClick={() => void go(false)}>Join</Button>
        <Button variant="ghost" onClick={onLeave}>Back</Button>
      </div>
      <p className="text-[12px] text-faint">Most networks connect directly. If yours blocks it, add a TURN relay in Settings → Voice and AI quality.</p>
    </section>
  );

  const other: PeerRole = role === "interviewer" ? "candidate" : "interviewer";
  const q = v.question;
  const dims = q ? DIMENSIONS[q.kind] : [];

  // ---- debrief ----
  if (v.stage === "ended") return (
    <div className="space-y-5">
      {role === "interviewer" && (
        <div className="card p-5">
          <div className="eyebrow">Your feedback for {v.peerName || "the candidate"}</div>
          <div className="mt-3 flex flex-wrap gap-1.5">{DECISIONS.map((d) => <button key={d} onClick={() => setFb({ ...fb, decision: d })} aria-pressed={fb.decision === d} className={cn("rounded-xl border px-3 py-1.5 text-[12.5px]", fb.decision === d ? "border-accent/60 bg-accent/10 text-accent" : "border-line text-mute")}>{DECISION_LABEL[d]}</button>)}</div>
          <textarea value={fb.notes} onChange={(e) => setFb({ ...fb, notes: e.target.value })} rows={6} placeholder={`What went well and what to improve, with moments. Rubric: ${dims.map((d) => d.label).join(", ")}.`} className="mt-3 w-full rounded-xl border border-line bg-bg p-3 text-[13.5px] outline-none focus:border-accent/60" />
          <div className="mt-2 flex gap-2"><Button variant="primary" disabled={sent || fb.notes.trim().length < 10} onClick={() => { session.sendFeedback(fb.decision, fb.notes); setSent(true); if (record) onSaved({ ...record, extra: { ...record.extra, peerFeedback: fb } }); }}>{sent ? "Sent" : "Send to the candidate"}</Button><Button variant="ghost" onClick={() => { void session.leave(); onLeave(); }}>Leave</Button></div>
        </div>
      )}
      {role === "candidate" && (
        <>
          {v.feedback ? <div className="card p-5"><div className="eyebrow">{v.peerName}&apos;s feedback</div><div className="mt-1 text-lg font-semibold">{DECISION_LABEL[v.feedback.decision as keyof typeof DECISION_LABEL] ?? v.feedback.decision}</div><div className="mt-2 text-[13.5px] leading-relaxed"><Md>{v.feedback.notes}</Md></div></div>
            : <div className="card p-4 text-[13px] text-mute">Waiting for {v.peerName || "your interviewer"}&apos;s written feedback…</div>}
          {scoring ? <div className="card p-5"><Spinner label="The AI observer is drafting your scorecard" /></div> : record?.scorecard ? <ScorecardView r={record} /> : <div className="card p-4 text-[13px] text-mute">{providerReady(settings, settings.provider) ? "Too little was transcribed to score." : "Connect an AI provider for the AI observer's scorecard."}</div>}
          <Button variant="ghost" onClick={() => { void session.leave(); onLeave(); }}>Leave</Button>
        </>
      )}
      {err && <p role="alert" className="text-[13px] text-bad">{err}</p>}
    </div>
  );

  // ---- waiting and live ----
  const send = () => { if (input.trim()) { session.say(input); setInput(""); } };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Pill color="var(--color-accent)">Peer · you are the {role}</Pill>
          <button onClick={() => void navigator.clipboard?.writeText(session.code)} className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1 font-mono text-[12.5px] tracking-widest text-mute hover:text-text" title="Copy the room code"><Copy size={12} />{session.code}</button>
          <span className="text-[13px] text-mute">{v.peerName ? `with ${v.peerName} (${other})` : "waiting for your partner"}</span>
          {v.status && <span className="text-[12.5px] text-warn">{v.status}</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("flex h-9 items-center gap-2 rounded-xl border px-3 text-[12.5px]", v.remoteSpeaking ? "border-hld/50 text-hld" : v.speaking ? "border-ok/50 text-ok" : "border-line text-faint")}>{v.remoteSpeaking ? `${v.peerName} is speaking` : v.speaking ? "You are speaking" : "Quiet"}</span>
          {v.stage === "live" && <div className={cn("num flex h-9 items-center gap-2 rounded-xl border px-3 font-mono text-[13px]", left <= 300 ? "border-warn/50 text-warn" : "border-line text-mute")}><TimerReset size={14} />{fmtClock(left)}</div>}
          <Button size="sm" onClick={() => session.mute(!v.muted)}>{v.muted ? <MicOff size={14} /> : <Mic size={14} />}{v.muted ? "Unmute" : "Mute"}</Button>
          {role === "interviewer" && v.stage === "ready" && q && <Button size="sm" variant="primary" onClick={() => session.start(q, v.minutes)}>Start the round</Button>}
          {role === "candidate" && v.stage === "live" && <Button size="sm" onClick={() => session.thinking(true)}><Brain size={14} />Minute to think</Button>}
          {v.stage === "live" && <Button size="sm" variant="danger" onClick={() => void session.end()}><Flag size={14} />End</Button>}
        </div>
      </div>
      {(v.error || err) && <p role="alert" className="rounded-xl border border-bad/30 bg-bad/10 p-2.5 text-[13px] text-bad">{v.error || err}</p>}
      {v.stage !== "live" && <div className="card p-5 text-[13.5px] text-mute">{v.peerName ? (role === "interviewer" ? `${v.peerName} has joined and agreed to the AI observer. Start the round when you are both ready.` : `${v.peerName} has joined. The interviewer will start the round.`) : <Spinner label={session.host ? `Waiting for your partner to join with code ${session.code}` : "Connecting"} />}</div>}
      {v.stage === "live" && left > 0 && left <= 300 && <p className="rounded-xl border border-warn/30 bg-warn/10 p-2 text-[13px] text-warn">{Math.ceil(left / 60)} minute{left > 60 ? "s" : ""} left.</p>}

      {v.stage === "live" && (
        <div className={cn("grid gap-4", q?.kind !== "behavioral" && "xl:grid-cols-[minmax(320px,2fr)_3fr]")}>
          <section className="card flex h-[600px] flex-col overflow-hidden">
            <div className="flex-1 space-y-2.5 overflow-y-auto p-4" aria-live="polite">
              {role === "candidate" && v.presented && <div className="rounded-xl border border-hld/30 bg-hld/5 p-3 text-[13.5px]"><div className="eyebrow mb-1">The question</div>{v.presented}</div>}
              {v.lines.map((l) => <div key={l.seq} className={cn("max-w-[90%] rounded-2xl px-3.5 py-2 text-[13.5px] leading-relaxed", l.role === role ? "ml-auto border border-accent/25 bg-accent/10" : "border border-line bg-panel2")}><div className="mb-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-faint">{l.role === role ? "You" : v.peerName}</div>{l.text}</div>)}
              {(["interviewer", "candidate"] as const).map((r) => v.partial[r] ? <div key={r} className={cn("max-w-[90%] rounded-2xl border border-dashed px-3.5 py-2 text-[13.5px] italic text-mute", r === role ? "ml-auto border-accent/30" : "border-line")}>{v.partial[r]}</div> : null)}
            </div>
            <div className="border-t border-line p-3">
              <div className="flex gap-2"><input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} placeholder="Type a line (if speech recognition missed it)" className="h-9 flex-1 rounded-lg border border-line bg-bg px-3 text-[13.5px] outline-none focus:border-accent/60" /><Button size="sm" onClick={send}><Send size={14} /></Button></div>
            </div>
          </section>
          {q?.kind !== "behavioral" && (
            <section className="card flex h-[600px] flex-col gap-3 overflow-hidden p-3">
              {role === "interviewer" && q && (
                <div className="max-h-48 overflow-y-auto rounded-xl border border-line bg-panel2 p-3 text-[13px]">
                  <div className="flex items-center justify-between"><div className="eyebrow">Your packet: {q.title}</div><Button size="sm" variant="ghost" onClick={() => session.present()}><Presentation size={13} />Show the question</Button></div>
                  <p className="mt-1 leading-relaxed">{q.statement}</p>
                  {q.constraints && <p className="mt-1 text-mute">Numbers, if asked: {q.constraints}</p>}
                  {q.followUps.length > 0 && <p className="mt-1 text-mute">Follow-ups: {q.followUps.join(" · ")}</p>}
                  <details className="mt-1 text-mute"><summary className="cursor-pointer">Reference</summary><Md>{q.reference || "None."}</Md></details>
                </div>
              )}
              <div className="min-h-0 flex-1">
                {q?.kind === "coding" ? (
                  role === "candidate"
                    ? <textarea value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false} placeholder="Write your code here." className="h-full w-full resize-none rounded-xl border border-line bg-[#f7f7f5] p-4 font-mono text-[13px] text-[#1f1f1f] outline-none" aria-label="Shared doc" />
                    : <pre className="h-full overflow-auto whitespace-pre-wrap rounded-xl border border-line bg-[#f7f7f5] p-4 font-mono text-[13px] text-[#1f1f1f]">{v.code || "The candidate's code appears here."}</pre>
                ) : (
                  <div className="flex h-full flex-col">
                    <div className="mb-2 flex gap-1">{(["board", "notes"] as const).map((t) => <button key={t} onClick={() => setTab(t)} className={cn("rounded-lg px-3 py-1 text-[12.5px]", tab === t ? "bg-panel2 text-text" : "text-mute")}>{t === "board" ? "Whiteboard" : "Notes"}</button>)}</div>
                    <div className="min-h-0 flex-1">
                      {tab === "board" ? (role === "candidate"
                        ? <Whiteboard handle={(h) => (board.current = h)} onElements={(els) => session.shareBoard(els)} onDigest={(d, _s, els) => session.shareBoard(els, d)} />
                        : <Board elements={v.board} />)
                        : role === "candidate"
                          ? <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="h-full w-full resize-none rounded-xl border border-line bg-bg p-3 font-mono text-[13px] outline-none" aria-label="Notes" />
                          : <pre className="h-full overflow-auto whitespace-pre-wrap rounded-xl border border-line bg-bg p-3 font-mono text-[13px]">{v.notes || "The candidate's notes appear here."}</pre>}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
