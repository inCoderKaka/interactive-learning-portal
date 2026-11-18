"use client";
import { useState } from "react";
import { Check, Gauge, Lightbulb, Quote, Shuffle, UserRound } from "lucide-react";
import { Bar, Pill, cn } from "@/components/ui";
import { DECISIONS, DECISION_LABEL, DIMENSIONS, type Decision } from "@/lib/interview/core/scoring";
import { curveballById } from "@/lib/interview/core/curveballs";
import type { SessionRecord } from "@/lib/interview/results";
import { calibrationGap } from "@/lib/interview/results";

const COLOR = (d: Decision) => (DECISIONS.indexOf(d) >= 4 ? "var(--color-ok)" : DECISIONS.indexOf(d) === 3 ? "var(--color-warn)" : "var(--color-bad)");
const TONE_LABEL = { guide: "Friendly guide", neutral: "Neutral", tough: "Tough", notetaker: "Quiet note-taker" } as const;

export function PredictDecision({ onPick }: { onPick: (d: Decision | undefined) => void }) {
  return (
    <div className="card p-5">
      <div className="display text-[17px] font-semibold">Before you see the feedback: what would the committee decide?</div>
      <p className="mt-1 text-[13px] text-mute">Your guess is compared with the scorecard. Over time this shows whether you read your own performance accurately.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {DECISIONS.map((d) => <button key={d} onClick={() => onPick(d)} className="rounded-xl border border-line bg-panel2 px-3 py-2 text-[13px] font-medium hover:border-accent/50">{DECISION_LABEL[d]}</button>)}
        <button onClick={() => onPick(undefined)} className="px-3 py-2 text-[13px] text-faint hover:text-mute">Skip</button>
      </div>
    </div>
  );
}

export function ScorecardView({ r }: { r: SessionRecord }) {
  const c = r.scorecard!;
  const [open, setOpen] = useState<number | null>(null);
  const dims = DIMENSIONS[r.cfg.kind];
  const color = COLOR(c.decision);
  const gap = calibrationGap(r.predicted, c.decision);
  const st = r.stats;
  const turnText = (seq: number) => {
    const e = r.log.find((x) => x.seq === seq)?.e;
    return e && (e.type === "turn.candidate" || e.type === "turn.interviewer") ? e.text : "";
  };
  return (
    <div className="card animate-rise overflow-hidden" aria-live="polite">
      <div className="flex flex-wrap items-center gap-4 border-b border-line px-5 py-4" style={{ background: `color-mix(in srgb, ${color} 7%, transparent)` }}>
        <div className="min-w-0 flex-1">
          <div className="eyebrow">Hiring-committee packet · {r.question.title}{r.picked && " · practice pick"}</div>
          <div className="display mt-1 text-2xl font-semibold" style={{ color }}>{DECISION_LABEL[c.decision]}</div>
          <p className="mt-1 text-[13.5px] leading-relaxed text-[#d5d8e6]">{c.summary}</p>
        </div>
        <div className="text-right text-[12.5px] text-mute">
          {c.level && <div>Supports <b className="text-text">{c.level}</b> (bar {r.cfg.level})</div>}
          <div>{c.samples > 1 ? `Median of ${c.samples} independent reviews` : "One review"}</div>
        </div>
      </div>
      <div className="space-y-6 p-5">
        <div className="flex flex-wrap gap-2 text-[12.5px]">
          <Pill className="border-line text-mute"><UserRound size={12} />{r.persona.name}, {r.persona.role} (fictional)</Pill>
          <Pill className="border-line text-mute">Tone: {TONE_LABEL[r.tone]}{r.cfg.tone === "surprise" && " (drawn at random)"}</Pill>
          {r.question.source === "ai-generated" && <Pill color="var(--color-hld)"><Shuffle size={12} />out-of-curriculum question</Pill>}
        </div>

        {gap !== null && (
          <div className={cn("flex items-start gap-2.5 rounded-xl border p-3 text-[13px]", gap === 0 ? "border-ok/30 bg-ok/5 text-ok" : "border-hld/30 bg-hld/5 text-[#cfe0ff]")}>
            <Gauge size={16} className="mt-0.5 shrink-0" />
            <span>You predicted <b>{DECISION_LABEL[r.predicted!]}</b>. {gap === 0 ? "Exactly right: you read the room well." : gap > 0 ? `You rated yourself ${gap} step${gap > 1 ? "s" : ""} higher than the committee. Candidates who overrate themselves stop preparing too early.` : `You rated yourself ${-gap} step${gap < -1 ? "s" : ""} lower than the committee. You are doing better than you think.`}</span>
          </div>
        )}

        <div className="space-y-3">
          {c.ratings.map((rt, i) => {
            const d = dims.find((x) => x.key === rt.dimension);
            return (
              <div key={rt.dimension} className="rounded-xl border border-line bg-panel2 p-3.5">
                <button className="w-full text-left" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
                  <div className="mb-1.5 flex justify-between text-[13px]"><span className="font-semibold">{d?.label ?? rt.dimension}</span><span className="num font-semibold">{rt.score}/4</span></div>
                  <Bar value={rt.score / 4} color={rt.score >= 3 ? "var(--color-ok)" : rt.score >= 2 ? "var(--color-warn)" : "var(--color-bad)"} />
                  <p className="mt-2 text-[13px] leading-relaxed text-mute">{rt.note}</p>
                </button>
                {open === i && rt.evidence.length > 0 && (
                  <ul className="mt-2 space-y-1.5">{rt.evidence.map((ev, j) => (
                    <li key={j} className="flex gap-2 text-[12.5px] leading-relaxed"><Quote size={12} className="mt-1 shrink-0 text-faint" /><span><span className="text-faint">#{ev.seq}</span> “{ev.quote || turnText(ev.seq).slice(0, 200)}”</span></li>
                  ))}</ul>
                )}
                {open !== i && rt.evidence.length > 0 && <div className="mt-1.5 text-[11.5px] text-faint">{rt.evidence.length} piece{rt.evidence.length > 1 ? "s" : ""} of evidence: click to see</div>}
              </div>
            );
          })}
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {c.strengths.length > 0 && <div><div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wider text-ok"><Check size={13} />What worked</div><ul className="space-y-1.5 text-[13.5px] leading-relaxed">{c.strengths.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
          {c.improvements.length > 0 && <div><div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wider text-hld"><Lightbulb size={13} />Do this next time</div><ul className="space-y-1.5 text-[13.5px] leading-relaxed">{c.improvements.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
        </div>
        {(c.curveballs.length > 0 || r.hints > 0) && (
          <div className="space-y-1.5 text-[13px] text-mute">
            {c.curveballs.map((x, i) => <p key={i}><b className="text-text">Curveball:</b> {x}</p>)}
            {r.hints > 0 && <p><b className="text-text">Hints ({r.hints}):</b> {c.hintsNote}</p>}
          </div>
        )}

        <div>
          <div className="eyebrow mb-2">Delivery</div>
          <div className="grid grid-cols-2 gap-2 text-[12.5px] sm:grid-cols-4">
            {[
              ["You talked", `${Math.round(st.talkShare * 100)}% of words`],
              ["Longest silence", `${st.longestSilenceS} s`],
              ["Filler words", `${st.fillersPerMin}/min`],
              ["First clarifying question", st.firstClarifyS === null ? "none asked" : `after ${st.firstClarifyS} s`],
              ["Interviewer cut in", `${st.interventions}×`],
              ["You cut in", `${st.interruptionsByCandidate}×`],
              ["Curveballs", `${st.curveballs}`],
              ["Length", `${Math.round(st.minutes)} min`],
            ].map(([k, val]) => <div key={k} className="rounded-xl border border-line bg-panel2 p-2.5"><div className="text-faint">{k}</div><div className="num mt-0.5 font-semibold">{val}</div></div>)}
          </div>
        </div>
        {r.log.some((x) => x.e.type === "curveball.fired") && <p className="text-[12px] text-faint">Curveballs used: {r.log.flatMap((x) => (x.e.type === "curveball.fired" ? [curveballById.get(x.e.id)?.label ?? x.e.id] : [])).join(", ")}.</p>}
        <p className="text-[11.5px] text-faint">AI feedback is a second opinion, not a hiring decision. Check each rating against the quoted evidence.</p>
      </div>
    </div>
  );
}
