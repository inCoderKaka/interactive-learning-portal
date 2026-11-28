# req3 · AI deep pass: outline (for review)

Written 2026-11-28 while the user was away (the user chose "research and proceed"). It is built from the user's answers
recorded in `inputs/req3.txt` (session 6): depth is what an **L5 machine-learning engineer** is expected to know, code is
**Python + PyTorch**, the question list is researched so that **finishing the portal is enough for any top company's AI
interview**, AI design questions become **mock-interview checkpoints**, the AI interview room gets a **Python Code tab**, and
**ML coding** questions are added as mocks.

## What the research says the interviews test

Sources: [Interview Query: Google MLE guide](https://www.interviewquery.com/guides/google-ml-engineer),
[DataInterview: Google MLE](https://www.datainterview.com/blog/google-machine-learning-engineer-interview),
[IGotAnOffer: Google MLE](https://igotanoffer.com/blogs/tech/google-machine-learning-engineer-interview),
[DataInterview: Google AI engineer](https://www.datainterview.com/blog/google-ai-engineer-interview),
[candidate report: Google L5 MLE 2026](https://www.finalroundai.com/community/t/google-l5-ml-engineer-onsite-2026-realized-too-late-its-basically-a-swe-interview-with-ml-on-top/150),
[Exponent: ML coding](https://www.tryexponent.com/courses/ml-engineer/ml-coding/ml-coding-intro),
[Towards AI: MLE refresher 2026](https://pub.towardsai.net/things-not-to-miss-a-high-signal-refresher-for-ml-engineering-interviews-in-2026-dd7ff63ce55b),
[IGotAnOffer: GenAI system design](https://igotanoffer.com/en/advice/generative-ai-system-design-interview),
[KDnuggets: AI system design questions](https://www.kdnuggets.com/?p=206628), plus the standard books: Chip Huyen,
*Designing Machine Learning Systems* (O'Reilly 2022) and *AI Engineering* (2025); Aminian & Xu, *Machine Learning System
Design Interview* (2023) and *Generative AI System Design Interview* (2024); Google's *Rules of ML* and ML Crash Course;
Goodfellow et al., *Deep Learning*; Zhang et al., *Dive into Deep Learning*; Stanford CS229 / CS231n / CS224n notes.

A Google L5 MLE loop (and the equivalent at Meta, OpenAI, Anthropic, Amazon, Microsoft) is roughly:

| Round | What it tests | Where the portal covers it |
|---|---|---|
| Coding (1–2) | SWE-bar algorithms | DSA area |
| ML system design (1–2) | Frame a product problem as ML, data and labels, features, model, offline and online evaluation, serving, monitoring, at scale | ML system design chapter + recsys + production chapters + 16 ML design mocks |
| GenAI / LLM system design (AI-engineer and many MLE loops) | RAG, agents, chatbots, code assistants, LLM serving and batching, evaluation, safety, cost | LLM chapters + 16 GenAI design mocks |
| ML domain / breadth | Bias–variance, losses, optimisers, regularisation, metrics, trees, deep learning, transformers, training at scale, statistics | Foundations to transformers chapters (quizzes, revise sheets) |
| ML coding | NumPy / PyTorch from scratch: logistic regression, k-means, kNN, attention, MLP + backprop, sampling, metrics | 16 ML coding mocks with the Python Code tab |
| Behavioural | Googleyness and leadership | Craft area (not in this pass) |

## Chapters and pages (course order)

The 30 existing AI topics stay as chapters (their ids, flashcards, drills and progress are kept). Four chapters are new
(marked NEW). Each new page gets Learn, Revise, a cheat sheet, common doubts, exercises, a quiz and sources, written for a
first-time learner first, then to L5-MLE depth (derivations included). A chapter with pages gets a plain-words overview in
place of its old lesson; the old lesson's material is folded into the pages.

1. **ai-history**: kept as is (no sub-pages).
2. **ai-math** (NEW) Maths for ML: linear algebra for ML · calculus and gradients · probability, likelihood and information · statistics and hypothesis tests.
3. **ai-ml-basics**: framing problems as ML · generalisation, overfitting and the bias–variance trade-off · validation, cross-validation and leakage · loss functions and where they come from · regularisation.
4. **ai-data** (NEW) Data and features: data collection, labels and sampling · class imbalance · feature engineering and the training–serving skew.
5. **ai-classic-models**: linear regression · logistic and softmax regression · decision trees and random forests · gradient boosting · SVMs, kNN and naive Bayes · clustering and dimensionality reduction (k-means, GMM/EM, PCA, t-SNE/UMAP).
6. **ai-metrics**: classification metrics, thresholds and calibration · ranking metrics · regression and business metrics · online experiments and A/B tests for ML.
7. **ai-neural-nets**: neurons, layers and activations · backpropagation · optimisers and learning-rate schedules · initialisation, normalisation and residuals · regularising and debugging training.
8. **ai-pytorch**: tensors and autograd · the training loop · performance, mixed precision and memory.
9. **ai-cnn**: convolution, padding, stride and pooling · CNN architectures to ResNet and ViT · detection and segmentation (IoU, NMS, anchors).
10. **ai-rnn**: RNNs, LSTMs and GRUs · sequence-to-sequence, attention and beam search.
11. **ai-embeddings**: word2vec and the idea of embeddings · contrastive learning and sentence embeddings · similarity, dimensions and embedding hygiene.
12. **ai-recsys** (NEW) Recommendation and ranking: collaborative filtering and matrix factorisation · two-tower retrieval and the funnel · ranking models (learning to rank, CTR models, multi-task) · cold start, exploration, position bias and feedback loops.
13. **ai-tokenization**: BPE, WordPiece and SentencePiece · what tokenization changes.
14. **ai-transformers**: self-attention step by step · multi-head attention and the transformer block · positional encodings (sinusoidal, RoPE, ALiBi) · encoder, decoder and encoder–decoder families · efficient attention (FlashAttention, MQA/GQA, long context) · mixture of experts.
15. **ai-llm-training**: pretraining data · scaling laws and compute budgets · distributed training (data, tensor, pipeline parallel, ZeRO/FSDP) · mixed precision and training memory.
16. **ai-alignment**: supervised fine-tuning and chat templates · reward models and RLHF with PPO · DPO and preference optimisation without RL.
17. **ai-reasoning**: chain of thought and test-time compute · training reasoning with reinforcement learning (verifiable rewards, GRPO, process rewards).
18. **ai-fine-tuning**: full fine-tuning vs parameter-efficient · LoRA and QLoRA · distillation.
19. **ai-decoding**: greedy, beam and sampling · structured output and constrained decoding · speculative decoding.
20. **ai-inference**: the KV cache and inference memory · batching and serving engines (continuous batching, PagedAttention) · quantization · latency, throughput and cost.
21. **ai-prompting**: prompt patterns · prompts that survive production.
22. **ai-context-engineering**: managing the context window · memory for assistants.
23. **ai-vector-search**: approximate nearest-neighbour indexes (IVF, HNSW, PQ) · vector databases in production.
24. **ai-rag**: the RAG pipeline · retrieval quality (hybrid search, reranking, query rewriting) · advanced RAG (agentic, graph, multimodal) · evaluating RAG.
25. **ai-kg-rag-case**: kept as is.
26. **ai-agents**: the agent loop and tool calling · planning and memory · multi-agent systems · reliable, safe agents.
27. **ai-mcp**: kept as is.
28. **ai-multimodal**: vision transformers and CLIP · speech: recognition and synthesis · multimodal LLMs.
29. **ai-generative-images**: GANs and VAEs · diffusion models.
30. **ai-evals**: how LLMs are evaluated · building an evaluation pipeline.
31. **ai-safety**: prompt injection and LLM security · hallucination and guardrails · fairness, privacy and responsible AI.
32. **ai-production** (NEW) ML in production: model serving patterns · monitoring, drift and retraining · ML pipelines and reproducibility.
33. **ai-system-design**: the ML system design framework · the GenAI system design framework · the ML coding round.
34. **ai-at-google**: kept as is.

About 95 pages. Visuals: the 21 existing AI widgets are reused where they fit, and new ones are added where seeing it
moving is what makes the idea stick (bias–variance fit, L1 vs L2, optimiser race, backprop step-through, tree splits,
boosting residuals, k-means, PCA, ROC/PR curve, NDCG ranking, A/B test simulator, two-tower funnel, causal attention mask,
RoPE rotation, KV-cache and continuous-batching timeline, parallelism bubbles, quantization error, speculative decoding,
MoE routing, drift monitor, LR schedules).

## Interview questions (all become mock-interview checkpoints)

**ML system design** (`d-ml-*`, stages: problem framing & metrics → data & features → model & training → evaluation →
serving & monitoring → deep dives): YouTube video recommendations · ads click-through prediction · search ranking ·
harmful content detection · Gmail spam filtering · people you may know · news feed ranking · Play Store app
recommendations · Maps ETA prediction · payment fraud detection · visual search (Lens-style) · query autocomplete ·
notification ranking · similar listings / product recommendations · event recommendations · YouTube duplicate and
copyright matching.

**GenAI system design** (`d-*`, area ai): the 3 existing (enterprise RAG, refund agent, Smart Compose) deepened, plus
ChatGPT-style assistant · coding assistant · LLM inference batching and serving platform · text-to-image service ·
LLM evaluation platform · meeting summariser · voice assistant · multimodal document Q&A · Smart Reply · LLM guardrails
service · deep-research agent · fine-tuning platform · personalised marketing copy generator.

**ML coding** (`d-mlc-*`, Python Code tab; stages: clarify → approach → code → test): linear regression by gradient
descent · logistic regression · k-means · kNN · decision-tree split · numerically stable softmax + cross-entropy and its
gradient · a two-layer MLP with backprop in NumPy · scaled dot-product and multi-head attention · causal self-attention with
a KV cache · BPE tokenizer training · top-k / top-p sampling and beam search · IoU and non-max suppression · ROC-AUC from
scratch · Adam optimiser · PCA by power iteration / SVD · a PyTorch training loop with a bug hunt.

Each question has prerequisites (it unlocks after its last prerequisite page) and a tree of interview paths.

## Shipping

Midway PR + merge + deploy after the foundations through CNN chapters; final PR + merge + deploy when AI is finished.
Craft is not part of this session.
