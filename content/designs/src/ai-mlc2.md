=== d-mlc-mlp-backprop
title: Two-layer MLP with backpropagation in NumPy
topic: ai-neural-nets
tier: 2
est: 45
prompt: Implement a two-layer neural network (linear → ReLU → linear → softmax cross-entropy) in NumPy with a manual forward and backward pass, and train it with SGD on a small dataset.
--- words
- **Forward pass**: computing the outputs and the loss from the inputs, layer by layer.
- **Backward pass (backpropagation)**: applying the chain rule from the loss back to every weight.
- **ReLU**: max(0, x); its gradient is 1 where x > 0 and 0 elsewhere.
- **Cache**: values saved during the forward pass that the backward pass needs.
- **He initialisation**: random weights scaled by sqrt(2 / fan_in), suited to ReLU.
--- flow
1. **0–5**: shapes, hidden size, loss, batch handling.
2. **5–15**: forward equations and the backward equations for each layer.
3. **15–35**: code forward, backward, update; training loop.
4. **35–45**: gradient check, debugging a loss that won't fall, follow-ups.
--- clarify
- X (B, D), integer labels (B,), C classes, hidden size H.
- Mean loss over the batch; plain SGD with a learning rate; optional L2.
--- approach
- Forward: z1 = X W1 + b1 (B, H); a1 = ReLU(z1); z2 = a1 W2 + b2 (B, C); loss = CE(softmax(z2), y).
- Backward: dz2 = (softmax(z2) − onehot(y)) / B; dW2 = a1ᵀ dz2; db2 = Σ dz2; da1 = dz2 W2ᵀ; dz1 = da1 ⊙ 1[z1 > 0]; dW1 = Xᵀ dz1; db1 = Σ dz1.
- Shapes check every step: a gradient always has the shape of the thing it's for.
--- code
```python
import numpy as np

class MLP:
    def __init__(self, D, H, C, seed=0):
        r = np.random.default_rng(seed)
        self.W1 = r.normal(0, np.sqrt(2 / D), (D, H)); self.b1 = np.zeros(H)
        self.W2 = r.normal(0, np.sqrt(2 / H), (H, C)); self.b2 = np.zeros(C)

    def forward(self, X, y):
        z1 = X @ self.W1 + self.b1
        a1 = np.maximum(z1, 0)
        z2 = a1 @ self.W2 + self.b2
        z2s = z2 - z2.max(1, keepdims=True)
        logp = z2s - np.log(np.exp(z2s).sum(1, keepdims=True))
        loss = -logp[np.arange(len(y)), y].mean()
        self.cache = (X, z1, a1, np.exp(logp), y)
        return loss

    def backward(self):
        X, z1, a1, p, y = self.cache
        B = len(y)
        dz2 = p.copy(); dz2[np.arange(B), y] -= 1; dz2 /= B
        g = {"W2": a1.T @ dz2, "b2": dz2.sum(0)}
        da1 = dz2 @ self.W2.T
        dz1 = da1 * (z1 > 0)
        g["W1"] = X.T @ dz1; g["b1"] = dz1.sum(0)
        return g

    def step(self, g, lr):
        for k, v in g.items():
            setattr(self, k, getattr(self, k) - lr * v)

def train(X, y, H=32, epochs=200, lr=0.5, batch=64, seed=0):
    C = int(y.max()) + 1
    net, r = MLP(X.shape[1], H, C, seed), np.random.default_rng(seed)
    for _ in range(epochs):
        idx = r.permutation(len(X))
        for s in range(0, len(X), batch):
            b = idx[s:s + batch]
            net.forward(X[b], y[b]); net.step(net.backward(), lr)
    return net
```
--- test
- Gradient check: for a few random entries of each parameter, compare (L(θ + ε) − L(θ − ε)) / 2ε with the analytic gradient; relative error < 1e-5 (use float64, avoid exact zeros of ReLU).
- Overfit a tiny batch (10 examples): loss → ~0, a standard sanity check.
- XOR data (label = sign(x0) xor sign(x1)): ~99% accuracy, where any linear model is stuck near 50%.
- Debugging a flat loss: learning rate, initialisation scale, dead ReLUs (check the share of z1 > 0), labels shuffled relative to inputs.
- Follow-ups: add momentum or Adam; L2 adds λW to dW; batch norm's backward; why we initialise with sqrt(2/fan_in).
--- steer
Q: Derive dz1.
A: da1 = dz2 W2ᵀ, then multiply elementwise by ReLU's derivative 1[z1 > 0].
Q: Your loss doesn't move.
A: Overfit a tiny batch, gradient check, learning rate sweep, check dead units and data shuffling.
Q: Why He initialisation?
A: Keeps activation variance stable through ReLU layers.
--- pitfalls
- Forgetting the 1/B so gradients scale with batch size
- Using the post-activation in the ReLU mask inconsistently
- Shape mismatches hidden by broadcasting (biases)
- No gradient check
--- level
- **L4**: forward and backward correct for this network.
- **L5**: derives each gradient with shapes, gradient check, tiny-batch overfit test, debugging strategy, initialisation reasoning.
--- prereqs
backpropagation
--- paths
- [deep] Derive the backward pass :: dz2 = p − onehot over B; chain to W2, a1, z1 (ReLU mask), W1.
- [deep] Verify it :: Gradient check with float64; tiny-batch overfit.
- [failure] Loss stays flat :: LR, init, dead ReLUs, shuffled labels.
- [variation] Add L2 or momentum :: + λW in gradients; velocity buffers.

=== d-mlc-adam
title: Implement the Adam optimiser
topic: ai-neural-nets
tier: 2
est: 35
prompt: Implement Adam (and AdamW) as an optimiser class that updates a list of NumPy parameters given their gradients, including bias correction. Explain each term.
--- words
- **Momentum (first moment)**: an exponential moving average of gradients, m.
- **Second moment**: a moving average of squared gradients, v, which scales each parameter's step.
- **Bias correction**: m and v start at zero, so early averages are too small; divide by (1 − βᵗ).
- **AdamW**: weight decay applied directly to the weights instead of through the gradient.
--- flow
1. **0–5**: interface (params, grads), hyperparameters, state per parameter.
2. **5–12**: update equations.
3. **12–25**: code.
4. **25–35**: tests on a simple function; Adam vs AdamW; learning-rate warm-up.
--- clarify
- params: list of arrays updated in place; grads: same shapes.
- Defaults lr = 1e-3, β1 = 0.9, β2 = 0.999, ε = 1e-8; optional weight decay.
--- approach
- m ← β1·m + (1 − β1)·g; v ← β2·v + (1 − β2)·g².
- m̂ = m / (1 − β1ᵗ), v̂ = v / (1 − β2ᵗ).
- θ ← θ − lr · m̂ / (sqrt(v̂) + ε).
- AdamW: θ ← θ − lr·wd·θ as a separate step (decoupled), not added to g (which Adam would rescale).
--- code
```python
import numpy as np

class AdamW:
    def __init__(self, params, lr=1e-3, betas=(0.9, 0.999), eps=1e-8, weight_decay=0.0):
        self.params, self.lr, self.eps, self.wd = params, lr, eps, weight_decay
        self.b1, self.b2 = betas
        self.m = [np.zeros_like(p) for p in params]
        self.v = [np.zeros_like(p) for p in params]
        self.t = 0

    def step(self, grads):
        self.t += 1
        c1, c2 = 1 - self.b1**self.t, 1 - self.b2**self.t
        for p, g, m, v in zip(self.params, grads, self.m, self.v):
            m *= self.b1; m += (1 - self.b1) * g
            v *= self.b2; v += (1 - self.b2) * g * g
            if self.wd:
                p -= self.lr * self.wd * p          # decoupled weight decay
            p -= self.lr * (m / c1) / (np.sqrt(v / c2) + self.eps)
```
--- test
- Minimise f(x, y) = (x − 3)² + 10(y + 1)² from (0, 0): converges near (3, −1) with lr = 0.1 in a few hundred steps.
- First step: with bias correction the step size is ≈ lr in every coordinate regardless of gradient scale (m̂/√v̂ = ±1).
- Compare against torch.optim.AdamW on the same gradients: identical to ~1e-7.
- Follow-ups: warm-up because early v̂ estimates are noisy; ε matters with tiny gradients; why Adam needs 2× extra memory per parameter (matters for LLM training memory).
--- steer
Q: Why bias correction?
A: m and v start at zero; early averages are biased towards zero, so early steps would be too small.
Q: Adam vs AdamW?
A: L2 in the gradient gets rescaled by 1/√v, so it isn't true weight decay; decoupled decay is.
Q: Memory cost?
A: Two extra arrays per parameter: 2× parameters in optimiser state (fp32), a big part of training memory.
--- pitfalls
- Missing bias correction
- Adding weight decay to the gradient and calling it AdamW
- Allocating new arrays every step instead of updating state in place
--- level
- **L4**: correct update with bias correction.
- **L5**: explains each term, decoupled weight decay, memory cost, warm-up, verification against a reference.
--- prereqs
optimisers
--- paths
- [deep] Each term :: Momentum, per-parameter scaling, bias correction.
- [deep] Adam vs AdamW :: Coupled L2 is rescaled; decoupled decay.
- [deep] Memory :: Two moment buffers per parameter; mixed precision implications.
- [variation] Learning-rate warm-up :: Noisy early second moments.

=== d-mlc-training-loop-bugs
title: Find the bugs in a PyTorch training loop
topic: ai-pytorch
tier: 2
est: 40
prompt: Here is a PyTorch training loop for an image classifier whose validation accuracy is stuck near chance. Find and fix every bug, then write the corrected loop with evaluation, checkpointing and mixed precision.
--- words
- **zero_grad**: clears gradients; PyTorch adds gradients up across backward calls otherwise.
- **model.train() / model.eval()**: switch dropout and batch norm between training and inference behaviour.
- **torch.no_grad()**: turns off gradient tracking during evaluation.
- **CrossEntropyLoss**: expects raw logits, not softmax probabilities.
- **AMP (automatic mixed precision)**: runs most maths in float16/bfloat16 for speed.
--- flow
1. **0–5**: read the buggy code aloud; ask about the data and expected behaviour.
2. **5–20**: find bugs one by one and explain each symptom.
3. **20–35**: write the corrected loop.
4. **35–40**: debugging process when no bug is visible.
--- clarify
The buggy loop shown by the interviewer:
```python
model = Net().cuda()
opt = torch.optim.SGD(model.parameters(), lr=0.1)
loss_fn = nn.CrossEntropyLoss()
for epoch in range(10):
    for x, y in train_loader:            # loader built with shuffle=False
        out = torch.softmax(model(x.cuda()), dim=1)
        loss = loss_fn(out, y.cuda())
        loss.backward()
        opt.step()
    acc = 0
    for x, y in val_loader:
        out = model(x.cuda())
        acc += (out.argmax(1) == y.cuda()).sum()
    print(acc / len(val_loader))
```
Ask: data sorted by class? Normalisation applied the same way to train and val? Model has dropout or batch norm?
--- approach
Bugs and their symptoms:
1. **No opt.zero_grad()**: gradients accumulate across steps; updates explode or oscillate.
2. **Softmax before CrossEntropyLoss**: the loss applies log-softmax itself; double softmax squashes gradients, so learning stalls.
3. **shuffle=False** on a class-sorted dataset: each epoch sees one class at a time; the model forgets.
4. **No model.train() / model.eval()**: dropout and batch norm behave wrongly during evaluation.
5. **No torch.no_grad()** in evaluation: wastes memory and can run out of memory.
6. **Accuracy divided by the number of batches**, not examples; and `acc` is a tensor on the GPU.
--- code
```python
import torch, torch.nn as nn

def run(model, train_ds, val_ds, epochs=10, lr=1e-3, device="cuda"):
    train_loader = torch.utils.data.DataLoader(train_ds, batch_size=128, shuffle=True, num_workers=4, pin_memory=True)
    val_loader = torch.utils.data.DataLoader(val_ds, batch_size=256)
    model.to(device)
    opt = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=0.01)
    sched = torch.optim.lr_scheduler.OneCycleLR(opt, max_lr=lr, total_steps=epochs * len(train_loader))
    loss_fn = nn.CrossEntropyLoss()                 # takes logits
    best = 0.0
    for epoch in range(epochs):
        model.train()
        for x, y in train_loader:
            x, y = x.to(device, non_blocking=True), y.to(device, non_blocking=True)
            opt.zero_grad(set_to_none=True)
            with torch.autocast(device_type="cuda", dtype=torch.bfloat16):
                loss = loss_fn(model(x), y)         # raw logits
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            opt.step(); sched.step()
        model.eval()
        correct = total = 0
        with torch.no_grad():
            for x, y in val_loader:
                x, y = x.to(device), y.to(device)
                correct += (model(x).argmax(1) == y).sum().item()
                total += y.numel()
        acc = correct / total
        if acc > best:
            best = acc
            torch.save({"model": model.state_dict(), "opt": opt.state_dict(), "epoch": epoch}, "best.pt")
        print(f"epoch {epoch}: val acc {acc:.3f}")
    return best
```
--- test
- Sanity checks: overfit one batch first (loss → 0); check initial loss ≈ log(num_classes) (e.g. 2.30 for 10 classes); plot train vs val loss.
- Verify data: show a few images with labels after transforms; check label distribution per batch.
- With bfloat16 autocast no GradScaler is needed; with float16 use torch.cuda.amp.GradScaler.
- Follow-ups: data loader as the bottleneck (num_workers, pin_memory); reproducibility (seeds); resuming from the checkpoint including optimiser and scheduler state.
--- steer
Q: Why is softmax before CrossEntropyLoss wrong?
A: The loss already applies log-softmax; double softmax compresses outputs and gradients.
Q: Validation accuracy is fine but test is bad.
A: Leakage or a distribution shift; eval-mode issues; check preprocessing parity.
Q: Nothing is obviously wrong but it doesn't learn.
A: Overfit one batch, initial loss check, gradient norms per layer, learning-rate sweep, visualise inputs.
--- pitfalls
- Missing zero_grad
- Softmax before CrossEntropyLoss
- Evaluating in train mode or with gradients on
- Averaging accuracy over batches of different sizes
--- level
- **L4**: spots zero_grad and eval-mode bugs.
- **L5**: finds every bug with its symptom, writes a clean loop with AMP, clipping, scheduling and checkpointing, and has a systematic debugging process.
--- prereqs
training-debugging, training-loop
--- paths
- [deep] Each bug and its symptom :: zero_grad, double softmax, no shuffle, train/eval modes, no_grad, accuracy maths.
- [deep] Systematic debugging :: Overfit one batch, initial loss, gradient norms, LR sweep, look at inputs.
- [variation] Mixed precision :: bfloat16 autocast vs float16 with GradScaler.
- [variation] Resume from a checkpoint :: Model, optimiser, scheduler, epoch, RNG state.

=== d-mlc-iou-nms
title: IoU and non-maximum suppression
topic: ai-cnn
tier: 1
est: 35
prompt: Implement intersection-over-union for boxes and non-maximum suppression (NMS) in NumPy, vectorised, as used in object detection.
--- words
- **Bounding box**: (x1, y1, x2, y2), the corners of a rectangle around an object.
- **IoU**: area of overlap divided by area of union of two boxes.
- **NMS**: keep the highest-scoring box, remove boxes that overlap it above a threshold, repeat.
- **Class-aware NMS**: run NMS separately per class.
--- flow
1. **0–5**: box format, threshold, per class or not, empty input.
2. **5–12**: IoU formula; NMS greedy algorithm, O(n²) worst case.
3. **12–25**: code vectorised IoU of one box vs many; NMS loop.
4. **25–35**: tests, soft-NMS, batched class trick.
--- clarify
- Boxes (n, 4) as x1, y1, x2, y2 with x2 ≥ x1; scores (n,); IoU threshold, e.g. 0.5.
- Return indices of kept boxes in descending score order.
--- approach
- Intersection: width = max(0, min(x2a, x2b) − max(x1a, x1b)), same for height; union = areaA + areaB − intersection.
- NMS: sort by score; while boxes remain, keep the first, compute IoU with the rest, drop those above the threshold.
- Class-aware NMS in one pass: offset each class's boxes by class_id × (max coordinate + 1) so boxes of different classes never overlap.
--- code
```python
import numpy as np

def iou_one_to_many(box, boxes):
    x1 = np.maximum(box[0], boxes[:, 0]); y1 = np.maximum(box[1], boxes[:, 1])
    x2 = np.minimum(box[2], boxes[:, 2]); y2 = np.minimum(box[3], boxes[:, 3])
    inter = np.clip(x2 - x1, 0, None) * np.clip(y2 - y1, 0, None)
    area = lambda b: (b[..., 2] - b[..., 0]) * (b[..., 3] - b[..., 1])
    union = area(box) + area(boxes) - inter
    return inter / np.maximum(union, 1e-12)

def nms(boxes, scores, thresh=0.5):
    boxes = np.asarray(boxes, float); order = np.argsort(-np.asarray(scores))
    keep = []
    while order.size:
        i = order[0]; keep.append(int(i))
        if order.size == 1:
            break
        ious = iou_one_to_many(boxes[i], boxes[order[1:]])
        order = order[1:][ious <= thresh]
    return keep

def batched_nms(boxes, scores, classes, thresh=0.5):
    boxes = np.asarray(boxes, float)
    offset = (np.asarray(classes) * (boxes.max() + 1))[:, None]
    return nms(boxes + offset, scores, thresh)
```
--- test
- Identical boxes → IoU 1; disjoint → 0; one inside another → small/large area ratio.
- Two overlapping boxes (IoU 0.8) with scores 0.9 and 0.8 → keep only the first; with threshold 0.9 keep both.
- Empty input → [].
- Batched NMS: overlapping boxes of different classes are both kept.
- Follow-ups: soft-NMS (decay scores instead of removing, helps crowded scenes); GPU NMS in torchvision.ops; mAP evaluation uses IoU thresholds to match predictions to ground truth.
--- steer
Q: Two people standing close get merged into one box.
A: Threshold too low for crowded scenes; soft-NMS; per-class thresholds.
Q: Complexity?
A: O(n log n) sort plus up to O(n²) IoUs; vectorised per step.
Q: Multiple classes?
A: Per-class NMS or the coordinate offset trick.
--- pitfalls
- Negative intersection widths not clipped to 0
- Off-by-one pixel conventions mixed
- Running NMS across classes unintentionally
--- level
- **L4**: correct IoU and greedy NMS.
- **L5**: vectorised, class-aware batching trick, soft-NMS and crowded scenes, link to mAP.
--- prereqs
detection-segmentation
--- paths
- [deep] IoU edge cases :: Clipping, zero area, containment.
- [deep] Greedy NMS :: Sort, keep, suppress above threshold, vectorised.
- [variation] Multiple classes :: Coordinate offset trick.
- [variation] Crowded scenes :: Soft-NMS.

=== d-mlc-attention
title: Scaled dot-product and multi-head attention
topic: ai-transformers
tier: 2
est: 45
prompt: Implement scaled dot-product attention with an optional mask, then a multi-head self-attention module in PyTorch, without using nn.MultiheadAttention.
--- words
- **Query, key, value**: each token makes a query (what it's looking for), a key (what it offers) and a value (what it passes on).
- **Scaled dot product**: scores = QKᵀ / √d_k, so scores don't grow with dimension.
- **Mask**: blocks attention to some positions (padding, or future tokens in causal attention).
- **Multi-head**: several attention operations in parallel on smaller slices, then concatenated.
--- flow
1. **0–5**: shapes (B, T, D), heads, mask format, dropout.
2. **5–15**: equations: softmax(QKᵀ/√d_k + mask) V; head split and merge.
3. **15–35**: code both pieces.
4. **35–45**: tests (shapes, masking, compare with PyTorch), complexity and efficient attention.
--- clarify
- Input x (B, T, D); h heads with D divisible by h; d_k = D / h.
- Mask: boolean (B or 1, 1, T, T), True = may attend.
- Causal option for decoder self-attention.
--- approach
- Q, K, V = x W_q, x W_k, x W_v (one fused linear of size 3D is common).
- Reshape (B, T, D) → (B, h, T, d_k).
- scores = Q Kᵀ / √d_k → (B, h, T, T); masked positions set to −inf before softmax; weights = softmax(scores); out = weights V.
- Merge heads back to (B, T, D), final linear W_o.
- Cost O(T²·D) time and O(T²) memory per head: the reason for efficient attention for long T.
--- code
```python
import math, torch, torch.nn as nn

def attention(q, k, v, mask=None):
    # q, k, v: (..., T, d)
    scores = q @ k.transpose(-2, -1) / math.sqrt(q.size(-1))
    if mask is not None:
        scores = scores.masked_fill(~mask, float("-inf"))
    w = torch.softmax(scores, dim=-1)
    return w @ v, w

class MultiHeadSelfAttention(nn.Module):
    def __init__(self, d_model, n_heads, causal=False):
        super().__init__()
        assert d_model % n_heads == 0
        self.h, self.dk, self.causal = n_heads, d_model // n_heads, causal
        self.qkv = nn.Linear(d_model, 3 * d_model)
        self.out = nn.Linear(d_model, d_model)

    def forward(self, x, pad_mask=None):
        # pad_mask: (B, T) True for real tokens
        B, T, D = x.shape
        q, k, v = self.qkv(x).split(D, dim=-1)
        q, k, v = (t.view(B, T, self.h, self.dk).transpose(1, 2) for t in (q, k, v))
        mask = None
        if self.causal:
            mask = torch.ones(T, T, dtype=torch.bool, device=x.device).tril()[None, None]
        if pad_mask is not None:
            pm = pad_mask[:, None, None, :]                    # mask keys
            mask = pm if mask is None else mask & pm
        y, _ = attention(q, k, v, mask)
        y = y.transpose(1, 2).contiguous().view(B, T, D)
        return self.out(y)
```
--- test
- Shapes: (2, 5, 16) in → (2, 5, 16) out with 4 heads.
- Causal: changing token 4 doesn't change outputs at positions 0–3.
- Padding: outputs at real positions don't change when padded positions' values change.
- Compare with torch.nn.functional.scaled_dot_product_attention for the same q, k, v and mask: equal within 1e-6.
- Follow-ups: a row that is fully masked gives NaN (all −inf): guard with a finite large negative or ensure each query sees at least itself; FlashAttention computes the same thing in tiles without storing the T × T matrix; grouped-query attention shares K and V across heads.
--- steer
Q: Why divide by √d_k?
A: Dot products of random vectors grow with dimension; large scores saturate softmax and kill gradients.
Q: How does the causal mask work?
A: Lower-triangular boolean; future positions get −inf before softmax.
Q: Sequence length 100K?
A: O(T²) memory; FlashAttention tiles, sparse or linear attention, GQA for KV memory.
--- pitfalls
- Masking after softmax instead of before
- Reshaping heads with view without transposing correctly
- Fully masked rows producing NaN
- Forgetting the output projection
--- level
- **L4**: correct single-head attention with shapes.
- **L5**: multi-head reshapes, causal and padding masks combined, numerical edge cases, verification against PyTorch, complexity and efficient variants.
--- prereqs
self-attention, transformer-block
--- paths
- [deep] Scaling and softmax :: √d_k, saturation, −inf masking before softmax.
- [deep] Head reshaping :: (B, T, D) → (B, h, T, d_k) and back.
- [deep] Masks :: Causal tril combined with key padding.
  - A row is fully masked :: NaN from all −inf; guard.
- [variation] Long sequences :: FlashAttention tiling, GQA, sparse attention.

=== d-mlc-kv-cache
title: Causal decoding with a KV cache
topic: ai-inference
tier: 3
est: 45
prompt: Given a small decoder-only transformer, implement greedy generation in PyTorch twice: first by recomputing the whole sequence every step, then with a KV cache. Show they produce the same tokens and explain the speed and memory difference.
--- words
- **Autoregressive decoding**: generating one token at a time, each conditioned on all previous ones.
- **KV cache**: keys and values of past tokens are stored, so each new step computes attention only for the new token.
- **Prefill**: the first pass over the whole prompt, which fills the cache.
- **Decode step**: one new token through the model using the cache.
--- flow
1. **0–5**: model interface, max length, batch of one or many, positional encoding.
2. **5–15**: why recomputation is O(T²) per step overall O(T³)-ish; what changes with a cache.
3. **15–35**: code an attention layer that accepts and returns a cache; generation loops.
4. **35–45**: equality test, memory maths, batching and paged caches.
--- clarify
- Model: embeddings, L blocks of causal self-attention + MLP, final linear to vocab; learned positions.
- Greedy decoding, batch size 1 for clarity; max_new_tokens.
--- approach
- Without cache: each step runs the model on all t tokens → attention costs O(t²) per step.
- With cache: prefill the prompt once, storing K, V per layer with shape (B, h, t, d_k); each step feeds only the new token: its Q attends over cached K, V plus its own; append its K, V. Cost per step O(t) for attention and O(1) tokens through the MLPs.
- No causal mask needed in decode steps: the single new query may see all cached positions.
- Memory: 2 × layers × heads × d_k × bytes per token.
--- code
```python
import math, torch, torch.nn as nn, torch.nn.functional as F

class CachedAttention(nn.Module):
    def __init__(self, d, h):
        super().__init__(); self.h, self.dk = h, d // h
        self.qkv, self.o = nn.Linear(d, 3 * d), nn.Linear(d, d)

    def forward(self, x, cache=None):
        B, T, D = x.shape
        q, k, v = (t.view(B, T, self.h, self.dk).transpose(1, 2) for t in self.qkv(x).split(D, -1))
        if cache is not None:                      # append to past keys/values
            k = torch.cat([cache[0], k], dim=2); v = torch.cat([cache[1], v], dim=2)
        past = k.size(2) - T
        # query i (absolute position past+i) may see keys 0..past+i
        mask = torch.ones(T, k.size(2), dtype=torch.bool, device=x.device).tril(diagonal=past)
        y = F.scaled_dot_product_attention(q, k, v, attn_mask=mask)
        return self.o(y.transpose(1, 2).reshape(B, T, D)), (k, v)

class Block(nn.Module):
    def __init__(self, d, h):
        super().__init__(); self.ln1, self.ln2 = nn.LayerNorm(d), nn.LayerNorm(d)
        self.attn = CachedAttention(d, h)
        self.mlp = nn.Sequential(nn.Linear(d, 4 * d), nn.GELU(), nn.Linear(4 * d, d))

    def forward(self, x, cache=None):
        a, cache = self.attn(self.ln1(x), cache)
        x = x + a
        return x + self.mlp(self.ln2(x)), cache

class TinyLM(nn.Module):
    def __init__(self, vocab, d=64, h=4, L=2, max_len=256):
        super().__init__()
        self.tok, self.pos = nn.Embedding(vocab, d), nn.Embedding(max_len, d)
        self.blocks = nn.ModuleList(Block(d, h) for _ in range(L))
        self.ln, self.head = nn.LayerNorm(d), nn.Linear(d, vocab)

    def forward(self, idx, caches=None, start=0):
        pos = torch.arange(start, start + idx.size(1), device=idx.device)
        x = self.tok(idx) + self.pos(pos)
        new = []
        for i, b in enumerate(self.blocks):
            x, c = b(x, None if caches is None else caches[i]); new.append(c)
        return self.head(self.ln(x)), new

@torch.no_grad()
def generate_naive(model, idx, n):
    for _ in range(n):
        logits, _ = model(idx)
        idx = torch.cat([idx, logits[:, -1].argmax(-1, keepdim=True)], 1)
    return idx

@torch.no_grad()
def generate_cached(model, idx, n):
    logits, caches = model(idx)                    # prefill
    out = idx
    for _ in range(n):
        nxt = logits[:, -1].argmax(-1, keepdim=True)
        out = torch.cat([out, nxt], 1)
        logits, caches = model(nxt, caches, start=out.size(1) - 1)   # one token
    return out
```
--- test
- `torch.manual_seed(0); m = TinyLM(100).eval(); p = torch.randint(0, 100, (1, 8))`: `generate_naive(m, p, 20)` equals `generate_cached(m, p, 20)` exactly.
- Logits at each step match within 1e-5.
- Timing: the cached version's time per step stays roughly flat as length grows; the naive one grows.
- Memory per token = 2 × L × D × bytes (all heads): for a 70B model with GQA (80 layers, 8 KV heads × 128) ≈ 330 KB/token in fp16.
- Follow-ups: batching sequences of different lengths needs per-sequence lengths and padding masks, or paged attention; grouped-query attention shrinks the cache; sliding-window caches; quantised KV cache.
--- steer
Q: Why don't decode steps need a causal mask?
A: The only query is the newest token, which may see every cached position.
Q: The cache uses too much memory for long chats.
A: GQA/MQA, KV quantisation, paging, sliding windows, evicting or summarising old context.
Q: How do you batch users with different prompt lengths?
A: Padding with masks, or continuous batching with paged KV per sequence.
--- pitfalls
- Wrong position ids in decode steps
- Mask that blocks cached positions
- Comparing outputs in train mode (dropout)
--- level
- **L4**: explains the cache idea and implements a loop with it.
- **L5**: correct cached attention with positions and masks, equality test, cost per step and memory maths, batching and paging trade-offs.
--- prereqs
self-attention, kv-cache
--- paths
- [deep] What the cache stores :: K and V per layer; append each step; no recomputation.
  - Position ids in decode :: start = current length − 1.
- [deep] Cost and memory :: Per-step O(t) attention; 2 × L × heads × d_k × bytes per token.
- [variation] Batched generation :: Padding masks or paged KV with continuous batching.
- [variation] Shrinking the cache :: GQA, quantisation, sliding windows.

=== d-mlc-bpe
title: Train a BPE tokenizer
topic: ai-tokenization
tier: 2
est: 40
prompt: Implement byte-pair encoding: train merges on a small text corpus, then encode and decode strings with the learned merges.
--- words
- **Token**: a piece of text the model sees as one symbol.
- **BPE (byte-pair encoding)**: start from characters (or bytes), repeatedly merge the most frequent adjacent pair into a new token.
- **Merge rule**: a learned pair (a, b) → ab, applied in the order learned.
- **Pre-tokenisation**: splitting text into words first, so merges don't cross word boundaries.
--- flow
1. **0–5**: bytes or characters, vocabulary size, whitespace handling, unknown characters.
2. **5–12**: algorithm and its cost; word-frequency trick.
3. **12–32**: code train, encode, decode.
4. **32–40**: tests and efficiency follow-ups.
--- clarify
- Train on a list of strings; target number of merges; start from bytes (so nothing is unknown).
- Pre-tokenise on whitespace, keeping the space attached to the following word (as GPT-2 style does).
--- approach
- Count words once: corpus → {word bytes tuple: frequency}. Pair counts come from words weighted by frequency, so the cost depends on distinct words, not corpus size.
- Repeat: find the most frequent pair; replace it in every word containing it; record the merge with a new id.
- Encode: split into words → bytes → apply merges by rank (lowest rank first) until none applies. Decode: map ids to bytes and join.
--- code
```python
import re
from collections import Counter

def pretokenize(text):
    return re.findall(r" ?\S+|\s+", text)

def train_bpe(texts, num_merges):
    words = Counter(tuple(w.encode("utf-8")) for t in texts for w in pretokenize(t))
    merges, vocab = {}, {i: bytes([i]) for i in range(256)}
    for new_id in range(256, 256 + num_merges):
        pairs = Counter()
        for w, f in words.items():
            for a, b in zip(w, w[1:]):
                pairs[a, b] += f
        if not pairs:
            break
        best = max(pairs, key=lambda p: (pairs[p], -p[0], -p[1]))   # deterministic ties
        merges[best] = new_id
        vocab[new_id] = vocab[best[0]] + vocab[best[1]]
        new_words = Counter()
        for w, f in words.items():
            out, i = [], 0
            while i < len(w):
                if i + 1 < len(w) and (w[i], w[i + 1]) == best:
                    out.append(new_id); i += 2
                else:
                    out.append(w[i]); i += 1
            new_words[tuple(out)] += f
        words = new_words
    return merges, vocab

def encode(text, merges):
    ids = []
    for w in pretokenize(text):
        toks = list(w.encode("utf-8"))
        while len(toks) > 1:
            pairs = [(merges.get((a, b), float("inf")), i) for i, (a, b) in enumerate(zip(toks, toks[1:]))]
            rank, i = min(pairs)
            if rank == float("inf"):
                break
            toks[i:i + 2] = [merges[toks[i], toks[i + 1]]]
        ids.extend(toks)
    return ids

def decode(ids, vocab):
    return b"".join(vocab[i] for i in ids).decode("utf-8", errors="replace")
```
--- test
- Round trip: decode(encode(s)) == s for training text and for unseen text with emoji (bytes guarantee no unknowns).
- With corpus "low lower lowest" × many, early merges include "lo" then "low".
- More merges → shorter encodings of the training text.
- Follow-ups: efficiency (update pair counts incrementally instead of recounting; a priority queue); special tokens; why numbers and non-English text cost more tokens; WordPiece picks merges by likelihood gain instead of frequency; SentencePiece treats the input as raw text including spaces.
--- steer
Q: Why bytes, not characters?
A: Every string is encodable; no unknown token; vocabulary starts at 256.
Q: Training is slow on a big corpus.
A: Count distinct words; incremental pair-count updates; priority queue.
Q: Why apply merges by rank during encoding?
A: To reproduce the training order exactly; greedy longest match gives different tokens.
--- pitfalls
- Merging across word boundaries
- Applying merges in the wrong order when encoding
- Recounting pairs over the raw corpus each iteration
--- level
- **L4**: correct training loop and encode.
- **L5**: word-frequency trick, rank-ordered encoding, byte-level round trip, incremental counting, trade-offs vs WordPiece and SentencePiece.
--- prereqs
bpe-wordpiece
--- paths
- [deep] Training cost :: Distinct words weighted by frequency; incremental counts.
- [deep] Encoding order :: Apply merges by rank, not longest match.
- [variation] Byte-level vs character-level :: No unknowns; multilingual cost.
- [variation] WordPiece :: Likelihood-gain merges, ## continuation prefix.

=== d-mlc-sampling
title: Top-k, top-p sampling and beam search
topic: ai-decoding
tier: 2
est: 40
prompt: Given a function that returns next-token logits for a sequence, implement temperature, top-k and top-p (nucleus) sampling, and beam search, in PyTorch.
--- words
- **Temperature**: divide logits by T before softmax; T < 1 sharpens, T > 1 flattens.
- **Top-k**: sample only among the k most likely tokens.
- **Top-p (nucleus)**: sample among the smallest set of tokens whose probabilities add up to p.
- **Beam search**: keep the B most likely partial sequences at every step.
- **Length penalty**: stops beam search favouring very short outputs.
--- flow
1. **0–5**: interface (logits_fn), batch or single, end-of-sequence token, reproducibility.
2. **5–12**: each method's maths; where they fit (open-ended vs translation).
3. **12–32**: code a filter function and a beam search.
4. **32–40**: tests, edge cases, repetition.
--- clarify
- `logits_fn(ids) -> (vocab,)` float tensor for the next token; eos_id; max_len.
- Sampling returns one sequence; beam search returns the best sequence by score.
--- approach
- Filtering: logits / T; for top-k, set everything below the k-th largest to −inf; for top-p, sort probabilities descending, cumulative sum, remove tokens after the cumulative passes p (always keep the first); sample with torch.multinomial.
- Beam search: each beam has (tokens, log-prob sum). For each beam, add the top B next tokens; keep the best B overall; finished beams (eos) move to a finished list; score = logprob / length^α.
--- code
```python
import torch

def filter_logits(logits, temperature=1.0, top_k=0, top_p=1.0):
    logits = logits / max(temperature, 1e-6)
    if top_k > 0:
        kth = torch.topk(logits, min(top_k, logits.numel())).values[-1]
        logits = logits.masked_fill(logits < kth, float("-inf"))
    if top_p < 1.0:
        sorted_logits, idx = torch.sort(logits, descending=True)
        cum = torch.softmax(sorted_logits, -1).cumsum(-1)
        remove = cum - torch.softmax(sorted_logits, -1) > top_p    # keep the token that crosses p
        sorted_logits[remove] = float("-inf")
        logits = torch.full_like(logits, float("-inf")).scatter(0, idx, sorted_logits)
    return logits

def sample(logits_fn, prompt, max_len, eos_id, gen=None, **kw):
    ids = list(prompt)
    while len(ids) < max_len:
        probs = torch.softmax(filter_logits(logits_fn(ids), **kw), -1)
        nxt = int(torch.multinomial(probs, 1, generator=gen))
        ids.append(nxt)
        if nxt == eos_id:
            break
    return ids

def beam_search(logits_fn, prompt, max_len, eos_id, beams=4, alpha=0.7):
    live = [(list(prompt), 0.0)]
    done = []
    while live and len(live[0][0]) < max_len:
        cand = []
        for ids, lp in live:
            logp = torch.log_softmax(logits_fn(ids), -1)
            top = torch.topk(logp, beams)
            cand += [(ids + [int(t)], lp + float(v)) for v, t in zip(top.values, top.indices)]
        cand.sort(key=lambda c: c[1], reverse=True)
        live = []
        for ids, lp in cand:
            (done if ids[-1] == eos_id else live).append((ids, lp))
            if len(live) == beams:
                break
        if len(done) >= beams:
            break
    done += live
    gen_len = lambda ids: max(1, len(ids) - len(prompt))
    return max(done, key=lambda c: c[1] / gen_len(c[0]) ** alpha)[0]
```
--- test
- top_k = 1 equals greedy decoding.
- top_p: with probabilities [0.5, 0.3, 0.2] and p = 0.7, tokens 0 and 1 remain (the one crossing p is kept); p tiny → only the top token.
- Temperature → 0 approaches greedy; a fixed torch.Generator seed makes sampling reproducible.
- Beam search with beams = 1 equals greedy; with a toy logits_fn whose best first token leads to a bad continuation, beam > 1 finds the better total.
- Follow-ups: repetition penalties and no-repeat n-grams; why beam search suits translation but makes open-ended text bland; min-p sampling; batching beams on GPU.
--- steer
Q: Why not always use beam search?
A: For open-ended text it finds high-probability but dull, repetitive outputs; sampling with top-p gives natural variety.
Q: Top-k or top-p?
A: Top-p adapts to how peaked the distribution is; top-k is fixed.
Q: Beam search prefers short outputs.
A: Length normalisation with α; minimum length.
--- pitfalls
- Removing the token that crosses p, which can leave nothing
- Sampling from logits with −inf everywhere
- Comparing beams with raw log-probability sums of different lengths
--- level
- **L4**: correct temperature and top-k sampling.
- **L5**: correct top-p boundary, beam search with finished beams and length penalty, reproducibility, when to use which.
--- prereqs
sampling-strategies
--- paths
- [deep] Top-p boundary :: Keep the token that crosses p; always at least one.
- [deep] Beam search :: Expand, prune to B, finished list, length penalty.
- [variation] Repetition :: Penalties and no-repeat n-grams.
- [deep] Choosing a method :: Translation vs open-ended generation.
