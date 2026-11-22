import type { Drill } from "@/lib/types";
import { dsaDrills } from "./dsa";
import { designDrills } from "./design";
import { aiDrills } from "./ai";

/** Quick-play drills keyed by topic id (see lib/drills.ts for the kinds and authoring helpers). */
export const DRILLS: Record<string, Drill[]> = { ...dsaDrills, ...designDrills, ...aiDrills };
