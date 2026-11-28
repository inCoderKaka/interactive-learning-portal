import { Q, T } from "../h";
import type { Topic } from "@/lib/types";

/** Chapters added in the req3 AI deep pass. Their lessons are the overviews in content/deep/ai/overviews.ts. */
export const aiTopics6: Record<string, Topic> = {
  "ai-math": T("ai", "ai-math", "Maths for machine learning", 1, 30, "The linear algebra, calculus, probability and statistics that every model, loss and interview derivation is built from.", {
    signals: ["'Derive the gradient of the log-loss'", "'Why does PCA use eigenvectors?'", "'Is this A/B result significant?'"],
    lesson: "The maths behind machine learning, explained from zero.",
    pitfalls: ["Memorising formulas without the picture behind them", "Mixing up likelihood and probability", "Treating a p-value as the chance the result is wrong"],
    quiz: [
      Q("Which matrix decomposition gives the best rank-k approximation of any matrix?", ["Cholesky", "LU", "*Singular value decomposition", "QR"], "Truncating the SVD to the top-k singular values is optimal (Eckart–Young)."),
      Q("Minimising cross-entropy against the data is equivalent to minimising what?", ["Variance", "*KL divergence from the data distribution to the model", "Entropy of the model", "Squared error"], "KL(p‖q) = H(p, q) − H(p), and H(p) is fixed."),
      Q("An A/B test is checked daily and stopped when p < 0.05. The false-positive rate is?", ["Exactly 5%", "Below 5%", "*Well above 5%", "Zero"], "Each look is another chance to cross the threshold by luck."),
    ],
  }),
  "ai-data": T("ai", "ai-data", "Data and features", 1, 30, "Where training data and labels come from, how sampling and imbalance bend a model, and how raw data becomes features that are identical in training and serving.", {
    signals: ["'Where do your labels come from?'", "'Only 0.1% of examples are positive'", "'The model was great offline and bad in production'"],
    lesson: "Data, labels and features: the part of an ML system that decides most of its quality.",
    pitfalls: ["Designing the model before asking where labels come from", "Computing features differently in training and serving", "Random splits on time-ordered data"],
    quiz: [
      Q("You keep all positives and 10% of negatives. What must you do before using predicted probabilities in an auction?", ["Nothing", "*Recalibrate for the downsampling", "Retrain on all data", "Use a higher threshold"], "Downsampling inflates P(positive); correct with p = p'/(p' + (1 − p')/w)."),
      Q("Which feature is most likely target leakage when predicting fraud at transaction time?", ["Card age", "Merchant category", "*Whether a chargeback was later filed", "Transaction amount"], "It's only known after the outcome."),
    ],
    prereq: ["ai-ml-basics"],
  }),
  "ai-recsys": T("ai", "ai-recsys", "Recommendation and ranking systems", 1, 40, "How YouTube, Play and Search pick a few items out of billions: candidate retrieval, ranking models, and the problems unique to recommenders.", {
    signals: ["'Design YouTube recommendations / a news feed / ads ranking'", "'How do you handle a brand-new video?'", "'Your recommender keeps showing the same things'"],
    lesson: "Recommendation and ranking systems, from collaborative filtering to multi-stage funnels.",
    pitfalls: ["One model scoring all billion items", "Optimising clicks alone", "Ignoring position bias in the training data"],
    quiz: [
      Q("Why do large recommenders use a retrieval stage before ranking?", ["Ranking models can't use embeddings", "*Scoring hundreds of millions of items with a heavy model per request is far too slow", "Retrieval is more accurate than ranking", "To avoid needing labels"], "Retrieval cheaply narrows billions to hundreds; the heavy ranker then scores only those."),
      Q("A two-tower model is trained with in-batch negatives. What bias does that introduce?", ["Towards new items", "*Popular items appear as negatives more often, so they get penalised", "Towards long videos", "None"], "Items are sampled as negatives in proportion to how often they appear in batches; correct with log-frequency (logQ) correction."),
      Q("Items at the top of a list get more clicks whatever their quality. The standard fix in training is?", ["Drop the top position from the data", "*Model position separately (a position feature or bias tower) and neutralise it at serving", "Train only on the bottom positions", "Shuffle the results for every user"], "The model learns quality separately from where the item was shown."),
    ],
    prereq: ["ai-embeddings", "ai-metrics"],
  }),
  "ai-production": T("ai", "ai-production", "ML in production", 1, 35, "Serving models, watching them decay, retraining them, and the pipelines that make all of it repeatable.", {
    signals: ["'How would you deploy this model?'", "'Accuracy dropped three months after launch'", "'How do you make training reproducible?'"],
    lesson: "Taking a model from a notebook to a system that serves, is monitored and keeps learning.",
    pitfalls: ["No monitoring beyond uptime", "Retraining on a schedule nobody can justify", "Shipping a model without a rollback path"],
    quiz: [
      Q("Features are computed by one code path in training and another in serving. The risk is called?", ["Concept drift", "*Training–serving skew", "Overfitting", "Label leakage"], "The model sees different inputs live than it learned from; share one feature definition (a feature store)."),
      Q("Inputs look the same as last month, but the right answer for the same input has changed. This is?", ["Data drift", "*Concept drift", "Covariate shift", "Label noise"], "Concept drift changes P(y | x); data drift changes P(x)."),
      Q("A new model is scored on live traffic without its predictions being used. This is called?", ["A/B testing", "Canary release", "*Shadow deployment", "Blue–green deployment"], "Shadow mode compares behaviour safely before any user is affected."),
    ],
    prereq: ["ai-metrics"],
  }),
};
