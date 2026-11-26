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
## What greedy means

A greedy algorithm builds a solution by repeatedly making the choice that looks best **right now**, and never reconsidering it. It is fast (often a sort plus a scan) and short. It is also often **wrong**: a locally best choice can rule out a globally better solution. The skill is not writing greedy code but knowing when the greedy choice is safe, and proving it.

Greedy is correct when the problem has:

- the **greedy-choice property**: some optimal solution begins with the greedy choice; and
- **optimal substructure**: after making that choice, the rest is a smaller instance of the same problem.

DP has optimal substructure too, but it tries every choice; greedy commits to one. Greedy is DP where you can prove the max or min is always achieved by one specific option.

## Proof technique 1: exchange argument

Take any optimal solution O that differs from the greedy solution G. Find the first place where they differ and show you can **swap** O's choice for G's choice without making O worse. Repeating the swap transforms O into G with no loss, so G is optimal.

Example, **minimise maximum lateness** (jobs with durations and deadlines, one machine): greedy schedules by earliest deadline. In any schedule with an "inversion" (a job with a later deadline immediately before one with an earlier deadline), swapping the two adjacent jobs does not increase the maximum lateness: the job moved later finishes when the pair used to finish, and its deadline is the later one. Removing all inversions yields the earliest-deadline order.

Example, **Assign Cookies** (LC 455): give the smallest sufficient cookie to the least greedy child. If an optimal assignment gives that child a bigger cookie, swap cookies with whoever got the smaller one; both remain satisfied.

## Proof technique 2: greedy stays ahead

Show by induction that after each step, greedy's partial solution is **at least as good** as any other solution's after the same number of steps, measured by some quantity.

Example, **interval scheduling** (maximise non-overlapping intervals): pick by earliest end time. Claim: greedy's k-th interval ends no later than the k-th interval of any other valid selection. Induction: if greedy's (k − 1)-th ends no later, then the other solution's k-th interval is still available to greedy, and greedy picks the one ending earliest among available ones. So greedy never falls behind, and can always fit at least as many intervals.

## Proof technique 3: structural bound

Show a lower (or upper) bound that every solution must satisfy, then show greedy achieves it. Example: the minimum number of meeting rooms is at least the maximum number of meetings overlapping at any instant; greedy (assign to any free room, sorted by start) uses exactly that many.

## Checking with counterexamples

Before proving, try to break the greedy on small inputs (n ≤ 4), especially:

- **Coin change** with {1, 3, 4} and amount 6: largest-first gives 4 + 1 + 1 (3 coins), optimal 3 + 3.
- **0/1 knapsack by value/weight ratio**: W = 50, items (10, 60), (20, 100), (30, 120): ratio-first gives 160, optimal 220.
- **Interval scheduling by shortest duration** or by earliest start: easy counterexamples exist.
- **Longest path by always taking the heaviest edge**.

A quick brute force on random small inputs is the most reliable check when you are unsure.

## Classic greedy problems

| Problem | Greedy rule | Why |
|---|---|---|
| Activity selection / Non-overlapping Intervals (LC 435) | earliest end | stays ahead |
| Minimum Arrows to Burst Balloons (LC 452) | sort by end, shoot at the end | stays ahead |
| Jump Game (LC 55, 45) | farthest reach | stays ahead |
| Gas Station (LC 134) | restart after a negative tank | elimination argument |
| Candy (LC 135) | two passes (left-to-right, right-to-left), take the max | each pass enforces one side's constraint minimally |
| Partition Labels (LC 763) | extend to the last occurrence of each letter | a piece must contain all occurrences |
| Huffman coding | merge the two smallest | exchange |
| Fractional knapsack | best ratio first | exchange |
| Minimum spanning tree (Kruskal, Prim) | lightest safe edge | cut property |
| Dijkstra | closest unsettled vertex | stays ahead |
| Task scheduling by deadline (lateness) | earliest deadline | exchange |
| Boats to Save People (LC 881) | pair heaviest with lightest | exchange |
| Two City Scheduling (LC 1029) | sort by cost difference | exchange |
| Remove K Digits (LC 402) | remove a digit when the next is smaller (monotonic stack) | prefix dominance |

**Candy** in detail: each child must get more candies than a neighbour with a higher rating. Left-to-right pass: if rating[i] > rating[i − 1], candy[i] = candy[i − 1] + 1 (else 1). Right-to-left pass: if rating[i] > rating[i + 1], candy[i] = max(candy[i], candy[i + 1] + 1). Each pass gives the minimum satisfying one direction; taking the max satisfies both and stays minimal.

## Matroids (name-level)

A **matroid** is a set system where independent sets are closed under subsets and satisfy the exchange property (from a smaller independent set you can always add an element of a larger one). For any matroid, the greedy "add the heaviest element that keeps the set independent" finds the maximum-weight independent set (Rado–Edmonds theorem). Forests in a graph form a matroid (graphic matroid), which is why Kruskal works; linearly independent vectors form one too (XOR basis greedy). Saying "this is a matroid, so greedy is optimal" is a strong theoretical answer.

## Interview habit

1. State the greedy rule in one sentence.
2. Give the proof idea (exchange, stays ahead, or bound) in two or three sentences.
3. Mention a counterexample to a tempting wrong rule.
4. Give the complexity (usually O(n log n) for the sort).

## Connections

DP is the fallback when the greedy choice is unsafe; heaps implement "best available now" greedies; sorting provides the order most greedies need.
`,
    doubts: [
      ["How do I know if greedy will work?", "Try to prove it with an exchange argument, and try to break it with small counterexamples (2–4 items). If you cannot prove it and a counterexample appears, switch to DP."],
      ["Why does Candy need two passes?", "Each child must have more candy than a lower-rated neighbour on either side. One left-to-right pass satisfies the left neighbour rule; a right-to-left pass the right rule; the max of both satisfies both with the minimum total."],
      ["Is 'sort, then do the obvious thing' always greedy?", "Usually, yes, and the sort key is the claim you must justify. Many interview greedies are one sort plus one pass: O(n log n)."],
      ["How do I find the right greedy rule when several seem plausible?", "List candidate rules (earliest start, earliest end, shortest, largest ratio…), test each on tiny hand-made counterexamples or a brute-force comparison, and keep the survivor. Then look for the exchange or stays-ahead argument that explains why it survives."],
      ["Is a greedy with a heap still \"greedy\"?", "Yes: the heap just finds the locally best choice quickly (Huffman, Dijkstra, IPO). The correctness question is the same: is taking the current best always safe?"],
      ["What if I cannot prove the greedy in the interview?", "Say so, give the intuition, and check small cases. If doubts remain, offer the DP as a safe fallback with its complexity; interviewers value the awareness more than an unjustified claim."],
    ],
    revise: md`
? Exchange argument? :: Swap an optimal solution's choice for the greedy one without making it worse.
? Greedy stays ahead? :: Induction: after each step greedy is at least as good as any partial solution.
? Interval scheduling rule? :: Earliest end time first.
? Two City Scheduling sort key? :: cost_A − cost_B.
? Candy? :: Two passes, take the max.
? Largest Number comparator? :: a + b > b + a.
? Partition Labels? :: Extend the part to the last occurrence of each character.
? Greedy vs DP relation? :: Greedy is DP where one option provably always attains the optimum.
? Earliest-deadline proof? :: Swapping an adjacent inversion never increases maximum lateness.
? Structural-bound technique example? :: Rooms ≥ maximum overlap; greedy achieves it.
? Rado–Edmonds? :: On a matroid, heaviest-first greedy is optimal.
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
## Reachability greedies

A family of array problems asks how far you can get, or in how few steps, when each position offers a range of next positions (jumps, fuel, intervals). The greedy idea is always the same: **keep the farthest point reachable so far** and update it as you scan. Because the reachable set is an interval [0, farthest], one number describes it, and a single left-to-right pass suffices.

## Jump Game (LC 55)

nums[i] is the maximum jump length from i. Can you reach the last index?

Scan i from 0; maintain farthest = max over visited j of j + nums[j]. If at some point i > farthest, index i is unreachable, and so is everything after it: return false. Otherwise return true.

\`\`\`python
def can_jump(nums):
    far = 0
    for i, x in enumerate(nums):
        if i > far: return False
        far = max(far, i + x)
    return True
\`\`\`

Why one number suffices: if index j is reachable, every index between 0 and j is reachable too (from any position you can jump fewer steps), so the reachable set is always a prefix.

Backward version: lastGood = n − 1; scan from the right; if i + nums[i] ≥ lastGood, set lastGood = i. Answer lastGood == 0.

## Jump Game II (LC 45): minimum jumps

Think of it as BFS by levels on the array: level 0 is index 0; level k is the set of indices reachable with exactly k jumps but not fewer, and each level is a contiguous range. Track the end of the current level (curEnd) and the farthest point reachable from it (far). When i reaches curEnd, you must jump: jumps += 1, curEnd = far.

\`\`\`python
def jump(nums):
    jumps = cur_end = far = 0
    for i in range(len(nums) - 1):          # no jump needed from the last index
        far = max(far, i + nums[i])
        if i == cur_end:
            jumps += 1; cur_end = far
    return jumps
\`\`\`

O(n) time, O(1) space. The loop stops before the last index; otherwise reaching it exactly at a level boundary would count one extra jump.

## Gas Station (LC 134)

Stations in a circle; gas[i] fuel available at i, cost[i] to drive to i + 1. Find the start that completes the circuit (unique if it exists).

1. If Σ gas < Σ cost, return −1: no start can work.
2. Otherwise scan with a running tank; whenever the tank goes negative after station i, set start = i + 1 and reset the tank to 0.

Why skipping is safe: if starting at s you run out after station i, then starting at any station k between s and i also fails before i + 1, because arriving at k from s you had a non-negative tank, so starting fresh at k gives no more fuel at any later point. Why the final start works: the total surplus is non-negative, and the deficit of the prefix before start is covered by the surplus after it.

## Covering a range with intervals

**Video Stitching** (LC 1024), **Minimum Number of Taps to Open to Water a Garden** (LC 1326): choose the fewest intervals covering [0, T].

Convert to "farthest reach from each start": reach[s] = the maximum end among intervals starting at s (for taps, each tap covers [i − r, i + r], clipped at 0). Then it is Jump Game II over positions: scan s from 0, tracking the farthest end among intervals starting at or before the current boundary; when s passes the current coverage end, you must add an interval; if far does not extend beyond s, the gap cannot be covered (−1).

Equivalently, sort intervals by start and repeatedly pick, among those starting ≤ the current covered point, the one ending farthest.

## Minimum Number of Refuelling Stops (LC 871)

Drive as far as fuel allows. Every station you pass goes into a max-heap of fuel amounts. When you cannot reach the next station (or the target), refuel retroactively from the largest station passed (pop the heap): each pop is a stop. If the heap is empty while stuck, return −1. Exchange argument: if you must stop somewhere among the stations passed, the biggest one is always at least as good.

## Variants that need more than greedy

- **Jump Game III** (LC 1306): jumps of exactly ±nums[i]: reachability is a graph search (BFS/DFS), not a prefix.
- **Jump Game IV** (LC 1345): jumps to neighbours or to equal values: BFS with value buckets cleared after use.
- **Jump Game V** (LC 1340): jumps over lower bars within distance d: DP in order of height.
- **Jump Game VI** (LC 1696): maximise the score with jumps up to k: DP with a monotonic deque.
- **Jump Game VII** (LC 1871): jumps within [minJump, maxJump] onto '0' cells: BFS with a sliding pointer or prefix sums of reachable cells.
- **Frog Jump** (LC 403): next jump depends on the last jump length: DP over (stone, last jump).
- **Minimum cost** to reach the end with varying costs: DP or Dijkstra.

The test: if reachable positions always form a prefix and every position is equally good once reached, greedy works; otherwise search or DP.

## Interview angles

- Explain why the reachable set is an interval.
- For Jump Game II, explain the BFS-level view and the loop bound n − 1.
- For Gas Station, give both checks (total feasibility and the skip argument).

## Connections

Interval covering is the same scan; BFS levels explain minimum jumps; heaps add the "refuel retroactively" twist.
`,
    doubts: [
      ["Why can Gas Station skip directly to i + 1 after a failure?", "Any start s in [start, i] reaches i with a tank no larger than the one starting at start (which was non-negative at every earlier point). So starting later inside that range cannot fix the deficit at i."],
      ["Why is Jump Game II a BFS?", "All indices reachable with k jumps form a contiguous range, and the next range is everything reachable from it. Scanning ranges level by level is BFS without a queue."],
      ["Why is the Gas Station answer unique when it exists?", "The problem guarantees uniqueness, and the algorithm finds the start just after the point where the running tank is at its global minimum; starting there keeps every prefix sum non-negative. If two starts worked, the circuit would have zero total surplus with ties, which the problem rules out."],
      ["Can Jump Game II be solved with DP?", "Yes: dp[i] = 1 + min over j < i with j + nums[j] ≥ i of dp[j], which is O(n²) (or better with structures). The greedy BFS is O(n) because levels are contiguous ranges."],
      ["What if jumps can also go backwards (± nums[i])?", "Then the reachable set is no longer a prefix, so the single \"farthest\" number loses information. Use BFS or DFS over indices (Jump Game III)."],
    ],
    revise: md`
? Jump Game? :: Track reach; fail if i > reach.
? Jump Game II? :: Level ranges: jumps when passing the current range's end, extend to farthest.
? Gas Station feasibility? :: total gas ≥ total cost.
? Gas Station start? :: Reset start to i + 1 whenever the tank goes negative.
? Taps / video stitching? :: Intervals + jump-game-II greedy.
? Refuelling stops? :: Max-heap of passed stations; refuel when stuck.
? Jump Game II loop bound? :: Stop before the last index to avoid an extra jump.
? Taps / Video Stitching conversion? :: reach[start] = farthest end, then the Jump Game II scan.
? Refuelling stops greedy? :: Max-heap of passed stations; pop when stuck.
? When does reach-greedy fail? :: When reachable positions are not a prefix or positions differ in value (use BFS/DP).
`,
    pitfalls: ["O(n²) DP for jump game", "Missing the total gas check", "Off-by-one when converting taps to intervals"],
    quiz: [Q("Jump Game II on [2,3,1,1,4]: minimum jumps?", ["1", "*2", "3", "4"], "0 → 1 → 4.")],
    sources: [S.article("Greedy algorithm", "Wikipedia", "https://en.wikipedia.org/wiki/Greedy_algorithm"), S.book("Algorithms, chapter 4: Greedy Algorithms", "Jeff Erickson", "https://jeffe.cs.illinois.edu/teaching/algorithms/book/04-greedy.pdf")],
    problems: [55, 45, 134, 1024, 1326, 871, 1306],
  },
  "greedy-heap": {
    blurb: "Greedy choices that need the best remaining option at every step: Huffman coding, merging ropes or stones, reorganising strings, IPO and course scheduling.",
    signals: ["Repeatedly combine the two smallest / largest", "Pick the best available option among those unlocked so far", "Arrange items so equal ones are not adjacent"],
    lesson: md`
## "Best available now" with a heap

Many greedy algorithms repeatedly take the best option among those currently available, where the set of options changes as you go: items become available (unlocked by capital, time or position), or chosen items produce new items (merged nodes, decremented counts). A heap returns the best option in O(log n) and absorbs new ones in O(log n), so these greedies run in O(n log n).

The correctness question is the same as for every greedy: is taking the current best always safe? Usually an exchange argument shows it is.

## Huffman coding (1952)

Build an optimal prefix-free binary code for symbols with frequencies: frequent symbols get short codes.

1. Put every symbol in a min-heap keyed by frequency.
2. Repeatedly pop the two smallest, create a parent whose frequency is their sum, and push it back.
3. When one node remains, it is the root; a symbol's code is its root-to-leaf path (left = 0, right = 1).

The total encoded length Σ freq × depth is minimal. **Why merging the two smallest is optimal**: in some optimal tree, the two least frequent symbols are siblings at the deepest level (exchange: if a more frequent symbol were deeper, swapping it with a shallower rarer one would not increase the cost). Merging them reduces the problem to one with a combined symbol of the summed frequency, and induction finishes it.

Cost: O(n log n). Same algorithm: **Minimum Cost to Connect Sticks** (LC 1167): merging sticks a and b costs a + b; always merge the two shortest. Also optimal merge order of sorted files (k-way merge cost).

## Reorganize String (LC 767)

Rearrange so no two adjacent characters are equal.

Feasibility: the most frequent character must appear at most ⌈n/2⌉ times (it needs a different character between consecutive copies).

Greedy with a max-heap of (count, char): each step, pop the most frequent character that is not the one just placed (pop two, place the top, and hold the second back if needed), decrement, and push back while counts remain. Taking the most frequent available character first prevents it from piling up at the end.

Alternative O(n): place the most frequent character at even indices 0, 2, 4, …, then fill the remaining even and odd slots with the other characters in any order.

**Rearrange String k Distance Apart** (LC 358): a max-heap plus a cooldown queue: a used character waits in the queue for k steps before returning to the heap. **Task Scheduler** (LC 621) is the same with idle slots allowed.

**Longest Happy String** (LC 1405): at most two equal letters in a row: take the most frequent letter unless it would make three in a row, then the second most frequent.

## Unlock then choose

Items become available over time; among available ones, take the best.

- **IPO** (LC 502): projects unlock when capital ≥ their requirement. Sort by capital (or a min-heap), push newly affordable projects into a max-heap of profits, take the best up to k times.
- **Maximum Performance of a Team** (LC 1383): sort engineers by efficiency descending; the current engineer is the team's minimum efficiency; keep the k − 1 best speeds seen so far plus the current one via a min-heap (drop the smallest speed when the size exceeds k).
- **Course Schedule III** (LC 630): sort by deadline; take each course; if the total time exceeds the deadline, drop the longest course taken (max-heap).
- **Single-Threaded CPU** (LC 1834), **Process Tasks Using Servers** (LC 1882): simulation with "available" heaps.
- **Furthest Building You Can Reach** (LC 1642): use ladders on the largest climbs, kept in a min-heap of size ladders.
- **Minimum Number of Refuelling Stops** (LC 871): retroactive choice of the biggest station passed.

## Last Stone Weight (LC 1046)

Repeatedly smash the two heaviest stones; push back the difference if non-zero. A max-heap simulation, O(n log n). (Last Stone Weight II, which asks for the minimum possible final weight over all smash orders, is a subset-sum DP: a reminder that "simulate greedily" and "optimise over choices" are different problems.)

## More heap greedies

- **Maximum Score From Removing Stones** (LC 1753): take from the two largest piles each time (or the closed form min(sum/2, sum − max)).
- **Minimum Deviation of an Array** (LC 1675): make every number as large as possible (double odds), then repeatedly halve the maximum (max-heap) while tracking the minimum.
- **Kth Smallest Prime Fraction** (LC 786), **Find K Pairs with Smallest Sums** (LC 373): lazily generated candidates in a heap.
- **Minimum cost to hire K workers** (LC 857): sort by wage/quality ratio, max-heap of qualities.

## Proof habit

For each heap greedy, answer: (1) what is "best" (the key), (2) why taking it now cannot hurt (exchange argument), (3) what becomes available afterwards. Writing those three lines before coding prevents most mistakes.

## Interview angles

- Name the heap key and the availability rule.
- For Huffman-like problems, say "merge the two smallest" and give the sibling exchange argument.
- Mention the O(n) alternative for Reorganize String.

## Connections

Heaps (top-k, scheduling), sorting-based greedies, and DP for the cases where the greedy fails (Last Stone Weight II).
`,
    doubts: [
      ["Why is Huffman's greedy optimal?", "In some optimal tree, the two least frequent symbols are siblings at maximum depth (swapping them there never increases the weighted length). Merging them reduces the problem to one with one fewer symbol, and induction finishes the proof."],
      ["Why must the most frequent character be ≤ ⌈n/2⌉ in Reorganise String?", "Equal characters need at least one other character between each pair, so k copies need k − 1 separators: k + (k − 1) ≤ n, i.e. k ≤ (n + 1)/2."],
      ["Is Huffman coding optimal among all codes?", "Among prefix-free codes that assign a whole number of bits to each symbol, yes. Arithmetic coding and ANS can beat it slightly by spending fractional bits per symbol, which matters when one symbol is very frequent (probability close to 1)."],
      ["Why does IPO not need to reconsider projects that were affordable earlier?", "Capital only grows (profits are non-negative), so once a project is affordable it stays affordable, and it waits in the profit heap. The best affordable project now is always at least as good to take as any other affordable one, by exchange."],
      ["How do I prove Course Schedule III's \"drop the longest\" rule?", "Among the courses taken so far (sorted by deadline), if the schedule overflows, removing any one course fixes it and keeps the count the same; removing the longest leaves the most slack for future courses, so no other choice can lead to taking more courses later."],
    ],
    revise: md`
? Huffman step? :: Merge the two smallest frequencies.
? Connect sticks? :: Same as Huffman: total cost of merges.
? Reorganise String feasibility? :: max count ≤ ⌈n/2⌉.
? Course Schedule III? :: Sort by deadline, max-heap durations, drop the longest when over.
? Max events attended? :: Sweep days; min-heap of end days.
? Huffman exchange fact? :: The two rarest symbols can be deepest siblings in some optimal tree.
? Reorganize String O(n)? :: Most frequent letter at even indices first, then fill the rest.
? Minimum Deviation? :: Double odds, then repeatedly halve the max (max-heap), tracking the min.
? Longest Happy String rule? :: Most frequent unless it makes three in a row; then the second.
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
## Sort first, then decide

Many greedy problems become obvious once the input is in the right order: after sorting, the best partner, the next item to take, or the right assignment is at a predictable position (an end of the array, the next pointer). The sort is usually the costliest part (O(n log n)), and the proof is an exchange argument showing that any out-of-order choice can be swapped without loss.

## Pairing

- **Array Partition** (LC 561): form n pairs maximising the sum of pair minimums. Sort and pair neighbours (take every other element). Exchange: pairing the two smallest together "wastes" the smallest element only against the second smallest, the least loss possible.
- **Boats to Save People** (LC 881): each boat holds at most two people within a weight limit. Sort; two pointers: the heaviest person always boards; add the lightest if they fit. Exchange: if the heaviest can share with anyone, it can share with the lightest, and swapping partners in any optimal solution keeps it valid.
- **Minimize Maximum Pair Sum** (LC 1877): sort, pair smallest with largest.
- **Assign Cookies** (LC 455): sort both; two pointers giving each child (least greedy first) the smallest cookie that satisfies them.
- **Max Number of K-Sum Pairs** (LC 1679): sort + two pointers, or a hash map.

## Assignment by capability

- **Most Profit Assigning Work** (LC 826): sort jobs by difficulty and workers by ability; sweep workers in increasing ability, advancing a pointer over jobs they can do and tracking the best profit so far. O((n + m) log).
- **Advantage Shuffle** (LC 870): maximise the number of indices where A beats B. Sort A; process B from largest to smallest (with original indices): if A's largest beats the current B value, use it; otherwise sacrifice A's smallest there. "Beat with the cheapest winning card, otherwise throw away the weakest card" (the Tian Ji horse-racing strategy).
- **Bag of Tokens** (LC 948): sort; play the smallest token face-up for a point when power allows; when stuck, trade a point for the largest token face-down. Track the best score.
- **Maximum Matching of Players With Trainers** (LC 2410): sort both, two pointers.
- **Minimum Number of Arrows / Non-overlapping Intervals**: sort by end (see interval scheduling).

## Ratio and difference orders

- **Fractional knapsack**: sort by value/weight, take greedily, split the last item.
- **Two City Scheduling** (LC 1029): 2n people to cities A and B, n each, minimise cost. Sort by cost_A − cost_B: the first n go to A (they gain most by going to A), the rest to B. Exchange: swapping an A-person with a B-person who has a smaller difference cannot reduce the total.
- **Minimum Initial Energy to Finish Tasks** (LC 1665): each task needs \`minimum\` energy to start and costs \`actual\`. Do tasks in decreasing order of (minimum − actual): tasks that need the largest "headroom" go first, while you still have the most energy.
- **Maximum units on a truck** (LC 1710): by units per box, descending.
- **Reducing dishes** (LC 1402): sort satisfaction descending; keep adding dishes while the running suffix sum stays positive.

## Reduction to sorting: custom orders

- **Largest Number** (LC 179): sort strings by the rule a + b > b + a; join; handle all zeros.
- **Queue Reconstruction by Height** (LC 406): sort by (height descending, k ascending), insert each person at index k: taller people are placed first and shorter people inserted later do not affect their counts.
- **Minimum Number of Removals to Make Mountain Array**: LIS from both sides (sorting-adjacent DP).
- **Car Fleet** (LC 853): sort cars by position descending; compute each car's time to the target; a car forms a new fleet if its time is greater than the current fleet's time.
- **Minimum moves to make array elements equal** (LC 462): sort, the median is optimal for Σ|x − m| (moving m toward the median never increases the sum, because as many points are on each side).
- **Meeting point / Best Meeting Point** (LC 296): medians per coordinate.

## Proving it

The standard proof: take an optimal solution that does not follow the sorted order. Find two adjacent decisions that are "out of order" relative to the greedy key, swap them, and show the objective does not get worse. Since every non-greedy solution can be transformed into the greedy one step by step, the greedy is optimal.

For ratio problems the swap computation makes the key obvious: for Two City Scheduling, swapping the cities of person i (in A) and person j (in B) changes the cost by (B_i − A_i) − (B_j − A_j); this is non-negative exactly when the differences are sorted, so sorting by A − B is the right key.

## Interview angles

- Say which order and why (one-line exchange argument).
- Two pointers after sorting is the common implementation.
- Watch out for tie-breaking (Queue Reconstruction, Largest Number).

## Connections

Interval greedies sort by end or start; heap greedies handle orders that change dynamically; custom comparators express unusual orders.
`,
    doubts: [
      ["Why pair the heaviest with the lightest in Boats?", "The heaviest person must ride with someone or alone. If anyone can share with them, the lightest can (smallest weight). Pairing the heaviest with someone heavier than necessary only wastes a lighter person who could pair with someone else."],
      ["Why the median for minimum total moves?", "The sum of absolute deviations is minimised at the median: moving the target past the median increases distance to more points than it decreases."],
      ["How do I derive the sort key for a pairwise exchange problem?", "Write the objective for two adjacent items in both orders (i before j, and j before i), subtract, and simplify. The sign of the difference usually depends on a single quantity per item (a ratio or a difference); sorting by it makes every adjacent pair ordered optimally."],
      ["Why does Queue Reconstruction insert taller people first?", "Each person's k counts only people at least as tall in front. Placing taller people first means that when a shorter person is inserted later at index k, exactly k taller-or-equal people are ahead, and inserting shorter people never changes the counts of taller ones."],
      ["Is the median always optimal for Σ|x − m|, even with an even count?", "Any point between the two middle values is optimal for an even count (the sum is flat there); for an odd count the middle element is the unique optimum."],
    ],
    revise: md`
? Boats rule? :: Sort; heaviest with lightest if they fit.
? Advantage shuffle rule? :: Win with the smallest winning card; else throw the smallest card.
? Minimum moves to equal elements (±1)? :: Move to the median.
? Profit assigning work? :: Sort jobs and workers; sweep with running best profit.
? Advantage Shuffle rule? :: Beat B's largest with A's largest if possible, else sacrifice A's smallest.
? Minimum Initial Energy order? :: Decreasing (minimum − actual).
? Car Fleet scan? :: Position descending; new fleet when time > current fleet time.
? Reducing Dishes? :: Sort descending, add while the running suffix sum stays positive.
`,
    pitfalls: ["Sorting by the wrong key", "Missing the binary search + greedy combination in assignment problems"],
    quiz: [Q("Boats with limit 3, people [3,2,2,1]: minimum boats?", ["2", "*3", "4", "1"], "[3], [2,1], [2].")],
    sources: [S.article("Greedy algorithm", "Wikipedia", "https://en.wikipedia.org/wiki/Greedy_algorithm"), S.book("Algorithms, chapter 4: Greedy Algorithms", "Jeff Erickson", "https://jeffe.cs.illinois.edu/teaching/algorithms/book/04-greedy.pdf")],
    problems: [881, 561, 1877, 826, 2071, 870, 1710, 462, 853],
  },

  // ─────────────── intervals ───────────────
  "merge-intervals": {
    blurb: "Sort by start, then merge whenever the next interval starts before the current one ends. Insert, merge, intersect and remove intervals with the boundary conventions stated.",
    signals: ["Overlapping ranges to combine", "Insert a new interval into a sorted list", "Total covered length or free time"],
    lesson: md`
## The basic problem

Given intervals [start, end], combine every group of overlapping intervals into one. After sorting by start, overlapping intervals are contiguous runs in the sorted order, so one pass merges them.

## Merge Intervals (LC 56)

\`\`\`python
def merge(intervals):
    intervals.sort(key=lambda x: x[0])
    out = []
    for s, e in intervals:
        if out and s <= out[-1][1]:            # overlaps (or touches) the last merged interval
            out[-1][1] = max(out[-1][1], e)    # max: the new one may be inside the old
        else:
            out.append([s, e])
    return out
\`\`\`

O(n log n) for the sort, O(n) for the scan.

Details that matter:

- **Touching intervals**: with s ≤ last end, [1, 2] and [2, 3] merge; with s < last end they do not. Decide from the problem (closed intervals usually merge when touching; half-open time slots usually do not).
- **max on the end**: [1, 10] followed by [2, 3] must keep end 10.
- **Why sort by start**: after sorting by start, any interval that overlaps the current merged block must come before any interval that does not (its start is ≤ the block's end, while a non-overlapping one starts after the end). Sorting by end does not give this property ([1, 10] can come after [2, 3] and still contain it).

## Insert Interval (LC 57)

The list is already sorted and non-overlapping; insert a new interval and merge as needed. Three phases in O(n):

1. Copy intervals that end before the new one starts.
2. Merge every interval that overlaps the new one: newStart = min(...), newEnd = max(...). Append the merged interval.
3. Copy the rest.

With binary search for the phase boundaries, finding the position is O(log n), but copying is still O(n) in an array. A balanced tree (or ordered map) of intervals makes each insertion O(log n + merged).

## Related problems

- **Non-overlapping Intervals** (LC 435): minimum removals = n − (maximum number of non-overlapping intervals, by earliest end).
- **Meeting Rooms** (LC 252): can one person attend all? Sort by start and check that each start ≥ the previous end.
- **Meeting Rooms II** (LC 253): rooms needed = maximum overlap (heap or sweep).
- **Interval List Intersections** (LC 986): two sorted lists; the intersection of the current pair is [max(starts), min(ends)] if non-empty; advance whichever interval ends first.
- **Employee Free Time** (LC 759): merge all employees' intervals, then report the gaps between merged intervals.
- **Remove Covered Intervals** (LC 1288): sort by start ascending and end descending; an interval is covered if its end ≤ the maximum end seen so far.
- **Summary Ranges** (LC 228): consecutive numbers into "a->b" ranges.
- **Missing Ranges** (LC 163): gaps between sorted numbers and the bounds.
- **Partition Labels** (LC 763): each letter defines an interval [first, last occurrence]; merge them and output the merged lengths.
- **Range Module** (LC 715) and **Data Stream as Disjoint Intervals** (LC 352): a dynamic set of disjoint intervals in an ordered map keyed by start: adding [l, r) finds neighbours with floor/ceiling, merges overlapping ones and removes them, inserts the union.
- **Count Integers in Intervals** (LC 2276): the same dynamic structure, keeping a running count of covered integers.

## Coordinate thinking

- Closed intervals [a, b] and [c, d] overlap iff a ≤ d and c ≤ b. For half-open [a, b) and [c, d): a < d and c < b. Writing the condition this way (instead of listing the cases where they do not overlap) avoids errors.
- The intersection is [max(a, c), min(b, d)] when non-empty; the union of two overlapping intervals is [min(a, c), max(b, d)].
- Sorting by start is for merging and for "does anything overlap"; sorting by end is for selecting the maximum number of disjoint intervals; events sorted by time (sweep) are for counting overlaps.

## Interview angles

- Ask whether touching intervals count as overlapping.
- Use max for the merged end; explain why sorting by start is necessary.
- For dynamic insertion, mention an ordered map of disjoint intervals.

## Connections

Sweep lines count overlaps; interval scheduling selects disjoint intervals; difference arrays handle many interval additions over a small coordinate range.
`,
    doubts: [
      ["Why sort by start rather than end for merging?", "With starts sorted, an interval can only overlap the current merged block or come after it, so a single running block suffices. Sorting by end does not guarantee that a later interval cannot start before the current block."],
      ["How do I handle a dynamic set of intervals?", "An ordered map keyed by start (TreeMap) lets you find neighbours with floor and ceiling in O(log n) and merge locally."],
      ["Can Merge Intervals be done without sorting?", "Not in general in O(n log n)-free time for arbitrary coordinates; with small integer coordinates you can mark coverage in an array (or a difference array) and read off runs in O(range). Otherwise sorting is needed to bring overlapping intervals together."],
      ["How do I merge intervals coming from a stream?", "Keep the merged set in an ordered map (start → end). For a new interval, look up the interval with the largest start ≤ new end, walk left while intervals overlap, remove them, and insert the union. Each interval is inserted and removed at most once: amortised O(log n)."],
      ["Why does Interval List Intersections advance the interval that ends first?", "Suppose a (from the first list) ends no later than b (from the second). Every later interval of the second list starts after b ends (each list is disjoint and sorted), hence after a ends, so a can intersect nothing more: it is finished. b, which extends further, may still intersect the next interval of the first list."],
    ],
    revise: md`
? Merge rule after sorting by start? :: next.start ≤ cur.end → cur.end = max(cur.end, next.end).
? Insert into sorted non-overlapping list? :: Before / overlapping (merge) / after: O(n).
? Remove covered intervals sort? :: Start asc, end desc.
? Free time? :: Merge all, then gaps.
? Dynamic intervals? :: Ordered map with floor/ceiling merging.
? Overlap test for closed intervals? :: a ≤ d and c ≤ b.
? Remove Covered Intervals sort? :: Start ascending, end descending; covered if end ≤ max end so far.
? Partition Labels as intervals? :: [first, last] per letter, merged.
? Dynamic disjoint intervals? :: Ordered map by start; floor/ceiling to find and merge neighbours.
`,
    pitfalls: ["Touching endpoints ambiguity", "Not taking max of ends (nested intervals)", "Sorting when the input is already sorted (Insert Interval)"],
    quiz: [Q("Merge [1,4], [2,3]:", ["[1,3]", "*[1,4]", "[[1,4],[2,3]]", "[2,4]"], "Nested: end is max(4, 3).")],
    sources: [S.article("Interval (mathematics)", "Wikipedia", "https://en.wikipedia.org/wiki/Interval_(mathematics)"), S.article("Sweep line algorithm", "Wikipedia", "https://en.wikipedia.org/wiki/Sweep_line_algorithm")],
    problems: [56, 57, 986, 1288, 759, 228, 352, 715],
  },
  "sweep-line": {
    blurb: "Turn intervals into +1/−1 events at their endpoints and sweep in order: maximum overlap, meeting rooms, car pooling, and the tie-breaking rule that decides touching intervals.",
    signals: ["Maximum number of simultaneous intervals", "Resource capacity over time (seats, rooms, passengers)", "Counting coverage at points"],
    lesson: md`
## The idea

Imagine a vertical line sweeping across the time (or x) axis. Instead of examining every point, you only stop at **events** where something changes: an interval starts, an interval ends, a point appears. Sorting the events and processing them in order with a small amount of state (a counter, a heap, an ordered set) answers questions about overlaps, coverage and maxima in O(n log n).

## Events and the running count

For "how many intervals overlap at the busiest moment" (Meeting Rooms II, Car Pooling, My Calendar III):

\`\`\`python
def max_overlap(intervals):
    events = []
    for s, e in intervals:
        events.append((s, 1))      # start
        events.append((e, -1))     # end
    events.sort()                  # at equal times, (t, -1) sorts before (t, 1): ends first
    cur = best = 0
    for _, d in events:
        cur += d; best = max(best, cur)
    return best
\`\`\`

**Tie order is a semantic decision**. Processing ends before starts at the same time treats intervals as half-open [s, e) (a meeting ending at 10 frees the room for one starting at 10). Processing starts first treats them as closed. Encode the choice in the sort key.

Variants:

- **Car Pooling** (LC 1094): events carry passenger counts (+p at pickup, −p at drop-off); check the running total never exceeds capacity. With positions ≤ 1000, a difference array replaces sorting.
- **My Calendar III** (LC 732): maximum overlap after each booking: an ordered map of time → delta, rescanned per booking (O(n²) total), or a dynamic segment tree.
- **Number of Flowers in Full Bloom** (LC 2251): for a query time t, the answer is (#starts ≤ t) − (#ends < t): two sorted arrays and two binary searches per query, no explicit sweep.
- **Describe the Painting** (LC 1943): sweep colour-sum changes and output segments between event points.
- **Minimum Interval to Include Each Query** (LC 1851): sort queries; sweep, adding intervals whose start ≤ query into a heap by length, removing those whose end < query.

## Points and intervals

- **Minimum Number of Arrows to Burst Balloons** (LC 452): sort by end; shoot at the first balloon's end; skip every balloon starting at or before that point; repeat. A sweep with one piece of state (the last arrow position).
- **Count points inside intervals**, or intervals containing each point: sort points and interval endpoints together, sweeping with a counter; or binary search on sorted starts and sorted ends as above.
- **Brightest Position on Street** (LC 2021): each lamp covers [p − r, p + r]; sweep +1/−1 events and track the position of the maximum.

## Sweeps with a structure

When the question is not just a count, keep the **active set** in a structure:

- **Skyline** (LC 218): active building heights in a max-heap (lazy removal) or a multiset; emit a key point whenever the maximum changes.
- **Rectangle Area II** (LC 850): sweep x; maintain the covered length on the y-axis with a segment tree over compressed y coordinates (cover counts per node); area += covered length × (next x − current x).
- **Perfect Rectangle** (LC 391): area check plus corner parity (every interior corner appears an even number of times; exactly the four outer corners appear once).
- **Segment intersection detection** (Shamos–Hoey; Bentley–Ottmann reports all intersections in O((n + k) log n)): an ordered set of segments by their y at the current x.
- **Closest pair of points**: sweep x, keep points within the current best distance in an ordered set by y.

## Coordinate compression

When coordinates are huge (10⁹) but there are only n distinct values, map them to ranks 0..k − 1 (sort and deduplicate, then binary search or a dictionary). Arrays, difference arrays, Fenwick trees and segment trees then work over k ≤ 2n slots. Keep the original coordinates to compute lengths and areas between consecutive compressed points.

\`\`\`python
xs = sorted(set(all_coordinates))
rank = {x: i for i, x in enumerate(xs)}
\`\`\`

## Difference arrays: the static sweep

If all intervals are known up front and coordinates are small (or compressed), a **difference array** does the sweep implicitly: diff[s] += 1, diff[e] −= 1 (for half-open), then a prefix sum gives the coverage at every coordinate. O(n + range).

## Sweep line or heap for meeting rooms?

Both are O(n log n). The sweep (sorted events) gives the maximum overlap and the overlap profile; the heap of end times (sorted by start) also tells you **which** room each meeting gets. Use whichever the question needs.

## Interview angles

- Say what the events are, how ties are ordered, and what state is carried.
- Use coordinate compression when values are large.
- Mention the difference-array shortcut for small ranges.

## Connections

Merge intervals and interval scheduling are specialised sweeps; segment trees and heaps hold the active set in harder sweeps; computational geometry builds on the same idea.
`,
    doubts: [
      ["Why process end events before start events at the same time?", "For half-open intervals [s, e), an interval ending at t is gone at t, so a meeting starting at t can reuse its room. Processing −1 first reflects that; processing +1 first would count them as overlapping."],
      ["Sweep line or heap for meeting rooms?", "Both are O(n log n). The heap version also tells you which room each meeting uses; the sweep is shorter for just the count."],
      ["How do I encode \"ends before starts\" in a Python sort?", "Use tuples (time, delta) with delta = −1 for ends and +1 for starts: at equal times −1 sorts first. Or use explicit type codes (0 for end, 1 for start) as the second key."],
      ["When should I use a difference array instead of sorting events?", "When coordinates are small integers (or few distinct values after compression) and all intervals are known in advance. It avoids the sort (O(n + range)) and gives coverage at every coordinate, not just the maximum."],
      ["Why does My Calendar III not just keep a running maximum?", "A new booking can increase the overlap anywhere inside its range, not only at its endpoints relative to earlier events; the maximum must be recomputed over the affected range. A segment tree with range add and global max does it in O(log C) per booking."],
    ],
    revise: md`
? Event encoding? :: (start, +1), (end, −1).
? Tie-break for half-open intervals? :: End events before start events at equal times.
? Small integer coordinates? :: Difference array, no sort.
? Flowers in bloom per query? :: #starts ≤ t − #ends < t via binary search.
? Huge coordinates? :: Coordinate compression.
? Flowers in Full Bloom count? :: (#starts ≤ t) − (#ends < t) via binary search.
? Minimum Interval to Include Each Query? :: Sorted queries; heap of active intervals by length; drop ended ones.
? Perfect Rectangle check? :: Areas match and only the 4 outer corners appear an odd number of times.
? Brightest Position? :: +1/−1 events at p−r and p+r+1 (half-open), track the max position.
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
## Four questions about intervals

Interval problems look alike but ask different questions, and each has its own optimal strategy:

| Question | Strategy |
|---|---|
| choose the most non-overlapping intervals | sort by **end**, take greedily |
| choose non-overlapping intervals of maximum total weight | sort by end, DP + binary search |
| use the fewest resources so all intervals fit (rooms, machines) | sort by start, min-heap of ends (or sweep) |
| cover a target range with the fewest intervals | sort by start, take the farthest-reaching each time |

## Earliest end first (activity selection)

Sort by end time. Take the first interval; then repeatedly take the next interval whose start is at or after the end of the last one taken.

\`\`\`python
def max_non_overlapping(intervals):
    intervals.sort(key=lambda x: x[1])
    count, last_end = 0, float("-inf")
    for s, e in intervals:
        if s >= last_end:              # >= for half-open intervals
            count += 1; last_end = e
    return count
\`\`\`

[[widget:intervals]]

**Why earliest end works (stays ahead)**: let greedy pick g₁, g₂, … and any other valid selection pick o₁, o₂, … (both sorted by end). By induction, end(g_k) ≤ end(o_k): for k = 1, greedy picks the globally earliest end; if end(g_{k−1}) ≤ end(o_{k−1}), then o_k starts after o_{k−1} ends, hence after g_{k−1} ends, so o_k is available to greedy, and greedy picks the earliest-ending available interval. So greedy never falls behind and selects at least as many intervals.

Wrong rules and their counterexamples: shortest first fails with a short interval overlapping two long disjoint ones; earliest start fails with one long interval covering many short ones; fewest conflicts first also has counterexamples.

Uses: **Non-overlapping Intervals** (LC 435: removals = n − kept), **Maximum Length of Pair Chain** (LC 646), **Minimum Number of Arrows** (LC 452: an arrow at each selected end), **Maximum Number of Events That Can Be Attended** (LC 1353, a per-day variant with a heap).

## Weighted interval scheduling

Each interval has a weight; maximise the total weight of non-overlapping intervals. Greedy fails (one heavy long interval may beat many light short ones). DP:

1. Sort by end.
2. p(i) = the last interval that ends at or before interval i starts (binary search over ends).
3. dp[i] = max(dp[i − 1], w[i] + dp[p(i)]): skip interval i or take it.

O(n log n). **Maximum Profit in Job Scheduling** (LC 1235) is exactly this. **Maximum Number of Events That Can Be Attended II** (LC 1751) adds a limit k on the number of events: dp[i][j] with j events used, O(n·k·log n) or O(n·k) with precomputed p.

## Interval partitioning (fewest rooms)

Minimum number of resources so that overlapping intervals use different resources = the **maximum number of intervals overlapping at one point** (the depth). Lower bound: at the deepest point, that many intervals need distinct rooms. Greedy achieves it: sort by start; keep a min-heap of room end times; reuse the room that frees earliest if it is free by the new start, else open a new room. The number of rooms never exceeds the depth.

Meeting Rooms II (LC 253), Minimum Number of Platforms, Car Pooling (capacity version), Divide Intervals Into Minimum Number of Groups (LC 2406).

## Covering a range

Fewest intervals covering [0, T] (Video Stitching LC 1024, Minimum Taps LC 1326):

1. Sort by start.
2. current = 0. While current < T: among intervals starting ≤ current, pick the one reaching farthest. If it does not extend beyond current, coverage is impossible. Otherwise count it and set current to its end.

Why farthest-reaching: any interval chosen to cover the point current could be replaced by the farthest-reaching one starting at or before current, which covers at least as much (exchange).

Set cover in general (arbitrary sets, not intervals) is NP-hard; the interval structure is what makes greedy optimal.

## Related interval selections

- **Minimum points to stab all intervals** (Minimum Arrows): sort by end; place a point at the first end; skip every interval containing it; repeat. The number of points equals the maximum number of pairwise disjoint intervals (a min-max duality on intervals).
- **Set Intersection Size At Least Two** (LC 757): sort by end ascending and start descending; keep the two largest chosen points; add points at the interval's end as needed.
- **Erase Overlap Intervals vs Merge**: removing intervals to make the rest disjoint (selection) is different from merging overlaps (union).

## Summary table

| Problem | Sort by | Tool | Complexity |
|---|---|---|---|
| max disjoint intervals | end | greedy | O(n log n) |
| max weight disjoint | end | DP + binary search | O(n log n) |
| min rooms | start | heap of ends or sweep | O(n log n) |
| min intervals to cover | start | farthest reach | O(n log n) |
| min points to stab | end | greedy | O(n log n) |

## Interview angles

- Identify which of the four questions is being asked before choosing the sort key.
- Give the "stays ahead" proof for earliest end in two sentences.
- For weighted versions, switch to DP immediately and explain why greedy fails.

## Connections

Merge intervals and sweep lines handle unions and depths; DP handles weights; heaps handle resource assignment.
`,
    doubts: [
      ["Why does earliest end time maximise the count?", "After choosing k intervals, greedy's k-th end is no later than the k-th end of any other valid selection (induction). So whenever another selection can take a (k+1)-th interval, greedy can too."],
      ["Why does greedy fail with weights?", "A single long interval with a huge weight may be worth more than many short ones that greedy prefers. Weighted scheduling needs DP over the sorted intervals."],
      ["Why sort by end for selection but by start for covering?", "Selection wants to leave as much room as possible for future intervals, which is decided by where the chosen interval ends. Covering wants to extend coverage as far as possible from the current point, so you need all intervals that start before that point, which sorting by start gives you."],
      ["Does the earliest-end greedy also find which intervals to remove?", "Yes: every interval skipped by the greedy is a removal, and the count n − kept is minimal (LC 435)."],
      ["What if intervals are closed and touching ones conflict?", "Change the comparison to s > last_end (strict). The proof is unchanged; only the definition of overlap differs."],
    ],
    revise: md`
? Max disjoint intervals? :: Sort by end; take if start ≥ last end.
? Min removals? :: n − max disjoint.
? Min arrows? :: Sort by end; shoot at the end of the first unburst balloon.
? Weighted scheduling? :: DP with binary search for the last compatible interval.
? Min rooms? :: Maximum overlap (sweep or heap).
? Cover [0, T] with fewest? :: Farthest-reach greedy.
? Stab all intervals with fewest points? :: Sort by end, place a point at each first uncovered end; equals max disjoint count.
? Divide Intervals Into Minimum Groups (LC 2406)? :: Maximum overlap depth (heap of ends or sweep).
? Events II with k limit? :: dp[i][j] over sorted-by-end events + binary search for p(i).
? Set Intersection Size At Least Two sort? :: End ascending, start descending; keep the two largest chosen points.
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

Buildings are rectangles [left, right, height] on a common ground line. Output the skyline: the list of key points [x, h] where the outline's height changes, ordered by x, with no two consecutive points of the same height.

The outline at x is the maximum height among buildings covering x. It can only change where some building starts or ends, so sweep those **events** and keep the **active heights** in a structure that returns the maximum.

## Sweep with a max-heap

Events: for each building, a start event at left with height h and an end event at right with height h. Sort events by x; at equal x, the order matters:

- starts before ends (so a building starting where another ends does not create a dip to the ground);
- among starts, taller first (so the tallest start is processed first and smaller ones do not emit points);
- among ends, shorter first (so removing the shorter one does not momentarily expose the taller one's removal).

A common encoding: start events as (left, −h), end events as (right, +h), sorted as tuples. Negative heights for starts make starts come first at the same x and taller starts first; positive heights for ends make shorter ends first.

Active set: a max-heap of heights with **lazy deletion** (a count map of heights to delete), initialised with 0 (the ground), so the maximum is defined even when no building is active. After processing all events at one x, if the current maximum differs from the last output height, emit [x, maximum].

\`\`\`python
import heapq
from collections import Counter
def get_skyline(buildings):
    events = sorted([(l, -h) for l, r, h in buildings] + [(r, h) for l, r, h in buildings])
    heap, dead, out, prev = [0], Counter(), [], 0
    for x, h in events:
        if h < 0: heapq.heappush(heap, h)           # start: store -h in a min-heap = max-heap
        else: dead[-h] += 1                          # end: mark for lazy removal
        while dead[heap[0]]:
            dead[heap[0]] -= 1; heapq.heappop(heap)
        cur = -heap[0]
        if cur != prev:
            out.append([x, cur]); prev = cur
    return out
\`\`\`

(Heap entries are stored as −height; dead is keyed by the stored value.) O(n log n).

Alternative active set: a sorted multiset (SortedList, TreeMap of height → count) where removals are direct and the maximum is the last element.

## Divide and conquer

Like merge sort: compute the skyline of each half of the buildings, then **merge two skylines** with two pointers, tracking the current height of each and emitting max(h1, h2) whenever it changes. T(n) = 2T(n/2) + O(n) = O(n log n). Elegant, and a good alternative to explain.

## Falling Squares (LC 699)

Squares are dropped one by one at [left, left + side); each lands on the highest point under it. After each drop, report the tallest stack.

- O(n²): for each new square, check all previous squares that overlap it; its base is the max of their tops.
- O(n log n): coordinate-compress all edges; a segment tree with **range max query** and **range assign** (set the range to base + side). The answer is a running global maximum.

## Related sweeps with active sets

- **Rectangle Area II** (LC 850): union area of rectangles: sweep x with a segment tree over y counting coverage.
- **Perfect Rectangle** (LC 391): check that small rectangles tile a big one exactly: sum of areas equals the bounding area, and every corner except the four outer ones appears an even number of times.
- **Minimum Interval to Include Each Query** (LC 1851): sorted queries with a heap of active intervals by size.
- **Amount of New Area Painted Each Day** (LC 2158): range assignment with "how much was new" queries.
- **Visible people in a queue**, **buildings with an ocean view** (LC 1762): 1D monotonic stacks, the one-dimensional cousins.

## Interview strategy

1. Explain the event representation and why only event x's matter.
2. State the tie-breaking rules (starts first, taller starts first, shorter ends first) and how the sort key encodes them.
3. Explain the active-set structure (heap with lazy deletion, or multiset) and why 0 is kept in it.
4. Emit a point only when the maximum changes.

Then mention divide and conquer as an alternative. Test on two buildings that share an edge ([1, 2, 3] and [2, 3, 3] should produce a flat line, no point at x = 2) and on nested buildings.

## Connections

Sweep line with a max structure, lazy deletion in heaps, merge-sort-style divide and conquer, and segment trees for the falling-squares variant.
`,
    doubts: [
      ["Why must taller starts come first at the same x?", "If a short building starts first, you emit its height and then immediately emit the tall one at the same x: a redundant key point. Processing tall first (or emitting only after all events at x) avoids it."],
      ["Why keep 0 in the active set?", "When all buildings end, the skyline drops to ground level. Having 0 always present makes the maximum well defined."],
      ["Why are shorter ends processed before taller ends at the same x?", "If the taller building's end were processed first, the maximum would drop to the shorter building's height, emitting a point, and then drop again when the shorter one ends, emitting a second point at the same x. Processing the shorter end first keeps the maximum unchanged until the tallest end, emitting a single correct point."],
      ["How do I test the skyline code quickly?", "Use adjacent buildings of equal height (no point at the shared edge), nested buildings (a tall one inside a wide short one), buildings starting at the same x with different heights, and a single building ([l, h], [r, 0])."],
      ["Can the multiset version avoid lazy deletion?", "Yes: a sorted multiset (or TreeMap height → count) removes the ended height directly in O(log n), and the maximum is the largest key. It is simpler to reason about, at the cost of a non-standard structure in Python."],
    ],
    revise: md`
? Skyline events? :: Starts and ends at building edges, sorted by x with careful tie rules.
? Active structure? :: Multiset of heights (or max-heap with lazy deletion), with 0 always present.
? Emit when? :: The current max differs from the last emitted height.
? Alternative? :: Divide and conquer merge of skylines.
? Falling Squares at scale? :: Coordinate compression + segment tree (range max, range assign).
? Skyline event encoding? :: Starts (l, −h), ends (r, +h), sorted as tuples.
? Why keep 0 in the active set? :: So the maximum is the ground height when no building is active.
? Divide and conquer skyline? :: Merge two skylines with two pointers, emitting max(h1, h2) changes.
? Falling Squares fast? :: Compressed segment tree with range max + range assign.
`,
    pitfalls: ["Emitting duplicate points at equal x", "Removing the wrong copy of equal heights", "Forgetting ground level 0"],
    quiz: [Q("In the heap version, when do you remove a building's height?", ["at its start", "immediately at its end event", "*lazily, when it reaches the top and its end ≤ x", "never"], "Heaps cannot delete arbitrary entries efficiently.")],
    sources: [S.article("Segment tree", "cp-algorithms", "https://cp-algorithms.com/data_structures/segment_tree.html"), S.article("Sweep line algorithm", "Wikipedia", "https://en.wikipedia.org/wiki/Sweep_line_algorithm")],
    problems: [218, 699, 850],
  },

  // ─────────────── bits ───────────────
  "bit-basics": {
    blurb: "Bitwise operators, two's complement, shifts and the idioms (lowest set bit, clear lowest bit, test/set/toggle) that interviewers expect you to write without thinking.",
    signals: ["Operate on individual bits of integers", "Power-of-two checks, masks, flags", "Add or multiply without arithmetic operators"],
    lesson: md`
## Why bits

Integers are stored in binary, and processors operate on all bits of a word at once. Bit manipulation therefore gives O(1) tricks for sets of small elements (a 32- or 64-bit mask is a set of up to 64 items), parity and power-of-two checks, compact state encoding, and arithmetic without the usual operators. It is also the basis of bitmask DP, XOR tricks and binary tries.

## Operators

| Operator | Meaning | Example (on 4 bits) |
|---|---|---|
| a & b | AND: 1 where both are 1 | 1100 & 1010 = 1000 |
| a \| b | OR: 1 where either is 1 | 1100 \| 1010 = 1110 |
| a ^ b | XOR: 1 where they differ | 1100 ^ 1010 = 0110 |
| ~a | NOT: flip every bit | ~0101 = 1010 (as a signed int: −6) |
| a << k | shift left: multiply by 2^k (dropping overflow) | 0011 << 1 = 0110 |
| a >> k | shift right: floor-divide by 2^k (arithmetic: copies the sign bit) | 0110 >> 1 = 0011 |

Java and JavaScript also have >>> (logical shift right: fills with zeros), useful for treating an int as unsigned. **Precedence trap**: in C, C++ and Java, == binds tighter than &, so x & 1 == 0 parses as x & (1 == 0). Always parenthesise: (x & 1) == 0.

## Two's complement

Signed integers use two's complement: −x = ~x + 1. An n-bit signed integer ranges over [−2^(n−1), 2^(n−1) − 1]; the most negative value has no positive counterpart (−INT_MIN overflows back to INT_MIN). Consequences:

- x & −x isolates the lowest set bit (the bits above it are inverted in −x, the bit itself and the zeros below match).
- Right-shifting a negative number keeps it negative (arithmetic shift), rounding toward −∞.

**Python** integers are unbounded: there is no overflow, ~x = −x − 1, and negative numbers behave as if they had infinitely many leading 1s. To emulate 32-bit arithmetic: mask with & 0xFFFFFFFF after each operation, and convert back to signed with x − (1 << 32) if x ≥ (1 << 31).

## Idioms

| Task | Code |
|---|---|
| test bit i | (x >> i) & 1 |
| set bit i | x \| (1 << i) |
| clear bit i | x & ~(1 << i) |
| toggle bit i | x ^ (1 << i) |
| lowest set bit (as a value) | x & −x |
| clear the lowest set bit | x & (x − 1) |
| is x a power of two? | x > 0 and x & (x − 1) == 0 |
| is x a power of four? | power of two and (x & 0x55555555) ≠ 0 |
| all ones in the low k bits | (1 << k) − 1 |
| even / odd | x & 1 |
| swap without a temporary | a ^= b; b ^= a; a ^= b (cute, not faster) |
| average without overflow | (a & b) + ((a ^ b) >> 1) |

**Why x & (x − 1) clears the lowest set bit**: subtracting 1 turns the lowest 1 into 0 and every 0 below it into 1, leaving higher bits unchanged; ANDing with x keeps the higher bits and zeros everything from the lowest set bit down. Looping x &= x − 1 visits each set bit once: Kernighan's popcount in O(number of set bits).

## Classic problems

- **Number of 1 Bits** (LC 191): Kernighan's loop, or the built-in popcount.
- **Reverse Bits** (LC 190): shift bits out of x and into the result 32 times; or swap halves, then quarters, … with masks (O(log w) operations).
- **Power of Two / Three / Four** (LC 231, 326, 342): the idioms above; for three, check 3^19 % n == 0 for positive n (1162261467 is the largest power of 3 in 32 bits).
- **Sum of Two Integers** (LC 371) without + or −: a ^ b is the sum without carries; (a & b) << 1 is the carry; repeat until the carry is 0. In Python mask to 32 bits to make the loop terminate for negatives.
- **Divide Two Integers** (LC 29): subtract the largest shifted divisor (divisor << k ≤ dividend) repeatedly: O(log² n) or O(log n); handle INT_MIN / −1 overflow and signs.
- **Bitwise AND of Numbers Range** (LC 201): the answer is the common binary prefix of left and right (any differing bit position sees both 0 and 1 in the range): shift both right until equal, then shift back.
- **Hamming Distance** (LC 461): popcount(x ^ y).
- **Complement of Base 10 Integer** (LC 1009): XOR with the all-ones mask of the same bit length.
- **Binary Gap**, **Alternating Bits** (LC 693: x ^ (x >> 1) must be all ones).
- **UTF-8 Validation** (LC 393): read leading-bit patterns with masks.

## Built-ins

| Language | popcount | trailing zeros | leading zeros / bit length |
|---|---|---|---|
| Python | int.bit_count() (3.10+), bin(x).count("1") | (x & −x).bit_length() − 1 | x.bit_length() |
| Java | Integer.bitCount, Long.bitCount | Integer.numberOfTrailingZeros | Integer.numberOfLeadingZeros, highestOneBit |
| C++ | __builtin_popcount(ll), std::popcount (C++20) | __builtin_ctz, std::countr_zero | __builtin_clz, std::bit_width |

These compile to single CPU instructions on modern hardware.

## Interview angles

- Parenthesise bit expressions; say how your language handles negative numbers and overflow.
- Explain x & (x − 1) and x & −x by writing a small example in binary.
- Prefer built-ins in production code; know the manual loops for interviews.

## Connections

XOR tricks, bitmask enumeration and DP, binary tries, Fenwick trees (lowbit) and Gray codes all rest on these idioms.
`,
    doubts: [
      ["Why does x & (x − 1) clear the lowest set bit?", "Subtracting 1 flips the lowest set bit to 0 and all the zeros below it to 1. ANDing with x keeps the higher bits and zeros out everything from the lowest set bit down."],
      ["Why does x & (−x) give the lowest set bit?", "In two's complement −x = ~x + 1: all bits above the lowest set bit are flipped, and that bit and the zeros below it are restored. AND keeps only the lowest set bit."],
      ["How do I emulate 32-bit overflow in Python?", "Mask results with & 0xFFFFFFFF, and convert back to signed with x if x < 2³¹ else x − 2³²."],
      ["Why is −INT_MIN still INT_MIN?", "In 32-bit two's complement the range is −2³¹ to 2³¹ − 1, so +2³¹ does not exist. Computing ~x + 1 for x = −2³¹ wraps around to −2³¹. That is why Divide Two Integers has the special case INT_MIN / −1."],
      ["How does Sum of Two Integers terminate in Python with negative numbers?", "Python's unbounded integers make the carry grow forever for negative inputs. Masking a and b with 0xFFFFFFFF on each iteration bounds the carry to 32 bits; at the end, convert values ≥ 2³¹ back to negative with x − 2³²."],
      ["Is bit manipulation actually faster in high-level languages?", "Individual bit operations are fast everywhere, but the big wins come from packing many booleans into one word (bitsets: 64 operations at once) and from built-in popcount. Replacing a % 2 with a & 1 rarely matters; compilers already do it."],
    ],
    revise: md`
? Clear lowest set bit? :: x & (x − 1).
? Isolate lowest set bit? :: x & (−x).
? Power of two test? :: x > 0 and x & (x − 1) == 0.
? −x in two's complement? :: ~x + 1.
? Add without +? :: sum = a ^ b, carry = (a & b) << 1, loop.
? AND of a range [m, n]? :: Common binary prefix of m and n.
? Java unsigned right shift? :: >>>.
? Average without overflow? :: (a & b) + ((a ^ b) >> 1).
? Bitwise AND of a range? :: Common binary prefix of left and right.
? Alternating bits test? :: x ^ (x >> 1) is all ones (y & (y + 1) == 0).
? Largest power of 3 in 32 bits? :: 1162261467 (3^19): n > 0 and 3^19 % n == 0.
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

XOR (^) is addition modulo 2 on each bit, with no carries. Everything follows from four facts:

1. x ^ x = 0 (an element cancels itself),
2. x ^ 0 = x,
3. commutative and associative (order and grouping do not matter),
4. self-inverse: if a ^ b = c then a ^ c = b and b ^ c = a.

So XORing a multiset of numbers leaves only the values that appear an **odd** number of times, and XOR can "undo" itself. Prefix XORs work like prefix sums: xor(l..r) = P[r + 1] ^ P[l].

## Single-number family

- **Single Number** (LC 136): every element appears twice except one: XOR everything; pairs cancel. O(n), O(1) space.
- **Missing Number** (LC 268): XOR all indices 0..n and all values; every present number cancels with its index, leaving the missing one. (The sum formula works too but can overflow in fixed-width languages.)
- **Single Number III** (LC 260): two numbers a and b appear once, the rest twice. x = XOR of everything = a ^ b ≠ 0. Pick any set bit of x (lowbit = x & −x): a and b differ in that bit. Split all numbers into two groups by that bit; each group contains exactly one of a, b plus complete pairs; XOR each group.
- **Find the Duplicate and the Missing** (Set Mismatch, LC 645): XOR of values and indices gives dup ^ missing; split by a set bit as above, then check which of the two is the duplicate.
- **Single Number II** (LC 137): every element three times except one: count each bit modulo 3 (the bits of the single number are the bits whose count is not divisible by 3), or the two-variable state machine: ones = (ones ^ x) & ~twos; twos = (twos ^ x) & ~ones, which counts each bit mod 3 in two bits.
- **Find the Difference** (LC 389): XOR all characters of both strings.

## Prefix XOR problems

- **XOR Queries of a Subarray** (LC 1310): prefix XOR, O(1) per query.
- **Count Triplets That Can Form Two Arrays of Equal XOR** (LC 1442): a[i..j−1] XOR equals a[j..k] iff xor(i..k) = 0, i.e. P[i] == P[k + 1]; for each such pair every j in (i, k] works, adding k − i. With a hash map of (count, sum of indices) per prefix value it is O(n).
- **Decode XORed Array** (LC 1720): a[i + 1] = a[i] ^ encoded[i].
- **Decode XORed Permutation** (LC 1734): the total XOR of 1..n is known; XOR of encoded at odd indices gives a[1] ^ … ^ a[n − 1]; so a[0] = total ^ that; then decode forward.
- **XOR of all numbers 1..n** has period 4: n mod 4 = 0 → n, 1 → 1, 2 → n + 1, 3 → 0. So xor(l..r) of consecutive integers is f(r) ^ f(l − 1) in O(1).
- **Subarrays with XOR equal to k**: prefix XOR + hash map of counts, like subarray sum equals k.
- **Minimum XOR Sum of Two Arrays** (LC 1879): assignment via bitmask DP, not a trick.

## Gray code (LC 89)

The reflected binary Gray code orders all n-bit numbers so consecutive values differ in exactly one bit: g(i) = i ^ (i >> 1). Inverse: b = g ^ (g >> 1) ^ (g >> 2) ^ … . Uses: rotary encoders (one bit changes at a time, so no glitches), Karnaugh maps, iterating subsets by toggling one element at a time, Towers of Hanoi (the bit that changes says which disc to move).

## Maximum XOR

- **Of two numbers in an array** (LC 421): a binary trie and a greedy from the top bit (prefer the opposite bit), O(n·B); or a prefix-set method building the answer bit by bit.
- **Of any subset**: a **linear basis** over GF(2). Insert each number by reducing it with the existing basis vectors from the highest bit; if a non-zero remainder survives, it becomes a new basis vector for its top bit. At most B vectors. The maximum subset XOR is obtained greedily: start with 0 and XOR in a basis vector whenever it increases the value, from the highest bit down.
- **Maximum XOR With an Element From Array** (LC 1707): offline trie with limits.

## Other XOR facts

- a ^ b = (a | b) − (a & b) and a + b = (a ^ b) + 2·(a & b) (the carry formula).
- XOR swap works but fails if both variables are the same memory location (it zeros it).
- XOR linked lists store prev ^ next in one field (memory trick, rarely used today).
- XOR is the "difference" of sets represented as bitmasks (symmetric difference).

## Interview angles

- Use the cancellation property to get O(1) space for single-number problems.
- For Single Number III, explain the split by the lowest set bit of a ^ b.
- Know the period-4 formula and the Gray code formula; both come up as quick follow-ups.

## Connections

Prefix XOR mirrors prefix sums; bit tries and linear bases handle maximisation; bitmasks treat XOR as symmetric difference.
`,
    doubts: [
      ["How does Single Number III split the two numbers?", "a ^ b has a 1 where a and b differ. Choosing any such bit, a and b fall into different groups (bit set vs not). All other numbers come in pairs, and each pair lands in the same group, cancelling out."],
      ["Why does Single Number II use mod 3 bit counts?", "For each bit, the total count over the array is 3k plus the unique number's bit. Taking the count mod 3 recovers each bit of the unique number."],
      ["Why does any set bit of a ^ b separate a and b in Single Number III?", "A set bit in a ^ b means a and b differ in that position: one has 0 and the other 1. Every other number appears twice and falls into the same group both times, so each group's XOR leaves exactly one of a, b."],
      ["Can XOR find a number appearing an odd number of times when others appear an even number?", "Yes, exactly: XOR of everything keeps each value an odd number of times. That is the general statement behind Single Number; it fails when the \"other\" multiplicities are odd (like three), which needs bit counting modulo that number."],
      ["Why does the XOR swap break when both operands are the same variable?", "a ^= a sets it to 0 immediately, and the remaining steps keep it 0, losing the value. With two distinct variables holding equal values it works; with aliased references (same location) it does not."],
    ],
    revise: md`
? XOR identities? :: x ^ x = 0, x ^ 0 = x, associative and commutative.
? Missing number? :: XOR of 0..n and all values.
? Two unique numbers? :: Split by the lowest set bit of a ^ b.
? Everything thrice but one? :: Bit counts mod 3 (or ones/twos state).
? Range XOR? :: P[r+1] ^ P[l].
? XOR of 0..n? :: n, 1, n+1, 0 for n mod 4 = 0, 1, 2, 3.
? Gray code? :: n ^ (n >> 1).
? Count Triplets (LC 1442) condition? :: P[i] == P[k+1]; each such pair adds k − i.
? Decode XORed Permutation start? :: a[0] = (1^…^n) ^ (XOR of encoded at odd indices).
? Linear basis insert? :: Reduce by basis vectors from the top bit; a non-zero remainder becomes a new vector.
? a + b via XOR? :: (a ^ b) + 2·(a & b).
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
## Masks as sets

With n ≤ 20 or so elements, a subset fits in an integer: bit i is 1 iff element i belongs to the subset. Set operations become single machine instructions:

| Set operation | Mask operation |
|---|---|
| union A ∪ B | a \| b |
| intersection A ∩ B | a & b |
| difference A \ B | a & ~b |
| complement within n elements | full ^ a, with full = (1 << n) − 1 |
| symmetric difference | a ^ b |
| is A ⊆ B? | a & b == a (equivalently a & ~b == 0) |
| size | popcount(a) |
| contains i | (a >> i) & 1 |
| smallest element | (a & −a).bit_length() − 1 |

## Enumerating all subsets

\`\`\`python
for mask in range(1 << n):
    subset = [items[i] for i in range(n) if mask >> i & 1]
\`\`\`

2ⁿ masks, O(n) to decode each: O(n · 2ⁿ). Practical up to about n = 20 (10⁶ subsets) in Python and n = 25 in C++. Masks also make **subset DP** easy because every subset of a mask is numerically smaller than the mask.

## Submasks of a mask

To visit every subset of a given mask m:

\`\`\`python
sub = m
while sub:
    process(sub)
    sub = (sub - 1) & m
process(0)              # the empty subset, if needed
\`\`\`

Subtracting 1 clears the lowest set bit of sub and sets all lower bits; ANDing with m keeps only bits that belong to m. The result is the next smaller submask, so the loop visits all 2^popcount(m) submasks in decreasing order.

Over **all** masks m of n bits, the total number of (m, sub) pairs is 3ⁿ (each element is outside m, in m but not sub, or in sub). n = 15 gives 1.4·10⁷; n = 20 gives 3.5·10⁹ (too slow). Used in set-partition DPs: dp[m] = min over sub ⊆ m of dp[m ^ sub] + cost[sub].

**Supersets** of m within n bits: sup = m; while sup < (1 << n): process; sup = (sup + 1) | m.

## Masks of letters, parity masks

- **Maximum Product of Word Lengths** (LC 318): mask each word's letters; two words share no letters iff (mask1 & mask2) == 0.
- **Number of Valid Words for Each Puzzle** (LC 1178): count word masks in a hash map; for each puzzle, enumerate the submasks of its 7-letter mask that contain the first letter (at most 2⁶ = 64) and sum the counts.
- **Parity masks**: bit c records whether letter c has appeared an odd number of times in a prefix. A substring has all even counts iff its two prefix masks are equal; at most one odd count iff they differ in at most one bit.
  - **Find the Longest Substring Containing Vowels in Even Counts** (LC 1371): store the first index of each 5-bit vowel parity mask.
  - **Number of Wonderful Substrings** (LC 1915): for each prefix mask, add the counts of the same mask and of the 10 masks differing in one bit.
  - **Can Make Palindrome from Substring** (LC 1177): popcount of the XOR of two prefix masks // 2 replacements needed.
- **Maximum Students Taking Exam** (LC 1349): row masks with no two adjacent bits: valid iff (m & (m >> 1)) == 0.

## Gosper's hack: masks with exactly k bits

To enumerate all n-bit masks with exactly k set bits in increasing order:

\`\`\`python
def next_same_popcount(x):
    c = x & -x            # lowest set bit
    r = x + c             # ripple the lowest block of ones
    return (((r ^ x) >> 2) // c) | r
x = (1 << k) - 1
while x < (1 << n):
    process(x); x = next_same_popcount(x)
\`\`\`

It visits exactly C(n, k) masks: useful when the problem fixes the subset size (combinations, choosing exactly k items).

## Meet in the middle

When n is around 30–40, enumerate the 2^(n/2) subsets of each half and combine them by sorting and binary search or hashing (see the meet-in-the-middle page). Bitmask enumeration generates the half-results.

## Practical tips

- Precompute per-mask values incrementally: sum[mask] = sum[mask & (mask − 1)] + a[lowest bit index].
- Use arrays of size 2ⁿ instead of dictionaries when n ≤ 20.
- In Python, loops over 2²⁰ masks with inner loops over n bits are slow (~2·10⁷ operations); vectorise or prune.

## Interview angles

- Explain the submask loop and why the total is 3ⁿ.
- Recognise parity masks for "even counts" substring questions.
- Choose bitmask enumeration when n ≤ 20 and the answer depends on which elements are chosen.

## Connections

Bitmask DP builds on these enumerations; XOR prefix masks mirror prefix sums; meet in the middle extends enumeration to n ≈ 40.
`,
    doubts: [
      ["Why does (sub − 1) & mask enumerate submasks?", "Subtracting 1 turns the lowest set bit of sub into 0 and sets all bits below it; ANDing with mask keeps only bits allowed by mask. This is decrementing within the bits of mask, visiting every submask once."],
      ["How do parity masks find even-count substrings?", "The parity mask at prefix i records which letters appeared an odd number of times. A substring between prefixes with equal masks has every letter appearing an even number of times."],
      ["Why is every submask numerically smaller than or equal to its mask?", "A submask only removes 1-bits; removing a 1-bit never increases a binary number. That is why processing masks in increasing numeric order computes all submasks before the mask itself, which subset DPs rely on."],
      ["How do I enumerate submasks in increasing order instead?", "Collect them with the decreasing loop and reverse, or iterate sub = (sub − m) & m starting from 0 (equivalently (sub + ~m + 1) & m), which steps to the next larger submask."],
      ["When does 3ⁿ submask enumeration become too slow?", "Around n = 17–18 in C++ (1.3·10⁸ to 3.9·10⁸ steps) and n = 14–15 in Python. Beyond that use SOS DP (n·2ⁿ) for sum-over-subsets questions, or restructure the DP."],
    ],
    revise: md`
? Enumerate all subsets? :: mask from 0 to 2ⁿ − 1.
? Next submask? :: sub = (sub − 1) & mask.
? Total submask work over all masks? :: 3ⁿ.
? Words share no letters? :: mask1 & mask2 == 0.
? Even vowel counts substring? :: Parity mask + first-index map.
? Superset enumeration? :: sup = (sup + 1) | m until sup reaches 1 << n.
? Wonderful Substrings counting? :: Same prefix mask + the 10 masks one bit away.
? No adjacent bits in a row mask? :: (m & (m >> 1)) == 0.
? Puzzle words (LC 1178)? :: Count word masks; enumerate puzzle submasks containing the first letter.
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
## Counting set bits, one number at a time

popcount(x) is the number of 1 bits in x. Ways to compute it:

- **Built-ins**: int.bit_count() (Python 3.10+), Integer.bitCount (Java), __builtin_popcount / std::popcount (C++): a single CPU instruction on modern hardware.
- **Kernighan**: while x: x &= x − 1; count += 1. O(number of set bits).
- **SWAR** (parallel bit counting): add adjacent bits, then adjacent pairs, then nibbles, using masks 0x55555555, 0x33333333, 0x0F0F0F0F, and a final multiplication: O(1) with ~12 operations.
- **Lookup table** of popcounts for every byte, summing four lookups for a 32-bit number.

## Counting Bits for 0..n (LC 338)

Compute popcount(i) for every i from 0 to n in O(n) total using DP over smaller numbers:

- bits[i] = bits[i >> 1] + (i & 1): i is i >> 1 with one extra bit appended.
- bits[i] = bits[i & (i − 1)] + 1: i with its lowest set bit removed has one fewer bit.
- bits[i] = bits[i − offset] + 1 where offset is the largest power of two ≤ i.

Each is O(1) per number.

## Per-bit contributions

Many "sum over all pairs" or "sum over all subarrays" problems with bitwise operations are solved **one bit at a time**, because bits do not interact under AND, OR and XOR.

- **Total Hamming Distance** (LC 477): for each bit position, if c numbers have it set and n − c do not, that bit contributes c·(n − c) to the total (each mixed pair differs there). O(32·n).
- **Sum of XOR of all pairs**: Σ over bits of c·(n − c)·2^b.
- **Sum of AND of all pairs**: Σ over bits of C(c, 2)·2^b.
- **Sum of XOR over all subarrays**: per bit, count subarrays whose XOR has that bit set using prefix parities: subarrays (i, j] with P[i] and P[j] differing in that bit; count zeros and ones among prefix parities: zeros·ones.
- **Sum of subarray ORs**: per bit, count subarrays containing at least one element with the bit = total − subarrays with none (runs of elements without the bit contribute len·(len + 1)/2 to "none").
- **Bitwise ORs of Subarrays** (LC 898, count distinct): the set of ORs of subarrays ending at i has at most 32 values (each step can only add bits), so maintain it incrementally: O(32·n).
- **Smallest Subarrays With Maximum Bitwise OR** (LC 2411): for each bit, remember the nearest index to the right with that bit; the answer at i reaches the farthest of those.

## Total set bits in 1..n

Without iterating every number: for bit b, the pattern of that bit over 0, 1, 2, … repeats every 2^(b+1) numbers with 2^b zeros followed by 2^b ones. In 0..n there are (n + 1) // 2^(b+1) full cycles contributing 2^b each, plus a partial cycle contributing max(0, (n + 1) mod 2^(b+1) − 2^b). Sum over b: O(log n).

## Single numbers with bit counts

- **Single Number II** (LC 137): count how many numbers have each bit set; the bits where the count mod 3 is 1 form the single number. Handle the sign bit for negatives (32-bit interpretation).
- **Generalisation**: every element appears k times except one: counts mod k.
- **Majority element by bits**: for each bit, the majority's bit is the one held by more than n/2 numbers.

## Minimum flips

- **Minimum Bit Flips to Convert Number** (LC 2220): popcount(a ^ b).
- **Minimum Flips to Make a OR b Equal to c** (LC 1318): per bit: if c's bit is 1, one flip is needed only if both a and b have 0; if c's bit is 0, flips needed = a's bit + b's bit.
- **Minimum One Bit Operations to Make Integers Zero** (LC 1611): the answer is the inverse Gray code of n (XOR of n's right shifts), a nice surprise.

## Interview angles

- Use the per-bit decomposition for sums over pairs or subarrays of AND, OR, XOR.
- Know the O(n) Counting Bits recurrences.
- Mention built-in popcount compiles to one instruction.

## Connections

Bit basics (x & (x − 1)), XOR prefix parities, and combinatorics (counting pairs c·(n − c)).
`,
    doubts: [
      ["Why does bits[i] = bits[i >> 1] + (i & 1) work?", "i >> 1 drops the lowest bit, whose set-bit count is already known (it is smaller than i); the dropped bit adds 1 if set."],
      ["Why is c · (n − c) the contribution per bit?", "A pair differs at that bit exactly when one number has it and the other does not: c choices times n − c choices."],
      ["Why can bitwise sums be computed one bit at a time?", "AND, OR and XOR act on each bit position independently: bit b of the result depends only on bit b of the inputs. So the total Σ result = Σ over b of 2^b × (number of pairs or subarrays whose result has bit b set), and each count is a simpler combinatorial question."],
      ["How does SWAR popcount work in one line of arithmetic?", "x − ((x >> 1) & 0x55555555) stores 2-bit counts; (x & 0x33333333) + ((x >> 2) & 0x33333333) sums them into 4-bit counts; (x + (x >> 4)) & 0x0F0F0F0F gives byte counts; multiplying by 0x01010101 and shifting right by 24 adds the four bytes."],
      ["Is iterating over 32 bits per number too slow?", "For n up to 10⁵–10⁶ it is 3–30 million operations: fine in C++ and Java, borderline in Python. Vectorising with built-ins or numpy helps in Python."],
    ],
    revise: md`
? Kernighan popcount? :: x &= x − 1 per set bit.
? Counting bits DP? :: bits[i] = bits[i >> 1] + (i & 1).
? Total Hamming distance? :: Σ over bits of c·(n − c).
? Flips to convert a to b? :: popcount(a ^ b).
? Sum of AND over all pairs? :: Σ_b C(c_b, 2)·2^b.
? Sum of XOR over all subarrays per bit? :: zeros × ones among prefix parities of that bit.
? Distinct ORs of subarrays bound? :: ≤ 32 values ending at each i: O(32n).
? LC 1611 answer? :: Inverse Gray code of n.
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
## GCD and Euclid's algorithm

The greatest common divisor gcd(a, b) is the largest integer dividing both. Euclid's algorithm (about 300 BC) rests on one fact: any common divisor of a and b also divides a mod b (since a mod b = a − q·b), and vice versa, so

gcd(a, b) = gcd(b, a mod b), gcd(a, 0) = a.

\`\`\`python
def gcd(a, b):
    while b:
        a, b = b, a % b
    return a
\`\`\`

**Why it is logarithmic**: after two steps the larger number at least halves (if b ≤ a/2, then a mod b < b ≤ a/2; otherwise a mod b = a − b < a/2). So O(log min(a, b)) steps; the worst case is consecutive Fibonacci numbers (Lamé's theorem).

- **lcm(a, b) = a / gcd(a, b) × b**: divide first to avoid overflow.
- gcd of an array: fold (gcd(gcd(a, b), c) …); gcd(0, x) = x.
- gcd of a subarray only stays the same or decreases (dividing) as the subarray grows, and each decrease at least halves it, so for a fixed right end there are at most log(max) distinct gcd values over all left ends: the basis of "count subarrays with gcd k" in O(n log² max).

**Extended Euclid** finds integers x, y with a·x + b·y = gcd(a, b) (Bézout's identity):

\`\`\`python
def ext_gcd(a, b):
    if b == 0: return a, 1, 0
    g, x, y = ext_gcd(b, a % b)
    return g, y, x - (a // b) * y
\`\`\`

Uses: modular inverses when the modulus is not prime, solving linear Diophantine equations a·x + b·y = c (solvable iff gcd(a, b) divides c), and the Chinese remainder theorem.

## Primality

- **Trial division**: n is prime iff no d in [2, √n] divides it: O(√n). Check 2 and 3, then 6k ± 1 for a constant-factor speed-up.
- **Miller–Rabin**: a probabilistic test; with the bases {2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37} it is **deterministic** for all 64-bit integers. O(k log³ n).
- Prime-counting intuition: about n / ln n primes below n (the prime number theorem); gaps around n average ln n.

## Sieve of Eratosthenes

All primes up to n:

\`\`\`python
def sieve(n):
    is_p = [True] * (n + 1); is_p[0:2] = [False, False]
    for p in range(2, int(n ** 0.5) + 1):
        if is_p[p]:
            is_p[p * p :: p] = [False] * len(range(p * p, n + 1, p))
    return is_p
\`\`\`

- Start crossing out at p²: smaller multiples k·p with k < p were already crossed out by k's prime factors.
- The outer loop stops at √n for the same reason.
- Cost O(n log log n): Σ over primes p ≤ n of n/p = n · Σ 1/p ≈ n ln ln n. **Count Primes** (LC 204).
- **Smallest prime factor sieve**: store spf[x] (the first prime that crosses x out). Then factorising any x ≤ n takes O(log x): repeatedly divide by spf[x].
- **Linear sieve** (Euler's): each composite is crossed out exactly once by its smallest prime factor: O(n), and produces spf as a by-product.
- **Segmented sieve**: primes in a range [L, R] with R up to 10¹² and R − L ≤ 10⁶: sieve the primes up to √R, then cross out their multiples inside the window.

## Factorisation and divisors

- Trial division up to √n: divide out each factor as often as possible; whatever remains above 1 is a prime factor. O(√n).
- With an spf sieve: O(log n) per number after O(n) preprocessing.
- Large n (10¹⁸): Pollard's rho with Miller–Rabin (name-level).
- If n = Π p_i^(e_i), the number of divisors is Π (e_i + 1) and their sum is Π (p_i^(e_i + 1) − 1)/(p_i − 1).
- Listing divisors: they come in pairs (d, n/d) with d ≤ √n: O(√n).
- Euler's totient φ(n) = n · Π (1 − 1/p): the count of 1 ≤ k ≤ n coprime to n.

## Interview problems

- **Greatest Common Divisor of Strings** (LC 1071): a common divisor string exists iff s + t == t + s; then it is the prefix of length gcd(len(s), len(t)).
- **Water and Jug Problem** (LC 365): target reachable iff target ≤ x + y and target is a multiple of gcd(x, y) (Bézout).
- **Ugly Number II** (LC 264): numbers whose prime factors are 2, 3, 5: three pointers merging the sequences ×2, ×3, ×5 (skip duplicates). **Super Ugly Number** (LC 313): k pointers or a heap.
- **Count Primes** (LC 204): sieve.
- **Closest Prime Numbers in Range** (LC 2523): sieve up to R, scan adjacent primes.
- **Number of Subarrays With GCD Equal to K** (LC 2447): for each start, extend while the running gcd stays a multiple of k (stop when it is not).
- **X of a Kind in a Deck** (LC 914): gcd of all counts ≥ 2.
- **Fraction simplification** and **slopes in Max Points on a Line**: divide by gcd and normalise signs.
- **Largest Component Size by Common Factor** (LC 952): union numbers with their prime factors (spf sieve).
- **Prime arrangements** (LC 1175): count primes ≤ n, then factorials.

## Interview angles

- Write iterative Euclid; justify O(log) with the halving argument.
- Know the sieve and why it starts at p², and the spf variant for many factorisations.
- Recognise gcd hidden in strings, jugs and slopes.

## Connections

Modular arithmetic uses extended Euclid for inverses; combinatorics needs factorisations; hashing and randomised tests use primes.
`,
    doubts: [
      ["Why is Euclid's algorithm logarithmic?", "If a ≥ b, then a mod b < a/2 (either b ≤ a/2, so the remainder is < b ≤ a/2, or b > a/2, so the remainder is a − b < a/2). So the first argument halves at least every two steps."],
      ["Why start crossing out at p² in the sieve?", "Smaller multiples kp with k < p have a smaller prime factor and were already crossed out by that prime."],
      ["Why is the sieve O(n log log n)?", "Prime p crosses out about n/p numbers; the sum of 1/p over primes up to n grows like log log n (Mertens)."],
      ["Why is gcd(a, 0) = a and not undefined?", "Every integer divides 0, so the common divisors of a and 0 are exactly the divisors of a, and the greatest is |a|. This base case also makes folding gcd over an array starting from 0 work."],
      ["How do I find all divisors of every number up to n efficiently?", "Loop d from 1 to n and append d to every multiple of d: Σ n/d = O(n log n) total. It is the harmonic-series trick, also used to compute divisor counts for all numbers at once."],
      ["When should I use Pollard's rho instead of trial division?", "When n is around 10¹² or more and must be factored many times (or n ~ 10¹⁸ at all). Trial division costs √n (10⁹ for 10¹⁸), while Pollard's rho finds a factor in about n^(1/4) steps on average."],
    ],
    revise: md`
? Euclid recurrence and cost? :: gcd(a, b) = gcd(b, a mod b); O(log min).
? LCM safely? :: a / gcd(a, b) * b.
? Extended Euclid gives? :: x, y with ax + by = gcd(a, b).
? Primality by trial division? :: O(√n).
? Sieve complexity and start point? :: O(n log log n), start at p².
? Number of divisors from factorisation? :: ∏ (eᵢ + 1).
? Jug problem condition? :: target % gcd(x, y) == 0 and target ≤ x + y.
? Subarray gcd distinct values per right end? :: At most log(max): each change at least halves.
? Segmented sieve? :: Sieve primes ≤ √R, cross out their multiples inside [L, R].
? Sum of divisors formula? :: Π (p^(e+1) − 1)/(p − 1).
? Deterministic Miller–Rabin bases for 64-bit? :: The first 12 primes (2 … 37).
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
## Why a modulus

Counting problems produce astronomically large numbers (the number of paths in a 100 × 100 grid has about 60 digits), so problems ask for the answer modulo a prime such as 10⁹ + 7 or 998244353. Modular arithmetic keeps every intermediate value small while preserving the final answer modulo M, because addition, subtraction and multiplication commute with taking remainders.

## Rules

- (a + b) mod M = ((a mod M) + (b mod M)) mod M.
- (a − b) mod M = ((a mod M) − (b mod M) + M) mod M. The + M matters in C++ and Java, where % of a negative number is negative; Python's % is always non-negative for a positive modulus.
- (a × b) mod M = ((a mod M) × (b mod M)) mod M. With M ≈ 10⁹, the product of two reduced values is below 10¹⁸ < 2⁶³, so it fits in a signed 64-bit integer; reduce before multiplying a third value. (With M up to 2⁶³ you need 128-bit multiplication or a mulmod routine.)
- **Division does not work directly**: (a / b) mod M ≠ (a mod M) / (b mod M). Instead multiply by the **modular inverse** of b.
- Comparisons are meaningless after reduction (a mod M < b mod M says nothing about a < b), so take maxima or minima on true values (or logarithms) before reducing.

## Fast exponentiation

Compute b^e mod M in O(log e) multiplications by squaring:

\`\`\`python
def power(b, e, m):
    r, b = 1, b % m
    while e:
        if e & 1: r = r * b % m
        b = b * b % m
        e >>= 1
    return r
\`\`\`

Python's built-in pow(b, e, m) does exactly this (and pow(b, −1, m) computes an inverse since 3.8). Each bit of e decides whether the current power of b (b, b², b⁴, …) enters the product.

- **Pow(x, n)** (LC 50): the same with floating point; handle negative n with 1/x, and the INT_MIN edge case (−n overflows in 32 bits).
- **Super Pow** (LC 372): the exponent is a huge number given as an array of digits: a^(10·e + d) = (a^e)^10 · a^d, processed digit by digit.
- **Count Good Numbers** (LC 1922): 5^(even positions) · 4^(odd positions) mod M with fast power.

## Modular inverse

The inverse of b modulo M is the x with b·x ≡ 1 (mod M). It exists iff gcd(b, M) = 1.

- **M prime (Fermat's little theorem)**: b^(M−1) ≡ 1 for b not divisible by M, so b^(M−2) is the inverse: pow(b, M − 2, M). O(log M).
- **General M**: extended Euclid on (b, M) gives b·x + M·y = 1, so x mod M is the inverse.
- **All inverses of 1..n** in O(n): inv[1] = 1, inv[i] = −(M // i) · inv[M mod i] mod M.
- **Inverse factorials**: compute fact[n], then invfact[n] = pow(fact[n], M − 2, M), and go down: invfact[i − 1] = invfact[i] · i.

## Combinations mod p

Precompute factorials and inverse factorials up to N (O(N)), then

C(n, k) = fact[n] · invfact[k] · invfact[n − k] mod p, in O(1) per query.

Alternatives:

- **Pascal's triangle** C(n, k) = C(n − 1, k − 1) + C(n − 1, k): no inverses needed, works for any modulus, O(n²) memory/time: fine for n ≤ ~5000.
- **Lucas's theorem** when n ≥ p (small prime modulus): C(n, k) ≡ Π C(n_i, k_i) over the base-p digits.
- **Non-prime modulus**: factor M, use CRT, or Pascal's triangle.

## Matrix exponentiation

Linear recurrences (Fibonacci, tribonacci, counting walks of length L, state-machine DPs) advance by a fixed matrix: v_{n} = A · v_{n−1}, so v_n = Aⁿ · v_0. Raise A to the n-th power with the same squaring loop, multiplying k × k matrices mod M: O(k³ log n). Fibonacci(10¹⁸) mod M takes about 60 squarings of a 2 × 2 matrix. Count walks of length L between nodes = (adjacency matrix)^L.

## Chinese remainder theorem (name-level)

If you know x mod m₁ and x mod m₂ with gcd(m₁, m₂) = 1, x mod (m₁·m₂) is uniquely determined and computable with an inverse. Used to combine answers computed modulo several primes, and in RSA.

## Common pitfalls

- Forgetting to reduce after a multiplication (overflow in fixed-width languages).
- Subtracting without adding M (negative results in C++/Java).
- Dividing directly, or using Fermat's inverse with a non-prime modulus.
- Taking the modulus too early when the problem needs a comparison (max path sum then mod).
- Using int for factorial tables in Java (must be long).

## Interview angles

- State the modulus rules and why division needs an inverse.
- Write fast power from memory and use it for Fermat inverses.
- Precompute factorials for many binomial queries.

## Connections

Combinatorics relies on C(n, k) mod p; DP counting problems apply the modulus at every step; hashing uses modular arithmetic; matrix power accelerates linear DPs.
`,
    doubts: [
      ["Why can't I just divide under a modulus?", "Modular arithmetic has no fractions; '÷ b' must be multiplication by an element that undoes multiplication by b. That inverse exists only if b and m are coprime, which is why moduli are chosen prime."],
      ["Why does Fermat give the inverse?", "Fermat's little theorem: b^(p−1) ≡ 1 (mod p) for prime p and b not divisible by p. So b · b^(p−2) ≡ 1."],
      ["When does a·b overflow?", "With residues below 10⁹ + 7, a·b < 1.02·10¹⁸, safe in signed 64-bit but not 32-bit. In C++ and Java convert to long long / long before multiplying."],
      ["Why is 10⁹ + 7 such a common modulus?", "It is prime (so inverses exist for every non-zero value via Fermat), it is just below 2³⁰ (sums of two values fit in a 32-bit signed int), and products of two values fit in 64 bits. 998244353 is popular for number-theoretic transforms because 998244352 = 119·2²³ has a large power of two."],
      ["How do I compute a modular answer that involves a division like n(n+1)/2?", "Either divide before reducing when you can (one of n, n + 1 is even), or multiply by the inverse of 2: n·(n + 1) mod M · inv(2) mod M, with inv(2) = (M + 1)/2 for odd prime M."],
      ["Does fast exponentiation work for negative exponents?", "Only through inverses: b^(−e) = (b^(−1))^e mod M, which requires gcd(b, M) = 1. For floating-point powers (LC 50), compute (1/x)^n instead."],
    ],
    revise: md`
? Modular subtraction? :: (a − b + m) % m.
? Why 10⁹ + 7? :: Prime; sums fit 32-bit, products fit 64-bit.
? Fast power complexity? :: O(log n).
? Inverse modulo a prime? :: b^(p−2) mod p (Fermat).
? Inverse modulo non-prime? :: Extended Euclid (needs gcd = 1).
? C(n, k) mod p fast? :: Precomputed factorials and inverse factorials.
? n ≥ p? :: Lucas' theorem.
? All inverses 1..n in O(n)? :: inv[i] = −(M // i)·inv[M mod i] mod M.
? Inverse factorials downward? :: invfact[i−1] = invfact[i]·i.
? Lucas's theorem? :: C(n, k) mod p = Π C(n_i, k_i) over base-p digits.
? Super Pow digit step? :: a^(10e + d) = (a^e)^10 · a^d.
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
## Counting without enumerating

Combinatorics turns "how many ways" questions into formulas, often replacing an exponential enumeration or a DP with an O(1) or O(n) computation. A small toolbox covers most interview problems: the product and sum rules, permutations and combinations, stars and bars, Catalan numbers, inclusion–exclusion, the pigeonhole principle, and linearity of expectation.

## Basics

- **Sum rule**: if a choice is made from one of several disjoint sets, add their sizes.
- **Product rule**: independent sequential choices multiply.
- **Permutations** of n distinct items: n!; arrangements of k out of n: P(n, k) = n!/(n − k)!.
- **Combinations**: C(n, k) = n!/(k!(n − k)!), with C(n, k) = C(n − 1, k − 1) + C(n − 1, k) (Pascal: the last item is either chosen or not) and C(n, k) = C(n, n − k).
- **Multiset permutations**: n!/(c₁!·c₂!·…) for repeated items.
- **Lattice paths**: from (0, 0) to (r, c) with right and down moves: C(r + c, r) (choose which moves go down). Unique Paths (LC 62).
- **Circular arrangements**: (n − 1)! (rotations are identical).

## Stars and bars

The number of ways to distribute n **identical** items into k **distinct** bins:

- bins may be empty: C(n + k − 1, k − 1);
- every bin non-empty: C(n − 1, k − 1).

Why: line up n stars and k − 1 bars; every arrangement is a distribution (the bars cut the stars into k groups), and there are C(n + k − 1, k − 1) ways to place the bars among n + k − 1 positions. With "non-empty", put one item in each bin first and distribute the remaining n − k.

Equivalent: the number of non-negative integer solutions of x₁ + … + x_k = n. Count Sorted Vowel Strings (LC 1641): non-decreasing strings of length n over 5 vowels = C(n + 4, 4).

## Catalan numbers

Cₙ = C(2n, n)/(n + 1): 1, 1, 2, 5, 14, 42, 132, 429, …, with the recurrence Cₙ = Σ_{i=0}^{n−1} C_i · C_{n−1−i}.

The recurrence comes from splitting at a first or root element: for binary trees with n nodes, the root's left subtree has i nodes and the right n − 1 − i. Cₙ counts:

- structurally unique BSTs with n keys (LC 96), full binary trees with n + 1 leaves;
- balanced strings of n pairs of parentheses (LC 22 generates them);
- triangulations of a convex (n + 2)-gon;
- non-crossing handshakes of 2n people around a table (LC 1259);
- monotone lattice paths that never go above the diagonal (Dyck paths): by the reflection principle, C(2n, n) − C(2n, n + 1).

## Inclusion–exclusion

|A ∪ B| = |A| + |B| − |A ∩ B|, and in general add the sizes of single sets, subtract pairwise intersections, add triple intersections, and so on.

- **Count numbers ≤ n divisible by a or b**: n/a + n/b − n/lcm(a, b). Ugly Number III (LC 1201) combines this with binary search on the answer.
- **Derangements** (no item in its original place): D(n) = n! Σ (−1)^k / k! ≈ n!/e, also D(n) = (n − 1)(D(n − 1) + D(n − 2)).
- **Surjections** from n items onto k bins: Σ (−1)^j C(k, j)(k − j)ⁿ.
- **Count subarrays/subsets avoiding a property**: total minus those with it.
- Over many conditions (up to ~20), iterate over subsets of conditions with a bitmask and alternate signs by popcount.

## Pigeonhole principle

If n + 1 items go into n boxes, some box has at least two. Consequences:

- Find the Duplicate Number (LC 287): n + 1 numbers in 1..n must repeat.
- Among any n integers, some non-empty contiguous subarray has a sum divisible by n (n prefix sums plus the zero prefix give n + 1 remainders mod n).
- Maximum Gap's bucket argument (some bucket is empty, so the maximum gap spans buckets).
- In any group of 13 people, two share a birth month.

## Probability and expectation

- **Linearity of expectation**: E[X + Y] = E[X] + E[Y] always, even when X and Y are dependent. Expected number of fixed points of a random permutation = n · (1/n) = 1.
- **Indicator variables**: write a count as a sum of 0/1 indicators and add their probabilities.
- **Geometric distribution**: expected trials until a success of probability p = 1/p. **Coupon collector**: expected draws to see all n coupons = n·H_n ≈ n ln n.
- **Expected value DP**: E[state] = cost + Σ P(next)·E[next] (Knight Probability, Soup Servings, New 21 Game).
- **Birthday paradox**: with k items in M buckets, a collision becomes likely around k ≈ √M (relevant to hashing).

## Large values

- Use a modulus with factorial tables (see modular arithmetic) for C(n, k) mod p.
- Without a modulus, Python integers are exact; compute C(n, k) by multiplying and dividing incrementally (result = result·(n − i)/(i + 1) stays an integer at each step).
- For comparisons of huge counts, compare logarithms (log-gamma).
- Quick overflow facts: 20! < 2⁶³ < 21!; C(60, 30) ≈ 1.18·10¹⁷ fits in 64 bits, C(68, 34) does not.

## Interview angles

- Translate the problem into a standard object (paths, distributions, Catalan structures) before computing.
- For "at least one" or "none of" conditions, reach for complements and inclusion–exclusion.
- Linearity of expectation solves many expected-count questions in one line.

## Connections

Counting DP when no closed form exists; modular arithmetic for large answers; probability DP for expected values; bitmask enumeration for inclusion–exclusion over many conditions.
`,
    doubts: [
      ["Why is stars and bars C(n + k − 1, k − 1)?", "Line up n stars and k − 1 bars; each arrangement splits stars into k bins. Choose the bar positions among n + k − 1 slots."],
      ["Where does the Catalan recurrence come from?", "For balanced parentheses, the first '(' matches some ')'; inside are i pairs and after are n − 1 − i pairs, independent of each other."],
      ["Why does the incremental C(n, k) computation stay an integer?", "Start with result = 1 = C(n, 0). At step i, result equals C(n, i); multiplying by (n − i) and then dividing by (i + 1) gives C(n, i + 1), an integer, so the division is exact as long as you multiply first."],
      ["How do I count distributions where bins have upper limits?", "Apply inclusion–exclusion over the bins that exceed their limit: for each subset S of bins, pre-fill each bin in S with (limit + 1) items and count the rest with stars and bars, alternating signs by |S|. Or use a counting DP when limits vary."],
      ["Is linearity of expectation valid for dependent events?", "Yes, that is its power: E[Σ X_i] = Σ E[X_i] needs no independence. Independence matters for variances and products, not for sums of expectations."],
    ],
    revise: md`
? C(n, k) without division? :: Pascal's triangle.
? Stars and bars (possibly empty bins)? :: C(n + k − 1, k − 1).
? Grid paths R × C? :: C(R + C, R).
? Catalan formula? :: C(2n, n)/(n + 1).
? Things counted by Catalan? :: Balanced parentheses, BST shapes, triangulations, Dyck paths.
? 'At least one' trick? :: Total − none.
? Pigeonhole application to subarrays? :: Among n + 1 prefix sums mod n, two are equal.
? Dyck paths via reflection? :: C(2n, n) − C(2n, n + 1).
? Surjections onto k bins? :: Σ (−1)^j C(k, j)(k − j)ⁿ.
? Ugly Number III? :: Inclusion–exclusion count ≤ x + binary search on x.
? Exact C(n, k) incrementally? :: result = result·(n − i)/(i + 1), integer at every step.
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
## Integer geometry first

Interview geometry problems are mostly about points, lines and rectangles with integer coordinates. The two rules that prevent most bugs: **use integer arithmetic** (cross products, squared distances, reduced fractions) instead of floating-point slopes and square roots, and **reason with orientation** (left turn, right turn, collinear) instead of angles.

## The cross product and orientation

For points o, a, b:

cross(o, a, b) = (a.x − o.x)·(b.y − o.y) − (a.y − o.y)·(b.x − o.x)

- > 0: o → a → b turns **counter-clockwise** (b is to the left of the directed line o→a).
- < 0: clockwise (b is to the right).
- = 0: the three points are collinear.

It equals twice the signed area of triangle oab, and it is exact in integers (no rounding).

\`\`\`python
def cross(o, a, b):
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
\`\`\`

The **dot product** (a − o)·(b − o) tells whether the angle at o is acute (> 0), right (= 0) or obtuse (< 0).

## Uses of orientation

- **Segment intersection**: segments AB and CD intersect iff A and B are on different sides of CD and C and D are on different sides of AB (orientation signs differ), plus collinear cases where an endpoint lies on the other segment (check with bounding boxes).
- **Polygon area (shoelace formula)**: area = |Σ (x_i·y_{i+1} − x_{i+1}·y_i)| / 2 over consecutive vertices (wrapping around). The sign of the sum gives the orientation (counter-clockwise positive).
- **Convex polygon test**: all consecutive cross products have the same sign (Convex Polygon, LC 469).
- **Point in polygon**: ray casting (count how many edges a horizontal ray from the point crosses: odd = inside) or the winding number; for convex polygons, check that the point is on the same side of every edge, or binary search in O(log n).
- **Convex hull**: Andrew's monotone chain: sort points by (x, y); build the lower hull left to right, popping the last point while the turn is not counter-clockwise (cross ≤ 0); build the upper hull right to left the same way; concatenate. O(n log n). **Erect the Fence** (LC 587) wants collinear boundary points too: pop only when cross < 0. Graham scan sorts by angle instead.
- **Rotating calipers** on the hull: farthest pair of points (diameter), minimum-width enclosing strip.

## Interview problems

- **Max Points on a Line** (LC 149): for each anchor point, count the other points by direction. Represent a direction as the reduced pair (dy/g, dx/g) with g = gcd(|dy|, |dx|), normalised so dx > 0 (or dx = 0 and dy = 1): floats like 0.1 + 0.2 lose precision and vertical lines need special cases. Add duplicates of the anchor to every count. O(n²).
- **Valid Square** (LC 593): the six pairwise squared distances must be four equal positive sides and two equal diagonals (twice the side).
- **Minimum Area Rectangle** (LC 939, axis-aligned): store points in a set; for every pair as opposite corners (different x and y), check the other two corners exist. O(n²).
- **Minimum Area Rectangle II** (LC 963, any orientation): group pairs of points by (midpoint, length): two diagonals with the same midpoint and length form a rectangle.
- **Rectangle Overlap** (LC 836): overlap iff the x-intervals and y-intervals both overlap with positive length: min(x2, x4) > max(x1, x3) and the same for y. **Rectangle Area** (LC 223): sum of areas minus the intersection area (max(0, …) per axis).
- **K Closest Points to Origin** (LC 973): squared distances, heap or quickselect.
- **Check If It Is a Straight Line** (LC 1232): every cross product with the first two points is 0.
- **Maximum Number of Visible Points** (LC 1610): convert to angles with atan2, sort, duplicate the list with +360°, sliding window of width "angle"; points at the observer's location are always visible (count separately).
- **Detect Squares** (LC 2013): count points; for a query point, try each point with the same x as a side and check the two other corners' counts.
- **Largest Triangle Area** (LC 812): shoelace over all triples, O(n³) for small n.
- **Minimum Time Visiting All Points** (LC 1266): Chebyshev distance max(|dx|, |dy|) between consecutive points.

## Floating point

When floats are unavoidable (angles, real distances, circles):

- compare with a tolerance ε (|a − b| < 1e−9) instead of ==;
- prefer atan2(y, x) over atan(y/x) (correct quadrants, no division by zero);
- avoid subtracting nearly equal large numbers (catastrophic cancellation);
- keep everything squared as long as possible (compare d² instead of d).

## Distances

- Euclidean √(dx² + dy²): compare squared values.
- Manhattan |dx| + |dy|: rotating coordinates (u = x + y, v = x − y) turns it into Chebyshev max(|du|, |dv|), which makes "maximum Manhattan distance" problems easy (max of u and v ranges).
- Chebyshev max(|dx|, |dy|): king moves on a board.

## Interview angles

- Say "I will use the cross product to stay in integers".
- Normalise directions with gcd and a sign convention.
- Handle duplicates and collinear points explicitly.

## Connections

GCD for slope normalisation, sorting for hulls and angular sweeps, sliding windows over angles, sweep lines for rectangle unions.
`,
    doubts: [
      ["Why normalise slopes by gcd instead of using dy/dx floats?", "Floating-point division loses precision: two different slopes can round to the same double and equal slopes can differ in the last bit. A reduced (dy, dx) pair with a sign convention is exact."],
      ["What does the sign of the cross product mean?", "It is twice the signed area of triangle ABC: positive when C is to the left of the directed line A→B (counter-clockwise), negative to the right, zero on the line."],
      ["How do I check whether a point lies on a segment exactly?", "It must be collinear with the endpoints (cross product 0) and inside their bounding box: min(x1, x2) ≤ x ≤ max(x1, x2) and the same for y. Both checks are integer-exact."],
      ["Why does monotone chain sort by (x, y) instead of by angle?", "Sorting by coordinates is exact with integers and needs no reference point or angle computation. The lower and upper hulls are each monotone in x, so a stack with the orientation test builds each in one pass."],
      ["What is the shoelace formula's sign used for?", "A positive sum means the vertices are listed counter-clockwise, negative means clockwise. Many algorithms (point-in-polygon tests, hull outputs, polygon clipping) assume one orientation, so you can reverse the list if the sign is wrong."],
    ],
    revise: md`
? Orientation test? :: Sign of (B − A) × (C − A).
? Shoelace area? :: |Σ (xᵢyᵢ₊₁ − xᵢ₊₁yᵢ)| / 2.
? Convex hull algorithm? :: Andrew's monotone chain, O(n log n).
? Max points on a line slope key? :: Reduced (dy, dx) with a sign convention.
? Rectangle overlap per axis? :: max(0, min(right) − max(left)).
? Erect the Fence hull pop condition? :: Pop only when cross < 0 (keep collinear boundary points).
? Minimum Area Rectangle II? :: Group point pairs by (midpoint, length) of the diagonal.
? Manhattan → Chebyshev? :: u = x + y, v = x − y; distance = max(|du|, |dv|).
? Visible points angular sweep? :: Sort atan2 angles, append +360° copies, sliding window.
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
## Why randomness

Randomised algorithms use random choices to get simplicity, good expected performance on every input, or fairness (uniform sampling). Interview problems split into two groups: **sampling** (shuffle, pick uniformly or by weight, sample from a stream, generate one distribution from another) and **randomised algorithms** (quickselect, treaps, hashing). In both, the key skill is proving that each outcome has the intended probability.

## Fisher–Yates shuffle (LC 384)

To shuffle an array uniformly (every permutation with probability 1/n!):

\`\`\`python
import random
def shuffle(a):
    for i in range(len(a) - 1, 0, -1):
        j = random.randint(0, i)          # inclusive: j may equal i
        a[i], a[j] = a[j], a[i]
\`\`\`

Each step chooses which remaining element goes to position i, uniformly among the i + 1 candidates, so the number of equally likely execution paths is n·(n − 1)·…·1 = n!, one per permutation. O(n).

**The naive bug**: swapping a[i] with a random index from the whole array (j in [0, n − 1]) for every i produces nⁿ equally likely paths, and since nⁿ is not divisible by n! (for n ≥ 3), some permutations must be more likely than others. Choosing j in [0, i − 1] (excluding i) is also wrong: it only produces cyclic permutations (Sattolo's algorithm).

## Reservoir sampling (LC 382, LC 398)

Pick k items uniformly from a stream of unknown length, in one pass with O(k) memory.

k = 1: keep the first item; when the i-th item arrives (1-based), replace the kept item with it with probability 1/i.

**Proof**: item i is chosen when it arrives with probability 1/i, and survives each later step j with probability (1 − 1/j) = (j − 1)/j. The product telescopes: (1/i)·(i/(i + 1))·…·((n − 1)/n) = 1/n. Every item ends with probability 1/n.

General k: keep the first k; the i-th item (i > k) enters with probability k/i, replacing a uniformly random kept item. Each item ends with probability k/n.

- **Linked List Random Node** (LC 382): one pass with k = 1, O(1) memory, no need to know the length.
- **Random Pick Index** (LC 398): among positions where the value equals the target, reservoir-sample one (count matches as you go).

## Weighted random pick (LC 528)

Pick index i with probability w[i] / Σw.

1. Prefix sums: P[i] = w[0] + … + w[i].
2. Draw r uniformly in [1, total] (integers) or [0, total) (reals).
3. Binary search the first i with P[i] ≥ r.

O(n) preprocessing, O(log n) per pick. Each index owns an interval of length w[i] on the line [1, total], so it is hit with probability proportional to its weight.

- **Alias method** (Walker/Vose): O(n) preprocessing into n "buckets" each holding at most two outcomes, then O(1) per pick. Best for very many picks.
- **Random Point in Non-overlapping Rectangles** (LC 497): weight each rectangle by its number of integer points ((x2 − x1 + 1)·(y2 − y1 + 1)), pick a rectangle by weight, then a uniform point inside it. Weighting by area instead of point count is the classic bug.
- **Weighted pick with updates**: a Fenwick tree over weights and a descent: O(log n) per update or pick.

## Rejection sampling (LC 470)

Build rand10() from rand7(): two calls give a uniform number in 1..49: idx = (rand7() − 1)·7 + rand7(). Accept if idx ≤ 40 and return (idx − 1) % 10 + 1 (each of 1..10 gets exactly 4 of the 40 accepted values); otherwise retry. The acceptance probability is 40/49, so the expected number of rand7 calls is 2 · 49/40 ≈ 2.45. Reusing the rejected remainder (41..49 gives a uniform value in 1..9) lowers the expected calls further.

- **Random point in a circle** (LC 478): sample (x, y) uniformly in the bounding square and reject points outside the circle (acceptance π/4 ≈ 0.785); or use polar coordinates with radius R·√u (not R·u: area grows with r², so a uniform radius would crowd points near the centre) and a uniform angle.
- **Uniform point on a sphere**: normalise a vector of three standard normal samples.

## Randomised algorithms

- **Las Vegas**: always correct, running time random (quicksort and quickselect with random pivots, randomised hashing, treaps). The guarantee is on expected time.
- **Monte Carlo**: fixed time, answer correct with high probability (Miller–Rabin primality, Freivalds' matrix product check, Karger's min cut, Bloom filters). Repeat to reduce the error exponentially.
- **Randomisation against adversaries**: random hash seeds (hash flooding), random pivots (sorted input), random priorities (treaps).
- **Hashing tricks**: random bases in rolling hashes; random 64-bit labels XORed together to fingerprint sets or multisets (Zobrist hashing).

## Insert Delete GetRandom O(1) (LC 380)

Array plus value → index map; delete by moving the last element into the hole; getRandom is a uniform index (see its own page). With duplicates (LC 381), value → set of indices.

## Testing randomised code

Run many trials and compare frequencies with the expected distribution (a chi-squared test, or at least eyeballing that counts are within a few standard deviations). For shuffles, count how often each permutation of a 3-element array appears over 60,000 runs: each should appear about 10,000 times.

## Interview angles

- Prove uniformity: count equally likely paths (Fisher–Yates) or telescope probabilities (reservoir).
- Point out the classic bugs: naive shuffle, area vs point-count weighting, uniform radius in a circle.
- State the expected number of calls in rejection sampling.

## Connections

Prefix sums and binary search (weighted picks), Fenwick trees (dynamic weights), quickselect and treaps (randomised algorithms), hashing (random seeds).
`,
    doubts: [
      ["Why is the naive shuffle biased?", "It produces n^n equally likely swap sequences. n! does not divide n^n for n ≥ 3, so some permutations must occur more often than others."],
      ["Why does reservoir sampling give 1/n?", "Item i is chosen with probability 1/i and then survives each later step j with probability 1 − 1/j. The product telescopes: (1/i)·(i/(i+1))·…·((n−1)/n) = 1/n."],
      ["Why √u for a random radius?", "Area grows with r², so choosing r uniformly crowds points near the centre. r = R√u makes the area below r uniform."],
      ["Why does the naive shuffle have to be biased?", "It makes n independent choices of n options each, so there are nⁿ equally likely execution paths. For n ≥ 3, nⁿ is not divisible by n! (n − 1 divides n! but not nⁿ), so the paths cannot be split evenly among the n! permutations."],
      ["Does reservoir sampling need to know the stream length?", "No: it only uses the count of items seen so far. That is the point: one pass, O(k) memory, valid at every moment (the current reservoir is a uniform sample of the prefix seen)."],
      ["How do I generate a random number in [0, n) from random bits without bias?", "Taking random() % n is biased when the range of the generator is not a multiple of n. Use rejection: draw from the largest multiple of n that fits and reject values above it, or use the language's randint, which already does this."],
    ],
    revise: md`
? Fisher–Yates loop? :: i from n−1 down; swap with random index in [0, i].
? Reservoir sampling rule? :: Keep the i-th item with probability 1/i (k/i for k items).
? Weighted pick? :: Prefix sums + binary search (alias method for O(1)).
? rand10 from rand7? :: Uniform 1..49, accept ≤ 40, retry otherwise.
? Uniform point in a circle? :: r = R√u, angle uniform (or rejection from the square).
? Las Vegas vs Monte Carlo? :: Always correct with random time vs fixed time with small error.
? Sattolo's algorithm? :: j in [0, i−1] (excluding i): produces only cyclic permutations.
? Reservoir with k items? :: Item i > k enters with probability k/i, replacing a random kept item.
? Alias method? :: O(n) preprocessing into two-outcome buckets, O(1) per pick.
? LC 497 weighting? :: By the number of integer points, not by area.
`,
    pitfalls: ["Swapping with any index in shuffle", "Uniform radius in circle sampling", "Modulo bias when mapping random ranges"],
    quiz: [Q("Reservoir sampling keeps the 5th item with probability…", ["1/2", "*1/5", "1/4", "5/n"], "1/i at step i.")],
    sources: [S.article("Fisher–Yates shuffle", "Wikipedia", "https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle"), S.article("Reservoir sampling", "Wikipedia", "https://en.wikipedia.org/wiki/Reservoir_sampling"), S.article("Alias method", "Wikipedia", "https://en.wikipedia.org/wiki/Alias_method"), S.article("Rejection sampling", "Wikipedia", "https://en.wikipedia.org/wiki/Rejection_sampling")],
    problems: [384, 382, 398, 528, 470, 478, 380, 710],
  },
};
