"use client";
// Pin a sticky note to page content rather than to raw pixels: the nearest content block is found
// again by index and a text fingerprint, so the note follows its paragraph when the layout reflows.

import type { Anchor } from "./types";

const SEL = "[data-read-block], h1, h2, h3, h4, p, li, pre, table, figure, img, blockquote, section, .card";

export const notesRoot = () => document.querySelector<HTMLElement>("main");

const fingerprint = (el: Element) => (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 64);

function candidates(root: HTMLElement): HTMLElement[] {
  // hidden elements stay in the list so indexes do not shift when an accordion opens
  return [...root.querySelectorAll<HTMLElement>(SEL)].filter((e) => !e.closest("[data-notes-layer]"));
}

/** Build an anchor for a viewport point. */
export function anchorAt(x: number, y: number): Anchor | null {
  const root = notesRoot();
  if (!root) return null;
  const r = root.getBoundingClientRect();
  const base: Anchor = { fx: Math.min(1, Math.max(0, (x - r.left) / r.width)), fy: y - r.top };
  const hit = document.elementsFromPoint(x, y).find((e) => !e.closest("[data-notes-layer]") && root.contains(e) && e !== root);
  const el = hit?.closest<HTMLElement>(SEL);
  if (!el || !root.contains(el)) return base;
  const list = candidates(root);
  const i = list.indexOf(el);
  if (i < 0) return base;
  const er = el.getBoundingClientRect();
  return { ...base, el: { i, fp: fingerprint(el), dx: er.width ? (x - er.left) / er.width : 0, dy: y - er.top } };
}

/** Where an anchor sits now, in px relative to the main column (top-left). */
export function resolveAnchor(a: Anchor, list?: HTMLElement[]): { x: number; y: number; exact: boolean } | null {
  const root = notesRoot();
  if (!root) return null;
  const r = root.getBoundingClientRect();
  if (a.el) {
    const els = list ?? candidates(root);
    let el: HTMLElement | undefined = els[a.el.i];
    if (!el || fingerprint(el) !== a.el.fp) el = a.el.fp ? els.find((e) => fingerprint(e) === a.el!.fp) : undefined;
    if (el && el.getClientRects().length > 0) {
      const er = el.getBoundingClientRect();
      return { x: er.left - r.left + a.el.dx * er.width, y: er.top - r.top + Math.min(a.el.dy, Math.max(er.height, 8)), exact: true };
    }
  }
  return { x: a.fx * r.width, y: a.fy, exact: false };
}

export const anchorList = () => { const root = notesRoot(); return root ? candidates(root) : []; };
