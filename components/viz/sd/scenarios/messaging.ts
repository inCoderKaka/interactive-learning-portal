import type { Scenario } from "../Seq";

/** Messaging and streaming scenarios. */
export const MESSAGING: Record<string, Scenario> = {
  "seq-delivery": {
    title: "Commit first or process first?",
    q: "The consumer crashes between doing the work and recording its progress. Which order loses messages, and which duplicates them?",
    about: "A consumer reads message #41 ('credit 10 points'), applies it to a database, and commits its position to the broker.",
    actors: [{ id: "b", label: "Broker (offsets)" }, { id: "c", label: "Consumer" }, { id: "db", label: "Points DB" }],
    init: { b: "committed: 40", db: "points = 100" },
    variants: [
      {
        key: "amo", label: "Commit, then process", end: "At-most-once: message #41 was never applied. Lost.",
        steps: [
          { from: "b", to: "c", label: "deliver #41", say: "The consumer receives message 41." },
          { from: "c", to: "b", label: "commit offset 41", say: "It records progress first.", set: { b: "committed: 41" } },
          { from: "c", to: "c", label: "💥 crash before applying", kind: "bad", say: "It crashes before doing the work." },
          { from: "b", to: "c", label: "(restart) deliver #42", kind: "bad", say: "On restart it resumes after 41. The points were never credited.", set: { db: "points = 100 (missing 10)" } },
        ],
      },
      {
        key: "alo", label: "Process, then commit", end: "At-least-once: nothing lost, but #41 was applied twice.",
        steps: [
          { from: "b", to: "c", label: "deliver #41", say: "Same message." },
          { from: "c", to: "db", label: "points += 10", say: "Work first.", set: { db: "points = 110" } },
          { from: "c", to: "c", label: "💥 crash before commit", kind: "bad", say: "It crashes before recording progress." },
          { from: "b", to: "c", label: "(restart) deliver #41 again", say: "The broker still thinks 40 is the last done, so it redelivers 41." },
          { from: "c", to: "db", label: "points += 10", kind: "bad", say: "The increment runs again.", set: { db: "points = 120 (double!)" } },
        ],
      },
      {
        key: "eo", label: "Process + dedup in one transaction", end: "Exactly-once effect: at-least-once delivery, but the duplicate was harmless.",
        steps: [
          { from: "b", to: "c", label: "deliver #41", say: "Same message." },
          { from: "c", to: "db", label: "BEGIN; INSERT processed(41); points += 10; COMMIT", say: "The work and a record of 'message 41 done' commit in the same database transaction.", set: { db: "points = 110, processed: {41}" } },
          { from: "c", to: "c", label: "💥 crash before broker commit", kind: "bad", say: "Crash before telling the broker." },
          { from: "b", to: "c", label: "(restart) deliver #41 again", say: "Redelivered." },
          { from: "c", to: "db", label: "INSERT processed(41) → duplicate key", kind: "ok", say: "The dedup insert fails because 41 is already recorded, so the transaction does nothing. Points stay 110.", set: { db: "points = 110 ✓" } },
          { from: "c", to: "b", label: "commit offset 41", say: "Progress is committed; life goes on.", set: { b: "committed: 41" } },
        ],
      },
    ],
  },

  "seq-events": {
    title: "Event sourcing an account",
    q: "If you store only events, how do you know the balance, and what happens when a new feature needs history?",
    about: "Every change is appended as an event. State is computed by replaying events; read models (projections) are built from the same events.",
    actors: [{ id: "u", label: "Client" }, { id: "w", label: "Account service" }, { id: "es", label: "Event store" }, { id: "p", label: "Projection: balances" }],
    variants: [
      {
        key: "write", label: "Handle a command", end: "The event store holds the full history; the balance is derived from it.",
        init: { es: "Opened, Deposited 100", p: "acct 7: 100" },
        steps: [
          { from: "u", to: "w", label: "Withdraw 30 (command)", say: "A command asks for a change. It might be rejected." },
          { from: "w", to: "es", label: "load events for acct 7", say: "The service replays the account's events (or a snapshot plus newer events) to get the current state." },
          { from: "es", to: "w", label: "Opened, Deposited 100 → balance 100", say: "Balance is 100, so the withdrawal is allowed." },
          { from: "w", to: "es", label: "append Withdrew 30 (expected version 2)", say: "The service appends a past-tense event, checking nobody else appended meanwhile (optimistic concurrency).", set: { es: "Opened, Deposited 100, Withdrew 30" } },
          { from: "es", to: "p", label: "Withdrew 30", kind: "async", say: "Projections consume the new event asynchronously.", set: { p: "acct 7: 70" } },
          { from: "u", to: "p", label: "GET balance", kind: "ok", say: "Queries read the projection, built for fast reads (eventually consistent with the store)." },
        ],
      },
      {
        key: "new", label: "Build a new view from history", end: "A feature nobody planned for got full history on day one: the benefit of keeping every event.",
        init: { es: "3 years of events" },
        steps: [
          { from: "w", to: "w", label: "new feature: monthly spending chart", say: "Product wants a monthly spending chart, including past years." },
          { from: "es", to: "p", label: "replay all events from the start", say: "A new projection is created and fed every event from the beginning." },
          { from: "p", to: "p", label: "build spending-by-month table", kind: "ok", say: "Because nothing was overwritten, the full past is available.", set: { p: "spending by month: complete" } },
        ],
      },
    ],
  },

  "seq-dlq": {
    title: "One poison message",
    q: "A message fails every time. What happens to everything queued behind it?",
    about: "A consumer processes a partition in order. Message #7 has malformed data and always throws.",
    actors: [{ id: "t", label: "orders partition" }, { id: "c", label: "Consumer" }, { id: "r", label: "retry topic (5 min)" }, { id: "d", label: "Dead-letter topic" }],
    variants: [
      {
        key: "stuck", label: "Retry in place forever", end: "Every order behind #7 is stuck: that partition's customers see nothing ship.",
        steps: [
          { from: "t", to: "c", label: "#7 (bad data)", say: "The consumer reads #7." },
          { from: "c", to: "c", label: "error → retry", kind: "bad", say: "It throws. The consumer retries the same message." },
          { from: "c", to: "c", label: "error → retry → error…", kind: "bad", say: "It will never succeed: the data is malformed." },
          { from: "t", to: "t", label: "#8, #9, … #5,000 waiting", kind: "bad", say: "Messages behind it can't be processed (in-order partition). Lag grows without bound." },
        ],
      },
      {
        key: "dlq", label: "Bounded retries + DLQ", end: "The bad message is preserved with its error for a human; everything else flows.",
        steps: [
          { from: "t", to: "c", label: "#7 (bad data)", say: "The consumer reads #7." },
          { from: "c", to: "c", label: "fails 3× with backoff", say: "A few quick retries (in case the problem was transient)." },
          { from: "c", to: "r", label: "publish #7 to retry topic", say: "Still failing: move it to a delayed retry topic so the partition keeps flowing." },
          { from: "t", to: "c", label: "#8, #9 … processed", kind: "ok", say: "Later messages are processed normally." },
          { from: "r", to: "c", label: "#7 after 5 min", say: "The retry topic redelivers #7 later. It fails again." },
          { from: "c", to: "d", label: "#7 + error + attempts → DLQ", kind: "ok", say: "It goes to the dead-letter topic with the error and context. An alert fires; after a fix, it can be replayed.", set: { d: "1 message (alerted)" } },
        ],
      },
    ],
  },

  "seq-checkpoint": {
    title: "Checkpoint and recover",
    q: "A stream task counting clicks per user crashes. How does it come back without losing or double-counting clicks?",
    about: "The source is a log; the operator keeps counts per user. A coordinator injects barriers to take consistent checkpoints.",
    actors: [{ id: "src", label: "Source (log offsets)" }, { id: "op", label: "Count operator (state)" }, { id: "co", label: "Checkpoint coordinator" }, { id: "st", label: "Durable storage" }],
    init: { src: "offset 1000", op: "ada: 5" },
    variants: [
      {
        key: "ckpt", label: "Checkpoint, crash, recover", end: "Clicks 1001–1003 were counted twice in memory before the crash, but recovery restored state from before them, so each counts exactly once.",
        steps: [
          { from: "co", to: "src", label: "barrier #12", say: "The coordinator asks the source to inject barrier 12. The source records its position: offset 1000." },
          { from: "src", to: "op", label: "… events … barrier #12", say: "The barrier flows behind all events before offset 1000." },
          { from: "op", to: "st", label: "snapshot state {ada: 5} @ #12", say: "When the barrier arrives, the operator snapshots its state asynchronously.", set: { st: "ckpt 12: offset 1000, {ada: 5}" } },
          { from: "op", to: "co", label: "ack #12", kind: "ok", say: "Checkpoint 12 is complete: state and input position match." },
          { from: "src", to: "op", label: "clicks 1001–1003 (ada)", say: "Processing continues.", set: { op: "ada: 8", src: "offset 1003" } },
          { from: "op", to: "op", label: "💥 crash", kind: "bad", say: "The task crashes. Its in-memory count (8) is gone.", set: { op: "(lost)" } },
          { from: "st", to: "op", label: "restore {ada: 5}", say: "Recovery loads checkpoint 12's state…", set: { op: "ada: 5" } },
          { from: "co", to: "src", label: "rewind to offset 1000", say: "…and rewinds the source to checkpoint 12's offset.", set: { src: "offset 1000" } },
          { from: "src", to: "op", label: "clicks 1001–1003 again", kind: "ok", say: "Replayed clicks are applied once to the restored state: ada = 8, correct.", set: { op: "ada: 8 ✓" } },
        ],
      },
    ],
  },

  "seq-cdc": {
    title: "One update, three derived systems",
    q: "A price changes in the database. How do the search index, the cache and the warehouse all learn about it, in the right order?",
    about: "A CDC connector tails the database's log and publishes each committed change to a topic keyed by product ID.",
    actors: [{ id: "app", label: "Any writer" }, { id: "db", label: "Database (WAL)" }, { id: "cdc", label: "CDC connector" }, { id: "k", label: "products topic" }, { id: "x", label: "Search · cache · warehouse" }],
    init: { db: "lamp: £40" },
    variants: [
      {
        key: "flow", label: "Normal flow", end: "Every consumer got the same committed change, in commit order, without the writer knowing they exist.",
        steps: [
          { from: "app", to: "db", label: "UPDATE price = 35 WHERE id = lamp; COMMIT", say: "Any writer (the app, a batch job, a manual SQL fix) commits a change.", set: { db: "lamp: £35 (LSN 9123)" } },
          { from: "db", to: "cdc", label: "WAL record LSN 9123", say: "The change is already in the database's log for its own durability and replicas." },
          { from: "cdc", to: "k", label: "{id: lamp, before: 40, after: 35, lsn: 9123}", say: "The connector turns it into an event keyed by the product ID, so all changes to the lamp stay in order." },
          { from: "k", to: "x", label: "event", kind: "async", say: "The search indexer upserts the document, the cache consumer deletes the key, the warehouse appends the change." },
          { from: "x", to: "x", label: "ignore if lsn ≤ last applied", kind: "ok", say: "Consumers are idempotent: a redelivered or older event (by log position) is ignored." },
        ],
      },
      {
        key: "rollback", label: "A rolled-back transaction", end: "Only committed changes reach the log stream; dual writes would have leaked the aborted change.",
        steps: [
          { from: "app", to: "db", label: "UPDATE price = 1; …; ROLLBACK", say: "A buggy job sets the price to £1 and then rolls back." },
          { from: "db", to: "cdc", label: "(nothing committed)", say: "Nothing was committed, so nothing is published as a change." },
          { from: "x", to: "x", label: "search still shows £35", kind: "ok", say: "Derived systems never saw the mistake. With dual writes, the search index might have been updated before the rollback." },
        ],
      },
    ],
  },
};
