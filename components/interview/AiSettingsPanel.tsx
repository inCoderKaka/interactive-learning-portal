"use client";
import { useEffect, useState } from "react";
import { RefreshCw, RotateCcw } from "lucide-react";
import { Button, cn } from "@/components/ui";
import type { Settings } from "@/lib/types";
import { CAPABILITY_WHY, capabilities, listModels, type Capabilities, type GenParams } from "@/lib/interview/providers/llm";
import { PRESETS, TASKS, getAi, profileFor, providerReady, resolved, type AiSettings, type PresetId, type TaskId, type TaskProfile } from "@/lib/interview/tasks";
import { BUCKETS, totalOf, type Bucket, type Budgets } from "@/lib/interview/core/usage";
import { onSpend, resetMonth, spendThisMonth } from "@/lib/interview/meter";
import { PromptOverrides } from "./PromptOverrides";

const BUCKET_LABEL: Record<Bucket, string> = { realtime: "Realtime voice", "ascent-voice": "Ascent Voice", text: "Text rounds", agora: "Agora", other: "Other AI (reviews, hints, scorecards outside a round)" };

function BudgetPanel({ ai, save }: { ai: AiSettings; save: (p: Partial<AiSettings>) => void }) {
  const [spent, setSpent] = useState<ReturnType<typeof spendThisMonth>>({});
  useEffect(() => { setSpent(spendThisMonth()); return onSpend(() => setSpent(spendThisMonth())); }, []);
  const setB = (k: keyof Budgets, v: number) => save({ budgets: { ...ai.budgets, [k]: v }, ...(k === "total" ? { budgetUsd: v } : {}) });
  const rows: (keyof Budgets)[] = ["total", "realtime", "ascent-voice", "text", "agora"];
  return (
    <div className="space-y-3 rounded-xl border border-line bg-panel2 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-[13px] font-semibold">Cost guard</div>
        <span className="text-[12px] text-mute">This month, estimated: <b className="num text-text">${totalOf(spent).toFixed(2)}</b> <button className="ml-2 text-faint underline-offset-2 hover:underline" onClick={() => { resetMonth(); setSpent({}); }}>reset</button></span>
      </div>
      <p className="text-[12px] leading-relaxed text-mute">Estimates from token counts and minutes at approximate list prices, kept in this browser only. Your provider&apos;s bill is the source of truth.</p>
      <div className="grid gap-2 sm:grid-cols-5">{rows.map((k) => (
        <label key={k} className={label}>{k === "total" ? "All AI, per month" : BUCKET_LABEL[k as Bucket]} (USD)
          <input type="number" min={0} step={1} className={cn(field, "mt-1 font-mono")} value={ai.budgets[k] || ""} placeholder="no limit" onChange={(e) => setB(k, Math.max(0, +e.target.value || 0))} />
          <span className="mt-0.5 block text-[11px] text-faint">${(k === "total" ? totalOf(spent) : spent[k as Bucket] ?? 0).toFixed(2)} used</span>
        </label>
      ))}</div>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-[12.5px] text-mute">
        <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={ai.costGuard.enforce} onChange={(e) => save({ costGuard: { ...ai.costGuard, enforce: e.target.checked } })} className="accent-[var(--color-accent)]" />When a budget is used up, switch to a cheaper engine (realtime → Ascent Voice → text), even mid-round</label>
        <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={ai.costGuard.cheapNearLimit} onChange={(e) => save({ costGuard: { ...ai.costGuard, cheapNearLimit: e.target.checked } })} className="accent-[var(--color-accent)]" />From 80% of a budget, run rounds on the small model (the scorecard keeps its strong model)</label>
      </div>
      {spent.other ? <p className="text-[11.5px] text-faint">{BUCKETS.filter((b) => spent[b]).map((b) => `${BUCKET_LABEL[b]} $${(spent[b] ?? 0).toFixed(2)}`).join(" · ")}</p> : null}
    </div>
  );
}

const field = "h-9 w-full rounded-lg border border-line bg-bg px-2.5 text-[13px] outline-none focus:border-accent/60 disabled:opacity-40";
const label = "block text-[12px] text-mute";

function Num({ name, value, onChange, step = 0.05, min, max, disabled, why }: { name: string; value?: number; onChange: (v?: number) => void; step?: number; min?: number; max?: number; disabled?: boolean; why?: string }) {
  return (
    <label className={label} title={disabled ? why : undefined}>{name}
      <input type="number" className={cn(field, "mt-1 font-mono")} value={value ?? ""} step={step} min={min} max={max} disabled={disabled} placeholder="default" onChange={(e) => onChange(e.target.value === "" ? undefined : +e.target.value)} />
    </label>
  );
}

export function AiSettingsPanel({ settings, setSettings }: { settings: Settings; setSettings: (p: Partial<Settings>) => void }) {
  const ai = getAi(settings);
  const save = (p: Partial<AiSettings>) => setSettings({ ai: { ...ai, ...p } });
  const [voices, setVoices] = useState<string[]>([]);
  const [rtModels, setRtModels] = useState<string[]>([]);
  const [msg, setMsg] = useState("");
  const [open, setOpen] = useState<TaskId | null>("interviewer.turn");

  useEffect(() => {
    if (typeof speechSynthesis === "undefined") return;
    const load = () => setVoices(speechSynthesis.getVoices().filter((v) => v.lang.startsWith("en")).map((v) => v.name));
    load();
    speechSynthesis.addEventListener("voiceschanged", load);
    return () => speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);

  const loadRt = async () => {
    setMsg("");
    try {
      const list = await listModels(settings, ai.realtime.provider, "realtime");
      setRtModels(list);
      setMsg(`${list.length} realtime models available.`);
    } catch (e) { setMsg(e instanceof Error ? e.message : String(e)); }
  };

  const setTask = (t: TaskId, p: Partial<TaskProfile> & { params?: GenParams }) => {
    const cur = ai.tasks[t] ?? {};
    save({ tasks: { ...ai.tasks, [t]: { ...cur, ...p, params: { ...(cur.params ?? {}), ...(p.params ?? {}) } } } });
  };
  const resetTask = (t: TaskId) => { const next = { ...ai.tasks }; delete next[t]; save({ tasks: next }); };
  const rtProv = ai.realtime.provider;

  return (
    <div className="space-y-6">
      <div>
        <div className="eyebrow mb-2">Quality preset</div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{PRESETS.map((p) => (
          <button key={p.id} onClick={() => save({ preset: p.id as PresetId })} aria-pressed={ai.preset === p.id} className={cn("rounded-xl border p-3 text-left transition", ai.preset === p.id ? "border-accent/60 bg-accent/5" : "border-line bg-panel2 hover:border-[#3a4160]")}>
            <div className="text-[13px] font-semibold">{p.label}</div><div className="mt-0.5 text-[11.5px] leading-snug text-mute">{p.what}</div>
          </button>
        ))}</div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3 rounded-xl border border-line bg-panel2 p-4">
          <div className="text-[13px] font-semibold">Realtime voice</div>
          <p className="text-[12px] leading-relaxed text-mute">Uses the key you already entered above, so you do not need another account. Gemini Live or OpenAI Realtime run directly between this browser and the provider.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={label}>Provider
              <select className={cn(field, "mt-1")} value={rtProv} onChange={(e) => { setRtModels([]); save({ realtime: { ...ai.realtime, provider: e.target.value as "gemini" | "openai" } }); }}>
                <option value="gemini">Gemini Live{providerReady(settings, "gemini") ? "" : " (no key)"}</option>
                <option value="openai">OpenAI Realtime{providerReady(settings, "openai") ? "" : " (no key)"}</option>
              </select>
            </label>
            <label className={label}>Voice
              <input className={cn(field, "mt-1 font-mono")} value={rtProv === "gemini" ? ai.realtime.geminiVoice : ai.realtime.openaiVoice} onChange={(e) => save({ realtime: { ...ai.realtime, [rtProv === "gemini" ? "geminiVoice" : "openaiVoice"]: e.target.value.trim() } })} placeholder={rtProv === "gemini" ? "Charon, Puck, Kore…" : "cedar, marin, alloy…"} />
            </label>
            <label className={cn(label, "sm:col-span-2")}>Model
              <input className={cn(field, "mt-1 font-mono")} list="rt-models" value={rtProv === "gemini" ? ai.realtime.geminiModel : ai.realtime.openaiModel} onChange={(e) => save({ realtime: { ...ai.realtime, [rtProv === "gemini" ? "geminiModel" : "openaiModel"]: e.target.value.trim() } })} />
              <datalist id="rt-models">{rtModels.map((m) => <option key={m} value={m} />)}</datalist>
            </label>
            {rtProv === "openai" && (
              <label className={label}>Turn detection
                <select className={cn(field, "mt-1")} value={ai.realtime.vad} onChange={(e) => save({ realtime: { ...ai.realtime, vad: e.target.value as "semantic" | "server" } })}>
                  <option value="semantic">Semantic (waits for complete thoughts)</option>
                  <option value="server">Silence-based</option>
                </select>
              </label>
            )}
          </div>
          <Button size="sm" onClick={loadRt}><RefreshCw size={13} />Load realtime models</Button>
          {msg && <p className="text-[12px] text-mute">{msg}</p>}
        </div>

        <div className="space-y-3 rounded-xl border border-line bg-panel2 p-4">
          <div className="text-[13px] font-semibold">Ascent Voice (browser pipeline)</div>
          <p className="text-[12px] leading-relaxed text-mute">Works with any provider, including Claude and local models. Chrome&apos;s built-in recognition sends audio to Google unless on-device recognition is available. OpenAI speech needs an OpenAI key and handles technical terms better.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={label}>Speech-to-text
              <select className={cn(field, "mt-1")} value={ai.speech.stt} onChange={(e) => save({ speech: { ...ai.speech, stt: e.target.value as "webspeech" | "openai" } })}>
                <option value="webspeech">Browser (free)</option><option value="openai">OpenAI transcription</option>
              </select>
            </label>
            <label className={label}>Text-to-speech
              <select className={cn(field, "mt-1")} value={ai.speech.tts} onChange={(e) => save({ speech: { ...ai.speech, tts: e.target.value as "browser" | "openai" } })}>
                <option value="browser">Browser voices (free)</option><option value="openai">OpenAI voices</option>
              </select>
            </label>
            <label className={cn(label, "sm:col-span-2")}>Voice
              {ai.speech.tts === "browser"
                ? <select className={cn(field, "mt-1")} value={ai.speech.ttsVoice} onChange={(e) => save({ speech: { ...ai.speech, ttsVoice: e.target.value } })}><option value="">Best available</option>{voices.map((v) => <option key={v}>{v}</option>)}</select>
                : <input className={cn(field, "mt-1 font-mono")} value={ai.speech.ttsVoice} placeholder="cedar" onChange={(e) => save({ speech: { ...ai.speech, ttsVoice: e.target.value.trim() } })} />}
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-mute sm:col-span-2"><input type="checkbox" checked={ai.speech.bargeIn} onChange={(e) => save({ speech: { ...ai.speech, bargeIn: e.target.checked } })} className="accent-[var(--color-accent)]" />Let me talk over the interviewer (best with headphones)</label>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-panel2 p-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" checked={ai.devMode} onChange={(e) => save({ devMode: e.target.checked })} className="mt-1 accent-[var(--color-accent)]" />
          <span><span className="block text-sm font-semibold">Developer mode</span><span className="block text-[12.5px] leading-relaxed text-mute">Tune the model and parameters of every AI task, adjust turn-taking, and show a live overlay during mock rounds (assembled prompt, latency, interruptions considered and declined).</span></span>
        </label>
      </div>

      <BudgetPanel ai={ai} save={save} />

      {ai.devMode && (
        <div className="space-y-4">
          <div className="grid gap-3 rounded-xl border border-line bg-panel2 p-4 sm:grid-cols-3">
            <Num name="End-of-speech silence (ms, 0 = from pressure)" value={ai.speech.endOfSpeechMs || undefined} step={50} min={0} onChange={(v) => save({ speech: { ...ai.speech, endOfSpeechMs: v ?? 0 } })} />
            <Num name="Barge-in after (ms of speech)" value={ai.speech.bargeInMs} step={10} min={80} onChange={(v) => save({ speech: { ...ai.speech, bargeInMs: v ?? 250 } })} />
            <label className={label}>Recognition language
              <input className={cn(field, "mt-1 font-mono")} value={ai.speech.lang} onChange={(e) => save({ speech: { ...ai.speech, lang: e.target.value.trim() || "en-US" } })} />
            </label>
          </div>

          <div className="overflow-hidden rounded-xl border border-line">
            {TASKS.map((t) => {
              const eff = profileFor(settings, t.id);
              const r = resolved(settings, t.id);
              const cap: Capabilities = capabilities(r.provider, r.model);
              const o = ai.tasks[t.id];
              const p = eff.params;
              const isOpen = open === t.id;
              return (
                <div key={t.id} className="border-b border-line last:border-0">
                  <button onClick={() => setOpen(isOpen ? null : t.id)} aria-expanded={isOpen} className="flex w-full items-center gap-3 bg-panel2 px-4 py-3 text-left">
                    <span className="min-w-0 flex-1"><span className="text-[13px] font-semibold">{t.label}</span><span className="ml-2 text-[12px] text-faint">{t.what}</span></span>
                    <span className="font-mono text-[11.5px] text-mute">{r.provider} · {r.model || "?"}</span>
                    {o && <span className="rounded-full border border-warn/40 px-2 text-[10.5px] text-warn">custom</span>}
                  </button>
                  {isOpen && (
                    <div className="grid gap-3 p-4 sm:grid-cols-4">
                      <label className={label}>Provider
                        <select className={cn(field, "mt-1")} value={eff.provider} onChange={(e) => setTask(t.id, { provider: e.target.value as TaskProfile["provider"] })}>
                          <option value="">Default ({settings.provider})</option>
                          {(["gemini", "claude", "openai", "local"] as const).map((pv) => <option key={pv} value={pv} disabled={!providerReady(settings, pv)}>{pv}{providerReady(settings, pv) ? "" : " (not set up)"}</option>)}
                        </select>
                      </label>
                      <label className={cn(label, "sm:col-span-2")}>Model
                        <input className={cn(field, "mt-1 font-mono")} list={`models-${t.id}`} value={eff.model} placeholder="your default model" onChange={(e) => setTask(t.id, { model: e.target.value.trim() })} />
                        <datalist id={`models-${t.id}`}><option value="tier:small" /><option value="tier:strong" /></datalist>
                      </label>
                      <label className={label}>Reasoning
                        <select className={cn(field, "mt-1")} disabled={!cap.reasoning} title={!cap.reasoning ? CAPABILITY_WHY.reasoning : undefined} value={p.reasoning ?? ""} onChange={(e) => setTask(t.id, { params: { reasoning: (e.target.value || undefined) as GenParams["reasoning"] } })}>
                          <option value="">model default</option><option value="off">off</option><option value="low">low</option><option value="medium">medium</option><option value="high">high</option>
                        </select>
                      </label>
                      <Num name="Temperature" value={p.temperature} min={0} max={2} disabled={!cap.temperature} why={CAPABILITY_WHY.temperature} onChange={(v) => setTask(t.id, { params: { temperature: v } })} />
                      <Num name="Top-p" value={p.topP} min={0} max={1} disabled={!cap.topP} why={CAPABILITY_WHY.topP} onChange={(v) => setTask(t.id, { params: { topP: v } })} />
                      <Num name="Top-k" value={p.topK} step={1} min={1} disabled={!cap.topK} why={CAPABILITY_WHY.topK} onChange={(v) => setTask(t.id, { params: { topK: v } })} />
                      <Num name="Max output tokens" value={p.maxOutputTokens} step={50} min={16} onChange={(v) => setTask(t.id, { params: { maxOutputTokens: v } })} />
                      <Num name="Seed" value={p.seed} step={1} disabled={!cap.seed} why={CAPABILITY_WHY.seed} onChange={(v) => setTask(t.id, { params: { seed: v } })} />
                      <Num name="Presence penalty" value={p.presencePenalty} min={-2} max={2} disabled={!cap.penalties} why={CAPABILITY_WHY.penalties} onChange={(v) => setTask(t.id, { params: { presencePenalty: v } })} />
                      <Num name="Frequency penalty" value={p.frequencyPenalty} min={-2} max={2} disabled={!cap.penalties} why={CAPABILITY_WHY.penalties} onChange={(v) => setTask(t.id, { params: { frequencyPenalty: v } })} />
                      <Num name="Timeout (ms)" value={eff.timeoutMs} step={1000} min={2000} onChange={(v) => setTask(t.id, { timeoutMs: v ?? 60000 })} />
                      <Num name="Retries" value={eff.retries} step={1} min={0} max={4} onChange={(v) => setTask(t.id, { retries: v ?? 0 })} />
                      {t.id === "scorecard" && <Num name="Independent samples (median)" value={eff.samples} step={1} min={1} max={5} onChange={(v) => setTask(t.id, { samples: v ?? 1 })} />}
                      <label className={cn(label, "sm:col-span-2")} title={!cap.stop ? CAPABILITY_WHY.stop : undefined}>Stop sequences (comma separated)
                        <input className={cn(field, "mt-1 font-mono")} disabled={!cap.stop} value={(p.stop ?? []).join(", ")} onChange={(e) => setTask(t.id, { params: { stop: e.target.value ? e.target.value.split(",").map((x) => x.trim()).filter(Boolean) : undefined } })} />
                      </label>
                      <div className="flex flex-wrap items-end gap-4 sm:col-span-2">
                        <label className="flex items-center gap-2 text-[12.5px] text-mute" title={!cap.json ? CAPABILITY_WHY.json : undefined}><input type="checkbox" disabled={!cap.json} checked={!!p.json} onChange={(e) => setTask(t.id, { params: { json: e.target.checked } })} className="accent-[var(--color-accent)]" />JSON mode</label>
                        <label className="flex items-center gap-2 text-[12.5px] text-mute" title={!cap.promptCaching ? CAPABILITY_WHY.promptCaching : undefined}><input type="checkbox" disabled={!cap.promptCaching} checked={!!p.promptCaching} onChange={(e) => setTask(t.id, { params: { promptCaching: e.target.checked } })} className="accent-[var(--color-accent)]" />Prompt caching</label>
                        {o && <Button size="sm" variant="ghost" onClick={() => resetTask(t.id)}><RotateCcw size={13} />Reset to {ai.preset}</Button>}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-[12px] leading-relaxed text-faint">Greyed-out fields are not supported by the selected provider or model (hover for why). &ldquo;tier:small&rdquo; and &ldquo;tier:strong&rdquo; pick a model class for the provider; leave the model empty to use the one chosen above.</p>

          <PromptOverrides ai={ai} save={save} />
        </div>
      )}
    </div>
  );
}
