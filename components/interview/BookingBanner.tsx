"use client";
// Scheduled mocks (MI-X-4): a reminder across the app when a booked round is about to start.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CalendarClock } from "lucide-react";
import { useStore } from "@/lib/store";
import { upcoming, type Booking } from "@/lib/interview/core/booking";

const SOON_MS = 10 * 60000;

export function BookingBanner() {
  const bookings = useStore((s) => s.settings.mockBookings) as Booking[] | undefined;
  const path = usePathname();
  const [now, setNow] = useState(0);
  const notified = useRef(new Set<string>());
  useEffect(() => { setNow(Date.now()); const t = setInterval(() => setNow(Date.now()), 15000); return () => clearInterval(t); }, []);
  const next = now ? upcoming(bookings ?? [], now)[0] : undefined;
  const soon = next && next.at - now <= SOON_MS;

  useEffect(() => {
    if (!soon || !next || notified.current.has(next.id)) return;
    notified.current.add(next.id);
    try { if (typeof Notification !== "undefined" && Notification.permission === "granted") new Notification("Mock interview soon", { body: `${next.title} starts at ${new Date(next.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.` }); } catch { /* notifications unavailable */ }
  }, [soon, next]);

  if (!soon || !next || path?.startsWith("/mock")) return null;
  const mins = Math.max(0, Math.round((next.at - now) / 60000));
  return (
    <div className="border-b border-hld/30 bg-hld/10 px-4 py-2 text-[13px] text-[#cfe0ff] sm:px-8">
      <CalendarClock size={14} className="mr-1.5 inline" />{next.title} {mins ? `starts in ${mins} minute${mins > 1 ? "s" : ""}` : "is starting now"}. <Link href={`/mock?booking=${next.id}`} className="ml-2 font-semibold underline underline-offset-2">Go to the lobby</Link>
    </div>
  );
}
