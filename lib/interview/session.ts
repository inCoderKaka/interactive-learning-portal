"use client";
// Session controller: wires the pure brain to an engine, the workspaces, the LLM tasks and the event log.

import type { Settings } from "@/lib/types";
import { initBrain, reduce } from "./core/brain";
import { constraintFlags, diagramRules, type ConstraintFlags } from "./core/digest";
import { END_OF_SPEECH_MS } from "./core/policy";
import { SILENCE, buildTurn, contextNote, judgePrompt, realtimeNote, systemPrompt } from "./core/prompts";
import type { Action, BrainState, DiagramSnapshot, Digest, EngineId, InterviewQuestion, LoggedEvent, SessionConfig, SessionEvent } from "./core/types";
import { engineFor, fallbackFor } from "./engines/registry";
import type { EngineCallbacks, EngineHandle } from "./engines/types";
import { keyterms } from "./questions";
import { providerReady, resolved, runTask, streamTask } from "./tasks";
import { describeImage } from "./providers/llm";

const VERBATIM_TURNS = 40;

export interface LiveView {
  state: BrainState;
  log: LoggedEvent[];
  engine: EngineId;
  candidatePartial: string;
  interviewerPartial: string;
  agentSpeaking: boolean;
  candidateSpeaking: boolean;
  generating: boolean;
  status: string;
  error: string;
  ended: boolean;
  muted: boolean;
  debug: { lastPrompt: string; lastNote: string; declined: number; latencies: { metric: string; ms: number }[] };
}

export class InterviewSession {
  readonly cfg: SessionConfig;
  private settings: Settings;
  private s: BrainState;
  readonly log: LoggedEvent[] = [];
  private seq = 0;
  private t0 = 0;
  private engine: EngineHandle | null = null;
  private engineId: EngineId;
  private gen: AbortController | null = null;
  private tick: ReturnType<typeof setInterval> | undefined;
  private flags: ConstraintFlags;
  private lastImageAt = 0;
  private view: LiveView;
  private listeners = new Set<(v: LiveView) => void>();
  private pendingEnd = false;
  private summary = "";
  private summarisedTurns = 0;
  private summarising = false;

  constructor(cfg: SessionConfig, question: InterviewQuestion, settings: Settings) {
    this.cfg = cfg;
    this.settings = settings;
    this.engineId = cfg.engine;
    this.s = initBrain(cfg, question, Date.now());
    this.flags = constraintFlags(question);
    this.view = {
      state: this.s, log: this.log, engine: this.engineId, candidatePartial: "", interviewerPartial: "", agentSpeaking: false, candidateSpeaking: false,
      generating: false, status: "", error: "", ended: false, muted: false, debug: { lastPrompt: "", lastNote: "", declined: 0, latencies: [] },
    };
  }

  subscribe(fn: (v: LiveView) => void) { this.listeners.add(fn); fn(this.view); return () => { this.listeners.delete(fn); }; }
  private emit(p: Partial<LiveView> = {}) {
    // a fresh array each time, so React memos keyed on the log recompute
    this.view = { ...this.view, ...p, state: this.s, log: this.log.slice(), engine: this.engineId };
    for (const l of this.listeners) l(this.view);
  }
  get state() { return this.s; }
  now() { return this.t0 ? Date.now() - this.t0 : 0; }

  private record(e: SessionEvent) {
    if (e.type === "tick") return;
    this.log.push({ seq: ++this.seq, t: this.now(), e });
  }

  private voice() { return this.engineId !== "text"; }

  private callbacks(): EngineCallbacks {
    return {
      candidateSpeaking: (on) => { this.emit({ candidateSpeaking: on }); this.dispatch({ type: "candidate.speaking", on }); if (on && this.gen && this.engineId !== "realtime") this.gen.abort(); },
      candidatePartial: (text) => this.emit({ candidatePartial: text }),
      candidateTurn: (text, interruptedAgent) => { this.emit({ candidatePartial: "" }); this.dispatch({ type: "turn.candidate", text, interruptedAgent }); },
      interviewerPartial: (text) => this.emit({ interviewerPartial: text }),
      interviewerTurn: (text, interrupted) => { this.emit({ interviewerPartial: "" }); this.dispatch({ type: "turn.interviewer", text, origin: "reply", interrupted }); },
      agentSpeaking: (on) => { this.emit({ agentSpeaking: on }); if (!on && this.pendingEnd) this.finishSoon(); },
      latency: (metric, ms) => { this.record({ type: "latency", metric, ms: Math.round(ms) }); this.emit({ debug: { ...this.view.debug, latencies: [...this.view.debug.latencies.slice(-19), { metric, ms: Math.round(ms) }] } }); },
      status: (text) => this.emit({ status: text }),
      error: (err, fatal) => { if (fatal) void this.fallback(err); else this.emit({ error: err.message }); },
    };
  }

  private async startEngine(id: EngineId) {
    const eng = engineFor(id, this.settings);
    const why = eng.unavailable(this.settings);
    if (why) throw new Error(why);
    this.engine = await eng.start({
      settings: this.settings,
      instructions: systemPrompt(this.cfg, this.s, id !== "text"),
      endOfSpeechMs: END_OF_SPEECH_MS[this.cfg.pressure],
      keyterms: keyterms(this.s.question),
      voice: this.cfg.voice,
    }, this.callbacks());
    this.engineId = id;
  }

  async start() {
    this.emit({ status: "Connecting…" });
    try {
      await this.startEngine(this.cfg.engine);
    } catch (e) {
      const next = fallbackFor(this.cfg.engine, this.settings);
      if (!next) throw e;
      this.record({ type: "engine.fallback", from: this.cfg.engine, to: next, error: String(e instanceof Error ? e.message : e) });
      this.emit({ error: `${e instanceof Error ? e.message : e} Switched to ${next === "text" ? "text" : "Ascent Voice"}.` });
      await this.startEngine(next);
    }
    this.t0 = Date.now();
    this.s = { ...this.s, startedAt: this.t0 };
    this.emit({ status: "" });
    this.dispatch({ type: "session.started", question: this.s.question.id, tone: this.s.tone, engine: this.engineId });
    this.tick = setInterval(() => this.dispatch({ type: "tick" }), 2000);
  }

  dispatch(e: SessionEvent) {
    if (this.view.ended) return;
    const now = this.now();
    this.record(e);
    const before = this.s.phase;
    const r = reduce(this.cfg, this.s, e, now, this.engineId);
    this.s = r.state;
    if (r.state.phase !== before) this.record({ type: "phase.changed", from: before, to: r.state.phase });
    for (const a of r.actions) void this.run(a);
    this.emit();
  }

  private async run(a: Action) {
    if (a.type === "end") { this.pendingEnd = true; if (!this.view.agentSpeaking && !this.view.generating) this.finishSoon(); return; }
    if (a.type !== "say" || !this.engine) return;

    if (this.engine.kind === "realtime") {
      if (a.origin === "reply") return; // the realtime model answers speech by itself
      let instruction = a.instruction;
      if (a.allowSilence) {
        try {
          const j = judgePrompt(this.cfg, this.s, this.now(), a.instruction);
          const out = await runTask(this.settings, "interviewer.judge", j.system, [{ role: "user", content: j.user }]);
          const v = JSON.parse(out.slice(out.indexOf("{"), out.lastIndexOf("}") + 1)) as { speak?: boolean; say?: string };
          if (!v.speak) { this.record({ type: "intervention.declined", trigger: a.origin, reason: "judge" }); this.emit({ debug: { ...this.view.debug, declined: this.view.debug.declined + 1 } }); return; }
          instruction = `Say something close to this, in your own voice: "${v.say}"`;
        } catch { return; }
      }
      if (this.view.candidateSpeaking) return;
      const note = realtimeNote(this.cfg, this.s, this.now(), instruction);
      this.emit({ debug: { ...this.view.debug, lastNote: note } });
      this.engine.respond?.(note);
      return;
    }

    // no AI connected: a scripted interviewer keeps the structure (self-paced mode)
    if (!providerReady(this.settings, this.settings.provider)) {
      const line = this.scripted(a);
      if (!line) return;
      const ctl = new AbortController();
      this.gen = ctl;
      this.emit({ generating: true });
      try {
        const { text } = await this.engine.speak!((async function* () { yield line; })(), ctl.signal);
        if (text) this.dispatch({ type: "turn.interviewer", text, origin: a.origin });
      } finally {
        if (this.gen === ctl) this.gen = null;
        this.emit({ generating: false, interviewerPartial: "" });
        if (this.pendingEnd && !this.view.agentSpeaking) this.finishSoon();
      }
      return;
    }

    // pipeline engines: we generate, the engine speaks
    if (this.gen) {
      if (a.origin === "reply" || a.origin === "phase") this.gen.abort(); // a reply to the candidate wins
      else return;
    }
    const ctl = new AbortController();
    this.gen = ctl;
    this.emit({ generating: true, interviewerPartial: "" });
    const system = systemPrompt(this.cfg, this.s, this.voice());
    const msgs = buildTurn(this.cfg, this.s, this.log, this.now(), this.summary ? `(Summary of the earlier conversation: ${this.summary}) ${a.instruction}` : a.instruction, a.allowSilence);
    this.maybeSummarise();
    this.emit({ debug: { ...this.view.debug, lastPrompt: `${system}\n\n---\n${msgs.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n")}` } });
    const t0 = performance.now();
    let firstToken = true;
    try {
      const src = streamTask(this.settings, "interviewer.turn", system, msgs, ctl.signal);
      // hold back output until we know it is not the silence token
      const gated = (async function* (self: InterviewSession) {
        let head = "";
        let open = false;
        for await (const c of src) {
          if (firstToken) { firstToken = false; self.record({ type: "latency", metric: "first_token", ms: Math.round(performance.now() - t0) }); }
          if (open) { yield c; continue; }
          head += c;
          const h = head.trimStart();
          if (SILENCE.startsWith(h.slice(0, SILENCE.length)) && h.length < SILENCE.length) continue;
          if (h.startsWith(SILENCE)) return;
          open = true;
          yield head;
        }
      })(this);
      const { text, interrupted } = await this.engine.speak!(gated, ctl.signal);
      const clean = text.replace(SILENCE, "").trim();
      if (clean) this.dispatch({ type: "turn.interviewer", text: clean, origin: a.origin, interrupted });
      else if (a.allowSilence) { this.record({ type: "intervention.declined", trigger: a.origin, reason: "model chose silence" }); this.emit({ debug: { ...this.view.debug, declined: this.view.debug.declined + 1 } }); }
    } catch (e) {
      if (!ctl.signal.aborted) this.emit({ error: e instanceof Error ? e.message : String(e) });
    } finally {
      if (this.gen === ctl) this.gen = null;
      this.emit({ generating: false, interviewerPartial: "" });
      if (this.pendingEnd && !this.view.agentSpeaking) this.finishSoon();
    }
  }

  /** Keep long rounds within budget: summarise turns older than the verbatim window (the summarise task). */
  private maybeSummarise() {
    const turns = this.log.filter((x) => x.e.type === "turn.candidate" || x.e.type === "turn.interviewer");
    const outside = turns.length - VERBATIM_TURNS;
    if (this.summarising || outside - this.summarisedTurns < 10 || !providerReady(this.settings, this.settings.provider)) return;
    this.summarising = true;
    const chunk = turns.slice(0, outside).map(({ e }) => (e.type === "turn.candidate" ? `CANDIDATE: ${e.text}` : e.type === "turn.interviewer" ? `INTERVIEWER: ${e.text}` : "")).join("\n");
    runTask(this.settings, "summarise", "Summarise an interview transcript for the interviewer who is running it. Keep requirements agreed, numbers stated, design choices made, mistakes noticed and questions still open. Under 150 words, plain text.", [{ role: "user", content: `${this.summary ? `Earlier summary: ${this.summary}\n\n` : ""}${chunk}` }])
      .then((t) => { this.summary = t.trim(); this.summarisedTurns = outside; })
      .catch(() => {})
      .finally(() => { this.summarising = false; });
  }

  private followUp = 0;
  /** Deterministic lines for self-paced rounds without an AI provider. */
  private scripted(a: Extract<Action, { type: "say" }>): string {
    const q = this.s.question, p = this.s.persona, ins = a.instruction;
    const nextFollowUp = () => q.followUps[this.followUp++ % Math.max(1, q.followUps.length)] ?? "What would you improve if you had more time?";
    if (a.origin === "phase") {
      if (/Greet/.test(ins)) return `Hi, I'm ${p.name}, I work on ${p.team}. We have ${this.cfg.minutes} minutes. ${/introduce themselves/.test(ins) ? "Could you start by telling me a little about yourself?" : `Here's the question: ${q.statement}`}`;
      if (/introduce themselves/.test(ins)) return "Hi! Could you start by telling me a little about yourself?";
      if (/present the question/.test(ins)) return `Thanks. Here's the question: ${q.statement}`;
      if (/anything you'd like to ask me/i.test(ins)) return "We're nearly out of time. Is there anything you'd like to ask me?";
      return "Thanks for your time today. The recruiter will be in touch.";
    }
    if (a.origin === "timecall") return `About ${ins.match(/about (\d+) minutes/)?.[1] ?? "a few"} minutes left.`;
    if (a.origin === "curveball" || a.origin === "hint") return nextFollowUp();
    if (a.origin === "intervention") return this.s.tone === "notetaker" || /whiteboard/.test(ins) ? "" : "Can you talk me through what you're thinking?";
    if (/moment to think/.test(ins)) return "Sure.";
    if (this.s.phase === "questions_for_me") return `Good question. I like that ${p.likes}. Anything else?`;
    return "";
  }

  private finishTimer: ReturnType<typeof setTimeout> | undefined;
  private onEnd?: () => void;
  onEnded(fn: () => void) { this.onEnd = fn; }
  private finishSoon() {
    clearTimeout(this.finishTimer);
    this.finishTimer = setTimeout(() => void this.stop("timeout"), 2500);
  }

  private async fallback(err: Error) {
    const next = fallbackFor(this.engineId, this.settings);
    const from = this.engineId;
    try { await this.engine?.stop(); } catch { /* already gone */ }
    this.engine = null;
    if (!next) { this.emit({ error: err.message }); return; }
    this.record({ type: "engine.fallback", from, to: next, error: err.message });
    this.emit({ error: `${err.message} Continuing with ${next === "text" ? "text" : "Ascent Voice"}.` });
    try {
      await this.startEngine(next);
      this.emit();
      void this.run({ type: "say", origin: "reply", instruction: "The voice line dropped and you are continuing on a different line. Say one short sentence acknowledging that, then continue where you left off.", allowSilence: false });
    } catch (e) {
      this.emit({ error: e instanceof Error ? e.message : String(e) });
    }
  }

  // ---- inputs from the UI ----

  candidateSays(text: string) {
    const t = text.trim();
    if (t) this.dispatch({ type: "turn.candidate", text: t });
    if (t && this.engine?.kind === "realtime") this.engine.respond?.(`[The candidate typed this instead of speaking: "${t}". Reply to it.]`);
  }

  thinking() { this.dispatch({ type: "thinking.pause", on: true }); }
  hint() { this.dispatch({ type: "hint.requested" }); }

  mute(on: boolean) { this.engine?.mute(on); this.emit({ muted: on }); }

  /** Whiteboard or doc changed meaningfully. */
  workspace(d: Digest, snapshot?: DiagramSnapshot, image?: () => Promise<Blob | null>) {
    this.dispatch({ type: "digest", surface: d.surface, diff: d.diff, full: d.full });
    if (snapshot && this.cfg.kind === "hld") for (const h of diagramRules(snapshot, this.flags)) this.dispatch({ type: "rule.hit", rule: h.rule, detail: h.detail });
    this.engine?.addContext?.(`[Interviewer note, do not reply to this: the candidate's ${d.surface} changed: ${d.diff.slice(0, 1500)}]`);
    // realtime models can look at the board directly; throttle images
    if (image && this.engine?.sendImage && Date.now() - this.lastImageAt > 15000) {
      this.lastImageAt = Date.now();
      void image().then((b) => b && this.engine?.sendImage?.(b)).catch(() => {});
    }
  }

  /** "Look at my diagram": describe an image with a vision model and add it to context. */
  async look(image: Blob) {
    if (this.engine?.sendImage) {
      await this.engine.sendImage(image);
      this.engine.respond?.(realtimeNote(this.cfg, this.s, this.now(), "The candidate asked you to look at their diagram (the image just sent). Comment briefly on one thing that matters, as a question."));
      this.record({ type: "vision.look", surface: "whiteboard", description: "(image sent to the realtime model)" });
      return;
    }
    const vt = resolved(this.settings, "vision.describe");
    const desc = await describeImage(this.settings, image, `Describe this system or class diagram precisely for an interviewer who cannot see it: components, connections and labels, then one line on anything that looks wrong at this scale: ${this.s.question.constraints || "n/a"}. Under 150 words.`, { provider: vt.provider, model: vt.model });
    this.record({ type: "vision.look", surface: "whiteboard", description: desc });
    this.dispatch({ type: "digest", surface: "whiteboard", diff: "candidate asked you to look", full: `${this.s.digests.whiteboard ?? ""}\nWhat the image shows: ${desc}` });
    void this.run({ type: "say", origin: "reply", instruction: "The candidate asked you to look at their diagram; its description is in the note. Respond briefly with one pointed question about what matters most.", allowSilence: false });
  }

  async stop(reason: "candidate" | "timeout" | "error" = "candidate") {
    if (this.view.ended) return;
    clearInterval(this.tick);
    clearTimeout(this.finishTimer);
    this.gen?.abort();
    this.record({ type: "session.ended", reason });
    this.s = reduce(this.cfg, this.s, { type: "session.ended", reason }, this.now()).state;
    try { await this.engine?.stop(); } catch { /* gone */ }
    this.engine = null;
    this.emit({ ended: true, agentSpeaking: false, candidateSpeaking: false, generating: false });
    this.onEnd?.();
  }

  contextPreview() { return contextNote(this.cfg, this.s, this.now()); }
}
