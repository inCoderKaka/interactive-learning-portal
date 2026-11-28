=== bpe-wordpiece
blurb: Why language models read subword tokens, the byte-pair encoding algorithm step by step (training and encoding), byte-level BPE, WordPiece and the Unigram/SentencePiece approach, special tokens, and implementing a BPE trainer.
signals: "Implement BPE training" (ML coding) | "Why not characters or whole words?" | "How does the tokenizer handle unseen words or emoji?" | Vocabulary size trade-offs
widgets: bpe
prereq: word2vec

--- lesson
:::words
- **Token**: one unit a language model reads or writes: a word, a piece of a word, a character or a byte.
- **Tokenizer**: the program that splits text into tokens and maps each to an integer ID.
- **Vocabulary**: the fixed list of all tokens a model knows (often 32,000–256,000).
- **Subword**: a piece of a word, like "un", "believ", "able".
- **BPE** (byte-pair encoding): builds a vocabulary by repeatedly merging the most frequent adjacent pair of symbols.
- **Byte-level**: working on the raw bytes of UTF-8 text, so any string can be represented.
- **Special tokens**: reserved tokens with roles, such as beginning-of-text, end-of-text, padding, or chat-role markers.
:::

## The problem in plain words

A language model needs text as a sequence of integers. Whole words fail: the vocabulary would be huge, and any new word, typo or name becomes "unknown". Single characters work for everything but make sequences very long (more compute, harder to learn meaning). **Subword tokenization** is the compromise: common words get one token, rare words are spelled out of a few pieces, and nothing is ever unknown. Every modern LLM uses a variant, and implementing BPE is a popular ML-coding question.

:::eli5
Text messages invent shortcuts for things people write often: "lol", "brb". BPE does that automatically: it notices which letter pairs appear together most and glues them into one symbol, again and again, until frequent words are single symbols and rare words are a few symbols stuck together.
:::

## BPE training

Start from characters (or bytes). Repeat until the vocabulary reaches the target size:

1. Count every adjacent pair of symbols across the corpus (weighted by word frequency).
2. Merge the most frequent pair into a new symbol; record the merge.
3. Replace that pair everywhere.

Example corpus with counts: "low" ×5, "lower" ×2, "newest" ×6, "widest" ×3 (words split into characters plus an end marker). The most frequent pair is "e s" (in newest and widest: 9 times) → "es"; then "es t" → "est"; then "l o" → "lo"; and so on. After enough merges, "newest" might be ["new", "est"] and "lowest" (never seen) becomes ["low", "est"]. Step through the merges yourself:

[[widget:bpe]]

```python
from collections import Counter

def train_bpe(words: dict[str, int], num_merges: int):
    vocab = {tuple(w) + ("</w>",): c for w, c in words.items()}
    merges = []
    for _ in range(num_merges):
        pairs = Counter()
        for sym, c in vocab.items():
            for a, b in zip(sym, sym[1:]):
                pairs[(a, b)] += c
        if not pairs:
            break
        best = max(pairs, key=pairs.get)
        merges.append(best)
        new = {}
        for sym, c in vocab.items():
            out, i = [], 0
            while i < len(sym):
                if i + 1 < len(sym) and (sym[i], sym[i + 1]) == best:
                    out.append(sym[i] + sym[i + 1]); i += 2
                else:
                    out.append(sym[i]); i += 1
            new[tuple(out)] = c
        vocab = new
    return merges
```

**Encoding** new text: split into characters, then apply the learned merges **in the order they were learned** (or repeatedly merge the pair with the lowest merge rank) until no merge applies. Real implementations pre-split text into "words" with a regular expression (spaces, punctuation, digits) so merges don't cross word boundaries, and use priority queues for speed.

## Byte-level BPE

GPT-2 onward run BPE over **UTF-8 bytes** rather than Unicode characters: the base vocabulary is just 256 bytes, so any input (emoji, Chinese, code, binary junk) is representable with no "unknown" token. A space is usually attached to the following word ("Ġhello" in GPT-2's notation), so " hello" and "hello" are different tokens.

## WordPiece and Unigram

- **WordPiece** (BERT): like BPE, but merges the pair that most increases the likelihood of the training data under a unigram model: score $= \text{count}(ab)/(\text{count}(a)\cdot\text{count}(b))$, favouring pairs that are more associated than their parts' frequencies suggest. Continuation pieces are marked "##" ("play", "##ing").
- **Unigram language model** (SentencePiece's default; T5, Gemma family): start from a large candidate vocabulary and **prune** pieces whose removal least reduces the corpus likelihood. Encoding chooses the most probable segmentation (Viterbi), and training can **sample** alternative segmentations (subword regularisation) for robustness.
- **SentencePiece** is a library that treats the input as a raw stream (spaces become "▁"), so it works for languages without spaces (Japanese, Chinese) and is reversible.

## Special tokens and chat templates

Tokenizers reserve IDs for structural markers: beginning/end of sequence, padding, mask (BERT's [MASK]), separators, and in chat models role markers that delimit system, user and assistant turns (sft-chat page). They must never be produced from user text by accident: a user typing the literal string of an end-of-turn marker should be tokenized as ordinary characters, otherwise it's an injection vector.

## Choosing vocabulary size

- Larger vocabularies → shorter sequences (cheaper attention, longer effective context) but bigger embedding and output layers and rarer tokens with fewer training examples each.
- Typical sizes: 32k (Llama 2), 50k (GPT-2), 100k–128k (GPT-4-class, Llama 3), 256k (Gemma, multilingual).
- The output softmax over the vocabulary is computed for every predicted token; at 256k entries and model width 4,096 it's about 1B parameters in the output layer alone (often tied with the input embedding).

## Interview angles

- "Implement BPE." Count pairs weighted by word frequency, merge the best, repeat; then encode by applying merges by rank. Mention pre-tokenisation and byte-level base.
- "Why subwords?" No unknown tokens, short sequences for common text, shared pieces across related words.
- "BPE vs WordPiece vs Unigram?" Frequency merges vs likelihood-ratio merges vs pruning from a big vocabulary with probabilistic segmentation.

--- revise
### Why subwords
? Problem with word-level vocabularies? :: Huge vocabulary and unknown words (typos, names, new words).
? Problem with characters? :: Very long sequences; harder to learn meaning.
? What subwords give? :: No unknowns, short sequences for common text, shared pieces.

### BPE
? BPE training loop? :: Count adjacent pairs (weighted by frequency), merge the most frequent, record it, repeat.
? BPE encoding? :: Split into characters/bytes, apply merges in learned order.
? Why pre-tokenise with a regex? :: Keep merges within words, digits and punctuation.
? Byte-level BPE's advantage? :: 256-byte base: any string is representable, no unknown token.

### Alternatives
? WordPiece merge score? :: count(ab)/(count(a)·count(b)): likelihood gain, not raw frequency.
? Unigram LM tokenization? :: Start big, prune pieces that least hurt likelihood; Viterbi for encoding; can sample segmentations.
? SentencePiece? :: Library treating text as a raw stream with "▁" for spaces; works without whitespace languages.

### Practical
? Vocabulary size trade-off? :: Bigger: shorter sequences but larger embedding/output layers and rarer tokens.
? Why must special tokens not come from user text? :: Literal marker strings could inject structure (end a turn, fake a role).

--- notes
## Why
Words: huge vocab + unknowns. Chars: long sequences. Subwords: no unknowns, short for common text.
## BPE
Train: count adjacent pairs × word freq → merge best → record → repeat to vocab size.
Encode: chars/bytes → apply merges by rank. Regex pre-split (spaces, punctuation, digits).
Byte-level (GPT-2+): 256 bytes base; "Ġ" space prefix; " hello" ≠ "hello".
## Others
WordPiece (BERT): merge maximising count(ab)/(count(a)count(b)); "##" continuation.
Unigram (SentencePiece default; T5, Gemma): prune from large vocab by likelihood; Viterbi; subword regularisation.
SentencePiece: raw stream, "▁" spaces, language-agnostic.
## Special tokens
BOS/EOS, PAD, MASK, SEP, chat roles. Never tokenise user text into specials (injection).
## Vocab size
32k (Llama 2), 50k (GPT-2), ~100–128k (Llama 3), 256k (Gemma).
Bigger → shorter sequences, bigger embed/unembed (256k × 4096 ≈ 1B params), rarer tokens.

--- doubts
Q: Is the tokenizer trained together with the model?
A: No: it's trained first, separately, on a sample of the corpus, and then frozen. The model learns embeddings for whatever tokens the tokenizer defines. Changing the tokenizer later means retraining (or carefully extending) the embedding layer.

Q: Why does GPT treat " hello" and "hello" as different tokens?
A: Byte-level BPE attaches the preceding space to the word, because words usually follow spaces; this saves a token per word. The cost is that the same word has variants (start of text, after a space, capitalised), which is one source of tokenization quirks.

Q: Can a BPE tokenizer produce different tokens for the same word?
A: The deterministic encoder always produces the same tokens for the same string, but the string context matters (leading space, capitalisation, attached punctuation). Unigram tokenizers with sampling deliberately produce different segmentations during training for robustness.

--- exercises
[design] Given the learned merges [("e","s"), ("es","t"), ("l","o"), ("lo","w")], encode the word "lowest".
A: Start: l o w e s t </w>. Apply merges by rank: (e,s) → l o w es t; (es,t) → l o w est; (l,o) → lo w est; (lo,w) → low est. Result: ["low", "est", "</w>"] (or ["low", "est</w>"] if the end marker had merged too).

[estimate] A model has a 128k-token vocabulary and hidden size 8,192. How many parameters are in the input embedding and output layer if untied? What fraction is that of a 70B model?
A: Each is $128{,}000 \times 8{,}192 \approx 1.05$B; untied total ≈ 2.1B, about 3% of 70B. For small models (1–3B) the same vocabulary is a much bigger share, which is why small models often tie the two matrices.

[break] A chatbot's tokenizer turns the user-typed string "<|end_of_turn|>" into the real special token. What can go wrong?
A: A user can end their own turn and write text that the model treats as the assistant's or the system's (role confusion, prompt injection). Tokenize user content with special-token parsing disabled so the string becomes ordinary text, and only insert specials from the trusted template code.

--- pitfalls
- Applying BPE merges in frequency order instead of the learned rank order when encoding
- Letting user text produce special tokens
- Forgetting pre-tokenisation (merges spanning words and punctuation)
- Changing the tokenizer without retraining embeddings
- Ignoring how vocabulary size affects output-layer cost

--- quiz
Q: What does each BPE training step merge?
- The rarest pair
- *The most frequent adjacent pair of symbols
- Random characters
- Whole sentences
W: Frequency-weighted pair counts decide the merge.

Q: Why is byte-level BPE never "unknown"?
- It has a huge vocabulary
- *Any text is a sequence of the 256 base bytes
- It ignores rare characters
- It lowercases everything
W: Unknown characters fall back to bytes.

Q: How does a Unigram tokenizer build its vocabulary?
- Merging frequent pairs
- *Starting large and pruning pieces that least reduce corpus likelihood
- Using whole words only
- Random sampling
W: It's a top-down approach, unlike BPE's bottom-up merges.

Q: A larger vocabulary mainly gives?
- Longer sequences
- *Shorter sequences but larger embedding and output layers
- No change
- Fewer special tokens
W: More text per token, more parameters per token type.

--- sources
- paper :: Neural Machine Translation of Rare Words with Subword Units (BPE) :: Sennrich, Haddow, Birch (2016) :: https://arxiv.org/abs/1508.07909
- paper :: SentencePiece: A simple and language independent subword tokenizer :: Kudo, Richardson, Google (2018) :: https://arxiv.org/abs/1808.06226
- paper :: Subword Regularization (Unigram LM) :: Taku Kudo, Google (2018) :: https://arxiv.org/abs/1804.10959
- course :: Let's build the GPT Tokenizer :: Andrej Karpathy :: https://www.youtube.com/watch?v=zduSFxRajkE

=== tokenization-effects
blurb: How tokenization shapes cost, context length and behaviour: tokens per word across languages, numbers and arithmetic, code and whitespace, spelling and character-level tasks, glitch tokens, and practical token-budget estimates for system design.
signals: "Estimate tokens and cost for this workload" | "Why is the model bad at counting letters?" | Multilingual products and fairness of cost | Prompt and context-budget design
widgets: token-cost
prereq: bpe-wordpiece

--- lesson
:::words
- **Tokens per word**: how many tokens a typical word becomes; about 1.3 for English with modern tokenizers.
- **Fertility**: tokens per word for a language; high fertility means more cost and less effective context.
- **Context window**: the maximum number of tokens a model can process at once.
- **Glitch token**: a token that exists in the vocabulary but was barely seen in training, causing odd behaviour.
- **Token budget**: how many tokens a request may use for instructions, retrieved text, history and the answer.
:::

## The problem in plain words

Everything about an LLM is measured in tokens: price, latency, how much text fits in the context window, and even what the model finds easy or hard. Two prompts with the same number of words can differ several-fold in tokens depending on language, numbers and formatting. In system design you estimate token counts to size costs and capacity; in debugging you trace odd model behaviour (bad arithmetic, can't count letters) back to tokenization.

:::eli5
The model doesn't see letters; it sees chunks, like someone reading a newspaper cut into word-pieces. Asking it how many r's are in "strawberry" is like asking someone how many r's are on a puzzle piece they've only ever seen as one shape.
:::

## Rules of thumb for budgets

- English: about **0.75 words per token** (≈ 4 characters per token); 1,000 tokens ≈ 750 words ≈ 1.5 pages.
- Code: more tokens per line than prose; indentation and symbols cost tokens (tokenizers trained with code merge common whitespace runs).
- Other languages: often **1.5–3× more tokens** than English for the same content with English-heavy tokenizers (some Indic and other scripts much more); newer multilingual vocabularies (larger, more balanced) narrow the gap.
- JSON and structured output: keys, quotes and braces cost tokens; compact schemas save money.

Estimate a workload's token count and cost below, and compare languages and formats:

[[widget:token-cost]]

## Cost and latency

API pricing is per token, usually with output tokens several times more expensive than input tokens; cached input prefixes are cheaper. Latency has two parts: **time to first token** (processing the input: roughly proportional to input tokens, but fast because it's parallel) and **time per output token** (generation is sequential). So long outputs are much slower than long inputs. In design interviews, compute:

$$\text{cost/day} = \text{requests/day} \times (\text{in tokens} \times p_{\text{in}} + \text{out tokens} \times p_{\text{out}})$$

## Behaviour that comes from tokenization

- **Character-level tasks** (spelling, counting letters, reversing words, rhymes): the model sees "strawberry" as two or three tokens, not ten letters. It must have memorised the spelling of each token. Reasoning models do better by spelling out letters first.
- **Numbers and arithmetic**: some tokenizers split digits inconsistently ("1234" → "12" "34", "12345" → "123" "45"), so the place value of a token varies. Many modern tokenizers split numbers into single digits or fixed groups of three to make arithmetic more learnable. Tool use (a calculator or code) beats both.
- **Whitespace and formatting**: trailing spaces, odd indentation or unusual Unicode can change tokenization and subtly change outputs; prompt templates should be byte-for-byte consistent between evaluation and production.
- **Capitalisation and leading spaces**: "Hello", " hello" and "HELLO" are different tokens with different statistics.
- **Glitch tokens**: tokens frequent in the tokenizer's training data but rare in the model's (the famous "SolidGoldMagikarp", a Reddit username) have barely-trained embeddings and can produce bizarre output.
- **Multilingual fairness**: users of high-fertility languages pay more per sentence and get less effective context.

## Context-window arithmetic

A request's tokens are shared by: system instructions + tool definitions + retrieved documents + conversation history + the user's message + **the answer**. Leave room for the output (max tokens is part of the window). For a 128k-token window: 2k instructions, 2k tools, 20 chunks × 500 = 10k retrieved, 6k history, 0.5k user message, and up to 4k for the answer is 24.5k: comfortable. The context-engineering pages cover what to include.

## Interview angles

- Token math for any LLM design: requests per day × tokens → cost, GPU throughput, rate limits.
- "Why can't the model count letters / do long multiplication?" Tokens, not characters; inconsistent number splits; use tools or have it spell out first.
- "Serving users in Hindi and Japanese?" Higher token counts → cost and context; choose a tokenizer/model with good multilingual coverage; measure per language.

--- revise
### Budgets
? English tokens per word? :: ~1.3 (≈ 0.75 words per token, ≈ 4 characters per token).
? 1,000 tokens is about? :: 750 English words.
? Other languages with English-heavy tokenizers? :: Often 1.5–3× more tokens for the same content.

### Cost and latency
? Daily cost formula? :: requests × (in tokens × input price + out tokens × output price).
? Why are output tokens slower than input tokens? :: Input is processed in parallel; output is generated one token at a time.
? Two parts of LLM latency? :: Time to first token and time per output token.

### Behaviour
? Why do LLMs struggle to count letters? :: They see tokens, not characters.
? Number tokenization fixes? :: Split into single digits or fixed groups; or use tools.
? Glitch token? :: A vocabulary token rarely seen in model training, with a poorly trained embedding.
? Multilingual fairness issue? :: High-fertility languages cost more and get less effective context.

--- notes
## Budgets
English: ~1.3 tokens/word, ~4 chars/token, 1k tokens ≈ 750 words.
Code: more tokens per line; whitespace matters. Non-English: 1.5–3× (some scripts more). JSON overhead.
## Cost / latency
cost/day = req × (in·p_in + out·p_out). Output pricier. Cached prefixes cheaper.
TTFT ∝ input (parallel); per-token time for output (sequential) → long outputs slow.
## Behaviour
Letters/spelling/counting: tokens hide characters → spell out or tools.
Numbers: inconsistent splits → digit-level tokenization or calculator/code.
Whitespace, capitals, leading spaces change tokens; keep templates byte-identical.
Glitch tokens (SolidGoldMagikarp). Multilingual cost and context unfairness.
## Context math
Window = instructions + tools + retrieved + history + user + answer (reserve output).

--- doubts
Q: Why are output tokens more expensive than input tokens?
A: Input tokens are processed in one parallel pass that uses the hardware efficiently. Output tokens are generated one at a time, each step reading all the model's weights and the growing cache for little computation (memory-bound), so each output token costs much more hardware time.

Q: Does a bigger vocabulary fix multilingual cost?
A: It helps if the extra tokens are allocated to other languages (trained on a balanced multilingual corpus). Simply enlarging an English-centric vocabulary adds more English tokens. Gemma's and Llama 3's larger vocabularies were trained to reduce non-English fertility.

Q: Will future models stop having these quirks?
A: Character-aware or byte-level models avoid them but make sequences longer and more expensive. Today's practical fix is tools (code execution, calculators) and reasoning that spells things out explicitly.

--- exercises
[estimate] A support assistant handles 2 million chats a day, each with 3 turns. Each turn sends 3,000 input tokens (instructions, retrieved docs, history) and generates 250 output tokens. Prices: USD 1 per million input tokens and USD 4 per million output tokens. Daily cost?
A: Turns: 6M/day. Input: $6\text{M} \times 3000 = 18$B tokens → USD 18,000. Output: $6\text{M} \times 250 = 1.5$B → USD 6,000. Total ≈ USD 24,000/day (~USD 8.8M/year). Prefix caching of the shared instructions, smaller retrieved context and routing easy turns to a cheaper model are the main levers.

[break] An e-commerce app's LLM summaries of product reviews cost three times more in its Thai market than in its US market, and summaries there are often truncated. Why?
A: Thai text has much higher token fertility with the model's tokenizer, so the same reviews take ~3× the tokens: higher cost, and the context window fills sooner, truncating inputs. Use a model with a better multilingual tokenizer, budget tokens per language, summarise in chunks, and track cost and quality per locale.

[choose] Users ask a chatbot arithmetic questions like "what's 4,839 × 7,215?" and it often gets them wrong. Fix it with prompting, a bigger model, or a tool?
A: A calculator or code-execution tool: exact, cheap and reliable. Prompting the model to work step by step helps somewhat; a bigger model reduces errors but never guarantees exactness. Route arithmetic to the tool via function calling.

--- pitfalls
- Estimating LLM cost in words or characters instead of tokens
- Ignoring output tokens' higher price and latency
- Assuming the same token counts across languages
- Expecting reliable character-level or long arithmetic without tools
- Prompt templates that differ in whitespace between evaluation and production

--- quiz
Q: Roughly how many English words fit in 1,000 tokens?
- 250
- *750
- 1,500
- 4,000
W: About 0.75 words per token.

Q: Why is generating 1,000 tokens slower than reading 1,000 tokens of input?
- Output tokens are bigger
- *Generation is sequential, one token per step; input is processed in parallel
- The model is smaller for output
- Input is cached
W: Each output token needs its own forward pass.

Q: Why can an LLM fail to count the letters in a word?
- It has no memory
- *It sees subword tokens rather than individual characters
- Letters aren't in its vocabulary
- It was trained only on numbers
W: Spelling must be recalled per token.

Q: A user in a language with 2.5× token fertility pays?
- The same per sentence
- *About 2.5× more per sentence and gets less effective context
- Less, because words are shorter
- Nothing extra
W: Cost and context are measured in tokens.

--- sources
- article :: What are tokens and how to count them? :: OpenAI Help Center :: https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count-them
- paper :: Language Model Tokenizers Introduce Unfairness Between Languages :: Petrov et al. (NeurIPS 2023) :: https://arxiv.org/abs/2305.15425
- article :: SolidGoldMagikarp (plus, prompt generation) :: Rumbelow, Watkins (LessWrong 2023) :: https://www.lesswrong.com/posts/aPeJE8bSo6rAFoLqg/solidgoldmagikarp-plus-prompt-generation
- article :: Understand and count tokens :: Google AI for Developers (Gemini API) :: https://ai.google.dev/gemini-api/docs/tokens
