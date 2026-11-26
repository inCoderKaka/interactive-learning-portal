/**
 * Step players for the advanced graph pages. Every step is produced by running the real algorithm on the
 * example graph, so the frames cannot drift from what the code does. `ask` marks the moments worth predicting.
 */
import type { Algo, GEdge, GNode, Row, S, Step } from "./algos";

type P = Record<string, [number, number]>;
const nodesOf = (pos: P, st: Record<string, S | undefined> = {}, sub: Record<string, string | undefined> = {}): GNode[] =>
  Object.entries(pos).map(([id, [x, y]]) => ({ id, x, y, label: id, s: st[id], sub: sub[id] }));
const key = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

// ───────────────────────── Kruskal ─────────────────────────
const MST_POS: P = { A: [70, 60], B: [260, 40], C: [450, 60], D: [140, 190], E: [340, 190], F: [210, 320], G: [470, 310] };
const MST_E: [string, string, number][] = [["A", "B", 7], ["A", "D", 5], ["B", "C", 8], ["B", "D", 9], ["B", "E", 7], ["C", "E", 5], ["D", "E", 15], ["D", "F", 6], ["E", "F", 8], ["E", "G", 9], ["F", "G", 11]];

const kruskal: Algo = {
  title: "Kruskal's MST with union-find",
  about: "Sort the edges by weight and take each one unless it joins two vertices already connected. Union-find answers that in near-constant time.",
  steps() {
    const out: Step[] = [];
    const parent: Record<string, string> = Object.fromEntries(Object.keys(MST_POS).map((v) => [v, v]));
    const find = (x: string): string => (parent[x] === x ? x : (parent[x] = find(parent[x])));
    const sorted = [...MST_E].sort((a, b) => a[2] - b[2] || (a[0] + a[1]).localeCompare(b[0] + b[1]));
    const state: Record<string, S | undefined> = {};
    let total = 0, taken = 0;
    const comps = () => { const r = new Map<string, string[]>(); for (const v of Object.keys(MST_POS)) { const k = find(v); r.set(k, [...(r.get(k) ?? []), v]); } return [...r.values()].map((g) => `{${g.join("")}}`).join(" "); };
    const frame = (note: string, cur?: number, ask?: Step["ask"]): Step => ({
      note, ask,
      graph: { nodes: nodesOf(MST_POS), edges: MST_E.map(([a, b, w]): GEdge => ({ a, b, w, s: cur !== undefined && key(a, b) === key(sorted[cur][0], sorted[cur][1]) ? "cur" : state[key(a, b)] })) },
      rows: [{ label: "sorted", cells: sorted.map(([a, b, w]) => `${a}${b}:${w}`), hi: Object.fromEntries(sorted.map(([a, b], i) => [i, i === cur ? "cur" : state[key(a, b)] === "done" ? "done" : state[key(a, b)] === "dim" ? "dim" : undefined]).filter(([, s]) => s)) as Record<number, S> }],
      vars: { "MST weight": total, "edges taken": `${taken} / ${Object.keys(MST_POS).length - 1}`, components: comps() },
    });
    out.push(frame("Seven vertices, eleven weighted edges. Kruskal never looks at the graph's shape: it sorts all edges by weight and walks the list once."));
    sorted.forEach(([a, b, w], i) => {
      const same = find(a) === find(b);
      out.push(frame(`Next lightest edge: ${a}–${b} (weight ${w}). Are ${a} and ${b} already in the same component?`, i,
        i === 4 || i === 6 ? { q: `Does Kruskal take ${a}–${b}?`, options: ["Yes, it joins two components", "No, it would close a cycle"], answer: same ? 1 : 0, why: same ? `find(${a}) = find(${b}): they are already connected, so this edge would make a cycle.` : `find(${a}) ≠ find(${b}): taking it merges two components.` } : undefined));
      if (same) {
        state[key(a, b)] = "dim";
        out.push(frame(`find(${a}) = find(${b}): already connected. ${a}–${b} would close a cycle, and the cycle property says the heaviest edge on a cycle is never needed. Skip it.`, i));
      } else {
        parent[find(a)] = find(b);
        state[key(a, b)] = "done"; total += w; taken++;
        out.push(frame(`Different components, so take ${a}–${b} and union them. Total weight is now ${total}.${taken === Object.keys(MST_POS).length - 1 ? " That is V − 1 edges: the tree is complete, and the remaining edges can only be rejected." : ""}`, i));
      }
    });
    out.push(frame(`Done: ${taken} edges, total weight ${total}. Every accepted edge was the lightest edge crossing some cut, which is exactly why the result is a minimum spanning tree.`));
    return out;
  },
};

// ───────────────────────── Prim ─────────────────────────
const prim: Algo = {
  title: "Prim's MST with a min-heap",
  about: "Grow one tree from a start vertex. The heap holds every edge leaving the tree; always take the lightest one that reaches a new vertex.",
  steps() {
    const out: Step[] = [];
    const adj: Record<string, [string, number][]> = {};
    for (const [a, b, w] of MST_E) { (adj[a] ??= []).push([b, w]); (adj[b] ??= []).push([a, w]); }
    const inT = new Set<string>(), tree = new Set<string>();
    const heap: [number, string, string][] = [];
    let total = 0;
    const push = (u: string) => { for (const [v, w] of adj[u]) if (!inT.has(v)) heap.push([w, u, v]); heap.sort((x, y) => x[0] - y[0] || x[2].localeCompare(y[2])); };
    const frame = (note: string, cur?: [string, string], ask?: Step["ask"]): Step => ({
      note, ask,
      graph: { nodes: nodesOf(MST_POS, Object.fromEntries([...inT].map((v) => [v, "done"]))), edges: MST_E.map(([a, b, w]): GEdge => ({ a, b, w, s: cur && key(a, b) === key(cur[0], cur[1]) ? "cur" : tree.has(key(a, b)) ? "done" : inT.has(a) !== inT.has(b) ? "front" : undefined })) },
      rows: [{ label: "heap", cells: heap.length ? heap.map(([w, u, v]) => `${w}:${u}${v}`) : ["∅"], hi: heap.length ? { 0: "front" } : {} }],
      vars: { "in tree": [...inT].join("") || "–", "MST weight": total },
    });
    inT.add("A"); push("A");
    out.push(frame("Start the tree at A and push every edge leaving A into the min-heap. Orange edges cross the cut between the tree and the rest."));
    let asked = false;
    while (heap.length) {
      const [w, u, v] = heap.shift()!;
      if (inT.has(v)) { out.push(frame(`Pop ${u}–${v} (${w}), but ${v} is already in the tree: a stale entry. Lazy Prim simply discards it.`, [u, v])); continue; }
      const askNow = !asked && inT.size === 3; if (askNow) asked = true;
      out.push(frame(`Pop the lightest crossing edge: ${u}–${v} (${w}). By the cut property it belongs to some MST.`, [u, v], askNow ? { q: "Which vertex joins the tree next?", options: [v, ...Object.keys(MST_POS).filter((x) => !inT.has(x) && x !== v).slice(0, 2)].sort(), answer: [v, ...Object.keys(MST_POS).filter((x) => !inT.has(x) && x !== v).slice(0, 2)].sort().indexOf(v), why: `The heap's minimum is ${u}–${v} with weight ${w}.` } : undefined));
      inT.add(v); tree.add(key(u, v)); total += w; push(v);
      out.push(frame(`Add ${v} (total ${total}) and push its edges to vertices outside the tree.`));
    }
    out.push(frame(`Heap empty: the tree spans all ${inT.size} vertices with weight ${total}, the same as Kruskal. With a binary heap this is O(E log V); with an array scan instead of a heap it is O(V²), better for dense graphs.`));
    return out;
  },
};

// ───────────────────────── Tarjan low-link: bridges and articulation points ─────────────────────────
const BR_POS: P = { "0": [70, 70], "1": [200, 150], "2": [70, 230], "3": [340, 150], "4": [470, 150], "5": [405, 270], "6": [560, 60], "7": [600, 190] };
const BR_E: [string, string][] = [["0", "1"], ["1", "2"], ["2", "0"], ["1", "3"], ["3", "4"], ["4", "5"], ["5", "3"], ["4", "6"], ["6", "7"]];

const tarjanBridges: Algo = {
  title: "Tarjan's low-link: bridges and articulation points",
  about: "DFS stamps each vertex with disc (discovery time). low[u] is the earliest disc reachable from u's subtree using tree edges plus at most one back edge. A child v with low[v] > disc[u] means edge u–v is a bridge.",
  steps() {
    const out: Step[] = [];
    const adj: Record<string, string[]> = {};
    for (const [a, b] of BR_E) { (adj[a] ??= []).push(b); (adj[b] ??= []).push(a); }
    const disc: Record<string, number> = {}, low: Record<string, number> = {};
    const st: Record<string, S | undefined> = {}, es: Record<string, S | undefined> = {};
    const bridges: string[] = [], aps = new Set<string>();
    let timer = 0;
    const frame = (note: string, ask?: Step["ask"]): Step => ({
      note, ask,
      graph: { nodes: nodesOf(BR_POS, { ...st, ...Object.fromEntries([...aps].map((v) => [v, st[v] === "cur" ? "cur" : "front"])) }, Object.fromEntries(Object.keys(disc).map((v) => [v, `${disc[v]} / ${low[v]}`]))), edges: BR_E.map(([a, b]): GEdge => ({ a, b, s: es[key(a, b)] })) },
      vars: { "node label": "disc / low", bridges: bridges.join(", ") || "–", "articulation pts": [...aps].join(", ") || "–" },
    });
    out.push(frame("An undirected graph: two triangles joined by edge 1–3, and a tail 4–6–7. Which single edge removals disconnect it? Run DFS from 0 and keep two numbers per vertex."));
    let askedBridge = false;
    const dfs = (u: string, parent: string | null) => {
      disc[u] = low[u] = timer++;
      st[u] = "cur";
      out.push(frame(`Visit ${u}: disc[${u}] = low[${u}] = ${disc[u]}.`));
      let kids = 0;
      for (const v of adj[u]) {
        if (v === parent) continue;
        if (disc[v] === undefined) {
          es[key(u, v)] = "done"; kids++;
          st[u] = "front";
          dfs(v, u);
          st[u] = "cur";
          const before = low[u];
          low[u] = Math.min(low[u], low[v]);
          const isBridge = low[v] > disc[u];
          let ask: Step["ask"];
          if (!askedBridge && u === "1" && v === "3") {
            askedBridge = true;
            ask = { q: `Back at 1 from child 3: low[3] = ${low[v]}, disc[1] = ${disc[u]}. Is 1–3 a bridge?`, options: ["Yes", "No"], answer: isBridge ? 0 : 1, why: isBridge ? "Nothing in 3's subtree reaches 1 or above without edge 1–3." : "3's subtree has a back edge to 1 or above." };
          }
          out.push(frame(`Back at ${u} from child ${v}: low[${u}] = min(${before}, low[${v}] = ${low[v]}) = ${low[u]}. Check low[${v}] > disc[${u}]: ${low[v]} > ${disc[u]}?`, ask));
          if (isBridge) { es[key(u, v)] = "bad"; bridges.push(`${u}–${v}`); out.push(frame(`Yes: nothing in ${v}'s subtree climbs back to ${u} or above, so ${u}–${v} is a bridge.`)); }
          if (parent !== null && low[v] >= disc[u] && !aps.has(u)) { aps.add(u); out.push(frame(`Also low[${v}] = ${low[v]} ≥ disc[${u}] = ${disc[u]}: removing ${u} cuts ${v}'s subtree off. ${u} is an articulation point.`)); }
        } else {
          const before = low[u];
          low[u] = Math.min(low[u], disc[v]);
          if (es[key(u, v)] === undefined) es[key(u, v)] = "dim";
          if (low[u] !== before) out.push(frame(`${u}–${v} is a back edge to an ancestor: low[${u}] = min(${before}, disc[${v}] = ${disc[v]}) = ${low[u]}. A cycle runs through it, so no edge on that cycle is a bridge.`));
        }
      }
      if (parent === null && kids >= 2) { aps.add(u); out.push(frame(`The root ${u} has ${kids} DFS children, so it is an articulation point.`)); }
      st[u] = "done";
    };
    dfs("0", null);
    out.push(frame(`Finished in one DFS, O(V + E). Bridges (red): ${bridges.join(", ")}. Articulation points (orange): ${[...aps].join(", ")}. Dashed edges are back edges: each one closes a cycle.`));
    return out;
  },
};

// ───────────────────────── Kosaraju SCC ─────────────────────────
const SCC_POS: P = { "0": [70, 80], "1": [200, 40], "2": [200, 170], "3": [340, 110], "4": [470, 50], "5": [470, 190], "6": [600, 110], "7": [600, 260] };
const SCC_E: [string, string][] = [["0", "1"], ["1", "2"], ["2", "0"], ["2", "3"], ["3", "4"], ["4", "5"], ["5", "3"], ["5", "6"], ["6", "7"], ["7", "6"]];

const kosaraju: Algo = {
  title: "Kosaraju's strongly connected components",
  about: "Pass 1: DFS the graph and record vertices by finish time. Pass 2: reverse every edge and DFS from vertices in decreasing finish time; each DFS tree is one SCC.",
  steps() {
    const out: Step[] = [];
    const adj: Record<string, string[]> = {}, radj: Record<string, string[]> = {};
    for (const [a, b] of SCC_E) { (adj[a] ??= []).push(b); (radj[b] ??= []).push(a); }
    const V = Object.keys(SCC_POS);
    const seen = new Set<string>(), order: string[] = [];
    const st: Record<string, S | undefined> = {}, sub: Record<string, string> = {};
    let reversed = false;
    const comp: Record<string, number> = {};
    const frame = (note: string, rows: Row[] = [], ask?: Step["ask"]): Step => ({
      note, ask,
      graph: { nodes: nodesOf(SCC_POS, st, sub), edges: SCC_E.map(([a, b]): GEdge => (reversed ? { a: b, b: a, dir: true, s: comp[a] !== undefined && comp[a] === comp[b] ? "done" : undefined } : { a, b, dir: true })) },
      rows: [{ label: "finish", cells: order.length ? order : ["∅"] }, ...rows],
    });
    out.push(frame("A directed graph. Vertices that can all reach each other form a strongly connected component. Pass 1 only computes an order."));
    const dfs1 = (u: string) => {
      seen.add(u); st[u] = "cur";
      out.push(frame(`Pass 1: enter ${u}.`));
      st[u] = "front";
      for (const v of adj[u] ?? []) if (!seen.has(v)) dfs1(v);
      order.push(u); st[u] = "done"; sub[u] = `f${order.length}`;
      out.push(frame(`${u} finishes (all its out-neighbours are done): push it. Finish order so far: ${order.join(" ")}.`));
    };
    for (const v of V) if (!seen.has(v)) dfs1(v);
    for (const v of V) { st[v] = undefined; delete sub[v]; }
    reversed = true;
    out.push(frame("Pass 2: reverse every edge. Take vertices from the right end of the finish list (latest finisher first) and DFS in the reversed graph.", [], { q: `Which vertex starts the first DFS of pass 2?`, options: [order[order.length - 1], order[0], "3"].filter((x, i, a) => a.indexOf(x) === i), answer: 0, why: `The last vertex to finish (${order[order.length - 1]}) lies in a source component of the condensation; in the reversed graph it cannot escape its own SCC.` }));
    const seen2 = new Set<string>();
    let c = 0;
    const dfs2 = (u: string, members: string[]) => { seen2.add(u); members.push(u); st[u] = "cur"; comp[u] = c; for (const v of radj[u] ?? []) if (!seen2.has(v)) dfs2(v, members); };
    for (const s of [...order].reverse()) {
      if (seen2.has(s)) continue;
      const members: string[] = [];
      dfs2(s, members);
      out.push(frame(`DFS from ${s} in the reversed graph reaches ${members.join(", ")} and nothing else: SCC ${c + 1}.`, [{ label: `SCC ${c + 1}`, cells: members }]));
      for (const m of members) { st[m] = "done"; sub[m] = `C${c + 1}`; }
      c++;
    }
    out.push(frame(`${c} components. Contract each to a single vertex and the result is a DAG (the condensation), so topological order and DAG DP apply to it. Total work: two DFS passes, O(V + E).`));
    return out;
  },
};

// ───────────────────────── Hierholzer ─────────────────────────
const EU_POS: P = { JFK: [90, 160], A: [260, 60], C: [430, 60], D: [560, 160], B: [260, 270] };
const EU_E: [string, string][] = [["JFK", "A"], ["A", "C"], ["C", "D"], ["JFK", "B"], ["B", "JFK"]];

const hierholzer: Algo = {
  title: "Hierholzer's algorithm (Eulerian path)",
  about: "Use every edge exactly once. DFS that deletes edges as it walks them, and appends a vertex to the answer only when it has no unused edges left. Reverse at the end.",
  steps() {
    const out: Step[] = [];
    const adj: Record<string, string[]> = {};
    for (const [a, b] of EU_E) (adj[a] ??= []).push(b);
    for (const k of Object.keys(adj)) adj[k].sort();
    const used = new Set<string>(), path: string[] = [], stack: string[] = ["JFK"];
    const frame = (note: string, cur?: string, ask?: Step["ask"]): Step => ({
      note, ask,
      graph: { nodes: nodesOf(EU_POS, { [stack[stack.length - 1] ?? ""]: "cur", ...Object.fromEntries(path.map((v) => [v, "done"])) }), edges: EU_E.map(([a, b]): GEdge => ({ a, b, dir: true, s: cur === `${a}>${b}` ? "cur" : used.has(`${a}>${b}`) ? "dim" : undefined })) },
      rows: [{ label: "stack", cells: stack.length ? stack : ["∅"] }, { label: "answer", cells: path.length ? path : ["∅"], hi: path.length ? { [path.length - 1]: "hit" } : {} }],
      vars: { "unused edges": EU_E.length - used.size },
    });
    out.push(frame("Five tickets, used once each, starting at JFK, taking the alphabetically smallest choice. Every vertex has out − in = 0 except JFK (+1) and D (−1), so an Eulerian path from JFK to D exists."));
    let asked = false;
    while (stack.length) {
      const u = stack[stack.length - 1];
      if (adj[u]?.length) {
        const v = adj[u].shift()!;
        used.add(`${u}>${v}`);
        stack.push(v);
        out.push(frame(`From ${u} take the smallest unused edge ${u}→${v} and delete it. Push ${v}.`, `${u}>${v}`));
      } else {
        let ask: Step["ask"];
        if (!asked && u === "D") {
          asked = true;
          ask = { q: "D has no unused edges. Greedy went JFK→A→C→D and got stuck with JFK→B→JFK unused. What happens to D?", options: ["Backtrack and try a different edge", "Append D to the answer and pop it", "Restart from JFK"], answer: 1, why: "A dead end must be the end of the path. Appending in post-order lets the detour JFK→B→JFK get spliced in before it." };
        }
        out.push(frame(`${u} has no unused edges: pop it and append it to the answer.`, undefined, ask));
        path.push(stack.pop()!);
      }
    }
    const res = [...path].reverse();
    out.push(frame(`Reverse the answer: ${res.join(" → ")}. Greedy alone would have reached D with JFK→B→JFK unused; post-order appending spliced that cycle in where it belongs. O(E log E) with sorted adjacency, O(E) otherwise.`));
    return out;
  },
};

// ───────────────────────── Edmonds–Karp ─────────────────────────
const FL_POS: P = { S: [60, 170], A: [210, 70], C: [210, 270], B: [400, 70], D: [400, 270], T: [560, 170] };
const FL_E: [string, string, number][] = [["S", "A", 10], ["S", "C", 10], ["A", "B", 4], ["A", "C", 2], ["A", "D", 8], ["C", "D", 9], ["D", "B", 6], ["B", "T", 10], ["D", "T", 10]];

const edmondsKarp: Algo = {
  title: "Maximum flow: Edmonds–Karp",
  about: "Repeat: BFS for the shortest S→T path in the residual graph, push its bottleneck capacity along it. Residual back-edges let later paths undo earlier choices. Stops when T is unreachable.",
  steps() {
    const out: Step[] = [];
    const cap: Record<string, number> = {}, flow: Record<string, number> = {};
    const nbr: Record<string, Set<string>> = {};
    for (const [a, b, c] of FL_E) { cap[`${a}>${b}`] = c; flow[`${a}>${b}`] = 0; (nbr[a] ??= new Set()).add(b); (nbr[b] ??= new Set()).add(a); }
    const res = (u: string, v: string) => (cap[`${u}>${v}`] ?? 0) - (flow[`${u}>${v}`] ?? 0) + (flow[`${v}>${u}`] ?? 0);
    let total = 0;
    const frame = (note: string, pathEdges: Set<string> = new Set(), ask?: Step["ask"], cutSide?: Set<string>): Step => ({
      note, ask,
      graph: { nodes: nodesOf(FL_POS, cutSide ? Object.fromEntries([...cutSide].map((v) => [v, "front"])) : {}), edges: FL_E.map(([a, b]): GEdge => ({ a, b, dir: true, w: `${flow[`${a}>${b}`]}/${cap[`${a}>${b}`]}`, s: pathEdges.has(`${a}>${b}`) || pathEdges.has(`${b}>${a}`) ? "cur" : flow[`${a}>${b}`] === cap[`${a}>${b}`] ? "bad" : flow[`${a}>${b}`] > 0 ? "done" : undefined })) },
      vars: { "flow value": total, "edge label": "flow / capacity" },
    });
    out.push(frame("Each edge shows flow / capacity. Push as much as possible from S to T without exceeding any capacity, and with flow conserved at every other vertex."));
    for (let round = 1; ; round++) {
      const prev: Record<string, string> = {}, q = ["S"], seen = new Set(["S"]);
      while (q.length && !seen.has("T")) { const u = q.shift()!; for (const v of nbr[u]) if (!seen.has(v) && res(u, v) > 0) { seen.add(v); prev[v] = u; q.push(v); } }
      if (!seen.has("T")) {
        out.push(frame(`BFS can no longer reach T. Max flow = ${total}. The vertices BFS did reach (orange) form the source side of a minimum cut; the saturated edges leaving them sum to ${total}: max-flow equals min-cut.`, new Set(), undefined, seen));
        break;
      }
      const path: string[] = ["T"];
      while (path[0] !== "S") path.unshift(prev[path[0]]);
      let b = Infinity;
      for (let i = 0; i + 1 < path.length; i++) b = Math.min(b, res(path[i], path[i + 1]));
      const pe = new Set(path.slice(1).map((v, i) => `${path[i]}>${v}`));
      const usesBack = path.slice(1).some((v, i) => !cap[`${path[i]}>${v}`]);
      out.push(frame(`Round ${round}: BFS finds the shortest augmenting path ${path.join("→")}. Its bottleneck is ${b}.${usesBack ? " It walks an edge backwards: that cancels earlier flow, rerouting it." : ""}`, pe,
        round === 1 ? { q: "How much flow can this path carry?", options: [String(b), String(b + 2), "10"].filter((x, i, a) => a.indexOf(x) === i), answer: 0, why: "The bottleneck is the smallest residual capacity on the path." } : undefined));
      for (let i = 0; i + 1 < path.length; i++) {
        const u = path[i], v = path[i + 1];
        const back = Math.min(b, flow[`${v}>${u}`] ?? 0);
        if (back > 0) flow[`${v}>${u}`] -= back;
        if (b - back > 0) flow[`${u}>${v}`] += b - back;
      }
      total += b;
      out.push(frame(`Augment by ${b}. Flow value is now ${total}. Red edges are saturated.`, pe));
    }
    return out;
  },
};

export const GRAPH_ALGOS: Record<string, Algo> = { kruskal, prim, "tarjan-bridges": tarjanBridges, kosaraju, hierholzer, "edmonds-karp": edmondsKarp };
