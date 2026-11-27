"use client";
// Router for the AI deep-pass visuals (Ai3.tsx onward), kept out of the older AI widget bundle.
import { AI_WIDGETS_3 } from "./Ai3";

const ALL = { ...AI_WIDGETS_3 };

export function AiDeepWidget({ id }: { id: string }) {
  const W = ALL[id];
  return W ? <W /> : null;
}
