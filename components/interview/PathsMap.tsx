"use client";
import { useState } from "react";
import { Check, ChevronRight, CircleDashed, GitBranch, Lock } from "lucide-react";
import type { Design, PathNode, Progress } from "@/lib/types";
import { coverage } from "@/lib/interviews";
import { cn } from "../ui";

const KIND: Record<PathNode["kind"], { label: string; color: string }> = {
  deep: { label: "Deep dive", color: "var(--color-hld)" },
  variation: { label: "Variation", color: "var(--color-ai)" },
  failure: { label: "Failure", color: "var(--color-warn)" },
};

function Branch({ n, depth, covered, recent, open, toggle }: { n: PathNode; depth: number; covered: Set<string>; recent?: Set<string>; open: Set<string>; toggle: (id: string) => void }) {
  const isOpen = open.has(n.id), c = covered.has(n.id), fresh = recent?.has(n.id);
  return (
    <li>
      <div className={cn("flex items-start gap-2 rounded-lg px-2 py-1.5", fresh && "bg-accent/[0.07]")} style={{ marginLeft: depth * 16 }}>
        {n.children?.length ? <button onClick={() => toggle(n.id)} aria-label={isOpen ? "Collapse" : "Expand"} aria-expanded={isOpen} className="mt-0.5 text-faint hover:text-text"><ChevronRight size={14} className={cn("transition", isOpen && "rotate-90")} /></button> : <span className="w-3.5 shrink-0" />}
        {c ? <Check size={14} className="mt-0.5 shrink-0 text-ok" /> : <CircleDashed size={14} className="mt-0.5 shrink-0 text-faint" />}
        <span className="min-w-0">
          {depth === 0 && <span className="mr-1.5 text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: KIND[n.kind].color }}>{KIND[n.kind].label}</span>}
          <span className={cn("text-[13.5px]", c ? "text-text" : "text-mute")}>{n.label}</span>
          {fresh && <span className="ml-1.5 text-[10.5px] font-semibold text-accent">this round</span>}
          {c && <span className="mt-0.5 block text-[12px] text-faint">A strong answer covers: {n.expect}</span>}
        </span>
      </div>
      {isOpen && n.children && <ul>{n.children.map((k) => <Branch key={k.id} n={k} depth={depth + 1} covered={covered} recent={recent} open={open} toggle={toggle} />)}</ul>}
    </li>
  );
}

/**
 * Every direction the interviewer can steer this question into, as a tree. Covered nodes are ticked; a path is
 * complete when every node from the top down to a leaf has been covered in some mock. Hidden until the first
 * attempt, so the interviewer can still surprise the learner.
 */
export function PathsMap({ d, progress, attempted, recent }: { d: Design; progress: Record<string, Progress>; attempted: boolean; recent?: Set<string> }) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  if (!d.paths?.length) return null;
  const cov = coverage(d, progress);
  const toggle = (id: string) => setOpen((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  return (
    <section className="card p-5" data-read-block>
      <div className="eyebrow flex items-center gap-1.5 text-hld"><GitBranch size={13} />Where this interview can go</div>
      {!attempted ? (
        <p className="mt-2 flex items-start gap-2 text-[13.5px] text-mute"><Lock size={14} className="mt-0.5 shrink-0" />{cov.chains} different paths across {d.paths.length} directions. The map stays hidden until you&apos;ve done a mock on this question, so the interviewer can still surprise you.</p>
      ) : (
        <>
          <p className="mt-1.5 text-[13px] text-mute">{cov.complete} of {cov.chains} paths explored end to end; {cov.done} of {cov.nodes} questions covered. {cov.complete < cov.chains ? "Your next mock on this question will steer into an unexplored one." : "Every path explored."} Open a branch to see its follow-ups; ticked ones show what a strong answer covers.</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#1d2132]"><div className="h-full rounded-full bg-ok/80" style={{ width: `${(cov.complete / Math.max(1, cov.chains)) * 100}%` }} /></div>
          <ul className="mt-3 space-y-0.5">{d.paths.map((n) => <Branch key={n.id} n={n} depth={0} covered={cov.covered} recent={recent} open={open} toggle={toggle} />)}</ul>
        </>
      )}
    </section>
  );
}
