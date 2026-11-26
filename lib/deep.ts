"use client";
import { useEffect, useState } from "react";
import { DEEP_FILES } from "@/content/deep/files";
import type { Deep } from "@/content/deep/types";
import type { Topic } from "./types";

const cache = new Map<string, Promise<Record<string, Deep>>>();
export const loadDeepFile = (file: string) => { if (!cache.has(file)) cache.set(file, DEEP_FILES[file]()); return cache.get(file)!; };

/** The full topic: chapters are complete already; subtopic pages get their body merged in once its file loads. */
export function useDeepTopic(t: Topic | undefined): Topic | undefined | null {
  const [body, setBody] = useState<{ id: string; d: Deep } | null>(null);
  useEffect(() => {
    if (!t?.deepFile) return;
    let live = true;
    loadDeepFile(t.deepFile).then((all) => live && all[t.id] && setBody({ id: t.id, d: all[t.id] }));
    return () => { live = false; };
  }, [t]);
  if (!t || !t.deepFile) return t;
  if (!body || body.id !== t.id) return null; // loading
  const d = body.d;
  return { ...t, signals: d.signals, lesson: d.lesson, revise: d.revise, notes: d.notes, doubts: d.doubts, pitfalls: d.pitfalls, quiz: d.quiz, template: d.template, sources: d.sources };
}
