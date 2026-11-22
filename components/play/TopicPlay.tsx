"use client";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Gamepad2, Play, Trophy } from "lucide-react";
import { topicEntries, usePlay } from "@/lib/play";
import { KIND_LABEL } from "@/lib/drills";
import type { DrillKind } from "@/lib/types";
import { Button } from "@/components/ui";
import { KIND_ICON, QuickPlay } from "./QuickPlay";

/** The topic page's quick-play block: a compact launch card that opens into the round in place. */
export function TopicPlay({ topicId, color }: { topicId: string; color: string }) {
  const entries = useMemo(() => topicEntries(topicId), [topicId]);
  const play = usePlay();
  const [on, setOn] = useState(false);
  if (!entries.length) return null;
  const kinds = [...new Set(entries.map((e) => e.d.kind))] as DrillKind[];
  const best = play.topics[topicId];
  return (
    <section data-read-block data-read-text={`Time to play: ${entries.length} quick micro-challenges on this topic, about ${Math.max(1, Math.round(entries.length * 0.4))} minutes. Press start when you're ready.`}
      className="card relative overflow-clip p-5 sm:p-6" style={{ borderColor: `color-mix(in srgb, ${color} 30%, var(--color-line))` }}>
      <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full blur-3xl" style={{ background: `color-mix(in srgb, ${color} 16%, transparent)` }} />
      <AnimatePresence mode="wait" initial={false}>
        {on ? (
          <motion.div key="play" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="relative">
            <QuickPlay entries={entries} mode="topic" topicId={topicId} color={color} onExit={() => setOn(false)} />
          </motion.div>
        ) : (
          <motion.div key="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -8 }} className="relative flex flex-wrap items-center gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl" style={{ background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}><Gamepad2 size={22} /></span>
            <div className="min-w-0 flex-1">
              <div className="eyebrow" style={{ color }}>Quick play</div>
              <div className="display text-[17px] font-semibold">{entries.length} micro-challenges · about {Math.max(1, Math.round(entries.length * 0.4))} min</div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {kinds.map((k) => { const I = KIND_ICON[k]; return <span key={k} className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-[11px] text-mute"><I size={11} />{KIND_LABEL[k]}</span>; })}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {best !== undefined && <span className="num inline-flex items-center gap-1 text-[12.5px] text-mute" title="Your best score on this round"><Trophy size={13} className="text-warn" />{best}%</span>}
              <Button variant="primary" onClick={() => setOn(true)}><Play size={15} fill="currentColor" />{best === undefined ? "Start" : "Play again"}</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
