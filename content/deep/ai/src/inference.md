=== kv-cache
blurb: Why autoregressive generation caches keys and values, prefill versus decode, the KV-cache size formula and worked numbers, how it limits batch size and context, and techniques to shrink or share it (GQA, quantised KV, prefix caching, paging, eviction).
signals: "Why is LLM inference memory-hungry?" | "How much memory to serve N users at 32k context?" | "What is prefill vs decode?" | Capacity planning for LLM serving
widgets: kv-cache
prereq: transformer-block, efficient-attention

--- lesson
:::words
- **Autoregressive generation**: producing one token at a time, each conditioned on all previous tokens.
- **KV cache**: stored keys and values of all previous tokens for every layer, so they aren't recomputed each step.
- **Prefill**: processing the whole prompt at once to fill the cache and produce the first token.
- **Decode**: generating each further token, one forward pass per token.
- **TTFT**: time to first token (dominated by prefill). **TPOT / ITL**: time per output token (decode).
- **Prefix caching**: reusing the cached keys and values of a shared prompt prefix across requests.
:::

## The problem in plain words

To generate token 1,001, attention needs the keys and values of tokens 1–1,000 at every layer. Recomputing them each step would make generation quadratic and slow, so they're **cached**. The cache is what makes generation fast, and also what makes LLM serving expensive: for long contexts and many concurrent users, the KV cache uses more GPU memory than the model itself. Every LLM serving design starts with this arithmetic.

:::eli5
Reading a long book aloud and summarising as you go: instead of re-reading from page one before every new sentence, you keep notes on every page read so far. The notes make you fast, but a long book means a thick notebook, and a classroom of readers means many notebooks.
:::

## Prefill and decode

- **Prefill**: the prompt's $n$ tokens go through the model in one parallel pass, computing and storing K and V for every layer and position; the last position yields the first output token. Compute-bound (big matrix multiplies): cost ~$2N$ FLOPs per prompt token.
- **Decode**: each step processes one new token: compute its Q, K, V; append K, V to the cache; attend over all cached keys; output the next token. Each step reads **all weights and the whole KV cache** for very little arithmetic: memory-bound.

So: TTFT grows with prompt length (prefill); per-token latency grows with model size and cache size (decode).

## How big is the cache?

$$\text{KV bytes per token} = 2 \times L \times n_{\text{kv}} \times d_{\text{head}} \times \text{bytes}$$

(2 for keys and values, $L$ layers, $n_{\text{kv}}$ key/value heads.) Examples in bf16:

- Llama-2-7B style (32 layers, 32 KV heads × 128): $2 \times 32 \times 32 \times 128 \times 2 = 524$ KB per token. A 4k-token conversation: 2 GB. 32 such users: 64 GB, far more than the 14 GB of weights.
- Llama-3-70B style (80 layers, **8** KV heads × 128, GQA): $2 \times 80 \times 8 \times 128 \times 2 = 328$ KB per token. A 128k context: ~43 GB for one user.

Set a model, context length and number of users below; see when the cache, not the weights, fills the GPU:

[[widget:kv-cache]]

## Why it limits serving

GPU memory = weights + KV cache (+ activations, small at inference). The cache decides the **maximum batch size** (concurrent sequences), and batch size decides **throughput** (decode is memory-bound, so more sequences per weight read is almost free until compute or cache limits hit). Long contexts and many users compete for the same memory.

## Making the cache smaller or cheaper

- **Fewer KV heads**: GQA/MQA/MLA (efficient-attention page): 4–32× smaller.
- **KV-cache quantisation**: store K/V in FP8 or int8 (2× smaller), sometimes int4, with small quality loss.
- **Sliding-window / local layers**: only the last $w$ tokens cached for those layers.
- **Paged allocation**: avoid fragmentation and over-reservation (PagedAttention, next page).
- **Prefix caching**: system prompts, tool definitions, few-shot examples and long documents shared across requests are prefilled once and reused (radix-tree caches in SGLang; provider "context caching" with cheaper cached-input prices). Big savings for chat and RAG with common prefixes.
- **Eviction / compression** for very long contexts: keep "heavy hitter" tokens and recent tokens (H2O, StreamingLLM sinks); lossy, use carefully.
- **Offloading** cold caches to CPU memory or SSD for paused conversations.
- **Disaggregated serving**: run prefill and decode on separate GPU pools and transfer the cache (next pages).

## Interview angles

- Write the KV formula and compute it for the model in question; compare with weight memory; derive maximum concurrent users per GPU.
- "Why is decode slow?" Memory-bound: weights and cache read per token.
- "Reduce serving cost for long system prompts?" Prefix caching.
- "Serve 128k context?" GQA, FP8 KV, paging, prefix caching, maybe offloading; budget memory per user.

--- revise
### Phases
? Prefill? :: Process the whole prompt in one parallel pass, filling the cache; compute-bound; sets TTFT.
? Decode? :: One token per pass, reading all weights and the cache; memory-bound; sets time per token.
? What does the KV cache avoid? :: Recomputing previous tokens' keys and values every step.

### Size
? KV bytes per token? :: 2 × layers × KV heads × head dim × bytes.
? 7B (32 layers, 32 KV heads, 128 dim, bf16)? :: ~0.5 MB per token.
? Why does the cache limit throughput? :: It caps concurrent sequences (batch size) per GPU.

### Reduction
? Ways to shrink the KV cache? :: GQA/MQA/MLA, FP8/int8 KV quantisation, sliding-window layers, eviction.
? Prefix caching? :: Reuse cached K/V of shared prompt prefixes across requests.
? Disaggregated serving? :: Separate prefill and decode GPU pools, transferring the cache.

--- notes
## Phases
Prefill: whole prompt parallel, compute-bound, ~2N FLOPs/token → TTFT.
Decode: 1 token/step, reads weights + cache, memory-bound → TPOT.
## Size
bytes/token = 2·L·n_kv·d_head·bytes.
7B MHA (32L, 32×128, bf16) ≈ 524 KB/token; 4k ctx ≈ 2 GB; 32 users ≈ 64 GB vs 14 GB weights.
70B GQA (80L, 8×128) ≈ 328 KB/token; 128k ≈ 43 GB/user.
## Limits
Memory = weights + KV (+ small acts). KV → max batch → throughput.
## Shrink / share
GQA/MQA/MLA · FP8/int8 KV · sliding-window layers · paging (PagedAttention) · prefix caching (radix trees, provider context caching) · eviction (H2O, sinks) · offload · disaggregated prefill/decode.

--- doubts
Q: Why don't we cache the queries too?
A: A past token's query is only used to compute that token's own attention output, which was already done when it was generated. Future tokens need past keys (to be matched against) and values (to be mixed), not past queries.

Q: Is prefill or decode the bottleneck?
A: It depends on the workload. Long prompts with short answers (RAG, classification) are prefill-heavy (TTFT, compute). Chat and long generations are decode-heavy (memory bandwidth, cache size). Serving systems schedule the two differently, sometimes on separate hardware.

Q: Does prefix caching change the model's output?
A: No: the cached keys and values are exactly what would be recomputed for the same prefix (with identical tokens and positions). It only saves compute and time.

--- exercises
[estimate] A 13B model (40 layers, 40 KV heads of 128, bf16) serves on an 80 GB GPU. Weights take 26 GB. How many concurrent 8k-token sequences fit in the remaining memory (leave 6 GB of headroom)?
A: Per token: $2 \times 40 \times 40 \times 128 \times 2 = 819{,}200$ bytes ≈ 0.82 MB. Per 8k sequence: ≈ 6.7 GB. Available: 80 − 26 − 6 = 48 GB → about 7 sequences. With GQA (8 KV heads) it would be ~36; with FP8 KV, double that.

[design] A support chatbot's requests all share a 6,000-token system prompt (policies, tools, examples), followed by a short conversation. How would you cut cost and latency?
A: Prefix caching: prefill the shared 6k tokens once per server (or use the provider's context caching) and reuse their K/V for every request, so only the conversation tokens need prefill. TTFT drops sharply and cached input tokens are cheaper. Keep the prefix byte-identical (no per-request timestamps at the top); put variable content after it.

[estimate] For a 70B GQA model (328 KB per token of KV), how much memory does one user with a 1M-token context need, and what does that imply?
A: $10^6 \times 328$ KB ≈ 328 GB: more than four 80 GB GPUs just for one user's cache. Million-token contexts need KV quantisation, sliding-window or compressed caches, offloading, sequence parallelism across GPUs, or retrieval instead of full context.

--- pitfalls
- Sizing serving by weight memory alone
- Ignoring that long contexts and many users compete for cache memory
- Variable content at the start of prompts (breaks prefix caching)
- Assuming decode is compute-bound
- Lossy cache eviction without evaluation

--- quiz
Q: What does the KV cache store?
- Queries of past tokens
- *Keys and values of past tokens for every layer
- The model weights
- Output probabilities
W: Future tokens attend to past keys and values.

Q: Decode steps are usually limited by?
- Arithmetic throughput
- *Memory bandwidth (reading weights and cache each step)
- Disk speed
- Tokenization
W: Little computation per byte read.

Q: KV-cache bytes per token for 32 layers, 8 KV heads of 128, bf16?
- 32 KB
- 64 KB
- *128 KB
- 512 KB
W: 2 × 32 × 8 × 128 × 2 = 131,072 bytes.

Q: Prefix caching helps most when?
- Every prompt is unique
- *Many requests share a long identical prefix (system prompt, documents)
- Outputs are long
- The model is small
W: The shared prefix is prefilled once and reused.

--- sources
- paper :: Efficiently Scaling Transformer Inference :: Pope et al., Google (2022) :: https://arxiv.org/abs/2211.05102
- article :: LLM Inference Performance Engineering: Best Practices :: Databricks (MosaicML) :: https://www.databricks.com/blog/llm-inference-performance-engineering-best-practices
- paper :: SGLang: Efficient Execution of Structured Language Model Programs (RadixAttention) :: Zheng et al. (2023) :: https://arxiv.org/abs/2312.07104
- article :: Context caching :: Google AI for Developers (Gemini API) :: https://ai.google.dev/gemini-api/docs/caching

=== llm-serving-engines
blurb: How LLM serving engines achieve high throughput: static versus continuous (in-flight) batching, PagedAttention and block-based KV memory, chunked prefill, prefill–decode disaggregation, multi-LoRA serving, schedulers and admission control, and the major engines.
signals: "Design an LLM inference service" | "Why is continuous batching better?" | "What does vLLM do?" | Throughput vs latency trade-offs in serving
widgets: continuous-batching
prereq: kv-cache

--- lesson
:::words
- **Static batching**: grouping requests and running them together until all finish.
- **Continuous batching**: adding and removing requests from the running batch at every decode step.
- **PagedAttention**: storing each sequence's KV cache in fixed-size blocks, like virtual-memory pages.
- **Chunked prefill**: splitting a long prompt's prefill into chunks interleaved with other requests' decode steps.
- **Disaggregation**: running prefill and decode on separate machines.
- **Goodput**: requests served per second while meeting latency targets.
:::

## The problem in plain words

A GPU serving a language model wastes most of its power if it handles one request at a time (decode is memory-bound). Batching many requests shares each weight read across them. But requests arrive at random times and produce different lengths of output, so naive batching leaves GPUs idle and memory reserved for tokens never generated. Modern serving engines solve this with fine-grained scheduling and memory management; they deliver 5–20× more throughput than naive serving.

:::eli5
A taxi that waits until four passengers are ready, and won't pick anyone else up until all four are dropped off, drives around half-empty. A shuttle bus that lets people on and off at every stop stays full. Continuous batching is the shuttle bus.
:::

## Continuous batching

**Static batching** waits for a batch, runs it until the longest sequence finishes; slots of finished sequences sit idle, and new requests wait. **Continuous (in-flight) batching** (Orca, 2022) schedules at the granularity of a single decode iteration: after every step, finished sequences leave and waiting requests join (their prefill runs, then they decode alongside the others). The GPU stays full; throughput rises several-fold and queueing latency drops. Compare the two on a stream of requests:

[[widget:continuous-batching]]

## PagedAttention (vLLM)

Reserving a contiguous KV region per request for its maximum possible length wastes 60–80% of cache memory (internal fragmentation and over-reservation). **PagedAttention** (Kwon et al., 2023) stores the cache in fixed-size **blocks** (e.g. 16 tokens) allocated on demand, with a per-sequence **block table** mapping logical positions to physical blocks, exactly like OS virtual memory. Benefits: near-zero waste → much larger batches; **sharing** blocks across sequences (parallel samples of the same prompt, beam search, common prefixes) with copy-on-write. The attention kernel reads keys and values through the block table.

## Scheduling details

- **Chunked prefill**: a 30k-token prompt's prefill would stall everyone's decode for hundreds of milliseconds; splitting it into chunks mixed with decode steps keeps per-token latency smooth (Sarathi-Serve).
- **Preemption**: when the cache fills, pause low-priority sequences (swap their blocks to CPU or recompute later).
- **Admission control and priorities**: limit concurrent sequences, prioritise interactive over batch jobs, enforce per-tenant quotas and rate limits.
- **Disaggregated prefill and decode** (DistServe, Splitwise, and large production systems): prefill (compute-bound) and decode (memory-bound) have different hardware sweet spots and interfere with each other; separate pools, with the KV cache transferred over fast networks, improve goodput under latency targets.
- **Multi-LoRA serving**: one base model, many adapters, batched together with special kernels.
- **Speculative decoding** for latency (decoding chapter); **quantisation** for capacity (next page).

## Parallelism for big models

A 70B model in bf16 (140 GB) needs at least two 80 GB GPUs: **tensor parallelism** across GPUs in a server for latency; **pipeline parallelism** across servers for very large models; **data parallelism** (replicas behind a load balancer) for throughput; **expert parallelism** for MoE. Routers send requests to replicas, often with **cache-aware routing** (send a conversation to the replica that holds its prefix cache).

## The engines

- **vLLM**: PagedAttention, continuous batching, prefix caching, many models, LoRA, quantisation, speculative decoding; the most widely used open engine.
- **SGLang**: RadixAttention prefix sharing, fast structured outputs, strong performance.
- **TensorRT-LLM** (NVIDIA): optimised kernels, in-flight batching, FP8.
- **Hugging Face TGI**, **llama.cpp** (CPU/edge), **MLC**.
- At Google, TPU serving with JAX/XLA (e.g. the JetStream engine) and Saxml.

## Metrics

- **TTFT** (time to first token), **TPOT/ITL** (per output token), end-to-end latency (p50/p95/p99).
- **Throughput**: output tokens/s per GPU; requests/s.
- **Goodput**: throughput while meeting SLOs (e.g. TTFT < 1 s, TPOT < 50 ms).
- **Cost per million tokens** = GPU cost per hour ÷ tokens per hour.

Larger batches raise throughput but also per-token latency: the core serving trade-off, tuned per product.

## Interview angles

- "Design an LLM inference service." Request router + rate limits → engine with continuous batching, PagedAttention, prefix caching → model sharded with TP across GPUs → replicas autoscaled on queue depth and KV utilisation → metrics TTFT/TPOT/goodput → cost per token.
- "Why continuous batching?" Iteration-level scheduling keeps the GPU full despite variable lengths.
- "Why PagedAttention?" Removes cache fragmentation and reservation waste, enabling larger batches and prefix sharing.

--- revise
### Batching
? Static batching's waste? :: Finished sequences' slots idle until the longest ends; new requests wait.
? Continuous batching? :: Requests join and leave the batch at every decode step.
? Why does batching help decode? :: Decode is memory-bound; one weight read serves many sequences.

### Memory
? Problem PagedAttention solves? :: Contiguous per-request KV reservation wastes 60–80% of memory.
? How it works? :: Fixed-size KV blocks allocated on demand via a block table; shared blocks with copy-on-write.

### Scheduling
? Chunked prefill? :: Split long prompts' prefill into chunks interleaved with decode, smoothing latency.
? Disaggregated serving? :: Separate prefill and decode pools; transfer the KV cache.
? Cache-aware routing? :: Send a request to the replica holding its prefix cache.

### Metrics
? Key serving metrics? :: TTFT, TPOT/ITL, p99 latency, throughput, goodput, cost per million tokens.
? Batch size trade-off? :: Bigger batches: more throughput, higher per-token latency.

--- notes
## Batching
Static: idle slots, queueing. Continuous/in-flight (Orca): per-iteration join/leave → several× throughput.
## PagedAttention (vLLM)
Blocks (~16 tokens) on demand + block table (virtual memory). Removes fragmentation/over-reservation (60–80% waste).
Sharing: parallel samples, beams, prefixes (copy-on-write).
## Scheduling
Chunked prefill (Sarathi). Preemption (swap/recompute). Admission control, priorities, quotas.
Disaggregated prefill/decode (DistServe, Splitwise). Multi-LoRA (S-LoRA/Punica). Speculative decoding. Quantisation.
## Parallelism
TP in-server (latency), PP across servers, DP replicas (throughput), EP for MoE. Cache-aware routing.
## Engines
vLLM, SGLang (RadixAttention), TensorRT-LLM, TGI, llama.cpp, MLC; Google TPU: JetStream, Saxml.
## Metrics
TTFT, TPOT, p50/p95/p99, tokens/s/GPU, goodput under SLOs, cost per 1M tokens = GPU $/h ÷ tokens/h.

--- doubts
Q: Doesn't adding new requests to a running batch slow everyone down?
A: A little: each step processes more sequences, so per-token latency rises somewhat with batch size. But total throughput rises much more, and queueing time for new requests falls dramatically. Engines cap batch size or use SLO-aware scheduling to keep per-token latency within targets.

Q: Why do prefill and decode interfere?
A: A big prefill is a burst of heavy compute that delays the next decode step for every running sequence (a latency spike), while decode keeps GPU compute under-used. Chunked prefill smooths it within one GPU; disaggregation separates them entirely.

Q: Is self-hosting cheaper than an API?
A: At high, steady utilisation with a well-tuned engine, often yes; at low or bursty traffic, APIs usually win because you pay only for tokens used. Include engineering, on-call and idle GPU costs in the comparison.

--- exercises
[estimate] An 8× H100 server costs about USD 25 per hour and serves a 70B model at 2,500 output tokens/s aggregate with continuous batching. What's the cost per million output tokens?
A: Tokens per hour = $2500 \times 3600 = 9$M. Cost per million = $25/9 \approx$ USD 2.8. Raising utilisation (bigger batches, FP8, speculative decoding) lowers it; idle hours raise it.

[design] Design the serving layer for an internal assistant with a 4k-token shared system prompt, bursty daytime traffic and a TTFT target of 800 ms.
A: Gateway with auth, per-team rate limits and priority classes → router doing cache-aware routing to replicas → vLLM/SGLang replicas with continuous batching, PagedAttention and prefix caching of the system prompt (pinned), chunked prefill to protect TPOT, FP8 weights and KV. Autoscale replicas on queue depth and KV-cache utilisation, with warm minimums during work hours. Monitor TTFT/TPOT p95, goodput, cache hit rate, cost per million tokens; load-test with realistic prompt/response length distributions.

[break] A team doubles max batch size to raise throughput, and p99 TTFT jumps from 0.7 s to 4 s at peak. Why?
A: Larger batches lengthen each decode step and fill the KV cache, so new requests wait for memory and their prefill competes with a big running batch; long prompts also stall decode steps. Use chunked prefill, SLO-aware admission (cap concurrent sequences by TTFT budget), priority scheduling, or add replicas instead of only growing batches.

--- pitfalls
- Static batching or one-request-at-a-time serving
- Reserving KV memory for maximum length per request
- Long prefills stalling everyone's decode
- Measuring throughput without latency SLOs (goodput)
- Ignoring prefix-cache locality when routing

--- quiz
Q: What distinguishes continuous batching?
- Bigger fixed batches
- *Requests can join and leave the batch at every decode step
- Batching only prefills
- No GPUs needed
W: Iteration-level scheduling keeps the GPU full.

Q: PagedAttention manages the KV cache like?
- A hash table
- *Virtual-memory pages: fixed-size blocks mapped through a table
- A queue
- A tree of experts
W: Blocks are allocated on demand and can be shared.

Q: Chunked prefill mainly improves?
- Model accuracy
- *Smoothness of per-token latency for running requests when long prompts arrive
- Training speed
- Tokenization
W: Long prefills no longer stall decode steps.

Q: Goodput is?
- Total tokens per second
- *Throughput achieved while meeting latency targets
- GPU utilisation
- Cache hit rate
W: It's the throughput that actually counts for users.

--- sources
- paper :: Efficient Memory Management for Large Language Model Serving with PagedAttention (vLLM) :: Kwon et al. (SOSP 2023) :: https://arxiv.org/abs/2309.06180
- paper :: Orca: A Distributed Serving System for Transformer-Based Generative Models :: Yu et al. (OSDI 2022) :: https://www.usenix.org/conference/osdi22/presentation/yu
- paper :: DistServe: Disaggregating Prefill and Decoding for Goodput-optimized LLM Serving :: Zhong et al. (OSDI 2024) :: https://arxiv.org/abs/2401.09670
- paper :: Taming Throughput-Latency Tradeoff in LLM Inference with Sarathi-Serve :: Agrawal et al. (OSDI 2024) :: https://arxiv.org/abs/2403.02310

=== quantization
blurb: Running models in fewer bits: number formats, scales and zero points, per-tensor versus per-channel versus group-wise quantisation, weight-only int8/int4 (GPTQ, AWQ), activation outliers and SmoothQuant, FP8, quantisation-aware training, and how to evaluate the quality cost.
signals: "Fit a 70B model on fewer GPUs" | "INT4 vs FP8?" | "Why are activations hard to quantise?" | On-device and cost-reduction designs
widgets: quantization
prereq: kv-cache, pytorch-performance

--- lesson
:::words
- **Quantisation**: representing numbers with fewer bits (8 or 4 instead of 16).
- **Scale and zero point**: the numbers that map integers back to real values: $x \approx s \cdot (q - z)$.
- **Per-channel / group-wise**: using a separate scale for each output channel or each small block of weights.
- **Weight-only quantisation**: weights stored in low bits, activations kept in 16-bit.
- **Outlier**: a value much larger than the rest, which forces a large scale and wastes precision.
- **PTQ / QAT**: post-training quantisation (after training) vs quantisation-aware training (simulating quantisation during training).
:::

## The problem in plain words

A 70B model in bf16 needs 140 GB just for weights, and every generated token reads all of it from memory. Storing weights in 4 bits cuts that to ~35 GB: fewer GPUs, more room for the KV cache, and faster decoding (less to read). The challenge is doing it without making the model noticeably worse. Quantisation is now standard in LLM serving and on-device AI, and interviewers ask how it works and what breaks.

:::eli5
Describing temperatures with whole numbers instead of three decimals: you lose a little detail but the forecast is still useful, and it's much quicker to say. The trick is choosing the range well: if one freak reading of 500° sets your scale, every normal day rounds to the same number.
:::

## The basics

Uniform (affine) quantisation to $b$ bits:

$$q = \text{clip}\Big(\text{round}\big(x / s\big) + z,\; 0,\; 2^b - 1\Big), \qquad \hat x = s\,(q - z)$$

Symmetric quantisation uses $z = 0$ and $s = \max|x| / (2^{b-1} - 1)$. The rounding error is at most $s/2$, so precision depends on the **range** each scale covers:

- **Per-tensor**: one scale for a whole matrix: cheap, but one outlier ruins precision for everything.
- **Per-channel**: one scale per output row: standard for int8 weights.
- **Group-wise**: one scale per block of 32–128 weights: standard for 4-bit weights (adds ~0.25–0.5 bits/weight of overhead).

Quantise a weight vector below with different bit widths and group sizes, and add an outlier to see the error jump:

[[widget:quantization]]

## Weight-only quantisation (int8, int4)

Decode is memory-bound, so shrinking weights speeds it up even if maths still runs in 16-bit (dequantise on the fly inside the kernel).

- **Round-to-nearest (RTN)** works well at 8 bits, poorly at 4 bits for some models.
- **GPTQ** (Frantar et al.): quantise weights column by column and adjust the remaining weights to compensate for each rounding error, using second-order (Hessian) information from a small calibration set. Good 4-bit and 3-bit results.
- **AWQ** (activation-aware): protect the ~1% of weight channels that multiply large activations by scaling them before quantisation.
- **NF4** (QLoRA) for fine-tuning bases; **GGUF** formats (llama.cpp) for CPU/edge with mixed bit widths.

Typical results: int8 weights are nearly lossless; 4-bit with GPTQ/AWQ loses a little (often 1–3% on benchmarks, more on hard reasoning); below 4 bits degrades faster, more for small models.

## Activations and outliers

Quantising activations too (W8A8) lets matrix multiplies run on fast int8 or FP8 tensor cores, speeding up prefill (compute-bound). But LLM activations contain **outlier features**: a few channels with values 100× larger than the rest (emerging around 6.7B parameters, Dettmers et al.). Per-tensor activation quantisation then destroys precision. Fixes:

- **LLM.int8()**: keep outlier columns in 16-bit, the rest in int8.
- **SmoothQuant**: mathematically move the difficulty from activations to weights by scaling channels ($XW = (X\,\text{diag}(s)^{-1})(\text{diag}(s)\,W)$).
- **Rotations** (QuaRot, SpinQuant): multiply by orthogonal matrices that spread outliers evenly before quantising, enabling 4-bit activations.

## FP8 and friends

**FP8** (E4M3 for weights/activations, E5M2 for gradients) is a floating-point format with per-tensor or per-block scales, supported in hardware on H100-class GPUs and newer TPUs. It handles outliers better than int8 (exponent bits give range), and is now common for both inference (~2× throughput over bf16) and large-scale training. Newer hardware adds FP4/MX (micro-scaled) formats with small block scales.

## QAT and evaluation

- **Quantisation-aware training**: simulate quantisation in the forward pass during fine-tuning (straight-through estimator for gradients) so the model adapts; best quality at very low bits (Gemma's QAT int4 checkpoints, on-device models).
- **Evaluate** the quantised model on the tasks you care about, not just perplexity: long-context, reasoning, code and multilingual tasks often degrade first. Check calibration-set sensitivity.

## What to quantise for what goal

| Goal | Typical choice |
|---|---|
| Fit a big model on fewer GPUs / more KV room | 4-bit weight-only (AWQ/GPTQ) or FP8 weights |
| Faster decode at small batch | Weight-only 4/8-bit (less memory traffic) |
| Faster prefill / high-batch throughput | W8A8 or FP8 (compute on low-precision tensor cores) |
| Longer contexts per GPU | FP8/int8 KV cache |
| Phones and laptops | 4-bit weights (QAT where possible), int8 activations, GGUF/LiteRT |

## Interview angles

- "Fit 70B on one 80 GB GPU?" 4-bit weights (~35–40 GB) with AWQ/GPTQ, leaving room for the KV cache (maybe FP8 KV); evaluate the quality hit.
- "Why are activations hard?" Outlier channels; SmoothQuant, mixed precision, rotations, FP8.
- "Weight-only vs W8A8?" Weight-only helps memory-bound decode; W8A8/FP8 helps compute-bound prefill and large batches.

--- revise
### Basics
? Affine quantisation formula? :: q = clip(round(x/s) + z); x̂ = s(q − z).
? Maximum rounding error? :: Half the scale.
? Per-tensor vs per-channel vs group-wise? :: One scale per matrix vs per output row vs per block of 32–128 weights.
? Why groups for 4-bit? :: Smaller ranges per scale preserve precision.

### Weights
? Why does weight-only quantisation speed up decode? :: Decode is memory-bound; fewer bytes to read.
? GPTQ? :: Column-by-column quantisation compensating errors using Hessian information from calibration data.
? AWQ? :: Protect weight channels with large activations by scaling before quantisation.
? Typical 4-bit quality cost? :: Small (~1–3% on benchmarks), larger on hard reasoning and small models.

### Activations
? Activation outliers? :: A few channels with huge values (from ~6.7B params) that wreck per-tensor scales.
? SmoothQuant? :: Shift quantisation difficulty from activations to weights with per-channel scaling.
? Rotation methods? :: Orthogonal transforms spread outliers so activations quantise to 4-bit.
? FP8 advantage? :: Exponent bits give range for outliers; hardware support; ~2× over bf16.

### Practice
? QAT? :: Simulate quantisation during training so the model adapts.
? What to evaluate after quantising? :: Real tasks: reasoning, long context, code, multilingual, not just perplexity.

--- notes
## Basics
q = clip(round(x/s) + z, 0, 2ᵇ−1); x̂ = s(q − z). Symmetric z = 0, s = max|x|/(2^{b−1}−1). Error ≤ s/2.
Per-tensor (outlier-fragile) · per-channel (int8 weights) · group-wise 32–128 (4-bit; +0.25–0.5 bit overhead).
## Weight-only
Helps memory-bound decode; dequantise in kernel. RTN fine at 8-bit.
GPTQ (Hessian-compensated, calibration set). AWQ (activation-aware scaling). NF4. GGUF (llama.cpp).
int8 ≈ lossless; int4 small loss; <4 bits degrades (small models worse).
## Activations
Outlier features (~6.7B+). LLM.int8() mixed precision. SmoothQuant (diag scaling to weights). QuaRot/SpinQuant rotations → W4A4.
## FP8
E4M3 / E5M2 + scales; H100, TPU; ~2× vs bf16; training too. FP4/MX block formats.
## QAT & eval
QAT with straight-through estimator (Gemma QAT int4). Evaluate real tasks; long context/reasoning/code/multilingual first to break.
## Choose
Memory → 4-bit weights/FP8. Decode speed → weight-only. Prefill/throughput → W8A8/FP8. Context → FP8/int8 KV. Edge → 4-bit QAT + GGUF/LiteRT.

--- doubts
Q: Why does 4-bit work at all when each weight has only 16 possible values?
A: Each group of ~64–128 weights gets its own scale, so the 16 levels are placed where that group's values actually lie, and methods like GPTQ adjust remaining weights to cancel rounding errors. Neural networks are also robust to small, noise-like perturbations of their weights, especially large models with redundancy.

Q: Is a quantised 70B better than an unquantised 13B with the same memory?
A: Usually yes: a 4-bit 70B (~35–40 GB) tends to beat a bf16 13B (~26 GB) or even a bf16 34B on most tasks. Bigger-but-quantised often wins at equal memory, down to about 4 bits.

Q: Does quantisation affect the KV cache too?
A: Only if you quantise it explicitly. KV-cache quantisation (FP8/int8) is separate from weight quantisation and mainly increases how many tokens or users fit in memory; it has its own small quality cost, particularly for long contexts.

--- exercises
[estimate] Quantise the weights [0.12, −0.40, 0.05, 0.31] symmetrically to 4 bits with one scale. What are the integers and the reconstructed values?
A: Max |x| = 0.40; range of signed 4-bit is −7…7 (symmetric), so $s = 0.40/7 \approx 0.0571$. q = round(x/s): 0.12/0.0571 ≈ 2.1 → 2; −0.40 → −7; 0.05 → 0.88 → 1; 0.31 → 5.43 → 5. Reconstructed: 0.114, −0.400, 0.057, 0.286. Errors up to ~0.024 (≤ s/2).

[choose] You serve a 70B chat model at moderate traffic on 4× 80 GB GPUs and want to cut to 2 GPUs. Options?
A: 4-bit weight-only (AWQ/GPTQ) brings weights to ~38 GB, fitting on 2 GPUs with ~120 GB left for KV cache (with FP8 KV for more). Alternatively FP8 weights (~70 GB) on 2 GPUs leaves less KV room but better quality and faster prefill on FP8 hardware. Evaluate both on your traffic's tasks and latency; pick 4-bit if quality holds, FP8 if prefill-heavy.

[break] After int8 per-tensor activation quantisation, a 13B model's outputs become gibberish, though weight-only int8 was fine. Why?
A: Outlier activation channels force a huge per-tensor scale, so normal activations all round to a few values (near zero). Use per-token/per-channel scales, LLM.int8() mixed precision for outlier columns, SmoothQuant to migrate the range to weights, or FP8.

--- pitfalls
- Per-tensor scales with outlier-heavy activations
- Judging quantised models by perplexity only
- Quantising tiny models aggressively (they degrade more)
- Ignoring calibration-set choice for GPTQ/AWQ
- Expecting weight-only quantisation to speed up compute-bound prefill

--- quiz
Q: Why does weight-only int4 speed up decoding?
- It reduces FLOPs
- *Decode is memory-bound, and 4× fewer bytes must be read per token
- It shortens prompts
- It removes the KV cache
W: Less memory traffic per step.

Q: Why use a separate scale per group of 64 weights?
- To save compute
- *Smaller ranges per scale give finer precision, limiting outlier damage
- It's required by GPUs
- To add sparsity
W: Precision depends on the range each scale covers.

Q: What problem does SmoothQuant address?
- Weight outliers
- *Activation outliers that make activation quantisation inaccurate
- Slow tokenization
- KV-cache size
W: It migrates difficulty from activations to weights.

Q: FP8 handles outliers better than int8 because?
- It has more bits
- *Its exponent bits give a wider dynamic range
- It uses no scale
- It's slower
W: Floating point trades precision for range.

--- sources
- paper :: GPTQ: Accurate Post-Training Quantization for Generative Pre-trained Transformers :: Frantar et al. (2022) :: https://arxiv.org/abs/2210.17323
- paper :: AWQ: Activation-aware Weight Quantization for LLM Compression :: Lin et al. (MLSys 2024) :: https://arxiv.org/abs/2306.00978
- paper :: LLM.int8(): 8-bit Matrix Multiplication for Transformers at Scale :: Dettmers et al. (2022) :: https://arxiv.org/abs/2208.07339
- paper :: SmoothQuant: Accurate and Efficient Post-Training Quantization for LLMs :: Xiao et al. (2022) :: https://arxiv.org/abs/2211.10438
- paper :: FP8 Formats for Deep Learning :: Micikevicius et al., NVIDIA/Arm/Intel (2022) :: https://arxiv.org/abs/2209.05433

=== latency-cost
blurb: Estimating and optimising LLM latency, throughput and cost end to end: the latency model for prefill and decode, throughput–latency curves, cost per token, model routing and cascades, caching, batching APIs, and a worked capacity plan.
signals: "Estimate cost and GPUs for this LLM feature" | "Latency is too high: what do you do?" | "Self-host or API?" | Every GenAI system design's estimation section
widgets: llm-capacity
prereq: llm-serving-engines, quantization

--- lesson
:::words
- **Latency**: how long one request takes (TTFT plus generation time).
- **Throughput**: how many tokens or requests the system handles per second.
- **SLO**: service-level objective, a target like "p95 TTFT under 1 second".
- **Model routing / cascade**: sending easy requests to a small, cheap model and hard ones to a large model.
- **Semantic cache**: reusing answers for questions that mean the same thing as earlier ones.
- **Batch API**: a cheaper, slower endpoint for non-urgent jobs.
:::

## The problem in plain words

An LLM feature that's brilliant in a demo can be unaffordable or too slow in production. Interviewers expect you to put numbers on a design: tokens per request, requests per second, GPUs or API spend, and latency, then show the levers that bring them down. This page gathers the formulas and the optimisation playbook.

:::eli5
Running a restaurant: how long each dish takes (latency), how many dishes per hour the kitchen can make (throughput), and what each dish costs (ingredients plus the chef's time). You can hire a faster chef (bigger GPU), cook several dishes at once (batching), prepare common sauces in advance (caching), or let a junior cook handle simple orders (routing).
:::

## A latency model

For a request with $n_{\text{in}}$ prompt tokens and $n_{\text{out}}$ output tokens:

$$\text{latency} \approx \underbrace{t_{\text{queue}} + n_{\text{in}} \cdot t_{\text{prefill/token}}}_{\text{TTFT}} + n_{\text{out}} \cdot t_{\text{decode/token}}$$

- **Prefill** is compute-bound: $t_{\text{prefill/token}} \approx \frac{2N}{\text{FLOP/s} \times \text{MFU}}$. A 70B model on 8 GPUs (~8 PFLOP/s bf16 peak, 50% MFU): ~35 µs/token, so a 4k prompt ≈ 0.14 s.
- **Decode** is memory-bound at small batch: $t_{\text{decode}} \approx \frac{\text{weight bytes} + \text{KV bytes}}{\text{bandwidth}}$. 70B bf16 (140 GB) over 8 × 3.35 TB/s ≈ 5.2 ms/token minimum, so 500 output tokens ≈ 2.6 s plus overheads.
- **Output length dominates** user-visible latency for long answers; streaming hides it partly (users read as tokens arrive).

## Throughput and cost

Batching more sequences raises tokens/s per GPU nearly linearly until compute or KV memory runs out, while per-token latency rises slowly. Pick the operating point that meets the SLO with the most throughput (goodput). Then:

$$\text{cost per 1M output tokens} = \frac{\text{GPU cost per hour}}{\text{output tokens per hour}} \times 10^6$$

For APIs: cost = input tokens × input price + output tokens × output price (cached input cheaper; batch endpoints ~50% off).

Plan a workload below: traffic, prompt and output sizes, model and hardware; see GPUs needed, latency and cost:

[[widget:llm-capacity]]

## The optimisation playbook

Ordered roughly by effort:

1. **Shorter prompts**: trim instructions, retrieve fewer but better chunks (reranking), summarise history, compact tool schemas. Input tokens are often 80–95% of the total.
2. **Shorter outputs**: ask for concise answers; set max tokens; structured outputs instead of prose.
3. **Prefix / context caching** for shared system prompts and documents.
4. **Routing and cascades**: a classifier or the small model's own confidence sends easy queries to a small model (often 70–90% of traffic), hard ones to the big model. Or try the small model first and escalate on low confidence or failed checks.
5. **Semantic caching**: return a cached answer when a new query's embedding is very close to a past one (careful: personalisation, freshness, wrong matches).
6. **Batch APIs / offline jobs** for anything not interactive (summarising archives, labelling).
7. **Quantisation** (FP8/4-bit) and **speculative decoding** for self-hosted serving.
8. **Distil or fine-tune a smaller model** to replace a big prompted one for a narrow task.
9. **Right hardware and engine settings**: continuous batching, PagedAttention, TP size, max batch tuned to SLO.

## Self-host or API?

| Factor | API | Self-host (open model) |
|---|---|---|
| Traffic | Low or bursty | High and steady (high utilisation) |
| Quality needed | Frontier quality | Open models good enough |
| Data control | Provider terms acceptable | Strict data residency/privacy |
| Team | Small | Has serving expertise |
| Customisation | Prompting, some fine-tuning | Full control (LoRA, quantisation, custom decoding) |

## A worked plan

A support assistant: 2M requests/day, 3k input tokens (after RAG), 300 output tokens, peak 3× average.

- Average QPS ≈ 23; peak ≈ 70.
- Tokens/day: 6B input, 0.6B output.
- API at USD 1/M in, USD 4/M out: USD 6,000 + 2,400 ≈ USD 8,400/day. With 60% prefix-cache hits at a quarter of the price: input ≈ USD 3,300, total ≈ USD 5,700/day.
- Self-host a 70B model at ~2,500 output tokens/s per 8-GPU server (prefill load included roughly): peak output rate = 70 × 300 = 21,000 tokens/s → ~9 servers at peak (more for TTFT headroom), fewer off-peak with autoscaling.
- Routing 75% of queries to an 8B model would cut either option by more than half.

## Interview angles

- Always estimate: QPS, tokens in/out, cost/day, GPUs at peak, TTFT and total latency; state assumptions.
- "Too slow?" Measure TTFT vs decode; cut prompt (TTFT) or output length (decode); prefix caching; smaller/quantised model; speculative decoding; streaming.
- "Too expensive?" Prompt diet, routing to small models, caching, batch APIs, distillation.

--- revise
### Latency
? Latency decomposition? :: Queue + prefill (TTFT) + output tokens × time per token.
? Prefill time per token? :: ≈ 2N / (FLOP/s × MFU): compute-bound.
? Decode time per token at small batch? :: ≈ (weight + KV bytes) / bandwidth: memory-bound.
? Biggest driver of user-visible latency for long answers? :: Output length.

### Cost
? Cost per 1M tokens self-hosted? :: GPU cost per hour ÷ tokens per hour × 10⁶.
? API cost? :: Input tokens × input price + output tokens × output price (cached and batch cheaper).
? What usually dominates token counts in RAG apps? :: Input tokens (instructions + retrieved context + history).

### Levers
? Top cost/latency levers? :: Shorter prompts and outputs, prefix caching, routing/cascades, semantic caching, batch APIs, quantisation, speculative decoding, distillation.
? Routing/cascade? :: Easy queries to a small model, hard ones (or low-confidence) escalated to a large model.
? When self-host? :: High steady traffic, open model good enough, data control, serving expertise.

--- notes
## Latency
latency ≈ queue + n_in·t_prefill + n_out·t_decode.
t_prefill ≈ 2N/(FLOP/s·MFU): 70B, 8 GPUs, 50% → ~35 µs/token (4k ≈ 0.14 s).
t_decode ≈ (weights + KV)/bandwidth: 140 GB / 26.8 TB/s ≈ 5.2 ms/token.
Output length dominates; stream.
## Throughput / cost
Batch ↑ → tokens/s ↑ until compute/KV limit; latency ↑ slowly. Goodput at SLO.
$/1M = GPU $/h ÷ tokens/h × 1e6. API: in·p_in + out·p_out; cache & batch discounts.
## Playbook
Prompt diet · short outputs · prefix cache · routing/cascade (70–90% small) · semantic cache · batch APIs · quantise + speculative · distil/fine-tune small · engine tuning.
## Self-host vs API
High steady traffic + open quality OK + data control + expertise → self-host; else API.
## Worked
2M req/day, 3k in, 300 out: ~23 QPS avg, 70 peak; 6B in + 0.6B out tokens/day; API ≈ USD 8.4k/day (≈5.7k with caching); self-host ≈ 9 × 8-GPU servers at peak.

--- doubts
Q: Why is input usually cheaper per token than output?
A: Input tokens are processed in parallel during prefill, using the hardware efficiently; each output token needs its own memory-bound decode step. Providers price accordingly.

Q: Is a semantic cache safe?
A: Only with care: two similar-looking questions can need different answers ("cancel my order" vs "can I cancel an order?"), answers may be personal or time-sensitive, and stale cached answers can mislead. Use high similarity thresholds, scope caches per user or tenant where needed, set expiry, and exclude personalised or tool-dependent responses.

Q: How do I choose between a bigger model with fewer tokens and a smaller model with more reasoning?
A: Measure. For many tasks a mid-size model with a bit of reasoning or self-consistency matches a larger one at lower cost; for knowledge-heavy or very hard tasks, size wins. Evaluate quality per dollar and per second on your own data.

--- exercises
[estimate] A 7B model in bf16 on one H100 (3.35 TB/s) decodes at batch size 1. Minimum time per token, and the time to generate 400 tokens after a 2k-token prompt (prefill at 50% of 990 TFLOP/s)?
A: Decode ≥ 14 GB / 3.35 TB/s ≈ 4.2 ms/token → 400 tokens ≈ 1.7 s. Prefill: $2 \times 7\times10^9 \times 2048 \approx 2.9\times10^{13}$ FLOPs ÷ $4.95\times10^{14}$ ≈ 58 ms. Total ≈ 1.75 s plus overheads; output length dominates.

[design] Cut the cost of an LLM feature that summarises every support ticket (500k/day, 2k input tokens, 200 output tokens) by 5×.
A: It's offline: use batch APIs (~50% off). Trim inputs (strip signatures, quoted email history: maybe −40%). Route: a fine-tuned or distilled small model handles routine tickets (~80%) with quality spot-checks; escalate long or complex ones to the large model. Cache summaries of duplicate tickets. Combined: 0.5 × 0.6 × (0.8 × 0.1 + 0.2) ≈ 0.08 of the original: >10×.

[choose] Your p95 latency target is 2 s, and responses average 600 output tokens on a 70B model decoding at ~25 ms/token under load. What would you change?
A: 600 × 25 ms = 15 s: impossible without changes. Options: stream so users see output immediately (perceived latency = TTFT); shorten outputs (concise instructions, structured answers); a smaller or quantised model with speculative decoding (e.g. 8B at ~10 ms/token, 200 tokens → 2 s); reduce batch size per replica for faster tokens; route only hard queries to the big model.

--- pitfalls
- Designing without token and cost estimates
- Ignoring output length's effect on latency
- Treating all traffic as needing the largest model
- Semantic caching without scoping or expiry
- Comparing self-hosting and APIs without utilisation and engineering costs

--- quiz
Q: For a long generated answer, what usually dominates latency?
- Tokenization
- Prefill
- *Number of output tokens × time per token
- Network
W: Decode is sequential.

Q: Self-hosted cost per million tokens equals?
- Model size × price
- *GPU cost per hour ÷ tokens per hour × 10⁶
- Input tokens × output tokens
- FLOPs × bandwidth
W: Utilisation drives it.

Q: A model cascade means?
- Running several models in parallel always
- *Trying a small model first and escalating to a large one when needed
- Training models in sequence
- Pipeline parallelism
W: Most queries are served cheaply.

Q: Which is best for non-interactive bulk jobs?
- Lower temperature
- *Batch APIs or offline batch inference
- Speculative decoding
- Semantic cache
W: Cheaper when latency doesn't matter.

--- sources
- article :: LLM Inference Performance Engineering: Best Practices :: Databricks (MosaicML) :: https://www.databricks.com/blog/llm-inference-performance-engineering-best-practices
- paper :: FrugalGPT: How to Use Large Language Models While Reducing Cost and Improving Performance :: Chen, Zaharia, Zou (2023) :: https://arxiv.org/abs/2305.05176
- book :: AI Engineering (chapter 9, inference optimisation) :: Chip Huyen :: https://www.oreilly.com/library/view/ai-engineering/9781098166298/
- paper :: Efficiently Scaling Transformer Inference :: Pope et al., Google (2022) :: https://arxiv.org/abs/2211.05102
