=== classification-metrics
blurb: The confusion matrix and everything built from it: precision, recall, F1, specificity, ROC and PR curves and their areas, choosing thresholds, multi-class averaging, log-loss, and calibration with reliability diagrams.
signals: "How would you evaluate this classifier?" | "Precision or recall: which matters here?" | "AUC is 0.95, is that good?" | "Are the model's probabilities trustworthy?"
widgets: threshold, calibration
prereq: class-imbalance

--- lesson
:::words
- **Confusion matrix**: a 2×2 table counting true positives (TP), false positives (FP), true negatives (TN) and false negatives (FN).
- **Precision**: of everything flagged positive, the share that really is: $TP/(TP + FP)$.
- **Recall** (sensitivity, true-positive rate): of all real positives, the share found: $TP/(TP + FN)$.
- **Specificity**: of all real negatives, the share correctly left alone: $TN/(TN + FP)$. **False-positive rate** = $1 -$ specificity.
- **F1**: the harmonic mean of precision and recall.
- **ROC curve**: true-positive rate versus false-positive rate as the threshold moves. **AUC**: the area under it.
- **PR curve**: precision versus recall as the threshold moves.
- **Calibration**: whether a predicted 20% really happens about 20% of the time.
:::

## The problem in plain words

"How good is the model?" has no single answer; it depends on **which mistakes cost what**. A cancer screen that misses tumours is dangerous; a spam filter that hides a job offer is costly; a recommendation that's slightly off is cheap. Classification metrics are different ways of counting the two kinds of mistakes (false alarms and misses). Picking the right one, and saying why, is a core interview skill.

:::eli5
A fishing net. **Recall**: how many of the fish in the lake you caught. **Precision**: how much of what's in your net is fish rather than old boots. A huge net catches every fish and lots of boots; a tiny net catches few fish but almost no boots.
:::

## The confusion matrix

| | Predicted positive | Predicted negative |
|---|---|---|
| **Actually positive** | TP | FN (miss) |
| **Actually negative** | FP (false alarm) | TN |

Everything else is built from these four counts:

- **Accuracy** $= (TP + TN)/N$: misleading with imbalance.
- **Precision** $= TP/(TP + FP)$: "when it says yes, is it right?" Matters when acting on a positive is costly (auto-banning accounts).
- **Recall** $= TP/(TP + FN)$: "does it find them all?" Matters when misses are costly (disease screening, safety).
- **F1** $= 2PR/(P + R)$: harmonic mean, dragged down by whichever is worse. **F-beta** weights recall $\beta$ times as much as precision: $F_\beta = (1 + \beta^2)PR/(\beta^2 P + R)$.
- **Specificity**, **FPR**: used with ROC curves and in medicine.

## Thresholds and the two curves

A classifier outputs a score; the threshold turns it into a decision. Lowering the threshold raises recall and lowers precision. Slide it and watch every metric and the ROC point move together:

[[widget:threshold]]

- **ROC curve**: TPR vs FPR over all thresholds. **ROC-AUC** = the probability that a random positive scores higher than a random negative (a ranking measure). 0.5 = random, 1.0 = perfect. It is insensitive to the class ratio, which is a strength for comparing models and a weakness for rare positives: FPR divides by the (huge) number of negatives, so many false alarms still look like a tiny FPR.
- **PR curve**: precision vs recall. **PR-AUC** (average precision) has a baseline equal to the positive rate, so it reflects how hard the problem actually is. Prefer it for rare positives (fraud, abuse, ads).

Since AUC is the probability a positive outranks a negative, you can compute it without curves: sort by score and count correctly ordered pairs, $\text{AUC} = (\text{sum of positive ranks} - n_+(n_+ + 1)/2)/(n_+ n_-)$ (the Mann–Whitney statistic): an ML-coding favourite.

**Choosing the operating point**: from costs (class-imbalance page), from capacity (top $k$ per day for reviewers), or a constraint ("recall at precision ≥ 95%"). Report the metric at that point, not only the area.

## Multi-class

- **Per-class** precision and recall, plus the confusion matrix (which classes get confused with which).
- **Macro average**: average the per-class metric; every class counts equally (good when small classes matter).
- **Micro average**: pool all counts; dominated by large classes (equals accuracy for single-label problems).
- **Weighted average**: macro weighted by class frequency.
- **Top-k accuracy**: the right label is among the top $k$ predictions (image classification, autocomplete).

## Probabilistic metrics

- **Log-loss** (cross-entropy): rewards confident correct probabilities and punishes confident mistakes heavily. Use it when the probabilities themselves are used (ads, risk). Compare against the baseline log-loss of always predicting the base rate: **normalised entropy** (used in Facebook's ads papers) $= \text{log-loss}/H(\text{base rate})$; lower is better, 1.0 means no better than the base rate.
- **Brier score**: mean squared error of probabilities, $\frac1n\sum(p_i - y_i)^2$; less harsh than log-loss on confident mistakes.

## Calibration

A model can rank perfectly (AUC 1.0) and still output useless probabilities (all scores between 0.50 and 0.51). **Calibration** asks: of predictions near 0.3, are about 30% positive? Check with a **reliability diagram**: bucket predictions, plot mean predicted vs observed rate; the diagonal is perfect. Summarise with **expected calibration error (ECE)**: the average gap, weighted by bucket size.

Why models are miscalibrated: deep networks trained long are over-confident; class weights and resampling inflate probabilities; boosting and SVMs aren't trained to produce probabilities; the deployment distribution differs from training. Fixes on validation data: **Platt scaling** (logistic regression on the score), **isotonic regression** (a monotonic step function), **temperature scaling** for neural networks (divide logits by a single learned $T > 1$; doesn't change the ranking or accuracy). Bend the reliability curve below and see what each fix does:

[[widget:calibration]]

## Which metric when

| Situation | Primary metric |
|---|---|
| Balanced classes, equal costs | Accuracy, F1 |
| Rare positives (fraud, abuse) | PR-AUC, recall at fixed precision |
| Comparing ranking quality, class ratio may change | ROC-AUC |
| Probabilities feed decisions (ads, pricing, risk) | Log-loss / normalised entropy + calibration |
| Many classes | Macro-F1 (if small classes matter), top-k accuracy |
| An action has capacity limits | Precision at k |

## Interview angles

- "AUC is 0.95; good?" Ask about the positive rate and the operating point; show PR-AUC and precision at the recall you need.
- "Precision or recall for X?" Name the cost of each mistake. Child-safety detection: recall (with human review to protect precision). Auto-suspending accounts: precision.
- "Compute AUC from scratch." Rank-based formula, handle ties with average ranks.
- "The probabilities look off." Reliability diagram, then Platt / isotonic / temperature scaling on a held-out set.

--- revise
### Counts and ratios
? Precision? :: TP / (TP + FP): when it says yes, how often it's right.
? Recall? :: TP / (TP + FN): share of real positives found.
? Specificity and FPR? :: TN/(TN + FP); FPR = 1 − specificity.
? F1? :: 2PR/(P + R), the harmonic mean.
? F-beta? :: Weights recall β times as much as precision.

### Curves
? ROC curve axes? :: True-positive rate vs false-positive rate across thresholds.
? Meaning of ROC-AUC? :: Probability a random positive scores above a random negative.
? Why can ROC-AUC flatter rare-positive models? :: FPR divides by a huge negative count; many false alarms look small.
? PR-AUC baseline? :: The positive rate.
? AUC without curves? :: Mann–Whitney: (sum of positive ranks − n₊(n₊+1)/2)/(n₊n₋).

### Multi-class and probabilities
? Macro vs micro average? :: Macro: each class equal. Micro: pooled counts, dominated by big classes.
? Normalised entropy? :: Log-loss divided by the entropy of the base rate; 1.0 = no better than base rate.
? Brier score? :: Mean squared error of predicted probabilities.
? How to check calibration? :: Reliability diagram (predicted vs observed per bucket), ECE.
? Three recalibration methods? :: Platt scaling, isotonic regression, temperature scaling.
? Does temperature scaling change accuracy? :: No: dividing logits by T keeps the ranking.

--- notes
## Confusion matrix
TP, FP (false alarm), FN (miss), TN.
Precision = TP/(TP+FP). Recall = TPR = TP/(TP+FN). Specificity = TN/(TN+FP). FPR = 1 − spec.
F1 = 2PR/(P+R). Fβ: recall β× as important.
## Curves
Threshold ↓ → recall ↑, precision ↓.
ROC (TPR vs FPR): AUC = P(pos > neg); ratio-insensitive; flatters rare positives.
PR curve: baseline = positive rate; use for rare positives.
AUC via ranks (Mann–Whitney); ties → average ranks.
Report the operating point: recall @ precision, precision @ k.
## Multi-class
Per-class + confusion matrix. Macro (equal classes), micro (pooled, = accuracy), weighted. Top-k.
## Probabilistic
Log-loss; normalised entropy = LL / H(base rate). Brier = mean (p − y)².
## Calibration
Reliability diagram; ECE. Causes: long training, weights/resampling, boosting/SVM, shift.
Fix on validation: Platt (logistic), isotonic (monotone steps), temperature (logits / T, accuracy unchanged).
## Choose
Balanced → accuracy/F1. Rare → PR-AUC, recall@precision. Ranking → ROC-AUC. Decisions on p → log-loss + calibration. Many classes → macro-F1, top-k.

--- doubts
Q: Why is F1 a harmonic mean rather than an ordinary average?
A: The harmonic mean is pulled toward the smaller value. A model with precision 1.0 and recall 0.01 has an arithmetic mean of 0.5, which sounds fine, but F1 of about 0.02, which correctly says it's useless. F1 is high only when both are high.

Q: Can a model with higher AUC be worse in production?
A: Yes. AUC averages over all thresholds, but you operate at one. Model A can beat B on AUC overall while B has better precision exactly at the recall you need. It also ignores calibration. Compare at the operating point and on the metric your product uses.

Q: If isotonic regression is more flexible, why ever use Platt scaling?
A: Isotonic needs more data (it can overfit with a few thousand examples) and produces step functions with ties. Platt has two parameters and is stable on small calibration sets; temperature scaling has one and is the default for neural networks.

Q: Is calibration needed if I only rank items?
A: Not for ranking within one model. It is needed whenever scores are compared across models or contexts, combined with other scores (multi-task ranking), multiplied by money (ads), or thresholded by a cost formula.

--- exercises
[estimate] A model at threshold t gives TP = 80, FP = 20, FN = 120, TN = 9,780. Compute accuracy, precision, recall, F1 and FPR.
A: Accuracy $= 9860/10000 = 98.6\%$. Precision $= 80/100 = 0.80$. Recall $= 80/200 = 0.40$. F1 $= 2(0.8)(0.4)/1.2 \approx 0.53$. FPR $= 20/9800 \approx 0.2\%$. High accuracy and tiny FPR hide that it misses 60% of positives.

[design] Write a function computing ROC-AUC from scores and binary labels in O(n log n), handling ties.
A: Rank all scores ascending with average ranks for ties (sort, then for each run of equal scores assign the mean of their positions, 1-based). Sum the ranks of positives $R_+$. AUC $= (R_+ - n_+(n_+ + 1)/2)/(n_+ n_-)$. Edge cases: if $n_+ = 0$ or $n_- = 0$, AUC is undefined: raise or return NaN. Verify against `sklearn.metrics.roc_auc_score`.

[choose] A content-moderation classifier will auto-remove posts above one threshold and send posts in a middle band to human reviewers who can handle 50,000 a day. How do you set the two thresholds and which metrics do you report?
A: Auto-remove threshold: the lowest score where precision is at least, say, 99% on a recent labelled sample (wrong removals are very costly). Review band: from there down to the score that fills 50,000 reviews a day at current traffic. Report precision of auto-removals, recall of the whole system (auto + review), reviewer load, and appeal overturn rates, per language and policy area; revisit weekly because traffic and abuse patterns drift.

--- pitfalls
- Reporting accuracy or ROC-AUC alone for rare positives
- Comparing models only by area instead of at the operating point
- Micro-averaging when small classes matter
- Treating scores from boosting, SVMs or weighted training as probabilities
- Calibrating on the training set

--- quiz
Q: A model flags 50 items; 40 are truly positive. There are 100 positives in total. Precision and recall?
- 0.4 and 0.8
- *0.8 and 0.4
- 0.5 and 0.4
- 0.8 and 0.5
W: Precision 40/50; recall 40/100.

Q: What does ROC-AUC = 0.8 mean?
- 80% accuracy
- 80% precision
- *A random positive scores above a random negative 80% of the time
- 80% of positives are found
W: AUC is a ranking probability.

Q: Which curve's baseline equals the positive rate?
- ROC
- *Precision–recall
- Reliability diagram
- Lift
W: A random scorer's precision equals the base rate at every recall.

Q: Temperature scaling a neural network's logits changes?
- Accuracy
- The ranking of classes
- *The confidence of probabilities, not the predicted class
- The training loss of the original model
W: Dividing all logits by T keeps their order.

Q: Small classes matter equally to large ones. Which average?
- Micro
- *Macro
- Weighted
- None
W: Macro averages per-class metrics with equal weight.

--- sources
- paper :: An introduction to ROC analysis :: Tom Fawcett (2006) :: https://www.sciencedirect.com/science/article/pii/S016786550500303X
- paper :: On Calibration of Modern Neural Networks :: Guo et al. (ICML 2017) :: https://arxiv.org/abs/1706.04599
- paper :: The Precision-Recall Plot Is More Informative than the ROC Plot When Evaluating Binary Classifiers on Imbalanced Datasets :: Saito, Rehmsmeier (2015) :: https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0118432
- course :: Classification: accuracy, recall, precision and related metrics :: Google Machine Learning Crash Course :: https://developers.google.com/machine-learning/crash-course/classification/accuracy-precision-recall

=== ranking-metrics
blurb: Measuring ranked lists for search, feeds and recommendations: precision and recall at k, hit rate, MRR, MAP, and NDCG with graded relevance derived step by step, plus offline-vs-online gaps, coverage, diversity and novelty.
signals: Any search, recommendation or feed design | "How would you evaluate the ranking offline?" | "Compute NDCG@5 for this list" | "Retrieval recall vs ranking precision"
widgets: ndcg-ranking
prereq: classification-metrics

--- lesson
:::words
- **Ranked list**: results in order, best first (search results, a feed).
- **Relevance**: how good a result is for this query or user: binary (relevant or not) or **graded** (0 = bad … 3 = perfect).
- **@k**: computed over only the top $k$ results, since users rarely scroll far.
- **Hit rate@k**: whether at least one relevant item appears in the top $k$.
- **MRR**: mean reciprocal rank, based on the position of the first relevant result.
- **MAP**: mean average precision, rewarding all relevant results being near the top.
- **NDCG**: normalised discounted cumulative gain, for graded relevance with a penalty for lower positions.
:::

## The problem in plain words

For a search engine or a feed, being "right" isn't enough; being right **near the top** is what counts. A perfect answer at position 30 is worth almost nothing because nobody scrolls that far. Ranking metrics reward putting the best items first. Every recommendation and search design round asks how you'd evaluate offline, and the expected answer names these metrics and knows how they differ.

:::eli5
A teacher grades your list of "top 5 films for my grandma". Putting her favourite first earns lots of points; putting it fifth earns a few; leaving it out earns none. NDCG is that grading scheme, adjusted so a perfect list scores exactly 1.
:::

## Binary relevance: precision, recall, hit rate

For one query with $R$ relevant items in total:

- **Precision@k** = relevant results in the top $k$ / $k$.
- **Recall@k** = relevant results in the top $k$ / $R$. The standard metric for **retrieval / candidate generation**: did the right items make it into the 500 candidates passed to the ranker?
- **Hit rate@k**: 1 if any relevant item is in the top $k$ (common in next-item recommendation where there's one held-out item).

They ignore order inside the top $k$.

## MRR: where is the first good answer?

$$\text{MRR} = \frac{1}{|Q|}\sum_{q} \frac{1}{\text{rank of the first relevant result for } q}$$

First relevant at position 1 → 1; at 2 → 0.5; at 4 → 0.25. Ideal when users want **one** answer: question answering, "I'm feeling lucky", navigational search, autocomplete.

## MAP: all relevant items, near the top

**Average precision** for one query averages precision@k at each position $k$ where a relevant item appears:

$$\text{AP} = \frac{1}{R}\sum_{k:\,\text{item } k \text{ relevant}} \text{precision@}k$$

Example: relevant items at positions 1, 3 and 6 (and $R = 3$): $\text{AP} = (1/1 + 2/3 + 3/6)/3 \approx 0.72$. MAP averages AP over queries. Binary relevance only.

## NDCG: graded relevance with a position discount

With graded relevance $rel_i$ at position $i$:

$$\text{DCG@}k = \sum_{i=1}^{k} \frac{2^{rel_i} - 1}{\log_2(i + 1)}$$

The numerator rewards highly relevant items (exponentially, so a "perfect" 3 is worth 7 versus 1 for a "somewhat" 1); the denominator discounts lower positions (position 1 divides by 1, position 3 by 2, position 7 by 3). To compare queries with different numbers of relevant items, divide by the DCG of the ideal ordering:

$$\text{NDCG@}k = \frac{\text{DCG@}k}{\text{IDCG@}k} \in [0, 1]$$

Worked example, relevances in the returned order $[3, 2, 0, 1]$, $k = 4$: DCG $= 7/1 + 3/1.585 + 0/2 + 1/2.322 \approx 7 + 1.893 + 0 + 0.431 = 9.324$. Ideal order $[3, 2, 1, 0]$: IDCG $= 7 + 1.893 + 1/2 + 0 = 9.393$. NDCG $\approx 0.993$. (Some implementations use $rel_i$ instead of $2^{rel_i} - 1$; state which.) Drag items to reorder the list below and watch each metric react:

[[widget:ndcg-ranking]]

## Where the labels come from

- **Human raters** grading query–result pairs (search quality at Google uses rater guidelines and graded scales).
- **Implicit feedback**: clicks, dwell time, purchases as relevance; biased by position (people click higher results more) and by what was shown. Correct with **click models**, randomised position experiments, or inverse propensity weighting.
- For recommenders, the common offline protocol holds out each user's later interactions and checks whether the model ranks them highly (with a time-based split).

## Beyond accuracy

Lists can score well and still be bad products:

- **Coverage**: what fraction of the catalogue ever gets recommended?
- **Diversity**: how different are items within a list (average pairwise distance)?
- **Novelty / serendipity**: are items not already obvious to the user?
- **Freshness**: share of new content.
- **Fairness / exposure**: do creators or sellers of different sizes get reasonable exposure?

These often trade off with NDCG; production rankers add re-ranking stages for diversity and policy.

## Offline vs online

Offline ranking metrics guide model choice, but the decision is made online: A/B tests on click-through, dwell time, successful sessions (no quick back-click, "long click"), purchases, retention. **Interleaving** (mixing two rankers' results in one list and seeing which one's items get clicked) detects ranking differences with far fewer users than A/B tests. Offline gains often shrink online because logged data was collected by the old ranker; counterfactual (off-policy) evaluation with propensities narrows that gap.

## Interview angles

- "How do you evaluate a two-stage recommender?" Recall@k for candidate generation (did the good items survive?), NDCG@k for the ranker, then online engagement and satisfaction metrics, plus diversity and coverage guardrails.
- "Compute NDCG for this list." Write DCG with the gain and discount, compute IDCG from the sorted relevances, divide.
- "MRR or NDCG?" One right answer → MRR; graded relevance and multiple good results → NDCG.

--- revise
### Binary metrics
? Precision@k vs recall@k? :: Relevant in top k divided by k, vs divided by all relevant items.
? Which metric evaluates candidate generation? :: Recall@k (did the relevant items survive into the candidate set?).
? Hit rate@k? :: 1 if any relevant item appears in the top k.
? MRR? :: Average of 1/(rank of first relevant result).
? Average precision for relevant at 1, 3, 6 (R = 3)? :: (1 + 2/3 + 3/6)/3 ≈ 0.72.

### NDCG
? DCG formula? :: Σ (2^rel − 1)/log₂(i + 1).
? Why normalise by IDCG? :: To compare queries with different numbers and grades of relevant items; NDCG ∈ [0, 1].
? Discount at position 1, 3 and 7? :: Divide by 1, 2 and 3.
? When MRR, when NDCG? :: MRR for one right answer; NDCG for graded relevance and several good results.

### Practice
? Problem with clicks as relevance labels? :: Position and exposure bias.
? Interleaving? :: Mix two rankers in one list, credit clicks to each: more sensitive than A/B.
? Beyond-accuracy metrics? :: Coverage, diversity, novelty, freshness, fairness of exposure.

--- notes
## Binary
P@k = rel in top k / k. R@k = rel in top k / R (retrieval stage). Hit@k.
MRR = mean 1/rank(first relevant): one-answer tasks.
AP = (1/R) Σ P@k at relevant positions; MAP = mean over queries.
## NDCG
DCG@k = Σ (2^rel − 1)/log₂(i+1). Gains 0,1,3,7 for rel 0–3. Discounts 1, 1.585, 2, 2.32, 2.58, 2.81, 3.
NDCG = DCG/IDCG ∈ [0,1]. Example [3,2,0,1] → 9.324/9.393 ≈ 0.993.
Variant gain = rel; state which.
## Labels
Raters (graded guidelines) · clicks (position bias → click models, randomisation, IPS) · held-out future interactions.
## Beyond accuracy
Coverage, diversity, novelty, freshness, exposure fairness; re-ranking stage.
## Online
A/B: CTR, long clicks, dwell, purchases, retention. Interleaving more sensitive.
Offline gains shrink online (logged by old ranker) → off-policy evaluation.

--- doubts
Q: Why is the discount logarithmic rather than, say, 1/position?
A: It's a modelling choice: log discount decays slowly, so positions 5–10 still matter somewhat. Reciprocal rank (1/position) decays fast, matching tasks where only the top answer matters. Some teams fit the discount to observed click-through by position.

Q: NDCG is 0.98 for my model and 0.97 for the old one. Is that a real improvement?
A: Maybe not. Use a paired comparison per query with a bootstrap confidence interval (statistics page), check across query segments (head vs tail queries), and expect only part of the offline gain to show online. Small NDCG differences are often noise.

Q: Why measure recall for candidate generation instead of NDCG?
A: The retrieval stage's job is to not lose good items: the ranker reorders whatever it gets. If a relevant item is missing from the 500 candidates, no ranker can recover it. Order among candidates matters little, so recall@k (with k = the number passed on) is the right metric.

--- exercises
[estimate] A query has relevant items (binary) at positions 2, 3 and 7, with 4 relevant items in total. Compute precision@5, recall@5, MRR and AP.
A: Precision@5 $= 2/5 = 0.4$. Recall@5 $= 2/4 = 0.5$. Reciprocal rank $= 1/2$. AP $= (1/2 + 2/3 + 3/7)/4 = (0.5 + 0.667 + 0.429)/4 \approx 0.40$ (the fourth relevant item was never retrieved, contributing 0).

[estimate] Graded relevances in returned order: [1, 3, 0, 2]. Compute NDCG@4 with gains $2^{rel} - 1$.
A: DCG $= 1/1 + 7/1.585 + 0 + 3/2.322 = 1 + 4.416 + 1.292 = 6.708$. Ideal [3, 2, 1, 0]: $7 + 3/1.585 + 1/2 = 7 + 1.893 + 0.5 = 9.393$. NDCG $\approx 0.714$. Putting the best item first would have gained the most.

[design] Design the offline evaluation for a new home-feed ranker at YouTube.
A: Time-split logs: train up to day D, evaluate on day D+1 sessions. Labels: graded from user actions (watched > 50% = 2, watched > 30 s = 1, quick skip or "not interested" = 0, survey satisfaction where available). Metrics: NDCG@10 and recall@100 per session, per user segment (new, casual, heavy) and content type; calibration of predicted watch time; diversity and fresh-content share. Correct for position bias with inverse propensity weights from randomised position traffic. Gate on offline improvements, then A/B test on watch time, satisfaction surveys and retention, with interleaving for quick reads.

--- pitfalls
- Evaluating the retrieval stage with NDCG instead of recall
- Treating clicks as unbiased relevance labels
- Reporting averages without per-segment breakdowns
- Optimising NDCG while coverage and diversity collapse
- Expecting offline gains to transfer one-to-one online

--- quiz
Q: The first relevant result is at position 4. Its reciprocal rank?
- 4
- 0.5
- *0.25
- 0.75
W: 1/4.

Q: Which metric handles graded relevance (0–3) with a position discount?
- MRR
- MAP
- *NDCG
- Recall@k
W: NDCG's gain uses the grade and its denominator discounts position.

Q: What does dividing DCG by IDCG achieve?
- Removes position bias
- *Puts every query on a 0–1 scale so they can be averaged
- Rewards diversity
- Converts to precision
W: IDCG is the best possible DCG for that query.

Q: What is the best offline metric for a candidate-generation stage passing 500 items on?
- NDCG@10
- MRR
- *Recall@500
- Precision@1
W: Its job is to not drop relevant items.

--- sources
- paper :: Cumulated gain-based evaluation of IR techniques :: Järvelin, Kekäläinen (ACM TOIS 2002) :: https://dl.acm.org/doi/10.1145/582415.582418
- book :: Introduction to Information Retrieval (chapter 8, evaluation) :: Manning, Raghavan, Schütze :: https://nlp.stanford.edu/IR-book/
- paper :: Large-scale validation and analysis of interleaved search evaluation :: Chapelle et al. (ACM TOIS 2012) :: https://dl.acm.org/doi/10.1145/2094072.2094078
- paper :: Unbiased Learning-to-Rank with Biased Feedback :: Joachims, Swaminathan, Schnabel (WSDM 2017) :: https://arxiv.org/abs/1608.04468

=== regression-business-metrics
blurb: Regression metrics (MAE, RMSE, MAPE and its traps, R², quantile coverage), choosing one from the cost of errors, and connecting model metrics to product, guardrail and long-term business metrics.
signals: ETA, price, demand or time-to-event predictions | "Which metric would you report to the business?" | "MAPE exploded on small values" | Defining success for an ML feature
prereq: classification-metrics

--- lesson
:::words
- **MAE**: mean absolute error, the average size of mistakes in the target's units.
- **RMSE**: root mean squared error; like MAE but punishes big mistakes more.
- **MAPE**: mean absolute percentage error, errors relative to the true value.
- **R²**: share of the target's variance explained.
- **Prediction interval**: a range expected to contain the truth with a stated probability.
- **North-star metric**: the one product metric a team optimises long term.
- **Guardrail metric**: a metric that must not get worse (latency, crash rate, complaints) while you improve the main one.
:::

## The problem in plain words

A delivery app predicts 25 minutes and the food arrives in 31. Is that good? It depends on what the error costs: a few minutes late annoys people more than early, a 40-minute miss loses a customer, and a 2-minute error on a 5-minute trip feels worse than on a 60-minute trip. Regression metrics encode these judgements, and good ML engineers then connect them to what the business actually tracks.

:::eli5
Guessing people's heights: MAE is the average number of centimetres you were off. RMSE is the same idea but big misses count extra, so one wildly wrong guess hurts a lot. MAPE says how far off you were as a percentage, which feels fair for adults but goes crazy for a newborn's tiny height.
:::

## The regression metrics

| Metric | Formula | Units | Optimal constant | Notes |
|---|---|---|---|---|
| **MAE** | $\frac1n\sum\lvert y - \hat y\rvert$ | target units | median | Robust, easy to explain |
| **RMSE** | $\sqrt{\frac1n\sum(y - \hat y)^2}$ | target units | mean | Punishes large errors; $\ge$ MAE |
| **MAPE** | $\frac{100}{n}\sum\lvert\frac{y - \hat y}{y}\rvert$ | % | biased low | Explodes near $y = 0$; under-forecasting is penalised at most 100% |
| **sMAPE / WAPE** | symmetric / $\sum\lvert e\rvert / \sum\lvert y\rvert$ | % | | WAPE is the usual fix for demand forecasting |
| **RMSLE** | RMSE of $\log(1 + y)$ | ratio | | Relative errors, penalises under-prediction more |
| **R²** | $1 - \text{SS}_{\text{res}}/\text{SS}_{\text{tot}}$ | none | | Relative to predicting the mean; can be negative |

Notes worth saying out loud:

- RMSE ≥ MAE always; a big gap between them means a few large errors.
- MAPE is undefined at $y = 0$ and huge for small $y$; and since over-forecasting can cost more than 100% while under-forecasting can't, models tuned on MAPE under-forecast. Prefer **WAPE** for aggregates.
- Report errors **by segment** (short vs long trips, cities, hours): one global number hides where the model fails.

## Uncertainty: intervals and quantiles

Point predictions aren't enough when decisions depend on risk. Predict quantiles (with pinball loss) and check **coverage**: an 80% interval should contain the truth 80% of the time; also check its **width**. For ETAs, product teams often care about the **late rate**: the share of orders arriving after the promised time.

## From model metric to business metric

Three layers (framing page): **offline model metric → online product metric → business outcome**. For an ETA model:

- Offline: MAE and late rate on held-out trips, by segment.
- Online (A/B): order conversion (accurate, short ETAs make people order), customer contacts about lateness, cancellations, courier utilisation.
- Business: orders per user per month, retention, cost per delivery.

Define for every launch:

- **Primary metric**: the one you expect to move, with a minimum detectable effect.
- **Secondary metrics**: explain the mechanism.
- **Guardrails**: must not degrade: latency (p50/p99), errors, complaints, fairness across groups, revenue for ads changes, creator metrics for platforms.
- **Long-term metrics**: retention, satisfaction surveys; some effects take weeks (holdback groups that never get the new model measure them).

**Goodhart's law**: "when a measure becomes a target, it ceases to be a good measure." Optimise watch time alone and you get autoplay rabbit holes; optimise ETA accuracy alone and you might quote long, safe ETAs that kill conversion. Balance with guardrails and paired metrics (accuracy and quoted-ETA length; engagement and satisfaction).

## Interview angles

- "Which metric for ETA?" MAE in minutes for interpretability, late rate as the customer-facing measure, quantile coverage if you show ranges; segment by distance and time of day.
- "Forecasting demand with zeros?" Not MAPE; WAPE or MAE, possibly a Poisson/Tweedie loss.
- "How do you know the model helped the business?" A/B test on a product metric with guardrails, plus a long-term holdback.

--- revise
### Regression metrics
? MAE vs RMSE? :: MAE: average absolute error, robust. RMSE: punishes large errors; always ≥ MAE.
? What does a big RMSE−MAE gap mean? :: A few large errors.
? Two problems with MAPE? :: Undefined/huge near zero; biased toward under-forecasting.
? Usual MAPE replacement for demand? :: WAPE = Σ|e| / Σ|y|.
? R² of 0 and negative? :: 0: no better than predicting the mean; negative: worse than the mean.

### Uncertainty
? How to check an 80% prediction interval? :: Coverage ≈ 80% on held-out data, and reasonable width.
? ETA customer-facing metric? :: Late rate: share delivered after the promised time.

### Business
? Three metric layers? :: Offline model metric → online product metric → business outcome.
? Guardrail metric? :: Must not get worse: latency, errors, complaints, fairness, revenue.
? Why long-term holdbacks? :: Some effects (retention, satisfaction) appear only after weeks.
? Goodhart's law? :: A measure that becomes a target stops being a good measure.

--- notes
## Metrics
MAE: robust, median-optimal, units. RMSE: mean-optimal, big errors weigh more; ≥ MAE.
MAPE: breaks near 0, favours under-forecasts → use WAPE (Σ|e|/Σ|y|) or sMAPE.
RMSLE: relative, punishes under-prediction. R² vs mean baseline; can be negative.
Segment everything (distance, city, hour).
## Uncertainty
Quantiles via pinball loss. Check coverage + width. Late rate for ETAs.
## Business link
Offline → online (A/B) → business. Primary (with MDE), secondary, guardrails, long-term holdback.
Guardrails: latency p50/p99, errors, complaints, fairness, revenue, creators.
Goodhart: pair metrics (accuracy + ETA length; engagement + satisfaction).

--- doubts
Q: Should I report RMSE or MAE to non-technical stakeholders?
A: MAE: "on average we're 3.2 minutes off" is easy to understand. Use RMSE (or a high percentile of absolute error) internally to track large misses, which often matter most to users.

Q: Why would a model trained to minimise MAPE under-predict?
A: An under-prediction's percentage error is capped at 100% (predicting 0), but an over-prediction's is unbounded. Minimising the average therefore leans low. Weighted or symmetric versions reduce this.

Q: What if the offline metric improves but the business metric doesn't move?
A: Possible causes: the offline metric doesn't reflect what users value (the framing is off), the change is real but too small to detect online, the offline evaluation data is biased toward the old model's behaviour, or the improvement is in segments that rarely matter. Investigate per segment and revisit the metric hierarchy.

--- exercises
[estimate] Errors (minutes) on five deliveries: −2, 1, 3, −1, 15. Compute MAE and RMSE, and say what the gap tells you.
A: MAE $= (2 + 1 + 3 + 1 + 15)/5 = 4.4$. RMSE $= \sqrt{(4 + 1 + 9 + 1 + 225)/5} = \sqrt{48} \approx 6.9$. The gap comes from the single 15-minute miss; investigate tail cases (weather, restaurant delays), which matter a lot to customers.

[design] Define the launch metrics for a new model that ranks restaurants on a food-delivery home screen.
A: Primary: orders per session (or conversion rate). Secondary: click-through on the carousel, time to first order, share of orders from new restaurants. Guardrails: delivery late rate, cancellation rate, page latency p99, restaurant-side fairness (exposure for small restaurants), revenue per order. Long-term: 4-week retention via a holdback group. Offline before launch: NDCG@10 on logged sessions, calibration of predicted order probability.

[break] A demand forecaster reports MAPE of 340% and the team panics. Most errors look small. What's likely happening?
A: Many items have tiny true demand (0–2 units), so an error of 3 units becomes a 150–300% error, and zero-demand days make MAPE undefined or infinite. The metric is misbehaving, not necessarily the model. Use WAPE or MAE (overall and by demand bucket) instead.

--- pitfalls
- Using MAPE when targets can be near zero
- Reporting one global error instead of segments
- Shipping on offline metrics without online and guardrail checks
- Optimising a single proxy (Goodhart)
- Ignoring prediction-interval coverage when ranges are shown to users

--- quiz
Q: Which is always true?
- MAE ≥ RMSE
- *RMSE ≥ MAE
- MAE = RMSE
- RMSE ≥ 2 MAE
W: The root-mean-square is at least the mean absolute value.

Q: Your targets include many zeros. Which metric is least suitable?
- MAE
- WAPE
- *MAPE
- RMSE
W: Dividing by zero makes MAPE undefined.

Q: An 80% prediction interval contains the truth 62% of the time. What does that mean?
- The model is accurate
- *The intervals are too narrow: under-coverage
- The intervals are too wide
- Coverage doesn't matter
W: Coverage should match the nominal level.

Q: What is a guardrail metric?
- The metric being optimised
- *A metric that must not get worse while improving the primary one
- A training loss
- An offline metric
W: Latency, error rates or complaints often serve as guardrails.

--- sources
- article :: Another look at measures of forecast accuracy :: Hyndman, Koehler (2006) :: https://robjhyndman.com/papers/mase.pdf
- book :: Trustworthy Online Controlled Experiments (chapter 7, metrics) :: Kohavi, Tang, Xu :: https://experimentguide.com/
- book :: Forecasting: Principles and Practice (section 5.8) :: Hyndman, Athanasopoulos :: https://otexts.com/fpp3/accuracy.html
- paper :: Focusing on the Long-term: It's Good for Users and Business :: Hohnhold, O'Brien, Tang, Google (KDD 2015) :: https://research.google/pubs/focusing-on-the-long-term-its-good-for-users-and-business/

=== ab-testing-ml
blurb: Running online experiments for ML models: randomisation units, metrics and guardrails, sample sizing, novelty and network effects, interleaving, shadow mode and canaries, bandits, and why offline wins often vanish online.
signals: "How would you launch this model?" (every ML design round ends here) | "The A/B test is flat but offline metrics improved" | Marketplaces and social networks where users affect each other | "Bandits or A/B test?"
widgets: ab-test-sim
prereq: statistics-tests, regression-business-metrics

--- lesson
:::words
- **A/B test** (online controlled experiment): randomly split traffic between the current system (control) and the new one (treatment), and compare metrics.
- **Randomisation unit**: what gets assigned to a group: a user, a session, a request, a city.
- **Shadow mode**: running a new model on live traffic without using its outputs, to check it works.
- **Canary**: sending a tiny fraction of traffic to a new version first, to catch breakage.
- **Interleaving**: merging two rankers' results into one list and seeing whose items users prefer.
- **Multi-armed bandit**: an algorithm that shifts traffic toward better options while still exploring.
- **Network effect / interference**: one user's treatment affecting another user's outcome.
:::

## The problem in plain words

Offline metrics are computed on old data that the old system produced. The only way to know whether a new model makes the product better is to show it to real people and compare, fairly, against the current one. Google, Meta and others run thousands of experiments a year, and most ideas don't win. Ending an ML design answer with a crisp launch and experiment plan is expected at L5.

:::eli5
Two lemonade recipes: you can taste both yourself (offline), but your taste isn't your customers'. So you hand out each recipe to random passers-by and count who comes back for more. Random handing-out is the key: if you gave the new recipe only to people already thirsty, you'd fool yourself.
:::

## The launch ladder for a model

1. **Offline evaluation** on recent held-out data, by segment.
2. **Shadow mode**: the new model scores live requests in parallel; outputs are logged, not used. Catches feature bugs, latency, training–serving skew, crashes.
3. **Canary**: 0.1–1% of traffic for hours, watching errors and latency.
4. **A/B test**: e.g. 5–50% of users, for 1–4 weeks, on the primary metric with guardrails.
5. **Ramp up** gradually; keep a **long-term holdback** (say 1%) on the old model to measure lasting effects.
6. Monitor after launch (monitoring page).

## Designing the experiment

- **Hypothesis and primary metric**: "the new ranker increases watch time per user by at least 0.5%".
- **Randomisation unit**: usually the **user** (consistent experience, measures user-level effects). Request-level randomisation gives more samples but users see mixed behaviour and effects can leak across requests. Analyse at the randomisation unit (statistics page).
- **Sample size and duration**: from the minimum detectable effect, the metric's variance, α and power; run **whole weeks** to cover weekly cycles; use CUPED to reduce variance.
- **Guardrails**: latency, errors, revenue, complaints, creator/seller metrics.
- **A/A tests** (both groups get the same system) to validate the platform: about 5% should be "significant" by chance; more means a bug.
- **Sample ratio mismatch (SRM)**: if a 50/50 split comes out 50.6/49.4 with millions of users, something is broken (bot filtering, crashes in one arm, logging). Check it with a chi-squared test before trusting any result.

## Effects that fool you

- **Novelty effect**: users click new things because they're new; the lift fades. **Primacy / learning effect**: users take time to adapt to a change, so the effect grows. Look at the effect over time and by user tenure.
- **Network effects and interference**: in a marketplace, a better ranking for treatment users may take inventory from control users (a ride-hailing treatment that grabs drivers). On a social network, treated users' posts reach control users. Remedies: **cluster randomisation** (by city, by social cluster), **switchback** designs (alternate the whole market between versions over time), or budget-split marketplaces.
- **Feedback loops**: the treatment model generates its own training data; if both arms share one training pipeline, they contaminate each other. Train on data from each arm, or accept the bias.
- **Simpson's paradox** and segment mixes: check that the composition of users is the same in both arms.
- **Multiple metrics and peeking** inflate false positives (statistics page).

## Interleaving for rankers

Instead of showing user groups different lists, show each user one list that **interleaves** results from both rankers (team-draft interleaving: the rankers take turns picking their best not-yet-chosen result, with a coin flip deciding who picks first each round). Credit each click to the ranker whose item it was. Because each user compares both within the same context, interleaving needs **10–100× fewer users** than an A/B test to detect a preference. It tells you which ranker is preferred, not by how much a business metric changes, so it's used as a fast filter before A/B tests.

## Bandits

A/B tests split traffic evenly and accept a cost (regret) while learning. **Multi-armed bandits** shift traffic toward better-performing options during the experiment:

- **ε-greedy**: exploit the best arm most of the time, explore at random with probability ε.
- **UCB**: pick the arm with the highest optimistic estimate (mean + uncertainty bonus).
- **Thompson sampling**: sample a plausible value for each arm from its posterior (e.g. a Beta distribution of its click rate) and pick the best sample; naturally balances exploration and exploitation.
- **Contextual bandits** (LinUCB etc.): choose per user using features.

Use bandits for many options with short-lived value (headlines, thumbnails, promotions, cold-start exploration). Use A/B tests when you need an unbiased estimate of an effect on long-term metrics, multiple metrics, or guardrails.

## Why offline wins vanish online

- The offline data was collected by the old model (exposure bias), so it can't evaluate items the old model never showed.
- The offline metric doesn't measure what users value.
- Training–serving skew or latency regressions in production.
- The improvement is real but small, below the experiment's detection power.
- Feedback and ecosystem effects.

Counterfactual (off-policy) evaluation with logged propensities (IPS, doubly robust estimators) can predict online results better than naive offline metrics.

## Interview angles

- End every ML design with: offline gate → shadow → canary → A/B (primary, guardrails, unit, duration) → ramp → holdback → monitoring.
- "Test is flat, offline improved." Power, novelty, exposure bias, skew, metric mismatch; check segments and SRM.
- "Marketplace experiment?" Interference → cluster or switchback design.

--- revise
### Launch ladder
? Launch steps for a model? :: Offline eval → shadow → canary → A/B → ramp → long-term holdback → monitoring.
? What does shadow mode catch? :: Feature bugs, skew, latency, crashes, without user impact.

### Design
? Usual randomisation unit and why? :: User: consistent experience, user-level effects.
? Why run whole weeks? :: Weekly cycles in behaviour.
? A/A test purpose? :: Validate the platform: ~5% false positives expected.
? Sample ratio mismatch? :: Observed split differs from planned beyond chance: a bug; don't trust results.

### Pitfalls
? Novelty vs primacy effect? :: Novelty: early lift fades. Primacy/learning: effect grows as users adapt.
? Interference remedies? :: Cluster randomisation, switchback designs, budget splits.
? Interleaving advantage? :: 10–100× fewer users to detect ranker preference.
? Interleaving limitation? :: Says which ranker is preferred, not the size of business-metric effects.

### Bandits
? Thompson sampling? :: Sample from each arm's posterior and pick the best sample.
? Bandits vs A/B? :: Bandits reduce regret for many short-lived options; A/B gives unbiased effect estimates on multiple and long-term metrics.
? Why do offline wins vanish online? :: Exposure bias, metric mismatch, skew/latency, low power, ecosystem effects.

--- notes
## Ladder
Offline (segments) → shadow (log only) → canary 0.1–1% → A/B 1–4 weeks → ramp → holdback ~1% → monitor.
## Design
Hypothesis + primary metric + MDE. Unit: user (analyse at unit). Whole weeks. CUPED.
Guardrails: latency, errors, revenue, complaints, creators/sellers.
A/A tests. SRM check (chi-squared) before reading results.
## Traps
Novelty (fades) / primacy (grows): plot effect over time, by tenure.
Interference (marketplaces, social): cluster randomisation, switchbacks.
Shared training pipelines contaminate arms. Simpson's. Peeking, many metrics.
## Interleaving
Team-draft: alternate picks, credit clicks. 10–100× more sensitive. Preference only → filter before A/B.
## Bandits
ε-greedy, UCB (mean + bonus), Thompson (posterior samples, Beta for CTR), contextual (LinUCB).
Many short-lived options → bandit. Unbiased long-term effects + guardrails → A/B.
## Offline ≠ online
Exposure bias, metric mismatch, skew/latency, low power, ecosystem. Off-policy eval (IPS, doubly robust).

--- doubts
Q: Why not randomise by request to get more samples?
A: Requests from the same user are correlated, so the effective sample size is closer to the number of users; analysing per request overstates certainty. Users also see inconsistent behaviour, and some effects (retention, learning) only exist at the user level. Request-level randomisation is fine for stateless changes like a search ranking tweak when you analyse correctly.

Q: How long should an A/B test run?
A: Long enough for the planned sample size, at least one full week (two is common), and longer if you expect novelty or learning effects. Decide in advance; don't stop when it first looks significant.

Q: If bandits waste less traffic, why does anyone run A/B tests?
A: Bandits optimise one reward and shift traffic adaptively, which makes the final estimates biased and makes guardrails and long-term metrics hard to measure. For a model launch you need trustworthy effect sizes on several metrics; for picking the best of 10 headlines for a day, a bandit is better.

Q: What is a switchback experiment?
A: The whole market (say, a city) alternates between control and treatment in time slots (every hour), randomly scheduled. Everyone in the market shares the same version at any moment, so there's no interference between arms. It's used heavily by ride-hailing and delivery companies.

--- exercises
[design] Plan the launch of a new ETA model for a food-delivery app.
A: Offline: MAE and late rate by distance and city on last week's orders. Shadow for 3 days: compare predicted ETAs and latency on live orders. Canary 1% for a day. A/B at 20% of users for 2 weeks, randomised by user; primary metric: conversion (orders per session); secondary: late rate, MAE; guardrails: cancellations, support contacts, p99 latency. Watch for interference: ETAs don't change courier allocation, so user-level randomisation is OK (if the model also affected dispatch, use city-level switchbacks). Ramp to 100% with a 1% holdback for a month.

[break] A 50/50 A/B test reports control 1,012,400 users and treatment 987,600, with treatment showing +2% engagement. Should you trust it?
A: Check sample ratio mismatch: expected 1,000,000 each; the difference of 12,400 is about 17 standard deviations ($\sqrt{n \cdot 0.25} \approx 707$). That's a broken experiment: treatment is losing users (crashes, slow loads filtered as bots, logging failures), likely the less engaged ones, which would also inflate its engagement. Don't trust the result; debug the assignment and logging first.

[choose] You have 12 candidate thumbnails for each new video and want to pick the best quickly. A/B test or bandit?
A: A bandit (Thompson sampling on click-through, per video): many options, short-lived value, the goal is maximising clicks quickly rather than estimating effects precisely. Guard against clickbait by using a reward that includes watch time after the click.

--- pitfalls
- Skipping shadow mode and canaries
- Analysing at a finer unit than you randomised
- Ignoring sample ratio mismatch
- Running experiments for a few days and missing weekly cycles or novelty decay
- Using user-level A/B tests in marketplaces with strong interference

--- quiz
Q: What is shadow mode?
- Showing the new model to 1% of users
- *Running the new model on live traffic and logging its outputs without using them
- Testing on old data
- Hiding the model's features
W: It catches production problems with no user impact.

Q: A 50/50 test has a large, statistically significant imbalance in user counts. What should you do?
- Trust the result
- Reweight the groups
- *Treat it as a broken experiment (sample ratio mismatch) and debug
- Run it longer
W: SRM usually means users were lost or mis-assigned non-randomly.

Q: Why does interleaving need fewer users than an A/B test?
- It uses more metrics
- *Each user compares both rankers in the same context, removing between-user variance
- It ignores clicks
- It runs longer
W: The comparison is within-user.

Q: In a ride-hailing marketplace, which design avoids interference between arms?
- User-level randomisation
- Request-level randomisation
- *City-level switchback experiments
- Interleaving
W: Everyone in the market shares one version at a time.

--- sources
- book :: Trustworthy Online Controlled Experiments :: Kohavi, Tang, Xu :: https://experimentguide.com/
- paper :: Overlapping Experiment Infrastructure: More, Better, Faster Experimentation :: Tang et al., Google (KDD 2010) :: https://research.google/pubs/overlapping-experiment-infrastructure-more-better-faster-experimentation/
- article :: A Tutorial on Thompson Sampling :: Russo et al. (2018) :: https://arxiv.org/abs/1707.02038
- article :: Interleaving: A Faster Way to Evaluate Ranking Algorithms :: Netflix Technology Blog :: https://netflixtechblog.com/interleaving-in-online-experiments-at-netflix-a04ee392ec55
