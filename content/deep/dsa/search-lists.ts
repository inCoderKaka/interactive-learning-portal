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

Binary search is not really about finding a value. It finds the **boundary** of a monotone predicate: given P(i) that is false for a prefix of indices and true for the rest (F F F T T T), find the first index where P is true. Every binary search question becomes reliable once you name P:

- lower bound (first index with a[i] ≥ x): P(i) = a[i] ≥ x;
- upper bound (first index with a[i] > x): P(i) = a[i] > x;
- exact match: lower bound, then check a[lo] == x;
- last index with a[i] ≤ x: upper bound − 1;
- count of x in a sorted array: upper bound − lower bound;
- first bad version (LC 278): P(i) = isBad(i);
- insertion position (LC 35): lower bound.

## One template

Half-open interval [lo, hi) containing the answer; hi starts at n (meaning "no index satisfies P").

\`\`\`python
def first_true(lo, hi, P):          # smallest i in [lo, hi) with P(i), or hi if none
    while lo < hi:
        mid = (lo + hi) // 2         # lo <= mid < hi
        if P(mid): hi = mid          # mid may be the answer: keep it
        else: lo = mid + 1           # mid is not the answer: discard it
    return lo
\`\`\`

[[widget:binary-search]]

**Invariant**: every index < lo has P false; every index ≥ hi has P true. The loop keeps it: if P(mid) is true, the answer is at most mid (hi = mid); otherwise it is above mid (lo = mid + 1). When lo == hi, that index is the first true (or n if none).

**Termination**: mid < hi always (floor division with lo < hi), so hi = mid strictly shrinks the range, and lo = mid + 1 strictly grows lo. The range shrinks every iteration: about log₂ n iterations.

Why hi = n and not n − 1: it lets the search return "not found" (n) without a special case, and keeps the half-open convention consistent.

## Other styles, and why to pick one

- **Closed interval** [lo, hi] with while lo ≤ hi, hi = mid − 1 / lo = mid + 1 and an early return on equality: fine for exact-match search.
- **"Last true"** (the largest index with P true for T T T F F F predicates): either search for the first false and subtract one, or use mid = (lo + hi + 1) // 2 (round up) with lo = mid / hi = mid − 1. Rounding down with lo = mid causes an **infinite loop** when hi = lo + 1.
- **lo + 1 < hi** style with sentinels lo = −1, hi = n: the invariant P(lo) false, P(hi) true; loop until they are adjacent; the answer is hi. Symmetric and popular.

Mixing conventions (half-open bounds with closed-interval updates) is where off-by-one bugs come from. Learn one template deeply and convert every problem into it.

## Overflow and rounding

- (lo + hi) / 2 overflows 32-bit integers when lo + hi > 2³¹ − 1 (a real bug that sat in Java's Arrays.binarySearch for nine years). Use lo + (hi − lo) / 2, or an unsigned shift (lo + hi) >>> 1 in Java. Python integers do not overflow.
- With negative bounds (binary search on answers that can be negative), floor division rounds toward −∞ in Python but toward zero in C/Java: lo + (hi − lo) / 2 avoids the difference.

## Library functions

| Language | lower bound | upper bound | notes |
|---|---|---|---|
| Python | bisect.bisect_left(a, x) | bisect.bisect_right(a, x) | key= parameter since 3.10 |
| C++ | std::lower_bound | std::upper_bound | iterators; also equal_range |
| Java | Arrays.binarySearch / Collections.binarySearch | none built in | returns −(insertion point) − 1 if absent; any index among duplicates |

Java's binarySearch does not guarantee which duplicate it returns: write your own lower bound when duplicates matter.

## Complexity

O(log n) predicate evaluations. If P costs O(f), the search costs O(f log n): binary search on the answer (with an O(n) feasibility check) is O(n log range).

## Beyond arrays

Binary search applies to any monotone function over an ordered domain:

- **answers** (minimum speed, capacity, time): binary search on the answer;
- **implicit arrays** (rows of a matrix, the multiplication table, an API like isBadVersion);
- **real numbers** (fixed iterations);
- **time** (the first moment something becomes true, e.g. earliest day all flowers bloom).

It does **not** speed up linked lists (no random access: finding the middle is O(n), so O(n log n) total, worse than a scan), and it needs the predicate to be monotone; on an unsorted array it is meaningless, except for special structures like peaks.

## Interview angles

- Write P(i) before the loop and say the invariant.
- Use hi = n for "not found".
- Mention overflow-safe midpoints.

## Connections

Rotated arrays and peaks, binary search on the answer, 2D searches and medians, bisection on reals, and two pointers (the linear alternative on sorted arrays).
`,
    doubts: [
      ["Why hi = n and not n − 1?", "With the half-open template, hi = n represents 'no element satisfies P'. Returning n is a meaningful answer (insert at the end). Using n − 1 would force a separate check."],
      ["Why hi = mid but lo = mid + 1?", "If P(mid) is true, mid might be the first true, so keep it (hi = mid). If false, the first true is strictly after mid. The asymmetry is exactly what guarantees progress with the lower middle."],
      ["When does the loop run forever?", "When an update does not shrink the range: lo = mid with mid = lower middle and hi = lo + 1 leaves lo unchanged. Fix by using the upper middle whenever you assign lo = mid."],
      ["Can binary search work on an unsorted array?", "It needs a monotone predicate, not literally sorted data. Peak finding works on unsorted arrays because 'a[i] < a[i + 1]' leads you uphill to some peak. Without any monotone structure, no."],
      ["Is binary search on a linked list O(log n)?", "No. Finding the middle costs O(n) each time, total O(n). Binary search needs O(1) random access."],
      ["How do I search for the first element greater than or equal to x in a descending array?", "Flip the predicate to match the order: in a descending array, P(i) = a[i] < x is F…F T…T, so first_true finds the first element smaller than x, and the answer you want is just before it. Or negate values and search the ascending array."],
      ["Is binary search ever slower than a linear scan in practice?", "For tiny arrays (a few dozen elements) a linear scan can be faster because it is branch-predictable and cache-friendly. Libraries sometimes switch to linear search below a threshold; asymptotically binary search always wins."],
      ["Can I binary search with a predicate that is expensive or has side effects?", "Yes, as long as it is monotone and deterministic. Each probe calls it once, so log n calls total (First Bad Version minimises API calls this way). Cache results if the same index can be probed twice."],
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
? lo + 1 < hi style invariant? :: P(lo) false, P(hi) true with sentinels −1 and n; answer hi.
? Java's binarySearch with duplicates? :: Returns any matching index: write a lower bound yourself.
? Unsigned midpoint in Java? :: (lo + hi) >>> 1.
? Search Insert Position? :: Lower bound.
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
## Rotated sorted arrays

A sorted array rotated at an unknown pivot, like [4, 5, 6, 7, 0, 1, 2], is no longer sorted, but it is two sorted runs, and **at least one half** around any midpoint is sorted. That is enough structure to keep binary search's O(log n).

## Search in Rotated Sorted Array (LC 33, distinct values)

At each step compare a[mid] with a[lo] to find which half is sorted:

- If a[lo] ≤ a[mid], the left half [lo, mid] is sorted. If target lies in [a[lo], a[mid]), search left (hi = mid − 1); otherwise search right.
- Otherwise the right half [mid, hi] is sorted. If target lies in (a[mid], a[hi]], search right; otherwise left.

\`\`\`python
def search(a, t):
    lo, hi = 0, len(a) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if a[mid] == t: return mid
        if a[lo] <= a[mid]:                       # left half sorted
            if a[lo] <= t < a[mid]: hi = mid - 1
            else: lo = mid + 1
        else:                                     # right half sorted
            if a[mid] < t <= a[hi]: lo = mid + 1
            else: hi = mid - 1
    return -1
\`\`\`

The range check is only possible in the sorted half; if the target is not in it, it must be in the other half (rotated or not). O(log n).

An alternative: find the rotation point (the minimum) first, then run a normal binary search on the correct run.

## Find Minimum in Rotated Sorted Array (LC 153)

Predicate: P(i) = a[i] ≤ a[n − 1] (true exactly for the run containing the minimum, which ends the array). The minimum is the first index where P is true. In loop form, compare a[mid] with a[hi]:

- a[mid] > a[hi]: the minimum is strictly right of mid: lo = mid + 1;
- otherwise: the minimum is at mid or left of it: hi = mid.

\`\`\`python
def find_min(a):
    lo, hi = 0, len(a) - 1
    while lo < hi:
        mid = (lo + hi) // 2
        if a[mid] > a[hi]: lo = mid + 1
        else: hi = mid
    return a[lo]
\`\`\`

Why compare with a[hi] and not a[lo]: if the array is not rotated at all, a[mid] ≥ a[lo] is true everywhere and gives no direction, whereas comparing with a[hi] still points left correctly. The index of the minimum equals the number of rotations.

## Duplicates (LC 81, LC 154)

With duplicates, a[lo] == a[mid] == a[hi] gives no information ([1, 1, 1, 0, 1] versus [1, 0, 1, 1, 1]). The safe move is to shrink: lo += 1 and hi −= 1 for search (after checking those elements), or hi −= 1 for the minimum (a[hi] equals a[mid], so it is not the unique minimum, or a copy remains). This degrades the worst case to **O(n)** (all elements equal except one), which is unavoidable: any algorithm must look at every position in that case.

## Peaks (LC 162)

A peak is an element greater than its neighbours (with a[−1] = a[n] = −∞). Binary search works on an **unsorted** array:

- if a[mid] < a[mid + 1], a peak exists to the right (walk uphill: either it keeps rising to the end, which is a peak, or it falls somewhere, and the top is a peak): lo = mid + 1;
- otherwise a peak exists at mid or to the left: hi = mid.

The predicate "a[i] > a[i + 1]" is not monotone, but the slope argument guarantees the half you keep contains a peak. O(log n).

- **Peak Index in a Mountain Array** (LC 852): the same with a single peak.
- **Find in Mountain Array** (LC 1095): find the peak, binary search the ascending left part, then the descending right part (with a reversed comparison). About 3 log n API calls.
- **Find a Peak Element II** (LC 1901): binary search over columns; in column mid, take the row of its maximum; compare with the left and right neighbours to choose a half. O(R log C).

## Unknown size (LC 702)

The array length is unknown (reader.get(i) returns a sentinel beyond the end). Exponential search: start with hi = 1 and double while get(hi) < target; then binary search in [hi / 2, hi]. O(log p) where p is the target's position. The same idea (galloping) is used by Timsort to merge runs.

## Rotation count and other rotated variants

- **Number of rotations** = the index of the minimum.
- **Check if Array Is Sorted and Rotated** (LC 1752): count positions where a[i] > a[(i + 1) mod n]; at most one.
- **Search a rotated array of strings or by a key**: the same logic with comparisons on keys.

## Interview angles

- Say "one half is always sorted; check the target against that half".
- For the minimum, compare with a[hi] and explain why.
- State the O(n) worst case with duplicates and why it is unavoidable.

## Connections

Binary search on predicates, exponential search, and mountain-array problems that combine a peak search with two ordinary searches.
`,
    doubts: [
      ["Why compare with a[hi] for the minimum rather than a[lo]?", "a[mid] > a[hi] proves a drop happens after mid. Comparing with a[lo] is ambiguous when the array is not rotated (a[mid] > a[lo] but the minimum is at lo)."],
      ["Why does duplicates make it O(n)?", "With [1,1,1,0,1,1,1] versus [1,1,1,1,1,0,1], the probes at lo, mid and hi can all read 1, giving no information about where the 0 is. Any algorithm may need to look at almost every element."],
      ["Why does the peak search work on an unsorted array?", "If a[mid] < a[mid + 1], walking right from mid goes up at least once; following increases you must eventually hit a peak (the boundary counts as −∞). So the right half contains a peak, and the invariant 'a peak exists in [lo, hi]' is preserved."],
      ["Can I find the rotation point first and then search normally?", "Yes: find the minimum's index k with the a[hi] comparison. If k == 0 the array is not rotated: search all of it. Otherwise, if target ≥ a[0], search [0, k − 1]; else search [k, n − 1]. Two O(log n) searches, and each is an ordinary binary search."],
      ["Why does LC 33 use a[lo] ≤ a[mid] (with ≤)?", "When lo == mid (two elements left), the left \"half\" is the single element a[lo], which is trivially sorted. Using < would misclassify it and send the search the wrong way."],
      ["Does the peak search find the global maximum?", "No, only some local peak. The global maximum of an unsorted array needs O(n) time; binary search works for peaks precisely because any peak is acceptable."],
    ],
    revise: md`
? Rotated search key fact? :: One half around mid is always sorted.
? Minimum of rotated array rule? :: a[mid] > a[hi] → lo = mid + 1; else hi = mid.
? Duplicates? :: If a[mid] == a[hi], hi−− ; worst case O(n).
? Peak rule? :: a[mid] < a[mid+1] → go right; else go left.
? Unknown size? :: Exponential search: double hi, then binary search.
? Find in Mountain Array? :: Find the peak, then search each side.
? Find in Mountain Array steps? :: Find the peak, search the ascending part, then the descending part (reversed comparison).
? Peak Element II? :: Binary search columns using each column's max row: O(R log C).
? Sorted-and-rotated check? :: At most one descent i with a[i] > a[(i+1) mod n].
? Minimum predicate? :: P(i) = a[i] ≤ a[n−1].
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

Some optimisation problems are hard to solve directly but easy to **check**: "can we ship all packages in D days with capacity C?" is a greedy scan, while "what is the minimum capacity?" seems to need search. If feasibility is **monotone** in the answer (if capacity C works, every larger capacity works), the set of feasible answers is a suffix of the range, and binary search finds its smallest element.

Recipe:

1. Identify the answer variable x and its range [lo, hi] (a value certainly infeasible or minimal, and one certainly feasible).
2. Write feasible(x), usually a greedy O(n) pass.
3. Check monotonicity (one sentence of reasoning).
4. Binary search for the first feasible x (or the last, for maximisation).

Total cost: O(n · log(hi − lo)).

## Worked example: Koko Eating Bananas (LC 875)

Piles p, h hours; at speed k Koko eats min(k, pile) bananas per hour from one pile. Find the minimum k to finish in h hours.

- feasible(k): Σ ceil(p_i / k) ≤ h, with ceil(p / k) = (p + k − 1) // k.
- Monotone: a higher speed never needs more hours.
- Range: [1, max(p)] (at speed max(p) each pile takes one hour, the minimum possible).

\`\`\`python
def min_eating_speed(piles, h):
    lo, hi = 1, max(piles)
    while lo < hi:
        mid = (lo + hi) // 2
        if sum((p + mid - 1) // mid for p in piles) <= h: hi = mid
        else: lo = mid + 1
    return lo
\`\`\`

O(n log max(p)).

## The family

"Minimise the maximum" and "maximise the minimum" are the strongest hints.

| Problem | Answer variable | Feasibility check | Range |
|---|---|---|---|
| Capacity To Ship Packages Within D Days (LC 1011) | capacity | greedy fill per day, count days ≤ D | [max(w), Σw] |
| Split Array Largest Sum (LC 410) | largest part sum | greedy count of parts ≤ k | [max(a), Σa] |
| Minimum Days to Make m Bouquets (LC 1482) | day | count runs of k bloomed flowers | [min(day), max(day)] |
| Magnetic Force Between Two Balls (LC 1552) | minimum gap (maximise) | place greedily from the left with gap ≥ x | [1, (max − min)] |
| Minimized Maximum of Products Distributed (LC 2064) | max per store | Σ ceil(q / x) ≤ n | [1, max(q)] |
| Minimum Time to Complete Trips (LC 2187) | time | Σ floor(t / time_i) ≥ total | [1, min(time)·total] |
| Maximum Candies Allocated to K Children (LC 2226) | pile size (maximise) | Σ floor(c / x) ≥ k | [1, max(c)] |
| Minimum Limit of Balls in a Bag (LC 1760) | max bag size | Σ (b − 1) // x ≤ ops | [1, max(b)] |
| Swim in Rising Water (LC 778) | time | BFS through cells ≤ t | [grid min, grid max] |
| Path With Minimum Effort (LC 1631) | effort | BFS with steps ≤ e | [0, max height diff] |
| Aggressive cows, book allocation, painter's partition (classics) | as above | greedy | |

## "K-th smallest" via counting

To find the k-th smallest value in a set that is hard to list but easy to **count below a threshold**, binary search on the value v with feasible(v) = count(elements ≤ v) ≥ k.

- **Kth Smallest Element in a Sorted Matrix** (LC 378): count with a staircase in O(R + C).
- **Kth Smallest Number in Multiplication Table** (LC 668): count(v) = Σ min(v // i, n) over rows i.
- **Find K-th Smallest Pair Distance** (LC 719): sort; count pairs with distance ≤ v with two pointers in O(n).
- **K-th Smallest Prime Fraction** (LC 786): binary search on a real value with a two-pointer count (or a heap).
- **Median of a row-sorted matrix**: count via per-row upper bounds.

The result is always an actual element: the smallest v with count ≥ k cannot lie strictly between two consecutive elements, because count would not change there.

## Real-valued answers

When the answer is a real number (Maximum Average Subarray II, LC 644; minimum radius; time), binary search over reals for a fixed number of iterations (about 60–100 halvings shrink any reasonable range below 1e−9) instead of comparing floats for equality. LC 644 checks "is there a subarray of length ≥ k with average ≥ m?" by subtracting m from every element and testing whether some subarray of length ≥ k has a non-negative sum (prefix sums with a running minimum).

## Proving the greedy check

The feasibility check must be correct for a fixed x. For splitting into pieces with a maximum sum x, the greedy "fill the current piece until adding the next element would exceed x" minimises the number of pieces: an exchange argument shows any valid split can be transformed into the greedy one without increasing the count (moving the cut later never hurts the remaining part). State this when asked "why is your check optimal?".

## Alternatives to name

- A direct formula or a heap can sometimes beat O(n log range) (e.g. the minimum number of pieces is a simple DP; LC 410 has an O(n²k) DP that binary search beats).
- **Parametric search** generalises this to more complex settings.
- If feasibility is **not** monotone, binary search is invalid: look for a different structure (ternary search for unimodal functions, or DP).

## Interview angles

- Say the answer space, the check, its cost, and the monotonicity reason.
- Pick tight bounds (they also prove termination).
- For k-th smallest problems, explain why the result is an element.

## Connections

Binary search boundaries (first true), greedy algorithms (the checks), two pointers (counting below a threshold), and BFS (graph feasibility checks).
`,
    doubts: [
      ["How do I know the answer space bounds?", "lo = the smallest value that could possibly work (often the largest single item, since one item must fit), hi = a value that certainly works (the total, the max element, or 10⁹). If unsure, a wide safe range costs only a few extra iterations."],
      ["Why is the kth-smallest answer always a real element?", "The predicate count(≤ x) ≥ k first becomes true at some x where count jumps, and count only jumps at element values. So the first such x is an element."],
      ["Is binary search on the answer always O(n log range)?", "It is (cost of feasible) × log(range). With range up to 10¹⁸ that is about 60 iterations."],
      ["What if feasibility is not monotone?", "Then binary search is wrong. Example: 'can we split into exactly k parts with max ≤ x' is not monotone in a useful way unless you phrase it as 'at most k parts'. Rephrase until it is monotone, or use another method."],
      ["How do I binary search for the largest feasible value (maximise the minimum)?", "Feasibility is now true for small x and false for large x (T…T F…F). Search for the first infeasible x with first_true(P = not feasible) and subtract one, or use the round-up midpoint with lo = mid on success."],
      ["What if the check itself needs a binary search?", "Then the total is O(n log n · log range) or similar: acceptable for n up to about 10⁵. Make sure the inner search is also on a monotone predicate."],
      ["How tight must the initial bounds be?", "Only correct: lo must be at most the answer and hi at least the answer (hi must be feasible for \"minimise\"). Tighter bounds save a few iterations; loose but correct bounds (like 10¹⁸) still converge in about 60 steps."],
    ],
    revise: md`
? Three ingredients? :: An answer range, a feasible(x) check, and monotonic feasibility.
? Complexity? :: O(cost of check × log(range)).
? Koko check? :: Σ ceil(pile / k) ≤ h.
? Split array largest sum check? :: Greedy: start a new part when the sum would exceed x; parts ≤ m.
? Maximise the minimum gap? :: Search the gap; greedily place items left to right.
? Kth smallest in an implicit set? :: Search value x; predicate count(≤ x) ≥ k.
? Real-valued answer? :: Fixed number of iterations.
? Minimum Limit of Balls in a Bag check? :: Σ (b − 1) // x ≤ maxOperations.
? Maximum Average Subarray II check? :: Subtract m; is there a length ≥ k subarray with non-negative sum (prefix − running min)?
? Kth Smallest Pair Distance count? :: Sorted array + two pointers: pairs with distance ≤ v in O(n).
? Maximise-the-minimum template? :: Find the last feasible x (or first infeasible − 1).
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
## Two families

This page covers two classic binary searches that look unusual: searching sorted matrices, and finding the median (or k-th element) of two sorted arrays in logarithmic time. Both rely on the same principle: use the sorted structure to discard a constant fraction (or a whole row or column) per comparison.

## Fully sorted matrix (LC 74)

Rows are sorted and each row starts after the previous ends: reading row by row gives one sorted sequence of R·C values. Binary search over virtual indices k ∈ [0, R·C), reading the element at (k // C, k % C). O(log(R·C)).

## Row- and column-sorted matrix (LC 240)

Rows sorted left to right, columns top to bottom, but rows overlap. Start at the **top-right** corner: if the value is larger than the target, the whole column below is larger too: move left; if smaller, the whole row to the left is smaller: move down. Each step discards a row or a column: O(R + C). (Bottom-left works symmetrically; top-left and bottom-right do not, because both moves go in the same direction of value.)

When R ≪ C, binary searching each row (O(R log C)) is faster. The same staircase **counts** elements ≤ x in O(R + C), which powers "k-th smallest in a sorted matrix" via binary search on the value (see binary search on the answer).

## Median of Two Sorted Arrays (LC 4)

Arrays A (length m) and B (length n), m ≤ n (swap if needed). The median splits the combined sorted sequence into a left half of size half = (m + n + 1) // 2 and a right half. Choose how many elements i the left half takes from A; then it takes j = half − i from B.

The split is correct iff every element on the left is ≤ every element on the right:

- A[i − 1] ≤ B[j] and B[j − 1] ≤ A[i]

(with A[−1] = B[−1] = −∞ and A[m] = B[n] = +∞ for the boundary cases i = 0, i = m, j = 0, j = n).

Binary search i in [0, m]:

- if A[i − 1] > B[j], i is too large: hi = i − 1;
- else if B[j − 1] > A[i], i is too small: lo = i + 1;
- else the split is correct: the median is max(A[i − 1], B[j − 1]) if m + n is odd, otherwise (max(A[i − 1], B[j − 1]) + min(A[i], B[j])) / 2.

\`\`\`python
def find_median(A, B):
    if len(A) > len(B): A, B = B, A
    m, n = len(A), len(B); half = (m + n + 1) // 2
    lo, hi = 0, m
    INF = float("inf")
    while lo <= hi:
        i = (lo + hi) // 2; j = half - i
        aL = A[i - 1] if i > 0 else -INF; aR = A[i] if i < m else INF
        bL = B[j - 1] if j > 0 else -INF; bR = B[j] if j < n else INF
        if aL > bR: hi = i - 1
        elif bL > aR: lo = i + 1
        else:
            if (m + n) % 2: return max(aL, bL)
            return (max(aL, bL) + min(aR, bR)) / 2
\`\`\`

O(log min(m, n)). Searching on the **shorter** array keeps j in range (0 ≤ j ≤ n for every i in [0, m]).

Why the two conditions suffice: within A and within B the halves are already ordered (arrays are sorted), so only the two cross comparisons can fail; when both hold, the left part contains exactly the half smallest elements.

## K-th smallest of two arrays

A simpler-to-explain logarithmic method: compare A[k/2 − 1] and B[k/2 − 1] (clamped to array lengths). The smaller one and everything before it in its array cannot be the k-th element (at most k − 2 elements can be smaller than it), so discard those k/2 elements and look for the (k − k/2)-th in the rest. O(log k). The median is the k-th smallest for k = (m + n + 1)/2 (and the next one for even totals).

## Linear alternative to know

Merge the two arrays with two pointers until reaching the middle: O(m + n) time, O(1) space. Give it first as the baseline, then the logarithmic partition method.

## Interview angles

- Explain the partition condition and the boundary sentinels before coding.
- Search on the shorter array.
- For matrices, start the staircase at the top-right and explain the discard.

## Connections

Binary search on predicates, staircase search, k-th smallest by counting, and quickselect (the unsorted version of "k-th element").
`,
    doubts: [
      ["Why does starting at the top-right corner work?", "At the top-right, moving left decreases and moving down increases, so each comparison tells you which direction and lets you discard an entire row or column. At the top-left both moves increase, so a comparison does not decide anything."],
      ["Why is the partition condition sufficient?", "If every element on the left side (A[..i−1] and B[..j−1]) is ≤ every element on the right side, then the left side contains exactly the smallest half, so the median sits at the boundary. Within each array the order is already sorted, so only the two cross comparisons need checking."],
      ["How do I handle i = 0 or i = m?", "Treat A[−1] as −∞ and A[m] as +∞ (same for B). Then the conditions remain valid at the edges."],
      ["Why does the half use (m + n + 1) // 2?", "For an odd total, it puts the median itself in the left half, so the answer is max of the left side. For an even total, it splits evenly, and the median averages the left max and right min. One formula covers both."],
      ["How do I handle empty arrays?", "If A is empty after swapping (m = 0), i is always 0, aL = −∞ and aR = +∞, and the code returns the median of B directly. Both empty is invalid input."],
      ["Is the k-th smallest method easier to get right than the partition method?", "Many find it easier to reason about (discard k/2 elements per step) and it generalises to any k. The partition method is shorter once understood. Know one well."],
    ],
    revise: md`
? Fully sorted matrix search? :: Flatten: index k → (k / C, k mod C).
? Row/col-sorted search start and rule? :: Top-right: too big → left, too small → down. O(R + C).
? Kth smallest in a sorted matrix? :: Binary search on value + staircase count, or a heap.
? Median partition condition? :: A[i−1] ≤ B[j] and B[j−1] ≤ A[i].
? Which array do you search? :: The smaller one: O(log min(m, n)).
? Median value from the partition? :: Odd: max of left maxima; even: average with min of right minima.
? Median partition sizes? :: Left half = (m + n + 1) // 2; i from A, j = half − i from B.
? Too far right test? :: A[i−1] > B[j] ⇒ hi = i − 1.
? K-th of two arrays step? :: Compare A[k/2−1] and B[k/2−1]; drop the smaller block; k −= dropped.
? Why search the shorter array? :: Keeps j = half − i within [0, n].
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
## Bisection on real numbers

When the answer is a real number and a monotone test exists ("is the answer at least x?"), binary search works on reals exactly as on integers, except that the range never becomes empty: you stop by precision.

Two stopping rules:

- **Fixed iterations** (recommended): each iteration halves the range; 100 iterations shrink any range by 2¹⁰⁰, far below double precision. No tolerance to tune, no infinite loops from floating-point quirks.
- **Tolerance**: while hi − lo > eps. Simple, but with large magnitudes, lo and hi may stop changing before the gap drops below eps (adjacent doubles are farther apart than eps), creating an infinite loop.

\`\`\`python
def bisect_real(lo, hi, ok, iters=100):        # ok(x) false…false true…true
    for _ in range(iters):
        mid = (lo + hi) / 2
        if ok(mid): hi = mid
        else: lo = mid
    return hi
\`\`\`

Uses:

- **Square root / cube root** to a given precision (Sqrt(x), LC 69, uses the integer version: the largest m with m·m ≤ x).
- **Maximum Average Subarray II** (LC 644): bisect the average m; check whether some subarray of length ≥ k has average ≥ m by subtracting m and looking for a non-negative-sum window.
- **Minimum speed, time or radius** problems with real answers.
- **Root finding**: a continuous function with f(lo) < 0 < f(hi) has a root in between (intermediate value theorem); bisection converges linearly (one bit per iteration). Newton's method converges quadratically when it converges, but needs derivatives and good starts.

## Ternary search

Finds the maximum (or minimum) of a **unimodal** function: strictly increasing then strictly decreasing.

Pick m1 = lo + (hi − lo)/3 and m2 = hi − (hi − lo)/3. If f(m1) < f(m2), the maximum cannot be in [lo, m1] (it lies to the right of m1): lo = m1. Otherwise hi = m2. Each step keeps 2/3 of the range: about log_{1.5}(range / eps) evaluations, roughly twice as many as bisection needs.

**On integers**, a cleaner method: binary search for the first index where f(i) ≥ f(i + 1) (the descent starts); that index is the peak. This is just a peak search, needs one comparison of neighbours per step, and avoids the off-by-one traps of integer ternary search.

**Plateaus break ternary search**: if f(m1) == f(m2) on a flat region, you cannot tell which side the maximum is on. The function must be strictly unimodal (or you need extra structure).

## Golden-section search

A refinement of ternary search that places the probes at the golden ratio (about 0.618 of the range) so that one of the two function evaluations can be **reused** in the next step. Each step then costs one evaluation and shrinks the range by 0.618: the most evaluation-efficient method for expensive unimodal functions (common in numerical optimisation).

## Convexity in interviews

Many "minimise a sum of distances" problems have closed forms because the cost is convex:

- **Σ |x − a_i|** (sum of absolute deviations) is minimised at the **median** (any point between the two middle values for an even count). Minimum Moves to Equal Array Elements II (LC 462), Best Meeting Point (LC 296: medians per coordinate).
- **Σ (x − a_i)²** is minimised at the **mean**.
- **max |x − a_i|** is minimised at the midpoint of the minimum and maximum.
- **Σ w_i·|x − a_i|** (weighted) is minimised at the weighted median.
- A sum of convex functions is convex, so ternary search (or binary search on the derivative's sign) works for complicated convex costs: Minimum Cost to Make Array Equal (LC 2448: cost Σ c_i·|x − a_i| is convex in x; ternary search or the weighted median).
- **Convex functions on integers**: binary search on the discrete derivative f(x + 1) − f(x) ≥ 0.

## Interview angles

- Use fixed iterations for real bisection; avoid float equality.
- Prefer a binary search on the derivative (or neighbour comparison) over integer ternary search.
- Recognise median and mean optimisations before reaching for search at all.

## Connections

Binary search on the answer, peak finding, convex optimisation, and Newton's method for faster numerical convergence.
`,
    doubts: [
      ["Why prefer a fixed number of iterations?", "Doubles have about 15–16 significant digits. Near 10⁹ the smallest representable step is about 1e-7, so a loop waiting for hi − lo < 1e-9 may never end. 100 halvings always finish and reach full precision."],
      ["Ternary or binary search on integers?", "Binary search on the slope predicate f(x) < f(x+1) is simpler and has no thirds arithmetic. It requires the same strict unimodality."],
      ["Where is the sum of absolute deviations minimised?", "At any median of the points. For squared deviations, at the mean. These closed forms remove the need for searching."],
      ["How many iterations does ternary search need compared with bisection?", "Ternary keeps 2/3 of the range per step with two evaluations, so it needs about log(range/eps)/log(1.5) ≈ 1.7 times as many steps as bisection, and each step costs two evaluations. Golden-section reduces the evaluations to one per step."],
      ["Why does Sqrt(x) use integer binary search instead of real bisection?", "It asks for the floor of the square root, an integer: the largest m with m·m ≤ x is a \"last true\" boundary, found exactly with integer binary search and no floating-point error. Use m ≤ x // m to avoid overflow in fixed-width languages."],
      ["Is Newton's method acceptable in interviews?", "For square roots, yes (x_{k+1} = (x_k + n/x_k)/2 converges very fast); explain the starting point and the stopping rule. For general problems, bisection is safer because it always converges given a sign change."],
    ],
    revise: md`
? Bisection loop control? :: Fixed iterations (e.g. 100), not an epsilon test.
? Ternary search requirement? :: Strict unimodality.
? Integer unimodal maximum without thirds? :: First x with f(x) > f(x+1).
? Minimise Σ|x − aᵢ|? :: Any median.
? Minimise Σ(x − aᵢ)²? :: The mean.
? Weighted sum of absolute deviations minimiser? :: The weighted median.
? max |x − a_i| minimiser? :: Midpoint of min and max.
? Golden-section benefit? :: Reuses one evaluation per step (one new evaluation, range × 0.618).
? LC 2448? :: Convex cost: ternary search or weighted median.
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

A singly linked list is a chain of nodes, each holding a value and a pointer to the next node; the last node points to null. A doubly linked list adds a pointer to the previous node. Unlike arrays:

- access by index is O(n) (walk from the head);
- insertion or deletion **after a node you already hold** is O(1) (rewire two pointers), with no shifting;
- nodes live anywhere in memory, so traversal has poor cache locality, and each node carries pointer overhead.

Linked lists matter in interviews because they test pointer manipulation, and in practice because they are the backbone of LRU caches, free lists, adjacency lists, hash-table chaining and the Linux kernel's intrusive lists.

## The dummy (sentinel) node

Many operations may change the head: deleting the first node, merging, partitioning, inserting before the head. Writing special cases for "the head changes" is error-prone. A **dummy** node placed before the head turns the head into an ordinary "next" pointer:

\`\`\`python
def remove_elements(head, val):          # LC 203
    dummy = ListNode(0, head)
    prev = dummy
    while prev.next:
        if prev.next.val == val: prev.next = prev.next.next
        else: prev = prev.next
    return dummy.next
\`\`\`

Use a dummy whenever the head may change or when building a new list by appending (keep a tail pointer starting at the dummy). Return dummy.next.

## Core operations

- **Traverse**: while cur: …; cur = cur.next.
- **Insert after p**: n.next = p.next; p.next = n (in this order, or the rest of the list is lost).
- **Delete after p**: p.next = p.next.next.
- **Delete a node without its predecessor** (LC 237, the node is not the tail): copy the next node's value into it and delete the next node instead. It works because the caller only sees values; it fails for the tail and is a trick, not a general deletion.
- **Length**: count while traversing; many problems need it first (rotate, k-th from the end by length).
- **Remove the N-th node from the end** (LC 19): move a lead pointer n steps ahead from the dummy, then move both until the lead reaches the last node; the trailing pointer is just before the target. The dummy handles removing the head.
- **Intersection of two lists** (LC 160): walk a from headA and b from headB; when one reaches the end, restart it at the other list's head. Both travel lenA + lenB steps and meet at the intersection (or both reach null together). O(1) space.
- **Middle node**: fast and slow pointers.

## Add Two Numbers (LC 2)

Digits are stored in reverse order (least significant first), which matches addition: walk both lists with a carry, appending (x + y + carry) % 10 to a new list behind a dummy, and append a final carry node if it remains. O(max(m, n)).

**Add Two Numbers II** (LC 445): digits in forward order. Push both lists' digits onto stacks (or reverse the lists), add from the top, and build the result by prepending nodes. **Plus One Linked List** (LC 369): find the last non-9 digit, increment it, and zero everything after it (handle all 9s with a new head).

## Doubly linked lists in design problems

O(1) removal of a known node needs the predecessor; a doubly linked list stores it. Combined with a hash map from key to node, it gives O(1) "find and move" operations:

- **LRU Cache** (LC 146): hash map key → node, list ordered by recency; move to front on access, evict the tail.
- **All O(1) Data Structure** (LC 432): a list of count buckets.
- **Design Browser History**, **text editors** (Design a Text Editor, LC 2296: a cursor in a doubly linked list or two stacks).

Use **two sentinels** (head and tail) so insertion and removal never check for null neighbours.

## Practical note

- Draw boxes and arrows for every non-trivial rewiring; update pointers in a safe order (save next before overwriting it).
- Test with lists of length 0, 1 and 2, and with the operation hitting the head or the tail.
- In C++, free deleted nodes (or use smart pointers); in garbage-collected languages, removing references is enough.
- In real systems, arrays (vectors, deques) usually beat linked lists even for many insertions, because of cache behaviour; linked lists win when you already hold node pointers (intrusive lists, LRU).

## Interview angles

- Reach for a dummy node by default; explain what it removes.
- Say the order of pointer updates out loud.
- Know the two-pointer tricks (n-th from the end, intersection, middle).

## Connections

Reversal, fast/slow pointers, merging and sorting lists, and list-backed designs (LRU, LFU) all build on these operations.
`,
    doubts: [
      ["When exactly do I need a dummy node?", "Whenever the head can change (it may be deleted, or something may be inserted before it). The dummy gives the head a predecessor so the same code handles all positions."],
      ["How can I delete a node without its predecessor?", "Copy the next node's value and pointer into it, effectively deleting the next node. It fails for the last node and changes node identity (bad if other code holds references)."],
      ["Should I free deleted nodes in C++?", "In real code, yes (or use smart pointers). In interviews, mention it; LeetCode-style harnesses often own the nodes."],
      ["How do I detect whether two lists intersect without modifying them?", "The switching-heads walk: if they intersect, both pointers meet at the first shared node after lenA + lenB − shared steps; if not, both become null at the same time. Alternatively compare the tail nodes: two lists intersect iff they share the same last node."],
      ["Is recursion a good idea for linked lists?", "It is elegant (reverse, merge) but uses O(n) stack; with 10⁵ nodes Python overflows its recursion limit. Prefer iteration for long lists and mention the recursive version."],
      ["When should I convert a linked list to an array?", "When the problem needs random access or sorting and memory allows: O(n) extra space but simpler code. Interviewers often ask for O(1) extra space afterwards, which requires pointer techniques."],
    ],
    revise: md`
? Why a dummy head? :: Gives the head a predecessor: no special cases when the head changes.
? Remove N-th from end in one pass? :: Lead pointer n ahead, then advance both.
? Delete a node given only the node? :: Copy next's value, skip next (not for the tail).
? LRU cache structure? :: Hash map + doubly linked list with sentinels.
? Add Two Numbers (reverse order)? :: Walk both with a carry into a dummy-headed list.
? Plus One Linked List? :: Increment the last non-9 digit, zero the rest; new head if all 9s.
? Design a Text Editor? :: Cursor in a doubly linked list (or two stacks of characters).
? Insert after p order? :: n.next = p.next, then p.next = n.
? Why two sentinels in a doubly linked list? :: No null checks at either end for insert/remove.
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

Reversing a linked list rewires each node's next pointer to point to its predecessor. Three pointers do it in one pass:

\`\`\`python
def reverse(head):
    prev, cur = None, head
    while cur:
        nxt = cur.next        # 1. save the rest of the list
        cur.next = prev       # 2. point backwards
        prev = cur            # 3. advance prev
        cur = nxt             # 4. advance cur
    return prev               # new head
\`\`\`

[[widget:linked-reverse]]

O(n) time, O(1) space. Saving next **before** re-pointing is essential: once cur.next is overwritten, the rest of the list is unreachable.

Invariant: prev is the head of the already-reversed prefix; cur is the head of the remaining original suffix.

**Recursive version**: reverse the rest, then make the next node point back:

\`\`\`python
def reverse_rec(head):
    if not head or not head.next: return head
    new_head = reverse_rec(head.next)
    head.next.next = head
    head.next = None
    return new_head
\`\`\`

Elegant, but O(n) stack: prefer iteration for long lists.

## Reverse between m and n (LC 92)

Reverse only positions m..n (1-based). Walk a pointer pre to the node before position m (use a dummy so m = 1 works). Then repeatedly move the node after the sublist's first node to the front of the sublist ("head insertion"), n − m times:

\`\`\`python
def reverse_between(head, m, n):
    dummy = ListNode(0, head); pre = dummy
    for _ in range(m - 1): pre = pre.next
    cur = pre.next
    for _ in range(n - m):
        nxt = cur.next
        cur.next = nxt.next          # unlink nxt
        nxt.next = pre.next          # insert it right after pre
        pre.next = nxt
    return dummy.next
\`\`\`

One pass, O(1) space. cur (the original m-th node) ends as the sublist's tail automatically.

## Reverse in k-groups (LC 25)

Reverse every consecutive block of k nodes; a final block shorter than k stays as is.

For each group: check that k nodes remain (walk k steps from the group start; if you hit null, stop). Reverse those k nodes (the standard loop, bounded to k steps). Connect: the previous group's tail points to the new group head; the old group head (now the tail) points to the next group's start, and becomes the "previous tail" for the next iteration. A dummy node serves as the first "previous tail".

**Swap Nodes in Pairs** (LC 24) is k = 2 (swap by rewiring, not by swapping values). **Reverse Nodes in Even Length Groups** (LC 2074) varies the group size.

## Reorder List (LC 143)

L0 → Ln → L1 → Ln−1 → …, in place:

1. Find the middle (fast/slow pointers).
2. Reverse the second half.
3. Merge the two halves alternately.

O(n) time, O(1) space. The three steps are three standard routines: a good test of composing them.

## Palindrome Linked List (LC 234) in O(1) space

Find the middle, reverse the second half, compare it with the first half node by node, then reverse the second half back to restore the list (callers may expect it unchanged). O(n) time, O(1) space. (O(n) space alternative: copy values into an array.)

## Rotate List (LC 61)

Rotate right by k: compute the length L and the tail; k = k mod L (k can exceed L); if k == 0 return. Connect the tail to the head (a cycle), walk L − k steps from the head to the new tail, break the cycle there; the next node is the new head.

## Other reversal-based problems

- **Maximum Twin Sum of a Linked List** (LC 2130): reverse the second half and sum pairs.
- **Odd Even Linked List** (LC 328): not a reversal but a similar rewiring of two chains.
- **Reverse a doubly linked list**: swap prev and next in every node, return the old tail.
- **Print a list in reverse** without modifying it: recursion or a stack.

## Interview angles

- Write the four-line loop from memory and state the invariant.
- For partial reversals, use a dummy and head insertion.
- Test with k = 1, k = length, and lists shorter than k.

## Connections

Fast/slow pointers (middle), merging (reorder), stacks (reverse order without rewiring), and recursion.
`,
    doubts: [
      ["Why save next before re-pointing?", "Once cur.next points back to prev, the forward link to the rest of the list is gone. Saving it first is the whole trick."],
      ["Recursive or iterative in an interview?", "Iterative: O(1) space and no stack risk. Know the recursive one as a follow-up."],
      ["In k-group reversal, how do I connect groups?", "Keep groupPrev (the node before the group). After reversing, groupPrev.next must point to the group's new head, and the group's old head (now its tail) must point to the next group's first node. Then groupPrev = old head."],
      ["Why is head insertion better than \"cut out, reverse, reconnect\" for LC 92?", "Both are O(n), but head insertion needs no separate bookkeeping for the sublist's ends: pre stays fixed, cur stays as the moving tail, and each step moves one node. Cutting and reconnecting needs four boundary pointers and is easier to get wrong."],
      ["How do I verify my reversal code quickly?", "Trace it on a 3-node list (1 → 2 → 3) writing prev, cur and nxt after each iteration, then check the empty list and a single node. Most bugs show up in those three cases."],
      ["Does reversing in k-groups need extra space?", "No: O(1) extra pointers per group. The check that k nodes remain costs an extra walk per group, which keeps total time O(n)."],
    ],
    revise: md`
? Iterative reversal loop? :: nxt = cur.next; cur.next = prev; prev = cur; cur = nxt.
? Recursive reversal space? :: O(n) stack.
? Reverse sublist [m, n]? :: Dummy, walk to node before m, reverse n − m + 1 nodes, reconnect both ends.
? k-group: what if fewer than k nodes remain? :: Leave them as they are.
? Reorder list recipe? :: Middle, reverse second half, merge alternately.
? Palindrome list in O(1) space? :: Reverse the second half and compare (restore afterwards).
? Reverse between: what does cur become? :: The sublist's tail (it stays in place while nodes move ahead of it).
? Twin sum (LC 2130)? :: Reverse the second half, sum pairs.
? Reverse a doubly linked list? :: Swap prev and next in each node; old tail is the new head.
? Rotate List cycle trick? :: Connect tail to head, walk L − k, break.
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
## Two speeds

Two pointers move along a linked list (or any "next" function) at different speeds: slow one step, fast two steps. The gap between them grows by one per move, which reveals structure without extra memory: where the middle is, whether there is a cycle, and where the cycle starts.

## Middle of the list (LC 876)

\`\`\`python
def middle(head):
    slow = fast = head
    while fast and fast.next:
        slow, fast = slow.next, fast.next.next
    return slow                 # second middle for even lengths
\`\`\`

When fast reaches the end, slow has moved half as far. For even lengths this returns the second middle; for the first middle (needed when splitting for merge sort), start fast at head.next.

## Cycle detection: Floyd's tortoise and hare

If the list has a cycle, fast enters it and keeps going around; slow enters later. Once both are inside, each move reduces the distance from fast to slow (measured along the cycle in the direction of travel) by exactly one, so fast cannot "jump over" slow: they meet within one lap of slow. If there is no cycle, fast reaches null.

\`\`\`python
def has_cycle(head):              # LC 141
    slow = fast = head
    while fast and fast.next:
        slow, fast = slow.next, fast.next.next
        if slow is fast: return True
    return False
\`\`\`

[[widget:floyd-cycle]]

O(n) time, O(1) space (a hash set of visited nodes works too, with O(n) space).

## Finding the cycle's entrance (LC 142)

After they meet, reset one pointer to the head and move both **one step at a time**; they meet exactly at the cycle's entrance.

Why: let a = the distance from the head to the entrance, b = the distance from the entrance to the meeting point, c = the cycle length. When they meet, slow has walked a + b and fast 2(a + b), and fast has walked some whole number of extra laps: 2(a + b) = a + b + k·c, so a + b = k·c, hence a = k·c − b. Walking a steps from the meeting point brings you to (b + a) = k·c from the entrance, i.e. back to the entrance; walking a steps from the head also reaches the entrance. So they meet there.

**Cycle length**: from the meeting point, move one pointer until it returns: c steps.

## Functional graphs: Find the Duplicate Number (LC 287)

n + 1 numbers in [1, n], exactly one repeated (possibly many times), with O(1) extra space and without modifying the array. Treat the array as a function i → nums[i]: starting from index 0 (no number points to 0, so 0 is outside every cycle), following the function forms a "rho" shape. Two indices map to the duplicate value, so the duplicate is where the tail enters the cycle: run Floyd from 0 and find the entrance. O(n) time, O(1) space.

Other functional-graph uses:

- **Happy Number** (LC 202): iterate "sum of squares of digits"; either reach 1 or loop; Floyd detects the loop in O(1) space.
- **Circular Array Loop** (LC 457): a cycle of length > 1 moving in one direction: Floyd from each start, with direction checks and marking visited starts.
- **Pseudo-random generators**: detect the period of x_{n+1} = f(x_n); Pollard's rho factorisation uses the same cycle detection.

## Brent's algorithm

Instead of moving both pointers, keep a "power" counter: move the hare one step at a time, and teleport the tortoise to the hare's position whenever the step count reaches a power of two. It finds the cycle length directly and uses fewer function evaluations than Floyd on average (about 36% fewer in Brent's analysis). Useful when evaluating f is expensive.

## Other uses of fast and slow

- **k-th node from the end**: lead pointer k ahead (different start, same speed).
- **Split a list into halves** for merge sort.
- **Palindrome Linked List** and **Reorder List**: find the middle first.
- **Detect a cycle in a sequence defined by a rule** (state repetition in simulations).
- **Delete the Middle Node** (LC 2095): stop slow one node before the middle (start fast two ahead).

## Interview angles

- Explain why they must meet (the gap shrinks by one per step) and derive a = k·c − b.
- Handle the even-length middle convention explicitly.
- Recognise Find the Duplicate as a linked list in disguise.

## Connections

Linked-list basics, functional graphs and cycle detection in graphs, and Pollard's rho in number theory.
`,
    doubts: [
      ["Why are fast and slow guaranteed to meet inside a cycle (not jump over each other)?", "Once both are in the cycle, the distance from fast to slow (measured forward) decreases by exactly 1 per step. It must reach 0, so they meet; skipping is impossible with speeds 1 and 2."],
      ["Why does resetting to head find the entrance?", "At the meeting point slow has walked μ + a and fast 2(μ + a); their difference μ + a is a multiple of λ. So a pointer at the meeting point that walks μ steps ends at a + μ ≡ 0 (mod λ) from the entrance, i.e. at the entrance, exactly when a pointer from head walks μ steps to arrive there too."],
      ["Find the Duplicate: why start at index 0?", "Values are in [1, n], so no value points to index 0: index 0 is never inside the cycle, it is the start of the 'tail'. The cycle's entrance is the node with two incoming pointers, which is the duplicated value."],
      ["Could fast move three steps instead of two?", "Detection still works in many cases, but the gap then shrinks by two per step and can skip over slow when the cycle length is even relative to the gap, delaying or (in some setups) complicating the meeting, and the entrance formula changes. Two steps make the gap shrink by exactly one, which guarantees a meeting within one lap and keeps the entrance math simple."],
      ["Is the hash-set method acceptable?", "Yes as a first answer (O(n) time, O(n) space). The follow-up is almost always \"O(1) space\", which is Floyd."],
      ["How do I find the node just before the cycle entrance (to break the cycle)?", "Find the entrance e, then walk around the cycle from e until node.next is e; set that node's next to null. O(c)."],
    ],
    revise: md`
? Middle with first-middle bias? :: Loop while fast.next and fast.next.next.
? Why must the pointers meet in a cycle? :: The gap shrinks by 1 per step inside the cycle.
? Cycle entrance? :: After meeting, reset one to head; advance both by 1; they meet at the entrance.
? Cycle length? :: From the meeting point, count steps until a pointer returns.
? Find the Duplicate Number reduction? :: i → nums[i] is a functional graph; the duplicate is the cycle entrance.
? Intersection of two lists? :: Switch to the other head at the end; meet at the intersection.
? Delete the Middle Node? :: Start fast two ahead so slow stops just before the middle.
? Why start at index 0 in LC 287? :: No value equals 0, so 0 is on the tail, not in a cycle.
? Brent's algorithm benefit? :: Fewer function evaluations; finds the cycle length directly.
? Circular Array Loop extras? :: Same direction only, length > 1, mark visited starts.
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
## Merging sorted lists

**Merge Two Sorted Lists** (LC 21): build the result behind a dummy node, attaching the smaller head each step, then attach the remaining list.

\`\`\`python
def merge_two(a, b):
    dummy = tail = ListNode()
    while a and b:
        if a.val <= b.val: tail.next, a = a, a.next
        else: tail.next, b = b, b.next
        tail = tail.next
    tail.next = a or b
    return dummy.next
\`\`\`

O(m + n) time, O(1) extra space: nodes are relinked, not copied. ≤ keeps it stable.

## Merge k sorted lists (LC 23)

- **Min-heap** of the k current heads: pop the smallest, attach it, push its successor. O(N log k) for N total nodes. In Python, push (value, index, node) so ties never compare ListNode objects (which raises a TypeError); the index (or a counter) breaks ties.
- **Divide and conquer**: merge lists in pairs (1 with 2, 3 with 4, …), then pairs of results: log k rounds of O(N) each: O(N log k), no heap.
- Merging one list after another into an accumulator costs O(N·k): the common slow answer.

## Sort List (LC 148)

Sort a linked list in O(n log n) time. **Merge sort** fits lists perfectly:

1. Split at the middle (fast/slow pointers; cut the link so the halves are separate lists; use the first middle so a two-node list splits into one and one).
2. Sort both halves recursively.
3. Merge them.

Why merge sort and not quicksort or heapsort: merging needs only sequential access and relinking (no extra array, no random access), and it is stable. Quicksort on lists is possible but suffers on sorted input; heapsort needs random access.

**Bottom-up merge sort (O(1) extra space)**: the recursive version uses O(log n) stack. Iteratively, merge runs of size 1, then 2, 4, 8, …: for each size, walk the list cutting off two runs of that size, merging them, and appending to a tail pointer. log n passes of O(n): O(n log n) time, O(1) extra space, which is the follow-up interviewers ask for.

## Partition List (LC 86)

Move nodes less than x before nodes ≥ x, preserving relative order: build two lists (with two dummy heads) by appending each node to the appropriate one, then link the first list's tail to the second's head and **terminate the second list's tail with null** (its last node may still point into the old list, creating a cycle).

## Insertion Sort List (LC 147)

Insert each node into a sorted prefix behind a dummy: O(n²) worst case. Optimisation: if the next node is ≥ the sorted tail, just extend the tail (O(n) on already sorted input). Good to know because it is the natural "sort a list" first attempt.

## Odd Even Linked List (LC 328)

Group nodes at odd positions followed by nodes at even positions, in place: keep odd and even pointers, advance them alternately (odd.next = even.next; odd = odd.next; even.next = odd.next; even = even.next), then link the odd tail to the saved even head. O(n), O(1).

## More list sorting and merging

- **Merge In Between Linked Lists** (LC 1669): find the nodes before a and after b, splice list2 between them.
- **Merge Nodes in Between Zeros** (LC 2181): sum segments between zeros into new nodes.
- **Sort a list of 0s, 1s and 2s**: three dummy lists (like Dutch flag) or counting.
- **Remove Duplicates from Sorted List I and II** (LC 83, 82): skip equal neighbours; for II, use a dummy and skip whole runs of duplicates.
- **Flatten a multilevel or "child" list sorted by bottom pointers** (classic GfG problem): merge the vertical lists pairwise from the right.

## Interview angles

- Always use a dummy and a tail pointer when building lists.
- In Python heaps, add a tie-breaker before ListNode objects.
- For Sort List, offer the bottom-up O(1)-space version as the follow-up.

## Connections

Merge sort, k-way merge with heaps, fast/slow pointers (splitting), and partitioning (Dutch flag on lists).
`,
    doubts: [
      ["Why is merge sort preferred for linked lists?", "Merging lists is O(1) extra space (just re-link nodes), and splitting needs no random access. Quicksort and heapsort rely on random access."],
      ["How does bottom-up merge sort reach O(1) space?", "It iterates over run sizes 1, 2, 4, … and, for each size, walks the list cutting and merging consecutive runs with a few pointers. No recursion stack."],
      ["Heap of ListNodes in Python?", "heapq compares tuples element by element; if two values tie it compares ListNodes and raises a TypeError. Push (val, index, node) with a unique index."],
      ["Why split at the first middle in Sort List?", "With the second middle, a two-node list splits into two nodes and zero nodes, and recursing on the two-node half repeats forever. Starting fast at head.next gives the first middle, so two nodes split into one and one."],
      ["Is merging k lists by divide and conquer really O(N log k)?", "Yes: each round merges pairs, touching every node once (O(N) per round), and the number of lists halves each round, so there are log k rounds."],
      ["Can a linked list be sorted with quicksort?", "Yes: partition nodes into three lists (less, equal, greater) around a pivot and concatenate; it is O(n log n) on average but O(n²) on sorted input with a naive pivot, and random pivots require walking the list. Merge sort is the standard choice."],
    ],
    revise: md`
? Merge two sorted lists leftovers? :: Attach the remaining list directly.
? Merge k lists complexity? :: O(N log k) with a heap or pairwise divide and conquer.
? Sort a linked list in O(n log n), O(1) space? :: Bottom-up merge sort.
? Python heap tie-break for nodes? :: Push (value, unique index, node).
? Partition List? :: Two dummy chains joined at the end (stable).
? Partition List cycle trap? :: Null-terminate the second list's tail.
? Remove Duplicates II? :: Dummy + skip entire runs of equal values.
? Merge In Between (LC 1669)? :: Find node before a and after b; splice list2.
? Python heap tie-break for nodes? :: Push (val, index, node).
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

Each node has next and random (pointing to any node or null). Make a deep copy: new nodes whose next and random point to the corresponding new nodes.

**Hash map (two passes)**: first create a copy of every node and store old → new in a map. Second pass: new.next = map[old.next], new.random = map[old.random] (with null mapping to null). O(n) time, O(n) space. A single recursive pass with memoisation (copy(node) creates or returns the copy) also works, like cloning a graph.

**Interleaving (O(1) extra space)**:

1. For every node A, insert its copy A' right after it: A → A' → B → B' → …
2. Set random pointers: A'.random = A.random.next (the copy of A's random target sits right after it), or null.
3. Unweave: restore the original next pointers and extract the copy list.

\`\`\`python
def copy_random_list(head):
    cur = head
    while cur:                                   # 1. interleave copies
        cur.next = Node(cur.val, cur.next); cur = cur.next.next
    cur = head
    while cur:                                   # 2. random pointers
        cur.next.random = cur.random.next if cur.random else None
        cur = cur.next.next
    dummy = tail = Node(0); cur = head
    while cur:                                   # 3. separate the lists
        copy = cur.next
        cur.next = copy.next
        tail.next = copy; tail = copy
        cur = cur.next
    return dummy.next
\`\`\`

The interleaving trick works because "the copy of X" becomes "X.next" during step 2, replacing the hash map lookup. Step 3 must restore the original list, since callers expect their input unchanged.

## Flatten a Multilevel Doubly Linked List (LC 430)

Nodes have next, prev and child. Flatten so that each child list appears right after its parent, recursively. DFS: when a node has a child, flatten the child list, splice it between the node and its next (fix prev pointers on both ends), and clear the child pointer. Iteratively: when a node has a child, push node.next on a stack, link node to its child, continue; when the end of a level is reached, pop the saved next and link it. O(n).

Related: **Flatten Binary Tree to Linked List** (LC 114): pre-order rewiring (or Morris-style: for each node with a left child, attach the right subtree to the rightmost node of the left subtree, move left to right).

## Designs that are lists underneath

| Design | Structure | Why a list |
|---|---|---|
| LRU Cache (LC 146) | hash map key → node + doubly linked list by recency | O(1) move-to-front and evict-tail |
| LFU Cache (LC 460) | key → node, frequency → doubly linked list, minFreq | O(1) bump and evict per frequency |
| All O(1) Data Structure (LC 432) | list of count buckets, each a set of keys; key → bucket | O(1) inc/dec moving keys to neighbouring buckets; max/min at the ends |
| Design Browser History (LC 1472) | doubly linked list or array with a cursor | back/forward walk the list; visit truncates the forward part |
| Design Linked List (LC 707) | singly or doubly linked list with size | practice for all index operations |
| Design Twitter feed | per-user tweet lists merged with a heap | k-way merge of recent tweets |
| Skip lists | layered linked lists | expected O(log n) ordered map |

**Hash map + doubly linked list** is the reusable pattern: the map gives O(1) access to a node; the list gives O(1) reordering and removal; sentinels at both ends remove edge cases.

## Intrusive lists

In systems code (the Linux kernel's list_head, game engines), the next and prev pointers are embedded **inside** the objects themselves instead of in separate list nodes. Benefits: no extra allocation per list membership, O(1) removal given only the object pointer, and an object can be in several lists via several embedded link fields. The container_of macro recovers the object from its link field. It is how an object can sit in a hash bucket chain and an LRU list at the same time with no extra memory.

## Interview angles

- Give the hash-map copy first, then the O(1)-space interleaving with the restoration step.
- For designs, start from "map for access, list for order" and add sentinels.
- Mention intrusive lists when discussing memory-efficient systems.

## Connections

Graph cloning (the same old → new map), LRU/LFU caches, tree flattening, and skip lists.
`,
    doubts: [
      ["Why does interleaving make random pointers easy?", "Each original's copy is its next node. So the copy of A.random is A.random.next, available without a map."],
      ["Do I need to restore the original list?", "Usually expected: the input should be unchanged after a copy. The separation pass restores the original next pointers."],
      ["Why does the hash-map copy need two passes (or memoisation)?", "A random pointer may point to a node not yet copied. Creating all copies first (or creating copies on demand through a memoised function) guarantees the target copy exists when you set the pointer."],
      ["What happens if I forget to restore the original list in the interleaving method?", "The original list then contains the copy nodes interleaved, and the judge (or any caller) sees a corrupted input. LeetCode checks this, and in real code it would break other users of the list."],
      ["Is a doubly linked list necessary for LRU, or would a singly linked list with a map to the previous node work?", "A map from key to the previous node can work but every removal changes the \"previous node\" of the following node, so the map entries must be updated, which is fiddly. A doubly linked list stores prev in the node itself, making removal a two-pointer O(1) operation."],
    ],
    revise: md`
? Copy with random pointers, O(n) space? :: Map original → copy, then wire next and random.
? O(1) extra space? :: Interleave copies, set random via A.random.next, then split.
? Clone graph? :: DFS/BFS with a map from original to clone.
? LRU structure? :: Doubly linked list + hash map.
? LFU structure? :: Frequency buckets of doubly linked lists + minFreq.
? Interleaving random step? :: A'.random = A.random.next (or null).
? Flatten Binary Tree (LC 114) O(1)? :: Attach the right subtree to the rightmost node of the left subtree; move left to right.
? All O(1) Data Structure? :: List of count buckets with key sets; key → bucket.
? Intrusive list benefit? :: Links inside objects: no extra allocation, O(1) removal by object pointer.
`,
    pitfalls: ["Setting random before all copies exist", "Not restoring the original list", "Forgetting prev pointers when flattening doubly linked lists"],
    quiz: [Q("In the interleaving copy, copy(A).random equals…", ["A.random", "*A.random.next", "A.next.random", "null"], "Each node's copy follows it.")],
    sources: [S.article("Linked list (doubly linked, sentinel nodes)", "Wikipedia", "https://en.wikipedia.org/wiki/Doubly_linked_list"), S.article("Linux kernel linked list API", "kernel.org", "https://www.kernel.org/doc/html/latest/core-api/kernel-api.html#list-management-functions")],
    problems: [138, 133, 430, 146, 460, 1472, 432],
  },
};
