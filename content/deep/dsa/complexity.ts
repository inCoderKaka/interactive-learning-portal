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
      ["How do I state complexity when the input has several sizes?", "Use every size that matters: O(V + E) for graphs, O(n·m) for two strings, O(R·C) for grids, O(n + q log n) for n elements and q queries. Collapsing them into one n hides real costs (a dense graph has E ≈ V²)."],
      ["What is the difference between O(n + m) and O(max(n, m))?", "Nothing asymptotically: n + m ≤ 2·max(n, m) and max(n, m) ≤ n + m. Either form is fine; O(n + m) is the conventional way to write it."],
      ["Should I count the output in time complexity?", "Yes for time: producing k results costs at least O(k), so algorithms that list all subsets are Ω(2ⁿ) regardless of cleverness (\"output-sensitive\" bounds like O(n log n + k)). For space, say whether you count the output buffer; many interviewers exclude it."],
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
? Θ vs O in interview speech? :: People say O but usually mean the tight (Θ) worst-case bound.
? Cost of sorting n strings of length L? :: O(n log n · L) comparisons of up to L characters.
? Harmonic loop cost? :: Σ n/i = Θ(n log n).
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

Some operations are usually cheap but occasionally expensive: a dynamic array's append is O(1) until it must resize and copy everything. Worst-case analysis per operation would call append O(n), which badly overstates the real cost of n appends. **Amortised analysis** bounds the **total** cost of any sequence of m operations, then divides by m: if any sequence costs at most O(m · f), each operation costs O(f) amortised.

Amortised cost is a **worst-case guarantee over sequences**, not an average over random inputs and not a probability: no matter which sequence of operations an adversary chooses, the total stays within the bound. (Average-case and expected costs depend on input or random choices; amortised costs do not.)

## Method 1: aggregate

Bound the total cost of n operations directly and divide by n.

**Dynamic array with doubling**: n appends trigger copies of 1, 2, 4, …, up to n elements: total copies < 2n, plus n writes: total < 3n, so O(1) amortised per append.

**Binary counter increment**: bit i flips every 2^i increments, so n increments flip at most n + n/2 + n/4 + … < 2n bits: O(1) amortised, although a single increment (0111…1 → 1000…0) flips O(log n) bits.

## Method 2: accounting (banker's)

Charge each operation a fixed "amortised price", possibly more than its actual cost, and store the surplus as **credit** on data elements; expensive operations are paid for with stored credit. The analysis is valid if credit never goes negative.

**Dynamic array**: charge 3 per append. 1 pays for writing the element; 2 is stored on it. When the array doubles from size k to 2k, the k/2 elements appended since the last resize each hold 2 credits, enough to pay for copying all k elements (themselves and the k/2 older ones). Credit never runs out, so append is O(1) amortised.

**Queue from two stacks**: charge 3 per push: push onto the in-stack, later move to the out-stack, later pop. Each element is moved at most once, so pop is O(1) amortised.

## Method 3: potential

Define a potential function Φ on the data structure's state, with Φ ≥ 0 and Φ(initial) = 0. Amortised cost = actual cost + ΔΦ. Summed over a sequence, the potential differences telescope: total amortised = total actual + Φ(final) − Φ(initial) ≥ total actual, so amortised costs bound the real total.

**Dynamic array**: Φ = 2·size − capacity (≥ 0 once at least half full). A cheap append: actual 1, ΔΦ = 2: amortised 3. A resizing append at size = capacity = k: actual k + 1 (copy and write), the capacity doubles, so ΔΦ = 2 − k: amortised 3.

The potential method is the most powerful: it proves union-find's O(α(n)), splay trees' O(log n) and Fibonacci heaps' bounds.

## Growth factor matters

- **Constant increments** (grow by +c): copies of c, 2c, 3c, …: total Θ(n²/c): O(n) amortised per append. Never do this for unbounded growth.
- **Any constant factor r > 1** (1.5, 2): total copies ≤ n · r/(r − 1): O(1) amortised. Smaller factors waste less memory but copy more often (factor 1.5 copies about 3n in total, factor 2 about 2n). Factors below the golden ratio (≈ 1.618) let the allocator reuse previously freed blocks.
- **Shrinking**: halve the capacity when the array is a quarter full, not half full. Shrinking at half would let an adversary alternate push and pop at the boundary, resizing every time (O(n) each).

## Other amortised arguments you will use

- **Monotonic stack / deque**: each index is pushed once and popped at most once, so the inner while loops total O(n) over the whole scan.
- **Two pointers and sliding windows**: each pointer only moves forward, at most n steps each: O(n) total even with nested loops.
- **Union-find** with path compression and union by rank: O(α(n)) amortised per operation (α ≤ 4 in practice).
- **Hash table resizing**: amortised O(1) insert, like dynamic arrays.
- **KMP prefix function**: the matched length rises at most n times in total, so the fallback loop is amortised O(1).
- **BST iterator** (stack of left spines): next() is amortised O(1) over a full traversal.
- **Splay trees**: O(log n) amortised per access via a potential function.
- **Two-stack queue**: amortised O(1) per operation.

## Amortised vs real-time

Amortised bounds allow an occasional slow operation (an O(n) resize, a long union-find path). That is fine for throughput but bad for latency-sensitive systems (games, trading, real-time audio, garbage collectors). Remedies:

- **Reserve capacity** in advance when the size is known (vector::reserve, ArrayList(int)).
- **Incremental (de-amortised) resizing**: keep the old and new buffers and move a few elements on each operation (Redis's incremental rehashing; real-time queues).
- **Different structures**: linked or chunked arrays (deques of blocks) avoid large copies.

## Interview angles

- When you claim O(1) for an append or O(n) for a monotonic stack scan, say "amortised" and give the one-line reason.
- Explain why doubling works and constant increments do not.
- Distinguish amortised from average case.

## Connections

Dynamic arrays and hash tables (resizing), stacks and queues (two-stack queue), monotonic structures, union-find, and KMP.
`,
    doubts: [
      ["Is amortised the same as average case?", "No. Average case averages over a probability distribution of inputs and can be wrong for a particular input. Amortised is a worst-case bound on the total cost of any sequence; no randomness is involved."],
      ["Why does growing by a constant amount give O(n) per append?", "Growing by k slots means a copy every k appends, and copies cost 1·k, 2·k, 3·k, …, up to n. That sum is Θ(n²/k), so each append is Θ(n/k) = Θ(n) amortised."],
      ["Then why does any constant factor work, even 1.1?", "Copies happen at geometrically growing sizes, and a geometric series sums to a constant times its largest term: n + n/1.1 + n/1.1² + … = n·(1/(1 − 1/1.1)) = 11n. Smaller factors waste less memory but copy more often."],
      ["Is the monotonic stack's inner while loop O(n) per iteration?", "Per iteration it can be, but every element is popped at most once over the whole run, so all the while loops together do at most n pops. Total O(n)."],
      ["Can amortised analysis be used in an interview answer?", "Yes, and you should name it: 'push_back is amortised O(1), so building the array is O(n)'. For the monotonic stack say 'each index is pushed and popped at most once'."],
      ["Why must the potential function be non-negative and start at zero?", "Total amortised cost = total actual cost + Φ(final) − Φ(initial). If Φ(final) ≥ Φ(initial) (guaranteed by Φ ≥ 0 and Φ(initial) = 0), the amortised total is at least the actual total, so it is a valid upper bound. A potential that could go negative would let amortised costs underestimate real work."],
      ["Can a single operation's amortised cost be lower than its actual cost?", "Yes, that is the point: an expensive operation (a resize) has a high actual cost but a low amortised cost because it spends credit (potential) saved by earlier cheap operations. Over the whole sequence the totals still bound the real work."],
      ["Does amortised O(1) hold if the sequence is very short?", "The bound is on the total of any sequence, so even a sequence of one append is covered: its actual cost (possibly a resize of the initial buffer) is at most a constant plus the potential drop. Formally the guarantee holds for every m ≥ 1."],
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
? Potential for dynamic arrays? :: Φ = 2·size − capacity; every append costs 3 amortised.
? Total copies with factor r? :: ≤ n·r/(r − 1): ~2n for r = 2, ~3n for r = 1.5.
? KMP amortisation? :: Matched length rises ≤ n times, so fallbacks total ≤ n.
? De-amortisation? :: Move a few elements per operation (incremental resizing).
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

A recursive algorithm's running time satisfies a recurrence: the cost of a problem of size n equals the cost of its recursive calls plus the work done outside them.

| Algorithm | Recurrence | Solution |
|---|---|---|
| binary search | T(n) = T(n/2) + O(1) | O(log n) |
| tree traversal (balanced) | T(n) = 2T(n/2) + O(1) | O(n) |
| merge sort | T(n) = 2T(n/2) + O(n) | O(n log n) |
| quicksort, balanced splits | T(n) = 2T(n/2) + O(n) | O(n log n) |
| quicksort, worst case | T(n) = T(n − 1) + O(n) | O(n²) |
| quickselect, balanced | T(n) = T(n/2) + O(n) | O(n) |
| Karatsuba multiplication | T(n) = 3T(n/2) + O(n) | O(n^log₂3) ≈ O(n^1.585) |
| Strassen matrix multiplication | T(n) = 7T(n/2) + O(n²) | O(n^log₂7) ≈ O(n^2.807) |
| naive Fibonacci | T(n) = T(n − 1) + T(n − 2) + O(1) | O(φⁿ) ≈ O(1.618ⁿ) |
| subsets / permutations | T(n) = 2T(n − 1) + O(1); T(n) = n·T(n − 1) | O(2ⁿ); O(n!) |

Write the recurrence by asking: how many recursive calls (a), on what sizes (n/b or n − c), and how much work besides them (f(n))?

## The recursion tree method

Draw the tree of calls: the root does f(n) work; its a children each do f(n/b); level i has a^i nodes each doing f(n/b^i); there are log_b n levels until the size is constant. Sum the work per level.

- **Every level costs the same** (merge sort: level i has 2^i nodes × n/2^i = n): total = n × (number of levels) = n log n.
- **Levels shrink geometrically** (quickselect: n, n/2, n/4, …): the root dominates: O(n).
- **Levels grow geometrically** (Karatsuba: n, 3n/2, 9n/4, …): the leaves dominate: O(number of leaves) = O(a^(log_b n)) = O(n^(log_b a)).

The tree makes the Master theorem's three cases intuitive.

## The Master theorem

For T(n) = a·T(n/b) + f(n) with a ≥ 1, b > 1, compare f(n) with n^(log_b a) (the total work at the leaves):

1. **Leaves dominate**: f(n) = O(n^(log_b a − ε)) for some ε > 0 ⇒ T(n) = Θ(n^(log_b a)).
2. **Balanced**: f(n) = Θ(n^(log_b a) · log^k n) ⇒ T(n) = Θ(n^(log_b a) · log^(k+1) n). (Most common: k = 0, giving an extra log.)
3. **Root dominates**: f(n) = Ω(n^(log_b a + ε)) and the regularity condition a·f(n/b) ≤ c·f(n) for some c < 1 ⇒ T(n) = Θ(f(n)).

Examples: merge sort (a = 2, b = 2, f = n = n^1 = n^(log₂2)): case 2: n log n. Binary search (a = 1, b = 2, f = 1 = n^0): case 2: log n. T(n) = 2T(n/2) + 1 (tree traversal): n^1 vs 1: case 1: n. T(n) = 2T(n/2) + n²: case 3: n².

The **regularity condition** rules out pathological f that oscillate; for polynomials it always holds.

## When the Master theorem does not apply

- **Subtract-and-conquer**: T(n) = T(n − 1) + f(n) sums f: T(n − 1) + 1 = O(n); T(n − 1) + n = O(n²). T(n) = 2T(n − 1) + 1 = O(2ⁿ) (Towers of Hanoi: 2ⁿ − 1 moves).
- **Unequal splits**: T(n) = T(n/3) + T(2n/3) + n: the recursion tree has levels costing at most n and depth log_{3/2} n: O(n log n). The **Akra–Bazzi** theorem handles such recurrences generally. Quicksort with any constant-ratio split (say 1 : 9) is still O(n log n).
- **Gaps between cases**: T(n) = 2T(n/2) + n / log n falls between cases 1 and 2 (answer Θ(n log log n)); the basic theorem says nothing.
- **Non-polynomial sizes**: T(n) = T(√n) + 1: substitute n = 2^m: S(m) = S(m/2) + 1 = O(log m): T(n) = O(log log n) (van Emde Boas trees).
- **Recurrences with floors and ceilings**: they do not change the asymptotic answer; ignore them.

## Recursion + memoisation

With memoisation, the cost is no longer the recursion tree's size but **the number of distinct states × the work per state**. Naive Fibonacci has O(φⁿ) calls but only n + 1 distinct arguments: memoised, it is O(n). That is the step from recursion to dynamic programming: if the tree has repeated subproblems, count distinct states instead of nodes.

## Linear recurrences in closed form

- Fibonacci: F(n) = (φⁿ − ψⁿ)/√5 with φ = (1 + √5)/2, ψ = (1 − √5)/2 (Binet's formula), so F(n) ≈ φⁿ/√5: exponential growth at rate 1.618.
- Characteristic equation: for T(n) = c₁T(n − 1) + c₂T(n − 2), solve x² = c₁x + c₂; the largest root sets the growth rate.
- For exact values with large n, use **matrix exponentiation** (O(log n) multiplications) instead of floating-point formulas, which lose precision past n ≈ 70.

## Interview angles

- Translate the code into a recurrence out loud, then solve it with the recursion tree or the Master theorem.
- Know the table of common recurrences by heart.
- Mention memoisation when the recursion tree repeats subproblems.

## Connections

Divide and conquer (merge sort, quickselect, Karatsuba), DP (counting distinct states), space complexity (recursion depth), and matrix exponentiation for linear recurrences.
`,
    doubts: [
      ["Why is 2T(n/2) + 1 only O(n) when merge sort is n log n?", "Count work per level: level i has 2ⁱ calls doing O(1) each, so the bottom level (n leaves) dominates: total ~2n. Merge sort does n work on every level, so all log n levels contribute equally."],
      ["How do I handle T(n) = T(n − 1) + T(n − 2)?", "Not Master theorem territory. It is Θ(φⁿ) ≈ Θ(1.618ⁿ). Upper bound 2ⁿ is acceptable in an interview if you say it is loose."],
      ["Does it matter if n is not a power of b?", "No. Floors and ceilings change the result by at most a constant factor for these recurrences; analyses assume powers of b for convenience."],
      ["What is the regularity condition in case 3 for?", "It ensures the work really shrinks geometrically down the tree. For normal polynomial f it holds automatically; it can fail for weird oscillating functions."],
      ["What is the space complexity of recursion?", "The maximum depth of the call stack times the frame size, plus any allocations alive at once. Merge sort: O(log n) stack plus O(n) merge buffer. Naive Fibonacci: O(n) stack even though time is exponential."],
      ["How do I get the space complexity of a recursive algorithm from its recurrence?", "Space follows the depth of the recursion (the longest chain of active calls) plus the space held at each level, not the number of calls. Merge sort has depth log n but allocates O(n) for merging, so O(n); naive Fibonacci has depth n: O(n) space despite O(φⁿ) time."],
      ["Why does T(n) = 2T(n/2) + n log n give n log² n?", "Here f(n) = n log n = n^(log₂2) · log¹ n, which is case 2 with k = 1, so T(n) = Θ(n log² n). In the recursion tree each of the log n levels costs about n log(n/2^i), which sums to Θ(n log² n)."],
      ["Is the Master theorem needed in interviews?", "Rarely by name. Interviewers mostly want the recursion-tree reasoning (\"log n levels, n work per level, so n log n\"). Knowing the three cases helps you answer instantly and check yourself."],
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
? T(n) = T(√n) + 1? :: n = 2^m ⇒ O(log log n).
? T(n) = 2T(n/2) + n²? :: Case 3: Θ(n²).
? Quicksort with a 1:9 split? :: Still O(n log n) (depth log_{10/9} n, ≤ n per level).
? Towers of Hanoi moves? :: T(n) = 2T(n−1) + 1 = 2ⁿ − 1.
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

**Space complexity** measures the extra memory an algorithm needs as a function of the input size. Conventions to state explicitly in an interview:

- **Auxiliary space**: memory beyond the input itself (extra arrays, hash maps, queues, the recursion stack). This is what "O(1) space" usually means.
- **The output**: often excluded ("O(1) extra space besides the output") because any algorithm must store its answer. Say whether you count it.
- **Modifying the input**: using the input array as scratch space (marking by negation, sorting in place) gives O(1) auxiliary space, but some interviewers consider destroying the input unacceptable or count it; ask.
- **The recursion stack** always counts: it is memory, even though it is implicit.

## The call stack

Every function call pushes a **stack frame**: return address, arguments, local variables, saved registers. The frame is popped when the call returns. So the stack space used by a recursion is the **maximum depth** of the chain of active calls × the frame size, **not** the total number of calls.

- Naive Fibonacci makes O(φⁿ) calls but its deepest chain is n calls: **O(n) space**.
- DFS on a balanced binary tree: depth log n: O(log n). On a skewed tree (a linked list): depth n: O(n).
- Merge sort: recursion depth log n plus an O(n) merge buffer: O(n) total.
- Quicksort: O(log n) expected depth; O(n) worst case, unless you recurse on the smaller part and loop on the larger part (tail-call elimination by hand), which guarantees O(log n).
- Backtracking (subsets, permutations): depth n plus the path: O(n) besides the output.
- Memoised DP: the memo table (number of states) plus the recursion depth.

## Stack overflow in practice

- **Python**: the default recursion limit is 1000 frames. sys.setrecursionlimit raises it, but the interpreter's C stack (often 8 MB on the main thread) can still overflow and crash the process at around 10⁴–10⁵ frames. Workarounds: iterative versions; running the recursion in a thread created with threading.stack_size(…) set high; or converting to explicit stacks.
- **Java**: the default thread stack is about 512 KB to 1 MB, roughly 10⁴ to 10⁵ frames depending on frame size; start a Thread with a larger stack size for deep recursion.
- **C/C++**: 1–8 MB by default; large local arrays inside recursive functions exhaust it quickly.
- **Tail calls**: Python and Java do not optimise tail calls; Scheme, some C compilers (with optimisation) and Kotlin's tailrec do.

Rule of thumb: recursion depth up to about 10⁴ is safe everywhere; 10⁵ or more (a path-shaped tree, DFS on a 1000 × 1000 grid) needs an iterative approach.

**Converting recursion to iteration**: push frames onto an explicit stack: (node, state) pairs where state records which child to visit next or whether the node's post-order work is pending. Any recursion can be converted this way; BFS (a queue) also replaces DFS when the visit order does not matter.

## In-place techniques

Ways to get O(1) auxiliary space:

- **Two pointers and swapping**: reversal, partitioning, Dutch flag, removing elements with read/write pointers.
- **Using the input as a marker**: negate a[v − 1] to mark value v as seen; cyclic sort places each value at its index; bit packing (store two values in one integer when ranges allow, e.g. Game of Life's two-bit encoding).
- **Morris traversal**: in-order tree traversal with O(1) space via temporary threads.
- **Rolling arrays in DP**: keep only the previous row (or two rows, or a few variables): O(n·m) → O(m) or O(1). Iterate in the right direction (0/1 knapsack downwards) so needed values are not overwritten.
- **Bit manipulation**: booleans in a bitmask instead of an array.
- **Floyd's cycle detection** instead of a visited set.
- **Reservoir sampling** instead of storing a stream.

## Space-time trade-offs

| Spend memory to save time | Spend time to save memory |
|---|---|
| hash maps for O(1) lookups | sort and binary search instead |
| memoisation / DP tables | recompute instead of storing |
| prefix sums, sparse tables, precomputed answers | compute ranges on demand |
| adjacency matrices for O(1) edge checks | adjacency lists, scan neighbours |
| caching (LRU) | recompute or refetch |

The right choice depends on constraints: with n = 10⁶ and 256 MB, a 10⁶ × 10⁶ table is impossible, while a hash map of 10⁶ entries (tens of MB) is fine.

**Memory estimates**: an int is 4 bytes (Java, C++), but a Python int object is about 28 bytes and a list slot adds 8; a Python dict entry costs roughly 50–100 bytes. 10⁷ Python ints in a list ≈ 350 MB: use array, NumPy or bitsets for large data.

## Interview angles

- State space with the recursion depth included ("O(h) for the stack").
- Ask whether modifying the input or excluding the output is allowed.
- Offer an iterative version when depth can be large, and a rolling array for DP.

## Connections

Recurrences (depth), DP space optimisation, Morris traversal, in-place array tricks, and constraints-driven design (memory limits).
`,
    doubts: [
      ["Does recursion always use more space than iteration?", "It uses stack proportional to depth. An iterative version with an explicit stack uses the same asymptotic space for DFS; what you gain is control (heap memory instead of a small fixed stack) and no frame overhead."],
      ["Why is naive Fibonacci O(n) space when it makes 2ⁿ calls?", "Space is the maximum number of frames alive at once, which is the depth of the call tree, n. Calls that have returned free their frames."],
      ["Is modifying the input array 'O(1) space'?", "It is O(1) auxiliary space, yes. Mention that it destroys the input; some interviewers accept it, others ask you to restore it."],
      ["How do I write an iterative post-order DFS?", "Push (node, nextChildIndex). Peek: if the node has another child, increment the index and push the child; otherwise pop and do the post-order work. Or push a node twice with a 'visited' flag: the second pop does the post-order work."],
      ["Is a BFS queue better than recursive DFS for memory?", "Not always: BFS holds a whole frontier, which can be O(width) (half the nodes on the last level of a complete tree), while DFS holds O(depth). BFS avoids stack overflow (the queue lives on the heap), which is often the real concern."],
      ["Do generators or iterators count toward space?", "Each suspended generator keeps its frame alive, so a chain of k nested generators (recursive yield from) holds k frames: O(depth) space, like recursion. A single generator streaming items uses O(1) besides its own state, which is why lazy pipelines save memory."],
      ["How much memory does a 2D DP table of 5000 × 5000 need?", "25 million cells: 100 MB as 4-byte ints, about 200 MB as 8-byte longs, and far more as Python lists of ints. Roll it to two rows (40 KB) whenever each row depends only on the previous one."],
    ],
    revise: md`
? Recursion stack space equals? :: Maximum depth × frame size, not total calls.
? Naive Fibonacci space? :: O(n) (depth), though time is O(2ⁿ).
? Python default recursion limit? :: 1000 frames.
? Does Java or Python do tail-call optimisation? :: No.
? Guarantee O(log n) stack in quicksort? :: Recurse on the smaller side, loop on the larger.
? O(1)-space in-order traversal? :: Morris traversal (temporary threads).
? 2D DP space reduction? :: Keep only the previous row (or two): O(min(n, m)).
? Quicksort guaranteed O(log n) stack? :: Recurse on the smaller part, loop on the larger.
? Deep recursion in Python safely? :: Iterative version, or a thread with a larger threading.stack_size.
? Python int memory? :: ~28 bytes per int object + 8 per list slot.
? Rolling array direction rule? :: Iterate so values still needed are not overwritten (0/1 knapsack downwards).
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

Before designing an algorithm, read the **constraints**: they tell you the intended complexity. Judges and interviewers expect solutions that finish within about a second, and a modern machine performs roughly **10⁸ simple operations per second** in compiled languages (C++, Java), about 10⁷ in Python. So the input size bounds the complexity class:

| n up to | Feasible complexity | Typical techniques |
|---|---|---|
| 10–12 | O(n!), O(n · n!) | permutations, brute force |
| 20–25 | O(2ⁿ), O(n · 2ⁿ) | subsets, bitmask DP |
| 40 | O(2^(n/2)) | meet in the middle |
| 100–500 | O(n³) | Floyd–Warshall, interval DP, triple loops |
| 1,000–5,000 | O(n²) | 2D DP, all pairs, O(n²) scans |
| 10⁵–10⁶ | O(n log n), O(n) | sorting, heaps, binary search, two pointers, prefix sums, hashing |
| 10⁷–10⁸ | O(n), small constant | linear scans, counting, sieves |
| 10⁹–10¹⁸ (values) | O(log n), O(√n), O(1) | maths, binary search on the answer, fast exponentiation, digit DP |

Also check the **sum of sizes** across test cases ("Σ n ≤ 2·10⁵") and the **number of queries** q: O(n + q log n) is typical when both are 10⁵.

**Memory**: 256 MB holds about 6·10⁷ 4-byte ints. A 10⁴ × 10⁴ table (10⁸ cells) does not fit; roll the DP to one dimension or reconsider the state.

## The problem-solving loop

1. **Clarify** inputs, outputs, edge cases (empty input, duplicates, negatives, overflow) and constraints.
2. **Brute force**: state the simplest correct algorithm and its cost. It proves you understand the problem and gives a baseline.
3. **Find the bottleneck**: which work is repeated? Common answers and their fixes:
   - repeated search for a value → hash map or sorting + binary search;
   - repeated range sums → prefix sums;
   - repeated minimum or maximum → heap, monotonic deque, sparse table;
   - repeated subproblems → memoisation / DP;
   - pairs checked exhaustively → sorting + two pointers;
   - all subarrays → sliding window or prefix sums + hash map;
   - connectivity rechecked → union-find;
   - shortest paths recomputed → BFS/Dijkstra once.
4. **Optimise** and recompute the complexity; check it against the budget.
5. **Test** on examples, edge cases, and a large-input mental check.

## Lower bounds: knowing when to stop

Some costs cannot be beaten, and recognising them saves time:

- Reading the input: Ω(n). Producing k outputs: Ω(k).
- Comparison sorting: Ω(n log n) (decision tree). Element distinctness in the comparison model: Ω(n log n) (hashing escapes it with expected O(n)).
- Searching an unsorted array: Ω(n).
- Finding the minimum: n − 1 comparisons.
- Many problems are NP-hard (TSP, subset sum with large values, graph colouring, longest simple path): exponential algorithms are expected; look for small parameters (n ≤ 20, small values) that make them tractable.

When you reach a lower bound, stop optimising time and consider space, constants or simplicity.

## Reading hints from the wording

| Wording | Likely approach |
|---|---|
| "sorted array", "find a pair" | binary search, two pointers |
| "contiguous subarray / substring" | sliding window, prefix sums, Kadane |
| "k-th largest", "top k", "closest k" | heap, quickselect |
| "all combinations / permutations / subsets" | backtracking |
| "minimum number of steps / moves" in an unweighted space | BFS |
| "minimum cost" with non-negative weights | Dijkstra |
| "number of ways", "minimum/maximum with choices" | DP |
| "connected", "groups", "merge accounts" | union-find, DFS |
| "dependencies", "ordering", "prerequisites" | topological sort |
| "intervals", "meetings", "overlaps" | sort + sweep, heap |
| "prefix", "dictionary of words", "autocomplete" | trie |
| "next greater / smaller", "span" | monotonic stack |
| "minimise the maximum", "maximise the minimum" | binary search on the answer |
| "answer modulo 10⁹ + 7" | counting DP, combinatorics |
| "O(1) extra space" | two pointers, in-place marking, bit tricks |
| "stream", "online", "data structure design" | heaps, hash maps + lists, balanced trees |
| "n ≤ 20" | bitmask DP or brute force over subsets |
| "values up to 10⁹, n up to 10⁵" | coordinate compression, sorting, hashing |

These hints narrow the search; they are not rules. Confirm with the constraints and a quick complexity estimate.

## Interview angles

- Mention the constraints and the target complexity before coding ("n is 10⁵, so I need O(n log n) or better").
- Always give the brute force first, then the bottleneck and the fix.
- Know the lower bounds so you can say "this is optimal" with confidence.

## Connections

Every other page: the budget picks the algorithm family, and the patterns above map wording to techniques.
`,
    doubts: [
      ["The constraint says n ≤ 10⁵ but my O(n²) passes the examples. Is it fine?", "No: 10¹⁰ operations is about 100 seconds. In an interview, say 'quadratic is too slow for 10⁵; we need n log n or better'. Passing examples proves nothing about the limit."],
      ["What if there are no constraints given?", "Ask. If the interviewer says 'assume it's large', aim for O(n log n) or O(n). Asking signals that you know constraints drive design."],
      ["Is 10⁸ operations per second accurate?", "It is a rough rule for C++-like speed with simple operations. Cache misses, hashing and allocation make real constants larger; Python is about 10–50× slower. Treat it as an order-of-magnitude guide."],
      ["Why is n ≤ 20 a hint for bitmask DP specifically?", "2²⁰ ≈ 10⁶ states; with n work per state that is 2 × 10⁷, comfortably fast. At n = 30, 2³⁰ ≈ 10⁹ is too slow, but meet in the middle (2 × 2¹⁵) works up to about 40."],
      ["How do I estimate operations for an algorithm with a log factor?", "log₂ of 10⁵ is about 17 and of 10⁶ about 20, so n log n is roughly 2·10⁶ to 2·10⁷ operations: comfortable. n log² n at 10⁵ is about 3·10⁷: still fine in compiled languages, tight in Python."],
      ["My solution is O(n²) with n = 10⁴. Is it acceptable?", "10⁸ simple operations: usually fine in C++ and Java (around a second), too slow in plain Python. Ask about the language and time limit, or look for an O(n log n) improvement; mention that the constant factor matters at this boundary."],
      ["Do interviewers care about constant factors?", "Mostly they care about the complexity class, but when two solutions share it (two passes vs one pass, a hash map vs an array of 26), mentioning the constant-factor difference shows practical judgement."],
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
? Σ n across test cases? :: Check it: per-test O(n log n) with Σ n ≤ 2·10⁵ is fine even with many tests.
? Element distinctness lower bound? :: Ω(n log n) in the comparison model; hashing gives expected O(n).
? "values up to 10⁹, n up to 10⁵" hint? :: Coordinate compression, sorting or hashing.
? NP-hard problem in an interview? :: Look for a small parameter (n ≤ 20, small values) to exploit.
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
