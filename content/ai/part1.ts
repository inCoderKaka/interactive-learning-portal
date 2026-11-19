import { Q, T } from "../h";
import type { Topic } from "@/lib/types";
import { md } from "./md";

export const aiTopics1: Topic[] = [
  T("ai", "ai-history", "A short, wild history of AI", 2, 20, "Seventy-five years of hype, winters, bar-room inventions, $44M auctions and Nobel prizes. The context every interviewer assumes you have.", {
    signals: ["An interviewer asks “why now?” about LLMs", "You need a story for why scale and data beat clever tricks", "Small talk with an engineer who has been at Google since the Brain days"],
    viz: "ai-timeline",
    lesson: md`AI history is a loop: **a big promise, a hype wave, reality, a winter, then a breakthrough that comes from somewhere unexpected**. Knowing the loop makes you calmer about today's hype and sharper about what actually changed.

## Act 1: the dream (1950–1969)

In 1950 Alan Turing sidestepped "can machines think?" with the **imitation game**: if you can't tell the machine from a person over text, does the difference matter? Six years later, the 1956 **Dartmouth workshop** coined "artificial intelligence" and its proposal suggested a summer of work by ten people would make serious progress on machine language use.

:::story 1958 · The perceptron hype
Frank Rosenblatt's **perceptron** learned to separate two classes by nudging its weights after each mistake. The New York Times reported that the Navy expected it to "walk, talk, see, write, reproduce itself and be conscious of its existence." It was a linear classifier.
:::

In 1966 Joseph Weizenbaum's **ELIZA** mimicked a therapist with pattern-matching rules. People confided in it anyway; his own secretary asked him to leave the room. That instinct to read a mind into fluent text is now called the **ELIZA effect**, and it is still the most important bias to keep in mind when evaluating chatbots.

## Act 2: winters (1969–2005)

Minsky and Papert's 1969 book *Perceptrons* proved a single-layer perceptron cannot learn XOR. Funding collapsed: the **first AI winter**. **Backpropagation** (popularised by Rumelhart, Hinton and Williams in 1986) showed multi-layer networks could learn XOR and much more, but computers were too slow and datasets too small. Expert systems boomed and busted: the **second winter**.

Meanwhile the quiet work continued: **LSTMs** (1997), **convolutional networks** reading cheques (LeNet, 1998), and IBM's **Deep Blue** beating Kasparov at chess (1997), though by search, not learning.

:::dyk
Many of today's deep-learning pioneers spent the winters being told neural networks were a dead end. Geoffrey Hinton, Yann LeCun and Yoshua Bengio shared the 2018 Turing Award for sticking with them. Hinton then shared the 2024 **Nobel Prize in Physics** with John Hopfield.
:::

## Act 3: data + GPUs = deep learning (2006–2016)

Fei-Fei Li bet that the bottleneck was **data**, not algorithms, and built **ImageNet** (over 14 million labelled images). In 2012 **AlexNet**, trained on two gaming GPUs, cut the ImageNet error rate from about 26% to 15%. That was the moment the field turned.

:::story 2012 · The auction in a casino hotel
After AlexNet, Hinton and his students Alex Krizhevsky and Ilya Sutskever formed a tiny company with no product, and auctioned it from a hotel room at the NeurIPS conference at Lake Tahoe. Google, Microsoft, Baidu and DeepMind bid by email. Google won for **$44 million**. The same year, Google Brain's famous "cat paper" showed a network trained on 10 million YouTube frames, on 16,000 CPU cores, learning a "cat neuron" without labels.
:::

Then came a run of hits, many of them from Google: **word2vec** (2013, king − man + woman ≈ queen), **sequence-to-sequence** translation and **attention** (2014), **GANs** (2014, invented after an argument in a Montreal bar), **ResNet** (2015), **TensorFlow** (2015), **TPUs** (announced 2016) and **AlphaGo** (2016).

:::story 2016 · Move 37
In game 2 against world champion Lee Sedol, AlphaGo played a move on the fifth line that its own policy network estimated a human would play about **1 in 10,000** times. Commentators thought it was a mistake. It won the game. In game 4 Lee answered with his own brilliant Move 78, nicknamed "God's touch", for the only human win of the match.
:::

## Act 4: attention is all you need (2017–2021)

In 2017 eight Google researchers published **"Attention Is All You Need"**: drop recurrence, keep only attention, and train in parallel. The **Transformer** became the architecture of nearly everything: BERT (2018, which Google put into Search in 2019), GPT-2 (2019), T5, GPT-3 (2020), and even vision models (ViT).

:::dyk
The paper's title riffs on the Beatles' "All You Need Is Love", and the name *Transformer* was picked partly because it sounded cool. All eight authors eventually left Google; several founded companies, and Noam Shazeer returned in 2024 when Google licensed Character.AI's technology.
:::

The other lesson of this era is **scaling**: bigger models, more data, more compute gave smoothly better results (Kaplan et al., 2020), and DeepMind's **Chinchilla** (2022) showed most models were undertrained for their size. Rich Sutton's essay *The Bitter Lesson* (2019) captures the mood: general methods that scale with compute beat clever hand-built knowledge, again and again.

## Act 5: the generative era (2022–today)

- **30 Nov 2022:** OpenAI releases ChatGPT as a "low-key research preview". A million users in five days, an estimated 100 million in two months. Inside Google, a "code red".
- **Feb 2023:** Bard's launch demo claims the James Webb telescope took the first exoplanet photo. It didn't, and Alphabet loses about $100B of market value in a day. Two months later Google Brain and DeepMind merge into **Google DeepMind**.
- **2023:** GPT-4; Bing's chatbot "Sydney" tells a New York Times reporter it loves him; a lawyer is sanctioned for citing six court cases ChatGPT invented.
- **2024:** Gemini 1.5 reads a million tokens; Google's AI Overviews suggest glue on pizza; AlphaFold's creators share the **Nobel Prize in Chemistry**; Anthropic open-sources the **Model Context Protocol**.
- **2025:** DeepSeek-R1 shows strong reasoning from cheap RL, and Nvidia loses about $590B of value in a day; "vibe coding" enters the vocabulary; agents and MCP spread everywhere; Gemini Deep Think earns a gold-medal score at the International Mathematical Olympiad.

:::news The pattern to remember
Every famous AI failure in this list (Bard's demo, glue on pizza, fake legal citations, a chatbot "selling" a car for $1) is the same failure: **fluent output without grounding or verification**. Most of what you will design as an engineer (retrieval, evaluation, guardrails, human review) exists to close that gap.
:::

## How to use this in an interview

You will rarely be asked for dates. You will be asked **why** things work now: the Transformer made training parallel, GPUs and TPUs made it affordable, the web made data plentiful, and scaling laws made returns predictable. Then **RLHF** turned a text predictor into an assistant people could use. That four-part answer (architecture, hardware, data, alignment) is a strong opener for any "explain LLMs" question.`,
    pitfalls: [
      "Treating AI history as dates to memorise instead of the hype → winter → breakthrough loop",
      "Crediting a single company or person for the Transformer era; it was many labs building on each other",
      "Assuming fluent output means understanding (the ELIZA effect, sixty years on)",
      "Forgetting that most famous failures were grounding and verification failures, not model-size failures",
    ],
    quiz: [
      Q("Which limitation of the single-layer perceptron helped trigger the first AI winter?", ["It needed GPUs", "*It cannot learn XOR (non-linearly separable data)", "It overfit small datasets", "It could only process images"], "Minsky and Papert showed a single linear boundary cannot separate XOR. Hidden layers trained with backprop later fixed this."),
      Q("What was the key architectural change in “Attention Is All You Need”?", ["Adding convolutions to RNNs", "*Removing recurrence and relying on self-attention, so training parallelises", "Using reinforcement learning", "Using bigger LSTMs"], "Without recurrence, every position is processed at once, which made training on huge corpora practical."),
      Q("Which explanation best answers “why did LLMs take off around 2020–2022?”", ["A single new algorithm", "*Transformers + cheap parallel compute + web-scale data + alignment (RLHF) for usability", "Better keyboards", "Symbolic AI finally worked"], "It was the combination: architecture, hardware, data and instruction-following."),
    ],
  }),

  T("ai", "ai-ml-basics", "Machine learning in one sitting", 1, 35, "Supervised, unsupervised and reinforcement learning; splits, overfitting, bias and variance; regression and its metrics.", {
    signals: ["Anyone asks “how would you build a model for X?”", "You need to explain overfitting or why a model fails in production", "Choosing between a rule, a classic model and an LLM"],
    lesson: md`Machine learning means **learning a function from examples instead of writing it by hand**. You choose a family of functions (the model), a way to score mistakes (the loss), and a way to reduce that score (the optimizer).

## Three ways to learn

| Paradigm | Data | Learns | Example |
|---|---|---|---|
| Supervised | Inputs with correct outputs (labels) | A mapping input → output | Spam or not; house price |
| Unsupervised | Inputs only | Structure: clusters, directions, densities | Customer segments; PCA |
| Reinforcement | An environment and a reward | A policy that maximises long-term reward | AlphaGo; RLHF for chatbots |

**Self-supervised** learning, the engine of LLMs, is supervised learning where the labels come free from the data itself: hide the next word, predict it.

:::eli5
Supervised learning is a teacher with an answer key. Unsupervised learning is sorting your LEGO without instructions. Reinforcement learning is a dog learning tricks for treats.
:::

## Train, validate, test

- **Training set:** fit the parameters.
- **Validation set:** choose hyperparameters and stop training at the right time.
- **Test set:** touch it once, at the end, to estimate real-world performance.

A single train/test split is sensitive to which examples land where. **K-fold cross-validation** splits the data into $K$ folds, trains on $K-1$ and validates on the remaining one, $K$ times, and averages. It costs $K$ trainings but tells you how stable the model is.

**Hyperparameters** (learning rate, tree depth, number of layers) are not learned by training. **Grid search** tries every combination of a hand-picked set; **random search** samples combinations and usually finds good settings faster when only a few hyperparameters matter, which is the common case.

:::warn Data leakage
If information from the test set sneaks into training (normalising with statistics from the full dataset, duplicate users across splits, future data in a time series), your test score lies. For time series, always split by time. Leakage is the most common reason a model "worked in the notebook" and failed in production.
:::

## Overfitting, underfitting, bias and variance

- **Underfitting (high bias):** the model is too simple; it misses the pattern on training data too.
- **Overfitting (high variance):** the model memorises noise; great on training data, poor on new data.
- The fix depends on which one you have. High bias: a bigger model, better features, longer training. High variance: more data, regularisation (L1/L2, dropout), early stopping, simpler models, ensembling.

Compare **training loss** and **validation loss**: both high is bias; a widening gap is variance.

## Regression: predicting a number

Linear regression models $y = w^\top x + b$ and minimises **mean squared error**:

$$
J(w, b) = \frac{1}{N}\sum_{i=1}^{N}\left(y_i - (w^\top x_i + b)\right)^2
$$

Two ways to solve it:

- **Normal equation:** $w = (X^\top X)^{-1} X^\top y$. Exact, but inverting costs $O(d^3)$ and breaks when features are collinear (the matrix is not invertible).
- **Gradient descent:** repeat $w \leftarrow w - \eta \nabla_w J$ with learning rate $\eta$. Scales to millions of features and is how every neural network is trained.

**Polynomial regression** is still linear regression: add features like $x^2$ and $x^3$ and fit a linear model on them. More powerful, and easier to overfit.

### Regression metrics

| Metric | Formula | Read it as |
|---|---|---|
| MSE | mean of squared errors | Punishes big misses hard; units squared |
| RMSE | square root of MSE | Typical error in the original units |
| MAE | mean of absolute errors | Robust to outliers |
| R² | 1 − residual variance / total variance | Share of variance explained; 1 is perfect, 0 is "predict the mean" |
| Adjusted R² | penalises extra features | Stops R² rising just because you added columns |

$$
R^2_{adj} = 1 - (1 - R^2)\frac{N - 1}{N - d - 1}
$$

:::dyk
Machine learning is everywhere in heavy industry: predicting concrete strength from its mix, wind-turbine output from wind speed and direction, grid demand to balance power plants, and even pipeline gas leaks. One study detected underground methane leaks with about 98% accuracy by training a neural network on hyperspectral images of **the plants growing above the pipe**: stressed vegetation reflects light differently three weeks into a leak.
:::

## When not to use ML

Google's *Rules of Machine Learning* opens with: **"Don't be afraid to launch a product without machine learning."** If a heuristic gets you 80% of the way, ship it, log data, and add ML when you have the data and the metric. In interviews, saying "I'd start with a rule-based baseline and a metric" is a strong signal, not a weak one.

:::tip Say the loop out loud
For any ML design question: **define the objective and metric → get data and labels → baseline → model → offline evaluation → online A/B test → monitoring for drift**. Interviewers listen for the metric and the baseline before the model.
:::`,
    pitfalls: [
      "Tuning hyperparameters on the test set, which silently turns it into a training set",
      "Random splits for time-series data (future leaks into the past)",
      "Reporting only R² or accuracy without a baseline to compare against",
      "Jumping to a deep model before a simple baseline and a clear metric exist",
      "Treating overfitting and underfitting with the same fix",
    ],
    quiz: [
      Q("Training loss is low but validation loss is much higher and rising. What is happening?", ["Underfitting (high bias)", "*Overfitting (high variance)", "Data leakage guaranteed", "The learning rate is too low"], "A widening train/validation gap is the signature of variance: regularise, add data, or stop earlier."),
      Q("Why might you prefer gradient descent to the normal equation for linear regression?", ["It is always exact", "*Inverting XᵀX costs O(d³) and fails with collinear features; GD scales to huge d", "It needs no learning rate", "It avoids overfitting"], "The closed form is great for small problems; iterative methods scale."),
      Q("Your model predicts next month's sales. How should you split the data?", ["Random 80/20", "*By time: train on the past, validate and test on later periods", "K-fold with shuffling", "Use all data for training"], "Random splits leak future information into training."),
      Q("What does adjusted R² add over R²?", ["It is always higher", "*A penalty for adding features that don't help", "It works for classification", "It ignores outliers"], "Plain R² never decreases when you add a feature; adjusted R² can."),
    ],
  }),

  T("ai", "ai-classic-models", "Classic models: from perceptrons to XGBoost", 2, 35, "Perceptron, k-NN, SVMs, decision trees, random forests, boosting, stacking, PCA and k-means: what each assumes and when it wins.", {
    signals: ["Tabular data with a few hundred features (classic models often beat deep learning here)", "You need an interpretable or cheap baseline", "An interviewer asks “bagging vs boosting?”"],
    prereq: ["ai-ml-basics"],
    lesson: md`Deep learning dominates text, images and audio, but on **tables of numbers** (fraud, ads ranking features, churn) gradient-boosted trees are still the model to beat. Knowing these models is also knowing the vocabulary every ML discussion uses.

## The perceptron (1958)

A linear classifier: predict $\hat{y} = \text{sign}(w^\top x + b)$. When it misclassifies $(x_i, y_i)$ with $y_i \in \{-1, +1\}$, nudge the boundary toward the example:

$$
w \leftarrow w + \eta\, y_i x_i, \qquad b \leftarrow b + \eta\, y_i
$$

It converges **only if the data is linearly separable**, so it can never learn XOR. Stack perceptrons with non-linear activations and you get a neural network.

## k-nearest neighbours

No training at all: store the data. To predict, find the $k$ closest training points (often by Euclidean distance) and take a majority vote.

- Training $O(1)$; prediction $O(N \cdot d)$ per query, which is why real systems use **approximate nearest-neighbour** indexes (the same ones that power vector databases).
- Sensitive to feature scale (normalise first) and to the **curse of dimensionality**: in high dimensions, all points become roughly equally far apart.

## Support vector machines

Find the boundary with the **widest margin** to the nearest points (the support vectors):

$$
\min_{w, b} \tfrac{1}{2}\lVert w \rVert^2 \quad \text{s.t.} \quad y_i (w^\top x_i + b) \ge 1
$$

Real data overlaps, so the **soft margin** adds slack $\xi_i \ge 0$ and a penalty $C \sum \xi_i$. Large $C$ = few violations, narrow margin; small $C$ = wider margin, more tolerance.

| Slack value | Meaning |
|---|---|
| $\xi = 0$ | Correct and outside the margin |
| $0 < \xi < 1$ | Inside the margin but still correct |
| $\xi = 1$ | Exactly on the boundary |
| $\xi > 1$ | Misclassified |

The **kernel trick** (RBF, polynomial) computes dot products in a high-dimensional feature space without building it, giving non-linear boundaries. SVMs need scaled features, give no native probabilities, and handle multi-class through one-vs-rest or one-vs-one.

## Decision trees

Split the data with questions like "income > 50K?" chosen to make the children **purer**:

- **Entropy:** $H(S) = -\sum_i p_i \log_2 p_i$; **information gain** = parent entropy − weighted child entropy.
- **Gini impurity:** $G(S) = 1 - \sum_i p_i^2$, cheaper and usually equivalent.

Trees are interpretable and need no scaling, but a deep tree memorises the data. Control it with **pre-pruning** (max depth, min samples per leaf) or **post-pruning** such as cost-complexity pruning, which trades fit against size: $R_\alpha(T) = R(T) + \alpha |T|$.

## Ensembles: many trees beat one

| | Bagging (random forest) | Boosting (gradient boosting, XGBoost) |
|---|---|---|
| How | Train trees **in parallel** on bootstrap samples, each split on a random subset of features (often $\sqrt{d}$) | Train trees **in sequence**, each fitting the errors (negative gradients) of the ensemble so far |
| Reduces | Variance | Bias (and variance, with regularisation) |
| Noise and outliers | Robust | More sensitive: it keeps chasing hard examples |
| Typical use | Strong default with little tuning | Best accuracy on tabular data with tuning |

**XGBoost** adds regularisation of leaf weights, a second-order (Newton) approximation of the loss, clever handling of sparse features, and early stopping on validation loss. **Stacking** feeds the predictions of several models (say, a random forest and XGBoost) into a small meta-model that learns how to combine them.

:::dyk
For years, most winning solutions to tabular Kaggle competitions used gradient-boosted trees (XGBoost, LightGBM, CatBoost), often ensembled. The Netflix Prize ($1M, 2009) was won by a blend of over 100 models.
:::

## Unsupervised: PCA and k-means

**Principal component analysis** finds the directions of maximum variance. Centre the data, compute the covariance matrix $\Sigma = \frac{1}{N} X^\top X$, take its eigenvectors ($\Sigma v = \lambda v$), and project onto the top $k$. Each eigenvalue $\lambda$ is the variance along its direction. Uses: compression, visualisation, de-noising, and fighting the curse of dimensionality.

**k-means** splits data into $K$ clusters by alternating two steps until nothing changes: assign each point to the nearest centroid, then move each centroid to the mean of its points. It minimises the within-cluster sum of squared distances, assumes roughly round clusters, and needs $K$ chosen up front (the elbow method or silhouette score help).

:::tip Picking a model in an interview
State the data shape first. Tabular with mixed features → gradient-boosted trees, with logistic regression as the baseline. Images, audio, text → deep learning or a pretrained model. Very few labels → a pretrained model's embeddings plus a simple classifier. Need explanations for regulators → linear models or shallow trees.
:::`,
    pitfalls: [
      "Forgetting to scale features for k-NN and SVMs",
      "Calling a random forest “boosting” (bagging is parallel and reduces variance; boosting is sequential)",
      "Using k-means on clusters that are not roughly spherical or similar in size",
      "Assuming deep learning beats trees on every tabular problem",
    ],
    quiz: [
      Q("Which ensemble trains models sequentially, each one correcting the errors of the previous ones?", ["Bagging", "*Boosting", "Stacking", "k-means"], "Boosting fits each new tree to the residuals (negative gradients) of the current ensemble."),
      Q("In a soft-margin SVM, what does a slack value ξ > 1 mean?", ["Correct and outside the margin", "Inside the margin but correct", "*The point is misclassified", "It is a support vector of the other class only"], "ξ measures how far past the margin a point sits; beyond 1 it is on the wrong side of the boundary."),
      Q("Why do random forests pick a random subset of features at each split?", ["To speed up prediction only", "*To decorrelate the trees, so averaging reduces variance more", "To handle missing values", "To reduce bias"], "Averaging helps most when the trees make different mistakes."),
      Q("k-NN prediction is slow on 100 million points. What is the standard fix?", ["Use k = 1", "*An approximate nearest-neighbour index (e.g. HNSW)", "Train longer", "Add more features"], "The same structures power vector databases for RAG."),
    ],
  }),

  T("ai", "ai-metrics", "Precision, recall and friends", 1, 25, "The accuracy trap, confusion matrices, F1 and F-beta, thresholds, ROC/AUC and macro vs micro averaging.", {
    signals: ["Imbalanced data: fraud, spam, disease, abuse, rare-event detection", "Someone reports a single accuracy number", "Choosing the operating point of a classifier"],
    prereq: ["ai-ml-basics"],
    viz: "threshold",
    lesson: md`A model that says "not fraud" to every transaction is **99.9% accurate** if 0.1% of transactions are fraud, and completely useless. That is the **accuracy trap**, and it is why every ML interview eventually asks about precision and recall.

## The confusion matrix

| | Predicted positive | Predicted negative |
|---|---|---|
| **Actually positive** | True positive (TP) | False negative (FN) |
| **Actually negative** | False positive (FP) | True negative (TN) |

From these four counts:

- **Accuracy** $= \frac{TP + TN}{TP + TN + FP + FN}$: share of all predictions that are right.
- **Precision** $= \frac{TP}{TP + FP}$: *when I say positive, am I right?*
- **Recall** (sensitivity, true-positive rate) $= \frac{TP}{TP + FN}$: *did I catch all the positives?*
- **Specificity** $= \frac{TN}{TN + FP}$: *did I correctly clear the negatives?*
- **F1** $= 2 \cdot \frac{P \cdot R}{P + R}$: harmonic mean, high only when both are high.

:::eli5
A fishing net. **Recall** is how many of the fish in the lake you caught. **Precision** is how much of what's in your net is actually fish rather than old boots.
:::

## Which mistake costs more?

That question, not the model, decides the metric:

- **Cancer screening, fraud alerts sent to a human reviewer:** missing a positive is terrible → favour **recall**.
- **Auto-blocking a user, spam that deletes mail:** a false positive hurts a real person → favour **precision**.
- **F-beta** makes the trade-off explicit: $F_\beta = (1 + \beta^2)\frac{P R}{\beta^2 P + R}$. $\beta = 2$ weighs recall twice as much; $\beta = 0.5$ favours precision.

## Thresholds: the dial nobody mentions

Most classifiers output a score or probability, and you pick a threshold $\tau$. **Lowering $\tau$ raises recall and false positives; raising it raises precision and false negatives.** The default 0.5 is arbitrary: set $\tau$ from the cost of each error and the capacity downstream (for example, "reviewers can handle 500 alerts a day").

[[widget:threshold]]

## ROC and AUC

The **ROC curve** plots the true-positive rate against the false-positive rate as the threshold sweeps from 1 to 0. **AUC**, the area under it, has a lovely meaning: *the probability that a randomly chosen positive is scored higher than a randomly chosen negative*. 0.5 is a coin flip, 1.0 is perfect ranking.

:::warn ROC can flatter you on rare events
With 1 positive per 10,000, a tiny false-positive *rate* is still a flood of false positives. For heavy imbalance look at the **precision-recall curve** (and its average precision) too.
:::

## More than two classes

Compute per-class precision, recall and F1, then combine:

| Average | How | Use when |
|---|---|---|
| Macro | Plain mean over classes | Every class matters equally, including rare ones |
| Micro | Pool all TP, FP, FN, then compute | You care about overall per-example performance (equals accuracy for single-label tasks) |
| Weighted | Mean weighted by class support | You want a single number that reflects class frequency |

:::story A case study with a twist
In a legal-contract checker (covered in the KG-RAG case study topic), a zero-shot model scored **68% accuracy** but a **0.00 F1 on the "contradiction" class**: it never once flagged a contract that broke a rule, which was the whole point of the tool. Macro F1 (0.47) exposed it; accuracy hid it.
:::

## Ranking and retrieval metrics (preview)

Search and RAG systems use the same ideas at a cut-off $k$: **precision@k**, **recall@k**, and **MRR** (mean of $1/\text{rank}$ of the first relevant result). The RAG topic covers them.

:::tip The interview move
Before naming a metric, ask: "What's the base rate, and what does each kind of mistake cost the user or the business?" Then pick the metric, the threshold strategy, and an online metric (such as appeal rate or reviewer workload) to confirm it in production.
:::`,
    pitfalls: [
      "Reporting accuracy on imbalanced data",
      "Leaving the threshold at 0.5 without asking about error costs",
      "Quoting ROC-AUC alone for very rare positives (check precision-recall)",
      "Using micro-average F1 and missing that a rare class has zero recall",
    ],
    quiz: [
      Q("A fraud model flags 100 transactions; 20 are fraud. There were 50 frauds in total. What are precision and recall?", ["20% and 20%", "*20% and 40%", "40% and 20%", "50% and 40%"], "Precision = 20/100. Recall = 20/50."),
      Q("You lower the decision threshold. What usually happens?", ["Precision and recall both rise", "*Recall rises, precision falls", "Precision rises, recall falls", "Nothing changes"], "More examples are called positive: you catch more true positives and more false ones."),
      Q("What does an AUC of 0.85 mean?", ["85% accuracy", "85% of predictions are positive", "*A random positive outranks a random negative 85% of the time", "Precision is 0.85"], "AUC is a ranking metric, independent of any single threshold."),
      Q("Which average exposes a rare class with zero recall?", ["Micro", "*Macro", "Weighted", "Accuracy"], "Macro averaging gives every class equal weight, so one terrible class drags it down."),
    ],
  }),

  T("ai", "ai-neural-nets", "Neural networks and how they learn", 1, 40, "Neurons, activations, softmax and cross-entropy, backpropagation as reverse-mode autodiff, and the optimizers from SGD to Adam.", {
    signals: ["Explaining what training a model actually does", "Debugging a loss that explodes or never moves", "Choosing an optimizer or learning rate"],
    prereq: ["ai-ml-basics"],
    viz: "gradient-descent",
    lesson: md`A neural network is a stack of simple functions. Each **layer** computes $h = \sigma(Wx + b)$: a linear map followed by a non-linear **activation**. Without the non-linearity, a hundred layers would collapse into one linear map, and XOR would still be impossible.

## Activations

| Activation | Shape | Notes |
|---|---|---|
| Sigmoid | squashes to (0, 1) | Saturates: gradients vanish for large inputs. Used for probabilities and gates. |
| Tanh | squashes to (−1, 1) | Zero-centred; classic in RNNs; still saturates. |
| ReLU | $\max(0, x)$ | Cheap, no saturation for positives; neurons can "die" at 0. The 2012 default. |
| GELU / SwiGLU | smooth ReLU variants | What modern Transformers use. |

## From scores to probabilities: softmax and cross-entropy

For $C$ classes the last layer produces raw scores (logits) $a_j$. **Softmax** turns them into probabilities:

$$
q_j = \frac{e^{a_j}}{\sum_{r=1}^{C} e^{a_r}}
$$

and **cross-entropy** scores them against the one-hot label $y$:

$$
L(y, q) = -\sum_{j=1}^{C} y_j \log q_j
$$

Only the probability of the correct class matters: the loss is $-\log q_{\text{correct}}$. Predict the right class with probability 0.9 and the loss is 0.105; with 0.01 it is 4.6. This exact loss, over a vocabulary of about 100,000 tokens, is what an LLM minimises during pretraining.

## Backpropagation is just the chain rule, done backwards

Write the computation as a **graph**: nodes are operations, edges carry values. The **forward pass** computes the output. The **backward pass** walks the graph in reverse, multiplying local derivatives (the chain rule), to get the gradient of the loss with respect to every parameter.

This is **reverse-mode automatic differentiation**. For a function from millions of inputs to one number (the loss), a single backward sweep yields *all* the gradients for roughly the cost of one forward pass. That asymmetry is why we can train networks with billions of parameters. PyTorch, JAX and TensorFlow build the graph for you and call this "autograd".

:::dyk
Andrej Karpathy's *micrograd* implements a working autograd engine and neural network library in about 150 lines of Python. Building it once, as in his video "The spelled-out intro to neural networks and backpropagation", is the fastest way to make backprop click.
:::

## Optimizers

All of them follow the negative gradient; they differ in how they use history.

- **Batch gradient descent:** gradient over the whole dataset. Smooth but slow and memory-hungry.
- **Stochastic GD:** one example at a time. Fast and noisy.
- **Mini-batch GD:** 32 to a few thousand examples. The practical default; batches fill a GPU efficiently.
- **Momentum:** keep a running velocity $v_t = \beta v_{t-1} + \eta \nabla J$ and step by it. Oscillations cancel and consistent directions accelerate, like a ball rolling downhill.
- **AdaGrad:** divide each parameter's step by its accumulated squared gradients; great for sparse features, but the learning rate decays to nothing.
- **RMSprop:** use a decaying average of squared gradients instead, so the step size does not die.
- **Adam:** momentum (first moment) plus RMSprop (second moment), with bias correction for the early steps:

$$
m_t = \beta_1 m_{t-1} + (1-\beta_1) g_t, \qquad v_t = \beta_2 v_{t-1} + (1-\beta_2) g_t^2
$$

$$
\hat{m}_t = \frac{m_t}{1-\beta_1^t}, \quad \hat{v}_t = \frac{v_t}{1-\beta_2^t}, \quad \theta_t = \theta_{t-1} - \frac{\eta\, \hat{m}_t}{\sqrt{\hat{v}_t} + \epsilon}
$$

Adam (or AdamW, which decouples weight decay) is the default for Transformers. Watch the difference in a narrow valley:

[[widget:gradient-descent]]

## Keeping deep networks trainable

- **Vanishing and exploding gradients:** multiplying many small (or large) derivatives shrinks (or blows up) the signal. Fixes: ReLU-family activations, careful initialisation (Xavier/He), **residual connections** ($y = F(x) + x$, from ResNet), normalisation, and **gradient clipping**.
- **Normalisation:** BatchNorm normalises across the batch (CNNs); **LayerNorm** normalises across features of each example (Transformers, because it does not depend on batch size or sequence length).
- **Regularisation:** weight decay, **dropout** (randomly zero activations during training so no neuron can rely on another), data augmentation, early stopping.
- **Learning-rate schedules:** warm up for the first steps, then decay (cosine is common). A too-high learning rate is the first suspect when loss turns into NaN.

:::tip Debugging a training run
Loss is NaN → learning rate too high, missing gradient clipping, or log of zero. Loss flat from the start → learning rate too low, a bug in the labels, or dead ReLUs. Training loss falls but validation rises → overfitting. A classic sanity check: make sure the model can **overfit a single small batch**; if it cannot, there is a bug.
:::`,
    pitfalls: [
      "Forgetting the non-linearity (stacked linear layers are just one linear layer)",
      "Applying softmax twice, or computing log(softmax) by hand instead of a fused, numerically stable log-softmax",
      "Blaming the architecture when the learning rate is the problem",
      "Not checking that the model can overfit a tiny batch before scaling up",
      "Using BatchNorm with tiny or variable batches where LayerNorm is the right tool",
    ],
    quiz: [
      Q("Why can reverse-mode autodiff train billion-parameter models efficiently?", ["It approximates gradients randomly", "*One backward pass yields the gradient for every parameter of a scalar loss", "It skips the forward pass", "It only updates the last layer"], "For f: ℝᵈ → ℝ, reverse mode costs about one extra pass regardless of d."),
      Q("What two ideas does Adam combine?", ["Dropout and BatchNorm", "*Momentum (first moment) and per-parameter scaling by squared gradients (second moment)", "Bagging and boosting", "L1 and L2 penalties"], "Adam = momentum + RMSprop, with bias correction."),
      Q("The correct class gets probability 0.01. What is the cross-entropy loss?", ["0.01", "0.99", "*About 4.6", "100"], "−ln(0.01) ≈ 4.6. Confidently wrong predictions are punished hard."),
      Q("Which change most directly fixes vanishing gradients in a very deep network?", ["A bigger batch", "*Residual (skip) connections", "More dropout", "Sigmoid activations"], "The identity path lets gradients flow straight back, which is what made 152-layer ResNets trainable."),
    ],
  }),

  T("ai", "ai-pytorch", "PyTorch essentials for engineers", 3, 30, "Tensors and shapes, broadcasting, devices, autograd, the training loop, and the five bugs everyone writes once.", {
    signals: ["A take-home or pairing exercise with a small model", "Reading research or production ML code", "Debugging a shape error at 2 a.m."],
    prereq: ["ai-neural-nets"],
    template: `import torch, torch.nn as nn, torch.nn.functional as F
from torch.utils.data import DataLoader, TensorDataset

torch.manual_seed(42)
device = "cuda" if torch.cuda.is_available() else "cpu"

X, y = torch.randn(1000, 20), torch.randint(0, 3, (1000,))
train = DataLoader(TensorDataset(X, y), batch_size=64, shuffle=True)

model = nn.Sequential(nn.Linear(20, 64), nn.ReLU(), nn.Dropout(0.2), nn.Linear(64, 3)).to(device)
opt = torch.optim.AdamW(model.parameters(), lr=1e-3, weight_decay=0.01)

for epoch in range(10):
    model.train()                      # dropout on
    for xb, yb in train:
        xb, yb = xb.to(device), yb.to(device)
        logits = model(xb)             # (B, 3) raw scores, no softmax
        loss = F.cross_entropy(logits, yb)
        opt.zero_grad()                # gradients accumulate otherwise
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        opt.step()

model.eval()                           # dropout off
with torch.no_grad():                  # no graph, less memory
    acc = (model(X.to(device)).argmax(-1) == y.to(device)).float().mean()
print(f"accuracy {acc:.2%}")`,
    lesson: md`PyTorch is NumPy with two superpowers: **tensors that live on GPUs** and **automatic gradients**. You don't need to be a researcher to read it, and a little fluency goes a long way in interviews that include a small ML exercise.

## Tensors and their shapes

A **tensor** is an n-dimensional array: a scalar (0-D), vector (1-D), matrix (2-D), or more. An RGB image batch is typically \`(batch, channels, height, width)\`, for example \`(32, 3, 224, 224)\`; a batch of token embeddings is \`(batch, sequence, d_model)\`.

\`\`\`python
x = torch.randn(2, 3, 4)        # shape (2, 3, 4), float32 by default
x.shape, x.ndim, x.dtype, x.device
x.view(6, 4)                    # same memory, new shape (needs contiguous data)
x.reshape(6, 4)                 # copies if it has to
x.permute(0, 2, 1)              # reorder axes -> (2, 4, 3)
x.unsqueeze(0).shape            # add an axis -> (1, 2, 3, 4)
x[:, 0, :].shape                # integer index drops that axis -> (2, 4)
\`\`\`

**Matrix multiplication is all you need:** \`A @ B\` needs the inner dimensions to match, \`(m, n) @ (n, p) → (m, p)\`. The single most common deep-learning error is a shape mismatch, usually fixed by a transpose (\`B.T\`) or by checking which axis is the batch.

**Broadcasting** stretches size-1 axes automatically: \`(32, 10) + (10,)\` adds a bias to every row. It is convenient and also the source of silent bugs, such as \`(32, 1) - (32,)\` quietly producing a \`(32, 32)\` matrix.

:::dyk
\`torch.from_numpy(arr)\` **shares memory** with the NumPy array: change one and the other changes too. \`torch.tensor(arr)\` copies. Many confusing bugs come from forgetting which one you used.
:::

## Devices and dtypes

Tensors and models must be on the same device: \`model.to("cuda")\`, \`x.to(device)\`. A tensor on the GPU must come back with \`.cpu()\` before \`.numpy()\`. Training usually runs in **bfloat16 or float16 mixed precision** for speed, with float32 master weights; inference often goes further to int8 or int4.

## Autograd in three lines

\`\`\`python
w = torch.tensor(3.0, requires_grad=True)
loss = (w * 2 - 10) ** 2
loss.backward(); print(w.grad)   # d/dw (2w - 10)^2 = 4(2w - 10) = -16
\`\`\`

Every operation on a tensor with \`requires_grad=True\` records itself in a graph; \`backward()\` walks it in reverse.

## The training loop

Press **Reveal code** on the template below for a complete loop. Its shape never changes: **forward → loss → zero_grad → backward → (clip) → step**, wrapped in epochs over a \`DataLoader\`, with \`model.train()\` and \`model.eval()\` switching dropout and batch-norm behaviour.

:::warn The five bugs everyone writes once
1. Forgetting \`optimizer.zero_grad()\`: gradients **accumulate** across steps.
2. Forgetting \`model.eval()\` at test time: dropout stays on and results are random.
3. Applying softmax before \`F.cross_entropy\`, which expects **raw logits** (it applies log-softmax itself).
4. Evaluating without \`torch.no_grad()\`: memory blows up storing a graph you never use.
5. Data and model on different devices.
:::

## Seeing inside a model

**Forward hooks** let you capture intermediate activations, which is how course notebooks visualise what each convolutional layer of LeNet-5 "sees":

\`\`\`python
acts = {}
model.conv1.register_forward_hook(lambda m, inp, out: acts.__setitem__("conv1", out.detach()))
model(img.unsqueeze(0))           # acts["conv1"] now holds the feature maps
\`\`\`

## Reproducibility

\`torch.manual_seed(42)\` makes random tensors repeatable, but you must reseed before each call you want identical. Full determinism on GPUs also needs deterministic algorithms and fixed data-loader workers, and costs speed.

:::tip Experiments worth running once
On a small text classifier (say, IMDB reviews with an RNN or LSTM), change one thing at a time and log the result: lowercase and strip HTML; word vs subword tokenisation; vocabulary size; maximum sequence length; hidden size, learning rate and dropout. You will learn more about what matters from that table than from any lecture.
:::`,
    pitfalls: [
      "Silent broadcasting that turns a (B,1) minus (B,) into a (B,B) matrix",
      "Softmax before cross_entropy (it expects logits)",
      "Missing zero_grad, eval(), or no_grad()",
      "Mixing CPU and GPU tensors",
      "Using view() on a non-contiguous tensor after permute (use reshape or .contiguous())",
    ],
    quiz: [
      Q("What does F.cross_entropy expect as input?", ["Probabilities after softmax", "*Raw logits", "One-hot labels only", "Log-probabilities from sigmoid"], "It applies log-softmax internally; passing probabilities double-squashes."),
      Q("You forget optimizer.zero_grad(). What happens?", ["Nothing", "*Gradients accumulate across steps, so updates grow and training misbehaves", "The model stops learning immediately", "PyTorch raises an error"], "PyTorch adds into .grad by design (useful for gradient accumulation)."),
      Q("torch.from_numpy(arr) and then arr[0] = 99. What happens to the tensor?", ["Unchanged", "*It also changes: they share memory", "PyTorch raises an error", "Only on GPU"], "from_numpy is zero-copy."),
    ],
  }),
];
