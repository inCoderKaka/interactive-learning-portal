"use client";
import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ListTree, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { TopicTree } from "./TopicTree";
import { cn } from "../ui";

const RAIL_KEY = "ascent:tree:rail";

/**
 * Lesson and problem pages: the curriculum tree beside the content. A sticky rail on wide screens (collapsible,
 * remembered), a drawer behind a "Contents" button on smaller ones.
 */
export function TreeLayout({ current, children, wide = false }: { current?: string; children: ReactNode; wide?: boolean }) {
  const [rail, setRail] = useState(true);
  const [drawer, setDrawer] = useState(false);
  useEffect(() => { setRail(localStorage.getItem(RAIL_KEY) !== "0"); }, []);
  const setRailP = (v: boolean) => { setRail(v); localStorage.setItem(RAIL_KEY, v ? "1" : "0"); };

  return (
    <div className={cn("relative xl:grid xl:gap-8", rail ? "xl:grid-cols-[272px_minmax(0,1fr)]" : "xl:grid-cols-[36px_minmax(0,1fr)]")}>
      <aside data-read-skip className="hidden xl:block">
        <div className="sticky top-20 flex h-[calc(100dvh-6.5rem)] flex-col">
          {rail ? (
            <>
              <div className="mb-2 flex items-center justify-between">
                <span className="eyebrow flex items-center gap-1.5"><ListTree size={13} />Contents</span>
                <button onClick={() => setRailP(false)} aria-label="Collapse contents" className="rounded-md p-1 text-faint hover:text-text"><PanelLeftClose size={15} /></button>
              </div>
              <TopicTree current={current} compact />
            </>
          ) : (
            <button onClick={() => setRailP(true)} aria-label="Show contents" title="Show contents" className="grid h-9 w-9 place-items-center rounded-xl border border-line text-mute hover:text-text"><PanelLeftOpen size={16} /></button>
          )}
        </div>
      </aside>

      <div className={cn("min-w-0", !wide && "mx-auto w-full max-w-4xl")}>
        <button data-read-skip onClick={() => setDrawer(true)} className="mb-4 flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[12.5px] text-mute hover:text-text xl:hidden"><ListTree size={14} />Contents</button>
        {children}
      </div>

      <AnimatePresence>
        {drawer && (
          <motion.div data-read-skip initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm xl:hidden" onClick={() => setDrawer(false)}>
            <motion.div initial={{ x: -24 }} animate={{ x: 0 }} exit={{ x: -24 }} onClick={(e) => e.stopPropagation()} className="absolute inset-y-0 left-0 flex w-[min(340px,88vw)] flex-col border-r border-line bg-panel p-4">
              <div className="mb-3 flex items-center justify-between"><span className="eyebrow flex items-center gap-1.5"><ListTree size={13} />Contents</span><button onClick={() => setDrawer(false)} aria-label="Close contents" className="text-mute hover:text-text"><X size={16} /></button></div>
              <TopicTree current={current} compact onNavigate={() => setDrawer(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
