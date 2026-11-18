import type { LoggedEvent, Phase } from "./types.ts";

export interface DeliveryStats {
  minutes: number;
  candidateWords: number;
  interviewerWords: number;
  talkShare: number; // candidate share of words, 0..1
  longestSilenceS: number;
  fillersPerMin: number;
  firstClarifyS: number | null; // seconds from the problem being presented to the first question the candidate asked
  phaseMinutes: Partial<Record<Phase, number>>;
  interruptionsByCandidate: number;
  interruptionsByInterviewer: number;
  hints: number;
  curveballs: number;
  interventions: number;
}

const FILLERS = /\b(?:um+|uh+|erm|like,|you know|kind of|sort of|basically|actually)\b/gi;
const words = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;

export function deliveryStats(log: LoggedEvent[]): DeliveryStats {
  let cw = 0, iw = 0, fillers = 0, intC = 0, intI = 0, hints = 0, cbs = 0, ints = 0;
  let lastTurn = 0, longest = 0, problemAt: number | null = null, firstClarify: number | null = null;
  const phaseMinutes: Partial<Record<Phase, number>> = {};
  let phase: Phase = "lobby", phaseAt = 0, end = 0;
  for (const { t, e } of log) {
    end = t;
    if (e.type === "turn.candidate" || e.type === "turn.interviewer") {
      longest = Math.max(longest, t - lastTurn);
      lastTurn = t;
    }
    if (e.type === "turn.candidate") {
      cw += words(e.text);
      fillers += (e.text.match(FILLERS) ?? []).length;
      if (e.interruptedAgent) intC++;
      if (problemAt !== null && firstClarify === null && e.text.includes("?")) firstClarify = (t - problemAt) / 1000;
    } else if (e.type === "turn.interviewer") {
      iw += words(e.text);
      if (e.origin === "intervention") ints++;
      if (e.interrupted) intI++;
    } else if (e.type === "phase.changed") {
      phaseMinutes[phase] = (phaseMinutes[phase] ?? 0) + (t - phaseAt) / 60000;
      phase = e.to; phaseAt = t;
      if (e.to === "problem") problemAt = t;
    } else if (e.type === "hint.requested") hints++;
    else if (e.type === "curveball.fired") cbs++;
  }
  phaseMinutes[phase] = (phaseMinutes[phase] ?? 0) + (end - phaseAt) / 60000;
  const minutes = end / 60000;
  return {
    minutes,
    candidateWords: cw,
    interviewerWords: iw,
    talkShare: cw + iw ? cw / (cw + iw) : 0,
    longestSilenceS: Math.round(longest / 1000),
    fillersPerMin: minutes ? Math.round((fillers / minutes) * 10) / 10 : 0,
    firstClarifyS: firstClarify === null ? null : Math.round(firstClarify),
    phaseMinutes,
    interruptionsByCandidate: intC,
    interruptionsByInterviewer: intI,
    hints,
    curveballs: cbs,
    interventions: ints,
  };
}
