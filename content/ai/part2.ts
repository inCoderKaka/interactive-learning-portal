import { Q, T } from "../h";
import type { Topic } from "@/lib/types";
import { md } from "./md";

export const aiTopics2: Topic[] = [
  T("ai", "ai-cnn", "Convolutional networks and vision", 2, 35, "Kernels, stride, padding and pooling; the LeNet → AlexNet → VGG → Inception → ResNet → MobileNet → EfficientNet story; and vision Transformers.", {
    signals: ["Any image, video or spatial-grid input", "On-device or mobile inference budgets", "Explaining why ResNets train when plain deep nets don't"],
    prereq: ["ai-neural-nets"],
    viz: "convolution",
    lesson: md`An image is a grid of numbers: height × width × channels (3 for RGB). A fully connected layer on a 224×224 RGB image would need 150,528 weights *per neuron* and would not know that neighbouring pixels are related. **Convolutions** fix both problems with two ideas: **local receptive fields** and **weight sharing**.

## The convolution operation

A small **kernel** (filter) of learnable weights, say 3×3, slides across the image. At each position it multiplies the pixels under it by its weights and sums them into one output value. The same kernel is used everywhere, so a "vertical edge detector" learned in one corner works in every corner.

[[widget:convolution]]

- **Stride:** how far the kernel moves each step. Stride 2 halves the output size.
- **Padding:** zeros around the border so edges get processed and sizes are preserved.
- **Output size:** $O = \left\lfloor \frac{I - K + 2P}{S} \right\rfloor + 1$ for input $I$, kernel $K$, padding $P$, stride $S$. A 3×3 kernel with padding 1 and stride 1 keeps the size.
- **Channels:** a layer has many kernels; each produces one **feature map**. A kernel spans all input channels, so a 3×3 conv from 64 to 128 channels has $3 \cdot 3 \cdot 64 \cdot 128 \approx 74K$ weights.

**Pooling** downsamples: **max pooling** keeps the largest value in each 2×2 window, **average pooling** the mean. It adds a little translation invariance and cuts computation. Early layers learn edges and colours, middle layers textures and parts, late layers whole objects.

## The family tree

| Year | Model | The idea worth remembering |
|---|---|---|
| 1998 | LeNet-5 | Conv → pool → conv → pool → dense; read handwritten digits on cheques |
| 2012 | AlexNet | ReLU, dropout, data augmentation, max pooling, trained on GPUs; won ImageNet by a mile |
| 2014 | VGG | Only 3×3 kernels, stacked deep; simple and huge (VGG-16 ~138M parameters) |
| 2014 | GoogLeNet / Inception | Parallel 1×1, 3×3, 5×5 convs and pooling in one module; **1×1 convs** shrink channels first |
| 2015 | ResNet | **Skip connections** $H(x) = F(x) + x$; 152 layers trainable |
| 2017 | MobileNet | **Depthwise separable** convolutions for phones |
| 2019 | EfficientNet | Scale depth, width and resolution together with one coefficient |
| 2020 | ViT | Cut the image into patches and feed them to a Transformer |

:::dyk
Two stacked 3×3 convolutions see a 5×5 region, and three see 7×7, yet use fewer parameters ($3 \times 9C^2 = 27C^2$ versus $49C^2$ for one 7×7) and add extra non-linearities. That is VGG's whole trick, and Inception v2 used it to factor 5×5 convolutions into two 3×3s (and $n \times n$ into $1 \times n$ followed by $n \times 1$).
:::

## Why skip connections changed everything

Before ResNet, adding layers beyond about 20 made networks *worse*, even on training data: gradients faded on the long way back. A residual block learns only the **change** $F(x)$ and adds the input back. If a layer is useless, it can learn $F(x) = 0$ and pass the signal through unchanged, and gradients flow straight down the identity path. Every Transformer layer uses the same trick.

## Efficiency: depthwise separable convolutions

A standard convolution mixes space and channels at once. MobileNet splits it into a **depthwise** conv (one $K \times K$ filter per channel) and a **pointwise** 1×1 conv that mixes channels. The cost ratio is

$$
\frac{\text{FLOPs}_{sep}}{\text{FLOPs}_{std}} = \frac{1}{C_{out}} + \frac{1}{K^2}
$$

roughly **8 to 9 times cheaper** for 3×3 kernels. For scale: VGG-19 has about 144M parameters and 19.6 GFLOPs, ResNet-34 21.8M and 3.6 GFLOPs, MobileNet 4.2M and about 0.57 GFLOPs.

**EfficientNet** observed that scaling only depth, only width or only resolution saturates. Its **compound scaling** sets depth $= \alpha^\phi$, width $= \beta^\phi$, resolution $= \gamma^\phi$ with $\alpha \beta^2 \gamma^2 \approx 2$ (so FLOPs roughly double per step of $\phi$); for the B0 baseline found by architecture search, $\alpha = 1.2$, $\beta = 1.1$, $\gamma = 1.15$.

## Vision Transformers

ViT splits an image into 16×16 patches, flattens each into a vector with a linear layer (equivalently, a convolution with kernel size and stride 16), adds position embeddings and runs a standard Transformer. With enough data it matches or beats CNNs, and it is the image encoder inside most **multimodal** LLMs today.

:::tip What vision questions look like at Google
Rarely "derive backprop through a conv". More often: "design photo search", "detect inappropriate images at upload", or "run a model on a phone". Talk about pretrained backbones and fine-tuning, embeddings for similarity, latency budgets (MobileNet-style models, quantisation), and evaluation per class and per user group.
:::`,
    pitfalls: [
      "Forgetting that a kernel spans all input channels when counting parameters",
      "Getting the output-size formula wrong under stride and padding",
      "Training a CNN from scratch when a pretrained backbone plus fine-tuning would do",
      "Explaining ResNet as “more layers” instead of the identity path that keeps gradients alive",
    ],
    quiz: [
      Q("Input 32×32, kernel 5×5, padding 0, stride 1. What is the output size?", ["32×32", "*28×28", "27×27", "16×16"], "(32 − 5 + 0) / 1 + 1 = 28."),
      Q("What does a 1×1 convolution do in an Inception module?", ["Blurs the image", "*Mixes and reduces channels cheaply before expensive convolutions", "Doubles the resolution", "Nothing; it is an identity"], "It is a per-pixel linear layer across channels."),
      Q("Why are depthwise separable convolutions cheaper?", ["They skip pixels", "*They separate spatial filtering per channel from channel mixing", "They use no weights", "They run on the CPU"], "Cost falls by about 1/C_out + 1/K²."),
    ],
  }),

  T("ai", "ai-rnn", "Sequence models: RNNs and LSTMs", 2, 30, "Hidden state, backprop through time, vanishing gradients, LSTM and GRU gates, and the bottleneck that led to attention.", {
    signals: ["Explaining why Transformers replaced RNNs", "Streaming or on-device sequence tasks with tight memory", "Time series with short context"],
    prereq: ["ai-neural-nets"],
    lesson: md`Text, audio and time series arrive as **sequences** of variable length where order matters. A plain feed-forward network wants a fixed-size input and treats positions independently. **Recurrent neural networks** handle sequences by carrying a **hidden state**, a running summary of everything seen so far.

## The recurrence

At each time step $t$ the same weights read the input $x_t$ and the previous state $h_{t-1}$:

$$
h_t = \tanh(W_{hh} h_{t-1} + W_{xh} x_t + b_h), \qquad y_t = W_{hy} h_t + b_y
$$

Weights are **shared across time**, so the model handles any length. Before RNNs, a common shortcut was a fixed window (a Markov assumption: only the last $n$ tokens matter); the RNN instead compresses the whole history into $h_t$.

Typical shapes of task: **one-to-many** (caption an image), **many-to-one** (classify a review's sentiment), **many-to-many** (translate; tag each word).

## Training: backprop through time

Unroll the network over all time steps and backpropagate through the unrolled graph (**BPTT**). Here's the catch: the gradient from step 100 back to step 1 multiplies by $W_{hh}^\top$ (and tanh derivatives) about 100 times. If the matrix's largest eigenvalues are below 1, gradients **vanish** exponentially and the model forgets long-range dependencies; above 1, they **explode** (clip them).

:::eli5
Whispering a message down a line of 100 people. By the end, the start of the message is gone. That's a vanishing gradient.
:::

## LSTM: a conveyor belt for memory

The **long short-term memory** cell (Hochreiter and Schmidhuber, 1997) adds a **cell state** $C_t$ that flows through time with only element-wise changes, controlled by gates (sigmoids between 0 and 1):

- **Forget gate** $f_t = \sigma(W_f[h_{t-1}, x_t] + b_f)$: what to erase.
- **Input gate** $i_t = \sigma(W_i[h_{t-1}, x_t] + b_i)$ and candidate $\tilde{C}_t = \tanh(W_c[h_{t-1}, x_t] + b_c)$: what to write.
- **Update:** $C_t = f_t \odot C_{t-1} + i_t \odot \tilde{C}_t$.
- **Output gate** $o_t = \sigma(W_o[h_{t-1}, x_t] + b_o)$ and $h_t = o_t \odot \tanh(C_t)$: what to reveal.

Because $C_t$ is updated additively, gradients can flow along it for many steps (a forget gate near 1 means "keep"; exactly 0 means "erase everything"). The **GRU** merges cell and hidden state and uses just two gates (reset and update): fewer parameters, similar results.

:::dyk
LSTMs quietly ran a lot of the world in the 2010s: Google's speech recognition, Google Translate's 2016 neural system (eight LSTM layers each in the encoder and decoder), Apple's QuickType and Amazon's Alexa all used them before Transformers took over.
:::

## The bottleneck that led to attention

**Sequence-to-sequence** models (Sutskever, Vinyals and Le at Google, 2014) used an encoder RNN to squeeze the whole input sentence into one fixed vector and a decoder RNN to generate the output from it. Long sentences don't fit in one vector. **Attention** (Bahdanau et al., 2014) let the decoder look back at *every* encoder state and take a weighted mix at each output step. Once you can attend to everything, the recurrence itself becomes the bottleneck: it is sequential, so it can't use a GPU's parallelism. The Transformer removed it.

## What still uses recurrence

Recurrence is not dead: **state-space models** such as Mamba and linear-attention RNNs bring back a fixed-size state for very long or streaming inputs, trading some quality for constant memory per token. Expect hybrid architectures that mix attention layers with recurrent ones.

:::tip Quick-fire facts interviewers like
RNN weights are shared across time. The hidden state depends on the input and the previous state. The activation is usually tanh. The main problem is vanishing gradients; the LSTM's cell state solves it; a forget gate of 0 erases memory. RNNs are inherently sequential, which is why Transformers train faster.
:::`,
    pitfalls: [
      "Saying LSTMs “solve” long context completely (they help, but memory still fades over hundreds of steps)",
      "Forgetting gradient clipping for exploding gradients",
      "Missing that the real reason Transformers won is parallel training, not only better accuracy",
    ],
    quiz: [
      Q("Why do vanilla RNNs struggle with long-range dependencies?", ["Too many parameters", "*Gradients shrink exponentially when backpropagated through many time steps", "They cannot process text", "Their weights are not shared"], "Repeated multiplication by W_hh makes gradients vanish (or explode)."),
      Q("In an LSTM, what does a forget gate value of 0 do?", ["Keeps all memory", "*Erases the previous cell state", "Outputs nothing", "Doubles the learning rate"], "C_t = f_t ⊙ C_{t−1} + …; with f_t = 0 the old memory is gone."),
      Q("What limitation of seq2seq did attention fix?", ["Slow tokenisation", "*Compressing the whole input into a single fixed-size vector", "Lack of GPUs", "Overfitting"], "Attention lets the decoder read every encoder state directly."),
    ],
  }),

  T("ai", "ai-embeddings", "Embeddings: meaning as geometry", 1, 30, "One-hot vs dense vectors, word2vec and GloVe, cosine similarity, contextual and sentence embeddings, and contrastive learning.", {
    signals: ["Semantic search, recommendations, deduplication, clustering", "Anything RAG", "Feeding text or images into a classic model"],
    prereq: ["ai-neural-nets"],
    viz: "embedding-space",
    lesson: md`Models can't do arithmetic on the word "cat". They need numbers, and the numbers should put similar things close together. An **embedding** is a learned vector (typically 256 to 4,096 numbers) that does exactly that.

## Why not one-hot?

A one-hot vector for a 50,000-word vocabulary is 50,000 zeros with a single 1. Every pair of words is equally far apart, so "cat" is as different from "kitten" as from "carburettor", and the vectors are huge. A dense embedding learns a few hundred dimensions in which **distance means something**.

## word2vec: you shall know a word by the company it keeps

**Skip-gram** (Mikolov et al. at Google, 2013) trains a tiny network to predict the words around a centre word:

$$
P(w_o \mid w_c) = \frac{\exp(v'^{\top}_{w_o} v_{w_c})}{\sum_{w \in V} \exp(v'^{\top}_{w} v_{w_c})}
$$

The sum over the whole vocabulary is too expensive, so **negative sampling** instead asks the model to tell the real context word apart from $k$ random "negative" words:

$$
L = -\log \sigma(v'^{\top}_{w_o} v_{w_c}) - \sum_{i=1}^{k} \log \sigma(-v'^{\top}_{w_i} v_{w_c})
$$

(CBOW, the sibling model, predicts the centre word from its context.) **GloVe** (Stanford, 2014) gets similar vectors from global co-occurrence counts $X_{ij}$, fitting $w_i^\top \tilde{w}_j + b_i + \tilde{b}_j \approx \log X_{ij}$ with a weighting $f(X_{ij})$ that caps very frequent pairs.

[[widget:embedding-space]]

:::dyk
The famous result, **king − man + woman ≈ queen**, also works for countries and capitals, verb tenses and even company–CEO pairs. Researchers soon found it also learned **man : computer programmer :: woman : homemaker**, an early, vivid demonstration that embeddings absorb the biases of their training text.
:::

## Measuring similarity

**Cosine similarity** compares directions and ignores length:

$$
\cos(\theta) = \frac{A \cdot B}{\lVert A \rVert \, \lVert B \rVert}
$$

1 means same direction, 0 unrelated, −1 opposite. If vectors are normalised to length 1, cosine similarity equals the dot product, which is why vector databases often just use dot product. Two rules: **only compare vectors from the same embedding model**, and remember individual dimensions have no human meaning.

## Static vs contextual

word2vec gives "bank" one vector, whether it's a river bank or an investment bank (**polysemy**). Transformers produce **contextual embeddings**: the vector for "bank" depends on the whole sentence. For search you usually want one vector per **sentence or passage**, from models trained specifically for it (Sentence-BERT, Gemini and OpenAI embedding models, E5, BGE). These are what RAG systems index.

## Contrastive learning: how good embedding models are trained

Take pairs that should match (a question and its answer passage, an image and its caption), push them **together**, and push every other item in the batch **apart**. The loss is a softmax over similarities (InfoNCE). Large batches give many free negatives, and **hard negatives** (similar but wrong) teach the finest distinctions. CLIP uses the same recipe for images and text.

:::warn Embeddings are not magic
They are great at "about the same topic" and bad at exact facts: "ERR_42", order numbers, negation ("not compatible with iOS" sits close to "compatible with iOS") and rare names. That is why production search is **hybrid**: keyword search plus vector search.
:::

## Where embeddings show up

Semantic search and RAG, recommendations (two-tower models embed users and items into the same space; YouTube's recommender is the classic example), near-duplicate detection, clustering support tickets, anomaly detection, and as features for a small classifier when you have few labels.

:::tip Interview angle
If a design needs "find similar X", say: embed X with a pretrained model (fine-tune if the domain is unusual), store vectors in an ANN index, retrieve top-k, then rerank. Mention dimension versus storage (1M vectors × 768 floats × 4 bytes ≈ 3 GB), re-embedding cost when you change models, and evaluation with recall@k on a labelled set.
:::`,
    pitfalls: [
      "Comparing vectors produced by two different embedding models",
      "Expecting embeddings to match exact identifiers, numbers or negations",
      "Forgetting that changing the embedding model means re-embedding the whole corpus",
      "Using one vector for a very long document, which averages unrelated topics together",
    ],
    quiz: [
      Q("Two normalised embedding vectors have a dot product of 0.92. What does that mean?", ["They are 92% identical text", "*They point in nearly the same direction: very similar meaning", "They are unrelated", "Nothing without the vocabulary"], "For unit vectors, dot product = cosine similarity."),
      Q("What problem do contextual embeddings solve that word2vec cannot?", ["Speed", "*Polysemy: the same word with different meanings in different sentences", "Vocabulary size", "Training cost"], "word2vec has one vector per word type."),
      Q("Why does negative sampling make word2vec practical?", ["It removes the need for data", "*It avoids normalising over the entire vocabulary at every step", "It improves tokenisation", "It makes vectors sparse"], "It replaces a 50K-way softmax with a few binary classifications."),
      Q("Your semantic search misses queries for exact part numbers. Best fix?", ["Bigger embedding model", "*Add keyword (BM25) search and fuse the results (hybrid search)", "Lower the temperature", "Use one-hot vectors"], "Lexical search excels at exact tokens; fuse both lists."),
    ],
  }),

  T("ai", "ai-tokenization", "Tokens: the atoms of language models", 1, 25, "Why models read subwords, how byte-pair encoding works, what context windows and per-token pricing really mean, and why LLMs can't count the r's in strawberry.", {
    signals: ["Estimating cost or latency of an LLM feature", "Odd model behaviour with spelling, numbers, code or non-English text", "Choosing chunk sizes or context budgets"],
    prereq: ["ai-embeddings"],
    viz: "bpe",
    lesson: md`LLMs don't see letters or words. They see **tokens**: chunks of text mapped to integer ids, each id looked up in an embedding table. A rough rule for English: **1 token ≈ 4 characters ≈ ¾ of a word**, so 1,000 tokens is about 750 words, and 1 million tokens is several novels.

## Why subwords?

- **Characters:** tiny vocabulary, but sequences get very long and every word must be rebuilt from letters.
- **Words:** short sequences, but the vocabulary explodes and any unseen word becomes \`<unk>\`.
- **Subwords:** the sweet spot. Common words are one token; rare words split into reusable pieces (\`un\`, \`believ\`, \`able\`). Nothing is ever unknown, because in the worst case it falls back to bytes.

## Byte-pair encoding

BPE (used by GPT models; Google's models use the related **SentencePiece** and **WordPiece**) learns its vocabulary from data:

1. Start with single characters (or bytes) as tokens.
2. Count every adjacent pair in the corpus.
3. Merge the most frequent pair into a new token. Record the merge.
4. Repeat until the vocabulary reaches its target size (tens of thousands to a couple of hundred thousand).

To tokenise new text, apply the learned merges in order.

[[widget:bpe]]

## Tokens are the currency

- **Context window:** the maximum number of tokens a model can take in plus generate in one request: 8K, 128K, 1M or 2M for Gemini 1.5 Pro.
- **Pricing:** per million input and output tokens, and output tokens usually cost several times more than input.
- **Latency:** reading input (prefill) is fast and parallel; generating output is one token at a time. A long answer is slow even if the prompt is short.

:::dyk
Ask many models "how many r's are in strawberry?" and they used to say two. The model sees something like \`str\` + \`aw\` + \`berry\`, not ten letters, so counting characters is like asking you to count the letters in a word you only ever heard spoken. Reasoning models that spell the word out step by step get it right.
:::

## Tokenisation explains a lot of weirdness

- **Arithmetic:** numbers split unpredictably (\`1234\` might be \`12\` + \`34\`), which makes digit-level maths hard. Many newer tokenisers split numbers into single digits.
- **Non-English text** often needs 2 to 4 times more tokens for the same meaning, so it is slower and costs more: a real fairness issue.
- **Code:** whitespace and indentation consume tokens; tokenisers tuned for code merge runs of spaces.
- **Glitch tokens:** in 2023 researchers found tokens such as \` SolidGoldMagikarp\` (a Reddit username) that were in GPT's vocabulary but almost absent from its training data. Asking the model to repeat them produced bizarre outputs, because their embeddings were never trained.

:::story Why "SolidGoldMagikarp" broke ChatGPT
The tokenizer was trained on one dataset (which included a Reddit counting forum full of that username) and the model on another, more filtered one. The token existed but the model had essentially never seen it used. Lesson for engineers: **mismatched data pipelines create failure modes nobody tested.**
:::

## Special tokens

Models also have control tokens: beginning and end of text, padding, and chat-template markers that separate the system prompt, user turns and assistant turns. When you call a chat API, your messages are rendered into one token sequence with these markers. That is why **"the system prompt" is not magic: it is just text in a privileged position**, which matters for prompt-injection defence.

:::tip Back-of-envelope in interviews
"Summarise 10,000 support tickets of about 400 words each": 400 words ≈ 530 tokens, × 10,000 ≈ 5.3M input tokens, plus maybe 100 output tokens each ≈ 1M output tokens. Multiply by the price per million and you have a cost estimate in under a minute.
:::`,
    pitfalls: [
      "Estimating cost or context in words or characters instead of tokens",
      "Forgetting output tokens cost more and are generated sequentially",
      "Assuming every language tokenises as efficiently as English",
      "Expecting a model to reliably count characters or do digit-level arithmetic without tools",
    ],
    quiz: [
      Q("Roughly how many English words fit in 1,000 tokens?", ["100", "*About 750", "1,000", "4,000"], "Rule of thumb: a token is about ¾ of an English word."),
      Q("What does BPE merge at each step?", ["Random characters", "*The most frequent adjacent pair of tokens", "The longest word", "Stop words"], "Repeatedly merging frequent pairs builds the subword vocabulary."),
      Q("Why can LLMs struggle to count letters in a word?", ["They are bad at reading", "*They see subword tokens, not individual characters", "Temperature is too high", "Context window is too small"], "The letters are hidden inside multi-character tokens."),
    ],
  }),

  T("ai", "ai-transformers", "Attention and the Transformer", 1, 45, "Queries, keys and values; scaled dot-product attention; multi-head, self and cross attention; positions, masks, residuals; encoder vs decoder; and the O(n²) cost.", {
    signals: ["Any “how does an LLM work?” question", "Reasoning about context-length cost and latency", "Choosing between encoder (BERT-style) and decoder (GPT-style) models"],
    prereq: ["ai-embeddings", "ai-rnn"],
    viz: "attention",
    template: `import torch, torch.nn.functional as F

def attention(q, k, v, causal=False):
    # q, k, v: (batch, heads, seq, d_head)
    d = q.size(-1)
    scores = q @ k.transpose(-2, -1) / d ** 0.5      # (b, h, seq, seq)
    if causal:                                       # each token sees only the past
        n = scores.size(-1)
        mask = torch.triu(torch.ones(n, n, dtype=torch.bool, device=q.device), 1)
        scores = scores.masked_fill(mask, float("-inf"))
    weights = F.softmax(scores, dim=-1)              # rows sum to 1
    return weights @ v                               # (b, h, seq, d_head)

class MultiHead(torch.nn.Module):
    def __init__(self, d_model=512, heads=8):
        super().__init__()
        self.h, self.dh = heads, d_model // heads
        self.qkv = torch.nn.Linear(d_model, 3 * d_model)
        self.out = torch.nn.Linear(d_model, d_model)

    def forward(self, x, causal=True):               # x: (b, seq, d_model)
        b, n, _ = x.shape
        q, k, v = self.qkv(x).view(b, n, 3, self.h, self.dh).permute(2, 0, 3, 1, 4)
        y = attention(q, k, v, causal)               # (b, h, n, dh)
        return self.out(y.transpose(1, 2).reshape(b, n, -1))`,
    lesson: md`The Transformer is the architecture behind Gemini, GPT, Claude, Llama, BERT and most modern vision and speech models. Its core is one operation, **attention**, which lets every token look at every other token and decide what matters.

## The intuition: a soft lookup table

Each token produces three vectors by multiplying its embedding by learned matrices:

- **Query** $Q$: *what am I looking for?*
- **Key** $K$: *what do I contain?*
- **Value** $V$: *what will I hand over if you pick me?*

A token compares its query with every key (a dot product), turns the scores into weights with softmax, and takes the weighted average of the values:

$$
\text{Attention}(Q, K, V) = \text{softmax}\!\left(\frac{Q K^\top}{\sqrt{d_k}}\right) V
$$

Unlike a dictionary, it doesn't return one exact match: it returns a blend, weighted by relevance.

[[widget:attention]]

:::story The example Google used in 2017
In the blog post announcing the Transformer, Google showed the sentence "The animal didn't cross the street because it was too **tired**", where the model's attention from "it" lands on "animal", and the same sentence ending in "too **wide**", where it lands on "street". One word changes what "it" means, and attention captures it, something no single word vector could do.
:::

## Why divide by the square root of the key dimension?

The dot product of two random $d_k$-dimensional vectors has variance proportional to $d_k$. With $d_k = 128$, raw scores get large, softmax becomes nearly one-hot, and its gradients vanish. Dividing by $\sqrt{d_k}$ keeps the scores at unit scale so softmax stays "soft" and trainable.

## Self, cross, and multi-head

- **Self-attention:** $Q$, $K$ and $V$ all come from the same sequence: $Q = XW^Q$, $K = XW^K$, $V = XW^V$.
- **Cross-attention:** queries come from one sequence (the decoder, or an image generator) and keys and values from another (the encoder, or a text prompt). This is how translation models read the source sentence and how diffusion models read your prompt.
- **Multi-head attention:** run $h$ attention operations in parallel on smaller projections and concatenate: $\text{MultiHead} = \text{Concat}(\text{head}_1, \dots, \text{head}_h) W^O$. Different heads specialise (one tracks syntax, another coreference, another position).

Older variants you may hear about: **additive (Bahdanau)** attention scores with a small network, $e_{ij} = v^\top \tanh(W_q q_i + W_k k_j)$; **dot-product (Luong)** uses $q_i^\top k_j$. **Global** attention looks at all positions; **local** attention only at a window, which is cheaper but can miss distant links.

## One Transformer block

\`\`\`text
x → LayerNorm → multi-head self-attention → + x      (residual)
  → LayerNorm → feed-forward MLP (≈4× wider) → + x   (residual)
\`\`\`

Stack 12 to 100+ of these. Attention **mixes information across tokens**; the MLP **processes each token** independently and is where much of the model's knowledge is stored. Residual connections and LayerNorm keep deep stacks trainable.

## Order: positional information

Attention by itself is order-blind: shuffle the words and the outputs shuffle with them. The original paper **added sinusoidal position encodings** to the embeddings; BERT learned them; most modern LLMs use **RoPE** (rotary position embeddings), which rotates queries and keys by an angle that depends on position, so attention scores depend on *relative* distance and context windows can be extended.

## Three families

| Family | Attention | Trained to | Examples | Good for |
|---|---|---|---|---|
| Encoder-only | Bidirectional (sees left and right) | Fill in masked words | BERT | Classification, embeddings, search ranking |
| Decoder-only | **Causal** (sees only the past) | Predict the next token | GPT, Gemini, Claude, Llama | Generation, chat, nearly everything now |
| Encoder-decoder | Encoder bidirectional + decoder causal with cross-attention | Map input to output | T5, original Transformer | Translation, summarisation |

A **causal mask** sets scores for future positions to $-\infty$ before softmax, so a token can't peek at what it is trying to predict. During training this lets the model learn from every position of a sequence at once.

## The cost: quadratic in sequence length

The score matrix is $n \times n$. Doubling the context quadruples attention compute and memory. That is why long context is expensive, and why so much engineering goes into it:

- **KV cache:** during generation, keep the keys and values of past tokens instead of recomputing them; each new token then costs $O(n)$. The cache grows with context × layers × concurrent users and is often the biggest consumer of GPU memory.
- **Multi-query and grouped-query attention** (MQA, GQA): share key/value heads across query heads to shrink that cache several-fold.
- **FlashAttention:** the same exact maths, computed in tiles that stay in fast on-chip memory, never materialising the full $n \times n$ matrix. Big speed-ups because attention is memory-bound.
- **Sparse, sliding-window and linear attention:** approximate attention to cut the $n^2$.

:::dyk
A modern LLM is mostly matrix multiplications. Of the compute in a forward pass, the attention scores are only part; the big feed-forward layers usually dominate at typical context lengths. Training compute is roughly **6 × parameters × tokens** FLOPs, a rule worth remembering for estimates.
:::

:::tip Explaining a Transformer in 60 seconds
"Text becomes tokens, tokens become vectors. Each layer lets every token gather information from the others through attention, weighted by query-key similarity, then transforms each token with an MLP; residuals keep it trainable. A decoder is trained to predict the next token with a causal mask. At inference we generate one token at a time, caching keys and values. Cost grows with the square of context for attention and linearly for the KV cache."
:::`,
    pitfalls: [
      "Forgetting the √d_k scaling and why it exists",
      "Confusing self-attention with cross-attention",
      "Saying Transformers understand order natively (they need positional information)",
      "Ignoring the KV cache when estimating serving memory",
      "Claiming attention is the only expensive part (the MLPs often dominate compute)",
    ],
    quiz: [
      Q("What is the purpose of dividing QKᵀ by √d_k?", ["To normalise the values", "*To keep scores small enough that softmax doesn't saturate and gradients survive", "To make attention causal", "To save memory"], "Without it, dot products grow with dimension and softmax becomes nearly one-hot."),
      Q("In a decoder-only LLM, what does the causal mask do?", ["Hides padding only", "*Prevents each position from attending to future tokens", "Masks random words like BERT", "Removes the KV cache"], "It makes next-token prediction honest and lets training use every position at once."),
      Q("Doubling the context length roughly does what to the attention score matrix?", ["Doubles it", "*Quadruples it", "Leaves it unchanged", "Halves it"], "n × n grows quadratically."),
      Q("Which model family is the usual choice for producing embeddings for search?", ["Decoder-only chat models", "*Encoder (BERT-style) or dedicated embedding models", "GANs", "Diffusion models"], "Bidirectional context gives better representations of a whole passage."),
      Q("What is cross-attention used for in a text-to-image diffusion model?", ["Denoising pixels", "*Letting the image features attend to the text prompt's embeddings", "Upscaling", "Tokenising the prompt"], "Queries come from the image side; keys and values from the text."),
    ],
  }),

  T("ai", "ai-llm-training", "How an LLM is made: pretraining and scaling", 1, 35, "The pipeline from raw text to base model: data, next-token prediction, scaling laws, Chinchilla, compute budgets, and what base models can and can't do.", {
    signals: ["“How is ChatGPT/Gemini trained?”", "Estimating training compute or data needs", "Deciding between a bigger model and more data"],
    prereq: ["ai-transformers", "ai-tokenization"],
    viz: "scaling",
    lesson: md`Every chatbot starts life as a **base model**: a Transformer trained to predict the next token on trillions of tokens of text. Everything that makes it helpful and safe comes after. The full pipeline looks like this:

**data cleaning → tokenisation → architecture (with positional encoding) → pretraining → fine-tuning and instruction tuning → alignment → decoding strategy → inference serving**

## Step 1: data, and lots of it

Sources: web crawls (Common Crawl), books, Wikipedia, code (GitHub), scientific papers, forums, and increasingly synthetic data generated by other models. Most of the work is **cleaning**: deduplication (near-duplicates waste compute and cause memorisation), quality filtering (often with a small classifier trained to recognise "good" text), removing personal data and toxic content, language identification, and mixing domains in the right proportions.

:::dyk
Modern frontier models train on **10 to 30+ trillion tokens**. Llama 3 used about 15 trillion. At about 0.75 words per token, that is like reading the entire English Wikipedia a few thousand times over.
:::

## Step 2: next-token prediction

The objective is almost embarrassingly simple: for each position, maximise the probability of the actual next token, which means minimising cross-entropy summed over every position of every sequence. It is **self-supervised**: the labels are the text itself. To predict text well, the model has to learn grammar, facts, style, some reasoning, code, and a model of what kind of person would write this.

## Step 3: scaling laws

In 2020, Kaplan et al. at OpenAI showed loss falls as a smooth **power law** in parameters, data and compute: predictable gains from scale. Compute is roughly

$$
C \approx 6 N D
$$

FLOPs for $N$ parameters and $D$ training tokens (about 2 for the forward pass and 4 for the backward pass, per parameter per token).

In 2022 DeepMind's **Chinchilla** paper asked: for a fixed compute budget, how should you split it between model size and data? The answer: scale them **together**, about **20 tokens per parameter**. Their 70B Chinchilla, trained on 1.4T tokens, beat the 280B Gopher trained with the same compute on 300B tokens. Many earlier giants, GPT-3 included, were undertrained.

[[widget:scaling]]

:::news Over-training on purpose
Chinchilla-optimal minimises *training* cost. But a popular model is trained once and served billions of times, so labs now "over-train" small models far past 20 tokens per parameter (Llama 3 8B saw about 1,900 per parameter). A smaller model that's almost as good is much cheaper to serve. Inference economics, not just training economics, decide model size.
:::

## Emergent abilities?

Some abilities (multi-step arithmetic, following instructions in a few examples) seemed to appear suddenly at a certain scale. Later work argued part of that suddenness comes from the choice of metric: exact-match accuracy jumps from 0 to 1 even if the underlying probability improves smoothly. Both views are useful: capabilities do grow with scale, and how you measure determines whether growth looks smooth or sudden.

## What a base model is (and isn't)

A base model **continues text**. Ask it "What is the capital of France?" and it might answer, or it might continue with "What is the capital of Germany?" because a list of quiz questions is plausible text. It has no notion of being an assistant. **Instruction tuning and alignment** (the next topics) turn it into one.

:::story The $100 million question
Training frontier models is now a nine- or ten-figure undertaking: tens of thousands of accelerators running for months, where a single hardware failure every few hours is normal. Google trains Gemini on **TPU pods**, its own accelerators connected by custom high-speed interconnects. Much of the engineering is distributed systems: data, tensor and pipeline parallelism, checkpointing, and recovering from failures without losing days of work.
:::

## Limits that come from pretraining

- **Knowledge cutoff:** the model knows nothing after its data was collected.
- **Hallucination:** it learned to produce *plausible* text; plausible and true usually coincide, but not always.
- **No private data:** it never saw your company's documents.
- **Memorisation:** rare sequences seen many times (licences, famous texts, sometimes personal data) can be reproduced verbatim.

Retrieval (RAG), tools, fine-tuning and evaluation exist to work around exactly these limits.

:::tip Explaining it at an interview whiteboard
Draw three boxes: **pretraining** (next-token prediction on trillions of tokens; produces knowledge and fluency), **post-training** (instruction tuning plus preference optimisation; produces helpfulness and safety), **inference** (decoding, retrieval, tools; produces the product). Most product engineering happens in the third box.
:::`,
    pitfalls: [
      "Describing pretraining as “learning from labelled Q&A” (it's self-supervised next-token prediction)",
      "Assuming bigger is always better regardless of data (Chinchilla)",
      "Forgetting inference cost when choosing model size",
      "Treating a base model as if it were an instruction-following assistant",
    ],
    quiz: [
      Q("Roughly how much compute does training a model with N parameters on D tokens take?", ["N × D FLOPs", "*About 6 × N × D FLOPs", "N² × D FLOPs", "D / N FLOPs"], "≈2ND for the forward pass and ≈4ND for the backward pass."),
      Q("What did the Chinchilla paper find?", ["Models should be as big as possible", "*For a fixed compute budget, scale parameters and tokens together (~20 tokens per parameter)", "Data quality doesn't matter", "RLHF beats pretraining"], "Many large models were undertrained for their size."),
      Q("Why would a lab train an 8B model on 15T tokens, far past Chinchilla-optimal?", ["Mistake", "*A smaller, longer-trained model is cheaper to serve at scale", "Tokens are free", "To reduce hallucination to zero"], "Serving cost is paid on every request."),
      Q("A base model asked “What is the capital of France?” might reply with another question. Why?", ["It is broken", "*It continues plausible text; it hasn't been instruction-tuned to act as an assistant", "Temperature is zero", "Its context window is too small"], "Post-training teaches it to answer."),
    ],
  }),
];
