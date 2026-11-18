"use client";
// Cloud sync for mock rounds (interview_sessions / interview_events / interview_scorecards).
// Local-first: the round always lives in this browser; signed-in learners also get a copy in Supabase,
// written in batches while the round runs and reconciled on the next visit (architecture §5, §6).

import { supabase } from "@/lib/supabase";
import { useStore } from "@/lib/store";
import type { LoggedEvent, SessionEvent } from "./core/types";
import type { Scorecard } from "./core/scoring";
import type { SessionRecord } from "./results";
import type { EventSink, Frame, InterviewSession } from "./session";
import type { RoundMedia } from "./media";

const BATCH = 50, EVERY_MS = 5000, PAGE = 500;

const uid = () => useStore.getState().user?.id;
const iso = (ms: number) => new Date(ms).toISOString();

function eventRow(sessionId: string, user: string, ev: LoggedEvent) {
  const { type, ...payload } = ev.e;
  return { session_id: sessionId, seq: ev.seq, user_id: user, t_ms: Math.round(ev.t), type, payload };
}

function sessionRow(r: Pick<SessionRecord, "id" | "cfg" | "question" | "picked" | "at" | "stats" | "engine" | "endedAt" | "hasMedia" | "tone" | "persona">, user: string, status: "live" | "scoring" | "done" | "abandoned") {
  return {
    id: r.id, user_id: user, config: { ...r.cfg, resolvedTone: r.tone, persona: r.persona }, question_ref: r.question.id, question_snapshot: r.question, picked: r.picked,
    format: r.cfg.format ?? "standard", engine: r.engine ?? r.cfg.engine, status, started_at: iso(r.at), ended_at: r.endedAt ? iso(r.endedAt) : null,
    deadline_at: iso(r.at + (r.cfg.minutes + 15) * 60000), loop_id: r.cfg.loop?.id ?? null, stats: r.stats ?? null, has_media: !!r.hasMedia, updated_at: iso(Date.now()),
  };
}

function report(e: { message: string } | null | undefined) { if (e) useStore.setState({ syncError: `Interview sync: ${e.message}` }); }

/** Streams a live round's events to the cloud in batches (one write per 5 s or 50 events). */
export class CloudLog implements EventSink {
  private buf: LoggedEvent[] = [];
  private timer: ReturnType<typeof setTimeout> | undefined;
  private ready: Promise<boolean>;
  private chain: Promise<void> = Promise.resolve();

  constructor(private session: InterviewSession) {
    this.ready = this.begin();
  }

  static attach(session: InterviewSession): (() => void) | null {
    if (!supabase() || !uid()) return null;
    return session.addSink(new CloudLog(session));
  }

  private async begin(): Promise<boolean> {
    const sb = supabase(), u = uid();
    if (!sb || !u) return false;
    const s = this.session;
    const { error } = await sb.from("interview_sessions").upsert(sessionRow({ id: s.id, cfg: s.cfg, question: s.state.question, picked: s.cfg.selection.mode === "exact", at: Date.now(), stats: undefined as never, engine: s.engineNow, endedAt: undefined, hasMedia: false, tone: s.state.tone, persona: s.state.persona }, u, "live"));
    report(error);
    return !error;
  }

  event(ev: LoggedEvent) {
    this.buf.push(ev);
    if (this.buf.length >= BATCH) this.flush();
    else if (!this.timer) this.timer = setTimeout(() => this.flush(), EVERY_MS);
  }

  ended() { this.flush(); }

  flush() {
    clearTimeout(this.timer);
    this.timer = undefined;
    const batch = this.buf.splice(0);
    if (!batch.length) return this.chain;
    this.chain = this.chain.then(async () => {
      if (!(await this.ready)) return;
      const sb = supabase(), u = uid();
      if (!sb || !u) return;
      const { error } = await sb.from("interview_events").upsert(batch.map((ev) => eventRow(this.session.id, u, ev)), { onConflict: "session_id,seq", ignoreDuplicates: true });
      report(error);
    });
    return this.chain;
  }
}

/** Write a finished round: the session row, every event not yet written, and the scorecard if there is one. */
export async function uploadRecord(r: SessionRecord): Promise<void> {
  const sb = supabase(), u = uid();
  if (!sb || !u) return;
  const s1 = await sb.from("interview_sessions").upsert(sessionRow(r, u, r.scorecard || r.log.length < 3 ? "done" : "scoring"));
  if (s1.error) return report(s1.error);
  for (let i = 0; i < r.log.length; i += PAGE) {
    const { error } = await sb.from("interview_events").upsert(r.log.slice(i, i + PAGE).map((ev) => eventRow(r.id, u, ev)), { onConflict: "session_id,seq", ignoreDuplicates: true });
    if (error) return report(error);
  }
  if (r.scorecard) await uploadScorecard(r);
}

export async function uploadScorecard(r: SessionRecord) {
  const sb = supabase(), u = uid();
  if (!sb || !u || !r.scorecard) return;
  const c = r.scorecard;
  const { error } = await sb.from("interview_scorecards").upsert({
    session_id: r.id, user_id: u, decision: c.decision, level_supported: c.level || null, ratings: c.ratings, card: c,
    predicted_decision: r.predicted ?? null, model: r.model ?? {}, created_at: iso(r.endedAt ?? Date.now()),
  });
  report(error);
  if (!error) report((await sb.from("interview_sessions").update({ status: "done", updated_at: iso(Date.now()) }).eq("id", r.id)).error);
}

/** Abandon own rounds left live, push local rounds the cloud lacks, and return cloud rounds this device lacks. */
export async function syncInterviews(local: SessionRecord[]): Promise<SessionRecord[]> {
  const sb = supabase(), u = uid();
  if (!sb || !u) return [];
  await sb.rpc("reap_my_interviews");
  const { data, error } = await sb.from("interview_sessions")
    .select("id, config, question_snapshot, picked, engine, status, started_at, ended_at, stats, has_media, interview_scorecards(card, predicted_decision, model)")
    .eq("user_id", u).neq("status", "live").order("started_at", { ascending: false }).limit(100);
  if (error) { report(error); return []; }
  const cloudIds = new Set((data ?? []).map((r) => r.id as string));
  for (const r of local) if (!cloudIds.has(r.id) && r.log.length) await uploadRecord(r);
  const have = new Set(local.map((r) => r.id));
  return (data ?? []).filter((row) => !have.has(row.id as string)).map((row): SessionRecord => {
    const cfg = row.config as SessionRecord["cfg"] & { resolvedTone?: SessionRecord["tone"]; persona?: SessionRecord["persona"] };
    const sc = (Array.isArray(row.interview_scorecards) ? row.interview_scorecards[0] : row.interview_scorecards) as { card: Scorecard; predicted_decision: string | null; model: SessionRecord["model"] } | null | undefined;
    return {
      id: row.id as string, at: new Date(row.started_at as string).getTime(), cfg, question: row.question_snapshot as SessionRecord["question"],
      tone: cfg.resolvedTone ?? "neutral", persona: cfg.persona ?? { name: "Interviewer", role: "", team: "", years: 0, likes: "", dislikes: "", advice: "" },
      picked: !!row.picked, log: [], finalDigests: {}, stats: (row.stats ?? {}) as SessionRecord["stats"], hints: 0, engine: row.engine as SessionRecord["engine"],
      endedAt: row.ended_at ? new Date(row.ended_at as string).getTime() : undefined, hasMedia: !!row.has_media, remote: true,
      scorecard: sc?.card, predicted: (sc?.predicted_decision ?? undefined) as SessionRecord["predicted"], model: sc?.model,
    };
  });
}

/** The event log of a cloud round, fetched page by page. */
export async function loadRemoteLog(id: string): Promise<LoggedEvent[]> {
  const sb = supabase();
  if (!sb) return [];
  const out: LoggedEvent[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from("interview_events").select("seq, t_ms, type, payload").eq("session_id", id).order("seq").range(from, from + 999);
    if (error) { report(error); break; }
    for (const r of data ?? []) out.push({ seq: r.seq as number, t: r.t_ms as number, e: { type: r.type, ...(r.payload as object) } as SessionEvent });
    if (!data || data.length < 1000) break;
  }
  return out;
}

// ---- opt-in media backup (interview-media bucket, <uid>/<session>/…) ----

export async function uploadMedia(m: RoundMedia): Promise<boolean> {
  const sb = supabase(), u = uid();
  if (!sb || !u) return false;
  const base = `${u}/${m.id}`;
  if (m.audio) {
    const { error } = await sb.storage.from("interview-media").upload(`${base}/audio`, m.audio, { contentType: m.audio.type.split(";")[0] || "audio/webm", upsert: true });
    if (error) { report(error); return false; }
  }
  const meta = new Blob([JSON.stringify({ audioOffsetMs: m.audioOffsetMs, interviewerAudio: m.interviewerAudio, frames: m.frames })], { type: "application/json" });
  const { error } = await sb.storage.from("interview-media").upload(`${base}/frames.json`, meta, { contentType: "application/json", upsert: true });
  if (error) { report(error); return false; }
  report((await sb.from("interview_sessions").update({ has_media: true }).eq("id", m.id)).error);
  return true;
}

export async function downloadMedia(id: string): Promise<RoundMedia | undefined> {
  const sb = supabase(), u = uid();
  if (!sb || !u) return undefined;
  const base = `${u}/${id}`;
  const [audio, meta] = await Promise.all([sb.storage.from("interview-media").download(`${base}/audio`), sb.storage.from("interview-media").download(`${base}/frames.json`)]);
  if (meta.error && audio.error) return undefined;
  const j = meta.data ? JSON.parse(await meta.data.text()) as { audioOffsetMs: number; interviewerAudio: boolean; frames: Frame[] } : { audioOffsetMs: 0, interviewerAudio: false, frames: [] };
  return { id, at: Date.now(), audio: audio.data ?? undefined, audioOffsetMs: j.audioOffsetMs, interviewerAudio: j.interviewerAudio, frames: j.frames };
}

export async function deleteCloudMedia(id: string) {
  const sb = supabase(), u = uid();
  if (!sb || !u) return;
  await sb.storage.from("interview-media").remove([`${u}/${id}/audio`, `${u}/${id}/frames.json`]);
  await sb.from("interview_sessions").update({ has_media: false }).eq("id", id);
}
