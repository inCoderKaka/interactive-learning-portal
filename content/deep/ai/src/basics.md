=== ml-framing
blurb: Turning a product goal into a machine-learning task: when ML is the right tool, supervised versus unsupervised versus reinforcement learning, choosing the prediction target, the label and the objective, and the heuristics-first baseline.
signals: The first five minutes of any ML system design round | "Would you even use ML here?" | "What exactly is your model predicting?" | A product metric that can't be optimised directly
prereq: probability-ml

--- lesson
:::words
- **Model**: a function with adjustable numbers (parameters) that maps inputs to outputs.
- **Feature**: one input signal the model sees, such as "user's country" or "minutes since upload".
- **Label** (target): the correct answer for a training example, like "clicked" or "price was 312".
- **Supervised learning**: learning from examples that have labels. **Unsupervised**: finding structure without labels. **Reinforcement learning (RL)**: learning by acting and receiving rewards.
- **Classification**: predicting a category. **Regression**: predicting a number. **Ranking**: ordering items.
- **Objective**: what training optimises (a loss). **Product metric**: what the business cares about (watch time, revenue, safety).
- **Proxy**: a measurable stand-in for something you can't measure or optimise directly.
- **Baseline**: the simplest reasonable solution you compare against.
:::

## The problem in plain words

Product teams don't ask for "a gradient-boosted classifier". They say "people aren't finding videos they like" or "too much spam gets through". The first, and most graded, skill in an ML interview is turning that fuzzy goal into a precise prediction problem: **what does the model predict, for which input, from which data, and how does that prediction turn into a product decision?** A brilliant model for the wrong target is worthless; a simple model for the right target often wins.

:::eli5
A shop owner says "I want more happy customers". You can't train a model on "happiness". But you can predict "will this customer buy this item if we show it?", show the items with the highest predictions, and check whether customers come back more. Picking that question is framing.
:::

## Should this be ML at all?

ML is worth its cost (data, training, monitoring, unpredictability) when:

- the pattern is **too complex for rules** (what makes a video appealing),
- there is **lots of data** with a signal to learn from,
- the pattern **changes** and must be relearned (spam tactics),
- **mistakes are tolerable** or can be caught (a bad recommendation is cheap; a bad medical dose isn't, without safeguards),
- it must work at a **scale** humans can't (billions of items).

Rules win when the logic is known and stable ("block payments from sanctioned countries"), data is tiny, or every decision must be explainable by law. In interviews, say "I'd start with a heuristic baseline (most popular items, keyword rules) to ship fast and to measure the model against". Google's *Rules of ML* puts it first: don't be afraid to launch a product without ML.

## The three ways to learn

| | Data | Example | Typical output |
|---|---|---|---|
| **Supervised** | inputs with labels | email → spam/not spam | class probability, number, score |
| **Unsupervised / self-supervised** | inputs only | group users by behaviour; predict the next word | clusters, embeddings, a pretrained model |
| **Reinforcement learning** | actions and rewards | choose which ad to show, get clicks | a policy (what to do) |

**Self-supervised** learning is the bridge that made modern AI: the labels come from the data itself (hide a word and predict it), so you can train on the whole internet. Large language models are self-supervised during pretraining, supervised during fine-tuning, and trained with RL during alignment.

## Choosing the target: the heart of framing

For "recommend videos", candidate targets include: P(click), P(watch more than 30 s), expected watch time, P(like), P(share), P(user says "not interested"). Each has a trap:

- **Clicks** reward clickbait: high click rate, then immediate abandonment.
- **Watch time** favours long videos and can reward compulsive viewing; YouTube moved from clicks to watch time in 2012, then added satisfaction surveys.
- **Likes** are rare (sparse labels) and biased toward engaged users.

Real systems predict **several** targets with one model (multi-task learning) and combine them into one ranking score, e.g. $\text{score} = P(\text{click}) \cdot \mathbb{E}[\text{watch}] + w_1 P(\text{like}) - w_2 P(\text{dislike})$, with weights tuned by online experiments. Say this in interviews: it shows you know the target is a product decision, not a given.

Also decide the **type** of output:

- **Binary classification** (P(spam)): you then choose a threshold.
- **Multi-class** (which of 50 categories) or **multi-label** (several tags can be true at once; use independent sigmoids, not one softmax).
- **Regression** (ETA in minutes): consider predicting a distribution or quantiles if uncertainty matters.
- **Ranking** (order 500 candidates): train pointwise, pairwise or listwise (ranking-models page).

## Where do labels come from?

Interviewers will ask; have an answer:

- **Implicit feedback**: clicks, watch time, purchases, skips. Plentiful and free, but noisy and biased by what you showed (position bias, exposure bias).
- **Explicit feedback**: ratings, likes, reports, surveys. Cleaner, but sparse.
- **Human labelling**: raters following guidelines (content moderation, search relevance). Expensive; measure agreement between raters.
- **Delayed labels**: fraud chargebacks arrive weeks later; you must decide when an example's label is "final".
- **Weak supervision / LLM labelling**: heuristics or a large model generate noisy labels cheaply, checked against a small gold set.

## Offline objective, online metric

Three layers that must line up:

1. **Business / product metric**: daily active users, revenue, safety incidents. Moves slowly, hard to attribute.
2. **Online metric** of the feature: click-through, watch time per session, report rate. Measured in A/B tests.
3. **Offline model metric**: log-loss, AUC, NDCG, RMSE on held-out data. Fast to compute; used to choose models.

Good framing names all three and explains how improving (3) should improve (2) and then (1). When they diverge (offline AUC up, online watch time flat), suspect a framing problem: the label isn't what users value, or the offline data is biased by the old system.

## A framing checklist for the first five minutes

1. Restate the product goal and the **user**.
2. Ask about **scale** (users, items, requests per second, latency budget).
3. Propose the **ML task**: input, output, type (classification / regression / ranking).
4. Name the **label source** and its biases.
5. Name **offline and online metrics**, plus guardrails (latency, diversity, fairness, safety).
6. Mention a **non-ML baseline**.
7. Constraints: privacy, explainability, freshness, cold start.

The ML system design framework page turns this into the full 45-minute structure.

## Interview angles

- "Design a model to reduce churn." Frame: predict P(churn in next 30 days) per user, act on the top-risk users with an intervention, and measure the *uplift* of the intervention (some users would stay anyway); that's a causal question, not just a prediction.
- "Why not optimise revenue directly?" Revenue is delayed, noisy and confounded; use proxies tied to it and validate in A/B tests.
- "Is this supervised?" Usually yes, with implicit labels; say what biases those labels carry.

--- revise
### When ML
? When is ML a good fit? :: Complex patterns, lots of data, changing patterns, tolerable mistakes, large scale.
? When do rules win? :: Known stable logic, tiny data, strict explainability or legal requirements.
? Why start with a heuristic baseline? :: Ship fast, get data flowing, and have something to beat.

### Learning types
? Supervised vs unsupervised vs RL? :: Labels given; structure without labels; actions with rewards.
? What is self-supervised learning? :: Labels created from the data itself (predict a hidden word); how LLMs pretrain.
? Multi-label vs multi-class output? :: Multi-label: independent sigmoids (several true). Multi-class: one softmax (exactly one true).

### Targets and labels
? Why is "clicks" a risky target? :: Rewards clickbait; clicks don't mean satisfaction.
? How do recommenders combine several targets? :: Multi-task model predicting several outcomes, combined into one score with weights tuned online.
? Four label sources? :: Implicit feedback, explicit feedback, human raters, weak/LLM labels (plus delayed labels like chargebacks).
? Main bias of implicit feedback? :: You only see reactions to what you showed: position and exposure bias.

### Metrics
? Three metric layers? :: Business metric, online feature metric (A/B), offline model metric.
? Offline AUC up but online flat: likely cause? :: The label/objective doesn't match user value, or offline data is biased by the old system.

--- notes
## Is it ML?
Use ML: complex, data-rich, changing, error-tolerant, huge scale.
Use rules: known stable logic, little data, must explain every decision.
Always propose a heuristic baseline first (Rules of ML #1).
## Learning types
Supervised (labels) · unsupervised (structure) · RL (rewards). Self-supervised = labels from data (LLM pretraining).
## Output types
Binary (+ threshold) · multi-class (softmax) · multi-label (sigmoids) · regression (maybe quantiles) · ranking.
## Targets
Clicks → clickbait. Watch time → long/compulsive. Likes → sparse.
Multi-task: score = combine P(click), E[watch], P(like), −P(dislike); weights tuned by A/B.
## Labels
Implicit (plentiful, biased) · explicit (clean, sparse) · raters (costly; check agreement) · delayed (fraud) · weak/LLM.
## Metrics
Business → online (A/B) → offline (log-loss, AUC, NDCG, RMSE). Name all three plus guardrails.
## First 5 minutes
Goal & user → scale & latency → task (in/out/type) → labels & bias → metrics & guardrails → baseline → constraints.

--- doubts
Q: How do I know whether to frame something as classification or ranking?
A: Ask what decision the output drives. If the system shows a list and only the order matters (feeds, search, recommendations), it's ranking: you care that good items come first, not about exact probabilities. If each item gets an independent yes/no action (block this email, flag this payment), it's classification with a threshold. Many ranking systems still train pointwise classifiers (P(click)) and sort by them, which is fine when the probabilities are well calibrated.

Q: Isn't predicting churn enough? Why do people talk about uplift?
A: Because the action matters, not the prediction. A user with 90% churn risk who will leave whatever you do is a waste of a discount; a user at 40% risk who stays *because* of the discount is the valuable one. Uplift modelling predicts the difference the action makes, which needs experimental data (some users randomly not treated).

Q: Is reinforcement learning used in real recommenders?
A: Partly. Most production recommenders are supervised (predict engagement, rank). Bandits (a simple form of RL) are common for exploration and for choosing among a few options (thumbnails, notification timing). Full RL that optimises long-term user value exists (YouTube published REINFORCE-based work) but is harder to train and evaluate safely.

--- exercises
[design] Frame "reduce the number of abusive comments people see on YouTube" as an ML problem: target, labels, metrics, baseline.
A: Task: binary classifier P(abusive | comment text, author history, video context), plus actions by threshold: hide automatically above a high threshold, send to human review in a middle band, show otherwise. Labels: user reports (noisy, biased toward popular videos), rater decisions on sampled comments (gold), appeals outcomes. Offline: PR-AUC and recall at fixed precision (rare positives). Online: abusive-comment views per thousand views (measured with rater sampling), false-hide rate via appeals, creator satisfaction. Baseline: keyword blocklist plus author reputation rules.

[choose] For estimating food delivery time, would you predict a single number or a distribution?
A: A distribution (or quantiles, e.g. 50th and 90th percentile), because the product shows a range ("25–35 min") and lateness costs more than earliness. Train with quantile (pinball) loss for each quantile, or predict a mean and variance with a Gaussian NLL. A single mean prediction can't tell you how often orders will be late.

[break] A news app trains a model on clicks and ships it. Clicks go up 8%, but a month later daily active users fall. What happened, and how would you reframe?
A: The model learned clickbait: high click-through, low satisfaction, so users came back less. Reframe the target as multi-task (click, dwell time beyond 30 s, return visit, hide/report), weight them toward long-term value, add guardrail metrics (return rate, hides) to A/B tests, and run longer experiments to catch delayed effects.

--- pitfalls
- Jumping to model architecture before stating the prediction target
- Optimising clicks or another easy proxy without guardrails
- Ignoring where labels come from and how they're biased
- Forgetting a non-ML baseline
- Not linking the offline metric to an online metric

--- quiz
Q: Which framing best fits "show each user a feed of posts"?
- Multi-class classification of users
- *Ranking candidate posts by predicted engagement for that user
- Clustering posts
- Regression of the number of posts
W: The decision is the order of items in a list.

Q: An item can have several tags at once (outdoor, family, music). What output layer fits?
- One softmax over tags
- *One sigmoid per tag (multi-label)
- A single regression output
- No output layer
W: Softmax forces exactly one class; independent sigmoids allow many.

Q: What is the main problem with training a recommender only on clicks?
- Clicks are too rare
- *It rewards clickbait that users don't actually value
- Clicks can't be logged
- Clicks are explicit feedback
W: Clicks are a weak proxy for satisfaction.

Q: Which is self-supervised learning?
- Raters label 10,000 images
- *Predicting masked words in unlabelled text
- Learning a policy from rewards
- Clustering customers
W: The labels (the hidden words) come from the data itself.

--- sources
- article :: Rules of Machine Learning: Best Practices for ML Engineering :: Martin Zinkevich, Google :: https://developers.google.com/machine-learning/guides/rules-of-ml
- course :: Problem Framing :: Google for Developers :: https://developers.google.com/machine-learning/problem-framing
- book :: Designing Machine Learning Systems (chapter 2) :: Chip Huyen :: https://www.oreilly.com/library/view/designing-machine-learning/9781098107956/
- paper :: Deep Neural Networks for YouTube Recommendations :: Covington, Adams, Sargin (2016) :: https://research.google/pubs/deep-neural-networks-for-youtube-recommendations/

=== bias-variance
blurb: What generalisation means, underfitting versus overfitting, the bias–variance decomposition derived, learning curves for diagnosis, and why huge neural networks break the old U-shaped picture (double descent).
signals: "Training accuracy 99%, test 70%: what's wrong?" | "Would more data help, or a bigger model?" | "Explain the bias–variance trade-off" | Reading learning curves in a debugging question
widgets: bias-variance

--- lesson
:::words
- **Generalisation**: doing well on new data the model hasn't seen, not just the training data.
- **Training error**: mistakes on the data used to fit the model. **Test error**: mistakes on fresh data.
- **Underfitting**: the model is too simple to capture the pattern; bad on training and test data.
- **Overfitting**: the model memorises noise in the training data; great on training, bad on test.
- **Bias**: error from wrong assumptions; a model too rigid to fit the truth.
- **Variance**: error from sensitivity to the particular training sample; a model that would change a lot with different data.
- **Capacity**: how complex a set of functions a model can represent.
- **Learning curve**: a plot of training and validation error as the amount of training data (or training time) grows.
:::

## The problem in plain words

The goal of learning is not to do well on the examples you have; it's to do well on the ones you **haven't seen yet**. A student who memorises last year's exam answers scores 100% on that paper and fails a new one. Models do the same. Every modelling decision (how big a model, how much regularisation, when to stop training) is a bet about how to get the best performance on unseen data, and the bias–variance picture is the map for those bets.

:::eli5
Throw darts at a target. **Bias** is when all your darts land in a tight group, but off to the left: you're consistently wrong. **Variance** is when they land all over the place around the centre: right on average, but each throw is unreliable. You want a tight group in the middle.
:::

## Underfitting and overfitting

Fit polynomials of increasing degree to 20 noisy points from a smooth curve:

- **Degree 1** (a straight line): can't bend, misses the curve. High training and test error: **underfitting, high bias**.
- **Degree 3–5**: follows the curve, ignores most noise. Low test error.
- **Degree 15**: passes through every training point, wiggling wildly between them. Near-zero training error, huge test error: **overfitting, high variance**.

Try it. Change the degree and the number of points, and resample the data to see which fits change a lot (high variance) and which stay put (high bias):

[[widget:bias-variance]]

## The decomposition

For squared error, the expected test error at a point $x$, averaged over all the training sets you might have drawn, splits exactly into three parts. Let the truth be $y = f(x) + \varepsilon$ with noise variance $\sigma^2$, and let $\hat f$ be the model fitted on a random training set:

$$\mathbb{E}\big[(y - \hat f(x))^2\big] = \underbrace{\big(f(x) - \mathbb{E}[\hat f(x)]\big)^2}_{\text{bias}^2} + \underbrace{\mathbb{E}\big[(\hat f(x) - \mathbb{E}[\hat f(x)])^2\big]}_{\text{variance}} + \underbrace{\sigma^2}_{\text{irreducible noise}}$$

The derivation: write $y - \hat f = (f - \bar f) + (\bar f - \hat f) + \varepsilon$ where $\bar f = \mathbb{E}[\hat f]$, square, and take expectations; the cross terms vanish because $\varepsilon$ has mean zero and is independent of the training set, and $\hat f - \bar f$ has mean zero by definition.

What it tells you:

- **Bias** falls as capacity grows (the model can bend to the truth).
- **Variance** rises with capacity (more ways to fit the noise) and falls with **more data** (each fit is pinned down more).
- **Noise** is a floor no model beats. If raters agree only 85% of the time, don't promise 95% accuracy.

The classical picture: test error is U-shaped in model complexity; the sweet spot balances bias and variance.

## Diagnosing with learning curves

Plot training and validation error against training-set size:

| Pattern | Diagnosis | What helps | What doesn't |
|---|---|---|---|
| Both errors high and close together | **High bias** (underfitting) | Bigger model, better features, less regularisation, train longer | More data |
| Training error low, validation much higher, gap shrinking slowly | **High variance** (overfitting) | More data, regularisation, augmentation, simpler model, early stopping | Bigger model |
| Both low and close | Good fit | Ship it, monitor | |

Andrew Ng's practical version: compare training error to **human-level (or best achievable) error** to measure "avoidable bias", and validation to training error to measure variance; fix whichever is bigger first.

## Double descent: why huge networks don't fit the U

Modern deep networks often have far more parameters than training examples and still generalise well. Plotting test error against model size shows **double descent**: the classic U, then a peak right where the model can just barely fit every training point (the **interpolation threshold**), then test error falls *again* as the model grows further. The explanation (an active research area): among the many functions that fit the data perfectly, gradient descent with standard initialisation tends to find smooth, "simple" ones (an **implicit regularisation**), and bigger models have more such smooth solutions available.

Practical consequences you can say in interviews:

- "More parameters always overfit" is false for deep learning; **data, regularisation and training procedure** matter more than raw parameter count.
- Near the interpolation threshold, performance can get worse with more data or a bigger model. If adding capacity hurts, go much bigger or regularise.
- For **tabular** data with thousands of rows, the classical picture still holds well: gradient-boosted trees with tuned regularisation usually beat huge networks.

## Ensembles reduce variance

Averaging $k$ models with independent errors divides the variance part by $k$ without changing bias. Real models' errors are correlated, so the gain is smaller, but this is why **bagging** and **random forests** (many high-variance trees, averaged) work, and why Kaggle winners ensemble. **Boosting** works the other way: it reduces bias by adding models that fix the current ensemble's mistakes.

## Interview angles

- "Training 99%, test 70%." Overfitting (or a train/test distribution mismatch, or leakage making training look easy). Check the split first, then regularise, augment, get more data.
- "Training 72%, test 70%, humans get 95%." High bias. Bigger model, better features, train longer; more data won't help much.
- "Would doubling the data help?" Look at the learning curve's validation error: still falling → yes; flat → no.

--- revise
### Concepts
? Generalisation? :: Doing well on unseen data, not just training data.
? Underfitting signature? :: High training and test error, close together (high bias).
? Overfitting signature? :: Low training error, much higher test error (high variance).
? Bias in plain words? :: Consistent error from a model too rigid to fit the truth.
? Variance in plain words? :: Error from the fit changing a lot with the particular training sample.

### Decomposition
? Expected squared error decomposition? :: Bias² + variance + irreducible noise σ².
? How does capacity affect bias and variance? :: More capacity: lower bias, higher variance.
? How does more data affect them? :: Lowers variance; doesn't fix bias.
? What sets the floor? :: Irreducible noise (e.g. label disagreement).

### Diagnosis and modern view
? Both errors high and close: fix? :: Bigger model, better features, less regularisation, train longer.
? Big gap between train and validation: fix? :: More data, regularisation, augmentation, early stopping, simpler model.
? What is double descent? :: Test error rises near the interpolation threshold, then falls again as models grow much larger.
? Why do over-parameterised nets generalise? :: Implicit regularisation: gradient descent tends to find smooth solutions among many that fit.
? How do ensembles help? :: Averaging reduces variance (bagging); boosting reduces bias.

--- notes
## Definitions
Generalise = good on unseen data. Underfit = high bias. Overfit = high variance.
Darts: bias = consistently off-centre; variance = scattered.
## Decomposition
E[(y − f̂)²] = bias² + variance + σ². Cross terms vanish (noise independent, f̂ − E f̂ mean 0).
Capacity ↑ → bias ↓, variance ↑. Data ↑ → variance ↓.
Noise floor: label disagreement caps accuracy.
## Learning curves
Both high, close → high bias → bigger model/features/less reg/longer training; more data won't help.
Big gap → high variance → more data/reg/augmentation/early stop/simpler.
Compare to human-level error: avoidable bias vs variance; fix the bigger.
## Modern
Double descent: peak at interpolation threshold, then falls with more capacity.
Implicit regularisation of SGD → smooth solutions.
Tabular small data: classical picture, GBDTs win.
## Ensembles
Bagging/averaging ↓ variance (random forests). Boosting ↓ bias.

--- doubts
Q: If bias and variance trade off, how can a bigger network be better on both?
A: The trade-off is a tendency for a fixed amount of data and a fixed type of model, not a law. Better architectures, more data, and implicit regularisation from SGD can lower both at once. Double descent is the visible symptom: past the interpolation threshold, adding capacity reduces variance too, because gradient descent picks smoother fits.

Q: Is overfitting only about model size?
A: No. It's about how much the model can memorise relative to the information in the data: training too long, too many features relative to examples, too little regularisation, a duplicated test set, or tuning hyperparameters on the test set (overfitting the evaluation) all count.

Q: How do I measure bias and variance on a real model, when I don't know the true function?
A: You can't compute them exactly, but proxies work: training error versus the best achievable error (human level, or a strong model) approximates bias; the gap between validation and training error approximates variance. Retraining with different seeds or bootstrap samples and seeing how much predictions change also estimates variance directly.

Q: Does the bias–variance decomposition apply to classification?
A: The clean three-term formula is for squared error. For 0–1 loss there are analogous but messier decompositions. The intuition (rigid models are consistently wrong, flexible ones are erratic, more data calms erratic ones) carries over fully.

--- exercises
[break] Your model gets 98% training accuracy and 97% validation accuracy, but 81% in production. What does the learning-curve view say, and what else should you check?
A: Training and validation agree, so it isn't classic overfitting; the problem is a distribution gap between your validation data and production (data drift, training–serving skew, a leaky split that made validation look like training). Check that the validation set is drawn from recent production-like data with a time-based split, and compare feature distributions between training and serving.

[choose] Your learning curve shows validation error still falling steeply at your current 50,000 examples. Labelling 50,000 more costs about as much as two engineers for a month. Model work or labels?
A: Labels. A steep validation curve means variance dominates and more data pays off directly. Estimate the gain by extrapolating the curve (often a power law); if doubling data looks like it cuts error 15–20% and engineering tweaks typically give a few percent, labelling is the better bet. Also consider cheaper data: augmentation, weak labels, active learning (label the most uncertain examples first).

[estimate] Raters label the same 1,000 images and agree with each other 88% of the time. Your model agrees with the majority label 86% of the time. How much room is left?
A: Rater disagreement suggests label noise on the order of 12%, so the best achievable agreement is around 88–92% (majority labels are a bit cleaner than single raters). The model is within a few points of the noise floor; big gains need cleaner labels (better guidelines, more raters per item), not a bigger model.

--- pitfalls
- Adding data to fix a high-bias model
- Making the model bigger to fix overfitting on small tabular data
- Ignoring the irreducible-noise floor when setting targets
- Diagnosing from a single train/test number instead of a learning curve
- Assuming more parameters always means more overfitting in deep learning

--- quiz
Q: Training error 2%, validation error 25%. Most likely diagnosis?
- High bias
- *High variance (overfitting)
- Irreducible noise
- A perfect fit
W: A large train–validation gap is the variance signature.

Q: Which part of expected error can no model remove?
- Bias
- Variance
- *Irreducible noise
- The cross term
W: Noise in the labels themselves sets a floor.

Q: Both training and validation error are high and close. What is least likely to help?
- A bigger model
- Better features
- *More training data
- Less regularisation
W: More data reduces variance, which isn't the problem.

Q: What does double descent describe?
- Loss going down twice per epoch
- *Test error peaking near the interpolation threshold, then falling again as models grow larger
- Learning rate decaying twice
- Two validation sets
W: Over-parameterised models can generalise better than mid-sized ones.

Q: Random forests mainly reduce which error component?
- Bias
- *Variance
- Noise
- None
W: Averaging many decorrelated high-variance trees reduces variance.

--- sources
- book :: The Elements of Statistical Learning (sections 2.9, 7.3) :: Hastie, Tibshirani, Friedman :: https://hastie.su.domains/ElemStatLearn/
- paper :: Reconciling modern machine learning practice and the bias–variance trade-off :: Belkin et al. (2019) :: https://arxiv.org/abs/1812.11118
- paper :: Deep Double Descent :: Nakkiran et al., OpenAI (2019) :: https://arxiv.org/abs/1912.02292
- book :: Machine Learning Yearning :: Andrew Ng :: https://info.deeplearning.ai/machine-learning-yearning-book

=== validation-leakage
blurb: Train, validation and test splits and what each is for, k-fold and time-based cross-validation, grouping, the many forms of data leakage, and how to keep evaluation honest when you tune.
signals: "How would you split the data?" | "Offline results were amazing, production was terrible" | Any time-series, user-level or fraud problem | "How do you tune hyperparameters without overfitting?"
prereq: bias-variance

--- lesson
:::words
- **Training set**: data the model learns from. **Validation set**: data for choosing models and settings. **Test set**: data touched once, at the end, for an honest final number.
- **Hyperparameter**: a setting chosen by you, not learned (learning rate, tree depth, regularisation strength).
- **Cross-validation (CV)**: splitting the data several ways and averaging results, so every example gets used for validation once.
- **Data leakage**: information in training that wouldn't be available at prediction time, making offline results look far better than reality.
- **Temporal split**: training on the past and validating on the future.
- **Group split**: keeping all examples from one user, patient or session on the same side of the split.
:::

## The problem in plain words

You can only trust a model's score if it was measured on data the model, and you, didn't use to make decisions. Every time you peek at a score and change something, that data becomes a little bit "training data". And the most common reason ML projects fail in production isn't a bad model; it's an evaluation that accidentally let the answers leak in, so the offline number was a fantasy.

:::eli5
A teacher writes a practice exam (validation) and a final exam (test). If students see the final while studying, their score means nothing. Leakage is worse: it's like the exam sheet having the answers printed faintly on the back, and nobody noticing.
:::

## Three sets, three jobs

- **Training** (often 70–80%): fit the parameters.
- **Validation** (10–15%): compare models, tune hyperparameters, pick the epoch to stop at.
- **Test** (10–15%): estimate performance on truly new data. Touch it **once**. If you go back and tweak after seeing the test score, it has become a validation set and you need a new test set.

With millions of examples, a 98/1/1 split is fine: 1% of 10 million is 100,000 examples, plenty for a tight confidence interval (statistics page). With small data, use cross-validation.

## Cross-validation

**k-fold CV**: split into $k$ folds (5 or 10); train $k$ times, each time validating on a different fold; average. It uses all data for both training and validation and also tells you the **variance** of your estimate across folds. Variants:

- **Stratified k-fold**: each fold keeps the class proportions; essential with rare positives.
- **Group k-fold**: all rows of one user (or patient, device, document) stay in one fold.
- **Nested CV**: an inner loop tunes hyperparameters, an outer loop estimates the error of the whole tuning procedure. Prevents the optimistic bias of reporting the best inner score.

Deep learning rarely uses k-fold (training is too expensive); one validation set plus seeds is typical.

## Time changes everything

If the data has a time order (fraud, demand, ads, recommendations, anything in production), a **random** split lets the model train on the future and predict the past. It sees "next week's" trends, accounts that later turned out fraudulent, and items' later popularity. Always ask "when would this prediction be made?" and split by time:

- **Hold-out by time**: train on weeks 1–8, validate on week 9, test on week 10.
- **Rolling / expanding window** (time-series CV): train on months 1–3 → test 4; train 1–4 → test 5; and so on.
- Leave a **gap** between train and test when labels mature slowly (a chargeback takes 60 days to arrive: don't train on transactions whose labels aren't final).

## Leakage, the silent killer

Leakage is any path by which the training features contain information about the label that won't exist at prediction time. Classic cases:

1. **Target leakage**: a feature computed *after* the outcome. "Number of support tickets" predicting churn, when tickets are filed after cancelling. "Was refunded" predicting fraud.
2. **Temporal leakage**: random splits on time-ordered data; features aggregated over a window that includes the future ("user's total purchases this month" for a prediction made mid-month).
3. **Group leakage**: the same patient's scans in train and test, so the model recognises the patient, not the disease. Near-duplicate images or re-uploaded videos across splits.
4. **Preprocessing leakage**: fitting the scaler, imputer, PCA or vocabulary on the **whole** dataset before splitting. The test set's statistics leak into training. Fit transforms on training data only (use pipelines).
5. **Label-in-feature leakage**: an ID or timestamp that correlates with the label by accident (all positives were collected on one day; the hospital's scanner model reveals the diagnosis).
6. **Evaluation leakage**: tuning on the test set; selecting features using all the data.

Red flags: offline results that look too good (AUC 0.99 on a hard problem), one feature with enormous importance, performance that collapses in shadow mode. A good habit: for every feature, write down **when it becomes known** relative to the prediction time.

## Keeping it honest in production

- Compute training features with the **same code and point-in-time data** as serving (log features at prediction time, or use a feature store with point-in-time joins; feature-engineering page).
- Evaluate on a slice of **recent** data that looks like what the model will face.
- Before launch, run in **shadow mode** (predict silently on live traffic) and compare with offline estimates.
- Track performance **by slice** (country, device, new vs returning users); an average can hide a broken segment.

## Interview angles

- "How do you split?" Always start with: is there time order, and are there groups? Then: temporal + grouped split, a gap for label maturity, stratification for rare classes.
- "Offline great, online bad." Leakage, training–serving skew, distribution shift, or a feedback loop (the old model chose the data). Check features' timestamps first.
- "How do you tune without overfitting?" Validation set or CV for tuning, untouched test set for the final number, nested CV for small data, and don't report the best of 200 runs as the expected result.

--- revise
### Splits
? Jobs of train, validation and test sets? :: Fit parameters; choose models and hyperparameters; one final honest estimate.
? What happens if you tune after seeing the test score? :: The test set becomes a validation set; you need a fresh test set.
? When is 98/1/1 fine? :: With millions of examples: 1% is still enough for tight intervals.

### Cross-validation
? k-fold CV? :: Train k times, each validating on a different fold; average (and see the spread).
? Stratified k-fold? :: Folds keep class proportions; needed for rare classes.
? Group k-fold? :: All rows of a user/patient stay in one fold.
? Nested CV? :: Inner loop tunes, outer loop estimates the error of the tuning procedure.

### Time and leakage
? Why not random splits on time-ordered data? :: The model trains on the future; offline scores become optimistic.
? Why leave a gap between train and test? :: Labels that mature slowly (chargebacks) aren't final near the boundary.
? Target leakage example? :: A feature recorded after the outcome, e.g. refund status predicting fraud.
? Preprocessing leakage? :: Fitting scalers/imputers/vocabularies on all data before splitting.
? Group leakage example? :: The same patient or near-duplicate items in train and test.
? Leakage red flags? :: Too-good offline scores, one dominant feature, collapse in shadow mode.
? Habit that prevents most leakage? :: For each feature, record when it becomes known relative to prediction time.

--- notes
## Sets
Train = fit. Validation = choose/tune/early stop. Test = once, at the end.
Big data: 98/1/1 OK. Small data: CV.
## CV
k-fold (5–10): average + spread. Stratified for rare classes. Group for users/patients.
Nested CV: inner tunes, outer evaluates the tuning.
Deep learning: one validation set + several seeds.
## Time
Split by time: past → future. Rolling/expanding windows for time series.
Gap for slow labels (chargebacks ~60 days).
## Leakage types
Target (feature after outcome) · temporal (future aggregates) · group (same entity both sides, near-duplicates)
Preprocessing (fit transforms on all data) · accidental IDs/timestamps · evaluation (tuning on test).
Red flags: AUC too good, one giant feature, shadow-mode collapse.
Habit: note when each feature becomes known.
## Production honesty
Same feature code + point-in-time data for training and serving.
Evaluate on recent data; shadow mode; per-slice metrics.

--- doubts
Q: Why can't I just use the test set for tuning if I only check it a few times?
A: Each check leaks a little. If you try 20 settings and pick the one with the best test score, you've selected partly on noise, so that best score overestimates real performance. With a large test set and few looks the bias is small, but the habit causes real problems; keep the test set for the end.

Q: Is cross-validation always better than one validation set?
A: For small datasets, yes: it uses data efficiently and shows variance. For large ones a single big validation set is accurate enough and k-fold multiplies training cost by k. For time-ordered data, ordinary k-fold is wrong anyway: use time-based folds.

Q: Fitting a scaler on the whole dataset seems harmless. How much can it matter?
A: For a mean/variance scaler on a big dataset, very little. For things that learn more from the data (target encoding of categories, PCA, a vocabulary, imputing with label-aware statistics, oversampling with SMOTE before splitting) it can inflate scores badly. Target encoding before splitting is a notorious one: each category's encoding contains its own rows' labels.

Q: What's the difference between leakage and overfitting?
A: Overfitting means the model memorised noise, and an honest validation set reveals it. Leakage means the validation set itself is contaminated, so it *hides* the problem. Overfitting gives a big train–validation gap; leakage gives a great validation score and a disappointing production one.

--- exercises
[design] You're predicting whether a loan applicant will default within 12 months, using 5 years of loan history. Describe the split.
A: Temporal: train on loans issued in years 1–3, validate on year 4, test on the first half of year 5, but only loans whose 12-month outcome is known (so issued at least 12 months before the data cut-off). Group by applicant so repeat borrowers don't appear on both sides. Stratify or at least check the default rate in each split. Features must be point-in-time: only what was known on the application date.

[break] A hospital model detecting pneumonia from chest X-rays scores AUC 0.97 offline and 0.75 at a second hospital. Name three possible leaks or shifts.
A: Group leakage (the same patients' scans in train and test), a confounder that identifies the source (portable scanners used for sicker patients; hospital-specific markers or text burned into the image), and label or population shift between hospitals (different disease rates, equipment, protocols). Fix with patient-level splits, external validation on other hospitals, and checks that the model looks at the lungs (saliency) rather than markers.

[choose] Your fraud model uses "number of transactions by this card in the last 24 hours". In training, the feature is computed from the full transaction table. Is that safe?
A: Only if it's computed point-in-time: counting transactions in the 24 hours *before* each transaction's timestamp, excluding itself and anything after. Computed naively from the final table (for example "transactions that day"), it includes later transactions, which often spike after fraud is detected. Use the same streaming aggregation logic as serving, or a feature store with point-in-time joins.

--- pitfalls
- Random splits on time-ordered data
- Letting the same user, patient or near-duplicate item appear in train and test
- Fitting preprocessing (scalers, target encodings, vocabularies) before splitting
- Repeatedly tuning on the test set
- Trusting an offline score that is too good to be true

--- quiz
Q: You're predicting next week's demand. Which split is right?
- Random 80/20
- Stratified by product
- *Train on earlier weeks, validate and test on later weeks
- Leave-one-out
W: Random splits let the model learn from the future.

Q: Which is target leakage when predicting customer churn?
- Account age
- Plan type
- *Whether the customer requested a cancellation-fee refund
- Region
W: That only happens after (or because) they churned.

Q: When should you fit a feature scaler?
- On all data before splitting
- On the test set
- *On the training data only, then apply it to validation and test
- Never
W: Fitting on all data leaks test statistics.

Q: The same user's sessions appear in both training and validation. What split fixes it?
- Stratified
- *Group split by user
- Larger validation set
- Shuffle twice
W: Group splits keep each user on one side.

Q: Your offline AUC is 0.99 on a problem where the best published result is 0.80. Most likely?
- A breakthrough
- *Leakage in the features or the split
- Underfitting
- Too much regularisation
W: Too-good-to-be-true scores are the first leakage red flag.

--- sources
- article :: Leakage in data mining: formulation, detection, and avoidance :: Kaufman, Rosset, Perlich (KDD 2011) :: https://dl.acm.org/doi/10.1145/2020408.2020496
- article :: Cross-validation: evaluating estimator performance :: scikit-learn documentation :: https://scikit-learn.org/stable/modules/cross_validation.html
- book :: Designing Machine Learning Systems (chapter 6) :: Chip Huyen :: https://www.oreilly.com/library/view/designing-machine-learning/9781098107956/
- paper :: Leakage and the reproducibility crisis in ML-based science :: Kapoor, Narayanan (2023) :: https://reproducible.cs.princeton.edu/

=== loss-functions
blurb: The losses you will be asked about, derived from what each assumes about the data: squared, absolute, Huber and quantile for regression; log-loss, softmax cross-entropy, hinge and focal for classification; ranking and contrastive losses; with their gradients and when each one breaks.
signals: "Which loss would you use and why?" | "Derive the gradient of cross-entropy" | Outliers in regression targets | Rare positives or ranking objectives
widgets: loss-shapes
prereq: probability-ml, calculus-gradients

--- lesson
:::words
- **Loss**: a number saying how wrong one prediction is. Training minimises the average loss (the **cost** or **objective**).
- **Logit**: the raw score a model outputs before turning it into a probability. A logit of 0 means 50%.
- **Margin**: for a ±1 label $y$ and score $s$, the product $ys$: positive when the prediction is on the right side, larger when it's more confidently right.
- **Robust**: barely affected by a few extreme values (outliers).
- **Calibrated**: predicted probabilities match reality; of all items predicted 30%, about 30% are positive.
- **Surrogate loss**: a smooth stand-in for a metric you can't optimise directly (accuracy, NDCG).
:::

## The problem in plain words

A model learns by making its loss smaller, so **the loss is the definition of "good"** from the model's point of view. Choose squared error and the model will chase outliers; choose log-loss and it will produce calibrated probabilities; choose a ranking loss and it will care about order, not exact values. Interviewers ask "which loss?" because the answer reveals whether you understand what the model will actually learn.

:::eli5
Grading a darts game: squared error charges you the distance squared, so one wild throw costs a fortune and you'll play it safe toward the middle. Absolute error charges by plain distance, so a single wild throw matters less. You'll throw differently under each rule; so does a model.
:::

## Regression losses

| Loss | Formula (error $e = y - \hat y$) | Assumes | Predicts the | Behaviour |
|---|---|---|---|---|
| **Squared (MSE, L2)** | $e^2$ | Gaussian noise | **mean** | Smooth; outliers dominate (gradient $\propto e$) |
| **Absolute (MAE, L1)** | $\lvert e \rvert$ | Laplace noise | **median** | Robust; gradient constant size, not smooth at 0 |
| **Huber** | $\tfrac12 e^2$ if $\lvert e\rvert \le \delta$, else $\delta(\lvert e\rvert - \tfrac12\delta)$ | Gaussian core, heavy tails | between | Quadratic near 0, linear for outliers |
| **Quantile (pinball)** | $\max(\tau e, (\tau - 1)e)$ | | **τ-quantile** | Asymmetric; τ = 0.9 penalises under-prediction 9× more |
| **Poisson NLL** | $\hat\lambda - y\log\hat\lambda$ | counts | rate | For non-negative counts |
| **Log-cosh, MAPE, RMSLE** | | | | Niche: smooth Huber; relative errors; skewed targets |

Why the mean versus median: minimising $\sum (y_i - c)^2$ over a constant $c$ gives the average; minimising $\sum |y_i - c|$ gives the median. One house sold for 100 million shifts the mean of a neighbourhood a lot and its median not at all. For delivery ETA, quantile loss lets you predict "90% of orders arrive by" directly. For skewed targets (prices, durations), predicting $\log y$ with MSE is often better than raw MSE.

## Classification losses

**Binary cross-entropy (log-loss).** With logit $z$, $p = \sigma(z)$ and $y \in \{0, 1\}$:

$$L = -[\,y\log p + (1-y)\log(1-p)\,]$$

Its gradient with respect to the logit is beautifully simple. Using $\sigma'(z) = p(1-p)$:

$$\frac{\partial L}{\partial z} = -\frac{y}{p}\,p(1-p) + \frac{1-y}{1-p}\,p(1-p) = -y(1-p) + (1-y)p = p - y$$

Large when confidently wrong, zero when right. It's a **proper scoring rule**: it is minimised by predicting the true probability, which is why log-loss-trained models are well calibrated (if not over-trained). Compute it from logits ("with logits" functions) for numerical stability.

**Softmax cross-entropy** for $K$ classes: $p_k = e^{z_k} / \sum_j e^{z_j}$ and $L = -\log p_{\text{true}}$. Gradient: $\partial L / \partial z_k = p_k - y_k$. Language models use exactly this with $K$ = vocabulary size (~100,000), once per token. **Label smoothing** replaces the one-hot target with $1 - \epsilon$ on the true class and $\epsilon / K$ elsewhere, discouraging over-confident logits (common in vision and translation).

**Hinge loss** (SVMs): with $y \in \{-1, +1\}$ and score $s$, $L = \max(0, 1 - ys)$. Zero once the margin exceeds 1: it stops caring about examples that are already correct with margin, so it doesn't produce probabilities.

**Focal loss** (from object detection): $L = -(1 - p_t)^\gamma \log p_t$, where $p_t$ is the probability of the true class. With $\gamma = 2$, an easy example at $p_t = 0.9$ is down-weighted 100×, so thousands of easy background examples don't drown out the few hard ones. Used for extreme imbalance.

Compare their shapes as a function of the margin, and see how each treats an outlier or a confidently-wrong example:

[[widget:loss-shapes]]

## Why not MSE for classification?

With a sigmoid output, MSE's gradient is $2(p - y)\,p(1-p)$. When the model is confidently wrong ($p \approx 0$ for a positive), $p(1-p) \approx 0$, so the gradient vanishes exactly when you most need to learn. Cross-entropy's $\log$ cancels that factor, giving $p - y$. MSE on probabilities also isn't the likelihood of a Bernoulli model, so its outputs aren't naturally calibrated.

## Ranking and similarity losses

Metrics like NDCG depend on sorted order, which has no useful gradient, so we use surrogates:

- **Pointwise**: treat each item independently (log-loss on click / no click). Simple, calibrated, ignores order.
- **Pairwise**: for a pair where item $i$ should beat item $j$, $L = \log(1 + e^{-(s_i - s_j)})$ (RankNet, BPR). Learns order directly.
- **Listwise**: softmax over the whole list, $L = -\sum_i y_i \log \text{softmax}(s)_i$ (ListNet), or weights pairs by how much swapping them changes NDCG (LambdaRank / LambdaMART).
- **Contrastive / InfoNCE**: pull a query and its positive together, push in-batch negatives away: $L = -\log \frac{e^{\text{sim}(q, k^+)/\tau}}{\sum_j e^{\text{sim}(q, k_j)/\tau}}$. Trains embedding models and two-tower retrievers (embeddings chapter).
- **Triplet loss**: $\max(0, d(a, p) - d(a, n) + m)$: the positive must be closer than the negative by margin $m$. Face recognition (FaceNet).

## Matching loss to the problem

| Situation | Loss |
|---|---|
| Regression, symmetric errors, few outliers | MSE (maybe on $\log y$) |
| Outliers or heavy-tailed noise | Huber or MAE |
| Need a percentile (SLA, ETA ranges) | Quantile loss |
| Binary probabilities you'll threshold or combine | Log-loss (with logits) |
| Many classes | Softmax cross-entropy (+ label smoothing) |
| Extreme imbalance, dense detection | Focal loss or class weights |
| Rank items in a list | Pairwise / listwise (or pointwise log-loss if calibration matters) |
| Learn embeddings | InfoNCE (in-batch negatives), triplet |
| Several objectives | Weighted sum of per-task losses (tune or learn the weights) |

## Interview angles

- "Derive the gradient of log-loss." Do it as above in under two minutes: $p - y$ times the input for logistic regression.
- "Your regression targets have outliers from bad sensors." Huber, or clean the data; MSE would bend toward them.
- "Why do recommenders still use pointwise log-loss when they care about ranking?" Calibrated probabilities can be combined across objectives and used in auctions (ads need a real P(click) to price); pairwise losses lose calibration.

--- revise
### Regression
? MSE predicts which statistic, MAE which? :: MSE → mean; MAE → median.
? Why is MSE sensitive to outliers? :: Gradient grows with the error, so large errors dominate.
? Huber loss? :: Quadratic for small errors, linear for large: smooth and robust.
? Quantile loss with τ = 0.9? :: Penalises under-prediction 9× more than over-prediction; predicts the 90th percentile.
? Skewed positive targets? :: Model log y, or use Poisson/Tweedie losses for counts.

### Classification
? Binary cross-entropy gradient w.r.t. the logit? :: p − y.
? Softmax cross-entropy gradient? :: $p_k - y_k$ for each class.
? Why compute losses from logits? :: Numerical stability (avoids log 0 and overflow).
? What is a proper scoring rule? :: A loss minimised by predicting the true probability: log-loss gives calibration.
? Hinge loss? :: max(0, 1 − ys): zero beyond margin 1; no probabilities.
? Focal loss? :: $-(1-p_t)^\gamma\log p_t$: down-weights easy examples for extreme imbalance.
? Label smoothing? :: Soften one-hot targets (1 − ε true, ε/K others) to curb over-confidence.
? Why not MSE for classification? :: Sigmoid factor makes gradients vanish when confidently wrong; not the Bernoulli likelihood.

### Ranking and embeddings
? Pointwise, pairwise, listwise? :: Per item; per ordered pair (RankNet/BPR); whole list (ListNet, LambdaMART).
? InfoNCE? :: Softmax over similarities: pull the positive close, push in-batch negatives away; temperature τ.
? Triplet loss? :: max(0, d(a,p) − d(a,n) + margin).

--- notes
## Regression
MSE: Gaussian, mean, outlier-sensitive (grad ∝ e). MAE: Laplace, median, robust.
Huber: quadratic inside δ, linear outside. Quantile τ: asymmetric, predicts τ-quantile.
Skewed: predict log y; counts: Poisson NLL.
## Classification
BCE = −[y log p + (1−y) log(1−p)]; ∂L/∂z = p − y. Use with-logits versions.
Softmax CE = −log p_true; ∂/∂z_k = p_k − y_k. LLMs: K = vocab, per token.
Proper scoring → calibrated. Label smoothing ε curbs over-confidence.
Hinge max(0, 1 − ys): margins, no probabilities.
Focal (1−p_t)^γ: γ=2 cuts easy examples ~100×.
MSE on sigmoid: gradient × p(1−p) vanishes when confidently wrong.
## Ranking & embeddings
Pointwise (calibrated) · pairwise log(1+e^−(si−sj)) · listwise (ListNet, LambdaMART).
InfoNCE: −log e^{sim+/τ} / Σ e^{sim/τ}; in-batch negatives.
Triplet: d(a,p) − d(a,n) + m.
## Choosing
Outliers → Huber. Percentiles → quantile. Thresholds/auctions → log-loss. Imbalance → focal/weights.
Multi-task → weighted sum of losses.

--- doubts
Q: If I care about accuracy, why not optimise accuracy directly?
A: Accuracy is a step function of the predictions: tiny weight changes usually don't change any prediction, so its gradient is zero almost everywhere and undefined at the jumps. Log-loss is a smooth surrogate whose improvements usually improve accuracy too, and it also gives you calibrated probabilities for choosing thresholds later.

Q: Should I use class weights or focal loss for imbalanced data?
A: Try class weights first: simple, one hyperparameter (often inverse frequency, square-rooted). Focal loss helps when the problem is many *easy* negatives swamping training (dense object detection). Both distort calibration, so recalibrate predictions afterwards if you need real probabilities. Often the better fix is evaluating with the right metric and choosing a threshold, not changing the loss (class-imbalance page).

Q: What does the temperature τ in InfoNCE do?
A: It sharpens or softens the softmax over similarities. Small τ (0.05) makes the loss focus hard on the most similar negatives, giving well-separated embeddings but risking instability; large τ treats all negatives more equally. CLIP learns τ as a parameter.

Q: Why does label smoothing help if it makes the targets "wrong"?
A: With one-hot targets, cross-entropy keeps pushing the correct logit toward infinity, so models become over-confident and logits grow without bound. Smoothing gives a finite optimum, improving calibration and often generalisation. It can hurt knowledge distillation, because the teacher's informative "dark knowledge" about similar classes gets flattened.

--- exercises
[estimate] A positive example gets logit −3. Compute its log-loss and the gradient with respect to the logit. Then do the same if the model used MSE on the sigmoid output.
A: $p = \sigma(-3) \approx 0.047$. Log-loss $= -\log 0.047 \approx 3.05$; gradient $p - y = -0.953$. MSE: loss $(1 - 0.047)^2 \approx 0.91$; gradient $2(p - 1)\,p(1-p) \approx 2(-0.953)(0.045) \approx -0.086$, about 11× smaller. Cross-entropy learns much faster from confident mistakes.

[choose] You predict delivery times; late deliveries cost the business five times more than early ones. Which loss?
A: Quantile (pinball) loss with $\tau = 5/6 \approx 0.83$: the asymmetric penalty makes the optimal prediction the 83rd percentile, which minimises expected cost when under-prediction costs 5× more. Or train several quantiles (0.5 and 0.9) to show a range.

[design] Write the forward pass and gradient of a numerically stable binary cross-entropy from logits in NumPy.
A: `loss = np.maximum(z, 0) - z * y + np.log1p(np.exp(-np.abs(z)))`, averaged over the batch; gradient with respect to `z`: `(1 / (1 + np.exp(-z)) - y) / n`. The `max`/`abs` form never exponentiates a large positive number, so it can't overflow, and `log1p` keeps precision when the exponential is tiny.

--- pitfalls
- MSE on targets with outliers or on probabilities
- Computing log(sigmoid(z)) separately instead of a with-logits loss
- Treating focal or weighted loss outputs as calibrated probabilities
- Optimising a ranking surrogate when downstream needs calibrated probabilities (auctions)
- Forgetting to weight multi-task losses so one task doesn't dominate

--- quiz
Q: Which loss makes the model predict the median?
- Squared error
- *Absolute error
- Log-loss
- Hinge loss
W: The constant minimising the sum of absolute deviations is the median.

Q: What is the gradient of binary cross-entropy with respect to the logit?
- y − p
- *p − y
- p(1 − p)
- log p
W: The sigmoid's derivative cancels with the log's.

Q: You need the 95th-percentile latency prediction. Which loss?
- MSE
- Huber
- *Quantile loss with τ = 0.95
- Hinge
W: Pinball loss at τ predicts the τ-quantile.

Q: What problem does focal loss target?
- Outliers in regression
- *Many easy negatives overwhelming the few hard examples
- Calibration
- Ranking order
W: The (1 − p_t)^γ factor shrinks the loss of easy examples.

Q: Why do ad systems often keep pointwise log-loss instead of a pairwise ranking loss?
- Pairwise losses can't be trained
- *Auctions and score combination need calibrated click probabilities
- Log-loss ignores clicks
- Pairwise is always worse
W: Bids are multiplied by P(click), so the probability must be real.

--- sources
- book :: Deep Learning (sections 5.5 and 6.2) :: Goodfellow, Bengio, Courville :: https://www.deeplearningbook.org/contents/mlp.html
- paper :: Focal Loss for Dense Object Detection :: Lin et al., FAIR (2017) :: https://arxiv.org/abs/1708.02002
- paper :: From RankNet to LambdaRank to LambdaMART: An Overview :: Christopher Burges, Microsoft Research (2010) :: https://www.microsoft.com/en-us/research/publication/from-ranknet-to-lambdarank-to-lambdamart-an-overview/
- paper :: Representation Learning with Contrastive Predictive Coding (InfoNCE) :: van den Oord et al., DeepMind (2018) :: https://arxiv.org/abs/1807.03748

=== regularisation
blurb: Everything that stops a model from memorising: L2 (weight decay) and L1 penalties and why L1 gives zeros, elastic net, early stopping, data augmentation, dropout, ensembling, and how to tune regularisation strength.
signals: "The model overfits; what would you do?" | "L1 or L2, and why does L1 give sparse weights?" | "What's the difference between L2 regularisation and weight decay?" | Small datasets with many features
widgets: regularisation-paths
prereq: bias-variance, loss-functions

--- lesson
:::words
- **Regularisation**: anything that makes a model prefer simpler solutions, so it generalises better.
- **Penalty**: an extra term added to the loss that grows when weights are large or many.
- **L2 penalty** (ridge, weight decay): adds $\lambda \sum w_i^2$; shrinks all weights smoothly.
- **L1 penalty** (lasso): adds $\lambda \sum |w_i|$; pushes some weights to exactly zero.
- **λ (lambda)**: the regularisation strength, a hyperparameter.
- **Sparse**: mostly zeros. A sparse model uses few features.
- **Early stopping**: stopping training when validation error starts rising.
- **Augmentation**: creating extra training examples by transforming existing ones (flips, crops, paraphrases).
- **Dropout**: randomly switching off units during training so the network can't rely on any one of them.
:::

## The problem in plain words

A flexible model can fit the training data in countless ways, including ways that memorise noise. Regularisation tilts the choice toward **simpler** fits that are more likely to hold on new data. "Simple" can mean small weights, few features, a model that doesn't depend on any single input, or one that's robust to harmless changes in the input. Every serious model uses several kinds at once.

:::eli5
Explaining a friend's lateness: "the bus was late" is simple. "The bus was late, and a cat crossed, and the moon was full, and their left shoe was untied" fits today perfectly and predicts nothing about tomorrow. Regularisation charges a fee for every extra excuse, so only the excuses that really help survive.
:::

## L2: shrink everything a little

Minimise $L(w) + \lambda\|w\|_2^2$. The penalty's gradient is $2\lambda w$, so every step pulls each weight toward zero in proportion to its size. Large weights shrink a lot, small ones a little; none reach exactly zero. Effects:

- The model spreads influence across correlated features instead of putting a huge positive weight on one and a huge negative on its twin.
- Predictions become smoother (small weights = small changes in output for small changes in input).
- For linear regression it has a closed form, **ridge regression**: $w = (X^\top X + \lambda I)^{-1}X^\top y$. The $\lambda I$ also makes the matrix invertible when features are collinear.
- Probabilistically: a Gaussian prior on the weights (probability page).

## L1: push some weights to exactly zero

Minimise $L(w) + \lambda\|w\|_1$. The penalty's gradient is $\lambda \cdot \text{sign}(w)$: a constant-size pull toward zero, whatever the weight's size. A weight that isn't helping much gets pulled all the way to zero and **stays there**, because near zero the constant pull beats the small benefit to the loss. Result: **sparse** models that do feature selection.

The geometric picture interviewers love: minimise the loss subject to $\|w\| \le t$. The L2 constraint region is a circle (sphere); the L1 region is a diamond with corners on the axes. The loss's elliptical contours usually first touch the diamond **at a corner**, where some weights are exactly zero; they touch the circle at a generic point. Drag the strength and watch L1 weights drop to zero one by one while L2 weights shrink together:

[[widget:regularisation-paths]]

**Elastic net** mixes both ($\alpha L1 + (1-\alpha)L2$): sparse, but stable when features are correlated (pure L1 picks one of a correlated group arbitrarily).

Practical notes: penalties assume features are on **similar scales** (standardise first), and you usually **don't penalise the bias** term.

## Weight decay vs L2 in adaptive optimisers

With plain SGD, adding $\lambda\|w\|^2$ to the loss is identical to "decaying" weights each step: $w \leftarrow w - \eta(\nabla L + 2\lambda w)$. With **Adam**, they differ: Adam divides the gradient (including the L2 term) by a running estimate of its size, so heavily-updated weights get *less* regularisation than intended. **AdamW** (Loshchilov and Hutter) decouples the decay, $w \leftarrow w - \eta\,\text{AdamStep} - \eta\lambda w$, which generalises better and is the default for training transformers (typical $\lambda = 0.01$–$0.1$). It's an interview favourite precisely because it's subtle.

## Other regularisers

- **Early stopping**: monitor validation loss and keep the best checkpoint. For a quadratic loss it behaves much like L2: limited training steps limit how far weights travel from initialisation. Free, and almost always used.
- **More data and augmentation**: the most powerful regulariser. Images: flips, crops, colour jitter, mixup and CutMix (blend images and labels). Text: back-translation, synonym replacement, LLM paraphrases. Audio: noise, time and frequency masking (SpecAugment). Augment only with transformations that don't change the label (flipping a "6" makes a "9").
- **Dropout** (neural networks): zero each unit with probability $p$ during training and scale the rest by $1/(1-p)$ ("inverted dropout") so expected activations are unchanged; use the full network at test time. It's like training an ensemble of sub-networks that share weights. Typical $p$ = 0.1 in transformers, 0.5 in older fully connected layers.
- **Label smoothing**: discourages over-confident outputs (loss-functions page).
- **Smaller or constrained models**: fewer layers, shallower trees, fewer leaves, minimum samples per leaf; for boosting, a small learning rate with many trees, subsampling rows and columns.
- **Ensembles**: averaging reduces variance.
- **Noise injection**: add noise to inputs or weights.
- **Batch normalisation** has a mild regularising effect from batch noise (a side effect, not its purpose).

## Tuning the strength

Regularisation strength is a hyperparameter; tune it on validation data, on a **log scale** ($\lambda \in \{10^{-5}, 10^{-4}, \dots, 1\}$). Too little: overfitting. Too much: underfitting, as everything gets squashed toward zero. With more data, you need less. Random search or Bayesian optimisation beats grid search when several hyperparameters interact.

## Interview angles

- "L1 or L2?" L1 for feature selection and interpretability with many irrelevant features; L2 for general shrinkage and correlated features; elastic net for both.
- "Why does L1 give zeros?" Constant-size gradient pull (subgradient at 0), and the diamond's corners touch the loss contours first.
- "Model overfits: list five fixes in order." More data or augmentation → early stopping → weight decay / dropout → smaller model → ensembling; and check for leakage or train/test mismatch first.
- "Weight decay vs L2 with Adam?" Not equivalent; use AdamW's decoupled decay.

--- revise
### Penalties
? L2 penalty and its effect? :: λΣw²: shrinks all weights proportionally; none exactly zero.
? L1 penalty and its effect? :: λΣ|w|: constant pull toward zero; many weights become exactly zero (sparse).
? Why does L1 produce zeros (geometric)? :: The L1 ball is a diamond; loss contours first touch it at corners on the axes.
? Ridge regression closed form? :: $w = (X^\top X + \lambda I)^{-1}X^\top y$.
? Elastic net? :: Mix of L1 and L2: sparse yet stable with correlated features.
? Two practical rules for penalties? :: Standardise features first; don't penalise the bias.
? Priors behind L2 and L1? :: Gaussian and Laplace.

### Optimisers
? Is L2 the same as weight decay? :: With plain SGD yes; with Adam no (Adam rescales the L2 gradient).
? What does AdamW do? :: Decouples weight decay from the adaptive gradient step.

### Other regularisers
? Early stopping? :: Keep the checkpoint with the best validation loss; acts like L2.
? Inverted dropout? :: Zero units with probability p in training, scale survivors by 1/(1−p); no change at test.
? Most powerful regulariser? :: More (or augmented) data.
? Augmentation rule? :: Only transformations that keep the label correct.
? How to tune λ? :: On validation data, on a log scale; less needed with more data.

--- notes
## L2 (ridge, weight decay)
+λΣw², gradient 2λw: proportional shrink, no zeros.
Spreads weight over correlated features; smooth predictions.
Ridge: (XᵀX + λI)⁻¹Xᵀy; λI fixes collinearity. Gaussian prior.
## L1 (lasso)
+λΣ|w|, gradient λ·sign(w): constant pull → exact zeros → feature selection. Laplace prior.
Geometry: diamond corners touch loss ellipses first.
Elastic net: L1 + L2, stable with correlated features.
Standardise features; don't penalise bias.
## Adam vs AdamW
SGD: L2 ≡ weight decay. Adam: not equivalent. AdamW: decoupled decay (λ 0.01–0.1), default for transformers.
## Others
Early stopping (≈L2). Data + augmentation (strongest; label-preserving only).
Dropout p (0.1 transformers, 0.5 old FC), inverted scaling 1/(1−p), off at test.
Label smoothing. Smaller/constrained models (tree depth, min leaf, boosting lr + subsampling).
Ensembles. Noise injection.
## Tuning
λ on log scale via validation. More data → less λ. Random/Bayesian search over interacting params.

--- doubts
Q: Why don't we penalise the bias term?
A: The bias just shifts the output to the right average level (the base rate of clicks, the mean house price). Penalising it would pull predictions toward zero for no reason, without making the model any less complex in a way that helps generalisation.

Q: Is dropout still used in large language models?
A: Less than before. Large pretraining runs see each token roughly once, so there's little overfitting and dropout often hurts; many recent LLMs use dropout 0 in pretraining. It's still common when fine-tuning on small datasets and in smaller models.

Q: Does regularisation make a model less accurate?
A: On the training data, yes, by design: it gives up some fit. On new data it usually makes it more accurate, up to a point. Too much regularisation underfits, which is why λ is tuned on validation data.

Q: If L1 picks features automatically, should I always use it for feature selection?
A: It's a decent first pass for linear models, but with groups of correlated features it picks one arbitrarily and the choice can flip between runs. Elastic net, tree-based importances or permutation importance are often more stable, and for deep models L1 on weights is rarely used.

--- exercises
[choose] You have 500 patients and 20,000 gene-expression features, and doctors want to know which genes matter. Which regularisation?
A: L1 or elastic net logistic regression: with far more features than examples you must regularise heavily, and sparsity gives a short, interpretable gene list. Elastic net is safer because genes are strongly correlated (pure lasso would pick one gene from a co-expressed group arbitrarily). Tune λ with stratified CV, and check stability by refitting on bootstrap samples.

[break] A teammate adds L2 regularisation with λ = 1 to a model whose features are raw: income in dollars (around 50,000) and age in years (around 40). What goes wrong?
A: The penalty treats all weights equally, but the weights live on very different scales: income's weight is tiny (because income is huge) and age's is larger, so the penalty mostly squashes age while barely touching income. Standardise features to zero mean and unit variance first, so the penalty is fair across features.

[estimate] You train with dropout p = 0.2 using the original (non-inverted) dropout, and forget to scale at test time. What happens to a unit's expected input at test time compared with training?
A: During training each input survives with probability 0.8, so the expected input is 0.8× the full value. At test time all inputs are present, so the unit receives 1.25× what it saw on average in training: activations are systematically too large. Inverted dropout (scale by 1/0.8 in training) avoids needing any change at test time.

--- pitfalls
- Applying penalties to unscaled features
- Penalising the bias term
- Using L2 inside Adam and expecting weight-decay behaviour (use AdamW)
- Augmentations that change the label
- Leaving dropout on at inference

--- quiz
Q: Which penalty tends to produce weights that are exactly zero?
- L2
- *L1
- Dropout
- Label smoothing
W: L1's constant-size pull drives unhelpful weights to zero.

Q: Why does AdamW exist?
- Adam can't use L2
- *With Adam, adding L2 to the loss is not equivalent to weight decay; AdamW applies decay separately
- To remove momentum
- To make Adam faster
W: Adam rescales the L2 gradient per parameter; decoupling fixes it.

Q: What does inverted dropout do at test time?
- Drops the same units
- Scales outputs by p
- *Nothing: all units are used and no rescaling is needed
- Doubles the learning rate
W: Survivors were scaled by 1/(1 − p) during training.

Q: Which is NOT a valid augmentation for digit classification?
- Small rotation
- Slight scaling
- *Vertical flip
- Small translation
W: Flipping can turn a 6 into a 9: the label changes.

Q: Two features are strongly correlated. Which regulariser keeps both with shared weight?
- L1
- *L2 (or elastic net)
- No regularisation
- Early stopping only
W: L2 spreads weight across correlated features; L1 tends to pick one.

--- sources
- paper :: Regression Shrinkage and Selection via the Lasso :: Robert Tibshirani (1996) :: https://www.jstor.org/stable/2346178
- paper :: Decoupled Weight Decay Regularization (AdamW) :: Loshchilov, Hutter (2019) :: https://arxiv.org/abs/1711.05101
- paper :: Dropout: A Simple Way to Prevent Neural Networks from Overfitting :: Srivastava et al. (2014) :: https://jmlr.org/papers/v15/srivastava14a.html
- book :: Deep Learning (chapter 7, regularization) :: Goodfellow, Bengio, Courville :: https://www.deeplearningbook.org/contents/regularization.html
