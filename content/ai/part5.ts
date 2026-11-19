import { Q, T } from "../h";
import type { Topic } from "@/lib/types";
import { md } from "./md";

export const aiTopics5: Topic[] = [
  T("ai", "ai-generative-images", "Generating images: GANs, VAEs and diffusion", 2, 35, "The generator-discriminator game and mode collapse, then diffusion: noising, denoising, latent diffusion, text conditioning and classifier-free guidance.", {
    signals: ["Text-to-image or image editing features", "Synthetic data generation", "Explaining how Imagen, Stable Diffusion or Veo work"],
    prereq: ["ai-cnn", "ai-transformers"],
    viz: "diffusion",
    lesson: md`A **generative model** learns the distribution of its training data well enough to draw *new* samples from it. For images, three families matter.

## GANs: a forger and a detective

:::story 2014 · Les 3 Brasseurs, Montreal
Ian Goodfellow was at a bar with fellow PhD students debating how to make a network generate realistic images. His idea: pit two networks against each other. He went home, coded it that night, and it worked on the first try. The paper became one of the most cited in deep learning, and Yann LeCun called adversarial training "the most interesting idea in the last ten years in machine learning".
:::

- The **generator** $G$ maps random noise $z \sim p_z$ to a fake sample $G(z)$.
- The **discriminator** $D$ outputs the probability that its input is real.
- They play a **minimax game**:

$$
\min_G \max_D \; V(D, G) = \mathbb{E}_{x \sim p_{data}}[\log D(x)] + \mathbb{E}_{z \sim p_z}[\log(1 - D(G(z)))]
$$

**Training loop:** sample real images and noise; update $D$ to tell them apart (gradient ascent on $V$); sample fresh noise; update $G$ to fool $D$. In practice $G$ maximises $\log D(G(z))$ instead of minimising $\log(1 - D(G(z)))$, the **non-saturating** loss, because early on $D$ wins easily and the original loss gives $G$ almost no gradient.

**DCGAN** (2015) made GANs stable with convolutional generators (transposed convolutions), batch norm and a few architectural rules; the course trains one on CIFAR-10 and compares real and generated images as training progresses. **StyleGAN** later produced the photorealistic faces of *thispersondoesnotexist.com*.

:::warn Mode collapse
The generator finds a few outputs that fool the discriminator and produces only those: a thousand noise vectors, ten nearly identical faces. Check diversity across generated batches; remedies include minibatch discrimination, Wasserstein losses and careful balancing of the two networks. Training instability and mode collapse are a big reason diffusion took over.
:::

## VAEs in one paragraph

A **variational autoencoder** encodes an image into a distribution over a small latent space and decodes samples back, trained to reconstruct well while keeping the latent space smooth. VAEs alone give blurry images, but their **encoder-decoder** is a key part of latent diffusion.

## Diffusion: learn to remove noise

**Forward process** (fixed, no learning): add a little Gaussian noise over $T$ steps (often 1,000) until the image is pure static. A closed form jumps straight to any step:

$$
x_t = \sqrt{\bar{\alpha}_t}\, x_0 + \sqrt{1 - \bar{\alpha}_t}\, \epsilon, \qquad \epsilon \sim \mathcal{N}(0, I)
$$

**Training:** pick an image, a random step $t$, and noise $\epsilon$; build $x_t$; train a network $\epsilon_\theta(x_t, t)$ to **predict the noise**, with a simple mean-squared-error loss. That's it (DDPM, 2020).

**Generation:** start from pure noise and repeatedly subtract a bit of the predicted noise. Coarse shapes appear first, fine details last.

[[widget:diffusion]]

## What makes modern systems work

- **Latent diffusion** (the "Stable Diffusion" paper, 2022): run diffusion in the small latent space of a VAE (for example 64×64×4 instead of 512×512×3), then decode. Roughly 50× fewer pixels to process, which made high-resolution generation run on consumer GPUs.
- **Text conditioning:** encode the prompt with a text model (CLIP's text encoder, or a large language model's encoder as in Google's **Imagen**, which found a bigger text encoder mattered more than a bigger image model) and let the denoiser read it through **cross-attention**.
- **Classifier-free guidance (CFG):** during training sometimes drop the prompt; at sampling, compute both the conditional and unconditional noise predictions and extrapolate: $\hat{\epsilon} = \epsilon_{uncond} + w\,(\epsilon_{cond} - \epsilon_{uncond})$. Higher $w$ follows the prompt more closely but oversaturates and loses diversity; around 5 to 8 is typical.
- **Samplers and steps:** DDIM and newer solvers need 20 to 50 steps instead of 1,000; distilled models generate in 1 to 4.
- **Architectures:** U-Nets with attention, increasingly replaced by **diffusion Transformers** (DiT), which scale like LLMs. Video models such as Veo and Sora extend the same ideas through time; **flow matching** is a close cousin that learns straight paths from noise to data.

:::news Art, prizes and lawsuits
In 2022 an image made with Midjourney won first place in the digital art category at the Colorado State Fair, sparking a furious debate. Generated images have since raised real questions about artists' consent and copyright, deepfakes and misinformation. Google watermarks images, audio and video from its models with **SynthID**, an invisible signal designed to survive cropping and compression.
:::

## Seeing it in code

\`\`\`python
from diffusers import StableDiffusionPipeline
pipe = StableDiffusionPipeline.from_pretrained("stabilityai/stable-diffusion-2-1").to("cuda")
image = pipe("an astronaut riding a horse, watercolour", num_inference_steps=30, guidance_scale=7.5).images[0]
\`\`\`

The same Hugging Face pipelines also run object detection, segmentation, text generation and audio generation in a few lines, a good way to get hands-on fast.

:::tip Interview angle
For an image-generation product, talk about: latency (steps, distillation, GPU type), cost per image, safety (prompt and output classifiers, blocklists, watermarking), abuse (deepfakes of real people), copyright and opt-outs, and evaluation (human preference ratings, prompt adherence, diversity, FID as a rough offline metric).
:::`,
    pitfalls: [
      "Explaining diffusion as “the model draws the image” instead of iterative denoising",
      "Forgetting the non-saturating generator loss in GANs",
      "Cranking guidance scale up and wondering why images look over-cooked",
      "Ignoring watermarking, safety filters and likeness abuse in product designs",
    ],
    quiz: [
      Q("What is a diffusion model trained to predict?", ["The final image directly", "*The noise that was added to an image at a given timestep", "The text prompt", "The discriminator's output"], "A simple MSE loss on predicted vs actual noise."),
      Q("What is mode collapse in a GAN?", ["The discriminator stops training", "*The generator produces only a few similar outputs, losing diversity", "Images become too noisy", "The loss becomes negative"], "It fools the discriminator with a narrow set of samples."),
      Q("Why does latent diffusion run in a VAE's latent space?", ["Better colours", "*Far fewer dimensions to denoise, so it's much faster and cheaper", "It removes the need for text", "It avoids attention"], "64×64×4 latents instead of full-resolution pixels."),
      Q("What does raising the classifier-free guidance scale do?", ["Adds more steps", "*Follows the prompt more strongly at the cost of diversity and, eventually, oversaturation", "Lowers resolution", "Disables the text encoder"], "It extrapolates from the unconditional toward the conditional prediction."),
    ],
  }),

  T("ai", "ai-inference", "Serving LLMs: latency, memory and cost", 2, 40, "Prefill vs decode, the KV cache, GPU memory sizing, batching, PagedAttention, FlashAttention, quantisation, speculative decoding, mixture of experts and TPUs.", {
    signals: ["Sizing GPUs or estimating serving cost", "Latency targets for an LLM feature", "Choosing between a hosted API and self-hosting an open model"],
    prereq: ["ai-transformers", "ai-decoding"],
    viz: "vram",
    lesson: md`Training happens once; inference happens on every request, forever. For most products, **serving cost and latency** decide what's possible.

## Two phases with different bottlenecks

- **Prefill:** process the whole prompt in parallel and build the KV cache. **Compute-bound**: big matrix multiplications that keep the GPU busy. It determines **time to first token (TTFT)**.
- **Decode:** generate tokens one at a time, each needing the full set of weights and the KV cache read from memory. **Memory-bandwidth-bound**: the GPU spends most of its time waiting on memory. It determines **time per output token (TPOT)** and therefore total latency.

Rule of thumb for a single request: decode speed ≈ memory bandwidth / bytes read per token. A 13B model in FP16 (26 GB) on a GPU with ~3 TB/s bandwidth tops out around 100 tokens per second for one stream, which is why **batching** many requests together is essential: the weights are read once per step for the whole batch.

## Sizing GPU memory

$$
\text{VRAM} = (M + K \times C \times U + A) \times 1.10
$$

- $M$ = weights: parameters × bytes per parameter (FP32 = 4, FP16/BF16 = 2, INT8 = 1, INT4 = 0.5). A 13B model is about **26 GB in FP16** or **6.5 GB in INT4**; roughly 2 GB per billion parameters in FP16.
- $K$ = KV cache per 1,000 tokens: per token, $2 \times \text{layers} \times \text{hidden size} \times \text{bytes}$ (the 2 is for keys and values). For a 13B model (40 layers, hidden 5,120, FP16): about **0.8 MB per token ≈ 0.8 GB per 1K tokens**.
- $C$ = worst-case context in thousands of tokens (prompt + reply); $U$ = **concurrent** sessions (not total users).
- $A$ = activations and working memory; 10% reserve for the framework and fragmentation.

[[widget:vram]]

:::warn The KV cache, not the weights, is usually the problem
The worked example: 13B FP16, 20 concurrent requests of 52K tokens each, $A \approx 4$ GB: $26 + 0.8 \times 52 \times 20 + 4 = 862$ GB, about **950 GB** with overhead. The KV cache is about 96% of the memory before overhead. Doubling context *or* concurrent users doubles the KV memory; doubling both quadruples it. Concurrent users = total users × daily-active share × peak-hour share × session overlap; internal tools often see 5 to 15% of headcount active at once.
:::

## The serving toolbox

- **Continuous batching:** instead of waiting for a whole batch to finish, add and remove requests every decoding step. Big throughput gains.
- **PagedAttention** (vLLM, 2023): store the KV cache in fixed-size pages like virtual memory, eliminating fragmentation and letting requests share prefixes.
- **Prefix / prompt caching:** reuse the KV cache of a shared prompt prefix (system prompt, documents) across requests.
- **FlashAttention:** exact attention computed in tiles in fast on-chip memory, avoiding reading and writing the full attention matrix.
- **Grouped-query attention:** fewer key/value heads → a KV cache several times smaller.
- **Quantisation:** store weights (and sometimes the KV cache) in INT8 or INT4 (GPTQ, AWQ). Huge memory and bandwidth savings for a small quality cost; measure it on your evals.
- **Speculative decoding** (Google, 2022): a small draft model proposes several tokens, the big model verifies them in one parallel pass and keeps the ones it agrees with. Same output distribution, 2 to 3 times faster.
- **Mixture of experts (MoE):** many expert MLPs per layer, a router sends each token to only a couple. Total parameters are huge, compute per token is small; but all experts must sit in memory. Google's Switch Transformer and GLaM pioneered it; many frontier models use it.
- **Distillation and smaller models:** often the biggest win of all.

:::dyk
Google designed its own accelerator, the **TPU**, after a 2013 estimate that if every Android user used voice search for just three minutes a day, Google would need to **double its datacentres**. The first TPUs went into production in 2015. Gemini is trained and served on TPU pods; recent generations (Trillium, Ironwood) are designed with inference in mind.
:::

## Measuring and budgeting

Track **TTFT**, **TPOT** (or tokens per second), end-to-end latency at p50 and p99, throughput (requests or tokens per second per GPU), and **cost per 1,000 requests**. Stream tokens to the user: perceived latency is TTFT, not total time.

| Lever | Helps | Costs |
|---|---|---|
| Smaller / distilled model | Everything | Some quality |
| Quantisation | Memory, bandwidth, cost | Small quality risk |
| Shorter prompts, caching | TTFT, cost | Engineering effort |
| Batching | Throughput, cost | Per-request latency |
| Speculative decoding | Latency | A draft model to run |
| Shorter outputs | Latency, cost | Product constraints |

:::tip API or self-host?
Hosted APIs: no ops, best models, pay per token, data-handling terms to check. Self-hosting open models: control, privacy, predictable cost at high volume, but you own GPUs, scaling, upgrades and safety. A common answer: start with an API, measure volume and latency, and move hot, narrow paths to a fine-tuned small model you host once the numbers justify it.
:::`,
    pitfalls: [
      "Sizing only for model weights and forgetting the KV cache",
      "Using total users instead of concurrent sessions",
      "Assuming decode is compute-bound (it is memory-bandwidth-bound)",
      "Quantising without measuring quality on your own evals",
      "Reporting average latency instead of p99 and time to first token",
    ],
    quiz: [
      Q("Why is the decode phase memory-bandwidth-bound?", ["It uses large matrices", "*Each new token requires reading all weights and the KV cache for very little computation", "It runs on the CPU", "Tokens are large"], "Batching amortises those reads across many requests."),
      Q("A 13B model in INT4 needs roughly how much memory for weights?", ["26 GB", "13 GB", "*6.5 GB", "52 GB"], "13 × 10⁹ × 0.5 bytes."),
      Q("Doubling both context length and concurrent users does what to KV-cache memory?", ["Doubles it", "*Quadruples it", "No change", "Halves it"], "KV memory ∝ context × users."),
      Q("What does speculative decoding rely on?", ["A larger model", "*A small draft model proposing tokens that the big model verifies in parallel", "Higher temperature", "Quantisation"], "Accepted drafts skip sequential big-model steps without changing the output distribution."),
    ],
  }),

  T("ai", "ai-evals", "Evaluating LLM systems", 1, 35, "Benchmarks and their limits, golden datasets, LLM-as-judge and its biases, RAG and agent evals, online metrics and A/B tests, and evals as the core of iteration.", {
    signals: ["“How would you know it works?” in any AI design", "Comparing prompts, models or retrieval settings", "A model upgrade or prompt change before launch"],
    prereq: ["ai-metrics", "ai-prompting"],
    lesson: md`Ask experienced AI engineers what separates working products from demos and you'll hear one word: **evals**. LLM outputs are open-ended and non-deterministic, so "it looked good on the five examples I tried" is how teams ship regressions.

## Public benchmarks: useful, but not your eval

| Benchmark | Tests |
|---|---|
| MMLU (and MMLU-Pro) | Multiple-choice knowledge across 57 subjects |
| GPQA | "Google-proof" graduate-level science questions |
| HumanEval, LiveCodeBench | Writing functions that pass unit tests |
| SWE-bench Verified | Fixing real GitHub issues in real repositories |
| MATH, AIME | Competition mathematics |
| ARC-AGI | Novel visual puzzles designed to resist memorisation |
| Humanity's Last Exam | Very hard expert questions across fields |
| LMArena (Chatbot Arena) | Crowd-sourced head-to-head human preference votes |

:::warn Goodhart's law and contamination
"When a measure becomes a target, it ceases to be a good measure." Benchmarks saturate, leak into training data (**contamination**), and get optimised for. A model topping a leaderboard can still fail on your task. Use benchmarks to shortlist models; use **your own eval set** to decide.
:::

## Build a golden dataset

- **50 to 500 examples** drawn from real (or realistic) inputs, including edge cases, adversarial inputs and known past failures.
- For each, the expected output or a **rubric** of what a good answer must contain or avoid.
- Version it; add every production bug as a new case (regression tests for behaviour).
- Slice it: by user segment, language, input length, difficulty, so an average can't hide a broken slice.

## Grading methods, cheapest first

1. **Code-based checks:** exact match, regex, JSON schema validity, unit tests for generated code, "does the SQL run and return the right rows".
2. **Reference-based metrics:** BLEU and ROUGE for overlap (weak for open-ended text), embedding similarity.
3. **LLM-as-judge:** a strong model grades outputs against a rubric, or compares two outputs pairwise.
4. **Human evaluation:** the gold standard for nuanced quality; expensive, so use it to calibrate the judge.

### LLM-as-judge has biases

- **Position bias:** prefers whichever answer comes first (or second). Randomise and test both orders.
- **Verbosity bias:** prefers longer answers.
- **Self-preference:** favours outputs from its own model family.
- **Leniency and drift:** scores inflate, and change when the judge model is updated.

Mitigate with specific rubrics (binary or 1-to-4 criteria, not "rate quality 1 to 10"), few-shot graded examples, asking for reasoning before the score, and periodic agreement checks against human labels.

## Evaluating RAG and agents

- **RAG:** retrieval (precision@k, recall@k, MRR on labelled relevant chunks) and generation (**faithfulness** to the context, **answer relevancy**, correctness) separately, so you know which half to fix.
- **Agents:** task success on realistic tasks with automatic end-state checks, steps and tokens per task, tool-call validity, robustness to injected failures, cost and latency. Run each task several times: agents are stochastic, so report pass rates (pass@k, or pass^k for "succeeds every time").

## Online: does it work for real users?

Offline evals gate releases; online metrics confirm value:

- **A/B tests** on product metrics: task completion, retention, time saved, escalation-to-human rate.
- **Implicit signals:** thumbs up/down, copy or accept rates (for code suggestions), regenerations, edits after acceptance.
- **Guardrail metrics:** refusal rate, safety-filter triggers, hallucination reports, latency p99, cost per request.
- **Monitoring for drift:** input distributions change; providers update models; your eval scores should be tracked over time.

:::dyk
Google's long-running Search quality programme uses thousands of trained human **raters** following a public guidelines document, well over a hundred pages long, to judge result quality. Their ratings don't rank pages directly; they evaluate whether proposed changes to the ranking systems make results better. That is evals-as-a-discipline, decades before LLMs.
:::

:::tip The eval-driven loop (say this in interviews)
"Define success with the product team, build a golden set, set up automated graders and a calibrated LLM judge, and run the suite on every prompt, model or retrieval change, like CI. Ship behind a flag, A/B test on product metrics, monitor guardrails, and feed production failures back into the golden set."
:::`,
    pitfalls: [
      "Choosing a model from leaderboard rank alone",
      "Vibe-checking a handful of examples instead of a versioned eval set",
      "Trusting an LLM judge without checking agreement with humans",
      "Reporting only averages and missing a broken slice",
      "Evaluating a stochastic agent with a single run per task",
    ],
    quiz: [
      Q("What is benchmark contamination?", ["Noisy labels", "*Test questions appearing in the model's training data, inflating scores", "Slow evaluation", "Using too many benchmarks"], "Memorised answers aren't capability."),
      Q("Which is a known bias of LLM-as-judge?", ["Prefers shorter answers", "*Position bias: favouring an answer because of where it appears", "Always agrees with humans", "Can't read JSON"], "Randomise order and evaluate both orders."),
      Q("Your RAG system gives wrong answers. What should evals separate first?", ["Latency vs cost", "*Retrieval quality vs generation faithfulness", "Prompt length vs temperature", "Model size vs vocabulary"], "You need to know whether the right context was retrieved at all."),
    ],
  }),

  T("ai", "ai-safety", "Safety, security and responsible AI", 1, 35, "Hallucinations and how to reduce them, prompt injection and jailbreaks, data leakage, guardrails, bias, privacy, watermarking and Google's AI principles.", {
    signals: ["Any user-facing LLM feature", "An agent that reads external content or takes actions", "Regulated domains: health, finance, legal, children"],
    prereq: ["ai-prompting", "ai-agents"],
    lesson: md`Every LLM product is also a security and trust problem. Interviewers increasingly expect SWE candidates, not just ML specialists, to raise these issues unprompted.

## Hallucination

The model states something false with confidence. Causes: it was trained to produce *plausible* text; missing or stale knowledge; ambiguous questions; pressure to always answer; and errors compounding over long outputs.

:::story Mata v. Avianca
In 2023 a New York lawyer filed a brief citing six court decisions that did not exist. ChatGPT had invented them, complete with quotes and docket numbers, and when he asked whether they were real, it assured him they were. The judge sanctioned the lawyers. The model behaved exactly as designed; the **system** had no grounding and no verification.
:::

**Reduce it with:** retrieval and citations (and checking that citations support the claim), an explicit "I don't know" path, lower temperature for factual tasks, tools for facts and arithmetic, constrained outputs, self-checks or a verifier model, and **human review for consequential output**. You can reduce hallucinations a lot; you can't promise zero.

:::news Who's liable for the chatbot?
In 2024 a Canadian tribunal ordered Air Canada to honour a bereavement-fare refund its website chatbot had invented. The airline argued the chatbot was "a separate legal entity responsible for its own actions". The tribunal disagreed: a company is responsible for all the information on its website, chatbot included.
:::

## Prompt injection: the defining security problem of LLM apps

LLMs can't reliably tell **instructions** from **data**, because both are just tokens.

- **Direct injection / jailbreaks:** the user tries to override the rules ("ignore previous instructions", role-play framings like the infamous "DAN" and "grandma" prompts, encoded or translated requests, adversarial suffixes found by optimisation).
- **Indirect injection:** instructions hidden in content the model reads: a web page, an email, a PDF, a calendar invite, an image, a tool description. The user never sees them. This is the dangerous one for agents.

**Defences (layered, none sufficient alone):**
- Treat all retrieved and tool content as **untrusted data**: delimit it and instruct the model accordingly.
- **Least privilege:** tools scoped to the user's permissions; read-only where possible.
- **Human approval** for side effects (sending, paying, deleting, sharing).
- Break the **lethal trifecta**: don't combine private data, untrusted input and an exfiltration channel (outbound requests, rendering arbitrary image URLs, sending email) without controls.
- Input and output **classifiers** (prompt-injection detectors, safety filters), allow-lists for URLs and tools.
- Architectural patterns that keep a privileged planner from ever reading untrusted text directly (a quarantined model processes it and returns only constrained values).

## Data leakage and privacy

- **Training-data extraction:** models can regurgitate memorised text, occasionally including personal data.
- **Your inputs:** in 2023 Samsung engineers pasted proprietary source code into a public chatbot; Samsung then restricted generative AI use. Know your provider's data retention and training terms, and use enterprise agreements or self-hosting for sensitive data.
- **Cross-user leakage:** caches, shared memories or RAG indexes that ignore permissions can show one user another's data. Enforce access control at retrieval time.
- **System prompt leakage:** assume users can extract your system prompt; never put secrets in it.
- Minimise PII in prompts and logs; redact where you can; honour deletion requests across logs, memories and indexes.

## Guardrails in a production stack

\`\`\`text
user input → input checks (PII, abuse, injection, topic) → model (with grounded context, scoped tools)
          → output checks (safety, PII, policy, schema, citation support) → user
          + human approval for actions + logging and monitoring + rate limits and abuse detection
\`\`\`

## Bias and fairness

Models learn the biases in their data. Evaluate outputs across groups (names, dialects, languages, demographics), especially for anything that ranks or judges people: hiring, lending, moderation. Tokenisation alone can make non-English users pay more for worse results.

:::dyk
Google's **AI Principles** were first published in 2018 and revised in 2025. The original seven objectives: be socially beneficial, avoid creating or reinforcing unfair bias, be built and tested for safety, be accountable to people, incorporate privacy design principles, uphold high standards of scientific excellence, and be made available for uses that accord with these principles. The 2025 version reorganises them around bold innovation, responsible development and deployment, and collaborative progress. Interviewers at Google may ask how your design respects them, so name concrete practices: evaluations across groups, human oversight, privacy by design, red-teaming.
:::

## Provenance and misuse

**SynthID** (Google DeepMind) embeds an invisible, robust watermark in AI-generated images, audio, video and text, and Google has open-sourced the text version. Industry content-credential standards (C2PA) attach signed provenance metadata. Neither is foolproof, but they raise the cost of passing off synthetic media as real.

## Red-teaming

Before launch, have people (and automated attackers) try to break it: jailbreaks, injections, harmful content, privacy extraction, misuse scenarios specific to your product. Turn every success into an eval case and a fix.

:::tip What strong candidates say
"I'd assume prompt injection will happen and design so that a successful injection can't do much: least-privilege tools, approval for side effects, no secrets in prompts, permission-aware retrieval, output validation, and monitoring. For hallucinations: grounding with citations, abstention, and human review where errors are costly."
:::`,
    pitfalls: [
      "Believing a well-written system prompt prevents injection",
      "Giving agents broad credentials and no approval step for side effects",
      "Putting secrets or internal URLs in system prompts",
      "Ignoring permissions in shared RAG indexes and caches",
      "Promising zero hallucinations instead of designing for detection and review",
    ],
    quiz: [
      Q("What makes indirect prompt injection especially dangerous for agents?", ["It is always visible to the user", "*Malicious instructions arrive inside content the agent reads (web pages, emails, docs)", "It only affects image models", "It requires model weights"], "The user never typed it, and the agent may act on it."),
      Q("Which control limits the damage of a successful injection most directly?", ["A longer system prompt", "*Least-privilege tools plus human approval for side effects", "Higher temperature", "A bigger model"], "Assume compromise; constrain what a compromised agent can do."),
      Q("What did the Air Canada chatbot case establish?", ["Chatbots are separate legal entities", "*A company is responsible for what its chatbot tells customers", "Chatbots can't give refunds", "AI output can't be used in court"], "The tribunal ordered the airline to honour the chatbot's promise."),
      Q("Where should you put API secrets for an LLM app?", ["In the system prompt, hidden", "*In server-side code or tool configuration the model never sees", "In few-shot examples", "In the user message"], "Assume prompts can be extracted."),
    ],
  }),

  T("ai", "ai-system-design", "Designing LLM-powered systems (the interview playbook)", 1, 45, "A framework for AI system-design rounds: requirements, model choice, architecture patterns, latency and cost budgets, caching, routing, evaluation, safety and operations.", {
    signals: ["“Design a chatbot / assistant / summariser / copilot for X”", "Adding an AI feature to an existing system design", "Trade-offs between quality, latency and cost"],
    prereq: ["ai-rag", "ai-agents", "ai-evals", "ai-inference", "caching", "rate-limiting-concept"],
    lesson: md`AI system-design questions use the same skills as classic HLD (requirements, estimates, components, trade-offs) plus a handful of AI-specific decisions. Here is a framework that works for "design a support assistant", "design Smart Compose" or "design a code-review bot".

## 1. Requirements: pin down what "good" means

- **The job:** who is the user, what task, what does success look like? ("Agents resolve tickets faster" beats "a chatbot".)
- **Quality bar and failure cost:** is a wrong answer an annoyance or a liability? That decides grounding, abstention and human review.
- **Latency:** autocomplete needs under ~100 ms; chat needs first token under ~1 s; batch summarisation can take minutes.
- **Scale:** requests per second, tokens per request, users and concurrency.
- **Data:** what knowledge, how fresh, who may see what (permissions), privacy and residency.
- **Actions:** read-only answers, or can it change things?

## 2. Estimate tokens, cost and hardware

Tokens per request (prompt + retrieved context + output) × requests per day × price per token, or GPUs from throughput and the VRAM formula. Say the numbers out loud: "50K requests a day × 3K input and 300 output tokens ≈ 150M input and 15M output tokens a day."

## 3. Choose the simplest architecture that works

| Need | Pattern |
|---|---|
| Answer from private, changing knowledge | RAG with hybrid retrieval, reranking and citations |
| Classify, extract, route | A single call with structured output (maybe a fine-tuned small model) |
| Multi-step with known steps | Prompt chaining / workflow |
| Open-ended multi-step with actions | An agent with tools, limits and approvals |
| Very high volume, narrow task | Fine-tuned or distilled small model |

## 4. Draw the components

\`\`\`text
client → API gateway (auth, rate limits, quotas)
       → orchestrator (prompt templates, routing, tool loop, guardrails)
            ├─ retrieval: query rewrite → hybrid search (vector + BM25, permission filters) → reranker
            ├─ model gateway: provider/self-hosted models, fallbacks, retries, timeouts, token accounting
            ├─ tools / MCP servers (scoped credentials, approval for side effects)
            └─ caches: exact/semantic response cache, prompt-prefix cache, embedding cache
       → output checks (schema, safety, PII, citations) → streamed response
offline: ingestion pipeline (parse → chunk → embed → index, incremental) · eval pipeline · feedback store
observability: traces per request (prompts, retrievals, tool calls, tokens, latency, cost)
\`\`\`

## 5. Deep dives interviewers love

- **Model choice and routing:** a cheap, fast model for most traffic and a strong one for hard cases (route on classifier confidence or task type); fallbacks across providers for availability.
- **Latency:** stream tokens; parallelise retrieval and tool calls; cache prompt prefixes; cap output length; pick smaller models for latency-critical paths; precompute where possible (summaries at ingestion time).
- **Caching:** exact-match caches for repeated questions; **semantic caches** (embedding similarity) with care, since a near-duplicate question can need a different answer; never share cached answers across users with different permissions.
- **Freshness:** incremental re-indexing from change events; timestamps on chunks; delete propagation.
- **Quotas and abuse:** per-user token budgets, rate limits by tokens rather than requests (an LLM call's cost varies 100×), abuse detection.
- **Evaluation:** golden set, automated graders and an LLM judge in CI; A/B tests on product metrics; online feedback loops.
- **Safety:** grounding, abstention, injection defences, least privilege, approvals, output filters.
- **Operations:** prompt and model versioning, canary rollouts, monitoring quality and cost over time, handling provider model updates.

:::story A classic: Gmail Smart Compose (2018)
Google needed suggestions to appear **as you type**, within about 100 ms, for over a billion users. A large model was too slow, so the team combined a small, fast language model with the email's subject and previous message as context, served it on TPUs, and spent a lot of effort on **fairness and safety**: they removed gendered pronoun suggestions after finding the model assumed, for example, that an investor was "him". It's still a model answer for latency-driven ML design: small model, rich context, strict latency budget, careful evaluation of harms.
:::

## 6. Wrap up with risks and evolution

What breaks at 10× traffic (cost, GPU capacity, rate limits from providers), how you'd reduce cost (distillation, caching, routing), how quality is monitored, and what you'd build next.

:::tip L4 vs L5 signals
**L4:** a sound RAG or workflow design, sensible model choice, some evaluation and safety. **L5:** quantified latency and cost budgets, routing and fallbacks, a real eval strategy (offline and online), permission-aware retrieval, injection defences with least privilege, and a migration path from API to fine-tuned small models as volume grows, all raised without prompting.
:::`,
    pitfalls: [
      "Starting with “we'll use GPT/Gemini” before requirements and success metrics",
      "No token, cost or latency estimate",
      "Agents everywhere when a workflow or a single call would do",
      "Semantic caches that leak answers across users or permissions",
      "Rate limiting by request count when cost scales with tokens",
      "No evaluation plan beyond “we'll test it”",
    ],
    quiz: [
      Q("Why rate-limit LLM features by tokens rather than by requests?", ["Tokens are easier to count", "*Cost and load vary enormously per request depending on token counts", "Providers require it", "Requests are cached"], "One request can cost 100× another."),
      Q("What's a risk of semantic response caching?", ["It's slow", "*Returning an answer to a similar but different question, or to a user without access", "It uses too many GPUs", "It breaks streaming"], "Similarity ≠ same question; permissions must be part of the cache key."),
      Q("Autocomplete must respond in under 100 ms. Which choice fits?", ["The largest reasoning model", "*A small, fast model with tight context, served close to the user", "An agent with tools", "Self-consistency with 10 samples"], "Latency budgets drive model size."),
    ],
  }),

  T("ai", "ai-at-google", "AI at Google, and AI in your engineering day", 2, 25, "From Brain and DeepMind to Transformers, TPUs, AlphaFold and Gemini; how AI tools change the SWE workflow; and how to talk about it in a Google interview.", {
    signals: ["“Why Google?” and team-match conversations", "Questions about how you use AI tools as an engineer", "Small talk with interviewers about Google's AI work"],
    prereq: ["ai-history"],
    lesson: md`Many of the ideas in this section were invented at Google, and much of what you'd work on there now touches AI. Knowing the story makes your "why Google" answer specific instead of generic.

## Google's AI greatest hits

| Year | Milestone |
|---|---|
| 2011 | **Google Brain** starts as a Google X project (Jeff Dean, Andrew Ng, Greg Corrado) |
| 2012 | The "cat paper": a network watching YouTube frames learns to detect cats on its own |
| 2013 | **word2vec**; Google acquires Hinton's DNNresearch |
| 2014 | Acquires **DeepMind** (London); sequence-to-sequence learning |
| 2015 | **TensorFlow** open-sourced; RankBrain in Search; first TPUs in production |
| 2016 | **AlphaGo** beats Lee Sedol; neural machine translation in Google Translate; TPU announced |
| 2017 | **"Attention Is All You Need"**: the Transformer; AlphaZero |
| 2018 | **BERT**; Smart Compose in Gmail; AI Principles published |
| 2020 | **AlphaFold 2** at CASP14 |
| 2022 | PaLM; LaMDA; Imagen |
| 2023 | Bard; Google Brain + DeepMind merge into **Google DeepMind**; **Gemini 1.0** |
| 2024 | Gemini 1.5 (1M-token context); Gemma open models; AI Overviews; NotebookLM Audio Overviews; **Nobel Prize** for AlphaFold |
| 2025 | Gemini 2.5 and 3; Veo 3; Genie 3; AlphaEvolve; IMO gold with Deep Think; agents in products |

:::story AlphaFold and the Nobel Prize
Proteins fold into 3-D shapes that determine what they do, and working out a single structure experimentally could take years. At the CASP14 competition in 2020, AlphaFold 2 predicted structures with accuracy comparable to experiments, for most targets. DeepMind then released predicted structures for over **200 million proteins**, essentially every known one, free. Demis Hassabis and John Jumper shared the **2024 Nobel Prize in Chemistry** for it (with David Baker, for protein design).
:::

:::dyk
**AlphaEvolve** (2025) pairs Gemini with automated evaluators to evolve better algorithms. It found a way to multiply 4×4 complex-valued matrices with **48 scalar multiplications**, improving on a 1969 result, and a scheduling heuristic for Google's datacentres that recovers about **0.7% of Google's worldwide compute**, continuously. Earlier, **AlphaDev** (2023) discovered faster sorting routines for short sequences that were merged into the LLVM C++ standard library.
:::

## The Jeff Dean facts

A long-running internal joke at Google, in the style of Chuck Norris facts, celebrates Jeff Dean, co-designer of MapReduce, Bigtable, TensorFlow and much more (and now Google's Chief Scientist):

- "Compilers don't warn Jeff Dean. Jeff Dean warns compilers."
- "Jeff Dean's PIN is the last four digits of pi."
- "When Jeff Dean designs software, he first codes the binary and then writes the source as documentation."

If you mention them in an interview, do it lightly, and pair it with something real: his "Numbers Everyone Should Know" latency table is still the best back-of-envelope reference for system design.

## How AI changes the engineering workflow

Google's CEO said in late 2024 that **more than a quarter of all new code at Google** was generated by AI and then reviewed and accepted by engineers; the share has grown since. Across the industry, engineers now use AI for:

- **Code completion and generation** in the editor; whole-feature changes via coding agents in the terminal or IDE.
- **Code review assistance**, test generation, migrations (large automated migrations are a published Google use case), documentation.
- **Understanding unfamiliar code:** "explain this module", "where is X configured?"
- **Debugging:** reading stack traces and logs, proposing fixes.

:::warn "Vibe coding" vs engineering
Andrej Karpathy coined **vibe coding** in February 2025: "fully give in to the vibes… and forget that the code even exists". Fun for prototypes. In production engineering, you still own every line: read it, test it, check security and licensing, and keep changes reviewable. Interviewers want to hear that you use AI tools to go faster *and* that you verify.
:::

## AI in Google interviews

- **Coding rounds** are still you, a shared doc and an interviewer: no AI assistance. Practise without autocomplete.
- **System design** increasingly includes AI components ("add semantic search", "summarise these", "design an assistant"). Use the playbook from the AI system-design topic.
- **Behavioural / Googleyness:** "tell me about a time you adopted a new technology" or "a time you made a call with incomplete data" are natural places for a story about introducing an AI tool responsibly, with evaluation and guardrails.
- **"What do you know about Gemini?":** natively multimodal, long context, a family of sizes (Flash for speed, Pro for capability, plus on-device Nano), thinking models, integrated across Search, Workspace, Android and Cloud (Vertex AI), with open Gemma models for developers.

:::tip A strong "why Google" angle
Connect a specific Google AI capability to the kind of work you want to do: "Google's scale of serving AI to billions of users (Search, Gmail, Android) makes the infrastructure problems (latency, cost, safety at scale) uniquely interesting, and I want to work on that layer." Specific beats flattering.
:::`,
    pitfalls: [
      "A generic “Google is an AI leader” answer with no specifics",
      "Overclaiming AI-tool use in a way that suggests you don't review generated code",
      "Practising coding only with AI autocomplete before a no-assistance interview",
    ],
    quiz: [
      Q("Which Google paper introduced the Transformer?", ["BERT", "*Attention Is All You Need (2017)", "word2vec", "MapReduce"], "Eight Google researchers, 2017."),
      Q("What did AlphaFold's creators receive in 2024?", ["The Turing Award", "*The Nobel Prize in Chemistry", "A Fields Medal", "An Oscar"], "Hassabis and Jumper shared it with David Baker."),
      Q("In a Google coding interview, can you use an AI assistant?", ["Yes, always", "*No: practise in a plain document without autocomplete", "Only for syntax", "Only for tests"], "The round assesses your own problem solving and communication."),
    ],
  }),
];
