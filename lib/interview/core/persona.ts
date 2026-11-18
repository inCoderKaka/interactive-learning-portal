import type { Kind, Persona, Tone } from "./types.ts";
import { pick, rng, type Rng } from "./rng.ts";

// Fictional interviewer profiles, assembled from a seed so the same session always gets the same
// person. Names are deliberately common first names only; no real people are implied.
const NAMES = ["Sam", "Priya", "Daniel", "Mei", "Arjun", "Elena", "Tomás", "Aisha", "Jonas", "Keiko", "Ravi", "Nora", "Marcus", "Lena", "Omar", "Yuki"];
const TEAMS: Record<Kind, string[]> = {
  coding: ["Search ranking infrastructure", "Maps routing", "Ads auction serving", "YouTube recommendations", "Android build tooling", "Cloud storage metadata"],
  hld: ["Cloud Spanner", "YouTube video processing", "Gmail backend", "Google Pay payments", "Pub/Sub", "Maps live traffic"],
  lld: ["Workspace collaboration", "Android framework", "Chrome sync", "Calendar backend", "Play billing", "Photos sharing"],
  behavioral: ["Developer productivity", "Search quality", "Cloud networking", "Assistant platform", "Fitbit data", "Workspace admin tools"],
};
const LIKES = [
  "the scale makes every small design choice matter",
  "the code review culture: you learn something on every change",
  "working with people who are better than me at something",
  "the freedom to pick up problems that nobody owns yet",
  "seeing a launch reach millions of users within a week",
];
const DISLIKES = [
  "some launches need a lot of approvals",
  "the internal tooling takes months to learn",
  "it is easy to end up in too many meetings",
  "priorities can change between planning cycles",
];
const ADVICE = [
  "ask for the scope you want; nobody hands it to you",
  "write things down: design docs carry more weight than meetings",
  "find a mentor outside your team in the first month",
  "get one solid launch out before chasing the big project",
];

export function makePersona(seed: number, kind: Kind): Persona {
  const r: Rng = rng(seed ^ 0x9e3779b9);
  const years = 3 + Math.floor(r() * 9);
  return {
    name: pick(r, NAMES),
    role: years >= 8 ? "Staff Software Engineer" : years >= 5 ? "Senior Software Engineer" : "Software Engineer",
    team: pick(r, TEAMS[kind]),
    years,
    likes: pick(r, LIKES),
    dislikes: pick(r, DISLIKES),
    advice: pick(r, ADVICE),
  };
}

const TONES: Tone[] = ["guide", "neutral", "neutral", "tough", "notetaker"]; // neutral is the most common in real loops

export function resolveTone(tone: Tone | "surprise", seed: number): Tone {
  return tone === "surprise" ? pick(rng(seed ^ 0x51ed27), TONES) : tone;
}
