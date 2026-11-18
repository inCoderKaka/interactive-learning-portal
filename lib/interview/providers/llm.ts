"use client";
// LLM provider adapters. Each one maps the common request shape onto a provider's API and declares
// what it supports, so callers never send a parameter a model rejects (docs: AI configuration §3).

import type { Settings } from "@/lib/types";
import { getKeys } from "./keys";

export type ProviderId = Settings["provider"];
export interface Msg { role: "user" | "assistant"; content: string }

export interface GenParams {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
  stop?: string[];
  seed?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  reasoning?: "off" | "low" | "medium" | "high";
  json?: boolean;
  promptCaching?: boolean;
}

export interface LlmRequest {
  provider: ProviderId;
  model: string;
  system: string;
  messages: Msg[];
  params: GenParams;
  timeoutMs?: number;
}

export interface Capabilities {
  temperature: boolean;
  topP: boolean;
  topK: boolean;
  seed: boolean;
  stop: boolean;
  penalties: boolean;
  reasoning: boolean;
  json: boolean;
  promptCaching: boolean;
}

const isOpenAiReasoning = (m: string) => /^(?:gpt-5|o\d)/i.test(m);
const isClaudeThinking = (m: string) => /claude-(?:opus|sonnet|haiku)-(?:[4-9])|claude-3-7/i.test(m);

/** What a provider and model accept. Unsupported settings are shown greyed out in developer mode. */
export function capabilities(provider: ProviderId, model: string): Capabilities {
  switch (provider) {
    case "claude":
      return { temperature: true, topP: true, topK: true, seed: false, stop: true, penalties: false, reasoning: isClaudeThinking(model), json: false, promptCaching: true };
    case "gemini":
      return { temperature: true, topP: true, topK: true, seed: true, stop: true, penalties: false, reasoning: /2\.5|[3-9]\.\d/.test(model), json: true, promptCaching: false };
    case "openai": {
      const r = isOpenAiReasoning(model);
      return { temperature: !r, topP: !r, topK: false, seed: true, stop: !r, penalties: !r, reasoning: r, json: true, promptCaching: false };
    }
    default:
      return { temperature: true, topP: true, topK: true, seed: true, stop: true, penalties: true, reasoning: false, json: false, promptCaching: false };
  }
}

export const CAPABILITY_WHY: Record<keyof Capabilities, string> = {
  temperature: "Reasoning models fix their own sampling temperature.",
  topP: "Reasoning models fix their own sampling.",
  topK: "OpenAI's API has no top-k setting.",
  seed: "This provider does not accept a seed.",
  stop: "Reasoning models do not accept stop sequences.",
  penalties: "Only OpenAI-style chat APIs have presence and frequency penalties.",
  reasoning: "This model has no adjustable reasoning or thinking budget.",
  json: "This provider has no JSON response mode; the prompt asks for JSON instead.",
  promptCaching: "Only Claude takes explicit cache markers; other providers cache automatically or not at all.",
};

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

const BUDGET = { low: 1024, medium: 4096, high: 12000 } as const;

interface Prepared { url: string; headers: Record<string, string>; body: unknown; streamUrl?: string }

function prepare(req: LlmRequest, settings: Settings, stream: boolean): Prepared {
  const k = getKeys();
  const p = req.params, cap = capabilities(req.provider, req.model);
  const max = p.maxOutputTokens ?? 1024;

  if (req.provider === "claude") {
    if (!k.claude) throw new Error("Add your Claude API key in Settings.");
    const thinking = cap.reasoning && p.reasoning && p.reasoning !== "off" ? { type: "enabled", budget_tokens: BUDGET[p.reasoning] } : undefined;
    return {
      url: "https://api.anthropic.com/v1/messages",
      headers: { "content-type": "application/json", "x-api-key": k.claude, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
      body: {
        model: req.model,
        max_tokens: thinking ? max + thinking.budget_tokens : max,
        system: p.promptCaching ? [{ type: "text", text: req.system, cache_control: { type: "ephemeral" } }] : req.system,
        messages: req.messages,
        ...(thinking ? { thinking } : { ...(p.temperature !== undefined && { temperature: p.temperature }), ...(p.topP !== undefined && p.temperature === undefined && { top_p: p.topP }), ...(p.topK !== undefined && { top_k: p.topK }) }),
        ...(p.stop?.length && { stop_sequences: p.stop }),
        ...(stream && { stream: true }),
      },
    };
  }

  if (req.provider === "gemini") {
    if (!k.gemini) throw new Error("Add your Gemini API key in Settings.");
    const base = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(req.model)}`;
    return {
      url: stream ? `${base}:streamGenerateContent?alt=sse` : `${base}:generateContent`,
      headers: { "content-type": "application/json", "x-goog-api-key": k.gemini },
      body: {
        systemInstruction: { parts: [{ text: req.system }] },
        contents: req.messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
        generationConfig: {
          // Gemini counts thinking tokens against the output budget, so leave room
          maxOutputTokens: cap.reasoning ? max * 2 + (p.reasoning && p.reasoning !== "off" ? BUDGET[p.reasoning] : 0) : max,
          ...(p.temperature !== undefined && { temperature: p.temperature }),
          ...(p.topP !== undefined && { topP: p.topP }),
          ...(p.topK !== undefined && { topK: p.topK }),
          ...(p.seed !== undefined && { seed: p.seed }),
          ...(p.stop?.length && { stopSequences: p.stop }),
          ...(p.json && { responseMimeType: "application/json" }),
          ...(cap.reasoning && p.reasoning && { thinkingConfig: { thinkingBudget: p.reasoning === "off" ? 0 : BUDGET[p.reasoning] } }),
        },
      },
    };
  }

  const openai = req.provider === "openai";
  if (openai && !k.openai) throw new Error("Add your OpenAI API key in Settings.");
  if (!openai && (!settings.localUrl || !req.model)) throw new Error("Set the local-server URL and model in Settings.");
  const url = openai ? "https://api.openai.com/v1/chat/completions" : `${settings.localUrl.replace(/\/+$/, "")}/v1/chat/completions`;
  const key = openai ? k.openai : k.local;
  return {
    url,
    headers: { "content-type": "application/json", ...(key ? { authorization: `Bearer ${key}` } : {}) },
    body: {
      model: req.model,
      messages: [{ role: "system", content: req.system }, ...req.messages],
      ...(openai ? { max_completion_tokens: cap.reasoning ? max * 4 : max } : { max_tokens: max }),
      ...(cap.temperature && p.temperature !== undefined && { temperature: p.temperature }),
      ...(cap.topP && p.topP !== undefined && { top_p: p.topP }),
      ...(cap.topK && p.topK !== undefined && { top_k: p.topK }),
      ...(cap.seed && p.seed !== undefined && { seed: p.seed }),
      ...(cap.stop && p.stop?.length && { stop: p.stop }),
      ...(cap.penalties && p.presencePenalty !== undefined && { presence_penalty: p.presencePenalty }),
      ...(cap.penalties && p.frequencyPenalty !== undefined && { frequency_penalty: p.frequencyPenalty }),
      ...(cap.reasoning && p.reasoning && p.reasoning !== "off" && { reasoning_effort: p.reasoning }),
      ...(cap.reasoning && p.reasoning === "off" && { reasoning_effort: "minimal" }),
      ...(cap.json && p.json && { response_format: { type: "json_object" } }),
      ...(stream && { stream: true }),
    },
  };
}

function withTimeout(signal: AbortSignal | undefined, ms: number | undefined) {
  if (!ms) return signal;
  const t = AbortSignal.timeout(ms);
  return signal ? AbortSignal.any([signal, t]) : t;
}

function extract(provider: ProviderId, j: Record<string, unknown>): string {
  if (provider === "claude") return ((j.content as { type: string; text?: string }[]) ?? []).filter((b) => b.type === "text").map((b) => b.text).join("");
  if (provider === "gemini") {
    const c = (j.candidates as { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[] | undefined)?.[0];
    return (c?.content?.parts ?? []).filter((p) => !p.thought).map((p) => p.text ?? "").join("");
  }
  const ch = (j.choices as { message?: { content?: string }; delta?: { content?: string } }[] | undefined)?.[0];
  return ch?.message?.content ?? ch?.delta?.content ?? "";
}

export async function complete(req: LlmRequest, settings: Settings, signal?: AbortSignal): Promise<string> {
  const pr = prepare(req, settings, false);
  const res = await fetch(pr.url, { method: "POST", headers: pr.headers, body: JSON.stringify(pr.body), signal: withTimeout(signal, req.timeoutMs) });
  if (!res.ok) await fail(res);
  const j = await res.json();
  const text = extract(req.provider, j);
  if (!text && req.provider === "gemini") {
    const why = j.candidates?.[0]?.finishReason ?? j.promptFeedback?.blockReason ?? "empty";
    throw new Error(`Gemini returned no text (${why}).`);
  }
  return text;
}

/** Streams text deltas. Server-sent events for every provider. */
export async function* stream(req: LlmRequest, settings: Settings, signal?: AbortSignal): AsyncGenerator<string> {
  const pr = prepare(req, settings, true);
  const res = await fetch(pr.url, { method: "POST", headers: pr.headers, body: JSON.stringify(pr.body), signal: withTimeout(signal, req.timeoutMs) });
  if (!res.ok) await fail(res);
  if (!res.body) {
    yield await res.text();
    return;
  }
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += value;
    let nl: number;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      let j: Record<string, unknown>;
      try { j = JSON.parse(data); } catch { continue; }
      if (req.provider === "claude") {
        const d = j.delta as { type?: string; text?: string } | undefined;
        if (j.type === "content_block_delta" && d?.type === "text_delta" && d.text) yield d.text;
        if (j.type === "error") throw new Error(String((j.error as { message?: string })?.message ?? "Claude stream error"));
      } else {
        const t = extract(req.provider, j);
        if (t) yield t;
      }
    }
  }
}

export async function listModels(settings: Settings, provider: ProviderId, filter?: "realtime"): Promise<string[]> {
  const k = getKeys();
  if (provider === "claude") {
    const res = await fetch("https://api.anthropic.com/v1/models?limit=100", { headers: { "x-api-key": k.claude, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" } });
    if (!res.ok) await fail(res);
    return ((await res.json()).data as { id: string }[]).map((m) => m.id);
  }
  if (provider === "gemini") {
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", { headers: { "x-goog-api-key": k.gemini } });
    if (!res.ok) await fail(res);
    const method = filter === "realtime" ? "bidiGenerateContent" : "generateContent";
    return ((await res.json()).models as { name: string; supportedGenerationMethods?: string[] }[])
      .filter((m) => m.supportedGenerationMethods?.includes(method))
      .map((m) => m.name.replace(/^models\//, ""));
  }
  if (provider === "openai") {
    const res = await fetch("https://api.openai.com/v1/models", { headers: { authorization: `Bearer ${k.openai}` } });
    if (!res.ok) await fail(res);
    const ids = ((await res.json()).data as { id: string }[]).map((m) => m.id).sort();
    return filter === "realtime" ? ids.filter((m) => m.includes("realtime")) : ids.filter((m) => /^(?:gpt|o\d|chatgpt)/.test(m) && !/realtime|audio|transcribe|tts|image|search/.test(m));
  }
  const res = await fetch(`${settings.localUrl.replace(/\/+$/, "")}/v1/models`, { headers: k.local ? { authorization: `Bearer ${k.local}` } : {} });
  if (!res.ok) await fail(res);
  return ((await res.json()).data as { id: string }[]).map((m) => m.id);
}

/** One-shot vision call on the default provider and model ("Look at my diagram"). */
export async function describeImage(settings: Settings, image: Blob, prompt: string, target?: { provider: ProviderId; model: string }): Promise<string> {
  const k = getKeys();
  const b64 = await image.arrayBuffer().then((buf) => {
    const u8 = new Uint8Array(buf);
    let s = "";
    for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000));
    return btoa(s);
  });
  const mime = image.type || "image/png";
  const p = target?.provider ?? settings.provider;
  const model = target?.model;
  if (p === "claude") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": k.claude, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
      body: JSON.stringify({ model: model || settings.claudeModel, max_tokens: 600, messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: mime, data: b64 } }, { type: "text", text: prompt }] }] }),
    });
    if (!res.ok) await fail(res);
    return extract("claude", await res.json());
  }
  if (p === "gemini") {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model || settings.geminiModel)}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": k.gemini },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ inlineData: { mimeType: mime, data: b64 } }, { text: prompt }] }], generationConfig: { maxOutputTokens: 1200 } }),
    });
    if (!res.ok) await fail(res);
    return extract("gemini", await res.json());
  }
  const openai = p === "openai";
  const url = openai ? "https://api.openai.com/v1/chat/completions" : `${settings.localUrl.replace(/\/+$/, "")}/v1/chat/completions`;
  const key = openai ? k.openai : k.local;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...(key ? { authorization: `Bearer ${key}` } : {}) },
    body: JSON.stringify({ model: model || (openai ? settings.openaiModel : settings.localModel), messages: [{ role: "user", content: [{ type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } }, { type: "text", text: prompt }] }] }),
  });
  if (!res.ok) await fail(res);
  return extract(p, await res.json());
}
