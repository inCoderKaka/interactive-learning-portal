=== peft-vs-full
blurb: Deciding how to adapt a pretrained model: prompting, retrieval, full fine-tuning or parameter-efficient methods (adapters, prefix and prompt tuning, LoRA), with their costs, risks such as catastrophic forgetting, data requirements, and serving many fine-tuned variants.
signals: "Should we fine-tune or use RAG?" | "Full fine-tuning vs LoRA?" | "How much data do we need to fine-tune?" | Serving one model per customer
widgets: adapt-decision
prereq: sft-chat, training-memory

--- lesson
:::words
- **Fine-tuning**: continuing to train a pretrained model on your own data.
- **Full fine-tuning**: updating every parameter.
- **PEFT** (parameter-efficient fine-tuning): updating a tiny number of new or selected parameters while freezing the rest.
- **Adapter**: a small trainable module inserted into a frozen network.
- **Prompt / prefix tuning**: learning a few "virtual token" vectors prepended to the input or to each layer.
- **Catastrophic forgetting**: losing general abilities while learning a narrow new task.
:::

## The problem in plain words

You have a capable pretrained model and a specific need: a company's tone, a classification task, a domain's jargon, a tool-calling format. There's a ladder of options, from cheapest to most invasive: write better prompts, give the model the right documents (RAG), fine-tune a small part of it, or fine-tune all of it. Picking the right rung, and justifying it with cost, data and risk, is a classic applied-ML interview question.

:::eli5
A skilled chef joining your restaurant. You could give them a note with your house rules (prompting), hand them your recipe book to consult (retrieval), send them on a short course in your cuisine (light fine-tuning), or retrain them from the ground up (full fine-tuning). Most of the time the note and the recipe book are enough.
:::

## The adaptation ladder

| Option | Changes | Good for | Cost |
|---|---|---|---|
| **Prompting** (instructions, few-shot examples) | Nothing | Format, simple tasks, quick iteration | Per-request tokens |
| **RAG** | Nothing in the model | Knowledge that changes, citations, private docs | Retrieval infrastructure, tokens |
| **PEFT** (LoRA, adapters) | ~0.1–1% of parameters | Style, format, domain behaviour, classification, tool use | Small GPU, small artefacts |
| **Full fine-tuning** | All parameters | Big domain shifts, maximum quality, new languages | Large GPU budget, full model copy per variant |
| **Continued pretraining** | All, on raw domain text | New domain vocabulary/knowledge at scale | Large |

Explore the decision for different situations below:

[[widget:adapt-decision]]

Rules of thumb:

- **Knowledge** (facts that change, need citations) → RAG. Fine-tuning facts in is unreliable and can increase hallucination.
- **Behaviour** (tone, format, steps, tool use, domain reasoning style) → prompting first; fine-tune when prompts get long, brittle or expensive, or when latency/cost requires a smaller model.
- **Cost or latency** → fine-tune (or distil into) a smaller model to replace a big prompted one.
- **Combine**: a fine-tuned model that is good at using retrieved context is often best.

## Parameter-efficient methods

- **Adapters** (Houlsby et al., 2019): small bottleneck MLPs ($d \to r \to d$) inserted after attention/FFN, with residual connections. Add inference latency (extra layers).
- **Prefix tuning / prompt tuning**: learn continuous vectors prepended to every layer's keys/values (prefix) or only the input (prompt tuning; Google's Lester et al. showed it matches full fine-tuning at large scale). Tiny, but often less stable and weaker at small scale.
- **BitFit**: train only biases.
- **LoRA** (next page): learn a low-rank update to weight matrices; can be merged into the weights for zero added latency. The dominant method.
- **IA³, DoRA** and other variants: scale activations, or decompose weights into magnitude and direction.

## Full fine-tuning: when it's worth it

- Large, high-quality datasets (hundreds of thousands to millions of examples) and a big shift from pretraining (a new language, a specialised scientific domain).
- Maximum quality matters more than cost; you serve one variant.
- Risks: forgetting (mix in general data, small learning rate, few epochs), cost (16 bytes/param of training state), and serving a full copy per variant.

## Data: how much and what kind

- Classification/extraction: hundreds to a few thousand good labelled examples often suffice with PEFT on a strong base.
- Style/format: a few hundred to a few thousand curated demonstrations.
- New skills or domains: tens of thousands and up.
- Quality and diversity beat volume; deduplicate; hold out an evaluation set that reflects real traffic; include examples of edge cases and refusals.
- Synthetic data from a stronger model is common (distillation): check licences and filter.

## Serving many fine-tuned variants

With full fine-tuning, 100 customers means 100 full model copies. With LoRA, keep one base model in GPU memory and swap or batch **many small adapters** per request (multi-LoRA serving: S-LoRA, Punica, vLLM's LoRA support): thousands of variants on shared hardware.

## Evaluation

Compare against the prompted baseline on a held-out set, measure the target metric and general capabilities (to catch forgetting), and check safety behaviour (fine-tuning can erode safety training, even on benign data).

## Interview angles

- "Fine-tune or RAG?" Knowledge → RAG; behaviour/format/latency → fine-tune; often both.
- "Full or LoRA?" LoRA unless you have lots of data, a big domain shift and budget; LoRA also enables multi-tenant serving.
- "How much data?" Depends on task; start with hundreds of high-quality examples and a learning curve.

--- revise
### Ladder
? Adaptation options, cheapest first? :: Prompting → RAG → PEFT → full fine-tuning → continued pretraining.
? Knowledge that changes or needs citations? :: RAG.
? Tone, format, tool use, smaller cheaper model? :: Fine-tuning (usually PEFT).
? Why not fine-tune facts in? :: Unreliable recall and can increase hallucination.

### PEFT methods
? Adapters? :: Small bottleneck MLPs inserted in each layer; add latency.
? Prompt vs prefix tuning? :: Learned vectors at the input only vs at every layer's keys/values.
? LoRA's advantage over adapters? :: Low-rank weight updates that can be merged: no extra latency.

### Practice
? When is full fine-tuning worth it? :: Large data, big domain shift, maximum quality, single variant.
? Multi-tenant serving? :: One base model with many swappable LoRA adapters.
? Evaluation must include? :: Target metric, general capabilities (forgetting), safety behaviour.

--- notes
## Ladder
Prompt (no change) → RAG (knowledge, citations) → PEFT (0.1–1% params) → full FT → continued pretraining.
Knowledge → RAG. Behaviour/format/tool use/latency → FT. Combine (FT model good at using context).
## PEFT
Adapters (bottleneck, latency) · prefix tuning (per-layer KV vectors) · prompt tuning (input vectors; strong at scale) · BitFit · LoRA (mergeable) · IA³, DoRA.
## Full FT
Big data + big shift + quality priority. Risks: forgetting (mix data, low LR, few epochs), 16 B/param, one copy per variant.
## Data
Classification: 100s–1000s. Style: 100s–1000s curated. New skills: 10k+. Quality/diversity > volume. Held-out real eval. Synthetic (licences).
## Serving
Multi-LoRA (S-LoRA, Punica, vLLM): one base, thousands of adapters.
## Eval
vs prompted baseline; general capability; safety erosion.

--- doubts
Q: If fine-tuning teaches behaviour, can a long system prompt do the same?
A: Often, yes, and it's cheaper to iterate. Fine-tune when the prompt becomes very long (costly per request), brittle (small changes break it), or when you want a smaller model to match a larger prompted one. Many teams prototype with prompts and fine-tune once the behaviour is stable.

Q: Does fine-tuning remove the model's safety training?
A: It can weaken it, even with harmless data (research has shown a few hundred benign examples can degrade refusals). Include safety examples in the fine-tuning mix and re-run safety evaluations after every fine-tune.

Q: How do I know if my fine-tuned model is better than prompting?
A: Evaluate both on the same held-out set that reflects real traffic, with the same metric (accuracy, judge win rate, human ratings), plus cost and latency. The fine-tune should win on the target and not lose on general capabilities.

--- exercises
[choose] A bank wants an assistant that answers questions about its constantly updated fee schedule and speaks in its formal brand voice. Prompting, RAG, fine-tuning, or a combination?
A: RAG for the fee schedule (changes often, must be accurate and citable), plus brand voice via a system prompt; if the voice needs to be very consistent or the prompt gets long, a LoRA fine-tune on a few thousand on-brand responses. Don't fine-tune the fees in.

[estimate] You need 500 customer-specific variants of a 7B model. Compare storage for full fine-tunes versus LoRA adapters (rank 16 on all attention and MLP matrices, ~40M parameters per adapter).
A: Full: $500 \times 14$ GB (bf16) = 7 TB, and each needs GPU memory when served. LoRA: $500 \times 40\text{M} \times 2$ bytes ≈ 40 GB total, plus one 14 GB base model; adapters can be batched on shared GPUs.

[design] Plan a fine-tuning project to make a model reliably output JSON for an extraction task, starting from a prompted baseline at 85% valid outputs.
A: Collect 2,000–5,000 diverse real inputs, label correct JSON (bootstrapped by the prompted model and reviewed), hold out 500. LoRA fine-tune for 2–3 epochs with loss on the JSON only. Evaluate validity and field-level accuracy against the baseline; add constrained decoding with a JSON schema at inference for guaranteed validity. Check general capability on a small benchmark set.

--- pitfalls
- Fine-tuning knowledge that should be retrieved
- Skipping the prompted baseline comparison
- Full fine-tuning when LoRA would do
- Not checking general and safety regressions after fine-tuning
- Evaluation sets that don't match real traffic

--- quiz
Q: The best way to give a model up-to-date company policies is usually?
- Full fine-tuning
- *Retrieval-augmented generation
- Prompt tuning
- Training a new model
W: Knowledge that changes belongs in retrieved context.

Q: Which PEFT method can be merged into the base weights for zero extra latency?
- Adapters
- Prefix tuning
- *LoRA
- Prompt tuning
W: The low-rank update BA is added to W.

Q: A key serving advantage of LoRA for many customers?
- Faster training
- *One shared base model with many small swappable adapters
- No GPU needed
- Better tokenization
W: Multi-LoRA serving batches requests for different adapters.

Q: A risk of fine-tuning even on harmless data?
- Faster inference
- *Weakened safety behaviour and forgetting of general skills
- Larger vocabulary
- Lower memory use
W: Re-run safety and capability evaluations.

--- sources
- paper :: Parameter-Efficient Transfer Learning for NLP (adapters) :: Houlsby et al., Google (2019) :: https://arxiv.org/abs/1902.00751
- paper :: The Power of Scale for Parameter-Efficient Prompt Tuning :: Lester, Al-Rfou, Constant, Google (2021) :: https://arxiv.org/abs/2104.08691
- paper :: Prefix-Tuning: Optimizing Continuous Prompts for Generation :: Li, Liang (2021) :: https://arxiv.org/abs/2101.00190
- paper :: Fine-tuning Aligned Language Models Compromises Safety :: Qi et al. (2023) :: https://arxiv.org/abs/2310.03693

=== lora-qlora
blurb: LoRA explained from the low-rank idea: the update W + BA, rank and alpha, which matrices to adapt, initialisation, merging, parameter and memory savings, and QLoRA's 4-bit NF4 quantised base with double quantisation and paged optimisers.
signals: "Explain LoRA and its hyperparameters" | "Fine-tune a 70B model on one GPU" | "What rank would you use?" | "Implement a LoRA layer"
widgets: lora
prereq: peft-vs-full, linear-algebra-ml

--- lesson
:::words
- **Rank**: how many independent directions a matrix covers (linear-algebra page).
- **Low-rank update**: a change to a big weight matrix expressed as the product of two thin matrices.
- **r**: the LoRA rank (e.g. 8 or 16). **α (alpha)**: a scaling factor for the update.
- **Merging**: adding the learned update into the frozen weights so inference costs nothing extra.
- **Quantisation**: storing numbers in fewer bits (4-bit instead of 16-bit).
- **NF4**: a 4-bit number format designed for normally distributed weights.
:::

## The problem in plain words

Full fine-tuning updates billions of numbers and needs ~16 bytes of memory per parameter. But the *change* fine-tuning makes to each weight matrix seems to live in a few directions: it has low "intrinsic rank". **LoRA** learns only that change, as the product of two thin matrices, so a 4096 × 4096 layer's update needs 65k numbers instead of 16.8M. QLoRA goes further, storing the frozen base model in 4 bits, so a 65B model can be fine-tuned on a single 48 GB GPU.

:::eli5
Retuning a grand piano doesn't require rebuilding it: you adjust a few pegs. LoRA finds the few "pegs" (directions) that matter for your task and turns only those, leaving the rest of the piano untouched.
:::

## The LoRA update

For a frozen weight $W_0 \in \mathbb{R}^{d \times k}$, LoRA learns

$$W = W_0 + \Delta W = W_0 + \frac{\alpha}{r}\,BA, \qquad B \in \mathbb{R}^{d \times r},\; A \in \mathbb{R}^{r \times k},\; r \ll \min(d, k)$$

Forward: $h = W_0x + \frac{\alpha}{r}B(Ax)$. Only $A$ and $B$ are trained.

- **Initialisation**: $A$ random (Gaussian/Kaiming), $B = 0$, so $\Delta W = 0$ at the start and training begins exactly at the pretrained model.
- **Parameters**: $r(d + k)$ instead of $dk$. For $d = k = 4096$, $r = 16$: 131k vs 16.8M (0.8%).
- **Scaling** $\alpha/r$: keeps the update's size roughly stable when changing $r$, so the learning rate needn't be retuned; common choices $\alpha = r$ or $2r$ (rsLoRA uses $\alpha/\sqrt{r}$ for stability at high rank).
- **Merging**: after training, $W = W_0 + \frac{\alpha}{r}BA$ is a normal matrix: no extra inference latency. Or keep adapters separate to swap them per request.

Change the rank below and watch the parameter count, and how well a low-rank update can approximate a target change:

[[widget:lora]]

```python
import torch, torch.nn as nn

class LoRALinear(nn.Module):
    def __init__(self, base: nn.Linear, r=16, alpha=32, dropout=0.05):
        super().__init__()
        self.base = base
        for p in self.base.parameters():
            p.requires_grad_(False)                      # frozen pretrained weights
        self.A = nn.Parameter(torch.randn(r, base.in_features) / r)
        self.B = nn.Parameter(torch.zeros(base.out_features, r))   # B = 0 → starts as the base model
        self.scale, self.drop = alpha / r, nn.Dropout(dropout)
    def forward(self, x):
        return self.base(x) + self.scale * (self.drop(x) @ self.A.T @ self.B.T)
```

## Which matrices, which rank

- The original paper adapted only $W_Q$ and $W_V$; later practice (QLoRA paper) found adapting **all linear layers** (Q, K, V, O and the MLP matrices) matters more than rank.
- **Rank**: 8–64 is typical; higher for big domain shifts or lots of data. Returns diminish quickly; LoRA can underperform full fine-tuning on very large or very different data (e.g. continued pretraining on code), where higher ranks or full FT help.
- **Learning rate**: higher than full fine-tuning (~1e-4 to 3e-4), since few parameters are trained.

## Memory savings

Gradients and Adam state exist only for $A$ and $B$ (tiny). The frozen base still needs its weights (2 bytes/param in bf16) and activations. So a 7B LoRA fine-tune needs ~14 GB for the base plus activations: one 24–48 GB GPU, versus ~112 GB+ for full fine-tuning.

## QLoRA

Dettmers et al. (2023) combined LoRA with a **4-bit quantised base**:

- **NF4** (4-bit NormalFloat): 16 levels placed at the quantiles of a normal distribution, matching how pretrained weights are distributed: better than uniform int4. Weights are quantised in blocks of 64 with a per-block scale.
- **Double quantisation**: quantise the per-block scales too (saving ~0.37 bits/param).
- **Paged optimisers**: move optimiser state to CPU memory on spikes to avoid out-of-memory crashes.
- Computation: dequantise blocks to bf16 on the fly for matrix multiplies; gradients flow through the frozen 4-bit weights into the bf16 LoRA adapters.

Result: ~0.5 bytes/param for the base, so a 65B model's weights take ~35 GB; QLoRA fine-tunes matched 16-bit LoRA quality on their benchmarks (Guanaco). Trade-offs: slower than bf16 LoRA (dequantisation overhead); merging into a 4-bit base requires care (merge into a 16-bit copy, then re-quantise if needed).

## Interview angles

- "Explain LoRA." Freeze $W_0$; learn $\Delta W = \frac{\alpha}{r}BA$ with $B$ initialised to zero; merge for free inference.
- "Implement a LoRA layer." As above: frozen base, A random, B zero, scale α/r.
- "Fine-tune 70B on one GPU?" QLoRA: NF4 base (~35–40 GB) + LoRA adapters + activation checkpointing on an 80 GB GPU.

--- revise
### LoRA
? LoRA update? :: W = W₀ + (α/r)·BA, B ∈ ℝ^{d×r}, A ∈ ℝ^{r×k}.
? Why initialise B to zero? :: ΔW = 0 at the start: training begins exactly at the pretrained model.
? Parameter count of a LoRA update? :: r(d + k) instead of dk.
? Role of α/r? :: Keeps update scale stable across ranks.
? Can LoRA add inference latency? :: Not if merged: W₀ + (α/r)BA is a normal matrix.

### Choices
? Which matrices to adapt? :: All linear layers (Q, K, V, O, MLP) generally beats only Q and V.
? Typical rank and LR? :: r 8–64; LR ~1e-4–3e-4.
? When does LoRA fall short? :: Very large or very different data (continued pretraining scale).

### QLoRA
? NF4? :: 4-bit levels at normal-distribution quantiles; block-wise scales.
? Double quantisation? :: Quantise the per-block scales too.
? Paged optimisers? :: Spill optimiser state to CPU memory during spikes.
? Base memory under QLoRA? :: ~0.5 bytes/param (65B ≈ 35 GB).

--- notes
## LoRA
h = W₀x + (α/r)B(Ax). Train A, B only. A random, B = 0 → ΔW = 0 at init.
Params r(d+k): 4096², r=16 → 131k vs 16.8M (0.8%).
α/r scaling (α = r or 2r; rsLoRA α/√r). Merge W₀ + (α/r)BA → zero latency; or swap adapters.
## Choices
All linear layers > Q,V only. r 8–64. LR 1e-4–3e-4. Weaker for huge/different data.
## Memory
No grads/Adam for frozen base. 7B LoRA ≈ 14 GB base + acts (vs 112 GB full).
## QLoRA
NF4 (normal quantiles), blocks of 64 + scale; double quantisation (~0.37 bit saved); paged optimisers.
Dequantise to bf16 for matmuls; grads into bf16 adapters.
~0.5 B/param base: 65B ≈ 35 GB. Matches 16-bit LoRA (Guanaco). Slower; merging needs 16-bit copy.

--- doubts
Q: Why would weight updates be low-rank at all?
A: Empirically, fine-tuning a large pretrained model changes its behaviour along relatively few directions: the model already has the needed features, and the task mostly re-weights them. Aghajanyan et al. measured a low "intrinsic dimension" for fine-tuning. It's an observation, not a law, which is why very different tasks may need higher ranks.

Q: Can I combine several LoRA adapters?
A: You can add multiple adapters' updates (with weights) or switch between them per request. Combining adapters trained separately doesn't always compose well; methods like adapter merging/task arithmetic work sometimes and should be evaluated.

Q: Is QLoRA's 4-bit base lossy for the final model?
A: The base weights are approximated, and the adapter learns on top of that approximation, partly compensating. For deployment you can merge the adapter into a 16-bit base, which may slightly change behaviour versus what was trained; evaluate the exact artefact you'll serve.

--- exercises
[estimate] A 7B model has 32 layers, each with Q, K, V, O (4096 × 4096) and MLP matrices of 4096 × 11008 (gate, up) and 11008 × 4096 (down). LoRA rank 16 on all of them: how many trainable parameters?
A: Attention per layer: $4 \times 16 \times (4096 + 4096) = 524{,}288$. MLP: $3 \times 16 \times (4096 + 11008) = 724{,}992$. Per layer ≈ 1.25M; × 32 ≈ 40M (~0.6% of 7B).

[design] Write a function that merges a trained LoRALinear into a plain nn.Linear for deployment.
A: `merged = nn.Linear(in, out, bias=base.bias is not None)`; `merged.weight.data = base.weight.data + scale * (B @ A)` (shape out × in); copy the bias; return it. Verify `merged(x)` equals `lora(x)` (with dropout off) to ~1e-3 in bf16.

[choose] Fine-tune Llama-class 70B for a legal-drafting style with 20k examples on 2× 80 GB GPUs. LoRA or QLoRA, and settings?
A: bf16 LoRA needs ~140 GB for the base: possible across 2 GPUs with FSDP but tight with activations. QLoRA (~40 GB base) fits on one GPU with room for long sequences, or two GPUs for speed. Use rank 16–32 on all linear layers, α = 2r, LR 2e-4, 2–3 epochs, activation checkpointing, and evaluate the merged 16-bit model.

--- pitfalls
- Initialising both A and B randomly (the model starts away from the pretrained one)
- Adapting only Q and V when the task needs more
- Using full-fine-tuning learning rates for LoRA (too low)
- Evaluating the unmerged model but deploying a re-quantised merge
- Expecting LoRA to match full fine-tuning on continued-pretraining-scale data

--- quiz
Q: In LoRA, which matrix starts at zero?
- A
- *B
- W₀
- Both
W: So BA = 0 and training starts from the pretrained model.

Q: For d = k = 4096 and r = 8, the LoRA update has how many parameters?
- 16.8M
- *65,536
- 4,096
- 8
W: r(d + k) = 8 × 8192.

Q: Why can LoRA have zero inference overhead?
- It skips layers
- *The low-rank update can be merged into the base weights
- It uses 4-bit maths
- It prunes heads
W: W₀ + (α/r)BA is a single matrix.

Q: What makes NF4 better than uniform int4 for model weights?
- More bits
- *Its levels follow a normal distribution, matching weight distributions
- It's faster
- It needs no scales
W: Quantile-based levels waste fewer codes on rare values.

--- sources
- paper :: LoRA: Low-Rank Adaptation of Large Language Models :: Hu et al., Microsoft (2021) :: https://arxiv.org/abs/2106.09685
- paper :: QLoRA: Efficient Finetuning of Quantized LLMs :: Dettmers et al. (2023) :: https://arxiv.org/abs/2305.14314
- paper :: Intrinsic Dimensionality Explains the Effectiveness of Language Model Fine-Tuning :: Aghajanyan et al. (2020) :: https://arxiv.org/abs/2012.13255
- article :: PEFT library documentation :: Hugging Face :: https://huggingface.co/docs/peft/index

=== distillation
blurb: Knowledge distillation: training a small student to match a large teacher's soft predictions, temperature and dark knowledge, the distillation loss, sequence-level and on-policy distillation for LLMs, distilling reasoning, and when distillation beats training from scratch.
signals: "Make the model 10× cheaper with little quality loss" | "What is knowledge distillation?" | "Why do soft labels help?" | Deploying models on devices or at high QPS
widgets: distill-temp
prereq: peft-vs-full, loss-functions

--- lesson
:::words
- **Teacher**: a large, accurate model whose behaviour we want to copy.
- **Student**: a smaller, cheaper model trained to imitate the teacher.
- **Soft labels**: the teacher's full probability distribution over answers, not just its top choice.
- **Temperature**: a number dividing logits before softmax; higher values make distributions softer.
- **Dark knowledge**: information in the teacher's small probabilities for wrong answers (which mistakes are "close").
- **Sequence-level distillation**: training the student on whole outputs generated by the teacher.
:::

## The problem in plain words

The best models are too big and slow for many products: on-device features, high-QPS ranking, cheap chat tiers. Distillation transfers much of a large model's quality into a small one by training the small model on the large model's outputs instead of (or as well as) the original labels. It's how Gemini Flash-style, Gemma and many "mini" models get strong for their size, and how ranking teams turn heavy research models into servable ones.

:::eli5
A master chess player doesn't just tell an apprentice "that move was right"; they say "this move is best, that one is nearly as good, and this one is a blunder". The apprentice learns much faster from those graded hints than from right/wrong alone.
:::

## Classic distillation (Hinton et al., 2015)

Soften both models' distributions with temperature $T$: $p_i^{(T)} = \text{softmax}(z_i/T)$. Train the student on

$$L = \alpha\,T^2\,\text{KL}\big(p_{\text{teacher}}^{(T)} \,\|\, p_{\text{student}}^{(T)}\big) + (1 - \alpha)\,\text{CE}(y, p_{\text{student}})$$

- A one-hot label for an image of a "7" says only "7". The teacher's soft distribution says "7, a bit like a 1, slightly like a 9": **dark knowledge** about similarity that gives the student richer gradients per example.
- **Temperature** $T$ (2–10) amplifies the small probabilities so they matter; the $T^2$ factor keeps gradient magnitudes comparable as $T$ changes.
- Works with unlabelled data too: the teacher labels it (a form of semi-supervised learning).

Slide the temperature below and watch the teacher's distribution reveal or hide its dark knowledge:

[[widget:distill-temp]]

## Distilling language models

- **Word-level (token-level) KD**: match the teacher's next-token distribution at every position (forward KL over the vocabulary). Needs teacher logits (white-box access).
- **Sequence-level KD** (Kim and Rush): have the teacher generate outputs and train the student with ordinary SFT on them. Works with only API access to the teacher (black-box), and is how many open models were bootstrapped from stronger ones (check terms of service and licences).
- **On-policy distillation**: the student generates, the teacher scores or provides target distributions on the student's own outputs (GKD, MiniLLM using reverse KL). Fixes the train–test mismatch where the student never learns to recover from its own mistakes.
- **Distilling reasoning**: train small models on a reasoning model's chains of thought (DeepSeek-R1 distilled models): very effective for maths and code.
- **Pretraining-scale distillation**: Gemma 2's smaller models were trained with distillation from a larger model throughout pretraining, improving quality per token.

## Other compression in the same family

- **Pruning**: remove weights, heads or layers (structured pruning), then distil to recover (e.g. Minitron).
- **Quantisation** (inference pages): fewer bits per weight.
- **Architectural students**: fewer layers or narrower width, initialised from teacher layers.

## Distillation for ranking and recommendations

Heavy rankers (big cross-feature models, cross-encoders) teach light ones (two-tower retrievers, small pre-rankers): the student is trained on the teacher's scores for many candidates, including ones never shown to users, which gives far more training signal than logged clicks. Margin-MSE and listwise KD are common.

## When it works and when it doesn't

- Works best when the student has enough capacity and sees lots of (teacher-labelled) data similar to production traffic.
- The student rarely exceeds the teacher; gaps are largest on knowledge-heavy and long-tail tasks.
- A too-large capacity gap (huge teacher, tiny student) can make distillation less effective; intermediate "teacher assistants" help.
- Evaluate the student on the same metrics as the teacher, including calibration and safety.

## Interview angles

- "Make it 10× cheaper." Distil into a smaller architecture (soft labels on lots of in-domain unlabelled data), plus quantisation; measure quality gap and latency.
- "Why soft labels?" Dark knowledge: relative probabilities of wrong classes carry similarity information; richer gradients.
- "Black-box teacher via API?" Sequence-level distillation on generated outputs; mind the licence terms.

--- revise
### Classic KD
? Distillation loss? :: α·T²·KL(teacher_T ‖ student_T) + (1−α)·CE(y, student).
? Why temperature? :: Softens distributions so small probabilities (dark knowledge) influence training.
? Why multiply by T²? :: Keeps gradient magnitudes comparable as T changes.
? Dark knowledge? :: Information in the teacher's probabilities for wrong but similar classes.

### LLMs
? Token-level vs sequence-level KD? :: Match next-token distributions (needs logits) vs SFT on teacher-generated outputs (black-box OK).
? On-policy distillation? :: Teacher supervises the student's own generations; fixes exposure mismatch.
? Distilling reasoning? :: Train small models on a reasoning model's chains of thought.

### Practice
? Distillation in recommenders? :: Heavy ranker teaches light retriever/pre-ranker on many unshown candidates.
? Capacity gap problem? :: Very large teacher → tiny student can transfer poorly; use intermediate teachers.
? Related compression? :: Pruning (then distil), quantisation, shallower/narrower students.

--- notes
## Classic (Hinton 2015)
p^(T) = softmax(z/T), T 2–10. L = α T² KL(p_t^T ‖ p_s^T) + (1−α) CE(y, p_s).
Dark knowledge: "7 like 1, like 9". Unlabelled data labelled by teacher.
## LLM distillation
Token-level (white-box logits, forward KL). Sequence-level (teacher outputs → SFT; black-box; licences).
On-policy (GKD, MiniLLM reverse KL). Reasoning traces (R1-distill). Pretraining-time KD (Gemma 2).
## Compression family
Pruning (+distil, Minitron), quantisation, layer-dropped students.
## Recsys
Cross-encoder/heavy ranker → two-tower/pre-ranker; scores on unshown candidates; Margin-MSE, listwise KD.
## Limits
Student ≤ teacher; long-tail/knowledge gaps; capacity gap → teacher assistants. Evaluate calibration + safety.

--- doubts
Q: Why not just train the small model on the original labels?
A: Soft targets carry more information per example (which wrong answers are close) and are smoother to learn from; the teacher can also label vast amounts of unlabelled data. Students trained by distillation consistently beat the same architecture trained on hard labels alone.

Q: Forward or reverse KL for distilling LLMs?
A: Forward KL (teacher ‖ student) makes the student cover all the teacher's plausible outputs (mean-seeking), which for a small student can mean spreading probability over things it can't produce well. Reverse KL (student ‖ teacher) makes the student focus on the teacher's main modes, often giving more precise generations. Both are used; evaluate on your task.

Q: Is it allowed to distil from a commercial API model?
A: It depends on the provider's terms of service, which often prohibit using outputs to train competing models. Check licences and terms before using any model's outputs as training data.

--- exercises
[estimate] A teacher's logits for 3 classes are [4, 2, 0]. Compute its probabilities at T = 1 and T = 4.
A: T = 1: $e^4, e^2, e^0 = 54.6, 7.39, 1$ → [0.867, 0.117, 0.016]. T = 4: logits [1, 0.5, 0] → $2.718, 1.649, 1$ → [0.506, 0.307, 0.186]. At higher temperature the relative similarity of class 2 and 3 becomes visible to the student.

[design] Distil a 7B-parameter cross-encoder reranker into a 100M-parameter model for a search system serving 20k QPS.
A: Sample a large set of real queries; for each, retrieve ~100 candidates and score all with the teacher (offline, batched). Train the student (a small encoder cross-encoder or late-interaction model) with listwise KL to the teacher's softmaxed scores plus Margin-MSE on pairs, mixing in human relevance labels where available. Evaluate NDCG@10 against teacher and human labels, latency at 20k QPS, and per-segment gaps (long-tail queries). Iterate with on-policy hard cases where the student and teacher disagree most.

[choose] You need a small on-device model for summarising notifications. Train from scratch, fine-tune a small pretrained model, or distil?
A: Start from a small pretrained model (good language ability) and distil from a large model: generate high-quality summaries for a large set of (anonymised or synthetic) notifications with the teacher and fine-tune the small model on them (sequence-level KD), optionally with token-level KD if teacher logits are available. Quantise for the device and evaluate quality and latency on-device.

--- pitfalls
- Forgetting the T² factor or using T = 1 (losing dark knowledge)
- Distilling on data unlike production traffic
- Expecting the student to beat the teacher
- Ignoring licence terms for black-box teachers
- Skipping calibration and safety evaluation of the student

--- quiz
Q: What does a higher distillation temperature do?
- Makes the teacher more confident
- *Softens the distribution so small probabilities carry more signal
- Speeds up training
- Removes the hard-label loss
W: Dark knowledge becomes visible.

Q: Sequence-level distillation requires?
- The teacher's logits
- *Only the teacher's generated outputs
- The same architecture
- Reinforcement learning
W: SFT on teacher outputs works with black-box access.

Q: Why do recommendation teams distil heavy rankers into light models?
- To add features
- *To get a fast model trained on the teacher's scores for many candidates, including unshown ones
- To remove embeddings
- To increase latency
W: Teacher scores provide much more signal than logged clicks.

Q: On-policy distillation addresses?
- Tokenization
- *The mismatch where the student never learns from its own generated outputs
- GPU memory
- Data licences
W: The teacher supervises what the student actually generates.

--- sources
- paper :: Distilling the Knowledge in a Neural Network :: Hinton, Vinyals, Dean, Google (2015) :: https://arxiv.org/abs/1503.02531
- paper :: Sequence-Level Knowledge Distillation :: Kim, Rush (2016) :: https://arxiv.org/abs/1606.07947
- paper :: On-Policy Distillation of Language Models (GKD) :: Agarwal et al., Google DeepMind (2023) :: https://arxiv.org/abs/2306.13649
- paper :: Gemma 2: Improving Open Language Models at a Practical Size :: Gemma Team, Google DeepMind (2024) :: https://arxiv.org/abs/2408.00118
