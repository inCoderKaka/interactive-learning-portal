"use client";
import { useSyncExternalStore } from "react";
import type { Area, Drill } from "./types";
import { addDays, todayISO } from "./srs";
import { hash, rng, shuffle } from "./drills";
import { DRILLS } from "@/content/drills";
import { TOPICS, topicById } from "@/content";

/**
 * Quick-play records, kept in this browser only (they are a per-device convenience, not progress):
 * best scores per arcade mode, the daily round's results, best percentage per topic, and the sound toggle.
 */
export interface PlayState {
  best: Record<string, number>; // "lightning" | "survival" → best score
  daily: Record<string, { score: number; total: number }>; // ISO date → result
  topics: Record<string, number>; // topic id → best % in its quick-play round
  sound: boolean;
  played: number; // drills answered, all time
}
const KEY = "ascent:play:v1";
const empty = (): PlayState => ({ best: {}, daily: {}, topics: {}, sound: true, played: 0 });

let state: PlayState = empty();
let loaded = false;
const subs = new Set<() => void>();
function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try { const raw = localStorage.getItem(KEY); if (raw) state = { ...empty(), ...JSON.parse(raw) }; } catch { /* private mode: in-memory only */ }
}
export function updatePlay(f: (s: PlayState) => PlayState) {
  load();
  state = f(state);
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* quota or private mode */ }
  subs.forEach((s) => s());
}
const subscribe = (cb: () => void) => { subs.add(cb); return () => subs.delete(cb); };
const snap = () => { load(); return state; };
const serverSnap = () => state;
export const usePlay = () => useSyncExternalStore(subscribe, snap, serverSnap);

/** Consecutive days (ending today, or yesterday if today isn't played yet) with a finished daily round. */
export function dailyStreak(daily: PlayState["daily"], today = todayISO()) {
  let d = daily[today] ? today : addDays(today, -1), n = 0;
  while (daily[d]) { n++; d = addDays(d, -1); }
  return n;
}

export interface Entry { d: Drill; topic: string }
/** Every drill in the enabled areas, tagged with its topic. */
export function pool(areas?: Partial<Record<Area, boolean>>, only?: Area): Entry[] {
  return TOPICS.filter((t) => (only ? t.area === only : !areas || areas[t.area] !== false))
    .flatMap((t) => (DRILLS[t.id] ?? []).map((d) => ({ d, topic: t.id })));
}
export const topicEntries = (id: string): Entry[] => (DRILLS[id] ?? []).map((d) => ({ d, topic: id }));

/** Today's round: the same 7 drills for everyone on a given day, spread across areas. */
export function dailyRound(areas: Partial<Record<Area, boolean>>, date = todayISO()): Entry[] {
  const r = rng(hash("daily:" + date));
  const byArea = new Map<Area, Entry[]>();
  for (const e of shuffle(pool(areas), r)) {
    const a = topicById.get(e.topic)!.area;
    byArea.set(a, [...(byArea.get(a) ?? []), e]);
  }
  const lanes = shuffle([...byArea.values()], r), out: Entry[] = [];
  for (let i = 0; out.length < 7 && lanes.some((l) => l.length > i); i++) for (const l of lanes) if (l[i] && out.length < 7) out.push(l[i]);
  return out;
}
