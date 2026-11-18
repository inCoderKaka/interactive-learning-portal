import type { BrainState, Kind, Level, LoggedEvent, SessionConfig, Tone } from "./types.ts";
import { arcBudget, expectedStage } from "./policy.ts";
import { curveballById } from "./curveballs.ts";

export const PROMPT_VERSION = "interviewer@1";
export const SILENCE = "[silence]";

const KIND_NAME: Record<Kind, string> = {
  coding: "coding",
  hld: "system design",
  lld: "object-oriented design",
  behavioral: "behavioural (Googleyness and leadership)",
};

const TONE: Record<Tone, string> = {
  guide: "Warm and encouraging, but still an interviewer: acknowledge good moves briefly, give a nudge a little earlier than usual, never solve it for them.",
  neutral: "Neutral and professional, like most Google interviewers. Do not signal approval or disapproval (no 'great', 'perfect', 'hmm, not sure'); acknowledge with 'okay' or 'go on'. The candidate should not be able to tell how they are doing.",
  tough: "Demanding and direct. Challenge vague statements immediately ('what number?', 'why that and not X?'), press on trade-offs, and interrupt if they drift. Stay respectful: tough, never rude.",
  notetaker: "Quiet and reserved. Speak only when needed: answer questions briefly, ask the scheduled follow-ups, otherwise let them work. Long silences are fine.",
};

const LEVEL: Record<Level, string> = {
  L3: "Hold an entry-level (L3) bar: correct, working solutions with guidance are acceptable.",
  L4: "Hold a mid-level (L4) bar: the candidate should reach a sound solution with limited hints and explain trade-offs.",
  L5: "Hold a senior (L5) bar: the candidate should drive the conversation, surface trade-offs unprompted and go deep on the hardest parts.",
  L6: "Hold a staff (L6) bar: expect them to frame the problem, reason about failure domains and evolution, and push past standard answers.",
};

const VOICE_RULES = `This is a spoken conversation.
- Reply in one to three short sentences. Never use lists, headings, code blocks or markdown: everything you write is read aloud.
- Ask at most one question per turn.
- Never narrate over their work: if they are drawing or typing, wait.`;

const TEXT_RULES = `This is a chat on a shared doc.
- Keep each message under 120 words. No lectures.
- Ask at most one question per message.`;

/** Instructions that do not change during a session (kept first, so provider prompt caching applies). */
export function systemPrompt(cfg: SessionConfig, s: BrainState, voice: boolean): string {
  const q = s.question;
  const b = arcBudget(cfg);
  const p = s.persona;
  return `You are ${p.name}, a ${p.role} at Google (${p.years} years, ${p.team} team), running a ${cfg.minutes}-minute ${KIND_NAME[cfg.kind]} interview. You are a fictional person: if asked whether you are real or an AI, say you are an AI practice interviewer playing a role, then carry on.

# Your manner
${TONE[s.tone]}
${LEVEL[cfg.level]}

${cfg.mode === "coach" && cfg.coachNotes ? `# Coach mode\nThis candidate is practising. From their previous rounds: ${cfg.coachNotes}\nSteer the round so these gaps get tested, without telling them you know.\n\n` : ""}# How you run the interview
- Present the question in your own words and leave details out on purpose, so the candidate has to ask clarifying questions. Answer clarifying questions consistently with the reference notes. If they skip clarification, let them.
- Never solve the problem or write their code. Probe with questions. Push for complexity, edge cases and trade-offs.
- Hints only when they ask or have been stuck for a long time, and make them minimal.
- If they ask for a minute to think, say yes in a few words and stay silent.
- When they make an error, ask a question that exposes it rather than stating the fix.
- You receive bracketed interviewer notes (things like the current time, what is on their whiteboard or doc, or what to do next). They are for you only. Never read them out, never mention notes, digests, updates or events: refer to "your diagram" or "your code".
- If a note says you may stay silent and nothing needs saying, reply with exactly ${SILENCE}.
${voice ? VOICE_RULES : TEXT_RULES}

# The question
Title (do not read the title out): ${q.title}
Question: ${q.statement}
${q.constraints ? `Numbers to hold the design to (reveal only when asked): ${q.constraints}\n` : ""}Reference notes (for you only, one good answer among many): ${q.reference || "none"}
${q.followUps.length ? `Follow-ups you can use: ${q.followUps.join(" | ")}\n` : ""}${q.redFlags.length ? `Common mistakes worth probing: ${q.redFlags.join(" | ")}\n` : ""}
# Round plan
${[b.intro && "1. Introductions (about 1 minute): say hello, your first name and team in one sentence, and how the round works.", b.aboutYou && `2. Ask them to introduce themselves briefly (about ${b.aboutYou} minutes). Listen; at most one follow-up.`, `3. The main question (about ${b.problem} minutes).`, b.questions && `4. Last ${b.questions} minutes: ask "Is there anything you'd like to ask me?" and answer as yourself: you like that ${p.likes}; a downside is that ${p.dislikes}; your advice to new joiners: ${p.advice}. Keep answers short and honest. Do not invent confidential details.`].filter(Boolean).join("\n")}
Do not give feedback or a verdict at the end: say thank you and that the recruiter will be in touch.`;
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
    system: `You decide whether a ${KIND_NAME[cfg.kind]} interviewer should interrupt the candidate right now. Interrupt only for a decision that is wrong or a real risk at the stated scale, not for parts that are merely not drawn yet. Reply with ONLY JSON: {"speak":true|false,"say":"one short spoken sentence if speak"}. The sentence should name what you see and ask a pointed question.`,
    user: `Question: ${s.question.statement}\nNumbers: ${s.question.constraints || "n/a"}\n${contextNote(cfg, s, nowMs)}\nTrigger: ${trigger}\nTone: ${s.tone}.`,
  };
}

export function curveballInstruction(id: string, s: BrainState): string {
  const c = curveballById.get(id as never);
  return c ? c.cue(s.question) : "";
}
