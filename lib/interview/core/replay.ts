// Replay is a pure function of the event log plus optional media (detailed design §7, MI-FB-2, MI-FB-4).

import type { LoggedEvent, Phase } from "./types.ts";

export interface FrameLike { t: number }

export interface Marker { t: number; seq: number; kind: "phase" | "curveball" | "hint" | "intervention" | "fallback" | "rule" | "look"; label: string }

export function duration(log: LoggedEvent[], audioMs = 0): number {
  return Math.max(audioMs, log.length ? log[log.length - 1].t : 0);
}

const PHASE_NAME: Record<Phase, string> = { lobby: "Lobby", intro: "Introductions", about_you: "About you", problem: "The problem", curveball: "Curveball", questions_for_me: "Your questions", wrap: "Wrap-up", done: "End" };

export function markers(log: LoggedEvent[]): Marker[] {
  const out: Marker[] = [];
  for (const { seq, t, e } of log) {
    if (e.type === "phase.changed") out.push({ t, seq, kind: "phase", label: PHASE_NAME[e.to] });
    else if (e.type === "curveball.fired") out.push({ t, seq, kind: "curveball", label: `Curveball: ${e.id.replace(/-/g, " ")}` });
    else if (e.type === "hint.requested") out.push({ t, seq, kind: "hint", label: "Hint requested" });
    else if (e.type === "turn.interviewer" && (e.origin === "intervention" || e.origin === "curveball")) out.push({ t, seq, kind: e.origin === "curveball" ? "curveball" : "intervention", label: e.origin === "curveball" ? "Curveball delivered" : "Interviewer cut in" });
    else if (e.type === "engine.fallback") out.push({ t, seq, kind: "fallback", label: `Switched to ${e.to}` });
    else if (e.type === "rule.hit") out.push({ t, seq, kind: "rule", label: e.rule.replace(/-/g, " ") });
    else if (e.type === "vision.look") out.push({ t, seq, kind: "look", label: "Looked at the diagram" });
  }
  return out;
}

/** Index of the last item with t ≤ at (items sorted by t), or -1. */
export function lastAt<T extends FrameLike>(items: T[], at: number): number {
  let lo = 0, hi = items.length - 1, ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (items[mid].t <= at) { ans = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return ans;
}

export interface ReplayState { phase: Phase; code: string; notes: string; board: string; lastTurnSeq: number }

/** What the workspaces held at time `at`. */
export function stateAt(log: LoggedEvent[], at: number): ReplayState {
  const st: ReplayState = { phase: "lobby", code: "", notes: "", board: "", lastTurnSeq: -1 };
  for (const { seq, t, e } of log) {
    if (t > at) break;
    if (e.type === "phase.changed") st.phase = e.to;
    else if (e.type === "digest") st[e.surface === "whiteboard" ? "board" : e.surface] = e.full;
    else if (e.type === "turn.candidate" || e.type === "turn.interviewer") st.lastTurnSeq = seq;
  }
  return st;
}

/**
 * "Redo this moment" (MI-FB-4): the transcript up to an interviewer turn, and that turn, so a short
 * drill can put the same question again with the same context.
 */
export function redoFrom(log: LoggedEvent[], seq: number, maxChars = 6000): { atMs: number; prompt: string; context: string } | null {
  const i = log.findIndex((x) => x.seq === seq);
  const at = log[i];
  if (!at || at.e.type !== "turn.interviewer") return null;
  const lines: string[] = [];
  for (const { e } of log.slice(0, i)) {
    if (e.type === "turn.candidate") lines.push(`CANDIDATE: ${e.text}`);
    else if (e.type === "turn.interviewer") lines.push(`INTERVIEWER: ${e.text}`);
  }
  let context = lines.join("\n");
  if (context.length > maxChars) context = `…${context.slice(-maxChars)}`;
  const st = stateAt(log, at.t);
  const work = [st.board && `Whiteboard then:\n${st.board}`, st.code && `Code then:\n${st.code}`, st.notes && `Notes then:\n${st.notes}`].filter(Boolean).join("\n\n");
  return { atMs: at.t, prompt: at.e.text, context: work ? `${context}\n\n${work}` : context };
}

/** The candidate's answer that followed an interviewer turn (what they are retrying). */
export function answerAfter(log: LoggedEvent[], seq: number): string {
  const i = log.findIndex((x) => x.seq === seq);
  const parts: string[] = [];
  for (const { e } of log.slice(i + 1)) {
    if (e.type === "turn.interviewer") break;
    if (e.type === "turn.candidate") parts.push(e.text);
  }
  return parts.join(" ");
}
