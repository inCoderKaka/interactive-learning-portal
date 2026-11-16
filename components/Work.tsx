"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo } from "react";
import { cpp } from "@codemirror/lang-cpp";
import { java } from "@codemirror/lang-java";
import { python } from "@codemirror/lang-python";
import { javascript } from "@codemirror/lang-javascript";
import { tokyoNight } from "@uiw/codemirror-theme-tokyo-night";
import { EditorView } from "@codemirror/view";
import { AlertTriangle, Check, CircleSlash, Gauge, Lightbulb, MessageCircleQuestion, Sparkles, X } from "lucide-react";
import type { Feedback, Settings } from "@/lib/types";
import { RATINGS } from "@/lib/srs";
import { Bar, Button, cn } from "./ui";

const CodeMirror = dynamic(() => import("@uiw/react-codemirror"), { ssr: false, loading: () => <div className="h-[320px] animate-pulse-soft rounded-xl bg-[#1a1b26]" /> });

export const LANGS: { id: Settings["lang"]; label: string }[] = [{ id: "cpp", label: "C++" }, { id: "java", label: "Java" }, { id: "python", label: "Python" }, { id: "javascript", label: "JavaScript" }];
const EXT = { cpp, java, python, javascript };

export function CodeEditor({ value, onChange, lang, minHeight = "320px", readOnly }: { value: string; onChange?: (v: string) => void; lang: Settings["lang"]; minHeight?: string; readOnly?: boolean }) {
  const extensions = useMemo(() => [EXT[lang](), EditorView.lineWrapping], [lang]);
  return (
    <div className="overflow-hidden rounded-xl border border-line">
      <CodeMirror value={value} onChange={onChange} extensions={extensions} theme={tokyoNight} minHeight={minHeight} maxHeight="640px" readOnly={readOnly}
        basicSetup={{ autocompletion: false, foldGutter: false, highlightActiveLine: !readOnly, tabSize: 4 }} aria-label="Code editor" />
    </div>
  );
}

const VERDICT = {
  correct: { label: "Correct", color: "var(--color-ok)", icon: Check },
  partial: { label: "Partially correct", color: "var(--color-warn)", icon: AlertTriangle },
  incorrect: { label: "Not correct yet", color: "var(--color-bad)", icon: X },
};
function List({ title, items, icon: Icon, color }: { title: string; items: string[]; icon: typeof Check; color: string }) {
  if (!items?.length) return null;
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wider" style={{ color }}><Icon size={13} />{title}</div>
      <ul className="space-y-1.5 text-[13.5px] leading-relaxed text-[#d5d8e6]">{items.map((x, i) => <li key={i} className="flex gap-2"><span className="mt-2 h-1 w-1 shrink-0 rounded-full" style={{ background: color }} />{x}</li>)}</ul>
    </div>
  );
}

export function FeedbackView({ f, predicted }: { f: Feedback; predicted?: number }) {
  const v = VERDICT[f.verdict];
  const gap = predicted ? predicted * 20 - f.score : null;
  return (
    <div className="card animate-rise overflow-hidden" aria-live="polite">
      <div className="flex flex-wrap items-center gap-4 border-b border-line px-5 py-4" style={{ background: `color-mix(in srgb, ${v.color} 7%, transparent)` }}>
        <span className="grid h-11 w-11 place-items-center rounded-2xl" style={{ background: `color-mix(in srgb, ${v.color} 18%, transparent)`, color: v.color }}><v.icon size={20} /></span>
        <div className="min-w-0 flex-1">
          <div className="display text-lg font-semibold" style={{ color: v.color }}>{v.label}</div>
          <p className="text-[13.5px] leading-relaxed text-[#d5d8e6]">{f.summary}</p>
        </div>
        <div className="text-right"><div className="display num text-3xl font-semibold">{f.score}</div><div className="text-[11px] text-faint">AI score / 100</div></div>
      </div>
      <div className="space-y-5 p-5">
        {gap !== null && Math.abs(gap) >= 25 && (
          <div className="flex items-start gap-2.5 rounded-xl border border-hld/30 bg-hld/5 p-3 text-[13px] text-[#cfe0ff]">
            <Gauge size={16} className="mt-0.5 shrink-0 text-hld" />
            <span><b>Calibration check.</b> You predicted {predicted}/5 confidence; the review landed at {f.score}/100. {gap > 0 ? "You were more confident than the result supports: this one comes back sooner for review." : "You underrated yourself here. Trust this pattern a little more."}</span>
          </div>
        )}
        {f.complexity && (
          <div className="flex flex-wrap gap-2 text-[13px]">
            <span className="rounded-lg border border-line bg-bg px-2.5 py-1 font-mono">time {f.complexity.time}</span>
            <span className="rounded-lg border border-line bg-bg px-2.5 py-1 font-mono">space {f.complexity.space}</span>
            <span className="rounded-lg border px-2.5 py-1" style={{ borderColor: f.complexity.optimal ? "rgb(91 228 155 / .4)" : "rgb(255 200 87 / .4)", color: f.complexity.optimal ? "var(--color-ok)" : "var(--color-warn)" }}>{f.complexity.optimal ? "optimal" : "can be improved"}</span>
            {f.complexity.note && <span className="w-full text-mute">{f.complexity.note}</span>}
          </div>
        )}
        <List title="Bugs" items={f.bugs} icon={CircleSlash} color="var(--color-bad)" />
        <List title="Edge cases missed" items={f.edgeCases} icon={AlertTriangle} color="var(--color-warn)" />
        <List title="What worked" items={f.strengths} icon={Check} color="var(--color-ok)" />
        <List title="Do this next time" items={f.improvements} icon={Lightbulb} color="var(--color-hld)" />
        {f.rubric && (
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(f.rubric).map(([k, val]) => (
              <div key={k}><div className="mb-1 flex justify-between text-[12px]"><span className="capitalize text-mute">{k.replace(/([A-Z])/g, " $1")}</span><span className="num font-semibold">{val}/4</span></div><Bar value={Number(val) / 4} color={Number(val) >= 3 ? "var(--color-ok)" : Number(val) >= 2 ? "var(--color-warn)" : "var(--color-bad)"} /></div>
            ))}
          </div>
        )}
        {f.followUp && <div className="flex items-start gap-2.5 rounded-xl border border-accent/30 bg-accent/5 p-3 text-[13.5px] text-[#e6f3bd]"><MessageCircleQuestion size={16} className="mt-0.5 shrink-0 text-accent" /><span><b>Interviewer follow-up:</b> {f.followUp}</span></div>}
        <p className="text-[11.5px] text-faint">AI review is a second opinion, not ground truth. If you disagree with a point, trace the input by hand: that habit is worth more than the score.</p>
      </div>
    </div>
  );
}

export function NeedAI() {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-line p-4 text-[13.5px] text-mute">
      <Sparkles size={16} className="text-accent" />
      <span className="flex-1">Connect Gemini, Claude or your local-server to get your work reviewed.</span>
      <Link href="/settings#ai" className="font-medium text-accent underline underline-offset-4">Set up AI</Link>
    </div>
  );
}

export function ConfidencePick({ value, onChange }: { value?: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-[13px] text-mute">Before you start: how confident are you?</span>
      <div className="flex gap-1.5" role="radiogroup" aria-label="Predicted confidence">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} role="radio" aria-checked={value === n} onClick={() => onChange(n)} className={cn("num h-8 w-8 rounded-lg border text-[13px] font-semibold transition", value === n ? "border-hld bg-hld/15 text-hld" : "border-line text-mute hover:text-text")}>{n}</button>
        ))}
      </div>
    </div>
  );
}

export function RatingBar({ onRate, done, suggested }: { onRate: (r: 0 | 1 | 2 | 3) => void; done?: boolean; suggested?: number }) {
  return (
    <div className="card p-5">
      <div className="display text-[17px] font-semibold">{done ? "Rate it again" : "How did it really go?"}</div>
      <p className="mt-1 text-[13px] text-mute">Be honest: this sets when the item returns for spaced review. A harsh rating costs nothing; a generous one costs you in the interview.</p>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {RATINGS.map((r) => (
          <button key={r.r} onClick={() => onRate(r.r)} className={cn("rounded-xl border p-3 text-left transition hover:-translate-y-0.5", suggested === r.r ? "border-accent/60 bg-accent/5" : "border-line bg-panel2 hover:border-[#3a4160]")}>
            <div className="text-sm font-semibold">{r.label}</div>
            <div className="text-[11.5px] text-mute">{r.hint}</div>
            {suggested === r.r && <div className="mt-1 text-[10.5px] font-semibold uppercase tracking-wider text-accent">suggested by review</div>}
          </button>
        ))}
      </div>
    </div>
  );
}

export const Spinner = ({ label }: { label: string }) => (
  <span className="inline-flex items-center gap-2"><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />{label}</span>
);
export { Button };
