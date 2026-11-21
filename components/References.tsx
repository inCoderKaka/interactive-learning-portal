"use client";
import { useState } from "react";
import { BookOpen, ExternalLink, FileText, GraduationCap, ListVideo, Play, ScrollText, Wrench, type LucideIcon } from "lucide-react";
import { cn } from "./ui";
import type { Ref } from "@/lib/types";

const KIND: Record<Ref["kind"], { label: string; icon: LucideIcon }> = {
  video: { label: "Video", icon: Play },
  playlist: { label: "Playlist", icon: ListVideo },
  article: { label: "Article", icon: FileText },
  paper: { label: "Paper", icon: ScrollText },
  book: { label: "Book", icon: BookOpen },
  course: { label: "Course", icon: GraduationCap },
  tool: { label: "Interactive", icon: Wrench },
};

/** Thumbnail first; the YouTube player (and its scripts) only loads after a click. */
export function VideoEmbed({ r, autoplay = false, compact = false }: { r: Ref; autoplay?: boolean; compact?: boolean }) {
  const [play, setPlay] = useState(autoplay);
  return (
    <div className="relative aspect-video overflow-hidden rounded-2xl border border-line bg-black">
      {play ? (
        <iframe className="absolute inset-0 h-full w-full" src={`https://www.youtube-nocookie.com/embed/${r.yt}?autoplay=1&rel=0`} title={r.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
      ) : (
        <button onClick={() => setPlay(true)} aria-label={`Play video: ${r.title}`} className="group absolute inset-0 block text-left">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`https://i.ytimg.com/vi/${r.yt}/hqdefault.jpg`} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-70 transition duration-500 group-hover:scale-[1.03] group-hover:opacity-90" />
          <span className="absolute inset-0 bg-gradient-to-t from-[#07080d] via-[#07080d]/30 to-transparent" />
          <span className={cn("absolute left-1/2 top-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-accent text-ink shadow-[0_0_40px_-6px_var(--color-accent)] transition group-hover:scale-110", compact ? "h-11 w-11" : "h-14 w-14")}><Play size={compact ? 18 : 22} className="translate-x-0.5" fill="currentColor" /></span>
          <span className="absolute inset-x-0 bottom-0 p-4">
            <span className={cn("block font-semibold leading-snug text-text", compact ? "text-[13.5px]" : "text-[15px]")}>{r.title}</span>
            <span className="mt-0.5 block text-[12px] text-mute">{r.by} · plays here</span>
          </span>
        </button>
      )}
    </div>
  );
}

/** A player plus a strip of the topic's other videos; picking one swaps it into the player and starts it. */
function VideoGallery({ videos }: { videos: Ref[] }) {
  const [cur, setCur] = useState(0);
  const [picked, setPicked] = useState(false);
  return (
    <div className="space-y-2.5">
      <VideoEmbed key={videos[cur].yt} r={videos[cur]} autoplay={picked} />
      {videos.length > 1 && (
        <div className="flex snap-x gap-2 overflow-x-auto pb-1" role="tablist" aria-label="More videos">
          {videos.map((v, i) => (
            <button key={v.yt} role="tab" aria-selected={i === cur} onClick={() => { setCur(i); setPicked(true); }} title={`${v.title} · ${v.by}`}
              className={cn("group relative w-40 shrink-0 snap-start overflow-hidden rounded-xl border text-left transition", i === cur ? "border-accent/70 shadow-[0_0_20px_-8px_var(--color-accent)]" : "border-line opacity-75 hover:opacity-100")}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`https://i.ytimg.com/vi/${v.yt}/mqdefault.jpg`} alt="" loading="lazy" className="aspect-video w-full object-cover transition duration-300 group-hover:scale-105" />
              <span className="absolute inset-0 bg-gradient-to-t from-[#07080d] via-[#07080d]/40 to-transparent" />
              {i === cur && <span className="absolute left-2 top-2 rounded-md bg-accent px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-ink">Now</span>}
              <span className="absolute inset-x-0 bottom-0 p-2"><span className="line-clamp-2 text-[11.5px] font-medium leading-tight text-text">{v.title}</span><span className="block truncate text-[10px] text-mute">{v.by}</span></span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function RefLink({ r, className }: { r: Ref; className?: string }) {
  const k = KIND[r.kind], Icon = k.icon;
  return (
    <a href={r.url} target="_blank" rel="noopener noreferrer" className={cn("group flex items-center gap-3 rounded-xl border border-line bg-panel2 px-3.5 py-2.5 transition hover:border-[#3a4160]", className)}>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line text-mute transition group-hover:text-accent"><Icon size={15} /></span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] font-medium leading-snug">{r.title}</span>
        <span className="block truncate text-[11.5px] text-faint">{k.label} · {r.by}</span>
      </span>
      <ExternalLink size={13} className="shrink-0 text-faint transition group-hover:text-accent" />
    </a>
  );
}

/** "Go deeper" block. `embed` plays every video of the topic in place (a player plus a strip); everything else is a link. */
export function References({ refs, embed = false, columns = 2 }: { refs?: Ref[]; embed?: boolean; columns?: 1 | 2 }) {
  if (!refs?.length) return null;
  const videos = embed ? [...refs.filter((r) => r.featured && r.yt), ...refs.filter((r) => !r.featured && r.yt)] : [];
  const rest = refs.filter((r) => !videos.includes(r));
  const wide = columns === 2;
  return (
    <section className="card p-5">
      <div className="eyebrow">{videos.length ? "Watch and go deeper" : "Go deeper"}</div>
      <p className="mt-1 text-[13px] text-mute">{videos.length > 1 ? `${videos.length} videos that play right here, then further reading.` : videos.length ? "A video worth your time, then further reading and watching." : "Hand-picked references. Attempt it yourself first."}</p>
      {videos.length ? (
        <div className={cn("mt-4 grid items-start gap-3", wide && rest.length > 0 && "lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]")}>
          <VideoGallery videos={videos} />
          {rest.length > 0 && <div className={cn("grid gap-2", wide && "sm:grid-cols-2 lg:grid-cols-1")}>{rest.map((r) => <RefLink key={r.url} r={r} />)}</div>}
        </div>
      ) : (
        <div className={cn("mt-4 grid gap-2", wide && "sm:grid-cols-2")}>{rest.map((r) => <RefLink key={r.url} r={r} />)}</div>
      )}
    </section>
  );
}
