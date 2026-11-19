import { P, Q, T } from "./h";
import type { Problem, Topic } from "@/lib/types";

export const topics3: Topic[] = [
  T("dsa", "dp-1d", "DP I: linear & decision DP", 1, 45, "State, transition, base case, order: the four questions that solve every DP.", {
    signals: ["Count ways / min cost / max value / is it possible", "Choices at each step with overlapping sub-problems", "Greedy has a counter-example"],
    lesson: `**The four questions**
1. **State:** what is the smallest description of a sub-problem? (\`dp[i]\` = best answer for the prefix ending at i.)
2. **Transition:** which last decision leads here?
3. **Base cases.**
4. **Order** of evaluation (and the final answer's location).

Start top-down (recursion + memo) to get correctness, then convert to bottom-up and compress space if asked.

**Families**
- *Fibonacci-like:* Climbing Stairs, House Robber (\`dp[i] = max(dp[i−1], dp[i−2] + a[i]\`), Decode Ways.
- *Unbounded choices:* Coin Change (\`dp[x] = 1 + min dp[x − c]\`), Word Break.
- *Kadane:* best subarray ending here = \`max(a[i], cur + a[i])\`.
- *LIS:* O(n²) DP or O(n log n) patience (tails array + lower_bound). Sorting + LIS solves envelopes, pair chains.
- *Sort by end + binary search:* weighted interval scheduling (\`dp[i] = max(dp[i−1], w[i] + dp[p(i)])\`).
- *State machines:* stock problems: states hold / sold / cooldown.

**Circular arrays:** solve twice (exclude first, exclude last) or use "total − min subarray".

A DP answer in an interview = recurrence stated in words first, then code.`,
    template: `// LIS in O(n log n)
vector<int> tails;
for (int x : a) {
  auto it = lower_bound(tails.begin(), tails.end(), x);   // upper_bound for non-decreasing
  if (it == tails.end()) tails.push_back(x); else *it = x;
}
return tails.size();`,
    viz: "lis",
    pitfalls: ["Unclear state definition (prefix 'ending at i' vs 'up to i')", "Wrong iteration order for unbounded vs 0/1 choices", "Using INT_MAX then adding 1", "Greedy coin change on arbitrary denominations", "Reconstructing the LIS from tails directly (tails is not the sequence)"],
    quiz: [
      Q("LIS in O(n log n): tails[k] stores…", ["The LIS itself", "*The smallest possible tail of an increasing subsequence of length k+1", "The k-th element", "Prefix maxima"], "Smaller tails keep more options open; length equals the array size."),
      Q("Max Profit in Job Scheduling: after sorting by end time, dp[i] =", ["dp[i−1] + profit", "*max(dp[i−1], profit[i] + dp[last job ending ≤ start[i]])", "max over all j < i always", "profit[i]"], "Skip the job or take it plus the best compatible prefix found via binary search."),
      Q("House Robber on a circle is solved by…", ["A 2D DP", "*Two linear runs: houses [0, n−2] and [1, n−1]", "Greedy", "Sorting"], "First and last cannot both be robbed."),
    ],
  }),
  T("dsa", "dp-2d", "DP II: grids, strings & two sequences", 1, 45, "LCS, edit distance, palindromes and grid paths.", {
    viz: "dp-lcs",
    signals: ["Two strings/arrays compared or aligned", "Grid with moves in fixed directions", "Palindromic substrings/subsequences", "Pattern matching with wildcards"],
    lesson: `**Two-sequence DP:** \`dp[i][j]\` = answer for prefixes \`a[0..i)\` and \`b[0..j)\`. Transition looks at the last characters.

- **LCS:** match → \`dp[i−1][j−1] + 1\`; else \`max(dp[i−1][j], dp[i][j−1])\`.
- **Edit distance:** match → diagonal; else \`1 + min(insert, delete, replace)\`.
- **Regex / wildcard:** '*' either consumes zero items or one more matching char.
- **Interleaving, distinct subsequences, shortest common supersequence** are all the same table.

**Reconstruction:** walk back from \`dp[m][n]\` following the choice that produced each cell.

**Space:** each row depends on the previous row → two rows or one row plus a saved diagonal.

**Palindromes:** expand around 2n−1 centres (O(n²), O(1) space) or interval DP \`pal[i][j] = s[i]==s[j] && pal[i+1][j−1]\`. Longest palindromic *subsequence* = LCS(s, reverse(s)).

**Grid DP:** unique paths, min path sum, maximal square (\`dp = 1 + min(top, left, diag)\`), dungeon game (fill backwards). If moves go in all four directions it is no longer DP → BFS/Dijkstra.

Draw the table for a 3×3 example in the interview; it both finds the recurrence and serves as your dry run.`,
    template: `vector<vector<int>> dp(m + 1, vector<int>(n + 1, 0));
for (int i = 1; i <= m; ++i)
  for (int j = 1; j <= n; ++j)
    dp[i][j] = a[i-1] == b[j-1] ? dp[i-1][j-1] + 1
                                : max(dp[i-1][j], dp[i][j-1]);`,
    pitfalls: ["Mixing 0-based strings with 1-based dp indices", "Base row/column for empty prefixes (edit distance: dp[i][0] = i)", "Regex '*' applies to the preceding element, not standalone", "Attempting DP on a grid with 4-direction movement"],
    quiz: [
      Q("Longest palindromic subsequence of s equals…", ["Longest palindromic substring", "*LCS(s, reverse(s))", "Edit distance to reverse", "n − 1"], "A classic reduction."),
      Q("Edit distance base case dp[i][0] is…", ["0", "*i (delete i characters)", "1", "∞"], "Transforming a length-i prefix to the empty string takes i deletions."),
      Q("Maximal Square transition when cell is 1:", ["max of three neighbours + 1", "*1 + min(top, left, top-left)", "top + left", "1"], "The square is limited by its weakest neighbour."),
    ],
  }),
  T("dsa", "dp-knapsack", "DP III: knapsack & subset sums", 1, 35, "0/1, unbounded and bounded knapsack; counting vs optimising.", {
    signals: ["Pick items under a capacity / reach a target sum", "Partition into groups with equal or closest sums", "'Number of ways to make amount'"],
    lesson: `**0/1 knapsack:** \`dp[w]\` = best value with capacity w. Iterate items outside, capacity **downwards** so each item is used once.

**Unbounded:** capacity **upwards** (item reusable).

**Counting combinations vs permutations:** coins outer / amount inner counts *combinations* (Coin Change II); amount outer / coins inner counts *ordered sequences* (Combination Sum IV).

**Reductions to subset sum**
- Partition Equal Subset Sum → subset with sum total/2.
- Target Sum (+/−) → subset with sum (total + target)/2.
- Last Stone Weight II → minimise |total − 2·s|.

**Bitset trick:** \`bits |= bits << x\` gives subset-sum reachability in O(n·S/64).

**Two-dimensional capacity:** Ones and Zeroes (\`dp[zeros][ones]\`).

**Difference as state:** Tallest Billboard: \`dp[diff]\` = max shorter side height. A recurring trick when two groups must balance.

**Pseudo-polynomial:** O(n·W) depends on the numeric value of W; if W is 10⁹ and n ≤ 40, use meet-in-the-middle (2^(n/2)).`,
    template: `// 0/1 knapsack, 1D
vector<int> dp(W + 1, 0);
for (int i = 0; i < n; ++i)
  for (int w = W; w >= wt[i]; --w)            // downward: each item once
    dp[w] = max(dp[w], dp[w - wt[i]] + val[i]);`,
    pitfalls: ["Iterating capacity upward in 0/1 knapsack (reuses items)", "Loop order mix-up between combinations and permutations", "Odd total in partition problems", "Ignoring that W may be too large for a table"],
    quiz: [
      Q("In 1D 0/1 knapsack, why iterate capacity downward?", ["Speed", "*So dp[w − wt] still refers to the previous item row", "To avoid overflow", "No reason"], "Upward iteration would let the same item be taken repeatedly."),
      Q("Coin Change II (number of combinations): correct loop order?", ["Amount outer, coins inner", "*Coins outer, amount inner", "Either", "Neither"], "Coins outer fixes an order of coin types, so each multiset is counted once."),
      Q("n = 40 items, weights up to 10⁹, capacity 10⁹.", ["Standard DP table", "Greedy by ratio", "*Meet in the middle", "Bitset"], "2²⁰ subsets per half, then sort + binary search / two pointers."),
    ],
  }),
  T("dsa", "dp-advanced", "DP IV: interval, bitmask, tree, game & digit DP", 2, 50, "The hard-round toolkit: pick the right state shape.", {
    signals: ["Merge/burst/cut ranges, cost depends on the split (interval DP)", "n ≤ 20 with 'assign / visit all' (bitmask DP)", "Tree with choose/not-choose per node (tree DP)", "Two players play optimally (game DP / minimax)", "Count numbers ≤ N with a digit property (digit DP)"],
    lesson: `**Interval DP:** \`dp[i][j]\` over ranges, iterate by length, choose the *last* operation inside (Burst Balloons: the last balloon to burst splits the range cleanly). O(n³).

**Bitmask DP:** \`dp[mask]\` or \`dp[mask][last]\`. TSP: O(2ⁿ·n²). Assignment: the number of set bits tells you which person is next, so \`dp[mask]\` suffices. Iterate submasks with \`for (s = m; s; s = (s−1) & m)\` for O(3ⁿ) total.

**Tree DP:** return a tuple per node, e.g. House Robber III returns (rob, skip). Rerooting handles "answer for every root".

**Game DP:** define \`dp[state]\` = best *score difference* the player to move can force: \`dp[i] = max over moves (gain − dp[next])\`. Win/lose games: a state is winning if some move leads to a losing state. Cyclic games (Cat and Mouse) need retrograde BFS from terminal states.

**Digit DP:** \`f(pos, tight, started, extra)\`; count for [0, N], answer for [L, R] = f(R) − f(L−1).

**Probability / expectation DP:** New 21 Game (sliding window sum over dp), Soup Servings (answer converges to 1 for large n: cap it).

**Classic optimisations:** binary search on monotone transitions (Egg Drop: \`dp[moves][eggs]\` = floors coverable), monotonic deque, prefix sums over dp.`,
    template: `// TSP-style bitmask DP: dp[mask][last]
for (int mask = 1; mask < (1 << n); ++mask)
  for (int last = 0; last < n; ++last) if (mask >> last & 1 && dp[mask][last] < INF)
    for (int nxt = 0; nxt < n; ++nxt) if (!(mask >> nxt & 1))
      dp[mask | 1 << nxt][nxt] = min(dp[mask | 1 << nxt][nxt], dp[mask][last] + d[last][nxt]);`,
    pitfalls: ["Interval DP choosing the first operation instead of the last", "Game DP storing absolute scores for both players instead of the difference", "Digit DP: forgetting leading zeros / the tight flag", "Memoising cyclic game states with plain DFS"],
    quiz: [
      Q("Burst Balloons: what does k represent in dp[i][j] = max(dp[i][k] + dp[k][j] + a[i]·a[k]·a[j])?", ["First balloon burst", "*Last balloon burst in (i, j)", "The largest balloon", "The middle index"], "Choosing the last one keeps the two sides independent."),
      Q("Stone-game DP usually stores…", ["Player 1's total", "*Score difference achievable by the player to move", "Number of stones left", "A boolean only"], "dp = max(gain − dp[next]) handles alternating turns uniformly."),
      Q("Assigning n tasks to n people with minimum cost, n ≤ 20.", ["O(n!) backtracking", "*dp[mask], person index = popcount(mask): O(2ⁿ·n)", "Greedy", "Dijkstra"], "The mask of used tasks determines whose turn it is."),
    ],
  }),
  T("dsa", "greedy", "Greedy", 1, 35, "Local choices with a proof: exchange arguments and 'stays ahead'.", {
    signals: ["Sort by something and sweep", "Earliest deadline / smallest end / largest ratio", "A local choice can be proven never worse (exchange argument)"],
    lesson: `Greedy is only correct with a **reason**. Two standard proofs:
- **Exchange argument:** take an optimal solution that differs from greedy at the first position; swap in the greedy choice without making it worse.
- **Stays ahead:** after every step greedy is at least as good as any other solution.

Always try a quick counter-example before committing; if one exists, it is DP.

**Patterns**
- *Interval scheduling:* sort by **end**, take every compatible interval (max non-overlapping; min arrows).
- *Reachability:* Jump Game: track the farthest reachable index; Jump Game II: BFS levels with (curEnd, farthest).
- *Circular feasibility:* Gas Station: if total ≥ 0 an answer exists; restart after the point where the tank goes negative.
- *Two passes:* Candy: left-to-right then right-to-left constraints.
- *Regret / undo with a heap:* Course Schedule III, IPO: take greedily, replace the worst choice later.
- *Monotonic-stack greedy:* Remove K Digits, Smallest Subsequence of Distinct Characters.
- *Sort by custom comparator:* Largest Number (a+b vs b+a), Queue Reconstruction (tall first, insert by k).

Google interviewers very often ask "why is that correct?": have the one-sentence exchange argument ready.`,
    template: `// max number of non-overlapping intervals
sort(iv.begin(), iv.end(), [](auto& a, auto& b) { return a[1] < b[1]; });
int cnt = 0; long long end = LLONG_MIN;
for (auto& v : iv) if (v[0] >= end) { ++cnt; end = v[1]; }`,
    pitfalls: ["Sorting by start when the proof needs end", "Greedy without a counter-example check (coin change!)", "Comparator that is not a strict weak ordering", "Ties handled inconsistently (touching intervals)"],
    quiz: [
      Q("Maximum number of non-overlapping intervals: sort by…", ["Start time", "*End time", "Length", "Random"], "Finishing earliest leaves the most room; exchange argument."),
      Q("Gas Station: if total gas ≥ total cost, then…", ["There may be no solution", "*A unique valid start exists and one pass finds it", "Any start works", "You need O(n²)"], "When the tank goes negative at i, no start in the failed segment can work; restart at i + 1."),
      Q("Coins {1, 3, 4}, amount 6: greedy gives 4+1+1. What does this show?", ["Greedy is optimal", "*Greedy fails; DP gives 3+3", "No solution exists", "Sorting is wrong"], "A two-line counter-example beats any intuition."),
    ],
  }),
  T("dsa", "intervals", "Intervals & sweep line", 1, 35, "Sort, merge, sweep events, and ordered maps for online booking.", {
    viz: "intervals",
    signals: ["Meetings, bookings, ranges, calendars", "Maximum overlap at any time", "Online insertion of ranges with conflict checks"],
    lesson: `**Overlap test:** \`a.start < b.end && b.start < a.end\` (half-open). Clarify whether touching endpoints overlap.

**Merge:** sort by start; extend the last merged interval while \`start ≤ lastEnd\`.

**Sweep line:** convert each interval to events (+1 at start, −1 at end), sort (ends before starts at equal time for half-open), take a running sum. Gives max concurrency, coverage, skyline changes. With bounded coordinates this becomes a difference array.

**Two-pointer intersection** of two sorted lists: advance the one that ends first.

**Online booking (My Calendar):** ordered map keyed by start; check the predecessor and successor. Double/triple booking → sweep map of deltas or a segment tree.

**Range Module:** ordered map of disjoint intervals; add = merge all overlapped; remove = split.

**Skyline:** events sorted by x; multiset of active heights; record when the max changes.

**Employee Free Time:** merge everything (or k-way merge by start) and report gaps.

At Google this family appears as calendar, CPU scheduling, log-range and memory-allocator stories. The algorithm is easy; the *boundary conventions* are where candidates lose points.`,
    template: `sort(iv.begin(), iv.end());
vector<vector<int>> out;
for (auto& v : iv) {
  if (out.empty() || out.back()[1] < v[0]) out.push_back(v);
  else out.back()[1] = max(out.back()[1], v[1]);
}`,
    pitfalls: ["Closed vs half-open endpoints", "Event tie-breaking order", "Forgetting max() when extending the merged end", "Erasing from an ordered map while iterating incorrectly"],
    quiz: [
      Q("Events at the same timestamp for half-open intervals [s, e): which first?", ["Starts", "*Ends", "Order does not matter", "Sort by id"], "An interval ending at t does not overlap one starting at t."),
      Q("My Calendar I (no double booking) with n bookings: best structure?", ["Array scan O(n) each", "*Ordered map: check neighbours in O(log n)", "Hash map", "Stack"], "Only the predecessor and successor can conflict."),
    ],
  }),
  T("dsa", "bits", "Bit manipulation", 2, 25, "XOR tricks, masks as sets, and per-bit counting.", {
    signals: ["'Every element appears twice except…'", "Subsets of a small set (masks)", "Constraints mention bitwise AND/OR/XOR", "O(1) space with integers"],
    lesson: `**Identities**
- \`x ^ x = 0\`, \`x ^ 0 = x\` → XOR cancels pairs.
- \`x & (x − 1)\` clears the lowest set bit (popcount loop, power-of-two test).
- \`x & −x\` isolates the lowest set bit (Fenwick trees, splitting XOR results).
- Set/clear/test bit i: \`x | 1<<i\`, \`x & ~(1<<i)\`, \`x >> i & 1\`.

**Per-bit thinking:** many problems decompose by bit: count how many numbers have bit b set, combine contributions (Total Hamming Distance, Single Number II via counts mod 3).

**Monotonic bitwise ops:** AND over a growing subarray only loses bits, OR only gains: at most ~31 distinct values per right endpoint → O(31·n) "set of ORs/ANDs" technique.

**Two unique numbers:** XOR all → a ^ b; split by any set bit of that value.

**Add without +:** \`sum = a ^ b\`, \`carry = (a & b) << 1\`, repeat.

**Masks as sets:** union \`|\`, intersection \`&\`, membership test, iterate submasks. Used for BFS state and DP.

**Gotchas:** shifts of signed ints, \`1 << 31\` overflow (use \`1LL\`/\`1u\`), operator precedence (\`==\` binds tighter than \`&\`), Python's unbounded ints.`,
    template: `int single = 0; for (int x : a) single ^= x;       // the unpaired number
int pop = 0; for (unsigned y = x; y; y &= y - 1) ++pop; // popcount`,
    pitfalls: ["a & b == 0 parses as a & (b == 0)", "1 << 40 on a 32-bit int", "Right-shifting negative numbers", "Assuming Python ints wrap at 32 bits"],
    quiz: [
      Q("x & (x − 1) == 0 (x > 0) tests whether x is…", ["Odd", "*A power of two", "Zero", "Negative"], "Clearing the lowest set bit leaves nothing only if exactly one bit is set."),
      Q("Every number appears three times except one. O(1)-space idea?", ["XOR everything", "*Count each bit modulo 3", "Sort", "Hash map"], "Bits of the unique number are the per-bit counts mod 3."),
    ],
  }),
  T("dsa", "math", "Math, number theory & randomness", 2, 30, "GCD, modular arithmetic, fast power, sampling and geometry basics.", {
    signals: ["Answer 'modulo 1e9+7'", "Divisibility, primes, gcd/lcm", "Uniform random choice, shuffling, sampling from a stream", "Points, slopes, rectangles"],
    lesson: `**Number theory:** Euclid \`gcd(a, b) = gcd(b, a mod b)\`; \`lcm = a / gcd · b\`. Sieve of Eratosthenes O(n log log n). Trial division to √n.

**Modular arithmetic:** add/multiply freely with mod; subtraction → add mod; division → multiply by the modular inverse (\`a^(p−2) mod p\` for prime p). Fast power by squaring is O(log n). nCr via factorial tables + inverse factorials.

**Randomness**
- *Fisher–Yates shuffle:* for i from n−1 down, swap with random j ≤ i.
- *Reservoir sampling:* keep the i-th item with probability k/i: uniform sample from a stream of unknown length.
- *Rejection sampling:* Rand10 from Rand7: generate 1..49, reject > 40.
- *Weighted pick:* prefix sums + binary search.
Be ready to **prove uniformity** by induction.

**Geometry:** represent slopes as reduced (dy, dx) pairs with gcd, never floats. Cross product for orientation/collinearity. Rectangle overlap: project on each axis.

**Combinatorics:** Catalan numbers (BSTs, parentheses), stars and bars, pigeonhole arguments ("find the duplicate"), inclusion–exclusion.

**Overflow:** multiply as 64-bit before taking mod; compare products via division or 128-bit when needed.`,
    template: `long long power(long long b, long long e, long long m) {
  long long r = 1; b %= m;
  for (; e; e >>= 1, b = b * b % m) if (e & 1) r = r * b % m;
  return r;
}`,
    pitfalls: ["Float slopes / equality on doubles", "Modulo of negatives", "Overflow before the mod is applied", "Biased shuffles (swapping with any index 0..n−1)", "Pow(x, n) with n = INT_MIN"],
    quiz: [
      Q("Reservoir sampling (k = 1): the i-th element replaces the current pick with probability…", ["1/2", "*1/i", "1/n", "i/n"], "Then each of the first i items is the pick with probability 1/i by induction."),
      Q("Max Points on a Line: how should slopes be keyed?", ["double dy/dx", "*Reduced (dy/g, dx/g) with a sign convention", "atan2 value", "Strings of floats"], "Exact rational keys avoid precision errors."),
    ],
  }),
  T("dsa", "strings", "String algorithms", 2, 35, "KMP, rolling hash, Z-function, and palindromes: pattern matching beyond brute force.", {
    signals: ["Find a pattern in a text in linear time", "Longest prefix that is also a suffix / repeated substring", "Compare many substrings quickly (hashing)", "Longest duplicate / common substring (binary search + hash)"],
    lesson: `**KMP.** The prefix function \`pi[i]\` = length of the longest proper prefix of \`s[0..i]\` that is also its suffix. On mismatch fall back to \`pi[k−1]\` instead of restarting. Text search = prefix function over \`pattern + '#' + text\`. O(n + m).
Uses: strStr, shortest palindrome (\`s + '#' + reverse(s)\`), repeated substring pattern (\`n % (n − pi[n−1]) == 0\`).

**Z-function:** \`z[i]\` = longest common prefix of \`s\` and \`s[i..]\`. Same problems, often simpler reasoning.

**Rolling hash (Rabin–Karp).** \`hash(s[l..r])\` from prefix hashes in O(1). Compare substrings, detect duplicates, combine with **binary search on length** (Longest Duplicate Substring, longest common subarray). Mention collisions: use a large mod, double hashing, or verify on match.

**Palindromes:** expand around centres O(n²); Manacher O(n) (know it exists; rarely required).

**Suffix structures** (suffix array/automaton): awareness only for L4/L5; say "a suffix array would give O(n log n)".

**Practical parsing:** split/trim/encode-decode with length prefixes (\`5#hello\`), string builders to avoid O(n²) concatenation, character counts as 26-arrays.`,
    template: `vector<int> prefixFunction(const string& s) {
  vector<int> pi(s.size());
  for (int i = 1, k = 0; i < (int)s.size(); ++i) {
    while (k && s[i] != s[k]) k = pi[k - 1];
    if (s[i] == s[k]) ++k;
    pi[i] = k;
  }
  return pi;
}`,
    pitfalls: ["Repeated string concatenation in loops (O(n²))", "Hash collisions ignored", "Negative values in rolling hash subtraction", "Delimiter-based encoding when the delimiter can appear in data"],
    quiz: [
      Q("Longest Duplicate Substring in O(n log n) uses…", ["KMP only", "*Binary search on length + rolling hash", "DP O(n²)", "Trie of all suffixes"], "If a duplicate of length L exists, one of length L−1 does too."),
      Q("Encode a list of strings so any characters are allowed. Robust scheme?", ["Join with commas", "*Length prefix: len + '#' + string", "Escape nothing", "Base 10"], "A length prefix makes delimiters in data irrelevant."),
    ],
  }),
  T("dsa", "range-queries", "Range queries: Fenwick, segment tree, sparse table", 2, 40, "Point updates with range queries, and counting inversions-style problems.", {
    signals: ["Interleaved updates and range sum/min/max queries", "'Count of smaller elements after self', inversions", "Max overlapping bookings online with large coordinates"],
    lesson: `| Need | Structure | Update / Query |
|---|---|---|
| Static range sum | Prefix sums | – / O(1) |
| Static range min/max | Sparse table | – / O(1) |
| Point update + range sum | Fenwick (BIT) | O(log n) |
| Range update + range query, min/max, custom merge | Segment tree (+ lazy) | O(log n) |
| Arbitrary-order statistics | Ordered set / merge sort / BIT on ranks | O(log n) |

**Fenwick tree:** \`i += i & −i\` to update, \`i −= i & −i\` to query prefix. 1-indexed. With **coordinate compression** it counts "how many earlier values < x" → inversions, Count of Smaller After Self, Reverse Pairs, LIS counts.

**Segment tree:** node covers a range; merge children. **Lazy propagation** defers range updates. **Dynamic (sparse) segment tree** allocates nodes on demand for coordinates up to 10⁹ (My Calendar III, Range Module, Falling Squares).

**Merge-sort counting** is the no-data-structure alternative for inversion-style problems.

**2D prefix sums:** \`S[r2][c2] − S[r1−1][c2] − S[r2][c1−1] + S[r1−1][c1−1]\`.

Interview strategy: state the simple structure first (prefix sums, ordered map), then upgrade only when updates force it. Writing a correct Fenwick tree takes 10 lines; practise until it is automatic.`,
    template: `struct BIT {
  vector<long long> t; BIT(int n) : t(n + 1) {}
  void add(int i, long long v) { for (++i; i < (int)t.size(); i += i & -i) t[i] += v; }
  long long sum(int i) { long long s = 0; for (++i; i > 0; i -= i & -i) s += t[i]; return s; } // [0, i]
};`,
    pitfalls: ["0-index vs 1-index in Fenwick", "Forgetting coordinate compression", "Lazy tags not pushed before descending", "Segment tree sized 2n instead of 4n in the recursive version"],
    quiz: [
      Q("Count of smaller numbers after self, n = 10⁵.", ["O(n²) scan", "*Traverse right-to-left with a Fenwick tree over compressed values (or merge sort)", "Monotonic stack", "Two pointers"], "Query prefix count of values < x, then insert x."),
      Q("Static array, 10⁶ range-minimum queries.", ["Segment tree", "*Sparse table: O(n log n) build, O(1) query", "Fenwick tree", "Prefix sums"], "Min is idempotent, so overlapping blocks are fine."),
    ],
  }),
  T("dsa", "design-ds", "Data structure design", 1, 40, "Compose hash maps, lists, heaps and trees to meet O(1)/O(log n) contracts.", {
    signals: ["'Design a class that supports … in O(1)'", "Eviction policies, counters over time, random access with deletion"],
    lesson: `These are mini LLD rounds. Grade = API clarity + invariants + complexity + edge cases.

**Composition recipes**
- **LRU cache:** hash map key → node of a doubly linked list ordered by recency. get/put O(1). Sentinels remove edge cases.
- **LFU cache:** key → (value, freq); freq → doubly linked list of keys (LRU order); track \`minFreq\`.
- **Insert/Delete/GetRandom O(1):** array + map value → index; delete by swapping with the last element.
- **All O(1) (inc/dec/getMax/getMin):** doubly linked list of count buckets, each holding a key set.
- **Max Stack:** two stacks for peekMax; popMax needs ordered map + list (or lazy deletion heaps).
- **Time-based KV / Snapshot Array:** per-key sorted versions + binary search.
- **Hit counter / rate limiter:** queue of timestamps, or fixed circular buckets when hits are huge.
- **Median / top-k trackers:** two heaps, ordered sets.
- **Iterator designs:** flatten nested list (stack), peeking iterator, zigzag.

**Always discuss:** capacity 0, duplicate keys, updates of existing keys, thread-safety (one lock vs striped locks), and how the single-machine design becomes a distributed one (LRU → Memcached; hit counter → rate limiter service).`,
    template: `class LRUCache {
  int cap; list<pair<int,int>> dll;                       // front = most recent
  unordered_map<int, list<pair<int,int>>::iterator> pos;
public:
  LRUCache(int c) : cap(c) {}
  int get(int k) {
    auto it = pos.find(k); if (it == pos.end()) return -1;
    dll.splice(dll.begin(), dll, it->second); return it->second->second;
  }
  void put(int k, int v) {
    if (auto it = pos.find(k); it != pos.end()) { it->second->second = v; dll.splice(dll.begin(), dll, it->second); return; }
    if ((int)dll.size() == cap) { pos.erase(dll.back().first); dll.pop_back(); }
    dll.emplace_front(k, v); pos[k] = dll.begin();
  }
};`,
    pitfalls: ["Updating a value without refreshing recency", "Capacity 0", "Invalidated iterators / stale map entries after eviction", "GetRandom with duplicates needs index sets"],
    quiz: [
      Q("Why does an LRU cache need a doubly (not singly) linked list?", ["Faster iteration", "*To unlink an arbitrary node in O(1)", "Less memory", "Sorting"], "Removal needs the predecessor."),
      Q("O(1) delete in RandomizedSet works by…", ["Shifting the array", "*Swapping the element with the last one and popping", "Marking tombstones", "Rehashing"], "Order does not matter, so fill the hole with the tail."),
    ],
  }),
  T("dsa", "matrix", "Matrix manipulation", 3, 20, "In-place transforms, layer traversal and staircase search.", {
    signals: ["Rotate / spiral / zero / diagonal traversal", "Rows and columns both sorted", "Update a grid 'simultaneously' in place"],
    lesson: `- **Rotate 90° clockwise:** transpose, then reverse each row (or rotate four cells per layer).
- **Spiral:** four boundaries (top, bottom, left, right) shrinking; check bounds after each side.
- **Set Matrix Zeroes in O(1) space:** use the first row and column as markers; remember separately whether they themselves need zeroing.
- **Search a 2D matrix II** (rows and columns sorted): start at the top-right corner; each comparison discards a row or a column → O(m + n).
- **Game of Life in place:** encode old and new state in two bits.
- **Diagonals:** cells on one diagonal share \`r − c\`; anti-diagonals share \`r + c\`.
- **K-th smallest in a sorted matrix:** heap (k log n) or binary search on value with staircase counting.

These problems test index discipline: name your boundaries, write the loop invariants, dry-run a 3×4 example.`,
    pitfalls: ["Non-square matrices in spiral/rotate", "Double-visiting the middle row/column in spiral", "Overwriting state you still need"],
    quiz: [
      Q("Search in a row- and column-sorted matrix: where do you start for O(m + n)?", ["Top-left", "*Top-right (or bottom-left)", "Centre", "Anywhere"], "From the top-right, smaller means move left, larger means move down."),
    ],
  }),
  T("dsa", "sorting", "Sorting & selection", 2, 30, "Know the algorithms well enough to adapt them: merge-count, quickselect, buckets.", {
    signals: ["Custom ordering", "k-th element without full sort", "Count pairs (i < j) with a relation (merge sort)", "Bounded key range (counting / bucket / radix)"],
    lesson: `| Algorithm | Time | Space | Stable | Notes |
|---|---|---|---|---|
| Merge sort | O(n log n) | O(n) | yes | linked lists, external sort, counting inversions |
| Quick sort | O(n log n) avg, O(n²) worst | O(log n) | no | random pivot, 3-way for duplicates |
| Heap sort | O(n log n) | O(1) | no | guaranteed bound |
| Counting / radix | O(n + k) | O(n + k) | yes | small integer keys |
| Bucket | O(n) avg | O(n) | – | uniform data; Maximum Gap via pigeonhole |

**Quickselect:** partition, recurse into one side: O(n) average. Mention median-of-medians for worst-case O(n).

**Merge-sort counting:** while merging, count cross pairs (inversions, Reverse Pairs, Count of Range Sum).

**Comparators:** must be a strict weak ordering. Largest Number: \`a + b > b + a\`.

**Library sorts:** C++ introsort (not stable; \`stable_sort\` exists), Java TimSort for objects (stable) and dual-pivot quicksort for primitives, Python TimSort.

**External sorting:** sort chunks that fit in memory, then k-way merge with a heap: the answer whenever "data doesn't fit in RAM".

**Lower bound:** comparison sorting needs Ω(n log n); anything faster exploits key structure.`,
    template: `int quickselect(vector<int>& a, int k) {             // k-th smallest, 0-based
  int lo = 0, hi = a.size() - 1;
  while (true) {
    int p = a[lo + rand() % (hi - lo + 1)], i = lo, j = hi;
    while (i <= j) { while (a[i] < p) ++i; while (a[j] > p) --j; if (i <= j) swap(a[i++], a[j--]); }
    if (k <= j) hi = j; else if (k >= i) lo = i; else return a[k];
  }
}`,
    pitfalls: ["Non-random pivot on sorted input", "Invalid comparator (returns true for equal elements)", "Assuming sort stability", "Forgetting O(n) merge space"],
    quiz: [
      Q("Count pairs i < j with a[i] > 2·a[j], n = 5·10⁴.", ["Two loops", "*Modified merge sort (or BIT)", "Quickselect", "Counting sort"], "Count cross pairs during the merge step when both halves are sorted."),
      Q("Data is 100 GB, RAM is 8 GB. Sort it.", ["Quick sort in memory", "*External merge sort: sorted runs + k-way merge", "Heap sort", "Impossible"], "Classic external sorting."),
    ],
  }),
];

export const problems3: Problem[] = [
  // dp-1d
  P("dp-1d", 198, "House Robber", "M", 1, "Maximum sum of non-adjacent elements.",
    ["Two-variable DP|dp[i] = max(dp[i−1], dp[i−2] + a[i])|O(n)|O(1)"],
    ["Non-negative values? Empty input?"],
    ["Circular street (LC 213)", "Tree of houses (LC 337)", "Taking x forbids x±1 values (Delete and Earn / spell damage LC 3186)", "Return which houses to rob"],
    ["Reconstruct the chosen set."],
    ["For each house: skip it, or take it plus the best up to two back."]),
  P("dp-1d", 322, "Coin Change", "M", 1, "Fewest coins to make an amount, or −1.",
    ["Bottom-up unbounded knapsack|dp[x] = 1 + min dp[x − c]|O(amount·coins)|O(amount)", "BFS on amounts|Levels = coins used|same|same"],
    ["Unlimited coins? Amount 0 → 0?"],
    ["Number of ways (LC 518)", "Limited supply of each coin", "Return the coins used", "Huge amount with small coins (math / greedy on canonical systems)"],
    ["When is greedy correct for coin systems?"],
    ["Think about the last coin used."]),
  P("dp-1d", 139, "Word Break", "M", 1, "Can a string be segmented into dictionary words?",
    ["DP over prefixes|dp[i] = any dp[j] && s[j..i) in dict|O(n²·L) or O(n·maxLen)|O(n)", "Trie + DP|Walk the trie from each reachable start|O(n·maxLen)|O(dict)"],
    ["Reuse of words allowed? Dictionary size and max word length?"],
    ["Return all sentences (LC 140: memoised backtracking, exponential output)", "Minimum number of words / minimum extra characters (LC 2707)", "Concatenated words in the dictionary itself (LC 472)", "Stream of characters"],
    ["Why can naive recursion be exponential?"],
    ["dp[i]: can the first i characters be segmented?"]),
  P("dp-1d", 300, "Longest Increasing Subsequence", "M", 1, "Length of the longest strictly increasing subsequence.",
    ["Patience / tails + binary search|Replace first tail ≥ x|O(n log n)|O(n)", "Quadratic DP|dp[i] = 1 + max dp[j], a[j] < a[i]|O(n²)|O(n)"],
    ["Strict or non-decreasing?"],
    ["Number of LIS (LC 673)", "Russian Doll Envelopes (sort w asc, h desc)", "Longest chain of pairs / strings", "Min removals to make a mountain array", "Divide into k increasing subsequences (Dilworth)"],
    ["Recover an actual LIS with the O(n log n) method (store predecessor indices)."],
    ["Keep, for each length, the smallest possible tail."]),
  P("dp-1d", 53, "Maximum Subarray", "M", 1, "Largest sum of a contiguous subarray.",
    ["Kadane|cur = max(x, cur + x)|O(n)|O(1)", "Divide & conquer|Best of left, right, crossing|O(n log n)|O(log n)"],
    ["All negatives → largest single element? Empty allowed?"],
    ["Circular array (LC 918)", "Maximum product subarray (track min and max)", "At most one deletion (LC 1186)", "2D max-sum rectangle (fix rows + Kadane)", "Return indices"],
    ["Segment tree node that supports this query under updates?"],
    ["Should the best subarray ending here extend the previous one or start fresh?"]),
  P("dp-1d", 1235, "Maximum Profit in Job Scheduling", "H", 1, "Choose non-overlapping jobs with maximum total profit.",
    ["Sort by end + DP + binary search|dp[i] = max(dp[i−1], p[i] + dp[last compatible])|O(n log n)|O(n)", "Sort by start + memo + lower_bound|Top-down over the next compatible job|O(n log n)|O(n)"],
    ["Is end == start of the next job compatible?"],
    ["At most k jobs (LC 1751: extra dimension)", "Two workers", "Unweighted version (greedy by end time)"],
    ["Why does greedy fail once jobs have weights?"],
    ["Take or skip each job; if taken, jump to the latest job that ends before it starts."]),
  P("dp-1d", 91, "Decode Ways", "M", 2, "Count decodings of a digit string where 1→A … 26→Z.",
    ["Linear DP|dp[i] = (one digit valid ? dp[i−1]) + (two digits valid ? dp[i−2])|O(n)|O(1)"],
    ["Leading zeros / invalid input → 0?"],
    ["With '*' wildcards (LC 639)", "Return all decodings"],
    ["Enumerate every zero-related edge case."],
    ["Like climbing stairs, with validity checks."]),

  // dp-2d
  P("dp-2d", 1143, "Longest Common Subsequence", "M", 1, "Length of the LCS of two strings.",
    ["2D DP|Match → diag + 1 else max(up, left)|O(mn)|O(min(m,n))"],
    ["Subsequence vs substring?"],
    ["Print the LCS / shortest common supersequence (LC 1092)", "Min insertions/deletions to convert (LC 583)", "Longest common substring (different recurrence)", "Uncrossed Lines; diff tool (Myers)"],
    ["How does a real diff tool avoid O(mn)?"],
    ["Compare the last characters of the two prefixes."]),
  P("dp-2d", 72, "Edit Distance", "M", 1, "Minimum insert/delete/replace operations to turn one word into another.",
    ["2D DP|Match → diag; else 1 + min(insert, delete, replace)|O(mn)|O(min(m,n))"],
    ["Operation costs equal? Transpositions allowed?"],
    ["Different costs per operation", "One Edit Distance check in O(n)", "Words within distance k of a query in a dictionary (trie + DP row, BK-tree)", "Output the edit script"],
    ["How would spell-check use this at scale?"],
    ["What are the three ways the last characters can be handled?"]),
  P("dp-2d", 5, "Longest Palindromic Substring", "M", 1, "Return the longest palindromic substring.",
    ["Expand around centres|2n − 1 centres|O(n²)|O(1)", "Interval DP|pal[i][j] from pal[i+1][j−1]|O(n²)|O(n²)", "Manacher|Linear with mirror radius|O(n)|O(n)"],
    ["Return any longest? Case and non-alphanumerics?"],
    ["Count palindromic substrings (LC 647)", "Longest palindromic subsequence", "Shortest palindrome by prepending (KMP)", "Min cuts for palindrome partitioning"],
    ["Is O(n) expected? (Usually mention Manacher, implement expand.)"],
    ["A palindrome grows outward from its centre."]),
  P("dp-2d", 10, "Regular Expression Matching", "H", 2, "Match a string against a pattern with '.' and '*'.",
    ["2D DP|'*': zero occurrences dp[i][j−2] or one more dp[i−1][j] if char matches|O(mn)|O(mn)"],
    ["Full match or partial? Is the pattern always valid?"],
    ["Wildcard Matching with '?' and '*' (LC 44)", "Build an NFA and simulate (how real engines work)", "Add '+' or character classes"],
    ["Why can backtracking regex engines be exponential?"],
    ["'x*' either disappears or eats one matching character and stays."]),
  P("dp-2d", 221, "Maximal Square", "M", 2, "Area of the largest square of 1s in a binary matrix.",
    ["DP|side = 1 + min(top, left, diag)|O(mn)|O(n)"],
    ["Return side or area?"],
    ["Largest rectangle (histogram stack per row)", "Count all square submatrices (LC 1277: sum of dp)", "Largest plus sign / square with border of 1s"],
    ["Why min of the three neighbours?"],
    ["A k×k square ending here needs three (k−1)×(k−1) squares around it."]),
  P("dp-2d", 97, "Interleaving String", "M", 2, "Is s3 an interleaving of s1 and s2?",
    ["2D DP|dp[i][j] = (dp[i−1][j] && s1[i−1]==s3[i+j−1]) || (dp[i][j−1] && s2[j−1]==s3[i+j−1])|O(mn)|O(n)"],
    ["Length check first?"],
    ["Count the number of interleavings", "Three source strings"],
    ["Why does a greedy two-pointer merge fail?"],
    ["The position in s3 is determined by i + j."]),
  P("dp-2d", 115, "Distinct Subsequences", "H", 3, "Count distinct subsequences of s equal to t.",
    ["2D DP|dp[i][j] = dp[i−1][j] + (s[i−1]==t[j−1] ? dp[i−1][j−1] : 0)|O(mn)|O(n)"],
    ["Result fits in 64 bits / modulo?"],
    ["Count subsequences matching a pattern with wildcards", "Number of matching subsequences for many words (bucket by next char)"],
    ["Compress to one dimension: which direction must j iterate?"],
    ["Either skip s[i] or use it to match t[j]."]),

  // dp-knapsack
  P("dp-knapsack", 416, "Partition Equal Subset Sum", "M", 1, "Can the array be split into two subsets of equal sum?",
    ["Subset-sum DP (1D, downward)|dp[s] |= dp[s − x]|O(n·S)|O(S)", "Bitset|bits |= bits << x|O(n·S/64)|O(S/64)"],
    ["Positive integers only? Sum bounds?"],
    ["Minimise the difference of two subsets (Last Stone Weight II)", "k equal subsets (bitmask DP / backtracking)", "n ≤ 40 with huge values (meet in the middle, LC 2035)"],
    ["Why is this NP-hard in general yet solvable here?"],
    ["You need a subset summing to total / 2."]),
  P("dp-knapsack", 494, "Target Sum", "M", 1, "Count ways to assign +/− signs so the expression equals target.",
    ["Reduce to subset count|P = (total + target)/2; count subsets|O(n·S)|O(S)", "Memo on (i, sum)|Offset sums|O(n·S)|O(n·S)"],
    ["Zeros in the array (they double the count)?"],
    ["Also allow skipping numbers", "Expression Add Operators (backtracking with * precedence)"],
    ["Derive the reduction algebraically."],
    ["Positives minus negatives = target; positives plus negatives = total."]),
  P("dp-knapsack", 518, "Coin Change II", "M", 1, "Number of combinations of coins that make an amount.",
    ["Unbounded knapsack count|Coins outer, amount inner upward|O(n·amount)|O(amount)"],
    ["Order irrelevant (combinations)?"],
    ["Order matters (Combination Sum IV)", "Each coin at most once", "Number of dice rolls with target sum (LC 1155)"],
    ["Explain why swapping the loops changes the meaning."],
    ["Process one coin type at a time."]),
  P("dp-knapsack", 474, "Ones and Zeroes", "M", 2, "Largest subset of binary strings using at most m zeros and n ones.",
    ["2D 0/1 knapsack|dp[z][o] iterated downward on both|O(L·m·n)|O(m·n)"],
    ["Each string usable once?"],
    ["Profitable Schemes (LC 879: count with two constraints)", "Knapsack with weight and volume"],
    ["Generalise to k resource dimensions: cost?"],
    ["Two capacities instead of one."]),
  P("dp-knapsack", 956, "Tallest Billboard", "H", 3, "Split rods into two disjoint groups of equal sum; maximise that sum.",
    ["DP on difference|dp[diff] = max height of the shorter side|O(n·S)|O(S)", "Meet in the middle|3^(n/2) states per half|O(3^(n/2))|same"],
    ["Rods may be left unused?"],
    ["Minimise the difference instead of requiring zero", "Three equal groups"],
    ["Why is 'difference' a sufficient state?"],
    ["Each rod: left, right or unused. Track only how unbalanced you are."]),

  // dp-advanced
  P("dp-advanced", 312, "Burst Balloons", "H", 2, "Burst balloons to maximise coins, where bursting i earns left·i·right.",
    ["Interval DP on last burst|dp[i][j] = max dp[i][k] + dp[k][j] + a[i]a[k]a[j]|O(n³)|O(n²)"],
    ["Boundary values treated as 1?"],
    ["Min cost to merge stones (LC 1000)", "Matrix chain multiplication / minimum score triangulation", "Min cost to cut a stick (LC 1547)"],
    ["Why does thinking about the first burst fail?"],
    ["After the last balloon in a range bursts, its neighbours are the range's borders."]),
  P("dp-advanced", 337, "House Robber III", "M", 2, "Rob houses arranged in a binary tree without robbing adjacent nodes.",
    ["Tree DP returning (rob, skip)|rob = val + skipL + skipR; skip = max(L) + max(R)|O(n)|O(h)"],
    ["Negative values?"],
    ["Binary Tree Cameras (3 states)", "Max independent set in a tree / weighted vertex cover", "N-ary tree"],
    ["Why would memoising on node alone be slower/clunkier?"],
    ["Return two answers per node."]),
  P("dp-advanced", 1406, "Stone Game III", "H", 2, "Players take 1–3 stones from the front; determine the winner under optimal play.",
    ["Score-difference DP|dp[i] = max over k of sum(i..i+k) − dp[i+k+1]|O(n)|O(1)"],
    ["Values may be negative?"],
    ["Take from both ends (Predict the Winner, interval DP)", "Take up to 2M piles (Stone Game II)", "Nim / Sprague–Grundy for impartial games", "Cyclic positions: Cat and Mouse (retrograde analysis)"],
    ["Why a difference and not two totals?"],
    ["What the opponent gains is what you lose."]),
  P("dp-advanced", 1125, "Smallest Sufficient Team", "H", 2, "Smallest set of people covering all required skills (≤ 16 skills).",
    ["Bitmask DP over skills|dp[mask | person] = min(dp[mask] + 1)|O(2^m · people)|O(2^m)"],
    ["Number of skills small? Any optimal team acceptable?"],
    ["Set cover in general (NP-hard; greedy ln n approximation)", "Weighted people (salary)"],
    ["How do you reconstruct the team compactly?"],
    ["The set of covered skills is the state."]),
  P("dp-advanced", 309, "Best Time to Buy and Sell Stock with Cooldown", "M", 2, "Max profit with unlimited trades and a one-day cooldown after selling.",
    ["State machine DP|hold, sold, rest updated per day|O(n)|O(1)"],
    ["One share at a time? Fees?"],
    ["At most k transactions (LC 188)", "Transaction fee (LC 714)", "One transaction (running min), two transactions (prefix/suffix)"],
    ["Draw the state diagram."],
    ["Each day you are in exactly one of a few states."]),
  P("dp-advanced", 887, "Super Egg Drop", "H", 3, "Minimum moves to find the critical floor with k eggs and n floors.",
    ["Invert the DP|f(m, k) = f(m−1, k−1) + f(m−1, k) + 1; smallest m with f ≥ n|O(k log n)|O(k)", "DP + binary search on drop floor|dp[k][n], monotone in the split|O(k n log n)|O(kn)"],
    ["Eggs reusable if unbroken? Worst-case guarantee?"],
    ["Two eggs, 100 floors (the classic puzzle, answer 14)", "Guess Number Higher or Lower II (cost-weighted)"],
    ["Why is the inverted formulation so much faster?"],
    ["Ask: with m moves and k eggs, how many floors can I distinguish?"]),
  P("dp-advanced", 902, "Numbers At Most N Given Digit Set", "H", 3, "Count positive integers ≤ N formed from a given set of digits.",
    ["Digit DP / combinatorics|Shorter lengths freely; equal length with a tight prefix|O(log N)|O(log N)"],
    ["Digits distinct and non-zero?"],
    ["Count numbers with unique digits / without consecutive ones / with digit sum S", "Range [L, R] (f(R) − f(L−1))"],
    ["Write the generic (pos, tight, started) recursion."],
    ["Walk N's digits left to right, staying 'tight' while you match its prefix."]),

  // greedy
  P("greedy", 55, "Jump Game (I & II)", "M", 1, "Can you reach the last index? What is the minimum number of jumps?",
    ["Farthest reach|Track max reachable; II: BFS layers with curEnd/farthest|O(n)|O(1)"],
    ["Zero-length jumps possible? Is the end always reachable in II?"],
    ["Jump with cost per landing (DP + deque)", "Jump Game III/IV (graph BFS)", "Minimum taps to water a garden / video stitching (same interval cover)"],
    ["Prove the layer greedy for Jump Game II."],
    ["You never need to know how you got somewhere, only how far you can get."]),
  P("greedy", 134, "Gas Station", "M", 1, "Find the start index to complete a circular route, or −1.",
    ["One pass|Reset start when tank < 0; feasible iff total ≥ 0|O(n)|O(1)"],
    ["Is the answer unique when it exists?"],
    ["Minimum initial fuel needed", "Refuel stops with a heap (LC 871)"],
    ["Prove that the failed segment contains no valid start."],
    ["If you run dry at i starting from s, any start between s and i runs dry too."]),
  P("greedy", 763, "Partition Labels", "M", 2, "Split a string into as many parts as possible so each letter appears in one part.",
    ["Last occurrence + extend|Extend the current part to max last index|O(n)|O(26)"],
    ["Lowercase only?"],
    ["Merge Intervals on [first, last] of each char", "Optimal partition with max part size constraint"],
    ["Relate to interval merging."],
    ["A part must reach the last occurrence of every letter it contains."]),
  P("greedy", 135, "Candy", "H", 2, "Minimum candies so each child has ≥ 1 and more than lower-rated neighbours.",
    ["Two passes|Left-to-right then right-to-left with max|O(n)|O(n)", "Slope counting|Track up/down runs|O(n)|O(1)"],
    ["Equal ratings: any constraint?"],
    ["Circular arrangement", "2D grid version (topological order by rating)"],
    ["Why are two independent passes sufficient?"],
    ["Satisfy left-neighbour rules and right-neighbour rules separately, then combine."]),
  P("greedy", 402, "Remove K Digits", "M", 2, "Remove k digits to make the smallest possible number.",
    ["Monotonic stack|Pop larger digits while k remains|O(n)|O(n)"],
    ["Leading zeros? Result empty → '0'?"],
    ["Create Maximum Number from two arrays (LC 321)", "Smallest subsequence of distinct characters (LC 316/1081)", "Most competitive subsequence of length k"],
    ["Why remove the first digit that is larger than its successor?"],
    ["An earlier position matters more than a later one."]),
  P("greedy", 406, "Queue Reconstruction by Height", "M", 3, "Rebuild a queue from (height, number of taller-or-equal people in front).",
    ["Sort tall-first, insert at index k|Shorter people never affect taller ones|O(n²)|O(n)", "Sort short-first + BIT|Find the k-th empty slot with a Fenwick/segment tree|O(n log n)|O(n)"],
    ["Ties in height ordering?"],
    ["Do it in O(n log n)", "Count of smaller numbers before self"],
    ["Why does processing tallest first make insertion positions final?"],
    ["Place the people who are unaffected by others first."]),

  // intervals
  P("intervals", 56, "Merge Intervals", "M", 1, "Merge all overlapping intervals.",
    ["Sort by start + sweep|Extend or append|O(n log n)|O(n)"],
    ["Do [1,4] and [4,5] merge? Input sorted?"],
    ["Insert Interval into a sorted list (O(n), or binary search + splice)", "Intervals arrive as a stream (ordered map; Data Stream as Disjoint Intervals)", "Interval list intersections; remove covered intervals", "Total covered length"],
    ["Can you do it without sorting if coordinates are small?"],
    ["After sorting by start, only the last merged interval can overlap the next one."]),
  P("intervals", 435, "Non-overlapping Intervals", "M", 1, "Minimum removals to make the rest non-overlapping.",
    ["Greedy by end time|Keep earliest-ending compatible intervals|O(n log n)|O(1)"],
    ["Touching endpoints overlap?"],
    ["Minimum arrows to burst balloons (LC 452)", "Weighted version (DP + binary search)", "Maximum events attended with day granularity (heap, LC 1353)"],
    ["Give the exchange argument."],
    ["Maximise what you keep."]),
  P("intervals", 729, "My Calendar I / II / III", "M", 1, "Book events online: reject double (I) or triple (II) bookings; report max concurrency (III).",
    ["Ordered map neighbours (I)|Check prev and next|O(log n)|O(n)", "Delta map sweep (II/III)|+1/−1 then prefix scan|O(n) per booking|O(n)", "Dynamic segment tree with lazy add (III)|Range add, global max|O(log C)|O(n log C)"],
    ["Half-open intervals? Coordinate range?"],
    ["Meeting scheduler across many rooms; find earliest free slot of length d", "Cancel a booking", "Recurring events"],
    ["How does this evolve into a calendar system design?"],
    ["Only the neighbours in sorted order can conflict."]),
  P("intervals", 759, "Employee Free Time", "H", 2, "Common free intervals across all employees' sorted schedules.",
    ["Flatten, sort, merge|Report gaps between merged busy intervals|O(N log N)|O(N)", "K-way merge with heap|Use per-employee sortedness|O(N log k)|O(k)"],
    ["Infinite ends excluded? Zero-length gaps?"],
    ["Free time for at least k of n employees (sweep with counter)", "Find a meeting slot of duration d within working hours"],
    ["Use the fact that each list is already sorted."],
    ["Free time = gaps in the union of all busy intervals."]),
  P("intervals", 218, "The Skyline Problem", "H", 2, "Output the outline formed by rectangular buildings.",
    ["Sweep + multiset of heights|Events sorted by x; emit when max changes|O(n log n)|O(n)", "Divide & conquer merge|Merge two skylines like merge sort|O(n log n)|O(n)"],
    ["Tie-breaking of events at the same x?"],
    ["Area of the union of rectangles (LC 850)", "Falling Squares", "Perimeter of the union"],
    ["Get the event ordering exactly right: starts before ends at equal x, taller starts first."],
    ["The outline changes only at building edges."]),
  P("intervals", 715, "Range Module", "H", 3, "Track ranges with addRange, removeRange, queryRange.",
    ["Ordered map of disjoint intervals|Merge on add, split on remove|O(log n) amortised|O(n)", "Dynamic segment tree|Range assign + range all-covered query|O(log C)|O(n log C)"],
    ["Half-open ranges? Coordinate limits?"],
    ["Memory allocator free-list (malloc/free with coalescing)", "IP range allow/deny lists"],
    ["Amortised analysis of the map approach."],
    ["Keep stored intervals disjoint and sorted at all times."]),

  // bits
  P("bits", 136, "Single Number (I, II, III)", "E", 2, "Find the element(s) that do not appear in pairs/triples.",
    ["XOR all (I)|Pairs cancel|O(n)|O(1)", "Bit counts mod 3 (II)|Per-bit sum|O(32n)|O(1)", "XOR + split by low bit (III)|Partition into two groups|O(n)|O(1)"],
    ["Exactly one unique? Negative numbers?"],
    ["Missing number in 0..n (XOR or sum)", "Find the duplicate and the missing (LC 645)"],
    ["Why does splitting by a set bit separate the two uniques?"],
    ["x ^ x = 0."]),
  P("bits", 338, "Counting Bits", "E", 2, "Number of 1 bits for every i in 0..n.",
    ["DP on bits|bits[i] = bits[i >> 1] + (i & 1)|O(n)|O(n)"],
    ["Built-in popcount allowed?"],
    ["Total set bits from 1 to n in O(log n)", "Hamming distance; total Hamming distance of all pairs"],
    ["Give two different recurrences."],
    ["Drop the last bit: you have seen that number already."]),
  P("bits", 371, "Sum of Two Integers", "M", 3, "Add two integers without + or −.",
    ["XOR and carry loop|sum = a ^ b; carry = (a & b) << 1|O(32)|O(1)"],
    ["Negative numbers? Fixed 32-bit width?"],
    ["Subtract, multiply, divide without operators (LC 29)"],
    ["Why does the loop terminate?"],
    ["XOR adds without carrying; AND finds the carries."]),
  P("bits", 201, "Bitwise AND of Numbers Range", "M", 3, "AND of all numbers in [left, right].",
    ["Common prefix|Shift both right until equal, shift back|O(32)|O(1)"],
    ["Non-negative range?"],
    ["Subarrays with bitwise OR/AND equal to k (≤ 31 distinct values per endpoint)", "Maximum AND/XOR of a pair"],
    ["Why does any differing bit zero everything below it?"],
    ["Only the shared high-bit prefix survives."]),

  // math
  P("math", 50, "Pow(x, n)", "M", 2, "Compute xⁿ for a double x and integer n.",
    ["Fast exponentiation|Square the base, halve the exponent|O(log n)|O(1)"],
    ["n negative? n = INT_MIN? Precision expectations?"],
    ["Modular exponentiation; super pow (LC 372)", "Matrix exponentiation for Fibonacci in O(log n)", "Integer sqrt (binary search / Newton)"],
    ["How do you handle n = −2³¹ safely?"],
    ["x¹⁰ = (x⁵)²."]),
  P("math", 398, "Random Pick Index / Linked List Random Node", "M", 2, "Pick uniformly at random from a stream or list of unknown length.",
    ["Reservoir sampling|Replace with probability 1/i|O(n) per pick|O(1)", "Precompute index lists|Map value → indices|O(1) pick|O(n)"],
    ["Is the length known? Many picks or few?"],
    ["Pick k items (reservoir of size k)", "Weighted reservoir sampling", "Random pick with blacklist (LC 710)", "Shuffle an array (Fisher–Yates)"],
    ["Prove each element is chosen with probability 1/n."],
    ["Decide about each element as it streams past."]),
  P("math", 470, "Implement Rand10() Using Rand7()", "M", 3, "Build a uniform 1..10 generator from a uniform 1..7 generator.",
    ["Rejection sampling|(rand7−1)·7 + rand7 ∈ 1..49; reject > 40|O(1) expected|O(1)"],
    ["Minimise expected calls?"],
    ["RandN from RandM in general", "Unbiased coin from a biased coin (von Neumann)"],
    ["Expected number of rand7 calls?"],
    ["Make a bigger uniform range first, then throw away the excess."]),
  P("math", 149, "Max Points on a Line", "H", 2, "Maximum number of points lying on one straight line.",
    ["Slope map per anchor|Reduced (dy, dx) via gcd; count duplicates|O(n²)|O(n)"],
    ["Duplicate points? Coordinate bounds?"],
    ["Count lines through ≥ k points", "Minimum lines to cover all points (bitmask DP, small n)", "Check whether points are symmetric about a vertical line"],
    ["Why not use doubles for the slope?"],
    ["Fix one point; all others on a line through it share a slope."]),
  P("math", 204, "Count Primes", "M", 3, "Count primes less than n.",
    ["Sieve of Eratosthenes|Cross out multiples from i²|O(n log log n)|O(n)"],
    ["n up to 5·10⁶?"],
    ["Smallest prime factor sieve for fast factorisation", "Segmented sieve for a range [L, R]", "GCD-connected components (DSU on prime factors, LC 952)"],
    ["Why start crossing out at i²?"],
    ["Composite numbers have a factor ≤ √n."]),

  // strings
  P("strings", 28, "Find the Index of the First Occurrence (strStr)", "E", 2, "Find a pattern inside a text.",
    ["KMP|Prefix function; never move the text pointer back|O(n + m)|O(m)", "Rabin–Karp|Rolling hash + verify|O(n + m) expected|O(1)", "Brute force|Compare at each offset|O(nm)|O(1)"],
    ["Empty pattern? Alphabet size?"],
    ["Find all occurrences; count overlapping matches", "Multiple patterns (Aho–Corasick awareness)", "Repeated Substring Pattern; Rotate String"],
    ["Build the prefix table by hand for 'aabaaab'."],
    ["After a mismatch you already know part of the text: reuse it."]),
  P("strings", 1044, "Longest Duplicate Substring", "H", 2, "Longest substring occurring at least twice.",
    ["Binary search on length + rolling hash|Check duplicates of length L with a hash set|O(n log n)|O(n)", "Suffix array + LCP|Max adjacent LCP|O(n log n)|O(n)"],
    ["Overlapping occurrences allowed?"],
    ["Longest repeating non-overlapping substring", "Longest common substring of two strings", "Repeated DNA sequences (fixed L)"],
    ["How do you handle hash collisions?"],
    ["If length L works, every shorter length works."]),
  P("strings", 214, "Shortest Palindrome", "H", 3, "Shortest palindrome formed by adding characters in front.",
    ["KMP on s + '#' + reverse(s)|Longest palindromic prefix = last pi value|O(n)|O(n)", "Rolling hash|Compare forward and backward prefix hashes|O(n)|O(1)"],
    ["Append at the front only?"],
    ["Add at the end instead", "Min insertions anywhere to make a palindrome (LPS DP)"],
    ["Why is the separator needed?"],
    ["Find the longest prefix that is already a palindrome."]),
  P("strings", 271, "Encode and Decode Strings", "M", 2, "Serialise a list of arbitrary strings into one string and back.",
    ["Length-prefix framing|len + '#' + payload|O(n)|O(n)", "Escaping|Escape the delimiter and the escape char|O(n)|O(n)"],
    ["Any characters, including the delimiter and digits?"],
    ["Binary-safe network framing (length as 4 bytes)", "Run-length String Compression (LC 443)", "Streaming decode with partial chunks"],
    ["How does this relate to TCP message framing / protobuf varints?"],
    ["Tell the decoder exactly how many characters to read next."]),
  P("strings", 68, "Text Justification", "H", 2, "Fully justify words into lines of a fixed width.",
    ["Greedy line packing + space distribution|Extra spaces go left-first; last line left-justified|O(total chars)|O(width)"],
    ["Single-word lines? Last line rule? Word longer than width?"],
    ["Minimise raggedness (DP, like TeX)", "Sentence Screen Fitting (LC 418)"],
    ["Enumerate all edge cases before coding."],
    ["Split into: choose the words for a line, then format the line."]),

  // range-queries
  P("range-queries", 307, "Range Sum Query – Mutable", "M", 2, "Support point updates and range-sum queries.",
    ["Fenwick tree|Prefix sums with lowbit jumps|O(log n)|O(n)", "Segment tree|Sum per node|O(log n)|O(n)", "Sqrt decomposition|Block sums|O(√n)|O(n)"],
    ["Ratio of updates to queries?"],
    ["Range update + range sum (two BITs or lazy segment tree)", "2D mutable (LC 308)", "Range min instead of sum"],
    ["Why can a Fenwick tree not answer range-min easily?"],
    ["Each index is responsible for a block of size lowbit(i)."]),
  P("range-queries", 315, "Count of Smaller Numbers After Self", "H", 2, "For each element, count smaller elements to its right.",
    ["BIT over compressed values, right to left|Query prefix, then insert|O(n log n)|O(n)", "Merge sort with index tracking|Count right elements that jump ahead|O(n log n)|O(n)"],
    ["Strictly smaller? Value range?"],
    ["Count inversions; Reverse Pairs (LC 493)", "Count of Range Sum (LC 327)", "Create Sorted Array through Instructions (LC 1649)"],
    ["Implement both and compare."],
    ["Process from the right and ask: how many values less than x have I inserted?"]),
  P("range-queries", 304, "Range Sum Query 2D – Immutable", "M", 2, "Sum of any sub-rectangle with O(1) queries.",
    ["2D prefix sums|Inclusion–exclusion on four corners|O(1) query|O(mn)"],
    ["Updates expected later?"],
    ["Max sum rectangle ≤ k (LC 363)", "Count submatrices summing to target (LC 1074)", "Matrix block sum"],
    ["Write the four-term formula without off-by-one errors."],
    ["Pad the prefix table with a zero row and column."]),
  P("range-queries", 699, "Falling Squares", "H", 3, "Report the tallest stack height after each square is dropped.",
    ["Compression + segment tree|Range max query and range assign over compressed coordinates|O(n log n)|O(n)", "O(n²) interval scan|Compare with all earlier squares|O(n²)|O(n)"],
    ["Do squares touching at edges stack?"],
    ["Rectangle union area", "Tetris-like simulation"],
    ["When is the simple O(n²) acceptable?"],
    ["A new square lands on the max height within its footprint."]),

  // design-ds
  P("design-ds", 146, "LRU Cache", "M", 1, "Design a cache with O(1) get/put that evicts the least recently used key.",
    ["Hash map + doubly linked list|Map to node; move to front on access; evict tail|O(1)|O(capacity)"],
    ["Does get count as a use? Capacity ≥ 1? Thread safety?"],
    ["Add TTL per entry", "Thread-safe version (single lock, striped locks, read-write trade-offs)", "LFU (LC 460) or LRU-K", "Distributed cache: consistent hashing, replication (bridge to HLD)"],
    ["Why not an ordered map by timestamp? (O(log n))", "How would you test it?"],
    ["You need O(1) lookup and O(1) reordering: no single structure gives both."]),
  P("design-ds", 460, "LFU Cache", "H", 2, "O(1) cache evicting the least frequently used key (ties → least recent).",
    ["Key map + frequency → LRU list + minFreq|Move key between frequency lists on access|O(1)|O(capacity)"],
    ["Tie-breaking rule? New key's frequency starts at 1?"],
    ["Frequency decay over time (aging)", "Approximate LFU (TinyLFU with Count-Min Sketch)"],
    ["When does minFreq change?"],
    ["Group keys by frequency; each group is its own LRU list."]),
  P("design-ds", 380, "Insert Delete GetRandom O(1)", "M", 1, "Set supporting insert, remove and uniform random element in O(1).",
    ["Array + value→index map|Swap with last on delete|O(1)|O(n)"],
    ["Duplicates allowed (LC 381)?"],
    ["With duplicates (map value → set of indices)", "Weighted random", "Random pick with blacklist"],
    ["Why is a hash set alone insufficient?"],
    ["Random access needs contiguous storage."]),
  P("design-ds", 362, "Design Hit Counter", "M", 1, "Count hits in the past 300 seconds.",
    ["Queue of timestamps|Pop expired on query|O(1) amortised|O(hits)", "Circular buffer of 300 buckets|(timestamp, count) per second|O(300)|O(300)"],
    ["Are timestamps monotonic? Hits per second scale? Concurrency?"],
    ["Millions of hits per second (bucket counts, not individual hits)", "Out-of-order timestamps", "Distributed counter across servers (bridge to rate limiter / metrics HLD)", "Arbitrary window sizes"],
    ["How would you make it thread-safe and lock-light?"],
    ["Granularity is one second, so you never need more than 300 numbers."]),
  P("design-ds", 981, "Time Based Key-Value Store", "M", 2, "set(key, value, t) and get(key, t) returning the latest value at or before t.",
    ["Map key → sorted list + binary search|Timestamps arrive increasing|O(log n) get|O(n)"],
    ["Are set timestamps strictly increasing per key?"],
    ["Out-of-order writes (ordered map)", "Delete / range scans / TTL", "MVCC in databases works exactly like this"],
    ["How does this relate to snapshot isolation?"],
    ["For each key, keep the history sorted by time."]),
  P("design-ds", 432, "All O(1) Data Structure", "H", 3, "inc/dec keys and return a key with max / min count, all in O(1).",
    ["Doubly linked list of count buckets + key → bucket map|Move key to adjacent bucket|O(1)|O(n)"],
    ["Decrementing to zero removes the key?"],
    ["Top-k keys", "Leaderboard with arbitrary score changes (ordered set / skip list)"],
    ["Why are buckets always adjacent in count order?"],
    ["Counts change by exactly one, so a key only ever moves to a neighbouring bucket."]),
  P("design-ds", 716, "Max Stack", "H", 3, "Stack supporting push, pop, top, peekMax and popMax.",
    ["Doubly linked list + ordered map value → nodes|popMax via map|O(log n)|O(n)", "Two heaps/stacks with lazy deletion by id|Mark removed ids|O(log n) amortised|O(n)"],
    ["popMax ties: remove the top-most?"],
    ["Min stack with O(1) getMin (LC 155)", "Max queue (monotonic deque)"],
    ["Why can't two plain stacks give O(log n) popMax?"],
    ["Removing from the middle needs a linked structure plus an index."]),

  // matrix
  P("matrix", 54, "Spiral Matrix", "M", 3, "Return all elements of a matrix in spiral order.",
    ["Shrinking boundaries|top/bottom/left/right|O(mn)|O(1)"],
    ["Non-square? Empty?"],
    ["Generate a spiral matrix (LC 59)", "Spiral from a given start cell (LC 885)", "Diagonal / zigzag traversal"],
    ["Which two checks prevent double-visiting a single remaining row/column?"],
    ["Walk the four sides, then shrink."]),
  P("matrix", 48, "Rotate Image", "M", 3, "Rotate an n×n matrix 90° clockwise in place.",
    ["Transpose + reverse rows|Two simple passes|O(n²)|O(1)", "Four-way layer swap|Cycle four cells|O(n²)|O(1)"],
    ["In place required? Square only?"],
    ["Rotate counter-clockwise / 180°", "Rotate a non-square matrix (needs new storage)", "Determine whether one matrix is a rotation of another"],
    ["Derive where (r, c) goes."],
    ["(r, c) → (c, n − 1 − r)."]),
  P("matrix", 240, "Search a 2D Matrix II", "M", 2, "Search a matrix whose rows and columns are sorted.",
    ["Staircase from top-right|Discard a row or column per step|O(m + n)|O(1)", "Binary search per row|Search each row independently|O(m log n)|O(1)"],
    ["Is each row's first element larger than the previous row's last (then it is LC 74)?"],
    ["K-th smallest in a sorted matrix (LC 378)", "Count negatives / count elements ≤ x"],
    ["Why can't simple 2D binary search discard three quadrants?"],
    ["Stand where one direction increases and the other decreases."]),
  P("matrix", 73, "Set Matrix Zeroes", "M", 3, "If a cell is 0, zero its entire row and column, in place.",
    ["First row/column as markers|Two flags for the first row and column themselves|O(mn)|O(1)"],
    ["O(1) extra space required?"],
    ["Game of Life in place (LC 289)", "Lonely pixels / battleship counting"],
    ["In which order must you apply the markers?"],
    ["Use the matrix itself as the bookkeeping space."]),

  // sorting
  P("sorting", 912, "Sort an Array (implement a sort)", "M", 2, "Implement an O(n log n) sort without library calls.",
    ["Merge sort|Divide, merge with a buffer|O(n log n)|O(n)", "Quick sort (random pivot, 3-way)|In place|O(n log n) avg|O(log n)", "Heap sort|Build heap, extract|O(n log n)|O(1)"],
    ["Stability needed? Value range small (counting sort)?"],
    ["Sort a linked list (LC 148)", "Sort nearly sorted (k-sorted) array with a heap", "Sort 1 TB of integers (external sort)", "Pancake sort / wiggle sort"],
    ["Which would you choose for production and why?"],
    ["Know one stable and one in-place algorithm cold."]),
  P("sorting", 493, "Reverse Pairs", "H", 2, "Count pairs i < j with nums[i] > 2·nums[j].",
    ["Merge sort counting|Two-pointer count before merging|O(n log n)|O(n)", "BIT over compressed values|Query then insert|O(n log n)|O(n)"],
    ["Overflow of 2·nums[j]?"],
    ["Count inversions", "Count of range sums (LC 327)"],
    ["Why count before merging rather than during?"],
    ["Both halves are sorted: the counting pointer never moves back."]),
  P("sorting", 179, "Largest Number", "M", 2, "Arrange numbers to form the largest concatenated number.",
    ["Custom comparator|a before b if a+b > b+a|O(n log n · L)|O(n)"],
    ["All zeros → '0'?"],
    ["Smallest number instead", "Prove the comparator is transitive"],
    ["Why is this ordering a valid total order?"],
    ["Compare the two possible concatenations."]),
  P("sorting", 164, "Maximum Gap", "M", 3, "Maximum difference between successive elements in sorted order, in linear time.",
    ["Bucket sort + pigeonhole|Bucket size ≥ (max−min)/(n−1); answer spans buckets|O(n)|O(n)", "Radix sort|Then scan|O(d·n)|O(n)"],
    ["Linear time required? Non-negative values?"],
    ["Top K frequent via buckets", "H-Index with counting"],
    ["Why can the answer never be inside one bucket?"],
    ["With n − 1 gaps covering the range, the largest gap is at least the average."]),
];
