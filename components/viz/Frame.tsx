"use client";
import { useState, type ReactNode } from "react";
import { ChevronRight, EyeOff } from "lucide-react";
import { useStore } from "@/lib/store";
import type { VisualPrefs } from "@/lib/types";

export const DEFAULT_VISUALS: VisualPrefs = { mode: "all", motion: "auto", hidden: [] };
export const useVisualPrefs = (): VisualPrefs => useStore((s) => s.settings.visuals ?? DEFAULT_VISUALS);

/**
 * Wraps every visual (step player, widget, simulation). The learner can hide one visual for good, or set a
 * global level in Settings (all / folded / off). A hidden visual leaves a one-line stub, so it can be opened
 * once without changing the preference.
 */
export function VisualFrame({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  const prefs = useVisualPrefs();
  const setSettings = useStore((s) => s.setSettings);
  const hiddenOne = prefs.hidden.includes(id);
  const folded = hiddenOne || prefs.mode !== "all";
  const [peek, setPeek] = useState(false);
  const hide = () => setSettings({ visuals: { ...prefs, hidden: [...new Set([...prefs.hidden, id])] } });

  if (folded && !peek) {
    if (prefs.mode === "off" && !hiddenOne) return null;
    return (
      <button data-read-skip onClick={() => setPeek(true)} className="flex w-full items-center gap-2 rounded-xl border border-dashed border-line px-4 py-2.5 text-left text-[12.5px] text-faint transition hover:border-[#3a4160] hover:text-mute">
        <ChevronRight size={14} /><span className="truncate">{hiddenOne ? "Hidden visual" : "Visual"}: <span className="text-mute">{title}</span></span>
        <span className="ml-auto shrink-0">Show</span>
      </button>
    );
  }
  return (
    <div className="group/vf relative">
      {children}
      <div data-read-skip className="absolute -top-3 right-5 z-10 flex gap-1 opacity-0 transition focus-within:opacity-100 group-hover/vf:opacity-100">
        {peek && <button onClick={() => setPeek(false)} className="rounded-lg border border-line bg-panel/90 px-2 py-1 text-[11px] text-mute backdrop-blur hover:text-text">Fold</button>}
        {!hiddenOne && <button onClick={hide} title="Hide this visual everywhere (restore it in Settings)" className="flex items-center gap-1 rounded-lg border border-line bg-panel/90 px-2 py-1 text-[11px] text-mute backdrop-blur hover:text-text"><EyeOff size={12} />Hide</button>}
      </div>
    </div>
  );
}
