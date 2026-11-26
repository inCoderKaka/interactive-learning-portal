import type { Quiz, Ref } from "@/lib/types";

/**
 * The body of one subtopic page (its id, title, tier and minutes come from content/outline.ts).
 *
 * lesson  — the Learn page: markdown with :::callouts, [[widget:id]] visuals and [[yt:id|title|channel]] videos.
 *           Shape: intuition → definitions → mechanism with a dry run → why it works → complexity
 *           → implementation traps → variants and disguises → interview angles → connections.
 * revise  — the Revise sheet, one screen. Lines "? prompt :: answer" become hidden-answer recall items;
 *           everything else (tables, the template) renders as plain markdown.
 * notes   — the cheat sheet under the recall items (collapsed by default): plain lines, one fact per line, that together
 *           bring the whole Learn page back to mind. "## Heading" lines group them.
 * doubts  — questions learners actually get stuck on, answered in full.
 * problems — LeetCode numbers that belong on this page (portal problems and extra pages alike).
 */
export interface Deep {
  blurb: string;
  signals: string[];
  lesson: string;
  revise: string;
  notes?: string;
  doubts: [q: string, a: string][];
  pitfalls: string[];
  quiz: Quiz[];
  template?: string;
  sources: Ref[];
  widgets?: string[];
  problems?: number[];
  prereq?: string[];
}

/** Source helpers: S.paper("title", "authors", url) etc. Keeps the content files compact. */
export const S = {
  paper: (title: string, by: string, url: string): Ref => ({ kind: "paper", title, by, url }),
  book: (title: string, by: string, url: string): Ref => ({ kind: "book", title, by, url }),
  article: (title: string, by: string, url: string): Ref => ({ kind: "article", title, by, url }),
  course: (title: string, by: string, url: string): Ref => ({ kind: "course", title, by, url }),
  tool: (title: string, by: string, url: string): Ref => ({ kind: "tool", title, by, url }),
};
