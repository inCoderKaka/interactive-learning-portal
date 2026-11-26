import { md } from "@/content/ai/md";
import { Q } from "@/content/h";
import { S, type Deep } from "../types";

/** Dynamic programming: foundations, 1D, 2D, knapsack and advanced families. */
export const dp: Record<string, Deep> = {
  "dp-foundations": {
    blurb: "How to derive any DP instead of recalling it: brute-force recursion, find the changing parameters (the state), memoise, flip to a table, then compress space. Plus how to recognise DP and talk about it.",
    signals: ["Count the ways, find the minimum or maximum, decide feasibility", "Choices at each step, and the same subproblems recur", "Brute force recursion is exponential but has few distinct arguments"],
    lesson: md`
## What dynamic programming is

Dynamic programming solves a problem by expressing its answer in terms of answers to smaller instances of the same problem, and computing each distinct smaller instance only once. The name is historical (Richard Bellman, 1950s); "programming" meant planning, and "dynamic" sounded good to funders. Two properties make it applicable:

- **Optimal substructure**: an optimal answer is built from optimal answers to subproblems. Shortest paths have it (a sub-path of a shortest path is shortest); longest simple paths do not (a sub-path of a longest simple path need not be longest, because the remaining path constrains which vertices are free).
- **Overlapping subproblems**: the brute-force recursion meets the same subproblem many times. Naive Fibonacci calls f(30) over 800,000 times while there are only 31 distinct arguments.

Divide and conquer has the first property but not the second (merge sort's halves never repeat), which is why it needs no memo.

## The derivation path (say it out loud)

1. **Brute-force recursion.** Define f(args) = the answer for a subproblem, and write it as a choice over the **last (or first) decision**. Climbing stairs: f(i) = f(i − 1) + f(i − 2) because the last step was 1 or 2.
2. **State.** The arguments that change between calls are the state. Count the distinct states: that is the memo size.
3. **Memoise** (top-down). Cache f by its arguments. Complexity = number of states × work per state.
4. **Tabulate** (bottom-up). Fill a table in an order where every dependency is computed first.
5. **Compress space.** If row i only needs rows i − 1 (and i − 2), keep only those.
6. **Reconstruct** the solution (not just its value) by storing the choice made at each state, or by walking the table backwards and re-deriving which choice produced each value.

Interviewers value this path more than a memorised recurrence: it shows you could solve an unseen DP.

## Worked example: minimum path to the bottom of a triangle

1. f(r, c) = the minimum sum from cell (r, c) to the bottom = tri[r][c] + min(f(r + 1, c), f(r + 1, c + 1)), and f on the last row is the cell itself.
2. State (r, c): about n²/2 states, O(1) work each.
3. Memoising makes it O(n²); the brute force was O(2ⁿ).
4. Bottom-up: start from the last row and move up.
5. Each row needs only the row below: one array of length n, updated left to right in place (dp[c] = tri[r][c] + min(dp[c], dp[c + 1]) reads only cells not yet overwritten in this row).
6. To print the path, record which child was smaller at each cell.

## Top-down vs bottom-up

| | Top-down (memo) | Bottom-up (table) |
|---|---|---|
| Writing it | directly from the recursion | needs a fill order |
| Computes | only reachable states | all states |
| Overhead | recursion and hashing | tight loops |
| Risks | recursion depth | wasted work on unreachable states |
| Space optimisation | hard | easy (rolling arrays) |

In Python, functools.cache turns a recursive function into a memoised one; beware the default recursion limit (1000) for deep states, and clear the cache between test cases if it captures inputs. Java and C++ need an explicit array or map; arrays are much faster than hash maps when the state is a small integer range.

The two produce the same values. A common interview path: write top-down to get correctness quickly, then convert to bottom-up if asked for space optimisation.

## Designing the state

- **Prefix or suffix index**: dp[i] = the best for the first i elements (or from i to the end).
- **Two indices**: two sequences (dp[i][j]) or an interval (dp[l][r]).
- **Index plus a small extra**: holding a stock or not, the last colour used, remaining budget, transactions left, the remainder mod k.
- **Bitmask** of used elements when n ≤ 20.
- **Tree node** (plus whether it is chosen).
- **Value instead of index**: dp over amounts, sums or capacities (knapsack), when the transition moves in value space.

The test for a correct state: **if two different histories reach the same state, every future decision and its payoff must be the same for both.** If they could have different futures, the state is missing information (add it). If the state carries information that never changes a future decision, it is bloated (drop it).

## Recognising DP

- The question asks for a count, a minimum, a maximum, or feasibility, over a space of choices.
- Each choice affects later choices (otherwise a greedy or a simple loop works).
- A greedy feels plausible but small counterexamples break it (coin change with {1, 3, 4} and amount 6: greedy 4 + 1 + 1, optimal 3 + 3).
- Constraints fit a polynomial table: n ≤ 1000 for O(n²), n ≤ 100–500 for O(n³), n·W ≤ 10⁷ for knapsack, n ≤ 20 for 2ⁿ.
- The brute-force recursion has a small number of distinct argument combinations.

## DP and graphs

Every DP is a shortest or longest path (or a path count) in the DAG whose nodes are states and whose edges are transitions. That view explains the fill order (a topological order), why cycles break DP (you need Dijkstra or Bellman–Ford instead), and why memoised DFS is DP on a DAG.

## Complexity

Time = number of states × transitions per state (plus the cost of each transition). Space = number of states, or less with rolling arrays. State this formula explicitly in interviews; it shows you know where the cost comes from and what to shrink.

## Common bugs

- Wrong base case: dp[0] must mean "empty input" consistently (1 way, 0 cost, true).
- Wrong fill order: reading a state not yet computed (interval DP filled by l instead of by length).
- Off-by-one between dp indices and array indices (dp[i] usually covers a[0..i − 1]).
- Using 0 for "impossible" in a max-DP where 0 is a valid value: use −∞ (or None).
- Integer overflow in counting problems: apply the modulus at every addition.
- Memoising on mutable arguments (lists) or forgetting an argument in the key.

## Interview angles

- Narrate the six steps; write the recurrence in words before code.
- Always give the complexity as states × transitions.
- Expect follow-ups: reduce space, reconstruct the answer, handle a new constraint (which usually becomes one more state dimension).

## Connections

Every other DP page is this method applied to a particular state shape: prefix (linear, partition), prefix plus extra (state machines, knapsack), two prefixes (two-sequence), interval, subset (bitmask), subtree (tree DP) and digits (digit DP).
`,
    doubts: [
      ["How do I find the state when I'm stuck?", "Write the brute-force recursion first, even if it is exponential. Its parameters are the candidate state. Then ask whether any parameter can be dropped (it is determined by the others) or must be added (two calls with equal parameters behave differently)."],
      ["Top-down or bottom-up in an interview?", "Start top-down: it follows the recursion you just explained and is less error-prone. Offer bottom-up and space compression as the optimisation step."],
      ["What is the difference between DP and greedy?", "Greedy commits to one choice at each step using a local rule; DP considers all choices and keeps the best of each subproblem. Greedy is correct only when an exchange argument proves the local choice safe."],
      ["Why does memoised Fibonacci go from O(2ⁿ) to O(n)?", "There are only n distinct arguments; each is computed once and then read from the cache. The exponential tree of calls collapses into a chain."],
      ["When does memoisation not help?", "When subproblems do not repeat (merge sort, quicksort) or when the state space itself is exponential (all permutations) with little overlap."],
      ["How do I decide between \"first decision\" and \"last decision\" when writing the recurrence?", "Pick whichever leaves a subproblem of the same shape. Prefix states use the last decision (what was the last item?), suffix states use the first. Interval problems often need the last action inside the interval (Burst Balloons) because it fixes the context."],
      ["When is memoisation slower than tabulation?", "When almost every state is reachable anyway, recursion and hash lookups add overhead that tight loops avoid, and deep recursion can crash. Memoisation wins when only a small fraction of states is reachable (sparse states, large value ranges)."],
      ["Can greedy and DP give the same answer?", "Yes, when the greedy choice is provably part of an optimal solution (an exchange argument). Then the DP's max or min is always achieved by the greedy option, and the greedy is just a faster DP. If you cannot prove it, test small counterexamples and fall back to DP."],
    ],
    revise: md`
? Two DP ingredients? :: Optimal substructure and overlapping subproblems.
? Derivation path? :: Recursion → state → memo → table → space compression → reconstruction.
? DP complexity formula? :: States × transitions per state.
? Top-down pro and con? :: Computes only reachable states; recursion depth risk.
? Bottom-up pro? :: Tight loops and easy rolling-array space savings.
? Greedy coin change counterexample? :: Coins {1, 3, 4}, amount 6: greedy 3 coins, optimal 2.
? Memo sentinel bug? :: Using −1 when −1 is a valid answer.
? Why do longest simple paths lack optimal substructure? :: A sub-path of a longest simple path need not be longest, since the rest of the path constrains which vertices are free.
? State correctness test? :: Two histories reaching the same state must have identical futures; if not, the state lacks information.
? DP as a graph? :: States are DAG nodes, transitions are edges; fill order = topological order; cycles break DP.
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
## What "linear" DP means

A linear DP has one index that walks through the input once: dp[i] is the answer for the prefix of length i (or for the suffix starting at i), and each dp[i] looks back a **constant** number of steps (or a window you can maintain cheaply). The whole family costs O(n) time and, because only the last few values are read, usually O(1) space.

Every problem on this page is solved the same way:

1. Say in words what dp[i] means. "ways[i] = number of ways to reach step i." "best[i] = most money robbing houses 0..i − 1."
2. Ask **what the last decision was**. The last step was 1 or 2 stairs; house i was robbed or not; the last decoded letter used one digit or two.
3. Each choice points at a smaller prefix, so dp[i] is a combination (sum for counting, max/min for optimising) over those choices.
4. Base cases are the empty prefix and the first element. Write them by asking "how many ways to do nothing?" (one) and "what is the best with nothing?" (zero).

## Climbing Stairs (LC 70)

ways[i] = ways[i − 1] + ways[i − 2]: the last move landed on i from i − 1 or i − 2. With ways[0] = 1 and ways[1] = 1 this is the Fibonacci sequence shifted by one. With steps from a set S: ways[i] = Σ ways[i − s] over s ∈ S, s ≤ i.

Dry run for n = 5: ways = 1, 1, 2, 3, 5, 8. The answer is 8.

\`\`\`python
def climb(n):
    a, b = 1, 1          # ways[i-2], ways[i-1]
    for _ in range(n - 1):
        a, b = b, a + b
    return b
\`\`\`

Why ways[0] = 1: there is exactly one way to be at the bottom, doing nothing. Setting it to 0 breaks every count.

## House Robber (LC 198)

best[i] = max(best[i − 1], best[i − 2] + a[i − 1]) where best[i] covers the first i houses: either house i − 1 is skipped (take best[i − 1]) or robbed (then house i − 2 is skipped, so add to best[i − 2]).

Dry run on [2, 7, 9, 3, 1]: best = 0, 2, 7, 11, 11, 12. The answer is 12 (2 + 9 + 1).

\`\`\`python
def rob(a):
    prev, cur = 0, 0         # best[i-2], best[i-1]
    for x in a:
        prev, cur = cur, max(cur, prev + x)
    return cur
\`\`\`

- **House Robber II** (LC 213, circular): the first and last houses are adjacent, so at most one of them is robbed. Run the linear version on a[0..n − 2] and on a[1..n − 1] and take the max. Each run excludes one of the two, which covers every legal choice. Edge case: n = 1 returns a[0].
- **House Robber III** (LC 337, tree): return a pair (robbed, skipped) from each subtree; robbed = val + skipped(left) + skipped(right); skipped = max of each child's pair summed. See tree DP.
- **Delete and Earn** (LC 740): taking value v deletes all v − 1 and v + 1. Bucket points[v] = v × count(v), then House Robber over v = 0..max. Values that are far apart do not interact, so sorting distinct values and resetting at gaps also works.

## Decode Ways (LC 91)

ways[i] = number of decodings of s[0..i − 1]:

- add ways[i − 1] if s[i − 1] is '1'..'9' (a one-digit letter);
- add ways[i − 2] if s[i − 2..i − 1] is "10".."26" (a two-digit letter).

Zeros are the whole difficulty. "0" alone is not a letter, so a '0' must be glued to the digit before it, and only "10" and "20" work. "06", "30" and "100" have zero decodings. Dry run for "226": ways = 1, 1, 2, 3 ("2 2 6", "22 6", "2 26").

**Decode Ways II** (LC 639) adds '*' meaning 1..9. Count with cases: one-digit '*' contributes 9 × ways[i − 1]; two-digit "1*" contributes 9, "2*" contributes 6, "**" contributes 15, "*d" contributes 2 if d ≤ 6 else 1. Take the modulus at every step.

## Minimum-cost families

- **Min Cost Climbing Stairs** (LC 746): dp[i] = cost[i] + min(dp[i − 1], dp[i − 2]); the top is reached from either of the last two steps, so the answer is min(dp[n − 1], dp[n − 2]).
- **Minimum Cost For Tickets** (LC 983): dp[d] = cheapest cover of all travel days ≤ d. On a non-travel day dp[d] = dp[d − 1]; on a travel day dp[d] = min(dp[d − 1] + c1, dp[max(0, d − 7)] + c7, dp[max(0, d − 30)] + c30). Indexing by calendar day keeps the look-back constant.
- **Paint House** (LC 256): dp[i][c] = cost[i][c] + min over c' ≠ c of dp[i − 1][c']. With k colours (LC 265) a naive transition is O(k) per colour, O(nk²) total. Track the smallest and second-smallest of the previous row, and the colour of the smallest: for colour c use the second-smallest if c is that colour, else the smallest. O(nk).
- **Solving Questions With Brainpower** (LC 2140): solving question i skips the next b[i] questions, so it is easier from the right: dp[i] = max(dp[i + 1], p[i] + dp[i + b[i] + 1]). Suffix DP is the right choice whenever a decision affects what comes after it.
- **Perfect Squares** (LC 279): dp[n] = 1 + min dp[n − s²]. O(n√n). Lagrange's four-square theorem says the answer is at most 4.

## Look-back over a range

If dp[i] needs the max or min of dp over a window [i − k, i − 1], a monotonic deque gives each value in amortised O(1) (see deque-optimised DP). If it needs a sum over a window, keep a running window sum of dp. **New 21 Game** (LC 837): P[x] = (P[x − 1] + … + P[x − W]) / W for x ≤ K − 1 + W, maintained with a sliding sum, so O(K + W) instead of O(K·W).

## Counting with a modulus

Counting problems overflow quickly (Climbing Stairs for n = 100 is about 5.7 × 10²⁰). Take the result modulo 10⁹ + 7 after every addition. In Java and C++ keep values in long and reduce before they can overflow; Python does not overflow but gets slow with huge integers, so reduce anyway.

## Space: the rolling window

When dp[i] reads only dp[i − 1] and dp[i − 2], keep two variables and shift them. When it reads a fixed window of k values, keep a circular array of size k (index i mod k). Do not compress before the recurrence is correct: write the full array first, test it, then roll it.

## Interview angles

- Interviewers often start with Climbing Stairs or House Robber and then ask for O(1) space, the circular variant, or reconstruction (which houses?). For reconstruction keep the full array and walk backwards: house i − 1 was robbed iff best[i] ≠ best[i − 1].
- Saying "the last decision was X or Y, so dp[i] combines those two smaller prefixes" earns more credit than reciting a formula.
- Matrix exponentiation computes linear recurrences like Fibonacci in O(log n) when n is huge (10¹⁸).

## Connections

Linear DP is the 1D base of everything else: state-machine DP adds a small state per index, knapsack adds a capacity, and partition DP looks back over all j < i instead of a constant number.
`,
    doubts: [
      ["Why does House Robber II run twice?", "In a circle, the first and last houses are adjacent, so at most one of them is robbed. Excluding the first or excluding the last covers every valid choice, and each case is a straight line."],
      ["What makes Decode Ways tricky?", "Zeros. A '0' cannot stand alone, so ways[i − 1] is not added; it only works as the second digit of '10' or '20'. A string like '100' has zero decodings."],
      ["How do I get O(nk) for Paint House II?", "For each house, the best previous total for colour c is the global minimum of the previous row unless that minimum used colour c, in which case use the second minimum. Track both per row."],
      ["Why is ways[0] = 1 and not 0 in counting problems?", "ways[0] counts the ways to have done nothing yet, and there is exactly one: the empty sequence. Every longer sequence is built by extending it, so if it were 0 every count would collapse to 0. The same logic gives dp[0] = 1 in coin change II and in every \"number of ways\" DP."],
      ["How do I know whether to index by element or by value (or calendar day)?", "Index by whatever the transition looks back over in fixed steps. Tickets look back 1, 7 and 30 calendar days, so day-indexing keeps the look-back constant; indexing by travel-day index would need a binary search for \"the first travel day within 7 days\". Delete and Earn's conflict is between neighbouring values, so it is indexed by value."],
      ["Can House Robber be solved greedily (take every other house, or the larger houses first)?", "No. Alternating picks fails on [2, 1, 1, 2] (best is 2 + 2 = 4 by skipping two in a row), and taking the largest first fails on [3, 4, 3] (4 versus 3 + 3 = 6). The choice at i depends on the best choices before it, which is exactly what the recurrence captures."],
    ],
    revise: md`
? House Robber recurrence? :: best[i] = max(best[i−1], best[i−2] + a[i]).
? Circular House Robber? :: max(run without first, run without last).
? Delete and Earn reduction? :: Sum points per value, then House Robber over values.
? Decode Ways transitions? :: +ways[i−1] if s[i−1] ≠ '0'; +ways[i−2] if s[i−2..i−1] in 10..26.
? Min cost tickets look-back? :: 1, 7 and 30 days.
? Paint House II in O(nk)? :: Track min and second min of the previous row.
? Delete and Earn reduces to what? :: Bucket value × count per value, then House Robber over values.
? Min Cost For Tickets look-back? :: dp[d] = min(dp[d−1]+c1, dp[d−7]+c7, dp[d−30]+c30) on travel days; dp[d−1] otherwise.
? When is a suffix DP more natural? :: When a choice at i affects what comes after it (Brainpower: skip b[i] questions).
? Reconstruct the robbed houses? :: Keep the full array; house i−1 was robbed iff best[i] ≠ best[i−1].
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
## When an index is not enough

Sometimes "the best answer for the first i days" is ambiguous because the future depends on **what situation you are in** after day i: holding a share or not, how many transactions are left, whether you are in a cooldown, which colour you used last. A state-machine DP keeps one value per situation:

dp[i][s] = best result after processing i items and ending in state s.

Draw the machine first. Nodes are states, arrows are the actions allowed on one item, and each arrow carries a gain or a cost. Then dp[i][s] = best over arrows (s' → s) of dp[i − 1][s'] + gain. With S states and A arrows the cost is O(n·A), usually O(n), and since day i reads only day i − 1 the space is O(S).

## The template on stocks

For unlimited transactions there are two states: **hold** (own a share) and **free** (own nothing).

- hold = max(hold, free − price): keep holding, or buy today.
- free = max(free, hold + price): stay free, or sell today.

Start with hold = −∞ (you cannot hold before buying) and free = 0. The answer is free, because ending with a share is never better than having sold it.

Dry run on prices [7, 1, 5, 3, 6, 4]:

| day | price | hold | free |
|---|---|---|---|
| 0 | 7 | −7 | 0 |
| 1 | 1 | −1 | 0 |
| 2 | 5 | −1 | 4 |
| 3 | 3 | 1 | 4 |
| 4 | 6 | 1 | 7 |
| 5 | 4 | 3 | 7 |

The answer is 7 (buy 1 sell 5, buy 3 sell 6).

## The six stock problems

| Problem | States | Twist |
|---|---|---|
| I (LC 121): one transaction | min price so far | answer = max(price − minSoFar) |
| II (LC 122): unlimited | hold, free | equals the sum of all positive daily gains |
| III (LC 123): at most 2 | buy1, sell1, buy2, sell2 | four variables updated in order |
| IV (LC 188): at most k | buy[j], sell[j], j = 1..k | if k ≥ n/2 it is problem II |
| Cooldown (LC 309) | hold, sold, rest | after selling you must rest one day |
| Fee (LC 714) | hold, free | subtract the fee once per sale |

**At most k transactions.** Count a transaction when you buy. For j from 1 to k:

- buy[j] = max(buy[j], sell[j − 1] − price)
- sell[j] = max(sell[j], buy[j] + price)

with sell[0] = 0 and buy[j] = −∞ initially. The answer is sell[k] (the sell values are non-decreasing in j because a transaction you do not need can be skipped). O(nk) time, O(k) space. If k ≥ n/2 you can make every profitable trade anyway, so fall back to problem II and avoid an O(n²) table.

**Cooldown.** Three states: hold, sold (sold today), rest (free and allowed to buy).

- hold' = max(hold, rest − price)   (buy only from rest)
- sold' = hold + price
- rest' = max(rest, sold)           (yesterday's sale finishes the cooldown)

Answer max(sold, rest). All three must be computed from **yesterday's** values; overwrite only after computing all of them.

**Fee.** free = max(free, hold + price − fee). Charging the fee on buy instead (hold = max(hold, free − price − fee)) gives the same answer.

## Why updating in place usually works

In problem II, computing hold first and then using the new hold in free means you could buy and sell on the same day. That trade earns exactly zero, so it never changes the optimum. In problem III, updating buy1, sell1, buy2, sell2 in that order lets transaction 2 start on the day transaction 1 ends, which is also harmless. Cooldown is different: using today's sold to update today's rest would let you buy the day after selling without resting, so it needs the previous values.

## Is problem II greedy or DP?

Both. The two-state DP is the general method; summing every positive difference prices[i] − prices[i − 1] is a greedy that happens to be correct because any profitable trade from day a to day b equals the sum of the daily differences in between, and adding the negative ones can only hurt. The DP generalises to fees and cooldowns; the greedy does not (a fee makes splitting a long rise into daily trades costly).

## Other state machines

- **Flip String to Monotone Increasing** (LC 926): states "still in the zeros part" and "in the ones part". zeros' = zeros + (c == '1'); ones' = min(zeros, ones) + (c == '0').
- **Count Vowels Permutation** (LC 1220): five states, one per last vowel; the rules give the arrows. Count paths of length n.
- **Knight Dialer** (LC 935): ten states (digits); the arrows are knight moves on the keypad.
- **Student Attendance Record II** (LC 552): states (absences used ∈ {0, 1}, trailing lates ∈ {0, 1, 2}): six states.
- **Wiggle Subsequence** (LC 376): states "last move was up" and "last move was down"; each element can extend the opposite state.
- **Paint House**: the state is the last colour.
- **Maximum alternating subsequence sum** (LC 1911): states "next element is added" and "next element is subtracted".

Small state machines run for many steps (n = 10⁹) become **matrix exponentiation**: the transition is an S × S matrix, and n steps cost O(S³ log n).

## How to design the states

List what the next decision depends on. If two histories lead to the same allowed future actions and the same future gains, they can share a state. If they cannot, split the state. Then write one line per arrow and check that every arrow appears exactly once.

## Interview angles

- Start with problem I (minimum so far), then II, then III; interviewers love asking "now with at most two transactions".
- Draw the machine on the whiteboard before writing code: it makes cooldown and fee variants one-line changes.
- Ask whether short selling or partial shares are allowed (they are not in the LeetCode versions).

## Connections

State-machine DP is linear DP with a small second dimension. Regex matching and KMP are state machines over characters; digit DP is a state machine over digits with a "tight" flag.
`,
    doubts: [
      ["Why is k ≥ n/2 the same as unlimited transactions?", "A transaction needs at least two days (buy, then sell), so at most n/2 profitable transactions can happen. With k at least that, the limit never binds."],
      ["Cooldown: which values must come from yesterday?", "Buying today must use yesterday's 'rest' (not 'sold'), so compute the new values from the previous day's copies rather than updating in place."],
      ["Is Stock II's 'sum of positive differences' greedy or DP?", "Both views agree: with unlimited transactions you capture every upward move. The state machine proves it; the greedy is its simplification."],
      ["Why initialise hold to −∞ rather than 0?", "hold means \"I own a share\", which is impossible before the first purchase. 0 would claim you own a share that cost nothing, and the first sale would then report its whole price as profit. Using −prices[0] for day 0 is equivalent to −∞ followed by the day-0 update."],
      ["In \"at most k transactions\", why is the answer sell[k] and not the max over all j?", "sell[j] is the best profit using at most j transactions, and allowing more transactions never hurts because you can leave some unused. So sell is non-decreasing in j and sell[k] is already the max. It holds as long as buy[j] starts at −∞ and sell[j] at 0 for every j."],
      ["How do I handle a cooldown of c days instead of one?", "Buying on day i must come from the free value of day i − c − 1: hold[i] = max(hold[i − 1], free[i − c − 1] − price). Keep a small circular buffer of the last c + 1 free values instead of the single rest state."],
    ],
    revise: md`
? Unlimited stock template? :: hold = max(hold, free − p); free = max(free, hold + p).
? One transaction? :: Track min price; max of p − min.
? At most k? :: buy[j], sell[j] for j = 1..k; O(nk); k ≥ n/2 → unlimited.
? Cooldown? :: States hold, sold, rest; buy only from rest.
? Fee? :: Subtract the fee when selling.
? Many steps, few states? :: Matrix exponentiation.
? Cooldown state equations? :: hold'=max(hold, rest−p); sold'=hold+p; rest'=max(rest, sold); all from yesterday's values.
? Why can't cooldown update in place? :: Using today's sold to set today's rest would allow buying the day after selling with no rest.
? Flip String to Monotone Increasing states? :: zeros'=zeros+(c=='1'); ones'=min(zeros, ones)+(c=='0').
? Many steps with a small machine? :: Matrix exponentiation of the S×S transition matrix: O(S³ log n).
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
## The problem

The **longest increasing subsequence** of a sequence is the longest set of elements, taken in their original order but not necessarily adjacent, whose values strictly increase. For [10, 9, 2, 5, 3, 7, 101, 18] one LIS is [2, 3, 7, 18] with length 4. A sequence can have many LISs; usually only the length is asked.

## O(n²) DP

lis[i] = length of the longest increasing subsequence that **ends at** index i:

lis[i] = 1 + max(lis[j]) over j < i with a[j] < a[i] (or 1 if there is no such j).

The answer is max over i (the LIS can end anywhere). Ending-at-i is the key state choice: "the best within the first i elements" does not tell you which value to beat next, but "ending at i" does (it is a[i]).

Dry run on [10, 9, 2, 5, 3, 7, 101, 18]: lis = 1, 1, 1, 2, 2, 3, 4, 4. This is fine for n up to a few thousand.

**Reconstruction:** store prev[i] = the j that achieved the max, start from the index with the largest lis, and follow prev back.

**Counting** (LC 673): keep cnt[i], the number of LISs ending at i. When lis[j] + 1 > lis[i], set lis[i] = lis[j] + 1 and cnt[i] = cnt[j]; when equal, add cnt[j]. Sum cnt over the indices with maximal lis.

## O(n log n): the tails array

tails[k] = the **smallest possible last value** of an increasing subsequence of length k + 1 seen so far.

For each x: binary search the first tail ≥ x (lower bound). If there is one, replace it with x; otherwise append x. The final length of tails is the LIS length.

[[widget:lis]]

\`\`\`python
from bisect import bisect_left
def lis_length(a):
    tails = []
    for x in a:
        i = bisect_left(tails, x)
        if i == len(tails): tails.append(x)
        else: tails[i] = x
    return len(tails)
\`\`\`

Dry run on [10, 9, 2, 5, 3, 7, 101, 18]:

| x | tails after |
|---|---|
| 10 | [10] |
| 9 | [9] |
| 2 | [2] |
| 5 | [2, 5] |
| 3 | [2, 3] |
| 7 | [2, 3, 7] |
| 101 | [2, 3, 7, 101] |
| 18 | [2, 3, 7, 18] |

**Why it is correct.** Invariant: tails is strictly increasing, and tails[k] is the smallest tail among all increasing subsequences of length k + 1 in the prefix seen. When x arrives, it can extend any subsequence whose tail is < x; the longest such has length i (the lower-bound position), producing a subsequence of length i + 1 ending in x. Since tails[i] ≥ x, x is a smaller (or equal) tail for length i + 1, so it replaces tails[i]. No other entry can improve. Keeping each tail as small as possible keeps the most options open for later elements.

**tails is not an LIS.** In the run above, after reading 3 the array [2, 3] happens to be a real subsequence, but in general entries come from different subsequences (try [3, 4, 1]: tails = [1, 4] and "1, 4" is not in increasing index order). For the actual subsequence, record for each x the index of the element at tails[i − 1] when x was placed, plus the index stored at each tails position, and walk back.

- **Non-decreasing** subsequence (equal values allowed): use upper bound (the first tail > x).
- **Strictly decreasing**: negate the values, or reverse the comparison.

This is **patience sorting**: deal cards onto piles, each card going on the leftmost pile whose top is ≥ it; the number of piles is the LIS length. By Dilworth's theorem, the LIS length also equals the minimum number of non-increasing sequences needed to cover the array.

## Disguises

- **Russian Doll Envelopes** (LC 354): an envelope fits if both width and height are strictly smaller. Sort by width ascending and, for equal widths, **height descending**, then run LIS on the heights. The descending tie-break stops two envelopes with the same width from both being taken, since their heights then appear in decreasing order.
- **Maximum Length of Pair Chain** (LC 646): sort by end and pick greedily (interval scheduling), or LIS on pairs.
- **Minimum deletions to make an array sorted** = n − LIS (non-decreasing version).
- **Minimum Number of Removals to Make Mountain Array** (LC 1671): compute LIS ending at i from the left and LDS starting at i from the right; for each valid peak (both > 1) the mountain length is left[i] + right[i] − 1.
- **Longest Divisible Subset** (LC 368): sort, then the O(n²) DP with "a[i] % a[j] == 0" instead of "<"; divisibility is transitive on a sorted list, so the chain condition only needs the previous element.
- **Longest String Chain** (LC 1048): sort words by length; dp[w] = 1 + max dp[w with one letter deleted].
- **Minimum Operations to Make a Subsequence** (LC 1713): target has distinct values, so map each arr element to its index in target (dropping missing ones) and find the LIS of those indices; the answer is len(target) − LIS.
- **Building bridges / box stacking**: sort by one coordinate, LIS on the other.
- **Increasing triplet** (LC 334): keep only tails[0] and tails[1]; the answer is true if a third element beats both. O(1) space.

## Relation to LCS

LIS(a) = LCS(a, sorted distinct a). In the other direction, the LCS of two permutations of the same values reduces to an LIS: relabel the first permutation as 0, 1, 2, …, rewrite the second with those labels, and find its LIS in O(n log n) instead of the O(n²) LCS table.

## Fenwick-tree version

Process values in order of index; for each a[i], query the maximum lis over values < a[i] with a Fenwick tree (or segment tree) over compressed values, then update a[i]'s position. O(n log n), and it also handles counting (store (length, count) pairs) and "LIS with a value gap at most k" (LC 2407) by querying a value range.

## Interview angles

- Give the O(n²) DP first, explain the ending-at-i state, then the tails optimisation with the invariant.
- Expect "print one LIS" and "count the LISs" as follow-ups.
- Russian Doll Envelopes is the most common hard variant; the tie-break is what is being tested.

## Connections

LIS is a DP on a DAG (edges from smaller earlier values to larger later ones). The patience-sorting greedy is an example of "keep the best representative per length", the same idea as keeping the smallest end per room count in interval problems.
`,
    doubts: [
      ["Why is tails not the actual subsequence?", "Replacing a tail with a smaller value can put a later element before earlier ones in the array. tails records the best end value for each length, not one consistent subsequence. Reconstruction needs parent pointers."],
      ["Why sort heights descending for equal widths in Russian dolls?", "Envelopes with equal widths cannot nest. Sorting their heights descending ensures the LIS on heights cannot pick two of them (it needs strictly increasing heights)."],
      ["lower_bound or upper_bound?", "Strictly increasing: lower_bound (replace the first tail ≥ x). Non-decreasing: upper_bound (replace the first tail > x), so equal values can extend."],
      ["Why must the O(n²) state be \"ends at i\" instead of \"best within the first i\"?", "To extend a subsequence you must know its last value. \"Ending at i\" fixes the last value as a[i]; \"best within the first i\" could end anywhere, so you cannot tell whether a[i + 1] extends it. The final answer then takes the max over all ending points."],
      ["How do I reconstruct an actual LIS from the O(n log n) method?", "Keep tailIdx[k] = the index of the element currently at tails[k], and parent[i] = tailIdx[k − 1] at the moment element i is placed at position k. After the scan, start at tailIdx[last] and follow parent links back, then reverse."],
      ["Does LIS with a maximum difference between neighbours still work with tails?", "No: the tails trick only knows the smallest tail per length, not whether a predecessor is within distance k. Use a segment tree over values: for a[i], query the max lis over the value range [a[i] − k, a[i] − 1], then set position a[i]. That is LC 2407."],
    ],
    revise: md`
? O(n²) recurrence? :: lis[i] = 1 + max lis[j] for j < i with a[j] < a[i].
? tails[k] means? :: Smallest tail of an increasing subsequence of length k + 1.
? Update per element? :: Replace the first tail ≥ x (lower_bound), else append.
? Non-decreasing variant? :: upper_bound.
? Russian dolls sort? :: Width asc, height desc; LIS on heights.
? Minimum deletions to sort? :: n − LIS.
? Number of LIS? :: Track (length, count) per index.
? Count the number of LISs? :: Track cnt[i] beside lis[i]: on a longer length copy cnt[j], on an equal length add it; sum over maximal lis.
? Increasing triplet in O(1) space? :: Keep the two smallest tails; any element above both means true.
? LCS of two permutations fast? :: Relabel by positions in the first; LIS of the relabelled second: O(n log n).
? Mountain array removals? :: LIS from the left and LDS from the right at each peak with both > 1; n − max(left + right − 1).
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

A partition DP cuts a sequence into consecutive pieces, each piece is scored or validated on its own, and pieces do not interact except through their order. The state is a prefix:

dp[i] = best answer for the prefix s[0..i − 1], with dp[0] = the neutral value (true, 0, or 0 cuts).

The transition chooses the **last piece** s[j..i − 1]:

dp[i] = combine over j < i of (dp[j] ⊕ cost(j, i)), restricted to valid pieces.

There are O(n²) (j, i) pairs, times the cost of checking or scoring a piece. Most speed-ups come from making that check O(1) or from limiting how far back j can go.

Why "last piece": after fixing the last piece, what remains is again a prefix, so the subproblem has the same shape. Choosing the first piece works too if you index by suffix.

## Word Break (LC 139)

ok[i] = true if s[0..i − 1] can be split into dictionary words. ok[0] = true; ok[i] = any ok[j] with s[j..i − 1] in the dictionary.

Dry run for s = "leetcode", dict = {leet, code}: ok[0] = T, ok[4] = T ("leet"), ok[8] = T (ok[4] and "code"). Answer T.

Costs and speed-ups:

- A naive loop over all j and substring hashing is O(n² · L) where L is the substring length (building and hashing the substring).
- Limit j to i − maxWordLen ≤ j: O(n · maxLen · L).
- Walk a **trie** forward from each j with ok[j] true: every step is O(1), and you stop when the trie has no child. O(n · maxLen) total.
- BFS over start indices is the same DP viewed as a graph.

\`\`\`python
def word_break(s, words):
    ws, ml = set(words), max(map(len, words), default=0)
    ok = [True] + [False] * len(s)
    for i in range(1, len(s) + 1):
        for j in range(max(0, i - ml), i):
            if ok[j] and s[j:i] in ws:
                ok[i] = True
                break
    return ok[-1]
\`\`\`

**Word Break II** (LC 140) lists all sentences. Memoise start → list of sentences for the suffix; the output itself can be exponential ("aaaa…" with {a, aa, aaa}), so the complexity is output-bound. Run Word Break I first to return [] quickly when no split exists.

## Palindrome Partitioning II (LC 132)

cuts[i] = minimum cuts for s[0..i] so that every piece is a palindrome. cuts[i] = min over j ≤ i with s[j..i] palindromic of (cuts[j − 1] + 1), and 0 when s[0..i] is itself a palindrome.

- Precompute isPal[j][i] by interval DP (isPal[j][i] = s[j] == s[i] and isPal[j + 1][i − 1]): O(n²) time and space.
- Or expand around every centre: for each palindrome s[l..r] found during expansion, update cuts[r] = min(cuts[r], (l == 0 ? 0 : cuts[l − 1] + 1)). O(n²) time, O(n) space.

Palindrome Partitioning I (LC 131) asks for all partitions, so it is backtracking with the same isPal table.

## Splitting arrays into k parts

When the number of pieces is fixed, add it to the state: dp[i][p] = best for the first i elements cut into p pieces.

- **Split Array Largest Sum** (LC 410): dp[i][p] = min over j of max(dp[j][p − 1], sum(j..i − 1)). O(n²k) with prefix sums. Binary search on the answer with a greedy check is O(n log Σ) and is the better interview answer; mention both.
- **Minimum Difficulty of a Job Schedule** (LC 1335): dp[i][d] = min over j of dp[j][d − 1] + max(jobs[j..i − 1]). Compute the max incrementally as j moves left: O(n²d). A monotonic stack brings it to O(nd).
- **Partition Array for Maximum Sum** (LC 1043): the last piece has length 1..k and is worth length × max(piece). dp[i] = max over len of dp[i − len] + len × max. O(nk).
- **Filling Bookcase Shelves** (LC 1105): pieces are shelves; a piece is valid while its total width ≤ shelfWidth; the cost is its tallest book. dp[i] = min over valid j of dp[j] + max height.
- **Minimum cost to split an array** (LC 2547): cost = k + the number of elements in the piece that appear more than once; maintain the counts while j moves left.
- **Palindrome Partitioning III** (LC 1278): k pieces, cost = the changes needed to make a piece a palindrome (precomputed per interval).

## Making cost(j, i) cheap

Partition DPs are only as fast as their piece cost. Typical tools: prefix sums (piece sums), a running max or min while j walks left, precomputed interval tables (palindromes, change counts), a trie walk (dictionary membership), and hash sets of words limited by length.

## Partition DP vs interval DP

Partition DP cuts off a **prefix** and the pieces are independent: one index (plus maybe a count), O(n²). Interval DP chooses an operation inside a whole interval and recurses on both sides, because the order of operations matters (cutting a stick, bursting balloons): two indices, O(n³). Test: once a piece is chosen, does anything about it depend on how the rest was split? If not, it is partition DP.

## Interview angles

- Explain the last-piece transition and the validity check, then the speed-up for the check.
- For Word Break, interviewers often ask about BFS versus DP and about the trie optimisation.
- For "minimise the largest piece", show the DP and then switch to binary search on the answer.

## Connections

Partition DP is linear DP whose look-back reaches all the way to the start. When cost(j, i) has special structure (monotone optimal j, or a product form), divide-and-conquer optimisation or the convex hull trick speed it up (see DP optimisations).
`,
    doubts: [
      ["Why limit the last word's length in Word Break?", "No dictionary word is longer than maxLen, so j < i − maxLen can never succeed. This turns O(n²) substring checks into O(n · maxLen)."],
      ["Should Split Array Largest Sum be DP or binary search?", "Both are correct. DP is O(n² k); binary search on the answer with a greedy feasibility check is O(n log(sum)) and simpler. Mention DP, implement binary search."],
      ["Why is Word Break II's complexity \"output-bound\"?", "The number of valid sentences can be exponential (\"aaaaaaa\" with {a, aa, aaa} has a Tribonacci number of splits), and every one must be printed. Memoisation stops you recomputing a suffix's sentences, but it cannot make the output smaller."],
      ["Can partition DPs be solved greedily (take the longest valid piece each time)?", "Rarely. Longest-first fails Word Break for s = \"aaab\" with {a, aaa, ab}: greedy takes \"aaa\" and is stuck on \"b\", but \"a\" + \"a\" + \"ab\" works. Greedy only works when an exchange argument holds, as in Partition Labels (LC 763), where each piece must contain all occurrences of its letters."],
      ["How do I return the actual partition, not just its cost?", "Store choice[i] = the j that gave the best dp[i]. Then walk back: the last piece is s[choice[n]..n − 1], then from choice[n] repeat until 0, and reverse the list."],
    ],
    revise: md`
? Partition DP shape? :: dp[i] over prefixes, loop over the last piece s[j..i).
? Word Break speed-up? :: Only j ≥ i − maxWordLen; dictionary in a set (or trie).
? Palindrome min cuts? :: cuts[i] = min cuts[j−1] + 1 over palindromic s[j..i].
? Split into k parts minimising the max? :: Binary search + greedy (or O(n²k) DP).
? Partition vs interval DP? :: Prefix cuts (1 index) vs operations inside an interval (2 indices).
? Partition DP transition in words? :: Choose the last piece s[j..i−1]; dp[i] combines dp[j] with the cost of that piece.
? Word Break with a trie? :: From each j with ok[j], walk the trie forward; mark ok[i] at word ends. O(n·maxLen).
? Filling Bookcase Shelves piece? :: A shelf (width ≤ limit); cost = tallest book; dp[i] = min dp[j] + height.
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

On a grid where moves go only right and down, every path to (r, c) arrives from (r − 1, c) or (r, c − 1). So

dp[r][c] = cell(r, c) ⊕ combine(dp[r − 1][c], dp[r][c − 1])

where combine is + for counting and min/max for optimising. Fill row by row, left to right, so both parents are ready. First row and first column have one parent each.

**One row of space.** Row r reads only row r − 1 and the cell to its left in row r. Keep one array dp[0..C − 1]: before updating, dp[c] still holds row r − 1's value (the "top"), and dp[c − 1] already holds row r's value (the "left"). So dp[c] = cell + combine(dp[c], dp[c − 1]). O(R·C) time, O(C) space; swap dimensions to make the array the shorter side.

- **Unique Paths** (LC 62): counts; closed form C(R + C − 2, R − 1) since every path is a choice of which R − 1 of the R + C − 2 moves go down.
- **Unique Paths II** (LC 63): an obstacle cell has 0 paths. Careful in the first row and column: after an obstacle every later cell is 0, not 1.
- **Minimum Path Sum** (LC 64): dp = grid + min(top, left).
- **Triangle** (LC 120): go bottom-up from the last row: dp[c] = tri[r][c] + min(dp[c], dp[c + 1]); dp[0] ends as the answer, with no edge cases.
- **Minimum Falling Path Sum** (LC 931): three parents (up-left, up, up-right). LC 1289 (no two consecutive rows in the same column): keep the min and second min of the previous row, as in Paint House II.

\`\`\`python
def min_path_sum(g):
    R, C = len(g), len(g[0])
    dp = [float("inf")] * C
    dp[0] = 0
    for r in range(R):
        for c in range(C):
            left = dp[c - 1] if c else float("inf")
            dp[c] = g[r][c] + min(dp[c], left)   # dp[c] is still the top value here
    return dp[-1]
\`\`\`

## Maximal Square (LC 221)

side[r][c] = the side of the largest all-ones square whose **bottom-right corner** is (r, c):

side[r][c] = 1 + min(side[r − 1][c], side[r][c − 1], side[r − 1][c − 1]) if the cell is '1', else 0.

Why the min of three: a square of side k at (r, c) needs squares of side k − 1 ending at the top, left and diagonal neighbours. If any of them is smaller, the corner square is limited by it. The answer is (max side)². **Count Square Submatrices with All Ones** (LC 1277) sums all side values, because a corner with side k is the corner of exactly k squares (sides 1..k).

Maximal Rectangle is a different problem: heights per row plus the largest-rectangle-in-histogram stack.

## Dungeon Game (LC 174)

A knight walks from the top-left to the bottom-right; cells add or remove health; health must stay ≥ 1. Find the minimum starting health.

Compute **backwards** from the princess: need[r][c] = the minimum health needed on entering (r, c) to finish.

need[r][c] = max(1, min(need[r + 1][c], need[r][c + 1]) − dungeon[r][c])

with need beyond the bottom-right corner set so that need at the corner is max(1, 1 − dungeon[R − 1][C − 1]).

Why forward fails: going forward, a path's state is two numbers (current health and the lowest health so far), and a path with less health now might have a better minimum. You cannot keep just one number per cell. Going backward, the future requirement is a single number, and "the smaller requirement is better" is a total order, so one number per cell suffices.

## Two walkers: Cherry Pickup (LC 741)

Collect cherries going from the top-left to the bottom-right and back, with walls; a cherry is picked once. Running "best path there, then best path back on the remaining grid" fails: the greedy first path can block a better pair of paths.

Instead, send **two walkers forward at the same time**. After t steps both satisfy r + c = t, so the state is (t, r1, r2) with c1 = t − r1 and c2 = t − r2. Each step both move right or down: four combinations. Gain = grid[r1][c1] + grid[r2][c2], counting once if they share a cell. Walls give −∞. O(n³) states with O(1) transitions.

**Cherry Pickup II** (LC 1463): two robots start at the top corners and move down one row per step, each to one of three columns: state (row, c1, c2), nine transitions. O(R·C²·9).

## Counting paths with extra conditions

- **Paths divisible by k** (LC 2435): state (r, c, sum mod k).
- **Out of Boundary Paths** (LC 576): state (moves left, r, c); a step off the grid counts as a success.
- **Knight probability** (LC 688): state (moves, r, c) with probabilities; each move divides by 8.
- **Many obstacles on a huge grid** (no table fits): sort obstacles; paths avoiding all = total − Σ paths through the first obstacle hit, using C(·,·) with factorials mod p. O(k²) for k obstacles.

## When grid DP does not apply

If moves can go in all four directions, paths can loop, the dependency graph has cycles, and row-by-row filling is invalid. Use BFS (unweighted), Dijkstra (weighted), or memoised DFS when the moves are restricted to strictly increasing values (Longest Increasing Path in a Matrix, LC 329: the "increasing" rule makes it a DAG).

## Interview angles

- Ask which moves are allowed; that decides between DP and graph search.
- Show the one-row optimisation and explain why dp[c] still holds the top value.
- For Dungeon Game, explain why the direction of the DP matters; that explanation is the point of the question.

## Connections

Grid DP is two-sequence DP in disguise (LCS fills the same table shape). Two-walker DP is a general trick: when a problem asks for two paths that interact, move them together and share one state.
`,
    doubts: [
      ["Why does Dungeon Game need a backward DP?", "Going forward, a path's viability depends on two numbers (current health and the minimum health so far); you cannot keep just one value per cell. Backwards, the minimum health needed to finish from a cell is a single number."],
      ["Why can't Cherry Pickup be solved by two independent best paths?", "The best first path can take cherries the second path would need, making the combined total worse than a coordinated pair. Moving both walkers together lets the DP account for shared cells."],
      ["How does one row suffice for space?", "dp[r][c] reads dp[r − 1][c] (the old value at index c, not yet overwritten) and dp[r][c − 1] (already updated this row). Updating left to right in one array gives exactly those values."],
      ["Why does Triangle go bottom-up?", "Bottom-up, every cell has exactly two children, so dp[c] = tri[r][c] + min(dp[c], dp[c + 1]) needs no edge checks and the answer lands in dp[0]. Top-down works too but the first and last cells of each row have only one parent and the answer is the min over the last row."],
      ["In Cherry Pickup, why can't I just take the best path and then the best path on what is left?", "The best single path may grab cherries in a way that leaves the second path with little, while two slightly worse paths together collect more. Moving both walkers together lets the DP compare every pair of paths at once, which is what the joint optimum needs."],
      ["How do I recover the actual minimum path in Minimum Path Sum?", "Keep the full table (or a choice bit per cell), start at the bottom-right, and step to whichever of the top or left neighbours has the smaller dp value, until you reach the start. Reverse the cells collected."],
    ],
    revise: md`
? Unique paths closed form? :: C(R + C − 2, R − 1).
? Maximal square recurrence? :: 1 + min(top, left, diagonal) for '1' cells.
? Triangle trick? :: Bottom-up with dp[c] = val + min(dp[c], dp[c+1]).
? Dungeon Game direction? :: Backwards: need = max(1, min(next needs) − cell).
? Cherry Pickup state? :: (step, r1, r2) for two simultaneous walkers.
? Space for grid DP? :: One row.
? One-row grid DP: what does dp[c] hold before the update? :: The top value (row r−1); dp[c−1] already holds row r's left value.
? Count Square Submatrices from Maximal Square? :: Sum of all side values (a corner with side k ends k squares).
? Huge grid with few obstacles? :: Sort obstacles; inclusion–exclusion over the first obstacle hit with binomials: O(k²).
? When is a grid not a DP? :: When moves go in all four directions (cycles): use BFS or Dijkstra.
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

Whenever a problem compares or merges two sequences a (length n) and b (length m), the natural state is a pair of prefixes:

dp[i][j] = the answer for a[0..i) and b[0..j).

Row 0 and column 0 are the **empty prefixes**, and they hold the base cases (comparing anything with nothing). Every transition looks at the last characters a[i − 1] and b[j − 1] and asks what happens to them: matched together, or one of them dropped (or inserted, or replaced). That means each cell reads only the three neighbours (i − 1, j), (i, j − 1) and (i − 1, j − 1). O(n·m) time.

**Space.** Row i reads only row i − 1, so two rows suffice: O(min(n, m)) if you make the shorter string the columns. With a single row, save the old dp[j − 1] (the diagonal) in a variable before overwriting it, because the diagonal is the previous row's value at j − 1, which the left-to-right sweep has already replaced.

## LCS (LC 1143)

The longest common subsequence:

- a[i − 1] == b[j − 1]: dp[i][j] = dp[i − 1][j − 1] + 1 (use the match)
- otherwise: dp[i][j] = max(dp[i − 1][j], dp[i][j − 1]) (drop one of the two last characters)

[[widget:dp-lcs]]

**Why taking the match is always safe.** If the last characters are equal, some LCS ends by matching them: take any LCS; if it does not use a[i − 1] or b[j − 1] as its last pair, you can swap its last element for this pair without making it shorter. So no case analysis is needed on a match.

Dry run, a = "abcde", b = "ace": the bottom-right cell is 3 ("ace").

**Reconstruction.** Walk back from (n, m): on a match go diagonally and record the character; otherwise move toward the larger of top and left (either on a tie). Reverse the collected characters.

\`\`\`python
def lcs(a, b):
    n, m = len(a), len(b)
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            dp[i][j] = dp[i-1][j-1] + 1 if a[i-1] == b[j-1] else max(dp[i-1][j], dp[i][j-1])
    return dp[n][m]
\`\`\`

Relatives that are LCS with a different score:

- **Delete Operation for Two Strings** (LC 583): n + m − 2·LCS deletions.
- **Minimum ASCII Delete Sum** (LC 712): the same table with costs; keep the matches with the largest ASCII sum, or directly minimise the deleted sum.
- **Uncrossed Lines** (LC 1035): exactly LCS (non-crossing matches are a common subsequence).
- **Shortest Common Supersequence** (LC 1092): length n + m − LCS; build it during the walk back, emitting a shared character once on a match and the dropped character otherwise.
- **Longest common substring** (contiguous): dp[i][j] = dp[i − 1][j − 1] + 1 on a match, **0** otherwise, and the answer is the max cell. (Maximum Length of Repeated Subarray, LC 718.)

## Edit distance (LC 72)

The minimum number of single-character inserts, deletes and replaces turning a into b:

- match: dp[i][j] = dp[i − 1][j − 1]
- otherwise 1 + min of:
  - dp[i − 1][j]: **delete** a[i − 1] (a's prefix shrinks, b's stays)
  - dp[i][j − 1]: **insert** b[j − 1] at the end of a (b's prefix shrinks)
  - dp[i − 1][j − 1]: **replace** a[i − 1] by b[j − 1]

Base cases: dp[i][0] = i (delete everything), dp[0][j] = j (insert everything).

[[widget:edit-distance]]

This is the **Levenshtein distance** (1965). With weighted costs it becomes sequence alignment: Needleman–Wunsch (global alignment) and Smith–Waterman (local alignment, where cells are clamped at 0 and the answer is the max cell), the basis of DNA comparison. Unix diff uses the closely related LCS (Myers' O((n + m)·D) algorithm, where D is the edit distance, is fast when files differ little).

**One Edit Distance** (LC 161) needs no table: walk both strings; at the first mismatch, the rest must match after skipping one character in the longer string (or one in each if the lengths are equal).

## Matching with wildcards and regex

**Wildcard Matching** (LC 44): '?' matches one character, '*' matches any sequence (including empty). dp[i][j] = does s[0..i) match p[0..j)?

- p[j − 1] is a letter or '?': dp[i][j] = dp[i − 1][j − 1] and the characters match.
- p[j − 1] == '*': dp[i][j] = dp[i][j − 1] (the star matches empty) or dp[i − 1][j] (the star absorbs s[i − 1] and may continue).
- Base: dp[0][0] = true; dp[0][j] is true only while p[0..j) is all stars.

A greedy two-pointer solution (remember the last star and the position it matched to; on a mismatch, let the star absorb one more character) runs fast in practice and is a good follow-up.

**Regular Expression Matching** (LC 10): '.' matches any one character, and 'x*' means zero or more copies of x.

- p[j − 1] == '*': dp[i][j] = dp[i][j − 2] (zero copies of x) or (x matches s[i − 1] and dp[i − 1][j]) (one more copy, staying on the same pattern position).
- otherwise: dp[i][j] = dp[i − 1][j − 1] and (p[j − 1] == s[i − 1] or p[j − 1] == '.').
- Base: dp[0][j] = dp[0][j − 2] when p[j − 1] == '*' (patterns like "a*b*" match the empty string).

The difference to remember: wildcard '*' stands alone; regex '*' modifies the element before it, which is why the regex transition looks two pattern positions back.

## Interleaving String (LC 97)

Is s3 an interleaving of s1 and s2? First check len(s3) == len(s1) + len(s2). Then dp[i][j] = (dp[i − 1][j] and s1[i − 1] == s3[i + j − 1]) or (dp[i][j − 1] and s2[j − 1] == s3[i + j − 1]). The index i + j − 1 in s3 is fixed by how much of each string has been used, which is why two indices suffice.

## Distinct Subsequences (LC 115)

How many times does t occur as a subsequence of s? dp[i][j] = ways for s[0..i) to produce t[0..j):

dp[i][j] = dp[i − 1][j] + (s[i − 1] == t[j − 1] ? dp[i − 1][j − 1] : 0)

with dp[i][0] = 1 (the empty t is produced once). With one row, iterate j **downwards** so dp[j − 1] still holds the previous row: the same reason as the 0/1 knapsack.

## Faster in special cases

- **LCS of two permutations** → LIS in O(n log n) after relabelling.
- **Edit distance at most k** → only cells with |i − j| ≤ k matter (Ukkonen's band): O(n·k).
- **Hirschberg's algorithm** recovers an actual LCS or alignment in O(n·m) time and O(min(n, m)) space by divide and conquer on the middle row.
- Exact LCS for general strings has no strongly subquadratic algorithm (it would refute the strong exponential time hypothesis), so O(n·m) is the honest answer.

## Interview angles

- Say what dp[i][j] means in words before writing anything; it makes the base row and column obvious.
- Edit distance is often followed by "reconstruct the edits" or "only inserts and deletes" (that is n + m − 2·LCS).
- For regex, test "aab" against "c*a*b" and the empty string against "a*" before finishing.

## Connections

Grid DP fills the same table shape. Palindromic subsequences are LCS of a string with its reverse. Diff tools, spell checkers, plagiarism detection and bioinformatics are all two-sequence DP.
`,
    doubts: [
      ["Why do edit distance's three neighbours mean delete, insert and replace?", "dp[i−1][j] + 1: the last char of a is deleted. dp[i][j−1] + 1: b's last char is inserted into a. dp[i−1][j−1] + 1: the last chars are aligned with a replacement. Matching chars align for free."],
      ["How do I save space with only one row?", "When computing row i left to right, dp[j] still holds row i − 1's value until overwritten, and dp[j − 1] is already row i. The diagonal (row i − 1, j − 1) is lost on overwrite, so store it in a variable before updating each cell."],
      ["Regex '*' versus wildcard '*'?", "In wildcard matching, '*' stands alone and matches any sequence. In regex, '*' modifies the previous token (zero or more copies of it), so the transition looks two pattern characters back."],
      ["Is LCS the same as longest common substring?", "No. A substring is contiguous: dp[i][j] = dp[i−1][j−1] + 1 on a match and 0 otherwise, and the answer is the table maximum. Suffix structures or rolling hashes solve it faster."],
      ["Why is it safe to always take a match in LCS?", "If a[i − 1] == b[j − 1], take any optimal LCS of the two prefixes. If it does not end by pairing these two characters, its last pair uses at most one of them, so swapping that pair for (a[i − 1], b[j − 1]) keeps it valid and the same length. Hence dp[i − 1][j − 1] + 1 is always optimal and the max over the other two is unnecessary."],
      ["What is the time complexity of Wildcard Matching's greedy two-pointer solution?", "Worst case O(n·m), because each failure can make the last star absorb one more character and rescan, but it uses O(1) space and is usually much faster than the table. Mention it after the DP."],
      ["How does Smith–Waterman differ from edit distance?", "It scores matches positively and mismatches and gaps negatively, maximises instead of minimises, clamps every cell at 0 (so an alignment can start anywhere) and takes the best cell anywhere (so it can end anywhere). That finds the best matching region, not a whole-string alignment."],
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
? Edit distance: what does dp[i−1][j] mean as an operation? :: Delete a[i−1].
? Longest common substring vs subsequence? :: Substring resets to 0 on a mismatch and takes the max cell.
? Regex base row? :: dp[0][j] = dp[0][j−2] when p[j−1] is '*' (e.g. "a*b*" matches empty).
? Distinct Subsequences with one row: loop direction? :: j downwards, so dp[j−1] is still the previous row.
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
## Two different questions

"Palindrome" problems split cleanly into two families, and mixing them up is the most common mistake:

- **Substring** problems: the palindrome is **contiguous** ("aba" inside "xabay").
- **Subsequence** problems: characters may be skipped ("aba" from "aXbYa").

Contiguous palindromes are checked by expanding from a centre or by a boolean table; subsequences need an interval DP that can skip characters at either end.

## Substrings: expand around centres

Every palindrome has a centre: a character (odd length) or a gap between two characters (even length). There are 2n − 1 centres. From each, expand while the two ends match.

\`\`\`python
def longest_palindrome(s):
    best = (0, 0)
    for c in range(2 * len(s) - 1):
        l, r = c // 2, c // 2 + c % 2
        while l >= 0 and r < len(s) and s[l] == s[r]:
            l, r = l - 1, r + 1
        if r - l - 1 > best[1] - best[0]:
            best = (l + 1, r)
    return s[best[0]:best[1]]
\`\`\`

O(n²) time in the worst case ("aaaa…"), O(1) space. Uses:

- **Longest Palindromic Substring** (LC 5): keep the longest expansion.
- **Palindromic Substrings** (LC 647): count every successful expansion step (each step is a distinct palindrome by position).
- **Longest palindrome by concatenating two-letter words** (LC 2131) and similar counting puzzles are greedy, not DP.

## Substrings: the isPal table

isPal[i][j] = s[i] == s[j] and (j − i < 2 or isPal[i + 1][j − 1]).

The cell depends on the one inside it (shorter by two), so fill by increasing length, or with i descending and j ascending. O(n²) time and space. Worth it when many palindrome checks follow, as in **Palindrome Partitioning** (LC 131, backtracking over all partitions) and **Palindrome Partitioning II** (LC 132, minimum cuts).

**Manacher's algorithm** finds the longest palindrome at every centre in O(n) (see its own page). Use it when n is large (10⁵ or more) or when you need all centres at once.

## Subsequences: Longest Palindromic Subsequence (LC 516)

lps[i][j] = the longest palindromic subsequence of s[i..j]:

- s[i] == s[j]: lps[i][j] = lps[i + 1][j − 1] + 2 (both ends join the palindrome; for i == j it is 1)
- otherwise: lps[i][j] = max(lps[i + 1][j], lps[i][j − 1]) (drop one end)

Fill by increasing length. O(n²) time; O(n) space with one row if i runs downwards and j upwards, saving the diagonal.

Dry run on "bbbab": the answer is 4 ("bbbb").

**Equivalent formulation:** LPS(s) = LCS(s, reverse(s)). A palindromic subsequence reads the same backwards, so it is common to s and its reverse; conversely, any common subsequence of s and reverse(s) can be turned into a palindrome of the same length (the standard proof pairs up the matched positions from the outside in).

## Edit problems built on LPS

- **Minimum insertions to make s a palindrome** (LC 1312) = n − LPS. Keep the LPS characters; every other character needs a mirror partner inserted.
- **Minimum deletions to make s a palindrome** = n − LPS. Delete everything outside the LPS.
- **Valid Palindrome III** (LC 1216): can you delete at most k characters? Check n − LPS ≤ k.
- **Valid Palindrome II** (LC 680, at most one deletion): no DP; two pointers, and at the first mismatch try skipping either side once.
- **Make a palindrome with at most k changes (replacements)** in a substring: count mismatched pairs, (j − i + 1) / 2 pairs to check; prefix counts per letter answer many queries (LC 1177).

## Counting palindromic subsequences

- **Count all palindromic subsequences** (with repeats by position): cnt[i][j] = cnt[i + 1][j] + cnt[i][j − 1] − cnt[i + 1][j − 1], and when s[i] == s[j] add cnt[i + 1][j − 1] + 1. The subtraction removes the double-counted middle (inclusion–exclusion).
- **Count Different Palindromic Subsequences** (LC 730, distinct values): for each outer letter, find its first and last occurrence inside the range and handle "no inner copy", "one inner copy" and "two or more" separately. Hard, but the structure is the same interval DP.
- **Unique Length-3 Palindromic Subsequences** (LC 1930): for each letter, take its first and last occurrence and count the distinct letters between: O(26·n).

## Choosing

| Question | Method |
|---|---|
| longest palindromic substring | expand around centres (O(n²), O(1)); Manacher for O(n) |
| count palindromic substrings | expand around centres, or Manacher |
| many substring palindrome checks | isPal table |
| longest palindromic subsequence | interval DP or LCS with the reverse |
| make it a palindrome with minimum insertions or deletions | n − LPS |
| at most one deletion | two pointers |

## Interview angles

- Clarify substring or subsequence immediately.
- For LC 5, give the centre expansion first; many interviewers accept it as optimal for the interview and only ask you to name Manacher.
- Off-by-one checks: odd and even centres, and the j − i < 2 base case in the table.

## Connections

LPS is interval DP; the isPal table feeds partition DP; LPS = LCS with the reverse links it to two-sequence DP. Hashing forward and backward also tests any substring for being a palindrome in O(1) after O(n) preprocessing.
`,
    doubts: [
      ["Why 2n − 1 centres?", "Odd-length palindromes centre on a character (n centres); even-length ones centre between two characters (n − 1 gaps)."],
      ["Why is LPS equal to LCS(s, reverse(s))?", "A palindromic subsequence reads the same forwards and backwards, so it is a common subsequence of s and its reverse. Conversely, the LCS can be shown to contain a palindrome of the same length, so the values agree."],
      ["Why does minimum insertions equal n − LPS?", "Keep the longest palindromic subsequence as the 'spine'; every other character needs a mirror partner inserted. Fewer insertions would imply a longer palindromic subsequence."],
      ["Why does \"Palindromic Substrings\" count each expansion step separately?", "Each successful expansion step from a centre yields a palindrome with a different start and end position, and the problem counts substrings by position. So \"aaa\" has 6: three singles, two \"aa\" and one \"aaa\", which is exactly the number of successful steps over all 5 centres."],
      ["When should I use the isPal table instead of expanding around centres?", "When you will ask \"is s[i..j] a palindrome?\" for many (i, j) pairs, as in partitioning problems. Centre expansion answers \"find palindromes\" efficiently but not arbitrary lookups. The table costs O(n²) memory, so for n above a few thousand prefer centres or hashing."],
      ["Does the LPS interval DP need the full n × n table?", "No. lps[i][·] depends only on lps[i + 1][·] and on lps[i][j − 1], so iterate i from n − 1 down to 0 and j upward with one row, keeping the old diagonal value in a temporary."],
    ],
    revise: md`
? Expand around centres cost? :: O(n²) time, O(1) space; 2n − 1 centres.
? isPal recurrence? :: s[i] == s[j] and (j − i < 2 or isPal[i+1][j−1]).
? LPS recurrence? :: Equal ends: inner + 2; else max of dropping either end.
? LPS via LCS? :: LCS(s, reverse(s)).
? Minimum insertions to palindrome? :: n − LPS.
? O(n) longest palindromic substring? :: Manacher.
? Count palindromic subsequences (by position) recurrence? :: cnt[i+1][j] + cnt[i][j−1] − cnt[i+1][j−1], plus cnt[i+1][j−1] + 1 when s[i]==s[j].
? Unique length-3 palindromic subsequences? :: Per letter, the distinct letters between its first and last occurrence.
? At most one deletion palindrome? :: Two pointers; at the first mismatch try skipping each side once.
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

Counting DP uses exactly the same states and transitions as an optimisation DP, but where the optimiser takes a max or min over choices, the counter **adds** the number of ways from each choice. Two rules keep it correct:

1. **The base case counts the empty construction as one way.** dp[0] = 1 for "ways to make amount 0", dp[0][0] = 1 for "ways to match two empty prefixes".
2. **Every object must be produced by exactly one sequence of decisions.** If two decision paths build the same object, it is counted twice. Most counting bugs are violations of this rule.

## Ordered vs unordered: the loop order matters

Coin problems show rule 2 most clearly.

- **Combinations** (order does not matter, Coin Change II, LC 518): loop over **coins outside**, amounts inside. Every combination is built in coin order (all 1s, then all 2s, …), so each multiset has exactly one decision path.
- **Permutations** (order matters, Combination Sum IV, LC 377): loop over **amounts outside**, coins inside. dp[a] = Σ dp[a − c] asks "what was the last coin?", so 1 + 2 and 2 + 1 are different paths and both count.

Example with coins {1, 2} and amount 3: combinations = 2 ({1,1,1}, {1,2}); permutations = 3 (1+1+1, 1+2, 2+1). Swapping the loops silently changes the problem: the most common counting-DP bug.

## Bounded counts and prefix sums

**Number of Dice Rolls With Target Sum** (LC 1155): dp[d][s] = Σ dp[d − 1][s − f] for f = 1..k. Naively O(d · target · k). The inner sum is a sliding window over the previous row, so a running sum (add the new value entering the window, subtract the one leaving) gives O(d · target). The same trick handles "each item at most c copies" in counting knapsacks.

## Avoiding double counting with "previous occurrence"

**Distinct Subsequences II** (LC 940): count the distinct non-empty subsequences of s. Let dp[i] = distinct subsequences (including empty) of s[0..i). Appending s[i − 1] to every existing subsequence doubles the count: dp[i] = 2·dp[i − 1]. But subsequences ending in s[i − 1] that were already created at its previous occurrence p would be created again, so subtract dp[p − 1] (the count before that occurrence): dp[i] = 2·dp[i − 1] − dp[last[c] − 1]. Answer dp[n] − 1 (drop the empty one).

The same "subtract what the previous identical step already produced" idea appears in counting distinct palindromic subsequences and distinct substrings.

## Catalan-type counts

**Unique Binary Search Trees** (LC 96): choose the root i; the left subtree has i − 1 keys and the right n − i keys; they are independent, so multiply: G(n) = Σ G(i − 1)·G(n − i), G(0) = 1. This is the Catalan number Cₙ = C(2n, n)/(n + 1): 1, 1, 2, 5, 14, 42, …. The same recurrence counts balanced parenthesis strings, triangulations of a polygon and non-crossing handshakes (LC 1259).

Product rule: when a structure splits into independent parts, multiply their counts. Sum rule: when the cases are disjoint, add them.

## Probability DP

Probabilities are counts divided by the total, so the same machinery applies with weights:

- **Knight Probability in Chessboard** (LC 688): p[k][r][c] = Σ p[k − 1][r'][c'] / 8 over knight moves.
- **Soup Servings** (LC 808): four operations with probability 1/4 each; for large n the answer converges to 1, so cap n.
- **New 21 Game** (LC 837): window sum of probabilities.
- **Out of Boundary Paths** (LC 576): count with mod, a step off the grid adds to the answer.

Expected values follow from linearity: E[steps] = Σ over states of probability × cost, or a DP E[state] = 1 + Σ p·E[next] when the process moves forward.

## More problems

- **Count Ways To Build Good Strings** (LC 2466): dp[len] = dp[len − zero] + dp[len − one].
- **Number of Music Playlists** (LC 920): dp[i][j] = playlists of length i using j distinct songs: a new song (n − j + 1 choices) or a replay (j − k choices if j > k).
- **Count Vowels Permutation** (LC 1220), **Knight Dialer** (LC 935): state machines with sums.
- **Domino and Tromino Tiling** (LC 790): dp[n] = 2·dp[n − 1] + dp[n − 3], derived by tracking partially filled columns.
- **Number of Ways to Stay in the Same Place** (LC 1269): positions beyond steps/2 are unreachable-and-return, cap the array.
- **Restore The Array** (LC 1416): partition counting with a value bound.

## Modular arithmetic

Apply % MOD after every addition and multiplication. With subtraction, add MOD before the remainder: (a − b + MOD) % MOD, or Java and C++ return negatives. Products of two values below 10⁹ + 7 fit in a signed 64-bit integer; three do not, so reduce between multiplications. Division needs a modular inverse (pow(x, MOD − 2, MOD) for prime MOD).

## Checking a counting DP

Brute-force small cases (n ≤ 6) by enumeration and compare. Off-by-one errors in the base case and double counting both show up immediately.

## Interview angles

- State the canonical construction ("each combination is built in coin order"). That sentence is the proof that nothing is double counted.
- Expect "now order matters" or "now each coin at most once" as follow-ups: the loop order and loop direction answer them.

## Connections

Counting DP shares its states with knapsack, grid DP and two-sequence DP. Combinatorics (binomials, Catalan, inclusion–exclusion) gives closed forms when the DP has a simple structure.
`,
    doubts: [
      ["Why does the loop order change the count in coin problems?", "With coins outside, a coin can only be added after all smaller-index coins are decided, so each multiset is built in one fixed order: combinations. With amounts outside, at each amount any coin can be last, so different orders are counted separately: permutations."],
      ["How does Distinct Subsequences II avoid double counting?", "Appending character c to every subsequence so far doubles the count, but sequences ending with c that were already created at c's previous occurrence get created again. Subtract the count from just before that previous occurrence."],
      ["Why does Combination Sum IV (LC 377) count orders while Coin Change II does not, if both just add dp[a − c]?", "In LC 377 the amount loop is outside, so dp[a] sums over \"the last coin used\" with every earlier coin sequence already counted in dp[a − c]; different last coins give different sequences. In LC 518 the coin loop is outside, so when coin c is processed, dp[a − c] only contains combinations of coins up to c, which forces the coins to appear in non-decreasing order and gives each multiset one path."],
      ["How do I count the number of optimal solutions alongside an optimisation DP?", "Keep a count beside each value. When a transition gives a strictly better value, replace the count with the source's count; when it ties, add the source's count. Number of LIS (LC 673) and counting shortest paths in Dijkstra use exactly this."],
      ["Why does Soup Servings cap n?", "Every operation serves at least as much soup A as soup B on average, so as n grows the probability that A empties first tends to 1. Beyond about 4800 ml the answer is within 10⁻⁵ of 1, which is the required precision, so return 1 and keep the DP small."],
    ],
    revise: md`
? Counting DP transition? :: Add the ways of each choice.
? Coin Change II (combinations) loop order? :: Coins outer, amounts inner.
? Combination Sum IV (permutations) loop order? :: Amounts outer, coins inner.
? Unique BSTs? :: Catalan: G(n) = Σ G(i−1)·G(n−i).
? Subtraction under mod? :: (a − b + MOD) % MOD.
? Distinct subsequences II? :: Double, then subtract the count before the previous occurrence.
? Coins {1,2}, amount 3: combinations vs permutations? :: 2 combinations, 3 permutations.
? Dice rolls in O(d·target)? :: Sliding-window sum over the previous row instead of looping k faces.
? Product rule vs sum rule? :: Independent parts multiply; disjoint cases add.
? Check a counting DP quickly? :: Compare with brute-force enumeration for n ≤ 6.
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
## The problem

n items, item i has weight wt[i] and value val[i]; a bag holds total weight at most W. Each item is taken **once or not at all**. Maximise the total value.

## The recurrence

dp[i][w] = the best value using only the first i items with capacity w:

dp[i][w] = max(dp[i − 1][w], dp[i − 1][w − wt[i]] + val[i])  (the second term only if wt[i] ≤ w)

The last decision is "did item i go in?". Base: dp[0][w] = 0. O(n·W) time and space.

[[widget:knapsack]]

Dry run, W = 5, items (wt, val) = (1, 1), (3, 4), (4, 5), (2, 3):

| items \ w | 0 | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|---|
| none | 0 | 0 | 0 | 0 | 0 | 0 |
| (1,1) | 0 | 1 | 1 | 1 | 1 | 1 |
| (3,4) | 0 | 1 | 1 | 4 | 5 | 5 |
| (4,5) | 0 | 1 | 1 | 4 | 5 | 6 |
| (2,3) | 0 | 1 | 3 | 4 | 5 | 7 |

The answer is 7 (items (3,4) and (2,3)).

## One array: iterate capacity downwards

\`\`\`python
def knapsack(items, W):
    dp = [0] * (W + 1)
    for wt, val in items:
        for w in range(W, wt - 1, -1):     # downwards!
            dp[w] = max(dp[w], dp[w - wt] + val)
    return dp[W]
\`\`\`

When dp[w] is updated, it reads dp[w − wt]. Going **downwards**, dp[w − wt] has not been touched yet for this item, so it is still the previous row's value, and the item is used at most once. Going **upwards**, dp[w − wt] may already include this item, so the item could be added again and again: that is exactly the unbounded knapsack. The loop direction is the only difference between the two.

## Pseudo-polynomial time

O(n·W) looks polynomial, but W is a number, and its input size is only log₂ W bits; W = 10¹⁸ is 60 bits. Knapsack is **NP-complete**, and the DP is fast only when W is small (up to about 10⁷ cells in total). Other regimes:

- **Huge W, small values**: swap roles. dp[v] = the minimum weight achieving value exactly v; the answer is the largest v with dp[v] ≤ W. O(n·Σval).
- **Tiny n (≤ 40)**: meet in the middle: enumerate the 2^(n/2) (weight, value) pairs of each half, keep the Pareto front of one half sorted by weight, and binary search for each pair of the other half.
- **Approximation**: scaling the values down gives a fully polynomial-time approximation scheme (FPTAS), within (1 − ε) of optimal in O(n³/ε).

## Initialisation decides the question

- "At most W" (the usual): dp[w] = 0 for every w. Unused capacity is fine.
- "Exactly W": dp[0] = 0 and dp[w] = −∞ for w > 0, so only full bags are reachable.
- Counting subsets: dp[0] = 1, the rest 0, and + instead of max.
- Feasibility (subset sum): booleans with OR (see the next page).

## Multi-dimensional capacity

**Ones and Zeroes** (LC 474): each string costs (zeros, ones); budgets m and n. dp[z][o] = the most strings within those budgets; for each string loop both z and o **downwards**. O(len·m·n).

**Profitable Schemes** (LC 879): a counting knapsack over (members used, profit so far), with the profit dimension **clamped** at minProfit (any profit ≥ minProfit is the same state). Clamping is the standard way to keep an "at least" dimension finite.

## Disguises

- **Last Stone Weight II** (LC 1049): smashing stones is the same as assigning + and − signs; minimise |sum(A) − sum(B)|. Find the reachable subset sum closest to total/2.
- **Target Sum** (LC 494): subset-sum counting after algebra (next page).
- **Tallest Billboard** (LC 956): dp over the difference between the two supports, storing the taller support's height; each rod goes left, right or nowhere. O(n·Σ).
- **Partition Equal Subset Sum** (LC 416): a boolean knapsack toward total/2.
- **Maximise value with a count limit as well** (at most k items): add a dimension for the count.

## Reconstructing the chosen items

With the 2D table, walk back from (n, W): if dp[i][w] ≠ dp[i − 1][w], item i was taken, so subtract its weight; otherwise skip it. The 1D array overwrites history; if you need the items, keep a boolean take[i][w] (n·W bits) and walk back the same way.

## Fractional knapsack

If items can be split, sort by val/wt descending and take greedily, splitting the last item: optimal by an exchange argument. For 0/1 the greedy fails: W = 50, items (10, 60), (20, 100), (30, 120) by ratio takes the first two (160), but the optimum is the last two (220).

## Interview angles

- Write the 2D recurrence, then compress and explain why the loop runs downwards. That explanation is the most common follow-up.
- Mention the pseudo-polynomial bound and the value-indexed alternative.
- Recognise disguised knapsacks: a budget plus take-or-leave choices.

## Connections

0/1 knapsack is the parent of subset sum, partition problems and many DP-on-trees problems (tree knapsack). Bounded and group knapsacks generalise it; the unbounded knapsack differs only in loop direction.
`,
    doubts: [
      ["Why must the 1D loop go downwards?", "dp[w − wt] must be the value from before considering this item. Going downwards, indices below w have not been updated yet for this item. Going upwards, dp[w − wt] may already include the item, allowing it twice."],
      ["Why is knapsack NP-complete if the DP is polynomial?", "The DP is polynomial in W's value, not in the number of bits needed to write W. Doubling the bits squares W, so the running time is exponential in input size."],
      ["Does greedy by value/weight work for 0/1?", "No. Items (w=10, v=60), (w=20, v=100), (w=30, v=120), capacity 50: greedy by ratio takes the first two (160) but the optimum is the last two (220)."],
      ["Can I use a dictionary of reachable (weight → best value) states instead of an array?", "Yes, and it helps when only a few capacities are reachable or W is huge but sparse. Process items one at a time, building the new dictionary from the old one (never mutating while iterating), and prune dominated states: if a lighter state already has a higher value, the heavier one is useless."],
      ["Does the order of items matter in the DP?", "No. The final dp array is the same for any item order, because each item is considered exactly once against every capacity. Order only matters for reconstruction (which of several optimal sets you recover)."],
      ["How do I handle items with negative values or weights?", "Negative values are just never chosen when maximising, unless forced. Negative weights break the capacity index; shift weights by an offset or reformulate (often items with negative weight are always worth taking, so take them first and increase the capacity)."],
    ],
    revise: md`
? 0/1 knapsack recurrence? :: max(skip, take: dp[i−1][w − wt] + val).
? 1D loop direction? :: Capacity downwards.
? Upwards gives? :: Unbounded knapsack.
? Complexity and its caveat? :: O(nW): pseudo-polynomial.
? Huge W, small values? :: dp over value storing minimum weight.
? Two capacities? :: 2D dp, both loops downward.
? Fractional knapsack? :: Greedy by ratio (only when items are divisible).
? "Exactly W" initialisation? :: dp[0]=0, other capacities −∞ (or ∞ for minimisation).
? Clamp in Profitable Schemes? :: Treat any profit ≥ minProfit as the same state (min(profit, minProfit)).
? Fractional vs 0/1 counterexample? :: W=50: (10,60),(20,100),(30,120); greedy 160, optimum 220.
? Huge W but small values? :: dp[value] = minimum weight; answer = largest v with dp[v] ≤ W.
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

In the unbounded knapsack every item can be taken any number of times. The recurrence changes in one place:

dp[i][w] = max(dp[i − 1][w], dp[i][w − wt[i]] + val[i])

Notice dp[**i**][w − wt[i]], not dp[i − 1]: after taking item i once, you may take it again. In one array, that means iterating capacity **upwards**:

\`\`\`python
for wt, val in items:
    for w in range(wt, W + 1):          # upwards: reuse allowed
        dp[w] = max(dp[w], dp[w - wt] + val)
\`\`\`

When dp[w] reads dp[w − wt], that cell has already been updated for this item, so it may already contain copies of it. Because reuse is allowed, the item loop and the capacity loop can even be swapped for optimisation problems (max/min give the same result either way); for **counting** they cannot, as the next sections show.

## Coin Change (LC 322): minimum coins

dp[0] = 0; dp[a] = min over coins c ≤ a of dp[a − c] + 1; unreachable amounts stay ∞. Answer −1 if dp[amount] is ∞. O(amount × coins).

Dry run, coins {1, 3, 4}, amount 6: dp = 0, 1, 2, 1, 1, 2, 2. The answer is 2 (3 + 3). Greedy (largest coin first) gives 4 + 1 + 1 = 3 coins: wrong.

\`\`\`python
def coin_change(coins, amount):
    INF = amount + 1
    dp = [0] + [INF] * amount
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a and dp[a - c] + 1 < dp[a]:
                dp[a] = dp[a - c] + 1
    return dp[amount] if dp[amount] != INF else -1
\`\`\`

Using amount + 1 as "infinity" avoids overflow when adding 1 (the answer can never exceed amount coins).

**BFS view.** Amounts are nodes and each coin is an edge of weight 1; the minimum number of coins is the shortest path from 0 to amount. BFS can stop as soon as it reaches the amount, which helps when the answer is small.

**When does greedy work?** For "canonical" coin systems such as {1, 2, 5, 10, 20, 50, 100}, largest-first is optimal. Whether a system is canonical can be checked in polynomial time (Pearson's algorithm), and the smallest counterexample, if one exists, is below the sum of the two largest coins. For arbitrary coins, use the DP.

## Coin Change II (LC 518): number of ways

dp[0] = 1; for each coin (outer loop), for a from coin to amount: dp[a] += dp[a − coin]. With coins outside, every combination is generated in coin order, so it is counted once. With amounts outside (Combination Sum IV, LC 377) the same code counts ordered sequences instead.

Dry run, coins {1, 2, 5}, amount 5: after coin 1, dp = 1,1,1,1,1,1; after coin 2, dp = 1,1,2,2,3,3; after coin 5, dp[5] = 3 + 1 = 4. The four ways: 5, 2+2+1, 2+1+1+1, 1×5.

## Other unbounded problems

- **Perfect Squares** (LC 279): the coins are 1, 4, 9, …; O(n√n). Number theory gives a shortcut: Lagrange says every n is a sum of at most four squares, and Legendre says n needs four exactly when n = 4^a(8b + 7). So check "is it a square" (1), "is it a sum of two squares" (2), the 4^a(8b + 7) form (4), else 3: O(√n).
- **Rod Cutting** (CLRS 15.1): a price for each length, unlimited pieces; maximise revenue: dp[L] = max over cut lengths of price[k] + dp[L − k].
- **Integer Break** (LC 343): maximise the product of positive parts summing to n. DP works; the maths says use as many 3s as possible (with a 4 = 2 + 2 instead of 3 + 1).
- **Minimum Cost For Tickets** looks similar but is linear DP over days, because passes cover consecutive days.
- **Word Break** is an unbounded knapsack over positions where the words are items that must match the text.
- **Coin change with a count limit on the total coins**: add a dimension for the number of coins.

## Bounded knapsack (each item c times)

Middle ground between 0/1 and unbounded. Binary splitting turns item i with count c into items of 1, 2, 4, …, 2^k and the remainder copies; any count from 0 to c is a sum of a subset of these, so 0/1 on the pieces is exact. O(W·Σ log cᵢ). A monotone deque per residue class (w mod wt) gives O(n·W). See knapsack variants.

## Interview angles

- Explain the loop direction (upwards = reuse) and contrast it with 0/1.
- For Coin Change, explain why greedy fails with a concrete counterexample, and initialise unreachable amounts to amount + 1 or ∞.
- Expect the counting follow-up and the "order matters" twist.

## Connections

The unbounded knapsack is also a shortest path on the DAG of amounts (each item an edge). Linear DP problems with a fixed set of step sizes, such as Climbing Stairs, are unbounded counting knapsacks where order matters.
`,
    doubts: [
      ["Why is the minimum-coins answer ∞ rather than 0 for unreachable amounts?", "A min over transitions must ignore unreachable states. Initialising with ∞ (and checking at the end) makes unreachable amounts lose every comparison."],
      ["When does greedy coin change work?", "For canonical coin systems, where greedy is always optimal (like 1, 2, 5, 10, 20, 50…). Deciding whether a system is canonical is itself a known problem; arbitrary sets need DP."],
      ["For minimum coins, does the loop order (coins outside or amounts outside) matter?", "No. With min (or max) the result is the same either way, because every multiset of coins is considered at least once and duplicates do not change a minimum. Loop order only matters when counting, where duplicates change the sum."],
      ["Why does Integer Break prefer 3s?", "For a part x ≥ 5, splitting it into 3 and x − 3 gives 3(x − 3) > x, so no part above 4 is ever optimal; 4 equals 2 × 2; and among 2s and 3s, 3·3 > 2·2·2 for the same total of 6, so use as many 3s as possible, replacing 3 + 1 with 2 + 2."],
      ["How do I list the coins of an optimal Coin Change solution?", "Store choice[a] = the coin that gave the best dp[a]. Starting from the amount, repeatedly output choice[a] and subtract it until you reach 0."],
    ],
    revise: md`
? Unbounded loop direction? :: Capacity upwards.
? Coin Change minimum? :: dp[a] = min dp[a − c] + 1; ∞ means unreachable.
? Coin Change II ways? :: dp[0] = 1; coins outer, amounts inner.
? Perfect Squares bound? :: Answer ≤ 4 (Lagrange).
? Integer Break math? :: Use as many 3s as possible (with 2s for remainders).
? Bounded counts? :: Binary splitting into 0/1 items.
? Coin Change dry run {1,3,4}, 6? :: dp = 0,1,2,1,1,2,2: answer 2 (3+3); greedy gives 3 coins.
? Perfect Squares closed form? :: 1 if square; 4 if n = 4^a(8b+7); 2 if a sum of two squares; else 3.
? Coin Change as a graph? :: Amounts are nodes, coins are weight-1 edges: BFS from 0.
? Why amount+1 as infinity? :: The answer never exceeds amount coins, and adding 1 cannot overflow.
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
## The question

Given non-negative integers and a target T, is there a subset summing to exactly T? It is the 0/1 knapsack with value = weight and only feasibility asked, and it is NP-complete in general. The DP is pseudo-polynomial: fast when T is small.

## Boolean knapsack

reach[s] = can some subset of the items seen so far sum to s. reach[0] = true (the empty subset). For each x, for s from T **down** to x: reach[s] |= reach[s − x]. O(n · T) time, O(T) space. Downwards for the same reason as the 0/1 knapsack: each item once.

Dry run, items [3, 34, 4, 12, 5, 2], T = 9: after 3 → {0, 3}; after 34 → unchanged (too big); after 4 → {0, 3, 4, 7}; after 12 → unchanged; after 5 → {0, 3, 4, 5, 7, 8, 9, 12 (capped)}; reach[9] is true (4 + 5).

## The bitset trick

Treat reach as one long bit string. Adding item x shifts every reachable sum up by x: reach |= reach << x. With C++ std::bitset or Java's BitSet, or Python's big integers, each shift processes 64 bits per machine word, so the cost is O(n · T / 64).

\`\`\`python
def can_sum(nums, target):
    bits = 1                       # bit s set = sum s reachable
    mask = (1 << (target + 1)) - 1
    for x in nums:
        bits |= (bits << x) & mask
    return (bits >> target) & 1 == 1
\`\`\`

In Python this is often 50–100× faster than the list version because the loop over s runs in C.

## Reductions you must recognise

- **Partition Equal Subset Sum** (LC 416): split into two equal halves ⟺ some subset sums to total/2. If total is odd, false immediately. Early exit when reach[total/2] becomes true.
- **Target Sum** (LC 494): assign + or − to each number. Let P be the plus set and N the minus set: P − N = target and P + N = total, so P = (total + target)/2. Count the subsets summing to P (the counting version: dp[s] += dp[s − x], downwards). Reject when (total + target) is odd or |target| > total.
- **Last Stone Weight II** (LC 1049): the final stone is |sum(A) − sum(B)| for some split. Find the largest reachable S ≤ total/2; the answer is total − 2S.
- **Partition to K Equal Sum Subsets** (LC 698) is not subset sum: every element must be used and there are k groups, so it needs backtracking or bitmask DP.
- **Split Array With Same Average** (LC 805): a subset of size k must sum to k·total/n. DP over (count, sum) pairs, or meet in the middle; check feasible k values first (k·total divisible by n).
- **Closest Subsequence Sum** (LC 1755) and **Partition Array Into Two Arrays to Minimise Sum Difference** (LC 2035): values up to 10⁷ make a sum-indexed DP impossible, but n ≤ 40 (or 15 per half) allows meet in the middle: enumerate all half-sums, sort one side, and binary search or two-pointer the complement. For LC 2035 group the half-sums by how many elements they use, because both halves must have exactly n elements.

## Counting and zeros

The counting version replaces OR with addition: dp[0] = 1, dp[s] += dp[s − x] for s from T down to x. Zeros: each zero can be in or out, so it doubles every count; the loop handles this automatically only if it runs down to s = x = 0 inclusive. An easy safe route is to count zeros separately and multiply the final answer by 2^zeros.

## Negative numbers

Shift every sum by an offset (the sum of the absolute values of the negatives), or keep a dictionary/set of reachable sums instead of an array. With a set, process items one by one: new = old ∪ {s + x for s in old}.

## Reconstruction

Keep a 2D boolean table (or per-sum "which item first reached it" plus the previous sum) and walk back from T, subtracting the items used.

## Complexity guard

- T up to about 10⁶ and n up to a few hundred: the DP (bitset if needed).
- Values huge but n ≤ 40: meet in the middle, O(2^(n/2) · n).
- Values huge and n large: genuinely hard; ask about constraints or accept an approximation.

## Interview angles

- Spot the reduction (Target Sum's algebra is the classic test).
- Mention the early exits: odd totals, a target above the total, an item larger than the target (skip it).
- Offer the bitset version as the constant-factor optimisation.

## Connections

Subset sum is the decision core of knapsack; Partition Equal Subset Sum is its most common interview form. Meet in the middle and bitsets are the two standard ways to push beyond the plain table.
`,
    doubts: [
      ["How does Target Sum become subset sum?", "Numbers with '+' form P, with '−' form N. P − N = target and P + N = total give P = (total + target)/2. So the question is how many subsets sum to that value."],
      ["Why is the bitset version faster?", "One shift-and-OR processes 64 sums per machine word, so the inner loop runs target/64 times instead of target."],
      ["Why does Target Sum need (total + target) to be even and non-negative?", "P = (total + target)/2 must be an integer sum of non-negative numbers. If total + target is odd, no split exists; if target < −total or target > total, P is negative or exceeds total, so the answer is 0."],
      ["When should I prefer meet in the middle over the DP?", "When the target or the values are too large for a sum-indexed table (above about 10⁷) but n is small (up to about 40). Meet in the middle costs O(2^(n/2) · n) regardless of the values."],
      ["Is there an O(n · T) algorithm that also tells me how many elements were used?", "Add the count as a dimension (dp[k][s]) for O(n² · T), or use a bitset per count. If only the minimum number of elements matters, store dp[s] = minimum count to reach s (a min-knapsack) in O(n · T)."],
    ],
    revise: md`
? Subset sum boolean DP? :: reach[s] |= reach[s − x], s downward.
? Bitset form? :: reach |= reach << x.
? Equal partition? :: total even and reach[total/2].
? Target Sum reduction? :: Count subsets with sum (total + target)/2 (check parity, bounds).
? Minimum subset difference? :: Largest reachable S ≤ total/2; answer total − 2S.
? Huge values, n ≤ 40? :: Meet in the middle.
? Partition to K Equal Sum Subsets: subset sum? :: No: all elements, k groups → backtracking or bitmask DP.
? Zeros in counting subset sum? :: Each doubles the count; count them separately and multiply by 2^zeros.
? Negative numbers in subset sum? :: Offset the index or keep a set of reachable sums.
? Python bitset subset sum? :: bits |= (bits << x) & mask; test (bits >> T) & 1.
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
## The family

The 0/1 and unbounded knapsacks are two ends of a range. Real problems add limits on copies, groups of mutually exclusive options, dependencies, extra budgets, or exact capacities. Each is one change to the same table.

## Bounded knapsack (each item at most c copies)

- **Naive**: expand item i into c_i separate items: O(W · Σc). Fine when counts are small.
- **Binary splitting**: replace c copies by bundles of 1, 2, 4, …, 2^(k − 1) and a remainder r = c − (2^k − 1). Any count from 0 to c is a sum of a subset of these bundles (binary representation for the power part, plus the remainder for the rest), and no subset exceeds c. Run 0/1 knapsack over the bundles: O(W · Σ log c).
- **Monotone queue**: for item (w, v, c) and each residue r = 0..w − 1, the capacities r, r + w, r + 2w, … form a line. Writing capacity = r + j·w, dp_new[j] = max over j − c ≤ t ≤ j of dp_old[t] + (j − t)·v = j·v + max(dp_old[t] − t·v). The inner max over a sliding window of width c + 1 is a monotone deque. O(W) per item, O(n·W) total: the optimal method.

## Group knapsack (at most one item per group)

for each group: for w from W down to 0: for each item in the group: dp[w] = max(dp[w], dp[w − wt] + val).

The item loop sits **inside** the capacity loop: every item in the group reads the same old dp[w − wt] (from before this group), so at most one item per group can be added. Putting the item loop outside would allow several items from one group.

- **Maximum Value of K Coins From Piles** (LC 2218): each pile is a group whose options are its prefixes (take the top 1, 2, … coins). O(k · total coins).
- **Number of Dice Rolls With Target Sum** (LC 1155): each die is a group of faces, counting version.
- Choosing one option per day or per course under a total budget.

## Multiple budgets

Each extra constraint adds a dimension: dp[w][v] for weight and volume, both iterated downwards (Ones and Zeroes, LC 474). Cost multiplies, so keep dimensions few. An "at least" constraint (profit ≥ P) is clamped: store min(profit, P) so the dimension stays size P + 1 (Profitable Schemes, LC 879).

## Value-indexed DP

When W is huge (10⁹) but the total value V is small (10⁵): minWeight[v] = the minimum weight achieving value exactly v. Initialise minWeight[0] = 0 and the rest ∞; for each item, for v downwards: minWeight[v] = min(minWeight[v], minWeight[v − val] + wt). The answer is the largest v with minWeight[v] ≤ W. O(n · V).

## Dependent items (tree knapsack)

Items form a tree and a child can only be taken if its parent is (course prerequisites, folder selection). Tree DP: dp[v][j] = the best value choosing j units in v's subtree with v taken. Merge children one at a time like a group knapsack (each child contributes some amount 0..size). Bounding every merge by the current subtree sizes makes the total O(n²) for item counts (or O(n · W) with care): the classic "small-to-large merging" amortisation.

## Exactness and initialisation

| Question | Initialise | Read the answer |
|---|---|---|
| capacity at most W, maximise | dp[·] = 0 | dp[W] |
| capacity exactly W, maximise | dp[0] = 0, rest −∞ | dp[W] (−∞ means impossible) |
| capacity exactly W, minimise | dp[0] = 0, rest +∞ | dp[W] |
| count subsets of weight exactly W | dp[0] = 1, rest 0 | dp[W] |

## Products and other combiners

**Reliability design** (in Abdul Bari's lectures): choose how many copies of each stage to buy under a cost budget to maximise the product of stage reliabilities. Products turn into sums with logarithms, or use the DP directly with multiplication since everything is positive. Any associative, monotone combiner works in a knapsack.

## Interview angles

- Name the variant, then the one change: loop direction (0/1 vs unbounded), loop nesting (group), an extra dimension (multiple budgets), swapped roles (value-indexed), or clamping (at-least constraints).
- Binary splitting is the expected answer for bounded counts; mention the monotone queue as the optimal one.

## Connections

All knapsacks are DP on a DAG of (item index, capacity). Tree knapsack is tree DP; the monotone-queue version is deque-optimised DP.
`,
    doubts: [
      ["Why does binary splitting represent every count?", "Pieces 1, 2, 4, …, 2^(k−1) and a remainder r represent every number from 0 to 2^k − 1 + r = c as a subset sum, just like binary representation."],
      ["When should I use value-indexed DP?", "When W is too large for an array (10⁹) but the sum of values is small (≤ 10⁵). Swap what you index by and what you optimise."],
      ["Why does binary splitting never let me exceed c copies?", "The bundles are 1, 2, …, 2^(k − 1) and r = c − (2^k − 1), and they sum to exactly c. Any subset of them sums to at most c, and every number from 0 to c is reachable: numbers below 2^k come from the binary bundles alone, and larger ones use r plus a binary part."],
      ["In group knapsack, what if I must take exactly one item per group?", "Initialise unreachable states to −∞ and, for each group, build the new row only from transitions that take an item (no \"skip\" option). States that skipped a group stay −∞."],
      ["Why does tree knapsack merging cost O(n²) and not O(n³)?", "When merging a child of size b into a partial subtree of size a, the work is O(a · b). Summed over the whole tree, each pair of nodes is \"multiplied\" only at their lowest common ancestor, so the total is O(n²)."],
    ],
    revise: md`
? Bounded knapsack efficient trick? :: Binary splitting into 1, 2, 4, …, remainder.
? Optimal bounded? :: Monotone queue per residue class: O(nW).
? Group knapsack? :: Per group, per w downward, try each item in the group.
? Huge W, small values? :: minWeight[value] DP.
? Exactly W initialisation? :: dp[0] = 0, others −∞.
? Group knapsack loop nesting? :: Groups outer, capacity downward, items innermost (all read the pre-group values).
? Monotone queue bounded knapsack? :: Per residue mod w: dp_new[j] = j·v + max over window (dp_old[t] − t·v).
? Initialise "exactly W, minimise"? :: dp[0]=0, everything else +∞.
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

Interval DP solves problems where the input is a sequence and the answer for a range [l, r] depends on how that range is split or reduced. The state is the interval:

dp[l][r] = best answer for the elements a[l..r]

and the transition chooses a split point (or a "last action") k inside it:

dp[l][r] = best over k of dp[l][k] ⊕ dp[k + 1][r] ⊕ cost(l, k, r)   (or dp[l][k] and dp[k][r] with shared endpoints)

Both halves are shorter than [l, r], so fill by **increasing interval length**: for len = 1..n, for l = 0..n − len, r = l + len − 1. O(n²) states × O(n) choices = O(n³), which fits n up to about 500.

[[widget:interval-dp]]

## Think "last" instead of "first"

**Burst Balloons** (LC 312) is the canonical example. Bursting balloon i earns a[left]·a[i]·a[right] with its current neighbours. If you choose the **first** balloon to burst, its removal changes the neighbours of the remaining balloons, and the two sides stop being independent. Choose instead the balloon k that is burst **last** within the open interval (l, r): at that moment everything between l and r except k is gone, so its neighbours are exactly a[l] and a[r]. And the balloons in (l, k) never see anything beyond l or k, so (l, k) and (k, r) are independent subproblems.

Pad the array with 1 at both ends. Then

dp[l][r] = max over l < k < r of dp[l][k] + dp[k][r] + a[l]·a[k]·a[r]

with dp[l][l + 1] = 0, answer dp[0][n + 1].

\`\`\`python
def max_coins(nums):
    a = [1] + nums + [1]
    n = len(a)
    dp = [[0] * n for _ in range(n)]
    for length in range(2, n):
        for l in range(0, n - length):
            r = l + length
            dp[l][r] = max(dp[l][k] + dp[k][r] + a[l] * a[k] * a[r] for k in range(l + 1, r))
    return dp[0][n - 1]
\`\`\`

The general lesson: when an action's cost depends on its neighbours at the time, pick the action whose context is fixed. That is usually the last one.

## Classics

- **Matrix Chain Multiplication**: matrices A_i of size p[i − 1] × p[i]. dp[i][j] = min over i ≤ k < j of dp[i][k] + dp[k + 1][j] + p[i − 1]·p[k]·p[j]. The last multiplication combines the product of A_i..A_k with the product of A_(k+1)..A_j.
- **Minimum Cost to Cut a Stick** (LC 1547): sort the cuts and add 0 and n as boundaries; cutting a segment costs its length. dp[i][j] over boundary indices = (pos[j] − pos[i]) + min over the cuts between them of dp[i][k] + dp[k][j]. The first cut in a segment is like the last balloon in reverse: it splits the segment into independent halves.
- **Minimum Score Triangulation of Polygon** (LC 1039): the edge (i, j) belongs to one triangle (i, k, j); dp[i][j] = min over k of dp[i][k] + dp[k][j] + v[i]·v[k]·v[j].
- **Optimal Binary Search Tree** (CLRS 15.5, Abdul Bari): choose the root k of the keys i..j; the cost adds the subtrees plus the total frequency of i..j (every key goes one level deeper).
- **Guess Number Higher or Lower II** (LC 375): dp[l][r] = min over guesses k of k + max(dp[l][k − 1], dp[k + 1][r]): a minimax interval DP.
- **Strange Printer** (LC 664): dp[l][r] = dp[l][r − 1] + 1, improved to dp[l][k] + dp[k + 1][r − 1] when s[k] == s[r] (print s[r] together with s[k]).
- **Remove Boxes** (LC 546): the interval alone is not enough; add a third index for how many boxes equal to a[r] are attached after r: dp[l][r][extra]. O(n⁴) worst, fine for n ≤ 100.
- **Minimum Cost to Merge Stones** (LC 1000): merge exactly K adjacent piles at a time. Possible only if (n − 1) mod (K − 1) == 0. dp[l][r] = min over split points stepping by K − 1, plus sum(l..r) when (r − l) mod (K − 1) == 0 (the interval collapses into one pile).
- **Palindromic subsequence** and **Stone Game** variants (take from either end) are interval DPs over shrinking ends rather than splits.

## Recognising interval DP

- The input is a sequence and operations merge or remove **adjacent** elements.
- The cost of an operation depends on its current neighbours or on the merged range.
- Greedy picks (cheapest merge first) fail on small examples.
- n is at most a few hundred.

## Filling order and memoisation

Bottom-up by length is the safest. Top-down memoisation on (l, r) also works and is often easier to write; recursion depth is only O(n). Do not fill by l ascending alone: dp[l][r] needs dp[k][r] with k > l, which would not be ready.

## Knuth's optimisation

If opt[l][r − 1] ≤ opt[l][r] ≤ opt[l + 1][r] (it holds when the cost satisfies the quadrangle inequality and is monotone, as in optimal BSTs and classic stone merging with sums), restrict k to that range. The total work telescopes to O(n²). Name it; implementing it is rare in interviews.

## Interview angles

- Define dp[l][r] precisely, including whether l and r are inclusive or are boundaries (Burst Balloons uses open boundaries).
- Explain why the last action makes subproblems independent.
- State O(n³) and the n limit it implies.

## Connections

Palindrome DP and game DP on sequences are interval DPs. Interval DP is to partition DP what "split anywhere" is to "cut off the last piece".
`,
    doubts: [
      ["Why fill by increasing length?", "dp[l][r] depends on strictly shorter intervals inside [l, r]. Increasing length guarantees they are computed. Iterating l downward and r upward also works."],
      ["Why is choosing the first balloon wrong?", "After bursting k first, k's neighbours become adjacent, so the left and right parts interact. Choosing k as the last balloon keeps [l, k] and [k, r] independent, because l and r are still present when k bursts."],
      ["How large can n be for O(n³)?", "About 500 (1.25·10⁸ simple operations). For larger n you need an optimisation (Knuth, divide and conquer) or a different model."],
      ["Should I use inclusive indices or boundaries for dp[l][r]?", "Choose whichever makes the cost formula clean. Burst Balloons and Cut a Stick use boundaries (l and r are not part of the work, they provide context), so the base case is dp[l][l + 1] = 0. Matrix chain and palindromes use inclusive ranges with dp[i][i] as the base. Mixing the two conventions causes most off-by-one bugs."],
      ["Can interval DP be done in O(n²) memory but less time?", "Time is usually the bottleneck (O(n³)). Knuth's optimisation reduces time to O(n²) when its monotonicity condition holds; otherwise O(n³) is expected. Memory stays O(n²) in all cases."],
      ["Why can't I greedily merge the cheapest adjacent pair in Merge Stones?", "A cheap merge now can create a large pile that is merged expensively several more times later. The total cost depends on how often each element is included in merges, which is a global property of the merge tree, exactly what the interval DP optimises."],
    ],
    revise: md`
? Interval DP state and order? :: dp[l][r]; fill by increasing length.
? Complexity? :: O(n³) typically.
? Burst Balloons key idea? :: Choose the last balloon k in (l, r); neighbours are l and r.
? Burst Balloons recurrence? :: dp[l][r] = max dp[l][k] + dp[k][r] + a[l]a[k]a[r].
? Matrix chain cost term? :: p[i−1]·p[k]·p[j].
? Cut a stick preparation? :: Sort cuts and add both ends.
? Knuth optimisation? :: Monotone split points: O(n²).
? Strange Printer improvement? :: When s[k]==s[r], print them together: dp[l][k] + dp[k+1][r−1].
? Merge Stones feasibility? :: (n − 1) mod (K − 1) must be 0.
? Remove Boxes extra state? :: How many boxes equal to a[r] are attached after r.
? Optimal BST cost? :: Subtrees' costs plus the total frequency of keys i..j.
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

When n is small (n ≤ 20 or so), a set of chosen items fits in an integer: bit i is 1 if item i is used. dp[mask] (or dp[mask][extra]) stores the best answer for that subset. There are 2ⁿ masks: about 10⁶ for n = 20, 3·10⁷ for n = 25. "n ≤ 20" in the constraints is the strongest hint.

Bit operations:

| Operation | Code |
|---|---|
| is i in mask? | (mask >> i) & 1 |
| add i | mask \| (1 << i) |
| remove i | mask & ~(1 << i) |
| number of elements | popcount(mask) |
| lowest element | mask & −mask |
| full set | (1 << n) − 1 |

Masks are processed in increasing numeric order: adding an element always makes the number larger, so all smaller subsets of a mask come before it.

## Assignment: dp[mask]

Match n workers to n jobs, each job once, minimising total cost. Process workers in order: the next worker to assign is popcount(mask) (the number of jobs already taken). dp[mask | 1 << j] = min(dp[mask | 1 << j], dp[mask] + cost[popcount(mask)][j]) for each free job j. O(2ⁿ · n).

\`\`\`python
def assign(cost):
    n = len(cost)
    INF = float("inf")
    dp = [INF] * (1 << n)
    dp[0] = 0
    for mask in range(1 << n):
        if dp[mask] == INF: continue
        w = bin(mask).count("1")
        if w == n: continue
        for j in range(n):
            if not mask >> j & 1:
                nm = mask | 1 << j
                dp[nm] = min(dp[nm], dp[mask] + cost[w][j])
    return dp[-1]
\`\`\`

Problems: Campus Bikes II (LC 1066), Minimum XOR Sum of Two Arrays (LC 1879), Maximum Compatibility Score Sum (LC 1947), Maximum AND Sum of Array (LC 2172: slots with capacity 2 → base-3 mask or doubled slots). The general assignment problem has a polynomial algorithm (Hungarian, O(n³)), so mention it when n is large.

## Travelling salesman: dp[mask][last]

dp[mask][v] = the shortest path that starts at 0, visits exactly the vertices in mask, and ends at v. Transition: for u not in mask, dp[mask | 1 << u][u] = min(…, dp[mask][v] + w(v, u)). Answer: min over v of dp[full][v] + w(v, 0). O(2ⁿ · n²) (Held–Karp, 1962) instead of n! brute force: for n = 16, about 1.7·10⁷ versus 2·10¹³.

- **Find the Shortest Superstring** (LC 943): vertices are words, w(v, u) = the characters added by appending u after v (length minus overlap). Keep parents to rebuild the string.
- **Shortest Path Visiting All Nodes** (LC 847): edges are unweighted, so BFS over (node, mask) states from all start nodes at once.
- **Minimum cost to visit every city with tolls/times**: Held–Karp with extra state.

## Choose which dimension is the mask

**Number of Ways to Wear Different Hats** (LC 1434): 10 people and 40 hats. A mask over hats (2⁴⁰) is impossible, but a mask over people (2¹⁰) is easy: iterate hats one by one, and for each hat either give it to nobody or to one person not yet served. Always put the small dimension in the mask.

## Submask enumeration

To split a set into groups, iterate the submasks of a mask:

for (sub = mask; sub > 0; sub = (sub − 1) & mask)

Subtracting 1 clears the lowest set bit and sets all bits below it; ANDing with mask keeps only bits inside mask. This visits every non-empty submask in decreasing order.

Over all masks the total is **3ⁿ**: each element is either outside mask, in mask but not in sub, or in sub. n = 15 → 1.4·10⁷, n = 18 → 3.9·10⁸ (too slow in Python).

- **Minimum Incompatibility** (LC 1681): precompute the cost of every valid group (exactly n/k distinct elements), then dp[mask] = min over valid groups sub ⊆ mask containing the lowest unassigned element of dp[mask ^ sub] + cost[sub].
- **Minimum Number of Work Sessions** (LC 1986), **Fair Distribution of Cookies** (LC 2305), **Parallel Courses II** (LC 1494: choose up to k available courses each semester).

Fixing the lowest unused element in each group avoids counting the same partition in different group orders.

## Bitmask DP over a grid row: profile DP

When rows are short (width ≤ 10), a mask can describe a whole row: which seats are occupied, which cells stick out into the next row. **Maximum Students Taking Exam** (LC 1349): dp[row][mask] over valid masks (no two adjacent bits, only on good seats), compatible with the previous row's mask when no student sees a neighbour diagonally. Domino tiling counts use a "broken profile" mask of the cells already covered.

## Precomputing per-mask values

Many problems need sum[mask], valid[mask] or cost[mask]. Build them in O(2ⁿ) from smaller masks: sum[mask] = sum[mask & (mask − 1)] + a[lowest bit index]. Sum over subsets (SOS DP) computes Σ over all submasks for every mask in O(n·2ⁿ) instead of 3ⁿ.

## Interview angles

- Say "n ≤ 20 suggests 2ⁿ states" out loud.
- Define the mask and any extra index (last vertex, current row), then the transition.
- Python is slow for 2ⁿ·n² with n = 20; mention bit tricks and pruning unreachable masks.

## Connections

Bitmask DP is DP over the subset lattice. BFS over (node, mask) is the same idea for unweighted graphs; meet in the middle is the alternative when n reaches 40.
`,
    doubts: [
      ["Why is n ≤ 20 the hint?", "2²⁰ ≈ 10⁶ masks; with n or n² work per mask that is 2·10⁷ to 4·10⁸. At n = 25, 3·10⁷ masks start to hurt; beyond that, meet in the middle or a different idea is needed."],
      ["Why is submask enumeration over all masks 3ⁿ and not 4ⁿ?", "Each element independently is outside mask, in mask but not in sub, or in both: three choices, so Σ over masks of 2^|mask| = 3ⁿ."],
      ["Which dimension should be the mask?", "The smaller one. In the hats problem, 40 hats but 10 people: iterate hats as the DP index and keep a mask of people (2¹⁰), not the other way round."],
      ["How do I reconstruct the optimal order in Held–Karp?", "Store parent[mask][v] = the previous vertex that achieved dp[mask][v]. From the best end vertex of the full mask, follow parent while removing each vertex from the mask, then reverse the sequence."],
      ["Is dp[mask] enough for TSP, without the last vertex?", "No. The cost of extending a path depends on where it currently ends, so two paths over the same set ending at different vertices have different futures. That is exactly the \"missing information\" test for a state: add the last vertex."],
      ["What if each slot can take two items (Maximum AND Sum)?", "Either double the slots (each slot appears twice in the mask, n·2 bits) or use a base-3 mask where each digit counts 0, 1 or 2 items in the slot. Doubling is simpler; base 3 is smaller."],
    ],
    revise: md`
? When bitmask DP? :: n ≤ ~20 and the set of used items matters.
? Assignment DP? :: dp[mask]; next worker = popcount(mask); O(2ⁿ n).
? TSP DP? :: dp[mask][last]; O(2ⁿ n²) (Held–Karp).
? Iterate submasks? :: sub = (sub − 1) & mask.
? All submasks of all masks cost? :: 3ⁿ.
? Visit all nodes, unweighted? :: BFS over (node, mask).
? Which dimension in the mask? :: The smaller one.
? Why process masks in increasing order? :: Adding an element increases the number, so subsets come first.
? Avoid counting the same partition twice? :: Each group must contain the lowest unassigned element.
? sum[mask] in O(2ⁿ)? :: sum[mask] = sum[mask & (mask−1)] + a[index of the lowest bit].
? Maximum Students Taking Exam? :: dp[row][mask] over valid seat masks compatible with the previous row.
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
## Why trees make DP easy

A rooted tree has no cycles and every subtree is independent of its siblings, so "the best answer inside v's subtree" is a perfect DP state: compute the children first (post-order), then combine. No memo table is needed; each node is visited once and returns its values. O(n) for most problems.

The design question is always: **what must v tell its parent?** That is the return value. If the parent's decision depends on whether v was chosen, return one value per case.

## Include / exclude

**House Robber III** (LC 337): no two directly linked nodes can both be robbed.

- take(v) = v.val + Σ skip(child)
- skip(v) = Σ max(take(child), skip(child))

Return the pair from each subtree; the answer is max(take(root), skip(root)).

\`\`\`python
def rob(root):
    def go(v):
        if not v: return (0, 0)          # (take, skip)
        lt, ls = go(v.left); rt, rs = go(v.right)
        return (v.val + ls + rs, max(lt, ls) + max(rt, rs))
    return max(go(root))
\`\`\`

This is the **maximum-weight independent set** on a tree: NP-hard on general graphs, linear on trees. The same pattern gives **minimum vertex cover** (if v is not in the cover, every child must be) and **minimum dominating set**.

**Binary Tree Cameras** (LC 968): each node reports one of three states: 0 = not covered, 1 = covered without a camera, 2 = has a camera. Greedy post-order: if any child is 0, put a camera here (return 2); else if any child is 2, return 1; else return 0. Count a camera at the root if it returns 0. Placing cameras as high as possible (at parents of leaves) is the exchange argument behind it.

## Subtree aggregates

One post-order pass computes size, sum, height, min, max, or counts per subtree.

- **Maximum Product of Splitted Binary Tree** (LC 1339): compute the total, then for every subtree sum s the product is s·(total − s); take the max (the mod only at the end).
- **Count Nodes With the Highest Score** (LC 2049): removing v leaves its child subtrees and the rest n − size(v); the score is their product.
- **Distribute Coins in Binary Tree** (LC 979): excess(v) = coins − 1 + Σ excess(children); every unit of |excess(child)| crosses the edge to the child, so moves = Σ |excess|.
- **Longest Path With Different Adjacent Characters** (LC 2246): each node returns its longest downward chain; the answer combines the two best children with different characters.

## Diameter and longest paths

The longest path in a tree passes through some highest node v, where it joins the two deepest downward chains from v's children. So return depth(v) = 1 + max child depth, and update a global best with the top two child depths. **Binary Tree Maximum Path Sum** (LC 124) is the same with weights and max(0, ·) to drop negative chains.

Alternative for unweighted (or non-negative weighted) trees: BFS from any node to the farthest node a, then BFS from a; the farthest distance from a is the diameter.

## Rerooting: answers for every root in O(n)

Some questions ask for a value for every node as if it were the root. Recomputing from each root costs O(n²). Rerooting does two passes:

1. Root at 0. Post-order computes down[v], the answer inside v's subtree (and helpers such as size[v]).
2. Pre-order pushes information from the parent: when moving the root from p to a child c, adjust p's full answer by removing c's contribution and adding the "outside" part.

**Sum of Distances in Tree** (LC 834): ans[0] = Σ depth. Moving the root from p to c, the size[c] nodes in c's subtree get one step closer and the other n − size[c] get one step farther: ans[c] = ans[p] − size[c] + (n − size[c]). Two O(n) passes.

When the combine is not invertible (a max instead of a sum), keep the **best and second-best** child contributions at each node so a child can ask "what is my parent's best excluding me?". Prefix and suffix maxima over the children do the same for many children.

Others: Minimum Height Trees (LC 310, also by peeling leaves), Count Number of Possible Root Nodes (LC 2581), the farthest node from every node.

## Knapsack on trees

Choose exactly k nodes (or a weight budget) where a node requires its parent: dp[v][j] = the best with j units chosen in v's subtree, v included. Merge children like a group knapsack, bounding loops by the current subtree sizes. Each pair of nodes is combined only at their LCA, so the total is O(n²) (or O(n·k)).

## Implementation on general trees

Inputs are often edge lists. Build adjacency lists, root at 0, and pass the parent to avoid walking back. For n up to 10⁵ in Python or Java, recursion depth can overflow on a path-shaped tree: compute a BFS order and process it in reverse for the post-order pass, and forward for the pre-order pass.

\`\`\`python
order, parent = [0], [-1] * n
for v in order:                      # BFS order
    for u in adj[v]:
        if u != parent[v]:
            parent[u] = v; order.append(u)
for v in reversed(order):            # post-order: children before parents
    ...
\`\`\`

## Interview angles

- Say what each call returns before coding. For include/exclude, return a pair, not a memo on (node, flag).
- Rerooting is the standard follow-up to "compute X for the root": ask yourself whether "for every node" is coming.
- Mention the iterative order for deep trees.

## Connections

Tree DP is DP on a DAG where edges go from children to parents. LCA, diameter and path queries build on the same post-order mindset; centroid decomposition handles path-counting problems the plain DP cannot.
`,
    doubts: [
      ["Why does rerooting give O(n)?", "Each move from a parent to a child changes the answer by a formula computed from precomputed subtree data in O(1) (or O(degree)), so all n answers come from two linear passes instead of n separate traversals."],
      ["Why return two values instead of memoising on (node, flag)?", "It is the same DP; returning a pair is just bottom-up memoisation. It avoids a hash map keyed by nodes and is easier to explain."],
      ["When does a tree DP need more than two states per node?", "When the parent's options depend on more than \"chosen or not\". Cameras need three (uncovered, covered, camera); colouring with k colours needs k; distance constraints (\"no two chosen nodes within distance 2\") need the distance to the nearest chosen node in the subtree."],
      ["How do I handle a forest or an unrooted tree?", "Root each component anywhere (any node gives the same answer for undirected properties) and run the DP per component. Unrooted questions like the diameter or \"best root\" use the double BFS or rerooting."],
      ["Why does Maximum Product of Splitted Binary Tree take the modulus only at the end?", "The maximum must be compared on the true products; taking the modulus first would scramble the order. Python integers are exact. In Java, with up to 5·10⁴ nodes of value ≤ 10⁴ the sums stay below 5·10⁸ and the products below about 2.5·10¹⁷, so compare them as long and reduce at the end."],
    ],
    revise: md`
? House Robber III return? :: (take, notTake) per node.
? take / notTake formulas? :: take = val + Σ notTake(c); notTake = Σ max(take(c), notTake(c)).
? Rerooting passes? :: Post-order down values, pre-order up values.
? Sum of distances move? :: ans[c] = ans[p] − size[c] + (n − size[c]).
? Diameter? :: Max of the two longest child depths at a node; or double BFS.
? Tree knapsack complexity trick? :: Bound merge loops by subtree sizes: O(nk).
? Binary Tree Cameras states? :: 0 not covered, 1 covered, 2 camera; any child 0 → camera; any child 2 → covered; root 0 → +1.
? Distribute Coins moves? :: Σ over edges of |excess|, excess = coins − 1 + children's excess.
? Rerooting with a max (not invertible)? :: Keep best and second-best child values (or prefix/suffix maxima).
? Deep tree without recursion? :: BFS order; process reversed for post-order, forward for pre-order.
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
## What "game DP" solves

Two players alternate moves in a game with perfect information (both see everything) and no chance. Both play optimally. The question is who wins, or by how much. Because the state space is finite and moves make progress (stones run out, indices shrink), the game graph is a DAG, and the outcome of each position can be computed from the outcomes of positions after one move: DP.

## Minimax with score difference

The direct formulation tracks both players' scores, which doubles the state. The standard trick: define

dp[state] = (score of the player to move) − (score of the other player), from this state on, under optimal play.

Then a move that earns gain leads to a state where the opponent is to move, and the opponent's difference is dp[next] from their perspective:

dp[state] = max over moves of (gain(move) − dp[next])

The minus sign switches perspective. One function, one value per state, and both players are covered.

**Predict the Winner** (LC 486) and **Stone Game** (LC 877): players take a number from either end.

dp[l][r] = max(a[l] − dp[l + 1][r], a[r] − dp[l][r − 1]), dp[i][i] = a[i].

The first player wins (or ties) iff dp[0][n − 1] ≥ 0. O(n²).

\`\`\`python
def predict_the_winner(a):
    n = len(a)
    dp = a[:]                       # dp[l] for intervals of the current length ending at l + len − 1
    for length in range(2, n + 1):
        for l in range(n - length + 1):
            r = l + length - 1
            dp[l] = max(a[l] - dp[l + 1], a[r] - dp[l])
    return dp[0] >= 0
\`\`\`

(The one-array version works because dp[l] still holds the shorter interval [l, r − 1] and dp[l + 1] holds [l + 1, r].)

**Stone Game I** is always a first-player win: with an even number of piles, the first player can take all even-indexed piles or all odd-indexed piles (whichever sum is larger), because after each of their moves the opponent can only take the other parity. So "return True" is correct, but explain the DP anyway.

**Stone Game II** (LC 1140): take the first X piles with 1 ≤ X ≤ 2M, then M = max(M, X). State (i, M); with suffix sums, the mover's total = suffix[i] − (the opponent's best from (i + X, max(M, X))). dp[i][M] = max over X of suffix[i] − dp[i + X][max(M, X)]. O(n³).

**Stone Game III** (LC 1406): take 1–3 stones from the front: dp[i] = max over k of sum(i..i + k − 1) − dp[i + k]. O(n).

**Stone Game VII** (LC 1690): remove an end stone and score the sum of the rest: the gain is a prefix-sum difference; same interval shape.

## Win/lose positions

For games where only the winner matters (the player who cannot move loses, under "normal play"):

- A position is **losing** (P-position) if every move leads to a winning position.
- A position is **winning** (N-position) if some move leads to a losing position.
- Terminal positions with no moves are losing.

**Can I Win** (LC 464): players pick unused numbers 1..m adding to a running total; reaching the target wins. State = the bitmask of used numbers (the total is determined by the mask). Memoise win[mask]. O(2^m · m), m ≤ 20. Check first that the sum 1 + … + m ≥ target, otherwise nobody can win.

**Divisor Game** (LC 1025): the first player wins iff n is even. Proof by induction: from even n, take x = 1 to give the opponent an odd number; an odd n has only odd divisors, so the opponent always receives an even number.

**Nim Game** (LC 292): take 1–3 stones; the mover loses iff n % 4 == 0. Multiples of 4 are the P-positions.

**Cat and Mouse** (LC 913) and similar games can loop forever (a draw). Plain recursion fails there; use **retrograde analysis**: start from known terminal results and propagate backwards with a queue, counting for each state how many moves lead to losses (a degree count, like Kahn's algorithm). States never decided are draws.

## Nim and Sprague–Grundy

**Nim**: several piles; a move removes any positive number of stones from one pile; the player who cannot move loses. The player to move **loses iff the XOR of the pile sizes is 0**.

Why: from XOR 0, any move changes exactly one pile and therefore makes the XOR non-zero. From XOR s ≠ 0, find a pile p with p XOR s < p (one with the top bit of s set) and reduce it to p XOR s, making the total XOR 0. So the mover with XOR 0 always hands back a non-zero XOR, and the opponent can always restore 0, until the mover faces all-empty piles.

**Sprague–Grundy theorem**: every impartial game position (both players have the same moves) is equivalent to a Nim pile of size g = **mex** of the Grundy numbers of the positions reachable in one move (mex = the minimum excluded non-negative integer: mex{0, 1, 3} = 2). A sum of independent games is a loss for the mover iff the XOR of their Grundy numbers is 0. So "several piles with strange move rules" is solved by computing g for each pile size with a small DP and XORing.

Example: piles where a move removes 1, 3 or 4 stones. g(0) = 0, g(1) = mex{g(0)} = 1, g(2) = mex{g(1)} = 0, g(3) = mex{g(2), g(0)} = 1, g(4) = mex{g(3), g(1), g(0)} = 2, …

## Minimax with pruning

When the game tree is too large for a table (chess, Connect Four), programs search to a fixed depth with **minimax** and **alpha-beta pruning**: skip branches that cannot change the decision because the opponent already has a better alternative elsewhere. With good move ordering, alpha-beta examines about b^(d/2) nodes instead of b^d. Name-level for interviews; implement it only for small games like tic-tac-toe.

## Common mistakes

- Mixing perspectives: write every value from the point of view of the player to move.
- Forgetting that "optimal" means the opponent also maximises: do not assume they play greedily.
- Looping games without retrograde analysis.
- Comparing totals instead of differences, which doubles the state.

## Interview angles

- Say "both play optimally; dp is the mover's advantage" before writing.
- Expect parity proofs (Stone Game I, Divisor Game) as a follow-up to the DP.
- Mention Sprague–Grundy if the game splits into independent parts.

## Connections

Interval DP (taking from ends), bitmask DP (used numbers), XOR tricks (Nim) and topological order (retrograde analysis) all appear in game problems.
`,
    doubts: [
      ["Why define dp as a score difference?", "A zero-sum game's outcome depends only on the difference. With the difference from the mover's perspective, the opponent's optimal reply is captured by subtracting dp of the next state, so one number per state suffices."],
      ["Why is the XOR of pile sizes the Nim criterion?", "From an XOR of 0, every move makes the XOR non-zero; from a non-zero XOR, there is always a move making it 0 (reduce a pile that has the highest set bit of the XOR). The player facing XOR 0 when no stones remain has lost."],
      ["What is mex?", "The smallest non-negative integer not in a set. mex({0, 1, 3}) = 2. A position's Grundy number is the mex of its options' Grundy numbers."],
      ["How do I know the mover can always restore XOR 0 in Nim?", "Let s be the non-zero XOR and b its highest set bit. Some pile p has bit b set (otherwise the XOR could not have it). Then p XOR s clears bit b and only changes lower bits, so p XOR s < p: a legal reduction. After it, the total XOR is s XOR s = 0."],
      ["Why does Stone Game II have state (i, M) and not just i?", "How many piles you may take depends on M, which depends on the history of moves. Two histories reaching index i with different M have different futures, so M must be in the state."],
      ["What changes in misère games (the player who takes the last stone loses)?", "Misère Nim plays like normal Nim until all piles are of size at most 1, then the parity flips. In general misère games do not decompose by Sprague–Grundy, so compute them directly."],
    ],
    revise: md`
? Score difference recurrence? :: dp[s] = max over moves of gain − dp[next].
? Ends-of-array game? :: dp[l][r] = max(a[l] − dp[l+1][r], a[r] − dp[l][r−1]).
? Winning position? :: Some move reaches a losing position.
? Nim losing condition? :: XOR of pile sizes is 0.
? Grundy number? :: mex of the options' Grundy numbers.
? Sum of independent games? :: XOR the Grundy numbers.
? One-array Predict the Winner? :: dp[l] = max(a[l] − dp[l+1], a[r] − dp[l]) looping lengths outside.
? Can I Win early check? :: If 1+…+m < target, nobody can win → false.
? Games that can loop (Cat and Mouse)? :: Retrograde analysis: propagate from terminal states with degree counts; undecided = draw.
? Grundy for moves {1,3,4}? :: g = 0,1,0,1,2,… via mex of reachable values.
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
## When to use it

"Count the integers in [L, R] whose digits satisfy some property", with R up to 10¹⁸, is impossible by enumeration but easy digit by digit. Digit DP builds the number from its most significant digit and counts completions, sharing work between all numbers with the same prefix situation.

Always solve f(N) = the count in [0, N] (or [1, N]), then answer f(R) − f(L − 1). Handle L = 0 separately if f(−1) is meaningless.

## The state

Process the digits of N from the most significant (position 0) to the least. The state at each position:

- **pos**: which digit we are choosing.
- **tight**: whether every digit so far equals N's digit. If tight, the current digit can be at most N[pos]; otherwise any of 0–9. Choosing a digit below N[pos] releases tight for the rest.
- **started**: whether a non-zero digit has been placed. Leading zeros are not real digits; they matter for properties such as "all digits distinct" or "count of zeros".
- **property state**: whatever the property needs: digit sum so far, the last digit, a mask of used digits, the remainder mod k, a count of some digit.

The recursion:

\`\`\`python
from functools import cache
def count_upto(N, ok):
    digits = list(map(int, str(N)))
    @cache
    def go(pos, state, tight, started):
        if pos == len(digits):
            return 1 if started and ok(state) else 0
        limit = digits[pos] if tight else 9
        total = 0
        for d in range(limit + 1):
            ns = started or d != 0
            total += go(pos + 1, step(state, d, ns), tight and d == limit, ns)
        return total
    return go(0, init, True, False)
\`\`\`

(Here step and init describe the property: for a digit sum, init = 0 and step adds d.)

**Memoising tight.** Only one path through the recursion is tight at each position (the prefix of N), so states with tight = true are visited once anyway. Caching them is harmless within one call to f, but a cache shared between f(R) and f(L − 1) must key on N as well, or must exclude the tight states. A common clean approach: memoise only non-tight states in a table indexed by (pos, state, started), which is independent of N's digits after the release, and reuse it across queries.

## Examples

- **Numbers At Most N Given Digit Set** (LC 902): digits come from a set D. Shorter numbers: Σ |D|^len for len < number of digits. Same length: walk N's digits; at each position add (count of digits in D below N[pos]) × |D|^(remaining), and continue only if N[pos] ∈ D. If you reach the end, add 1.
- **Count Numbers with Unique Digits** (LC 357): closed form 9 × 9 × 8 × … for each length.
- **Numbers With Repeated Digits** (LC 1012): count numbers ≤ N with all digits distinct (mask of used digits, started flag), then subtract from N.
- **Count Special Integers** (LC 2376): exactly that distinct-digit count.
- **Non-negative Integers without Consecutive Ones** (LC 600): the binary digits of N; state = the previous bit. The count of valid k-bit strings is a Fibonacci number, which gives an O(log N) walk.
- **Number of Digit One** (LC 233): per-position counting: for each position with weight p, count high, cur and low parts: ones = high × p + (cur > 1 ? p : cur == 1 ? low + 1 : 0). Or digit DP carrying the count of ones.
- **Count of Integers** with a digit sum in [minSum, maxSum] (LC 2719): state = digit sum (cap at maxSum + 1); answer with strings L and R.
- **Count Stepping Numbers in Range** (LC 2801): adjacent digits differ by exactly 1; state = the last digit plus started.
- **Numbers divisible by k with a digit property**: state = (property, remainder mod k).
- **Rotated Digits** (LC 788): state = "contains a digit that changes" plus validity.

## Complexity

States = positions × property values × 2 (started) × (tight on one path). Each state tries at most 10 digits. For 18 digits and digit sums up to 162: about 18 × 163 × 2 × 10 ≈ 6·10⁴ operations. For a mask of used digits: 18 × 1024 × 2 × 10 ≈ 4·10⁵. Tiny compared with enumeration.

## Typical bugs

- Counting leading zeros as digits ("0012" has two zeros only if they are real digits).
- f(L − 1) when L = 0 (define f(−1) = 0).
- Forgetting to keep tight only when d equals the limit.
- Whether 0 itself is counted: decide and be consistent in f(R) − f(L − 1).
- Huge L and R given as strings: subtract 1 from a decimal string carefully, or count [0, R] − [0, L] + (L itself if it qualifies).

## Interview angles

- Explain f(R) − f(L − 1) and the meaning of tight first; the rest is the property state.
- Many interviewers accept per-position counting formulas (Number of Digit One) and ask for the general method as a follow-up.

## Connections

Digit DP is a state-machine DP over digits with an upper-bound constraint. The same tight/free idea applies to counting strings that are lexicographically at most a given string (Find All Good Strings, LC 1397, combines it with a KMP automaton).
`,
    doubts: [
      ["Why is tight not part of the memo key?", "Only one path through the recursion is tight at each position (the one equal to N's prefix). Memoising non-tight states is where all the reuse happens; including tight is harmless but unnecessary."],
      ["Why track 'started'?", "Leading zeros are not real digits. For properties like 'no repeated digits' or 'number of zeros', treating 0007 as having three zeros would be wrong."],
      ["Why is the digit sum or remainder enough state, and not the whole prefix?", "The future only cares about how the prefix affects the final check. For \"digit sum in a range\" only the sum so far matters; for \"divisible by k\" only prefix mod k matters, because the final number is prefix × 10^rest + suffix. Anything that does not change a future decision is dropped from the state."],
      ["Can digit DP count numbers whose digits form a non-decreasing sequence?", "Yes: the property state is the last digit, and the next digit must be at least it. With the tight flag the count is exact for any N. (Without an upper bound, a stars-and-bars formula also counts them.)"],
      ["How do I find the k-th number with a property instead of counting?", "Walk the digits from the most significant: for each candidate digit, count how many valid completions start with the prefix so far plus that digit (using the DP with tight released), skip whole blocks while k exceeds the count, and fix the digit where k falls inside."],
    ],
    revise: md`
? Range trick? :: f(R) − f(L − 1).
? State components? :: pos, tight, started, property state.
? Tight meaning? :: Prefix equals N's prefix; current digit capped by N's digit.
? Why 'started'? :: To ignore leading zeros.
? Typical state count? :: Digits × property values × small constants.
? Numbers At Most N Given Digit Set: shorter numbers? :: Σ |D|^len for every length below N's length.
? Number of Digit One per position? :: high·p + (cur>1 ? p : cur==1 ? low+1 : 0).
? L given as a huge string? :: Count [0, R] − [0, L] and add 1 if L itself qualifies.
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
## When a DP is correct but too slow

Most DP speed-ups do not change the recurrence. They notice structure in the transition (a sliding window, a linear function, a monotone best choice, a linear recurrence) and evaluate the same max or min faster. Recognising which structure is present is the whole skill.

| Transition shape | Technique | Gain |
|---|---|---|
| min/max over a sliding window of j | monotone deque | O(nk) → O(n) |
| min over j of (m_j · x_i + b_j) | convex hull trick / Li Chao tree | O(n²) → O(n) or O(n log n) |
| dp[k][i] = min over j of dp[k − 1][j] + C(j, i), opt monotone in i | divide and conquer optimisation | O(kn²) → O(kn log n) |
| interval DP with monotone split points | Knuth's optimisation | O(n³) → O(n²) |
| fixed linear recurrence, huge n | matrix exponentiation | O(n·s²) → O(s³ log n) |
| sum over all submasks for every mask | SOS DP | O(3ⁿ) → O(n·2ⁿ) |
| capacity DP with few distinct reachable values | dictionary of states / bitsets | constant or sparsity gains |

## Monotone queue

dp[i] = f(i) + max over j ∈ [i − k, i − 1] of g(j). The window slides right, so keep a deque of candidate j's with g decreasing; pop from the back when a new g(j) dominates, and from the front when j leaves the window. Each j enters and leaves once: O(n). Jump Game VI (LC 1696), Constrained Subsequence Sum (LC 1425), and the bounded knapsack per residue class. Details on the deque-optimised DP page.

## Convex hull trick (CHT)

When the transition expands into a product of something about j and something about i:

dp[i] = min over j < i of (dp[j] + (S_i − S_j)²) = S_i² + min over j of (−2·S_j · S_i + dp[j] + S_j²)

each j defines a line y = m_j·x + b_j with m_j = −2·S_j and b_j = dp[j] + S_j², and the query asks for the lowest line at x = S_i. Keep the **lower envelope** of the lines:

- slopes inserted in sorted order and queries in sorted order → a deque, O(n) amortised (pop lines that can never be the minimum again);
- arbitrary order → a **Li Chao tree** (a segment tree over x where each node keeps the line that wins at its midpoint), O(log C) per insert and query.

Typical sources: "split into groups with cost (sum of group)²", "minimise Σ cost with a fixed overhead per group", some scheduling problems. Recognise it by a term that multiplies an i-quantity by a j-quantity.

## Divide and conquer optimisation

For layered DPs dp[k][i] = min over j < i of dp[k − 1][j] + C(j, i), let opt(i) be the j achieving the minimum. If opt(i) ≤ opt(i + 1) (monotone), compute the middle i of a range by scanning its allowed j-range, then recurse on the left half with j-range [lo, opt(mid)] and the right half with [opt(mid), hi]. Each recursion level costs O(n), and there are O(log n) levels: O(k · n log n).

Monotonicity holds when C satisfies the **quadrangle inequality** C(a, c) + C(b, d) ≤ C(a, d) + C(b, c) for a ≤ b ≤ c ≤ d (intuitively, "crossing" intervals are cheaper than nested ones). Squared sums and many "cost of a group" functions satisfy it. Split Array Largest Sum and "divide n villages among k post offices" are classic uses.

## Knuth's optimisation

For interval DPs dp[l][r] = min over l ≤ k < r of dp[l][k] + dp[k + 1][r] + C(l, r), if opt[l][r − 1] ≤ opt[l][r] ≤ opt[l + 1][r], scanning k only within that range makes the total work telescope to O(n²). Holds for optimal BSTs (Knuth, 1971) and for merging stones with sum costs.

## Matrix exponentiation

A recurrence with a fixed number s of state variables and constant coefficients is a matrix product v_n = M · v_(n − 1), so v_n = Mⁿ · v_0. Fast exponentiation (repeated squaring) computes Mⁿ with O(log n) multiplications of s × s matrices: O(s³ log n).

Fibonacci: (F(n + 1), F(n)) = [[1, 1], [1, 0]] · (F(n), F(n − 1)). F(10¹⁸) mod p takes about 60 squarings of a 2 × 2 matrix.

Other uses: counting walks of length L in a small graph (the adjacency matrix to the power L), state-machine DPs over huge n (Knight Dialer for n = 10⁹), tiling counts with a fixed width, linear recurrences of order k (k × k companion matrix; Kitamasa or Berlekamp–Massey for larger k).

## SOS DP (sum over subsets)

F[mask] = Σ over sub ⊆ mask of A[sub] for every mask. Instead of enumerating submasks (3ⁿ total), process one bit at a time: for each bit i, for each mask with bit i set, F[mask] += F[mask ^ (1 << i)]. After all n bits, F holds the subset sums: O(n · 2ⁿ). The same loop with the condition inverted gives superset sums. Used for "count pairs whose AND is zero", compatible numbers, and Möbius inversion over subsets.

## Other constant-factor tools

- **Bitsets** for boolean DPs (subset sum, transitive closure): 64 states per machine operation.
- **Dictionary of reachable states** with dominance pruning when only a few states are reachable.
- **Rolling arrays** to fit in cache.
- **Pruning unreachable states** (skip dp[mask] that is still ∞).

## Interview usage

Rare to implement, valuable to recognise. Strong answers say, for example: "the transition is a sliding-window max, so a monotone deque makes it linear", "the cost expands into a product of S_i and S_j, so the convex hull trick applies", or "this is a linear recurrence, so matrix power gives O(log n)". Always present the plain DP and its complexity first.

## Connections

The deque, CHT and D&C optimisations all exploit monotonicity of the best choice; matrix exponentiation exploits linearity; SOS exploits the product structure of the subset lattice.
`,
    doubts: [
      ["How do I know which optimisation applies?", "Look at the transition: a window max/min → monotone queue; a linear function of i with j-dependent coefficients → convex hull trick; a monotone argmin across rows → divide and conquer; monotone split points in interval DP → Knuth; fixed linear recurrence with huge n → matrix power."],
      ["Why does matrix exponentiation work for Fibonacci?", "[F(n+1), F(n)] = [[1,1],[1,0]] · [F(n), F(n−1)]. Applying the matrix n times is raising it to the n-th power, computable with repeated squaring."],
      ["How do I check whether the optimal j is monotone before using divide and conquer optimisation?", "Prove the quadrangle inequality for the cost if you can; otherwise brute-force opt(i) on random small inputs and check that it never decreases. Interview-wise, stating the condition and why the cost plausibly satisfies it is enough."],
      ["Is matrix exponentiation useful when n is only 10⁶?", "Rarely: the plain O(n·s²) loop is faster and simpler. Matrix power pays off when n is huge (10⁹ to 10¹⁸) and the state count s is small (up to about 50)."],
      ["Why must CHT queries be sorted for the deque version?", "The deque version discards lines from the front once they stop being optimal for the current x. That is only valid if later queries have larger (or equal) x, so the discarded lines can never win again. With unsorted queries, binary search the envelope or use a Li Chao tree."],
    ],
    revise: md`
? Window max transition? :: Monotone deque: O(n).
? min over j of (m_j x_i + c_j)? :: Convex hull trick or Li Chao tree.
? Monotone argmin across i? :: Divide and conquer optimisation: O(kn log n).
? Interval DP with monotone splits? :: Knuth: O(n²).
? Linear recurrence, huge n? :: Matrix exponentiation O(s³ log n).
? Sum over subsets? :: SOS DP O(n 2ⁿ).
? CHT line for cost (S_i − S_j)²? :: m_j = −2·S_j, b_j = dp[j] + S_j², query at x = S_i, add S_i².
? Quadrangle inequality? :: C(a,c) + C(b,d) ≤ C(a,d) + C(b,c) for a ≤ b ≤ c ≤ d.
? Li Chao tree vs deque CHT? :: Deque needs sorted slopes and queries (O(n)); Li Chao handles any order (O(log C)).
? SOS loop? :: For each bit i, for masks with bit i: F[mask] += F[mask ^ (1<<i)].
`,
    pitfalls: ["Applying an optimisation without its monotonicity condition", "Overflow in matrix products (use mod)"],
    quiz: [Q("F(10¹⁸) mod p is computed by…", ["iteration", "*matrix exponentiation", "memoisation", "Binet's formula with floats"], "About 60 squarings of a 2×2 matrix.")],
    sources: [S.article("Convex hull trick and Li Chao tree", "cp-algorithms", "https://cp-algorithms.com/geometry/convex_hull_trick.html"), S.article("Divide and conquer DP", "cp-algorithms", "https://cp-algorithms.com/dynamic_programming/divide-and-conquer-dp.html"), S.article("Knuth's optimization", "cp-algorithms", "https://cp-algorithms.com/dynamic_programming/knuth-optimization.html"), S.article("Binary exponentiation (matrices)", "cp-algorithms", "https://cp-algorithms.com/algebra/binary-exp.html")],
    problems: [1696, 509, 1137, 1220, 2944],
  },
};
