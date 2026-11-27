import { T } from "../h";
import type { Topic } from "@/lib/types";

/** Chapters added in the req3 AI deep pass. Their lessons are the overviews in content/deep/ai/overviews.ts. */
export const aiTopics6: Record<string, Topic> = {
  "ai-math": T("ai", "ai-math", "Maths for machine learning", 1, 30, "The linear algebra, calculus, probability and statistics that every model, loss and interview derivation is built from.", {
    signals: ["'Derive the gradient of the log-loss'", "'Why does PCA use eigenvectors?'", "'Is this A/B result significant?'"],
    lesson: "The maths behind machine learning, explained from zero.",
    pitfalls: ["Memorising formulas without the picture behind them", "Mixing up likelihood and probability", "Treating a p-value as the chance the result is wrong"],
    quiz: [],
  }),
  "ai-data": T("ai", "ai-data", "Data and features", 1, 30, "Where training data and labels come from, how sampling and imbalance bend a model, and how raw data becomes features that are identical in training and serving.", {
    signals: ["'Where do your labels come from?'", "'Only 0.1% of examples are positive'", "'The model was great offline and bad in production'"],
    lesson: "Data, labels and features: the part of an ML system that decides most of its quality.",
    pitfalls: ["Designing the model before asking where labels come from", "Computing features differently in training and serving", "Random splits on time-ordered data"],
    quiz: [],
    prereq: ["ai-ml-basics"],
  }),
  "ai-recsys": T("ai", "ai-recsys", "Recommendation and ranking systems", 1, 40, "How YouTube, Play and Search pick a few items out of billions: candidate retrieval, ranking models, and the problems unique to recommenders.", {
    signals: ["'Design YouTube recommendations / a news feed / ads ranking'", "'How do you handle a brand-new video?'", "'Your recommender keeps showing the same things'"],
    lesson: "Recommendation and ranking systems, from collaborative filtering to multi-stage funnels.",
    pitfalls: ["One model scoring all billion items", "Optimising clicks alone", "Ignoring position bias in the training data"],
    quiz: [],
    prereq: ["ai-embeddings", "ai-metrics"],
  }),
  "ai-production": T("ai", "ai-production", "ML in production", 1, 35, "Serving models, watching them decay, retraining them, and the pipelines that make all of it repeatable.", {
    signals: ["'How would you deploy this model?'", "'Accuracy dropped three months after launch'", "'How do you make training reproducible?'"],
    lesson: "Taking a model from a notebook to a system that serves, is monitored and keeps learning.",
    pitfalls: ["No monitoring beyond uptime", "Retraining on a schedule nobody can justify", "Shipping a model without a rollback path"],
    quiz: [],
    prereq: ["ai-metrics"],
  }),
};
