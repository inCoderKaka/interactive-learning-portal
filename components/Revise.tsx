"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Flag, Radar, RotateCcw, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { topicById } from "@/content";
import { RatingBar } from "./Work";
import { RUN_KEY } from "./tree/TopicTree";
import { Button, Md, cn } from "./ui";
import type { Item, Topic } from "@/lib/types";

export { parseRevise } from "@/lib/revise-parse";
import { parseRevise } from "@/lib/revise-parse";

/** A chapter that has no written subtopics yet gets a sheet built from its own signals, pitfalls and flashcards. */
export function autoSheet(t: Topic): string {
  const lines = [`### Reach for it when`, ...t.signals.map((s) => `- ${s}`), "", `### Recall`];
  for (const [f, b] of t.cards ?? []) lines.push(`? ${f.replace(/\n/g, " ")} :: ${b.replace(/\n/g, " ")}`);
  lines.push("", "### Where candidates slip", ...t.pitfalls.map((p) => `- ${p}`));
  return lines.join("\n");
}

function Recall({ items, math }: { items: [string, string][]; math?: boolean }) {
  const [shown, setShown] = useState<Set<number>>(new Set());
  const [mark, setMark] = useState<Record<number, boolean>>({});
  const all = shown.size === items.length;
  const known = Object.values(mark).filter(Boolean).length, marked = Object.keys(mark).length;
  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5 text-[12px] text-mute">
        <span>Say each answer out loud before you reveal it.{marked > 0 && <span className="num ml-2 text-text">Knew {known}/{marked}</span>}</span>
        <span className="flex gap-1.5">
          <button onClick={() => setShown(all ? new Set() : new Set(items.map((_, i) => i)))} className="flex items-center gap-1 rounded-md border border-line px-2 py-0.5 hover:text-text">{all ? <EyeOff size={12} /> : <Eye size={12} />}{all ? "Hide all" : "Reveal all"}</button>
          {marked > 0 && <button onClick={() => { setShown(new Set()); setMark({}); }} className="flex items-center gap-1 rounded-md border border-line px-2 py-0.5 hover:text-text"><RotateCcw size={12} />Again</button>}
        </span>
      </div>
      <ol className="divide-y divide-line">
        {items.map(([q, a], i) => {
          const open = shown.has(i);
          return (
            <li key={i} className="px-4 py-3">
              <div className="flex gap-3">
                <span className="num mt-0.5 w-5 shrink-0 text-right text-[12px] text-faint">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <Md math={math} className="text-[14.5px] font-medium [&_p]:my-0">{q}</Md>
                  <AnimatePresence initial={false}>
                    {open ? (
                      <motion.div key="a" initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }} className="mt-1.5">
                        <Md math={math} className="text-[14px] text-[#cfd3e3] [&_p]:my-0">{a}</Md>
                        <div className="mt-2 flex gap-1.5 text-[11.5px]">
                          <button onClick={() => setMark((m) => ({ ...m, [i]: true }))} aria-pressed={mark[i] === true} className={cn("flex items-center gap-1 rounded-md border px-2 py-0.5", mark[i] === true ? "border-ok/60 bg-ok/10 text-ok" : "border-line text-mute hover:text-text")}><Check size={11} />Knew it</button>
                          <button onClick={() => setMark((m) => ({ ...m, [i]: false }))} aria-pressed={mark[i] === false} className={cn("flex items-center gap-1 rounded-md border px-2 py-0.5", mark[i] === false ? "border-bad/60 bg-bad/10 text-bad" : "border-line text-mute hover:text-text")}><X size={11} />Shaky</button>
                        </div>
                      </motion.div>
                    ) : (
                      <button key="b" onClick={() => setShown((s) => new Set(s).add(i))} className="mt-1.5 rounded-md border border-dashed border-line px-2.5 py-1 text-[12px] text-faint hover:border-accent/40 hover:text-mute">Show answer</button>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Where we are in a Revise run started from the tree, if this page is part of it. */
function useRun(id: string) {
  const [run, setRun] = useState<{ ids: string[]; label: string } | null>(null);
  useEffect(() => {
    try { const r = JSON.parse(sessionStorage.getItem(RUN_KEY) ?? "null"); setRun(r && r.ids.includes(id) ? r : null); } catch { setRun(null); }
  }, [id]);
  return run;
}

export function ReviseView({ t, item }: { t: Topic; item: Item }) {
  const done = useStore((s) => s.progress[item.id]?.status === "done");
  const { complete, review } = useStore.getState();
  const [showTpl, setShowTpl] = useState(false);
  const blocks = useMemo(() => parseRevise(t.revise ?? autoSheet(t)), [t]);
  const math = t.area === "ai";
  const run = useRun(t.id);
  const k = run ? run.ids.indexOf(t.id) : -1;
  const prev = run && k > 0 ? topicById.get(run.ids[k - 1]) : undefined, next = run && k < run.ids.length - 1 ? topicById.get(run.ids[k + 1]) : undefined;

  return (
    <div className="space-y-5">
      {run && (
        <div data-read-skip className="card flex flex-wrap items-center gap-3 px-4 py-2.5 text-[13px]">
          <Flag size={14} className="text-accent" /><span className="text-mute">Revising <span className="text-text">{run.label}</span> · sheet <span className="num text-text">{k + 1}/{run.ids.length}</span></span>
          <span className="ml-auto flex gap-2">
            {prev && <Link href={`/learn/${prev.id}#revise`} className="flex items-center gap-1 text-mute hover:text-text"><ArrowLeft size={13} />Previous</Link>}
            {next ? <Link href={`/learn/${next.id}#revise`} className="flex items-center gap-1 font-medium text-accent">Next: {next.title}<ArrowRight size={13} /></Link>
              : <button onClick={() => { sessionStorage.removeItem(RUN_KEY); location.hash = ""; location.reload(); }} className="font-medium text-accent">Finish the run</button>}
          </span>
        </div>
      )}

      {t.signals.length > 0 && t.revise && (
        <section className="card p-5">
          <div className="eyebrow flex items-center gap-1.5 text-accent"><Radar size={13} />Reach for it when</div>
          <ul className="mt-2 space-y-1">{t.signals.map((s) => <li key={s} className="text-[14px] leading-relaxed">• {s}</li>)}</ul>
        </section>
      )}

      {blocks.map((b, i) => {
        if (b.kind === "recall") return <Recall key={i} items={b.items} math={math} />;
        // a lone heading labels the recall group under it; anything else (tables, notes) gets a card
        const lines = b.body.split("\n").filter((l) => l.trim());
        const heads = lines.filter((l) => /^#{1,4}\s/.test(l));
        const rest = lines.filter((l) => !/^#{1,4}\s/.test(l)).join("\n");
        return (
          <div key={i} className="space-y-3">
            {heads.map((h) => <h3 key={h} className="display pt-2 text-[17px] font-semibold">{h.replace(/^#+\s*/, "")}</h3>)}
            {rest && <section className="card p-5 sm:p-6"><Md math={math} className="text-[14.5px]">{rest}</Md></section>}
          </div>
        );
      })}

      {t.template && (
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3"><div className="text-[13px] text-mute">Write the template from memory, then compare.</div><Button size="sm" onClick={() => setShowTpl((x) => !x)}>{showTpl ? "Hide" : "Reveal template"}</Button></div>
          {showTpl && <pre className="code !rounded-none !border-x-0 !border-b-0">{t.template}</pre>}
        </section>
      )}

      {t.revise && t.pitfalls.length > 0 && (
        <section className="card p-5">
          <div className="eyebrow text-warn">Traps</div>
          <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">{t.pitfalls.map((p) => <li key={p} className="rounded-lg border border-line bg-panel2 px-3 py-2 text-[13px]">{p}</li>)}</ul>
        </section>
      )}

      <div data-read-skip><RatingBar done={done} onRate={(r) => (done ? review(item, r) : complete(item, r))} /></div>
      {next && <Link data-read-skip href={`/learn/${next.id}#revise`} className="card card-hover flex items-center justify-between p-4"><span><span className="block text-[11.5px] text-faint">Next sheet</span><span className="font-semibold">{next.title}</span></span><ArrowRight size={16} className="text-accent" /></Link>}
    </div>
  );
}
