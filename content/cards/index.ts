import type { Card } from "@/lib/types";
import { craftCards } from "./craft";
import { dsaCards } from "./dsa";
import { hldCards } from "./hld";
import { lldCards } from "./lld";
import { aiCards } from "./ai";

/** Every flashcard in the portal, keyed by topic id. This is the single source of truth: topic files carry no cards. */
export const CARDS: Record<string, Card[]> = { ...dsaCards, ...hldCards, ...lldCards, ...craftCards, ...aiCards };
