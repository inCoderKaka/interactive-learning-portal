import { md } from "@/content/ai/md";
import { Q } from "@/content/h";
import { S, type Deep } from "../types";

export const complexity: Record<string, Deep> = {
  "big-o": {
    blurb: "What Big-O, Big-Ω and Big-Θ actually claim, how to compare growth rates, and the counting habits that make complexity analysis fast and right.",
    signals: ["Every interview solution: you state time and space before and after coding", "Comparing two approaches (\"is n log n really better than n√n here?\")", "Reading a nested loop and deciding whether it is quadratic or linear"],
    lesson: md`
## Why we count steps, not seconds

Running time depends on the machine, the language, the compiler and the cache. **Asymptotic analysis** throws all of that away and asks one question: *how does the work grow as the input grows?* An algorithm that does 3n + 50 steps and one that does 1000n steps are both "linear", and both will beat an n² algorithm once n is large enough.

We measure in terms of **n**, the input size (array length, number of vertices and edges, string length), and count basic operations: comparisons, arithmetic, array reads, pointer moves.

## The three notations

For functions f(n) (your algorithm's cost) and g(n) (a simple reference like n or n log n):

- **f = O(g)** (upper bound): there are constants c > 0 and n₀ such that f(n) ≤ c·g(n) for all n ≥ n₀. "Grows no faster than g."
- **f = Ω(g)** (lower bound): f(n) ≥ c·g(n) for all n ≥ n₀. "Grows at least as fast as g."
- **f = Θ(g)** (tight bound): both. "Grows exactly like g, up to constants."

In interviews people say "Big-O" and mean the tight bound. Being precise once ("this is Θ(n log n); the O and the Θ coincide here") is a quiet signal of rigour. Little-o and little-ω mean strictly smaller and strictly larger growth.

:::warn O is not "worst case"
O, Ω and Θ describe *functions*. Worst case, best case and average case describe *which inputs* you are measuring. You can give a Θ bound for the best case (insertion sort's best case is Θ(n)) and an O bound for the average case. Mixing the two ideas up is the most common confusion.
:::

## The growth ladder

From slowest-growing to fastest:

| Class | Name | Typical source |
|---|---|---|
| 1 | constant | array index, hash lookup (expected) |
| log n | logarithmic | binary search, balanced tree height |
| √n | square root | trial division, sqrt decomposition |
| n | linear | one pass |
| n log n | linearithmic | good sorting, divide and conquer with linear merge |
| n² | quadratic | all pairs |
| n³ | cubic | Floyd–Warshall, naive matrix multiply |
| 2ⁿ | exponential | all subsets |
| n! | factorial | all permutations |

Useful facts:

- **Logs**: the base does not matter inside O (log₂ n and log₁₀ n differ by a constant factor). log(n^k) = k log n, so log(n²) is still Θ(log n).
- **Polylog beats polynomial**: (log n)^k grows slower than n^ε for any k and any ε > 0.
- **Polynomial beats exponential**: n^k grows slower than cⁿ for any c > 1.
- **Sums of terms**: keep the dominant one. n² + 1000n log n = Θ(n²).

## Counting rules that cover 90% of code

1. **Sequential blocks add**: O(a) then O(b) is O(a + b) = O(max(a, b)).
2. **Nested loops multiply** when the inner bound does not depend on the outer: for i in n, for j in m → O(nm).
3. **Dependent inner loops: sum them.** for i in 0..n, for j in i..n → n + (n−1) + … + 1 = n(n+1)/2 = Θ(n²).
4. **Halving or doubling loops are logarithmic**: while n > 1: n //= 2 runs ⌊log₂ n⌋ times.
5. **Harmonic sums**: for i in 1..n, for j in 0..n step i → n/1 + n/2 + … + n/n = n·Hₙ = Θ(n log n). This shows up in sieve-like code.
6. **Recursion**: write a recurrence (see the recurrences page) or count the recursion tree's nodes times work per node.

### Traps when counting

- **Hidden loops in library calls**: string concatenation in a loop (\`s += c\` in Java/Python creates a new string each time → Θ(n²)), \`list.insert(0, x)\`, \`in\` on a list, slicing, \`substring\` in Java (copies since Java 7u6), sorting inside a loop.
- **Two-pointer and sliding-window loops** look nested but are linear: each pointer moves at most n times in total. Count *total pointer moves*, not loop nesting.
- **Amortised operations** (dynamic array append, union-find) are cheap on average over a sequence even if one call is expensive.
- **Input size is not always n**: a graph algorithm is O(V + E), a string matcher O(n + m), a grid O(R·C). For numeric input, the size is the *number of bits*: an algorithm that loops up to the value N is pseudo-polynomial, exponential in the input length (relevant for knapsack and primality).

## Space complexity

Count extra memory beyond the input: arrays you allocate, hash maps, recursion stack depth. A recursive DFS on a path-shaped tree of n nodes uses Θ(n) stack even with no explicit data structure. Say whether you count the output (a function returning all subsets necessarily uses Θ(n·2ⁿ) for the output itself).

## Best, worst, average and expected

- **Worst case**: the guarantee. Quicksort is Θ(n²) worst case.
- **Average case**: over a distribution of inputs (often "all orders equally likely"). Quicksort averages Θ(n log n).
- **Expected** (randomised): over the algorithm's own coin flips, for *every* input. Randomised quicksort is expected Θ(n log n) on every input; hash tables are expected O(1) per operation under random hashing.
- **Amortised**: worst case total over a sequence, divided by its length. No probability involved.

## How interviewers use complexity

- State brute force complexity first, then the improvement, then the optimal: it shows the path.
- After coding, **re-derive** complexity from your actual code, including library calls.
- Expect "can you do better?": know the lower bounds (comparison sorting is Ω(n log n); reading the input is Ω(n)) so you can say when you are done.
`,
    doubts: [
      ["If O is an upper bound, isn't every linear algorithm also O(n²)?", "Yes, technically. O(n²) is a true but loose statement about a linear algorithm. That is why Θ exists. In practice, give the tightest bound you can justify and say Θ when you mean it."],
      ["Why can I drop constants? 1000n is clearly worse than n.", "For a fixed n it is. Asymptotics describe growth: doubling n doubles both. Constants matter when comparing algorithms of the same class (and in real systems), so mention them when they are large or when n is small, but they do not change the class."],
      ["Is O(log n) with base 2 different from base 10?", "No. log_a n = log_b n / log_b a, a constant factor. Inside O the base is irrelevant (except in exponents: 2^(log₂ n) = n but 2^(log₁₀ n) is not)."],
      ["Why is the sliding-window loop O(n) when there is a while inside a for?", "Count total work, not nesting. The inner while only moves the left pointer forward, and the left pointer can move at most n times across the whole run. Total iterations of both loops together are at most 2n."],
      ["Is hash map lookup really O(1)?", "Expected O(1) under a good hash function and bounded load factor. Worst case is O(n) (everything collides), and adversarial inputs can force it (hash flooding), which is why Java 8 switches long buckets to balanced trees (O(log n) worst case) and languages randomise their hash seeds."],
      ["Is n log n much slower than n in practice?", "log₂ of a billion is about 30. So n log n is at most ~30× linear for any realistic n, and constants often matter more. That is why O(n log n) sorting is usually fine even when an O(n) method exists."],
      ["What is pseudo-polynomial time?", "Polynomial in the numeric value of the input but exponential in its length in bits. Knapsack DP is O(n·W): with W given in log₂ W bits, the running time is exponential in the input size. It is fast when W is small, which is why the DP works in interviews."],
    ],
    revise: md`
### Definitions
? f = O(g) means? :: There exist c, n₀ with f(n) ≤ c·g(n) for all n ≥ n₀ (upper bound).
? f = Θ(g) means? :: Both O(g) and Ω(g): tight bound.
? Is "worst case" the same as Big-O? :: No. Cases pick the inputs; O/Ω/Θ bound a function. Any case can get any bound.

### Counting
? for i in 0..n: for j in i..n — complexity? :: Θ(n²): the sum n + (n−1) + … + 1.
? for i in 1..n: for j in 0..n step i — complexity? :: Θ(n log n): harmonic sum n·Hₙ.
? while n > 1: n //= 2 — iterations? :: ⌊log₂ n⌋.
? s += c in a loop in Java/Python? :: Θ(n²) total: strings are immutable, each concatenation copies.
? Two pointers that only move forward? :: O(n): count total pointer moves.

### Growth order
? Order: n log n, n√n, n², log² n, 2ⁿ? :: log² n < n log n < n√n < n² < 2ⁿ.
? Does the log base matter? :: Not inside O; it is a constant factor.
? Expected vs amortised? :: Expected averages over random choices; amortised averages the worst-case total over a sequence.
`,
    pitfalls: ["Ignoring hidden costs of library calls (slicing, string concatenation, list.insert(0, ·))", "Calling a two-pointer loop O(n²) because it looks nested", "Saying a hash map is O(1) worst case", "Forgetting the recursion stack when stating space", "Using n for everything when the input has several sizes (V and E, n and m)"],
    quiz: [
      Q("Which grows fastest?", ["n^100", "*1.01ⁿ", "n² log n", "(log n)^1000"], "Any exponential with base > 1 eventually beats any polynomial."),
      Q("for i in 1..n: j = 1; while j < n: j *= 2. Complexity?", ["O(n)", "*O(n log n)", "O(n²)", "O(log n)"], "The inner loop is logarithmic and runs n times."),
      Q("Insertion sort on already-sorted input is…", ["Θ(n²)", "*Θ(n)", "Θ(n log n)", "Θ(1)"], "Each element is compared once. Best-case analysis can still be Θ."),
      Q("Knapsack DP in O(n·W) is called…", ["polynomial", "*pseudo-polynomial", "exponential in n", "linear"], "Polynomial in the value W, exponential in its bit length."),
    ],
    sources: [
      S.book("Introduction to Algorithms (CLRS), 4th ed., ch. 3: Characterizing Running Times", "Cormen, Leiserson, Rivest, Stein", "https://mitpressbookstore.mit.edu/book/9780262046305"),
      S.course("MIT 6.006 Introduction to Algorithms (Spring 2020), Lecture 1: Algorithms and Computation", "MIT OpenCourseWare", "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/"),
      S.article("Big O notation", "Wikipedia", "https://en.wikipedia.org/wiki/Big_O_notation"),
      S.book("Algorithms, 4th ed. §1.4 Analysis of Algorithms", "Sedgewick & Wayne", "https://algs4.cs.princeton.edu/14analysis/"),
    ],
  },

  amortized: {
    blurb: "Why a dynamic array's append is O(1) even though some appends copy everything, and the three ways (aggregate, accounting, potential) to prove cheap-on-average costs.",
    signals: ["One operation is occasionally expensive but most are cheap (resizing, rebuilding, flushing)", "A pointer or stack that only moves one way across the whole run", "Union-find, splay trees, two-stack queues, monotonic stacks"],
    lesson: md`
## The idea

**Amortised analysis** bounds the *total* cost of any sequence of m operations, then divides by m. No probability is involved: it is a worst-case guarantee on sequences, not an average over random inputs.

The classic example: appending to a **dynamic array** (C++ vector, Java ArrayList, Python list). When the array is full, allocate one twice as large and copy everything over. That single append costs Θ(n). Yet n appends cost Θ(n) in total, so each append is **amortised O(1)**.

## Method 1: aggregate

Add up the whole sequence. With doubling from capacity 1, copies happen at sizes 1, 2, 4, …, up to n. Total copy work is 1 + 2 + 4 + … + n < 2n. Plus n writes for the elements themselves: under 3n total for n appends. Average: < 3 per append.

## Method 2: accounting (banker's)

Charge each operation a fixed **amortised fee**, larger than its actual cost when it is cheap; store the surplus as **credit** on the data structure; spend credit on expensive operations. If credit never goes negative, the fees bound the true total.

For the dynamic array, charge 3 per append: 1 pays for writing the element, 2 are saved on it. When the array of capacity k doubles, the k/2 elements added since the last resize each hold 2 credits, which pays for copying all k elements.

## Method 3: potential

Define a **potential function** Φ(state) ≥ 0 with Φ(initial) = 0. The amortised cost of an operation is actual cost + ΔΦ. Summing over a sequence, the ΔΦ terms telescope, so total actual cost ≤ total amortised cost. For the dynamic array, Φ = 2·size − capacity works: a normal append raises Φ by 2 (amortised 3); a resize drops Φ by about the copy cost.

The potential method is the one used for hard results like splay trees and Fibonacci heaps.

## Growth factor matters

- **Doubling (factor 2)** or any constant factor > 1 gives amortised O(1). Many implementations use 1.5 to reuse freed memory better.
- **Adding a constant** (grow by 10 slots each time) gives Θ(n) per append amortised: total Θ(n²). Never do this.
- **Shrinking**: if you halve when the array becomes half full, alternating push/pop at the boundary thrashes (Θ(n) each). Shrink at one quarter full instead; then amortised O(1) holds for both.

## Other amortised arguments you will use

- **Monotonic stack**: each element is pushed once and popped at most once. The while-pop loop inside the for loop is O(n) total.
- **Two pointers / sliding window**: each pointer moves forward at most n times.
- **Queue from two stacks**: each element is moved from the in-stack to the out-stack at most once. Amortised O(1) per operation.
- **Union-find** with path compression and union by rank: O(α(n)) amortised per operation.
- **Hash table rehashing**: same doubling argument as dynamic arrays.

## Amortised vs real-time

Amortised O(1) still allows an occasional O(n) pause. For latency-sensitive systems (games, trading, real-time audio) that matters, and **de-amortised** structures (incremental resizing: copy a few elements per operation) trade simplicity for bounded worst-case latency. Redis's incremental rehashing is a production example.
`,
    doubts: [
      ["Is amortised the same as average case?", "No. Average case averages over a probability distribution of inputs and can be wrong for a particular input. Amortised is a worst-case bound on the total cost of any sequence; no randomness is involved."],
      ["Why does growing by a constant amount give O(n) per append?", "Growing by k slots means a copy every k appends, and copies cost 1·k, 2·k, 3·k, …, up to n. That sum is Θ(n²/k), so each append is Θ(n/k) = Θ(n) amortised."],
      ["Then why does any constant factor work, even 1.1?", "Copies happen at geometrically growing sizes, and a geometric series sums to a constant times its largest term: n + n/1.1 + n/1.1² + … = n·(1/(1 − 1/1.1)) = 11n. Smaller factors waste less memory but copy more often."],
      ["Is the monotonic stack's inner while loop O(n) per iteration?", "Per iteration it can be, but every element is popped at most once over the whole run, so all the while loops together do at most n pops. Total O(n)."],
      ["Can amortised analysis be used in an interview answer?", "Yes, and you should name it: 'push_back is amortised O(1), so building the array is O(n)'. For the monotonic stack say 'each index is pushed and popped at most once'."],
    ],
    revise: md`
? Amortised analysis bounds what? :: The worst-case total cost of any sequence of operations, divided by its length.
? Dynamic array with doubling: cost of n appends? :: Θ(n) total (copies sum to < 2n): amortised O(1) per append.
? Growth by a constant number of slots? :: Θ(n²) total: amortised Θ(n) per append. Always grow by a factor.
? Safe shrink rule? :: Shrink when one quarter full (not half), to avoid thrashing.
? Three proof methods? :: Aggregate (sum everything), accounting (prepaid credits), potential (Φ, telescoping ΔΦ).
? Monotonic stack total work? :: O(n): each element is pushed once and popped at most once.
? Queue from two stacks? :: Amortised O(1): each element moves to the out-stack at most once.
? Amortised vs expected? :: Amortised has no randomness; expected averages over random choices.
`,
    pitfalls: ["Calling amortised O(1) 'average case'", "Growing a buffer by a constant amount", "Shrinking at half-full and thrashing", "Claiming a monotonic stack is O(n²) because of the nested loop"],
    quiz: [
      Q("A queue built from two stacks performs n operations. Total cost?", ["O(n²)", "*O(n)", "O(n log n)", "O(1)"], "Each element is pushed and transferred at most once."),
      Q("A dynamic array grows from capacity 1 by doubling. Copy work for n appends is at most about…", ["n²/2", "*2n", "n log n", "n"], "1 + 2 + 4 + … + n < 2n."),
      Q("Amortised bounds are…", ["probabilistic", "*worst-case bounds on sequences", "best-case bounds", "only for trees"], "No probability involved."),
    ],
    sources: [
      S.book("Introduction to Algorithms (CLRS), ch. 16: Amortized Analysis", "Cormen, Leiserson, Rivest, Stein", "https://mitpressbookstore.mit.edu/book/9780262046305"),
      S.article("Amortized analysis", "Wikipedia", "https://en.wikipedia.org/wiki/Amortized_analysis"),
      S.course("MIT 6.046J Design and Analysis of Algorithms, Lecture 5: Amortization", "MIT OpenCourseWare", "https://ocw.mit.edu/courses/6-046j-design-and-analysis-of-algorithms-spring-2015/"),
    ],
    problems: [232, 155],
  },

  recurrences: {
    blurb: "Turn recursive code into a recurrence, then solve it with the recursion tree or the Master theorem. The skill that lets you state divide-and-conquer complexity in seconds.",
    signals: ["Any recursive algorithm (merge sort, binary search, tree recursion, divide and conquer)", "\"What is the complexity of this recursive function?\"", "Choosing between splitting in halves vs peeling one element"],
    lesson: md`
## From code to recurrence

Write T(n) = (work in the recursive calls) + (work done in this call). Examples:

| Code shape | Recurrence | Solution |
|---|---|---|
| Binary search: one half, O(1) work | T(n) = T(n/2) + 1 | Θ(log n) |
| Merge sort: two halves, linear merge | T(n) = 2T(n/2) + n | Θ(n log n) |
| Tree traversal: two halves, O(1) work | T(n) = 2T(n/2) + 1 | Θ(n) |
| Peel one element, linear work | T(n) = T(n − 1) + n | Θ(n²) |
| Peel one, constant work | T(n) = T(n − 1) + 1 | Θ(n) |
| Two calls on n − 1 (naive Fibonacci) | T(n) = 2T(n − 1) + 1 | Θ(2ⁿ) |
| Karatsuba multiplication | T(n) = 3T(n/2) + n | Θ(n^1.585) |
| Strassen | T(n) = 7T(n/2) + n² | Θ(n^2.807) |

## The recursion tree method

Draw the calls as a tree. Level i has aⁱ subproblems of size n/bⁱ, each doing f(n/bⁱ) work. Total = sum over levels. Three things can happen:

1. **Work grows downward** (leaves dominate): total ≈ number of leaves = n^(log_b a).
2. **Work is equal on every level**: total = (work per level) × (number of levels) = f(n) · log n.
3. **Work shrinks downward** (root dominates): total ≈ f(n).

Merge sort: level i has 2ⁱ pieces of size n/2ⁱ, each costing n/2ⁱ: n per level, log₂ n levels → n log n.

## The Master theorem

For T(n) = a·T(n/b) + f(n) with a ≥ 1, b > 1, compare f(n) with **n^(log_b a)** (the leaf count):

1. If f(n) = O(n^(log_b a − ε)) for some ε > 0: **T(n) = Θ(n^(log_b a))** (leaves win).
2. If f(n) = Θ(n^(log_b a) · log^k n) with k ≥ 0: **T(n) = Θ(n^(log_b a) · log^(k+1) n)** (balanced).
3. If f(n) = Ω(n^(log_b a + ε)) and a·f(n/b) ≤ c·f(n) for some c < 1 (regularity): **T(n) = Θ(f(n))** (root wins).

Quick checks: binary search (a=1, b=2, f=1): n^0 = 1 = f → case 2 → log n. Merge sort (a=2, b=2, f=n): n^1 = f → case 2 → n log n. 2T(n/2) + 1: n^1 vs 1 → case 1 → n. T(n/2) + n: n^0 vs n → case 3 → n.

:::tip Quickselect and the "geometric shrink" shortcut
T(n) = T(n/2) + n solves to Θ(n), not n log n: the work halves each level (n + n/2 + n/4 + … = 2n). That is why quickselect (expected) and median-of-medians are linear.
:::

## When the Master theorem does not apply

- **Subtract-and-conquer** (T(n) = T(n − 1) + …): unroll it or use the tree; it is a sum, not a geometric split.
- **Uneven splits** (T(n) = T(n/3) + T(2n/3) + n): use the recursion tree (every level does ≤ n work and there are log_{3/2} n levels → Θ(n log n)) or the Akra–Bazzi theorem.
- **Non-polynomial gaps** (T(n) = 2T(n/2) + n/log n): falls between cases; the answer is Θ(n log log n).

## Recursion + memoisation

With memoisation, complexity is **(number of distinct states) × (work per state)**, not a recurrence over calls. Fibonacci with memo: n states × O(1) = O(n). This is the bridge to dynamic programming.

## Linear recurrences in closed form

T(n) = T(n − 1) + T(n − 2) grows like φⁿ (φ ≈ 1.618), the golden ratio, because the characteristic equation is x² = x + 1. Matrix exponentiation computes the n-th term in O(log n) multiplications.
`,
    doubts: [
      ["Why is 2T(n/2) + 1 only O(n) when merge sort is n log n?", "Count work per level: level i has 2ⁱ calls doing O(1) each, so the bottom level (n leaves) dominates: total ~2n. Merge sort does n work on every level, so all log n levels contribute equally."],
      ["How do I handle T(n) = T(n − 1) + T(n − 2)?", "Not Master theorem territory. It is Θ(φⁿ) ≈ Θ(1.618ⁿ). Upper bound 2ⁿ is acceptable in an interview if you say it is loose."],
      ["Does it matter if n is not a power of b?", "No. Floors and ceilings change the result by at most a constant factor for these recurrences; analyses assume powers of b for convenience."],
      ["What is the regularity condition in case 3 for?", "It ensures the work really shrinks geometrically down the tree. For normal polynomial f it holds automatically; it can fail for weird oscillating functions."],
      ["What is the space complexity of recursion?", "The maximum depth of the call stack times the frame size, plus any allocations alive at once. Merge sort: O(log n) stack plus O(n) merge buffer. Naive Fibonacci: O(n) stack even though time is exponential."],
    ],
    revise: md`
? Master theorem compares f(n) with? :: n^(log_b a), the number of leaves.
? T(n) = 2T(n/2) + n? :: Θ(n log n) (balanced, case 2).
? T(n) = 2T(n/2) + 1? :: Θ(n) (leaves dominate, case 1).
? T(n) = T(n/2) + n? :: Θ(n) (root dominates; geometric shrink).
? T(n) = T(n/2) + 1? :: Θ(log n).
? T(n) = T(n − 1) + n? :: Θ(n²).
? T(n) = 2T(n − 1) + 1? :: Θ(2ⁿ).
? T(n) = 3T(n/2) + n? :: Θ(n^log₂3) ≈ Θ(n^1.585) (Karatsuba).
? T(n) = T(n/3) + T(2n/3) + n? :: Θ(n log n) via the recursion tree.
? Memoised recursion complexity? :: Number of distinct states × work per state.
`,
    pitfalls: ["Applying the Master theorem to T(n − 1) recurrences", "Saying T(n) = T(n/2) + n is n log n", "Forgetting recursion stack space", "Counting calls instead of distinct states for memoised code"],
    quiz: [
      Q("T(n) = 4T(n/2) + n² is…", ["Θ(n²)", "*Θ(n² log n)", "Θ(n³)", "Θ(n log n)"], "n^(log₂4) = n² equals f(n): case 2."),
      Q("T(n) = 8T(n/2) + n² is…", ["Θ(n² log n)", "*Θ(n³)", "Θ(n²)", "Θ(n⁴)"], "Leaves n^(log₂8) = n³ dominate."),
      Q("Quickselect with perfect halving: T(n) = T(n/2) + n is…", ["Θ(n log n)", "*Θ(n)", "Θ(log n)", "Θ(n²)"], "n + n/2 + n/4 + … = 2n."),
    ],
    sources: [
      S.book("Introduction to Algorithms (CLRS), ch. 4: Divide-and-Conquer (the master method)", "Cormen, Leiserson, Rivest, Stein", "https://mitpressbookstore.mit.edu/book/9780262046305"),
      S.article("Master theorem (analysis of algorithms)", "Wikipedia", "https://en.wikipedia.org/wiki/Master_theorem_(analysis_of_algorithms)"),
      S.book("Algorithms, chapter 1: Recursion (recursion trees)", "Jeff Erickson", "https://jeffe.cs.illinois.edu/teaching/algorithms/book/01-recursion.pdf"),
      S.article("Akra–Bazzi method", "Wikipedia", "https://en.wikipedia.org/wiki/Akra%E2%80%93Bazzi_method"),
    ],
    problems: [50, 509],
  },

  "space-recursion": {
    blurb: "Memory is part of the answer: auxiliary space, the recursion stack, in-place tricks and the stack-overflow trap that bites recursive DFS on large inputs.",
    signals: ["\"Can you do it in O(1) extra space?\"", "Deep recursion on 10⁵+ nodes (linked lists, skewed trees, path graphs)", "Choosing between memoisation (more memory) and recomputation"],
    lesson: md`
## What counts

**Auxiliary space** is memory beyond the input: arrays, hash maps, queues, and the **call stack**. Interviewers usually mean auxiliary space unless they say "total". State whether the output counts (returning all n² pairs is Θ(n²) output however clever the algorithm).

## The call stack

Each active recursive call keeps a **frame** (arguments, locals, return address). Space = maximum depth × frame size, not the total number of calls.

- Recursive binary search: depth log n → O(log n) stack. The iterative version is O(1).
- DFS on a balanced tree: O(log n); on a skewed tree or a linked list: **O(n)**.
- Naive Fibonacci makes 2ⁿ calls but its depth is only n → O(n) space.
- Merge sort: O(log n) stack plus an O(n) merge buffer.
- Quicksort: O(log n) expected stack, O(n) worst case. Recursing into the **smaller** partition first and looping on the larger guarantees O(log n).

## Stack overflow in practice

Default stacks are small: Python's recursion limit is 1000 frames; the JVM's default thread stack is around 512 KB–1 MB (tens of thousands of frames); C++ main-thread stacks are commonly 8 MB on Linux and 1 MB on Windows. A recursive DFS over 10⁵ nodes in a path-shaped graph can crash.

Options, in the order to mention them:
1. **Convert to iteration** with an explicit stack. For DFS, push (node, child-index) pairs so you can do post-order work.
2. Use **BFS** when order does not matter.
3. Raise the limit (Python \`sys.setrecursionlimit\` plus a bigger thread stack; JVM \`-Xss\` or running in a \`Thread\` with a larger stack size). Works, but mention it as a pragmatic fix rather than the design.

**Tail calls**: a call is in tail position when nothing remains to be done after it returns. Scheme and some functional languages reuse the frame; **Python, Java and (by guarantee) C++ do not**, so do not rely on tail-call optimisation in interviews.

## In-place techniques

- **Reuse the input** as storage: mark visited cells in the grid itself, negate values as "seen" flags (First Missing Positive, Find All Duplicates), store two values in one integer (a + b·n).
- **Two pointers** instead of copying.
- **Reverse in place** (reverse a linked list, rotate an array via three reversals).
- **Morris traversal**: in-order traversal in O(1) space using temporary threads in null right pointers.
- **Rolling DP arrays**: keep only the last row or two (2D DP in O(min(n, m)) space).

Modifying the input is a trade-off: say so, and offer to restore it afterwards if the caller needs it.

## Space-time trade-offs

- Memoisation: spend O(states) memory to avoid exponential recomputation.
- Precomputation: prefix sums, sparse tables (O(n log n) space for O(1) queries).
- Bit-packing: bitsets reduce memory by 32–64× and speed up subset DP.
`,
    doubts: [
      ["Does recursion always use more space than iteration?", "It uses stack proportional to depth. An iterative version with an explicit stack uses the same asymptotic space for DFS; what you gain is control (heap memory instead of a small fixed stack) and no frame overhead."],
      ["Why is naive Fibonacci O(n) space when it makes 2ⁿ calls?", "Space is the maximum number of frames alive at once, which is the depth of the call tree, n. Calls that have returned free their frames."],
      ["Is modifying the input array 'O(1) space'?", "It is O(1) auxiliary space, yes. Mention that it destroys the input; some interviewers accept it, others ask you to restore it."],
      ["How do I write an iterative post-order DFS?", "Push (node, nextChildIndex). Peek: if the node has another child, increment the index and push the child; otherwise pop and do the post-order work. Or push a node twice with a 'visited' flag: the second pop does the post-order work."],
    ],
    revise: md`
? Recursion stack space equals? :: Maximum depth × frame size, not total calls.
? Naive Fibonacci space? :: O(n) (depth), though time is O(2ⁿ).
? Python default recursion limit? :: 1000 frames.
? Does Java or Python do tail-call optimisation? :: No.
? Guarantee O(log n) stack in quicksort? :: Recurse on the smaller side, loop on the larger.
? O(1)-space in-order traversal? :: Morris traversal (temporary threads).
? 2D DP space reduction? :: Keep only the previous row (or two): O(min(n, m)).
`,
    pitfalls: ["Recursive DFS on a 10⁵-node path in Python without raising the limit", "Counting total calls as space", "Claiming O(1) space while using recursion", "Forgetting the merge buffer in merge sort"],
    quiz: [
      Q("Recursive DFS on a linked list of n nodes uses stack space…", ["O(1)", "O(log n)", "*O(n)", "O(n²)"], "The depth is n."),
      Q("Which reduces quicksort's worst-case stack to O(log n)?", ["Random pivot", "*Recursing on the smaller partition first", "Insertion sort cutoff", "Three-way partition"], "The larger side is handled by the loop; the smaller side halves the remaining depth."),
    ],
    sources: [
      S.article("Call stack", "Wikipedia", "https://en.wikipedia.org/wiki/Call_stack"),
      S.article("sys.setrecursionlimit", "Python documentation", "https://docs.python.org/3/library/sys.html#sys.setrecursionlimit"),
      S.article("Tail call", "Wikipedia", "https://en.wikipedia.org/wiki/Tail_call"),
      S.article("Threaded binary tree (Morris traversal)", "Wikipedia", "https://en.wikipedia.org/wiki/Threaded_binary_tree"),
    ],
    problems: [41, 442, 94],
  },

  "constraints-budget": {
    blurb: "Read the constraints first: n ≤ 20, 10³, 10⁵ or 10⁹ each point to a different family of algorithms. The fastest way to find the intended approach and to know when you are done.",
    signals: ["The very first minute of every problem", "You have a solution and want to know whether it is fast enough", "Stuck: the constraint often names the technique"],
    lesson: md`
## The budget

A typical judge (and an interviewer's mental model) allows roughly **10⁸ simple operations per second**, often with a 1–2 second limit. Interpreted languages are slower: budget 10⁷ for Python. So the constraint on n tells you the largest complexity that fits.

| n up to | Feasible complexity | Typical techniques |
|---|---|---|
| 10–12 | O(n!) , O(n · n!) | permutations, brute-force search |
| 20–25 | O(2ⁿ · n) | subsets, bitmask DP, meet in the middle (n ≤ 40) |
| 100–500 | O(n³) | Floyd–Warshall, interval DP, cubic DP |
| 1,000–5,000 | O(n²) | all pairs, 2D DP, O(n²) graph work |
| 10⁵–10⁶ | O(n log n) or O(n) | sorting, heaps, binary search, two pointers, segment trees, hashing |
| 10⁹–10¹⁸ (a value) | O(log n), O(√n) | binary search on the answer, math, fast exponentiation, digit DP |

Look at **every** variable: values, number of queries, string lengths, grid dimensions. "n ≤ 10⁵ and q ≤ 10⁵ queries" rules out O(n) per query; you need O(log n) per query (prefix sums, segment tree, offline processing).

## The problem-solving loop

1. **Restate** the problem and ask clarifying questions (input size, ranges, duplicates, negatives, empty input, output format).
2. **Examples**: work one small example by hand; build a tricky one (duplicates, all equal, sorted, reverse sorted, single element).
3. **Brute force** out loud with its complexity. It anchors the conversation and is sometimes the answer.
4. **Find the bottleneck** of the brute force: repeated work (→ memoise / prefix sums), a search (→ hash or binary search), a "best so far" (→ heap or monotonic stack), an ordering (→ sort first).
5. **Pick the target complexity** from the constraints and the bottleneck.
6. **Code** with clear names; narrate invariants.
7. **Test**: trace your example through the code, then edge cases.
8. **Analyse** time and space from the actual code.

## Lower bounds: knowing when to stop

- You must read the input: Ω(n).
- Comparison-based sorting: Ω(n log n) (there are n! orderings and each comparison halves them at best: log₂ n! ≈ n log n).
- Searching an unsorted array: Ω(n).
- Element distinctness by comparisons: Ω(n log n) (hashing beats it in expectation).
- Output size: listing all subsets is Ω(2ⁿ).

If your solution matches the lower bound, say so: "this is optimal because we must at least look at every element".

## Reading hints from the wording

- "Sorted array" → binary search or two pointers.
- "Top k", "k-th largest" → heap or quickselect.
- "Subarray / substring with property" → sliding window or prefix sums.
- "All combinations / permutations" → backtracking (and small n).
- "Minimum number of steps" on a grid or graph → BFS.
- "Number of ways", "maximum value" with choices → DP.
- "Answer is monotone in a parameter" (if x works, bigger x works) → binary search on the answer.
- "Connectivity under additions" → union-find.
`,
    doubts: [
      ["The constraint says n ≤ 10⁵ but my O(n²) passes the examples. Is it fine?", "No: 10¹⁰ operations is about 100 seconds. In an interview, say 'quadratic is too slow for 10⁵; we need n log n or better'. Passing examples proves nothing about the limit."],
      ["What if there are no constraints given?", "Ask. If the interviewer says 'assume it's large', aim for O(n log n) or O(n). Asking signals that you know constraints drive design."],
      ["Is 10⁸ operations per second accurate?", "It is a rough rule for C++-like speed with simple operations. Cache misses, hashing and allocation make real constants larger; Python is about 10–50× slower. Treat it as an order-of-magnitude guide."],
      ["Why is n ≤ 20 a hint for bitmask DP specifically?", "2²⁰ ≈ 10⁶ states; with n work per state that is 2 × 10⁷, comfortably fast. At n = 30, 2³⁰ ≈ 10⁹ is too slow, but meet in the middle (2 × 2¹⁵) works up to about 40."],
    ],
    revise: md`
? Operations per second rule of thumb? :: About 10⁸ simple operations (C++); about 10⁷ in Python.
? n ≤ 20? :: O(2ⁿ · n): subsets or bitmask DP.
? n ≤ 40 with subsets? :: Meet in the middle: two halves of 2^(n/2).
? n ≤ 500? :: O(n³).
? n ≤ 5000? :: O(n²).
? n ≤ 10⁵–10⁶? :: O(n log n) or O(n).
? Value up to 10⁹ or 10¹⁸? :: O(log V) or O(√V): binary search on the answer, math.
? Comparison sorting lower bound? :: Ω(n log n), since log₂(n!) ≈ n log n.
? The 8-step loop? :: Restate/clarify, examples, brute force, find the bottleneck, target complexity, code, test, analyse.
`,
    pitfalls: ["Starting to code before reading constraints", "Ignoring the number of queries", "Over-optimising when n is tiny", "Not stating brute force first"],
    quiz: [
      Q("n ≤ 18, choose a subset maximising a score with pairwise interactions. Likely intended?", ["O(n²) greedy", "*Bitmask enumeration / DP over 2ⁿ", "Segment tree", "Dijkstra"], "2¹⁸ ≈ 2.6 × 10⁵ subsets is tiny."),
      Q("n ≤ 10⁵, q ≤ 10⁵ range-sum queries with updates. Per-query budget?", ["O(n)", "*O(log n)", "O(n log n)", "O(1) only"], "q × n = 10¹⁰ is too slow; a Fenwick or segment tree gives log n."),
      Q("Why is comparison sorting Ω(n log n)?", ["Memory limits", "*Each comparison at most halves the n! possible orders", "Cache effects", "Recursion depth"], "log₂ n! ≈ n log n comparisons are needed in the worst case."),
    ],
    sources: [
      S.article("Comparison sort (lower bound)", "Wikipedia", "https://en.wikipedia.org/wiki/Comparison_sort"),
      S.article("Problem-solving: complexity from constraints", "USACO Guide", "https://usaco.guide/bronze/time-comp"),
      S.book("How to Solve It (Pólya, 1945)", "Wikipedia summary", "https://en.wikipedia.org/wiki/How_to_Solve_It"),
    ],
  },
};
