import type { Problem, Topic, Tier, Quiz, Area } from "@/lib/types";

/** Compact problem builder. Approaches are "name|idea|time|space". */
export function P(
  topic: string,
  lc: number | string,
  title: string,
  diff: "E" | "M" | "H",
  tier: Tier,
  statement: string,
  approaches: string[],
  clarify: string[],
  twists: string[],
  followUps: string[],
  hints: string[],
): Problem {
  return {
    id: typeof lc === "number" ? `p-${lc}` : `p-${lc}`,
    topic,
    title,
    lc: typeof lc === "number" ? lc : undefined,
    diff,
    tier,
    statement,
    approaches: approaches.map((a) => {
      const [name, idea, time, space] = a.split("|");
      return { name, idea, time, space };
    }),
    clarify,
    twists,
    followUps,
    hints,
  };
}

/** Quiz builder: correct option is prefixed with "*". */
export function Q(q: string, options: string[], why: string): Quiz {
  const answer = options.findIndex((o) => o.startsWith("*"));
  return { q, options: options.map((o) => o.replace(/^\*/, "")), answer, why };
}

export function T(
  area: Area,
  id: string,
  title: string,
  tier: Tier,
  est: number,
  blurb: string,
  rest: Omit<Topic, "id" | "area" | "title" | "tier" | "est" | "blurb">,
): Topic {
  return { id, area, title, tier, est, blurb, ...rest };
}

/** Second-pass additions merged onto a topic in content/index.ts. Flashcards live in content/cards/, not here. */
export interface Extra {
  deep?: string; // markdown bullets: variations, deeper analysis, bar-raiser angles
  pre?: string[]; // prerequisite topic ids (drawn as connections on the map)
}
