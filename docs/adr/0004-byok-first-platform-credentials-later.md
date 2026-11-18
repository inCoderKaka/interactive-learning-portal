# ADR 0004: Bring-your-own-key first; Ascent-paid plans later through the same resolver

- Status: Accepted
- Date: 2026-11-18
- Context docs: [Architecture §8](../design/mock-interviewer/02-architecture.md#8-security-and-privacy), [Delivery plan](../design/mock-interviewer/05-delivery-plan.md)

## Context

Learners use their own keys today, and they stay in the browser. In the future, paid Ascent plans should let learners use every feature with no keys, with Ascent paying the providers.

## Decision

Every AI call resolves its credential through a `CredentialSource`:

- `byok` reads browser-stored keys and calls providers directly.
- `platform` (Phase 4) asks Ascent's API for a short-lived, session-scoped token (a provider ephemeral token for realtime voice), or proxies text calls through a metered route.

Feature code never knows which source is active. Platform usage is written to an append-only, idempotent `usage_ledger` and checked against plan quotas before a session starts.

Keys are never stored on Ascent's servers in BYOK mode. If a future feature needs a learner's key on the server, it must use a sealed token: the key is encrypted with a server secret and bound to a session ID and expiry. It is passed per request, never persisted, and redacted from logs. That feature needs its own ADR.

## Consequences

- No feature work is needed when paid plans launch, only the `platform` source, the entitlements and the routes.
- Paid plans bring abuse risk and cost risk. Quotas, rate limits, a limit of one live session and short token lifetimes are required before launch.
- The payments provider and plan tiers are deferred to a Phase 4 ADR.
