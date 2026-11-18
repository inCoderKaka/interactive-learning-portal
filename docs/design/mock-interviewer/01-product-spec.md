# Voice mock interviewer: product specification

Requirement IDs (`MI-<area>-<n>`) are referenced from the architecture, the detailed design and the delivery plan. *Phase* is the delivery phase defined in [05 Delivery plan](05-delivery-plan.md).

## 1. Setup screen

| ID | Requirement | Phase |
| --- | --- | --- |
| MI-SET-1 | **Interview kind**: coding, system design (HLD), object-oriented design (LLD), behavioural, or a *full loop* (see MI-X-3). | 1 |
| MI-SET-2 | **Question selection**, three modes: *Random from everything* (default), *Random from a pool I choose*, and *This exact question*. A pool can be built from topics, tiers, sources (curriculum, my imported problems, AI-generated) and status (unseen, due for review, weak). | 1 |
| MI-SET-3 | Choosing an exact question is allowed but labelled *practice pick*. Analytics keep picked and drawn results apart, so the bias report can show whether scores on picked questions are inflated. | 1 |
| MI-SET-4 | **Interviewer tone**: *Friendly guide*, *Neutral* (default, the Google norm), *Tough*, *Quiet note-taker*, or *Surprise me*. *Surprise me* draws a tone at random and reveals it only on the scorecard, because in a real loop you don't know your interviewer. | 1 |
| MI-SET-5 | **Level bar**: L3, L4 (default), L5 or L6 probe. It changes what "good" means in the rubric and how deep follow-ups go. | 1 |
| MI-SET-6 | **Length** (15–60 min) and **round arc** toggles: introductions, "tell me about yourself", main problem, curveball, "questions for me". Defaults follow a 45-minute Google round. | 1 |
| MI-SET-7 | **Pressure**: how long the interviewer tolerates silence before speaking, how often it interrupts, and whether it tells you the time. The three settings are *Relaxed*, *Realistic* and *High*. | 1 |
| MI-SET-8 | **Curveball frequency**: *None*, *Occasional* (default: at most one), *Frequent*, or *Random*. Specific curveball types can be switched off. | 1 |
| MI-SET-9 | **Engine**: *Text*, *Ascent Voice* (free, in the browser), *Realtime voice* (uses your Gemini or OpenAI key), or *Agora* (optional). Each option shows what it needs and its estimated cost per round before you start. | 1–3 |
| MI-SET-10 | **Interviewer voice**: a voice choice (when the engine supports it), speaking rate, and whether captions are shown. | 1 |
| MI-SET-11 | **Mode**: *Real* (the interviewer knows nothing about your history) or *Coach* (the interviewer remembers your recurring gaps and targets them). | 1 |
| MI-SET-12 | Presets: *Google L4 coding*, *Google L5 system design*, *Gentle warm-up*, *Stress test*. A learner can save their own presets. | 1 |
| MI-SET-13 | An *Inspired by* credit line linking the video and repositories listed in [overview §7](00-overview.md#7-prior-art-and-credits). | 1 |

## 2. Google realism

| ID | Requirement | Phase |
| --- | --- | --- |
| MI-REAL-1 | **Full round arc.** The interviewer introduces themselves as a fictional Google engineer, asks for a short introduction (time-boxed to about 3–5 minutes), presents the problem, runs it, and ends with "Is there anything you'd like to ask me?". | 1 |
| MI-REAL-2 | **Consistent fictional persona.** A per-session persona seed fixes the interviewer's name, team, tenure and opinions, so answers to "what do you like about your team?" are coherent. The interviewer never claims to be a real person, and the scorecard notes that the persona was fictional. | 1 |
| MI-REAL-3 | **Plain code doc**: no compiler, no autocomplete, and optionally no syntax highlighting or line numbers, as in a Google Doc. | 1 |
| MI-REAL-4 | **Whiteboard** (Excalidraw) for HLD and LLD, side by side with a notes doc. | 1 |
| MI-REAL-5 | **"Can I take a minute to think?"** Spoken or as a button, it pauses interventions for up to 90 seconds. The clock keeps running, as it does in real life. | 1 |
| MI-REAL-6 | **Hints cost signal.** Hints are available when asked for or after a long stall, are minimal, and are recorded. The scorecard weighs them the way a rubric would. | 1 |
| MI-REAL-7 | **Underspecified questions.** The interviewer leaves details out on purpose and answers clarifying questions consistently. A candidate who skips clarification is allowed to, and it is noted. | 1 (exists today) |
| MI-REAL-8 | **Time calls.** "We have about ten minutes left" at realistic points. On *High* pressure, the interviewer moves you on if you overstay a phase. | 1 |
| MI-REAL-9 | **Neutral affect.** On *Neutral* and *Quiet note-taker*, the interviewer does not show approval or disapproval, so you cannot read how you are doing. | 1 |

## 3. Workspaces in the interviewer's context

| ID | Requirement | Phase |
| --- | --- | --- |
| MI-WS-1 | Whiteboard drawings are converted into a text **diagram digest** (components, connections, labels, free notes, and what changed). The digest is sent when drawing pauses for about 2.5 s, and only if the change is meaningful. No vision model is needed. | 1 |
| MI-WS-2 | Components are **semantically tagged** from their labels using a local dictionary (e.g. "Redis" → cache, "Kafka" → queue, "S3" → object store), so deterministic checks can spot patterns such as "a read path with no cache". | 1 |
| MI-WS-3 | LLD class diagrams: boxes whose text looks like `ClassName` + fields + methods are parsed into a class list, and arrow labels into relationships. | 2 |
| MI-WS-4 | Code doc: a line-level diff is sent on typing pauses, or when the candidate says "let me walk you through it". | 1 |
| MI-WS-5 | A **"Look at my diagram"** action sends one whiteboard image to a vision-capable model and adds its description to the context. On realtime engines that accept images or video frames, the image is sent directly (see [architecture §4.3](02-architecture.md#43-realtime-voice-engine)). | 1 |
| MI-WS-6 | The interviewer never says "canvas update", "digest" or "event". It talks about "your diagram" or "your code". | 1 |

## 4. Personal: driven by what you've learned

| ID | Requirement | Phase |
| --- | --- | --- |
| MI-PER-1 | The roadmap's generic mock slots become **recommended mocks**, each with a concrete configuration (kind, pool, level, curveballs) and a reason ("you finished graphs and heaps; two spaced-review lapses on Dijkstra"). | 1 |
| MI-PER-2 | Recommendation inputs: completed topics, spaced-review lapses and ease, confidence-calibration gaps, weak rubric dimensions from past attempts, kinds not practised recently, and days until the target interview date. | 1 |
| MI-PER-3 | **Readiness mock**: two learned topics and one unseen topic, at the target level. | 1 |
| MI-PER-4 | Mock density increases toward the end of the plan, mirroring how candidates ramp up. | 1 |
| MI-PER-5 | Results flow back: the question joins spaced review, weak dimensions update the learner's *weakness profile*, and the roadmap re-flows. | 1 |
| MI-PER-6 | *Coach* mode (MI-SET-11) reads the weakness profile ("last two system design rounds skipped capacity estimates") and steers toward it. *Real* mode never reads it. | 1 |

## 5. Curveballs and unexpected situations

Each curveball is a registered strategy with trigger conditions and a scorecard note (see [detailed design §5](03-detailed-design.md#5-curveball-strategies)).

| ID | Curveball | What it tests | Phase |
| --- | --- | --- | --- |
| MI-CB-1 | **Requirement change** mid-round ("now it has to work offline", "traffic just went up 100×") | Adaptability, whether the design is modular | 1 |
| MI-CB-2 | **Bad-idea bait**: the interviewer suggests a flawed approach | Whether you push back politely and with reasons | 1 |
| MI-CB-3 | **Interviewer slip**: a deliberately wrong claim ("hash map lookup is O(log n), right?") | Confidence and correctness under social pressure | 1 |
| MI-CB-4 | **Out-of-curriculum design**: a design question that is not in Ascent's content, generated and validated at round start | Transfer, beyond memorised designs | 1 |
| MI-CB-5 | **Ceiling probe**: follow-ups that keep going above the selected level until you run out | Where your ceiling is (reported separately, not penalised) | 2 |
| MI-CB-6 | **Production incident**: "this design is live and p99 latency just tripled, walk me through it" | Operational thinking | 2 |
| MI-CB-7 | **Explain it to a PM** in two minutes, without jargon | Communication | 1 |
| MI-CB-8 | **Time crunch**: "we have five minutes, what would you cut?" | Prioritisation | 1 |

## 6. Review, replay and feedback

| ID | Requirement | Phase |
| --- | --- | --- |
| MI-FB-1 | **Hiring-committee packet**: one rating per rubric dimension, each citing timestamped quotes and workspace snapshots as evidence. An overall decision from *strong no hire* to *strong hire*, and the level the performance would support. | 2 |
| MI-FB-2 | **Replay**: scrub through audio, transcript, whiteboard and code together. Recording happens in the browser (no server cost) and is saved only if the learner opts in. | 2 |
| MI-FB-3 | **Delivery analytics**: talk-time ratio, longest silence, filler words per minute, time to first clarifying question, time spent per phase versus budget, and how many interruptions you recovered from. | 2 |
| MI-FB-4 | **Redo this moment**: start a micro-drill from any replay timestamp, with the same context, to retry one answer. | 3 |
| MI-FB-5 | **Calibration**: before you see the scorecard, predict your own decision. The gap feeds Ascent's existing calibration chart. | 1 |

## 7. Further modes

| ID | Requirement | Phase |
| --- | --- | --- |
| MI-X-1 | **Reverse mode**: you interview an AI candidate who makes planted mistakes, and you write the feedback. Your feedback is compared with the planted list. It teaches the rubric quickly. | 3 |
| MI-X-2 | **Peer mode**: two learners interview each other in a browser-to-browser call. The AI observes, keeps time and drafts the scorecard. This is the cheapest realistic practice, because only one AI listener runs. | 3 |
| MI-X-3 | **Loop day**: 4–5 rounds back to back with independent interviewers (different persona, tone and voice), short breaks, and a final committee decision. | 3 |
| MI-X-4 | **Scheduled mock**: book a slot. The room opens at that time with a short lobby, to rehearse the nerves of showing up. An `.ics` file can be downloaded. | 3 |
| MI-X-5 | **Cost guard**: a monthly budget per engine. Rounds run on a cheaper model, with the strong model reserved for the scorecard. When the budget is spent, the engine falls back automatically (realtime → Ascent Voice → text). | 2 |
| MI-X-6 | **Privacy mode**: on-device speech recognition and synthesis plus a local-server LLM. The UI states exactly which data leaves the machine (see [architecture §8](02-architecture.md#8-security-and-privacy)). | 3 |
| MI-X-7 | **Commute mode**: a voice-only behavioural round, laid out for phones. | 3 |

## 8. Developer mode

| ID | Requirement | Phase |
| --- | --- | --- |
| MI-DEV-1 | A settings section, hidden behind a toggle, that lists every AI task (see [AI configuration §2](04-ai-configuration.md#2-ai-task-catalogue)) with its provider, model and parameters. | 1 |
| MI-DEV-2 | Parameters the selected provider does not support are shown greyed out with the reason, rather than silently dropped. | 1 |
| MI-DEV-3 | Presets: *Recommended*, *Budget*, *Max quality*, *Private/local*, applied per task or to all tasks. Any change shows how it differs from *Recommended*. | 1 |
| MI-DEV-4 | Prompt templates can be viewed and overridden per task, with versions and a reset button. Overrides are exported with settings. | 2 |
| MI-DEV-5 | A live debug overlay during a round shows the assembled prompt, tokens in and out, latency per stage, interventions considered and rejected, and the running cost estimate. | 2 |
| MI-DEV-6 | Speech settings: STT engine, language, key-term boosting (e.g. "Kafka", "idempotency"), end-of-speech silence, barge-in sensitivity, TTS voice, rate and pitch. | 1–2 |
| MI-DEV-7 | An evaluation runner replays a stored transcript through the scorecard task with the current settings and compares the result with a reference (see [AI configuration §6](04-ai-configuration.md#6-evaluation-and-calibration)). | 3 |

## 9. Plans and credentials

| ID | Requirement | Phase |
| --- | --- | --- |
| MI-PLAN-1 | **BYOK** (default, free): the learner's Gemini, Claude, OpenAI or local keys, stored in their browser. The realtime engine uses the same Gemini or OpenAI key, so no second account is needed. | 1 |
| MI-PLAN-2 | Optional BYO Agora project for learners who want that engine. | 3 |
| MI-PLAN-3 | **Paid Ascent plans** (future): no keys needed, quotas per plan (e.g. realtime minutes, scorecards), metered usage. Plan names and prices will be decided in Phase 4. | 4 |
| MI-PLAN-4 | Clear disclosure, before each round, of which credential pays for it and the estimated cost. | 1 |
