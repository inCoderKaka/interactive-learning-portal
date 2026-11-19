"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, ArrowRight, RotateCw, Shuffle } from "lucide-react";
import { AREAS, areaOf } from "@/content";
import { Button, Empty, cn } from "./ui";
import type { Area, Card, CardKind, Topic } from "@/lib/types";

const KIND: Record<CardKind, { label: string; color: string }> = {
  pattern: { label: "Pattern", color: "var(--color-accent)" },
  variation: { label: "Variation", color: "var(--color-hld)" },
  pitfall: { label: "Pitfall", color: "var(--color-warn)" },
};

/** Deck-picker names. The curriculum calls the last area "Interview Craft"; learners think of it as interview readiness. */
const DECK_LABEL: Record<Area, string> = { dsa: "DSA", hld: "HLD", lld: "LLD", craft: "Interview readiness" };

function FlipCard({ card, flip, onFlip }: { card: Card; flip: boolean; onFlip: () => void }) {
  const [front, back, kind] = card;
  const long = back.length > 130;
  // Both faces share one grid cell so the card grows to fit whichever side is taller.
  const face = "col-start-1 row-start-1 grid place-items-center p-5";
  return (
    <button onClick={onFlip} aria-label="Flip card" aria-pressed={flip} className="mt-3 block w-full" style={{ perspective: 1000 }}>
      <motion.div animate={{ rotateX: flip ? 180 : 0 }} transition={{ type: "spring", stiffness: 180, damping: 20 }} className="grid min-h-[170px] rounded-2xl border border-line bg-panel2" style={{ transformStyle: "preserve-3d" }}>
        <div className={face} style={{ backfaceVisibility: "hidden" }}>
          <div className="text-center text-[15px] font-medium leading-snug">
            {kind && <span className="mb-2 block text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: KIND[kind].color }}>{KIND[kind].label}</span>}
            {front}
            <div className="mt-3 text-[11.5px] font-normal text-faint">say the answer out loud, then tap</div>
          </div>
        </div>
        <div className={cn(face, "font-mono text-[13px] leading-relaxed text-accent", long ? "text-left" : "text-center")} style={{ backfaceVisibility: "hidden", transform: "rotateX(180deg)" }}>
          <div>{back}</div>
        </div>
      </motion.div>
    </button>
  );
}

/** Cards of a single topic, shown on its lesson page. */
export function Flashcards({ cards }: { cards: Card[] }) {
  const [i, setI] = useState(0);
  const [flip, setFlip] = useState(false);
  if (!cards.length) return null;
  const go = (d: number) => { setFlip(false); setI((x) => (x + d + cards.length) % cards.length); };
  return (
    <section className="card p-5">
      <div className="flex items-center justify-between"><div className="eyebrow">Flashcards</div><span className="num text-[12px] text-faint">{i + 1} / {cards.length}</span></div>
      <FlipCard key={cards[i][0]} card={cards[i]} flip={flip} onFlip={() => setFlip((f) => !f)} />
      {cards.length > 1 && (
        <div className="mt-3 flex justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={() => go(-1)}><ArrowLeft size={14} />Back</Button>
          <Button size="sm" variant="ghost" onClick={() => go(1)}><RotateCw size={14} />Next card</Button>
        </div>
      )}
    </section>
  );
}

/**
 * The whole deck. Pick a main area (DSA / HLD / LLD / Interview readiness), optionally narrow to one topic,
 * and optionally restrict to topics the learner has started.
 */
export function FlashDeck({ topics, started }: { topics: Topic[]; started?: ReadonlySet<string> }) {
  const [area, setArea] = useState<Area | "all">("all");
  const [topic, setTopic] = useState("all");
  const [mine, setMine] = useState(false); // only topics the learner has started
  const [seed, setSeed] = useState(0); // 0 = curriculum order, otherwise a shuffle seed
  const [i, setI] = useState(0);
  const [flip, setFlip] = useState(false);

  const withCards = useMemo(() => topics.filter((t) => t.cards?.length), [topics]);
  const pool = useMemo(() => (mine && started ? withCards.filter((t) => started.has(t.id)) : withCards), [withCards, mine, started]);
  const count = (list: Topic[]) => list.reduce((n, t) => n + (t.cards?.length ?? 0), 0);
  const inArea = useMemo(() => pool.filter((t) => area === "all" || t.area === area), [pool, area]);
  const deck = useMemo(() => {
    const out = inArea.filter((t) => topic === "all" || t.id === topic).flatMap((t) => (t.cards ?? []).map((card) => ({ card, t })));
    if (!seed) return out;
    // seeded Fisher–Yates so the order is stable across re-renders
    let s = seed;
    const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (let k = out.length - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [out[k], out[j]] = [out[j], out[k]]; }
    return out;
  }, [inArea, topic, seed]);

  const reset = () => { setI(0); setFlip(false); };
  const go = (d: number) => { setFlip(false); setI((x) => (x + d + deck.length) % deck.length); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (!deck.length || (el && /INPUT|TEXTAREA|SELECT/.test(el.tagName))) return;
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === " ") { e.preventDefault(); setFlip((f) => !f); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!withCards.length) return <Empty title="No flashcards yet">Flashcards appear here as topics gain them.</Empty>;

  const cur = deck[Math.min(i, deck.length - 1)];
  const chip = (on: boolean) => cn("flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12.5px] font-medium transition", on ? "border-accent/60 bg-accent/10 text-accent" : "border-line text-mute hover:text-text");
  return (
    <section className="card p-5">
      <div role="tablist" aria-label="Flashcard area" className="flex flex-wrap items-center gap-2">
        <button role="tab" aria-selected={area === "all"} className={chip(area === "all")} onClick={() => { setArea("all"); setTopic("all"); reset(); }}>All<span className="num text-faint">{count(pool)}</span></button>
        {AREAS.map((a) => {
          const n = count(pool.filter((t) => t.area === a.id));
          return (
            <button key={a.id} role="tab" aria-selected={area === a.id} className={chip(area === a.id)} style={area === a.id ? { color: a.color, borderColor: a.color } : undefined} onClick={() => { setArea(a.id); setTopic("all"); reset(); }}>
              {DECK_LABEL[a.id]}<span className="num text-faint">{n}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select aria-label="Topic" value={topic} onChange={(e) => { setTopic(e.target.value); reset(); }} className="h-8 min-w-0 max-w-full flex-1 rounded-xl border border-line bg-panel2 px-2.5 text-[13px] text-text sm:max-w-[22rem] sm:flex-none">
          <option value="all">{area === "all" ? "All topics" : `All ${DECK_LABEL[area]} topics`} ({count(inArea)})</option>
          {inArea.map((t) => <option key={t.id} value={t.id}>{t.title} ({t.cards?.length ?? 0})</option>)}
        </select>
        {started && (
          <label className="ml-auto flex cursor-pointer select-none items-center gap-2 text-[12.5px] text-mute">
            <input type="checkbox" checked={mine} onChange={(e) => { setMine(e.target.checked); setTopic("all"); reset(); }} className="accent-[var(--color-accent)]" />
            Started topics only
          </label>
        )}
      </div>

      {cur ? (
        <>
          <div className="mt-4 flex items-center justify-between gap-3 text-[12px]">
            <Link href={`/learn/${cur.t.id}`} className="truncate font-medium hover:underline" style={{ color: areaOf(cur.t.area).color }}>{DECK_LABEL[cur.t.area]} · {cur.t.title}</Link>
            <span className="num shrink-0 text-faint">{Math.min(i, deck.length - 1) + 1} / {deck.length}</span>
          </div>
          <FlipCard key={cur.t.id + cur.card[0]} card={cur.card} flip={flip} onFlip={() => setFlip((f) => !f)} />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <Button size="sm" variant={seed ? "soft" : "ghost"} onClick={() => { setSeed(seed ? 0 : Date.now() % 2147483647 || 1); reset(); }}><Shuffle size={14} />{seed ? "Shuffled" : "Shuffle"}</Button>
            <span className="hidden text-[11.5px] text-faint sm:block">← → to move · space to flip</span>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => go(-1)}><ArrowLeft size={14} />Back</Button>
              <Button size="sm" onClick={() => go(1)}>Next<ArrowRight size={14} /></Button>
            </div>
          </div>
        </>
      ) : (
        <p className="mt-4 text-sm text-mute">{mine ? "You have not started any topic in this selection yet. Untick “Started topics only” to browse every card." : "No cards in this selection."}</p>
      )}
    </section>
  );
}
