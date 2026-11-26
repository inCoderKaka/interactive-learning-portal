import { AREAS, EXTRA_PROBLEMS, PROBLEMS, TOPICS, subsOf } from "@/content";
import type { Area } from "@/lib/types";

/**
 * The curriculum as a tree: area › chapter › subtopic page. Problems and design exercises live on their pages, not here.
 * Built once; the component filters and renders it lazily.
 */
export type TNode = {
  id: string; // unique node id
  kind: "area" | "chapter" | "page";
  label: string;
  href?: string;
  area: Area;
  page?: string; // topic / subtopic id for page nodes (progress key t-<page>)
  revisable?: boolean;
  children?: TNode[];
};

export function buildTree(): TNode[] {
  return AREAS.map((a) => ({
    id: `a:${a.id}`, kind: "area" as const, label: a.name, area: a.id,
    children: TOPICS.filter((t) => t.area === a.id).map((ch): TNode => {
      const subs = subsOf(ch.id);
      return {
        id: `c:${ch.id}`, kind: "chapter", label: ch.title, href: `/learn/${ch.id}`, area: a.id, page: ch.id, revisable: !subs.length,
        children: subs.length ? subs.map((s): TNode => ({ id: `p:${s.id}`, kind: "page", label: s.title, href: `/learn/${s.id}`, area: a.id, page: s.id, revisable: !!s.deepFile || !!s.revise })) : undefined,
      };
    }),
  }));
}

/** The page a problem belongs to, so a problem page can highlight its place in the tree. */
export function pageOfProblem(id: string): string | undefined {
  const p = PROBLEMS.find((x) => x.id === id) ?? EXTRA_PROBLEMS.find((x) => x.id === id);
  if (!p) return undefined;
  return p.sub && subsOf(p.topic).some((s) => s.id === p.sub) ? p.sub : p.topic;
}

/** Every page id under a node, in order: what a Revise run walks through. */
export function pagesUnder(n: TNode, out: string[] = []): string[] {
  if ((n.kind === "page" || n.kind === "chapter") && n.page && n.revisable) out.push(n.page);
  for (const c of n.children ?? []) pagesUnder(c, out);
  return out;
}
