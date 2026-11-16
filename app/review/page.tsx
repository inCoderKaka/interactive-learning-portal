"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Check, Eye, RefreshCw, Shuffle, Sparkles } from "lucide-react";
import { useStore } from "@/lib/store";
import { useDue, useItems } from "@/lib/hooks";
import { RATINGS, addDays, todayISO } from "@/lib/srs";
import { aiReady, gradeRecall } from "@/lib/ai";
import { PROBLEMS, areaOf, designById, topicById } from "@/content";
import { FeedbackView, Spinner } from "@/components/Work";
import { Button, Empty, Md, PageHead, Pill, cn } from "@/components/ui";
import type { Feedback, Item, Rating } from "@/lib/types";

/** What the learner must reproduce, and the reference to compare against. */
function useCard(item: Item | undefined) {
  const custom = useStore((s) => s.custom);
  return useMemo(() => {
    if (!item) return null;
    if (item.kind === "problem") {
      const p = PROBLEMS.find((x) => x.id === item.id) ?? custom.find((x) => x.id === item.id);
      if (!p) return null;
      return {
        ask: "Without code: state the approach, why it works, and the time and space complexity.", prompt: p.statement, problem: p,
        answer: p.approaches.length ? p.approaches.map((a) => `- **${a.name}** (\`${a.time}\` time, \`${a.space}\` space): ${a.idea}`).join("\n") : "_No reference approach for this imported problem. Open it to see your own notes._",
        extra: p.twists[0] ? `**A twist to try next:** ${p.twists[0]}` : "",
      };
    }
    if (item.kind === "topic") {
      const t = topicById.get(item.topic);
      if (!t) return null;
      const cards = t.cards?.length ? t.cards : t.quiz.map((q) => [q.q, `${q.options[q.answer]}. ${q.why}`] as [string, string]);
      const c = cards[Math.floor(Math.random() * cards.length)];
      return {
        ask: "Answer from memory, then name the signals that tell you to reach for this.", prompt: c ? c[0] : `Explain ${t.title} in three sentences.`, problem: null,
        answer: `${c ? `**${c[1]}**\n\n` : ""}**Reach for it when:**\n${t.signals.map((s) => `- ${s}`).join("\n")}`,
        extra: t.pitfalls[0] ? `**Common slip:** ${t.pitfalls[0]}` : "",
      };
    }
    const d = designById.get(item.id);
    if (!d) return null;
    const s = d.steer[Math.floor(Math.random() * Math.max(1, d.steer.length))];
    return {
      ask: s ? "The interviewer pushes in this direction. What do you say?" : "Outline your answer in five bullet points.", prompt: s ? `${d.title}: ${s[0]}` : d.prompt, problem: null,
      answer: s ? s[1] : d.stages[0]?.model ?? "", extra: d.pitfalls[0] ? `**Common slip:** ${d.pitfalls[0]}` : "",
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id, custom]);
}

export default function Review() {
  const due = useDue();
  const items = useItems();
  const progress = useStore((s) => s.progress);
  const settings = useStore((s) => s.settings);
  const review = useStore((s) => s.review);
  // freeze the session queue so rating one card does not reshuffle the rest; interleave areas
  const [queue, setQueue] = useState<Item[] | null>(null);
  const [i, setI] = useState(0);
  const [shown, setShown] = useState(false);
  const [text, setText] = useState("");
  const [fb, setFb] = useState<Feedback | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [tally, setTally] = useState<Rating[]>([]);

  const cur = queue?.[i];
  const card = useCard(cur);
  const today = todayISO();
  const upcoming = useMemo(() => {
    const m = new Map<string, number>();
    for (const it of items) { const d = progress[it.id]?.due; if (d && d > today && progress[it.id].status === "done") m.set(d, (m.get(d) ?? 0) + 1); }
    return Array.from({ length: 14 }, (_, k) => { const d = addDays(today, k + 1); return { d, n: m.get(d) ?? 0 }; });
  }, [items, progress, today]);

  const start = (extra = false) => {
    let pool = due;
    if (extra) pool = items.filter((it) => progress[it.id]?.status === "done").sort((a, b) => (progress[a.id].ease ?? 2.5) - (progress[b.id].ease ?? 2.5)).slice(0, 10);
    // interleave: round-robin over areas so consecutive cards rarely share a pattern
    const by: Record<string, Item[]> = {};
    for (const it of pool) (by[it.area + it.topic] ??= []).push(it);
    const groups = Object.values(by).sort(() => Math.random() - 0.5), out: Item[] = [];
    while (groups.some((g) => g.length)) for (const g of groups) { const x = g.shift(); if (x) out.push(x); }
    setQueue(out.slice(0, 20)); setI(0); setTally([]); reset();
  };
  const reset = () => { setShown(false); setText(""); setFb(null); setErr(""); };
  const rate = (r: Rating) => { if (cur) review(cur, r); setTally((t) => [...t, r]); setI((x) => x + 1); reset(); };
  const check = async () => {
    if (!card?.problem) return;
    setBusy(true); setErr("");
    try { setFb(await gradeRecall(settings, card.problem, text)); setShown(true); }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  if (!queue) {
    const max = Math.max(1, ...upcoming.map((u) => u.n));
    return (
      <div>
        <PageHead eyebrow="Spaced review" title={due.length ? `${due.length} item${due.length > 1 ? "s" : ""} about to fade` : "Nothing due today"} sub="Each completed item returns just before you would forget it. Cards are shuffled across topics and shown without their pattern label, because in the interview nobody tells you which technique to use." />
        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <section className="card relative overflow-hidden p-7">
            <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-accent/10 blur-3xl" />
            <div className="eyebrow flex items-center gap-1.5 text-accent"><RefreshCw size={13} />Today&apos;s session</div>
            {due.length ? (
              <>
                <div className="display mt-3 text-5xl font-semibold num">{Math.min(20, due.length)}<span className="ml-2 text-lg text-mute">cards · about {Math.min(20, due.length) * 3} min</span></div>
                <p className="mt-3 max-w-md text-[14px] leading-relaxed text-mute">For each card: say the answer out loud or type it, then reveal and rate yourself honestly. Blanked items come back tomorrow; fluent ones drift further out.</p>
                <Button variant="primary" className="mt-5" onClick={() => start()}>Start review<ArrowRight size={15} /></Button>
              </>
            ) : (
              <>
                <p className="mt-3 max-w-md text-[14px] leading-relaxed text-mute">Memory is fresh. Complete lessons and problems and they will queue up here on their own schedule.</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button onClick={() => start(true)} disabled={!items.some((it) => progress[it.id]?.status === "done")}><Shuffle size={15} />Drill my 10 weakest anyway</Button>
                  <Link href="/"><Button variant="ghost">Back to today</Button></Link>
                </div>
              </>
            )}
          </section>
          <section className="card p-5">
            <div className="eyebrow">Coming back in the next 14 days</div>
            <div className="mt-4 flex h-28 items-end gap-1.5">
              {upcoming.map((u) => (
                <div key={u.d} title={`${u.d}: ${u.n} due`} className="flex h-full flex-1 flex-col justify-end gap-1">
                  <span className="num text-center text-[10px] text-faint">{u.n || ""}</span>
                  <div className="rounded-md bg-hld/70" style={{ height: `${(u.n / max) * 80}%`, minHeight: u.n ? 6 : 2, opacity: u.n ? 1 : 0.25 }} />
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[11px] text-faint"><span>tomorrow</span><span>in 2 weeks</span></div>
          </section>
        </div>
      </div>
    );
  }

  if (!cur || !card) {
    const good = tally.filter((r) => r >= 2).length;
    return (
      <Empty title={tally.length ? "Session complete" : "Nothing to review"}>
        {tally.length > 0 && <p>{good} of {tally.length} recalled solidly. {tally.length - good > 0 ? `${tally.length - good} will return within a day or two.` : "Clean session."}</p>}
        <div className="mt-5 flex justify-center gap-2"><Button onClick={() => setQueue(null)}>Done</Button><Link href="/"><Button variant="primary">Back to today</Button></Link></div>
      </Empty>
    );
  }

  const a = areaOf(cur.area);
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex items-center gap-4">
        <button onClick={() => setQueue(null)} className="text-[13px] text-mute hover:text-text">End session</button>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#1d2132]"><motion.div className="h-full rounded-full bg-accent" animate={{ width: `${(i / queue.length) * 100}%` }} /></div>
        <span className="num text-[13px] text-mute">{i + 1} / {queue.length}</span>
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={cur.id} initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.2 }} className="space-y-5">
          <section className="card p-6 sm:p-8">
            <div className="mb-3 flex items-center gap-2">
              <Pill color={a.color}>{a.short}</Pill>
              <Pill className="border-line text-mute">{cur.kind === "topic" ? "concept" : cur.kind === "design" ? "design" : "problem"}</Pill>
              {(progress[cur.id]?.lapses ?? 0) > 0 && <Pill color="var(--color-warn)">forgotten {progress[cur.id].lapses}×</Pill>}
            </div>
            {cur.kind !== "topic" && <h1 className="display text-2xl font-semibold">{cur.kind === "problem" ? cur.title : ""}</h1>}
            <p className="mt-2 text-[16px] leading-relaxed text-[#d5d8e6]">{card.prompt}</p>
            <p className="mt-4 text-[13px] font-medium text-accent">{card.ask}</p>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} disabled={shown} placeholder="Typing it forces a real attempt (optional if you say it aloud)…" aria-label="Your recall"
              className="mt-3 w-full resize-y rounded-xl border border-line bg-bg p-3.5 text-[14px] leading-relaxed outline-none focus:border-accent/60 disabled:opacity-70" />
            {!shown && (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="primary" onClick={() => setShown(true)}><Eye size={15} />Reveal answer</Button>
                {card.problem && aiReady(settings) && <Button disabled={busy || text.trim().length < 15} onClick={check}>{busy ? <Spinner label="Checking" /> : <><Sparkles size={15} />Check my recall with AI</>}</Button>}
              </div>
            )}
            {err && <p role="alert" className="mt-3 rounded-xl border border-bad/30 bg-bad/10 p-3 text-[13px] text-bad">{err}</p>}
          </section>

          {shown && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              {fb && <FeedbackView f={fb} />}
              <section className="card p-6">
                <div className="flex items-center justify-between"><div className="eyebrow text-accent">Reference</div><Link href={cur.href} className="text-[12.5px] text-mute hover:text-text">Open full item →</Link></div>
                {cur.kind !== "problem" && <div className="mt-1 text-[13px] text-faint">{cur.title}</div>}
                <Md className="mt-3 text-[14.5px]">{card.answer}</Md>
                {card.extra && <Md className="mt-4 rounded-xl border border-line bg-panel2 p-3 text-[13.5px]">{card.extra}</Md>}
              </section>
              <section className="card p-5">
                <div className="display text-[17px] font-semibold">How close were you, before you looked?</div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {RATINGS.map((r) => {
                    const sug = fb ? (fb.score >= 90 ? 3 : fb.score >= 70 ? 2 : fb.score >= 45 ? 1 : 0) === r.r : false;
                    return (
                      <button key={r.r} onClick={() => rate(r.r)} className={cn("rounded-xl border p-3 text-left transition hover:-translate-y-0.5", sug ? "border-accent/60 bg-accent/5" : "border-line bg-panel2 hover:border-[#3a4160]")}>
                        <div className="flex items-center gap-1.5 text-sm font-semibold">{r.r >= 2 && <Check size={13} className="text-ok" />}{r.label}</div>
                        <div className="text-[11.5px] text-mute">{r.hint}</div>
                      </button>
                    );
                  })}
                </div>
              </section>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
