"use client";
// Every AI call is a named task with its own provider, model and parameters (docs: AI configuration §2-4).

import type { Settings } from "@/lib/types";
import { complete, stream, type GenParams, type Msg, type ProviderId } from "./providers/llm";
import { getKeys } from "./providers/keys";

export type TaskId =
  | "interviewer.turn" | "interviewer.judge" | "summarise" | "vision.describe" | "question.generate" | "scorecard"
  | "code.review" | "stage.grade" | "recall.grade" | "twists" | "hint";

export const TASKS: { id: TaskId; label: string; what: string; latency: "high" | "medium" | "low" }[] = [
  { id: "interviewer.turn", label: "Interviewer reply", what: "Each interviewer turn in text and Ascent Voice rounds.", latency: "high" },
  { id: "interviewer.judge", label: "Interrupt judge", what: "Decides whether a whiteboard problem is worth interrupting for.", latency: "medium" },
  { id: "summarise", label: "History summary", what: "Condenses older turns so long rounds stay within budget.", latency: "low" },
  { id: "vision.describe", label: "Diagram vision", what: "“Look at my diagram”: describes a whiteboard image.", latency: "medium" },
  { id: "question.generate", label: "New question", what: "Writes an out-of-curriculum question before the round.", latency: "low" },
  { id: "scorecard", label: "Hiring-committee scorecard", what: "Writes the evidence-based feedback after a mock.", latency: "low" },
  { id: "code.review", label: "Code review", what: "Reviews code on problem pages.", latency: "low" },
  { id: "stage.grade", label: "Design stage grading", what: "Grades design answers stage by stage.", latency: "low" },
  { id: "recall.grade", label: "Recall check", what: "Checks 3-minute recall drills in review.", latency: "medium" },
  { id: "twists", label: "Variations", what: "Generates new twists and follow-ups for a problem.", latency: "low" },
  { id: "hint", label: "Hints", what: "Smallest useful nudge on problem pages.", latency: "medium" },
];

/** "" = the model chosen in Settings → AI reviewer. Tiers resolve per provider. */
export type ModelChoice = "" | "tier:small" | "tier:strong" | string;

export interface TaskProfile {
  provider: ProviderId | "";   // "" = the default provider
  model: ModelChoice;
  params: GenParams;
  timeoutMs: number;
  retries: number;
  samples?: number;            // self-consistency, scorecard only
}

export type PresetId = "recommended" | "budget" | "max" | "private";
export const PRESETS: { id: PresetId; label: string; what: string }[] = [
  { id: "recommended", label: "Recommended", what: "Realistic at a sensible cost: your model for the round, a strong model and three samples for the scorecard." },
  { id: "budget", label: "Budget", what: "Smallest models, one scorecard sample, free browser speech." },
  { id: "max", label: "Max quality", what: "Strong models everywhere, more reasoning, five scorecard samples." },
  { id: "private", label: "Private / local", what: "Only your local server. Pair with Ascent Voice for speech." },
];

const P = (provider: TaskProfile["provider"], model: ModelChoice, params: GenParams, extra: Partial<TaskProfile> = {}): TaskProfile => ({ provider, model, params, timeoutMs: 60000, retries: 1, ...extra });

const RECOMMENDED: Record<TaskId, TaskProfile> = {
  "interviewer.turn": P("", "", { temperature: 0.6, topP: 0.95, maxOutputTokens: 320, reasoning: "off", promptCaching: true }, { timeoutMs: 20000, retries: 0 }),
  "interviewer.judge": P("", "tier:small", { temperature: 0.1, maxOutputTokens: 160, reasoning: "off", json: true }, { timeoutMs: 10000, retries: 0 }),
  summarise: P("", "tier:small", { temperature: 0.2, maxOutputTokens: 300, reasoning: "off" }),
  "vision.describe": P("", "", { temperature: 0.2, maxOutputTokens: 500 }),
  "question.generate": P("", "tier:strong", { temperature: 0.9, maxOutputTokens: 1600, json: true }),
  scorecard: P("", "tier:strong", { temperature: 0.2, maxOutputTokens: 3000, json: true, reasoning: "medium" }, { timeoutMs: 120000, samples: 3 }),
  "code.review": P("", "", { temperature: 0.4, maxOutputTokens: 2500 }),
  "stage.grade": P("", "", { temperature: 0.4, maxOutputTokens: 2500 }),
  "recall.grade": P("", "", { temperature: 0.4, maxOutputTokens: 1200 }),
  twists: P("", "", { temperature: 0.8, maxOutputTokens: 1200 }),
  hint: P("", "", { temperature: 0.4, maxOutputTokens: 300 }),
};

function presetProfiles(id: PresetId): Record<TaskId, TaskProfile> {
  const r = structuredClone(RECOMMENDED);
  if (id === "budget") {
    for (const t of Object.keys(r) as TaskId[]) r[t].model = "tier:small";
    r.scorecard.samples = 1;
    r.scorecard.params.reasoning = "off";
  } else if (id === "max") {
    for (const t of Object.keys(r) as TaskId[]) if (t !== "interviewer.turn" && t !== "interviewer.judge") r[t].model = "tier:strong";
    r["interviewer.turn"].params.temperature = 0.5;
    r.scorecard.samples = 5;
    r.scorecard.params.reasoning = "high";
  } else if (id === "private") {
    for (const t of Object.keys(r) as TaskId[]) { r[t].provider = "local"; r[t].model = ""; }
    r.scorecard.samples = 1;
  }
  return r;
}

export const TIERS: Record<Exclude<ProviderId, "local">, { small: string; strong: string }> = {
  gemini: { small: "gemini-2.5-flash-lite", strong: "gemini-2.5-pro" },
  claude: { small: "claude-haiku-5-5", strong: "claude-opus-5-5" },
  openai: { small: "gpt-5-nano", strong: "gpt-5" },
};

// ---- voice and session settings ----

export interface SpeechSettings {
  stt: "webspeech" | "openai";
  tts: "browser" | "openai";
  ttsVoice: string;       // browser voice name or OpenAI voice
  rate: number;
  endOfSpeechMs: number;  // 0 = from the pressure setting
  bargeIn: boolean;
  bargeInMs: number;
  lang: string;
  keyterms: boolean;
}
export interface RealtimeSettings {
  provider: "gemini" | "openai";
  geminiModel: string;
  openaiModel: string;
  geminiVoice: string;
  openaiVoice: string;
  vad: "semantic" | "server";
}
export interface AiSettings {
  devMode: boolean;
  preset: PresetId;
  tasks: Partial<Record<TaskId, Partial<TaskProfile> & { params?: GenParams }>>;
  speech: SpeechSettings;
  realtime: RealtimeSettings;
  budgetUsd: number; // 0 = no budget
}

export const DEFAULT_AI: AiSettings = {
  devMode: false,
  preset: "recommended",
  tasks: {},
  speech: { stt: "webspeech", tts: "browser", ttsVoice: "", rate: 1, endOfSpeechMs: 0, bargeIn: true, bargeInMs: 250, lang: "en-US", keyterms: true },
  realtime: { provider: "gemini", geminiModel: "gemini-2.5-flash-native-audio-preview-09-2025", openaiModel: "gpt-realtime", geminiVoice: "Charon", openaiVoice: "cedar", vad: "semantic" },
  budgetUsd: 0,
};

export function getAi(s: Settings): AiSettings {
  const a = (s.ai ?? {}) as Partial<AiSettings>;
  return {
    ...DEFAULT_AI,
    ...a,
    tasks: (a.tasks ?? {}) as AiSettings["tasks"],
    speech: { ...DEFAULT_AI.speech, ...(a.speech ?? {}) },
    realtime: { ...DEFAULT_AI.realtime, ...(a.realtime ?? {}) },
  };
}

/** The effective profile for a task: preset, then developer-mode overrides. */
export function profileFor(s: Settings, task: TaskId): TaskProfile {
  const ai = getAi(s);
  const base = presetProfiles(ai.preset)[task];
  const o = ai.devMode ? ai.tasks[task] : undefined;
  if (!o) return base;
  return { ...base, ...o, params: { ...base.params, ...(o.params ?? {}) } };
}

export function defaultModel(s: Settings, provider: ProviderId): string {
  return provider === "gemini" ? s.geminiModel : provider === "claude" ? s.claudeModel : provider === "openai" ? s.openaiModel : s.localModel;
}

export function resolveModel(s: Settings, provider: ProviderId, choice: ModelChoice): string {
  if (!choice) return defaultModel(s, provider);
  if (choice.startsWith("tier:")) return provider === "local" ? s.localModel : TIERS[provider][choice === "tier:small" ? "small" : "strong"];
  return choice;
}

export function providerReady(s: Settings, p: ProviderId): boolean {
  const k = getKeys();
  return p === "local" ? !!s.localUrl && !!s.localModel : !!k[p];
}

export function resolved(s: Settings, task: TaskId) {
  const prof = profileFor(s, task);
  const provider: ProviderId = prof.provider && providerReady(s, prof.provider) ? prof.provider : s.provider;
  return { ...prof, provider, model: resolveModel(s, provider, prof.model) };
}

/** Run a task, retrying and then falling back to your default model if a tier model is unavailable. */
export async function runTask(s: Settings, task: TaskId, system: string, messages: Msg[], opts: { signal?: AbortSignal; params?: GenParams } = {}): Promise<string> {
  const r = resolved(s, task);
  const req = { provider: r.provider, model: r.model, system, messages, params: { ...r.params, ...opts.params }, timeoutMs: r.timeoutMs };
  let lastErr: unknown;
  for (let i = 0; i <= r.retries; i++) {
    try {
      return await complete(req, s, opts.signal);
    } catch (e) {
      lastErr = e;
      if (opts.signal?.aborted) throw e;
      if (i < r.retries) await new Promise((ok) => setTimeout(ok, 600 * 2 ** i));
    }
  }
  const fallback = defaultModel(s, r.provider);
  if (fallback && fallback !== r.model && /\b(?:404|400|not[_ ]found|model)\b/i.test(String(lastErr))) return complete({ ...req, model: fallback }, s, opts.signal);
  throw lastErr;
}

export function streamTask(s: Settings, task: TaskId, system: string, messages: Msg[], signal?: AbortSignal) {
  const r = resolved(s, task);
  return stream({ provider: r.provider, model: r.model, system, messages, params: r.params, timeoutMs: r.timeoutMs }, s, signal);
}
