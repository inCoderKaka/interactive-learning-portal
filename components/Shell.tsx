"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Command } from "cmdk";
import confetti from "canvas-confetti";
import { AnimatePresence, motion } from "motion/react";
import { BarChart3, CalendarRange, CloudOff, Flame, Home, Layers, LogIn, Mic, RefreshCw, Search, Settings as Cog, Sparkles, Mountain } from "lucide-react";
import { useStore, selectXp } from "@/lib/store";
import { levelOf, streakOf } from "@/lib/gamify";
import { useDue, useItems } from "@/lib/hooks";
import { cloudEnabled } from "@/lib/supabase";
import { areaOf } from "@/content";
import { Breather, FocusChip } from "./Focus";
import { Ring, cn } from "./ui";

const NAV = [
  { href: "/", label: "Today", icon: Home },
  { href: "/roadmap", label: "Roadmap", icon: CalendarRange },
  { href: "/learn", label: "Learn", icon: Layers },
  { href: "/review", label: "Review", icon: RefreshCw },
  { href: "/mock", label: "Mock", icon: Mic },
  { href: "/progress", label: "Progress", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Cog },
];

function Palette({ open, setOpen }: { open: boolean; setOpen: (b: boolean) => void }) {
  const items = useItems();
  const router = useRouter();
  const blind = useStore((s) => s.settings.blind);
  const go = (href: string) => { setOpen(false); router.push(href); };
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[90] bg-black/60 p-4 pt-[12vh] backdrop-blur-sm" onClick={() => setOpen(false)}>
          <motion.div initial={{ y: -12, scale: 0.98 }} animate={{ y: 0, scale: 1 }} exit={{ y: -12, scale: 0.98 }} onClick={(e) => e.stopPropagation()} className="card mx-auto max-w-xl overflow-hidden shadow-2xl">
            <Command label="Search everything" loop>
              <div className="flex items-center gap-3 border-b border-line px-4">
                <Search size={16} className="text-mute" />
                <Command.Input autoFocus placeholder="Jump to a topic, problem or page…" className="h-12 w-full bg-transparent text-[15px] outline-none placeholder:text-faint" />
                <kbd className="rounded border border-line px-1.5 text-[11px] text-faint">esc</kbd>
              </div>
              <Command.List className="max-h-[50vh] overflow-y-auto p-2">
                <Command.Empty className="px-3 py-8 text-center text-sm text-mute">Nothing matches. Try a LeetCode number or a pattern name.</Command.Empty>
                <Command.Group heading="Pages" className="text-[11px] uppercase tracking-widest text-faint [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2">
                  {NAV.map((n) => (
                    <Command.Item key={n.href} value={`page ${n.label}`} onSelect={() => go(n.href)} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm normal-case tracking-normal text-text data-[selected=true]:bg-panel2">
                      <n.icon size={15} className="text-mute" />{n.label}
                    </Command.Item>
                  ))}
                </Command.Group>
                <Command.Group heading="Curriculum" className="text-[11px] uppercase tracking-widest text-faint [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2">
                  {items.map((it) => (
                    <Command.Item key={it.id} value={`${it.title} ${it.id.replace("p-", "lc ")} ${blind ? "" : it.topic}`} onSelect={() => go(it.href)} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm normal-case tracking-normal text-text data-[selected=true]:bg-panel2">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: areaOf(it.area).color }} />
                      <span className="truncate">{it.title}</span>
                      <span className="ml-auto shrink-0 text-[11px] text-faint">{it.kind}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              </Command.List>
            </Command>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Celebration() {
  const c = useStore((s) => s.celebrate);
  const [show, setShow] = useState<typeof c>(null);
  useEffect(() => {
    if (!c) return;
    setShow(c);
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      confetti({ particleCount: 70, spread: 75, startVelocity: 38, origin: { y: 0.85 }, colors: ["#c8f547", "#4fd1c5", "#7aa7ff", "#ffb454", "#ff8fb3"], disableForReducedMotion: true });
    const t = setTimeout(() => setShow(null), 3200);
    return () => clearTimeout(t);
  }, [c]);
  return (
    <AnimatePresence>
      {show && (
        <motion.div key={show.key} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} role="status"
          className="fixed bottom-20 left-1/2 z-[80] flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-accent/40 bg-panel px-4 py-3 shadow-2xl lg:bottom-8">
          <Sparkles size={18} className="text-accent" />
          <div className="text-sm"><span className="font-semibold text-accent">+{show.xp} XP</span><span className="ml-2 text-mute">{show.title}</span></div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const init = useStore((s) => s.init);
  const ready = useStore((s) => s.ready);
  const user = useStore((s) => s.user);
  const syncError = useStore((s) => s.syncError);
  const syncing = useStore((s) => s.syncing);
  const activity = useStore((s) => s.activity);
  const xp = useStore(selectXp);
  const due = useDue();
  const [palette, setPalette] = useState(false);
  const lvl = useMemo(() => levelOf(xp), [xp]);
  const streak = useMemo(() => streakOf(activity), [activity]);

  useEffect(() => init(), [init]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette((p) => !p); }
      if (e.key === "Escape") setPalette(false);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const bare = path === "/login";
  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href) || (href === "/learn" && (path.startsWith("/problem") || path.startsWith("/design"))));

  if (bare) return <>{children}</>;
  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-[232px] shrink-0 flex-col border-r border-line bg-panel/60 px-3 py-5 backdrop-blur lg:flex">
        <Link href="/" className="mb-7 flex items-center gap-2.5 px-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-ink"><Mountain size={19} strokeWidth={2.4} /></span>
          <span className="display text-xl font-semibold">Ascent</span>
        </Link>
        <nav className="flex flex-col gap-1">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} aria-current={isActive(n.href) ? "page" : undefined}
              className={cn("group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition", isActive(n.href) ? "bg-panel2 text-text" : "text-mute hover:bg-white/[0.04] hover:text-text")}>
              {isActive(n.href) && <motion.span layoutId="nav-pill" className="absolute left-0 top-2 h-6 w-[3px] rounded-r bg-accent" />}
              <n.icon size={17} />
              {n.label}
              {n.href === "/review" && due.length > 0 && <span className="num ml-auto rounded-full bg-accent/15 px-2 text-[11px] font-semibold text-accent">{due.length}</span>}
            </Link>
          ))}
        </nav>
        <div className="mt-auto space-y-3">
          <div className="card flex items-center gap-3 p-3">
            <Ring value={lvl.pct} size={46} stroke={4}>{lvl.level}</Ring>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{lvl.rank}</div>
              <div className="num text-[12px] text-mute">{xp} XP · {lvl.next - xp} to next</div>
            </div>
          </div>
          {user ? (
            <Link href="/settings" className="block truncate px-2 text-[12px] text-faint hover:text-mute">{syncing ? "Syncing… " : "Synced · "}{user.email}</Link>
          ) : (
            <Link href="/login" className="flex items-center gap-2 rounded-xl border border-dashed border-line px-3 py-2 text-[13px] text-mute hover:border-accent/40 hover:text-text">
              {cloudEnabled ? <LogIn size={15} /> : <CloudOff size={15} />}{cloudEnabled ? "Sign in to sync" : "Local mode"}
            </Link>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-line bg-bg/80 px-4 backdrop-blur-xl sm:px-8">
          <Link href="/" className="flex items-center gap-2 lg:hidden"><span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-ink"><Mountain size={16} strokeWidth={2.4} /></span></Link>
          <button onClick={() => setPalette(true)} className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-xl border border-line bg-panel px-3 text-[13px] text-faint transition hover:border-[#3a4160] hover:text-mute sm:max-w-sm">
            <Search size={15} /><span className="truncate">Search topics and problems</span><kbd className="ml-auto hidden rounded border border-line px-1.5 text-[11px] sm:block">⌘K</kbd>
          </button>
          <div className="ml-auto flex items-center gap-2">
            <FocusChip />
            <div title={`Best streak: ${streak.best} days`} className={cn("flex h-9 items-center gap-1.5 rounded-xl border px-3 text-[13px] font-semibold num", streak.doneToday ? "border-lld/40 bg-lld/10 text-lld" : "border-line bg-panel text-mute")}>
              <Flame size={15} className={streak.doneToday ? "" : "opacity-60"} />{streak.cur}
            </div>
          </div>
        </div>
        {syncError && (
          <div role="alert" className="border-b border-bad/30 bg-bad/10 px-4 py-2 text-[13px] text-bad sm:px-8">
            Cloud sync problem: {syncError}. Your progress is safe on this device and will retry on the next change.
            <button className="ml-3 underline" onClick={() => useStore.setState({ syncError: null })}>Dismiss</button>
          </div>
        )}
        <main className="mx-auto w-full max-w-[1240px] flex-1 px-4 pb-28 pt-8 sm:px-8 lg:pb-16">
          {ready ? children : <div className="grid h-[60vh] place-items-center text-sm text-faint animate-pulse-soft">Loading your trail…</div>}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-panel/95 backdrop-blur lg:hidden">
        {NAV.filter((n) => n.href !== "/progress").map((n) => (
          <Link key={n.href} href={n.href} className={cn("relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[10.5px]", isActive(n.href) ? "text-accent" : "text-mute")}>
            <n.icon size={18} />{n.label}
            {n.href === "/review" && due.length > 0 && <span className="absolute right-[22%] top-1.5 h-2 w-2 rounded-full bg-accent" />}
          </Link>
        ))}
      </nav>

      <Palette open={palette} setOpen={setPalette} />
      <Celebration />
      <Breather />
    </div>
  );
}
