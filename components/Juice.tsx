"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useScroll, useSpring } from "motion/react";
import confetti from "canvas-confetti";
import { Mountain } from "lucide-react";
import { useStore, selectXp } from "@/lib/store";
import { levelOf } from "@/lib/gamify";

const calm = () => typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** A small confetti pop from an element (a right answer, a finished round). */
export function popFrom(el: Element | null, n = 26) {
  if (!el || calm()) return;
  const r = el.getBoundingClientRect();
  confetti({ particleCount: n, spread: 55, startVelocity: 24, gravity: 1.1, ticks: 120, scalar: 0.75, origin: { x: (r.left + r.width / 2) / window.innerWidth, y: (r.top + r.height / 2) / window.innerHeight }, colors: ["#c8f547", "#5be49b", "#4fd1c5", "#7aa7ff"], disableForReducedMotion: true });
}

/** Thin bar along the top edge that fills as you read down the page. */
export function ReadingProgress({ color = "var(--color-accent)" }: { color?: string }) {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 160, damping: 30, mass: 0.3 });
  return <motion.div aria-hidden className="fixed inset-x-0 top-0 z-[60] h-[3px] origin-left" style={{ scaleX, background: `linear-gradient(90deg, color-mix(in srgb, ${color} 55%, transparent), ${color})`, boxShadow: `0 0 12px ${color}` }} />;
}

/** Celebrates crossing into a new level, once per level, with a burst and a banner. */
export function LevelUp() {
  const xp = useStore(selectXp);
  const ready = useStore((s) => s.ready);
  const { level, rank } = levelOf(xp);
  const seen = useRef<number | null>(null);
  const [show, setShow] = useState<{ level: number; rank: string } | null>(null);
  useEffect(() => {
    if (!ready) return;
    if (seen.current === null) { seen.current = level; return; } // first load: just remember
    if (level > seen.current) {
      seen.current = level;
      setShow({ level, rank });
      if (!calm()) {
        const end = Date.now() + 900;
        const frame = () => { confetti({ particleCount: 5, angle: 60, spread: 60, origin: { x: 0, y: 0.7 } }); confetti({ particleCount: 5, angle: 120, spread: 60, origin: { x: 1, y: 0.7 } }); if (Date.now() < end) requestAnimationFrame(frame); };
        frame();
      }
      const t = setTimeout(() => setShow(null), 4200);
      return () => clearTimeout(t);
    }
  }, [level, rank, ready]);
  return (
    <AnimatePresence>
      {show && (
        <motion.div role="status" initial={{ opacity: 0, y: -30, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20 }} transition={{ type: "spring", stiffness: 260, damping: 20 }}
          onClick={() => setShow(null)} className="fixed left-1/2 top-20 z-[85] flex -translate-x-1/2 cursor-pointer items-center gap-4 rounded-2xl border border-accent/50 bg-panel/95 px-5 py-4 shadow-[0_20px_80px_-20px_var(--color-accent)] backdrop-blur">
          <motion.span initial={{ rotate: -20, scale: 0.6 }} animate={{ rotate: 0, scale: 1 }} transition={{ delay: 0.15, type: "spring" }} className="grid h-12 w-12 place-items-center rounded-2xl bg-accent text-ink"><Mountain size={24} strokeWidth={2.4} /></motion.span>
          <div><div className="eyebrow text-accent">Level up</div><div className="display text-xl font-semibold">Level {show.level} · {show.rank}</div></div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
