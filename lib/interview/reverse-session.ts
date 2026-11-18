"use client";
// Reverse mode (MI-X-1): the learner is the interviewer, an AI plays the candidate with planted mistakes.
// Engines are role-agnostic: the human's speech arrives as "candidate" turns and the AI's as
// "interviewer" turns, so every engine works unchanged.

import type { Settings } from "@/lib/types";
import type { InterviewQuestion, LoggedEvent, SessionConfig } from "./core/types";
import { candidateName, candidatePrompt, plantMistakes, splitWork, type PlantedMistake } from "./core/reverse";
import { END_OF_SPEECH_MS } from "./core/policy";
import { engineFor, fallbackFor } from "./engines/registry";
import type { EngineCallbacks, EngineHandle } from "./engines/types";
import { keyterms } from "./questions";
import { activePrompts, providerReady, runTask } from "./tasks";
import { setMeterScope } from "./meter";

export interface ReverseLine { seq: number; t: number; who: "you" | "ai"; text: string }
export interface ReverseView {
  lines: ReverseLine[]; youPartial: string; aiPartial: string; aiSpeaking: boolean; youSpeaking: boolean;
  generating: boolean; doc: string; board: string; ended: boolean; error: string; status: string; muted: boolean; engine: SessionConfig["engine"];
}

export class ReverseSession {
  readonly id = crypto.randomUUID();
  readonly cfg: SessionConfig;
  readonly planted: PlantedMistake[];
  readonly name: string;
  readonly question: InterviewQuestion;
  private settings: Settings;
  private engine: EngineHandle | null = null;
  private t0 = 0;
  private seq = 0;
  private gen: AbortController | null = null;
  private view: ReverseView;
  private listeners = new Set<(v: ReverseView) => void>();
  private onEnd?: () => void;

  constructor(cfg: SessionConfig, question: InterviewQuestion, settings: Settings) {
    this.cfg = { ...cfg, prompts: cfg.prompts ?? activePrompts(settings) };
    this.settings = settings;
    this.question = question;
    this.planted = plantMistakes(cfg.kind, cfg.seed);
    this.name = candidateName(cfg.seed);
    this.view = { lines: [], youPartial: "", aiPartial: "", aiSpeaking: false, youSpeaking: false, generating: false, doc: "", board: "", ended: false, error: "", status: "", muted: false, engine: cfg.engine };
  }

  subscribe(fn: (v: ReverseView) => void) { this.listeners.add(fn); fn(this.view); return () => { this.listeners.delete(fn); }; }
  private emit(p: Partial<ReverseView> = {}) { this.view = { ...this.view, ...p }; for (const l of this.listeners) l(this.view); }
  onEnded(fn: () => void) { this.onEnd = fn; }
  now() { return this.t0 ? Date.now() - this.t0 : 0; }
  get startedAt() { return this.t0; }

  private push(who: "you" | "ai", text: string) {
    this.emit({ lines: [...this.view.lines, { seq: ++this.seq, t: this.now(), who, text }] });
  }

  private aiSaid(raw: string) {
    const w = splitWork(raw);
    this.emit({ ...(w.doc !== undefined ? { doc: w.doc } : {}), ...(w.board !== undefined ? { board: w.board } : {}) });
    if (w.speech) this.push("ai", w.speech);
  }

  private instructions(voice: boolean) { return candidatePrompt(this.cfg.kind, this.cfg.level, this.question, this.planted, this.cfg.seed, voice, this.cfg.prompts); }

  private callbacks(): EngineCallbacks {
    return {
      candidateSpeaking: (on) => { this.emit({ youSpeaking: on }); if (on && this.gen && this.engine?.kind !== "realtime") this.gen.abort(); },
      candidatePartial: (t) => this.emit({ youPartial: t }),
      candidateTurn: (t) => { this.emit({ youPartial: "" }); this.youSaid(t); },
      interviewerPartial: (t) => this.emit({ aiPartial: splitWork(t).speech }),
      interviewerTurn: (t) => { this.emit({ aiPartial: "" }); this.aiSaid(t); },
      agentSpeaking: (on) => this.emit({ aiSpeaking: on }),
      latency: () => {},
      status: (t) => this.emit({ status: t }),
      error: (e, fatal) => { if (fatal) void this.fallback(e); else this.emit({ error: e.message }); },
    };
  }

  private async startEngine(id: SessionConfig["engine"]) {
    const eng = engineFor(id, this.settings);
    const why = eng.unavailable(this.settings);
    if (why) throw new Error(why);
    this.engine = await eng.start({ settings: this.settings, instructions: this.instructions(id !== "text"), endOfSpeechMs: END_OF_SPEECH_MS[this.cfg.pressure], keyterms: keyterms(this.question), voice: this.cfg.voice }, this.callbacks());
    this.emit({ engine: id });
    setMeterScope(id);
  }

  async start() {
    if (!providerReady(this.settings, this.settings.provider) && this.cfg.engine !== "realtime" && this.cfg.engine !== "agora") throw new Error("Reverse mode needs an AI provider to play the candidate.");
    this.emit({ status: "Connecting…" });
    await this.startEngine(this.cfg.engine);
    this.t0 = Date.now();
    this.emit({ status: "" });
  }

  private async fallback(err: Error) {
    const next = fallbackFor(this.view.engine, this.settings);
    try { await this.engine?.stop(); } catch { /* gone */ }
    this.engine = null;
    if (!next) { this.emit({ error: err.message }); return; }
    this.emit({ error: `${err.message} Continuing on a different engine.` });
    try { await this.startEngine(next); } catch (e) { this.emit({ error: e instanceof Error ? e.message : String(e) }); }
  }

  say(text: string) {
    const t = text.trim();
    if (!t || this.view.ended) return;
    this.youSaid(t);
    if (this.engine?.kind === "realtime") this.engine.respond?.(`[The interviewer typed this instead of speaking: "${t}". Answer as the candidate.]`);
  }

  private youSaid(t: string) {
    this.push("you", t);
    if (this.engine?.kind === "pipeline") void this.reply();
  }

  /** Pipeline engines: generate the candidate's reply, keep code or diagram for the doc, speak the rest. */
  private async reply() {
    this.gen?.abort();
    const ctl = new AbortController();
    this.gen = ctl;
    this.emit({ generating: true });
    try {
      const msgs: { role: "user" | "assistant"; content: string }[] = [];
      for (const l of this.view.lines) {
        const role = l.who === "you" ? "user" : "assistant";
        const last = msgs[msgs.length - 1];
        if (last?.role === role) last.content += `\n${l.text}`; else msgs.push({ role, content: l.text });
      }
      if (msgs[0]?.role === "assistant") msgs.unshift({ role: "user", content: "(The interviewer joined the call.)" });
      const raw = await runTask(this.settings, "candidate.turn", this.instructions(this.view.engine !== "text"), msgs, { signal: ctl.signal });
      if (ctl.signal.aborted) return;
      const w = splitWork(raw);
      this.emit({ ...(w.doc !== undefined ? { doc: w.doc } : {}), ...(w.board !== undefined ? { board: w.board } : {}), generating: false });
      if (!w.speech || !this.engine?.speak) return;
      const { text } = await this.engine.speak((async function* () { yield w.speech; })(), ctl.signal);
      if (text) this.push("ai", text);
    } catch (e) {
      if (!ctl.signal.aborted) this.emit({ error: e instanceof Error ? e.message : String(e) });
    } finally {
      if (this.gen === ctl) this.gen = null;
      this.emit({ generating: false });
    }
  }

  mute(on: boolean) { this.engine?.mute(on); this.emit({ muted: on }); }

  async stop() {
    if (this.view.ended) return;
    this.gen?.abort();
    try { await this.engine?.stop(); } catch { /* gone */ }
    this.engine = null;
    setMeterScope("other");
    this.emit({ ended: true, aiSpeaking: false, youSpeaking: false, generating: false });
    this.onEnd?.();
  }

  /** The round as a standard event log, for history and evidence (you = interviewer, AI = candidate). */
  toLog(): LoggedEvent[] {
    const log: LoggedEvent[] = [{ seq: 0, t: 0, e: { type: "session.started", question: this.question.id, tone: "neutral", engine: this.view.engine } }];
    for (const l of this.view.lines) log.push({ seq: l.seq, t: l.t, e: l.who === "you" ? { type: "turn.interviewer", text: l.text, origin: "reply" } : { type: "turn.candidate", text: l.text } });
    if (this.view.doc) log.push({ seq: this.seq + 1, t: this.now(), e: { type: "digest", surface: "code", diff: "final", full: this.view.doc } });
    if (this.view.board) log.push({ seq: this.seq + 2, t: this.now(), e: { type: "digest", surface: "whiteboard", diff: "final", full: this.view.board } });
    return log;
  }

  transcript(): string {
    return this.view.lines.map((l) => `#${l.seq} ${l.who === "you" ? "INTERVIEWER" : "CANDIDATE"}: ${l.text}`).join("\n");
  }
}
