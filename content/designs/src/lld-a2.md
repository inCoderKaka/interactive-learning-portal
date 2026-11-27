=== d-lld-pub-sub
--- words
- **Publisher**: code that sends messages to a topic. **Subscriber**: code that receives messages from a topic.
- **Topic**: a named channel messages are published to.
- **Offset**: a subscriber's position in a topic's message log, so it can resume where it left off.
- **Delivery guarantee**: at-most-once (may lose), at-least-once (may duplicate), exactly-once (hard).
- **Backpressure**: slowing or bounding producers when consumers fall behind.
--- flow
1. **0–5**: clarify: in-process broker (not Kafka itself), topics, multiple subscribers per topic, push vs pull, ordering, delivery guarantee, retention, slow consumers.
2. **5–12**: classes: Broker, Topic (append-only log), Subscription (offset, handler), Message, Dispatcher threads.
3. **12–30**: code publish (append + signal), subscriber loop reading from its offset, acknowledgement.
4. **30–45**: slow consumers, ordering per key, retries and dead letters, concurrency, tests.
--- req
**Use cases**: create topics; publish a message; subscribe a handler to a topic (several subscribers each get every message); unsubscribe; replay from an offset; see lag per subscriber.

**Guarantees to choose**: per-topic ordering for each subscriber; at-least-once delivery (handler acknowledges after processing); bounded retention (by count or time).
--- model
- `Broker`: `createTopic`, `publish(topic, msg)`, `subscribe(topic, handler, startOffset)`.
- `Topic`: append-only list (or ring buffer) of `Message(offset, key, payload, timestamp)`, guarded by a lock with a condition `newData`.
- `Subscription`: topic, handler, committed offset, a worker (thread or virtual thread) pulling messages.
- `RetryPolicy`, `DeadLetterTopic` for failed messages.
--- patterns
- **Observer / pub-sub** at the API level; internally a **producer–consumer** log per topic.
- **Strategy** for delivery (push to handler vs pull API) and retry policies.
- **Iterator**-like cursor per subscription over the log.
--- code
```java
final class Topic {
  private final List<Message> log = new ArrayList<>();
  private final ReentrantLock lock = new ReentrantLock(); private final Condition newData = lock.newCondition();

  long append(byte[] payload, String key) {
    lock.lock();
    try { long off = log.size(); log.add(new Message(off, key, payload)); newData.signalAll(); return off; }
    finally { lock.unlock(); }
  }
  List<Message> read(long from, int max, Duration wait) throws InterruptedException {
    lock.lock();
    try {
      long nanos = wait.toNanos();
      while (from >= log.size() && nanos > 0) nanos = newData.awaitNanos(nanos);   // long-poll
      return List.copyOf(log.subList((int) from, (int) Math.min(log.size(), from + max)));
    } finally { lock.unlock(); }
  }
}

final class Subscription implements Runnable {
  private volatile long offset;                                    // next offset to read
  public void run() {
    while (!stopped) {
      for (Message m : topic.read(offset, 100, Duration.ofSeconds(1))) {
        deliverWithRetry(m);                                       // at-least-once: commit after handling
        offset = m.offset() + 1;
      }
    }
  }
}
```
--- ext
**Slow consumers**: each subscription reads at its own pace from the shared log, so a slow one doesn't block others; retention bounds memory (a slow subscriber falling behind retention loses messages: report lag and alert).

**Ordering**: one worker per subscription preserves order; parallelism within a subscription by partitioning on key (per-key order preserved).

**Failures**: retries with backoff, then a dead-letter topic; handlers must be idempotent (at-least-once).

**Tests**: two subscribers both receive every message in order; a failing handler retries then lands in DLQ; unsubscribe stops delivery; replay from offset 0.
--- variants
Q: Consumer groups: several workers share one subscription.
A: Partition the topic; assign partitions to group members; each partition consumed by one member at a time.
Q: Persist messages across restarts.
A: Append to a segment file per topic with an index; subscriptions persist committed offsets.
Q: Filtered subscriptions (only messages with key X).
A: A predicate per subscription applied on read; or topic partitioning by key.
--- steer
Q: Slow subscriber.
A: Independent offsets over a shared log; bounded retention; lag metrics.
Q: Exactly-once?
A: At-least-once + idempotent handlers (dedup by message id) is the practical answer.
Q: Ordering with parallel handling.
A: Partition by key; one worker per partition.
--- pitfalls
- Pushing to all subscribers synchronously from publish (one slow subscriber blocks publishers)
- Unbounded per-subscriber queues
- Committing the offset before processing (silent loss)
- Busy-polling for new messages
--- level
- **L4**: topics, subscribe, publish fan-out with a queue per subscriber.
- **L5**: log + offsets design, long-polling with conditions, at-least-once with retries/DLQ, ordering vs parallelism by key, bounded retention.
- **L6**: consumer groups and rebalancing, persistence, exactly-once discussion.
--- prereqs
observer-pattern, condition-variables, producer-consumer, thread-pools
--- paths
- [deep] How does a message reach every subscriber? :: Append-only log per topic; each subscription has an offset and a worker reading from it.
  - Subscribers should wait efficiently for new messages :: Condition with timed await (long-poll); no busy polling.
- [failure] One subscriber is very slow :: Independent offsets; bounded retention; lag metrics; it can't block publishers or others.
- [failure] A handler throws :: Retry with backoff; dead-letter topic; idempotent handlers; commit after success.
- [variation] Many workers share one subscription :: Partitions by key; consumer group assignment; per-partition order.
- [deep] Guarantee ordering :: One worker per subscription or per key partition; explain the parallelism trade-off.

=== d-lld-board-game
--- words
- **Board**: the grid of cells; **piece**: an object on a cell (X/O, or chess pieces with movement rules).
- **Move validation**: checking that a move follows the rules before applying it.
- **Win condition**: the rule that ends the game (three in a row, checkmate).
- **Template method / strategy**: shared turn loop with game-specific rules plugged in.
--- flow
1. **0–5**: clarify: tic-tac-toe first, extensible to N×N and to chess; two humans, or human vs computer; undo; history.
2. **5–12**: classes: Game, Board, Cell/Position, Player, Piece, Move, RuleSet/WinChecker, GameState.
3. **12–30**: code tic-tac-toe with an O(1) win check; the turn loop.
4. **30–45**: generalise to chess (piece movement as polymorphism), undo via commands, AI player strategy.
--- req
**Use cases**: start a game with two players; make a move; reject invalid moves; detect win or draw; show the board; undo the last move; replay history.

**Rules**: players alternate; a move must be to a valid empty cell (tic-tac-toe) or follow piece rules (chess); the game ends on win/draw and rejects further moves.
--- model
- `Game`: board, players, current turn, `GameStatus` (IN_PROGRESS, WON, DRAW), move history.
- `Board`: N×N cells; `Position(row, col)` value object.
- `Player`: name, symbol/colour, `MoveSource` strategy (human input, AI).
- `Move` (record): player, from/to positions.
- Tic-tac-toe `WinChecker` with row/column/diagonal counters; chess `Piece` subclasses (`King`, `Queen`, ...) each with `legalMoves(board, from)`.
--- patterns
- **Template method** for the turn loop (or a Game class taking a `Rules` strategy).
- **Polymorphism** for chess piece movement (sealed interface of pieces).
- **Strategy** for players (human, random AI, minimax AI).
- **Command** for moves (undo/redo, replay); **factory** to set up the initial board.
- **State** for game status.
--- code
```java
final class TicTacToe {
  private final int n; private final char[][] cells;
  private final int[] rows, cols; private int diag, anti, moves;     // +1 for X, −1 for O
  private GameStatus status = GameStatus.IN_PROGRESS; private char turn = 'X';

  GameStatus play(int r, int c) {
    if (status != GameStatus.IN_PROGRESS) throw new IllegalStateException("game over");
    if (r < 0 || c < 0 || r >= n || c >= n || cells[r][c] != 0) throw new InvalidMove(r, c);
    cells[r][c] = turn; moves++;
    int d = turn == 'X' ? 1 : -1;
    rows[r] += d; cols[c] += d; if (r == c) diag += d; if (r + c == n - 1) anti += d;
    if (Math.abs(rows[r]) == n || Math.abs(cols[c]) == n || Math.abs(diag) == n || Math.abs(anti) == n)
      status = turn == 'X' ? GameStatus.X_WON : GameStatus.O_WON;     // O(1) win check
    else if (moves == n * n) status = GameStatus.DRAW;
    turn = turn == 'X' ? 'O' : 'X';
    return status;
  }
}

sealed interface Piece permits King, Queen, Rook, Bishop, Knight, Pawn {
  Colour colour();
  Set<Position> pseudoLegalMoves(Board b, Position from);          // then filter moves leaving own king in check
}
```
--- ext
**Chess specifics**: legal moves = pseudo-legal minus moves leaving your king in check; special moves (castling, en passant, promotion) need history (has the king moved?); checkmate = in check with no legal moves; stalemate = not in check with no legal moves.

**Undo**: `MoveCommand` stores captured piece and special-move state; the history stack enables undo/redo and replay.

**AI**: a `MoveSource` strategy: random, greedy, minimax with alpha-beta for tic-tac-toe.

**Tests**: wins on each row/column/diagonal; invalid moves rejected; draw detection; chess: knight moves from a corner, castling rights after a king move.
--- variants
Q: N×N board, K in a row to win (Gomoku).
A: Counters no longer suffice; after each move scan the 4 directions from the placed cell counting consecutive pieces: O(K) per move.
Q: Online multiplayer.
A: Game state on a server; moves validated server-side; turn enforcement and timeouts; HLD for matchmaking.
Q: Add a computer opponent.
A: MoveSource strategy with minimax (+ alpha-beta) for small games; heuristics for chess.
--- steer
Q: Check for a win efficiently.
A: Row/col/diagonal counters for tic-tac-toe: O(1) per move.
Q: Extend to chess.
A: Polymorphic pieces, pseudo-legal moves filtered by check, special moves with history.
Q: Undo.
A: Moves as commands storing what they captured.
--- pitfalls
- Re-scanning the whole board after every move
- A giant switch on piece type for chess movement
- Letting moves continue after the game has ended
- Board logic mixed with console input/output
--- level
- **L4**: working tic-tac-toe with validation and win check.
- **L5**: O(1) win check, extensible design (rules/pieces as polymorphism), commands for undo, player strategies, clean separation from I/O.
- **L6**: chess legality including check/special moves, AI with search, networked play considerations.
--- prereqs
class-diagrams, encapsulation, inheritance-composition, polymorphism, lsp-isp
--- paths
- [deep] Detect a win after each move :: Row/column/diagonal counters; O(1); draw when the board is full.
  - Make it N×N with K in a row :: Directional scan from the last move; O(K).
- [variation] Extend the engine to chess :: Sealed Piece hierarchy with movement rules; legal = pseudo-legal minus self-check.
  - Castling and en passant :: Move history and flags; special Move types.
- [deep] Support undo and replay :: Move commands with captured state; history stack.
- [variation] Add a computer player :: MoveSource strategy; minimax with alpha-beta.
- [failure] A player moves out of turn or after game over :: State checks; explicit exceptions; tests.

=== d-lld-text-editor
--- words
- **Buffer**: the in-memory text being edited.
- **Cursor**: the current position for inserts and deletes.
- **Gap buffer / rope / piece table**: data structures that make inserting in the middle of large text cheap.
- **Command**: an edit as an object with execute and undo.
--- flow
1. **0–5**: clarify: operations (insert, delete, move cursor, select, copy/paste, find/replace), undo/redo depth, file sizes, multi-cursor?
2. **5–12**: classes: Editor, TextBuffer (interface), Cursor, Selection, Command (Insert, Delete, Replace), History, Clipboard.
3. **12–30**: code commands, two-stack history, typing-burst merging, a simple buffer.
4. **30–45**: data structures for big files, find/replace performance, collaborative editing as a variant.
--- req
**Use cases**: insert text at the cursor; delete (backspace, selection); move the cursor; select; copy, cut, paste; undo and redo many steps; find and replace.

**Non-functional**: edits feel instant even in large files (MBs); undo memory bounded; consistent cursor after undo.
--- model
- `Editor`: `TextBuffer`, `Cursor`, `Selection`, `History`, `Clipboard`.
- `TextBuffer` interface: `insert(pos, text)`, `delete(pos, len)`, `substring`, `length`; implementations `StringBuilderBuffer`, `GapBuffer`, `PieceTable`.
- `Command`: `execute(editor)`, `undo(editor)`, `mergeWith(next)`; `InsertText`, `DeleteText`, `ReplaceAll`.
- `History`: undo and redo stacks, size limit.
--- patterns
- **Command** + **memento** (cursor/selection snapshot) for undo/redo.
- **Strategy** for the buffer implementation (swap gap buffer for a piece table).
- **Observer** for views (re-render on change).
- **Composite** command for find-and-replace-all as one undo step.
--- code
```java
final class InsertText implements Command {
  private final int pos; private String text; private Cursor before;
  public void execute(Editor e) { before = e.cursor().snapshot(); e.buffer().insert(pos, text); e.cursor().moveTo(pos + text.length()); }
  public void undo(Editor e) { e.buffer().delete(pos, text.length()); e.cursor().restore(before); }
  public boolean mergeWith(Command next) {                       // one undo step for a typing burst
    if (next instanceof InsertText n && n.pos == pos + text.length() && !n.text.contains(" ")) { text += n.text; return true; }
    return false;
  }
}

final class History {
  private final Deque<Command> undo = new ArrayDeque<>(), redo = new ArrayDeque<>();
  void run(Editor e, Command c) {
    c.execute(e);
    if (!undo.isEmpty() && undo.peek().mergeWith(c)) { /* merged */ } else undo.push(c);
    redo.clear();
    while (undo.size() > 1_000) undo.removeLast();
  }
  void undo(Editor e) { if (!undo.isEmpty()) { Command c = undo.pop(); c.undo(e); redo.push(c); } }
  void redo(Editor e) { if (!redo.isEmpty()) { Command c = redo.pop(); c.execute(e); undo.push(c); } }
}
```
--- ext
**Big files**: a `StringBuilder` makes middle inserts O(n); a **gap buffer** makes edits near the cursor O(1) amortised (Emacs); a **piece table** (original + add buffer + list of pieces) makes edits O(pieces) and undo cheap (VS Code); a **rope** (balanced tree of strings) gives O(log n) everywhere.

**Find/replace**: KMP/Boyer-Moore or regex over the buffer; replace-all as one composite command.

**Collaboration**: edits from several users need operational transformation or CRDTs so concurrent edits converge (HLD collaborative editor).

**Tests**: undo/redo sequences restore text and cursor; new edit clears redo; merging bursts; buffer implementations pass the same contract tests.
--- variants
Q: Multiple cursors.
A: A list of cursors; each command applies at every cursor in reverse position order so offsets stay valid; one undo step.
Q: Open a 2 GB log file.
A: Piece table over a memory-mapped original file; only edits live in memory; lazy line indexing.
Q: Two users editing the same document.
A: OT or CRDT; undo must only revert your own operations, transformed against others'.
--- steer
Q: Undo and redo.
A: Command objects + two stacks; clear redo on new edits; merge typing bursts.
Q: Inserting in the middle of a huge file is slow.
A: Gap buffer, rope or piece table behind a TextBuffer interface.
Q: Restore the cursor on undo.
A: Commands snapshot cursor/selection (memento).
--- pitfalls
- Storing a full copy of the text for every undo step
- Not clearing redo after a new edit
- Undo that restores text but not the cursor or selection
- String concatenation on every keystroke in large documents
--- level
- **L4**: insert/delete with undo/redo via commands.
- **L5**: two-stack history with merging and limits, cursor mementos, buffer strategy with complexity discussion, composite commands.
- **L6**: piece tables/ropes, multi-cursor, collaborative editing implications for undo.
--- prereqs
ood-core-code, encapsulation, strategy-template, command-memento
--- paths
- [deep] Implement undo and redo :: Commands with execute/undo; two stacks; clear redo on new action; bounded history.
  - Typing "hello" should undo in one step :: Merge adjacent inserts within a burst.
- [deep] Make edits fast in a 100 MB file :: Gap buffer, rope or piece table behind an interface; complexity trade-offs.
- [variation] Multiple cursors :: Apply in reverse position order; one composite command.
- [variation] Two people edit the same document :: OT/CRDT; per-user undo transformed against others' edits.
- [failure] Undo leaves the cursor in the wrong place :: Snapshot cursor and selection in commands.

=== d-lld-kv-transactions
--- words
- **Key-value store**: a map from keys to values with get, set and delete.
- **Transaction**: a group of operations that either all take effect (commit) or none do (rollback).
- **Nested transactions**: BEGIN inside BEGIN; inner rollback undoes only inner changes.
- **Undo log**: the record of previous values used to roll back.
--- flow
1. **0–5**: clarify: commands (SET, GET, DELETE, COUNT value, BEGIN, ROLLBACK, COMMIT), nesting, concurrency (single client or many), persistence.
2. **5–12**: classes: KvStore, Transaction (layer), Command parser, ValueIndex for COUNT.
3. **12–30**: code with a stack of transaction layers (overlay or undo log), O(1) COUNT.
4. **30–45**: concurrency and isolation, persistence (WAL), memory.
--- req
**Use cases**: SET k v; GET k (NULL if missing); DELETE k; COUNT v (number of keys with value v); BEGIN; ROLLBACK (undo the innermost open transaction, error if none); COMMIT (make all open transactions permanent).

**Non-functional**: O(1) for each operation (amortised), including COUNT; rollback cost proportional to changes in that transaction.
--- model
- `KvStore`: `Map<String, String> data`, `Map<String, Integer> valueCounts`, `Deque<Map<String, Optional<String>>> undoLogs` (one per open transaction: original values of keys first touched in it).
- `CommandParser` turning input lines into calls (keeps the core free of I/O).
--- patterns
- **Command / memento**: an undo log of previous values per transaction layer.
- **Facade** over the store; **interpreter**-style parsing of text commands.
--- code
```java
final class KvStore {
  private final Map<String, String> data = new HashMap<>();
  private final Map<String, Integer> counts = new HashMap<>();
  private final Deque<Map<String, Optional<String>>> tx = new ArrayDeque<>();

  void set(String k, String v) { remember(k); write(k, v); }
  void delete(String k) { remember(k); write(k, null); }
  Optional<String> get(String k) { return Optional.ofNullable(data.get(k)); }
  int count(String v) { return counts.getOrDefault(v, 0); }

  void begin() { tx.push(new HashMap<>()); }
  void rollback() {
    if (tx.isEmpty()) throw new IllegalStateException("NO TRANSACTION");
    tx.pop().forEach((k, old) -> write(k, old.orElse(null)));     // restore originals of this layer
  }
  void commit() { if (tx.isEmpty()) throw new IllegalStateException("NO TRANSACTION"); tx.clear(); }

  private void remember(String k) { if (!tx.isEmpty()) tx.peek().putIfAbsent(k, Optional.ofNullable(data.get(k))); }
  private void write(String k, String v) {
    String old = v == null ? data.remove(k) : data.put(k, v);
    if (old != null) counts.merge(old, -1, (a, b) -> a + b == 0 ? null : a + b);
    if (v != null) counts.merge(v, 1, Integer::sum);
  }
}
```
--- ext
**Why an undo log**: writes go straight to `data` (reads stay O(1)); each layer remembers only the **first** previous value of each key it touched, so rollback restores exactly that layer. Commit just drops the logs.

**Alternative**: overlay layers (each transaction holds its own changes; reads check layers top-down): commit merges layers; reads cost O(depth).

**Concurrency / isolation**: with many clients, one global lock gives serialisable behaviour; better: per-key locks (2PL) or MVCC (versions with transaction ids), connecting to the HLD transactions chapter.

**Persistence**: append each committed change to a write-ahead log; replay on start; snapshot periodically.

**Tests**: nested BEGIN/ROLLBACK restores the right values; COUNT updates through rollbacks; ROLLBACK without BEGIN errors; COMMIT closes all.
--- variants
Q: Many clients with isolated transactions.
A: Per-transaction write sets with optimistic validation at commit (or locks); MVCC for snapshot reads.
Q: Survive restarts.
A: WAL of committed operations plus periodic snapshots; recovery replays the log.
Q: TTL per key.
A: Expiry timestamps, lazy check on read, periodic sweep (DelayQueue).
--- steer
Q: How does ROLLBACK know what to undo?
A: Per-layer undo log of first-touched keys' original values.
Q: COUNT in O(1).
A: Maintain value → count map on every write.
Q: Multiple clients.
A: Global lock, then per-key locks or MVCC.
--- pitfalls
- Copying the whole map on BEGIN
- Undo logs that store every write instead of the first original value per key
- Forgetting to update COUNT on rollback
- Treating COMMIT as committing only the innermost layer
--- level
- **L4**: set/get/delete with BEGIN/ROLLBACK/COMMIT working for nesting.
- **L5**: O(1) operations including COUNT, undo-log vs overlay trade-off, clean parser separation, isolation discussion.
- **L6**: MVCC/locking for concurrent clients, WAL and recovery.
--- prereqs
ood-core-code, command-memento, library-api
--- paths
- [deep] Implement nested transactions :: Stack of undo logs storing first original value per key; rollback restores; commit clears.
  - Compare with overlay layers :: Reads O(depth) vs O(1); commit cost; memory.
- [deep] COUNT value in O(1) :: Value → count map updated by every write, including rollback writes.
- [variation] Many concurrent clients :: Global lock → per-key locks (2PL) or MVCC with version chains.
- [variation] Survive a crash :: WAL of committed changes; replay; snapshots.
- [failure] ROLLBACK with no open transaction :: Explicit error; state unchanged.

=== d-lld-meeting-scheduler
--- words
- **Interval**: a time range [start, end), half-open so back-to-back meetings don't overlap.
- **Room**: a bookable meeting room with a capacity and features.
- **Conflict**: two bookings of the same room (or person) with overlapping intervals.
- **Interval tree / sorted map**: structures that find overlaps quickly.
--- flow
1. **0–5**: clarify: rooms with capacity, book a room for a slot, find free rooms, invite attendees and check their availability, recurring meetings, cancellation, time zones, concurrency.
2. **5–12**: classes: Scheduler, Room, Meeting, Interval, Calendar per room/person, RoomSelectionStrategy, Notifier.
3. **12–30**: code conflict-free booking with a sorted map per room; find-a-room.
4. **30–45**: concurrent bookings, recurring meetings, attendee availability, notifications.
--- req
**Use cases**: book a room for an interval with attendees; find available rooms for an interval and capacity; cancel; list a room's or person's schedule; recurring meetings; notify attendees.

**Rules**: no overlapping bookings per room; capacity ≥ attendees; intervals half-open; stored in UTC, shown in local time.
--- model
- `Interval(Instant start, Instant end)` record: `overlaps(other)` = start < other.end && other.start < end.
- `Room(id, capacity, features)`, `Meeting(id, organiser, attendees, Interval, roomId, recurrence?)`.
- `RoomCalendar`: `TreeMap<Instant, Meeting>` keyed by start; `isFree(interval)` checks floor/ceiling neighbours.
- `Scheduler` (facade), `RoomSelectionStrategy` (smallest room that fits, nearest to organiser), `Notifier`.
--- patterns
- **Strategy** for room selection; **observer** for notifications; **facade** for the scheduler API.
- **Value objects** for intervals and recurrence rules.
--- code
```java
final class RoomCalendar {
  private final TreeMap<Instant, Meeting> byStart = new TreeMap<>();
  synchronized boolean tryBook(Meeting m) {
    Interval i = m.interval();
    var before = byStart.floorEntry(i.start());                    // latest meeting starting at or before
    if (before != null && before.getValue().interval().overlaps(i)) return false;
    var after = byStart.ceilingEntry(i.start());                   // earliest starting at or after
    if (after != null && after.getValue().interval().overlaps(i)) return false;
    byStart.put(i.start(), m);
    return true;                                                   // check and insert under one lock
  }
}

final class Scheduler {
  Optional<Meeting> book(Request r) {
    List<Room> candidates = selection.rank(rooms.withCapacity(r.attendees().size()), r);
    for (Room room : candidates) {
      Meeting m = new Meeting(ids.next(), r.organiser(), r.attendees(), r.interval(), room.id());
      if (calendars.get(room.id()).tryBook(m)) { notifier.invited(m); return Optional.of(m); }
    }
    return Optional.empty();
  }
}
```
--- ext
**Concurrency**: two people booking the same room for overlapping slots: the check and insert must be atomic per room (synchronized calendar or a lock per room); booking a room plus several attendees' calendars needs ordered locks or optimistic retries.

**Recurring meetings**: store the rule (RRULE-like) and expand occurrences within a horizon; conflicts checked per occurrence; exceptions for edited instances.

**Attendee availability**: per-person calendars; find common free slots by merging busy intervals (sweep line).

**Tests**: back-to-back bookings allowed; overlaps rejected; concurrent bookings of the same slot → one success; find-free-slot across attendees.
--- variants
Q: Find the earliest 30-minute slot when all 5 attendees and a room are free.
A: Merge all busy intervals (sorted sweep), scan gaps ≥ 30 min, check room calendars for each gap.
Q: Weekly recurring meeting with exceptions.
A: Recurrence rule + exception set; expand lazily; book each occurrence.
Q: Rooms in several time zones.
A: Store UTC instants; convert for display; recurrence rules in the organiser's zone (DST-aware).
--- steer
Q: Detect conflicts efficiently.
A: Sorted map per room; check floor and ceiling neighbours; O(log n).
Q: Two simultaneous bookings.
A: Atomic check-and-insert per room calendar.
Q: Common free time.
A: Merge busy intervals with a sweep.
--- pitfalls
- Closed intervals that make back-to-back meetings conflict
- Scanning every meeting to check conflicts
- Checking availability and booking in separate unsynchronised steps
- Storing local times without zones
--- level
- **L4**: rooms, meetings, overlap check, booking.
- **L5**: O(log n) conflict detection, atomic booking under concurrency, selection strategy, common-free-slot algorithm.
- **L6**: recurrence with exceptions, time zones/DST, scaling to an organisation-wide calendar service.
--- prereqs
ood-requirements, strategy-template, modelling-data, locks
--- paths
- [deep] Detect booking conflicts quickly :: Half-open intervals; TreeMap per room; floor/ceiling checks.
- [failure] Two users book the same room slot at the same time :: Atomic check-and-insert per room (lock or synchronized calendar).
  - Booking also reserves attendees' calendars :: Ordered locking across calendars or optimistic retry.
- [deep] Find the earliest slot for 5 people and a room :: Merge busy intervals; scan gaps; check rooms.
- [variation] Recurring meetings with exceptions :: Recurrence rules, lazy expansion, per-occurrence conflicts.
- [variation] Offices in several time zones :: UTC storage; zone-aware recurrence; DST edge cases.

=== d-lld-task-scheduler-lld
--- words
- **Task**: a unit of work to run once at a time or repeatedly.
- **Fixed rate / fixed delay**: repeat on a steady cadence / with a gap after each run.
- **Dispatcher**: the thread that waits for the next due task and hands it to workers.
- **Worker pool**: threads that actually run tasks.
--- flow
1. **0–5**: clarify: one-off and recurring tasks, cancellation, number of workers, precision, persistence across restarts, what happens if a task overruns or fails.
2. **5–12**: API: `schedule(task, at)`, `scheduleAtFixedRate`, `scheduleWithFixedDelay`, `cancel(handle)`, `shutdown()`; classes Scheduler, ScheduledTask, TaskHandle, Clock.
3. **12–30**: code the dispatcher loop with a priority queue and a condition, early wake-up, worker hand-off.
4. **30–45**: cancellation, failures, overruns, shutdown, millions of timers (timing wheel), tests with a fake clock.
--- req
**Use cases**: run a task once at a time; run periodically (rate or delay); cancel; shut down gracefully (finish running tasks, optionally drop pending); query pending tasks.

**Non-functional**: fire within a few ms of due time; a slow task must not delay others; bounded workers; testable without real time.
--- model
- `ScheduledTask`: id, `Runnable`, `nextRunNanos`, period, `Mode` (ONCE, FIXED_RATE, FIXED_DELAY), `volatile cancelled`.
- `TaskScheduler`: `PriorityQueue<ScheduledTask>` by next run, `ReentrantLock` + `Condition changed`, one dispatcher thread, an `ExecutorService` of workers, a `Clock`/nanos supplier.
- `TaskHandle`: `cancel()`, `isDone()`.
--- patterns
- **Producer–consumer** (dispatcher → worker pool); **command** (tasks as objects).
- **Strategy** for repeat modes and for the queue (heap vs timing wheel).
- **State** for task lifecycle (scheduled, running, done, cancelled).
--- code
```java
final class TaskScheduler {
  private final PriorityQueue<ScheduledTask> q = new PriorityQueue<>(Comparator.comparingLong(t -> t.next));
  private final ReentrantLock lock = new ReentrantLock(); private final Condition changed = lock.newCondition();

  TaskHandle schedule(ScheduledTask t) {
    lock.lock();
    try { q.add(t); if (q.peek() == t) changed.signal(); return t; }   // wake dispatcher if now earliest
    finally { lock.unlock(); }
  }

  private void dispatchLoop() throws InterruptedException {
    lock.lock();
    try {
      while (!shutdown) {
        ScheduledTask head = q.peek();
        if (head == null) { changed.await(); continue; }
        long wait = head.next - nanos.getAsLong();
        if (wait > 0) { changed.awaitNanos(wait); continue; }          // re-check: an earlier task may have arrived
        q.poll();
        if (head.cancelled) continue;
        workers.execute(() -> runSafely(head));
        if (head.mode == Mode.FIXED_RATE) { head.next += head.period; q.add(head); }
      }
    } finally { lock.unlock(); }
  }

  private void runSafely(ScheduledTask t) {
    try { t.task.run(); } catch (RuntimeException e) { log.warn("task {} failed", t.id, e); }
    if (t.mode == Mode.FIXED_DELAY && !t.cancelled) { t.next = nanos.getAsLong() + t.period; schedule(t); }
  }
}
```
--- ext
**Overruns**: fixed-rate tasks that take longer than their period: skip missed runs or run them back to back (choose and state); prevent the same task running twice concurrently (a running flag).

**Failures**: catch per run; policy for repeated failures (back off, disable, alert).

**Scale**: millions of timers → hashed timing wheel; persistence and multiple machines → the HLD distributed job scheduler (leases, at-least-once, idempotent tasks).

**Shutdown**: stop dispatcher, `workers.shutdown()`, `awaitTermination`, then `shutdownNow`.

**Tests**: fake nanos clock advanced manually; order of firing; cancel before due; fixed delay vs rate timing; a throwing task doesn't stop others.
--- variants
Q: Cron expressions ("every weekday at 09:00 IST").
A: Compute the next fire time from wall-clock time in the zone after each run; DST-aware library.
Q: Survive restarts.
A: Persist tasks (next run time) in a store; reload on start; mark runs to avoid duplicates.
Q: Priorities when many tasks are due at once.
A: Secondary ordering by priority; separate worker pools per priority.
--- steer
Q: How does the dispatcher know when to wake?
A: Timed wait until the earliest deadline; signalled when an earlier task is inserted.
Q: A task throws.
A: Catch per run; recurring tasks continue (unlike ScheduledExecutor's default).
Q: Millions of short timeouts.
A: Timing wheel.
--- pitfalls
- A thread per task sleeping until its time
- Running tasks on the dispatcher thread
- No early wake-up when a sooner task arrives
- Wall-clock time for delays
- Letting one failing recurring task die silently
--- level
- **L4**: priority queue + sleeping loop, running tasks.
- **L5**: condition-based dispatcher with early wake-up, worker hand-off, fixed rate vs delay semantics, cancellation, failure isolation, fake-clock tests.
- **L6**: timing wheels, persistence and distribution, overrun policies, priorities.
--- prereqs
condition-variables, thread-pools, timers-scheduling
--- paths
- [deep] How does the dispatcher wake at the right time? :: Heap by next run; timed await; signal on earlier inserts.
  - A task is scheduled for 1 ms from now while the dispatcher sleeps for an hour :: Signal on insert when it becomes the head.
- [deep] Fixed rate vs fixed delay :: Next = previous scheduled + period vs completion + delay; overrun policy.
- [failure] A task throws or hangs :: Catch per run; timeouts; workers isolate slow tasks; alerting.
- [variation] Millions of timers :: Hashed timing wheel; O(1) add/cancel; tick precision.
- [variation] Tasks must survive restarts and run on one of many machines :: Persistence, leases, idempotent tasks (HLD scheduler).

=== d-lld-resilient-client
--- words
- **Timeout**: the longest you'll wait for a call before giving up.
- **Retry with backoff**: trying again after increasing delays; **jitter** adds randomness so clients don't retry in sync.
- **Circuit breaker**: stops calling a failing dependency for a while (open), then tests it (half-open), then resumes (closed).
- **Bulkhead**: a limit on concurrent calls to one dependency so it can't exhaust all threads.
- **Idempotent**: safe to repeat.
--- flow
1. **0–5**: clarify: which failures (timeouts, 5xx, connection errors), sync or async API, configuration per dependency, metrics, which calls are idempotent.
2. **5–12**: API: `ResilientClient.call(Callable<T>)` configured by a builder; components: TimeoutPolicy, RetryPolicy, CircuitBreaker, Bulkhead, Fallback.
3. **12–30**: code the circuit breaker state machine and the retry loop; compose as decorators.
4. **30–45**: ordering of decorators, async version, metrics, tests with fake clocks.
--- req
**Use cases**: wrap any remote call with a timeout, limited retries with exponential backoff and jitter (only for retryable errors and idempotent calls), a circuit breaker per dependency, a concurrency limit, and an optional fallback value.

**Non-functional**: thread-safe; low overhead; observable (state changes, retries, rejections); configurable per dependency.
--- model
- `ResilientClient<T>` built with a builder of policies.
- `CircuitBreaker`: states CLOSED, OPEN, HALF_OPEN; failure counting over a sliding window; open duration; trial calls.
- `RetryPolicy(maxAttempts, Backoff, retryOn predicate)`, `Backoff` strategy (fixed, exponential, decorrelated jitter).
- `Bulkhead(Semaphore)`, `TimeLimiter`, `Fallback<T>`, `ResilienceListener` (metrics).
--- patterns
- **Decorator / chain**: each policy wraps the next call (bulkhead → breaker → retry → timeout → call), order matters.
- **State** for the circuit breaker; **strategy** for backoff and failure classification; **builder** for configuration; **observer** for metrics.
--- code
```java
final class CircuitBreaker {
  enum State { CLOSED, OPEN, HALF_OPEN }
  private final AtomicReference<State> state = new AtomicReference<>(State.CLOSED);
  private volatile long openedAt; private final SlidingWindow window;   // recent outcomes

  <T> T call(Callable<T> c) throws Exception {
    if (state.get() == State.OPEN) {
      if (clock.millis() - openedAt < openMillis) throw new CallNotPermitted();
      state.compareAndSet(State.OPEN, State.HALF_OPEN);              // one thread wins the trial
    }
    try { T r = c.call(); onSuccess(); return r; }
    catch (Exception e) { onFailure(); throw e; }
  }
  private void onSuccess() { if (state.get() == State.HALF_OPEN) { state.set(State.CLOSED); window.reset(); } else window.record(true); }
  private void onFailure() {
    window.record(false);
    if (state.get() == State.HALF_OPEN || window.failureRate() > 0.5) { state.set(State.OPEN); openedAt = clock.millis(); }
  }
}

<T> T retry(Callable<T> c, RetryPolicy p) throws Exception {
  for (int attempt = 1; ; attempt++) {
    try { return c.call(); }
    catch (Exception e) {
      if (attempt >= p.maxAttempts() || !p.retryable(e)) throw e;
      sleeper.sleep(p.backoff().delay(attempt));                     // exponential + jitter, injected sleeper for tests
    }
  }
}
```
--- ext
**Ordering**: bulkhead outermost (don't even queue when saturated), then circuit breaker (fail fast when open, and count each logical call once), then retry (retries happen inside an allowed call), then timeout per attempt. State the choice; other orders have different semantics.

**Safety**: retry only idempotent operations or with idempotency keys; cap total time (deadline) across attempts; retries + many clients can amplify an outage (retry budgets).

**Async**: same policies over `CompletableFuture` with a scheduler for backoff; no sleeping threads.

**Tests**: fake clock and sleeper: breaker opens after the threshold, rejects while open, allows one trial after the timeout, closes on success; retries stop on non-retryable errors.
--- variants
Q: Hedged requests for tail latency.
A: Send a second request if the first hasn't answered by the p95 latency; take the first response; only for idempotent reads; budget the extra load.
Q: Per-endpoint configuration loaded at run time.
A: Registry of named policies; config reload swaps immutable policy objects.
Q: Async/reactive client.
A: Non-blocking versions with a scheduler; timeouts via orTimeout; breaker unchanged.
--- steer
Q: Retries made the outage worse.
A: Backoff with jitter, retry budgets, circuit breaker, only idempotent calls.
Q: Circuit breaker states.
A: Closed → open on failure rate → half-open after timeout → closed on trial success.
Q: Order of policies.
A: Bulkhead → breaker → retry → timeout; justify.
--- pitfalls
- Retrying non-idempotent calls (double charges)
- Fixed retry delays without jitter (synchronised retry storms)
- Retries without an overall deadline
- A breaker that lets every thread through in half-open
--- level
- **L4**: timeout + retry loop with backoff.
- **L5**: breaker state machine with thread-safe transitions, composable decorators with justified order, idempotency, jitter, fake-clock tests.
- **L6**: retry budgets, hedging, adaptive concurrency limits, per-dependency observability.
--- prereqs
decorator-proxy, state-pattern, library-api, async-virtual-threads
--- paths
- [deep] Implement the circuit breaker :: States closed/open/half-open; sliding failure window; one trial in half-open via CAS.
  - The dependency recovers slowly :: Half-open allows a limited number of trial calls; ramp up.
- [failure] Retries amplify an outage :: Exponential backoff with jitter; retry budgets; breaker; deadlines.
- [deep] Compose timeout, retry, breaker, bulkhead :: Decorators; order and its semantics.
- [failure] Retrying a payment call :: Only with idempotency keys; otherwise no retry.
- [variation] Hedged requests for tail latency :: Second request after p95; first response wins; extra load budget.

=== d-lld-refactor-order-service
--- words
- **Legacy code**: existing code without tests that people are afraid to change.
- **Seam**: a place where behaviour can be swapped without editing code (an injected interface).
- **Characterisation test**: a test that pins down what the code does today.
- **Extract class / move method**: refactorings that split responsibilities.
--- flow
1. **0–5**: read the code with the interviewer; list what placeOrder does (validate, price, charge, stock, email, save) and its static calls.
2. **5–12**: plan: characterisation tests, seams, target design.
3. **12–35**: refactor step by step: introduce interfaces for infrastructure, extract pricing and validation, an application service orchestrating domain objects.
4. **35–45**: tests now possible, transaction and failure handling, rollout safety.
--- req
**Starting point**: a 600-line `OrderService.placeOrder()` with static calls (`Db.save`, `PaymentApi.charge`, `Mailer.send`), pricing rules inline, validation mixed with I/O, no tests.

**Goals**: same behaviour, testable units, new pricing rules addable without touching the orchestration, payment failures never leave stock decremented.
--- model
- `PlaceOrder` application service (use case) orchestrating: `OrderValidator`, `PricingEngine` (strategy rules), `InventoryPort`, `PaymentPort`, `OrderRepository`, `Notifier`.
- Domain: `Order`, `OrderLine`, `Money`, `OrderStatus`.
- Adapters: `JdbcOrderRepository`, `StripePaymentAdapter`, `SmtpNotifier` implementing the ports.
--- patterns
- **Dependency inversion** via ports and adapters; **strategy** for pricing rules; **facade/application service** for the use case; **observer** (OrderPlaced event) for email.
--- code
```java
final class PlaceOrder {
  PlaceOrder(OrderValidator v, PricingEngine p, InventoryPort inv, PaymentPort pay, OrderRepository repo, EventPublisher events) { ... }

  OrderId execute(PlaceOrderCommand cmd) {
    validator.check(cmd);                                        // pure; throws InvalidOrder
    Order order = Order.draft(cmd.customer(), cmd.lines());
    order.price(pricing.price(order));                           // pure pricing rules
    Reservation r = inventory.reserve(order.lines());
    try {
      ChargeId charge = payments.charge(order.total(), cmd.card(), IdempotencyKey.of(cmd.requestId()));
      order.markPaid(charge);
      repo.save(order);
      events.publish(new OrderPlaced(order.id()));               // email happens in a listener
      return order.id();
    } catch (RuntimeException e) {
      inventory.release(r);                                      // compensate
      throw e;
    }
  }
}
```
--- ext
**Safe steps**: 1) characterisation tests around placeOrder (golden outputs for sample carts, with static calls wrapped first via "extract and override" or a thin static-to-instance shim); 2) introduce interfaces for each static dependency and inject them; 3) extract validation and pricing into pure classes; 4) move orchestration into PlaceOrder; 5) delete dead code; each step with tests green.

**Failure handling**: reserve → charge → save ordering with compensation; idempotency key for payment retries; outbox for the event if email must not be lost.

**Rollout**: feature flag routing a percentage of orders to the new path, comparing outcomes (shadow mode) before switching.
--- variants
Q: You can't change the static Db class used everywhere.
A: Wrap it in an instance adapter implementing a port; inject the adapter in new code; migrate callers gradually.
Q: Pricing rules change weekly.
A: PricingRule strategies composed by the engine; rules configured from data.
Q: Payment succeeded but saving the order failed.
A: Refund or retry save with the same id; idempotent recovery job; outbox pattern.
--- steer
Q: Where do you start with untested code?
A: Characterisation tests, then seams, then small extractions.
Q: How do you test placeOrder now?
A: Fakes for ports; pure tests for validator and pricing.
Q: Avoid double charges on retries.
A: Idempotency keys; charge once per request id.
--- pitfalls
- Rewriting from scratch instead of incremental refactoring
- Changing behaviour while restructuring
- Keeping static calls hidden inside the new classes
- Losing the compensation path when splitting the method
--- level
- **L4**: identifies responsibilities and splits classes.
- **L5**: safe sequence with characterisation tests and seams, ports/adapters, compensation and idempotency, testing plan.
- **L6**: incremental rollout (flags, shadow comparison), outbox, migration of other callers.
--- prereqs
dip-di, testability, smells-refactoring
--- paths
- [deep] Plan the refactoring safely :: Characterisation tests → seams → extract pure parts → application service; tests green each step.
  - The code calls static Db.save everywhere :: Instance adapter behind a port; inject; migrate gradually.
- [deep] Make it testable :: Ports with fakes; pure validator and pricing; state-based assertions.
- [failure] Payment succeeds but saving fails :: Compensation (refund) or idempotent retry; outbox for events.
- [variation] Weekly new pricing rules :: Strategy rules composed by an engine; data-driven configuration.
- [deep] Roll out without breaking production :: Feature flag, shadow mode comparison, gradual ramp.
