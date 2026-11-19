"use client";
import dynamic from "next/dynamic";
import Player from "./Player";
import { ALGOS } from "./algos";
import { WIDGETS } from "./Hld";
import { AI_WIDGET_IDS } from "./ai-ids";

// The AI widgets load only on pages that use them.
const AiWidget = dynamic(() => import("./Ai").then((m) => m.AiWidget), {
  ssr: false,
  loading: () => <div className="card grid h-[280px] place-items-center text-sm text-faint animate-pulse-soft">Loading the demo…</div>,
});

export default function Viz({ id }: { id?: string }) {
  if (!id) return null;
  if (ALGOS[id]) return <Player id={id} />;
  if (AI_WIDGET_IDS.has(id)) return <AiWidget id={id} />;
  const W = WIDGETS[id];
  return W ? <W /> : null;
}
