import { md } from "@/content/ai/md";
import { Q } from "@/content/h";
import { S, type Deep } from "../types";

/** Greedy, intervals, bit manipulation and maths. */
export const greedyMath: Record<string, Deep> = {
  // ─────────────── greedy ───────────────
  "greedy-proofs": {
    blurb: "Make the locally best choice and never look back, but only after proving it safe. Exchange arguments, \"greedy stays ahead\", and the counterexamples that send you to DP.",
    signals: ["Choose an order or a subset where one rule seems obviously right", "Constraints too large for DP (n ≤ 10⁵ with values to 10⁹)", "Sorting by one key appears to solve it"],
    lesson: md`
## Greedy needs a proof

A greedy algorithm commits to one choice per step by a local rule. It is correct only for problems with the **greedy-choice property** (some optimal solution starts with the greedy choice) and **optimal substructure**. In interviews, a one-sentence proof sketch is what separates a correct greedy from a lucky one.

## Exchange argument

Take any optimal solution that differs from the greedy one. Show you can **swap** one of its choices for the greedy choice without making it worse. Repeating the swap turns the optimum into the greedy solution, so greedy is optimal.

Example: **Two City Scheduling** (LC 1029). Sort people by cost_A − cost_B and send the first half to A. If an optimal assignment sends some i to B and j to A with diff_i < diff_j, swapping them changes the cost by (diff_i − diff_j) ≤ 0, so it never hurts.

## Greedy stays ahead

Show by induction that after each step the greedy partial solution is at least as good as any other's partial solution. Example: **interval scheduling** by earliest end time: after k choices, greedy's k-th interval ends no later than any other solution's k-th interval, so greedy can always fit at least as many.

## Checking with counterexamples

Before committing, try to break the rule with a tiny case:
- Coin change {1, 3, 4}, amount 6: largest-coin-first gives 3 coins, optimum 2 → DP.
- 0/1 knapsack by value/weight ratio fails (see knapsack).
- Interval scheduling by **shortest** interval fails ([1, 5], [4, 7], [6, 10]: shortest is [4, 7], blocking two).
- Interval scheduling by **earliest start** fails.

## Classic greedy problems

- **Candy** (LC 135): two passes (left-to-right and right-to-left), each enforcing one neighbour rule; take the max.
- **Assign Cookies** (LC 455): sort both; give the smallest sufficient cookie.
- **Queue Reconstruction by Height** (LC 406): sort by height desc, k asc; insert each at index k.
- **Remove Duplicate Letters / Smallest Subsequence** (LC 316, 1081): monotonic stack with "last occurrence" checks.
- **Minimum Number of Arrows** (LC 452): sort by end; shoot at the end of the first unburst balloon.
- **Partition Labels** (LC 763): extend the current part to the last occurrence of every character seen.
- **Largest Number** (LC 179): sort by the comparator a + b > b + a (its transitivity is the subtle part of the proof).
- **Huffman coding**: repeatedly merge the two lightest (see greedy with a heap).

## Matroids (name-level)

Problems whose feasible sets form a matroid (spanning forests, linearly independent sets, scheduling unit jobs with deadlines) are exactly those where "sort by weight, add if still feasible" is optimal. It explains why Kruskal works.
`,
    doubts: [
      ["How do I know if greedy will work?", "Try to prove it with an exchange argument, and try to break it with small counterexamples (2–4 items). If you cannot prove it and a counterexample appears, switch to DP."],
      ["Why does Candy need two passes?", "Each child must have more candy than a lower-rated neighbour on either side. One left-to-right pass satisfies the left neighbour rule; a right-to-left pass the right rule; the max of both satisfies both with the minimum total."],
      ["Is 'sort, then do the obvious thing' always greedy?", "Usually, yes, and the sort key is the claim you must justify. Many interview greedies are one sort plus one pass: O(n log n)."],
    ],
    revise: md`
? Exchange argument? :: Swap an optimal solution's choice for the greedy one without making it worse.
? Greedy stays ahead? :: Induction: after each step greedy is at least as good as any partial solution.
? Interval scheduling rule? :: Earliest end time first.
? Two City Scheduling sort key? :: cost_A − cost_B.
? Candy? :: Two passes, take the max.
? Largest Number comparator? :: a + b > b + a.
? Partition Labels? :: Extend the part to the last occurrence of each character.
`,
    pitfalls: ["Greedy without a proof", "Sorting by the wrong key (shortest interval, earliest start)", "Not testing tiny counterexamples"],
    quiz: [
      Q("Max non-overlapping intervals: sort by…", ["start", "length", "*end", "count of overlaps"], "Earliest end leaves the most room."),
      Q("[3, 30, 34, 5, 9] largest number?", ["9534303", "*9534330", "9533430", "3034593"], "Comparator a+b > b+a puts 3 before 30."),
    ],
    sources: [S.book("Algorithms, chapter 4: Greedy Algorithms", "Jeff Erickson", "https://jeffe.cs.illinois.edu/teaching/algorithms/book/04-greedy.pdf"), S.book("Algorithm Design, ch. 4 Greedy Algorithms", "Kleinberg & Tardos", "https://www.pearson.com/en-us/subject-catalog/p/algorithm-design/P200000003259"), S.article("Matroid (greedy algorithm)", "Wikipedia", "https://en.wikipedia.org/wiki/Matroid#Greedy_algorithms")],
    problems: [1029, 135, 455, 406, 316, 452, 763, 179, 402, 649],
  },
  "greedy-reach": {
    blurb: "Track the farthest point you can reach (jump game), or the running surplus (gas station). One linear pass replaces a quadratic DP.",
    signals: ["Can you reach the end? Minimum jumps?", "Circular route with fuel gains and costs", "Minimum number of taps / clips / refuelling stops to cover a range"],
    lesson: md`
## Jump Game (LC 55)

Keep reach = the farthest index reachable so far. For each i ≤ reach, update reach = max(reach, i + a[i]). If i ever exceeds reach, you are stuck. O(n).

## Jump Game II (LC 45): minimum jumps

BFS by levels, implicitly: [start, end] is the range reachable with the current number of jumps; scan it to find the farthest next reach; then jumps += 1 and the next range is (end, farthest]. O(n). This is BFS where each level is a contiguous interval.

## Gas Station (LC 134)

If total gas < total cost, no start works. Otherwise, scan with a running tank; whenever the tank goes negative at i, no start in [start, i] can work (they all arrive at i with even less), so set start = i + 1 and reset the tank. The final start is the answer, and it is unique if the problem guarantees one. O(n).

## Covering a range with intervals

- **Video Stitching** (LC 1024), **Minimum Number of Taps** (LC 1326): convert each item to an interval, then the jump-game-II greedy: from the current covered end, choose the interval starting at or before it that reaches farthest.
- **Minimum Number of Refuelling Stops** (LC 871): drive as far as fuel allows, pushing passed stations into a max-heap; when stuck, refuel from the largest passed station. Heap greedy, O(n log n).

## Jump game variants that need more than greedy

- Jump Game III (LC 1306): reach any zero, jumps ±a[i]: BFS/DFS.
- Jump Game IV (LC 1345): BFS with equal-value edges (clear them after use).
- Jump Game VI (LC 1696): maximise score: DP with a monotone deque.
- Frog Jump (LC 403): DP over (stone, last jump size).
`,
    doubts: [
      ["Why can Gas Station skip directly to i + 1 after a failure?", "Any start s in [start, i] reaches i with a tank no larger than the one starting at start (which was non-negative at every earlier point). So starting later inside that range cannot fix the deficit at i."],
      ["Why is Jump Game II a BFS?", "All indices reachable with k jumps form a contiguous range, and the next range is everything reachable from it. Scanning ranges level by level is BFS without a queue."],
    ],
    revise: md`
? Jump Game? :: Track reach; fail if i > reach.
? Jump Game II? :: Level ranges: jumps when passing the current range's end, extend to farthest.
? Gas Station feasibility? :: total gas ≥ total cost.
? Gas Station start? :: Reset start to i + 1 whenever the tank goes negative.
? Taps / video stitching? :: Intervals + jump-game-II greedy.
? Refuelling stops? :: Max-heap of passed stations; refuel when stuck.
`,
    pitfalls: ["O(n²) DP for jump game", "Missing the total gas check", "Off-by-one when converting taps to intervals"],
    quiz: [Q("Jump Game II on [2,3,1,1,4]: minimum jumps?", ["1", "*2", "3", "4"], "0 → 1 → 4.")],
    sources: [S.article("Jump game II: editorial", "LeetCode", "https://leetcode.com/problems/jump-game-ii/editorial/"), S.book("Algorithms, chapter 4: Greedy Algorithms", "Jeff Erickson", "https://jeffe.cs.illinois.edu/teaching/algorithms/book/04-greedy.pdf")],
    problems: [55, 45, 134, 1024, 1326, 871, 1306],
  },
  "greedy-heap": {
    blurb: "Greedy choices that need the best remaining option at every step: Huffman coding, merging ropes or stones, reorganising strings, IPO and course scheduling.",
    signals: ["Repeatedly combine the two smallest / largest", "Pick the best available option among those unlocked so far", "Arrange items so equal ones are not adjacent"],
    lesson: md`
## Huffman coding

Optimal prefix-free codes: repeatedly merge the two least frequent symbols into a node whose frequency is their sum. O(n log n) with a min-heap. Proof by exchange: the two least frequent symbols can always be siblings at the deepest level of some optimal tree. Huffman underlies DEFLATE (zip, gzip, PNG) alongside LZ77.

**Minimum Cost to Connect Sticks** (LC 1167) is the same algorithm: merge the two shortest. Optimal merge patterns (Abdul Bari) too.

## Reorganise String (LC 767)

Possible iff the most frequent character count ≤ ⌈n / 2⌉. Greedy: always place the most frequent character that differs from the previous one (max-heap), or fill even indices then odd indices with characters sorted by frequency. **Rearrange String k Distance Apart** (LC 358) adds a cooldown queue. **Task Scheduler** (LC 621) has the closed form.

## Unlock-then-choose

- **IPO** (LC 502): projects unlock when capital suffices; choose the max profit (two-pool heaps).
- **Course Schedule III** (LC 630): sort by deadline; keep a max-heap of durations; if the total exceeds the current deadline, drop the longest course.
- **Maximum Events That Can Be Attended** (LC 1353): sweep days; push events starting today; attend the one ending soonest (min-heap by end).
- **Furthest Building** (LC 1642): ladders for the largest climbs.

## Last Stone Weight (LC 1046)

Simulate with a max-heap. (Last Stone Weight II is subset sum, not greedy.)

## Proof habit

Each of these is an exchange argument: if an optimal solution deviates from "take the best available now", swap toward the greedy choice without loss.
`,
    doubts: [
      ["Why is Huffman's greedy optimal?", "In some optimal tree, the two least frequent symbols are siblings at maximum depth (swapping them there never increases the weighted length). Merging them reduces the problem to one with one fewer symbol, and induction finishes the proof."],
      ["Why must the most frequent character be ≤ ⌈n/2⌉ in Reorganise String?", "Equal characters need at least one other character between each pair, so k copies need k − 1 separators: k + (k − 1) ≤ n, i.e. k ≤ (n + 1)/2."],
    ],
    revise: md`
? Huffman step? :: Merge the two smallest frequencies.
? Connect sticks? :: Same as Huffman: total cost of merges.
? Reorganise String feasibility? :: max count ≤ ⌈n/2⌉.
? Course Schedule III? :: Sort by deadline, max-heap durations, drop the longest when over.
? Max events attended? :: Sweep days; min-heap of end days.
`,
    pitfalls: ["Merging in sorted order without a heap (wrong after the first merge)", "Last Stone Weight II mistaken for greedy"],
    quiz: [Q("Sticks [2,4,3]: minimum cost to connect?", ["9", "*14", "15", "18"], "2+3 = 5, then 5+4 = 9: total 14.")],
    sources: [S.paper("A method for the construction of minimum-redundancy codes (Huffman, 1952)", "Proceedings of the IRE", "https://doi.org/10.1109/JRPROC.1952.273898"), S.article("Huffman coding", "Wikipedia", "https://en.wikipedia.org/wiki/Huffman_coding")],
    problems: [1167, 767, 358, 502, 630, 1353, 1046, 1642],
  },
  "greedy-sorting": {
    blurb: "Sort by the right key, then sweep: boats, assigning tasks to workers, maximum units on a truck, reducing arrays. The key is the whole insight.",
    signals: ["Pair items optimally (heaviest with lightest)", "Assign jobs to workers by capability", "Maximise or minimise a sum after sorting"],
    lesson: md`
## Pairing

- **Boats to Save People** (LC 881): sort; pair the heaviest with the lightest if they fit, otherwise the heaviest goes alone. Two pointers.
- **Array Partition** (LC 561): sort and sum every other element (pair neighbours).
- **Minimise Maximum Pair Sum** (LC 1877): sort; pair smallest with largest.

## Assignment by capability

- **Most Profit Assigning Work** (LC 826): sort jobs by difficulty and workers by ability; sweep with the best profit so far.
- **Maximum Number of Tasks You Can Assign** (LC 2071): binary search on the count plus a greedy check with pills (a deque or multiset).
- **Advantage Shuffle** (LC 870): sort both; beat each opponent with the smallest card that wins, otherwise sacrifice the smallest card (Tian Ji's horse racing).

## Fractional and ratio choices

- **Maximum Units on a Truck** (LC 1710): sort by units per box, take greedily (fractional-knapsack-like because boxes are identical units).
- **Minimum Cost to Hire K Workers** (LC 857): sort by wage/quality ratio; heap of qualities.

## Reduction to sorting

- **Minimum Moves to Equal Array Elements II** (LC 462): move everything to the median: sort (or quickselect).
- **Car Fleet** (LC 853): sort by position descending; compare arrival times.
- **Non-overlapping intervals / arrows**: sort by end.

## Proving it

Typically an exchange: if an optimal assignment pairs a stronger worker with an easier job while a weaker worker takes a harder one, swapping keeps feasibility and does not reduce profit.
`,
    doubts: [
      ["Why pair the heaviest with the lightest in Boats?", "The heaviest person must ride with someone or alone. If anyone can share with them, the lightest can (smallest weight). Pairing the heaviest with someone heavier than necessary only wastes a lighter person who could pair with someone else."],
      ["Why the median for minimum total moves?", "The sum of absolute deviations is minimised at the median: moving the target past the median increases distance to more points than it decreases."],
    ],
    revise: md`
? Boats rule? :: Sort; heaviest with lightest if they fit.
? Advantage shuffle rule? :: Win with the smallest winning card; else throw the smallest card.
? Minimum moves to equal elements (±1)? :: Move to the median.
? Profit assigning work? :: Sort jobs and workers; sweep with running best profit.
`,
    pitfalls: ["Sorting by the wrong key", "Missing the binary search + greedy combination in assignment problems"],
    quiz: [Q("Boats with limit 3, people [3,2,2,1]: minimum boats?", ["2", "*3", "4", "1"], "[3], [2,1], [2].")],
    sources: [S.book("Algorithms, chapter 4: Greedy Algorithms", "Jeff Erickson", "https://jeffe.cs.illinois.edu/teaching/algorithms/book/04-greedy.pdf")],
    problems: [881, 561, 1877, 826, 2071, 870, 1710, 462, 853],
  },

  // ─────────────── intervals ───────────────
  "merge-intervals": {
    blurb: "Sort by start, then merge whenever the next interval starts before the current one ends. Insert, merge, intersect and remove intervals with the boundary conventions stated.",
    signals: ["Overlapping ranges to combine", "Insert a new interval into a sorted list", "Total covered length or free time"],
    lesson: md`
## Merge Intervals (LC 56)

Sort by start. Keep the last merged interval; if the next starts ≤ its end, extend the end to max(end, next.end); otherwise start a new interval. O(n log n).

**Boundary convention**: do [1, 2] and [2, 3] overlap? For closed intervals, yes (they touch). Ask, and use < or ≤ deliberately.

## Insert Interval (LC 57)

The list is sorted and non-overlapping: append everything ending before the new interval, merge everything overlapping it (min of starts, max of ends), append the rest. O(n), no sort.

## Related

- **Interval List Intersections** (LC 986): two pointers.
- **Remove Covered Intervals** (LC 1288): sort by start asc, end desc; count those not covered by the running max end.
- **Employee Free Time** (LC 759): merge all intervals, then the gaps between merged intervals.
- **Summary Ranges** (LC 228), **Missing Ranges** (LC 163).
- **Data Stream as Disjoint Intervals** (LC 352): an ordered map from start to end; on insert, check the floor and ceiling neighbours for merging.
- **Range Module** (LC 715): ordered map with add, remove and query; tricky boundary handling. A segment tree also works.

## Coordinate thinking

Most interval problems are about **events** at endpoints. When merging is not enough (counting overlaps, maximum concurrency), switch to a sweep line.
`,
    doubts: [
      ["Why sort by start rather than end for merging?", "With starts sorted, an interval can only overlap the current merged block or come after it, so a single running block suffices. Sorting by end does not guarantee that a later interval cannot start before the current block."],
      ["How do I handle a dynamic set of intervals?", "An ordered map keyed by start (TreeMap) lets you find neighbours with floor and ceiling in O(log n) and merge locally."],
    ],
    revise: md`
? Merge rule after sorting by start? :: next.start ≤ cur.end → cur.end = max(cur.end, next.end).
? Insert into sorted non-overlapping list? :: Before / overlapping (merge) / after: O(n).
? Remove covered intervals sort? :: Start asc, end desc.
? Free time? :: Merge all, then gaps.
? Dynamic intervals? :: Ordered map with floor/ceiling merging.
`,
    pitfalls: ["Touching endpoints ambiguity", "Not taking max of ends (nested intervals)", "Sorting when the input is already sorted (Insert Interval)"],
    quiz: [Q("Merge [1,4], [2,3]:", ["[1,3]", "*[1,4]", "[[1,4],[2,3]]", "[2,4]"], "Nested: end is max(4, 3).")],
    sources: [S.article("Merge intervals: editorial", "LeetCode", "https://leetcode.com/problems/merge-intervals/editorial/")],
    problems: [56, 57, 986, 1288, 759, 228, 352, 715],
  },
  "sweep-line": {
    blurb: "Turn intervals into +1/−1 events at their endpoints and sweep in order: maximum overlap, meeting rooms, car pooling, and the tie-breaking rule that decides touching intervals.",
    signals: ["Maximum number of simultaneous intervals", "Resource capacity over time (seats, rooms, passengers)", "Counting coverage at points"],
    lesson: md`
## Events

For each interval [s, e): event (s, +1) and (e, −1). Sort events by time; at equal times, process **−1 before +1** if an interval ending at t frees its resource for one starting at t (half-open). Sweep with a running sum; its maximum is the peak overlap. O(n log n).

- **Meeting Rooms II** (LC 253), **Car Pooling** (LC 1094, events weighted by passengers), **My Calendar II/III** (LC 731, 732: an ordered map of time → delta, recomputing the running max).
- When coordinates are small integers, use a **difference array** instead of sorting: O(n + range).

## Points and intervals

- **Number of Flowers in Full Bloom** (LC 2251): for each person time t, count starts ≤ t minus ends < t with two sorted arrays and binary search.
- **Minimum Number of Platforms**: same as meeting rooms with arrival/departure times.
- **Maximum population year** (LC 1854): difference array over years.

## Sweeps with a structure

When the sweep needs "the current maximum height" or "the active set", carry a multiset or heap:
- **The Skyline Problem** (LC 218): see skyline.
- **Rectangle Area II** (LC 850): sweep x, maintain covered y-length with a segment tree over compressed y.
- **Perfect Rectangle** (LC 391): corner-count trick (each inner corner appears an even number of times).

## Coordinate compression

When coordinates are huge (10⁹) but few, map sorted distinct coordinates to 0..k − 1 so arrays and segment trees stay small.
`,
    doubts: [
      ["Why process end events before start events at the same time?", "For half-open intervals [s, e), an interval ending at t is gone at t, so a meeting starting at t can reuse its room. Processing −1 first reflects that; processing +1 first would count them as overlapping."],
      ["Sweep line or heap for meeting rooms?", "Both are O(n log n). The heap version also tells you which room each meeting uses; the sweep is shorter for just the count."],
    ],
    revise: md`
? Event encoding? :: (start, +1), (end, −1).
? Tie-break for half-open intervals? :: End events before start events at equal times.
? Small integer coordinates? :: Difference array, no sort.
? Flowers in bloom per query? :: #starts ≤ t − #ends < t via binary search.
? Huge coordinates? :: Coordinate compression.
`,
    pitfalls: ["Wrong tie-breaking", "Forgetting weights (passengers)", "Arrays over raw 10⁹ coordinates"],
    quiz: [Q("Car pooling: trips [[2,1,5],[3,3,7]], capacity 4. Feasible?", ["Yes", "*No", "Only with tie rules", "Depends on order"], "Between times 3 and 5, 2 + 3 = 5 > 4.")],
    sources: [S.article("Sweep line algorithm", "Wikipedia", "https://en.wikipedia.org/wiki/Sweep_line_algorithm"), S.article("Coordinate compression and sweep", "USACO Guide", "https://usaco.guide/silver/sorting-custom")],
    problems: [253, 1094, 731, 732, 2251, 1854, 850, 391],
  },
  "interval-scheduling": {
    blurb: "Choose the most non-overlapping intervals (earliest end first), remove the fewest to make the rest disjoint, burst balloons with the fewest arrows, and weighted scheduling with DP.",
    signals: ["Maximum number of compatible intervals", "Minimum removals to eliminate overlaps", "Minimum points piercing every interval"],
    widgets: ["intervals"],
    lesson: md`
## Earliest end first

Sort by end time; take an interval if it starts after (or at, depending on convention) the last taken end. This maximises the number of disjoint intervals (proof: greedy stays ahead). O(n log n).

[[widget:intervals]]

- **Non-overlapping Intervals** (LC 435): minimum removals = n − maximum disjoint set.
- **Minimum Number of Arrows to Burst Balloons** (LC 452): sort by end; shoot at the end of the first balloon not yet burst; this is the same greedy (minimum piercing points = maximum disjoint intervals).
- **Maximum Length of Pair Chain** (LC 646): same.

## Weighted interval scheduling

If intervals have weights, greedy fails. DP: sort by end; dp[i] = max(dp[i − 1], w[i] + dp[p(i)]) where p(i) is the last interval ending before i starts (binary search). O(n log n). **Maximum Profit in Job Scheduling** (LC 1235), **Maximum Earnings From Taxi** (LC 2008), **Two Best Non-Overlapping Events** (LC 2054).

## Interval partitioning

Minimum number of resources so no two overlapping intervals share one = maximum overlap depth (meeting rooms). Greedy by start with a min-heap of end times achieves it.

## Covering

Minimum intervals to cover [0, T] (Video Stitching, taps): greedy by farthest reach (jump game II). Different from scheduling.

## Summary table

| Question | Method |
|---|---|
| max disjoint intervals | sort by end, greedy |
| min removals to be disjoint | n − max disjoint |
| min piercing points | sort by end, greedy |
| min rooms / max overlap | sweep or heap |
| max total weight, disjoint | DP + binary search |
| cover a range with fewest | farthest-reach greedy |
`,
    doubts: [
      ["Why does earliest end time maximise the count?", "After choosing k intervals, greedy's k-th end is no later than the k-th end of any other valid selection (induction). So whenever another selection can take a (k+1)-th interval, greedy can too."],
      ["Why does greedy fail with weights?", "A single long interval with a huge weight may be worth more than many short ones that greedy prefers. Weighted scheduling needs DP over the sorted intervals."],
    ],
    revise: md`
? Max disjoint intervals? :: Sort by end; take if start ≥ last end.
? Min removals? :: n − max disjoint.
? Min arrows? :: Sort by end; shoot at the end of the first unburst balloon.
? Weighted scheduling? :: DP with binary search for the last compatible interval.
? Min rooms? :: Maximum overlap (sweep or heap).
? Cover [0, T] with fewest? :: Farthest-reach greedy.
`,
    pitfalls: ["Sorting by start for scheduling", "Greedy for weighted versions", "Touching endpoints convention"],
    quiz: [Q("Intervals [1,2],[2,3],[3,4],[1,3]: minimum removals to make non-overlapping (touching allowed)?", ["0", "*1", "2", "3"], "Remove [1,3].")],
    sources: [S.article("Interval scheduling", "Wikipedia", "https://en.wikipedia.org/wiki/Interval_scheduling"), S.book("Algorithm Design, ch. 4.1 and 6.1 (interval scheduling, weighted)", "Kleinberg & Tardos", "https://www.pearson.com/en-us/subject-catalog/p/algorithm-design/P200000003259")],
    problems: [435, 452, 646, 1235, 2008, 2054, 729],
  },
  skyline: {
    blurb: "The Skyline Problem and its relatives: a sweep over building edges with a multiset (or heap with lazy deletion) of active heights, emitting a key point whenever the maximum changes.",
    signals: ["Outline formed by overlapping rectangles", "Maximum height over time as intervals start and end", "Falling squares stacking"],
    lesson: md`
## The Skyline Problem (LC 218)

Events: building start (x, height, start) and end (x, height, end). Sort by x; at equal x, process starts before ends, taller starts first and shorter ends first (or encode starts as negative heights and sort pairs). Maintain a multiset of active heights (with 0 always present). After processing each x, if the current maximum differs from the last emitted height, emit (x, max). O(n log n).

With a heap: push (−height, end) at starts; at each x, pop entries whose end ≤ x (lazy deletion), then compare the top with the previous height.

Divide and conquer also works: compute the skyline of each half and merge like merge sort (O(n log n)).

## Falling Squares (LC 699)

Squares land on the tallest overlapping square. With coordinate compression and a segment tree supporting range max query and range assign, O(n log n); with n ≤ 1000, O(n²) pairwise checks pass.

## Related sweeps with active sets

- **Rectangle area union** (LC 850): sweep over x with a segment tree counting coverage over compressed y.
- **Count rooms in use per time** with priorities.
- **Maximum height after each interval addition** (online): ordered map of segments.

## Interview strategy

Talk through the event ordering rules explicitly; they are the main source of bugs. Test with buildings sharing edges and with a tall building fully covering a short one.
`,
    doubts: [
      ["Why must taller starts come first at the same x?", "If a short building starts first, you emit its height and then immediately emit the tall one at the same x: a redundant key point. Processing tall first (or emitting only after all events at x) avoids it."],
      ["Why keep 0 in the active set?", "When all buildings end, the skyline drops to ground level. Having 0 always present makes the maximum well defined."],
    ],
    revise: md`
? Skyline events? :: Starts and ends at building edges, sorted by x with careful tie rules.
? Active structure? :: Multiset of heights (or max-heap with lazy deletion), with 0 always present.
? Emit when? :: The current max differs from the last emitted height.
? Alternative? :: Divide and conquer merge of skylines.
? Falling Squares at scale? :: Coordinate compression + segment tree (range max, range assign).
`,
    pitfalls: ["Emitting duplicate points at equal x", "Removing the wrong copy of equal heights", "Forgetting ground level 0"],
    quiz: [Q("In the heap version, when do you remove a building's height?", ["at its start", "immediately at its end event", "*lazily, when it reaches the top and its end ≤ x", "never"], "Heaps cannot delete arbitrary entries efficiently.")],
    sources: [S.article("The skyline problem: editorial", "LeetCode", "https://leetcode.com/problems/the-skyline-problem/editorial/"), S.article("Sweep line algorithm", "Wikipedia", "https://en.wikipedia.org/wiki/Sweep_line_algorithm")],
    problems: [218, 699, 850],
  },

  // ─────────────── bits ───────────────
  "bit-basics": {
    blurb: "Bitwise operators, two's complement, shifts and the idioms (lowest set bit, clear lowest bit, test/set/toggle) that interviewers expect you to write without thinking.",
    signals: ["Operate on individual bits of integers", "Power-of-two checks, masks, flags", "Add or multiply without arithmetic operators"],
    lesson: md`
## Operators

& (and), | (or), ^ (xor), ~ (not), << (left shift: × 2ᵏ), >> (right shift). In Java, >>> is the unsigned right shift; >> keeps the sign. In C++, right-shifting a negative signed integer was implementation-defined before C++20 (arithmetic since C++20). Python integers are unbounded, so mask with & 0xFFFFFFFF to emulate 32-bit behaviour.

## Two's complement

A w-bit signed integer x is stored as x mod 2^w. So −x = ~x + 1, the range is [−2^(w−1), 2^(w−1) − 1], and −2³¹ has no positive counterpart (abs overflows). This explains why x & (−x) isolates the lowest set bit.

## Idioms

| Goal | Expression |
|---|---|
| test bit i | (x >> i) & 1 |
| set bit i | x \\| (1 << i) |
| clear bit i | x & ~(1 << i) |
| toggle bit i | x ^ (1 << i) |
| lowest set bit | x & (−x) |
| clear lowest set bit | x & (x − 1) |
| is power of two | x > 0 and (x & (x − 1)) == 0 |
| all ones of length k | (1 << k) − 1 |
| sign of a + b overflow (C) | ((a ^ s) & (b ^ s)) < 0 with s = a + b |

## Classic problems

- **Number of 1 Bits** (LC 191): x &= x − 1 until zero (Kernighan's trick), or builtin popcount.
- **Reverse Bits** (LC 190), **Power of Two/Four** (LC 231, 342: power of 4 also needs the bit at an even position: x & 0x55555555).
- **Sum of Two Integers** without + (LC 371): sum = a ^ b, carry = (a & b) << 1, repeat until carry is 0 (mask in Python).
- **Bitwise AND of Numbers Range** (LC 201): the common prefix of m and n: shift both right until equal, then shift back.
- **Divide Two Integers** (LC 29): subtract shifted divisors (long division in base 2), handling the −2³¹ / −1 overflow.
- **UTF-8 Validation** (LC 393): read leading-one counts with masks.

## Built-ins

C++: __builtin_popcount, __builtin_ctz (trailing zeros), __builtin_clz; C++20 <bit> with std::popcount. Java: Integer.bitCount, numberOfTrailingZeros, highestOneBit. Python: int.bit_count() (3.10+), bit_length().
`,
    doubts: [
      ["Why does x & (x − 1) clear the lowest set bit?", "Subtracting 1 flips the lowest set bit to 0 and all the zeros below it to 1. ANDing with x keeps the higher bits and zeros out everything from the lowest set bit down."],
      ["Why does x & (−x) give the lowest set bit?", "In two's complement −x = ~x + 1: all bits above the lowest set bit are flipped, and that bit and the zeros below it are restored. AND keeps only the lowest set bit."],
      ["How do I emulate 32-bit overflow in Python?", "Mask results with & 0xFFFFFFFF, and convert back to signed with x if x < 2³¹ else x − 2³²."],
    ],
    revise: md`
? Clear lowest set bit? :: x & (x − 1).
? Isolate lowest set bit? :: x & (−x).
? Power of two test? :: x > 0 and x & (x − 1) == 0.
? −x in two's complement? :: ~x + 1.
? Add without +? :: sum = a ^ b, carry = (a & b) << 1, loop.
? AND of a range [m, n]? :: Common binary prefix of m and n.
? Java unsigned right shift? :: >>>.
`,
    pitfalls: ["Python's unbounded ints in overflow problems", "Operator precedence (x & 1 == 0 parses as x & (1 == 0) in C/Java)", "abs(INT_MIN) overflow"],
    quiz: [Q("12 & (12 − 1) =", ["11", "*8", "4", "0"], "1100 & 1011 = 1000.")],
    sources: [S.article("Bit Twiddling Hacks", "Sean Eron Anderson, Stanford", "https://graphics.stanford.edu/~seander/bithacks.html"), S.book("Hacker's Delight, 2nd ed.", "Henry S. Warren Jr.", "https://www.informit.com/store/hackers-delight-9780321842688"), S.article("Two's complement", "Wikipedia", "https://en.wikipedia.org/wiki/Two%27s_complement")],
    problems: [191, 190, 231, 342, 371, 201, 29, 393],
  },
  "xor-tricks": {
    blurb: "x ^ x = 0 and x ^ 0 = x: find the single number, the missing number, two unique numbers, and XOR over prefixes and ranges.",
    signals: ["Every element appears twice except one (or two)", "Find the missing or duplicated number in O(1) space", "XOR of a subarray or a range"],
    lesson: md`
## Properties

XOR is associative and commutative, x ^ x = 0, x ^ 0 = x. So XOR-ing a multiset cancels pairs.

## Problems

- **Single Number** (LC 136): XOR everything.
- **Missing Number** (LC 268): XOR all indices 0..n and all values; the missing one remains. (Sum formula also works but can overflow.)
- **Single Number III** (LC 260): two unique numbers a and b. x = a ^ b ≠ 0; pick its lowest set bit d = x & (−x); partition numbers by that bit and XOR each group: one group yields a, the other b.
- **Single Number II** (LC 137): everything thrice except one: count each bit mod 3, or the two-variable state machine (ones, twos).
- **Find the Duplicate and Missing** (set mismatch, LC 645): XOR trick like LC 260 with indices, or sign marking.
- **XOR Queries of a Subarray** (LC 1310): prefix XOR P, query = P[r + 1] ^ P[l].
- **Count Triplets That Can Form Two Arrays of Equal XOR** (LC 1442): equal XOR halves ⇔ XOR of the whole range is 0; count with prefix XOR frequencies.
- **XOR of 0..n** in O(1): n, 1, n + 1, 0 by n mod 4.
- **Decode XORed Permutation** (LC 1734): XOR of all of 1..n with alternate encoded values recovers the first element.

## Gray code

g(n) = n ^ (n >> 1): consecutive values differ in one bit. **Gray Code** (LC 89).

## Maximum XOR

Pairs maximising XOR use a binary trie (see bit-trie). Linear-basis (XOR basis over GF(2)) gives the maximum XOR of any subset: name-level.
`,
    doubts: [
      ["How does Single Number III split the two numbers?", "a ^ b has a 1 where a and b differ. Choosing any such bit, a and b fall into different groups (bit set vs not). All other numbers come in pairs, and each pair lands in the same group, cancelling out."],
      ["Why does Single Number II use mod 3 bit counts?", "For each bit, the total count over the array is 3k plus the unique number's bit. Taking the count mod 3 recovers each bit of the unique number."],
    ],
    revise: md`
? XOR identities? :: x ^ x = 0, x ^ 0 = x, associative and commutative.
? Missing number? :: XOR of 0..n and all values.
? Two unique numbers? :: Split by the lowest set bit of a ^ b.
? Everything thrice but one? :: Bit counts mod 3 (or ones/twos state).
? Range XOR? :: P[r+1] ^ P[l].
? XOR of 0..n? :: n, 1, n+1, 0 for n mod 4 = 0, 1, 2, 3.
? Gray code? :: n ^ (n >> 1).
`,
    pitfalls: ["Sum-based missing number overflow", "Using a set (O(n) space) when O(1) is asked"],
    quiz: [Q("XOR of 0..6?", ["0", "6", "*7", "1"], "6 mod 4 = 2 → n + 1 = 7.")],
    sources: [S.article("Exclusive or (properties)", "Wikipedia", "https://en.wikipedia.org/wiki/Exclusive_or"), S.article("Gray code", "cp-algorithms", "https://cp-algorithms.com/algebra/gray-code.html")],
    problems: [136, 268, 260, 137, 645, 1310, 1442, 89, 1734],
  },
  "bitmask-enum": {
    blurb: "Represent subsets as integers: enumerate all subsets, iterate submasks, use masks as compact sets of letters or visited states.",
    signals: ["n ≤ 20 elements and all subsets matter", "Compact set of letters (26 bits) for fast comparisons", "Visited sets inside search states"],
    lesson: md`
## Enumerating subsets

for mask in range(1 << n): bit i of mask says whether element i is in the subset. 2ⁿ subsets; building each costs O(n), or O(1) incrementally using the lowest set bit.

## Submasks of a mask

\`\`\`
sub = mask
while sub:
    ...           # use sub
    sub = (sub - 1) & mask
\`\`\`

Visits all non-empty submasks in decreasing order. Over all masks: 3ⁿ total.

## Masks as sets

- 26-bit letter masks: **Maximum Product of Word Lengths** (LC 318: two words share no letters iff mask1 & mask2 == 0).
- **Find the Longest Substring Containing Vowels in Even Counts** (LC 1371): a 5-bit parity mask of vowels; equal masks at two prefixes mean an even-count substring between them (prefix + hash map).
- **Number of Wonderful Substrings** (LC 1915): parity mask of 10 letters, allow at most one odd.
- **Maximum Length of a Concatenated String with Unique Characters** (LC 1239): backtracking over masks.
- **Can I Win** (LC 464): mask of used numbers as DP state.

## Gosper's hack

Iterate all masks with exactly k bits set in increasing order: c = x & −x; r = x + c; x = (((r ^ x) >> 2) // c) | r. Name-level curiosity.

## Meet in the middle

When n ≈ 40, enumerate 2^(n/2) masks for each half and combine with sorting or hashing. See meet in the middle.
`,
    doubts: [
      ["Why does (sub − 1) & mask enumerate submasks?", "Subtracting 1 turns the lowest set bit of sub into 0 and sets all bits below it; ANDing with mask keeps only bits allowed by mask. This is decrementing within the bits of mask, visiting every submask once."],
      ["How do parity masks find even-count substrings?", "The parity mask at prefix i records which letters appeared an odd number of times. A substring between prefixes with equal masks has every letter appearing an even number of times."],
    ],
    revise: md`
? Enumerate all subsets? :: mask from 0 to 2ⁿ − 1.
? Next submask? :: sub = (sub − 1) & mask.
? Total submask work over all masks? :: 3ⁿ.
? Words share no letters? :: mask1 & mask2 == 0.
? Even vowel counts substring? :: Parity mask + first-index map.
`,
    pitfalls: ["1 << n with n ≥ 31 in 32-bit ints", "Forgetting the empty submask when it matters"],
    quiz: [Q("Number of submasks (including empty) of mask 1011₂?", ["4", "*8", "16", "3"], "2³ for three set bits.")],
    sources: [S.article("Enumerating submasks of a bitmask", "cp-algorithms", "https://cp-algorithms.com/algebra/all-submasks.html"), S.article("Bit Twiddling Hacks (next permutation of bits)", "Stanford", "https://graphics.stanford.edu/~seander/bithacks.html#NextBitPermutation")],
    problems: [78, 318, 1371, 1915, 1239, 464],
  },
  "bit-counting": {
    blurb: "Count set bits for a single number, for every number up to n with DP, and in Hamming-distance sums using per-bit contributions.",
    signals: ["Popcount of many numbers", "Sum of Hamming distances over all pairs", "Total number of 1 bits up to n"],
    lesson: md`
## Single numbers

Kernighan: count = 0; while x: x &= x − 1; count += 1. O(set bits). Or built-in popcount (one CPU instruction on modern hardware).

## Counting Bits for 0..n (LC 338)

DP: bits[i] = bits[i >> 1] + (i & 1), or bits[i] = bits[i & (i − 1)] + 1. O(n).

## Per-bit contributions

**Total Hamming Distance** (LC 477): for each bit position, if c numbers have it set, it contributes c · (n − c) to the sum over pairs. O(32 n) instead of O(n²).

The same "count each bit independently" trick appears in sum of XORs over pairs, sum of ANDs over subarrays, and XOR sum of all pairs' ANDs (LC 1835: (XOR of a) & (XOR of b)).

## Count total set bits in 1..n

Per bit k, full cycles of length 2^(k+1) each contain 2^k ones, plus a partial remainder: O(log n).

## Minimum flips

- **Minimum Bit Flips to Convert Number** (LC 2220): popcount(a ^ b).
- **Minimum Flips to Make a OR b Equal to c** (LC 1318): per-bit case analysis.
`,
    doubts: [
      ["Why does bits[i] = bits[i >> 1] + (i & 1) work?", "i >> 1 drops the lowest bit, whose set-bit count is already known (it is smaller than i); the dropped bit adds 1 if set."],
      ["Why is c · (n − c) the contribution per bit?", "A pair differs at that bit exactly when one number has it and the other does not: c choices times n − c choices."],
    ],
    revise: md`
? Kernighan popcount? :: x &= x − 1 per set bit.
? Counting bits DP? :: bits[i] = bits[i >> 1] + (i & 1).
? Total Hamming distance? :: Σ over bits of c·(n − c).
? Flips to convert a to b? :: popcount(a ^ b).
`,
    pitfalls: ["O(n²) pair loops for Hamming sums", "Negative numbers in Python popcount (mask first)"],
    quiz: [Q("Total Hamming distance of [4,14,2]?", ["4", "*6", "8", "2"], "Pairwise distances 2 + 2 + 2.")],
    sources: [S.article("Hamming weight", "Wikipedia", "https://en.wikipedia.org/wiki/Hamming_weight"), S.article("Bit Twiddling Hacks (counting bits)", "Stanford", "https://graphics.stanford.edu/~seander/bithacks.html#CountBitsSetKernighan")],
    problems: [191, 338, 477, 461, 2220, 1318, 1835],
  },

  // ─────────────── maths ───────────────
  "gcd-primes": {
    blurb: "Euclid's GCD and why it is fast, LCM without overflow, primality by trial division, the sieve of Eratosthenes, and prime factorisation for divisor problems.",
    signals: ["Divisibility, common divisors, fractions to simplify", "Count or list primes up to n", "Factorise numbers, count divisors"],
    lesson: md`
## GCD

gcd(a, b) = gcd(b, a mod b), gcd(a, 0) = a. **O(log min(a, b))**: every two steps the larger number at least halves (Lamé's theorem ties the worst case to Fibonacci numbers).

lcm(a, b) = a / gcd(a, b) × b (divide first to avoid overflow).

Extended Euclid finds x, y with ax + by = gcd(a, b): the basis of modular inverses and linear Diophantine equations.

Problems: **GCD of Strings** (LC 1071: str1 + str2 == str2 + str1, then the prefix of length gcd), **Water and Jug** (LC 365: target divisible by gcd and ≤ total, Bézout), **Fraction simplification**, **Max Points on a Line** (LC 149: normalise slopes by gcd).

## Primality

Trial division up to √n: O(√n). For many queries or large n, Miller–Rabin (probabilistic, deterministic with fixed bases for 64-bit) in O(k log³ n).

## Sieve of Eratosthenes

Mark multiples of each prime p starting at p²: O(n log log n). **Count Primes** (LC 204). A linear sieve (each composite crossed once by its smallest prime factor) also records spf[x], enabling O(log x) factorisation of every number up to n.

## Factorisation and divisors

- Trial division by primes up to √n; whatever remains > 1 is prime.
- Number of divisors: for n = ∏ pᵢ^eᵢ, d(n) = ∏ (eᵢ + 1); sum of divisors ∏ (pᵢ^(eᵢ+1) − 1)/(pᵢ − 1).
- Highly composite numbers have few divisors relative to their size (≤ 1344 divisors below 10⁹).

## Interview problems

- **Ugly Number II** (LC 264): three pointers merging 2·, 3·, 5· sequences.
- **Closest Primes in Range** (LC 2523): sieve then scan.
- **Count Good Numbers / Pow(x, n)**: see modular arithmetic.
- **Largest component by common factor** (LC 952): union numbers with their prime factors (DSU).
`,
    doubts: [
      ["Why is Euclid's algorithm logarithmic?", "If a ≥ b, then a mod b < a/2 (either b ≤ a/2, so the remainder is < b ≤ a/2, or b > a/2, so the remainder is a − b < a/2). So the first argument halves at least every two steps."],
      ["Why start crossing out at p² in the sieve?", "Smaller multiples kp with k < p have a smaller prime factor and were already crossed out by that prime."],
      ["Why is the sieve O(n log log n)?", "Prime p crosses out about n/p numbers; the sum of 1/p over primes up to n grows like log log n (Mertens)."],
    ],
    revise: md`
? Euclid recurrence and cost? :: gcd(a, b) = gcd(b, a mod b); O(log min).
? LCM safely? :: a / gcd(a, b) * b.
? Extended Euclid gives? :: x, y with ax + by = gcd(a, b).
? Primality by trial division? :: O(√n).
? Sieve complexity and start point? :: O(n log log n), start at p².
? Number of divisors from factorisation? :: ∏ (eᵢ + 1).
? Jug problem condition? :: target % gcd(x, y) == 0 and target ≤ x + y.
`,
    pitfalls: ["lcm overflow (multiply before dividing)", "Sieve memory for n = 10⁹ (use a segmented sieve)", "Floating-point slopes instead of gcd-normalised pairs"],
    quiz: [Q("Divisors of 72 = 2³·3²?", ["6", "*12", "9", "8"], "(3+1)(2+1).")],
    sources: [S.article("Euclidean algorithm for computing the GCD", "cp-algorithms", "https://cp-algorithms.com/algebra/euclid-algorithm.html"), S.article("Sieve of Eratosthenes", "cp-algorithms", "https://cp-algorithms.com/algebra/sieve-of-eratosthenes.html"), S.article("Linear sieve", "cp-algorithms", "https://cp-algorithms.com/algebra/prime-sieve-linear.html"), S.article("Primality tests (Miller–Rabin)", "cp-algorithms", "https://cp-algorithms.com/algebra/primality_tests.html")],
    problems: [204, 1071, 365, 149, 264, 2523, 952, 2427],
  },
  modular: {
    blurb: "Arithmetic modulo 10⁹ + 7: safe addition and multiplication, fast exponentiation, modular inverses via Fermat, and why the modulus is prime.",
    signals: ["\"Return the answer modulo 10⁹ + 7\"", "Huge exponents (x^n with n up to 10¹⁸)", "Division under a modulus (combinations)"],
    lesson: md`
## Rules

(a + b) mod m, (a − b + m) mod m, (a · b) mod m all reduce safely. **Division does not**: a / b mod m means a · b⁻¹ mod m, where b⁻¹ is the modular inverse (exists iff gcd(b, m) = 1).

Overflow: with m ≈ 10⁹, a · b reaches 10¹⁸, which fits in a signed 64-bit integer (≤ 9.2 · 10¹⁸) but not in 32 bits. In Java/C++ cast to long before multiplying.

Why 10⁹ + 7? It is prime (so every non-zero number has an inverse), and it is below 2³⁰, so the sum of two residues fits in a signed 32-bit int and the product of two fits in 64 bits.

## Fast exponentiation

x^n by repeated squaring: O(log n) multiplications.

\`\`\`
def power(x, n, m):
    r = 1; x %= m
    while n:
        if n & 1: r = r * x % m
        x = x * x % m; n >>= 1
    return r
\`\`\`

**Pow(x, n)** (LC 50) with floats: handle negative n with 1/x and n = −2³¹ carefully. **Super Pow** (LC 372): exponent given as digits: process digits with a^(10k + d) = (a^k)^10 · a^d.

## Modular inverse

- **Fermat** (m prime): b⁻¹ ≡ b^(m−2) mod m, via fast power.
- **Extended Euclid**: works for any m coprime with b.
- **Inverses of 1..n in O(n)**: inv[i] = −(m / i) · inv[m mod i] mod m.

## Combinations mod p

Precompute factorials and inverse factorials up to n: C(n, k) = n! · inv(k!) · inv((n − k)!) mod p. O(n) preprocessing, O(1) per query. For n ≥ p use Lucas' theorem.

## Matrix exponentiation

Linear recurrences (Fibonacci, tiling counts, state machines) in O(s³ log n) with modular matrix products.
`,
    doubts: [
      ["Why can't I just divide under a modulus?", "Modular arithmetic has no fractions; '÷ b' must be multiplication by an element that undoes multiplication by b. That inverse exists only if b and m are coprime, which is why moduli are chosen prime."],
      ["Why does Fermat give the inverse?", "Fermat's little theorem: b^(p−1) ≡ 1 (mod p) for prime p and b not divisible by p. So b · b^(p−2) ≡ 1."],
      ["When does a·b overflow?", "With residues below 10⁹ + 7, a·b < 1.02·10¹⁸, safe in signed 64-bit but not 32-bit. In C++ and Java convert to long long / long before multiplying."],
    ],
    revise: md`
? Modular subtraction? :: (a − b + m) % m.
? Why 10⁹ + 7? :: Prime; sums fit 32-bit, products fit 64-bit.
? Fast power complexity? :: O(log n).
? Inverse modulo a prime? :: b^(p−2) mod p (Fermat).
? Inverse modulo non-prime? :: Extended Euclid (needs gcd = 1).
? C(n, k) mod p fast? :: Precomputed factorials and inverse factorials.
? n ≥ p? :: Lucas' theorem.
`,
    pitfalls: ["32-bit multiplication overflow", "Negative results after subtraction", "Dividing directly under a modulus", "n = −2³¹ in Pow(x, n)"],
    quiz: [Q("Inverse of 3 modulo 7?", ["3", "*5", "2", "6"], "3·5 = 15 ≡ 1 (mod 7).")],
    sources: [S.article("Binary exponentiation", "cp-algorithms", "https://cp-algorithms.com/algebra/binary-exp.html"), S.article("Modular multiplicative inverse", "cp-algorithms", "https://cp-algorithms.com/algebra/module-inverse.html"), S.article("Fermat's little theorem", "Wikipedia", "https://en.wikipedia.org/wiki/Fermat%27s_little_theorem")],
    problems: [50, 372, 1922, 1863, 1569],
  },
  combinatorics: {
    blurb: "Counting without enumerating: permutations, combinations, stars and bars, Catalan numbers, inclusion–exclusion and the pigeonhole principle.",
    signals: ["Number of ways to choose or arrange (with a closed form)", "Grid paths, balanced parentheses, BST shapes", "\"At least one\" conditions (complement or inclusion–exclusion)"],
    lesson: md`
## Basics

- Permutations of n distinct items: n!. Arrangements of k from n: n!/(n − k)!.
- Combinations: C(n, k) = n! / (k!(n − k)!). Pascal: C(n, k) = C(n − 1, k − 1) + C(n − 1, k), so a Pascal triangle table gives all C up to n in O(n²) without division (LC 118, 119).
- Multisets: n!/(c₁! c₂! …) arrangements of a word with repeated letters.
- **Stars and bars**: distribute n identical items into k bins: C(n + k − 1, k − 1) (non-empty bins: C(n − 1, k − 1)).
- Grid paths from (0, 0) to (R, C) moving right/down: C(R + C, R).

## Catalan numbers

C(n) = C(2n, n)/(n + 1): 1, 1, 2, 5, 14, 42, … Counts balanced parentheses strings (LC 22 count), BST shapes (LC 96), triangulations of polygons, Dyck paths, ways to multiply a chain of matrices. Recurrence C(n) = Σ C(i) C(n − 1 − i).

## Inclusion–exclusion

|A ∪ B ∪ C| = |A| + |B| + |C| − |A∩B| − |A∩C| − |B∩C| + |A∩B∩C|. Uses: numbers ≤ n divisible by any of a set (Ugly Number III, LC 1201, with binary search), derangements, counting surjections.

**Complement counting**: "at least one" = total − "none".

## Pigeonhole principle

n + 1 items in n boxes force a collision. Powers proofs like "Find the Duplicate Number must have a duplicate", "among any n + 1 prefix sums mod n two are equal" (a subarray with sum divisible by n always exists).

## Probability and expectation (name-level)

Linearity of expectation: E[sum] = sum of E, even for dependent variables. "Expected number of fixed points of a random permutation is 1." Useful for randomised algorithm analysis.

## Large values

Use factorials mod p with inverses (see modular arithmetic) or Pascal's triangle with mod.
`,
    doubts: [
      ["Why is stars and bars C(n + k − 1, k − 1)?", "Line up n stars and k − 1 bars; each arrangement splits stars into k bins. Choose the bar positions among n + k − 1 slots."],
      ["Where does the Catalan recurrence come from?", "For balanced parentheses, the first '(' matches some ')'; inside are i pairs and after are n − 1 − i pairs, independent of each other."],
    ],
    revise: md`
? C(n, k) without division? :: Pascal's triangle.
? Stars and bars (possibly empty bins)? :: C(n + k − 1, k − 1).
? Grid paths R × C? :: C(R + C, R).
? Catalan formula? :: C(2n, n)/(n + 1).
? Things counted by Catalan? :: Balanced parentheses, BST shapes, triangulations, Dyck paths.
? 'At least one' trick? :: Total − none.
? Pigeonhole application to subarrays? :: Among n + 1 prefix sums mod n, two are equal.
`,
    pitfalls: ["Factorials overflowing without mod", "Double counting in inclusion–exclusion signs"],
    quiz: [Q("Number of structurally unique BSTs with 4 nodes?", ["8", "*14", "16", "24"], "Catalan(4).")],
    sources: [S.article("Binomial coefficients", "cp-algorithms", "https://cp-algorithms.com/combinatorics/binomial-coefficients.html"), S.article("Catalan numbers", "cp-algorithms", "https://cp-algorithms.com/combinatorics/catalan-numbers.html"), S.article("Inclusion–exclusion principle", "cp-algorithms", "https://cp-algorithms.com/combinatorics/inclusion-exclusion.html"), S.article("Stars and bars", "cp-algorithms", "https://cp-algorithms.com/combinatorics/stars_and_bars.html")],
    problems: [62, 118, 119, 96, 1201, 1359, 2400],
  },
  geometry: {
    blurb: "Points, lines and polygons with integers only: cross products for orientation, segment intersection, polygon area (shoelace), convex hull, and Max Points on a Line.",
    signals: ["Collinearity, orientation, turns", "Area of a polygon from coordinates", "Smallest enclosing shape, rectangles from points"],
    lesson: md`
## Cross product orientation

For points A, B, C: cross = (B − A) × (C − A) = (Bx − Ax)(Cy − Ay) − (By − Ay)(Cx − Ax). Positive: counter-clockwise turn; negative: clockwise; zero: collinear. All integer arithmetic: no floating point.

## Uses

- **Segment intersection**: segments AB and CD intersect iff the orientations of (A, B, C) and (A, B, D) differ and those of (C, D, A) and (C, D, B) differ (plus collinear special cases).
- **Polygon area (shoelace)**: area = |Σ (xᵢ yᵢ₊₁ − xᵢ₊₁ yᵢ)| / 2.
- **Point in polygon**: ray casting (count crossings) or winding number.
- **Convex hull**: Andrew's monotone chain (sort by x, build lower and upper hulls with cross-product checks): O(n log n). Erect the Fence (LC 587) keeps collinear boundary points.

## Interview problems

- **Max Points on a Line** (LC 149): for each anchor, count other points by normalised slope (dy/g, dx/g with a sign convention); avoid floats. O(n²).
- **Valid Boomerang** (LC 1037): cross product ≠ 0.
- **Minimum Area Rectangle** (LC 939): hash set of points; for each diagonal pair, check the other two corners.
- **Rectangle Overlap** (LC 836), **Rectangle Area** (LC 223): overlap = max(0, min of rights − max of lefts) per axis.
- **Check if it is a straight line** (LC 1232).
- **K closest points**: distance comparisons with squared values.

## Floating point

When unavoidable, compare with an epsilon and prefer formulations that avoid division (cross products instead of slopes, squared distances instead of distances).
`,
    doubts: [
      ["Why normalise slopes by gcd instead of using dy/dx floats?", "Floating-point division loses precision: two different slopes can round to the same double and equal slopes can differ in the last bit. A reduced (dy, dx) pair with a sign convention is exact."],
      ["What does the sign of the cross product mean?", "It is twice the signed area of triangle ABC: positive when C is to the left of the directed line A→B (counter-clockwise), negative to the right, zero on the line."],
    ],
    revise: md`
? Orientation test? :: Sign of (B − A) × (C − A).
? Shoelace area? :: |Σ (xᵢyᵢ₊₁ − xᵢ₊₁yᵢ)| / 2.
? Convex hull algorithm? :: Andrew's monotone chain, O(n log n).
? Max points on a line slope key? :: Reduced (dy, dx) with a sign convention.
? Rectangle overlap per axis? :: max(0, min(right) − max(left)).
`,
    pitfalls: ["Floating-point slopes", "Vertical lines (dx = 0) and duplicates", "Collinear points on hull boundaries"],
    quiz: [Q("A=(0,0), B=(1,0), C=(0,1): orientation?", ["clockwise", "*counter-clockwise", "collinear", "undefined"], "Cross = 1·1 − 0·0 = 1 > 0.")],
    sources: [S.article("Oriented area of a triangle", "cp-algorithms", "https://cp-algorithms.com/geometry/oriented-triangle-area.html"), S.article("Convex hull: monotone chain", "cp-algorithms", "https://cp-algorithms.com/geometry/convex-hull.html"), S.article("Check if two segments intersect", "cp-algorithms", "https://cp-algorithms.com/geometry/check-segments-intersection.html"), S.article("Shoelace formula", "Wikipedia", "https://en.wikipedia.org/wiki/Shoelace_formula")],
    problems: [149, 1037, 939, 836, 223, 1232, 587, 973],
  },
  randomized: {
    blurb: "Fisher–Yates shuffle, reservoir sampling for streams, weighted random picks with prefix sums, rejection sampling, and randomised algorithms like quickselect.",
    signals: ["Shuffle uniformly", "Pick a random element from a stream of unknown length", "Random pick with weights", "Generate rand10 from rand7"],
    lesson: md`
## Fisher–Yates shuffle (LC 384)

for i from n − 1 down to 1: swap a[i] with a[randint(0, i)]. Every permutation has probability 1/n!. The common bug, swapping with randint(0, n − 1) every time, gives n^n equally likely sequences, which cannot map evenly onto n! permutations: biased.

## Reservoir sampling (LC 382, 398)

Pick one item uniformly from a stream of unknown length: keep the i-th item with probability 1/i. By induction each item ends up selected with probability 1/n. For k items: keep the first k, then replace a random slot with probability k/i.

## Weighted random pick (LC 528)

Prefix sums of weights; draw r uniformly in [1, total]; binary search the first prefix ≥ r. O(log n) per pick. For O(1) picks after O(n) setup, the **alias method** (Vose).

## Rejection sampling (LC 470)

rand10 from rand7: v = (rand7() − 1)·7 + rand7() gives uniform 1..49; accept if ≤ 40 and return (v − 1) % 10 + 1, otherwise retry. Expected calls ≈ 2.45. Random point in a circle (LC 478): sample in the square, reject outside; or use r = R√u with a random angle (the square root is needed for uniform density).

## Randomised algorithms

- **Las Vegas** (always correct, random time): randomised quicksort and quickselect, treaps.
- **Monte Carlo** (fixed time, may be wrong with small probability): Miller–Rabin, Freivalds' matrix check, Karger's min cut, Bloom filters.
- **Hashing with random seeds** to defeat adversarial inputs.

## Insert Delete GetRandom O(1) (LC 380)

Array + hash map from value to index; delete by swapping with the last element. See randomised sets.
`,
    doubts: [
      ["Why is the naive shuffle biased?", "It produces n^n equally likely swap sequences. n! does not divide n^n for n ≥ 3, so some permutations must occur more often than others."],
      ["Why does reservoir sampling give 1/n?", "Item i is chosen with probability 1/i and then survives each later step j with probability 1 − 1/j. The product telescopes: (1/i)·(i/(i+1))·…·((n−1)/n) = 1/n."],
      ["Why √u for a random radius?", "Area grows with r², so choosing r uniformly crowds points near the centre. r = R√u makes the area below r uniform."],
    ],
    revise: md`
? Fisher–Yates loop? :: i from n−1 down; swap with random index in [0, i].
? Reservoir sampling rule? :: Keep the i-th item with probability 1/i (k/i for k items).
? Weighted pick? :: Prefix sums + binary search (alias method for O(1)).
? rand10 from rand7? :: Uniform 1..49, accept ≤ 40, retry otherwise.
? Uniform point in a circle? :: r = R√u, angle uniform (or rejection from the square).
? Las Vegas vs Monte Carlo? :: Always correct with random time vs fixed time with small error.
`,
    pitfalls: ["Swapping with any index in shuffle", "Uniform radius in circle sampling", "Modulo bias when mapping random ranges"],
    quiz: [Q("Reservoir sampling keeps the 5th item with probability…", ["1/2", "*1/5", "1/4", "5/n"], "1/i at step i.")],
    sources: [S.article("Fisher–Yates shuffle", "Wikipedia", "https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle"), S.article("Reservoir sampling", "Wikipedia", "https://en.wikipedia.org/wiki/Reservoir_sampling"), S.article("Alias method", "Wikipedia", "https://en.wikipedia.org/wiki/Alias_method"), S.article("Rejection sampling", "Wikipedia", "https://en.wikipedia.org/wiki/Rejection_sampling")],
    problems: [384, 382, 398, 528, 470, 478, 380, 710],
  },
};
