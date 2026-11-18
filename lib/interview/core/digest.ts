// Turns workspace state into short text the interviewer can read, and runs cheap deterministic checks
// on whiteboard diagrams. The idea of reducing an Excalidraw scene to a component graph and sending
// only meaningful changes comes from github.com/iamanubhavsethi/ai-mock-interview (MIT); this is an
// independent implementation with semantic tags, class sketches and rule checks added.

import type { ClassSketch, ComponentTag, DiagramEdge, DiagramNode, DiagramSnapshot, Digest, InterviewQuestion, RuleHit } from "./types.ts";

/** The subset of an Excalidraw element we read. Kept structural so the core has no Excalidraw dependency. */
export interface SceneElement {
  id: string;
  type: string;
  isDeleted?: boolean;
  text?: string;
  containerId?: string | null;
  startBinding?: { elementId: string } | null;
  endBinding?: { elementId: string } | null;
}

const SHAPES = new Set(["rectangle", "ellipse", "diamond", "frame", "image", "embeddable"]);
const clean = (t: string) => t.replace(/\s+/g, " ").trim();

const TAGS: [ComponentTag, RegExp][] = [
  ["cdn", /\b(cdn|cloudfront|akamai|fastly|edge)\b/i],
  ["lb", /\b(lb|load ?balancer|elb|alb|nginx|haproxy|envoy)\b/i],
  ["gateway", /\b(api ?gateway|gateway|proxy|bff)\b/i],
  ["cache", /\b(cache|redis|memcache[d]?|caching)\b/i],
  ["queue", /\b(queue|kafka|sqs|pub\/?sub|rabbit(mq)?|kinesis|stream|event bus|mq)\b/i],
  ["object-store", /\b(s3|blob|object ?store|gcs|bucket|storage)\b/i],
  ["search", /\b(elastic(search)?|solr|search index|opensearch|lucene)\b/i],
  ["database", /\b(db|database|sql|postgres(ql)?|mysql|spanner|dynamo(db)?|cassandra|mongo(db)?|bigtable|kv|key[- ]value|store|table|shard)\b/i],
  ["worker", /\b(worker|consumer|job|cron|batch|processor|scheduler)\b/i],
  ["client", /\b(client|user|browser|mobile|app|web|ios|android|device)\b/i],
  ["service", /\b(service|server|api|backend|app server|svc|microservice)\b/i],
];

export function tagFor(label: string): ComponentTag {
  for (const [tag, re] of TAGS) if (re.test(label)) return tag;
  return "unknown";
}

function classSketch(label: string): ClassSketch | null {
  const lines = label.split(/\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2 || !/^(?:<<\w+>>\s*)?(?:abstract\s+|interface\s+|enum\s+)?[A-Z][A-Za-z0-9_]*$/.test(lines[0])) return null;
  const rest = lines.slice(1).filter((l) => !/^-{2,}$/.test(l));
  return {
    name: lines[0].replace(/^(?:<<\w+>>\s*)?(?:abstract\s+|interface\s+|enum\s+)?/, ""),
    methods: rest.filter((l) => l.includes("(")),
    fields: rest.filter((l) => !l.includes("(")),
  };
}

export function snapshotScene(elements: readonly SceneElement[]): DiagramSnapshot {
  const live = elements.filter((e) => !e.isDeleted);
  const byId = new Map(live.map((e) => [e.id, e]));
  const textOf = new Map<string, string>(); // container id → bound text
  const notes: string[] = [];
  for (const e of live) {
    if (e.type !== "text" || !e.text?.trim()) continue;
    if (e.containerId && byId.has(e.containerId)) textOf.set(e.containerId, (textOf.get(e.containerId) ? textOf.get(e.containerId) + "\n" : "") + e.text);
    else notes.push(clean(e.text));
  }
  const nodes: DiagramNode[] = [];
  const classes: ClassSketch[] = [];
  const labelOf = new Map<string, string>();
  for (const e of live) {
    if (!SHAPES.has(e.type)) continue;
    const raw = textOf.get(e.id);
    if (!raw) continue;
    const cls = classSketch(raw);
    if (cls) classes.push(cls);
    const label = cls ? cls.name : clean(raw);
    labelOf.set(e.id, label);
    nodes.push({ id: e.id, label, tag: cls ? "unknown" : tagFor(label) });
  }
  const edges: DiagramEdge[] = [];
  for (const e of live) {
    if (e.type !== "arrow" && e.type !== "line") continue;
    const from = e.startBinding ? labelOf.get(e.startBinding.elementId) ?? null : null;
    const to = e.endBinding ? labelOf.get(e.endBinding.elementId) ?? null : null;
    if (!from && !to) continue;
    edges.push({ from, to, label: clean(textOf.get(e.id) ?? "") });
  }
  return { nodes, edges, notes, classes };
}

const edgeKey = (e: DiagramEdge) => `${e.from ?? "?"} → ${e.to ?? "?"}${e.label ? ` (${e.label})` : ""}`;

export function describeScene(s: DiagramSnapshot): string {
  const parts: string[] = [];
  if (s.classes.length) parts.push(`Classes: ${s.classes.map((c) => `${c.name}${c.fields.length ? ` {${c.fields.join("; ")}}` : ""}${c.methods.length ? ` [${c.methods.join("; ")}]` : ""}`).join(" | ")}`);
  const comps = s.nodes.filter((n) => !s.classes.some((c) => c.name === n.label));
  if (comps.length) parts.push(`Components: ${comps.map((n) => (n.tag !== "unknown" ? `${n.label} (${n.tag})` : n.label)).join(", ")}`);
  if (s.edges.length) parts.push(`Connections: ${s.edges.map(edgeKey).join("; ")}`);
  if (s.notes.length) parts.push(`Notes written on the board: ${s.notes.map((n) => `"${n}"`).join(", ")}`);
  return parts.join("\n") || "(empty board)";
}

function setDiff(prev: string[], next: string[]) {
  const a = new Set(prev), b = new Set(next);
  return { added: next.filter((x) => !a.has(x)), removed: prev.filter((x) => !b.has(x)) };
}

/** Whiteboard digest. Returns null when nothing meaningful changed (moving boxes around is not a change). */
export function digestScene(prev: DiagramSnapshot | null, next: DiagramSnapshot): Digest | null {
  const p = prev ?? { nodes: [], edges: [], notes: [], classes: [] };
  const n = setDiff(p.nodes.map((x) => x.label), next.nodes.map((x) => x.label));
  const e = setDiff(p.edges.map(edgeKey), next.edges.map(edgeKey));
  const t = setDiff(p.notes, next.notes);
  const c = setDiff(p.classes.map((x) => JSON.stringify(x)), next.classes.map((x) => JSON.stringify(x)));
  const lines: string[] = [];
  if (n.added.length) lines.push(`added ${n.added.map((x) => `"${x}"`).join(", ")}`);
  if (n.removed.length) lines.push(`removed ${n.removed.map((x) => `"${x}"`).join(", ")}`);
  if (e.added.length) lines.push(`connected ${e.added.join("; ")}`);
  if (e.removed.length) lines.push(`disconnected ${e.removed.join("; ")}`);
  if (t.added.length) lines.push(`wrote ${t.added.map((x) => `"${x}"`).join(", ")}`);
  if (t.removed.length) lines.push(`erased ${t.removed.map((x) => `"${x}"`).join(", ")}`);
  if (c.added.length && !n.added.length) lines.push("edited class details");
  if (!lines.length) return null;
  return { surface: "whiteboard", diff: lines.join("; "), full: describeScene(next) };
}

/** Line-level diff of a text document: the changed middle block, prefix and suffix trimmed. */
export function digestText(surface: "code" | "notes", prev: string, next: string, maxLines = 40): Digest | null {
  if (prev.trim() === next.trim()) return null;
  const a = prev.split("\n"), b = next.split("\n");
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  let j = 0;
  while (j < a.length - i && j < b.length - i && a[a.length - 1 - j] === b[b.length - 1 - j]) j++;
  const removed = a.length - i - j, added = b.slice(i, b.length - j);
  const shown = added.slice(0, maxLines).join("\n");
  const diff = `${added.length ? `lines ${i + 1}-${i + added.length} now read:\n${shown}${added.length > maxLines ? "\n…" : ""}` : ""}${removed > 0 && !added.length ? `deleted ${removed} line(s) after line ${i}` : ""}`;
  const full = next.length > 6000 ? `${next.slice(0, 6000)}\n… (truncated)` : next;
  return { surface, diff: diff || "small edit", full };
}

// ---- deterministic red-flag suspicions on HLD diagrams ----

export interface ConstraintFlags { readHeavy: boolean; media: boolean; fanout: boolean; bigData: boolean }

export function constraintFlags(q: Pick<InterviewQuestion, "statement" | "constraints" | "reference">): ConstraintFlags {
  const t = `${q.statement} ${q.constraints} ${q.reference}`.toLowerCase();
  return {
    readHeavy: /read[- ]heavy|reads? ?≫|reads? (?:>>|much more)|\d+ ?: ?1|redirect|feed|timeline|view|playback|lookup/.test(t),
    media: /video|image|photo|media|upload|file|attachment|blob/.test(t),
    fanout: /fan[- ]?out|followers|notification|broadcast|subscribers/.test(t),
    bigData: /\b(?:tb|pb|eb|terabyte|petabyte|exabyte|billion|\d+ ?b\b)/.test(t),
  };
}

export function diagramRules(s: DiagramSnapshot, f: ConstraintFlags): RuleHit[] {
  const has = (tag: ComponentTag) => s.nodes.some((n) => n.tag === tag);
  const count = (tag: ComponentTag) => s.nodes.filter((n) => n.tag === tag).length;
  const out: RuleHit[] = [];
  const size = s.nodes.length;
  if (size >= 4 && f.readHeavy && has("database") && !has("cache") && !has("cdn"))
    out.push({ rule: "read-path-no-cache", detail: "Read-heavy requirements, and every read path ends at the database with no cache or CDN in front." });
  if (size >= 6 && f.bigData && count("database") === 1 && !s.notes.concat(s.edges.map((e) => e.label)).some((x) => /shard|partition|replica/i.test(x)))
    out.push({ rule: "single-db-at-scale", detail: "One database, no sharding or replication noted, at a data volume beyond one machine." });
  if (count("service") >= 2 && !has("lb") && !has("gateway") && has("client"))
    out.push({ rule: "lb-missing", detail: "Several servers but nothing distributing client traffic between them." });
  if (size >= 4 && f.media && has("database") && !has("object-store"))
    out.push({ rule: "blob-in-db", detail: "Media in the requirements but no object store: files would live in the database." });
  if (f.fanout && !has("queue")) {
    const fan = new Map<string, number>();
    for (const e of s.edges) if (e.from) fan.set(e.from, (fan.get(e.from) ?? 0) + 1);
    if ([...fan.values()].some((v) => v >= 3)) out.push({ rule: "sync-fanout", detail: "One component calls three or more others directly for fan-out work, with no queue." });
  }
  return out;
}
