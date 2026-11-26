import { md } from "@/content/ai/md";
import { Q } from "@/content/h";
import { S, type Deep } from "../types";

/** Dynamic programming: foundations, 1D, 2D, knapsack and advanced families. */
export const dp: Record<string, Deep> = {
  "dp-foundations": {
    blurb: "How to derive any DP instead of recalling it: brute-force recursion, find the changing parameters (the state), memoise, flip to a table, then compress space. Plus how to recognise DP and talk about it.",
    signals: ["Count the ways, find the minimum or maximum, decide feasibility", "Choices at each step, and the same subproblems recur", "Brute force recursion is exponential but has few distinct arguments"],
    lesson: md`
## The two ingredients

- **Optimal substructure**: the best answer is built from best answers to smaller subproblems.
- **Overlapping subproblems**: the same subproblems recur many times in the brute-force recursion.

Divide and conquer has the first but not the second (merge sort's halves never repeat), which is why it needs no memo.

## The derivation path (say it out loud)

1. **Brute-force recursion.** Define f(args) as the answer for a subproblem and write the choices. Fibonacci-like problems: f(i) = f(i − 1) + f(i − 2).
2. **State.** The arguments that change are the state. Count states: this is the size of the memo.
3. **Memoise** (top-down). Cache f by its arguments. Complexity = states × work per state.
4. **Tabulate** (bottom-up). Fill a table in an order where dependencies come first.
5. **Compress space.** If row i only needs rows i − 1 (and i − 2), keep only those.
6. **Reconstruct** the solution (not just its value) by storing choices or walking the table backwards.

Interviewers value this path more than a memorised recurrence: it shows you could solve an unseen DP.

## Top-down vs bottom-up

| | Top-down (memo) | Bottom-up (table) |
|---|---|---|
| Writing it | directly from the recursion | needs a fill order |
| Computes | only reachable states | all states |
| Overhead | recursion and hashing | tight loops |
| Risks | recursion depth | wasted work on unreachable states |
| Space optimisation | hard | easy (rolling arrays) |

In Python, \`functools.cache\` turns a recursive function into a memoised one; beware the recursion limit for deep states.

## Designing the state

- **Prefix / suffix index**: dp[i] = best for the first i elements (or from i to the end).
- **Two indices**: two sequences (dp[i][j]) or an interval (dp[l][r]).
- **Index + small extra**: holding a stock or not, last colour used, remaining budget, number of transactions left.
- **Bitmask** of used elements when n ≤ 20.
- **Tree node** (+ whether it is chosen).

If two situations with the same state could have different futures, the state is missing information. If the state includes information that never matters, it is bloated.

## Recognising DP

- "Number of ways", "minimum cost", "maximum value", "is it possible" with choices.
- Greedy feels plausible but counterexamples exist (coin change with coins {1, 3, 4} and amount 6: greedy 4 + 1 + 1, optimal 3 + 3).
- Constraints like n ≤ 1000 for O(n²) or n·W ≤ 10⁷.

## Complexity

Time = number of states × transitions per state. Space = number of states (or less with rolling arrays). State this formula explicitly.

## Common bugs

- Wrong base cases (empty prefix, zero amount).
- Wrong iteration order (reading a cell before it is computed).
- Using −1 as "not computed" when −1 is a valid answer (use None or a separate visited array).
- Integer overflow in counts (use mod 10⁹ + 7 when asked).
`,
    doubts: [
      ["How do I find the state when I'm stuck?", "Write the brute-force recursion first, even if it is exponential. Its parameters are the candidate state. Then ask whether any parameter can be dropped (it is determined by the others) or must be added (two calls with equal parameters behave differently)."],
      ["Top-down or bottom-up in an interview?", "Start top-down: it follows the recursion you just explained and is less error-prone. Offer bottom-up and space compression as the optimisation step."],
      ["What is the difference between DP and greedy?", "Greedy commits to one choice at each step using a local rule; DP considers all choices and keeps the best of each subproblem. Greedy is correct only when an exchange argument proves the local choice safe."],
      ["Why does memoised Fibonacci go from O(2ⁿ) to O(n)?", "There are only n distinct arguments; each is computed once and then read from the cache. The exponential tree of calls collapses into a chain."],
      ["When does memoisation not help?", "When subproblems do not repeat (merge sort, quicksort) or when the state space itself is exponential (all permutations) with little overlap."],
    ],
    revise: md`
? Two DP ingredients? :: Optimal substructure and overlapping subproblems.
? Derivation path? :: Recursion → state → memo → table → space compression → reconstruction.
? DP complexity formula? :: States × transitions per state.
? Top-down pro and con? :: Computes only reachable states; recursion depth risk.
? Bottom-up pro? :: Tight loops and easy rolling-array space savings.
? Greedy coin change counterexample? :: Coins {1, 3, 4}, amount 6: greedy 3 coins, optimal 2.
? Memo sentinel bug? :: Using −1 when −1 is a valid answer.
`,
    pitfalls: ["Jumping to a table without explaining the recursion", "Missing state information", "Wrong fill order", "Recursion limits with top-down in Python"],
    quiz: [
      Q("A memoised recursion has n·m states and O(k) work per state. Time?", ["O(n + m + k)", "*O(n·m·k)", "O(n·m)", "O(k^n)"], "States × transitions."),
      Q("Merge sort is not DP because…", ["it is not recursive", "*its subproblems do not overlap", "it has no optimal substructure", "it is greedy"], "Halves never repeat."),
    ],
    sources: [S.book("Algorithms, chapter 3: Dynamic Programming", "Jeff Erickson", "https://jeffe.cs.illinois.edu/teaching/algorithms/book/03-dynprog.pdf"), S.course("MIT 6.006 Spring 2020, Lectures 15–18: Dynamic Programming (SRTBOT)", "MIT OpenCourseWare", "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/"), S.book("Introduction to Algorithms (CLRS), ch. 14: Dynamic Programming", "Cormen, Leiserson, Rivest, Stein", "https://mitpressbookstore.mit.edu/book/9780262046305"), S.article("functools.cache", "Python documentation", "https://docs.python.org/3/library/functools.html#functools.cache")],
    problems: [509, 70, 1137],
  },
  "linear-dp": {
    blurb: "One index, a few look-backs: climbing stairs, house robber, decode ways, minimum cost tickets. The bread-and-butter DP family and its rolling-variable form.",
    signals: ["dp[i] depends on dp[i − 1], dp[i − 2] or a few earlier entries", "Choose or skip each element with an adjacency rule", "Count ways to parse or decode a sequence"],
    widgets: ["lis"],
    lesson: md`
## Climbing Stairs (LC 70)

ways[i] = ways[i − 1] + ways[i − 2]: the last step was 1 or 2. Fibonacci in disguise. With steps from a set S: ways[i] = Σ ways[i − s].

## House Robber (LC 198)

best[i] = max(best[i − 1], best[i − 2] + a[i]): skip house i, or rob it and skip i − 1. Two rolling variables, O(n) time, O(1) space.

- **House Robber II** (LC 213, circular): run twice, excluding the first house or the last.
- **House Robber III** (LC 337, tree): return (rob this node, skip it) from each subtree.
- **Delete and Earn** (LC 740): bucket points by value, then House Robber over values.

## Decode Ways (LC 91)

ways[i] for the prefix of length i: add ways[i − 1] if s[i − 1] is '1'..'9', add ways[i − 2] if s[i − 2..i − 1] is "10".."26". Zeros are the trap: "06" is invalid, "10" and "20" are valid, "30" is not. Decode Ways II (LC 639) adds '*' with case analysis.

## Minimum cost families

- **Min Cost Climbing Stairs** (LC 746): cost[i] + min of the two previous.
- **Minimum Cost For Tickets** (LC 983): dp over days; at each travel day, the best of a 1-, 7- or 30-day pass bought ending today (look back 1, 7 or 30 days).
- **Paint House** (LC 256): dp[i][colour] = cost + min over other colours of dp[i − 1][·]; with k colours (LC 265), track the smallest and second-smallest of the previous row for O(nk).
- **Solving Questions With Brainpower** (LC 2140): solve from the right: dp[i] = max(dp[i + 1], points + dp[i + skip + 1]).

## Look-back over a range

When dp[i] needs max/min of dp over [i − k, i − 1], use a monotonic deque (see deque-optimised DP). When it needs a sum over a range, keep a prefix sum of dp (e.g. New 21 Game, LC 837: sliding window sum of probabilities).

## Counting with mod

Number-of-ways problems overflow quickly; take results modulo 10⁹ + 7 at every addition.
`,
    doubts: [
      ["Why does House Robber II run twice?", "In a circle, the first and last houses are adjacent, so at most one of them is robbed. Excluding the first or excluding the last covers every valid choice, and each case is a straight line."],
      ["What makes Decode Ways tricky?", "Zeros. A '0' cannot stand alone, so ways[i − 1] is not added; it only works as the second digit of '10' or '20'. A string like '100' has zero decodings."],
      ["How do I get O(nk) for Paint House II?", "For each house, the best previous total for colour c is the global minimum of the previous row unless that minimum used colour c, in which case use the second minimum. Track both per row."],
    ],
    revise: md`
? House Robber recurrence? :: best[i] = max(best[i−1], best[i−2] + a[i]).
? Circular House Robber? :: max(run without first, run without last).
? Delete and Earn reduction? :: Sum points per value, then House Robber over values.
? Decode Ways transitions? :: +ways[i−1] if s[i−1] ≠ '0'; +ways[i−2] if s[i−2..i−1] in 10..26.
? Min cost tickets look-back? :: 1, 7 and 30 days.
? Paint House II in O(nk)? :: Track min and second min of the previous row.
`,
    pitfalls: ["Zeros in Decode Ways", "Forgetting the circular case", "Missing the modulo", "O(nk²) Paint House when O(nk) is expected"],
    quiz: [Q("Number of decodings of '226'?", ["2", "*3", "4", "1"], "2|2|6, 22|6, 2|26.")],
    sources: [S.book("Algorithms, chapter 3: Dynamic Programming", "Jeff Erickson", "https://jeffe.cs.illinois.edu/teaching/algorithms/book/03-dynprog.pdf"), S.article("Dynamic programming (introductory patterns)", "USACO Guide", "https://usaco.guide/gold/intro-dp")],
    problems: [70, 198, 213, 337, 740, 91, 639, 746, 983, 256, 265, 2140, 837],
  },
  "state-machine-dp": {
    blurb: "Model each day as a transition between a few states (holding, not holding, cooling down, transactions left). The six stock problems become one template.",
    signals: ["Buy/sell stock with rules (cooldown, fee, k transactions)", "Each step you are in one of a few modes", "Flip a binary string to a monotone form"],
    lesson: md`
## The template

Define the states and how one day moves between them. For stocks with unlimited transactions:

- hold = max(hold, free − price)   (keep holding, or buy today)
- free = max(free, hold + price)   (stay free, or sell today)

Start with hold = −∞ (or −prices[0]) and free = 0. Answer: free.

## The six stock problems

| Problem | States | Twist |
|---|---|---|
| I (LC 121): one transaction | min price so far | max(price − minSoFar) |
| II (LC 122): unlimited | hold, free | sum all positive daily gains |
| III (LC 123): at most 2 | buy1, sell1, buy2, sell2 | four variables in order |
| IV (LC 188): at most k | buy[j], sell[j] for j ≤ k | if k ≥ n/2, it is problem II |
| Cooldown (LC 309) | hold, sold, rest | sold → rest before buying |
| Fee (LC 714) | hold, free | subtract fee on sell |

For k transactions: buy[j] = max(buy[j], sell[j − 1] − price), sell[j] = max(sell[j], buy[j] + price), j from 1 to k. O(nk).

## Why updating in place works

Updating buy before sell within the same day lets you buy and sell on the same day, which has zero profit and never hurts. Some variants (cooldown) need the previous day's values: keep copies.

## Other state machines

- **Flip String to Monotone Increasing** (LC 926): states "all zeros so far" and "ones started".
- **Count vowels permutation** (LC 1220): states = last vowel, transitions from the rules.
- **Knight dialer** (LC 935): states = digit, transitions = knight moves.
- **Student attendance record** (LC 552): states (absences used, consecutive lates).
- **Wiggle subsequence** (LC 376): states "last move up" and "last move down".

Small state machines with many steps can also be run with **matrix exponentiation** in O(S³ log n).
`,
    doubts: [
      ["Why is k ≥ n/2 the same as unlimited transactions?", "A transaction needs at least two days (buy, then sell), so at most n/2 profitable transactions can happen. With k at least that, the limit never binds."],
      ["Cooldown: which values must come from yesterday?", "Buying today must use yesterday's 'rest' (not 'sold'), so compute the new values from the previous day's copies rather than updating in place."],
      ["Is Stock II's 'sum of positive differences' greedy or DP?", "Both views agree: with unlimited transactions you capture every upward move. The state machine proves it; the greedy is its simplification."],
    ],
    revise: md`
? Unlimited stock template? :: hold = max(hold, free − p); free = max(free, hold + p).
? One transaction? :: Track min price; max of p − min.
? At most k? :: buy[j], sell[j] for j = 1..k; O(nk); k ≥ n/2 → unlimited.
? Cooldown? :: States hold, sold, rest; buy only from rest.
? Fee? :: Subtract the fee when selling.
? Many steps, few states? :: Matrix exponentiation.
`,
    pitfalls: ["In-place updates where yesterday's values are needed", "Huge k with O(nk) memory (check k ≥ n/2)", "Initial hold of 0 instead of −∞"],
    quiz: [Q("Stock II on [7,1,5,3,6,4] (unlimited) profit?", ["5", "*7", "6", "4"], "(5−1) + (6−3).")],
    sources: [S.book("Algorithms, chapter 3: Dynamic Programming", "Jeff Erickson", "https://jeffe.cs.illinois.edu/teaching/algorithms/book/03-dynprog.pdf"), S.article("Finite-state machine", "Wikipedia", "https://en.wikipedia.org/wiki/Finite-state_machine")],
    problems: [121, 122, 123, 188, 309, 714, 926, 1220, 935, 552, 376],
  },
  lis: {
    blurb: "Longest increasing subsequence in O(n²) DP and O(n log n) patience sorting, reconstruction, counting, and the disguises: Russian dolls, longest chain, minimum deletions.",
    signals: ["Longest strictly increasing (or non-decreasing) subsequence", "Nesting envelopes or boxes", "Minimum removals to make a sequence sorted", "Longest chain of pairs"],
    widgets: ["lis"],
    lesson: md`
## O(n²) DP

lis[i] = 1 + max(lis[j]) over j < i with a[j] < a[i] (or 1). Answer: max over i. Simple and fine for n ≤ 5000.

## O(n log n): tails array

tails[k] = the **smallest possible tail** of an increasing subsequence of length k + 1. For each x, binary search the first tail ≥ x (lower_bound) and replace it with x, or append x if it is larger than all tails. The length of tails is the LIS length.

[[widget:lis]]

Why it works: tails is always strictly increasing, and keeping each tail as small as possible maximises the chance to extend. **tails is not the LIS itself**; it is a set of best endings.

- Non-decreasing subsequence: use upper_bound instead of lower_bound.
- Reconstruction: store, for each element, the index of the previous element (the element at tails[k − 1] when x was placed), then walk back from the last.

This is **patience sorting**: dealing cards onto piles where each card goes on the leftmost pile whose top is ≥ it; the number of piles is the LIS length.

## Disguises

- **Russian Doll Envelopes** (LC 354): sort by width ascending and **height descending** for equal widths, then LIS on heights. The descending tie-break stops two envelopes with the same width from nesting.
- **Maximum Length of Pair Chain** (LC 646): greedy by end (interval scheduling) or LIS.
- **Minimum deletions to make sorted** = n − LIS. **Minimum Number of Removals to Make Mountain Array** (LC 1671): LIS from the left and from the right at each peak.
- **Longest Divisible Subset** (LC 368): sort; O(n²) DP with divisibility instead of <.
- **Number of LIS** (LC 673): track count alongside length in the O(n²) DP (or a Fenwick tree for O(n log n)).
- **Longest string chain** (LC 1048): DP over words sorted by length with predecessor lookup by deleting one letter.
- **Minimum operations to make a subsequence** (LC 1713): map to indices, LIS.

## Relation to LCS

LIS(a) = LCS(a, sorted unique a). And LCS of two permutations reduces to LIS after relabelling (O(n log n)).
`,
    doubts: [
      ["Why is tails not the actual subsequence?", "Replacing a tail with a smaller value can put a later element before earlier ones in the array. tails records the best end value for each length, not one consistent subsequence. Reconstruction needs parent pointers."],
      ["Why sort heights descending for equal widths in Russian dolls?", "Envelopes with equal widths cannot nest. Sorting their heights descending ensures the LIS on heights cannot pick two of them (it needs strictly increasing heights)."],
      ["lower_bound or upper_bound?", "Strictly increasing: lower_bound (replace the first tail ≥ x). Non-decreasing: upper_bound (replace the first tail > x), so equal values can extend."],
    ],
    revise: md`
? O(n²) recurrence? :: lis[i] = 1 + max lis[j] for j < i with a[j] < a[i].
? tails[k] means? :: Smallest tail of an increasing subsequence of length k + 1.
? Update per element? :: Replace the first tail ≥ x (lower_bound), else append.
? Non-decreasing variant? :: upper_bound.
? Russian dolls sort? :: Width asc, height desc; LIS on heights.
? Minimum deletions to sort? :: n − LIS.
? Number of LIS? :: Track (length, count) per index.
`,
    pitfalls: ["Returning tails as the LIS", "Wrong tie-break in Russian dolls", "Using lower_bound for non-decreasing"],
    quiz: [
      Q("LIS length of [10,9,2,5,3,7,101,18]?", ["3", "*4", "5", "6"], "2, 3, 7, 18."),
      Q("In Russian Doll Envelopes, equal widths are sorted by height…", ["ascending", "*descending", "either", "they are removed"], "So two equal widths cannot both be chosen."),
    ],
    sources: [S.article("Longest increasing subsequence", "cp-algorithms", "https://cp-algorithms.com/sequences/longest_increasing_subsequence.html"), S.article("Patience sorting", "Wikipedia", "https://en.wikipedia.org/wiki/Patience_sorting"), S.paper("Longest increasing subsequences: from patience sorting to the Baik–Deift–Johansson theorem (Aldous & Diaconis, 1999)", "Bulletin of the AMS", "https://doi.org/10.1090/S0273-0979-99-00796-X")],
    problems: [300, 354, 646, 673, 368, 1048, 1671, 1713],
  },
  "partition-dp": {
    blurb: "Can the sequence be cut into valid pieces, and what is the best way to cut it? dp[i] over prefixes with a loop over the last piece: word break, palindrome cuts, splitting arrays.",
    signals: ["Segment a string into dictionary words", "Minimum cuts so every piece is a palindrome", "Split an array into k parts optimising a score", "Partition with a cost per piece"],
    lesson: md`
## The shape

dp[i] = best answer for the prefix of length i, computed by choosing the **last piece** s[j..i):

dp[i] = combine over j < i of (dp[j] ⊕ cost(j, i)) where s[j..i) is valid.

O(n²) transitions (times the cost of the validity check).

## Word Break (LC 139)

ok[i] = any ok[j] with s[j:i] in the dictionary. Speed-ups: limit j to i − maxWordLength; use a set of words; or walk a trie from j forward. O(n · L) with the length limit.

**Word Break II** (LC 140) lists all sentences: memoise start → list of sentences (output can be exponential).

## Palindrome Partitioning II (LC 132)

cuts[i] = min over j with s[j..i] palindrome of cuts[j − 1] + 1. Precompute isPal in O(n²), or expand around each centre and update cuts during expansion: O(n²) time, O(n) space.

## Splitting arrays into k parts

- **Split Array Largest Sum** (LC 410): dp[i][k] = min over j of max(dp[j][k − 1], sum(j..i)): O(n² k). Binary search on the answer with a greedy check is O(n log sum) and is the better interview answer.
- **Minimum Difficulty of a Job Schedule** (LC 1335): dp[i][d] with the max of the last piece; O(n² d), improvable with a monotonic stack.
- **Partition Array for Maximum Sum** (LC 1043): last piece of length ≤ k, value = length × max.
- **Minimum cost to cut a stick** is interval DP, not partition DP (the cut order matters).

## Partition DP vs interval DP

Partition DP cuts a prefix: one index (plus maybe a part count). Interval DP chooses an operation on a whole interval and recurses on both sides: two indices, O(n³). If pieces are independent once chosen, it is partition DP.
`,
    doubts: [
      ["Why limit the last word's length in Word Break?", "No dictionary word is longer than maxLen, so j < i − maxLen can never succeed. This turns O(n²) substring checks into O(n · maxLen)."],
      ["Should Split Array Largest Sum be DP or binary search?", "Both are correct. DP is O(n² k); binary search on the answer with a greedy feasibility check is O(n log(sum)) and simpler. Mention DP, implement binary search."],
    ],
    revise: md`
? Partition DP shape? :: dp[i] over prefixes, loop over the last piece s[j..i).
? Word Break speed-up? :: Only j ≥ i − maxWordLen; dictionary in a set (or trie).
? Palindrome min cuts? :: cuts[i] = min cuts[j−1] + 1 over palindromic s[j..i].
? Split into k parts minimising the max? :: Binary search + greedy (or O(n²k) DP).
? Partition vs interval DP? :: Prefix cuts (1 index) vs operations inside an interval (2 indices).
`,
    pitfalls: ["Substring creation inside loops (O(n) each)", "Recomputing palindromes", "Off-by-one between dp indices and string indices"],
    quiz: [Q("Minimum palindrome cuts for 'aab'?", ["0", "*1", "2", "3"], "'aa' | 'b'.")],
    sources: [S.article("Word break / text segmentation", "Wikipedia", "https://en.wikipedia.org/wiki/Text_segmentation"), S.book("Algorithms, chapter 3: Dynamic Programming (§3.4 text segmentation)", "Jeff Erickson", "https://jeffe.cs.illinois.edu/teaching/algorithms/book/03-dynprog.pdf")],
    problems: [139, 140, 132, 410, 1335, 1043, 472],
  },
  "grid-dp": {
    blurb: "dp[r][c] from the cell above and the cell to the left: unique paths, minimum path sum, maximal square, falling paths, and the two-walkers trick for cherry pickup.",
    signals: ["Paths moving only right/down (or down with diagonals)", "Largest square or rectangle of ones", "Two people collecting along paths at once"],
    lesson: md`
## The basic recurrence

dp[r][c] = cell(r, c) ⊕ combine(dp[r − 1][c], dp[r][c − 1]). Row-by-row filling only needs the previous row: O(C) space (often a single row updated left to right).

- **Unique Paths** (LC 62): sum; closed form C(R + C − 2, R − 1).
- **Unique Paths II** (LC 63): obstacles → 0.
- **Minimum Path Sum** (LC 64): min.
- **Triangle** (LC 120): bottom-up from the last row: dp[c] = tri[r][c] + min(dp[c], dp[c + 1]).
- **Minimum Falling Path Sum** (LC 931): three parents (diagonals). LC 1289 (non-zero shifts): min and second min of the previous row.

## Maximal Square (LC 221)

side[r][c] = 1 + min(side[r − 1][c], side[r][c − 1], side[r − 1][c − 1]) for a '1' cell. The minimum of three neighbours is exactly the largest square that all three can support. Count Square Submatrices (LC 1277) sums the same table.

## Dungeon Game (LC 174)

Compute **backwards** from the princess: need[r][c] = max(1, min(need[r + 1][c], need[r][c + 1]) − dungeon[r][c]). Forward DP fails because you must track both the current health and the minimum along the path; backward DP collapses that into one number.

## Two walkers: Cherry Pickup (LC 741)

One person going there and back equals two people going from start to end simultaneously. State (step t, r1, r2) with c1 = t − r1, c2 = t − r2; if both stand on the same cell, count the cherry once. O(n³). Cherry Pickup II (LC 1463) has two robots moving down rows: state (row, c1, c2).

## Path counting with obstacles and mod

Count paths modulo 10⁹ + 7. For huge grids with few obstacles, combinatorics with inclusion–exclusion over sorted obstacles is O(k²).
`,
    doubts: [
      ["Why does Dungeon Game need a backward DP?", "Going forward, a path's viability depends on two numbers (current health and the minimum health so far); you cannot keep just one value per cell. Backwards, the minimum health needed to finish from a cell is a single number."],
      ["Why can't Cherry Pickup be solved by two independent best paths?", "The best first path can take cherries the second path would need, making the combined total worse than a coordinated pair. Moving both walkers together lets the DP account for shared cells."],
      ["How does one row suffice for space?", "dp[r][c] reads dp[r − 1][c] (the old value at index c, not yet overwritten) and dp[r][c − 1] (already updated this row). Updating left to right in one array gives exactly those values."],
    ],
    revise: md`
? Unique paths closed form? :: C(R + C − 2, R − 1).
? Maximal square recurrence? :: 1 + min(top, left, diagonal) for '1' cells.
? Triangle trick? :: Bottom-up with dp[c] = val + min(dp[c], dp[c+1]).
? Dungeon Game direction? :: Backwards: need = max(1, min(next needs) − cell).
? Cherry Pickup state? :: (step, r1, r2) for two simultaneous walkers.
? Space for grid DP? :: One row.
`,
    pitfalls: ["Forward DP for Dungeon Game", "Double counting a shared cell in Cherry Pickup", "Overwriting values still needed when compressing space"],
    quiz: [Q("Maximal square side at (r,c) with neighbours (top 2, left 3, diagonal 2) and cell '1':", ["4", "*3", "2", "6"], "1 + min(2, 3, 2).")],
    sources: [S.book("Algorithms, chapter 3: Dynamic Programming", "Jeff Erickson", "https://jeffe.cs.illinois.edu/teaching/algorithms/book/03-dynprog.pdf"), S.article("Dynamic programming on grids", "USACO Guide", "https://usaco.guide/gold/paths-grids")],
    problems: [62, 63, 64, 120, 931, 1289, 221, 1277, 174, 741, 1463],
  },
  "two-sequence-dp": {
    blurb: "dp[i][j] over prefixes of two strings: longest common subsequence, edit distance, interleaving, wildcard and regex matching. One table shape, many problems.",
    signals: ["Compare or align two strings", "Minimum edits to transform one string into another", "Pattern matching with '*', '.' or '?'", "Is s3 an interleaving of s1 and s2?"],
    widgets: ["dp-lcs", "edit-distance"],
    lesson: md`
## The table

dp[i][j] describes the prefixes a[0..i) and b[0..j). Row 0 and column 0 are the empty prefixes, which give the base cases. Each cell looks at the three neighbours (i − 1, j), (i, j − 1), (i − 1, j − 1). O(n·m) time; O(min(n, m)) space with two rows (or one row plus a saved diagonal).

## LCS (LC 1143)

If a[i − 1] == b[j − 1]: dp[i][j] = dp[i − 1][j − 1] + 1; else max(dp[i − 1][j], dp[i][j − 1]).

[[widget:dp-lcs]]

Reconstruct by walking back from (n, m): diagonal on a match, otherwise toward the larger neighbour. Related: Delete Operation for Two Strings (LC 583: n + m − 2·LCS), Minimum ASCII Delete Sum (LC 712), Uncrossed Lines (LC 1035 = LCS), Shortest Common Supersequence (LC 1092: n + m − LCS, built by the walk back).

## Edit distance (LC 72)

dp[i][j] = dp[i − 1][j − 1] if the characters match; otherwise 1 + min(dp[i − 1][j] (delete), dp[i][j − 1] (insert), dp[i − 1][j − 1] (replace)). Base: dp[i][0] = i, dp[0][j] = j. This is the **Levenshtein distance** (1965), used in spell checkers, DNA alignment (with scores: Needleman–Wunsch, Smith–Waterman) and diff tools.

[[widget:edit-distance]]

**One Edit Distance** (LC 161) needs no table: a linear scan.

## Matching with wildcards and regex

- **Wildcard Matching** (LC 44): '?' matches one character, '*' any sequence: dp[i][j] = dp[i][j − 1] (star matches empty) or dp[i − 1][j] (star matches one more) when p[j − 1] == '*'. A greedy two-pointer solution with backtracking to the last star is O(n·m) worst case but fast in practice.
- **Regular Expression Matching** (LC 10): '*' applies to the preceding element: dp[i][j] = dp[i][j − 2] (zero occurrences) or (first matches and dp[i − 1][j]).

## Interleaving String (LC 97)

dp[i][j] = s3[i + j − 1] comes from s1 (dp[i − 1][j]) or s2 (dp[i][j − 1]). Check lengths first.

## Distinct Subsequences (LC 115)

Counting: dp[i][j] = dp[i − 1][j] + (a[i − 1] == b[j − 1] ? dp[i − 1][j − 1] : 0). Use big integers or mod.

## Faster in special cases

- LCS of two permutations → LIS in O(n log n).
- Edit distance with a bound k → only a diagonal band of width 2k + 1 (Ukkonen): O(n·k).
- Hirschberg's algorithm recovers an LCS in O(n·m) time and O(min(n, m)) space.
`,
    doubts: [
      ["Why do edit distance's three neighbours mean delete, insert and replace?", "dp[i−1][j] + 1: the last char of a is deleted. dp[i][j−1] + 1: b's last char is inserted into a. dp[i−1][j−1] + 1: the last chars are aligned with a replacement. Matching chars align for free."],
      ["How do I save space with only one row?", "When computing row i left to right, dp[j] still holds row i − 1's value until overwritten, and dp[j − 1] is already row i. The diagonal (row i − 1, j − 1) is lost on overwrite, so store it in a variable before updating each cell."],
      ["Regex '*' versus wildcard '*'?", "In wildcard matching, '*' stands alone and matches any sequence. In regex, '*' modifies the previous token (zero or more copies of it), so the transition looks two pattern characters back."],
      ["Is LCS the same as longest common substring?", "No. A substring is contiguous: dp[i][j] = dp[i−1][j−1] + 1 on a match and 0 otherwise, and the answer is the table maximum. Suffix structures or rolling hashes solve it faster."],
    ],
    revise: md`
? LCS recurrence? :: Match: diag + 1; else max(up, left).
? Edit distance recurrence? :: Match: diag; else 1 + min(up (delete), left (insert), diag (replace)).
? Edit distance base? :: dp[i][0] = i, dp[0][j] = j.
? Delete to make equal? :: n + m − 2·LCS.
? Shortest common supersequence length? :: n + m − LCS.
? Wildcard '*' transition? :: dp[i][j−1] or dp[i−1][j].
? Regex 'x*' transition? :: dp[i][j−2] or (first matches and dp[i−1][j]).
? Space optimisation? :: One row plus a saved diagonal.
`,
    pitfalls: ["Confusing subsequence and substring", "Losing the diagonal in one-row compression", "Regex: forgetting zero occurrences (dp[i][j − 2])", "Interleaving without the length check"],
    quiz: [
      Q("Edit distance between 'horse' and 'ros'?", ["2", "*3", "4", "5"], "Replace h→r, delete r, delete e."),
      Q("LCS('abcde', 'ace')?", ["2", "*3", "4", "1"], "'ace'."),
    ],
    sources: [S.article("Levenshtein distance (history and algorithms)", "Wikipedia", "https://en.wikipedia.org/wiki/Levenshtein_distance"), S.paper("A linear space algorithm for computing maximal common subsequences (Hirschberg, 1975)", "Communications of the ACM", "https://doi.org/10.1145/360825.360861"), S.book("Algorithms, chapter 3: Dynamic Programming (§3.7 edit distance)", "Jeff Erickson", "https://jeffe.cs.illinois.edu/teaching/algorithms/book/03-dynprog.pdf")],
    problems: [1143, 72, 583, 712, 1035, 1092, 44, 10, 97, 115, 161],
  },
  "palindrome-dp": {
    blurb: "Palindromic substrings and subsequences: expand around centres, the isPal table, longest palindromic subsequence as LCS with the reverse, and minimum insertions.",
    signals: ["Longest palindromic substring or subsequence", "Count palindromic substrings", "Minimum insertions or deletions to make a palindrome"],
    lesson: md`
## Substrings (contiguous)

- **Expand around centres**: 2n − 1 centres (each character and each gap); expand while the ends match. O(n²) time, O(1) space. Longest Palindromic Substring (LC 5), Palindromic Substrings count (LC 647).
- **isPal table**: isPal[i][j] = s[i] == s[j] and (j − i < 2 or isPal[i + 1][j − 1]). Fill by increasing length (or i descending). O(n²) space; useful when many palindrome queries follow (partitioning).
- **Manacher's algorithm**: O(n) for all centres; see its own page.

## Subsequences (not contiguous)

**Longest Palindromic Subsequence** (LC 516): lps[i][j] = lps[i + 1][j − 1] + 2 if s[i] == s[j], else max(lps[i + 1][j], lps[i][j − 1]). Fill by increasing interval length. Equivalently LCS(s, reverse(s)).

- **Minimum insertions to make a palindrome** (LC 1312) = n − LPS.
- **Minimum deletions** = n − LPS as well.
- **Valid Palindrome III** (LC 1216, at most k deletions): n − LPS ≤ k.
- **Count palindromic subsequences** (distinct, LC 730) is a hard interval DP with inclusion–exclusion.

## Choosing

| Question | Method |
|---|---|
| longest palindromic substring | expand around centres (O(n²), O(1)); Manacher for O(n) |
| many substring palindrome checks | isPal table |
| longest palindromic subsequence | interval DP or LCS with the reverse |
| make it a palindrome with minimum edits | n − LPS |
`,
    doubts: [
      ["Why 2n − 1 centres?", "Odd-length palindromes centre on a character (n centres); even-length ones centre between two characters (n − 1 gaps)."],
      ["Why is LPS equal to LCS(s, reverse(s))?", "A palindromic subsequence reads the same forwards and backwards, so it is a common subsequence of s and its reverse. Conversely, the LCS can be shown to contain a palindrome of the same length, so the values agree."],
      ["Why does minimum insertions equal n − LPS?", "Keep the longest palindromic subsequence as the 'spine'; every other character needs a mirror partner inserted. Fewer insertions would imply a longer palindromic subsequence."],
    ],
    revise: md`
? Expand around centres cost? :: O(n²) time, O(1) space; 2n − 1 centres.
? isPal recurrence? :: s[i] == s[j] and (j − i < 2 or isPal[i+1][j−1]).
? LPS recurrence? :: Equal ends: inner + 2; else max of dropping either end.
? LPS via LCS? :: LCS(s, reverse(s)).
? Minimum insertions to palindrome? :: n − LPS.
? O(n) longest palindromic substring? :: Manacher.
`,
    pitfalls: ["Confusing substring and subsequence", "Filling the interval table in the wrong order", "Forgetting even-length centres"],
    quiz: [Q("Minimum insertions to make 'mbadm' a palindrome?", ["1", "*2", "3", "0"], "LPS 'mam'/'mdm' has length 3; 5 − 3 = 2.")],
    sources: [S.article("Longest palindromic substring", "Wikipedia", "https://en.wikipedia.org/wiki/Longest_palindromic_substring"), S.article("Manacher's algorithm", "cp-algorithms", "https://cp-algorithms.com/string/manacher.html")],
    problems: [5, 647, 516, 1312, 1216, 730],
  },
  "counting-dp": {
    blurb: "Count the ways rather than find the best: distinct subsequences, dice rolls, paths with constraints, and the mod-arithmetic and double-counting traps.",
    signals: ["\"How many ways\" / \"number of distinct\"", "Answer modulo 10⁹ + 7", "Sequences built under rules (dice sums, ordered vs unordered)"],
    lesson: md`
## Sum instead of max

Counting DP has the same states as optimisation DP, but transitions **add** the ways from each choice. The base case is usually "1 way to do nothing".

## Ordered vs unordered: the loop order matters

- **Combinations** (order does not matter, e.g. Coin Change II, LC 518): loop over **coins outside**, amounts inside. Each combination is counted once, in coin order.
- **Permutations** (order matters, e.g. Combination Sum IV, LC 377): loop over **amounts outside**, coins inside. Each ordering is counted.

Swapping the loops silently changes the problem: the most common counting-DP bug.

## Problems

- **Number of Dice Rolls With Target Sum** (LC 1155): dp[d][s] = Σ dp[d − 1][s − f], f = 1..k (prefix sums make it O(d · target)).
- **Distinct Subsequences** (LC 115) and **Distinct Subsequences II** (LC 940: count distinct subsequences, subtracting the count from the previous occurrence of the same character).
- **Unique Binary Search Trees** (LC 96): Catalan numbers, G(n) = Σ G(i − 1) · G(n − i).
- **Knight Probability** (LC 688), **Out of Boundary Paths** (LC 576): dp over (steps, cell).
- **Count Ways To Build Good Strings** (LC 2466): dp over length with two step sizes.
- **Number of Music Playlists** (LC 920): dp[i][j] = songs so far, distinct used.

## Mod arithmetic

Apply % MOD after every addition and multiplication. With subtraction, add MOD before taking the remainder: (a − b + MOD) % MOD. In Python big integers avoid overflow but get slow; still apply the mod.

## Avoiding double counting

Count each object by a canonical construction: fix an order (combinations), fix the first or last element, or use inclusion–exclusion for overlaps.
`,
    doubts: [
      ["Why does the loop order change the count in coin problems?", "With coins outside, a coin can only be added after all smaller-index coins are decided, so each multiset is built in one fixed order: combinations. With amounts outside, at each amount any coin can be last, so different orders are counted separately: permutations."],
      ["How does Distinct Subsequences II avoid double counting?", "Appending character c to every subsequence so far doubles the count, but sequences ending with c that were already created at c's previous occurrence get created again. Subtract the count from just before that previous occurrence."],
    ],
    revise: md`
? Counting DP transition? :: Add the ways of each choice.
? Coin Change II (combinations) loop order? :: Coins outer, amounts inner.
? Combination Sum IV (permutations) loop order? :: Amounts outer, coins inner.
? Unique BSTs? :: Catalan: G(n) = Σ G(i−1)·G(n−i).
? Subtraction under mod? :: (a − b + MOD) % MOD.
? Distinct subsequences II? :: Double, then subtract the count before the previous occurrence.
`,
    pitfalls: ["Swapped loops (combinations vs permutations)", "Negative results after modular subtraction", "Missing the base case of 1"],
    quiz: [Q("Ways to make 4 from coins {1,2} counting order (permutations)?", ["3", "*5", "4", "6"], "1111, 112, 121, 211, 22.")],
    sources: [S.article("Counting with dynamic programming", "USACO Guide", "https://usaco.guide/gold/combo"), S.article("Catalan number", "Wikipedia", "https://en.wikipedia.org/wiki/Catalan_number")],
    problems: [518, 377, 1155, 115, 940, 96, 688, 576, 2466, 920, 62],
  },
  "knapsack-01": {
    blurb: "Each item at most once, capacity W: dp over (items, capacity), the reverse loop that makes one array enough, and why the O(nW) algorithm is pseudo-polynomial.",
    signals: ["Choose a subset under a capacity or budget to maximise value", "Each item can be used at most once", "Two capacities at once (ones and zeroes)"],
    widgets: ["knapsack"],
    lesson: md`
## The recurrence

dp[i][w] = best value using the first i items with capacity w:

dp[i][w] = max(dp[i − 1][w], dp[i − 1][w − wt[i]] + val[i])  (second term only if wt[i] ≤ w)

O(n·W) time and space.

[[widget:knapsack]]

## One array: iterate capacity downwards

\`\`\`
dp = [0] * (W + 1)
for wt, val in items:
    for w in range(W, wt - 1, -1):     # downwards!
        dp[w] = max(dp[w], dp[w - wt] + val)
\`\`\`

Going **downwards** ensures dp[w − wt] still holds the previous item's row, so each item is used at most once. Going upwards would let the same item be added repeatedly, which is the unbounded knapsack.

## Pseudo-polynomial time

O(n·W) looks polynomial, but W is a number whose input size is log W bits. Knapsack is NP-complete; the DP is fast only when W is small (say ≤ 10⁷). For huge W with small values, swap the roles: dp over total value storing minimum weight. For tiny n (≤ 40), meet in the middle.

## Multi-dimensional capacity

**Ones and Zeroes** (LC 474): each string costs (zeros, ones); dp[z][o] with both loops downward: O(n·m·n′).

## Disguises

- **Last Stone Weight II** (LC 1049): split stones into two groups minimising the difference: subset sum toward total/2.
- **Profitable Schemes** (LC 879): counting knapsack with a profit floor clamp.
- **Tallest Billboard** (LC 956): dp over the difference between two supports.
- **Target Sum** (LC 494): subset sum in disguise (see the next page).

## Reconstructing the chosen items

With the 2D table, walk back from (n, W): if dp[i][w] ≠ dp[i − 1][w], item i was taken. The 1D version loses this; keep a choice table if reconstruction is needed.

## Fractional knapsack

If items can be split, greedy by value/weight ratio is optimal. 0/1 knapsack has no greedy solution (counterexample with ratios).
`,
    doubts: [
      ["Why must the 1D loop go downwards?", "dp[w − wt] must be the value from before considering this item. Going downwards, indices below w have not been updated yet for this item. Going upwards, dp[w − wt] may already include the item, allowing it twice."],
      ["Why is knapsack NP-complete if the DP is polynomial?", "The DP is polynomial in W's value, not in the number of bits needed to write W. Doubling the bits squares W, so the running time is exponential in input size."],
      ["Does greedy by value/weight work for 0/1?", "No. Items (w=10, v=60), (w=20, v=100), (w=30, v=120), capacity 50: greedy by ratio takes the first two (160) but the optimum is the last two (220)."],
    ],
    revise: md`
? 0/1 knapsack recurrence? :: max(skip, take: dp[i−1][w − wt] + val).
? 1D loop direction? :: Capacity downwards.
? Upwards gives? :: Unbounded knapsack.
? Complexity and its caveat? :: O(nW): pseudo-polynomial.
? Huge W, small values? :: dp over value storing minimum weight.
? Two capacities? :: 2D dp, both loops downward.
? Fractional knapsack? :: Greedy by ratio (only when items are divisible).
`,
    pitfalls: ["Upward loop in 0/1 knapsack", "Allocating n × W tables when W is huge", "Greedy by ratio for 0/1"],
    quiz: [
      Q("In the 1D 0/1 knapsack, capacity is iterated…", ["upwards", "*downwards", "either way", "randomly"], "So each item is used once."),
      Q("O(n·W) knapsack is called pseudo-polynomial because…", ["it uses recursion", "*it is polynomial in W's value, not its bit length", "it is approximate", "it needs sorting"], "Input size of W is log W."),
    ],
    sources: [S.article("Knapsack problem", "cp-algorithms", "https://cp-algorithms.com/dynamic_programming/knapsack.html"), S.article("Knapsack problem", "Wikipedia", "https://en.wikipedia.org/wiki/Knapsack_problem"), S.book("Algorithms, chapter 3: Dynamic Programming", "Jeff Erickson", "https://jeffe.cs.illinois.edu/teaching/algorithms/book/03-dynprog.pdf")],
    problems: [474, 1049, 879, 956, 2915],
  },
  "knapsack-unbounded": {
    blurb: "Unlimited copies of each item: iterate capacity upwards. Coin change (minimum coins and number of ways), rod cutting and perfect squares.",
    signals: ["Unlimited supply of each coin / item", "Minimum number of pieces to reach a total", "Count ways to form an amount"],
    lesson: md`
## The difference from 0/1

\`\`\`
for coin in coins:
    for a in range(coin, amount + 1):   # upwards: reuse allowed
        dp[a] = combine(dp[a], dp[a - coin] ⊕ ...)
\`\`\`

Going upwards lets dp[a − coin] already include this coin, so it can be used again.

## Coin Change (LC 322): minimum coins

dp[0] = 0, dp[a] = min over coins of dp[a − coin] + 1, with ∞ for unreachable. O(amount × coins). Answer −1 if dp[amount] is ∞. Greedy fails for arbitrary coin systems ({1, 3, 4} and 6); it works for "canonical" systems like real currencies, which is an interesting aside.

BFS on amounts (each coin is an edge of weight 1) also finds the minimum and can stop early.

## Coin Change II (LC 518): number of ways

dp[0] = 1, dp[a] += dp[a − coin], with **coins outer** (combinations). Amounts outer would count permutations (LC 377).

## Other unbounded problems

- **Perfect Squares** (LC 279): coins are the squares; O(n√n). Math shortcut: Lagrange's four-square theorem (answer ≤ 4) and Legendre's three-square theorem decide it in O(√n).
- **Rod Cutting**: price for each length, unlimited pieces: maximise revenue.
- **Minimum Cost For Tickets** looks similar but is linear DP over days.
- **Integer Break** (LC 343): maximise the product of parts; DP or the math answer (as many 3s as possible).
- **Word Break** is an unbounded knapsack over positions with words as items (partition DP).

## Bounded knapsack

Each item has a count c: binary splitting (1, 2, 4, …, remainder) turns it into O(log c) 0/1 items; or a monotone deque per residue class for O(n·W). See variants.
`,
    doubts: [
      ["Why is the minimum-coins answer ∞ rather than 0 for unreachable amounts?", "A min over transitions must ignore unreachable states. Initialising with ∞ (and checking at the end) makes unreachable amounts lose every comparison."],
      ["When does greedy coin change work?", "For canonical coin systems, where greedy is always optimal (like 1, 2, 5, 10, 20, 50…). Deciding whether a system is canonical is itself a known problem; arbitrary sets need DP."],
    ],
    revise: md`
? Unbounded loop direction? :: Capacity upwards.
? Coin Change minimum? :: dp[a] = min dp[a − c] + 1; ∞ means unreachable.
? Coin Change II ways? :: dp[0] = 1; coins outer, amounts inner.
? Perfect Squares bound? :: Answer ≤ 4 (Lagrange).
? Integer Break math? :: Use as many 3s as possible (with 2s for remainders).
? Bounded counts? :: Binary splitting into 0/1 items.
`,
    pitfalls: ["0 instead of ∞ initialisation for minimisation", "Loop order for counting", "Using greedy on arbitrary coins"],
    quiz: [Q("Minimum coins for 11 with {1, 2, 5}?", ["2", "*3", "4", "5"], "5 + 5 + 1.")],
    sources: [S.article("Change-making problem", "Wikipedia", "https://en.wikipedia.org/wiki/Change-making_problem"), S.article("Knapsack problem (complete / bounded)", "cp-algorithms", "https://cp-algorithms.com/dynamic_programming/knapsack.html"), S.article("Lagrange's four-square theorem", "Wikipedia", "https://en.wikipedia.org/wiki/Lagrange%27s_four-square_theorem")],
    problems: [322, 518, 377, 279, 343, 983],
  },
  "subset-sum": {
    blurb: "Can a subset reach exactly a target? Boolean knapsack, bitset speed-ups, and the classic reductions: equal partition, target sum with signs, minimum subset difference.",
    signals: ["Split into two groups with equal (or closest) sums", "Assign + and − signs to reach a target", "Is a sum reachable using each number once?"],
    lesson: md`
## Boolean knapsack

reach[s] = can some subset sum to s. reach[0] = true; for each x, for s from target down to x: reach[s] |= reach[s − x]. O(n · target).

**Bitset trick**: reach is a bit array; for each x, reach |= reach << x. In C++ \`bitset\` or Python big integers, this is about 64× faster: O(n · target / 64).

## Reductions

- **Partition Equal Subset Sum** (LC 416): total must be even; reach total/2.
- **Target Sum** (LC 494): plus set P and minus set N with P − N = target and P + N = total, so P = (total + target)/2. Count subsets summing to P (counting knapsack). Check parity and that |target| ≤ total.
- **Last Stone Weight II** (LC 1049): minimise |total − 2·S|: find the largest reachable S ≤ total/2.
- **Partition Array Into Two Arrays to Minimise Sum Difference** (LC 2035, n ≤ 30 per side, large values): DP is impossible (values up to 10⁷); meet in the middle with sorted half-sums and binary search.
- **Count subsets with sum k**: counting version (reach becomes counts).
- **Split array with same average** (LC 805): subset sum over (count, sum) pairs, with pruning or meet in the middle.

## Zero values and counting

When counting subsets, zeros double the count (each zero can be in or out). The standard counting DP handles this automatically if the inner loop includes s = x = 0 correctly (iterate s down to x inclusive).

## Complexity guard

If target is up to 10⁵ and n up to 200, O(n · target) = 2·10⁷ is fine. If values are huge but n ≤ 40, use meet in the middle; if values are huge and n large, it is genuinely hard (NP-complete).
`,
    doubts: [
      ["How does Target Sum become subset sum?", "Numbers with '+' form P, with '−' form N. P − N = target and P + N = total give P = (total + target)/2. So the question is how many subsets sum to that value."],
      ["Why is the bitset version faster?", "One shift-and-OR processes 64 sums per machine word, so the inner loop runs target/64 times instead of target."],
    ],
    revise: md`
? Subset sum boolean DP? :: reach[s] |= reach[s − x], s downward.
? Bitset form? :: reach |= reach << x.
? Equal partition? :: total even and reach[total/2].
? Target Sum reduction? :: Count subsets with sum (total + target)/2 (check parity, bounds).
? Minimum subset difference? :: Largest reachable S ≤ total/2; answer total − 2S.
? Huge values, n ≤ 40? :: Meet in the middle.
`,
    pitfalls: ["Skipping parity checks in Target Sum", "Zeros in counting variants", "DP over sums when values are 10⁹"],
    quiz: [Q("nums = [1,1,1,1,1], target = 3: subset sum to find?", ["3", "*4", "5", "2"], "(5 + 3)/2 = 4.")],
    sources: [S.article("Subset sum problem", "Wikipedia", "https://en.wikipedia.org/wiki/Subset_sum_problem"), S.article("Knapsack problem", "cp-algorithms", "https://cp-algorithms.com/dynamic_programming/knapsack.html")],
    problems: [416, 494, 1049, 2035, 805],
  },
  "knapsack-variants": {
    blurb: "Bounded counts, groups where you pick one per group, dependencies, and value-indexed DP when capacities are huge: the knapsack variants that appear as hard follow-ups.",
    signals: ["Item i available c_i times", "Pick at most one item from each group", "Items with prerequisites", "Capacity up to 10⁹ but values small"],
    lesson: md`
## Bounded knapsack

Item i has count c_i.
- **Naive**: treat as c_i separate items: O(W · Σc).
- **Binary splitting**: split c into 1, 2, 4, …, remainder; every count 0..c is a sum of a subset of these pieces. O(W · Σ log c).
- **Monotone queue**: for each residue r mod w_i, dp along w ≡ r is a sliding-window max: O(n·W). Name it as the optimal.

## Group knapsack

Items in groups, pick at most one per group: for each group, for w downward, try every item in the group. O(W · total items). Example: choosing one option per course or per day (Maximum Value of K Coins From Piles, LC 2218: each pile is a group whose options are prefixes).

## Value-indexed DP

When W is huge but total value V is small: minWeight[v] = minimum weight to achieve value v; answer = largest v with minWeight[v] ≤ W. O(n · V).

## Dependent items (tree knapsack)

Items form a tree where a child can only be taken if its parent is: tree DP that merges children's knapsack tables (O(n · W²), or O(n · W) with careful size-bounded merging). Example: choosing courses with prerequisites under a credit limit.

## Exactness and initialisation

- "Capacity at most W": initialise dp to 0 everywhere.
- "Exactly W": initialise dp[0] = 0 and others to −∞; unreachable sums stay −∞.

## Reliability design and other names

Abdul Bari's "reliability design" is a multiplicative knapsack (maximise a product of reliabilities under cost). Logs turn products into sums.
`,
    doubts: [
      ["Why does binary splitting represent every count?", "Pieces 1, 2, 4, …, 2^(k−1) and a remainder r represent every number from 0 to 2^k − 1 + r = c as a subset sum, just like binary representation."],
      ["When should I use value-indexed DP?", "When W is too large for an array (10⁹) but the sum of values is small (≤ 10⁵). Swap what you index by and what you optimise."],
    ],
    revise: md`
? Bounded knapsack efficient trick? :: Binary splitting into 1, 2, 4, …, remainder.
? Optimal bounded? :: Monotone queue per residue class: O(nW).
? Group knapsack? :: Per group, per w downward, try each item in the group.
? Huge W, small values? :: minWeight[value] DP.
? Exactly W initialisation? :: dp[0] = 0, others −∞.
`,
    pitfalls: ["Wrong initialisation for 'exactly' vs 'at most'", "Treating groups as independent items", "Expanding large counts item by item"],
    quiz: [Q("An item with count 13 becomes which binary pieces?", ["1, 2, 4, 8", "*1, 2, 4, 6", "13", "1, 3, 9"], "1 + 2 + 4 = 7, remainder 6.")],
    sources: [S.article("Knapsack problem (bounded and group variants)", "cp-algorithms", "https://cp-algorithms.com/dynamic_programming/knapsack.html"), S.article("Knapsack problem", "Wikipedia", "https://en.wikipedia.org/wiki/Knapsack_problem")],
    problems: [2218, 1155, 2585],
  },
  "interval-dp": {
    blurb: "dp[l][r] over every interval, with a loop over the split point: burst balloons, matrix chain multiplication, minimum cost to cut a stick, optimal BSTs. O(n³), filled by increasing length.",
    signals: ["The order of operations inside a range matters", "Merge adjacent elements with a cost", "Choose a split (or the last operation) inside an interval", "n ≤ 500"],
    widgets: ["interval-dp"],
    lesson: md`
## The shape

dp[l][r] = best for the interval [l, r], computed from a choice k inside it:

dp[l][r] = best over k of dp[l][k] ⊕ dp[k][r] ⊕ cost(l, k, r)

Fill by **increasing interval length** so both halves are ready. O(n²) states × O(n) splits = O(n³).

[[widget:interval-dp]]

## Think "last" instead of "first"

Burst Balloons (LC 312) is the canonical example. If you pick the **first** balloon to burst, its neighbours change and the subproblems are not independent. Pick the **last** balloon k to burst in (l, r): at that moment its neighbours are exactly l and r (padded with 1s at both ends), so

dp[l][r] = max over k of dp[l][k] + dp[k][r] + a[l]·a[k]·a[r].

This "last operation splits the interval into independent parts" idea is the key insight of the family.

## Classics

- **Matrix chain multiplication**: dp[i][j] = min over k of dp[i][k] + dp[k + 1][j] + p[i−1]·p[k]·p[j].
- **Minimum Cost to Cut a Stick** (LC 1547): sort cuts, add 0 and n as ends; cost of a segment is its length.
- **Minimum Score Triangulation of Polygon** (LC 1039): same shape as matrix chain.
- **Strange Printer** (LC 664), **Remove Boxes** (LC 546: needs a third dimension for extra equal boxes attached).
- **Optimal binary search tree** (Knuth, Abdul Bari): expected search cost with frequencies.
- **Guess Number Higher or Lower II** (LC 375): minimax over the guess k.
- **Stone Game** variants (LC 877, 1140) when players take from either end.
- **Minimum cost to merge stones** (LC 1000): merge K adjacent piles; extra state for the number of piles.

## Knuth's optimisation

When the optimal split point is monotone (opt[l][r − 1] ≤ opt[l][r] ≤ opt[l + 1][r]), restricting k to that range brings O(n³) down to O(n²). It applies to optimal BSTs and some merge problems. Name-level for interviews.
`,
    doubts: [
      ["Why fill by increasing length?", "dp[l][r] depends on strictly shorter intervals inside [l, r]. Increasing length guarantees they are computed. Iterating l downward and r upward also works."],
      ["Why is choosing the first balloon wrong?", "After bursting k first, k's neighbours become adjacent, so the left and right parts interact. Choosing k as the last balloon keeps [l, k] and [k, r] independent, because l and r are still present when k bursts."],
      ["How large can n be for O(n³)?", "About 500 (1.25·10⁸ simple operations). For larger n you need an optimisation (Knuth, divide and conquer) or a different model."],
    ],
    revise: md`
? Interval DP state and order? :: dp[l][r]; fill by increasing length.
? Complexity? :: O(n³) typically.
? Burst Balloons key idea? :: Choose the last balloon k in (l, r); neighbours are l and r.
? Burst Balloons recurrence? :: dp[l][r] = max dp[l][k] + dp[k][r] + a[l]a[k]a[r].
? Matrix chain cost term? :: p[i−1]·p[k]·p[j].
? Cut a stick preparation? :: Sort cuts and add both ends.
? Knuth optimisation? :: Monotone split points: O(n²).
`,
    pitfalls: ["Choosing 'first' instead of 'last'", "Wrong fill order", "Forgetting padding with 1s in Burst Balloons"],
    quiz: [Q("Burst Balloons on [3,1,5,8] (padded 1s) maximum coins?", ["110", "*167", "160", "120"], "Classic example answer: 167.")],
    sources: [S.article("Matrix chain multiplication", "Wikipedia", "https://en.wikipedia.org/wiki/Matrix_chain_multiplication"), S.article("Knuth's optimization", "cp-algorithms", "https://cp-algorithms.com/dynamic_programming/knuth-optimization.html"), S.book("Introduction to Algorithms (CLRS), ch. 14.2 Matrix-chain multiplication and 14.5 Optimal BSTs", "Cormen, Leiserson, Rivest, Stein", "https://mitpressbookstore.mit.edu/book/9780262046305")],
    problems: [312, 1547, 1039, 664, 546, 375, 877, 1000],
  },
  "bitmask-dp": {
    blurb: "When n ≤ 20, a subset fits in an integer: dp over masks for travelling salesman, assignment, visiting all nodes and partitioning, in O(2ⁿ · n) or O(2ⁿ · n²).",
    signals: ["n ≤ 20 and you need to track which items are used", "Visit all nodes / cities (Hamiltonian path or TSP)", "Assign n workers to n jobs", "Partition into groups with compatibility constraints"],
    lesson: md`
## The state

A mask's bit i says whether item i is used. dp[mask] (or dp[mask][last]) stores the best for that subset. 2ⁿ masks: n = 20 gives about 10⁶.

Bit operations: test (mask >> i) & 1, set mask | (1 << i), popcount for the number used, iterate submasks with sub = (sub − 1) & mask.

## Assignment (dp[mask])

Assign the first popcount(mask) workers to the jobs in mask: dp[mask | 1 << j] = best(dp[mask] + cost[popcount(mask)][j]). O(2ⁿ · n). Problems: Campus Bikes II (LC 1066), Minimum XOR Sum of Two Arrays (LC 1879), Maximum Compatibility Score Sum (LC 1947), Fair Distribution of Cookies (LC 2305, with submasks).

## Travelling salesman (dp[mask][last])

dp[mask][v] = shortest path visiting exactly mask, ending at v. Transition: dp[mask | 1 << u][u] = min(dp[mask][v] + w(v, u)). O(2ⁿ · n²) (Held–Karp, 1962), versus n! brute force.

- **Find the Shortest Superstring** (LC 943): TSP over strings with overlap costs.
- **Shortest Path Visiting All Nodes** (LC 847): BFS over (node, mask) since edges are unweighted.
- **Number of ways to wear different hats** (LC 1434): iterate over hats (40) with a mask of people (10): choose the small dimension for the mask.

## Submask enumeration

\`for sub = mask; sub > 0; sub = (sub − 1) & mask\` visits every non-empty submask. Over all masks, total work is **3ⁿ** (each element is in sub, in mask but not sub, or outside). n = 15 gives about 1.4·10⁷: fine. Used for partitioning into groups (minimum incompatibility, LC 1681; distribute work into k sessions).

## Profile DP

Tiling a grid with dominoes uses a mask over a column's cells (broken profile): advanced, name-level.
`,
    doubts: [
      ["Why is n ≤ 20 the hint?", "2²⁰ ≈ 10⁶ masks; with n or n² work per mask that is 2·10⁷ to 4·10⁸. At n = 25, 3·10⁷ masks start to hurt; beyond that, meet in the middle or a different idea is needed."],
      ["Why is submask enumeration over all masks 3ⁿ and not 4ⁿ?", "Each element independently is outside mask, in mask but not in sub, or in both: three choices, so Σ over masks of 2^|mask| = 3ⁿ."],
      ["Which dimension should be the mask?", "The smaller one. In the hats problem, 40 hats but 10 people: iterate hats as the DP index and keep a mask of people (2¹⁰), not the other way round."],
    ],
    revise: md`
? When bitmask DP? :: n ≤ ~20 and the set of used items matters.
? Assignment DP? :: dp[mask]; next worker = popcount(mask); O(2ⁿ n).
? TSP DP? :: dp[mask][last]; O(2ⁿ n²) (Held–Karp).
? Iterate submasks? :: sub = (sub − 1) & mask.
? All submasks of all masks cost? :: 3ⁿ.
? Visit all nodes, unweighted? :: BFS over (node, mask).
? Which dimension in the mask? :: The smaller one.
`,
    pitfalls: ["Masks over the large dimension", "Off-by-one in 1 << n sizes", "Forgetting the starting state dp[1 << s][s] = 0"],
    quiz: [Q("Held–Karp TSP complexity?", ["O(n!)", "*O(2ⁿ n²)", "O(n³)", "O(2ⁿ)"], "States 2ⁿ·n, transitions n.")],
    sources: [S.paper("A dynamic programming approach to sequencing problems (Held & Karp, 1962)", "Journal of SIAM", "https://doi.org/10.1137/0110015"), S.article("Bitmask DP / submask enumeration", "cp-algorithms", "https://cp-algorithms.com/algebra/all-submasks.html"), S.article("Dynamic programming over subsets", "USACO Guide", "https://usaco.guide/gold/dp-bitmasks")],
    problems: [1066, 1879, 1947, 943, 847, 1434, 1681, 1986, 2305, 1125],
  },
  "tree-dp": {
    blurb: "DP where the state is a tree node: include/exclude a node (house robber III), subtree sizes and sums, rerooting to get every node's answer in O(n), and knapsack on trees.",
    signals: ["Optimisation over a tree with a rule between parent and child", "Answer needed for every node as root (sum of distances, minimum height)", "Select nodes with constraints (independent set, vertex cover, cameras)"],
    lesson: md`
## Include / exclude

Return two values from each subtree: best if the node is **taken** and best if it is **not taken**.

- **House Robber III** (LC 337): take = val + Σ notTake(child); notTake = Σ max(take, notTake)(child). Maximum independent set on a tree in O(n).
- **Minimum vertex cover** on a tree: the dual rule.
- **Binary Tree Cameras** (LC 968): three states (has camera, covered, needs cover).

## Subtree aggregates

Sizes, sums, depths and counts per subtree in one post-order pass. Count Nodes With the Highest Score (LC 2049: product of component sizes after removal), Maximum Product of Splitted Binary Tree (LC 1339: total sum, then best sum × (total − sum)).

## Rerooting (all roots in O(n))

To get an answer for **every** node as the root:
1. Pick root 0; compute down[v] (answer within v's subtree) with post-order.
2. Pre-order pass: compute up[v] (contribution from outside v's subtree) from the parent's values, then answer[v] = combine(down[v], up[v]).

**Sum of Distances in Tree** (LC 834): ans[0] = Σ depths. Moving the root from parent p to child c: ans[c] = ans[p] − size[c] + (n − size[c]), since size[c] nodes get one step closer and the rest one step farther. O(n) total instead of O(n²).

Others: Minimum Height Trees (also by leaf peeling), the most "central" node, number of valid roots in an edge-direction problem (LC 2581).

## Tree diameter and longest paths

Diameter = max over nodes of the two longest downward paths. Also: double BFS (farthest from any node, then farthest from that).

## Knapsack on trees

Choose k nodes or a weight budget with parent dependencies: merge children's tables (dp[v][j]). Bounding loops by subtree sizes gives O(n·k) overall (a classic amortisation).

## General trees in interviews

Input often arrives as an edge list: build adjacency, root at 0, pass the parent to avoid walking back.
`,
    doubts: [
      ["Why does rerooting give O(n)?", "Each move from a parent to a child changes the answer by a formula computed from precomputed subtree data in O(1) (or O(degree)), so all n answers come from two linear passes instead of n separate traversals."],
      ["Why return two values instead of memoising on (node, flag)?", "It is the same DP; returning a pair is just bottom-up memoisation. It avoids a hash map keyed by nodes and is easier to explain."],
    ],
    revise: md`
? House Robber III return? :: (take, notTake) per node.
? take / notTake formulas? :: take = val + Σ notTake(c); notTake = Σ max(take(c), notTake(c)).
? Rerooting passes? :: Post-order down values, pre-order up values.
? Sum of distances move? :: ans[c] = ans[p] − size[c] + (n − size[c]).
? Diameter? :: Max of the two longest child depths at a node; or double BFS.
? Tree knapsack complexity trick? :: Bound merge loops by subtree sizes: O(nk).
`,
    pitfalls: ["Revisiting the parent in general trees", "O(n²) by re-running DFS from every root", "Recursion depth on path-shaped trees"],
    quiz: [Q("Sum of Distances: moving the root from p to child c with size[c] = 3, n = 10 changes the sum by…", ["−3", "+7", "*+4", "−4"], "−3 + 7 = +4.")],
    sources: [S.article("Rerooting technique (all roots DP)", "USACO Guide", "https://usaco.guide/gold/all-roots"), S.article("DP on trees", "USACO Guide", "https://usaco.guide/gold/dp-trees")],
    problems: [337, 968, 834, 2049, 1339, 2581, 310, 1245],
  },
  "game-dp": {
    blurb: "Two optimal players: minimax over states, score differences instead of two totals, win/lose positions, Nim and Sprague–Grundy numbers for sums of games.",
    signals: ["Two players alternate, both play optimally", "Can the first player win? / maximum score difference", "Take stones from piles or from either end"],
    lesson: md`
## Minimax with score difference

Instead of tracking both players' scores, define dp[state] = (current player's score) − (opponent's score) under optimal play. Then

dp[state] = max over moves of (gain(move) − dp[next state]).

The minus sign switches perspective: the opponent's best is your loss.

- **Predict the Winner** (LC 486), **Stone Game** (LC 877): dp[l][r] = max(a[l] − dp[l+1][r], a[r] − dp[l][r−1]). (Stone Game I is always a first-player win by a parity argument: take all even-indexed or all odd-indexed piles.)
- **Stone Game II** (LC 1140): state (index, M), suffix sums.
- **Stone Game III** (LC 1406): take 1–3 from the front: dp[i] = max over k of sum(i..i+k−1) − dp[i + k].

## Win/lose positions

For win/lose games: a position is **winning** if some move leads to a losing position for the opponent; losing if every move leads to a winning one. Can I Win (LC 464): state = bitmask of used numbers (n ≤ 20). Divisor Game (LC 1025): even numbers win.

## Nim and Sprague–Grundy

**Nim**: piles of stones, take any positive number from one pile; the player to move loses iff the XOR of pile sizes is 0.

**Sprague–Grundy theorem**: every impartial game position has a Grundy number g = mex (minimum excluded value) of the Grundy numbers of its moves; a sum of independent games is a loss iff the XOR of their Grundy numbers is 0. This solves "multiple independent piles with weird move rules": compute g per pile and XOR.

## Minimax with pruning

For game trees too large for DP (chess, tic-tac-toe AIs), minimax with **alpha-beta pruning** explores fewer nodes, best when good moves are tried first. Name-level unless the problem is a small game.

## Interview angle

Always state "both play optimally", define the DP from the perspective of the player to move, and use the difference trick to avoid two-value states.
`,
    doubts: [
      ["Why define dp as a score difference?", "A zero-sum game's outcome depends only on the difference. With the difference from the mover's perspective, the opponent's optimal reply is captured by subtracting dp of the next state, so one number per state suffices."],
      ["Why is the XOR of pile sizes the Nim criterion?", "From an XOR of 0, every move makes the XOR non-zero; from a non-zero XOR, there is always a move making it 0 (reduce a pile that has the highest set bit of the XOR). The player facing XOR 0 when no stones remain has lost."],
      ["What is mex?", "The smallest non-negative integer not in a set. mex({0, 1, 3}) = 2. A position's Grundy number is the mex of its options' Grundy numbers."],
    ],
    revise: md`
? Score difference recurrence? :: dp[s] = max over moves of gain − dp[next].
? Ends-of-array game? :: dp[l][r] = max(a[l] − dp[l+1][r], a[r] − dp[l][r−1]).
? Winning position? :: Some move reaches a losing position.
? Nim losing condition? :: XOR of pile sizes is 0.
? Grundy number? :: mex of the options' Grundy numbers.
? Sum of independent games? :: XOR the Grundy numbers.
`,
    pitfalls: ["Tracking both scores separately (state blow-up)", "Forgetting perspective switches", "Assuming greedy play is optimal"],
    quiz: [Q("Nim with piles 3, 4, 7. Who wins with optimal play?", ["*Second player (XOR = 0)", "First player", "Draw", "Depends on order"], "3 ⊕ 4 ⊕ 7 = 0.")],
    sources: [S.article("Sprague–Grundy theorem. Nim", "cp-algorithms", "https://cp-algorithms.com/game_theory/sprague-grundy-nim.html"), S.article("Games on arbitrary graphs", "cp-algorithms", "https://cp-algorithms.com/game_theory/games_on_graphs.html"), S.article("Alpha–beta pruning", "Wikipedia", "https://en.wikipedia.org/wiki/Alpha%E2%80%93beta_pruning")],
    problems: [486, 877, 1140, 1406, 464, 1025, 292, 1510],
  },
  "digit-dp": {
    blurb: "Count numbers in [L, R] with a digit property by walking digits from the most significant with a \"tight\" flag. Turns 10¹⁸ ranges into a few thousand states.",
    signals: ["Count integers ≤ N (or in [L, R]) whose digits satisfy a rule", "N up to 10⁹ or 10¹⁸", "Digit sums, no repeated digits, no consecutive ones, divisibility"],
    lesson: md`
## The technique

Count f(N) = numbers in [0, N] with the property; then the answer for [L, R] is f(R) − f(L − 1).

Recurse over digit positions from the most significant, with state:
- **pos**: current digit index;
- **tight**: whether the prefix so far equals N's prefix (if so, the current digit is limited to N's digit; otherwise 0–9);
- **started** (leading zeros): whether a non-zero digit has appeared (matters for "no repeated digits", digit counts, etc.);
- the **property state**: digit sum so far, last digit, a mask of used digits, remainder mod k.

Memoise on (pos, property state, tight, started); with tight usually not memoised (it is true on only one path).

## Examples

- **Numbers At Most N Given Digit Set** (LC 902): tight walk over allowed digits.
- **Count Numbers with Unique Digits** (LC 357), **Numbers With Repeated Digits** (LC 1012): mask of used digits (count complement).
- **Non-negative Integers without Consecutive Ones** (LC 600): over binary digits with the last bit (Fibonacci counts).
- **Number of Digit One** (LC 233): count 1s per position, or digit DP carrying the count.
- **Count of Integers with digit sum in [min, max]** (LC 2719): state = digit sum.
- **Rotated Digits** (LC 788) and "stepping numbers" (LC 2801): last digit as state.

## Complexity

States ≈ (number of digits) × (property values) × 2 × 2, each with ≤ 10 transitions. For 18 digits and digit sums ≤ 162: about 18 · 163 · 10 ≈ 3·10⁴. Tiny.

## Typical bugs

- Leading zeros counted as digits (e.g. "00012" has repeated zeros).
- f(L − 1) with L = 0.
- Forgetting to reset tight when choosing a smaller digit.
`,
    doubts: [
      ["Why is tight not part of the memo key?", "Only one path through the recursion is tight at each position (the one equal to N's prefix). Memoising non-tight states is where all the reuse happens; including tight is harmless but unnecessary."],
      ["Why track 'started'?", "Leading zeros are not real digits. For properties like 'no repeated digits' or 'number of zeros', treating 0007 as having three zeros would be wrong."],
    ],
    revise: md`
? Range trick? :: f(R) − f(L − 1).
? State components? :: pos, tight, started, property state.
? Tight meaning? :: Prefix equals N's prefix; current digit capped by N's digit.
? Why 'started'? :: To ignore leading zeros.
? Typical state count? :: Digits × property values × small constants.
`,
    pitfalls: ["Leading zeros", "L = 0 edge case", "Memoising across different N without clearing"],
    quiz: [Q("Digit DP for N = 10¹⁸ typically has about how many states?", ["10¹⁸", "10⁹", "*a few thousand to tens of thousands", "2⁶⁴"], "Digits × property values.")],
    sources: [S.article("Digit DP", "USACO Guide", "https://usaco.guide/gold/digit-dp"), S.article("Digit DP tutorial", "Codeforces blog", "https://codeforces.com/blog/entry/53960")],
    problems: [902, 357, 1012, 600, 233, 2719, 788, 2801],
  },
  "dp-optimizations": {
    blurb: "When the transition is the bottleneck: monotone queues, convex hull trick, divide and conquer and Knuth optimisations, and matrix exponentiation for linear recurrences.",
    signals: ["DP with an O(n) inner loop over a structured range", "Transitions of the form min over j of (a[j]·x[i] + b[j])", "Huge n with a fixed-size linear recurrence"],
    lesson: md`
## Monotone queue

dp[i] = f(i) + max over j in a sliding window of g(j): keep a monotonic deque. O(n). See deque-optimised DP.

## Convex hull trick (CHT)

dp[i] = min over j of (m_j · x_i + c_j): each j is a line; the query is the lowest line at x_i. If slopes are added in sorted order and queries are sorted, maintain the lower envelope with a deque: O(n). Otherwise use a Li Chao tree: O(n log n). Appears in "split into groups with cost = (sum)²" problems.

## Divide and conquer optimisation

For dp[k][i] = min over j < i of dp[k − 1][j] + cost(j, i) when the optimal j is monotone in i: compute the middle i's optimum, then recurse on each half with a narrowed j-range. O(k · n log n) instead of O(k · n²). Holds when cost satisfies the quadrangle inequality.

## Knuth's optimisation

For interval DP with monotone optimal split points: O(n³) → O(n²). Optimal BST, some merge-stones variants.

## Matrix exponentiation

A linear recurrence with a fixed number of states (Fibonacci, tribonacci, counting walks of length n in a small graph, state-machine DP) can be written as v_{n} = M · v_{n−1}, so v_n = Mⁿ · v_0. Fast exponentiation computes Mⁿ in O(s³ log n). Fibonacci(10¹⁸) mod p in about 60 matrix multiplications.

## SOS DP (sum over subsets)

f[mask] = Σ over submasks of g[sub] in O(n · 2ⁿ) instead of 3ⁿ, by iterating bits. Name-level.

## Interview usage

Rare to implement, valuable to recognise. Saying "this transition is a sliding window max, so a monotone deque makes it linear" or "this is a linear recurrence, so matrix power gives log n" is a strong signal.
`,
    doubts: [
      ["How do I know which optimisation applies?", "Look at the transition: a window max/min → monotone queue; a linear function of i with j-dependent coefficients → convex hull trick; a monotone argmin across rows → divide and conquer; monotone split points in interval DP → Knuth; fixed linear recurrence with huge n → matrix power."],
      ["Why does matrix exponentiation work for Fibonacci?", "[F(n+1), F(n)] = [[1,1],[1,0]] · [F(n), F(n−1)]. Applying the matrix n times is raising it to the n-th power, computable with repeated squaring."],
    ],
    revise: md`
? Window max transition? :: Monotone deque: O(n).
? min over j of (m_j x_i + c_j)? :: Convex hull trick or Li Chao tree.
? Monotone argmin across i? :: Divide and conquer optimisation: O(kn log n).
? Interval DP with monotone splits? :: Knuth: O(n²).
? Linear recurrence, huge n? :: Matrix exponentiation O(s³ log n).
? Sum over subsets? :: SOS DP O(n 2ⁿ).
`,
    pitfalls: ["Applying an optimisation without its monotonicity condition", "Overflow in matrix products (use mod)"],
    quiz: [Q("F(10¹⁸) mod p is computed by…", ["iteration", "*matrix exponentiation", "memoisation", "Binet's formula with floats"], "About 60 squarings of a 2×2 matrix.")],
    sources: [S.article("Convex hull trick and Li Chao tree", "cp-algorithms", "https://cp-algorithms.com/geometry/convex_hull_trick.html"), S.article("Divide and conquer DP", "cp-algorithms", "https://cp-algorithms.com/dynamic_programming/divide-and-conquer-dp.html"), S.article("Knuth's optimization", "cp-algorithms", "https://cp-algorithms.com/dynamic_programming/knuth-optimization.html"), S.article("Binary exponentiation (matrices)", "cp-algorithms", "https://cp-algorithms.com/algebra/binary-exp.html")],
    problems: [1696, 509, 1137, 1220, 2944],
  },
};
