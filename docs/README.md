# Ascent documentation

| Document | What it covers |
| --- | --- |
| [Voice mock interviewer: overview](design/mock-interviewer/00-overview.md) | Why we are building it, goals, non-goals, prior art and credits |
| [Product specification](design/mock-interviewer/01-product-spec.md) | Every user-facing capability, with requirement IDs |
| [Architecture](design/mock-interviewer/02-architecture.md) | Components, adapters, data flow, deployment, scalability, security |
| [Detailed design](design/mock-interviewer/03-detailed-design.md) | TypeScript contracts, the session state machine, event log, schema |
| [AI configuration and developer mode](design/mock-interviewer/04-ai-configuration.md) | AI task catalogue, tunable parameters, presets, prompt architecture, evaluation |
| [Delivery plan](design/mock-interviewer/05-delivery-plan.md) | Phases, implementation status, cost model, risks, verification list and the final browser test pass |

## Architecture decision records

| ADR | Decision |
| --- | --- |
| [0001](adr/0001-native-integration-over-embedding.md) | Build the interviewer natively in Ascent rather than embedding or forking a third-party app |
| [0002](adr/0002-pluggable-engines-and-adapters.md) | Voice, LLM, speech and workspace capabilities sit behind adapter interfaces |
| [0003](adr/0003-provider-realtime-voice-as-default.md) | Default voice comes from the user's existing AI provider; Agora becomes optional |
| [0004](adr/0004-byok-first-platform-credentials-later.md) | Users bring their own keys first; Ascent-paid plans come later through the same resolver |
| [0005](adr/0005-peer-transport-direct-webrtc-byo-turn.md) | Peer mode: direct WebRTC, Supabase Realtime signalling, optional learner-provided TURN |
| [0006](adr/0006-agora-engine-agora-managed-stateless-route.md) | The optional Agora engine runs Agora-managed through one stateless route |
| [0007](adr/0007-on-device-speech-for-privacy-mode.md) | Privacy mode uses on-device Whisper or Chrome on-device recognition |
