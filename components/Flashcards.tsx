"use client";
import { useState } from "react";
import { motion } from "motion/react";
import { RotateCw } from "lucide-react";
import { Button } from "./ui";

export function Flashcards({ cards }: { cards: [string, string][] }) {
  const [i, setI] = useState(0);
  const [flip, setFlip] = useState(false);
  if (!cards.length) return null;
  return (
    <section className="card p-5">
      <div className="flex items-center justify-between"><div className="eyebrow">Flashcards</div><span className="num text-[12px] text-faint">{i + 1} / {cards.length}</span></div>
      <button onClick={() => setFlip((f) => !f)} aria-label="Flip card" className="mt-3 block w-full" style={{ perspective: 1000 }}>
        <motion.div animate={{ rotateX: flip ? 180 : 0 }} transition={{ type: "spring", stiffness: 180, damping: 20 }} className="relative grid min-h-[130px] place-items-center rounded-2xl border border-line bg-panel2 p-5" style={{ transformStyle: "preserve-3d" }}>
          <div className="text-center text-[15px] font-medium" style={{ backfaceVisibility: "hidden" }}>{cards[i][0]}<div className="mt-3 text-[11.5px] font-normal text-faint">say the answer out loud, then tap</div></div>
          <div className="absolute inset-0 grid place-items-center p-5 text-center font-mono text-[13.5px] text-accent" style={{ backfaceVisibility: "hidden", transform: "rotateX(180deg)" }}>{cards[i][1]}</div>
        </motion.div>
      </button>
      {cards.length > 1 && <div className="mt-3 flex justify-end"><Button size="sm" variant="ghost" onClick={() => { setFlip(false); setI((x) => (x + 1) % cards.length); }}><RotateCw size={14} />Next card</Button></div>}
    </section>
  );
}

