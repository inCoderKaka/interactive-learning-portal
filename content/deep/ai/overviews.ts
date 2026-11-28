import { md } from "@/content/ai/md";

/**
 * Chapter overview pages for AI, written for first-time learners. Each replaces the chapter's old lesson
 * (content/ai/part*.ts) once the chapter's pages are written: a plain-words map of the chapter.
 */
export const AI_OVERVIEWS: Record<string, string> = {
  "ai-rnn": md`
## What this chapter is about

Before transformers, recurrent networks read sequences one step at a time with a running memory. Their weaknesses (vanishing gradients, no parallelism) explain why attention was invented, and their strengths (constant memory per step) still matter for streaming and on-device models.

Two pages:

1. **RNNs, LSTMs and GRUs.** The recurrence, backpropagation through time, why gradients vanish, and how LSTM gates fix it.
2. **Sequence-to-sequence and attention.** Encoder–decoders for translation, teacher forcing and exposure bias, Bahdanau attention as soft alignment, and beam search.

:::tip The one idea to keep
Attention was invented to let a decoder look back at every input word instead of a single summary vector; transformers kept attention and dropped recurrence.
:::
`,
  "ai-embeddings": md`
## What this chapter is about

Embeddings turn words, sentences, images, users and items into vectors where closeness means similarity. They power search, retrieval for LLMs, recommendations and deduplication.

Three pages:

1. **Word2vec.** Learning word vectors from context with negative sampling, what the geometry shows, and embeddings for items and graphs.
2. **Contrastive learning.** InfoNCE with in-batch and hard negatives, bi-encoders vs cross-encoders, and fine-tuning embeddings for your domain.
3. **Using embeddings well.** Cosine vs dot product, anisotropy, compressing vectors, and upgrading models safely.

:::tip The one idea to keep
Train with contrastive pairs, search with the similarity you trained with, and remember that changing the model means re-embedding everything.
:::
`,
  "ai-recsys": md`
## What this chapter is about

How YouTube, Play and Search choose a handful of items out of billions. This is the most common ML system design topic in interviews.

Four pages:

1. **Collaborative filtering.** Users and items as vectors, matrix factorisation with SGD or ALS, and implicit feedback.
2. **Two-tower retrieval and the funnel.** Retrieve thousands of candidates in milliseconds, then rank them; logQ correction and ANN serving.
3. **Ranking models.** Pointwise to listwise, CTR models from Wide & Deep to DCN and DLRM, multi-task heads and value models.
4. **Hard problems.** Cold start, exploration with bandits, position and popularity bias, feedback loops, diversity.

:::tip The one idea to keep
Draw the funnel with numbers first: cheap retrieval for recall, an expensive multi-task ranker for precision, and a re-ranker for diversity and policy.
:::
`,
  "ai-tokenization": md`
## What this chapter is about

Language models read tokens, not letters or words. How text is split decides cost, context length, multilingual fairness and some surprising failures.

Two pages:

1. **BPE, WordPiece and SentencePiece.** How subword vocabularies are built and applied, byte-level BPE and special tokens.
2. **What tokenization changes.** Token budgets and cost, languages, numbers, letters, glitch tokens and context arithmetic.

:::tip The one idea to keep
Every cost, latency and context estimate is in tokens: about 0.75 English words per token, often several times more tokens for other languages.
:::
`,
  "ai-transformers": md`
## What this chapter is about

The architecture behind every modern LLM, explained from one attention head to mixture-of-experts. Implementing attention is the most common LLM coding question.

Six pages:

1. **Self-attention.** Queries, keys and values, the √d scaling, causal masks, code and cost.
2. **The transformer block.** Multi-head attention, the feed-forward block, residuals and norms, and counting parameters and FLOPs.
3. **Positional encodings.** Sinusoidal, learned, RoPE and ALiBi, and extending context length.
4. **Three families.** Encoder-only (BERT), decoder-only (GPT) and encoder–decoder (T5), and what each is for.
5. **Efficient attention.** FlashAttention, MQA/GQA, sliding windows and state-space alternatives.
6. **Mixture of experts.** Routers, top-k experts, load balancing, and active vs total parameters.

:::tip The one idea to keep
Attention moves information between tokens; feed-forward blocks process it; residuals and norms let you stack dozens of layers. Parameters ≈ 12·layers·d², FLOPs ≈ 2 per parameter per token.
:::
`,
  "ai-llm-training": md`
## What this chapter is about

How a base model is made: the data, the compute budget, and the systems that spread training over thousands of chips.

Four pages:

1. **Pretraining data.** Sources, cleaning, deduplication, mixtures and contamination.
2. **Scaling laws.** C ≈ 6ND, Chinchilla's 20 tokens per parameter, and why small models are over-trained.
3. **Training memory.** Sixteen bytes per parameter with Adam, activations, checkpointing and memory-saving tricks.
4. **Distributed training.** Data, tensor and pipeline parallelism, ZeRO/FSDP, and running for months on thousands of GPUs.

:::tip The one idea to keep
Data quality decides what the model knows; scaling laws decide how big to make it; memory arithmetic decides how to split it across hardware.
:::
`,
  "ai-alignment": md`
## What this chapter is about

Turning a base model that continues text into a helpful, honest, harmless assistant.

Three pages:

1. **Supervised fine-tuning.** Instruction data, chat templates and loss masking.
2. **RLHF with PPO.** Preference comparisons, Bradley–Terry reward models, the KL penalty and reward hacking.
3. **DPO and preference optimisation.** The derivation, the implicit reward, failure modes and the KTO/SimPO family.

:::tip The one idea to keep
SFT teaches the format; preference tuning teaches which of two plausible answers people prefer; a KL leash keeps the model from gaming its reward.
:::
`,
  "ai-reasoning": md`
## What this chapter is about

How models get better at hard problems by spending more computation at answer time, and how reasoning models are trained.

Two pages:

1. **Chain of thought and test-time compute.** Why writing steps helps, self-consistency, best-of-N and when to use reasoning models.
2. **Training reasoning with RL.** Verifiable rewards, GRPO, outcome vs process rewards, the R1 recipe and failure modes.

:::tip The one idea to keep
Thinking longer helps on hard, checkable tasks; RL against verifiable rewards is how models learn to think longer usefully.
:::
`,
  "ai-fine-tuning": md`
## What this chapter is about

Adapting a pretrained model to your task with as little cost and risk as possible.

Three pages:

1. **Choosing how to adapt.** Prompting, RAG, PEFT or full fine-tuning, data needs and multi-tenant serving.
2. **LoRA and QLoRA.** Low-rank updates, ranks and targets, and 4-bit bases for fine-tuning on one GPU.
3. **Distillation.** Teaching a small model from a big one with soft labels, sequences or on-policy feedback.

:::tip The one idea to keep
Knowledge goes in retrieval; behaviour goes in fine-tuning; LoRA is the default way to fine-tune; distillation buys speed.
:::
`,
  "ai-decoding": md`
## What this chapter is about

How probabilities become text, and how to make that fast and reliable.

Three pages:

1. **Greedy, beam search and sampling.** Temperature, top-k, top-p, min-p and settings per use case.
2. **Structured output.** JSON schemas, constrained decoding with grammar masks and function calling.
3. **Speculative decoding.** Draft-and-verify for 2–3× faster generation with identical outputs.

:::tip The one idea to keep
Pick decoding per task: near-greedy and constrained for code and data, sampling for creative text, speculation for latency.
:::
`,
  "ai-inference": md`
## What this chapter is about

Serving LLMs efficiently: memory, batching, compression and cost.

Four pages:

1. **The KV cache.** Prefill vs decode, cache size arithmetic and how to shrink or share the cache.
2. **Serving engines.** Continuous batching, PagedAttention, chunked prefill and disaggregation.
3. **Quantization.** Int8, int4 and FP8 for weights, activations and caches, and what breaks.
4. **Latency and cost.** The latency model, capacity planning, routing, caching and self-host vs API.

:::tip The one idea to keep
Decode is memory-bound: batch many requests, shrink weights and caches, and remember output tokens dominate latency.
:::
`,
  "ai-prompting": md`
## What this chapter is about

Getting the most from a model without training it, and running prompts like production code.

Two pages:

1. **Prompt patterns.** Roles, context, instructions, examples, formats and prompt chaining.
2. **Prompts in production.** Versioning, golden sets, regression tests, model upgrades and automatic optimisation.

:::tip The one idea to keep
Write prompts like briefs for a capable newcomer, then treat them as versioned code with tests.
:::
`,
  "ai-context-engineering": md`
## What this chapter is about

Deciding what goes into the model's limited context for every call, and remembering across conversations.

Two pages:

1. **Managing the context window.** Budgets, lost-in-the-middle, long context vs retrieval, and compression.
2. **Memory for assistants.** Short- and long-term memory, writing and updating memories, retrieval and privacy.

:::tip The one idea to keep
Send the smallest context that lets the model succeed, ordered so it's used, with static parts first for caching.
:::
`,
  "ai-vector-search": md`
## What this chapter is about

Finding the nearest vectors among millions or billions, fast, in production systems.

Two pages:

1. **ANN indexes.** IVF, HNSW, product quantisation and ScaNN, and how to tune recall vs latency.
2. **Vector databases in production.** Filters, hybrid keyword + vector search, multi-tenancy, permissions and freshness.

:::tip The one idea to keep
Approximate search trades a little recall for enormous speed; hybrid search and filters make it work for real products.
:::
`,
  "ai-rag": md`
## What this chapter is about

Retrieval-augmented generation: the most common GenAI architecture and design question.

Four pages:

1. **The RAG pipeline.** Ingestion, chunking, retrieval, context assembly, generation with citations.
2. **Retrieval quality.** Diagnosing failures, hybrid search, reranking, query rewriting and fine-tuned embeddings.
3. **Advanced RAG.** Agentic and multi-hop retrieval, SQL routing, GraphRAG and multimodal documents.
4. **Evaluating RAG.** Retrieval and generation measured separately, faithfulness, judges and regression gates.

:::tip The one idea to keep
Most RAG failures are retrieval failures: measure retrieval and generation separately, then fix the half that fails.
:::
`,
  "ai-agents": md`
## What this chapter is about

LLMs that act: tools, loops, planning, teams of agents, and making them safe enough to use.

Four pages:

1. **The agent loop and tools.** Function calling, ReAct, tool design, workflows vs agents, stopping and cost.
2. **Planning and memory.** Plan-and-execute, reflection, explicit state and long tasks.
3. **Multi-agent systems.** Orchestrators and workers, specialists, debate, costs and protocols.
4. **Reliable and safe agents.** Least privilege, sandboxes, approvals, injection defences, evaluation and tracing.

:::tip The one idea to keep
Use the simplest structure that works, give tools minimal power, and evaluate trajectories, not just final answers.
:::
`,
  "ai-multimodal": md`
## What this chapter is about

Models that see and hear: image–text embeddings, speech, and multimodal LLMs.

Three pages:

1. **Vision transformers and CLIP.** Joint image–text spaces, zero-shot classification and image search.
2. **Speech.** Spectrograms, CTC/RNN-T/Whisper, WER, TTS and voice-assistant latency.
3. **Multimodal LLMs.** Vision encoders and projectors, image tokens, training stages and failure modes.

:::tip The one idea to keep
Every modality becomes vectors in a shared space or tokens in the LLM's sequence; resolution and length decide cost.
:::
`,
  "ai-generative-images": md`
## What this chapter is about

How images (and video and audio) are generated: from VAEs and GANs to diffusion.

Two pages:

1. **GANs and VAEs.** The ELBO and reparameterisation, the adversarial game, mode collapse, and where they live on.
2. **Diffusion models.** Noising and denoising, the training loss, guidance, latent diffusion and faster samplers.

:::tip The one idea to keep
Diffusion learns to remove noise one step at a time; guidance steers it to the prompt; latents and distillation make it affordable.
:::
`,
  "ai-evals": md`
## What this chapter is about

Knowing whether an LLM system is good, and keeping it good as it changes.

Two pages:

1. **How LLMs are evaluated.** Benchmarks and their limits, execution checks, LLM judges and their biases, humans and arenas.
2. **Evaluation pipelines.** Quality definitions, datasets, layered graders, CI gates, online feedback and launch criteria.

:::tip The one idea to keep
Build product-specific evaluation sets, validate your judges against humans, and look at slices and per-case regressions, not just averages.
:::
`,
  "ai-safety": md`
## What this chapter is about

Security, truthfulness and responsibility for ML and LLM systems.

Three pages:

1. **Prompt injection and LLM security.** Direct and indirect injection, exfiltration, the OWASP risks and layered defences.
2. **Hallucination and guardrails.** Why models make things up, grounding, abstention, verification and guardrail stacks.
3. **Fairness and privacy.** Bias sources and fairness definitions, differential privacy, federated learning and governance.

:::tip The one idea to keep
Assume the model can be fooled or wrong: limit what it can do, verify what matters, and measure harms across groups.
:::
`,
  "ai-production": md`
## What this chapter is about

What happens after training: serving, monitoring and the pipelines that keep models fresh.

Three pages:

1. **Model serving.** Batch, online, streaming and on-device serving, latency budgets and safe rollouts.
2. **Monitoring and drift.** Data and concept drift, what to monitor, PSI, alerts and retraining.
3. **ML pipelines.** Data validation, feature stores, reproducibility, CI/CD/CT and technical debt.

:::tip The one idea to keep
Models decay silently: validate data, monitor inputs and outputs, and retrain through the same gates you launched with.
:::
`,
  "ai-system-design": md`
## What this chapter is about

How to run the interview rounds themselves: ML system design, GenAI system design and ML coding.

Three pages:

1. **The ML system design framework.** Stages, time budgets, level expectations and a worked YouTube example.
2. **The GenAI system design framework.** Requirements, estimates, model choice, context, evaluation, safety and cost.
3. **The ML coding round.** Question families, a 45-minute plan, idioms and what's scored.

:::tip The one idea to keep
Structure wins rounds: clarify and estimate first, cover data, evaluation and production, then go deep where the interviewer points.
:::
`,
  "ai-math": md`
## What this chapter is about

Machine learning is written in four kinds of maths. You don't need a maths degree, but you do need the **picture** behind each idea, because interviews ask you to derive a gradient, explain PCA, or say whether an A/B result is real.

Four pages:

1. **Linear algebra.** Vectors as arrows, the dot product as "how aligned", matrices as transformations of space, shapes and FLOP counts, eigenvectors and the SVD (behind PCA, LoRA and recommenders).
2. **Calculus.** Derivatives as slopes, the gradient as the uphill direction, the chain rule (all of backpropagation), and curvature, which sets how big a learning rate can be.
3. **Probability.** Distributions, Bayes' rule and base rates, maximum likelihood (where MSE and cross-entropy come from), priors as regularisation, and entropy, cross-entropy and KL divergence.
4. **Statistics.** Standard errors, confidence intervals, p-values, power and sample sizes, and the traps (peeking, many comparisons) that fool experiment readers.

:::tip The one idea to keep
Almost every loss is a negative log-likelihood, and almost every training step is the chain rule plus a step downhill. Learn those two and the rest of the course becomes variations.
:::
`,
  "ai-ml-basics": md`
## What this chapter is about

The ideas every model shares, whatever its type: how to turn a product goal into a prediction problem, why models fail on new data, how to measure that honestly, what the loss really asks for, and how to stop memorising.

Five pages:

1. **Framing.** When ML is the right tool, choosing the target and labels, and lining up offline, online and business metrics.
2. **Bias and variance.** Underfitting versus overfitting, the error decomposition, learning curves, and why huge networks break the old picture (double descent).
3. **Validation and leakage.** Train, validation and test sets, cross-validation, time-based splits, and the many ways answers leak into training.
4. **Loss functions.** Squared, absolute, Huber, quantile, cross-entropy, hinge, focal and ranking losses, derived from what each assumes.
5. **Regularisation.** L1 and L2, weight decay and AdamW, early stopping, augmentation and dropout.

:::tip The one idea to keep
The goal is performance on data you haven't seen. Every choice on these pages is a bet about generalisation, and an honest validation set is the only way to check the bet.
:::
`,
  "ai-data": md`
## What this chapter is about

Models learn whatever is in their data, mistakes included. In ML system design rounds, data and labels often decide the grade more than the model. This chapter is about where training data comes from and how it's turned into features.

Three pages:

1. **Data and labels.** Product logs, raters and their agreement, label windows, exposure bias and feedback loops, negative sampling, active learning and weak supervision.
2. **Class imbalance.** Why rare positives break accuracy, choosing thresholds from costs, class weights and resampling, and recalibrating afterwards.
3. **Feature engineering.** Encoding numbers and categories (hashing, embeddings, target encoding), crosses, time-window aggregates, missing values, and the training–serving skew that silently ruins production models.

:::tip The one idea to keep
Always say where the labels come from, how they're biased, and how features are computed identically in training and serving.
:::
`,
  "ai-classic-models": md`
## What this chapter is about

The models that still win on tabular data and that interviewers expect you to implement from scratch. Each page builds intuition first, then the derivation, then working NumPy code.

Six pages:

1. **Linear regression.** Least squares, the normal equations, gradient descent, and reading coefficients.
2. **Logistic and softmax regression.** Probabilities from a linear score, the log-loss gradient, calibration, and the classic from-scratch implementation.
3. **Decision trees and random forests.** Choosing splits by impurity, why single trees overfit, and how bagging fixes it.
4. **Gradient boosting.** Fitting trees to residuals (negative gradients), XGBoost, LightGBM and CatBoost, and tuning.
5. **SVMs, kNN and naive Bayes.** Margins and the kernel trick, nearest neighbours and the curse of dimensionality, and Bayes with an independence assumption.
6. **Clustering and dimensionality reduction.** k-means, Gaussian mixtures and EM, DBSCAN, PCA derived, and t-SNE/UMAP for pictures.

:::tip The one idea to keep
For tabular data, gradient-boosted trees are the default to beat; logistic regression is the calibrated baseline; and k-means and logistic regression are the two most common ML-coding questions.
:::
`,
  "ai-metrics": md`
## What this chapter is about

How to tell whether a model is good, which depends on what its mistakes cost. Every ML design answer needs offline metrics, online metrics and a launch plan; this chapter gives you all three.

Four pages:

1. **Classification metrics.** Precision, recall, F1, ROC and PR curves, thresholds, multi-class averages and calibration.
2. **Ranking metrics.** Precision and recall at k, MRR, MAP and NDCG for search, feeds and recommendations.
3. **Regression and business metrics.** MAE, RMSE, MAPE's traps, intervals, and connecting model metrics to product and guardrail metrics.
4. **Online experiments.** Shadow mode, canaries, A/B tests, interleaving, bandits, and why offline wins vanish online.

:::tip The one idea to keep
Name the cost of each mistake first; the right metric and threshold follow from it. Then prove it online.
:::
`,
  "ai-neural-nets": md`
## What this chapter is about

How neural networks work and, just as important, how to get them to train. This is the foundation for CNNs, transformers and LLMs later in the course.

Five pages:

1. **Neurons, layers and activations.** Why non-linearity matters, ReLU to GELU to SwiGLU, softmax, and parameter counting.
2. **Backpropagation.** Derived for a two-layer network, step by step, with its cost and the vanishing-gradient problem.
3. **Optimisers.** SGD, momentum, Adam and AdamW with bias correction, warmup and cosine schedules, batch size and clipping.
4. **Initialisation and normalisation.** Xavier and He from variance, batch norm versus layer norm and RMSNorm, residual connections, pre-norm transformers.
5. **Debugging training.** A step-by-step playbook, reading loss curves, classic bugs and hyperparameter search.

:::tip The one idea to keep
Training is the chain rule plus a good optimiser, and deep networks only train when signals keep a healthy size through every layer: initialisation, normalisation and residuals are how.
:::
`,
  "ai-pytorch": md`
## What this chapter is about

The practical tool you'll write models in, and the hardware facts that decide how fast they run.

Three pages:

1. **Tensors and autograd.** Shapes, views, broadcasting (and its silent bugs), einsum, and what autograd really records.
2. **The training loop.** Datasets, DataLoaders, the five-line step, evaluation mode, checkpoints, gradient accumulation and fine-tuning.
3. **Performance.** Compute-bound versus memory-bound (the roofline), mixed precision with bf16, torch.compile and fusion, profiling, and fitting in memory.

:::tip The one idea to keep
Say the shape of every tensor out loud, and remember that most slow training is moving data, not doing maths.
:::
`,
  "ai-cnn": md`
## What this chapter is about

Networks for images and other grid-shaped data, and the vision tasks built on them.

Three pages:

1. **Convolution basics.** What a convolution computes, output sizes and parameter counts, pooling, receptive fields, and 1×1 and depthwise-separable convolutions.
2. **Architectures.** From LeNet and AlexNet through VGG, Inception and ResNet to EfficientNet, ConvNeXt and Vision Transformers, plus transfer learning.
3. **Detection and segmentation.** IoU, non-maximum suppression, two-stage and one-stage detectors, DETR, mAP, and U-Net and Mask R-CNN.

:::tip The one idea to keep
Convolutions bake in locality and weight sharing; residual connections made depth trainable; and with little data you always start from a pretrained backbone.
:::
`,
};
