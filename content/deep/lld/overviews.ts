import { md } from "@/content/ai/md";

/**
 * Chapter overview pages for LLD, written for first-time learners. Each replaces the old terse chapter lesson
 * (content/lld.ts) once the chapter's pages are written: a plain-words map of the chapter.
 */
export const LLD_OVERVIEWS: Record<string, string> = {
  "lld-framework": md`
## What this chapter is about

Low-level design (also called object-oriented design) is about the inside of **one program**: which classes it has, what each one is responsible for, how they work together, and the core code that makes it run. Interviewers test it because most engineering work is changing code that already exists, and well-organised code is much easier to change.

At Google this mostly shows up as "design a class" questions inside coding rounds (an LRU cache, a hit counter, a file system), with follow-ups such as "now make it thread-safe" or "now add a new type". Some teams, and many other companies, also run a dedicated 45–60 minute design round ("design a parking lot") or a longer machine-coding round where the program must run.

Five pages, in the order you'd use them in a round:

1. **How it's tested and scored.** The three shapes of the question, what interviewers write down, and how an L4, L5 and L6 answer differ.
2. **From prompt to use cases, entities and an API.** Asking the questions that change the design, turning nouns into classes and verbs into methods, and writing method signatures first.
3. **Class diagrams.** Drawing classes and the six relationships between them, and what each means in code.
4. **Sequence and state diagrams.** Showing who calls whom in a flow, and the legal states of an object, to find races and illegal transitions before coding.
5. **Writing the core code.** What to write in 15–20 minutes, where invariants and errors go, and how to talk through tests.

:::tip The one idea to keep
You're graded on how easy your code would be to change. Show where change will come from, and that each likely change is one new class with no edits to the old ones.
:::
`,
  "oop-solid": md`
## What this chapter is about

The building blocks of object-oriented code, and the principles that keep it easy to change. If the framework chapter is the "how to run the round", this chapter is the "what good code looks like".

Seven pages:

1. **Encapsulation.** Private data, public operations, and rules ("a balance is never negative") checked in exactly one place.
2. **Inheritance vs composition.** Why building objects from parts beats deep class hierarchies, and the few cases where inheritance is right.
3. **Polymorphism, interfaces and generics.** One call, many behaviours; replacing type switches; interfaces versus abstract classes.
4. **Single responsibility and open/closed.** Split by who asks for changes; add new cases by adding classes, not editing old ones.
5. **Liskov substitution and interface segregation.** Subtypes must keep their parent's promises; interfaces should be small and shaped by their users.
6. **Dependency inversion and injection.** Business logic depends on interfaces it owns, and receives its collaborators instead of creating them, which is what makes code testable.
7. **Design heuristics.** DRY, KISS, YAGNI, the Law of Demeter and fail-fast, and when each one applies.

The first five letters of these principles spell **SOLID**, a name you'll hear in every design interview.

:::tip The one idea to keep
Put each piece of knowledge in one place, behind the smallest interface that works, and let objects protect their own rules.
:::
`,
  "patterns-creational-structural": md`
## What this chapter is about

Design patterns are named, reusable solutions to problems that keep coming up. Knowing them gives you a shared vocabulary ("put pricing behind a strategy, wrap the client in a retrying decorator") and a ready-made shape for common situations. This chapter covers the two groups about **creating** objects and **assembling** them.

Six pages:

1. **Factories.** Giving object creation one home: simple factories, registries, the factory method and abstract factories for families that must match.
2. **Builder and prototype.** Building objects with many optional parts safely, and copying configured objects (and the shallow-copy trap).
3. **Singleton and object pools.** Exactly one instance, written thread-safely, and why "global access" is the part to avoid; pooling expensive resources like connections.
4. **Adapter and facade.** Making a third-party library fit your interface, and putting one simple entry point in front of a complicated subsystem.
5. **Decorator and proxy.** Stacking behaviour like logging, retries and caching around an object, and stand-ins that control access (lazy loading, remote calls, permission checks).
6. **Composite, bridge and flyweight.** Trees of parts and wholes (file systems), two dimensions that vary independently, and sharing data across millions of small objects.

:::tip The one idea to keep
A pattern is only worth using when you can name the change it absorbs. Say "decorator, so retries can be added to any client without touching it", never just "I'll use a decorator here".
:::
`,
  "patterns-behavioral": md`
## What this chapter is about

The behavioural patterns are about how objects **share work and talk to each other**. They are the ones that appear most in LLD interviews: pricing strategies, display boards that update, vending machines with states, undo in editors, request pipelines.

Seven pages:

1. **Strategy and template method.** Swappable algorithms behind an interface (pricing, eviction, matching), and fixed step sequences with replaceable steps.
2. **Observer.** Letting other parts of the program react to a change without the changing object knowing who they are, and the leaks and slow-listener traps.
3. **State.** One class per state, so "what does this button do right now?" has a clear, complete answer; how to keep transitions thread-safe.
4. **Command and memento.** Turning actions into objects so they can be undone, redone, queued or retried, and snapshots for what can't be reversed.
5. **Chain of responsibility.** Passing a request through a line of handlers (authentication, rate limiting, validation) that can each stop it.
6. **Iterator and visitor.** Walking any collection one element at a time (a coding-round favourite), and adding new operations over a fixed set of node types.
7. **Mediator, null object and interpreter.** A coordinator in the middle (chat rooms, auctions), a do-nothing object instead of null, and small rule languages (filters, spreadsheet formulas).

:::tip The one idea to keep
Most LLD questions are a few entities plus one or two of these patterns at the points that vary. Find the variation first; the pattern follows.
:::
`,
  "lld-quality": md`
## What this chapter is about

The engineering judgement graded alongside the class diagram: is this code safe to call, easy to test, honest about its data, and organised so it can grow? These are the questions a senior reviewer asks in a code review, and an interviewer asks after you've finished the main design.

Five pages:

1. **Designing a library API.** Small, hard-to-misuse public interfaces; contracts that say what happens on errors and under concurrency; changing an API without breaking its users.
2. **Modelling data.** Entities versus value objects, money and time done right, and using types to make invalid states impossible to write.
3. **Testability.** Seams, the different kinds of test doubles, why fakes usually beat mocks, and testing time and concurrency without flaky tests.
4. **Code smells and refactoring.** The common signs of trouble in code and the small, safe moves that fix each one.
5. **Layers in code.** Controllers, use cases, domain and infrastructure; repositories; hexagonal architecture and the rule that keeps business logic independent.

:::tip The one idea to keep
Good design and testable design are the same thing. If you can't easily test a piece of code, its dependencies are hidden or its responsibilities are mixed.
:::
`,
  concurrency: md`
## What this chapter is about

Most real components are used by many threads at once: request threads in a server, several gates in a parking lot, background workers. When threads share data that changes, things go wrong in ways that are rare in testing and common in production: lost updates, double bookings, values that are never seen, programs that freeze. "Now make it thread-safe" is the follow-up an L5 candidate must handle without being led.

Seven pages, from what threads are to the tools that tame them:

1. **Threads.** Processes versus threads, concurrency versus parallelism, and how many threads actually help.
2. **Race conditions.** Why count++ loses updates, the two shapes every race takes (read-modify-write and check-then-act), and the four ways to fix them.
3. **Visibility and the memory model.** Why a thread may never see another's write, and the happens-before rules that guarantee it does.
4. **Locks.** synchronized, ReentrantLock, read-write locks, how much each lock should cover, and the rules for holding them.
5. **Condition variables.** Sleeping until something becomes true, the "always wait in a while loop" rule, and building a blocking queue.
6. **Deadlock.** Threads waiting for each other forever, the four conditions behind it and how lock ordering prevents it.
7. **Atomics and compare-and-set.** Lock-free updates of single values, hot counters, and the ABA problem.

:::tip The one idea to keep
First list the shared mutable state. Then for each piece: don't share it, make it immutable, or protect every access, including reads, with the same lock or an atomic operation.
:::
`,
  "concurrency-practice": md`
## What this chapter is about

The previous chapter explained the dangers and the basic tools. This one is about the ready-made building blocks you assemble thread-safe components from, and the interview questions built on them: "implement a blocking queue", "design a thread pool", "design a task scheduler", "print in order with three threads".

Seven pages:

1. **Producer–consumer.** Handing work between threads through a bounded queue, what to do when it's full, and writing a blocking queue yourself.
2. **Semaphores, latches and barriers.** "At most N at a time", "wait until N things have happened", and "everyone meets here before continuing".
3. **Thread pools.** How a ThreadPoolExecutor decides between threads, queueing and rejection, futures, shutdown, and the deadlock that needs no locks.
4. **Concurrent collections.** ConcurrentHashMap and its atomic compound operations, copy-on-write lists, concurrent queues and sorted maps.
5. **Asynchronous code and virtual threads.** Waiting cheaply: CompletableFuture composition, event loops, and Java 21's virtual threads.
6. **Timers and scheduling.** Fixed rate versus fixed delay, delay queues, timing wheels for millions of timeouts, and designing a scheduler.
7. **Classic puzzles.** The shapes behind the well-known concurrency coding questions and the primitive that fits each.

:::tip The one idea to keep
Reach for the library first (blocking queues, executors, concurrent maps, semaphores, latches). Write your own wait/notify only when the interviewer asks you to build one, and then use while loops, finally blocks and bounded queues.
:::
`,
};
