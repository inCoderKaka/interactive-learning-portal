"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CalendarClock, Calculator, Check, Eye, GitFork, MessageSquareQuote, PenLine, Siren, Wrench, X } from "lucide-react";
import type { Exercise, ExerciseKind } from "@/lib/types";
import { Button, Md, cn } from "./ui";

const KIND: Record<ExerciseKind, { label: string; icon: typeof Calculator; tone: string }> = {
  estimate: { label: "Estimate", icon: Calculator, tone: "var(--color-hld)" },
  break: { label: "What breaks?", icon: Siren, tone: "var(--color-bad)" },
  choose: { label: "Choose", icon: GitFork, tone: "var(--color-lld)" },
  design: { label: "Mini design", icon: PenLine, tone: "var(--color-accent)" },
  say: { label: "Say it", icon: MessageSquareQuote, tone: "var(--color-craft)" },
  plan: { label: "Plan it", icon: CalendarClock, tone: "var(--color-hld)" },
  fix: { label: "Fix it", icon: Wrench, tone: "var(--color-bad)" },
};

/**
 * Write-then-reveal practice. Generating an answer before seeing one is what makes it stick (the testing effect),
 * so the model answer stays hidden until the learner has had a go; then they mark whether they had it.
 */
export function Exercises({ list, color }: { list: Exercise[]; color: string }) {
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const [draft, setDraft] = useState<Record<number, string>>({});
  const [mark, setMark] = useState<Record<number, boolean>>({});
  if (!list.length) return null;
  const had = Object.values(mark).filter(Boolean).length, marked = Object.keys(mark).length;
  return (
    <section className="card p-5" data-read-block data-read-text={`There are ${list.length} exercises. Write or say your answer before revealing the model answer.`}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="eyebrow" style={{ color }}>Exercises</div>
          <p className="mt-1 text-[13px] text-mute">Answer first, out loud or in the box, then compare. The comparison is where the learning happens.</p>
        </div>
        {marked > 0 && <span className="num text-[13px] text-mute">{had}/{marked} had it</span>}
      </div>
      <ol className="mt-4 space-y-3">
        {list.map(([kind, prompt, answer], i) => {
          const K = KIND[kind], Icon = K.icon;
          return (
            <li key={i} className="rounded-xl border border-line bg-panel2/60 p-4">
              <div className="flex items-start gap-3">
                <span className="num mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md border border-line text-[12px] text-mute">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <span className="mb-1.5 inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-[11px] font-semibold" style={{ color: K.tone }}><Icon size={11} />{K.label}</span>
                  <Md className="text-[14.5px]">{prompt}</Md>
                  {!open[i] && (
                    <textarea value={draft[i] ?? ""} onChange={(e) => setDraft((d) => ({ ...d, [i]: e.target.value }))} rows={2} placeholder="Your answer (optional)…" aria-label={`Your answer to exercise ${i + 1}`}
                      className="mt-3 w-full resize-y rounded-lg border border-line bg-bg px-3 py-2 text-[13.5px] outline-none focus:border-accent/50" />
                  )}
                  {open[i] && draft[i]?.trim() && <div className="mt-3 whitespace-pre-wrap rounded-lg border border-dashed border-line px-3 py-2 text-[13px] text-mute"><span className="text-faint">You wrote: </span>{draft[i]}</div>}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {!open[i] && <Button size="sm" onClick={() => setOpen((o) => ({ ...o, [i]: true }))}><Eye size={14} />Reveal the model answer</Button>}
                    {open[i] && (
                      <>
                        <span className="text-[12px] text-faint">Did you have it?</span>
                        <button onClick={() => setMark((m) => ({ ...m, [i]: true }))} className={cn("inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[12px]", mark[i] === true ? "border-ok/60 text-ok" : "border-line text-mute hover:text-text")}><Check size={12} />Yes</button>
                        <button onClick={() => setMark((m) => ({ ...m, [i]: false }))} className={cn("inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[12px]", mark[i] === false ? "border-bad/60 text-bad" : "border-line text-mute hover:text-text")}><X size={12} />Missed part</button>
                      </>
                    )}
                  </div>
                  <AnimatePresence initial={false}>
                    {open[i] && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="mt-3 rounded-lg border-l-2 pl-3" style={{ borderColor: K.tone }}><Md className="text-[14px]">{answer}</Md></div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
