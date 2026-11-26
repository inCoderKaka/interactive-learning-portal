import { md } from "@/content/ai/md";
import { Q } from "@/content/h";
import { S, type Deep } from "../types";

/** Two pointers, sliding window, stacks and monotonic deques. */
export const linear: Record<string, Deep> = {
  // ─────────────── two pointers ───────────────
  "opposite-pointers": {
    blurb: "Two indices start at both ends of sorted data and move inward. Each step discards a whole row of candidate pairs, which is why O(n²) pair problems become O(n).",
    signals: ["Sorted array and a pair (or triple) condition: sum, difference, closest", "Palindrome checks", "\"Container\" or \"trapping\" problems with a left and right wall"],
    widgets: ["two-pointers"],
    lesson: md`
## The pattern

Put L at the start and R at the end of a **sorted** array. For Two Sum II:

- if a[L] + a[R] = target, done;
- if the sum is too small, L++ (a bigger left value is the only way up);
- if it is too big, R−− .

[[widget:two-pointers]]

## Why discarding is safe

Think of all pairs (i, j) as a grid. When the sum is too small, a[L] + a[R] is the *largest* sum available for this L (R is the largest remaining index), so **every** pair (L, j) is too small: the whole row L is eliminated, and L++ is safe. Symmetrically, too big eliminates column R. Each step removes a row or a column, so at most n steps: O(n). This "eliminate a row or column" argument is what interviewers want when they ask "why can you move that pointer?".

## 3Sum and k-Sum

- **3Sum** (LC 15): sort, fix i, run Two Sum II on the suffix: O(n²). Skip duplicates for i, and after a hit skip equal values for L and R.
- **3Sum Closest**, **3Sum Smaller**: same skeleton, different bookkeeping (closest tracks the best |sum − target|; "smaller" adds R − L to the count when the sum is small enough, since all pairs (L, L+1..R) qualify).
- **4Sum**: two nested fixes plus two pointers, O(n³). General k-Sum recurses to 2Sum: O(n^(k−1)).
- Lower bound note: 3Sum is conjectured to need roughly n² time (the 3SUM conjecture), so O(n²) is the target.

## Container With Most Water (LC 11)

Area = (R − L) × min(h[L], h[R]). Move the **shorter** wall inward. Moving the taller one can only shrink the width without raising the limiting height, so it cannot beat the current area: safe to discard.

## Trapping Rain Water (LC 42)

Water above i = min(maxLeft, maxRight) − h[i]. Two pointers: keep leftMax and rightMax; always process the side with the smaller max, because that side's water level is already determined (the other side has a wall at least as tall). O(n) time, O(1) space. Alternatives: prefix/suffix max arrays (O(n) space) or a monotonic stack (computes water layer by layer).

## Other uses

- **Valid Palindrome** (with skip of non-alphanumerics; **one deletion allowed**: on mismatch try skipping either side once).
- **Squares of a sorted array**: largest squares are at the ends; fill the result from the back.
- **Boats to Save People**: sort; pair the heaviest with the lightest if they fit.
- **Valid Triangle Number** (LC 611): sort; fix the largest side k, two pointers on [0, k): if a[L] + a[R] > a[k], all pairs (L..R−1, R) work: count += R − L, R−− .

## When the input is not sorted

Sorting costs O(n log n) and loses original indices (store pairs (value, index) if the answer needs indices). If the input is unsorted and you need indices, Two Sum with a hash map is O(n). Two pointers win when the input is already sorted or when O(1) extra space is required.
`,
    doubts: [
      ["How do I justify moving a pointer in an interview?", "Say what is eliminated: 'a[L] + a[R] < target and R is the largest remaining, so L cannot pair with anything; drop L'. The grid-of-pairs picture makes it concrete."],
      ["3Sum: why does skipping duplicates not lose answers?", "Equal values at the fixed position produce exactly the same set of pairs from the suffix, so only the first is needed. After a hit, any other pair using the same a[L] value with a different partner would need the same partner value, which is again a duplicate."],
      ["Container: what if both heights are equal?", "Moving either is safe: whichever you keep, the minimum height cannot exceed the current equal height while the width shrinks, so neither discarded wall can be part of a better answer with the current partner."],
      ["Do two pointers work for 'subarray with sum k'?", "Those are same-direction (window) problems, and only with non-negative numbers. Opposite pointers need sorted data and a pair condition."],
    ],
    revise: md`
? Two Sum II step rule? :: Sum too small → L++; too big → R−−.
? Why is it safe? :: Each step eliminates a whole row or column of the pair grid.
? 3Sum complexity and dedupe? :: Sort, fix i, two pointers: O(n²); skip equal values at i, L and R.
? Container With Most Water move? :: Move the shorter wall.
? Trapping Rain Water two-pointer rule? :: Process the side with the smaller running max; water = that max − height.
? Valid Triangle Number counting step? :: If a[L] + a[R] > a[k], add R − L and move R left.
? Unsorted, need indices? :: Hash map Two Sum, O(n).
`,
    pitfalls: ["Two pointers on unsorted data", "Losing original indices after sorting", "Missing duplicate skips in 3Sum (duplicate triples)", "Moving the taller wall in Container"],
    quiz: [
      Q("In Container With Most Water, you move…", ["the taller wall", "*the shorter wall", "both", "either at random"], "Only a taller limiting wall could increase the area."),
      Q("3Sum on n = 3000 should be about…", ["O(n³)", "*O(n²)", "O(n log n)", "O(n)"], "Fix one, two pointers on the rest."),
    ],
    sources: [
      S.article("3SUM", "Wikipedia", "https://en.wikipedia.org/wiki/3SUM"),
      S.article("Two pointers technique", "USACO Guide", "https://usaco.guide/silver/two-pointers"),
    ],
    problems: [167, 15, 16, 18, 11, 42, 125, 680, 977, 881, 611, 259],
  },
  "same-direction-pointers": {
    blurb: "A slow write pointer and a fast read pointer moving the same way: filter, compact, deduplicate and merge in place in one pass.",
    signals: ["Remove or compact elements in place, keep order", "Remove duplicates from sorted data (allow at most k copies)", "Is s a subsequence of t?"],
    lesson: md`
## Read/write pointers

\`\`\`
w = 0
for r in range(n):
    if keep(a[r]):
        a[w] = a[r]; w += 1
# a[0:w] is the result
\`\`\`

Invariant: **a[0..w) holds exactly the kept elements seen so far, in order.** Each element is read once and written at most once: O(n) time, O(1) space.

Applications:
- **Remove Element**, **Move Zeroes** (then zero-fill the tail, or swap instead of copy to keep it to one pass);
- **Remove Duplicates from Sorted Array**: keep a[r] if w == 0 or a[r] ≠ a[w − 1];
- **at most k copies** (LC 80, k = 2): keep a[r] if w < k or a[r] ≠ a[w − k]. Comparing with the element k positions back in the *output* is the general trick;
- **String backspace compare** (LC 844): process from the right with skip counters, O(1) space.

## Subsequence check

**Is Subsequence** (LC 392): i on s, j on t; advance i on a match, always advance j. s is a subsequence iff i reaches the end. For many queries s against one huge t, precompute for each character the sorted list of its positions in t and binary search the next position: O(|s| log |t|) per query. Or a next-occurrence table: next[j][c].

## Fast and slow at different speeds

Moving one pointer twice as fast finds the middle of a list or detects cycles: see fast and slow pointers.

## Pitfalls

- Overwriting elements you have not read yet: safe here because w ≤ r always.
- Swapping vs copying: swapping preserves the discarded elements (needed for stable partition with a tail), copying is cheaper.
`,
    doubts: [
      ["Why is a[r] compared with a[w − k] and not a[r − k] in 'at most k duplicates'?", "a[r − k] is in the original array and may have been overwritten or skipped. The constraint is about the output: a[r] is allowed if it differs from the element k positions back in what you have kept."],
      ["Is Move Zeroes stable for non-zero elements?", "Yes: non-zeros are written in their original order. The zeros' order does not matter since they are identical."],
    ],
    revise: md`
? Read/write invariant? :: a[0..w) = kept elements in order.
? Remove duplicates allowing k copies? :: Keep a[r] if w < k or a[r] ≠ a[w − k].
? Is Subsequence for many queries? :: Positions list per character + binary search (or a next-occurrence table).
? Complexity of read/write compaction? :: O(n) time, O(1) space.
`,
    pitfalls: ["Comparing with the input instead of the output in dedupe-k", "Allocating a new array when in place is asked"],
    quiz: [Q("Remove duplicates (at most 2) from [1,1,1,2,2,3]: kept length?", ["4", "*5", "6", "3"], "1,1,2,2,3.")],
    sources: [S.article("In-place algorithm", "Wikipedia", "https://en.wikipedia.org/wiki/In-place_algorithm"), S.article("Two pointers technique", "USACO Guide", "https://usaco.guide/silver/two-pointers")],
    problems: [26, 80, 27, 283, 392, 844, 792],
  },
  "array-partition": {
    blurb: "Rearrange in place around a pivot or into colour classes: Lomuto and Hoare partitions and Dijkstra's three-way Dutch national flag.",
    signals: ["Sort an array of 0s, 1s and 2s in one pass", "Put all elements < x before ≥ x", "Quicksort or quickselect's inner loop", "Segregate odd/even, negative/positive"],
    widgets: ["dutch-flag"],
    lesson: md`
## Two-way partition

**Lomuto**: one pointer w marks the end of the "small" region; scan r, swap small elements to w. Simple, but does extra swaps and degrades badly when many elements equal the pivot.

**Hoare**: two pointers from both ends move inward, swapping a pair that is on the wrong sides. About three times fewer swaps on average than Lomuto, and it handles equal keys better. Careful: the returned index is not necessarily the pivot's final position.

## Dutch national flag (three-way)

Edsger Dijkstra's problem: sort values that are one of three colours. Keep three regions with pointers lo, mid, hi:

- a[0..lo) = 0s, a[lo..mid) = 1s, a[mid..hi] = unknown, a(hi..n) = 2s.
- If a[mid] = 0: swap with a[lo]; lo++, mid++.
- If a[mid] = 1: mid++.
- If a[mid] = 2: swap with a[hi]; hi−− (do **not** advance mid: the swapped-in value is unknown).

One pass, O(n), O(1) space.

[[widget:dutch-flag]]

The same three-way partition around a pivot value (< p, = p, > p) is what makes quicksort fast on inputs with many duplicates (Bentley–McIlroy, and Java's dual-pivot quicksort for primitives).

## Variants

- **Sort Colors** (LC 75), **sort by parity**, **partition labels around x** (LC 2161 keeps order: stable partition needs O(n) extra space or O(n log n) in place).
- **Wiggle sort II** uses a three-way partition around the median with virtual indexing.
- **Kth largest** via quickselect: partition, recurse on one side.
`,
    doubts: [
      ["Why not advance mid after swapping with hi?", "The element that came from position hi has not been examined yet; it could be a 0, 1 or 2. When swapping with lo, the incoming element is already known to be a 1 (it came from the 1s region) or it is the same position, so mid can advance."],
      ["Is the Dutch flag partition stable?", "No. Equal elements can change relative order because of the swaps. Stable partitioning in place costs O(n log n); with O(n) extra space it is a simple pass per class."],
      ["Lomuto or Hoare in an interview?", "Lomuto is easier to write correctly. Mention Hoare's fewer swaps and the three-way partition for duplicates if asked about performance."],
    ],
    revise: md`
? Dutch flag regions? :: [0,lo) zeros, [lo,mid) ones, [mid,hi] unknown, (hi,n) twos.
? On a 2 at mid? :: Swap with hi, hi−−, do not advance mid.
? On a 0 at mid? :: Swap with lo, lo++, mid++.
? Three-way partition helps quicksort when? :: Many equal keys (avoids O(n²)).
? Lomuto vs Hoare? :: Lomuto simpler; Hoare fewer swaps and better with duplicates.
`,
    pitfalls: ["Advancing mid after swapping with hi", "Assuming partition is stable", "Off-by-one with hi (inclusive) as the loop bound: loop while mid ≤ hi"],
    quiz: [Q("Sort Colors in one pass uses…", ["counting sort (two passes)", "*Dutch national flag", "merge sort", "heap"], "Counting is two passes; the flag is one.")],
    sources: [
      S.article("Dutch national flag problem", "Wikipedia", "https://en.wikipedia.org/wiki/Dutch_national_flag_problem"),
      S.paper("Engineering a sort function (Bentley & McIlroy, 1993)", "Software: Practice and Experience", "https://doi.org/10.1002/spe.4380231105"),
      S.book("Algorithms, 4th ed. §2.3 Quicksort (3-way partitioning)", "Sedgewick & Wayne", "https://algs4.cs.princeton.edu/23quicksort/"),
    ],
    problems: [75, 905, 2161, 324, 922],
  },
  "merge-pointers": {
    blurb: "One pointer per sorted sequence, always advancing the smaller: merging, intersecting and comparing in linear time.",
    signals: ["Two sorted arrays or lists", "Intersection or union of sorted sequences", "Merge step of merge sort", "Interval list intersections"],
    lesson: md`
## Merge

i on A, j on B; append the smaller of A[i], B[j] and advance that pointer; append the leftovers. O(m + n). Take from A on ties to keep the merge **stable**.

**Merge Sorted Array in place** (LC 88): A has room at its end. Fill from the back (largest first) so you never overwrite unread elements of A.

## Intersection and union

- **Intersection** of sorted arrays: on equal values output and advance both; otherwise advance the smaller. Duplicates: decide whether to output min(count) copies (LC 350) or unique values (LC 349).
- **Interval List Intersections** (LC 986): overlap of [a1, a2] and [b1, b2] is [max(a1, b1), min(a2, b2)] if non-empty; then advance whichever interval ends first.

## Merge k sorted

More than two sequences: a min-heap of the current heads, O(N log k). Or pairwise divide and conquer, also O(N log k). See K-way merge.

## Comparing sorted sequences

Median of two sorted arrays has a two-pointer O(m + n) solution and a binary-search O(log min(m, n)) one; interviews want the latter.
`,
    doubts: [
      ["Why fill from the back when merging into A?", "The free space is at A's end. Writing the largest elements there first never overwrites an A element that has not been read: the write index is always ≥ the read index i."],
      ["What if one list is much longer than the other?", "If |A| ≪ |B|, binary searching each A element in B costs O(|A| log |B|), better than O(|A| + |B|). Galloping (as in TimSort) adapts between the two."],
    ],
    revise: md`
? Merge two sorted arrays cost? :: O(m + n).
? In-place merge into the first array? :: Fill from the back.
? Interval intersection rule? :: [max(starts), min(ends)] if valid; advance the one ending first.
? Tiny A vs huge B? :: Binary search each A element: O(|A| log |B|).
`,
    pitfalls: ["Forgetting leftovers after the main loop", "Filling from the front in LC 88", "Advancing both pointers on unequal values"],
    quiz: [Q("Intersecting [1,3] with [2,5], which pointer advances?", ["*The one for [1,3]", "The one for [2,5]", "Both", "Neither"], "It ends first, so it cannot overlap later intervals of the other list.")],
    sources: [S.article("Merge algorithm", "Wikipedia", "https://en.wikipedia.org/wiki/Merge_algorithm"), S.article("Timsort (galloping mode)", "Wikipedia", "https://en.wikipedia.org/wiki/Timsort")],
    problems: [88, 21, 349, 350, 986],
  },

  // ─────────────── sliding window ───────────────
  "fixed-window": {
    blurb: "A window of exactly k elements slides one step at a time: add the new element, remove the old one, and keep the answer updated in O(1) per step.",
    signals: ["\"Every subarray / substring of length k\"", "Maximum average or sum of size k", "Anagram or permutation of a pattern inside a string"],
    widgets: ["sliding-window"],
    lesson: md`
## The loop

\`\`\`
for r in range(n):
    add(a[r])
    if r >= k: remove(a[r - k])
    if r >= k - 1: record(answer)
\`\`\`

Every element enters once and leaves once, so the whole scan is O(n) if add and remove are O(1).

## What the window maintains

- a running **sum** (maximum average subarray, LC 643);
- a **count map** compared with a target count map (Find All Anagrams, LC 438; Permutation in String, LC 567). Keep a single integer "number of characters whose counts match" so each step is O(1) instead of comparing 26 counts;
- a **monotonic deque** for the window maximum or minimum (see monotonic deque);
- **two heaps or an ordered multiset** for the window median (LC 480);
- a **rolling hash** for comparing substrings (Rabin–Karp).

## Variants

- **Repeated DNA sequences** (fixed length 10 substrings seen twice): a set of substrings or a 20-bit rolling encoding.
- **Number of sub-arrays of size k with average ≥ t**: running sum compared with k·t (avoid floating point).
- **Minimum swaps to group all 1s** (LC 1151, circular LC 2134): window size = number of 1s; answer = window size − max ones in any window; circular → iterate over a doubled array.
- **Maximum points from cards** (take from both ends): equivalent to the minimum-sum window of length n − k in the middle.

The last two show a frequent trick: **re-express the question as a fixed window**.
`,
    doubts: [
      ["How do I avoid comparing two 26-length count arrays at every step?", "Maintain 'matches' = number of letters whose window count equals the target count. When a count changes, adjust matches only for that letter (it can move into or out of agreement). Window is an anagram iff matches = 26."],
      ["Circular arrays?", "Iterate r from 0 to n + k − 2 and index with r mod n, or conceptually concatenate the array with itself."],
    ],
    revise: md`
? Fixed window loop? :: Add a[r]; if r ≥ k remove a[r−k]; if r ≥ k−1 record.
? Anagrams in O(1) per step? :: Track the number of letters whose counts match the target.
? Take k cards from both ends? :: Minimum-sum window of length n − k in the middle.
? Group all 1s with minimum swaps? :: Window size = count of 1s; minimise zeros inside.
`,
    pitfalls: ["Recording before the window is full", "Recomputing the whole window each step (O(nk))", "Floating-point averages instead of comparing sums"],
    quiz: [Q("Max points taking k cards from either end of n cards equals total minus…", ["max window of length k", "*min window of length n − k", "min window of length k", "max prefix"], "What you leave behind is a contiguous middle block.")],
    sources: [S.article("Minimum stack / minimum queue (window aggregates)", "cp-algorithms", "https://cp-algorithms.com/data_structures/stack_queue_modification.html"), S.article("Sliding window technique", "USACO Guide", "https://usaco.guide/gold/sliding-window")],
    problems: [643, 438, 567, 187, 1151, 2134, 1423, 1343],
  },
  "variable-window": {
    blurb: "Grow the right edge, shrink the left edge while the window is invalid. Works whenever validity is monotone: if a window is valid, every smaller window inside it is too (or the reverse).",
    signals: ["Longest substring / subarray satisfying a constraint", "Shortest subarray reaching a target (non-negative numbers)", "At most k distinct, at most k replacements, at most k zeros"],
    widgets: ["sliding-window"],
    lesson: md`
## The two templates

**Longest valid window** (shrink only when invalid):

\`\`\`
l = 0
for r in range(n):
    add(a[r])
    while invalid(): remove(a[l]); l += 1
    best = max(best, r - l + 1)
\`\`\`

**Shortest valid window** (shrink while still valid):

\`\`\`
l = 0
for r in range(n):
    add(a[r])
    while valid(): best = min(best, r - l + 1); remove(a[l]); l += 1
\`\`\`

Both are O(n): l and r each move at most n times.

[[widget:sliding-window]]

## When is the window method correct?

You need **monotonicity**: for longest-window problems, shrinking a valid window keeps it valid; for shortest-window problems, growing a valid window keeps it valid. Then, for each r, the best l only moves right as r increases, so you never need to move l back.

It **fails** when that breaks, typically with negative numbers in sum constraints ("sum = k" or "sum ≥ k" with negatives). Use prefix sums + hash map (exact sum) or a monotonic deque over prefix sums (shortest subarray with sum ≥ k, LC 862).

## Classic problems

| Problem | Window state | Invalid when |
|---|---|---|
| Longest substring without repeating (LC 3) | last index or counts | a count > 1 |
| Longest with at most k distinct (LC 340) | count map | distinct > k |
| Longest repeating character replacement (LC 424) | counts + max frequency | len − maxFreq > k |
| Max consecutive ones III (LC 1004) | zero count | zeros > k |
| Minimum size subarray sum (LC 209) | sum | (shortest) valid while sum ≥ target |
| Minimum window substring (LC 76) | need counts + 'missing' | (shortest) valid while all covered |
| Fruit into baskets (LC 904) | count map | distinct > 2 |

## Two clever details

- **LC 3 jump**: store each character's last index; on a repeat, jump l to max(l, last[c] + 1) instead of shrinking one by one.
- **LC 424 stale max**: you may keep maxFreq as a historical maximum and never decrease it. The window length only grows when a genuinely larger maxFreq appears, so the answer is still correct, and the loop becomes an \`if\` instead of a \`while\`.

## Minimum Window Substring in detail

Keep need[c] counts for t and a counter missing = |t|. Extending r: if need[s[r]] > 0, missing−−; then need[s[r]]−− (it may go negative: surplus). When missing = 0, the window covers t: record it, then shrink from l: need[s[l]]++, and if it becomes positive, a required character is now missing, so missing++ and stop shrinking. O(|s| + |t|).
`,
    doubts: [
      ["How do I know whether to use a while or an if when shrinking?", "Use while in general. The if version works only for the 'longest' template with special state such as LC 424's non-decreasing maxFreq, where the window never needs to shrink by more than one."],
      ["Why can maxFreq in LC 424 be stale?", "The answer only improves when the window gets longer, which requires len − maxFreq ≤ k with a bigger len, which in turn requires a bigger true maxFreq. Overestimating maxFreq in the meantime never produces a wrong larger answer; it just keeps the window at its best length."],
      ["Sliding window or prefix sums for 'subarray sum = k'?", "Sliding window only if all numbers are non-negative (then sums are monotone). With negatives, prefix sums + hash map."],
      ["How do I count windows instead of finding the best one?", "For 'at most' constraints, every window ending at r with start in [l, r] is valid, so add r − l + 1. 'Exactly k' = atMost(k) − atMost(k − 1)."],
    ],
    revise: md`
? Longest-window template? :: Add a[r]; while invalid, remove a[l++]; update best with r − l + 1.
? Shortest-window template? :: Add a[r]; while valid, update best then remove a[l++].
? Precondition? :: Monotone validity (shrinking keeps validity, or growing keeps it).
? Fails with? :: Negative numbers in sum constraints.
? LC 3 trick? :: l = max(l, last[c] + 1).
? LC 424 condition? :: Window length − max frequency ≤ k.
? Minimum Window Substring state? :: need counts + 'missing' counter.
`,
    pitfalls: ["Using a window with negative numbers", "Updating 'longest' inside the invalid loop", "Moving l backwards in LC 3 (forgetting the max)", "Comparing full count maps each step"],
    quiz: [
      Q("Longest substring with at most 2 distinct characters in 'eceba'?", ["2", "*3", "4", "5"], "'ece'."),
      Q("Shortest subarray with sum ≥ k, negatives allowed:", ["Sliding window", "*Monotonic deque on prefix sums", "Two pointers on sorted", "Kadane"], "Negatives break window monotonicity."),
    ],
    sources: [S.article("Two pointers", "USACO Guide", "https://usaco.guide/silver/two-pointers"), S.article("Sliding window technique", "USACO Guide", "https://usaco.guide/gold/sliding-window")],
    problems: [3, 340, 424, 1004, 209, 76, 904, 1838, 2024],
  },
  "count-windows": {
    blurb: "Count subarrays instead of finding one: every valid window ending at r contributes r − l + 1, and \"exactly k\" is at-most(k) minus at-most(k − 1).",
    signals: ["\"Number of subarrays\" with at most / exactly k of something", "Subarrays with k different integers", "Count nice subarrays (k odd numbers)"],
    lesson: md`
## Counting with a window

For an "at most k" constraint that is monotone, once the window [l, r] is valid, **every** subarray ending at r with start in [l, r] is valid (they are sub-windows). So:

\`\`\`
def atMost(k):
    l = 0; count = 0
    for r in range(n):
        add(a[r])
        while invalid(k): remove(a[l]); l += 1
        count += r - l + 1
    return count
\`\`\`

## Exactly k = atMost(k) − atMost(k − 1)

"Exactly k distinct" is not monotone (shrinking can drop below k), so a single window does not work directly. But the set of windows with exactly k equals those with at most k minus those with at most k − 1.

- **Subarrays with K Different Integers** (LC 992): atMost on distinct count.
- **Count Number of Nice Subarrays** (LC 1248): exactly k odd numbers; atMost on odd count (or prefix + hash map after mapping odd → 1).
- **Binary Subarrays With Sum** (LC 930): exactly goal ones; atMost(goal) − atMost(goal − 1) (guard goal = 0).

## Counting "at least"

At least k = total − atMost(k − 1), with total = n(n + 1)/2. (A direct one-pass count also exists: shrink to the shortest window ending at r that still has at least k; then every start at or before l works. The subtraction is less error-prone.)

## The three-pointer alternative

For exactly k you can also keep two left pointers (the leftmost and rightmost valid starts) in one pass. Same complexity; the subtraction trick is easier to get right.

## Complexity

Each atMost call is O(n); two calls are still O(n).
`,
    doubts: [
      ["Why does every start in [l, r] give a valid subarray?", "For an 'at most' constraint, removing elements from the left can only keep or reduce the count, so every sub-window of a valid window that ends at r is valid."],
      ["Why can't I slide once for 'exactly k'?", "Validity is not monotone: a window with exactly k can become one with k − 1 when shrunk, and extending can overshoot to k + 1. The left boundary of valid starts is a range, not a single point."],
    ],
    revise: md`
? Windows ending at r for an at-most constraint? :: r − l + 1.
? Exactly k? :: atMost(k) − atMost(k − 1).
? At least k? :: Total n(n+1)/2 − atMost(k − 1).
? LC 992? :: Subarrays with exactly K distinct = atMost(K) − atMost(K − 1).
`,
    pitfalls: ["Calling atMost(−1) when k = 0 (return 0)", "Trying a single window for exactly-k", "Integer overflow on large counts"],
    quiz: [Q("Number of subarrays of [1,2,1] with at most 2 distinct?", ["5", "*6", "4", "3"], "All 6 subarrays have at most 2 distinct values.")],
    sources: [S.article("Sliding window technique", "USACO Guide", "https://usaco.guide/gold/sliding-window"), S.article("Two pointers", "USACO Guide", "https://usaco.guide/silver/two-pointers")],
    problems: [992, 1248, 930, 2799, 795],
  },
  "window-structures": {
    blurb: "When the window must answer max, min, median or \"any value within t\", pair the two pointers with a deque, two heaps or an ordered set.",
    signals: ["Sliding window maximum / minimum", "Sliding window median", "Longest subarray where max − min ≤ limit", "Contains nearby almost duplicate (|i − j| ≤ k, |a[i] − a[j]| ≤ t)"],
    lesson: md`
## Pairing a window with a structure

| Need | Structure | Per step |
|---|---|---|
| max or min of the window | monotonic deque | amortised O(1) |
| both max and min | two monotonic deques | amortised O(1) |
| median | two heaps with lazy deletion, or an ordered multiset | O(log k) |
| nearest value to x | ordered set (TreeSet / std::set) | O(log k) |
| values within t | buckets of width t + 1 | O(1) expected |

## Longest subarray with |max − min| ≤ limit (LC 1438)

Variable window plus a decreasing deque (for max) and an increasing deque (for min). Shrink l while max − min > limit, popping deque fronts whose index falls out of the window. O(n).

## Sliding window median (LC 480)

Two heaps (max-heap of the lower half, min-heap of the upper half) with **lazy deletion**: record outgoing elements in a "to delete" map and discard them when they surface at a heap top; rebalance by counting valid sizes. Or an ordered multiset with an iterator to the middle. O(n log k).

## Contains Duplicate III (LC 220)

Need i, j with |i − j| ≤ k and |a[i] − a[j]| ≤ t. Window of the last k elements in an ordered set: query the ceiling of a[i] − t and check ≤ a[i] + t. Or **buckets** of width t + 1 (id = floor(a / (t + 1))): two values in the same bucket always qualify; also check the neighbouring buckets. O(n).

## Picking in interviews

Monotonic deques are the most common. Ordered sets are fine in C++ and Java (TreeMap); in Python, \`sortedcontainers.SortedList\` is usual but not in the standard library: say so and offer heaps.
`,
    doubts: [
      ["Why lazy deletion with heaps?", "Heaps cannot delete an arbitrary element efficiently. Instead remember it as deleted and drop it when it reaches the top. Sizes must count only live elements for balancing."],
      ["Why width t + 1 buckets?", "Any two numbers in a bucket of width t + 1 differ by at most t. Numbers within t can also sit in adjacent buckets, so check those two as well."],
    ],
    revise: md`
? Window max/min? :: Monotonic deque, amortised O(1).
? Window median? :: Two heaps + lazy deletion, or an ordered multiset: O(log k).
? LC 1438 structure? :: Two monotonic deques (max and min).
? Contains Duplicate III in O(n)? :: Buckets of width t + 1; check own and neighbouring buckets.
`,
    pitfalls: ["Forgetting to pop deque elements that left the window", "Heap sizes counting deleted elements", "Bucket ids for negative numbers (use floor division)"],
    quiz: [Q("Longest subarray with max − min ≤ limit uses…", ["one heap", "*two monotonic deques", "a trie", "binary search only"], "One deque for max, one for min.")],
    sources: [S.article("Sliding window technique", "USACO Guide", "https://usaco.guide/gold/sliding-window"), S.article("Sliding window minimum with a deque", "cp-algorithms", "https://cp-algorithms.com/data_structures/stack_queue_modification.html")],
    problems: [1438, 480, 220, 239, 2762],
  },

  // ─────────────── stacks ───────────────
  "stack-parsing": {
    blurb: "Last in, first out: matching brackets, evaluating expressions, decoding nested strings and simplifying paths. Whenever structure nests, a stack remembers where you came from.",
    signals: ["Brackets, nesting, \"undo\"", "Evaluate an expression (with precedence or parentheses)", "Decode strings like 3[a2[c]]", "Simplify a Unix path"],
    lesson: md`
## Matching

**Valid Parentheses** (LC 20): push openers; on a closer, the top must be its partner. Valid iff the stack is empty at the end. Edge cases: a closer with an empty stack; leftovers at the end.

Variants: **minimum additions to make valid** (count unmatched opens and closes with a balance counter: O(1) space), **minimum removals** (LC 1249: stack of indices of unmatched '('; mark unmatched ')' on the fly), **longest valid parentheses** (LC 32: stack of indices with a sentinel −1, or two counting passes left-to-right and right-to-left), **score of parentheses** (LC 856).

## Expression evaluation

- **Reverse Polish notation** (LC 150): push numbers; on an operator pop two (careful with order: a − b where b was popped first), push the result.
- **Basic Calculator II** (LC 227: + − * /, no parentheses): keep a stack of signed terms; * and / combine with the top immediately; + and − push. Sum the stack at the end. Integer division truncates toward zero.
- **Basic Calculator** (LC 224: + − and parentheses): keep result and sign; on '(' push (result, sign) and reset; on ')' pop and combine.
- **Full precedence and parentheses** (LC 772): Dijkstra's **shunting-yard** algorithm (an operator stack and an operand stack, applying operators by precedence), or recursive descent (parse expression → term → factor). Recursive descent is the cleanest to explain.

## Nested decoding

**Decode String** (LC 394): two stacks (counts and partial strings), or one stack of (string so far, repeat count). On '[' push and reset; on ']' pop, repeat the current string and append to the popped prefix.

## Paths and history

- **Simplify Path** (LC 71): split by '/', skip '' and '.', pop on '..', push names.
- **Backspace String Compare**: a stack, or two pointers from the right for O(1) space.
- **Asteroid collisions** (LC 735): push right-movers; a left-mover destroys smaller right-movers at the top.
- Undo/redo, browser history: two stacks.

## Why stacks fit nesting

Nested structures close in the reverse order they opened. The most recent unmatched opener is exactly the one the next closer must match, which is the top of the stack.
`,
    doubts: [
      ["In RPN, why does the order of popping matter?", "For '−' and '/', the second operand is on top. Pop b first, then a, and compute a op b."],
      ["Integer division truncation in calculators?", "Expected behaviour is truncation toward zero (like C/Java). In Python, // floors, so use int(a / b) for negatives."],
      ["Longest valid parentheses: why push −1 first?", "The stack holds the index just before the current valid run. Starting with −1 lets a valid prefix starting at 0 measure its length as i − (−1)."],
      ["Do I need a stack to check a single bracket type?", "No: a counter suffices (never negative, ends at zero). A stack is needed when there are several bracket types."],
    ],
    revise: md`
? Valid Parentheses invariant? :: The top of the stack is the most recent unmatched opener.
? One bracket type? :: A balance counter suffices.
? RPN pop order? :: Pop b, then a; push a op b.
? Calculator II without parentheses? :: Stack of signed terms; * and / apply to the top immediately.
? Calculator with parentheses? :: Push (result, sign) on '(', pop on ')'.
? General precedence? :: Shunting-yard or recursive descent.
? Decode String? :: Push (prefix, count) on '[', repeat and append on ']'.
? Longest valid parentheses? :: Stack of indices with sentinel −1, or two counting passes.
`,
    pitfalls: ["Popping from an empty stack on an unmatched closer", "Wrong operand order for − and /", "Python // with negatives", "Multi-digit numbers parsed one digit at a time"],
    quiz: [Q("Minimum additions to make '())(' valid?", ["1", "*2", "3", "4"], "One unmatched ')' needs an opener; one unmatched '(' needs a closer.")],
    sources: [S.article("Shunting yard algorithm", "Wikipedia", "https://en.wikipedia.org/wiki/Shunting_yard_algorithm"), S.article("Expression parsing", "cp-algorithms", "https://cp-algorithms.com/string/expression_parsing.html"), S.book("Algorithms, 4th ed. §1.3 (Dijkstra's two-stack evaluation)", "Sedgewick & Wayne", "https://algs4.cs.princeton.edu/13stacks/")],
    problems: [20, 1249, 32, 856, 921, 150, 227, 224, 772, 394, 71, 735],
  },
  "monotonic-stack": {
    blurb: "Keep a stack whose values stay increasing (or decreasing). Each element is pushed and popped once, and every pop answers \"what is the next greater (or smaller) element?\" in O(n) total.",
    signals: ["Next greater / next smaller element (to the right or left)", "Days until a warmer temperature", "Span problems (how far back is everything smaller?)", "Sum over all subarrays of the minimum or maximum"],
    widgets: ["mono-stack"],
    lesson: md`
## Next greater element

Scan left to right with a stack of **indices** whose values are **decreasing**. When a[i] arrives, pop every index j with a[j] < a[i]: a[i] is j's next greater element. Then push i.

\`\`\`
ans = [-1] * n; st = []
for i in range(n):
    while st and a[st[-1]] < a[i]:
        ans[st.pop()] = i        # or a[i], or i - j
    st.append(i)
\`\`\`

[[widget:mono-stack]]

O(n): each index is pushed once and popped at most once.

## The four variants

| Want | Stack keeps | Pop while |
|---|---|---|
| next greater to the right | decreasing values | a[top] < a[i] |
| next smaller to the right | increasing values | a[top] > a[i] |
| previous greater (to the left) | decreasing | read the top *after* popping a[top] ≤ a[i] |
| previous smaller | increasing | read the top after popping |

Strict vs non-strict comparisons decide how ties are handled: decide deliberately (it matters for counting problems).

## Contribution counting (sum of subarray minimums)

**Sum of Subarray Minimums** (LC 907): a[i] is the minimum of every subarray that starts after its previous smaller element and ends before its next smaller element. If left[i] and right[i] are those distances, a[i] contributes a[i] × left[i] × right[i]. Use strict on one side and non-strict on the other so equal values are not double counted. The same trick gives the sum of subarray ranges (LC 2104), the number of subarrays where a[i] is the maximum, and so on.

## Classic problems

- **Daily Temperatures** (LC 739): next greater, answer i − j.
- **Next Greater Element II** (circular, LC 503): iterate 2n times with index i mod n.
- **Online Stock Span** (LC 901): previous greater, store (price, span) pairs.
- **Remove K Digits** (LC 402): keep an increasing stack, pop larger digits while k > 0, strip leading zeros.
- **Largest Rectangle in Histogram**: see the histogram page.
- **132 Pattern** (LC 456): scan from the right with a decreasing stack and track the best "2".
- **Car Fleet** (LC 853): sort by position, stack of arrival times.

## Recognising it

The question asks, for each element, about the **nearest** element on one side that beats it. Brute force is O(n²) by scanning outward; the monotonic stack amortises that scanning away.
`,
    doubts: [
      ["How do I choose increasing or decreasing?", "Ask what each pop should answer. For next greater, an element waits on the stack until something bigger arrives, so the stack holds elements still waiting, which must be decreasing (a bigger one would have resolved them)."],
      ["Why store indices instead of values?", "Indices give distances (days to wait, widths of rectangles) and let you write answers to the right slot. You can read the value as a[i]."],
      ["How do I avoid double counting equal values in contribution problems?", "Use < on one side and ≤ on the other. Then for a run of equal minima, each subarray is attributed to exactly one of them (e.g. the leftmost)."],
      ["Circular next greater?", "Loop i from 0 to 2n − 1 using i mod n, and only push during the first pass (or push always but only write answers for unresolved indices)."],
    ],
    revise: md`
? Next greater element: stack order and pop condition? :: Decreasing stack; pop while a[top] < a[i]; a[i] answers the popped index.
? Complexity and why? :: O(n): each index is pushed once and popped once.
? Previous smaller? :: Increasing stack; after popping elements ≥ a[i], the top is the answer.
? Sum of subarray minimums formula? :: Σ a[i] × (distance to previous smaller) × (distance to next smaller), with strict/non-strict asymmetry.
? Circular variant? :: Iterate 2n with mod n.
? Remove K Digits? :: Increasing stack; pop larger digits while k > 0; strip leading zeros.
`,
    pitfalls: ["Storing values when distances are needed", "Double counting ties in contribution sums", "Forgetting leftover stack elements (they have no next greater: −1)"],
    quiz: [
      Q("Daily Temperatures uses a stack that is…", ["increasing", "*decreasing", "unordered", "a queue"], "Days wait until a warmer day pops them."),
      Q("Sum of subarray minimums of [3,1,2]?", ["6", "8", "*9", "10"], "3+1+2+1+1+1 = 9."),
    ],
    sources: [S.article("Finding the nearest smaller elements (all nearest smaller values)", "Wikipedia", "https://en.wikipedia.org/wiki/All_nearest_smaller_values"), S.article("Stack modification / minimum stack", "cp-algorithms", "https://cp-algorithms.com/data_structures/stack_queue_modification.html")],
    problems: [739, 496, 503, 901, 907, 2104, 402, 456, 853, 316],
  },
  histogram: {
    blurb: "Largest rectangle under a histogram in O(n) with a monotonic stack, and the matrix version that runs it once per row.",
    signals: ["Largest rectangle of bars", "Maximal rectangle of 1s in a binary matrix", "Count or maximise submatrices of 1s"],
    widgets: ["mono-stack"],
    lesson: md`
## Largest Rectangle in Histogram (LC 84)

For each bar i, the widest rectangle of height h[i] extends left to just after the **previous smaller** bar and right to just before the **next smaller** bar. Area = h[i] × (right − left − 1). Taking the max over i gives the answer.

One pass with an **increasing** stack of indices: when h[i] is smaller than the top, pop the top j; its right boundary is i and its left boundary is the new top (or −1). Append a sentinel bar of height 0 at the end so every bar gets popped.

\`\`\`
st = []; best = 0
for i, x in enumerate(h + [0]):
    while st and h[st[-1]] > x:
        j = st.pop()
        left = st[-1] if st else -1
        best = max(best, h[j] * (i - left - 1))
    st.append(i)
\`\`\`

O(n) time and space.

## Maximal Rectangle (LC 85)

Treat each row as the base of a histogram: heights[c] = number of consecutive 1s ending at this row in column c (reset to 0 on a 0). Run the histogram algorithm per row: O(R × C).

## Related

- **Maximal Square** (LC 221) is DP, not histogram: side[i][j] = 1 + min(top, left, diagonal).
- **Count Submatrices With All Ones** (LC 1504): per row, heights plus a monotonic stack accumulating counts.
- **Trapping Rain Water** is the "complement": water above bars versus rectangles under them; both have stack solutions.

## Divide and conquer alternative

Split at the minimum bar: the best rectangle either spans the whole range at the minimum's height or lies entirely left or right. O(n log n) with a sparse table for range minimum (O(n²) worst case with a naive minimum search). Worth naming; the stack is the expected answer.
`,
    doubts: [
      ["Why is the left boundary the new top after popping?", "The stack is increasing, so the element below j is the nearest bar to the left that is smaller than h[j] (anything in between was popped earlier because it was taller). That is exactly where the rectangle of height h[j] must stop."],
      ["Why the sentinel 0 at the end?", "It is smaller than every bar, so it forces all remaining bars to be popped and measured. Without it, you need a separate loop after the scan."],
      ["What about equal heights?", "Popping on ≥ or > both give the correct maximum; with >, the leftmost of equal bars gets the full width when the last one is popped."],
    ],
    revise: md`
? Rectangle for bar i spans? :: From after the previous smaller bar to before the next smaller bar.
? Stack order? :: Increasing heights (indices).
? Width when popping j at i? :: i − (new top) − 1, or i if the stack is empty.
? Sentinel? :: Append height 0 so everything is popped.
? Maximal rectangle in a matrix? :: Per-row heights of consecutive 1s, then histogram: O(RC).
? Maximal square? :: DP: 1 + min(top, left, diagonal).
`,
    pitfalls: ["Forgetting the final sentinel", "Using the popped index's position instead of the new top for the left edge", "Confusing maximal square (DP) with maximal rectangle (histogram)"],
    quiz: [Q("Largest rectangle in [2,1,5,6,2,3]?", ["8", "*10", "12", "6"], "Bars 5 and 6 at height 5 → 10.")],
    sources: [S.article("Stack (abstract data type)", "Wikipedia", "https://en.wikipedia.org/wiki/Stack_(abstract_data_type)"), S.article("Largest rectangle in a histogram", "Wikipedia (all nearest smaller values)", "https://en.wikipedia.org/wiki/All_nearest_smaller_values")],
    problems: [84, 85, 1504, 221, 1793],
  },
  "stack-design": {
    blurb: "Augmented stacks and adapters: O(1) getMin, a max stack, queues from stacks and stacks from queues, and frequency stacks.",
    signals: ["\"Design a stack that also supports getMin / getMax in O(1)\"", "Implement a queue using stacks (or the reverse)", "Pop the most frequent element"],
    lesson: md`
## Min Stack (LC 155)

Store pairs (value, min so far) on one stack, or keep a second stack of minimums (push to it when the new value ≤ current min; pop from it when the popped value equals its top). Every operation O(1). The ≤ matters with duplicates.

An O(1)-extra-space trick stores encoded differences (value − min) and recovers the previous min when popping a negative difference. Clever, but easy to get wrong and overflow-prone; mention it, write the pair version.

## Max Stack with popMax (LC 716)

popMax must remove the maximum from the middle. Options: a doubly linked list plus an ordered map from value to nodes (O(log n) per operation), or two heaps with lazy deletion by id. The two-stack approach (pop into a buffer until the max) is O(n) for popMax.

## Queue from two stacks (LC 232)

push → in-stack. pop/peek → if out-stack is empty, move everything from in to out (reversing order), then pop out. Each element moves once: **amortised O(1)**. Worst case for one pop is O(n).

## Stack from queues (LC 225)

With one queue: after pushing x, rotate the previous n elements behind it so x is at the front. push O(n), pop O(1).

## Maximum Frequency Stack (LC 895)

freq[x] = count; group[f] = stack of elements that reached frequency f. push: freq[x]++, push x onto group[freq[x]]. pop: take from group[maxFreq]; if that stack empties, maxFreq−− . All O(1). Ties break by recency automatically.

## Persistent and functional stacks

A stack as an immutable linked list shares tails between versions: push creates one node, older versions stay valid. This is how functional languages represent lists and is the simplest persistent data structure.
`,
    doubts: [
      ["Why ≤ (not <) when pushing onto the min stack?", "If the same minimum is pushed twice and you only recorded it once, popping one copy would remove the min record while the other copy is still on the main stack."],
      ["Is the two-stack queue's O(1) amortised or worst case?", "Amortised. A single pop can move n elements. For a real-time guarantee there are more complex constructions (e.g. Okasaki's real-time queues)."],
    ],
    revise: md`
? Min Stack in O(1)? :: Store (value, current min) pairs, or a parallel min stack pushed on ≤.
? Queue from two stacks complexity? :: Amortised O(1); transfer only when the out-stack is empty.
? Max frequency stack? :: freq map + stack per frequency level + maxFreq.
? popMax efficiently? :: Doubly linked list + ordered map (O(log n)).
`,
    pitfalls: ["Using < for the min stack with duplicates", "Transferring from in to out when out is not empty (breaks order)"],
    quiz: [Q("Queue via two stacks: when do you move elements to the out-stack?", ["Every push", "Every pop", "*Only when the out-stack is empty", "Never"], "Moving earlier would scramble the order.")],
    sources: [S.article("Minimum stack / minimum queue", "cp-algorithms", "https://cp-algorithms.com/data_structures/stack_queue_modification.html"), S.book("Purely Functional Data Structures", "Chris Okasaki", "https://www.cs.cmu.edu/~rwh/students/okasaki.pdf")],
    problems: [155, 716, 232, 225, 895, 1381],
  },

  // ─────────────── queues and deques ───────────────
  "queues-deques": {
    blurb: "FIFO queues, double-ended queues and circular buffers: the structure behind BFS, schedulers and streams, and how each language implements them.",
    signals: ["Process in arrival order (BFS, task queues)", "Add/remove at both ends", "Fixed-capacity buffers (last k events)"],
    lesson: md`
## Queue

First in, first out. enqueue at the back, dequeue at the front, both O(1). Uses: BFS, level-order traversal, producer–consumer pipelines, rate limiters keeping the last k timestamps.

## Implementations

- **Circular buffer** (ring buffer): an array of capacity k with head and size; index (head + i) mod k. Fixed memory, cache friendly. Design Circular Queue (LC 622), Design Circular Deque (LC 641). Track size (or keep one slot empty) to distinguish full from empty.
- **Linked list** with head and tail pointers.
- **Python**: \`collections.deque\` (blocks of arrays; O(1) at both ends; indexing in the middle is O(n)). Never use list.pop(0).
- **Java**: \`ArrayDeque\` (resizable circular array; faster than LinkedList; no nulls). \`Queue<Integer> q = new ArrayDeque<>()\`.
- **C++**: \`std::deque\` (chunks; O(1) both ends, random access), \`std::queue\` is an adapter over it.

## Deque

Double-ended: push and pop at both ends in O(1). It generalises stacks and queues and powers the monotonic deque and 0-1 BFS (push 0-weight edges to the front, 1-weight to the back).

## Priority queue is not a queue

Despite the name it orders by priority, not arrival: it is a heap. Do not confuse them in explanations.

## Interview problems

- Design a hit counter / logger (queue of timestamps, drop old ones).
- Number of recent calls (LC 933).
- Moving average from a data stream (LC 346): a queue plus a running sum.
- Reveal cards in increasing order (LC 950): simulate with a deque of indices.
- Dota2 Senate (LC 649): two queues of indices, the earlier one bans and re-enqueues at index + n.
`,
    doubts: [
      ["How does a circular buffer tell full from empty?", "Keep an explicit size counter, or leave one slot unused so head == tail means empty and (tail + 1) mod k == head means full."],
      ["Why is Java's LinkedList slower than ArrayDeque?", "Each element is a separate node object (allocation, pointer chasing, cache misses). ArrayDeque stores references in a contiguous circular array."],
    ],
    revise: md`
? Circular index? :: (head + i) mod capacity.
? Full vs empty in a ring buffer? :: Track size, or keep one slot empty.
? Python queue? :: collections.deque (never list.pop(0)).
? Java queue? :: ArrayDeque.
? Deque powers which algorithms? :: Monotonic deque, 0-1 BFS, sliding windows.
`,
    pitfalls: ["list.pop(0) in Python BFS", "Off-by-one full/empty detection in ring buffers", "Calling a priority queue FIFO"],
    quiz: [Q("Best Java class for a BFS queue?", ["LinkedList", "*ArrayDeque", "Stack", "PriorityQueue"], "Array-backed, no node allocations.")],
    sources: [S.article("Circular buffer", "Wikipedia", "https://en.wikipedia.org/wiki/Circular_buffer"), S.article("collections.deque", "Python documentation", "https://docs.python.org/3/library/collections.html#collections.deque"), S.article("ArrayDeque (Java SE 21)", "Oracle", "https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/ArrayDeque.html")],
    problems: [622, 641, 933, 346, 950, 649],
  },
  "monotonic-deque": {
    blurb: "A deque whose values stay sorted, with expired indices dropped from the front: sliding-window maximum in O(n), and the shortest subarray with sum at least k even with negatives.",
    signals: ["Maximum or minimum of every window of size k", "Shortest subarray with sum ≥ k (negatives allowed)", "Constrained subsequence or jump DP with a window of k previous states"],
    widgets: ["mono-deque"],
    lesson: md`
## Sliding Window Maximum (LC 239)

Keep indices in a deque with **decreasing values**:

1. Pop from the **back** while a[back] ≤ a[i]: those can never be a future maximum (a[i] is larger and will stay in the window longer).
2. Push i at the back.
3. Pop from the **front** if it has left the window (front ≤ i − k).
4. The front is the maximum of the current window.

[[widget:mono-deque]]

Each index is pushed and popped at most once: O(n) total, O(k) space.

## Why the discarded elements are useless

If j < i and a[j] ≤ a[i], then for every future window containing j, it also contains i (i leaves later), and a[i] ≥ a[j]. So j can never be the answer again. This "dominated by someone younger and better" argument is the whole idea.

## Shortest Subarray with Sum at Least K (LC 862)

With negatives, a sliding window fails. Use prefix sums P and a deque of indices with **increasing** P:

- for each i, while P[i] − P[front] ≥ k: record i − front and pop the front (any later i would give a longer subarray with that start);
- while P[back] ≥ P[i]: pop the back (a later, smaller prefix is a better start);
- push i.

O(n). Interviewers like this one because it combines prefix sums, monotonicity and the two kinds of domination.

## Deque-optimised DP

When dp[i] = a[i] + max(dp[j]) for j in [i − k, i − 1], the inner max is a sliding window maximum over dp values: O(n) instead of O(nk). See deque-optimised DP.

## Related

- Window minimum: same with increasing values.
- Max and min together: two deques (longest subarray with max − min ≤ limit).
- Jump Game VI, Constrained Subsequence Sum, Max Value of Equation (LC 1499: maximise yi + yj + |xi − xj| → keep yj − xj decreasing).
`,
    doubts: [
      ["Pop from the back with ≤ or <?", "Either is correct for the maximum. ≤ keeps the deque smaller (equal older values are dropped). With <, equal values stay, which is harmless."],
      ["Why check the front for expiry after pushing?", "The order of steps 1–3 can vary as long as, when you read the answer, the front is inside the window. Checking expiry right before reading is the simplest correct order."],
      ["In LC 862, why pop the front after recording?", "For that start index, the current i gives the shortest possible end; any later end only lengthens the subarray. So that start is finished."],
    ],
    revise: md`
? Window max deque order? :: Decreasing values (indices stored).
? Back pop rule? :: Pop while a[back] ≤ a[i]: dominated by a younger, larger value.
? Front pop rule? :: Pop when the index leaves the window.
? Complexity? :: O(n): each index pushed and popped once.
? Shortest subarray sum ≥ k with negatives? :: Prefix sums + increasing deque; pop front while P[i] − P[front] ≥ k, pop back while P[back] ≥ P[i].
? dp[i] = a[i] + max(dp[i−k..i−1])? :: Window max over dp values with a deque.
`,
    pitfalls: ["Storing values instead of indices (cannot expire them)", "Reading the front before removing expired indices", "Using a heap (O(n log k)) when O(n) is expected"],
    quiz: [
      Q("Window max of [1,3,−1,−3,5,3,6,7], k = 3: the third window's max?", ["3", "−1", "*5", "6"], "Windows: [1,3,−1]→3, [3,−1,−3]→3, [−1,−3,5]→5."),
      Q("The deque for window maximum keeps values…", ["increasing", "*decreasing", "unsorted", "only the max"], "Smaller older values are dominated."),
    ],
    sources: [S.article("Sliding window technique", "USACO Guide", "https://usaco.guide/gold/sliding-window"), S.article("Minimum stack / minimum queue", "cp-algorithms", "https://cp-algorithms.com/data_structures/stack_queue_modification.html")],
    problems: [239, 862, 1438, 1499, 1696, 1425],
  },
  "deque-dp": {
    blurb: "When a DP transition takes the best of the previous k states, a monotonic deque turns O(n·k) into O(n).",
    signals: ["dp[i] depends on max/min of dp over a sliding range of previous indices", "Jump at most k steps", "Subsequence with gaps at most k between chosen elements"],
    lesson: md`
## The shape

dp[i] = cost(i) + max(dp[j]) for j ∈ [i − k, i − 1].

The naive inner loop costs O(k). But the range [i − k, i − 1] slides by one each step, so the max is a **sliding window maximum over dp values**, maintained with a monotonic deque of indices in O(1) amortised.

\`\`\`
dq = deque([0]); dp[0] = a[0]
for i in range(1, n):
    while dq[0] < i - k: dq.popleft()
    dp[i] = a[i] + dp[dq[0]]
    while dq and dp[dq[-1]] <= dp[i]: dq.pop()
    dq.append(i)
\`\`\`

## Problems

- **Jump Game VI** (LC 1696): maximise score jumping at most k forward. Exactly the template.
- **Constrained Subsequence Sum** (LC 1425): dp[i] = a[i] + max(0, max of the window): you may start fresh.
- **Max Value of Equation** (LC 1499): yi + yj + xj − xi with xj − xi ≤ k → keep yi − xi decreasing in the window.
- **Delivering Boxes from Storage to Ports** (LC 1687): a harder example with a deque over a cost-adjusted DP.

## The general family

This is the simplest **DP optimisation**: monotone queue. Others with the same goal (cut a factor of n or k from the transition): convex hull trick (linear functions), divide and conquer optimisation (monotone argmin), Knuth's optimisation (interval DP). See DP optimisations.

## Heap alternative

A max-heap of (dp[j], j) with lazy removal of expired indices gives O(n log n). Acceptable, and easier for some candidates; the deque is optimal.
`,
    doubts: [
      ["Why is the deque valid for DP values when they are computed on the fly?", "The deque only ever contains already computed dp[j] for j < i. You push dp[i] after computing it, and it becomes available for later indices exactly when it enters their window."],
      ["What if the window is [i − k, i − m] (a gap)?", "Push index i − m into the deque when processing i (delayed insertion), and expire indices < i − k as usual."],
    ],
    revise: md`
? Template recognition? :: dp[i] = cost(i) + max/min of dp over the last k indices.
? Optimisation? :: Monotonic deque of dp indices: O(n) instead of O(nk).
? Constrained Subsequence Sum transition? :: dp[i] = a[i] + max(0, window max).
? Heap alternative complexity? :: O(n log n) with lazy deletion.
`,
    pitfalls: ["Pushing dp[i] into the deque before using the window for i", "Forgetting the 'start fresh' option (max with 0)"],
    quiz: [Q("Jump Game VI with n = 10⁵, k = 10⁵. Naive DP is…", ["fine", "*O(nk) = 10¹⁰, too slow", "O(n log n)", "O(n)"], "Use the monotonic deque.")],
    sources: [S.article("Double-ended queue", "Wikipedia", "https://en.wikipedia.org/wiki/Double-ended_queue"), S.article("Monotonic queue optimization", "USACO Guide", "https://usaco.guide/gold/sliding-window")],
    problems: [1696, 1425, 1499, 1687, 2944],
  },
};
