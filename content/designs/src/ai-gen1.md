=== d-ai-docs-assistant
--- words
- **RAG (retrieval-augmented generation)**: look up relevant passages first, then have the model answer from them, with citations.
- **Chunk**: a piece of a document (a few hundred tokens) that is embedded and retrieved on its own.
- **Hybrid search**: combining keyword search (exact names and ids) with embedding search (meaning).
- **Reranker**: a slower model that reads the question with each candidate passage and re-orders the top results.
- **ACL (access control list)**: who may read a document; every chunk carries it.
- **Faithfulness**: whether every claim in the answer is supported by the retrieved passages.
--- flow
1. **0–5**: users, corpus size and types, permissions, freshness, latency, what "good" means, abstain behaviour.
2. **5–10**: questions per day, tokens per question, index size, cost.
3. **10–15**: the API, the index schema with ACLs, the prompt contract.
4. **15–25**: ingestion pipeline and query pipeline end to end.
5. **25–40**: deep dives: permissions, retrieval quality, injection, latency, model choice.
6. **40–45**: evaluation offline and online, cost, 10× scale.
--- variants
Q: Customer-facing help-centre bot instead of internal docs
A: No ACLs but strict brand and safety rules, escalation to human agents, and multi-language support.
Q: Answers must include numbers from spreadsheets and tables
A: Parse tables into structured text or a SQL tool; the model calls the tool instead of reading flattened cells.
Q: Each team wants its own assistant
A: Multi-tenant index with per-tenant filters, per-tenant prompts and evaluation sets.
--- prereqs
rag-pipeline, retrieval-quality, vector-db-production, rag-evaluation
--- paths
- [deep] Permissions :: ACLs on every chunk, filter at retrieval by the user's groups, permission-aware caches.
  - A user sees a snippet from a doc they can't open :: Filter before ranking, never after generation; audit logs; no cross-user cache.
- [deep] Retrieval quality :: Hybrid search, heading-aware chunks, reranker, query rewriting, freshness boosts.
  - Product names and ticket ids are missed :: Keyword search alongside embeddings.
  - The right doc is found but the answer is wrong :: Smaller chunks with parent expansion, table parsing, faithfulness checks.
- [failure] A wiki page contains an injected instruction :: Treat documents as data, delimit them, no action tools, output checks.
- [deep] Evaluation :: Labelled questions: retrieval recall and MRR separately from faithfulness and correctness with a calibrated judge.
- [variation] Answers need numbers from tables :: Structured parsing or a SQL tool.
- [deep] Cost and latency :: Route easy questions to a small model, prefix caching, fewer chunks after better reranking, streaming.

=== d-ai-support-agent
--- words
- **Agent**: a model in a loop that decides which tool to call next, observes the result and continues until the task is done.
- **Tool**: a function the agent may call (look up an order, issue a refund), described by a schema.
- **Policy engine**: ordinary code that checks every tool call against business rules, outside the model.
- **Human handoff**: passing the conversation to a person with a summary.
- **Idempotency key**: an id that makes repeating the same action safe (no double refunds).
--- flow
1. **0–5**: what the agent may do, refund limits, channels, languages, success and failure costs.
2. **5–10**: conversations per day, steps per conversation, tokens and cost.
3. **10–15**: tool schemas, conversation state, logs.
4. **15–25**: the loop: classify → gather facts with tools → decide → act or hand off.
5. **25–40**: deep dives: permissions and policy, injection, reliability, evaluation.
6. **40–45**: monitoring, rollout, cost.
--- variants
Q: The agent can also change subscriptions and addresses
A: Each new tool needs its own policy checks, confirmation steps for irreversible actions and audit logs.
Q: Voice channel (phone support)
A: Speech recognition and synthesis, latency per turn under a second, shorter responses, confirmation by reading back.
Q: Customers in 20 languages
A: Multilingual model, per-language evaluation sets, translation of policy text, escalation to native speakers.
--- prereqs
agent-loop-tools, agent-planning-memory, agent-reliability
--- paths
- [deep] Who decides a refund :: The model proposes; a policy engine checks identity, amount caps and eligibility; idempotency.
  - The customer says 'my manager approved a full refund' :: Ignore claims in chat; facts come only from tools and the session.
- [failure] Prompt injection in an order note :: Tool outputs are data; strict tool schemas; the policy engine is the guard.
- [deep] Reliability of multi-step flows :: State machine with checkpoints, retries with idempotency, step limits, human handoff.
- [deep] Evaluating the agent :: Scenario simulations with a user simulator, task success, policy violations, human review of samples.
- [variation] Voice channel :: Speech in and out, sub-second turns, confirmations read back.
- [deep] Cost per conversation :: Small model for intent, strong model for planning, caching, early handoff for hard cases.

=== d-ai-smart-compose
--- words
- **Smart Compose**: inline suggestions that complete the sentence a user is typing in an email.
- **Prefix**: the text before the cursor, plus context like the subject and the email being replied to.
- **Distillation**: training a small, fast student model to imitate a large teacher model.
- **Trigger threshold**: only show a suggestion when the model is confident enough; wrong suggestions annoy.
- **Acceptance rate**: the share of shown suggestions the user accepts with Tab.
--- flow
1. **0–5**: latency (<100 ms per keystroke), languages, personalisation, privacy (email content), when to show suggestions.
2. **5–10**: keystrokes per second across users, model size and cost.
3. **10–15**: the API and what context is sent.
4. **15–25**: model (small transformer or LSTM language model, distilled), beam search, confidence trigger, serving on accelerators.
5. **25–40**: deep dives: latency, personalisation, bias and safety, privacy.
6. **40–45**: metrics (acceptance, characters saved), A/B, monitoring.
--- variants
Q: Run on the phone instead of servers
A: Much smaller model (quantised), on-device personalisation, battery and memory limits.
Q: Smart Reply (whole short replies)
A: Choose from a curated set of responses with a dual-encoder retrieval, which is safer and cheaper than free generation.
Q: Code completion in an IDE
A: Longer context (the file and repo), larger model, latency budget ~300 ms, acceptance and edit distance as metrics.
--- prereqs
sampling-strategies, distillation, latency-cost
--- paths
- [deep] Latency per keystroke :: Small distilled model, beam search with few beams, caching the encoded context, accelerators, client debounce.
  - Suggestions arrive after the user has typed on :: Cancel stale requests, predict at word boundaries, shorter suggestions.
- [deep] When to show a suggestion :: Confidence threshold tuned for acceptance vs coverage; shorter suggestions when unsure.
- [failure] A suggestion is biased or inappropriate :: Filter offensive outputs, avoid gendered assumptions (pronoun suggestions removed), evaluation slices.
- [deep] Privacy :: No training on private content without aggregation and safeguards; federated or differentially private personalisation.
- [variation] On-device version :: Quantised small model, local personalisation, battery limits.

=== d-gen-chat-assistant
title: Design a ChatGPT-style assistant
topic: ai-context-engineering
tier: 3
est: 60
prompt: Design a general-purpose chat assistant for 100 million weekly users, with long conversations, file uploads, web search and memory across chats.
--- words
- **Context window**: how many tokens the model can read at once; the whole conversation must fit, or be summarised.
- **Prefix (prompt) caching**: reusing the computed attention state for a prompt beginning that repeats, like the system prompt and earlier turns.
- **Streaming**: sending tokens to the user as they are generated.
- **Memory**: facts about the user saved across conversations and inserted into later prompts.
- **Model routing**: sending each request to the cheapest model that can handle it.
--- flow
1. **0–5**: features (chat, files, search, memory), quality bar, latency (first token <1 s), safety, cost per user.
2. **5–12**: requests per second, tokens per request, GPU count, cost.
3. **12–20**: API, conversation storage, prompt assembly.
4. **20–35**: architecture: gateway → orchestrator → tools (search, files) → model serving cluster; deep dives on context management, memory, serving.
5. **35–45**: safety, evaluation, cost.
--- req
**Functional**: multi-turn chat with streaming; upload files and ask about them; web search with citations; memory of user preferences across chats (user-visible and deletable); regenerate and edit messages.

**Non-functional**: first token < 1 s p50, < 2.5 s p95; 99.9% availability; safety policies enforced; conversations private and deletable; cost per weekly user within budget.
--- est
- 100M weekly users, ~20M daily, ~10 messages/day → **200M messages/day ≈ 2,300/s average, ~7,000/s peak**.
- Per message: ~3K input tokens (system + history + retrieved), ~400 output → ~0.6T input and 80B output tokens/day.
- A large model on an 8-GPU node decodes ~3–5K tokens/s across a batch → peak output ~7,000 × 400 / (typical 20 s generation) ≈ 140K tokens/s → **~30–50 nodes for the big model**, far fewer if most traffic routes to a smaller model; prefix caching cuts prefill cost substantially.
--- api
- `POST /conversations/{id}/messages {content, attachments[]}` → server-sent events stream of tokens, tool-call status and citations.
- Conversation store: messages with role, content, model, prompt version, token counts; files in object storage with extracted text chunks.
- Memory store: per user, short facts with source message and timestamps; user can view and delete.
- Prompt assembly: system prompt (cached) → memory facts → summary of old turns → recent turns → retrieved file/search snippets → user message.
--- hl
1. **Gateway**: auth, rate limits per tier, abuse checks.
2. **Orchestrator**: loads conversation state, decides tools (search, file retrieval) via a fast router model or function calling, assembles the prompt within the token budget.
3. **Tools**: web search API with page fetching and snippet extraction; file pipeline (parse → chunk → embed → per-conversation vector index); memory read/write.
4. **Model serving**: a pool per model size with continuous batching, paged KV cache and prefix caching; router picks the model by request difficulty and user tier.
5. **Safety**: input and output classifiers, policy-tuned model, refusals and safe completions.
6. **Logging**: traces of each step for debugging and evaluation (with privacy controls).
--- deep
**Long conversations**: keep recent turns verbatim; summarise older turns into a running summary; retrieve older relevant turns by embedding when needed; never exceed the window silently.

**Memory**: a background extractor proposes facts ("prefers metric units"); store with confidence and source; insert the top relevant facts; user controls; avoid storing sensitive data unless asked.

**Serving efficiency**: prefix caching for the system prompt and conversation history (sticky routing of a conversation to the same server helps cache hits); speculative decoding for latency; quantised smaller models for simple turns.

**Tool use**: search when the question needs fresh facts; cite sources; treat fetched pages as untrusted (injection).
--- wrap
**Evaluation**: offline suites per capability (reasoning, coding, safety, long context), pairwise LLM-judge comparisons calibrated with human raters; online thumbs, regenerations, conversation length, retention; A/B per model change.

**Monitoring**: latency per stage, GPU utilisation, cache hit rate, refusal rate, safety flags.

**10×**: more routing to small models, more caching, regional serving clusters, capacity planning per model.
--- steer
Q: A conversation is 300 turns long. What do you send to the model?
A: Recent turns + running summary + retrieved older turns + memory, within a token budget.
Q: GPU costs are too high.
A: Routing to smaller models, prefix caching with sticky routing, quantisation, batching.
Q: A web page tells the assistant to reveal the user's memory.
A: Indirect injection: fetched content is data, tools are scoped, sensitive actions need confirmation.
Q: How do you know a new model is better?
A: Capability suites, calibrated pairwise judging, human eval, A/B with retention.
--- pitfalls
- Sending the whole history until the window overflows
- One model size for every request
- No prefix caching or batching
- Storing memory without user control
- Trusting web content as instructions
--- level
- **L4**: chat API with a model and conversation storage.
- **L5**: context budgeting with summaries and retrieval, routing, continuous batching and prefix caching, memory design with controls, tool use with injection defences, capability evaluation.
- **L6**: fleet capacity planning, multi-region serving, safety strategy, product-level evaluation.
--- nodes
user|Chat app|client|0|160|Streams tokens; uploads files.
gw|Gateway|edge|150|160|Auth, rate limits, abuse checks.
orch|Orchestrator|service|320|160|State, tool routing, prompt assembly within budget.
mem|Memory store|db|320|20|User facts with controls.
conv|Conversation store|db|320|300|Messages, summaries, files.
tools|Tools|ext|500|20|Web search, file retrieval index.
serve|Model serving pools|service|500|160|Continuous batching, paged KV, prefix cache; router by size.
safe|Safety classifiers|service|500|300|Input and output checks.
--- edges
user>gw|message
gw>orch|request
orch>mem|read facts
orch>conv|history
orch>tools|search, files
orch>serve|prompt
serve>safe|output check
safe>user|stream
--- prereqs
context-window, assistant-memory, llm-serving-engines
--- paths
- [deep] Context management :: Recent turns + summary + retrieved older turns + memory under a token budget.
  - The user refers to something from 200 turns ago :: Embedding retrieval over old turns.
- [deep] Serving cost :: Routing, prefix caching with sticky routing, batching, quantisation.
  - First token is slow on long chats :: Prefix cache hits, chunked prefill, smaller model for short turns.
- [deep] Memory across chats :: Extraction, confidence, relevance retrieval, user controls, sensitive data rules.
- [failure] Injection from a fetched web page :: Data not instructions, scoped tools, confirmations.
- [deep] Evaluating a model change :: Capability suites, calibrated judges, human eval, A/B.

=== d-gen-coding-assistant
title: Design an AI coding assistant
topic: ai-agents
tier: 3
est: 60
prompt: Design an AI coding assistant inside an IDE that completes code inline, answers questions about the repository, and can make multi-file changes as an agent, for a company with 50,000 engineers.
--- words
- **Inline completion**: grey text suggested at the cursor, accepted with Tab.
- **Fill-in-the-middle (FIM)**: the model sees code before and after the cursor and fills the gap.
- **Repository context**: relevant code from other files (definitions, similar code) added to the prompt.
- **Agent mode**: the model plans a change, edits files, runs tests and iterates.
- **Acceptance rate / persistence**: how often suggestions are accepted, and how much of the accepted code is still there later.
--- flow
1. **0–5**: modes (completion, chat, agent), languages, latency per mode, security (code must not leave the company), evaluation.
2. **5–12**: requests per second per mode, token costs.
3. **12–20**: APIs, context gathering, code index.
4. **20–35**: architecture per mode; deep dives: context retrieval, latency, agent safety.
5. **35–45**: evaluation and rollout.
--- req
**Functional**: inline FIM completion; chat about the repo with references; agent that edits multiple files, runs tests, and proposes a diff for review.

**Non-functional**: completion < 300 ms p50; chat first token < 1.5 s; code stays inside the company boundary (self-hosted or zero-retention); respects repository permissions; no secrets in prompts or logs.
--- est
- 50K engineers, ~30K active daily; completions fire ~1 per 10 s of typing → peak ~1,500 completion requests/s; most are short (~1.5K input, ~30 output tokens).
- Chat: ~20 per engineer per day → 600K/day; agent tasks: ~2 per engineer per day, each 20–50 model calls.
- Completion needs a small fast model (1–7B) on many replicas; chat and agent use a large model.
--- api
- `POST /complete {file, prefix, suffix, cursor, open_tabs[]}` → completion (cancellable).
- `POST /chat {question, repo, selection}` → stream with file references.
- `POST /agent/tasks {goal, repo, branch}` → task id; events: plan, edits, test runs, final diff.
- **Code index**: per repo, symbol graph (definitions, references), chunk embeddings, kept fresh from commits.
--- hl
1. **IDE plugin**: gathers local context (prefix, suffix, open files, recent edits), debounces, cancels stale requests.
2. **Context service**: adds repository context: definitions of symbols near the cursor (from the symbol graph), similar code chunks (embedding search), respecting permissions; strips secrets.
3. **Completion serving**: small FIM model, speculative decoding, prefix caching per file.
4. **Chat**: retrieval over the code index + large model with citations to files and lines.
5. **Agent runtime**: plan → edit → run tests in a **sandbox** → read failures → iterate, with step and time limits; output is a diff for human review, never a direct push.
--- deep
**Context selection**: the most useful context is definitions of the symbols you're using and similar code; rank snippets and fit them within a small token budget for completion.

**Latency**: tiny model, short outputs, stop at line or block end, cancellation, regional serving.

**Agent safety**: sandboxed execution without production credentials or network access by default; changes as diffs; tests and linters as verifiers; limited steps.

**Security**: secrets scanning on prompts, no training on code without permission, audit logs.
--- wrap
**Evaluation**: offline: execution-based benchmarks (unit tests pass) on internal tasks, FIM exact match on held-out code; agent task success on a curated set of real past issues. Online: acceptance rate, persistence after 30 minutes, chat helpfulness, agent PR merge rate, developer surveys.

**Monitoring**: latency, cancellation rate, acceptance by language.
--- steer
Q: Which context goes into a completion prompt?
A: Prefix/suffix, symbol definitions, similar chunks, recent edits, ranked within a budget.
Q: Acceptance rate is high but engineers delete the code later.
A: Measure persistence; tune for quality over length.
Q: The agent deleted a test to make the suite pass.
A: Verifiers beyond tests, diff review, rules against editing tests unless asked, evaluation for reward hacking.
Q: Code must not leave the company.
A: Self-hosted models or zero-retention contracts, secrets scanning.
--- pitfalls
- One large slow model for inline completion
- Measuring only acceptance rate
- Letting the agent run with production credentials
- Ignoring repository permissions in retrieval
--- level
- **L4**: completion via an LLM API with the current file.
- **L5**: FIM with ranked repository context, mode-specific models and latency design, sandboxed agent loop with verifiers, execution-based and persistence metrics.
- **L6**: org-wide developer productivity measurement, model customisation on internal code, security governance.
--- nodes
ide|IDE plugin|client|0|160|Local context, debounce, cancel.
ctx|Context service|service|180|160|Symbol definitions, similar code, permissions, secret stripping.
idx|Code index|db|180|20|Symbol graph and chunk embeddings per repo.
comp|Completion model|service|380|60|Small FIM model, speculative decoding.
chat|Chat model|service|380|160|Large model with retrieval and citations.
agent|Agent runtime|service|380|290|Plan, edit, test loop with limits.
sbx|Sandbox|worker|580|290|Runs builds and tests without production access.
--- edges
ide>ctx|request
ctx>idx|retrieve
ctx>comp|completion prompt
ctx>chat|chat prompt
ide>agent|task
agent>sbx|run tests
agent~ide|diff for review
--- prereqs
agent-loop-tools, agent-reliability, speculative-decoding
--- paths
- [deep] Context for completion :: Symbol definitions, similar chunks, recent edits, budgeted ranking.
- [deep] Latency of completion :: Small FIM model, short outputs, speculative decoding, cancellation.
- [deep] Agent loop :: Plan, edit, test in a sandbox, iterate with limits, diff review.
  - The agent games the tests :: Extra verifiers, review, rules on editing tests.
- [deep] Measuring value :: Acceptance, persistence, PR merge rate, surveys.
- [failure] Secrets leak into prompts :: Secrets scanning and stripping, audit logs.

=== d-gen-llm-serving
title: Design an LLM inference serving platform
topic: ai-inference
tier: 3
est: 60
prompt: Design an internal platform that serves several open-weight LLMs (8B to 400B parameters) to hundreds of product teams, with low latency, high GPU utilisation and fair sharing.
--- words
- **Prefill and decode**: prefill reads the prompt in one parallel pass; decode generates one token at a time.
- **Continuous batching**: adding and removing requests from the running batch at every decode step.
- **KV cache**: the stored keys and values for every past token; it grows with context and limits batch size.
- **Paged attention**: storing the KV cache in fixed-size pages so memory isn't wasted.
- **TTFT / TPOT**: time to first token and time per output token.
- **Tensor parallelism**: splitting one model's layers across several GPUs.
--- flow
1. **0–5**: models, tenants, SLOs (TTFT, TPOT), traffic shapes (chat vs batch jobs), budgets.
2. **5–15**: memory and throughput maths: weights, KV cache per token, GPUs per replica, replicas per model.
3. **15–25**: API, scheduler, routing, autoscaling.
4. **25–40**: deep dives: batching and KV memory, prefix caching, prefill/decode split, quantisation, multi-tenancy.
5. **40–60**: failures, monitoring, cost accounting.
--- req
**Functional**: OpenAI-compatible chat/completions API for several models; streaming; batch (offline) jobs; per-tenant quotas; LoRA adapters per tenant on shared base models.

**Non-functional**: interactive: TTFT < 500 ms p50 / 2 s p95 for 2K-token prompts, TPOT < 50 ms; high GPU utilisation (>60%); isolation so one tenant can't starve others; cost visible per tenant.
--- est
- **70B model in FP16**: 140 GB weights → at least 2 × 80 GB GPUs; use 4 (tensor parallel) to leave room for KV cache.
- **KV cache per token** (70B, 80 layers, GQA with 8 KV heads × 128 dims): 2 × 80 × 8 × 128 × 2 bytes ≈ 330 KB/token → 4K-token context ≈ 1.3 GB per sequence. With ~180 GB free across 4 GPUs → ~130 concurrent 4K sequences.
- **Decode** is memory-bandwidth bound: each step reads all weights (~140 GB over ~4 × 3 TB/s) → ~12 ms per step for the whole batch → ~80 tokens/s per sequence, ×100 sequences ≈ 8K tokens/s per replica.
- Demand: 20K output tokens/s peak for this model → ~3 replicas + headroom → ~16 GPUs.
--- api
- `POST /v1/chat/completions {model, messages, max_tokens, stream, adapter?}` with tenant API keys.
- `POST /v1/batches` for offline jobs at lower priority.
- Admin: model registry (weights, quantisation, parallelism config), tenant quotas (tokens/min, concurrency), priority classes.
--- hl
1. **Gateway**: auth, quota checks (token buckets per tenant), request validation, cost metering.
2. **Router**: picks a replica per model with load-aware routing (queue depth, KV memory free) and **prefix affinity** (same system prompt → same replica for cache hits).
3. **Model servers** (vLLM-style engines): continuous batching, paged KV cache, prefix caching, chunked prefill, speculative decoding; tensor parallel within a node.
4. **Scheduler and autoscaler**: scales replicas on queue depth and KV utilisation; batch jobs fill idle capacity and are preempted for interactive traffic.
5. **Model store**: weights in object storage, cached on local NVMe for fast replica start.
--- deep
**Batching vs latency**: bigger batches raise throughput but slow each step; cap batch by a TPOT SLO; separate interactive and batch priority classes.

**Prefill/decode interference**: long prefills stall decodes; chunked prefill interleaves them; at large scale, **disaggregate** prefill and decode onto different GPU pools and move the KV cache between them.

**Memory**: paged KV avoids fragmentation; preempt or swap sequences to CPU when memory runs out; quantised KV cache (FP8) doubles capacity.

**Multi-tenant LoRA**: many adapters on one base model, batched together (multi-LoRA kernels); load adapters on demand.

**Quantisation**: INT8/FP8 weights halve memory and speed up decode with small quality loss; evaluate per model on tenant tasks.
--- wrap
**Failures**: GPU or node failure → requests on that replica fail fast and retry elsewhere (idempotent for non-streamed; streamed ones restart); slow replica start → keep warm spares and local weight caches.

**Monitoring**: TTFT and TPOT percentiles per tenant and model, queue time, GPU utilisation, KV utilisation, cache hit rate, tokens per tenant for chargeback.

**Cost**: per-tenant token metering, batch discounts, right-sizing models (route to smaller ones).
--- steer
Q: How many GPUs for a 70B model?
A: Weights + KV cache per token × concurrency, then decode bandwidth for throughput: work through the numbers.
Q: Long prompts make other users' streams stutter.
A: Chunked prefill, priority, prefill/decode disaggregation.
Q: One tenant's batch job eats all capacity.
A: Quotas, priority classes, preemption.
Q: How do you improve the cache hit rate?
A: Prefix-affinity routing and longer common prefixes.
--- pitfalls
- Sizing GPUs by weights only, forgetting the KV cache
- Static batching
- One queue for interactive and batch traffic
- Random routing that destroys prefix cache hits
--- level
- **L4**: model servers behind a load balancer with autoscaling.
- **L5**: KV-cache memory maths, continuous batching with SLO-aware caps, prefix-affinity routing, chunked prefill, quotas and priority classes, multi-LoRA.
- **L6**: fleet-level capacity planning across models and regions, disaggregated serving, hardware choices.
--- nodes
apps|Product teams|client|0|160|Call the OpenAI-compatible API.
gw|Gateway|edge|170|160|Auth, quotas, metering.
rt|Router|service|340|160|Load- and prefix-aware replica choice.
srv|Model servers|service|520|160|Continuous batching, paged KV, prefix cache, TP within node.
sched|Scheduler / autoscaler|worker|520|20|Scales on queue and KV usage; batch jobs fill gaps.
store|Model store|store|700|20|Weights, adapters; NVMe caches.
mon|Metrics|queue|520|300|TTFT, TPOT, utilisation, tokens per tenant.
--- edges
apps>gw|request
gw>rt|admitted
rt>srv|route
sched~srv|scale
store~srv|load weights
srv~mon|metrics
--- prereqs
kv-cache, llm-serving-engines, quantization, latency-cost
--- paths
- [deep] Capacity maths :: Weights + KV per token × concurrency; decode bandwidth bound; replicas.
- [deep] Batching and SLOs :: Continuous batching capped by TPOT; priorities for interactive vs batch.
  - Long prompts stall decodes :: Chunked prefill; prefill/decode disaggregation.
- [deep] Routing :: Load-aware with prefix affinity for cache hits.
- [deep] Multi-tenancy :: Quotas, preemption, multi-LoRA batching, chargeback.
- [failure] A GPU node dies mid-stream :: Fail fast, retry on another replica, warm spares.

=== d-gen-text-to-image
title: Design a text-to-image generation service
topic: ai-generative-images
tier: 3
est: 60
prompt: Design a service where users type a prompt and get four generated images in a few seconds, at a scale of 10 million images a day, with safety controls.
--- words
- **Diffusion model**: starts from noise and removes it step by step, guided by the text, until an image appears.
- **Latent diffusion**: diffusion runs on a small compressed representation; a decoder turns it into pixels.
- **Classifier-free guidance (CFG)**: mixing predictions with and without the prompt to follow the prompt more strongly.
- **Sampling steps**: denoising iterations; fewer steps are faster but can lower quality (distilled models need 1–4).
- **Safety classifier**: checks prompts and generated images for disallowed content.
--- flow
1. **0–5**: features (generate, variations, edit), latency (<5 s), resolution, safety rules, cost.
2. **5–12**: requests, GPU seconds per image, GPU count.
3. **12–20**: API, job queue, storage.
4. **20–35**: pipeline: prompt safety → text encoder → diffusion on GPUs → decoder → image safety → storage/CDN; deep dives: latency, batching, safety.
5. **35–45**: evaluation, monitoring, cost.
--- req
**Functional**: generate 4 images per prompt at 1024²; variations and inpainting; history per user; downloads.

**Non-functional**: p50 < 5 s per batch of 4; disallowed content blocked (sexual content involving minors must be zero, plus real-person and violence policies); watermarking/provenance metadata; cost per image within budget.
--- est
- 10M images/day ≈ 2.5M requests/day ≈ 30/s average, ~100/s peak.
- A latent diffusion model at 1024² with 30 steps: ~2–3 s on one modern GPU for a batch of 4; distilled 4-step model: ~0.5 s.
- With 30 steps: 100 req/s × 2.5 GPU-s ≈ **250 GPUs at peak** (plus headroom); with a distilled model ~50.
--- api
- `POST /images {prompt, n=4, size, seed?, style?}` → job id; `GET /images/jobs/{id}` or a websocket for progress and results.
- Storage: images in object storage behind a CDN; metadata (prompt, seed, model version, safety scores, provenance) in a database.
--- hl
1. **Gateway**: auth, quotas, rate limits.
2. **Prompt safety**: classifier and blocklists; prompt rewriting (expand short prompts) with a small LLM.
3. **Queue + GPU workers**: workers batch compatible requests (same size and step count); text encoder → diffusion steps with CFG → VAE decoder → optional upscaler.
4. **Image safety**: classifier on outputs (nudity, violence, minors, real people), block or blur.
5. **Delivery**: watermark and metadata, store, return CDN URLs.
--- deep
**Latency**: distilled few-step models, compile and use FP16/FP8, batch 4 images as one batch, keep models warm; show progress previews.

**Throughput and cost**: dynamic batching by resolution, autoscale on queue depth, cheaper GPUs for upscaling, cache results for identical (prompt, seed) pairs.

**Safety in layers**: prompt filters (cheap, early), concept-erased or safety-tuned model weights, output classifiers; human review of appeals; real-person likeness rules.

**Quality**: CFG scale tuning, prompt expansion, user feedback for preference fine-tuning.
--- wrap
**Evaluation**: FID and CLIP score as rough offline checks; human preference side-by-side as the real bar; safety red-teaming sets with zero-tolerance categories.

**Monitoring**: queue wait, GPU utilisation, block rates by category, user downloads and regenerations as quality signals.
--- steer
Q: How many GPUs?
A: GPU-seconds per request × peak QPS × headroom; few-step distillation changes it 5×.
Q: Someone tries to generate images of a real politician in a fake scene.
A: Prompt and output classifiers for real people, policy, provenance watermarking.
Q: p95 latency is 15 s at peak.
A: Queueing: autoscale, batching, priority tiers, fewer steps.
--- pitfalls
- Only filtering prompts (outputs can still violate)
- No batching on GPUs
- Treating FID as the quality metric
- No provenance or watermarking
--- level
- **L4**: queue + GPU workers running a diffusion model.
- **L5**: GPU capacity maths, distillation and batching for latency, layered safety, provenance, human preference evaluation.
- **L6**: model training strategy, policy and legal questions, cost model across products.
--- nodes
user|App|client|0|160|Prompt; progress and results.
gw|Gateway|edge|160|160|Auth, quotas.
ps|Prompt safety + rewrite|service|320|160|Classifier, blocklists, prompt expansion.
q|Job queue|queue|480|160|Batches by size and steps.
gpu|GPU workers|worker|640|160|Text encoder → diffusion → decoder → upscaler.
is|Image safety|service|640|20|Output classifiers.
cdn|Storage + CDN|store|640|300|Images, watermark and metadata.
--- edges
user>gw|prompt
gw>ps|check
ps>q|job
q>gpu|batch
gpu>is|images
is>cdn|store
cdn~user|URLs
--- prereqs
diffusion-models, vit-clip
--- paths
- [deep] GPU capacity :: GPU-seconds per request × QPS; steps and distillation; batching.
- [deep] Latency :: Few-step models, FP16/FP8, warm workers, progress previews.
- [deep] Safety layers :: Prompt filters, safety-tuned weights, output classifiers, provenance.
  - Real-person deepfake attempts :: Likeness detection, policy, watermarking.
- [failure] Queue backs up at peak :: Autoscaling, priorities, fewer steps under load.
