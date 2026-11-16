import { Q, T } from "./h";
import type { Design, Topic } from "@/lib/types";

export const craftTopics: Topic[] = [
  T("craft", "google-loop", "The Google loop & how you are scored", 1, 25, "Rounds, levels, the hiring committee, and the rubric behind 'hire / no hire'.", {
    signals: ["Before you plan anything else"],
    lesson: `**Levels:** SWE II = L3, SWE III = L4, Senior = L5. With ~5 years of experience you are typically considered for **L4**, sometimes L5. The level is decided from interview signal: strong system design and leadership signal pushes up; coding alone does not.

**Typical loop**
- Recruiter screen → 1–2 phone/video coding screens (45 min, shared doc or editor: *no compiler, no autocomplete*).
- Onsite: 2–3 coding rounds, 1 system design round (L4 sometimes, L5 always), 1 Googleyness & leadership (behavioural) round.
- Interviewers write feedback independently → hiring committee → team match → offer.

**The four attributes**
1. **General cognitive ability:** how you break down open problems.
2. **Role-related knowledge:** algorithms, data structures, design.
3. **Leadership:** emergent: driving, unblocking, influencing without authority.
4. **Googleyness:** comfort with ambiguity, collaboration, bias to action, humility.

**Coding rubric (what gets written down)**
- *Algorithms:* optimal or near-optimal approach, justified complexity.
- *Coding:* correct, readable, idiomatic; handles edge cases.
- *Communication:* clarifying questions, thinking aloud, responding to hints.
- *Problem solving:* structured progress from brute force to optimal; testing.

**How Google questions differ from LeetCode:** the statement is deliberately underspecified; the first problem is a warm-up and the **follow-ups carry the signal**; real-world framing hides the pattern; interviewers change constraints mid-way (streaming, memory limits, multiple machines) to see whether you understand or memorised.

**Practical:** practise in a plain document without running code; narrate; dry-run by hand; state complexity unprompted.`,
    pitfalls: ["Optimising for number of problems solved instead of follow-up depth", "Practising only with a compiler and autocomplete", "Neglecting the behavioural round"],
    quiz: [
      Q("In a Google coding round, where does most of the hiring signal come from?", ["Finishing the first question fast", "*How you handle follow-ups and changed constraints", "Knowing the LeetCode number", "Typing speed"], "Follow-ups distinguish understanding from recall."),
      Q("You are not allowed to run code. What replaces the compiler?", ["Nothing", "*A deliberate dry run on a small input plus edge cases", "Asking the interviewer", "Rewriting twice"], "Manual verification is an explicitly scored behaviour."),
    ],
    cards: [["Google's four attributes", "General cognitive ability · Role-related knowledge · Leadership · Googleyness"]],
  }),
  T("craft", "coding-round", "Running a coding round out loud", 1, 25, "A script for the 45 minutes, including what to say when stuck.", {
    signals: ["Every coding interview and every practice session here"],
    lesson: `**Minute-by-minute**

| Time | Do | Say |
|---|---|---|
| 0–5 | Restate, ask 3–4 clarifying questions, write 2 examples (one edge) | "Let me make sure I understand… Can the input be empty? Are values bounded?" |
| 5–10 | Brute force + complexity, then propose the better idea | "The straightforward way is O(n²) because… I think we can do better by…" |
| 10–12 | Get buy-in before coding | "I'll go with X: O(n log n) time, O(n) space. Sound good?" |
| 12–30 | Code top-down with helper names; narrate intent, not syntax | "This loop maintains the invariant that…" |
| 30–37 | Dry run on your example; fix bugs calmly | "Let me trace i = 0…" |
| 37–45 | Edge cases, complexity, follow-ups | "If the data were a stream, I would…" |

**When stuck**
- Solve a smaller or simpler version; hand-simulate an example and watch what *you* do.
- Enumerate candidate tools by constraint (see Complexity lesson).
- Say what you are considering and why it fails: silence scores zero.
- Take the hint gracefully: using a hint well is positive signal.

**Clarifying-question checklist:** input size and ranges · duplicates · sortedness · empty/null · negative numbers · output format and ties · mutability of input · single vs many queries · memory limits · character set.

**Testing checklist:** empty, single element, all equal, already sorted / reverse, max size, negative/zero, duplicates, off-by-one boundaries.

**Code quality tells:** meaningful names, no magic numbers, early returns, small helpers, const-correctness, no dead code.`,
    pitfalls: ["Coding before agreement on the approach", "Silent thinking for minutes", "Declaring done without a dry run", "Arguing with hints"],
    quiz: [
      Q("You see the optimal solution immediately. What do you still do first?", ["Start coding", "*State brute force briefly, then the optimal idea with complexity, and get agreement", "Ask for a harder problem", "Write tests"], "It demonstrates structured reasoning and avoids solving the wrong problem."),
      Q("Best response when completely stuck?", ["Stay silent and think", "*Work a concrete example aloud and look for structure", "Guess a pattern", "Ask for the answer"], "The interviewer can only credit reasoning they hear."),
    ],
    cards: [["Clarifying checklist", "Size · ranges · duplicates · sorted? · empty · negatives · output/ties · mutate input? · many queries? · memory"]],
  }),
  T("craft", "biases", "Bias traps in learning & interviewing", 1, 25, "The predictable ways a smart brain fools itself, and the countermeasure built into this portal.", {
    signals: ["When practice feels productive but mock performance does not improve"],
    lesson: `| Trap | What it looks like | Countermeasure here |
|---|---|---|
| **Illusion of competence (recognition ≠ recall)** | Reading a solution and thinking "I knew that" | Recall drills: state the approach before any reveal; spaced reviews |
| **Pattern anchoring from context** | Solving a problem *inside* the "Sliding Window" chapter | **Blind mode**: topic tags hidden, reviews interleaved across topics |
| **Familiarity bias** | Re-solving favourite topics, avoiding DP/graphs | Scheduler weights weak and avoided topics; readiness radar shows the gaps |
| **Overconfidence / underconfidence** | Feeling ready (or hopeless) without data | **Calibration**: predict confidence before, compare to graded result after |
| **Anchoring on the first idea** | Forcing the first approach even when it struggles | Every problem lists ≥ 2 approaches; "why not X?" prompts in AI review |
| **Einstellung (known solution blocks a better one)** | Using the memorised LeetCode solution after constraints change | Twists and follow-ups for every problem |
| **Confirmation bias in testing** | Only trying inputs that work | Edge-case checklist; AI reviewer hunts for counter-examples |
| **Sunk cost** | 40 minutes on one bug | Timers; hint ladder; move on and schedule a review |
| **Hindsight bias** | "Obvious!" after seeing the answer | Write your attempt first; attempts are saved and compared |
| **Outcome bias** | Judging a session by pass/fail only | Rubric scores for process: communication, testing, complexity |
| **Language/tool comfort** | Only ever practising with an IDE | Plain editor, no run button; verification by reasoning |
| **Planning fallacy** | "I'll catch up on the weekend" | Daily budget, automatic re-planning, visible buffer |

**Desirable difficulties:** spacing, interleaving, retrieval practice and generation feel slower and worse, and produce far better retention. If practice feels smooth, it is probably too easy.

**In the room:** state assumptions out loud (so the interviewer can correct them), ask "is there a constraint I am missing?", and treat the interviewer's doubt as data, not as an attack.`,
    pitfalls: ["Tracking 'problems solved' as the only metric", "Looking at the topic tag before attempting", "Skipping reviews because the item 'feels known'"],
    quiz: [
      Q("Why does interleaving topics feel worse but work better?", ["It is not better", "*It forces you to identify the pattern, which is the actual interview skill", "It saves time", "It avoids hard problems"], "Blocked practice hands you the pattern for free."),
      Q("You rate yourself 5/5 confident, and the review finds two bugs. The useful reaction is…", ["Ignore it", "*Log the calibration gap and schedule an earlier review", "Lower all future ratings", "Stop rating"], "Calibration data corrects over- and under-confidence over time."),
    ],
    cards: [["Recognition vs recall", "Recognising a solution when you see it is not the same as producing it; only retrieval practice builds recall"]],
  }),
  T("craft", "behavioral", "Googleyness & leadership (behavioural)", 1, 30, "STAR stories, what interviewers probe, and a story bank that covers every prompt.", {
    signals: ["The G&L round, plus the first five minutes of every other round"],
    lesson: `**Format: STAR(L)**: Situation (2 sentences) → Task (your responsibility) → **Action (60% of the answer: what *you* did and why)** → Result (numbers) → Learning.

**What is being probed**
- *Ambiguity:* did you create clarity or wait for it?
- *Ownership & bias to action:* did you go beyond your ticket?
- *Collaboration & conflict:* disagree with data, commit, keep the relationship.
- *Leadership without authority:* influencing peers, mentoring, unblocking.
- *Growth mindset:* real failures, specific lessons, changed behaviour.
- *Users and ethics:* doing the right thing under pressure.

**Build a story bank of 6–8 stories**, each tagged with the themes it can serve: biggest technical challenge · conflict with a teammate/manager · failure or production incident · leading without authority · ambiguous project · tight deadline trade-off · mentoring/helping someone grow · disagreeing with a decision · going beyond scope · receiving hard feedback.

**Rules**
- "I", not "we", for actions; credit the team for results.
- Quantify: latency −40%, on-call pages 12 → 2/week, 3 teams unblocked.
- 2–3 minutes per answer; expect two follow-ups ("what would you do differently?", "what did the other person think?").
- No villain stories; show empathy for the other side.
- Prepare hypotheticals too: "what would you do if a teammate was not delivering?"

**Questions to ask them:** team's biggest technical bet, how decisions are made, what a great L4/L5 does in their first six months.`,
    pitfalls: ["Rambling context, tiny action section", "Hypothetical answers to 'tell me about a time' questions", "Blaming others", "No measurable result"],
    quiz: [
      Q("Which part of a STAR answer deserves the most time?", ["Situation", "Task", "*Action", "Result"], "Actions reveal your judgement; context is only setup."),
      Q("'Tell me about a time you disagreed with your manager.' Strong answers show…", ["That you were right", "*Data-driven disagreement, openness to their view, and commitment after the decision", "That you escalated", "That you avoided conflict"], "Disagree-and-commit with the relationship intact."),
    ],
    cards: [["STAR(L)", "Situation · Task · Action (most of the time) · Result (quantified) · Learning"]],
  }),
];

function B(id: string, title: string, prompt: string, guidance: string, probes: [string, string][]): Design {
  return {
    id: `d-beh-${id}`, area: "craft", topic: "behavioral", title, tier: 2, est: 20, prompt,
    stages: [{ key: "star", title: "Your STAR answer", ask: "Write your answer as you would say it: Situation, Task, Action, Result, Learning. Aim for 2–3 minutes of speech (250–400 words).", model: guidance }],
    steer: probes,
    pitfalls: ["Too much context", "'We' instead of 'I' for actions", "No numbers in the result", "No reflection"],
  };
}

export const behavioralPrompts: Design[] = [
  B("challenge", "Hardest technical challenge", "Tell me about the most technically challenging project you have worked on.",
    "**Strong answers:** make the difficulty concrete (scale, ambiguity, constraints), show options you considered and why you chose one, your specific contribution, measurable outcome, and what you would do differently. **Weak:** listing technologies; describing the team's work without your role.",
    [["'Why was that the right trade-off?'", "Name the alternatives and the cost you accepted"], ["'What would you change in hindsight?'", "A specific design or process change, not 'nothing'"]]),
  B("conflict", "Disagreement with a teammate or manager", "Tell me about a time you disagreed with a colleague. How did you handle it?",
    "**Strong:** understand their position first, bring data or a prototype, find the shared goal, agree on a decision process, commit fully to the outcome, relationship preserved. **Weak:** winning the argument, escalating early, or avoiding the conflict.",
    [["'What was their perspective?'", "Show you can articulate it fairly"], ["'What if they had not been convinced?'", "Disagree and commit; escalate only on user/safety impact"]]),
  B("failure", "A failure or production incident", "Tell me about a time you failed or caused an incident.",
    "**Strong:** a real failure with consequences, immediate ownership (mitigation first), blameless root-cause analysis, systemic fix (tests, alerts, process), and evidence you behave differently now. **Weak:** a humble-brag or a failure that was someone else's fault.",
    [["'How did you communicate it?'", "Early, factual, with a mitigation plan"], ["'What changed afterwards?'", "A concrete guardrail that still exists"]]),
  B("ambiguity", "Dealing with ambiguity", "Describe a time you had to deliver with unclear requirements.",
    "**Strong:** you identified the unknowns, talked to users/stakeholders, wrote down assumptions, proposed a small first milestone to learn, iterated. **Weak:** waiting for clarity or building the wrong thing confidently.",
    [["'How did you decide what to build first?'", "Risk/learning-driven prioritisation"], ["'What assumption turned out wrong?'", "And how cheaply you found out"]]),
  B("leadership", "Leading without authority", "Tell me about a time you led an effort without being the formal lead.",
    "**Strong:** you noticed a problem nobody owned, built alignment (doc, demo, data), enabled others, shared credit, and the result outlived your involvement. **Weak:** doing everything yourself.",
    [["'How did you get buy-in from a sceptical person?'", "Their incentives, small asks, evidence"], ["'How did you handle someone not delivering?'", "Private, specific, supportive, then escalate transparently"]]),
  B("mentoring", "Helping someone grow", "Tell me about a time you helped a teammate improve.",
    "**Strong:** specific person and gap, how you adapted to them (pairing, reviews, stretch task), their measurable growth, what you learned about teaching. **Weak:** 'I reviewed their code'.",
    [["'How did you give difficult feedback?'", "Specific, timely, about behaviour, with support"]]),
  B("deadline", "Trade-offs under a tight deadline", "Describe a time you had to make a trade-off between quality and speed.",
    "**Strong:** explicit options and risks, what you cut and what you refused to cut (correctness, security), stakeholder agreement, follow-up debt paid. **Weak:** heroics and overtime as the answer.",
    [["'How did you make sure the debt was paid?'", "Tracked, scheduled, owner assigned"]]),
  B("feedback", "Receiving hard feedback", "Tell me about critical feedback you received and what you did with it.",
    "**Strong:** real feedback that stung, you sought specifics, changed a behaviour, and can point to evidence of the change. **Weak:** feedback that is secretly a strength.",
    [["'Did you agree with it at the time?'", "Honest initial reaction, then reflection"]]),
];
