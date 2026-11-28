=== sampling-strategies
blurb: How a language model turns probabilities into text: greedy decoding, beam search and its length bias, temperature, top-k, top-p (nucleus) and min-p sampling, repetition penalties, stop conditions, and implementing them from logits.
signals: "Implement top-k / top-p sampling" (ML coding) | "Why does greedy decoding repeat itself?" | "Temperature 0 vs 1?" | Choosing decoding settings for a product
widgets: sampling
prereq: transformer-families, probability-ml

--- lesson
:::words
- **Logits**: the model's raw scores for every vocabulary token at the next position.
- **Decoding**: the rule that picks the next token from those scores.
- **Greedy decoding**: always pick the single most likely token.
- **Beam search**: keep the best few partial sequences at each step instead of just one.
- **Temperature**: divides logits before softmax; low = more focused, high = more random.
- **Top-k**: sample only from the k most likely tokens. **Top-p (nucleus)**: sample from the smallest set of tokens whose probabilities add up to p.
- **Repetition penalty**: lowering the scores of tokens that already appeared.
:::

## The problem in plain words

A language model doesn't output text; at each step it outputs a probability for every possible next token. **Decoding** decides which one to actually write. The choice changes everything you see: always taking the top token gives safe but repetitive text; sampling freely gives variety but sometimes nonsense. Product teams tune decoding per use case (deterministic for code and extraction, creative for brainstorming), and implementing top-k/top-p from logits is a common coding question.

:::eli5
A storyteller choosing each next word. Greedy always says the most obvious word, and stories become dull and loop. Pure random picks occasionally say something absurd. Top-p lets them choose among only the sensible options, sometimes picking a less obvious one to keep things interesting.
:::

## Greedy and beam search

- **Greedy**: $x_t = \arg\max p(x \mid x_{<t})$. Deterministic and fast, but myopic (the best next token may lead to a worse sentence) and prone to **repetition loops** in open-ended text.
- **Beam search** (width $B$): keep the $B$ highest-probability partial sequences; extend each by all tokens; keep the top $B$ by total log-probability; stop at end tokens. Better for tasks with one right answer (translation, speech recognition, short summaries). Issues: favours **short** outputs (each token multiplies in a probability < 1), so use **length normalisation** (divide log-probability by length$^\alpha$); outputs are bland and repetitive for open-ended generation; costs $B\times$ compute.

## Sampling with temperature

Draw $x_t \sim \text{softmax}(z/T)$:

- $T \to 0$: approaches greedy.
- $T = 1$: the model's own distribution.
- $T > 1$: flatter, more random (more creative, more errors).

Pure sampling at $T = 1$ occasionally picks very unlikely tokens from the long tail (with 100k tokens, the tail adds up), which can derail text. Truncation methods cut the tail.

## Truncation: top-k, top-p, min-p

- **Top-k**: keep the $k$ highest-probability tokens, renormalise, sample. Fixed $k$ is awkward: when the model is sure, $k = 50$ still allows junk; when it's unsure, $k = 50$ may cut good options.
- **Top-p / nucleus** (Holtzman et al.): sort tokens by probability and keep the smallest set whose cumulative probability ≥ $p$ (e.g. 0.9). The set adapts: tiny when the model is confident, large when it isn't.
- **Min-p**: keep tokens with probability ≥ min_p × (top token's probability). Scales with confidence; robust at high temperatures.
- Order matters: typically apply temperature, then truncation, then renormalise and sample.

Adjust temperature, top-k and top-p below and see which tokens remain candidates:

[[widget:sampling]]

```python
import numpy as np

def sample_next(logits, temperature=0.8, top_k=0, top_p=0.9, rng=np.random.default_rng()):
    if temperature == 0:
        return int(np.argmax(logits))
    z = logits / temperature
    if top_k:
        kth = np.partition(z, -top_k)[-top_k]
        z = np.where(z < kth, -np.inf, z)
    p = np.exp(z - z.max()); p /= p.sum()
    if top_p < 1.0:
        order = np.argsort(-p)
        cum = np.cumsum(p[order])
        cutoff = np.searchsorted(cum, top_p) + 1          # keep the smallest prefix reaching top_p
        keep = order[:cutoff]
        mask = np.zeros_like(p, dtype=bool); mask[keep] = True
        p = np.where(mask, p, 0); p /= p.sum()
    return int(rng.choice(len(p), p=p))
```

## Repetition and stopping

- **Repetition / frequency / presence penalties**: reduce logits of tokens that already appeared (by a factor or by count). Helps loops; can hurt when repetition is correct (code, names).
- **No-repeat n-gram** blocking (beam search for summaries).
- **Stop conditions**: end-of-sequence token, stop strings ("\n\nUser:"), maximum new tokens.
- **Seeds**: fix the random seed for reproducible sampling (results can still vary across hardware and batch composition).

## Choosing settings by use case

| Use case | Typical setting |
|---|---|
| Code, extraction, classification, JSON | Temperature 0–0.2 (greedy-like) plus constrained decoding |
| Factual Q&A, assistants | T ≈ 0.3–0.7, top-p 0.9 |
| Creative writing, brainstorming | T ≈ 0.8–1.0, top-p 0.95 or min-p |
| Several diverse candidates (self-consistency, best-of-N) | T ≈ 0.7–1.0, n samples |
| Translation, speech recognition | Beam search (B 4–5) with length normalisation |

Reasoning models often recommend specific temperatures (low temperature can cause loops in long reasoning).

## Interview angles

- "Implement top-p." Sort, cumulative sum, keep the smallest prefix reaching p, renormalise, sample; handle temperature 0.
- "Why does greedy repeat?" Self-reinforcing high-probability loops; sampling or penalties break them.
- "Why does beam search prefer short outputs?" Summed log-probabilities decrease with length; normalise by length.

--- revise
### Deterministic
? Greedy decoding's problems? :: Myopic; repetition loops in open-ended text.
? Beam search? :: Keep the B best partial sequences by total log-probability.
? Beam search's length bias fix? :: Divide log-probability by length^α.
? Where is beam search still good? :: Single-right-answer tasks: translation, speech recognition.

### Sampling
? Temperature effects? :: T → 0 greedy; T = 1 model distribution; T > 1 flatter, more random.
? Why truncate the tail? :: Many unlikely tokens add up; sampling them derails text.
? Top-k's weakness? :: Fixed size ignores how confident the model is.
? Top-p? :: Smallest set with cumulative probability ≥ p: adapts to confidence.
? Min-p? :: Keep tokens ≥ min_p × top probability.
? Typical order of operations? :: Temperature → truncation → renormalise → sample.

### Practice
? Settings for code/JSON? :: Temperature ~0 plus constrained decoding.
? Settings for creative text? :: T 0.8–1.0 with top-p/min-p.
? Repetition penalty risk? :: Hurts when repetition is correct (code, names).

--- notes
## Deterministic
Greedy argmax: fast, myopic, loops. Beam B: top-B sequences by Σ log p; length norm ÷ len^α; bland for open text; B× cost.
## Sampling
softmax(z/T): T→0 greedy, 1 model, >1 random. Long tail risk.
Top-k (fixed). Top-p nucleus (cumulative ≥ p, adaptive). Min-p (≥ min_p · p_max).
Order: T → truncate → renormalise → sample.
## Control
Repetition/frequency/presence penalties; no-repeat n-grams; stop tokens/strings; max tokens; seeds.
## Use cases
Code/JSON T≈0 + constraints · assistants T 0.3–0.7, p 0.9 · creative T 0.8–1, p 0.95/min-p · best-of-N/self-consistency T 0.7–1 · MT/ASR beam 4–5.

--- doubts
Q: Is temperature 0 fully deterministic?
A: In principle (always argmax), but in practice outputs can vary slightly across runs because of floating-point non-determinism in batched GPU kernels and ties between near-equal logits. For strict reproducibility you need deterministic kernels and fixed batch composition.

Q: Should I use top-k and top-p together?
A: You can: top-k as a hard cap (e.g. 40–100) and top-p for adaptivity. Many APIs expose both; the defaults are usually fine. Changing temperature has the biggest effect.

Q: Why not always use beam search for quality?
A: For open-ended text, the highest-probability sequence is often dull and repetitive ("I don't know. I don't know."), because human-written text isn't the most probable text. Beam search shines when there's one correct output.

--- exercises
[estimate] Next-token probabilities are [0.5, 0.2, 0.15, 0.1, 0.05]. Which tokens survive top-p with p = 0.8? With p = 0.9? With min-p = 0.25?
A: Cumulative: 0.5, 0.7, 0.85, 0.95, 1.0. p = 0.8 keeps the first 3 (reaching 0.85). p = 0.9 keeps 4 (0.95). Min-p threshold = 0.25 × 0.5 = 0.125: keeps 0.5, 0.2, 0.15 (3 tokens).

[design] Implement beam search with length normalisation for a model exposing `next_logprobs(seq)`.
A: Beams = [([BOS], 0.0)]. Repeat up to max_len: for each unfinished beam, get log-probs, take its top B extensions; collect all candidates (seq + token, score + logp); keep the B best by score/len(seq)^α (α ≈ 0.6–1.0); move beams ending in EOS to a finished list. Stop when B finished beams exist or max_len; return the finished beam with the best normalised score.

[choose] A product generates SQL queries from natural language. What decoding would you use and why?
A: Temperature 0 (or near) for determinism, constrained decoding to valid SQL grammar or at least a parser check, and optionally generate a few candidates at moderate temperature to execute and verify against the schema (best-of-N with execution feedback) when accuracy matters more than latency.

--- pitfalls
- High temperature for code or structured output
- Beam search without length normalisation
- Repetition penalties that break code or names
- Applying top-p before temperature without meaning to
- Assuming temperature 0 guarantees identical outputs across runs

--- quiz
Q: Temperature 2.0 makes the next-token distribution?
- Sharper
- *Flatter (more random)
- Unchanged
- Greedy
W: Dividing logits by T > 1 shrinks differences.

Q: Top-p sampling keeps?
- Exactly p tokens
- The top 10%
- *The smallest set of tokens whose cumulative probability reaches p
- Tokens with probability above p
W: The nucleus adapts to the model's confidence.

Q: Why does beam search favour short sequences?
- It's random
- *Each extra token adds a negative log-probability, lowering the total score
- It uses top-k
- Long sequences are masked
W: Length normalisation counters this.

Q: Best decoding for extracting fields into JSON?
- Temperature 1.2
- *Temperature ~0 with constrained decoding
- Top-k = 1000
- Beam search with B = 50
W: Deterministic and guaranteed-valid output.

--- sources
- paper :: The Curious Case of Neural Text Degeneration (nucleus sampling) :: Holtzman et al. (2019) :: https://arxiv.org/abs/1904.09751
- paper :: Turning Up the Heat: Min-p Sampling for Creative and Coherent LLM Outputs :: Nguyen et al. (2024) :: https://arxiv.org/abs/2407.01082
- article :: How to generate text: using different decoding methods :: Hugging Face blog :: https://huggingface.co/blog/how-to-generate
- paper :: Google's Neural Machine Translation System (length normalisation) :: Wu et al., Google (2016) :: https://arxiv.org/abs/1609.08144

=== structured-output
blurb: Getting machine-readable output reliably: JSON mode and schemas, constrained decoding with grammars and finite-state machines, function-calling formats, validation and retry loops, and the quality trade-offs of forcing structure.
signals: "Guarantee the model returns valid JSON" | "How does function calling work under the hood?" | Extraction pipelines and tool-using agents | "The model's JSON sometimes breaks our parser"
widgets: constrained-decoding
prereq: sampling-strategies

--- lesson
:::words
- **Structured output**: text that must follow a format a program can parse, like JSON matching a schema.
- **JSON Schema**: a specification of allowed fields, types and values.
- **Constrained decoding**: at each step, forbidding tokens that would make the output invalid.
- **Grammar**: rules describing all valid outputs (e.g. JSON, SQL).
- **Finite-state machine (FSM)**: a set of states and allowed transitions; used to track where in the format generation is.
- **Function calling** (tool calling): the model outputs a structured request naming a function and its arguments.
:::

## The problem in plain words

Products need LLM output that code can use: a JSON object of extracted fields, a function call with typed arguments, a label from a fixed list. Prompting "respond in JSON" works most of the time, and "most of the time" breaks production pipelines: missing braces, extra prose, wrong field names, invalid enum values. **Constrained decoding** makes invalid output impossible by masking tokens during generation; schemas and validation loops handle the rest.

:::eli5
Filling in a paper form with boxes: you can't write your name in the date box because there's no room for letters. Constrained decoding gives the model a form: at each moment, only characters that fit the current box are allowed.
:::

## Levels of reliability

1. **Prompting** with format instructions and examples: often 90–99% valid; fails on long or nested outputs.
2. **JSON mode**: the provider guarantees syntactically valid JSON, but not your schema.
3. **Schema-constrained output** (structured outputs): generation is constrained to a given JSON Schema: valid syntax, required fields, types and enums guaranteed.
4. **Validation + retry/repair**: parse and validate (e.g. Pydantic); on failure, re-ask with the error message, or repair; always needed for semantic checks the schema can't express.

## How constrained decoding works

At each step, compute the set of tokens that keep the output a valid prefix of *some* string in the language, and mask the rest to $-\infty$ before sampling:

1. Compile the schema or grammar into an automaton: a **finite-state machine** for regular formats (regexes, fixed JSON structures, enums), or a **pushdown automaton / context-free grammar parser** for nested structures (general JSON, SQL).
2. Precompute, for each automaton state, which vocabulary tokens are allowed (tokens are multi-character, so a token is allowed if all its characters keep the state valid). Libraries: Outlines (FSM index over the vocabulary), llama.cpp GBNF grammars, XGrammar, vLLM/SGLang guided decoding.
3. At generation time, look up the current state's allowed-token mask (fast), apply it, sample, advance the state.
4. Fixed parts (field names, braces) can be emitted without calling the model at all ("jump-forward"), saving time.

Watch a JSON object being generated with the mask applied at each step:

[[widget:constrained-decoding]]

## Function calling

Tool definitions (name, description, JSON Schema for parameters) are placed in the prompt (or a dedicated section of the chat template). The model is fine-tuned to output a special structured block, e.g. `{"name": "get_weather", "arguments": {"city": "Paris"}}`, when a tool would help. The application parses it, runs the function, and returns the result in a tool message; the model continues (agents chapter). Providers often constrain the arguments to the schema. Parallel calls (several tools at once) and forced tool choice are common options.

## Quality trade-offs

- Constraining can **hurt reasoning**: forcing an immediate JSON answer leaves no room to think. Fix: let the model reason first (a "reasoning" field before the answer field, or a free-text thinking phase, then a constrained final step).
- Field order matters: put fields the model should decide first early, and derived fields later.
- Grammar masks can push the model into low-probability tokens if the format is unnatural for it; use formats it saw in training (JSON) and clear field descriptions.
- Schema guarantees types, not truth: validate values (ranges, cross-field rules) and evaluate extraction accuracy separately.

## Interview angles

- "Guarantee valid JSON." Schema-constrained decoding (FSM/grammar masks over tokens) plus validation and a retry loop for semantic errors; let the model reason before the constrained part.
- "How does function calling work?" Tool schemas in the prompt, a model fine-tuned to emit structured calls, application executes and returns results, loop.
- "Constrained decoding cost?" Precomputed per-state token masks make it cheap; complex grammars cost more per step.

--- revise
### Reliability
? Four levels of structure reliability? :: Prompting; JSON mode; schema-constrained decoding; validation + retry.
? Does JSON mode guarantee your schema? :: No, only syntactically valid JSON.
? What can't a schema guarantee? :: Correct values or cross-field logic: validate semantically.

### Mechanism
? Constrained decoding? :: Mask tokens that can't continue a valid output before sampling.
? FSM vs grammar parser? :: Regular formats (regex, fixed JSON) vs nested context-free formats (general JSON, SQL).
? Why precompute masks per state? :: Fast lookup of allowed tokens each step.
? Jump-forward decoding? :: Emit forced characters (braces, field names) without calling the model.

### Function calling and trade-offs
? Function-calling loop? :: Schemas in prompt → model emits call → app executes → returns result → model continues.
? How can constraints hurt quality? :: No room to reason; unnatural formats push low-probability tokens.
? Fix for reasoning loss? :: Reasoning field or free-text thinking first, then constrained answer.

--- notes
## Levels
Prompt (90–99%) → JSON mode (syntax) → schema-constrained (types, required, enums) → validate + retry/repair (semantics).
## Constrained decoding
Schema/grammar → FSM (regular) or pushdown/CFG (nested). Per-state allowed-token masks over the vocabulary (multi-char tokens).
Libraries: Outlines, llama.cpp GBNF, XGrammar, vLLM/SGLang guided decoding. Jump-forward for fixed text.
## Function calling
Tool name + description + JSON Schema in prompt; fine-tuned structured call; app executes; tool message; continue. Parallel/forced calls.
## Trade-offs
Constraints can block reasoning → think first / reasoning field. Field order. Natural formats. Schema ≠ truth: validate + measure accuracy.

--- doubts
Q: If the provider supports structured outputs, do I still need validation?
A: Yes. The schema guarantees shape and types, not correctness: dates can be wrong, amounts can be hallucinated, related fields can contradict each other. Validate business rules and measure field-level accuracy on a labelled set.

Q: Why would constraining output make answers worse?
A: The model's best answer might need a few words of reasoning first, or a format slightly different from the schema. Forcing the first token to be "{" removes that freedom. Giving the schema a reasoning field (or a two-phase generation) restores most of the quality.

Q: How does a token-level mask handle multi-character tokens like `"name":`?
A: The automaton walks each token's characters from the current state; a token is allowed only if every character is a valid transition and ends in a valid state. Libraries precompute this for every state and token once, so runtime is a mask lookup.

--- exercises
[design] An invoice-extraction pipeline needs vendor, date, total and line items as JSON. Design the generation and validation.
A: Define a Pydantic/JSON Schema (vendor: string, date: ISO date string with regex, currency: enum, total: number ≥ 0, line_items: array of {description, quantity, unit_price}). Use schema-constrained decoding, with an optional "notes" field first for reasoning about unclear documents. Validate: parse dates, check sum of line items ≈ total (tolerance), currency matches symbols in text. On failure, retry once with the error message; if it still fails, route to human review. Measure field-level accuracy on 500 labelled invoices.

[break] After switching to strict schema-constrained output, a classification task's accuracy dropped from 91% to 84%. Why might that be, and what would you try?
A: The constraint forced an immediate label without the brief reasoning the model used before, or the enum names are unnatural compared with how the model phrased labels. Add a short reasoning field before the label, use clearer label names with descriptions in the schema, or classify in free text and then map to the enum with a constrained second step.

[estimate] Constrained decoding with a precomputed mask: the vocabulary is 128k tokens and the FSM has 500 states. How much memory for boolean masks, and what's the per-step cost?
A: $500 \times 128{,}000$ bits ≈ 8 MB (as packed bits): small. Per step: look up one mask and apply it to the logits (a vectorised operation over 128k entries): negligible next to the model's forward pass.

--- pitfalls
- Relying on prompt instructions alone for production JSON
- Assuming schema-valid output is correct
- Forcing structure with no room for reasoning
- Unclear field names and descriptions in schemas
- No retry or fallback path for invalid outputs

--- quiz
Q: What does JSON mode guarantee?
- The schema's fields
- *Syntactically valid JSON
- Correct values
- Short outputs
W: Schema adherence needs schema-constrained decoding.

Q: How does constrained decoding prevent invalid output?
- Retrying until valid
- *Masking tokens that can't continue a valid output before sampling
- Lowering temperature
- Post-processing with regex
W: Invalid tokens get zero probability.

Q: In function calling, who executes the function?
- The model
- *The application, which then returns the result to the model
- The tokenizer
- The GPU
W: The model only outputs a structured request.

Q: A good way to keep reasoning quality with structured output?
- Remove the schema
- *Add a reasoning field (or a thinking phase) before the answer fields
- Use temperature 2
- Shorten the prompt
W: The model can think before committing to the constrained answer.

--- sources
- paper :: Efficient Guided Generation for Large Language Models (Outlines) :: Willard, Louf (2023) :: https://arxiv.org/abs/2307.09702
- paper :: XGrammar: Flexible and Efficient Structured Generation Engine :: Dong et al. (2024) :: https://arxiv.org/abs/2411.15100
- article :: Structured output :: Google AI for Developers (Gemini API) :: https://ai.google.dev/gemini-api/docs/structured-output
- article :: Function calling :: Google AI for Developers (Gemini API) :: https://ai.google.dev/gemini-api/docs/function-calling

=== speculative-decoding
blurb: Making generation faster without changing its output: why decoding is memory-bound, draft-and-verify speculative decoding with the acceptance rule that preserves the target distribution, expected speed-ups, and variants (Medusa heads, EAGLE, lookahead, prompt lookup).
signals: "How do you speed up LLM inference without losing quality?" | "Explain speculative decoding" | "Why can a small model speed up a big one?" | Latency-critical LLM serving
widgets: speculative
prereq: sampling-strategies, pytorch-performance

--- lesson
:::words
- **Target model**: the large model whose outputs we want.
- **Draft model**: a small, fast model that guesses the next few tokens.
- **Speculate**: propose several future tokens before the target model has checked them.
- **Verify**: run the target model once over all proposed tokens in parallel to check them.
- **Acceptance rate**: the fraction of drafted tokens the target accepts.
- **Memory-bound**: limited by reading weights from memory rather than by arithmetic (pytorch-performance page).
:::

## The problem in plain words

Generating each token of a big model requires reading all its weights from GPU memory, which takes the same time whether you compute one token or several: the chip is mostly waiting on memory. **Speculative decoding** exploits that: a small model quickly guesses the next few tokens, then the big model checks all the guesses in **one** forward pass. Correct guesses are kept for free; at the first wrong one, the big model's own choice is used. The result is 2–3× faster generation with **exactly** the same output distribution as the big model alone.

:::eli5
A junior writer drafts the next sentence quickly; the senior editor reads the whole draft at once and keeps everything up to the first word they'd have written differently, then writes that word themselves. Since reading a sentence takes the editor about as long as writing one word, every accepted word is a free speed-up.
:::

## The algorithm

Given target $p$ and draft $q$:

1. The draft generates $\gamma$ tokens autoregressively (cheap): $x_1, \dots, x_\gamma$ with probabilities $q(x_i)$.
2. The target runs **once** on the prefix plus all $\gamma$ drafted tokens, producing its probabilities $p(\cdot)$ at each of the $\gamma + 1$ positions (one parallel forward pass, like processing a prompt).
3. For $i = 1 \dots \gamma$: accept $x_i$ with probability $\min\left(1, \frac{p(x_i)}{q(x_i)}\right)$.
4. At the first rejection, sample a replacement from the **residual distribution** $\text{norm}(\max(0, p - q))$ and stop. If all are accepted, sample one bonus token from $p$ at position $\gamma + 1$.

This rule guarantees the accepted tokens are distributed **exactly** as if sampled from $p$ (Leviathan et al.; Chen et al.). With greedy decoding it simplifies to: accept drafted tokens while they equal the target's argmax.

Step through a speculation round below and see how the acceptance rate drives the speed-up:

[[widget:speculative]]

## Expected speed-up

If each drafted token is accepted with probability $\alpha$ (independently), the expected number of tokens produced per target pass is

$$\frac{1 - \alpha^{\gamma + 1}}{1 - \alpha}$$

With $\alpha = 0.8$ and $\gamma = 4$: $(1 - 0.8^5)/0.2 \approx 3.4$ tokens per target call. The wall-clock speed-up subtracts the draft's cost ($\gamma$ small forward passes) and the slightly heavier verification pass; 2–3× is typical. It helps most for **predictable text** (code, boilerplate, extraction, translation) and **low batch sizes**; at high batch sizes the target is already more compute-bound and gains shrink.

## Variants

- **Draft model choice**: same family, much smaller (e.g. 1B drafting for 70B), sharing the tokenizer; or a distilled draft for higher acceptance.
- **Medusa**: add extra decoding heads to the target itself that predict tokens 2, 3, 4 ahead; verify candidate trees with tree attention. No separate draft model.
- **EAGLE**: a lightweight draft head operating on the target's hidden features: high acceptance.
- **Lookahead decoding** and **prompt lookup decoding**: draft by matching n-grams from the prompt or from earlier output (great for edits, summarisation and RAG where output copies input).
- **Self-speculative** decoding: draft by skipping some of the target's own layers.

## Where it fits in serving

Speculative decoding attacks **latency per request**. Throughput at large batch is better served by batching (llm-serving-engines page). Production engines (vLLM, TensorRT-LLM, SGLang) support speculative methods; Google has described using speculative decoding in products such as AI Overviews in Search.

## Interview angles

- "Speed up generation without quality loss." Speculative decoding: draft γ tokens, verify in one target pass, accept with min(1, p/q), resample from the residual on rejection: same distribution.
- "Why does verification cost about the same as one step?" Decoding is memory-bound; processing γ tokens in one pass reads the weights once.
- "When doesn't it help?" Low acceptance (unpredictable text, poor draft) or large batches.

--- revise
### Idea
? Why does speculative decoding work? :: Decoding is memory-bound; the target can verify several tokens in one pass for about the cost of one.
? Steps? :: Draft γ tokens with the small model; target scores all in one pass; accept/reject; resample at first rejection.
? Acceptance rule? :: Accept with probability min(1, p(x)/q(x)).
? On rejection? :: Sample from normalised max(0, p − q).
? Is the output distribution changed? :: No: identical to sampling from the target.

### Performance
? Expected tokens per target pass? :: (1 − α^{γ+1})/(1 − α).
? α = 0.8, γ = 4? :: ≈ 3.4 tokens per target call.
? When does it help most? :: Predictable text, low batch size.
? When does it help less? :: Low acceptance or large batches (compute-bound).

### Variants
? Medusa? :: Extra heads on the target predict several future tokens; tree verification.
? EAGLE? :: Draft head using the target's hidden states.
? Prompt lookup decoding? :: Draft by copying n-grams from the prompt.

--- notes
## Why
Decode memory-bound: verifying γ tokens in parallel ≈ cost of 1 step.
## Algorithm
Draft γ tokens (q). Target one pass → p at γ+1 positions.
Accept xᵢ w.p. min(1, p/q). First reject → sample norm(max(0, p − q)), stop. All accepted → bonus token from p.
Exact target distribution. Greedy: accept while equal to target argmax.
## Speed-up
E[tokens/pass] = (1 − α^{γ+1})/(1 − α); α 0.8, γ 4 → 3.4. Minus draft cost → 2–3× typical.
Best: code, boilerplate, extraction, translation, small batches.
## Variants
Small same-tokenizer draft (distilled). Medusa heads + tree attention. EAGLE feature-level draft. Lookahead / prompt lookup (copying). Self-speculative (skip layers).
## Serving
Latency tool; batching for throughput. vLLM, TensorRT-LLM, SGLang. Used in Google products (AI Overviews).

--- doubts
Q: How can a weaker draft model not lower the quality?
A: The draft only proposes; the target decides. Rejected tokens are replaced using the target's own distribution, and the acceptance rule is designed so the final tokens are exactly as likely as if the target had sampled them itself. A bad draft only reduces speed, never quality.

Q: Does speculative decoding work with temperature sampling or only greedy?
A: Both. The general accept/resample rule handles sampling at any temperature; with greedy decoding it reduces to checking whether the draft token equals the target's top token.

Q: Why doesn't it help much at large batch sizes?
A: With many requests batched, the target already does lots of computation per weight read, so it's closer to compute-bound; verifying extra drafted tokens then costs real compute, and wasted (rejected) work matters more.

--- exercises
[estimate] A draft model's tokens are accepted 70% of the time. Compare expected tokens per target pass for γ = 2, 4 and 8.
A: γ = 2: $(1 - 0.7^3)/0.3 \approx 2.19$. γ = 4: $(1 - 0.7^5)/0.3 \approx 2.78$. γ = 8: $(1 - 0.7^9)/0.3 \approx 3.20$. Diminishing returns: longer drafts mostly add rejected work; γ ≈ 3–5 is typical.

[design] Choose a speculative decoding approach for a code-editing assistant that often rewrites large parts of a file with small changes.
A: Prompt lookup / copy-based drafting: most output tokens copy the original file, so n-gram matches from the prompt give very high acceptance with no draft model. Combine with a small draft model (or EAGLE heads) for the changed regions. Measure acceptance rate and latency per edit.

[break] After adding speculative decoding, a team sees output quality change subtly. What could be wrong?
A: The implementation isn't exact: e.g. accepting draft tokens whenever they're in the target's top-k, not using the residual distribution on rejection, mismatched tokenizers between draft and target, or applying temperature/top-p differently to draft and target probabilities. A correct implementation is distribution-preserving; verify by comparing output statistics with and without speculation.

--- pitfalls
- Draft and target with different tokenizers
- Wrong acceptance/resampling rule (changes outputs)
- Very long drafts with low acceptance
- Expecting large gains at high batch sizes
- Measuring speed-up without counting the draft's cost

--- quiz
Q: Why can the target verify γ drafted tokens for roughly the cost of one decoding step?
- The draft does the work
- *Decoding is memory-bound: one pass reads the weights once for all γ tokens
- Verification skips layers
- The tokens are cached
W: Arithmetic is cheap relative to weight reads.

Q: When a drafted token is rejected, what happens?
- Generation stops
- *A replacement is sampled from the residual distribution max(0, p − q), normalised
- The draft token is kept anyway
- The draft model retries
W: This keeps the output distribution exact.

Q: Speculative decoding changes the target model's output distribution?
- Yes, slightly
- *No, when implemented correctly
- Only at temperature 0
- Only for long outputs
W: The acceptance rule is distribution-preserving.

Q: Which draft method needs no extra model and suits rewriting tasks?
- Medusa
- *Prompt lookup decoding (copying n-grams from the prompt)
- A 7B draft model
- Beam search
W: Output that copies input is predicted by matching.

--- sources
- paper :: Fast Inference from Transformers via Speculative Decoding :: Leviathan, Kalman, Matias, Google (2022) :: https://arxiv.org/abs/2211.17192
- paper :: Accelerating Large Language Model Decoding with Speculative Sampling :: Chen et al., DeepMind (2023) :: https://arxiv.org/abs/2302.01318
- paper :: Medusa: Simple LLM Inference Acceleration Framework with Multiple Decoding Heads :: Cai et al. (2024) :: https://arxiv.org/abs/2401.10774
- article :: Looking back at speculative decoding :: Google Research blog :: https://research.google/blog/looking-back-at-speculative-decoding/
