"use client";
// Engine registry. Adding an engine = one adapter file + one entry here (ADR 0002).

import type { Settings } from "@/lib/types";
import type { EngineId } from "../core/types";
import { getKeys } from "../providers/keys";
import { getAi } from "../tasks";
import { textEngine } from "./text";
import { ascentVoiceEngine } from "./ascent-voice";
import { geminiLiveEngine } from "./realtime-gemini";
import { openAiRealtimeEngine } from "./realtime-openai";
import { agoraEngine } from "./agora";
import { AGORA_USD_PER_MIN, OPENAI_SPEECH_USD_PER_MIN, REALTIME_USD_PER_MIN } from "../core/usage";
import type { Engine } from "./types";

export function engineFor(id: EngineId, s: Settings): Engine {
  if (id === "text") return textEngine;
  if (id === "ascent-voice") return ascentVoiceEngine;
  if (id === "agora") return agoraEngine;
  return getAi(s).realtime.provider === "openai" ? openAiRealtimeEngine : geminiLiveEngine;
}

export const ENGINE_INFO: Record<EngineId, { label: string; needs: string; cost: string; quality: string }> = {
  realtime: { label: "Realtime voice", needs: "Your Gemini or OpenAI key", cost: "Realtime audio tokens on your provider account: the most expensive option per minute.", quality: "Most natural: native audio, fast turn-taking, you can talk over it." },
  "ascent-voice": { label: "Ascent Voice", needs: "Any AI key; Chrome or Edge for free speech recognition", cost: "Only your normal LLM usage with browser speech (free). OpenAI speech adds per-minute cost.", quality: "Good. About 1–2 s per reply; browser voices sound robotic." },
  text: { label: "Text", needs: "Any AI key", cost: "Only your normal LLM usage.", quality: "Typed chat on a shared doc." },
  agora: { label: "Agora", needs: "Your own Agora project (App ID and App Certificate)", cost: "Agora agent minutes and its speech and LLM vendors, billed to your Agora project.", quality: "Good: Agora's managed pipeline. Optional; the other engines need no second account." },
};

/** Best available engine: realtime if the key exists, else Ascent Voice, else text. */
export function recommendedEngine(s: Settings): EngineId {
  const k = getKeys();
  const rt = getAi(s).realtime;
  if ((rt.provider === "openai" && k.openai) || (rt.provider === "gemini" && k.gemini)) return "realtime";
  if (!ascentVoiceEngine.unavailable(s)) return "ascent-voice";
  return "text";
}

/** Fallback order when an engine fails mid-round. */
export function fallbackFor(id: EngineId, s: Settings): EngineId | null {
  if (id === "realtime") return ascentVoiceEngine.unavailable(s) ? "text" : "ascent-voice";
  if (id === "ascent-voice") return "text";
  if (id === "agora") return ascentVoiceEngine.unavailable(s) ? "text" : "ascent-voice";
  return null;
}

/** Rough cost of a round, for disclosure before it starts. Rates are approximate and change; treat as an order of magnitude. */
export function estimateCostUsd(id: EngineId, minutes: number, s: Settings): { low: number; high: number } {
  const provider = id === "realtime" ? getAi(s).realtime.provider : s.provider;
  if (id === "realtime") { const r = REALTIME_USD_PER_MIN[provider] ?? REALTIME_USD_PER_MIN.gemini; return { low: minutes * r.low, high: minutes * r.high }; }
  if (id === "agora") return { low: minutes * AGORA_USD_PER_MIN.low, high: minutes * AGORA_USD_PER_MIN.high };
  if (s.provider === "local") return { low: 0, high: 0 };
  const turns = minutes * 1.2;
  const perTurn = s.provider === "claude" ? 0.004 : s.provider === "openai" ? 0.002 : 0.001;
  const speech = id === "ascent-voice" && getAi(s).speech.tts === "openai" ? minutes * OPENAI_SPEECH_USD_PER_MIN : 0;
  return { low: turns * perTurn * 0.6 + speech, high: turns * perTurn * 2 + speech + 0.15 };
}
