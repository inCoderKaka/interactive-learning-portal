"use client";
// Components that the reader can operate (a visualiser it steps through, flashcards it flips, a quiz it waits on)
// register an adapter on their root element. The reader asks the adapter for steps when it reaches that element.

import { useCallback, useEffect, useRef } from "react";

export type Focus = Element | Range | null | undefined;

export interface ReadStep {
  /** What to say. Plain page text unless `spoken` is set (then it is already in speech form). */
  say: string;
  spoken?: boolean;
  /** Spotlight target while this step is spoken. Called after `act`, so it can point at what the action revealed. */
  focus?: () => Focus;
  /** An interaction to perform before speaking (flip a card, press play, move a slider). Skipped when interactions are off. */
  act?: () => void | Promise<void>;
  /** Milliseconds to let the page settle after `act` before measuring the spotlight. */
  settle?: number;
  /** Pause after speaking, in milliseconds. */
  pause?: number;
  /** Wait for the learner (for example to answer a quiz question). The label is shown in the player meanwhile. */
  waitFor?: (signal: AbortSignal) => Promise<void>;
  waitLabel?: string;
  /** Prose highlighting: the sentence being read, and the word at an offset of the spoken text. */
  sentence?: () => Range | null;
  words?: (outStart: number, outEnd: number) => Range | null;
}

export interface ReadCtx {
  interact: boolean;
  quiz: "wait" | "tell";
  /** Narration for a code element, from AI when enabled, otherwise from the heuristic reader. */
  code: (code: string, lang: string, pre: () => Element | null) => Promise<ReadStep[]>;
  /** Narration for prose text inside an element (sentence by sentence, with word highlighting). */
  prose: (el: Element, lead?: string) => ReadStep[];
}

export type Adapter = (ctx: ReadCtx) => ReadStep[] | Promise<ReadStep[]>;

const REG = new WeakMap<Element, () => Adapter>();

export function adapterFor(el: Element): Adapter | undefined {
  return REG.get(el)?.();
}

/**
 * Register a reader adapter on an element: `<section ref={useReadable((ctx) => [...])} data-read-block>`.
 * The adapter is read fresh each time, so it always sees the component's current state.
 */
export function useReadable<T extends Element>(adapter: Adapter) {
  const latest = useRef(adapter);
  useEffect(() => { latest.current = adapter; });
  return useCallback((el: T | null) => {
    if (el) REG.set(el, () => latest.current);
  }, []);
}

export const sleep = (ms: number, signal?: AbortSignal) => new Promise<void>((ok) => {
  const t = setTimeout(ok, ms);
  signal?.addEventListener("abort", () => { clearTimeout(t); ok(); }, { once: true });
});

/** Resolve once a condition holds (polled), or when the signal aborts. */
export function until(cond: () => boolean, signal: AbortSignal, every = 200): Promise<void> {
  return new Promise((ok) => {
    if (cond()) return ok();
    const t = setInterval(() => { if (cond() || signal.aborted) { clearInterval(t); ok(); } }, every);
    signal.addEventListener("abort", () => { clearInterval(t); ok(); }, { once: true });
  });
}
