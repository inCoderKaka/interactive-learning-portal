"use client";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, ArrowRight, Check, Copy, Eye, FileWarning, Pencil, RefreshCw, Sparkles, Wand2, X, Zap } from "lucide-react";
import { areaOf, topicById } from "@/content";
import { useStore } from "@/lib/store";
import { getAi } from "@/lib/interview/tasks";
import { backgroundRun, resumeRun, type RunRecord } from "@/lib/notes/import/runner";
import { ledger, renderDraft, type Draft, type ImportState, type StepId } from "@/lib/notes/import/pipeline";
import { Button, Md, cn } from "@/components/ui";
import { WebAdditions } from "../NoteCard";
import { TopicSelect } from "./Plan";
import { Ribbon } from "./parts";

type Tab = "pages" | "look" | "dups" | "left" | "failed";

function DraftView({ s, d }: { s: ImportState; d: Draft }) {
  const { parts } = renderDraft(s, d);
  return (
    <div className="space-y-2">
      {parts.map((p, i) => p.t === "md"
        ? <Md key={i} className="note-md text-[13px] leading-relaxed">{p.md}</Md>
        // eslint-disable-next-line @next/next/no-img-element
        : p.block.src ? <img key={i} src={p.block.src} alt={p.block.alt ?? ""} className="max-h-56 rounded-xl border border-line object-contain" /> : null)}
    </div>
  );
}

function DraftCard({ s, d, set, dev, picked, pick }: { s: ImportState; d: Draft; set: (p: Partial<Draft>) => void; dev: boolean; picked: boolean; pick: () => void }) {
  const [edit, setEdit] = useState(false);
  const [src, setSrc] = useState(false);
  const [md, setMd] = useState(d.md);
  const [title, setTitle] = useState(d.title);
  const sec = s.doc.sections.find((x) => x.id === d.section);
  const tp = d.topic ? topicById.get(d.topic) : undefined;
  const color = tp ? areaOf(tp.area).color : "var(--color-mute)";
  const off = !d.accepted;
  return (
    <motion.div layout="position" className={cn("relative overflow-hidden rounded-2xl border bg-panel/70 transition", off ? "border-dashed border-line opacity-60" : "border-line")}>
      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: color }} />
      <div className="py-3 pl-5 pr-3">
        <div className="flex items-start gap-2">
          {dev && <input type="checkbox" checked={picked} onChange={pick} aria-label="Select for re-run" className="mt-1.5 accent-[var(--color-ai)]" />}
          <div className="min-w-0 flex-1">
            <div className="truncate text-[11px] text-faint">{sec?.path.join(" › ")}</div>
            {edit ? <input value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Title" className="mt-1 h-8 w-full rounded-lg border border-line bg-bg px-2 text-[14px] font-semibold outline-none" />
              : <div className="text-[14px] font-semibold leading-snug">{d.title}</div>}
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-1">
            {d.verify?.state === "ok" && <span className="inline-flex items-center gap-1 rounded-full bg-ok/10 px-1.5 py-0.5 text-[10.5px] text-ok"><Check size={10} />Verified</span>}
            {d.verify?.state === "fixed" && <span title={d.verify.issues.join(" · ")} className="inline-flex items-center gap-1 rounded-full bg-hld/10 px-1.5 py-0.5 text-[10.5px] text-hld"><Wand2 size={10} />Fixed</span>}
            {d.verify?.state === "flagged" && <span title={d.verify.issues.join(" · ")} className="inline-flex items-center gap-1 rounded-full bg-warn/10 px-1.5 py-0.5 text-[10.5px] text-warn"><AlertTriangle size={10} />Flagged</span>}
            {d.origin === "verbatim" && <span className="rounded-full bg-lld/10 px-1.5 py-0.5 text-[10.5px] text-lld">Kept as written</span>}
            {(d.origin === "recover" || d.origin === "deep") && <span className="rounded-full bg-ai/10 px-1.5 py-0.5 text-[10.5px] text-ai">Recovered</span>}
            {d.web && <span className="inline-flex items-center gap-1 rounded-full bg-hld/10 px-1.5 py-0.5 text-[10.5px] text-hld"><Sparkles size={10} />Web</span>}
            {d.dupOf && <span className="inline-flex items-center gap-1 rounded-full bg-panel2 px-1.5 py-0.5 text-[10.5px] text-mute"><Copy size={10} />{d.dupOf.startsWith("note:") ? "Imported before" : `Same as ${s.drafts[d.dupOf]?.title ?? "another note"}`}{d.sim ? ` · ${Math.round(d.sim * 100)}%` : ""}</span>}
          </div>
        </div>
        <div className="mt-2">
          {edit ? <textarea value={md} onChange={(e) => setMd(e.target.value)} rows={Math.min(16, md.split("\n").length + 2)} aria-label="Note text" className="w-full resize-y rounded-lg border border-line bg-bg px-2.5 py-2 font-mono text-[12px] leading-relaxed outline-none" />
            : <DraftView s={s} d={d} />}
          {d.verify?.state === "flagged" && !!d.verify.issues.length && <p className="mt-1.5 text-[12px] text-warn/90">{d.verify.issues.join(" · ")}</p>}
          {d.web && !edit && <div className="mt-2"><WebAdditions web={{ ...d.web }} /></div>}
          <AnimatePresence>{src && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden"><div className="mt-2 max-h-56 overflow-y-auto whitespace-pre-wrap rounded-xl border border-line bg-bg p-2.5 font-mono text-[11px] leading-relaxed text-faint"><div className="mb-1 font-sans text-[10.5px] uppercase tracking-widest">Source</div>{d.covers.map((b) => s.doc.blocks[b]?.kind === "image" ? "[image]" : s.doc.blocks[b]?.md).join("\n\n") || "No source blocks listed"}{d.verify?.original && <><div className="mb-1 mt-3 font-sans text-[10.5px] uppercase tracking-widest">Before the fix</div>{d.verify.original}</>}</div></motion.div>}</AnimatePresence>
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <TopicSelect value={d.topic} onChange={(v) => set({ topic: v })} className="w-[200px]" />
          <button onClick={() => setSrc((x) => !x)} className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[12px] text-mute hover:bg-white/5 hover:text-text"><Eye size={12} />Source</button>
          {edit ? <button onClick={() => { set({ md, title: title.trim() || d.title, edited: true }); setEdit(false); }} className="inline-flex h-8 items-center gap-1 rounded-lg bg-accent px-2.5 text-[12px] font-semibold text-ink"><Check size={12} />Done</button>
            : <button onClick={() => setEdit(true)} className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[12px] text-mute hover:bg-white/5 hover:text-text"><Pencil size={12} />Edit</button>}
          {d.verify?.state === "fixed" && d.verify.original && <button onClick={() => set({ md: d.verify!.original!, verify: { ...d.verify!, state: "flagged", issues: ["Kept your original wording"], original: undefined } })} className="inline-flex h-8 items-center rounded-lg px-2 text-[12px] text-mute hover:text-text">Use original</button>}
          <button onClick={() => set({ accepted: !d.accepted, ...(d.dupOf && !d.accepted ? { dupOf: null } : {}) })} className={cn("ml-auto inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-[12px]", d.accepted ? "border-line text-mute hover:border-bad/40 hover:text-bad" : "border-accent/40 text-accent")}>{d.accepted ? <><X size={12} />Leave out</> : <><Check size={12} />{d.dupOf ? "Keep anyway" : "Include"}</>}</button>
        </div>
      </div>
    </motion.div>
  );
}

export function DraftsReview({ run, phase }: { run: RunRecord; phase: "first" | "extract" | "verify" | "enrich" | "final" }) {
  const s = run.cp.state;
  const dev = getAi(useStore((x) => x.settings)).devMode;
  const [drafts, setDrafts] = useState<Record<string, Draft>>(s.drafts);
  const [tab, setTab] = useState<Tab>("pages");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [rerun, setRerun] = useState<StepId>("verify");
  const st = useMemo(() => ({ ...s, drafts }), [s, drafts]);
  const l = useMemo(() => ledger(st), [st]);
  const all = Object.values(drafts);
  const final = phase === "final";
  const lists: Record<Tab, Draft[]> = useMemo(() => ({
    pages: all.filter((d) => !d.dupOf && (d.accepted || !final)),
    look: all.filter((d) => !d.dupOf && (d.verify?.state === "flagged" || d.origin === "verbatim" || (s.plan[d.section]?.conf ?? 1) < 0.6 || !d.accepted)),
    dups: all.filter((d) => d.dupOf),
    left: [],
    failed: [],
  }), [all, final, s.plan]);
  const leftOut = Object.entries(s.dropped).filter(([b]) => l.byBlock[b] === "dropped");
  const groups = useMemo(() => {
    const m = new Map<string, Draft[]>();
    for (const d of lists[tab]) m.set(d.topic ?? "general", [...(m.get(d.topic ?? "general") ?? []), d]);
    return [...m];
  }, [lists, tab]);
  const set = (id: string, p: Partial<Draft>) => setDrafts((x) => ({ ...x, [id]: { ...x[id], ...p } }));
  const accepted = all.filter((d) => d.accepted && !d.dupOf);
  const pages = new Set(accepted.map((d) => d.topic ?? "general")).size;
  const include = (b: string) => {
    const sec = s.doc.sections.find((x) => x.blocks.includes(b))!;
    const blk = s.doc.blocks[b];
    const id = `u${Object.keys(drafts).length + 1}`;
    setDrafts((x) => ({ ...x, [id]: { id, section: sec.id, topic: s.plan[sec.id]?.topic ?? null, title: `${sec.title} (kept as written)`, md: blk.kind === "code" || blk.kind === "table" || blk.kind === "image" ? `[[${b}]]` : blk.md, covers: [b], origin: "verbatim", accepted: true } }));
  };
  const tabs: [Tab, string, number][] = [["pages", final ? "Ready" : "Notes so far", lists.pages.length], ["look", "Needs a look", lists.look.length], ["dups", "Duplicates", lists.dups.length], ["left", "Left out", leftOut.length], ["failed", "Failed", s.failures.length]];

  return (
    <div className="space-y-5">
      <div>
        <div className="eyebrow text-accent">{final ? "Final review" : "Checkpoint"}</div>
        <h2 className="display mt-1 text-2xl font-semibold">{final ? `${accepted.length} notes for ${pages} page${pages === 1 ? "" : "s"}` : phase === "first" ? "Here are the first notes" : `${all.length} notes so far`}</h2>
        <p className="mt-1 text-[13.5px] text-mute">{final ? "Edit, move or leave out anything, then add them. You can undo the whole import later." : "If these look right, continue. Your edits are kept. Spot a pattern you dislike? Adjust the prompt in developer mode before continuing."}</p>
      </div>
      <div className="rounded-2xl border border-line bg-panel/50 p-4"><Ribbon state={final ? { ...st, ledger: l } : st} live={!final} /></div>

      <div className="flex flex-wrap gap-1.5">
        {tabs.filter(([k, , n]) => k === "pages" || n > 0).map(([k, label, n]) => <button key={k} onClick={() => setTab(k)} className={cn("rounded-full border px-3 py-1 text-[12.5px]", tab === k ? "border-accent/50 bg-accent/10 text-text" : "border-line text-mute hover:text-text")}>{label} <span className="num text-faint">{n}</span></button>)}
      </div>

      {tab === "left" ? (
        <div className="space-y-2">
          <p className="text-[12.5px] text-faint">The model chose to leave these blocks out. Include any you want to keep: they go in exactly as written.</p>
          {leftOut.map(([b, why]) => (
            <div key={b} className="flex items-start gap-3 rounded-xl border border-line bg-panel/60 p-3">
              <FileWarning size={15} className="mt-0.5 shrink-0 text-lld" />
              <div className="min-w-0 flex-1"><div className="line-clamp-3 font-mono text-[11.5px] text-mute">{s.doc.blocks[b].md}</div><div className="mt-1 text-[11.5px] text-faint">Why: {why}</div></div>
              <Button size="sm" onClick={() => include(b)}>Include</Button>
            </div>
          ))}
        </div>
      ) : tab === "failed" ? (
        <div className="space-y-2">
          {s.failures.map((f, i) => <div key={i} className="rounded-xl border border-bad/30 bg-bad/[0.06] p-3 text-[12.5px]"><span className="font-medium text-bad">{f.step}</span> <span className="text-mute">failed for {f.ids.length} item{f.ids.length > 1 ? "s" : ""}: {f.error}</span></div>)}
          {final && <Button onClick={() => resumeRun(run.id, { drafts, rerun: s.failures[0].step })}><RefreshCw size={14} />Retry {s.failures[0].step}</Button>}
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(([t, ds]) => {
            const tp = topicById.get(t);
            return (
              <div key={t}>
                <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-widest" style={{ color: tp ? areaOf(tp.area).color : "var(--color-mute)" }}>{tp?.title ?? "General / unclassified"}<span className="num font-normal text-faint">{ds.length}</span></div>
                <div className="space-y-2.5">{ds.map((d) => <DraftCard key={d.id} s={st} d={d} dev={dev} picked={picked.has(d.section)} pick={() => setPicked((p) => { const n = new Set(p); if (n.has(d.section)) n.delete(d.section); else n.add(d.section); return n; })} set={(p) => set(d.id, p)} />)}</div>
              </div>
            );
          })}
          {!groups.length && <p className="py-6 text-center text-[13px] text-faint">Nothing here.</p>}
        </div>
      )}

      {dev && final && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-dashed border-ai/40 bg-ai/[0.04] p-3 text-[12.5px]">
          <span className="text-ai">Developer:</span>
          <span className="text-mute">re-run</span>
          <select value={rerun} onChange={(e) => setRerun(e.target.value as StepId)} className="h-8 rounded-lg border border-line bg-bg px-2 outline-none">{(["map", "extract", "dedup", "verify", "enrich", "coverage"] as StepId[]).map((x) => <option key={x} value={x}>{x}</option>)}</select>
          <span className="text-mute">on {picked.size ? `${picked.size} selected section${picked.size > 1 ? "s" : ""}` : "failed items"}</span>
          <Button size="sm" className="ml-auto" onClick={() => resumeRun(run.id, { drafts, rerun, sections: [...picked] })}><RefreshCw size={13} />Re-run</Button>
        </div>
      )}

      <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-accent/30 bg-panel/95 p-3 shadow-2xl backdrop-blur">
        <span className="text-[12.5px] text-mute">{final ? `${l.covered + l.skipped}/${l.total} blocks accounted for${l.missing + l.weak ? ` · ${l.missing + l.weak} need a look` : ""}` : `${accepted.length} notes kept`}</span>
        {!final && <Button className="ml-auto" onClick={() => { backgroundRun(run.id); resumeRun(run.id, { drafts }); }}><Zap size={14} />Finish in the background</Button>}
        <Button variant="primary" className={final ? "ml-auto" : ""} onClick={() => resumeRun(run.id, { drafts })}>{final ? <>Add {accepted.length} notes<ArrowRight size={15} /></> : <>Continue<ArrowRight size={15} /></>}</Button>
      </div>
    </div>
  );
}
