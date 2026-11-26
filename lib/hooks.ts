"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "./store";
import { buildItems, problemById } from "@/content";
import { buildPlan, mockSlots } from "./schedule";
import { recommendMocks } from "./interview/core/recommender";
import { isDue, todayISO } from "./srs";
import type { Item, Problem } from "./types";

/** Extra (video-backed) problems the learner has opened or rated: from then on they count like any other. */
function useStartedExtras(): Problem[] {
  const progress = useStore((s) => s.progress);
  const key = Object.keys(progress).filter((k) => problemById.get(k)?.extra).sort().join(",");
  return useMemo(() => (key ? key.split(",").map((k) => problemById.get(k)!) : []), [key]);
}

export function useItems(): Item[] {
  const custom = useStore((s) => s.custom);
  const started = useStartedExtras();
  return useMemo(() => buildItems(custom, started), [custom, started]);
}

export function useProblem(id: string): Problem | undefined {
  const custom = useStore((s) => s.custom);
  // curated first, then the learner's own imported problems, then the video-backed extra page
  return useMemo(() => { const p = problemById.get(id); return p && !p.extra ? p : custom.find((c) => c.id === id) ?? p; }, [id, custom]);
}

export function usePlan() {
  const items = useItems();
  const progress = useStore((s) => s.progress);
  const settings = useStore((s) => s.settings);
  return useMemo(() => buildPlan(items, progress, settings), [items, progress, settings]);
}

export function useDue(): Item[] {
  const items = useItems();
  const progress = useStore((s) => s.progress);
  return useMemo(() => {
    const today = todayISO();
    return items.filter((i) => isDue(progress[i.id], today)).sort((a, b) => (progress[a.id].due! < progress[b.id].due! ? -1 : 1));
  }, [items, progress]);
}

/** Count-up stopwatch in seconds that pauses when the tab is hidden. */
export function useStopwatch(running = true) {
  const [sec, setSec] = useState(0);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      if (!document.hidden) setSec((s) => s + 1);
    }, 1000);
    return () => clearInterval(t);
  }, [running]);
  return [sec, setSec] as const;
}

/** Logs time spent on a page into today's activity, one minute at a time. */
export function useTrackTime() {
  const logMinutes = useStore((s) => s.logMinutes);
  const acc = useRef(0);
  useEffect(() => {
    const t = setInterval(() => {
      if (document.hidden) return;
      acc.current += 5;
      if (acc.current >= 60) {
        acc.current -= 60;
        logMinutes(1);
      }
    }, 5000);
    return () => clearInterval(t);
  }, [logMinutes]);
}

/** Upcoming mock slots labelled with what the recommender suggests for each, in order. */
export function useMockLabels(): Map<string, { title: string; href: string; reason: string }> {
  const items = useItems();
  const progress = useStore((s) => s.progress);
  const attempts = useStore((s) => s.attempts);
  const settings = useStore((s) => s.settings);
  return useMemo(() => {
    const recs = recommendMocks({ items, progress, attempts, areas: settings.areas }, 4);
    const out = new Map<string, { title: string; href: string; reason: string }>();
    if (!recs.length) return out;
    mockSlots(settings.weeks).filter((m) => progress[m.id]?.status !== "done").forEach((m, i) => {
      const r = recs[i % recs.length];
      const q = new URLSearchParams({ kind: r.kind, ...(r.pool.topics?.length ? { topics: r.pool.topics.join(",") } : {}) });
      out.set(m.id, { title: i < recs.length ? r.title : `${r.title} (repeat)`, href: `/mock?${q}`, reason: r.reason });
    });
    return out;
  }, [items, progress, attempts, settings.areas, settings.weeks]);
}
