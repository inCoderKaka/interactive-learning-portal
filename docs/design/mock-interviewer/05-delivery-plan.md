# Voice mock interviewer: delivery plan

## 0. Implementation status (2026-11-19)

What exists in the code today, against the phases below. Requirement IDs refer to the [product spec](01-product-spec.md).

| Phase | Status | Built |
| --- | --- | --- |
| 0 | Done | Provider adapters with capability flags (`lib/interview/providers/llm.ts`), task profiles and presets (`lib/interview/tasks.ts`), BYOK credential source, pure brain, policy, prompts and event log (`lib/interview/core/`), session controller (`lib/interview/session.ts`). `lib/ai.ts` now delegates to these, and its public functions are unchanged. 18 unit tests (`npm test`). |
| 1 | Done | Setup screen (MI-SET-1–13), round arc with fictional persona and tones including *Surprise me*, curveballs CB-1, 2, 3, 4 (as "New question (not in Ascent)"), 7, 8, thinking pause, hints, time calls, Excalidraw whiteboard with digest, semantic tags and red-flag rules, code and notes digests, "Look at my diagram", Ascent Voice engine, recommender with roadmap and Today labels and end-weighted mock density, results into spaced review, calibration prediction, developer mode with per-task parameters and live overlay, credit line. Also a self-paced scripted interviewer when no AI is connected (keeps today's no-key behaviour). |
| 2 | Done (not yet tested live) | Realtime engine (Gemini Live with compression, resumption and `GoAway` handling; OpenAI Realtime over WebRTC with an ephemeral client secret), engine fallback chain, hiring-committee packet with evidence and self-consistency sampling, delivery analytics, LLD class-sketch digest (MI-WS-3), CB-5 and CB-6, rolling summary of long rounds. **Added 2026-11-19:** Supabase `interview_sessions`, `interview_events` and `interview_scorecards` with row-level security, a `reap_my_interviews` RPC and a private `interview-media` bucket (migration `20261119000000_interviews.sql`, applied to production on 2026-11-19); local-first sync that streams events in batches during a round and reconciles on the next visit (`lib/interview/sync.ts`); replay with opt-in recording and whiteboard frames in IndexedDB, 30-day retention, optional cloud backup (MI-FB-2); prompt-template overrides with versions, history, reset, import and export, and prompt provenance on scorecards (MI-DEV-4); cost guard with a local spend meter, monthly budgets per engine and in total, the small model near a limit, and engine fallback before and during a round (MI-X-5). |
| 3 | Done (not yet tested live) | Reverse mode with planted mistakes and graded feedback (MI-X-1); peer mode over WebRTC with Supabase Realtime signalling, shared workspace and an AI observer (MI-X-2, ADR 0005); loop day with independent interviewers, breaks, sealed scorecards and a committee (MI-X-3); scheduled mocks with `.ics`, reminders and a lobby (MI-X-4); privacy mode with on-device Whisper or Chrome on-device recognition, local voices and a local model, plus a "What leaves this device" disclosure for every round (MI-X-6, ADR 0007); commute mode (MI-X-7); "Redo this moment" drills from the replay (MI-FB-4); the optional Agora engine in Agora-managed mode through a stateless route (MI-PLAN-2, ADR 0006); the evaluation runner with a small labelled reference set and interrupt-judge cases (MI-DEV-7). |
| 4 | Deferred | Paid plans: deferred by decision on 2026-11-19 until plan tiers and the payments provider are chosen. |

Departures from the design, and why:

- **Voice activity detection is energy-based** (an adaptive noise floor in `engines/audio.ts`), not Silero VAD. This avoids shipping ONNX Runtime and model files for a first version. Swap it in behind the same callbacks if turn-taking proves unreliable.
- **No local Whisper adapter yet.** Instead, the Ascent Voice engine can use OpenAI transcription and OpenAI voices with the learner's OpenAI key. Browser speech remains the free default.
- **Not yet tested against live services:** the realtime adapters were written against the providers' documented protocols, but no realtime session was run while building them (V3–V6 below). The first real round on each provider is the remaining verification step.
- **Interviewer judge for realtime engines.** Realtime models cannot return a silent reply on request. Their interruptions are therefore filtered by the small `interviewer.judge` task before anything is injected.
- **Guest-mode history stays in `localStorage`; media goes to IndexedDB.** The design mirrored the cloud tables in IndexedDB. Round records (with their logs) keep using the existing local history, and only recordings and whiteboard frames, which are large, go to IndexedDB (`ascent-interviews`). Signed-in learners also get the cloud copy.
- **No server-side reaper.** Stale `live` rounds are closed by the learner's own client through the `reap_my_interviews` RPC on the next visit, under row-level security. Agora agents end through their idle timeout, their expiry and a stop on `pagehide` (ADR 0006). A scheduled job would have needed the service-role key on the server for little benefit.
- **One dynamic Agora route.** `POST /api/agora/[action]` replaces the three routes in the design and adds `think`, `speak` and `update`, which the brain needs to drive the agent.
- **Agora authentication uses the App ID and App Certificate**, as Agora's current SDK does, rather than a REST customer key and secret.
- **Bookings live in the profile settings** (`settings.mockBookings`), which already sync, rather than in a new table.
- **Peer mode scores in the candidate's browser** with the candidate's key, and each browser transcribes its own microphone (ADR 0005).
- **The evaluation set is a seed.** Four labelled synthetic transcripts and six interrupt-judge cases ship in `core/eval-cases.ts`; the design's 30–50 labelled logs grow from opted-in real rounds. "My scored rounds" can be used as a second reference set.
- **Cost estimates are approximate.** The meter counts characters as tokens (÷ 4) against list prices per model class, and realtime and Agora audio by the minute. It exists to make budgets meaningful; the provider's bill is the source of truth.

## 1. Phases

| Phase | Theme | Scope | Exit criteria |
| --- | --- | --- | --- |
| **0** | Foundations (no visible change) | Extract LLM providers from `lib/ai.ts` into adapters with capability flags. Add `TaskProfile` and the credential resolver (BYOK only). Add the pure brain, the event log, and the session state machine running the existing text mock. | Today's mock behaves the same. Brain unit tests replay logs. `lib/ai.ts` callers are unchanged. |
| **1** | Realistic room, free voice | Setup screen (MI-SET-*). Round arc, persona, tones including *Surprise me*. Curveballs CB-1, 2, 3, 4, 7, 8. Thinking pause, hints, time calls. Excalidraw whiteboard with HLD digest and semantic tags, code-doc digest, "Look at my diagram". **Ascent Voice engine** (Silero VAD, Web Speech or provider STT, browser or provider TTS). Recommender and roadmap mock slots (MI-PER-*). Results into spaced review. Calibration prediction. Developer mode v1 (tasks, parameters, presets, speech settings). Inspired-by credit line. | A learner with any one provider key runs a 45-minute voice HLD round with whiteboard interventions, gets a scorecard, and sees the next mock suggested on the roadmap. |
| **2** | Realtime voice and evidence | **Realtime engine** (Gemini Live and OpenAI Realtime adapters, resumption and compression, injection, proactive responses). Engine fallback chain. Supabase tables and sync. Hiring-committee packet with evidence. Replay with local recording. Delivery analytics. LLD digest. CB-5, CB-6. Cost guard. Prompt overrides and the debug overlay. | Median speech-end → first-audio under 1.2 s on Realtime. Gemini sessions survive 45 minutes with resumption. The scorecard cites evidence for every rating. |
| **3** | Modes | Reverse mode, peer mode (WebRTC, Supabase Realtime signalling, TURN decision), loop day, scheduled mocks, commute mode, privacy mode (local Whisper). Optional **Agora engine** (agora-managed sub-mode), with token, start and stop routes and the reaper. Evaluation runner in developer mode. | Each mode has a contract test and an end-to-end smoke test. The Agora engine passes the same engine contract suite. |
| **4** | Paid plans | Entitlements, quotas, the `/api/realtime/token` mint, the usage ledger and reconciliation, rate limits, bot checks. Payments provider chosen via an ADR. Plan tiers defined. | A signed-in user on a plan runs a realtime round with no keys at all. Usage reconciles with the provider within 2%. |

## 2. Cost model

Rates change often, so this section gives the structure. The setup screen computes actual numbers from a rates file that is kept up to date.

| Engine | Cost drivers per 45-minute round | Who pays (BYOK) |
| --- | --- | --- |
| Text | ~30–60 interviewer turns × (stable prompt, cached, plus rolling context) + 1 scorecard (×3 samples) | Learner's LLM account |
| Ascent Voice | Same LLM cost as text. STT and TTS are free with browser engines, or per-minute with provider engines. | Learner |
| Realtime | Audio input and output tokens for the whole session (the highest per-minute cost), plus the scorecard on a text model | Learner's Gemini or OpenAI account |
| Agora (optional) | Agora agent minutes plus vendor STT, LLM and TTS (reseller or BYOK) | Learner's Agora project |

Cost controls built into the design:

- prompt caching of the stable block;
- summarising older turns instead of resending them;
- deterministic gates before any judge call;
- digests sent as diffs, with images only on request;
- a cheap round model with a strong scorecard model;
- the budget and fallback chain (MI-X-5);
- peer mode, where one AI listener serves two people.

## 3. Migration from today's mock

- `/mock` keeps its URL. The setup screen gains the new options, and the defaults match today: random question, neutral tone, text engine when no voice-capable setup exists.
- Existing `attempts` rows of kind `mock:*` stay readable. New sessions also write one, so the progress page and history keep working.
- The bias-guard copy ("you cannot pick the question") becomes an explanation of why *Random* is the default, and why picked questions are tracked separately.

## 4. Risks

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| Realtime APIs change (events, limits, pricing) | High | Medium | Adapters behind `RealtimeProvider`, a contract test suite, pinned SDK versions, and the fallback to Ascent Voice |
| Gemini Live session limits break long rounds | Medium | High | Compression plus resumption plus `GoAway` handling, with a state re-seed from the brain. Tested by a 60-minute soak in Phase 2. |
| Interviewer interrupts too much or too little | High | High | Deterministic gates, pressure tables, the intervention evaluation set, and the debug overlay to tune it |
| STT mishears technical terms | Medium | Medium | Key-term boosting from question vocabulary, a visible editable transcript, and text input always available |
| Browser support (Web Speech missing in Firefox; WebGPU varies) | Medium | Medium | Capability checks on the setup screen, which offers only engines that work in the current browser |
| Scorecard inconsistency | Medium | High | Self-consistency sampling, low temperature, an evidence requirement, and the labelled evaluation set |
| Learner's own costs surprise them | Medium | Medium | Estimate before start, a running cost in the overlay, budgets |
| Paid plan abuse | Medium (Phase 4) | High | One live session per user, quotas, rate limits, bot checks, short-lived tokens |
| Seen as copying the reference projects | Low | Medium | Independent implementation, credits in README, docs and UI, and the MIT notice kept on any adapted file |

## 5. Open questions and verification list

Facts to check against current provider documentation before the relevant phase starts. Items marked ✓ were checked on 2026-11-18 and are recorded with their source.

| # | Question | Phase | Status |
| --- | --- | --- | --- |
| V1 | OpenAI Realtime maximum session length | 2 | ✓ Documented as 60 minutes ([realtime conversations guide](https://developers.openai.com/api/docs/guides/realtime-conversations.md)) |
| V2 | Gemini Live session and connection limits, compression, resumption | 2 | ✓ Partly: a 128k context window, connections of about 10 min, `GoAway`, resumption handles valid for 2 h, and compression allowing unlimited sessions ([session management](https://ai.google.dev/gemini-api/docs/live-api/session-management)). The ~15-minute audio-only cap is from Firebase docs; re-check it. |
| V3 | Can a browser create an OpenAI Realtime WebRTC session with the learner's standard key (BYOK), or is a server mint needed? | 2 | Built on browser-minted client secrets ([client secrets](https://developers.openai.com/api/reference/resources/realtime/subresources/client_secrets)); confirm in the final test pass (T2). |
| V4 | Gemini Live from the browser with a BYOK key: are ephemeral tokens required, and which API version? | 2 | Built on the `v1beta` WebSocket with the key; confirm in T1 |
| V5 | Disabling auto-response after injected context, and forcing one on demand, on both realtime providers | 2 | Built; confirm in T1–T2 |
| V6 | Mid-session instruction updates on Gemini Live | 2 | Applied on the next reconnect; confirm in T1 |
| V7 | Chrome on-device speech recognition availability and API | 3 | Built against `processLocally`, `available()` and `install()`, feature-detected; confirm in T9 |
| V8 | Agora: start, think, update and stop with a BYO project; transcript message format | 3 | Built with `agora-agents` 2.13.0 and `agora-rtc-sdk-ng` 4.24.9; the route reaches Agora and rejects invalid tokens (checked 2026-11-19); a live agent is unverified (T10). Custom-LLM questions are moot (ADR 0006). |
| V9 | Whether Anthropic offers a speech-to-speech API (would add a third realtime adapter) | 2 | ✓ None found as of 2026-11; Claude is served through Ascent Voice |
| V10 | TURN relay provider and cost for peer mode | 3 | ✓ Decided: no Ascent-hosted relay; learners may add their own (ADR 0005) |
| Q1 | Plan tiers, quotas and pricing | 4 | Open (product decision) |
| Q2 | Default retention for opted-in recordings | 2 | ✓ 30 days on the device; cloud backups stay until deleted |
| Q3 | Whether the Agora "Ascent brain" sub-mode is worth its server-side key handling at all | 3 | ✓ Not built (ADR 0006) |

## 6. Final browser test pass

**First pass, 2026-11-19 (by Claude, in Chrome, without AI keys or a microphone):** passed: the setup screen and every format, a self-paced system design round with whiteboard drawing, replay with markers and a whiteboard frame from IndexedDB, redo drills, a two-round loop day ending early, booking with a valid `.ics`, the lobby and an on-time start, a prompt override reaching the round's overlay, then reset with history, and the developer panels. Two bugs found and fixed (self-paced drills opened with the closing line; a loop day with no scorecards re-rendered forever). The migration is applied, and anonymous access to the new tables, function and bucket is refused. In production, the Agora route rejects bad input and reaches Agora, and the signed-in sync runs without errors. Still to do by a person: everything that needs an AI key, a microphone or a second browser (T1–T3, T6, T8–T12, T15, and the voice part of T4).

Everything in Phases 2 and 3 compiles, passes the unit tests (37, `npm test`) and builds, but the parts that need a microphone, a live provider or a second browser have not been run. Before applying the migration in production, run each item below and note what breaks: the error shown, an interviewer that stays silent or talks over you, a garbled transcript, or a missing replay.

| # | What to run | What to look for |
| --- | --- | --- |
| T0 | Apply `supabase/migrations/20261119000000_interviews.sql` to the project (`supabase db push`), then sign in and finish one text round | A row each in `interview_sessions`, `interview_events` and `interview_scorecards`; the round appears in history on a second device with a cloud icon and opens with its transcript |
| T1 | A 15-minute HLD round on **Gemini Live**, drawing on the whiteboard | Greeting, interruption on a bad diagram, time calls, reconnect after ~10 minutes without losing the thread |
| T2 | The same on **OpenAI Realtime** | As T1, and that typed lines get answered |
| T3 | A coding round on **Ascent Voice** with browser speech, then with OpenAI speech | Turn-taking, barge-in, captions |
| T4 | A text round with **Record audio for replay** on, on a voice engine | The replay plays both voices on realtime engines, your voice only with browser speech; whiteboard frames follow the scrubber; markers jump to the right moment |
| T5 | **Redo this moment** from a replay | A five-minute drill that opens on the same question, then a side-by-side comparison |
| T6 | Set a $0.05 realtime budget and start a realtime round | The setup screen warns, the round starts on Ascent Voice; mid-round, the overlay shows the cost and the engine falls back when the limit is hit |
| T7 | **Developer mode**: override `interviewer.tone.neutral`, run a round, export and re-import the overrides, reset | The overlay lists the override; the scorecard's provenance shows `+interviewer.tone.neutral.v1`; reset restores the default |
| T8 | **Evaluation runner**: reference set and interrupt judge | A results table and metrics; the four reference cases should land within one decision step |
| T9 | **Privacy mode** with a local model server: Whisper base, then Chrome on-device recognition | Model download progress on first use; "What leaves this device" shows only your local server; no network requests carry audio (check the browser's network panel) |
| T10 | **Agora engine** with your own App ID and certificate | The agent joins and greets, transcripts appear, a whiteboard change reaches it, End stops the agent (check the Agora console) |
| T11 | **Reverse mode**, coding and HLD | The AI candidate writes code or a board sketch into the doc, makes its mistakes, and grading names caught and missed ones |
| T12 | **Peer mode** in two browsers (or two devices) on different networks | Room code join, audio both ways, transcript lines from both sides, live whiteboard mirroring, feedback exchange, AI scorecard on the candidate's side |
| T13 | **Loop day** at L4 with short rounds | A different interviewer, tone and voice per round, a break screen, and a committee decision at the end |
| T14 | **Book for later** five minutes ahead, then browse elsewhere in the app | The `.ics` file downloads, the banner appears ten minutes before, the lobby counts down and the round starts on time |
| T15 | **Commute mode** on a phone (behavioural, voice) | The phone layout, large controls, captions |

