// Optional Agora engine (MI-PLAN-2, architecture §4.4): stateless routes that use the learner's own
// Agora App ID and App Certificate, sent per request and never stored or logged. Agora-managed
// sub-mode: Agora runs speech-to-text, the LLM and text-to-speech; the learner pays on their project.
//
//   POST /api/agora/start   {creds, channel, agentUid, userUid, instructions, greeting, voice?, endOfSpeechMs, maxMinutes} → {agentId, token}
//   POST /api/agora/stop    {creds, channel, agentUid, agentId}  (idempotent; also accepted from sendBeacon)
//   POST /api/agora/think   {creds, channel, agentUid, agentId, text}       inject a note the agent answers now
//   POST /api/agora/speak   {creds, channel, agentUid, agentId, text}       speak a fixed line
//   POST /api/agora/update  {creds, channel, agentUid, agentId, system}     replace the system prompt (context without a reply)

import { Agent, AgoraClient, Area, DeepgramSTT, ExpiresIn, MiniMaxTTS, OpenAI, generateConvoAIToken, generateRtcToken } from "agora-agents";

const HEX32 = /^[0-9a-f]{32}$/i;
const CHANNEL = /^[A-Za-z0-9_-]{1,64}$/;
const UID = /^\d{1,9}$/;
const MAX_TEXT = 24000;

interface Creds { appId: string; appCertificate: string; area?: "US" | "EU" | "AP" }
interface Body {
  creds?: Creds; channel?: string; agentUid?: string; userUid?: string; agentId?: string;
  instructions?: string; greeting?: string; voice?: string; text?: string; system?: string;
  endOfSpeechMs?: number; maxMinutes?: number;
}

class BadRequest extends Error {}

function check(b: Body, needAgent: boolean) {
  const c = b.creds;
  if (!c || !HEX32.test(c.appId ?? "") || !HEX32.test(c.appCertificate ?? "")) throw new BadRequest("An Agora App ID and App Certificate (32 hex characters each) are required.");
  if (!CHANNEL.test(b.channel ?? "")) throw new BadRequest("Invalid channel name.");
  if (!UID.test(b.agentUid ?? "")) throw new BadRequest("Invalid agent UID.");
  if (needAgent && !/^[A-Za-z0-9_-]{1,128}$/.test(b.agentId ?? "")) throw new BadRequest("Invalid agent ID.");
  for (const k of ["instructions", "greeting", "text", "system"] as const) if ((b[k]?.length ?? 0) > MAX_TEXT) throw new BadRequest(`${k} is too long.`);
  return c;
}

const area = (c: Creds) => (c.area === "EU" ? Area.EU : c.area === "AP" ? Area.AP : Area.US);
const client = (c: Creds) => new AgoraClient({ area: area(c), appId: c.appId, appCertificate: c.appCertificate });
const auth = (c: Creds, channel: string, agentUid: string) => ({ headers: { Authorization: `agora token=${generateConvoAIToken({ appId: c.appId, appCertificate: c.appCertificate, channelName: channel, uid: Number(agentUid) })}` } });

/** Errors from Agora may echo request data; return only a status and a short message. */
function fail(e: unknown) {
  if (e instanceof BadRequest) return Response.json({ error: e.message }, { status: 400 });
  const status = (e as { statusCode?: number })?.statusCode;
  const body = (e as { body?: unknown })?.body;
  const msg = typeof body === "object" && body && "message" in body ? String((body as { message: unknown }).message) : e instanceof Error ? e.message : "Agora request failed";
  return Response.json({ error: `Agora: ${msg.replace(/[0-9a-f]{32}/gi, "…").slice(0, 300)}` }, { status: status && status >= 400 && status < 600 ? status : 502 });
}

export async function POST(req: Request, ctx: { params: Promise<{ action: string }> }) {
  const { action } = await ctx.params;
  let b: Body;
  try { b = JSON.parse(await req.text()) as Body; } catch { return Response.json({ error: "Invalid JSON." }, { status: 400 }); }
  try {
    switch (action) {
      case "start": {
        const c = check(b, false);
        if (!UID.test(b.userUid ?? "")) throw new BadRequest("Invalid user UID.");
        const minutes = Math.max(5, Math.min(90, Math.round(b.maxMinutes ?? 60)));
        const agent = new Agent({
          client: client(c),
          instructions: b.instructions ?? "",
          greeting: b.greeting || undefined,
          maxHistory: 64,
          turnDetection: { language: "en-US", config: { end_of_speech: { mode: "vad", vad_config: { silence_duration_ms: Math.max(300, Math.min(2000, b.endOfSpeechMs ?? 700)) } } } },
          parameters: { data_channel: "datastream", enable_error_message: true },
        })
          .withStt(new DeepgramSTT({ model: "nova-3", language: "en" }))
          .withLlm(new OpenAI({ model: "gpt-4.1-mini", maxTokens: 300, temperature: 0.6 }))
          .withTts(new MiniMaxTTS({ model: "speech_2_6_turbo", voiceId: b.voice || "English_captivating_female1" }));
        const session = agent.createSession({
          name: `ascent-${b.channel}`, channel: b.channel!, agentUid: b.agentUid!, remoteUids: [b.userUid!],
          idleTimeout: 120, expiresIn: ExpiresIn.minutes(minutes + 10),
        });
        const agentId = await session.start();
        const token = generateRtcToken({ appId: c.appId, appCertificate: c.appCertificate, channel: b.channel!, uid: Number(b.userUid), expirySeconds: (minutes + 15) * 60 });
        return Response.json({ agentId, token, appId: c.appId });
      }
      case "stop": {
        const c = check(b, true);
        try { await client(c).agents.stop({ appid: c.appId, agentId: b.agentId! }, auth(c, b.channel!, b.agentUid!)); }
        catch (e) { if ((e as { statusCode?: number })?.statusCode !== 404) throw e; } // already gone
        return Response.json({ ok: true });
      }
      case "think": {
        const c = check(b, true);
        await client(c).agentManagement.agentThink({ appid: c.appId, agentId: b.agentId!, text: b.text ?? "", on_listening_action: "inject", on_thinking_action: "interrupt", on_speaking_action: "ignore", interruptable: true }, auth(c, b.channel!, b.agentUid!));
        return Response.json({ ok: true });
      }
      case "speak": {
        const c = check(b, true);
        await client(c).agents.speak({ appid: c.appId, agentId: b.agentId!, text: b.text ?? "", priority: "APPEND", interruptable: true }, auth(c, b.channel!, b.agentUid!));
        return Response.json({ ok: true });
      }
      case "update": {
        const c = check(b, true);
        await client(c).agents.update({ appid: c.appId, agentId: b.agentId!, properties: { llm: { system_messages: [{ role: "system", content: b.system ?? "" }] } } }, auth(c, b.channel!, b.agentUid!));
        return Response.json({ ok: true });
      }
      default:
        return Response.json({ error: "Unknown action." }, { status: 404 });
    }
  } catch (e) {
    return fail(e);
  }
}
