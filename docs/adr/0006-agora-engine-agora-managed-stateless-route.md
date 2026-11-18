# ADR 0006: The optional Agora engine runs in Agora-managed mode through one stateless route

- Status: Accepted
- Date: 2026-11-19
- Context docs: [Architecture §4.4](../design/mock-interviewer/02-architecture.md#44-agora-engine-optional), [ADR 0003](0003-provider-realtime-voice-as-default.md), [ADR 0004](0004-byok-first-platform-credentials-later.md)

## Context

ADR 0003 made provider realtime voice the default and kept Agora as an optional engine. Agora's Conversational AI starts an agent through a REST call that must be signed with the project's App Certificate, so it cannot be called from the browser without exposing the certificate to page scripts on other origins. Two sub-modes were sketched: *Agora-managed* (Agora runs its own speech, LLM and text-to-speech vendors) and *Ascent brain* (Agora's custom-LLM URL points at an Ascent route that holds the learner's LLM key).

## Decision

- Only the **Agora-managed** sub-mode is built. The learner provides their own Agora App ID and App Certificate, stored in their browser.
- One stateless route, `POST /api/agora/[action]` (`start`, `stop`, `think`, `speak`, `update`), receives the credentials with each request, signs the call with Agora's published `agora-agents` SDK, and keeps nothing. Errors are reduced to a status and a short message with any 32-character hex strings masked.
- The browser joins the channel with Agora's `agora-rtc-sdk-ng`, loaded only when this engine is chosen. Live transcripts arrive as RTC stream messages and are parsed by a pure, tested module.
- The interviewer brain drives the agent the same way it drives the other realtime engines: cues and interventions go in through `think`, workspace context through a system-prompt `update`.
- Orphaned agents are prevented by the agent's idle timeout and session expiry, a stop on `pagehide` (`sendBeacon`), and the client-side reaper for stale `live` rounds. There is no server-side cron because the server never knows which agents exist.

## Consequences

- No AI key ever reaches Ascent's server; the Agora certificate passes through it in memory for the length of one request. That is the trade-off ADR 0004 allows for credentials that cannot be used safely from a browser.
- The *Ascent brain* sub-mode stays deferred (delivery plan Q3). It would need the sealed-token design from ADR 0004.
- The route has no rate limit. Every call is signed with the caller's own Agora project, so abuse costs only the abuser; when paid plans add platform-held Agora credentials, the route needs quotas first.
- The engine is unverified against a live Agora project until the final test pass (delivery plan V8).
