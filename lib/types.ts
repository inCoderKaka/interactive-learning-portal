export type Area = "dsa" | "hld" | "lld" | "craft";
export type Tier = 1 | 2 | 3;

export interface Quiz {
  q: string;
  options: string[];
  answer: number;
  why: string;
}

export interface Ref {
  kind: "video" | "playlist" | "article" | "paper" | "book" | "course" | "tool";
  title: string;
  by: string; // channel, author or site
  url: string;
  yt?: string; // YouTube video id (videos only)
  featured?: boolean; // embedded as the one lead video of a topic
}

/** What kind of memory a flashcard trains. Untagged cards are plain concept recall. */
export type CardKind = "pattern" | "variation" | "pitfall";
/** A flashcard: [front, back, kind?]. The front must make sense with no topic header next to it. */
export type Card = [front: string, back: string, kind?: CardKind];

export interface Topic {
  id: string;
  area: Area;
  title: string;
  tier: Tier;
  est: number; // minutes
  blurb: string;
  signals: string[]; // "reach for this when…"
  lesson: string; // markdown
  template?: string; // code
  pitfalls: string[];
  viz?: string; // visualizer id
  quiz: Quiz[];
  cards?: Card[]; // flashcards, authored in content/cards/
  prereq?: string[];
  refs?: Ref[];
}

export interface Approach {
  name: string;
  idea: string;
  time: string;
  space: string;
}

export interface Problem {
  id: string;
  topic: string;
  title: string;
  lc?: number;
  diff: "E" | "M" | "H";
  tier: Tier;
  statement: string;
  approaches: Approach[];
  clarify: string[];
  twists: string[]; // how an interviewer departs from the LeetCode version
  followUps: string[];
  hints: string[];
  url?: string; // direct LeetCode link
  premium?: boolean; // LeetCode subscription needed
  video?: Ref; // a walkthrough, shown only alongside the approaches
  custom?: boolean;
}

export interface Stage {
  key: string;
  title: string;
  ask: string; // what the learner should produce
  model: string; // markdown model answer
}

export interface ArchNode {
  id: string;
  label: string;
  kind: "client" | "edge" | "service" | "db" | "cache" | "queue" | "store" | "worker" | "ext";
  x: number;
  y: number;
  note: string; // what it does + what breaks if it dies
}
export interface ArchEdge {
  a: string;
  b: string;
  label?: string;
  async?: boolean;
}
export interface ClassBox {
  name: string;
  kind?: "class" | "interface" | "enum" | "abstract";
  fields?: string[];
  methods?: string[];
}
export interface ClassRel {
  a: string;
  b: string;
  type: "extends" | "implements" | "has" | "uses";
  label?: string;
}

export interface Design {
  id: string;
  area: Area;
  topic: string;
  title: string;
  tier: Tier;
  est: number;
  prompt: string;
  stages: Stage[];
  steer: [string, string][]; // [direction the interviewer pushes, what a strong answer covers]
  pitfalls: string[];
  arch?: { nodes: ArchNode[]; edges: ArchEdge[] };
  classes?: { boxes: ClassBox[]; rels: ClassRel[] };
  level?: string; // what separates L4 from L5 on this question
  refs?: Ref[];
}

export type ItemKind = "topic" | "problem" | "design" | "mock";
export interface Item {
  id: string;
  kind: ItemKind;
  area: Area;
  topic: string;
  title: string;
  tier: Tier;
  est: number;
  href: string;
}

export type Rating = 0 | 1 | 2 | 3; // again, hard, good, easy
export interface Progress {
  status: "todo" | "doing" | "done";
  rating?: Rating;
  conf?: number; // predicted confidence 1-5 before the attempt
  score?: number; // 0-100, AI or quiz score
  due?: string; // ISO date of next review
  ivl?: number; // days
  ease?: number;
  reps?: number;
  lapses?: number;
  time?: number; // seconds spent
  updated: number;
}
export interface Note {
  body: string;
  updated: number;
}
export interface DayLog {
  min: number;
  xp: number;
  done: number;
}
export interface Settings {
  name: string;
  weeks: number;
  hoursPerDay: number;
  startDate: string;
  daysPerWeek: number;
  lang: "cpp" | "java" | "python" | "javascript";
  provider: "gemini" | "claude" | "openai" | "local";
  geminiModel: string;
  claudeModel: string;
  openaiModel: string;
  localModel: string;
  localUrl: string;
  focusMin: number;
  breakMin: number;
  blind: boolean; // hide topic tags while practising
  areas: Record<Area, boolean>;
  ai?: AiSettingsPatch; // developer mode and voice; merged with defaults by getAi()
  mockBookings?: MockBooking[]; // scheduled mocks (MI-X-4); synced with the profile
}

/** A booked mock round; the full shape lives in lib/interview/core/booking.ts. */
export interface MockBooking { id: string; at: number; title: string; cfg: unknown; outOfCurriculum?: boolean; createdAt: number; startedAt?: number }

/** Stored shape of AI settings: anything missing falls back to the defaults in lib/interview/tasks.ts. */
export interface AiSettingsPatch {
  devMode?: boolean;
  preset?: string;
  tasks?: object;
  speech?: object;
  realtime?: object;
  budgetUsd?: number;
}

export interface Feedback {
  verdict: "correct" | "partial" | "incorrect";
  score: number;
  summary: string;
  bugs: string[];
  edgeCases: string[];
  complexity?: { time: string; space: string; optimal: boolean; note?: string };
  strengths: string[];
  improvements: string[];
  rubric?: Record<string, number>; // 1-4 each
  followUp?: string;
}
export interface Attempt {
  id: string;
  item: string;
  kind: string;
  input: string;
  feedback: Feedback | null;
  score: number | null;
  at: number;
}
