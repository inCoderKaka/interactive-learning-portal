/**
 * Step players for the DSA subtopic pages. Each `steps()` runs the real algorithm on a small example and records
 * frames, so captions and pictures cannot drift from what the code does. `ask` marks moments worth predicting.
 */
import type { Algo, GEdge, GNode, Row, S, Step } from "./algos";

const hi = (pairs: [number, S | undefined][]) => Object.fromEntries(pairs.filter(([, s]) => s)) as Record<number, S>;

// ───────────── hash table: separate chaining with resize ─────────────
const hashTable: Algo = {
  title: "Hash table: chaining, load factor and resizing",
  about: "Keys go to bucket h(k) mod m. Collisions share a chain. When the load factor n/m passes 0.75, the table doubles and every key is rehashed.",
  steps() {
    const keys = [12, 7, 22, 5, 17, 32, 9, 27];
    let m = 4;
    let buckets: number[][] = Array.from({ length: m }, () => []);
    const out: Step[] = [];
    const frame = (note: string, cur?: [number, number], ask?: Step["ask"]): Step => ({
      note, ask,
      rows: buckets.map((b, i): Row => ({ label: `b${i}`, cells: b.length ? b : ["∅"], hi: cur && cur[0] === i ? { [cur[1]]: "cur" } : b.length > 1 ? hi(b.map((_, j) => [j, "front"])) : {} })),
      vars: { m, n: buckets.reduce((s, b) => s + b.length, 0), "load factor": (buckets.reduce((s, b) => s + b.length, 0) / m).toFixed(2) },
    });
    out.push(frame("An empty table with m = 4 buckets. Hash function: h(k) = k mod m."));
    let asked = false;
    for (const k of keys) {
      const b = k % m;
      const askNow = !asked && buckets[b].length > 0;
      out.push(frame(`Insert ${k}: ${k} mod ${m} = ${b}.${buckets[b].length ? ` Bucket ${b} already holds ${buckets[b].join(", ")}: a collision, so ${k} joins the chain.` : ""}`, undefined,
        askNow ? { q: `Lookup of ${k} later must scan how many keys in bucket ${b} (worst case)?`, options: [String(buckets[b].length + 1), "1", String(keys.length)], answer: 0, why: "Chaining scans the bucket's list; expected length is the load factor." } : undefined));
      if (askNow) asked = true;
      buckets[b].push(k);
      out.push(frame(`Bucket ${b} now: ${buckets[b].join(" → ")}.`, [b, buckets[b].length - 1]));
      const n = buckets.reduce((s, x) => s + x.length, 0);
      if (n / m > 0.75) {
        const all = buckets.flat();
        m *= 2;
        buckets = Array.from({ length: m }, () => []);
        for (const x of all) buckets[x % m].push(x);
        out.push(frame(`Load factor ${(n / (m / 2)).toFixed(2)} > 0.75: double to m = ${m} and rehash all ${n} keys. Chains shorten; this O(n) step happens rarely enough that inserts stay amortised O(1).`));
      }
    }
    out.push(frame("Done. Expected chain length equals the load factor, so lookups are O(1) on average; a terrible hash (all keys in one bucket) would make them O(n)."));
    return out;
  },
};

// ───────────── Dutch national flag ─────────────
const dutchFlag: Algo = {
  title: "Dutch national flag (three-way partition)",
  about: "Regions: [0, lo) zeros, [lo, mid) ones, [mid, hi] unknown, (hi, n) twos. One pass.",
  steps() {
    const a = [2, 0, 2, 1, 1, 0, 2, 0];
    let lo = 0, mid = 0, h = a.length - 1;
    const out: Step[] = [];
    const frame = (note: string, ask?: Step["ask"]): Step => ({
      note, ask,
      rows: [{ label: "a", cells: [...a], hi: hi(a.map((_, i) => [i, i === mid && mid <= h ? "cur" : i < lo ? "done" : i < mid ? "front" : i > h ? "dim" : undefined])), ptr: { lo, mid, hi: h } }],
      vars: { lo, mid, hi: h },
    });
    out.push(frame("Sort 0s, 1s and 2s in one pass. Everything between mid and hi is still unknown."));
    let asked = false;
    while (mid <= h) {
      if (a[mid] === 0) { out.push(frame(`a[mid] = 0: swap it into the zeros region at lo, then advance lo and mid.`)); [a[lo], a[mid]] = [a[mid], a[lo]]; lo++; mid++; }
      else if (a[mid] === 1) { out.push(frame("a[mid] = 1: already in the ones region. mid++.")); mid++; }
      else {
        const ask = !asked ? { q: "a[mid] = 2 is swapped with a[hi]. Do we advance mid?", options: ["Yes", "No"], answer: 1, why: "The value that arrives from hi has not been examined yet." } : undefined;
        asked = true;
        out.push(frame("a[mid] = 2: swap with a[hi] and shrink hi. mid stays: the incoming value is unknown.", ask));
        [a[mid], a[h]] = [a[h], a[mid]]; h--;
      }
    }
    out.push(frame(`Sorted: ${a.join(", ")}. Each step either advances mid or shrinks hi, so the loop runs at most n times.`));
    return out;
  },
};

// ───────────── monotonic deque (sliding window maximum) ─────────────
const monoDeque: Algo = {
  title: "Sliding window maximum with a monotonic deque",
  about: "The deque keeps indices whose values decrease. Smaller older values are dropped from the back; expired indices leave from the front. The front is always the window maximum.",
  steps() {
    const a = [1, 3, -1, -3, 5, 3, 6, 7], k = 3;
    const dq: number[] = [], res: (number | string)[] = [];
    const out: Step[] = [];
    const frame = (note: string, i: number, ask?: Step["ask"]): Step => ({
      note, ask,
      rows: [
        { label: "a", cells: a, hi: hi(a.map((_, j) => [j, j === i ? "cur" : dq.includes(j) ? "front" : undefined])), range: i >= 0 ? [Math.max(0, i - k + 1), i] : undefined },
        { label: "deque", cells: dq.length ? dq.map((j) => `${a[j]}@${j}`) : ["∅"], hi: dq.length ? { 0: "hit" } : {} },
        { label: "max", cells: res.length ? res : ["–"] },
      ],
    });
    out.push(frame("Window size 3. The deque stores indices; their values stay decreasing from front to back.", -1));
    let asked = false;
    a.forEach((x, i) => {
      const popped: number[] = [];
      while (dq.length && a[dq[dq.length - 1]] <= x) popped.push(dq.pop()!);
      const askNow = !asked && popped.length >= 2;
      if (askNow) asked = true;
      out.push(frame(popped.length ? `a[${i}] = ${x} arrives. It beats ${popped.map((j) => a[j]).join(", ")} at the back, which can never be a maximum again: pop them.` : `a[${i}] = ${x} arrives; nothing smaller at the back.`, i,
        askNow ? { q: "Why is it safe to drop those values forever?", options: ["They are smaller and leave the window earlier", "They are duplicates", "The window is full"], answer: 0, why: "A larger, younger value dominates them in every future window." } : undefined));
      dq.push(i);
      if (dq[0] <= i - k) { const e = dq.shift()!; out.push(frame(`Index ${e} has left the window: drop it from the front.`, i)); }
      if (i >= k - 1) { res.push(a[dq[0]]); out.push(frame(`Window [${i - k + 1}..${i}]: maximum is the front, ${a[dq[0]]}.`, i)); }
    });
    out.push(frame(`Maxima: ${res.join(", ")}. Each index is pushed and popped at most once: O(n).`, a.length - 1));
    return out;
  },
};

// ───────────── Floyd cycle detection ─────────────
const floydCycle: Algo = {
  title: "Floyd's tortoise and hare",
  about: "Slow moves 1 step, fast moves 2. They meet inside the cycle. Then a pointer from the head and one from the meeting point, both at speed 1, meet at the cycle entrance.",
  steps() {
    const n = 9, entry = 3; // list 0→1→…→8→3
    const next = (i: number) => (i === n - 1 ? entry : i + 1);
    const pos = (i: number): [number, number] => (i < entry ? [60 + i * 90, 160] : (() => { const c = n - entry, t = ((i - entry) / c) * 2 * Math.PI; return [420 + 140 * Math.cos(Math.PI - t), 160 + 110 * Math.sin(Math.PI - t)]; })());
    const edges: GEdge[] = Array.from({ length: n }, (_, i) => ({ a: String(i), b: String(next(i)), dir: true }));
    const out: Step[] = [];
    const frame = (note: string, marks: Record<number, [S, string]>, ask?: Step["ask"]): Step => ({
      note, ask,
      graph: { nodes: Array.from({ length: n }, (_, i): GNode => ({ id: String(i), x: pos(i)[0], y: pos(i)[1], label: String(i), s: marks[i]?.[0], sub: marks[i]?.[1] })), edges },
    });
    let s = 0, f = 0, step = 0;
    out.push(frame("A list whose tail points back to node 3. Slow (S) and fast (F) start at the head.", { 0: ["cur", "S,F"] }));
    do {
      s = next(s); f = next(next(f)); step++;
      out.push(frame(`Step ${step}: slow → ${s}, fast → ${f}.${s === f ? " They meet." : ""}`, s === f ? { [s]: ["hit", "S=F"] } : { [s]: ["cur", "S"], [f]: ["front", "F"] },
        step === 3 ? { q: "Once both are inside the cycle, the gap between them…", options: ["shrinks by 1 each step", "grows", "stays the same"], answer: 0, why: "Fast gains exactly one node per step, so it cannot jump over slow." } : undefined));
    } while (s !== f);
    let p = 0, q = s;
    out.push(frame(`Meeting point ${q}. Now put P at the head and keep Q at the meeting point; move both one step at a time.`, { [p]: ["cur", "P"], [q]: ["front", "Q"] },
      { q: "Where will P and Q meet?", options: [String(entry), String(q), "0"], answer: 0, why: "Head-to-entrance distance μ equals meeting-point-to-entrance distance modulo the cycle length." }));
    while (p !== q) {
      p = next(p); q = next(q);
      out.push(frame(p === q ? `They meet at node ${p}: the cycle entrance.` : `P → ${p}, Q → ${q}.`, p === q ? { [p]: ["hit", "entry"] } : { [p]: ["cur", "P"], [q]: ["front", "Q"] }));
    }
    return out;
  },
};

// ───────────── binary lifting ─────────────
const binaryLifting: Algo = {
  title: "LCA with binary lifting",
  about: "up[v][k] is the 2ᵏ-th ancestor of v. Lift the deeper node to equal depth, then jump both up by the largest powers of two that keep their ancestors different.",
  steps() {
    const parent: Record<string, string | null> = { "1": null, "2": "1", "3": "1", "4": "2", "5": "2", "6": "3", "7": "4", "8": "4", "9": "7", "10": "5", "11": "9" };
    const pos: Record<string, [number, number]> = { "1": [320, 40], "2": [190, 110], "3": [450, 110], "4": [120, 180], "5": [260, 180], "6": [450, 180], "7": [80, 250], "8": [170, 250], "9": [80, 320], "10": [260, 250], "11": [80, 390] };
    const depth = (v: string): number => (parent[v] ? 1 + depth(parent[v]!) : 0);
    const anc = (v: string, k: number): string | null => { let x: string | null = v; for (let i = 0; i < 1 << k && x; i++) x = parent[x]; return x; };
    const out: Step[] = [];
    const edges: GEdge[] = Object.entries(parent).filter(([, p]) => p).map(([v, p]) => ({ a: p!, b: v }));
    const frame = (note: string, marks: Record<string, [S, string?]>, ask?: Step["ask"]): Step => ({
      note, ask,
      graph: { nodes: Object.entries(pos).map(([id, [x, y]]): GNode => ({ id, x, y, label: id, s: marks[id]?.[0], sub: marks[id]?.[1] ?? `d${depth(id)}` })), edges },
      rows: [{ label: "up[11]", cells: [0, 1, 2].map((k) => anc("11", k) ?? "–") }, { label: "up[10]", cells: [0, 1, 2].map((k) => anc("10", k) ?? "–") }],
    });
    let u = "11", v = "10";
    out.push(frame("Find LCA(11, 10). The table rows show 2⁰, 2¹, 2² ancestors, precomputed in O(n log n).", { [u]: ["cur", "u"], [v]: ["front", "v"] }));
    const diff = depth(u) - depth(v);
    out.push(frame(`depth(11) = ${depth(u)}, depth(10) = ${depth(v)}: lift u by ${diff} = ${diff.toString(2)}₂ using the set bits.`, { [u]: ["cur", "u"], [v]: ["front", "v"] },
      { q: `Lifting by ${diff} uses jumps of…`, options: [diff === 2 ? "2" : "2 and 1", "1 three times", "4"], answer: 0, why: "Binary decomposition of the depth difference." }));
    for (let k = 3; k >= 0; k--) if ((diff >> k) & 1) { u = anc(u, k)!; out.push(frame(`Jump u up by 2^${k}: u = ${u}.`, { [u]: ["cur", "u"], [v]: ["front", "v"] })); }
    for (let k = 3; k >= 0; k--) {
      const au = anc(u, k), av = anc(v, k);
      if (au && av && au !== av) { u = au; v = av; out.push(frame(`2^${k} ancestors differ (${au} ≠ ${av}): jump both. u = ${u}, v = ${v}.`, { [u]: ["cur", "u"], [v]: ["front", "v"] })); }
      else if (au && av) out.push(frame(`2^${k} ancestors are equal (${au}): jumping would overshoot the lowest common one. Skip.`, { [u]: ["cur", "u"], [v]: ["front", "v"] }));
    }
    const l = u === v ? u : parent[u]!;
    out.push(frame(`u and v are now children of the answer: LCA = ${l}. O(log n) per query.`, { [l]: ["hit", "LCA"] }));
    return out;
  },
};

// ───────────── AVL rotations ─────────────
type AN = { k: number; l?: AN; r?: AN; h: number };
const avl: Algo = {
  title: "AVL insertions and rotations",
  about: "After each insert, walk up updating heights. The first node whose children's heights differ by 2 is fixed with a single (LL, RR) or double (LR, RL) rotation.",
  steps() {
    const h = (n?: AN) => n?.h ?? 0;
    const fix = (n: AN) => { n.h = 1 + Math.max(h(n.l), h(n.r)); return n; };
    const rotR = (y: AN) => { const x = y.l!; y.l = x.r; x.r = y; fix(y); return fix(x); };
    const rotL = (x: AN) => { const y = x.r!; x.r = y.l; y.l = x; fix(x); return fix(y); };
    const out: Step[] = [];
    let root: AN | undefined;
    const layout = (n: AN | undefined, d: number, lo: number, hiX: number, acc: GNode[], ed: GEdge[], st: Record<number, S>, parent?: number) => {
      if (!n) return;
      const x = (lo + hiX) / 2;
      acc.push({ id: String(n.k), x, y: 40 + d * 75, label: String(n.k), s: st[n.k], sub: `h${n.h}` });
      if (parent !== undefined) ed.push({ a: String(parent), b: String(n.k) });
      layout(n.l, d + 1, lo, x, acc, ed, st, n.k); layout(n.r, d + 1, x, hiX, acc, ed, st, n.k);
    };
    const frame = (note: string, st: Record<number, S> = {}, ask?: Step["ask"]): Step => { const ns: GNode[] = [], es: GEdge[] = []; layout(root, 0, 20, 640, ns, es, st); return { note, ask, graph: { nodes: ns, edges: es } }; };
    let lastCase = "";
    const insert = (n: AN | undefined, k: number): AN => {
      if (!n) return { k, h: 1 };
      if (k < n.k) n.l = insert(n.l, k); else n.r = insert(n.r, k);
      fix(n);
      const bal = h(n.l) - h(n.r);
      if (bal > 1 && k < n.l!.k) { lastCase = `LL at ${n.k}: one right rotation`; return rotR(n); }
      if (bal < -1 && k > n.r!.k) { lastCase = `RR at ${n.k}: one left rotation`; return rotL(n); }
      if (bal > 1) { lastCase = `LR at ${n.k}: left-rotate ${n.l!.k}, then right-rotate ${n.k}`; n.l = rotL(n.l!); return rotR(n); }
      if (bal < -1) { lastCase = `RL at ${n.k}: right-rotate ${n.r!.k}, then left-rotate ${n.k}`; n.r = rotR(n.r!); return rotL(n); }
      return n;
    };
    out.push(frame("Insert 10, 20, 30, 25, 28, 5, 4 into an AVL tree. Labels show subtree height."));
    for (const k of [10, 20, 30, 25, 28, 5, 4]) {
      lastCase = "";
      const ask = k === 28 ? { q: "Inserting 28 unbalances 30 (left-heavy, and 28 went into the left child's right side). Which case?", options: ["LL", "RR", "LR", "RL"], answer: 2, why: "Left child, then its right subtree: a double rotation." } : undefined;
      if (ask) out.push(frame(`About to insert ${k}.`, {}, ask));
      root = insert(root, k);
      out.push(frame(lastCase ? `Insert ${k} → imbalance. ${lastCase}. In-order order is unchanged; height is restored.` : `Insert ${k}: every node still has balance within ±1.`, { [k]: "cur" }));
    }
    out.push(frame("Seven inserts, height 3 instead of up to 7 for a plain BST fed in this order. AVL height ≤ 1.44 log₂ n."));
    return out;
  },
};

// ───────────── trie ─────────────
const trieViz: Algo = {
  title: "Building a trie",
  about: "Each edge is a character; shared prefixes share nodes. Double-circled words end where the end flag is set.",
  steps() {
    type TN = { id: string; ch: string; kids: Map<string, TN>; end: boolean; d: number };
    let ids = 0;
    const root: TN = { id: "r", ch: "·", kids: new Map(), end: false, d: 0 };
    const out: Step[] = [];
    const nodes = (): TN[] => { const all: TN[] = []; const walk = (n: TN) => { all.push(n); [...n.kids.values()].forEach(walk); }; walk(root); return all; };
    const frame = (note: string, path: string[] = [], ask?: Step["ask"]): Step => {
      const xs = new Map<string, number>();
      let leaf = 0;
      const place = (n: TN): number => { const ks = [...n.kids.values()]; const x = ks.length ? ks.map(place).reduce((a, b) => a + b, 0) / ks.length : 40 + 70 * leaf++; xs.set(n.id, x); return x; };
      place(root);
      const ns = nodes();
      return {
        note, ask,
        graph: {
          nodes: ns.map((n): GNode => ({ id: n.id, x: xs.get(n.id)!, y: 30 + n.d * 62, label: n.ch, s: path.includes(n.id) ? "cur" : n.end ? "done" : undefined, sub: n.end ? "end" : undefined })),
          edges: ns.flatMap((n) => [...n.kids.values()].map((c): GEdge => ({ a: n.id, b: c.id, s: path.includes(c.id) ? "cur" : undefined }))),
        },
      };
    };
    out.push(frame("An empty trie: just the root."));
    for (const w of ["car", "cat", "cart", "dog", "do"]) {
      let n = root; const path: string[] = [];
      let created = 0;
      for (const c of w) {
        if (!n.kids.has(c)) { n.kids.set(c, { id: `n${ids++}`, ch: c, kids: new Map(), end: false, d: n.d + 1 }); created++; }
        n = n.kids.get(c)!; path.push(n.id);
      }
      const ask = w === "do" ? { q: "Inserting 'do' after 'dog' creates how many new nodes?", options: ["0", "1", "2"], answer: 0, why: "The path d→o exists; only the end flag is set." } : undefined;
      if (ask) out.push(frame("Next: insert 'do'.", [], ask));
      n.end = true;
      out.push(frame(`Insert '${w}': ${created ? `${created} new node${created > 1 ? "s" : ""}` : "no new nodes"}, ${w.length - created} shared. Mark the last node as a word end.`, path));
    }
    out.push(frame("search('ca') is false (no end flag) but startsWith('ca') is true. Every operation costs O(word length)."));
    return out;
  },
};

// ───────────── DFS edge classification ─────────────
const dfsEdges: Algo = {
  title: "DFS edge types and cycle detection",
  about: "White = unvisited, grey = on the current path, black = finished. An edge to a grey vertex is a back edge, which means a cycle.",
  steps() {
    const P: Record<string, [number, number]> = { A: [80, 80], B: [240, 50], C: [400, 80], D: [160, 220], E: [320, 220], F: [520, 200] };
    const E: [string, string][] = [["A", "B"], ["B", "C"], ["A", "D"], ["D", "E"], ["E", "B"], ["C", "E"], ["C", "F"], ["A", "E"]];
    const adj: Record<string, string[]> = {};
    for (const [a, b] of E) (adj[a] ??= []).push(b);
    const col: Record<string, "w" | "g" | "b"> = Object.fromEntries(Object.keys(P).map((v) => [v, "w"]));
    const tin: Record<string, number> = {}, tout: Record<string, number> = {};
    const kind: Record<string, string> = {};
    let t = 0;
    const out: Step[] = [];
    const frame = (note: string, cur?: string, ask?: Step["ask"]): Step => ({
      note, ask,
      graph: {
        nodes: Object.entries(P).map(([id, [x, y]]): GNode => ({ id, x, y, label: id, s: col[id] === "g" ? (id === cur ? "cur" : "front") : col[id] === "b" ? "done" : undefined, sub: tin[id] !== undefined ? `${tin[id]}/${tout[id] ?? "·"}` : undefined })),
        edges: E.map(([a, b]): GEdge => ({ a, b, dir: true, w: kind[`${a}${b}`], s: kind[`${a}${b}`] === "back" ? "bad" : kind[`${a}${b}`] === "tree" ? "done" : kind[`${a}${b}`] ? "dim" : undefined })),
      },
      vars: { "label": "tin / tout" },
    });
    out.push(frame("Directed graph. Run DFS from A and classify every edge as it is examined."));
    let asked = false;
    const dfs = (u: string) => {
      col[u] = "g"; tin[u] = t++;
      out.push(frame(`Enter ${u} (grey), tin = ${tin[u]}.`, u));
      for (const v of adj[u] ?? []) {
        if (col[v] === "w") { kind[`${u}${v}`] = "tree"; out.push(frame(`${u}→${v}: ${v} is white, a tree edge. Go deeper.`, u)); dfs(v); }
        else if (col[v] === "g") {
          const ask = !asked ? { q: `${u}→${v}: ${v} is grey. What kind of edge is it?`, options: ["tree", "back", "forward", "cross"], answer: 1, why: `${v} is an ancestor still on the recursion path: a cycle.` } : undefined;
          asked = true;
          kind[`${u}${v}`] = "back"; out.push(frame(`${u}→${v}: ${v} is grey (on the current path): a back edge. The graph has a cycle.`, u, ask));
        } else if (tin[u] < tin[v]) { kind[`${u}${v}`] = "fwd"; out.push(frame(`${u}→${v}: ${v} is black and was discovered after ${u}: a forward edge (to a descendant).`, u)); }
        else { kind[`${u}${v}`] = "cross"; out.push(frame(`${u}→${v}: ${v} is black and in another branch: a cross edge. Not a cycle.`, u)); }
      }
      col[u] = "b"; tout[u] = t++;
      out.push(frame(`${u} finishes (black), tout = ${tout[u]}.`, u));
    };
    dfs("A");
    out.push(frame("Interval nesting: v is a descendant of u exactly when tin[u] < tin[v] < tout[v] < tout[u]. Reversed finish order is a topological order when there is no back edge."));
    return out;
  },
};

// ───────────── Bellman–Ford ─────────────
const bellmanFord: Algo = {
  title: "Bellman–Ford, round by round",
  about: "Relax every edge in each round. After round i, all shortest paths using at most i edges are correct. A change in round V reveals a negative cycle.",
  steps() {
    const P: Record<string, [number, number]> = { S: [60, 150], A: [220, 60], B: [220, 240], C: [400, 60], D: [400, 240], T: [560, 150] };
    // listed in an unlucky order on purpose, so improvements need several rounds to propagate
    const E: [string, string, number][] = [["C", "T", 2], ["D", "C", -3], ["D", "T", 6], ["A", "C", 3], ["B", "D", 4], ["B", "A", -2], ["S", "A", 4], ["S", "B", 5]];
    const V = Object.keys(P);
    const dist: Record<string, number> = Object.fromEntries(V.map((v) => [v, Infinity])); dist.S = 0;
    const out: Step[] = [];
    const show = (x: number) => (x === Infinity ? "∞" : x);
    const frame = (note: string, cur?: [string, string], changed: string[] = [], ask?: Step["ask"]): Step => ({
      note, ask,
      graph: { nodes: V.map((id): GNode => ({ id, x: P[id][0], y: P[id][1], label: id, sub: String(show(dist[id])), s: changed.includes(id) ? "hit" : dist[id] < Infinity ? "done" : undefined })), edges: E.map(([a, b, w]): GEdge => ({ a, b, w, dir: true, s: cur && cur[0] === a && cur[1] === b ? "cur" : undefined })) },
      rows: [{ label: "dist", cells: V.map((v) => `${v}:${show(dist[v])}`) }],
    });
    let askedBF = false;
    out.push(frame("Negative edges (B→A = −2, D→C = −3) rule out Dijkstra. dist[S] = 0, everything else ∞."));
    for (let r = 1; r < V.length; r++) {
      let changed = false;
      for (const [a, b, w] of E) {
        if (dist[a] + w < dist[b]) {
          const old = dist[b]; dist[b] = dist[a] + w; changed = true;
          out.push(frame(`Round ${r}: relax ${a}→${b}: ${show(dist[a])} + (${w}) = ${dist[b]} < ${show(old)}. Update.`, [a, b], [b],
            r >= 2 && !askedBF ? (askedBF = true, { q: `Why can ${b} still improve in round ${r}?`, options: ["Its best path uses more edges than earlier rounds covered", "An earlier round was wrong", "There is a negative cycle"], answer: 0, why: "Round i fixes every shortest path that uses at most i edges." }) : undefined));
        }
      }
      if (!changed) { out.push(frame(`Round ${r}: no edge improves anything. Distances are final; stop early.`)); break; }
      out.push(frame(`End of round ${r}.`));
    }
    out.push(frame(`Shortest distances from S: ${V.map((v) => `${v}=${show(dist[v])}`).join(", ")}. O(V·E) worst case; one more round with an update would mean a negative cycle.`));
    return out;
  },
};

// ───────────── Floyd–Warshall ─────────────
const floydWarshall: Algo = {
  title: "Floyd–Warshall: allowing one more intermediate vertex",
  about: "After iteration k, dist[i][j] is the shortest path using only intermediates 0..k. Each cell updates via dist[i][k] + dist[k][j].",
  steps() {
    const INF = Infinity, n = 4;
    const d = [[0, 3, INF, 7], [8, 0, 2, INF], [5, INF, 0, 1], [2, INF, INF, 0]];
    const out: Step[] = [];
    const show = (x: number) => (x === INF ? "∞" : x);
    const frame = (note: string, k: number, upd: [number, number][] = [], ask?: Step["ask"]): Step => ({
      note, ask,
      grid: { rowH: ["0", "1", "2", "3"], colH: ["0", "1", "2", "3"], cells: d.map((r) => r.map(show)), s: d.map((r, i) => r.map((_, j) => (upd.some(([a, b]) => a === i && b === j) ? "hit" : k >= 0 && (i === k || j === k) ? "front" : undefined))) },
      vars: { k: k < 0 ? "–" : k },
    });
    out.push(frame("Direct edge weights (∞ = no edge). The orange row and column at each step belong to the intermediate vertex k.", -1));
    for (let k = 0; k < n; k++) {
      const upd: [number, number][] = [];
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (d[i][k] + d[k][j] < d[i][j]) { d[i][j] = d[i][k] + d[k][j]; upd.push([i, j]); }
      out.push(frame(upd.length ? `k = ${k}: routing through ${k} improves ${upd.map(([i, j]) => `(${i},${j})→${d[i][j]}`).join(", ")}.` : `k = ${k}: no pair improves by going through ${k}.`, k, upd,
        k === 1 ? { q: "Why must k be the outermost loop?", options: ["dist[i][k] and dist[k][j] must already use intermediates < k", "It is faster", "It saves memory"], answer: 0, why: "That is the DP's state order." } : undefined));
    }
    out.push(frame("All-pairs shortest paths in O(V³). A negative value on the diagonal would signal a negative cycle.", -1));
    return out;
  },
};

// ───────────── DP tables: knapsack, edit distance, interval DP ─────────────
const knapsack: Algo = {
  title: "0/1 knapsack table",
  about: "dp[i][w] = best value using the first i items with capacity w: skip item i, or take it and look at dp[i − 1][w − weight].",
  steps() {
    const items: [string, number, number][] = [["A", 1, 1], ["B", 3, 4], ["C", 4, 5], ["D", 5, 7]];
    const W = 7;
    const dp = Array.from({ length: items.length + 1 }, () => Array(W + 1).fill(0));
    const out: Step[] = [];
    const filled = new Set<string>(["0"]);
    const frame = (note: string, cur?: [number, number], from: [number, number][] = [], ask?: Step["ask"]): Step => ({
      note, ask,
      grid: { rowH: ["∅", ...items.map(([n, w, v]) => `${n} w${w} v${v}`)], colH: Array.from({ length: W + 1 }, (_, i) => String(i)), cells: dp.map((r, i) => r.map((x, j) => (i === 0 || filled.has(`${i},${j}`) ? x : ""))), s: dp.map((r, i) => r.map((_, j) => (cur && cur[0] === i && cur[1] === j ? "cur" : from.some(([a, b]) => a === i && b === j) ? "front" : i === 0 ? "dim" : undefined))) },
    });
    out.push(frame("Capacity 7. Row 0 is 'no items': value 0 everywhere."));
    for (let i = 1; i <= items.length; i++) {
      const [n, wt, val] = items[i - 1];
      for (let w = 0; w <= W; w++) {
        const skip = dp[i - 1][w], take = w >= wt ? dp[i - 1][w - wt] + val : -1;
        dp[i][w] = Math.max(skip, take);
        filled.add(`${i},${w}`);
        if ((i === 3 && w === 7) || (i === 4 && (w === 7 || w === 5))) {
          out.push(frame(`dp[${n}][${w}]: skip = ${skip}${take >= 0 ? `, take = dp[prev][${w - wt}] + ${val} = ${take}` : " (does not fit)"} → ${dp[i][w]}.`, [i, w], take >= 0 ? [[i - 1, w], [i - 1, w - wt]] : [[i - 1, w]],
            i === 4 && w === 7 ? { q: "Best value with capacity 7?", options: ["9", "11", "12"], answer: [9, 11, 12].indexOf(Math.max(skip, take)), why: "Compare skipping D with taking D plus the best for capacity 2." } : undefined));
        }
      }
      out.push(frame(`Row ${n} filled.`));
    }
    out.push(frame(`Answer dp[D][7] = ${dp[items.length][W]}. O(n·W) time; with one array iterate w downwards so each item is used once.`));
    return out;
  },
};

const editDistance: Algo = {
  title: "Edit distance table",
  about: "dp[i][j] = edits to turn the first i letters of a into the first j of b. Match: copy the diagonal. Otherwise 1 + min(delete ↑, insert ←, replace ↖).",
  steps() {
    const a = "horse", b = "ros";
    const dp = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
    const done = new Set<string>();
    const out: Step[] = [];
    const frame = (note: string, cur?: [number, number], from: [number, number][] = [], ask?: Step["ask"]): Step => ({
      note, ask,
      grid: { rowH: ["∅", ...a], colH: ["∅", ...b], cells: dp.map((r, i) => r.map((x, j) => (i === 0 || j === 0 || done.has(`${i},${j}`) ? x : ""))), s: dp.map((r, i) => r.map((_, j) => (cur && cur[0] === i && cur[1] === j ? "cur" : from.some(([p, q]) => p === i && q === j) ? "front" : i === 0 || j === 0 ? "dim" : undefined))) },
    });
    out.push(frame("Base cases: turning a prefix into the empty string costs its length (row 0 and column 0)."));
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) { dp[i][j] = dp[i - 1][j - 1]; done.add(`${i},${j}`); out.push(frame(`'${a[i - 1]}' = '${b[j - 1]}': free, copy the diagonal → ${dp[i][j]}.`, [i, j], [[i - 1, j - 1]])); }
      else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]); done.add(`${i},${j}`);
        out.push(frame(`'${a[i - 1]}' ≠ '${b[j - 1]}': 1 + min(delete ${dp[i - 1][j]}, insert ${dp[i][j - 1]}, replace ${dp[i - 1][j - 1]}) = ${dp[i][j]}.`, [i, j], [[i - 1, j], [i, j - 1], [i - 1, j - 1]],
          i === 2 && j === 1 ? { q: "dp[ho][r]: which move is cheapest?", options: ["delete", "insert", "replace"], answer: 0, why: "Delete 'o' after turning 'h' into 'r' with one replace: 1 + 1." } : undefined));
      }
    }
    out.push(frame(`Edit distance('horse', 'ros') = ${dp[a.length][b.length]}. O(n·m) time, one row of space if only the value is needed.`));
    return out;
  },
};

const intervalDp: Algo = {
  title: "Interval DP: Burst Balloons",
  about: "dp[l][r] = best coins from bursting every balloon strictly between l and r. Choose the LAST balloon k to burst: its neighbours are then exactly l and r.",
  steps() {
    const v = [1, 3, 1, 5, 8, 1];
    const n = v.length;
    const dp = Array.from({ length: n }, () => Array(n).fill(0));
    const done = new Set<string>();
    const out: Step[] = [];
    const frame = (note: string, cur?: [number, number], ask?: Step["ask"]): Step => ({
      note, ask,
      grid: { rowH: v.map((x, i) => `${i}:${x}`), colH: v.map((x, i) => `${i}:${x}`), cells: dp.map((r, i) => r.map((x, j) => (j > i + 1 && done.has(`${i},${j}`) ? x : j <= i + 1 ? "·" : ""))), s: dp.map((r, i) => r.map((_, j) => (cur && cur[0] === i && cur[1] === j ? "cur" : j <= i + 1 ? "dim" : undefined))) },
    });
    out.push(frame("Balloons 3, 1, 5, 8 padded with 1s at both ends (indices 0..5). Fill intervals by increasing length.", undefined, { q: "Why pick the LAST balloon in (l, r) instead of the first?", options: ["Its neighbours are then fixed: l and r", "It is cheaper to compute", "The first is always optimal"], answer: 0, why: "Picking first would change neighbours inside both halves." }));
    for (let len = 2; len < n; len++) for (let l = 0; l + len < n; l++) {
      const r = l + len;
      let best = 0, bk = -1;
      for (let k = l + 1; k < r; k++) { const c = dp[l][k] + dp[k][r] + v[l] * v[k] * v[r]; if (c > best) { best = c; bk = k; } }
      dp[l][r] = best; done.add(`${l},${r}`);
      out.push(frame(`dp[${l}][${r}] = ${best}: burst balloon ${bk} (value ${v[bk]}) last, earning ${v[l]}·${v[bk]}·${v[r]} plus both sides.`, [l, r]));
    }
    out.push(frame(`Maximum coins = dp[0][5] = ${dp[0][n - 1]}. O(n³): n² intervals × n choices of the last balloon.`));
    return out;
  },
};

// ───────────── KMP prefix function ─────────────
const kmp: Algo = {
  title: "KMP prefix function",
  about: "π[i] = length of the longest proper prefix of s[0..i] that is also a suffix. On a mismatch, fall back to π[k − 1] instead of restarting.",
  steps() {
    const s = "aabaaab", n = s.length;
    const pi = Array(n).fill(0);
    const out: Step[] = [];
    let k = 0;
    const frame = (note: string, i: number, ask?: Step["ask"]): Step => ({
      note, ask,
      rows: [{ label: "s", cells: [...s], hi: hi([...s].map((_, j) => [j, j === i ? "cur" : j < k ? "front" : undefined])), ptr: { i, k } }, { label: "π", cells: pi.map((x, j) => (j <= i ? x : "")) }],
      vars: { "border length k": k },
    });
    out.push(frame("π[0] = 0 by definition. k is the length of the current border (the orange prefix).", 0));
    for (let i = 1; i < n; i++) {
      while (k > 0 && s[i] !== s[k]) { const old = k; k = pi[k - 1]; out.push(frame(`s[${i}] = '${s[i]}' ≠ s[${old}] = '${s[old]}': fall back k = π[${old - 1}] = ${k}.`, i, i === 5 ? { q: "After the fallback, is the next comparison s[5] vs s[k]?", options: ["Yes, with the shorter border", "No, restart from 0"], answer: 0, why: "Shorter borders of the border are tried in decreasing length." } : undefined)); }
      if (s[i] === s[k]) k++;
      pi[i] = k;
      out.push(frame(`π[${i}] = ${k}: '${s.slice(0, k)}' is both a prefix and a suffix of '${s.slice(0, i + 1)}'.`, i));
    }
    out.push(frame(`π = [${pi.join(", ")}]. k rises at most n times and each fallback lowers it, so the total is O(n). Matching text uses the same loop.`, n - 1));
    return out;
  },
};

// ───────────── Fenwick tree ─────────────
const fenwick: Algo = {
  title: "Fenwick tree: update and prefix query",
  about: "tree[i] covers (i − lowbit(i), i]. Updates climb with i += i & −i; queries descend with i −= i & −i. Both touch O(log n) cells.",
  steps() {
    const a = [3, 2, -1, 6, 5, 4, -3, 3];
    const n = a.length;
    const t = Array(n + 1).fill(0);
    for (let i = 1; i <= n; i++) { t[i] += a[i - 1]; const p = i + (i & -i); if (p <= n) t[p] += t[i]; }
    const out: Step[] = [];
    const frame = (note: string, touched: number[] = [], ask?: Step["ask"]): Step => ({
      note, ask,
      rows: [
        { label: "i", cells: Array.from({ length: n }, (_, i) => i + 1) },
        { label: "a", cells: [...a] },
        { label: "tree", cells: t.slice(1), hi: hi(touched.map((i) => [i - 1, "cur"])) },
        { label: "covers", cells: Array.from({ length: n }, (_, k) => { const i = k + 1; return `${i - (i & -i) + 1}..${i}`; }) },
      ],
    });
    out.push(frame("Built in O(n). Each tree[i] stores the sum of the range shown below it."));
    const path: number[] = []; let s = 0;
    for (let i = 6; i > 0; i -= i & -i) { path.push(i); s += t[i]; }
    out.push(frame(`query(6): visit ${path.join(" → ")} (each step removes the lowest set bit). Sum = ${s}.`, path, { q: "How many cells does query(6) visit?", options: ["2", "3", "6"], answer: 0, why: "6 = 110₂ has two set bits." }));
    const up: number[] = [];
    for (let i = 3; i <= n; i += i & -i) { up.push(i); t[i] += 4; }
    a[2] += 4;
    out.push(frame(`update(3, +4): climb ${up.join(" → ")} (each step adds the lowest set bit), adding 4 to every range that contains index 3.`, up));
    const p2: number[] = []; let s2 = 0;
    for (let i = 6; i > 0; i -= i & -i) { p2.push(i); s2 += t[i]; }
    out.push(frame(`query(6) again = ${s2} (was ${s}). Range sum [l, r] = query(r) − query(l − 1).`, p2));
    return out;
  },
};

// ───────────── segment tree ─────────────
const segmentTree: Algo = {
  title: "Segment tree range sum",
  about: "Each node stores the sum of its range. A query takes fully covered nodes whole, ignores disjoint ones and splits partial ones: O(log n) nodes.",
  steps() {
    const a = [2, 1, 5, 3, 4, 2, 6, 1];
    type SN = { id: string; l: number; r: number; sum: number; x: number; y: number; kids?: [SN, SN] };
    let ids = 0;
    const build = (l: number, r: number, d: number, x0: number, x1: number): SN => {
      const id = `s${ids++}`, x = (x0 + x1) / 2, y = 30 + d * 75;
      if (l === r) return { id, l, r, sum: a[l], x, y };
      const m = (l + r) >> 1, L = build(l, m, d + 1, x0, x), R = build(m + 1, r, d + 1, x, x1);
      return { id, l, r, sum: L.sum + R.sum, x, y, kids: [L, R] };
    };
    const root = build(0, a.length - 1, 0, 10, 650);
    const all: SN[] = []; const walk = (n: SN) => { all.push(n); n.kids?.forEach(walk); }; walk(root);
    const out: Step[] = [];
    const frame = (note: string, st: Record<string, S> = {}, ask?: Step["ask"]): Step => ({
      note, ask,
      graph: { nodes: all.map((n): GNode => ({ id: n.id, x: n.x, y: n.y, label: String(n.sum), sub: n.l === n.r ? `${n.l}` : `${n.l}-${n.r}`, s: st[n.id] })), edges: all.flatMap((n) => (n.kids ?? []).map((c): GEdge => ({ a: n.id, b: c.id, s: st[c.id] === "done" || st[c.id] === "hit" ? "done" : undefined }))) },
      rows: [{ label: "a", cells: a }],
    });
    out.push(frame("Leaves hold the array; each parent holds its children's sum. Query sum of indices 2..6."));
    const st: Record<string, S> = {}; let total = 0; const taken: string[] = [];
    const q = (n: SN, ql: number, qr: number) => {
      if (qr < n.l || n.r < ql) { st[n.id] = "dim"; return; }
      if (ql <= n.l && n.r <= qr) { st[n.id] = "hit"; total += n.sum; taken.push(`[${n.l}..${n.r}]=${n.sum}`); out.push(frame(`Node [${n.l}..${n.r}] lies fully inside: take its sum ${n.sum} without descending.`, { ...st })); return; }
      st[n.id] = "cur"; out.push(frame(`Node [${n.l}..${n.r}] overlaps partially: split into both children.`, { ...st }));
      n.kids!.forEach((c) => q(c, ql, qr));
      st[n.id] = "done";
    };
    q(root, 2, 6);
    out.push(frame(`Answer ${taken.join(" + ")} = ${total}. Only a few nodes per level were touched, so queries and point updates are O(log n).`, { ...st }, { q: "At most how many partially overlapping nodes can a query meet per level?", options: ["1", "2", "all of them"], answer: 1, why: "Only the nodes containing the two query endpoints." }));
    return out;
  },
};

// ───────────── quickselect ─────────────
const quickselect: Algo = {
  title: "Quickselect (Lomuto partition)",
  about: "Partition around a pivot; the pivot lands at its final sorted index. Recurse only into the side that contains k.",
  steps() {
    const a = [7, 2, 9, 4, 1, 8, 3, 6, 5];
    const k = 2; // 0-based: the 3rd smallest
    let lo = 0, hiI = a.length - 1;
    const out: Step[] = [];
    const frame = (note: string, mark: Record<number, S> = {}, ask?: Step["ask"]): Step => ({
      note, ask,
      rows: [{ label: "a", cells: [...a], hi: { ...hi(a.map((_, i) => [i, i < lo || i > hiI ? "dim" : undefined])), ...mark }, range: [lo, hiI], ptr: { k } }],
      vars: { "target index k": k, range: `${lo}..${hiI}` },
    });
    out.push(frame("Find the element at sorted index 2 (the 3rd smallest) without sorting the array."));
    let asked = false;
    while (lo <= hiI) {
      const pivot = a[hiI]; let w = lo;
      for (let r = lo; r < hiI; r++) if (a[r] < pivot) { [a[w], a[r]] = [a[r], a[w]]; w++; }
      [a[w], a[hiI]] = [a[hiI], a[w]];
      const ask = !asked ? { q: `The pivot ${pivot} landed at index ${w}. Where next?`, options: [w === k ? "done" : w < k ? "right side" : "left side", w < k ? "left side" : "right side", "both sides"], answer: 0, why: "Only the side containing k can hold the answer." } : undefined;
      asked = true;
      out.push(frame(`Pivot ${pivot}: smaller values moved left; it lands at index ${w}, its final sorted position.`, { [w]: "hit" }, ask));
      if (w === k) { out.push(frame(`Index ${w} = k: the answer is ${a[w]}. Expected work n + n/2 + … ≈ 2n.`, { [w]: "hit" })); break; }
      if (w < k) lo = w + 1; else hiI = w - 1;
      out.push(frame(`Discard the ${w < k ? "left" : "right"} side; continue in ${lo}..${hiI}.`));
    }
    return out;
  },
};

export const DSA_ALGOS: Record<string, Algo> = {
  "hash-table": hashTable, "dutch-flag": dutchFlag, "mono-deque": monoDeque, "floyd-cycle": floydCycle, "binary-lifting": binaryLifting,
  "avl-rotation": avl, trie: trieViz, "dfs-edges": dfsEdges, "bellman-ford": bellmanFord, "floyd-warshall": floydWarshall,
  knapsack, "edit-distance": editDistance, "interval-dp": intervalDp, kmp, fenwick, "segment-tree": segmentTree, quickselect,
};
