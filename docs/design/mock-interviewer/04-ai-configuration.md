# Voice mock interviewer: AI configuration and developer mode

## 1. Goals

- Every AI call is a named **task** with its own provider, model, parameters and prompt version.
- Recommended settings are good out of the box. Developer mode makes all of them visible and editable.
- Settings that a provider does not support are shown as unsupported, never silently ignored.
- Quality changes are measured, not guessed: prompt or model changes run against an evaluation set.

## 2. AI task catalogue

| Task ID | Used for | Latency sensitivity | Recommended model class | Output |
| --- | --- | --- | --- | --- |
| `interviewer.turn` | Each interviewer reply on text and Ascent Voice engines | High (voice) | Fast, mid-size model | Short spoken-style text |
| `interviewer.realtime` | Realtime engine session | High | Provider's realtime native-audio model | Audio and transcript |
| `interviewer.judge` | "Should I intervene?" on rule hits (may return empty) | Medium | Fast model | Empty or one challenge |
| `summarise` | Rolling summary of older turns | Low | Small, cheap model | ≤150 words |
| `extract` | Pull confirmed requirements and stated numbers from turns | Low | Small model with JSON schema | JSON |
| `vision.describe` | "Look at my diagram" | Medium | Vision-capable model | Structured description |
| `question.generate` | Out-of-curriculum question (MI-CB-4) | Low (before start) | Strong model | JSON question, schema-validated |
| `persona.generate` | Fictional interviewer profile from the seed | Low | Small model, or a template with no model | JSON |
| `scorecard` | Hiring-committee packet | Low | Strongest available model | JSON with evidence |
| `candidate.reverse` | AI candidate in reverse mode | High | Mid-size model | Spoken-style text |
| Existing: `code.review`, `stage.grade`, `recall.grade`, `twists`, `hint` | Current Ascent features | — | as today | as today |

## 3. Tunable parameters

```ts
interface GenParams {
  temperature?: number;          // 0–2
  topP?: number;                 // 0–1
  topK?: number;                 // Gemini and Claude; unsupported on OpenAI-compatible
  maxOutputTokens?: number;
  stop?: string[];
  seed?: number;                 // where supported, for reproducible evaluations
  presencePenalty?: number;      // OpenAI-compatible only
  frequencyPenalty?: number;     // OpenAI-compatible only
  reasoning?: { effort?: "low" | "medium" | "high"; budgetTokens?: number };   // reasoning-capable models only
  responseFormat?: "text" | "json" | { schema: JsonSchema };
  promptCaching?: boolean;       // provider prompt caching for the stable system block
  safety?: Record<string, string>;   // Gemini safety thresholds
}

interface TaskProfile {
  task: TaskId;
  provider: string;              // adapter ID; "auto" = the learner's default provider
  model: string;
  params: GenParams;
  promptVersion: string;         // e.g. "interviewer.turn@3"; overrides are stored as "user:<hash>"
  timeoutMs: number;
  retries: number;               // with exponential backoff; 0 for voice turns
  fallback?: { provider: string; model: string }[];
  context?: { verbatimTurns: number; summariseAboveTokens: number };
  selfConsistency?: { samples: number; aggregate: "median" | "majority" };   // scorecard only
}
```

Session-level and speech settings:

| Group | Setting | Recommended |
| --- | --- | --- |
| Turn-taking | End-of-speech silence | 700 ms (Relaxed 1000 ms, High 500 ms) |
| | Barge-in sensitivity (speech duration before it interrupts the agent) | 160–250 ms |
| | Realtime turn detection | Semantic VAD where available, otherwise server VAD |
| STT | Engine | Realtime: built-in. Ascent Voice: provider STT if a key exists, otherwise Web Speech. |
| | Key-term boosting | Auto-filled from the question's components and topic terms |
| | Language and accent hint | Learner's choice, default `en` |
| TTS | Voice, rate, pitch | A neutral voice at rate 1.0. Captions on. |
| | Sentence-chunked streaming | On |
| Workspaces | Digest pause | 2.5 s |
| | Full-digest interval | Every 5th digest |
| | Auto vision snapshot | Off (on request only) |
| Policy | Pressure table | [Detailed design §4.2](03-detailed-design.md#42-intervention-policy) |
| Cost | Monthly budget per engine, fallback chain | Unset; realtime → Ascent Voice → text |

## 4. Presets

| Preset | Intent | `interviewer.turn` | `scorecard` | Voice |
| --- | --- | --- | --- | --- |
| **Recommended** | Realistic, at a sensible cost | Fast mid-size model, temp 0.6, top-p 0.95, max 300 tokens, caching on | Strongest model, temp 0.2, JSON schema, self-consistency 3 (median) | Realtime if a Gemini or OpenAI key exists, otherwise Ascent Voice |
| **Budget** | Lowest cost | Small model, temp 0.6, max 200 | Mid-size model, 1 sample | Ascent Voice with Web Speech and browser TTS |
| **Max quality** | Best fidelity | Strong model, temp 0.5 | Strongest model, reasoning high, 5 samples | Realtime with the best voice model |
| **Private / local** | Nothing leaves the machine | Local-server model | Local-server model | Ascent Voice with local Whisper and browser TTS |

"Fast", "mid-size" and "strong" resolve to concrete model IDs per provider through `lib/interview/providers/models.ts`. The table is generated from each provider's live model list (`listModels`) plus a small, maintained ranking file, so presets keep working when providers rename models. Concrete IDs are deliberately left out of this document because they go stale.

Recommended temperatures follow from the role of each task:

- Interviewer turns need some variety, so they don't sound scripted (0.5–0.7).
- Judges and scorecards need stability (≤0.2) plus several samples. A single sample at low temperature is still noisy on long transcripts.
- Generators (questions, personas) run warmer (0.8–0.9), with schema validation.

## 5. Prompt architecture

- Prompts live in `lib/interview/core/prompts.ts` as versioned templates. Each template declares its variables and the version is bumped whenever the wording changes. Scorecards store the version they used.
- Persona, tone and level are separate fragments that are composed together, so one interviewer prompt serves all 4 tones × 4 levels × 4 kinds.
- Candidate-authored content (speech, code, whiteboard text) goes into clearly delimited data sections, never into the instruction text.
- Voice fragments apply only on voice engines: no markdown, no lists, 1–3 sentences, one question per turn, and silence is allowed.
- Developer-mode overrides replace a single fragment, not the whole prompt, so later fixes to the other fragments still reach users who have overrides.

## 6. Evaluation and calibration

| Asset | Contents |
| --- | --- |
| `eval/transcripts/` | 30–50 interview logs (synthetic plus opted-in real ones), each labelled by a human with a decision and per-dimension scores |
| `eval/interventions/` | Digest sequences with an expected "speak / stay silent" label |
| `eval/run.ts` | Replays them through the brain and tasks with a given profile. Reports decision accuracy, mean absolute score error, intervention precision and recall, cost and latency. |

A change to the Recommended preset ships only if it does not regress these metrics. The developer-mode evaluation runner (MI-DEV-7) is the same tool, pointed at the learner's own settings and history.

Calibration with the learner: the predicted decision (MI-FB-5) against the scorecard feeds the existing calibration chart. Over time, a learner who scores themselves consistently higher than the scorecard sees that gap called out.
