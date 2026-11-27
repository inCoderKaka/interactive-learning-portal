"use client";
import Link from "next/link";
import { Check, Flag, Mic } from "lucide-react";
import { useStore } from "@/lib/store";
import { checkpointByPage, interviewById, isSolved, isUnlocked, missing, questionsAt } from "@/lib/interviews";
import { btnClass } from "../ui";

/** End of a lesson page that completes the prerequisites of new interview questions: invite a mock interview. */
export function CheckpointCard({ page }: { page: string }) {
  const progress = useStore((s) => s.progress);
  const ck = checkpointByPage.get(page);
  if (!ck) return null;
  const done = progress[ck.id]?.status === "done";
  const fresh = ck.opens.map((id) => interviewById.get(id)!);
  const others = questionsAt(ck).filter((d) => !ck.opens.includes(d.id) && isUnlocked(d, progress) && !isSolved(d, progress));
  const blocked = fresh.filter((d) => !isUnlocked(d, progress));
  const href = `/interviews?at=${page}&from=${encodeURIComponent(`/learn/${page}`)}`;
  return (
    <section className="card overflow-hidden border-accent/30" data-read-block data-read-text={`Interview checkpoint. You can now be interviewed on ${fresh.map((d) => d.title).join(", ")}.`}>
      <div className="flex flex-wrap items-start gap-4 p-5">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-accent/40 text-accent">{done ? <Check size={19} /> : <Flag size={19} />}</span>
        <div className="min-w-0 flex-1">
          <div className="eyebrow text-accent">Interview checkpoint{done ? " · cleared" : ""}</div>
          <div className="display mt-0.5 text-[17px] font-semibold">You can now be interviewed on {fresh.length === 1 ? "a new question" : `${fresh.length} new questions`}</div>
          <ul className="mt-2 space-y-1 text-[13.5px]">{fresh.map((d) => <li key={d.id} className="flex items-center gap-2">{isSolved(d, progress) ? <Check size={13} className="text-ok" /> : <span className="h-1.5 w-1.5 rounded-full bg-accent" />}{d.title}</li>)}</ul>
          <p className="mt-2 text-[13px] text-mute">
            {done ? "You've done a mock for this checkpoint. Come back any time to practise the others." : "Pick any one and do a full mock interview with a whiteboard and an AI interviewer, the way the real round works. One is enough to clear the checkpoint."}
            {others.length > 0 && ` ${others.length} earlier question${others.length > 1 ? "s are" : " is"} also waiting.`}
            {blocked.length > 0 && ` First mark ${missing(blocked[0], progress).length} remaining page${missing(blocked[0], progress).length > 1 ? "s" : ""} it needs as done.`}
          </p>
        </div>
        <Link href={href} className={btnClass(done ? "soft" : "primary", "md", "shrink-0")}><Mic size={15} />{done ? "See interviews" : "Choose an interview"}</Link>
      </div>
    </section>
  );
}
