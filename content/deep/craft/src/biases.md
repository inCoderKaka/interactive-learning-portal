=== your-biases
blurb: The predictable ways your own mind works against you during a round: locking onto the first idea, defending a failing approach, misreading silence, over-noticing your own slips, judging your performance wrongly, and choking under observation. What the evidence says, and a countermeasure for each.
signals: You keep pushing an approach that is not working | You are sure the round went badly | The interviewer goes quiet and you panic | You froze on something you know cold
prereq: interviewer-variance

--- lesson
:::words
- **Bias**: a systematic tilt in judgement. Not a random mistake but one that happens in the same direction again and again.
- **Einstellung effect**: a German word for "set" or "attitude". A method you already know blocks you from seeing a simpler or better one.
- **Sunk cost**: time or effort already spent that you cannot get back. The *sunk-cost effect* is continuing something because of what you already spent, not because of what it will return.
- **Spotlight effect**: believing other people notice your slips far more than they do.
- **Choking**: performing worse than your normal level because of pressure.
- **Working memory**: the small mental "desk" where you hold the few things you are actively thinking about.
- **Reappraisal**: deliberately relabelling a feeling, for example calling a racing heart "excitement" instead of "fear".
- **Evidence labels used in Craft**: *strong* (meta-analysis or many replications), *moderate* (one or a few good studies, or a large company dataset), *weak* (small study or practitioner opinion), *contested* (replications failed or the method is disputed).
:::

## The problem in plain words

An interview is a strange way to solve problems. You are timed, watched, asked to talk while thinking, and you know a job depends on it. In those conditions every human mind makes the same handful of errors. They are not signs that you are weak; they are how attention and memory behave under stress. The good news is that each one has a known shape, so you can build a small habit that catches it.

:::eli5
Imagine walking a familiar route home and finding the road closed. You keep trying side streets that lead back to the same closed road, because your feet "know" the way. A map you pull out *on purpose* would have shown a different road in seconds. Most interview biases are like this: a habit that works on normal days and misleads you on the one day that matters. The fix is a deliberate "pull out the map" step.
:::

## 1. Locking onto the first idea (the Einstellung effect)

In 1942 Abraham Luchins gave people water-jar puzzles. After solving several with the same long method, most people kept using it even when a much shorter one existed; people who had not been "trained" on the long method found the short one easily (strong, classic). In 2008 Bilalić, McLeod and Gobet tracked the eyes of chess experts. Once an expert had spotted a familiar winning plan, their eyes *kept returning to that plan's squares* while they believed they were searching for something better. The experts could not see their own fixation (strong).

In a coding round this looks like: you recognise "this is a sliding window", start writing, and fifteen minutes later discover the window cannot shrink correctly. In a design round it looks like reaching for the architecture you used at work for every question.

**Countermeasure: a forced alternatives step.** After stating the brute force, spend 30–60 seconds *out loud* listing two or three other tools before you commit: "This could be two pointers, a heap, or dynamic programming. Two pointers needs sorted input, which we don't have, so…". Because experts do not notice their own fixation, the step has to be a rule you follow, not a feeling you wait for.

## 2. Defending a failing approach (sunk cost)

Arkes and Blumer (1985) showed that people keep investing in a failing course of action because of what they have already put in (moderate to strong). Twenty minutes into a greedy solution, a counterexample appears, and the pull is to patch it rather than drop it.

**Countermeasure: a checkpoint and a narrated pivot.** Decide in advance: if an approach has not moved forward for about 5–8 minutes, or a counterexample breaks it, say so and change course. "This greedy choice fails on [3, 1, 2], because taking 3 first blocks the better pair. I'll switch to dynamic programming over prefixes." Interviewers write down *how you respond to evidence*. A calm, explained pivot is positive signal; silently patching a broken idea is not.

## 3. Misreading silence and faces

Interviewers are usually typing notes, reading your code, or thinking about their next follow-up. Silence is mostly neutral. But a stressed mind fills silence with a story ("they think I'm failing"). The research below shows candidates are poor judges of how they are doing, so these stories are unreliable.

**Countermeasure: ask a check-in question** instead of guessing: "Does this direction make sense, or would you like me to look at the memory limit first?" It converts a feeling into information and shows collaboration.

## 4. Over-noticing your own slips (the spotlight effect)

In Gilovich, Medvec and Savitsky's 2000 studies, students wore an embarrassing T-shirt into a room and guessed about half the people noticed it; far fewer actually had (moderate). Your typo, a forgotten library function name, or a stumble in a sentence is huge to you and small to the interviewer.

**Countermeasure:** acknowledge it in one sentence and move on. "I don't remember the exact method name; I'll call it `pop_left` and say what it does." Then *stop talking about it*. Apologising repeatedly turns a small slip into a theme.

## 5. Judging your own performance wrongly

interviewing.io compared candidates' self-ratings with interviewers' ratings over about 1,000 mock interviews: the gap was small but real, and people who *thought* they had done poorly were about three times less likely to want to work with that company. Experienced, higher-rated engineers judged themselves more accurately (moderate, company data). The same platform found that, after one bad interview, women quit practising about seven times as often as men (moderate).

You may have heard of the **Dunning–Kruger effect** ("the incompetent are always overconfident"). Treat it carefully: critics showed much of the classic pattern appears even in random data, and a 2023 reanalysis with better methods found a real but *smaller* effect (contested). The safe lesson is simpler: *people misjudge their own performance in both directions*.

**Countermeasure:** do not decide how a round went while you are in the loop. Between rounds, the only question is "what is the next round's first five minutes?". Judge afterwards, and judge the *loop*, not one round.

## 6. Choking under observation

Behroozi and colleagues (2020) randomly assigned 48 computer-science students to solve a problem on a whiteboard either with an interviewer watching or alone. The watched group **performed about half as well**. The authors compare the format to a standard laboratory method for causing stress (moderate; small sample). Beilock and Carr (2001) explain the mechanism: worry takes up working memory, the same desk you need for the problem (moderate). A later Microsoft Research study found that interviews without a live observer reduced this stress.

**Countermeasures:**
- **Practise with an observer.** Solo practice trains the problem; mock interviews with a person (or a timed, recorded session talking out loud) train the *situation*. They are different skills. The mock interview room in this portal exists for this reason.
- **Offload working memory onto the page.** Write the example, the invariant and your plan in the editor or on the board. What is written does not need to be held in your head.
- **Reappraise arousal.** Alison Wood Brooks (2014) found that saying "I am excited" before a stressful task worked better than trying to calm down, for singing, public speaking and maths tasks. A 2025 replication of the public-speaking study found people *felt* more excited but not less anxious, so expect a modest effect (moderate, partly replicated). Jamieson and colleagues (2010) told students that a racing heart helps performance and saw better maths scores.

:::warn Techniques that did not hold up
- **Power posing** (standing like a superhero before an interview) failed a large replication on both hormones and behaviour (contested; do not rely on it).
- **Expressive writing** (ten minutes writing down your worries before a test) looked promising in 2011, but a large replication project and a 173-student classroom study found no benefit (contested; harmless but unreliable).
- **Stereotype threat** (doing worse because you fear confirming a stereotype about your group) is real as an experience, but meta-analyses found the measured effect is small and inflated by publication bias. Structured preparation and practice matter more.
:::

## 7. Catastrophising after one bad round

In interviewing.io's data, candidates with a solid average still failed a single interview up to 22% of the time (moderate). A loop of four or five rounds is designed to absorb one weak round. Panicking after round two, though, often damages rounds three and four, which turns one weak data point into several.

**Countermeasure: a reset routine** between rounds, the same every time: water, one slow breath, one sentence ("next round, first five minutes: clarify, example, brute force"). Routines work because they do not need a decision when you are stressed.

## Putting it together: your in-round checklist

| Moment | Bias waiting for you | Your habit |
|---|---|---|
| You recognise the problem | Einstellung | Name two alternatives before committing |
| 5–8 minutes without progress | Sunk cost | Say it, find the counterexample, pivot out loud |
| Interviewer goes quiet | Reading silence | Ask a check-in question |
| You make a small slip | Spotlight | One sentence, then move on |
| Round feels bad | Misjudging yourself | Don't grade it now; reset routine |
| Heart racing | Choking | Write things down; "I'm excited" |

## Interview angles

- Nobody asks "what are your biases?". The signal shows up indirectly: how you respond to a hint, whether you test your own code, whether you can drop an idea gracefully.
- Senior candidates (L5 equivalent) are expected to *state trade-offs and change their mind with evidence*. Fixation looks like inflexibility; a narrated pivot looks like judgement.
- The interviewer's biases are the other half of the story: see [Interviewer biases against you](/learn/interviewer-biases).

--- revise
### Fixation and persistence
? What is the Einstellung effect? :: A method you already know blocks you from seeing a better one; experts don't notice it in themselves (Luchins 1942; Bilalić 2008).
? The countermeasure for Einstellung? :: A forced alternatives step: after the brute force, name two or three other tools out loud before committing.
? What is the sunk-cost effect in a round? :: Patching a failing approach because of the time already spent on it.
? When should you pivot? :: After about 5–8 minutes without progress, or as soon as a counterexample breaks the idea; say why and switch.

### Perception
? Interviewer goes silent. What does it usually mean? :: Nothing: they are typing notes or reading. Ask a check-in question instead of guessing.
? What is the spotlight effect? :: Overestimating how much others notice your slips; acknowledge once and move on.
? What did interviewing.io find about self-assessment? :: Candidates misjudge their performance; those who think they failed are about 3× less likely to want the job.
? Safe takeaway from Dunning–Kruger? :: People misjudge themselves in both directions; the classic effect is smaller than claimed (contested).

### Pressure
? Behroozi et al. 2020 finding? :: Being watched at a whiteboard roughly halved performance (48 students, randomised).
? Why does pressure hurt problem solving? :: Worry occupies working memory (Beilock & Carr 2001).
? Three countermeasures for choking? :: Practise with an observer; write things down to free working memory; reappraise arousal as excitement.
? Which popular techniques failed replication? :: Power posing and expressive writing; stereotype-threat effects are small and inflated.
? How often does a solid candidate fail one round? :: Up to about 22% of the time (interviewing.io), so judge the loop, not one round.

--- notes
## Fixation
Einstellung: known method hides better one (Luchins 1942 water jars; Bilalić 2008 chess eye-tracking, experts blind to it).
Habit: brute force, then name 2–3 alternatives out loud before coding.
Sunk cost (Arkes & Blumer 1985): checkpoint at 5–8 min or first counterexample; narrated pivot = positive signal.
## Perception
Silence is neutral (note-taking); ask a check-in question.
Spotlight effect (Gilovich 2000): one-sentence acknowledgement, move on, no repeated apologies.
Self-assessment unreliable (interviewing.io ~1,000 interviews); "I failed" → 3× less interest.
Dunning–Kruger: contested; "misjudge both ways".
## Pressure
Observed whiteboard ≈ half performance (Behroozi 2020, n=48). Worry eats working memory (Beilock & Carr 2001).
Practise with an observer; offload to the page; "I am excited" (Brooks 2014, modest, partly replicated).
Failed or weak: power posing, expressive writing, stereotype threat (small, publication bias).
## Between rounds
Solid candidates fail ~1 in 5 single rounds; loops absorb one weak round.
Reset routine: water, breath, "first five minutes" sentence. Grade the loop afterwards, never mid-loop.

--- doubts
Q: If experts can't notice their own fixation, how can a checklist help?
A: Because the checklist does not rely on noticing. You run the alternatives step every time, even when you feel certain, the same way a pilot runs a pre-flight checklist on a plane they have flown a thousand times. Most of the time the first idea survives and you lose 45 seconds; occasionally it saves the round.

Q: Won't pivoting halfway look indecisive?
A: Not if you explain it. "This breaks on this input, for this reason, so I'm switching to X" shows that you test ideas and respond to evidence, which is exactly what rubrics reward. What looks bad is drifting: changing approach without saying why, or never committing.

Q: Is it fake to say "I'm excited" when I'm scared?
A: No. Fear and excitement feel almost identical in the body (fast heart, alertness). Reappraisal is choosing the label that points you toward the task. The evidence is modest, so treat it as one small tool, not a cure.

Q: Should I tell the interviewer I'm nervous?
A: A brief, light mention is fine and human ("I'm a little nervous, so I'll think out loud and write things down"). Don't make it a theme or ask for reassurance. Then use the habits on this page.

--- exercises
[fix] You recognise a problem as "binary search on the answer" within 20 seconds and start coding. What should you have said first, and why?
A: State the brute force and its cost, then name alternatives out loud before committing: "Brute force tries every capacity, O(n·max). Options: binary search on the answer if feasibility is monotonic, a greedy pass, or DP. Feasibility is monotonic here because a larger capacity never hurts, so binary search works: O(n log max)." This guards against the Einstellung effect and gives the interviewer evidence of judgement to write down.

[say] Twelve minutes into a greedy approach you find a counterexample. Write the two or three sentences you would say.
A: Suggested wording (not from a source): "I've found a case that breaks this: on [3, 1, 2] taking the largest first gives 3, but the best is 1 + 2 with the constraint. So the greedy choice isn't safe. I'll switch to dynamic programming over prefixes: let me define the state first." Name the counterexample, the reason, and the new plan.

[plan] Design a between-rounds reset routine you can do in two minutes on a virtual onsite.
A: Example: stand up and drink water; one slow breath out longer than in; close the previous round's tab and do not replay it; read one card that says "Clarify → example → brute force → alternatives → plan → code → test"; open the next link two minutes early. Keep it identical every time so it needs no decisions.

--- pitfalls
- Committing to the first recognised pattern without naming alternatives
- Patching a broken approach instead of pivoting out loud
- Treating interviewer silence as a verdict
- Apologising repeatedly for small slips
- Grading a round while the loop is still running
- Relying on power posing or other techniques that failed replication

--- quiz
Q: Chess experts in Bilalić et al. (2008) who had found a familiar plan…
- Quickly found the better plan
- *Kept looking at the familiar plan while believing they were searching for alternatives
- Refused to keep searching
- Played randomly
W: The Einstellung effect is invisible from the inside, which is why the countermeasure is a fixed habit.

Q: Twenty minutes in, a counterexample breaks your approach. Best response?
- Patch the case with a special if-statement and continue
- *Say what breaks and why, then switch approach with a short plan
- Ask the interviewer for the answer
- Keep going quietly and hope it is not tested
W: A narrated pivot shows you respond to evidence; a patched broken idea usually fails other cases too.

Q: Which technique has the weakest evidence?
- Practising mock interviews with an observer
- Writing your plan down to free working memory
- *Power posing before the interview
- Reappraising nerves as excitement
W: Power posing failed a large replication; the others have direct support or a clear mechanism.

Q: In the Behroozi et al. (2020) study, what roughly halved performance?
- Using a laptop instead of a whiteboard
- *Solving with an interviewer watching
- A harder problem
- Time limits
W: Observation itself was the stressor, so practise under observation.

--- sources
- paper :: Does Stress Impact Technical Interview Performance? (ESEC/FSE 2020) :: Behroozi, Shirolkar, Barik & Parnin :: https://www.sciencedaily.com/releases/2020/07/200714101228.htm
- article :: People can't gauge their own interview performance :: interviewing.io :: https://interviewing.io/blog/people-cant-gauge-their-own-interview-performance-and-that-makes-them-harder-to-hire
- paper :: Get excited: reappraising pre-performance anxiety as excitement :: Brooks, J. Exp. Psychology: General 2014 :: https://pubmed.ncbi.nlm.nih.gov/24364682/
- paper :: Why good thoughts block better ones: the Einstellung effect :: Bilalić, McLeod & Gobet, Cognition 2008 :: https://doi.org/10.1016/j.cognition.2007.02.002
- paper :: Expressive writing and test anxiety: a classroom replication :: Myers, Davis & Chan 2021 :: https://pmc.ncbi.nlm.nih.gov/articles/PMC8192598
- paper :: The spotlight effect in social judgment :: Gilovich, Medvec & Savitsky 2000 :: https://doi.org/10.1037/0022-3514.78.2.211

=== interviewer-biases
blurb: How interviewers' judgement tilts, even with rubrics: first impressions, confirmation, halo, confidence read as competence, accent, similarity and pedigree, and the order you are seen in. What each looks like, how strong the evidence is, and what you can do about it.
signals: Your first five minutes went badly | You have a non-native accent | You don't have a famous college or company on your resume | You speak carefully and with caveats
prereq: how-evaluated

--- lesson
:::words
- **Structured interview**: every candidate gets the same kind of question, scored on the same predefined scale (a rubric), with each interviewer writing feedback alone before any discussion.
- **First impression / primacy**: the judgement formed in the first minutes, and the tendency for early information to weigh more than later information.
- **Confirmation bias**: looking for, and noticing, evidence that supports what you already believe.
- **Halo effect**: one strong trait (a famous employer, a confident manner) colouring judgements of unrelated traits. The reverse, a single flaw colouring everything, is sometimes called the **horn effect**.
- **Affinity (similarity) bias**: favouring people who are like you.
- **Pedigree**: the brand names on a resume, such as an IIT, a FAANG company or a top lab.
- **Calibration**: interviewers comparing their scores so that "Hire" means the same thing from different people.
:::

## The problem in plain words

Interviewers are people deciding under time pressure with incomplete information. Companies know this, which is why big-tech loops use rubrics, several independent interviewers and a separate decision step (see [How interviewers score you](/learn/how-evaluated)). Structure reduces bias a lot. It does not remove it. Knowing *which* biases survive structure tells you where a little effort buys you a lot.

:::eli5
Think of a cricket umpire. Rules, replays and a third umpire make decisions much fairer than a single person's gut feeling. But an umpire who saw a batsman play beautifully for an hour is still a fraction more likely to give the benefit of the doubt on a close call. You cannot change the umpire, but you can avoid giving close calls.
:::

## 1. First impressions carry forward

Barrick, Swider and Stewart (2010) studied the small-talk opening of structured interviews. Interviewers' impressions from those first minutes predicted their end-of-interview ratings (correlation 0.42) and even internship offers. Interestingly, early judgements of *competence* also predicted *other* interviewers' ratings, so they partly carry real signal; early *liking and similarity* did not carry over to anyone else, so they are noise (moderate). Follow-ups found early impressions track verbal fluency and extraversion, and their influence is strongest on the first questions and fades later.

Dougherty, Turban and Callender (1994) found interviewers act on first impressions: warmer, more selling, more help for candidates they already like (moderate). Unstructured interviewers also tend to ask questions that confirm their first hypothesis rather than test it (Dana and colleagues, 2013).

**What you can do:**
- Prepare a crisp 60–90 second introduction and rehearse it until it is boring.
- Make the first five minutes of every round deliberately strong: restate the problem, ask two or three sharp clarifying questions, write an example. These are competence signals, the kind that carry over.
- A shaky start is repairable: the effect fades over later questions. Do not let a weak minute two become a weak minute forty.

## 2. Confirmation and the horn effect after a mistake

Once an interviewer suspects a weakness, they notice evidence for it more easily. A bug you leave unexplained can colour everything after it.

**What you can do:** make your corrections *visible*. "I see an off-by-one here: the loop should stop at n − 1. Fixing it." A visible self-correction gives the interviewer counter-evidence to write down. Finish each round with a clean summary (final complexity, the cases you tested, what you would improve) so the last notes are good ones. (This is an inference from how rubrics are written; there is no study of recency inside tech interviews.)

## 3. Confidence is read as competence

Anderson, Brion, Moore and Kennedy (2012) ran six studies: overconfident people gained status because others *saw them as more competent*, and their overconfidence produced behaviour that looked competent (moderate to strong). A later paper suggests the effect is strongest when real ability is hidden. A coding round reveals a fair amount of real ability, which limits the effect, but explanations, design rounds and behavioural rounds are more open to it.

**What you can do:** do not fake confidence; that backfires when the code fails. Use **calibrated, decisive language**: "I'll use a hash map: linear time, linear space; the trade-off is memory." When you are unsure, state the uncertainty as a plan, not as hedging: "I believe the default is 16; I'd verify in the docs, and the design doesn't depend on it." Many careful engineers (and many people raised to be modest) over-qualify every sentence. Trim the qualifiers that carry no information.

## 4. Accent and non-native speakers

This is the bias with the strongest evidence. A 2022 meta-analysis (combining many studies) found that candidates with a standard accent are rated as more hireable than those with a non-standard accent, the effect is larger for jobs with heavy communication, and how *understandable* the speaker was did not explain it away (strong). Huang, Frideger and Pearce (2013) found that non-native accents lowered hiring recommendations through lower perceived "political skill" (ability to influence), not lower language skill (moderate).

For most Indian engineers interviewing with Indian interviewers in Indian offices, the "standard" accent in the room may well be their own, so the effect is mainly relevant in loops with US, UK or European interviewers, which is common for senior and ML roles.

**What you can do** (these reduce misunderstanding; they do not remove bias):
- Signpost structure out loud: "Three steps. Step one…".
- Write key words and numbers in the editor or on the whiteboard as you say them.
- Check audio: a good headset and a quiet room matter more for a non-native speaker, because poor audio stacks on top of the accent effect.
- Speak a little slower than feels natural. Pausing is fine.
- More in [Language, accent and thinking aloud](/learn/language-accent).

## 5. Similarity, halo and pedigree

Lauren Rivera's study of elite banks, law and consulting firms (2012) found evaluators hired for "cultural matching": shared hobbies, experiences and ways of presenting oneself (moderate, qualitative). The halo effect is one of psychology's oldest findings (strong): a famous logo on a resume can lift ratings of unrelated skills. Barrick's data suggest liking and similarity are idiosyncratic: they did not predict other interviewers' ratings, which is why multi-interviewer loops dilute them.

**What you can do:** lead with **comparable evidence**, not brand names: numbers, scope, the decisions you made and their trade-offs. "I cut p99 latency from 900 ms to 180 ms for a service doing 40,000 requests per second by…" is evidence any rubric can use. If you lack pedigree, structured rubrics are your friend: give them material.

## 6. The order you are seen in

Simonsohn and Gino (2013) analysed more than 9,000 MBA admission interviews. Interviewers seemed to spread their grades across each *day*: if earlier candidates that day scored high, later ones scored a little lower (moderate). You almost never choose your slot, and no evidence clearly favours one time over another, so do not over-engineer this.

:::warn The "hungry judges" story
You may hear that judges (and so interviewers) decide harshly just before lunch. The 2011 parole study behind this has been heavily criticised: case order was not random and the effect size is implausibly large. Do not plan your interview around meal times.
:::

## 7. Interviewer-specific tilts

Beyond general biases, individuals have preferences: favourite languages, a love of a particular design pattern, a dislike of certain tools. Hello Interview's guide (2025) advises avoiding "religious" topics such as language or framework wars, because an interviewer may use them to justify a rejection (reputable). If an interviewer strongly prefers an approach, take the off-ramp ("Sounds good, let me walk you through it that way") unless correctness is at stake. See [Difficult interviewers](/learn/difficult-interviewers).

## What companies do about it, and what that means for you

| Company practice | Bias it targets | What it means for you |
|---|---|---|
| Rubrics with named attributes | Gut feel, halo | Say evidence in the rubric's terms |
| Independent written feedback before the debrief | Groupthink, anchoring on a senior voice | Each round is a fresh start |
| Several interviewers (Google found about four is enough) | One person's tilt | One bad interviewer rarely decides alone |
| A separate decider (hiring committee, bar raiser) | Interviewer's personal liking | Your written evidence matters more than rapport |
| Interviewer training and calibration | Inconsistent scales | Strictness still varies (see [interviewer variance](/learn/interviewer-variance)) |

## Interview angles

- You cannot remove an interviewer's bias. You can (a) give fewer close calls, (b) make evidence easy to write down, and (c) apply to enough places that one biased round does not decide your year.
- If you believe an interviewer behaved unprofessionally (not just strictly), you can tell the recruiter factually after the round. See [Difficult interviewers](/learn/difficult-interviewers).

--- revise
### Impressions
? What did Barrick et al. (2010) find about the first minutes? :: Early impressions predicted final ratings (r ≈ 0.42); early competence judgements carried over to other interviewers, liking did not.
? How do you use primacy in your favour? :: A rehearsed 60–90 s introduction and a deliberately strong first five minutes (restate, clarify, example).
? How do you counter the horn effect after a bug? :: Correct it visibly out loud and end the round with a clean summary.

### Confidence and accent
? What did Anderson et al. (2012) show? :: Overconfident people are seen as more competent and gain status.
? How should you sound instead of faking confidence? :: Calibrated and decisive; state uncertainty as a plan to verify.
? What does the 2022 accent meta-analysis say? :: Standard accents are rated more hireable, more so for communication-heavy jobs, and comprehensibility does not explain it.
? Practical accent mitigations? :: Signpost structure, write key words, good audio, slightly slower pace.

### Similarity and order
? What did Rivera (2012) find at elite firms? :: Evaluators hired for cultural matching (shared hobbies, experiences, style).
? How do you counter pedigree bias? :: Lead with comparable evidence: numbers, scope, decisions, trade-offs.
? What did Simonsohn & Gino (2013) find? :: Interviewers spread grades within a day: after strong candidates, later ones score a little lower.
? Should you trust the "hungry judges" effect? :: No; the study is heavily contested.

--- notes
## Impressions
First minutes predict final ratings (Barrick 2010, r ≈ .42); competence carries over, liking doesn't.
Interviewers confirm first impressions (Dougherty 1994; Dana 2013). Effect fades on later questions.
Habit: rehearsed 60–90 s intro; strong first five minutes; repair shaky starts.
## Horn effect
Visible self-correction; end-of-round summary (complexity, tests, improvements).
## Confidence
Overconfidence read as competence (Anderson 2012), weaker where ability is visible.
Calibrated decisive language; uncertainty as a plan; trim empty qualifiers.
## Accent (strongest evidence)
2022 meta-analysis: standard accent more hireable, bigger for communication jobs, not explained by comprehensibility.
Huang 2013: via lower perceived political skill.
Mitigate: signposting, write keywords, headset, slower pace.
## Similarity and pedigree
Cultural matching (Rivera 2012). Halo (classic). Lead with numbers and decisions, not logos.
## Order
Narrow bracketing within a day (Simonsohn & Gino 2013). "Hungry judges": contested.
## Company defences
Rubrics · independent write-ups · ~4 interviewers · separate decider · calibration.

--- doubts
Q: If first impressions matter so much, is the "tell me about yourself" part scored?
A: Usually not on the rubric directly, but it shapes the interviewer's first impression, which carries into later ratings. Treat it as the opening of the round: short, specific, relevant to the role.

Q: Should I try to change my accent?
A: No. Accent change is slow and the research shows the bias is not about how understandable you are. Spend the effort on structure, written signposts, audio quality and pace, which help every listener, and on applying widely so one biased listener does not decide the outcome.

Q: Is it worth mentioning famous companies or colleges?
A: Mention them as facts on the resume, but in the interview lead with what you did. Pedigree helps at screening; in the room, specific decisions and results score better and protect you when an interviewer is not impressed by brands.

--- exercises
[fix] Rewrite this answer so it sounds calibrated rather than hedged: "I think maybe we could possibly use a heap, but I'm not sure, it might be wrong, sorry."
A: "I'll use a min-heap of size k: O(n log k) time, O(k) space. One risk: if k is close to n, sorting is simpler; I'll mention it at the end." Decisive choice, cost, and the uncertainty turned into a named risk.

[say] Write your 60–90 second introduction for a senior backend role, built from evidence rather than brand names.
A: Model shape (suggested wording, not from a source): "I'm a backend engineer with six years in payments. Most recently I led the redesign of our settlement service: we moved from nightly batches to streaming, which cut settlement time from 24 hours to 15 minutes for 3 million merchants. I like problems where correctness and scale meet, which is why this team's ledger work interests me." Role, one concrete achievement with numbers, why this role.

[choose] Your first coding round started badly: you misread the problem and lost seven minutes. What do you do for the remaining 38 minutes?
A: Reset visibly: restate the corrected understanding, write an example, give a brute force, and proceed with the normal structure. Impressions fade over later questions, and a calm recovery is itself evidence. Do not apologise repeatedly or rush into code without a plan.

--- pitfalls
- Treating the opening minutes as warm-up instead of the start of the score
- Leaving a found bug unexplained
- Over-hedging every sentence, or faking certainty
- Leading with brand names instead of evidence
- Arguing tool or language preferences with the interviewer
- Planning interview times around contested findings like "hungry judges"

--- quiz
Q: Which early judgement in Barrick et al. (2010) also predicted other interviewers' ratings?
- Liking
- Similarity
- *Competence
- Attractiveness
W: Competence signals partly carry real information; liking and similarity were idiosyncratic.

Q: The accent meta-analysis (2022) found the hireability gap was larger for…
- Remote jobs
- *Jobs with heavy communication demands
- Junior roles only
- Candidates who were hard to understand only
W: And comprehensibility did not explain the effect away.

Q: A candidate without pedigree should mainly…
- Mention famous customers repeatedly
- *Give concrete, comparable evidence: numbers, scope, decisions and trade-offs
- Avoid talking about past work
- Ask the interviewer where they studied
W: Rubrics reward evidence, and evidence travels to the debrief.

--- sources
- paper :: Accentuating the positive: the interview rapport-building stage (J. Applied Psychology 2010) :: Barrick, Swider & Stewart :: https://pubmed.ncbi.nlm.nih.gov/20718533/
- paper :: Accent bias in hiring: a meta-analysis (PSPB 2022) :: Spence et al. :: https://journals.sagepub.com/doi/10.1177/01461672221130595
- paper :: A status-enhancement account of overconfidence (JPSP 2012) :: Anderson, Brion, Moore & Kennedy :: https://pubmed.ncbi.nlm.nih.gov/22800286/
- paper :: Belief in the unstructured interview: the persistence of an illusion (JDM 2013) :: Dana, Dawes & Peterson :: https://jbaron.org/journal/12/121130a/jdm121130a.pdf
- paper :: Your interview will be judged against the rest of the day (Psychological Science 2013) :: Simonsohn & Gino :: https://dash.harvard.edu/server/api/core/bitstreams/7312037c-d816-6bd4-e053-0100007fdf3b/content
- article :: Dealing with bad interviewers :: Stefan Mai, Hello Interview (2025) :: https://www.hellointerview.com/blog/dealing-with-bad-interviewers

=== prep-biases
blurb: Why the preparation that feels most productive (re-reading solutions, grinding one pattern at a time, collecting success stories) works least, and what learning science says to do instead: retrieval, spacing, interleaving, practising under observation, and planning with a buffer.
signals: "I've seen this problem before" but you can't solve it | You finished a topic list and still blank in mocks | Your prep plan keeps slipping | You plan based on someone's "how I cracked Google" post
prereq: prep-timeline

--- lesson
:::words
- **Retrieval practice**: pulling an answer out of your own memory (solving from a blank page) instead of looking at it again.
- **Spacing**: returning to the same material after gaps of days, rather than all in one sitting.
- **Interleaving**: mixing different kinds of problems in one session so you must first work out *which* tool applies.
- **Blocked practice**: doing many problems of one kind in a row (all sliding-window problems, then all heaps).
- **Illusion of competence**: feeling you know something because you recognise it when you see it.
- **Recognition vs recall**: recognition is "yes, I've seen this"; recall is producing it yourself with nothing in front of you.
- **Survivorship bias**: drawing conclusions only from the people who succeeded, because those who failed are not visible.
- **Planning fallacy**: underestimating how long a task will take, even when similar tasks overran before.
:::

## The problem in plain words

Most people prepare in the way that *feels* best: watch a solution, nod, move on; finish all problems tagged "two pointers", then all tagged "heap"; read posts by people who got in and copy their plan. Learning science has a surprising and well-replicated message: the methods that feel smooth produce weak, short-lived skill, and the methods that feel effortful produce strong, transferable skill. The feeling of progress is a bad guide.

:::eli5
Watching someone ride a bicycle a hundred times does not teach you to ride. Falling off a few times while trying does. Re-reading a solution is watching; solving from a blank page is riding.
:::

## 1. Recognition is not recall (the testing effect)

Roediger and Karpicke (2006) had students either re-study a passage or test themselves on it. One week later the self-testers remembered **61%** versus **40%**, even though re-studiers felt more confident right after studying (strong). Karpicke and Blunt (2011) found retrieval practice beat building concept maps for understanding, not just memorising (strong). Koriat and Bjork (2005) explain the trap: when the answer is in front of you, you overestimate whether you could produce it later.

"I've seen this problem" is recognition. The interview needs recall *plus adaptation* to a twist.

**What to do:** after reading or watching a solution, close it and re-solve from a blank editor. Then do it again after about 3, 7 and 21 days. The portal's Revise sheets and the spaced review queue are built for exactly this.

## 2. Space it out

Cepeda and colleagues (2006) combined 317 experiments: practice spread over time beats the same amount crammed together, and the best gap grows with how long you need to remember (strong). Eight hours on Saturday is worse than eight one-hour sessions spread over two weeks.

**What to do:** keep a review list. Every problem you solve gets a "come back" date. Review old problems before starting new ones in each session.

## 3. Mix the problem types (interleaving)

Rohrer, Dedrick and Burgess (2014) ran a classroom study: students who practised mixed problem types scored **72%** on a test a month later, versus **38%** for students who practised one type at a time (strong; a very large effect). Kornell and Bjork (2008) found that most learners *believed* blocked practice worked better even after interleaving had produced better results for them (strong).

Why? A blocked list tells you the tool. "Sliding window, problem 7 of 12" already contains half the answer. Interviews never label the pattern, so the hardest skill, *recognising which tool applies*, is never practised in a blocked list.

**What to do:** learn a new technique in a block (that's fine for first exposure), then switch to mixed sessions as soon as you have seen a few patterns. Random-pick sessions, mock interviews and the portal's mixed drills do this.

## 4. Overfitting to patterns

Memorised templates fail on twists: "now the input is a stream", "now memory is O(1)", "now there are a billion items across machines". This is an inference rather than a study, but it follows directly from the research above: templates are recognition-level knowledge.

**What to do:** for every pattern, be able to explain *why* each step works (the invariant), and practise changing one constraint. For design and ML rounds, practise saying your answer out loud, not just reading model answers.

## 5. Practising alone when the test is social

The observed-whiteboard study (Behroozi and colleagues, 2020) found being watched roughly halved performance. Solo practice never trains that. See [Your biases while interviewing](/learn/your-biases).

**What to do:** schedule mock interviews with a person or with the portal's AI interviewer, and talk out loud even when practising alone. Start mocks earlier than feels comfortable: the discomfort is the training.

## 6. Learning from survivors

Posts like "I cracked Google after 300 LeetCode problems in 3 months" come from people who passed *and chose to write*. Many people followed similar plans and failed; they rarely post. Add the fact that even strong candidates fail single rounds up to about 22% of the time, and any one success story says very little about the method (an inference from survivorship bias and the interviewing.io variance data; no study measures it in interview posts). People also "see patterns in random sequences" (Gilovich 1991, cited in Dana and colleagues 2013).

**What to do:** read experience posts for *facts* (round structure, question style, what changed recently), never as proof that a plan works. Prefer aggregated sources (company prep pages, data posts) and the research summaries in this Craft area, which label evidence strength.

## 7. Plans that always slip (the planning fallacy)

Buehler, Griffin and Ross (1994) showed people underestimate how long tasks take even when they remember similar tasks overrunning (strong). Prep plans slip because of work deadlines, illness, a hard topic, or interview dates arriving early.

**What to do:** plan with **your own past data** ("last time, 50 problems took me five weeks"), a technique called reference-class forecasting, and add a 1.5–2× buffer. Book interviews in an order that lets you start with lower-stakes companies (see [Running many processes at once](/learn/parallel-processes)).

## A study week that respects the research

| Day | Session (60–90 minutes) |
|---|---|
| Mon | 20 min: re-solve 3 old problems from blank · 50 min: new technique, a few problems in a block |
| Tue | Mixed set: 3 problems from different topics, timed, talking aloud |
| Wed | Design: one question out loud, then compare with the model answer · 15 min: revise sheets |
| Thu | Re-solve Monday's problems from blank · 1 new mixed problem |
| Fri | Mock interview (coding or design) with a person or the AI interviewer |
| Sat | Behavioural: tell two stories out loud and record them · review list |
| Sun | Rest, or a light 30-minute review |

## The fluency check

After each session, close everything and write the key idea of each problem from memory in one or two lines. If you can't, you have not learned it yet; put it back on the review list for tomorrow.

--- revise
### Retrieval and spacing
? Roediger & Karpicke (2006) result? :: After a week, self-testing 61% vs re-studying 40% recalled, though re-studiers felt more confident.
? Recognition vs recall? :: Recognition: "I've seen this". Recall: producing it from a blank page; interviews need recall plus adaptation.
? What review gaps does the page suggest? :: Re-solve from blank after about 3, 7 and 21 days.
? What did Cepeda et al. (2006) show? :: Spaced practice beats massed practice across 317 experiments; longer retention needs longer gaps.

### Interleaving and patterns
? Rohrer et al. (2014) classroom result? :: Mixed practice 72% vs blocked 38% a month later.
? Why does blocked practice mislead? :: The list tells you the tool, so you never practise recognising which tool applies.
? When is blocked practice fine? :: First exposure to a brand-new technique.
? How do you avoid overfitting to templates? :: Explain why each step works and practise changing one constraint.

### Plans and stories
? Why are success-story posts weak evidence? :: Survivorship bias: failures with the same plan rarely post, and single rounds are noisy.
? What is the planning fallacy? :: Underestimating time even after past overruns (Buehler 1994).
? Fix for the planning fallacy? :: Plan from your own past data and add a 1.5–2× buffer.
? What is the fluency check? :: After a session, write each key idea from memory; if you can't, review it tomorrow.

--- notes
## Retrieval
Testing effect: 61% vs 40% after a week (Roediger & Karpicke 2006); re-studiers felt more confident.
Retrieval beats concept maps (Karpicke & Blunt 2011). Illusion of competence (Koriat & Bjork 2005).
Close the solution, re-solve from blank; again at ~3, 7, 21 days.
## Spacing
317 experiments (Cepeda 2006): spread > cram. Review list with come-back dates; old before new.
## Interleaving
Mixed 72% vs blocked 38% (Rohrer 2014, d ≈ 1.05). Learners still prefer blocked (Kornell & Bjork 2008).
Block for first exposure, then mix. Mocks and random sets interleave by nature.
## Overfitting
Templates = recognition. Know each step's why; vary one constraint (stream, O(1) memory, distributed).
## Social practice
Observed ≈ half performance (Behroozi 2020): mock with people early; talk aloud solo too.
## Survivors and plans
Experience posts: facts only, not proof of method. Planning fallacy (Buehler 1994): own past data + 1.5–2× buffer.
Fluency check after every session.

--- doubts
Q: Isn't solving 500 problems the surest way?
A: Volume helps only if it includes retrieval, spacing and mixing. Two hundred problems re-solved from blank and practised in mixed, timed sessions usually beat five hundred read-and-forgotten ones. Count problems you can solve cold a week later, not problems touched.

Q: Watching solution videos feels like I learn a lot. Should I stop?
A: Keep them for first exposure and for the "why", then always close the video and re-solve from a blank editor. The feeling of learning while watching is exactly the illusion of competence the research describes.

Q: How many mock interviews are enough?
A: There is no study-backed number. A practical rule from this research: start mocks early (once you have core patterns), do them weekly, and increase to two or three a week in the final month, mixing coding, design and behavioural. Stop when your mock scores are consistently at the bar for your level.

--- exercises
[fix] Your plan: "Week 1: arrays, week 2: trees, week 3: graphs, week 4: DP, week 5: interviews start." Rewrite it using the research.
A: Keep short blocks for first exposure but interleave from week 2: each session starts with re-solving older problems from blank, includes at least one mixed timed problem, and the review list schedules returns at ~3/7/21 days. Add weekly mocks from week 2 or 3, not week 5. Add a buffer week (planning fallacy), and book lower-stakes interviews first.

[plan] You have 10 problems you "know" from last month. Design a 45-minute check of whether you really know them.
A: Pick five at random, hide the solutions, give yourself eight minutes each to write the approach, complexity and key code from a blank page, talking aloud. Any you can't do go on tomorrow's review list; the ones you can do get a new date three weeks out.

[choose] Two prep plans: (A) watch 3 hours of solution videos daily; (B) 1 hour solving cold + 30 minutes re-solving old problems + one weekly mock. Which is better and why?
A: B. It uses retrieval (solving cold), spacing (re-solving old problems) and practice under observation (mocks). A is recognition practice that feels productive but transfers poorly.

--- pitfalls
- Re-reading or re-watching solutions instead of re-solving from blank
- Finishing topic lists in order and never mixing
- Counting problems touched instead of problems you can solve cold
- Delaying mock interviews until you "feel ready"
- Treating one success story as a proven plan
- Planning without a buffer

--- quiz
Q: Students in Roediger & Karpicke (2006) who re-studied instead of self-testing…
- Remembered more after a week
- *Remembered less after a week but felt more confident
- Remembered the same
- Gave up
W: Fluency feels like learning; retrieval produces it.

Q: Why does interleaving help so much for interviews?
- It is faster
- *It trains recognising which tool applies, which blocked lists give away
- It avoids hard problems
- It replaces mocks
W: Interviews never label the pattern.

Q: A friend cleared Google with plan X. The strongest reason not to copy it blindly?
- Google changes questions daily
- *Survivorship bias: many followed similar plans and failed, and single rounds are noisy
- Their plan was too short
- Friends exaggerate
W: Success stories are a filtered sample.

--- sources
- paper :: Test-enhanced learning: taking memory tests improves long-term retention (Psychological Science 2006) :: Roediger & Karpicke :: https://psychology.ecu.edu/wp-content/pv-uploads/sites/216/2019/03/Roediger-Karpicke-2006.pdf
- paper :: Distributed practice in verbal recall tasks: a review and quantitative synthesis (2006) :: Cepeda, Pashler, Vul, Wixted & Rohrer :: https://www.yorku.ca/ncepeda/publications/PRC2006.pdf
- paper :: The benefit of interleaved mathematics practice is not limited to superficially similar kinds of problems (2014) :: Rohrer, Dedrick & Burgess :: https://link.springer.com/article/10.3758/s13423-014-0588-3
- paper :: Learning concepts and categories: is spacing the "enemy of induction"? (Psychological Science 2008) :: Kornell & Bjork :: https://doi.org/10.1111/j.1467-9280.2008.02127.x
- paper :: Exploring the "planning fallacy" (JPSP 1994) :: Buehler, Griffin & Ross :: https://doi.org/10.1037/0022-3514.67.3.366

=== offer-biases
blurb: The mental tilts that distort offer decisions and negotiation: anchoring on the first number, loss aversion and the pull of your current job, brand and prestige, big joining bonuses that hide weak later years, and sunk cost from a long process. A written scorecard and a four-year view counter most of them.
signals: The recruiter asks "what are your expectations?" | You are comparing a famous brand with a better-paying offer | A big joining bonus makes one offer look best | Your current employer makes a counter-offer
widgets: offer-compare
prereq: offer-anatomy

--- lesson
:::words
- **Anchoring**: the first number mentioned pulls later estimates and agreements toward it.
- **BATNA**: "best alternative to a negotiated agreement": what you will do if this deal fails (your other offer, or staying in your current job).
- **Loss aversion**: losses feel roughly twice as strong as gains of the same size.
- **Endowment effect**: valuing something more just because you already have it (such as your current job).
- **Focusing illusion**: over-weighting whichever feature you are paying attention to (such as a famous brand).
- **Present bias**: valuing money now much more than money later, more than simple interest would justify.
- **CTC (cost to company)**: the Indian way of quoting a package; it adds up everything the employer might spend on you in a year, including things you never receive as cash. See [Reading an offer](/learn/offer-anatomy).
- **Vesting**: stock grants become yours gradually over years; **front-loaded** vesting gives more early, **back-loaded** more later.
:::

## The problem in plain words

An offer decision is one of the largest financial decisions most engineers make, and it is made fast, under emotion, with numbers presented in confusing formats. Behavioural economics has mapped the exact ways people go wrong in such decisions. Most of these biases are well established; a few are debated.

:::eli5
Two shops sell the same phone. One says "MRP ₹1,00,000, today ₹80,000!", the other just says ₹75,000. Many people feel the first is the better deal because the big crossed-out number anchored them. Offers work the same way: the first number and the way the package is presented change how good it feels.
:::

## 1. Anchoring on the first number

Tversky and Kahneman (1974) showed that even arbitrary numbers bias later estimates (strong). In negotiation, Galinsky and Mussweiler (2001) found that whoever made the first offer tended to get a better outcome, because the first offer anchors the discussion (strong). Their key finding for you: the anchoring effect was *neutralised* when the person receiving the first offer focused on their own alternatives (BATNA), their own target, or the other side's limits.

Aggressive anchors can backfire: a 2012 study found extreme first offers won on price but cost the relationship and the other side's satisfaction (moderate).

**What to do:**
- Collect market data *before* the recruiter call: levels.fyi for your level and city, peers, any competing offers.
- When a number is put in front of you, consciously switch your attention to your alternatives and your target before reacting.
- If you have good data, you can name a number first; make it ambitious but justifiable. If you don't, it is fine to deflect early salary questions (see [The recruiter call](/learn/recruiter-call)).
- In India, the "expected CTC" question often arrives in the first call and is anchored to your *current* CTC with a percentage hike. Anchoring on your current pay is the single most common way Indian engineers underprice themselves when moving to a much higher-paying company.

## 2. Loss aversion and the pull of the current job

Kahneman and Tversky's prospect theory (1979) found losses weigh about twice as much as equal gains; the mug experiments (1990) found owners demanded about twice what buyers would pay (strong, though Gal and Rucker 2018 argue many such effects are really inertia: contested). In job decisions this shows up as overvaluing what you would "lose" by leaving: the known team, an unvested stock tranche, a familiar commute.

**What to do:** score your current job as if it were a *third outside offer* on the same written scorecard. Ask: "If I were unemployed today, which of these would I pick?"

## 3. Brand and prestige (the focusing illusion)

Schkade and Kahneman (1998) found people expected Californians to be happier because of the weather, but reported life satisfaction did not differ: whatever we focus on looms larger than it really is (moderate to strong). A famous logo is an easy feature to focus on.

**What to do:** score team, manager, project, level, growth and compensation **separately** from the brand. Brand has real value (resume signal, alumni network), so give it its own line, not a hidden thumb on every line.

## 4. Present bias and the big joining bonus

Laibson (1997) formalised how people overweight immediate rewards (strong). A large joining bonus feels much bigger than an equal amount of stock spread over four years.

Real packages differ a lot in shape. Amazon has historically back-loaded stock vesting (5% / 15% / 40% / 40% over four years) and filled the early years with cash bonuses; other companies vest evenly (25% a year) or front-load. Joining bonuses in India often come with a clawback: leave within a year and you repay part or all of it. Year one can look excellent while year three or four drops (a "cliff" in total pay). Always compare **four-year totals, year by year**.

[[widget:offer-compare]]

**What to do:** write down each year's cash, bonus and stock separately for four years, then compare the four-year total and the *lowest* year. For private-company stock (startup ESOPs), discount heavily for risk and for the fact you may not be able to sell it.

## 5. Sunk cost in the process

"I did six rounds for this, I can't say no now" is the sunk-cost effect (Arkes and Blumer 1985). The rounds are spent whatever you decide. The only question is which option is best from today.

## 6. Framing rejection as loss

Prospect theory also predicts people decline good outcomes to avoid a perceived loss: "If I accept B, I've lost A." Accepting a better offer from B is not losing A; you had no offer from A.

## The scorecard (a single habit that counters most of these)

| Factor | Weight | Offer A | Offer B | Current job |
|---|---|---|---|---|
| Four-year total pay (and lowest year) | | | | |
| Level and title | | | | |
| Team and manager | | | | |
| Project and learning | | | | |
| Growth and promotion path | | | | |
| Brand (own line) | | | | |
| Location, hybrid rules, notice period | | | | |
| Risk (company stage, layoffs, visa) | | | | |

Fill weights *before* you look at the offers, then score each option. Sleep on it. If your gut disagrees with the scorecard, ask what factor your gut is weighting that the table misses; sometimes that is real information.

## Counter-offers from your current employer

When you resign, your current employer may match. Loss aversion makes counter-offers very tempting. Ask *why* you started looking: if the reasons were growth, team or project, money rarely fixes them. Score the counter-offer on the same table. More on offer-stage norms in [India offer-stage norms](/learn/india-offer-norms).

--- revise
### Anchoring
? What is anchoring? :: The first number pulls later estimates and agreements toward it.
? What neutralised the first-offer anchor in Galinsky & Mussweiler (2001)? :: Focusing on your own alternatives (BATNA), your target, or the other side's limits.
? The most common Indian anchoring mistake? :: Pricing yourself as a percentage hike on current CTC when moving to a much higher-paying company.
? Risk of an extreme first offer? :: It can cost the relationship and the other side's satisfaction.

### Loss, brand and time
? How do you counter loss aversion about your current job? :: Score it as a third outside offer on the same scorecard.
? What is the focusing illusion in offers? :: Over-weighting the brand; give brand its own line instead.
? Why can a joining bonus mislead? :: Present bias: cash now feels bigger than equal stock later; compare four-year totals year by year.
? What is a pay cliff? :: A drop in total pay in a later year when bonuses end or vesting is back-loaded.
? How should startup stock be valued in a comparison? :: Discount heavily for risk and illiquidity.

### Process
? "I did six rounds, I can't refuse" is which bias? :: Sunk cost.
? First question to ask about a counter-offer? :: Why did I start looking, and does money fix that?

--- notes
## Anchoring
Arbitrary numbers bias estimates (Tversky & Kahneman 1974). First offers anchor outcomes (Galinsky & Mussweiler 2001).
Neutraliser: focus on BATNA, your target, their limits. Extreme anchors can backfire.
India: "expected CTC" anchored on current CTC + hike; get levels.fyi data first.
## Loss aversion / endowment
Losses ≈ 2× gains (1979); mugs ≈ 2× (1990); contested as inertia (Gal & Rucker 2018).
Current job = third outside offer on the scorecard.
## Focusing illusion
Weather and happiness (Schkade & Kahneman 1998). Brand on its own line.
## Present bias
Laibson 1997. Joining bonus + clawback; back-loaded vesting (Amazon 5/15/40/40 historically).
Compare four-year totals, year by year, and the lowest year. Discount private stock.
## Process
Sunk cost of rounds. Accepting B ≠ losing A.
## Scorecard
Weights first, then scores. Pay, level, team, project, growth, brand, location/notice, risk. Sleep on it.

--- doubts
Q: Should I always make the first offer then?
A: Only when you have solid data. With data, a well-justified first number anchors in your favour. Without data, you risk anchoring yourself low; it is better to ask for their range or say you are focused on fit for now and will discuss numbers once you know the level.

Q: The recruiter insists on my current CTC. Can I refuse?
A: In India the question is common and many companies ask for payslips later. You can share it while separating it from your expectation: "My current CTC is X; for this level, based on market data, I'm looking at Y." The anchor you want is market data for the new level, not your old pay.

Q: Isn't brand worth a lot for my career?
A: It can be, especially early. That is why it gets its own line with an honest weight. The bias is letting it silently inflate every other line (assuming the team, project and growth must be good because the logo is famous).

--- exercises
[estimate] Offer A: ₹40 L base, ₹10 L joining bonus (clawback if you leave in 12 months), ₹60 L stock vesting 5/15/40/40 over 4 years. Offer B: ₹44 L base, no bonus, ₹48 L stock vesting 25% a year. Ignoring raises and stock price changes, compare year 1 and the four-year total.
A: A, year 1: 40 + 10 + 3 = ₹53 L; four years: 160 + 10 + 60 = ₹230 L. B, year 1: 44 + 12 = ₹56 L; four years: 176 + 48 = ₹224 L. A wins the four-year total by ₹6 L, but its year 2 is only 40 + 9 = ₹49 L versus B's ₹56 L (unless A pays a year-2 cash bonus, as Amazon historically did). The shape matters as much as the total.

[say] The recruiter asks for your expected CTC in the first call. You have no competing offer yet. Write your reply.
A: Suggested wording (not from a source): "I'd like to understand the level and the role first. Once we've confirmed the level, I'm happy to discuss numbers; I expect to be in line with the market for that level in Bengaluru." If pressed, give a researched range for the *new* level, not a hike on current pay.

[plan] Build your weighted scorecard for choosing between a famous brand and a smaller company paying 30% more.
A: Set weights before looking: e.g. pay 25, level 10, team/manager 20, project/learning 20, growth 10, brand 5, location/notice 5, risk 5. Score each 1–5 with written reasons. If brand wins only through its own 5-point line, the higher pay probably dominates; if the famous company's team and project score higher, that is real.

--- pitfalls
- Reacting to the recruiter's first number without your own data
- Anchoring expectations on current CTC plus a hike
- Comparing year-one totals instead of four-year, year-by-year pay
- Letting brand inflate every factor
- Accepting a counter-offer without asking why you started looking
- Accepting a weak offer because the process was long

--- quiz
Q: Galinsky & Mussweiler (2001) found the first-offer anchor was neutralised when the receiver…
- Ignored the offer
- *Focused on their own alternatives, target or the other side's limits
- Made a counter-offer at once
- Asked for time
W: Attention to your BATNA and target counters the pull of their number.

Q: Back-loaded stock vesting with a big year-one bonus can make an offer look…
- Worse in year one than it is
- *Better in year one than in later years
- Identical every year
- Illegal
W: Compare each year and the four-year total.

Q: Which is the best way to counter loss aversion about your current job?
- Never consider counter-offers
- *Score the current job as a third outside offer on the same scorecard
- Leave without comparing
- Ask friends
W: Same yardstick, fresh choice.

--- sources
- paper :: First offers as anchors: the role of perspective-taking and negotiator focus (JPSP 2001) :: Galinsky & Mussweiler :: https://www.kellogg.northwestern.edu/faculty/research/detail/2001/first-offers-as-anchors-the-role-of-perspective-taking
- paper :: Judgment under uncertainty: heuristics and biases (Science 1974) :: Tversky & Kahneman :: https://doi.org/10.1126/science.185.4157.1124
- paper :: Prospect theory: an analysis of decision under risk (Econometrica 1979) :: Kahneman & Tversky :: https://doi.org/10.2307/1914185
- paper :: Does living in California make people happy? A focusing illusion (Psychological Science 1998) :: Schkade & Kahneman :: https://doi.org/10.1111/1467-9280.00066
- paper :: Golden eggs and hyperbolic discounting (QJE 1997) :: Laibson :: https://doi.org/10.1162/003355397555253
- article :: When to make the first offer in negotiations :: HBS Working Knowledge :: https://hbswk.hbs.edu/archive/when-to-make-the-first-offer-in-negotiations
