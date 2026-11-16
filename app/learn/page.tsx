"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, Layers, List, Orbit } from "lucide-react";
import { useStore } from "@/lib/store";
import { useItems } from "@/lib/hooks";
import { AREAS, TOPICS } from "@/content";
import { PageHead, Pill, Ring, Tabs, cn, fmtMin } from "@/components/ui";
import { FlashDeck } from "@/components/Flashcards";
import type { StarInfo } from "@/components/Galaxy";

const Galaxy = dynamic(() => import("@/components/Galaxy"), { ssr: false, loading: () => <div className="grid h-full place-items-center text-sm text-faint animate-pulse-soft">Charting the map…</div> });
const TIER = { 1: "Must know", 2: "Expected", 3: "Stretch" } as const;

export default function Learn() {
  const progress = useStore((s) => s.progress);
  const items = useItems();
  const [view, setView] = useState<"map" | "list" | "cards">("map");
  const stars = useMemo<StarInfo[]>(() => TOPICS.map((topic) => {
    const its = items.filter((i) => i.topic === topic.id);
    const done = its.filter((i) => progress[i.id]?.status === "done").length;
    return { topic, total: its.length, done, mastery: done / Math.max(1, its.length) };
  }), [items, progress]);
  // a topic is "covered" once its lesson or any of its exercises has been started
  const covered = useMemo(() => {
    const ids = new Set(items.filter((i) => progress[i.id]).map((i) => i.topic));
    return TOPICS.filter((t) => ids.has(t.id) && t.cards?.length);
  }, [items, progress]);
  const cardCount = covered.reduce((n, t) => n + (t.cards?.length ?? 0), 0);

  return (
    <div>
      <PageHead eyebrow="Curriculum" title="The whole mountain" sub={`${TOPICS.length} topics and ${items.length - TOPICS.length} exercises covering what a Google L4/L5 loop expects. Each star is a topic: it brightens as you master it.`}
        right={<Tabs value={view} onChange={setView} tabs={[{ id: "map", label: <span className="flex items-center gap-1.5"><Orbit size={14} />Map</span> }, { id: "list", label: <span className="flex items-center gap-1.5"><List size={14} />List only</span> }, { id: "cards", label: <span className="flex items-center gap-1.5"><Layers size={14} />Flashcards{cardCount > 0 && <span className="num text-faint">{cardCount}</span>}</span> }]} />} />

      {view === "map" && (
        <div className="card relative mb-8 h-[460px] overflow-hidden bg-[#07080d]">
          <Galaxy stars={stars} />
          <div className="pointer-events-none absolute bottom-3 left-4 text-[11.5px] text-faint">Drag to rotate · scroll to zoom · hover a star to see what it builds on and unlocks · click to open</div>
          <div className="pointer-events-none absolute right-4 top-3 flex gap-3 text-[11.5px]">{AREAS.map((a) => <span key={a.id} className="flex items-center gap-1.5" style={{ color: a.color }}><span className="h-2 w-2 rounded-full" style={{ background: a.color }} />{a.short}</span>)}</div>
        </div>
      )}

      {view === "cards" && (
        <div className="mb-10">
          <p className="mb-3 text-[13px] text-mute">{covered.length ? `${cardCount} cards from the ${covered.length} topic${covered.length === 1 ? "" : "s"} you have covered so far.` : "Your personal deck, built from the topics you have covered."}</p>
          <FlashDeck topics={covered} />
        </div>
      )}

      <div className="space-y-10">
        {AREAS.map((a) => {
          const list = stars.filter((s) => s.topic.area === a.id);
          const done = list.reduce((x, s) => x + s.done, 0), total = list.reduce((x, s) => x + s.total, 0);
          return (
            <section key={a.id} id={a.id} className="scroll-mt-20">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                <div><h2 className="display text-2xl font-semibold" style={{ color: a.color }}>{a.name}</h2><p className="text-[13px] text-mute">{a.tag}</p></div>
                <span className="num text-[13px] text-mute">{done} / {total} complete</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {list.map(({ topic: t, done: d, total: n, mastery }) => (
                  <Link key={t.id} href={`/learn/${t.id}`} className="card card-hover group flex gap-4 p-4">
                    <Ring value={mastery} size={48} stroke={4} color={a.color}>{mastery >= 1 ? <Check size={16} style={{ color: a.color }} /> : <span className="text-[11px] text-mute">{d}/{n}</span>}</Ring>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2"><span className="font-semibold leading-snug">{t.title}</span></div>
                      <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-mute">{t.blurb}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-faint">
                        <Pill className={cn("border-line", t.tier === 1 ? "text-text" : "text-mute")}>{TIER[t.tier]}</Pill>
                        <span>{n - 1} exercise{n - 1 === 1 ? "" : "s"}</span><span>·</span><span>{fmtMin(t.est)} lesson</span>{t.viz && <><span>·</span><span style={{ color: a.color }}>interactive</span></>}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
