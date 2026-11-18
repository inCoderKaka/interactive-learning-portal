# ADR 0003: Default voice comes from the learner's existing AI provider; Agora is optional

- Status: Proposed (supersedes the Agora-first plan discussed on 2026-11-18)
- Date: 2026-11-18
- Context docs: [Architecture §2](../design/mock-interviewer/02-architecture.md#2-the-engine-decision-in-one-table)

## Context

The first plan used Agora Conversational AI for voice. That forces learners to create a second account (an Agora project) on top of their AI provider, and Agora's custom-LLM mode would need learners' LLM keys on our server, against our standing rule that keys stay in the browser. For a one-to-one conversation with an AI, Agora's media network adds nothing that the learner's AI provider does not already offer. Gemini Live and OpenAI Realtime provide low-latency speech-to-speech, server-side turn detection and barge-in, and both are reachable with the key Ascent already asks for.

## Decision

- **Realtime voice** (Gemini Live or OpenAI Realtime, connected from the browser with the learner's key) is the default voice engine when such a key exists.
- **Ascent Voice** (browser VAD → STT → any LLM → TTS) is the universal fallback. It covers Claude, local models and free use.
- **Agora** remains an optional adapter (Phase 3), in its Agora-managed LLM sub-mode only, for learners who want it.
- We do not build speech models or media servers.

## Consequences

- One account is enough: the AI key the learner already uses in Ascent.
- No server is needed for BYOK voice. Paid plans need a small token-minting route.
- Turn timing on realtime engines is owned by the provider. The brain steers through instructions, context injection and explicit response requests, which is less direct than per-turn prompting. Ascent Voice keeps full control for learners who prefer it.
- Provider session limits (notably Gemini Live) need resumption and compression handling.
- Realtime audio costs more per minute than a cascaded pipeline. It is disclosed before each round and capped by budgets.
