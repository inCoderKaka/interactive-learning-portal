/** Cheat-sheet notes: one fact per line, "## " groups. Shown collapsed under the Revise sheet. */
export const notes: Record<string, string> = {
  "big-o": `
## Notations
Big-O is an upper bound: f = O(g) if f(n) ≤ c·g(n) for all n ≥ n0.
Big-Ω is a lower bound; Big-Θ is both (tight). Interview "O" usually means Θ of the worst case.
Little-o and little-ω are strict: f = o(g) means f/g → 0.
Drop constants and lower-order terms: 3n² + 10n + 7 = Θ(n²).
## Growth ladder (slow to fast)
1 < log n < √n < n < n log n < n² < n³ < 2ⁿ < n! < nⁿ.
All logarithm bases are equivalent up to a constant (log₂ n = log₁₀ n / log₁₀ 2).
Any polynomial beats any polylog; any exponential beats any polynomial.
## Counting rules
Sequential blocks add; nested loops multiply.
A loop that halves or doubles its counter runs O(log n) times.
Inner loop j from i to n inside i from 0 to n: n(n+1)/2 = Θ(n²).
Harmonic loop: for i, for j += i → n/1 + n/2 + … = Θ(n log n).
Recursion: cost = number of calls × work per call (draw the tree).
Two-pointer and sliding-window loops are O(n) because each pointer only moves forward.
## Traps
Hidden costs: string concatenation in a loop, slicing, list.pop(0), "in" on a list, sorting inside a loop.
String keys cost O(length) to hash and compare.
Input size can be two variables: say O(n + m) or O(V + E), not O(n).
Numeric value vs input size: a loop to the number N is pseudo-polynomial (exponential in bits).
## Space and cases
Space counts auxiliary memory: extra arrays, hash maps and the recursion stack. Output is usually excluded (say so).
Best, worst, average: quicksort is O(n log n) average, O(n²) worst; hash lookups are expected O(1), worst O(n).
Expected (randomised algorithm, over coin flips) differs from average (over an input distribution).
Amortised is a guarantee over a sequence, not a probability.
## Interview use
State time and space for every solution, and name the dominant term and why.
Mention the brute force's cost first, then the improvement and what it trades.
## Extras
Output-sensitive bounds: O(… + k) for k reported items.
Multi-parameter inputs: keep every size (V + E, n·m, n + q log n).
O(n + m) = O(max(n, m)).
`,
  amortized: `
## Idea
Amortised cost = total cost of any sequence of m operations / m, as a worst-case guarantee.
Not an average over random inputs: no probability involved.
## Three methods
Aggregate: bound the total cost of n operations, divide by n.
Accounting (banker's): overcharge cheap operations, store credit on elements, spend it on expensive ones; credit never goes negative.
Potential: Φ(state) ≥ 0 and Φ(start) = 0; amortised cost = actual + ΔΦ.
## Dynamic array doubling
Copies on doubling: 1 + 2 + 4 + … + n < 2n, so n appends cost O(n) in total: O(1) amortised each.
Accounting view: charge 3 per append (1 to write, 2 saved to copy itself and one older element later).
Growing by a constant (+k) instead makes appends O(n) amortised: total Θ(n²/k).
Any constant growth factor > 1 works (Java 1.5×, C++ often 2×, Python ~1.125×); smaller factors waste less memory and copy more often.
Shrinking: halve when the array is 1/4 full (not 1/2) to avoid thrashing at the boundary.
## Other amortised arguments
Monotonic stack and deque: each element is pushed once and popped at most once, so O(n) total.
Two-pointer and sliding window: each pointer moves at most n steps.
Union-find with path compression and union by rank: O(α(n)) amortised per operation.
Binary counter increment: O(1) amortised (bit i flips every 2^i increments).
Two-stack queue: each element is moved from the in-stack to the out-stack once, so O(1) amortised.
Splay trees and Fibonacci heaps are amortised structures.
## Amortised vs real time
A single operation can still be slow (a resize is O(n)): bad for latency-critical paths.
Fixes: reserve capacity up front, or incremental resizing (move a few elements per operation, as Redis does when rehashing).
## Extras
Potential method proves union-find, splay trees, Fibonacci heaps.
Counter: bit i flips every 2^i increments.
BST iterator: amortised O(1) next().
Reserve capacity when size is known.
`,
  recurrences: `
## From code to recurrence
T(n) = a·T(n/b) + f(n): a subproblems, each of size n/b, plus f(n) work to split and combine.
Merge sort T(n) = 2T(n/2) + n; binary search T(n) = T(n/2) + 1; naive Fibonacci T(n) = T(n−1) + T(n−2) + 1.
## Recursion-tree method
Draw levels: level i has aⁱ nodes, each doing f(n/bⁱ) work; there are log_b n levels.
Sum the levels: equal per level → multiply by depth; geometrically decreasing → root dominates; increasing → leaves dominate.
## Master theorem (compare f(n) with n^(log_b a))
Case 1: f grows slower (polynomially) → T = Θ(n^(log_b a)). Leaves dominate.
Case 2: f = Θ(n^(log_b a) · logᵏ n) → T = Θ(n^(log_b a) · log^(k+1) n). Every level costs the same.
Case 3: f grows faster and passes the regularity check a·f(n/b) ≤ c·f(n) → T = Θ(f(n)). Root dominates.
Merge sort: a = 2, b = 2, n^1 vs f = n → case 2 → n log n.
Binary search: a = 1, b = 2, n^0 = 1 vs f = 1 → case 2 → log n.
Karatsuba: 3T(n/2) + n → n^(log₂ 3) ≈ n^1.585.
Strassen: 7T(n/2) + n² → n^(log₂ 7) ≈ n^2.807.
Tree traversal: 2T(n/2) + 1 → Θ(n).
## When it does not apply
Subtract-and-conquer: T(n) = T(n−1) + n → Θ(n²); T(n) = 2T(n−1) + 1 → Θ(2ⁿ).
Unequal splits: T(n) = T(n/3) + T(2n/3) + n → Θ(n log n) (recursion tree or Akra–Bazzi).
Gaps that are not polynomial, e.g. 2T(n/2) + n/log n, fall between the cases.
## Memoisation and linear recurrences
With memo, time = number of distinct states × work per state (Fibonacci becomes O(n)).
Linear recurrences (Fibonacci-like) grow like φⁿ, φ ≈ 1.618; matrix exponentiation computes term n in O(k³ log n).
## Extras
Akra–Bazzi for unequal splits.
Floors and ceilings do not change asymptotics.
Binet: F(n) ≈ φⁿ/√5; float formulas fail past n ≈ 70.
2T(n/2) + n log n = Θ(n log² n).
Characteristic equation's largest root = growth rate.
`,
  "space-recursion": `
## What counts
Auxiliary space: memory beyond the input. State whether the output counts, and whether modifying the input is allowed.
Recursion stack depth × frame size is part of space: DFS on a path-shaped tree is O(n) space.
## Call stack
Each call pushes a frame (arguments, locals, return address). Depth, not total calls, sets stack space.
Fibonacci recursion makes O(2ⁿ) calls but uses O(n) stack.
Balanced tree DFS: O(log n) stack; skewed tree: O(n).
Merge sort: O(log n) stack plus O(n) for the merge buffer.
Quicksort: O(log n) stack if you recurse on the smaller side and loop on the larger.
## Stack overflow in practice
Python's default recursion limit is 1000 (sys.setrecursionlimit raises it, but the C stack can still crash).
Java's default thread stack is around 512 KB to 1 MB, roughly 10⁴ to 10⁵ frames.
For depths around 10⁵ or more, convert to iteration with an explicit stack.
Tail calls are not optimised in Python or Java.
## In-place techniques
Two pointers, swapping, reversing, using the input array as a marker (negation, cyclic sort).
Morris traversal: in-order with O(1) space via temporary threads.
Rolling arrays in DP: keep only the previous row → O(n) instead of O(nm).
Bit tricks: store booleans in an int mask.
## Space-time trade-offs
Hash map: O(n) space for O(1) lookups. Precomputation (prefix sums, sparse tables) trades memory for query speed.
Recompute instead of storing when memory is tight; memoise when time is tight.
## Extras
Large local arrays in recursive C/C++ functions overflow the stack.
Kotlin tailrec / Scheme optimise tail calls; Python and Java do not.
Generators chain frames like recursion.
5000×5000 table: ~100 MB of ints; roll to two rows.
`,
  "constraints-budget": `
## Budget
About 10⁸ simple operations per second is the working estimate (C++ faster; Python roughly 10⁷).
n ≤ 10–12 → O(n!) or O(n·2ⁿ) brute force or permutations.
n ≤ 20–25 → O(2ⁿ) subsets or bitmask DP; n ≤ 40 → meet in the middle (2^(n/2)).
n ≤ 100–500 → O(n³) (Floyd–Warshall, interval DP).
n ≤ 2000–5000 → O(n²) (2D DP).
n ≤ 10⁵–10⁶ → O(n log n) or O(n) (sorting, heaps, binary search, two pointers).
n ≥ 10⁷ or value ≤ 10¹⁸ → O(log n) or O(1): maths, binary search on the answer, fast power.
Memory: 256 MB holds about 6×10⁷ ints; a 10⁴ × 10⁴ table is too big, so roll the DP.
## Problem-solving loop
Read the constraints first; they name the target complexity.
State the brute force and its cost, then find the bottleneck (the repeated work) and remove it.
Typical removals: hash map for repeated search, sorting plus two pointers, prefix sums for repeated ranges, memo for repeated subproblems, a heap for repeated minimums.
## Lower bounds
Comparison sorting needs Ω(n log n); reading the input needs Ω(n).
If you are already at the lower bound, stop optimising time and look at space or constants.
## Hints in the wording
"Sorted" → binary search or two pointers. "Contiguous subarray" → sliding window or prefix sums.
"Top/k-th" → heap or quickselect. "All combinations" → backtracking. "Minimum steps" → BFS.
"Count ways / min cost with choices" → DP. "Connected / groups" → union-find or DFS.
"Answer modulo 10⁹+7" → counting DP or combinatorics. "O(1) extra space" → in-place tricks or bits.
## Extras
log₂(10⁵) ≈ 17, log₂(10⁶) ≈ 20.
n² at n = 10⁴ ≈ 10⁸: fine in C++/Java, slow in Python.
Bottleneck fixes: hash map, prefix sums, heap/deque, memo, two pointers, DSU.
Clarify → brute force → bottleneck → optimise → test.
`,
};
