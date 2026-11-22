"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { FileText, Hand, X } from "lucide-react";
import { activeRun, loadRuns, useImports } from "@/lib/notes/import/runner";
import { STEPS } from "@/lib/notes/import/pipeline";

/** Shows a running import from anywhere in the app, and says when it needs the learner. */
export function ImportPill() {
  const runs = useImports((s) => s.runs);
  const toast = useImports((s) => s.toast);
  const path = usePathname();
  const sp = useSearchParams();
  const [shownToast, setShownToast] = useState<typeof toast>(null);
  useEffect(() => { void loadRuns(); }, []);
  useEffect(() => {
    if (!toast) return;
    setShownToast(toast);
    const t = setTimeout(() => setShownToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);
  const run = activeRun(runs);
  const onStudio = path === "/notes" && sp.get("tab") === "import";
  const show = run && !onStudio && run.status !== "paused";
  const s = run?.cp.state;
  const cur = s ? STEPS.find((x) => s.steps[x.id]?.status === "running" || s.steps[x.id]?.status === "waiting") : undefined;
  const st = cur && s ? s.steps[cur.id] : undefined;
  const pct = st?.total ? (st.done ?? 0) / st.total : 0;
  const waiting = run?.status === "waiting";
  return (
    <>
      <AnimatePresence>
        {show && run && (
          <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }} className="fixed bottom-[88px] left-4 z-[55] lg:bottom-6 lg:left-[252px]">
            <Link href={`/notes?tab=import&run=${run.id}`} className={`flex max-w-[300px] items-center gap-2.5 rounded-2xl border bg-panel/95 py-2 pl-2 pr-3.5 shadow-[0_14px_40px_-12px_rgba(0,0,0,0.9)] backdrop-blur transition hover:-translate-y-0.5 ${waiting ? "border-warn/50" : "border-line"}`}>
              <span className="relative grid h-8 w-8 shrink-0 place-items-center">
                <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90"><circle cx="18" cy="18" r="15" fill="none" stroke="var(--color-line)" strokeWidth="3" /><circle cx="18" cy="18" r="15" fill="none" stroke={waiting ? "var(--color-warn)" : "var(--color-accent)"} strokeWidth="3" strokeLinecap="round" strokeDasharray={`${Math.max(0.06, pct) * 94.2} 94.2`} className={waiting ? "" : "transition-all duration-500"} /></svg>
                {waiting ? <Hand size={13} className="text-warn" /> : <motion.span animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}><FileText size={13} className="text-accent" /></motion.span>}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[12.5px] font-medium">{waiting ? "Your import needs you" : cur?.label ?? "Importing"}</span>
                <span className="block truncate text-[11px] text-faint">{run.name}{st?.total ? ` · ${st.done ?? 0}/${st.total}` : ""}</span>
              </span>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {shownToast && !onStudio && (
          <motion.div key={shownToast.key} initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }} role="status" className="fixed right-4 top-[68px] z-[85] flex max-w-sm items-center gap-3 rounded-2xl border border-accent/40 bg-panel/95 py-2.5 pl-3.5 pr-2 shadow-2xl backdrop-blur">
            <FileText size={16} className="shrink-0 text-accent" />
            <Link href={`/notes?tab=import&run=${shownToast.id}`} onClick={() => setShownToast(null)} className="text-[13px] leading-snug hover:underline">{shownToast.text}</Link>
            <button onClick={() => setShownToast(null)} aria-label="Dismiss" className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-faint hover:text-text"><X size={13} /></button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
