"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { BookOpen, Check, ChevronRight, FileText, Folder, FolderOpen, NotebookPen, PlayCircle, Search, Shapes, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { areaOf } from "@/content";
import { DIFF, cn } from "../ui";
import { buildTree, pagesUnder, type TNode } from "./model";

const OPEN_KEY = "ascent:tree:open";
export const RUN_KEY = "ascent:revise-run";
let TREE: TNode[] | null = null;
const tree = () => (TREE ??= buildTree());

/** Start a Revise run over a list of pages: the Revise view then offers "next sheet". */
export function startRun(ids: string[], label: string) {
  sessionStorage.setItem(RUN_KEY, JSON.stringify({ ids, label }));
}

type Flat = { n: TNode; depth: number; parent?: string };

/**
 * The whole curriculum as nested folders (WAI-ARIA tree view: arrows, Home/End, type-ahead).
 * Learn mode opens lessons; Revise mode opens revision sheets and can run through a whole folder.
 */
export function TopicTree({ current, compact = false, onNavigate }: { current?: string; compact?: boolean; onNavigate?: () => void }) {
  const progress = useStore((s) => s.progress);
  const blind = useStore((s) => s.settings.blind);
  const router = useRouter();
  const [mode, setMode] = useState<"learn" | "revise">("learn");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const [focus, setFocus] = useState<string>("");
  const rootRef = useRef<HTMLUListElement>(null);

  // restore expansion, and open the path to the current page
  useEffect(() => {
    let saved: string[] = [];
    try { saved = JSON.parse(localStorage.getItem(OPEN_KEY) ?? "[]"); } catch {}
    const s = new Set(saved);
    if (current) {
      const path = (ns: TNode[], trail: string[]): string[] | null => {
        for (const n of ns) {
          if (n.page === current || n.item === current) return trail;
          const r = n.children && path(n.children, [...trail, n.id]);
          if (r) return r;
        }
        return null;
      };
      for (const id of path(tree(), []) ?? []) s.add(id);
    }
    setOpen(s);
  }, [current]);
  const persist = (s: Set<string>) => { setOpen(s); localStorage.setItem(OPEN_KEY, JSON.stringify([...s].slice(-200))); };
  const toggle = (id: string, force?: boolean) => { const s = new Set(open); if (force ?? !s.has(id)) s.add(id); else s.delete(id); persist(s); };

  // filter: keep matching nodes and their ancestors; folders on the way are shown open
  const query = q.trim().toLowerCase();
  const visibleTree = useMemo(() => {
    // mode filter only: what this mode shows at all
    const allowed = (n: TNode) => !(n.kind === "problem" && (blind || mode === "revise")) && !((n.kind === "folder" || n.kind === "design") && mode === "revise");
    const prune = (n: TNode): TNode | null => {
      if (!allowed(n)) return null;
      const kids = (n.children ?? []).map(prune).filter(Boolean) as TNode[];
      return { ...n, children: kids.length ? kids : n.kind === "folder" ? [] : undefined };
    };
    // query filter: a matching node keeps its whole (mode-filtered) subtree; otherwise keep it only for matching descendants
    const keep = (n: TNode): TNode | null => {
      if (!allowed(n)) return null;
      if (query && n.label.toLowerCase().includes(query)) return prune(n);
      const kids = (n.children ?? []).map(keep).filter(Boolean) as TNode[];
      if (query && !kids.length) return null;
      return { ...n, children: kids.length ? kids : n.kind === "folder" ? [] : undefined };
    };
    return tree().map(keep).filter(Boolean) as TNode[];
  }, [query, blind, mode]);

  const matches = (n: TNode) => !!query && n.label.toLowerCase().includes(query);
  const isOpen = (n: TNode) => open.has(n.id) || (!!query && !matches(n) && !!n.children?.length);
  const flat = useMemo(() => {
    const out: Flat[] = [];
    const walk = (ns: TNode[], depth: number, parent?: string) => { for (const n of ns) { out.push({ n, depth, parent }); if (n.children?.length && isOpen(n)) walk(n.children, depth + 1, n.id); } };
    walk(visibleTree, 1);
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleTree, open, query]);

  const status = (n: TNode) => {
    const key = n.item ?? (n.page ? `t-${n.page}` : "");
    return key ? progress[key]?.status : undefined;
  };
  const counts = useMemo(() => {
    const m = new Map<string, [number, number]>();
    const walk = (n: TNode): [number, number] => {
      let d = 0, t = 0;
      if (n.kind === "page" || n.kind === "chapter" || (n.kind === "problem" && !n.extra) || n.kind === "design") { t = 1; d = status(n) === "done" ? 1 : 0; }
      for (const c of n.children ?? []) { const [cd, ct] = walk(c); d += cd; t += ct; }
      m.set(n.id, [d, t]);
      return [d, t];
    };
    tree().forEach(walk);
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress]);

  const hrefOf = (n: TNode) => (mode === "revise" && n.page ? `/learn/${n.page}#revise` : n.href);
  const go = (n: TNode) => { const h = hrefOf(n); if (h) { router.push(h); onNavigate?.(); } };
  const runFolder = (n: TNode) => {
    const ids = pagesUnder(n);
    if (!ids.length) return;
    startRun(ids, n.label);
    router.push(`/learn/${ids[0]}#revise`);
    onNavigate?.();
  };

  const focusIdx = Math.max(0, flat.findIndex((f) => f.n.id === focus));
  useEffect(() => {
    if (!focus) return;
    rootRef.current?.querySelector<HTMLElement>(`[data-node="${CSS.escape(focus)}"]`)?.focus();
  }, [focus]);
  const typed = useRef({ s: "", t: 0 });
  const onKey = (e: KeyboardEvent) => {
    const f = flat[focusIdx];
    if (!f) return;
    const move = (i: number) => { e.preventDefault(); const t = flat[Math.max(0, Math.min(flat.length - 1, i))]; if (t) setFocus(t.n.id); };
    if (e.key === "ArrowDown") move(focusIdx + 1);
    else if (e.key === "ArrowUp") move(focusIdx - 1);
    else if (e.key === "Home") move(0);
    else if (e.key === "End") move(flat.length - 1);
    else if (e.key === "ArrowRight") { e.preventDefault(); if (f.n.children?.length) { if (!isOpen(f.n)) toggle(f.n.id, true); else move(focusIdx + 1); } }
    else if (e.key === "ArrowLeft") { e.preventDefault(); if (f.n.children?.length && isOpen(f.n)) toggle(f.n.id, false); else if (f.parent) setFocus(f.parent); }
    else if (e.key === "Enter") { e.preventDefault(); if (hrefOf(f.n)) go(f.n); else if (f.n.children) toggle(f.n.id); }
    else if (e.key.length === 1 && /\S/.test(e.key) && !e.metaKey && !e.ctrlKey) {
      const now = Date.now();
      typed.current = { s: (now - typed.current.t < 600 ? typed.current.s : "") + e.key.toLowerCase(), t: now };
      const order = [...flat.slice(focusIdx + 1), ...flat.slice(0, focusIdx + 1)];
      const hit = order.find((x) => x.n.label.toLowerCase().startsWith(typed.current.s));
      if (hit) setFocus(hit.n.id);
    }
  };

  return (
    <div className={cn("flex min-h-0 flex-col", compact ? "text-[13px]" : "text-[14px]")}>
      <div className="flex items-center gap-2 pb-2.5">
        <div className="flex rounded-lg border border-line p-0.5 text-[12px]" role="group" aria-label="Tree mode">
          {(["learn", "revise"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} aria-pressed={mode === m} className={cn("flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition", mode === m ? "bg-panel2 text-text" : "text-mute hover:text-text")}>
              {m === "learn" ? <BookOpen size={12} /> : <NotebookPen size={12} />}{m === "learn" ? "Learn" : "Revise"}
            </button>
          ))}
        </div>
        <label className="flex h-8 min-w-0 flex-1 items-center gap-1.5 rounded-lg border border-line px-2 text-mute focus-within:border-accent/50">
          <Search size={13} className="shrink-0" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={blind ? "Filter pages" : "Filter pages and problems"} aria-label="Filter the tree" className="min-w-0 flex-1 bg-transparent text-[12.5px] text-text outline-none placeholder:text-faint" />
          {q && <button onClick={() => setQ("")} aria-label="Clear filter"><X size={12} /></button>}
        </label>
      </div>
      {mode === "revise" && <p className="pb-2 text-[11.5px] leading-snug text-faint">Pages open on their revision sheet. Use ▶ on a folder to run through all its sheets in order.</p>}
      {blind && mode === "learn" && <p className="pb-2 text-[11.5px] leading-snug text-faint">Problems are hidden while blind mode is on.</p>}

      <ul ref={rootRef} role="tree" aria-label="Curriculum" onKeyDown={onKey} className="min-h-0 overflow-y-auto pr-1">
        {flat.map(({ n, depth }, i) => {
          const kids = !!n.children?.length;
          const opened = kids && isOpen(n);
          const [d, t] = counts.get(n.id) ?? [0, 0];
          const st = status(n);
          const here = current && (n.page === current || n.item === current);
          const color = areaOf(n.area).color;
          const Icon = n.kind === "area" ? Shapes : n.kind === "folder" || n.kind === "chapter" ? (opened ? FolderOpen : Folder) : n.kind === "page" ? FileText : null;
          const href = hrefOf(n);
          const label = (
            <span className={cn("min-w-0 flex-1 truncate", n.kind === "area" && "font-semibold", here && "text-accent", n.extra && "text-mute")}>{n.label}</span>
          );
          return (
            <li key={n.id} role="treeitem" aria-level={depth} aria-expanded={kids ? opened : undefined} aria-selected={!!here} aria-current={here ? "page" : undefined}
              data-node={n.id} tabIndex={(focus ? n.id === focus : i === 0) ? 0 : -1} onFocus={() => setFocus(n.id)}
              className="group outline-none">
              <div className={cn("flex items-center gap-1 rounded-lg py-[5px] pr-1.5 transition group-focus-visible:ring-1 group-focus-visible:ring-accent/60", here ? "bg-accent/10" : "hover:bg-white/[0.035]")} style={{ paddingLeft: 4 + (depth - 1) * 14 }}>
                {kids ? (
                  <button tabIndex={-1} onClick={() => toggle(n.id)} aria-label={opened ? "Collapse" : "Expand"} className="grid h-5 w-5 shrink-0 place-items-center rounded text-faint hover:text-text">
                    <ChevronRight size={13} className={cn("transition", opened && "rotate-90")} />
                  </button>
                ) : <span className="w-5 shrink-0" />}
                {n.kind === "problem" ? (
                  <span className={cn("grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full border", st === "done" ? "border-ok bg-ok text-ink" : "border-line")} style={st === "done" ? undefined : { borderColor: DIFF[n.diff!].color + "99" }}>{st === "done" && <Check size={9} strokeWidth={3} />}</span>
                ) : Icon ? <Icon size={14} className="shrink-0" style={{ color: n.kind === "area" ? color : st === "done" ? "var(--color-ok)" : undefined }} /> : null}
                {href ? <Link tabIndex={-1} href={href} onClick={onNavigate} className="flex min-w-0 flex-1 items-center gap-1.5 pl-1">{label}</Link>
                  : <button tabIndex={-1} onClick={() => toggle(n.id)} className="flex min-w-0 flex-1 items-center gap-1.5 pl-1 text-left">{label}</button>}
                {mode === "revise" && kids && <button tabIndex={-1} onClick={() => runFolder(n)} title={`Revise every sheet in “${n.label}” in order`} className="shrink-0 text-faint opacity-0 transition hover:text-accent group-hover:opacity-100"><PlayCircle size={14} /></button>}
                {kids && t > 0 && n.kind !== "folder" && <span className="num shrink-0 text-[10.5px] text-faint">{d}/{t}</span>}
                {kids && n.kind === "folder" && <span className="num shrink-0 text-[10.5px] text-faint">{n.children!.length}</span>}
                {!kids && st === "done" && n.kind !== "problem" && <Check size={12} className="shrink-0 text-ok" />}
              </div>
            </li>
          );
        })}
        {!flat.length && <li className="px-2 py-6 text-center text-[12.5px] text-faint">Nothing matches “{q}”.</li>}
      </ul>
    </div>
  );
}
