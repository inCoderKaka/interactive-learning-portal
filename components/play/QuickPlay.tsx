"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import confetti from "canvas-confetti";
import { ArrowRight, Bug, CheckCheck, CircleHelp, Flame, Gauge, Heart, ListOrdered, Puzzle, RotateCcw, Shapes, Shuffle, SpellCheck, Timer, ToggleLeft, Trophy, Volume2, VolumeX, X, Zap, type LucideIcon } from "lucide-react";
import { useStore } from "@/lib/store";
import { KIND_LABEL, drillXp, hash, shuffle } from "@/lib/drills";
import { sfx } from "@/lib/sfx";
import { todayISO } from "@/lib/srs";
import { updatePlay, usePlay, type Entry } from "@/lib/play";
import { topicById, areaOf } from "@/content";
import type { DrillKind } from "@/lib/types";
import { Button, Ring, cn } from "@/components/ui";
import { DrillView, promptOf } from "./Drills";

export type Mode = "topic" | "daily" | "lightning" | "survival";
export interface Result { mode: Mode; correct: number; answered: number; bestCombo: number; xp: number; newBest: boolean }

export const KIND_ICON: Record<DrillKind, LucideIcon> = { tf: ToggleLeft, pick: CircleHelp, order: ListOrdered, match: Puzzle, odd: Shapes, blank: SpellCheck, bug: Bug, guess: Gauge };
const LIGHTNING_S = 60, LIVES = 3;

const burst = (x = 0.5, y = 0.6, n = 40) => {
  if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  confetti({ particleCount: n, spread: 70, startVelocity: 32, origin: { x, y }, colors: ["#c8f547", "#4fd1c5", "#7aa7ff", "#ffb454", "#ff8fb3", "#b794f4"], disableForReducedMotion: true, scalar: 0.9 });
};

/**
 * Runs a round of quick-play drills.
 *   topic      every drill of one topic, shuffled, no clock
 *   daily      today's fixed round across areas, once a day
 *   lightning  as many as you can in 60 seconds
 *   survival   endless until three misses
 */
export function QuickPlay({ entries, mode, color = "var(--color-accent)", topicId, onExit }: { entries: Entry[]; mode: Mode; color?: string; topicId?: string; onExit?: () => void }) {
  const play = usePlay();
  const addXp = useStore((s) => s.addXp);
  const blind = useStore((s) => s.settings.blind);
  const endless = mode === "lightning" || mode === "survival";
  const [runSeed, setRunSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const [deck, setDeck] = useState<Entry[]>(() => (mode === "daily" ? entries : shuffle(entries)));
  const [i, setI] = useState(0);
  const [res, setRes] = useState<(boolean | null)[]>([]);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [lives, setLives] = useState(LIVES);
  const [xp, setXp] = useState(0);
  const [pops, setPops] = useState<{ id: number; text: string }[]>([]);
  const [endAt, setEndAt] = useState(() => (mode === "lightning" ? Date.now() + LIGHTNING_S * 1000 : 0));
  const [now, setNow] = useState(() => Date.now());
  const [over, setOver] = useState<Result | null>(null);
  const awarded = useRef(false);
  const xpRef = useRef(0);
  xpRef.current = xp;

  const cur = deck[i];
  const answered = res[i] !== undefined && res[i] !== null;
  const correct = res.filter((r) => r === true).length;
  const count = res.filter((r) => r !== null && r !== undefined).length;
  const total = endless ? undefined : deck.length;
  const timeLeft = mode === "lightning" ? Math.max(0, Math.ceil((endAt - now) / 1000)) : 0;

  // award what was earned if the learner navigates away mid-round
  useEffect(() => () => { if (!awarded.current && xpRef.current > 0) addXp(xpRef.current); }, [addXp]);

  const finish = useCallback((final: (boolean | null)[], best: number, gained: number) => {
    if (awarded.current) return;
    awarded.current = true;
    const c = final.filter((r) => r === true).length, n = final.filter((r) => r !== null && r !== undefined).length;
    const pct = n ? c / n : 0;
    let newBest = false;
    const bonus = mode === "topic" || mode === "daily" ? Math.round(pct * 10) + (pct === 1 ? 10 : 0) : Math.min(30, c);
    updatePlay((s) => {
      const next = { ...s, played: s.played + n };
      if (endless) { newBest = c > (s.best[mode] ?? 0); next.best = { ...s.best, [mode]: Math.max(c, s.best[mode] ?? 0) }; }
      if (mode === "daily") next.daily = { ...s.daily, [todayISO()]: { score: c, total: n } };
      if (mode === "topic" && topicId) { newBest = Math.round(pct * 100) > (s.topics[topicId] ?? -1); next.topics = { ...s.topics, [topicId]: Math.max(Math.round(pct * 100), s.topics[topicId] ?? 0) }; }
      return next;
    });
    const total = gained + bonus;
    if (total > 0) addXp(total, mode === "topic" ? `Quick play: ${c}/${n}` : mode === "daily" ? `Daily five-minute round: ${c}/${n}` : `${mode === "lightning" ? "Lightning round" : "Survival"}: ${c} correct`);
    sfx("finish", play.sound);
    if (pct >= 0.8 || newBest) setTimeout(() => burst(0.5, 0.45, 110), 250);
    setOver({ mode, correct: c, answered: n, bestCombo: best, xp: total, newBest });
  }, [addXp, endless, mode, play.sound, topicId]);

  // lightning clock
  useEffect(() => {
    if (mode !== "lightning" || over) return;
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, [mode, over]);
  useEffect(() => { if (mode === "lightning" && !over && timeLeft === 0) finish(res, bestCombo, xp); }, [mode, over, timeLeft, finish, res, bestCombo, xp]);

  const next = useCallback(() => {
    if (over) return;
    if (!endless && i + 1 >= deck.length) { finish(res, bestCombo, xp); return; }
    if (mode === "survival" && lives <= 0) { finish(res, bestCombo, xp); return; }
    if (endless && i + 1 >= deck.length) setDeck((d) => [...d, ...shuffle(entries)]);
    setI((x) => x + 1);
  }, [over, endless, i, deck.length, mode, lives, finish, res, bestCombo, xp, entries]);

  const onAnswer = (ok: boolean) => {
    if (answered || over) return;
    const nr = [...res]; nr[i] = ok; setRes(nr);
    const c = ok ? combo + 1 : 0;
    setCombo(c);
    const best = Math.max(bestCombo, c);
    setBestCombo(best);
    const gain = ok ? drillXp(c) : 0;
    if (ok) { setXp((x) => x + gain); setPops((p) => [...p.slice(-3), { id: Date.now(), text: `+${gain} XP` }]); }
    sfx(ok ? (c > 0 && c % 5 === 0 ? "combo" : "right") : "wrong", play.sound);
    if (ok && c > 0 && c % 5 === 0) burst(0.5, 0.35, 50);
    const nl = mode === "survival" && !ok ? lives - 1 : lives;
    if (nl !== lives) setLives(nl);
    if (endless) setTimeout(() => { if (mode === "survival" && nl <= 0) finish(nr, best, xp + gain); }, ok ? 0 : 1500);
  };

  // endless modes advance on their own; the others wait for Next (or Enter)
  useEffect(() => {
    if (!endless || !answered || over) return;
    if (mode === "survival" && lives <= 0) return;
    const t = setTimeout(next, res[i] ? 650 : 1700);
    return () => clearTimeout(t);
  }, [endless, answered, over, mode, lives, next, res, i]);
  useEffect(() => {
    if (!answered || endless || over) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); next(); } };
    const t = setTimeout(() => window.addEventListener("keydown", h), 120);
    return () => { clearTimeout(t); window.removeEventListener("keydown", h); };
  }, [answered, endless, over, next]);

  const restart = () => {
    awarded.current = false;
    setRunSeed(Math.floor(Math.random() * 1e9));
    setDeck(mode === "daily" ? entries : shuffle(entries));
    setI(0); setRes([]); setCombo(0); setBestCombo(0); setLives(LIVES); setXp(0); setOver(null);
    if (mode === "lightning") { setEndAt(Date.now() + LIGHTNING_S * 1000); setNow(Date.now()); }
  };
  const exit = () => { if (!awarded.current && xp > 0) { awarded.current = true; addXp(xp); } onExit?.(); };

  if (over) return <Summary r={over} color={color} onAgain={mode === "daily" ? undefined : restart} onExit={onExit} best={endless ? play.best[mode] : undefined} />;
  if (!cur) return null;
  const Icon = KIND_ICON[cur.d.kind];
  const t = topicById.get(cur.topic);
  const prompt = promptOf(cur.d);
  const why = "why" in cur.d ? cur.d.why : undefined;
  const ok = res[i] === true;

  return (
    <div data-read-skip className="relative">
      {/* header: progress, combo, clock */}
      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-semibold" style={{ color, borderColor: `color-mix(in srgb, ${color} 40%, transparent)`, background: `color-mix(in srgb, ${color} 10%, transparent)` }}><Icon size={13} />{KIND_LABEL[cur.d.kind]}</span>
        {total ? (
          <div className="flex min-w-[120px] flex-1 items-center gap-1" aria-label={`Question ${i + 1} of ${total}`}>
            {deck.map((_, k) => <span key={k} className={cn("h-1.5 flex-1 rounded-full transition-colors duration-300", res[k] === true ? "bg-ok" : res[k] === false ? "bg-bad" : k === i ? "bg-text/60" : "bg-[#232738]")} />)}
          </div>
        ) : <span className="num flex-1 text-[12.5px] text-mute">{correct} correct · {count} played</span>}
        <div className="relative flex items-center gap-2">
          <motion.span key={combo} initial={{ scale: combo ? 1.35 : 1 }} animate={{ scale: 1 }} title="Combo: correct answers in a row"
            className={cn("num inline-flex h-8 items-center gap-1 rounded-xl border px-2.5 text-[13px] font-bold", combo >= 3 ? "border-lld/50 bg-lld/10 text-lld" : "border-line text-faint")}>
            <Flame size={14} className={cn(combo >= 5 && "animate-pulse-soft")} />{combo}
          </motion.span>
          <AnimatePresence>{pops.map((p) => <motion.span key={p.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: [0, 1, 0], y: -34 }} transition={{ duration: 1.1 }} onAnimationComplete={() => setPops((x) => x.filter((y) => y.id !== p.id))} className="pointer-events-none absolute -top-1 left-0 whitespace-nowrap text-[12px] font-bold text-accent">{p.text}</motion.span>)}</AnimatePresence>
          {mode === "lightning" && <Ring value={timeLeft / LIGHTNING_S} size={34} stroke={3} color={timeLeft <= 10 ? "var(--color-bad)" : color}><span className="text-[10.5px]">{timeLeft}</span></Ring>}
          {mode === "survival" && <span className="flex gap-0.5" aria-label={`${lives} lives left`}>{Array.from({ length: LIVES }, (_, k) => <Heart key={k} size={15} className={k < lives ? "fill-bad text-bad" : "text-faint"} />)}</span>}
          <button onClick={() => updatePlay((s) => ({ ...s, sound: !s.sound }))} aria-label={play.sound ? "Mute sounds" : "Turn sounds on"} className="grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-white/5 hover:text-text">{play.sound ? <Volume2 size={15} /> : <VolumeX size={15} />}</button>
          {onExit && <button onClick={exit} aria-label="Leave the round" className="grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-white/5 hover:text-text"><X size={15} /></button>}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={`${runSeed}-${i}`} initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -28 }} transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}>
          {prompt && <h3 className="display mb-4 text-[18px] font-semibold leading-snug sm:text-[20px]">{prompt}</h3>}
          <DrillView d={cur.d} done={answered} seed={hash(`${runSeed}:${i}`)} onAnswer={onAnswer} />

          <AnimatePresence>
            {answered && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn("mt-4 flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center", ok ? "border-ok/30 bg-ok/[0.06]" : "border-bad/30 bg-bad/[0.06]")}>
                <div className="min-w-0 flex-1">
                  <div className={cn("text-[13px] font-bold", ok ? "text-ok" : "text-bad")}>{ok ? (combo >= 5 ? `On fire: ${combo} in a row!` : combo >= 3 ? `${combo} in a row` : "Correct") : "Not this time"}</div>
                  {why && <p className="mt-1 text-[13.5px] leading-relaxed text-[#d5d8e6]">{why}</p>}
                  {mode !== "topic" && t && !blind && <Link href={`/learn/${t.id}`} className="mt-1.5 inline-flex items-center gap-1.5 text-[11.5px] text-faint hover:text-text"><span className="h-1.5 w-1.5 rounded-full" style={{ background: areaOf(t.area).color }} />{t.title}</Link>}
                </div>
                {!endless && <Button variant="primary" onClick={next} className="shrink-0">{i + 1 >= deck.length ? "See results" : "Next"}<ArrowRight size={15} /></Button>}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Summary({ r, color, onAgain, onExit, best }: { r: Result; color: string; onAgain?: () => void; onExit?: () => void; best?: number }) {
  const pct = r.answered ? r.correct / r.answered : 0;
  const head = r.mode === "lightning" || r.mode === "survival"
    ? (r.newBest ? "New personal best!" : r.correct >= 10 ? "Fast hands." : "Warmed up.")
    : pct === 1 ? "Flawless." : pct >= 0.8 ? "Sharp." : pct >= 0.5 ? "Solid. The misses are where the learning is." : "Good find: these are your gaps.";
  const stats = useMemo(() => [
    { icon: CheckCheck, label: "Correct", v: `${r.correct}/${r.answered}` },
    { icon: Flame, label: "Best combo", v: String(r.bestCombo) },
    { icon: Zap, label: "XP earned", v: `+${r.xp}` },
    ...(best !== undefined ? [{ icon: Trophy, label: "Personal best", v: String(best) }] : []),
  ], [r, best]);
  return (
    <motion.div data-read-skip initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="py-2 text-center">
      <div className="mx-auto w-fit"><Ring value={pct} size={104} stroke={8} color={color}><span className="display text-2xl">{Math.round(pct * 100)}%</span></Ring></div>
      <div className="display mt-4 text-2xl font-semibold">{head}</div>
      {r.newBest && r.mode === "topic" && <div className="mt-1 text-[13px] text-accent">New best on this topic</div>}
      <div className="mx-auto mt-5 grid max-w-md grid-cols-3 gap-2" style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}>
        {stats.map((s) => <div key={s.label} className="rounded-xl border border-line bg-panel2 px-2 py-3"><s.icon size={15} className="mx-auto text-mute" /><div className="num mt-1 text-lg font-semibold">{s.v}</div><div className="text-[11px] text-faint">{s.label}</div></div>)}
      </div>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {onAgain && <Button variant="primary" onClick={onAgain}><RotateCcw size={15} />Play again</Button>}
        {onExit && <Button onClick={onExit}>{onAgain ? "Done" : "Back"}</Button>}
        {r.mode === "topic" && <Link href="/play"><Button variant="ghost"><Shuffle size={15} />Mixed arcade</Button></Link>}
        {r.mode === "daily" && <Link href="/play"><Button variant="ghost"><Timer size={15} />Try a lightning round</Button></Link>}
      </div>
    </motion.div>
  );
}
