import { AREAS, DESIGNS, EXTRA_PROBLEMS, PROBLEMS, TOPICS, subsOf } from "@/content";
import type { Area, Problem } from "@/lib/types";

/**
 * The curriculum as a tree: area › chapter › subtopic page › problems (curated first, extra after).
 * Built once; the component filters and renders it lazily.
 */
export type TNode = {
  id: string; // unique node id
  kind: "area" | "chapter" | "page" | "folder" | "problem" | "design";
  label: string;
  href?: string;
  area: Area;
  page?: string; // topic / subtopic id for page nodes (progress key t-<page>)
  item?: string; // progress key for problems and designs
  diff?: "E" | "M" | "H";
  extra?: boolean;
  revisable?: boolean;
  children?: TNode[];
};

const problemNode = (p: Problem): TNode => ({ id: `n:${p.id}`, kind: "problem", label: p.lc ? `${p.lc}. ${p.title}` : p.title, href: `/problem/${p.id}`, area: "dsa", item: p.id, diff: p.diff, extra: p.extra });
const byNum = (a: Problem, b: Problem) => (a.lc ?? 0) - (b.lc ?? 0);

function problemsFolder(id: string, list: Problem[], area: Area): TNode[] {
  if (!list.length) return [];
  const core = list.filter((p) => !p.extra).sort(byNum), extra = list.filter((p) => p.extra).sort(byNum);
  const more: TNode | null = extra.length ? { id: `${id}:extra`, kind: "folder", label: `More practice (${extra.length})`, area, children: extra.map(problemNode) } : null;
  if (!core.length) return more ? [more] : [];
  return [{ id: `${id}:problems`, kind: "folder", label: `Problems (${core.length})`, area, children: [...core.map(problemNode), ...(more ? [more] : [])] }];
}

export function buildTree(): TNode[] {
  const all = [...PROBLEMS, ...EXTRA_PROBLEMS];
  return AREAS.map((a) => ({
    id: `a:${a.id}`, kind: "area" as const, label: a.name, area: a.id,
    children: TOPICS.filter((t) => t.area === a.id).map((ch): TNode => {
      const subs = subsOf(ch.id);
      const inCh = all.filter((p) => p.topic === ch.id);
      const loose = inCh.filter((p) => !p.sub || !subs.some((s) => s.id === p.sub));
      const designs = DESIGNS.filter((d) => d.topic === ch.id).map((d): TNode => ({ id: `n:${d.id}`, kind: "design", label: d.title, href: `/design/${d.id}`, area: a.id, item: d.id }));
      return {
        id: `c:${ch.id}`, kind: "chapter", label: ch.title, href: `/learn/${ch.id}`, area: a.id, page: ch.id, revisable: !subs.length,
        children: [
          ...subs.map((s): TNode => ({ id: `p:${s.id}`, kind: "page", label: s.title, href: `/learn/${s.id}`, area: a.id, page: s.id, revisable: !!s.revise, children: problemsFolder(`p:${s.id}`, inCh.filter((p) => p.sub === s.id), a.id) })),
          ...problemsFolder(`c:${ch.id}`, loose, a.id),
          ...(designs.length ? [{ id: `c:${ch.id}:designs`, kind: "folder" as const, label: `Design exercises (${designs.length})`, area: a.id, children: designs }] : []),
        ],
      };
    }),
  }));
}

/** Every page id under a node, in order: what a Revise run walks through. */
export function pagesUnder(n: TNode, out: string[] = []): string[] {
  if ((n.kind === "page" || n.kind === "chapter") && n.page && n.revisable) out.push(n.page);
  for (const c of n.children ?? []) pagesUnder(c, out);
  return out;
}
