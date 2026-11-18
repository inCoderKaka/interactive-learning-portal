"use client";
// Local spend meter for the cost guard (MI-X-5). Every AI call and every realtime minute adds an
// estimate to this month's bucket. Kept in this browser only; never sent to Ascent.

import { BUCKETS, addSpend, llmCostUsd, monthKey, tokensOf, type Bucket, type Ledger, type Spend } from "./core/usage";

const KEY = "ascent:usage:v1";
let scope: Bucket = "other";
const listeners = new Set<() => void>();

/** Which bucket AI calls count against right now (set by the running round). */
export function setMeterScope(b: Bucket) { scope = b; }
export const meterScope = () => scope;

export function loadLedger(): Ledger {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}") as Ledger; } catch { return {}; }
}

export function spendThisMonth(now = Date.now()): Spend {
  return loadLedger()[monthKey(now)] ?? {};
}

export function addUsd(bucket: Bucket, usd: number) {
  if (!(usd > 0)) return;
  try {
    const all = addSpend(loadLedger(), monthKey(Date.now()), bucket, usd);
    // keep a year of history
    const months = Object.keys(all).sort().slice(-12);
    localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(months.map((m) => [m, all[m]]))));
  } catch { /* private mode: the guard falls back to per-round estimates */ }
  for (const l of listeners) l();
}

export function meterLlm(provider: string, model: string, inChars: number, outChars: number, bucket: Bucket = scope) {
  addUsd(bucket, llmCostUsd(provider, model, tokensOf(inChars), tokensOf(outChars)));
}

export function onSpend(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }

export function resetMonth() {
  try {
    const all = loadLedger();
    delete all[monthKey(Date.now())];
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch { /* ignore */ }
  for (const l of listeners) l();
}

export { BUCKETS };
