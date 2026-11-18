// Scheduled mocks (MI-X-4): book a slot, get an .ics file, and the room opens at that time with a short
// lobby, to rehearse the nerves of showing up. Pure.

import type { SessionConfig } from "./types.ts";

export interface Booking {
  id: string;
  at: number;          // epoch ms of the start
  title: string;
  cfg: SessionConfig;  // the configuration chosen when booking (question drawn at start)
  outOfCurriculum?: boolean;
  createdAt: number;
  startedAt?: number;  // set when the round was started from this booking
}

/** The lobby opens this long before the start and the slot stays joinable this long after it. */
export const LOBBY_MS = 3 * 60000;
export const LATE_MS = 20 * 60000;

export function upcoming(bs: Booking[], now: number): Booking[] {
  return bs.filter((b) => !b.startedAt && b.at + LATE_MS > now).sort((a, b) => a.at - b.at);
}

/** The booking whose lobby is open now, if any. */
export function lobbyOpen(bs: Booking[], now: number): Booking | null {
  return upcoming(bs, now).find((b) => now >= b.at - LOBBY_MS) ?? null;
}

export function missed(bs: Booking[], now: number): Booking[] {
  return bs.filter((b) => !b.startedAt && b.at + LATE_MS <= now);
}

const pad = (n: number) => String(n).padStart(2, "0");
/** UTC timestamp in iCalendar basic format. */
export function icsTime(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

/** Escape text per RFC 5545 and fold lines longer than 75 octets. */
function esc(s: string) { return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n"); }
function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (rest.length > 74) { out.push(rest.slice(0, 74)); rest = ` ${rest.slice(74)}`; }
  out.push(rest);
  return out.join("\r\n");
}

export function icsFor(b: Booking, url: string, now = Date.now()): string {
  const end = b.at + b.cfg.minutes * 60000;
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Ascent//Mock interview//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${b.id}@ascent`,
    `DTSTAMP:${icsTime(now)}`,
    `DTSTART:${icsTime(b.at)}`,
    `DTEND:${icsTime(end)}`,
    `SUMMARY:${esc(b.title)}`,
    `DESCRIPTION:${esc(`A ${b.cfg.minutes}-minute mock interview in Ascent. Join a few minutes early: ${url}`)}`,
    `URL:${esc(url)}`,
    "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(b.title)}`, "TRIGGER:-PT10M", "END:VALARM",
    "END:VEVENT", "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}
