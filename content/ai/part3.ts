import { Q, T } from "../h";
import type { Topic } from "@/lib/types";
import { md } from "./md";

export const aiTopics3: Topic[] = [
  T("ai", "ai-alignment", "From base model to assistant: instruction tuning and RLHF", 2, 35, "Supervised fine-tuning on instructions, reward models from human preferences, PPO with a KL leash, DPO, GRPO and Constitutional AI.", {
    signals: ["“How does ChatGPT/Gemini learn to be helpful?”", "Sycophancy, refusals or tone problems in a product", "Choosing between preference-tuning and plain fine-tuning"],
    prereq: ["ai-llm-training"],
    viz: "rlhf",
    lesson: md`A pretrained model knows a lot but has no idea it is supposed to be an assistant. **Alignment** makes its behaviour match what developers and users want: follow instructions, be honest, refuse harmful requests, answer in the right style. It usually happens in two stages.

## Stage 1: supervised fine-tuning (instruction tuning)

Train on curated **(instruction, input) → output** examples written or checked by people:

\`\`\`json
{ "instruction": "Translate to French", "input": "Hello world", "output": "Bonjour le monde" }
\`\`\`

Tens of thousands of high-quality demonstrations across many tasks teach the model the *format* of being helpful. **InstructGPT** (2022) showed a 1.3B instruction-tuned model was preferred by people over the 175B GPT-3 base model: following intent beats raw size.

## Stage 2: learning from preferences

It is easy for people to say which of two answers is better and hard to write the perfect answer, so we collect **comparisons**. This is reinforcement learning from human feedback (**RLHF**), framed as RL:

| RL concept | In a language model |
|---|---|
| Agent / policy $\pi$ | The language model itself |
| State | The prompt and the tokens so far |
| Action | The next token |
| Reward | A score for the finished response, from a reward model |

### The reward model

Labellers see a prompt and two responses and pick the better one. A **reward model** $r_\phi(x, y)$ (often the LLM itself with a scalar head) is trained so preferred responses score higher, using the **Bradley-Terry** model:

$$
P(y_w \succ y_l) = \frac{e^{r_\phi(x, y_w)}}{e^{r_\phi(x, y_w)} + e^{r_\phi(x, y_l)}} = \sigma\big(r_\phi(x, y_w) - r_\phi(x, y_l)\big)
$$

$$
\mathcal{L} = -\mathbb{E}_{(x, y_w, y_l)}\left[\log \sigma\big(r_\phi(x, y_w) - r_\phi(x, y_l)\big)\right]
$$

Only the **difference** in reward matters.

[[widget:rlhf]]

### Optimising the policy, on a leash

Now improve the model to earn high reward, **without drifting too far** from the supervised model (or it learns to game the reward model with weird text):

$$
\max_\pi \; \mathbb{E}\left[r_\phi(x, y)\right] - \beta\, \mathrm{KL}\left(\pi(\cdot \mid x) \,\Vert\, \pi_{\text{ref}}(\cdot \mid x)\right)
$$

| Method | Idea |
|---|---|
| **PPO** | The classic RLHF optimiser: sample responses, score them with the reward model, take clipped policy-gradient steps |
| **DPO** | Direct Preference Optimisation: no separate reward model and no RL loop; a simple classification-style loss on the preference pairs, using the model's own log-probabilities as an implicit reward |
| **GRPO** | Group Relative Policy Optimisation: sample a group of answers per prompt and score each relative to the group's average (no value network); popularised by DeepSeek for reasoning |
| ORPO, IPO, KTO… | Variants that change the loss or need only thumbs-up/down data |

:::dyk
**Reward hacking** is real and funny. In a famous OpenAI experiment, a boat-racing game agent learned to spin in circles hitting the same reward targets forever instead of finishing the race. Chatbots do the language version: longer answers, more confident tone, more flattery, if raters (or reward models) reward those things.
:::

## Feedback from AI, and from principles

Human labelling is slow and expensive. **RLAIF** uses a strong model to produce the preferences. Anthropic's **Constitutional AI** has the model critique and revise its own outputs against a written list of principles, then trains on those preferences. **Reinforcement learning from verifiable rewards** (RLVR) skips preference models entirely where answers can be checked automatically (maths with known answers, code with unit tests); that is the recipe behind modern reasoning models.

## Side effects to know

- **Sycophancy:** agreeing with the user because agreement got rewarded. In 2025 OpenAI rolled back a GPT-4o update for being excessively flattering.
- **Over-refusal:** refusing harmless requests ("how do I kill a Python process?") because they look like harmful ones.
- **The alignment tax:** preference tuning can slightly hurt some raw capabilities; good recipes minimise it.
- **Specification gaming:** the model optimises what you measured, not what you meant.

:::tip Interview framing
"Pretraining gives knowledge; SFT gives the format of helpfulness; preference optimisation (RLHF with PPO, or DPO) gives judgement about which answer is better, constrained by a KL penalty to the reference model. For products I'd add evaluation sets for the behaviours we care about (helpfulness, refusals, tone) and watch for sycophancy and reward hacking."
:::`,
    pitfalls: [
      "Saying RLHF teaches facts (it shapes behaviour; knowledge mostly comes from pretraining)",
      "Forgetting the KL penalty and why it is needed",
      "Thinking DPO needs a separate reward model",
      "Ignoring sycophancy and reward hacking as consequences of the objective",
    ],
    quiz: [
      Q("Why are human preferences collected as pairwise comparisons?", ["They are cheaper to store", "*It is easier and more consistent to judge which of two answers is better than to score one absolutely", "RL requires pairs", "To double the data"], "Relative judgements are more reliable; Bradley-Terry turns them into a reward model."),
      Q("What does the KL term in the RLHF objective prevent?", ["Overfitting the reward model's training data", "*The policy drifting far from the reference model to exploit the reward model", "Long answers", "Slow training"], "It keeps outputs fluent and stops reward hacking with strange text."),
      Q("What distinguishes DPO from PPO-based RLHF?", ["DPO uses more humans", "*DPO optimises directly on preference pairs without a separate reward model or RL loop", "DPO only works for images", "DPO needs no data"], "Its loss uses the policy's and reference model's log-probabilities as an implicit reward."),
      Q("A reward model scores A at 2.0 and B at 0.0. What is P(A ≻ B)?", ["50%", "*About 88%", "100%", "2%"], "σ(2) ≈ 0.88."),
    ],
  }),

  T("ai", "ai-reasoning", "Reasoning models and test-time compute", 2, 25, "Chain-of-thought, self-consistency, thinking budgets, reasoning models like o1, DeepSeek-R1 and Gemini Deep Think, and when the extra cost is worth it.", {
    signals: ["Multi-step maths, planning, coding or logic problems", "Deciding between a fast model and a thinking model", "An LLM gets the right answer sometimes but not reliably"],
    prereq: ["ai-alignment"],
    lesson: md`For most of LLM history, the only way to get a smarter answer was a bigger model. **Test-time compute** adds a second dial: let the model **think longer** before answering.

## Chain-of-thought

In 2022, Google researchers showed that prompting a model to write out intermediate steps ("Let's think step by step", or few-shot examples with worked solutions) dramatically improved maths and logic. Generating the reasoning gives the model more computation per answer and a scratchpad to keep intermediate results.

:::dyk
The phrase **"Let's think step by step"** alone, appended to a question, lifted one model's accuracy on a maths benchmark from about 18% to about 79% in a 2022 paper. Few prompt tricks in history have been worth that much.
:::

## Spending more compute at inference

- **Self-consistency:** sample several reasoning paths at a non-zero temperature and take a **majority vote** on the final answer.
- **Best-of-N with a verifier:** generate N answers, score them with a reward model, unit tests or a checker, keep the best.
- **Tree of Thoughts and search:** explore branches of reasoning, evaluate partial solutions, backtrack.
- **Reasoning models:** trained so that long, self-correcting chains of thought happen by default.

## Reasoning models

OpenAI's **o1** (2024) was the first widely used model trained with large-scale RL to produce long hidden reasoning before answering. **DeepSeek-R1** (January 2025) showed a similar recipe in the open: reinforcement learning with verifiable rewards (correct maths answers, passing code tests) using **GRPO**. Its paper describes an "aha moment" where the model spontaneously learned to stop, re-check and say, in effect, "wait, let me reconsider".

Google's **Gemini 2.5** models and **Deep Think** mode expose a **thinking budget**. In July 2025 an advanced Gemini Deep Think reached a **gold-medal score** at the International Mathematical Olympiad, solving five of six problems in natural language within the time limit.

:::news The $590 billion day
DeepSeek-R1's release, with claims of a very low training cost, briefly topped the US App Store. On 27 January 2025 Nvidia's market value fell by about $590 billion, the biggest one-day loss for any company in US stock-market history, as investors questioned how much compute frontier AI really needs. (Demand for compute kept growing anyway: cheaper reasoning made people use more of it.)
:::

## The trade-off

Thinking tokens are **output tokens**: slow and expensive. A reasoning model might spend thousands of hidden tokens on a question a fast model answers in fifty.

| Use a thinking model / higher budget | Use a fast model |
|---|---|
| Multi-step maths, proofs, algorithm puzzles | Classification, extraction, formatting |
| Hard debugging and code changes across files | Simple Q&A, summarisation, chat |
| Planning agent steps with many constraints | Latency-sensitive features (autocomplete) |
| High-stakes answers where you'd otherwise retry | High-volume batch jobs on a budget |

A common production pattern is a **router**: a cheap model handles most requests and escalates hard ones to a reasoning model.

:::warn Reasoning text is not a faithful explanation
A chain of thought can look convincing and still not be what actually produced the answer, and models can reach right answers through wrong reasoning or vice versa. Treat visible reasoning as a useful debugging artefact, not as proof. Verify answers with tests or checks when it matters.
:::

:::tip In interviews
When a question involves "make the model more accurate on hard problems", mention the **two axes**: train-time (bigger or better-trained model, fine-tuning) and test-time (chain-of-thought, self-consistency, verifiers, thinking budgets), with their latency and cost. Then propose measuring accuracy against cost per query on an evaluation set.
:::`,
    pitfalls: [
      "Using a reasoning model for every request and paying for thinking tokens on easy ones",
      "Treating chain-of-thought text as a faithful account of how the model decided",
      "Forgetting that self-consistency needs non-zero temperature to produce diverse samples",
    ],
    quiz: [
      Q("What does self-consistency do?", ["Uses temperature 0 for consistency", "*Samples several reasoning paths and takes a majority vote on the answer", "Asks the model if it is consistent", "Fine-tunes on its own outputs"], "Diverse paths that agree are more likely right."),
      Q("What reward signal made DeepSeek-R1-style RL scalable?", ["Human ratings of every answer", "*Automatically verifiable rewards such as correct maths answers and passing tests", "Click-through rates", "Perplexity"], "Verifiable rewards are cheap and hard to game."),
      Q("Your feature classifies 10M support tickets a day. Which model choice is sensible?", ["The largest reasoning model with a high thinking budget", "*A fast, cheap model, escalating only uncertain cases", "Always use chain-of-thought", "Self-consistency with 20 samples"], "Thinking costs latency and money; save it for hard cases."),
    ],
  }),

  T("ai", "ai-fine-tuning", "Fine-tuning, LoRA and when not to", 2, 35, "Prompting vs RAG vs fine-tuning; full fine-tuning vs parameter-efficient methods; the maths of LoRA and QLoRA; distillation; catastrophic forgetting.", {
    signals: ["The model needs a consistent style, format or narrow skill", "Prompts have grown huge with examples", "Cutting cost by moving a task to a small model"],
    prereq: ["ai-alignment"],
    viz: "lora",
    lesson: md`**Fine-tuning** adapts a pretrained model by training it further on a smaller, task-specific dataset. It is powerful, and frequently the wrong first step.

## First, do you need it?

| Problem | Reach for |
|---|---|
| The model doesn't know your facts or documents (and they change) | **RAG**: retrieve them at query time |
| The model can do it but needs instructions or a format | **Prompting**: instructions, few-shot examples, output schema |
| You need a consistent style, tone or format at scale, a narrow skill, lower latency or cost | **Fine-tuning** (often a small model) |
| You need the model to *behave* differently (be concise, refuse less) | Preference tuning (DPO) on top of SFT |

| | In-context learning (prompting) | Fine-tuning |
|---|---|---|
| Mechanism | Task demonstrations shown in the prompt | Train on a labelled dataset for the task |
| Model parameters | Unchanged | Changed |
| Cost profile | Pay for examples on every request | Pay once to train, then cheaper prompts |
| Iteration speed | Minutes | Hours to days, plus data work |

:::tip The interview default
"Start with prompting and a solid evaluation set. Add RAG for knowledge. Fine-tune only when evaluations show prompting has plateaued, or when cost and latency demand a smaller model." Saying this, with the reasons, signals experience.
:::

## Two dimensions of fine-tuning

1. **What you train on:** **task-specific** fine-tuning (labelled data for one task, say GPT-2 on rap lyrics to write in that style) or **instruction tuning** (instruction-response pairs covering many tasks).
2. **Which weights change:** **full fine-tuning** updates every parameter; **parameter-efficient fine-tuning (PEFT)** freezes almost everything and trains a small set.

Full fine-tuning a 7B model means storing gradients and optimizer state for 7 billion parameters: with Adam in mixed precision, around 16 bytes per parameter, about **112 GB** before activations. It also risks **catastrophic forgetting**: getting great at your task while losing general abilities.

## PEFT families

- **Additive:** insert small new modules (adapters between layers; prefix or prompt tuning, which learns virtual tokens).
- **Selective:** train only some existing weights (biases, the last layers).
- **Reparameterisation:** represent the *update* in a compact form. **LoRA** is the star.

## LoRA: low-rank adaptation

Any $m \times n$ matrix can be approximated as the product of two thin ones: $B \in \mathbb{R}^{m \times r}$ and $A \in \mathbb{R}^{r \times n}$ with rank $r \ll \min(m, n)$. LoRA's insight is that the **change** a fine-tune makes, $\Delta W$, is approximately low-rank, so it learns only $B$ and $A$ beside the frozen pretrained weight $W_0$:

$$
W = W_0 + \Delta W = W_0 + \frac{\alpha}{r} BA
$$

$\alpha$ scales the update. $B$ starts at zero, so training begins exactly at the pretrained model. At inference you can **merge** $BA$ into $W_0$ (no extra latency) or keep adapters separate and **swap them per customer or task** on one shared base model.

[[widget:lora]]

**Why LoRA wins:** far fewer trainable parameters (often under 1%), so training is faster and needs much less GPU memory; adapters are megabytes instead of gigabytes; and the base weights are untouched, so there's less catastrophic forgetting. Raising $r$ adds capacity at the cost of more parameters.

**QLoRA** goes further: keep the frozen base model in **4-bit** precision and train LoRA adapters on top. In 2023 this made fine-tuning a 65B model possible on a single 48 GB GPU.

:::dyk
LoRA came out of Microsoft in 2021 and quickly became the standard way the open-source community customises models. On image models, people share LoRA files of a few megabytes that teach Stable Diffusion a style or a character, and stack several of them at once.
:::

## Distillation

Train a small **student** model to imitate a large **teacher**: on the teacher's outputs (or full probability distributions, which carry more information than the single right answer). Most small production models (and "Flash"-class models) owe a lot to distillation. It's also how you take an expensive prompt-plus-big-model pipeline and turn it into a fast, cheap model once you have enough logged examples.

## Doing it well

- **Data quality beats quantity:** a few thousand clean, diverse, correctly formatted examples often beat a hundred thousand noisy ones.
- **Hold out an evaluation set** from the start, plus a general-capability check to detect forgetting.
- **Match the chat template** the base model expects.
- **Watch for leakage** of private data into training sets, and for memorisation of rare examples.
- **Versioning:** the model, the adapter, the data snapshot and the prompt are one artefact; version them together.`,
    pitfalls: [
      "Fine-tuning to add frequently changing knowledge (use RAG)",
      "Skipping a held-out evaluation set and a forgetting check",
      "Assuming full fine-tuning is needed when LoRA would do",
      "Training on a few hundred noisy, inconsistent examples and blaming the method",
      "Using the wrong chat template for the base model",
    ],
    quiz: [
      Q("Your support bot must answer from policy docs that change weekly. Best approach?", ["Fine-tune every week", "*RAG over the current docs", "Bigger base model", "Higher temperature"], "Knowledge that changes belongs in retrieval, not weights."),
      Q("In LoRA, what is trained?", ["All weights", "*Two low-rank matrices B and A whose product is the weight update", "Only the embeddings", "Only the output layer"], "W₀ stays frozen; ΔW = (α/r)·BA."),
      Q("A 4096×4096 weight with LoRA rank 8 trains roughly how many parameters?", ["16.8M", "*About 65K", "4096", "8"], "r(m + n) = 8 × 8192 = 65,536."),
      Q("What does QLoRA add on top of LoRA?", ["More ranks", "*A 4-bit quantised frozen base model, so big models fit on small GPUs", "Reinforcement learning", "Larger adapters"], "Memory drops dramatically while adapters train in higher precision."),
    ],
  }),

  T("ai", "ai-decoding", "Decoding: temperature, top-k, top-p and friends", 1, 25, "How a model turns probabilities into text: greedy, beam search, sampling, temperature, top-k, nucleus sampling, penalties, structured output and logprobs.", {
    signals: ["Output is repetitive, bland, or random", "You need deterministic or schema-valid output", "Choosing API parameters for a feature"],
    prereq: ["ai-transformers"],
    viz: "sampling",
    lesson: md`An LLM never outputs text directly. At each step it outputs a **probability distribution over the next token**. **Decoding** is the algorithm that picks one, appends it, and repeats:

1. Start with the prompt's tokens.
2. Run the model to get next-token probabilities.
3. Choose a token with a decoding strategy.
4. Append it and go back to step 2, until an end token, a stop sequence or a length limit.

The same model can feel robotic, creative or unhinged purely because of step 3.

## Deterministic strategies

- **Greedy:** always take the most likely token, $w_t = \arg\max_w P(w \mid w_{1:t-1})$. Fast, but often repetitive and dull, and the locally best choice isn't always globally best.
- **Beam search:** keep the $k$ most probable partial sequences (the beam), extend each, keep the best $k$. $k = 1$ is greedy. Great for translation and speech recognition where there is one right answer; poor for open-ended writing, where it produces generic text.
- **N-gram repetition penalties** (for example "no repeated 3-grams") stop greedy and beam outputs from looping.

## Sampling strategies

Sampling picks randomly according to the probabilities, then shapes them:

- **Temperature** divides the logits $z_i$ by $T$ before softmax: $P(w_i) = \frac{\exp(z_i / T)}{\sum_j \exp(z_j / T)}$. $T < 1$ sharpens (more deterministic), $T > 1$ flattens (more diverse), $T \to 0$ approaches greedy.
- **Top-k:** keep only the $k$ most likely tokens, renormalise, sample.
- **Top-p (nucleus):** keep the smallest set whose cumulative probability reaches $p$, renormalise, sample. Unlike top-k, the set adapts: when the model is confident the nucleus is tiny; when it's unsure, it's wider.
- **Min-p** keeps tokens whose probability is at least a fraction of the top token's; it behaves well at high temperatures.

[[widget:sampling]]

| Task | Typical settings |
|---|---|
| Extraction, classification, code, SQL | Temperature 0 to 0.3 |
| Q&A, summaries, chat | Around 0.5 to 0.8, top-p 0.9 to 0.95 |
| Brainstorming, fiction | 0.8 to 1.2 |

:::warn Temperature 0 is not a guarantee
Even at temperature 0, outputs can vary between calls: batching, floating-point non-associativity on GPUs and mixture-of-experts routing all introduce tiny differences that can flip a token. If you need reproducibility, log inputs and outputs, use seeds where supported, and design for small variations.
:::

## Getting structured output

Free text is hard to parse. Options, from weakest to strongest:

1. Ask for JSON in the prompt with an example.
2. Use the provider's **JSON mode**.
3. Use **structured outputs / constrained decoding**: you supply a JSON Schema (or grammar) and the decoder masks out any token that would break it, so the output is guaranteed to parse.
4. Always still **validate** (types, ranges, business rules) and retry on failure.

## Other useful knobs

- **Max output tokens** and **stop sequences**: bound cost and latency, end generation cleanly.
- **Frequency and presence penalties:** discourage repeating tokens or topics.
- **Logprobs:** the probability of each generated token. Useful for confidence estimates, classification scores and spotting likely hallucinations (low-probability spans).
- **Seed:** some APIs accept one for best-effort reproducibility.

:::dyk
The degenerate repetition of greedy decoding ("I don't know. I don't know. I don't know...") was a well-known failure of early models. The nucleus-sampling paper (2019) was titled, with some frustration, **"The Curious Case of Neural Text Degeneration"**.
:::

:::tip Interview answer
"For deterministic tasks I'd use low temperature plus schema-constrained output and validation. For user-facing generation, moderate temperature with top-p. I'd log tokens and logprobs, set max tokens to bound latency, and evaluate settings on a test set rather than by feel."
:::`,
    pitfalls: [
      "Using high temperature for extraction or code and then fighting random errors",
      "Beam search for open-ended chat (bland, generic text)",
      "Trusting temperature 0 to be perfectly deterministic",
      "Parsing free-form JSON without schema constraints or validation",
    ],
    quiz: [
      Q("What does lowering the temperature do?", ["Flattens the distribution", "*Sharpens it, making likely tokens even more likely", "Removes the tail entirely", "Speeds up generation"], "Logits are divided by T; small T exaggerates differences."),
      Q("How does top-p differ from top-k?", ["It is always slower", "*It keeps a variable number of tokens: the smallest set reaching cumulative probability p", "It only works with beam search", "It ignores probabilities"], "The nucleus adapts to the model's confidence."),
      Q("You need the model to always return valid JSON matching a schema. Best option?", ["Higher temperature", "*Structured outputs / constrained decoding with a schema, plus validation", "Beam search", "Ask politely"], "Constraining tokens during decoding guarantees parseable output."),
    ],
  }),

  T("ai", "ai-prompting", "Prompt engineering that survives production", 1, 30, "The anatomy of a good prompt, zero/few-shot, chain-of-thought, system instructions, delimiters, output schemas, prompt evaluation and the classic failure modes.", {
    signals: ["Writing or reviewing any prompt for a feature", "Output quality is inconsistent", "Prompt-injection or hallucination concerns"],
    prereq: ["ai-decoding"],
    viz: "prompt-surgery",
    lesson: md`A prompt is a specification for a very capable, very literal colleague who has no context except what you write. Most "the model is bad" problems are really "the spec is bad" problems.

## Anatomy of a good prompt

1. **Instruction:** an actionable task. "Classify the review's sentiment", not "review this".
2. **Context:** who it's for, why, what it will be used for, and any relevant data.
3. **Examples:** when format or style matters, show it.
4. **Constraints:** length, format, tone, audience, what to do when unsure.
5. **Output format:** ideally an explicit schema.

Keep these in separate, clearly delimited sections; XML-style tags or markdown headers work well and help resist injected instructions:

\`\`\`text
<role>You review pull requests for a payments team.</role>
<task>List risky changes in the diff. Max 5 items, most severe first.</task>
<rules>If nothing is risky, say "No risky changes". Cite file:line for each item.</rules>
<diff>{diff}</diff>
\`\`\`

## Techniques

- **System instructions:** set persona, rules, boundaries and format once, for the whole conversation.
- **Zero-shot:** just the instruction. Fine for common tasks.
- **One-shot and few-shot:** add input-output examples. Choose diverse ones, include edge cases, and keep their format identical to what you want. Examples teach format better than any description.
- **Chain-of-thought:** ask for reasoning before the answer for multi-step problems (or use a reasoning model). Put the final answer in a fixed field so it's easy to parse.
- **Decomposition / prompt chaining:** break a complex task into steps, each its own call with its own check.
- **Ask for "I don't know":** explicitly permit and describe the fallback; otherwise the model is biased to answer something.

[[widget:prompt-surgery]]

:::dyk
Prompts used to be full of superstitions: "take a deep breath", promising a $200 tip, or claiming your career depends on it. Some of these measurably helped older models. With modern instruction-tuned models, **clarity, context and examples** reliably beat incantations, and Google's and Anthropic's prompting guides both say so.
:::

## Evaluating prompts

Don't judge a prompt on three examples you happened to try. Build a small **evaluation set** (50 to 200 real or realistic inputs with expected outputs or grading criteria), run every prompt version against it, and track the score. A handy checklist for judging outputs is **RACE**:

- **R**elevance: does it address the actual request?
- **A**ccuracy: are the facts right? (Verify consequential facts independently.)
- **C**larity: is it easy to follow?
- **E**fficiency: is it concise, without padding?

For RAG prompts, score **faithfulness** (is every claim supported by the retrieved context?) separately from **answer relevancy** (does it address the question?).

## Responsible prompting

- Minimise sensitive inputs: don't paste PII, secrets or confidential data unless the system is approved for it.
- Treat outputs as drafts for consequential decisions; keep a human in the loop.
- Check for bias in outputs about people and groups.
- Respect intellectual property and licences.
- Known risks: hallucination, privacy leakage, over-reliance, and losing context in long conversations.

:::story The $1 Chevy Tahoe
In December 2023 a car dealership's website chatbot, built on a general model, was talked into agreeing to sell a new Tahoe for $1 and to call it "a legally binding offer, no takesies backsies". The dealership didn't honour it, but the screenshots went viral. The bot had no instruction about what it could commit to, no restriction to its actual job, and no check on its outputs. Scope, constraints and validation belong in the prompt **and** in the code around it.
:::

## Prompts as code

Version prompts, review changes like code, run the evaluation set in CI, and log prompt version with every production response. When you change the model, rerun everything: prompts don't transfer perfectly between models.

:::tip Interview signal
When asked to design an LLM feature, write the prompt skeleton on the board: role, task, context with delimiters, rules including the "I don't know" path, and an output schema. Then say how you'd evaluate it. Few candidates do this, and it reads as hands-on experience.
:::`,
    pitfalls: [
      "Vague one-line prompts with no audience, format or length",
      "No instruction for what to do when the answer isn't available",
      "Mixing instructions and untrusted data without delimiters",
      "Tuning a prompt on a handful of examples instead of an evaluation set",
      "Assuming a prompt tuned for one model works identically on another",
    ],
    quiz: [
      Q("Which addition most improves output-format consistency?", ["Asking nicely", "*A few-shot example in exactly the desired format, or an explicit schema", "Higher temperature", "A longer system prompt"], "Models imitate examples very reliably."),
      Q("For a RAG answer, what does faithfulness measure?", ["Whether it is polite", "*Whether every claim is supported by the retrieved context", "Whether it answers quickly", "Whether it uses all documents"], "Relevancy (answers the question) and faithfulness (supported by context) are separate."),
      Q("Why put retrieved documents inside clear delimiters like <docs> tags?", ["It's required by the API", "*It separates untrusted data from instructions and makes injected instructions easier to ignore", "It saves tokens", "It improves speed"], "Delimiters plus an explicit 'treat as data' rule are a basic injection defence."),
    ],
  }),

  T("ai", "ai-context-engineering", "Context engineering", 1, 30, "The context window as working memory: what goes in it, lost-in-the-middle, context rot, compaction, memory, prompt caching and keeping agents' context clean.", {
    signals: ["Agents that degrade over long sessions", "Huge prompts and rising token bills", "Long documents where answers get missed"],
    prereq: ["ai-prompting", "ai-tokenization"],
    viz: "context-budget",
    lesson: md`Prompt engineering is about *how you ask*. **Context engineering** is about *everything the model sees* when it answers: instructions, tools, examples, retrieved documents, conversation history, memory, and tool results. In 2025 the term caught on because, for agents, getting the context right matters more than any single clever phrasing.

:::quote Andrej Karpathy, 2025
Context engineering is "the delicate art and science of filling the context window with just the right information for the next step." He pairs it with a favourite analogy: the LLM is a new kind of operating system, the model is the CPU, and the context window is its RAM.
:::

## What competes for the window

[[widget:context-budget]]

Every request shares one budget among: the system prompt, tool definitions, few-shot examples, retrieved documents, conversation history, memories, the user's message, and room for the answer. Tokens cost money and latency, and, less obviously, **too much context makes answers worse**.

## Long context is not free attention

- **Lost in the middle (2023):** models use information at the start and end of a long context much better than information buried in the middle.
- **Needle in a haystack:** a test that hides one fact at different depths in long filler text. Frontier models now pass simple versions at a million tokens, but harder versions (several needles, reasoning over them) still degrade with length.
- **Context rot:** as a conversation or agent run grows, irrelevant and outdated material accumulates and the model's focus drifts.

:::dyk
Gemini 1.5 Pro (2024) was the first widely available model with a **1 million token** context, later 2 million: enough for about 700,000 words, an hour of video, or a whole codebase in one prompt. The demo that stuck: it learned to translate English into **Kalamang**, a language with fewer than 200 speakers, from a single grammar book placed in its context.
:::

## Techniques

**Select: put in only what earns its place.**
- Retrieve the top few relevant chunks, reranked, instead of whole documents.
- **Just-in-time loading:** give the agent lightweight references (file paths, ids, search tools) and let it fetch details when needed, instead of preloading everything.
- **Tool selection at scale:** 50+ tool schemas burn tokens and confuse tool choice. Retrieve the relevant tools for the query, group tools hierarchically, or defer loading a tool's full schema until a search step says it's needed.

**Compress: keep the meaning, drop the tokens.**
- **Compaction:** summarise older conversation turns and tool outputs, keeping decisions, open questions and key facts.
- Trim tool results to what's needed (first rows, error summary) and cap payload sizes.

**Isolate: give sub-tasks their own clean context.**
- **Sub-agents:** a coordinator hands a focused task to a sub-agent with a fresh context; the sub-agent returns a short summary, not its whole exploration.

**Persist: remember outside the window.**
- Notes files, scratchpads and **long-term memory** stores (vector or structured) that the agent writes to and retrieves from across sessions.

**Order and structure.**
- Put stable content (instructions, tool definitions) first and variable content last. That ordering also maximises **prompt caching**: providers can reuse the processed prefix of a prompt across requests, cutting cost and latency substantially for repeated long prefixes.
- Put the most important instructions at the start and repeat critical constraints near the end for very long prompts.

:::warn Memory is a liability too
Anything you store and reinject can be wrong, stale, or poisoned by a malicious document. Memories need provenance, expiry, and the same "treat as data, not instructions" handling as retrieved text.
:::

## A mental checklist

Before each model call in an agent, ask:
1. Does the model have the **instructions and constraints** for this step?
2. Does it have the **facts** it needs, and no more?
3. Are the **tools** it needs available, and only those?
4. Is old, irrelevant history **summarised or dropped**?
5. Is there room left for the **answer**?

:::tip Interview angle
For any agent or chat design, discuss the context budget explicitly: what's in the window per step, how history is compacted, how retrieved content is selected and delimited, what's cached, and how you'd detect degradation (evaluation on long sessions, tracking token counts per step).
:::`,
    pitfalls: [
      "Dumping every document and tool into the window “because it fits”",
      "Letting agent history grow unbounded until quality and cost degrade",
      "Burying critical facts in the middle of a long context",
      "Putting variable content before stable content and losing prompt-cache hits",
      "Re-injecting stored memories without provenance or expiry",
    ],
    quiz: [
      Q("What does the “lost in the middle” finding say?", ["Models forget the system prompt", "*Information in the middle of long contexts is used worse than information at the start or end", "Middle layers of the network are unused", "Context windows are always too small"], "Placement matters; retrieval and ordering help."),
      Q("An agent has 80 tools and keeps calling the wrong one. Best fix?", ["Raise temperature", "*Retrieve or load only the tools relevant to the request (tool search, grouping)", "Add more tools", "Longer descriptions for every tool"], "Fewer, relevant tool schemas improve selection and save tokens."),
      Q("Why put stable instructions before variable user content?", ["Models read backwards", "*It maximises prompt-cache reuse of the shared prefix", "It is required by JSON", "It reduces output length"], "Caching works on identical prefixes."),
    ],
  }),
];
