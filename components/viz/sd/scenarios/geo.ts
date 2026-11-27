import type { Scenario } from "../Seq";

/** Multi-region scenario: an EU user's request in a geo-partitioned system, done right and with a logging leak. */
export const GEO: Record<string, Scenario> = {
  "seq-residency": {
    title: "An EU user's data stays in the EU",
    q: "Marie in Paris opens her notes while travelling in New York. Where does her data go?",
    about: "A geo-partitioned SaaS: each customer has a home region, recorded in a small global directory that holds no personal data.",
    actors: [{ id: "u", label: "Marie (in New York)" }, { id: "edge", label: "Nearest edge", sub: "New York" }, { id: "dir", label: "Global directory", sub: "tenant → region" }, { id: "eu", label: "EU region", sub: "home of her data" }, { id: "logs", label: "Logging" }],
    variants: [
      {
        key: "ok", label: "Designed for residency", end: "Her notes never left the EU at rest. The edge only relayed encrypted traffic, logs stayed in-region, and the directory held nothing personal.",
        steps: [
          { from: "u", to: "edge", label: "GET /notes (TLS)", t: 0, say: "Her request enters the nearest edge, in New York." },
          { from: "edge", to: "dir", label: "tenant 81 → ?", t: 3, say: "The edge asks the directory which region is home for her company (tenant 81)." },
          { from: "dir", to: "edge", label: "eu-west (cached)", t: 5, say: "The directory answers with a region code only; the edge caches it." },
          { from: "edge", to: "eu", label: "forward over private backbone", t: 85, say: "The request is forwarded to the EU region. The edge doesn't store the response (personalised responses are marked no-store)." },
          { from: "eu", to: "eu", label: "read notes from EU database", t: 90, say: "Her notes are read from the EU database, whose replicas and backups are also in EU regions." },
          { from: "eu", to: "logs", label: "access log (EU, email scrubbed)", t: 92, kind: "async", say: "The access log goes to EU logging, with personal fields removed or pseudonymised." },
          { from: "eu", to: "u", label: "200 notes (via edge, not cached)", t: 175, kind: "ok", say: "The response returns through the edge. Travel adds latency, but nothing was stored outside the EU." },
        ],
      },
      {
        key: "leak", label: "The logging leak", end: "The database was perfectly partitioned, but her email and note titles now sit in a US log cluster. Residency audits usually fail on side channels like this, not on the main database.",
        steps: [
          { from: "u", to: "edge", label: "GET /notes", t: 0, say: "Same request." },
          { from: "edge", to: "eu", label: "forward to home region", t: 85, say: "Routed to the EU correctly." },
          { from: "eu", to: "eu", label: "read notes from EU database", t: 90, kind: "ok", say: "Storage is correct." },
          { from: "eu", to: "logs", label: "debug log: user=marie@…, titles=[…] → US cluster", t: 92, kind: "bad", say: "But a debug log line includes her email and note titles, and all logs ship to a central cluster in the US." },
          { from: "logs", to: "logs", label: "indexed in US, kept 90 days", t: 400, kind: "bad", say: "Her personal data is now stored outside the EU for 90 days." },
          { from: "eu", to: "u", label: "200 notes", t: 175, say: "The user sees nothing wrong." },
        ],
      },
    ],
  },
};
