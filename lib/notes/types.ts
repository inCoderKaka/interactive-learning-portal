// Portal notes: sticky notes the learner pins anywhere, and notes imported from a document.
// One shape for both so the Notes tab, sync and search treat them alike.

export type NoteKind = "sticky" | "imported";
export type NoteColor = "lime" | "teal" | "blue" | "amber" | "pink" | "violet";

export const NOTE_COLORS: { id: NoteColor; hex: string; name: string }[] = [
  { id: "lime", hex: "#c8f547", name: "Lime" },
  { id: "teal", hex: "#4fd1c5", name: "Teal" },
  { id: "blue", hex: "#7aa7ff", name: "Blue" },
  { id: "amber", hex: "#ffb454", name: "Amber" },
  { id: "pink", hex: "#ff8fb3", name: "Pink" },
  { id: "violet", hex: "#b794f4", name: "Violet" },
];
export const colorHex = (c: NoteColor | undefined) => NOTE_COLORS.find((x) => x.id === c)?.hex ?? NOTE_COLORS[0].hex;

export type NoteBlock =
  | { id: string; t: "text"; md: string }
  | { id: string; t: "image"; media: string; w?: number; h?: number; alt?: string }
  | { id: string; t: "audio"; media: string; dur: number; peaks: number[] };

/**
 * Where a sticky note sits. `el` points at the nearest content block (its index among anchorable
 * elements plus a text fingerprint, so it survives small layout changes); `fx`/`fy` is the fallback
 * position relative to the page's main column when that block can no longer be found.
 */
export interface Anchor {
  el?: { i: number; fp: string; dx: number; dy: number };
  fx: number; // 0..1 of the main column's width
  fy: number; // px from the top of the main column
}

export interface WebSource { url: string; title: string }
export interface Enrichment {
  md: string;                 // additions, written separately from the learner's own text
  sources: WebSource[];
  corrections?: { claim: string; fix: string; source?: string }[];
  at: number;
}

export interface Verification {
  state: "ok" | "fixed" | "flagged";
  issues: string[];
  original?: string; // the text before an automatic fix, so it can be restored
}

export interface NoteSource {
  run: string;        // import run id
  doc: string;        // document name
  path: string[];     // heading path inside the document
  blocks: string[];   // source block ids this note covers
  hash: string;       // content hash of those blocks
  section?: string;   // content hash of the whole section, so a re-import skips it
}

export interface PortalNote {
  id: string;
  kind: NoteKind;
  page: string;        // route the sticky lives on, e.g. "/learn/sliding-window"; "" for imported
  topic: string | null; // topic id for the hierarchy; null = general / unclassified
  title?: string;
  blocks: NoteBlock[];
  color: NoteColor;
  anchor?: Anchor;
  src?: NoteSource;
  verify?: Verification;
  web?: Enrichment;
  created: number;
  updated: number;
  deleted?: number;    // tombstone, so deletions sync
}

export const liveNotes = (ns: Iterable<PortalNote>) => [...ns].filter((n) => !n.deleted);

export const noteText = (n: PortalNote) =>
  [n.title ?? "", ...n.blocks.map((b) => (b.t === "text" ? b.md : b.t === "image" ? b.alt ?? "" : ""))].join("\n").trim();

export const uid = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));
