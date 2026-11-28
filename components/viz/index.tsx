"use client";
import dynamic from "next/dynamic";
import Player from "./Player";
import { ALGOS } from "./algos";
import { WIDGETS } from "./Hld";
import { AI_DEEP_WIDGET_IDS, AI_WIDGET_IDS } from "./ai-ids";
import { HLD_WIDGET_IDS } from "./sd/ids";
import { VisualFrame } from "./Frame";

const pretty = (id: string) => id.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());
/** Display name of any visual id (step players carry their own title). */
export const vizTitle = (id: string) => ALGOS[id]?.title ?? pretty(id);
export const isViz = (id: string) => !!(ALGOS[id] || AI_WIDGET_IDS.has(id) || AI_DEEP_WIDGET_IDS.has(id) || HLD_WIDGET_IDS.has(id) || WIDGETS[id]);

// The AI widgets load only on pages that use them.
const AiWidget = dynamic(() => import("./Ai").then((m) => m.AiWidget), {
  ssr: false,
  loading: () => <div className="card grid h-[280px] place-items-center text-sm text-faint animate-pulse-soft">Loading the demo…</div>,
});

const AiDeepWidget = dynamic(() => import("./AiDeep").then((m) => m.AiDeepWidget), {
  ssr: false,
  loading: () => <div className="card grid h-[280px] place-items-center text-sm text-faint animate-pulse-soft">Loading the demo…</div>,
});

const HldWidget = dynamic(() => import("./sd").then((m) => m.HldWidget), {
  ssr: false,
  loading: () => <div className="card grid h-[280px] place-items-center text-sm text-faint animate-pulse-soft">Loading the demo…</div>,
});

function Inner({ id }: { id: string }) {
  if (ALGOS[id]) return <Player id={id} />;
  if (AI_WIDGET_IDS.has(id)) return <AiWidget id={id} />;
  if (AI_DEEP_WIDGET_IDS.has(id)) return <AiDeepWidget id={id} />;
  if (HLD_WIDGET_IDS.has(id)) return <HldWidget id={id} />;
  const W = WIDGETS[id];
  return W ? <W /> : null;
}

/** Any visual by id, inside the frame that lets the learner fold or hide it. */
export default function Viz({ id }: { id?: string }) {
  if (!id || !isViz(id)) return null;
  return <VisualFrame id={id} title={vizTitle(id)}><Inner id={id} /></VisualFrame>;
}
