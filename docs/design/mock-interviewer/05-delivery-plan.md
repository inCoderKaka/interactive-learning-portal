# Voice mock interviewer: delivery plan

## 0. Implementation status (2026-11-18)

What exists in the code today, against the phases below. Requirement IDs refer to the [product spec](01-product-spec.md).

| Phase | Status | Built |
| --- | --- | --- |
| 0 | Done | Provider adapters with capability flags (`lib/interview/providers/llm.ts`), task profiles and presets (`lib/interview/tasks.ts`), BYOK credential source, pure brain, policy, prompts and event log (`lib/interview/core/`), session controller (`lib/interview/session.ts`). `lib/ai.ts` now delegates to these, and its public functions are unchanged. 18 unit tests (`npm test`). |
| 1 | Done | Setup screen (MI-SET-1–13), round arc with fictional persona and tones including *Surprise me*, curveballs CB-1, 2, 3, 4 (as "New question (not in Ascent)"), 7, 8, thinking pause, hints, time calls, Excalidraw whiteboard with digest, semantic tags and red-flag rules, code and notes digests, "Look at my diagram", Ascent Voice engine, recommender with roadmap and Today labels and end-weighted mock density, results into spaced review, calibration prediction, developer mode with per-task parameters and live overlay, credit line. Also a self-paced scripted interviewer when no AI is connected (keeps today's no-key behaviour). |
| 2 | Partly done | **Done:** realtime engine (Gemini Live with compression, resumption and `GoAway` handling; OpenAI Realtime over WebRTC with an ephemeral client secret), engine fallback chain (realtime → Ascent Voice → text), hiring-committee packet with evidence and self-consistency sampling, delivery analytics, LLD class-sketch digest (MI-WS-3), CB-5 and CB-6, rolling summary of long rounds. **Not yet:** Supabase `interview_*` tables and sync (rounds are kept in this browser, and scorecards sync through the existing `attempts` table), replay with recorded audio (MI-FB-2), prompt-template overrides (MI-DEV-4), budget enforcement (the budget is informational). |
| 3 | Not started | Reverse, peer, loop day, scheduled and commute modes, privacy mode, Agora engine, evaluation runner. |
| 4 | Not started | Paid plans. |

Departures from the design, and why:

- **Voice activity detection is energy-based** (an adaptive noise floor in `engines/audio.ts`), not Silero VAD. This avoids shipping ONNX Runtime and model files for a first version. Swap it in behind the same callbacks if turn-taking proves unreliable.
- **No local Whisper adapter yet.** Instead, the Ascent Voice engine can use OpenAI transcription and OpenAI voices with the learner's OpenAI key. Browser speech remains the free default.
- **Not yet tested against live services:** the realtime adapters were written against the providers' documented protocols, but no realtime session was run while building them (V3–V6 below). The first real round on each provider is the remaining verification step.
- **Interviewer judge for realtime engines.** Realtime models cannot return a silent reply on request. Their interruptions are therefore filtered by the small `interviewer.judge` task before anything is injected.

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
| V3 | Can a browser create an OpenAI Realtime WebRTC session with the learner's standard key (BYOK), or is a server mint needed? | 2 | Open. Ephemeral client secrets are documented for browsers ([client secrets](https://developers.openai.com/api/reference/resources/realtime/subresources/client_secrets)). |
| V4 | Gemini Live from the browser with a BYOK key: are ephemeral tokens required, and which API version? | 2 | Open |
| V5 | Disabling auto-response after injected context, and forcing one on demand, on both realtime providers | 2 | Open |
| V6 | Mid-session instruction updates on Gemini Live | 2 | Open |
| V7 | Chrome on-device speech recognition availability and API | 1 | Open |
| V8 | Agora: custom-LLM request format, empty-reply handling, free-tier minutes, BYO-project auth fields | 3 | Open |
| V9 | Whether Anthropic offers a speech-to-speech API (would add a third realtime adapter) | 2 | ✓ None found as of 2026-11; Claude is served through Ascent Voice |
| V10 | TURN relay provider and cost for peer mode | 3 | Open |
| Q1 | Plan tiers, quotas and pricing | 4 | Open (product decision) |
| Q2 | Default retention for opted-in recordings | 2 | Proposed 30 days |
| Q3 | Whether the Agora "Ascent brain" sub-mode is worth its server-side key handling at all | 3 | Proposed: no, unless learners ask for it |
