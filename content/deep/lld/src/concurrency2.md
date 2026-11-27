=== producer-consumer
blurb: The producer–consumer pattern: decoupling threads that make work from threads that do it with a bounded blocking queue, the BlockingQueue API (put/take/offer/poll), backpressure when consumers fall behind, poison pills and graceful shutdown, and the single most-asked concurrency coding question: implement a bounded blocking queue.
signals: "Implement a bounded blocking queue" | Logging, email sending, image processing handed off to background workers | Bursty producers and slower consumers | "What happens when the consumers can't keep up?"
widgets: buffer-lab

--- lesson
:::words
- **Producer**: a thread that creates work items (requests, log lines, jobs).
- **Consumer**: a thread that takes items and processes them.
- **Buffer / queue**: where items wait between producer and consumer.
- **Bounded queue**: a queue with a maximum size. **Unbounded**: no limit (until memory runs out).
- **Blocking**: a call that waits (the thread sleeps) until it can complete: `put` waits for space, `take` waits for an item.
- **Backpressure**: slowing producers down when consumers can't keep up, instead of letting work pile up without limit.
- **Poison pill**: a special item put in the queue to tell a consumer to stop.
:::

## The problem in plain words

A web request wants to send a confirmation email. Sending takes a second; the user shouldn't wait for it. So the request thread **produces** an "email job" and hands it to background **consumer** threads through a queue, then answers the user immediately. The queue smooths bursts (a flash sale produces 10,000 emails in a minute; four workers send them over the next half hour) and decouples the two sides (producers don't know how many workers exist).

The hard questions are about the edges: what happens when the queue is **empty** (consumers should sleep, not spin), when it's **full** (producers should wait or be refused, not grow memory forever), and at **shutdown** (finish the queued work, then stop cleanly).

:::eli5
A bakery's display shelf. Bakers (producers) put trays on the shelf; shop assistants (consumers) take them to customers. If the shelf is full, bakers wait before baking more. If it's empty, assistants wait for the next tray. The shelf having a fixed size is what stops the bakery from drowning in bread on a quiet day.
:::

Change the rates and the queue size, and watch what fills up and who waits:

[[widget:buffer-lab]]

## BlockingQueue: the library version

```java
BlockingQueue<EmailJob> jobs = new ArrayBlockingQueue<>(1_000);   // bounded

// producer (request thread)
if (!jobs.offer(job, 50, TimeUnit.MILLISECONDS)) {
  throw new Overloaded("email queue full");          // shed load instead of waiting forever
}

// consumer (worker thread)
while (!Thread.currentThread().isInterrupted()) {
  EmailJob job = jobs.take();                        // sleeps while empty
  sender.send(job);
}
```

The four flavours of each operation:

| | Throws | Returns special value | Blocks | Times out |
|---|---|---|---|---|
| Insert | `add` | `offer` → false | `put` | `offer(x, t, unit)` |
| Remove | `remove` | `poll` → null | `take` | `poll(t, unit)` |

Implementations: `ArrayBlockingQueue` (bounded, one lock, array), `LinkedBlockingQueue` (optionally bounded, separate locks for head and tail, so a producer and a consumer don't block each other), `PriorityBlockingQueue` (unbounded, by priority), `DelayQueue` (items become available after a delay), `SynchronousQueue` (no capacity: each put waits for a take, a direct hand-off), `LinkedTransferQueue`.

## Writing one yourself (the interview version)

```java
final class BoundedBlockingQueue<T> {
  private final Deque<T> items = new ArrayDeque<>();
  private final int capacity;
  private final ReentrantLock lock = new ReentrantLock();
  private final Condition notFull = lock.newCondition(), notEmpty = lock.newCondition();

  BoundedBlockingQueue(int capacity) { if (capacity < 1) throw new IllegalArgumentException(); this.capacity = capacity; }

  void put(T x) throws InterruptedException {
    Objects.requireNonNull(x);
    lock.lock();
    try {
      while (items.size() == capacity) notFull.await();
      items.addLast(x);
      notEmpty.signal();
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

  int size() { lock.lock(); try { return items.size(); } finally { lock.unlock(); } }
}
```

Points that earn credit: `while` loops around `await`, two conditions so `signal()` wakes the right kind of waiter, `unlock` in `finally`, nulls rejected (so `null` can't be confused with "empty"), `InterruptedException` propagated, `size()` also locked. Follow-ups: timed `offer`/`poll` (`awaitNanos` in a loop with the remaining time), and a two-lock version (head and tail locks, like `LinkedBlockingQueue`) for more throughput. An alternative build uses two semaphores (`slots` = capacity, `items` = 0) plus a mutex.

## Bounded or unbounded?

An **unbounded** queue never blocks producers, which sounds friendly and is the classic outage: when consumers fall behind (a slow email provider), the queue grows until the process runs out of memory, and every queued job is lost in the crash. A **bounded** queue turns "too much work" into an explicit decision at the producer:

- **Block** (`put`): natural backpressure for internal pipelines.
- **Wait briefly, then fail** (`offer` with a timeout): for request threads that must answer the user.
- **Drop** (oldest or newest): for metrics or telemetry where losing some is acceptable.
- **Spill** to durable storage: for work that must never be lost (then it's really a message broker, HLD territory).

Size the bound from **how much delay is acceptable**: if consumers process 200 jobs/s and a job may wait at most 10 s, a capacity around 2,000 fits.

## Shutdown

To stop consumers cleanly after finishing queued work: put one **poison pill** per consumer (a sentinel object) at the end of the queue; each consumer that takes a pill exits. Or interrupt the consumer threads (`take` throws `InterruptedException`) if remaining items may be abandoned. Executors (thread-pools page) package this as `shutdown()` versus `shutdownNow()`.

## What breaks

- **Unbounded queues** hiding overload until memory runs out.
- **Busy-polling** (`while (queue.isEmpty()) {}`) instead of blocking.
- **`if` instead of `while`** around waits in a hand-written queue.
- **Producers blocked forever** on `put` while holding locks or request threads.
- **No shutdown path**: consumers stuck in `take` forever.

## Interview angles

- "Implement a bounded blocking queue." The lock + two conditions version; mention `ArrayBlockingQueue`.
- "Consumers are slower than producers." Bound the queue; choose block, fail fast, drop or spill; scale consumers if the bottleneck allows.
- "Make the logger asynchronous." Request threads `offer` log events into a bounded queue; one background thread writes batches; drop with a counter when full, never block the request.

--- revise
### Pattern
? What does producer–consumer decouple? :: Threads making work from threads doing it; smooths bursts and hides how many workers exist.
? BlockingQueue put vs offer vs offer(timeout)? :: put blocks until space; offer returns false if full; offer(t) waits up to t then returns false.
? take vs poll? :: take blocks until an item; poll returns null (or waits up to a timeout).
? ArrayBlockingQueue vs LinkedBlockingQueue? :: Array: bounded, one lock. Linked: optionally bounded, separate head/tail locks so producers and consumers don't block each other.
? SynchronousQueue? :: No capacity: each put waits for a take (direct hand-off).

### Design choices
? Why bound the queue? :: Unbounded queues hide overload until memory runs out and lose everything in the crash.
? Four choices when the queue is full? :: Block (backpressure), fail fast after a short wait, drop, or spill to durable storage.
? How to size the bound? :: Throughput × acceptable delay (200/s × 10 s ≈ 2,000).
? Key points of a hand-written blocking queue? :: while around await, notFull/notEmpty conditions, unlock in finally, reject nulls, propagate interrupts, lock size().
? Clean consumer shutdown? :: One poison pill per consumer after the real work, or interrupt if leftovers may be dropped.

--- notes
## Pattern
Producers → bounded queue → consumers. Decouples, smooths bursts.
## BlockingQueue API
Insert: add (throws) / offer (false) / put (blocks) / offer(t) (times out).
Remove: remove / poll (null) / take (blocks) / poll(t).
ArrayBQ (bounded, 1 lock), LinkedBQ (2 locks), PriorityBQ, DelayQueue, SynchronousQueue.
## Hand-written
lock + notFull + notEmpty; while(size==cap) notFull.await(); add; notEmpty.signal().
while(empty) notEmpty.await(); remove; notFull.signal(). finally unlock; no nulls; locked size().
Alt: two semaphores (slots, items) + mutex.
## Full queue policy
Block / fail fast (offer timeout) / drop / spill durable. Bound = rate × acceptable delay.
## Shutdown
Poison pill per consumer; or interrupt.
## Breakage
Unbounded; busy polling; if-await; blocked producers holding resources; no shutdown.

--- doubts
Q: Why reject null items?
A: Because `poll()` returns null to mean "empty". If null could also be a real item, callers couldn't tell the two apart. Java's blocking queues all reject null for this reason.

Q: How many consumers should there be?
A: Enough to keep up with the average production rate, given what each item costs: I/O-bound items (sending emails) want many consumers, CPU-bound items about one per core. If the downstream system (an email provider with a rate limit) is the real bottleneck, more consumers don't help; respect its limit and let the bounded queue apply backpressure.

Q: Does an in-memory queue lose work on a crash?
A: Yes: everything in it disappears. For work that must survive restarts (payments, emails that must be sent), write it durably first (an outbox table, a message broker like Kafka or Pub/Sub) and use in-memory queues only as a short hand-off inside one process.

Q: Is `LinkedBlockingQueue` without a capacity unbounded?
A: Yes, its default capacity is `Integer.MAX_VALUE`, which is effectively unbounded and a common source of out-of-memory outages (it's also what `Executors.newFixedThreadPool` uses). Always pass a capacity.

--- exercises
[design] An app's request threads must log every request, but writing to disk takes 2–20 ms and must never slow requests. Design the asynchronous logger.
A: Request threads build an immutable LogEvent and call queue.offer(event) on a bounded ArrayBlockingQueue (say 50,000): never put, so a full queue never blocks a request; on failure increment a droppedEvents counter (and periodically log how many were dropped). One writer thread drains with take() then drainTo(batch, 500) and writes the batch in one I/O call, flushing every 100 ms or 500 events. Shutdown: stop accepting, put a poison pill, wait for the writer to drain and flush (with a timeout). ERROR-level events could use a short offer timeout to reduce the chance of losing them.

[break] `class Q { List<Integer> items = new ArrayList<>(); synchronized void put(int x) { items.add(x); notify(); } synchronized int take() throws InterruptedException { if (items.isEmpty()) wait(); return items.remove(0); } }`. List the problems.
A: Unbounded: producers never wait, so memory can grow without limit. take uses if, not while: a spurious wake-up or a competing consumer leads to remove(0) on an empty list (exception). notify() wakes one arbitrary waiter (fine here only because only consumers wait, but fragile once put also waits). remove(0) on an ArrayList is O(n): use an ArrayDeque. No timeout variants, no shutdown path.

[estimate] Consumers process 400 jobs/s in total. A burst brings 20,000 jobs in 10 s, and jobs may wait at most 30 s. What queue capacity, and what happens during the burst?
A: Acceptable backlog ≈ 400 × 30 = 12,000 jobs, so capacity ~12,000. During the burst, 2,000 jobs/s arrive and 400/s leave: the queue grows by 1,600/s and fills in about 7.5 s. For the last ~2.5 s, producers get rejected (offer fails) or wait, about 4,000 jobs in total. Either accept that shedding, add consumers (if downstream allows), or move the burst into a durable queue that can absorb it.

--- pitfalls
- Unbounded queues between fast producers and slow consumers
- Polling queues in a loop instead of blocking with take
- Waiting with if instead of while in a hand-written queue
- Request threads blocking indefinitely on put
- No shutdown mechanism for consumer threads

--- quiz
Q: The queue is full. Which call returns false immediately instead of waiting?
- put
- *offer
- take
- add (it throws)
W: offer reports failure; put blocks; add throws.
Q: Why prefer a bounded queue?
- It's faster
- *It turns overload into an explicit choice (block, fail, drop) instead of growing until memory runs out
- It never blocks
- It's required by Java
W: Unbounded queues hide overload until a crash.
Q: Which queue hands each item directly from producer to consumer with no storage?
- ArrayBlockingQueue
- LinkedBlockingQueue
- *SynchronousQueue
- DelayQueue
W: A put waits for a matching take.

--- sources
- book :: Java Concurrency in Practice, ch. 5.3 "Blocking queues and the producer-consumer pattern" :: Brian Goetz et al. :: https://jcip.net/
- article :: BlockingQueue :: Oracle Java SE 21 API :: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/BlockingQueue.html
- book :: Operating Systems: Three Easy Pieces, ch. 30 (producer/consumer, bounded buffer) :: Remzi and Andrea Arpaci-Dusseau :: https://pages.cs.wisc.edu/~remzi/OSTEP/threads-cv.pdf

=== sync-primitives
blurb: The coordination tools beyond locks: semaphores (N permits: limit concurrency, build pools and bounded resources), countdown latches (wait until N things have happened), cyclic barriers and phasers (threads meet at a point before continuing), and exchangers, with what each is for.
signals: "At most 10 concurrent calls to this service" | "Start all threads at the same moment" / "wait until all workers are ready" | Parallel phases where every worker must finish phase 1 before phase 2 | Printing in a fixed order across threads
widgets: seq-latch

--- lesson
:::words
- **Semaphore**: a counter of permits. `acquire()` takes one (waiting if none are left); `release()` gives one back.
- **Binary semaphore**: a semaphore with one permit, similar to a lock but without an owner (any thread may release).
- **CountDownLatch**: a one-time gate that opens when a counter reaches zero; threads `await()` it, others `countDown()`.
- **CyclicBarrier**: a meeting point for a fixed number of threads; each waits until all have arrived, then all continue; reusable for the next round.
- **Phaser**: a flexible, reusable barrier where the number of parties can change.
- **Permit**: one unit of the thing a semaphore counts (a connection, a slot, a "you may proceed").
:::

## The problem in plain words

Locks answer "one at a time". Real coordination needs other shapes: "**at most 10** at a time" (don't open more than 10 connections to the payment provider), "**wait until** these 5 services have started", "**everyone meets here** before the next round". `java.util.concurrent` provides a ready-made, well-tested tool for each, built on the condition-variable machinery from the previous chapter. Using the right one turns 30 lines of fragile wait/notify into 3 lines.

:::eli5
A semaphore is a car park with a "spaces left: 10" sign: you enter only if the number is above zero. A latch is a starting gun: runners wait at the line until it fires once. A barrier is a tour group: at each stop, nobody moves on until the whole group has arrived.
:::

## Semaphore: limit concurrency

```java
final class ThrottledClient {
  private final Semaphore permits = new Semaphore(10);       // at most 10 calls in flight
  private final PaymentClient inner;

  Result charge(Request r) throws InterruptedException, TimeoutException {
    if (!permits.tryAcquire(200, TimeUnit.MILLISECONDS)) throw new TimeoutException("too busy");
    try { return inner.charge(r); }
    finally { permits.release(); }                              // always give it back
  }
}
```

Uses: limiting calls to a fragile dependency (a bulkhead), bounding resource pools, bounding in-flight work in a pipeline, and building a bounded buffer (one semaphore for free slots, one for items). Unlike a lock, a semaphore has **no owner**: one thread can acquire and another release, which is what makes it useful for signalling ("thread A releases, thread B was waiting to acquire").

## CountDownLatch: wait for N events

```java
CountDownLatch ready = new CountDownLatch(3);
for (Service s : List.of(db, cache, search)) {
  executor.submit(() -> { s.start(); ready.countDown(); });
}
if (!ready.await(30, TimeUnit.SECONDS)) throw new IllegalStateException("services didn't start");
server.openPort();
```

One-shot: once it reaches zero it stays open; it can't be reset. The classic testing trick uses a latch of **1** as a **starting gun**: all worker threads `await()` it, the test calls `countDown()` once, and they all start together, maximising the chance of exposing races.

## CyclicBarrier: meet, then continue together

```java
CyclicBarrier endOfRound = new CyclicBarrier(4, () -> grid.swapBuffers());   // action runs once per round
Runnable worker = () -> {
  while (!done) {
    computeMyQuarter(grid);
    endOfRound.await();        // wait until all 4 quarters are computed, then the next round starts
  }
};
```

Reusable round after round; the optional barrier action runs once when the last thread arrives (here: switch buffers before the next round). If one thread fails or times out, the barrier **breaks** and the others get `BrokenBarrierException` rather than waiting forever. Typical use: parallel simulations, iterative algorithms, multi-phase batch jobs. **Phaser** generalises it (parties can register and leave between phases).

## Choosing

| Need | Tool |
|---|---|
| Only one thread at a time, with ownership | Lock |
| At most N at a time | Semaphore(N) |
| Wait until N things have happened, once | CountDownLatch(N) |
| N threads meet repeatedly at a point | CyclicBarrier(N) |
| Variable number of parties, multiple phases | Phaser |
| Hand a result from one task to its waiter | Future / CompletableFuture (thread-pools page) |

Compare a latch and a barrier in motion:

[[widget:seq-latch]]

## What breaks

- **Forgetting `release()`** on an exception path (use `finally`): permits leak until the semaphore is empty and everything hangs.
- **Releasing more than acquired**: the semaphore silently gains permits (it doesn't check ownership).
- **A latch counted down fewer times than its count** (a worker crashed): `await` without a timeout hangs forever.
- **Barrier parties that never arrive**: always use timeouts and handle `BrokenBarrierException`.
- **Using a latch where you need a reusable barrier**, or vice versa.

## Interview angles

- "Limit concurrent calls to the payment provider to 20." `Semaphore(20)` with `tryAcquire` timeout (a bulkhead).
- "Write a test that starts 100 threads at exactly the same time." A start latch of 1 plus a done latch of 100.
- "Print 'foo' then 'bar' alternately from two threads." Two semaphores: `fooTurn = 1`, `barTurn = 0`; each thread acquires its own and releases the other's.

--- revise
### Tools
? Semaphore? :: A counter of permits: acquire takes one (waits if none), release returns one. Limits concurrency to N.
? How does a semaphore differ from a lock? :: No owner: any thread can release, so it can signal between threads; and it allows N, not 1.
? CountDownLatch? :: A one-shot gate opening when countDown() has been called N times; threads await() it.
? Latch of 1 in tests? :: A starting gun: all workers await, one countDown releases them simultaneously.
? CyclicBarrier? :: N threads wait for each other at a point, then continue; reusable each round; optional action when the last arrives.
? What happens if a barrier party fails? :: The barrier breaks; others get BrokenBarrierException.
? Phaser? :: A reusable barrier whose number of parties can change between phases.

### Pitfalls
? Semaphore leak? :: Missing release on an exception path: use finally.
? Over-release? :: Releasing more than acquired silently adds permits.
? Hanging latch? :: Counted down fewer than N times; always await with a timeout.

--- notes
## Semaphore(N)
acquire/tryAcquire(timeout) … finally release. No owner.
Uses: bulkheads (limit calls), pools, in-flight bounds, bounded buffer (slots + items), turn-taking signals.
## CountDownLatch(N)
countDown ×N → await returns. One-shot. Start gun (N=1) + done latch in tests. Await with timeout.
## CyclicBarrier(N, action)
await() until all N arrive; action once per round; reusable. BrokenBarrierException on failure/timeout.
## Phaser
Dynamic parties, phases.
## Choose
1 at a time → lock. ≤N → semaphore. Wait for N events once → latch. Meet repeatedly → barrier. Variable → phaser. Result hand-off → future.
## Breakage
Leaked permits; over-release; latch never reaching zero; missing barrier party; wrong tool.

--- doubts
Q: Can a semaphore with one permit replace a lock?
A: It provides mutual exclusion, but it isn't reentrant (a thread acquiring twice blocks itself), has no owner (another thread could release it by mistake) and has no condition variables. Use a lock for mutual exclusion; use a binary semaphore when you specifically need signalling across threads.

Q: Should semaphores be fair?
A: `new Semaphore(n, true)` grants permits in arrival order, preventing a thread from being overtaken forever. It costs some throughput. Use fairness for user-facing request limiting where starvation would show up as stuck requests; leave it off for internal throughput-oriented work.

Q: What's the difference between a latch and `Thread.join()`?
A: `join` waits for a thread to **terminate**. A latch waits for **events**, which can come from any threads (or tasks in a pool whose threads never terminate) and can mean anything ("connected", "loaded", "ready"), not just "finished".

--- exercises
[design] Implement `class FooBar` where one thread calls `foo()` n times and another calls `bar()` n times, and the output must be "foobarfoobar…" exactly.
A: Semaphore fooTurn = new Semaphore(1), barTurn = new Semaphore(0). foo loop: fooTurn.acquire(); print("foo"); barTurn.release(). bar loop: barTurn.acquire(); print("bar"); fooTurn.release(). Each thread can only proceed when the other has handed it the turn; the permits encode whose turn it is. Interrupts propagate (InterruptedException).

[break] `semaphore.acquire(); Result r = client.call(req); semaphore.release(); return r;` After a few hours of occasional client timeouts, every call hangs. Why?
A: When client.call throws (a timeout), release() is skipped, so a permit leaks each time. After enough failures all permits are gone and every acquire() waits forever. Fix: acquire, then try { return client.call(req); } finally { semaphore.release(); }, and prefer tryAcquire with a timeout so callers fail fast instead of hanging if permits ever do run out.

[choose] Semaphore, CountDownLatch, CyclicBarrier or a lock? (a) "Don't start accepting traffic until the cache is warm and the config is loaded." (b) At most 5 concurrent image conversions. (c) 8 worker threads each process one slice of a grid per time step, and none may start step k+1 until all finished step k. (d) Protect a map's put and get.
A: (a) CountDownLatch(2). (b) Semaphore(5). (c) CyclicBarrier(8), with the buffer swap as the barrier action. (d) A lock (or a concurrent map).

--- pitfalls
- Acquiring a semaphore without releasing it in finally
- Releasing more permits than were acquired
- Waiting on a latch or barrier with no timeout
- Using a one-shot latch where rounds repeat
- Using a binary semaphore where a reentrant lock is needed

--- quiz
Q: Which tool limits a service to at most 20 concurrent calls?
- CountDownLatch(20)
- *Semaphore(20)
- CyclicBarrier(20)
- ReentrantLock
W: Permits bound how many are in flight.
Q: A CountDownLatch that has reached zero…
- Resets automatically
- *Stays open; it can't be reused
- Throws on await
- Becomes a barrier
W: Latches are one-shot.
Q: What do the other threads at a CyclicBarrier get if one party times out?
- Nothing, they keep waiting
- *BrokenBarrierException
- InterruptedException always
- A new barrier
W: A broken barrier releases everyone with an exception.

--- sources
- book :: Java Concurrency in Practice, ch. 5.5 "Synchronizers" :: Brian Goetz et al. :: https://jcip.net/
- article :: java.util.concurrent package summary (Semaphore, CountDownLatch, CyclicBarrier, Phaser) :: Oracle Java SE 21 API :: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/package-summary.html
- book :: The Little Book of Semaphores :: Allen B. Downey :: https://greenteapress.com/wp/semaphores/

=== thread-pools
blurb: Why programs use thread pools instead of creating threads, how Java's ThreadPoolExecutor works (core and maximum threads, the work queue, rejection policies), sizing pools, futures for results, shutdown, and the traps: unbounded queues, thread-starvation deadlock and lost exceptions.
signals: "How would you run these tasks in the background?" | Designing a job scheduler or worker system | "What happens when tasks arrive faster than they're processed?" | Executors.newFixedThreadPool in code review
widgets: pool-lab

--- lesson
:::words
- **Thread pool**: a fixed or bounded set of threads that take tasks from a queue and run them, reused task after task.
- **Executor / ExecutorService**: Java's interface for "something that runs tasks"; you `submit` work and it decides which thread runs it.
- **Task**: a unit of work: a `Runnable` (no result) or a `Callable<T>` (returns a T, may throw).
- **Future**: a handle to the result of a task that may not have finished: `get()` waits for it.
- **Core / maximum pool size**: the threads kept alive normally / the most the pool may grow to.
- **Rejection policy**: what the pool does with a task when its queue is full and it can't add threads.
- **Thread-starvation deadlock**: every pool thread waiting for a task that is stuck in the same pool's queue.
:::

## The problem in plain words

Creating a thread per task is expensive (memory for its stack, time to start it, scheduler load) and unbounded: a burst of 10,000 tasks creates 10,000 threads and the machine falls over. A **thread pool** keeps a bounded team of threads alive and feeds them tasks through a queue. Creation cost is paid once, concurrency is capped, and the queue absorbs bursts. Almost every server, background worker and scheduler is built on one.

:::eli5
A taxi rank. Instead of buying a new car for each passenger, a fixed number of taxis wait at the rank; passengers queue; each free taxi takes the next passenger and comes back. If the queue gets too long, the rank manager has to decide: call in extra taxis, tell new passengers to walk, or make them wait.
:::

## How ThreadPoolExecutor decides

```java
ThreadPoolExecutor pool = new ThreadPoolExecutor(
    8,                                   // core threads
    32,                                  // maximum threads
    60, TimeUnit.SECONDS,                // extra threads above core die after 60 s idle
    new ArrayBlockingQueue<>(1_000),     // bounded work queue
    new NamedThreadFactory("img-worker"),
    new ThreadPoolExecutor.CallerRunsPolicy());   // when saturated: the submitting thread runs the task
```

When a task arrives:

1. Fewer than **core** threads running → start a new thread for it.
2. Otherwise → put it in the **queue**.
3. Queue full and fewer than **max** threads → start an extra thread.
4. Queue full and at max → **reject** with the policy: `AbortPolicy` (throw `RejectedExecutionException`, the default), `CallerRunsPolicy` (the caller runs it, which slows the producer: natural backpressure), `DiscardPolicy` / `DiscardOldestPolicy` (drop silently; rarely right).

A surprising consequence: with an **unbounded** queue the pool never grows past core size (step 3 never happens), and nothing is ever rejected, so overload becomes an ever-growing queue. Feed tasks into a pool and watch these rules play out:

[[widget:pool-lab]]

## The Executors factory methods, with care

- `Executors.newFixedThreadPool(n)`: n threads, **unbounded** `LinkedBlockingQueue`. Fine for trusted, bounded workloads; dangerous for anything driven by external traffic.
- `Executors.newCachedThreadPool()`: no queue (a `SynchronousQueue`), **unbounded threads**. A burst creates a thread per task.
- `Executors.newSingleThreadExecutor()`: one thread, unbounded queue: tasks run one at a time in order (useful for serialising work).
- `Executors.newScheduledThreadPool(n)`: delays and periodic tasks (timers page).
- `Executors.newVirtualThreadPerTaskExecutor()`: a virtual thread per task (async page).

Google's and many companies' style guides prefer constructing `ThreadPoolExecutor` explicitly with a **bounded queue and a named thread factory**, so overload and thread dumps are understandable.

## Futures: getting results back

```java
Future<Thumbnail> f = pool.submit(() -> render(image));      // Callable
Thumbnail t = f.get(2, TimeUnit.SECONDS);                     // wait, with a timeout
```

- `get()` blocks until done; always prefer the timed version on request paths.
- An exception thrown by the task comes back wrapped in `ExecutionException` from `get()`. If nobody calls `get()`, a failure from `submit` is **silently lost**; tasks run with `execute()` print to the thread's uncaught-exception handler instead. Log inside tasks or always check futures.
- `invokeAll` runs a batch and waits for all; `invokeAny` returns the first success.
- `CompletableFuture` (async page) composes results without blocking threads.

## Sizing

From the threads page: **CPU-bound ≈ cores**, **I/O-bound ≈ cores × (1 + wait/compute)**. Separate pools for different kinds of work (a small CPU pool for image resizing, a large I/O pool for outbound calls) so a flood of one kind can't starve the other: the **bulkhead** idea.

## Shutdown

```java
pool.shutdown();                                       // no new tasks; finish queued ones
if (!pool.awaitTermination(30, TimeUnit.SECONDS)) {
  List<Runnable> dropped = pool.shutdownNow();         // interrupt running tasks, return queued ones
}
```

Tasks must respond to interruption (check `Thread.interrupted()`, propagate `InterruptedException`) or `shutdownNow` can't stop them. Pool threads are non-daemon by default: forgetting to shut a pool down can keep the JVM alive.

## Thread-starvation deadlock

```java
ExecutorService pool = Executors.newFixedThreadPool(4);
pool.submit(() -> {
  Future<A> a = pool.submit(this::loadA);      // subtask into the SAME pool
  return combine(a.get());                     // waits
});
```

If four outer tasks occupy all four threads and each waits for a subtask sitting in the queue, nothing ever runs: a deadlock with no locks at all. Fixes: don't block on tasks in the same bounded pool; use separate pools per level; or compose asynchronously (`CompletableFuture.thenCombine`) so threads don't wait; or use a `ForkJoinPool`, whose `join()` lets the waiting thread run other tasks.

## What breaks

- **Unbounded queues** (`newFixedThreadPool`) or **unbounded threads** (`newCachedThreadPool`) for external traffic.
- **Lost exceptions** from `submit` without `get`.
- **Untimed `get()`** on request paths.
- **One shared pool** for CPU work, blocking I/O and scheduled jobs.
- **Tasks waiting on tasks** in the same pool.
- **No shutdown**, or tasks that ignore interruption.

## Interview angles

- "Design a thread pool / task scheduler from scratch." Workers looping on a `BlockingQueue.take()`, a bounded queue, rejection policy, shutdown with poison pills or interrupts, futures for results.
- "Tasks arrive faster than they finish." Bounded queue + rejection (CallerRuns for backpressure, or fail fast with a clear error) and metrics on queue depth.
- "Our service hung with zero CPU." Thread dump: all pool threads in `Future.get()` waiting for queued subtasks.

--- revise
### Mechanics
? Why use a thread pool? :: Reuse threads (avoid creation cost), cap concurrency, and absorb bursts in a queue.
? ThreadPoolExecutor's order of decisions? :: Below core → new thread; else queue; queue full and below max → extra thread; else reject.
? Effect of an unbounded queue on a ThreadPoolExecutor? :: Never grows past core size and never rejects: overload becomes an ever-growing queue.
? Four rejection policies? :: Abort (throw), CallerRuns (caller executes: backpressure), Discard, DiscardOldest.
? What's dangerous about newFixedThreadPool and newCachedThreadPool? :: Fixed: unbounded queue. Cached: unbounded threads.

### Results and failure
? What happens to an exception thrown in a submitted task nobody calls get() on? :: It's captured in the Future and silently lost.
? Future.get() best practice? :: Use the timed version on request paths; unwrap ExecutionException.
? shutdown vs shutdownNow? :: shutdown finishes queued tasks and refuses new; shutdownNow interrupts running tasks and returns queued ones.
? Thread-starvation deadlock? :: All pool threads block waiting for subtasks queued in the same pool; fix with separate pools, async composition, or ForkJoinPool.
? Bulkhead with pools? :: Separate pools per kind of work so one flood can't starve the others.

--- notes
## Why
Thread per task: costly + unbounded. Pool: reuse, cap, queue bursts.
## ThreadPoolExecutor
core → queue → extra up to max → reject. keepAlive for extras. Named ThreadFactory.
Unbounded queue → never beyond core, never rejects.
Rejection: Abort (default), CallerRuns (backpressure), Discard, DiscardOldest.
## Executors
Fixed: unbounded queue. Cached: unbounded threads. Single: serialised. Scheduled. VirtualThreadPerTask.
Prefer explicit TPE with bounded queue for external traffic.
## Futures
submit(Callable) → Future; get(timeout); ExecutionException wraps failures; unchecked submit failures vanish.
invokeAll / invokeAny; CompletableFuture for composition.
## Sizing / bulkheads
CPU ≈ cores; I/O ≈ cores × (1 + wait/compute). Separate pools per workload.
## Shutdown
shutdown → awaitTermination(t) → shutdownNow (interrupts). Tasks must honour interrupts. Non-daemon threads keep JVM alive.
## Starvation deadlock
Tasks blocking on same-pool subtasks. Separate pools / async composition / ForkJoinPool.

--- doubts
Q: Why does CallerRunsPolicy create backpressure?
A: When the pool is saturated, the thread that called `execute` (say, the thread reading requests from a socket) has to run the task itself. While it's busy doing that, it isn't submitting new tasks or accepting new connections, so the producer naturally slows to the pool's pace. It's simple and effective for internal pipelines; for user-facing request threads, failing fast with a clear "busy" error is often better.

Q: What is ForkJoinPool and when is it used?
A: A pool designed for divide-and-conquer tasks that split into subtasks (`fork`) and wait for them (`join`). Each thread has its own deque of tasks, and idle threads **steal** work from busy ones. A thread waiting in `join` runs other tasks meanwhile, avoiding starvation deadlock. It backs parallel streams and is the default executor for `CompletableFuture` async methods.

Q: Should I ever block inside a pool thread?
A: Blocking I/O in an I/O-sized pool is normal (that's what the extra threads are for). Blocking on **other tasks in the same pool**, or doing long blocking calls in a small CPU-sized pool or in the common `ForkJoinPool`, is the problem: it starves everything else that shares the pool.

Q: How do I monitor a pool?
A: Export queue size, active count, completed task count and rejection count (`ThreadPoolExecutor` exposes these) as metrics, and alert on growing queue depth or rejections. Named threads make thread dumps readable.

--- exercises
[design] Design a background job runner for a web app: jobs (send email, resize image, call a webhook) arrive from request threads; image resizing is CPU-heavy; webhooks can take 10 s; the app must not fall over during a burst of 100,000 jobs.
A: Separate bounded executors (bulkheads): an image pool of size ≈ cores with a bounded queue (e.g. 500); an I/O pool for email and webhooks sized by wait/compute (e.g. 64 threads) with a bounded queue (e.g. 5,000) and per-call timeouts (webhooks 10 s). Request threads submit with a rejection policy that fails fast (AbortPolicy caught and turned into "accepted later" by writing the job to a durable table instead), so a burst spills to storage rather than memory. A small poller feeds durable jobs into the pools as capacity frees. Named thread factories; metrics for queue depth, rejections and latency; graceful shutdown with awaitTermination. Failed jobs are retried with backoff and idempotency keys.

[break] `ExecutorService pool = Executors.newFixedThreadPool(10); for (Order o : orders) pool.submit(() -> process(o));` Some orders silently never complete, and under load the service runs out of memory. Explain both.
A: Silent failures: submit() captures any exception in the returned Future, which is ignored, so failed orders vanish without a log. Fix: log inside the task (try/catch), or keep and check the futures, or use execute() with an uncaught-exception handler. Out of memory: newFixedThreadPool uses an unbounded LinkedBlockingQueue, so when processing is slower than submission, queued tasks (each holding an Order) pile up until the heap is exhausted. Fix: an explicit ThreadPoolExecutor with a bounded queue and a deliberate rejection policy, plus queue-depth metrics.

[choose] Which pool setup? (a) Resize uploaded images, CPU-bound. (b) Fan out 20 calls to different microservices per request, each ~50 ms of waiting. (c) Tasks that must run strictly one at a time, in submission order.
A: (a) A fixed pool of ≈ number of cores with a bounded queue. (b) A large I/O pool (or virtual threads) with per-call timeouts, or async clients with CompletableFuture so threads don't wait. (c) A single-thread executor (newSingleThreadExecutor, ideally with a bounded queue).

--- pitfalls
- Using newFixedThreadPool or newCachedThreadPool for traffic-driven work
- Ignoring futures, so task exceptions disappear
- Untimed Future.get() on request paths
- Blocking on subtasks submitted to the same bounded pool
- Sharing one pool between CPU-heavy, blocking I/O and scheduled work

--- quiz
Q: A ThreadPoolExecutor has core 4, max 16 and an unbounded queue. Under heavy load, how many threads does it run?
- 16
- *4: the queue never fills, so it never grows beyond core
- 1
- Unlimited
W: Extra threads are only created when the queue is full.
Q: Which rejection policy slows the producer down?
- AbortPolicy
- *CallerRunsPolicy
- DiscardPolicy
- DiscardOldestPolicy
W: The submitting thread runs the task itself.
Q: Every thread in a pool of 4 is blocked in future.get() waiting for subtasks queued in the same pool. This is…
- A livelock
- *Thread-starvation deadlock
- A data race
- Normal operation
W: No thread is free to run the subtasks.

--- sources
- book :: Java Concurrency in Practice, ch. 6 "Task execution" and ch. 8 "Applying thread pools" :: Brian Goetz et al. :: https://jcip.net/
- article :: ThreadPoolExecutor :: Oracle Java SE 21 API :: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/ThreadPoolExecutor.html
- article :: ForkJoinPool :: Oracle Java SE 21 API :: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/ForkJoinPool.html

=== concurrent-collections
blurb: The thread-safe collections you build components from: ConcurrentHashMap and its atomic compound operations (compute, merge, computeIfAbsent), how it reaches high concurrency, copy-on-write lists for read-mostly listener lists, concurrent queues and skip lists, and why synchronized wrappers are rarely the answer.
signals: Caches, registries, per-user counters and session maps shared by request threads | "Count words with many threads" | Listener lists | Sorted data accessed concurrently (leaderboards, order books)

--- lesson
:::words
- **Thread-safe collection**: a collection whose individual operations are safe to call from many threads at once.
- **Compound operation**: several steps that must happen together (check then insert; read, add, write back).
- **`ConcurrentHashMap` (CHM)**: Java's high-concurrency hash map.
- **Synchronized wrapper**: `Collections.synchronizedMap(map)`: every method takes one lock on the whole map.
- **Copy-on-write**: every modification copies the whole underlying array; reads never lock and never see a change in progress.
- **Weakly consistent iterator**: iterates without failing while other threads modify the collection, possibly seeing some of the changes.
- **Skip list**: a sorted, linked structure with "express lanes" for fast search, which can be made concurrent without global locks.
:::

## The problem in plain words

Most shared state in a component is a map or a queue: a cache, a registry of sessions, a per-user rate-limit table, a listener list, a work queue. Wrapping a `HashMap` in one big lock works but makes every request wait for every other. Java's concurrent collections give you **fine-grained or lock-free internals** and, just as importantly, **atomic compound operations**, so "insert if absent" or "add one to this key" is one call instead of a race.

:::eli5
A synchronized map is a library with one librarian: everyone queues, even to read different books. A concurrent map is a library with many librarians, each in charge of a few shelves, plus self-service reading. Visitors only wait when they need the same shelf at the same moment.
:::

## ConcurrentHashMap

How it scales (Java 8+): the table is an array of buckets. Reads never lock (they rely on volatile reads). Inserting into an empty bucket uses a CAS. Updating a non-empty bucket locks only that bucket's first node. Resizing is done incrementally with help from the threads that touch the map. Result: many threads can read and write different keys in parallel.

**The real value is the atomic methods:**

```java
ConcurrentHashMap<String, LongAdder> hits = new ConcurrentHashMap<>();
hits.computeIfAbsent(userId, k -> new LongAdder()).increment();        // create once, count safely

ConcurrentHashMap<String, Integer> counts = new ConcurrentHashMap<>();
counts.merge(word, 1, Integer::sum);                                    // atomic "add 1 or start at 1"

sessions.compute(id, (k, s) -> s == null ? new Session(k) : s.touch()); // atomic read-modify-write per key
cache.putIfAbsent(key, value);                                          // atomic insert-if-missing
inventory.computeIfPresent(sku, (k, q) -> q > 0 ? q - 1 : q);           // atomic conditional update
```

Rules for those functions: they run **while the key's bucket is locked**, so keep them **short**, **free of side effects** (they can be retried in some paths), and never let them modify **the same map** (recursive updates can deadlock or throw).

Other details interviewers probe:

- **No null keys or values** (null would be ambiguous with "absent").
- `size()` and `isEmpty()` are **estimates** under concurrent updates; don't make decisions on them ("if size < limit then put" is a race; use a separate atomic counter or a semaphore).
- **Iterators are weakly consistent:** no `ConcurrentModificationException`, but they may or may not see concurrent changes.
- Compound logic **across keys** (move value from key A to key B atomically) is not supported: use a lock or redesign.

## Synchronized wrappers vs concurrent collections

`Collections.synchronizedMap(new HashMap<>())` makes each call atomic by locking the whole map, so throughput doesn't scale, and compound actions and iteration still need external locking (`synchronized (map) { ... }`). Prefer `ConcurrentHashMap` for shared maps; use a synchronized wrapper only for low-traffic code or when you need a lock around several calls anyway.

## Copy-on-write lists

`CopyOnWriteArrayList` copies its array on every write. Reads (and iteration) are lock-free and see a stable snapshot. Perfect for **listener lists** and configuration lists: read on every event, modified rarely. Terrible for lists that change often (every add copies everything).

## Concurrent queues and sorted structures

- `ConcurrentLinkedQueue` / `ConcurrentLinkedDeque`: lock-free, unbounded, non-blocking queues (`offer`/`poll`). Good for work-stealing or free-lists (the parking lot's per-size free spots).
- `BlockingQueue` implementations (producer–consumer page) when consumers should wait.
- `ConcurrentSkipListMap` / `ConcurrentSkipListSet`: sorted, concurrent, O(log n), with range queries (`headMap`, `ceilingKey`): leaderboards, order books by price, time-indexed schedules.

## Choosing

| Need | Use |
|---|---|
| Shared map, per-key updates | `ConcurrentHashMap` + `compute`/`merge`/`computeIfAbsent` |
| Hot per-key counters | `ConcurrentHashMap<K, LongAdder>` |
| Read-mostly list (listeners) | `CopyOnWriteArrayList` |
| Lock-free queue / free-list | `ConcurrentLinkedQueue` / `Deque` |
| Producer–consumer | `ArrayBlockingQueue` / `LinkedBlockingQueue` |
| Sorted, concurrent, range queries | `ConcurrentSkipListMap` |
| Invariants across several keys or structures | A lock (or one owner thread) |

## What breaks

- **`get` then `put`** instead of `compute` or `merge`.
- **Decisions based on `size()`.**
- **Slow or side-effecting functions inside `compute`**, blocking that bucket for everyone.
- **Updating the same map inside its own `computeIfAbsent`** (recursive loaders).
- **Copy-on-write lists that change often.**
- **Believing a concurrent collection makes multi-step logic atomic.**

## Interview angles

- "Count word frequencies with 8 threads." `ConcurrentHashMap<String, LongAdder>` with `computeIfAbsent(...).increment()`, or per-thread maps merged at the end (no sharing at all).
- "Thread-safe LRU cache." CHM alone has no ordering: use a lock around a `LinkedHashMap`, or shard into N locked LRUs, or a library (Caffeine).
- "Store free parking spots per size." A `ConcurrentLinkedDeque` per size: `poll` claims atomically, `offer` returns.

--- revise
### ConcurrentHashMap
? How does CHM scale? :: Lock-free reads; CAS into empty buckets; locks only the first node of a non-empty bucket; cooperative resizing.
? Atomic compound methods? :: compute, computeIfAbsent, computeIfPresent, merge, putIfAbsent.
? Rules for functions passed to compute/merge? :: Short, side-effect free, never modify the same map.
? Why no null keys/values? :: Null would be ambiguous with "absent" in get().
? Can you trust size() under concurrency? :: No: it's an estimate; don't decide on it.
? CHM iterators? :: Weakly consistent: never throw CME, may or may not see concurrent changes.

### Others
? Synchronized wrapper drawbacks? :: One lock for the whole map (doesn't scale); iteration and compound actions still need external locking.
? When is CopyOnWriteArrayList right? :: Read-mostly lists like listeners: lock-free snapshot reads, costly writes.
? Concurrent sorted map with ranges? :: ConcurrentSkipListMap.
? Hot per-key counters? :: ConcurrentHashMap<K, LongAdder> with computeIfAbsent(k, ...).increment().
? Multi-key invariants? :: A lock or a single owner thread; concurrent collections don't make them atomic.

--- notes
## CHM
Reads lock-free; CAS empty bucket; lock bucket head; cooperative resize.
compute / computeIfAbsent / computeIfPresent / merge / putIfAbsent = atomic per key.
Functions: short, pure, no same-map updates.
No nulls. size() estimate. Weakly consistent iterators. No cross-key atomicity.
## Patterns
merge(word, 1, Integer::sum). computeIfAbsent(k, x -> new LongAdder()).increment().
## Wrappers
synchronizedMap: one lock, no scaling, external lock for iteration/compound.
## Others
CopyOnWriteArrayList: listeners/config; writes copy everything.
ConcurrentLinkedQueue/Deque: lock-free unbounded; free-lists.
BlockingQueues: producer–consumer.
ConcurrentSkipListMap/Set: sorted, ranges (leaderboards, order books).
## Breakage
get-then-put; size-based decisions; slow compute functions; recursive computeIfAbsent; COW with frequent writes; multi-step logic assumed atomic.

--- doubts
Q: Is `ConcurrentHashMap.get` followed by `put` ever OK?
A: Only if losing a race is harmless (two threads computing the same idempotent value and the last write winning). For counters, caches with expensive loads, or anything with an invariant, use `merge`, `compute` or `computeIfAbsent`, which do the whole sequence atomically for that key.

Q: Why must the function in `computeIfAbsent` be quick?
A: While it runs, the key's bucket is locked, so other threads updating keys in the same bucket wait, and so does any thread wanting the same key. A slow loader (a database call) inside `computeIfAbsent` stalls part of the map. For slow loads, store a `CompletableFuture` placeholder (`computeIfAbsent(k, x -> CompletableFuture.supplyAsync(() -> load(x)))`) so the bucket is released immediately and other callers share the same in-flight load.

Q: How do I build a thread-safe LRU cache?
A: The simplest correct version is a `LinkedHashMap` in access order with `removeEldestEntry`, guarded by one lock (every `get` changes the order, so even reads need the lock). To scale, shard into N independent LRUs by key hash, each with its own lock. In production Java, the Caffeine library implements a high-performance concurrent cache with near-LRU eviction.

Q: Are Java's concurrent collections linearizable?
A: Individual operations on `ConcurrentHashMap` and the concurrent queues behave atomically. Aggregate operations (`size`, iteration, bulk operations like `forEach`, `putAll`) are not atomic snapshots under concurrent updates.

--- exercises
[design] Design a thread-safe per-user rate limiter allowing 100 requests per minute per user, for millions of users, called from many request threads.
A: ConcurrentHashMap<UserId, Window> where Window is an immutable record (minute, count). tryAcquire(user): result = windows.compute(user, (k, w) -> { long m = currentMinute(); if (w == null || w.minute != m) return new Window(m, 1); return w.count < 100 ? new Window(m, w.count + 1) : w; }), then allow if the returned window's count was incremented (compare with the limit, or return a flag via a small holder). The compute is atomic per user and short. Evict idle users periodically (remove entries whose minute is old) to bound memory. For smoother limits, store a token bucket state instead. Inject the clock.

[break] `if (cache.size() < MAX) cache.put(key, load(key));` and `Integer c = counts.get(w); counts.put(w, c == null ? 1 : c + 1);` on ConcurrentHashMaps. Find both bugs.
A: First: size() is an estimate and the check-then-put isn't atomic, so many threads can pass the check and exceed MAX; and load runs outside any guard, so the same key may load several times. Fix: a separate AtomicInteger/semaphore for capacity (or a bounded cache library) and computeIfAbsent for single loading. Second: get-then-put is a read-modify-write race; two threads can both read 5 and write 6. Fix: counts.merge(w, 1, Integer::sum) or a LongAdder per word.

[choose] Which collection? (a) Event listeners notified on every request and added at start-up. (b) Top 100 players by score, updated by many threads, with range queries. (c) Free connection slots claimed and returned by many threads without waiting.
A: (a) CopyOnWriteArrayList. (b) ConcurrentSkipListMap keyed by (score desc, playerId) plus a ConcurrentHashMap from player to current key for updates (remove old key, insert new). (c) ConcurrentLinkedDeque (poll to claim, offer to return), or a BlockingQueue if callers should wait for a free slot.

--- pitfalls
- get followed by put on a concurrent map
- Making decisions based on size() under concurrency
- Slow loaders or side effects inside compute/computeIfAbsent
- Modifying a map from inside its own computeIfAbsent function
- CopyOnWriteArrayList for frequently modified lists

--- quiz
Q: Which call atomically counts word occurrences in a ConcurrentHashMap<String, Integer>?
- counts.put(w, counts.get(w) + 1)
- *counts.merge(w, 1, Integer::sum)
- counts.putIfAbsent(w, 1)
- counts.size()
W: merge does the read-modify-write atomically for that key.
Q: Why is CopyOnWriteArrayList a good fit for listener lists?
- Writes are cheap
- *Iteration is lock-free on a stable snapshot, and listener lists rarely change
- It sorts listeners
- It's bounded
W: Read-mostly workloads suit copy-on-write.
Q: ConcurrentHashMap iterators, during concurrent updates…
- Throw ConcurrentModificationException
- Lock the whole map
- *Don't throw and may or may not reflect concurrent changes
- Return null
W: They are weakly consistent.

--- sources
- article :: ConcurrentHashMap :: Oracle Java SE 21 API :: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/ConcurrentHashMap.html
- book :: Java Concurrency in Practice, ch. 5.2 "Concurrent collections" :: Brian Goetz et al. :: https://jcip.net/
- tool :: Caffeine: a high-performance caching library for Java :: Ben Manes :: https://github.com/ben-manes/caffeine
- article :: ConcurrentSkipListMap :: Oracle Java SE 21 API :: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/ConcurrentSkipListMap.html

=== async-virtual-threads
blurb: Three ways to handle many waiting tasks: blocking threads, asynchronous code with futures and callbacks (CompletableFuture composition, timeouts, error handling), event loops, and Java 21 virtual threads that make blocking code cheap again; when each fits and the traps of each.
signals: A request that calls several services and combines the results | Thousands of concurrent connections (chat, notifications, crawlers) | "Do these calls in parallel and time out after 200 ms" | Reactive or async code that's hard to follow
widgets: seq-async

--- lesson
:::words
- **Blocking call**: a call where the thread waits (sleeps) until the result arrives.
- **Asynchronous (non-blocking) call**: a call that returns immediately with a promise of a future result; work continues when the result arrives.
- **`CompletableFuture`**: Java's composable future: you attach what to do next (`thenApply`, `thenCompose`, `thenCombine`) instead of waiting.
- **Callback**: code registered to run later when something finishes.
- **Event loop**: one (or a few) threads running short callbacks one after another, with all I/O non-blocking (Node.js, Netty).
- **Virtual thread**: a very lightweight thread (Java 21+) managed by the JVM, not the OS; millions can exist, and blocking one just parks it cheaply.
- **Carrier thread**: an OS thread on which the JVM runs virtual threads.
:::

## The problem in plain words

A product page needs the price, the stock and the reviews, each from a different service taking about 50 ms. Called one after another on one thread, the page takes 150 ms and the thread sits idle most of that time. Called **in parallel**, it takes about 50 ms. And a server with 10,000 such requests in flight needs either 10,000 threads mostly sleeping (expensive with OS threads), or a way to wait **without holding a thread**. Async code and virtual threads are two answers to the same question: **how do you wait cheaply?**

:::eli5
Ordering at three food stalls. Blocking: stand at the first stall until your food is ready, then queue at the second, then the third. Async: order at all three, get three buzzers, and go sit down; collect each when it buzzes. Virtual threads: send three friends to stand in the queues for you, and friends are so cheap you can have as many as you like.
:::

Compare the three styles on the same request:

[[widget:seq-async]]

## CompletableFuture: composing without waiting

```java
CompletableFuture<Price>   price   = priceClient.get(sku);       // each returns immediately
CompletableFuture<Stock>   stock   = stockClient.get(sku);
CompletableFuture<Reviews> reviews = reviewClient.get(sku)
    .completeOnTimeout(Reviews.EMPTY, 150, TimeUnit.MILLISECONDS); // optional part: degrade

CompletableFuture<ProductPage> page = price
    .thenCombine(stock, (p, s) -> new Partial(p, s))
    .thenCombine(reviews, (ps, r) -> new ProductPage(ps.price(), ps.stock(), r))
    .orTimeout(300, TimeUnit.MILLISECONDS)                         // overall deadline
    .exceptionally(e -> ProductPage.unavailable(sku));             // one place for failures
```

The vocabulary:

- `thenApply(f)`: transform the result (like `map`).
- `thenCompose(f)`: chain another async call that depends on this result (like `flatMap`): `userClient.get(id).thenCompose(u -> ordersClient.forUser(u))`.
- `thenCombine(other, f)`: wait for two independent futures and merge them.
- `allOf(...)` / `anyOf(...)`: wait for all / the first.
- `exceptionally`, `handle`, `whenComplete`: deal with failures.
- `orTimeout`, `completeOnTimeout`: deadlines.
- `...Async(fn, executor)` variants: choose **which pool** runs the next step (by default, the common `ForkJoinPool`; never put blocking calls there).

Traps: calling `.get()` or `.join()` in the middle (blocks a thread, defeating the purpose), forgetting `exceptionally` (failures vanish into an un-observed future), losing context (request ids, security context) across thread hops, and stack traces that no longer show who called whom.

## Event loops

Node.js, Netty, Vert.x and browsers run callbacks on one (or a few) event-loop threads with non-blocking I/O. Very efficient for huge numbers of connections. The golden rule: **never block the event loop** (no blocking I/O, no long computation); offload such work to a separate pool. One slow callback freezes every connection on that loop.

## Virtual threads (Java 21)

```java
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
  Future<Price>   price   = executor.submit(() -> priceClient.getBlocking(sku));
  Future<Stock>   stock   = executor.submit(() -> stockClient.getBlocking(sku));
  Future<Reviews> reviews = executor.submit(() -> reviewClient.getBlocking(sku));
  return new ProductPage(price.get(), stock.get(), reviews.get());
}
```

Virtual threads let you write plain **blocking** code while getting async-like scalability: when a virtual thread blocks on I/O, the JVM unmounts it from its carrier OS thread, which immediately runs another virtual thread. A server can have a million virtual threads. Guidance:

- **Don't pool them**: create one per task (they're cheap); limit concurrency to a resource with a `Semaphore` instead.
- **Pinning:** blocking inside `synchronized` (before Java 24) or native code can pin the carrier thread; prefer `ReentrantLock` around blocking calls in older versions.
- **They don't make CPU work faster**: parallel CPU work still needs about one OS thread per core.
- **`ThreadLocal`s** multiply with millions of threads; scoped values are the newer alternative.
- **Structured concurrency** (a preview API) groups the subtasks of one request so they're cancelled together and errors propagate cleanly.

## Choosing

| Situation | Good fit |
|---|---|
| Moderate concurrency, simple code | Blocking calls on a sized thread pool |
| Very high concurrency, mostly waiting, Java 21+ | Virtual threads with blocking code |
| Fan-out/fan-in with deadlines and partial results | `CompletableFuture` composition (or structured concurrency) |
| Huge numbers of connections, framework-based | Event loop (Netty, Node) with non-blocking I/O |
| CPU-heavy work | A cores-sized pool, regardless of the above |

## What breaks

- **Blocking inside async chains** or on the common pool.
- **Futures whose failures nobody observes.**
- **No deadlines**: one slow dependency holds everything.
- **Blocking an event loop.**
- **Pooling virtual threads** or pinning them with long blocking calls inside `synchronized`.

## Interview angles

- "Fetch price, stock and reviews in parallel with a 300 ms budget." `CompletableFuture` composition with `orTimeout`, `completeOnTimeout` for optional parts, `exceptionally` for fallback.
- "Handle 100,000 WebSocket connections." Event loop or virtual threads; never a platform thread per connection.
- "What changed with virtual threads?" Blocking became cheap, so simple thread-per-request code scales again for I/O-bound services.

--- revise
### Styles
? What problem do async code and virtual threads both solve? :: Waiting on I/O without tying up an expensive OS thread per waiting task.
? thenApply vs thenCompose vs thenCombine? :: Transform a result; chain a dependent async call (flatMap); merge two independent futures.
? How to give a CompletableFuture a deadline? :: orTimeout (fail) or completeOnTimeout (default value).
? Biggest CompletableFuture traps? :: Blocking get()/join() mid-chain, unobserved failures, blocking work on the common pool, lost context.
? Event loop golden rule? :: Never block it: no blocking I/O or long computation on loop threads.

### Virtual threads
? What does a virtual thread do when it blocks on I/O? :: Unmounts from its carrier OS thread, which runs another virtual thread.
? Should you pool virtual threads? :: No: one per task; limit resources with semaphores.
? What is pinning? :: A virtual thread stuck to its carrier (blocking inside synchronized pre-Java 24, or native code), losing the benefit.
? Do virtual threads speed up CPU-bound work? :: No: still ~one OS thread per core.
? Structured concurrency? :: Grouping a request's subtasks so they're cancelled together and failures propagate cleanly.

--- notes
## Why
Sequential 3 × 50 ms = 150 ms; parallel ≈ 50 ms. Many waiters need cheap waiting.
## CompletableFuture
thenApply (map), thenCompose (flatMap), thenCombine (zip), allOf/anyOf.
exceptionally/handle/whenComplete. orTimeout/completeOnTimeout.
*Async(fn, executor): choose the pool; no blocking on common ForkJoinPool.
Traps: mid-chain get(), unobserved failures, context loss, stack traces.
## Event loops
Netty/Node/Vert.x: non-blocking I/O, short callbacks; never block the loop; offload CPU/blocking work.
## Virtual threads (21+)
Millions; blocking unmounts from carrier. newVirtualThreadPerTaskExecutor.
Don't pool; semaphores for limits. Pinning (synchronized pre-24, native). Not for CPU speed. ThreadLocal cost. Structured concurrency.
## Choose
Moderate → pool. High I/O concurrency → virtual threads. Fan-out with deadlines → CF. Connections at scale → event loop. CPU → cores-sized pool.

--- doubts
Q: Do virtual threads make CompletableFuture obsolete?
A: For many services, they make the **simple blocking style** good enough again, which is easier to write, read and debug. Futures are still useful for expressing fan-out/fan-in with deadlines and partial results, and many libraries expose async APIs. Structured concurrency aims to give virtual-thread code the same "run these together, cancel together" power.

Q: Why not just make every call async?
A: Async code is harder to read, debug and test: logic is split across callbacks, stack traces lose their callers, and errors can disappear. Use it where concurrency or latency demands it (fan-out, huge connection counts), not by default.

Q: What happens if I call a blocking method inside `thenApply` on the common pool?
A: That pool has about as many threads as cores and is shared by every parallel stream and default async stage in the JVM. A few blocking calls can occupy all its threads and stall unrelated work. Use `thenApplyAsync(fn, ioExecutor)` with a dedicated pool for blocking work, or use virtual threads.

Q: How do timeouts and cancellation interact?
A: `orTimeout` completes the future exceptionally after the deadline, but it doesn't stop the underlying work; the remote call may continue and its result is ignored. Real cancellation needs the client library to support it (closing the request), or structured concurrency, which cancels sibling tasks when one fails.

--- exercises
[design] A "trip summary" page needs the user's profile, then (using the profile's home city) the weather, plus independently the user's upcoming bookings. Budget: 400 ms; weather is optional. Write the composition.
A: profile = profileClient.get(userId); weather = profile.thenCompose(p -> weatherClient.forCity(p.homeCity())).completeOnTimeout(Weather.UNKNOWN, 150, MILLISECONDS).exceptionally(e -> Weather.UNKNOWN); bookings = bookingClient.upcoming(userId) (started immediately, in parallel with profile); page = profile.thenCombine(bookings, Summary::new).thenCombine(weather, Summary::withWeather).orTimeout(400, MILLISECONDS).exceptionally(e -> Summary.degraded(userId)). Profile → weather is sequential (dependency); bookings run in parallel; weather can't sink the page.

[break] `CompletableFuture.supplyAsync(() -> jdbcTemplate.query(...)).thenApply(rows -> render(rows)).get();` runs on every request in a busy service, and unrelated parallel streams slow to a crawl. Why?
A: supplyAsync without an executor uses the common ForkJoinPool (≈ cores threads), and the task does blocking JDBC I/O there, occupying those few threads; everything else that uses the common pool (parallel streams, other async stages) waits. The trailing get() also blocks the request thread, so nothing is gained over calling the query directly. Fix: call the query directly on the request thread (or a virtual thread), or use supplyAsync(..., dedicatedIoExecutor) and compose without blocking.

[choose] Blocking pool, virtual threads, CompletableFuture or event loop? (a) A Java 21 service whose handlers each make 3–5 blocking HTTP calls, 20,000 concurrent requests. (b) A chat gateway holding 500,000 idle WebSockets. (c) Rendering PDFs (CPU-heavy) for a batch job.
A: (a) Virtual threads (simple blocking code scales), optionally with CompletableFuture or structured concurrency for parallel fan-out per request. (b) An event-loop framework (Netty) or virtual threads; never one OS thread per connection. (c) A fixed pool sized to the cores.

--- pitfalls
- Calling get() or join() in the middle of an async chain
- Blocking calls on the common ForkJoinPool
- Async stages whose exceptions nobody handles
- No timeouts on fan-out calls
- Pooling virtual threads or blocking inside synchronized with them on older Java versions

--- quiz
Q: You need the user, then their orders (which require the user's id). Which combinator?
- thenCombine
- thenApply
- *thenCompose
- anyOf
W: A dependent async call is a flatMap.
Q: What does a virtual thread do when it blocks on a socket read?
- Blocks its OS thread
- *Unmounts, freeing the carrier OS thread to run other virtual threads
- Throws an exception
- Spins
W: That's what makes blocking cheap.
Q: The golden rule of event-loop frameworks?
- Use many loops per connection
- *Never block the event loop thread
- Always use synchronized
- Avoid callbacks
W: One blocked callback stalls every connection on that loop.

--- sources
- article :: JEP 444: Virtual Threads :: OpenJDK :: https://openjdk.org/jeps/444
- article :: CompletableFuture :: Oracle Java SE 21 API :: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/CompletableFuture.html
- article :: JEP 505: Structured Concurrency (preview) :: OpenJDK :: https://openjdk.org/jeps/505
- article :: The Node.js event loop, timers and process.nextTick :: Node.js :: https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick

=== timers-scheduling
blurb: How programs run work later or periodically: ScheduledExecutorService (fixed rate versus fixed delay), DelayQueue and priority queues of deadlines, hashed timing wheels for millions of timers (timeouts, retries, expiries), and the design of an in-process task scheduler with cancellation and clock handling.
signals: "Design a task scheduler / job scheduler / cron" | Session expiry, seat-hold timeouts, retries with backoff | Millions of connection timeouts in a server | "Run this every minute" and drift questions
widgets: timing-wheel

--- lesson
:::words
- **Scheduled task**: work to run once at a future time, or repeatedly.
- **Fixed rate**: start runs at regular times (every 60 s from the start), regardless of how long each run takes.
- **Fixed delay**: wait a set time **after each run finishes** before starting the next.
- **Delay queue**: a queue whose items become available only when their deadline arrives.
- **Timing wheel**: a circular array of buckets, one per time slot; a timer is placed in the bucket for its expiry, and a pointer advances one slot per tick.
- **Tick**: the timer's resolution step (for example 1 ms or 100 ms).
- **Monotonic clock**: a clock that only moves forward (`System.nanoTime`), unaffected by changes to the wall-clock time.
:::

## The problem in plain words

Programs constantly need "later": expire a seat hold in 10 minutes, retry a failed call in 2 s, close an idle connection after 60 s, send a digest every morning, refresh a cache every minute. A naive version (a thread per timer that sleeps) collapses at scale: a server with a million connections can't have a million sleeping threads. Good timer designs keep **all pending timers in one data structure** and use **one or a few threads** to fire them when due.

:::eli5
A hotel front desk with wake-up calls. Instead of one receptionist sitting next to each guest's phone waiting for their time, one receptionist keeps a list sorted by time (or a board with a slot for every minute) and glances at it each minute, calling whoever is due.
:::

## ScheduledExecutorService

```java
ScheduledExecutorService timers = Executors.newScheduledThreadPool(2);

ScheduledFuture<?> hold = timers.schedule(() -> booking.expire(), 10, TimeUnit.MINUTES);   // once, later
hold.cancel(false);                                                                        // payment arrived in time

timers.scheduleAtFixedRate(this::reportMetrics, 0, 60, TimeUnit.SECONDS);   // starts every 60 s
timers.scheduleWithFixedDelay(this::syncCatalog, 0, 60, TimeUnit.SECONDS);  // 60 s after each run ends
```

- **Fixed rate** keeps a steady cadence; if a run takes longer than the period, the next starts late (runs never overlap) and catches up.
- **Fixed delay** guarantees a gap between runs; the cadence drifts by the run time.
- **An exception in a periodic task silently cancels all future runs.** Catch and log inside periodic tasks.
- Internally it keeps a **priority queue (heap) ordered by deadline**: O(log n) to schedule and cancel, and the timer thread sleeps until the earliest deadline.

Use a separate small pool for timers, and have timer tasks **hand real work to a worker pool**, so a slow task can't delay every other timer.

## Delay queues: the same idea, yourself

```java
record Expiry(BookingId id, long dueNanos) implements Delayed {
  public long getDelay(TimeUnit u) { return u.convert(dueNanos - System.nanoTime(), TimeUnit.NANOSECONDS); }
  public int compareTo(Delayed o) { return Long.compare(dueNanos, ((Expiry) o).dueNanos); }
}
DelayQueue<Expiry> expiries = new DelayQueue<>();
// worker: while (true) { Expiry e = expiries.take(); bookings.expire(e.id()); }   // take() waits until one is due
```

## Timing wheels: millions of timers

A heap costs O(log n) per insert and cancel. When there are millions of short timers that are usually **cancelled** before they fire (request timeouts, connection idle timers), even that adds up. A **hashed timing wheel** makes both O(1):

- An array of N buckets, each one tick wide (say 512 buckets × 10 ms).
- A timer due in d ticks goes into bucket `(current + d) % N`, with a "rounds" count of `d / N` for timers further out than one rotation.
- Every tick, the pointer moves one bucket and fires timers there whose rounds are 0 (decrementing the rest).
- Cancel = remove from its bucket's list (O(1) with a doubly linked list).
- Hierarchical wheels (seconds, minutes, hours, like a clock) handle very long timers with few rounds.

Netty's `HashedWheelTimer` and Kafka's purgatory use this. Put timers in and watch the wheel turn:

[[widget:timing-wheel]]

The trade-off: precision is limited to the tick size (a 10 ms tick fires up to 10 ms late), and an idle wheel still ticks. Heaps are exact and better for fewer, longer timers.

## Designing an in-process task scheduler (interview version)

Requirements usually include: schedule one-off and recurring tasks, cancel them, run them on a bounded worker pool, survive slow tasks, and be testable.

- **API:** `TaskHandle schedule(Runnable task, Instant at)`, `TaskHandle scheduleRepeating(Runnable task, Duration every, RepeatMode mode)`, `boolean cancel(TaskHandle)`.
- **Data structure:** a `PriorityBlockingQueue` / `DelayQueue` of entries ordered by next run time (or a timing wheel for huge counts).
- **One dispatcher thread** waits for the earliest due entry (a condition with a timed wait that is **woken early when an earlier task is inserted**), then hands the task to a worker pool. Recurring tasks are re-inserted with their next time (fixed rate: previous scheduled time + period; fixed delay: completion time + delay).
- **Cancellation:** mark the entry cancelled (lazy deletion) and skip it when it surfaces, or remove it.
- **Time:** use a monotonic clock for delays; inject a clock so tests can advance time instantly.
- **Failure:** catch exceptions per run, log them, and decide whether recurring tasks continue.
- **Persistence and distribution** (survive restarts, run on one of many machines) turn this into the distributed job scheduler of the HLD chapters.

## What breaks

- **A thread per timer.**
- **Uncaught exceptions killing periodic tasks** silently.
- **Long work on the timer thread**, delaying every other timer.
- **Wall-clock time for delays** (a clock change makes timers fire early or never).
- **Fixed-rate tasks that take longer than their period**, piling up behind each other.
- **No early wake-up** when a sooner task is scheduled while the dispatcher sleeps.

## Interview angles

- "Expire unpaid seat holds after 10 minutes." Schedule an expiry per hold (cancel on payment), or a delay queue; the expiry event is a no-op if already confirmed.
- "Design a scheduler that runs millions of retry timers." Hashed timing wheel with a worker pool.
- "Fixed rate or fixed delay for a cache refresh?" Fixed delay: never overlap, always a full gap even if a refresh is slow.

--- revise
### Basics
? Fixed rate vs fixed delay? :: Fixed rate starts runs at regular times; fixed delay waits a set gap after each run ends.
? What happens if a periodic task throws? :: All future runs are silently cancelled; catch inside the task.
? What does ScheduledThreadPoolExecutor use internally? :: A priority queue (heap) ordered by deadline: O(log n) insert/cancel.
? Why hand work off from timer threads? :: So one slow task doesn't delay every other timer.
? Which clock for delays? :: A monotonic clock (nanoTime), not wall-clock time.

### Wheels and schedulers
? How does a hashed timing wheel place a timer? :: Bucket (current + ticks) mod N, with rounds = ticks / N for far timers.
? Timing wheel costs and trade-off? :: O(1) insert, cancel and per-tick expiry; precision limited to the tick, and it ticks even when idle.
? Who uses timing wheels? :: Netty's HashedWheelTimer, Kafka's request purgatory (and OS kernels).
? Key parts of an in-process scheduler? :: Priority/delay queue by next run, a dispatcher woken early for sooner tasks, a worker pool, lazy cancellation, injected clock, per-run error handling.
? Recurring next time, fixed rate vs fixed delay? :: Previous scheduled time + period vs completion time + delay.

--- notes
## ScheduledExecutorService
schedule(task, delay); cancel via ScheduledFuture.
scheduleAtFixedRate: cadence, no overlap, catches up. scheduleWithFixedDelay: gap after each run.
Exception kills periodic task: catch inside. Small timer pool; hand off to workers.
Internally: heap by deadline, O(log n).
## DelayQueue
Delayed items; take() waits until due. Expiry worker loop.
## Timing wheel
N buckets × tick; bucket = (cur + d) % N; rounds = d / N.
O(1) insert/cancel/advance; precision = tick; hierarchical wheels for long timers.
Netty HashedWheelTimer, Kafka purgatory.
## Scheduler design
API schedule/scheduleRepeating/cancel → handle.
Delay/priority queue; dispatcher with timed wait + early wake-up; worker pool.
Lazy cancel; monotonic + injected clock; per-run try/catch; re-insert recurring.
Persistent/distributed → HLD job scheduler.
## Breakage
Thread per timer; silent periodic death; work on timer thread; wall clock; overrunning fixed rate; no early wake-up.

--- doubts
Q: Why is wall-clock time wrong for delays?
A: The wall clock can jump: NTP corrections, daylight-saving changes, someone fixing the server's time. A timer computed as "now + 10 min" on the wall clock can fire early or very late after a jump. `System.nanoTime()` is monotonic: it only measures elapsed time. Use wall-clock time only for "at 09:00 every day" schedules, and recompute after clock changes.

Q: When is a heap better than a timing wheel?
A: When there are thousands rather than millions of timers, when timers are long and rarely cancelled, or when exact firing times matter. The heap is simpler and precise. Timing wheels shine with huge numbers of short, mostly cancelled timeouts.

Q: How does the scheduler's dispatcher avoid oversleeping when a sooner task is added?
A: It sleeps with a timed wait on a condition until the current earliest deadline. When `schedule` inserts a task that becomes the new earliest, it signals the condition, waking the dispatcher to recompute its wait. `DelayQueue` does exactly this internally (its leader/follower design).

Q: What about cron-style schedules?
A: Store the cron expression, compute the next fire time from the current wall-clock time in the right time zone after each run, and schedule that. Libraries (Quartz, Spring's `CronExpression`) handle the calendar rules, including daylight-saving gaps.

--- exercises
[design] Design an in-memory `Scheduler` supporting `schedule(task, delay)`, `scheduleRepeating(task, period, mode)` and `cancel(handle)`, running tasks on a pool of 8 workers. Explain the dispatcher loop.
A: State: a PriorityQueue<Entry> ordered by nextRunNanos, guarded by a ReentrantLock with a Condition `changed`; Entry has task, nextRunNanos, period, mode, volatile cancelled. schedule: lock; add entry; if it is now the head, signal changed; return a handle wrapping the entry. cancel: set cancelled = true (lazy) and signal. Dispatcher thread: lock; loop { while queue empty: changed.await(); head = queue.peek(); wait = head.next − clock.nanos(); if (wait > 0) { changed.awaitNanos(wait); continue; } queue.poll(); if (head.cancelled) continue; workers.execute(() -> runSafely(head)); if (repeating) { head.next = fixedRate ? head.next + period : (rescheduled on completion inside runSafely); re-add }. }. runSafely catches and logs exceptions; for fixed delay it re-inserts with completion time + delay. The clock is injected; shutdown stops the dispatcher and the workers.

[choose] Heap-based scheduler, timing wheel, or DelayQueue? (a) 2 million HTTP keep-alive idle timeouts of 60 s, mostly reset by new requests. (b) 50 nightly maintenance jobs at specific times. (c) Expiring seat holds (a few thousand at a time, 10 minutes each), processed by one worker.
A: (a) Hashed timing wheel: O(1) reset/cancel for millions of short timers. (b) A heap-based ScheduledExecutorService (or a cron library) with wall-clock next-fire computation. (c) A DelayQueue of hold expiries with a worker taking due items (or ScheduledExecutorService with cancel on payment).

[break] `timer.scheduleAtFixedRate(() -> { refreshCacheFromDb(); }, 0, 30, SECONDS);` The cache stopped refreshing two days ago with nothing in the logs. Why, and what else could go wrong?
A: refreshCacheFromDb threw an exception once (say, a database timeout); an exception in a periodic task cancels all its future runs silently. Fix: wrap the body in try/catch, log and count failures, and alert if the last successful refresh is too old. Also: if a refresh ever takes longer than 30 s, fixed rate makes the next one start immediately after, back to back, adding load; fixed delay would leave a gap. Long refreshes should also not block other timers on the same scheduler thread.

--- pitfalls
- Creating one sleeping thread per timer
- Letting exceptions escape periodic tasks
- Doing slow work directly on the timer thread
- Computing delays from wall-clock time
- A dispatcher that doesn't wake when an earlier task is scheduled

--- quiz
Q: A cache refresh sometimes takes 50 s and runs every 30 s. Which mode avoids back-to-back runs?
- Fixed rate
- *Fixed delay
- Either
- Neither
W: Fixed delay always waits the full gap after a run ends.
Q: What happens to a scheduleAtFixedRate task that throws once?
- It retries
- It logs and continues
- *All future runs are cancelled silently
- The JVM exits
W: Catch exceptions inside periodic tasks.
Q: Main advantage of a hashed timing wheel over a heap?
- Exact firing times
- *O(1) insert and cancel for huge numbers of timers
- No tick needed
- Works across machines
W: It trades precision (tick size) for constant-time operations.

--- sources
- paper :: Hashed and Hierarchical Timing Wheels (1987) :: George Varghese, Tony Lauck :: https://www.cs.columbia.edu/~nahum/w6998/papers/sosp87-timing-wheels.pdf
- article :: ScheduledExecutorService :: Oracle Java SE 21 API :: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/ScheduledExecutorService.html
- article :: Apache Kafka, Purgatory Redesign Proposal (hierarchical timing wheels) :: Apache Kafka :: https://cwiki.apache.org/confluence/display/KAFKA/Purgatory+Redesign+Proposal
- tool :: HashedWheelTimer :: Netty :: https://netty.io/4.1/api/io/netty/util/HashedWheelTimer.html

=== concurrency-puzzles
blurb: The classic concurrency coding questions and the shape of each solution: print in order, alternate threads (FizzBuzz, foo/bar, odd/even, zero-even-odd), H2O, dining philosophers, readers–writers, the sleeping barber, a thread-safe bounded counter and a multithreaded web crawler, with which primitive fits each.
signals: LeetCode concurrency problems (1114–1279 range) | "Make threads take turns" | "Build molecules / match pairs of threads" | "Crawl these URLs with N threads without visiting any twice"
widgets: seq-print-order

--- lesson
:::words
- **Turn-taking**: making threads run in a fixed order, each waiting until it's its turn.
- **Rendezvous**: two or more threads meeting at a point so they proceed together (two hydrogens and one oxygen).
- **Readers–writers problem**: many readers may share access, but a writer needs exclusive access.
- **Fairness**: every waiting thread eventually gets its turn.
- **Termination detection**: knowing when all concurrent work (including work that creates more work) is finished.
:::

## The problem in plain words

Concurrency interviews often use small puzzles: three threads must print "first, second, third" in order whatever the scheduler does; threads must print FizzBuzz together; hydrogen and oxygen threads must group into water molecules. They look like riddles, but each one tests whether you can pick the **right primitive** (semaphore, condition, latch, barrier, queue) and use it without races, deadlocks or busy waiting. Most of them reduce to a handful of shapes.

:::eli5
A relay race: each runner may only start when the previous one hands over the baton. The baton is the synchronisation: whoever holds it runs; passing it is the signal. Most puzzles are about designing the right batons.
:::

## Shape 1: fixed order ("print in order", LeetCode 1114)

Thread A prints "first", B "second", C "third", started in any order.

```java
final class Foo {
  private final Semaphore afterFirst = new Semaphore(0), afterSecond = new Semaphore(0);
  void first(Runnable p)  { p.run(); afterFirst.release(); }
  void second(Runnable p) throws InterruptedException { afterFirst.acquire(); p.run(); afterSecond.release(); }
  void third(Runnable p)  throws InterruptedException { afterSecond.acquire(); p.run(); }
}
```

Semaphores starting at 0 are **batons**: a release hands the turn on. (Two `CountDownLatch(1)` work equally well for one-shot ordering.) Watch it with the threads starting in the wrong order:

[[widget:seq-print-order]]

## Shape 2: repeated turn-taking (foo/bar 1115, zero-even-odd 1116, FizzBuzz 1195)

One semaphore per role, exactly one with a permit at any time:

```java
// FizzBuzz with 4 threads: number, fizz, buzz, fizzbuzz
private int i = 1; private final int n;
private final Semaphore num = new Semaphore(1), fizz = new Semaphore(0), buzz = new Semaphore(0), fb = new Semaphore(0);

private void next() {                         // called by whoever just printed: hand the turn to the owner of i + 1
  i++;
  if (i > n) { num.release(); fizz.release(); buzz.release(); fb.release(); return; }   // let everyone exit
  if (i % 15 == 0) fb.release(); else if (i % 3 == 0) fizz.release(); else if (i % 5 == 0) buzz.release(); else num.release();
}
void number(IntConsumer out) throws InterruptedException {
  while (true) { num.acquire(); if (i > n) return; out.accept(i); next(); }
}
// fizz(), buzz(), fizzbuzz() identical with their own semaphore and output
```

The same can be done with one lock, a shared `i`, and a condition each thread waits on (`while (i <= n && !mine(i)) cond.await()`, `signalAll` after each step). Key details: **every thread must be released at the end** so none waits forever, and the shared counter is only changed by the thread holding the turn.

## Shape 3: grouping ("H2O", 1117)

Hydrogen and oxygen threads arrive in any order; each molecule needs exactly two H and one O to "bond" together.

```java
private final Semaphore hSlots = new Semaphore(2), oSlots = new Semaphore(1);
private final CyclicBarrier bond = new CyclicBarrier(3);
void hydrogen(Runnable release) throws Exception { hSlots.acquire(); bond.await(); release.run(); hSlots.release(); }
void oxygen(Runnable release)   throws Exception { oSlots.acquire(); bond.await(); release.run(); oSlots.release(); }
```

Semaphores admit at most 2 H and 1 O into the current molecule; the barrier makes the three wait for each other. (Releasing slots after the barrier lets the next molecule start; strict versions add a second barrier so outputs of consecutive molecules can't interleave.)

## Shape 4: resources in a cycle (dining philosophers, 1226)

Five philosophers, five forks, each needs both neighbours' forks. Fixes from the deadlock page: **order the forks** (always pick up the lower-numbered first), or **limit the table** to four (a `Semaphore(4)`), or `tryLock` both with random backoff.

## Shape 5: readers–writers

Many readers at once, writers alone: `ReentrantReadWriteLock`, or by hand with a lock, a reader count and a condition, plus a rule against **writer starvation** (once a writer is waiting, new readers wait too).

## Shape 6: a bounded resource with waiting (the sleeping barber)

A barber sleeps until a customer arrives; there are N waiting chairs; customers leave if all are taken. It's producer–consumer with a bounded queue and a "leave if full" policy: `offer` (not `put`) into an `ArrayBlockingQueue(N)`, the barber `take()`s.

## Shape 7: work that creates work (multithreaded web crawler, 1242)

Crawl all pages under one host starting from a URL, with N threads, never visiting a page twice:

```java
Set<String> seen = ConcurrentHashMap.newKeySet();
ExecutorService pool = Executors.newFixedThreadPool(n);
Phaser pending = new Phaser(1);                                 // counts in-flight tasks; 1 for the main thread

void visit(String url) {
  if (!sameHost(url) || !seen.add(url)) return;                 // add() is the atomic claim
  pending.register();
  pool.execute(() -> {
    try { for (String next : parser.getUrls(url)) visit(next); }
    finally { pending.arriveAndDeregister(); }
  });
}
visit(start);
pending.arriveAndAwaitAdvance();                                // waits until every task has finished
pool.shutdown();
```

The two real problems: **deduplication** (`seen.add` returns false if another thread claimed it first: an atomic check-then-act) and **termination** (you can't just wait for the queue to be empty, because a running task may still add more; count in-flight tasks with a `Phaser` or an `AtomicInteger` plus a latch). Rate limiting per host and politeness are the HLD follow-ups.

## Choosing the primitive

| Puzzle shape | Primitive |
|---|---|
| One-shot ordering | Semaphores starting at 0, or latches |
| Repeated turn-taking | One semaphore per role, or lock + condition + turn variable |
| Group of k must proceed together | Semaphores for admission + barrier |
| Resource cycle | Ordering, a limiting semaphore, or tryLock + jitter |
| Many readers, one writer | Read-write lock (with starvation rule) |
| Bounded waiting room | Bounded queue with offer/take |
| Work spawning work | Concurrent set for dedup + in-flight counter for termination |

## What breaks

- **Busy waiting** (`while (turn != me) {}`) instead of blocking.
- **Threads left waiting at the end** (not everyone released when the work is done).
- **Unsynchronised shared counters** for turns.
- **Deduplicating with check-then-act** (`if (!seen.contains(u)) seen.add(u)`).
- **Terminating when the queue is momentarily empty** while tasks are still running.

## Interview angles

- "Print in order." Two semaphores (or latches) at zero.
- "FizzBuzz with four threads." Turn semaphores and a shared counter changed only by the turn holder; release everyone at the end.
- "Crawl with N threads." Concurrent set for claims, in-flight counter for termination, bounded pool.

--- revise
### Shapes
? Print in order (first/second/third)? :: Two semaphores (or latches) starting at 0; each step releases the next.
? Repeated turn-taking (foo/bar, FizzBuzz)? :: One semaphore per role, exactly one holding a permit; or lock + condition + shared turn variable.
? Ending a turn-taking puzzle cleanly? :: Release every role's semaphore (or signalAll) when done, so no thread waits forever.
? H2O? :: Semaphores admitting 2 H and 1 O per molecule, plus a CyclicBarrier(3) to bond together.
? Dining philosophers fixes? :: Order the forks, a Semaphore(4) at the table, or tryLock with random backoff.

### More shapes
? Readers–writers starvation rule? :: Once a writer waits, new readers wait too.
? Sleeping barber? :: Bounded queue: customers offer (leave if full), barber takes.
? Crawler deduplication? :: seen.add(url) on a concurrent set is the atomic claim.
? Crawler termination? :: Count in-flight tasks (Phaser or AtomicInteger + latch); an empty queue isn't enough.
? Most common puzzle mistake? :: Busy waiting instead of blocking (and leaving threads waiting at the end).

--- notes
## Ordering (1114)
Semaphores at 0 as batons (or CountDownLatch(1)s).
## Turn-taking (1115, 1116, 1195)
One semaphore per role; exactly one permit in play; turn holder advances shared i and releases next role.
Or lock + condition + turn var + signalAll. Release all at the end.
## Grouping (1117 H2O)
Semaphore(2) H, Semaphore(1) O, CyclicBarrier(3).
## Cycles (1226 philosophers)
Fork ordering; Semaphore(4); tryLock + jitter.
## Readers–writers
RW lock; waiting writer blocks new readers.
## Sleeping barber
ArrayBlockingQueue(N): offer or leave; barber take().
## Crawler (1242)
ConcurrentHashMap.newKeySet(); seen.add = claim; Phaser/AtomicInteger for in-flight; bounded pool; same-host filter.
## Breakage
Busy waits; stranded threads; unsynchronised counters; check-then-act dedup; early termination.

--- doubts
Q: Semaphores or condition variables for turn-taking?
A: Both work. Semaphores are shorter for strict turn-taking because the permit is the turn. A lock with a condition and an explicit turn variable is easier to extend (more complex rules, more roles) and to explain. In an interview, write whichever you can get right quickly, and mention the other.

Q: Why does the crawler use a Phaser instead of waiting for the pool's queue to be empty?
A: A task that's running may still discover and submit more URLs, so "queue empty" can be true for a moment while work remains. The in-flight count goes to zero only when no task is running **and** none is queued, because every task registers before being submitted and deregisters when it finishes (including all the work it submitted).

Q: Are these puzzles realistic?
A: The shapes are: ordering stages of a pipeline, alternating producers, grouping parts before assembly, bounded waiting rooms, readers and writers, and work-spawning crawls appear in real systems. The puzzles strip away the domain so the synchronisation is all that's left.

--- exercises
[design] Implement `ZeroEvenOdd` (LeetCode 1116): three threads print "0102030405…" for n, one printing zeros, one odd and one even numbers.
A: Semaphores: zero = 1, odd = 0, even = 0. zero thread: for i in 1..n { zero.acquire(); print(0); if (i odd) odd.release() else even.release(); }. odd thread: for i = 1, 3, 5 … ≤ n { odd.acquire(); print(i); zero.release(); }. even thread: for i = 2, 4 … ≤ n { even.acquire(); print(i); zero.release(); }. Each number is preceded by a zero; the loop bounds make every thread finish, so none is stranded.

[break] A crawler: `void crawl(String u) { if (seen.contains(u)) return; seen.add(u); pool.submit(() -> parser.getUrls(u).forEach(this::crawl)); }` then `while (!queue.isEmpty()) Thread.sleep(10); pool.shutdown();`. Find two bugs.
A: Dedup race: contains then add is check-then-act; two threads can both see the URL as unseen and crawl it twice. Use if (!seen.add(u)) return (add is atomic on a concurrent set). Termination race: the queue can be empty while tasks are still running and about to submit more URLs, so the main thread shuts the pool down early and new submissions are rejected (and pages are missed). Track in-flight tasks (Phaser or AtomicInteger with a completion latch) and wait for zero; avoid sleep-polling.

[choose] Which primitive? (a) "Thread B must print after thread A, once." (b) "Five workers must all finish loading before any starts processing, every round." (c) "At most 3 threads may use the GPU at once."
A: (a) A CountDownLatch(1) or a Semaphore(0) released by A. (b) A CyclicBarrier(5). (c) A Semaphore(3).

--- pitfalls
- Busy-waiting loops instead of blocking primitives
- Leaving some threads blocked forever when the work ends
- Shared turn counters changed without synchronisation
- Deduplicating with contains-then-add
- Declaring completion when a queue is momentarily empty

--- quiz
Q: To make three threads print "first", "second", "third" in order, the simplest tool is…
- A CyclicBarrier(3)
- *Two semaphores (or latches) starting at zero
- A ConcurrentHashMap
- Thread.sleep with different delays
W: Each step releases the baton for the next.
Q: In a multithreaded crawler, why can't you stop when the task queue is empty?
- Queues are never empty
- *Running tasks may still add new URLs; you must count in-flight tasks
- The pool shuts itself down
- Because of the GIL
W: Termination needs an in-flight count.
Q: Which detail is required to avoid stranded threads in FizzBuzz with semaphores?
- Using fair semaphores
- *Releasing every role's semaphore when the count passes n
- Sleeping between prints
- Using notify instead of notifyAll
W: Otherwise some threads wait forever after the last number.

--- sources
- article :: LeetCode concurrency problems (Print in Order, FizzBuzz Multithreaded, Building H2O, Web Crawler Multithreaded) :: LeetCode :: https://leetcode.com/problemset/concurrency/
- book :: The Little Book of Semaphores (rendezvous, barrier, readers-writers, dining philosophers, H2O, barbershop) :: Allen B. Downey :: https://greenteapress.com/wp/semaphores/
- article :: Phaser :: Oracle Java SE 21 API :: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/Phaser.html
