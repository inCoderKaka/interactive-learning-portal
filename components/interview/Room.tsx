"use client";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { Brain, Eye, Flag, Lightbulb, Mic, MicOff, Send, TimerReset } from "lucide-react";
import { Button, Md, Pill, cn, fmtClock } from "@/components/ui";
import { CodeEditor, Spinner } from "@/components/Work";
import type { Settings } from "@/lib/types";
import { digestText } from "@/lib/interview/core/digest";
import { curveballById } from "@/lib/interview/core/curveballs";
import type { InterviewSession, LiveView } from "@/lib/interview/session";
import { ENGINE_INFO } from "@/lib/interview/engines/registry";
import { getAi } from "@/lib/interview/tasks";
import type { WhiteboardHandle } from "./WhiteboardCanvas";
import { KINDS } from "./Setup";

const Whiteboard = dynamic(() => import("./WhiteboardCanvas"), { ssr: false, loading: () => <div className="grid h-full place-items-center rounded-xl border border-line text-[13px] text-faint">Loading whiteboard…</div> });

const PHASE_LABEL: Record<string, string> = { lobby: "Connecting", intro: "Introductions", about_you: "About you", problem: "The problem", curveball: "The problem", questions_for_me: "Your questions", wrap: "Wrapping up", done: "Finished" };

function useDebounced(value: string, ms: number, fn: (v: string) => void) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    const t = setTimeout(() => ref.current(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
}

export function Room({ session, settings, onEnd }: { session: InterviewSession; settings: Settings; onEnd: () => void }) {
  const [v, setV] = useState<LiveView | null>(null);
  const [input, setInput] = useState("");
  const [code, setCode] = useState("");
  const [notes, setNotes] = useState("");
  const [tab, setTab] = useState<"board" | "notes" | "code">("board");
  const [looking, setLooking] = useState(false);
  const [left, setLeft] = useState(session.cfg.minutes * 60);
  const board = useRef<WhiteboardHandle | null>(null);
  const prevCode = useRef(""), prevNotes = useRef("");
  const scroller = useRef<HTMLDivElement>(null);
  const cfg = session.cfg;
  const meta = KINDS.find((k) => k.id === cfg.kind)!;
  const dev = getAi(settings).devMode;

  useEffect(() => session.subscribe(setV), [session]);
  useEffect(() => {
    const t = setInterval(() => setLeft(Math.max(0, cfg.minutes * 60 - Math.round(session.now() / 1000))), 500);
    return () => clearInterval(t);
  }, [session, cfg.minutes]);

  useDebounced(code, 3500, (c) => {
    const d = digestText("code", prevCode.current, c);
    if (d) { prevCode.current = c; session.workspace(d); }
  });
  useDebounced(notes, 3500, (n) => {
    const d = digestText("notes", prevNotes.current, n);
    if (d) { prevNotes.current = n; session.workspace(d); }
  });

  const turns = useMemo(() => (v?.log ?? []).flatMap(({ seq, e }) => (e.type === "turn.candidate" ? [{ seq, me: true, text: e.text, tag: "" }] : e.type === "turn.interviewer" ? [{ seq, me: false, text: e.text, tag: e.origin === "curveball" ? "curveball" : e.origin === "hint" ? "hint" : e.interrupted ? "cut off" : "" }] : [])), [v?.log]);
  // scroll the transcript itself, never the page
  useEffect(() => { const el = scroller.current; if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" }); }, [turns.length, v?.interviewerPartial, v?.candidatePartial]);

  if (!v) return null;
  const voice = v.engine !== "text";
  const ended = v.ended;
  const low = left <= 300;
  const send = () => { if (input.trim()) { session.candidateSays(input); setInput(""); } };
  const look = async () => {
    const img = await board.current?.image();
    if (!img) return;
    setLooking(true);
    try { await session.look(img); } finally { setLooking(false); }
  };
  const hasBoard = cfg.kind === "hld" || cfg.kind === "lld";

  // Commute mode (MI-X-7): voice only, one column, large controls for a phone
  if (cfg.layout === "commute") {
    const lastLine = turns.filter((m) => !m.me).slice(-1)[0]?.text ?? "";
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center gap-6 py-6 text-center">
        <div className="flex items-center gap-2 text-[13px] text-mute"><Pill color={meta.color}>{meta.label}</Pill><span>with {v.state.persona.name}</span></div>
        <div className={cn("num font-mono text-4xl font-semibold", low ? "text-warn" : "text-text")}>{fmtClock(left)}</div>
        <div className={cn("grid h-44 w-44 place-items-center rounded-full border-4 transition", v.agentSpeaking ? "animate-pulse border-hld bg-hld/10" : v.candidateSpeaking ? "border-ok bg-ok/10" : "border-line bg-panel2")} aria-live="polite">
          <span className="px-4 text-[15px] font-semibold">{ended ? "Finished" : v.agentSpeaking ? `${v.state.persona.name} is speaking` : v.candidateSpeaking ? "Listening" : v.generating ? "Thinking" : v.muted ? "Muted" : "Your turn"}</span>
        </div>
        {v.status && <p className="text-[13px] text-warn">{v.status}</p>}
        {v.error && <p role="alert" className="text-[13px] text-bad">{v.error}</p>}
        {cfg.voice.captions && (v.interviewerPartial || lastLine) && <p className="min-h-[3em] text-[15px] leading-relaxed text-mute">{v.interviewerPartial || lastLine}</p>}
        {!ended && (
          <div className="grid w-full grid-cols-2 gap-3">
            <button onClick={() => session.mute(!v.muted)} className="flex h-16 items-center justify-center gap-2 rounded-2xl border border-line bg-panel2 text-[15px] font-semibold" aria-pressed={v.muted}>{v.muted ? <MicOff size={20} /> : <Mic size={20} />}{v.muted ? "Unmute" : "Mute"}</button>
            <button onClick={() => session.thinking()} className="flex h-16 items-center justify-center gap-2 rounded-2xl border border-line bg-panel2 text-[15px] font-semibold"><Brain size={20} />Think</button>
            <button onClick={() => void session.stop("candidate").then(onEnd)} className="col-span-2 flex h-16 items-center justify-center gap-2 rounded-2xl border border-bad/40 bg-bad/10 text-[15px] font-semibold text-bad"><Flag size={20} />End and get feedback</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Pill color={meta.color}>{meta.label}</Pill>
          <Pill className="border-line text-mute">{PHASE_LABEL[v.state.phase]}</Pill>
          <Pill className="border-line text-mute">{ENGINE_INFO[v.engine].label}</Pill>
          <span className="text-[13px] text-mute">with {v.state.persona.name}</span>
          {v.status && <span className="text-[12.5px] text-warn">{v.status}</span>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {voice && !ended && (
            <span className={cn("flex h-9 items-center gap-2 rounded-xl border px-3 text-[12.5px]", v.agentSpeaking ? "border-hld/50 text-hld" : v.candidateSpeaking ? "border-ok/50 text-ok" : "border-line text-faint")} aria-live="polite">
              <span className={cn("h-2 w-2 rounded-full", v.agentSpeaking ? "animate-pulse bg-hld" : v.candidateSpeaking ? "animate-pulse bg-ok" : v.generating ? "animate-pulse bg-warn" : "bg-faint")} />
              {v.agentSpeaking ? `${v.state.persona.name} is speaking` : v.candidateSpeaking ? "Listening" : v.generating ? "Thinking" : v.muted ? "Muted" : "Your turn"}
            </span>
          )}
          <div className={cn("num flex h-9 items-center gap-2 rounded-xl border px-3 font-mono text-[13px]", ended ? "border-line text-faint" : left === 0 ? "border-bad/50 bg-bad/10 text-bad" : low ? "border-warn/50 text-warn" : "border-line text-mute")}><TimerReset size={14} />{fmtClock(left)}</div>
          {!ended && voice && <Button size="sm" onClick={() => session.mute(!v.muted)} aria-pressed={v.muted}>{v.muted ? <MicOff size={14} /> : <Mic size={14} />}{v.muted ? "Unmute" : "Mute"}</Button>}
          {!ended && <Button size="sm" onClick={() => session.thinking()} title="Pauses interruptions for 90 seconds. The clock keeps running."><Brain size={14} />Minute to think</Button>}
          {!ended && <Button size="sm" onClick={() => session.hint()} title="Hints are recorded and cost some signal, as in a real interview."><Lightbulb size={14} />Hint</Button>}
          {!ended && <Button variant="danger" size="sm" onClick={() => void session.stop("candidate").then(onEnd)}><Flag size={14} />End and get feedback</Button>}
        </div>
      </div>

      {v.error && <p role="alert" className="rounded-xl border border-bad/30 bg-bad/10 p-2.5 text-[13px] text-bad">{v.error}</p>}

      <div className={cn("grid gap-4", cfg.kind !== "behavioral" && "xl:grid-cols-[minmax(340px,2fr)_3fr]")}>
        <section className="card flex h-[640px] flex-col overflow-hidden">
          <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
            {turns.map((m) => (
              <motion.div key={m.seq} id={`turn-${m.seq}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={cn("max-w-[90%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed", m.me ? "ml-auto border border-accent/25 bg-accent/12" : "border border-line bg-panel2")}>
                <div className="mb-0.5 flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-wider text-faint">{m.me ? "You" : v.state.persona.name}{m.tag && <span className="text-warn">{m.tag}</span>}</div>
                {voice && !cfg.voice.captions && !m.me ? <span className="text-faint">(spoken)</span> : <Md>{m.text}</Md>}
              </motion.div>
            ))}
            {v.interviewerPartial && (!voice || cfg.voice.captions) && <div className="max-w-[90%] rounded-2xl border border-line bg-panel2 px-4 py-2.5 text-[14px] leading-relaxed text-mute">{v.interviewerPartial}</div>}
            {v.generating && !v.interviewerPartial && !voice && <div className="w-fit rounded-2xl border border-line bg-panel2 px-4 py-3 text-[13px] text-mute"><Spinner label={`${v.state.persona.name} is typing`} /></div>}
            {v.candidatePartial && <div className="ml-auto max-w-[90%] rounded-2xl border border-dashed border-accent/30 px-4 py-2.5 text-[14px] italic text-mute">{v.candidatePartial}</div>}
            {v.state.phase === "lobby" && <div className="text-[13px] text-mute"><Spinner label={v.status || "Connecting"} /></div>}
          </div>
          {!ended && (
            <div className="border-t border-line p-3">
              <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey || (!voice && !e.shiftKey))) { e.preventDefault(); send(); } }} rows={voice ? 1 : 3}
                placeholder={voice ? "Speak, or type here (↵ ⌘ to send)" : "Think out loud here. Ask clarifying questions first. ↵ to send, ⇧↵ for a new line"} aria-label="Your reply"
                className="w-full resize-none rounded-xl border border-line bg-bg p-3 text-[14px] leading-relaxed outline-none focus:border-accent/60" />
              <div className="mt-2 flex justify-end"><Button size="sm" variant="primary" disabled={!input.trim()} onClick={send}><Send size={14} />Send</Button></div>
            </div>
          )}
        </section>

        {cfg.kind !== "behavioral" && (
          <section className="card flex h-[640px] flex-col overflow-hidden p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              {hasBoard ? (
                <div className="flex gap-1">{(cfg.kind === "lld" ? (["board", "notes", "code"] as const) : (["board", "notes"] as const)).map((t) => <button key={t} onClick={() => setTab(t)} className={cn("rounded-lg px-3 py-1 text-[12.5px] font-medium", tab === t ? "bg-panel2 text-text" : "text-mute hover:text-text")}>{t === "board" ? "Whiteboard" : t === "notes" ? "Notes doc" : "Code"}</button>)}</div>
              ) : <div className="eyebrow">Shared doc</div>}
              <div className="flex items-center gap-2">
                <span className="text-[11.5px] text-faint">{cfg.kind === "coding" ? "no compiler, no autocomplete" : tab === "board" ? `${v.state.persona.name} follows your diagram as you draw` : tab === "code" ? "core classes and logic; no compiler" : cfg.kind === "lld" ? "actors, use cases, entities, APIs" : "requirements, numbers, APIs, schemas"}</span>
                {hasBoard && tab === "board" && !ended && <Button size="sm" disabled={looking} onClick={look} title="Send a picture of the board to a vision model"><Eye size={14} />{looking ? "Looking…" : "Look at my diagram"}</Button>}
              </div>
            </div>
            <div className="min-h-0 flex-1">
              {cfg.kind === "coding" ? (cfg.plainDoc
                ? <textarea value={code} onChange={(e) => setCode(e.target.value)} readOnly={ended} spellCheck={false} aria-label="Shared doc" placeholder="Write your code here, as you would in a shared Google Doc." className="h-full w-full resize-none rounded-xl border border-line bg-[#f7f7f5] p-4 font-mono text-[13.5px] leading-relaxed text-[#1f1f1f] outline-none" />
                : <div className="h-full overflow-y-auto"><CodeEditor value={code} onChange={setCode} lang={settings.lang} minHeight="580px" readOnly={ended} /></div>)
                : (
                  <>
                    <div className={cn("h-full", tab !== "board" && "hidden")}><Whiteboard readOnly={ended} handle={(h) => (board.current = h)} onDigest={(d, snap, els) => session.workspace(d, snap, () => board.current?.image() ?? Promise.resolve(null), els)} /></div>
                    {tab === "code" && <div className="h-full overflow-y-auto"><CodeEditor value={code} onChange={setCode} lang={settings.lang} minHeight="580px" readOnly={ended} /></div>}
                    {tab === "notes" && <textarea value={notes} onChange={(e) => setNotes(e.target.value)} readOnly={ended} aria-label="Notes doc" placeholder={"Requirements:\n- \n\nEstimates:\n- \n\nAPI:\n- "} className="h-full w-full resize-none rounded-xl border border-line bg-bg p-3.5 font-mono text-[13px] leading-relaxed outline-none focus:border-accent/60" />}
                  </>
                )}
            </div>
          </section>
        )}
      </div>

      {dev && (
        <details className="card p-4 text-[12.5px]" open>
          <summary className="cursor-pointer font-semibold">Developer overlay</summary>
          <div className="mt-3 grid gap-4 lg:grid-cols-3">
            <div className="space-y-1 text-mute">
              <div>Tone: <b className="text-text">{v.state.tone}</b> · persona {v.state.persona.name}, {v.state.persona.team}</div>
              <div>Phase: {v.state.phase} · turns {v.state.turns} · hints {v.state.hints} · interventions this phase {v.state.interventionsThisPhase}</div>
              <div>Declined interventions: {v.debug.declined}</div>
              <div>Curveballs: {v.state.curveballs.map((c) => `${curveballById.get(c.id)?.label} @${c.atMin}m${c.fired ? " ✓" : ""}`).join(", ") || "none"}</div>
              <div>Rule suspicions: {v.state.openRuleHits.map((h) => h.rule).join(", ") || "none"}</div>
              <div>Latency: {v.debug.latencies.slice(-6).map((l) => `${l.metric} ${l.ms}ms`).join(" · ") || "—"}</div>
              <div>Round cost so far: ~${v.debug.costUsd.toFixed(3)}{v.debug.cheap && " · small model (near budget)"}{v.debug.budget && ` · ${v.debug.budget.scope} budget ${v.debug.budget.level}: $${v.debug.budget.usedUsd.toFixed(2)} of $${v.debug.budget.limitUsd}`}</div>
              {session.cfg.prompts && <div>Prompt overrides: {Object.keys(session.cfg.prompts).join(", ")}</div>}
            </div>
            <pre className="code max-h-72 overflow-auto whitespace-pre-wrap text-[11.5px] lg:col-span-2">{v.debug.lastNote || v.debug.lastPrompt || session.contextPreview()}</pre>
          </div>
        </details>
      )}
    </div>
  );
}
