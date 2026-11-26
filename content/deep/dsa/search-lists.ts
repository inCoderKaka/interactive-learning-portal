import { md } from "@/content/ai/md";
import { Q } from "@/content/h";
import { S, type Deep } from "../types";

/** Binary search and linked lists. */
export const searchLists: Record<string, Deep> = {
  // ─────────────── binary search ───────────────
  "bs-boundaries": {
    blurb: "Binary search as \"find the first index where a predicate turns true\". One invariant-driven template that handles lower bound, upper bound, first/last occurrence and insert position without off-by-one bugs.",
    signals: ["Sorted data and you need a position, not just membership", "First / last occurrence, insert position, count of elements in a range", "Any monotone yes/no predicate over indices"],
    widgets: ["binary-search"],
    lesson: md`
## Think in predicates, not in "found it"

Most binary search bugs come from mixing three questions (is it here? go left? go right?). Reframe every problem as: **there is a monotone predicate P(i) that is false, false, …, false, true, true, … over the range; find the first true.**

- lower_bound(x): first i with a[i] ≥ x.
- upper_bound(x): first i with a[i] > x.
- first occurrence of x: lower_bound(x), then check a[i] == x.
- last occurrence of x: upper_bound(x) − 1.
- count of x: upper_bound(x) − lower_bound(x).
- insert position: lower_bound(x).

## One template

Half-open interval [lo, hi) with the invariant "the answer is in [lo, hi]" (hi = n means "none"):

\`\`\`
lo, hi = 0, n
while lo < hi:
    mid = lo + (hi - lo) // 2
    if P(mid): hi = mid        # mid could be the first true
    else:      lo = mid + 1    # first true is after mid
return lo                      # first true, or n if none
\`\`\`

The loop always shrinks the range (mid < hi), terminates with lo == hi, and never skips the answer. Memorise this one and derive everything else from the predicate.

[[widget:binary-search]]

## Other styles, and why to pick one

- **Closed [lo, hi]** with \`while lo <= hi\` and returning inside the loop: classic "is x present?". Fine for membership; error-prone for boundaries.
- **lo + 1 < hi** with lo always false and hi always true (sentinels −1 and n): very robust for "last false / first true".

Use one consistently. Interviewers care far more about a clear invariant than about which style.

## Overflow and rounding

- mid = (lo + hi) / 2 can overflow 32-bit ints when lo + hi > 2³¹ − 1 (the famous Java \`Arrays.binarySearch\` bug found in 2006). Use lo + (hi − lo) / 2.
- With \`lo = mid\` updates (searching for the *last* true), use the **upper** middle, mid = lo + (hi − lo + 1) / 2, or the loop can spin forever when hi = lo + 1.

## Library functions

- Python: \`bisect_left\` (lower bound), \`bisect_right\` (upper bound); since 3.10 they accept \`key=\`.
- C++: \`lower_bound\`, \`upper_bound\`, \`equal_range\`, \`partition_point\` (first element where a predicate is false; the general form).
- Java: \`Arrays.binarySearch\` returns −(insertion point) − 1 when absent, and with duplicates returns *any* matching index, so it is not a lower bound. TreeMap's ceiling/floor are often what you want.

## Complexity

O(log n) comparisons, O(1) space iteratively. For n = 10⁹ that is about 30 steps.

## Beyond arrays

The predicate view generalises: binary search over **answers** (next page), over **real numbers** (fixed iteration count), over **time** (first day something happens), over a **sorted matrix**, or over implicit sequences (Kth smallest in a multiplication table).
`,
    doubts: [
      ["Why hi = n and not n − 1?", "With the half-open template, hi = n represents 'no element satisfies P'. Returning n is a meaningful answer (insert at the end). Using n − 1 would force a separate check."],
      ["Why hi = mid but lo = mid + 1?", "If P(mid) is true, mid might be the first true, so keep it (hi = mid). If false, the first true is strictly after mid. The asymmetry is exactly what guarantees progress with the lower middle."],
      ["When does the loop run forever?", "When an update does not shrink the range: lo = mid with mid = lower middle and hi = lo + 1 leaves lo unchanged. Fix by using the upper middle whenever you assign lo = mid."],
      ["Can binary search work on an unsorted array?", "It needs a monotone predicate, not literally sorted data. Peak finding works on unsorted arrays because 'a[i] < a[i + 1]' leads you uphill to some peak. Without any monotone structure, no."],
      ["Is binary search on a linked list O(log n)?", "No. Finding the middle costs O(n) each time, total O(n). Binary search needs O(1) random access."],
    ],
    revise: md`
? The universal framing? :: Find the first index where a monotone predicate becomes true.
? Half-open template updates? :: P(mid) → hi = mid; else lo = mid + 1; loop while lo < hi; return lo.
? lower_bound / upper_bound? :: First a[i] ≥ x / first a[i] > x.
? Count of x? :: upper_bound(x) − lower_bound(x).
? Safe mid? :: lo + (hi − lo) / 2.
? Infinite loop cause? :: lo = mid with the lower middle; use the upper middle.
? Java Arrays.binarySearch with duplicates? :: Returns any match, not the first.
? Python lower / upper bound? :: bisect_left / bisect_right.
`,
    pitfalls: ["(lo + hi) / 2 overflow", "Mixing closed and half-open conventions in one function", "lo = mid with the lower middle (infinite loop)", "Assuming Arrays.binarySearch finds the first duplicate", "Not handling 'not found' (lo == n)"],
    quiz: [
      Q("a = [1,2,2,2,3]. upper_bound(2) − lower_bound(2) =", ["2", "*3", "4", "1"], "Indices 4 − 1 = 3 copies."),
      Q("Searching for the last true with lo = mid updates, mid must be…", ["lower middle", "*upper middle", "either", "(lo+hi)/2 always"], "Otherwise lo may never move."),
    ],
    template: `// first index in [0, n) where pred is true; n if none
int firstTrue(int n, function<bool(int)> pred) {
  int lo = 0, hi = n;
  while (lo < hi) { int mid = lo + (hi - lo) / 2; if (pred(mid)) hi = mid; else lo = mid + 1; }
  return lo;
}
// lower_bound(x) = firstTrue(n, [&](int i){ return a[i] >= x; })
// upper_bound(x) = firstTrue(n, [&](int i){ return a[i] >  x; })`,
    sources: [
      S.article("Extra, Extra – Read All About It: Nearly All Binary Searches and Mergesorts are Broken (Bloch, 2006)", "Google Research Blog", "https://research.google/blog/extra-extra-read-all-about-it-nearly-all-binary-searches-and-mergesorts-are-broken/"),
      S.article("Binary search", "cp-algorithms", "https://cp-algorithms.com/num_methods/binary_search.html"),
      S.article("bisect: array bisection algorithm", "Python documentation", "https://docs.python.org/3/library/bisect.html"),
      S.article("std::partition_point", "cppreference", "https://en.cppreference.com/w/cpp/algorithm/partition_point"),
    ],
    problems: [704, 34, 35, 278, 374, 744, 2529],
  },
  "bs-rotated": {
    blurb: "Rotated sorted arrays, peaks and arrays of unknown size: binary search still works because one half is always sorted, or because the slope tells you which way is up.",
    signals: ["A sorted array rotated at an unknown pivot", "Find a peak / mountain top", "The array length is unknown (only get(i) is available)", "Find the minimum of a rotated array"],
    lesson: md`
## Search in Rotated Sorted Array (LC 33)

A rotation of a sorted array (distinct values) splits into two sorted runs. At any mid, **at least one half is sorted**: if a[lo] ≤ a[mid], the left half [lo, mid] is sorted; otherwise the right half is.

- If the left half is sorted and target is within [a[lo], a[mid]), search left; else search right.
- If the right half is sorted and target is within (a[mid], a[hi]], search right; else left.

O(log n).

## Find Minimum in Rotated Sorted Array (LC 153)

Compare a[mid] with a[hi] (not a[lo]): if a[mid] > a[hi], the minimum is to the right of mid (lo = mid + 1); otherwise it is at mid or to the left (hi = mid). Comparing with a[hi] works even when the array is not rotated at all.

**With duplicates** (LC 154, LC 81): when a[mid] == a[hi] you cannot tell which side holds the minimum, so shrink hi by one. Worst case degrades to O(n) (all equal except one), and that is provably unavoidable.

## Peaks (LC 162)

A peak is greater than its neighbours (treat out-of-range as −∞). If a[mid] < a[mid + 1], the slope rises to the right, so some peak lies in (mid, hi]; else some peak lies in [lo, mid]. O(log n) even though the array is unsorted: the predicate "a[i] < a[i + 1]" does not need to be monotone globally, only to guarantee that the half you keep contains a peak.

- **Peak in a mountain array** (LC 852): same idea.
- **Find in Mountain Array** (LC 1095): find the peak, then binary search the increasing half, then the decreasing half (reversed comparison).
- **2D peak** (LC 1901): binary search on rows; take the max of the middle row and move toward a larger neighbour: O(C log R).

## Unknown size (LC 702)

Double hi (1, 2, 4, …) until get(hi) ≥ target or out of range, then binary search in [hi/2, hi]. O(log k) for a target at position k. This is **exponential (galloping) search**, also used to merge runs in TimSort.

## Rotation count and rotated variants

- The index of the minimum equals the number of rotations.
- Search in a rotated array with duplicates (LC 81) returns true/false; same "one half sorted" logic with a lo++/hi−− escape when a[lo] == a[mid] == a[hi].
`,
    doubts: [
      ["Why compare with a[hi] for the minimum rather than a[lo]?", "a[mid] > a[hi] proves a drop happens after mid. Comparing with a[lo] is ambiguous when the array is not rotated (a[mid] > a[lo] but the minimum is at lo)."],
      ["Why does duplicates make it O(n)?", "With [1,1,1,0,1,1,1] versus [1,1,1,1,1,0,1], the probes at lo, mid and hi can all read 1, giving no information about where the 0 is. Any algorithm may need to look at almost every element."],
      ["Why does the peak search work on an unsorted array?", "If a[mid] < a[mid + 1], walking right from mid goes up at least once; following increases you must eventually hit a peak (the boundary counts as −∞). So the right half contains a peak, and the invariant 'a peak exists in [lo, hi]' is preserved."],
    ],
    revise: md`
? Rotated search key fact? :: One half around mid is always sorted.
? Minimum of rotated array rule? :: a[mid] > a[hi] → lo = mid + 1; else hi = mid.
? Duplicates? :: If a[mid] == a[hi], hi−− ; worst case O(n).
? Peak rule? :: a[mid] < a[mid+1] → go right; else go left.
? Unknown size? :: Exponential search: double hi, then binary search.
? Find in Mountain Array? :: Find the peak, then search each side.
`,
    pitfalls: ["Comparing with a[lo] when finding the minimum", "Using < vs ≤ inconsistently in the sorted-half test", "Assuming O(log n) with duplicates"],
    quiz: [Q("Find the minimum of [4,5,6,7,0,1,2]: first step with mid = 3 (value 7) vs a[hi] = 2?", ["hi = mid", "*lo = mid + 1", "return 7", "lo = mid"], "7 > 2, so the drop is to the right.")],
    sources: [S.article("Exponential search", "Wikipedia", "https://en.wikipedia.org/wiki/Exponential_search"), S.course("MIT 6.006 Fall 2011, Lecture 1: Algorithmic thinking, peak finding", "MIT OpenCourseWare", "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-fall-2011/resources/lecture-1-algorithmic-thinking-peak-finding/")],
    problems: [33, 81, 153, 154, 162, 852, 1095, 1901, 702],
  },
  "bs-answer": {
    blurb: "When checking a candidate answer is easy but finding it directly is hard, binary search over the answer space: feasibility is monotone, so the smallest feasible value is a first-true search.",
    signals: ["Minimise the maximum (or maximise the minimum)", "Smallest capacity / speed / days that makes something possible", "\"At most k\" splits, ships, painters, workers", "The answer is a number in a big range (up to 10⁹)"],
    lesson: md`
## The pattern

1. Identify the answer space [lo, hi] (e.g. capacity from max(weight) to sum(weights)).
2. Write **feasible(x)**: can we achieve the goal with value x? Usually a greedy O(n) check.
3. Check **monotonicity**: if x works, does every larger x work (for minimisation)? If yes, binary search for the first feasible x.

Total: O(n log(range)).

## Worked example: Koko Eating Bananas (LC 875)

feasible(k) = sum of ceil(pile / k) over piles ≤ h. Larger k never needs more hours: monotone. Search k in [1, max(piles)].

## The family

| Problem | Answer | Feasibility check |
|---|---|---|
| Capacity to ship within D days (LC 1011) | capacity | greedy fill days |
| Split array largest sum (LC 410) | max part sum | greedy cut when sum exceeds x |
| Minimise max distance to gas station (LC 774) | real distance | count stations needed per gap |
| Magnetic force between balls (LC 1552) | min gap (maximise) | greedy place balls left to right |
| Minimum days to make m bouquets (LC 1482) | day | count consecutive bloomed flowers |
| Kth smallest in a multiplication table (LC 668) | value | count entries ≤ x in O(m) |
| Kth smallest pair distance (LC 719) | distance | count pairs ≤ x with two pointers |
| Median of row-sorted matrix | value | count ≤ x per row with upper_bound |
| Find the smallest divisor given a threshold (LC 1283) | divisor | sum of ceilings |
| Swim in rising water (LC 778) | time | BFS on cells ≤ t |
| Path with minimum effort (LC 1631) | effort | BFS/DFS using edges ≤ x |

## "Kth smallest" via counting

For "the kth smallest value among an implicit set", search on the value x and use count(≤ x) as the predicate: the answer is the first x with count ≥ k. The answer is guaranteed to be an actual element because count only changes at element values. This avoids materialising n² pairs or m × n table entries.

## Real-valued answers

When the answer is a real number, iterate a fixed number of times (e.g. 100 iterations, or until hi − lo < 1e-6). Fixed iterations are safer than an epsilon test with floating-point drift.

## Proving the greedy check

The feasibility check is usually greedy (fill a day until the next item does not fit). Its correctness typically follows from an exchange argument: any valid assignment can be shifted left without breaking it. Say this in one sentence; interviewers notice.

## Alternatives to name

- Some of these problems also have DP solutions (split array largest sum: O(n² k)), which binary search beats.
- Minimax path problems (LC 778, 1631) can also be solved with Dijkstra on a max-edge cost or with Kruskal-style union-find.
`,
    doubts: [
      ["How do I know the answer space bounds?", "lo = the smallest value that could possibly work (often the largest single item, since one item must fit), hi = a value that certainly works (the total, the max element, or 10⁹). If unsure, a wide safe range costs only a few extra iterations."],
      ["Why is the kth-smallest answer always a real element?", "The predicate count(≤ x) ≥ k first becomes true at some x where count jumps, and count only jumps at element values. So the first such x is an element."],
      ["Is binary search on the answer always O(n log range)?", "It is (cost of feasible) × log(range). With range up to 10¹⁸ that is about 60 iterations."],
      ["What if feasibility is not monotone?", "Then binary search is wrong. Example: 'can we split into exactly k parts with max ≤ x' is not monotone in a useful way unless you phrase it as 'at most k parts'. Rephrase until it is monotone, or use another method."],
    ],
    revise: md`
? Three ingredients? :: An answer range, a feasible(x) check, and monotonic feasibility.
? Complexity? :: O(cost of check × log(range)).
? Koko check? :: Σ ceil(pile / k) ≤ h.
? Split array largest sum check? :: Greedy: start a new part when the sum would exceed x; parts ≤ m.
? Maximise the minimum gap? :: Search the gap; greedily place items left to right.
? Kth smallest in an implicit set? :: Search value x; predicate count(≤ x) ≥ k.
? Real-valued answer? :: Fixed number of iterations.
`,
    pitfalls: ["Non-monotone predicate", "lo too large (skips the answer) or hi too small", "Integer overflow in sums inside the check", "Floating-point loops with epsilon tests that never terminate"],
    quiz: [
      Q("Capacity to Ship Packages: the lower bound of the search range is…", ["0", "1", "*max(weight)", "sum(weights)/D"], "The heaviest package must fit on some day."),
      Q("Kth smallest pair distance, n = 10⁴: why not generate all pairs?", ["It is O(n)", "*n² = 10⁸ pairs is too many to sort", "Pairs are not comparable", "Binary search is required by the statement"], "Search on distance and count pairs with two pointers."),
    ],
    sources: [S.article("Binary search on the answer", "USACO Guide", "https://usaco.guide/silver/binary-search"), S.article("Binary search", "cp-algorithms", "https://cp-algorithms.com/num_methods/binary_search.html")],
    problems: [875, 1011, 410, 1552, 1482, 668, 719, 1283, 774, 1231, 2226],
  },
  "bs-2d-median": {
    blurb: "Binary search in matrices (flattened, or row and column sorted) and the hardest classic: the median of two sorted arrays in O(log min(m, n)) by binary searching a partition.",
    signals: ["Fully sorted matrix (each row continues the previous)", "Rows and columns sorted independently", "Median or kth element of two sorted arrays"],
    lesson: md`
## Fully sorted matrix (LC 74)

Treat the R × C matrix as one sorted array of length R·C and map index k → (k / C, k mod C). O(log(RC)).

## Row- and column-sorted matrix (LC 240)

Rows sorted left to right, columns top to bottom, but rows do not continue each other. Start at the **top-right** corner: if the value is too big, move left (the whole column below is bigger); if too small, move down (the whole row to the left is smaller). O(R + C). (Bottom-left works symmetrically; top-left does not, because both moves increase.)

**Kth smallest in such a matrix** (LC 378): binary search on the value with the staircase count of elements ≤ x in O(R + C): O((R + C) log(range)). A min-heap of row heads gives O(k log R).

## Median of Two Sorted Arrays (LC 4)

Goal: O(log min(m, n)). Binary search on how many elements i to take from the smaller array A; then j = (m + n + 1)/2 − i come from B. The partition is correct when

A[i − 1] ≤ B[j] and B[j − 1] ≤ A[i]

(with ±∞ beyond the ends). If A[i − 1] > B[j], take fewer from A (hi = i − 1); else if B[j − 1] > A[i], take more (lo = i + 1). Then the median is max(A[i−1], B[j−1]) for odd total, or the average of that and min(A[i], B[j]) for even.

Why search the smaller array: it keeps j in range and gives the log min bound.

A simpler O(log(m + n)) alternative: **kth element** recursion, discarding k/2 elements from one array each step. Easier to code under pressure; mention both.

## Kth smallest of two arrays

Same kth-element recursion, or the partition idea with i + j = k.

## Linear alternative to know

Merging up to the middle is O(m + n): fine to say as the brute force before optimising.
`,
    doubts: [
      ["Why does starting at the top-right corner work?", "At the top-right, moving left decreases and moving down increases, so each comparison tells you which direction and lets you discard an entire row or column. At the top-left both moves increase, so a comparison does not decide anything."],
      ["Why is the partition condition sufficient?", "If every element on the left side (A[..i−1] and B[..j−1]) is ≤ every element on the right side, then the left side contains exactly the smallest half, so the median sits at the boundary. Within each array the order is already sorted, so only the two cross comparisons need checking."],
      ["How do I handle i = 0 or i = m?", "Treat A[−1] as −∞ and A[m] as +∞ (same for B). Then the conditions remain valid at the edges."],
    ],
    revise: md`
? Fully sorted matrix search? :: Flatten: index k → (k / C, k mod C).
? Row/col-sorted search start and rule? :: Top-right: too big → left, too small → down. O(R + C).
? Kth smallest in a sorted matrix? :: Binary search on value + staircase count, or a heap.
? Median partition condition? :: A[i−1] ≤ B[j] and B[j−1] ≤ A[i].
? Which array do you search? :: The smaller one: O(log min(m, n)).
? Median value from the partition? :: Odd: max of left maxima; even: average with min of right minima.
`,
    pitfalls: ["Starting the staircase at the top-left", "Searching the larger array in the median problem", "Off-by-one in (m + n + 1) / 2", "Forgetting ±∞ sentinels"],
    quiz: [Q("Search a row- and column-sorted matrix starting at the top-right. Value > target:", ["move down", "*move left", "move diagonally", "binary search the row"], "Everything below is even bigger.")],
    sources: [S.article("Median", "Wikipedia", "https://en.wikipedia.org/wiki/Median"), S.article("Kth order statistic in O(N)", "cp-algorithms", "https://cp-algorithms.com/sequences/k-th.html")],
    problems: [74, 240, 378, 4, 1351],
  },
  "bs-real-ternary": {
    blurb: "Binary search on real numbers (bisection) and ternary search for the peak of a unimodal function, with the precision traps that come with floating point.",
    signals: ["The answer is a real number (square root, time, distance)", "A function first increases then decreases (unimodal)", "Minimise a convex cost over a continuous or integer parameter"],
    lesson: md`
## Bisection

For a monotone real predicate (f(x) ≥ 0), keep [lo, hi] with P(lo) false and P(hi) true and halve it. Use a **fixed iteration count**: each iteration halves the interval, so 100 iterations take any double range to its precision limit. Epsilon loops (\`while hi − lo > 1e-9\`) can fail to terminate when the numbers are large and doubles cannot represent the gap.

Examples: integer or real square root (LC 69), minimise maximum distance to gas stations (LC 774), "maximum average subarray of length ≥ k" (LC 644, binary search on the average with a prefix-sum feasibility check).

## Ternary search

For a **unimodal** function (strictly increasing then strictly decreasing), pick m1 = lo + (hi − lo)/3 and m2 = hi − (hi − lo)/3. If f(m1) < f(m2), the maximum is not in [lo, m1]; else not in [m2, hi]. Each step removes a third: O(log n) evaluations.

On **integers**, a cleaner version binary searches on the slope: find the first x with f(x) > f(x + 1). This is just a first-true search, with no thirds.

Plateaus break ternary search (equal values give no direction), so the function must be strictly unimodal, or at least only flat at its optimum.

## Golden-section search

A ternary-search variant that reuses one evaluation per step (points at the golden ratio). Useful when f is expensive. Name-level.

## Convexity in interviews

Many "choose a parameter to minimise a cost" problems have convex cost: the sum of |x − aᵢ| is minimised at the median (no search needed); the sum of (x − aᵢ)² at the mean. Recognising the closed form beats searching.
`,
    doubts: [
      ["Why prefer a fixed number of iterations?", "Doubles have about 15–16 significant digits. Near 10⁹ the smallest representable step is about 1e-7, so a loop waiting for hi − lo < 1e-9 may never end. 100 halvings always finish and reach full precision."],
      ["Ternary or binary search on integers?", "Binary search on the slope predicate f(x) < f(x+1) is simpler and has no thirds arithmetic. It requires the same strict unimodality."],
      ["Where is the sum of absolute deviations minimised?", "At any median of the points. For squared deviations, at the mean. These closed forms remove the need for searching."],
    ],
    revise: md`
? Bisection loop control? :: Fixed iterations (e.g. 100), not an epsilon test.
? Ternary search requirement? :: Strict unimodality.
? Integer unimodal maximum without thirds? :: First x with f(x) > f(x+1).
? Minimise Σ|x − aᵢ|? :: Any median.
? Minimise Σ(x − aᵢ)²? :: The mean.
`,
    pitfalls: ["Epsilon loops that never terminate", "Ternary search on functions with plateaus", "Searching when a closed form (median, mean) exists"],
    quiz: [Q("Point minimising total Manhattan distance to houses on a line:", ["mean", "*median", "midpoint of extremes", "mode"], "Median minimises the sum of absolute deviations.")],
    sources: [S.article("Ternary search", "cp-algorithms", "https://cp-algorithms.com/num_methods/ternary_search.html"), S.article("Golden-section search", "Wikipedia", "https://en.wikipedia.org/wiki/Golden-section_search"), S.article("Bisection method", "Wikipedia", "https://en.wikipedia.org/wiki/Bisection_method")],
    problems: [69, 367, 644, 1515, 2448],
  },

  // ─────────────── linked lists ───────────────
  "ll-basics": {
    blurb: "Nodes and pointers: traversal, insertion and deletion, the dummy head that removes edge cases, and why linked lists are rarer in practice than in interviews.",
    signals: ["The input is a ListNode head", "O(1) insertion or removal when you already hold the node", "Splicing, splitting and re-linking sequences"],
    lesson: md`
## Structure

A **singly linked list** node holds a value and a next pointer; a **doubly linked list** adds prev. Access by position is O(n); insertion or deletion **at a known node** is O(1) (doubly linked, or singly linked when you hold the previous node).

## The dummy (sentinel) node

Create \`dummy = ListNode(0, head)\` and work with \`prev = dummy\`. Every real node now has a predecessor, so deleting or inserting at the head is no longer a special case. Return dummy.next. Use it whenever the head might change: removing elements, merging, partitioning, reversing a sublist.

## Core operations

- **Delete after prev**: prev.next = prev.next.next.
- **Insert after prev**: node.next = prev.next; prev.next = node (order matters).
- **Delete a node given only that node** (LC 237): copy the next node's value into it and delete the next node (impossible for the tail).
- **Length / k-th node**: one pass with a counter.
- **Remove N-th from end** (LC 19): move a lead pointer n steps ahead, then move both until the lead hits the end: one pass.

## Add Two Numbers (LC 2)

Digits stored in reverse: walk both lists with a carry, appending to a dummy-headed result. Forward order (LC 445): reverse both, or use stacks.

## Doubly linked lists in design problems

An LRU cache needs O(1) "move to front" and "remove least recent": a doubly linked list with sentinel head and tail plus a hash map from key to node. Java's LinkedHashMap packages exactly this.

## Practical note

Linked lists cause cache misses and allocation overhead, so production code prefers arrays and array-backed deques. They remain essential where nodes must not move (intrusive lists in kernels, free lists in allocators, LRU structures) and as the basis of persistent data structures.
`,
    doubts: [
      ["When exactly do I need a dummy node?", "Whenever the head can change (it may be deleted, or something may be inserted before it). The dummy gives the head a predecessor so the same code handles all positions."],
      ["How can I delete a node without its predecessor?", "Copy the next node's value and pointer into it, effectively deleting the next node. It fails for the last node and changes node identity (bad if other code holds references)."],
      ["Should I free deleted nodes in C++?", "In real code, yes (or use smart pointers). In interviews, mention it; LeetCode-style harnesses often own the nodes."],
    ],
    revise: md`
? Why a dummy head? :: Gives the head a predecessor: no special cases when the head changes.
? Remove N-th from end in one pass? :: Lead pointer n ahead, then advance both.
? Delete a node given only the node? :: Copy next's value, skip next (not for the tail).
? LRU cache structure? :: Hash map + doubly linked list with sentinels.
? Add Two Numbers (reverse order)? :: Walk both with a carry into a dummy-headed list.
`,
    pitfalls: ["Losing the rest of the list by overwriting next too early", "Null dereference at the tail", "Forgetting the final carry in Add Two Numbers"],
    quiz: [Q("Remove the 2nd node from the end in one pass: the lead pointer starts how far ahead?", ["1", "*2 (n) steps, with both starting at a dummy", "n − 1", "length − n"], "Then when lead reaches the last node, slow is just before the target.")],
    sources: [S.book("Algorithms, 4th ed. §1.3 (linked lists)", "Sedgewick & Wayne", "https://algs4.cs.princeton.edu/13stacks/"), S.article("Linked list", "Wikipedia", "https://en.wikipedia.org/wiki/Linked_list")],
    problems: [2, 445, 19, 203, 237, 707, 83, 82],
  },
  "ll-reversal": {
    blurb: "Reverse a list in place with three pointers, then reuse the same move for sublists, k-groups, pairs and palindrome checks.",
    signals: ["Reverse the whole list or a range [m, n]", "Reverse in groups of k", "Reorder L0, Ln, L1, Ln−1, …", "Check a palindrome in O(1) space"],
    widgets: ["linked-reverse"],
    lesson: md`
## Iterative reversal

\`\`\`
prev, cur = None, head
while cur:
    nxt = cur.next
    cur.next = prev
    prev, cur = cur, nxt
return prev
\`\`\`

Invariant: prev is the reversed prefix, cur is the unreversed rest. O(n), O(1).

[[widget:linked-reverse]]

The recursive version (reverse the rest, then make head.next point back to head) is elegant but uses O(n) stack: mention the overflow risk for long lists.

## Reverse between m and n (LC 92)

Walk to the node before position m (use a dummy), then reverse n − m + 1 nodes and reconnect: before.next = new head of the segment, old segment head.next = the node after. A neat in-place method is **head insertion**: repeatedly move the node after the segment's first node to the front of the segment.

## Reverse in k-groups (LC 25)

For each group: check k nodes remain (otherwise leave them), reverse those k, connect the previous group's tail to the new head, and advance. O(n) time, O(1) space. **Swap nodes in pairs** (LC 24) is k = 2.

## Reorder List (LC 143)

Find the middle (fast/slow), reverse the second half, then merge the two halves alternately. Three standard moves composed.

## Palindrome Linked List (LC 234) in O(1) space

Find the middle, reverse the second half, compare, then (politely) reverse it back to restore the input.

## Rotate List (LC 61)

Close the list into a ring, find the new tail at length − k mod length, and break the ring. No reversal needed, but often grouped with these.
`,
    doubts: [
      ["Why save next before re-pointing?", "Once cur.next points back to prev, the forward link to the rest of the list is gone. Saving it first is the whole trick."],
      ["Recursive or iterative in an interview?", "Iterative: O(1) space and no stack risk. Know the recursive one as a follow-up."],
      ["In k-group reversal, how do I connect groups?", "Keep groupPrev (the node before the group). After reversing, groupPrev.next must point to the group's new head, and the group's old head (now its tail) must point to the next group's first node. Then groupPrev = old head."],
    ],
    revise: md`
? Iterative reversal loop? :: nxt = cur.next; cur.next = prev; prev = cur; cur = nxt.
? Recursive reversal space? :: O(n) stack.
? Reverse sublist [m, n]? :: Dummy, walk to node before m, reverse n − m + 1 nodes, reconnect both ends.
? k-group: what if fewer than k nodes remain? :: Leave them as they are.
? Reorder list recipe? :: Middle, reverse second half, merge alternately.
? Palindrome list in O(1) space? :: Reverse the second half and compare (restore afterwards).
`,
    pitfalls: ["Losing the next pointer", "Not reconnecting the segment's tail in sublist reversal", "Reversing a partial last group in k-group"],
    quiz: [Q("Reverse 1→2→3→4→5 in groups of 2:", ["*2→1→4→3→5", "2→1→3→4→5", "2→1→5→4→3", "5→4→3→2→1"], "The last group has only one node and is left as is.")],
    sources: [S.book("Algorithms, 4th ed. §1.3 (linked lists)", "Sedgewick & Wayne", "https://algs4.cs.princeton.edu/13stacks/"), S.article("Linked list", "Wikipedia", "https://en.wikipedia.org/wiki/Linked_list")],
    problems: [206, 92, 25, 24, 143, 234, 61],
  },
  "fast-slow": {
    blurb: "Two pointers moving at speeds 1 and 2: find the middle, detect a cycle and its entrance (Floyd), and solve \"find the duplicate number\" without modifying the array.",
    signals: ["Linked list may contain a cycle", "Find the middle in one pass", "Sequence generated by x → f(x) (happy numbers, duplicate in [1, n])", "O(1) space required"],
    widgets: ["floyd-cycle"],
    lesson: md`
## Middle of the list

Slow moves 1, fast moves 2. When fast reaches the end, slow is at the middle. For even length, \`while fast and fast.next\` lands slow on the **second** middle; \`while fast.next and fast.next.next\` lands on the **first** middle (what you want before splitting).

## Cycle detection (Floyd's tortoise and hare)

If there is a cycle, fast eventually laps slow: inside the cycle the gap closes by one each step, so they meet within one cycle length. If fast hits null, there is no cycle. O(n) time, O(1) space.

## Finding the cycle's entrance (LC 142)

Let μ be the distance from head to the cycle start and λ the cycle length. At the meeting point, slow has walked μ + a, fast 2(μ + a), and the difference μ + a is a multiple of λ. So walking μ more steps from the meeting point lands exactly on the cycle start. Reset one pointer to head, move both at speed 1: **they meet at the entrance.**

[[widget:floyd-cycle]]

Cycle length: after meeting, keep one pointer still and count steps until the other returns.

## Functional graphs: Find the Duplicate Number (LC 287)

Values in [1, n] in an array of length n + 1: treat i → nums[i] as a linked list starting at index 0. A duplicate value means two indices point to the same node, which creates a cycle whose entrance is the duplicate. Floyd finds it in O(n) time and O(1) space without modifying the array. Interviewers love this reduction.

**Happy Number** (LC 202): iterate the digit-square-sum function; either reach 1 or cycle; detect with fast/slow (or a set).

## Brent's algorithm

An alternative that teleports the slow pointer at powers of two; fewer function evaluations on average. Name-level, useful when f is expensive (Pollard's rho factorisation uses cycle detection).

## Other uses

- **Intersection of two lists** (LC 160): two pointers switching heads at the end meet at the intersection after at most m + n steps (lengths equalise). Not speed-2, but the same "pointer gymnastics" family.
- **Linked list palindrome / reorder**: find the middle first.
`,
    doubts: [
      ["Why are fast and slow guaranteed to meet inside a cycle (not jump over each other)?", "Once both are in the cycle, the distance from fast to slow (measured forward) decreases by exactly 1 per step. It must reach 0, so they meet; skipping is impossible with speeds 1 and 2."],
      ["Why does resetting to head find the entrance?", "At the meeting point slow has walked μ + a and fast 2(μ + a); their difference μ + a is a multiple of λ. So a pointer at the meeting point that walks μ steps ends at a + μ ≡ 0 (mod λ) from the entrance, i.e. at the entrance, exactly when a pointer from head walks μ steps to arrive there too."],
      ["Find the Duplicate: why start at index 0?", "Values are in [1, n], so no value points to index 0: index 0 is never inside the cycle, it is the start of the 'tail'. The cycle's entrance is the node with two incoming pointers, which is the duplicated value."],
    ],
    revise: md`
? Middle with first-middle bias? :: Loop while fast.next and fast.next.next.
? Why must the pointers meet in a cycle? :: The gap shrinks by 1 per step inside the cycle.
? Cycle entrance? :: After meeting, reset one to head; advance both by 1; they meet at the entrance.
? Cycle length? :: From the meeting point, count steps until a pointer returns.
? Find the Duplicate Number reduction? :: i → nums[i] is a functional graph; the duplicate is the cycle entrance.
? Intersection of two lists? :: Switch to the other head at the end; meet at the intersection.
`,
    pitfalls: ["Dereferencing fast.next.next without checking fast.next", "Using a hash set when O(1) space is required", "Starting Find the Duplicate at nums[0] incorrectly (start both at index 0)"],
    quiz: [
      Q("After fast and slow meet, how do you find the cycle start?", ["Count the cycle length", "*Move one pointer to head, advance both by 1", "Advance fast by 3", "Reverse the list"], "The μ ≡ −a (mod λ) argument."),
      Q("Find the Duplicate Number in O(1) space without modifying the array:", ["Sort", "XOR", "*Floyd on i → nums[i]", "Hash set"], "Sorting modifies the array; XOR fails with multiple repeats."),
    ],
    sources: [S.article("Floyd's cycle-finding and Brent's algorithm", "Wikipedia", "https://en.wikipedia.org/wiki/Cycle_detection#Floyd's_tortoise_and_hare"), S.article("Cycle detection (Floyd and Brent)", "Wikipedia", "https://en.wikipedia.org/wiki/Cycle_detection")],
    problems: [141, 142, 876, 287, 202, 160, 2095],
  },
  "ll-merge-sort": {
    blurb: "Merging sorted lists, merging k of them, and sorting a linked list in O(n log n) with merge sort: the one sort that suits lists naturally.",
    signals: ["Merge two or k sorted lists", "Sort a linked list", "Partition a list around a value"],
    lesson: md`
## Merge two sorted lists (LC 21)

Dummy head, tail pointer; attach the smaller head; at the end attach the leftover list in one step (no loop). O(m + n), O(1) extra.

## Merge k sorted lists (LC 23)

- **Min-heap** of the k current heads, keyed by value (add an index tiebreaker in Python, since nodes are not comparable): O(N log k).
- **Divide and conquer**: merge pairs, then pairs of results: O(N log k), no heap.
- Merging one by one is O(N k): name it as the naive version.

## Sort List (LC 148)

Merge sort fits linked lists: splitting needs only a middle (fast/slow) and merging needs no extra arrays. Top-down recursion uses O(log n) stack; **bottom-up** merge sort (merge runs of size 1, 2, 4, …) achieves O(1) extra space. Quicksort is a poor fit (no random access for pivots, bad worst case).

## Partition List (LC 86)

Two dummy lists (less than x, greater or equal), append nodes in order, then join: stable, O(n).

## Insertion Sort List (LC 147)

O(n²) but in place; with a dummy head and an "insert from the last position if possible" shortcut it is fast on nearly sorted input.

## Odd Even Linked List (LC 328)

Two pointers building the odd-index and even-index chains, then link the odd tail to the even head.
`,
    doubts: [
      ["Why is merge sort preferred for linked lists?", "Merging lists is O(1) extra space (just re-link nodes), and splitting needs no random access. Quicksort and heapsort rely on random access."],
      ["How does bottom-up merge sort reach O(1) space?", "It iterates over run sizes 1, 2, 4, … and, for each size, walks the list cutting and merging consecutive runs with a few pointers. No recursion stack."],
      ["Heap of ListNodes in Python?", "heapq compares tuples element by element; if two values tie it compares ListNodes and raises a TypeError. Push (val, index, node) with a unique index."],
    ],
    revise: md`
? Merge two sorted lists leftovers? :: Attach the remaining list directly.
? Merge k lists complexity? :: O(N log k) with a heap or pairwise divide and conquer.
? Sort a linked list in O(n log n), O(1) space? :: Bottom-up merge sort.
? Python heap tie-break for nodes? :: Push (value, unique index, node).
? Partition List? :: Two dummy chains joined at the end (stable).
`,
    pitfalls: ["Comparing ListNodes in a Python heap", "Forgetting to cut the list at the middle before recursing", "Merging k lists one at a time (O(Nk))"],
    quiz: [Q("Merging k = 10⁴ lists with N = 10⁵ total nodes one by one costs about…", ["O(N log k)", "*O(N·k)", "O(N)", "O(k log N)"], "Each merge re-walks the growing result.")],
    sources: [S.article("Merge sort (linked lists)", "Wikipedia", "https://en.wikipedia.org/wiki/Merge_sort#Use_with_linked_lists"), S.article("heapq (tie-breaking with tuples)", "Python documentation", "https://docs.python.org/3/library/heapq.html")],
    problems: [21, 23, 148, 86, 147, 328],
  },
  "ll-copy-design": {
    blurb: "Deep copies with random pointers, flattening multilevel lists, and the list-plus-map designs (LRU, browser history) that need O(1) moves.",
    signals: ["Copy a list (or graph) whose nodes have extra pointers", "Flatten nested or multilevel lists", "Design with O(1) reordering of elements"],
    lesson: md`
## Copy List with Random Pointer (LC 138)

- **Hash map** old → new: first pass creates copies, second pass wires next and random through the map. O(n) time and space.
- **Interleaving** in O(1) extra space: insert each copy right after its original (A → A' → B → B' …); then A'.random = A.random.next; finally separate the two lists. Restores the original.

The same "map from original to copy" is how you clone graphs (LC 133) with DFS or BFS.

## Flatten a Multilevel Doubly Linked List (LC 430)

DFS: when a node has a child, splice the child list between the node and its next, recursively flatten, and fix prev pointers; or use an explicit stack holding pending "next" nodes.

## Designs that are lists underneath

- **LRU cache** (LC 146): doubly linked list (recency order) + hash map (key → node). get moves to front; put inserts at front and evicts the tail.
- **LFU cache** (LC 460): frequency → doubly linked list of keys, plus minFreq.
- **Browser history** (LC 1472): a list with a cursor, or an array with a "valid end" index.
- **All O(1) data structure** (LC 432): a doubly linked list of count buckets, each holding a set of keys.

## Intrusive lists

In systems code (Linux kernel \`list_head\`), the next/prev pointers live inside the object, so an object can be removed in O(1) given only a pointer to it, with no separate node allocation. That is the real-world reason doubly linked lists survive.
`,
    doubts: [
      ["Why does interleaving make random pointers easy?", "Each original's copy is its next node. So the copy of A.random is A.random.next, available without a map."],
      ["Do I need to restore the original list?", "Usually expected: the input should be unchanged after a copy. The separation pass restores the original next pointers."],
    ],
    revise: md`
? Copy with random pointers, O(n) space? :: Map original → copy, then wire next and random.
? O(1) extra space? :: Interleave copies, set random via A.random.next, then split.
? Clone graph? :: DFS/BFS with a map from original to clone.
? LRU structure? :: Doubly linked list + hash map.
? LFU structure? :: Frequency buckets of doubly linked lists + minFreq.
`,
    pitfalls: ["Setting random before all copies exist", "Not restoring the original list", "Forgetting prev pointers when flattening doubly linked lists"],
    quiz: [Q("In the interleaving copy, copy(A).random equals…", ["A.random", "*A.random.next", "A.next.random", "null"], "Each node's copy follows it.")],
    sources: [S.article("Linked list (doubly linked, sentinel nodes)", "Wikipedia", "https://en.wikipedia.org/wiki/Doubly_linked_list"), S.article("Linux kernel linked list API", "kernel.org", "https://www.kernel.org/doc/html/latest/core-api/kernel-api.html#list-management-functions")],
    problems: [138, 133, 430, 146, 460, 1472, 432],
  },
};
