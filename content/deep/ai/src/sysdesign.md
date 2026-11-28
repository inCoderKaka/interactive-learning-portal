=== ml-design-framework
blurb: How to run a 45-minute ML system design interview: the stages (clarify and frame, metrics, data and labels, features, model, offline evaluation, serving, online evaluation and monitoring), time allocation, what interviewers score at L4, L5 and L6, and a worked outline.
signals: "Design YouTube recommendations / ads CTR prediction / harmful content detection" | Any ML system design round at Google, Meta, Amazon and others | "Walk me through how you'd build X with ML"
widgets: ml-design-flow
prereq: ml-framing, two-tower-retrieval, model-serving, monitoring-drift

--- lesson
:::words
- **ML system design interview**: a 45–60 minute discussion where you design an end-to-end ML product, not just a model.
- **Framing**: turning the product goal into a prediction task with an input, output and label.
- **Signal**: what interviewers look for (scoping, trade-offs, depth, communication).
- **Deep dive**: a part of the design the interviewer asks you to explore in detail.
:::

## The problem in plain words

ML system design rounds test whether you can build a working ML product, not whether you know the latest model. Interviewers want a structured walk from a vague goal ("improve the home feed") to a system that collects data, trains, serves, evaluates and improves, with sensible trade-offs and numbers. Most candidates fail by jumping to model architecture, skipping data and evaluation, or never getting to serving and monitoring. A repeatable framework fixes that.

:::eli5
Planning a restaurant before cooking: who are the customers, what does success look like, where do ingredients come from, which dishes, how the kitchen runs at rush hour, and how you'll know if diners are happy. Jumping straight to "I'll make a soufflé" fails the interview.
:::

## The framework (about 45 minutes)

Step through the stages, their time budgets and what to say in each below:

[[widget:ml-design-flow]]

1. **Clarify and frame (5–7 min)**. Users, product surface, goal, scale (users, items, QPS, latency), constraints (privacy, freshness, cold start, platforms). State the ML task: input → output, type (classification, ranking, regression), and how predictions drive decisions. Mention a non-ML baseline.
2. **Metrics (3–5 min)**. Offline (AUC/log-loss, NDCG@k, recall@k, precision at recall) and online (engagement, satisfaction, revenue) plus guardrails (latency, diversity, fairness, safety). Say which is primary and why.
3. **Data and labels (5–7 min)**. Sources, label definition (what counts as positive, label window), biases (position, exposure, selection), negative sampling, class imbalance, privacy, data volume, train/validation/test split by time.
4. **Features (5 min)**. Grouped by source (user, item, user×item, context, real-time); encodings (embeddings for IDs, crosses, aggregates over windows); freshness (batch vs streaming); training–serving consistency (feature store, logging).
5. **Model (7–10 min)**. Start simple (logistic regression or GBDT baseline), then the main design: multi-stage funnel if candidates are many (retrieval → ranking → re-ranking), architecture per stage (two-tower, DCN/MMoE ranker), loss and training details (multi-task heads, calibration), how you'd scale training.
6. **Evaluation (3–5 min)**. Offline protocol (time-based holdout, slices), then online: shadow, A/B test with the primary metric and guardrails, long-term holdbacks.
7. **Serving and scale (5 min)**. Batch vs online, latency budget breakdown, caching, ANN indexes, hardware, fallback.
8. **Monitoring and iteration (3–5 min)**. Drift, data quality, delayed labels, retraining cadence, feedback loops, exploration, fairness monitoring.
9. **Deep dives** wherever the interviewer steers: cold start, position bias, imbalance, real-time features, multilingual, abuse.

Keep a running diagram; summarise at the end; ask the interviewer which area to go deeper into when you have choices.

## What interviewers score

| Area | L4 (mid) | L5 (senior) | L6 (staff) |
|---|---|---|---|
| Scoping | Accepts the prompt, some clarifying | Drives requirements, states assumptions and numbers | Reframes the problem around business value and risks |
| Data | Mentions labels | Label definition, biases, sampling, leakage | Data strategy: flywheels, labelling programmes, privacy-by-design |
| Modelling | Reasonable model | Funnel, justified choices, losses, trade-offs | Alternatives with costs, long-term evolution, platform reuse |
| Evaluation | Offline metric | Offline + online + guardrails, slices | Metric design tied to long-term outcomes, experiment pitfalls |
| Production | Mentions deployment | Latency budget, serving, monitoring, retraining | Reliability, cost, organisational ownership |
| Communication | Answers questions | Structured, proactive, explains trade-offs | Leads the discussion, crisp prioritisation |

## Common mistakes

- Model first, data and metrics never.
- One giant model scoring billions of items.
- Only offline metrics; no A/B test or guardrails.
- Ignoring label bias, cold start, feedback loops.
- Random train/test splits on time-ordered data.
- No numbers: QPS, catalogue size, latency budget, data volume.
- Spending 20 minutes on one stage and never reaching serving.

## A worked outline: "Recommend videos on the YouTube home page"

1. Goal: long-term user satisfaction; ~2B users, ~10B videos, home page loads at ~100k QPS peak, 200 ms budget. Task: rank candidate videos per user by expected value. Baseline: popular and subscribed.
2. Metrics: offline recall@500 (retrieval), NDCG@20 and per-task AUC (ranking); online: watch time, satisfaction surveys, return rate; guardrails: diversity, creator fairness, latency, policy violations.
3. Data: impressions with outcomes (click, watch %, like, share, dismiss) with a 1-hour label window; position bias; exposure bias; time-based splits.
4. Features: user history embeddings, demographics, context (device, time), video features (embeddings, age, creator, engagement velocity), user×video (creator affinity).
5. Model: retrieval from several sources (two-tower with logQ correction, co-watch graph, subscriptions, fresh) → ranker (DCN-v2 + MMoE multi-task heads, position tower) → value model → re-ranking (diversity, policy).
6. Evaluation: offline by slice; shadow; A/B with watch time primary, satisfaction and return as guardrails; long-term holdback.
7. Serving: precomputed item embeddings + ScaNN; ranking on TPUs batched per request; latency breakdown; caches; fallbacks.
8. Monitoring: drift, freshness, retraining daily/continuously, exploration traffic, feedback-loop checks.

## Interview angles

The framework itself is the angle: announce the plan, timebox, show numbers, prioritise depth where the interviewer signals interest, and close with risks and next steps.

--- revise
### Stages
? ML design stages in order? :: Clarify/frame → metrics → data/labels → features → model → evaluation → serving → monitoring → deep dives.
? What to state when framing? :: Users, goal, scale, constraints, ML task (input, output, type), decision, baseline.
? Metrics to name? :: Offline, online primary, guardrails.
? Data topics? :: Sources, label definition and window, biases, sampling, imbalance, privacy, time-based splits.
? Model approach? :: Simple baseline first, then funnel stages with justified architectures and losses.
? Evaluation plan? :: Time-based offline by slice → shadow → A/B with guardrails → long-term holdback.

### Scoring
? L5 signals? :: Drives scoping with numbers, data biases and leakage, justified funnel, offline + online evaluation, latency/monitoring, structured trade-offs.
? L6 signals? :: Reframes around business value and risk, data strategy, alternatives and evolution, reliability/cost/ownership, leads the discussion.

### Mistakes
? Most common failures? :: Model-first, single giant model, offline-only metrics, ignoring bias/cold start/loops, random splits, no numbers, running out of time.

--- notes
## Framework (~45 min)
1 Clarify/frame 5–7 (users, goal, scale, constraints, task, decision, baseline)
2 Metrics 3–5 (offline, online primary, guardrails)
3 Data/labels 5–7 (sources, label def/window, biases, sampling, imbalance, privacy, time split)
4 Features 5 (user, item, cross, context, real-time; encodings; freshness; consistency)
5 Model 7–10 (baseline → funnel → architectures, losses, multi-task, calibration, training scale)
6 Evaluation 3–5 (offline slices → shadow → A/B + guardrails → holdback)
7 Serving 5 (batch/online, latency budget, ANN, caches, hardware, fallback)
8 Monitoring 3–5 (drift, quality, delayed labels, retraining, loops, exploration, fairness)
9 Deep dives (cold start, position bias, imbalance, real-time, multilingual, abuse).
Diagram, timebox, summarise, ask where to go deep.
## Levels
L4 reasonable model + offline metric · L5 drives scope with numbers, biases, funnel, online eval, production · L6 business reframing, data strategy, evolution, reliability/cost/ownership.
## Mistakes
Model-first · one giant model · offline only · no bias/cold start/loops · random splits · no numbers · poor time management.

--- doubts
Q: How deep should I go on model architecture?
A: Enough to justify choices (why a two-tower model for retrieval, why multi-task heads, which loss) and discuss trade-offs; interviewers rarely want layer-by-layer details unless they ask. Data, metrics, evaluation and production usually carry more signal.

Q: What if the interviewer interrupts and steers elsewhere?
A: Follow them; it's a signal of what they want to evaluate. Briefly note what you'd cover in the skipped parts ("I'll come back to monitoring") and manage time so the core stages are touched.

Q: Should I always propose deep learning?
A: Propose what fits: a strong baseline (heuristics, logistic regression, GBDT) first, then deep models where data scale and problem structure justify them. Showing judgement about simplicity is itself a senior signal.

--- exercises
[design] Outline (bullets per stage) an ML design for "detect harmful comments on a video platform".
A: Frame: classify each comment by policy category; actions by thresholds (auto-hide, human review, allow); scale ~1B comments/day, ~10k QPS; latency < 200 ms at posting. Metrics: per-category precision/recall at operating points, PR-AUC; online: prevalence of harmful views (rater-sampled), wrongful-removal appeals; guardrails across languages. Data: rater labels (gold), user reports (noisy), active learning for rare categories; time splits. Features: text (multilingual transformer embeddings), author history, video context, reply-thread context. Model: fast multilingual classifier for all comments, heavier model for uncertain/high-reach cases; multi-label heads. Evaluation: per-language slices, adversarial obfuscation tests. Serving: online at post time + re-scoring when reported. Monitoring: drift with new slang, attack patterns, fairness across dialects, reviewer feedback loop.

[break] A candidate spends 25 minutes on a transformer architecture for ad CTR prediction and has 5 minutes left. What signal is missing?
A: Framing and metrics (calibration needs for auctions), data and labels (click window, position bias, negative downsampling and recalibration), features (huge sparse IDs, crosses), serving (latency, embedding tables), online evaluation (A/B, revenue and user guardrails), monitoring and freshness (continuous training). An L5 answer covers these at reasonable depth.

[estimate] For a home feed at 100k peak QPS where each request ranks 500 candidates with a 20 MFLOP ranking model, what's the peak ranking compute?
A: $10^5 \times 500 \times 2\times10^7 = 10^{15}$ FLOP/s = 1 PFLOP/s, a few accelerators' worth at good utilisation, plus headroom; feature fetching and embedding lookups (memory and network bound) usually need more machines than the FLOPs suggest.

--- pitfalls
- Jumping to model architecture
- No numbers for scale and latency
- Offline metrics only
- Forgetting data biases, cold start and feedback loops
- Running out of time before serving and monitoring

--- quiz
Q: What should come first in an ML system design interview?
- Model architecture
- *Clarifying the goal, users, scale and framing the ML task
- Hyperparameters
- Serving hardware
W: Everything depends on the framing.

Q: Which split is correct for most production ML data?
- Random shuffle
- *Time-based (train on past, evaluate on later data)
- By user ID only
- No split
W: Avoids training on the future.

Q: An L5-level evaluation plan includes?
- Only AUC
- *Offline metrics by slice plus an online A/B test with guardrails
- Only user interviews
- Benchmark rank
W: Offline guides, online decides.

Q: For billions of candidate items, the model design should be?
- One large model scoring everything
- *A multi-stage funnel: retrieval, ranking, re-ranking
- A rule-based system only
- Random sampling
W: Cheap stages narrow candidates for expensive ones.

--- sources
- book :: Machine Learning System Design Interview :: Ali Aminian, Alex Xu (ByteByteGo, 2023) :: https://bytebytego.com/intro/machine-learning-system-design-interview
- book :: Designing Machine Learning Systems :: Chip Huyen :: https://www.oreilly.com/library/view/designing-machine-learning/9781098107956/
- article :: Rules of Machine Learning :: Martin Zinkevich, Google :: https://developers.google.com/machine-learning/guides/rules-of-ml
- article :: Google Machine Learning Engineer interview guide :: IGotAnOffer :: https://igotanoffer.com/blogs/tech/google-machine-learning-engineer-interview

=== genai-design-framework
blurb: How to run a GenAI / LLM system design interview: requirements and success criteria, token and cost estimates, choosing models (API vs open, size, routing), prompt and context design, RAG and tools, agents, evaluation, safety and guardrails, serving and cost control, with level expectations.
signals: "Design a ChatGPT-like assistant / a customer-support agent / a coding assistant / an LLM serving platform" | AI engineer and MLE loops at most top companies | "How would you evaluate and secure it?"
widgets: genai-design-flow
prereq: rag-pipeline, agent-reliability, latency-cost, eval-pipelines

--- lesson
:::words
- **GenAI system design**: designing a product or platform built around generative models, from prompts and retrieval to serving, evaluation and safety.
- **Model routing**: sending requests to different models by difficulty, cost or capability.
- **Grounding**: making outputs rely on retrieved data or tool results.
- **Guardrails**: checks around the model that block or modify unsafe or invalid content.
:::

## The problem in plain words

GenAI design rounds look like classic system design with new moving parts: the model is a rented or hosted component with token costs, probabilistic outputs, hallucinations and security risks. Interviewers want to see you scope the product, estimate tokens and cost, choose models deliberately, design context (prompts, retrieval, tools, memory), and, above all, evaluate and secure it. Like ML design, a framework keeps you from spending 30 minutes on prompts and never mentioning evaluation.

:::eli5
Building a call centre staffed by very knowledgeable but sometimes overconfident temps: you decide which calls they handle, what reference manuals they get, which systems they can access, how you check their answers, how you stop scammers manipulating them, and what it all costs per call.
:::

## The framework (about 45 minutes)

Step through the stages and what strong answers include below:

[[widget:genai-design-flow]]

1. **Requirements (5 min)**: users and tasks, success criteria (task completion, accuracy, citations), non-functional needs (latency: TTFT and total; availability; languages; privacy and data residency; budget), scope and what's out of scope. Decide what must be **deterministic** (facts from systems of record) vs generated.
2. **Estimates (3–5 min)**: requests/day and peak QPS, tokens in and out per request, cost per day (API) or GPUs (self-hosted), context sizes, corpus size for retrieval.
3. **Model choice (3–5 min)**: API frontier model vs open model (quality, cost, latency, data control, fine-tuning needs); size per task; **routing/cascades** (small model for easy requests); reasoning models only where needed; multimodal needs.
4. **Context design (5–8 min)**: system prompt and instructions; RAG (ingestion, chunking, hybrid retrieval, reranking, citations); tools (schemas, permissions); memory (conversation summaries, user memory); token budgets; caching of static prefixes.
5. **Orchestration (5 min)**: single call, workflow, or agent; how steps are chained; structured outputs; streaming; fallbacks and retries.
6. **Evaluation (5 min)**: golden sets with slices, graders (deterministic, LLM judge validated with humans), retrieval and generation metrics, regression gates in CI, online feedback and A/B tests.
7. **Safety and security (5 min)**: prompt injection (direct and indirect), data leakage and permissions, harmful content policies, guardrails (input and output), human-in-the-loop for actions, abuse and rate limits, privacy (PII handling, retention).
8. **Serving, scale and cost (3–5 min)**: gateway, rate limits and quotas, model serving (engines, batching, prefix caching) or API capacity, latency budget, cost levers (shorter prompts, routing, caching, batch APIs, distillation), observability (traces, tokens, cost per request).
9. **Iteration**: feedback flywheel, fine-tuning when patterns stabilise, model upgrades with evaluation.

## Level expectations

- **L4**: a working pipeline (prompt + RAG or tools), basic evaluation and safety mentions.
- **L5**: quantified tokens/cost/latency, justified model choice and routing, strong RAG/tool design with permissions, validated evaluation with slices and gates, concrete injection defences and guardrails, cost levers, observability.
- **L6**: platform thinking (shared gateway, evaluation infrastructure, model abstraction for upgrades), organisational and risk trade-offs, build-vs-buy, long-term data flywheels and governance.

## Common mistakes

- "Use GPT/Gemini" with no estimates, routing or cost discussion.
- RAG without permission filtering, citations or a "don't know" path.
- No evaluation beyond "we'll test it".
- No mention of prompt injection for anything that reads external content or takes actions.
- Agents where a workflow would be simpler and safer.
- Ignoring latency (output tokens dominate) and streaming.

## Classic prompts to practise

Enterprise knowledge assistant (RAG), customer-support agent with refunds, coding assistant, ChatGPT-style chat product, meeting summariser, LLM inference/batching platform, text-to-image service, LLM evaluation platform, voice assistant, document Q&A over PDFs, email Smart Reply/Compose, deep-research agent, guardrails/moderation service. The AI interview questions in this portal walk through each.

## Interview angles

The framework is the angle: requirements and numbers first, deliberate model and context choices, and strong evaluation, safety and cost sections are what separate senior answers.

--- revise
### Stages
? GenAI design stages? :: Requirements → estimates → model choice → context design → orchestration → evaluation → safety → serving/cost → iteration.
? What to estimate? :: Requests/day, peak QPS, tokens in/out, cost/day or GPUs, context and corpus sizes.
? Model choice factors? :: Quality, cost, latency, data control, fine-tuning, routing/cascades, reasoning only where needed.
? Context design covers? :: Prompts, RAG, tools, memory, token budgets, prefix caching.
? Orchestration options? :: Single call, workflow, or agent; structured outputs; streaming; fallbacks.

### Quality, safety, cost
? Evaluation must include? :: Golden sets with slices, validated graders, retrieval + generation metrics, CI gates, online feedback/A-B.
? Security must cover? :: Direct and indirect injection, permissions/leakage, harmful content, guardrails, HITL for actions, abuse limits, privacy.
? Cost levers? :: Shorter prompts, routing, caching, batch APIs, distillation.

### Levels and mistakes
? L5 vs L4? :: Quantified estimates, justified routing, permission-aware RAG/tools, validated evaluation, concrete security, cost levers, observability.
? Common mistakes? :: No estimates, RAG without permissions/citations/abstention, vague evaluation, ignoring injection, needless agents, ignoring output latency.

--- notes
## Framework (~45 min)
1 Requirements (users, tasks, success, TTFT/total latency, availability, languages, privacy/residency, budget, scope; deterministic vs generated)
2 Estimates (QPS, tokens in/out, $/day or GPUs, context, corpus)
3 Model (API vs open, size, routing/cascade, reasoning where needed, multimodal)
4 Context (prompt, RAG pipeline, tools + permissions, memory, budgets, prefix cache)
5 Orchestration (call / workflow / agent, structured output, streaming, retries, fallbacks)
6 Evaluation (golden + slices, graders validated, retrieval + generation metrics, CI gates, online)
7 Safety (injection direct/indirect, permissions/leakage, policies, guardrails, HITL, abuse, PII/retention)
8 Serving/cost (gateway, quotas, engine/batching/prefix cache or API capacity, latency budget, cost levers, tracing)
9 Iterate (flywheel, fine-tune when stable, upgrades with eval).
## Levels
L4 working pipeline · L5 numbers + routing + permission-aware RAG/tools + validated eval + concrete security + cost + observability · L6 platform, build-vs-buy, governance, flywheels.
## Mistakes
No numbers · RAG w/o ACL/citations/abstain · vague eval · no injection · agents by default · ignoring output latency/streaming.

--- doubts
Q: How much time should go to prompts?
A: A few minutes: the system prompt's key instructions, output format and grounding rules. Interviewers care more about retrieval, tools, evaluation, safety and cost, because prompts are easy to change and those are hard to get right.

Q: Should I pick a specific model in the interview?
A: Name a class and justify it ("a frontier API model for complex reasoning, a small open model fine-tuned for classification, routed by a lightweight classifier"), and design so the model can be swapped (abstraction layer, evaluation suite). Specific vendor names matter less than the reasoning.

Q: How do I show seniority in a GenAI round?
A: Put numbers on everything, treat evaluation and security as first-class components, design for change (model upgrades, prompt versions), discuss cost and latency levers, and talk about how the system improves over time from production feedback.

--- exercises
[design] Outline a GenAI design for "an assistant that answers employees' HR questions and can file simple requests (address change, leave request)".
A: Requirements: 50k employees, 20k questions/day, TTFT < 1 s, answers cite policies, actions need confirmation, regional policies by country, PII sensitive. Estimates: ~3k input / 300 output tokens per turn, ~USD 100/day on a mid-tier API model; corpus 5k docs. Model: mid-size model; small model router for intent; actions via tools. Context: RAG over policies filtered by employee country and role, hybrid + rerank, citations, abstain path; tools: get_leave_balance, submit_leave_request (confirmation), update_address (confirmation + verification); memory: conversation summary only. Evaluation: 500-question golden set by country and topic, faithfulness/correctness/citations, tool-call accuracy on scripted scenarios, CI gates. Safety: user-scoped permissions, no access to others' data, injection from documents limited (no external sends), PII redaction in logs, escalation to HR. Serving: gateway with SSO, streaming, prefix caching, tracing, cost dashboards.

[estimate] A coding assistant serves 50k developers, 40 requests each per day, 6k input tokens (code context) and 400 output tokens per request. With an API at USD 3/M input and USD 15/M output, what's the monthly cost? What would you cut first?
A: Requests/day = 2M; input 12B tokens → USD 36,000/day; output 0.8B → USD 12,000/day; ≈ USD 48,000/day ≈ USD 1.4M/month. Cut first: context size (smarter retrieval of relevant files/snippets, prefix caching of repository context), routing simple completions to a small fast model, and caching.

[break] A candidate designs a sales-email agent that reads incoming customer emails, looks up CRM data and sends replies automatically, and doesn't mention security. What would an interviewer probe?
A: Indirect prompt injection in incoming emails leading to data exfiltration (CRM details sent to an attacker) or harmful sends; permissions (agent scope vs user's), approval gates for sending, allow-listed recipients, output checks for PII, rate limits, audit logs, and evaluation with adversarial emails.

--- pitfalls
- No token or cost estimates
- Treating the LLM as always correct
- Skipping evaluation and security sections
- Agents where a workflow suffices
- No plan for model upgrades or prompt versioning

--- quiz
Q: Which belongs in the estimates section of a GenAI design?
- The model's layer count
- *Requests per day, tokens in/out and cost per day
- The tokenizer's vocabulary
- The training data size
W: Cost and capacity follow from tokens.

Q: Model routing helps by?
- Using one model for everything
- *Sending easy requests to cheaper models and hard ones to stronger models
- Removing the need for evaluation
- Increasing latency
W: Big cost savings at similar quality.

Q: A GenAI design that reads external emails and can send emails must address?
- Only latency
- *Indirect prompt injection and exfiltration, with approvals and permissions
- Only token cost
- Only tokenization
W: Classic attack path.

Q: What usually distinguishes an L5 GenAI design answer?
- Naming the newest model
- *Quantified estimates plus first-class evaluation, security and cost design
- Longer prompts
- More agents
W: Production rigour is the senior signal.

--- sources
- book :: Generative AI System Design Interview :: Ali Aminian, Hao Sheng (ByteByteGo, 2024) :: https://bytebytego.com/intro/generative-ai-system-design-interview
- book :: AI Engineering :: Chip Huyen (O'Reilly, 2025) :: https://www.oreilly.com/library/view/ai-engineering/9781098166298/
- article :: Generative AI system design interview guide :: IGotAnOffer :: https://igotanoffer.com/en/advice/generative-ai-system-design-interview
- article :: Building effective agents :: Anthropic :: https://www.anthropic.com/engineering/building-effective-agents

=== ml-coding-round
blurb: How ML coding interviews work and how to pass them: the common question families (classic algorithms from scratch, neural-network pieces, attention and LLM components, metrics and data processing), NumPy and PyTorch idioms, numerical stability, testing your code, and a 45-minute plan.
signals: "Implement k-means / logistic regression / attention from scratch" | "Write a training loop and debug it" | "Compute AUC without sklearn" | ML coding rounds at Google, Meta, OpenAI, Anthropic and others
widgets: ml-coding-plan
prereq: logistic-regression, clustering-pca, self-attention, training-loop

--- lesson
:::words
- **ML coding round**: a 45–60 minute interview where you implement an ML algorithm or component in Python (NumPy or PyTorch), usually without ML libraries' high-level functions.
- **Vectorisation**: writing array operations instead of Python loops.
- **Numerical stability**: avoiding overflow, underflow and division by zero (stable softmax, log-sum-exp).
- **Gradient check**: comparing hand-written gradients with finite differences.
:::

## The problem in plain words

Many ML roles add a coding round focused on ML rather than (or alongside) classic algorithms: implement an algorithm from scratch, write a model component, compute a metric, or debug a training script. Interviewers check that you understand the maths well enough to code it correctly, write clean vectorised code, handle edge cases and numerical issues, and test your work. It's very learnable: the question pool is small and the skills repeat.

:::eli5
A driving test for ML: anyone can describe how to parallel park; the test is doing it smoothly, checking the mirrors (tests), and not hitting the kerb (numerical bugs).
:::

## The question families

1. **Classic algorithms from scratch**: linear regression (gradient descent and closed form), logistic regression, softmax regression, k-means (with k-means++), kNN, naive Bayes, decision-tree split / small tree, PCA (SVD or power iteration), Gaussian mixture EM.
2. **Neural-network pieces**: forward and backward of a 2-layer MLP, softmax + cross-entropy and its gradient, an optimiser (SGD momentum, Adam), batch norm / layer norm forward (and backward), dropout, conv2d forward, an RNN cell.
3. **Transformer / LLM components**: scaled dot-product and multi-head attention with masks, causal self-attention with a KV cache, a transformer block, positional encodings (sinusoidal, RoPE), sampling (top-k, top-p, temperature), beam search, BPE tokenizer training and encoding, LoRA layer.
4. **Metrics and evaluation**: precision/recall/F1 from scratch, ROC-AUC (rank-based), NDCG, IoU and NMS, confusion matrices, bootstrapped confidence intervals.
5. **Data and training**: a PyTorch training loop for a small task, finding and fixing bugs in a given script, data loading and batching with padding/masks, train/validation splits without leakage.

The portal's ML-coding mock interviews cover each family; the explainer below shows a 45-minute plan for one:

[[widget:ml-coding-plan]]

## A 45-minute plan

1. **Clarify (3–5 min)**: inputs and shapes, output, constraints (NumPy only? batch dimension? data types?), edge cases (empty clusters, ties, k > n), what to optimise (correctness first).
2. **Explain the approach (5 min)**: the maths in a few lines (objective, update rule, complexity). Agree before coding.
3. **Code (20–25 min)**: clean functions with shapes in comments; vectorised; numerically stable; readable names.
4. **Test (5–8 min)**: tiny hand-checkable example, a property test (rows of softmax sum to 1; loss decreases; AUC of a perfect scorer is 1), edge cases; compare to a reference if allowed (sklearn, torch functional).
5. **Discuss (remaining)**: complexity, scaling (mini-batches, GPUs, approximate methods), extensions (regularisation, k-means++, multi-head, caching).

## Idioms and pitfalls

- **Shapes**: assert them; keep a batch dimension; use `keepdims=True` for reductions you'll broadcast back.
- **Vectorise**: pairwise distances via $\|a\|^2 - 2ab^\top + \|b\|^2$; `argpartition` for top-k; boolean masks; `np.add.at` / `scatter_add` for grouped sums.
- **Stability**: subtract the max before `exp`; compute log-softmax via log-sum-exp; losses from logits; clip probabilities; add epsilon to denominators and variances.
- **Randomness**: seed RNGs for reproducibility in tests.
- **Gradients**: check against finite differences on a tiny example.
- **Edge cases**: empty clusters, ties in ranking metrics (average ranks), division by zero (no positives), masked rows in attention (all −∞).
- **PyTorch**: `model.train()`/`eval()`, `zero_grad`, logits into `CrossEntropyLoss`, `torch.no_grad()` for evaluation, device and dtype consistency.

## What interviewers score

- Correctness of the maths and code.
- Code quality: structure, naming, vectorisation, comments where useful.
- Testing and debugging: you find your own bugs.
- Communication: thinking aloud, clarifying, explaining trade-offs.
- Depth: complexity, numerical issues, scaling, extensions.

## Interview angles

- Practise each family until you can write it cleanly in 20 minutes; say the shapes aloud; always test with a tiny example; mention stability tricks before being asked.

--- revise
### Families
? Five ML-coding families? :: Classic algorithms; NN pieces; transformer/LLM components; metrics; data and training loops/debugging.
? Most common classic questions? :: Logistic regression and k-means (also linear regression, kNN, decision-tree split, PCA).
? Most common LLM questions? :: Self/multi-head attention with masks, KV cache, sampling, BPE, transformer block.

### Plan
? 45-minute plan? :: Clarify (shapes, constraints, edges) → explain maths → code → test → discuss scaling/extensions.
? How to test ML code quickly? :: Tiny hand-checkable example, property checks, edge cases, reference comparison, gradient check.

### Idioms
? Pairwise distance trick? :: ‖a‖² − 2abᵀ + ‖b‖².
? Stable softmax? :: Subtract the max before exponentiating; log-softmax via log-sum-exp.
? AUC with ties? :: Rank-based with average ranks.
? PyTorch must-dos? :: train/eval modes, zero_grad, logits into CrossEntropyLoss, no_grad for evaluation.

--- notes
## Families
Classic: linear/logistic/softmax regression, k-means(++), kNN, naive Bayes, tree split, PCA, GMM-EM.
NN: MLP fwd/bwd, softmax+CE grad, SGD/Adam, BN/LN, dropout, conv2d, RNN cell.
LLM: attention (masks, multi-head), causal + KV cache, block, sinusoidal/RoPE, top-k/top-p/temperature, beam search, BPE, LoRA.
Metrics: P/R/F1, ROC-AUC (ranks), NDCG, IoU/NMS, bootstrap CIs.
Data/training: PyTorch loop, bug hunt, padding/masks, leak-free splits.
## Plan
Clarify 3–5 → approach 5 → code 20–25 → test 5–8 → discuss.
## Idioms
Assert shapes; keepdims; ‖a‖² − 2abᵀ + ‖b‖²; argpartition; masks; np.add.at.
Stability: max-subtract, log-sum-exp, logits-based losses, clip, eps.
Seeds; finite-difference gradient checks; edge cases (empty clusters, ties, no positives, fully masked rows).
PyTorch: train/eval, zero_grad, logits → CE, no_grad, device/dtype.
## Scored on
Correctness · code quality · testing/debugging · communication · depth (complexity, stability, scaling, extensions).

--- doubts
Q: NumPy or PyTorch?
A: Ask; if free to choose, NumPy for classic algorithms and from-scratch maths (shows you understand the operations), PyTorch for neural-network and transformer questions (autograd and modules are expected). Either way, don't call the high-level function that solves the question (`sklearn.cluster.KMeans`, `nn.MultiheadAttention`) unless allowed.

Q: What if I forget a formula?
A: Derive it out loud from first principles (e.g. the logistic-regression gradient from the log-loss), or state what you remember and test it with a finite-difference check. Interviewers value the derivation process.

Q: How much should I optimise performance?
A: Correct, readable and vectorised first. Then discuss complexity and how you'd scale (mini-batches, approximate methods, GPUs). Premature micro-optimisation costs time and clarity.

--- exercises
[design] Plan your solution for "implement multi-head causal self-attention in PyTorch" before writing code.
A: Clarify: input (B, T, d), number of heads h with d divisible by h, causal mask, dropout optional, return (B, T, d). Approach: fused QKV projection → split into heads (B, h, T, d_k) → scores QKᵀ/√d_k → causal mask with −inf (large negative) → softmax → @V → merge heads → output projection. Tests: output shape; T = 1 equals the value path; changing a future token doesn't change earlier outputs (causality); compare with `F.scaled_dot_product_attention(is_causal=True)`. Discuss: O(T²d) cost, KV cache for generation, FlashAttention.

[break] A candidate's logistic regression returns NaN loss after a few iterations on a dataset with large feature values. What's wrong and what would you add?
A: Large logits overflow `exp` in the sigmoid or `log(0)` occurs; also no feature scaling, so the learning rate is too large for those features. Standardise features, use a numerically stable sigmoid/log-loss from logits (log1p, abs trick), lower the learning rate, and check gradients.

[estimate] Practising: if each of 20 core questions takes ~1 hour to master (two attempts plus review), how many hours to prepare the ML-coding pool, and how would you schedule it?
A: ~20 hours. Schedule ~1 hour a day for 3–4 weeks: classics first (logistic, k-means, linear, kNN, tree split, PCA), then NN pieces (MLP backprop, softmax-CE, Adam, layer norm), then LLM components (attention, KV cache, sampling, BPE), then metrics (AUC, NDCG, NMS); redo each a week later timed at 25 minutes.

--- pitfalls
- Coding before clarifying shapes and constraints
- Python loops where vectorisation is expected
- Unstable softmax and log computations
- Not testing (letting the interviewer find bugs)
- Calling the library function the question asks you to implement

--- quiz
Q: The first thing to do in an ML coding question is?
- Start typing
- *Clarify inputs, shapes, constraints and edge cases
- Optimise for speed
- Import sklearn
W: Ambiguity causes most mistakes.

Q: A quick way to verify a hand-written gradient?
- Run it on the full dataset
- *Compare it with finite differences on a tiny example
- Increase the learning rate
- Print the loss
W: Centred differences in float64.

Q: Why subtract the max before exponentiating in softmax?
- It's faster
- *To avoid overflow; softmax is unchanged by the shift
- To normalise
- To add randomness
W: Shift invariance makes it free.

Q: Which is a property test for a softmax implementation?
- Outputs are integers
- *Each row is non-negative and sums to 1
- Outputs equal inputs
- Outputs are sorted
W: Probabilities must form a distribution.

--- sources
- article :: ML coding interview overview :: Exponent :: https://www.tryexponent.com/courses/ml-engineer/ml-coding/ml-coding-intro
- article :: Things Not to Miss: A High-Signal Refresher for ML Engineering Interviews in 2026 :: Towards AI :: https://pub.towardsai.net/things-not-to-miss-a-high-signal-refresher-for-ml-engineering-interviews-in-2026-dd7ff63ce55b
- course :: Neural Networks: Zero to Hero :: Andrej Karpathy :: https://karpathy.ai/zero-to-hero.html
- book :: Dive into Deep Learning (from-scratch implementations) :: Zhang et al. :: https://d2l.ai/
