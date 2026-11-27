=== acid-wal
blurb: What a database transaction promises (atomicity, consistency, isolation, durability), what each letter really means, and how the write-ahead log makes "all or nothing" and "never lost" true even when the power goes out mid-write.
signals: Money moves, bookings, inventory: several changes that must happen together | "What happens if the server crashes halfway?" | Explaining commit latency and fsync | Recovery after a crash
widgets: seq-wal

--- lesson
:::words
- **Transaction**: a group of reads and writes the database treats as one unit.
- **Commit**: the moment a transaction's changes become permanent and visible. **Rollback (abort)**: undoing all of them.
- **ACID**: atomicity, consistency, isolation, durability: the four promises of a transaction.
- **Write-ahead log (WAL)**: an append-only file where the database records each change *before* changing the data itself.
- **fsync**: forcing data from memory buffers onto the disk, so a power cut cannot lose it.
- **Crash recovery**: what the database does on restart to restore a correct state from the log.
:::

## The problem in plain words

Transferring £100 from Alice to Bob is two changes: subtract from Alice, add to Bob. If the server crashes after the first and before the second, £100 has vanished. If two transfers run at the same moment and interleave, balances can come out wrong. A transaction is the database's promise that a group of changes behaves as one indivisible, isolated, permanent step, whatever crashes or concurrency happen around it.

:::eli5
Writing a cheque: until you sign it, nothing has happened; once signed and cashed, both accounts change together, and nobody sees a moment where the money has left one account but not reached the other. And the bank keeps a ledger of every entry first, so even if the office burns down mid-afternoon, the ledger says exactly what was finished.
:::

## The four letters, precisely

- **Atomicity**: all of the transaction's writes happen, or none do. If anything fails (an error, a crash, a constraint violation), the database rolls back the partial work. *Not* about concurrency (that's isolation); "abortability" would be a better name.
- **Consistency**: the transaction moves the data from one valid state to another, as defined by your rules (balances never negative, every order has a customer). Mostly the **application's** job, helped by constraints the database enforces. Not the same "consistency" as in replication.
- **Isolation**: concurrent transactions don't see each other's half-finished work; ideally the result equals running them one at a time (serialisability). Databases offer weaker, faster levels too (next page).
- **Durability**: once committed, the change survives crashes and power loss. Achieved by writing to non-volatile storage (and, in replicated databases, to several machines) before saying "committed".

## The write-ahead log: how atomicity and durability actually work

Rule: **before changing any data page, append a record describing the change to the log, and before acknowledging a commit, make sure the log is on disk (fsync).**

1. The transaction's changes are appended to the WAL (in memory first).
2. Data pages are modified in memory (the buffer pool); they will be written to disk later, whenever convenient.
3. On COMMIT, the database appends a commit record and **fsyncs the log**. Only then does it tell the client "committed".
4. Periodically, a **checkpoint** writes dirty pages to disk and notes how far the log can be trimmed.

On restart after a crash, **recovery** reads the log from the last checkpoint: it **redoes** every change of committed transactions (whose pages may not have reached disk) and **undoes** changes of transactions that never committed. The standard algorithm is ARIES (1992).

Crash a transfer halfway and watch recovery:

[[widget:seq-wal]]

Why this design: the log is written **sequentially** (fast), while data pages are written **lazily in batches** (many changes per page write). The fsync on commit is the price of durability.

## Commit latency and group commit

Each commit waits for an fsync: ~0.1 ms on enterprise SSDs with power-loss protection, several milliseconds on cheaper disks, more with synchronous replication. To get high throughput anyway, databases use **group commit**: many concurrent transactions' commit records share one fsync. Some systems let you relax durability per transaction (e.g. PostgreSQL `synchronous_commit = off`), accepting the loss of the last few milliseconds of commits on a crash, for data where that is fine.

## Durability is a spectrum

- Written to the OS buffer only: lost on power failure.
- fsynced to a local disk: lost if the disk dies.
- Replicated to another machine (synchronously): lost if both fail.
- Replicated across zones or regions: lost only in a disaster.

State which level each piece of data needs.

## Interview angles

- "What happens if the database crashes mid-transaction?" Uncommitted changes are undone, committed ones redone, from the WAL.
- "What does the C in ACID mean?" Application invariants, partly enforced by constraints; not replication consistency.
- "Why is commit slow, and how do databases go fast anyway?" fsync per commit; group commit, fast SSDs, relaxed durability where acceptable.

--- revise
### ACID
? Atomicity really means? :: All of a transaction's writes or none: abort on failure rolls back partial work.
? Whose job is the C in ACID? :: Mostly the application's (invariants), helped by database constraints.
? Isolation means? :: Concurrent transactions don't see each other's partial work; ideally equivalent to running one at a time.
? Durability means? :: Committed changes survive crashes (on disk and/or replicated).

### WAL
? The WAL rule? :: Log the change before changing data pages; fsync the log before acknowledging commit.
? What does recovery do? :: From the last checkpoint: redo committed changes, undo uncommitted ones (ARIES).
? Why is WAL fast? :: The log is written sequentially; data pages are written lazily in batches.
? Group commit? :: Many transactions' commit records share one fsync.
? What does a checkpoint do? :: Writes dirty pages to disk and lets old log be trimmed.

--- notes
## ACID
A: all or nothing (abortability). C: invariants (app + constraints). I: no interference (serialisable ideal). D: survives crashes.
## WAL protocol
Append change to log → modify page in memory → on COMMIT append commit record + fsync log → ack.
Pages flushed later; checkpoints bound recovery time and allow log trimming.
## Recovery (ARIES)
Analysis from checkpoint → redo committed → undo uncommitted.
## Performance
Sequential log writes; lazy batched page writes.
Commit = fsync (~0.1 ms on good SSDs, ms on cheap disks); group commit amortises.
Relaxed durability per transaction where loss of ms is fine.
## Durability levels
OS buffer < local fsync < sync replica < multi-zone < multi-region.

--- doubts
Q: If pages are written later, how is the committed data safe?
A: Because the log record describing every change of a committed transaction is already on disk. If the machine crashes before the pages are written, recovery replays those log records and rebuilds the pages. The log, not the data files, is the source of truth for the recent past.

Q: What does the C in ACID have to do with CAP's C?
A: Nothing, beyond the word. ACID consistency means "the data obeys your rules after each transaction" (like no negative balances). CAP consistency means linearisability of replicated data. When you say "consistent", make clear which you mean.

Q: Is fsync really that expensive?
A: On spinning disks it meant waiting for the platter (milliseconds). On modern SSDs with power-loss protection it is around a tenth of a millisecond, and group commit amortises it across many transactions. It still dominates the latency of tiny transactions, and synchronous replication adds a network round trip on top.

Q: Do NoSQL databases have transactions?
A: Increasingly: most offer atomic single-row or single-document operations, and many now offer multi-item transactions (DynamoDB, MongoDB, Firestore), often with limits on size or scope. Distributed SQL databases (Spanner, CockroachDB) offer full multi-row ACID transactions across partitions.

--- exercises
[break] A service transfers money with two separate UPDATE statements without a transaction. The process is killed between them. What state is the database in, and what fixes it?
A: Alice has been debited and Bob not credited: money has disappeared, permanently, because each statement committed on its own. Wrap both updates in one transaction (BEGIN … COMMIT): a crash before COMMIT rolls back the debit during recovery. Add an idempotency key so a retry of the whole transfer doesn't run twice.

[estimate] A database fsyncs its log in 0.2 ms. Without group commit, what is the maximum commit rate of strictly one-at-a-time commits? With group commit batching ~50 commits per fsync?
A: One commit per fsync: 1 / 0.2 ms = 5,000 commits/s. With 50 commits per fsync: up to ~250,000 commits/s worth of fsync capacity (other limits like CPU and locks then dominate).

[choose] You log user analytics events in the same database as orders. Would you use full durability for both?
A: No. Orders need synchronous, fsynced (and replicated) commits: losing an acknowledged order is unacceptable. Analytics events can use relaxed durability (asynchronous commit) or, better, a separate pipeline (a log or stream), accepting the loss of the last few milliseconds in a crash in exchange for much higher throughput.

--- pitfalls
- Several related writes without a transaction
- Confusing ACID consistency with replication consistency
- Assuming "committed" means durable without knowing the fsync/replication setting
- Treating the WAL as optional overhead rather than the basis of recovery
- Long-running transactions holding locks or old versions for minutes

--- quiz
Q: Atomicity guarantees that…
- Transactions run one at a time
- *All of a transaction's writes happen, or none do
- Data is replicated
- Reads are fast
W: Partial work is rolled back on failure.
Q: When does a database tell the client "committed"?
- When the data pages are written
- *After the commit record is in the log and the log is fsynced
- Immediately on receiving COMMIT
- After the next checkpoint
W: The durable log makes the commit safe; pages follow later.
Q: On recovery, changes of a transaction that had not committed are…
- Redone
- *Undone
- Kept as they are
- Sent to replicas
W: Only committed work survives.
Q: Group commit improves…
- Isolation
- *Throughput, by sharing one fsync among many commits
- Consistency
- Read latency
W: The expensive flush is amortised.

--- sources
- paper :: ARIES: A Transaction Recovery Method Supporting Fine-Granularity Locking and Partial Rollbacks Using Write-Ahead Logging (TODS 1992) :: Mohan et al. :: https://cs.stanford.edu/people/chrismre/cs345/rl/aries.pdf
- book :: Designing Data-Intensive Applications, ch. 7 (Transactions) :: Martin Kleppmann :: https://dataintensive.net/
- article :: PostgreSQL documentation: Write-Ahead Logging, asynchronous commit :: PostgreSQL Global Development Group :: https://www.postgresql.org/docs/current/wal-intro.html
- course :: CMU 15-445: Logging and recovery :: Andy Pavlo :: https://15445.courses.cs.cmu.edu/

=== isolation-anomalies
blurb: What goes wrong when transactions run at the same time: dirty reads, non-repeatable reads, lost updates, write skew and phantoms, which isolation level prevents which, and the practical fixes (row locks, atomic updates, conditional writes, serialisable transactions).
signals: Two users booking the last seat | Counters or balances coming out wrong under load | "Which isolation level would you use?" | Double-booking, overselling, on-call rotas with nobody on call
widgets: isolation-lab
prereq: acid-wal

--- lesson
:::words
- **Isolation level**: how strictly the database keeps concurrent transactions from interfering. Stricter is safer and slower.
- **Dirty read**: reading another transaction's uncommitted change.
- **Non-repeatable read**: reading the same row twice in one transaction and getting different values.
- **Lost update**: two transactions read a value, both modify it, and one write overwrites the other.
- **Write skew**: two transactions each read overlapping data, then write different rows, together breaking a rule neither broke alone.
- **Phantom**: a query's result set changes because another transaction inserted or deleted matching rows.
- **Snapshot isolation**: each transaction reads from a consistent snapshot taken when it started.
:::

## The problem in plain words

A database serves many users at once, so transactions overlap in time. Running them strictly one after another would be correct but slow, so databases let them interleave and promise only a certain level of protection. Each level forbids some anomalies and allows others. Most production bugs in this area come from developers assuming a stronger level than they actually have (the default in PostgreSQL and Oracle is Read Committed; in MySQL InnoDB, Repeatable Read).

:::eli5
Two people edit a shared shopping list on paper. If one reads the list while the other is halfway through crossing things out, they see a mess (dirty read). If both read "milk: 1", each writes "milk: 2", one person's addition is lost (lost update). If two doctors each check "is someone else on call tonight?", both see yes, and both sign off: nobody is on call (write skew).
:::

## Run the anomalies yourself

Choose an anomaly and an isolation level; step through the interleaving and see whether the database prevents it:

[[widget:isolation-lab]]

## The anomalies, one by one

- **Dirty read**: T2 reads T1's uncommitted write; T1 then aborts, so T2 acted on data that never existed. Prevented from Read Committed upwards.
- **Dirty write**: T2 overwrites T1's uncommitted write. Prevented by every real level (row locks on write).
- **Non-repeatable read / read skew**: T1 reads Alice's balance, T2 transfers money from Alice to Bob and commits, T1 reads Bob's balance: T1 sees the money in neither account. Prevented by snapshot isolation (Repeatable Read in PostgreSQL).
- **Lost update**: read-modify-write cycles race: both read counter = 10, both write 11, one increment lost. Prevented by: atomic updates (`UPDATE … SET n = n + 1`), explicit locks (`SELECT … FOR UPDATE`), compare-and-set (`WHERE version = 7`), or databases that detect it (PostgreSQL's Repeatable Read aborts one).
- **Write skew**: on-call rule "at least one doctor on call". T1 and T2 each read "2 on call", each takes a *different* doctor off call, both commit: 0 on call. No row was written by both, so row locks and snapshot isolation don't catch it. Prevented by Serializable, or by locking the rows you read (`SELECT … FOR UPDATE` on the on-call set), or by materialising the conflict (a row both must update).
- **Phantoms**: a query's result set changes because of inserts: "is room 4 free from 2 to 3 pm?" checks for overlapping bookings, finds none, inserts one; a concurrent transaction does the same. Two bookings. Prevented by Serializable (predicate or range locks, or SSI's conflict detection), or by a unique/exclusion constraint.

## Isolation levels

| Level | Dirty read | Non-repeatable read | Lost update | Write skew / phantoms |
|---|---|---|---|---|
| Read Uncommitted | possible | possible | possible | possible |
| Read Committed (Postgres/Oracle default) | prevented | possible | possible | possible |
| Snapshot isolation (Postgres "Repeatable Read") | prevented | prevented | prevented (detected) | possible |
| Serializable | prevented | prevented | prevented | prevented |

Names differ between databases (the SQL standard's names predate snapshot isolation), so always check what a level actually guarantees in your database. Spanner and CockroachDB default to serialisable.

## Practical rules

- Use **atomic operations** for counters and balances (`SET balance = balance - 100 WHERE balance >= 100`), not read-then-write in application code.
- Use **constraints** to make invalid states impossible (unique indexes against double bookings, CHECK constraints against negative balances, exclusion constraints for overlapping time ranges).
- For check-then-act logic across rows, use **SELECT … FOR UPDATE** or **Serializable** with retries.
- Serializable transactions may **abort** under contention; the application must retry them (idempotently).

## Interview angles

- "Two users book the last seat: what happens?" Name the anomaly (lost update or phantom), then the fix (conditional update, unique constraint, or serialisable).
- "What isolation level does your database use?" Know the default and what it allows.
- "What is write skew?" The on-call doctors example, and why snapshot isolation misses it.

--- revise
### Anomalies
? Dirty read? :: Reading another transaction's uncommitted change.
? Lost update? :: Two read-modify-write cycles race; one overwrites the other's change.
? Write skew? :: Two transactions read overlapping data and write different rows, jointly breaking an invariant.
? Phantom? :: A query's result set changes because another transaction inserted/deleted matching rows.
? Read skew example? :: Reading Alice's then Bob's balance mid-transfer and seeing the money in neither.

### Levels
? Read Committed prevents and allows? :: Prevents dirty reads/writes; allows non-repeatable reads, lost updates, write skew.
? Snapshot isolation prevents and allows? :: Prevents dirty and non-repeatable reads (and detects lost updates); allows write skew and phantoms.
? Default in PostgreSQL? :: Read Committed.

### Fixes
? Fix for a counter's lost update? :: Atomic UPDATE n = n + 1 (or SELECT FOR UPDATE, or compare-and-set).
? Fixes for write skew? :: Serializable, lock the rows read (FOR UPDATE), or materialise the conflict; constraints where possible.
? What must apps do under Serializable? :: Retry aborted transactions (idempotently).

--- notes
## Anomalies
Dirty read · dirty write · non-repeatable read / read skew · lost update · write skew · phantom.
## Levels
Read Uncommitted < Read Committed (PG/Oracle default) < Snapshot isolation (PG "Repeatable Read"; MySQL RR default is similar) < Serializable (Spanner, CockroachDB default).
RC: blocks dirty reads/writes only.
SI: consistent snapshot per transaction; PG detects lost updates; misses write skew and phantoms.
Serializable: equivalent to some serial order; may abort → retry.
## Fixes
Counters/balances: atomic UPDATE … SET x = x − k WHERE x ≥ k.
Check-then-act: SELECT … FOR UPDATE or Serializable.
Double booking: unique or exclusion constraints.
Write skew: lock what you read or materialise the conflict.
Know your database's default and the real meaning of its level names.

--- doubts
Q: Why don't databases just default to Serializable?
A: Historically, serialisability was implemented with heavy locking that hurt throughput and caused deadlocks, so weaker defaults became standard. Modern techniques (serialisable snapshot isolation, Spanner's design) make it much cheaper, and some newer databases default to it, but the transaction may abort under contention and must be retried.

Q: How can snapshot isolation miss write skew if it gives each transaction a consistent snapshot?
A: Each transaction's snapshot is consistent, but the two transactions write different rows, so there is no write–write conflict to detect. Each made a valid decision based on its snapshot; together the decisions violate an invariant that spans several rows.

Q: Is SELECT … FOR UPDATE always the fix?
A: It works when the rows you check already exist (lock them so the other transaction waits). It does not help when the check is about rows that *don't* exist yet (phantoms: "no booking overlaps"), because there is nothing to lock. Then use constraints, Serializable, or a materialised row representing the slot.

Q: What's the difference between a non-repeatable read and a phantom?
A: A non-repeatable read is the same row changing between two reads. A phantom is the *set* of rows matching a condition changing (new rows appear or old ones disappear) because of inserts or deletes by another transaction.

--- exercises
[break] Two users click "buy" on the last ticket at the same time. The code reads `remaining`, checks > 0, then writes `remaining - 1` and inserts an order, at Read Committed. What happens and how do you fix it?
A: Both read remaining = 1, both pass the check, both write 0 and insert an order: two tickets sold for one seat (lost update / race on check-then-act). Fix with an atomic conditional update: `UPDATE events SET remaining = remaining - 1 WHERE id = :id AND remaining > 0`, insert the order only if one row was updated, all in one transaction; or SELECT … FOR UPDATE on the event row; or Serializable with retries.

[design] A meeting-room booking system must never create overlapping bookings for the same room. Give two robust designs.
A: (1) A database exclusion constraint (PostgreSQL `EXCLUDE USING gist (room WITH =, during WITH &&)`) so overlapping inserts fail regardless of isolation level. (2) Materialise time slots: one row per (room, 30-minute slot); a booking updates the rows for its slots with a condition that they are free, in one transaction (row locks serialise competitors). Serializable isolation with retries also works.

[choose] A bank's internal transfer service runs on PostgreSQL. Read Committed with careful atomic updates, or Serializable?
A: Either can be correct; for money, prefer Serializable (or at least careful SELECT … FOR UPDATE on both accounts in a fixed order to avoid deadlocks) because invariants span several rows and future code changes can easily introduce check-then-act races. Pair Serializable with automatic retries and idempotency keys so aborts are invisible to users.

--- pitfalls
- Assuming the default isolation level is serialisable
- Read-then-write counters in application code
- Check-then-insert without a constraint or serialisable isolation (double bookings)
- Using Serializable without retry logic
- Trusting level names without checking the database's real semantics

--- quiz
Q: At Read Committed, which anomaly is still possible?
- Dirty reads
- Dirty writes
- *Lost updates
- None
W: Read-modify-write cycles can overwrite each other.
Q: Two doctors each go off call after both see "2 on call". Which anomaly?
- Dirty read
- Phantom insert
- *Write skew
- Lost update
W: Different rows written, invariant across rows broken.
Q: Snapshot isolation does NOT prevent…
- Dirty reads
- Non-repeatable reads
- *Write skew
- Dirty writes
W: Each snapshot is consistent, but cross-row invariants can break.
Q: The safest way to decrement inventory is…
- Read, check in code, then write
- *An atomic conditional UPDATE … WHERE stock > 0
- A cache
- A nightly reconciliation
W: The check and the write happen as one operation.

--- sources
- paper :: A Critique of ANSI SQL Isolation Levels (SIGMOD 1995) :: Berenson et al. :: https://www.microsoft.com/en-us/research/publication/a-critique-of-ansi-sql-isolation-levels/
- book :: Designing Data-Intensive Applications, ch. 7 (Weak isolation levels) :: Martin Kleppmann :: https://dataintensive.net/
- article :: PostgreSQL documentation: Transaction isolation :: PostgreSQL Global Development Group :: https://www.postgresql.org/docs/current/transaction-iso.html
- article :: Hermitage: testing transaction isolation levels :: Martin Kleppmann :: https://github.com/ept/hermitage

=== mvcc-2pl
blurb: How databases actually implement isolation: two-phase locking (and deadlocks), multi-version concurrency control (readers never block writers), and serialisable snapshot isolation, with their costs in contention, aborts and garbage.
signals: Explaining "readers don't block writers" | Deadlocks in production | Long transactions causing table bloat | Choosing pessimistic vs optimistic concurrency
widgets: seq-mvcc
prereq: isolation-anomalies

--- lesson
:::words
- **Lock**: a marker saying "I am using this row"; others must wait. **Shared (read) lock**: many readers allowed. **Exclusive (write) lock**: one writer, nobody else.
- **Two-phase locking (2PL)**: a transaction acquires locks as it goes and releases them only at the end.
- **Deadlock**: two transactions each waiting for a lock the other holds.
- **MVCC (multi-version concurrency control)**: keeping several versions of each row so readers see an old version instead of waiting.
- **Pessimistic concurrency**: lock first, then act. **Optimistic**: act, then check for conflicts at commit.
- **Vacuum / garbage collection**: removing row versions nobody can see any more.
:::

## The problem in plain words

The previous page described *what* isolation levels promise. This page is about *how* databases keep those promises while still running thousands of transactions at once. There are two families: make conflicting transactions **wait** (locking), or let them proceed on **separate versions** of the data and sort out conflicts (MVCC, optimistic checks). Each has characteristic failure modes you will meet in production: deadlocks, lock waits, aborted transactions and bloated tables.

:::eli5
A shared document. Locking: whoever is editing holds the pen; everyone else waits, even those who only want to read. Versioning: each reader gets a photocopy of the document as it was when they started; editors write on the original. Readers never wait, but you accumulate stacks of old photocopies that must be cleared away.
:::

## Two-phase locking (2PL)

- Reading a row takes a shared lock; writing takes an exclusive lock.
- **Growing phase**: locks are acquired as the transaction proceeds. **Shrinking phase**: all locks released at commit or abort (strict 2PL).
- Holding locks until the end guarantees serialisability; locking ranges of an index ("predicate" or "next-key" locks) also prevents phantoms.
- Costs: **readers block writers and writers block readers**; throughput drops under contention; and **deadlocks**: T1 locks A then wants B, T2 locks B then wants A. The database detects the cycle and aborts one transaction, which must retry. Acquire locks in a consistent order to reduce deadlocks.

## MVCC: multiple versions

Every write creates a **new version** of the row, tagged with the writing transaction's ID; old versions stay until no one needs them. Each transaction reads from a **snapshot**: for each row, the newest version committed before the snapshot was taken.

Step through it:

[[widget:seq-mvcc]]

- **Readers never block writers, writers never block readers.** A long report reads its snapshot while updates continue.
- Write–write conflicts on the same row still need handling: the second writer waits for the first; under snapshot isolation, if the first commits, the second is aborted ("first committer wins"), preventing lost updates.
- **Garbage**: old versions must be cleaned up (PostgreSQL's VACUUM; undo logs in MySQL and Oracle). A **long-running transaction** keeps its snapshot's old versions alive, so tables and undo space bloat and performance degrades. Classic production issue: an idle-in-transaction session from a forgotten console.

Used by PostgreSQL, MySQL InnoDB, Oracle, SQL Server (optional), Spanner, CockroachDB.

## Serialisable snapshot isolation (SSI)

Snapshot isolation misses write skew. SSI (Cahill et al., 2008; PostgreSQL's SERIALIZABLE since 9.1) keeps snapshot reads but **tracks read–write dependencies** between concurrent transactions; if it detects a pattern that could produce a non-serialisable result (a "dangerous structure"), it aborts one transaction. Readers still don't block; the cost is occasional aborts that the app must retry.

## Optimistic vs pessimistic

| | Pessimistic (locks) | Optimistic (MVCC / version checks) |
|---|---|---|
| Conflicts handled by | Waiting | Aborting and retrying |
| Best when | Contention is high (many writers on the same rows) | Contention is low (conflicts rare) |
| Failure modes | Lock waits, deadlocks | Abort storms under contention; garbage |

Application-level versions of both exist: `SELECT … FOR UPDATE` (pessimistic) and a `version` column checked on update (optimistic).

## Interview angles

- "How do readers avoid blocking writers?" MVCC snapshots.
- "What causes deadlocks and how do you handle them?" Lock-order cycles; the database aborts one; consistent lock ordering and retries.
- "Why is our table bloated?" Long-running transactions holding old versions; vacuum can't reclaim them.

--- revise
### Locking
? Two-phase locking rule? :: Acquire locks as you go; release all only at commit/abort (strict 2PL).
? 2PL's main cost? :: Readers and writers block each other; deadlocks under contention.
? Deadlock and its handling? :: A cycle of waits; the database aborts one transaction, which retries. Lock in a consistent order.

### MVCC
? How MVCC serves reads? :: Each transaction reads the newest version committed before its snapshot.
? MVCC's headline benefit? :: Readers never block writers and vice versa.
? Snapshot isolation on write–write conflicts? :: First committer wins; the other aborts (prevents lost updates).
? Why do long transactions hurt MVCC databases? :: They keep old versions alive: bloat and slower vacuum/undo.

### SSI and choice
? What does SSI add to snapshot isolation? :: Tracks read–write dependencies and aborts one transaction of a dangerous pattern: serialisable without read locks.
? Pessimistic vs optimistic: when each? :: Pessimistic for high contention; optimistic when conflicts are rare.

--- notes
## 2PL
Shared/exclusive locks; hold until end (strict) → serialisable; range/next-key locks stop phantoms.
Readers ↔ writers block; deadlocks detected and one aborted; consistent lock order helps.
## MVCC
Writes create versions tagged by transaction ID; reads use a snapshot.
Readers never block writers. Write–write: second waits; first committer wins under SI.
Old versions cleaned by VACUUM / undo purge; long transactions cause bloat.
PostgreSQL, InnoDB, Oracle, Spanner, CockroachDB.
## SSI (Cahill 2008, PG SERIALIZABLE)
Snapshot reads + dependency tracking → abort dangerous structures; retry needed.
## Optimistic vs pessimistic
Pessimistic: wait; good under high contention; deadlocks.
Optimistic: abort/retry; good when conflicts rare; abort storms under contention.
App-level: SELECT … FOR UPDATE vs version column.

--- doubts
Q: If MVCC keeps old versions, why doesn't the database run out of space?
A: Background cleanup (VACUUM in PostgreSQL, purge of undo logs in InnoDB) removes versions that no running transaction can see any more. It only falls behind when something holds an old snapshot open (a long transaction) or the write rate outpaces cleanup, which is why long-running transactions and vacuum tuning are classic operational topics.

Q: Do MVCC databases use locks at all?
A: Yes, for writes: two transactions updating the same row still conflict, and the second waits (or aborts). MVCC removes the need for *read* locks. Explicit locks (SELECT … FOR UPDATE) are still available when the application needs them.

Q: Which is faster, locking or optimistic concurrency?
A: It depends on contention. When conflicts are rare, optimistic approaches avoid waiting and are faster. When many transactions fight over the same rows (a hot counter), optimistic approaches abort and retry repeatedly, wasting work; waiting in line with locks is then more efficient.

Q: How does Spanner do serialisable transactions across the world?
A: Read-write transactions use two-phase locking on the leaders of the data they touch plus two-phase commit across partitions; every transaction gets a TrueTime commit timestamp, and lock-free snapshot reads at any past timestamp are served by MVCC. The Google papers chapter covers it.

--- exercises
[break] Every night, a reporting query runs for 6 hours inside one transaction on the PostgreSQL primary. By morning, write latency has doubled and the orders table is 3× its normal size. Why?
A: MVCC keeps every row version created during those 6 hours because the report's snapshot might need them; VACUUM cannot remove them, so the table bloats and indexes point at more dead versions, slowing writes and reads. Fix: run reports on a replica (with care for replica conflicts) or a warehouse, break the report into shorter transactions, and set statement/idle-in-transaction timeouts.

[design] Two services transfer money between accounts and occasionally deadlock. Propose a fix.
A: Always lock the two account rows in a consistent order (e.g. ascending account ID) with SELECT … FOR UPDATE, so no cycle can form; keep the transaction short (no remote calls inside it); and retry on deadlock-abort errors with an idempotency key.

[choose] A likes counter on a popular post gets 5,000 increments per second. Optimistic version-checked updates or pessimistic row locks?
A: Neither on a single row: under that contention optimistic updates would abort constantly and locks would serialise everything on one row. Use an atomic increment (single statement, minimal lock time) on sharded sub-counters, or aggregate increments in memory and write periodically.

--- pitfalls
- Long-running transactions on MVCC databases (bloat)
- Inconsistent lock ordering (deadlocks)
- Remote calls or user think-time inside a transaction
- Optimistic concurrency on hot rows (abort storms)
- Assuming MVCC alone gives serialisability (it gives snapshot isolation)

--- quiz
Q: In MVCC, a long read-only report…
- Blocks all writers
- *Reads its snapshot while writers continue, but keeps old versions alive
- Sees every new write
- Takes exclusive locks
W: Non-blocking reads, at the cost of retained versions.
Q: Strict two-phase locking releases locks…
- After each statement
- *At commit or abort
- Before reading
- Never
W: Holding locks to the end ensures serialisability.
Q: A deadlock is resolved by…
- Waiting forever
- *Aborting one of the transactions, which retries
- Restarting the database
- Removing indexes
W: Databases detect wait cycles and pick a victim.
Q: Serialisable snapshot isolation prevents write skew by…
- Read locks on everything
- *Detecting dangerous read–write dependency patterns and aborting one transaction
- Running transactions serially
- Disabling MVCC
W: Optimistic detection keeps reads non-blocking.

--- sources
- paper :: Serializable Isolation for Snapshot Databases (SIGMOD 2008) :: Cahill, Röhm, Fekete :: https://courses.cs.washington.edu/courses/cse444/08au/544M/READING-LIST/fekete-sigmod2008.pdf
- book :: Designing Data-Intensive Applications, ch. 7 (Serializability) :: Martin Kleppmann :: https://dataintensive.net/
- article :: PostgreSQL documentation: MVCC introduction, routine vacuuming :: PostgreSQL Global Development Group :: https://www.postgresql.org/docs/current/mvcc-intro.html
- course :: CMU 15-445: Concurrency control (2PL, timestamp ordering, MVCC) :: Andy Pavlo :: https://15445.courses.cs.cmu.edu/

=== two-phase-commit
blurb: Committing one transaction across several databases or partitions: the two-phase commit protocol step by step, why it blocks when the coordinator fails, how real systems (Spanner) make it safe with consensus, and when to avoid it altogether.
signals: A transaction spans two services' databases | Cross-shard transactions | "How does Spanner commit across partitions?" | Choosing between 2PC and sagas
widgets: seq-2pc
prereq: acid-wal

--- lesson
:::words
- **Distributed transaction**: one transaction whose writes live on several machines.
- **Coordinator**: the node that runs the commit protocol. **Participants**: the machines holding the data.
- **Prepare (vote)**: a participant promises it can commit, after making its writes durable, and waits for the decision.
- **In doubt**: a participant that has voted yes but not yet heard the decision; it cannot decide alone.
- **Blocking protocol**: one where a single failure can leave others stuck waiting.
:::

## The problem in plain words

A transfer between two accounts on **different** database partitions (or different services) must still be all-or-nothing. But each machine can only commit its own part; if one commits and the other fails, money is created or destroyed. Two-phase commit (2PC) makes several machines agree to commit or abort together. It works, with a famous weakness: if the coordinator disappears at the wrong moment, participants are stuck.

:::eli5
A wedding: the officiant asks each partner "do you?" (phase 1). Only if both say "I do" does the officiant declare them married (phase 2). Once you've said "I do", you can't walk off and marry someone else; you must wait for the declaration. If the officiant faints right after the vows, everyone stands there waiting.
:::

## The protocol

**Phase 1: prepare.** The coordinator asks every participant to prepare. Each participant writes all the transaction's changes and a "prepared" record durably to its log, keeps the locks, and votes **yes**; or votes **no** if it can't commit (constraint violation, conflict, crash).

**Phase 2: commit or abort.** If **every** vote is yes, the coordinator durably records "commit" in its own log (this is the moment of decision) and tells everyone to commit. If any vote is no (or a participant times out), it decides abort. Participants apply the decision and release locks.

Step through the normal run and the failure cases:

[[widget:seq-2pc]]

## Why it blocks

A participant that voted **yes** has given up its right to abort on its own: the coordinator might already have decided commit and told others. If the coordinator crashes after collecting the votes and before sending the decision, prepared participants are **in doubt**: they must hold their locks and wait, possibly for a long time, until the coordinator recovers and reads its log. Rows stay locked, other transactions pile up behind them. That is the core problem of 2PC.

Other costs: at least two round trips plus several fsyncs per transaction; locks held across the network round trips; and the slowest participant sets the pace.

## Making 2PC safe in practice

- **Replicate the coordinator and participants with consensus.** Spanner runs 2PC where each participant (and the coordinator) is a Paxos group, not a single machine, so a single crash doesn't lose the decision or block; a new leader of the group continues the protocol. This is how Spanner offers cross-partition ACID transactions.
- **Recover from the log.** Coordinators must log their decision durably before announcing it, so a restart can finish the protocol.
- **XA transactions** (the standard interface across heterogeneous databases and message brokers) exist, but they inherit the blocking problem and operational pain; they are rarely the right choice across independent services.

## When not to use 2PC

Across **independent services** owned by different teams (orders service, payments service, inventory service), 2PC couples their availability (any one down blocks the others), holds locks across network calls, and requires every service's datastore to support it. The usual alternative is a **saga** with compensating actions and the outbox pattern (next page): give up atomic isolation, keep eventual all-or-nothing.

Inside a single distributed database (Spanner, CockroachDB, a sharded store with transaction support), 2PC between partitions is normal and handled for you.

## Interview angles

- "How do you commit across two shards?" 2PC: prepare, then commit; the database does it if it supports cross-partition transactions.
- "What's wrong with 2PC?" Blocking when the coordinator fails after prepare; latency; coupling. Spanner mitigates with Paxos-replicated participants.
- "Orders and payments are separate services. Use 2PC?" Usually not: a saga with compensations and an outbox.

--- revise
### Protocol
? Phase 1 of 2PC? :: Coordinator asks participants to prepare; each makes its changes durable, keeps locks and votes yes or no.
? Phase 2 of 2PC? :: All yes → coordinator logs commit and tells all to commit; any no/timeout → abort.
? What is the moment of decision? :: The coordinator durably logging "commit".

### Problems
? Why does 2PC block? :: A participant that voted yes can't decide alone; if the coordinator dies before announcing, it waits holding locks (in doubt).
? Other costs of 2PC? :: Extra round trips and fsyncs, locks held across the network, pace set by the slowest participant.
? How does Spanner avoid blocking? :: Coordinator and participants are Paxos groups, so the decision survives single-machine failures.
? Alternative across independent services? :: Sagas with compensating actions (and the outbox pattern).

--- notes
## Protocol
Phase 1 prepare: participants write changes + "prepared" durably, hold locks, vote.
Phase 2: all yes → coordinator logs COMMIT (decision point) → tells all; any no/timeout → ABORT.
Participants apply, release locks; ack.
## Blocking
Yes-voters are in doubt until they learn the decision; coordinator crash after votes → locks held indefinitely.
Costs: 2+ round trips, several fsyncs, locks across network, slowest participant.
## Making it work
Log decisions durably; recovery completes protocol.
Spanner: Paxos-replicated coordinator/participants → non-blocking in practice.
XA: standard but blocking and painful across heterogeneous systems.
## When not
Across independent services → saga + outbox. Inside one distributed DB → fine (handled internally).

--- doubts
Q: Why can't a prepared participant just abort after a timeout?
A: Because the coordinator may already have decided commit and told other participants, who may have committed. If this participant aborted, the transaction would be half committed, breaking atomicity. Having voted yes, it must wait for the real decision (it can ask other participants whether any of them knows it).

Q: Is three-phase commit the fix?
A: 3PC adds a phase to avoid blocking, but only under assumptions (bounded network delays, no partitions) that real networks don't satisfy. Practical systems instead replicate the coordinator and participants with consensus (Paxos/Raft), which is what Spanner does.

Q: Does 2PC give isolation, or just atomicity?
A: The commit protocol gives atomicity across machines; isolation comes from each participant's concurrency control (locks held from prepare to commit, or MVCC with commit timestamps). Spanner combines 2PC with two-phase locking and TrueTime timestamps to get serialisable (in fact externally consistent) transactions.

Q: How slow is 2PC?
A: At minimum two network round trips between coordinator and participants plus durable writes at each step. Inside one data centre that's a few milliseconds; across regions, each round trip can be tens of milliseconds, and locks are held for that whole time, which limits throughput on contended rows.

--- exercises
[break] During a 2PC transaction across shards A and B, both vote yes, and the coordinator's machine dies before sending the decision. What happens to other transactions that need the same rows, and what design prevents the long stall?
A: A and B are in doubt and must keep holding their locks; any transaction needing those rows waits (or times out) until the coordinator recovers and reads its log to finish the protocol. If its disk is lost, manual intervention may be needed. Prevention: replicate the coordinator's state with consensus (a Paxos/Raft group, as Spanner does) so a new leader can complete the decision within seconds.

[choose] An e-commerce checkout must charge a card (external payment provider), reserve stock (inventory service) and create an order (orders service). 2PC or saga?
A: Saga. The payment provider will not participate in your 2PC, and coupling three services' availability and holding locks across external calls is fragile. Run steps in order with compensations (release stock, refund payment) if a later step fails, driven by an orchestrator, with each service using an outbox to publish events reliably.

[estimate] A 2PC transaction spans two partitions in different regions with an 80 ms round trip between coordinator and the remote participant. Roughly how long are the remote rows locked, and what does that mean for a hot row?
A: From prepare (one round trip to collect the vote, ~80 ms) through the commit message (another ~40–80 ms) plus fsyncs: roughly 150–200 ms. A hot row locked that long can be updated by at most ~5–7 transactions per second, so contended data must avoid cross-region transactions (keep it within one region or partition).

--- pitfalls
- 2PC across independent microservices
- Coordinators that don't log the decision durably
- Ignoring in-doubt transactions and the locks they hold
- Cross-region transactions on hot rows
- Assuming 3PC solves blocking in real networks

--- quiz
Q: In 2PC, when is the transaction's outcome decided?
- When the first participant votes yes
- *When the coordinator durably logs commit after all yes votes
- When participants release locks
- When the client retries
W: That log record is the point of no return.
Q: A participant that voted yes and lost contact with the coordinator must…
- Commit on its own
- Abort on its own
- *Wait, holding locks, until it learns the decision
- Delete the transaction
W: It is in doubt and cannot decide alone.
Q: How does Spanner make 2PC practical?
- It uses 3PC
- *Coordinator and participants are Paxos-replicated groups, so single failures don't block
- It avoids locks
- It only commits in one region
W: Consensus makes the protocol's state highly available.
Q: For orders, payments and inventory owned by separate services, the usual choice is…
- XA transactions
- 2PC through a shared coordinator
- *A saga with compensating actions
- A single shared database
W: Sagas avoid locking across services and external providers.

--- sources
- paper :: Spanner: Google's Globally-Distributed Database (OSDI 2012) :: Corbett et al. :: https://research.google/pubs/spanner-googles-globally-distributed-database-2/
- book :: Designing Data-Intensive Applications, ch. 9 (Atomic commit and two-phase commit) :: Martin Kleppmann :: https://dataintensive.net/
- paper :: Consensus on Transaction Commit (TODS 2006) :: Jim Gray, Leslie Lamport :: https://www.microsoft.com/en-us/research/publication/consensus-on-transaction-commit/
- course :: MIT 6.824 Distributed Systems: lecture on 2PC and Spanner :: MIT :: https://pdos.csail.mit.edu/6.824/schedule.html

=== sagas-outbox
blurb: Keeping data correct across services without distributed transactions: sagas (a chain of local transactions with compensations), orchestration vs choreography, the transactional outbox for reliably publishing events, and idempotent consumers.
signals: A business process spans several services | "What if payment succeeds but shipping fails?" | Publishing events reliably after a database write | Avoiding the dual-write problem
widgets: seq-saga
prereq: two-phase-commit

--- lesson
:::words
- **Saga**: a long business process split into steps, each a local transaction in one service, with a **compensating action** that undoes it.
- **Compensation**: a new action that semantically reverses an earlier one (a refund for a charge), rather than a rollback.
- **Orchestration**: a central coordinator tells each service what to do next. **Choreography**: services react to each other's events with no central coordinator.
- **Dual write**: updating a database and publishing a message as two separate operations (which can partially fail).
- **Outbox**: a table, written in the same transaction as the data change, holding events to be published.
- **Idempotent consumer**: a consumer that processes the same message twice with the same effect as once.
:::

## The problem in plain words

Placing an order touches several services: create the order, reserve stock, charge the card, arrange shipping. Each owns its own database, and a single atomic transaction across them is impractical (2PC page). So the steps happen one after another, each committing locally. If step 3 fails, steps 1 and 2 have already committed, and something must **undo** them. And every step must reliably tell the next one what happened, even if a service crashes right after writing to its database.

:::eli5
Booking a holiday: you book the flight, then the hotel, then the car. If the car is unavailable, you don't magically "un-happen" the flight; you cancel it (maybe paying a fee). A saga is booking step by step with a cancellation plan for each step.
:::

## Sagas

A saga is a sequence of local transactions T1, T2, …, Tn, each with a compensation C1, C2, …. If Tk fails, run Ck-1, …, C1 in reverse order.

Step through the happy path, a failure with compensations, and the outbox:

[[widget:seq-saga]]

Design rules:
- **Compensations are business actions, not rollbacks**: you can't un-send an email; you send a correction. A charged card gets a refund (which might take days and appear on a statement).
- **Order steps so the hardest-to-undo comes last** (charge the card after reserving stock and validating the order), and put steps that can't fail (or must not be undone) at the end ("pivot transaction").
- **No isolation**: other transactions can see intermediate states (stock reserved for an order that will be cancelled). Use semantic locks ("reserved" status), or design so intermediate states are harmless.
- **Every step and compensation must be idempotent and retryable**, because messages can be delivered twice and steps retried after timeouts.

## Orchestration vs choreography

| | Orchestration | Choreography |
|---|---|---|
| Control | A saga orchestrator (a service or workflow engine) calls each step and decides what's next | Each service listens for events and emits its own |
| Visibility | The whole flow in one place; easy to see status | Spread across services; harder to trace |
| Coupling | Orchestrator knows all steps | Services know only events |
| Best for | Complex flows with many steps and compensations | Simple flows with few participants |

Durable workflow engines (Temporal, Google Cloud Workflows, AWS Step Functions) make orchestration robust: the orchestrator's state survives crashes and retries are built in.

## The dual-write problem and the transactional outbox

A step usually does two things: update its database **and** publish an event ("StockReserved"). Done separately, either can fail:
- DB commit succeeds, publish fails → other services never hear about it.
- Publish succeeds, DB commit fails → others act on something that didn't happen.

**Transactional outbox**: in the **same local transaction** as the business change, insert the event into an `outbox` table. A separate **relay** reads the outbox (polling, or better, the database's change log via CDC, e.g. Debezium) and publishes each event to the message broker, marking it sent. The change and the event can't disagree: both commit or neither does. Publishing is at-least-once (the relay may republish after a crash), so consumers must be **idempotent**: record processed message IDs (in the same transaction as their own change, an **inbox**), or make operations naturally idempotent.

## Interview angles

- "Payment succeeded but the order failed to save; what now?" Saga ordering and compensation (refund), driven by an orchestrator, with idempotent steps.
- "How do you publish an event reliably after a DB write?" Transactional outbox + relay/CDC + idempotent consumers.
- "Orchestration or choreography?" Orchestration for multi-step flows needing visibility and compensations; choreography for simple event reactions.

--- revise
### Sagas
? What is a saga? :: A sequence of local transactions, each with a compensating action run in reverse if a later step fails.
? Compensation vs rollback? :: A compensation is a new business action that semantically undoes a committed step (refund, cancellation).
? How to order saga steps? :: Hardest-to-undo steps last; steps that can't be compensated after the pivot.
? What do sagas give up? :: Isolation: intermediate states are visible (use semantic locks like "reserved").

### Orchestration vs choreography
? Orchestration? :: A central orchestrator drives each step and compensation; visible, easier for complex flows.
? Choreography? :: Services react to each other's events; decoupled but harder to trace.

### Outbox
? The dual-write problem? :: DB write and message publish are separate, so one can succeed without the other.
? Transactional outbox? :: Write the event to an outbox table in the same transaction; a relay/CDC publishes it.
? Why must consumers be idempotent? :: The relay publishes at least once; duplicates must be harmless (inbox of processed IDs).

--- notes
## Saga
T1…Tn local transactions; on failure at Tk run Ck−1…C1.
Compensations are business actions (refund, cancel, correction email).
Order: validation and reversible steps first; charge/irreversible near the end (pivot).
No isolation → semantic locks (reserved/pending states).
Steps and compensations idempotent and retryable.
## Orchestration vs choreography
Orchestrator (workflow engine: Temporal, Cloud Workflows, Step Functions): visible, durable state, easy compensations.
Choreography: event reactions; loose coupling; hard to trace big flows.
## Outbox
Dual write fails partially.
Business change + outbox row in one transaction → relay (polling or CDC/Debezium) → broker.
At-least-once publish → idempotent consumers / inbox table of processed message IDs.

--- doubts
Q: Isn't a saga just eventual consistency for transactions?
A: Yes, that's a fair summary: the system ends up all-done or all-compensated (eventual atomicity), but other observers can see the in-between states, and compensations are business-level, not invisible rollbacks. You trade isolation for availability and loose coupling.

Q: What if a compensation fails?
A: Retry it (compensations must be idempotent and retryable), and if it keeps failing, escalate to a human workflow (a dead-letter queue and an alert). Design compensations to be very unlikely to fail permanently: issuing a refund or releasing a reservation should only depend on the service's own data.

Q: Why not publish the event first, then write the database?
A: Then the event can go out for a change that ends up not committing (the DB write fails or the service crashes), and other services act on something that never happened. The outbox makes the event part of the same atomic local transaction as the change.

Q: Polling the outbox or CDC?
A: Polling is simple (a job selects unsent rows every second), but adds load and latency and needs care with ordering. CDC reads the database's commit log, publishing in commit order with low latency and no extra queries, at the cost of running a CDC pipeline (Debezium, Datastream).

--- exercises
[design] Design the order saga: create order, reserve stock, charge card, schedule shipping. Give each step's compensation and the order of steps.
A: 1) Create order (status PENDING); compensation: mark CANCELLED. 2) Reserve stock (status RESERVED with expiry); compensation: release reservation. 3) Charge card (with an idempotency key at the payment provider); compensation: refund. 4) Schedule shipping; this is the pivot (after it, don't compensate; handle failures by retrying or manual handling). 5) Mark order CONFIRMED. An orchestrator (workflow engine) drives steps, retries with backoff, and runs compensations in reverse on failure; every service uses an outbox and idempotent handlers.

[break] The inventory service updates stock in its database, then calls `publish("StockReserved")`. Occasionally orders get stuck forever in PENDING. Why?
A: Dual write: the service sometimes crashes (or the broker call fails) after the DB commit but before publishing, so the orchestrator never hears StockReserved and the saga stalls; stock stays reserved. Fix: transactional outbox (write the event row in the same transaction; a relay or CDC publishes it), plus a timeout on the orchestrator that queries status or compensates.

[choose] A sign-up flow creates a user and sends a welcome email via a separate email service. Orchestrated saga or choreography?
A: Choreography is enough: the user service commits the user and an outbox event "UserCreated"; the email service consumes it and sends the email idempotently (using the event ID). There's nothing to compensate (a failed email just retries), so a central orchestrator would add complexity without benefit.

--- pitfalls
- Dual writes (database + publish) without an outbox
- Non-idempotent steps or consumers
- Compensations designed as if they were invisible rollbacks
- Irreversible steps (charging, emailing) early in the saga
- Choreography for long, complex flows that nobody can trace

--- quiz
Q: A saga handles a failed step by…
- Rolling back all services atomically
- *Running compensating actions for completed steps in reverse order
- Ignoring the failure
- Two-phase commit
W: Each committed step is undone by a business action.
Q: The transactional outbox solves…
- Slow queries
- *Database change and event publish disagreeing (dual writes)
- Hot keys
- Schema migrations
W: Both are committed in one local transaction.
Q: Why must outbox consumers be idempotent?
- For speed
- *The relay may publish an event more than once
- Brokers reorder messages randomly
- Outbox rows are deleted
W: At-least-once delivery means duplicates.
Q: Orchestration is preferred over choreography when…
- There are only two services
- *The flow has many steps and compensations and needs visibility
- Events must be anonymous
- No state is involved
W: One place holds the flow's logic and status.

--- sources
- paper :: Sagas (SIGMOD 1987) :: Hector Garcia-Molina, Kenneth Salem :: https://www.cs.cornell.edu/andru/cs711/2002fa/reading/sagas.pdf
- article :: Pattern: Saga / Transactional outbox :: Chris Richardson (microservices.io) :: https://microservices.io/patterns/data/saga.html
- article :: Reliable microservices data exchange with the outbox pattern :: Gunnar Morling (Debezium) :: https://debezium.io/blog/2019/02/19/reliable-microservices-data-exchange-with-the-outbox-pattern/
- article :: Temporal: workflows and sagas :: Temporal Technologies :: https://docs.temporal.io/encyclopedia/workflow-message-passing

=== consensus-raft
blurb: How a group of machines agrees on one ordered log despite crashes and network failures: the consensus problem, Raft's leader election, log replication and safety rules, how Paxos relates, and where consensus is used (etcd, ZooKeeper, Spanner, Chubby).
signals: Leader election | Replicated configuration or metadata | "How does etcd/ZooKeeper stay consistent?" | Explaining Spanner's Paxos groups | Avoiding split brain
widgets: raft
prereq: leader-replication

--- lesson
:::words
- **Consensus**: getting several machines to agree on a value (or a sequence of values), even if some crash.
- **Replicated state machine**: every replica applies the same commands in the same order, so all end in the same state.
- **Term**: a numbered period with at most one leader; a new election starts a new term.
- **Election timeout**: how long a follower waits without hearing from a leader before trying to become leader.
- **Log entry**: one command in the replicated log, tagged with the term it was created in.
- **Committed**: an entry stored on a majority; it will never be lost or changed.
- **Majority (quorum)**: more than half: 3 of 5.
:::

## The problem in plain words

Leader-based replication needs someone to decide who the leader is, and to make sure there is never more than one, even when machines crash and messages are lost or delayed. "Just use a heartbeat timeout" leads to split brain when the network, not the leader, is the problem. **Consensus** algorithms solve this rigorously: a group of machines (usually 3 or 5) agrees on a single ordered log of commands, and as long as a majority is alive and can talk, the log keeps growing and no committed entry is ever lost or contradicted.

:::eli5
Five club members keep the same minutes book. One is chair and writes entries; an entry counts once at least three members have copied it. If the chair goes silent, anyone can call an election; whoever gets three votes becomes chair for a new numbered session. Because any two groups of three share a member, two chairs can never both get their entries accepted.
:::

## Raft in three parts

Raft (Ongaro and Ousterhout, 2014) was designed to be understandable; it is used by etcd, Consul, CockroachDB, TiKV and many others.

**1. Leader election.**
- Every node is a follower, candidate or leader. Followers expect regular heartbeats from the leader.
- If a follower hears nothing for its **election timeout** (randomised, e.g. 150–300 ms, so nodes rarely time out together), it becomes a candidate: increments the **term**, votes for itself and asks others for votes.
- A node grants at most one vote per term, and only to a candidate whose log is at least as up to date as its own.
- A candidate with votes from a **majority** becomes leader for that term and starts sending heartbeats. If votes split, the term ends without a leader and a new election starts after another random timeout.

**2. Log replication.**
- Clients send commands to the leader, which appends them to its log and sends them to followers (AppendEntries).
- Once an entry is stored on a **majority**, the leader marks it **committed**, applies it to its state machine and replies to the client; followers apply it when they learn it is committed.
- Each AppendEntries carries the previous entry's index and term; a follower that doesn't match rejects it, and the leader backs up until the logs match, then overwrites the follower's divergent tail. The leader's log is the truth.

**3. Safety.**
- **Election restriction**: a candidate can only win if its log contains every committed entry (voters refuse candidates with less up-to-date logs), so a new leader never loses committed data.
- Terms act as **fencing**: a deposed leader that comes back sees a higher term and steps down; its stale messages are rejected.

Run a 5-node cluster: crash the leader, partition nodes, and send commands:

[[widget:raft]]

## Fault tolerance and performance

- **2f + 1 nodes tolerate f failures**: 3 nodes survive 1; 5 survive 2. Even numbers add cost without adding tolerance (4 nodes still survive only 1).
- Every write costs a round trip to a majority plus a durable log write. Within a region, a few milliseconds; across regions, the distance to the nearest majority.
- Reads must also be careful: a leader that has been partitioned away might not know it's deposed. Linearisable reads go through the log, or use **leader leases** / a heartbeat round ("read index") to confirm leadership first.
- Throughput is limited by the leader; systems shard data into many consensus groups (Spanner, CockroachDB, TiKV run thousands of groups, one per data range).

## Paxos, briefly

Lamport's Paxos (1989/1998) solves the same problem and is the historical foundation (Google's Chubby and Spanner use Paxos). Basic Paxos agrees on one value with two phases (prepare/promise with proposal numbers, then accept); Multi-Paxos runs many instances with a stable leader to agree on a log, which ends up very similar to Raft. Raft's contribution is clarity: a strong leader, explicit terms and a clear election rule.

## What consensus is used for

Configuration and service discovery (etcd for Kubernetes), leader election and locks (ZooKeeper, Chubby, etcd), metadata of large systems (GFS/Colossus, Bigtable's master selection via Chubby), and the replication of every data range in Spanner and CockroachDB. A rule of thumb: put **small, critical, strongly consistent** state in a consensus system; put bulk data elsewhere.

## Interview angles

- "How do you elect a leader safely?" A consensus service (etcd/ZooKeeper) or Raft itself: majority votes per term, randomised timeouts, terms as fencing.
- "Why 5 nodes and not 4?" 2f+1: 5 tolerates 2 failures, 4 only 1.
- "Why is etcd slow for heavy writes?" Every write needs a majority round trip and fsync, through one leader; shard or keep only metadata there.

--- revise
### Raft
? When does a Raft follower start an election? :: When its randomised election timeout passes without heartbeats from a leader.
? How does a candidate win? :: Votes from a majority in its term; each node votes once per term, only for candidates with logs at least as up to date.
? When is an entry committed? :: When the leader has it stored on a majority.
? How are divergent follower logs fixed? :: The leader finds the last matching entry and overwrites the follower's tail.
? Why can't a new leader lose committed entries? :: The election restriction: voters reject candidates whose logs are less up to date.
? How do terms provide fencing? :: Messages with older terms are rejected; a returning old leader steps down.

### Practice
? Nodes needed to tolerate f failures? :: 2f + 1 (3 for 1, 5 for 2).
? Why randomised election timeouts? :: To avoid split votes from simultaneous candidates.
? Linearisable reads in Raft? :: Through the log, or after confirming leadership (read index / leader lease).
? What belongs in a consensus system? :: Small, critical, strongly consistent state: config, leadership, locks, metadata.

--- notes
## Roles and terms
Follower → (timeout) candidate → (majority votes) leader. One leader per term at most.
Randomised election timeouts (e.g. 150–300 ms) avoid split votes.
## Log replication
Leader appends, sends AppendEntries (prev index + term check).
Committed = on a majority → apply → reply to client.
Mismatch → leader backs up and overwrites follower's divergent tail.
## Safety
Vote only for candidates at least as up to date → committed entries survive elections.
Higher term wins; stale leaders step down (fencing).
## Practice
2f+1 nodes tolerate f; odd sizes.
Write = majority round trip + fsync; leader is the bottleneck → many groups per system (Spanner, CockroachDB, TiKV).
Reads: via log, read index, or leader lease.
## Paxos
Prepare/promise + accept with proposal numbers; Multi-Paxos ≈ Raft with a stable leader; Chubby, Spanner.
## Uses
etcd (Kubernetes), ZooKeeper, Consul, Chubby; metadata; per-range replication in distributed SQL.

--- doubts
Q: Why do we need consensus if we already have leader–follower replication?
A: Leader–follower replication needs someone to decide who the leader is, safely, when things fail. Doing that with timeouts alone causes split brain. Consensus makes leader choice and the log itself agreed by a majority, so there can't be two leaders whose writes both commit.

Q: What happens if the network splits a 5-node cluster into 3 and 2?
A: The side with 3 can elect a leader (majority) and keep committing. The side with 2 can't win an election or commit anything; an old leader stranded there can't get a majority to commit, so its writes never succeed and clients time out. When the partition heals, the minority nodes see the higher term and catch up.

Q: Is Raft the same as Paxos?
A: They solve the same problem with similar guarantees; Multi-Paxos with a stable leader behaves much like Raft. Raft specifies more of the practical details (elections, log matching, membership changes) in an easy-to-follow way, which is why many new systems chose it.

Q: Can a Raft leader serve reads from its own state?
A: Only if it is sure it is still the leader. A leader cut off by a partition might not know a new one was elected and could serve stale data. It either confirms with a majority before answering (read index), or relies on a time-based lease, which assumes bounded clock drift.

--- exercises
[estimate] A 5-node Raft group spans three regions: 2 nodes in us-east (leader), 2 in us-west (70 ms round trip), 1 in europe (90 ms). What is the minimum commit latency for a write?
A: The leader needs 3 of 5 acknowledgements: itself, the other us-east node (~1 ms), and one more, the nearest being a us-west node (~70 ms round trip). So about 70 ms plus fsyncs. Placing 3 nodes in one region would make commits fast but lose the majority if that region fails.

[break] A team runs etcd with 4 nodes "for extra safety" across 2 data centres (2 + 2). A link failure between the data centres takes etcd down entirely. Why?
A: A majority of 4 is 3; after the split each side has 2, so neither side can elect a leader or commit writes. Four nodes tolerate only one failure, and a 2+2 placement can't survive the link loss. Use 3 or 5 nodes across 3 failure domains (e.g. 2+2+1 across three data centres).

[choose] Store user profiles (500M users, 2 KB each) in etcd so they're strongly consistent?
A: No. etcd is designed for small, critical metadata (recommended data sizes are in the gigabytes at most), and every write goes through a single leader with a majority round trip and fsync. Store profiles in a scalable database (sharded, each shard replicated, possibly with its own consensus, as in Spanner/CockroachDB); use etcd/ZooKeeper only for configuration, leadership and coordination.

--- pitfalls
- Even-sized consensus groups (4, 6)
- Placing a majority of nodes in one failure domain
- Bulk data in a consensus store
- Serving reads from a leader without confirming leadership
- Expecting a minority partition to keep accepting writes

--- quiz
Q: A Raft entry is committed when…
- The leader writes it
- *It is stored on a majority of nodes
- Every node has it
- The client acknowledges it
W: Majority storage guarantees it survives any future election.
Q: How many node failures can a 5-node Raft cluster tolerate?
- 1
- *2
- 3
- 4
W: 2f + 1 = 5 → f = 2.
Q: Why are Raft election timeouts randomised?
- For security
- *So nodes rarely start elections at the same moment and split votes
- To save bandwidth
- To make leaders change often
W: Staggered timeouts let one candidate win quickly.
Q: A former leader rejoins after a partition and sees a higher term. It…
- Keeps leading
- *Steps down to follower and adopts the newer leader's log
- Starts a split brain
- Deletes the cluster
W: Terms fence off stale leaders.

--- sources
- paper :: In Search of an Understandable Consensus Algorithm (Raft, USENIX ATC 2014) :: Diego Ongaro, John Ousterhout :: https://raft.github.io/raft.pdf
- tool :: The Raft Consensus Algorithm (visualisation, implementations) :: raft.github.io :: https://raft.github.io/
- paper :: Paxos Made Simple (2001) :: Leslie Lamport :: https://lamport.azurewebsites.net/pubs/paxos-simple.pdf
- paper :: Paxos Made Live: An Engineering Perspective (PODC 2007) :: Chandra, Griesemer, Redstone (Google) :: https://research.google/pubs/paxos-made-live-an-engineering-perspective/
- course :: MIT 6.824 Distributed Systems: Raft labs and lectures :: MIT :: https://pdos.csail.mit.edu/6.824/

=== clocks-ordering
blurb: Why "what happened first?" is hard in distributed systems: physical clock skew, Lamport clocks, vector clocks, hybrid logical clocks, and Google's TrueTime with commit wait, and which ordering each one can and cannot give you.
signals: Ordering events from many machines | Last-writer-wins depending on timestamps | Explaining Spanner's TrueTime | Detecting concurrent updates
widgets: seq-clocks
prereq: consensus-raft

--- lesson
:::words
- **Clock skew**: the difference between two machines' clocks at the same moment.
- **NTP**: the network time protocol machines use to keep clocks roughly in sync (typically within milliseconds).
- **Happened-before**: A happened before B if A could have influenced B (same process earlier, or a message from A's side reached B's side).
- **Concurrent**: neither event happened before the other.
- **Lamport clock**: a counter that respects happened-before.
- **Vector clock**: a list of counters, one per node, that can detect concurrency.
- **TrueTime**: Google's clock API that returns an interval guaranteed to contain the true time.
:::

## The problem in plain words

On one machine, events have a clear order. Across machines, each has its own clock, and clocks drift apart by milliseconds (sometimes seconds, after a bad NTP sync or a VM pause). If server A stamps a write at 10:00:00.005 and server B stamps a later write at 10:00:00.003 because B's clock is behind, "latest timestamp wins" picks the wrong one. Distributed systems need ways to order events that don't trust wall clocks blindly.

:::eli5
Two people in different rooms write notes and stamp them with their own wristwatches. If one watch runs a few seconds slow, sorting the notes by time puts a reply before the question. Better: each note carries a number one higher than the highest number its writer has seen, so a reply always gets a bigger number than the question it answers.
:::

## Physical clocks

Clocks are kept in sync by NTP to within a few milliseconds on a good network, much worse on a bad one; clocks can **jump** (backwards too) when corrected, and virtual machines can pause. Use physical time for humans (logs, "posted 5 minutes ago") and for leases/timeouts with safety margins, but **never assume two machines' timestamps order their events correctly** when they are milliseconds apart.

## Lamport clocks

Each process keeps a counter:
- Increment it before each local event.
- Attach it to every message sent.
- On receiving a message, set the counter to max(local, received) + 1.

If A happened before B, then L(A) < L(B). Ties are broken by node ID to get a **total order** consistent with causality. The converse doesn't hold: L(A) < L(B) does **not** mean A happened before B (they may be concurrent). Lamport clocks order events consistently but cannot detect concurrency.

## Vector clocks

Each process keeps a vector of counters, one per process. On a local event, increment your own entry; send the vector with messages; on receive, take the element-wise max, then increment your own entry.

- A happened before B ⟺ every entry of A's vector ≤ B's and at least one is smaller.
- If neither is ≤ the other, A and B are **concurrent**: a real conflict to resolve.

Used (as version vectors) by Dynamo-style stores and sync systems to detect conflicting writes instead of silently dropping one. Cost: the vector grows with the number of participants.

Step through messages between three nodes and watch both kinds of clock:

[[widget:seq-clocks]]

## Hybrid logical clocks (HLC)

Combine a physical timestamp with a logical counter: the timestamp tracks wall time closely (useful for humans and for "read as of time T"), while the logical part guarantees causality even when clocks are slightly out of sync. Used by CockroachDB, YugabyteDB and MongoDB to order transactions.

## TrueTime and commit wait (Spanner)

Google equipped data centres with GPS receivers and atomic clocks so every server knows the time **with a bounded uncertainty** ε (typically a few milliseconds). TrueTime's API returns an interval [earliest, latest] guaranteed to contain the true time.

To give transactions a global order matching real time (external consistency), Spanner assigns a commit timestamp s = TT.now().latest and then **waits until TT.now().earliest > s** before making the commit visible ("commit wait", about 2ε). After the wait, real time has definitely passed s, so any transaction that starts later will get a larger timestamp. The cost is a few milliseconds per commit; the benefit is globally consistent snapshots and ordering without extra communication.

## Choosing

| Need | Use |
|---|---|
| Human-readable times, rough ordering | Physical time (NTP) |
| A total order consistent with causality | Lamport clocks |
| Detect concurrent (conflicting) updates | Vector / version vectors |
| Causality plus near-wall-clock timestamps | Hybrid logical clocks |
| Global real-time order for transactions | TrueTime-style bounded uncertainty + commit wait (or a consensus log) |

## Interview angles

- "Why not order writes by timestamp?" Clock skew and jumps; last-writer-wins can drop the later write.
- "Lamport vs vector clocks?" Lamport gives an order consistent with causality; vector clocks also detect concurrency.
- "How does Spanner get external consistency?" TrueTime intervals and commit wait.

--- revise
### Physical time
? Why can't you order cross-machine events by wall clock? :: Clocks skew by milliseconds or more and can jump backwards.
? What is physical time still good for? :: Human-facing times and leases/timeouts with safety margins.

### Logical clocks
? Lamport clock update on receive? :: counter = max(local, received) + 1.
? What do Lamport clocks guarantee and not? :: A→B implies L(A) < L(B); but L(A) < L(B) doesn't imply A→B (can't detect concurrency).
? When are two vector-clock events concurrent? :: Neither vector is ≤ the other element-wise.
? Hybrid logical clocks? :: Physical timestamp + logical counter: close to wall time and causally correct (CockroachDB).

### TrueTime
? What does TrueTime return? :: An interval [earliest, latest] guaranteed to contain the true time.
? What is commit wait? :: Choose s = latest, then wait until earliest > s before exposing the commit (~2ε).
? What does commit wait buy? :: External consistency: later transactions always get larger timestamps.

--- notes
## Physical clocks
NTP sync: ms on good networks; jumps on correction; VM pauses.
Fine for humans, leases with margins; not for ordering close events across machines.
## Lamport
Increment per event; send counter; receive: max + 1.
A → B ⇒ L(A) < L(B); total order with node-ID tie-break; can't detect concurrency.
## Vector clocks
Vector per process; increment own; merge = element-wise max (+1 own).
A → B ⇔ VA ≤ VB (and ≠). Neither ≤ → concurrent → conflict.
Dynamo-style version vectors; size grows with participants.
## HLC
Physical + logical; causality + near wall time; CockroachDB, YugabyteDB, MongoDB.
## TrueTime (Spanner)
GPS + atomic clocks; interval with ε of a few ms.
Commit timestamp s = TT.now().latest; wait until TT.now().earliest > s (~2ε).
→ external consistency (real-time order) across the globe.

--- doubts
Q: If NTP keeps clocks within milliseconds, isn't that good enough?
A: For many uses, yes. But writes from different machines can easily happen within the same few milliseconds, and NTP occasionally fails badly (misconfigured servers, network asymmetry, leap seconds, VM pauses). A design whose correctness depends on clocks being right will eventually lose data; a design that only uses clocks for performance or for humans is safe.

Q: Why does Spanner wait instead of just trusting its accurate clocks?
A: Because "accurate" still means "within ε". By waiting out the uncertainty, Spanner guarantees that the commit timestamp is in the past for everyone before anyone can see the transaction. That turns bounded clock uncertainty into a strict real-time ordering, which is exactly what external consistency needs. Better clocks shrink ε and so shrink the wait.

Q: When would I use vector clocks in an interview design?
A: When concurrent writes to the same data can happen in different places (multi-leader, offline sync, leaderless stores) and you need to know whether one write superseded another or they genuinely conflict, so you can merge instead of silently discarding one.

Q: Do Raft or Paxos need synchronised clocks?
A: Not for safety: ordering comes from the replicated log and terms. Clocks only matter for timeouts (election timeouts) and optional optimisations like leader leases for reads, which assume bounded clock drift.

--- exercises
[break] A multi-region service uses last-writer-wins by wall-clock timestamp. Server B's clock is 40 ms slow. A user edits a document on A at real time t and again on B at t + 20 ms. Which edit survives?
A: A's timestamp is t; B's is t + 20 − 40 = t − 20 ms. Last-writer-wins keeps A's (older) edit and discards the user's latest change. Fix: version vectors to detect the conflict, causal/hybrid clocks, or route the document's writes through one leader.

[estimate] TrueTime's uncertainty ε is 4 ms. Roughly how long does Spanner's commit wait add, and how does that compare to the cross-region consensus round trip?
A: About 2ε = 8 ms (in practice it overlaps with the Paxos round trip, so often adds less). A cross-region Paxos round trip is tens of milliseconds, so commit wait is usually a small part of a global commit's latency.

[design] Three replicas of a shopping cart accept writes offline. How would you use vector clocks to avoid losing items?
A: Each cart version carries a vector clock [r1, r2, r3]. A write increments its replica's entry after merging what it has seen. On sync, if one version's vector dominates, keep it; if they're concurrent, keep both as siblings and merge (union of items, with removals tracked as tombstones or using a CRDT set) and write the merged cart with the element-wise max vector + 1.

--- pitfalls
- Correctness that depends on wall clocks agreeing across machines
- Last-writer-wins by timestamp for important data
- Assuming L(A) < L(B) means A caused B
- Forgetting that clocks can jump backwards
- Ignoring the growth of vector clocks with many writers

--- quiz
Q: A Lamport clock guarantees…
- If L(A) < L(B), A happened before B
- *If A happened before B, L(A) < L(B)
- Real-time order
- Detection of concurrency
W: It respects causality but can't detect concurrency.
Q: Two vector clocks [2,1,0] and [1,2,0] are…
- Equal
- The first happened before the second
- The second happened before the first
- *Concurrent
W: Neither is ≤ the other in every position.
Q: Spanner's commit wait waits until…
- All replicas reply
- *TrueTime's earliest bound has passed the commit timestamp
- The next second
- NTP resynchronises
W: Then the timestamp is definitely in the past for everyone.
Q: Hybrid logical clocks combine…
- GPS and atomic clocks
- *A physical timestamp with a logical counter
- Vector clocks and Lamport clocks
- Two NTP servers
W: Close to wall time, and causally consistent.

--- sources
- paper :: Time, Clocks, and the Ordering of Events in a Distributed System (CACM 1978) :: Leslie Lamport :: https://lamport.azurewebsites.net/pubs/time-clocks.pdf
- paper :: Spanner: Google's Globally-Distributed Database (TrueTime, commit wait) :: Corbett et al. :: https://research.google/pubs/spanner-googles-globally-distributed-database-2/
- paper :: Logical Physical Clocks (hybrid logical clocks, OPODIS 2014) :: Kulkarni et al. :: https://cse.buffalo.edu/tech-reports/2014-04.pdf
- article :: There is No Now :: Justin Sheehy (ACM Queue 2015) :: https://queue.acm.org/detail.cfm?id=2745385

=== distributed-locks
blurb: Making sure only one worker does something at a time across machines: leases instead of plain locks, why a paused process can still act after losing its lock, fencing tokens that make storage reject stale holders, and which lock services are safe for correctness.
signals: Only one worker should run a job or own a resource | Leader election for a background process | "Can I use Redis for locks?" | Duplicate processing after timeouts or GC pauses
widgets: seq-fencing
prereq: consensus-raft

--- lesson
:::words
- **Mutual exclusion**: only one participant may hold something (a lock, a role) at a time.
- **Lease**: a lock that expires automatically after a fixed time unless renewed.
- **Lock service**: a strongly consistent store used to grant locks and leases (ZooKeeper, etcd, Chubby).
- **Fencing token**: a number, increasing with every lock grant, that the protected resource checks so it can reject requests from an old holder.
- **Process pause**: a process freezing for seconds (garbage collection, VM suspension, swapping) without realising it.
:::

## The problem in plain words

Some work must be done by exactly one worker: only one instance should send the nightly invoice emails, only one should write to a shared file, only one should be the leader of a partition. On one machine, a mutex does this. Across machines, the obvious approach (a lock in a shared store) has a nasty failure mode: a worker grabs the lock, then **freezes** (a long garbage collection pause), its lock expires, another worker takes over, and then the first worker wakes up and carries on as if it still held the lock. Two workers act at once, and the lock didn't help.

:::eli5
A meeting room booked by sticky note with an expiry time. You book it until 3 pm, then fall asleep in the room. At 3 pm someone else books it and starts their meeting. At 3:10 you wake up and keep presenting, unaware your booking ended. Fix: every booking gets a ticket number, and the projector only accepts the highest ticket number it has seen, so your old ticket is refused.
:::

## Leases, not locks

A plain lock held by a crashed process would be held forever. So distributed locks are **leases**: valid for a fixed time (say 10 s) and renewed periodically by the holder. If the holder dies, the lease expires and someone else can acquire it.

The lock service itself must be **strongly consistent** and **fault-tolerant**, otherwise it can grant the same lease twice (for example after an asynchronous failover). That means a consensus-based system: ZooKeeper (ephemeral nodes plus sessions), etcd (leases), or Chubby at Google.

## The pause problem

Leases rely on time, and processes can't reliably know how much time has passed while they were paused. Sequence:

1. Worker A acquires the lease (valid 10 s).
2. A starts a long GC pause (15 s). It doesn't renew.
3. The lease expires; worker B acquires it and writes to the storage.
4. A wakes up, believes it still holds the lease (it checked just before pausing), and writes too, overwriting B's work.

Checking "do I still hold the lease?" right before writing doesn't fix it: the pause can happen between the check and the write.

## Fencing tokens

The lock service returns a **fencing token** with each grant: a number that increases every time the lock is granted (ZooKeeper's zxid or a node version; etcd's revision). The holder sends the token with every write to the protected resource, and **the resource rejects any write with a token lower than the highest it has seen**.

In the sequence above, A got token 33, B got 34. B's write with 34 is accepted; A's late write with 33 is rejected. Correctness no longer depends on timing.

Step through the pause, with and without fencing:

[[widget:seq-fencing]]

The catch: the resource must support checking tokens (a conditional write, a version check). If it can't (sending an email), make the action idempotent or accept the risk.

## Using Redis for locks?

A single Redis instance with `SET key value NX PX 30000` is a fine **efficiency** lock (avoid two workers doing the same expensive job usually), but not a **correctness** lock: failover with asynchronous replication can lose the lock, and it has no fencing token. Redlock (taking the lock on a majority of independent Redis nodes) is debated precisely because it still relies on timing assumptions; Martin Kleppmann's 2016 analysis argues it is unsafe without fencing.

Rule: **for efficiency** (avoid duplicate work), a simple lock is fine; **for correctness** (duplicates corrupt data), use a consensus-based lock service *and* fencing tokens, or design the operation to be idempotent.

## Alternatives to locks

- **Idempotent operations**: if doing the job twice is harmless, you don't need perfect mutual exclusion.
- **Conditional writes / compare-and-set** in the database: "update only if version = 7" fences naturally.
- **Partition the work** so each item has exactly one owner (a queue with consumer groups, a partition per worker) rather than locking globally.

## Interview angles

- "Only one instance should run this cron job." Lease from etcd/ZooKeeper, plus an idempotent job (or fencing on its writes).
- "Is a Redis lock safe?" For efficiency, yes; for correctness, no: failover can lose it, and pauses need fencing tokens.
- "What's a fencing token?" A monotonically increasing number from the lock service, checked by the storage to reject stale holders.

--- revise
### Leases
? Why leases instead of plain locks? :: A crashed holder's lease expires, so the lock isn't held forever.
? What must the lock service be? :: Strongly consistent and fault-tolerant (consensus-based: ZooKeeper, etcd, Chubby).

### The pause problem
? How can a lease holder act after losing its lease? :: It pauses (GC, VM) past expiry, wakes up and writes without knowing.
? Why doesn't "check, then write" fix it? :: The pause can happen between the check and the write.

### Fencing
? What is a fencing token? :: A number increasing with every lock grant, sent with each write; the resource rejects lower tokens than it has seen.
? Fencing's requirement? :: The resource must check tokens (conditional writes).
? Redis SET NX lock: efficiency or correctness? :: Efficiency only: failover can lose it and there's no fencing token.
? Alternatives to locks? :: Idempotent operations, compare-and-set writes, partitioning work so each item has one owner.

--- notes
## Leases
Lock with expiry, renewed by holder; crash → expiry → next holder.
Service must be consensus-based: ZooKeeper (ephemeral nodes/sessions), etcd leases, Chubby.
## Pause problem
GC/VM pauses exceed the lease; holder wakes and acts; check-then-act doesn't help.
## Fencing tokens
Monotonic number per grant (zxid / etcd revision).
Every protected write carries it; storage rejects lower than max seen.
Needs storage support; otherwise idempotency.
## Redis locks
SET NX PX on one node: efficiency only (async failover loses it, no token).
Redlock: debated; timing assumptions; unsafe without fencing (Kleppmann 2016).
## Alternatives
Idempotent jobs · compare-and-set · one owner per partition/queue.

--- doubts
Q: Can't the worker just check the time before each write to see whether its lease is still valid?
A: The check itself takes time to act on: a pause can happen right after the check and before the write reaches the storage, and network delays can deliver the write long after it was sent. Only the receiving side can make the final decision, which is what fencing tokens enable.

Q: Does Google's Chubby provide fencing?
A: Yes: Chubby gives lock holders a "sequencer" (lock name, mode and generation number) that they pass to servers, which can check it with Chubby or compare generations, rejecting stale holders. It's the same idea as fencing tokens.

Q: What lease duration should I choose?
A: Long enough that normal renewal hiccups (brief network delays) don't cause needless lease loss, short enough that failover after a crash is acceptably fast: often 10–30 s with renewal every third of that. The duration doesn't remove the need for fencing; it only tunes how fast you recover.

Q: Is leader election just a lock?
A: Essentially yes: the leader holds a lease on "leadership" and renews it. The same pause problem applies to leaders, which is why consensus protocols use terms (fencing by term number) and why systems built on leader leases still check terms on writes.

--- exercises
[break] A cron job runs on 3 instances; each tries a Redis lock (SET NX, 60 s expiry) before sending monthly invoices. One month, some customers got two invoices. Give two plausible causes.
A: (1) An instance paused or ran longer than 60 s; the lock expired; another instance took it and started sending while the first resumed. (2) The Redis primary failed over before replicating the lock key, so a second instance acquired it on the new primary. Fixes: make invoice sending idempotent (record "invoice for customer X, month M sent" with a unique constraint before sending), and use a consensus-based lease if exclusivity really matters.

[design] Two workers may process a file in object storage; only the latest lock holder's output must be kept. Design with fencing.
A: Workers acquire a lease from etcd, receiving the lease revision as a fencing token. They write output to the storage with a conditional write: the metadata stores the highest token seen, and a write succeeds only if its token ≥ that value (a compare-and-set on a version field or object generation). A paused worker with an old token is rejected.

[choose] Leader election for a stateless "metrics roll-up" worker that's harmless if two run briefly. Consensus lease with fencing, or a simple Redis lock?
A: A simple Redis lock (or even letting a scheduler run one instance) is fine: duplicates only waste work and the roll-up is idempotent. Fencing and consensus are worth their complexity when duplicates corrupt data or cost money.

--- pitfalls
- Correctness-critical locks on a single Redis node or with async failover
- Assuming a lease holder knows when it lost the lease
- Locks without expiry (stuck forever after a crash)
- Protected resources that don't check fencing tokens
- Using a lock where idempotency or partitioned ownership would be simpler

--- quiz
Q: Why can a worker act after its lease expired?
- Leases don't expire
- *It paused (e.g. GC) past the expiry and resumed without knowing
- The lock service granted two leases
- Clocks are perfectly synchronised
W: Processes can't observe their own pauses.
Q: A fencing token protects the resource because…
- It encrypts writes
- *The resource rejects writes carrying a token lower than one it has already seen
- It renews the lease
- It makes the worker faster
W: Stale holders always have smaller tokens.
Q: A single-node Redis SET NX lock is suitable for…
- Correctness-critical mutual exclusion
- *Avoiding duplicate work as an efficiency measure
- Financial transactions
- Leader election in consensus
W: Failover and pauses can break it.
Q: Which lock service is appropriate for correctness?
- A cache
- *A consensus-based service like etcd or ZooKeeper
- DNS
- A load balancer
W: It must never grant the same lock twice.

--- sources
- article :: How to do distributed locking :: Martin Kleppmann :: https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html
- paper :: The Chubby Lock Service for Loosely-Coupled Distributed Systems (OSDI 2006) :: Mike Burrows (Google) :: https://research.google/pubs/the-chubby-lock-service-for-loosely-coupled-distributed-systems/
- article :: ZooKeeper recipes: locks and leader election :: Apache ZooKeeper :: https://zookeeper.apache.org/doc/current/recipes.html
- article :: etcd: leases and concurrency API :: etcd Authors :: https://etcd.io/docs/v3.5/learning/api/
