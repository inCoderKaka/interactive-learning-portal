"use client";
import { useEffect, useMemo, useState } from "react";
import { Boxes, Code2, Compass, MessagesSquare, Network, Save, Shuffle, Sparkles, Target, Trash2 } from "lucide-react";
import { TOPICS } from "@/content";
import { Button, Pill, cn } from "@/components/ui";
import { NeedAI } from "@/components/Work";
import type { Attempt, Item, Problem, Progress, Settings } from "@/lib/types";
import { CURVEBALLS } from "@/lib/interview/core/curveballs";
import type { CurveballId, EngineId, Kind, Level, PoolFilter, Pressure, SessionConfig, Tone } from "@/lib/interview/core/types";
import { recommendMocks, type MockRecommendation } from "@/lib/interview/core/recommender";
import { allQuestions, filterPool } from "@/lib/interview/questions";
import { ENGINE_INFO, engineFor, estimateCostUsd, recommendedEngine } from "@/lib/interview/engines/registry";
import { getAi, providerReady } from "@/lib/interview/tasks";
import { affordableEngine, checkBudget } from "@/lib/interview/core/usage";
import { spendThisMonth } from "@/lib/interview/meter";
import { RoundRecorder } from "@/lib/interview/recorder";
import { useStore } from "@/lib/store";
import { cloudEnabled } from "@/lib/supabase";

export const KINDS: { id: Kind; label: string; desc: string; min: number; icon: typeof Code2; color: string }[] = [
  { id: "coding", label: "Coding", desc: "One problem, then a twist. Clarify, code on a plain doc, analyse.", min: 45, icon: Code2, color: "var(--color-dsa)" },
  { id: "hld", label: "System design", desc: "An open-ended system on a whiteboard. You drive: requirements, numbers, design, deep dives.", min: 45, icon: Network, color: "var(--color-hld)" },
  { id: "lld", label: "Object-oriented design", desc: "Model a small system with classes on the whiteboard, then extend it.", min: 40, icon: Boxes, color: "var(--color-lld)" },
  { id: "behavioral", label: "Googleyness", desc: "Behavioural questions with follow-ups that probe your actual role.", min: 30, icon: MessagesSquare, color: "var(--color-craft)" },
];

const TONES: { id: Tone | "surprise"; label: string; desc: string }[] = [
  { id: "neutral", label: "Neutral", desc: "The Google norm: you can't tell how it's going" },
  { id: "guide", label: "Friendly guide", desc: "Warmer, nudges a little sooner" },
  { id: "tough", label: "Tough", desc: "Challenges every vague claim" },
  { id: "notetaker", label: "Quiet note-taker", desc: "Says little; long silences" },
  { id: "surprise", label: "Surprise me", desc: "Drawn at random, revealed on the scorecard" },
];
const LEVELS: Level[] = ["L3", "L4", "L5", "L6"];
const PRESSURES: { id: Pressure; label: string; desc: string }[] = [
  { id: "relaxed", label: "Relaxed", desc: "Long silences are fine; one time call" },
  { id: "realistic", label: "Realistic", desc: "Nudges after ~45 s; time calls at 10 and 5 min" },
  { id: "high", label: "High", desc: "Short fuse, frequent time calls, moves you on" },
];

const BASE = (kind: Kind, engine: EngineId): SessionConfig => ({
  kind, selection: { mode: "random-all", preferUnseen: true }, tone: "neutral", level: "L4", minutes: KINDS.find((k) => k.id === kind)!.min,
  arc: { intro: true, aboutYou: kind !== "behavioral", curveball: true, questionsForMe: true }, pressure: "realistic",
  curveballs: { frequency: "occasional", disabled: [] }, engine, voice: { rate: 1, captions: true }, mode: "real", plainDoc: true, seed: 0,
  record: { audio: false, cloud: false }, format: "standard", layout: "desk",
});

export { BASE as baseConfig };

/** Budget-aware engine choice at start (MI-X-5): the chosen engine, or the first cheaper one that fits. */
export function engineWithinBudget(cfg: SessionConfig, settings: Settings): { engine: EngineId; note: string } {
  const ai = getAi(settings);
  const order: EngineId[] = cfg.engine === "realtime" ? ["realtime", "ascent-voice", "text"] : cfg.engine === "ascent-voice" ? ["ascent-voice", "text"] : [cfg.engine];
  const usable = order.filter((e) => e === cfg.engine || !engineFor(e, settings).unavailable(settings));
  const pick = affordableEngine(usable, ai.budgets, spendThisMonth(), (e) => estimateCostUsd(e, cfg.minutes, settings).high);
  if (!ai.costGuard.enforce || !pick.skipped.length) return { engine: cfg.engine, note: "" };
  const engine = pick.engine ?? usable[usable.length - 1];
  return { engine, note: `Your ${pick.skipped[0].check.scope === "total" ? "monthly AI" : ENGINE_INFO[cfg.engine].label} budget would be exceeded, so this round uses ${ENGINE_INFO[engine].label}.` };
}

const BUILTIN: { name: string; make: (e: EngineId) => SessionConfig }[] = [
  { name: "Google L4 coding", make: (e) => BASE("coding", e) },
  { name: "Google L5 system design", make: (e) => ({ ...BASE("hld", e), level: "L5" }) },
  { name: "Gentle warm-up", make: (e) => ({ ...BASE("coding", e), minutes: 25, tone: "guide", pressure: "relaxed", arc: { intro: true, aboutYou: false, curveball: false, questionsForMe: false }, plainDoc: false }) },
  { name: "Stress test", make: (e) => ({ ...BASE("hld", e), tone: "tough", pressure: "high", level: "L5", curveballs: { frequency: "frequent", disabled: [] } }) },
];

const PRESET_KEY = "ascent:mock-presets:v1";
type Saved = { name: string; cfg: SessionConfig };
const loadSaved = (): Saved[] => { try { return JSON.parse(localStorage.getItem(PRESET_KEY) || "[]"); } catch { return []; } };
const storeSaved = (s: Saved[]) => { try { localStorage.setItem(PRESET_KEY, JSON.stringify(s)); } catch { /* private mode */ } };

const AREA: Record<Kind, string> = { coding: "dsa", hld: "hld", lld: "lld", behavioral: "craft" };

function Chip({ on, onClick, children, title }: { on: boolean; onClick: () => void; children: React.ReactNode; title?: string }) {
  return <button type="button" title={title} aria-pressed={on} onClick={onClick} className={cn("rounded-full border px-3 py-1 text-[12.5px] font-medium transition", on ? "border-accent/60 bg-accent/10 text-accent" : "border-line text-mute hover:text-text")}>{children}</button>;
}
function Group({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2"><div className="eyebrow">{label}</div>{hint && <span className="text-[11.5px] text-faint">{hint}</span>}</div>
      {children}
    </div>
  );
}

export function Setup({ settings, progress, custom, attempts, items, initial, onStart, busy }: {
  settings: Settings; progress: Record<string, Progress>; custom: Problem[]; attempts: Attempt[]; items: Item[];
  initial?: Partial<SessionConfig>; onStart: (cfg: SessionConfig, outOfCurriculum: boolean) => void; busy: boolean;
}) {
  const [cfg, setCfg] = useState<SessionConfig>(() => ({ ...BASE(initial?.kind ?? "coding", recommendedEngine(settings)), ...initial }));
  const [saved, setSaved] = useState<Saved[]>([]);
  const [search, setSearch] = useState("");
  const [fresh, setFresh] = useState(false);
  useEffect(() => setSaved(loadSaved()), []);
  const set = (p: Partial<SessionConfig>) => setCfg((c) => ({ ...c, ...p }));
  const ready = providerReady(settings, settings.provider);
  const ai = getAi(settings);
  const user = useStore((s) => s.user);
  const [spent, setSpent] = useState<ReturnType<typeof spendThisMonth>>({});
  useEffect(() => setSpent(spendThisMonth()), []);
  const budget = checkBudget(ai.budgets, spent, cfg.engine, 0);
  const canRecord = typeof window !== "undefined" && RoundRecorder.supported();

  const recs = useMemo(() => recommendMocks({ items, progress, attempts, areas: settings.areas }), [items, progress, attempts, settings.areas]);
  const questions = useMemo(() => allQuestions(cfg.kind, custom), [cfg.kind, custom]);
  const topics = useMemo(() => TOPICS.filter((t) => t.area === AREA[cfg.kind] && questions.some((q) => q.topic === t.id)), [cfg.kind, questions]);
  const pool = cfg.selection.mode === "random-pool" ? cfg.selection.pool : {};
  const poolSize = cfg.selection.mode === "random-pool" ? filterPool(questions, pool, progress).length : questions.length;
  const setPool = (p: Partial<PoolFilter>) => set({ selection: { mode: "random-pool", pool: { ...pool, ...p } } });
  const toggle = <T,>(xs: T[] | undefined, x: T) => (xs?.includes(x) ? xs.filter((y) => y !== x) : [...(xs ?? []), x]);

  const engines: EngineId[] = ["realtime", "ascent-voice", "text"];
  const unavailable = (e: EngineId) => engineFor(e, settings).unavailable(settings);
  const cost = estimateCostUsd(cfg.engine, cfg.minutes, settings);
  const exactMatches = search.trim() ? questions.filter((q) => q.title.toLowerCase().includes(search.toLowerCase())).slice(0, 8) : [];
  const exactQ = cfg.selection.mode === "exact" ? questions.find((q) => cfg.selection.mode === "exact" && q.id === cfg.selection.questionId) : undefined;

  const applyRec = (r: MockRecommendation) => setCfg((c) => ({ ...c, ...BASE(r.kind, c.engine), engine: c.engine, level: r.level ?? c.level, selection: r.pool.topics?.length ? { mode: "random-pool", pool: r.pool } : { mode: "random-all", preferUnseen: true } }));
  const kindMeta = KINDS.find((k) => k.id === cfg.kind)!;

  return (
    <div className="space-y-5">
      {recs.length > 0 && (
        <section className="card p-5">
          <div className="flex items-center gap-2"><Compass size={16} className="text-accent" /><div className="eyebrow">Suggested from your progress</div></div>
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {recs.map((r, i) => (
              <button key={i} onClick={() => applyRec(r)} className="rounded-xl border border-line bg-panel2 p-3.5 text-left transition hover:border-accent/50">
                <div className="flex items-center gap-2 text-sm font-semibold">{r.title}{i === 0 && <Pill color="var(--color-accent)">next</Pill>}{r.readiness && <Pill color="var(--color-hld)">readiness</Pill>}</div>
                <p className="mt-1 text-[12.5px] leading-snug text-mute">{r.reason}</p>
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {KINDS.map((k) => (
          <button key={k.id} onClick={() => setCfg((c) => ({ ...BASE(k.id, c.engine), tone: c.tone, level: c.level, pressure: c.pressure, mode: c.mode, voice: c.voice }))} aria-pressed={cfg.kind === k.id}
            className={cn("card card-hover flex flex-col items-start p-5 text-left", cfg.kind === k.id && "!border-accent/60")} style={cfg.kind === k.id ? { background: `color-mix(in srgb, ${k.color} 7%, var(--color-panel))` } : undefined}>
            <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: `color-mix(in srgb, ${k.color} 16%, transparent)`, color: k.color }}><k.icon size={19} /></span>
            <div className="display mt-3 text-lg font-semibold">{k.label}</div>
            <p className="mt-1 text-[13px] leading-relaxed text-mute">{k.desc}</p>
          </button>
        ))}
      </div>

      <section className="card space-y-6 p-5">
        <Group label="Presets">
          <div className="flex flex-wrap gap-2">
            {BUILTIN.map((p) => <Chip key={p.name} on={false} onClick={() => setCfg({ ...p.make(cfg.engine), engine: cfg.engine })}>{p.name}</Chip>)}
            {saved.map((p, i) => (
              <span key={p.name} className="inline-flex items-center gap-1">
                <Chip on={false} onClick={() => setCfg({ ...p.cfg, engine: unavailable(p.cfg.engine) ? cfg.engine : p.cfg.engine })}>{p.name}</Chip>
                <button aria-label={`Delete preset ${p.name}`} className="text-faint hover:text-bad" onClick={() => { const n = saved.filter((_, j) => j !== i); setSaved(n); storeSaved(n); }}><Trash2 size={13} /></button>
              </span>
            ))}
            <button className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-line px-3 py-1 text-[12.5px] text-mute hover:text-text" onClick={() => {
              const name = `${kindMeta.label} · ${cfg.level} · ${cfg.tone}`;
              const n = [{ name, cfg }, ...saved.filter((s) => s.name !== name)].slice(0, 8);
              setSaved(n); storeSaved(n);
            }}><Save size={12} />Save current</button>
          </div>
        </Group>

        <Group label="Question" hint={cfg.selection.mode === "exact" ? "practice pick: tracked separately" : `${poolSize} question${poolSize === 1 ? "" : "s"} in the draw`}>
          <div className="flex flex-wrap gap-2">
            <Chip on={cfg.selection.mode === "random-all" && !fresh} onClick={() => { setFresh(false); set({ selection: { mode: "random-all", preferUnseen: true } }); }}><Shuffle size={12} className="mr-1 inline" />Random from everything</Chip>
            <Chip on={cfg.selection.mode === "random-pool"} onClick={() => { setFresh(false); set({ selection: { mode: "random-pool", pool: {} } }); }}>Random from a pool I choose</Chip>
            <Chip on={cfg.selection.mode === "exact"} onClick={() => { setFresh(false); set({ selection: { mode: "exact", questionId: exactQ?.id ?? questions[0]?.id ?? "" } }); }}><Target size={12} className="mr-1 inline" />This exact question</Chip>
            {cfg.kind !== "behavioral" && <Chip on={fresh} onClick={() => { setFresh(true); set({ selection: { mode: "random-all", preferUnseen: true } }); }} title="An AI-written question that is not in Ascent's curriculum"><Sparkles size={12} className="mr-1 inline" />New question (not in Ascent)</Chip>}
          </div>
          {cfg.selection.mode === "random-all" && !fresh && (
            <label className="mt-3 flex cursor-pointer items-center gap-2 text-[13px] text-mute"><input type="checkbox" checked={cfg.selection.preferUnseen} onChange={(e) => set({ selection: { mode: "random-all", preferUnseen: e.target.checked } })} className="accent-[var(--color-accent)]" />Prefer questions I have not completed</label>
          )}
          {cfg.selection.mode === "random-pool" && (
            <div className="mt-3 space-y-3 rounded-xl border border-line bg-panel2 p-3.5">
              {topics.length > 0 && <div><div className="mb-1.5 text-[12px] text-faint">Topics</div><div className="flex flex-wrap gap-1.5">{topics.map((t) => <Chip key={t.id} on={!!pool.topics?.includes(t.id)} onClick={() => setPool({ topics: toggle(pool.topics, t.id) })}>{t.title}</Chip>)}</div></div>}
              <div className="flex flex-wrap gap-x-6 gap-y-3">
                <div><div className="mb-1.5 text-[12px] text-faint">Status</div><div className="flex flex-wrap gap-1.5">{(["unseen", "done", "due", "weak"] as const).map((s) => <Chip key={s} on={!!pool.status?.includes(s)} onClick={() => setPool({ status: toggle(pool.status, s) })}>{s === "due" ? "due for review" : s}</Chip>)}</div></div>
                <div><div className="mb-1.5 text-[12px] text-faint">Tier</div><div className="flex flex-wrap gap-1.5">{([1, 2, 3] as const).map((t) => <Chip key={t} on={!!pool.tiers?.includes(t)} onClick={() => setPool({ tiers: toggle(pool.tiers, t) })}>{["must-know", "expected", "stretch"][t - 1]}</Chip>)}</div></div>
                {cfg.kind === "coding" && custom.length > 0 && <div><div className="mb-1.5 text-[12px] text-faint">Source</div><div className="flex flex-wrap gap-1.5">{(["curriculum", "imported"] as const).map((s) => <Chip key={s} on={!!pool.sources?.includes(s)} onClick={() => setPool({ sources: toggle(pool.sources, s) })}>{s === "imported" ? "my imported problems" : s}</Chip>)}</div></div>}
              </div>
              {!poolSize && <p className="text-[12.5px] text-warn">No question matches this pool. Loosen a filter.</p>}
            </div>
          )}
          {cfg.selection.mode === "exact" && (
            <div className="mt-3 rounded-xl border border-line bg-panel2 p-3.5">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search questions" className="h-9 w-full rounded-lg border border-line bg-bg px-3 text-sm outline-none focus:border-accent/60" aria-label="Search questions" />
              {exactMatches.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{exactMatches.map((q) => <Chip key={q.id} on={exactQ?.id === q.id} onClick={() => { set({ selection: { mode: "exact", questionId: q.id } }); setSearch(""); }}>{q.title}</Chip>)}</div>}
              {exactQ && <p className="mt-2 text-[13px]">Selected: <b>{exactQ.title}</b></p>}
              <p className="mt-2 text-[12px] leading-relaxed text-faint">Picking your own question is fine for targeted practice. These rounds are counted separately, because scores on chosen questions tend to run higher than on drawn ones.</p>
            </div>
          )}
          {fresh && <p className="mt-3 text-[12.5px] leading-relaxed text-mute">Before the round starts, your AI writes a {kindMeta.label.toLowerCase()} question that is not in Ascent&apos;s content and avoids what you have studied. It tests transfer, not memory.</p>}
        </Group>

        <div className="grid gap-6 lg:grid-cols-2">
          <Group label="Interviewer tone">
            <div className="grid gap-1.5 sm:grid-cols-2">{TONES.map((t) => (
              <button key={t.id} onClick={() => set({ tone: t.id })} aria-pressed={cfg.tone === t.id} className={cn("rounded-xl border px-3 py-2 text-left transition", cfg.tone === t.id ? "border-accent/60 bg-accent/5" : "border-line bg-panel2 hover:border-[#3a4160]")}>
                <div className="text-[13px] font-semibold">{t.label}</div><div className="text-[11.5px] text-mute">{t.desc}</div>
              </button>
            ))}</div>
          </Group>
          <div className="space-y-5">
            <Group label="Level bar"><div className="flex gap-1.5">{LEVELS.map((l) => <Chip key={l} on={cfg.level === l} onClick={() => set({ level: l })}>{l}{l === "L6" ? " probe" : ""}</Chip>)}</div></Group>
            <Group label="Length">
              <label className="flex items-center gap-3 text-[13px] text-mute"><input type="range" min={15} max={60} step={5} value={cfg.minutes} onChange={(e) => set({ minutes: +e.target.value })} className="flex-1" /><span className="num w-14 font-semibold text-text">{cfg.minutes} min</span></label>
            </Group>
            <Group label="Pressure">
              <div className="grid gap-1.5 sm:grid-cols-3">{PRESSURES.map((p) => (
                <button key={p.id} onClick={() => set({ pressure: p.id })} aria-pressed={cfg.pressure === p.id} className={cn("rounded-xl border px-3 py-2 text-left transition", cfg.pressure === p.id ? "border-accent/60 bg-accent/5" : "border-line bg-panel2 hover:border-[#3a4160]")}>
                  <div className="text-[13px] font-semibold">{p.label}</div><div className="text-[11px] leading-snug text-mute">{p.desc}</div>
                </button>
              ))}</div>
            </Group>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Group label="Round arc">
            <div className="flex flex-wrap gap-1.5">
              <Chip on={cfg.arc.intro} onClick={() => set({ arc: { ...cfg.arc, intro: !cfg.arc.intro } })}>Interviewer introduces themselves</Chip>
              {cfg.kind !== "behavioral" && <Chip on={cfg.arc.aboutYou} onClick={() => set({ arc: { ...cfg.arc, aboutYou: !cfg.arc.aboutYou } })}>&ldquo;Tell me about yourself&rdquo;</Chip>}
              {cfg.kind !== "behavioral" && <Chip on={cfg.arc.curveball} onClick={() => set({ arc: { ...cfg.arc, curveball: !cfg.arc.curveball } })}>Curveballs</Chip>}
              <Chip on={cfg.arc.questionsForMe} onClick={() => set({ arc: { ...cfg.arc, questionsForMe: !cfg.arc.questionsForMe } })}>&ldquo;Any questions for me?&rdquo;</Chip>
            </div>
            {cfg.kind === "coding" && <label className="mt-3 flex cursor-pointer items-center gap-2 text-[13px] text-mute"><input type="checkbox" checked={cfg.plainDoc} onChange={(e) => set({ plainDoc: e.target.checked })} className="accent-[var(--color-accent)]" />Plain doc: no syntax highlighting or line numbers, like a Google Doc</label>}
          </Group>
          {cfg.kind !== "behavioral" && cfg.arc.curveball && (
            <Group label="Curveballs">
              <div className="flex flex-wrap gap-1.5">{(["none", "occasional", "frequent", "random"] as const).map((f) => <Chip key={f} on={cfg.curveballs.frequency === f} onClick={() => set({ curveballs: { ...cfg.curveballs, frequency: f } })}>{f}</Chip>)}</div>
              <div className="mt-2 flex flex-wrap gap-1.5">{CURVEBALLS.filter((c) => c.kinds.includes(cfg.kind) && c.id !== "out-of-curriculum").map((c) => {
                const off = cfg.curveballs.disabled.includes(c.id);
                return <Chip key={c.id} on={!off} onClick={() => set({ curveballs: { ...cfg.curveballs, disabled: toggle<CurveballId>(cfg.curveballs.disabled, c.id) } })}>{c.label}</Chip>;
              })}</div>
            </Group>
          )}
        </div>

        <Group label="Voice">
          <div className="grid gap-2 md:grid-cols-3">{engines.map((e) => {
            const why = unavailable(e), info = ENGINE_INFO[e];
            return (
              <button key={e} disabled={!!why} onClick={() => set({ engine: e })} aria-pressed={cfg.engine === e}
                className={cn("rounded-xl border p-3.5 text-left transition disabled:cursor-not-allowed disabled:opacity-50", cfg.engine === e ? "border-accent/60 bg-accent/5" : "border-line bg-panel2 hover:border-[#3a4160]")}>
                <div className="flex items-center justify-between text-sm font-semibold">{info.label}{e === recommendedEngine(settings) && <Pill color="var(--color-accent)">recommended</Pill>}</div>
                <div className="mt-1 text-[12px] leading-snug text-mute">{info.quality}</div>
                <div className="mt-1.5 text-[11.5px] leading-snug text-faint">{why ?? `Needs: ${info.needs}. ${info.cost}`}</div>
              </button>
            );
          })}</div>
          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-mute">
            {canRecord && <label className="flex cursor-pointer items-center gap-2" title="Your microphone (and the interviewer's voice where the engine allows it) is recorded in this browser for the replay. Nothing is uploaded unless you also back it up."><input type="checkbox" checked={!!cfg.record?.audio} onChange={(e) => set({ record: { audio: e.target.checked, cloud: e.target.checked && !!cfg.record?.cloud } })} className="accent-[var(--color-accent)]" />Record audio for replay</label>}
            {canRecord && cfg.record?.audio && cloudEnabled && user && <label className="flex cursor-pointer items-center gap-2" title="Uploads the recording to your private storage in Ascent so other devices can replay it"><input type="checkbox" checked={!!cfg.record?.cloud} onChange={(e) => set({ record: { audio: true, cloud: e.target.checked } })} className="accent-[var(--color-accent)]" />Back it up to my account</label>}
            {cfg.engine !== "text" && <label className="flex items-center gap-2">Speaking rate<input type="range" min={0.8} max={1.3} step={0.05} value={cfg.voice.rate} onChange={(e) => set({ voice: { ...cfg.voice, rate: +e.target.value } })} /><span className="num w-10 text-text">{cfg.voice.rate.toFixed(2)}×</span></label>}
            {cfg.engine !== "text" && <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={cfg.voice.captions} onChange={(e) => set({ voice: { ...cfg.voice, captions: e.target.checked } })} className="accent-[var(--color-accent)]" />Live captions</label>}
            <span className="flex items-center gap-2">Mode
              <Chip on={cfg.mode === "real"} onClick={() => set({ mode: "real" })} title="The interviewer knows nothing about you">Real</Chip>
              <Chip on={cfg.mode === "coach"} onClick={() => set({ mode: "coach" })} title="The interviewer targets your recurring gaps">Coach</Chip>
            </span>
          </div>
        </Group>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
          <p className="text-[12.5px] text-faint">{!ready ? "Self-paced round: no AI calls, no cost." : `Estimated cost: ${cost.high === 0 ? "free (local model)" : `about $${cost.low.toFixed(2)}–$${cost.high.toFixed(2)} on your own ${cfg.engine === "realtime" ? `${ai.realtime.provider === "openai" ? "OpenAI" : "Gemini"} realtime` : settings.provider} account`}.`}{cfg.engine !== "text" && (cfg.record?.audio ? ` The round is recorded in this browser${cfg.record.cloud ? " and backed up to your account" : ""}, and kept for 30 days.` : " The microphone is used only during the round, and nothing is recorded.")}{budget.scope && ready && ` This month: $${budget.usedUsd.toFixed(2)} of your $${budget.limitUsd} ${budget.scope === "total" ? "AI" : ENGINE_INFO[cfg.engine].label} budget${budget.level === "over" ? (ai.costGuard.enforce ? ", used up: a cheaper engine will be used" : ", used up") : budget.level === "warn" ? ", nearly used: the round will run on a smaller model" : ""}.`}</p>
          <Button variant="primary" disabled={busy || (!ready && (fresh || cfg.engine === "realtime")) || (cfg.selection.mode === "random-pool" && !poolSize) || (cfg.selection.mode === "exact" && !exactQ)} onClick={() => onStart({ ...cfg, seed: Math.floor(Math.random() * 2 ** 31) }, fresh)}>
            {busy ? "Preparing…" : cfg.selection.mode === "exact" ? "Start the round" : <><Shuffle size={15} />Draw a question and start</>}
          </Button>
        </div>
      </section>

      {!ready && <div className="space-y-2"><NeedAI /><p className="text-[12.5px] text-faint">Without an AI provider the round is self-paced: a scripted interviewer runs the timer, introductions, follow-ups and time calls, and you rate yourself at the end.</p></div>}
      <p className="max-w-3xl text-[12px] leading-relaxed text-faint">
        Inspired by <a className="underline underline-offset-2 hover:text-mute" href="https://www.youtube.com/watch?v=DBTdrmS-uL8" target="_blank" rel="noreferrer">Anubhav in Tech&apos;s AI mock interviewer video</a>, its project <a className="underline underline-offset-2 hover:text-mute" href="https://github.com/iamanubhavsethi/ai-mock-interview" target="_blank" rel="noreferrer">ai-mock-interview</a>, and the <a className="underline underline-offset-2 hover:text-mute" href="https://github.com/AgoraIO-Conversational-AI/agent-quickstart-nextjs" target="_blank" rel="noreferrer">Agora conversational AI quickstart</a>. Ascent&apos;s interviewer is its own implementation.
      </p>
    </div>
  );
}
