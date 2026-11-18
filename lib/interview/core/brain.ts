// The interviewer brain: a pure reducer from (config, state, event, time) to (state, actions).
// It never calls a model or touches the DOM. Engines turn its "say" actions into speech or text.

import type { Action, BrainState, EngineId, InterviewQuestion, Phase, SessionConfig, SessionEvent } from "./types.ts";
import { makePersona, resolveTone } from "./persona.ts";
import { scheduleCurveballs } from "./curveballs.ts";
import { PRESSURE, THINKING_PAUSE_MS, arcBudget, canIntervene, silenceMs } from "./policy.ts";
import { curveballInstruction } from "./prompts.ts";

export function initBrain(cfg: SessionConfig, question: InterviewQuestion, startedAt: number): BrainState {
  return {
    phase: "lobby",
    phaseStartedAt: 0,
    startedAt,
    tone: resolveTone(cfg.tone, cfg.seed),
    persona: makePersona(cfg.seed, cfg.kind),
    question,
    curveballs: scheduleCurveballs(cfg),
    lastCandidateAt: 0,
    lastInterviewerAt: 0,
    candidateSpeaking: false,
    interventionsThisPhase: 0,
    lastInterventionAt: -1,
    thinkingUntil: 0,
    timeCalls: [],
    hints: 0,
    openRuleHits: [],
    digests: {},
    turns: 0,
    phaseWords: 0,
  };
}

const THINK_RE = /\b(?:give me|let me|can i (?:have|take)|i need) (?:a |one )?(?:minute|moment|sec(?:ond)?|bit)(?: to think)?\b|\blet me think\b/i;
const HINT_RE = /\b(?:hint|i'?m stuck|i am stuck|no idea how|can you help)\b/i;
const DONE_RE = /\b(?:that'?s (?:my|the) (?:design|solution|answer)|i'?m done|i am done|i think that'?s it|that covers it)\b/i;
const NO_QUESTIONS_RE = /\b(?:no(?: more)? questions|nothing (?:else|from me)|that'?s all|i'?m good|i think i'?m good)\b/i;
const FILLER_RE = /^(?:\W*(?:um+|uh+|hmm+|okay|ok|right|so|yeah|yes|sure|mhm)\W*)+$/i;

const words = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;

function go(s: BrainState, to: Phase, now: number): BrainState {
  return { ...s, phase: to, phaseStartedAt: now, interventionsThisPhase: 0, phaseWords: 0 };
}

function presentQuestion(): string {
  return "Thank them briefly for the introduction (one short sentence, no evaluation), then present the question in your own words, leaving details out so they must clarify.";
}

export function reduce(cfg: SessionConfig, s: BrainState, e: SessionEvent, now: number, engine: EngineId = cfg.engine): { state: BrainState; actions: Action[] } {
  const b = arcBudget(cfg);
  const say = (origin: Extract<Action, { type: "say" }>["origin"], instruction: string, allowSilence = false): Action => ({ type: "say", origin, instruction, allowSilence });

  switch (e.type) {
    case "session.started": {
      const first: Phase = cfg.arc.intro ? "intro" : cfg.arc.aboutYou ? "about_you" : "problem";
      const st = go(s, first, now);
      const instruction = cfg.arc.intro
        ? `Greet the candidate, give your first name and team in one sentence, and explain the format in one sentence. ${cfg.arc.aboutYou ? "Then ask them to introduce themselves briefly." : "Then present the question in your own words, leaving details out so they must clarify."}`
        : cfg.arc.aboutYou ? "Say hello and ask them to introduce themselves briefly." : "Say hello and present the question in your own words, leaving details out so they must clarify.";
      const next = cfg.arc.intro && cfg.arc.aboutYou ? go(st, "about_you", now) : cfg.arc.intro ? go(st, "problem", now) : st;
      return { state: { ...next, lastInterviewerAt: now }, actions: [say("phase", instruction)] };
    }

    case "turn.interviewer":
      return { state: { ...s, lastInterviewerAt: now }, actions: [] };

    case "candidate.speaking":
      return { state: { ...s, candidateSpeaking: e.on, lastCandidateAt: now }, actions: [] };

    case "thinking.pause":
      return { state: { ...s, thinkingUntil: e.on ? now + THINKING_PAUSE_MS : 0, lastCandidateAt: now }, actions: [] };

    case "hint.requested":
      return { state: { ...s, hints: s.hints + 1, lastInterventionAt: now }, actions: [say("hint", "The candidate asked for a hint. Give the smallest useful nudge as a question. Do not reveal the solution.")] };

    case "digest": {
      return { state: { ...s, digests: { ...s.digests, [e.surface]: e.full }, lastCandidateAt: now }, actions: [] };
    }

    case "rule.hit": {
      if (s.openRuleHits.some((h) => h.rule === e.rule)) return { state: s, actions: [] };
      const st = { ...s, openRuleHits: [...s.openRuleHits, { rule: e.rule, detail: e.detail }] };
      const gate = canIntervene(cfg, st, now);
      if (!gate.ok || st.tone === "notetaker") return { state: st, actions: [] };
      return {
        state: { ...st, interventionsThisPhase: st.interventionsThisPhase + 1, lastInterventionAt: now },
        actions: [say("intervention", `A possible problem on their whiteboard: ${e.detail} If this is a real issue given what they have said so far (not just something not drawn yet), challenge it with one short, specific question that names what you see. Otherwise stay silent.`, true)],
      };
    }

    case "turn.candidate": {
      let st: BrainState = { ...s, lastCandidateAt: now, turns: s.turns + 1, candidateSpeaking: false, phaseWords: s.phaseWords + words(e.text) };
      const text = e.text;
      if (THINK_RE.test(text) && words(text) <= 16) {
        st = { ...st, thinkingUntil: now + THINKING_PAUSE_MS };
        return { state: st, actions: [say("reply", "They asked for a moment to think. Agree in three words or fewer, then stay quiet.")] };
      }
      if (FILLER_RE.test(text)) return { state: st, actions: [] };
      if (HINT_RE.test(text) && st.phase === "problem") st = { ...st, hints: st.hints + 1 };

      if (st.phase === "about_you") {
        const spent = now - st.phaseStartedAt;
        if (st.phaseWords >= 60 || words(text) >= 35 || spent > b.aboutYou * 60000) {
          return { state: go(st, "problem", now), actions: [say("phase", presentQuestion())] };
        }
        return { state: st, actions: [say("reply", "Respond to their introduction with at most one brief follow-up question, or if they seem finished, thank them and present the question.")] };
      }
      if (st.phase === "questions_for_me") {
        if (NO_QUESTIONS_RE.test(text)) return { state: go(st, "wrap", now), actions: [say("phase", "Thank them for their time and close the interview in two sentences. No feedback or verdict."), { type: "end" }] };
        return { state: st, actions: [say("reply", "Answer their question as yourself, briefly and honestly, then ask if they have anything else.")] };
      }
      if (st.phase === "problem" && DONE_RE.test(text)) {
        const nextFollow = st.question.followUps[st.turns % Math.max(1, st.question.followUps.length)];
        return { state: st, actions: [say("reply", `They say they are done. Do not end the interview: ask a follow-up that changes a constraint or goes deeper${nextFollow ? `, for example: ${nextFollow}` : ""}.`)] };
      }
      return { state: st, actions: [say("reply", "Reply as the interviewer.", engine !== "text" && words(text) <= 3)] };
    }

    case "tick": {
      const elapsedMin = now / 60000;
      if (elapsedMin >= cfg.minutes && s.phase !== "wrap" && s.phase !== "done")
        return { state: go(s, "wrap", now), actions: [say("phase", "Time is up. Thank them and close in one or two sentences. No feedback."), { type: "end" }] };

      // move from the intro to the problem if they overrun badly
      if (s.phase === "about_you" && now - s.phaseStartedAt > (b.aboutYou + 1.5) * 60000 && canIntervene(cfg, { ...s, lastInterventionAt: -1 }, now).ok)
        return { state: go(s, "problem", now), actions: [say("phase", `Politely cut the introduction short in a few words, then ${presentQuestion()}`)] };

      // reverse questions at the end
      const left = cfg.minutes - elapsedMin;
      if (s.phase === "problem" && cfg.arc.questionsForMe && left <= b.questions && !s.candidateSpeaking)
        return { state: go(s, "questions_for_me", now), actions: [say("phase", 'We are near the end. Wrap up the problem in one sentence (do not evaluate it), then ask: "Is there anything you\'d like to ask me?"')] };

      if (s.phase !== "problem" || s.candidateSpeaking) return { state: s, actions: [] };

      // time calls
      const call = PRESSURE[cfg.pressure].timeCalls.find((m) => left <= m && left > m - 1 && !s.timeCalls.includes(m));
      if (call && now - s.lastInterviewerAt > 8000)
        return { state: { ...s, timeCalls: [...s.timeCalls, call] }, actions: [say("timecall", `Tell them, in a few words, that about ${call} minutes remain${cfg.pressure === "high" ? ", and if they are still early in the problem, ask them to move on to the next part" : ""}.`)] };

      const gate = canIntervene(cfg, s, now);
      if (!gate.ok) return { state: s, actions: [] };

      // scheduled curveball
      const cb = s.curveballs.find((c) => !c.fired && elapsedMin >= c.atMin);
      if (cb) {
        const fired = s.curveballs.map((c) => (c === cb ? { ...c, fired: true } : c));
        const st = { ...s, curveballs: fired, interventionsThisPhase: s.interventionsThisPhase + 1, lastInterventionAt: now };
        const instruction = curveballInstruction(cb.id, s);
        return instruction && s.turns >= 3 ? { state: st, actions: [say("curveball", `${instruction} Wait for a natural pause in their thinking; say it now as one short turn.`)] } : { state: { ...s, curveballs: fired }, actions: [] };
      }

      // silence
      const quietFor = now - Math.max(s.lastCandidateAt, s.lastInterviewerAt);
      if (quietFor > silenceMs(cfg, engine) && s.tone !== "notetaker")
        return {
          state: { ...s, interventionsThisPhase: s.interventionsThisPhase + 1, lastInterventionAt: now },
          actions: [say("intervention", "The candidate has been silent for a while. If they seem to be working on something visible in their doc or diagram, stay silent. Otherwise ask them, in one short sentence, to talk you through what they are thinking.", true)],
        };
      return { state: s, actions: [] };
    }

    case "session.ended":
      return { state: go(s, "done", now), actions: [] };

    default:
      return { state: s, actions: [] };
  }
}
