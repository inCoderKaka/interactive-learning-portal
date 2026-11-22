// Where a note belongs in the Notes tab: area → topic → page, or "elsewhere" / "general".

import { AREAS, TOPICS, designById, problemById, topicById } from "@/content";
import type { Area } from "@/lib/types";
import type { PortalNote } from "./types";

const ORDER = new Map(TOPICS.map((t, i) => [t.id, i]));

export interface PageInfo { topic: string | null; label: string; kind: "article" | "problem" | "design" | "page" }

const PAGES: Record<string, string> = {
  "/": "Today", "/roadmap": "Roadmap", "/learn": "Learn map", "/review": "Review", "/play": "Play",
  "/mock": "Mock interviews", "/progress": "Progress", "/settings": "Settings", "/notes": "Notes",
};

/** Resolve a route to its topic and a human label. */
export function pageInfo(path: string): PageInfo {
  const [, seg, id] = path.split("?")[0].split("/");
  if (seg === "learn" && id) { const t = topicById.get(id); return { topic: t?.id ?? null, label: t?.title ?? id, kind: "article" }; }
  if (seg === "problem" && id) { const p = problemById.get(id); return { topic: p?.topic ?? null, label: p?.title ?? id, kind: "problem" }; }
  if (seg === "design" && id) { const d = designById.get(id); return { topic: d?.topic ?? null, label: d?.title ?? id, kind: "design" }; }
  return { topic: null, label: PAGES["/" + (seg ?? "")] ?? path, kind: "page" };
}

export type Scope =
  | { k: "all" }
  | { k: "area"; area: Area }
  | { k: "topic"; topic: string }
  | { k: "page"; page: string }
  | { k: "elsewhere" }
  | { k: "general" };

export const scopeKey = (s: Scope) => (s.k === "area" ? `area:${s.area}` : s.k === "topic" ? `topic:${s.topic}` : s.k === "page" ? `page:${s.page}` : s.k);

export function inScope(n: PortalNote, s: Scope): boolean {
  const t = n.topic ? topicById.get(n.topic) : undefined;
  switch (s.k) {
    case "all": return true;
    case "area": return t?.area === s.area;
    case "topic": return n.topic === s.topic;
    case "page": return n.kind === "sticky" && n.page === s.page;
    case "elsewhere": return n.kind === "sticky" && !n.topic;
    case "general": return n.kind === "imported" && !n.topic;
  }
}

export interface TreeTopic { id: string; title: string; count: number; pages: { page: string; label: string; count: number; kind: PageInfo["kind"] }[] }
export interface TreeArea { id: Area; name: string; color: string; count: number; topics: TreeTopic[] }

/** The hierarchy pane: only branches that hold notes, in curriculum order. */
export function buildTree(notes: PortalNote[]) {
  const byTopic = new Map<string, PortalNote[]>();
  const elsewhere = new Map<string, number>();
  let general = 0;
  for (const n of notes) {
    if (n.topic && topicById.has(n.topic)) byTopic.set(n.topic, [...(byTopic.get(n.topic) ?? []), n]);
    else if (n.kind === "imported") general++;
    else elsewhere.set(n.page, (elsewhere.get(n.page) ?? 0) + 1);
  }
  const areas: TreeArea[] = AREAS.map((a) => {
    const topics: TreeTopic[] = [];
    for (const [id, ns] of byTopic) {
      const t = topicById.get(id)!;
      if (t.area !== a.id) continue;
      const pages = new Map<string, { label: string; count: number; kind: PageInfo["kind"] }>();
      for (const n of ns) {
        if (n.kind !== "sticky") continue;
        const info = pageInfo(n.page);
        const cur = pages.get(n.page) ?? { label: info.label, count: 0, kind: info.kind };
        cur.count++;
        pages.set(n.page, cur);
      }
      topics.push({ id, title: t.title, count: ns.length, pages: [...pages].map(([page, v]) => ({ page, ...v })).sort((x, y) => (x.kind === "article" ? -1 : y.kind === "article" ? 1 : x.label.localeCompare(y.label))) });
    }
    topics.sort((x, y) => (ORDER.get(x.id) ?? 0) - (ORDER.get(y.id) ?? 0));
    return { id: a.id, name: a.name, color: a.color, count: topics.reduce((s, t) => s + t.count, 0), topics };
  }).filter((a) => a.count > 0);
  return { areas, elsewhere: [...elsewhere].map(([page, count]) => ({ page, label: pageInfo(page).label, count })), general, total: notes.length };
}
