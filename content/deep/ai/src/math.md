=== linear-algebra-ml
blurb: Vectors, dot products, matrices as transformations, matrix multiplication shapes, eigenvectors and the SVD: the language every model is written in, with the geometric picture behind each idea.
signals: Any shape question: "what are the dimensions of W?" | "Why does PCA use eigenvectors of the covariance matrix?" | Explaining attention or embeddings as dot products | "What is the rank of a LoRA update?"
widgets: matrix-transform

--- lesson
:::words
- **Scalar**: a single number, like 3.2.
- **Vector**: an ordered list of numbers, like $[2, -1, 0.5]$. Think of it as an arrow from the origin, or as a point. Its length is the **dimension**.
- **Matrix**: a grid of numbers with rows and columns. A matrix with $m$ rows and $n$ columns is "$m \times n$".
- **Tensor**: the general word for a grid with any number of axes: a scalar has 0, a vector 1, a matrix 2, a batch of images 4.
- **Dot product**: multiply two vectors element by element and add the results. Measures how much they point the same way.
- **Norm**: the length of a vector. The usual one (L2) is $\sqrt{x_1^2 + \dots + x_n^2}$.
- **Linear transformation**: a function that stretches, rotates, reflects or squashes space, keeping straight lines straight and the origin fixed. Every matrix is one.
- **Eigenvector**: a direction that a matrix only stretches (never turns). The stretch factor is its **eigenvalue**.
- **Rank**: how many truly independent directions a matrix's output can cover.
:::

## The problem in plain words

A machine-learning model is a pile of numbers that turns input numbers into output numbers. An image is a grid of pixel brightnesses; a sentence becomes a list of vectors; a user becomes a vector of preferences. Linear algebra is the toolkit for doing arithmetic on whole lists and grids at once. You don't need to be a mathematician, but you do need to see what each operation **does geometrically**, because almost every interview explanation (embeddings, attention, PCA, LoRA, why a layer's weights have a certain shape) is a linear-algebra picture.

:::eli5
A vector is a shopping list with quantities: 2 apples, 0 bread, 3 milk. A matrix is a price list for several shops: multiply your list by it and you get the total at each shop in one go. A dot product is "how well do two shopping lists agree?": big when both buy lots of the same things.
:::

## Vectors and the dot product

A vector $\mathbf{x} = [x_1, \dots, x_n]$ is a point in $n$-dimensional space. Models represent everything this way: a 768-number embedding is a point in 768-dimensional space.

The **dot product** of two vectors is

$$\mathbf{a} \cdot \mathbf{b} = \sum_i a_i b_i = \|\mathbf{a}\| \, \|\mathbf{b}\| \cos\theta$$

where $\theta$ is the angle between them. The second form is the one to remember: the dot product is large when vectors are long **and** point the same way, zero when they are at right angles (**orthogonal**), negative when they point apart. Divide by both lengths and you get **cosine similarity**, a number from −1 to 1 that ignores length. That is how embedding search decides two sentences "mean the same thing", and how attention decides which earlier word a word should look at.

A worked example: $\mathbf{a} = [1, 2]$, $\mathbf{b} = [3, 1]$. Dot product $= 1 \cdot 3 + 2 \cdot 1 = 5$. Lengths $\sqrt{5} \approx 2.24$ and $\sqrt{10} \approx 3.16$. Cosine $= 5 / 7.07 \approx 0.71$: they point roughly the same way (about 45°).

**Norms** measure size. L2 (Euclidean) is the usual length; **L1** is $\sum |x_i|$ (the "city-block" distance). These reappear as the two regularisation penalties (L2 shrinks weights smoothly, L1 pushes some to exactly zero) on the regularisation page.

## Matrices are functions

Multiplying a matrix $W$ ($m \times n$) by a vector $\mathbf{x}$ (length $n$) gives a vector of length $m$: each output number is the dot product of one row of $W$ with $\mathbf{x}$.

$$\mathbf{y} = W\mathbf{x}, \quad y_i = \sum_j W_{ij} x_j$$

Two ways to see it, both useful:

- **Rows view:** each output is a "detector" (a row) scoring how much the input matches it. A layer with 512 rows is 512 detectors.
- **Columns view:** the output is a weighted mix of $W$'s columns, with weights from $\mathbf{x}$. So the outputs can only ever land in the space the columns span: the **column space**. Its dimension is the **rank**.

Geometrically a matrix **transforms space**: it can rotate, stretch, shear, reflect or flatten it. Drag the matrix entries below and watch the grid and two arrows move. Find a matrix that flattens the plane onto a line (rank 1), and one whose arrows only stretch (eigenvectors):

[[widget:matrix-transform]]

## Shapes: the interview reflex

Matrix multiplication $AB$ needs the inner sizes to match: $(m \times k)(k \times n) = (m \times n)$. Most model bugs and many interview questions are shape questions. A dense layer taking a batch of 32 inputs with 784 features to 128 outputs:

$$\underbrace{X}_{32 \times 784} \; \underbrace{W}_{784 \times 128} + \underbrace{\mathbf{b}}_{128} = \underbrace{H}_{32 \times 128}$$

The weight count is $784 \times 128 + 128 = 100{,}480$. The cost is about $2 \times 32 \times 784 \times 128 \approx 6.4$ million floating-point operations (each multiply-add counts as 2). This "2 × rows × inner × columns" rule is how you estimate the compute of any model, including the famous "training costs about $6 \times$ parameters $\times$ tokens" rule on the scaling-laws page.

Other facts worth having on the tip of your tongue:

- $AB \neq BA$ in general (order matters: rotate then stretch is not stretch then rotate).
- $(AB)^\top = B^\top A^\top$. The **transpose** $A^\top$ flips rows and columns.
- The **identity** $I$ leaves vectors unchanged; the **inverse** $A^{-1}$ undoes $A$ (only exists if $A$ is square and doesn't flatten space).
- **Broadcasting** (adding a length-128 bias to a $32 \times 128$ matrix) is a programming convenience, not maths: the bias is copied to each row.

## Eigenvectors: directions a matrix doesn't turn

For a square matrix $A$, an **eigenvector** $\mathbf{v}$ satisfies

$$A\mathbf{v} = \lambda \mathbf{v}$$

The matrix only stretches it by $\lambda$ (the **eigenvalue**); it doesn't change its direction. Why care?

- **Symmetric matrices** (equal to their transpose, like covariance matrices) always have real eigenvalues and orthogonal eigenvectors. So a symmetric matrix is just "stretch along these perpendicular axes by these amounts". This is the heart of **PCA**: the eigenvectors of the data's covariance matrix are the directions of greatest spread, and the eigenvalues say how much spread each one has.
- **Repeated multiplication** amplifies the direction with the largest $|\lambda|$. Apply $A$ a hundred times and almost every vector swings toward the top eigenvector. This is **power iteration** (an ML-coding favourite), and also why gradients in a deep or recurrent network explode or vanish: multiplying by the same-ish matrix many times scales things by $\lambda^{100}$.
- **Positive definite** matrices (all eigenvalues > 0) curve upward in every direction, like a bowl. A loss function whose second-derivative matrix (the **Hessian**) is positive definite has a single minimum: that's what **convex** means locally.

## The SVD: every matrix is rotate, stretch, rotate

The **singular value decomposition** writes **any** matrix (any shape) as

$$A = U \Sigma V^\top$$

- $V^\top$ rotates the input into a good set of axes,
- $\Sigma$ (diagonal, non-negative "singular values" $\sigma_1 \ge \sigma_2 \ge \dots$) stretches along each axis,
- $U$ rotates into the output space.

Keeping only the top $k$ singular values gives the **best rank-$k$ approximation** of $A$ (the Eckart–Young theorem). That single fact explains a lot of ML:

- **PCA** is the SVD of the centred data matrix: the right singular vectors are the principal directions.
- **Compression**: a $4096 \times 4096$ weight matrix has 16.8M numbers; if its singular values fall off fast, rank 64 captures most of it with $2 \times 4096 \times 64 \approx 0.5$M numbers.
- **LoRA** fine-tuning bets that the *change* to a weight matrix during fine-tuning is low-rank, and learns it as $BA$ with $B$ ($4096 \times r$) and $A$ ($r \times 4096$), $r = 8$ or $16$.
- **Matrix factorisation** recommenders approximate the giant user × item rating matrix as (users × k)(k × items).
- **Embeddings** in general: a low-dimensional vector that keeps what matters.

## Where it shows up in models

| Model piece | The linear algebra |
|---|---|
| Dense / linear layer | $XW + b$, then a non-linearity |
| Embedding lookup | Selecting a row of a $V \times d$ matrix (same as one-hot times matrix) |
| Attention scores | $QK^\top$: every query dotted with every key |
| Cosine similarity search | Normalise, then dot product |
| PCA, LoRA, matrix factorisation | SVD / low rank |
| Exploding / vanishing gradients | Repeated multiplication, eigenvalues away from 1 |
| Convexity of a loss | Positive definite Hessian |

## Interview angles

- "What are the shapes in this layer / attention head?" Write them down before anything else. It catches half of all bugs.
- "Why cosine and not Euclidean distance for embeddings?" Cosine ignores length, which often reflects frequency or text length rather than meaning; for unit-length vectors the two rank results identically, since $\|a - b\|^2 = 2 - 2\cos\theta$.
- "Explain PCA." Centre the data, find directions of maximum variance (top eigenvectors of the covariance, or the SVD of the data), project onto the top $k$.
- "Why low rank?" Many real matrices have fast-decaying singular values: most of the information lives in a few directions.

--- revise
### Vectors
? What does the dot product measure geometrically? :: $\|a\|\|b\|\cos\theta$: large when vectors are long and aligned, 0 when orthogonal, negative when opposed.
? Cosine similarity? :: Dot product divided by both lengths: the angle only, from −1 to 1.
? L1 vs L2 norm? :: L1: sum of absolute values. L2: square root of the sum of squares (ordinary length).
? For unit vectors, how do Euclidean distance and cosine relate? :: $\|a-b\|^2 = 2 - 2\cos\theta$, so they rank neighbours identically.

### Matrices
? Two views of $W\mathbf{x}$? :: Rows: each output is a row's dot product with x (a detector). Columns: a weighted mix of W's columns.
? Shape rule for AB? :: $(m\times k)(k\times n) = m\times n$; inner sizes must match.
? FLOPs of an $(m\times k)(k\times n)$ product? :: About $2mkn$.
? What is rank? :: The number of independent directions the matrix's outputs can span.
? $(AB)^\top$? :: $B^\top A^\top$.

### Eigen and SVD
? Eigenvector definition? :: $A\mathbf{v} = \lambda\mathbf{v}$: a direction only stretched, not turned.
? Why do symmetric matrices matter? :: Real eigenvalues and orthogonal eigenvectors: pure stretching along perpendicular axes (covariance → PCA).
? What does repeated multiplication by A do? :: Pulls vectors toward the top eigenvector and scales by $\lambda^n$: power iteration, exploding/vanishing gradients.
? SVD? :: $A = U\Sigma V^\top$: rotate, stretch by singular values, rotate; works for any shape.
? Eckart–Young? :: Keeping the top-k singular values gives the best rank-k approximation.
? Name three ML uses of low rank. :: PCA, LoRA, matrix factorisation for recommenders (also compression).

--- notes
## Vectors
Vector = point/arrow in n-D. Dot = Σ aᵢbᵢ = |a||b|cosθ.
Cosine = dot / (|a||b|), in [−1, 1]; ignores length.
Unit vectors: |a−b|² = 2 − 2cosθ, so cosine and Euclidean rank the same.
L2 = √Σx², L1 = Σ|x|.
## Matrices
Wx: rows = detectors; columns = mix of columns (column space, rank).
Shapes: (m×k)(k×n) = m×n. FLOPs ≈ 2mkn.
Dense layer X(B×in)·W(in×out) + b → B×out; params = in·out + out.
AB ≠ BA. (AB)ᵀ = BᵀAᵀ. Inverse only for square, full-rank.
## Eigen
Av = λv. Symmetric → real λ, orthogonal v (covariance → PCA).
Repeated multiply → top eigenvector dominates (power iteration); λⁿ explodes/vanishes.
Positive definite Hessian → bowl → local convexity.
## SVD and low rank
A = UΣVᵀ for any shape. Top-k singular values = best rank-k approx (Eckart–Young).
Uses: PCA, compression, LoRA (ΔW = BA), matrix factorisation recommenders.
## Interview reflex
Write shapes first. Cosine for embeddings. PCA = top eigenvectors of covariance / SVD of centred data.

--- doubts
Q: Do I really need eigenvalues for an ML interview, or is that a maths-degree thing?
A: You need the picture, not the proofs. Interviewers ask "explain PCA", "why do gradients explode in RNNs?" and "why is LoRA low-rank?", and each answer is one sentence of eigen/SVD intuition. You will not be asked to compute a 3×3 determinant by hand.

Q: What's the difference between a matrix and a linear layer?
A: A linear layer is a matrix plus a bias vector, with the numbers learned from data: $y = Wx + b$. Strictly, adding $b$ makes it "affine" rather than linear, but everyone says linear.

Q: Why is a one-hot vector times a matrix the same as an embedding lookup?
A: A one-hot vector has a single 1 at position $i$. Multiplying it by a $V \times d$ matrix picks out row $i$ and ignores the rest. Libraries skip the multiplication and just index the row, which is far cheaper, but mathematically an embedding layer is a linear layer applied to one-hot inputs.

Q: How can a matrix have rank less than its size?
A: When some rows (or columns) are combinations of others. Example: rows $[1, 2]$ and $[2, 4]$; the second is twice the first, so every output lies on one line: rank 1. Data matrices are often nearly low-rank because features are correlated (height in cm and height in inches).

Q: Why does centring matter for PCA?
A: PCA looks for directions of maximum **variance**, which is spread around the mean. If you don't subtract the mean first, the first "principal direction" mostly points at the mean itself rather than along the spread.

--- exercises
[estimate] A transformer layer has hidden size 4096 and its feed-forward block expands to 16,384 and back. How many parameters are in that feed-forward block, and how many FLOPs does it cost per token?
A: Two matrices: $4096 \times 16384$ and $16384 \times 4096$, so $2 \times 67.1\text{M} \approx 134$M parameters (ignoring small biases). Per token, each parameter is used in one multiply-add, so about $2 \times 134\text{M} \approx 268$M FLOPs per token for the forward pass.

[estimate] Your embeddings are 768-dimensional float32 vectors for 100 million documents. How much memory do they take, and how much if you keep only the top 128 PCA dimensions in int8?
A: $10^8 \times 768 \times 4$ bytes $\approx 307$ GB. With 128 dims in int8: $10^8 \times 128 \times 1 \approx 12.8$ GB, about 24× smaller, at some cost in recall that you would measure.

[break] A teammate computes cosine similarity between embeddings but forgets to normalise one side, using raw dot products for ranking. When does this go wrong?
A: Raw dot products favour long vectors. If vector length correlates with something irrelevant (document length, word frequency, popularity), long documents rank high for every query. With normalised vectors it doesn't matter; with unnormalised ones the ranking mixes "relevant" with "long".

[choose] You need a 10× smaller version of a 4096×4096 weight matrix. Low-rank (SVD) factorisation or keeping 10% of the largest weights (pruning)?
A: Look at the singular values. If they fall off fast, rank ~200 SVD keeps most of the behaviour and gives dense, fast matrix multiplies ($2 \times 4096 \times 200 \approx 1.6$M numbers). Unstructured pruning keeps 1.6M numbers too, but sparse multiplies are slow on GPUs unless the sparsity is structured. SVD is usually the practical choice; measure accuracy for both.

--- pitfalls
- Getting shapes wrong in attention or batching (always write them down)
- Comparing embeddings with raw dot products when lengths carry unrelated signal
- Forgetting to centre data before PCA
- Saying "matrices commute": AB is usually not BA
- Thinking an inverse always exists

--- quiz
Q: Two unit vectors have dot product 0. What is the angle between them?
- 0°
- *90°
- 180°
- 45°
W: For unit vectors the dot product is $\cos\theta$; $\cos\theta = 0$ means they are orthogonal.

Q: X is 64×512 and W is 512×256. What is the shape of XW and roughly how many FLOPs?
- 512×512, 16M
- *64×256, about 16.8M
- 64×512, 8M
- 256×64, 33M
W: Inner sizes cancel: 64×256. FLOPs ≈ 2 × 64 × 512 × 256 ≈ 16.8M.

Q: Why does PCA use eigenvectors of the covariance matrix?
- They are the fastest to compute
- *They are the orthogonal directions of maximum variance, with eigenvalues giving how much variance each holds
- They make the data positive
- They remove outliers
W: The covariance matrix is symmetric, so its eigenvectors are orthogonal; the top ones capture the most spread.

Q: What does the Eckart–Young theorem justify?
- Using ReLU
- *Truncating the SVD to get the best low-rank approximation (PCA, LoRA, compression)
- Normalising embeddings
- Batch normalisation
W: The top-k singular values and vectors give the closest rank-k matrix.

Q: Gradients through 100 recurrent steps shrink to almost zero. In linear-algebra terms, why?
- The matrix is not square
- *Repeated multiplication by a matrix whose largest eigenvalue magnitude is below 1 scales signals by roughly λ¹⁰⁰
- The dot product is negative
- The bias is too large
W: Powers of a matrix are dominated by its eigenvalues raised to that power.

--- sources
- book :: Mathematics for Machine Learning (chapters 2–4) :: Deisenroth, Faisal, Ong :: https://mml-book.github.io/
- course :: Essence of Linear Algebra :: 3Blue1Brown :: https://www.3blue1brown.com/topics/linear-algebra
- book :: Dive into Deep Learning: Linear Algebra :: Zhang et al. :: https://d2l.ai/chapter_preliminaries/linear-algebra.html
- paper :: The approximation of one matrix by another of lower rank :: Eckart, Young (1936) :: https://doi.org/10.1007/BF02288367

=== calculus-gradients
blurb: Derivatives as slopes, partial derivatives and the gradient, the chain rule that powers backpropagation, Jacobians for vector functions, and the second-derivative picture of curvature that explains learning rates.
signals: "Derive the gradient of this loss" | "Why does the learning rate need to be small?" | Any backprop or optimiser question | "Why do we use log-likelihood instead of likelihood?"
widgets: gradient-descent

--- lesson
:::words
- **Derivative**: how fast a function's output changes when you nudge its input. The slope of its graph at a point.
- **Partial derivative**: the derivative with respect to one input while holding the others fixed. Written $\partial f / \partial x$.
- **Gradient**: the list of all partial derivatives, $\nabla f$. It points in the direction of steepest increase.
- **Chain rule**: how to differentiate a function of a function: multiply the derivatives along the chain.
- **Jacobian**: for a function with many inputs and many outputs, the matrix of every output's partial derivative with respect to every input.
- **Hessian**: the matrix of second derivatives: how the slope itself changes. It describes curvature.
- **Convex**: shaped like a bowl everywhere, so any minimum is the global minimum.
:::

## The problem in plain words

Training a model means: change its numbers (weights) a little so that its mistakes (the **loss**) get smaller, and repeat millions of times. To know *which way* to change each of millions of weights, you need to know how the loss responds to each one. That is exactly what a derivative tells you. Calculus in ML is almost entirely about one question: **if I nudge this weight up a little, does the loss go up or down, and by how much?**

:::eli5
You're on a foggy hill and want to reach the bottom. You can't see far, but you can feel the slope under your feet. Step downhill, feel again, step again. The gradient is the slope you feel; the learning rate is your step size. Steps too big and you jump over the valley; too small and you take forever.
:::

## Derivatives: slope, and a linear guess

The derivative $f'(x)$ is the slope of $f$ at $x$:

$$f'(x) = \lim_{h \to 0} \frac{f(x+h) - f(x)}{h}$$

The useful way to read it: near $x$, $f$ behaves like a straight line, $f(x + h) \approx f(x) + f'(x) h$. So if $f'(x) = 3$, nudging $x$ up by 0.01 raises $f$ by about 0.03.

Rules you'll use constantly:

| Function | Derivative |
|---|---|
| $x^n$ | $n x^{n-1}$ |
| $e^x$ | $e^x$ |
| $\ln x$ | $1/x$ |
| $\sigma(x) = 1/(1+e^{-x})$ (sigmoid) | $\sigma(x)(1-\sigma(x))$ |
| $\tanh x$ | $1 - \tanh^2 x$ |
| $\max(0, x)$ (ReLU) | 1 if $x > 0$, else 0 |

The sigmoid's derivative peaks at 0.25 (at $x = 0$). Keep that number: multiplying many factors of at most 0.25 together is why deep sigmoid networks had **vanishing gradients**.

## Many inputs: the gradient

A loss depends on millions of weights. The **partial derivative** $\partial L / \partial w_i$ measures the effect of one weight with the others frozen. Stack them all and you get the **gradient**:

$$\nabla L = \left[\frac{\partial L}{\partial w_1}, \dots, \frac{\partial L}{\partial w_n}\right]$$

Two facts make it the engine of learning:

1. The gradient points in the direction of **steepest increase**, and its length is how steep that is.
2. So stepping against it decreases the loss fastest (for a small enough step). This is **gradient descent**:

$$w \leftarrow w - \eta \, \nabla L(w)$$

where $\eta$ (eta) is the **learning rate**. Watch it on a 2-D loss surface. Try a small rate, a large one, and a surface stretched in one direction:

[[widget:gradient-descent]]

## The chain rule: the whole of backprop in one line

Models are functions of functions: input → layer 1 → layer 2 → … → loss. If $y = f(u)$ and $u = g(x)$, then

$$\frac{dy}{dx} = \frac{dy}{du} \cdot \frac{du}{dx}$$

Each link contributes its local slope, and you multiply along the chain. Example: $L = (\sigma(wx) - t)^2$ for one input $x$ and target $t$. Let $z = wx$, $p = \sigma(z)$.

$$\frac{\partial L}{\partial w} = \underbrace{2(p - t)}_{\partial L/\partial p} \cdot \underbrace{p(1-p)}_{\partial p/\partial z} \cdot \underbrace{x}_{\partial z/\partial w}$$

With $x = 2$, $w = 0.5$, $t = 1$: $z = 1$, $p = \sigma(1) \approx 0.731$, so the gradient is $2(-0.269)(0.197)(2) \approx -0.212$. Negative means increasing $w$ lowers the loss, so gradient descent raises $w$. Correct: the prediction 0.73 is below the target 1.

When a variable feeds into several places, its derivative is the **sum** of the paths' contributions (the multivariable chain rule). **Backpropagation** is just the chain rule applied from the loss backwards, reusing each intermediate result so the whole gradient costs about as much as one more forward pass. The backpropagation page derives it for a full network.

## Jacobians: when outputs are vectors

A layer maps a vector to a vector. Its derivative is a matrix, the **Jacobian** $J$, with $J_{ij} = \partial y_i / \partial x_j$. The chain rule becomes matrix multiplication of Jacobians. In practice frameworks never build these huge matrices; they compute **vector–Jacobian products** ("given the gradient flowing in from above, what is the gradient below?"), which is what `loss.backward()` does.

Two Jacobians worth knowing:

- Linear layer $y = Wx$: $\partial y / \partial x = W$, and the gradient with respect to $W$ is the outer product of the upstream gradient and $x$.
- Softmax followed by cross-entropy: the gradient with respect to the logits is simply **$p - y$** (predicted probabilities minus the one-hot target). This tidy result is one reason the pair is used everywhere; the loss-functions page derives it.

## Curvature: why learning rates matter

The second derivative tells you how the slope changes: curvature. For many weights it's the **Hessian** matrix $H$. Near a minimum the loss looks like a bowl, $L(w) \approx L(w^*) + \tfrac{1}{2}(w - w^*)^\top H (w - w^*)$.

- Along a direction with curvature $\lambda$ (an eigenvalue of $H$), gradient descent is stable only if $\eta < 2/\lambda$. The **sharpest** direction sets the maximum learning rate.
- If the bowl is a long narrow valley (largest curvature ≫ smallest; a high **condition number**), a learning rate safe for the steep walls is painfully slow along the valley floor: the zig-zag in the widget. **Momentum** and **Adam** exist largely to fix this, and **feature scaling / normalisation** reshapes the bowl to be rounder.
- **Newton's method** uses $H^{-1}$ to jump straight to the bottom of the bowl, but for $n$ weights the Hessian has $n^2$ entries: impossible at a billion weights. Deep learning lives on first-order methods.

**Convex** functions (linear and logistic regression with their usual losses) have one global minimum, so gradient descent finds it. Neural network losses are **non-convex**, with many minima and saddle points, yet in very high dimensions most critical points are saddles, and stochastic gradient descent escapes them; the minima it finds tend to generalise fine.

## Logs make products into sums

Likelihoods multiply many probabilities ($0.9 \times 0.8 \times \dots$), which underflows to zero and has messy derivatives. Taking the log turns the product into a sum, $\log \prod p_i = \sum \log p_i$, with the same maximiser (log is increasing). That is why every loss you'll meet is a **negative log-likelihood**, and why you'll see "log-sum-exp" tricks for numerical stability.

## Checking gradients numerically

A classic ML-coding check: compare your analytic gradient to a finite difference,

$$\frac{\partial L}{\partial w} \approx \frac{L(w + h) - L(w - h)}{2h}, \quad h \approx 10^{-5}$$

The centred difference has error proportional to $h^2$. If relative error is below about $10^{-6}$ (in float64), your backward pass is right.

## Interview angles

- "Derive the gradient of logistic regression's loss." Result: $\nabla_w = (\sigma(w^\top x) - y)\,x$, averaged over examples. Practise until it takes one minute.
- "Why not use a huge learning rate?" Steps overshoot along the sharpest curvature; stability needs $\eta < 2/\lambda_{\max}$.
- "Why do we take logs?" Products become sums, numerically stable, same optimum.
- "How would you test your backprop?" Gradient check with centred differences on a tiny network in float64.

--- revise
### Derivatives
? What does $f'(x) = 3$ tell you? :: Nudging x up by a small h raises f by about 3h.
? Derivative of the sigmoid? :: $\sigma(x)(1-\sigma(x))$; maximum 0.25 at x = 0.
? Derivative of ReLU? :: 1 for positive inputs, 0 for negative.
? What is the gradient? :: The vector of all partial derivatives; points in the direction of steepest increase.
? Gradient descent update? :: $w \leftarrow w - \eta\nabla L(w)$.

### Chain rule
? Chain rule? :: $dy/dx = (dy/du)(du/dx)$: multiply local slopes along the chain; sum over multiple paths.
? What is backprop? :: The chain rule applied from the loss backwards, reusing intermediate results; costs about one extra forward pass.
? Gradient of softmax + cross-entropy w.r.t. logits? :: $p - y$.
? Gradient of logistic regression loss w.r.t. w? :: $(\sigma(w^\top x) - y)x$, averaged over examples.

### Curvature
? What does the Hessian describe? :: Second derivatives: curvature of the loss.
? Max stable learning rate along curvature λ? :: $\eta < 2/\lambda$; the sharpest direction limits the rate.
? Why does an ill-conditioned bowl slow training? :: A rate safe for steep walls crawls along the flat valley: zig-zag. Momentum, Adam and normalisation help.
? Why not Newton's method for deep nets? :: The Hessian has n² entries; impossible for billions of weights.
? Why take logs of likelihoods? :: Products become sums: stable, simpler derivatives, same maximiser.
? Gradient check formula? :: $(L(w+h) - L(w-h))/2h$ with $h\approx10^{-5}$, compare in float64.

--- notes
## Derivatives
f(x+h) ≈ f(x) + f'(x)h.
(xⁿ)' = nxⁿ⁻¹, (eˣ)' = eˣ, (ln x)' = 1/x.
σ' = σ(1−σ), max 0.25 → vanishing gradients in deep sigmoid nets.
tanh' = 1 − tanh². ReLU' = 1 if x>0 else 0.
## Gradient
∇L = all partials; steepest ascent. Descent: w ← w − η∇L.
## Chain rule
dy/dx = dy/du · du/dx; sum over paths.
Backprop = chain rule backwards with reuse; ≈ 1 extra forward pass of cost.
Jacobian J_ij = ∂yᵢ/∂xⱼ; frameworks compute vector–Jacobian products.
Softmax + CE: ∂L/∂logits = p − y. Logistic: ∇w = (σ(wᵀx) − y)x.
## Curvature
Hessian = curvature. Stable if η < 2/λmax.
High condition number → zig-zag; fix with momentum/Adam/normalisation.
Newton uses H⁻¹: too big for deep nets.
Convex: one global min (linear, logistic). Deep nets non-convex; saddles dominate in high-D.
## Practical
Logs: products → sums, stable, same optimum; losses are negative log-likelihoods.
Gradient check: centred difference, h ≈ 1e-5, float64, relative error < 1e-6.

--- doubts
Q: If the gradient points uphill, why does it help to know it?
A: Because stepping in the exact opposite direction is the fastest way downhill locally. Knowing the uphill direction precisely is the same as knowing the downhill one.

Q: The loss of a neural network isn't convex. Why does gradient descent work at all?
A: In millions of dimensions, most places where the gradient is zero are saddle points (downhill in some direction), not bad local minima, and the noise in stochastic gradient descent pushes you off saddles. The minima SGD reaches tend to have similar loss to each other. There's no guarantee, but in practice large networks train reliably with good initialisation, normalisation and learning-rate schedules.

Q: Is "the gradient" the same as "the derivative"?
A: For a function of one variable they're the same number. For many variables the gradient is the vector of partial derivatives. For vector outputs you have a Jacobian (a matrix). People use "gradient" loosely for all three in ML.

Q: Why does the chain rule multiply and not add?
A: Rates compound. If $u$ changes 3 times as fast as $x$, and $y$ changes 2 times as fast as $u$, then $y$ changes $2 \times 3 = 6$ times as fast as $x$. You add only when there are several separate paths from $x$ to $y$.

Q: What's a saddle point?
A: A point where the gradient is zero but the surface curves up in some directions and down in others, like a horse saddle or a mountain pass. Gradient descent can slow down there because the slope is near zero, but it is not a minimum.

--- exercises
[estimate] A loss surface has Hessian eigenvalues ranging from 0.01 to 100. What's the largest stable learning rate for plain gradient descent, and roughly how many steps does it take to make progress along the flattest direction?
A: Stability needs $\eta < 2/100 = 0.02$. Along the flattest direction (curvature 0.01) each step shrinks the error by a factor of about $1 - \eta\lambda = 1 - 0.0002$, so reducing that error by $e$ takes about 5,000 steps. The condition number of $10^4$ is the problem; momentum, Adam or rescaling the features help.

[design] Write a function that numerically checks the gradient of any scalar function f at a NumPy vector w, and say what tolerance you'd use.
A: Loop over each index $i$: copy $w$, add $h = 10^{-5}$ at $i$, evaluate; subtract $h$, evaluate; estimate $(f_+ - f_-)/2h$. Compare to the analytic gradient with relative error $|g_a - g_n| / \max(|g_a| + |g_n|, 10^{-12})$. In float64 expect below $10^{-7}$; above $10^{-3}$ is a bug. Check a few random indices on large models, and avoid kinks (ReLU at exactly 0).

[break] A teammate implements sigmoid as `1 / (1 + np.exp(-x))` and computes log-loss as `-y*np.log(p) - (1-y)*np.log(1-p)`. Training produces NaN once logits get large. Why, and how do you fix it?
A: For a large positive logit, p rounds to exactly 1.0 in float32, so $\log(1 - p) = \log 0 = -\infty$, and $0 \times \infty$ gives NaN. For a large negative x, `exp(-x)` overflows. Fix: compute the loss from the logit directly: $\max(z, 0) - zy + \log(1 + e^{-|z|})$ (what `BCEWithLogitsLoss` does), or clip p to $[\epsilon, 1-\epsilon]$.

--- pitfalls
- Treating the gradient as the downhill direction (it points uphill)
- Forgetting to sum contributions when a variable feeds several places
- Computing log of probabilities that underflowed to 0
- Gradient-checking in float32 or at a ReLU kink and chasing false alarms
- Picking the learning rate without thinking about the sharpest curvature

--- quiz
Q: What does the gradient of the loss point toward?
- The minimum
- *The direction of steepest increase of the loss
- The origin
- The largest weight
W: Gradient descent steps against it.

Q: The sigmoid's derivative is at most what?
- 1
- 0.5
- *0.25
- 0.1
W: $\sigma(1-\sigma)$ peaks at $0.5 \times 0.5$ when x = 0, one reason deep sigmoid nets vanish.

Q: For softmax followed by cross-entropy, what is the gradient with respect to the logits?
- $y - p$ squared
- *$p - y$
- $\log p$
- $p(1-p)$
W: The softmax Jacobian and the log cancel neatly to predicted minus target.

Q: The largest Hessian eigenvalue is 50. Which learning rate risks divergence in plain gradient descent?
- 0.01
- 0.02
- 0.035
- *0.05
W: Stability needs $\eta < 2/50 = 0.04$.

Q: Why are losses written as negative log-likelihoods?
- Logs make gradients larger
- *Logs turn products of probabilities into sums: numerically stable, simpler derivatives, same optimum
- Likelihoods can be negative
- It makes the loss convex for neural networks
W: Log is increasing, so maximising log-likelihood maximises likelihood.

--- sources
- book :: Mathematics for Machine Learning (chapter 5, vector calculus) :: Deisenroth, Faisal, Ong :: https://mml-book.github.io/
- book :: Deep Learning (chapter 4, numerical computation) :: Goodfellow, Bengio, Courville :: https://www.deeplearningbook.org/contents/numerical.html
- course :: CS231n: Optimization and backpropagation notes :: Stanford :: https://cs231n.github.io/optimization-2/
- paper :: Identifying and attacking the saddle point problem in high-dimensional non-convex optimization :: Dauphin et al. (2014) :: https://arxiv.org/abs/1406.2572

=== probability-ml
blurb: Random variables, the distributions ML uses, Bayes' rule, maximum likelihood and MAP estimation (and why they give you MSE, log-loss and regularisation), and entropy, cross-entropy and KL divergence.
signals: "Where does the cross-entropy loss come from?" | "What is the difference between MLE and MAP?" | "Explain KL divergence" (RLHF, distillation, VAEs) | Any Bayes-rule puzzle about tests and base rates
widgets: likelihood

--- lesson
:::words
- **Random variable**: a quantity whose value is uncertain, like "the label of the next email" or "tomorrow's temperature".
- **Distribution**: the full description of how likely each value is. **Discrete** for countable values (spam / not spam), **continuous** for real numbers (temperature).
- **Expectation** (mean): the average value you'd see over many draws, $\mathbb{E}[X]$.
- **Variance**: the average squared distance from the mean: how spread out values are. Its square root is the **standard deviation**.
- **Conditional probability** $P(A \mid B)$: the probability of A once you know B happened.
- **Likelihood**: how probable the observed data is under particular model parameters, viewed as a function of the parameters.
- **Prior**: what you believed about the parameters before seeing data. **Posterior**: what you believe after.
- **Entropy**: how surprising or uncertain a distribution is, in bits (or nats).
- **KL divergence**: how different one distribution is from another (not symmetric).
:::

## The problem in plain words

Data is noisy and the future is uncertain, so models don't output "the answer"; they output **beliefs**: "87% spam", "the price is about 300, give or take 20". Probability is the language for those beliefs, and it also tells you *what to optimise*. Almost every loss function you'll meet is a probability statement in disguise: mean squared error says "I assume errors are Gaussian", log-loss says "I assume labels are coin flips with my predicted bias", and L2 regularisation says "I believe weights are probably small". Seeing this lets you derive losses instead of memorising them, which is exactly what L5 ML interviews probe.

:::eli5
You find a coin and flip it 10 times: 7 heads. What's the coin's bias? Maximum likelihood says "whatever bias makes 7 out of 10 most likely": 0.7. But you've seen thousands of coins and nearly all are fair, so you'd guess something like 0.55 instead. That gut-pull toward 0.5 is a prior. Combining them is MAP estimation.
:::

## Distributions you must know

| Distribution | What it models | Mean | Variance | Where in ML |
|---|---|---|---|---|
| Bernoulli($p$) | one yes/no | $p$ | $p(1-p)$ | binary labels, logistic regression |
| Binomial($n, p$) | number of yeses in $n$ tries | $np$ | $np(1-p)$ | click counts, A/B tests |
| Categorical | one of $K$ classes | | | multi-class labels, next-token prediction |
| Poisson($\lambda$) | count of events in a period | $\lambda$ | $\lambda$ | arrivals, counts regression |
| Gaussian($\mu, \sigma^2$) | real values clustered around a mean | $\mu$ | $\sigma^2$ | regression noise, initialisation, VAEs, diffusion |
| Exponential | waiting time | $1/\lambda$ | $1/\lambda^2$ | time-to-event |
| Uniform | everything equally likely | | | random init, sampling |

**Expectation is linear**: $\mathbb{E}[aX + bY] = a\mathbb{E}[X] + b\mathbb{E}[Y]$, always, even if X and Y are dependent. Variance is not: $\text{Var}(X + Y) = \text{Var}(X) + \text{Var}(Y) + 2\,\text{Cov}(X, Y)$, which is only the sum when they're uncorrelated. Averaging $n$ independent measurements divides variance by $n$, so the standard deviation shrinks by $\sqrt{n}$: the reason bigger batches give smoother gradients and bigger samples give tighter A/B results.

## Bayes' rule

$$P(A \mid B) = \frac{P(B \mid A)\,P(A)}{P(B)}$$

The classic trap: a disease affects 1 in 1,000 people; a test catches 99% of cases and has a 1% false-positive rate. You test positive. Chance you have it?

Out of 100,000 people: 100 sick, 99 test positive. 99,900 healthy, 999 test positive. So $P(\text{sick} \mid +) = 99 / (99 + 999) \approx 9\%$. The **base rate** dominates. This is exactly the fraud-detection or rare-content-moderation situation: with a rare positive class, even a very accurate model produces mostly false alarms, which is why precision collapses and why the metrics page insists on precision–recall rather than accuracy.

**Naive Bayes** classifiers apply this rule with the "naive" assumption that features are independent given the class; it's wrong but often works for text.

## Maximum likelihood: where losses come from

Given data and a model with parameters $\theta$, the **likelihood** is $P(\text{data} \mid \theta)$. **Maximum likelihood estimation (MLE)** picks the $\theta$ that makes the observed data most probable. Because examples are assumed independent, the likelihood is a product, so we maximise the log (a sum) or, equivalently, **minimise the negative log-likelihood (NLL)**. Two derivations every L5 MLE candidate should be able to give:

**Gaussian noise → mean squared error.** Assume $y = f_\theta(x) + \varepsilon$ with $\varepsilon \sim \mathcal{N}(0, \sigma^2)$. Then

$$-\log P(y \mid x, \theta) = \frac{(y - f_\theta(x))^2}{2\sigma^2} + \text{const}$$

Summed over examples, minimising NLL is minimising squared error. (Assume Laplace noise instead and you get mean absolute error, which is more robust to outliers.)

**Bernoulli labels → log-loss.** Assume $y \in \{0, 1\}$ with $P(y = 1) = p = \sigma(f_\theta(x))$. Then

$$-\log P(y \mid x) = -[\,y \log p + (1-y)\log(1-p)\,]$$

which is **binary cross-entropy**. With $K$ classes and softmax probabilities it becomes $-\log p_{\text{true class}}$: categorical cross-entropy, the loss of every classifier and every language model (next-token prediction is $K$-way classification with $K$ = vocabulary size).

Try it: set the observed heads and flips and watch the likelihood curve peak at the MLE; add a prior and watch the MAP estimate move:

[[widget:likelihood]]

## MAP: a prior becomes regularisation

**Maximum a posteriori (MAP)** estimation maximises the posterior, $P(\theta \mid \text{data}) \propto P(\text{data} \mid \theta)\,P(\theta)$. In log form:

$$\hat\theta_{\text{MAP}} = \arg\min_\theta \; \underbrace{-\log P(\text{data} \mid \theta)}_{\text{the usual loss}} \; \underbrace{- \log P(\theta)}_{\text{penalty}}$$

- A Gaussian prior $\theta \sim \mathcal{N}(0, \tau^2)$ gives a penalty $\frac{1}{2\tau^2}\|\theta\|^2$: **L2 regularisation** (weight decay, ridge regression).
- A Laplace prior gives $\frac{1}{b}\|\theta\|_1$: **L1 regularisation** (lasso), which produces exact zeros.

A strong prior (small $\tau$) means strong regularisation. As the data grows, the likelihood term grows with it while the prior stays fixed, so MAP approaches MLE: regularisation matters most when data is scarce. **Full Bayesian** methods keep the whole posterior instead of a single best $\theta$, which gives honest uncertainty but is usually too expensive for big neural networks (approximations: ensembles, MC dropout).

## Entropy, cross-entropy and KL divergence

**Entropy** measures uncertainty: the average surprise $-\log p(x)$ of outcomes.

$$H(p) = -\sum_x p(x) \log p(x)$$

A fair coin has 1 bit; a coin that always lands heads has 0; a uniform choice among 50,000 tokens has $\log_2 50000 \approx 15.6$ bits.

**Cross-entropy** $H(p, q) = -\sum_x p(x)\log q(x)$ is the average surprise when outcomes come from $p$ but you predict with $q$. With $p$ the one-hot true label, it is exactly the classification loss above.

**KL divergence** is the extra surprise from using $q$ instead of the truth $p$:

$$D_{\text{KL}}(p \,\|\, q) = \sum_x p(x)\log\frac{p(x)}{q(x)} = H(p, q) - H(p) \;\ge\; 0$$

Since $H(p)$ doesn't depend on the model, **minimising cross-entropy is minimising KL** to the data distribution. KL is zero only when $q = p$, and it is **not symmetric**:

- $D_{\text{KL}}(p \| q)$ ("forward") punishes $q$ for putting low probability where $p$ has mass: $q$ spreads out to cover everything (**mean-seeking**). Maximum likelihood training does this.
- $D_{\text{KL}}(q \| p)$ ("reverse") punishes $q$ for putting mass where $p$ has little: $q$ locks onto one mode (**mode-seeking**). Variational inference and RL fine-tuning behave like this.

Where KL appears: the **RLHF penalty** that keeps a fine-tuned model close to its starting point, **knowledge distillation** (match the teacher's distribution), the **VAE** loss, and **perplexity** ($e^{\text{cross-entropy}}$), the standard language-model metric: perplexity 10 means "as uncertain as choosing among 10 equally likely tokens".

## Interview angles

- "Why cross-entropy and not MSE for classification?" It's the NLL of a Bernoulli/categorical model; its gradient $p - y$ stays large when the model is confidently wrong, while MSE through a sigmoid has the extra $\sigma'$ factor that vanishes when saturated.
- "MLE vs MAP?" MAP adds a log-prior; Gaussian prior = L2, Laplace = L1; they converge as data grows.
- "Forward vs reverse KL?" Mean-seeking vs mode-seeking; say which one your method minimises.
- Base-rate puzzles: count out of 100,000 people. It's faster and harder to get wrong than plugging into the formula.

--- revise
### Basics
? Is expectation linear for dependent variables? :: Yes, always: $E[aX+bY] = aE[X]+bE[Y]$.
? Var(X+Y)? :: Var X + Var Y + 2 Cov(X, Y).
? Averaging n independent samples does what to the standard deviation? :: Divides it by √n.
? Bernoulli mean and variance? :: p and p(1−p).
? Poisson mean and variance? :: Both λ.

### Bayes
? Bayes' rule? :: $P(A|B) = P(B|A)P(A)/P(B)$.
? Rare disease 1/1000, 99% sensitivity, 1% false-positive: P(sick | +)? :: About 9%: 99 true vs 999 false positives per 100,000.
? Naive Bayes assumption? :: Features are independent given the class.

### Estimation
? What is MLE? :: Choose parameters maximising the probability of the observed data (minimise negative log-likelihood).
? Gaussian noise gives which loss? :: Mean squared error. (Laplace noise → mean absolute error.)
? Bernoulli labels give which loss? :: Binary cross-entropy (log-loss).
? What is MAP? :: MLE plus a log-prior penalty.
? Gaussian prior and Laplace prior correspond to? :: L2 and L1 regularisation.
? What happens to MAP as data grows? :: It approaches MLE; the prior's influence fades.

### Information
? Entropy? :: $-\sum p\log p$: average surprise; fair coin = 1 bit.
? Cross-entropy vs KL? :: $KL(p\|q) = H(p,q) - H(p)$; minimising CE minimises KL to the data.
? Is KL symmetric? :: No. Forward KL(p‖q) is mean-seeking; reverse KL(q‖p) is mode-seeking.
? Perplexity? :: $e^{\text{cross-entropy}}$: the effective number of equally likely choices.
? Name three places KL appears. :: RLHF penalty, distillation, VAE loss (also perplexity via cross-entropy).

--- notes
## Distributions
Bernoulli p: mean p, var p(1−p). Binomial: np, np(1−p). Poisson: λ, λ. Gaussian: μ, σ².
Categorical = K-way label (classifiers, next-token prediction).
## Moments
E linear always. Var(X+Y) = VarX + VarY + 2Cov.
Mean of n iid: std / √n (batch size, sample size).
## Bayes
P(A|B) = P(B|A)P(A)/P(B). Count out of 100,000.
Rare positives → most alarms false → precision collapses.
## MLE
Maximise P(data|θ) ⇔ minimise NLL (sum of −log p).
Gaussian noise → MSE. Laplace → MAE. Bernoulli → BCE. Categorical → CE = −log p_true.
## MAP
NLL − log prior. Gaussian prior → L2 / weight decay. Laplace → L1 / sparsity.
More data → MAP → MLE. Full Bayes keeps posterior (ensembles, MC dropout approximate).
## Information
H(p) = −Σ p log p. Fair coin 1 bit. Uniform over 50k tokens ≈ 15.6 bits.
H(p,q) = −Σ p log q. KL(p‖q) = H(p,q) − H(p) ≥ 0, 0 iff equal.
Forward KL mean-seeking (MLE); reverse KL mode-seeking (VI, RL).
KL in: RLHF penalty, distillation, VAE. Perplexity = e^CE.

--- doubts
Q: What's the difference between probability and likelihood? They look like the same formula.
A: Same formula, different variable. Probability: parameters fixed, ask how likely different data would be. Likelihood: data fixed (you've observed it), ask how well different parameter values explain it. Likelihoods over parameters don't sum to 1, so they are not a probability distribution over $\theta$.

Q: Why does cross-entropy beat MSE for classification if both get smaller as predictions improve?
A: Gradients. With a sigmoid output, MSE's gradient includes $\sigma'(z)$, which is nearly 0 when the model is confidently wrong (saturated), so learning stalls exactly when it's most needed. Cross-entropy's gradient is $p - y$, which is large in that case. It's also the correct NLL for a probabilistic classifier, so its outputs are calibrated probabilities.

Q: Is L2 regularisation really "a prior", or is that just a nice story?
A: It's exact: minimising $\text{NLL} + \lambda\|w\|^2$ is MAP estimation with a Gaussian prior of variance $1/(2\lambda)$. The story is useful because it tells you how to set $\lambda$ conceptually (how strongly you believe weights are small) and why it matters less with more data.

Q: Bits or nats?
A: Same thing in different units: log base 2 gives bits, natural log gives nats ($1 \text{ nat} \approx 1.44$ bits). ML code uses natural logs, so losses are in nats.

Q: Why is KL divergence not a distance?
A: It isn't symmetric ($KL(p\|q) \ne KL(q\|p)$) and doesn't satisfy the triangle inequality. If you need a symmetric version, the Jensen–Shannon divergence averages KL to the midpoint distribution; it's what the original GAN objective minimises.

--- exercises
[estimate] A spam filter sees 2% spam. It flags 95% of spam and wrongly flags 1% of normal mail. Of flagged emails, what fraction is actually spam?
A: Per 10,000 emails: 200 spam, 190 flagged. 9,800 normal, 98 flagged. Precision $= 190 / 288 \approx 66\%$. One flagged email in three is a false alarm, despite 99% specificity.

[design] Derive the loss you'd use to predict the number of clicks an ad gets in an hour, starting from an assumption about the data.
A: Counts are non-negative integers with variance growing with the mean, so assume Poisson: $P(y) = \lambda^y e^{-\lambda} / y!$ with $\lambda = e^{f_\theta(x)}$ (log link keeps it positive). NLL $= \lambda - y\log\lambda + \log y!$; dropping the constant, minimise $e^{f} - yf$. This is Poisson regression; frameworks call it `PoissonNLLLoss`.

[choose] You're distilling a large model into a small one. Should the student minimise KL(teacher ‖ student) or KL(student ‖ teacher)?
A: The standard choice is forward KL(teacher ‖ student) via cross-entropy on the teacher's soft labels: the student covers all the teacher's plausible outputs (mean-seeking). Reverse KL makes the student pick the teacher's dominant mode, which some LLM distillation work prefers for generation quality (fewer bland averages) but can lose diversity. State the trade-off and measure both.

--- pitfalls
- Ignoring the base rate when interpreting a positive prediction
- Calling likelihood a probability distribution over parameters
- Using MSE for classification by default
- Mixing log bases (bits vs nats) when comparing numbers
- Treating KL as symmetric

--- quiz
Q: Assuming Gaussian noise on the targets, maximum likelihood is equivalent to minimising what?
- Absolute error
- *Squared error
- Cross-entropy
- Hinge loss
W: The Gaussian's log-density is a constant minus squared error over 2σ².

Q: Adding an L2 penalty to the loss corresponds to which prior on the weights?
- Uniform
- Laplace
- *Gaussian centred at 0
- Bernoulli
W: The Gaussian's negative log-density is proportional to the squared norm.

Q: A model's cross-entropy on a test set is 2.3 nats. What is its perplexity?
- 2.3
- *About 10
- About 5
- About 23
W: Perplexity = e^2.3 ≈ 10.

Q: Which is true of KL divergence?
- KL(p‖q) = KL(q‖p)
- It can be negative
- *It is zero only when the two distributions are equal
- It is a metric distance
W: It's non-negative, zero iff equal, and not symmetric.

Q: 0.5% of transactions are fraud. A model catches 90% of fraud with a 2% false-positive rate. Roughly what fraction of alerts are fraud?
- 90%
- 50%
- *About 18%
- About 2%
W: Per 100,000: 450 true alerts vs 1,990 false ones; 450/2440 ≈ 18%.

--- sources
- book :: Pattern Recognition and Machine Learning (chapters 1–2) :: Christopher Bishop :: https://www.microsoft.com/en-us/research/publication/pattern-recognition-machine-learning/
- book :: Deep Learning (chapter 3, probability and information theory) :: Goodfellow, Bengio, Courville :: https://www.deeplearningbook.org/contents/prob.html
- book :: Mathematics for Machine Learning (chapters 6 and 8) :: Deisenroth, Faisal, Ong :: https://mml-book.github.io/
- book :: Probabilistic Machine Learning: An Introduction :: Kevin Murphy :: https://probml.github.io/pml-book/book1.html

=== statistics-tests
blurb: Sampling, the central limit theorem, standard errors and confidence intervals, hypothesis tests and p-values, power and sample size, and the multiple-testing traps that come up whenever you compare models or run experiments.
signals: "Is model B really better than model A?" | "How long should this A/B test run?" | "What does a p-value of 0.03 mean?" | Comparing offline metrics across many runs or slices
widgets: ab-test-sim

--- lesson
:::words
- **Population**: everything you care about (all users). **Sample**: the part you actually observed.
- **Statistic**: a number computed from a sample, like the sample mean or a click-through rate.
- **Standard error (SE)**: how much a statistic would wobble if you repeated the sampling. Not the same as the spread of the data.
- **Confidence interval (CI)**: a range built so that, over many repeats, 95% of such ranges contain the true value.
- **Null hypothesis**: the boring explanation ("no difference"). **Alternative**: the interesting one.
- **p-value**: if the null hypothesis were true, how often you'd see a result at least this extreme by chance.
- **Significance level (α)**: the false-alarm rate you accept, usually 5%.
- **Power**: the chance your test detects a real effect of a given size, usually targeted at 80%.
:::

## The problem in plain words

You trained a new model and its accuracy is 0.4% higher. Or you ran an experiment and click-through rose from 3.10% to 3.18%. Is that real, or luck? Every number you measure on a finite sample would come out a little different with a different sample. Statistics is how you tell "real improvement" from "noise", and how you decide **how much data you need** before you can tell. ML interviews ask this directly (A/B testing questions) and indirectly ("how do you know your new model is better?").

:::eli5
Flip a fair coin 10 times and you might get 7 heads. That doesn't mean it's biased; small samples wobble. Flip it 10,000 times and getting 70% heads would be astonishing. The question is always: how surprised should I be, given how much I flipped?
:::

## The central limit theorem

Take many independent samples of size $n$ from almost any distribution and compute their means. Those means are approximately **normally distributed**, centred on the true mean, with standard deviation

$$\text{SE} = \frac{\sigma}{\sqrt{n}}$$

That's the **standard error**. Two consequences drive everything:

1. You can put error bars on averages, rates and metrics without knowing the data's distribution (for reasonably large $n$).
2. Precision grows only with $\sqrt{n}$: **halving the error bar needs four times the data**.

For a rate (a proportion) $\hat p$, the standard error is $\sqrt{\hat p(1-\hat p)/n}$. For an accuracy of 90% on 1,000 test examples, SE $= \sqrt{0.9 \times 0.1 / 1000} \approx 0.95\%$. A "0.4% improvement" on that test set is well inside the noise.

## Confidence intervals

A 95% confidence interval is roughly estimate $\pm 1.96 \times \text{SE}$. For the accuracy above: $90\% \pm 1.9\%$. The correct reading: "this procedure produces intervals that contain the true value 95% of the time". It is **not** "there's a 95% chance the true value is in this particular interval" (that's a Bayesian credible interval, a different calculation).

For things without a neat formula (AUC, NDCG, a median latency), use the **bootstrap**: resample your test set with replacement 1,000 times, recompute the metric each time, and take the 2.5th and 97.5th percentiles. It's the most useful statistics tool for offline model comparison.

## Hypothesis tests and p-values

To compare a control (A) and treatment (B):

1. **Null hypothesis** $H_0$: no difference. **Alternative** $H_1$: there is one.
2. Compute a test statistic: the observed difference divided by its standard error. For two proportions,
$$z = \frac{\hat p_B - \hat p_A}{\sqrt{\hat p(1-\hat p)\left(\frac{1}{n_A} + \frac{1}{n_B}\right)}}$$
with $\hat p$ the pooled rate.
3. The **p-value** is the probability of a $|z|$ at least this large if $H_0$ were true. If $p < \alpha$ (0.05), reject $H_0$.

What a p-value is **not**: the probability that the null is true, or that the result is a fluke, or the size or importance of the effect. A tiny, useless effect is "significant" with enough data; a big effect can be non-significant with too little.

Two kinds of mistakes:

| | $H_0$ true (no effect) | $H_1$ true (real effect) |
|---|---|---|
| Reject $H_0$ | **Type I error** (false positive), rate α | Correct (power, $1-\beta$) |
| Keep $H_0$ | Correct | **Type II error** (missed effect), rate β |

Run the simulator: set a true lift (or none), a sample size, and run many experiments. Watch how often a zero-lift test comes out "significant" (about 5%, by design), how often a real lift is detected (the power), and what happens when you peek early and stop at the first significant result:

[[widget:ab-test-sim]]

## Power and sample size

Before running an experiment, decide the **minimum detectable effect** (MDE) worth knowing about, then compute the sample size for 80% power at α = 0.05. The rule of thumb for comparing two means (Lehr's rule):

$$n \text{ per group} \approx \frac{16\,\sigma^2}{\delta^2}$$

where $\delta$ is the MDE. For a click rate of 3% ($\sigma^2 = 0.03 \times 0.97 \approx 0.029$) and a relative lift of 2% ($\delta = 0.0006$): $n \approx 16 \times 0.029 / 3.6\times10^{-7} \approx 1.3$ million users per group. Small lifts on rare events need huge samples, which is why big companies can detect 0.1% changes and startups can't. **Variance reduction** (CUPED: regressing out each user's pre-experiment behaviour) can cut the needed sample by 30–50%.

## The traps

- **Peeking**: checking the p-value daily and stopping when it dips below 0.05 inflates the false-positive rate far above 5% (the simulator shows it). Fix the duration in advance, or use sequential tests designed for continuous monitoring.
- **Multiple comparisons**: test 20 metrics or 20 user slices and one will be "significant" by chance. Correct with Bonferroni (divide α by the number of tests; conservative) or control the false discovery rate (Benjamini–Hochberg). Name a primary metric in advance.
- **Non-independent units**: if you randomise by user but analyse per page view, views from the same user are correlated and the naive SE is too small. Analyse at the randomisation unit, or use the delta method / clustered SEs.
- **Simpson's paradox**: a model better in every segment can look worse overall if the segment mix differs between groups. Check the mix.
- **Novelty and learning effects**: users click new things because they're new; run long enough to see the steady state.

## Comparing two models offline

On the same test set, the two models' errors are correlated, so use a **paired** test: McNemar's test on the examples where exactly one model is right, or a paired bootstrap of the metric difference. Report a confidence interval on the **difference**, and check the improvement holds across random seeds: training noise alone often moves metrics by a few tenths of a percent.

## Interview angles

- "Model B is 0.5% better on the test set. Ship it?" Ask the test-set size and the SE; use a paired bootstrap; check seeds and slices; then confirm online with an A/B test, because offline gains often don't transfer.
- "How long should the test run?" From MDE, baseline variance, α and power → sample size → divide by daily traffic; round up to whole weeks for weekly seasonality.
- "What's a p-value?" The probability of data at least this extreme if there were no effect. Then say what it isn't.

--- revise
### Sampling
? Standard error of a mean? :: σ/√n.
? Standard error of a proportion? :: $\sqrt{p(1-p)/n}$.
? What does the CLT say? :: Means of large independent samples are approximately normal, centred on the true mean, with SE σ/√n.
? How much more data to halve the error bar? :: Four times as much.
? 95% CI rule of thumb? :: Estimate ± 1.96 SE.
? Bootstrap? :: Resample the test set with replacement many times, recompute the metric, take percentiles.

### Tests
? Definition of a p-value? :: Probability of a result at least this extreme if the null hypothesis were true.
? Type I vs Type II error? :: Type I: false positive (rate α). Type II: missed real effect (rate β); power = 1 − β.
? Lehr's rule for sample size? :: n per group ≈ 16σ²/δ² for 80% power, α = 0.05.
? Why is peeking bad? :: Stopping at the first significant result inflates false positives far above α.
? Multiple comparisons fix? :: Pre-register a primary metric; Bonferroni (α/m) or Benjamini–Hochberg (FDR).
? Comparing two models on one test set? :: Paired test: McNemar or paired bootstrap of the difference; check seeds.
? CUPED? :: Variance reduction by regressing out pre-experiment behaviour; smaller samples needed.

--- notes
## Sampling
SE(mean) = σ/√n. SE(rate) = √(p(1−p)/n).
CLT: sample means ≈ normal. Halve error → 4× data.
95% CI ≈ ±1.96 SE. Reading: procedure covers truth 95% of the time.
Bootstrap: resample with replacement → percentile CI (AUC, NDCG, medians).
## Tests
H0 no effect. z = diff / SE. p-value = P(this extreme | H0).
p-value ≠ P(H0 true), ≠ effect size.
Type I = false positive (α). Type II = miss (β). Power = 1 − β (aim 80%).
## Sample size
n/group ≈ 16σ²/δ². 3% CTR, 2% relative lift → ~1.3M per group.
CUPED cuts variance 30–50%.
## Traps
Peeking → inflated false positives; fix duration or use sequential tests.
Many metrics/slices → Bonferroni or BH; one primary metric.
Analyse at the randomisation unit (clustered SE / delta method).
Simpson's paradox: check segment mix. Novelty effects: run whole weeks.
## Offline comparison
Paired tests (McNemar, paired bootstrap). Seed variance. Offline ≠ online: confirm with A/B.

--- doubts
Q: If my p-value is 0.03, is there a 97% chance my model is really better?
A: No. It means: if there were truly no difference, data this extreme would show up 3% of the time. The probability your model is better depends also on how plausible improvements were to begin with (a prior), which a p-value ignores. Many "significant" results with p near 0.05 don't replicate.

Q: Why 0.05? Is it special?
A: No, it's a convention (from Ronald Fisher in the 1920s). Choose α by the cost of a false positive. Launching a risky ranking change might deserve 0.01; an exploratory test might accept 0.1. Particle physicists use about 0.0000003 ("5 sigma").

Q: Standard deviation vs standard error?
A: Standard deviation describes the spread of individual data points (how different users are). Standard error describes the uncertainty in an estimate computed from them (how much the average would move with a new sample). SE = SD/√n, so it shrinks with data while SD doesn't.

Q: Can I just run my experiment until it's significant?
A: That's peeking. With enough looks, even a zero-effect test will eventually cross p < 0.05 by chance. Either fix the sample size in advance or use a sequential method (always-valid p-values, group-sequential boundaries) built for repeated looks.

--- exercises
[estimate] Your test set has 5,000 examples. Model A scores 88.0% accuracy, model B 88.6%. Is that difference meaningful?
A: SE of one accuracy ≈ $\sqrt{0.88 \times 0.12 / 5000} \approx 0.46\%$. The difference's SE (unpaired) is about $0.65\%$, so 0.6% is under one SE: not distinguishable. A paired test would be more sensitive (it uses only examples where they disagree), but you'd still want more data or multiple seeds before claiming B is better.

[estimate] Baseline conversion is 5%. You want to detect a 5% relative lift (to 5.25%) at 80% power and α = 0.05. You get 200,000 users a day. How many days should the test run?
A: $\sigma^2 = 0.05 \times 0.95 = 0.0475$, $\delta = 0.0025$. $n \approx 16 \times 0.0475 / 6.25\times10^{-6} \approx 122{,}000$ per group, 244,000 total. That's about 1.2 days of traffic, but run at least a full week to cover weekly patterns and novelty.

[break] An analyst reports that a new ranking model improved engagement in 3 of 40 countries at p < 0.05 and proposes launching only in those 3. What's wrong?
A: Multiple comparisons: with 40 tests at α = 0.05, about 2 false positives are expected even with zero effect. Three "wins" is roughly what chance produces. Apply a correction (Bonferroni would require p < 0.00125), or treat the three countries as a hypothesis and re-test them in a fresh experiment.

--- pitfalls
- Reading a p-value as the probability the result is a fluke
- Peeking and stopping early
- Testing many metrics or slices without correction
- Using an unpaired test to compare two models on the same test set
- Declaring a tiny offline gain a win without seeds or confidence intervals

--- quiz
Q: To halve the width of a confidence interval, you need roughly how much more data?
- Twice as much
- *Four times as much
- Eight times as much
- The same amount
W: SE falls with √n.

Q: What is a p-value?
- The probability the null hypothesis is true
- The size of the effect
- *The probability of data at least this extreme if the null hypothesis were true
- The probability the alternative is true
W: It's computed assuming the null.

Q: You check an A/B test every day and stop the first day p < 0.05. What happens to the false-positive rate?
- It stays at 5%
- *It rises well above 5%
- It drops below 5%
- It becomes 0
W: Each look is another chance to cross the threshold by luck.

Q: What does 80% power mean?
- 80% of users see the treatment
- *If the true effect equals the minimum detectable effect, the test detects it 80% of the time
- The p-value will be 0.8
- The model is 80% accurate
W: Power is 1 − β at a given effect size.

Q: Two models are evaluated on the same 10,000 examples. Which test fits best?
- Unpaired two-sample t-test
- *A paired test such as McNemar's or a paired bootstrap
- Chi-squared on the class distribution
- No test is needed
W: The same examples make the errors correlated; pairing uses that.

--- sources
- book :: Trustworthy Online Controlled Experiments :: Kohavi, Tang, Xu :: https://experimentguide.com/
- paper :: Improving the Sensitivity of Online Controlled Experiments (CUPED) :: Deng et al., Microsoft (2013) :: https://exp-platform.com/Documents/2013-02-CUPED-ImprovingSensitivityOfControlledExperiments.pdf
- book :: An Introduction to Statistical Learning (chapter 13, multiple testing) :: James, Witten, Hastie, Tibshirani :: https://www.statlearning.com/
- article :: The ASA Statement on p-Values :: American Statistical Association (2016) :: https://www.amstat.org/asa/files/pdfs/p-valuestatement.pdf
