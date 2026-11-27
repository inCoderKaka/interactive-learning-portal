import type { Scenario } from "../Seq";

/** Transaction and coordination scenarios. ISOLATION is used by the isolation lab (one scenario per anomaly). */
export const TRANSACTIONS: Record<string, Scenario> = {
  "seq-wal": {
    title: "A crash in the middle of a transfer",
    q: "The server loses power halfway through a transaction. What does the database look like when it restarts?",
    about: "Transfer £100 from Alice to Bob. Data pages live in memory and reach disk later; the write-ahead log reaches disk before every commit.",
    actors: [{ id: "app", label: "App" }, { id: "mem", label: "Buffer pool (RAM)" }, { id: "log", label: "WAL on disk" }, { id: "data", label: "Data files on disk" }],
    init: { mem: "A=500 B=200", data: "A=500 B=200" },
    variants: [
      {
        key: "commit", label: "Crash after commit", end: "The transfer survives: the log on disk had everything needed to redo it, even though the data files didn't.",
        steps: [
          { from: "app", to: "log", label: "T1: A = A − 100", t: 0, say: "Before touching the data, the change is described in the log." },
          { from: "app", to: "mem", label: "update page: A = 400", t: 1, say: "The data page is changed in memory only.", set: { mem: "A=400 B=200" } },
          { from: "app", to: "log", label: "T1: B = B + 100", t: 2, say: "Second change, logged first." },
          { from: "app", to: "mem", label: "update page: B = 300", t: 3, say: "Changed in memory.", set: { mem: "A=400 B=300" } },
          { from: "app", to: "log", label: "T1 COMMIT + fsync", t: 4, say: "On COMMIT the log is forced to disk. Only now is the client told 'done'.", set: { log: "T1 changes + COMMIT" } },
          { from: "mem", to: "mem", label: "💥 power cut", t: 5, kind: "bad", say: "Power fails before the modified pages are written. Memory is lost; the data files still say A=500, B=200.", set: { mem: "(lost)" } },
          { from: "log", to: "data", label: "recovery: REDO T1", t: 9000, kind: "ok", say: "On restart, recovery reads the log, finds T1 committed, and re-applies its changes to the data.", set: { data: "A=400 B=300" } },
        ],
      },
      {
        key: "nocommit", label: "Crash before commit", end: "All or nothing: the half-done transfer was rolled back, so no money vanished.",
        steps: [
          { from: "app", to: "log", label: "T2: A = A − 100", t: 0, say: "A second transfer starts." },
          { from: "app", to: "mem", label: "update page: A = 400", t: 1, say: "Alice's page is changed in memory.", set: { mem: "A=400 B=200" } },
          { from: "mem", to: "data", label: "page flushed (background)", t: 2, say: "The background writer happens to flush Alice's page to disk early. Allowed, because its log record is already on disk.", set: { data: "A=400 B=200" } },
          { from: "mem", to: "mem", label: "💥 power cut before B and COMMIT", t: 3, kind: "bad", say: "Power fails before the credit to Bob and before COMMIT. On disk, money has left Alice and reached nobody.", set: { mem: "(lost)" } },
          { from: "log", to: "data", label: "recovery: UNDO T2", t: 9000, kind: "ok", say: "Recovery sees T2 never committed and uses the log to undo its change to Alice.", set: { data: "A=500 B=200" } },
        ],
      },
    ],
  },

  "seq-mvcc": {
    title: "Readers and writers with versions",
    q: "A long report reads balances while a transfer updates them. Does either wait?",
    about: "Each write creates a new version tagged with the transaction that wrote it. Each transaction reads the newest version committed before it started.",
    actors: [{ id: "r", label: "Report (T10, snapshot)" }, { id: "db", label: "Rows (versions)" }, { id: "w", label: "Transfer (T11)" }],
    init: { db: "A: v1=500 | B: v1=200" },
    variants: [
      {
        key: "mvcc", label: "MVCC", end: "Nobody waited, and the report's total (700) is correct for one moment in time. The old versions are cleaned up once no snapshot needs them.",
        steps: [
          { from: "r", to: "r", label: "BEGIN: snapshot at T10", t: 0, say: "The report starts and takes a snapshot: it will see only changes committed before T10." },
          { from: "r", to: "db", label: "read A", t: 1, say: "It reads Alice's balance." },
          { from: "db", to: "r", label: "500 (v1)", t: 2, say: "500." },
          { from: "w", to: "db", label: "A = 400, B = 300 (T11)", t: 3, say: "A transfer writes new versions of both rows. It does not wait for the report.", set: { db: "A: v1=500, v2=400 | B: v1=200, v2=300" } },
          { from: "w", to: "w", label: "COMMIT T11", t: 4, kind: "ok", say: "The transfer commits." },
          { from: "r", to: "db", label: "read B", t: 5, say: "The report now reads Bob's balance." },
          { from: "db", to: "r", label: "200 (v1: T11 is after my snapshot)", t: 6, kind: "ok", say: "It gets the version from its snapshot, 200, not the new 300, so its total stays consistent: 700." },
        ],
      },
      {
        key: "locks", label: "Locking (2PL) instead", end: "With read locks, the transfer had to wait for the whole report: correct, but readers and writers block each other.",
        steps: [
          { from: "r", to: "db", label: "read A (shared lock)", t: 0, say: "With two-phase locking, reading takes a shared lock held until the report ends.", set: { db: "A locked (read) by report" } },
          { from: "w", to: "db", label: "write A (needs exclusive lock)", t: 3, kind: "bad", say: "The transfer needs an exclusive lock on A and must wait for the report to finish." },
          { from: "r", to: "db", label: "read B (shared lock)", t: 5, say: "The report keeps reading. If it runs for an hour, the transfer waits an hour." },
          { from: "r", to: "r", label: "COMMIT (release locks)", t: 3600, say: "Report done; locks released.", set: { db: "unlocked" } },
          { from: "w", to: "db", label: "A = 400, B = 300", t: 3601, kind: "ok", say: "Only now can the transfer proceed." },
        ],
      },
    ],
  },

  "seq-2pc": {
    title: "Two-phase commit",
    q: "A transfer spans two partitions. How do both commit, or neither?",
    about: "The coordinator asks both partitions to prepare (phase 1), then tells them the outcome (phase 2).",
    actors: [{ id: "co", label: "Coordinator" }, { id: "pa", label: "Partition A (Alice)" }, { id: "pb", label: "Partition B (Bob)" }],
    variants: [
      {
        key: "ok", label: "Both vote yes", end: "Atomic across two machines: both committed.",
        steps: [
          { from: "co", to: "pa", label: "PREPARE (A −100)", t: 0, say: "Phase 1: the coordinator asks each participant whether it can commit its part." },
          { from: "co", to: "pb", label: "PREPARE (B +100)", t: 0, say: "Both receive the request." },
          { from: "pa", to: "co", label: "YES (logged, locks held)", t: 10, say: "Alice's partition writes the change and a 'prepared' record to its log, keeps its locks, and votes yes. From now on it may not abort on its own.", set: { pa: "PREPARED, locked" } },
          { from: "pb", to: "co", label: "YES (logged, locks held)", t: 12, say: "Bob's partition does the same.", set: { pb: "PREPARED, locked" } },
          { from: "co", to: "co", label: "log COMMIT decision", t: 13, say: "Phase 2: all votes are yes, so the coordinator durably logs COMMIT. This is the point of no return.", set: { co: "decided: COMMIT" } },
          { from: "co", to: "pa", label: "COMMIT", t: 14, say: "It tells each participant." },
          { from: "co", to: "pb", label: "COMMIT", t: 14, kind: "ok", say: "Both apply the commit and release their locks.", set: { pa: "committed", pb: "committed" } },
        ],
      },
      {
        key: "no", label: "One votes no", end: "Nothing committed anywhere: atomicity held.",
        steps: [
          { from: "co", to: "pa", label: "PREPARE (A −100)", t: 0, say: "Phase 1 again." },
          { from: "co", to: "pb", label: "PREPARE (B +100)", t: 0, say: "…" },
          { from: "pa", to: "co", label: "YES", t: 10, say: "Alice's partition is ready.", set: { pa: "PREPARED" } },
          { from: "pb", to: "co", label: "NO (account frozen)", t: 12, kind: "bad", say: "Bob's account is frozen: a rule violation. Bob's partition votes no." },
          { from: "co", to: "pa", label: "ABORT", t: 13, say: "Any no means abort. The coordinator tells everyone.", set: { co: "decided: ABORT" } },
          { from: "pa", to: "pa", label: "undo, release locks", t: 14, kind: "ok", say: "Alice's partition rolls back its prepared change.", set: { pa: "aborted" } },
        ],
      },
      {
        key: "crash", label: "Coordinator crashes", end: "This is 2PC's weakness: prepared participants are stuck holding locks. Replicating the coordinator with consensus (as Spanner does) avoids it.",
        steps: [
          { from: "co", to: "pa", label: "PREPARE", t: 0, say: "Phase 1." },
          { from: "co", to: "pb", label: "PREPARE", t: 0, say: "…" },
          { from: "pa", to: "co", label: "YES", t: 10, say: "Alice's partition votes yes and holds its locks.", set: { pa: "PREPARED, locked" } },
          { from: "pb", to: "co", label: "YES", t: 12, say: "So does Bob's.", set: { pb: "PREPARED, locked" } },
          { from: "co", to: "co", label: "💥 crash before sending decision", t: 13, kind: "bad", say: "The coordinator crashes after collecting the votes.", set: { co: "DOWN" } },
          { from: "pa", to: "pa", label: "in doubt: can't commit or abort", t: 5000, kind: "bad", say: "Alice's partition can't decide alone: the coordinator might have decided commit and told Bob's. It must wait, keeping the rows locked." },
          { from: "pb", to: "pb", label: "in doubt, rows locked", t: 5000, kind: "bad", say: "Any other transaction touching Alice's or Bob's rows now waits too, until the coordinator recovers and reads its log." },
        ],
      },
    ],
  },

  "seq-saga": {
    title: "An order saga",
    q: "Payment fails after stock was reserved. How does the system undo the steps that already committed?",
    about: "An orchestrator drives four services. Each step is a local transaction with a compensating action. Each service publishes events through an outbox.",
    actors: [{ id: "o", label: "Orchestrator" }, { id: "ord", label: "Orders" }, { id: "inv", label: "Inventory" }, { id: "pay", label: "Payments" }],
    variants: [
      {
        key: "ok", label: "Happy path", end: "Each step committed locally; the order is confirmed.",
        steps: [
          { from: "o", to: "ord", label: "create order (PENDING)", t: 0, say: "Step 1: the order is created in a pending state.", set: { ord: "order 77: PENDING" } },
          { from: "o", to: "inv", label: "reserve 1 × lamp", t: 10, say: "Step 2: stock is reserved (a semantic lock: other buyers can't take it).", set: { inv: "lamp: 1 reserved" } },
          { from: "o", to: "pay", label: "charge £40 (idempotency key 77)", t: 20, say: "Step 3: the card is charged, with an idempotency key so a retry can't double-charge.", set: { pay: "charged £40" } },
          { from: "o", to: "ord", label: "confirm order", t: 30, kind: "ok", say: "All steps succeeded; the order is confirmed.", set: { ord: "order 77: CONFIRMED" } },
        ],
      },
      {
        key: "fail", label: "Payment fails", end: "Eventual all-or-nothing: the committed steps were undone by compensations, not by a rollback. Others could briefly see the reserved stock.",
        steps: [
          { from: "o", to: "ord", label: "create order (PENDING)", t: 0, say: "Step 1 commits.", set: { ord: "order 78: PENDING" } },
          { from: "o", to: "inv", label: "reserve 1 × lamp", t: 10, say: "Step 2 commits.", set: { inv: "lamp: 1 reserved" } },
          { from: "o", to: "pay", label: "charge £40", t: 20, say: "Step 3: the payment is declined." },
          { from: "pay", to: "o", label: "DECLINED", t: 25, kind: "bad", say: "The saga must now compensate, in reverse order." },
          { from: "o", to: "inv", label: "compensate: release reservation", t: 30, kind: "ok", say: "Compensation for step 2: release the stock.", set: { inv: "lamp: available" } },
          { from: "o", to: "ord", label: "compensate: cancel order", t: 40, kind: "ok", say: "Compensation for step 1: mark the order cancelled (it isn't deleted; it existed).", set: { ord: "order 78: CANCELLED" } },
        ],
      },
      {
        key: "outbox", label: "Inside one step: the outbox", end: "The stock change and the event commit together, so the orchestrator can never miss (or wrongly receive) 'reserved'.",
        steps: [
          { from: "o", to: "inv", label: "reserve 1 × lamp", t: 0, say: "Zoom into step 2. Inventory must update its table and tell the orchestrator." },
          { from: "inv", to: "inv", label: "BEGIN; UPDATE stock; INSERT outbox(StockReserved); COMMIT", t: 2, say: "The event row goes into an outbox table in the same local transaction as the stock change.", set: { inv: "reserved + outbox row" } },
          { from: "inv", to: "inv", label: "💥 crash right after commit", t: 3, kind: "bad", say: "The service crashes before it could publish. Without an outbox, the event would be lost and the saga would stall." },
          { from: "inv", to: "o", label: "relay: StockReserved (from outbox)", t: 2000, kind: "ok", say: "After restart, the outbox relay (polling or reading the change log) publishes the pending event. It may publish twice, so the orchestrator handles duplicates idempotently." },
        ],
      },
    ],
  },

  "seq-clocks": {
    title: "Ordering events without trusting clocks",
    q: "Three servers exchange messages. Which events happened before which, and which are concurrent?",
    about: "Each message carries the sender's clock. Lamport clocks: one counter. Vector clocks: one counter per server.",
    actors: [{ id: "a", label: "Server A" }, { id: "b", label: "Server B" }, { id: "c", label: "Server C" }],
    variants: [
      {
        key: "lamport", label: "Lamport clocks", end: "Every causal chain got increasing numbers. But b2 (3) and c1 (1): nothing tells you whether they were related.",
        init: { a: "L=0", b: "L=0", c: "L=0" },
        steps: [
          { from: "a", to: "a", label: "a1: write x (L=1)", say: "A does something: its counter becomes 1.", set: { a: "L=1" } },
          { from: "a", to: "b", label: "msg (L=1)", say: "A sends a message carrying its counter." },
          { from: "b", to: "b", label: "b1: receive → max(0,1)+1 = 2", say: "B sets its counter to max(own, received) + 1 = 2. The receive is after the send in the numbers too.", set: { b: "L=2" } },
          { from: "c", to: "c", label: "c1: write y (L=1)", say: "Meanwhile C, unaware of anything, does its own event: 1.", set: { c: "L=1" } },
          { from: "b", to: "b", label: "b2: write z (L=3)", say: "B does another event: 3.", set: { b: "L=3" } },
          { from: "b", to: "c", label: "msg (L=3)", say: "B messages C." },
          { from: "c", to: "c", label: "c2: receive → max(1,3)+1 = 4", say: "C jumps to 4, so its next events order after everything B had seen.", set: { c: "L=4" } },
        ],
      },
      {
        key: "vector", label: "Vector clocks", end: "b2 [1,2,0] vs c1 [0,0,1]: neither is ≤ the other, so they are concurrent: exactly what you need to detect conflicting writes.",
        init: { a: "[0,0,0]", b: "[0,0,0]", c: "[0,0,0]" },
        steps: [
          { from: "a", to: "a", label: "a1 → [1,0,0]", say: "Each server increments its own position.", set: { a: "[1,0,0]" } },
          { from: "a", to: "b", label: "msg [1,0,0]", say: "Messages carry the whole vector." },
          { from: "b", to: "b", label: "b1: max([0,0,0],[1,0,0]) +1 own → [1,1,0]", say: "On receipt: element-wise maximum, then increment your own position.", set: { b: "[1,1,0]" } },
          { from: "c", to: "c", label: "c1 → [0,0,1]", say: "C acts independently.", set: { c: "[0,0,1]" } },
          { from: "b", to: "b", label: "b2 → [1,2,0]", say: "B acts again.", set: { b: "[1,2,0]" } },
          { from: "b", to: "c", label: "msg [1,2,0]", say: "B messages C." },
          { from: "c", to: "c", label: "c2: max([0,0,1],[1,2,0]) → [1,2,2]", say: "C merges: now C knows about a1, b1 and b2.", set: { c: "[1,2,2]" } },
        ],
      },
    ],
  },

  "seq-fencing": {
    title: "A paused lock holder",
    q: "A worker holding a lock freezes for 15 seconds. Its lock expires and another worker takes over. What happens when the first one wakes up?",
    about: "A lock service grants 10-second leases. The storage holds a file both workers want to write.",
    actors: [{ id: "a", label: "Worker A" }, { id: "ls", label: "Lock service" }, { id: "b", label: "Worker B" }, { id: "st", label: "Storage" }],
    variants: [
      {
        key: "nofence", label: "Without fencing", end: "Two holders wrote: the lock didn't protect the data, because A couldn't know it had paused.",
        steps: [
          { from: "a", to: "ls", label: "acquire lease (10 s)", t: 0, say: "Worker A gets the lock." },
          { from: "ls", to: "a", label: "granted", t: 1, set: { a: "holds lease" }, say: "Granted, valid until t = 10 s." },
          { from: "a", to: "a", label: "⏸ GC pause (15 s)", t: 2, kind: "bad", say: "A's garbage collector freezes the process. A has no idea time is passing." },
          { from: "b", to: "ls", label: "acquire lease", t: 11000, say: "At 11 s the lease has expired; B asks." },
          { from: "ls", to: "b", label: "granted", t: 11001, set: { b: "holds lease", a: "lease expired (unaware)" }, say: "B now legitimately holds the lock." },
          { from: "b", to: "st", label: "write file (B's version)", t: 12000, say: "B writes.", set: { st: "B's version" } },
          { from: "a", to: "st", label: "write file (A's version)", t: 17000, kind: "bad", say: "A wakes up at 17 s, still believing it holds the lock, and overwrites B's work.", set: { st: "A's version (wrong!)" } },
        ],
      },
      {
        key: "fence", label: "With fencing tokens", end: "The storage, not the confused worker, made the final check: stale holders are harmless.",
        steps: [
          { from: "a", to: "ls", label: "acquire lease", t: 0, say: "Same story, but every grant comes with a fencing token: a number that only ever increases." },
          { from: "ls", to: "a", label: "granted, token 33", t: 1, set: { a: "token 33" }, say: "A gets token 33." },
          { from: "a", to: "a", label: "⏸ GC pause (15 s)", t: 2, kind: "bad", say: "A freezes." },
          { from: "ls", to: "b", label: "granted, token 34", t: 11001, set: { b: "token 34" }, say: "After expiry, B gets token 34." },
          { from: "b", to: "st", label: "write (token 34)", t: 12000, say: "B writes, sending its token. Storage records 34 as the highest seen.", set: { st: "B's version, max token 34" } },
          { from: "a", to: "st", label: "write (token 33)", t: 17000, say: "A wakes and writes with its old token." },
          { from: "st", to: "a", label: "REJECTED: 33 < 34", t: 17001, kind: "ok", say: "The storage refuses any token lower than the highest it has seen." },
        ],
      },
    ],
  },
};

/** Isolation lab: one scenario per anomaly; variants are isolation levels. */
const T = [{ id: "t1", label: "Transaction T1" }, { id: "db", label: "Database" }, { id: "t2", label: "Transaction T2" }];
export const ISOLATION: Record<string, Scenario> = {
  lost: {
    title: "Lost update", about: "Two transactions each add 1 to a counter by reading it, adding in code, and writing it back.",
    actors: T, init: { db: "likes = 10" },
    variants: [
      { key: "rc", label: "Read Committed", end: "Two increments, counter went up by one. Read Committed doesn't stop it.", steps: [
        { from: "t1", to: "db", label: "SELECT likes → 10", say: "T1 reads 10." }, { from: "t2", to: "db", label: "SELECT likes → 10", say: "T2 also reads 10." },
        { from: "t1", to: "db", label: "UPDATE likes = 11; COMMIT", say: "T1 writes 10 + 1.", set: { db: "likes = 11" } },
        { from: "t2", to: "db", label: "UPDATE likes = 11; COMMIT", kind: "bad", say: "T2 also writes 10 + 1, overwriting T1's increment.", set: { db: "likes = 11 (should be 12)" } } ] },
      { key: "si", label: "Snapshot (PG Repeatable Read)", end: "Prevented: the database noticed T2 was updating a row changed since its snapshot. T2 retries and gets 12.", steps: [
        { from: "t1", to: "db", label: "SELECT likes → 10", say: "T1 reads 10 from its snapshot." }, { from: "t2", to: "db", label: "SELECT likes → 10", say: "T2 reads 10 from its snapshot." },
        { from: "t1", to: "db", label: "UPDATE likes = 11; COMMIT", say: "T1 commits first.", set: { db: "likes = 11" } },
        { from: "t2", to: "db", label: "UPDATE likes = 11", kind: "bad", say: "T2 tries to update a row another transaction changed after T2's snapshot." },
        { from: "db", to: "t2", label: "ERROR: could not serialize; retry", kind: "ok", say: "First committer wins: T2 aborts and must retry." } ] },
      { key: "atomic", label: "Fix: atomic UPDATE", end: "No read-modify-write in application code, so nothing to lose, at any isolation level.", steps: [
        { from: "t1", to: "db", label: "UPDATE likes = likes + 1", say: "The increment happens inside the database, which locks the row for the moment of the write.", set: { db: "likes = 11" } },
        { from: "t2", to: "db", label: "UPDATE likes = likes + 1", kind: "ok", say: "T2's increment applies to the latest value.", set: { db: "likes = 12" } } ] },
    ],
  },
  dirty: {
    title: "Dirty read", about: "T1 changes a balance but later aborts. T2 reads in between.",
    actors: T, init: { db: "balance = 100" },
    variants: [
      { key: "ru", label: "Read Uncommitted", end: "T2 acted on a value that never officially existed.", steps: [
        { from: "t1", to: "db", label: "UPDATE balance = 0 (not committed)", say: "T1 changes the balance but hasn't committed.", set: { db: "balance = 0 (uncommitted)" } },
        { from: "t2", to: "db", label: "SELECT balance → 0", kind: "bad", say: "T2 reads the uncommitted 0 and, say, blocks the user's card." },
        { from: "t1", to: "db", label: "ROLLBACK", say: "T1 aborts. The balance was 100 all along.", set: { db: "balance = 100" } } ] },
      { key: "rc", label: "Read Committed", end: "Prevented: readers only ever see committed data.", steps: [
        { from: "t1", to: "db", label: "UPDATE balance = 0 (not committed)", say: "T1 changes the balance.", set: { db: "balance = 0 (uncommitted)" } },
        { from: "t2", to: "db", label: "SELECT balance → 100", kind: "ok", say: "T2 sees the last committed value, 100." },
        { from: "t1", to: "db", label: "ROLLBACK", say: "T1 aborts; nothing anyone saw was wrong.", set: { db: "balance = 100" } } ] },
    ],
  },
  skew: {
    title: "Write skew", about: "Rule: at least one doctor must be on call. Alice and Bob are both on call and both feel unwell.",
    actors: T, init: { db: "on call: Alice, Bob" },
    variants: [
      { key: "si", label: "Snapshot isolation", end: "Each decision was valid on its own snapshot, but together nobody is on call. Snapshot isolation doesn't catch it: they wrote different rows.", steps: [
        { from: "t1", to: "db", label: "count on call → 2", say: "T1 (Alice) checks: 2 doctors on call, so she may leave." },
        { from: "t2", to: "db", label: "count on call → 2", say: "T2 (Bob) checks at the same time: also 2." },
        { from: "t1", to: "db", label: "UPDATE Alice off call; COMMIT", say: "Alice goes off call.", set: { db: "on call: Bob" } },
        { from: "t2", to: "db", label: "UPDATE Bob off call; COMMIT", kind: "bad", say: "Bob goes off call too. No row was written by both, so no conflict was detected.", set: { db: "on call: nobody!" } } ] },
      { key: "ser", label: "Serializable", end: "Prevented: the database detected that the two transactions couldn't have run one after the other with this result, and aborted one.", steps: [
        { from: "t1", to: "db", label: "count on call → 2", say: "T1 checks." }, { from: "t2", to: "db", label: "count on call → 2", say: "T2 checks." },
        { from: "t1", to: "db", label: "UPDATE Alice off call; COMMIT", say: "T1 commits.", set: { db: "on call: Bob" } },
        { from: "t2", to: "db", label: "UPDATE Bob off call; COMMIT", say: "T2 tries to commit." },
        { from: "db", to: "t2", label: "ERROR: serialization failure", kind: "ok", say: "T2 read data that T1 changed; committing would be non-serialisable. T2 retries, now sees 1 on call, and Bob stays." } ] },
      { key: "lock", label: "Fix: SELECT … FOR UPDATE", end: "Locking the rows you read makes the second check wait, then see the truth.", steps: [
        { from: "t1", to: "db", label: "SELECT on-call rows FOR UPDATE → 2", say: "T1 locks the on-call rows it reads.", set: { db: "rows locked by T1" } },
        { from: "t2", to: "db", label: "SELECT … FOR UPDATE (waits)", say: "T2 has to wait for T1's locks." },
        { from: "t1", to: "db", label: "Alice off call; COMMIT", say: "T1 commits and releases the locks.", set: { db: "on call: Bob" } },
        { from: "db", to: "t2", label: "→ 1 on call", kind: "ok", say: "T2's check now returns 1, so Bob can't leave." } ] },
    ],
  },
};
