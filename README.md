# Ascent

An interactive, timeline-driven trail through **DSA, system design (HLD), object-oriented design (LLD) and interview craft** for a Google SWE L4/L5 loop.

## What is inside

- **Curriculum**: 50+ topics and 260+ exercises, tiered as must-know / expected / stretch. Every problem carries clarifying questions, staged hints, multiple approaches, *how the interviewer departs from the LeetCode version*, and follow-ups. Every design question carries staged model answers, interviewer steering paths and an L4-vs-L5 bar.
- **Visual learning**: step-through algorithm animations, interactive system-design widgets, draggable architecture diagrams with failure injection, class diagrams, and a 3D topic map.
- **Roadmap**: set weeks, hours per day and study days; the plan re-flows around what you have done.
- **AI verification**: write code (no compiler, as in the interview) and have it reviewed by Gemini, Claude, OpenAI or your own OpenAI-compatible `local-server`. Design answers are graded stage by stage. Keys stay in the browser.
- **Voice mock interviewer**: talk to a fictional Google interviewer through realtime voice (Gemini Live or OpenAI Realtime, using the key you already have), free browser voice, or text. Draw on an Excalidraw whiteboard the interviewer can follow, code in a plain doc, and get curveballs, time calls, interruptions and an evidence-based hiring-committee packet. Choose a question pool or an exact question, a tone (or a surprise), a level and the pressure. The roadmap suggests mocks from your own progress. Developer mode exposes every model, parameter and prompt, with an evaluation runner.
- **More ways to practise**: a full loop day with different interviewers and a committee decision; reverse mode, where you interview an AI candidate and learn the rubric by catching its planted mistakes; peer mode, a direct call with a friend and an AI observer; scheduled mocks with a lobby; a phone-friendly commute mode; replay with "redo this moment" drills; privacy mode with on-device speech and your local model; budgets that switch to a cheaper engine; and an optional Agora engine for your own Agora project.
- **Spaced review**: completed items return before you forget them, shuffled across topics and shown without the pattern label.
- **Bias countermeasures**: confidence prediction and calibration chart, blind mode, hidden approaches until you try, random mock questions, balance and avoidance checks.
- **Focus tools**: focus timer, breaks, guided breathers, streaks, XP, levels and badges.
- **Accounts**: Supabase Auth (email and Google). Progress, notes, reviews and settings sync per account; guest mode works offline in the browser.

## Stack

Next.js 16 (App Router) · React 19 · Tailwind 4 · Motion · React Flow · react-three-fiber · CodeMirror · Zustand · Supabase.

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in the Supabase URL and publishable key (optional: guest mode works without)
npm run dev
npm test        # unit tests for the interview core (node --test)
```

## Database

`supabase/migrations/` holds the schema: five tables (`profiles`, `progress`, `notes`, `activity`, `attempts`), each protected by row-level security so a user can only read and write their own rows.

```bash
supabase link --project-ref <ref>
supabase db push
```

## Importing your own practice notes

Settings → *Import your practice notes* accepts a Markdown file whose problems are link headings, e.g. `## [200: Number of Islands](https://…)`. Matches get your notes attached; the rest are added as your own problems. Everything imported is queued for review rather than marked as mastered.

## Inspiration and credits

The voice mock interviewer is inspired by:

- **[Building an AI system design mock interviewer with Agora Conversational AI](https://www.youtube.com/watch?v=DBTdrmS-uL8)** by *Anubhav in Tech* on YouTube. The idea of a voice interviewer beside a whiteboard, which pushes back while you think out loud, comes from this video.
- **[iamanubhavsethi/ai-mock-interview](https://github.com/iamanubhavsethi/ai-mock-interview)** by Anubhav Sethi, the project shown in that video (MIT). It taught us to reduce a whiteboard drawing to a component graph, send only meaningful changes, and let the interviewer either stay silent or challenge a weak decision.
- **[AgoraIO-Conversational-AI/agent-quickstart-nextjs](https://github.com/AgoraIO-Conversational-AI/agent-quickstart-nextjs)** (MIT, © 2025 Agora Community), the starter that project builds on. It is the reference for Ascent's optional Agora voice engine.

Ascent's interviewer is its own implementation, written against providers' published SDKs and APIs. If any file is ever adapted from these repositories, it keeps the original MIT notice at the top. The design is in [`docs/`](docs/README.md).

Open-source building blocks: [Excalidraw](https://github.com/excalidraw/excalidraw) (MIT) for the whiteboard, [Transformers.js](https://github.com/huggingface/transformers.js) (Apache-2.0) for on-device Whisper in privacy mode, and Agora's published SDKs ([agora-agents](https://www.npmjs.com/package/agora-agents), [agora-rtc-sdk-ng](https://www.npmjs.com/package/agora-rtc-sdk-ng)) for the optional Agora engine.

## Layout

```
app/         pages (today, roadmap, learn, problem, design, review, mock, progress, settings, login)
  api/agora/ the optional Agora engine's stateless route
components/  shell, editor and feedback, focus timer, diagrams, visualizers
content/     the curriculum as typed data
lib/         store and sync, scheduler, spaced repetition, AI providers, importer
  interview/ the mock interviewer: pure core, providers, voice engines, session controller
docs/        design docs and architecture decision records
supabase/    migrations
```
