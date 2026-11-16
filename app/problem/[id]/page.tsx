"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Check, ExternalLink, Eye, EyeOff, HelpCircle, Lightbulb, MessageSquareText, NotebookPen, Shuffle, Sparkles, TimerReset } from "lucide-react";
import { useStore } from "@/lib/store";
import { RefLink } from "@/components/References";
import { useItems, useProblem, useStopwatch, useTrackTime } from "@/lib/hooks";
import { aiReady, generateTwists, hint as aiHint, reviewCode } from "@/lib/ai";
import { areaOf, lcLink, topicById } from "@/content";
import { CodeEditor, ConfidencePick, FeedbackView, LANGS, NeedAI, RatingBar, Spinner } from "@/components/Work";
import { Button, DIFF, Empty, Pill, Tabs, cn, fmtClock } from "@/components/ui";
import type { Feedback, Settings } from "@/lib/types";

const STARTER: Record<Settings["lang"], string> = {
  cpp: "// Write your solution as you would on a shared doc: no compiler, no autocomplete.\nclass Solution {\npublic:\n    \n};\n",
  java: "// Write your solution as you would on a shared doc: no compiler, no autocomplete.\nclass Solution {\n    \n}\n",
  python: "# Write your solution as you would on a shared doc: no interpreter, no autocomplete.\nclass Solution:\n    pass\n",
  javascript: "// Write your solution as you would on a shared doc: no runtime, no autocomplete.\nfunction solve() {\n  \n}\n",
};
const LIMIT = 45 * 60;

function Reveal({ items, label, icon: Icon, color, oneByOne }: { items: string[]; label: string; icon: typeof Eye; color: string; oneByOne?: boolean }) {
  const [n, setN] = useState(0);
  if (!items.length) return <p className="text-[13.5px] text-faint">Nothing here yet. Use “Generate more with AI” below.</p>;
  const shown = oneByOne ? items.slice(0, n) : n ? items : [];
  return (
    <div>
      <ul className="space-y-2">
        <AnimatePresence initial={false}>
          {shown.map((x, i) => (
            <motion.li key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2.5 rounded-xl border border-line bg-panel2 px-3.5 py-2.5 text-[14px] leading-relaxed">
              <Icon size={15} className="mt-1 shrink-0" style={{ color }} />{x}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      {shown.length < items.length && <Button size="sm" className="mt-2.5" onClick={() => setN((x) => x + 1)}><Eye size={14} />{oneByOne ? (n ? `Next ${label} (${n}/${items.length})` : `Show first ${label}`) : `Reveal ${items.length} ${label}s`}</Button>}
    </div>
  );
}

function LcLink({ lc }: { lc: number }) {
  const { url, premium } = lcLink(lc);
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" title={premium ? "Needs a LeetCode Premium subscription" : undefined} className="ml-auto flex items-center gap-1.5 text-[12px] text-faint hover:text-mute">
      LeetCode {lc}{premium && <span className="rounded border border-warn/40 px-1 text-[10px] text-warn">Premium</span>}<ExternalLink size={11} />
    </a>
  );
}

export default function ProblemPage() {
  const { id } = useParams<{ id: string }>();
  const p = useProblem(id);
  const items = useItems();
  const item = useMemo(() => items.find((i) => i.id === id), [items, id]);
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);
  const prog = useStore((s) => s.progress[id]);
  const note = useStore((s) => s.notes[id]?.body ?? "");
  const extra = useStore((s) => s.notes[`${id}:gen`]?.body);
  const { setNote, patch, complete, addAttempt } = useStore.getState();
  const lastAttempt = useStore((s) => s.attempts.find((a) => a.item === id && a.kind === "code"));

  const [tab, setTab] = useState<"clarify" | "hints" | "approaches" | "twists" | "notes">("clarify");
  const [code, setCode] = useState("");
  const [explain, setExplain] = useState("");
  const [conf, setConf] = useState<number | undefined>();
  const [fb, setFb] = useState<Feedback | null>(null);
  const [busy, setBusy] = useState<"" | "review" | "hint" | "gen">("");
  const [err, setErr] = useState("");
  const [aiHints, setAiHints] = useState<string[]>([]);
  const [showApproaches, setShowApproaches] = useState(false);
  const [sec, setSec] = useStopwatch(true);
  const [noteDraft, setNoteDraft] = useState<string | null>(null);
  useTrackTime();

  useEffect(() => {
    setCode(lastAttempt?.input?.split("\n/* EXPLANATION */\n")[0] ?? STARTER[settings.lang]);
    setFb(null); setConf(undefined); setAiHints([]); setShowApproaches(false); setSec(0); setErr(""); setNoteDraft(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!p || !item) return <Empty title="Problem not found">It may be an imported problem that has not synced to this device yet. <Link href="/learn" className="text-accent underline">Back to the map</Link></Empty>;
  const gen = extra ? (JSON.parse(extra) as { clarify: string[]; twists: string[]; followUps: string[] }) : null;
  const topic = topicById.get(p.topic);
  const ready = aiReady(settings);
  const untouched = code.trim() === STARTER[settings.lang].trim() || code.trim().length < 20;
  const over = sec > LIMIT;

  const run = async (kind: "review" | "hint" | "gen") => {
    setBusy(kind); setErr("");
    try {
      if (kind === "review") {
        const f = await reviewCode(settings, p, code, settings.lang, explain);
        setFb(f);
        addAttempt(id, "code", `${code}\n/* EXPLANATION */\n${explain}`, f);
        patch(id, { score: f.score, conf, time: (prog?.time ?? 0) + sec, status: prog?.status === "done" ? "done" : "doing" });
      } else if (kind === "hint") {
        const h = await aiHint(settings, p, untouched ? "" : code, [...p.hints, ...aiHints]);
        setAiHints((x) => [...x, h.trim()]);
      } else {
        const g = await generateTwists(settings, p.title, p.statement, [...p.twists, ...p.followUps, ...(gen?.twists ?? [])]);
        setNote(`${id}:gen`, JSON.stringify({ clarify: [...(gen?.clarify ?? []), ...(g.clarify ?? [])], twists: [...(gen?.twists ?? []), ...(g.twists ?? [])], followUps: [...(gen?.followUps ?? []), ...(g.followUps ?? [])] }));
        setTab("twists");
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={settings.blind ? "/learn" : `/learn/${p.topic}`} className="inline-flex items-center gap-1.5 text-[13px] text-mute hover:text-text"><ArrowLeft size={14} />{settings.blind ? "Curriculum" : topic?.title}</Link>
        <div className="flex items-center gap-2">
          <button onClick={() => setSettings({ blind: !settings.blind })} aria-pressed={settings.blind} title="Blind mode hides the topic so you must recognise the pattern yourself" className={cn("flex h-9 items-center gap-1.5 rounded-xl border px-3 text-[13px] font-medium", settings.blind ? "border-craft/50 bg-craft/10 text-craft" : "border-line text-mute hover:text-text")}>{settings.blind ? <EyeOff size={14} /> : <Eye size={14} />}Blind mode</button>
          <div className={cn("num flex h-9 items-center gap-2 rounded-xl border px-3 font-mono text-[13px]", over ? "border-bad/50 bg-bad/10 text-bad" : sec > LIMIT * 0.75 ? "border-warn/50 text-warn" : "border-line text-mute")} title="A real round is 45 minutes">
            <TimerReset size={14} />{fmtClock(sec)}<span className="text-faint">/ 45:00</span>
            <button onClick={() => setSec(0)} className="text-faint hover:text-text" aria-label="Reset timer">↺</button>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        {/* left: the question */}
        <div className="min-w-0 space-y-5">
          <section className="card p-6">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Pill color={DIFF[p.diff].color}>{DIFF[p.diff].label}</Pill>
              {!settings.blind && topic && <Pill color={areaOf("dsa").color}>{topic.title}</Pill>}
              {p.tier === 1 && <Pill className="border-line text-mute">Core</Pill>}
              {p.custom && <Pill className="border-line text-mute">From your notes</Pill>}
              {prog?.status === "done" && <Pill color="var(--color-ok)"><Check size={12} />Done</Pill>}
              {p.lc && <LcLink lc={p.lc} />}
            </div>
            <h1 className="display text-2xl font-semibold sm:text-3xl">{p.title}</h1>
            <p className="mt-3 text-[15.5px] leading-relaxed text-[#d5d8e6]">{p.statement}</p>
            <p className="mt-4 rounded-xl border border-line bg-bg/60 p-3 text-[12.5px] leading-relaxed text-mute">This statement is underspecified on purpose, as it would be in the room. Start by asking the clarifying questions <i>you</i> think matter, then compare with the list below.</p>
          </section>

          <section className="card p-5">
            <Tabs value={tab} onChange={setTab} tabs={[
              { id: "clarify", label: "Clarify" }, { id: "hints", label: "Hints" }, { id: "approaches", label: "Approaches" },
              { id: "twists", label: "Twists & follow-ups" }, { id: "notes", label: <span className="flex items-center gap-1">Notes{note && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}</span> },
            ]} />
            <div className="mt-4">
              {tab === "clarify" && <><p className="mb-3 text-[13px] text-mute">Write your own questions first. Then reveal what a strong candidate asks.</p><Reveal items={[...p.clarify, ...(gen?.clarify ?? [])]} label="question" icon={HelpCircle} color="var(--color-hld)" /></>}
              {tab === "hints" && (
                <>
                  <p className="mb-3 text-[13px] text-mute">Hints come one at a time, smallest nudge first. Each one you take is worth noting when you rate yourself.</p>
                  <Reveal items={[...p.hints, ...aiHints]} label="hint" icon={Lightbulb} color="var(--color-warn)" oneByOne />
                  {ready && <Button size="sm" variant="ghost" className="mt-2" disabled={!!busy} onClick={() => run("hint")}>{busy === "hint" ? <Spinner label="Thinking" /> : <><Sparkles size={14} />Ask for a nudge based on my code</>}</Button>}
                </>
              )}
              {tab === "approaches" && (
                p.approaches.length === 0 ? <p className="text-[13.5px] text-faint">No reference approaches for imported problems. Your own notes are under Notes; the AI reviewer can still check your code.</p> :
                !showApproaches ? (
                  <div className="rounded-xl border border-dashed border-line p-5 text-center">
                    <p className="text-[13.5px] text-mute">{p.approaches.length} approach{p.approaches.length > 1 ? "es" : ""} hidden. Seeing them before you try turns recall into recognition, and recognition does not survive an interview.</p>
                    <Button size="sm" className="mt-3" onClick={() => setShowApproaches(true)}><Eye size={14} />I have tried: show approaches</Button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {p.approaches.map((a, i) => (
                      <motion.div key={a.name} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="rounded-xl border border-line bg-panel2 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-semibold">{a.name}</span><span className="flex gap-1.5 font-mono text-[11.5px]"><span className="rounded-md border border-line px-1.5 py-0.5 text-dsa">{a.time}</span><span className="rounded-md border border-line px-1.5 py-0.5 text-mute">{a.space} space</span></span></div>
                        <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#cfd3e3]">{a.idea}</p>
                      </motion.div>
                    ))}
                    {p.video && <RefLink r={p.video} />}
                    {p.approaches.length > 1 && <p className="text-[12.5px] text-mute">Bias check: can you say when each alternative is the <i>better</i> choice? Interviewers ask “why not the other one?”</p>}
                  </div>
                )
              )}
              {tab === "twists" && (
                <div className="space-y-5">
                  <div><div className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wider text-craft"><Shuffle size={13} />How the interviewer departs from LeetCode</div><Reveal items={[...p.twists, ...(gen?.twists ?? [])]} label="twist" icon={Shuffle} color="var(--color-craft)" oneByOne /></div>
                  <div><div className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wider text-accent"><MessageSquareText size={13} />Follow-up questions</div><Reveal items={[...p.followUps, ...(gen?.followUps ?? [])]} label="follow-up" icon={MessageSquareText} color="var(--color-accent)" oneByOne /></div>
                  {ready ? <Button size="sm" disabled={!!busy} onClick={() => run("gen")}>{busy === "gen" ? <Spinner label="Generating" /> : <><Sparkles size={14} />Generate more with AI</>}</Button> : <NeedAI />}
                </div>
              )}
              {tab === "notes" && (
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-[13px] text-mute"><NotebookPen size={14} />Private to your account. Imported practice notes appear here.</p>
                  <textarea value={noteDraft ?? note} onChange={(e) => setNoteDraft(e.target.value)} onBlur={() => noteDraft !== null && noteDraft !== note && setNote(id, noteDraft)} placeholder="Key insight, the bug you made, what you would say differently next time…" aria-label="Notes"
                    className="h-72 w-full resize-y rounded-xl border border-line bg-bg p-3.5 font-mono text-[12.5px] leading-relaxed outline-none focus:border-accent/60" />
                  <div className="mt-1 text-[11.5px] text-faint">Saved when you click away.</div>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* right: the work */}
        <div className="min-w-0 space-y-5">
          <section className="card space-y-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <ConfidencePick value={conf} onChange={setConf} />
              <select value={settings.lang} aria-label="Language" onChange={(e) => { const l = e.target.value as Settings["lang"]; if (untouched) setCode(STARTER[l]); setSettings({ lang: l }); }} className="h-9 rounded-xl border border-line bg-panel2 px-2.5 text-[13px] outline-none">
                {LANGS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
              </select>
            </div>
            <CodeEditor value={code} onChange={setCode} lang={settings.lang} minHeight="380px" />
            <label className="block">
              <span className="mb-1.5 block text-[13px] text-mute">Explain your approach and complexity, as you would say it aloud (it is part of the score)</span>
              <textarea value={explain} onChange={(e) => setExplain(e.target.value)} rows={3} placeholder="I keep a window [l, r] with at most k distinct… Time O(n) because each pointer only moves forward; space O(k)." className="w-full resize-y rounded-xl border border-line bg-bg p-3 text-[13.5px] leading-relaxed outline-none focus:border-accent/60" />
            </label>
            {ready ? (
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary" disabled={!!busy || untouched} onClick={() => run("review")}>{busy === "review" ? <Spinner label="Reviewing your code" /> : <><Sparkles size={15} />Verify with AI</>}</Button>
                <span className="text-[12px] text-faint">{untouched ? "Write a solution first." : `Reviewed by ${settings.provider === "local" ? "local-server" : settings.provider} · ${settings[`${settings.provider}Model` as "geminiModel"]}`}</span>
              </div>
            ) : <NeedAI />}
            {err && <p role="alert" className="rounded-xl border border-bad/30 bg-bad/10 p-3 text-[13px] text-bad">The review did not complete: {err}</p>}
          </section>

          {fb && <FeedbackView f={fb} predicted={conf} />}
          {!fb && lastAttempt?.feedback && <details className="card p-4 text-[13px] text-mute"><summary className="cursor-pointer font-medium text-text">Previous review · score {lastAttempt.feedback.score} · {new Date(lastAttempt.at).toLocaleDateString()}</summary><div className="mt-3"><FeedbackView f={lastAttempt.feedback} /></div></details>}

          <RatingBar done={prog?.status === "done"} suggested={fb ? (fb.score >= 90 ? 3 : fb.score >= 70 ? 2 : fb.score >= 45 ? 1 : 0) : undefined}
            onRate={(r) => complete(item, r, { conf, time: (prog?.time ?? 0) + sec, ...(fb ? { score: fb.score } : {}) })} />
        </div>
      </div>
    </div>
  );
}
