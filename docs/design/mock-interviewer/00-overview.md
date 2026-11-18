# Voice mock interviewer: overview

| | |
| --- | --- |
| Status | Draft for review |
| Last updated | 2026-11-18 |
| Scope | `app/mock`, `lib/ai.ts`, roadmap and spaced review integration, future server routes |
| Related | [Product spec](01-product-spec.md) · [Architecture](02-architecture.md) · [Detailed design](03-detailed-design.md) · [AI configuration](04-ai-configuration.md) · [Delivery plan](05-delivery-plan.md) |

## 1. Summary

Ascent already has a text mock interviewer (`app/mock/page.tsx`): it draws a random question, plays a Google interviewer over chat, gives the candidate a shared doc, and writes hiring-committee feedback at the end. This project turns it into a **realistic, voice-first interview room** that is personal to each learner and cheap to run:

- You talk to the interviewer and it talks back, with natural turn-taking and the ability to cut in.
- It can read what you draw on a whiteboard and type in a plain code doc, and it reacts to that work as it happens.
- The round follows the real arc: introductions, the problem, curveballs, and "anything you'd like to ask me?".
- What you have learned in Ascent decides which mocks the roadmap suggests, and each mock's results feed back into spaced review and the roadmap.
- Every AI step can be tuned in a developer mode, with recommended presets.

Users bring their own AI keys at first. Later, paid Ascent plans will remove the need for any key. Both paths go through one credential resolver, so feature code does not change between them.

## 2. Background

### 2.1 What exists today

| Capability | Where | Notes |
| --- | --- | --- |
| Text interviewer with a persona prompt | `lib/ai.ts` `MOCK_SYSTEM` | Neutral tone, underspecified question, follow-ups, wrap-up nudge when 5 minutes remain |
| Random question draw, "prefer unseen" | `app/mock/page.tsx` | Deliberately no question picker (a bias guard) |
| Shared doc (CodeMirror for coding, plain text for design) | `components/Work.tsx` | Not syntax-checked, as in the real interview |
| Scorecard | `lib/ai.ts` `mockScorecard` | Single JSON verdict, score bands mapped to hire / no hire |
| Persistence | `attempts` table, kind `mock:<kind>` | Transcript and feedback saved per account |
| Planned mocks on the roadmap | `lib/schedule.ts` `MOCKS` | Six generic placeholders, not personalised |
| Providers | `lib/ai.ts` `chat()` | Gemini, Claude, OpenAI-compatible local server. Keys stay in the browser |

### 2.2 Why change it

Text chat misses the parts of an interview that make it hard: thinking out loud under time pressure, being interrupted mid-thought, drawing while talking, and being read by someone whose reactions are hard to predict. Paid human mocks cost a lot per session, and candidates need ten or twenty of them. A good AI interviewer that runs on the learner's own keys is the cheapest way to close that gap.

## 3. Goals

| ID | Goal | Measure |
| --- | --- | --- |
| G1 | The round feels like a real Google interview | In post-round surveys, at least 70% of learners rate realism 4/5 or higher |
| G2 | Voice is responsive enough to feel like a conversation | Median time from end of speech to first audio under 1.2 s on the recommended engine |
| G3 | One account is enough | A learner who already has a Gemini or OpenAI key starts a voice round without signing up anywhere else |
| G4 | Cheap by default | The text and browser-voice paths cost nothing beyond the learner's own LLM usage. Realtime voice cost is shown before the round starts |
| G5 | Personal | Suggested mocks come from the learner's own progress, weak spots and calibration data |
| G6 | Extensible | A new voice engine, provider, curveball, interview kind or workspace surface is added by writing one adapter and registering it, with no change to the session core |
| G7 | Transparent and tunable | Every AI call's model and parameters are visible and editable in developer mode, with recommended defaults |

## 4. Non-goals

- Live voice cloning or impersonating real people. The interviewer is always a fictional persona.
- Chat about current AI news. The learner chose out-of-curriculum design questions instead (see [spec §5](01-product-spec.md#5-curveballs-and-unexpected-situations)).
- A hosted multi-tenant voice infrastructure of our own (media servers, STT or TTS models). We use providers for those.
- Proctoring or anti-cheating. This is practice.
- Exact replication of any specific company's internal interview tooling.

## 5. Design principles

1. **Realism over convenience.** Defaults match a real loop: random question, no compiler, neutral tone, a timer that does not pause.
2. **One core, many adapters.** Interview logic (the *interviewer brain*) is a pure module. Voice, models, speech and workspaces plug into it.
3. **The learner's keys and data stay under the learner's control.** BYOK keys never leave the browser except to the provider they belong to. The paid path is opt-in and metered.
4. **Deterministic where possible, AI where needed.** Silence timers, phase budgets and whiteboard pattern checks are plain code. The model decides only what needs judgement, which keeps cost down and makes behaviour testable.
5. **Evidence-based feedback.** Every rating cites timestamped moments from the round.
6. **Honest about limits.** The UI says when the interviewer cannot see something, when a feature is approximate, and what a round will cost.

## 6. Glossary

| Term | Meaning |
| --- | --- |
| Session | One interview round, from setup to scorecard |
| Loop | Several sessions in a row with independent interviewers, then one committee decision |
| Interviewer brain | The pure TypeScript module that holds interview state and decides what the interviewer says and when |
| Engine | How speech gets in and out: text, Ascent Voice (cascaded, in the browser), provider realtime, or Agora |
| Surface | A workspace the candidate works in: code doc, whiteboard, notes doc |
| Digest | A compact text description of a surface's current state and what changed, sent to the brain |
| Intervention | The interviewer speaking without being asked: a challenge, a nudge, a time call |
| Curveball | A planned deviation: a changed requirement, bait, an incident, a ceiling probe |
| Task | One kind of AI call (interviewer turn, scorecard, vision description) with its own model and parameters |
| BYOK | Bring your own key: the learner's own provider credentials |
| Platform credentials | Ascent's own keys, used for paid plans and metered per user |

## 7. Prior art and credits

This design was prompted by two public projects. We read them to understand the approach. Ascent's implementation is written from scratch against providers' published SDKs and APIs. If any file is ever adapted from these repositories, it keeps the original MIT notice at its top.

- **[Building an AI system design mock interviewer with Agora Conversational AI](https://www.youtube.com/watch?v=DBTdrmS-uL8)**, a video by *Anubhav in Tech* on YouTube. It shows a voice interviewer next to an Excalidraw whiteboard that pushes back while you think out loud, and it argues that mock interviews are too expensive for the number candidates need.
- **[iamanubhavsethi/ai-mock-interview](https://github.com/iamanubhavsethi/ai-mock-interview)** by Anubhav Sethi, the repository from that video (MIT; its license file is inherited from the Agora quickstart). Ideas we learned from it:
  - reducing an Excalidraw scene to a component and connection graph;
  - sending only meaningful diffs when drawing pauses;
  - letting the interviewer either stay silent or challenge a red-flag decision;
  - a list of architectural red flags worth interrupting for.
- **[AgoraIO-Conversational-AI/agent-quickstart-nextjs](https://github.com/AgoraIO-Conversational-AI/agent-quickstart-nextjs)** (MIT, © 2025 Agora Community), the starter it builds on. It shows how a browser joins an Agora channel and starts a managed STT → LLM → TTS agent. It is the reference for our optional Agora engine.

How we give credit beyond this page:

- the README's *Inspiration and credits* section;
- an "Inspired by" line on the mock interview page's setup screen;
- a link back in release notes when voice mode ships;
- offering upstream any general-purpose improvements we make, such as a digest format for LLD class diagrams.

## 8. Document map

| Document | Read it for |
| --- | --- |
| [01 Product spec](01-product-spec.md) | What the learner sees and can configure |
| [02 Architecture](02-architecture.md) | How the pieces fit and scale |
| [03 Detailed design](03-detailed-design.md) | Interfaces, state machine, events, schema |
| [04 AI configuration](04-ai-configuration.md) | Models, parameters, presets, prompts, evaluation |
| [05 Delivery plan](05-delivery-plan.md) | Order of work, costs, risks, open questions |
