import type { Scenario } from "../Seq";

/** LLD sequence scenarios: object collaborations shown as calls between objects (not machines). */
export const LLD: Record<string, Scenario> = {
  "seq-latch": {
    title: "A latch versus a barrier",
    q: "Both make threads wait. What exactly is each one waiting for, and can it be used twice?",
    about: "A CountDownLatch opens once when its count hits zero. A CyclicBarrier releases a group when all of them have arrived, then resets for the next round.",
    actors: [{ id: "main", label: "Main thread" }, { id: "w1", label: "Worker 1" }, { id: "w2", label: "Worker 2" }, { id: "sync", label: "Latch / barrier" }],
    variants: [
      {
        key: "latch", label: "CountDownLatch(2)", end: "Main waited for two events, not for threads to end. Once open, the latch stays open: a later await() returns immediately, and it can never be reset.",
        init: { sync: "count = 2" },
        steps: [
          { from: "main", to: "sync", label: "await()", say: "Main waits for both services to be ready.", set: { main: "waiting" } },
          { from: "w1", to: "sync", label: "countDown()", say: "Worker 1 finished loading the cache.", set: { sync: "count = 1" } },
          { from: "w1", to: "w1", label: "keeps running", say: "Counting down doesn't block the worker; it carries on." },
          { from: "w2", to: "sync", label: "countDown()", say: "Worker 2 finished loading config.", set: { sync: "count = 0 (open)" } },
          { from: "sync", to: "main", label: "released", kind: "ok", say: "The count hit zero: main continues and opens the port.", set: { main: "running" } },
        ],
      },
      {
        key: "barrier", label: "CyclicBarrier(2), two rounds", end: "Each round, the workers waited for each other, the barrier action ran once, and the barrier reset itself for the next round.",
        init: { sync: "arrived 0/2" },
        steps: [
          { from: "w1", to: "sync", label: "await()  (round 1 done)", say: "Worker 1 finishes its half of round 1 and waits.", set: { sync: "arrived 1/2", w1: "waiting" } },
          { from: "w2", to: "sync", label: "await()  (round 1 done)", say: "Worker 2 arrives: everyone is here.", set: { sync: "arrived 2/2" } },
          { from: "sync", to: "sync", label: "barrier action: swap buffers", say: "The optional action runs once, by the last thread to arrive." },
          { from: "sync", to: "w1", label: "go", kind: "ok", say: "Both are released together and the barrier resets.", set: { sync: "arrived 0/2", w1: "round 2" } },
          { from: "sync", to: "w2", label: "go", kind: "ok", say: "Worker 2 starts round 2 too.", set: { w2: "round 2" } },
          { from: "w2", to: "sync", label: "await()  (round 2 done)", say: "Round 2: the same barrier is reused.", set: { sync: "arrived 1/2", w2: "waiting" } },
        ],
      },
    ],
  },
  "seq-async": {
    title: "Three calls: blocking, async, virtual threads",
    q: "A page needs price, stock and reviews (50 ms each). How long does the request take, and what is each thread doing meanwhile?",
    about: "The same request three ways: sequential blocking calls, CompletableFuture fan-out, and blocking calls on virtual threads.",
    actors: [{ id: "req", label: "Request handler" }, { id: "price", label: "Price svc" }, { id: "stock", label: "Stock svc" }, { id: "rev", label: "Reviews svc" }],
    variants: [
      {
        key: "seq", label: "Blocking, one after another", end: "150 ms, and the request's OS thread spent nearly all of it asleep. Thousands of such requests need thousands of mostly idle threads.",
        steps: [
          { from: "req", to: "price", label: "get price (blocks)", t: 0, say: "The thread calls the price service and waits." },
          { from: "price", to: "req", label: "₹499", t: 50, kind: "res", say: "50 ms later." },
          { from: "req", to: "stock", label: "get stock (blocks)", t: 50, say: "Only now does it ask for stock." },
          { from: "stock", to: "req", label: "12 left", t: 100, kind: "res", say: "Another 50 ms." },
          { from: "req", to: "rev", label: "get reviews (blocks)", t: 100, say: "Then reviews." },
          { from: "rev", to: "req", label: "4.6★", t: 150, kind: "res", say: "Total: 150 ms for three independent calls." },
        ],
      },
      {
        key: "cf", label: "CompletableFuture fan-out", end: "About 50 ms: the three calls overlapped, and no thread sat blocked waiting. The cost is code built from callbacks (thenCombine), and errors must be handled explicitly.",
        steps: [
          { from: "req", to: "price", label: "priceClient.get() → future", t: 0, kind: "async", say: "Each call returns a future immediately." },
          { from: "req", to: "stock", label: "stockClient.get() → future", t: 0, kind: "async", say: "No waiting between them." },
          { from: "req", to: "rev", label: "reviewClient.get() → future", t: 1, kind: "async", say: "All three are in flight." },
          { from: "req", to: "req", label: "thenCombine(...).orTimeout(300 ms)", t: 1, say: "The handler attaches what to do when all three arrive, and returns its thread to the pool." },
          { from: "price", to: "req", label: "₹499", t: 48, kind: "res", say: "Results arrive in any order." },
          { from: "rev", to: "req", label: "4.6★", t: 50, kind: "res", say: "Reviews arrive next; the combine step is still waiting for stock." },
          { from: "stock", to: "req", label: "12 left", t: 52, kind: "ok", say: "The combine step runs when the last one lands: 52 ms in total." },
        ],
      },
      {
        key: "vt", label: "Virtual threads, blocking code", end: "Also about 50 ms, written as plain blocking calls. Each virtual thread parked cheaply while waiting, freeing its carrier OS thread for other work.",
        steps: [
          { from: "req", to: "req", label: "submit 3 tasks to a virtual-thread executor", t: 0, say: "One virtual thread per call; they cost almost nothing to create." },
          { from: "req", to: "price", label: "vthread 1: blocking get", t: 0, say: "Each blocks in ordinary code…" },
          { from: "req", to: "stock", label: "vthread 2: blocking get", t: 0, say: "…and when it blocks, the JVM unmounts it from its OS thread." },
          { from: "req", to: "rev", label: "vthread 3: blocking get", t: 1, say: "The OS threads stay free to run other requests' virtual threads." },
          { from: "price", to: "req", label: "₹499", t: 49, kind: "res", say: "Each resumes when its response arrives." },
          { from: "stock", to: "req", label: "12 left", t: 50, kind: "res", say: "Stock arrives; its virtual thread resumes." },
          { from: "rev", to: "req", label: "4.6★ → page ready", t: 51, kind: "ok", say: "future.get() on each returns quickly: about 51 ms in total, with straight-line code." },
        ],
      },
    ],
  },
  "seq-print-order": {
    title: "Print in order with two batons",
    q: "Threads C, A and B start in that (wrong) order. How do two semaphores at zero force first → second → third?",
    about: "first() prints then releases afterFirst; second() waits for afterFirst, prints, releases afterSecond; third() waits for afterSecond.",
    actors: [{ id: "c", label: "Thread C: third()" }, { id: "a", label: "Thread A: first()" }, { id: "b", label: "Thread B: second()" }, { id: "s", label: "Semaphores" }],
    init: { s: "afterFirst 0 · afterSecond 0" },
    variants: [
      {
        key: "ok", label: "C starts first", end: "Output: first, second, third, regardless of start order. Each release passes the baton; nothing spins.",
        steps: [
          { from: "c", to: "s", label: "afterSecond.acquire()", say: "C starts first, but afterSecond has no permit: C sleeps.", set: { c: "waiting" } },
          { from: "b", to: "s", label: "afterFirst.acquire()", say: "B starts next: afterFirst has no permit, so B sleeps too.", set: { b: "waiting" } },
          { from: "a", to: "a", label: "print \"first\"", kind: "ok", say: "A needs no permit: it prints straight away." },
          { from: "a", to: "s", label: "afterFirst.release()", say: "A passes the baton.", set: { s: "afterFirst 1 · afterSecond 0" } },
          { from: "s", to: "b", label: "permit", say: "B wakes holding the permit.", set: { s: "afterFirst 0 · afterSecond 0", b: "running" } },
          { from: "b", to: "b", label: "print \"second\"", kind: "ok", say: "B prints." },
          { from: "b", to: "s", label: "afterSecond.release()", say: "B passes the baton to C.", set: { s: "afterFirst 0 · afterSecond 1" } },
          { from: "s", to: "c", label: "permit", say: "C wakes.", set: { s: "afterFirst 0 · afterSecond 0", c: "running" } },
          { from: "c", to: "c", label: "print \"third\"", kind: "ok", say: "C prints last." },
        ],
      },
    ],
  },
  "seq-visibility": {
    title: "When a write is never seen",
    q: "Thread 1 writes; thread 2 reads later. Why might thread 2 see an old value, or a new flag with old data?",
    about: "Two classic memory-visibility failures and their fixes. Each core works on cached copies; the compiler and CPU may reorder writes. Only happens-before edges (volatile, locks) force order and visibility.",
    actors: [{ id: "t1", label: "Thread 1 (core 1)" }, { id: "mem", label: "Main memory" }, { id: "t2", label: "Thread 2 (core 2)" }],
    init: { mem: "running = true", t2: "cached running = true" },
    variants: [
      {
        key: "flag", label: "Stop flag, not volatile", end: "The worker never stops: the JIT hoisted the read out of the loop, so it keeps using its own copy. Nothing in the program required it to look again.",
        steps: [
          { from: "t2", to: "mem", label: "read running → true", say: "The worker starts its loop: while (running) doWork();" },
          { from: "t2", to: "t2", label: "JIT: running never changes here → hoist read", kind: "bad", say: "The compiler sees no write to running inside the loop and turns it into while (true)." },
          { from: "t1", to: "mem", label: "running = false", say: "Main thread calls stop().", set: { mem: "running = false" } },
          { from: "t2", to: "t2", label: "doWork(); doWork(); doWork()…", kind: "bad", say: "The worker never re-reads the field. It runs forever." },
        ],
      },
      {
        key: "volatile", label: "Stop flag, volatile", end: "volatile forbids caching the read in a register and orders it with the write: the worker sees false on its next check and exits.",
        steps: [
          { from: "t2", to: "mem", label: "volatile read running → true", say: "Every loop iteration performs a real read." },
          { from: "t1", to: "mem", label: "volatile write running = false", say: "stop() writes the volatile field.", set: { mem: "running = false" } },
          { from: "t2", to: "mem", label: "volatile read running → false", kind: "ok", say: "The next read must see the latest write.", set: { t2: "stopped" } },
        ],
      },
      {
        key: "publish", label: "Data + ready flag, reordered", end: "Thread 2 saw ready = true but data = 0: the two writes became visible in the opposite order. Making ready volatile (writing it last) guarantees data is visible to anyone who sees ready.",
        init: { mem: "data = 0, ready = false", t2: "" },
        steps: [
          { from: "t1", to: "t1", label: "data = 42; ready = true;", say: "Thread 1 prepares data, then raises a flag." },
          { from: "t1", to: "mem", label: "ready = true (reordered first)", kind: "bad", say: "Neither field is volatile, so the CPU or compiler may make the flag visible before the data.", set: { mem: "data = 0, ready = true" } },
          { from: "t2", to: "mem", label: "read ready → true", say: "Thread 2 sees the flag." },
          { from: "t2", to: "mem", label: "read data → 0", kind: "bad", say: "…and reads stale data. It processes 0 instead of 42.", set: { t2: "used data = 0 ✗" } },
          { from: "t1", to: "mem", label: "data = 42 (finally visible)", say: "Too late.", set: { mem: "data = 42, ready = true" } },
        ],
      },
      {
        key: "fixed", label: "Data + volatile ready", end: "A volatile write publishes everything written before it. Anyone whose volatile read sees ready = true is guaranteed to see data = 42.",
        init: { mem: "data = 0, ready = false", t2: "" },
        steps: [
          { from: "t1", to: "mem", label: "data = 42", say: "The ordinary write happens first, and can't be moved after the volatile write.", set: { mem: "data = 42, ready = false" } },
          { from: "t1", to: "mem", label: "volatile ready = true", say: "The volatile write acts as a release: everything before it is published.", set: { mem: "data = 42, ready = true" } },
          { from: "t2", to: "mem", label: "volatile read ready → true", say: "The volatile read acts as an acquire." },
          { from: "t2", to: "mem", label: "read data → 42", kind: "ok", say: "Happens-before guarantees it sees 42.", set: { t2: "used data = 42 ✓" } },
        ],
      },
    ],
  },
  "seq-wait-notify": {
    title: "Waiting for an item: three ways to get it wrong, one right",
    q: "Two consumers wait for items; one producer adds one item. Where does each broken version fail?",
    about: "The shared queue is guarded by one lock. Compare waiting with if instead of while, checking without the lock (lost wake-up), and the correct while + notifyAll pattern.",
    actors: [{ id: "c1", label: "Consumer 1" }, { id: "c2", label: "Consumer 2" }, { id: "q", label: "Queue (lock)" }, { id: "p", label: "Producer" }],
    init: { q: "[]" },
    variants: [
      {
        key: "if", label: "if instead of while", end: "Consumer 1 woke up, didn't re-check, and removed from an empty queue. With while, it would have re-checked, seen the queue empty, and gone back to waiting.",
        steps: [
          { from: "c1", to: "q", label: "lock; if (empty) wait()", say: "Consumer 1 finds the queue empty and waits (releasing the lock).", set: { c1: "waiting" } },
          { from: "p", to: "q", label: "lock; add(x); notifyAll()", say: "The producer adds one item and wakes all waiters.", set: { q: "[x]" } },
          { from: "c2", to: "q", label: "lock; not empty → take x", say: "Consumer 2 arrives just now, gets the lock first and takes the item.", set: { q: "[]", c2: "got x" } },
          { from: "c1", to: "q", label: "re-acquire lock; continue after wait()", say: "Consumer 1 finally re-acquires the lock. Because of the if, it doesn't re-check." },
          { from: "c1", to: "q", label: "removeFirst() → NoSuchElementException", kind: "bad", say: "The queue is empty. Crash." },
        ],
      },
      {
        key: "lost", label: "Check without the lock", end: "The notification arrived between the check and the wait, when nobody was waiting, so it was lost. Consumer 1 sleeps although an item is there. Checking and waiting under the same lock prevents the gap.",
        steps: [
          { from: "c1", to: "q", label: "if (queue.isEmpty()) … (no lock)", say: "Consumer 1 checks without holding the lock: empty." },
          { from: "p", to: "q", label: "lock; add(x); notifyAll(); unlock", say: "Before consumer 1 starts waiting, the producer adds an item and notifies. No one is waiting yet.", set: { q: "[x]" } },
          { from: "c1", to: "q", label: "lock; wait()", kind: "bad", say: "Consumer 1 now waits, for a signal that already came.", set: { c1: "waiting forever" } },
          { from: "q", to: "q", label: "item sits unused", kind: "bad", say: "A lost wake-up: the item is there, the consumer sleeps." },
        ],
      },
      {
        key: "ok", label: "while + notifyAll under the lock", end: "Each consumer re-checks after waking and only takes an item that's really there; the check and the wait are atomic under the lock, so no signal is lost.",
        steps: [
          { from: "c1", to: "q", label: "lock; while (empty) wait()", say: "Consumer 1 checks under the lock and waits; wait() releases the lock atomically.", set: { c1: "waiting" } },
          { from: "c2", to: "q", label: "lock; while (empty) wait()", say: "Consumer 2 does the same.", set: { c2: "waiting" } },
          { from: "p", to: "q", label: "lock; add(x); notifyAll(); unlock", say: "The producer adds an item and wakes both.", set: { q: "[x]" } },
          { from: "c2", to: "q", label: "re-acquire; not empty → take x", kind: "ok", say: "Consumer 2 gets the lock first, re-checks, takes the item.", set: { q: "[]", c2: "got x" } },
          { from: "c1", to: "q", label: "re-acquire; empty → wait() again", kind: "ok", say: "Consumer 1 re-checks, finds it empty, and goes back to waiting. No crash, no lost item.", set: { c1: "waiting" } },
        ],
      },
    ],
  },
  "seq-layers": {
    title: "One booking through the layers",
    q: "Which layer owns each step, and what goes wrong when a business rule lives in the controller?",
    about: "A seat booking travels from the HTTP controller through the use case and the domain to the storage adapter. Compare the clean version, a rule leaking into the controller, and a test that swaps the adapter.",
    actors: [{ id: "http", label: "BookingController" }, { id: "app", label: "BookSeat use case" }, { id: "dom", label: "Show (domain)" }, { id: "port", label: "ShowRepository port" }, { id: "db", label: "JDBC adapter" }],
    variants: [
      {
        key: "clean", label: "Clean layering", end: "Each layer did one kind of job, and the business rule (no double booking, premium pricing) lives in the domain, reusable by the mobile API, a batch job or a test.",
        steps: [
          { from: "http", to: "http", label: "parse JSON, validate fields", say: "The controller turns HTTP into a command object. No rules here." },
          { from: "http", to: "app", label: "book(showId, seat, user)", say: "It calls the use case." },
          { from: "app", to: "port", label: "findById(showId)", say: "The use case loads the aggregate through a port it owns." },
          { from: "port", to: "db", label: "SELECT … FOR UPDATE", say: "The adapter implements the port with SQL, locking the row." },
          { from: "db", to: "app", label: "Show", kind: "res", say: "A domain object comes back, not a result set." },
          { from: "app", to: "dom", label: "show.book(seat, user)", say: "The domain applies the rules: seat free? premium price? Throws if not allowed.", set: { dom: "A7 → booked" } },
          { from: "app", to: "port", label: "save(show)", say: "The use case saves and commits: one transaction per use case." },
          { from: "app", to: "http", label: "Booking", kind: "res", say: "A result goes back up." },
          { from: "http", to: "http", label: "201 Created", kind: "ok", say: "The controller maps it to HTTP." },
        ],
      },
      {
        key: "leak", label: "Rule in the controller", end: "The premium discount now lives in the web controller. The mobile API and the group-booking job each need it too, so it gets copied, and the copies drift.",
        steps: [
          { from: "http", to: "http", label: "parse JSON", say: "Same start." },
          { from: "http", to: "db", label: "SELECT seat … (direct SQL)", kind: "bad", say: "The controller skips the use case and queries the database itself." },
          { from: "http", to: "http", label: "if (premium && weekend) price *= 0.8", kind: "bad", say: "A business rule written in the presentation layer." },
          { from: "http", to: "db", label: "INSERT booking", kind: "bad", say: "No transaction around check and insert: two requests can book the same seat." },
          { from: "http", to: "http", label: "200 OK", say: "It works today, but it can't be tested without a web server and a database." },
        ],
      },
      {
        key: "test", label: "Same use case, test adapter", end: "Swapping the adapter changed nothing above the port. The same use case and domain ran in a millisecond with no database.",
        steps: [
          { from: "app", to: "port", label: "findById(showId)", say: "In a unit test, the port is wired to an in-memory adapter." },
          { from: "port", to: "port", label: "InMemoryShowRepository: map.get", kind: "ok", say: "No SQL, no network.", set: { port: "in-memory" } },
          { from: "app", to: "dom", label: "show.book(A7, user)", say: "The real domain logic runs unchanged.", set: { dom: "A7 → booked" } },
          { from: "app", to: "port", label: "save(show)", say: "Saved into the map." },
          { from: "app", to: "app", label: "assert seat A7 booked, price ₹320", kind: "ok", say: "The test asserts the resulting state." },
        ],
      },
    ],
  },
  "seq-observer": {
    title: "A spot frees up: who hears about it?",
    q: "The floor doesn't know who is listening. What happens when a listener is slow, or was never unsubscribed?",
    about: "Three listeners have subscribed to a parking floor. Compare normal delivery, a slow push-notification listener called inline, and a screen that closed without unsubscribing.",
    actors: [{ id: "lot", label: "ParkingLot" }, { id: "fl", label: "Floor 2 (subject)" }, { id: "board", label: "EntranceBoard" }, { id: "app", label: "AppPusher" }, { id: "old", label: "Closed screen" }],
    init: { fl: "listeners: board, app" },
    variants: [
      {
        key: "ok", label: "Normal delivery", end: "One change, two reactions, and Floor 2 never named either listener. A new listener subscribes; the floor's code doesn't change.",
        steps: [
          { from: "lot", to: "fl", label: "release(R-17)", t: 0, say: "A car leaves; the lot tells the floor to free the spot." },
          { from: "fl", to: "fl", label: "free REGULAR: 11 → 12", t: 1, say: "The floor updates its own count first, then notifies.", set: { fl: "12 free · listeners: board, app" } },
          { from: "fl", to: "board", label: "changed(F2, REGULAR, 12)", t: 1, say: "Push model: the event carries the new count." },
          { from: "board", to: "board", label: "show 12", t: 2, kind: "ok", say: "The board redraws.", set: { board: "F2: 12" } },
          { from: "fl", to: "app", label: "changed(F2, REGULAR, 12)", t: 2, say: "Next listener." },
          { from: "app", to: "app", label: "enqueue push job", t: 3, kind: "ok", say: "A well-behaved listener: it only enqueues the slow work and returns at once." },
          { from: "fl", to: "lot", label: "done", t: 3, kind: "res", say: "The release finished in 3 ms." },
        ],
      },
      {
        key: "slow", label: "Slow listener inline", end: "The car's exit waited 2 seconds for a push-notification server it doesn't care about. Keep listeners fast (enqueue), or notify through an executor.",
        steps: [
          { from: "lot", to: "fl", label: "release(R-17)", t: 0, say: "Same release." },
          { from: "fl", to: "board", label: "changed(…)", t: 1, say: "The board updates quickly." },
          { from: "fl", to: "app", label: "changed(…)", t: 2, say: "This version of AppPusher calls the push server directly." },
          { from: "app", to: "app", label: "HTTP to push server… 2 s", t: 2002, kind: "bad", say: "The push server is slow today. The floor's notify loop is stuck waiting." },
          { from: "fl", to: "lot", label: "done after 2 s", t: 2003, kind: "bad", say: "The exit barrier opened two seconds late, because of a side effect." },
        ],
      },
      {
        key: "leak", label: "Never unsubscribed", end: "The closed screen is still in the listener list, so it can't be garbage-collected and keeps doing work. Every subscribe needs a matching unsubscribe (return a Subscription handle).",
        init: { fl: "listeners: board, app, closed screen" },
        steps: [
          { from: "old", to: "old", label: "user closed the screen", t: 0, say: "A settings screen subscribed when it opened, and the user closed it. It never unsubscribed." },
          { from: "lot", to: "fl", label: "release(R-17)", t: 5000, say: "Later, a spot frees up." },
          { from: "fl", to: "board", label: "changed(…)", t: 5001, say: "The board gets it." },
          { from: "fl", to: "old", label: "changed(…)", t: 5002, kind: "bad", say: "So does the dead screen: the floor still holds a strong reference to it." },
          { from: "old", to: "old", label: "redraw a disposed view", t: 5003, kind: "bad", say: "It wastes CPU, may throw, and its memory is never freed. Open and close it 1,000 times and there are 1,000 ghosts." },
        ],
      },
    ],
  },
  "seq-chain": {
    title: "A request through the middleware chain",
    q: "Where is each bad request stopped, and which handlers never run because of it?",
    about: "Every request passes timing → auth → rate limit → validation → the endpoint. Each handler either calls next or stops the request.",
    actors: [{ id: "c", label: "Client" }, { id: "tm", label: "Timing" }, { id: "au", label: "Auth" }, { id: "rl", label: "RateLimit" }, { id: "va", label: "Validate" }, { id: "ep", label: "Endpoint" }],
    variants: [
      {
        key: "ok", label: "Valid request", end: "Each handler did one job and called next. Timing wrapped everything, so it measured the full request on the way out.",
        steps: [
          { from: "c", to: "tm", label: "POST /orders", say: "The request enters the first handler." },
          { from: "tm", to: "au", label: "next(req)", say: "Timing starts a clock and passes the request on." },
          { from: "au", to: "rl", label: "next(req + user 42)", say: "Auth verifies the token and attaches the user to the request." },
          { from: "rl", to: "va", label: "next(req)", say: "User 42 is under the limit." },
          { from: "va", to: "ep", label: "next(req)", say: "The body is valid." },
          { from: "ep", to: "tm", label: "201 Created", kind: "res", say: "The endpoint answers; the response travels back out through each handler." },
          { from: "tm", to: "c", label: "201 · 38 ms", kind: "ok", say: "Timing records 38 ms on the way out and returns the response." },
        ],
      },
      {
        key: "noauth", label: "Missing token", end: "Auth short-circuited. Rate limiting, validation and the endpoint never ran, and timing still logged the 401.",
        steps: [
          { from: "c", to: "tm", label: "POST /orders (no token)", say: "A request without credentials." },
          { from: "tm", to: "au", label: "next(req)", say: "Timing passes it on." },
          { from: "au", to: "tm", label: "401 Unauthorized", kind: "bad", say: "Auth stops it and does NOT call next." },
          { from: "tm", to: "c", label: "401 · 1 ms", kind: "bad", say: "Cheap rejection; nothing behind auth spent any work." },
        ],
      },
      {
        key: "limited", label: "Over the rate limit", end: "Stopped before validation and the database: flooding the API costs the server almost nothing.",
        steps: [
          { from: "c", to: "tm", label: "POST /orders (601st this minute)", say: "A buggy client in a loop." },
          { from: "tm", to: "au", label: "next(req)", say: "Passes on." },
          { from: "au", to: "rl", label: "next(req + user 42)", say: "Authenticated: the limiter needs to know who it is." },
          { from: "rl", to: "tm", label: "429 · Retry-After: 12", kind: "bad", say: "Over the per-user limit: stopped here." },
          { from: "tm", to: "c", label: "429 · 2 ms", kind: "bad", say: "The client is told when to retry." },
        ],
      },
      {
        key: "invalid", label: "Invalid body", end: "Validation stopped it with field-level errors; the endpoint's code can assume valid input.",
        steps: [
          { from: "c", to: "tm", label: "POST /orders {qty: -3}", say: "A request with a bad field." },
          { from: "tm", to: "au", label: "next", say: "Passes on." },
          { from: "au", to: "rl", label: "next", say: "Authenticated." },
          { from: "rl", to: "va", label: "next", say: "Within limits." },
          { from: "va", to: "tm", label: "400 · qty must be ≥ 1", kind: "bad", say: "Validation rejects it before the endpoint." },
          { from: "tm", to: "c", label: "400 · 3 ms", kind: "bad", say: "A clear error for the client to fix." },
        ],
      },
    ],
  },
  "seq-factory": {
    title: "Who knows which class to build?",
    q: "When a new notification channel is added, which objects have to change?",
    about: "The same 'send a reminder' request, with the creation logic inside the service and then inside a factory.",
    actors: [{ id: "svc", label: "ReminderService" }, { id: "f", label: "NotifierFactory" }, { id: "cfg", label: "Config" }, { id: "n", label: "Notifier" }],
    variants: [
      {
        key: "inline", label: "Creation inside the service", end: "The service knows every concrete notifier, its constructor and its secrets. A WhatsApp channel means editing this service, and every other service with the same if/else.",
        steps: [
          { from: "svc", to: "svc", label: "if (user.prefersSms())…", say: "The service checks the channel itself." },
          { from: "svc", to: "cfg", label: "smsApiKey()", say: "It fetches the SMS provider's API key: business code now handles secrets." },
          { from: "svc", to: "n", label: "new SmsNotifier(key)", kind: "bad", say: "It builds the concrete class directly, coupling the service to SmsNotifier." },
          { from: "svc", to: "n", label: "send(reminder)", say: "Finally it sends." },
        ],
      },
      {
        key: "factory", label: "A factory owns creation", end: "The service only knows the Notifier interface and the factory. A new channel is a new class plus one registration in the factory; services don't change.",
        steps: [
          { from: "svc", to: "f", label: "forChannel(user.channel())", say: "The service asks for 'a notifier for this channel'." },
          { from: "f", to: "cfg", label: "smsApiKey()", say: "The factory reads configuration: the one place that knows secrets and constructors." },
          { from: "f", to: "f", label: "registry.get(SMS).get()", say: "It looks up the maker for SMS and builds the notifier." },
          { from: "f", to: "svc", label: "Notifier", kind: "res", say: "It returns the interface, not the concrete class." },
          { from: "svc", to: "n", label: "send(reminder)", kind: "ok", say: "The service sends without knowing which kind it holds." },
        ],
      },
    ],
  },
  "seq-singleton": {
    title: "Two threads, one 'singleton'",
    q: "How can a lazily created singleton end up with two instances, or hand out a half-built one?",
    about: "Two threads call getInstance() at the same moment. Compare the naive version, double-checked locking without volatile, and the holder idiom.",
    actors: [{ id: "t1", label: "Thread 1" }, { id: "t2", label: "Thread 2" }, { id: "cls", label: "Config class" }, { id: "heap", label: "Memory" }],
    init: { cls: "instance = null" },
    variants: [
      {
        key: "naive", label: "Naive lazy", end: "Two Config objects exist. Anything stored in the first (a cache, a counter) is invisible to users of the second.",
        steps: [
          { from: "t1", to: "cls", label: "instance == null ?", say: "Thread 1 checks: no instance yet." },
          { from: "t2", to: "cls", label: "instance == null ?", say: "Before thread 1 creates it, thread 2 checks too. Also null." },
          { from: "t1", to: "heap", label: "new Config() #1", say: "Thread 1 builds one.", set: { heap: "Config #1" } },
          { from: "t2", to: "heap", label: "new Config() #2", kind: "bad", say: "Thread 2 builds another.", set: { heap: "Config #1, #2" } },
          { from: "t1", to: "cls", label: "instance = #1", say: "Thread 1 stores its instance.", set: { cls: "instance = #1" } },
          { from: "t2", to: "cls", label: "instance = #2", kind: "bad", say: "Thread 2 overwrites it. Thread 1 keeps using #1, everyone else gets #2.", set: { cls: "instance = #2" } },
        ],
      },
      {
        key: "dcl", label: "Double-checked, no volatile", end: "Thread 2 saw a non-null reference and skipped the lock, but the constructor's writes were not yet visible to it. It used a half-built object. Declaring the field volatile forbids this reordering.",
        steps: [
          { from: "t1", to: "cls", label: "null → lock → still null", say: "Thread 1 checks, takes the lock, checks again: it will create the instance." },
          { from: "t1", to: "heap", label: "allocate Config", say: "Memory for the object is allocated." },
          { from: "t1", to: "cls", label: "instance = ref (reordered early)", kind: "bad", say: "Without volatile, the JVM and CPU may publish the reference before the constructor has finished writing fields.", set: { cls: "instance = ref" } },
          { from: "t2", to: "cls", label: "instance == null ? → no", say: "Thread 2 checks without the lock and sees a non-null reference." },
          { from: "t2", to: "heap", label: "config.timeout() → 0", kind: "bad", say: "It reads a field the constructor has not set yet: 0 instead of 3000." },
          { from: "t1", to: "heap", label: "constructor writes fields", say: "Too late: thread 2 already used the half-built object.", set: { heap: "Config (now complete)" } },
        ],
      },
      {
        key: "holder", label: "Holder idiom", end: "The JVM initialises the Holder class exactly once, with its own locking, and every thread sees it fully built. No volatile, no synchronized in your code.",
        steps: [
          { from: "t1", to: "cls", label: "Config.get() → Holder.INSTANCE", say: "Thread 1 touches the nested Holder class for the first time." },
          { from: "cls", to: "heap", label: "JVM initialises Holder (locked)", say: "Class initialisation runs once, under a JVM-managed lock.", set: { heap: "Config #1 (complete)" } },
          { from: "t2", to: "cls", label: "Config.get() → Holder.INSTANCE", say: "Thread 2 arrives during initialisation: the JVM makes it wait." },
          { from: "cls", to: "t1", label: "#1", kind: "ok", say: "Thread 1 gets the fully built instance." },
          { from: "cls", to: "t2", label: "#1", kind: "ok", say: "Thread 2 gets the same, fully built instance." },
        ],
      },
    ],
  },
  "seq-facade": {
    title: "Checkout with and without a facade",
    q: "How much does each client have to know to place an order, and where does the 'undo' logic live?",
    about: "The mobile API places an order. First it talks to every subsystem itself, then through one checkout facade. Try the payment-declined run.",
    actors: [{ id: "c", label: "Mobile API" }, { id: "f", label: "CheckoutFacade" }, { id: "inv", label: "Inventory" }, { id: "pay", label: "Payments" }, { id: "ship", label: "Shipping" }],
    variants: [
      {
        key: "direct", label: "Client calls everything", end: "The client knows four subsystems, their order and the compensation. The web app and the batch importer each repeat this sequence, and the copies drift.",
        steps: [
          { from: "c", to: "inv", label: "reserve(items)", say: "The client reserves stock itself." },
          { from: "c", to: "pay", label: "charge(total, card)", say: "It charges the card." },
          { from: "c", to: "ship", label: "book(address)", say: "It books a delivery slot." },
          { from: "c", to: "c", label: "if anything failed: release, refund…", kind: "bad", say: "And it must know how to undo each step on failure: duplicated in every client." },
        ],
      },
      {
        key: "facade", label: "One checkout() call", end: "One call. The sequence and its compensation live in one tested place; the subsystems are still there for callers that need finer control.",
        steps: [
          { from: "c", to: "f", label: "checkout(cart, card)", say: "The client makes one call." },
          { from: "f", to: "inv", label: "reserve(items)", say: "The facade runs the steps in the right order." },
          { from: "f", to: "pay", label: "charge(total, card, key)", say: "With an idempotency key, so a retry can't double-charge." },
          { from: "f", to: "ship", label: "book(address)", say: "Delivery slot booked." },
          { from: "f", to: "c", label: "OrderConfirmation", kind: "ok", say: "The client gets one result." },
        ],
      },
      {
        key: "declined", label: "Payment declined", end: "The facade released the reservation before reporting the failure, so no stock is stuck. Every client gets that behaviour for free.",
        steps: [
          { from: "c", to: "f", label: "checkout(cart, card)", say: "Same call." },
          { from: "f", to: "inv", label: "reserve(items)", say: "Stock reserved.", set: { inv: "2 reserved" } },
          { from: "f", to: "pay", label: "charge(total, card, key)", say: "The card is charged…" },
          { from: "pay", to: "f", label: "declined: insufficient funds", kind: "bad", say: "…and declined." },
          { from: "f", to: "inv", label: "release(reservation)", say: "Compensation: give the stock back.", set: { inv: "0 reserved" } },
          { from: "f", to: "c", label: "PaymentDeclined", kind: "bad", say: "The client gets a clear error and nothing is left half-done." },
        ],
      },
    ],
  },
  "seq-proxy": {
    title: "Three proxies, one interface",
    q: "The caller just calls read(doc). What can a proxy in between decide on its behalf?",
    about: "Each run puts a different proxy in front of the real document store: a protection proxy, a caching proxy, and a remote proxy whose network fails.",
    actors: [{ id: "c", label: "Caller" }, { id: "p", label: "Proxy" }, { id: "real", label: "DocumentStore" }],
    variants: [
      {
        key: "protect", label: "Protection proxy", end: "The real store never saw the forbidden request. Access control lives in one wrapper instead of every method of the store.",
        steps: [
          { from: "c", to: "p", label: "read(doc 7) as Bob", say: "Bob asks for document 7." },
          { from: "p", to: "p", label: "policy.canRead(Bob, 7)? no", kind: "bad", say: "The proxy checks the access policy first." },
          { from: "p", to: "c", label: "Forbidden", kind: "bad", say: "It refuses without forwarding." },
          { from: "c", to: "p", label: "read(doc 7) as Alice", say: "Alice, the owner, asks." },
          { from: "p", to: "real", label: "read(7)", say: "Allowed: forwarded." },
          { from: "real", to: "c", label: "Document 7", kind: "ok", say: "The result flows back through the proxy." },
        ],
      },
      {
        key: "cache", label: "Caching proxy", end: "The second read cost a map lookup instead of a disk read. The proxy must still decide how long entries stay fresh, and must sit after the permission check.",
        steps: [
          { from: "c", to: "p", label: "read(doc 7)", t: 0, say: "First read." },
          { from: "p", to: "real", label: "read(7)", t: 1, say: "Not cached yet: forwarded." },
          { from: "real", to: "p", label: "Document 7", t: 40, kind: "res", say: "40 ms from storage.", set: { p: "cache: {7}" } },
          { from: "p", to: "c", label: "Document 7", t: 41, say: "Stored and returned." },
          { from: "c", to: "p", label: "read(doc 7)", t: 500, say: "Same document again." },
          { from: "p", to: "c", label: "Document 7 (cached)", t: 500, kind: "ok", say: "Answered from the cache in under a millisecond." },
        ],
      },
      {
        key: "remote", label: "Remote proxy, network fails", end: "The remote proxy made a network call look like a method call, but the failure leaks through: the caller doesn't know whether the write happened. That is why remote calls need timeouts and idempotency keys.",
        steps: [
          { from: "c", to: "p", label: "save(doc 7, v2)", t: 0, say: "A local-looking call; the proxy is really a gRPC client stub." },
          { from: "p", to: "real", label: "RPC Save(7, v2)", t: 1, kind: "async", say: "It serialises the call and sends it over the network." },
          { from: "real", to: "real", label: "saved v2", t: 30, say: "The server saves it…", set: { real: "doc 7 = v2" } },
          { from: "real", to: "p", label: "OK (lost)", t: 31, kind: "drop", say: "…but the reply is lost on the way back." },
          { from: "p", to: "c", label: "DEADLINE_EXCEEDED after 2 s", t: 2001, kind: "bad", say: "The caller sees a timeout. Was it saved? Retrying is only safe if save is idempotent (same version or key)." },
        ],
      },
    ],
  },
  "seq-park": {
    title: "Parking a car: who calls whom",
    q: "Where in this flow can two entry gates hand out the same spot, and what one change prevents it?",
    about: "Each column is an object in one program; each arrow is a method call. Compare the race between two gates with the version where finding and claiming a spot is one step.",
    actors: [{ id: "g1", label: "Gate 1" }, { id: "g2", label: "Gate 2" }, { id: "lot", label: "ParkingLot" }, { id: "as", label: "SpotAssigner" }, { id: "sp", label: "Spot R-17" }],
    init: { sp: "free" },
    predict: { q: "Gate 1 calls findFree() and gets R-17. Before it calls occupy(), Gate 2 also calls findFree(). What does Gate 2 get?", options: ["A different spot", "R-17 too", "An error"], answer: 1, why: "findFree() only looks; nothing has claimed R-17 yet, so both gates see it as free." },
    variants: [
      {
        key: "ok", label: "One car, normal entry", end: "Six calls, one coordinator (ParkingLot), and each object does only its own job: the assigner picks, the spot guards its own state, the lot issues the ticket.",
        steps: [
          { from: "g1", to: "lot", label: "park(car KA-01)", say: "The gate hands the vehicle to the lot. The gate knows nothing about spots or pricing." },
          { from: "lot", to: "as", label: "take(REGULAR)", say: "The lot asks the assigner for a spot of the size this vehicle type needs." },
          { from: "as", to: "as", label: "pop nearest free REGULAR", say: "The assigner removes the nearest free regular spot from its free list in one atomic step.", set: { as: "R-17 claimed" } },
          { from: "as", to: "lot", label: "R-17", kind: "res", say: "It returns the claimed spot." },
          { from: "lot", to: "sp", label: "occupy(car)", say: "The spot records the vehicle and checks its own invariant: it must have been empty.", set: { sp: "KA-01" } },
          { from: "lot", to: "g1", label: "Ticket T1 (R-17, 09:02)", kind: "ok", say: "The lot creates a ticket with the entry time from its injected clock and returns it. The barrier opens." },
        ],
      },
      {
        key: "full", label: "Lot full", end: "The failure path is part of the design: a named LotFullException, not null, and the gate shows 'Full'.",
        init: { as: "no REGULAR free" },
        steps: [
          { from: "g1", to: "lot", label: "park(car KA-02)", say: "A car arrives when every regular spot is taken." },
          { from: "lot", to: "as", label: "take(REGULAR)", say: "The lot asks for a spot." },
          { from: "as", to: "lot", label: "Optional.empty()", kind: "res", say: "Nothing free: the assigner says so explicitly with an empty Optional." },
          { from: "lot", to: "g1", label: "throw LotFullException(CAR)", kind: "bad", say: "The lot turns 'no spot' into a named business error that the gate can display. No ticket, no half-done state." },
        ],
      },
      {
        key: "race", label: "Two gates, check-then-act", end: "Two cars were sent to the same spot: findFree() looked, occupy() acted, and another gate slipped into the gap. The spot's own check catches it, but one driver has already been let in.",
        steps: [
          { from: "g1", to: "lot", label: "park(car A)", say: "Two cars arrive at two gates at the same moment." },
          { from: "g2", to: "lot", label: "park(car B)", say: "Each gate runs park() on its own thread." },
          { from: "lot", to: "as", label: "findFree(REGULAR)  [gate 1]", say: "This version of the assigner only finds a free spot; it does not claim it." },
          { from: "as", to: "lot", label: "R-17", kind: "res", say: "R-17 is free." },
          { from: "lot", to: "as", label: "findFree(REGULAR)  [gate 2]", say: "Before gate 1 occupies it, gate 2's thread asks too." },
          { from: "as", to: "lot", label: "R-17", kind: "bad", say: "R-17 is still free as far as the assigner knows. Both threads now hold the same spot." },
          { from: "lot", to: "sp", label: "occupy(car A)", say: "Gate 1 occupies it.", set: { sp: "car A" } },
          { from: "lot", to: "sp", label: "occupy(car B)", kind: "bad", say: "Gate 2 tries too. If occupy() did not check, car B would silently overwrite car A." },
          { from: "sp", to: "lot", label: "IllegalStateException: taken", kind: "bad", say: "The spot's invariant check saves the data, but gate 2 must now retry, and the design had a race in it." },
        ],
      },
      {
        key: "fixed", label: "Two gates, atomic take", end: "Finding and claiming became one atomic operation inside the assigner (a concurrent queue's poll(), or a lock around pop). There is no gap left to slip into.",
        steps: [
          { from: "g1", to: "lot", label: "park(car A)", say: "The same two cars at the same moment." },
          { from: "g2", to: "lot", label: "park(car B)", say: "Two threads again." },
          { from: "lot", to: "as", label: "take(REGULAR)  [gate 1]", say: "take() finds AND claims in one step: e.g. freeRegular.poll() on a ConcurrentLinkedDeque." },
          { from: "as", to: "as", label: "poll() → R-17", say: "R-17 leaves the free list. It is gone for everyone else.", set: { as: "R-17 claimed" } },
          { from: "lot", to: "as", label: "take(REGULAR)  [gate 2]", say: "Gate 2 asks a moment later." },
          { from: "as", to: "as", label: "poll() → R-18", say: "It gets the next free spot.", set: { as: "R-17, R-18 claimed" } },
          { from: "lot", to: "g1", label: "Ticket (R-17)", kind: "ok", say: "Each gate gets a ticket for a different spot." },
          { from: "lot", to: "g2", label: "Ticket (R-18)", kind: "ok", say: "No exception, no retry, no shared spot." },
        ],
      },
    ],
  },
};
