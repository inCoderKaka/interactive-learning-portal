import type { Drill } from "@/lib/types";
import { blank, bug, guess, match, odd, order, pick, tf } from "@/lib/drills";

/** Quick-play drills for the AI area, keyed by topic id. */
export const aiDrills: Record<string, Drill[]> = {
  "ai-history": [
    order("Put these AI milestones in order.", ["Turing's \"Computing Machinery and Intelligence\"", "The Dartmouth workshop", "Minsky and Papert's Perceptrons", "AlexNet wins ImageNet", "\"Attention Is All You Need\"", "ChatGPT launches"], "1950, 1956, 1969, 2012, 2017, 2022."),
    guess("In what year was the Dartmouth summer workshop, usually called the birth of AI as a field?", { min: 1900, max: 2020, answer: 1956, tol: 3 }, "1956, organised by McCarthy, Minsky, Rochester and Shannon. The 1955 proposal coined \"artificial intelligence\"."),
    tf("Deep Blue beat Kasparov in 1997 using deep neural networks.", false, "It used massive parallel search with a hand-tuned evaluation function. Neural nets ruled games only from AlphaGo (2016)."),
    match("Match the system to what made it famous.", [["ELIZA (1966)", "Pattern-matching chatbot"], ["Deep Blue (1997)", "Chess by brute-force search"], ["AlphaGo (2016)", "Policy and value networks plus tree search"], ["AlphaFold 2 (2020)", "Protein structure prediction"]]),
    pick("About how long did ChatGPT take to reach 100 million users?", ["Two years", "Six months", "*About two months", "One week"], "A widely cited UBS estimate (January 2023): then the fastest-growing consumer app on record."),
  ],
  "ai-ml-basics": [
    match("Match the task type to its goal.", [["Classification", "Predict a category"], ["Regression", "Predict a number"], ["Clustering", "Group unlabelled data"], ["Reinforcement learning", "Learn actions from rewards"]]),
    tf("Use the test set's score to tune your hyperparameters.", false, "Tune on validation (or cross-validation). Touch the test set once, at the end, or its score stops being honest."),
    pick("Features on wildly different scales slow gradient descent. Fix?", ["*Standardise or normalise the features", "Use a larger learning rate", "Drop the large features", "Add more layers"], "Comparable scales give a rounder loss surface, so one learning rate suits every direction."),
    blank("Data leakage happens when information from the ___ sneaks into training.", ["*test set or the future", "GPU", "loss function", "optimiser"], "Classic leaks: scaling with full-data statistics, random splits on time series, target-derived features."),
    odd("Which is NOT a regularisation technique?", ["L2 weight decay", "Dropout", "Early stopping", "*Raising the learning rate"], "Regularisers limit effective capacity; the learning rate controls step size."),
  ],
  "ai-classic-models": [
    match("Match the model to its core idea.", [["Linear regression", "Fit a line by minimising squared error"], ["Logistic regression", "Sigmoid of a linear score"], ["Decision tree", "Nested if-else splits on features"], ["k-means", "Cluster around nearest centroids"], ["PCA", "Project onto directions of maximum variance"]]),
    tf("Logistic regression is a classification model, despite its name.", true, "It regresses the log-odds, then thresholds the probability."),
    pick("Which model needs feature scaling the least?", ["k-NN", "SVM with an RBF kernel", "*Random forest", "L2-regularised logistic regression"], "Tree splits compare a feature with a threshold, so scale doesn't matter."),
    odd("Which one learns without labels?", ["Random forest", "SVM", "Logistic regression", "*k-means"], "k-means is unsupervised; the others need labelled examples."),
    blank("Gradient boosting fits each new tree to the ___ of the current ensemble.", ["*residuals (negative gradients)", "raw inputs", "labels only", "random noise"], "Each tree corrects what the ensemble still gets wrong."),
  ],
  "ai-metrics": [
    guess("Precision is 0.5 and recall is 1.0. What is F1?", { min: 0, max: 1, answer: 0.667, tol: 0.03 }, "2PR / (P + R) = 1 / 1.5 ≈ 0.67. The arithmetic mean would say 0.75: the harmonic mean punishes the weak side."),
    match("Match the confusion-matrix cell to its meaning.", [["True positive", "Said yes, and it was yes"], ["False positive", "Said yes, but it was no"], ["False negative", "Said no, but it was yes"], ["True negative", "Said no, and it was no"]]),
    tf("A model that always predicts \"not fraud\" scores 99.9% accuracy when 0.1% of transactions are fraud.", true, "And catches zero fraud. That's the accuracy trap."),
    pick("Cancer screening, where a missed case is the worst outcome. Optimise for…", ["Precision", "*Recall", "Accuracy", "Specificity"], "Catch nearly every true case, then confirm with follow-up tests."),
    blank("With very rare positives, look at the ___ curve, not just ROC, to see the false-alarm pain.", ["*precision-recall", "learning", "loss", "calibration"], "ROC's false-positive rate stays tiny even when false alarms swamp true hits."),
  ],
  "ai-neural-nets": [
    match("Match the activation to its output.", [["ReLU", "max(0, x)"], ["Sigmoid", "Squashed into (0, 1)"], ["Tanh", "Squashed into (−1, 1)"], ["Softmax", "Probabilities that sum to 1"]]),
    order("Order one training step.", ["Forward pass", "Compute the loss", "Backward pass (gradients)", "Optimiser updates the weights"]),
    tf("A deep network with no non-linear activations is equivalent to a single linear layer.", true, "A product of matrices is a matrix: depth buys nothing without non-linearity."),
    guess("A dense layer maps 784 inputs to 128 outputs, with biases. How many parameters?", { min: 1000, max: 1e7, answer: 100480, tol: 0.1, log: true }, "784 × 128 + 128 = 100,480."),
    pick("A too-high learning rate usually shows up as…", ["*Loss oscillating or blowing up to NaN", "Loss falling very slowly", "Perfect training accuracy", "No change at all"], "Steps overshoot the minimum. Too low shows as painfully slow progress."),
  ],
  "ai-pytorch": [
    bug("A PyTorch training loop. Which line is wrong?", `
for x, y in loader:
    logits = model(x)
    loss = F.cross_entropy(logits.softmax(-1), y)
    opt.zero_grad()
    loss.backward()
    opt.step()`, 3, "cross_entropy applies log-softmax itself. Pass the raw logits."),
    match("Match the call to what it does.", [["tensor.to(\"cuda\")", "Move it to the GPU"], ["model.eval()", "Dropout off, running batch-norm stats"], ["torch.no_grad()", "Don't record the autograd graph"], ["loss.backward()", "Accumulate gradients into .grad"]]),
    tf("x.view(...) works on any tensor, contiguous or not.", false, "view needs a compatible memory layout (often after a transpose it fails). reshape copies when it must."),
    pick("What shape does (32, 64) @ (64, 10) produce?", ["(64, 64)", "*(32, 10)", "(10, 32)", "It fails"], "Inner dimensions match and disappear: (batch, features) @ (features, classes)."),
    odd("Which does NOT reduce GPU memory during training?", ["Mixed precision", "Gradient checkpointing", "A smaller batch", "*Calling model.train()"], "model.train() only switches dropout and batch-norm behaviour."),
  ],
  "ai-cnn": [
    guess("Input 64×64, kernel 3×3, padding 1, stride 2. Output width?", { min: 1, max: 64, answer: 32, tol: 0.5 }, "⌊(64 − 3 + 2) / 2⌋ + 1 = 32."),
    pick("Parameters in a 3×3 convolution from 3 to 16 channels, with bias?", ["144", "160", "432", "*448"], "3 × 3 × 3 × 16 = 432 weights, plus 16 biases."),
    tf("Max-pooling layers have learnable weights.", false, "Pooling is a fixed operation: no parameters."),
    match("Match the network to its contribution.", [["LeNet", "Early CNN for digit recognition"], ["AlexNet", "GPUs and ReLU won ImageNet 2012"], ["VGG", "Deep stacks of 3×3 convolutions"], ["ResNet", "Skip connections, 152 layers"], ["Inception", "Parallel 1×1, 3×3 and 5×5 branches"]]),
    blank("Data augmentation (flips, crops, colour jitter) mainly reduces ___.", ["*overfitting", "inference latency", "parameter count", "batch size"], "The model sees more varied examples of the same labels."),
  ],
  "ai-rnn": [
    match("Match the recurrent model to its structure.", [["Vanilla RNN", "One hidden state through tanh"], ["LSTM", "Cell state plus three gates"], ["GRU", "Two gates, merged state"], ["Bidirectional RNN", "Reads forwards and backwards"]]),
    tf("An RNN processes a sequence step by step, so training can't parallelise across time.", true, "Step t needs step t − 1. Transformers removed that bottleneck."),
    pick("Gradients explode while training an RNN. Standard fix?", ["*Gradient clipping", "More dropout", "A bigger batch", "Removing the hidden state"], "Clip the gradient norm to a maximum before each update."),
    blank("Teacher forcing feeds the decoder the ___ previous token during training.", ["*true", "predicted", "random", "masked"], "Faster, more stable training; at inference the model must consume its own predictions."),
    odd("Which is NOT an LSTM gate?", ["Forget", "Input", "Output", "*Reset"], "Reset and update are the GRU's gates."),
  ],
  "ai-embeddings": [
    guess("Cosine similarity of two vectors at 90° to each other?", { min: -1, max: 1, answer: 0, tol: 0.05 }, "cos 90° = 0: unrelated directions. 1 is identical direction, −1 opposite."),
    match("Match the method to what it produces.", [["word2vec", "Static word vectors from predicting context"], ["GloVe", "Vectors from global co-occurrence counts"], ["BERT", "Contextual vectors, one per token"], ["Sentence embedding model", "One vector per passage, for search"]]),
    tf("\"king − man + woman ≈ queen\" is the famous word2vec analogy.", true, "Directions in the space capture relations such as gender."),
    pick("Embeddings from model A and model B in one index. What happens?", ["Nothing; vectors are universal", "*They aren't comparable: re-embed everything with one model", "Average them", "Only cosine works across models"], "Each model has its own space; distances across spaces are meaningless."),
    blank("Matryoshka-trained embeddings let you ___ vectors to fewer dimensions with modest quality loss.", ["*truncate", "rotate", "invert", "square"], "The most important information is packed into the leading dimensions."),
  ],
  "ai-tokenization": [
    guess("About how many tokens is a 1,500-word English essay?", { min: 100, max: 20000, answer: 2000, tol: 0.3, log: true }, "About 4/3 tokens per word: roughly 2,000."),
    order("Order how byte-pair encoding builds its vocabulary.", ["Start from characters (or bytes)", "Count every adjacent pair", "Merge the most frequent pair into a new token", "Repeat until the vocabulary reaches its target size"]),
    tf("The same sentence can cost a different number of tokens on different models.", true, "Each model family has its own tokeniser and vocabulary."),
    pick("Why can \" Hello\" and \"Hello\" be different tokens?", ["*Leading spaces are usually part of the token", "Case sensitivity", "A tokeniser bug", "They're always the same"], "Prompt formatting changes tokenisation, which is one reason trailing spaces matter."),
    odd("Which is NOT a subword tokeniser?", ["BPE", "WordPiece", "SentencePiece (unigram)", "*TF-IDF"], "TF-IDF is a weighting scheme for retrieval."),
  ],
  "ai-transformers": [
    order("Order the steps of scaled dot-product attention in a decoder.", ["Project the inputs to Q, K and V", "Score = Q·Kᵀ / √d_k", "Apply the causal mask", "Softmax each row", "Take the weighted sum of V"]),
    guess("How many parameters does GPT-3 have?", { min: 1e8, max: 1e13, answer: 1.75e11, tol: 0.3, log: true }, "175 billion (2020)."),
    tf("Without positional information, attention treats \"dog bites man\" and \"man bites dog\" the same.", true, "Attention mixes a set of tokens; position embeddings or RoPE supply the order."),
    match("Match the architecture to an example.", [["Encoder-only", "BERT"], ["Decoder-only", "GPT, Gemini, Llama"], ["Encoder-decoder", "T5"], ["Vision Transformer", "ViT"]]),
    pick("Grouped-query attention mainly saves…", ["*KV-cache memory", "Training data", "Vocabulary size", "Positional encodings"], "Several query heads share each key/value head."),
  ],
  "ai-llm-training": [
    guess("Chinchilla-optimal training tokens for a 70B-parameter model?", { min: 1e9, max: 1e15, answer: 1.4e12, tol: 0.3, log: true }, "About 20 tokens per parameter: 1.4 trillion, which is how Chinchilla itself was trained."),
    guess("Training compute for 7B parameters on 2T tokens (C ≈ 6ND)?", { min: 1e18, max: 1e27, answer: 8.4e22, tol: 0.5, log: true, unit: "FLOPs" }, "6 × 7·10⁹ × 2·10¹² ≈ 8.4·10²² FLOPs."),
    order("Order the life of a chat model.", ["Pretraining on web-scale text", "Supervised fine-tuning on instructions", "Preference tuning (RLHF or DPO)", "Evaluation and red-teaming", "Deployment"]),
    tf("Pretraining labels come from people annotating each sentence.", false, "It's self-supervised: the next token in the text is the label."),
    pick("Why deduplicate pretraining data?", ["*Less memorisation and less wasted compute", "To shrink the vocabulary", "To speed up inference", "It's required by law"], "Repeated text is memorised verbatim and teaches nothing new."),
  ],
  "ai-alignment": [
    match("Match the method to what it does.", [["SFT", "Imitate good demonstrations"], ["Reward model", "Predicts which answer people prefer"], ["PPO-based RLHF", "RL against the reward, with a KL leash"], ["DPO", "A direct loss on preference pairs"], ["Constitutional AI", "AI feedback guided by written principles"]]),
    tf("RLHF teaches a model new facts.", false, "It shapes behaviour (helpfulness, format, refusals); knowledge comes from pretraining."),
    guess("A reward model scores answer A at 1.0 and B at 0.0. Bradley-Terry P(A preferred)?", { min: 0, max: 1, answer: 0.731, tol: 0.04 }, "σ(1) ≈ 0.73. Only the difference in scores matters."),
    pick("Which is a classic example of reward hacking?", ["*Long, flattering answers scoring high without being better", "The model refusing everything", "Training diverging to NaN", "Running out of GPU memory"], "The policy optimises the reward model's blind spots."),
    blank("Sycophancy arises partly because human raters tend to ___ agreement.", ["*reward", "punish", "ignore", "never see"], "Preference data rewards answers people like, not always answers that are right."),
  ],
  "ai-reasoning": [
    match("Match the technique to its idea.", [["Chain-of-thought", "Reason step by step in text"], ["Self-consistency", "Sample many paths, vote"], ["Tree of thoughts", "Search over partial reasoning paths"], ["Verifier", "A model or test that checks answers"]]),
    tf("Chain-of-thought helps most on multi-step problems such as maths word problems.", true, "Little benefit on simple lookups; real gains when intermediate steps matter."),
    pick("The main cost of a reasoning model's long thinking?", ["*Latency and output-token cost", "Lower accuracy", "Shorter context window", "Training time"], "Thinking tokens are generated one at a time and billed as output."),
    odd("Which is NOT test-time compute?", ["Longer reasoning", "Best-of-n sampling", "Verify and retry", "*Pretraining on more data"], "Pretraining happens before deployment; test-time compute is spent per query."),
    blank("RL with ___ rewards (unit tests, exact maths answers) drove the 2024–25 jump in reasoning models.", ["*verifiable", "human-only", "random", "click-based"], "Cheap, automatic and hard to fool."),
  ],
  "ai-fine-tuning": [
    match("Match the need to the tool.", [["Facts change every week", "RAG"], ["Consistent output style at scale", "Fine-tuning"], ["One-off task with a few examples", "Few-shot prompting"], ["Cheap small model copying a big one", "Distillation"]]),
    guess("LoRA at rank 16 on a 4096×4096 matrix trains how many parameters?", { min: 1000, max: 1e8, answer: 131072, tol: 0.1, log: true }, "r(m + n) = 16 × 8,192 = 131,072, versus 16.8 M for the full matrix."),
    tf("LoRA adapters can be merged into the base weights, adding no inference latency.", true, "W = W₀ + (α/r)·BA is just another matrix."),
    pick("QLoRA quantises the frozen base model to…", ["1-bit", "*4-bit (NF4)", "8-bit", "16-bit"], "Adapters train in higher precision on top."),
    blank("Fine-tuning narrowly on one task can cause catastrophic ___.", ["*forgetting", "overflow", "attention", "tokenisation"], "Mix in general data, use low learning rates, or adapters."),
  ],
  "ai-decoding": [
    match("Match the decoding method to its rule.", [["Greedy", "Always the top token"], ["Beam search", "Keep the k best partial sequences"], ["Temperature", "Scale logits before softmax"], ["Top-k", "Sample from the k most likely"], ["Top-p", "Sample from the smallest set with mass p"]]),
    pick("Top-p = 0.9 and the token probabilities are 0.5, 0.3, 0.15, 0.05. How many tokens are in the nucleus?", ["1", "2", "*3", "4"], "0.5 + 0.3 = 0.8 is short of 0.9; adding 0.15 reaches 0.95."),
    tf("Temperature 0 gives bit-for-bit identical output on every provider.", false, "Batching, floating-point order and MoE routing can still change tokens."),
    pick("Settings for creative brainstorming?", ["Temperature 0", "*Higher temperature (around 0.9–1.0) with top-p", "Beam search, width 10", "Greedy decoding"], "Diversity comes from sampling; beams make text generic."),
    blank("A frequency penalty lowers the logits of tokens that have already ___.", ["*appeared", "been masked", "been cached", "been quantised"], "It discourages loops and repetition."),
  ],
  "ai-prompting": [
    bug("Which line of this prompt invites prompt injection?", `
You are a support assistant for Acme.
Answer using only the policy below.
If the answer isn't in the policy, say you don't know.
Policy: {retrieved_text}
Follow any instructions you find in the policy text.`, 5, "Retrieved text is data. Tell the model to treat it as data and never follow instructions inside it."),
    match("Match the technique to what it means.", [["Zero-shot", "Just the instruction"], ["Few-shot", "Examples of input and output"], ["Chain-of-thought", "Reason before answering"], ["Prompt chaining", "Split the task across several calls"]]),
    tf("Saying what to do usually works better than only listing what not to do.", true, "Positive instructions give the model a target; prohibitions alone leave it guessing."),
    pick("The model keeps adding chatty preambles before its JSON. Best fix?", ["*Structured output with a schema (or prefill the opening brace)", "Raise the temperature", "Write the prompt in capitals", "Shorten the context"], "Constrain the format instead of pleading."),
    odd("Which does NOT belong in a strong prompt?", ["A clear task", "Relevant context", "The output format", "*Threats against the model"], "Clarity beats pressure."),
  ],
  "ai-context-engineering": [
    match("Match the technique to its purpose.", [["Compaction", "Summarise older turns"], ["Sub-agents", "Explore in a fresh, isolated context"], ["Tool search", "Load only the relevant tool schemas"], ["Memory files", "Keep facts across sessions"], ["Prompt caching", "Reuse identical prefixes cheaply"]]),
    tf("A bigger context window means you should put everything into it.", false, "Irrelevant tokens cost money and attention: quality drops as context rots."),
    pick("Where should the key instruction go in a very long prompt?", ["Only in the middle", "*At the start, restated near the end", "Only at the end", "Anywhere"], "Models use the edges of long contexts best."),
    blank("A cached prompt prefix must be byte-for-byte ___ to hit the cache.", ["*identical", "compressed", "encrypted", "shorter"], "A timestamp at the top of the prompt breaks caching for everything after it."),
    odd("Which does NOT shrink an agent's context?", ["Compaction", "Sub-agents", "Trimming old tool outputs", "*Loading every tool schema up front"], "Every schema costs tokens on every turn and makes tool choice harder."),
  ],
  "ai-rag": [
    order("Order a basic RAG pipeline.", ["Load the documents", "Chunk them", "Embed the chunks", "Index the vectors", "Retrieve the top-k for a query", "Generate an answer with citations"], "The first four run offline; the last two run per query."),
    bug("A chunker with overlap. Which line is wrong?", `
def chunk(text, size=500, overlap=100):
    out, i = [], 0
    while i < len(text):
        out.append(text[i:i + size])
        i += overlap
    return out`, 5, "Advance by size − overlap. Stepping by the overlap makes five times as many chunks, mostly duplicates."),
    pick("A document ranks 1st in BM25 and 3rd in vector search. Its RRF score (k = 60)?", ["*About 0.032", "4", "About 0.5", "About 1.33"], "1/61 + 1/63 ≈ 0.0164 + 0.0159."),
    tf("Bigger chunks always improve RAG answers.", false, "They dilute embeddings and waste context. Tune size on your own evals."),
    match("Match the failure to its fix.", [["Exact part codes missed", "Hybrid search with BM25"], ["Relevant passage ranked 40th", "Add a reranker"], ["Answers cite docs the user can't see", "Filter by permissions at retrieval"], ["Right passage found, answer wrong", "Better grounding prompt or a stronger model"]]),
  ],
  "ai-vector-search": [
    match("Match the index to its trait.", [["Flat (brute force)", "Exact, O(N) per query"], ["HNSW", "Layered graph: fast, memory-hungry"], ["IVF", "Search only the nearest clusters"], ["Product quantisation", "Compress vectors into short codes"]]),
    guess("Memory for 1 M vectors of 1,536 float32 dimensions?", { min: 0.01, max: 1000, answer: 6.1, tol: 0.3, log: true, unit: "GB" }, "10⁶ × 1,536 × 4 bytes ≈ 6.1 GB, before index overhead."),
    tf("Raising HNSW's efSearch usually raises both recall and latency.", true, "A wider beam explores more of the graph."),
    pick("A metadata filter matches 0.1% of documents. The risk with post-filtering ANN results?", ["*Too few (or zero) results survive the filter", "Results are exact but slow", "The index corrupts", "Embeddings change"], "Use filtered search support, partitions, or pre-filtering with care."),
    blank("An ANN index's recall@10 is measured against ___ results.", ["*exact brute-force", "BM25", "random", "cached"], "Run exact search on a sample of queries and compare."),
  ],
  "ai-kg-rag-case": [
    tf("In the ContractNLI case study, the agentic KG-RAG system had the best accuracy.", false, "Plain TF-IDF RAG did (0.76). The agent had the best macro F1 (0.537), thanks to the one contradiction it caught."),
    guess("About how many seconds per example did the KG-RAG agent take?", { min: 1, max: 2000, answer: 209, tol: 0.3, log: true, unit: "s" }, "About 209 s, versus 4.7 s for TF-IDF RAG: up to ~25 sequential LLM calls."),
    match("Match the system to its result.", [["B1 zero-shot", "Fastest: 0.6 s per example"], ["B2 zero-shot CoT", "22× slower for almost no gain"], ["B3 TF-IDF RAG", "Best accuracy: 0.76"], ["S4 agentic KG-RAG", "The only non-zero contradiction F1: 0.40"]]),
    pick("What did the baselines' accuracy hide?", ["*0.00 F1 on the contradiction class", "Slow latency", "Too many contradictions found", "A data leak"], "Only 3 of the 50 examples were contradictions, so ignoring them barely dented accuracy."),
  ],
  "ai-agents": [
    order("Order a tool call.", ["Define tools with JSON schemas", "Send them with the request", "The model returns a tool call", "Your code validates and runs it", "Send the result back; the model continues"]),
    match("Match the workflow pattern to its shape.", [["Prompt chaining", "A fixed sequence of calls"], ["Routing", "Classify, then hand to a specialist"], ["Parallelisation", "Independent calls at once, then combine"], ["Orchestrator-workers", "A lead splits work dynamically"], ["Evaluator-optimiser", "Generate, critique, revise"]]),
    tf("Start with a full agent and simplify later.", false, "Start with the simplest thing that works: one call, then a workflow, and an agent only if needed."),
    pick("An agent keeps re-reading the same file forever. First guardrail?", ["*Step and budget limits, plus repeated-state detection", "A bigger model", "Higher temperature", "More tools"], "Bound every loop; detect when nothing changes."),
    odd("Which is NOT part of the \"lethal trifecta\"?", ["Access to private data", "Exposure to untrusted content", "Ability to communicate externally", "*A large context window"], "Remove any one of the three legs and injected text can't exfiltrate data."),
  ],
  "ai-mcp": [
    order("Order the start of an MCP session.", ["Client sends initialize with its capabilities", "Server replies with its capabilities", "Client sends the initialized notification", "Client lists the tools", "The model calls a tool via tools/call"]),
    match("Match the MCP role to its job.", [["Host", "The AI app the user runs"], ["Client", "One connection per server, inside the host"], ["Server", "Exposes tools, resources and prompts"], ["Transport", "stdio or Streamable HTTP"]]),
    tf("MCP servers can only run on your own machine.", false, "Local servers use stdio; remote servers use Streamable HTTP with authorisation."),
    pick("Who decides when a resource is attached to the context?", ["The model, on its own", "*The host app or the user", "The server", "Nobody: all resources are always attached"], "Tools are model-invoked; resources are application-controlled; prompts are user-chosen."),
    blank("MCP messages are ___ 2.0 requests, responses and notifications.", ["*JSON-RPC", "gRPC", "SOAP", "GraphQL"], "Each message has a method, params and an id (notifications have no id)."),
  ],
  "ai-multimodal": [
    guess("How many patch tokens does a 336×336 image make with 14×14 patches?", { min: 0, max: 2000, answer: 576, tol: 10 }, "(336 / 14)² = 24² = 576."),
    tf("CLIP can classify images into labels it was never explicitly trained on.", true, "Compare the image with text embeddings of \"a photo of a {label}\"."),
    match("Match the model to its role.", [["CLIP", "Shared image-text embedding space"], ["ViT", "Image patches as tokens"], ["Whisper", "Speech recognition"], ["VLM with a projector", "Vision encoder feeding an LLM"]]),
    pick("A screenshot an agent reads contains \"ignore previous instructions\". The risk?", ["*Prompt injection through the image", "Lower image quality", "A copyright issue only", "None: images can't carry text"], "Text in images is read like any other input."),
    blank("Speech-to-speech models cut latency by skipping the separate ___ and TTS stages.", ["*speech-to-text", "tokeniser", "GPU", "retrieval"], "One model hears and speaks, and can be interrupted naturally."),
  ],
  "ai-generative-images": [
    match("Match the generator to how it works.", [["GAN", "Generator against a discriminator"], ["VAE", "Encode to a latent distribution, decode"], ["Diffusion", "Learn to remove noise step by step"], ["Latent diffusion", "Diffusion in a compressed latent space"]]),
    tf("A diffusion model generates an image in a single forward pass by default.", false, "It denoises over many steps (often 20–50); distilled models cut that to a few."),
    guess("Stable Diffusion's 64×64×4 latent for a 512×512 RGB image holds how many times fewer values?", { min: 1, max: 200, answer: 48, tol: 4 }, "512 × 512 × 3 = 786,432 values versus 16,384: 48×."),
    pick("Images follow the prompt too literally, with oversaturated colours. Turn down…", ["The number of steps", "*The classifier-free guidance scale", "The resolution", "The seed"], "High guidance trades diversity and natural colour for prompt adherence."),
    blank("SynthID embeds an invisible ___ in AI-generated images.", ["*watermark", "caption", "QR code", "border"], "Designed to survive cropping, compression and filters."),
  ],
  "ai-inference": [
    guess("FP16 weights for a 70B-parameter model need about…", { min: 1, max: 2000, answer: 140, tol: 0.2, log: true, unit: "GB" }, "70·10⁹ × 2 bytes = 140 GB, before the KV cache."),
    match("Match the term to its meaning.", [["Prefill", "Process the prompt in parallel; sets time to first token"], ["Decode", "One token at a time; memory-bound"], ["Continuous batching", "Requests join and leave at every step"], ["PagedAttention", "KV cache in pages, little fragmentation"], ["Speculative decoding", "A small model drafts, the big one verifies"]]),
    tf("INT8 weights take half the memory of FP16 weights.", true, "1 byte per parameter versus 2. INT4 halves it again."),
    pick("Time to first token is driven mostly by…", ["*Prompt length (prefill) and queueing", "Output length", "Temperature", "Vocabulary size"], "Output length drives total time, not the first token."),
    odd("Which does NOT reduce KV-cache memory?", ["Grouped-query attention", "Quantising the KV cache", "Shorter contexts", "*A larger batch of concurrent users"], "More concurrent sessions mean more KV cache, not less."),
  ],
  "ai-evals": [
    order("Order the grading methods from cheapest to most expensive.", ["Code checks (exact match, schema, tests)", "Reference metrics", "LLM-as-judge", "Human review"]),
    tf("One run of an agent on a task is enough to know its success rate.", false, "Agents are stochastic: run several trials and report pass rates."),
    match("Match the LLM-judge issue to what it means.", [["Position bias", "Favours the answer in a given slot"], ["Verbosity bias", "Favours longer answers"], ["Self-preference", "Favours its own model's style"], ["Mitigation", "Swap orders, use rubrics, check against humans"]]),
    pick("A good size for a first golden set?", ["5 hand-picked cases", "*About 50–200 realistic cases, including past failures", "Exactly 1,000", "The whole production log"], "Big enough to catch regressions, small enough to label carefully."),
    blank("Test items leaking into training data inflate scores through ___.", ["*contamination", "regularisation", "distillation", "quantisation"], "Use fresh, private or held-out sets, and check for overlap with training data."),
  ],
  "ai-safety": [
    bug("An email agent's tool list. Which line is most dangerous?", `
tools = [
    search_web(),
    read_inbox(),
    send_email(to="*", approval=False),
    read_calendar(),
]`, 4, "Untrusted email plus unrestricted, unapproved sending is an exfiltration channel. Restrict recipients and require approval."),
    match("Match the threat to its description.", [["Jailbreak", "The user tries to bypass the rules"], ["Indirect injection", "Instructions hidden in content the model reads"], ["Data exfiltration", "Secrets leaked via tool calls or links"], ["Hallucination", "Confident, false output"]]),
    tf("A well-written system prompt reliably stops prompt injection.", false, "Instructions and data are all tokens. Limit what a compromised model can do."),
    pick("An agent wants to wire money because of an email it read. The control?", ["*Human approval before the action", "A longer system prompt", "Higher temperature", "A bigger model"], "Side effects with real cost need a human in the loop."),
    odd("Which does NOT reduce hallucinations?", ["Grounding with citations", "An \"I don't know\" path", "Tools for facts and maths", "*Raising the temperature"], "More randomness means more invention."),
  ],
  "ai-system-design": [
    order("Order an AI system-design answer.", ["Clarify the user's job, success metric and failure cost", "Choose the simplest shape: one call, a workflow or an agent", "Design data and retrieval, with permissions", "Add offline and online evals", "Plan cost, latency, fallbacks and monitoring"]),
    guess("10 M requests a day × 2,000 tokens each, at $1 per million tokens. Daily cost?", { min: 10, max: 1e7, answer: 20000, tol: 0.3, log: true, unit: "$" }, "2·10¹⁰ tokens = 20,000 million → $20,000 a day. Caching and smaller models are worth real money."),
    tf("Semantic caching is safe as long as the similarity threshold is high.", false, "Permissions, freshness and near-miss questions still matter: put access scope in the key."),
    match("Match the component to its job.", [["Model gateway", "Routing, fallbacks, token accounting"], ["Router", "Cheap model first, escalate hard cases"], ["Guardrails", "Validate inputs and outputs"], ["Eval harness", "Catch regressions before release"]]),
    pick("A provider outage takes down your chatbot. Best fallback?", ["*The gateway fails over to another model with a tested prompt", "Show an error until it's back", "Retry forever", "Switch to a random model untested"], "Fallback models need their own evals; prompts don't transfer perfectly."),
  ],
  "ai-at-google": [
    match("Match the Google work to what it is.", [["Transformer (2017)", "Attention-only architecture"], ["BERT (2018)", "Bidirectional encoder pretraining"], ["TPU", "Custom accelerator for neural networks"], ["AlphaFold", "Protein structure prediction"], ["Gemini", "Multimodal model family"]]),
    tf("word2vec was developed at Google.", true, "Mikolov and colleagues, 2013."),
    guess("How many predicted protein structures did the AlphaFold database hold after its 2022 expansion?", { min: 1e5, max: 1e10, answer: 2e8, tol: 0.3, log: true }, "Over 200 million: nearly every catalogued protein."),
    pick("Which Google feature runs a small, fast model under about 100 ms per suggestion?", ["*Gmail Smart Compose", "Google Translate batch jobs", "YouTube recommendations training", "Search indexing"], "Latency, not model size, drove its design."),
    blank("AlphaEvolve multiplied 4×4 complex matrices using ___ scalar multiplications.", ["*48", "49", "64", "32"], "One fewer than recursive Strassen's 49, a first in over 50 years for this case."),
  ],
};
