// Pure data types for the interview core. No imports with side effects: this folder runs in the
// browser, on a server, and under `node --test`.

import type { Overrides } from "./templates.ts";

export type Kind = "coding" | "hld" | "lld" | "ml" | "mlcode" | "behavioral";
export type Tone = "guide" | "neutral" | "tough" | "notetaker";
export type Pressure = "relaxed" | "realistic" | "high";
export type Level = "L3" | "L4" | "L5" | "L6";
export type EngineId = "text" | "ascent-voice" | "realtime" | "agora";
export type CurveballId = "requirement-change" | "bad-idea" | "interviewer-slip" | "out-of-curriculum" | "explain-pm" | "time-crunch" | "ceiling-probe" | "incident";
export type SurfaceId = "code" | "whiteboard" | "notes";

export type Phase = "lobby" | "intro" | "about_you" | "problem" | "curveball" | "questions_for_me" | "wrap" | "done";

export interface PoolFilter {
  topics?: string[];
  tiers?: (1 | 2 | 3)[];
  sources?: ("curriculum" | "imported" | "ai-generated")[];
  status?: ("unseen" | "due" | "weak" | "done")[];
}

export type Selection =
  | { mode: "random-all"; preferUnseen: boolean }
  | { mode: "random-pool"; pool: PoolFilter }
  | { mode: "exact"; questionId: string };

export interface ArcConfig {
  intro: boolean;
  aboutYou: boolean;
  curveball: boolean;
  questionsForMe: boolean;
}

export interface SessionConfig {
  kind: Kind;
  selection: Selection;
  tone: Tone | "surprise";
  level: Level;
  minutes: number;
  arc: ArcConfig;
  pressure: Pressure;
  curveballs: { frequency: "none" | "occasional" | "frequent" | "random"; disabled: CurveballId[] };
  engine: EngineId;
  voice: { voiceId?: string; rate: number; captions: boolean };
  mode: "real" | "coach";
  plainDoc: boolean; // no syntax highlighting, like a Google Doc
  seed: number;
  coachNotes?: string; // coach mode only: recurring gaps from past rounds
  format?: "standard" | "reverse" | "peer"; // reverse: you interview an AI candidate (MI-X-1); peer: two learners (MI-X-2)
  layout?: "desk" | "commute"; // commute: voice-only, phone layout (MI-X-7)
  record?: { audio: boolean; cloud: boolean }; // MI-FB-2: opt-in recording, kept on this device unless cloud
  loop?: { id: string; index: number; total: number }; // MI-X-3: a round of a loop day
  prompts?: Overrides; // developer-mode prompt overrides in force for this round (MI-DEV-4)
  privacy?: boolean; // MI-X-6: only on-device speech and a local model
  redo?: { atMs: number; context: string; prompt: string }; // MI-FB-4: a micro-drill from a replay moment
  steer?: string; // course checkpoints: the interview path to take after the high-level design (req3)
  company?: string; // req3 Craft: the company whose style, values and rubric the round follows (default google)
}

export interface InterviewQuestion {
  id: string;
  kind: Kind;
  title: string;
  statement: string; // what the interviewer asks (in their own words)
  constraints: string; // numbers to hold the design to; "" when not applicable
  followUps: string[];
  redFlags: string[];
  reference: string; // notes for the interviewer and scorer only, never read out
  approaches?: { name: string; time: string; space: string }[];
  source: "curriculum" | "imported" | "ai-generated";
  topic?: string;
}

export interface Persona {
  name: string;
  role: string;
  team: string;
  years: number;
  likes: string;
  dislikes: string;
  advice: string;
}

/** A component on the whiteboard, tagged by what it probably is. */
export type ComponentTag = "client" | "lb" | "gateway" | "service" | "cache" | "database" | "queue" | "object-store" | "cdn" | "search" | "worker" | "unknown";

export interface DiagramNode { id: string; label: string; tag: ComponentTag }
export interface DiagramEdge { from: string | null; to: string | null; label: string }
export interface DiagramSnapshot { nodes: DiagramNode[]; edges: DiagramEdge[]; notes: string[]; classes: ClassSketch[] }
export interface ClassSketch { name: string; fields: string[]; methods: string[] }

export interface Digest {
  surface: SurfaceId;
  full: string; // complete current state, compact text
  diff: string; // what changed since the last digest
}

export interface RuleHit { rule: string; detail: string }

export type TurnOrigin = "reply" | "intervention" | "curveball" | "timecall" | "phase" | "hint";

export type SessionEvent =
  | { type: "session.started"; question: string; tone: Tone; engine: EngineId }
  | { type: "session.ended"; reason: "candidate" | "timeout" | "error" }
  | { type: "phase.changed"; from: Phase; to: Phase }
  | { type: "turn.candidate"; text: string; interruptedAgent?: boolean }
  | { type: "turn.interviewer"; text: string; origin: TurnOrigin; interrupted?: boolean }
  | { type: "candidate.speaking"; on: boolean }
  | { type: "digest"; surface: SurfaceId; diff: string; full: string }
  | { type: "rule.hit"; rule: string; detail: string }
  | { type: "intervention.declined"; trigger: string; reason: string }
  | { type: "curveball.fired"; id: CurveballId }
  | { type: "curveball.skipped"; id: CurveballId; reason: string }
  | { type: "hint.requested" }
  | { type: "thinking.pause"; on: boolean }
  | { type: "vision.look"; surface: SurfaceId; description: string }
  | { type: "engine.fallback"; from: EngineId; to: EngineId; error: string }
  | { type: "budget"; level: "warn" | "over"; scope: string; usedUsd: number; limitUsd: number }
  | { type: "latency"; metric: "first_audio" | "first_token" | "turn"; ms: number }
  | { type: "tick" }; // periodic clock, drives silence and time checks

export interface LoggedEvent { seq: number; t: number; e: SessionEvent }

export interface ScheduledCurveball { id: CurveballId; atMin: number; fired: boolean }

export interface BrainState {
  phase: Phase;
  phaseStartedAt: number; // ms since session start
  startedAt: number; // epoch ms
  tone: Tone;
  persona: Persona;
  question: InterviewQuestion;
  curveballs: ScheduledCurveball[];
  lastCandidateAt: number; // ms since start, last time the candidate spoke or worked
  lastInterviewerAt: number;
  candidateSpeaking: boolean;
  interventionsThisPhase: number;
  lastInterventionAt: number;
  thinkingUntil: number; // ms since start; interventions held until then
  timeCalls: number[]; // minutes-left marks already called
  hints: number;
  openRuleHits: RuleHit[];
  digests: Partial<Record<SurfaceId, string>>; // latest full digest per surface
  turns: number;
  phaseWords: number; // candidate words spoken in the current phase
}

export type Action =
  | { type: "say"; origin: TurnOrigin; instruction: string; allowSilence: boolean }
  | { type: "phase"; to: Phase }
  | { type: "end" }
  | { type: "none" };
