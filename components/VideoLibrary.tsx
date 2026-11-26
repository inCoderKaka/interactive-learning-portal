"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, Clapperboard, ExternalLink, Play, Search, X } from "lucide-react";
import { VideoEmbed } from "./References";
import { DIFF, cn } from "./ui";
import { byChannel, useVideoData, type Chan, type Vid } from "@/lib/videos";

export interface LibProblem { id: string; title: string; lc: number; diff: "E" | "M" | "H"; extra?: boolean }

const PAGE = 18;
const ref = (v: Vid, ch: Chan[]) => ({ kind: "video" as const, title: v[1], by: ch[v[2]][0], url: `https://www.youtube.com/watch?v=${v[0]}`, yt: v[0] });

/**
 * Every tracked channel's videos for a page, in two clicks: one to open the library, one to play.
 * Concept videos come first; question videos are grouped by problem. Filters by kind, channel and language.
 */
export function VideoLibrary({ pages, problems, color }: { pages: string[]; problems: LibProblem[]; color: string }) {
  const [open, setOpen] = useState(false);
  const data = useVideoData(true);
  const [kind, setKind] = useState<"all" | "concept" | "question">("all");
  const [chans, setChans] = useState<Set<number>>(new Set());
  const [hindi, setHindi] = useState<"any" | "en" | "hi">("any");
  const [q, setQ] = useState("");
  const [playing, setPlaying] = useState<Vid | null>(null);
  const [shown, setShown] = useState(PAGE);

  const lib = useMemo(() => {
    if (!data) return null;
    const seen = new Set<string>();
    const concept = byChannel(pages.flatMap((p) => data.pages[p] ?? []).filter((v) => !seen.has(v[0]) && seen.add(v[0])), data.channels);
    const groups = problems.map((p) => ({ p, vids: byChannel((data.lc[String(p.lc)] ?? []).filter((v) => !seen.has(v[0]) && seen.add(v[0])), data.channels) })).filter((g) => g.vids.length);
    const count = new Map<number, number>();
    for (const v of [...concept, ...groups.flatMap((g) => g.vids)]) count.set(v[2], (count.get(v[2]) ?? 0) + 1);
    return { concept, groups, count, total: concept.length + groups.reduce((n, g) => n + g.vids.length, 0) };
  }, [data, pages, problems]);

  if (!lib || !data) return <section className="card h-[72px] animate-pulse-soft" aria-busy />;
  if (!lib.total) return null;
  const ch = data.channels;
  const keep = (v: Vid) => (!chans.size || chans.has(v[2])) && (hindi === "any" || (hindi === "hi") === !!ch[v[2]][2]) && (!q || v[1].toLowerCase().includes(q.toLowerCase()));
  const concept = kind === "question" ? [] : lib.concept.filter(keep);
  const groups = kind === "concept" ? [] : lib.groups.map((g) => ({ ...g, vids: g.vids.filter(keep) })).filter((g) => g.vids.length || (q && g.p.title.toLowerCase().includes(q.toLowerCase())));
  const nq = lib.groups.reduce((n, g) => n + g.vids.length, 0);
  const play = (v: Vid) => {
    if (v[3]) { window.open(`https://www.youtube.com/watch?v=${v[0]}`, "_blank", "noopener"); return; }
    setPlaying(v); requestAnimationFrame(() => document.getElementById("vlib-player")?.scrollIntoView({ behavior: "smooth", block: "nearest" })); };
  const toggleChan = (i: number) => setChans((s) => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n; });

  return (
    <section className="card overflow-hidden" data-read-block data-read-text={`There is a video library here with ${lib.total} videos from ${lib.count.size} channels.`}>
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-4 p-5 text-left transition hover:bg-white/[0.02]">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line" style={{ color }}><Clapperboard size={19} /></span>
        <span className="min-w-0 flex-1">
          <span className="eyebrow block">Video library</span>
          <span className="display block text-[17px] font-semibold">{lib.total} videos · {lib.count.size} channel{lib.count.size > 1 ? "s" : ""}</span>
          <span className="block truncate text-[12.5px] text-mute">{lib.concept.length} concept · {nq} question walkthroughs{lib.groups.length ? ` across ${lib.groups.length} problems` : ""} · {[...lib.count.keys()].slice(0, 5).map((i) => ch[i][0]).join(", ")}{lib.count.size > 5 ? "…" : ""}</span>
        </span>
        <ChevronDown size={18} className={cn("shrink-0 text-mute transition", open && "rotate-180")} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="space-y-4 border-t border-line p-5">
              {playing && (
                <div id="vlib-player" className="space-y-2">
                  <VideoEmbed key={playing[0]} r={ref(playing, ch)} autoplay />
                  <div className="flex items-center justify-between text-[12px] text-mute"><span className="truncate">{playing[1]} · {ch[playing[2]][0]}</span><button onClick={() => setPlaying(null)} className="flex items-center gap-1 hover:text-text"><X size={13} />Close</button></div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-1.5 text-[12px]">
                {(["all", "concept", "question"] as const).map((k) => (
                  <button key={k} onClick={() => { setKind(k); setShown(PAGE); }} aria-pressed={kind === k} className={cn("rounded-lg border px-2.5 py-1 transition", kind === k ? "border-accent/60 bg-accent/10 text-accent" : "border-line text-mute hover:text-text")}>
                    {k === "all" ? `All ${lib.total}` : k === "concept" ? `Concepts ${lib.concept.length}` : `Questions ${nq}`}
                  </button>
                ))}
                <span className="mx-1 h-4 w-px bg-line" />
                {(["any", "en", "hi"] as const).map((k) => (
                  <button key={k} onClick={() => setHindi(k)} aria-pressed={hindi === k} className={cn("rounded-lg border px-2.5 py-1 transition", hindi === k ? "border-accent/60 bg-accent/10 text-accent" : "border-line text-mute hover:text-text")}>{k === "any" ? "Any language" : k === "en" ? "English" : "Hindi"}</button>
                ))}
                <label className="ml-auto flex h-8 items-center gap-1.5 rounded-lg border border-line px-2 text-mute focus-within:border-accent/50">
                  <Search size={13} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter videos" aria-label="Filter videos" className="w-32 bg-transparent text-[12.5px] text-text outline-none placeholder:text-faint" />
                </label>
              </div>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Channels">
                {[...lib.count].sort((a, b) => b[1] - a[1]).map(([i, n]) => (
                  <button key={i} onClick={() => toggleChan(i)} aria-pressed={chans.has(i)} className={cn("rounded-full border px-2.5 py-0.5 text-[11.5px] transition", chans.has(i) ? "border-accent/60 bg-accent/10 text-accent" : "border-line text-mute hover:text-text")}>
                    {ch[i][0]} <span className="num text-faint">{n}</span>
                  </button>
                ))}
                {chans.size > 0 && <button onClick={() => setChans(new Set())} className="px-1 text-[11.5px] text-faint underline hover:text-mute">clear</button>}
              </div>

              {concept.length > 0 && (
                <div>
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-faint">Concepts and walkthroughs</div>
                  <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                    {concept.slice(0, shown).map((v) => <Thumb key={v[0]} v={v} ch={ch} active={playing?.[0] === v[0]} onPlay={play} />)}
                  </div>
                  {concept.length > shown && <button onClick={() => setShown((n) => n + PAGE * 2)} className="mt-2 text-[12.5px] text-accent hover:underline">Show {Math.min(PAGE * 2, concept.length - shown)} more of {concept.length - shown}</button>}
                </div>
              )}

              {groups.length > 0 && (
                <div>
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-faint">Question walkthroughs, by problem</div>
                  <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
                    {groups.slice(0, Math.max(shown, 12)).map(({ p, vids }) => (
                      <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3.5 py-2.5">
                        <Link href={`/problem/${p.id}`} className="min-w-0 flex-1 truncate text-[13.5px] font-medium hover:text-accent">
                          <span className="num mr-1.5 text-faint">{p.lc}.</span>{p.title}{p.extra && <span className="ml-1.5 text-[10.5px] uppercase tracking-wider text-faint">extra</span>}
                        </Link>
                        <span className="text-[11px]" style={{ color: DIFF[p.diff].color }}>{DIFF[p.diff].label}</span>
                        <span className="flex flex-wrap gap-1">
                          {vids.map((v) => (
                            <button key={v[0]} onClick={() => play(v)} title={v[1]} className={cn("flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11.5px] transition", playing?.[0] === v[0] ? "border-accent/60 bg-accent/10 text-accent" : "border-line text-mute hover:border-accent/40 hover:text-text")}>
                              <Play size={10} fill="currentColor" />{ch[v[2]][0]}
                            </button>
                          ))}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {groups.length > Math.max(shown, 12) && <button onClick={() => setShown((n) => Math.max(n, 12) + PAGE * 2)} className="mt-2 text-[12.5px] text-accent hover:underline">Show more problems ({groups.length - Math.max(shown, 12)} left)</button>}
                </div>
              )}
              {!concept.length && !groups.length && <p className="text-[13px] text-faint">No video matches these filters.</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function Thumb({ v, ch, active, onPlay }: { v: Vid; ch: Chan[]; active: boolean; onPlay: (v: Vid) => void }) {
  return (
    <div className={cn("group relative overflow-hidden rounded-xl border transition", active ? "border-accent/70" : "border-line hover:border-[#3a4160]")}>
      <button onClick={() => onPlay(v)} aria-label={`Play: ${v[1]}`} className="block w-full text-left">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`https://i.ytimg.com/vi/${v[0]}/mqdefault.jpg`} alt="" loading="lazy" className="aspect-video w-full object-cover opacity-80 transition duration-300 group-hover:scale-[1.03] group-hover:opacity-100" />
        <span className="absolute inset-0 bg-gradient-to-t from-[#07080d] via-[#07080d]/40 to-transparent" />
        {v[3] && <span className="absolute left-2 top-2 rounded bg-black/70 px-1.5 py-0.5 text-[9.5px] text-mute">opens on YouTube</span>}
        <span className="absolute left-1/2 top-[38%] grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-accent/90 text-ink opacity-0 transition group-hover:opacity-100"><Play size={15} className="translate-x-px" fill="currentColor" /></span>
        <span className="absolute inset-x-0 bottom-0 p-2.5">
          <span className="line-clamp-2 text-[12px] font-medium leading-snug text-text">{v[1]}</span>
          <span className="mt-0.5 block truncate text-[10.5px] text-mute">{ch[v[2]][0]}{ch[v[2]][2] ? " · Hindi" : ""}</span>
        </span>
      </button>
      <a href={`https://www.youtube.com/watch?v=${v[0]}`} target="_blank" rel="noopener noreferrer" aria-label="Open on YouTube" className="absolute right-1.5 top-1.5 rounded-md bg-black/60 p-1 text-mute opacity-0 transition hover:text-text group-hover:opacity-100"><ExternalLink size={11} /></a>
    </div>
  );
}

/** All channels' walkthroughs of one problem: a player plus one chip per video. */
export function ProblemVideos({ lc }: { lc: number }) {
  const data = useVideoData(true);
  const [cur, setCur] = useState(0);
  const [picked, setPicked] = useState(false);
  if (!data) return null;
  const all = byChannel(data.lc[String(lc)] ?? [], data.channels);
  const vids = all.filter((v) => !v[3]), linkOnly = all.filter((v) => v[3]);
  if (!all.length) return null;
  const ch = data.channels;
  return (
    <div className="space-y-2">
      <div className="text-[11px] font-semibold uppercase tracking-widest text-faint">Walkthroughs · {all.length} channel{all.length > 1 ? "s" : ""}</div>
      {vids.length > 0 && <VideoEmbed key={vids[cur][0]} r={ref(vids[cur], ch)} autoplay={picked} compact />}
      {linkOnly.map((v) => <a key={v[0]} href={`https://www.youtube.com/watch?v=${v[0]}`} target="_blank" rel="noopener noreferrer" className="block text-[12.5px] text-mute underline hover:text-text">{ch[v[2]][0]}: {v[1]} (opens on YouTube; embedding disabled)</a>)}
      {vids.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {vids.map((v, i) => (
            <button key={v[0]} onClick={() => { setCur(i); setPicked(true); }} aria-pressed={i === cur} title={v[1]} className={cn("rounded-lg border px-2.5 py-1 text-[12px] transition", i === cur ? "border-accent/60 bg-accent/10 text-accent" : "border-line text-mute hover:text-text")}>
              {ch[v[2]][0]}{ch[v[2]][2] ? " · Hindi" : ""}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
