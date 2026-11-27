"use client";
/**
 * Hover definitions. Md runs every text node through `rehypeGlossary`, which wraps the first mention of each
 * glossary term in a block with <dfn data-k>. <Term> renders it with a faint dotted underline; hovering, focusing
 * or tapping shows the plain-words definition in a small card (portalled, so cards with overflow-hidden never clip it).
 * Terms are global, or tied to one area (a "token" in rate limiting is not a "token" in an LLM); the page sets the
 * area through <GlossaryArea>.
 */
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { glossOf } from "@/lib/glossary";
export { rehypeGlossary } from "@/lib/glossary";
import { useStore } from "@/lib/store";
import type { Area } from "@/lib/types";

const Ctx = createContext<Area | undefined>(undefined);
export const GlossaryArea = ({ area, children }: { area?: Area; children: ReactNode }) => <Ctx.Provider value={area}>{children}</Ctx.Provider>;
export const useGlossaryArea = () => useContext(Ctx);

/** The underlined word and its definition card. */
export function Term({ k, children, area }: { k: string; children: ReactNode; area?: Area }) {
  const g = glossOf(k, area);
  const ref = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number; below: boolean } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const show = () => { clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(true), 120); };
  const hide = () => { clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(false), 80); };
  useLayoutEffect(() => {
    if (!open || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setPos({ x: Math.min(Math.max(r.left + r.width / 2, 170), window.innerWidth - 170), y: r.top < 150 ? r.bottom : r.top, below: r.top < 150 });
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, { passive: true, capture: true });
    return () => window.removeEventListener("scroll", close, { capture: true });
  }, [open]);
  if (!g) return <>{children}</>;
  return (
    <>
      <span ref={ref} tabIndex={0} role="button" aria-describedby={open ? `gl-${g.t}` : undefined}
        onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide} onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className="cursor-help underline decoration-[#5d637c] decoration-dotted decoration-1 underline-offset-[3px] transition hover:decoration-[var(--color-accent)] focus:outline-none focus-visible:decoration-[var(--color-accent)]">
        {children}
      </span>
      {open && pos && typeof document !== "undefined" && createPortal(
        <span id={`gl-${g.t}`} role="tooltip" onMouseEnter={show} onMouseLeave={hide}
          className="fixed z-[80] block w-[min(320px,calc(100vw-24px))] -translate-x-1/2 rounded-xl border border-line bg-[#121522]/95 px-3.5 py-2.5 text-left text-[13px] leading-relaxed text-[#d4d8e6] shadow-[0_12px_40px_-12px_rgb(0_0_0/.8)] backdrop-blur"
          style={{ left: pos.x, top: pos.below ? pos.y + 8 : undefined, bottom: pos.below ? undefined : window.innerHeight - pos.y + 8 }}>
          <span className="mb-0.5 block text-[11px] font-semibold uppercase tracking-wider text-accent">{g.t}{g.full ? <span className="ml-1.5 normal-case tracking-normal text-faint">{g.full}</span> : null}</span>
          {g.d}
        </span>,
        document.body,
      )}
    </>
  );
}

/** Whether hover definitions are on (Settings). */
export const useGlossaryOn = () => useStore((s) => s.settings.glossary ?? true);
