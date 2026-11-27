"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, CircleDashed, Flag, Lock, Mic, PencilLine } from "lucide-react";
import { useStore } from "@/lib/store";
import { topicById } from "@/content";
import { CHECKPOINTS, INTERVIEWS, checkpointByPage, coverage, coursePos, isSolved, isUnlocked, missing, mockHref, questionsAt, unlockPage } from "@/lib/interviews";
import { PageHead, Pill, btnClass, cn } from "@/components/ui";
import type { Design } from "@/lib/types";

const titleOf = (page: string) => topicById.get(page)?.title ?? page;

function QuestionCard({ d, fresh, from, ck }: { d: Design; fresh?: boolean; from?: string; ck?: string }) {
  const progress = useStore((s) => s.progress);
  const cov = coverage(d, progress);
  const solved = isSolved(d, progress), open = isUnlocked(d, progress);
  const miss = missing(d, progress);
  const practise = `/design/${d.id}${from ? `?from=${encodeURIComponent(from)}` : ""}`;
  return (
    <li className="card flex flex-col gap-2 p-4">
      <div className="flex items-start gap-2">
        {solved ? <Check size={16} className="mt-0.5 shrink-0 text-ok" /> : open ? <CircleDashed size={16} className="mt-0.5 shrink-0 text-accent" /> : <Lock size={15} className="mt-0.5 shrink-0 text-faint" />}
        <div className="min-w-0 flex-1">
          <div className="text-[14.5px] font-semibold leading-snug">{d.title}</div>
          <div className="mt-0.5 text-[12px] text-faint">Unlocks after {titleOf(unlockPage(d))}{fresh && <span className="ml-1.5 font-semibold text-accent">new here</span>}</div>
        </div>
        {(progress[d.id]?.mocks ?? 0) > 0 && <Pill className="border-line text-mute">{cov.complete}/{cov.chains} paths</Pill>}
      </div>
      <p className="line-clamp-2 text-[13px] text-mute">{d.prompt}</p>
      {!open && <p className="text-[12px] text-faint">Still to cover: {miss.slice(0, 3).map(titleOf).join(", ")}{miss.length > 3 ? ` and ${miss.length - 3} more` : ""}.</p>}
      <div className="mt-auto flex flex-wrap gap-2 pt-1">
        <Link href={mockHref(d, from, ck)} className={btnClass(open ? "primary" : "soft", "sm")}><Mic size={14} />{solved ? "Explore another path" : "Mock interview"}</Link>
        <Link href={practise} className={btnClass("ghost", "sm")}><PencilLine size={14} />Practise stage by stage</Link>
      </div>
    </li>
  );
}

export default function Interviews() {
  const progress = useStore((s) => s.progress);
  const [at, setAt] = useState<string | null>(null);
  const [from, setFrom] = useState<string | undefined>(undefined);
  useEffect(() => { const q = new URLSearchParams(window.location.search); setAt(q.get("at")); setFrom(q.get("from") ?? undefined); }, []);
  const ck = at ? checkpointByPage.get(at) : undefined;

  const groups = useMemo(() => {
    const pool = ck ? questionsAt(ck) : INTERVIEWS;
    const order = (a: Design, b: Design) => coursePos(unlockPage(a)) - coursePos(unlockPage(b));
    return {
      ready: pool.filter((d) => isUnlocked(d, progress) && !isSolved(d, progress)).sort(order),
      solved: INTERVIEWS.filter((d) => isSolved(d, progress)).sort(order),
      upcoming: INTERVIEWS.filter((d) => !isUnlocked(d, progress) && !isSolved(d, progress) && !(ck && pool.includes(d))).sort(order),
      atCk: ck ? pool.filter((d) => !isUnlocked(d, progress) && !isSolved(d, progress)) : [],
    };
  }, [ck, progress]);
  const ckDone = ck && progress[ck.id]?.status === "done";
  const back = from ?? (ck ? `/learn/${ck.page}` : undefined);

  return (
    <div className="space-y-6">
      {back && <Link href={back} className="inline-flex items-center gap-1.5 text-[13px] text-mute hover:text-text"><ArrowLeft size={14} />Back to the course</Link>}
      <PageHead eyebrow="Interview practice" title={ck ? `Checkpoint: after ${titleOf(ck.page)}` : "Mock interviews along the course"}
        sub={ck ? "You've now covered everything these questions need. Pick any one and do a full mock interview with a whiteboard and an AI interviewer. Finishing one clears this checkpoint; the rest stay here for extra practice whenever you like."
          : "Each design question unlocks once you've covered every page it needs. Checkpoints in your plan ask you to do one; the rest are optional practice."}
        right={ck ? <Pill color={ckDone ? "var(--color-ok)" : "var(--color-accent)"}>{ckDone ? "Checkpoint cleared" : "Checkpoint open"}</Pill> : undefined} />

      <section>
        <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-widest text-faint">Ready for you · {groups.ready.length}</h2>
        {groups.ready.length ? <ul className="grid gap-3 md:grid-cols-2">{groups.ready.map((d) => <QuestionCard key={d.id} d={d} fresh={ck?.opens.includes(d.id)} from={from ?? (ck ? `/learn/${ck.page}` : undefined)} ck={ck?.id} />)}</ul>
          : <p className="text-[13.5px] text-mute">{groups.atCk.length ? "Mark the pages below as done to unlock these questions." : "Nothing unlocked and unsolved right now. Keep going through the course; questions appear as you finish the pages they need."}</p>}
        {groups.atCk.length > 0 && <ul className="mt-3 grid gap-3 md:grid-cols-2">{groups.atCk.map((d) => <QuestionCard key={d.id} d={d} fresh from={from} ck={ck?.id} />)}</ul>}
      </section>

      <section>
        <h2 className="mb-2 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-widest text-faint"><Flag size={13} />Checkpoints along the course</h2>
        <ol className="card divide-y divide-line/60 overflow-hidden">
          {CHECKPOINTS.map((c) => {
            const d = progress[c.id]?.status === "done";
            const reached = progress[`t-${c.page}`]?.status === "done";
            return (
              <li key={c.id} className={cn("flex items-center gap-3 px-4 py-2.5 text-[13.5px]", c.id === ck?.id && "bg-accent/[0.06]")}>
                {d ? <Check size={15} className="shrink-0 text-ok" /> : reached ? <CircleDashed size={15} className="shrink-0 text-accent" /> : <Lock size={14} className="shrink-0 text-faint" />}
                <Link href={`/interviews?at=${c.page}`} className="min-w-0 flex-1 truncate hover:text-accent">After {titleOf(c.page)}</Link>
                <span className="shrink-0 text-[12px] text-faint">{c.opens.length} new · {questionsAt(c).length} available</span>
              </li>
            );
          })}
        </ol>
      </section>

      {groups.solved.length > 0 && (
        <section>
          <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-widest text-faint">Done · {groups.solved.length}</h2>
          <ul className="grid gap-3 md:grid-cols-2">{groups.solved.map((d) => <QuestionCard key={d.id} d={d} from={from} />)}</ul>
        </section>
      )}

      {groups.upcoming.length > 0 && (
        <section>
          <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-widest text-faint">Coming up · {groups.upcoming.length}</h2>
          <ul className="grid gap-3 md:grid-cols-2">{groups.upcoming.map((d) => <QuestionCard key={d.id} d={d} from={from} />)}</ul>
        </section>
      )}
    </div>
  );
}
