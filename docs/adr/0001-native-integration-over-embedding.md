# ADR 0001: Build the interviewer natively rather than embed or fork a third-party app

- Status: Accepted
- Date: 2026-11-18
- Context docs: [Architecture](../design/mock-interviewer/02-architecture.md)

## Context

Two public projects show a voice system design interviewer: the Agora Next.js quickstart and Anubhav Sethi's `ai-mock-interview`, which builds on it. Both are MIT licensed. We could (a) run one as a separate app and link or embed it, (b) fork it into Ascent, or (c) build our own interviewer against providers' published SDKs.

## Decision

Option (c). Ascent's interviewer is written from scratch on a pure "interviewer brain" plus adapters. We credit both projects in the README, the docs and the mock interview page. Any file that is ever adapted from them keeps its MIT notice.

## Consequences

- We can pass the question, tone, level, progress data and workspace digests straight into the interviewer. An embedded app could not see them.
- One deployment, one account, one design system.
- More work up front than embedding. That cost is offset by reusing the existing mock page, content types and scorecard.
- The license requires nothing of us unless we copy code. Credit is given as a courtesy and because the idea came from them.

## Alternatives rejected

- **Embed or link a separate app**: two deployments, no access to Ascent's data, a separate key setup, and little room to customise.
- **Fork**: brings in a project layout, a UI kit and an Agora-only pipeline that do not match Ascent, and makes Agora mandatory.
