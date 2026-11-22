"use client";
// Model calls for imports: the shared provider layer for plain calls, plus web-search calls for the
// enrichment step (Claude's web search tool, Gemini's Google Search grounding, OpenAI's Responses
// API web search). The local provider has no web tools. Every call is recorded in full for the run
// (local-server req_001 R-14): task, model, parameters, prompt version, latency, tokens, text, error.

import type { Settings } from "@/lib/types";
import { complete, isClaudeModern, type GenParams, type ProviderId } from "@/lib/interview/providers/llm";
import { getKeys } from "@/lib/interview/providers/keys";
import { resolveModel, resolved, providerReady, type TaskId } from "@/lib/interview/tasks";
import { meterLlm } from "@/lib/interview/meter";
import { llmCostUsd } from "@/lib/interview/core/usage";
import type { WebSource } from "../types";
import { STEP_TASK, type AiStep, type ImportConfig, type LlmCall, type LlmResult } from "./pipeline";
import { fnv, tokensOf } from "./text";

export interface CallRecord {
  id: string;
  step: AiStep;
  task: TaskId;
  label: string;
  provider: string;
  model: string;
  params: GenParams;
  promptVersion: string; // hash of the system prompt, so runs with different prompts can be compared
  system: string;
  user: string;
  output: string;
  sources?: WebSource[];
  searches?: number;
  inTok: number;
  outTok: number;
  usd: number;
  ms: number;
  at: number;
  error?: string;
  feedback?: string;
}

/** Search pricing per search, approximate list prices. */
export const WEB_USD: Record<string, number> = { claude: 0.01, openai: 0.01, gemini: 0.035, local: 0 };

export function stepTarget(s: Settings, cfg: ImportConfig, step: AiStep) {
  const r = resolved(s, STEP_TASK[step]);
  const t = cfg.dev.tune[step];
  const provider: ProviderId = t?.provider && providerReady(s, t.provider) ? t.provider : r.provider;
  const model = t?.model?.trim() || (t?.provider && t.provider !== r.provider ? resolveModel(s, provider, "") : r.model);
  const params: GenParams = {
    ...r.params,
    ...(t?.temperature !== undefined && { temperature: t.temperature }),
    ...(t?.maxOutputTokens !== undefined && { maxOutputTokens: t.maxOutputTokens }),
    ...(t?.reasoning && { reasoning: t.reasoning }),
  };
  // a local host refuses parameters it cannot apply (local-server req_001 R-4): send only what it accepts
  if (provider === "local") { delete params.topK; delete params.presencePenalty; delete params.frequencyPenalty; delete params.reasoning; delete params.json; }
  const tier: "small" | "default" | "strong" = /lite|nano|haiku|flash|mini|small/i.test(model) ? "small" : /pro|opus|fable|gpt-5$/i.test(model) ? "strong" : "default";
  const local = provider === "local";
  return {
    provider, model, params, tier, timeoutMs: r.timeoutMs, retries: r.retries,
    concurrency: t?.concurrency ?? (local ? 1 : step === "enrich" ? 2 : 3),
    batchChars: t?.batchChars ?? (local ? 3500 : step === "verify" ? 9000 : 7000),
    webUsd: WEB_USD[provider] ?? 0,
  };
}

export const webAvailable = (p: string) => p !== "local";

async function failMsg(res: Response) {
  let d = "";
  try { const j = await res.json(); d = j?.error?.message ?? JSON.stringify(j).slice(0, 300); } catch { d = await res.text().catch(() => ""); }
  return new Error(`${res.status} ${res.statusText}${d ? `: ${d}` : ""}`);
}

const withTimeout = (signal: AbortSignal, ms: number) => AbortSignal.any([signal, AbortSignal.timeout(ms)]);

async function webCall(provider: ProviderId, model: string, system: string, user: string, maxTokens: number, signal: AbortSignal): Promise<{ text: string; sources: WebSource[]; searches: number }> {
  const k = getKeys();
  if (provider === "claude") {
    const messages: { role: "user" | "assistant"; content: unknown }[] = [{ role: "user", content: user }];
    const sources = new Map<string, WebSource>();
    let text = "", searches = 0;
    for (let turn = 0; turn < 4; turn++) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", signal,
        headers: { "content-type": "application/json", "x-api-key": k.claude, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({
          model, max_tokens: maxTokens + 4096, system, messages,
          tools: [{ type: isClaudeModern(model) ? "web_search_20260209" : "web_search_20250305", name: "web_search", max_uses: 4 }],
          ...(isClaudeModern(model) && { output_config: { effort: "low" } }),
        }),
      });
      if (!res.ok) throw await failMsg(res);
      const j = await res.json();
      for (const b of j.content ?? []) {
        if (b.type === "text") {
          text += b.text;
          for (const c of b.citations ?? []) if (c.url) sources.set(c.url, { url: c.url, title: c.title || c.url });
        } else if (b.type === "web_search_tool_result" && Array.isArray(b.content)) {
          for (const r of b.content) if (r.url && !sources.has(r.url)) sources.set(r.url, { url: r.url, title: r.title || r.url });
        } else if (b.type === "server_tool_use") searches++;
      }
      if (j.stop_reason !== "pause_turn") break;
      messages.push({ role: "assistant", content: j.content });
    }
    return { text, sources: [...sources.values()], searches };
  }
  if (provider === "gemini") {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST", signal,
      headers: { "content-type": "application/json", "x-goog-api-key": k.gemini },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: "user", parts: [{ text: user }] }], tools: [{ google_search: {} }], generationConfig: { maxOutputTokens: maxTokens * 2, temperature: 0.3 } }),
    });
    if (!res.ok) throw await failMsg(res);
    const j = await res.json();
    const c = j.candidates?.[0];
    const text = (c?.content?.parts ?? []).filter((p: { thought?: boolean }) => !p.thought).map((p: { text?: string }) => p.text ?? "").join("");
    const gm = c?.groundingMetadata ?? {};
    const sources: WebSource[] = (gm.groundingChunks ?? []).map((g: { web?: { uri?: string; title?: string } }) => g.web).filter((w: { uri?: string } | undefined) => w?.uri).map((w: { uri: string; title?: string }) => ({ url: w.uri, title: w.title || w.uri }));
    return { text, sources, searches: (gm.webSearchQueries ?? []).length };
  }
  if (provider === "openai") {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST", signal,
      headers: { "content-type": "application/json", authorization: `Bearer ${k.openai}` },
      body: JSON.stringify({ model, instructions: system, input: user, tools: [{ type: "web_search" }], max_output_tokens: maxTokens * 3 }),
    });
    if (!res.ok) throw await failMsg(res);
    const j = await res.json();
    let text = "", searches = 0;
    const sources = new Map<string, WebSource>();
    for (const item of j.output ?? []) {
      if (item.type === "web_search_call") searches++;
      if (item.type !== "message") continue;
      for (const c of item.content ?? []) {
        if (c.type !== "output_text") continue;
        text += c.text;
        for (const a of c.annotations ?? []) if (a.type === "url_citation" && a.url) sources.set(a.url, { url: a.url, title: a.title || a.url });
      }
    }
    return { text, sources: [...sources.values()], searches };
  }
  throw new Error("Web enrichment needs Claude, Gemini or OpenAI; a local host has no web search.");
}

/** Build the `llm` function an import run uses, recording every call. */
export function makeLlm(s: Settings, getConfig: () => ImportConfig, record: (r: CallRecord) => void) {
  return async (c: LlmCall, signal: AbortSignal): Promise<LlmResult> => {
    const t = stepTarget(s, getConfig(), c.step);
    const started = Date.now();
    const base: Omit<CallRecord, "output" | "inTok" | "outTok" | "usd" | "ms"> = {
      id: `${started.toString(36)}${Math.random().toString(36).slice(2, 6)}`, step: c.step, task: STEP_TASK[c.step], label: c.label,
      provider: t.provider, model: t.model, params: t.params, promptVersion: fnv(c.system), system: c.system, user: c.user, at: started,
    };
    const inChars = c.system.length + c.user.length;
    let lastErr: unknown;
    for (let i = 0; i <= t.retries; i++) {
      try {
        let text: string, sources: WebSource[] | undefined, searches: number | undefined;
        if (c.web) ({ text, sources, searches } = await webCall(t.provider, t.model, c.system, c.user, t.params.maxOutputTokens ?? 3000, withTimeout(signal, t.timeoutMs)));
        else text = await complete({ provider: t.provider, model: t.model, system: c.system, messages: [{ role: "user", content: c.user }], params: { ...t.params, json: c.json && t.provider !== "local" ? t.params.json : false, promptCaching: true }, timeoutMs: t.timeoutMs }, s, signal);
        const inTok = tokensOf(inChars) + (searches ?? 0) * 1500, outTok = tokensOf(text.length);
        const usd = llmCostUsd(t.provider, t.model, inTok, outTok) + (searches ?? 0) * t.webUsd;
        meterLlm(t.provider, t.model, inChars, text.length, "text");
        const ms = Date.now() - started;
        record({ ...base, output: text, sources, searches, inTok, outTok, usd, ms });
        return { text, sources, searches, inTok, outTok, usd, ms };
      } catch (e) {
        lastErr = e;
        if (signal.aborted) throw e;
        if (/\b(400|401|403|404)\b/.test(String(e))) break; // request-shape and key errors do not get better on retry
        if (i < t.retries) await new Promise((ok) => setTimeout(ok, 800 * 2 ** i));
      }
    }
    record({ ...base, output: "", inTok: tokensOf(inChars), outTok: 0, usd: 0, ms: Date.now() - started, error: lastErr instanceof Error ? lastErr.message : String(lastErr) });
    throw lastErr;
  };
}
