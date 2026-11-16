"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { Boxes, Code2, Flag, MessagesSquare, Mic, Network, Send, Shuffle, TimerReset } from "lucide-react";
import { useStore } from "@/lib/store";
import { useItems, useTrackTime } from "@/lib/hooks";
import { MOCK_SYSTEM, aiReady, chat, mockScorecard, type Msg } from "@/lib/ai";
import { MOCKS } from "@/lib/schedule";
import { DESIGNS, PROBLEMS } from "@/content";
import { CodeEditor, FeedbackView, NeedAI, RatingBar, Spinner } from "@/components/Work";
import { Button, Md, PageHead, Pill, cn, fmtClock } from "@/components/ui";
import type { Feedback, Rating } from "@/lib/types";

type Kind = "coding" | "hld" | "lld" | "behavioral";
const KINDS: { id: Kind; label: string; desc: string; min: number; icon: typeof Mic; color: string; name: string }[] = [
  { id: "coding", label: "Coding", desc: "One problem, then a twist. Clarify, code on a shared doc, analyse.", min: 45, icon: Code2, color: "var(--color-dsa)", name: "coding" },
  { id: "hld", label: "System design", desc: "An open-ended system. You drive: requirements, numbers, design, deep dives.", min: 45, icon: Network, color: "var(--color-hld)", name: "system design" },
  { id: "lld", label: "Object-oriented design", desc: "Model a small system with classes, then extend it under pressure.", min: 40, icon: Boxes, color: "var(--color-lld)", name: "object-oriented design" },
  { id: "behavioral", label: "Googleyness", desc: "Behavioural questions with follow-ups that probe your actual role.", min: 25, icon: MessagesSquare, color: "var(--color-craft)", name: "behavioural (Googleyness and leadership)" },
];
interface Q { id: string; title: string; text: string; scripted: string[] }

export default function Mock() {
  const settings = useStore((s) => s.settings);
  const progress = useStore((s) => s.progress);
  const custom = useStore((s) => s.custom);
  const items = useItems();
  const { complete, addAttempt, addXp } = useStore.getState();
  const ready = aiReady(settings);
  useTrackTime();

  const [kind, setKind] = useState<Kind>("coding");
  const [minutes, setMinutes] = useState(45);
  const [unseen, setUnseen] = useState(true);
  const [q, setQ] = useState<Q | null>(null);
  const [phase, setPhase] = useState<"setup" | "live" | "done">("setup");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [pad, setPad] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [left, setLeft] = useState(0);
  const [fb, setFb] = useState<Feedback | null>(null);
  const [scriptN, setScriptN] = useState(0);
  const endsAt = useRef(0);
  const bottom = useRef<HTMLDivElement>(null);
  const meta = KINDS.find((k) => k.id === kind)!;

  const pool = useMemo<Q[]>(() => {
    if (kind === "coding")
      return [...PROBLEMS, ...custom.filter((p) => p.approaches.length)].filter((p) => p.diff !== "E").map((p) => ({ id: p.id, title: p.title, text: `${p.statement}\nPossible follow-ups to use: ${[...p.twists, ...p.followUps].slice(0, 4).join(" | ")}`, scripted: [...p.clarify.slice(0, 1).map((c) => `Did you ask: ${c}`), ...p.twists.slice(0, 2), ...p.followUps.slice(0, 2)] }));
    const area = kind === "behavioral" ? "craft" : kind;
    return DESIGNS.filter((d) => d.area === area).map((d) => ({ id: d.id, title: d.title, text: `${d.prompt}\nDirections you may push: ${d.steer.map((s) => s[0]).join(" | ")}`, scripted: d.steer.map((s) => s[0]) }));
  }, [kind, custom]);

  useEffect(() => {
    if (phase !== "live") return;
    const t = setInterval(() => setLeft(Math.max(0, Math.round((endsAt.current - Date.now()) / 1000))), 500);
    return () => clearInterval(t);
  }, [phase]);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [msgs, busy]);

  const system = q ? MOCK_SYSTEM(meta.name, q.text, minutes) : "";
  const begin = async () => {
    const fresh = pool.filter((x) => progress[x.id]?.status !== "done");
    const from = unseen && fresh.length ? fresh : pool;
    const pick = from[Math.floor(Math.random() * from.length)];
    if (!pick) return;
    setQ(pick); setMsgs([]); setPad(""); setFb(null); setErr(""); setScriptN(0);
    endsAt.current = Date.now() + minutes * 60000; setLeft(minutes * 60); setPhase("live");
    if (!ready) { setMsgs([{ role: "assistant", content: pick.text.split("\n")[0] }]); return; }
    setBusy(true);
    try {
      const first = await chat(settings, MOCK_SYSTEM(meta.name, pick.text, minutes), [{ role: "user", content: "Hi, I am ready to begin." }], { maxTokens: 400 });
      setMsgs([{ role: "user", content: "Hi, I am ready to begin." }, { role: "assistant", content: first }]);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  const send = async (withPad = false) => {
    const text = (withPad && pad.trim() ? `${input.trim()}\n\n[shared doc]\n\`\`\`\n${pad}\n\`\`\`` : input).trim();
    if (!text || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content: text }];
    setMsgs(next); setInput(""); setErr("");
    if (!ready) return;
    setBusy(true);
    try {
      const mins = Math.ceil(left / 60);
      const reply = await chat(settings, `${system}\n(About ${mins} minute${mins === 1 ? "" : "s"} remain. ${mins <= 5 ? "Start wrapping up." : ""})`, next, { maxTokens: 500 });
      setMsgs([...next, { role: "assistant", content: reply }]);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  const finish = async () => {
    if (!q) return;
    setPhase("done");
    if (!ready || msgs.filter((m) => m.role === "user").length < 2) return;
    setBusy(true); setErr("");
    try {
      const transcript = pad.trim() ? [...msgs, { role: "user" as const, content: `[final shared doc]\n${pad}` }] : msgs;
      const f = await mockScorecard(settings, meta.name, q.text, transcript);
      setFb(f);
      addAttempt(q.id, `mock:${kind}`, transcript.map((m) => `${m.role === "user" ? "ME" : "INTERVIEWER"}: ${m.content}`).join("\n\n"), f);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  const rate = (r: Rating) => {
    const slot = MOCKS.find((m) => progress[m.id]?.status !== "done");
    if (slot) complete({ ...slot, title: `Mock: ${q?.title ?? meta.label}` }, r, fb ? { score: fb.score } : {});
    else addXp(150, "Extra mock interview");
    // the question itself joins spaced review so its weak points return
    const it = items.find((x) => x.id === q?.id);
    if (it && progress[it.id]?.status !== "done") complete(it, r, fb ? { score: fb.score } : {});
    setPhase("setup"); setQ(null);
  };

  if (phase === "setup") {
    const doneMocks = MOCKS.filter((m) => progress[m.id]?.status === "done").length;
    return (
      <div>
        <PageHead eyebrow="Dress rehearsal" title="Mock interview" sub="A timed round with an interviewer who underspecifies the question, pushes back and changes constraints, then writes the feedback a hiring committee would read." right={<Pill color="var(--color-accent)">{doneMocks} of {MOCKS.length} planned mocks done</Pill>} />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {KINDS.map((k) => (
            <button key={k.id} onClick={() => { setKind(k.id); setMinutes(k.min); }} aria-pressed={kind === k.id}
              className={cn("card card-hover flex flex-col items-start p-5 text-left", kind === k.id && "!border-accent/60")} style={kind === k.id ? { background: `color-mix(in srgb, ${k.color} 7%, var(--color-panel))` } : undefined}>
              <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: `color-mix(in srgb, ${k.color} 16%, transparent)`, color: k.color }}><k.icon size={19} /></span>
              <div className="display mt-3 text-lg font-semibold">{k.label}</div>
              <p className="mt-1 text-[13px] leading-relaxed text-mute">{k.desc}</p>
            </button>
          ))}
        </div>
        <div className="card mt-5 flex flex-wrap items-center gap-x-8 gap-y-4 p-5">
          <label className="flex items-center gap-3 text-[13.5px] text-mute">Length
            <input type="range" min={15} max={60} step={5} value={minutes} onChange={(e) => setMinutes(+e.target.value)} />
            <span className="num w-14 font-semibold text-text">{minutes} min</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-[13.5px] text-mute"><input type="checkbox" checked={unseen} onChange={(e) => setUnseen(e.target.checked)} className="accent-[var(--color-accent)]" />Prefer questions I have not completed</label>
          <Button variant="primary" className="ml-auto" onClick={begin}><Shuffle size={15} />Draw a question and start</Button>
        </div>
        {!ready && <div className="mt-5 space-y-2"><NeedAI /><p className="text-[12.5px] text-faint">Without an AI reviewer the mock runs in self-paced mode: the timer and scripted interviewer pushes still work, and you rate yourself at the end.</p></div>}
        <p className="mt-5 max-w-2xl text-[13px] leading-relaxed text-faint">The question is drawn at random and you cannot pick it. Choosing your own questions is how practice drifts toward what already feels comfortable.</p>
      </div>
    );
  }

  const low = left <= 300;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2"><Pill color={meta.color}>{meta.label} mock</Pill>{phase === "done" && <Pill className="border-line text-mute">finished</Pill>}</div>
        <div className="flex items-center gap-2">
          <div className={cn("num flex h-9 items-center gap-2 rounded-xl border px-3 font-mono text-[13px]", phase === "done" ? "border-line text-faint" : left === 0 ? "border-bad/50 bg-bad/10 text-bad" : low ? "border-warn/50 text-warn" : "border-line text-mute")}><TimerReset size={14} />{fmtClock(left)}</div>
          {phase === "live" && <Button variant="danger" size="sm" onClick={finish}><Flag size={14} />End and get feedback</Button>}
        </div>
      </div>

      <div className={cn("grid gap-5", kind !== "behavioral" && "xl:grid-cols-2")}>
        <section className="card flex h-[620px] flex-col overflow-hidden">
          <div className="flex-1 space-y-3 overflow-y-auto p-5" aria-live="polite">
            {msgs.filter((m, i) => !(i === 0 && m.role === "user")).map((m, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={cn("max-w-[88%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed", m.role === "user" ? "ml-auto bg-accent/12 text-text border border-accent/25" : "border border-line bg-panel2")}>
                <div className="mb-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-faint">{m.role === "user" ? "You" : "Interviewer"}</div>
                <Md>{m.content}</Md>
              </motion.div>
            ))}
            {busy && phase === "live" && <div className="w-fit rounded-2xl border border-line bg-panel2 px-4 py-3 text-[13px] text-mute"><Spinner label="Interviewer is typing" /></div>}
            {!ready && phase === "live" && q && scriptN < q.scripted.length && (
              <button onClick={() => { setMsgs((m) => [...m, { role: "assistant", content: q.scripted[scriptN] }]); setScriptN((n) => n + 1); }} className="rounded-xl border border-dashed border-line px-3 py-2 text-[13px] text-mute hover:text-text">Interviewer pushes ({scriptN}/{q.scripted.length} used)</button>
            )}
            <div ref={bottom} />
          </div>
          {err && <p role="alert" className="mx-4 mb-2 rounded-xl border border-bad/30 bg-bad/10 p-2.5 text-[13px] text-bad">{err} <button className="underline" onClick={() => setErr("")}>Dismiss</button></p>}
          {phase === "live" && (
            <div className="border-t border-line p-3">
              <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); } }} rows={3} placeholder="Think out loud here. Ask clarifying questions first. ⌘↵ to send" aria-label="Your reply"
                className="w-full resize-none rounded-xl border border-line bg-bg p-3 text-[14px] leading-relaxed outline-none focus:border-accent/60" />
              <div className="mt-2 flex justify-end gap-2">
                {kind !== "behavioral" && <Button size="sm" disabled={busy || !pad.trim()} onClick={() => send(true)}>Send with shared doc</Button>}
                <Button size="sm" variant="primary" disabled={busy || !input.trim()} onClick={() => send()}><Send size={14} />Send</Button>
              </div>
            </div>
          )}
        </section>

        {kind !== "behavioral" && (
          <section className="card flex h-[620px] flex-col overflow-hidden p-4">
            <div className="mb-2 flex items-center justify-between"><div className="eyebrow">Shared doc</div><span className="text-[11.5px] text-faint">{kind === "coding" ? "no compiler, no autocomplete" : "components, APIs, numbers, schemas"}</span></div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {kind === "coding" ? <CodeEditor value={pad} onChange={setPad} lang={settings.lang} minHeight="540px" readOnly={phase === "done"} />
                : <textarea value={pad} onChange={(e) => setPad(e.target.value)} readOnly={phase === "done"} aria-label="Shared doc" placeholder={"Requirements:\n- \n\nEstimates:\n- \n\nComponents:\n- "} className="h-full w-full resize-none rounded-xl border border-line bg-bg p-3.5 font-mono text-[13px] leading-relaxed outline-none focus:border-accent/60" />}
            </div>
          </section>
        )}
      </div>

      {phase === "done" && (
        <div className="space-y-5">
          {busy && <div className="card p-5 text-[14px] text-mute"><Spinner label="Writing the hiring-committee feedback" /></div>}
          {fb && <FeedbackView f={fb} />}
          {!fb && !busy && <div className="card p-5 text-[13.5px] text-mute">{ready ? "Too short to score: the interviewer needs at least two of your replies." : "Self-paced mock: rate yourself below. Be at least as strict as an interviewer would be."}{q && <div className="mt-2 text-faint">Question: {q.title}</div>}</div>}
          <RatingBar suggested={fb ? (fb.score >= 90 ? 3 : fb.score >= 75 ? 2 : fb.score >= 60 ? 1 : 0) : undefined} onRate={rate} />
        </div>
      )}
    </div>
  );
}
