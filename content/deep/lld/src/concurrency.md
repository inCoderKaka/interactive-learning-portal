=== threads-basics
blurb: What processes and threads are, what they share, concurrency versus parallelism, how many threads actually run at once, the thread lifecycle and cost, and why I/O-bound and CPU-bound work need different numbers of threads.
signals: "Make it thread-safe" or "what if many requests call this at once?" | Background workers, timers, servers handling many clients | "How many threads should the pool have?" | Explaining why a multi-threaded program got slower
widgets: cores-lab

--- lesson
:::words
- **Process**: a running program with its own memory, separate from other processes.
- **Thread**: one sequence of instructions running inside a process. All threads of a process share its memory (the heap), but each has its own stack (local variables, call history).
- **Core**: one processing unit in a CPU that can run one thread's instructions at a time (two with hyper-threading, roughly).
- **Concurrency**: dealing with many things at once: several tasks in progress, taking turns or overlapping.
- **Parallelism**: doing many things at the same instant, on several cores.
- **Context switch**: the operating system pausing one thread and resuming another on a core; costs a few microseconds.
- **CPU-bound**: work limited by computation (compressing, hashing). **I/O-bound**: work that mostly waits (network, disk, database).
- **Shared mutable state**: data that several threads can read and change. The source of almost every concurrency bug.
:::

## The problem in plain words

A web server handles thousands of users; a parking system has several gates; an app downloads images while the user scrolls. Doing these one at a time would leave users waiting, so programs run several **threads**: independent sequences of work inside one program. Threads share memory, which makes communication cheap, and which is also exactly what makes them dangerous: two threads changing the same data at the same time can corrupt it. The rest of this chapter is about that danger and its cures. This page is about what threads are and when more of them help.

:::eli5
A process is a restaurant. Threads are the cooks. They share one kitchen (memory): the same fridge, the same counters. With one cook, orders wait. With four cooks, more gets done, until they start bumping into each other at the fridge or two of them grab the same pan. More cooks than stoves just means cooks standing around.
:::

## Process vs thread

| | Process | Thread |
|---|---|---|
| Memory | Its own, isolated | Shares the process heap; own stack |
| Communication | Pipes, sockets, files (slow, explicit) | Shared variables (fast, dangerous) |
| A crash | Kills only that process | Can kill the whole process |
| Creation cost | High (milliseconds) | Lower (tens of microseconds for an OS thread) |

Chrome runs each tab as a separate process for isolation; a Java server runs one process with hundreds of threads for cheap sharing.

## Concurrency vs parallelism

**Concurrency** is about structure: several tasks in progress at once, possibly interleaved on one core. **Parallelism** is about execution: tasks running at the same instant on several cores. A single-core machine can be concurrent (switching between threads) but not parallel. Concurrency helps even on one core when tasks **wait** (for the network, the disk), because another task can use the CPU meanwhile. Parallelism only helps **CPU-bound** work, and only up to the number of cores.

See how four tasks finish on one core and on four, and what changes when they are mostly waiting on I/O:

[[widget:cores-lab]]

## How many threads?

- **CPU-bound work:** about as many threads as cores (`Runtime.getRuntime().availableProcessors()`). More threads add context switches and cache misses without adding speed.
- **I/O-bound work:** more threads than cores, because each spends most of its time waiting. A rule of thumb (from *Java Concurrency in Practice*): threads ≈ cores × (1 + wait time / compute time). A task that waits 90 ms for a database and computes 10 ms wants about 10 threads per core.
- **Many thousands of waiting tasks:** OS threads get expensive (memory per stack, scheduling). Use asynchronous I/O or virtual threads (later page).
- **Amdahl's law:** if 10% of the work must run serially, no number of threads makes it more than 10× faster. Locks that serialise work shrink the parallel part.

## The thread lifecycle (Java)

`NEW` (created) → `RUNNABLE` (running or ready to run) → possibly `BLOCKED` (waiting for a lock), `WAITING` / `TIMED_WAITING` (waiting for a signal or a timeout) → `TERMINATED`. You rarely manage threads by hand; you give tasks to a **thread pool** (later chapter), which reuses a fixed set of threads.

```java
Thread t = new Thread(() -> System.out.println("hello from " + Thread.currentThread().getName()));
t.start();     // runs concurrently; calling t.run() would run it on the CURRENT thread
t.join();      // wait for it to finish
```

## What threads share, and what they don't

- **Shared:** objects on the heap (anything reachable from a shared reference), static fields.
- **Private:** local variables and parameters (on each thread's own stack), `ThreadLocal` values.

So: a local variable is always safe; an object passed to two threads, a field of a shared service, a static cache are not. **Finding the shared mutable state** is step one of making anything thread-safe. Then there are only three cures: **don't share** (confine data to one thread), **don't mutate** (immutable objects), or **synchronise** (locks, atomics, concurrent collections).

## What breaks

- **Too many threads** for CPU-bound work: slower, not faster.
- **One thread per request** for thousands of slow connections: memory and scheduling costs explode.
- **Calling `run()` instead of `start()`**: nothing runs concurrently.
- **Ignoring shared state** because "it works in tests" (bugs appear under load).

## Interview angles

- "What state is shared in your design?" List it: the spot free-lists, the active-ticket map, counters. Everything else is confined or immutable.
- "How many threads for this crawler?" I/O-bound: many (or async/virtual threads), bounded by politeness and memory.
- "Why didn't adding threads help?" CPU-bound with too few cores, a lock serialising everything, or contention on shared data.

--- revise
### Basics
? Process vs thread? :: Process: own isolated memory. Thread: runs inside a process, sharing its heap, with its own stack.
? What do threads share and not share? :: Share heap objects and static fields; each has its own stack (locals, parameters) and ThreadLocals.
? Concurrency vs parallelism? :: Concurrency: many tasks in progress (may interleave on one core). Parallelism: running at the same instant on several cores.
? When does concurrency help on one core? :: When tasks wait (I/O): another task uses the CPU meanwhile.
? Three cures for shared mutable state? :: Don't share (confinement), don't mutate (immutability), or synchronise.

### Sizing
? Threads for CPU-bound work? :: About the number of cores.
? Threads for I/O-bound work? :: cores × (1 + wait/compute), e.g. 90 ms wait / 10 ms compute ≈ 10 per core.
? Amdahl's law? :: The serial fraction caps speed-up: 10% serial → at most 10× faster.
? start() vs run()? :: start() runs on a new thread; run() just calls the method on the current thread.

--- notes
## Process vs thread
Process: isolated memory, costly, crash-isolated. Thread: shared heap, own stack, cheap, crash takes process.
## Concurrency vs parallelism
Concurrency: structure, interleaving; helps when waiting. Parallelism: simultaneous execution on cores; helps CPU-bound work.
## Sizing
CPU-bound ≈ cores. I/O-bound ≈ cores × (1 + wait/compute).
Thousands of waits → async I/O or virtual threads.
Amdahl: serial fraction caps speed-up; locks add serial fraction.
## Lifecycle
NEW → RUNNABLE → BLOCKED / WAITING / TIMED_WAITING → TERMINATED. start(), join(); never run().
Use pools, not hand-made threads.
## Shared or not
Heap objects, statics: shared. Locals, params, ThreadLocal: private.
Cures: confine, immutable, synchronise.
## Breakage
Too many CPU threads; thread per slow connection; run() instead of start(); "works in tests".

--- doubts
Q: If threads share memory, why can't they just read and write the same variables safely?
A: Because a single line like `count++` is really three steps (read, add, write), and another thread can run between them, and because CPUs and compilers reorder and cache memory operations, so one thread's write isn't automatically visible to another. The next two pages show both problems step by step.

Q: Is Python different because of the GIL?
A: CPython's global interpreter lock lets only one thread run Python bytecode at a time, so threads give concurrency (good for I/O) but not CPU parallelism (use processes for that). It does not make your code thread-safe: threads can still interleave between bytecodes, so `count += 1` races in Python too.

Q: What are hyper-threads?
A: A core that can hold the state of two threads and interleave them at the hardware level, using idle execution units. It typically adds 15–30% throughput, not 2×. Operating systems report them as extra "logical processors".

Q: How do JavaScript and Node handle concurrency with one thread?
A: With an event loop: one thread runs callbacks one at a time, and all I/O is non-blocking, so while a request waits for the database the thread serves other callbacks. No two callbacks run at once, so there are no data races inside one process, but long computations block everything (and order-of-callback bugs still exist).

--- exercises
[estimate] A service handles requests that spend 5 ms computing and 45 ms waiting on a database, on an 8-core machine. Roughly how many worker threads should it have, and what limits throughput if you add more?
A: cores × (1 + wait/compute) = 8 × (1 + 45/5) = 8 × 10 = 80 threads. Throughput then is bounded by CPU: 8 cores × (1000 ms / 5 ms) = 1,600 requests per second. Adding threads beyond ~80 doesn't raise that ceiling; it adds memory and context switches, and may overload the database (its own connection limit and capacity become the real bound).

[choose] Concurrency, parallelism, both, or neither helps? (a) Resizing 1,000 images on an 8-core laptop. (b) Fetching 500 web pages. (c) A strictly sequential algorithm where each step needs the previous result.
A: (a) Parallelism (CPU-bound): ~8 threads, one per core. (b) Concurrency (I/O-bound): many fetches in flight at once, even on one core. (c) Neither: each step depends on the last, so it's 100% serial (Amdahl).

[break] `class Counter { static int hits; } // each request thread calls Counter.hits++` and `void handle() { List<String> buf = new ArrayList<>(); buf.add(...); }`. Which of these is shared mutable state?
A: Counter.hits is a static field: shared by all threads and mutated, so hits++ races (lost updates). buf is a local variable created per call: each thread has its own list, so it's safe without any locking.

--- pitfalls
- Adding threads to CPU-bound work beyond the number of cores
- Creating a new OS thread per request for thousands of slow connections
- Calling run() instead of start()
- Assuming code is thread-safe because tests pass on a quiet laptop
- Not listing which state in a design is shared and mutable

--- quiz
Q: What do two threads of the same process share?
- Their stacks
- Their local variables
- *Objects on the heap and static fields
- Nothing
W: Heap and statics are shared; stacks are private.
Q: An 8-core machine runs CPU-bound work. Roughly how many threads maximise throughput?
- 1
- *About 8
- 800
- As many as possible
W: CPU-bound work can't use more threads than cores.
Q: Concurrency on a single core helps when…
- Tasks are CPU-bound
- *Tasks spend time waiting on I/O
- Never
- There are no shared variables
W: Another task uses the CPU while one waits.

--- sources
- book :: Java Concurrency in Practice, ch. 1–2 and 8.2 (sizing thread pools) :: Brian Goetz et al. :: https://jcip.net/
- article :: Concurrency is not parallelism (talk) :: Rob Pike :: https://go.dev/blog/waza-talk
- article :: Amdahl's law :: Wikipedia :: https://en.wikipedia.org/wiki/Amdahl%27s_law
- article :: Thread.State :: Oracle Java SE 21 API :: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Thread.State.html

=== race-conditions
blurb: What a race condition is, the two shapes it almost always takes (read-modify-write and check-then-act), why count++ loses updates, what a critical section and atomicity mean, and the four ways to fix a race.
signals: Counters, balances, stock and seat counts updated by many threads | "if (!map.containsKey(k)) map.put(k, v)" | "Two users book the last seat" | Bugs that appear only under load
widgets: interleave

--- lesson
:::words
- **Race condition**: a bug where the result depends on the timing of threads, so it sometimes happens and sometimes doesn't.
- **Data race**: two threads accessing the same memory at the same time without synchronisation, at least one of them writing. (A race condition can exist even without a data race.)
- **Interleaving**: one particular order in which the steps of several threads end up running.
- **Atomic**: happens as one indivisible step: other threads see it either not started or finished, never halfway.
- **Critical section**: a piece of code that must not be run by two threads at once because it touches shared state.
- **Read-modify-write**: reading a value, computing a new one, writing it back (`count++`).
- **Check-then-act**: checking a condition and acting on it (`if (seatFree) book()`), where the condition may change in between.
:::

## The problem in plain words

`count++` looks like one step. It is three: **read** count into a register, **add** one, **write** it back. If two threads both read 5 before either writes, both write 6: one increment vanished. Nothing crashed, no exception was thrown, and the bug only shows up when the timing lines up, which on a busy server is constantly and on your laptop almost never.

:::eli5
Two people share a bank account with ₹100. Both look at the balance on their phones at the same moment: ₹100. Each deposits ₹50 by typing "new balance = 150". The bank ends up with ₹150 instead of ₹200. Each person did the right thing; the problem is that "look, then write" isn't one step.
:::

Step the two threads yourself and find the interleavings that lose an update; then turn the lock on:

[[widget:interleave]]

## The two shapes of race

**1. Read-modify-write.** `count++`, `balance -= amount`, `list.add(x)` on a non-thread-safe list (which reads the size, writes the element, writes the new size). The fix is to make the whole read-modify-write atomic.

**2. Check-then-act.** The check's answer is stale by the time you act on it:

```java
if (!cache.containsKey(key)) {          // check
  cache.put(key, expensiveLoad(key));   // act: another thread may have put it meanwhile
}
if (seat.isFree()) {                    // check
  seat.book(user);                      // act: two users can both see "free"
}
if (instance == null) instance = new Config();   // the lazy singleton race
```

Each individual method may be thread-safe (`ConcurrentHashMap.containsKey` is!), yet the **combination** isn't. Thread safety doesn't compose automatically: atomicity must cover the whole invariant-bearing sequence.

## Four ways to fix a race

1. **Make it atomic with a lock** around the whole sequence:

```java
synchronized void book(Seat s, User u) {
  if (!s.isFree()) throw new SeatTaken(s);
  s.assign(u);
}
```

2. **Use an atomic operation** that does the sequence in one step:

```java
AtomicLong count = new AtomicLong();
count.incrementAndGet();                                  // atomic read-modify-write
cache.computeIfAbsent(key, k -> expensiveLoad(k));        // atomic check-then-act
seats.putIfAbsent(seatId, bookingId);                     // claim a seat atomically
```

3. **Don't share:** give each thread its own data (per-thread counters summed later, `LongAdder` does this internally), or confine the state to one thread that receives requests through a queue.

4. **Don't mutate:** immutable objects can't race; publish a new version instead of changing the old one.

## Finding races in a design

For each piece of shared mutable state, ask: **what invariant connects it to other state, and which sequences read then write it?** In a booking system: "a seat has at most one booking" connects the seat's status and the bookings map; "hold seat, then charge, then confirm" is a check-then-act spanning seconds. That last kind can't hold a lock for seconds, so it uses a **state** (`HELD` with an expiry) changed atomically, which is the pattern behind every ticketing design.

The same races exist outside one process: two servers doing `SELECT stock ... ; UPDATE stock = stock - 1` race exactly like `count++`. The fixes map across: a conditional update (`UPDATE ... SET stock = stock - 1 WHERE id = ? AND stock > 0`) is the database's compare-and-set.

## What breaks

- **Treating thread-safe parts as a thread-safe whole** (two safe calls in a row).
- **Locking only the write** but not the read that decided it.
- **Different locks for the same invariant** in different methods.
- **Testing once and declaring it safe**: races are probabilistic.

## Interview angles

- "Two gates assign the same spot." Check-then-act: make find-and-claim one atomic operation.
- "Make this counter thread-safe." `AtomicLong` or `LongAdder` for hot counters; `synchronized` if it's part of a larger invariant.
- "Is `ConcurrentHashMap` enough?" Only if each operation is a single atomic call (`compute`, `merge`, `putIfAbsent`); a `get` followed by a `put` still races.

--- revise
### What races are
? Race condition? :: A bug whose outcome depends on thread timing.
? Why does count++ lose updates? :: It is read, add, write; two threads can both read the old value and both write old+1.
? Two shapes of race? :: Read-modify-write (count++) and check-then-act (if free then book).
? Data race vs race condition? :: Data race: unsynchronised concurrent access with a write. Race condition: any timing-dependent bug, even with synchronised parts.
? What is a critical section? :: Code touching shared state that must not run in two threads at once.

### Fixes
? Four ways to fix a race? :: Lock the whole sequence; use an atomic operation; don't share (confine/per-thread); don't mutate (immutable).
? Atomic check-then-act on a map? :: computeIfAbsent / putIfAbsent / compute / merge.
? Does thread safety compose? :: No: two thread-safe calls in a row can still race.
? Database equivalent of compare-and-set? :: A conditional UPDATE ... WHERE stock > 0 (check the affected row count).
? Long check-then-act (hold, charge, confirm)? :: Use an atomically changed state (HELD with expiry) rather than holding a lock.

--- notes
## Race
Outcome depends on timing; silent; shows under load.
count++ = read, add, write → lost updates.
Data race (unsynchronised access + write) vs race condition (any timing bug).
## Shapes
Read-modify-write: count++, balance -= x, list.add.
Check-then-act: containsKey→put, isFree→book, lazy singleton.
Safe parts ≠ safe whole.
## Fixes
1 lock the whole sequence (synchronized).
2 atomic op: incrementAndGet, computeIfAbsent, putIfAbsent, merge.
3 don't share: confinement, per-thread counters (LongAdder), single-writer queue.
4 don't mutate: immutable, publish new versions.
## Design check
Per shared state: which invariant, which read-then-write sequences?
Long sequences → states (HELD + expiry), not long locks.
Across servers: conditional UPDATE = CAS.
## Breakage
Safe calls composed unsafely; lock on write only; different locks per invariant; one test run.

--- doubts
Q: Is `volatile int count; count++` safe?
A: No. `volatile` makes each read and write visible to other threads, but `count++` is still a separate read and write, so two threads can both read 5 and both write 6. Use `AtomicInteger.incrementAndGet()` or a lock.

Q: How likely is a race to actually happen?
A: On a quiet laptop with a short critical section, rarely, which is why tests miss them. On a server with many cores and millions of operations a day, near-certainly: a one-in-a-million interleaving happens many times a day. Races must be designed out, not tested out.

Q: Is a race on a counter that only feeds a dashboard acceptable?
A: Sometimes, deliberately: a slightly low page-view count may not matter, and an unsynchronised counter is faster. But say so explicitly, and make sure the race can only lose counts, never corrupt a data structure (an unsynchronised `HashMap` can corrupt itself under concurrent writes). `LongAdder` gives fast, correct counting, so the trade-off is rarely worth it.

Q: Why does `Collections.synchronizedList(list)` still need extra locking when iterating?
A: Each method call is synchronised, but iterating is many calls (`hasNext`, `next`...), and another thread can modify the list between them. The documentation says to hold the list's lock for the whole loop: `synchronized (list) { for (...) }`. Same compound-action lesson.

--- exercises
[break] A cinema app does: `int free = show.freeSeats(); if (free >= n) { show.setFreeSeats(free - n); createBooking(...); }` from many request threads. Show an interleaving that oversells, and fix it.
A: Two requests for 2 seats when 3 are free: both read free = 3, both pass the check, both write 1, and both create bookings: 4 seats sold from 3. Fix in memory: a synchronized show.reserve(n) that checks and decrements atomically (or an AtomicInteger with a CAS loop: read, check ≥ n, compareAndSet(free, free − n)). Fix in a database: UPDATE shows SET free = free − ? WHERE id = ? AND free >= ?, and treat 0 affected rows as "sold out". Better still, book specific seats with per-seat state changes so the count is derived.

[choose] Which fix is best? (a) A hot request counter on every request. (b) "Load config for key k once, even if many threads ask at once". (c) Move ₹x from account A to account B.
A: (a) LongAdder (or AtomicLong): an atomic, low-contention counter. (b) ConcurrentHashMap.computeIfAbsent(k, load) (the loader runs once per key; keep it short and non-recursive). (c) A lock covering both accounts (ordered to avoid deadlock, see the deadlock page) or a single transaction in the database: the invariant spans two objects, so a per-object atomic is not enough.

[design] Design a thread-safe `HitCounter` with `hit()` and `count()` returning hits in the last 60 seconds, called from many threads at high rate.
A: 60 buckets (one per second) in a ring, each holding a second-timestamp and a count (AtomicLong per bucket or a small lock per bucket). hit(): b = buckets[now % 60]; if b.second != now, reset it to (now, 0) atomically (lock the bucket or CAS on a combined value); increment. count(): sum buckets whose second is within the last 60. Inject a Clock for tests. For very high rates, use LongAdder per bucket; count() may be slightly stale under concurrent hits, which is usually acceptable (state it).

--- pitfalls
- Assuming a sequence of thread-safe calls is thread-safe as a whole
- Locking the write but not the read that decided it
- Protecting one invariant with different locks in different methods
- Using volatile to make count++ safe
- Declaring code race-free because a few test runs passed

--- quiz
Q: Two threads each run count++ once on count = 0. Possible final values?
- Only 2
- *1 or 2
- 0, 1 or 2
- Only 1
W: Both may read 0 and write 1.
Q: `if (!map.containsKey(k)) map.put(k, v);` on a ConcurrentHashMap is…
- Thread-safe, because the map is concurrent
- *A check-then-act race; use putIfAbsent or computeIfAbsent
- A deadlock
- A memory leak
W: Each call is safe; the pair is not atomic.
Q: Which is NOT a way to remove a race?
- Lock the whole sequence
- Use an atomic operation
- Make the data immutable
- *Mark the field volatile and keep count++
W: volatile gives visibility, not atomicity.

--- sources
- book :: Java Concurrency in Practice, ch. 2 "Thread safety" (atomicity, compound actions) :: Brian Goetz et al. :: https://jcip.net/
- article :: ConcurrentHashMap (atomic compute, merge, putIfAbsent) :: Oracle Java SE 21 API :: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/ConcurrentHashMap.html
- article :: LongAdder :: Oracle Java SE 21 API :: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/atomic/LongAdder.html

=== memory-visibility
blurb: Why one thread's write may never be seen by another (CPU caches, store buffers, compiler and CPU reordering), the Java memory model's happens-before rule, what volatile, synchronized, final and thread start/join guarantee, and safe publication of objects.
signals: A "stop" flag that a worker thread never notices | Double-checked locking | Sharing an object built on one thread with another | "Why is volatile needed here?"
widgets: seq-visibility

--- lesson
:::words
- **Visibility**: whether a write by one thread is guaranteed to be seen by a later read in another thread.
- **CPU cache**: small, fast memory next to each core holding copies of recently used data. Each core may hold a stale copy.
- **Reordering**: the compiler or CPU running memory operations in a different order than written, which is legal as long as a single thread can't tell.
- **Java memory model (JMM)**: the rules saying when a write in one thread must be visible to a read in another.
- **Happens-before**: a guarantee between two actions: everything done before the first is visible to whoever does the second.
- **`volatile`**: a field modifier: reads and writes go "through" to main memory in order, and create happens-before edges.
- **Safe publication**: handing an object to other threads so they see it fully constructed.
:::

## The problem in plain words

You might expect that when one thread writes `running = false`, every other thread sees it right away. It isn't guaranteed. Each core works on cached copies; writes sit in buffers; the compiler may hoist a read out of a loop because "nothing in this loop changes it". Without synchronisation, **a thread may see a stale value forever, or see writes in a different order than they were made**. This is subtler than races, because the code looks obviously correct.

:::eli5
Two people share a whiteboard, but each works from a photo of it on their phone. One updates the board; the other keeps reading the old photo until someone says "take a new photo". `volatile` and locks are the "take a new photo" rule, applied at the right moments.
:::

Two classic failures, step by step:

[[widget:seq-visibility]]

## The stop flag that never stops

```java
class Worker implements Runnable {
  private boolean running = true;                 // not volatile
  public void run() { while (running) { doWork(); } }
  public void stop() { running = false; }         // called from another thread
}
```

The JIT compiler may see that `running` isn't changed inside the loop and turn it into `if (running) while (true) doWork();`. The worker never stops. Declaring `private volatile boolean running` forbids that and guarantees the write becomes visible.

## Happens-before: the rule that matters

Instead of reasoning about caches, the Java memory model gives you a set of **happens-before** edges. If action A happens-before action B, then everything A's thread did before A is visible to B's thread after B. The edges you use daily:

| Edge | Meaning |
|---|---|
| **Unlock → later lock of the same lock** | Everything written inside a `synchronized` block is visible to the next thread that takes the same lock |
| **Volatile write → later volatile read of the same field** | Everything written before the volatile write is visible after the read |
| **`Thread.start()` → actions in the started thread** | The new thread sees what the parent did before starting it |
| **Actions in a thread → another thread's `join()` returning** | After `join`, you see everything the finished thread did |
| **Constructor end → use of `final` fields** | `final` fields are visible once the object is properly published |
| **Putting into a concurrent collection → taking out** | `BlockingQueue`, `ConcurrentHashMap` and executors create these edges |

Practical reading: **synchronise on the same lock for reads and writes**, or use `volatile` for a simple flag, or hand data over through a concurrent collection or executor. Then you never have to think about caches.

## volatile: what it does and doesn't do

- **Does:** visibility (reads see the latest write), ordering (writes before a volatile write can't be moved after it; the "publish" pattern works), atomic reads and writes of `long`/`double`.
- **Doesn't:** make compound actions atomic. `volatile int count; count++` still loses updates.
- **Good for:** stop flags, a status published by one writer, the reference in double-checked locking, a configuration object swapped as a whole (`volatile Config current = newConfig;`).

## Safe publication

An object built in one thread and handed to another without a happens-before edge may be seen **partially constructed**: the reference is visible but some field writes are not (the double-checked locking bug from the singleton page). Publish safely by:

- storing the reference in a `volatile` field or an `AtomicReference`,
- storing it in a field guarded by a lock, read under the same lock,
- passing it through a concurrent collection, queue or executor,
- initialising it in a static initialiser, or
- making the object **immutable with `final` fields** (then even a racy publication shows the final fields correctly, a special guarantee of `final`).

## The practical rules

1. Shared mutable fields are either **guarded by a lock** (always accessed while holding it) or **`volatile`** (and only simple reads/writes), or **atomic** classes.
2. Prefer **immutable objects** for anything shared; swap whole objects through a `volatile` or `AtomicReference`.
3. Hand work and data between threads through **`java.util.concurrent`** (queues, executors, futures): they do the happens-before bookkeeping for you.
4. Document which lock guards which field (`@GuardedBy("this")` is a common annotation).

## What breaks

- **Non-volatile flags** polled in loops.
- **Locking only the writer**, reading without the lock ("reads are harmless").
- **Double-checked locking without volatile.**
- **Leaking `this` from a constructor** (starting a thread or registering a listener inside the constructor), so others see a half-built object.
- **Assuming x86 behaviour everywhere**: x86 reorders less than ARM; code that "works" on a laptop can fail on an ARM server.

## Interview angles

- "Why does your double-checked locking need volatile?" Safe publication: without it another thread can see the reference before the constructor's writes.
- "Is reading without a lock fine if only one thread writes?" Only if the field is `volatile` (or the value is immutable and published safely); otherwise the reader may see stale data forever.
- "How do you swap a config at run time?" Build a new immutable `Config`, publish it with a `volatile` write or `AtomicReference.set`.

--- revise
### The problem
? Why might a thread never see another's write? :: Per-core caches, store buffers and compiler/CPU reordering; without synchronisation nothing forces visibility.
? Why can a non-volatile stop flag loop forever? :: The JIT may hoist the read out of the loop because the loop doesn't change it.
? What is happens-before? :: A guarantee that everything before action A is visible to the thread after action B.

### Edges and tools
? Five common happens-before edges? :: Unlock→lock (same lock); volatile write→read (same field); start()→thread body; thread body→join(); put→take on concurrent collections/executors.
? What does volatile guarantee? :: Visibility and ordering of that field's reads/writes (and atomic long/double access).
? What doesn't volatile guarantee? :: Atomicity of compound actions like count++.
? Safe publication options? :: volatile/AtomicReference field, lock-guarded field, concurrent collection/executor hand-off, static initialiser, immutable object with final fields.
? Special guarantee of final fields? :: They're seen correctly once construction finishes, even if the reference is published racily.
? Constructor anti-pattern for visibility? :: Leaking this (starting threads or registering listeners) before construction completes.

--- notes
## Why stale reads happen
Caches per core, store buffers, compiler hoisting, CPU reordering. Legal unless synchronised.
Non-volatile stop flag may never stop.
## Happens-before edges
Unlock → lock same monitor. Volatile write → volatile read same field.
start() → new thread. Thread end → join(). Concurrent put → take; executor submit → task run.
Constructor end → final fields.
## volatile
Visibility + ordering; atomic long/double read/write. NOT compound atomicity.
Uses: flags, single-writer status, DCL reference, whole-object config swap.
## Safe publication
volatile/AtomicReference; lock-guarded; concurrent hand-off; static init; immutable + final.
## Rules
Every shared mutable field: lock-guarded, volatile, or atomic. Prefer immutable + swap.
Use java.util.concurrent for hand-offs. Document guards (@GuardedBy).
## Breakage
Non-volatile flags; unlocked reads; DCL without volatile; leaking this; trusting x86.

--- doubts
Q: If x86 rarely reorders, why do I need to care?
A: Three reasons: the Java compiler (JIT) reorders and caches values regardless of CPU; ARM servers and phones (and Apple Silicon) reorder much more than x86; and the language guarantees only what the memory model says. Code relying on "it works on my machine" breaks silently elsewhere.

Q: Is synchronized only about mutual exclusion?
A: No, it has two jobs: only one thread inside at a time, **and** memory visibility: everything written before releasing a lock is visible to the next thread acquiring the same lock. That's why reads also need the lock: a reader that skips it gets neither guarantee.

Q: When should I use `AtomicReference` instead of `volatile`?
A: When you need compare-and-set: "replace the config only if it's still the version I read" (`ref.compareAndSet(old, new)`). For plain "publish the latest value", a volatile field is enough.

Q: Do I need volatile for fields only touched inside synchronized blocks?
A: No. The lock provides both atomicity and visibility, as long as **every** access (reads included) holds the same lock.

--- exercises
[break] `class Cache { private Map<String, String> data; void reload() { Map<String, String> m = new HashMap<>(); load(m); data = m; } String get(String k) { return data.get(k); } }` with `reload()` on a timer thread and `get()` on request threads. What can go wrong and what's the minimal fix?
A: data isn't volatile, so request threads may keep seeing the old map forever (no happens-before edge), or see the new reference before the HashMap's internal writes, i.e. a partially built map (possible errors or missing keys). Minimal fix: private volatile Map<String, String> data, and publish an unmodifiable map (data = Map.copyOf(m) or Collections.unmodifiableMap(m)) so it is never mutated after publication.

[choose] volatile, a lock, an atomic class, or nothing? (a) A shutdown flag set by one thread and read by workers. (b) A balance that's read, checked and decreased. (c) A request counter. (d) A local StringBuilder inside a method.
A: (a) volatile boolean. (b) A lock (or a CAS loop on an AtomicLong): it's a compound check-then-act. (c) AtomicLong/LongAdder. (d) Nothing: local and confined to one thread.

[design] A service holds a routing table that an admin thread rebuilds every minute and thousands of request threads read constantly. Design it for correctness and low read latency.
A: Make RoutingTable immutable (final fields, unmodifiable maps). Keep it in a volatile field (or AtomicReference). Rebuild builds a brand-new RoutingTable off to the side, then does one volatile write to publish it. Readers do a single volatile read and use that table for the whole request (read the reference once into a local so one request doesn't mix two versions). No locks on the read path; old tables are garbage-collected when no request uses them.

--- pitfalls
- Polling a non-volatile flag from another thread
- Writing under a lock but reading without it
- Double-checked locking without volatile
- Starting threads or registering listeners from a constructor
- Using volatile for compound operations like count++

--- quiz
Q: Which guarantees that a write in thread A is visible to a read in thread B?
- Writing the field twice
- *Both accessing it while holding the same lock
- Thread.sleep in B
- Making the field private
W: Unlock → lock of the same lock is a happens-before edge.
Q: `volatile long count; count++;` from two threads is…
- Atomic
- *Not atomic: updates can be lost
- A deadlock
- A compile error
W: volatile doesn't make read-modify-write atomic.
Q: What's the special guarantee for final fields?
- They are always volatile
- *Once the constructor finishes, other threads see their values correctly even with racy publication
- They are stored in CPU registers
- They can't be read
W: final fields have initialization-safety guarantees.

--- sources
- article :: JSR-133 (Java Memory Model) FAQ :: Jeremy Manson, Brian Goetz :: https://www.cs.umd.edu/~pugh/java/memoryModel/jsr-133-faq.html
- book :: Java Concurrency in Practice, ch. 3 "Sharing objects" and ch. 16 "The Java memory model" :: Brian Goetz et al. :: https://jcip.net/
- article :: Java Language Specification, ch. 17.4 "Memory model" :: Oracle :: https://docs.oracle.com/javase/specs/jls/se21/html/jls-17.html#jls-17.4
- article :: Close encounters of the Java memory model kind :: Aleksey Shipilëv :: https://shipilev.net/blog/2016/close-encounters-of-jmm-kind/

=== locks
blurb: The lock toolbox: intrinsic locks (synchronized), ReentrantLock with tryLock, timeouts and fairness, read-write locks for read-heavy data, StampedLock's optimistic reads, lock granularity (one big lock versus fine-grained and striped locks), and the rules for holding locks safely.
signals: "Make this class thread-safe" | Read-heavy shared data (caches, routing tables, catalogues) | Contention: many threads waiting on one lock | "Can a thread acquire a lock it already holds?"
widgets: lock-lab

--- lesson
:::words
- **Lock (mutex)**: an object that only one thread can hold at a time; others wanting it wait. "Mutex" means mutual exclusion.
- **Intrinsic lock / monitor**: the lock built into every Java object, used by `synchronized`.
- **Reentrant**: a thread that already holds a lock can acquire it again (nested calls) without deadlocking itself.
- **Contention**: several threads wanting the same lock at the same time, so some wait.
- **Read-write lock**: a lock allowing many readers at once or one writer alone.
- **Fair lock**: grants the lock in arrival order; unfair locks may let a newcomer barge ahead (faster, but can starve waiters).
- **Lock granularity**: how much data one lock protects: one lock for everything (coarse) or many locks each for a part (fine-grained).
- **Lock striping**: splitting data into N parts, each with its own lock (by hash of the key).
:::

## The problem in plain words

The previous pages showed that shared mutable state needs atomic sequences and visibility. A lock provides both: only one thread at a time runs the protected code, and everything done while holding it is visible to the next holder. The craft is in choosing **which kind** of lock, **how much** each lock covers, and **how long** it's held, because a lock that's too coarse or held too long turns your many threads into a queue of one.

:::eli5
A single-occupancy bathroom with a key on a hook. Whoever holds the key goes in; others wait. A read-write lock is a museum room: any number of visitors can look at the paintings together, but when the restorer comes to repaint, everyone must leave and the restorer works alone.
:::

## synchronized

```java
final class Inventory {
  private final Map<Sku, Integer> stock = new HashMap<>();      // guarded by this

  public synchronized boolean reserve(Sku sku, int qty) {       // locks "this"
    int have = stock.getOrDefault(sku, 0);
    if (have < qty) return false;
    stock.put(sku, have - qty);
    return true;
  }
  public synchronized int available(Sku sku) { return stock.getOrDefault(sku, 0); }   // reads lock too
}
```

`synchronized` methods lock `this`; `synchronized (lockObject) { ... }` locks a specific object. It's reentrant, released automatically even on exceptions, and simple. Prefer a **private lock object** (`private final Object lock = new Object();`) over `this` when outside code could also lock your object and interfere.

## ReentrantLock: more control

```java
private final ReentrantLock lock = new ReentrantLock();

public boolean tryReserve(Sku sku, int qty, Duration wait) throws InterruptedException {
  if (!lock.tryLock(wait.toMillis(), TimeUnit.MILLISECONDS)) return false;   // give up instead of waiting forever
  try {
    // ... same check-and-update ...
    return true;
  } finally {
    lock.unlock();                                                        // ALWAYS in finally
  }
}
```

What it adds: **`tryLock`** (with or without timeout) to avoid waiting forever or to back off from deadlocks, **interruptible** waiting (`lockInterruptibly`), optional **fairness**, and multiple **condition variables** (next page). The cost: you must unlock in `finally` yourself.

## Read-write locks

When reads vastly outnumber writes (a product catalogue, a routing table, a cache), a `ReentrantReadWriteLock` lets readers proceed in parallel:

```java
private final ReadWriteLock rw = new ReentrantReadWriteLock();
public Price price(Sku s) { rw.readLock().lock();  try { return prices.get(s); } finally { rw.readLock().unlock(); } }
public void update(Sku s, Price p) { rw.writeLock().lock(); try { prices.put(s, p); } finally { rw.writeLock().unlock(); } }
```

Trade-offs: more overhead per acquisition than a plain lock (it's a win only when reads are long or very frequent), and potential **writer starvation** under continuous reads (fair mode or `StampedLock` help). Often the even better answer for read-mostly data is an **immutable snapshot swapped through a volatile field** (no locks on reads at all).

**`StampedLock`** adds **optimistic reads**: read without locking, then check a stamp to see whether a write happened meanwhile; if so, retry with a real read lock. Very fast for tiny read sections; not reentrant, trickier to use.

Compare a single mutex, a read-write lock and lock striping under the same workload:

[[widget:lock-lab]]

## Granularity: one lock or many?

- **One coarse lock** (the whole parking lot): simplest, obviously correct, but every gate waits for every other gate.
- **Fine-grained locks** (one per floor, one per spot type, one per account): more parallelism; more risk (deadlocks when an operation needs two locks; invariants spanning parts).
- **Lock striping** (N locks, key → lock by hash): a middle ground used inside concurrent maps; good for per-key operations like per-user rate limits.
- **No locks** for read paths via immutable snapshots, or **lock-free** atomics for single variables.

Start coarse and correct; refine where measurement shows contention. State this order in interviews.

## Rules for holding locks

1. **Every access** to guarded state (reads too) holds the lock.
2. **One invariant, one lock:** state connected by an invariant is guarded by the same lock.
3. **Keep critical sections short:** no I/O, no network calls, no sleeping, no calls to unknown code (listeners, callbacks) while holding a lock.
4. **Unlock in `finally`** with explicit locks.
5. **Acquire multiple locks in a fixed global order** (deadlock page).
6. **Never expose the lock or guarded mutable state** outside the class.

## What breaks

- **Locking writes only.**
- **Calling a remote service inside a lock**: everyone waits for the network.
- **Forgetting `unlock()`** on an exception path: the lock is held forever.
- **Locking on a public object or a string literal** that other code also locks.
- **Read-write locks for tiny critical sections**, slower than a plain lock.

## Interview angles

- "Make the parking lot thread-safe." Start with one lock around assignment and release; then refine: one lock (or concurrent deque) per spot size, since operations for different sizes don't share invariants.
- "The catalogue is read 10,000× per write." Immutable snapshot + volatile swap, or a read-write lock.
- "Why `tryLock`?" To bound waiting, back off and retry, or avoid deadlock when taking two locks.

--- revise
### Kinds
? What two things does a lock provide? :: Mutual exclusion (one holder) and visibility (writes visible to the next holder of the same lock).
? Reentrant means? :: A thread holding the lock can acquire it again without deadlocking itself.
? Why prefer a private lock object over synchronized(this)? :: Outside code can't lock your object and interfere.
? What does ReentrantLock add over synchronized? :: tryLock (with timeout), interruptible waits, fairness, multiple conditions; must unlock in finally.
? When is a read-write lock worth it? :: Many more reads than writes and read sections that aren't tiny.
? Read-write lock risk? :: Writer starvation under continuous reads; more overhead per acquisition.
? StampedLock's trick? :: Optimistic reads: read without locking, validate the stamp, retry with a read lock if a write happened.

### Granularity and rules
? Coarse vs fine-grained vs striped locks? :: One lock (simple, contended) vs per-part locks (parallel, deadlock/invariant risk) vs N hash-chosen locks (middle ground).
? Lock-free read path for read-mostly data? :: Immutable snapshot published through a volatile field.
? Five rules for holding locks? :: Lock reads too; one invariant one lock; short sections without I/O or callbacks; unlock in finally; fixed order for multiple locks.

--- notes
## synchronized
Methods lock this; blocks lock a chosen object. Reentrant; auto-release on exceptions.
Private final lock object > this.
## ReentrantLock
tryLock(timeout), lockInterruptibly, fairness, Conditions. unlock() in finally.
## Read-write
ReentrantReadWriteLock: many readers or one writer. Worth it for read-heavy, non-tiny reads. Writer starvation.
StampedLock: optimistic read → validate → fall back. Not reentrant.
Often better: immutable snapshot + volatile swap.
## Granularity
Coarse → fine-grained → striped → lock-free. Start coarse; refine on measured contention.
## Rules
Reads lock too. One invariant one lock. Short sections: no I/O, sleep, callbacks.
finally unlock. Global lock order. Don't expose locks or guarded state.
## Breakage
Write-only locking; network in locks; missing unlock; locking public objects/strings; RW locks for tiny sections.

--- doubts
Q: Is `synchronized` slow?
A: Uncontended, it costs tens of nanoseconds; modern JVMs optimise it heavily. The real cost is **contention**: threads waiting for each other. A short critical section with a plain lock is usually faster than clever lock-free code. Measure before optimising.

Q: Why does reentrancy matter?
A: Without it, a synchronized method calling another synchronized method on the same object would deadlock with itself. Reentrant locks count holds by the owning thread and release when the count returns to zero.

Q: Fair or unfair lock?
A: Unfair (the default) gives better throughput, because a running thread can grab a just-released lock without a costly wake-up of the first waiter. Fair locks prevent starvation at a throughput cost; use them only when you need ordering guarantees.

Q: Can I upgrade a read lock to a write lock?
A: Not with `ReentrantReadWriteLock`: trying to take the write lock while holding the read lock deadlocks (you wait for all readers, including yourself). Release the read lock, take the write lock, and re-check the condition. `StampedLock.tryConvertToWriteLock` supports conversion in some cases.

--- exercises
[design] Make a `BankAccounts` service thread-safe for `deposit(id, amt)`, `withdraw(id, amt)` and `transfer(from, to, amt)`, with thousands of accounts and high concurrency.
A: One lock per account (a ReentrantLock in each Account object) rather than one global lock, so operations on different accounts run in parallel. deposit/withdraw lock only their account. transfer locks both accounts in a global order (by account id, smaller first) to avoid deadlock, checks the balance, moves the money, unlocks in reverse in finally. Reads of a balance also take the account's lock (or the balance is an AtomicLong only if no multi-field invariant exists). No I/O inside locks; audit logging happens after unlocking.

[break] `synchronized void book(SeatId s, User u) { if (seats.get(s).isFree()) { paymentClient.charge(u, price); seats.get(s).assign(u); } }`. The system becomes unusable under load. Why, and what's the fix?
A: The remote payment call (hundreds of ms to seconds) happens while holding the single lock, so every booking in the system waits for every other customer's payment: throughput collapses to one payment at a time. Fix: inside the lock only change state: mark the seat HELD for the user with an expiry and release the lock; charge outside the lock; then lock again briefly to confirm (HELD by this user → BOOKED) or release on failure/expiry.

[choose] Which lock design? (a) A price catalogue read 50,000 times per second and updated hourly. (b) Per-user rate-limit buckets for millions of users. (c) A small LRU cache where every get also moves the entry.
A: (a) Immutable snapshot published via a volatile field (or a read-write lock); readers never block. (b) Striped locks or a ConcurrentHashMap with atomic compute per user key. (c) A single lock around the cache: every get is a write (it reorders the list), so a read-write lock doesn't help; or segment the cache into N independently locked shards.

--- pitfalls
- Reading guarded state without the lock
- Doing I/O or calling callbacks while holding a lock
- Not unlocking in finally with explicit locks
- Locking on this, a public object or a string literal shared by other code
- Using a read-write lock for tiny or write-heavy critical sections

--- quiz
Q: What does `tryLock(100, MILLISECONDS)` return if the lock isn't free within 100 ms?
- Throws immediately
- Waits forever
- *false
- null
W: It lets the caller back off instead of blocking forever.
Q: Why can't you upgrade a ReentrantReadWriteLock read lock to a write lock while holding it?
- It's slower
- *Taking the write lock waits for all readers, including yourself: deadlock
- The API is deprecated
- Write locks are not reentrant
W: Release the read lock first and re-check.
Q: Best approach for data read constantly and rebuilt rarely?
- One synchronized block around every read
- *An immutable snapshot swapped through a volatile field
- A fair lock
- No synchronisation at all
W: Reads become lock-free and always see a consistent version.

--- sources
- book :: Java Concurrency in Practice, ch. 11 "Performance and scalability" and ch. 13 "Explicit locks" :: Brian Goetz et al. :: https://jcip.net/
- article :: ReentrantLock and ReentrantReadWriteLock :: Oracle Java SE 21 API :: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/locks/package-summary.html
- article :: StampedLock :: Oracle Java SE 21 API :: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/locks/StampedLock.html

=== condition-variables
blurb: How a thread waits efficiently for a condition to become true (an item in the queue, a free slot, a turn) instead of spinning: wait/notify, Condition objects, the "always wait in a while loop" rule, spurious and lost wake-ups, notify versus notifyAll, and building a bounded buffer.
signals: "Implement a blocking queue" | Workers that must sleep until there's work | "Print in order with three threads" / "alternate odd and even" | Waiting for a resource to become free (a spot, a connection)
widgets: seq-wait-notify

--- lesson
:::words
- **Busy waiting (spinning)**: checking a condition in a tight loop (`while (!ready) {}`), burning CPU while waiting.
- **Condition variable**: a place where threads wait, while holding a lock, until another thread signals that something they care about may have changed.
- **`wait()` / `notify()` / `notifyAll()`**: Java's built-in condition-variable methods on every object; must be called while holding that object's lock.
- **`Condition`**: the explicit version from a `ReentrantLock` (`await()`, `signal()`, `signalAll()`), allowing several separate waiting rooms per lock.
- **Spurious wake-up**: a thread returning from `wait()` without anyone signalling. Allowed by the specification.
- **Lost wake-up**: a signal sent before the waiting thread started waiting, so the waiter sleeps forever.
- **Predicate**: the condition a thread is waiting for ("queue not empty").
:::

## The problem in plain words

A consumer thread needs an item from a shared queue that's currently empty. It could check in a loop thousands of times a second (wasting a whole core) or sleep 100 ms between checks (adding latency). What it really wants is: **"put me to sleep, and wake me when someone adds an item."** A condition variable does exactly that, tied to a lock so the check and the decision to sleep can't race with the producer adding the item.

:::eli5
A restaurant pager. Instead of standing at the counter asking "is my table ready?" every few seconds, you take a pager and sit down. When a table frees up, the host buzzes the pagers; you come back and check that the table is really yours before sitting.
:::

## The pattern

```java
final class BoundedBuffer<T> {
  private final Object lock = new Object();
  private final Deque<T> items = new ArrayDeque<>();
  private final int capacity;

  void put(T x) throws InterruptedException {
    synchronized (lock) {
      while (items.size() == capacity) lock.wait();   // 1. wait IN A LOOP while the condition is false
      items.addLast(x);                               // 2. act while still holding the lock
      lock.notifyAll();                               // 3. wake waiters whose condition may now be true
    }
  }

  T take() throws InterruptedException {
    synchronized (lock) {
      while (items.isEmpty()) lock.wait();
      T x = items.removeFirst();
      lock.notifyAll();
      return x;
    }
  }
}
```

How `wait()` works: it **atomically releases the lock and sleeps**; when woken, it **re-acquires the lock** before returning. That atomic release-and-sleep is what prevents the lost wake-up: the producer can't add an item and notify in the gap between the consumer's check and its sleep, because the consumer still holds the lock during the check.

Step through the classic mistakes and the correct version:

[[widget:seq-wait-notify]]

## The rules, and why

1. **Always `wait` inside a `while` loop that re-checks the condition**, never an `if`. Reasons: spurious wake-ups happen; with `notifyAll`, several waiters wake but only one can take the item; and between being notified and re-acquiring the lock, another thread may have changed the state again.
2. **Check and wait while holding the lock** that guards the condition. Java enforces this (`IllegalMonitorStateException` otherwise), and it prevents lost wake-ups.
3. **Signal after changing the state, while holding the lock.**
4. **`notifyAll` unless you're sure `notify` is safe.** `notify` wakes one arbitrary waiter. If producers and consumers wait on the same object, `notify` might wake another producer when a consumer was needed, and everyone ends up asleep. `notify` is only safe when all waiters wait for the same condition and any one of them can make progress.

## Explicit Conditions: separate waiting rooms

```java
private final ReentrantLock lock = new ReentrantLock();
private final Condition notFull = lock.newCondition(), notEmpty = lock.newCondition();

void put(T x) throws InterruptedException {
  lock.lock();
  try {
    while (items.size() == capacity) notFull.await();
    items.addLast(x);
    notEmpty.signal();             // only consumers wait here, so waking one is enough
  } finally { lock.unlock(); }
}
T take() throws InterruptedException {
  lock.lock();
  try {
    while (items.isEmpty()) notEmpty.await();
    T x = items.removeFirst();
    notFull.signal();
    return x;
  } finally { lock.unlock(); }
}
```

Two conditions mean producers and consumers wait in separate rooms, so `signal()` (one) is safe and avoids waking threads that can't proceed. `await` also has timed versions (`awaitNanos`) for "wait at most 2 seconds".

## In real code, use the library

`java.util.concurrent` already provides blocking queues, semaphores, latches and barriers built this way (next chapter). Write your own condition logic in interviews (it's a favourite question) and for genuinely custom conditions; otherwise use `ArrayBlockingQueue` and friends.

## Interruption

`wait()` and `await()` throw `InterruptedException` when another thread calls `interrupt()` on the waiter: Java's cooperative cancellation. Don't swallow it: either propagate it, or restore the flag (`Thread.currentThread().interrupt()`) and return, so whoever is shutting down the thread can.

## What breaks

- **`if` instead of `while`** around `wait`.
- **Waiting or notifying without holding the lock.**
- **`notify` with mixed waiters** leading to everyone asleep.
- **Changing the state without signalling**, leaving waiters asleep.
- **Swallowing `InterruptedException`**, making threads impossible to stop.
- **Sleep-polling** (`Thread.sleep(100)` in a loop) instead of waiting.

## Interview angles

- "Implement a bounded blocking queue." The lock + two conditions version, with `while` loops; mention `ArrayBlockingQueue`.
- "Why while and not if?" Spurious wake-ups, multiple woken waiters, state changed before re-acquiring the lock.
- "Print 1..n alternately from two threads." A shared turn variable guarded by a lock, each thread waiting while it isn't its turn, `notifyAll` after printing.

--- revise
### Mechanism
? What problem does a condition variable solve? :: Sleeping until a condition may have become true, without busy-waiting or polling.
? What does wait() do atomically? :: Releases the lock and sleeps; on wake-up re-acquires the lock before returning.
? Why must the check and wait happen while holding the lock? :: So a signal can't slip in between the check and the sleep (lost wake-up).
? Spurious wake-up? :: Returning from wait() with no signal; allowed by the spec.

### Rules
? Why always wait in a while loop? :: Spurious wake-ups; several waiters woken by notifyAll; state may change before the lock is re-acquired.
? notify vs notifyAll? :: notify wakes one arbitrary waiter (safe only if all wait for the same condition); notifyAll wakes all (safe default).
? Advantage of explicit Conditions? :: Separate waiting rooms per condition (notFull, notEmpty), so signal() wakes only threads that can proceed.
? Correct handling of InterruptedException? :: Propagate it, or restore the interrupt flag and stop; never swallow.
? What to use in production instead of hand-written waits? :: java.util.concurrent: BlockingQueue, Semaphore, CountDownLatch, CyclicBarrier.

--- notes
## Why
Spinning wastes a core; sleep-polling adds latency. Wait until signalled.
## wait/notify
Hold the lock; while (!condition) lock.wait(); act; lock.notifyAll().
wait = atomic release-and-sleep, re-acquire on wake → no lost wake-ups.
IllegalMonitorStateException if not holding the lock.
## Rules
while not if (spurious, multiple woken, state changed).
Signal after changing state, holding the lock.
notifyAll by default; notify only with one kind of waiter.
## Conditions
lock.newCondition(): notFull, notEmpty; await/signal; awaitNanos for timeouts.
Separate rooms → signal() is safe.
## Interruption
await/wait throw InterruptedException: propagate or restore flag.
## In production
ArrayBlockingQueue, LinkedBlockingQueue, Semaphore, CountDownLatch, CyclicBarrier.
## Breakage
if-wait; no lock; notify with mixed waiters; missing signal; swallowed interrupts; sleep loops.

--- doubts
Q: Why would a thread wake up without being notified?
A: Some operating systems' waiting primitives can return early for efficiency reasons, and the Java specification allows it rather than paying to prevent it. Since you must re-check the condition anyway (other threads may have changed it), the `while` loop handles spurious wake-ups for free.

Q: Can I call notify before the other thread starts waiting?
A: You can, but the notification is lost: condition variables have no memory. That's harmless with the correct pattern, because the waiter checks the condition first (under the lock) and only waits if it's false. It's fatal with patterns that wait without checking, or that use a separate flag outside the lock.

Q: Is `Thread.sleep` ever right for waiting?
A: For deliberate delays (backoff before a retry, a test pacing itself), yes. For "wait until some other thread changes something", no: you'll either wake too often (wasting CPU) or too late (adding latency). Use a condition, a queue, a latch or a future.

Q: Why does `wait()` belong to `Object` rather than `Thread`?
A: Because you wait on a **condition associated with some shared object's lock**, not on a thread. Any object can serve as a lock (monitor), so every object carries `wait`/`notify`.

--- exercises
[design] Implement `class OddEven` where thread A prints odd numbers and thread B prints even numbers from 1 to n, strictly alternating.
A: Shared state: int next = 1; a lock object. Thread A loop: synchronized (lock) { while (next <= n && next % 2 == 0) lock.wait(); if (next > n) { lock.notifyAll(); break; } print(next); next++; lock.notifyAll(); }. Thread B identical with the condition next % 2 == 1. The while loops handle spurious wake-ups; notifyAll ensures the other thread wakes; the final notifyAll lets the other thread see next > n and exit instead of waiting forever.

[break] `synchronized T take() { if (items.isEmpty()) wait(); return items.removeFirst(); }` with two consumers and one producer using `notify()` after each put. Describe a failure.
A: Producer puts one item and calls notify(); both consumers were waiting; one wakes, but before it re-acquires the lock, the other consumer (woken spuriously, or arriving fresh and finding the item) takes it. The first consumer then returns from wait and, because of the if, calls removeFirst() on an empty deque: NoSuchElementException. Fix: while (items.isEmpty()) wait(); (and notifyAll() or separate conditions if producers also wait).

[choose] Hand-written wait/notify, an explicit Condition, or a library class? (a) A work queue between web threads and background workers. (b) "Wait until all 5 services have started, then open the port." (c) A parking-lot gate that waits until a spot of the right size is free, where sizes have separate waiting lines.
A: (a) A library BlockingQueue (bounded). (b) A CountDownLatch(5). (c) A ReentrantLock with one Condition per spot size (smallFree, regularFree, largeFree), so a released large spot wakes only trucks waiting for large spots; or per-size BlockingQueues of free spots.

--- pitfalls
- Using if instead of while around wait()
- Calling wait or notify without holding the lock
- notify() when different kinds of waiters share one condition
- Swallowing InterruptedException
- Polling with Thread.sleep instead of waiting on a condition

--- quiz
Q: What does `wait()` do with the lock?
- Keeps holding it while sleeping
- *Releases it atomically while sleeping and re-acquires it before returning
- Destroys it
- Nothing; wait doesn't need a lock
W: Atomic release-and-sleep prevents lost wake-ups.
Q: Why must wait() be in a while loop?
- For performance
- *Spurious wake-ups and competing waiters mean the condition may still be false
- Java requires a loop syntactically
- To release the lock
W: Always re-check the condition after waking.
Q: When is `notify()` (rather than `notifyAll()`) safe?
- Always
- Never
- *When all waiters wait for the same condition and any one can proceed
- Only with fair locks
W: Otherwise the wrong waiter may wake and everyone stalls.

--- sources
- book :: Java Concurrency in Practice, ch. 14 "Building custom synchronizers" :: Brian Goetz et al. :: https://jcip.net/
- article :: Condition (java.util.concurrent.locks) :: Oracle Java SE 21 API :: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/locks/Condition.html
- book :: Operating Systems: Three Easy Pieces, ch. 30 "Condition variables" :: Remzi and Andrea Arpaci-Dusseau :: https://pages.cs.wisc.edu/~remzi/OSTEP/threads-cv.pdf

=== deadlock
blurb: Deadlock (threads each holding what another needs, waiting forever), the four Coffman conditions and how breaking any one prevents it (lock ordering, tryLock with timeout, acquiring all at once), plus livelock and starvation, and how to find deadlocks with thread dumps.
signals: Operations that need two locks (transfer between accounts, moving an item between two inventories) | Nested synchronized calls across objects | A service that freezes under load with CPU near zero | "Dining philosophers"
widgets: deadlock-lab

--- lesson
:::words
- **Deadlock**: two or more threads each waiting for a resource another of them holds, so none can ever proceed.
- **Coffman conditions**: the four conditions that must all hold for a deadlock: mutual exclusion, hold and wait, no preemption, circular wait.
- **Lock ordering**: always acquiring multiple locks in one global order (for example by id), so no cycle can form.
- **Livelock**: threads keep reacting to each other (backing off, retrying) and stay busy, but none makes progress.
- **Starvation**: a thread never gets the resource it needs because others keep getting it first.
- **Thread dump**: a snapshot of what every thread is doing and which locks it holds or waits for (`jstack`, `jcmd Thread.print`).
:::

## The problem in plain words

Thread 1 locks account A, then wants account B. Thread 2 locks account B, then wants account A. Each holds what the other needs and waits politely forever. Nothing crashes; the CPU goes quiet; requests pile up until the service is restarted. Deadlocks are rare in testing and common in production, because they need two operations on the same pair of resources in opposite orders at nearly the same moment, which on a busy server happens.

:::eli5
Two cars meet head-on on a one-lane bridge. Each needs the other to reverse, and neither will. They can wait forever. A rule like "cars always go north first" (an order) would have prevented the standoff.
:::

Run the transfer race, then turn on lock ordering:

[[widget:deadlock-lab]]

## The four conditions (all must hold)

1. **Mutual exclusion:** a resource can be held by only one thread (locks).
2. **Hold and wait:** a thread holds one resource while waiting for another.
3. **No preemption:** a resource can't be taken away from its holder.
4. **Circular wait:** a cycle of threads, each waiting for the next one's resource.

**Break any one and deadlock is impossible.** The practical fixes map onto them:

| Fix | Breaks |
|---|---|
| **Global lock order** (always lock the lower account id first) | Circular wait |
| **`tryLock` with timeout**, release everything and retry after a random backoff | Hold and wait / no preemption |
| **Acquire all locks at once** (one coarse lock, or a lock manager granting a set atomically) | Hold and wait |
| **Avoid holding a lock while calling out** (to listeners, other services, other objects' synchronized methods) | Hold and wait (the hidden kind) |
| **Lock-free or single-owner designs** | Mutual exclusion |

## Lock ordering in code

```java
void transfer(Account from, Account to, Money amount) {
  if (from.id().equals(to.id())) throw new IllegalArgumentException("same account");
  Account first = from.id().compareTo(to.id()) < 0 ? from : to;
  Account second = first == from ? to : from;
  synchronized (first) {
    synchronized (second) {
      from.withdraw(amount);       // withdraw checks the balance and throws if insufficient
      to.deposit(amount);
    }
  }
}
```

Both transfers A→B and B→A now lock the lower id first, so they can't hold one each. The same idea works for any multi-resource operation: seats in a booking (lock in seat-id order), inventory moves, graph edits (node-id order).

## Hidden deadlocks

The obvious nested `synchronized` is easy to spot. The dangerous ones are hidden:

- **Calling out while holding a lock:** `synchronized void update() { ...; listener.onChange(); }` where the listener calls back into another object that locks and calls you. Rule: release locks before calling code you don't control.
- **Resource deadlocks beyond locks:** a thread pool where every thread waits for a subtask queued in the **same** full pool (thread-starvation deadlock); a database connection pool of 10 where each request holds one connection and needs a second.
- **Database deadlocks:** two transactions updating rows in opposite orders. Databases detect these and abort one transaction; your code must retry. The same ordering fix (update rows in key order) prevents them.

## Livelock and starvation

- **Livelock:** two threads using `tryLock` both fail, both back off for exactly the same time, both retry at the same moment, forever. Fix: **random** backoff (jitter).
- **Starvation:** a writer that never gets a read-write lock because readers keep arriving; a low-priority thread that never runs. Fix: fair locks, bounded queues, aging.

## Finding a deadlock in production

Symptoms: requests time out, thread count stable, CPU low. Take a **thread dump** (`jcmd <pid> Thread.print` or `jstack`): the JVM explicitly reports "Found one Java-level deadlock" with the threads and the locks each holds and waits for. `ThreadMXBean.findDeadlockedThreads()` can detect it programmatically for health checks. Timeouts on every wait (`tryLock` with a deadline, query timeouts) turn silent hangs into visible errors.

## What breaks

- **Locking two objects in argument order** (`transfer(a, b)` locks a then b).
- **Calling listeners or other services while holding a lock.**
- **Waiting without timeouts** anywhere in a request path.
- **Retrying with fixed backoff** (livelock).
- **Pools whose tasks wait on tasks in the same pool.**

## Interview angles

- "Transfer money between accounts concurrently." Lock both in id order; mention the database version (update in key order, retry on deadlock errors).
- "Dining philosophers." Number the forks and always pick the lower-numbered first (ordering), or allow at most four philosophers to sit (breaks the cycle), or use `tryLock` with random backoff.
- "The service hangs with zero CPU." Thread dump; look for the reported deadlock or threads all waiting on one pool.

--- revise
### Conditions
? What is a deadlock? :: Threads each holding a resource another needs, all waiting forever.
? The four Coffman conditions? :: Mutual exclusion, hold and wait, no preemption, circular wait.
? How many must you break? :: Any one prevents deadlock.
? Lock ordering breaks which condition? :: Circular wait.
? tryLock with timeout and backoff breaks which? :: Hold and wait / no preemption (release and retry).

### Practice
? Deadlock-free transfer? :: Lock both accounts in a global order (lower id first), then withdraw and deposit.
? Hidden deadlock sources? :: Calling listeners/other objects while holding a lock; tasks waiting on tasks in the same pool; connection pools; DB rows updated in different orders.
? Livelock and its fix? :: Threads keep backing off and retrying in sync without progress; add random jitter.
? Starvation and fixes? :: A thread never gets the resource; fair locks, bounded queues, aging.
? Diagnosing in production? :: Thread dump (jcmd Thread.print / jstack) reports Java-level deadlocks; ThreadMXBean.findDeadlockedThreads().

--- notes
## Deadlock
Each holds what another needs; silent hang; low CPU.
Coffman: mutual exclusion + hold-and-wait + no preemption + circular wait. Break one.
## Fixes
Global lock order (ids) → no cycle.
tryLock(timeout) + release all + random backoff.
Acquire all at once (coarse lock/lock manager).
No callouts while holding locks.
Lock-free / single owner.
## Transfer
first = lower id; synchronized(first){ synchronized(second){ withdraw; deposit } }. Reject same account.
## Hidden kinds
Listener callbacks; same-pool subtasks (thread starvation deadlock); connection pools; DB row order (DB aborts one: retry).
## Livelock / starvation
Livelock: synced retries → jitter. Starvation: fairness, bounded queues, aging.
## Diagnose
jcmd <pid> Thread.print / jstack; ThreadMXBean.findDeadlockedThreads(); timeouts everywhere.

--- doubts
Q: If the database detects deadlocks, why bother with ordering there?
A: Detection costs time (the database waits, then aborts a victim transaction), wastes the aborted work, and requires retry logic in every caller. Updating rows in a consistent order (by primary key) prevents most database deadlocks in the first place; keep the retry for the rest.

Q: Is a single global lock a good deadlock fix?
A: It removes deadlocks between those operations (there's only one lock), at the cost of all parallelism. It's a fine starting point and sometimes the right answer for low-throughput admin paths; for hot paths use fine-grained locks with ordering.

Q: How do I order locks when objects have no natural id?
A: Use any stable total order: `System.identityHashCode` with a tie-breaking extra lock for the rare equal hashes (the approach in *Java Concurrency in Practice*), or assign each object a sequence number at creation.

Q: Can deadlocks happen with only one lock?
A: Not between threads on a reentrant lock. A thread can still block itself forever on a non-reentrant lock (like `StampedLock` or a semaphore with one permit) by acquiring it twice, or by waiting for a condition that only it could make true.

--- exercises
[design] Solve the dining philosophers problem for 5 philosophers so that no deadlock occurs and no philosopher starves indefinitely.
A: Number forks 0–4. Each philosopher picks up the lower-numbered of their two forks first, then the higher (philosopher 4 takes fork 0 before fork 4). This breaks the circular wait, so no deadlock. With fair (FIFO) ReentrantLocks per fork, a waiting philosopher eventually gets each fork, so no indefinite starvation. Alternatives: a Semaphore(4) "waiter" so at most 4 try to eat at once (one always succeeds), or tryLock both forks with random backoff (no deadlock, but possible livelock without jitter).

[break] `class Inventory { synchronized void moveTo(Inventory other, Sku s, int n) { this.remove(s, n); other.add(s, n); } synchronized void add(Sku s, int n) {...} }`. Warehouses A and B move stock to each other at the same time. What happens, and how do you fix it?
A: A.moveTo(B) holds A's lock and calls B.add (needs B's lock); B.moveTo(A) holds B's lock and calls A.add (needs A's lock): deadlock. Fix: move the multi-object operation out of the objects into a coordinator that locks both inventories in a global order (by warehouse id) before removing and adding; or use tryLock on both with timeout and random backoff.

[choose] Which deadlock fix fits? (a) Moving money between two of millions of accounts. (b) An admin job that rearranges all floors of a parking lot once a night. (c) A rate limiter that calls a metrics listener while holding its lock, and the listener reads rate-limiter stats.
A: (a) Per-account locks acquired in id order. (b) One coarse lock (or pause new entries) for the rare global operation; simplicity beats parallelism here. (c) Don't call out while holding the lock: copy the data needed, release the lock, then notify the listener.

--- pitfalls
- Acquiring two locks in argument order rather than a global order
- Calling listeners, callbacks or other objects' synchronized methods while holding a lock
- Waits without timeouts on request paths
- Fixed (non-random) backoff after tryLock failures
- Tasks that block waiting for other tasks in the same bounded pool

--- quiz
Q: Which is NOT one of the four Coffman conditions?
- Hold and wait
- Circular wait
- No preemption
- *Fair scheduling
W: The four are mutual exclusion, hold and wait, no preemption, circular wait.
Q: Two threads transfer A→B and B→A. What prevents deadlock most simply?
- Make the fields volatile
- *Always lock the account with the smaller id first
- Use notifyAll
- Add Thread.sleep
W: A global order makes a cycle impossible.
Q: Two threads keep backing off and retrying at the same moment forever. This is…
- Deadlock
- *Livelock; add random jitter to the backoff
- Starvation
- A data race
W: Busy without progress, unlike a deadlock's silence.

--- sources
- paper :: System Deadlocks (1971) :: E. G. Coffman, M. Elphick, A. Shoshani :: https://dl.acm.org/doi/10.1145/356586.356588
- book :: Java Concurrency in Practice, ch. 10 "Avoiding liveness hazards" :: Brian Goetz et al. :: https://jcip.net/
- article :: ThreadMXBean.findDeadlockedThreads :: Oracle Java SE 21 API :: https://docs.oracle.com/en/java/javase/21/docs/api/java.management/java/lang/management/ThreadMXBean.html
- book :: Operating Systems: Three Easy Pieces, ch. 32 "Common concurrency problems" :: Remzi and Andrea Arpaci-Dusseau :: https://pages.cs.wisc.edu/~remzi/OSTEP/threads-bugs.pdf

=== atomics-cas
blurb: Lock-free building blocks: atomic variables and compare-and-set (CAS), the CAS retry loop, LongAdder for hot counters, AtomicReference for swapping immutable state, the ABA problem and how version stamps fix it, and when lock-free is (and isn't) worth it.
signals: Hot counters and sequence generators | "Without using locks…" | Swapping configuration or snapshots atomically | Rate limiters and ID generators under heavy concurrency
widgets: cas-lab

--- lesson
:::words
- **Atomic variable**: a variable whose read-modify-write operations happen as one indivisible step (`AtomicInteger`, `AtomicLong`, `AtomicReference`).
- **Compare-and-set (CAS)**, also compare-and-swap: "set the value to *new* only if it is still *expected*; tell me whether it worked", done as one CPU instruction.
- **Lock-free**: an algorithm where some thread always makes progress, even if others are paused (no thread can block the rest by holding a lock).
- **Contention**: many threads trying to update the same value at once, so many CAS attempts fail and retry.
- **ABA problem**: a value changes from A to B and back to A between your read and your CAS, so the CAS succeeds even though the world changed.
- **Version stamp**: a counter attached to a value that increases on every change, so A-then-B-then-A is detectable.
:::

## The problem in plain words

Locks work, but a thread holding a lock can be paused by the operating system and make everyone else wait. For a single variable (a counter, a pointer to the current config) there's a lighter tool built into every modern CPU: **compare-and-set**. Instead of "lock, change, unlock", you say "I read 41; set it to 42 **only if it's still 41**". If someone else changed it, your attempt fails, you re-read and try again. Nobody ever waits holding anything.

:::eli5
Editing a shared online document cell: you change "41" to "42", and the app says "someone else changed this cell since you loaded it; here's the new value, try again". You look, see "43", and change it to "44". No one locks the cell; you just retry when you lose the race.
:::

Watch several threads increment one value with CAS, and how retries grow with contention:

[[widget:cas-lab]]

## The CAS retry loop

```java
AtomicInteger seatsLeft = new AtomicInteger(100);

boolean reserve(int n) {
  while (true) {
    int cur = seatsLeft.get();                       // 1. read
    if (cur < n) return false;                       // 2. check
    if (seatsLeft.compareAndSet(cur, cur - n)) return true;   // 3. write only if unchanged
    // 4. lost the race: someone changed it; loop and re-read
  }
}
```

This is check-then-act made atomic without a lock: if another thread changed `seatsLeft` between steps 1 and 3, the CAS fails and the loop re-checks with the fresh value. Java packages common loops for you: `incrementAndGet()`, `addAndGet()`, `updateAndGet(x -> ...)`, `accumulateAndGet(...)`. The function passed to `updateAndGet` may run several times under contention, so it must be **side-effect free**.

## AtomicReference: swap whole immutable objects

```java
record Limits(int perMinute, int burst) {}
AtomicReference<Limits> limits = new AtomicReference<>(new Limits(600, 50));

limits.updateAndGet(l -> new Limits(l.perMinute() * 2, l.burst()));   // atomic, lock-free update
```

Combine immutable objects with an `AtomicReference` and you can update **several fields together** atomically: build a new object, CAS it in. This pattern (copy-on-write of an immutable snapshot) is the lock-free workhorse.

## Hot counters: LongAdder

When many threads hammer one `AtomicLong`, they all fight over one memory location: each CAS invalidates the others' cached copy, and failures pile up. `LongAdder` spreads the count across several internal cells (one per contending thread, roughly) and sums them when you read. Increments scale almost linearly; `sum()` is slightly slower and is not an atomic snapshot under concurrent updates. Use it for metrics and statistics; use `AtomicLong` when you need exact compare-and-set semantics (sequence numbers, "reserve if enough left").

## The ABA problem

CAS checks that the value **equals** what you read, not that **nothing happened**. In a lock-free stack:

1. Thread 1 reads top = A (next = B) and is paused.
2. Thread 2 pops A, pops B, pushes A back (top = A again, but next is now C).
3. Thread 1 resumes: `CAS(top, A, B)` succeeds (top is A!) and sets top to B, a node that was already removed. The stack is corrupted.

Fixes: attach a **version stamp** that increments on every change (`AtomicStampedReference`), so the CAS compares (A, version 7) and fails on (A, version 9); or never reuse nodes while a thread might hold a reference (garbage collection helps here, which is why ABA is rarer in Java than in C++, but it still bites with pooled objects and with plain values like counters that can return to a previous number).

## When lock-free is worth it

| Use atomics / CAS | Use a lock |
|---|---|
| A single variable or one immutable snapshot | Invariants across several mutable objects |
| Very short updates | Updates that do real work |
| Hot counters, sequence numbers, flags, config swaps | Anything involving collections you mutate in place |

Lock-free data structures beyond these (queues, maps) are hard to get right; use the library ones (`ConcurrentLinkedQueue`, `ConcurrentHashMap`) rather than writing your own. Under very heavy contention, CAS loops can even be slower than a good lock, because of wasted retries.

## What breaks

- **Two atomics updated separately** for one invariant (`count` and `total` can disagree in between).
- **Side effects inside `updateAndGet` functions** (they may run several times).
- **CAS loops with no backoff** under extreme contention, burning CPU.
- **ABA** with recycled objects or values.
- **Hand-written lock-free structures** in production code.

## Interview angles

- "Implement `reserve(n)` without locks." The CAS loop above.
- "ID generator for many threads." `AtomicLong.incrementAndGet()`; across machines, a different design (Snowflake-style ids, HLD chapter).
- "What's the ABA problem?" The stack example and stamped references.

--- revise
### CAS
? What does compareAndSet(expected, new) do? :: Atomically sets new only if the current value equals expected, returning whether it succeeded.
? The CAS retry loop? :: Read; check; CAS(read, new); on failure re-read and retry.
? Why must updateAndGet functions be side-effect free? :: They may run several times when CAS attempts fail.
? How to update several fields atomically without locks? :: Put them in an immutable object and CAS an AtomicReference to a new object.

### Choices and pitfalls
? LongAdder vs AtomicLong? :: LongAdder spreads increments over cells (scales under contention; sum not atomic); AtomicLong for exact CAS semantics.
? ABA problem? :: The value goes A→B→A between read and CAS, so the CAS succeeds though state changed.
? ABA fix? :: Version stamps (AtomicStampedReference) or never reusing objects still referenced.
? When prefer a lock over CAS? :: Invariants across several mutable objects, or updates doing real work.
? Can CAS be slower than a lock? :: Yes, under very heavy contention because of wasted retries.

--- notes
## Atomics
AtomicInteger/Long/Boolean/Reference: atomic read-modify-write; no lock held, ever.
CAS = one CPU instruction (cmpxchg on x86).
## Retry loop
cur = get(); if (cur < n) false; if (cas(cur, cur − n)) true; else retry.
Library loops: incrementAndGet, addAndGet, updateAndGet, accumulateAndGet (pure functions).
## AtomicReference
Swap immutable snapshots; multi-field atomic updates via new objects.
## LongAdder
Striped cells; scalable increments; sum() not a snapshot. Metrics/stats.
## ABA
A→B→A fools CAS; lock-free stack corruption.
Fix: AtomicStampedReference (value + version), no reuse of live nodes.
## When
Atomics: one variable/snapshot, tiny updates, counters, ids, flags, config.
Locks: multi-object invariants, real work. Use library concurrent structures.
## Breakage
Separate atomics for one invariant; side effects in update functions; no backoff; ABA; DIY lock-free.

--- doubts
Q: Is CAS "free" because it doesn't lock?
A: No. A CAS still forces the CPU core to get exclusive ownership of that memory's cache line, which costs tens of nanoseconds and much more when cores fight over it. Lock-free means no thread **waits holding** something, not that there's no cost.

Q: What does lock-free guarantee exactly?
A: That the system as a whole always makes progress: if many threads retry, at least one succeeds each round. An individual thread can still keep losing (starve) in theory. "Wait-free" is the stronger guarantee that every thread finishes in a bounded number of steps; it's rarer and harder.

Q: Is `ConcurrentHashMap` lock-free?
A: Mostly: reads are lock-free, and inserting into an empty bucket uses CAS; updates to a non-empty bucket briefly lock that bucket's first node. It's a practical mix, which is typical: real high-performance structures combine CAS fast paths with small locks.

Q: How is the database version of CAS written?
A: Optimistic concurrency with a version column: `UPDATE booking SET status = 'CONFIRMED', version = version + 1 WHERE id = ? AND version = ?`. Zero rows updated means someone else changed it; re-read and retry or report a conflict. The version column also fixes ABA.

--- exercises
[design] Implement a lock-free `TokenBucket` rate limiter (capacity C, refill R tokens per second) with `tryAcquire()` safe for many threads.
A: Keep state in an immutable record State(double tokens, long lastRefillNanos) inside an AtomicReference. tryAcquire(): loop { s = ref.get(); now = clock.nanos(); tokens = min(C, s.tokens + (now − s.last) × R / 1e9); if (tokens < 1) return false (optionally still CAS the refilled state); next = new State(tokens − 1, now); if (ref.compareAndSet(s, next)) return true; }. The two fields change together via one CAS on the reference; the refill computation is pure, so retries are safe. Inject the clock for tests.

[break] `AtomicLong hits = new AtomicLong(); AtomicLong totalLatency = new AtomicLong(); void record(long ms) { hits.incrementAndGet(); totalLatency.addAndGet(ms); } double avg() { return (double) totalLatency.get() / hits.get(); }`. What can a reader observe, and does it matter?
A: A reader can see hits incremented but totalLatency not yet updated (or the other way round), so avg() is momentarily slightly off; reading hits = 0 also divides by zero at start. For monitoring this is usually acceptable (say so) and LongAdder would scale better. If an exact pair is needed, put both in an immutable Stats record updated with AtomicReference.updateAndGet, or use a lock.

[choose] AtomicLong, LongAdder, AtomicReference, or a lock? (a) Page-view counter on every request. (b) Ticket ids that must be unique and increasing. (c) Swapping a feature-flag configuration loaded every minute. (d) Moving an item between two inventories.
A: (a) LongAdder. (b) AtomicLong.incrementAndGet(). (c) AtomicReference (or a volatile field) holding an immutable config. (d) A lock (or two, in order): the invariant spans two objects.

--- pitfalls
- Using separate atomics for values that must change together
- Side effects inside updateAndGet or accumulateAndGet functions
- CAS loops spinning without backoff under extreme contention
- Ignoring ABA when objects or values can recur
- Writing custom lock-free data structures instead of using the library

--- quiz
Q: `compareAndSet(41, 42)` when the current value is 43 returns…
- true and sets 42
- *false and changes nothing
- throws
- sets 43
W: It only writes if the current value matches the expected one.
Q: What problem does LongAdder solve?
- ABA
- *Contention on one hot counter, by spreading increments across cells
- Deadlock
- Visibility
W: Increments scale; sum() combines the cells.
Q: The ABA problem happens when…
- Two locks are taken in different orders
- *A value changes and changes back between a read and a CAS, so the CAS wrongly succeeds
- A thread is interrupted
- A volatile write is lost
W: Version stamps detect the intermediate change.

--- sources
- book :: Java Concurrency in Practice, ch. 15 "Atomic variables and nonblocking synchronization" :: Brian Goetz et al. :: https://jcip.net/
- article :: java.util.concurrent.atomic package :: Oracle Java SE 21 API :: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/atomic/package-summary.html
- paper :: Simple, Fast, and Practical Non-Blocking and Blocking Concurrent Queue Algorithms (1996) :: Maged Michael, Michael Scott :: https://www.cs.rochester.edu/~scott/papers/1996_PODC_queues.pdf
- article :: ABA problem :: Wikipedia :: https://en.wikipedia.org/wiki/ABA_problem
