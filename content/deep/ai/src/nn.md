=== mlp-activations
blurb: From one neuron to multi-layer networks: weighted sums, why non-linear activations are essential, sigmoid, tanh, ReLU, leaky ReLU, GELU and SiLU compared, the softmax output layer, universal approximation, and why depth beats width.
signals: "Why do we need activation functions?" | "ReLU vs GELU vs sigmoid?" | "How many parameters does this MLP have?" | The feed-forward block inside every transformer
widgets: activations
prereq: logistic-regression, calculus-gradients

--- lesson
:::words
- **Neuron** (unit): computes a weighted sum of its inputs plus a bias, then applies an activation function.
- **Layer**: many neurons side by side, all reading the same inputs. A **dense** (fully connected) layer connects every input to every neuron.
- **Activation function**: the non-linear squashing or bending applied after the weighted sum.
- **Hidden layer**: a layer between input and output.
- **MLP** (multi-layer perceptron): a stack of dense layers with activations in between.
- **Logits**: the raw outputs of the last layer, before softmax or sigmoid.
- **Dead neuron**: a ReLU unit whose input is always negative, so it outputs 0 and never learns.
:::

## The problem in plain words

Logistic regression can only draw straight boundaries; real problems (recognising a face, judging a sentence's tone) need curved, complicated ones. A neural network stacks simple units so that each layer builds new features out of the previous layer's: edges → shapes → objects, or characters → words → meaning. The trick that makes stacking useful is the **activation function**: without it, a hundred layers collapse into one straight-line model.

:::eli5
Each neuron is a tiny voter that adds up evidence and then decides how loudly to speak. One voter can only say "more of this, less of that". A committee of committees, where each level listens to the level below, can recognise patterns no single voter could.
:::

## One neuron, one layer

A neuron computes $a = \phi(\mathbf{w}^\top\mathbf{x} + b)$. A layer of $m$ neurons is the matrix form

$$\mathbf{h} = \phi(W\mathbf{x} + \mathbf{b}), \quad W \in \mathbb{R}^{m \times d}$$

and a two-layer MLP for classification is

$$\mathbf{h} = \phi(W_1\mathbf{x} + \mathbf{b}_1), \qquad \text{logits} = W_2\mathbf{h} + \mathbf{b}_2, \qquad \mathbf{p} = \text{softmax}(\text{logits})$$

Parameter count of a dense layer: $d_{\text{in}} \times d_{\text{out}} + d_{\text{out}}$. An MLP 784 → 256 → 128 → 10 has $784 \cdot 256 + 256 + 256 \cdot 128 + 128 + 128 \cdot 10 + 10 = 235{,}146$ parameters.

## Why non-linearity is essential

Without $\phi$, two layers give $W_2(W_1\mathbf{x} + \mathbf{b}_1) + \mathbf{b}_2 = (W_2W_1)\mathbf{x} + (W_2\mathbf{b}_1 + \mathbf{b}_2)$: still a single linear map. Depth adds nothing. The activation lets each layer **bend** the space, so the next layer's straight cuts become curved boundaries in the original input. With ReLU, the network computes a piecewise-linear function whose number of pieces can grow exponentially with depth.

## The activation zoo

| Activation | Formula | Derivative | Pros | Cons |
|---|---|---|---|---|
| **Sigmoid** | $1/(1 + e^{-x})$ | $\sigma(1 - \sigma) \le 0.25$ | Output in (0, 1) | Saturates → vanishing gradients; not zero-centred |
| **Tanh** | $\tanh x$ | $1 - \tanh^2 x \le 1$ | Zero-centred | Still saturates |
| **ReLU** | $\max(0, x)$ | 1 or 0 | Cheap, no saturation for $x > 0$, sparse | Dead neurons for $x < 0$ |
| **Leaky ReLU** | $\max(\alpha x, x)$, $\alpha = 0.01$ | 1 or α | No dead units | Extra hyperparameter |
| **GELU** | $x\,\Phi(x)$ | smooth | Smooth, used in BERT and GPT | Slightly costlier |
| **SiLU / Swish** | $x\,\sigma(x)$ | smooth | Smooth, used in many modern LLMs | |
| **SwiGLU** (gated) | $(\text{SiLU}(xW) \odot xV)$ | | Best FFN quality in LLMs (PaLM, Llama) | 3 matrices instead of 2 |

Compare their shapes and derivatives; see where gradients vanish:

[[widget:activations]]

Rules of thumb: ReLU (or GELU/SiLU) for hidden layers; never sigmoid/tanh in deep hidden stacks (except in gates of LSTMs). For the **output**: nothing (identity) for regression, sigmoid for binary or multi-label, softmax for multi-class.

## Softmax

$$\text{softmax}(\mathbf{z})_k = \frac{e^{z_k}}{\sum_j e^{z_j}}$$

Turns any vector of logits into probabilities. Adding a constant to all logits doesn't change it, so implementations subtract $\max z$ first for numerical safety. **Temperature** $T$ divides the logits: $T < 1$ sharpens, $T > 1$ flattens (decoding and distillation pages). Paired with cross-entropy, the gradient is $\mathbf{p} - \mathbf{y}$.

## How powerful is an MLP?

- **Universal approximation theorem**: one hidden layer with enough units can approximate any continuous function on a bounded region arbitrarily well. It says nothing about how many units, or whether training finds them.
- **Depth beats width** in practice: some functions need exponentially many units with one layer but few with several. Deep networks reuse intermediate features (hierarchies), which matches the structure of real data.
- **Inductive biases** matter more than raw capacity: CNNs assume locality and translation equivariance; RNNs assume sequential order; transformers assume little but use attention to find relationships. Plain MLPs on images or text waste parameters; inside transformers, MLPs are the **feed-forward blocks** that hold much of the model's knowledge.

## In code

```python
import torch.nn as nn

model = nn.Sequential(
    nn.Linear(784, 256), nn.ReLU(),
    nn.Linear(256, 128), nn.ReLU(),
    nn.Linear(128, 10),           # logits; nn.CrossEntropyLoss applies log-softmax itself
)
```

## Interview angles

- "Why activations?" Without them, layers compose into one linear map.
- "ReLU vs sigmoid in hidden layers?" Sigmoid saturates (gradient ≤ 0.25, near 0 at the tails) causing vanishing gradients; ReLU passes gradient 1 for positive inputs and is cheap. Mention dead ReLUs and leaky/GELU fixes.
- "Count the parameters." Sum $d_{\text{in}}d_{\text{out}} + d_{\text{out}}$ per layer.
- "Why don't you put softmax in the model when training with cross-entropy?" Loss functions take logits and apply log-softmax stably.

--- revise
### Basics
? A dense layer computes? :: $\phi(Wx + b)$.
? Parameters of a dense layer? :: $d_{in} \times d_{out} + d_{out}$.
? Why are non-linear activations needed? :: Stacked linear layers collapse into one linear map.
? Output activation for regression / binary / multi-class / multi-label? :: Identity / sigmoid / softmax / sigmoids.

### Activations
? Sigmoid's problem in hidden layers? :: Saturates; derivative ≤ 0.25 → vanishing gradients; not zero-centred.
? ReLU advantages? :: Cheap, gradient 1 for positive inputs, sparse activations.
? Dead ReLU? :: Unit whose input is always negative: outputs 0, gets no gradient.
? GELU? :: $x\Phi(x)$: smooth ReLU-like; BERT, GPT.
? SwiGLU? :: Gated FFN, SiLU(xW) ⊙ xV: used in PaLM, Llama.

### Softmax and capacity
? Why subtract max logit in softmax? :: Avoid overflow; softmax is shift-invariant.
? Universal approximation theorem? :: One wide hidden layer can approximate any continuous function; says nothing about size or learnability.
? Why depth over width? :: Hierarchical feature reuse; some functions need exponentially many units if shallow.

--- notes
## Neuron / layer
a = φ(wᵀx + b). Layer: φ(Wx + b). Params: in·out + out.
MLP 784→256→128→10 = 235,146 params.
No φ → W₂W₁x: one linear map. ReLU nets = piecewise linear, pieces grow with depth.
## Activations
Sigmoid: (0,1), σ' ≤ 0.25, saturates. Tanh: zero-centred, saturates.
ReLU: cheap, sparse, dead units. Leaky: αx for x<0. GELU xΦ(x) (BERT/GPT). SiLU xσ(x). SwiGLU gated (Llama, PaLM).
Hidden: ReLU/GELU/SiLU. Output: identity / sigmoid / softmax.
## Softmax
e^{zₖ}/Σe^{z}; subtract max; temperature T; with CE gradient p − y.
## Capacity
Universal approximation (existence only). Depth > width (hierarchy).
Inductive bias: CNN locality, RNN order, transformer attention. FFN blocks in transformers.
Losses take logits (no softmax in model for CE).

--- doubts
Q: If ReLU is just max(0, x), how can a network of them represent curves?
A: Each ReLU bends a line at one point. Adding many bent lines with different slopes and break points gives a piecewise-linear function with many pieces, which can follow any smooth curve as closely as you like, the same way many short straight segments can trace a circle.

Q: What exactly happens to a dead ReLU, and is it a big deal?
A: If a unit's weighted input becomes negative for every training example (often after a large gradient step), it outputs 0 everywhere, its gradient is 0, and it never recovers. A few dead units waste capacity; many indicate a too-high learning rate or bad initialisation. Leaky ReLU, GELU, careful initialisation and lower learning rates reduce it.

Q: Why do LLMs use GELU or SwiGLU instead of plain ReLU?
A: Empirically they train to lower loss for the same compute. Smoothness gives non-zero gradients for small negative inputs, and gating (SwiGLU) lets the network multiply two learned signals, adding expressiveness. The gains are a few percent in loss, which matters at large scale.

Q: Is an MLP the same as a "deep neural network"?
A: An MLP is one kind: dense layers only. "Deep neural network" covers any multi-layer architecture, including CNNs, RNNs and transformers, which all contain MLP-like pieces.

--- exercises
[estimate] A transformer layer's feed-forward block uses SwiGLU with model width 4096 and hidden width 11,008 (as in Llama 2 7B). How many parameters does it have, and how does that compare with a standard 4× ReLU FFN?
A: SwiGLU uses three matrices: two of $4096 \times 11008$ and one of $11008 \times 4096$, so $3 \times 45.1\text{M} \approx 135$M. A standard FFN with hidden 16,384 has $2 \times 4096 \times 16384 \approx 134$M. The hidden width is set to about $\tfrac{2}{3} \times 4d$ precisely so the parameter count matches.

[design] Write a NumPy forward pass for a 2-layer MLP classifier (ReLU hidden layer, softmax output) and its cross-entropy loss for a batch.
A: `H = np.maximum(0, X @ W1 + b1)`; `Z = H @ W2 + b2`; `Z -= Z.max(1, keepdims=True)`; `P = np.exp(Z); P /= P.sum(1, keepdims=True)`; `loss = -np.log(P[np.arange(n), y] + 1e-12).mean()`. Shapes: X (n, d), W1 (d, h), W2 (h, k). The backward pass is on the backpropagation page.

[break] A network with ten hidden layers uses sigmoid activations everywhere and its early layers barely change during training. Why, and what would you change?
A: Each sigmoid multiplies the backward signal by at most 0.25 (often much less when saturated), so after ten layers the gradient reaching the first layer is about $0.25^{10} \approx 10^{-6}$ of the original. Use ReLU/GELU, proper initialisation (He), normalisation layers and residual connections.

--- pitfalls
- Stacking linear layers without activations
- Sigmoid or tanh in deep hidden stacks
- Applying softmax in the model and again inside the loss
- Softmax for multi-label outputs
- Assuming universal approximation means any MLP will learn anything

--- quiz
Q: Two linear layers with no activation between them are equivalent to?
- A deeper network
- *A single linear layer
- A ReLU network
- A logistic regression with more capacity
W: W₂(W₁x + b₁) + b₂ is one affine map.

Q: What's the maximum value of the sigmoid's derivative?
- 1
- 0.5
- *0.25
- 0.1
W: σ(1 − σ) peaks at 0.5 × 0.5.

Q: How many parameters does Linear(512, 256) have?
- 131,072
- *131,328
- 768
- 256
W: 512 × 256 + 256 biases.

Q: Which activation is used in the feed-forward blocks of Llama-style LLMs?
- Sigmoid
- Tanh
- *SwiGLU
- Step function
W: A gated SiLU unit with three matrices.

--- sources
- book :: Deep Learning (chapter 6, deep feedforward networks) :: Goodfellow, Bengio, Courville :: https://www.deeplearningbook.org/contents/mlp.html
- paper :: Gaussian Error Linear Units (GELUs) :: Hendrycks, Gimpel (2016) :: https://arxiv.org/abs/1606.08415
- paper :: GLU Variants Improve Transformer :: Noam Shazeer, Google (2020) :: https://arxiv.org/abs/2002.05202
- book :: Dive into Deep Learning: Multilayer Perceptrons :: Zhang et al. :: https://d2l.ai/chapter_multilayer-perceptrons/index.html

=== backpropagation
blurb: Backpropagation derived for a two-layer network and then in general: the computational graph, forward and backward passes, local gradients and upstream gradients, the matrix-calculus shapes, why it costs only about twice a forward pass, and the vanishing and exploding gradient problems.
signals: "Derive backprop for a 2-layer MLP" | "Implement the backward pass in NumPy" (ML coding) | "Why do gradients vanish?" | "What does loss.backward() actually do?"
widgets: backprop-steps
prereq: mlp-activations, calculus-gradients

--- lesson
:::words
- **Computational graph**: the network drawn as a chain of simple operations (multiply, add, ReLU), each a node.
- **Forward pass**: computing outputs and the loss from inputs, storing intermediate values.
- **Backward pass**: computing the gradient of the loss with respect to every value, from the loss back to the inputs.
- **Local gradient**: a node's own derivative (output with respect to input).
- **Upstream gradient**: the gradient of the loss with respect to a node's output, arriving from later in the graph.
- **Automatic differentiation (autodiff)**: software that builds the graph and runs the backward pass for you.
- **Vanishing / exploding gradients**: gradients that shrink toward 0 or blow up as they travel back through many layers.
:::

## The problem in plain words

A network has millions of weights. To improve it we need, for every weight, the answer to "if I nudge this up slightly, does the loss go up or down, and by how much?" Computing that separately per weight would be hopelessly slow. **Backpropagation** gets all of them in one backward sweep, by reusing the work: each layer passes back "how much the loss cares about my output", and each node only needs its own small derivative to pass the message on. It's the chain rule, organised cleverly.

:::eli5
A factory assembly line made a faulty toy. The inspector at the end tells the last worker how wrong it was. That worker figures out how much of the fault came from their own step and how much from what they received, and passes a note back to the previous worker. Every worker learns their share of the blame in one pass down the line.
:::

## A single node: local × upstream

For a node $y = f(x)$, given the upstream gradient $\partial L/\partial y$, the chain rule gives

$$\frac{\partial L}{\partial x} = \frac{\partial L}{\partial y} \cdot \frac{\partial y}{\partial x}$$

So each node needs only its **local gradient**. Common patterns:

- **Add** ($y = a + b$): passes the upstream gradient unchanged to both inputs ("gradient distributor").
- **Multiply** ($y = ab$): $\partial L/\partial a = \partial L/\partial y \cdot b$: each input gets the upstream gradient times the *other* input ("gradient switcher").
- **Max / ReLU**: passes the gradient to the winning input only ("gradient router").
- **Branching**: if a value is used twice, **add** the gradients from both uses.

Step through a tiny graph below: forward values flow right, gradients flow left, each node multiplying by its local derivative:

[[widget:backprop-steps]]

## Two-layer network, derived

Batch $X$ ($n \times d$), labels $Y$ one-hot ($n \times k$):

**Forward**

$$Z_1 = XW_1 + \mathbf{b}_1,\quad H = \text{ReLU}(Z_1),\quad Z_2 = HW_2 + \mathbf{b}_2,\quad P = \text{softmax}(Z_2),\quad L = -\frac{1}{n}\sum \log P_{i, y_i}$$

**Backward** (each line is local × upstream; shapes match the forward quantities):

$$\begin{aligned}
dZ_2 &= \tfrac{1}{n}(P - Y) & (n \times k)\\
dW_2 &= H^\top dZ_2, \quad d\mathbf{b}_2 = \textstyle\sum_{\text{rows}} dZ_2 & (h \times k),\ (k)\\
dH &= dZ_2\,W_2^\top & (n \times h)\\
dZ_1 &= dH \odot \mathbb{1}[Z_1 > 0] & (n \times h)\\
dW_1 &= X^\top dZ_1, \quad d\mathbf{b}_1 = \textstyle\sum_{\text{rows}} dZ_1 & (d \times h),\ (h)
\end{aligned}$$

A shape trick for linear layers: if $Y = XW$, then $dW = X^\top dY$ and $dX = dY\,W^\top$: transpose the *other* matrix and multiply on the side that makes the shapes work.

```python
import numpy as np

def forward_backward(X, y, W1, b1, W2, b2):
    n = len(X)
    Z1 = X @ W1 + b1; H = np.maximum(0, Z1)
    Z2 = H @ W2 + b2
    Z2 = Z2 - Z2.max(1, keepdims=True)
    P = np.exp(Z2); P /= P.sum(1, keepdims=True)
    loss = -np.log(P[np.arange(n), y] + 1e-12).mean()

    dZ2 = P.copy(); dZ2[np.arange(n), y] -= 1; dZ2 /= n
    dW2 = H.T @ dZ2; db2 = dZ2.sum(0)
    dH = dZ2 @ W2.T
    dZ1 = dH * (Z1 > 0)
    dW1 = X.T @ dZ1; db1 = dZ1.sum(0)
    return loss, (dW1, db1, dW2, db2)
```

Verify with a numerical gradient check (calculus page) before trusting it.

## Why it's efficient

**Reverse-mode** differentiation computes the gradient of **one** scalar (the loss) with respect to **all** inputs in roughly the cost of the forward pass again (in practice about 2× the forward FLOPs, since each matrix multiply in the forward pass needs two in the backward pass: one for $dW$ and one for $dX$). This is why a training step costs about 3× a forward pass, and why the "6 × parameters × tokens" training-compute rule has a 6 (2 forward + 4 backward per parameter per token). Forward-mode would need one pass per input weight.

The price is **memory**: the backward pass needs the forward activations ($H$, $Z_1$, masks), so they're stored for every layer. **Activation checkpointing** stores only some and recomputes the rest during the backward pass, trading about 30% more compute for much less memory (training-memory page).

## Vanishing and exploding gradients

The gradient reaching layer 1 of an $L$-layer network is a product of $L$ Jacobians. If their typical scale is below 1, the product shrinks exponentially (**vanishing**: early layers stop learning); above 1, it grows (**exploding**: loss becomes NaN). Causes: saturating activations (sigmoid's 0.25), poor initialisation, very deep or recurrent networks (the same matrix multiplied many times).

The fixes are the next pages' topics:

- ReLU-family activations (gradient 1 where active).
- **Initialisation** scaled to keep variance constant across layers (Xavier/He).
- **Normalisation** layers (batch norm, layer norm).
- **Residual connections** ($x + F(x)$): the add node passes gradient straight through, giving a highway to early layers.
- **Gradient clipping** for explosions.
- Gated recurrent units (LSTM/GRU) for sequences.

## Autodiff in practice

PyTorch records operations on tensors with `requires_grad=True` into a graph during the forward pass (a "tape"); `loss.backward()` walks it in reverse, calling each operation's backward function and accumulating `.grad` on leaf tensors. Gradients **accumulate**, so call `optimizer.zero_grad()` each step. JAX does the same functionally (`jax.grad`).

## Interview angles

- "Derive backprop for a 2-layer MLP with softmax." Write forward, then $dZ_2 = (P - Y)/n$, $dW_2 = H^\top dZ_2$, $dH = dZ_2W_2^\top$, ReLU mask, $dW_1 = X^\top dZ_1$. Check shapes aloud.
- "Why is backprop efficient?" Reverse mode: one backward pass for all parameters, ~2× forward cost, at the price of storing activations.
- "Gradients vanish. Fixes?" ReLU, He init, normalisation, residuals; clipping for explosions.

--- revise
### Mechanics
? Gradient at a node? :: Upstream gradient × local gradient.
? Add node backward? :: Passes the upstream gradient unchanged to both inputs.
? Multiply node backward? :: Each input gets upstream × the other input.
? A value used twice? :: Sum the gradients from both uses.
? For Y = XW: dW and dX? :: $dW = X^\top dY$; $dX = dY\,W^\top$.

### 2-layer net
? dZ₂ for softmax + mean cross-entropy? :: (P − Y)/n.
? ReLU backward? :: Multiply by the mask 1[Z > 0].
? db? :: Sum of dZ over the batch rows.

### Cost and problems
? Backward cost vs forward? :: About 2× the forward FLOPs; a training step ≈ 3× forward.
? Why "6 × params × tokens" for training compute? :: 2 FLOPs/param/token forward + 4 backward.
? What does backprop need to store? :: Forward activations for every layer.
? Activation checkpointing? :: Store fewer activations and recompute them in the backward pass.
? Why do gradients vanish/explode? :: Products of many Jacobians with scale below/above 1.
? Fixes? :: ReLU, Xavier/He init, normalisation, residual connections, gradient clipping, gating.

--- notes
## Node rules
∂L/∂x = ∂L/∂y · ∂y/∂x. Add: distribute. Multiply: swap (× other input). Max/ReLU: route. Branch: sum.
## 2-layer MLP
Fwd: Z1 = XW1 + b1; H = ReLU(Z1); Z2 = HW2 + b2; P = softmax; L = mean −log P_y.
Bwd: dZ2 = (P − Y)/n; dW2 = HᵀdZ2; db2 = Σ dZ2; dH = dZ2W2ᵀ; dZ1 = dH ⊙ [Z1>0]; dW1 = XᵀdZ1; db1 = Σ dZ1.
Linear rule: Y = XW → dW = XᵀdY, dX = dYWᵀ.
Gradient check before trusting.
## Efficiency
Reverse mode: all params in one pass, ≈ 2× forward. Step ≈ 3× forward. Training FLOPs ≈ 6·N·D.
Stores activations → memory. Checkpointing: recompute, ~30% more compute.
## Vanishing / exploding
Product of L Jacobians → exponential shrink/growth.
Fixes: ReLU, He/Xavier, BN/LN, residuals (add passes gradient), clipping, LSTM/GRU gates.
## Autodiff
PyTorch tape; backward() accumulates .grad → zero_grad() each step. JAX: jax.grad.

--- doubts
Q: Is backpropagation the same as gradient descent?
A: No. Backpropagation computes the gradients; gradient descent (or Adam) uses them to update the weights. You can backprop without updating (to inspect saliency), and update with gradients from other sources.

Q: Why does dZ₂ come out as simply P − Y?
A: Softmax's Jacobian and the logarithm in cross-entropy cancel: the derivative of $-\log p_y$ with respect to logit $z_k$ is $p_k - \mathbb{1}[k = y]$. That's why frameworks fuse "softmax + cross-entropy" into one operation: it's simpler and numerically stable.

Q: Why do residual connections fix vanishing gradients?
A: In $y = x + F(x)$, the gradient is $\partial L/\partial x = \partial L/\partial y\,(I + \partial F/\partial x)$. The identity term gives a path where the gradient passes through unchanged, so even if $\partial F/\partial x$ is small, early layers still get signal. Stacked residual blocks create many short paths through the network.

Q: Does the brain use backpropagation?
A: Probably not in this exact form (it would need symmetric backward connections and separate phases). It's an open research question; it doesn't matter for using it in engineering.

--- exercises
[design] Extend the 2-layer backward pass to include L2 weight decay λ and say what changes.
A: The loss gains $\frac{\lambda}{2}(\|W_1\|^2 + \|W_2\|^2)$, so add $\lambda W_1$ to $dW_1$ and $\lambda W_2$ to $dW_2$ after computing them; biases are usually not decayed. Everything else is unchanged. (With AdamW, apply decay in the update instead.)

[estimate] A model has 1 billion parameters and is trained on 20 billion tokens. Roughly how many FLOPs does training take, and how long on 64 GPUs at 300 TFLOP/s each with 40% utilisation?
A: $6 \times 10^9 \times 2\times10^{10} = 1.2\times10^{20}$ FLOPs. Effective throughput $64 \times 300\times10^{12} \times 0.4 \approx 7.7\times10^{15}$ FLOP/s. Time $\approx 1.56\times10^4$ s ≈ 4.3 hours.

[break] A teammate's hand-written backward pass gives a training loss that decreases at first and then rises. Their gradient check passes for $W_2$ but fails for $W_1$ with relative error 0.5. Where would you look?
A: Between $dH$ and $dW_1$: the ReLU mask (using $H > 0$ is equivalent; using $X > 0$ or forgetting it is wrong), the transpose in $dH = dZ_2 W_2^\top$, or $dW_1 = X^\top dZ_1$ shapes. A relative error of 0.5 suggests a missing factor or wrong mask, not numerical noise.

--- pitfalls
- Forgetting to sum gradients for values used in several places
- Forgetting optimizer.zero_grad(), so gradients accumulate across steps
- Mismatched transposes in dW and dX
- Trusting a hand-written backward pass without a gradient check
- Ignoring activation memory when sizing training

--- quiz
Q: For y = a × b with upstream gradient g, what is ∂L/∂a?
- g
- g × a
- *g × b
- a × b
W: Multiplication swaps: each input gets the upstream gradient times the other input.

Q: For Y = XW, the gradient with respect to W is?
- dY Xᵀ
- *Xᵀ dY
- W dY
- dY Wᵀ
W: Shapes: X is n×d, dY is n×k, so XᵀdY is d×k like W.

Q: Roughly how does the cost of the backward pass compare with the forward pass?
- The same
- *About twice
- About ten times
- Half
W: Each forward matmul needs two in the backward pass.

Q: Which of these does NOT help vanishing gradients?
- Residual connections
- He initialisation
- *Switching ReLU to sigmoid
- Layer normalisation
W: Sigmoid saturates and makes it worse.

--- sources
- paper :: Learning representations by back-propagating errors :: Rumelhart, Hinton, Williams (Nature 1986) :: https://www.nature.com/articles/323533a0
- course :: CS231n: Backpropagation, Intuitions :: Stanford :: https://cs231n.github.io/optimization-2/
- article :: Calculus on Computational Graphs: Backpropagation :: Christopher Olah :: https://colah.github.io/posts/2015-08-Backprop/
- course :: Neural Networks: Zero to Hero (micrograd) :: Andrej Karpathy :: https://karpathy.ai/zero-to-hero.html

=== optimisers
blurb: Gradient descent variants that train real networks: stochastic and mini-batch SGD, momentum and Nesterov, AdaGrad, RMSProp, Adam and AdamW with their update rules and bias correction, learning-rate warmup and schedules, batch size effects, and how to choose.
signals: "Explain Adam" | "Why warm up the learning rate?" | "SGD or Adam?" | "Doubling the batch size: what happens to the learning rate?"
widgets: gradient-descent, lr-schedules
prereq: backpropagation

--- lesson
:::words
- **Optimiser**: the rule that turns gradients into weight updates.
- **Stochastic gradient descent (SGD)**: updating with the gradient from a small random batch instead of the whole dataset.
- **Mini-batch**: the batch of examples used for one update; its size is the **batch size**.
- **Epoch**: one pass over the whole training set.
- **Momentum**: keeping a running average of past gradients so updates keep moving in consistent directions.
- **Adaptive learning rate**: a different effective step size per parameter, based on its gradient history.
- **Learning-rate schedule**: how the learning rate changes during training (warmup, decay).
:::

## The problem in plain words

Gradients tell you which way is downhill, but real loss surfaces are huge, noisy and badly shaped: steep in some directions, flat in others, full of ravines and plateaus. The optimiser decides how big a step to take, in which direction, using what memory of past steps. A good one trains in hours what a bad one can't train at all. Interviewers expect you to write Adam's update rule and explain each piece.

:::eli5
Skiing down a foggy mountain. Plain gradient descent: look at the slope under your skis each moment. Momentum: you're heavy, so you keep rolling through small bumps and don't zig-zag. Adam: you also adjust how big each step is for each direction, taking small steps where the ground keeps changing and bigger ones where it's consistently gentle.
:::

## SGD and mini-batches

Full-batch gradient descent uses all $N$ examples per step: accurate but slow. **SGD** uses a mini-batch $B$ (32–4096 examples, or millions of tokens for LLMs):

$$\mathbf{w} \leftarrow \mathbf{w} - \eta\,\hat{\mathbf{g}}, \qquad \hat{\mathbf{g}} = \frac{1}{|B|}\sum_{i \in B}\nabla L_i$$

$\hat{\mathbf{g}}$ is an unbiased but noisy estimate of the true gradient; its noise shrinks as $1/\sqrt{|B|}$. The noise is partly helpful: it shakes the optimiser out of sharp minima and saddle points.

**Batch size and learning rate.** Larger batches give cleaner gradients and better hardware utilisation. Up to a "critical batch size", you can scale the learning rate **linearly** with the batch (Goyal et al. trained ImageNet in an hour with batch 8,192) with warmup; beyond it, returns diminish. For Adam a square-root scaling is often used.

## Momentum

$$\mathbf{v} \leftarrow \beta\mathbf{v} + \hat{\mathbf{g}}, \qquad \mathbf{w} \leftarrow \mathbf{w} - \eta\mathbf{v}, \qquad \beta \approx 0.9$$

Momentum averages recent gradients: oscillating components (across a ravine) cancel, consistent components (along it) add up, giving an effective speed-up of up to $1/(1 - \beta) = 10\times$ along consistent directions. **Nesterov** momentum evaluates the gradient at the look-ahead point $\mathbf{w} - \eta\beta\mathbf{v}$, which corrects earlier. Compare plain SGD, momentum and Adam on a narrow valley:

[[widget:gradient-descent]]

## Adaptive methods

- **AdaGrad**: divide each parameter's step by the square root of the sum of all its past squared gradients. Great for sparse features (rare words get bigger steps), but the sum only grows, so learning eventually stops.
- **RMSProp**: use an exponential moving average of squared gradients instead, so the step size adapts without dying.
- **Adam** (adaptive moment estimation): momentum + RMSProp + bias correction:

$$\begin{aligned}
\mathbf{m}_t &= \beta_1\mathbf{m}_{t-1} + (1 - \beta_1)\mathbf{g}_t & \text{(mean of gradients)}\\
\mathbf{v}_t &= \beta_2\mathbf{v}_{t-1} + (1 - \beta_2)\mathbf{g}_t^2 & \text{(mean of squared gradients)}\\
\hat{\mathbf{m}}_t &= \mathbf{m}_t/(1 - \beta_1^t),\quad \hat{\mathbf{v}}_t = \mathbf{v}_t/(1 - \beta_2^t) & \text{(bias correction)}\\
\mathbf{w}_t &= \mathbf{w}_{t-1} - \eta\,\hat{\mathbf{m}}_t/(\sqrt{\hat{\mathbf{v}}_t} + \epsilon)
\end{aligned}$$

Defaults: $\beta_1 = 0.9$, $\beta_2 = 0.999$ (LLMs often 0.95), $\epsilon = 10^{-8}$. **Bias correction** exists because $\mathbf{m}$ and $\mathbf{v}$ start at zero, so early averages are biased toward zero; dividing by $1 - \beta^t$ fixes it (at $t = 1$, $\hat{\mathbf{m}}_1 = \mathbf{g}_1$ exactly). The ratio $\hat m/\sqrt{\hat v}$ is roughly ±1 for a consistent gradient, so Adam's step size is about $\eta$ per parameter regardless of the gradient's scale: that's why it's robust to badly scaled problems.

- **AdamW**: Adam with decoupled weight decay (regularisation page). The default for transformers.
- Newer: **Lion** (sign of a momentum mix; less memory), **Adafactor** (factorised second moments; less memory, used for T5), **Shampoo / SOAP / Muon** (approximate second-order preconditioning; gaining ground in LLM training).

**Memory**: Adam keeps two extra numbers per parameter ($\mathbf{m}$, $\mathbf{v}$), usually in float32: 8 bytes/parameter on top of weights and gradients. For a 7B model that's 56 GB just for optimiser state (training-memory page).

## Learning-rate schedules

The learning rate is the most important hyperparameter. Common shapes:

- **Warmup**: start near 0 and rise linearly for the first 1–5% of steps. Adam's early second-moment estimates are noisy and the network's activations are badly scaled at initialisation, so big early steps can diverge; warmup prevents it. Essential for transformers.
- **Cosine decay**: after warmup, follow half a cosine down to ~10% of the peak. The LLM default.
- **Step decay**: multiply by 0.1 at fixed epochs (classic ResNet recipe).
- **Linear decay**, **inverse square root** (original transformer), **warmup-stable-decay** (constant then a short decay at the end; lets you extend training).
- **One-cycle**: up then down within one run.
- **Reduce on plateau**: cut when validation stops improving.

Decaying the rate late in training lets the optimiser settle into a minimum it was bouncing around. See the shapes and how each affects the loss:

[[widget:lr-schedules]]

Finding the peak: a **learning-rate range test** (increase exponentially over a few hundred steps and pick a value somewhat below where loss starts rising), or a sweep on a log scale at small scale.

## SGD or Adam?

- **Adam/AdamW**: default for transformers, NLP, recommendation models with embeddings, GANs; fast and robust with little tuning.
- **SGD + momentum**: still competitive or better for CNNs on vision with a tuned schedule; sometimes generalises slightly better; uses less memory.
- **Sparse embeddings** (recommenders): Adagrad or sparse-aware Adam variants; row-wise optimisers to save memory.

## Gradient clipping

Rescale the gradient when its global norm exceeds a threshold (commonly 1.0): $\mathbf{g} \leftarrow \mathbf{g}\cdot\min(1, c/\|\mathbf{g}\|)$. Prevents occasional huge gradients (from rare batches, RNNs, or loss spikes in LLM training) from wrecking the weights.

## Interview angles

- "Write Adam's update." m, v, bias correction, update; explain each.
- "Why warmup?" Noisy early second-moment estimates and unstable early activations; large initial steps diverge.
- "Double the batch size?" Roughly double the learning rate (linear scaling) with warmup, up to the critical batch size; or keep steps fixed and train on more data.
- "Training loss spiked to NaN." Lower the peak LR, longer warmup, gradient clipping, check for bad data and fp16 overflow.

--- revise
### SGD
? Mini-batch gradient noise scaling? :: Standard deviation shrinks as 1/√batch size.
? Linear scaling rule? :: Multiply the learning rate by k when multiplying batch size by k (with warmup, up to the critical batch size).
? Momentum update? :: v ← βv + g; w ← w − ηv (β ≈ 0.9).
? Why momentum helps in ravines? :: Oscillations cancel, consistent directions accumulate (up to 1/(1−β) speed-up).

### Adaptive
? AdaGrad's flaw? :: Accumulated squared gradients only grow, so steps shrink to zero.
? RMSProp fix? :: Exponential moving average of squared gradients.
? Adam's two moments? :: m: EMA of gradients; v: EMA of squared gradients.
? Why bias correction in Adam? :: m and v start at 0; dividing by 1 − βᵗ removes the early bias toward zero.
? Adam update? :: $w \leftarrow w - \eta\hat m/(\sqrt{\hat v} + \epsilon)$.
? Adam defaults? :: β₁ 0.9, β₂ 0.999 (0.95 in LLMs), ε 1e-8.
? Adam's extra memory? :: Two values per parameter (8 bytes in fp32).

### Schedules and choices
? Why warm up? :: Early second-moment estimates and activations are unstable; big early steps diverge.
? LLM default schedule? :: Linear warmup then cosine decay to ~10% of peak.
? SGD vs Adam? :: Adam for transformers/NLP/recsys; SGD + momentum competitive for CNN vision.
? Gradient clipping? :: Scale g by min(1, c/‖g‖) to cap the global norm.

--- notes
## SGD
ĝ from mini-batch; noise ∝ 1/√B; noise helps escape sharp minima/saddles.
Linear LR scaling with batch (+ warmup) up to critical batch size; √ scaling for Adam.
Momentum: v = βv + g; w −= ηv; β 0.9; speed-up ≤ 1/(1−β). Nesterov: gradient at look-ahead.
## Adaptive
AdaGrad: ÷√Σg² (sparse-friendly, stalls). RMSProp: EMA of g².
Adam: m = β₁m + (1−β₁)g; v = β₂v + (1−β₂)g²; m̂ = m/(1−β₁ᵗ); v̂ = v/(1−β₂ᵗ); w −= η m̂/(√v̂ + ε).
Defaults 0.9 / 0.999 (0.95 LLM) / 1e-8. Step ≈ η per param, scale-invariant.
AdamW = decoupled decay (default for transformers). Lion, Adafactor (low memory), Shampoo/SOAP/Muon.
Memory: +8 bytes/param fp32 (7B → 56 GB).
## Schedules
Warmup 1–5% steps. Cosine to ~10% (LLM default). Step decay (ResNet). Inverse √ (orig transformer). WSD. One-cycle. Plateau.
LR range test or log-scale sweep.
## Choice
Adam(W): transformers, NLP, recsys, GANs. SGD+momentum: CNN vision. Adagrad for sparse embeddings.
## Clipping
g × min(1, c/‖g‖), c ≈ 1.0. Fixes spikes, RNNs, LLM loss spikes.

--- doubts
Q: Why does Adam sometimes generalise worse than SGD?
A: It's debated. One explanation: adaptive methods can converge to sharper minima, or rescale directions in ways that fit training noise. For vision CNNs, well-tuned SGD often edges out Adam; for transformers, AdamW is clearly better and the gap doesn't appear. With proper weight decay (AdamW) and schedules, the difference is small in most practice.

Q: What does ε do in Adam? Can I ignore it?
A: It prevents division by zero when $\hat v$ is tiny. It also caps the step for parameters with near-zero gradient history. In mixed-precision training a too-small ε can cause instability; some LLM recipes raise it to 1e-6 or tune it.

Q: Why do LLMs use β₂ = 0.95 instead of 0.999?
A: A shorter memory for squared gradients lets Adam react faster when gradient magnitudes change suddenly, which reduces loss spikes in large-scale training. 0.999 averages over ~1,000 steps and can be too slow to notice a burst of large gradients.

Q: Is a bigger batch always better if I have the hardware?
A: Up to the critical batch size, bigger batches give nearly proportional speed-ups in wall-clock time. Beyond it, you need more total examples to reach the same loss (the extra gradient precision is wasted), so it's less compute-efficient. Very large batches may also generalise slightly worse without careful tuning.

--- exercises
[estimate] With β₁ = 0.9, what is the bias-correction factor at step 1 and step 10, and what would m be without correction at step 1 if g₁ = 2?
A: $1/(1 - 0.9^1) = 10$; at step 10, $1/(1 - 0.9^{10}) = 1/0.651 \approx 1.54$. Without correction $m_1 = 0.1 \times 2 = 0.2$, ten times too small; corrected $\hat m_1 = 2$.

[design] Implement Adam for a dict of NumPy parameters, given gradients each step.
A: Keep `m[k]`, `v[k]` zeros like each param and a step counter `t`. Each step: `t += 1`; for each key: `m[k] = b1*m[k] + (1-b1)*g[k]`; `v[k] = b2*v[k] + (1-b2)*g[k]**2`; `mh = m[k]/(1-b1**t)`; `vh = v[k]/(1-b2**t)`; `p[k] -= lr*mh/(np.sqrt(vh)+eps)`; for AdamW also `p[k] -= lr*wd*p[k]` (skip biases and norms). Test on a quadratic bowl: it should converge; compare with `torch.optim.AdamW` on the same gradients.

[break] A transformer trains fine for 2,000 steps, then the loss shoots up to NaN. Name four likely causes and fixes.
A: Learning rate too high after warmup ends (lower the peak, lengthen warmup); no gradient clipping (clip at norm 1.0); fp16 overflow in attention or loss (use bf16 or loss scaling, compute softmax in fp32); a corrupted or extreme batch (log and skip batches with huge loss, inspect data). Also check Adam ε and β₂ (0.95).

--- pitfalls
- Using a large learning rate without warmup for transformers
- Changing the batch size without adjusting the learning rate
- L2 regularisation inside Adam instead of AdamW
- No gradient clipping in large or recurrent models
- Forgetting the optimiser state's memory cost

--- quiz
Q: What does Adam's bias correction fix?
- Overfitting
- *The early underestimate of m and v, which start at zero
- Large gradients
- Weight decay
W: Dividing by 1 − βᵗ rescales early moving averages.

Q: Batch size goes from 256 to 1024. Under the linear scaling rule, the learning rate should?
- Stay the same
- Halve
- *Increase 4×
- Increase 2×
W: Scale proportionally, with warmup.

Q: Why does AdaGrad stop learning eventually?
- Momentum decays
- *Its accumulated squared gradients only grow, shrinking the step to zero
- It has no learning rate
- Bias correction fails
W: RMSProp's moving average fixes this.

Q: What's the usual LLM learning-rate schedule?
- Constant
- Step decay every epoch
- *Linear warmup then cosine decay
- Exponential growth
W: Warmup for stability, cosine to settle.

--- sources
- paper :: Adam: A Method for Stochastic Optimization :: Kingma, Ba (2015) :: https://arxiv.org/abs/1412.6980
- paper :: Accurate, Large Minibatch SGD: Training ImageNet in 1 Hour :: Goyal et al., Facebook (2017) :: https://arxiv.org/abs/1706.02677
- article :: An overview of gradient descent optimization algorithms :: Sebastian Ruder :: https://www.ruder.io/optimizing-gradient-descent/
- paper :: An Empirical Model of Large-Batch Training :: McCandlish et al., OpenAI (2018) :: https://arxiv.org/abs/1812.06162

=== init-normalisation
blurb: Keeping signals healthy through deep networks: Xavier and He initialisation derived from variance, batch normalisation (train vs inference behaviour), layer norm and RMSNorm, pre-norm vs post-norm transformers, and residual connections.
signals: "Why can't I initialise weights to zero?" | "BatchNorm vs LayerNorm?" | "Why does BatchNorm behave differently at inference?" | "Pre-norm or post-norm?"
widgets: activation-stats
prereq: backpropagation

--- lesson
:::words
- **Initialisation**: the random starting values of the weights.
- **Variance**: how spread out numbers are; we want activations' spread to stay roughly constant from layer to layer.
- **Fan-in / fan-out**: the number of inputs to / outputs from a layer.
- **Batch normalisation (BN)**: normalising each feature using the mean and variance computed over the batch.
- **Layer normalisation (LN)**: normalising each example across its own features.
- **RMSNorm**: layer norm without subtracting the mean, only dividing by the root-mean-square.
- **Residual (skip) connection**: adding a block's input to its output, $y = x + F(x)$.
:::

## The problem in plain words

A deep network passes signals through dozens of layers forward and gradients back through them. If each layer slightly enlarges the signal, after 50 layers it explodes; if each slightly shrinks it, it vanishes. Three inventions keep deep networks trainable: **careful initialisation** (start with the right scale), **normalisation** (re-scale as you go), and **residual connections** (give signals a shortcut). Every modern architecture uses all three.

:::eli5
Whispering a message down a line of 50 people: if each person speaks a bit louder, the end is a scream; a bit quieter and it's silence. Initialisation tells everyone to start at the right volume, normalisation is a volume knob each person resets, and residual connections let the original message also travel down a side corridor.
:::

## Why not zero, and why not just "small random"?

- **All zeros** (or any identical values): every neuron in a layer computes the same thing and gets the same gradient, so they stay identical forever (**symmetry**). Random initialisation breaks symmetry. (Biases can start at zero.)
- **Too small**: activations shrink layer by layer and gradients vanish. **Too large**: activations explode, or saturate tanh/sigmoid.

## Variance-preserving initialisation

For $y = \sum_{i=1}^{n_{\text{in}}} w_i x_i$ with independent zero-mean weights and inputs, $\text{Var}(y) = n_{\text{in}}\,\text{Var}(w)\,\text{Var}(x)$. To keep $\text{Var}(y) = \text{Var}(x)$, choose $\text{Var}(w) = 1/n_{\text{in}}$.

- **Xavier / Glorot** (tanh, sigmoid, linear): $\text{Var}(w) = 2/(n_{\text{in}} + n_{\text{out}})$, balancing the forward and backward passes.
- **He / Kaiming** (ReLU): ReLU zeroes half its inputs, halving the variance, so double it: $\text{Var}(w) = 2/n_{\text{in}}$.
- Transformers often use small normal init (std 0.02) and scale the output projection of each residual block by $1/\sqrt{2L}$ (GPT-2) so the sum of $L$ residual additions doesn't grow with depth.

Watch the spread of activations across 20 layers with different initialisations and normalisation:

[[widget:activation-stats]]

## Batch normalisation

For each feature (channel), over the mini-batch:

$$\hat{x} = \frac{x - \mu_B}{\sqrt{\sigma_B^2 + \epsilon}}, \qquad y = \gamma\hat{x} + \beta$$

with learnable scale $\gamma$ and shift $\beta$ (so the network can undo the normalisation if useful).

- **Effects**: allows much higher learning rates, makes training less sensitive to initialisation, mild regularisation from batch noise. Why it works is debated (originally "reducing internal covariate shift"; later work argues it smooths the loss landscape).
- **Train vs inference**: at training time it uses the current batch's statistics; at inference there may be a single example, so it uses **running averages** of mean and variance collected during training. Forgetting `model.eval()` in PyTorch makes inference depend on the batch: a classic bug.
- **Weaknesses**: needs reasonably large batches (statistics are noisy for batch size 2), awkward for variable-length sequences and recurrent nets, couples examples in a batch, behaves differently in training and serving, complicates distributed training (sync BN).

Used mainly in **CNNs**.

## Layer normalisation and RMSNorm

**LayerNorm** normalises each example across its features: the mean and variance are computed over the hidden dimension of one token, so it's independent of batch size and identical in training and inference. The standard in **transformers** and RNNs.

**RMSNorm** drops the mean subtraction: $y = \gamma \cdot x / \sqrt{\frac{1}{d}\sum x_i^2 + \epsilon}$. Cheaper, works as well; used in Llama, Gemma, T5 and most modern LLMs.

Other variants: **GroupNorm** (normalise groups of channels; good for small-batch vision), **InstanceNorm** (style transfer).

## Residual connections

ResNet's $y = x + F(x)$ lets each block learn a **correction** to its input instead of a whole new representation, and gives gradients an identity path backward (backpropagation page). It made 100+ layer networks trainable and is in every transformer: each attention and feed-forward block is wrapped in a residual connection. The stream of $x$ values passing through all layers is called the **residual stream**.

## Pre-norm vs post-norm transformers

- **Post-norm** (original transformer): $x \leftarrow \text{LN}(x + F(x))$. Normalisation sits on the residual path, which can make deep models unstable without careful warmup.
- **Pre-norm** (GPT-2 onward): $x \leftarrow x + F(\text{LN}(x))$. The residual path is a clean identity; trains stably at depth with less warmup. Most LLMs use pre-norm (with a final norm before the output layer). Some add extra norms (QK-norm on queries and keys) for stability at very large scale.

## Interview angles

- "Why He init for ReLU?" ReLU halves the variance, so use $2/n_{\text{in}}$ to keep it constant.
- "BatchNorm vs LayerNorm?" Across the batch per feature vs across features per example; BN for CNNs with big batches, LN/RMSNorm for transformers and sequences; BN has train/inference differences.
- "My model behaves differently at inference." Forgot `eval()` (BN running stats, dropout).
- "Why pre-norm?" Identity residual path, stable deep training.

--- revise
### Initialisation
? Why not zero initialisation? :: All neurons in a layer stay identical (symmetry is never broken).
? Variance of a weighted sum? :: n_in · Var(w) · Var(x).
? Xavier variance? :: 2/(n_in + n_out) (tanh, linear).
? He variance and why? :: 2/n_in: ReLU zeroes half the inputs, halving variance.
? GPT-2 residual scaling? :: Output projections scaled by 1/√(2L) so residual sums don't grow with depth.

### Normalisation
? BatchNorm formula? :: (x − μ_B)/√(σ_B² + ε), then γx̂ + β.
? BN at inference? :: Uses running averages of mean and variance from training.
? BN weaknesses? :: Small batches, sequences, train/inference mismatch, cross-example coupling.
? LayerNorm normalises over? :: Each example's features (per token).
? RMSNorm? :: Divide by root-mean-square only, no mean subtraction; Llama, Gemma.
? Where is BN vs LN used? :: BN in CNNs; LN/RMSNorm in transformers and RNNs.

### Residuals and placement
? Residual connection? :: y = x + F(x): learns corrections, identity gradient path.
? Pre-norm vs post-norm? :: Pre: x + F(LN(x)) (stable, modern LLMs). Post: LN(x + F(x)) (original transformer).

--- notes
## Init
Zero/identical → symmetry. Too small → vanish; too large → explode/saturate.
Var(y) = n_in Var(w) Var(x).
Xavier 2/(n_in+n_out) (tanh/linear). He 2/n_in (ReLU). Biases 0.
Transformers: N(0, 0.02); residual output proj × 1/√(2L).
## BatchNorm
Per feature over batch: (x − μ_B)/√(σ²+ε) → γx̂ + β.
Higher LR, init-robust, mild regularisation.
Inference: running mean/var → model.eval()!
Weak with tiny batches, sequences, distributed (sync BN). CNNs.
## LayerNorm / RMSNorm
Per example over features; batch-independent; same train/test. Transformers, RNNs.
RMSNorm: x/RMS(x)·γ, no mean; Llama, Gemma, T5. GroupNorm for small-batch vision.
## Residuals
y = x + F(x): corrections + gradient highway; residual stream.
## Placement
Post-norm LN(x + F(x)) (2017). Pre-norm x + F(LN(x)) (GPT-2+, stable). Final norm. QK-norm at scale.

--- doubts
Q: If BatchNorm is so helpful, why don't transformers use it?
A: Transformers process variable-length sequences with padding, often with small per-device batches, and at inference generate one token at a time. Batch statistics are awkward and noisy there. LayerNorm/RMSNorm normalise each token independently, so they behave the same in training and generation.

Q: What are γ and β for, if we just normalised?
A: Normalising forces each feature to mean 0 and variance 1, which might not be what the next layer wants (a sigmoid would only use its linear middle). Learnable γ and β let the network choose the best scale and offset, including undoing the normalisation entirely.

Q: Does good initialisation still matter if I use normalisation?
A: Less, but yes. Normalisation corrects scale at each norm layer, but residual branches, the very first steps and the output layer still depend on init. Bad init can still cause early instability or slow starts, especially in deep transformers.

Q: Why do residual connections help even when gradients aren't vanishing?
A: They make the optimisation easier: a block only needs to learn a small correction near the identity, and the loss landscape becomes smoother. Networks with residuals also behave like ensembles of many shallower paths.

--- exercises
[estimate] A ReLU network has layers of width 512. If you initialise weights with variance 1/512 (Xavier-style) instead of He's 2/512, what happens to the activation variance after 20 layers?
A: Each layer roughly halves the variance (ReLU zeroes half, and the init only preserves it for linear units): $0.5^{20} \approx 10^{-6}$. Activations (and gradients) vanish. With He init the variance stays roughly constant.

[break] A CNN gets 92% validation accuracy during training, but in production, where requests arrive one image at a time, accuracy drops to 60%. What's the likely bug?
A: Batch normalisation running in training mode at inference: with batch size 1, each image is normalised by its own statistics, destroying information. The serving code didn't call `model.eval()` (or exported the model in training mode). Fix the mode so running averages are used.

[choose] You're training a 48-layer transformer and the loss spikes early, even with warmup. Post-norm or pre-norm, and what else?
A: Switch to pre-norm (identity residual path), add a final norm, use residual-branch scaling at init (1/√(2L)), RMSNorm, gradient clipping, and consider QK-norm in attention. Lower the peak learning rate if spikes persist.

--- pitfalls
- Initialising all weights to the same value
- Xavier init with ReLU in deep networks
- Forgetting model.eval() so BatchNorm uses batch statistics at inference
- BatchNorm with tiny per-device batches without sync or GroupNorm
- Post-norm in very deep transformers without careful warmup

--- quiz
Q: He initialisation uses which weight variance?
- 1/n_in
- *2/n_in
- 2/(n_in + n_out)
- 0.02
W: Doubling compensates for ReLU zeroing half the inputs.

Q: BatchNorm at inference uses?
- The current batch's statistics
- *Running averages of mean and variance from training
- No normalisation
- Layer statistics
W: That's why model.eval() matters.

Q: Which normalisation do Llama-style LLMs use?
- BatchNorm
- InstanceNorm
- *RMSNorm
- GroupNorm
W: RMSNorm divides by the root-mean-square without centring.

Q: In a pre-norm transformer block, where is the normalisation?
- After the residual addition
- *On the input to the attention/FFN sub-block, leaving the residual path as identity
- Only at the output
- Nowhere
W: x + F(LN(x)).

--- sources
- paper :: Understanding the difficulty of training deep feedforward neural networks :: Glorot, Bengio (AISTATS 2010) :: https://proceedings.mlr.press/v9/glorot10a.html
- paper :: Delving Deep into Rectifiers (He initialisation) :: He et al. (ICCV 2015) :: https://arxiv.org/abs/1502.01852
- paper :: Batch Normalization: Accelerating Deep Network Training :: Ioffe, Szegedy, Google (2015) :: https://arxiv.org/abs/1502.03167
- paper :: On Layer Normalization in the Transformer Architecture :: Xiong et al. (ICML 2020) :: https://arxiv.org/abs/2002.04745

=== training-debugging
blurb: A practical playbook for getting a neural network to train: start small and overfit one batch, read loss curves, diagnose the common failures (NaNs, plateaus, overfitting, data bugs), regularise deep networks, tune hyperparameters, and make runs reproducible.
signals: "Your training loss isn't going down: what do you do?" | "Loss is NaN" | "Validation loss rises while training loss falls" | Debugging questions in ML-coding and domain rounds
widgets: loss-doctor
prereq: optimisers, init-normalisation, regularisation

--- lesson
:::words
- **Loss curve**: training and validation loss plotted over steps or epochs.
- **Sanity check**: a quick test that should pass if the pipeline is correct, like overfitting a tiny batch.
- **Plateau**: a stretch where the loss stops improving.
- **Divergence**: loss shooting up (often to NaN).
- **Ablation**: removing one component to measure its effect.
- **Hyperparameter search**: trying settings (learning rate, batch size, depth) to find good ones.
- **Seed**: the starting number for random generators; fixing it makes runs repeatable.
:::

## The problem in plain words

Neural network bugs rarely crash; they just train badly, and the loss curve is often the only clue. A wrong label mapping, a missing `zero_grad()`, a learning rate ten times too high or a data loader returning the same batch can all produce "it trains, kind of". Experienced engineers follow a fixed playbook that starts tiny and adds complexity only once each step works. Interviewers ask "your loss isn't decreasing, what do you do?" to see whether you have that playbook.

:::eli5
A new recipe tastes wrong. Don't change ten ingredients at once. Taste each ingredient alone, cook a tiny portion first, then scale up. Debugging a network is the same: verify each piece in miniature before trusting the whole.
:::

## The playbook (after Karpathy's "recipe")

1. **Look at the data.** Plot examples with their labels; check label distribution, duplicates, corrupted files, augmentation output. Most bugs are data bugs.
2. **Set up evaluation and baselines first**: a trivial baseline (predict the majority class / mean), a simple model (logistic regression), human performance if known.
3. **Check the initial loss.** For $K$ balanced classes with softmax, the loss at initialisation should be about $\ln K$ (2.30 for 10 classes). If it's much higher, the output layer's scale or the labels are wrong. Initialise the final bias to the base rate for imbalanced problems.
4. **Overfit one batch.** Train on a single batch of, say, 8 examples: the loss must go to almost zero. If it can't, there's a bug (wrong labels, broken backward pass, learning rate, frozen layers).
5. **Increase data, then the model.** Train on the full set with a small model, then scale up. Change one thing at a time.
6. **Regularise** once training loss is low and validation lags (more data, augmentation, dropout, weight decay, early stopping).
7. **Tune** hyperparameters, learning rate first.
8. **Squeeze**: ensembles, longer training, test-time augmentation.

## Reading loss curves

Pick a symptom below to see the curve and its likely causes:

[[widget:loss-doctor]]

| Symptom | Likely causes | What to try |
|---|---|---|
| Loss doesn't move from the start | Learning rate far too low, gradients not flowing (detached tensors, frozen params, `requires_grad` off), wrong loss/label pairing | Check gradients' norms per layer; overfit one batch |
| Loss goes down then shoots up / NaN | Learning rate too high, no warmup, no clipping, fp16 overflow, `log(0)`, division by zero, bad batch | Lower LR, warmup, clip at 1.0, bf16, stable losses, find the batch |
| Plateau early, high loss | Dead ReLUs, saturation, bad init, under-capacity | He init, normalisation, bigger model, LR schedule |
| Training ↓, validation ↓ then ↑ | Overfitting | Early stopping, regularisation, more data |
| Validation better than training | Dropout/augmentation on in training only (normal), or leakage | Check splits; usually fine |
| Very noisy loss | Small batch, high LR, data shuffling issues | Bigger batch, lower LR, check shuffling |
| Validation stuck at chance while training improves | Train/val preprocessing differ, label mismatch, leakage in training only | Compare pipelines; inspect predictions |
| Sudden loss spikes in long LLM runs | Rare bad batches, optimiser instability | Clipping, lower LR, β₂ 0.95, skip and roll back |

## Classic PyTorch bugs

- Forgetting `optimizer.zero_grad()` (gradients accumulate).
- Forgetting `model.train()` / `model.eval()` (dropout and batch norm behave wrongly).
- Applying softmax before `nn.CrossEntropyLoss` (it expects logits).
- Wrong tensor shapes silently broadcasting (e.g. predictions $(n, 1)$ vs targets $(n)$ in MSE becomes an $n \times n$ matrix).
- Labels and inputs shuffled separately; data augmentation applied to validation data.
- `view` instead of `permute` when changing layouts (scrambles data).
- Not moving all tensors to the same device or dtype.

## Monitoring during training

Track: training and validation loss, the task metric, learning rate, **gradient norm** (global and per layer), weight norms, activation statistics, fraction of dead ReLUs, throughput (examples/s), GPU memory and utilisation. Log examples of predictions periodically. Tools: TensorBoard, Weights & Biases.

## Regularising deep networks

Dropout, weight decay (AdamW), data augmentation (mixup, CutMix, RandAugment for images; SpecAugment for audio), label smoothing, stochastic depth (randomly skip residual blocks), early stopping, and the strongest: more and better data. Pretrained models with fine-tuning are themselves a powerful regulariser.

## Hyperparameter tuning

- **Order of importance**: learning rate (and schedule) ≫ batch size, weight decay, warmup ≫ architecture details.
- **Random search** beats grid search when only a few hyperparameters matter (Bergstra and Bengio): it tries more distinct values of each.
- **Bayesian optimisation** (Vizier at Google, Optuna) and **successive halving / Hyperband** (stop bad runs early) save compute.
- Search on a log scale for learning rate and weight decay.
- Tune at small scale and transfer: scaling rules (and methods such as μP) let hyperparameters found on small models carry to large ones.

## Reproducibility

Fix seeds (Python, NumPy, framework, data loader workers), log the exact code version, data version, configuration and environment; save checkpoints with optimiser state. Note that GPU non-determinism (atomic adds, cuDNN algorithms) means bit-exact reproducibility needs deterministic settings at a speed cost. Report results over several seeds.

## Interview angles

- "Loss not decreasing." Data check → initial loss ≈ ln K → overfit one batch → gradient norms per layer → LR sweep → model/initialisation.
- "Loss went to NaN at step 3,000." LR/warmup, clipping, fp16/bf16, log(0), bad batch; reproduce with the same seed and batch.
- "Val loss rises." Overfitting: early stopping, regularisation, data.

--- revise
### Playbook
? First step of debugging training? :: Look at the data and labels.
? Expected initial loss for 10 balanced classes? :: ln 10 ≈ 2.30.
? Why overfit one batch? :: If the model can't drive a tiny batch's loss to ~0, there's a bug.
? Order of growth? :: Small data and model → full data → bigger model → regularise → tune.

### Symptoms
? Loss doesn't move at all? :: LR too low, gradients not flowing, wrong loss/labels.
? Loss falls then NaN? :: LR too high, no warmup/clipping, fp16 overflow, log(0), bad batch.
? Validation rises while training falls? :: Overfitting.
? Validation at chance, training improving? :: Pipeline mismatch or label bug.

### Bugs and tools
? Four classic PyTorch bugs? :: Missing zero_grad, missing train/eval, softmax before CrossEntropyLoss, silent broadcasting.
? Most important hyperparameter? :: Learning rate (and schedule).
? Random vs grid search? :: Random is better when few hyperparameters matter.
? Hyperband? :: Successive halving: stop poor runs early, give survivors more budget.
? What to monitor? :: Losses, metric, LR, gradient norms, activation stats, dead units, throughput, memory.

--- notes
## Recipe
Look at data → baselines + eval → check init loss (ln K) → overfit 1 batch → scale data → scale model → regularise → tune → squeeze.
Change one thing at a time.
## Symptoms
Flat: LR low, no gradient flow (detach, frozen, requires_grad), loss/label mismatch.
Spike/NaN: LR high, no warmup/clip, fp16, log(0), bad batch.
Early plateau: dead ReLU, saturation, bad init, small model.
Val ↑ train ↓: overfit. Val better than train: dropout/aug (OK) or leak.
Noisy: small batch, high LR, shuffling. Val at chance: pipeline/label mismatch.
LLM spikes: clip, lower LR, β₂ 0.95, skip batch + rollback.
## PyTorch bugs
zero_grad; train/eval; softmax + CE; (n,1) vs (n) broadcast; separate shuffles; aug on val; view vs permute; device/dtype.
## Monitor
Loss, metric, LR, grad norms (global/per layer), weight norms, activations, dead units, throughput, memory, sample predictions.
## Tuning
LR ≫ batch, decay, warmup ≫ architecture. Random > grid. Bayesian (Vizier, Optuna), Hyperband. Log scale. Small → transfer (μP).
## Reproduce
Seeds everywhere, code/data/config versions, checkpoints + optimiser state; GPU nondeterminism; several seeds.

--- doubts
Q: Why should I expect the initial loss to be ln K?
A: With small random weights, the logits are near zero, so softmax gives about $1/K$ to every class, and cross-entropy is $-\ln(1/K) = \ln K$. A much larger starting loss means the outputs are confidently wrong from the start (bad final-layer scale), which wastes early training.

Q: My training loss is lower than my validation loss. Is that always overfitting?
A: A gap is normal; the question is whether validation is getting worse while training improves, and how big the gap is compared with what regularisation could close. Some gap also comes from dropout and augmentation, which make training harder than evaluation.

Q: How do I find which batch caused a NaN?
A: Log the loss (and gradient norm) per step with the batch indices; when NaN appears, reload the checkpoint before it, replay that batch with anomaly detection on (`torch.autograd.set_detect_anomaly(True)`) to find the operation producing the NaN, and inspect the batch's data.

--- exercises
[break] A teammate's image classifier reaches 99% training accuracy within one epoch on a hard dataset, but validation accuracy is 10% (chance). Give three likely causes.
A: Labels leaked into inputs in training only (filename, a watermark, preprocessing difference); validation labels mapped to classes in a different order than training's; validation preprocessing differs (normalisation constants, channel order RGB vs BGR, missing resize). Inspect a few validation images with their labels and predictions, and run the training pipeline's transforms on validation data.

[design] Your new model's loss is flat at its initial value for 1,000 steps. Write the order of checks you'd run.
A: (1) Confirm loss starts near the expected value and labels are correct; (2) check `requires_grad` and that the optimiser holds the model's parameters (common when the model is re-created after the optimiser); (3) print gradient norms per layer after one backward pass: zeros mean a detached graph or dead units; (4) overfit one batch with a higher learning rate; (5) sweep the learning rate over 1e-5 to 1e-1; (6) check the loss function receives logits and integer labels as expected.

[choose] You have budget for 40 training runs to tune learning rate, weight decay, warmup and dropout. Grid or random search, and how do you use the budget?
A: Random search on log scales (or Bayesian optimisation) with successive halving: start 40 configs for a short budget, keep the top third, extend them, repeat. A 4-parameter grid with 40 runs gets only ~2.5 values per parameter; random search gives 40 distinct learning rates, the parameter that matters most.

--- pitfalls
- Scaling up before overfitting a single batch
- Changing many things at once between runs
- Not looking at the data and predictions
- Tuning anything before the learning rate
- Single-seed results reported as conclusions

--- quiz
Q: For a 100-class problem, what initial cross-entropy loss suggests a healthy setup?
- 0
- 1
- *About 4.6
- About 100
W: ln 100 ≈ 4.6.

Q: You can't overfit a batch of 8 examples. Most likely?
- Too much data
- *A bug in the model, loss, labels or optimiser setup
- Not enough regularisation
- The model is too big
W: Any reasonable model should memorise 8 examples.

Q: Which is a classic cause of NaN loss partway through training?
- Too much weight decay
- *A learning rate too high without warmup or clipping
- Too many epochs
- A small model
W: Large updates blow up activations or the loss.

Q: Why prefer random search over grid search?
- It's deterministic
- *With few important hyperparameters, it tries more distinct values of each
- It needs no budget
- It always finds the optimum
W: Bergstra and Bengio (2012).

--- sources
- article :: A Recipe for Training Neural Networks :: Andrej Karpathy :: https://karpathy.github.io/2019/04/25/recipe/
- article :: Deep Learning Tuning Playbook :: Google Research :: https://github.com/google-research/tuning_playbook
- paper :: Random Search for Hyper-Parameter Optimization :: Bergstra, Bengio (JMLR 2012) :: https://www.jmlr.org/papers/v13/bergstra12a.html
- paper :: Hyperband: A Novel Bandit-Based Approach to Hyperparameter Optimization :: Li et al. (JMLR 2018) :: https://arxiv.org/abs/1603.06560
