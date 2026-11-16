"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, ArrowRight, RotateCw, Shuffle } from "lucide-react";
import { AREAS, areaOf } from "@/content";
import { Button, Empty, cn } from "./ui";
import type { Area, Topic } from "@/lib/types";

type Card = [string, string];

function FlipCard({ card, flip, onFlip }: { card: Card; flip: boolean; onFlip: () => void }) {
  return (
    <button onClick={onFlip} aria-label="Flip card" className="mt-3 block w-full" style={{ perspective: 1000 }}>
      <motion.div animate={{ rotateX: flip ? 180 : 0 }} transition={{ type: "spring", stiffness: 180, damping: 20 }} className="relative grid min-h-[150px] place-items-center rounded-2xl border border-line bg-panel2 p-5" style={{ transformStyle: "preserve-3d" }}>
        <div className="text-center text-[15px] font-medium" style={{ backfaceVisibility: "hidden" }}>{card[0]}<div className="mt-3 text-[11.5px] font-normal text-faint">say the answer out loud, then tap</div></div>
        <div className="absolute inset-0 grid place-items-center overflow-y-auto p-5 text-center font-mono text-[13.5px] leading-relaxed text-accent" style={{ backfaceVisibility: "hidden", transform: "rotateX(180deg)" }}>{card[1]}</div>
      </motion.div>
    </button>
  );
}

export function Flashcards({ cards }: { cards: Card[] }) {
  const [i, setI] = useState(0);
  const [flip, setFlip] = useState(false);
  if (!cards.length) return null;
  const go = (d: number) => { setFlip(false); setI((x) => (x + d + cards.length) % cards.length); };
  return (
    <section className="card p-5">
      <div className="flex items-center justify-between"><div className="eyebrow">Flashcards</div><span className="num text-[12px] text-faint">{i + 1} / {cards.length}</span></div>
      <FlipCard card={cards[i]} flip={flip} onFlip={() => setFlip((f) => !f)} />
      {cards.length > 1 && (
        <div className="mt-3 flex justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={() => go(-1)}><ArrowLeft size={14} />Back</Button>
          <Button size="sm" variant="ghost" onClick={() => go(1)}><RotateCw size={14} />Next card</Button>
        </div>
      )}
    </section>
  );
}

/** One deck built from every topic the learner has covered, filterable by area and topic. */
export function FlashDeck({ topics }: { topics: Topic[] }) {
  const [area, setArea] = useState<Area | "all">("all");
  const [topic, setTopic] = useState("all");
  const [seed, setSeed] = useState(0); // 0 = curriculum order, otherwise a shuffle seed
  const [i, setI] = useState(0);
  const [flip, setFlip] = useState(false);

  const areas = useMemo(() => AREAS.filter((a) => topics.some((t) => t.area === a.id)), [topics]);
  const inArea = useMemo(() => topics.filter((t) => area === "all" || t.area === area), [topics, area]);
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

  if (!topics.length) return <Empty title="No flashcards yet">Cards unlock as you cover topics. Open any topic and start its lesson, quiz or an exercise, and its cards join this deck.</Empty>;

  const cur = deck[Math.min(i, deck.length - 1)];
  const chip = (on: boolean) => cn("rounded-full border px-3 py-1 text-[12.5px] font-medium transition", on ? "border-accent/60 bg-accent/10 text-accent" : "border-line text-mute hover:text-text");
  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-center gap-2">
        <button className={chip(area === "all")} onClick={() => { setArea("all"); setTopic("all"); reset(); }}>All areas</button>
        {areas.map((a) => <button key={a.id} className={chip(area === a.id)} style={area === a.id ? { color: a.color, borderColor: a.color } : undefined} onClick={() => { setArea(a.id); setTopic("all"); reset(); }}>{a.short}</button>)}
        <select aria-label="Topic" value={topic} onChange={(e) => { setTopic(e.target.value); reset(); }} className="ml-auto h-8 max-w-[16rem] rounded-xl border border-line bg-panel2 px-2.5 text-[13px] text-text">
          <option value="all">All covered topics ({inArea.length})</option>
          {inArea.map((t) => <option key={t.id} value={t.id}>{t.title} ({t.cards?.length ?? 0})</option>)}
        </select>
      </div>

      {cur ? (
        <>
          <div className="mt-4 flex items-center justify-between gap-3 text-[12px]">
            <Link href={`/learn/${cur.t.id}`} className="truncate font-medium hover:underline" style={{ color: areaOf(cur.t.area).color }}>{cur.t.title}</Link>
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
      ) : <p className="mt-4 text-sm text-mute">No cards in this selection.</p>}
    </section>
  );
}
