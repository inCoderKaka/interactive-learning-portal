=== chain-of-thought
blurb: Getting models to reason by spending more computation at answer time: chain-of-thought prompting and why it helps, self-consistency voting, best-of-N with verifiers, tree search, and the test-time compute trade-off between thinking longer and using a bigger model.
signals: "Why does 'think step by step' help?" | "How do reasoning models like o1 or Gemini Thinking differ?" | "Self-consistency vs best-of-N?" | Latency and cost of reasoning in system design
widgets: self-consistency
prereq: sft-chat

--- lesson
:::words
- **Chain of thought (CoT)**: the model writes intermediate reasoning steps before the final answer.
- **Test-time compute**: computation spent when answering (more tokens, more samples), as opposed to during training.
- **Self-consistency**: sample several reasoning chains and take the most common final answer.
- **Best-of-N**: generate N answers and pick the one a scorer (verifier or reward model) rates highest.
- **Verifier**: a model or program that checks or scores an answer.
- **Reasoning model**: an LLM trained to produce long internal reasoning before answering.
:::

## The problem in plain words

A transformer does a fixed amount of computation per generated token. A hard problem (a maths proof, a tricky bug) may need more computation than one token's worth. Letting the model **write out its reasoning** gives it more tokens, and therefore more computation, plus a scratchpad to store intermediate results. Going further, you can sample many attempts and pick the best, or train the model to reason at length. These ideas power "thinking" models and change how you budget latency and cost.

:::eli5
Ask someone to multiply 47 × 38 in their head instantly and they may guess wrong. Give them paper and let them write the steps, and they get it right. Ask five people and take the most common answer, and you're even safer.
:::

## Chain-of-thought prompting

Wei et al. (Google, 2022) showed that few-shot examples with worked reasoning, or simply "Let's think step by step" (Kojima et al.), dramatically improve large models on arithmetic, commonsense and symbolic tasks. Why it helps:

- **More computation**: each written step is another forward pass that can build on the last.
- **Working memory**: intermediate results are stored in the context rather than squeezed into hidden states.
- **Decomposition**: the model solves easier sub-problems it has seen patterns for.

It mainly helps sufficiently capable models and multi-step problems; for simple lookups it adds latency without gains. Written reasoning isn't guaranteed to reflect the model's actual internal process (**faithfulness** is an open question).

## Sampling more: self-consistency and best-of-N

- **Self-consistency** (Wang et al., Google, 2022): sample $k$ chains at temperature > 0, extract each final answer, **majority vote**. Large gains on maths; no extra model needed; works when answers can be compared exactly.
- **Best-of-N with a verifier**: score candidates with a reward model, an outcome verifier (run the unit tests, check the maths answer), or an LLM judge, and return the best. A good verifier beats voting; a bad one gets gamed.
- **Process reward models** (PRMs): score each reasoning step, not just the final answer, to guide search (next page).
- **Tree search**: explore multiple partial reasoning paths, expand promising ones (tree of thoughts, beam search over steps guided by a PRM, MCTS-style search).

Try majority voting below: as the number of samples grows, accuracy rises when each sample is right more often than any single wrong answer:

[[widget:self-consistency]]

## Test-time compute scaling

Accuracy improves roughly log-linearly with test-time compute (more samples, longer reasoning) on reasoning tasks, up to a limit. Snell et al. (2024) found that, matched for total compute, a smaller model with well-allocated test-time computation can beat a model 14× larger on problems of moderate difficulty, while the hardest problems still need a stronger base model. The decision becomes an engineering trade-off:

| Lever | Cost | Helps |
|---|---|---|
| Bigger model | Higher cost per token, always | Knowledge, breadth, hardest problems |
| CoT / longer thinking | More output tokens (latency) | Multi-step problems |
| Self-consistency (k samples) | k× tokens (parallel: same latency) | Problems with checkable answers |
| Verifier + best-of-N | k× tokens + verification | Code (tests), maths |

**Adaptive** allocation (think briefly on easy queries, longer on hard ones; route by difficulty) gets most of the benefit at lower average cost.

## Reasoning models

Models such as OpenAI's o-series, Gemini "Thinking" models, Claude's extended thinking and DeepSeek-R1 are trained (with reinforcement learning on verifiable problems: next page) to produce long reasoning before answering: exploring, checking, backtracking ("wait, that's wrong…"). Properties:

- Much better on maths, coding, science and planning benchmarks.
- Many more output tokens (thousands per hard question): higher latency and cost; often configurable "thinking budgets".
- Reasoning may be summarised or hidden from users.
- Less gain on simple factual or creative tasks; can overthink easy questions.

## In system design

Use reasoning when tasks are multi-step and correctness matters (code changes, data analysis, planning tool calls); route easy queries to fast non-reasoning models; cap thinking budgets; verify outputs where possible (tests, schemas); stream progress to users to hide latency.

## Interview angles

- "Why does CoT help?" More computation per answer and a scratchpad for intermediate results; decomposition.
- "Self-consistency vs best-of-N?" Majority vote over sampled answers (no scorer needed) vs pick the highest-scoring with a verifier.
- "When would you use a reasoning model?" Hard, verifiable, multi-step tasks; not for low-latency simple lookups; budget and route adaptively.

--- revise
### CoT
? Why does chain of thought help? :: More forward passes (computation), a scratchpad for intermediate results, decomposition into easier steps.
? Zero-shot CoT trigger? :: "Let's think step by step."
? Is written reasoning always faithful? :: No: it may not reflect the model's internal process.

### More samples
? Self-consistency? :: Sample k reasoning chains, majority-vote the final answers.
? Best-of-N? :: Generate N, return the one a verifier/reward model scores highest.
? Process reward model? :: Scores each reasoning step, guiding search.

### Test-time compute
? How does accuracy scale with test-time compute? :: Roughly log-linearly, up to a limit.
? Snell et al. finding? :: Optimally allocated test-time compute can let a smaller model beat a 14× larger one on moderate problems.
? Adaptive allocation? :: Spend more thinking on hard queries, little on easy ones.

### Reasoning models
? How are reasoning models trained? :: RL on verifiable problems to produce long reasoning before answering.
? Trade-offs? :: Better on hard multi-step tasks; more tokens, latency and cost; can overthink easy tasks.

--- notes
## CoT
Few-shot worked examples (Wei 2022) or "Let's think step by step" (Kojima). Helps large models on multi-step tasks.
Why: more compute per answer, scratchpad memory, decomposition. Faithfulness not guaranteed.
## Sampling
Self-consistency: k chains, majority vote (Wang 2022). Best-of-N + verifier (RM, tests, judge). PRM step scores. Tree search (ToT, PRM-guided beam, MCTS).
## Test-time scaling
Accuracy ~ log(test-time compute). Small model + good TTC beats 14× larger on moderate problems (Snell 2024); hardest need stronger base.
Levers: bigger model, longer thinking, k samples (parallel), verifier. Adaptive routing by difficulty.
## Reasoning models
o-series, Gemini Thinking, Claude extended thinking, DeepSeek-R1: RL-trained long reasoning, self-checking, backtracking.
Thinking budgets; hidden/summarised reasoning; overthinking easy tasks.
## Design
Use for hard verifiable tasks; route easy queries to fast models; cap budgets; verify; stream.

--- doubts
Q: Does self-consistency help on open-ended questions like essays?
A: Not directly: majority voting needs answers that can be compared for equality (a number, a choice). For open-ended outputs, use best-of-N with a judge or reward model, or a "universal self-consistency" variant where a model picks the most consistent response.

Q: If reasoning models are better, why not use them for everything?
A: They're slower and costlier (thousands of hidden tokens), and on simple tasks they gain little or even get worse by overthinking. Routing simple requests to fast models and hard ones to reasoning models gives better quality per dollar.

Q: Is the visible reasoning what the model "really" thinks?
A: Not necessarily. Studies find cases where models reach answers for reasons not stated in their chain of thought. It's useful for debugging and often correlates with the computation, but shouldn't be treated as a faithful explanation without verification.

--- exercises
[estimate] A model answers a maths question correctly 55% of the time; wrong answers are spread over many different values (none more than 10% likely). Roughly what accuracy does majority voting over 15 samples give?
A: With the correct answer at 55% and each wrong answer at most 10%, the correct answer is very likely the plurality: the probability it gets fewer votes than the strongest wrong answer is small. Accuracy would be well above 90% (simulation gives ~98%+). If one wrong answer were 45% likely, voting would help far less.

[design] Design how a coding assistant should use test-time compute for "fix this failing test" requests.
A: Generate k candidate patches in parallel (temperature ~0.8), run the failing test and the related test suite in a sandbox for each, discard failures, and among passing patches pick by a reward model/LLM judge for minimality and style. If none pass, feed the error output back for another round (up to a budget). Use a reasoning model only for complex failures (routing by initial attempt failure). Report latency and cost per fixed test.

[choose] A customer-support bot answers 100k questions a day; 85% are simple policy lookups, 15% need multi-step troubleshooting. Use a reasoning model for all, none, or route?
A: Route: a fast model with retrieval handles simple lookups; a classifier (or the fast model's own uncertainty) escalates multi-step cases to a reasoning model with a capped thinking budget. That keeps median latency low and cost manageable while improving hard cases. Monitor misrouting with evaluations on both segments.

--- pitfalls
- Using chain of thought for simple lookups where it only adds latency
- Majority voting on answers that can't be compared exactly
- Best-of-N with a weak, gameable verifier
- Treating visible reasoning as a faithful explanation
- Reasoning models everywhere without routing or budgets

--- quiz
Q: Self-consistency selects the final answer by?
- The longest chain
- *Majority vote over answers from several sampled chains
- A reward model's score
- The first sample
W: It needs no extra scorer.

Q: Why does writing intermediate steps help a transformer?
- It reduces tokens
- *Each step adds computation and stores intermediate results in the context
- It changes the weights
- It lowers temperature
W: Computation per token is fixed; more tokens means more computation.

Q: What does best-of-N require that self-consistency doesn't?
- Sampling
- *A verifier or scorer to rank candidates
- A reasoning model
- Temperature 0
W: Self-consistency uses voting instead.

Q: A good use of a reasoning model is?
- Autocompleting search queries at 50 ms
- *Solving multi-step coding problems whose output can be tested
- Classifying spam at high volume
- Translating short phrases
W: Hard, verifiable, multi-step tasks benefit most.

--- sources
- paper :: Chain-of-Thought Prompting Elicits Reasoning in Large Language Models :: Wei et al., Google (2022) :: https://arxiv.org/abs/2201.11903
- paper :: Self-Consistency Improves Chain of Thought Reasoning in Language Models :: Wang et al., Google (2022) :: https://arxiv.org/abs/2203.11171
- paper :: Scaling LLM Test-Time Compute Optimally Can Be More Effective than Scaling Model Parameters :: Snell et al., Google DeepMind (2024) :: https://arxiv.org/abs/2408.03314
- article :: Learning to Reason with LLMs :: OpenAI (2024) :: https://openai.com/index/learning-to-reason-with-llms/

=== reasoning-rl
blurb: How reasoning models are trained: reinforcement learning with verifiable rewards on maths and code, policy-gradient basics, GRPO's group-relative advantages, outcome versus process reward models, rejection-sampling fine-tuning, distillation of reasoning, and the failure modes of RL on language models.
signals: "How was DeepSeek-R1 trained?" | "Explain GRPO" | "Outcome vs process rewards?" | "How would you train a model to be better at maths or coding?"
widgets: grpo-group
prereq: chain-of-thought, rlhf-ppo

--- lesson
:::words
- **Verifiable reward**: a reward computed by a program, such as "the final answer matches" or "the unit tests pass".
- **Policy gradient**: an RL method that raises the probability of actions in proportion to how much better than expected they turned out.
- **Advantage**: how much better an action (or response) did than a baseline expectation.
- **GRPO** (group relative policy optimisation): a policy-gradient method that uses the average reward of a group of samples for the same prompt as the baseline.
- **Outcome reward model (ORM)**: scores only the final answer. **Process reward model (PRM)**: scores each reasoning step.
- **Rejection sampling fine-tuning**: generate many solutions, keep the correct ones, fine-tune on them.
:::

## The problem in plain words

Humans can't write thousands of perfect long reasoning chains, and preference labels are expensive. But for maths and code, correctness can be **checked by a program**. So let the model try many problems, reward it when the answer is right, and use reinforcement learning to make the reasoning that led to right answers more likely. Run this at scale and models learn to reason at length, check their work and backtrack, behaviours nobody demonstrated explicitly. This is the recipe behind DeepSeek-R1 and, in broad strokes, other reasoning models.

:::eli5
A student does thousands of practice problems with an answer key. They're not told *how* to solve each, only whether their final answer was right. Over time, the habits that tend to lead to right answers (checking work, trying another approach when stuck) get reinforced, and the student gets much better at problems they've never seen.
:::

## Policy gradient basics

Treat a full response $y$ to prompt $x$ as an action from policy $\pi_\theta$. REINFORCE maximises expected reward with the gradient

$$\nabla_\theta J = \mathbb{E}\big[(R(x, y) - b(x))\,\nabla_\theta\log\pi_\theta(y \mid x)\big]$$

where $b(x)$ is a **baseline** (expected reward) that reduces variance without biasing the gradient. Responses better than the baseline get their token probabilities raised; worse ones lowered. PPO adds a learned value-function baseline and clipped updates (rlhf-ppo page).

## GRPO

DeepSeek's **GRPO** drops the value model: for each prompt, sample a **group** of $G$ responses (e.g. 8–64), score each, and use the group statistics as the baseline:

$$A_i = \frac{r_i - \text{mean}(r_1, \dots, r_G)}{\text{std}(r_1, \dots, r_G)}$$

Every token in response $i$ gets advantage $A_i$, inside a PPO-style clipped objective with a KL penalty to a reference model. Benefits: no critic network (less memory, simpler), and the baseline is exactly "how well this model typically does on *this* prompt". If all samples are right (or all wrong), advantages are zero: no signal, so training focuses on problems at the edge of the model's ability. Sample a group below and see which responses get pushed up or down:

[[widget:grpo-group]]

## Rewards

- **Verifiable outcome rewards**: exact-match final answers (maths, with normalisation), unit tests (code), format checks (answer inside the expected tags), compiler success, proof checkers (Lean).
- **Outcome reward models** (learned): for tasks without exact checks.
- **Process reward models**: score each step's correctness (trained on step-level labels like PRM800K, or estimated by rolling out from each step and checking how often it leads to correct answers). Useful for guiding search and catching "right answer, wrong reasoning", but hard to label and easy to hack when used as an RL reward. DeepSeek-R1 used rule-based outcome rewards only.

## The R1 recipe (simplified)

1. **R1-Zero**: pure RL with GRPO from a base model, rewards for correct answers and format. Reasoning length grew on its own, with self-verification and reflection ("aha moments"), but output was messy (mixed languages, poor readability).
2. **R1**: a small **cold-start SFT** on curated long-reasoning examples for readability → large-scale RL on reasoning tasks → **rejection sampling** to build a large SFT set (correct, readable reasoning from the RL model plus general data) → another SFT → final RL including helpfulness/harmlessness preferences.
3. **Distillation**: fine-tuning smaller models on R1's reasoning traces gave strong small reasoners, often better than running RL on the small models directly.

## Related methods

- **STaR / rejection-sampling fine-tuning (RFT)**: sample solutions, keep the correct ones (optionally rationalise failures with the answer as a hint), SFT, repeat. A simple, offline form of "RL with verifiable rewards".
- **Expert iteration**: alternate search (find good solutions) and imitation.
- **Self-play and generated curricula**: models propose problems at the right difficulty.

## Failure modes

- **Reward hacking**: exploiting checker weaknesses (printing the expected output, special-casing tests, formatting tricks to pass a regex). Harden verifiers; hold out tests.
- **Entropy collapse**: the policy becomes deterministic early, stops exploring; tune temperature, KL, entropy bonuses.
- **Length explosion**: reasoning grows without accuracy gains; length penalties or budgets.
- **Narrowness**: RL on maths/code can hurt other skills; mix tasks and keep SFT stages.
- **Zero-variance groups**: too easy or too hard prompts give no gradient; filter prompts by difficulty.

## Interview angles

- "Train a model to get better at maths." Collect problems with verifiable answers, SFT warm start, GRPO/PPO with outcome rewards and a KL penalty, difficulty filtering, rejection sampling to distil, evaluate on held-out competition sets with contamination checks.
- "GRPO vs PPO?" Group-mean baseline instead of a learned critic: less memory, simpler, prompt-specific baseline.
- "ORM vs PRM?" Final-answer vs per-step scoring: PRMs give denser signal and better search guidance but are costly and hackable.

--- revise
### Basics
? Verifiable reward examples? :: Exact final answers, unit tests, compilers, proof checkers, format checks.
? Policy-gradient update direction? :: Raise log-probs of responses scoring above the baseline, lower those below.
? Why a baseline? :: Reduces variance without biasing the gradient.

### GRPO
? GRPO advantage? :: (r_i − mean of group)/std of group, applied to every token of response i.
? What GRPO removes compared with PPO? :: The learned value (critic) model.
? When does a group give no signal? :: All responses equally right or wrong (zero variance).

### Rewards
? ORM vs PRM? :: Score the final answer vs each reasoning step.
? PRM downside as an RL reward? :: Costly labels and easy to hack.
? Rejection-sampling fine-tuning? :: Keep correct sampled solutions and SFT on them; repeat (STaR).

### R1 and failures
? R1-Zero? :: Pure RL from a base model with rule-based rewards; reasoning emerged but readability was poor.
? R1 pipeline? :: Cold-start SFT → reasoning RL → rejection-sampled SFT → final RL with preferences.
? Distillation result? :: Small models fine-tuned on R1 traces reason well, often better than RL on them directly.
? RL failure modes? :: Reward hacking, entropy collapse, length explosion, narrowness, zero-variance prompts.

--- notes
## Policy gradient
∇J = E[(R − b)∇ log π(y|x)]. Baseline b reduces variance. PPO: critic + clipping.
## GRPO (DeepSeek)
G samples per prompt; Aᵢ = (rᵢ − mean)/std; same Aᵢ for all tokens; clipped ratio + KL to ref. No critic.
All-same group → no gradient → filter difficulty.
## Rewards
Rule-based: answer match, unit tests, format tags, compilers, Lean. Learned ORM. PRM (PRM800K; rollout-estimated) for search; hackable as RL reward.
## R1
R1-Zero: GRPO from base, answer + format rewards → long reasoning, reflection; messy language.
R1: cold-start SFT → RL → rejection sampling SFT (+ general) → RL with preferences. Distil to small models.
## Related
STaR/RFT, expert iteration, self-play curricula.
## Failures
Hacking checkers (harden, hold out tests) · entropy collapse (temperature, KL, entropy bonus) · length explosion (penalties) · narrowness (mix tasks) · zero-variance prompts.

--- doubts
Q: Why does RL produce longer reasoning without anyone asking for it?
A: Longer reasoning (checking, trying alternatives) increases the chance of a correct final answer on hard problems, so responses with more reasoning tend to get higher rewards and are reinforced. Length is a side effect of optimising correctness, which is also why length can explode without penalties.

Q: Why not just do SFT on correct solutions instead of RL?
A: That's rejection-sampling fine-tuning, and it works well. RL additionally pushes down the probability of wrong attempts and adjusts relative to a per-prompt baseline, using every sample. In practice pipelines use both: RL to discover good reasoning, SFT to consolidate and distil it.

Q: Can RL with verifiable rewards work for tasks without exact answers, like essays?
A: Not directly; you'd need a learned reward model or LLM judge, which brings back reward hacking risks. Verifiable domains (maths, code, logic, some science) are where this recipe shines, and the reasoning skills partly transfer to other tasks.

--- exercises
[estimate] A GRPO group of 8 responses gets rewards [1, 0, 0, 1, 0, 0, 0, 1]. Compute each response's advantage (use the population standard deviation).
A: Mean = 3/8 = 0.375; variance = 0.375 × 0.625 ≈ 0.234, std ≈ 0.484. Correct responses: (1 − 0.375)/0.484 ≈ +1.29; incorrect: (0 − 0.375)/0.484 ≈ −0.77. The correct responses' tokens are pushed up, the incorrect ones' down.

[design] Design a pipeline to improve a 7B model's competitive-programming ability with RL.
A: Data: thousands of problems with hidden test suites (decontaminated from evaluation sets), bucketed by difficulty. Warm start with SFT on high-quality solutions with reasoning. RL: GRPO with 16 samples per problem, reward = all hidden tests pass (partial credit optionally), run code in sandboxes with time and memory limits, KL to the SFT model, filter problems where all or none of the samples pass. Guard against hacking: hidden tests not visible in prompts, block reading test files, randomised test inputs. Periodically rejection-sample and SFT. Evaluate on a fresh held-out contest set.

[break] During RL on maths, reward climbs quickly to 95% but held-out accuracy barely moves. What might the model have learned?
A: Reward hacking: e.g. the answer-checker accepts malformed answers, the model learned to output multiple answers and the checker matched any, or training problems leaked answers. Inspect high-reward samples, tighten the parser (exactly one final answer in the expected format), check for duplicated or leaked training problems, and evaluate on held-out sets throughout training.

--- pitfalls
- Weak verifiers that can be gamed
- Using too-easy or too-hard prompts (no gradient signal in GRPO)
- No KL or entropy control (collapse)
- Ignoring regressions on non-reasoning tasks
- Using PRM scores as RL rewards without guarding against hacking

--- quiz
Q: In GRPO, the baseline for a response is?
- A learned value model
- *The mean reward of the group of responses sampled for the same prompt
- Zero
- The reference model's reward
W: Advantages are normalised within each group.

Q: What does a process reward model score?
- Only the final answer
- *Each intermediate reasoning step
- The prompt's difficulty
- Response length
W: Dense, step-level feedback.

Q: DeepSeek-R1-Zero was trained with?
- Only SFT
- *Pure RL from a base model with rule-based rewards
- DPO on human preferences
- Distillation from GPT-4
W: Reasoning behaviours emerged from RL alone.

Q: A common RL failure where the policy exploits checker weaknesses is?
- Entropy collapse
- *Reward hacking
- Catastrophic forgetting
- Underfitting
W: Harden verifiers and inspect high-reward samples.

--- sources
- paper :: DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning :: DeepSeek-AI (2025) :: https://arxiv.org/abs/2501.12948
- paper :: DeepSeekMath: Pushing the Limits of Mathematical Reasoning (GRPO) :: Shao et al. (2024) :: https://arxiv.org/abs/2402.03300
- paper :: Let's Verify Step by Step (process supervision, PRM800K) :: Lightman et al., OpenAI (2023) :: https://arxiv.org/abs/2305.20050
- paper :: STaR: Bootstrapping Reasoning With Reasoning :: Zelikman et al. (2022) :: https://arxiv.org/abs/2203.14465
