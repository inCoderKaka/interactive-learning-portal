"use client";
// Developer mode: view and override prompt fragments per task, with versions, history and reset (MI-DEV-4).
import { useState } from "react";
import { Download, History, RotateCcw, Save, Upload } from "lucide-react";
import { Button, cn } from "@/components/ui";
import { TEMPLATES, checkOverride, type Override, type Overrides } from "@/lib/interview/core/templates";
import type { AiSettings } from "@/lib/interview/tasks";

const HISTORY = 10;

export function PromptOverrides({ ai, save }: { ai: AiSettings; save: (p: Partial<AiSettings>) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const groups = [...new Set(TEMPLATES.map((t) => t.group))];

  const commit = (id: string, text: string) => {
    const cur = ai.prompts[id];
    const hist = cur ? [cur, ...(ai.promptHistory[id] ?? [])].slice(0, HISTORY) : ai.promptHistory[id] ?? [];
    const next: Override = { text, version: (cur?.version ?? (ai.promptHistory[id]?.[0]?.version ?? 0)) + 1, at: Date.now() };
    save({ prompts: { ...ai.prompts, [id]: next }, promptHistory: { ...ai.promptHistory, [id]: hist } });
    setDraft((d) => { const n = { ...d }; delete n[id]; return n; });
  };
  const reset = (id: string) => {
    const cur = ai.prompts[id];
    const prompts = { ...ai.prompts };
    delete prompts[id];
    save({ prompts, promptHistory: cur ? { ...ai.promptHistory, [id]: [cur, ...(ai.promptHistory[id] ?? [])].slice(0, HISTORY) } : ai.promptHistory });
    setDraft((d) => { const n = { ...d }; delete n[id]; return n; });
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ prompts: ai.prompts, promptHistory: ai.promptHistory }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "ascent-prompt-overrides.json"; a.click();
  };
  const importJson = async (f: File) => {
    try {
      const j = JSON.parse(await f.text()) as { prompts?: Overrides; promptHistory?: AiSettings["promptHistory"] };
      const known = new Set(TEMPLATES.map((t) => t.id));
      const prompts = Object.fromEntries(Object.entries(j.prompts ?? {}).filter(([k, v]) => known.has(k) && typeof v?.text === "string"));
      save({ prompts: { ...ai.prompts, ...prompts }, promptHistory: { ...ai.promptHistory, ...(j.promptHistory ?? {}) } });
      setMsg(`Imported ${Object.keys(prompts).length} override${Object.keys(prompts).length === 1 ? "" : "s"}.`);
    } catch (e) { setMsg(`Not a prompt export: ${e instanceof Error ? e.message : e}`); }
  };

  const count = Object.keys(ai.prompts).length;
  return (
    <div className="overflow-hidden rounded-xl border border-line">
      <div className="flex flex-wrap items-center gap-3 border-b border-line bg-panel2 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold">Prompt templates</div>
          <div className="text-[12px] text-mute">Each override replaces one fragment, so fixes to the others still reach you. {count ? `${count} override${count > 1 ? "s" : ""} active.` : "All defaults."} Scorecards record which versions were used.</div>
        </div>
        <Button size="sm" variant="ghost" onClick={exportJson}><Download size={13} />Export</Button>
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] text-mute hover:text-text"><Upload size={13} />Import<input type="file" accept="application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importJson(f); e.target.value = ""; }} /></label>
      </div>
      {msg && <p className="border-b border-line px-4 py-2 text-[12px] text-mute">{msg}</p>}
      {groups.map((g) => (
        <div key={g}>
          <div className="border-b border-line px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-faint">{g}</div>
          {TEMPLATES.filter((t) => t.group === g).map((t) => {
            const o = ai.prompts[t.id];
            const isOpen = open === t.id;
            const text = draft[t.id] ?? o?.text ?? t.text;
            const chk = checkOverride(t.id, text);
            const dirty = text !== (o?.text ?? t.text);
            const hist = ai.promptHistory[t.id] ?? [];
            return (
              <div key={t.id} className="border-b border-line last:border-0">
                <button onClick={() => setOpen(isOpen ? null : t.id)} aria-expanded={isOpen} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-white/[0.02]">
                  <span className="min-w-0 flex-1 text-[13px]">{t.label} <span className="ml-1 font-mono text-[11px] text-faint">{t.id}</span></span>
                  <span className="font-mono text-[11px] text-faint">default v{t.version}</span>
                  {o && <span className="rounded-full border border-warn/40 px-2 text-[10.5px] text-warn">override v{o.version}</span>}
                </button>
                {isOpen && (
                  <div className="space-y-2.5 px-4 pb-4">
                    {t.vars.length > 0 && <p className="text-[11.5px] text-faint">Placeholders: {t.vars.map((v) => <code key={v} className="mr-1.5 rounded bg-panel2 px-1">{`{{${v}}}`}</code>)}</p>}
                    <textarea value={text} onChange={(e) => setDraft((d) => ({ ...d, [t.id]: e.target.value }))} rows={Math.min(14, Math.max(4, text.split("\n").length + 1))} spellCheck={false}
                      className={cn("w-full resize-y rounded-lg border bg-bg p-3 font-mono text-[12px] leading-relaxed outline-none focus:border-accent/60", o ? "border-warn/40" : "border-line")} aria-label={`Prompt for ${t.label}`} />
                    {(chk.unknown.length > 0 || chk.missing.length > 0) && (
                      <p className="text-[12px] text-warn">{chk.unknown.length > 0 && `Unknown placeholders (left as typed): ${chk.unknown.join(", ")}. `}{chk.missing.length > 0 && `Not used: ${chk.missing.join(", ")}; that information will not reach the model.`}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      <Button size="sm" variant="primary" disabled={!dirty || !text.trim()} onClick={() => commit(t.id, text)}><Save size={13} />Save as v{(o?.version ?? hist[0]?.version ?? 0) + 1}</Button>
                      {dirty && <Button size="sm" variant="ghost" onClick={() => setDraft((d) => { const n = { ...d }; delete n[t.id]; return n; })}>Discard edits</Button>}
                      {o && <Button size="sm" variant="ghost" onClick={() => reset(t.id)}><RotateCcw size={13} />Reset to default</Button>}
                    </div>
                    {hist.length > 0 && (
                      <details className="text-[12px] text-mute">
                        <summary className="flex cursor-pointer items-center gap-1.5"><History size={12} />Earlier versions ({hist.length})</summary>
                        <ul className="mt-2 space-y-2">{hist.map((h) => (
                          <li key={`${h.version}-${h.at}`} className="rounded-lg border border-line p-2">
                            <div className="mb-1 flex items-center justify-between"><span className="font-mono text-[11px]">v{h.version} · {new Date(h.at).toLocaleString()}</span><button className="text-accent hover:underline" onClick={() => setDraft((d) => ({ ...d, [t.id]: h.text }))}>Load into editor</button></div>
                            <pre className="max-h-24 overflow-auto whitespace-pre-wrap font-mono text-[11px] text-faint">{h.text}</pre>
                          </li>
                        ))}</ul>
                      </details>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
