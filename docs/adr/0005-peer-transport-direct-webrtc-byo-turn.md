# ADR 0005: Peer mode uses direct WebRTC with Supabase Realtime signalling and an optional, learner-provided TURN relay

- Status: Accepted
- Date: 2026-11-19
- Context docs: [Architecture §4.5](../design/mock-interviewer/02-architecture.md#45-peer-mode-transport), [Product spec MI-X-2](../design/mock-interviewer/01-product-spec.md#7-further-modes), [Delivery plan V10](../design/mock-interviewer/05-delivery-plan.md#5-open-questions-and-verification-list)

## Context

Peer mode lets two learners interview each other, with an AI observer drafting the candidate's scorecard. The call needs a signalling path to exchange WebRTC offers and ICE candidates, and a relay for the minority of networks (strict corporate, campus or mobile NATs) where a direct connection fails. A relay (TURN) carries all media for those calls, so it is the only part of peer mode with a running cost that scales with usage.

## Decision

- **Signalling** runs over a Supabase Realtime broadcast channel named by a six-character room code. Ascent already depends on Supabase, so this adds no service and no server code.
- **Media** goes browser to browser over WebRTC, using public STUN servers to discover addresses.
- **TURN is not provided by Ascent.** A learner whose network needs a relay can enter their own TURN server (self-hosted coturn or a hosted TURN service) in Settings; it is stored in their browser like their AI keys.
- **Transcription stays local to each speaker.** Each browser transcribes its own microphone and shares finished lines over the data channel, so both sides build the same transcript without sending audio to any AI service.
- **The AI observer runs in the candidate's browser** with the candidate's own key, at the end of the round, because the candidate is the one who wants the feedback.
- Both learners must consent to transcription and AI scoring before the call starts. Audio is never recorded in peer mode.

## Consequences

- Peer mode costs Ascent nothing at any scale.
- Some pairs cannot connect without a relay. The UI says so when a connection fails and points to the TURN setting. If this proves common, a hosted relay can be added later as a paid-plan feature (ADR 0004) without changing the protocol.
- The room code is the only access control on the signalling channel. Codes are short-lived, random from a 31-character alphabet (about 887 million combinations), and a room accepts one partner; a third browser is ignored.
- The question's reference notes reach the candidate's browser (hidden in the UI) so it can score the round. A determined candidate could read them; this is a practice tool, and the alternative (scoring in the interviewer's browser with the interviewer's key) moves cost to the wrong person.
