=== d-mlc-linear-regression
title: Linear regression by gradient descent (NumPy)
topic: ai-classic-models
tier: 1
est: 40
prompt: Implement linear regression trained with batch gradient descent in NumPy: fit(X, y) and predict(X). Then compare it with the closed-form solution.
--- words
- **Linear regression**: predict y as a weighted sum of features plus a bias: ŷ = Xw + b.
- **Mean squared error (MSE)**: the average of (ŷ − y)²; the loss we minimise.
- **Gradient descent**: repeatedly move the weights a small step against the gradient of the loss.
- **Learning rate**: the size of that step.
- **Normal equation**: the closed-form answer w = (XᵀX)⁻¹Xᵀy.
--- flow
1. **0–5**: shapes (X is n × d, y is n), bias handling, stopping rule, allowed libraries.
2. **5–12**: write the loss and its gradient: dL/dw = (2/n)·Xᵀ(ŷ − y), dL/db = (2/n)·Σ(ŷ − y).
3. **12–30**: code fit and predict, vectorised.
4. **30–40**: test on synthetic data with known weights; feature scaling; closed form; regularisation follow-up.
--- clarify
- X shape (n, d), y shape (n,); floats; n can be large (no n × n matrices).
- Include a bias term? Yes, learn it separately (or add a column of ones).
- Stopping: fixed epochs or when the loss change is below a tolerance.
- NumPy only; no scikit-learn.
--- approach
- Prediction ŷ = Xw + b. Loss L = (1/n)·Σ(ŷᵢ − yᵢ)².
- Gradients: with residual r = ŷ − y, ∂L/∂w = (2/n)·Xᵀr and ∂L/∂b = (2/n)·Σr.
- Update: w ← w − lr·∂L/∂w, b ← b − lr·∂L/∂b.
- Cost per epoch O(n·d). Standardise features first, otherwise one large-scale feature forces a tiny learning rate.
--- code
```python
import numpy as np

class LinearRegression:
    def __init__(self, lr=0.1, epochs=1000, tol=1e-9):
        self.lr, self.epochs, self.tol = lr, epochs, tol

    def fit(self, X, y):
        X = np.asarray(X, dtype=float); y = np.asarray(y, dtype=float)
        n, d = X.shape
        self.mu, self.sigma = X.mean(0), X.std(0) + 1e-12   # standardise
        Xs = (X - self.mu) / self.sigma
        self.w, self.b = np.zeros(d), 0.0
        prev = np.inf
        for _ in range(self.epochs):
            r = Xs @ self.w + self.b - y          # residuals, shape (n,)
            loss = (r @ r) / n
            if prev - loss < self.tol:
                break
            prev = loss
            self.w -= self.lr * (2 / n) * (Xs.T @ r)
            self.b -= self.lr * (2 / n) * r.sum()
        return self

    def predict(self, X):
        return ((np.asarray(X, dtype=float) - self.mu) / self.sigma) @ self.w + self.b
```
--- test
- Synthetic data: X random, y = X @ [2, −3] + 5 + small noise → recovered weights (after un-standardising, w / sigma) close to [2, −3] and bias close to 5.
- Compare with `np.linalg.lstsq` on [X, 1]: predictions agree to ~1e-4.
- Edge cases: a constant feature (sigma = 0, hence the 1e-12), d = 1, a learning rate too large (loss grows: lower it).
- Follow-ups: L2 regularisation adds 2λw to the gradient; mini-batch SGD for big n; closed form costs O(n·d² + d³) and is unstable when XᵀX is nearly singular, so use lstsq or ridge.
--- steer
Q: Why standardise?
A: Different feature scales make the loss surface elongated; one learning rate then is too big for some directions and too small for others.
Q: When would you use the closed form instead?
A: Small d; it costs O(d³); use lstsq/QR for stability; gradient descent scales to huge n and streaming data.
Q: Add L2 regularisation.
A: Loss + λ‖w‖², gradient + 2λw, usually not on the bias.
--- pitfalls
- Looping over samples in Python instead of vectorising
- Forgetting the 1/n (the learning rate then depends on dataset size)
- No feature scaling
- Inverting XᵀX directly
--- level
- **L4**: correct vectorised gradient descent and a test.
- **L5**: derives the gradient, scales features, compares with lstsq, explains conditioning and regularisation, mini-batch variant.
--- prereqs
linear-regression
--- paths
- [deep] Derive the gradient :: Residual r = Xw + b − y; (2/n)·Xᵀr and (2/n)·Σr.
- [deep] Feature scaling :: Elongated loss surface; standardise; un-standardise the weights.
- [variation] Add L2 regularisation :: + 2λw in the gradient; bias not regularised.
- [variation] Closed form :: Normal equation vs lstsq; O(d³); conditioning.
- [failure] The loss explodes :: Learning rate too large; scaling; check gradient numerically.

=== d-mlc-logistic-regression
title: Logistic regression from scratch
topic: ai-classic-models
tier: 1
est: 40
prompt: Implement binary logistic regression in NumPy with a numerically stable loss, trained by gradient descent, and a predict_proba method.
--- words
- **Sigmoid**: σ(z) = 1 / (1 + e^(−z)), squashes a score into a probability.
- **Binary cross-entropy (log loss)**: −[y·log p + (1 − y)·log(1 − p)].
- **Logit**: the raw score z = Xw + b before the sigmoid.
- **Numerical stability**: avoiding overflow in e^z and log(0).
--- flow
1. **0–5**: labels 0/1, shapes, regularisation, stopping.
2. **5–12**: loss and gradient: ∂L/∂w = (1/n)·Xᵀ(p − y).
3. **12–30**: code with a stable sigmoid and a stable loss from logits.
4. **30–40**: tests, class imbalance, multiclass follow-up.
--- clarify
- y ∈ {0, 1}, X (n, d). Want probabilities, not just labels.
- L2 regularisation? Optional strength λ.
- Very large |z| may occur (separable data), so the code must not overflow.
--- approach
- p = σ(Xw + b). Loss L = mean of −[y log p + (1 − y) log(1 − p)] + (λ/2)‖w‖².
- The gradient simplifies to ∂L/∂w = (1/n)·Xᵀ(p − y) + λw and ∂L/∂b = mean(p − y): same shape as linear regression with p in place of ŷ.
- Stable loss from logits: log(1 + e^z) − y·z, with log(1 + e^z) = max(z, 0) + log(1 + e^(−|z|)).
--- code
```python
import numpy as np

def sigmoid(z):
    out = np.empty_like(z, dtype=float)
    pos = z >= 0
    out[pos] = 1 / (1 + np.exp(-z[pos]))
    ez = np.exp(z[~pos])                 # z < 0, so no overflow
    out[~pos] = ez / (1 + ez)
    return out

def bce_from_logits(z, y):
    # mean of log(1 + e^z) - y*z, computed stably
    return np.mean(np.maximum(z, 0) + np.log1p(np.exp(-np.abs(z))) - y * z)

class LogisticRegression:
    def __init__(self, lr=0.1, epochs=2000, l2=0.0):
        self.lr, self.epochs, self.l2 = lr, epochs, l2

    def fit(self, X, y):
        X = np.asarray(X, float); y = np.asarray(y, float)
        n, d = X.shape
        self.w, self.b = np.zeros(d), 0.0
        for _ in range(self.epochs):
            z = X @ self.w + self.b
            g = sigmoid(z) - y                     # dL/dz per example
            self.w -= self.lr * (X.T @ g / n + self.l2 * self.w)
            self.b -= self.lr * g.mean()
        return self

    def loss(self, X, y):
        return bce_from_logits(X @ self.w + self.b, y) + 0.5 * self.l2 * self.w @ self.w

    def predict_proba(self, X):
        return sigmoid(np.asarray(X, float) @ self.w + self.b)

    def predict(self, X, threshold=0.5):
        return (self.predict_proba(X) >= threshold).astype(int)
```
--- test
- Two Gaussian blobs: accuracy high, loss decreasing every few epochs.
- `sigmoid(np.array([-1000., 0., 1000.]))` → [0, 0.5, 1] without warnings.
- Gradient check: compare the analytic gradient with finite differences on a tiny problem (relative error < 1e-6).
- Separable data without L2: weights grow forever; with l2 > 0 they stay finite.
- Follow-ups: class imbalance → class weights in the loss or adjust the threshold; multiclass → softmax regression (the softmax question).
--- steer
Q: Why not use MSE with the sigmoid?
A: Non-convex in w and tiny gradients when the sigmoid saturates; cross-entropy gives the clean (p − y) gradient and is the likelihood.
Q: Your sigmoid overflows.
A: Split by sign, or compute the loss from logits with log1p.
Q: What happens on perfectly separable data?
A: Weights diverge; regularisation or early stopping.
--- pitfalls
- np.exp(-z) overflow for very negative z
- log(p) when p rounds to 0
- Thresholding at 0.5 regardless of class balance or costs
--- level
- **L4**: correct gradient descent with the sigmoid.
- **L5**: derives (p − y), stable implementation, gradient check, separability and regularisation, thresholds.
--- prereqs
logistic-regression
--- paths
- [deep] Derive the gradient :: dL/dz = p − y, then chain rule to w.
- [deep] Numerical stability :: Split sigmoid; loss from logits with log1p.
- [failure] Separable data :: Diverging weights; L2 or early stopping.
- [variation] Imbalanced classes :: Class weights, threshold tuning, PR curve.
- [variation] Multiclass :: Softmax regression and cross-entropy.

=== d-mlc-kmeans
title: K-means clustering
topic: ai-classic-models
tier: 1
est: 40
prompt: Implement k-means in NumPy: given points X and k, return cluster centres and assignments. Include a good initialisation.
--- words
- **Centroid**: the mean of the points in a cluster.
- **Lloyd's algorithm**: alternate assigning points to the nearest centroid and recomputing centroids.
- **Inertia**: the sum of squared distances from points to their centroid; k-means minimises it.
- **k-means++**: picks initial centres far apart, which makes bad local minima less likely.
--- flow
1. **0–5**: shapes, k, distance, stopping, empty clusters, random seed.
2. **5–12**: the algorithm and its cost per iteration O(n·k·d).
3. **12–30**: vectorised distances, k-means++ init, loop until assignments stop changing.
4. **30–40**: tests, empty cluster handling, choosing k, scaling up.
--- clarify
- X (n, d) floats, 1 ≤ k ≤ n; Euclidean distance.
- Stop when assignments don't change or after max_iter.
- Reproducible with a seed.
--- approach
- Distances without loops: ‖x − c‖² = ‖x‖² − 2x·c + ‖c‖² → an (n, k) matrix in one matrix product.
- k-means++: first centre uniformly at random; each next centre sampled with probability proportional to D(x)², the squared distance to the nearest chosen centre.
- Each Lloyd step never increases inertia, so it converges (to a local minimum).
--- code
```python
import numpy as np

def sq_dists(X, C):
    # (n, k) squared distances, clipped at 0 for rounding errors
    return np.maximum((X**2).sum(1)[:, None] - 2 * X @ C.T + (C**2).sum(1)[None, :], 0)

def kmeans_pp(X, k, rng):
    n = len(X)
    C = [X[rng.integers(n)]]
    for _ in range(1, k):
        d2 = sq_dists(X, np.array(C)).min(1)
        total = d2.sum()
        idx = rng.integers(n) if total == 0 else rng.choice(n, p=d2 / total)
        C.append(X[idx])
    return np.array(C, dtype=float)

def kmeans(X, k, max_iter=100, seed=0):
    X = np.asarray(X, float)
    rng = np.random.default_rng(seed)
    C = kmeans_pp(X, k, rng)
    labels = None
    for _ in range(max_iter):
        new = sq_dists(X, C).argmin(1)
        if labels is not None and np.array_equal(new, labels):
            break
        labels = new
        for j in range(k):
            members = X[labels == j]
            if len(members):
                C[j] = members.mean(0)
            else:  # empty cluster: move it to the point farthest from its centre
                far = sq_dists(X, C).min(1).argmax()
                C[j] = X[far]
    inertia = sq_dists(X, C)[np.arange(len(X)), labels].sum()
    return C, labels, inertia
```
--- test
- Three well-separated blobs with k = 3: each blob gets one label; centres near the true means.
- k = 1 → centre is the mean of all points; k = n → inertia 0.
- Duplicated points (total D² = 0 during init) don't crash.
- Inertia never increases between iterations (assert in a debug run).
- Follow-ups: choose k with the elbow of inertia or silhouette; run several seeds and keep the lowest inertia; mini-batch k-means for millions of points; k-means assumes round, equal-size clusters (GMMs or DBSCAN otherwise).
--- steer
Q: Why k-means++?
A: Random init can put two centres in one cluster; D² sampling spreads them; expected O(log k) approximation.
Q: How do you compute distances fast?
A: The expansion ‖x‖² − 2x·c + ‖c‖² with one matrix product.
Q: A cluster ends up empty.
A: Reinitialise it to a far point or the largest cluster's farthest member.
--- pitfalls
- Triple Python loops over points, centres and dimensions
- No handling of empty clusters
- Unscaled features dominating the distance
- One run with one seed
--- level
- **L4**: correct Lloyd iterations.
- **L5**: vectorised distances, k-means++, empty clusters, convergence argument, choosing k, scaling up.
--- prereqs
clustering-pca
--- paths
- [deep] Vectorised distances :: Expansion with one matrix product; clip negatives.
- [deep] Initialisation :: k-means++ with D² sampling; multiple restarts.
- [failure] Empty cluster :: Reinitialise to a far point.
- [variation] Millions of points :: Mini-batch k-means; approximate assignments.
- [variation] Non-spherical clusters :: GMMs, DBSCAN, spectral clustering.

=== d-mlc-knn
title: k-nearest neighbours classifier
topic: ai-classic-models
tier: 1
est: 35
prompt: Implement a k-nearest-neighbours classifier in NumPy with predict for a batch of query points, and discuss how to make it fast for a million training points.
--- words
- **kNN**: label a point by the majority label of its k closest training points.
- **Lazy learner**: no training step; all the work happens at prediction time.
- **argpartition**: finds the k smallest values without sorting everything.
- **Curse of dimensionality**: in high dimensions all points look roughly equally far apart.
--- flow
1. **0–5**: distance metric, ties, k, batch size, memory.
2. **5–12**: complexity O(m·n·d) for m queries; memory of the (m, n) distance matrix.
3. **12–25**: code with vectorised distances and argpartition, chunked queries.
4. **25–35**: tests, weighted votes, scaling with KD-trees or ANN.
--- clarify
- Euclidean distance; classes are integers; ties broken by the nearest neighbour's label (or smallest label).
- Queries can be many: process them in chunks so the distance matrix fits in memory.
--- approach
- Distances (m, n) via the expansion trick; for each row take the k smallest with argpartition (O(n) instead of O(n log n)).
- Majority vote with np.bincount per row, or vectorised with one-hot sums.
- Standardise features; distance-weighted votes (1/d) as an option.
--- code
```python
import numpy as np

class KNN:
    def __init__(self, k=5, chunk=1024):
        self.k, self.chunk = k, chunk

    def fit(self, X, y):
        self.X = np.asarray(X, float); self.y = np.asarray(y)
        self.classes, self.yi = np.unique(self.y, return_inverse=True)
        self.x2 = (self.X**2).sum(1)
        return self

    def predict(self, Q):
        Q = np.asarray(Q, float)
        out = np.empty(len(Q), dtype=self.y.dtype)
        k = min(self.k, len(self.X))
        for s in range(0, len(Q), self.chunk):
            q = Q[s:s + self.chunk]
            d2 = (q**2).sum(1)[:, None] - 2 * q @ self.X.T + self.x2[None, :]
            nn = np.argpartition(d2, k - 1, axis=1)[:, :k]          # (b, k) unordered
            order = np.take_along_axis(d2, nn, 1).argsort(1)
            nn = np.take_along_axis(nn, order, 1)                     # nearest first
            votes = np.zeros((len(q), len(self.classes)))
            np.add.at(votes, (np.arange(len(q))[:, None], self.yi[nn]), 1)
            # tie-break: add a tiny bonus for the nearest neighbour's class
            votes[np.arange(len(q)), self.yi[nn[:, 0]]] += 0.5
            out[s:s + self.chunk] = self.classes[votes.argmax(1)]
        return out
```
--- test
- Two blobs: high accuracy; k = 1 on the training set gives 100% (each point is its own neighbour).
- k larger than n: clipped to n.
- Ties with k = 2: nearest neighbour's class wins.
- Follow-ups: for a million points, the brute force is O(n·d) per query: use KD-trees/ball trees for low d, ANN (HNSW, IVF-PQ) for high d; choose k by cross-validation; weighted votes; regression version (mean of neighbours).
--- steer
Q: Your distance matrix doesn't fit in memory.
A: Chunk the queries; or ANN indexes.
Q: Why argpartition?
A: O(n) selection of k smallest per row instead of a full sort.
Q: Does kNN work in 1,000 dimensions?
A: Distances concentrate; reduce dimensions (PCA, learned embeddings) first.
--- pitfalls
- Full sort of all distances per query
- Building an m × n matrix for huge m
- Unscaled features
--- level
- **L4**: correct brute force with sort.
- **L5**: vectorised distances, argpartition, chunking, tie rules, scaling strategies and the curse of dimensionality.
--- prereqs
svm-knn-bayes
--- paths
- [deep] Speed of brute force :: Expansion trick, argpartition, chunking.
- [variation] A million training points :: KD-tree for low d, ANN for high d.
- [deep] Choosing k :: Cross-validation; bias–variance of small vs large k.
- [failure] High-dimensional data :: Distance concentration; dimensionality reduction.

=== d-mlc-tree-split
title: Find the best decision-tree split
topic: ai-classic-models
tier: 2
est: 40
prompt: Given a feature matrix X and binary labels y, write a function that finds the best single split (feature and threshold) by Gini impurity, in O(d · n log n). Then extend it into a small tree.
--- words
- **Split**: a rule "feature j ≤ threshold t" that sends each point left or right.
- **Gini impurity**: 1 − Σ pᵢ², the chance two random points from a node have different labels.
- **Weighted impurity**: impurity of each child weighted by its share of points; the best split minimises it.
- **Prefix sums**: running totals that give counts for every threshold in one pass.
--- flow
1. **0–5**: label type, ties in feature values, minimum leaf size, complexity target.
2. **5–12**: brute force O(d·n²) → sort each feature and sweep with prefix counts → O(d·n log n).
3. **12–30**: code the sweep.
4. **30–40**: tests, recursion into a tree, regression variant.
--- clarify
- y ∈ {0, 1}; X numeric (n, d); thresholds halfway between distinct consecutive values.
- Can't split between equal values.
- Return (feature, threshold, impurity) or None if no split improves.
--- approach
- For each feature, sort by value. Walking left to right, the left child gains one point at a time; keep a running count of positives on the left (prefix sum).
- At position i (left = first i points): Gini_left = 1 − pL² − (1 − pL)², similarly right; weighted = (i·G_L + (n − i)·G_R)/n.
- Only consider i where value[i − 1] < value[i]. Vectorise the sweep with cumsum.
--- code
```python
import numpy as np

def gini(pos, total):
    p = pos / np.maximum(total, 1)
    return 1 - p**2 - (1 - p)**2

def best_split(X, y, min_leaf=1):
    X = np.asarray(X, float); y = np.asarray(y, int)
    n, d = X.shape
    best = None
    parent = gini(y.sum(), n)
    for j in range(d):
        order = np.argsort(X[:, j], kind="stable")
        xs, ys = X[order, j], y[order]
        left_pos = np.cumsum(ys)[:-1]            # positives in the first i points, i = 1..n-1
        i = np.arange(1, n)
        right_pos = ys.sum() - left_pos
        w = (i * gini(left_pos, i) + (n - i) * gini(right_pos, n - i)) / n
        valid = (xs[1:] > xs[:-1]) & (i >= min_leaf) & (n - i >= min_leaf)
        if not valid.any():
            continue
        w = np.where(valid, w, np.inf)
        k = int(w.argmin())
        if w[k] < parent - 1e-12 and (best is None or w[k] < best[2]):
            best = (j, (xs[k] + xs[k + 1]) / 2, float(w[k]))
    return best

def build_tree(X, y, depth=0, max_depth=3, min_leaf=1):
    s = None if depth == max_depth or len(set(y)) == 1 else best_split(X, y, min_leaf)
    if s is None:
        return {"leaf": True, "p": float(np.mean(y))}
    j, t, _ = s
    m = X[:, j] <= t
    return {"leaf": False, "j": j, "t": t,
            "l": build_tree(X[m], y[m], depth + 1, max_depth, min_leaf),
            "r": build_tree(X[~m], y[~m], depth + 1, max_depth, min_leaf)}
```
--- test
- y = (x0 > 3) → best split on feature 0 at a threshold between the values around 3, impurity 0.
- All labels equal → None (no improvement).
- Duplicate feature values never split between equal values.
- Compare with a brute-force O(n²) version on random small inputs.
- Follow-ups: entropy instead of Gini; regression trees use variance with prefix sums of y and y²; random forests sample features per split; gradient boosting fits trees to gradients.
--- steer
Q: Brute force is O(d·n²). Do better.
A: Sort once per feature, sweep with prefix counts: O(d·n log n).
Q: Gini or entropy?
A: Very similar splits; Gini is cheaper (no log).
Q: Regression trees?
A: Minimise weighted variance using prefix sums of y and y².
--- pitfalls
- Recomputing impurity from scratch for each threshold
- Splitting between equal values
- No stopping rule (depth, leaf size, no improvement)
--- level
- **L4**: brute-force best split.
- **L5**: sorted sweep with prefix sums, valid thresholds, recursion with stopping rules, extensions to regression and forests.
--- prereqs
decision-trees
--- paths
- [deep] From O(n²) to O(n log n) :: Sort per feature and sweep with cumulative counts.
- [deep] Valid thresholds :: Only between distinct values; midpoints; min leaf size.
- [variation] Regression tree :: Variance via prefix sums of y and y².
- [variation] Random forest :: Bootstrap samples and random feature subsets per split.

=== d-mlc-softmax-ce
title: Stable softmax, cross-entropy and its gradient
topic: ai-classic-models
tier: 1
est: 35
prompt: Implement softmax and cross-entropy loss over a batch of logits in NumPy, numerically stable, and return the gradient with respect to the logits.
--- words
- **Logits**: raw scores, one per class, before softmax.
- **Softmax**: turns logits into probabilities: e^(zᵢ) / Σⱼ e^(zⱼ).
- **Cross-entropy**: −log of the probability given to the correct class.
- **Log-sum-exp trick**: subtracting the maximum logit before exponentiating to avoid overflow.
--- flow
1. **0–5**: shapes (batch B × classes C), label format (indices), reduction (mean).
2. **5–12**: maths: loss = logsumexp(z) − z_y; gradient = softmax(z) − one_hot(y), divided by B.
3. **12–25**: code with the max trick.
4. **25–35**: gradient check, label smoothing, ignoring padding.
--- clarify
- logits (B, C) floats; labels (B,) integers in [0, C).
- Mean over the batch.
- Large logits (1000) must not produce inf or nan.
--- approach
- Softmax is unchanged by subtracting a constant from every logit, so subtract the row max m: softmax(z) = e^(z − m) / Σ e^(z − m).
- Cross-entropy from logits: L = log Σⱼ e^(zⱼ) − z_y = m + log Σ e^(zⱼ − m) − z_y (never take log of a rounded probability).
- Gradient: ∂L/∂zⱼ = softmaxⱼ − 1[j = y]; for the mean, divide by B.
--- code
```python
import numpy as np

def softmax(z):
    z = z - z.max(axis=1, keepdims=True)
    e = np.exp(z)
    return e / e.sum(axis=1, keepdims=True)

def cross_entropy(logits, y):
    """Mean cross-entropy over the batch and its gradient w.r.t. logits."""
    B = logits.shape[0]
    shifted = logits - logits.max(axis=1, keepdims=True)
    logsumexp = np.log(np.exp(shifted).sum(axis=1))
    loss = np.mean(logsumexp - shifted[np.arange(B), y])
    grad = np.exp(shifted - logsumexp[:, None])     # softmax
    grad[np.arange(B), y] -= 1
    return loss, grad / B
```
--- test
- `cross_entropy(np.array([[1000., 0.]]), np.array([0]))` → loss ≈ 0, no warnings; label 1 → loss ≈ 1000.
- Uniform logits: loss = log C.
- Gradient rows sum to 0.
- Finite-difference check on random logits: max relative error < 1e-6.
- Follow-ups: label smoothing (target (1 − ε) on the true class and ε/C elsewhere → gradient softmax − target); ignore_index for padding (mask rows, divide by the count of real ones); in PyTorch, use F.cross_entropy on logits, never log(softmax).
--- steer
Q: Why subtract the max?
A: e^1000 overflows; softmax is shift-invariant; the max makes the largest exponent e^0 = 1.
Q: Derive the gradient.
A: L = logsumexp − z_y → ∂/∂zⱼ = softmaxⱼ − 1[j = y].
Q: Add label smoothing.
A: Target distribution mixes one-hot with uniform; gradient = softmax − target.
--- pitfalls
- exp of raw logits
- log of probabilities that can be 0
- Forgetting the 1/B in the gradient
--- level
- **L4**: correct softmax and loss.
- **L5**: stable log-sum-exp, analytic gradient with derivation, gradient check, smoothing and masking.
--- prereqs
loss-functions, logistic-regression
--- paths
- [deep] Stability :: Shift by the max; loss from log-sum-exp.
- [deep] Gradient :: softmax − one-hot, divided by B; gradient check.
- [variation] Label smoothing :: Mixed targets; gradient = softmax − target.
- [variation] Padding tokens :: Mask and average over real tokens.

=== d-mlc-roc-auc
title: ROC-AUC from scratch
topic: ai-metrics
tier: 1
est: 35
prompt: Write a function that computes ROC-AUC from labels and scores in O(n log n), handling tied scores correctly. Then explain what AUC means.
--- words
- **ROC curve**: true-positive rate against false-positive rate as the threshold moves.
- **AUC**: area under that curve; equals the probability that a random positive scores higher than a random negative.
- **Ties**: equal scores count as half a win.
- **Rank statistic**: AUC can be computed from ranks (Mann–Whitney U).
--- flow
1. **0–5**: inputs, ties, all one class, complexity.
2. **5–12**: two methods: sweep thresholds and add trapezoids, or ranks.
3. **12–25**: code.
4. **25–35**: tests and meaning; PR-AUC follow-up.
--- clarify
- y ∈ {0, 1}, scores real; n up to millions.
- If all labels are equal, AUC is undefined: raise or return nan.
--- approach
- **Rank method**: sort scores, assign average ranks to ties (1-based). AUC = (sum of positive ranks − P(P + 1)/2) / (P·N).
- Equivalent to counting pairs (pos > neg) + 0.5·(ties) over P·N pairs, without the O(P·N) loop.
--- code
```python
import numpy as np

def roc_auc(y, s):
    y = np.asarray(y).astype(bool); s = np.asarray(s, float)
    P, N = y.sum(), (~y).sum()
    if P == 0 or N == 0:
        raise ValueError("AUC needs both classes")
    order = np.argsort(s, kind="mergesort")
    s_sorted = s[order]
    ranks = np.empty(len(s))
    i = 0
    while i < len(s):                      # average ranks over runs of ties
        j = i
        while j + 1 < len(s) and s_sorted[j + 1] == s_sorted[i]:
            j += 1
        ranks[order[i:j + 1]] = (i + j) / 2 + 1
        i = j + 1
    return (ranks[y].sum() - P * (P + 1) / 2) / (P * N)
```
--- test
- Perfect separation → 1.0; reversed → 0.0; all scores equal → 0.5.
- Compare with the O(P·N) pair-counting definition on random small inputs, including ties.
- Single class → error.
- Follow-ups: AUC ignores calibration and class balance; on rare positives use PR-AUC (average precision); threshold choice needs costs; weighted AUC; streaming approximation with histograms.
--- steer
Q: What does AUC = 0.8 mean?
A: A random positive outranks a random negative 80% of the time.
Q: How are ties handled?
A: Average ranks; half credit per tied pair.
Q: AUC is 0.95 but the product is bad.
A: Rare positives (look at PR), miscalibration, wrong threshold, slices.
--- pitfalls
- O(P·N) double loop
- Ignoring ties
- Treating AUC as calibration or precision
--- level
- **L4**: correct with a loop over thresholds.
- **L5**: rank formula with ties in O(n log n), probabilistic meaning, PR-AUC trade-off.
--- prereqs
classification-metrics
--- paths
- [deep] The rank formula :: Sum of positive ranks minus P(P+1)/2 over P·N.
- [deep] Ties :: Average ranks; half credit.
- [variation] Rare positives :: PR-AUC and average precision.
- [deep] Meaning of AUC :: Pairwise ranking probability; ignores calibration.

=== d-mlc-pca
title: PCA with SVD and power iteration
topic: ai-classic-models
tier: 2
est: 40
prompt: Implement PCA in NumPy: fit on X to find the top k principal components and transform data. First with SVD, then find the top component with power iteration without any decomposition routine.
--- words
- **Principal component**: a direction of maximum variance in the data.
- **Centering**: subtracting the mean of each feature first.
- **Covariance matrix**: C = XᵀX / (n − 1) for centred X.
- **Power iteration**: repeatedly multiply a vector by C and normalise; it converges to the top eigenvector.
- **Explained variance ratio**: the share of total variance each component captures.
--- flow
1. **0–5**: shapes, k, centering, scaling, output.
2. **5–12**: maths: SVD of centred X = U S Vᵀ; components are rows of Vᵀ; variances S²/(n − 1).
3. **12–28**: code SVD version; power iteration with deflation.
4. **28–40**: tests, sign ambiguity, large d.
--- clarify
- X (n, d); return components (k, d), explained variance, and transform(X) → (n, k).
- Standardise features? Only if units differ; ask.
--- approach
- Centre X. SVD: Xc = U S Vᵀ. Principal directions = rows of Vᵀ; projected data = Xc Vₖᵀ = Uₖ Sₖ.
- Power iteration on C = XcᵀXc/(n − 1): v ← Cv / ‖Cv‖ until it stops changing; eigenvalue λ = vᵀCv. Compute Cv as Xcᵀ(Xc v)/(n − 1) to avoid forming C (O(n·d) per step).
- Next components: deflate by removing the found direction, or orthogonalise against previous vectors.
--- code
```python
import numpy as np

class PCA:
    def __init__(self, k):
        self.k = k

    def fit(self, X):
        X = np.asarray(X, float)
        self.mean = X.mean(0)
        Xc = X - self.mean
        U, S, Vt = np.linalg.svd(Xc, full_matrices=False)
        self.components = Vt[: self.k]
        var = S**2 / (len(X) - 1)
        self.explained_variance = var[: self.k]
        self.explained_ratio = var[: self.k] / var.sum()
        return self

    def transform(self, X):
        return (np.asarray(X, float) - self.mean) @ self.components.T

def top_components_power(X, k=1, iters=500, tol=1e-10, seed=0):
    X = np.asarray(X, float)
    Xc = X - X.mean(0)
    n, d = Xc.shape
    rng = np.random.default_rng(seed)
    comps, vals = [], []
    for _ in range(k):
        v = rng.normal(size=d); v /= np.linalg.norm(v)
        for _ in range(iters):
            w = Xc.T @ (Xc @ v) / (n - 1)          # C v without forming C
            for u in comps:                         # stay orthogonal to found ones
                w -= (w @ u) * u
            w_norm = np.linalg.norm(w)
            if w_norm == 0:
                break
            w /= w_norm
            if 1 - abs(w @ v) < tol:
                v = w
                break
            v = w
        comps.append(v)
        vals.append(v @ (Xc.T @ (Xc @ v)) / (n - 1))
    return np.array(comps), np.array(vals)
```
--- test
- Data stretched along a known direction: first component ≈ that direction (up to sign).
- Power iteration's top vector matches SVD's first component: |dot| ≈ 1; eigenvalue matches explained_variance[0].
- Explained ratios sum to ≤ 1; with k = d they sum to 1.
- Follow-ups: sign ambiguity (fix by making the largest-magnitude entry positive); convergence speed depends on the gap λ₁/λ₂; for huge sparse data use randomised SVD; PCA needs centred data and is sensitive to scaling.
--- steer
Q: Why centre the data?
A: Otherwise the first component points at the mean, not the direction of variance.
Q: Power iteration converges slowly.
A: Small eigen-gap; use more iterations, block methods (Lanczos), or randomised SVD.
Q: d = 1 million features.
A: Never form the d × d covariance; multiply by Xc twice; randomised SVD.
--- pitfalls
- Forgetting to centre
- Forming the d × d covariance for large d
- Comparing components without handling sign flips
--- level
- **L4**: PCA via np.linalg.svd.
- **L5**: links SVD and covariance eigenvectors, power iteration without forming C, deflation, convergence and eigen-gap, scaling choices.
--- prereqs
linear-algebra-ml, clustering-pca
--- paths
- [deep] SVD vs eigen-decomposition :: Vᵀ rows are covariance eigenvectors; variances S²/(n−1).
- [deep] Power iteration :: Cv via two matrix-vector products; normalise; eigen-gap convergence.
  - The second component :: Orthogonalise against the first (deflation).
- [variation] Huge d :: Randomised SVD; never form C.
- [failure] Features in different units :: Standardise first.
