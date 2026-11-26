"use client";
import { useEffect, useState } from "react";

/** [youtube id, display title, channel index, 1 when the owner disabled embedding (open on YouTube instead)] */
export type Vid = [yt: string, title: string, ch: number, noEmbed?: 1];
/** [display name, catalog file, hindi, named by the user] */
export type Chan = [name: string, file: string, hi: 0 | 1, mine: 0 | 1];
export interface VideoData { lc: Record<string, Vid[]>; pages: Record<string, Vid[]>; channels: Chan[] }

let cache: Promise<VideoData> | null = null;

/** The generated libraries (scripts/videos/build.ts), fetched once and only on pages that show videos. */
export function loadVideos(): Promise<VideoData> {
  cache ??= Promise.all([
    import("@/content/videos/lc.json").then((m) => m.default as unknown as Record<string, Vid[]>),
    import("@/content/videos/pages.json").then((m) => m.default as unknown as Record<string, Vid[]>),
    import("@/content/videos/channels.json").then((m) => m.default as unknown as Chan[]),
  ]).then(([lc, pages, channels]) => ({ lc, pages, channels }));
  return cache;
}

export function useVideoData(enabled = true): VideoData | null {
  const [d, setD] = useState<VideoData | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    loadVideos().then((x) => live && setD(x));
    return () => { live = false; };
  }, [enabled]);
  return d;
}

/** Order inside a group: the user's own channels first, then by channel, keeping each channel's upload order. */
export function byChannel(vs: Vid[], channels: Chan[]): Vid[] {
  return [...vs].sort((a, b) => (channels[b[2]][3] - channels[a[2]][3]) || a[2] - b[2]);
}
