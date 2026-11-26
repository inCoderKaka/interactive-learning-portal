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

Two indices start at the two ends of a **sorted** array (or a string) and move toward each other. At every step, a comparison tells you which end can be discarded for good, so each step removes one element from consideration and the whole scan is O(n), replacing an O(n²) check of all pairs.

The canonical example is **Two Sum II** (LC 167): find two numbers in a sorted array summing to target.

\`\`\`python
def two_sum_sorted(a, target):
    l, r = 0, len(a) - 1
    while l < r:
        s = a[l] + a[r]
        if s == target: return [l, r]
        if s < target: l += 1        # a[l] is too small for every remaining partner
        else: r -= 1                 # a[r] is too big for every remaining partner
    return []
\`\`\`

[[widget:two-pointers]]

## Why discarding is safe

If a[l] + a[r] < target, then a[l] plus **any** remaining element is at most a[l] + a[r] (a[r] is the largest remaining), so a[l] cannot be in any solution: drop it. Symmetrically, if the sum is too big, a[r] plus anything remaining is at least a[l] + a[r], so drop a[r]. Each step eliminates one element without missing a pair; this "elimination" argument is the proof you should say in an interview.

Equivalently, picture the n × n grid of pairs (i, j): each comparison removes a whole row or column, and the walk is a staircase from the top-right corner, like searching a sorted matrix.

## 3Sum and k-Sum

**3Sum** (LC 15): all unique triplets summing to 0. Sort; for each i, run two pointers on a[i + 1..] with target −a[i]. O(n²).

Duplicates: skip a[i] if it equals a[i − 1] (same first element); after finding a triplet, move l and r past equal values. Skipping never loses an answer because an equal value would only reproduce triplets already found.

Prunes: if a[i] > 0 (sorted, so everything after is positive) stop; if a[i] + a[i + 1] + a[i + 2] > 0 stop; if a[i] + a[n − 2] + a[n − 1] < 0 skip this i.

- **3Sum Closest** (LC 16): track the best |sum − target| while moving pointers the same way.
- **3Sum Smaller**: when a[i] + a[l] + a[r] < target, all r − l pairs (l, l+1..r) work: add r − l and l += 1.
- **4Sum** (LC 18): two nested loops plus two pointers, O(n³); **k-Sum** recurses down to 2-Sum: O(n^(k−1)). Watch overflow in Java (sums of four ints).
- **Valid Triangle Number** (LC 611): sort; fix the largest side c at index k; two pointers on [0, k): if a[l] + a[r] > a[k], all l..r−1 work with r: add r − l and r −= 1; else l += 1.

## Container With Most Water (LC 11)

Area = min(h[l], h[r]) × (r − l). Move the pointer at the **shorter** line. Why: the area of any container using the shorter line with a closer partner is at most min(h) × (smaller width), which is smaller than the current area; so the shorter line has already achieved its best and can be discarded. When heights are equal, moving either is fine: neither can do better with a narrower partner.

## Trapping Rain Water (LC 42)

Water above i = min(maxLeft(i), maxRight(i)) − h[i]. Two pointers keep leftMax and rightMax: if h[l] < h[r] (so leftMax ≤ some right wall), the water at l is determined by leftMax: add leftMax − h[l] and l += 1; otherwise process r symmetrically. O(n) time, O(1) space.

Alternatives: prefix and suffix maximum arrays (O(n) space, easiest to explain), or a monotonic stack that fills water layer by layer.

## Other uses

- **Valid Palindrome** (LC 125): compare from both ends, skipping non-alphanumerics. **Valid Palindrome II** (LC 680): at the first mismatch, try skipping either side once.
- **Reverse a string or array in place**; **Reverse Vowels** (LC 345).
- **Squares of a Sorted Array** (LC 977): the largest square is at one of the ends; fill the output from the back.
- **Boats to Save People** (LC 881): heaviest with lightest.
- **Two Sum count pairs below target**: when a[l] + a[r] < target, add r − l pairs.
- **Sort Colors / partitions** use pointers from both ends too (see partitioning).

## When the input is not sorted

Sorting costs O(n log n) and loses original indices (store (value, index) pairs if indices are needed). If indices matter and O(n) is wanted, use a hash map (Two Sum, LC 1). If many queries ask for pairs, sort once and run two pointers per query.

## Interview angles

- State the elimination argument for each pointer move.
- Handle duplicates explicitly in k-Sum.
- For Container and Trapping Rain Water, explain why moving the shorter side is safe.

## Connections

Same-direction pointers and sliding windows; binary search (two pointers on a sorted array is the linear-time cousin of searching for each partner); staircase search in sorted matrices.
`,
    doubts: [
      ["How do I justify moving a pointer in an interview?", "Say what is eliminated: 'a[L] + a[R] < target and R is the largest remaining, so L cannot pair with anything; drop L'. The grid-of-pairs picture makes it concrete."],
      ["3Sum: why does skipping duplicates not lose answers?", "Equal values at the fixed position produce exactly the same set of pairs from the suffix, so only the first is needed. After a hit, any other pair using the same a[L] value with a different partner would need the same partner value, which is again a duplicate."],
      ["Container: what if both heights are equal?", "Moving either is safe: whichever you keep, the minimum height cannot exceed the current equal height while the width shrinks, so neither discarded wall can be part of a better answer with the current partner."],
      ["Do two pointers work for 'subarray with sum k'?", "Those are same-direction (window) problems, and only with non-negative numbers. Opposite pointers need sorted data and a pair condition."],
      ["Why is 3Sum O(n²) and not O(n² log n)?", "Sorting costs O(n log n) once; then for each of the n choices of i, the two-pointer scan is O(n). The total is O(n log n + n²) = O(n²)."],
      ["Can two pointers find the pair with sum closest to a target?", "Yes: the same moves (sum < target → l += 1, else r −= 1) visit a pair achieving the minimum |sum − target|, because the elimination argument still holds: when the sum is too small, no pair with the current a[l] can be closer than one with a larger partner, which is already the current r."],
      ["How do I handle very large numbers in 4Sum?", "In Java and C++ cast to long before adding (four values up to 10⁹ overflow 32 bits). Python integers do not overflow."],
    ],
    revise: md`
? Two Sum II step rule? :: Sum too small → L++; too big → R−−.
? Why is it safe? :: Each step eliminates a whole row or column of the pair grid.
? 3Sum complexity and dedupe? :: Sort, fix i, two pointers: O(n²); skip equal values at i, L and R.
? Container With Most Water move? :: Move the shorter wall.
? Trapping Rain Water two-pointer rule? :: Process the side with the smaller running max; water = that max − height.
? Valid Triangle Number counting step? :: If a[L] + a[R] > a[k], add R − L and move R left.
? Unsorted, need indices? :: Hash map Two Sum, O(n).
? 3Sum Smaller count step? :: If sum < target, add r − l and move l.
? Valid Triangle Number loop? :: Fix the largest side k; if a[l] + a[r] > a[k], add r − l and r −= 1.
? Squares of a Sorted Array? :: Compare |ends|, fill the output from the back.
? Pair grid picture? :: Each comparison removes a row or column (staircase).
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
## Read and write pointers

Two indices move **in the same direction**: a fast **read** pointer visits every element; a slow **write** pointer marks where the next kept element goes. Everything before write is the processed output; everything between write and read is garbage that will be overwritten. One pass, O(1) extra space, and the relative order of kept elements is preserved (stable).

\`\`\`python
def remove_element(a, val):                 # LC 27
    w = 0
    for r in range(len(a)):
        if a[r] != val:
            a[w] = a[r]; w += 1
    return w                                 # new length; a[:w] is the result
\`\`\`

## Problems

- **Remove Element** (LC 27): keep everything except val.
- **Move Zeroes** (LC 283): keep non-zeros in order, then fill the tail with zeros (or swap a[r] with a[w] so zeros drift right without a second pass). Stable for non-zeros.
- **Remove Duplicates from Sorted Array** (LC 26): keep a[r] if it differs from a[w − 1] (the last kept value).
- **Remove Duplicates II** (LC 80, at most k = 2 copies): keep a[r] if w < k or a[r] ≠ a[w − k]. Compare with the **written** array, a[w − k], not a[r − k]: the kept copies decide whether one more is allowed, and the read side may contain values already dropped.
- **Sort Array by Parity** (LC 905): evens to the front (write pointer) or two pointers from both ends (unstable but fewer moves).
- **Remove All Adjacent Duplicates in String** (LC 1047): the write pointer acts as a stack top: if the new char equals out[w − 1], w −= 1 (pop), else write it.
- **String Compression** (LC 443): read groups, write the character and its count.
- **Duplicate Zeros** (LC 1089): count how many elements fit, then write from the back (to avoid overwriting unread values).

## Subsequence checks

**Is Subsequence** (LC 392): i over s, j over t; advance i when s[i] == t[j]; always advance j; s is a subsequence iff i reaches len(s). O(|t|).

For many queries s against the same t (the follow-up), preprocess t: for each character, the sorted list of its positions; then for each character of s, binary search the next position after the current one. O(|s| log |t|) per query. Or a "next occurrence" table nxt[i][c] = the first index ≥ i holding c: O(26·|t|) memory, O(|s|) per query.

- **Number of Matching Subsequences** (LC 792): bucket words by their next needed character; scan t once, advancing every word waiting for the current character.
- **Longest Word in Dictionary through Deleting** (LC 524): subsequence check per word.
- **Append Characters to String to Make Subsequence** (LC 2486): match greedily, answer = remaining length of t.

## Fast and slow at different speeds

The same-direction idea with speeds instead of filters:

- **Middle of a linked list**: slow one step, fast two steps.
- **Cycle detection** (Floyd): fast laps slow inside a cycle.
- **k-th from the end**: lead pointer k steps ahead, then move both.
- **Sliding windows** are same-direction pointers where the left pointer moves only when a condition fails.

## Pitfalls

- Off-by-one in the returned length (w is the count of kept elements, not the last index).
- Comparing with the wrong neighbour when deduplicating (a[w − 1], not a[r − 1]: they differ once something has been dropped).
- Forgetting the tail fill in Move Zeroes.
- Order matters? Read/write keeps order; swap-with-end deletion is O(1) per deletion but does not.

## Interview angles

- Say the invariant: "a[0..w) is the answer for a[0..r)".
- Prefer read/write over repeated list deletions (each deletion would be O(n), giving O(n²)).
- For many subsequence queries, preprocess t.

## Connections

Sliding windows, linked-list fast/slow pointers, partitioning (Dutch flag uses three pointers in one direction plus one from the end), and stacks (the write pointer as a stack top).
`,
    doubts: [
      ["Why is a[r] compared with a[w − k] and not a[r − k] in 'at most k duplicates'?", "a[r − k] is in the original array and may have been overwritten or skipped. The constraint is about the output: a[r] is allowed if it differs from the element k positions back in what you have kept."],
      ["Is Move Zeroes stable for non-zero elements?", "Yes: non-zeros are written in their original order. The zeros' order does not matter since they are identical."],
      ["Why not just call list.remove for each unwanted element?", "Each removal shifts the rest of the list: O(n) per removal and O(n²) overall. Read/write does all removals in one O(n) pass."],
      ["Can the write pointer ever overtake the read pointer?", "No: w increases only when r has just read an element, so w ≤ r + 1 at all times. That is why overwriting a[w] never destroys an element that has not been read yet."],
      ["How do I generalise \"at most k duplicates\" to unsorted input?", "Sortedness is what makes duplicates adjacent. For unsorted input, keep a count map and keep a[r] only while its count is below k; the write pointer still compacts in order."],
    ],
    revise: md`
? Read/write invariant? :: a[0..w) = kept elements in order.
? Remove duplicates allowing k copies? :: Keep a[r] if w < k or a[r] ≠ a[w − k].
? Is Subsequence for many queries? :: Positions list per character + binary search (or a next-occurrence table).
? Complexity of read/write compaction? :: O(n) time, O(1) space.
? Invariant of read/write? :: a[0..w) is the processed answer for a[0..r).
? Many subsequence queries? :: Positions per character + binary search, or a next-occurrence table.
? Number of Matching Subsequences? :: Bucket words by next needed char; one scan of t.
? Duplicate Zeros? :: Count what fits, then write from the back.
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
## Partitioning

Partitioning rearranges an array so that elements satisfying a predicate come first (two groups) or so that elements fall into three bands (less, equal, greater than a pivot). It is the core of quicksort and quickselect, and it solves "put all X before all Y" problems in O(n) time and O(1) space.

## Two-way partition

**Lomuto** (simple): one boundary i marks the end of the "≤ pivot" region; scan j and swap a[j] into the region when it qualifies; finally put the pivot after the region.

\`\`\`python
def lomuto(a, lo, hi):                  # pivot = a[hi]
    p, i = a[hi], lo
    for j in range(lo, hi):
        if a[j] < p:
            a[i], a[j] = a[j], a[i]; i += 1
    a[i], a[hi] = a[hi], a[i]
    return i                             # pivot's final index
\`\`\`

**Hoare** (efficient): two pointers start at the ends and move inward; the left stops at an element ≥ pivot, the right at an element ≤ pivot; swap them; repeat until they cross. About three times fewer swaps than Lomuto on average and better behaviour with many equal keys, but it returns a split point (not the pivot's final index) and the recursion must use it accordingly.

Neither is stable. A stable partition needs O(n) extra space (two lists) or O(n log n) time in place.

Predicate partitions (no pivot): even before odd (Sort Array by Parity, LC 905), negatives before positives, letters before digits: the same loop with the predicate instead of "< p".

## Dutch national flag (three-way)

Dijkstra's problem: arrange values into three bands (Sort Colors, LC 75: 0s, 1s, 2s) in one pass.

Invariant with pointers lo, mid, hi:

- a[0..lo) = less than the pivot (0s),
- a[lo..mid) = equal (1s),
- a[mid..hi] = unknown,
- a(hi..n) = greater (2s).

\`\`\`python
def sort_colors(a):
    lo, mid, hi = 0, 0, len(a) - 1
    while mid <= hi:
        if a[mid] == 0:
            a[lo], a[mid] = a[mid], a[lo]; lo += 1; mid += 1
        elif a[mid] == 1:
            mid += 1
        else:
            a[mid], a[hi] = a[hi], a[mid]; hi -= 1      # do NOT advance mid
\`\`\`

[[widget:dutch-flag]]

Why not advance mid after swapping with hi: the element brought from hi is unexamined (it was in the unknown region), so it must be checked. When swapping with lo, the element brought from lo is a 1 (or mid == lo), already examined, so mid can advance.

One pass, O(n), O(1) space; each element is swapped at most twice.

Three-way partitioning makes quicksort robust to many equal keys (all equal values settle in the middle band in one pass instead of degrading to O(n²)).

## Variants

- **Quickselect**: partition, then recurse into the side containing k (expected O(n)).
- **Wiggle Sort II** (LC 324): find the median with quickselect, then three-way partition on "virtual indices" (i → (1 + 2i) mod (n | 1)) so larger values land on odd positions and smaller on even: O(n) time, O(1) space.
- **Partition Array According to Given Pivot** (LC 2161): stable three-way: needs extra space (three lists or two passes writing into a result array).
- **Sort Array by Parity II** (LC 922): even indices hold evens, odd indices hold odds: two pointers stepping by 2, swapping misplaced pairs.
- **Segregate 0s and 1s**, **move negatives to the front**: two-way partitions.
- **Kth Largest** via partition; **Top K Frequent** via partition on frequencies.
- **Partition Labels** (LC 763) shares the name but is a greedy over last occurrences.

## Interview angles

- Write Dutch flag from memory and explain why mid does not advance after the hi swap.
- Say "not stable" and what stability would cost.
- Choose Hoare for efficiency, Lomuto for clarity; three-way when duplicates are many.

## Connections

Quicksort and quickselect are built on partitioning; read/write pointers do stable filtering; counting sort is the alternative for tiny value ranges (Sort Colors by counting is two passes).
`,
    doubts: [
      ["Why not advance mid after swapping with hi?", "The element that came from position hi has not been examined yet; it could be a 0, 1 or 2. When swapping with lo, the incoming element is already known to be a 1 (it came from the 1s region) or it is the same position, so mid can advance."],
      ["Is the Dutch flag partition stable?", "No. Equal elements can change relative order because of the swaps. Stable partitioning in place costs O(n log n); with O(n) extra space it is a simple pass per class."],
      ["Lomuto or Hoare in an interview?", "Lomuto is easier to write correctly. Mention Hoare's fewer swaps and the three-way partition for duplicates if asked about performance."],
      ["Why does Hoare's partition do fewer swaps than Lomuto?", "Hoare swaps only pairs that are both on the wrong side, moving two misplaced elements per swap. Lomuto swaps every element smaller than the pivot into the prefix, even ones already in a valid position, so it swaps much more on random data and especially when many elements are smaller than the pivot."],
      ["Can Sort Colors be done with counting instead?", "Yes: count 0s, 1s and 2s, then overwrite: two passes, O(n), O(1) space. Dutch flag does it in one pass and generalises to partitioning around any pivot, which counting cannot do for arbitrary values."],
      ["How many swaps does the Dutch flag algorithm do at most?", "Each swap either fixes an element in the low band (with lo) or the high band (with hi), and each element enters a final band once, so at most n swaps in total; in practice an element can be swapped twice (to hi, then later processed)."],
    ],
    revise: md`
? Dutch flag regions? :: [0,lo) zeros, [lo,mid) ones, [mid,hi] unknown, (hi,n) twos.
? On a 2 at mid? :: Swap with hi, hi−−, do not advance mid.
? On a 0 at mid? :: Swap with lo, lo++, mid++.
? Three-way partition helps quicksort when? :: Many equal keys (avoids O(n²)).
? Lomuto vs Hoare? :: Lomuto simpler; Hoare fewer swaps and better with duplicates.
? Dutch flag invariant regions? :: [0,lo) less, [lo,mid) equal, [mid,hi] unknown, (hi,n) greater.
? Wiggle Sort II virtual index? :: i → (1 + 2i) mod (n | 1).
? Sort Array by Parity II? :: Pointers on even and odd indices stepping by 2; swap misplaced pairs.
? Stable partition cost? :: O(n) extra space, or O(n log n) in place.
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
## Merging two sorted sequences

Given two sorted sequences, produce their sorted union by repeatedly taking the smaller front element. One pointer per sequence; each step advances one pointer; total O(n + m). Merging is the heart of merge sort, external sorting, database merge joins and many interview problems on sorted inputs.

\`\`\`python
def merge(a, b):
    i = j = 0; out = []
    while i < len(a) and j < len(b):
        if a[i] <= b[j]: out.append(a[i]); i += 1    # <= keeps it stable
        else: out.append(b[j]); j += 1
    out.extend(a[i:]); out.extend(b[j:])
    return out
\`\`\`

Taking from a on ties (≤) keeps the merge **stable**: equal elements from a stay before those from b, which is what makes merge sort stable.

## Merging in place: fill from the back (LC 88)

Merge Sorted Array: a has length m + n with n empty slots at the end; merge b into it. Writing from the front would overwrite elements of a not yet read. Writing from the **back** is safe: the largest remaining element goes to position k = i + j + 1 (counting from the end), and the write position is always ≥ the read position in a, so nothing unread is overwritten. When b is exhausted, the rest of a is already in place; when a is exhausted, copy the rest of b.

## Intersection and union

On sorted inputs, advance the pointer at the smaller value; on equal values, output (for intersection) and advance both.

- **Intersection of Two Arrays** (LC 349: distinct values) and **II** (LC 350: with multiplicities). Unsorted: hash set or counter. Follow-up "one array is huge on disk": stream it against a hash map of the small one, or sort both and merge in chunks.
- **Union without duplicates**: output the smaller and skip duplicates on both sides.
- **Interval List Intersections** (LC 986): the overlap of the current pair is [max(starts), min(ends)] if non-empty; advance the interval that ends first.
- **Merge Two Sorted Lists** (LC 21): the same with linked lists and a dummy head.
- **Squares of a Sorted Array** (LC 977): two sorted "halves" (negatives reversed and non-negatives) merged, or two pointers from the ends.
- **Median of two sorted arrays**: merging to the middle is O(m + n); the binary search is O(log min(m, n)).

## Merge k sorted

- **Min-heap** of the k current fronts: pop the smallest, push its successor: O(N log k) for N total elements (Merge k Sorted Lists, LC 23).
- **Divide and conquer**: merge pairs, then pairs of results, …: also O(N log k), no heap.
- Merging one list into the accumulated result k times costs O(N·k): avoid it.

## Comparing sorted sequences

- **Backspace String Compare** (LC 844): walk both strings from the end, skipping characters deleted by '#' (count pending skips); compare character by character: O(1) space.
- **Compare Version Numbers** (LC 165): split on '.', compare numeric parts pairwise, treating missing parts as 0 ("1.0" equals "1").
- **Is Subsequence** is a merge where only one pointer must reach the end.
- **Smallest Range Covering Elements from K Lists** (LC 632): a heap of one element per list plus the current maximum.
- **Find K Pairs with Smallest Sums** (LC 373): merging k implicit sorted lists with a heap.

## When one list is much longer

If m ≪ n, merging costs O(m + n) but binary-searching each element of the short list in the long one costs O(m log n), which is better when m log n < n. Galloping (exponential search from the current position), used by Timsort, adapts automatically: it skips long runs of the longer list in O(log run) steps.

## Interview angles

- Use ≤ for stability and explain it.
- For in-place merging, fill from the back and explain why it never overwrites unread data.
- Mention the heap for k lists and galloping for unbalanced lengths.

## Connections

Merge sort, k-way merge with heaps, external sorting, and the two-pointer family.
`,
    doubts: [
      ["Why fill from the back when merging into A?", "The free space is at A's end. Writing the largest elements there first never overwrites an A element that has not been read: the write index is always ≥ the read index i."],
      ["What if one list is much longer than the other?", "If |A| ≪ |B|, binary searching each A element in B costs O(|A| log |B|), better than O(|A| + |B|). Galloping (as in TimSort) adapts between the two."],
      ["What changes if the two arrays may contain duplicates and I want the union with duplicates kept?", "Nothing in the merge: it naturally keeps every element from both inputs. Only a \"set union\" needs the skip-equal-values logic."],
      ["How does a database merge join use this?", "Both tables are sorted on the join key; two cursors advance like merge pointers, and for runs of equal keys the join outputs all pairs between the two runs. It is O(n + m + output) and needs no hash table, which is why databases use it when inputs are already sorted."],
      ["Is merging two linked lists in place O(1) extra space?", "Yes: relink existing nodes behind a dummy head instead of creating new ones. Only a few pointers are used."],
    ],
    revise: md`
? Merge two sorted arrays cost? :: O(m + n).
? In-place merge into the first array? :: Fill from the back.
? Interval intersection rule? :: [max(starts), min(ends)] if valid; advance the one ending first.
? Tiny A vs huge B? :: Binary search each A element: O(|A| log |B|).
? Why does back-filling never overwrite unread a? :: The write index i + j + 1 is always ≥ the read index i.
? Compare Version Numbers missing parts? :: Treat as 0 ("1.0" == "1").
? Galloping search? :: Exponential search from the current position to skip runs (Timsort).
? Intersection when one array is on disk? :: Stream it against a hash map of the small one.
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
## The pattern

Many problems ask about every contiguous block of exactly k elements: the maximum sum of k consecutive elements, whether some window of length k is an anagram of a pattern, the number of distinct values in each window. Recomputing each window from scratch costs O(n·k). A **sliding window** reuses work: moving the window one step right adds one element and removes one element, so each step is O(1) (or O(1) amortised) and the scan is O(n).

## The loop

\`\`\`python
def max_sum_k(a, k):
    s = best = sum(a[:k])
    for i in range(k, len(a)):
        s += a[i] - a[i - k]          # add the entering element, remove the leaving one
        best = max(best, s)
    return best
\`\`\`

A general template: for each i, add a[i]; if i ≥ k, remove a[i − k]; if i ≥ k − 1, the window a[i − k + 1..i] is complete: record the answer.

## What the window maintains

The window state must support "add one element" and "remove one element" cheaply:

- **Sum or average**: Maximum Average Subarray I (LC 643), Number of Sub-arrays of Size K with Average ≥ Threshold (LC 1343).
- **Count map**: character or value frequencies. **Permutation in String** (LC 567) and **Find All Anagrams in a String** (LC 438): the window over s of length |p| is an anagram iff its counts equal p's counts.
- **Count of "good" elements**: Maximum Number of Vowels in a Substring of Given Length (LC 1456); Minimum Swaps to Group All 1's Together (LC 1151: window size = total ones, answer = window size − max ones in any window; circular version LC 2134 doubles the array).
- **Distinct count**: a count map plus a counter of keys with non-zero count (delete keys that reach 0, or len(map) is wrong).
- **Maximum or minimum**: a monotonic deque (Sliding Window Maximum, LC 239), since removal of the leaving element is not O(1) with a plain variable.
- **Median or order statistics**: two heaps with lazy deletion, or a sorted multiset (Sliding Window Median, LC 480).

## Avoiding O(26) comparisons at every step

For anagram windows, comparing two count arrays costs O(26) per step: fine (O(26n)). For larger alphabets, keep a single integer **matches** = the number of characters whose window count equals the target count. When a count changes, update matches only for that character (it may start or stop matching). The window is valid iff matches equals the number of distinct characters in the target. O(1) per step.

## Variants

- **Circular arrays**: iterate i over n + k − 1 positions and use a[i mod n]; or append the array to itself.
- **Fixed window over words**: Substring with Concatenation of All Words (LC 30): all words have the same length L; run L separate windows (one per offset mod L), stepping by whole words with a word-count map.
- **Grumpy Bookstore Owner** (LC 1052): baseline satisfied customers plus the best extra gain over any window of length minutes.
- **K Radius Subarray Averages** (LC 2090): window of size 2k + 1 centred at each index.
- **Maximum Points You Can Obtain from Cards** (LC 1423): taking k cards from the ends equals leaving a window of n − k cards in the middle with the minimum sum.
- **Defuse the Bomb** (LC 1652): circular window sums.
- **Repeated DNA Sequences**: fixed window of 10 with hashing.

## Pitfalls

- Recording the answer before the window is full (i < k − 1).
- Forgetting to delete zero-count keys when the answer uses the number of keys.
- Off-by-one in the leaving index (a[i − k]).
- k > n: no window exists; decide what to return.

## Interview angles

- Say what the window maintains and why add/remove are O(1).
- Use the matches counter for anagram windows.
- Recognise "complement window" tricks (cards from the ends, grouping ones).

## Connections

Variable-size windows (longest/shortest valid window), monotonic deques for window extremes, two heaps for window medians, and rolling hashes for window fingerprints.
`,
    doubts: [
      ["How do I avoid comparing two 26-length count arrays at every step?", "Maintain 'matches' = number of letters whose window count equals the target count. When a count changes, adjust matches only for that letter (it can move into or out of agreement). Window is an anagram iff matches = 26."],
      ["Circular arrays?", "Iterate r from 0 to n + k − 2 and index with r mod n, or conceptually concatenate the array with itself."],
      ["When is a fixed window the wrong tool?", "When the window length is not fixed by the problem (longest or shortest valid subarray: variable window), or when the property is not maintainable under add/remove (arbitrary order statistics need extra structures), or when negative numbers break the monotonicity a variable window relies on."],
      ["Is a deque needed for the maximum of each window?", "For O(n) total, yes: a single \"current max\" variable cannot be updated when the maximum leaves the window. A monotonic deque keeps candidates in decreasing order and drops expired ones from the front."],
      ["How do I return the windows' start indices for anagram matches?", "Each time the window is full and matches the target (matches == distinct count), record i − k + 1, the start of the current window."],
    ],
    revise: md`
? Fixed window loop? :: Add a[r]; if r ≥ k remove a[r−k]; if r ≥ k−1 record.
? Anagrams in O(1) per step? :: Track the number of letters whose counts match the target.
? Take k cards from both ends? :: Minimum-sum window of length n − k in the middle.
? Group all 1s with minimum swaps? :: Window size = count of 1s; minimise zeros inside.
? Cards from both ends (LC 1423)? :: Minimum-sum window of n − k in the middle; total − it.
? Minimum Swaps to Group 1's? :: Window size = number of ones; answer = size − max ones in a window (double for circular).
? Concatenation of All Words? :: L windows (one per offset), stepping by whole words.
? Grumpy Bookstore Owner? :: Baseline + best window gain of length minutes.
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
## Longest or shortest valid window

When a problem asks for the **longest** or **shortest** contiguous subarray (or substring) satisfying a condition, try a window [l, r] whose two ends only move forward: r expands the window one element at a time; l shrinks it when needed. Each index enters once and leaves once, so the whole scan is O(n), even though there are O(n²) subarrays.

## The two templates

**Longest valid window** (the condition is preserved when the window shrinks):

\`\`\`python
def longest(a):
    l = best = 0
    for r in range(len(a)):
        add(a[r])
        while not valid():          # shrink until valid again
            remove(a[l]); l += 1
        best = max(best, r - l + 1)
    return best
\`\`\`

**Shortest valid window** (the condition is preserved when the window grows):

\`\`\`python
def shortest(a):
    l, best = 0, float("inf")
    for r in range(len(a)):
        add(a[r])
        while valid():              # record, then try to shrink further
            best = min(best, r - l + 1)
            remove(a[l]); l += 1
    return best
\`\`\`

[[widget:sliding-window]]

## When is the window method correct?

It needs **monotonicity**:

- For "longest": if [l, r] is valid, every sub-window inside it is valid (so when the window becomes invalid, moving l right is the only fix, and no shorter valid window ending at r starts earlier than the new l).
- For "shortest": if [l, r] is valid, every window containing it is valid (so once valid, shrinking from the left is the only way to find something shorter).

Typical monotone conditions: "at most k distinct", "no repeated character", "sum ≤ S with non-negative numbers", "at most k zeros", "sum ≥ S with positive numbers". **Negative numbers break sum conditions**: adding an element can decrease the sum, so validity is not monotone. Then use prefix sums with a hash map (subarray sum equals k), prefix sums with a monotonic deque (shortest subarray with sum ≥ K, LC 862), or binary search over prefix sums.

## Classic problems

- **Longest Substring Without Repeating Characters** (LC 3): keep the last index of each character; when s[r] was seen at index p ≥ l, jump l = p + 1 (no inner while loop needed). O(n).
- **Longest Repeating Character Replacement** (LC 424): a window is valid if (length − maxFreq) ≤ k, where maxFreq is the highest character count in the window (the others are replaced).
- **Max Consecutive Ones III** (LC 1004): at most k zeros in the window.
- **Fruit Into Baskets** (LC 904): at most 2 distinct values. **Longest Substring with At Most K Distinct Characters** (LC 340).
- **Minimum Size Subarray Sum** (LC 209): shortest window with sum ≥ target, positive numbers.
- **Longest Subarray of 1's After Deleting One Element** (LC 1493): at most one zero, answer length − 1.
- **Minimum Operations to Reduce X to Zero** (LC 1658): longest middle window with sum total − x (non-negative numbers).
- **Get Equal Substrings Within Budget** (LC 1208): window of total cost ≤ budget.
- **Frequency of the Most Frequent Element** (LC 1838): sort; window valid if a[r]·len − sum ≤ k.

## Two clever details

**The stale maxFreq in LC 424.** When the window shrinks, the true maximum frequency might drop, but the code does not recompute it. That is fine: the answer only improves when a window of length maxFreq + k + 1 becomes valid, which requires a **larger** maxFreq than ever seen. A stale (too large) maxFreq can keep an invalid window alive at the current best length, but it can never report a length that was not achieved. You can even replace "while" with "if": the window then never shrinks, only slides, and its final length is the answer.

**Jumping l in LC 3.** With last-index tracking, l jumps directly past the previous occurrence: l = max(l, last[c] + 1). The max prevents l from moving backward when the previous occurrence is already outside the window.

## Minimum Window Substring (LC 76) in detail

Find the shortest window of s containing every character of t (with multiplicity).

- need = counts of t; required = the number of distinct characters in t.
- formed = the number of distinct characters whose window count meets the need.
- Expand r; when a character's count reaches its need, formed += 1.
- While formed == required: record the window, then remove s[l]; if its count drops below the need, formed −= 1; l += 1.

O(|s| + |t|). Optimisation: build a filtered list of (index, char) for characters of s that appear in t, and slide over that list when s is much longer than the useful characters.

## while or if when shrinking?

With "while", the window is always valid after shrinking (or empty), which is needed when you read the window's state (shortest-window problems, or counting). With "if" (the "never shrink" variant for longest problems), the window length is monotone non-decreasing and equals the best length found; it works for the "longest" template only and is a neat trick, not a requirement.

## Interview angles

- State the monotonicity that makes the window valid, and why negative numbers break it.
- Say "each pointer moves at most n times, so O(n)".
- Choose arrays of 26 or 128 for counts when the alphabet is small.

## Connections

Fixed windows (length given), counting windows (exactly k = atMost(k) − atMost(k − 1)), windows with structures (deques, heaps), and prefix sums for non-monotone conditions.
`,
    doubts: [
      ["How do I know whether to use a while or an if when shrinking?", "Use while in general. The if version works only for the 'longest' template with special state such as LC 424's non-decreasing maxFreq, where the window never needs to shrink by more than one."],
      ["Why can maxFreq in LC 424 be stale?", "The answer only improves when the window gets longer, which requires len − maxFreq ≤ k with a bigger len, which in turn requires a bigger true maxFreq. Overestimating maxFreq in the meantime never produces a wrong larger answer; it just keeps the window at its best length."],
      ["Sliding window or prefix sums for 'subarray sum = k'?", "Sliding window only if all numbers are non-negative (then sums are monotone). With negatives, prefix sums + hash map."],
      ["How do I count windows instead of finding the best one?", "For 'at most' constraints, every window ending at r with start in [l, r] is valid, so add r − l + 1. 'Exactly k' = atMost(k) − atMost(k − 1)."],
      ["How do I find the actual longest window, not just its length?", "Record (l, r) whenever r − l + 1 beats the best. With the \"if\" (never shrink) variant, the final window is not necessarily valid, so use the \"while\" template when you need the window itself."],
      ["Why does Minimum Window Substring track \"formed\" instead of comparing maps?", "Comparing the full count maps at every step costs O(alphabet). The formed counter changes only when one character's count crosses its need, so validity is checked in O(1) per step."],
      ["Can a variable window handle \"longest subarray with sum exactly k\" with positive numbers?", "Yes: with positive numbers, \"sum ≤ k\" is monotone, so shrink while sum > k and check sum == k after shrinking. With negatives, use a prefix-sum hash map storing the first index of each prefix sum."],
    ],
    revise: md`
? Longest-window template? :: Add a[r]; while invalid, remove a[l++]; update best with r − l + 1.
? Shortest-window template? :: Add a[r]; while valid, update best then remove a[l++].
? Precondition? :: Monotone validity (shrinking keeps validity, or growing keeps it).
? Fails with? :: Negative numbers in sum constraints.
? LC 3 trick? :: l = max(l, last[c] + 1).
? LC 424 condition? :: Window length − max frequency ≤ k.
? Minimum Window Substring state? :: need counts + 'missing' counter.
? Frequency of the Most Frequent Element window test? :: After sorting, a[r]·len − sum ≤ k.
? Reduce X to Zero? :: Longest middle window with sum total − x.
? LC 3 jump formula? :: l = max(l, last[c] + 1).
? "if" instead of "while" for longest? :: The window never shrinks; its final length is the answer.
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
## Counting instead of optimising

Some window problems ask **how many** subarrays satisfy a condition, not the longest or shortest. The window machinery still works, with one extra observation: for each right end r, the valid subarrays ending at r form a contiguous range of left ends, so you can count them all at once instead of enumerating them.

## At most k: count per right end

If the condition is preserved under shrinking ("at most k distinct", "sum ≤ S" with non-negative numbers, "at most k odd numbers"), then after shrinking the window to the smallest l that keeps [l, r] valid, **every** start in [l, r] also gives a valid subarray ending at r. So add r − l + 1.

\`\`\`python
def at_most(a, k):                     # subarrays with at most k distinct values
    count, l, res = {}, 0, 0
    for r, x in enumerate(a):
        count[x] = count.get(x, 0) + 1
        while len(count) > k:
            count[a[l]] -= 1
            if count[a[l]] == 0: del count[a[l]]
            l += 1
        res += r - l + 1               # all starts l..r are valid
    return res
\`\`\`

O(n): each pointer moves at most n times.

## Exactly k = atMost(k) − atMost(k − 1)

"Exactly k" is not monotone: shrinking a window with exactly k distinct values may drop to k − 1, and growing it may reach k + 1, so a single window cannot track it. But

#subarrays with exactly k = #subarrays with at most k − #subarrays with at most k − 1,

because the two "at most" sets are nested and differ exactly by the subarrays with k. Two O(n) passes.

- **Subarrays with K Different Integers** (LC 992).
- **Binary Subarrays With Sum** (LC 930): at most goal minus at most goal − 1 (with goal = 0, atMost(−1) = 0). A prefix-sum hash map also works (and handles negatives).
- **Count Number of Nice Subarrays** (LC 1248): exactly k odd numbers: map each element to its parity and count subarrays with sum exactly k.
- **Count Vowel Substrings** with all five vowels (LC 2062): exactly-5-distinct among vowel-only stretches.

## At least k

- atLeast(k) = total − atMost(k − 1), with total = n(n + 1)/2.
- Or directly: an "at least" condition is preserved when the window grows. For each r, run the shrinking loop "while [l, r] is valid: remove a[l], l += 1". When it stops, [l − 1, r] was the last valid window, so every start 0..l − 1 gives a valid subarray ending at r: add l.

- **Number of Substrings Containing All Three Characters** (LC 1358): for each r, after shrinking while all three are present, add l (all earlier starts work).
- **Count Subarrays Where Max Element Appears at Least K Times** (LC 2962): same pattern with the count of the global maximum.
- **Count the Number of Good Subarrays** (LC 2537): at least k pairs of equal elements; adding x increases pairs by count[x].

## The three-pointer alternative for "exactly"

Instead of two passes, keep two left pointers for one right pointer: l1 = the smallest start with at most k distinct, l2 = the smallest start with at most k − 1 distinct. For each r, the starts in [l1, l2) give exactly k: add l2 − l1. One pass, two count maps.

## Prefix sums for counting

When the condition is a sum and numbers may be negative, windows fail but prefix sums with a hash map count subarrays with sum exactly k in O(n) (see prefix sum + hash map). For counts of zeros, odds, or a fixed sum on non-negative arrays, both methods work; windows use O(1) extra space for small alphabets.

## Complexity

Each "at most" pass is O(n) time and O(distinct) space; "exactly" is two passes: still O(n).

## Interview angles

- Explain why r − l + 1 subarrays end at r once the window is valid.
- Derive exactly(k) = atMost(k) − atMost(k − 1) and why a single window cannot do it.
- Mention the prefix-sum alternative when negatives appear.

## Connections

Variable windows (longest/shortest), prefix sums with hash maps, and combinatorics (total subarrays n(n + 1)/2).
`,
    doubts: [
      ["Why does every start in [l, r] give a valid subarray?", "For an 'at most' constraint, removing elements from the left can only keep or reduce the count, so every sub-window of a valid window that ends at r is valid."],
      ["Why can't I slide once for 'exactly k'?", "Validity is not monotone: a window with exactly k can become one with k − 1 when shrunk, and extending can overshoot to k + 1. The left boundary of valid starts is a range, not a single point."],
      ["Why do I add l (not r − l + 1) for \"at least\" conditions?", "The shrinking loop removes a[l] while [l, r] is still valid, so it stops one step past the last valid start: the valid starts for right end r are 0..l − 1, which is l of them. For \"at most\" conditions the loop instead stops at the first valid start, and the valid starts are l..r: r − l + 1 of them."],
      ["Does atMost(k) − atMost(k − 1) work for sums with non-negative numbers?", "Yes, whenever \"at most\" is monotone under shrinking: subarrays with sum ≤ S minus those with sum ≤ S − 1 are those with sum exactly S (for integer values). With negative numbers \"at most\" is not monotone, so use prefix sums."],
      ["How large can the answer get?", "Up to n(n + 1)/2 ≈ 5·10⁹ for n = 10⁵, which overflows 32-bit integers; use 64-bit counters in Java and C++."],
    ],
    revise: md`
? Windows ending at r for an at-most constraint? :: r − l + 1.
? Exactly k? :: atMost(k) − atMost(k − 1).
? At least k? :: Total n(n+1)/2 − atMost(k − 1).
? LC 992? :: Subarrays with exactly K distinct = atMost(K) − atMost(K − 1).
? Count the Number of Good Subarrays update? :: Adding x adds count[x] pairs; removing subtracts count[x] − 1.
? Max element at least k times (LC 2962)? :: Shrink while count of max ≥ k, then add l.
? atMost(−1)? :: 0 (no subarray has a negative count).
? Total subarrays? :: n(n + 1)/2.
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
## When counts are not enough

Sliding windows maintain their state under "add one, remove one". Sums and counts are trivially maintainable, but some windows must answer harder questions: the maximum, the minimum, the median, whether some value lies near x. Plain variables cannot be updated when the extreme leaves the window, so a **data structure** lives inside the window. The structure must support insert, delete (of the leaving element) and the query, ideally in O(1) or O(log k).

| Window question | Structure | Cost per step |
|---|---|---|
| maximum or minimum | monotonic deque | O(1) amortised |
| max − min (both) | two monotonic deques | O(1) amortised |
| median, k-th smallest | two heaps with lazy deletion, or a sorted multiset | O(log k) |
| is there a value within distance t of x? | sorted set (floor/ceiling), or buckets | O(log k) or O(1) |
| distinct count, frequencies | hash map of counts | O(1) |
| sum of the top m values | two multisets (top and rest) | O(log k) |

## Longest Continuous Subarray With Absolute Diff ≤ Limit (LC 1438)

The window is valid if max − min ≤ limit. Keep a **decreasing deque** for the maximum and an **increasing deque** for the minimum (indices). For each r: push r into both (popping dominated elements from the back); while max − min > limit, move l right, popping each deque's front if it equals the old l. Record r − l + 1. O(n).

\`\`\`python
from collections import deque
def longest_subarray(a, limit):
    mx, mn, l, best = deque(), deque(), 0, 0
    for r, x in enumerate(a):
        while mx and a[mx[-1]] < x: mx.pop()
        while mn and a[mn[-1]] > x: mn.pop()
        mx.append(r); mn.append(r)
        while a[mx[0]] - a[mn[0]] > limit:
            l += 1
            if mx[0] < l: mx.popleft()
            if mn[0] < l: mn.popleft()
        best = max(best, r - l + 1)
    return best
\`\`\`

(A sorted multiset of window values also works in O(n log n).)

## Sliding Window Median (LC 480)

Two heaps (a max-heap for the lower half, a min-heap for the upper half) give the median, but deleting the leaving element from the middle of a heap is O(k). **Lazy deletion**: record the leaving value in a "to delete" counter and adjust the logical size of the heap it belongs to (decide by comparing with the lower heap's top); whenever a heap's top is marked for deletion, pop it. Rebalance by logical sizes. O(n log k).

Simpler alternative: a sorted list (SortedList in Python, a multiset in C++): insert, remove, and read the middle in O(log k) (Python's SortedList is O(log k)-ish amortised). Or bisect.insort on a plain list: O(k) per step, fine for small k.

**Sliding Window Maximum** (LC 239) is the deque special case.

## Contains Duplicate III (LC 220)

Is there i ≠ j with |i − j| ≤ indexDiff and |a[i] − a[j]| ≤ valueDiff?

- **Sorted set of the last indexDiff values**: for each x, find the smallest value ≥ x − valueDiff (ceiling); if it is ≤ x + valueDiff, return true. Insert x; remove the value leaving the window. O(n log k).
- **Buckets of width valueDiff + 1**: bucket id = floor(x / (valueDiff + 1)). Two values in the same bucket differ by at most valueDiff: return true. Otherwise check the two neighbouring buckets explicitly. Keep at most one value per bucket (a second one would already have returned true) and delete the bucket of the leaving element. O(n). Use floor division that rounds toward −∞ for negative numbers.

## More window-plus-structure problems

- **Maximum of Minimums**, **sum of window minimums**: monotonic deques.
- **Constrained Subsequence Sum** (LC 1425), **Jump Game VI** (LC 1696): a deque over DP values.
- **Minimum Number of K Consecutive Bit Flips** (LC 995): a queue (or difference array) of flip end positions inside the window.
- **Find K-Length Substrings With No Repeated Characters** (LC 1100): a count map.
- **Sliding window top-m sum** (e.g. sum of the m largest in each window): maintain two balanced multisets with the boundary at m.
- **Maximum Sum of Distinct Subarrays With Length K** (LC 2461): a count map plus a running sum.

## Picking in interviews

- Only max or min: monotonic deque (O(n)), the expected answer.
- Both max and min: two deques.
- Order statistics or deletions of arbitrary values: sorted multiset (simplest to explain) or two heaps with lazy deletion.
- Nearby values: sorted set, or buckets for O(n).

State the per-step cost and multiply by n.

## Interview angles

- Explain why a single variable cannot track a window maximum (the maximum may leave).
- For heaps, explain lazy deletion and logical sizes.
- For Contains Duplicate III, mention both the sorted set and the bucket method.

## Connections

Monotonic deques, two heaps, ordered sets, and bucketing (also used in Maximum Gap).
`,
    doubts: [
      ["Why lazy deletion with heaps?", "Heaps cannot delete an arbitrary element efficiently. Instead remember it as deleted and drop it when it reaches the top. Sizes must count only live elements for balancing."],
      ["Why width t + 1 buckets?", "Any two numbers in a bucket of width t + 1 differ by at most t. Numbers within t can also sit in adjacent buckets, so check those two as well."],
      ["Why only one value per bucket in Contains Duplicate III?", "If a second value fell into an occupied bucket, the two would differ by at most valueDiff and the function would already have returned true. So when the scan continues, every bucket holds at most one value, and a dictionary bucket → value suffices."],
      ["How do I decide which heap a leaving value belongs to in Sliding Window Median?", "Compare it with the top of the lower (max) heap after cleaning: if it is ≤ that top, it is in the lower half; otherwise in the upper half. Equal values are interchangeable for the median, so the choice is consistent."],
      ["Is a sorted list with bisect acceptable for Sliding Window Median in Python?", "For n = 10⁵ and moderate k, bisect.insort and list.pop at an index are O(k) memmove operations, which are very fast in C, so it often passes. Mention that SortedList or two heaps give the logarithmic bound."],
    ],
    revise: md`
? Window max/min? :: Monotonic deque, amortised O(1).
? Window median? :: Two heaps + lazy deletion, or an ordered multiset: O(log k).
? LC 1438 structure? :: Two monotonic deques (max and min).
? Contains Duplicate III in O(n)? :: Buckets of width t + 1; check own and neighbouring buckets.
? LC 1438 structures? :: Decreasing deque (max) + increasing deque (min); shrink while max − min > limit.
? Bucket id with negatives? :: Floor division toward −∞ (x // (t + 1) in Python).
? Minimum K Consecutive Bit Flips? :: Track flip ends in a queue / difference array; parity of active flips.
? Max Sum of Distinct Subarrays of Length K? :: Count map + running sum; valid when map size == k.
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
## Why stacks fit nesting

Brackets, nested expressions, encoded strings and directory paths all have the same shape: the most recently opened thing must be closed first. A stack (last in, first out) holds exactly the "open" items waiting to be closed, in the right order. Recursion is an implicit stack; an explicit one avoids depth limits and makes the state visible.

## Matching brackets

**Valid Parentheses** (LC 20): push openers; on a closer, the top must be the matching opener (otherwise invalid); at the end the stack must be empty.

\`\`\`python
def is_valid(s):
    pair, st = {")": "(", "]": "[", "}": "{"}, []
    for ch in s:
        if ch in pair:
            if not st or st.pop() != pair[ch]: return False
        else:
            st.append(ch)
    return not st
\`\`\`

For a **single** bracket type, a counter suffices (depth +1 / −1, never negative, zero at the end); a stack is needed only when types can interleave.

- **Minimum Add to Make Parentheses Valid** (LC 921): count unmatched ')' (when depth would go negative) plus the final depth.
- **Minimum Remove to Make Valid Parentheses** (LC 1249): stack of indices of '(' ; mark unmatched ')' for removal immediately; leftover '(' indices are removed too.
- **Longest Valid Parentheses** (LC 32): stack of indices with a base: push −1 first. For '(' push its index. For ')' pop; if the stack becomes empty, push the current index as the new base (an unmatched ')' resets); otherwise the valid length is i − stack top. The −1 base makes a valid prefix starting at 0 measure correctly. (A two-pass counter solution uses O(1) space.)
- **Score of Parentheses** (LC 856), **Maximum Nesting Depth** (LC 1614), **Check if a Parentheses String Can Be Valid** (LC 2116, with locked positions: two passes with counts).
- **Valid Parenthesis String with '*'** (LC 678): track the range [lo, hi] of possible open counts; '*' widens it; clamp lo at 0; fail if hi < 0.

## Expression evaluation

**Reverse Polish Notation** (LC 150): push numbers; on an operator, pop b then a (the second operand is on top) and push a op b. Order matters for − and /.

**Basic Calculator II** (LC 227): + − * / without parentheses. Keep the previous operator; when a number completes:

- after + push num, after − push −num,
- after * replace the top with top × num, after / with int(top / num) (truncate toward zero).

The answer is the sum of the stack. Multiplication and division are applied immediately because they bind tighter; addition and subtraction are deferred to the final sum. (O(1) space version: keep the last term instead of the stack.)

**Basic Calculator** (LC 224): + − and parentheses. Keep result and sign; on '(' push (result, sign) and reset; on ')' pop and combine: result = saved_result + saved_sign × result.

**Basic Calculator III** (LC 772): all operators plus parentheses: recursion on parentheses with the LC 227 loop, or the shunting-yard algorithm (an operator stack and an operand stack, popping operators of higher or equal precedence before pushing a new one).

Truncation: Python's // floors (−7 // 2 = −4) while the problems want truncation toward zero: use int(a / b).

## Nested decoding

**Decode String** (LC 394): "3[a2[c]]" → "accaccacc". Keep the current string and the current number. On '[' push (current string, number) and reset both. On ']' pop (prev, k) and set current = prev + k × current. Digits accumulate num = num × 10 + d (counts can be multi-digit).

Others: **Number of Atoms** (LC 726: a stack of count maps; multiply the top map by the following number on ')'), **Parse Lisp Expression**, **Ternary Expression Parser** (LC 439: scan from the right with a stack), **Mini Parser** (LC 385: nested lists).

## Paths and history

- **Simplify Path** (LC 71): split by '/'; skip "" and "."; ".." pops (if possible); other names push; join with '/'.
- **Asteroid Collision** (LC 735): a right-moving asteroid waits on the stack; a left-moving one destroys smaller right-movers on top, dies against bigger ones, both die if equal.
- **Remove All Adjacent Duplicates in String II** (LC 1209): a stack of (char, count); pop when the count reaches k.
- **Backspace String Compare**, **Make the String Great** (LC 1544): stack-based cancellation.
- **Browser history, undo/redo**: two stacks.
- **Exclusive Time of Functions** (LC 636): a stack of running function ids; on start, pause the top; on end, add elapsed time.

## Interview angles

- Say which items are "open" and what closes them; that defines the stack's content.
- Store indices when positions matter (longest valid, minimum remove).
- Watch operand order and integer division semantics in calculators.

## Connections

Monotonic stacks (next greater element), recursion and DFS (implicit stacks), and parsers (recursive descent, shunting-yard).
`,
    doubts: [
      ["In RPN, why does the order of popping matter?", "For '−' and '/', the second operand is on top. Pop b first, then a, and compute a op b."],
      ["Integer division truncation in calculators?", "Expected behaviour is truncation toward zero (like C/Java). In Python, // floors, so use int(a / b) for negatives."],
      ["Longest valid parentheses: why push −1 first?", "The stack holds the index just before the current valid run. Starting with −1 lets a valid prefix starting at 0 measure its length as i − (−1)."],
      ["Do I need a stack to check a single bracket type?", "No: a counter suffices (never negative, ends at zero). A stack is needed when there are several bracket types."],
      ["Why is Basic Calculator II's answer the sum of the stack?", "Every term between + and − signs is fully evaluated when pushed (multiplications and divisions are applied to the top immediately), and subtraction is represented by pushing the negated term. What remains is a list of signed terms to add."],
      ["Can Longest Valid Parentheses be done without a stack?", "Yes: scan left to right counting '(' and ')'; when equal, record 2·count; when ')' exceeds '(', reset both. Then scan right to left with the roles swapped (to catch strings with extra '('). O(n) time, O(1) space."],
      ["How do I evaluate expressions with unary minus like \"-(2+3)\"?", "Treat a '-' at the start or right after '(' as unary: push 0 before it, or set the sign to −1 for the next term. In LC 224, the (result, sign) push on '(' handles \"-(...)\" naturally."],
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
? Valid Parenthesis String with '*'? :: Track [lo, hi] of open counts; clamp lo at 0; fail if hi < 0; valid if lo == 0.
? Number of Atoms? :: Stack of count maps; multiply the top by the number after ')'.
? Shunting-yard rule? :: Pop operators of higher or equal precedence before pushing a new one.
? Exclusive Time of Functions? :: Stack of running ids; pause the top on start, add elapsed on end.
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
## The question it answers

For every element, find the **nearest** element to its left or right that is greater (or smaller). Brute force is O(n²). A **monotonic stack** answers all of them in O(n): keep a stack of indices whose values are monotone (for example decreasing); when a new element breaks the monotonicity, it is the answer for every element it pops.

## Next greater element

Scan left to right with a stack of indices whose values are **decreasing** from bottom to top. For each i: while the top's value is less than a[i], a[i] is the next greater element of the top: record it and pop. Then push i. Indices left on the stack at the end have no next greater element.

\`\`\`python
def next_greater(a):
    res, st = [-1] * len(a), []          # st holds indices, values decreasing
    for i, x in enumerate(a):
        while st and a[st[-1]] < x:
            res[st.pop()] = x
        st.append(i)
    return res
\`\`\`

[[widget:mono-stack]]

Every index is pushed once and popped at most once: **O(n)** total despite the inner while loop.

Why popped elements are no longer needed: an element popped by x has found its answer, and for any later element, x is closer and at least as large as the popped one, so the popped element can never be anyone's nearest greater element on the left either.

## The four variants

| Want | Scan | Stack order (bottom → top) | Answer recorded when |
|---|---|---|---|
| next greater | left → right | decreasing | popping (the current element) |
| next smaller | left → right | increasing | popping |
| previous greater | left → right | decreasing | after popping, the new top (for the current element) |
| previous smaller | left → right | increasing | after popping, the new top |

Strict or non-strict comparison decides what "greater" means for equal values (pop on < gives "strictly greater" answers; pop on ≤ gives "greater or equal"). Store **indices**, not values: you usually need distances or positions, and values can be read back from indices.

**Circular arrays** (Next Greater Element II, LC 503): iterate i over 0..2n − 1 using a[i mod n], pushing only during the first pass.

## Contribution counting

"Sum over all subarrays of the minimum" (Sum of Subarray Minimums, LC 907): instead of enumerating subarrays, count for each element how many subarrays have it as their minimum.

Let left[i] = the distance to the previous smaller element and right[i] = the distance to the next smaller element. Then a[i] is the minimum of exactly left[i] × right[i] subarrays (choose the start among left[i] positions and the end among right[i]). Answer = Σ a[i] · left[i] · right[i] (mod M).

**Equal values**: if two equal values are both treated as "the minimum" of the same subarray, it is counted twice. Use a strict comparison on one side and non-strict on the other (previous **strictly** smaller, next smaller **or equal**), so each subarray's minimum is attributed to exactly one position (the leftmost or rightmost occurrence).

Related: **Sum of Subarray Ranges** (LC 2104) = Σ maxima contributions − Σ minima contributions; **Sum of Total Strength of Wizards** (LC 2281) adds prefix sums of prefix sums.

## Classic problems

- **Daily Temperatures** (LC 739): next greater element distance: res[j] = i − j when popping.
- **Online Stock Span** (LC 901): the span is the distance to the previous greater element; store (price, span) pairs and merge spans while popping.
- **Next Greater Element I** (LC 496): compute next greater for nums2 into a map, then answer nums1.
- **Remove K Digits** (LC 402): keep an increasing stack; pop while the top is larger than the current digit and removals remain; strip leading zeros; remove remaining digits from the end.
- **Remove Duplicate Letters / Smallest Subsequence of Distinct Characters** (LC 316, 1081): increasing stack; pop a larger top only if it appears again later; skip characters already in the stack.
- **132 Pattern** (LC 456): scan from the right with a decreasing stack; the popped values are candidates for the "2"; if a later (leftward) value is smaller than the best "2", a pattern exists.
- **Largest Rectangle in Histogram** (LC 84) and **Maximal Rectangle** (LC 85): see the histogram page.
- **Trapping Rain Water** (LC 42) by layers: pop a bottom, then water = (min(left wall, current) − bottom) × width.
- **Car Fleet** (LC 853), **Asteroid Collision** (LC 735), **Buildings With an Ocean View** (LC 1762).
- **Maximum Width Ramp** (LC 962): a decreasing stack of candidate left ends, then scan from the right popping while a[j] ≥ a[top].

## Recognising it

Words like "next greater", "previous smaller", "how far until", "span", "visible", "dominates", "for each element, the range where it is the minimum/maximum", or a contribution sum over all subarrays. The brute force is "for each i, scan outward until …"; the stack removes the repeated scanning.

## Interview angles

- Say which order the stack keeps and what a pop means.
- Prove O(n) by "each index is pushed and popped once".
- For contribution problems, handle equal values with strict/non-strict sides.

## Connections

Monotonic deques (sliding window extremes), histogram rectangles, and Cartesian trees (built with the same stack).
`,
    doubts: [
      ["How do I choose increasing or decreasing?", "Ask what each pop should answer. For next greater, an element waits on the stack until something bigger arrives, so the stack holds elements still waiting, which must be decreasing (a bigger one would have resolved them)."],
      ["Why store indices instead of values?", "Indices give distances (days to wait, widths of rectangles) and let you write answers to the right slot. You can read the value as a[i]."],
      ["How do I avoid double counting equal values in contribution problems?", "Use < on one side and ≤ on the other. Then for a run of equal minima, each subarray is attributed to exactly one of them (e.g. the leftmost)."],
      ["Circular next greater?", "Loop i from 0 to 2n − 1 using i mod n, and only push during the first pass (or push always but only write answers for unresolved indices)."],
      ["Why does the monotonic stack run in O(n) despite the nested while loop?", "The inner loop only pops, and every index is popped at most once over the whole scan because it is pushed once. Total pops ≤ n, so total work is O(n) amortised."],
      ["How do I get both previous and next smaller in one pass?", "When an index j is popped by i, i is j's next smaller (or equal) element; and after pushing j originally, the element below it in the stack was j's previous smaller element. Record both in one scan, choosing strictness carefully for equal values."],
      ["Can a monotonic stack answer \"next greater element\" queries for an arbitrary index later, online?", "The stack computes all answers offline in one pass. For online queries on a changing array, use a segment tree with a descent query (\"first index > i with value > x\")."],
    ],
    revise: md`
? Next greater element: stack order and pop condition? :: Decreasing stack; pop while a[top] < a[i]; a[i] answers the popped index.
? Complexity and why? :: O(n): each index is pushed once and popped once.
? Previous smaller? :: Increasing stack; after popping elements ≥ a[i], the top is the answer.
? Sum of subarray minimums formula? :: Σ a[i] × (distance to previous smaller) × (distance to next smaller), with strict/non-strict asymmetry.
? Circular variant? :: Iterate 2n with mod n.
? Remove K Digits? :: Increasing stack; pop larger digits while k > 0; strip leading zeros.
? Maximum Width Ramp? :: Decreasing stack of left candidates; scan from the right popping while a[j] ≥ a[top].
? Remove Duplicate Letters pop rule? :: Pop a larger top only if it occurs again later; skip letters already used.
? Previous greater for the current element? :: After popping smaller ones, the new top.
? Sum of Subarray Ranges? :: Σ max contributions − Σ min contributions.
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

Bars of width 1 and heights h[0..n−1]. Find the largest rectangle that fits under the bars.

Key observation: the best rectangle has the height of some bar i (otherwise it could grow taller). For bar i as the limiting height, the rectangle extends left until the first bar **shorter** than h[i] and right until the first bar shorter than h[i]. So the answer is

max over i of h[i] × (nextSmaller(i) − prevSmaller(i) − 1),

and both neighbours come from a monotonic stack.

## One-pass stack

Keep a stack of indices with **increasing** heights. When the current bar is shorter than the top, the top's rectangle is finished: its right boundary is the current index i, and its left boundary is the new top after popping (the previous smaller bar), or −1 if the stack is empty.

\`\`\`python
def largest_rectangle(h):
    st, best = [], 0
    for i, x in enumerate(h + [0]):            # sentinel 0 flushes the stack
        while st and h[st[-1]] > x:
            height = h[st.pop()]
            left = st[-1] if st else -1
            best = max(best, height * (i - left - 1))
        st.append(i)
    return best
\`\`\`

(The h + [0] list makes h[st[-1]] index valid only for original bars; the sentinel index n is pushed last and never popped.)

Why the new top is the left boundary: the stack is increasing, so the element below the popped index is the nearest bar to the left that is **not taller** (smaller or equal); everything between them was popped earlier because it was taller than the popped bar. Why the sentinel: bars still on the stack at the end extend to the right edge; a final height-0 bar pops them all with right boundary n.

Dry run on [2, 1, 5, 6, 2, 3]: at i = 4 (height 2), pop 6 (width 1, area 6), pop 5 (width 2, area 10); … the answer is 10.

**Equal heights**: with "pop while h[top] > x", equal bars stay on the stack, and the rectangle of the earlier equal bar is computed later with the full width (the later equal bar under-reports its own width, but the maximum is still found). Either strictness is correct for the maximum.

O(n) time: each index is pushed and popped once. O(n) space.

## Maximal Rectangle (LC 85)

The largest rectangle of 1s in a binary matrix. Treat each row as the base of a histogram: heights[c] = number of consecutive 1s ending at this row in column c (reset to 0 on a '0'). Run Largest Rectangle on each row's heights. O(R·C).

Related grid problems:

- **Maximal Square** (LC 221): DP side = 1 + min(top, left, diagonal), different and simpler.
- **Count Submatrices With All Ones** (LC 1504): for each row's histogram, count rectangles ending at each column with a monotonic stack: count[c] = count[prev smaller] + h[c] × (c − prev smaller).
- **Largest Submatrix With Rearrangements** (LC 1727): columns can be reordered, so sort each row's heights descending and take max(h[k] × (k + 1)).

## Related problems

- **Trapping Rain Water** with a stack: the dual: pop a bottom, then add (min(left wall, right wall) − bottom) × width.
- **Maximum Score of a Good Subarray** (LC 1793): the subarray must contain index k; expand greedily from k toward the larger neighbour, or use the histogram stack restricted to rectangles covering k.
- **Sum of Subarray Minimums** (LC 907): the same previous/next smaller boundaries, summed instead of maximised.
- **Maximum Subarray Min-Product** (LC 1856): for each element as the minimum, the widest range from the stack, times the range sum (prefix sums).
- **Largest rectangle with a width constraint**: sliding window minimum.

## Divide and conquer alternative

The answer is the largest of: the rectangle spanning the whole range at the minimum bar's height, the best in the left part, and the best in the right part (split at the minimum). With a segment tree (or sparse table) for range minimum it is O(n log n); without one, sorted input makes it O(n²). Worth mentioning as the "first idea", then improve to the stack.

## Interview angles

- Explain why the new stack top is the left boundary and why the sentinel is needed.
- Do a dry run on [2, 1, 5, 6, 2, 3].
- Reduce Maximal Rectangle to row histograms.

## Connections

Monotonic stacks (previous/next smaller), contribution counting, and Cartesian trees (the minimum bar is the root; the recursion is divide and conquer over it).
`,
    doubts: [
      ["Why is the left boundary the new top after popping?", "The stack is increasing, so the element below j is the nearest bar to the left that is smaller than h[j] (anything in between was popped earlier because it was taller). That is exactly where the rectangle of height h[j] must stop."],
      ["Why the sentinel 0 at the end?", "It is smaller than every bar, so it forces all remaining bars to be popped and measured. Without it, you need a separate loop after the scan."],
      ["What about equal heights?", "Popping on ≥ or > both give the correct maximum; with >, the leftmost of equal bars gets the full width when the last one is popped."],
      ["Does the algorithm need the left boundary bar to be strictly smaller?", "For the maximum area, no. With equal heights the stack keeps both; the later equal bar computes a narrower width, but the earlier one, popped later, computes the full width. The maximum is found either way."],
      ["Can I avoid the sentinel by processing the leftover stack after the loop?", "Yes: after the loop, pop the remaining indices using right boundary n. The sentinel just merges that cleanup into the main loop."],
      ["Why is Maximal Rectangle O(R·C) and not O(R·C²)?", "Each row's histogram is processed in O(C) by the stack, and building the heights incrementally is O(C) per row. R rows give O(R·C)."],
    ],
    revise: md`
? Rectangle for bar i spans? :: From after the previous smaller bar to before the next smaller bar.
? Stack order? :: Increasing heights (indices).
? Width when popping j at i? :: i − (new top) − 1, or i if the stack is empty.
? Sentinel? :: Append height 0 so everything is popped.
? Maximal rectangle in a matrix? :: Per-row heights of consecutive 1s, then histogram: O(RC).
? Maximal square? :: DP: 1 + min(top, left, diagonal).
? Maximum Subarray Min-Product? :: For each min, widest range via the stack × range sum (prefix sums).
? Count Submatrices With All Ones per row? :: count[c] = count[prev smaller] + h[c]·(c − prev smaller).
? Largest Submatrix With Rearrangements? :: Sort each row's heights descending; max h[k]·(k+1).
? Dry run [2,1,5,6,2,3]? :: 10 (heights 5 and 6, width 2).
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
## Augmenting a stack

Design questions ask for a stack (or queue) with an extra operation in O(1): the minimum, the maximum, the most frequent element. The trick is always to store, next to each element, the extra information as it was **at the time that element was pushed**, because a stack only ever exposes and removes its top, so the state below never changes until it becomes the top again.

## Min Stack (LC 155)

push, pop, top and getMin, all O(1).

**Pairs**: push (value, min so far) where min so far = min(value, previous top's min). getMin reads the top pair's second field. Popping restores the previous minimum automatically.

\`\`\`python
class MinStack:
    def __init__(self): self.st = []
    def push(self, x):
        self.st.append((x, min(x, self.st[-1][1]) if self.st else x))
    def pop(self): self.st.pop()
    def top(self): return self.st[-1][0]
    def getMin(self): return self.st[-1][1]
\`\`\`

**Second stack of minimums**: push x onto the min stack when x ≤ its top (≤, not <: with duplicates of the minimum, each copy needs its own entry, or popping one copy would lose the minimum while another copy remains). Pop from the min stack when the popped value equals its top. Saves memory when the minimum rarely changes.

**Single stack with encoding** (O(1) extra memory): store 2x − min when x < min and update min = x; on popping an encoded value (less than min), restore min = 2·min − value. Clever but prone to overflow; mention it, do not lead with it.

## Max Stack (LC 716)

push, pop, top, peekMax and **popMax** (remove the most recent maximum). popMax removes from the middle, so a plain stack is not enough.

- **Doubly linked list + ordered map** (value → list of nodes): push appends a node and records it under its value; popMax takes the largest key's last node and unlinks it in O(1); pop removes the tail node and deletes it from the map. O(log n) per operation.
- **Two heaps with lazy deletion**: a stack of (value, id) and a max-heap of (−value, −id); removed ids go to a set and are skipped when they surface. O(log n) amortised.
- Two-stack approach (buffer elements above the max): O(n) popMax, acceptable only as a first version.

## Queue from two stacks (LC 232)

Push onto the **in** stack. To pop or peek: if the **out** stack is empty, move everything from in to out (reversing the order, so the oldest element is on top); then pop or peek out.

Each element moves from in to out exactly once, so pop is **amortised O(1)** (a single pop can cost O(n) when out is empty). This is the classic accounting example: charge each push 3 units (push to in, move, pop from out).

## Stack from queues (LC 225)

With one queue: on push, enqueue x, then rotate the queue n − 1 times (dequeue and re-enqueue) so x is at the front. Push O(n), pop and top O(1). With two queues the cost can be moved to pop instead. Mostly a test of understanding FIFO versus LIFO.

## Maximum Frequency Stack (LC 895)

push(x) and pop() returning the most frequent element, ties broken by the most recent.

- freq: value → its current count.
- group: count → a stack of values that reached that count.
- maxFreq.

push(x): f = freq[x] + 1; freq[x] = f; group[f].append(x); maxFreq = max(maxFreq, f).
pop(): x = group[maxFreq].pop(); freq[x] −= 1; if group[maxFreq] is empty, maxFreq −= 1; return x.

All O(1). The insight: an element with count 3 appears in group[1], group[2] and group[3]; popping it from group[3] leaves it correctly in group[2] at its earlier position, which preserves the "most recent" tie-break.

## More designs

- **Design a Stack With Increment Operation** (LC 1381): lazy increments: inc[i] adds to the bottom i elements; store the pending increment at index i − 1 and push it down when popping (inc[i − 1] += inc[i]).
- **Dinner Plate Stacks** (LC 1172): a list of stacks plus a min-heap of non-full stack indices.
- **Browser History** (LC 1472): two stacks or an array with a cursor and a logical end.
- **Persistent stack**: a linked list where push makes a new head pointing to the old one; every version is O(1) and versions share tails (undo history, backtracking).

## Interview angles

- Store the auxiliary information with each element (or in a parallel stack).
- Explain amortised O(1) for the two-stack queue and give the worst case.
- For Max Stack, say why popMax needs a structure with deletion from the middle.

## Connections

Monotonic stacks keep a different invariant (sortedness) for "next greater" questions; heaps with lazy deletion handle priority-based removals; persistent structures generalise the shared-tail idea.
`,
    doubts: [
      ["Why ≤ (not <) when pushing onto the min stack?", "If the same minimum is pushed twice and you only recorded it once, popping one copy would remove the min record while the other copy is still on the main stack."],
      ["Is the two-stack queue's O(1) amortised or worst case?", "Amortised. A single pop can move n elements. For a real-time guarantee there are more complex constructions (e.g. Okasaki's real-time queues)."],
      ["Why does the Min Stack pair approach use more memory than needed?", "It stores a minimum for every element even when the minimum does not change. The two-stack version stores a minimum only when it changes (or repeats), which helps when values are mostly increasing. Both are O(n) in the worst case."],
      ["Is the two-stack queue suitable for real-time systems?", "Its amortised O(1) hides occasional O(n) pops when the out stack is refilled. Real-time variants (incrementally moving elements, or using a circular buffer / linked list) guarantee worst-case O(1)."],
      ["How would Max Stack's popMax handle ties?", "It must remove the most recent (topmost) maximum. With value → list of nodes in insertion order, take the last node of the largest value's list; with heaps, break ties by the larger id (pushed later)."],
    ],
    revise: md`
? Min Stack in O(1)? :: Store (value, current min) pairs, or a parallel min stack pushed on ≤.
? Queue from two stacks complexity? :: Amortised O(1); transfer only when the out-stack is empty.
? Max frequency stack? :: freq map + stack per frequency level + maxFreq.
? popMax efficiently? :: Doubly linked list + ordered map (O(log n)).
? Stack With Increment lazy trick? :: Store pending increment at index i−1; push it down when popping.
? Dinner Plate Stacks? :: List of stacks + min-heap of non-full indices.
? Two-stack queue accounting? :: Charge 3 per push: push, move, pop.
? FreqStack: why can an element be in several groups? :: Each push at count c adds it to group[c]; pops peel the highest.
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
## Queues

A queue is first in, first out: enqueue at the back, dequeue at the front, both O(1). Queues model arrival order: BFS frontiers, task buffers, producer–consumer pipelines, request queues, and rate-limiting windows.

## Implementations

- **Linked list** with head and tail pointers: O(1) both ends, one allocation per element, poor cache locality.
- **Circular buffer (ring buffer)**: a fixed array with a head index and a count (or head and tail). The element at logical position i lives at (head + i) mod capacity. Enqueue writes at (head + count) mod capacity; dequeue reads at head and advances it. All O(1), no allocation, cache-friendly. Used in OS kernels, network drivers, audio buffers and logging.
- **Growing a circular buffer**: when full, allocate double the capacity and copy the elements in logical order (from head, wrapping around) to the start of the new array; head becomes 0. Amortised O(1) per operation.

**Full versus empty**: with only head and tail indices, head == tail is ambiguous (full or empty). Fixes: keep a count, keep one slot always unused (full when (tail + 1) mod cap == head), or use a boolean flag. **Design Circular Queue** (LC 622) and **Design Circular Deque** (LC 641) test exactly this.

\`\`\`python
class CircularQueue:
    def __init__(self, k): self.a, self.head, self.n = [0] * k, 0, 0
    def enQueue(self, x):
        if self.n == len(self.a): return False
        self.a[(self.head + self.n) % len(self.a)] = x; self.n += 1; return True
    def deQueue(self):
        if self.n == 0: return False
        self.head = (self.head + 1) % len(self.a); self.n -= 1; return True
    def Front(self): return self.a[self.head] if self.n else -1
    def Rear(self): return self.a[(self.head + self.n - 1) % len(self.a)] if self.n else -1
\`\`\`

Language choices:

- **Python**: collections.deque (O(1) at both ends); never list.pop(0), which is O(n). queue.Queue adds thread safety for producer–consumer code.
- **Java**: ArrayDeque (a circular buffer: faster and more compact than LinkedList; does not allow null). LinkedList implements Deque but allocates a node per element.
- **C++**: std::queue (an adapter, by default over std::deque); std::deque is a sequence of fixed-size blocks, giving O(1) at both ends and O(1) random access; iterators are invalidated by insertions at the ends.

## Deque (double-ended queue)

Push and pop at both ends in O(1). A deque is a stack and a queue at once, and enables:

- **Monotonic deques** (sliding window maximum and minimum, deque-optimised DP).
- **0-1 BFS** (push 0-weight neighbours to the front, 1-weight to the back).
- **Palindrome checks** by popping from both ends.
- **Work-stealing schedulers**: each worker pops its own tasks from one end; idle workers steal from the other end (Java's ForkJoinPool, Go's scheduler).
- **Undo buffers with a size limit**: push new actions at one end, drop the oldest from the other.

## A priority queue is not a queue

A priority queue serves the smallest (or largest) priority first, regardless of arrival order, in O(log n) per operation (a heap). It is a different abstract type despite the name. A **FIFO with priorities** (several queues by priority level) is sometimes what a "priority queue" means in systems design.

## Interview problems

- **Moving Average from Data Stream** (LC 346): a queue of the last k values plus a running sum.
- **Number of Recent Calls** (LC 933): enqueue t; dequeue timestamps < t − 3000; answer the length.
- **Design Hit Counter** (LC 362): a queue, or 300 circular buckets of (timestamp, count) for high rates.
- **Dota2 Senate** (LC 649): two queues of indices; the smaller index bans the other and re-enters with index + n.
- **Time Needed to Buy Tickets** (LC 2073): simulate with a queue or compute directly: each person before k contributes min(t[i], t[k]), after k min(t[i], t[k] − 1).
- **Reveal Cards in Increasing Order** (LC 950): simulate the reveal process on a deque of indices.
- **Rotting Oranges**, **Walls and Gates**: multi-source BFS queues.
- **Find the Winner of the Circular Game** (LC 1823): queue simulation O(n·k), or the Josephus recurrence J(n) = (J(n − 1) + k) mod n in O(n).
- **Design Front Middle Back Queue** (LC 1670): two deques kept balanced.

## Interview angles

- Use a real deque, never list.pop(0).
- Know how a circular buffer distinguishes full from empty.
- Distinguish FIFO queues from priority queues.

## Connections

BFS (queues), monotonic deques, 0-1 BFS, sliding windows, and system-design buffers and rate limiters.
`,
    doubts: [
      ["How does a circular buffer tell full from empty?", "Keep an explicit size counter, or leave one slot unused so head == tail means empty and (tail + 1) mod k == head means full."],
      ["Why is Java's LinkedList slower than ArrayDeque?", "Each element is a separate node object (allocation, pointer chasing, cache misses). ArrayDeque stores references in a contiguous circular array."],
      ["Why is ArrayDeque faster than LinkedList in Java?", "ArrayDeque stores elements in one contiguous circular array: no per-element node allocation, fewer pointer dereferences, much better cache behaviour and lower garbage-collection pressure. LinkedList allocates a node (with two pointers) per element."],
      ["How do I implement a thread-safe bounded queue?", "Wrap a circular buffer with a lock and two condition variables (not full, not empty): producers wait while full, consumers wait while empty, and each signals the other after an operation. Java's ArrayBlockingQueue and Python's queue.Queue do exactly this; lock-free single-producer single-consumer ring buffers avoid locks with atomic indices."],
      ["Can Time Needed to Buy Tickets be solved without simulation?", "Yes: person i ahead of or at k buys min(t[i], t[k]) tickets before k finishes; person i behind k buys min(t[i], t[k] − 1). Sum them in O(n)."],
    ],
    revise: md`
? Circular index? :: (head + i) mod capacity.
? Full vs empty in a ring buffer? :: Track size, or keep one slot empty.
? Python queue? :: collections.deque (never list.pop(0)).
? Java queue? :: ArrayDeque.
? Deque powers which algorithms? :: Monotonic deque, 0-1 BFS, sliding windows.
? Josephus recurrence? :: J(1) = 0, J(n) = (J(n−1) + k) mod n.
? Front Middle Back Queue? :: Two deques kept balanced (left size = right or right − 1).
? Dota2 Senate? :: Two index queues; winner re-enters with index + n.
? Work stealing? :: Owners pop from one end, thieves steal from the other.
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

Report the maximum of every window of size k. A max-heap gives O(n log k) (with lazy removal of expired indices). A **monotonic deque** gives O(n).

Keep a deque of indices whose values are **decreasing** from front to back. For each i:

1. Pop from the **back** while a[back] ≤ a[i]: those elements can never be a window maximum again.
2. Push i at the back.
3. Pop from the **front** if it has left the window (front ≤ i − k).
4. Once i ≥ k − 1, the front is the window maximum.

\`\`\`python
from collections import deque
def max_sliding_window(a, k):
    dq, out = deque(), []
    for i, x in enumerate(a):
        while dq and a[dq[-1]] <= x: dq.pop()
        dq.append(i)
        if dq[0] <= i - k: dq.popleft()
        if i >= k - 1: out.append(a[dq[0]])
    return out
\`\`\`

[[widget:mono-deque]]

Each index is pushed and popped at most once: O(n) time, O(k) space.

## Why the discarded elements are useless

If j < i and a[j] ≤ a[i], then every future window that contains j also contains i (i is newer, so it leaves later), and a[i] is at least as large. So j can never be the maximum of any future window: dropping it loses nothing. That is the whole proof, and the reason the deque stays decreasing.

**≤ or < when popping**: with ≤, equal older values are dropped (the newer equal value survives longer, so it is the better representative). With <, equal values both stay; the result is still correct. ≤ keeps the deque smaller.

**Expiry check after pushing**: the front can only expire by one position per step, so a single if (not while) suffices, and checking after pushing is fine because the newly pushed index is never expired.

For the **minimum**, keep values increasing (pop while a[back] ≥ a[i]).

## Shortest Subarray with Sum at Least K (LC 862)

With negative numbers allowed, a plain sliding window fails (the sum is not monotone). Use prefix sums P (P[0] = 0) and a deque of indices with **increasing** P values:

For each j from 0 to n:

1. While the deque is non-empty and P[j] − P[front] ≥ K: record j − front and pop the front. (A later j could only give a longer subarray with that start, so the front is done.)
2. While the deque is non-empty and P[back] ≥ P[j]: pop the back. (j is a later start with a smaller or equal prefix, so it is strictly better than back for every future end.)
3. Push j.

O(n). The two pops encode two dominance arguments: a start that already succeeded cannot do better later, and a start that is older and has a larger prefix is never useful.

## Deque-optimised DP

dp[i] = a[i] + max(dp[i − k..i − 1]) is "sliding window maximum over dp values": maintain the deque over dp indices as dp values become known. O(n) instead of O(nk).

- **Jump Game VI** (LC 1696): exactly this recurrence.
- **Constrained Subsequence Sum** (LC 1425): dp[i] = a[i] + max(0, max of the last k dp values).
- More on the deque-DP page.

## Related problems

- **Longest Continuous Subarray With Absolute Diff ≤ Limit** (LC 1438): a max deque and a min deque together.
- **Max Value of Equation** (LC 1499): maximise y_i + y_j + x_j − x_i with x_j − x_i ≤ k: for each j, the best i is the maximum of (y_i − x_i) in the window: a monotonic deque over y − x.
- **Minimum window with sum ≥ K** (positive numbers): a plain window suffices; the deque is needed only with negatives.
- **Sliding window minimum of costs** in DP problems (e.g. minimum cost to reach the end with jumps of at most k).
- **Maximum of Minimum Values in All Subarrays** (LC 1950): monotonic stacks rather than deques.

## Monotonic stack vs monotonic deque

A monotonic **stack** answers "nearest greater/smaller element" questions (elements are popped only from the top). A monotonic **deque** adds removal from the front for elements that **expire** (leave a window), which is what windows need.

## Interview angles

- State the dominance argument ("older and smaller can never be the max again").
- Show the four steps in order and explain the expiry check.
- For LC 862, explain both pops.

## Connections

Monotonic stacks, sliding windows, prefix sums with negative numbers, and deque-optimised DP.
`,
    doubts: [
      ["Pop from the back with ≤ or <?", "Either is correct for the maximum. ≤ keeps the deque smaller (equal older values are dropped). With <, equal values stay, which is harmless."],
      ["Why check the front for expiry after pushing?", "The order of steps 1–3 can vary as long as, when you read the answer, the front is inside the window. Checking expiry right before reading is the simplest correct order."],
      ["In LC 862, why pop the front after recording?", "For that start index, the current i gives the shortest possible end; any later end only lengthens the subarray. So that start is finished."],
      ["Why is a heap O(n log k) but the deque O(n) for window maximum?", "The heap keeps every candidate, including ones that can never be the maximum again, and pays log k per operation. The deque discards dominated elements immediately, so each index is touched a constant number of times."],
      ["Can the monotonic deque return the k-th largest of each window?", "No: it only keeps elements that could be the maximum, discarding information about the rest. Order statistics need a sorted multiset or two heaps."],
      ["What if the window size varies (a condition instead of k)?", "The deque still works as long as the left boundary only moves right: pop the front whenever its index falls below the current left boundary. LC 1438 is an example with a condition-driven left boundary."],
    ],
    revise: md`
? Window max deque order? :: Decreasing values (indices stored).
? Back pop rule? :: Pop while a[back] ≤ a[i]: dominated by a younger, larger value.
? Front pop rule? :: Pop when the index leaves the window.
? Complexity? :: O(n): each index pushed and popped once.
? Shortest subarray sum ≥ k with negatives? :: Prefix sums + increasing deque; pop front while P[i] − P[front] ≥ k, pop back while P[back] ≥ P[i].
? dp[i] = a[i] + max(dp[i−k..i−1])? :: Window max over dp values with a deque.
? Max Value of Equation (LC 1499)? :: Deque over (y_i − x_i) with x_j − x_i ≤ k; answer y_j + x_j + front value.
? LC 862 front pop meaning? :: That start already reached ≥ K; later ends would be longer.
? LC 862 back pop meaning? :: An older start with a larger prefix is dominated by j.
? Stack vs deque? :: Deque adds front removal for expired indices.
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

Many DPs look back over a **window** of earlier states:

dp[i] = cost(i) + best over j in [i − k, i − 1] of (dp[j] + f(j))

where "best" is max or min and f(j) depends only on j. Computing the best by scanning the window costs O(k) per state, O(n·k) in total. Because the window slides forward (both ends only increase) and the candidate value dp[j] + f(j) depends only on j, the best can be maintained with a **monotonic deque** in amortised O(1): O(n) total.

## The algorithm

Process i in increasing order. Keep a deque of indices j with **decreasing** candidate values (for max):

1. Pop from the front while front < i − k (expired).
2. dp[i] = cost(i) + candidate(front) (or the base case if the deque is empty).
3. Pop from the back while candidate(back) ≤ candidate(i), then push i.

\`\`\`python
from collections import deque
def max_result(nums, k):                    # Jump Game VI (LC 1696)
    n = len(nums); dp = [0] * n; dp[0] = nums[0]
    dq = deque([0])
    for i in range(1, n):
        if dq[0] < i - k: dq.popleft()
        dp[i] = nums[i] + dp[dq[0]]
        while dq and dp[dq[-1]] <= dp[i]: dq.pop()
        dq.append(i)
    return dp[-1]
\`\`\`

Why it is valid even though dp values are computed on the fly: dp[i] depends only on dp[j] for j < i, which are final when i is processed; and once dp[i] is pushed, any older j with a smaller or equal candidate is dominated for every future state (i stays in the window longer and is at least as good), exactly as in the sliding-window maximum.

## Problems

- **Jump Game VI** (LC 1696): dp[i] = nums[i] + max(dp[i − k..i − 1]).
- **Constrained Subsequence Sum** (LC 1425): dp[i] = nums[i] + max(0, max(dp[i − k..i − 1])); the answer is max dp. The max(0, …) allows starting fresh.
- **Delivering Boxes from Storage to Ports** (LC 1687): dp over the number of boxes shipped, with a window limited by box count and weight; the cost involves prefix sums of port changes, giving candidates dp[j] − diff[j + 1].
- **Minimum cost to reach the end with jumps of at most k** (generic): min version with an increasing deque.
- **Max Value of Equation** (LC 1499): the window is defined by x-distance; candidate y − x.
- **Bounded knapsack per residue class**: for item (w, v, c) and residue r, dp over capacities r + t·w is a sliding-window maximum of dp_old[t] − t·v over a window of c + 1.
- **Sliding window with a gap** ([i − k, i − m]): add index i − m to the deque only when it enters the window (when processing i), not index i itself.

## The general family

Deque optimisation needs:

1. the candidate value of j depends only on j (so candidates can be ranked independently of i), and
2. the window's left and right boundaries move monotonically forward.

When the cost couples i and j multiplicatively (dp[j] + a[j]·b[i]), candidates cannot be ranked once: use the **convex hull trick** (lines queried at x = b[i]) or a Li Chao tree. When the optimal j is monotone in i but the cost is a general function, use **divide-and-conquer optimisation**; for interval DPs, **Knuth's optimisation**.

## Heap alternative

A max-heap of (dp[j] + f(j), j) with lazy removal of expired indices (pop the top while its index is outside the window) gives O(n log n). Simpler to get right under pressure; the deque is the optimal answer. Mention both.

## Interview angles

- Write the naive O(n·k) DP first and point out the window maximum.
- Explain the two deque pops (expired front, dominated back).
- Name the convex hull trick for coupled costs.

## Connections

Monotonic deques, sliding window maximum, DP optimisations, and bounded knapsack.
`,
    doubts: [
      ["Why is the deque valid for DP values when they are computed on the fly?", "The deque only ever contains already computed dp[j] for j < i. You push dp[i] after computing it, and it becomes available for later indices exactly when it enters their window."],
      ["What if the window is [i − k, i − m] (a gap)?", "Push index i − m into the deque when processing i (delayed insertion), and expire indices < i − k as usual."],
      ["Why can the deque hold dp values that were computed during the same scan?", "When index i is processed, every j it reads is smaller and already final; then dp[i] is final and is added. The deque never contains a value that will change later, which is what the dominance argument requires."],
      ["Does the deque work for a minimum instead of a maximum?", "Yes: keep candidates increasing from front to back and pop the back while candidate(back) ≥ candidate(i). Everything else is identical."],
      ["How do I recover the path (which j was chosen) in deque DP?", "Record parent[i] = the front index used to compute dp[i]. Walk back from the final state through parent pointers."],
    ],
    revise: md`
? Template recognition? :: dp[i] = cost(i) + max/min of dp over the last k indices.
? Optimisation? :: Monotonic deque of dp indices: O(n) instead of O(nk).
? Constrained Subsequence Sum transition? :: dp[i] = a[i] + max(0, window max).
? Heap alternative complexity? :: O(n log n) with lazy deletion.
? Gap window [i−k, i−m] insertion? :: Insert index i − m when processing i (when it enters the window).
? Constrained Subsequence Sum recurrence? :: dp[i] = nums[i] + max(0, window max of dp).
? When does deque optimisation fail? :: Candidate depends on i (coupled cost): use CHT / Li Chao.
? Heap alternative cost? :: O(n log n) with lazy expiry.
`,
    pitfalls: ["Pushing dp[i] into the deque before using the window for i", "Forgetting the 'start fresh' option (max with 0)"],
    quiz: [Q("Jump Game VI with n = 10⁵, k = 10⁵. Naive DP is…", ["fine", "*O(nk) = 10¹⁰, too slow", "O(n log n)", "O(n)"], "Use the monotonic deque.")],
    sources: [S.article("Double-ended queue", "Wikipedia", "https://en.wikipedia.org/wiki/Double-ended_queue"), S.article("Monotonic queue optimization", "USACO Guide", "https://usaco.guide/gold/sliding-window")],
    problems: [1696, 1425, 1499, 1687, 2944],
  },
};
