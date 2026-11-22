"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ChevronRight, FileText, FileUp, Globe, Image as ImageIcon, Inbox, Layers, Library as LibraryIcon, Mic, Pin, Search, StickyNote, Trash2, TriangleAlert } from "lucide-react";
import { useNotes } from "@/lib/notes/store";
import { buildTree, inScope, scopeKey, type Scope } from "@/lib/notes/hierarchy";
import { noteText, type PortalNote } from "@/lib/notes/types";
import { activeRun, loadRuns, useImports } from "@/lib/notes/import/runner";
import { TOPICS, topicById } from "@/content";
import { Empty, PageHead, cn } from "@/components/ui";
import { NoteCard } from "@/components/notes/NoteCard";
import { ImportStudio } from "@/components/notes/import/Studio";

type Filter = "all" | "sticky" | "imported" | "voice" | "image" | "web" | "flagged";
const FILTERS: { id: Filter; label: string; icon: typeof Pin; test: (n: PortalNote) => boolean }[] = [
  { id: "all", label: "All", icon: Layers, test: () => true },
  { id: "sticky", label: "Sticky", icon: StickyNote, test: (n) => n.kind === "sticky" },
  { id: "imported", label: "Imported", icon: FileText, test: (n) => n.kind === "imported" },
  { id: "voice", label: "Voice", icon: Mic, test: (n) => n.blocks.some((b) => b.t === "audio") },
  { id: "image", label: "Images", icon: ImageIcon, test: (n) => n.blocks.some((b) => b.t === "image") },
  { id: "web", label: "From the web", icon: Globe, test: (n) => !!n.web },
  { id: "flagged", label: "Flagged", icon: TriangleAlert, test: (n) => n.verify?.state === "flagged" },
];
const TOPIC_ORDER = new Map(TOPICS.map((t, i) => [t.id, i]));

function Row({ active, onClick, label, count, color, depth = 0, icon: Icon }: { active: boolean; onClick: () => void; label: string; count: number; color?: string; depth?: number; icon?: typeof Pin }) {
  return (
    <button onClick={onClick} className={cn("group flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition", active ? "bg-panel2 text-text" : "text-mute hover:bg-white/[0.03] hover:text-text")} style={{ paddingLeft: 10 + depth * 14 }}>
      {Icon ? <Icon size={13} className="shrink-0" style={color ? { color } : undefined} /> : <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color ?? "var(--color-faint)" }} />}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className="num text-[11px] text-faint">{count}</span>
    </button>
  );
}

function Library({ initialScope }: { initialScope: Scope }) {
  const ready = useNotes((s) => s.ready);
  const all = useNotes((s) => s.notes);
  const cloudMissing = useNotes((s) => s.cloudMissing);
  const [scope, setScope] = useState<Scope>(initialScope);
  const [trash, setTrash] = useState(false);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [openAreas, setOpenAreas] = useState<Set<string>>(new Set(initialScope.k === "topic" ? [topicById.get(initialScope.topic)?.area ?? ""] : []));
  const [openTopics, setOpenTopics] = useState<Set<string>>(new Set());
  const live = useMemo(() => Object.values(all).filter((n) => !n.deleted), [all]);
  const deleted = useMemo(() => Object.values(all).filter((n) => n.deleted).sort((a, b) => (b.deleted ?? 0) - (a.deleted ?? 0)), [all]);
  const tree = useMemo(() => buildTree(live), [live]);
  const ql = q.trim().toLowerCase();
  const shown = useMemo(() => (trash ? deleted : live)
    .filter((n) => trash || inScope(n, scope))
    .filter(FILTERS.find((f) => f.id === filter)!.test)
    .filter((n) => !ql || noteText(n).toLowerCase().includes(ql) || n.src?.doc.toLowerCase().includes(ql))
    .sort((a, b) => b.updated - a.updated), [trash, deleted, live, scope, filter, ql]);
  const groups = useMemo(() => {
    if (scope.k === "topic" || scope.k === "page" || trash) return [["", shown]] as [string, PortalNote[]][];
    const m = new Map<string, PortalNote[]>();
    for (const n of shown) { const k = n.topic && topicById.has(n.topic) ? n.topic : n.kind === "imported" ? "general" : "elsewhere"; m.set(k, [...(m.get(k) ?? []), n]); }
    return [...m].sort((a, b) => (TOPIC_ORDER.get(a[0]) ?? 999) - (TOPIC_ORDER.get(b[0]) ?? 999));
  }, [shown, scope, trash]);
  const pick = (s: Scope) => { setScope(s); setTrash(false); };
  const is = (s: Scope) => !trash && scopeKey(scope) === scopeKey(s);
  const toggle = (set: Set<string>, k: string, f: (s: Set<string>) => void) => { const n = new Set(set); if (n.has(k)) n.delete(k); else n.add(k); f(n); };
  const title = trash ? "Trash" : scope.k === "all" ? "All notes" : scope.k === "area" ? tree.areas.find((a) => a.id === scope.area)?.name : scope.k === "topic" ? topicById.get(scope.topic)?.title : scope.k === "page" ? tree.areas.flatMap((a) => a.topics.flatMap((t) => t.pages)).find((p) => p.page === scope.page)?.label ?? tree.elsewhere.find((p) => p.page === scope.page)?.label : scope.k === "general" ? "General / unclassified" : "Elsewhere in the portal";

  if (!ready) return <div className="grid h-64 place-items-center text-sm text-faint animate-pulse-soft">Opening your notes…</div>;
  if (!live.length && !deleted.length) return (
    <Empty title="No notes yet">
      <span className="block max-w-md">Press <kbd className="rounded border border-line px-1.5 text-[11px]">N</kbd> on any page, or the pin button at the bottom right, to stick a note anywhere: text, a pasted screenshot or a voice memo. Or import a document of notes you already have.</span>
    </Empty>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <aside className="lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:self-start lg:overflow-y-auto">
        <nav className="space-y-0.5 rounded-2xl border border-line bg-panel/40 p-2" aria-label="Notes by topic">
          <Row active={is({ k: "all" })} onClick={() => pick({ k: "all" })} label="All notes" count={tree.total} icon={LibraryIcon} />
          <div className="my-1.5 h-px bg-line/70" />
          {tree.areas.map((a) => (
            <div key={a.id}>
              <div className="flex items-center">
                <button onClick={() => toggle(openAreas, a.id, setOpenAreas)} aria-label={`Expand ${a.name}`} className="grid h-7 w-6 shrink-0 place-items-center text-faint hover:text-text"><ChevronRight size={13} className={cn("transition", openAreas.has(a.id) && "rotate-90")} /></button>
                <div className="min-w-0 flex-1"><Row active={is({ k: "area", area: a.id })} onClick={() => { pick({ k: "area", area: a.id }); setOpenAreas((s) => new Set(s).add(a.id)); }} label={a.name} count={a.count} color={a.color} /></div>
              </div>
              <AnimatePresence initial={false}>
                {openAreas.has(a.id) && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    {a.topics.map((t) => (
                      <div key={t.id}>
                        <div className="flex items-center pl-4">
                          {t.pages.length > 1 || (t.pages.length === 1 && t.pages[0].kind !== "article") ? <button onClick={() => toggle(openTopics, t.id, setOpenTopics)} aria-label={`Expand ${t.title}`} className="grid h-7 w-5 shrink-0 place-items-center text-faint hover:text-text"><ChevronRight size={12} className={cn("transition", openTopics.has(t.id) && "rotate-90")} /></button> : <span className="w-5" />}
                          <div className="min-w-0 flex-1"><Row active={is({ k: "topic", topic: t.id })} onClick={() => pick({ k: "topic", topic: t.id })} label={t.title} count={t.count} color={a.color} /></div>
                        </div>
                        {openTopics.has(t.id) && t.pages.map((p) => <Row key={p.page} active={is({ k: "page", page: p.page })} onClick={() => pick({ k: "page", page: p.page })} label={p.kind === "article" ? "Article" : p.label} count={p.count} depth={3} icon={p.kind === "problem" ? Pin : p.kind === "design" ? Layers : FileText} />)}
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
          {(tree.elsewhere.length > 0 || tree.general > 0) && <div className="my-1.5 h-px bg-line/70" />}
          {tree.general > 0 && <Row active={is({ k: "general" })} onClick={() => pick({ k: "general" })} label="General / unclassified" count={tree.general} icon={Inbox} />}
          {tree.elsewhere.length > 0 && <>
            <Row active={is({ k: "elsewhere" })} onClick={() => pick({ k: "elsewhere" })} label="Elsewhere" count={tree.elsewhere.reduce((s, p) => s + p.count, 0)} icon={Pin} />
            {tree.elsewhere.map((p) => <Row key={p.page} active={is({ k: "page", page: p.page })} onClick={() => pick({ k: "page", page: p.page })} label={p.label} count={p.count} depth={1} />)}
          </>}
          {deleted.length > 0 && <><div className="my-1.5 h-px bg-line/70" /><Row active={trash} onClick={() => setTrash(true)} label="Trash" count={deleted.length} icon={Trash2} /></>}
        </nav>
        {cloudMissing && <p className="mt-3 px-2 text-[11.5px] text-faint">Notes are saved on this device. Cloud sync starts once the notes table is deployed.</p>}
      </aside>

      <section className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h2 className="display min-w-0 flex-1 truncate text-xl font-semibold">{title}<span className="num ml-2 text-[14px] font-normal text-faint">{shown.length}</span></h2>
          <label className="flex h-9 w-full items-center gap-2 rounded-xl border border-line bg-panel px-3 text-[13px] focus-within:border-accent/50 sm:w-64">
            <Search size={14} className="text-faint" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search notes" aria-label="Search notes" className="w-full bg-transparent outline-none placeholder:text-faint" />
          </label>
        </div>
        <div className="mb-5 flex flex-wrap gap-1.5">
          {FILTERS.map((f) => { const n = (trash ? deleted : live).filter((x) => trash || inScope(x, scope)).filter(f.test).length; if (f.id !== "all" && !n) return null; return (
            <button key={f.id} onClick={() => setFilter(f.id)} className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12.5px] transition", filter === f.id ? "border-accent/50 bg-accent/10 text-text" : "border-line text-mute hover:text-text")}><f.icon size={12} />{f.label}<span className="num text-faint">{n}</span></button>); })}
        </div>
        {!shown.length ? <p className="rounded-2xl border border-dashed border-line px-6 py-12 text-center text-[13.5px] text-faint">{q ? "No note matches that search." : "No notes here yet."}</p> : (
          <div className="space-y-7">
            {groups.map(([k, ns]) => (
              <div key={k || "flat"}>
                {k && <div className="mb-2.5 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-widest text-faint">{k === "general" ? "General / unclassified" : k === "elsewhere" ? "Elsewhere" : topicById.get(k)?.title}<span className="num font-normal">{ns.length}</span></div>}
                <div className="columns-1 gap-3 xl:columns-2 [&>*]:mb-3 [&>*]:break-inside-avoid">{ns.map((n) => <NoteCard key={n.id} n={n} />)}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function NotesPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const tab = sp.get("tab") === "import" ? "import" : "library";
  const runId = sp.get("run");
  const topic = sp.get("topic");
  const initialScope: Scope = topic && topicById.has(topic) ? { k: "topic", topic } : sp.get("scope") === "general" ? { k: "general" } : { k: "all" };
  const runs = useImports((s) => s.runs);
  const live = useNotes((s) => s.notes);
  useEffect(() => { void loadRuns(); }, []);
  const act = activeRun(runs);
  const count = Object.values(live).filter((n) => !n.deleted).length;
  const go = (t: string, run?: string | null) => router.replace(`/notes${t === "import" ? `?tab=import${run ? `&run=${run}` : ""}` : ""}`, { scroll: false });
  return (
    <div className="space-y-6">
      <PageHead eyebrow="Your notes" title="Notes" sub="Sticky notes from every page and notes imported from your documents, by topic." />
      <div className="flex items-center gap-1 border-b border-line">
        {([["library", "Library", LibraryIcon, count], ["import", "Import a document", FileUp, 0]] as const).map(([id, label, Icon, n]) => (
          <button key={id} onClick={() => go(id, id === "import" ? act?.id : null)} className={cn("relative flex items-center gap-2 px-3.5 py-2.5 text-[13.5px] font-medium transition", tab === id ? "text-text" : "text-mute hover:text-text")}>
            <Icon size={15} />{label}{n ? <span className="num text-[11.5px] text-faint">{n}</span> : null}
            {id === "import" && act && <span className={cn("h-2 w-2 rounded-full", act.status === "waiting" ? "animate-pulse bg-warn" : act.status === "running" ? "animate-pulse bg-accent" : "bg-mute")} />}
            {tab === id && <motion.span layoutId="notes-tab" className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-accent" />}
          </button>
        ))}
      </div>
      {tab === "library" ? <Library key={topic ?? sp.get("scope") ?? "all"} initialScope={initialScope} /> : <ImportStudio runId={runId} setRunId={(id) => go("import", id)} />}
    </div>
  );
}

export default function Page() {
  return <Suspense><NotesPage /></Suspense>;
}
