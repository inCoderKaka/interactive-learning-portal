import { md } from "@/content/ai/md";

/**
 * Chapter overview pages for Interview Craft (req3 Craft pass), written for first-time learners. Each replaces the old
 * chapter lesson in content/craft.ts once the chapter's pages are written.
 */
export const CRAFT_OVERVIEWS: Record<string, string> = {
  "craft-hiring": md`
## What this chapter is about

Before you prepare for any interview, it helps to know how the machine on the other side works. A tech hiring process is a pipeline: a recruiter, one or two screens, a loop of four to six interviews, then a decision made by someone who usually wasn't in the room. Each step needs something different from you.

Five pages:

1. **The pipeline.** The stages from application to offer, who's who (recruiter, hiring manager, bar raiser, hiring committee) and who actually decides at different companies.
2. **Levels across companies.** What "mid" (Google L4 equivalent) and "senior" (Google L5 equivalent) are called at 26 companies, typical years of experience in India and the US, and why titles mislead.
3. **How your level is decided.** Years set the range, interviews set the rung; how to raise the level question early and what to do after a downlevel.
4. **How you're scored.** Structured interviews, rubrics, written feedback, debriefs and committees, and why saying your reasoning out loud matters so much.
5. **Interviewer variance.** How much depends on luck, what you control, and the maths of applying to several companies.

:::tip The one idea to keep
Interviewers can only score what they can write down, and one round is one noisy draw. Make evidence easy to write, and give yourself several draws.
:::
`,
  "craft-search": md`
## What this chapter is about

Getting interviews, and planning the search so offers arrive together. Most engineers lose more by searching badly (one company at a time, online applications only, an early number to a recruiter) than by any single interview.

Five pages:

1. **Resumes.** What really filters resumes (not the "ATS rejects 75%" myth), one page, impact bullets with numbers, India conventions.
2. **Referrals and outreach.** Referred applicants get interviewed about 13 times as often as online applicants; who to ask, what to send, and why cold referrals from strangers help little.
3. **The recruiter call.** What it sets (level, timeline, the pay anchor), how to handle current and expected CTC, and the questions to ask.
4. **Preparation plans.** How long, in what order for mid and senior candidates, and why mock interviews matter so much.
5. **Running processes in parallel.** Ordering companies, aligning offers, extensions, cool-downs and India's notice periods.

:::tip The one idea to keep
Start the slow processes first, warm up on lower-priority companies, and never name an expected CTC before the level is agreed.
:::
`,
  "coding-round": md`
## What this chapter is about

How to run every kind of interview round, independent of the technical content (which lives in the DSA, HLD, LLD and AI areas). Each round type has a shape: a time plan, things the interviewer is listening for, and predictable ways candidates lose points.

Seven pages:

1. **Online assessments.** Timed, auto-graded tests, partial credit, and what proctoring records.
2. **The coding round, out loud.** The 45 minutes minute by minute, checklists for clarifying and testing, and how Google, Meta, Amazon, banks and trading firms differ.
3. **The system design round.** Running the hour, what senior candidates must show, finding the hidden requirement.
4. **Object-oriented design and machine coding.** India's eliminating 90-minute build, how it's scored, and the time plan.
5. **ML and AI engineer rounds.** ML system design, breadth, depth, ML coding and project deep dives, company by company.
6. **AI tools and in-person rounds.** Who bans AI, who provides it, who grades it, and the default rule.
7. **Onsite logistics.** Equipment, backups, whiteboards, breaks and the night-before checklist.

:::tip The one idea to keep
Every round is scored on process as much as answers: clarify, plan out loud, check your own work, and summarise.
:::
`,
  behavioral: md`
## What this chapter is about

Behavioural rounds ask about real past situations, because past behaviour predicts future behaviour. They're scored against each company's values, and at senior level they help decide your level.

Four pages:

1. **STAR answers and a story bank.** The structure, "I" not "we", numbers in results, and a bank of six to eight stories covering twelve themes (with a grid to fill in).
2. **The prompts every company asks.** Twelve themes, what strong answers show, and the follow-ups that come next.
3. **Company values side by side.** Google's attributes, Amazon's 16 Leadership Principles, Netflix's culture memo, Microsoft's growth mindset and more, and how to re-emphasise one story for each.
4. **Senior behavioural.** Scope, influence across teams, conflict with leaders and raising others.

:::tip The one idea to keep
Same facts, different emphasis: know which part of each story each company is listening for.
:::
`,
  "craft-situations": md`
## What this chapter is about

The moments that go wrong in real interviews, and what to do in each. Most have a short, practised response; the common thread is to stay talking, stay factual, and fix problems out loud.

Eight pages:

1. **Going blank and getting stuck.** An unsticking routine, taking hints, and the last fifteen minutes.
2. **Difficult interviewers.** Silent, distracted, rude, wrong hints, disagreements, switched questions, and reporting a bad round.
3. **Mistakes and seen questions.** The narrated pivot, late bugs, misreads, and the honest options when you've seen the question.
4. **Technical failures.** Outages, crashed editors, proctoring incidents, oversized take-homes, unfamiliar languages and off-level questions.
5. **Awkward questions.** Layoffs, gaps, short tenures, being let go, failures, "biggest weakness" and "other offers?".
6. **Language and accent.** Accent bias, thinking aloud in a second language, and practical techniques.
7. **Nerves and energy.** What works (practice under observation, reappraisal, slow breathing, sleep), what doesn't, and recovering mid-loop.
8. **The last five minutes.** Questions by interviewer type, follow-ups and thank-you notes.

:::tip The one idea to keep
Silence and invention are the two big mistakes. Say what's happening, say what you'll do, and be honest.
:::
`,
  "craft-offers": md`
## What this chapter is about

Turning an offer into a good decision. Offers are written to look good; Indian CTC figures mix certain and uncertain money, stock hides its shape across years, and the weeks between offer and joining have their own risks in India.

Four pages:

1. **Reading an offer.** CTC split into certainty buckets, vesting shapes, ESOP liquidity, bank and trading-firm packages (with a year-by-year comparer).
2. **Negotiating.** Ten rules, scripts for each stage, what's negotiable at different companies, and what the research says.
3. **India offer-stage norms.** Notice periods and buyouts, background checks, clawbacks, revocations, counter-offers and the safe order of steps.
4. **Comparing offers beyond money.** Manager, team, growth, brand, stability, and a weighted scorecard.

:::tip The one idea to keep
Compare four years, not one; get everything in writing; and don't resign until the written offer and buyout terms are in hand.
:::
`,
  biases: md`
## What this chapter is about

Bias means a systematic tilt in judgement: the same mistake, in the same direction, again and again. It works on both sides of the interview table and in how you prepare and decide. Each page says how strong the evidence is (strong, moderate, weak or contested) and gives a countermeasure that works.

Four pages:

1. **Your biases while interviewing.** Locking onto the first idea, defending a failing approach, misreading silence, over-noticing slips, misjudging your own performance, and choking under observation.
2. **Interviewer biases against you.** First impressions, confirmation, confidence read as competence, accent, similarity and pedigree, and what structured interviews do about them.
3. **Biases in how you prepare.** Recognition vs recall, spacing, interleaving, survivorship bias and the planning fallacy.
4. **Biases in evaluating offers.** Anchoring, loss aversion, brand, present bias and sunk cost, with a scorecard that counters most of them.

:::tip The one idea to keep
Don't rely on noticing bias in the moment; you won't. Build small habits (name alternatives, write things down, compare four-year totals) that catch it for you.
:::
`,
};
