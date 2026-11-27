=== linear-regression
blurb: Fitting a straight line (or plane) by least squares: the normal equations derived, gradient descent as the alternative, what the coefficients mean, the assumptions and how they fail, R² and residual plots, and when linear models are still the right tool.
signals: "Implement linear regression from scratch" (ML coding) | "Derive the closed-form solution" | Interpreting coefficients for stakeholders | Baselines in any regression problem
widgets: least-squares
prereq: linear-algebra-ml, calculus-gradients, loss-functions

--- lesson
:::words
- **Linear regression**: predicting a number as a weighted sum of the features plus a constant: $\hat y = w_1x_1 + \dots + w_dx_d + b$.
- **Coefficient** (weight): how much the prediction changes when that feature goes up by one, holding the others fixed.
- **Residual**: the error for one example, $y - \hat y$.
- **Least squares**: choosing weights that minimise the sum of squared residuals.
- **Design matrix** $X$: one row per example, one column per feature (plus a column of 1s for the intercept).
- **Normal equations**: the formula that gives the least-squares weights directly.
- **Multicollinearity**: features that are nearly copies of each other, which makes individual coefficients unstable.
- **$R^2$**: the fraction of the target's variance the model explains.
:::

## The problem in plain words

House prices rise with size, fall with distance from the centre, and so on. Linear regression assumes each feature pushes the prediction up or down by a fixed amount per unit, and finds the amounts that fit the data best. It's the simplest supervised model, the baseline for every regression problem, the building block of neural networks (a layer is many linear regressions), and a staple of ML-coding rounds ("implement it with gradient descent in NumPy").

:::eli5
Stretch a stiff ruler through a cloud of points on a graph, pinned so that the total of the squared vertical gaps between the points and the ruler is as small as possible. Wherever the ruler settles is the line of best fit.
:::

## The model and the loss

With the intercept folded into $X$ as a column of ones:

$$\hat{\mathbf{y}} = X\mathbf{w}, \qquad L(\mathbf{w}) = \frac{1}{n}\|\mathbf{y} - X\mathbf{w}\|^2$$

Squared error is the maximum-likelihood choice if the noise is Gaussian (probability page). Drag the points and the line below to feel what least squares is doing: the squares drawn on each residual are literally the areas being minimised, and one outlier's square can dominate:

[[widget:least-squares]]

## Closed form: the normal equations

Set the gradient to zero. $\nabla_w L = -\frac{2}{n}X^\top(\mathbf{y} - X\mathbf{w}) = 0$ gives

$$X^\top X\,\mathbf{w} = X^\top \mathbf{y} \quad\Rightarrow\quad \mathbf{w} = (X^\top X)^{-1}X^\top \mathbf{y}$$

Geometrically, $X\mathbf{w}$ is the **projection** of $\mathbf{y}$ onto the space spanned by the feature columns, and the residual is perpendicular to every feature ($X^\top \mathbf{r} = 0$). With a single feature, the slope is $\text{cov}(x, y)/\text{var}(x)$.

Practicalities:

- Cost: forming $X^\top X$ is $O(nd^2)$ and solving it $O(d^3)$. Fine for thousands of features; for millions, use gradient methods.
- Never invert explicitly; solve the linear system (`np.linalg.solve`) or use QR / SVD (`np.linalg.lstsq`), which is more numerically stable.
- If features are collinear, $X^\top X$ is singular or nearly so: coefficients blow up. Ridge adds $\lambda I$ (regularisation page).

## Gradient descent

The iterative version, which scales to huge data and is what ML-coding rounds usually want:

```python
import numpy as np

def fit_linear(X, y, lr=0.1, epochs=500):
    n, d = X.shape
    w, b = np.zeros(d), 0.0
    for _ in range(epochs):
        err = X @ w + b - y              # (n,)
        w -= lr * (2 / n) * (X.T @ err)  # gradient of the mean squared error
        b -= lr * (2 / n) * err.sum()
    return w, b
```

Standardise features first, or the loss surface becomes a narrow valley and one learning rate can't suit all directions (calculus page). Stochastic or mini-batch versions update on subsets for large $n$.

## Reading the coefficients

$w_j$ is the expected change in $y$ for a one-unit increase in $x_j$ **holding the other features fixed**. Cautions:

- Coefficients depend on units; compare standardised coefficients.
- With correlated features, individual coefficients can flip sign or become huge while predictions stay fine. Don't read causation into them.
- **Non-linear effects** need transformed features: $x^2$, $\log x$, buckets, interactions ($x_1 x_2$). Linear regression is linear in the **weights**, not necessarily in the raw inputs.

## Assumptions, and what breaks

For predictions you mostly need a decent fit; for valid confidence intervals and p-values on coefficients you need the classic assumptions:

1. **Linearity** (in the chosen features). Check: residuals versus predictions show no curve.
2. **Independent errors**. Violated by time series (autocorrelation) and grouped data.
3. **Constant variance** (homoscedasticity). Violated when errors grow with the prediction (prices): residual plot fans out. Fix: predict $\log y$, weighted least squares.
4. **Normal errors** (only for small-sample inference).
5. **No perfect multicollinearity**.

**Outliers** pull the fit strongly (squared loss); use Huber loss or inspect them.

## Evaluating

- **RMSE / MAE** in the target's units; **$R^2 = 1 - \text{SS}_{\text{res}} / \text{SS}_{\text{tot}}$**: 0 means no better than predicting the mean, 1 is perfect, and it can be negative on test data for a bad model. $R^2$ always rises when adding features on training data; use adjusted $R^2$ or validation data.
- **Residual plots**: the fastest way to see non-linearity, heteroscedasticity and outliers.

## When linear models still win

- Small data, many features (with regularisation).
- Need for interpretability, auditability or very low latency (a dot product).
- As **calibrated baselines** and as the final layer of bigger systems (logistic regression on top of learned features; the "wide" part of Wide & Deep).
- Extremely high-dimensional sparse data (text bag-of-words, ad features) where a linear model with good features and crosses is hard to beat.

## Interview angles

- "Derive the closed form." Gradient, set to zero, normal equations; mention the projection view and that you'd solve, not invert.
- "Implement it." Standardise, gradient descent with vectorised NumPy, check the loss falls, compare with `lstsq`.
- "Coefficients have strange signs." Multicollinearity; check correlations or variance inflation factors; regularise or drop duplicates.

--- revise
### Model
? Linear regression prediction? :: $\hat y = Xw$ (with a ones column for the intercept).
? Why squared error? :: It's maximum likelihood under Gaussian noise.
? Normal equations? :: $X^\top Xw = X^\top y$, so $w = (X^\top X)^{-1}X^\top y$.
? Geometric meaning? :: $Xw$ is the projection of y onto the column space; residuals are orthogonal to all features.
? One-feature slope? :: cov(x, y) / var(x).
? Why not invert $X^\top X$ explicitly? :: Numerically unstable; solve the system or use QR/SVD.
? Closed form cost? :: $O(nd^2 + d^3)$: use gradient descent for huge d or n.

### Practice
? Gradient of MSE w.r.t. w? :: $-\frac{2}{n}X^\top(y - Xw)$.
? Why standardise before gradient descent? :: Rounder loss surface, one learning rate suits all directions.
? What does a coefficient mean? :: Change in prediction per unit of that feature, holding others fixed.
? Effect of multicollinearity? :: Unstable, large, sign-flipping coefficients; predictions may still be fine.
? Fan-shaped residual plot means? :: Heteroscedasticity; try predicting log y or weighted least squares.
? $R^2$? :: 1 − SS_res/SS_tot: share of variance explained; can be negative on test data.

--- notes
## Model
ŷ = Xw (+ ones column). MSE = Gaussian MLE.
## Closed form
∇ = −(2/n)Xᵀ(y − Xw) = 0 → XᵀXw = Xᵀy → w = (XᵀX)⁻¹Xᵀy.
Projection onto column space; residual ⟂ features. 1-D slope = cov/var.
Cost O(nd² + d³). Solve / lstsq (QR, SVD), never invert. Collinear → ridge (+λI).
## Gradient descent
w −= lr·(2/n)Xᵀ(Xw + b − y); b −= lr·(2/n)Σerr. Standardise first. Mini-batch for big n.
## Coefficients
Per-unit effect holding others fixed. Unit-dependent. Correlated features → unstable. Not causal.
Non-linear via x², log x, buckets, interactions (linear in weights).
## Assumptions
Linearity · independent errors · constant variance · normal errors (inference) · no perfect collinearity.
Outliers dominate squared loss → Huber.
## Evaluate
RMSE/MAE; R² = 1 − SSres/SStot (negative possible on test). Residual plots.
## Still wins
Small data, interpretability, latency, sparse high-D, baselines, final layers.

--- doubts
Q: If neural networks exist, why learn linear regression in such depth?
A: Every dense layer is a linear map, and the final layer of most networks is a linear (or logistic) regression on learned features. Interviewers use it to test whether you can derive gradients, reason about conditioning and regularisation, and implement vectorised training: the same skills you need for larger models.

Q: When would I use the closed form versus gradient descent?
A: Closed form (via a stable solver) for small to moderate numbers of features when the data fits in memory: exact and fast. Gradient descent for very many features, data that doesn't fit in memory, streaming data, or when you add losses or regularisers without a closed form (L1, Huber).

Q: Is "linear regression" only for straight lines?
A: No: it's linear in the parameters. You can use $x$, $x^2$, $\sin x$ and $x_1 x_2$ as features and still fit by least squares. The curve can bend however the features allow.

Q: Why does adding a useless feature increase training $R^2$?
A: Because least squares can always use an extra column to fit a bit of noise; it can't do worse than ignoring it (weight 0). On held-out data, useless features usually lower $R^2$ slightly, which is why you judge on validation data or use adjusted $R^2$.

--- exercises
[design] Implement linear regression with mini-batch gradient descent in NumPy, including standardisation, and say how you'd verify it.
A: Compute mean and std on the training set; transform $X$. Initialise $w = 0$, $b = 0$. Each epoch, shuffle indices, loop over batches of 64: `err = Xb @ w + b - yb`, `w -= lr * 2 * Xb.T @ err / len(yb)`, `b -= lr * 2 * err.mean()`. Track mean squared error per epoch; it should fall smoothly. Verify against `np.linalg.lstsq` on the standardised data (weights should match to ~1e-3), and run a gradient check on a tiny batch.

[estimate] You have 10 million rows and 2,000 features. Is the normal-equation solve feasible on one machine?
A: Forming $X^\top X$ costs about $nd^2 = 10^7 \times 4\times10^6 = 4\times10^{13}$ multiply-adds, roughly a minute or a few at tens of GFLOPs per second, and it needs only a $2000 \times 2000$ matrix (32 MB). The $d^3 = 8\times10^9$ solve is trivial. Feasible, if $X$ can be streamed in chunks. At 200,000 features, $d^2$ storage alone (320 GB) rules it out.

[break] A model predicting delivery time has coefficients: distance +2.1 minutes/km, and "distance in miles" −1.2 minutes/mile. The team wants to report that longer distances in miles reduce time. What's going on?
A: The two features are the same quantity in different units: perfect multicollinearity. Least squares can split the effect between them arbitrarily, and the solver picked a combination where one is negative. The combined effect (2.1 − 1.2/1.609 ≈ 1.35 min/km) is what matters. Drop one feature or regularise; never interpret individual coefficients of collinear features.

--- pitfalls
- Inverting XᵀX explicitly
- Forgetting to standardise before gradient descent
- Interpreting coefficients of correlated features or reading them as causal
- Judging fit by training R²
- Ignoring residual plots

--- quiz
Q: The least-squares weights satisfy which equation?
- Xw = y exactly
- *XᵀXw = Xᵀy
- wᵀX = y
- XXᵀw = y
W: Setting the gradient of squared error to zero gives the normal equations.

Q: What is true of least-squares residuals?
- They are all zero
- *They are orthogonal to every feature column
- They are always positive
- They sum to the number of features
W: That's the projection property, XᵀR = 0.

Q: Your residual plot fans out as predictions grow. What does it suggest?
- Perfect fit
- *Non-constant error variance; try modelling log y
- Too few features
- Data leakage
W: That's heteroscedasticity.

Q: Two features are near-duplicates. What happens?
- Training fails
- *Individual coefficients become unstable though predictions may be fine
- R² drops to zero
- The intercept becomes infinite
W: Multicollinearity makes XᵀX nearly singular.

--- sources
- book :: An Introduction to Statistical Learning (chapter 3) :: James, Witten, Hastie, Tibshirani :: https://www.statlearning.com/
- book :: The Elements of Statistical Learning (chapter 3) :: Hastie, Tibshirani, Friedman :: https://hastie.su.domains/ElemStatLearn/
- course :: CS229 Lecture Notes: Linear Regression :: Andrew Ng, Stanford :: https://cs229.stanford.edu/main_notes.pdf
- course :: Linear regression :: Google Machine Learning Crash Course :: https://developers.google.com/machine-learning/crash-course/linear-regression

=== logistic-regression
blurb: Predicting probabilities with the sigmoid, log-odds and what weights mean, the log-loss gradient derived, the linear decision boundary, softmax regression for many classes, regularisation and calibration, and a from-scratch implementation.
signals: "Implement logistic regression from scratch" (the most common ML coding question) | "Why is it called regression if it classifies?" | Interpreting a CTR or risk model | Baselines for any classification problem
widgets: logistic-boundary
prereq: linear-regression, probability-ml

--- lesson
:::words
- **Logistic regression**: a linear model whose score is squashed into a probability between 0 and 1.
- **Sigmoid**: $\sigma(z) = 1/(1 + e^{-z})$, the S-shaped squashing function.
- **Logit** / **log-odds**: $\log\frac{p}{1-p}$; logistic regression makes this a linear function of the features.
- **Odds**: $p/(1-p)$. Probability 0.8 is odds 4 (4 to 1).
- **Decision boundary**: where the model is exactly 50/50; for logistic regression, a straight line (plane).
- **Softmax regression** (multinomial logistic regression): the extension to more than two classes.
- **Linearly separable**: two classes can be split perfectly by a straight line.
:::

## The problem in plain words

Many questions are yes/no: will this user click, is this email spam, will this loan default? We want a **probability**, not just a label, so we can rank, set thresholds by cost, and combine scores. Logistic regression takes a linear score (a weighted sum of features, which can be any number) and squashes it into a probability. It's the workhorse of ads and risk models, the classic interview implementation question, and the last layer of every neural classifier.

:::eli5
Add up evidence for "spam": +2 for "free money", +1.5 for a strange sender, −3 for "from your boss". The total can be any number. The sigmoid turns it into a percentage: lots of evidence for → close to 100%; against → close to 0%; balanced → 50%.
:::

## The model

$$z = \mathbf{w}^\top \mathbf{x} + b, \qquad p = P(y = 1 \mid \mathbf{x}) = \sigma(z) = \frac{1}{1 + e^{-z}}$$

Invert it and you see why it's called regression: the **log-odds** is linear,

$$\log\frac{p}{1-p} = \mathbf{w}^\top\mathbf{x} + b$$

So $w_j$ means: one more unit of $x_j$ adds $w_j$ to the log-odds, i.e. **multiplies the odds by $e^{w_j}$**. A weight of 0.69 doubles the odds. That's how risk models are explained to regulators.

The **decision boundary** $p = 0.5$ is where $z = 0$: the hyperplane $\mathbf{w}^\top\mathbf{x} + b = 0$. Logistic regression can only draw straight boundaries in the feature space it's given; curved boundaries need transformed or crossed features. Watch gradient descent find the boundary, and see what happens with data no straight line can split:

[[widget:logistic-boundary]]

## Training: log-loss and its gradient

Maximum likelihood with Bernoulli labels gives the log-loss (probability page):

$$L(\mathbf{w}) = -\frac{1}{n}\sum_i \big[y_i\log p_i + (1-y_i)\log(1-p_i)\big]$$

Using $\partial L_i/\partial z_i = p_i - y_i$ (loss-functions page) and $\partial z_i/\partial\mathbf{w} = \mathbf{x}_i$:

$$\nabla_{\mathbf{w}} L = \frac{1}{n}X^\top(\mathbf{p} - \mathbf{y}), \qquad \frac{\partial L}{\partial b} = \frac{1}{n}\sum_i (p_i - y_i)$$

Note the identical form to linear regression's gradient, with predictions $p$ in place of $Xw$. There's **no closed form**, but the loss is **convex**, so gradient descent (or Newton's method / L-BFGS for small models) finds the global optimum.

```python
import numpy as np

def sigmoid(z):
    return np.where(z >= 0, 1 / (1 + np.exp(-z)), np.exp(z) / (1 + np.exp(z)))  # stable both ways

def fit_logistic(X, y, lr=0.1, epochs=1000, l2=1e-3):
    n, d = X.shape
    w, b = np.zeros(d), 0.0
    for _ in range(epochs):
        p = sigmoid(X @ w + b)
        w -= lr * (X.T @ (p - y) / n + l2 * w)
        b -= lr * (p - y).mean()
    return w, b

def log_loss(X, y, w, b):
    z = X @ w + b
    return np.mean(np.maximum(z, 0) - z * y + np.log1p(np.exp(-np.abs(z))))
```

## Separable data and regularisation

If the classes are perfectly separable, the likelihood keeps improving as $\|\mathbf{w}\| \to \infty$ (the sigmoid becomes a step), so weights grow without bound and probabilities become overconfident 0s and 1s. **L2 regularisation** gives a finite, better-calibrated solution. L1 gives sparse models over huge sparse feature sets (ads, text). Regularisation strength is usually written $C = 1/\lambda$ in libraries.

## Many classes: softmax regression

For $K$ classes, keep one weight vector per class and use softmax:

$$p_k = \frac{e^{\mathbf{w}_k^\top\mathbf{x}}}{\sum_j e^{\mathbf{w}_j^\top\mathbf{x}}}, \qquad L = -\log p_{\text{true}}, \qquad \nabla_{\mathbf{w}_k} L = (p_k - y_k)\,\mathbf{x}$$

Subtract the maximum logit before exponentiating to avoid overflow (the log-sum-exp trick). Alternatives: **one-vs-rest** ($K$ binary models). For multi-label problems use $K$ independent sigmoids.

## Calibration and why ads love it

Because log-loss is a proper scoring rule, a well-specified logistic regression produces **calibrated** probabilities: of examples predicted at 2%, about 2% are positive. Ads systems multiply P(click) by the bid to rank ads and set prices, so calibration is money. Large-scale ad CTR models (Google's FTRL-Proximal paper, Facebook's GBDT + LR) were logistic regressions on billions of sparse features, trained online.

## Strengths and limits

- Fast to train and serve, interpretable, calibrated, convex, works with sparse high-dimensional data, a strong baseline.
- Only linear boundaries unless you engineer features; sensitive to feature scaling (for the optimiser and regularisation); outliers in feature space can dominate; complete separation needs regularisation.

## Interview angles

- "Implement logistic regression in NumPy." Stable sigmoid, vectorised gradient $X^\top(p - y)/n$, L2, loss tracking, a prediction function with a threshold, and a test on separable and noisy toy data.
- "Why not linear regression for classification?" Unbounded outputs, not probabilities, squared loss is badly suited (outliers far on the right side pull the boundary).
- "What does a weight of 1.1 mean?" Odds multiply by $e^{1.1} \approx 3$ per unit.

--- revise
### Model
? Logistic regression prediction? :: $p = \sigma(w^\top x + b)$.
? What is linear in logistic regression? :: The log-odds, $\log\frac{p}{1-p} = w^\top x + b$.
? Meaning of weight $w_j$? :: One unit of $x_j$ multiplies the odds by $e^{w_j}$.
? Decision boundary at threshold 0.5? :: The hyperplane $w^\top x + b = 0$.
? Can it learn curved boundaries? :: Only through transformed or crossed features.

### Training
? Gradient of log-loss? :: $\frac{1}{n}X^\top(p - y)$, bias: mean of (p − y).
? Closed form? :: None; but the loss is convex, so gradient methods find the global optimum.
? Perfectly separable data without regularisation? :: Weights grow without bound; probabilities become overconfident.
? Stable sigmoid trick? :: Use $e^z/(1+e^z)$ for negative z; compute loss from logits.

### Extensions
? Softmax regression gradient for class k? :: $(p_k - y_k)x$.
? Log-sum-exp trick? :: Subtract the max logit before exponentiating.
? Multi-label? :: Independent sigmoids.
? Why is LR popular for ads? :: Calibrated P(click) for bid × P(click) ranking; scales to billions of sparse features online.

--- notes
## Model
p = σ(wᵀx + b). Log-odds linear. Weight → odds × e^w (0.69 doubles odds).
Boundary: wᵀx + b = 0 (straight). Curves need feature transforms/crosses.
## Training
Log-loss = Bernoulli NLL, convex, no closed form.
∇w = Xᵀ(p − y)/n; ∂b = mean(p − y). Same shape as linear regression.
GD / SGD / L-BFGS / Newton (small). Stable sigmoid; loss from logits.
Separable → weights → ∞ → regularise (L2; L1 for sparse). C = 1/λ.
## Multi-class
Softmax regression: pₖ = e^{wₖᵀx}/Σ; ∇wₖ = (pₖ − yₖ)x. Log-sum-exp. One-vs-rest alt.
Multi-label: K sigmoids.
## Use
Calibrated (proper scoring) → ads: rank by bid × P(click). FTRL online LR; GBDT + LR.
Pros: fast, interpretable, convex, sparse-friendly. Cons: linear only, needs scaling, separation.

--- doubts
Q: Why is it called regression if it does classification?
A: Historically it's a regression model for the log-odds of a probability. It becomes a classifier only when you pick a threshold. Statisticians still use it to estimate how factors change the odds of an outcome.

Q: Should I use a threshold of 0.5?
A: Only if the classes and mistake costs are balanced. Choose the threshold from costs, capacity or the precision/recall you need, using validation data (class-imbalance page).

Q: Why does the gradient look exactly like linear regression's?
A: Both are "generalised linear models" with their canonical link function: identity for Gaussian, logit for Bernoulli. For any such model, the gradient of the negative log-likelihood is $X^\top(\text{prediction} - y)$. It's a deep and handy coincidence: one gradient formula for several models.

Q: Is logistic regression a neural network?
A: It's a neural network with no hidden layer: one linear layer followed by a sigmoid and trained with cross-entropy. Adding hidden layers lets the network learn its own non-linear features instead of you engineering them.

--- exercises
[design] Implement softmax regression for 3 classes from scratch and say how you'd test it.
A: $W$ is $d \times 3$, $b$ length 3. Forward: `Z = X @ W + b`, subtract `Z.max(1, keepdims=True)`, `P = exp(Z) / exp(Z).sum(1, keepdims=True)`. Loss: `-log(P[range(n), y]).mean()`. Gradient: `G = P.copy(); G[range(n), y] -= 1; dW = X.T @ G / n; db = G.mean(0)`. Test: loss decreases; on well-separated Gaussian blobs accuracy is near 100%; gradient check on a small random problem; predictions sum to 1 per row; compare with scikit-learn's `LogisticRegression(multi_class='multinomial')`.

[estimate] A fraud model's weight on "card used in a new country" is 1.8 and the base log-odds is −6. What's the predicted fraud probability for a transaction with only that feature on?
A: Log-odds $= -6 + 1.8 = -4.2$; $p = \sigma(-4.2) \approx 1/(1 + 66.7) \approx 1.5\%$. Without the feature it's $\sigma(-6) \approx 0.25\%$: the feature multiplies the odds by $e^{1.8} \approx 6$.

[break] Training logistic regression on a small, perfectly separable dataset, the loss approaches 0 but validation predictions are all exactly 0.0 or 1.0 and log-loss on validation is huge. Why?
A: With separable data and no regularisation, the weights grow without limit to make training probabilities exactly 0 or 1. Any validation mistake then costs $-\log(\approx 0)$, which is enormous. Add L2 regularisation (or early stopping) for finite weights and calibrated probabilities.

--- pitfalls
- Using an unstable sigmoid or computing log(sigmoid) separately
- No regularisation on separable or high-dimensional data
- Defaulting to a 0.5 threshold
- Using softmax for multi-label problems
- Reading weights of correlated features as independent effects

--- quiz
Q: In logistic regression, what is a linear function of the features?
- The probability
- *The log-odds
- The odds
- The loss
W: log(p/(1−p)) = wᵀx + b.

Q: A weight of ln(2) ≈ 0.69 means one unit of the feature does what?
- Adds 0.69 to the probability
- *Doubles the odds
- Doubles the probability
- Halves the loss
W: Odds are multiplied by e^0.69 = 2.

Q: What is the gradient of the mean log-loss with respect to w?
- Xᵀ(y − p)·p(1−p)
- *Xᵀ(p − y)/n
- (p − y)²
- Xw − y
W: The sigmoid derivative cancels with the log.

Q: Why must logistic regression on perfectly separable data be regularised?
- It won't converge to any loss
- *The weights grow without bound, giving overconfident probabilities
- The loss becomes non-convex
- The gradient becomes zero immediately
W: Larger weights keep pushing training probabilities toward 0 and 1.

--- sources
- course :: CS229 Lecture Notes: Classification and logistic regression :: Andrew Ng, Stanford :: https://cs229.stanford.edu/main_notes.pdf
- paper :: Ad Click Prediction: a View from the Trenches (FTRL-Proximal) :: McMahan et al., Google (KDD 2013) :: https://research.google/pubs/ad-click-prediction-a-view-from-the-trenches/
- book :: Speech and Language Processing (chapter 5, logistic regression) :: Jurafsky, Martin :: https://web.stanford.edu/~jurafsky/slp3/
- course :: Logistic regression :: Google Machine Learning Crash Course :: https://developers.google.com/machine-learning/crash-course/logistic-regression

=== decision-trees
blurb: How a decision tree chooses splits (Gini impurity, entropy and information gain, variance reduction), why single trees overfit, pruning, and how bagging and random forests turn many unstable trees into one strong, robust model.
signals: Tabular data with mixed feature types | "Implement the best split for a decision tree" (ML coding) | "Random forest vs gradient boosting?" | "Which features matter?"
widgets: tree-split
prereq: bias-variance

--- lesson
:::words
- **Decision tree**: a flowchart of yes/no questions on features ("age < 30?") ending in a prediction at each leaf.
- **Split**: one question that divides the data at a node into two groups.
- **Impurity**: how mixed the labels in a group are. A pure group has one class only.
- **Gini impurity**: chance that two random picks from the group have different labels.
- **Entropy**: average surprise of the labels (probability page); **information gain** is how much a split reduces it.
- **Leaf**: an end node; it predicts the majority class (or the average value).
- **Pruning**: cutting back branches that don't help on validation data.
- **Bagging**: training many models on bootstrap samples and averaging them.
- **Random forest**: bagged trees that also consider only a random subset of features at each split.
:::

## The problem in plain words

A doctor's triage often looks like a flowchart: chest pain? → over 50? → abnormal ECG? → high risk. Decision trees learn such flowcharts from data automatically. They handle numbers and categories without scaling, capture interactions and non-linear effects naturally, and are easy to explain. Alone they overfit badly; combined into forests or boosted ensembles they are the best general-purpose models for **tabular** data, and still beat deep learning there in most benchmarks.

:::eli5
Twenty Questions: each question should split the remaining possibilities as evenly and usefully as possible. "Is it alive?" is a great first question; "Is it a left-handed giraffe?" is a terrible one. A tree learns which questions to ask, in which order.
:::

## Choosing a split

At each node, try every feature and every threshold, and pick the split that makes the two children as **pure** as possible. For classes with proportions $p_k$:

$$\text{Gini} = 1 - \sum_k p_k^2, \qquad \text{Entropy} = -\sum_k p_k\log_2 p_k$$

A 50/50 node has Gini 0.5 and entropy 1 bit; a pure node has 0 for both. The quality of a split is the **weighted impurity decrease**:

$$\Delta = I(\text{parent}) - \frac{n_L}{n}I(\text{left}) - \frac{n_R}{n}I(\text{right})$$

With entropy, $\Delta$ is the **information gain**. For regression trees, impurity is the **variance** of the targets, and leaves predict the mean.

Worked example: 10 examples, 5 positive. Split A gives left (4+, 1−) and right (1+, 4−). Gini left $= 1 - 0.8^2 - 0.2^2 = 0.32$, same on the right, so $\Delta = 0.5 - 0.32 = 0.18$. Split B gives (5+, 3−) and (0+, 2−): Gini left $= 1 - 0.625^2 - 0.375^2 \approx 0.469$, right 0, weighted $0.8 \times 0.469 = 0.375$, $\Delta \approx 0.125$. Split A wins.

Drag the threshold on each feature below and watch the impurity of both sides; the best split is where the impurity decrease peaks:

[[widget:tree-split]]

**Finding the best threshold efficiently** (an ML-coding favourite): sort the examples by the feature, then sweep left to right, moving one example at a time from the right child to the left and updating class counts incrementally. That's $O(n \log n)$ per feature instead of $O(n^2)$. Only thresholds between consecutive distinct values (where the label changes) matter.

Then recurse on each child until a stopping rule: maximum depth, minimum examples per leaf, minimum impurity decrease, or pure nodes. Greedy splitting isn't globally optimal (finding the optimal tree is NP-hard), but works well.

## Why single trees overfit

A deep enough tree can put every training example in its own leaf: zero training error, terrible generalisation, and **high variance**: change a few training examples and the top split, hence the whole tree, may change. Remedies: limit depth, require minimum samples per leaf, or **cost-complexity pruning** (grow fully, then remove subtrees whose validation benefit doesn't justify their size, controlled by a parameter $\alpha$).

Other properties: axis-aligned, step-shaped boundaries (a diagonal boundary needs a staircase of splits); no extrapolation beyond training values (a regression tree predicts at most the largest leaf mean); scale-invariant; handle missing values (some implementations learn a default direction).

## Bagging and random forests

**Bagging** (bootstrap aggregating): train $B$ trees, each on a bootstrap sample (draw $n$ examples with replacement, so each sample contains about 63% of the distinct examples), and average their predictions (or majority vote). Averaging reduces variance; if each tree's variance is $\sigma^2$ and pairwise correlation is $\rho$, the average's variance is

$$\rho\sigma^2 + \frac{1-\rho}{B}\sigma^2$$

So more trees help until the correlation term dominates. **Random forests** lower $\rho$ by also choosing each split from a random subset of features (commonly $\sqrt{d}$ for classification, $d/3$ for regression), so trees don't all split on the same strong feature first.

Bonuses:

- **Out-of-bag (OOB) error**: each tree didn't see ~37% of examples; evaluate each example using only the trees that didn't train on it. A free validation estimate.
- **Feature importance**: total impurity decrease per feature (biased toward high-cardinality features) or, better, permutation importance.
- Robust defaults: random forests are hard to badly misconfigure. Trees are deep (low bias), averaging handles variance.

## Forests vs boosting

| | Random forest | Gradient boosting |
|---|---|---|
| Trees | Deep, independent, parallel | Shallow, sequential, each fixes the last |
| Mainly reduces | Variance | Bias |
| Tuning | Little needed | More sensitive (learning rate, depth, rounds) |
| Accuracy on tabular data | Very good | Usually best |
| Overfitting with more trees | No (just plateaus) | Yes, without early stopping |

## Interview angles

- "Implement the best split." Sort per feature, sweep with running counts, compute weighted Gini, track the best; mention $O(d\, n\log n)$ per node.
- "Why do random forests work?" Averaging many low-bias, high-variance trees, decorrelated by bootstrap samples and random feature subsets.
- "Why not one deep tree?" High variance: unstable and overfits.
- "Feature importance is misleading?" Impurity-based importance favours many-valued features; use permutation importance.

--- revise
### Splits
? Gini impurity? :: $1 - \sum p_k^2$; 0.5 for a 50/50 binary node.
? Entropy of a 50/50 binary node? :: 1 bit.
? Split quality? :: Parent impurity minus weighted child impurities (information gain with entropy).
? Regression tree impurity and leaf value? :: Variance; leaf predicts the mean.
? Efficient best threshold? :: Sort by the feature, sweep updating counts incrementally: O(n log n).
? Is greedy splitting optimal? :: No; optimal trees are NP-hard, greedy works well in practice.

### Single trees
? Why do deep trees overfit? :: They can memorise every example: high variance, unstable top splits.
? Remedies? :: Max depth, min samples per leaf, cost-complexity pruning.
? Can trees extrapolate? :: No; predictions stay within the range of leaf values.

### Forests
? Bagging? :: Train on bootstrap samples, average predictions: reduces variance.
? Fraction of distinct examples in a bootstrap sample? :: About 63%.
? Variance of an average of correlated trees? :: ρσ² + (1−ρ)σ²/B.
? How do random forests decorrelate trees? :: Random feature subsets at each split (√d for classification).
? Out-of-bag error? :: Evaluate each example with trees that didn't see it: free validation.
? Forest vs boosting? :: Forest: deep parallel trees, reduces variance, easy to tune. Boosting: shallow sequential trees, reduces bias, usually more accurate.

--- notes
## Impurity
Gini = 1 − Σpₖ² (max 0.5 binary). Entropy = −Σ pₖ log₂ pₖ (max 1 bit).
Δ = I(parent) − (nL/n)I(L) − (nR/n)I(R). Regression: variance, leaf = mean.
## Best split
Per feature: sort, sweep, incremental counts → O(n log n). Thresholds between distinct values.
Greedy; optimal tree NP-hard. Stop: depth, min leaf, min Δ, purity.
## Single tree
Memorises → high variance, unstable. Prune (cost-complexity α), limit depth/min leaf.
Axis-aligned staircases; no extrapolation; scale-invariant; missing-value routing.
## Bagging / RF
Bootstrap: ~63% distinct, ~37% OOB. Average/vote.
Var(avg) = ρσ² + (1−ρ)σ²/B → decorrelate.
RF: random √d features per split (d/3 regression). OOB error free.
Importance: impurity (biased to high cardinality) vs permutation (better).
## RF vs boosting
RF: deep, parallel, variance ↓, robust, more trees never overfit.
Boosting: shallow, sequential, bias ↓, best accuracy, needs early stopping.

--- doubts
Q: Gini or entropy: does it matter?
A: Rarely. They pick the same split most of the time. Gini is slightly cheaper (no logarithm) and is scikit-learn's default; entropy gives the information-gain interpretation. Tuning depth and leaf size matters far more.

Q: Why does a bootstrap sample contain about 63% of the distinct examples?
A: Each draw misses a given example with probability $1 - 1/n$; after $n$ draws it's missed with probability $(1 - 1/n)^n \to 1/e \approx 0.368$. So about 63.2% of examples appear at least once.

Q: Do random forests overfit if I add more trees?
A: No. More trees only reduce the variance of the average; error plateaus. Individual trees do overfit, but averaging handles that. What can overfit is very deep trees on very noisy data with tiny leaves, which you control with minimum leaf size.

Q: Why do trees beat neural networks on tabular data?
A: Tabular features are heterogeneous (units, categories, missing values), relationships are often step-like, and datasets are moderate in size. Trees are naturally suited to that and need little tuning. Neural networks' advantages (learning representations of raw pixels or text) don't apply as much. Research benchmarks (Grinsztajn et al., 2022) confirm boosted trees still win on most medium-sized tabular datasets.

--- exercises
[design] Write the function `best_split(x, y)` for one numeric feature and binary labels, returning the threshold with the lowest weighted Gini, in O(n log n).
A: Sort indices by `x`. Total positives `P`, total `n`. Sweep `i` from 1 to n−1, moving example `i−1` to the left: `left_pos += y[i-1]`. Skip if `x[i] == x[i-1]`. Left Gini: `1 - (lp/i)**2 - ((i-lp)/i)**2`; right with `P - lp` over `n - i`. Weighted `(i*gl + (n-i)*gr)/n`. Track the minimum; threshold is the midpoint `(x[i-1] + x[i])/2`. Edge cases: all values equal (no split), single class (Gini 0 already).

[estimate] A random forest's trees each have prediction variance 1.0, with pairwise correlation 0.3. What's the variance of the average of 10 trees, 100 trees, and infinitely many?
A: $0.3 + 0.7/B$: 10 trees → 0.37; 100 → 0.307; infinite → 0.3. Beyond about 100 trees, gains are tiny; reducing correlation (smaller feature subsets) is the only way further.

[choose] Your data: 200,000 rows, 80 features (numeric and categorical, some missing), need a strong model this week. Logistic regression, random forest, gradient boosting or a neural network?
A: Gradient boosting (LightGBM/XGBoost/CatBoost) first: usually the most accurate on tabular data, handles missing values and categoricals natively, fast. Use a random forest as a robust second opinion and logistic regression as an interpretable baseline. A neural network is unlikely to win here without a lot of tuning.

--- pitfalls
- Growing single trees without depth or leaf-size limits
- Trusting impurity-based feature importance for high-cardinality features
- Expecting tree models to extrapolate beyond the training range
- One-hot encoding hundreds of categories for trees instead of native categorical handling
- Thinking more forest trees cause overfitting

--- quiz
Q: A node has 8 examples: 6 positive, 2 negative. Its Gini impurity?
- 0.25
- *0.375
- 0.5
- 0.75
W: 1 − 0.75² − 0.25² = 1 − 0.5625 − 0.0625 = 0.375.

Q: What does a random forest add on top of bagging?
- Boosting
- Pruning
- *A random subset of features considered at each split
- Shallow trees
W: Feature subsampling decorrelates the trees.

Q: What does out-of-bag error give you?
- Training error
- *A validation estimate using examples each tree didn't see
- The test error exactly
- The bias
W: About 37% of examples are left out of each bootstrap sample.

Q: Which is true of a regression tree?
- It can predict values beyond the training range
- *Its predictions are leaf averages, so it cannot extrapolate
- It needs scaled features
- It uses Gini impurity
W: Each leaf predicts the mean of its training targets.

--- sources
- paper :: Random Forests :: Leo Breiman (2001) :: https://link.springer.com/article/10.1023/A:1010933404324
- book :: The Elements of Statistical Learning (chapters 9 and 15) :: Hastie, Tibshirani, Friedman :: https://hastie.su.domains/ElemStatLearn/
- paper :: Why do tree-based models still outperform deep learning on tabular data? :: Grinsztajn, Oyallon, Varoquaux (NeurIPS 2022) :: https://arxiv.org/abs/2207.08815
- course :: Decision Forests :: Google for Developers :: https://developers.google.com/machine-learning/decision-forests

=== gradient-boosting
blurb: Boosting as gradient descent in function space: fitting each new tree to the residuals (negative gradients), shrinkage, the XGBoost objective with second-order terms and regularised leaves, LightGBM and CatBoost tricks, tuning, and why it dominates tabular ML.
signals: Tabular prediction in ML design (fraud, ETA, ranking features, churn) | "Explain how XGBoost works" | "Random forest or boosting?" | Learning-to-rank with LambdaMART
widgets: boosting-residuals
prereq: decision-trees, loss-functions

--- lesson
:::words
- **Boosting**: building a strong model by adding many weak models one after another, each focusing on what the current ensemble gets wrong.
- **Weak learner**: a model only a bit better than guessing; here, a shallow tree.
- **Residual**: what's left to explain, $y - \hat y$.
- **Shrinkage** (learning rate, $\eta$): scaling each new tree's contribution down so the ensemble learns slowly and generalises better.
- **GBDT**: gradient-boosted decision trees, the general method. **XGBoost**, **LightGBM**, **CatBoost**: popular fast implementations.
- **Early stopping**: stopping adding trees when validation loss stops improving.
:::

## The problem in plain words

One shallow tree is a crude model. But if each new tree is trained to fix the mistakes left by all the previous trees, a few hundred crude trees add up to a very precise one. That's gradient boosting, and it's been the winning method for tabular data (Kaggle, fraud, credit, ranking features, ETA) for over a decade. Interviewers expect you to explain it as "gradient descent with trees", know the main hyperparameters, and know when to choose it.

:::eli5
Guess someone's weight: start with the average adult weight. You're 12 kg too low for tall people, so add a correction rule for height. Now you're 4 kg off for athletes; add a small correction for that. Each correction is simple, but stacked together they get very close. Boosting stacks small corrections.
:::

## Boosting for squared error: fit the residuals

Start with a constant $F_0(x) = \bar y$. Then for $m = 1, \dots, M$:

1. Compute residuals $r_i = y_i - F_{m-1}(x_i)$.
2. Fit a small regression tree $h_m$ to predict $r_i$ from $x_i$.
3. Update $F_m(x) = F_{m-1}(x) + \eta\, h_m(x)$, with $\eta$ around 0.05–0.1.

Step through it below: watch the ensemble's curve approach the data as trees are added, and what a high learning rate or deep trees do to the validation error:

[[widget:boosting-residuals]]

## Why "gradient": any loss

For squared error $L = \tfrac12(y - F)^2$, the residual is exactly the **negative gradient** of the loss with respect to the prediction, $-\partial L/\partial F = y - F$. Friedman's insight: for **any** differentiable loss, fit the next tree to the negative gradients (the **pseudo-residuals**):

$$r_{im} = -\left.\frac{\partial L(y_i, F)}{\partial F}\right|_{F = F_{m-1}(x_i)}$$

So each tree is a step of gradient descent, taken in the space of functions rather than parameters. For log-loss, the pseudo-residual is $y - p$; for absolute error, $\text{sign}(y - F)$; for ranking, LambdaMART uses NDCG-weighted pairwise gradients (ranking-models page). After fitting the tree's structure, each leaf's value is set to the best constant for that leaf under the real loss (a line search).

## XGBoost's refinements

XGBoost (Chen and Guestrin, 2016) made boosting fast and regularised:

- **Second-order approximation**: expand the loss to second order around the current prediction, with gradients $g_i$ and Hessians $h_i$ (curvature). For a leaf containing examples $I_j$, the optimal leaf weight and the resulting loss reduction are
$$w_j^* = -\frac{\sum_{i \in I_j} g_i}{\sum_{i \in I_j} h_i + \lambda}, \qquad \text{gain} = \frac12\left[\frac{G_L^2}{H_L + \lambda} + \frac{G_R^2}{H_R + \lambda} - \frac{(G_L + G_R)^2}{H_L + H_R + \lambda}\right] - \gamma$$
This is a Newton step per leaf, and the gain formula scores every candidate split.
- **Regularisation**: $\lambda$ (L2 on leaf weights) and $\gamma$ (minimum gain to make a split, which prunes).
- **Sparsity-aware splits**: learns a default direction for missing values.
- **Approximate split finding** with quantile sketches, column blocks for parallelism, cache-aware access.
- **Row and column subsampling** like random forests, to reduce variance.

**LightGBM** (Microsoft) is usually faster on big data: **histogram** binning of features (255 bins), **leaf-wise** growth (split the leaf with the largest gain anywhere, not level by level: more accurate, needs `num_leaves`/depth limits), **GOSS** (keep examples with large gradients, sample small ones) and **exclusive feature bundling**. **CatBoost** (Yandex) handles categorical features natively with ordered target statistics (avoiding target-encoding leakage) and uses symmetric (oblivious) trees that are very fast at inference.

## Hyperparameters that matter

| Parameter | Effect | Typical |
|---|---|---|
| Learning rate $\eta$ | Smaller = better generalisation, more trees | 0.01–0.1 |
| Number of trees | Set by **early stopping** on validation | 100s–1000s |
| Tree depth / num_leaves | Interaction order; deeper = more variance | depth 4–8, leaves 31–255 |
| Min child weight / min samples per leaf | Prevents tiny noisy leaves | |
| Subsample (rows), colsample (features) | Randomness, less variance | 0.6–0.9 |
| $\lambda$, $\gamma$ | Leaf L2, split threshold | |

The standard recipe: fix a small learning rate, tune depth / leaves and subsampling, and let early stopping pick the number of trees. Lowering $\eta$ by 2× roughly doubles the trees needed and often gains a little accuracy.

## Strengths, limits and uses

- Best-in-class accuracy on tabular data, handles mixed types and missing values, little preprocessing, fast inference (microseconds per example for hundreds of trees), many tools for explanation (SHAP has a fast exact algorithm for trees).
- Sequential training (parallel within each tree, not across trees); can overfit noisy data without early stopping; no extrapolation; not suited to raw images, text or audio (use embeddings from neural nets as features instead).
- Common production roles: fraud and risk scoring, ETA prediction, the ranking stage of search systems (LambdaMART was the workhorse of web ranking), feature-rich CTR models (Facebook's GBDT + logistic regression), and as a strong baseline in every ML design answer for tabular data.

## Interview angles

- "Explain gradient boosting." Start with residual fitting for squared error; generalise to negative gradients for any loss; add shrinkage and early stopping.
- "XGBoost vs LightGBM?" Second-order with regularised leaves vs histogram, leaf-wise growth and gradient-based sampling; LightGBM usually faster on large data.
- "Boosting overfits?" Yes with too many trees or a high learning rate; early stopping, smaller η, subsampling, min leaf size.

--- revise
### Core idea
? Boosting in one sentence? :: Add weak learners sequentially, each fitting what the current ensemble gets wrong.
? Squared-error boosting step? :: Fit a tree to residuals y − F, then F ← F + ηh.
? Why "gradient" boosting? :: Each tree fits the negative gradient of the loss w.r.t. predictions: gradient descent in function space.
? Pseudo-residual for log-loss? :: y − p.
? Role of shrinkage η? :: Slows learning so many small steps generalise better; needs more trees.
? How is the number of trees chosen? :: Early stopping on validation loss.

### XGBoost and friends
? XGBoost optimal leaf weight? :: $-G/(H + \lambda)$: a Newton step using gradient and Hessian sums.
? What do λ and γ control in XGBoost? :: L2 on leaf weights; minimum gain to split.
? LightGBM's main speed tricks? :: Histogram binning, leaf-wise growth, GOSS, feature bundling.
? CatBoost's distinctive features? :: Native categoricals with ordered target statistics; symmetric trees.

### Use
? Random forest vs boosting on bias/variance? :: Forest reduces variance; boosting reduces bias.
? Where is boosting used in production? :: Fraud/risk, ETA, search ranking (LambdaMART), CTR features.
? Main weaknesses? :: Sequential training, overfitting without early stopping, no extrapolation, not for raw media.

--- notes
## Algorithm
F₀ = mean (or log-odds). Each round: pseudo-residuals rᵢ = −∂L/∂F; fit shallow tree; F += η·h.
Squared error → residuals. Log-loss → y − p. Absolute → sign. LambdaMART → NDCG-weighted pairwise.
Leaf values by line search on the real loss.
Gradient descent in function space.
## XGBoost
2nd-order: gᵢ, hᵢ. Leaf w* = −G/(H + λ). Gain = ½[G_L²/(H_L+λ) + G_R²/(H_R+λ) − (G_L+G_R)²/(H+λ)] − γ.
λ leaf L2, γ split penalty. Missing default direction. Quantile sketch. Row/col subsampling.
## LightGBM / CatBoost
LightGBM: histograms (255 bins), leaf-wise growth (limit num_leaves), GOSS, EFB → fast on big data.
CatBoost: ordered target stats for categoricals, symmetric trees, fast inference.
## Tuning
Small η (0.01–0.1) + early stopping for #trees. Depth 4–8 / leaves 31–255. Min child weight.
Subsample 0.6–0.9 rows and columns. Halving η ≈ doubles trees.
## Use
Best tabular accuracy, missing/mixed OK, fast inference, TreeSHAP.
Sequential, overfits without early stop, no extrapolation, not raw media.
Fraud, ETA, LambdaMART ranking, GBDT + LR CTR, baselines.

--- doubts
Q: If each tree only fits residuals, why not use one big tree instead?
A: One big tree fits everything greedily at once and overfits; its early splits can't be revised. Boosting adds many small, regularised corrections, each chosen with full knowledge of the current errors, and shrinkage means no single tree dominates. That combination gives much lower test error.

Q: Why use shallow trees in boosting but deep ones in random forests?
A: Forests reduce variance by averaging, so each tree should be low-bias (deep). Boosting reduces bias by adding corrections, so each learner should be simple and low-variance (shallow); depth then controls the order of feature interactions the ensemble can express.

Q: What is the Hessian doing in XGBoost?
A: It measures the curvature of the loss at each example's prediction. Dividing summed gradients by summed Hessians is a Newton step: it takes bigger steps where the loss is flat and smaller ones where it's sharply curved. For log-loss, $h = p(1 - p)$, so confident examples count less.

Q: Can gradient boosting be used with neural networks?
A: The principle works with any weak learner, but trees are ideal (fast, scale-invariant, good at interactions). In practice, people combine them the other way: neural networks produce embeddings that become features for a boosted tree model, or boosted trees produce leaf indices that become features for a linear model (Facebook's GBDT + LR).

--- exercises
[estimate] Boosting with squared error, η = 0.1, starting at prediction 0 for a single example with target 10. If each tree predicts the current residual exactly, what's the prediction after 1, 10 and 50 trees?
A: Each step closes 10% of the remaining gap: residual after $m$ trees $= 10 \times 0.9^m$. After 1: prediction 1.0. After 10: $10(1 - 0.9^{10}) \approx 6.5$. After 50: $10(1 - 0.9^{50}) \approx 9.95$. Shrinkage makes progress gradual, which is why η and the number of trees are tuned together.

[choose] You have 50 million rows and 300 features for a fraud model, retrained daily. XGBoost (exact), LightGBM, or a random forest?
A: LightGBM: histogram binning and GOSS make training on 50M rows fast enough for daily retraining, and boosting is typically more accurate than a forest for this. Use early stopping on a recent time-based validation set, monitor feature importance shifts, and consider downsampling negatives to speed up further (recalibrate).

[break] A boosted model's validation loss falls for 300 rounds, then rises steadily while training loss keeps dropping. The team keeps the model after 2,000 rounds. What should they do?
A: It's overfitting after round ~300. Use early stopping (keep the best iteration on validation, with patience of maybe 50 rounds), or lower the learning rate and add regularisation (min child weight, subsampling, smaller depth). Evaluate on a separate test set because the stopping point was chosen on validation.

--- pitfalls
- Training a fixed large number of rounds without early stopping
- High learning rate with deep trees
- Using one-hot encoding for very high-cardinality categories instead of native handling
- Expecting good predictions outside the training range
- Tuning on a random split for time-ordered data

--- quiz
Q: In gradient boosting with log-loss, what does each new tree fit?
- The labels
- The previous tree's predictions
- *The pseudo-residuals y − p
- Random noise
W: They are the negative gradients of log-loss w.r.t. the logit.

Q: What does lowering the learning rate typically require?
- Deeper trees
- *More trees (found by early stopping)
- Fewer features
- No validation set
W: Smaller steps need more of them.

Q: XGBoost's leaf weight −G/(H + λ) is an example of what?
- A gradient-descent step
- *A regularised Newton step
- Bagging
- Pruning
W: Gradient sum over Hessian sum, with λ for L2.

Q: Which is a LightGBM technique?
- Symmetric trees
- Ordered target statistics
- *Leaf-wise growth with histogram binning
- Bootstrap sampling of trees
W: Symmetric trees and ordered statistics are CatBoost.

--- sources
- paper :: Greedy Function Approximation: A Gradient Boosting Machine :: Jerome Friedman (2001) :: https://projecteuclid.org/journals/annals-of-statistics/volume-29/issue-5/Greedy-function-approximation-A-gradient-boostingmachine/10.1214/aos/1013203451.full
- paper :: XGBoost: A Scalable Tree Boosting System :: Chen, Guestrin (KDD 2016) :: https://arxiv.org/abs/1603.02754
- paper :: LightGBM: A Highly Efficient Gradient Boosting Decision Tree :: Ke et al., Microsoft (NeurIPS 2017) :: https://papers.nips.cc/paper/6907-lightgbm-a-highly-efficient-gradient-boosting-decision-tree
- paper :: CatBoost: unbiased boosting with categorical features :: Prokhorenkova et al. (NeurIPS 2018) :: https://arxiv.org/abs/1706.09516

=== svm-knn-bayes
blurb: Three classic models interviewers still ask about: support vector machines (maximum margin, hinge loss, the kernel trick), k-nearest neighbours (distance, k, the curse of dimensionality) and naive Bayes (Bayes' rule with an independence assumption), with when each is the right choice.
signals: "Explain SVMs and the kernel trick" | "Implement kNN" (ML coding) | Text classification with little data | "Why does kNN fail in high dimensions?"
widgets: knn-boundary
prereq: logistic-regression, linear-algebra-ml, probability-ml

--- lesson
:::words
- **Support vector machine (SVM)**: a classifier that finds the boundary with the widest possible gap (margin) between the classes.
- **Margin**: the distance from the boundary to the nearest training points.
- **Support vectors**: the training points closest to the boundary; only they determine it.
- **Kernel**: a function that measures similarity between two points as if they'd been mapped into a richer feature space.
- **k-nearest neighbours (kNN)**: predict by looking at the $k$ most similar training examples and taking a vote (or average).
- **Curse of dimensionality**: in many dimensions, data becomes sparse and distances become nearly equal, breaking similarity-based methods.
- **Naive Bayes**: a classifier using Bayes' rule while assuming features are independent given the class.
:::

## The problem in plain words

Before deep learning, these three were the go-to tools, and each embodies an idea that's still everywhere: **margins** (SVMs) live on in hinge and contrastive losses; **nearest neighbours** is exactly how vector search and retrieval work today; **naive Bayes** is the simplest probabilistic classifier and a strong baseline for text. Interviewers use them to probe fundamentals: can you explain why each works and when it fails?

:::eli5
SVM: draw the widest possible road between two groups of houses; only the houses at the road's edge matter. kNN: to guess whether a new house is expensive, look at its five nearest neighbours. Naive Bayes: to guess if an email is spam, multiply how typical each word is of spam, as if words were chosen independently.
:::

## Support vector machines

For labels $y \in \{-1, +1\}$ and a linear score $f(x) = \mathbf{w}^\top x + b$, the distance from a point to the boundary is $|f(x)|/\|\mathbf{w}\|$. If we scale so the closest points have $y f(x) = 1$, the margin is $1/\|\mathbf{w}\|$, so **maximising the margin = minimising $\|\mathbf{w}\|$**:

$$\min_{\mathbf{w}, b} \tfrac12\|\mathbf{w}\|^2 \quad \text{s.t.} \quad y_i(\mathbf{w}^\top x_i + b) \ge 1$$

Real data overlaps, so the **soft-margin** SVM allows violations at a cost $C$:

$$\min \tfrac12\|\mathbf{w}\|^2 + C\sum_i \max(0, 1 - y_i f(x_i))$$

That second term is the **hinge loss**: L2-regularised hinge-loss linear classification. Large $C$ = few violations allowed (risk of overfitting); small $C$ = wider margin, more violations. The solution depends only on the **support vectors** (points on or inside the margin).

**The kernel trick.** The optimisation's dual form uses the data only through dot products $x_i^\top x_j$. Replace them with a kernel $K(x_i, x_j) = \phi(x_i)^\top\phi(x_j)$ and the SVM behaves as if it worked in the (possibly infinite-dimensional) feature space $\phi$, without ever computing $\phi$:

- Polynomial: $K(x, z) = (x^\top z + c)^p$.
- RBF (Gaussian): $K(x, z) = \exp(-\gamma\|x - z\|^2)$: similarity decays with distance; $\gamma$ large = very local, wiggly boundaries.

Kernel SVMs gave the best results on many tasks in the 2000s, but training scales between $O(n^2)$ and $O(n^3)$ and the kernel matrix needs $O(n^2)$ memory, so they don't scale to millions of examples. SVMs also don't output probabilities natively (Platt scaling adds them).

## k-nearest neighbours

No training: store the data. To predict, find the $k$ closest training points (by Euclidean or cosine distance) and take a majority vote (classification) or average (regression), optionally weighted by $1/\text{distance}$.

- **$k$ controls bias and variance**: $k = 1$ memorises (jagged boundary, high variance); large $k$ smooths (high bias). Pick $k$ by cross-validation; odd $k$ avoids ties for two classes.
- **Scale features**: a feature in metres would drown one in kilometres.
- **Cost**: prediction is $O(nd)$ per query by brute force. Use spatial indexes (k-d trees, ball trees: good in low dimensions) or **approximate nearest-neighbour** indexes (HNSW, IVF-PQ; vector-search pages) in high dimensions.
- **Curse of dimensionality**: in high dimensions, a fixed fraction of the data covers most of each axis's range, and the ratio of nearest to farthest distance approaches 1, so "nearest" means little. In 100 dimensions, to capture 1% of uniformly spread data you need a cube spanning $0.01^{1/100} \approx 95\%$ of each axis. kNN works when data lies near a low-dimensional structure, as **learned embeddings** do; that's why modern retrieval is kNN in embedding space.

Change $k$ below and watch the decision regions go from jagged to smooth:

[[widget:knn-boundary]]

## Naive Bayes

By Bayes' rule, $P(c \mid x) \propto P(c)\,P(x \mid c)$. Assume features are **independent given the class**:

$$P(c \mid x_1, \dots, x_d) \propto P(c)\prod_j P(x_j \mid c)$$

Train by counting: class frequencies and per-class feature distributions (multinomial for word counts, Bernoulli for word presence, Gaussian for numbers). Predict with the class of highest posterior, summing **logs** to avoid underflow. Use **Laplace smoothing** (add 1 to every count) so a word never seen in spam doesn't zero out the whole product.

Why it works despite the false assumption: classification only needs the right **ranking** of classes, not correct probabilities, and errors from correlated features often push all classes similarly. Its probabilities are badly calibrated (overconfident) though. Strengths: tiny data needs, training in one pass, very fast, strong baseline for text (spam filtering was its famous early success).

## Choosing among them today

| Model | Use it when | Avoid when |
|---|---|---|
| Linear SVM | High-dimensional sparse data (text), need max-margin robustness | You need probabilities, huge data with SGD logistic regression available |
| Kernel SVM | Small to medium data, complex boundaries, few features | More than ~100k examples |
| kNN | Similarity is meaningful (embeddings), need non-parametric, easy updates (add a point) | Raw high-dimensional features, strict latency without an index |
| Naive Bayes | Text, tiny data, need speed or a baseline | Calibrated probabilities or strongly dependent features |

## Interview angles

- "Explain the kernel trick." Dual form uses only dot products; replace them with a kernel computing the dot product in a higher-dimensional space implicitly.
- "SVM vs logistic regression?" Both linear; hinge vs log-loss: SVM focuses on the boundary points and gives no probabilities; LR uses all points and is calibrated.
- "Implement kNN." Vectorised distances ($\|a\|^2 - 2a^\top b + \|b\|^2$), `argpartition` for the top $k$, majority vote; mention scaling and ANN for scale.
- "Why is naive Bayes naive?" Conditional independence of features; still works for ranking classes.

--- revise
### SVM
? What does an SVM maximise? :: The margin, 1/‖w‖, between the classes.
? Soft-margin SVM objective? :: ½‖w‖² + C Σ max(0, 1 − y f(x)): L2-regularised hinge loss.
? Effect of large C? :: Fewer margin violations allowed: tighter fit, more overfitting risk.
? What are support vectors? :: The points on or inside the margin; they alone determine the boundary.
? Kernel trick? :: The dual uses only dot products; a kernel computes them in a richer feature space implicitly.
? RBF kernel and γ? :: exp(−γ‖x − z‖²); larger γ gives more local, wiggly boundaries.
? Why don't kernel SVMs scale? :: O(n²) memory and O(n²)–O(n³) training.

### kNN
? kNN training cost? :: None; it stores the data. Prediction is O(nd) brute force.
? Effect of k? :: Small k: high variance; large k: high bias.
? Why scale features for kNN? :: Distances are dominated by large-scale features.
? Curse of dimensionality for kNN? :: Distances concentrate; nearest and farthest neighbours become similar.
? Why does modern retrieval still use kNN? :: Learned embeddings lie on low-dimensional structure where distance is meaningful; ANN indexes make it fast.

### Naive Bayes
? Naive Bayes assumption? :: Features independent given the class.
? Prediction formula? :: argmax_c log P(c) + Σ log P(x_j | c).
? Laplace smoothing? :: Add 1 to counts so unseen feature values don't zero the product.
? Why does it work despite wrong assumptions? :: Only class ranking matters; probabilities are poorly calibrated.

--- notes
## SVM
Margin = 1/‖w‖ → min ½‖w‖² s.t. yᵢf(xᵢ) ≥ 1.
Soft: ½‖w‖² + CΣ max(0, 1 − yf) = L2 + hinge. Big C → tight fit.
Support vectors decide boundary.
Kernel trick: dual uses xᵢᵀxⱼ → K(xᵢ, xⱼ). Poly (xᵀz + c)^p; RBF exp(−γ‖x−z‖²).
O(n²) memory, O(n²–n³) train. No native probabilities (Platt).
## kNN
Store data; vote/average k nearest (weight 1/d). k small = variance, large = bias; CV, odd k.
Scale features. Brute O(nd)/query; k-d/ball trees (low-D); ANN (HNSW, IVF-PQ) high-D.
Curse: 1% of data in 100-D needs 95% of each axis; distances concentrate.
Works on embeddings (low intrinsic dimension).
## Naive Bayes
P(c|x) ∝ P(c) Π P(xⱼ|c). Multinomial (counts), Bernoulli (presence), Gaussian (numbers).
Log-space; Laplace +1. One-pass training. Overconfident probabilities. Great text baseline.
## Today
Linear SVM: sparse text. Kernel SVM: small data. kNN: embeddings. NB: text baselines.

--- doubts
Q: Is a linear SVM better than logistic regression?
A: Usually they perform about the same. SVMs ignore points far from the boundary (hinge loss is zero there), which can help with outliers on the correct side; logistic regression gives calibrated probabilities and trains easily with SGD at huge scale. In practice people pick logistic regression when probabilities matter and either one for pure classification.

Q: What does it mean that the RBF kernel corresponds to an infinite-dimensional feature space?
A: The Taylor expansion of $\exp(-\gamma\|x - z\|^2)$ contains polynomial terms of every degree, so the implicit features $\phi$ include all monomials of all orders. You never compute them; you only compute the kernel value, which is cheap.

Q: How is kNN different from k-means?
A: Completely different: kNN is supervised (classify a point by its labelled neighbours); k-means is unsupervised clustering (group unlabelled points into k clusters). Only the letter k is shared.

Q: If naive Bayes probabilities are miscalibrated, can I still use it for ranking spam?
A: Yes: ranking only needs the order of scores, which is often good. If you need real probabilities (thresholds from costs), calibrate with Platt scaling or isotonic regression on validation data.

--- exercises
[design] Implement kNN classification in NumPy for a batch of queries, without Python loops over training points.
A: Squared distances via $\|q\|^2 - 2qX^\top + \|x\|^2$: `d = (Q**2).sum(1)[:,None] - 2*Q@X.T + (X**2).sum(1)[None,:]` (shape queries × train). `idx = np.argpartition(d, k, axis=1)[:, :k]` gets the k smallest in O(n) per row. Labels `y[idx]`; vote with `np.apply_along_axis(np.bincount...)` or a one-hot sum and argmax. Standardise features first; clip tiny negative distances from rounding to 0.

[estimate] A kernel SVM on 1 million training examples: how big is the kernel matrix in float32?
A: $10^6 \times 10^6 \times 4$ bytes $= 4$ TB. Infeasible; use a linear SVM, random Fourier features to approximate the RBF kernel, or a different model.

[choose] You must classify support tickets into 12 categories with 800 labelled tickets and need something working today. Which model, and what's your upgrade path?
A: Start with TF-IDF + linear SVM or logistic regression (or multinomial naive Bayes as an even quicker baseline): strong with little data, trains in seconds. Upgrade path: sentence embeddings from a pretrained encoder + logistic regression, then fine-tune a small transformer, or prompt an LLM with few-shot examples and compare on a held-out set.

--- pitfalls
- kNN on unscaled or raw high-dimensional features
- Kernel SVMs on millions of examples
- Using naive Bayes probabilities as calibrated
- Forgetting Laplace smoothing
- Confusing kNN with k-means

--- quiz
Q: Maximising the SVM margin is equivalent to?
- Maximising ‖w‖
- *Minimising ‖w‖ subject to correct classification with margin 1
- Minimising the number of support vectors
- Maximising C
W: The margin is 1/‖w‖.

Q: What makes the kernel trick possible?
- Gradient descent
- *The SVM's dual form uses data only through dot products
- Hinge loss is convex
- Support vectors are few
W: Any dot product can be swapped for a kernel.

Q: In kNN, k = 1 tends to give?
- High bias
- *High variance (jagged boundaries, memorisation)
- Perfect generalisation
- Smooth boundaries
W: Each point decides its own neighbourhood.

Q: Why use Laplace smoothing in naive Bayes?
- To speed up training
- *To avoid zero probabilities for feature values unseen in a class
- To calibrate probabilities
- To remove stop words
W: One zero factor would zero the whole product.

--- sources
- paper :: Support-Vector Networks :: Cortes, Vapnik (1995) :: https://link.springer.com/article/10.1007/BF00994018
- course :: CS229 Lecture Notes: Support Vector Machines and Kernel Methods :: Andrew Ng, Stanford :: https://cs229.stanford.edu/main_notes.pdf
- paper :: When Is "Nearest Neighbor" Meaningful? :: Beyer et al. (ICDT 1999) :: https://link.springer.com/chapter/10.1007/3-540-49257-7_15
- book :: Speech and Language Processing (chapter 4, naive Bayes) :: Jurafsky, Martin :: https://web.stanford.edu/~jurafsky/slp3/

=== clustering-pca
blurb: Unsupervised learning you will be asked about: k-means (Lloyd's algorithm, k-means++, choosing k), Gaussian mixtures and EM, hierarchical and density-based clustering, PCA derived as variance maximisation, and t-SNE and UMAP for visualisation.
signals: "Implement k-means" (ML coding) | "Group users without labels" | "Reduce 1,000 features" | "Explain PCA" or "why does t-SNE look like that?"
widgets: kmeans, pca-projection
prereq: linear-algebra-ml, probability-ml

--- lesson
:::words
- **Unsupervised learning**: finding structure in data without labels.
- **Clustering**: grouping similar points together.
- **Centroid**: the centre (average point) of a cluster.
- **Inertia** (within-cluster sum of squares): total squared distance from points to their centroid; k-means minimises it.
- **Gaussian mixture model (GMM)**: data modelled as coming from several bell-shaped blobs, each point belonging to each blob with some probability.
- **EM (expectation–maximisation)**: an algorithm that alternates guessing hidden assignments and refitting parameters.
- **Dimensionality reduction**: representing data with fewer numbers while keeping what matters.
- **PCA (principal component analysis)**: finding the directions in which data varies most, and keeping the top few.
:::

## The problem in plain words

Most data has no labels. You might want to find groups of similar customers, compress 1,000 correlated measurements into 20, detect unusual points, or draw a 2-D map of embeddings to see what a model learned. Clustering and dimensionality reduction do this. In ML interviews, **implementing k-means** is one of the most common coding questions, and "explain PCA" is a standard breadth question.

:::eli5
Throw a handful of coloured marbles on the floor and ask a friend to put three cups where the marbles bunch up: each marble belongs to its nearest cup, then each cup slides to the middle of its marbles, and you repeat until the cups stop moving. That's k-means.
:::

## k-means

Goal: choose $k$ centroids $\mu_1, \dots, \mu_k$ and an assignment of points to minimise

$$J = \sum_i \|x_i - \mu_{c(i)}\|^2$$

**Lloyd's algorithm** alternates two steps, each of which can only lower $J$, so it converges (to a local optimum):

1. **Assign**: each point to its nearest centroid.
2. **Update**: each centroid to the mean of its points.

Step through it below, try a bad initialisation, and see k-means++ avoid it:

[[widget:kmeans]]

```python
import numpy as np

def kmeans(X, k, iters=100, seed=0):
    rng = np.random.default_rng(seed)
    C = X[rng.choice(len(X), 1)]                      # k-means++ initialisation
    while len(C) < k:
        d2 = ((X[:, None] - C[None]) ** 2).sum(-1).min(1)
        C = np.vstack([C, X[rng.choice(len(X), p=d2 / d2.sum())]])
    for _ in range(iters):
        labels = ((X[:, None] - C[None]) ** 2).sum(-1).argmin(1)
        newC = np.array([X[labels == j].mean(0) if np.any(labels == j) else C[j] for j in range(k)])
        if np.allclose(newC, C):
            break
        C = newC
    return C, labels
```

Facts to know:

- Each iteration costs $O(nkd)$. Mini-batch k-means scales to huge data.
- **k-means++** picks each new initial centroid with probability proportional to its squared distance from existing ones, giving provably good starts ($O(\log k)$-competitive). Also run several restarts and keep the lowest $J$.
- **Choosing k**: the elbow in $J$ versus $k$, silhouette score, or what the downstream use needs (often a business decision).
- **Assumptions**: roughly spherical, similar-size clusters (it minimises Euclidean distance to a mean). It fails on elongated, nested or very unequal clusters, and is sensitive to scale and outliers.
- k-means is a hard-assignment, equal-variance special case of a Gaussian mixture.

## Gaussian mixtures and EM

A GMM says each point comes from one of $k$ Gaussians, picked with probabilities $\pi_j$, each with its own mean $\mu_j$ and covariance $\Sigma_j$. Points get **soft** memberships. EM alternates:

- **E-step**: responsibilities $r_{ij} = \pi_j\mathcal{N}(x_i \mid \mu_j, \Sigma_j) / \sum_l \pi_l\mathcal{N}(x_i \mid \mu_l, \Sigma_l)$.
- **M-step**: re-estimate $\pi_j$, $\mu_j$ and $\Sigma_j$ as responsibility-weighted averages.

Each iteration never decreases the likelihood. GMMs handle elliptical clusters of different sizes and give probabilities (useful for anomaly detection: low likelihood = unusual). Choose $k$ with BIC.

## Other clustering methods

- **Hierarchical (agglomerative)**: start with each point alone, repeatedly merge the closest pair of clusters (linkage: single, complete, average, Ward). Produces a dendrogram; cut it at any level. $O(n^2)$ memory, so for thousands, not millions.
- **DBSCAN / HDBSCAN**: clusters are dense regions; points in sparse regions are labelled noise. Finds arbitrary shapes, doesn't need $k$, handles outliers; needs a density scale ($\varepsilon$, min points), which HDBSCAN largely removes.
- **Clustering embeddings**: in practice, cluster learned embeddings (users, documents) with k-means or HDBSCAN; deduplicate near-identical items; build topic groups.

## PCA

Find orthogonal directions of maximum variance. For centred data $X$ ($n \times d$), the variance along a unit vector $\mathbf{u}$ is $\mathbf{u}^\top S\mathbf{u}$, where $S = \frac{1}{n}X^\top X$ is the covariance matrix. Maximise subject to $\|\mathbf{u}\| = 1$ with a Lagrange multiplier:

$$S\mathbf{u} = \lambda\mathbf{u}$$

So the best direction is the **top eigenvector** of the covariance matrix, and the variance captured is its eigenvalue. The next component is the top eigenvector orthogonal to the first, and so on. In practice compute it from the **SVD** of the centred data, $X = U\Sigma V^\top$: the principal directions are the columns of $V$ and the variances are $\sigma_i^2/n$. Rotate the data below and watch the projected variance peak on the first principal axis:

[[widget:pca-projection]]

Using PCA:

- **Explained variance ratio**: keep enough components for, say, 95% of variance.
- **Standardise** first when features have different units; otherwise the largest-unit feature dominates.
- Uses: compression, denoising, decorrelating features, visualisation, speeding up downstream models, and compressing embeddings.
- Limits: linear only; maximises variance, which may not be what separates classes (that's LDA's job); components can be hard to interpret.
- **Power iteration** finds the top component without a full decomposition: repeat $\mathbf{u} \leftarrow S\mathbf{u}/\|S\mathbf{u}\|$ (linear algebra page): an ML-coding favourite.

## t-SNE and UMAP: for looking, not measuring

Both make 2-D maps that keep **local neighbourhoods**: points close in high dimensions stay close. **t-SNE** matches neighbour probabilities using a heavy-tailed distribution in 2-D; **UMAP** builds a neighbour graph and lays it out, faster and preserving more global structure. Cautions: cluster sizes and the distances between clusters in the picture mean little; results depend on perplexity / neighbours and random seed; don't feed them to downstream models without care. Use them to **inspect** embeddings, not to prove things.

## Interview angles

- "Implement k-means." Vectorised distances, k-means++, empty-cluster handling, convergence check, multiple restarts.
- "Explain PCA." Centre, covariance, top eigenvectors (or SVD), project; derive from variance maximisation.
- "k-means vs GMM?" Hard vs soft assignment, spherical vs elliptical clusters, distance vs likelihood.
- "Segment users with no labels." Build behaviour embeddings, cluster, validate clusters with stakeholders and stability across runs.

--- revise
### k-means
? k-means objective? :: Minimise Σ‖xᵢ − μ_c(i)‖² (inertia).
? Lloyd's two steps? :: Assign each point to its nearest centroid; move each centroid to its points' mean.
? Why does it converge? :: Both steps can only decrease the objective; local optimum only.
? k-means++? :: Pick initial centroids with probability ∝ squared distance to the nearest chosen one.
? Cost per iteration? :: O(nkd).
? When does k-means fail? :: Non-spherical, unequal-size or nested clusters; unscaled features; outliers.
? Choosing k? :: Elbow, silhouette, or downstream needs.

### Other clustering
? GMM vs k-means? :: Soft vs hard assignments; elliptical clusters with covariances vs spherical.
? EM steps? :: E: compute responsibilities; M: refit weights, means, covariances.
? DBSCAN strengths? :: Arbitrary shapes, finds noise points, no k needed.

### PCA
? PCA derivation? :: Maximise uᵀSu with ‖u‖ = 1 → Su = λu: top eigenvectors of the covariance.
? PCA from SVD? :: Centre X = UΣVᵀ; columns of V are components, variances σ²/n.
? Why standardise first? :: Otherwise large-unit features dominate the variance.
? PCA limits? :: Linear; maximises variance, not class separation.
? Power iteration? :: Repeat u ← Su/‖Su‖ to get the top eigenvector.

### Visualisation
? What do t-SNE/UMAP preserve? :: Local neighbourhoods; cluster sizes and inter-cluster distances aren't reliable.

--- notes
## k-means
J = Σ‖xᵢ − μ‖². Lloyd: assign → update; monotone, local optimum.
O(nkd)/iter. Mini-batch for scale.
k-means++: P ∝ d² to nearest chosen; + several restarts.
k: elbow, silhouette, business need.
Assumes spherical, similar sizes; scale features; outliers hurt.
Empty cluster: keep old centroid or reseed far point.
## GMM / EM
Soft memberships, covariances. E: rᵢⱼ ∝ πⱼN(xᵢ|μⱼ,Σⱼ). M: weighted re-estimates.
Likelihood never decreases. BIC for k. Anomaly = low likelihood.
## Others
Agglomerative (linkages, dendrogram, O(n²) memory). DBSCAN/HDBSCAN: density, noise, shapes.
Cluster embeddings for segmentation, dedupe, topics.
## PCA
Centre (standardise if units differ). S = XᵀX/n. Su = λu; λ = variance captured.
SVD of X: V = directions, σ²/n = variances. Keep ~95% explained variance.
Linear; variance ≠ class separation (LDA). Power iteration: u ← Su/‖Su‖.
## t-SNE / UMAP
Local neighbourhoods for 2-D maps; sizes/gaps meaningless; seed/perplexity dependent. Inspect, don't measure.

--- doubts
Q: Does k-means always find the best clustering?
A: No. It's guaranteed to converge, but to a local optimum that depends on the initial centroids. k-means++ and several restarts (keeping the lowest inertia) make bad solutions rare. Finding the global optimum is NP-hard.

Q: Why do we centre data before PCA but not always scale it?
A: Centring is required (variance is measured around the mean). Scaling is a choice: if features share units and their raw variances matter (pixel intensities), don't scale; if units differ (age, income), standardise so no feature dominates just because of its units.

Q: Is PCA the same as an autoencoder?
A: A linear autoencoder with squared error learns the same subspace as PCA (though not necessarily the same orthogonal axes). Non-linear autoencoders can capture curved structure PCA can't.

Q: How do I evaluate a clustering with no labels?
A: Internal measures (silhouette: how much closer points are to their own cluster than the next one; inertia), stability (do clusters persist across seeds and subsamples?), and above all usefulness: do the segments behave differently on metrics you care about, and do domain experts recognise them?

--- exercises
[design] Implement k-means with k-means++ and handle the case where a cluster becomes empty.
A: Initialise the first centroid uniformly; each next one sampled with probability proportional to squared distance to the nearest existing centroid. Loop: compute distances (n × k), assign by argmin, recompute means; if a cluster has no points, re-seed it to the point currently farthest from its centroid (or keep the old centroid). Stop when assignments don't change or centroids move less than a tolerance. Return centroids, labels and inertia; run several seeds and keep the lowest inertia.

[estimate] You have 10 million 256-dimensional embeddings and want 1,000 clusters. Roughly how much work is one k-means iteration, and what would you do?
A: $nkd = 10^7 \times 10^3 \times 256 \approx 2.6\times10^{12}$ multiply-adds per iteration: seconds on a GPU, many minutes on a CPU. Use mini-batch k-means or a GPU library (FAISS k-means), possibly train on a 1M-point sample and then assign all points. This is also how IVF vector indexes build their coarse clusters.

[break] A team clusters customers with k-means on raw features: annual spend (0–100,000) and number of visits (0–50). The clusters split almost entirely by spend. Why?
A: Euclidean distance is dominated by the large-scale feature, so visits barely affect assignments. Standardise features (or log-transform spend, which is skewed) before clustering; consider whether the features should be weighted by business importance.

--- pitfalls
- Running k-means once with random initialisation
- Clustering unscaled features
- Forcing k-means onto non-spherical clusters
- Forgetting to centre before PCA
- Reading t-SNE cluster sizes and distances as meaningful

--- quiz
Q: Which step of Lloyd's algorithm moves the centroids?
- Assignment
- *Update: each centroid becomes the mean of its assigned points
- Initialisation
- Pruning
W: Assignment changes labels; update moves centroids.

Q: The first principal component is?
- The feature with the largest mean
- *The top eigenvector of the covariance matrix: the direction of maximum variance
- The first column of X
- The direction of minimum variance
W: Maximising uᵀSu gives the top eigenvector.

Q: Which clustering method labels points in sparse regions as noise?
- k-means
- GMM
- *DBSCAN
- PCA
W: Density-based clustering leaves low-density points unassigned.

Q: How does k-means++ choose initial centroids?
- Uniformly at random
- The first k points
- *Each new one with probability proportional to its squared distance from the nearest chosen centroid
- The k points with the largest norms
W: Spreading initial centroids out avoids poor local optima.

--- sources
- paper :: k-means++: The Advantages of Careful Seeding :: Arthur, Vassilvitskii (SODA 2007) :: https://theory.stanford.edu/~sergei/papers/kMeansPP-soda.pdf
- book :: Pattern Recognition and Machine Learning (chapters 9 and 12) :: Christopher Bishop :: https://www.microsoft.com/en-us/research/publication/pattern-recognition-machine-learning/
- article :: How to Use t-SNE Effectively :: Wattenberg, Viégas, Johnson (Distill 2016) :: https://distill.pub/2016/misread-tsne/
- paper :: UMAP: Uniform Manifold Approximation and Projection :: McInnes, Healy, Melville (2018) :: https://arxiv.org/abs/1802.03426
