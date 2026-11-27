import type { Area, Item, Progress, Settings } from "./types";
import { addDays, daysBetween, todayISO } from "./srs";
import { mockDays } from "./interview/core/recommender";

export interface PlanDay {
  date: string;
  week: number; // 1-based, relative to plan start
  rest: boolean;
  budget: number; // minutes for new material
  items: Item[];
  minutes: number;
}
export interface Plan {
  days: PlanDay[];
  overflow: Item[];
  endDate: string;
  totalMin: number; // remaining work
  capacityMin: number; // remaining capacity for new material
  coverage: number; // 0..1 of remaining work that fits
  neededHoursPerDay: number; // to fit everything in the remaining days
}

/** How the loop weighs each area; also drives the balance check on the progress page. */
export const AREA_WEIGHTS: Record<Area, number> = { dsa: 0.5, hld: 0.2, lld: 0.13, craft: 0.08, ai: 0.09 };
const WEIGHTS = AREA_WEIGHTS;
const REVIEW_SHARE = 0.2;

/** Planned mock interviews: about 1.2 per week, at least 4, at most 16. */
export function mockSlots(weeks: number): Item[] {
  const n = Math.max(4, Math.min(16, Math.round(weeks * 1.2)));
  return Array.from({ length: n }, (_, i) => ({
    id: `mock-${i + 1}`, kind: "mock", area: "craft", topic: "coding-round", title: `Mock interview ${i + 1}`, tier: 1, est: 60, href: "/mock",
  }));
}


function isRest(date: string, daysPerWeek: number) {
  const dow = new Date(date + "T12:00:00").getDay(); // 0 Sun
  if (daysPerWeek >= 7) return false;
  if (daysPerWeek === 6) return dow === 0;
  if (daysPerWeek === 5) return dow === 0 || dow === 6;
  return dow === 0 || dow === 6 || dow === 3; // 4 days
}

export function buildPlan(items: Item[], progress: Record<string, Progress>, s: Settings, today = todayISO()): Plan {
  const endDate = addDays(s.startDate, s.weeks * 7 - 1);
  const first = today > s.startDate ? today : s.startDate;
  const nDays = Math.max(0, daysBetween(first, endDate) + 1);

  // effective tier: a topic is at least as urgent as its most urgent child
  const minChildTier = new Map<string, number>();
  for (const it of items) if (it.kind !== "topic") minChildTier.set(it.topic, Math.min(minChildTier.get(it.topic) ?? 3, it.tier));
  const eff = (it: Item) => (it.kind === "topic" ? Math.min(it.tier, minChildTier.get(it.topic) ?? it.tier) : it.tier);

  const pending = items.filter((it) => !it.optional && s.areas[it.area] && progress[it.id]?.status !== "done");
  const queues: Record<Area, Item[]> = { dsa: [], hld: [], lld: [], craft: [], ai: [] };
  pending
    .map((it, i) => ({ it, i, t: eff(it) }))
    .sort((a, b) => a.t - b.t || a.i - b.i)
    .forEach(({ it }) => queues[it.area].push(it));

  const mocks = mockSlots(s.weeks).filter((m) => progress[m.id]?.status !== "done");
  // denser toward the end of the plan, as candidates ramp up (spec MI-PER-4)
  const workIdx: number[] = [];
  for (let d = 0; d < nDays; d++) if (!isRest(addDays(first, d), s.daysPerWeek)) workIdx.push(d);
  const mockOn = new Set(mockDays(workIdx.length, mocks.length).map((i) => workIdx[i]));
  const days: PlanDay[] = [];
  const spent: Record<Area, number> = { dsa: 0, hld: 0, lld: 0, craft: 0, ai: 0 };
  const totalMin = pending.reduce((a, b) => a + b.est, 0);
  let capacityMin = 0;

  for (let d = 0; d < nDays; d++) {
    const date = addDays(first, d);
    const week = Math.floor(daysBetween(s.startDate, date) / 7) + 1;
    const rest = isRest(date, s.daysPerWeek);
    let budget = rest ? 0 : Math.round(s.hoursPerDay * 60 * (1 - REVIEW_SHARE));
    const day: PlanDay = { date, week, rest, budget, items: [], minutes: 0 };
    days.push(day);
    if (rest) continue;

    if (mockOn.has(d) && mocks.length && budget >= 45) {
      const m = mocks.shift()!;
      day.items.push(m);
      day.minutes += m.est;
      budget -= m.est;
    }
    capacityMin += budget;

    let guard = 0;
    while (budget > 10 && guard++ < 50) {
      const areas = (Object.keys(queues) as Area[]).filter((a) => queues[a].length);
      if (!areas.length) break;
      // deficit round-robin across areas, but always finish higher tiers first
      const minTier = Math.min(...areas.map((a) => eff(queues[a][0])));
      const cands = areas.filter((a) => eff(queues[a][0]) === minTier);
      cands.sort((a, b) => spent[a] / WEIGHTS[a] - spent[b] / WEIGHTS[b]);
      let placed = false;
      for (const a of cands) {
        const it = queues[a][0];
        if (it.est <= budget || (day.items.length === 0 && it.est <= budget * 1.5) || budget >= it.est * 0.7) {
          queues[a].shift();
          day.items.push(it);
          day.minutes += it.est;
          budget -= it.est;
          spent[a] += it.est;
          placed = true;
          break;
        }
      }
      if (!placed) break;
    }
  }

  const overflow = (Object.keys(queues) as Area[]).flatMap((a) => queues[a]);
  const fitMin = totalMin - overflow.reduce((a, b) => a + b.est, 0);
  const workDays = days.filter((d) => !d.rest).length || 1;
  return {
    days, overflow, endDate, totalMin, capacityMin,
    coverage: totalMin ? fitMin / totalMin : 1,
    neededHoursPerDay: Math.round(((totalMin + mocks.length * 60) / workDays / (1 - REVIEW_SHARE) / 60) * 10) / 10,
  };
}
