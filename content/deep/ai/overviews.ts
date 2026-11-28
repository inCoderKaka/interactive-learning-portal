import { md } from "@/content/ai/md";

/**
 * Chapter overview pages for AI, written for first-time learners. Each replaces the chapter's old lesson
 * (content/ai/part*.ts) once the chapter's pages are written: a plain-words map of the chapter.
 */
export const AI_OVERVIEWS: Record<string, string> = {
  "ai-math": md`
## What this chapter is about

Machine learning is written in four kinds of maths. You don't need a maths degree, but you do need the **picture** behind each idea, because interviews ask you to derive a gradient, explain PCA, or say whether an A/B result is real.

Four pages:

1. **Linear algebra.** Vectors as arrows, the dot product as "how aligned", matrices as transformations of space, shapes and FLOP counts, eigenvectors and the SVD (behind PCA, LoRA and recommenders).
2. **Calculus.** Derivatives as slopes, the gradient as the uphill direction, the chain rule (all of backpropagation), and curvature, which sets how big a learning rate can be.
3. **Probability.** Distributions, Bayes' rule and base rates, maximum likelihood (where MSE and cross-entropy come from), priors as regularisation, and entropy, cross-entropy and KL divergence.
4. **Statistics.** Standard errors, confidence intervals, p-values, power and sample sizes, and the traps (peeking, many comparisons) that fool experiment readers.

:::tip The one idea to keep
Almost every loss is a negative log-likelihood, and almost every training step is the chain rule plus a step downhill. Learn those two and the rest of the course becomes variations.
:::
`,
  "ai-ml-basics": md`
## What this chapter is about

The ideas every model shares, whatever its type: how to turn a product goal into a prediction problem, why models fail on new data, how to measure that honestly, what the loss really asks for, and how to stop memorising.

Five pages:

1. **Framing.** When ML is the right tool, choosing the target and labels, and lining up offline, online and business metrics.
2. **Bias and variance.** Underfitting versus overfitting, the error decomposition, learning curves, and why huge networks break the old picture (double descent).
3. **Validation and leakage.** Train, validation and test sets, cross-validation, time-based splits, and the many ways answers leak into training.
4. **Loss functions.** Squared, absolute, Huber, quantile, cross-entropy, hinge, focal and ranking losses, derived from what each assumes.
5. **Regularisation.** L1 and L2, weight decay and AdamW, early stopping, augmentation and dropout.

:::tip The one idea to keep
The goal is performance on data you haven't seen. Every choice on these pages is a bet about generalisation, and an honest validation set is the only way to check the bet.
:::
`,
  "ai-data": md`
## What this chapter is about

Models learn whatever is in their data, mistakes included. In ML system design rounds, data and labels often decide the grade more than the model. This chapter is about where training data comes from and how it's turned into features.

Three pages:

1. **Data and labels.** Product logs, raters and their agreement, label windows, exposure bias and feedback loops, negative sampling, active learning and weak supervision.
2. **Class imbalance.** Why rare positives break accuracy, choosing thresholds from costs, class weights and resampling, and recalibrating afterwards.
3. **Feature engineering.** Encoding numbers and categories (hashing, embeddings, target encoding), crosses, time-window aggregates, missing values, and the training–serving skew that silently ruins production models.

:::tip The one idea to keep
Always say where the labels come from, how they're biased, and how features are computed identically in training and serving.
:::
`,
  "ai-classic-models": md`
## What this chapter is about

The models that still win on tabular data and that interviewers expect you to implement from scratch. Each page builds intuition first, then the derivation, then working NumPy code.

Six pages:

1. **Linear regression.** Least squares, the normal equations, gradient descent, and reading coefficients.
2. **Logistic and softmax regression.** Probabilities from a linear score, the log-loss gradient, calibration, and the classic from-scratch implementation.
3. **Decision trees and random forests.** Choosing splits by impurity, why single trees overfit, and how bagging fixes it.
4. **Gradient boosting.** Fitting trees to residuals (negative gradients), XGBoost, LightGBM and CatBoost, and tuning.
5. **SVMs, kNN and naive Bayes.** Margins and the kernel trick, nearest neighbours and the curse of dimensionality, and Bayes with an independence assumption.
6. **Clustering and dimensionality reduction.** k-means, Gaussian mixtures and EM, DBSCAN, PCA derived, and t-SNE/UMAP for pictures.

:::tip The one idea to keep
For tabular data, gradient-boosted trees are the default to beat; logistic regression is the calibrated baseline; and k-means and logistic regression are the two most common ML-coding questions.
:::
`,
  "ai-metrics": md`
## What this chapter is about

How to tell whether a model is good, which depends on what its mistakes cost. Every ML design answer needs offline metrics, online metrics and a launch plan; this chapter gives you all three.

Four pages:

1. **Classification metrics.** Precision, recall, F1, ROC and PR curves, thresholds, multi-class averages and calibration.
2. **Ranking metrics.** Precision and recall at k, MRR, MAP and NDCG for search, feeds and recommendations.
3. **Regression and business metrics.** MAE, RMSE, MAPE's traps, intervals, and connecting model metrics to product and guardrail metrics.
4. **Online experiments.** Shadow mode, canaries, A/B tests, interleaving, bandits, and why offline wins vanish online.

:::tip The one idea to keep
Name the cost of each mistake first; the right metric and threshold follow from it. Then prove it online.
:::
`,
  "ai-neural-nets": md`
## What this chapter is about

How neural networks work and, just as important, how to get them to train. This is the foundation for CNNs, transformers and LLMs later in the course.

Five pages:

1. **Neurons, layers and activations.** Why non-linearity matters, ReLU to GELU to SwiGLU, softmax, and parameter counting.
2. **Backpropagation.** Derived for a two-layer network, step by step, with its cost and the vanishing-gradient problem.
3. **Optimisers.** SGD, momentum, Adam and AdamW with bias correction, warmup and cosine schedules, batch size and clipping.
4. **Initialisation and normalisation.** Xavier and He from variance, batch norm versus layer norm and RMSNorm, residual connections, pre-norm transformers.
5. **Debugging training.** A step-by-step playbook, reading loss curves, classic bugs and hyperparameter search.

:::tip The one idea to keep
Training is the chain rule plus a good optimiser, and deep networks only train when signals keep a healthy size through every layer: initialisation, normalisation and residuals are how.
:::
`,
  "ai-pytorch": md`
## What this chapter is about

The practical tool you'll write models in, and the hardware facts that decide how fast they run.

Three pages:

1. **Tensors and autograd.** Shapes, views, broadcasting (and its silent bugs), einsum, and what autograd really records.
2. **The training loop.** Datasets, DataLoaders, the five-line step, evaluation mode, checkpoints, gradient accumulation and fine-tuning.
3. **Performance.** Compute-bound versus memory-bound (the roofline), mixed precision with bf16, torch.compile and fusion, profiling, and fitting in memory.

:::tip The one idea to keep
Say the shape of every tensor out loud, and remember that most slow training is moving data, not doing maths.
:::
`,
  "ai-cnn": md`
## What this chapter is about

Networks for images and other grid-shaped data, and the vision tasks built on them.

Three pages:

1. **Convolution basics.** What a convolution computes, output sizes and parameter counts, pooling, receptive fields, and 1×1 and depthwise-separable convolutions.
2. **Architectures.** From LeNet and AlexNet through VGG, Inception and ResNet to EfficientNet, ConvNeXt and Vision Transformers, plus transfer learning.
3. **Detection and segmentation.** IoU, non-maximum suppression, two-stage and one-stage detectors, DETR, mAP, and U-Net and Mask R-CNN.

:::tip The one idea to keep
Convolutions bake in locality and weight sharing; residual connections made depth trainable; and with little data you always start from a pretrained backbone.
:::
`,
};
