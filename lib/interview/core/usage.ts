// Cost guard (MI-X-5): approximate prices, monthly spend buckets and budget decisions. Pure, no I/O.
// BYOK usage is estimated here and never sent anywhere (architecture §5). Prices are approximate
// list prices per million tokens and change often; they exist to make budgets meaningful, not to bill.

export type Bucket = "realtime" | "ascent-voice" | "text" | "agora" | "other";
export const BUCKETS: Bucket[] = ["realtime", "ascent-voice", "text", "agora", "other"];

/** Monthly limits in USD. 0 means no limit. */
export interface Budgets { total: number; realtime: number; "ascent-voice": number; text: number; agora: number }
export const NO_BUDGETS: Budgets = { total: 0, realtime: 0, "ascent-voice": 0, text: 0, agora: 0 };

export type Spend = Partial<Record<Bucket, number>>;
export type Ledger = Record<string, Spend>; // "2026-11" → spend per bucket

const PRICES: { provider: string; match: RegExp; inUsd: number; outUsd: number }[] = [
  { provider: "gemini", match: /flash-lite|nano/i, inUsd: 0.1, outUsd: 0.4 },
  { provider: "gemini", match: /pro/i, inUsd: 1.25, outUsd: 10 },
  { provider: "gemini", match: /./, inUsd: 0.3, outUsd: 2.5 },
  { provider: "claude", match: /haiku/i, inUsd: 1, outUsd: 5 },
  { provider: "claude", match: /opus/i, inUsd: 5, outUsd: 25 },
  { provider: "claude", match: /./, inUsd: 3, outUsd: 15 },
  { provider: "openai", match: /nano/i, inUsd: 0.05, outUsd: 0.4 },
  { provider: "openai", match: /mini/i, inUsd: 0.25, outUsd: 2 },
  { provider: "openai", match: /./, inUsd: 1.25, outUsd: 10 },
];

/** Realtime audio, per minute of a round (input and output audio together). */
export const REALTIME_USD_PER_MIN: Record<string, { low: number; high: number; mid: number }> = {
  openai: { low: 0.06, high: 0.2, mid: 0.12 },
  gemini: { low: 0.02, high: 0.08, mid: 0.04 },
};
export const OPENAI_SPEECH_USD_PER_MIN = 0.015;

export const tokensOf = (chars: number) => Math.ceil(chars / 4);

export function llmCostUsd(provider: string, model: string, inTokens: number, outTokens: number): number {
  if (provider === "local") return 0;
  const p = PRICES.find((x) => x.provider === provider && x.match.test(model));
  if (!p) return 0;
  return (inTokens * p.inUsd + outTokens * p.outUsd) / 1e6;
}

export function monthKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function addSpend(ledger: Ledger, month: string, bucket: Bucket, usd: number): Ledger {
  if (!(usd > 0)) return ledger;
  const m = ledger[month] ?? {};
  return { ...ledger, [month]: { ...m, [bucket]: (m[bucket] ?? 0) + usd } };
}

export const totalOf = (s: Spend) => BUCKETS.reduce((a, b) => a + (s[b] ?? 0), 0);

export interface BudgetCheck { level: "ok" | "warn" | "over"; scope: "total" | Bucket | null; usedUsd: number; limitUsd: number }

const WARN_AT = 0.8;

/**
 * Whether spending `extraUsd` more on `bucket` this month stays inside the budgets. The tighter of the
 * bucket's own limit and the total limit decides. "warn" from 80 % of a limit.
 */
export function checkBudget(b: Budgets, spent: Spend, bucket: Bucket, extraUsd = 0): BudgetCheck {
  const checks: BudgetCheck[] = [];
  const own = bucket === "other" ? 0 : b[bucket];
  if (own > 0) checks.push(level(bucket, (spent[bucket] ?? 0) + extraUsd, own));
  if (b.total > 0) checks.push(level("total", totalOf(spent) + extraUsd, b.total));
  const rank = { ok: 0, warn: 1, over: 2 } as const;
  return checks.sort((x, y) => rank[y.level] - rank[x.level] || y.usedUsd / y.limitUsd - x.usedUsd / x.limitUsd)[0] ?? { level: "ok", scope: null, usedUsd: 0, limitUsd: 0 };
}

function level(scope: BudgetCheck["scope"], used: number, limit: number): BudgetCheck {
  return { level: used >= limit ? "over" : used >= limit * WARN_AT ? "warn" : "ok", scope, usedUsd: used, limitUsd: limit };
}

/**
 * Walk an engine order (e.g. realtime → ascent-voice → text) and return the first engine whose estimated
 * round cost fits the budgets, with the reasons the earlier ones were skipped.
 */
export function affordableEngine<E extends Bucket>(order: E[], b: Budgets, spent: Spend, estimateUsd: (e: E) => number): { engine: E | null; skipped: { engine: E; check: BudgetCheck }[] } {
  const skipped: { engine: E; check: BudgetCheck }[] = [];
  for (const e of order) {
    const c = checkBudget(b, spent, e, estimateUsd(e));
    if (c.level !== "over") return { engine: e, skipped };
    skipped.push({ engine: e, check: c });
  }
  return { engine: null, skipped };
}

/** Rounds near a budget run on the small model; the scorecard keeps its strong model (MI-X-5). */
export const cheapRound = (c: BudgetCheck) => c.level !== "ok";
