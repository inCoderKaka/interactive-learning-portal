"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CalendarRange, Check, Cloud, Download, EyeOff, FileUp, KeyRound, LogOut, PlugZap, RefreshCw, Trash2, UserRound } from "lucide-react";
import { useStore } from "@/lib/store";
import { chat, getKeys, listModels, setKeys, type Keys, type Provider } from "@/lib/ai";
import { parsePractice, type ImportResult } from "@/lib/importer";
import { cloudEnabled } from "@/lib/supabase";
import { LANGS, Spinner } from "@/components/Work";
import { Button, PageHead, Pill, cn } from "@/components/ui";
import type { Settings } from "@/lib/types";

const PROVIDERS: { id: Provider; name: string; note: string; keyLabel: string; keyHint: string; modelField: "geminiModel" | "claudeModel" | "localModel" }[] = [
  { id: "gemini", name: "Gemini", note: "Google AI Studio key. A free tier is available.", keyLabel: "Gemini API key", keyHint: "aistudio.google.com → Get API key", modelField: "geminiModel" },
  { id: "claude", name: "Claude", note: "Anthropic API key, called directly from this browser.", keyLabel: "Claude API key", keyHint: "console.anthropic.com → API keys", modelField: "claudeModel" },
  { id: "local", name: "local-server", note: "Your own OpenAI-compatible server (/v1/chat/completions).", keyLabel: "Access key (optional)", keyHint: "Sent as a Bearer token", modelField: "localModel" },
];
const input = "h-10 w-full rounded-xl border border-line bg-bg px-3 text-sm outline-none focus:border-accent/60";

function Section({ id, icon: Icon, title, sub, children }: { id?: string; icon: typeof Cloud; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="card scroll-mt-20 p-6">
      <div className="flex items-center gap-2.5"><span className="grid h-8 w-8 place-items-center rounded-lg bg-panel2 text-accent"><Icon size={16} /></span><h2 className="display text-lg font-semibold">{title}</h2></div>
      {sub && <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-mute">{sub}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function SettingsPage() {
  const s = useStore();
  const { settings, setSettings } = s;
  const [keys, setK] = useState<Keys>({ gemini: "", claude: "", local: "" });
  const [models, setModels] = useState<string[]>([]);
  const [test, setTest] = useState<{ state: "idle" | "busy" | "ok" | "bad"; msg: string }>({ state: "idle", msg: "" });
  const [imp, setImp] = useState<{ res: ImportResult; name: string } | null>(null);
  const [impDone, setImpDone] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => { setK(getKeys()); }, []);
  useEffect(() => { setModels([]); setTest({ state: "idle", msg: "" }); }, [settings.provider]);

  const prov = PROVIDERS.find((p) => p.id === settings.provider)!;
  const saveKey = (v: string) => { const next = { ...keys, [prov.id]: v.trim() }; setK(next); setKeys(next); };
  const insecureLocal = settings.provider === "local" && typeof window !== "undefined" && window.location.protocol === "https:" && /^http:\/\/(?!localhost|127\.0\.0\.1)/.test(settings.localUrl);

  const runTest = async () => {
    setTest({ state: "busy", msg: "" });
    try {
      const reply = await chat(settings, "Reply with exactly: ready", [{ role: "user", content: "ping" }], { maxTokens: 40 });
      setTest({ state: "ok", msg: `Connected. The model replied “${reply.trim().slice(0, 60)}”.` });
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      setTest({ state: "bad", msg: /failed to fetch|networkerror|load failed/i.test(m) ? `${m}. The browser could not reach the server: check the URL, that the server allows cross-origin requests from this site, and (for local-server) that this device is on the same network.` : m });
    }
  };
  const loadModels = async () => {
    setTest({ state: "busy", msg: "" });
    try {
      const list = await listModels(settings, settings.provider);
      setModels(list);
      if (list.length && !settings[prov.modelField]) setSettings({ [prov.modelField]: list[0] } as Partial<Settings>);
      setTest({ state: "ok", msg: `${list.length} models available.` });
    } catch (e) { setTest({ state: "bad", msg: e instanceof Error ? e.message : String(e) }); }
  };

  const onFile = async (f?: File) => {
    if (!f) return;
    setImpDone("");
    setImp({ res: parsePractice(await f.text()), name: f.name });
  };
  const doImport = () => {
    if (!imp) return;
    s.importPractice(imp.res.notes, imp.res.custom, imp.res.known);
    setImpDone(`Imported ${imp.res.known.length} problems. They are queued for review today, because having solved something once is not the same as being able to solve it now.`);
    setImp(null);
  };
  const exportData = () => {
    const blob = new Blob([JSON.stringify({ settings: s.settings, progress: s.progress, activity: s.activity, notes: s.notes, custom: s.custom, attempts: s.attempts, exportedAt: new Date().toISOString() }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `ascent-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHead eyebrow="Make it yours" title="Settings" />

      <Section icon={UserRound} title="You">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-[13px] text-mute">What should we call you?
            <input className={cn(input, "mt-1.5")} value={settings.name} onChange={(e) => setSettings({ name: e.target.value })} placeholder="First name" />
          </label>
          <label className="block text-[13px] text-mute">Interview language
            <select className={cn(input, "mt-1.5")} value={settings.lang} onChange={(e) => setSettings({ lang: e.target.value as Settings["lang"] })}>{LANGS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}</select>
          </label>
        </div>
        <Link href="/roadmap" className="mt-4 inline-flex items-center gap-2 text-[13.5px] text-accent hover:underline"><CalendarRange size={15} />Timeline: {settings.weeks} weeks at {settings.hoursPerDay} h/day, {settings.daysPerWeek} days a week. Change it on the roadmap.</Link>
      </Section>

      <Section id="ai" icon={KeyRound} title="AI reviewer" sub="Used to verify your code, grade design answers, play the mock interviewer and generate new variations. Keys are stored only in this browser and sent only to the provider you pick; they are never saved to your account or to our server.">
        <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="AI provider">
          {PROVIDERS.map((p) => (
            <button key={p.id} role="radio" aria-checked={settings.provider === p.id} onClick={() => setSettings({ provider: p.id })}
              className={cn("rounded-xl border p-3.5 text-left transition", settings.provider === p.id ? "border-accent/60 bg-accent/5" : "border-line bg-panel2 hover:border-[#3a4160]")}>
              <div className="flex items-center justify-between text-sm font-semibold">{p.name}{(p.id === "local" ? settings.localUrl && settings.localModel : keys[p.id]) ? <Check size={14} className="text-ok" /> : null}</div>
              <div className="mt-1 text-[12px] leading-snug text-mute">{p.note}</div>
            </button>
          ))}
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {settings.provider === "local" && (
            <label className="block text-[13px] text-mute sm:col-span-2">Server URL
              <input className={cn(input, "mt-1.5 font-mono")} value={settings.localUrl} onChange={(e) => setSettings({ localUrl: e.target.value.trim() })} placeholder="https://my-machine.tailnet.ts.net" spellCheck={false} />
            </label>
          )}
          <label className="block text-[13px] text-mute">{prov.keyLabel}
            <input className={cn(input, "mt-1.5 font-mono")} type="password" autoComplete="off" value={keys[prov.id]} onChange={(e) => saveKey(e.target.value)} placeholder="Paste key" />
            <span className="mt-1 block text-[11.5px] text-faint">{prov.keyHint}</span>
          </label>
          <label className="block text-[13px] text-mute">Model
            <input className={cn(input, "mt-1.5 font-mono")} list="model-list" value={settings[prov.modelField]} onChange={(e) => setSettings({ [prov.modelField]: e.target.value.trim() } as Partial<Settings>)} placeholder={settings.provider === "local" ? "Load models to pick one" : ""} spellCheck={false} />
            <datalist id="model-list">{models.map((m) => <option key={m} value={m} />)}</datalist>
            <span className="mt-1 block text-[11.5px] text-faint">Stronger models catch more bugs; fast ones are fine for hints.</span>
          </label>
        </div>
        {insecureLocal && <p className="mt-4 rounded-xl border border-warn/30 bg-warn/10 p-3 text-[13px] leading-relaxed text-warn">This page is served over HTTPS, so the browser will block a plain <code>http://</code> address unless it is <code>localhost</code>. Use the server&apos;s HTTPS address (for Tailscale, the <code>https://…ts.net</code> name), or run this portal locally.</p>}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button variant="primary" disabled={test.state === "busy"} onClick={runTest}>{test.state === "busy" ? <Spinner label="Working" /> : <><PlugZap size={15} />Test connection</>}</Button>
          <Button disabled={test.state === "busy"} onClick={loadModels}><RefreshCw size={15} />Load available models</Button>
        </div>
        {test.msg && <p role="status" className={cn("mt-3 rounded-xl border p-3 text-[13px] leading-relaxed", test.state === "ok" ? "border-ok/30 bg-ok/10 text-ok" : "border-bad/30 bg-bad/10 text-bad")}>{test.msg}</p>}
      </Section>

      <Section icon={EyeOff} title="Practice conditions" sub="Defaults that keep practice honest. You can still toggle blind mode on any problem.">
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-panel2 p-4">
          <input type="checkbox" checked={settings.blind} onChange={(e) => setSettings({ blind: e.target.checked })} className="mt-1 accent-[var(--color-accent)]" />
          <span><span className="block text-sm font-semibold">Blind mode</span><span className="block text-[13px] leading-relaxed text-mute">Hide the topic of every problem. Knowing it is “a sliding window question” is half the solution, and the interview never tells you.</span></span>
        </label>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-[13px] text-mute">Focus session <span className="num font-semibold text-text">{settings.focusMin} min</span>
            <input type="range" min={10} max={60} step={5} value={settings.focusMin} onChange={(e) => setSettings({ focusMin: +e.target.value })} className="mt-2 w-full" />
          </label>
          <label className="block text-[13px] text-mute">Break <span className="num font-semibold text-text">{settings.breakMin} min</span>
            <input type="range" min={3} max={20} value={settings.breakMin} onChange={(e) => setSettings({ breakMin: +e.target.value })} className="mt-2 w-full" />
          </label>
        </div>
      </Section>

      <Section icon={FileUp} title="Import your practice notes" sub="Upload a Markdown file of problems you have already practised (headings like “## [200: Number of Islands](link)”). Matching problems get your notes attached; others are added as your own problems under the closest topic.">
        <input ref={file} type="file" accept=".md,.markdown,.txt,text/markdown,text/plain" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
        <button onClick={() => file.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files?.[0]); }}
          className="grid w-full place-items-center rounded-2xl border border-dashed border-line px-6 py-9 text-center transition hover:border-accent/50 hover:bg-accent/[0.03]">
          <FileUp size={22} className="text-accent" /><span className="mt-2 text-sm font-medium">Choose a Markdown file or drop it here</span><span className="mt-1 text-[12px] text-faint">Parsed in your browser. Embedded images are skipped.</span>
        </button>
        {imp && (
          <div className="mt-4 rounded-xl border border-accent/30 bg-accent/5 p-4">
            <div className="text-sm font-semibold">{imp.name}</div>
            {imp.res.known.length ? (
              <>
                <div className="mt-2 flex flex-wrap gap-2"><Pill color="var(--color-accent)">{imp.res.known.length} problems found</Pill><Pill color="var(--color-dsa)">{imp.res.matched} match the curriculum</Pill><Pill color="var(--color-lld)">{imp.res.custom.length} new</Pill><Pill className="border-line text-mute">{Object.keys(imp.res.notes).length} with notes</Pill></div>
                <div className="mt-3 flex gap-2"><Button variant="primary" onClick={doImport}>Import</Button><Button variant="ghost" onClick={() => setImp(null)}>Cancel</Button></div>
              </>
            ) : <p className="mt-1 text-[13px] text-mute">No problem headings were found in this file. Each problem needs a heading that is a link, for example <code>## [200: Number of Islands](https://…)</code>.</p>}
          </div>
        )}
        {impDone && <p role="status" className="mt-4 rounded-xl border border-ok/30 bg-ok/10 p-3 text-[13px] text-ok">{impDone}</p>}
        {s.custom.length > 0 && <p className="mt-3 text-[12.5px] text-faint">{s.custom.length} of your own problems are in the curriculum.</p>}
      </Section>

      <Section icon={Cloud} title="Account and data">
        {s.user ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-panel2 p-4">
            <div><div className="text-sm font-semibold">{s.user.email}</div><div className="text-[12.5px] text-mute">{s.syncing ? "Syncing…" : s.syncError ? `Sync problem: ${s.syncError}` : "Progress, notes and reviews are saved to your account."}</div></div>
            <Button onClick={() => s.signOut()}><LogOut size={15} />Sign out</Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-line p-4">
            <div className="text-[13.5px] text-mute">{cloudEnabled ? "You are in guest mode: everything is saved in this browser only." : "Cloud sync is not configured for this deployment. Everything is saved in this browser."}</div>
            {cloudEnabled && <Link href="/login"><Button variant="primary">Sign in to sync</Button></Link>}
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={exportData}><Download size={15} />Download a backup</Button>
          {confirmReset ? (
            <span className="flex items-center gap-2 text-[13px] text-bad">Erase all progress on this device{s.user ? " (your account copy stays)" : ""}?<Button size="sm" variant="danger" onClick={() => { s.resetAll(); setConfirmReset(false); }}>Yes, erase</Button><Button size="sm" variant="ghost" onClick={() => setConfirmReset(false)}>Keep it</Button></span>
          ) : <Button variant="danger" onClick={() => setConfirmReset(true)}><Trash2 size={15} />Reset this device</Button>}
        </div>
      </Section>
    </div>
  );
}
