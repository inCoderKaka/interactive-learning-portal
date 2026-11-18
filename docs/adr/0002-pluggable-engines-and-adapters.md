# ADR 0002: Voice, LLM, speech and workspace capabilities sit behind adapter interfaces

- Status: Accepted
- Date: 2026-11-18
- Context docs: [Architecture §7](../design/mock-interviewer/02-architecture.md#7-extensibility-the-adapter-registry), [Detailed design §2](../design/mock-interviewer/03-detailed-design.md#2-ports-and-adapters)

## Context

The interviewer must work across text, browser-based voice, provider realtime voice and, optionally, Agora. It must work with Gemini, Claude, OpenAI-compatible and local models, and with several workspaces (code doc, whiteboard, notes). Providers change their APIs often.

## Decision

Use ports and adapters. The core (the brain, policy, prompts, state machine and event log) is pure TypeScript with no I/O. Each external capability is an interface: `VoiceEngine`, `LlmProvider`, `RealtimeProvider`, `SttProvider`, `TtsProvider`, `Surface`, `Digester`, `QuestionSource`, `Curveball`, `Scorer` and `CredentialSource`. Each has a registry and a contract test suite. Adapters declare capability flags, and the core branches on capabilities, never on adapter identity.

## Consequences

- A new provider or engine is one file plus a registry entry, and it must pass the contract tests.
- Mid-session engine fallback is possible, because state lives in the brain and the log rather than in the engine.
- The brain can be tested and evaluated offline by replaying event logs.
- There is a small indirection cost, and the capability flags need maintenance.
