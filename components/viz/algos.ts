import { GRAPH_ALGOS } from "./graphs";
export type S = "cur" | "done" | "front" | "bad" | "dim" | "hit";
export interface Row { label?: string; cells: (string | number)[]; hi?: Record<number, S>; ptr?: Record<string, number>; range?: [number, number] }
export interface GNode { id: string; x: number; y: number; label?: string; sub?: string; s?: S }
export interface GEdge { a: string; b: string; w?: number | string; s?: S; dir?: boolean }
export interface Step {
  note: string;
  rows?: Row[];
  graph?: { nodes: GNode[]; edges: GEdge[] };
  grid?: { cells: (string | number)[][]; s?: (S | undefined)[][]; rowH?: string[]; colH?: string[] };
  vars?: Record<string, string | number>;
  /** Asked before moving past this step in predict mode: what happens next? The next step reveals it. */
  ask?: { q: string; options: string[]; answer: number; why?: string };
}
export interface Algo { title: string; about: string; steps: () => Step[] }

const hi = (pairs: [number, S][]) => Object.fromEntries(pairs) as Record<number, S>;
const range = (a: number, b: number, s: S) => hi(Array.from({ length: Math.max(0, b - a + 1) }, (_, i) => [a + i, s] as [number, S]));

const prefixSum: Algo = {
  title: "Prefix sum + hash map", about: "Count subarrays summing to k = 3. For each prefix, look up how many earlier prefixes equal prefix − k.",
  steps() {
    const a = [1, 2, 1, -1, 3, -2, 2], k = 3, out: Step[] = [];
    const seen = new Map<number, number>([[0, 1]]);
    let pre = 0, ans = 0;
    out.push({ note: "Seed the map with prefix 0 (the empty prefix), seen once.", rows: [{ label: "nums", cells: a }], vars: { prefix: 0, need: "–", count: 0, map: "{0:1}" } });
    a.forEach((x, i) => {
      pre += x;
      const need = pre - k, got = seen.get(need) ?? 0;
      ans += got;
      const fmt = () => "{" + [...seen].map(([p, c]) => `${p}:${c}`).join(", ") + "}";
      out.push({ note: got ? `prefix = ${pre}. We need an earlier prefix of ${need}: found ${got}. Each one marks the start of a subarray ending here with sum ${k}.` : `prefix = ${pre}. No earlier prefix equals ${need}, so no subarray ending here sums to ${k}.`,
        rows: [{ label: "nums", cells: a, hi: { ...range(0, i, "dim"), [i]: got ? "hit" : "cur" }, ptr: { i } }], vars: { prefix: pre, need, count: ans, map: fmt() } });
      seen.set(pre, (seen.get(pre) ?? 0) + 1);
    });
    out.push({ note: `Done: ${ans} subarrays sum to ${k}. One pass, and negatives are fine.`, rows: [{ label: "nums", cells: a, hi: range(0, a.length - 1, "done") }], vars: { count: ans } });
    return out;
  },
};

const twoPointers: Algo = {
  title: "Opposite-end two pointers", about: "Container With Most Water: move the shorter side, because it can never do better with a narrower width.",
  steps() {
    const h = [1, 8, 6, 2, 5, 4, 8, 3, 7], out: Step[] = [];
    let l = 0, r = h.length - 1, best = 0;
    while (l < r) {
      const area = Math.min(h[l], h[r]) * (r - l);
      const better = area > best;
      best = Math.max(best, area);
      const moveL = h[l] < h[r];
      out.push({ note: `Area = min(${h[l]}, ${h[r]}) × ${r - l} = ${area}${better ? " (new best)" : ""}. The ${moveL ? "left" : "right"} line is shorter, so every other container using it is smaller: discard it.`,
        rows: [{ label: "height", cells: h, hi: { ...range(0, l - 1, "dim"), ...range(r + 1, h.length - 1, "dim"), [l]: moveL ? "bad" : "cur", [r]: moveL ? "cur" : "bad" }, ptr: { L: l, R: r }, range: [l, r] }], vars: { area, best } });
      if (moveL) l++; else r--;
    }
    out.push({ note: `Pointers met. Best area = ${best} in a single O(n) pass.`, rows: [{ label: "height", cells: h, hi: range(0, h.length - 1, "done") }], vars: { best } });
    return out;
  },
};

const slidingWindow: Algo = {
  title: "Variable sliding window", about: "Longest substring without repeating characters: grow right, shrink left while the window is invalid.",
  steps() {
    const s = "abcabdbe".split(""), out: Step[] = [];
    const cnt: Record<string, number> = {};
    let l = 0, best = 0;
    for (let r = 0; r < s.length; r++) {
      cnt[s[r]] = (cnt[s[r]] ?? 0) + 1;
      if (cnt[s[r]] > 1) out.push({ note: `Adding '${s[r]}' creates a duplicate. The window is invalid: shrink from the left until it is fixed.`, rows: [{ label: "s", cells: s, hi: { [r]: "bad" }, ptr: { L: l, R: r }, range: [l, r] }], vars: { window: s.slice(l, r + 1).join(""), best } });
      while (cnt[s[r]] > 1) { cnt[s[l]]--; l++; }
      const better = r - l + 1 > best;
      best = Math.max(best, r - l + 1);
      out.push({ note: `Window "${s.slice(l, r + 1).join("")}" is valid, length ${r - l + 1}${better ? ": new best" : ""}.`, rows: [{ label: "s", cells: s, hi: range(l, r, "cur"), ptr: { L: l, R: r }, range: [l, r] }], vars: { window: s.slice(l, r + 1).join(""), best } });
    }
    out.push({ note: `Each index entered and left the window at most once: O(n). Answer ${best}.`, rows: [{ label: "s", cells: s }], vars: { best } });
    return out;
  },
};

const monoStack: Algo = {
  title: "Monotonic stack", about: "Next greater element: indices wait on a decreasing stack until a larger value arrives.",
  steps() {
    const a = [73, 74, 75, 71, 69, 72, 76, 73], out: Step[] = [], st: number[] = [];
    const res: (number | string)[] = a.map(() => "·");
    const snap = (note: string, i: number, extra: Record<number, S> = {}) => out.push({ note,
      rows: [{ label: "temps", cells: a, hi: { ...Object.fromEntries(st.map((j) => [j, "front" as S])), [i]: "cur", ...extra }, ptr: { i } }, { label: "wait", cells: res }, { label: "stack", cells: st.length ? st.map((j) => a[j]) : ["empty"] }] });
    a.forEach((x, i) => {
      while (st.length && a[st[st.length - 1]] < x) {
        const j = st.pop()!;
        res[j] = i - j;
        snap(`${x} is warmer than ${a[j]} (day ${j}). Day ${j} waited ${i - j} day${i - j > 1 ? "s" : ""}: pop it.`, i, { [j]: "hit" });
      }
      st.push(i);
      snap(`Push day ${i} (${x}). The stack stays decreasing: everything on it is still waiting.`, i);
    });
    st.forEach((j) => (res[j] = 0));
    out.push({ note: "Whatever remains never found a warmer day. Each index was pushed and popped once: O(n).", rows: [{ label: "temps", cells: a }, { label: "wait", cells: res, hi: range(0, a.length - 1, "done") }] });
    return out;
  },
};

const binarySearch: Algo = {
  title: "Binary search on a predicate", about: "Koko eating bananas, piles [3, 6, 7, 11], h = 8: find the first speed where canFinish(speed) is true.",
  steps() {
    const piles = [3, 6, 7, 11], H = 8, out: Step[] = [];
    const speeds = Array.from({ length: 11 }, (_, i) => i + 1);
    const hours = (k: number) => piles.reduce((s, p) => s + Math.ceil(p / k), 0);
    const known: Record<number, S> = {};
    let lo = 1, hi2 = 11;
    out.push({ note: "The answer space is speeds 1…11. canFinish is false, false, …, true, true: monotonic, so we can binary search it.", rows: [{ label: "speed", cells: speeds, range: [0, 10] }], vars: { lo, hi: hi2 } });
    while (lo < hi2) {
      const mid = (lo + hi2) >> 1, h = hours(mid), ok = h <= H;
      known[mid - 1] = ok ? "done" : "bad";
      out.push({ note: `mid = ${mid}: needs ${h} hours ${ok ? "≤" : ">"} ${H}. ${ok ? "It works, so the answer is mid or smaller: hi = mid." : "Too slow, and so is everything smaller: lo = mid + 1."}`,
        rows: [{ label: "speed", cells: speeds, hi: { ...known, [mid - 1]: "cur" }, ptr: { lo: lo - 1, mid: mid - 1, hi: hi2 - 1 }, range: [lo - 1, hi2 - 1] }, { label: "ok?", cells: speeds.map((k) => (known[k - 1] ? (known[k - 1] === "done" ? "T" : "F") : "?")) }], vars: { lo, mid, hi: hi2, hours: h } });
      if (ok) hi2 = mid; else lo = mid + 1;
    }
    out.push({ note: `lo == hi == ${lo}. Minimum speed is ${lo}, found with ~log₂(11) checks of O(n) each.`, rows: [{ label: "speed", cells: speeds, hi: { [lo - 1]: "hit" }, ptr: { ans: lo - 1 } }], vars: { answer: lo } });
    return out;
  },
};

const linkedReverse: Algo = {
  title: "Reverse a linked list", about: "Three pointers: prev, cur, next. Save next, flip the arrow, advance.",
  steps() {
    const n = 5, out: Step[] = [];
    const nodes = (cur: number, prev: number): GNode[] => Array.from({ length: n }, (_, i) => ({ id: String(i), x: 60 + i * 110, y: 80, label: String(i + 1), s: i === cur ? "cur" : i === prev ? "front" : i < cur ? "done" : undefined, sub: i === cur ? "cur" : i === prev ? "prev" : undefined }));
    const edges = (flipped: number): GEdge[] => Array.from({ length: n - 1 }, (_, i) => (i < flipped ? { a: String(i + 1), b: String(i), dir: true, s: "done" as S } : { a: String(i), b: String(i + 1), dir: true }));
    out.push({ note: "prev = null, cur = head. All arrows point right.", graph: { nodes: nodes(0, -1), edges: edges(0) } });
    for (let i = 0; i < n; i++) {
      out.push({ note: `Save next = ${i + 2 <= n ? i + 2 : "null"}. Point node ${i + 1} back at ${i ? i : "null"}. Then prev = ${i + 1}, cur = next.`, graph: { nodes: nodes(i + 1, i), edges: edges(Math.min(i, n - 1)) } });
    }
    out.push({ note: "cur is null: prev is the new head. O(n) time, O(1) space.", graph: { nodes: nodes(n, n - 1), edges: edges(n - 1) } });
    return out;
  },
};

const TREE: [string, number, number, number][] = [["a", 300, 30, -10], ["b", 170, 110, 9], ["c", 430, 110, 20], ["d", 100, 190, 4], ["e", 240, 190, -3], ["f", 360, 190, 15], ["g", 500, 190, 7]];
const TEDGES: [string, string][] = [["a", "b"], ["a", "c"], ["b", "d"], ["b", "e"], ["c", "f"], ["c", "g"]];
const treeDfs: Algo = {
  title: "Post-order: return one thing, update another", about: "Binary Tree Maximum Path Sum. Each node returns its best downward branch; the answer considers a path bending at the node.",
  steps() {
    const out: Step[] = [], val = Object.fromEntries(TREE.map((t) => [t[0], t[3]])), kids: Record<string, string[]> = {};
    TEDGES.forEach(([p, c]) => (kids[p] = [...(kids[p] ?? []), c]));
    const gain: Record<string, number> = {};
    let best = -Infinity;
    const snap = (note: string, cur: string) => out.push({ note, vars: { best: best === -Infinity ? "−∞" : best },
      graph: { nodes: TREE.map(([id, x, y, v]) => ({ id, x, y, label: String(v), s: id === cur ? "cur" : id in gain ? "done" : undefined, sub: id in gain ? `↑${gain[id]}` : undefined })), edges: TEDGES.map(([a, b]) => ({ a, b })) } });
    const dfs = (u: string): number => {
      const [l, r] = (kids[u] ?? []).map(dfs).map((g) => Math.max(0, g)).concat([0, 0]);
      const through = l + val[u] + r;
      best = Math.max(best, through);
      gain[u] = val[u] + Math.max(l, r);
      snap(`Node ${val[u]}: path bending here = ${l} + ${val[u]} + ${r} = ${through}. It returns ${gain[u]} upward, because a path continuing to the parent can use only one branch.`, u);
      return gain[u];
    };
    snap("Visit children first (post-order). Negative gains are clamped to 0: we simply do not take that branch.", "");
    dfs("a");
    snap(`Answer = ${best}: the path 15 → 20 → 7. Note the root's own return value was not the answer.`, "");
    return out;
  },
};

const heapAlgo: Algo = {
  title: "Min-heap of size k", about: "K-th largest (k = 3): keep the k largest seen so far; the heap's top is the answer.",
  steps() {
    const a = [5, 2, 9, 1, 7, 6, 8], k = 3, out: Step[] = [];
    const heap: number[] = [];
    const pos = [[300, 30], [190, 120], [410, 120]];
    const snap = (note: string, i: number, s?: S) => out.push({ note, rows: [{ label: "stream", cells: a, hi: { ...range(0, i - 1, "dim"), [i]: s ?? "cur" }, ptr: { i } }],
      graph: { nodes: heap.map((v, j) => ({ id: String(j), x: pos[j][0], y: pos[j][1], label: String(v), s: j === 0 ? "front" : undefined, sub: j === 0 ? "top" : undefined })), edges: heap.slice(1).map((_, j) => ({ a: "0", b: String(j + 1) })) }, vars: { "heap size": heap.length, "k-th largest": heap.length === k ? heap[0] : "–" } });
    a.forEach((x, i) => {
      if (heap.length < k) { heap.push(x); heap.sort((p, q) => p - q); snap(`Heap has room: push ${x}.`, i); }
      else if (x > heap[0]) { const old = heap[0]; heap[0] = x; heap.sort((p, q) => p - q); snap(`${x} beats the smallest of our top ${k} (${old}). Replace it and sift down.`, i, "hit"); }
      else snap(`${x} ≤ top (${heap[0]}): it cannot be among the ${k} largest. Skip in O(1).`, i, "bad");
    });
    snap(`The top of the heap, ${heap[0]}, is the ${k}rd largest. O(n log k) time, O(k) space.`, a.length);
    return out;
  },
};

const subsets: Algo = {
  title: "Backtracking decision tree", about: "Subsets of [1, 2, 3]: choose, explore, un-choose. Every node of the tree is an answer.",
  steps() {
    const a = [1, 2, 3], out: Step[] = [];
    const nodes: GNode[] = [], edges: GEdge[] = [], res: string[] = [];
    const xs: Record<number, number> = {};
    let leaf = 0;
    const build = (start: number, path: number[], depth: number, parent?: string): number => {
      const id = path.join("") || "root";
      const me: GNode = { id, x: 0, y: 30 + depth * 75, label: path.length ? `{${path.join(",")}}` : "{ }" };
      nodes.push(me);
      if (parent) edges.push({ a: parent, b: id });
      const kids: number[] = [];
      for (let i = start; i < a.length; i++) kids.push(build(i + 1, [...path, a[i]], depth + 1, id));
      me.x = kids.length ? (kids[0] + kids[kids.length - 1]) / 2 : 50 + leaf++ * 150;
      xs[nodes.indexOf(me)] = me.x;
      return me.x;
    };
    build(0, [], 0);
    const order: string[] = [];
    const walk = (start: number, path: number[]) => {
      const id = path.join("") || "root";
      order.push(id);
      for (let i = start; i < a.length; i++) { walk(i + 1, [...path, a[i]]); order.push("<" + id); }
    };
    walk(0, []);
    const seen = new Set<string>();
    order.forEach((o) => {
      const back = o.startsWith("<"), id = back ? o.slice(1) : o;
      if (!back) { seen.add(id); res.push(nodes.find((n) => n.id === id)!.label!); }
      out.push({ note: back ? `Un-choose: pop the last element and return to ${nodes.find((n) => n.id === id)!.label}. Try the next option.` : `Record ${nodes.find((n) => n.id === id)!.label}. Then extend it with each later element in turn.`,
        graph: { nodes: nodes.map((n) => ({ ...n, s: n.id === id ? "cur" : seen.has(n.id) ? "done" : "dim" })), edges: edges.map((e) => ({ ...e, s: seen.has(e.b) ? "done" : "dim" })) }, vars: { found: res.length, result: res.join(" ") } });
    });
    return out;
  },
};

const bfsGrid: Algo = {
  title: "Multi-source BFS", about: "Rotting Oranges: all rotten cells start in the queue at minute 0 and spread one layer per minute.",
  steps() {
    const g = ["R..F.", "FF.FF", ".FFF.", "FF.FR"].map((r) => r.split(""));
    const R = g.length, C = g[0].length, out: Step[] = [];
    const dist: number[][] = g.map((r) => r.map((c) => (c === "R" ? 0 : -1)));
    let frontier: [number, number][] = [];
    g.forEach((r, i) => r.forEach((c, j) => c === "R" && frontier.push([i, j])));
    const snap = (note: string, fr: [number, number][], minute: number) => out.push({ note, vars: { minute, "queue size": fr.length },
      grid: { cells: g.map((r, i) => r.map((c, j) => (c === "." ? "" : dist[i][j] >= 0 ? dist[i][j] : "🍊"))), s: g.map((r, i) => r.map((c, j) => (c === "." ? "dim" : fr.some(([a, b]) => a === i && b === j) ? "cur" : dist[i][j] >= 0 ? "done" : undefined))) } });
    snap("Enqueue every rotten orange at distance 0. This is equivalent to one virtual super-source.", frontier, 0);
    let minute = 0;
    while (frontier.length) {
      const next: [number, number][] = [];
      for (const [r, c] of frontier) for (const [dr, dc] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nc < 0 || nr >= R || nc >= C || g[nr][nc] !== "F" || dist[nr][nc] !== -1) continue;
        dist[nr][nc] = minute + 1; // mark when enqueuing
        next.push([nr, nc]);
      }
      if (!next.length) break;
      minute++;
      snap(`Minute ${minute}: ${next.length} fresh orange${next.length > 1 ? "s" : ""} rot. They are marked as they are enqueued, so no cell enters the queue twice.`, next, minute);
      frontier = next;
    }
    snap(`The queue is empty after ${minute} minutes. Any orange still fresh is unreachable (answer −1 in that case).`, [], minute);
    return out;
  },
};

const DAG = { nodes: [["A", 60, 60], ["B", 60, 200], ["C", 220, 130], ["D", 380, 60], ["E", 380, 200], ["F", 540, 130]] as [string, number, number][], edges: [["A", "C"], ["B", "C"], ["C", "D"], ["C", "E"], ["D", "F"], ["E", "F"], ["A", "D"]] as [string, string][] };
const topo: Algo = {
  title: "Kahn's algorithm", about: "Topological sort: repeatedly take a node with in-degree 0 and remove its outgoing edges.",
  steps() {
    const out: Step[] = [], indeg: Record<string, number> = {}, order: string[] = [], removed = new Set<string>();
    DAG.nodes.forEach(([id]) => (indeg[id] = 0));
    DAG.edges.forEach(([, b]) => indeg[b]++);
    const q = DAG.nodes.map((n) => n[0]).filter((id) => !indeg[id]);
    const snap = (note: string, cur?: string) => out.push({ note, vars: { queue: q.join(" ") || "empty", order: order.join(" → ") || "–" },
      graph: { nodes: DAG.nodes.map(([id, x, y]) => ({ id, x, y, label: id, sub: `in ${indeg[id]}`, s: id === cur ? "cur" : order.includes(id) ? "done" : q.includes(id) ? "front" : undefined })), edges: DAG.edges.map(([a, b]) => ({ a, b, dir: true, s: removed.has(a + b) ? "dim" : undefined })) } });
    snap("Compute in-degrees. Nodes with in-degree 0 have no unmet prerequisites: queue them.");
    while (q.length) {
      const u = q.shift()!;
      order.push(u);
      const freed: string[] = [];
      DAG.edges.forEach(([a, b]) => { if (a === u) { removed.add(a + b); if (--indeg[b] === 0) { q.push(b); freed.push(b); } } });
      snap(`Take ${u}. Remove its outgoing edges${freed.length ? `; ${freed.join(", ")} now ha${freed.length > 1 ? "ve" : "s"} in-degree 0` : ""}.`, u);
    }
    snap(`All ${order.length} nodes were output, so there is no cycle. If some were left over, they would be on a cycle.`);
    return out;
  },
};

const unionFind: Algo = {
  title: "Union-Find", about: "Union by size with path compression. An edge inside one component closes a cycle.",
  steps() {
    const n = 7, out: Step[] = [], p = Array.from({ length: n }, (_, i) => i), sz = Array(n).fill(1);
    const find = (x: number): number => (p[x] === x ? x : (p[x] = find(p[x])));
    const ops: [number, number][] = [[0, 1], [2, 3], [1, 3], [4, 5], [5, 6], [3, 0], [6, 2]];
    const layout = (): GNode[] => {
      const roots = p.map((_, i) => i).filter((i) => p[i] === i), pos: GNode[] = [];
      let x = 50;
      const place = (u: number, depth: number): number => {
        const kids = p.map((_, i) => i).filter((i) => p[i] === u && i !== u);
        const xsK = kids.map((k) => place(k, depth + 1));
        const mx = xsK.length ? (xsK[0] + xsK[xsK.length - 1]) / 2 : (x += 78) - 78;
        pos.push({ id: String(u), x: mx, y: 40 + depth * 80, label: String(u), sub: p[u] === u ? `size ${sz[u]}` : undefined, s: p[u] === u ? "front" : undefined });
        return mx;
      };
      roots.forEach((r) => { place(r, 0); x += 20; });
      return pos;
    };
    const snap = (note: string, a?: number, b?: number, bad = false) => out.push({ note, vars: { components: p.filter((v, i) => v === i).length },
      graph: { nodes: layout().map((nd) => (nd.id === String(a) || nd.id === String(b) ? { ...nd, s: bad ? "bad" : "cur" } : nd)), edges: p.map((v, i) => ({ a: String(i), b: String(v), dir: true })).filter((e) => e.a !== e.b) } });
    snap("Every node starts as its own root. Arrows point to parents.");
    for (const [a, b] of ops) {
      const ra = find(a), rb = find(b);
      if (ra === rb) { snap(`union(${a}, ${b}): both have root ${ra}. They are already connected, so this edge would create a cycle.`, a, b, true); continue; }
      const [big, small] = sz[ra] >= sz[rb] ? [ra, rb] : [rb, ra];
      p[small] = big; sz[big] += sz[small];
      snap(`union(${a}, ${b}): roots ${ra} and ${rb} differ. Attach the smaller tree under the larger (root ${big}) to keep trees shallow.`, a, b);
    }
    for (let i = 0; i < n; i++) find(i);
    snap("After find() on every node, path compression points each node straight at its root: later finds are O(1).");
    return out;
  },
};

const WG = { nodes: [["S", 60, 130], ["A", 220, 50], ["B", 220, 210], ["C", 400, 50], ["D", 400, 210], ["T", 560, 130]] as [string, number, number][], edges: [["S", "A", 4], ["S", "B", 1], ["B", "A", 2], ["A", "C", 5], ["B", "D", 7], ["C", "D", 1], ["C", "T", 3], ["D", "T", 2]] as [string, string, number][] };
const dijkstra: Algo = {
  title: "Dijkstra", about: "Always settle the closest unsettled node. With non-negative edges its distance can never improve later.",
  steps() {
    const out: Step[] = [], dist: Record<string, number> = {}, done = new Set<string>(), tree = new Set<string>(), par: Record<string, string> = {};
    WG.nodes.forEach(([id]) => (dist[id] = Infinity));
    dist.S = 0;
    const pq: [number, string][] = [[0, "S"]];
    const snap = (note: string, cur?: string, relax?: string) => out.push({ note, vars: { heap: pq.map(([d, v]) => `${v}:${d}`).join("  ") || "empty" },
      graph: { nodes: WG.nodes.map(([id, x, y]) => ({ id, x, y, label: id, sub: dist[id] === Infinity ? "∞" : String(dist[id]), s: id === cur ? "cur" : done.has(id) ? "done" : undefined })), edges: WG.edges.map(([a, b, w]) => ({ a, b, w, dir: true, s: a + b === relax ? "cur" : tree.has(a + b) ? "done" : undefined })) } });
    snap("dist[S] = 0, everything else ∞. Push (0, S).");
    while (pq.length) {
      pq.sort((x, y) => x[0] - y[0]);
      const [d, u] = pq.shift()!;
      if (d > dist[u]) { snap(`Pop (${d}, ${u}): stale, because dist[${u}] is already ${dist[u]}. Skip.`, u); continue; }
      done.add(u);
      if (par[u]) tree.add(par[u] + u);
      snap(`Pop (${d}, ${u}). It is the closest unsettled node, so ${d} is final.`, u);
      for (const [a, b, w] of WG.edges) if (a === u && d + w < dist[b]) {
        const old = dist[b];
        dist[b] = d + w; par[b] = u; pq.push([dist[b], b]);
        snap(`Relax ${u} → ${b}: ${d} + ${w} = ${d + w} < ${old === Infinity ? "∞" : old}. Update and push (${d + w}, ${b}).`, u, a + b);
      }
    }
    snap(`Shortest distance to T is ${dist.T}. The green edges form the shortest-path tree.`);
    return out;
  },
};

const lcs: Algo = {
  title: "Two-sequence DP table", about: "Longest Common Subsequence of ABCB and BDCAB. dp[i][j] is the answer for the first i and j characters.",
  steps() {
    const a = "ABCB", b = "BDCAB", out: Step[] = [];
    const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
    const filled = new Set<string>();
    const snap = (note: string, i: number, j: number, from: [number, number][] = []) => out.push({ note,
      grid: { rowH: ["∅", ...a], colH: ["∅", ...b], cells: dp.map((r, x) => r.map((v, y) => (x === 0 || y === 0 || filled.has(x + "," + y) ? v : ""))), s: dp.map((r, x) => r.map((_, y) => (x === i && y === j ? "cur" : from.some(([p, q]) => p === x && q === y) ? "front" : filled.has(x + "," + y) ? "done" : x === 0 || y === 0 ? "dim" : undefined))) } });
    snap("Row 0 and column 0 are the empty prefixes: LCS with nothing is 0.", -1, -1);
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
      const match = a[i - 1] === b[j - 1];
      dp[i][j] = match ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
      filled.add(i + "," + j);
      snap(match ? `'${a[i - 1]}' = '${b[j - 1]}': extend the diagonal, ${dp[i - 1][j - 1]} + 1 = ${dp[i][j]}.` : `'${a[i - 1]}' ≠ '${b[j - 1]}': drop one character from either string, max(${dp[i - 1][j]}, ${dp[i][j - 1]}) = ${dp[i][j]}.`, i, j, match ? [[i - 1, j - 1]] : [[i - 1, j], [i, j - 1]]);
    }
    snap(`Bottom-right cell = ${dp[a.length][b.length]}. O(m·n) time; each row only needs the previous row, so O(n) space is possible.`, a.length, b.length);
    return out;
  },
};

const lis: Algo = {
  title: "LIS with patience sorting", about: "tails[k] = the smallest tail of any increasing subsequence of length k + 1.",
  steps() {
    const a = [10, 9, 2, 5, 3, 7, 101, 18, 4], out: Step[] = [], tails: number[] = [];
    a.forEach((x, i) => {
      let lo = 0, hi2 = tails.length;
      while (lo < hi2) { const m = (lo + hi2) >> 1; if (tails[m] < x) lo = m + 1; else hi2 = m; }
      const grew = lo === tails.length, old = tails[lo];
      tails[lo] = x;
      out.push({ note: grew ? `${x} is larger than every tail: it extends the longest subsequence. Length is now ${tails.length}.` : `${x} replaces ${old} at position ${lo} (first tail ≥ ${x}). Same lengths, but a smaller tail leaves more room for future elements.`,
        rows: [{ label: "nums", cells: a, hi: { ...range(0, i - 1, "dim"), [i]: "cur" }, ptr: { i } }, { label: "tails", cells: [...tails], hi: { [lo]: grew ? "hit" : "front" } }], vars: { LIS: tails.length } });
    });
    out.push({ note: `LIS length = ${tails.length} in O(n log n). Note that tails is not itself a valid subsequence: track predecessors to rebuild one.`, rows: [{ label: "nums", cells: a }, { label: "tails", cells: [...tails], hi: range(0, tails.length - 1, "done") }], vars: { LIS: tails.length } });
    return out;
  },
};

const intervals: Algo = {
  title: "Merge intervals", about: "Sort by start. Only the last merged interval can overlap the next one.",
  steps() {
    const iv: [number, number][] = [[1, 3], [8, 10], [2, 6], [15, 18], [9, 12], [17, 20]], out: Step[] = [];
    const fmt = (v: [number, number][]) => v.map(([s, e]) => `[${s},${e}]`);
    out.push({ note: "Unsorted input. Overlaps could be anywhere.", rows: [{ label: "input", cells: fmt(iv) }] });
    iv.sort((x, y) => x[0] - y[0]);
    out.push({ note: "Sort by start time. Now each interval can only overlap the one being built.", rows: [{ label: "sorted", cells: fmt(iv) }] });
    const res: [number, number][] = [];
    iv.forEach((v, i) => {
      const last = res[res.length - 1];
      if (last && v[0] <= last[1]) { const old = last[1]; last[1] = Math.max(last[1], v[1]); out.push({ note: `[${v}] starts at ${v[0]} ≤ ${old}, the end of the last merged interval: extend it to ${last[1]} (take the max: an interval can be nested).`, rows: [{ label: "sorted", cells: fmt(iv), hi: { ...range(0, i - 1, "dim"), [i]: "cur" }, ptr: { i } }, { label: "merged", cells: fmt(res), hi: { [res.length - 1]: "hit" } }] }); }
      else { res.push([...v]); out.push({ note: `[${v}] starts after the last merged interval ends${last ? ` (${v[0]} > ${last[1]})` : ""}: start a new one.`, rows: [{ label: "sorted", cells: fmt(iv), hi: { ...range(0, i - 1, "dim"), [i]: "cur" }, ptr: { i } }, { label: "merged", cells: fmt(res), hi: { [res.length - 1]: "front" } }] }); }
    });
    out.push({ note: `${res.length} merged intervals. O(n log n) for the sort, O(n) for the sweep.`, rows: [{ label: "merged", cells: fmt(res), hi: range(0, res.length - 1, "done") }] });
    return out;
  },
};

export const ALGOS: Record<string, Algo> = {
  "prefix-sum": prefixSum, "two-pointers": twoPointers, "sliding-window": slidingWindow, "mono-stack": monoStack, "binary-search": binarySearch,
  "linked-reverse": linkedReverse, "tree-dfs": treeDfs, heap: heapAlgo, subsets, "bfs-grid": bfsGrid, topo, "union-find": unionFind, dijkstra, "dp-lcs": lcs, lis, intervals,
  ...GRAPH_ALGOS,
};
