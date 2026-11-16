"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Mountain } from "lucide-react";
import { useStore } from "@/lib/store";
import { cloudEnabled, supabase } from "@/lib/supabase";
import { Spinner } from "@/components/Work";
import { Button, cn } from "@/components/ui";

const input = "h-11 w-full rounded-xl border border-line bg-bg px-3.5 text-[15px] outline-none focus:border-accent/60";
const POINTS = ["A plan that re-flows around your dates and hours", "Spaced reviews that return before you forget", "AI that verifies your code and grades your designs", "Progress, notes and attempts saved to your account"];

export default function Login() {
  const router = useRouter();
  const init = useStore((s) => s.init);
  const user = useStore((s) => s.user);
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => init(), [init]);
  useEffect(() => { if (user) router.replace("/"); }, [user, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const sb = supabase();
    if (!sb) return;
    setBusy(true); setErr(""); setInfo("");
    const { data, error } = mode === "in"
      ? await sb.auth.signInWithPassword({ email, password: pw })
      : await sb.auth.signUp({ email, password: pw, options: { emailRedirectTo: window.location.origin } });
    setBusy(false);
    if (error) return setErr(error.message);
    if (mode === "up" && !data.session) setInfo("Check your inbox and click the confirmation link, then sign in here.");
  };
  const google = async () => {
    const sb = supabase();
    if (!sb) return;
    setErr("");
    const { error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
    if (error) setErr(error.message);
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="relative hidden overflow-hidden border-r border-line p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -left-24 top-1/4 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-hld/10 blur-3xl" />
        <div className="relative flex items-center gap-2.5"><span className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-ink"><Mountain size={21} strokeWidth={2.4} /></span><span className="display text-2xl font-semibold">Ascent</span></div>
        <div className="relative">
          <h1 className="display text-5xl font-semibold leading-[1.05]">The whole loop,<br />one trail.</h1>
          <p className="mt-4 max-w-md text-[16px] leading-relaxed text-mute">Data structures, system design and object-oriented design for Google SWE interviews, practised the way the interview actually runs.</p>
          <ul className="mt-8 space-y-3">
            {POINTS.map((p, i) => <motion.li key={p} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.08 }} className="flex items-center gap-3 text-[14.5px] text-[#d5d8e6]"><span className="h-1.5 w-1.5 rounded-full bg-accent" />{p}</motion.li>)}
          </ul>
        </div>
        <div className="relative text-[12px] text-faint">Your AI keys never leave your browser.</div>
      </div>

      <div className="grid place-items-center p-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden"><span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-ink"><Mountain size={19} strokeWidth={2.4} /></span><span className="display text-xl font-semibold">Ascent</span></div>
          <h2 className="display text-3xl font-semibold">{mode === "in" ? "Welcome back" : "Create your account"}</h2>
          <p className="mt-2 text-[14px] text-mute">{mode === "in" ? "Sign in to pick up where you left off, on any device." : "Anything you did as a guest on this device comes with you."}</p>

          {cloudEnabled ? (
            <>
              <button onClick={google} className="mt-7 flex h-11 w-full items-center justify-center gap-3 rounded-xl border border-line bg-panel2 text-[14.5px] font-medium transition hover:border-[#3a4160]">
                <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>
                Continue with Google
              </button>
              <div className="my-5 flex items-center gap-3 text-[12px] text-faint"><span className="h-px flex-1 bg-line" />or with email<span className="h-px flex-1 bg-line" /></div>
              <form onSubmit={submit} className="space-y-3">
                <input className={input} type="email" required autoComplete="email" placeholder="you@example.com" aria-label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <input className={input} type="password" required minLength={8} autoComplete={mode === "in" ? "current-password" : "new-password"} placeholder={mode === "in" ? "Password" : "Password (8 or more characters)"} aria-label="Password" value={pw} onChange={(e) => setPw(e.target.value)} />
                {err && <p role="alert" className="rounded-xl border border-bad/30 bg-bad/10 p-3 text-[13px] text-bad">{err}</p>}
                {info && <p role="status" className="rounded-xl border border-ok/30 bg-ok/10 p-3 text-[13px] text-ok">{info}</p>}
                <Button variant="primary" type="submit" disabled={busy} className="!h-11 w-full">{busy ? <Spinner label={mode === "in" ? "Signing in" : "Creating account"} /> : <>{mode === "in" ? "Sign in" : "Create account"}<ArrowRight size={15} /></>}</Button>
              </form>
              <button onClick={() => { setMode(mode === "in" ? "up" : "in"); setErr(""); setInfo(""); }} className={cn("mt-4 text-[13.5px] text-mute hover:text-text")}>{mode === "in" ? "New here? Create an account" : "Already have an account? Sign in"}</button>
            </>
          ) : (
            <p className="mt-7 rounded-xl border border-line bg-panel2 p-4 text-[13.5px] leading-relaxed text-mute">Accounts are not configured for this deployment (the Supabase environment variables are missing). You can still use everything in guest mode; progress is saved in this browser.</p>
          )}
          <Link href="/" className="mt-6 block text-[13.5px] text-accent hover:underline">Continue as a guest →</Link>
        </motion.div>
      </div>
    </div>
  );
}
