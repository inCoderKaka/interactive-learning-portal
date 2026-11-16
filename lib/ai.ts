"use client";
import type { Design, Feedback, Problem, Settings, Stage } from "./types";

export type Provider = Settings["provider"];
export interface Msg { role: "user" | "assistant"; content: string }

const KEYS = "ascent:keys:v1";
export interface Keys { gemini: string; claude: string; local: string }
export function getKeys(): Keys {
  try {
    return { gemini: "", claude: "", local: "", ...JSON.parse(localStorage.getItem(KEYS) || "{}") };
  } catch {
    return { gemini: "", claude: "", local: "" };
  }
}
export const setKeys = (k: Keys) => localStorage.setItem(KEYS, JSON.stringify(k));

export function aiReady(s: Settings): boolean {
  const k = getKeys();
  if (s.provider === "gemini") return !!k.gemini;
  if (s.provider === "claude") return !!k.claude;
  return !!s.localUrl && !!s.localModel;
}

async function fail(res: Response): Promise<never> {
  let detail = "";
  try {
    const j = await res.json();
    detail = j?.error?.message || j?.message || JSON.stringify(j).slice(0, 300);
  } catch {
    detail = await res.text().catch(() => "");
  }
  throw new Error(`${res.status} ${res.statusText}${detail ? `: ${detail}` : ""}`);
}

/** Single entry point. Keys never leave the browser except to the chosen provider. */
export async function chat(s: Settings, system: string, messages: Msg[], opts: { maxTokens?: number; signal?: AbortSignal } = {}): Promise<string> {
  const k = getKeys();
  const maxTokens = opts.maxTokens ?? 2500;
  if (s.provider === "claude") {
    if (!k.claude) throw new Error("Add your Claude API key in Settings.");
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", signal: opts.signal,
      headers: { "content-type": "application/json", "x-api-key": k.claude, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
      body: JSON.stringify({ model: s.claudeModel, max_tokens: maxTokens, system, messages }),
    });
    if (!res.ok) await fail(res);
    const j = await res.json();
    return (j.content as { type: string; text?: string }[]).filter((b) => b.type === "text").map((b) => b.text).join("");
  }
  if (s.provider === "gemini") {
    if (!k.gemini) throw new Error("Add your Gemini API key in Settings.");
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(s.geminiModel)}:generateContent`, {
      method: "POST", signal: opts.signal,
      headers: { "content-type": "application/json", "x-goog-api-key": k.gemini },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
        generationConfig: { maxOutputTokens: maxTokens * 2, temperature: 0.4 },
      }),
    });
    if (!res.ok) await fail(res);
    const j = await res.json();
    const text = (j.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("");
    if (!text) throw new Error(`Gemini returned no text (${j.candidates?.[0]?.finishReason ?? j.promptFeedback?.blockReason ?? "empty"}).`);
    return text;
  }
  if (!s.localUrl || !s.localModel) throw new Error("Set the local-server URL and model in Settings.");
  const res = await fetch(`${s.localUrl.replace(/\/+$/, "")}/v1/chat/completions`, {
    method: "POST", signal: opts.signal,
    headers: { "content-type": "application/json", ...(k.local ? { authorization: `Bearer ${k.local}` } : {}) },
    body: JSON.stringify({ model: s.localModel, max_tokens: maxTokens, temperature: 0.4, messages: [{ role: "system", content: system }, ...messages] }),
  });
  if (!res.ok) await fail(res);
  const j = await res.json();
  return j.choices?.[0]?.message?.content ?? "";
}

export async function listModels(s: Settings, provider: Provider): Promise<string[]> {
  const k = getKeys();
  if (provider === "claude") {
    const res = await fetch("https://api.anthropic.com/v1/models?limit=100", { headers: { "x-api-key": k.claude, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" } });
    if (!res.ok) await fail(res);
    return ((await res.json()).data as { id: string }[]).map((m) => m.id);
  }
  if (provider === "gemini") {
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", { headers: { "x-goog-api-key": k.gemini } });
    if (!res.ok) await fail(res);
    return ((await res.json()).models as { name: string; supportedGenerationMethods?: string[] }[])
      .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
      .map((m) => m.name.replace(/^models\//, ""));
  }
  const res = await fetch(`${s.localUrl.replace(/\/+$/, "")}/v1/models`, { headers: k.local ? { authorization: `Bearer ${k.local}` } : {} });
  if (!res.ok) await fail(res);
  return ((await res.json()).data as { id: string }[]).map((m) => m.id);
}

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
  return normalise(parseJson<Feedback>(await chat(s, REVIEWER, [{ role: "user", content: prompt }])));
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
  return normalise(parseJson<Feedback>(await chat(s, REVIEWER, [{ role: "user", content: prompt }])));
}

export async function gradeRecall(s: Settings, p: Problem, answer: string): Promise<Feedback> {
  const prompt = `The candidate is doing a 3-minute recall drill: no code, just the approach and complexity from memory.
PROBLEM: ${p.title}. ${p.statement}
REFERENCE APPROACHES: ${p.approaches.map((a) => `${a.name} (${a.time}/${a.space}): ${a.idea}`).join(" | ")}
CANDIDATE'S RECALL: ${answer}
Judge whether the described approach would work and whether the complexity is right. Keep arrays short.
${FEEDBACK_SHAPE}`;
  return normalise(parseJson<Feedback>(await chat(s, REVIEWER, [{ role: "user", content: prompt }], { maxTokens: 1200 })));
}

export async function generateTwists(s: Settings, title: string, statement: string, existing: string[]): Promise<{ clarify: string[]; twists: string[]; followUps: string[] }> {
  const prompt = `Problem: ${title}. ${statement}
Already covered variations: ${existing.join("; ") || "none"}.
A Google interviewer rarely asks the LeetCode version verbatim. Produce NEW material, concise and specific:
Return ONLY JSON: {"clarify":["3 clarifying questions the candidate should ask"],"twists":["4 ways the interviewer could reframe or change constraints (real-world framing, streaming, memory limits, distributed, API design)"],"followUps":["3 follow-up questions, increasing in difficulty"]}`;
  return parseJson(await chat(s, "You design interview questions for Google software engineering loops. Be concrete; no generic advice.", [{ role: "user", content: prompt }], { maxTokens: 1200 }));
}

export const hint = (s: Settings, p: Problem, code: string, used: string[]) =>
  chat(s, "You are a Google interviewer giving the smallest useful nudge. Never reveal the full solution or write code. One or two sentences, phrased as a question when possible.",
    [{ role: "user", content: `Problem: ${p.title}. ${p.statement}\nHints already given: ${used.join(" | ") || "none"}\nCandidate's current work:\n${code || "(nothing yet)"}\nGive the next nudge.` }], { maxTokens: 300 });

export const MOCK_SYSTEM = (kind: string, question: string, minutes: number) => `You are a Google interviewer running a ${minutes}-minute ${kind} interview. Stay in character.
QUESTION TO ASK (present it in your own words, deliberately leaving details underspecified so the candidate must clarify): ${question}
Rules:
- One short message at a time (max 120 words). Do not lecture and do not solve the problem.
- Answer clarifying questions consistently. If the candidate skips clarification, let them, and note it for the final review.
- Push for complexity analysis, edge cases and trade-offs. When they finish, change a constraint or ask a follow-up, as real interviewers do.
- Give a hint only if they are stuck for a while or ask, and make it minimal.
- Be neutral in tone: neither encouraging nor discouraging, so the candidate cannot read your reactions.
- The candidate may paste code or design notes; treat it as what they wrote on the shared doc.`;

export async function mockScorecard(s: Settings, kind: string, question: string, transcript: Msg[]): Promise<Feedback> {
  const prompt = `Interview type: ${kind}. Question: ${question}
TRANSCRIPT:
${transcript.map((m) => `${m.role === "user" ? "CANDIDATE" : "INTERVIEWER"}: ${m.content}`).join("\n\n")}

Write the hiring-committee feedback for this interview. "score" maps to: <40 no hire, 40-59 leaning no hire, 60-74 leaning hire, 75-89 hire, 90+ strong hire. Put the most important evidence in "summary".
${FEEDBACK_SHAPE}`;
  return normalise(parseJson<Feedback>(await chat(s, REVIEWER, [{ role: "user", content: prompt }])));
}
