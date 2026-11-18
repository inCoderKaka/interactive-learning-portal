"use client";
import type { Design, Feedback, Problem, Settings, Stage } from "./types";
import { complete, listModels as listProviderModels, type Msg } from "./interview/providers/llm";
import { getKeys, setKeys, type Keys } from "./interview/providers/keys";
import { defaultModel, providerReady, runTask } from "./interview/tasks";

export type Provider = Settings["provider"];
export type { Msg };
export { getKeys, setKeys, type Keys };

export function aiReady(s: Settings): boolean {
  return providerReady(s, s.provider);
}

/** Single entry point for a one-off call on the default provider and model. */
export async function chat(s: Settings, system: string, messages: Msg[], opts: { maxTokens?: number; signal?: AbortSignal } = {}): Promise<string> {
  return complete({ provider: s.provider, model: defaultModel(s, s.provider), system, messages, params: { temperature: 0.4, maxOutputTokens: opts.maxTokens ?? 2500 } }, s, opts.signal);
}

export const listModels = (s: Settings, provider: Provider) => listProviderModels(s, provider);

function parseJson<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf("{"), end = body.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("The model did not return JSON. Try again or pick a stronger model.");
  return JSON.parse(body.slice(start, end + 1)) as T;
}

const FEEDBACK_SHAPE = `Return ONLY a JSON object, no prose, with this shape:
{"verdict":"correct"|"partial"|"incorrect","score":0-100,"summary":"2-3 sentences","bugs":["concrete bug with the input that triggers it"],"edgeCases":["edge case not handled"],"complexity":{"time":"O(..)","space":"O(..)","optimal":true|false,"note":"how it compares with the best known"},"strengths":["..."],"improvements":["specific, actionable"],"rubric":{"algorithms":1-4,"coding":1-4,"communication":1-4,"problemSolving":1-4},"followUp":"one follow-up question a Google interviewer would ask next"}`;

const REVIEWER = `You are a rigorous but fair Google software engineering interviewer reviewing a candidate's work.
Be evidence-based: verify the logic by mentally executing it on small and adversarial inputs before judging. Never assume the code is right because it looks familiar, and never assume it is wrong because it differs from the textbook solution: any correct approach is acceptable.
Judge only what is written. Do not reward confidence, length or style over correctness. If you are unsure whether something is a bug, say so explicitly rather than guessing.
Rubric scale: 1 = poor, 2 = borderline, 3 = solid hire, 4 = exceptional.`;

const normalise = (f: Feedback): Feedback => ({
  verdict: f.verdict === "correct" || f.verdict === "incorrect" ? f.verdict : "partial",
  score: Math.max(0, Math.min(100, Math.round(Number(f.score) || 0))),
  summary: f.summary ?? "",
  bugs: f.bugs ?? [],
  edgeCases: f.edgeCases ?? [],
  complexity: f.complexity,
  strengths: f.strengths ?? [],
  improvements: f.improvements ?? [],
  rubric: f.rubric,
  followUp: f.followUp,
});

export async function reviewCode(s: Settings, p: Problem, code: string, lang: string, explanation: string): Promise<Feedback> {
  const prompt = `PROBLEM: ${p.title}${p.lc ? ` (LeetCode ${p.lc})` : ""}
${p.statement}

KNOWN APPROACHES (for your reference only; other correct approaches are fine):
${p.approaches.map((a) => `- ${a.name}: ${a.idea} [${a.time} time, ${a.space} space]`).join("\n") || "(none listed)"}

CANDIDATE'S EXPLANATION:
${explanation || "(none given: score communication accordingly)"}

CANDIDATE'S CODE (${lang}; written without a compiler, so ignore trivial syntax slips but list them):
\`\`\`${lang}
${code}
\`\`\`

Tasks: 1) Trace the code on at least two inputs including an edge case. 2) Decide correctness. 3) State the actual time and space complexity of THIS code. 4) List unhandled edge cases. 5) Score.
${FEEDBACK_SHAPE}`;
  return normalise(parseJson<Feedback>(await runTask(s, "code.review", REVIEWER, [{ role: "user", content: prompt }])));
}

export async function gradeStage(s: Settings, d: Design, st: Stage, answer: string): Promise<Feedback> {
  const kind = d.area === "hld" ? "system design" : d.area === "lld" ? "object-oriented design" : "behavioural (Googleyness & leadership)";
  const prompt = `INTERVIEW TYPE: ${kind}
QUESTION: ${d.prompt}
CURRENT STAGE: ${st.title}: ${st.ask}

REFERENCE NOTES (one reasonable answer, not the only one; do not penalise valid alternatives):
${st.model}

CANDIDATE'S ANSWER:
${answer}

Evaluate the answer for this stage only. In "bugs" list incorrect or risky statements; in "edgeCases" list important things that are missing; leave "complexity" out unless relevant. Use rubric keys ${d.area === "craft" ? '"structure","ownership","impact","reflection"' : '"scoping","design","depth","tradeoffs"'}.
${FEEDBACK_SHAPE}`;
  return normalise(parseJson<Feedback>(await runTask(s, "stage.grade", REVIEWER, [{ role: "user", content: prompt }])));
}

export async function gradeRecall(s: Settings, p: Problem, answer: string): Promise<Feedback> {
  const prompt = `The candidate is doing a 3-minute recall drill: no code, just the approach and complexity from memory.
PROBLEM: ${p.title}. ${p.statement}
REFERENCE APPROACHES: ${p.approaches.map((a) => `${a.name} (${a.time}/${a.space}): ${a.idea}`).join(" | ")}
CANDIDATE'S RECALL: ${answer}
Judge whether the described approach would work and whether the complexity is right. Keep arrays short.
${FEEDBACK_SHAPE}`;
  return normalise(parseJson<Feedback>(await runTask(s, "recall.grade", REVIEWER, [{ role: "user", content: prompt }])));
}

export async function generateTwists(s: Settings, title: string, statement: string, existing: string[]): Promise<{ clarify: string[]; twists: string[]; followUps: string[] }> {
  const prompt = `Problem: ${title}. ${statement}
Already covered variations: ${existing.join("; ") || "none"}.
A Google interviewer rarely asks the LeetCode version verbatim. Produce NEW material, concise and specific:
Return ONLY JSON: {"clarify":["3 clarifying questions the candidate should ask"],"twists":["4 ways the interviewer could reframe or change constraints (real-world framing, streaming, memory limits, distributed, API design)"],"followUps":["3 follow-up questions, increasing in difficulty"]}`;
  return parseJson(await runTask(s, "twists", "You design interview questions for Google software engineering loops. Be concrete; no generic advice.", [{ role: "user", content: prompt }]));
}

export const hint = (s: Settings, p: Problem, code: string, used: string[]) =>
  runTask(s, "hint", "You are a Google interviewer giving the smallest useful nudge. Never reveal the full solution or write code. One or two sentences, phrased as a question when possible.",
    [{ role: "user", content: `Problem: ${p.title}. ${p.statement}\nHints already given: ${used.join(" | ") || "none"}\nCandidate's current work:\n${code || "(nothing yet)"}\nGive the next nudge.` }]);
