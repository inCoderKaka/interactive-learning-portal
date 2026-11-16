import type { Progress, Rating } from "./types";

export const todayISO = (d = new Date()) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
};
export const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return todayISO(d);
};
export const daysBetween = (a: string, b: string) =>
  Math.round((new Date(b + "T12:00:00").getTime() - new Date(a + "T12:00:00").getTime()) / 86400000);

export const RATINGS: { r: Rating; label: string; hint: string }[] = [
  { r: 0, label: "Blanked", hint: "Could not produce it" },
  { r: 1, label: "Shaky", hint: "Got there with hints or bugs" },
  { r: 2, label: "Solid", hint: "Right approach, minor slips" },
  { r: 3, label: "Fluent", hint: "Fast and clean" },
];

/** SM-2 flavoured scheduling. Returns the fields to merge into Progress. */
export function nextReview(p: Progress | undefined, rating: Rating): Pick<Progress, "ivl" | "ease" | "reps" | "lapses" | "due" | "rating"> {
  let ease = p?.ease ?? 2.5;
  let reps = p?.reps ?? 0;
  let lapses = p?.lapses ?? 0;
  const prev = p?.ivl ?? 0;
  let ivl: number;
  if (rating === 0) {
    reps = 0;
    lapses += 1;
    ease = Math.max(1.3, ease - 0.2);
    ivl = 1;
  } else {
    if (reps === 0) ivl = [1, 1, 2, 4][rating];
    else if (reps === 1) ivl = [1, 2, 5, 8][rating];
    else ivl = Math.round(prev * (rating === 1 ? 1.2 : rating === 2 ? ease : ease * 1.3));
    ease = Math.max(1.3, ease + (rating === 1 ? -0.15 : rating === 3 ? 0.15 : 0));
    reps += 1;
  }
  ivl = Math.min(Math.max(1, ivl), 120);
  return { ivl, ease, reps, lapses, due: addDays(todayISO(), ivl), rating };
}

export const isDue = (p: Progress | undefined, today = todayISO()) => !!p?.due && p.status === "done" && p.due <= today;
