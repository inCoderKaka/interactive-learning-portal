import { md } from "@/content/ai/md";
import { Q } from "@/content/h";
import { S, type Deep } from "../types";

/** Backtracking, traversal, topological sort, union-find and shortest paths. */
export const graphsCore: Record<string, Deep> = {
  // ─────────────── backtracking ───────────────
  "subsets-combinations": {
    blurb: "Enumerate choices with a recursion tree: choose, explore, un-choose. Subsets, combinations and combination sums, with the duplicate-handling and pruning rules that keep them correct and fast.",
    signals: ["\"All subsets / combinations / ways\" with small n", "Choose k of n, sum to target", "Generate all valid strings (parentheses, IP addresses)"],
    widgets: ["subsets"],
    lesson: md`
## What backtracking is

Backtracking enumerates candidates by building them one choice at a time and abandoning a partial candidate ("backtracking") as soon as it cannot lead to a valid answer. It is a depth-first search over a **decision tree**: the root is the empty choice, each edge adds one element, and each node is a partial solution. Three things define every backtracking algorithm:

1. **The state**: the partial solution (the path) plus whatever bookkeeping makes checks cheap (a running sum, a used set).
2. **The choices** at each node, and the order in which they are tried.
3. **The goal and the pruning**: when a node is a complete answer, and when it cannot possibly lead to one.

## The template

\`\`\`python
def backtrack(start, path):
    record(path)                       # for subsets: every node is an answer
    for i in range(start, n):
        if should_skip(i): continue
        path.append(a[i])              # choose
        backtrack(i + 1, path)         # explore (i, not i + 1, if reuse is allowed)
        path.pop()                     # un-choose
\`\`\`

The recursion tree has one node per partial choice. **start** prevents generating the same set in different orders: elements are added only in increasing index order, so {a, b} is built as a then b, never b then a. That one parameter is the difference between combinations (order ignored) and permutations (order matters).

[[widget:subsets]]

**Choose / explore / un-choose.** The path is shared by all calls, so every change must be undone after the recursive call returns. Forgetting the pop is the classic bug; recording path itself instead of a copy is the second (all recorded entries then point at the same list, which ends empty).

## Subsets (LC 78)

Every node of the tree is a valid subset, so record at every node. There are 2ⁿ subsets, each copied when recorded: **O(n · 2ⁿ)** time, O(n) extra space beyond the output.

Dry run for [1, 2, 3]: [], [1], [1,2], [1,2,3], [1,3], [2], [2,3], [3]. The order is a pre-order walk of the tree.

Equivalent formulations:

- **Include/exclude**: at depth i decide whether a[i] is in or out: a full binary tree of depth n whose leaves are the subsets.
- **Bitmasks**: for mask in 0..2ⁿ − 1, element i is in the subset iff bit i is set. Simple and iterative.
- **Cascading**: start with [[]]; for each x, append x to a copy of every subset so far.

## Duplicates (LC 90, 40)

With repeated values, [1, 2, 2] would produce [1, 2] twice (choosing either 2). Sort first, then at each level skip a[i] if **i > start** and a[i] == a[i − 1]. The condition says: at this depth, a value equal to the one just tried has already been explored as "the next element", so trying it again would only repeat that whole subtree. Using i > 0 instead of i > start would wrongly forbid [2, 2], because the second 2 at the next depth (i = start) is a different decision.

This prunes duplicate branches at the source, which is far better than generating everything and deduplicating with a set.

## Combinations and sums

- **Combinations** (LC 77): choose k of 1..n. Record when len(path) == k. Prune when not enough elements remain: if n − i + 1 < k − len(path), stop the loop. There are C(n, k) leaves; O(k · C(n, k)).
- **Combination Sum** (LC 39): reuse allowed, so recurse with **i** (the same element may be picked again), not i + 1. Sort and break the loop as soon as a[i] exceeds the remaining target (all later values are larger).
- **Combination Sum II** (LC 40): each element once, duplicates present → sort, the duplicate skip, recurse with i + 1.
- **Combination Sum III** (LC 216): k numbers from 1..9 summing to n; prune by both count and sum.
- **Letter Combinations of a Phone Number** (LC 17): one level per digit, 3–4 choices each; O(4ⁿ · n).
- **Generate Parentheses** (LC 22): choices '(' or ')'. Add '(' while open < n; add ')' while close < open. Every leaf is valid by construction; the count is the Catalan number C(n) = C(2n, n)/(n + 1), about 4ⁿ / (n^1.5 √π).
- **Restore IP Addresses** (LC 93): exactly four segments of 1–3 digits, each ≤ 255 with no leading zero; prune when the remaining length cannot fit the remaining segments (between 1 and 3 digits each).
- **Factor Combinations** (LC 254): factors in non-decreasing order, starting each level at the previous factor (the "start" idea on values).

\`\`\`python
def combination_sum(cands, target):
    cands.sort(); out = []
    def go(start, rem, path):
        if rem == 0: out.append(path[:]); return
        for i in range(start, len(cands)):
            if cands[i] > rem: break           # sorted: nothing later fits
            path.append(cands[i])
            go(i, rem - cands[i], path)        # i: reuse allowed
            path.pop()
    go(0, target, [])
    return out
\`\`\`

## Complexity talk

State it in terms of the output: subsets O(n · 2ⁿ), combinations O(k · C(n, k)), permutations O(n · n!). Pruning improves practice but rarely the worst case; say what it cuts ("sorting lets me break as soon as the candidate exceeds the remaining target"). Space is O(depth) for the recursion and path, plus the output.

## Backtracking vs DP

If the question asks for the **number** of ways or the **best** value and subproblems overlap, DP (often a knapsack) is exponentially faster: Combination Sum IV counts orderings with a DP over amounts. If it asks to **list** all solutions, the output size forces exponential time and backtracking is right. Memoising a backtracking function on its arguments turns it into DP exactly when the arguments repeat.

## Interview angles

- Draw the first two levels of the decision tree; it makes "start", the skip rule and pruning obvious.
- State the copy-on-record and the un-choose step explicitly.
- Expect follow-ups: "now with duplicates", "now each number at most once", "now only count them".

## Connections

Permutations differ only in ignoring "start" and tracking used elements. N-Queens and Sudoku add constraint checks; grid search adds visited marking; partitioning chooses segment ends instead of elements.
`,
    doubts: [
      ["Why does 'i > start' (not i > 0) appear in the duplicate skip?", "At a given recursion level, the first copy of a value must be allowed; only later copies at the same level are duplicates. i > start means 'not the first candidate at this level'. Using i > 0 would forbid using equal values in the same combination at different depths, e.g. [1, 1]."],
      ["Combination Sum: recurse with i or i + 1?", "With i when an element may be reused (LC 39), with i + 1 when each element is used at most once (LC 40)."],
      ["Why copy the path when recording?", "path is mutated as recursion continues. Appending the same list object would leave every recorded answer pointing to the final (empty) path."],
      ["How many valid parentheses strings of n pairs exist?", "The n-th Catalan number, C(n) = (2n choose n)/(n + 1), about 4ⁿ/(n^1.5 √π)."],
      ["Is it better to record subsets at every node or only at the leaves of the include/exclude tree?", "Both give all 2ⁿ subsets. The loop template records at every node (each node is a distinct subset), while the include/exclude tree records only at depth n. The loop version has fewer nodes (2ⁿ versus 2ⁿ⁺¹ − 1), but the difference is a constant factor."],
      ["How do I generate combinations in lexicographic order without recursion?", "Keep an index array c[0..k − 1] = 0..k − 1. To advance, find the rightmost position i with c[i] < n − k + i, increment it, and set every later position to the previous value plus one. Stop when no such position exists."],
      ["Why sort before Combination Sum if the output does not need to be sorted?", "Sorting enables the early break (once a candidate exceeds the remainder, every later one does too) and makes the duplicate skip possible in Combination Sum II. Without sorting you must check every candidate at every level."],
    ],
    revise: md`
? Template steps? :: Choose, explore, un-choose; loop from start to avoid reordered duplicates.
? Subsets complexity? :: O(n · 2ⁿ).
? Skip duplicates rule? :: Sort; skip if i > start and a[i] == a[i−1].
? Reuse allowed? :: Recurse with i instead of i + 1.
? Prune in Combination Sum? :: Sort and break when a[i] > remaining.
? Generate Parentheses rules? :: '(' if open < n; ')' if close < open.
? List vs count? :: Listing → backtracking; counting/optimising with overlap → DP.
? Why i > start (not i > 0) in the duplicate skip? :: Only skip equal values at the same depth; the next depth may legitimately reuse an equal value.
? Prune in Combinations (LC 77)? :: Stop when n − i + 1 < k − len(path).
? Restore IP pruning? :: Remaining length must fit remaining segments (1–3 digits each); no leading zeros, ≤ 255.
? Catalan asymptotics? :: About 4ⁿ / (n^1.5·√π).
`,
    pitfalls: ["Appending path without copying", "i > 0 instead of i > start in the skip rule", "Forgetting to pop after recursion", "Generating then deduplicating with a set (slow and inelegant)"],
    quiz: [
      Q("Subsets of [1,2,2] without duplicates: count?", ["8", "*6", "4", "7"], "[], [1], [2], [1,2], [2,2], [1,2,2]."),
      Q("Combination Sum (reuse allowed) recurses with…", ["i + 1", "*i", "0", "start + 1"], "The same element may be taken again."),
    ],
    sources: [S.book("Algorithms, chapter 2: Backtracking", "Jeff Erickson", "https://jeffe.cs.illinois.edu/teaching/algorithms/book/02-backtracking.pdf"), S.article("Catalan number", "Wikipedia", "https://en.wikipedia.org/wiki/Catalan_number"), S.article("Generating all subsets / combinations", "cp-algorithms", "https://cp-algorithms.com/combinatorics/generating_combinations.html")],
    problems: [78, 90, 77, 39, 40, 216, 17, 22, 93],
  },
  permutations: {
    blurb: "Arrange all elements: used-flags or in-place swapping, duplicate handling with a sorted skip rule, and next_permutation for lexicographic order without recursion.",
    signals: ["All orderings of a small set (n ≤ 8–10)", "Permutations with duplicates", "Next lexicographic arrangement", "k-th permutation"],
    lesson: md`
## The problem

A permutation is an ordering of all n elements: n! of them for distinct elements. Generating them is backtracking where every unused element is a choice at every depth; there is no "start" index, because order matters.

## Two ways to generate

**Used flags**: at each depth, try every element not yet used; mark it, recurse, unmark it.

\`\`\`python
def permute(a):
    out, path, used = [], [], [False] * len(a)
    def go():
        if len(path) == len(a): out.append(path[:]); return
        for i, x in enumerate(a):
            if used[i]: continue
            used[i] = True; path.append(x)
            go()
            path.pop(); used[i] = False
    go()
    return out
\`\`\`

If the input is sorted, the output is in lexicographic order.

**In-place swapping**: at depth d, swap a[d] with each a[i] for i ≥ d, recurse on d + 1, swap back. The prefix a[0..d − 1] is the current partial permutation and the suffix holds the unused elements. No extra array, but the output is not in lexicographic order.

Both make n! leaves and copy n elements at each: **O(n · n!)** time. The number of internal nodes is n!/(n−1)! + n!/(n−2)! + … < e · n!, so the leaves dominate.

**Heap's algorithm** generates each permutation from the previous one by a single swap (useful when the consumer processes permutations incrementally).

## Duplicates (LC 47)

With repeated values, [1, 1, 2] has 3!/2! = 3 distinct permutations. Sort, and with used flags skip a[i] if i > 0, a[i] == a[i − 1] and **a[i − 1] is not used**.

Why that condition: among equal values, force them to be placed in their original order. If a[i − 1] (an equal value to its left) is not used yet, placing a[i] now would put the later copy before the earlier one, which is just a relabelling of a permutation that will be (or was) generated with the copies in order. Requiring a[i − 1] to be used first means each arrangement of values is produced exactly once.

(The opposite condition, "skip if a[i − 1] is used", also yields each distinct permutation once, with copies placed in reverse order, but it prunes much later in the tree and does more work.)

With the swapping method, keep a set per depth of values already placed at position d and skip repeats.

The number of distinct permutations is the multinomial n! / (c₁! · c₂! · …).

## next_permutation (LC 31)

The lexicographic successor in O(n) time and O(1) space:

1. From the right, find the first i with a[i] < a[i + 1] (the pivot). The suffix a[i + 1..] is non-increasing: it is the largest arrangement of those elements. If there is no pivot, the whole array is the last permutation: reverse it to get the first.
2. From the right, find the first j with a[j] > a[i] (the smallest element in the suffix that is larger than the pivot); swap a[i] and a[j].
3. Reverse a[i + 1..], which was non-increasing and still is after the swap, so reversing makes it the smallest arrangement.

Dry run on [1, 3, 5, 4, 2]: pivot 3 (since 3 < 5); the rightmost element > 3 is 4; swap → [1, 4, 5, 3, 2]; reverse the suffix → [1, 4, 2, 3, 5].

C++ has std::next_permutation; looping it from the sorted array enumerates every **distinct** permutation once, duplicates included correctly. Previous permutation mirrors every comparison.

Related: **Next Greater Element III** (LC 556) is next_permutation on the digits of a number, with an overflow check.

## k-th permutation (LC 60)

The factorial number system: with n elements, the first element's index among the remaining ones is (k − 1) / (n − 1)!, because each choice of first element covers (n − 1)! permutations. Remove it, set k to the remainder, and repeat with n − 1. O(n²) with a list, O(n log n) with a Fenwick tree to find the j-th unused element.

Dry run, n = 4, k = 9: (9 − 1) / 3! = 1 → second element "2", remainder 2; then 2 / 2! = 1 → second of [1, 3, 4] = "3", remainder 0; then [1, 4] → "1", "4". Answer "2314".

The reverse (the rank of a given permutation) is the Lehmer code: for each position, count the smaller unused elements to its right, multiply by the factorial, and add.

## Related problems

- **Permutation in String / Find All Anagrams**: not generation; a fixed window with counts.
- **Beautiful Arrangement** (LC 526): each position i must satisfy a divisibility rule with its value; fill positions from the back (more restrictive) to prune earlier, or use bitmask DP O(n · 2ⁿ).
- **Letter Case Permutation** (LC 784): 2^(letters) branching, one binary choice per letter.
- **Permutation Sequence**-style ranking, and **Number of Squareful Arrays** (LC 996): permutations with an adjacency condition plus duplicate handling.
- **Palindrome Permutation II** (LC 267): generate permutations of half the multiset and mirror them.

## Interview angles

- Explain why the duplicate rule checks "not used", with the "copies in original order" argument.
- next_permutation is a frequent standalone question; walk through the three steps on an example.
- Expect "n = 10 is fine (3.6 million), n = 12 is not in Python".

## Connections

Permutations are the search space of TSP and assignment problems, which bitmask DP solves in O(2ⁿ · n²) instead of n!.
`,
    doubts: [
      ["Why 'a[i − 1] is not used' in the duplicate rule?", "If the previous equal value is not used, choosing a[i] now would place the second copy before the first, producing a permutation that the branch using the first copy will also produce. Requiring copies in order removes exactly those repeats."],
      ["Why does next_permutation reverse the suffix?", "After the swap, the suffix is still in decreasing order (the largest arrangement of those values). The next permutation needs the smallest arrangement of the suffix, which is increasing order: a reversal."],
      ["Why is the time O(n · n!) and not O(n!)?", "There are n! complete permutations and each one is copied (n elements) into the output. The internal nodes of the recursion tree add less than e · n! steps in total, so the copies dominate."],
      ["Does next_permutation work with duplicates?", "Yes. The strict comparisons (a[i] < a[i + 1] and a[j] > a[i]) skip over equal values, so it moves to the next distinct arrangement and never repeats one."],
      ["How can I iterate permutations without recursion?", "Sort the array and call next_permutation until it wraps around. Each call is O(n) worst case but O(1) amortised, and the output is lexicographic."],
    ],
    revise: md`
? Permutations complexity? :: O(n · n!).
? Duplicate skip with used flags? :: Skip if a[i] == a[i−1] and a[i−1] not used (after sorting).
? next_permutation steps? :: Find the pivot from the right; swap with the rightmost larger; reverse the suffix.
? Last permutation? :: No pivot: reverse to the first.
? k-th permutation? :: Factorial number system digit by digit.
? Number of distinct permutations of a multiset? :: n! / (c₁!·c₂!·…).
? Rank of a permutation? :: Lehmer code: Σ (smaller unused elements to the right) × (remaining)!.
? Next Greater Element III? :: next_permutation on digits plus a 32-bit overflow check.
? Beautiful Arrangement pruning? :: Fill positions from the back (most restrictive first) or bitmask DP.
`,
    pitfalls: ["Duplicates handled with a result set", "Forgetting to swap back in the swapping method", "Reversing the wrong range in next_permutation"],
    quiz: [Q("next_permutation of [1,3,2]?", ["[3,1,2]", "*[2,1,3]", "[2,3,1]", "[1,2,3]"], "Pivot 1; swap with 2; reverse [3,1] → [1,3].")],
    sources: [S.article("Permutation (lexicographic order generation)", "Wikipedia", "https://en.wikipedia.org/wiki/Permutation#Generation_in_lexicographic_order"), S.article("std::next_permutation", "cppreference", "https://en.cppreference.com/w/cpp/algorithm/next_permutation"), S.article("Factorial number system", "Wikipedia", "https://en.wikipedia.org/wiki/Factorial_number_system")],
    problems: [46, 47, 31, 60, 526, 784],
  },
  "constraint-search": {
    blurb: "N-Queens, Sudoku and other constraint puzzles: place, check constraints in O(1) with bookkeeping, and prune early. The craft is in the bookkeeping and the order of choices.",
    signals: ["Fill a board so constraints hold (queens, Sudoku, crosswords)", "Insert operators to reach a target", "Small search space with strong constraints"],
    lesson: md`
## Constraint satisfaction

N-Queens, Sudoku and puzzle problems are **constraint satisfaction problems** (CSPs): a set of variables (queen positions, empty cells), each with a domain of values (columns, digits 1–9), and constraints between them (no two queens attack, no repeated digit in a unit). Backtracking assigns variables one at a time and undoes an assignment when a constraint fails. How fast it runs depends almost entirely on how early failures are detected and which variable is assigned next.

## N-Queens (LC 51, 52)

Place n queens on an n × n board so that none attack each other. Since every row holds exactly one queen, the variables are the rows and the value is the column: place row by row.

Keep three sets (or boolean arrays):

- **columns** in use;
- **diagonals** (top-left to bottom-right): cells on one share r − c;
- **anti-diagonals** (top-right to bottom-left): cells on one share r + c.

Why: moving one step down-right adds 1 to both r and c, so r − c stays fixed; moving down-left adds 1 to r and subtracts 1 from c, so r + c stays fixed. There are 2n − 1 of each kind. Checking and updating are O(1).

\`\`\`python
def solve_n_queens(n):
    cols, d1, d2, place, out = set(), set(), set(), [], []
    def go(r):
        if r == n:
            out.append(["." * c + "Q" + "." * (n - c - 1) for c in place]); return
        for c in range(n):
            if c in cols or r - c in d1 or r + c in d2: continue
            cols.add(c); d1.add(r - c); d2.add(r + c); place.append(c)
            go(r + 1)
            cols.remove(c); d1.remove(r - c); d2.remove(r + c); place.pop()
    go(0)
    return out
\`\`\`

Solution counts: n = 4 → 2, 8 → 92, 12 → 14,200. The search explores far fewer than n! placements because attacks prune whole subtrees.

**Bitmask version** (N-Queens II, counting only): keep cols, diag and anti as integers. For the next row, available = ~(cols | diag | anti) & full. Take the lowest available bit p = available & −available, recurse with (cols | p, (diag | p) << 1, (anti | p) >> 1), and clear p from available. Shifting the diagonal masks by one per row moves each attack line to the next row. This counts n = 15 (2,279,184 solutions) in about a second in C++.

**Symmetry breaking**: count solutions with the first queen in the left half of row 0 and double, adding the middle column separately when n is odd.

## Sudoku Solver (LC 37)

Variables: empty cells. Domain: 1–9. Constraints: each row, column and 3 × 3 box contains each digit once. Box index = (r / 3) · 3 + c / 3.

Bookkeeping: three arrays of 9-bit masks (rows, cols, boxes). The candidates for (r, c) are ~(row[r] | col[c] | box[b]) & 0x1FF.

Speed-ups that turn seconds into milliseconds:

- **Minimum remaining values (MRV)**: always fill the empty cell with the fewest candidates next. A cell with one candidate is forced; a cell with zero means backtrack immediately.
- **Constraint propagation**: after each placement, repeatedly fill naked singles (a cell with one candidate) and hidden singles (a digit that fits only one cell of a unit) before guessing.
- **Bitmask candidates** and popcount to compare cells.

**Valid Sudoku** (LC 36) is just the bookkeeping without search: one pass with three sets (or masks) per unit.

## Expression Add Operators (LC 282)

Insert '+', '−' or '*' between the digits of a string so the expression equals a target. Backtrack over the next operand (any prefix of the remaining digits, no leading zeros except "0" itself) and the operator before it.

Multiplication binds tighter, so keep the running value and the **last operand**:

- '+': value + x, last = x
- '−': value − x, last = −x
- '*': value − last + last · x, last = last · x  (undo the last addition, redo it multiplied)

Dry run on "232" with target 8: 2 * 3 + 2 = 8 and 2 + 3 * 2 = 8. Use 64-bit integers (operands can be 10 digits long).

## Exact cover and Dancing Links

N-Queens, Sudoku and polyomino tiling are all **exact cover** problems: choose rows of a 0/1 matrix so that every column has exactly one 1. Knuth's **Algorithm X** solves exact cover by backtracking on the column with the fewest 1s (MRV again), and **Dancing Links** (DLX) represents the matrix with doubly linked lists so removing and restoring rows and columns is O(1). Name-level knowledge signals depth.

## General pruning ideas

- **Feasibility checks**: stop when a constraint is already violated or cannot be satisfied (the remaining budget cannot reach the target; a variable has no values left).
- **Variable ordering**: most constrained variable first (fail fast).
- **Value ordering**: least constraining value first (succeed fast).
- **Forward checking**: after assigning a variable, remove inconsistent values from the domains of its neighbours; backtrack if any domain empties.
- **Symmetry breaking**: fix one representative of each symmetric family.
- **Branch and bound**: in optimisation searches, stop when an optimistic bound cannot beat the best found.
- **Memoisation**: if the same sub-state recurs, cache it (then it is DP).

## Interview angles

- Justify r − c and r + c in one sentence.
- For Sudoku, say MRV and bitmasks even if you write the simple version.
- For Expression Add Operators, the "last operand" trick is the crux; also mention leading zeros.

## Connections

Constraint search is backtracking plus bookkeeping. The same MRV idea drives SAT solvers (DPLL), and exact cover links to bitmask DP when the universe is small.
`,
    doubts: [
      ["Why r − c and r + c for diagonals?", "Along a '\\' diagonal both r and c increase by 1, so r − c stays constant; along a '/' diagonal r increases while c decreases, so r + c stays constant. Each diagonal gets a unique id."],
      ["How do I track the last operand in Expression Add Operators?", "For '+x' last = x; for '−x' last = −x; for '*x' the new value is value − last + last·x and the new last is last·x. That is what lets multiplication bind tighter than addition."],
      ["Why place N-Queens row by row instead of trying every cell?", "Every valid board has exactly one queen per row, so choosing a column per row encodes all candidates without generating impossible ones (two queens in a row). The search space drops from C(n², n) placements to at most nⁿ, and pruning reduces it far further."],
      ["What are hidden singles in Sudoku?", "A digit that can go in only one cell of some row, column or box, even if that cell has other candidates. Placing it is forced. Hidden singles plus naked singles solve most newspaper puzzles without any guessing."],
      ["Why does Expression Add Operators need 64-bit integers?", "The digit string can be up to 10 characters, so a single operand can reach 9,999,999,999, which overflows 32 bits, and products of operands grow further. Python is fine; in Java and C++ use long."],
    ],
    revise: md`
? N-Queens O(1) check? :: Sets for columns, r − c and r + c.
? Bitmask N-Queens step? :: available = ~(cols|diag|anti) & full; take p = available & −available.
? Sudoku box index? :: (r/3)·3 + c/3.
? Sudoku speed-up? :: Fill the most constrained cell first (MRV) with bitmask candidates.
? Expression Add Operators multiplication? :: value − last + last·x; new last = last·x.
? Generic exact cover solver? :: Knuth's Algorithm X with Dancing Links.
? Bitmask N-Queens next row masks? :: cols|p, (diag|p) << 1, (anti|p) >> 1.
? Sudoku candidate mask? :: ~(row[r] | col[c] | box[b]) & 0x1FF.
? Forward checking? :: After an assignment, prune neighbours' domains; backtrack if one empties.
? N-Queens solutions for n = 8? :: 92.
`,
    pitfalls: ["O(n) attack checks per placement", "Leading zeros in operator insertion", "Mutating board state without restoring it"],
    quiz: [Q("Two queens at (2,5) and (4,3) attack each other because…", ["same column", "same r − c", "*same r + c", "they don't"], "2 + 5 = 4 + 3 = 7: same anti-diagonal.")],
    sources: [S.paper("Dancing Links (Knuth, 2000)", "arXiv", "https://arxiv.org/abs/cs/0011047"), S.article("Eight queens puzzle", "Wikipedia", "https://en.wikipedia.org/wiki/Eight_queens_puzzle"), S.book("Algorithms, chapter 2: Backtracking", "Jeff Erickson", "https://jeffe.cs.illinois.edu/teaching/algorithms/book/02-backtracking.pdf")],
    problems: [51, 52, 37, 36, 282, 1240],
  },
  "grid-backtracking": {
    blurb: "DFS over a grid that marks cells on the path and unmarks them on return: word search, unique paths through obstacles, gold collection, with pruning that makes it pass.",
    signals: ["Find a word or path in a grid without reusing cells", "Visit every empty cell exactly once", "Maximum collected along a self-avoiding path"],
    lesson: md`
## Paths, not regions

Grid backtracking searches for **paths** through cells: a word spelled by adjacent letters, a route that visits every free cell, the most valuable walk. Unlike flood fill, a cell's "visited" mark only means "on the current path": when the search backs out of a cell, the mark is removed so another path can use it. That is why these searches are exponential while flood fill is linear.

## Word Search (LC 79)

Find whether a word can be traced through horizontally or vertically adjacent cells, each cell used at most once.

From every cell matching word[0], run DFS with the index k of the next letter:

\`\`\`python
def exist(board, word):
    R, C = len(board), len(board[0])
    def dfs(r, c, k):
        if k == len(word): return True
        if not (0 <= r < R and 0 <= c < C) or board[r][c] != word[k]: return False
        ch, board[r][c] = board[r][c], "#"          # mark on the path
        found = any(dfs(r + dr, c + dc, k + 1) for dr, dc in ((1,0),(-1,0),(0,1),(0,-1)))
        board[r][c] = ch                             # unmark on the way back
        return found
    return any(dfs(r, c, 0) for r in range(R) for c in range(C))
\`\`\`

**Complexity**: O(R · C · 3^L) for a word of length L: R·C starting cells, and after the first step each move has at most 3 new directions (the fourth is where you came from, which is marked). Space O(L) for the recursion.

**Pruning interviewers like:**

- **Letter counts**: if the board does not contain enough copies of some letter in the word, return false before searching.
- **Search from the rarer end**: if the word's last letter is rarer on the board than its first, reverse the word. Fewer starting cells and earlier failures.
- **Early exit**: any() stops at the first success; do not explore further.
- Overwriting the cell with '#' avoids a separate visited set and is O(1); restore it afterwards so the board is unchanged for the caller.

## The difference from flood fill

| | Flood fill (islands) | Path backtracking (word search) |
|---|---|---|
| visited means | "already counted, never again" | "on the current path" |
| unmark on return | no | yes |
| each cell processed | once | many times, once per path through it |
| complexity | O(R · C) | exponential in path length |

Decide which you need by asking: can the same cell legitimately be part of two different answers (paths)? If yes, unmark.

## Other problems

- **Path with Maximum Gold** (LC 1219): start a DFS from every gold cell; collect gold, mark, recurse into gold neighbours, unmark; track the best total. At most 25 gold cells keeps it feasible.
- **Unique Paths III** (LC 980): count paths from the start to the end that walk over every empty cell exactly once. Count the empty cells first, carry the number still to visit, and accept the end only when it reaches zero. The grid is at most 20 cells, so plain backtracking works (bitmask DP over cells is the alternative).
- **Rat in a Maze**: list every path from the top-left to the bottom-right; trying directions in the order D, L, R, U yields lexicographically sorted output for free.
- **Robot Room Cleaner** (LC 489): the grid is unknown; backtrack with the robot itself, using relative directions and an explicit "go back" (turn 180°, move, turn 180°) to undo a move.
- **Knight's tour**: visit every square once with knight moves; Warnsdorff's rule (always move to the square with the fewest onward moves) usually finds a tour without backtracking.
- **Word Search II** (LC 212): many words at once; walk a trie alongside the DFS (see trie-powered search).
- **Longest path in a grid** with arbitrary moves is NP-hard; when moves must strictly increase in value (LC 329), it becomes a DAG and memoised DFS (DP) solves it in O(R · C).

## Making it iterative

Use an explicit stack of frames (r, c, k, next direction index); a frame pops after its last direction and restores its cell then. Recursion depth is at most the path length (≤ R · C), usually fine; convert when the path can be very long in Python.

## Interview angles

- State the 3^L argument and the visited-on-path rule.
- Offer the letter-count and reverse-word pruning without being asked.
- Expect the follow-up "now many words" → trie.

## Connections

Grid backtracking is DFS with undo. When the "visited" information is small (a mask of special cells), it becomes BFS or DP over (cell, mask) states.
`,
    doubts: [
      ["Why 3^L and not 4^L?", "After entering a cell you never immediately go back to the cell you came from (it is marked), so at most three directions remain at each step after the first."],
      ["Mark in place or use a visited set?", "In place ('#') is faster and needs no extra memory; restore the original character on return. A visited array is cleaner if you must not mutate input."],
      ["Why is overwriting the board cell safe in Word Search?", "The DFS restores the original letter before returning, so every caller sees the board exactly as it was. During the call, '#' can never match a letter of the word, which is exactly the \"used on this path\" check."],
      ["Can memoisation speed up Word Search?", "Not in general: whether (r, c, k) can finish depends on which cells the current path already used, so the state would need the visited set, which is exponential. Memoisation works only if paths cannot revisit cells anyway (strictly increasing moves)."],
      ["How does Robot Room Cleaner undo a move it cannot see?", "After exploring from a neighbour, the robot turns around twice (180°), moves one step back, and turns 180° again to restore its original heading. Directions are tracked relative to the robot, and visited cells are stored in a set keyed by relative coordinates."],
    ],
    revise: md`
? Word Search complexity? :: O(R · C · 3^L).
? Flood fill vs path backtracking? :: Flood fill marks permanently (linear); path backtracking unmarks on return (exponential).
? Cheap pruning for Word Search? :: Letter-count check; start from the rarer end.
? Unique Paths III state? :: Position + remaining empty cells.
? Visited in path search vs flood fill? :: Path search unmarks on return (on-path only); flood fill never unmarks.
? Unique Paths III acceptance? :: Reach the end exactly when the count of unvisited empty cells is zero.
? Rat in a maze in sorted order? :: Try directions D, L, R, U in that order.
? Longest increasing path in a grid? :: DAG → memoised DFS in O(R·C), not backtracking.
`,
    pitfalls: ["Forgetting to restore the cell", "Permanently marking in a path problem", "Not returning early on success"],
    quiz: [Q("Number of Islands marks visited cells…", ["and unmarks them", "*permanently", "never", "only at the start"], "Each cell is explored once.")],
    sources: [S.book("Algorithms, chapter 2: Backtracking", "Jeff Erickson", "https://jeffe.cs.illinois.edu/teaching/algorithms/book/02-backtracking.pdf"), S.article("Backtracking", "Wikipedia", "https://en.wikipedia.org/wiki/Backtracking")],
    problems: [79, 1219, 980, 212],
  },
  "partition-backtracking": {
    blurb: "Split a string or array into pieces that each satisfy a rule: palindrome partitioning, k equal-sum subsets and matchsticks, with memoisation and ordering tricks.",
    signals: ["Partition a string into valid pieces (palindromes, dictionary words)", "Split an array into k groups with equal sum", "Assign items to buckets with capacity"],
    lesson: md`
## Two kinds of partitioning

"Partition" problems come in two shapes, and they call for different searches:

- **Cut a sequence** into consecutive pieces (palindromic pieces, dictionary words). The choice at each step is where the current piece ends.
- **Distribute a set** into k groups (equal sums, fair shares). The choice at each step is which group the next element joins.

Both are backtracking when every solution must be listed, and become DP when only a count, a minimum or a yes/no is needed and the states repeat.

## Palindrome Partitioning (LC 131)

List every way to cut s so that every piece is a palindrome. At each start index, try every end where s[start..end] is a palindrome, then recurse from end + 1. When start reaches n, record the pieces.

Precompute isPal[i][j] with DP (isPal[i][j] = s[i] == s[j] and (j − i < 2 or isPal[i + 1][j − 1])) so each check is O(1) instead of O(n).

\`\`\`python
def partition(s):
    n = len(s)
    pal = [[False] * n for _ in range(n)]
    for i in range(n - 1, -1, -1):
        for j in range(i, n):
            pal[i][j] = s[i] == s[j] and (j - i < 2 or pal[i + 1][j - 1])
    out, path = [], []
    def go(start):
        if start == n: out.append(path[:]); return
        for end in range(start, n):
            if pal[start][end]:
                path.append(s[start:end + 1]); go(end + 1); path.pop()
    go(0)
    return out
\`\`\`

The output can be exponential: "aaaa…a" has 2^(n − 1) partitions (every gap can be cut or not), so O(n · 2ⁿ) is the honest bound. The minimum number of cuts (LC 132) is a DP, not backtracking.

## Partition to K Equal Sum Subsets (LC 698)

Can the array be split into k groups with equal sums? Preconditions: total % k == 0, and no element larger than target = total / k. Two formulations:

**Bucket filling (element-centric).** Sort descending, then place each element into one of k buckets.

- Sorting descending puts the big, hard-to-place elements first, so failures happen near the root of the tree.
- If placing into a bucket would exceed the target, skip it.
- **Symmetry**: if two buckets currently have the same sum, trying the element in the second is identical to trying it in the first; skip it. In particular, once the element fails in an **empty** bucket, it will fail in every other empty bucket, so stop.

**Bucket by bucket (subset-centric).** Fill one bucket completely (search over elements with a start index, like combinations), then start the next bucket from index 0 with a used mask. Memoise on the used mask: the state is fully determined by which elements are used, because the current bucket's fill is (sum of used) mod target. That is the **bitmask DP**: dp[mask] = feasible, with O(n · 2ⁿ) for n ≤ 16.

**Matchsticks to Square** (LC 473) is k = 4 with the same tricks.

## Word Break II (LC 140)

List every way to split s into dictionary words. Backtracking over the end of the next word, with memoisation keyed by the start index: memo[start] = the list of sentences for the suffix s[start..]. The memo prevents recomputing a suffix, but the output itself can be exponential. Run Word Break I first (a boolean DP) and return [] immediately if no split exists; otherwise inputs like "aaaa…ab" with {a, aa, aaa} explode.

## Fair Distribution of Cookies (LC 2305)

Give each bag to one of k children, minimising the largest total. Backtracking over bags, trying each child:

- **Branch and bound**: if a child's total already reaches the best answer so far, stop that branch.
- **Symmetry**: skip a child whose current total equals an earlier child's total (in particular, try only the first empty child).
- **Order**: sort bags descending.

The bitmask alternative: dp[j][mask] = the best maximum when the first j children share the bags in mask, iterating submasks: O(k · 3ⁿ), fine for n ≤ 8.

**Minimum Number of Work Sessions** (LC 1986) and **Find Minimum Time to Finish All Jobs** (LC 1723) are the same shape; the latter is often solved by binary search on the answer plus a feasibility backtrack.

## Choosing DP vs backtracking

| Question | Approach |
|---|---|
| list every partition | backtracking (memoised on the suffix if pieces are independent) |
| count partitions or find the minimum cuts | DP over positions |
| can a set be split into k equal groups (n ≤ 16) | backtracking with symmetry pruning, or bitmask DP |
| minimise the largest group | binary search + feasibility backtracking, or bitmask DP |

## Interview angles

- State the preconditions (divisibility, no element above the target) before searching.
- Explain the empty-bucket symmetry break: it is the single biggest speed-up and the one interviewers look for.
- Mention the bitmask DP for small n.

## Connections

Cutting sequences is partition DP's listing cousin; distributing sets is bitmask DP's search cousin. Bin packing and multiprocessor scheduling, which these problems resemble, are NP-hard in general.
`,
    doubts: [
      ["Why sort descending in k-subsets?", "Large numbers have the fewest valid placements, so failures appear near the root of the search tree, pruning the most."],
      ["Why can I break after failing to place into an empty bucket?", "All empty buckets are interchangeable. If the number cannot start an empty bucket successfully, trying another empty bucket would repeat the same search."],
      ["Does sorting descending change correctness in the bucket-filling search?", "No, only speed. Any assignment of elements to buckets is still reachable; placing large elements first just makes infeasible branches fail near the root, which prunes far more of the tree."],
      ["Why run Word Break I before Word Break II?", "Inputs like \"aaaaaaaaaab\" with {a, aa, aaa} have no valid sentence, yet the backtracking explores an exponential number of prefix splits before discovering that \"b\" never matches. The O(n²) boolean DP detects the impossibility immediately."],
      ["How large can n be for the bitmask DP in Partition to K Equal Sum Subsets?", "O(n · 2ⁿ) is about 10⁶ operations for n = 16 and 3·10⁷ for n = 20, so n ≤ 16–20 is comfortable. Beyond that, rely on backtracking with strong pruning."],
    ],
    revise: md`
? Palindrome check speed-up? :: Precompute isPal[i][j] by DP.
? Minimum palindrome cuts? :: DP, not backtracking.
? k equal subsets prerequisites? :: total % k == 0 and max ≤ target.
? k-subset prunings? :: Sort descending; skip buckets with equal sums; break after an empty-bucket failure.
? Small n alternative? :: Bitmask DP over used elements.
? Word Break II? :: Backtracking memoised by start index.
? Why does a failed placement into an empty bucket end the search for that element? :: All empty buckets are symmetric; if one fails, all fail.
? Partition to K: why memoise on the used mask only? :: The current bucket's fill = (sum of used) mod target, so the mask determines the state.
? Find Minimum Time to Finish All Jobs? :: Binary search the limit + feasibility backtracking (or bitmask DP).
? Palindrome partitions of "aaaa…" ? :: 2^(n−1): every gap cut or not.
`,
    pitfalls: ["Rechecking palindromes from scratch", "Missing the empty-bucket symmetry break (TLE)", "Not checking divisibility first"],
    quiz: [Q("[4,3,2,3,5,2,1], k = 4: target sum per subset?", ["4", "*5", "6", "20"], "Total 20 / 4.")],
    sources: [S.book("Algorithms, chapter 2: Backtracking", "Jeff Erickson", "https://jeffe.cs.illinois.edu/teaching/algorithms/book/02-backtracking.pdf"), S.article("Partition problem", "Wikipedia", "https://en.wikipedia.org/wiki/Partition_problem")],
    problems: [131, 132, 698, 473, 140, 2305],
  },

  // ─────────────── graph traversal ───────────────
  "graph-representations": {
    blurb: "Adjacency lists, adjacency matrices and edge lists: what each costs, when to use which, and how to build graphs from the messy inputs interviews give you.",
    signals: ["Any problem with entities and relationships", "Input given as edges, prerequisites, equations, words or grids", "Choosing a structure before running an algorithm"],
    lesson: md`
## What a graph is

A graph G = (V, E) is a set of vertices and a set of edges joining pairs of them. Almost every "relationship" problem is a graph problem once you decide what the vertices and edges are: cities and roads, courses and prerequisites, words differing by one letter, cells and their neighbours, puzzle states and moves. Choosing the representation is the first design decision, and it fixes the cost of everything that follows.

## The three representations

| | Space | Edge check u–v | Iterate neighbours of u | Best for |
|---|---|---|---|---|
| Adjacency list | O(V + E) | O(deg u) | O(deg u) | sparse graphs, most algorithms |
| Adjacency matrix | O(V²) | O(1) | O(V) | dense graphs, V ≤ ~2000, Floyd–Warshall |
| Edge list | O(E) | O(E) | O(E) | Kruskal, Bellman–Ford |

- **Adjacency list**: adj[u] = list of neighbours (or (neighbour, weight) pairs). Total size Σ deg = 2E for undirected graphs, E for directed. BFS and DFS visit each list once, which is where O(V + E) comes from.
- **Adjacency matrix**: M[u][v] = 1 (or the weight). Iterating neighbours costs O(V) even if u has two neighbours, so BFS becomes O(V²). Worth it when E is close to V², or when constant-time edge checks dominate (Floyd–Warshall, some bitmask problems). 2000² booleans are 4 million entries: fine; 10⁵² is not.
- **Edge list**: [(u, v, w), …]. Algorithms that process edges globally in some order (Kruskal sorts them; Bellman–Ford relaxes them all) need nothing more.
- **Adjacency set** (a hash set per vertex): O(1) edge checks with O(V + E) space, useful when you must test and delete edges (Hierholzer, some simulations).
- **CSR (compressed sparse row)**: one flat array of neighbours plus an offsets array; the fastest layout for huge static graphs, used in graph libraries.

Most interview graphs are sparse (E ≈ V to 10V): use adjacency lists.

## Vocabulary

- **Directed / undirected**: one-way edges or two-way edges.
- **Weighted / unweighted**: edges carry costs or not (unweighted = all weights 1).
- **Simple / multigraph**: parallel edges and self-loops allowed or not. Many algorithms (bridges, Euler paths) must handle parallel edges explicitly.
- **Degree**: number of incident edges; in-degree and out-degree for directed graphs.
- **Path, cycle, simple path** (no repeated vertices).
- **Connected component** (undirected); **strongly connected component** (directed, mutual reachability); **weakly connected** (connected if directions are ignored).
- **DAG**: directed acyclic graph. **Tree**: connected, acyclic, V − 1 edges. **Forest**: acyclic.
- **Bipartite**: vertices split into two sides, every edge crosses.
- **Dense** (E ≈ V²) vs **sparse** (E ≈ V).

## Building graphs from inputs

- **Edge list** [[u, v], …] → adjacency list; add both directions if undirected.
- **Prerequisites** [course, prereq] → edge prereq → course. Be explicit about direction; reversing it silently produces the reversed topological order.
- **Equations** a / b = k → weighted edges a → b (k) and b → a (1/k) (Evaluate Division, LC 399).
- **Words** differing by one letter (Word Ladder): comparing all pairs is O(n² · L). Instead bucket each word under its L wildcard patterns ("hot" → "*ot", "h*t", "ho*"); words sharing a bucket are neighbours. O(n · L²) to build, counting the cost of forming patterns.
- **Grids** → implicit graph: neighbours are the four (or eight) adjacent cells; never build an explicit list.
- **Strings or puzzle states** → implicit graph explored on demand (state-space search): generate neighbours when a state is popped.
- **Accounts or groups sharing an item** (Accounts Merge, LC 721): connect each email to its account (a bipartite graph) or union the emails of each account.
- **Intervals or circles that overlap** (Detonate the Maximum Bombs, LC 2101): an edge for each overlapping pair (directed if the relation is not symmetric).
- Map arbitrary labels (strings, coordinates) to 0..V − 1 with a hash map when arrays are faster than dictionaries.

## Complexity conventions

Graph algorithms are stated in V and E: BFS/DFS O(V + E), Dijkstra O((V + E) log V), Bellman–Ford O(V·E), Floyd O(V³), Kruskal O(E log E). Saying "O(n)" for a graph is ambiguous: name both. For grids, V = R·C and E ≈ 4·R·C, so traversal is O(R·C).

## Degree facts and quick checks

- **Handshake lemma**: Σ deg = 2E, so the number of odd-degree vertices is even. (Used in Euler path conditions.)
- A tree has exactly V − 1 edges. A graph with V − 1 edges is a tree **iff** it is connected (equivalently, iff it is acyclic). **Graph Valid Tree** (LC 261): check E == V − 1 and one component.
- A connected undirected graph with E ≥ V has a cycle.
- **Find the Town Judge** (LC 997) and **Find the Celebrity** (LC 277): pure in/out-degree reasoning; the celebrity elimination uses one pass of "if a knows b, a is not the celebrity, else b is not".
- **Minimum Height Trees** (LC 310): peel leaves layer by layer; the last one or two vertices are the centres.
- **Graph isomorphism** has no known polynomial algorithm in general; trees can be compared by canonical hashing (AHU algorithm).

## Interview angles

- Say what the vertices and edges are before writing code; ask about directed vs undirected, weights, self-loops and duplicates.
- Mention why you chose an adjacency list (sparse) and the resulting O(V + E).
- For word-transformation problems, the wildcard-bucket construction is the expected optimisation.

## Connections

Every traversal, shortest-path and connectivity algorithm starts from one of these representations. Implicit graphs (grids, states) are the bridge to state-space search.
`,
    doubts: [
      ["When is an adjacency matrix the right choice?", "When the graph is dense, V is small (a matrix of 10⁴ × 10⁴ booleans is 100 MB), you need O(1) edge queries, or the algorithm is naturally matrix based (Floyd–Warshall, transitive closure, matrix-power path counting)."],
      ["How should I build the graph for Word Ladder?", "For each word and each position, create the pattern with that letter replaced by '*' and bucket words by pattern. Words in the same bucket are neighbours. This avoids O(n²) pairwise comparisons."],
      ["Is a graph with V − 1 edges always a tree?", "Only if it is also connected (equivalently, acyclic). V − 1 edges plus either property implies the other."],
      ["Do I need to deduplicate edges when building an adjacency list?", "For BFS, DFS and shortest paths, duplicates only cost time, not correctness. For degree counts, Euler paths and bridges, parallel edges matter and must be kept (or handled by edge id). Decide based on the problem and say so."],
      ["Should vertices be 0-indexed arrays or dictionaries?", "Use arrays when vertices are already small integers (fast, compact). Use dictionaries for string or tuple labels, or map them to integers once with a hash map and then use arrays. In Python, a list of lists is noticeably faster than a dict of sets for traversal."],
      ["How do I store a weighted undirected graph so I can delete edges?", "Keep each edge once in an edge list with an id and a \"used/deleted\" flag, and store edge ids in both endpoints' adjacency lists. Deleting the edge marks the flag; traversals skip flagged ids. This also handles parallel edges correctly."],
    ],
    revise: md`
? Adjacency list space? :: O(V + E).
? Adjacency matrix edge check and space? :: O(1) check, O(V²) space.
? Edge list best for? :: Kruskal, Bellman–Ford.
? Handshake lemma? :: Σ degrees = 2E.
? Tree characterisation? :: Connected with V − 1 edges (or acyclic with V − 1 edges).
? Word Ladder neighbours efficiently? :: Wildcard buckets ('h*t').
? Equation a/b = k as a graph? :: a→b weight k, b→a weight 1/k.
? Word Ladder graph building cost with wildcard buckets? :: O(n·L²) instead of O(n²·L).
? Find the Celebrity in O(n)? :: Candidate elimination: if a knows b, a is out, else b is out; then verify.
? Accounts Merge graph? :: Connect emails within an account (union-find or a bipartite email–account graph).
? CSR layout? :: Flat neighbour array plus per-vertex offsets: fastest for big static graphs.
`,
    pitfalls: ["Adding only one direction for undirected edges", "Reversing prerequisite direction", "Building an explicit graph for a grid", "Quadratic neighbour discovery for word graphs"],
    quiz: [Q("A graph with 10⁵ vertices and 2·10⁵ edges should be stored as…", ["adjacency matrix", "*adjacency list", "edge list only", "a tree"], "A matrix would need 10¹⁰ entries.")],
    sources: [S.book("Algorithms, 4th ed. §4.1 Undirected Graphs", "Sedgewick & Wayne", "https://algs4.cs.princeton.edu/41graph/"), S.book("Algorithms, chapter 5: Basic Graph Algorithms", "Jeff Erickson", "https://jeffe.cs.illinois.edu/teaching/algorithms/book/05-graphs.pdf")],
    problems: [1971, 997, 1557, 261, 310, 399],
  },
  bfs: {
    blurb: "Breadth-first search explores in waves of increasing distance, so the first time it reaches a vertex is along a shortest path (in edges). The workhorse for unweighted shortest paths.",
    signals: ["Minimum number of steps / moves / transformations", "Unweighted shortest path", "Level-by-level spread (infection, rotting, propagation)"],
    widgets: ["bfs-grid"],
    lesson: md`
## What BFS does

Breadth-first search explores a graph in rings: first the source, then everything one edge away, then everything two edges away, and so on. Because it reaches every vertex by the fewest possible edges, it is **the** shortest-path algorithm for unweighted graphs, and the basis of level-by-level processing, multi-source distances and state-space search.

## The algorithm

\`\`\`python
from collections import deque
def bfs(adj, s):
    dist = {s: 0}
    q = deque([s])
    while q:
        u = q.popleft()
        for v in adj[u]:
            if v not in dist:          # mark when enqueuing
                dist[v] = dist[u] + 1
                q.append(v)
    return dist
\`\`\`

O(V + E) time: each vertex is enqueued and dequeued once, and each adjacency list is scanned once. O(V) space for the queue and the distances.

**Mark visited when enqueuing**, not when dequeuing. If you mark on dequeue, a vertex with many incoming edges is enqueued once per edge before it is first dequeued; on a dense graph the queue grows to O(E) and the work multiplies. Marking on enqueue guarantees each vertex enters the queue once.

## Why BFS gives shortest paths

Claim: vertices are dequeued in non-decreasing order of their true distance, and dist[v] is set to the true distance when v is discovered.

Sketch by induction: all vertices at distance d are enqueued before any vertex at distance d + 1, because a vertex at distance d + 1 can only be discovered from a vertex at distance d, which is dequeued after all distance-(d − 1) vertices. At any moment the queue holds at most two distance values, d and d + 1, in order. When v is first discovered from u, any path to v that is shorter would pass through a vertex dequeued earlier, which would have discovered v first. So the first discovery is via a shortest path.

This holds only when **all edges have the same weight**. With weights 0 and 1, use 0-1 BFS (a deque); with general non-negative weights, use Dijkstra (a heap). BFS on a weighted graph returns the path with the fewest edges, which may not be the cheapest.

## Level-by-level BFS

When the answer is "how many rounds" or you must process a whole layer together, loop over the current queue size:

\`\`\`python
steps = 0
while q:
    for _ in range(len(q)):
        u = q.popleft()
        if u == target: return steps
        for v in neighbours(u):
            if v not in seen: seen.add(v); q.append(v)
    steps += 1
\`\`\`

Rotting Oranges counts minutes this way; Word Ladder counts transformations.

## Reconstructing the path

Store parent[v] = u when discovering v; walk back from the target to the source and reverse. For **all** shortest paths (Word Ladder II, LC 126), BFS level by level and record every parent from the previous level (do not mark a vertex visited until its whole level is processed, so several parents can claim it). That builds a DAG of shortest paths; then DFS (or backtrack) from the target to the source to list them.

## Multi-source BFS

Enqueue every source at distance 0. The result is each vertex's distance to its **nearest** source, in one O(V + E) run: equivalent to adding a virtual super-source connected to all sources by zero-length edges. Rotting Oranges (LC 994), 01 Matrix (LC 542), Walls and Gates (LC 286), As Far from Land as Possible (LC 1162), Map of Highest Peak (LC 1765).

[[widget:bfs-grid]]

## Bidirectional BFS

Search from the source and the target at the same time, always expanding the smaller frontier, and stop when the frontiers meet. With branching factor b and distance d, one-sided BFS explores about b^d vertices; bidirectional explores about 2·b^(d/2). For b = 10 and d = 6 that is 10⁶ versus 2·10³. It needs a known target and reversible edges (or the reverse graph). The standard optimisation for Word Ladder and Open the Lock.

To get the exact distance, finish the whole current level when the frontiers first touch, then take the best meeting distance; stopping at the first touching vertex in the middle of a level can be off by one in some implementations.

## BFS on implicit graphs

Neighbours are generated on the fly: Open the Lock (LC 752: 8 neighbours per 4-digit state; deadends are pre-marked as visited), Minimum Genetic Mutation (LC 433), Sliding Puzzle (LC 773: board serialised as a string), Jump Game III (LC 1306), Minimum Knight Moves (LC 1197: use symmetry to stay in one quadrant plus a small margin). The cost is O(states × moves per state), so estimate the state count first.

## Typical problems

- Word Ladder (LC 127), Open the Lock (LC 752), Minimum Genetic Mutation (LC 433): state-space BFS.
- Rotting Oranges (LC 994), 01 Matrix (LC 542), Walls and Gates (LC 286): multi-source grid BFS.
- Shortest Path in Binary Matrix (LC 1091): 8-directional grid BFS.
- Clone Graph (LC 133): BFS with a map from originals to clones.
- Snakes and Ladders (LC 909): BFS over squares with the board's jumps applied.
- Bus Routes (LC 815): BFS over routes (not stops), connecting routes that share a stop.

## Interview angles

- Say "unweighted, so BFS gives shortest paths" and why.
- Mark on enqueue; use deque (never list.pop(0) in Python).
- Mention bidirectional BFS for large state spaces with a known target.

## Connections

BFS generalises to 0-1 BFS (deque), Dijkstra (heap) and A* (heap with a heuristic). Kahn's topological sort is BFS on in-degree-0 vertices. Level order on trees is BFS without the visited set.
`,
    doubts: [
      ["Why mark visited when pushing rather than when popping?", "If you mark on pop, the same vertex can be pushed by each of its neighbours before it is popped, so the queue can hold O(E) entries and the same work repeats. Marking on push guarantees each vertex enters the queue once."],
      ["Does BFS work on weighted graphs?", "Only if all weights are equal (then it is just scaling). For 0/1 weights use 0-1 BFS with a deque; for other non-negative weights use Dijkstra."],
      ["BFS or DFS to check reachability?", "Either: both are O(V + E). Use BFS when you also want distances, DFS when you want structure (cycles, topological order, low-link values) or simpler recursive code."],
      ["How much does bidirectional BFS save?", "If each level multiplies the frontier by b and the answer is at depth d, one-directional BFS visits about b^d vertices and bidirectional about 2·b^(d/2). For b = 10, d = 6 that is 10⁶ versus 2,000."],
      ["Can BFS find the shortest cycle in a graph?", "Yes, for unweighted undirected graphs: run BFS from each vertex; when you see an edge to an already-visited vertex that is not the parent, a cycle of length dist[u] + dist[v] + 1 exists through the source's tree. The minimum over all sources is the girth, in O(V·(V + E))."],
      ["Why should I avoid list.pop(0) for the queue in Python?", "list.pop(0) shifts every remaining element, costing O(n) per pop and O(n²) overall. collections.deque.popleft is O(1). In Java use ArrayDeque, not LinkedList, for speed."],
      ["How do I BFS when edges have weight 1 or 2?", "Split each weight-2 edge into two weight-1 edges through a dummy vertex, or use Dial's algorithm with three buckets, or just use Dijkstra. With weights in {0, 1}, use 0-1 BFS."],
    ],
    revise: md`
? BFS complexity? :: O(V + E).
? Mark visited when? :: When enqueuing.
? Why shortest paths? :: Vertices are dequeued in non-decreasing distance order (equal edge weights).
? Path reconstruction? :: parent[v] on discovery; walk back.
? Multi-source BFS? :: Enqueue all sources with distance 0.
? Bidirectional BFS gain? :: About 2·b^(d/2) instead of b^d.
? Weighted edges? :: 0/1 → 0-1 BFS; non-negative → Dijkstra.
? All shortest paths (Word Ladder II)? :: BFS by levels recording every parent from the previous level, then DFS back from the target.
? Bus Routes BFS over? :: Routes (connected when they share a stop), not stops.
? Bidirectional BFS exact distance? :: Finish the current level when the frontiers touch, then take the best meeting distance.
? Super-source view of multi-source BFS? :: A virtual source with zero edges to all sources.
`,
    pitfalls: ["Marking visited on pop", "Using BFS on weighted graphs", "list.pop(0) in Python (use deque)", "Running a BFS per source instead of multi-source"],
    quiz: [
      Q("Rotting Oranges: start the BFS from…", ["one rotten orange", "*all rotten oranges at once", "each fresh orange", "the top-left cell"], "Multi-source BFS gives the simultaneous spread."),
      Q("BFS finds shortest paths when…", ["weights are positive", "*all edges have the same weight", "the graph is a DAG", "always"], "Otherwise use Dijkstra or 0-1 BFS."),
    ],
    sources: [S.book("Algorithms, 4th ed. §4.1 (breadth-first search)", "Sedgewick & Wayne", "https://algs4.cs.princeton.edu/41graph/"), S.article("Breadth-first search", "cp-algorithms", "https://cp-algorithms.com/graph/breadth-first-search.html"), S.book("Introduction to Algorithms (CLRS), ch. 20.2: Breadth-first search", "Cormen, Leiserson, Rivest, Stein", "https://mitpressbookstore.mit.edu/book/9780262046305")],
    problems: [127, 126, 752, 433, 994, 542, 286, 1091, 133],
  },
  dfs: {
    blurb: "Depth-first search goes deep before wide. Discovery and finish times, the four edge types, connected components, and why DFS (not BFS) is the engine behind cycles, topological order, bridges and SCCs.",
    signals: ["Explore all reachable vertices, count components", "Anything about structure: cycles, ancestors, topological order, low-link", "Path existence and enumeration"],
    widgets: ["dfs-edges"],
    lesson: md`
## What DFS does

Depth-first search goes as deep as possible along one path before backing up. It visits every vertex reachable from the start in O(V + E), like BFS, but the order it visits and finishes vertices carries structural information: ancestry, cycles, topological order, low-links. That is why DFS, not BFS, underlies cycle detection, topological sorting, bridges, articulation points and strongly connected components.

## The algorithm

\`\`\`python
timer = 0
def dfs(u):
    global timer
    visited[u] = True; tin[u] = timer; timer += 1
    for v in adj[u]:
        if not visited[v]:
            parent[v] = u
            dfs(v)
    tout[u] = timer; timer += 1
\`\`\`

O(V + E). Recursion depth can reach V (a long path), so for V around 10⁵ use an explicit stack or raise the recursion limit carefully (Python's C stack may still overflow).

To cover a disconnected graph, call dfs from every unvisited vertex; each call explores one component (undirected) and the calls together form a **DFS forest**.

## Discovery and finish times

Every vertex gets a discovery time **tin** (when DFS enters it) and a finish time **tout** (when all its descendants are done). The intervals [tin, tout] are properly nested or disjoint, never partially overlapping: the **parenthesis theorem**. Write "(u" at tin[u] and "u)" at tout[u], and the sequence is a well-formed bracket string.

Consequences:

- v is a descendant of u **iff** tin[u] < tin[v] and tout[v] < tout[u]. After one DFS of a tree, "is u an ancestor of v?" is O(1).
- The subtree of u is the contiguous range of discovery times [tin[u], tout[u]] (with a single counter per entry), which flattens subtree queries onto an array (Euler tour + Fenwick or segment tree).
- Sorting by decreasing finish time gives a topological order of a DAG, and drives Kosaraju's SCC algorithm.

## Edge types (directed graphs)

When DFS at u looks at edge u → v:

| Type | Condition | Meaning |
|---|---|---|
| tree | v unvisited | DFS goes to v |
| back | v is an ancestor still on the stack (grey) | **cycle** |
| forward | v is a finished descendant | shortcut down the tree |
| cross | v is finished and not a descendant | edge to an earlier branch |

Use three colours: white (unvisited), grey (on the current path), black (finished). A **back edge exists iff the graph has a cycle**. Forward and cross edges both point to black vertices; tin tells them apart (forward: tin[u] < tin[v]; cross: tin[v] < tin[u]).

[[widget:dfs-edges]]

Undirected DFS has only tree and back edges: an edge to an already-visited vertex always goes to an ancestor or descendant, never "across", because DFS would have taken that edge as a tree edge earlier.

## Connected components and region problems

Run DFS from every unvisited vertex; each run is one component.

- **Number of Islands** (LC 200), **Number of Provinces** (LC 547), **Count Components** (LC 323), **Max Area of Island** (LC 695).
- **Surrounded Regions** (LC 130): DFS from every border 'O' to mark the safe ones, then flip the rest. Starting from the border turns "is this region enclosed?" into "is it reachable from outside?".
- **Pacific Atlantic Water Flow** (LC 417): reverse the flow: DFS uphill from each ocean's border and intersect the two reachable sets.
- **Keys and Rooms** (LC 841), **All Paths From Source to Target** (LC 797: DFS listing paths in a DAG, no visited set needed because there are no cycles).
- **Clone Graph** (LC 133): DFS with a map original → copy, creating the copy before recursing so cycles terminate.

## DFS vs BFS

| | DFS | BFS |
|---|---|---|
| Memory | O(depth) | O(width) |
| Shortest unweighted path | no | yes |
| Cycles, topological order, low-link, SCC | yes | not directly (Kahn for topological order) |
| Recursion risk | yes | no |
| Listing all paths | natural (backtracking) | awkward |

For plain reachability or counting components, both are fine; pick the one you can write correctly fastest.

## Iterative DFS

A simple stack version visits every reachable vertex, but in a different order from recursion and without correct finish times:

\`\`\`python
stack = [s]; seen = {s}
while stack:
    u = stack.pop()
    for v in adj[u]:
        if v not in seen: seen.add(v); stack.append(v)
\`\`\`

For true DFS semantics (finish times, grey/black colours, post-order work), push frames (u, index of the next neighbour) and advance the index each time you return to u; when the index runs out, u is finished. Alternatively push u twice: once as an "enter" event and once as an "exit" event.

## Interview angles

- Name the DFS fact you are using: "a back edge means a cycle", "reverse finish order is topological", "nested intervals give ancestry".
- Mention recursion depth and the iterative alternative for large inputs.
- For region problems, the "start from the border" trick is often the key insight.

## Connections

Topological sort, bridges and articulation points (tin and low), SCCs (Kosaraju and Tarjan), Euler tours and tree flattening are all DFS with extra bookkeeping. Backtracking is DFS over a decision tree with undo.
`,
    doubts: [
      ["Why do I need three colours for cycle detection in directed graphs?", "A visited vertex might be finished (black) and reached via a cross or forward edge, which is not a cycle. Only an edge to a grey vertex (on the current recursion path) closes a cycle. Two colours cannot tell those apart."],
      ["Can I detect cycles in undirected graphs with visited alone?", "Yes, if you ignore the edge back to the parent: any visited neighbour other than the parent closes a cycle. With parallel edges, skip by edge id."],
      ["What is the parenthesis theorem good for?", "Ancestor checks in O(1) (tin/tout nesting), subtree ranges for segment-tree queries on trees (Euler tour flattening), and the correctness proofs of topological sort and SCC algorithms."],
      ["Why doesn't 'pop and push all neighbours' give true DFS finish times?", "It marks vertices finished as soon as they are expanded, before their descendants are explored. Post-order work needs to know when all descendants are done, which requires resuming the neighbour iteration."],
      ["Does DFS visit vertices in a unique order?", "No. The order depends on the order of each adjacency list and on which unvisited vertex starts each tree. Algorithms built on DFS (topological sort, SCC) are correct for any order, but outputs such as \"the\" topological order may differ."],
      ["When must I use the \"enter/exit\" two-event stack instead of recursion?", "When the depth can reach about 10⁴ or more in Python (default limit 1000; raising it risks a C-stack crash) or 10⁵ in Java (default thread stack), and you need post-order work such as finish times, subtree sizes or low-link values."],
      ["Is DFS or union-find better for counting components?", "For a static graph both are O(V + E) in practice; DFS is simpler. Union-find wins when edges arrive over time and you need the component count after each addition."],
    ],
    revise: md`
? DFS complexity? :: O(V + E); recursion depth up to V.
? Parenthesis theorem? :: [tin, tout] intervals nest exactly along ancestor relationships.
? Four edge types? :: Tree, back (to grey ancestor), forward (to black descendant), cross (to black non-descendant).
? Cycle in a directed graph iff? :: A back edge (edge to a grey vertex).
? Undirected cycle check? :: A visited neighbour that is not the parent (edge id with multi-edges).
? Surrounded Regions trick? :: DFS from border cells; flip only unreached regions.
? Pacific Atlantic? :: Reverse-flow DFS from each ocean, intersect.
? Tell forward and cross edges apart? :: Both point to black vertices; forward if tin[u] < tin[v], cross if tin[v] < tin[u].
? Why no cross edges in undirected DFS? :: An edge to a visited non-ancestor would have been taken as a tree edge earlier.
? All Paths From Source to Target needs visited? :: No: the graph is a DAG, so paths cannot loop.
? Clone Graph with cycles? :: Create the copy and store it in the map before recursing into neighbours.
`,
    pitfalls: ["Two-colour cycle detection on directed graphs", "Deep recursion on large graphs", "Forgetting to restart DFS from every unvisited vertex"],
    quiz: [
      Q("Directed DFS meets an edge to a grey vertex. The graph…", ["is a DAG", "*has a cycle", "is disconnected", "is bipartite"], "Grey means on the current path."),
      Q("Which edge types can an undirected DFS produce?", ["all four", "*tree and back only", "tree and cross only", "back only"], "Cross and forward edges cannot occur."),
    ],
    sources: [S.book("Algorithms, chapter 6: Depth-First Search", "Jeff Erickson", "https://jeffe.cs.illinois.edu/teaching/algorithms/book/06-dfs.pdf"), S.article("Depth-first search", "cp-algorithms", "https://cp-algorithms.com/graph/depth-first-search.html"), S.book("Introduction to Algorithms (CLRS), ch. 20.3: Depth-first search", "Cormen, Leiserson, Rivest, Stein", "https://mitpressbookstore.mit.edu/book/9780262046305")],
    problems: [200, 547, 323, 695, 130, 417, 797, 841],
  },
  "cycle-detection": {
    blurb: "Undirected: a visited neighbour that is not your parent, or a union-find merge that fails. Directed: a back edge to a grey vertex, or Kahn's algorithm leaving vertices behind.",
    signals: ["Can all courses be finished? (cycle in prerequisites)", "Is this graph a tree?", "Redundant connection", "Deadlock or circular dependency detection", "Safe states that cannot reach a cycle"],
    lesson: md`
## Why cycle detection matters

A cycle means something can depend on itself: a course that is its own prerequisite, a deadlock among processes waiting for each other, a spreadsheet formula that refers to itself, an infinite loop in a linked structure. Many algorithms (topological sort, DP on graphs, tree algorithms) are only valid when there is no cycle, so detecting one is often step one. The method depends on whether the graph is undirected, directed, or functional (out-degree 1).

## Undirected graphs

**DFS with a parent.** During DFS from u, an edge to a visited vertex v that is not u's parent closes a cycle (v is an ancestor reached by a second route).

\`\`\`python
def has_cycle(n, adj):
    seen = [False] * n
    def dfs(u, parent_edge):
        seen[u] = True
        for v, eid in adj[u]:
            if eid == parent_edge: continue      # skip only the edge we came in on
            if seen[v] or dfs(v, eid): return True
        return False
    return any(not seen[u] and dfs(u, -1) for u in range(n))
\`\`\`

Skip the parent **edge** (by id), not the parent vertex: with two parallel edges between u and v, the second one is a genuine cycle of length 2 that a "skip parent vertex" check would miss.

**Union-find.** Process edges one at a time; if both endpoints are already in the same set, this edge closes a cycle. **Redundant Connection** (LC 684) returns that edge. Near-linear, iterative, and natural when edges arrive as a list.

**Counting.** A connected undirected graph with V vertices has a cycle iff E ≥ V. A forest with c components has exactly V − c edges, so any graph with more edges than V − c contains a cycle.

## Directed graphs

**Three colours.** White = unvisited, grey = on the current DFS path, black = finished. An edge to a grey vertex is a back edge: a cycle. An edge to a black vertex is not a cycle (it points to a finished branch: a forward or cross edge).

\`\`\`python
WHITE, GREY, BLACK = 0, 1, 2
def has_cycle_directed(n, adj):
    color = [WHITE] * n
    def dfs(u):
        color[u] = GREY
        for v in adj[u]:
            if color[v] == GREY: return True
            if color[v] == WHITE and dfs(v): return True
        color[u] = BLACK
        return False
    return any(color[u] == WHITE and dfs(u) for u in range(n))
\`\`\`

Why "visited" alone is not enough: in the graph a → b, a → c, c → b, DFS finishes b from a, then reaches b again from c. b is visited, but there is no cycle. Only grey vertices (still on the path) indicate one.

**Recovering the cycle.** Keep parent pointers; when the back edge u → v is found, walk parent from u back to v and reverse.

**Kahn's algorithm.** Repeatedly remove vertices with in-degree 0. If some vertices are never removed, a cycle exists (the remaining vertices are on cycles or downstream of them). **Course Schedule** (LC 207) is exactly this: return removed == n. Kahn is iterative (no recursion depth issues) and also yields an order (Course Schedule II, LC 210).

Kahn or DFS? Both O(V + E). Kahn is easier to make iterative and gives the order directly; DFS gives the actual cycle more easily.

## Eventual safe states (LC 802)

A vertex is safe if every path from it ends at a terminal vertex (no outgoing edges), i.e. it cannot reach any cycle.

- **Three-colour DFS**: a vertex is safe iff its DFS finishes (turns black) without meeting grey. Memoise: once a vertex is known unsafe (it reached grey), it stays unsafe; leave it grey forever so later searches also fail on it.
- **Kahn on the reversed graph**: reverse every edge; terminal vertices now have in-degree 0. Peel them, decrementing in-degrees; every vertex peeled is safe. Sort the result.

## Functional graphs (out-degree exactly 1)

When every vertex has exactly one outgoing edge (f: V → V), every component is a single cycle with trees hanging into it (a "rho" shape). Find the cycles by:

- walking from each unvisited vertex with a colour per walk (a vertex coloured in the current walk closes a cycle; its length = current step − step when first seen), or
- peeling vertices with in-degree 0 repeatedly (Kahn); what remains is exactly the cycle vertices.

Problems: **Longest Cycle in a Graph** (LC 2360), **Maximum Employees to Be Invited to a Meeting** (LC 2127: the answer is max(the longest cycle, the sum over all 2-cycles of 2 plus the longest chains hanging into each end)), **Find the Duplicate Number** (LC 287: i → nums[i] is a functional graph whose cycle entrance is the duplicate; Floyd finds it in O(1) space), linked-list cycles.

## Redundant Connection II (directed, LC 685)

A rooted tree plus one extra directed edge. Two things can break: some vertex gets two parents, and/or a cycle appears.

1. Find a vertex with two incoming edges; call them cand1 (earlier) and cand2 (later).
2. Run union-find on all edges except cand2. If no cycle appears, cand2 is the answer.
3. If a cycle appears: if there were candidates, the answer is cand1 (cand1 is on the cycle); if there were none, the answer is the edge that closed the cycle.

## Negative cycles

In weighted graphs, a cycle whose total weight is negative makes shortest paths undefined (you could loop forever, lowering the cost). Bellman–Ford detects one with a V-th relaxation round that still improves something; Floyd–Warshall leaves a negative value on the diagonal; SPFA detects a vertex enqueued V times. Currency arbitrage is a negative cycle under weights −log(rate).

## Interview angles

- Ask "directed or undirected?" first; the answer changes the algorithm.
- Explain why grey (not visited) signals a cycle in directed graphs, with the three-vertex counterexample.
- Handle parallel edges and self-loops (a self-loop u → u is a cycle in both kinds of graph).

## Connections

Topological sort fails exactly when a cycle exists; SCCs group the vertices of all cycles; deadlock detection in operating systems and databases looks for cycles in wait-for graphs.
`,
    doubts: [
      ["Why doesn't 'visited neighbour = cycle' work for directed graphs?", "In a directed graph, DFS can reach a vertex finished in an earlier branch via a cross edge (A → B, A → C → B). B is visited, but there is no cycle. Only a vertex still on the recursion stack (grey) indicates a cycle."],
      ["How do I output the actual cycle?", "Record parent pointers. When the back edge u → v is found, walk from u through parents back to v, then reverse."],
      ["Kahn or DFS for Course Schedule?", "Both are O(V + E). Kahn's is iterative (no recursion depth issues) and directly yields a valid order for Course Schedule II; DFS needs post-order reversal."],
      ["Why skip the parent edge by id rather than the parent vertex?", "With parallel edges u–v (two different edges), returning to u along the second edge is a real cycle of length 2. Skipping every edge to the parent vertex would hide it; skipping only the edge you arrived on catches it."],
      ["Does Kahn's algorithm tell me which vertices are on a cycle?", "Not exactly: the vertices left over include cycle vertices and everything downstream of them. To isolate cycle vertices, also peel vertices with out-degree 0 on the reversed graph, or find SCCs of size greater than 1 (plus self-loops)."],
      ["How is deadlock detection a cycle problem?", "In a wait-for graph, an edge P → Q means process P waits for a resource held by Q. A deadlock is a cycle: every process on it waits for the next. Databases periodically search this graph and abort one transaction on the cycle."],
    ],
    revise: md`
? Undirected cycle via DFS? :: A visited neighbour other than the parent.
? Undirected cycle via DSU? :: An edge whose endpoints are already connected.
? Directed cycle via DFS? :: An edge to a grey vertex.
? Directed cycle via Kahn? :: Vertices remain after removing all in-degree-0 vertices.
? Safe states? :: Cannot reach a cycle: colour DFS, or Kahn on the reversed graph.
? Functional graph structure? :: One cycle per component with trees feeding in.
? Self-loop u → u? :: A cycle in both directed and undirected graphs; handle explicitly.
? Maximum Employees (LC 2127)? :: max(longest cycle, Σ over 2-cycles of 2 + longest chains into each end).
? Redundant Connection II steps? :: Find a double-parent vertex; union-find without the later candidate; decide by whether a cycle remains.
? Unsafe vertex memo in LC 802? :: Leave it grey so later searches also fail on it.
`,
    pitfalls: ["Undirected logic on directed graphs", "Forgetting the parent exception in undirected DFS", "Recursion depth on large dependency graphs"],
    quiz: [Q("Kahn's algorithm processes 8 of 10 vertices. Conclusion?", ["The graph is a DAG", "*There is a cycle among the remaining vertices (or they depend on one)", "Two components", "The order is unique"], "Vertices on a cycle never reach in-degree 0.")],
    sources: [S.book("Algorithms, 4th ed. §4.2 Directed Graphs (cycle detection)", "Sedgewick & Wayne", "https://algs4.cs.princeton.edu/42digraph/"), S.article("Finding a negative cycle", "cp-algorithms", "https://cp-algorithms.com/graph/finding-negative-cycle-in-graph.html"), S.article("Checking a graph for acyclicity and finding a cycle", "cp-algorithms", "https://cp-algorithms.com/graph/finding-cycle.html")],
    problems: [207, 684, 685, 802, 2360, 261],
  },
  "grid-graphs": {
    blurb: "Grids are graphs with implicit edges: direction arrays, bounds checks, flood fill, multi-source BFS for nearest distances, and when to mark cells in place.",
    signals: ["2D board of cells with connections to neighbours", "Islands, regions, enclosed areas", "Nearest distance to some cell type, simultaneous spread"],
    widgets: ["bfs-grid"],
    lesson: md`
## Grids are graphs

A 2D grid is a graph whose vertices are cells and whose edges join adjacent cells (4-directional, or 8 with diagonals). Nobody builds an adjacency list: neighbours are computed from coordinates on the fly. Every graph algorithm (DFS, BFS, 0-1 BFS, Dijkstra, union-find) applies, with V = R·C and E ≈ 4·R·C, so a single traversal costs O(R·C).

## Mechanics

\`\`\`python
DIRS = ((1, 0), (-1, 0), (0, 1), (0, -1))
def neighbours(r, c):
    for dr, dc in DIRS:
        nr, nc = r + dr, c + dc
        if 0 <= nr < R and 0 <= nc < C:
            yield nr, nc
\`\`\`

- Bounds are checked **before** reading the cell (negative indices silently wrap in Python).
- Visited: overwrite the cell ('1' → '0' for islands, or a sentinel) when mutating the input is allowed; otherwise keep a boolean matrix. Say which you chose.
- Encode (r, c) as r·C + c when you need one integer key (union-find, hash sets, distance arrays).
- Knight moves, hex grids and wrap-around (torus) grids only change the neighbour generator.
- Recursion depth for DFS can reach R·C (a snake-shaped region): BFS or an explicit stack is safer for 10⁶ cells.

## Flood fill family

- **Number of Islands** (LC 200), **Max Area of Island** (LC 695), **Flood Fill** (LC 733): DFS or BFS from each unvisited land cell; each search marks one island.
- **Island Perimeter** (LC 463): count land cells × 4 minus 2 for every adjacent land pair (no search needed).
- **Number of Closed Islands** (LC 1254), **Number of Enclaves** (LC 1020) and **Surrounded Regions** (LC 130): flood from the border first to eliminate regions touching it, then count or flip what remains.
- **Number of Distinct Islands** (LC 694): a canonical shape signature: the set of (r − r0, c − c0) offsets from the island's first cell in scan order, or the DFS direction string including "back" markers (without backtrack markers, different shapes can produce the same string).
- **Making a Large Island** (LC 827): label each island with an id and store its size; then for every water cell, sum the sizes of the **distinct** neighbouring island ids plus 1. O(R·C).
- **Count Sub Islands** (LC 1905): flood each island of grid 2 and check every cell is land in grid 1 (finish the flood even after a failure, so the whole island is marked).
- **Coloring a Border** (LC 1034): flood the component, marking cells that touch a different colour or the edge.

## Multi-source BFS for nearest distances

Seed all sources at distance 0 and run one BFS; each cell's first arrival is its distance to the nearest source.

- **01 Matrix** (LC 542): from all zeros. (A two-pass DP, top-left then bottom-right, also works because Manhattan paths are monotone.)
- **Rotting Oranges** (LC 994): from all rotten oranges; answer = levels until no fresh orange remains, or −1 if some never rot.
- **As Far from Land as Possible** (LC 1162): from all land; the answer is the last level.
- **Walls and Gates** (LC 286), **Map of Highest Peak** (LC 1765).
- **Shortest Bridge** (LC 934): flood one island to collect its cells, then multi-source BFS from all of them across water until the other island is reached.

Running one BFS per source would cost O((R·C)²).

[[widget:bfs-grid]]

## Shortest paths in grids

| Move costs | Algorithm |
|---|---|
| all equal | BFS (Shortest Path in Binary Matrix, LC 1091, with 8 directions) |
| 0 or 1 | 0-1 BFS (Minimum Cost to Make at Least One Valid Path, LC 1368) |
| non-negative cell or edge weights | Dijkstra (Path With Minimum Effort, LC 1631, on max-edge cost) |
| extra resources (keys, eliminations) | BFS over (r, c, resource) (Shortest Path with Obstacles Elimination, LC 1293) |

**Path With Minimum Effort** has three standard solutions: Dijkstra where a path's cost is its largest step; binary search on the effort limit with BFS reachability; or union-find adding edges in increasing order of effort until the corners connect. **Swim in Rising Water** (LC 778) is the same minimax structure.

## Union-find on grids

For dynamic problems, union-find with r·C + c ids answers each change in near-constant time where re-running BFS costs O(R·C):

- **Number of Islands II** (LC 305): land is added over time; each addition unions with up to four land neighbours and adjusts the island count.
- **Bricks Falling When Hit** (LC 803): process hits in reverse (removals become additions) with a virtual "roof" node.
- **Regions Cut By Slashes** (LC 959): split each cell into four triangles and union them according to '/' and '\'.

## Interview angles

- State 4- or 8-connectivity and whether you may mutate the grid.
- For "nearest X" questions, multi-source BFS is the expected answer.
- Watch the recursion depth on 1000 × 1000 grids.

## Connections

Grids are the most common implicit graph. When the state needs more than the cell (keys held, direction, time), it becomes state-space search; when moves are restricted to right and down, it becomes grid DP.
`,
    doubts: [
      ["DFS or BFS for flood fill?", "Both are O(R·C). DFS is shorter but recursion can overflow on a 1000 × 1000 grid (10⁶ cells in one region); BFS or an explicit stack avoids that."],
      ["Mutating the grid as visited: acceptable?", "Usually yes and it saves memory; say so and offer a visited matrix if the caller needs the grid unchanged."],
      ["How do I recognise distinct island shapes?", "Translate each island so its first-visited cell is the origin and store the sorted relative coordinates, or record the DFS move sequence including a 'back' marker. Equal signatures mean equal shapes."],
      ["Should I use 01 Matrix's two-pass DP or BFS?", "Both are O(R·C). The DP (top-left pass then bottom-right pass, taking min of neighbours + 1) is neat because, with only 4-directional moves and no obstacles, a shortest path to the nearest zero can be split into a monotone part from each direction. With obstacles or other move rules the DP breaks, while BFS still works."],
      ["How do I avoid recursion limits for DFS on large grids in Python?", "Use BFS with a deque, or an explicit stack where you mark cells when pushing. Both visit each cell once. sys.setrecursionlimit alone is risky because deep Python recursion can still crash the interpreter's C stack."],
      ["Why does Making a Large Island need distinct island ids?", "A water cell can touch the same island from two sides. Adding that island's size twice would overcount, so collect the neighbouring ids in a set before summing their sizes."],
    ],
    revise: md`
? Grid traversal cost? :: O(R·C).
? Nearest distance to any zero? :: Multi-source BFS from all zeros.
? Closed islands? :: Flood from the border first, then count.
? Making a large island? :: Label islands with sizes; for each water cell sum distinct neighbouring sizes + 1.
? Islands added over time? :: Union-find on r·C + c.
? Eliminate up to k obstacles? :: BFS over (r, c, k left).
? Distinct island signature without ambiguity? :: Relative offsets from the first cell, or DFS directions including backtrack markers.
? Shortest Bridge? :: Flood one island, then multi-source BFS from all its cells across water.
? Count Sub Islands detail? :: Finish flooding the island even after finding a bad cell.
? Regions Cut By Slashes? :: Four triangles per cell + union-find.
`,
    pitfalls: ["Recursive DFS on 10⁶-cell regions", "Bounds checked after indexing", "One BFS per source"],
    quiz: [Q("Distance from every cell to the nearest 0 in a 1000 × 1000 grid:", ["BFS from each cell", "*One multi-source BFS from all zeros", "Floyd–Warshall", "DFS"], "O(R·C) total.")],
    sources: [S.article("Flood fill", "Wikipedia", "https://en.wikipedia.org/wiki/Flood_fill"), S.article("Flood fill (graph traversal on grids)", "USACO Guide", "https://usaco.guide/silver/flood-fill")],
    problems: [200, 695, 733, 1254, 130, 694, 827, 542, 994, 1162, 286, 417],
  },
  bipartite: {
    blurb: "Can vertices be split into two sides with every edge crossing? Two-colour with BFS or DFS; an odd cycle is the only obstacle. The gateway to matching.",
    signals: ["Split people into two groups where enemies are separated", "Two-colourability, odd cycles", "Graphs whose edges always go between two kinds of things"],
    lesson: md`
## Definition

A graph is **bipartite** if its vertices can be split into two sides L and R so that every edge goes between the sides, never within one. Equivalently, it can be coloured with two colours so that every edge joins different colours. Examples: students and courses (enrolment), jobs and workers (who can do what), even and odd cells of a chessboard (king-free moves between adjacent cells), and any tree.

## The test: BFS or DFS two-colouring

Colour the start vertex 0. Every newly discovered neighbour gets the opposite colour. If an edge ever joins two vertices of the same colour, the graph is not bipartite. Run from every uncoloured vertex, because the graph may be disconnected (each component is coloured independently). O(V + E).

\`\`\`python
from collections import deque
def is_bipartite(adj):
    n = len(adj); color = [-1] * n
    for s in range(n):
        if color[s] != -1: continue
        color[s] = 0; q = deque([s])
        while q:
            u = q.popleft()
            for v in adj[u]:
                if color[v] == -1:
                    color[v] = color[u] ^ 1; q.append(v)
                elif color[v] == color[u]:
                    return False
    return True
\`\`\`

The colouring is forced: once the start's colour is fixed, BFS determines every other colour in its component. So if the forced colouring has a conflict, no colouring works.

## Why odd cycles are the only obstacle

**Theorem (König, 1936):** a graph is bipartite **iff it contains no cycle of odd length**.

- If there is an odd cycle, colours must alternate around it, and an odd number of alternations returns to the start with the wrong colour: impossible.
- If there is no odd cycle, colour each vertex by the parity of its BFS distance from the component's start. Any edge u–v within the same parity would, together with the two BFS tree paths from the start, form a closed walk of odd length, which contains an odd cycle. So every edge crosses parities.

The conflict your BFS finds is exactly an odd cycle (the two tree paths to u and v plus the edge u–v), so you can report it as a certificate.

## Union-find version

For each vertex u, all of u's neighbours must be on the same side as each other, and on the opposite side from u. So union all neighbours of u together (union adj[u][0] with every other neighbour), and check that u is never in the same set as any neighbour. This avoids recursion and works when edges arrive over time; **parity DSU** (storing the parity to the root) is the general form and also handles "same side / different side" constraints online.

## Problems

- **Is Graph Bipartite?** (LC 785): the test above, with adjacency lists given.
- **Possible Bipartition** (LC 886): dislikes as edges; can people be split into two groups?
- **Divide Nodes Into the Maximum Number of Groups** (LC 2493): for each component, it must be bipartite; then the maximum number of groups is the largest BFS depth (+1) over all start vertices in the component; sum over components.
- **Flower Planting With No Adjacent** (LC 1042): degree ≤ 3 makes greedy 4-colouring trivial (always a free colour) — a contrast with 2-colouring's strict test.
- **Two-team assignment** with "must be together" and "must be apart" constraints: parity DSU.

## Why it matters

- **Matching**: bipartite graphs have efficient maximum matching (Hopcroft–Karp, O(E√V)), and **König's theorem**: in a bipartite graph, maximum matching size = minimum vertex cover size. Assignment problems (workers to jobs, students to seats) are bipartite matching; see flow and matching.
- **Two-slot scheduling**: exams that conflict must be on different days; two days suffice iff the conflict graph is bipartite.
- **Complexity contrast**: 2-colouring is linear time; 3-colouring is NP-complete. A one-line fact that shows depth.

## Related tricks

- **Grids are bipartite**: colour cell (r, c) by (r + c) mod 2; every 4-directional move changes the colour. This gives parity arguments: a domino always covers one black and one white cell, so a board with two opposite corners removed cannot be tiled. Maximum Students Taking Exam (LC 1349) can be solved as bipartite matching on seats split by column parity.
- **Trees are bipartite**: no cycles at all; colour by depth parity.
- **Bipartite check during BFS of a state space**: alternating-step games (who moves on even and odd turns) colour states by parity.

## Interview angles

- Mention disconnected components and the odd-cycle theorem.
- Offer the union-find alternative if the interviewer asks for an iterative or online solution.
- Expect "now find a maximum matching" as a follow-up: name Hopcroft–Karp or augmenting paths.

## Connections

Bipartite graphs feed matching and flow; parity DSU generalises the test; grid parity arguments solve tiling puzzles.
`,
    doubts: [
      ["Why is an odd cycle the only obstacle?", "Colours must alternate along any path. Going around a cycle of odd length returns to the start with the opposite colour: contradiction. Conversely, if there is no odd cycle, BFS layers coloured by parity of distance never conflict."],
      ["Do I need to handle disconnected graphs?", "Yes. Start a colouring from every uncoloured vertex, otherwise components not reachable from vertex 0 are never checked."],
      ["Can a graph with self-loops be bipartite?", "No. A self-loop joins a vertex to itself, so both endpoints have the same colour: an odd cycle of length 1. Check for self-loops explicitly if the input allows them."],
      ["Is DFS or BFS better for the bipartite test?", "Both are O(V + E) and both work. BFS gives the shortest odd cycle certificate more naturally and avoids recursion depth issues; DFS is shorter to write. Pick either and colour on discovery."],
      ["How do I return the two sides after the test?", "The colour array is the answer: side L = vertices with colour 0, side R = colour 1, per component. Components can be flipped independently, so there are 2^(components) valid splits."],
    ],
    revise: md`
? Bipartite test? :: BFS/DFS two-colouring; conflict means not bipartite.
? Characterisation? :: No odd-length cycle.
? Complexity? :: O(V + E).
? Disconnected graphs? :: Restart from every uncoloured vertex.
? 2-colouring vs 3-colouring? :: Linear vs NP-complete.
? Proof that "no odd cycle" ⇒ bipartite? :: Colour by BFS-depth parity; a same-parity edge would close an odd cycle with the tree paths.
? Divide Nodes Into the Maximum Number of Groups? :: Each component bipartite; max BFS depth + 1 over starts, summed over components.
? Domino tiling with opposite corners removed? :: Impossible: both removed cells share a colour, dominoes cover one of each.
? Two-slot exam scheduling? :: Possible iff the conflict graph is bipartite.
`,
    pitfalls: ["Starting only from vertex 0", "Directed-edge confusion: bipartiteness ignores direction", "Not handling self-loops (a self-loop makes it non-bipartite)"],
    quiz: [Q("A cycle of length 5 is…", ["bipartite", "*not bipartite", "a tree", "a DAG"], "Odd cycle.")],
    sources: [S.article("Bipartite graph", "Wikipedia", "https://en.wikipedia.org/wiki/Bipartite_graph"), S.article("Checking whether a graph is bipartite", "cp-algorithms", "https://cp-algorithms.com/graph/bipartite-check.html")],
    problems: [785, 886, 1042],
  },
  "state-space-bfs": {
    blurb: "When vertices are configurations (lock codes, board states, (cell, keys) pairs), BFS over the implicit graph finds the minimum number of moves. Design the state, then run plain BFS.",
    signals: ["Minimum moves to transform one configuration into another", "Puzzles: sliding tiles, locks, jugs", "Grid search where extra information matters (keys collected, obstacles removed)"],
    lesson: md`
## Searching over situations

Many puzzles are shortest-path problems where the vertices are not given: each vertex is a **situation** (a lock combination, a board arrangement, a position plus the keys held), and each edge is a legal move. BFS over this implicit graph finds the minimum number of moves. The work is not in the search loop, which is ordinary BFS, but in **designing the state** so that it is complete (contains everything that affects the future) and small (contains nothing more).

## Design the state

Ask: if I am in this situation twice, via different histories, are the future moves and their costs identical? If yes, the state is complete. Then remove any field whose value never changes a future move.

| Problem | State | State count |
|---|---|---|
| Open the Lock (LC 752) | 4-digit string | 10⁴ |
| Sliding Puzzle (LC 773) | board as a string | 6!/2 = 360 reachable |
| Shortest Path with Obstacle Elimination (LC 1293) | (r, c, eliminations left) | R·C·(k+1) |
| Shortest Path to Get All Keys (LC 864) | (r, c, keys bitmask) | R·C·2⁶ |
| Shortest Path Visiting All Nodes (LC 847) | (node, visited bitmask) | n·2ⁿ |
| Minimum Moves to Reach Target with Rotations (LC 1210) | (r, c, orientation) | 2·R·C |
| Bus Routes (LC 815) | route (not stop) | number of routes |
| Jump Game IV (LC 1345) | index | n |
| Water jugs | (amount in jug A, amount in jug B) | (a+1)(b+1) |

Multiply the field ranges before coding: if the product is above about 10⁷, rethink the state.

## The search loop

\`\`\`python
from collections import deque
def solve(start, is_goal, moves):
    seen = {start}; q = deque([(start, 0)])
    while q:
        s, d = q.popleft()
        if is_goal(s): return d
        for t in moves(s):
            if t not in seen:
                seen.add(t); q.append((t, d + 1))
    return -1
\`\`\`

Encode states compactly: tuples are hashable but slow; integers (bitmasks, base-k encodings) or short strings are faster. For (r, c, mask), use a 3D boolean array instead of a set when the ranges are small.

## Worked example: Shortest Path to Get All Keys (LC 864)

The grid has keys a–f and locks A–F. The state must remember which keys you hold, because a lock is passable only with its key: (r, c, mask). Start from '@' with mask 0. Moving onto a key sets its bit; moving onto a lock requires its bit. The goal is mask == (1 << K) − 1. States: 30 × 30 × 64 ≈ 57,600; each has four moves: trivial for BFS. Dropping the mask from the state would make the search think a cell is "already visited" when you return to it holding a new key, which is wrong.

## Worked example: Obstacle Elimination (LC 1293)

State (r, c, k) where k is the number of walls you may still remove. Moving into a wall costs one k. Two optimisations: if k ≥ R + C − 2, the answer is the Manhattan distance R + C − 2 (you can bulldoze straight there); and visiting (r, c) with more k left dominates visiting it with less, so keeping best_k[r][c] and skipping states with k ≤ best_k[r][c] prunes most of the space.

## Common optimisations

- **Bidirectional BFS** when the target state is known and moves are reversible (Word Ladder, Open the Lock, Sliding Puzzle).
- **Delete used edge groups**: in Jump Game IV, all indices with the same value are mutually reachable. After expanding the "same value" edges of a value once, clear that list; otherwise each index re-scans them and the algorithm is O(n²).
- **Change what a vertex is**: in Bus Routes, BFS over routes (two routes are adjacent if they share a stop) or over stops but expanding each route at most once. Riding a route is one step regardless of how many stops it has.
- **Dominance pruning**: skip a state if a previously seen state at the same position is at least as good in every resource (more keys, more eliminations left).
- **Pre-mark forbidden states** (deadends in Open the Lock) as visited.
- **Symmetry**: Minimum Knight Moves (LC 1197) folds the target into the first quadrant.

## Weighted moves

If moves have different costs (a rotation costs 2, a step costs 1), keep the same state design and run Dijkstra; with costs 0 and 1, run 0-1 BFS. The state design is independent of the search algorithm.

## Solvability checks

Some puzzles can be decided without search. For sliding-tile puzzles on a grid of width w, a configuration is solvable iff the number of inversions (with the blank's row for even w) has the right parity: exactly half of all arrangements are reachable. Water-jug problems are solvable iff the target is a multiple of gcd(a, b) and at most a + b.

## Interview angles

- Say the state and its count before writing the loop; it shows the solution is feasible.
- Mark visited on enqueue, encode states compactly, and mention bidirectional BFS.
- Expect "what if moves had costs?" → Dijkstra on the same states.

## Connections

State-space BFS is BFS on an implicit graph; bitmask states connect it to bitmask DP; dominance pruning connects it to branch and bound; Dijkstra with extra state (cheapest flights within k stops) is the weighted version.
`,
    doubts: [
      ["How do I decide what goes into the state?", "Ask: if two situations have the same position but different values of X, can their futures differ? If yes, X belongs in the state (keys held, remaining eliminations, visited set). If not, leave it out."],
      ["Why does Jump Game IV need edge deletion?", "All indices with the same value are mutually connected. Without clearing the list after the first use, every index of a frequent value re-scans the whole list: O(n²)."],
      ["How do I know a state is complete?", "Imagine two different histories that end in the same state. If any future move is legal for one but not the other, or costs differently, the state is missing information. In Get All Keys, two visits to a cell with different keys allow different futures, so the keys must be in the state."],
      ["Is DFS ever appropriate for state-space search?", "For \"is the goal reachable at all\" DFS works and uses less memory, but it does not give the minimum number of moves. Iterative deepening DFS (IDDFS) does give minimum depth with DFS-like memory, at the cost of re-exploring shallow levels; IDA* adds a heuristic."],
      ["Why is Jump Game IV O(n²) without clearing the value lists?", "If all n values are equal, every index's \"same value\" list has n entries. Each of the n indices would scan that list when popped: n × n work, even though every target is already visited after the first scan. Clearing the list after its first use makes the total O(n)."],
    ],
    revise: md`
? State design rule? :: Include exactly what affects future moves.
? Keys collected? :: Add a bitmask of keys to the state.
? Obstacles you may remove? :: (r, c, eliminations left).
? Visit all nodes shortest path? :: BFS over (node, visited mask).
? Bus Routes trick? :: BFS over routes, not stops.
? Jump Game IV trick? :: Clear same-value edge lists after use.
? Water jugs solvable? :: Target is a multiple of gcd(a, b) and ≤ a + b.
? Get All Keys goal test? :: mask == (1 << K) − 1.
? Obstacle elimination dominance? :: Skip (r, c, k) if best_k[r][c] ≥ k already.
? Minimum Moves with Rotations state? :: (r, c, orientation).
`,
    pitfalls: ["Missing a state component (wrong answers)", "Including redundant components (TLE/MLE)", "Rebuilding neighbour lists repeatedly"],
    quiz: [Q("Shortest path collecting all of up to 6 keys in a grid: state size factor for keys?", ["6", "36", "*64", "720"], "2⁶ subsets of keys.")],
    sources: [S.article("State space search", "Wikipedia", "https://en.wikipedia.org/wiki/State_space_search"), S.article("15 puzzle (solvability parity)", "Wikipedia", "https://en.wikipedia.org/wiki/15_puzzle#Solvability")],
    problems: [752, 773, 1293, 864, 847, 815, 1345, 127],
  },

  // ─────────────── topological sort ───────────────
  kahn: {
    blurb: "Repeatedly take a vertex with no remaining prerequisites. Kahn's algorithm orders a DAG in O(V + E), detects cycles for free, and adapts to \"minimum semesters\" and \"lexicographically smallest order\".",
    signals: ["Prerequisites, dependencies, build order", "Can everything be scheduled? (cycle detection)", "Minimum number of rounds when independent tasks run in parallel"],
    widgets: ["topo"],
    lesson: md`
## Topological order

A **topological order** of a directed graph lists the vertices so that every edge u → v has u before v. It exists **iff** the graph is a DAG (directed acyclic graph). It answers "in what order can I do these tasks given their dependencies?": course schedules, build systems, package installation, spreadsheet recalculation, instruction scheduling.

## Kahn's algorithm (1962)

1. Compute every vertex's in-degree (number of incoming edges).
2. Put every vertex with in-degree 0 in a queue: they have no unmet prerequisites.
3. Pop u, append it to the order, and "remove" its outgoing edges: decrement the in-degree of each successor, enqueueing any that drop to 0.
4. If the order ends with fewer than V vertices, the graph has a cycle and no topological order exists.

\`\`\`python
from collections import deque
def topo_order(n, edges):
    adj = [[] for _ in range(n)]; indeg = [0] * n
    for u, v in edges:
        adj[u].append(v); indeg[v] += 1
    q = deque(i for i in range(n) if indeg[i] == 0)
    order = []
    while q:
        u = q.popleft(); order.append(u)
        for v in adj[u]:
            indeg[v] -= 1
            if indeg[v] == 0: q.append(v)
    return order if len(order) == n else []      # [] means a cycle
\`\`\`

O(V + E) time, O(V) extra space.

[[widget:topo]]

Dry run with edges 0→1, 0→2, 1→3, 2→3: in-degrees 0, 1, 1, 2. Queue [0] → order [0], in-degrees of 1 and 2 drop to 0 → queue [1, 2] → pop 1 (3 drops to 1), pop 2 (3 drops to 0) → pop 3. Order 0, 1, 2, 3.

## Why it works

A DAG always has a vertex with in-degree 0: otherwise, start anywhere and keep stepping backwards along incoming edges; with finitely many vertices you must eventually revisit one, which is a cycle. Removing an in-degree-0 vertex leaves a DAG, so by induction Kahn outputs every vertex, and each vertex is output only after all its predecessors (its in-degree reached 0 only when they were all removed).

Conversely, if vertices remain but none has in-degree 0, each remaining vertex has a predecessor among the remaining ones; walking backwards forever inside a finite set forces a cycle. That is why "output size < V" is a correct cycle test.

## Direction of edges

"To take course a you must first take b" (prerequisites [a, b]) means the edge is **b → a**: b must come first. Getting the direction wrong produces the reversed order, which still "detects cycles" correctly but gives the wrong schedule. Say the direction out loud.

## Variants

- **Course Schedule I/II** (LC 207, 210): feasibility, then the order itself.
- **Parallel Courses** (LC 1136): process the queue level by level (snapshot its size); each level is one semester, so the number of levels is the minimum number of semesters (the longest path in vertices).
- **Parallel Courses II** (LC 1494): at most k courses per semester makes it NP-hard in general; the constraints (n ≤ 15) call for bitmask DP, not Kahn.
- **Parallel Courses III** (LC 2050): each course has a duration; finish[v] = time[v] + max over predecessors finish[u], computed along Kahn's order (critical path method).
- **Lexicographically smallest order**: replace the queue with a min-heap: O(V log V + E).
- **Is the order unique?** (Sequence Reconstruction, LC 444): unique iff the queue never holds more than one vertex: with two choices available, both orders would be valid.
- **Minimum Height Trees** (LC 310): Kahn-like peeling of leaves (degree 1) on an undirected tree; the last one or two vertices are the centres.
- **Find Eventual Safe States** (LC 802): Kahn on the reversed graph starting from terminal vertices.
- **Find All Possible Recipes** (LC 2115): ingredients and recipes as vertices; supplies start in the queue.
- **Sort Items by Groups Respecting Dependencies** (LC 1203): topologically sort the groups, then the items within each group.
- **Largest Color Value in a Directed Graph** (LC 1857): DP over colours along Kahn's order, −1 if a cycle.

## Counting topological orders

The number of topological orders is #P-complete in general. For small n, bitmask DP counts them: ways[mask] = Σ over v in mask whose predecessors are all in mask \ {v} of ways[mask \ {v}].

## Kahn vs DFS ordering

Both produce valid topological orders, usually different ones. Kahn is iterative, gives levels and lexicographic orders easily, and its cycle test is a count. DFS uses reversed finish times, fits algorithms that already run DFS, and can report the actual cycle. See the DFS ordering page.

## Interview angles

- Explain why a DAG must have an in-degree-0 vertex.
- Get the edge direction right and say it.
- Expect "what if there is a cycle?" (return empty) and "what is the minimum number of semesters?" (levels).

## Connections

Kahn's order is the evaluation order for DP on DAGs; leaf peeling on trees is the same idea on undirected graphs; Kahn on the reversed graph finds safe states.
`,
    doubts: [
      ["Which direction should prerequisite edges point?", "From prerequisite to dependent (prereq → course), so in-degree counts unmet prerequisites. Reversing it gives a reversed order: decide and say it out loud."],
      ["How do I get the minimum number of semesters?", "Process the queue level by level: every vertex whose prerequisites are all done can be taken in the same semester. The number of levels is the answer (or −1 if a cycle prevents finishing)."],
      ["When is the topological order unique?", "Exactly when, at every step, there is only one in-degree-0 vertex available, which means consecutive vertices in the order are joined by edges (there is a Hamiltonian path)."],
      ["Does Kahn's algorithm need a queue, or would a stack work?", "Any container works for correctness: the invariant is only that every vertex in the container has in-degree 0. A stack gives a different valid order; a queue gives level-by-level behaviour; a min-heap gives the lexicographically smallest order."],
      ["How do I get a topological order of only the vertices reachable from a source?", "Run a DFS from the source first to mark the reachable set, compute in-degrees counting only edges inside that set, and run Kahn there. Or use the DFS ordering from the source directly."],
      ["What is the minimum number of semesters if the graph is a long chain?", "The number of vertices on the longest path, because each semester can only advance one step along a dependency chain. Kahn's level count computes exactly that."],
    ],
    revise: md`
? Kahn's steps? :: In-degrees; queue zeros; pop, append, decrement successors; enqueue new zeros.
? Cycle detection? :: Fewer than V vertices output.
? Complexity? :: O(V + E).
? Minimum semesters? :: Level-by-level Kahn; count levels.
? Lexicographically smallest order? :: Min-heap instead of a queue.
? Unique order? :: The queue never holds more than one vertex.
? Minimum height trees? :: Peel leaves layer by layer; 1 or 2 centres remain.
? Kahn dry run edges 0→1, 0→2, 1→3, 2→3? :: Order 0, 1, 2, 3 (or 0, 2, 1, 3).
? Parallel Courses II (k per semester)? :: NP-hard in general; bitmask DP for n ≤ 15.
? Count topological orders for small n? :: Bitmask DP over the set of placed vertices.
? Find All Possible Recipes start queue? :: The supplies.
`,
    pitfalls: ["Edge direction reversed", "Forgetting vertices with no edges (they still need in-degree 0 entries)", "Not checking the output length for cycles"],
    quiz: [Q("Kahn's algorithm on a graph with a cycle outputs…", ["all vertices", "*fewer than V vertices", "an error", "a reversed order"], "Cycle vertices never reach in-degree 0.")],
    sources: [S.paper("Topological sorting of large networks (Kahn, 1962)", "Communications of the ACM", "https://doi.org/10.1145/368996.369025"), S.article("Topological sorting", "cp-algorithms", "https://cp-algorithms.com/graph/topological-sort.html"), S.book("Algorithms, 4th ed. §4.2 (topological sort)", "Sedgewick & Wayne", "https://algs4.cs.princeton.edu/42digraph/")],
    problems: [207, 210, 1136, 2050, 444, 310, 1203, 2115],
  },
  "dfs-topo": {
    blurb: "Topological order as reversed DFS finish times: a vertex finishes only after everything it points to, so reversing finish order puts every edge left to right.",
    signals: ["You are already running DFS (and want an order or cycle check)", "Recursive dependency resolution", "Ordering for DP on a DAG"],
    lesson: md`
## The algorithm

Run DFS from every unvisited vertex. When a vertex **finishes** (all its outgoing edges have been explored), append it to a list. At the end, reverse the list: that is a topological order. Detect cycles at the same time with three colours: an edge to a grey vertex (one still on the recursion stack) means a cycle, and no topological order exists.

\`\`\`python
def topo_dfs(n, adj):
    WHITE, GREY, BLACK = 0, 1, 2
    color, post = [WHITE] * n, []
    def dfs(u):
        color[u] = GREY
        for v in adj[u]:
            if color[v] == GREY: return False          # back edge: cycle
            if color[v] == WHITE and not dfs(v): return False
        color[u] = BLACK; post.append(u)               # finished
        return True
    for u in range(n):
        if color[u] == WHITE and not dfs(u): return []
    return post[::-1]
\`\`\`

O(V + E) time and O(V) space plus the recursion stack.

## Why reversed finish time works

Take any edge u → v. When DFS examines it from u, v is in one of three states:

- **white**: DFS goes into v now, so v finishes before u (it is u's descendant).
- **black**: v already finished, so again v finishes before u.
- **grey**: v is an ancestor of u still in progress, so u → v closes a cycle; in a DAG this cannot happen.

So in a DAG, every edge u → v has finish(v) < finish(u). Listing vertices by decreasing finish time therefore puts u before v for every edge. That is the whole proof; the parenthesis theorem says the same thing in interval language.

**Why not discovery order?** Discovery (pre-order) can place a vertex before one of its prerequisites. In the graph a → c, b → c, starting DFS at a discovers a, c, then b: c appears before b although b → c. Finish order handles this because c finishes (and is placed after b in the reversed list) regardless of when it was discovered.

## Reversal shortcuts

- Prepend to a deque instead of reversing at the end (same O(V)).
- If you build the graph with **reversed edges** (v → u for each dependency u → v) and run the same DFS, the post-order itself (not reversed) is a valid topological order of the original graph. Useful when the input naturally lists "what each item depends on": recurse into dependencies first, then emit the item. This is exactly how make and many build tools work: build the dependencies, then the target.

## Iterative version

Deep dependency chains (10⁵ vertices) overflow the recursion stack in Python and sometimes Java. Push frames (u, next neighbour index); when a frame's neighbours are exhausted, mark it black and append it to post. Or simply use Kahn's algorithm, which is iterative by nature.

## Kahn or DFS?

| | Kahn | DFS |
|---|---|---|
| Style | iterative, queue | recursive (or explicit stack) |
| Cycle detection | output size < V | an edge to a grey vertex |
| Reporting the cycle | awkward | follow parent pointers from u back to v |
| Level structure (semesters) | natural | not directly |
| Lexicographic order | min-heap | awkward |
| Already doing DFS (SCC, bridges) | | natural |

## Uses

- **Dependency resolution**: package managers, build systems (make, Bazel, Gradle), module loaders and container start-up orders compute topological orders of their dependency graphs, usually by DFS on the "depends on" edges.
- **Spreadsheet recalculation**: recompute cells after everything they reference.
- **Ordering states for DP on DAGs**: memoised DFS already evaluates in reverse topological order.
- **Alien Dictionary** (LC 269) is commonly written with DFS colouring, returning "" on a grey edge.
- **Kosaraju's SCC algorithm** uses DFS finish order on the original graph to drive a second DFS on the reversed graph.
- **Course Schedule II** (LC 210) and **Find All Possible Recipes** (LC 2115) work with either method.

## Interview angles

- State the three-case proof (white, black, grey) in two sentences.
- Mention the iterative alternative or Kahn for deep graphs.
- Show how to recover the actual cycle when one exists, if asked.

## Connections

DFS finish times appear again in Kosaraju (SCC) and in the parenthesis theorem; DP on DAGs consumes the order; Kahn is the BFS-style twin.
`,
    doubts: [
      ["Why reverse the finish order instead of using discovery order?", "Discovery order can place a vertex before one of its prerequisites that was discovered later from another branch. Finish order guarantees each vertex finishes after all of its successors."],
      ["Do I need to reverse if I build the graph with reversed edges?", "If edges point from a vertex to its prerequisites, finish order is already a valid build order (prerequisites first). Be explicit about direction."],
      ["Does the starting vertex order affect correctness?", "No. Any order of starting vertices and any adjacency order produces a valid topological order; only which valid order you get changes. Correctness rests on finish(v) < finish(u) for every edge, which holds regardless."],
      ["Can the same DFS detect a cycle and produce the order without two passes?", "Yes. The grey check runs during the same traversal that records finish order. If any grey edge is found, return \"no order\"; otherwise the reversed finish list is the answer."],
      ["How do build tools avoid rebuilding everything?", "They combine the topological order with timestamps or content hashes: a target is rebuilt only if one of its dependencies (already processed earlier in the order) changed. The order guarantees dependencies are up to date before the target is checked."],
    ],
    revise: md`
? DFS topological order? :: Reverse of finish order.
? Why valid? :: For every edge u → v, v finishes before u.
? Cycle detection in the same pass? :: An edge to a grey vertex.
? Edges pointing to prerequisites? :: Finish order itself is a valid build order.
? Counterexample to discovery order? :: a→c, b→c with DFS from a: c is discovered before b.
? Reversed-edge DFS gives? :: Post-order (unreversed) is a topological order of the original graph.
? Report the cycle with DFS? :: On an edge u → grey v, follow parent pointers from u back to v.
`,
    pitfalls: ["Using discovery order", "Two-colour visited (misses cycles)", "Recursion depth for long dependency chains"],
    quiz: [Q("Edges a→b, b→c. DFS from a finishes in order…", ["a, b, c", "*c, b, a", "b, c, a", "a, c, b"], "Reversed it gives a, b, c.")],
    sources: [S.book("Algorithms, chapter 6: Depth-First Search (§6.3 topological sort)", "Jeff Erickson", "https://jeffe.cs.illinois.edu/teaching/algorithms/book/06-dfs.pdf"), S.article("Topological sorting", "Wikipedia", "https://en.wikipedia.org/wiki/Topological_sorting")],
    problems: [210, 269, 1462],
  },
  "dag-dp": {
    blurb: "On a DAG, process vertices in topological order and every DP over paths becomes one linear pass: longest path, number of paths, critical path scheduling.",
    signals: ["Longest path (only tractable on DAGs)", "Count paths between two vertices", "Project scheduling with durations (critical path)", "DP whose dependencies form a DAG"],
    lesson: md`
## The principle

In a DAG, a topological order puts every vertex after all its predecessors. So any DP whose value at v depends only on values at v's predecessors can be computed in one pass along that order:

best[v] = combine over edges u → v of (best[u] ⊕ w(u, v))

O(V + E). Every DP is secretly a DP on the DAG of its subproblems; here the DAG is given explicitly, and the topological order is the fill order.

## Longest path in a DAG

dist[v] = max over u → v of dist[u] + w(u, v), with dist[source] = 0 and −∞ for vertices not yet reachable. One pass in topological order.

Why this is special: on general graphs the **longest simple path** is NP-hard (it contains the Hamiltonian path problem). On a DAG there are no cycles, so every path is simple and the DP is linear. This is one of the most useful "the structure makes a hard problem easy" facts.

Shortest paths in a DAG use the same pass with min, and **negative weights are fine**: there can be no negative cycles, so no Dijkstra or Bellman–Ford is needed. Negating weights turns longest into shortest and vice versa.

## Counting paths

ways[s] = 1; ways[v] = Σ over u → v of ways[u]. The number of paths can be exponential in V, so take a modulus. **Number of Ways to Arrive at Destination** (LC 1976) counts shortest paths: run Dijkstra, then count along edges with dist[u] + w = dist[v] (those edges form a DAG ordered by distance).

## Critical path method (project scheduling)

Tasks with durations and dependencies: earliest finish of v = duration[v] + max over prerequisites of earliest finish. The project length is the maximum finish; the **critical path** is the chain achieving it (any delay on it delays the project). **Parallel Courses III** (LC 2050) is exactly this. Latest start times come from a backward pass; slack = latest − earliest.

## Implicit DAGs: memoised DFS

**Longest Increasing Path in a Matrix** (LC 329): draw an edge from each cell to every adjacent cell with a larger value. Values strictly increase along edges, so there are no cycles: a DAG. Memoised DFS computes len(cell) = 1 + max over larger neighbours of len(neighbour), each cell once: O(R·C).

\`\`\`python
from functools import cache
def longest_increasing_path(m):
    R, C = len(m), len(m[0])
    @cache
    def go(r, c):
        best = 1
        for nr, nc in ((r+1,c),(r-1,c),(r,c+1),(r,c-1)):
            if 0 <= nr < R and 0 <= nc < C and m[nr][nc] > m[r][c]:
                best = max(best, 1 + go(nr, nc))
        return best
    return max(go(r, c) for r in range(R) for c in range(C))
\`\`\`

The alternative avoids recursion: peel cells in topological order (Kahn on the "smaller → larger" edges) and count the levels.

**Memoised DFS = DP on a DAG.** A memoised recursion evaluates its states in reverse topological order implicitly (children before parents). That is why memoisation works exactly when the dependency graph has no cycles; with cycles you get infinite recursion or wrong cached values, and must switch to a shortest-path algorithm.

## More DAG DPs

- **Largest Color Value in a Directed Graph** (LC 1857): count[v][c] = the most vertices of colour c on any path ending at v; along Kahn's order, count[v][c] = max over predecessors, plus 1 if v has colour c. If Kahn does not output every vertex, there is a cycle: return −1. O((V + E)·26).
- **All Ancestors of a Node in a DAG** (LC 2192): propagate ancestor sets (or bitsets) along the order.
- **Longest String Chain**, **Russian Doll Envelopes**: DAGs where edges go from smaller to larger items; sort by size to get the order.
- **Maximum score path in a DAG with vertex weights**, **minimum time to finish all jobs with dependencies**.
- **Course Schedule IV** (LC 1462): reachability for many queries: propagate reachable sets (bitsets) in reverse topological order.

## Recognising a DAG

Edges that always go "forward" in some quantity: time, index, value, size, length, depth. If you can name that quantity, the graph is a DAG and the quantity's sort order is a topological order.

## Interview angles

- Say why the problem is a DAG (what strictly increases along edges).
- Mention that longest path is NP-hard in general but linear on DAGs.
- Offer both memoised DFS and an explicit topological pass.

## Connections

Topological sorting provides the order; DP pages are DAG DPs on implicit state graphs; Dijkstra's shortest-path DAG is used for counting shortest paths.
`,
    doubts: [
      ["Why is longest path easy on DAGs but hard in general?", "With cycles, a longest simple path must avoid revisiting vertices, which encodes Hamiltonian path (NP-hard). A DAG has no cycles, so every path is simple and DP in topological order works."],
      ["Why does memoised DFS work on Longest Increasing Path in a Matrix?", "Edges go only to strictly larger values, so no cycle can form. The memo is filled in reverse topological order automatically."],
      ["Why does memoised DFS fail on graphs with cycles?", "The recursion for a vertex on a cycle eventually calls itself before its value is known: without a guard it recurses forever, and with a \"visiting\" guard it reads an incomplete value, so the cached result may be wrong. DP needs the dependencies to be acyclic."],
      ["Can a DAG DP handle both minimising cost and counting the number of optimal ways?", "Yes: keep (best, count) per vertex. When a predecessor gives a strictly better value, copy its count; when it ties, add its count. This is how \"number of shortest paths\" and \"number of longest increasing subsequences\" work."],
      ["Why do negative weights not break shortest paths in a DAG?", "Negative weights only cause trouble when a cycle lets you lower the cost forever or when a greedy finalises a vertex too early (Dijkstra). A topological pass processes each vertex after all its predecessors, so every path into it has already been considered; no vertex is finalised early and no cycles exist."],
    ],
    revise: md`
? DAG DP pass order? :: Topological order: predecessors first.
? Longest path on a DAG complexity? :: O(V + E) (NP-hard on general graphs).
? Count paths? :: ways[v] = Σ ways[u] over incoming edges.
? Shortest path with negative weights on a DAG? :: Relax in topological order: O(V + E).
? Longest Increasing Path in a Matrix? :: Memoised DFS on the implicit DAG: O(R·C).
? Counting shortest paths? :: Dijkstra, then count ways along edges with dist[u] + w == dist[v].
? Slack in the critical path method? :: Latest start − earliest start; zero on the critical path.
? Recognise a DAG? :: Name a quantity that strictly increases along every edge.
? Course Schedule IV fast? :: Propagate reachability bitsets in topological order.
`,
    pitfalls: ["Applying DAG DP to graphs with cycles", "Forgetting modulo for path counts", "Recursion depth in memoised DFS on large grids"],
    quiz: [Q("Longest path in a general directed graph with cycles is…", ["O(V + E)", "O(V log V)", "*NP-hard (simple paths)", "solvable by Dijkstra"], "Only DAGs make it easy.")],
    sources: [S.book("Algorithms, chapter 6 (§6.4 dynamic programming in DAGs)", "Jeff Erickson", "https://jeffe.cs.illinois.edu/teaching/algorithms/book/06-dfs.pdf"), S.article("Critical path method", "Wikipedia", "https://en.wikipedia.org/wiki/Critical_path_method"), S.book("Algorithms, 4th ed. §4.4 (acyclic shortest and longest paths)", "Sedgewick & Wayne", "https://algs4.cs.princeton.edu/44sp/")],
    problems: [329, 2050, 1857, 2192, 1976, 851],
  },
  "order-constraints": {
    blurb: "Infer a hidden order from evidence (sorted alien words, sequences, pairwise rules) by building a precedence graph and topologically sorting it, with the edge cases that make these problems hard.",
    signals: ["Recover an alphabet or ranking from sorted examples", "Is a given order consistent with constraints?", "Arrange items satisfying \"x before y\" rules"],
    lesson: md`
## Constraints as edges

"x must come before y" is a directed edge x → y. A set of such constraints is satisfiable iff the graph is a DAG, and every valid arrangement is a topological order. Problems in this family differ only in how the constraints are extracted from the input, and in what extra property of the order is asked (unique, smallest, verified).

## Alien Dictionary (LC 269)

A list of words is sorted in an unknown alphabet. Recover a valid letter order.

1. Add every letter that appears in any word as a vertex (letters with no constraints must still be output).
2. For each **adjacent** pair of words, find the **first** position where they differ: word1[i] = a, word2[i] = b gives the edge a → b. Stop there; later characters carry no information, because lexicographic order is decided entirely by the first difference.
3. **Prefix rule**: if no difference is found and word1 is longer than word2 (for example "abc" before "ab"), the input is invalid: a prefix must come before any longer word that extends it. Return "".
4. Topologically sort (Kahn or DFS). A cycle means the constraints contradict each other: return "".

\`\`\`python
from collections import deque
def alien_order(words):
    adj = {c: set() for w in words for c in w}
    indeg = {c: 0 for c in adj}
    for w1, w2 in zip(words, words[1:]):
        for a, b in zip(w1, w2):
            if a != b:
                if b not in adj[a]:
                    adj[a].add(b); indeg[b] += 1
                break
        else:
            if len(w1) > len(w2): return ""
    q = deque(c for c in indeg if indeg[c] == 0); out = []
    while q:
        c = q.popleft(); out.append(c)
        for d in adj[c]:
            indeg[d] -= 1
            if indeg[d] == 0: q.append(d)
    return "".join(out) if len(out) == len(indeg) else ""
\`\`\`

Pitfalls interviewers check: duplicate edges (use sets, or in-degrees are counted twice and the order never completes), the prefix rule, letters with no edges, and comparing only adjacent words (comparing all pairs adds nothing, because order is transitive).

Complexity: O(total characters) to extract edges plus O(V + E) for the sort, with V ≤ 26 and E ≤ number of words.

## Sequence Reconstruction (LC 444)

Given a permutation org and some subsequences, is org the **only** shortest sequence that contains all of them as subsequences? Each subsequence's consecutive pairs are edges. org is the unique answer iff:

- every element of 1..n appears, and every pair of consecutive elements of org is an edge (otherwise they could swap), equivalently
- Kahn's queue never contains more than one vertex, and the resulting order equals org.

## Verifying an order

**Verifying an Alien Dictionary** (LC 953): map each letter to its rank in the given alphabet and compare adjacent words character by character, applying the prefix rule. O(total characters); no sorting or graph needed. **Verify a topological order**: check pos[u] < pos[v] for every edge.

## Other constraint graphs

- **Course Schedule IV** (LC 1462): many "is u a prerequisite of v?" queries. Propagate ancestor sets along a topological order (bitsets make it O(V·E/64)), or run Floyd–Warshall on booleans for n ≤ 100.
- **Sort Items by Groups Respecting Dependencies** (LC 1203): give every ungrouped item its own group; topologically sort the groups (edges between groups from cross-group dependencies), then the items inside each group; concatenate.
- **Build a Matrix With Conditions** (LC 2392): row conditions and column conditions are independent DAGs; topologically sort each, then place value v at (rowPos[v], colPos[v]).
- **Loud and Rich** (LC 851): "richer" edges; for each person, the quietest among everyone at least as rich: DFS with memo along the edges.
- **Minimum number of operations with ordering constraints** often reduces to the longest path in the constraint DAG.
- **Difference constraints** (x_j − x_i ≤ c) are weighted ordering constraints, solved by Bellman–Ford (a negative cycle means infeasible).
- **Smallest String With Swaps** sounds similar but is union-find (swaps are symmetric, so groups, not order).

## Interview angles

- List the edge cases for Alien Dictionary before coding: prefix rule, duplicates, isolated letters, cycles.
- Explain why only adjacent words and only the first difference matter.
- Mention that the answer may not be unique (any topological order is accepted) unless the problem asks for uniqueness.

## Connections

All of these are topological sorting with a problem-specific edge extraction. Uniqueness ties to Kahn's queue size; weighted constraints lead to Bellman–Ford.
`,
    doubts: [
      ["Why only the first differing character?", "Lexicographic comparison stops there. The characters after it are unconstrained by this pair."],
      ["Why is 'abc' before 'ab' invalid?", "In any alphabet, a proper prefix sorts before the longer word. Seeing the longer word first contradicts every possible order."],
      ["Why is \"abc\" before \"ab\" invalid while \"ab\" before \"abc\" is fine?", "In lexicographic order a proper prefix always comes first, whatever the alphabet. \"ab\" before \"abc\" agrees with that; \"abc\" before \"ab\" contradicts it in every possible alphabet, so no valid order exists."],
      ["If several letter orders are valid, which should I return?", "Any valid topological order is accepted for LC 269. If a specific one is required (for example lexicographically smallest by normal letters), use a min-heap in Kahn's algorithm."],
      ["How do I handle groups in LC 1203 when an item has no group?", "Assign each ungrouped item a fresh group id of its own. Then every item has a group, inter-group edges come from dependencies between items in different groups, and the two-level sort works uniformly."],
    ],
    revise: md`
? Alien Dictionary edge? :: First differing character of adjacent words: a → b.
? Invalid prefix case? :: A word followed by its own proper prefix → return "".
? Unconstrained characters? :: Include them (in-degree 0).
? Unique reconstruction test? :: Topological order with a queue size of 1 at every step.
? Verify an order quickly? :: Rank map + adjacent comparisons.
? Alien Dictionary duplicate edges? :: Use sets; duplicate in-degree counts leave letters stuck.
? Why compare only adjacent words? :: Order is transitive; non-adjacent pairs add no new constraints.
? Build a Matrix With Conditions? :: Two independent topological sorts (rows, columns), place v at (rowPos, colPos).
? Loud and Rich? :: Memoised DFS over "richer" edges for the quietest person.
`,
    pitfalls: ["Missing the prefix case", "Comparing beyond the first difference", "Omitting isolated characters", "Duplicate edges double-counting in-degrees"],
    quiz: [Q("Words ['wrt','wrf','er','ett','rftt']: the first edge derived is…", ["w → e", "*t → f", "r → t", "e → r"], "'wrt' vs 'wrf' differ first at t/f.")],
    sources: [S.article("Topological sorting", "Wikipedia", "https://en.wikipedia.org/wiki/Topological_sorting"), S.article("Topological sorting", "cp-algorithms", "https://cp-algorithms.com/graph/topological-sort.html")],
    problems: [269, 444, 953, 1462, 2392],
  },

  // ─────────────── union-find ───────────────
  "dsu-core": {
    blurb: "Disjoint set union: find with path compression, union by rank or size, near-constant amortised time, and the inverse-Ackermann bound behind it.",
    signals: ["Merge groups and ask \"same group?\" repeatedly", "Connectivity under edge additions (online)", "Kruskal's MST"],
    widgets: ["union-find"],
    lesson: md`
## The problem it solves

Disjoint set union (DSU, union-find) maintains a partition of n elements into groups under two operations: **merge** two groups, and **ask** which group an element belongs to (so two elements can be tested for "same group"). It answers dynamic connectivity when edges are only ever added, in effectively constant time per operation. Kruskal's MST, cycle detection, grouping equivalent items, and percolation all run on it.

## Representation and operations

Each group is a tree of parent pointers; the root is the group's representative.

- **find(x)**: follow parent pointers to the root.
- **union(a, b)**: find both roots; if different, make one the parent of the other.

\`\`\`python
parent = list(range(n)); size = [1] * n
def find(x):
    while parent[x] != x:
        parent[x] = parent[parent[x]]   # path halving
        x = parent[x]
    return x
def union(a, b):
    a, b = find(a), find(b)
    if a == b: return False             # already in the same set
    if size[a] < size[b]: a, b = b, a
    parent[b] = a; size[a] += size[b]   # smaller tree under the larger
    return True
\`\`\`

[[widget:union-find]]

## The two optimisations

Without them, unions can build a long chain and find becomes O(n).

- **Union by size (or rank)**: attach the root of the smaller tree under the root of the larger. A node's depth only increases when its tree at least doubles in size, so depth ≤ log₂ n: O(log n) per find even without compression. Rank (an upper bound on height) works the same way; size is more useful because you often need set sizes anyway.
- **Path compression**: during find, make every node on the path point directly to the root (recursive version: parent[x] = find(parent[x])). **Path halving** (shown above) points every node to its grandparent: one pass, iterative, same asymptotic bound.

Together: amortised **O(α(n))** per operation, where α is the inverse Ackermann function. α(n) ≤ 4 for every n that fits in the physical universe, so in practice it is constant. Tarjan proved this bound in 1975, and with Fredman and Saks it is known to be optimal for this kind of pointer structure. Either optimisation alone gives O(log n) amortised.

Example of why rank matters: union(1, 2), union(2, 3), … always attaching the existing chain under the new single node builds a path of length n. Union by size attaches the single node under the chain's root instead, keeping depth 1.

## Recursive vs iterative find

\`\`\`python
def find(x):
    if parent[x] != x:
        parent[x] = find(parent[x])     # full compression
    return parent[x]
\`\`\`

Concise, but before compression takes effect a long chain can exceed Python's recursion limit (union by size prevents long chains, so with both optimisations it is safe in practice). Path halving avoids the question entirely.

## Useful extras

- **Component count**: start at n; decrement on every successful union.
- **Set size**: size[find(x)]; the largest component is max over roots.
- **Return value of union**: False means already connected. Kruskal skips such edges; cycle detection reports them.
- **Per-set data**: keep min, max, sum or a list at the root and merge it on union (merge smaller into larger to keep total work O(n log n) for lists).
- **Dictionary-based DSU** for sparse or non-integer keys: parent = {} with parent.setdefault(x, x) in find.
- **Number of sets containing items**: track how many roots exist among a subset.

## Complexity summary

| Version | find / union |
|---|---|
| naive | O(n) worst |
| union by size or rank only | O(log n) |
| path compression only | O(log n) amortised |
| both | O(α(n)) amortised |

Initialisation is O(n); total for m operations is O(m · α(n)).

## What DSU cannot do

- **Split** sets or delete edges: not supported. If all deletions are known in advance, process offline in reverse time (deletions become additions).
- **Path queries**: DSU knows that u and v are connected, not how. Use BFS/DFS or a spanning tree with LCA for paths.
- **Directed reachability**: DSU is for symmetric relations (equivalence); use SCCs or DFS for directed graphs.
- **Undo**: possible with a **rollback DSU** (union by size, no path compression, a stack of changes): O(log n) per operation, used in offline dynamic connectivity.

## Interview angles

- Write the iterative version with both optimisations from memory; it is ten lines.
- State α(n) and that it is at most 4 in practice; say what happens with only one optimisation.
- Explain the union return value: it is the key to Kruskal and redundant-edge problems.

## Connections

Kruskal's MST, cycle detection in undirected graphs, offline queries, weighted/parity DSU, and grid percolation all build on these two functions.
`,
    doubts: [
      ["Do I need both optimisations?", "Either alone gives O(log n) amortised, which passes almost every interview problem. Both together give O(α(n)). Mention both; implement at least path compression plus union by size."],
      ["What is α(n) intuitively?", "The inverse of a function that grows absurdly fast (Ackermann's). For every input size that will ever exist, α(n) ≤ 4, so it is constant in practice, but not in theory."],
      ["Union by rank or by size?", "Both give the same bounds. Size is often more useful because you also need component sizes."],
      ["Can union-find handle edge deletions?", "Not directly. If all operations are known in advance, reverse time (deletions become additions), or use a rollback DSU in divide and conquer over time."],
      ["Is O(α(n)) per operation a worst-case or amortised bound?", "Amortised: a single find can still walk a path of length O(log n), but it compresses that path, so the total over m operations is O(m·α(n)). With union by size alone, each find is O(log n) worst case."],
      ["Should union return the new root or a boolean?", "Return what callers need. A boolean (\"did a merge happen?\") serves Kruskal, cycle detection and component counting. If callers need the root (to update per-set data), return it, or update the data inside union."],
      ["Can I use DSU for a graph whose vertices are coordinates up to 10⁹?", "Yes, with a dictionary-based DSU or by compressing coordinates to indices first. Only the vertices that actually appear need entries."],
    ],
    revise: md`
? Path compression? :: During find, point nodes toward the root.
? Union by size? :: Attach the smaller tree under the larger.
? Amortised cost with both? :: O(α(n)), effectively constant.
? Either alone? :: O(log n).
? Count components? :: Start at n; decrement on each successful union.
? Deletions? :: Not supported: reverse time offline, or rollback DSU.
? Why does union by size bound depth by log n? :: A node's depth grows only when its tree at least doubles.
? Path halving line? :: parent[x] = parent[parent[x]]; x = parent[x].
? Merging per-set lists cheaply? :: Merge smaller into larger: O(n log n) total.
? Dictionary DSU? :: parent.setdefault(x, x) inside find for sparse keys.
`,
    pitfalls: ["Comparing x and y instead of find(x) and find(y)", "Recursive find on deep chains before compression", "Forgetting to update size at the new root"],
    quiz: [Q("union returns False when…", ["sizes are equal", "*both elements already share a root", "the graph is a tree", "rank is zero"], "That is how cycles are detected.")],
    template: `struct DSU {
  vector<int> p, sz; int comps;
  DSU(int n): p(n), sz(n, 1), comps(n) { iota(p.begin(), p.end(), 0); }
  int find(int x) { while (p[x] != x) { p[x] = p[p[x]]; x = p[x]; } return x; }
  bool unite(int a, int b) {
    a = find(a); b = find(b); if (a == b) return false;
    if (sz[a] < sz[b]) swap(a, b); p[b] = a; sz[a] += sz[b]; comps--; return true;
  }
};`,
    sources: [S.paper("Efficiency of a good but not linear set union algorithm (Tarjan, 1975)", "Journal of the ACM", "https://doi.org/10.1145/321879.321884"), S.article("Disjoint set union", "cp-algorithms", "https://cp-algorithms.com/data_structures/disjoint_set_union.html"), S.book("Algorithms, 4th ed. §1.5 Case Study: Union-Find", "Sedgewick & Wayne", "https://algs4.cs.princeton.edu/15uf/")],
    problems: [547, 323, 684, 990],
  },
  "dsu-applications": {
    blurb: "Union-find in the wild: merging accounts, equations, similar strings, stones and islands added over time. The trick is choosing what to union.",
    signals: ["Group items that are transitively equivalent", "Connectivity questions while edges are added", "Count groups after merging rules"],
    lesson: md`
## The modelling question

Union-find solves a problem once you decide two things: **what the elements are**, and **which pairs must end up in the same group**. After that the code is always the same: union every related pair, then answer the question with find, component counts or set sizes. Most difficulty is in seeing the equivalence relation hidden in the statement: "connected", "equal", "can be swapped", "share an email", "in the same row or column".

## The catalogue

| Problem | Elements | Union | Answer |
|---|---|---|---|
| Number of Provinces (LC 547) | cities | directly connected pairs | number of components |
| Redundant Connection (LC 684) | vertices | each edge in order | the first edge whose union fails |
| Graph Valid Tree (LC 261) | vertices | each edge | no failed union and exactly n − 1 edges |
| Accounts Merge (LC 721) | emails | all emails of one account | group emails by root, sort, attach the name |
| Satisfiability of Equality Equations (LC 990) | letters | every "a==b" | then fail if any "a!=b" has the same root |
| Most Stones Removed (LC 947) | rows and columns | each stone unions its row with its column | stones − components |
| Smallest String With Swaps (LC 1202) | indices | each swap pair | sort characters within each component |
| Lexicographically Smallest Equivalent String (LC 1061) | letters | each pair, keep the smaller letter as root | map each letter to its root |
| Making a Network Connected (LC 1319) | computers | each cable | components − 1, or −1 if cables < n − 1 |
| Number of Islands II (LC 305) | cells r·C + c | new land with adjacent land | component count after each addition |
| Similar String Groups (LC 839) | strings | pairs differing by one swap | number of components |
| Largest Component Size by Common Factor (LC 952) | numbers and primes | each number with each of its prime factors | largest set size counting numbers only |
| Remove Max Number of Edges (LC 1579) | vertices, two DSUs | shared edges first, then each type | removed edges, or −1 if either is disconnected |

## Patterns worth naming

- **Two-phase**: union everything first, then check constraints or answer queries (equality equations, swaps). Checking "!=" before all "==" are processed would miss transitive equalities.
- **Answer = items − components** when each union "absorbs" one item. In Most Stones Removed, every component of stones can be reduced to one stone (remove stones in reverse DFS order so each removed stone still shares a row or column with a remaining one), so the removable count is stones − components.
- **Separate id spaces**: rows as 0..R − 1 and columns as R..R + C − 1 (or offset by 10⁴) so a row and a column with the same index are different elements.
- **Bridge through an attribute**: instead of comparing all pairs of numbers (O(n²)), union each number with its prime factors (LC 952) or each email with its account; items sharing an attribute meet at the attribute's node.
- **Smallest representative**: when the root must be the smallest element (LC 1061), always attach the larger root under the smaller.
- **Two DSUs** when different agents see different edges (Alice and Bob in LC 1579): add shared edges to both first, since each shared edge can replace two private ones.

## Worked example: Accounts Merge

Each account is [name, email1, email2, …]. Union every email with the first email of the same account. Then group all emails by find(email), sort each group, and prepend the name (taken from any email's owner). Emails shared between two accounts merge those accounts automatically, transitively. O(N α(N) + N log N) for N emails, the log from sorting.

## Worked example: Satisfiability of Equality Equations

Union the two letters of every "a==b". Then, for every "a!=b", if find(a) == find(b), return false. 26 elements, linear in the number of equations. The two-phase order matters because a == b and b == c imply a == c even if they appear after "a != c".

## DSU vs BFS/DFS

For a static graph given up front, BFS/DFS components are equally fast and sometimes simpler. DSU is better when:

- edges arrive over time and questions interleave (online connectivity, Number of Islands II);
- the graph is implicit in rules (shared attributes) and building adjacency would be quadratic;
- you need to merge per-group data (sizes, minima) as groups form;
- edges are processed in sorted order (Kruskal, threshold sweeps).

## Interview angles

- Name the elements and the unions in one sentence before coding.
- Mention the two-phase order for constraint-checking problems.
- For "minimum operations to connect", the answer is usually components − 1 with a feasibility check on the number of edges.

## Connections

Kruskal is DSU over sorted edges; offline queries add sorting by threshold; weighted and parity DSU add relations along the edges.
`,
    doubts: [
      ["Why is Most Stones Removed equal to stones − components?", "Within a connected group of stones (sharing rows or columns transitively), you can always remove stones one by one until a single stone remains. Each component keeps one stone."],
      ["Why check '!=' after all '=='?", "Equalities are transitive and must all be applied before a disequality can be checked; checking early could miss an equality that arrives later in the list."],
      ["Why does Graph Valid Tree need both checks (no failed union and n − 1 edges)?", "A tree is connected and acyclic. No failed union means acyclic; exactly n − 1 edges then forces connectivity (an acyclic graph with c components has n − c edges, so c = 1). Either condition alone is insufficient."],
      ["How do I avoid O(n²) comparisons in Similar String Groups?", "For few long strings, compare all pairs (n²·L). For many short strings, generate every single-swap neighbour of each string (L² per string) and union with it if it exists in a set. Choose by whichever of n² or n·L² is smaller."],
      ["What if the problem asks for the size of the group containing x after each union?", "Keep size at the root and read size[find(x)]. Sizes are only valid at roots, so always go through find."],
    ],
    revise: md`
? Modelling question? :: What are the elements, and which pairs are merged?
? Accounts Merge? :: Union emails within each account; group by root; sort.
? Most Stones Removed? :: Union row id with column id per stone; answer = stones − components.
? Equality equations? :: Union all ==, then verify every != has different roots.
? Smallest String With Swaps? :: Union swappable indices; sort characters per component.
? Network connected? :: Need ≥ n − 1 cables; answer = components − 1.
? Largest Component Size by Common Factor? :: Union each number with its prime factors; count numbers per root.
? Remove Max Number of Edges? :: Two DSUs; add shared (type 3) edges first; check both connected.
? Why can a stone component be reduced to one stone? :: Remove in reverse DFS order; each removed stone still shares a line with a remaining one.
? Making a Network Connected? :: −1 if cables < n − 1, else components − 1.
`,
    pitfalls: ["Row and column ids colliding", "Checking disequalities before all unions", "Forgetting to map keys to ids"],
    quiz: [Q("Stones at (0,0),(0,1),(1,0),(1,2),(2,1),(2,2): maximum removable?", ["3", "4", "*5", "6"], "All stones form one component: 6 − 1.")],
    sources: [S.article("Disjoint set union (applications)", "cp-algorithms", "https://cp-algorithms.com/data_structures/disjoint_set_union.html"), S.article("Union-find applications", "USACO Guide", "https://usaco.guide/gold/dsu")],
    problems: [721, 547, 684, 990, 947, 839, 1202, 305, 1061, 1319, 399],
  },
  "weighted-dsu": {
    blurb: "Union-find that also stores a relation to the parent (a ratio, an offset, a parity), so it can answer \"what is a/b?\" or \"same or opposite team?\" while merging.",
    signals: ["Ratios between variables (a / b = k)", "Parity or opposition constraints (enemies, bipartiteness online)", "Relative positions or offsets that must stay consistent"],
    lesson: md`
## Relations, not just membership

A plain DSU answers "are a and b in the same group?". A **weighted DSU** also answers "what is the relation between a and b?" when relations compose along paths: ratios (a / b), differences (a − b), parities (same side or opposite side), modular offsets. Each node stores the relation to its parent; composing relations up to the root gives the relation to the root, and the relation between two nodes in the same group is derived from their relations to the common root.

## The structure

- parent[x]: as usual.
- weight[x]: the relation from x to parent[x] (for ratios, x / parent[x]; for differences, value[x] − value[parent[x]]; for parity, 0 if same side, 1 if opposite).

**find(x) with compression** must compose weights along the path, so that after compression weight[x] is the relation from x to the root:

\`\`\`python
def find(x):
    if parent[x] != x:
        p = parent[x]
        root = find(p)            # compresses p first: weight[p] is now p → root
        weight[x] *= weight[p]    # x → p composed with p → root (use + or ^ for other relations)
        parent[x] = root
    return parent[x]
\`\`\`

The order matters: compose with the parent's weight **after** the parent has been compressed, so you combine x → p with p → root, not with p → its old parent.

## Evaluate Division (LC 399)

Equations a / b = k; queries a / b = ?

- weight[x] = x / parent[x].
- **union(a, b, k)**: find roots ra and rb; after find, wa = a / ra and wb = b / rb. We want ra / rb: since a = wa·ra and b = wb·rb and a / b = k, ra / rb = k·wb / wa. Set parent[ra] = rb, weight[ra] = k·wb / wa.
- **query(a, b)**: unknown variables or different roots → −1.0; otherwise (a / root) / (b / root) = wa / wb.

Dry run: a / b = 2, b / c = 3. After both unions, a, b, c share a root; query a / c = 6, c / a = 1/6, a / a = 1, x / x for unknown x = −1.

A BFS/DFS over a weighted graph (edge a → b with weight k and b → a with 1/k), multiplying along the path for each query, is a fine alternative for small inputs: O(Q·(V + E)) versus near-constant per query for the DSU.

## Parity DSU

weight[x] ∈ {0, 1}: whether x is on the same side (0) or the opposite side (1) of its parent. Composition is XOR.

- **Adding a constraint "u and v differ"** (an edge in a bipartite check): roots ru, rv with parities pu, pv. If ru == rv, the constraint holds iff pu ^ pv == 1; otherwise it is a contradiction (an odd cycle). If ru ≠ rv, set parent[ru] = rv and weight[ru] = pu ^ pv ^ 1.
- **"u and v are the same"**: the same with the target parity 0.

Uses: online bipartiteness (edges arrive, report the first one that creates an odd cycle), "friend or enemy" puzzles, possible bipartition with mixed constraints, checking consistency of statements like "A and B are on the same team".

## Offsets and modular relations

weight[x] = value[x] − value[parent[x]]; composition is addition. Constraints "x − y = d" are checked online: same root → verify the derived difference equals d; different roots → link with the offset that makes it true. This is the online version of a system of difference equalities.

Modular relations (mod 3 for the classic "food chain" puzzle: A eats B, B eats C, C eats A) use addition mod 3: weight 0 = same species, 1 = eats parent, 2 = eaten by parent.

## Union by size with weights

Union by size still works: when attaching ru under rv you set weight[ru] to make the new constraint hold; attaching rv under ru instead requires the inverse relation (1 / k for ratios, −d for differences, the same bit for parity). Choose the direction by size and invert the weight if needed.

## Implementation detail: iterative find

For long chains (or languages without deep recursion), collect the path from x to the root, then walk it **from the node nearest the root back down to x**, accumulating the relation and setting each node's parent to the root and its weight to the accumulated relation. Updating from x upward would combine with stale parent weights.

## Interview angles

- Explain what weight[x] means in one sentence; everything else follows.
- Derive the union formula on the board (k·wb / wa) rather than memorising it.
- Mention the BFS alternative for Evaluate Division and when the DSU is better (many queries).

## Connections

Parity DSU generalises the bipartite test; offset DSU handles difference constraints online (Bellman–Ford handles inequality constraints offline); Kruskal-style processing can also carry weights.
`,
    doubts: [
      ["Why must weights be composed during path compression?", "Compression changes x's parent to the root. weight[x] must then describe x relative to the root, which is the composition of the relations along the old path."],
      ["Evaluate Division with BFS instead?", "Fine for the LeetCode limits: build a graph with edges a→b (k) and b→a (1/k) and multiply along a BFS path per query. Weighted DSU answers each query in near-constant time."],
      ["Why can't I compose the weight before compressing the parent?", "Before compression, weight[p] is p's relation to its old parent, not to the root. Composing with it gives x's relation to that old parent, and then setting parent[x] = root attaches x with the wrong relation. Compress p first so weight[p] means p → root."],
      ["Evaluate Division with floating-point weights: will errors accumulate?", "Slightly, through repeated multiplications, but the inputs are small and compression keeps paths short. If exactness matters, store ratios as fractions (numerator, denominator) reduced by gcd."],
      ["Can a weighted DSU handle inequalities like x − y ≤ d?", "No. Composition works for equalities (relations that are functions). Inequalities form a system of difference constraints, solved with Bellman–Ford on the constraint graph (a negative cycle means infeasible)."],
    ],
    revise: md`
? Weighted DSU stores? :: The relation of each node to its parent, composed to the root on find.
? Ratio union formula? :: weight[ra] = k · wb / wa (with a/b = k, wa = a/ra, wb = b/rb).
? Parity composition? :: XOR.
? Online bipartiteness? :: Parity DSU: an edge between equal-parity nodes with the same root = odd cycle.
? Parity union formula (different roots)? :: parent[ru] = rv, weight[ru] = pu ^ pv ^ target (target 1 for "differ").
? Food chain relation encoding? :: Offsets mod 3: 0 same, 1 eats, 2 eaten.
? Iterative weighted find order? :: Fix nodes from the one nearest the root down to x.
? Inverting a ratio link when attaching the other way? :: Use 1/k (or −d for differences).
`,
    pitfalls: ["Updating weights in the wrong order during compression", "Division by zero / unknown variables in queries"],
    quiz: [Q("Parity DSU: u and v share a root with parities 1 and 1. Adding edge u–v…", ["is fine", "*creates an odd cycle (not bipartite)", "creates an even cycle", "merges two components"], "Same parity means same side.")],
    sources: [S.article("Disjoint-set data structure", "Wikipedia", "https://en.wikipedia.org/wiki/Disjoint-set_data_structure"), S.article("Disjoint set union: supporting the parity / distance to the representative", "cp-algorithms", "https://cp-algorithms.com/data_structures/disjoint_set_union.html#support-the-parity-of-the-path-length-checking-bipartiteness-online")],
    problems: [399, 785, 886],
  },
  "offline-dsu": {
    blurb: "Sort queries and edges together, or run time backwards, so a structure that only supports merging can answer threshold and deletion problems.",
    signals: ["Queries with a limit (\"using edges < limit, connected?\")", "Edges or cells removed over time", "Answer many queries that can be reordered"],
    lesson: md`
## Offline means "all queries known up front"

Union-find supports adding edges and checking connectivity, but not removing edges, and it answers about the current graph only. Many problems need more: "are u and v connected using only edges lighter than L?", "after these deletions, how big is the component?". When all queries are known in advance, you may **reorder** the work so that the graph only ever grows. That is what "offline" buys.

## Sort and sweep

**Checking Existence of Edge Length Limited Paths** (LC 1697): for each query (u, v, limit), is there a path using only edges with weight strictly less than limit?

1. Sort edges by weight.
2. Sort queries by limit (keep their original indices).
3. Sweep queries in increasing limit; before answering one, union every edge with weight < limit not yet added (a pointer into the sorted edges).
4. The answer is find(u) == find(v); write it at the query's original index.

O(E log E + Q log Q + (E + Q)·α). This is Kruskal's algorithm with queries interleaved: the graph at each moment is exactly the set of edges below the current threshold.

The same "threshold sweep" pattern:

- **Number of Good Paths** (LC 2421): a good path has equal values at both ends and no larger value inside. Process nodes in increasing value; when activating node v, union it with already-active neighbours (values ≤ v). Then, for the group of nodes with value v, count how many share each root: c nodes in one component give c·(c − 1)/2 new good paths (plus the single-node paths).
- **Path With Minimum Effort** (LC 1631) and **Swim in Rising Water** (LC 778): add edges (or cells) in increasing cost until the start and end connect; the last cost added is the answer.
- **Minimum Score of a Path Between Two Cities** (LC 2492): the component of city 1 and its minimum edge.
- **Maximum Segment Sum After Removals** (LC 2382): reverse the removals into additions, merging adjacent active segments and tracking the maximum sum.

## Reverse time for deletions

If the full list of deletions is known, start from the final state (everything deleted) and process the deletions **backwards** as insertions, recording answers in reverse.

**Bricks Falling When Hit** (LC 803): bricks stay up if connected to the top row. Hits remove bricks one by one; after each hit, how many other bricks fall?

1. Apply all hits (mark the hit cells empty; skip hits on empty cells).
2. Build the DSU on the remaining bricks with a virtual **roof** node: every brick in the top row is unioned with it.
3. Process hits in reverse: restore the brick, union it with its neighbours (and the roof if in the top row). The number of bricks newly attached to the roof is size(roof after) − size(roof before) − 1 (minus the restored brick itself); clamp at 0. That is the answer for this hit.

The roof node turns "connected to the top row" into an ordinary connectivity question.

## Rollback DSU and divide and conquer over time

When edges are both added and removed and queries interleave in arbitrary order, use a **rollback DSU**: union by size, **no** path compression, and a stack of changes (which root was attached under which). Undo pops the stack and restores the parent and size. Each operation is O(log n).

**Offline dynamic connectivity**: every edge is present during some time intervals. Put each interval onto the O(log T) nodes of a segment tree over time. DFS the segment tree: on entering a node, union its edges; at a leaf, answer that time's queries; on leaving, roll back. O((E + Q) log T · log n) in total. Name-level for interviews, but it shows you know how to beat the "no deletions" limitation.

## Kruskal reconstruction tree

Run Kruskal, but whenever two components merge through an edge of weight w, create a new node with value w whose children are the two components' representative nodes. The result is a binary tree with the original vertices as leaves.

- The minimax edge (the smallest possible maximum edge on any path) between u and v is the value at their LCA.
- "All vertices reachable from u using edges ≤ L" is a subtree: climb from u while the ancestor's value ≤ L (binary lifting), then the leaves below.

It turns threshold connectivity into tree queries and handles online queries after an O(E log E) build.

## Interview angles

- Ask whether queries are known in advance; if yes, sorting them is often the key.
- For deletions, say "reverse time" and explain what the final state is.
- Mention the virtual node trick for "connected to the boundary" conditions.

## Connections

Kruskal is the canonical sort-and-sweep. Minimax paths connect to Dijkstra with max instead of plus, and to binary search on the threshold plus BFS.
`,
    doubts: [
      ["Why does sorting queries make DSU applicable?", "Each query asks about a graph restricted to edges below a limit. As the limit grows, the graph only gains edges, which DSU handles. Sorting puts queries in exactly that growing order."],
      ["Why a virtual roof node in Bricks Falling?", "Stable means connected to the top row. Uniting every top-row brick with one virtual node turns 'connected to the roof' into 'same component as the roof node', and component sizes answer how many bricks a hit drops."],
      ["Why not use path compression in a rollback DSU?", "Compression changes many parent pointers during a find, and undoing them would require logging every change, destroying the O(log n) bound. Union by size alone keeps trees shallow (depth ≤ log n), and each union changes just one parent and one size, which is cheap to undo."],
      ["When is the sort-and-sweep approach not enough?", "When queries must be answered online (each query depends on the previous answer), or thresholds go both up and down per query. Then build a Kruskal reconstruction tree (static, answers any threshold online) or use persistent structures."],
      ["Why \"strictly less than limit\" matters in LC 1697?", "The comparison decides which edges are added before answering. Using ≤ instead of < would include edges equal to the limit, which the problem forbids. Sort edges and advance the pointer while weight < limit."],
    ],
    revise: md`
? Threshold queries recipe? :: Sort edges and queries by weight/limit; union edges below each limit; answer with find.
? Deletions known in advance? :: Reverse time: start from the end state and add back.
? Bricks Falling trick? :: Virtual roof node; add hits back in reverse; measure roof-component growth.
? Interleaved adds and deletes? :: Rollback DSU (no compression) + segment tree over time.
? Number of Good Paths counting? :: Activate nodes by value; c same-value nodes in one component add c(c−1)/2.
? Bricks Falling answer per reversed hit? :: max(0, roof size after − before − 1).
? Rollback DSU requirement? :: Union by size without path compression, plus a change stack.
? Kruskal reconstruction tree minimax query? :: Value at LCA(u, v).
`,
    pitfalls: ["Losing original query order (store indices)", "Path compression in a rollback DSU (breaks undo)"],
    quiz: [Q("Queries 'connected using edges with weight < L' are answered offline by…", ["Dijkstra per query", "*sorting edges and queries, sweeping with DSU", "Floyd–Warshall", "BFS per query"], "Kruskal-style sweep.")],
    sources: [S.article("Deleting from a data structure in O(T(n) log n) (offline dynamic connectivity)", "cp-algorithms", "https://cp-algorithms.com/data_structures/deleting_in_log_n.html"), S.article("Disjoint set union", "cp-algorithms", "https://cp-algorithms.com/data_structures/disjoint_set_union.html")],
    problems: [1697, 2421, 803, 1724],
  },

  // ─────────────── shortest paths ───────────────
  dijkstra: {
    blurb: "Shortest paths from one source with non-negative weights: always settle the closest unsettled vertex. Heap implementation, correctness argument, and why negative edges break it.",
    signals: ["Weighted graph, non-negative weights, minimum total cost", "Network delay, cheapest route, minimum time", "Grid with varying move costs"],
    widgets: ["dijkstra"],
    lesson: md`
## The problem

Single-source shortest paths: from a source s, find the cheapest path to every vertex in a graph with **non-negative** edge weights. Dijkstra's algorithm (1956, published 1959) is the standard answer: road networks, network routing (OSPF and IS-IS run it on link-state databases), game pathfinding (as the base of A*), and any "minimum cost" problem whose moves have non-negative costs.

## The algorithm

Keep tentative distances. Repeatedly settle the unsettled vertex with the smallest tentative distance, and relax its outgoing edges.

\`\`\`python
import heapq
def dijkstra(adj, s):
    dist = [float("inf")] * len(adj); dist[s] = 0
    pq = [(0, s)]
    while pq:
        d, u = heapq.heappop(pq)
        if d > dist[u]: continue           # stale entry: u was already settled cheaper
        for v, w in adj[u]:
            nd = d + w
            if nd < dist[v]:
                dist[v] = nd
                heapq.heappush(pq, (nd, v))
    return dist
\`\`\`

O((V + E) log V) with a binary heap. This "lazy" version pushes a new entry instead of decreasing a key, so the heap can hold up to E entries: O(E log E), which is the same as O(E log V) since log E ≤ 2 log V.

[[widget:dijkstra]]

**The stale check.** When a vertex's distance improves, its old heap entries stay behind. Without "if d > dist[u]: continue", those entries are processed again and relax edges with outdated distances: still correct, but much slower (each vertex can be expanded once per incoming edge).

Dry run, edges A→B 4, A→C 1, C→B 2, B→D 1, C→D 5, from A: pop A (0): B = 4, C = 1. Pop C (1): B = min(4, 3) = 3, D = 6. Pop B (3): D = min(6, 4) = 4. Pop stale B (4): skip. Pop D (4). Pop stale D (6): skip. Distances: A 0, C 1, B 3, D 4.

## Why it is correct

Invariant: when u is popped with d = dist[u], d is the true shortest distance.

Suppose not: a shorter path P to u exists. P starts at s (settled) and ends at u (not yet settled), so it leaves the settled set at some edge x → y with x settled and y not. When x was settled, the edge x → y was relaxed, so dist[y] ≤ dist[x] + w(x, y) ≤ length(P) (the rest of P after y has non-negative weight). And length(P) < d. So dist[y] < d, meaning y would have been popped before u. Contradiction.

The argument uses "the rest of P has non-negative weight". That is exactly where negative edges break it.

## Negative weights

Even one negative edge can make Dijkstra wrong: with A→B 2, A→C 3, C→B −2, Dijkstra settles B at 2 before discovering A→C→B = 1. Options:

- **Bellman–Ford** (O(V·E)) or SPFA for general graphs with negative edges (and to detect negative cycles).
- **Topological relaxation** (O(V + E)) for DAGs, where negative weights are harmless.
- **Johnson's reweighting**: one Bellman–Ford run computes potentials h, and w'(u, v) = w(u, v) + h(u) − h(v) ≥ 0, so Dijkstra can then run from every source.
- Adding a constant to every edge does **not** work: it penalises paths with more edges, changing which path is shortest.

## Variants and details

- **Early exit**: stop when the target is popped (single-pair queries).
- **Path reconstruction**: set parent[v] = u on each successful relaxation; walk back from the target.
- **Dense graphs**: the O(V²) array version (scan for the minimum unsettled vertex each step) beats the heap when E ≈ V², for example on complete graphs of points.
- **Multiple sources**: push every source with distance 0 (nearest hospital, nearest exit).
- **Counting shortest paths** (LC 1976): ways[v] = ways[u] when a strictly shorter distance is found; ways[v] += ways[u] when equal. Take a modulus.
- **Second shortest path** (LC 2045 and similar): keep the best two distinct distances per vertex; a vertex may be popped twice.
- **K shortest paths (not necessarily simple)**: allow each vertex to be popped up to K times.
- **Network Delay Time** (LC 743): the maximum of all distances, or −1 if some vertex is unreachable.
- **Path with Maximum Probability** (LC 1514): maximise the product of probabilities; use a max-heap with multiplication (probabilities ≤ 1 make it monotone), or minimise the sum of −log p.
- **Path With Minimum Effort** (LC 1631): the cost of a path is its largest step; Dijkstra works with max instead of + because max is also monotone.
- **Minimum Weighted Subgraph With the Required Paths** (LC 2203): Dijkstra from src1, from src2 and from dest on the reversed graph; answer = min over meeting vertices of the three sums.

## Dijkstra vs BFS vs Bellman–Ford vs Floyd

| Weights | Single source | All pairs |
|---|---|---|
| unweighted | BFS O(V + E) | BFS from each vertex |
| 0/1 | 0-1 BFS O(V + E) | |
| non-negative | Dijkstra O(E log V) | Dijkstra from each vertex |
| negative, no negative cycles | Bellman–Ford O(V·E) | Floyd–Warshall O(V³), Johnson |
| DAG, any weights | topological relaxation O(V + E) | |

## Dijkstra vs Prim

The code looks almost identical: both grow a set using a heap. Dijkstra keys a vertex by its distance from the source (dist[u] + w); Prim keys it by the single edge weight connecting it to the tree (w). Dijkstra builds a shortest-path tree; Prim builds a minimum spanning tree. They are different trees in general.

## Interview angles

- State the non-negative requirement and the stale-entry check.
- Give the complexity with a binary heap and mention the O(V²) version for dense graphs.
- Expect variants: reconstruct the path, count shortest paths, change the cost function.

## Connections

0-1 BFS and Dial's algorithm are Dijkstra with special queues; A* adds a heuristic; Dijkstra over expanded states handles extra constraints; Johnson's algorithm combines it with Bellman–Ford.
`,
    doubts: [
      ["Why is the lazy 'if d > dist[u]: continue' needed?", "A vertex can be pushed several times as its distance improves. Older entries are stale: processing them would relax edges with outdated distances, wasting time (and in some variants causing wrong counts)."],
      ["Why does a single negative edge break Dijkstra?", "Dijkstra finalises a vertex when popped. A cheaper route that goes through a negative edge discovered later cannot correct a finalised vertex's descendants. Example: s→a (2), s→b (5), b→a (−4): Dijkstra settles a at 2, but the true distance is 1."],
      ["Can I add a constant to make weights non-negative?", "No. Paths with more edges get penalised more, changing which path is shortest. Johnson's algorithm instead reweights with potentials from Bellman–Ford, which preserves shortest paths."],
      ["Is Dijkstra the same as Prim?", "Same skeleton, different key: Prim keys a vertex by the single cheapest edge connecting it to the tree; Dijkstra keys it by the total distance from the source."],
      ["Why does adding a constant to every edge not fix negative weights?", "A path with k edges gains k times the constant. Paths with more edges are penalised more, so the cheapest path can change. Johnson's reweighting instead adds h(u) − h(v), which telescopes along any path to h(s) − h(t), the same for every s–t path, so shortest paths are preserved."],
      ["Can Dijkstra handle zero-weight edges?", "Yes. The correctness proof needs weights ≥ 0, so zero is fine. With many zero edges, 0-1 BFS (if other weights are 1) or Dijkstra both work."],
      ["Is decrease-key ever worth implementing?", "In interviews, no: the lazy version is simpler and has the same O(E log V) bound. An indexed heap with decrease-key bounds the heap at V entries, which can matter for memory on very dense graphs; Fibonacci heaps give O(E + V log V) in theory but are slower in practice."],
    ],
    revise: md`
? Dijkstra complexity (binary heap)? :: O((V + E) log V).
? Stale entry check? :: if d > dist[u]: continue.
? Why correct? :: Popped distances are final because remaining weights are non-negative.
? Negative edges? :: Not allowed: use Bellman–Ford or DAG relaxation.
? Dense graph version? :: O(V²) array scan.
? Count shortest paths? :: Add ways on ties, reset on strict improvement.
? Max probability path? :: Max-heap on probability (or Dijkstra on −log p).
? Dijkstra dry run counterexample for negatives? :: A→B 2, A→C 3, C→B −2: settles B at 2, true distance 1.
? Johnson's reweighting? :: w'(u,v) = w(u,v) + h(u) − h(v) ≥ 0 with h from Bellman–Ford.
? Minimum Weighted Subgraph (LC 2203)? :: Dijkstra from src1, src2 and from dest on the reversed graph; min over meeting vertices.
? Why max-cost (effort) still works in Dijkstra? :: max is monotone: extending a path never lowers its cost.
`,
    pitfalls: ["Using Dijkstra with negative weights", "Not skipping stale entries", "Marking vertices visited when pushed (wrong for Dijkstra)", "Overflow when distances exceed 32 bits"],
    quiz: [
      Q("s→a (2), s→b (5), b→a (−4). Dijkstra reports dist(a) =", ["1", "*2", "5", "−4"], "a is settled at 2 before b is processed; the true distance is 1."),
      Q("Dijkstra on a complete graph with 5000 vertices: better implementation?", ["Binary heap", "*O(V²) array scan", "Fibonacci heap always", "BFS"], "E ≈ V², so the heap adds a log factor."),
    ],
    sources: [S.paper("A note on two problems in connexion with graphs (Dijkstra, 1959)", "Numerische Mathematik", "https://doi.org/10.1007/BF01386390"), S.article("Dijkstra algorithm (dense and sparse)", "cp-algorithms", "https://cp-algorithms.com/graph/dijkstra.html"), S.book("Algorithms, 4th ed. §4.4 Shortest Paths", "Sedgewick & Wayne", "https://algs4.cs.princeton.edu/44sp/"), S.book("Algorithms, chapter 8: Shortest Paths", "Jeff Erickson", "https://jeffe.cs.illinois.edu/teaching/algorithms/book/08-sssp.pdf")],
    problems: [743, 1514, 1976, 2045, 1786, 882, 1631],
  },
  "zero-one-bfs": {
    blurb: "Edge weights only 0 or 1: a deque replaces Dijkstra's heap. Push 0-edges to the front and 1-edges to the back for O(V + E) shortest paths.",
    signals: ["Moves that are free versus moves that cost one (follow an arrow vs change it)", "Minimum number of obstacles to remove, walls to break, flips to make", "Grid with two kinds of steps"],
    lesson: md`
## When it applies

Every edge weighs 0 or 1, and you want shortest paths from a source. Typical shapes: "following the given direction is free, changing it costs 1", "walking on empty cells is free, removing an obstacle costs 1", "moving along an existing road is free, building one costs 1". BFS is wrong (it treats 0-edges as costing a step) and Dijkstra is correct but pays O(log V) per operation. 0-1 BFS gets Dijkstra's answer in O(V + E).

## The algorithm

Use a deque instead of a priority queue. Pop from the front. When relaxing an edge:

- weight 0 → push the neighbour to the **front** (it is as close as the current vertex);
- weight 1 → push it to the **back** (one farther).

\`\`\`python
from collections import deque
def zero_one_bfs(adj, s):
    dist = [float("inf")] * len(adj); dist[s] = 0
    dq = deque([s])
    while dq:
        u = dq.popleft()
        for v, w in adj[u]:
            if dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                if w == 0: dq.appendleft(v)
                else: dq.append(v)
    return dist
\`\`\`

O(V + E): each vertex can be pushed a small number of times (at most once per improvement, and each vertex improves at most twice in practice), and every push and pop is O(1).

## Why the order stays correct

Dijkstra needs to pop vertices in non-decreasing distance order. In 0-1 BFS the deque always holds distances from just two consecutive values, d and d + 1, with all the d's in front of all the d + 1's:

- popping u gives the smallest distance d (front);
- a 0-edge produces distance d, pushed to the front: still in front of every d + 1;
- a 1-edge produces d + 1, pushed to the back: behind every d.

So the deque behaves exactly like Dijkstra's heap restricted to two keys, and the same correctness proof applies. A vertex may sit in the deque twice (first with d + 1 via a 1-edge, later improved to d via a 0-edge); the second copy is popped first, and the stale one is harmless (add "if processed: continue" or compare against dist to skip it).

## Problems

- **Minimum Cost to Make at Least One Valid Path in a Grid** (LC 1368): each cell has an arrow. Moving in the arrow's direction costs 0; any other direction costs 1 (changing the arrow). 0-1 BFS from the top-left; the answer is the distance to the bottom-right. O(R·C).
- **Minimum Obstacle Removal to Reach Corner** (LC 2290): entering an empty cell costs 0, an obstacle costs 1.
- **Reorder Routes to Make All Paths Lead to the City Zero** (LC 1466): each road u → v also gets a reverse edge; travelling against a road's direction costs 1. With a tree this is just a DFS counting reversed edges, but 0-1 BFS shows the idea.
- **Minimum edge reversals** to make a path from s to t in a directed graph: for every edge u → v add v → u with weight 1 and keep u → v with weight 0.
- **Shortest path in a grid where some moves are teleports** (free) and others are steps (cost 1).
- **Minimum number of walls to break** in a maze, **minimum flips** of a binary grid to connect two regions.

## Generalisations

- **Dial's algorithm**: weights are small integers 0..C. Keep C + 1 buckets in a circle indexed by distance mod (C + 1); pop from the current bucket, move to the next when empty. O(V·C + E). 0-1 BFS is Dial with C = 1.
- **Weights 1 and 2**: split each 2-edge with a dummy vertex into two 1-edges and run BFS; or Dial with three buckets.
- **General non-negative weights**: back to Dijkstra.
- **Multi-source 0-1 BFS**: push every source at distance 0 at the start.

## Interview angles

- Recognise the "free versus cost 1" wording and say "0-1 BFS, O(V + E)".
- Explain the deque invariant (two consecutive distances, front ≤ back).
- Mention that Dijkstra also works, just with a log factor.

## Connections

0-1 BFS sits between BFS (all weights 1) and Dijkstra (any non-negative weights). Edge-reversal problems turn directed constraints into 0/1 weights.
`,
    doubts: [
      ["Why does pushing to the front for 0-edges keep the order correct?", "A 0-edge gives v the same distance as u, which is the smallest distance currently in the deque, so v belongs at the front. A 1-edge gives distance + 1, the largest value the deque can hold, so v belongs at the back."],
      ["Can a vertex be processed twice?", "It can be pushed twice if its distance improves; when popped again with the improved value, it is processed correctly. Either allow it or skip pops whose stored distance is stale."],
      ["Should I mark a vertex visited when it is first pushed, as in BFS?", "No. A vertex first reached by a 1-edge may later be reached more cheaply by a 0-edge, so its distance must stay improvable until it is popped. Use the dist comparison on relaxation (as in Dijkstra) and optionally skip a vertex popped a second time."],
      ["Why is 0-1 BFS faster than Dijkstra in practice, not just in theory?", "Deque operations are O(1) and cache-friendly, while heap pushes and pops are O(log V) with scattered memory access. On large grids (10⁶ cells) the difference is several times."],
      ["Can 0-1 BFS have negative weights?", "No. Like Dijkstra it relies on distances never decreasing along popped vertices. A −1 edge would break the two-value deque invariant."],
    ],
    revise: md`
? 0-1 BFS rule? :: 0-edge → push front; 1-edge → push back.
? Complexity? :: O(V + E).
? Edge reversal cost model? :: Forward edge 0, reversed edge 1.
? Weights in [0, k]? :: Dial's algorithm with k + 1 buckets.
? Dial's algorithm? :: Buckets per distance mod (C+1) for weights 0..C: O(V·C + E).
? Minimum edge reversals s→t? :: Keep u→v at 0, add v→u at 1; 0-1 BFS.
? Weights 1 and 2? :: Split 2-edges with a dummy vertex and BFS, or Dial with 3 buckets.
`,
    pitfalls: ["Using a plain queue (wrong with 0-edges)", "Using Dijkstra's heap (works but O(E log V))"],
    quiz: [Q("Minimum reversals to connect 1 to n in a directed graph: model?", ["BFS on original edges", "*0-1 BFS with reversed edges costing 1", "Dijkstra with all weights 1", "Topological sort"], "Original direction is free, reversing costs one.")],
    sources: [S.article("0-1 BFS", "cp-algorithms", "https://cp-algorithms.com/graph/01_bfs.html"), S.article("Dial's algorithm (bucket queue)", "Wikipedia", "https://en.wikipedia.org/wiki/Bucket_queue")],
    problems: [1368, 2290, 1466],
  },
  "bellman-ford": {
    blurb: "Relax every edge V − 1 times: handles negative weights, detects negative cycles, and with a round limit solves \"cheapest flight within K stops\".",
    signals: ["Negative edge weights", "Detect a negative cycle (arbitrage)", "At most K edges / stops on the path"],
    widgets: ["bellman-ford"],
    lesson: md`
## When it applies

Single-source shortest paths when **edges can be negative** (but no negative cycle is reachable from the source), plus detection of negative cycles. Also the natural algorithm when the number of edges on the path is limited (at most K edges), and the basis of distance-vector routing protocols (RIP), where each router only knows its neighbours' current estimates.

## The algorithm

Initialise dist[s] = 0 and every other distance to ∞. Repeat V − 1 times: for every edge (u, v, w), if dist[u] + w < dist[v], set dist[v] = dist[u] + w ("relax" the edge).

\`\`\`python
def bellman_ford(n, edges, s):
    dist = [float("inf")] * n; dist[s] = 0
    for _ in range(n - 1):
        changed = False
        for u, v, w in edges:
            if dist[u] + w < dist[v]:
                dist[v] = dist[u] + w; changed = True
        if not changed: break                 # early exit
    for u, v, w in edges:                     # one more round
        if dist[u] + w < dist[v]:
            return None                       # negative cycle reachable from s
    return dist
\`\`\`

O(V·E) time, O(V) space.

[[widget:bellman-ford]]

## Why V − 1 rounds suffice

**Claim:** after round i, dist[v] ≤ the length of the shortest path from s to v that uses at most i edges.

By induction: the shortest path with at most i edges ends with some edge u → v, and its prefix to u uses at most i − 1 edges, so after round i − 1 dist[u] is at most that prefix's length; relaxing u → v in round i gives the bound for v.

Without negative cycles, some shortest path to every vertex is simple, and a simple path has at most V − 1 edges. So after V − 1 rounds every distance is final.

**Negative cycle detection.** If any edge can still be relaxed in round V, some distance keeps decreasing, which only happens when a negative cycle is reachable. To find the affected vertices, run V more rounds and mark every vertex that improves, then propagate "−∞" to everything reachable from them.

## Cheapest Flights Within K Stops (LC 787)

At most K stops means at most K + 1 edges. Run exactly K + 1 rounds, but each round must relax from a **copy** of the previous round's distances:

\`\`\`python
prev = [inf] * n; prev[src] = 0
for _ in range(K + 1):
    cur = prev[:]
    for u, v, w in flights:
        if prev[u] + w < cur[v]: cur[v] = prev[u] + w
    prev = cur
return prev[dst] if prev[dst] < inf else -1
\`\`\`

Without the copy, a single round could chain several edges (relax u → v, then immediately v → x using the new dist[v]), letting paths with more than K + 1 edges sneak in. The copy makes round i correspond exactly to "at most i edges". Alternatives: BFS or Dijkstra over states (city, stops used).

## SPFA (queue-based Bellman–Ford)

Only vertices whose distance just changed can cause new improvements. Keep a queue of such vertices (and an in-queue flag); pop u, relax its outgoing edges, enqueue any improved neighbour not already queued. Average performance is often close to O(E), but the worst case is still O(V·E), and adversarial inputs exist. Negative cycle check: a vertex enqueued V times, or a shortest-path edge count reaching V.

## Applications

- **Negative edges without negative cycles**: rebates, energy gained on downhill segments, profits modelled as negative costs.
- **Currency arbitrage**: with weights −log(rate), a cycle whose rates multiply to more than 1 has negative total weight. A negative cycle is an arbitrage opportunity.
- **Difference constraints**: a system of inequalities x_j − x_i ≤ c becomes edges i → j with weight c, plus a super-source with 0-edges to every variable. If there is a negative cycle the system is infeasible; otherwise dist gives a solution (x_i = dist[i]). Used in scheduling with timing constraints.
- **Johnson's algorithm**: one Bellman–Ford from a super-source gives potentials h; reweighted edges w + h(u) − h(v) are non-negative, so V runs of Dijkstra give all-pairs shortest paths in O(V·E log V), better than Floyd on sparse graphs.
- **Distance-vector routing** (RIP): each router repeatedly updates its distances from its neighbours' — a distributed Bellman–Ford, with the "count to infinity" problem when links fail.

## Interview angles

- Explain the round invariant ("after i rounds, all paths with at most i edges are correct").
- For K stops, explain the copy; it is the bug interviewers look for.
- Mention SPFA and its worst case, and Johnson's algorithm for all pairs.

## Connections

Dijkstra is faster when weights are non-negative; Floyd–Warshall handles all pairs with negative edges for small V; DP on DAGs handles negative edges in linear time when there are no cycles.
`,
    doubts: [
      ["Why must K-stops use a copy of the previous round?", "Relaxing in place lets an edge use a distance improved earlier in the same round, effectively chaining two edges in one round and exceeding the stop limit."],
      ["Does Bellman–Ford work on undirected graphs with negative edges?", "An undirected negative edge is a negative cycle of length 2 (go back and forth), so shortest paths are undefined. Negative weights only make sense on directed graphs."],
      ["How do I report vertices whose distance is −∞?", "After detecting updates in round V, every vertex reachable from a vertex on a negative cycle has distance −∞. Mark the updated vertices and propagate with BFS/DFS."],
      ["Why does the early exit (\"no change in a round\") still give correct results?", "If a full round changes nothing, the next round would see exactly the same distances and change nothing either: the distances are a fixed point, so they are final. It often stops long before V − 1 rounds."],
      ["Does the order of edges within a round matter?", "Not for correctness after V − 1 rounds, but a good order (for example edges sorted by a BFS order from the source) can finish in fewer rounds. For the K-stops variant the order must not matter, which is what the copy guarantees."],
      ["What is \"count to infinity\" in distance-vector routing?", "When a link fails, two routers can keep learning from each other's stale estimates, each increasing its distance by one per exchange, slowly counting up to the protocol's \"infinity\" (16 in RIP). Split horizon and poison reverse reduce it; link-state protocols (Dijkstra on full maps) avoid it."],
    ],
    revise: md`
? Rounds needed? :: V − 1 (shortest simple paths have ≤ V − 1 edges).
? Complexity? :: O(V·E).
? Negative cycle detection? :: Any update in a V-th round.
? K stops? :: k + 1 rounds relaxing from the previous round's copy.
? Arbitrage? :: Weights −log(rate); negative cycle = arbitrage.
? SPFA? :: Queue of changed vertices; fast on average, O(VE) worst case.
? Johnson's algorithm? :: Bellman–Ford potentials, then Dijkstra from every vertex.
? Round invariant? :: After round i, dist[v] ≤ shortest path using at most i edges.
? Difference constraints graph? :: x_j − x_i ≤ c ⇒ edge i→j weight c, plus a super-source; negative cycle = infeasible.
? Arbitrage weights? :: −log(rate); negative cycle = arbitrage.
? SPFA worst case? :: Still O(V·E).
`,
    pitfalls: ["In-place relaxation for the K-stops limit", "Overflow when adding to infinity (check dist[u] != inf first)", "Calling Bellman–Ford on undirected graphs with negative edges"],
    quiz: [Q("Bellman–Ford on V = 5 still updates in round 5. Conclusion?", ["Normal", "*A negative cycle is reachable", "Graph disconnected", "Needs 10 rounds"], "Distances are final after V − 1 rounds otherwise.")],
    sources: [S.article("Bellman–Ford algorithm", "cp-algorithms", "https://cp-algorithms.com/graph/bellman_ford.html"), S.article("Finding a negative cycle in the graph", "cp-algorithms", "https://cp-algorithms.com/graph/finding-negative-cycle-in-graph.html"), S.book("Algorithms, chapter 8: Shortest Paths (§8.7 Bellman–Ford)", "Jeff Erickson", "https://jeffe.cs.illinois.edu/teaching/algorithms/book/08-sssp.pdf")],
    problems: [787, 743, 1334],
  },
  "floyd-warshall": {
    blurb: "All-pairs shortest paths in three nested loops: allow intermediate vertices one at a time. O(V³), handles negative edges, and doubles as transitive closure.",
    signals: ["Distances between all pairs, V ≤ ~400", "Transitive relationships (reachability, prerequisites) for many queries", "City with the fewest reachable neighbours within a threshold"],
    widgets: ["floyd-warshall"],
    lesson: md`
## When it applies

All-pairs shortest paths on a graph with few vertices (V up to about 400–500), possibly with negative edges (but no negative cycles), and also reachability (transitive closure) and minimax/maximin path variants. Its code is three nested loops, which makes it hard to get wrong.

## The algorithm

Start with dist[i][j] = the edge weight (∞ if no edge), dist[i][i] = 0. Then:

\`\`\`python
for k in range(n):
    for i in range(n):
        if dist[i][k] == INF: continue          # small speed-up
        for j in range(n):
            if dist[i][k] + dist[k][j] < dist[i][j]:
                dist[i][j] = dist[i][k] + dist[k][j]
\`\`\`

O(V³) time, O(V²) space (updated in place).

[[widget:floyd-warshall]]

## Why k must be the outer loop

Floyd–Warshall is a DP over which vertices may be used as **intermediate** stops. Define D_k[i][j] = the shortest path from i to j whose intermediate vertices all come from {0, …, k − 1}. Then

D_(k+1)[i][j] = min(D_k[i][j], D_k[i][k] + D_k[k][j])

because the best path using vertices up to k either avoids k (first term) or passes through k exactly once (second term, splitting at k; without negative cycles, visiting k twice never helps). Each stage needs the complete previous stage for all pairs, so k must be the outer loop. With k inside, dist[i][j] would be finalised before the paths through later intermediate vertices exist: a classic bug that gives wrong answers on many graphs.

Updating in place is safe: during stage k, dist[i][k] and dist[k][j] do not change (a path from i to k through k is no shorter), so reading the "new" values is the same as reading the old ones.

## Properties

- **Negative edges** are fine; **negative cycles** show up as dist[i][i] < 0 for every vertex i on such a cycle after the run. Any pair (i, j) where some vertex k with dist[k][k] < 0 is reachable from i and reaches j has no shortest path (−∞).
- **Path reconstruction**: keep next[i][j] = the first vertex after i on the best path; initialise next[i][j] = j for edges, and set next[i][j] = next[i][k] whenever the path through k wins. Then walk i → next[i][j] → … → j.
- **Undirected graphs**: put each edge in both directions. (A negative undirected edge is itself a negative cycle.)
- **Dense inputs**: an adjacency matrix is the natural representation, and the inner loop is cache-friendly.

## Transitive closure (Warshall)

The boolean version computes reachability: reach[i][j] = reach[i][j] or (reach[i][k] and reach[k][j]). With bitsets, the inner loop over j becomes one bitwise OR of rows: if reach[i][k], then row[i] |= row[k], giving O(V³ / 64). **Course Schedule IV** (LC 1462) asks many "is u a prerequisite of v?" queries: precompute the closure for n ≤ 100.

## Other semirings

The same triple loop works with other (combine, extend) pairs:

| Question | combine | extend |
|---|---|---|
| shortest path | min | + |
| reachability | or | and |
| widest (maximin) path | max | min |
| minimax path (smallest possible largest edge) | min | max |
| most reliable path | max | × |

## Problems

- **Find the City With the Smallest Number of Neighbours at a Threshold Distance** (LC 1334): Floyd, then count per row; ties go to the larger index.
- **Minimum Cost to Convert String I** (LC 2976): Floyd over the 26 letters with the given conversion costs, then sum per position.
- **Course Schedule IV** (LC 1462): boolean closure.
- **Evaluate Division** (LC 399): Floyd with multiplication over the variables also works for small inputs.
- **Network diameter** (the largest shortest distance between any pair) on small graphs.

## When not to use it

- Large sparse graphs: V runs of Dijkstra cost O(V·E log V), far below V³ when E ≪ V². V = 10⁴ makes V³ = 10¹² — hopeless.
- Single-source questions: Dijkstra or Bellman–Ford.
- With negative edges on sparse graphs: Johnson's algorithm.

## Interview angles

- Explain the DP over intermediate vertices and why k is outermost.
- State the negative-cycle check and path reconstruction.
- Mention that V ≤ ~500 is the practical limit.

## Connections

Floyd–Warshall is DP; its boolean form is Warshall's transitive closure; the semiring view connects it to matrix multiplication (shortest paths by repeated min-plus squaring in O(V³ log V)).
`,
    doubts: [
      ["Why must k be the outermost loop?", "The DP state is 'shortest path using intermediates from the first k vertices'. All pairs must be updated for a given k before moving to k + 1. With k inside, dist[i][k] and dist[k][j] may not yet account for the intermediates they need."],
      ["How is a negative cycle detected?", "If after the algorithm dist[i][i] < 0 for some i, i lies on (or can reach and return through) a negative cycle. Distances involving such vertices are not meaningful."],
      ["Floyd or Dijkstra from every vertex?", "Floyd for dense graphs, small V (≤ 400–500) or negative edges; Dijkstra from each vertex for sparse graphs with non-negative weights."],
      ["How do I detect which pairs have no shortest path because of a negative cycle?", "After the run, mark every k with dist[k][k] < 0. A pair (i, j) is −∞ if there is such a k with dist[i][k] < ∞ and dist[k][j] < ∞ (i reaches the cycle and the cycle reaches j)."],
      ["Can Floyd–Warshall handle a graph given as an edge list with duplicate edges?", "Yes, but initialise with the minimum weight among parallel edges (dist[u][v] = min(dist[u][v], w)); simply overwriting would keep whichever duplicate came last."],
      ["Is Floyd–Warshall ever better than running Dijkstra V times on a sparse graph?", "Only when V is small (a few hundred), where the tight triple loop beats heap overhead, or when negative edges rule out Dijkstra and Johnson's algorithm is not worth the code."],
    ],
    revise: md`
? Floyd–Warshall loop order? :: k outermost, then i, then j.
? Complexity? :: O(V³) time, O(V²) space.
? DP meaning after iteration k? :: Shortest paths using intermediates in {0..k}.
? Negative cycle check? :: dist[i][i] < 0.
? Transitive closure? :: reach[i][j] |= reach[i][k] & reach[k][j].
? Practical V limit? :: About 400–500.
? DP definition behind Floyd? :: D_k[i][j] = shortest i→j path with intermediates in {0..k−1}.
? Why is in-place update safe? :: dist[i][k] and dist[k][j] do not change during stage k.
? Minimax path semiring? :: combine = min, extend = max.
? Bitset transitive closure? :: If reach[i][k], row[i] |= row[k]: O(V³/64).
`,
    pitfalls: ["k as an inner loop", "Overflow adding two infinities (use a large but safe sentinel or check)", "Forgetting dist[i][i] = 0"],
    quiz: [Q("Floyd–Warshall with V = 300 does about how many relaxations?", ["9·10⁴", "*2.7·10⁷", "2.7·10⁹", "300"], "300³.")],
    sources: [S.paper("Algorithm 97: Shortest path (Floyd, 1962)", "Communications of the ACM", "https://doi.org/10.1145/367766.368168"), S.article("Floyd–Warshall algorithm", "cp-algorithms", "https://cp-algorithms.com/graph/all-pair-shortest-path-floyd-warshall.html"), S.book("Algorithms, chapter 9: All-Pairs Shortest Paths", "Jeff Erickson", "https://jeffe.cs.illinois.edu/teaching/algorithms/book/09-apsp.pdf")],
    problems: [1334, 1462, 399, 2976],
  },
  "state-dijkstra": {
    blurb: "Dijkstra where a vertex is a richer state (city + stops used, cell + coupons left) or the cost is not a plain sum (maximum edge, probability). The most common way shortest paths appear in Google interviews.",
    signals: ["Shortest path with an extra resource (stops, fuel, discounts, keys)", "Minimise the maximum step (effort, time to swim)", "Edge cost depends on time or state"],
    lesson: md`
## When the vertex is not enough

Plain Dijkstra assumes that the cheapest way to reach a vertex is all that matters for the future. Many problems break that assumption: the number of stops already used limits future moves, fuel left decides which roads are possible, a coupon used or unused changes later costs, the time of arrival decides which edges are open. The fix is the same as in state-space BFS: make each Dijkstra node a **(vertex, extra)** pair that captures everything the future depends on, and run ordinary Dijkstra on that expanded graph.

## Expand the state

| Problem | State | Edges |
|---|---|---|
| Cheapest Flights Within K Stops (LC 787) | (city, stops used) | flight to the next city, stops + 1 ≤ K + 1 |
| Minimum Cost to Reach Destination in Time (LC 1928) | (city, time used) | road, time + t ≤ maxTime |
| Shortest Path with Alternating Colors (LC 1129) | (node, colour of the last edge) | edge of the other colour |
| Coupons (halve up to k edges) | (node, coupons used) | full price, or half price with coupons + 1 |
| Electric car / fuel (refuel at stations) | (city, fuel left) | drive (fuel − d) or refuel (fuel + 1, cost price) |
| Minimum cost to travel with discounts | (city, discounts left) | as coupons |
| Second minimum time (LC 2045) | (node, how many times reached) | traffic-light waiting rules |

The expanded graph has V × |extra| vertices and E × |extra| edges, so Dijkstra costs O(E·X·log(V·X)) for X extra values. Check that this fits before coding.

\`\`\`python
import heapq
def cheapest_with_coupons(adj, s, t, k):
    INF = float("inf")
    dist = {(s, 0): 0}; pq = [(0, s, 0)]
    while pq:
        d, u, used = heapq.heappop(pq)
        if u == t: return d                       # first pop of the target is optimal
        if d > dist.get((u, used), INF): continue
        for v, w in adj[u]:
            for nd, nu in ((d + w, used), (d + w // 2, used + 1)):
                if nu <= k and nd < dist.get((v, nu), INF):
                    dist[(v, nu)] = nd; heapq.heappush(pq, (nd, v, nu))
    return -1
\`\`\`

**Layered graph view.** Picture k + 1 copies (layers) of the graph, one per coupon count. Normal edges stay within a layer; coupon edges go from layer i to layer i + 1 at half price. The answer is the best distance to t in any layer. Thinking in layers makes such problems easy to explain.

## Cheapest Flights Within K Stops with Dijkstra

State (city, stops). The subtlety: a city reached cheaply with many stops can be worse for the future than the same city reached at higher cost with fewer stops. That is why stops must be in the state; with only the city, Dijkstra would discard the second (useful) path. Equivalent fixes: Bellman–Ford with exactly K + 1 rounds, or BFS level by level with a copy of distances.

## Change the cost function

Dijkstra works for any path cost that is **monotone** (extending a path never makes it cheaper) and where comparing two partial paths to the same state decides which is better for every extension.

- **Minimax** (the cost of a path is its largest edge: Path With Minimum Effort, LC 1631; Swim in Rising Water, LC 778): combine with max instead of +.
- **Maximum probability** (LC 1514): multiply probabilities ≤ 1 and use a max-heap, or minimise Σ −log p.
- **Lexicographic costs**: compare tuples (primary cost, secondary cost), for example fewest transfers, then shortest time.
- **Time-dependent edges** (a road is open only at certain times, or traffic lights): Dijkstra stays correct if waiting never helps you arrive earlier than leaving later would (the FIFO property). Second Minimum Time (LC 2045) computes waiting from the light cycle.

## Dominance pruning

Two states at the same vertex where one is no worse in every dimension (cost ≤ and resources ≥) make the other useless. Keep, per vertex, the best cost seen for each resource level, and skip a state if a state with at least as many resources and no higher cost was already settled. In K stops: skip (city, stops) if (city, fewer stops) was already settled with a lower or equal cost. This often cuts the expanded graph to a fraction of its size.

## Alternatives

- **Bellman–Ford rounds** when the extra dimension is "number of edges used" (K stops).
- **BFS over states** when all moves cost the same.
- **0-1 BFS over states** when costs are 0 or 1.
- **DP over a DAG** when the extra dimension strictly increases (time used with positive travel times): process states in increasing time without a heap. LC 1928 can be solved as dp[t][city] for t up to maxTime.

## Interview angles

- Say what the extra dimension is and why the vertex alone is insufficient (two paths to the same vertex with different futures).
- Count the expanded states before coding.
- Mention the layered-graph picture and dominance pruning.

## Connections

This is state-space search with weights. Bellman–Ford handles the "at most K edges" case directly; A* can add a heuristic to the expanded graph.
`,
    doubts: [
      ["Why can Dijkstra minimise the maximum edge?", "Its correctness needs only that extending a path never decreases its cost and that costs are compared consistently. max(d, w) ≥ d holds, so the same 'settled distances are final' argument goes through."],
      ["Why does K-stops need the stops in the state for Dijkstra?", "A cheaper path that used more stops may be unable to continue, while a more expensive path with fewer stops can. Keeping only the cheapest cost per city would discard the one that can still reach the destination."],
      ["Can I stop as soon as the target vertex is popped in an expanded-state Dijkstra?", "Yes, the first popped state with vertex = target has the smallest cost among all target states, because the heap orders every state by cost. You only need to keep going if a secondary criterion must be optimised among equal costs."],
      ["How large an extra dimension is acceptable?", "The product V × X must fit in memory and E × X × log must fit in time. V = 10⁴ cities with X = 100 fuel levels is 10⁶ states: fine. If X is in the millions, look for structure (dominance, monotonicity) or a different formulation."],
      ["Why doesn't plain Dijkstra on cities give the right answer for K stops?", "It keeps only the cheapest arrival at each city. A cheap arrival that used all its stops cannot continue, while a pricier arrival with stops left could reach the destination. Dropping the stops from the state merges these two very different situations."],
    ],
    revise: md`
? When to expand the state? :: When future costs depend on something besides the vertex (stops, coupons, time, battery).
? State graph size? :: V × number of extra values.
? Minimax path relaxation? :: new = max(d, w).
? Monotone cost requirement? :: Extending a path never lowers its cost.
? K stops with Dijkstra? :: State (city, stops); prune dominated states.
? Layered graph for k coupons? :: k+1 copies; coupon edges go from layer i to i+1 at reduced cost.
? When is Dijkstra valid for a custom cost? :: The cost is monotone along extensions and comparable at the same state.
? Time-dependent edges condition? :: FIFO: leaving later never lets you arrive earlier.
? LC 1928 as a DP? :: dp[t][city] over increasing time (positive travel times form a DAG).
`,
    pitfalls: ["Dropping a state dimension that matters", "Non-monotone costs (Dijkstra breaks)", "Huge state spaces without dominance pruning"],
    quiz: [Q("Minimum effort path relaxation uses…", ["d + w", "*max(d, w)", "min(d, w)", "d · w"], "Effort is the maximum step on the path.")],
    sources: [S.article("Dijkstra on sparse graphs", "cp-algorithms", "https://cp-algorithms.com/graph/dijkstra_sparse.html"), S.book("Algorithms, chapter 8: Shortest Paths", "Jeff Erickson", "https://jeffe.cs.illinois.edu/teaching/algorithms/book/08-sssp.pdf")],
    problems: [787, 1631, 778, 1514, 1928, 2577, 2045, 2093],
  },
  "a-star": {
    blurb: "Dijkstra guided by a heuristic estimate of the remaining distance. Admissible and consistent heuristics keep it optimal; bidirectional search and contraction hierarchies are how real map routing scales.",
    signals: ["Point-to-point shortest path with a known geometry (grids, maps)", "Large search spaces where Dijkstra explores too much", "Puzzle solving (8-puzzle) with a distance estimate"],
    lesson: md`
## The idea

Dijkstra explores outward in all directions, settling vertices in order of distance from the source. When you only care about one target, most of that work is wasted on vertices that lead away from it. **A*** (Hart, Nilsson and Raphael, 1968) orders the frontier by an estimate of the **total** path length through each vertex:

f(v) = g(v) + h(v)

where g(v) is the best known cost from the source to v (as in Dijkstra) and h(v) is a heuristic estimate of the remaining cost from v to the target. With h = 0, A* is exactly Dijkstra. With a perfect h (the true remaining distance), A* walks straight along a shortest path, expanding almost nothing else.

## The algorithm

\`\`\`python
import heapq
def a_star(start, goal, neighbours, h):
    g = {start: 0}; pq = [(h(start), 0, start)]
    while pq:
        f, d, u = heapq.heappop(pq)
        if u == goal: return d
        if d > g[u]: continue                        # stale
        for v, w in neighbours(u):
            nd = d + w
            if nd < g.get(v, float("inf")):
                g[v] = nd
                heapq.heappush(pq, (nd + h(v), nd, v))
    return -1
\`\`\`

## Admissible and consistent heuristics

- **Admissible**: h(v) never overestimates the true remaining cost. Then A* returns an optimal path (the goal cannot be popped while a cheaper route is still pending, because that route's f is at most its true cost).
- **Consistent** (monotone): h(u) ≤ w(u, v) + h(v) for every edge, and h(goal) = 0. Then f never decreases along a path, each vertex is settled once (like Dijkstra), and the stale check is enough. Consistent implies admissible.
- An admissible but inconsistent heuristic can require **reopening** settled vertices (letting them be improved and pushed again) to stay optimal.
- An **inadmissible** heuristic (overestimating) can return a suboptimal path, but often runs much faster. Weighted A* (f = g + ε·h, ε > 1) deliberately trades optimality for speed, with the guarantee that the path costs at most ε times the optimum.

## Heuristics for grids and maps

| Movement | Heuristic | Admissible? |
|---|---|---|
| 4-directional, unit cost | Manhattan \|dx\| + \|dy\| | yes |
| 8-directional, unit cost (diagonal = 1) | Chebyshev max(\|dx\|, \|dy\|) | yes |
| 8-directional, diagonal = √2 | octile: max + (√2 − 1)·min | yes |
| any angle | Euclidean | yes |
| 8-directional but using Manhattan | Manhattan | no (overestimates diagonals) |
| road network | straight-line distance / maximum speed | yes |

For puzzles: the **sum of Manhattan distances** of tiles to their goal positions is admissible for the 8- and 15-puzzle (each move moves one tile one step); "number of misplaced tiles" is admissible but weaker. Stronger heuristics expand fewer nodes: pattern databases make the 15-puzzle solvable in milliseconds.

## Memory: IDA*

A* keeps every generated node, which can exhaust memory on huge state spaces. **IDA*** (iterative deepening A*) runs depth-first searches with an increasing f-limit: each iteration explores all nodes with f ≤ limit, and the next limit is the smallest f that exceeded it. Memory is O(depth), at the cost of re-exploring. It is the standard method for sliding-tile puzzles.

## Bidirectional search

Run Dijkstra (or A*) from both the source and the target (on the reversed graph), alternating, and stop when the sum of the two frontiers' minimum keys is at least the best meeting distance found so far. On road networks this roughly halves the explored radius: in 2D, about 2·πr²/4 instead of πr² area. Stopping at the first vertex settled by both sides is a common bug: it can miss the true meeting point.

## How map routing scales

Continental road graphs have tens of millions of vertices; even A* is too slow for interactive queries. Production routers precompute:

- **Contraction hierarchies**: order vertices by importance, "contract" unimportant ones by adding shortcut edges that preserve distances. A query runs a bidirectional search that only goes upward in importance: milliseconds per query.
- **ALT** (A*, landmarks, triangle inequality): precompute distances to a few landmarks; |d(L, t) − d(L, v)| is an admissible lower bound for d(v, t).
- **Hub labelling** and **transit-node routing**: even faster queries with more preprocessing.
- **Time-dependent and live-traffic** routing layers customisation on top (customisable route planning).

## Interview usage

- Mention A* for single-pair shortest paths on large implicit graphs: grids, puzzles, game maps.
- State admissibility and consistency precisely; know that h = 0 is Dijkstra.
- For "design Google Maps routing", name contraction hierarchies and bidirectional search.
- LeetCode problems rarely require A*, but it is a valid optimisation for Shortest Path in Binary Matrix (LC 1091, Chebyshev heuristic) and Sliding Puzzle (LC 773).

## Connections

A* is Dijkstra with a potential: running Dijkstra on reweighted edges w'(u, v) = w(u, v) − h(u) + h(v) (non-negative iff h is consistent) gives exactly A*. That is the same reweighting idea as Johnson's algorithm.
`,
    doubts: [
      ["What happens with an inadmissible heuristic?", "A* may return a suboptimal path faster. That trade-off (weighted A*, f = g + ε·h) is deliberate in games and robotics where speed beats optimality."],
      ["Is Manhattan distance admissible for 8-directional movement?", "No: a diagonal step covers Manhattan distance 2 for cost 1 (or √2), so Manhattan can overestimate. Use Chebyshev (max(|dx|, |dy|)) or octile distance."],
      ["Does A* with an admissible heuristic always expand fewer nodes than Dijkstra?", "With a consistent heuristic, A* never expands a node that Dijkstra would not also expand before reaching the goal (ignoring ties), so it is at least as efficient. Better heuristics (closer to the truth while staying admissible) expand fewer nodes."],
      ["What goes wrong if I stop bidirectional Dijkstra when the frontiers first touch?", "The first vertex settled by both searches is not necessarily on a shortest path; a shorter path may cross between the frontiers through an edge whose endpoints are settled by different sides. Track the best meeting distance over all relaxed cross edges and stop only when top(forward) + top(backward) ≥ that best."],
      ["Can A* handle negative edges?", "Not with the usual guarantees: like Dijkstra, it assumes costs only grow along a path. With negative edges, use Bellman–Ford or reweight first (Johnson) and then apply A* with a heuristic consistent for the reweighted graph."],
    ],
    revise: md`
? A* priority? :: f = g + h.
? Admissible? :: h never overestimates: optimal paths.
? Consistent? :: h(u) ≤ w(u,v) + h(v): vertices settled once.
? h = 0? :: Dijkstra.
? 4-direction grid heuristic? :: Manhattan.
? 8-direction grid heuristic? :: Chebyshev / octile.
? Production road routing? :: Contraction hierarchies, ALT, bidirectional search.
? Consistent heuristic definition? :: h(u) ≤ w(u,v) + h(v) and h(goal) = 0; implies admissible.
? Weighted A* guarantee? :: f = g + ε·h; path cost ≤ ε × optimal.
? IDA*? :: DFS with an increasing f-limit; O(depth) memory.
? ALT lower bound? :: |d(L, t) − d(L, v)| from landmark distances.
? A* as reweighted Dijkstra? :: w' = w − h(u) + h(v), non-negative iff h is consistent.
`,
    pitfalls: ["Overestimating heuristics while claiming optimality", "Manhattan on 8-directional grids"],
    quiz: [Q("A* with h ≡ 0 behaves like…", ["BFS", "*Dijkstra", "DFS", "Bellman–Ford"], "Only g remains.")],
    sources: [S.paper("A formal basis for the heuristic determination of minimum cost paths (Hart, Nilsson, Raphael, 1968)", "IEEE Transactions on Systems Science and Cybernetics", "https://doi.org/10.1109/TSSC.1968.300136"), S.paper("Contraction hierarchies: faster and simpler hierarchical routing in road networks (Geisberger et al., 2008)", "WEA 2008", "https://doi.org/10.1007/978-3-540-68552-4_24"), S.article("A* search algorithm", "Wikipedia", "https://en.wikipedia.org/wiki/A*_search_algorithm")],
    problems: [1091, 773, 752],
  },
};
