"use client";
// Reverse mode (MI-X-1): you interview an AI candidate, write the feedback, then see which planted
// mistakes you caught.
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Flag, Mic, MicOff, Send, TimerReset, X } from "lucide-react";
import { Button, Md, Pill, cn, fmtClock } from "@/components/ui";
import { Spinner } from "@/components/Work";
import type { Settings } from "@/lib/types";
import { DECISIONS, DECISION_LABEL, DIMENSIONS, type Decision } from "@/lib/interview/core/scoring";
import { MISTAKES, expectedDecision, gradeOffline, gradePrompt, parseGrade, type ReverseFeedback, type ReverseGrade } from "@/lib/interview/core/reverse";
import type { ReverseSession, ReverseView } from "@/lib/interview/reverse-session";
import { ENGINE_INFO } from "@/lib/interview/engines/registry";
import { providerReady, runTask } from "@/lib/interview/tasks";
import { KINDS } from "./Setup";

export interface ReverseResult { feedback: ReverseFeedback; grade: ReverseGrade }

export function ReverseRoom({ session, settings, onDone }: { session: ReverseSession; settings: Settings; onDone: (r: ReverseResult) => void }) {
  const [v, setV] = useState<ReverseView | null>(null);
  const [input, setInput] = useState("");
  const [left, setLeft] = useState(session.cfg.minutes * 60);
  const [fb, setFb] = useState<ReverseFeedback>({ decision: "leaning_hire", scores: {}, notes: "" });
  const [grading, setGrading] = useState(false);
  const [grade, setGrade] = useState<ReverseGrade | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const cfg = session.cfg, q = session.question;
  const meta = KINDS.find((k) => k.id === cfg.kind)!;
  const dims = DIMENSIONS[cfg.kind];

  useEffect(() => session.subscribe(setV), [session]);
  useEffect(() => {
    const t = setInterval(() => {
      const l = Math.max(0, cfg.minutes * 60 - Math.round(session.now() / 1000));
      setLeft(l);
      if (l === 0) void session.stop();
    }, 500);
    return () => clearInterval(t);
  }, [session, cfg.minutes]);
  useEffect(() => { const el = scroller.current; if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" }); }, [v?.lines.length, v?.aiPartial, v?.youPartial]);

  const submit = async () => {
    setGrading(true);
    let g: ReverseGrade;
    if (providerReady(settings, settings.provider)) {
      try {
        const p = gradePrompt(fb, session.planted, session.transcript(), cfg.prompts);
        g = parseGrade(await runTask(settings, "reverse.grade", p.system, [{ role: "user", content: p.user }]), fb, session.planted);
      } catch { g = gradeOffline(fb, session.planted); }
    } else g = gradeOffline(fb, session.planted);
    setGrade(g);
    setGrading(false);
    onDone({ feedback: fb, grade: g });
  };

  const lines = useMemo(() => v?.lines ?? [], [v?.lines]);
  if (!v) return null;
  const voice = v.engine !== "text";

  if (grade) return <ReverseDebrief name={session.name} kind={cfg.kind} feedback={fb} grade={grade} planted={session.planted.map((m) => m.id)} />;

  if (v.ended) return (
    <div className="space-y-5">
      <div className="card p-5">
        <div className="eyebrow">Your feedback on {session.name}</div>
        <p className="mt-1 text-[13px] text-mute">Write it as you would for a hiring committee: name what went wrong with specific moments. The AI candidate made a few mistakes on purpose; after you submit you will see which ones you caught.</p>
        <div className="mt-4 flex flex-wrap gap-1.5">{DECISIONS.map((d) => <button key={d} onClick={() => setFb({ ...fb, decision: d })} aria-pressed={fb.decision === d} className={cn("rounded-xl border px-3 py-1.5 text-[12.5px]", fb.decision === d ? "border-accent/60 bg-accent/10 text-accent" : "border-line text-mute hover:text-text")}>{DECISION_LABEL[d]}</button>)}</div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">{dims.map((d) => (
          <div key={d.key} className="rounded-xl border border-line bg-panel2 p-3">
            <div className="flex items-center justify-between text-[13px]"><span className="font-semibold">{d.label}</span><span className="flex gap-1">{[1, 2, 3, 4].map((n) => <button key={n} onClick={() => setFb({ ...fb, scores: { ...fb.scores, [d.key]: n } })} aria-pressed={fb.scores[d.key] === n} className={cn("h-7 w-7 rounded-lg border text-[12px]", fb.scores[d.key] === n ? "border-accent/60 bg-accent/10 text-accent" : "border-line text-mute")}>{n}</button>)}</span></div>
            <div className="mt-1 text-[11.5px] text-faint">{d.what}</div>
          </div>
        ))}</div>
        <textarea value={fb.notes} onChange={(e) => setFb({ ...fb, notes: e.target.value })} rows={8} placeholder={"What went well, what went wrong, with specific moments.\ne.g. 'Said the solution was O(n) but it has a nested loop.'"} aria-label="Your written feedback"
          className="mt-4 w-full resize-y rounded-xl border border-line bg-bg p-3 text-[13.5px] leading-relaxed outline-none focus:border-accent/60" />
        <div className="mt-3 flex justify-end"><Button variant="primary" disabled={grading || fb.notes.trim().length < 20} onClick={() => void submit()}>{grading ? <Spinner label="Checking your feedback" /> : "Submit feedback"}</Button></div>
      </div>
      <Transcript lines={lines} name={session.name} />
    </div>
  );

  const send = () => { if (input.trim()) { session.say(input); setInput(""); } };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Pill color={meta.color}>Reverse · {meta.label}</Pill>
          <Pill className="border-line text-mute">{ENGINE_INFO[v.engine].label}</Pill>
          <span className="text-[13px] text-mute">You are interviewing <b className="text-text">{session.name}</b> (AI candidate)</span>
          {v.status && <span className="text-[12.5px] text-warn">{v.status}</span>}
        </div>
        <div className="flex items-center gap-2">
          {voice && <span className={cn("flex h-9 items-center gap-2 rounded-xl border px-3 text-[12.5px]", v.aiSpeaking ? "border-hld/50 text-hld" : v.youSpeaking ? "border-ok/50 text-ok" : "border-line text-faint")}>{v.aiSpeaking ? `${session.name} is speaking` : v.youSpeaking ? "Listening" : v.generating ? "Thinking" : "Your turn"}</span>}
          <div className="num flex h-9 items-center gap-2 rounded-xl border border-line px-3 font-mono text-[13px] text-mute"><TimerReset size={14} />{fmtClock(left)}</div>
          {voice && <Button size="sm" onClick={() => session.mute(!v.muted)}>{v.muted ? <MicOff size={14} /> : <Mic size={14} />}{v.muted ? "Unmute" : "Mute"}</Button>}
          <Button variant="danger" size="sm" onClick={() => void session.stop()}><Flag size={14} />End and write feedback</Button>
        </div>
      </div>
      {v.error && <p role="alert" className="rounded-xl border border-bad/30 bg-bad/10 p-2.5 text-[13px] text-bad">{v.error}</p>}
      <div className="grid gap-4 xl:grid-cols-[minmax(340px,2fr)_3fr]">
        <section className="card flex h-[640px] flex-col overflow-hidden">
          <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
            {!lines.length && <p className="text-[13px] text-mute">Open the interview: introduce yourself and present the question in your own words, as an interviewer would.</p>}
            {lines.map((m) => <Bubble key={m.seq} me={m.who === "you"} name={session.name} text={m.text} />)}
            {v.aiPartial && <div className="max-w-[90%] rounded-2xl border border-line bg-panel2 px-4 py-2.5 text-[14px] text-mute">{v.aiPartial}</div>}
            {v.generating && !v.aiPartial && <div className="w-fit rounded-2xl border border-line bg-panel2 px-4 py-3 text-[13px] text-mute"><Spinner label={`${session.name} is thinking`} /></div>}
            {v.youPartial && <div className="ml-auto max-w-[90%] rounded-2xl border border-dashed border-accent/30 px-4 py-2.5 text-[14px] italic text-mute">{v.youPartial}</div>}
          </div>
          <div className="border-t border-line p-3">
            <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} rows={voice ? 1 : 3} placeholder={voice ? "Speak, or type here" : "Ask your question. ↵ to send"} aria-label="Your question"
              className="w-full resize-none rounded-xl border border-line bg-bg p-3 text-[14px] outline-none focus:border-accent/60" />
            <div className="mt-2 flex justify-end"><Button size="sm" variant="primary" disabled={!input.trim()} onClick={send}><Send size={14} />Send</Button></div>
          </div>
        </section>
        <section className="card flex h-[640px] flex-col gap-3 overflow-y-auto p-4">
          <div>
            <div className="eyebrow">Your interviewer packet</div>
            <h3 className="mt-1 text-[15px] font-semibold">{q.title}</h3>
            <p className="mt-1 text-[13.5px] leading-relaxed">{q.statement}</p>
            {q.constraints && <p className="mt-1 text-[12.5px] text-mute">Numbers, if asked: {q.constraints}</p>}
            {q.followUps.length > 0 && <p className="mt-1 text-[12.5px] text-mute">Follow-ups: {q.followUps.join(" · ")}</p>}
            <details className="mt-1 text-[12.5px] text-mute"><summary className="cursor-pointer">Reference answer (for you only)</summary><div className="mt-1"><Md>{q.reference || "None."}</Md></div></details>
            <p className="mt-2 text-[12px] text-faint">Rubric: {dims.map((d) => d.label).join(" · ")}. Probe, don&apos;t teach; note specific moments for your feedback.</p>
          </div>
          <div className="min-h-0 flex-1">
            <div className="eyebrow mb-1.5">{cfg.kind === "hld" || cfg.kind === "ml" ? "Candidate's whiteboard" : cfg.kind === "behavioral" ? "Notes" : "Candidate's doc"}</div>
            <pre className={cn("h-[360px] overflow-auto whitespace-pre-wrap rounded-xl border border-line p-3.5 font-mono text-[12.5px] leading-relaxed", cfg.kind === "coding" || cfg.kind === "mlcode" ? "bg-[#f7f7f5] text-[#1f1f1f]" : "bg-bg")}>{(cfg.kind === "hld" || cfg.kind === "ml" ? v.board : v.doc) || "Nothing written yet."}</pre>
          </div>
        </section>
      </div>
    </div>
  );
}

function Bubble({ me, name, text }: { me: boolean; name: string; text: string }) {
  return (
    <div className={cn("max-w-[90%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed", me ? "ml-auto border border-accent/25 bg-accent/12" : "border border-line bg-panel2")}>
      <div className="mb-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-faint">{me ? "You (interviewer)" : `${name} (candidate)`}</div>{text}
    </div>
  );
}

function Transcript({ lines, name }: { lines: { seq: number; who: "you" | "ai"; text: string }[]; name: string }) {
  return <details className="card p-4"><summary className="cursor-pointer text-[13px] font-semibold">Transcript</summary><div className="mt-3 space-y-2">{lines.map((l) => <Bubble key={l.seq} me={l.who === "you"} name={name} text={l.text} />)}</div></details>;
}

export function ReverseDebrief({ name, kind, feedback, grade, planted }: { name: string; kind: string; feedback: ReverseFeedback; grade: ReverseGrade; planted: string[] }) {
  const byId = new Map(MISTAKES.map((m) => [m.id, m]));
  const caught = grade.caught.filter((c) => c.caught).length;
  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-4 border-b border-line px-5 py-4">
        <div className="min-w-0 flex-1">
          <div className="eyebrow">Reverse mode · {kind}</div>
          <div className="display mt-1 text-2xl font-semibold">You caught {caught} of {planted.length} planted mistakes</div>
          <p className="mt-1 text-[13px] text-mute">Your decision: <b className="text-text">{DECISION_LABEL[feedback.decision as Decision]}</b>. A calibrated interviewer would lean towards {DECISION_LABEL[expectedDecision(planted.length)].toLowerCase()} for these mistakes alone.</p>
        </div>
        <div className="text-right"><div className="num display text-3xl font-semibold">{grade.score}</div><div className="text-[12px] text-faint">{grade.ai ? "graded by your AI" : "graded offline by keywords"}</div></div>
      </div>
      <div className="space-y-3 p-5">
        {grade.caught.map((c) => {
          const m = byId.get(c.id);
          return (
            <div key={c.id} className={cn("flex gap-3 rounded-xl border p-3", c.caught ? "border-ok/30 bg-ok/5" : "border-bad/30 bg-bad/5")}>
              {c.caught ? <Check size={16} className="mt-0.5 shrink-0 text-ok" /> : <X size={16} className="mt-0.5 shrink-0 text-bad" />}
              <div className="text-[13.5px] leading-relaxed"><b>{m?.label ?? c.id}</b>{c.caught && c.evidence && <div className="text-[12.5px] text-mute">You wrote: “{c.evidence}”</div>}{!c.caught && <div className="text-[12.5px] text-mute">{name} did this on purpose. Next time, listen for it and probe with a question.</div>}</div>
            </div>
          );
        })}
        {grade.decisionNote && <p className="text-[13px] text-mute"><b className="text-text">Decision:</b> {grade.decisionNote}</p>}
        {grade.evidenceNote && <p className="text-[13px] text-mute"><b className="text-text">Specificity:</b> {grade.evidenceNote}</p>}
        <p className="text-[12px] text-faint">Interviewing someone else is the fastest way to learn the rubric: what you catch here is what an interviewer will catch in you.</p>
      </div>
    </div>
  );
}
