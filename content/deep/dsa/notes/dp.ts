/** Cheat-sheet notes: one fact per line, "## " groups. Shown collapsed under the Revise sheet. */
export const notes: Record<string, string> = {
  "dp-foundations": `
## Two ingredients
Optimal substructure: an optimal answer is built from optimal answers to subproblems.
Overlapping subproblems: the same subproblem recurs, so caching pays off (otherwise it is divide and conquer).
## Derivation path
1. Define the state in words ("dp[i] = best answer for the first i items").
2. Write the transition: the last decision made, over all options.
3. Base cases. 4. Evaluation order (dependencies first). 5. Where the answer lives. 6. Optimise space.
Start from the brute-force recursion, memoise it, then convert to a table if needed.
## Top-down vs bottom-up
Top-down (memo): natural, computes only reachable states, risks recursion depth.
Bottom-up (table): no recursion, enables rolling arrays and other optimisations, computes every state.
lru_cache / @cache in Python; clear it between test cases.
## Designing the state
Include exactly what the future depends on: index, remaining capacity, last choice, holding or not, mask.
Fewer dimensions = faster; if two states always yield the same future, merge them.
Prefix states (first i items), interval states (l, r), subset states (mask), tree states (subtree of v).
## Recognising DP
"Number of ways", "minimum or maximum cost", "is it possible", choices at each step that affect later steps, n up to a few thousand.
Greedy fails on a small counterexample → probably DP.
## Complexity
Number of states × transitions per state. 10⁴ × 10⁴ states is too many: rethink the state.
## Common bugs
Wrong base case (dp[0] meaning), wrong loop order (reading a state not yet computed), off-by-one between 0- and 1-indexed dp, int overflow, forgetting the modulus, mixing −∞ and 0 for impossible states.
## Extras
Bellman named it; optimal substructure fails for longest simple paths.
State test: same state ⇒ same futures; otherwise add information.
Every DP = path problem on the DAG of states.
Top-down first for correctness, then bottom-up for space.
Use −∞ (not 0) for impossible states in max-DPs.
`,
  "linear-dp": `
## Climbing stairs (LC 70)
dp[i] = dp[i−1] + dp[i−2] (Fibonacci); two variables for O(1) space.
k step sizes: sum over the allowed steps. Min cost climbing stairs: dp[i] = cost[i] + min(dp[i−1], dp[i−2]).
## House robber (LC 198)
dp[i] = max(dp[i−1], dp[i−2] + a[i]): skip i or take it.
Circular (LC 213): max(rob(0..n−2), rob(1..n−1)).
Delete and earn (LC 740): bucket the values, then house robber over the values.
## Decode ways (LC 91)
dp[i] = (s[i−1] ≠ '0' ? dp[i−1] : 0) + (10 ≤ s[i−2..i−1] ≤ 26 ? dp[i−2] : 0). '0' alone is invalid.
Decode ways II (LC 639): '*' multiplies the cases; use the modulus.
## Minimum cost families
Min cost tickets (LC 983): dp[day] = min(dp[day−1] + c1, dp[day−7] + c7, dp[day−30] + c30).
Perfect squares (LC 279): dp[n] = 1 + min over squares s ≤ n of dp[n − s] (also BFS; Lagrange: answer ≤ 4).
Integer break, minimum steps to one.
## Look-back over a range
dp[i] depends on dp[j] for j in a window: a sliding-window max (deque) or prefix sums of dp keep it O(n).
Partition array for maximum sum (LC 1043): look back up to k positions.
## Counting with mod
Add then take mod each step: (a + b) % M; for subtraction add M first: (a − b + M) % M.
## Method
dp[i] = answer for a prefix; ask what the last decision was; combine over those choices; roll to O(1) space only after it is correct.
Brainpower (LC 2140): suffix DP dp[i] = max(dp[i+1], p[i] + dp[i + b[i] + 1]).
Paint House II in O(nk): keep the smallest and second-smallest of the previous row.
New 21 Game: sliding-window sum of probabilities.
Decode Ways II '*': one digit ×9; "1*" 9, "2*" 6, "**" 15, "*d" 2 if d ≤ 6 else 1.
`,
  "state-machine-dp": `
## Template
States = the situation after day i (holding a share, not holding, cooling down); transitions = actions (buy, sell, rest).
Update all states from the previous day's values each step.
## Six stock problems
One transaction (LC 121): track the minimum price; profit = price − min.
Unlimited (LC 122): sum every positive daily difference (or hold/cash DP).
At most 2 (LC 123): states buy1, sell1, buy2, sell2: buy1 = max(buy1, −p), sell1 = max(sell1, buy1 + p), buy2 = max(buy2, sell1 − p), sell2 = max(sell2, buy2 + p).
At most k (LC 188): arrays buy[j], sell[j]; if k ≥ n/2, it is the unlimited case.
Cooldown (LC 309): hold, sold, rest; buying comes from rest (the day after a sale is cooldown).
Transaction fee (LC 714): subtract the fee when selling (or buying).
## Updating in place
Using today's updated buy within today's sell means buying and selling on the same day: zero profit, so it never changes the optimum.
Be careful when the order does matter (cooldown): use the previous values explicitly.
## Other state machines
Paint house (LC 256): state = the colour used last. Paint house II with k colours: track the best and second-best.
Wiggle subsequence: up and down states. Student attendance record II: (absences, trailing lates).
Regex and KMP automata are state machines over characters.
## Extras
Cooldown of c days: hold[i] = max(hold[i−1], free[i−c−1] − price).
Count a transaction at the buy; sell[0] = 0, buy[j] = −∞ at the start.
Fee can be charged on buy or sell (same answer); the greedy "sum positive gains" breaks with a fee.
Student attendance II: 6 states (absent 0/1 × trailing lates 0/1/2).
Maximum alternating subsequence sum: add/subtract states.
`,
  lis: `
## O(n²) DP
dp[i] = 1 + max(dp[j]) over j < i with a[j] < a[i]; answer = max dp.
Count the number of LISs (LC 673): keep cnt[i] alongside the length.
## O(n log n): tails
tails[k] = the smallest possible tail of an increasing subsequence of length k + 1.
For each x, binary search the first tail ≥ x (lower bound) and replace it, or append if none.
Length = len(tails). Non-decreasing: use upper bound (first tail > x).
tails is not itself a valid LIS; to reconstruct, store predecessor indices.
## Disguises
Russian doll envelopes (LC 354): sort by width ascending and height descending, then LIS on heights.
Maximum length of a pair chain (LC 646): greedy by end, or LIS.
Longest divisible subset (LC 368): sort, LIS with divisibility, track the parent.
Minimum deletions to make an array sorted = n − LIS. Minimum operations to make a subsequence (LC 1713): map to indices, then LIS.
Longest string chain (LC 1048): sort by length, dp over words with one letter removed.
Box stacking, building bridges (sort one side, LIS on the other).
## Relation to LCS
LIS(a) = LCS(a, sorted unique a). LCS of two permutations reduces to LIS in O(n log n).
Dilworth: the minimum number of non-increasing sequences covering the array = the LIS length.
## Extras
O(n²) state: lis[i] ends AT i; answer = max over i; prev[] for reconstruction.
Invariant: tails strictly increasing; tails[k] = smallest tail of a length-(k+1) increasing subsequence.
Dilworth: LIS length = minimum number of non-increasing sequences covering the array.
Segment tree over values: LIS with a value gap (LC 2407), and counting in O(n log n).
Increasing triplet: two smallest tails, O(1) space.
`,
  "partition-dp": `
## Shape
dp[i] = best over j < i of dp[j] + cost(j, i): the last piece is a[j..i−1].
O(n²) transitions, or O(n·L) when pieces have length ≤ L.
## Word break (LC 139)
dp[0] = true; dp[i] = any(dp[j] and s[j:i] in dict). Limit j to words of the dictionary's max length.
A trie walk from each j avoids building substrings.
## Palindrome partitioning II (LC 132)
cuts[i] = min over palindromic s[j..i] of cuts[j−1] + 1; precompute the palindrome table, or expand around centres updating cuts. O(n²).
## Splitting into k parts
dp[k][i] = best for the first i items in k parts = min over j of max(dp[k−1][j], sum(j..i)) for split array largest sum (LC 410).
Binary search on the answer is simpler for "minimise the maximum".
Minimum difficulty of a job schedule (LC 1335): dp[d][i] with the max of the last day's jobs.
Partition array for maximum sum (LC 1043), filling bookcase shelves (LC 1105).
## Partition DP vs interval DP
Partition: the pieces are consecutive from the left, state = a prefix. Interval: decisions split inside a range, state = (l, r).
## Extras
Palindrome Partitioning II via centres: for each palindrome s[l..r], cuts[r] = min(cuts[r], l == 0 ? 0 : cuts[l−1] + 1).
Minimum Difficulty: running max while j moves left; monotonic stack for O(nd).
Store choice[i] to reconstruct the pieces.
Greedy longest piece fails Word Break ("aaab" with {a, aaa, ab}).
`,
  "grid-dp": `
## Basic recurrence
Unique paths (LC 62): dp[r][c] = dp[r−1][c] + dp[r][c−1]; also C(r + c − 2, r − 1).
Minimum path sum (LC 64): grid[r][c] + min(top, left). Roll to one row: O(C) space.
Obstacles (LC 63): an obstacle cell is 0 ways; the first row and column stop after an obstacle.
Triangle (LC 120): bottom-up, dp[c] = t[r][c] + min(dp[c], dp[c + 1]).
## Maximal square (LC 221)
dp[r][c] = 1 + min(top, left, top-left) if the cell is 1. Answer = max² (side squared).
Count square submatrices (LC 1277): sum of dp.
## Dungeon game (LC 174)
Go backwards from the princess: need[r][c] = max(1, min(need right, need down) − dungeon[r][c]).
Forward DP fails because it must track both the current health and the minimum so far.
## Cherry pickup (LC 741)
Two walkers moving together: state (step, r1, r2), so c = step − r; count a shared cell once. O(n³).
Cherry pickup II (LC 1463): two robots on the same row, state (row, c1, c2).
## Counting with obstacles and mod
Paths with sum divisible by k: add the remainder as a state (r, c, sum mod k).
Out of boundary paths (LC 576): (moves, r, c) with the modulus.
Longest increasing path in a matrix: memoised DFS (a DAG), not a row-by-row table.
## Extras
Unique Paths II: after an obstacle in the first row/column, all later cells are 0.
Falling path with a column ban: min and second min of the previous row.
Cherry Pickup II: state (row, c1, c2), 9 transitions.
Knight probability: (moves, r, c), divide by 8 per move.
Longest Increasing Path in a Matrix: memoised DFS (a DAG), not row order.
`,
  "two-sequence-dp": `
## Table
dp[i][j] = answer for prefixes a[:i] and b[:j]; row 0 and column 0 are empty prefixes. O(n·m) time; roll to O(min(n, m)) space.
## LCS (LC 1143)
Match: dp[i−1][j−1] + 1; else max(dp[i−1][j], dp[i][j−1]).
Reconstruct by walking back from dp[n][m].
Shortest common supersequence = n + m − LCS. Minimum deletions to make equal = n + m − 2·LCS.
Longest common substring: reset to 0 on a mismatch; track the max.
## Edit distance (LC 72)
Match: dp[i−1][j−1]; else 1 + min(replace dp[i−1][j−1], delete dp[i−1][j], insert dp[i][j−1]).
Base: dp[i][0] = i, dp[0][j] = j. One edit distance (LC 161) is a linear scan.
## Wildcards and regex
Wildcard (LC 44): '*' → dp[i][j−1] (empty) or dp[i−1][j] (consume a character); '?' matches one.
Regex (LC 10): 'x*' → dp[i][j−2] (zero copies) or (match x) and dp[i−1][j] (one more).
Initialise patterns like "a*b*" against an empty string.
## Interleaving string (LC 97)
dp[i][j] = s3[i + j − 1] comes from s1 (dp[i−1][j]) or from s2 (dp[i][j−1]).
## Distinct subsequences (LC 115)
Equal: dp[i−1][j−1] + dp[i−1][j]; else dp[i−1][j]. Iterate j backwards when rolling.
## Faster special cases
LCS of permutations → LIS in O(n log n). Edit distance with a small bound k: only the diagonal band, O(n·k). Hunt–Szymanski for sparse matches.
## Extras
Taking a match in LCS is always safe (swap argument).
SCS is built during the LCS walk back; Minimum ASCII Delete Sum = LCS with costs.
Smith–Waterman: maximise, clamp at 0, best cell anywhere (local alignment).
Myers' diff: O((n + m)·D).
Interleaving: s3 index is i + j − 1; check lengths first.
`,
  "palindrome-dp": `
## Substrings (contiguous)
isPal[i][j] = s[i] == s[j] and (j − i < 2 or isPal[i+1][j−1]); fill by increasing length. O(n²).
Expand around centres (2n − 1 of them): O(n²) time, O(1) space. Longest palindromic substring (LC 5), count palindromic substrings (LC 647).
Manacher's algorithm: O(n).
## Subsequences (not contiguous)
LPS[i][j] = s[i] == s[j] ? LPS[i+1][j−1] + 2 : max(LPS[i+1][j], LPS[i][j−1]).
LPS(s) = LCS(s, reverse(s)).
Minimum insertions to make a palindrome (LC 1312) = n − LPS.
Count palindromic subsequences, distinct (LC 730): handle equal-character inner occurrences carefully.
Valid palindrome III (remove at most k): n − LPS ≤ k.
## Choosing
Contiguous → centres or isPal table. Not contiguous → interval DP or LCS with the reverse.
Palindrome partitioning reuses the isPal table.
## Extras
Count by position: each successful centre-expansion step is one substring.
Count palindromic subsequences: inclusion–exclusion on the inner range.
LC 1930: first and last occurrence per letter, distinct letters between.
Many substring change queries (LC 1177): prefix letter counts, mismatched pairs = odd counts / 2.
`,
  "counting-dp": `
## Sum instead of max
Replace max/min with + over the same transitions; base case = 1 way for the empty choice.
## Loop order decides ordered vs unordered
Combinations (order does not matter, coin change II): outer loop over coins, inner over amounts.
Permutations (order matters, combination sum IV, LC 377): outer loop over amounts, inner over coins.
## Problems
Unique paths, decode ways, climbing stairs, number of dice rolls with a target sum (LC 1155), knight dialer (LC 935).
Unique BSTs (LC 96): Catalan: G(n) = Σ G(i − 1)·G(n − i).
Count vowel strings, count sorted strings, number of music playlists (LC 920).
Domino and tromino tiling (LC 790): dp[n] = 2·dp[n−1] + dp[n−3].
Ways to build a rope, ways to stay in the same place.
## Mod arithmetic
Take mod after every addition; with multiplication use 64-bit intermediates.
Never divide under a modulus: multiply by the modular inverse (Fermat when the modulus is prime).
## Avoiding double counting
Define a canonical order of construction (non-decreasing parts, first difference, or the last element chosen).
Inclusion–exclusion when constraints overlap; distinct subsequences subtract the count at the previous occurrence of the same character.
## Extras
Rule: every object must come from exactly one decision path (canonical construction).
Count optimal solutions: better → copy the count, tie → add it.
Domino and tromino: dp[n] = 2·dp[n−1] + dp[n−3].
Music playlists: new song (n − j + 1) or replay (j − k when j > k).
Probability DP = counts / total; Soup Servings capped for large n.
`,
  "knapsack-01": `
## Recurrence
dp[i][w] = max(dp[i−1][w], dp[i−1][w − wt[i]] + val[i]): skip item i or take it once.
## One array
Iterate w downwards from W to wt[i] so each item is used at most once.
Iterating upwards turns it into the unbounded knapsack.
## Pseudo-polynomial time
O(n·W) is polynomial in the value W, not in its bit length: NP-hard in general.
Huge W but small values: switch to dp[value] = minimum weight. Small n (≤ 40): meet in the middle.
## Multi-dimensional capacity
Ones and zeroes (LC 474): dp[zeros][ones], both iterated downwards.
## Disguises
Partition equal subset sum (LC 416): target sum / 2, boolean.
Target sum (LC 494): count subsets with sum (total + target) / 2.
Last stone weight II (LC 1049): the closest subset sum to total / 2.
Profitable schemes (LC 879): people and profit dimensions (profit capped at the target).
## Reconstruction
Keep the 2D table (or a choice bitset) and walk back: if dp[i][w] ≠ dp[i−1][w], item i was taken.
## Fractional knapsack
Items can be split: greedy by value/weight ratio is optimal. 0/1 cannot use greedy (counterexample: ratio-first misses the best combination).
## Extras
Dry-run table habit: rows = items, columns = capacity.
Tallest Billboard: dp over the difference, store the taller height.
Meet in the middle for n ≤ 40: Pareto front of one half, binary search from the other.
FPTAS by scaling values: (1 − ε)-optimal in O(n³/ε).
Dictionary of reachable states with dominance pruning when W is sparse.
`,
  "knapsack-unbounded": `
## Difference from 0/1
Each item can be used any number of times: dp[w] = max(dp[w], dp[w − wt] + val), w iterated upwards.
## Coin change (LC 322): minimum coins
dp[0] = 0, others ∞; dp[a] = min(dp[a], dp[a − c] + 1). Answer −1 if still ∞.
Greedy works only for canonical coin systems (like 1, 5, 10, 25), not in general (1, 3, 4 with amount 6).
BFS over amounts is an alternative.
## Coin change II (LC 518): number of ways
dp[0] = 1; coins outer, amounts inner → combinations (each multiset once).
Swapping the loops counts ordered sequences (combination sum IV).
## Other unbounded problems
Rod cutting, integer break, perfect squares, minimum cost for tickets, complete knapsack.
## Bounded knapsack
Item i available c_i times: binary splitting into 1, 2, 4, … copies turns it into 0/1 with O(log c) items each.
Monotone-queue optimisation per residue class gives O(n·W).
## Extras
Min/max: loop order free; counting: coins outer = combinations, amounts outer = permutations.
Canonical coin systems make greedy optimal; any counterexample is below the sum of the two largest coins.
Integer Break: as many 3s as possible; 4 = 2 + 2.
Rod Cutting: dp[L] = max price[k] + dp[L − k].
Reconstruct with choice[a].
`,
  "subset-sum": `
## Boolean knapsack
can[0] = true; for each x, for s from S down to x: can[s] |= can[s − x]. O(n·S).
Bitset trick: bits |= bits << x: 64× faster (Python ints work as bitsets).
## Reductions
Partition equal subset sum: is total / 2 reachable (total must be even).
Target sum with ±: subset P with P − N = T and P + N = total → P = (total + T) / 2 (must be a non-negative integer).
Minimum subset sum difference: the reachable s closest to total / 2.
Split array with the same average (LC 805): fix the size k and need sum = k·total / n; meet in the middle.
## Zeros and counting
Counting with zeros: each zero doubles the count; the counting DP handles it if you include zeros normally.
Count subsets with sum S: + instead of |, mod as needed.
## Complexity guard
S up to ~10⁵–10⁶ with n up to ~10³ is fine; larger sums need meet in the middle (n ≤ 40) or other structure.
Negative numbers: shift by an offset, or use a dict of reachable sums.
## Extras
Early exits: odd total (partition), target > total, skip items above the target.
LC 2035: meet in the middle grouped by element count.
Minimum elements to reach s: dp[s] = min count (min-knapsack).
Reconstruct with a 2D table or "first item that reached s".
`,
  "knapsack-variants": `
## Bounded knapsack
Limited copies: binary splitting (1, 2, 4, …, remainder) → 0/1 over O(Σ log c) items; or a monotone deque per residue mod weight.
## Group knapsack
Pick at most one item per group: for each group, for w descending, for each item in the group: dp[w] = max(dp[w], dp[w − wt] + val).
The item loop is inside the capacity loop so that only one item per group is taken.
Number of dice rolls with a target sum, maximum value of k coins from piles (LC 2218).
## Value-indexed DP
Huge capacity but small total value: dp[v] = minimum weight to reach value v; answer = the largest v with dp[v] ≤ W.
## Dependent items (tree knapsack)
Taking a child requires its parent: DFS, merge the children's dp arrays into the parent's (small-to-large keeps it O(n·W)).
Course selection with prerequisites, and employee importance-style budgets.
## Exactness and initialisation
"Exactly W": dp[0] = 0, others −∞ (max) or ∞ (min). "At most W": all zeros.
Counting: dp[0] = 1.
## Other names
Multiple-choice knapsack, reliability design (maximise the product of reliabilities), cargo loading, investment allocation.
## Extras
Bounded with ≥ constraints: clamp the at-least dimension.
Exactly one per group: no skip transition, −∞ initial states.
Tree knapsack total O(n²): each pair of nodes meets once at their LCA.
Reliability design: products (or log sums) as the combiner.
`,
  "interval-dp": `
## Shape
dp[l][r] = best answer for the range a[l..r]; combine dp[l][k] and dp[k+1][r] over a split k, plus the cost of combining.
Fill by increasing length (outer loop len, then l). O(n³) typically.
## Think "last" instead of "first"
Burst balloons (LC 312): choose the balloon k burst last in (l, r); its neighbours are then a[l] and a[r]: dp[l][r] = max dp[l][k] + dp[k][r] + a[l]·a[k]·a[r]. Pad with 1s.
The last action splits the range into independent halves; the first action does not.
## Classics
Matrix chain multiplication: dp[i][j] = min dp[i][k] + dp[k+1][j] + p[i−1]·p[k]·p[j].
Minimum cost to cut a stick (LC 1547): sort the cuts, add the ends, dp over cut indices.
Minimum score triangulation of a polygon (LC 1039).
Strange printer (LC 664), remove boxes (LC 546, extra dimension for the attached count).
Stone game variants, merge stones (LC 1000: k-way merges need (len − 1) mod (k − 1) == 0).
Optimal binary search tree; longest palindromic subsequence is interval DP too.
## Knuth's optimisation
When opt[l][r−1] ≤ opt[l][r] ≤ opt[l+1][r] (quadrangle inequality), restrict k to that range: O(n²).
Applies to optimal BST and merge-stones-type costs.
## Extras
Recognise: adjacent merges/removals whose cost depends on current neighbours; n ≤ a few hundred.
Fill by length (not by l alone).
Guess Number II: minimax k + max(left, right).
Triangulation: edge (i, j) is in exactly one triangle (i, k, j).
`,
  "bitmask-dp": `
## State
A mask of n bits records which items are used; feasible for n ≤ ~20 (2²⁰ ≈ 10⁶ states).
Bit ops: test mask >> i & 1, set mask | 1 << i, clear mask & ~(1 << i), popcount for "how many used".
## Assignment (dp[mask])
Assign workers to tasks in order: the next worker is popcount(mask); dp[mask | bit] = min(dp[mask] + cost[pop][j]).
Minimum incompatibility, partition into k equal subsets (dp[mask] = sum mod target), matchsticks.
Smallest sufficient team (LC 1125): dp over the skill mask, keeping the team.
## Travelling salesman (dp[mask][last])
dp[mask][v] = minimum cost to visit mask ending at v; extend with u ∉ mask. O(2ⁿ·n²).
Shortest path visiting all nodes (LC 847) = BFS over (mask, node).
Find the shortest superstring (LC 943): TSP over overlaps.
## Submask enumeration
for sub = mask; sub > 0; sub = (sub − 1) & mask. All submasks of all masks: O(3ⁿ) total.
Used when splitting a set into groups (dp[mask] = min over sub of dp[mask ^ sub] + cost[sub]).
## Profile DP
Broken profile: tile a grid column by column with a mask of the cells sticking out; domino tilings, maximum students taking an exam (LC 1349: row masks without adjacent bits).
## Extras
Hungarian algorithm O(n³) for large assignment problems.
Superstring: TSP with w = added characters; parents to rebuild.
Masks per row (profile DP) for narrow grids.
SOS DP: Σ over submasks for every mask in O(n·2ⁿ).
Python: 2ⁿ·n² at n = 20 is too slow; prune unreachable masks.
`,
  "tree-dp": `
## Include / exclude
dp[v][0] = best with v not taken, dp[v][1] = with v taken.
House robber III (LC 337): take[v] = val + Σ skip[c]; skip[v] = Σ max(take[c], skip[c]).
Maximum independent set and minimum vertex cover on trees are linear.
Binary tree cameras (LC 968): three states (covered without a camera, has a camera, not covered).
## Subtree aggregates
Sizes, sums, counts of nodes with a property; count good paths; distribute coins (LC 979: moves = Σ |excess| over edges).
## Rerooting (all roots in O(n))
First DFS: answers for subtrees. Second DFS: push the parent's contribution down.
Sum of distances in a tree (LC 834): ans[c] = ans[p] − size[c] + (n − size[c]).
Minimum height trees, maximum path from every node (keep the top two child paths).
## Diameter and longest paths
Diameter: the max over v of the top two child depths summed; or BFS twice (farthest from any node, then farthest from that one).
Longest path with different adjacent characters (LC 2246).
## Knapsack on trees
Merge children's dp arrays (dp[v][k] = best with k nodes in v's subtree); bounded by sizes → O(n²) total.
## General trees
Build adjacency lists, root anywhere, pass the parent to avoid walking back; use iterative DFS for deep trees.
## Extras
Return value design: what must the parent know about v?
Max path sum: max(0, child chain) drops negative chains.
Count Nodes With the Highest Score: product of child sizes and n − size(v).
Tree knapsack O(n²): pairs meet once at their LCA.
Minimum dominating set and vertex cover are also linear on trees.
`,
  "game-dp": `
## Minimax with score difference
dp[l][r] = the best (my score − opponent's score) for the player to move on a[l..r] = max(a[l] − dp[l+1][r], a[r] − dp[l][r−1]).
Predict the winner (LC 486), stone game (LC 877: the first player always wins for even piles).
Stone game II (LC 1140): state (i, M) with suffix sums. Stone game III (LC 1406): take 1–3 from the front.
## Win/lose positions
A position is winning if some move leads to a losing position; losing if every move leads to a winning one.
Nim game (LC 292): losing iff n mod 4 == 0. Divisor game: Alice wins iff n is even.
Can I win (LC 464): memo on the mask of used numbers.
Cat and mouse (LC 913): retrograde analysis from known outcomes (BFS backwards), because cycles break plain recursion.
## Nim and Sprague–Grundy
Nim: the first player wins iff the XOR of the pile sizes ≠ 0.
Grundy value = mex of the Grundy values of reachable positions; a sum of games XORs their Grundy values.
## Minimax with pruning
Alpha-beta prunes branches that cannot change the decision; best case O(b^(d/2)).
## Interview angle
Say "assume both play optimally", define the value from the mover's perspective, and use the score difference so one function covers both players.
## Extras
Nim proof: from XOR s ≠ 0, reduce a pile with s's top bit to p XOR s.
Stone Game II: dp[i][M] = max over X ≤ 2M of suffix[i] − dp[i+X][max(M, X)].
Stone Game VII: gain = sum of the remaining stones (prefix sums).
Divisor Game: induction on parity; Nim Game: lose iff n % 4 == 0.
Alpha-beta: about b^(d/2) nodes with good ordering.
`,
  "digit-dp": `
## Technique
Count numbers in [0, N] with a property: process digits from the most significant; state (position, tight, extra state such as sum, last digit, mask, started).
tight = the prefix equals N's prefix, so the next digit is limited to N's digit; otherwise 0–9.
Answer for [L, R] = f(R) − f(L − 1).
started (leading zeros) matters when zeros affect the property (distinct digits, "no two equal adjacent").
## Examples
Count numbers with unique digits (LC 357); numbers at most N given a digit set (LC 902).
Count special integers (LC 2376): a mask of used digits.
Number of digit one (LC 233): per-position counting or digit DP.
Numbers with repeated digits (LC 1012) = N − count with all distinct.
Count stepping numbers, digit sum in range, divisible by k (state = remainder).
## Complexity
positions × tight (2) × state × 10 digits; e.g. 10 × 2 × 1024 × 10 for digit masks.
Memoise only the non-tight states (they are shared across calls).
## Typical bugs
Forgetting f(L − 1); mishandling leading zeros; memoising tight states with an N-specific cache; using a string N but comparing ints.
## Extras
Shared memo across f(R) and f(L−1): key on N, or memoise only non-tight states.
LC 600: previous bit as state; Fibonacci counts.
k-th number with a property: count completions per digit and skip blocks.
Divisible by k: keep prefix mod k.
`,
  "dp-optimizations": `
## Monotone queue
dp[i] = min over j in a sliding window of (dp[j] + f(j)) + g(i): a deque gives O(n). Bounded knapsack per residue.
## Convex hull trick
dp[i] = min over j of (m_j·x_i + b_j): lines added with monotone slopes, queried at monotone x → amortised O(1) with a deque; otherwise a Li Chao tree O(log n).
Typical source: cost(j, i) expands into a product term (prefix sums times prefix sums).
## Divide and conquer optimisation
dp[k][i] = min over j < i of dp[k−1][j] + C(j, i) with opt(i) monotone in i: compute the mid's opt, recurse on halves with restricted ranges. O(k·n log n).
## Knuth's optimisation
Interval DP with opt[l][r−1] ≤ opt[l][r] ≤ opt[l+1][r]: O(n³) → O(n²).
## Matrix exponentiation
Linear recurrences with constant coefficients: a k×k transition matrix raised to n in O(k³ log n). Fibonacci in O(log n).
Counting paths of length L in a graph = the adjacency matrix to the power L.
## SOS DP (sum over subsets)
F[mask] = Σ over submasks of A[sub]: iterate bits, F[mask] += F[mask ^ bit] if the bit is set. O(n·2ⁿ) instead of O(3ⁿ).
## Interview usage
Rarely required: name the optimisation, state the condition it needs, and show the plain DP first.
## Extras
Table: window → deque; product term → CHT; monotone opt → D&C; interval monotone → Knuth; linear recurrence → matrix power; submask sums → SOS.
Matrix power pays off for n ≥ 10⁹ with small s.
Walks of length L = adjacency matrix to the power L.
Berlekamp–Massey / Kitamasa for long linear recurrences (name-level).
`,
};
