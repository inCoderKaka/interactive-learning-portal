"use client";
import type { Settings } from "@/lib/types";
import type { EngineId } from "../core/types";

/** Events every engine reports back to the session controller. */
export interface EngineCallbacks {
  candidateSpeaking(on: boolean): void;
  candidatePartial(text: string): void; // live captions
  candidateTurn(text: string, interruptedAgent: boolean): void;
  interviewerPartial(text: string): void;
  interviewerTurn(text: string, interrupted: boolean): void; // realtime engines only; pipeline turns come back from speak()
  agentSpeaking(on: boolean): void;
  latency(metric: "first_audio" | "first_token" | "turn", ms: number): void;
  status(text: string): void;
  error(err: Error, fatal: boolean): void;
}

export interface StartOptions {
  settings: Settings;
  instructions: string; // system prompt (realtime engines use it as session instructions)
  endOfSpeechMs: number;
  keyterms: string[];
  voice: { voiceId?: string; rate: number };
}

/** Pipeline engines speak text the controller generated; realtime engines generate it themselves. */
export interface EngineHandle {
  id: EngineId;
  kind: "pipeline" | "realtime";
  /** Pipeline: speak a stream of text; resolves with what was said and whether the candidate cut in. */
  speak?(chunks: AsyncIterable<string>, signal: AbortSignal): Promise<{ text: string; interrupted: boolean }>;
  /** Realtime: add a bracketed note and ask the model to respond to it now. */
  respond?(note: string): void;
  /** Realtime: replace session instructions. */
  setInstructions?(text: string): void;
  /** Realtime: add context the model should know without replying to it. */
  addContext?(text: string): void;
  /** Realtime: let the model see an image (a whiteboard snapshot). */
  sendImage?(jpeg: Blob): Promise<void>;
  /** Stop any speech in progress. */
  cancelSpeech(): void;
  mute(on: boolean): void;
  stop(): Promise<void>;
}

export interface Engine {
  id: EngineId;
  label: string;
  /** Why it cannot run here, or null when it can. */
  unavailable(settings: Settings): string | null;
  start(opts: StartOptions, cb: EngineCallbacks): Promise<EngineHandle>;
}
