"use client";
// Privacy mode (MI-X-6): on-device speech recognition and synthesis plus a local-server LLM, so audio and
// the transcript stay on this machine. These helpers derive the settings for such a round and say what
// is missing; dataFlow() (core/dataflow.ts) produces the disclosure shown before the round.

import type { Settings } from "@/lib/types";
import { dataFlow, type FlowInput, type SttKind, type TtsKind } from "./core/dataflow";
import type { EngineId, SessionConfig } from "./core/types";
import { TASKS, getAi, providerReady, resolved } from "./tasks";

export function localVoices(): SpeechSynthesisVoice[] {
  return typeof speechSynthesis === "undefined" ? [] : speechSynthesis.getVoices().filter((v) => v.localService && v.lang.startsWith("en"));
}

/** Why privacy mode cannot run here, or null. */
export function privacyBlocker(s: Settings): string | null {
  if (!providerReady(s, "local")) return "Privacy mode needs your own local model server (Settings → AI reviewer → local-server).";
  if (typeof Worker === "undefined" || typeof WebAssembly === "undefined") return "This browser cannot run on-device speech recognition.";
  return null;
}

/** The settings a privacy round runs with: every task on the local server, on-device speech only. */
export function privateSettings(s: Settings): Settings {
  const ai = getAi(s);
  return {
    ...s,
    provider: "local",
    ai: {
      ...ai, preset: "private",
      tasks: Object.fromEntries(TASKS.map((t) => [t.id, { ...(ai.tasks[t.id] ?? {}), provider: "local" as const }])),
      speech: { ...ai.speech, stt: ai.speech.stt === "webspeech-local" ? "webspeech-local" : "whisper-local", tts: "browser-local" },
    },
  };
}

/** The disclosure for a round as configured. */
export function flowsFor(cfg: SessionConfig, s: Settings, signedIn: boolean) {
  const eff = cfg.privacy ? privateSettings(s) : s;
  const ai = getAi(eff);
  const tasks = cfg.format === "reverse" ? ["candidate.turn", "reverse.grade"] as const : ["interviewer.turn", "interviewer.judge", "scorecard", "summarise"] as const;
  const input: FlowInput = {
    engine: cfg.engine as EngineId,
    stt: ai.speech.stt as SttKind,
    tts: ai.speech.tts as TtsKind,
    llm: providerReady(eff, eff.provider) ? [...new Set(tasks.map((t) => resolved(eff, t).provider))] : [],
    realtime: ai.realtime.provider,
    recordAudio: !!cfg.record?.audio,
    recordCloud: !!cfg.record?.cloud,
    signedIn: signedIn && !cfg.privacy,
    peer: cfg.format === "peer",
  };
  return dataFlow(input);
}
