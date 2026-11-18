import type { BrainState, Kind, LoggedEvent, SessionConfig } from "./types.ts";
import { arcBudget, expectedStage } from "./policy.ts";
import { curveballById } from "./curveballs.ts";
import { fragment } from "./templates.ts";

export const PROMPT_VERSION = "interviewer@1";
export const SILENCE = "[silence]";

export const KIND_NAME: Record<Kind, string> = {
  coding: "coding",
  hld: "system design",
  lld: "object-oriented design",
  behavioral: "behavioural (Googleyness and leadership)",
};

/** Instructions that do not change during a session (kept first, so provider prompt caching applies). */
export function systemPrompt(cfg: SessionConfig, s: BrainState, voice: boolean): string {
  const q = s.question;
  const b = arcBudget(cfg);
  const p = s.persona;
  const o = cfg.prompts;
  return `${fragment("interviewer.identity", o, { name: p.name, role: p.role, years: p.years, team: p.team, minutes: cfg.minutes, kind: KIND_NAME[cfg.kind] })}

# Your manner
${fragment(`interviewer.tone.${s.tone}`, o)}
${fragment(`interviewer.level.${cfg.level}`, o)}

${cfg.mode === "coach" && cfg.coachNotes ? `# Coach mode\n${fragment("interviewer.coach", o, { notes: cfg.coachNotes })}\n\n` : ""}# How you run the interview
${fragment("interviewer.rules", o, { silence: SILENCE })}
${fragment(voice ? "interviewer.voice" : "interviewer.text", o)}

# The question
Title (do not read the title out): ${q.title}
Question: ${q.statement}
${q.constraints ? `Numbers to hold the design to (reveal only when asked): ${q.constraints}\n` : ""}Reference notes (for you only, one good answer among many): ${q.reference || "none"}
${q.followUps.length ? `Follow-ups you can use: ${q.followUps.join(" | ")}\n` : ""}${q.redFlags.length ? `Common mistakes worth probing: ${q.redFlags.join(" | ")}\n` : ""}
${cfg.redo ? `# This is a drill\nYou are replaying one moment of an earlier round so the candidate can retry their answer. The conversation up to that moment, for context only:\n<<<\n${cfg.redo.context}\n>>>\nListen to the new answer and follow up once or twice exactly as you would have in the real round. When they have answered, say in one sentence that the drill is done. No feedback.\n` : `# Round plan
${[b.intro && "1. Introductions (about 1 minute): say hello, your first name and team in one sentence, and how the round works.", b.aboutYou && `2. Ask them to introduce themselves briefly (about ${b.aboutYou} minutes). Listen; at most one follow-up.`, `3. The main question (about ${b.problem} minutes).`, b.questions && `4. Last ${b.questions} minutes: ask "Is there anything you'd like to ask me?" and answer as yourself: you like that ${p.likes}; a downside is that ${p.dislikes}; your advice to new joiners: ${p.advice}. Keep answers short and honest. Do not invent confidential details.`].filter(Boolean).join("\n")}
${fragment("interviewer.closing", o)}`}`;
}

export function minutesLeft(cfg: SessionConfig, s: BrainState, nowMs: number) {
  return Math.max(0, Math.ceil(cfg.minutes - nowMs / 60000));
}

/** The changing part of the context, sent as a bracketed note with each generation. */
export function contextNote(cfg: SessionConfig, s: BrainState, nowMs: number): string {
  const left = minutesLeft(cfg, s, nowMs);
  const b = arcBudget(cfg);
  const problemMin = Math.max(0, nowMs / 60000 - b.intro - b.aboutYou);
  const parts = [`${left} minute${left === 1 ? "" : "s"} left. Current part: ${s.phase.replace(/_/g, " ")}.`];
  if (s.phase === "problem") parts.push(`By the clock they should be on ${expectedStage(cfg.kind, problemMin, b.problem).title}.`);
  if (s.digests.whiteboard) parts.push(`Their whiteboard right now:\n${s.digests.whiteboard}`);
  if (s.digests.code) parts.push(`Their code doc right now:\n${s.digests.code}`);
  if (s.digests.notes) parts.push(`Their notes doc right now:\n${s.digests.notes}`);
  return parts.join("\n");
}

export interface ChatMsg { role: "user" | "assistant"; content: string }

/** Transcript as chat messages, merged so roles alternate (Claude and Gemini require it). */
export function transcript(log: LoggedEvent[], maxTurns = 40): ChatMsg[] {
  const turns: ChatMsg[] = [];
  for (const { e } of log) {
    if (e.type === "turn.candidate") turns.push({ role: "user", content: e.text });
    else if (e.type === "turn.interviewer") turns.push({ role: "assistant", content: e.text });
  }
  const recent = turns.slice(-maxTurns);
  const merged: ChatMsg[] = [];
  for (const m of recent) {
    const last = merged[merged.length - 1];
    if (last && last.role === m.role) last.content += `\n${m.content}`;
    else merged.push({ ...m });
  }
  if (merged[0]?.role === "assistant") merged.unshift({ role: "user", content: "(The candidate has joined the call.)" });
  return merged;
}

/** Messages for one generation: transcript plus a final bracketed note carrying the instruction and context. */
export function buildTurn(cfg: SessionConfig, s: BrainState, log: LoggedEvent[], nowMs: number, instruction: string, allowSilence: boolean): ChatMsg[] {
  const msgs = transcript(log);
  const note = `[Interviewer note: ${contextNote(cfg, s, nowMs)}\nWhat to do now: ${instruction}${allowSilence ? ` If nothing needs saying, reply with exactly ${SILENCE}.` : ""}]`;
  const last = msgs[msgs.length - 1];
  if (!last || last.role === "assistant") msgs.push({ role: "user", content: `(The candidate is quiet or working.)\n${note}` });
  else last.content += `\n\n${note}`;
  return msgs;
}

/** A short, self-contained note for realtime engines, which keep the conversation history themselves. */
export function realtimeNote(cfg: SessionConfig, s: BrainState, nowMs: number, instruction: string): string {
  return `[Interviewer note, do not read aloud: ${contextNote(cfg, s, nowMs)}\nWhat to do now: ${instruction}]`;
}

export function judgePrompt(cfg: SessionConfig, s: BrainState, nowMs: number, trigger: string): { system: string; user: string } {
  return {
    system: fragment("judge.system", cfg.prompts, { kind: KIND_NAME[cfg.kind] }),
    user: `Question: ${s.question.statement}\nNumbers: ${s.question.constraints || "n/a"}\n${contextNote(cfg, s, nowMs)}\nTrigger: ${trigger}\nTone: ${s.tone}.`,
  };
}

export function curveballInstruction(id: string, s: BrainState): string {
  const c = curveballById.get(id as never);
  return c ? c.cue(s.question) : "";
}
