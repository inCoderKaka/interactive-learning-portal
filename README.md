# Ascent

An interactive, timeline-driven trail through **DSA, system design (HLD), object-oriented design (LLD) and interview craft** for a Google SWE L4/L5 loop.

## What is inside

- **Curriculum**: 50+ topics and 260+ exercises, tiered as must-know / expected / stretch. Every problem carries clarifying questions, staged hints, multiple approaches, *how the interviewer departs from the LeetCode version*, and follow-ups. Every design question carries staged model answers, interviewer steering paths and an L4-vs-L5 bar.
- **Visual learning**: step-through algorithm animations, interactive system-design widgets, draggable architecture diagrams with failure injection, class diagrams, and a 3D topic map.
- **Roadmap**: set weeks, hours per day and study days; the plan re-flows around what you have done.
- **AI verification**: write code (no compiler, as in the interview) and have it reviewed by Gemini, Claude or your own OpenAI-compatible `local-server`. Design answers are graded stage by stage; a mock interviewer runs timed rounds and writes hiring-committee feedback. Keys stay in the browser.
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
```

## Database

`supabase/migrations/` holds the schema: five tables (`profiles`, `progress`, `notes`, `activity`, `attempts`), each protected by row-level security so a user can only read and write their own rows.

```bash
supabase link --project-ref <ref>
supabase db push
```

## Importing your own practice notes

Settings → *Import your practice notes* accepts a Markdown file whose problems are link headings, e.g. `## [200: Number of Islands](https://…)`. Matches get your notes attached; the rest are added as your own problems. Everything imported is queued for review rather than marked as mastered.

## Layout

```
app/         pages (today, roadmap, learn, problem, design, review, mock, progress, settings, login)
components/  shell, editor and feedback, focus timer, diagrams, visualizers
content/     the curriculum as typed data
lib/         store and sync, scheduler, spaced repetition, AI providers, importer
supabase/    migrations
```
