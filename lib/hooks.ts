"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "./store";
import { buildItems, PROBLEMS } from "@/content";
import { buildPlan } from "./schedule";
import { isDue, todayISO } from "./srs";
import type { Item, Problem } from "./types";

export function useItems(): Item[] {
  const custom = useStore((s) => s.custom);
  return useMemo(() => buildItems(custom), [custom]);
}

export function useProblem(id: string): Problem | undefined {
  const custom = useStore((s) => s.custom);
  return useMemo(() => PROBLEMS.find((p) => p.id === id) ?? custom.find((p) => p.id === id), [id, custom]);
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
