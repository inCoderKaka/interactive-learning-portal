=== library-api
blurb: Designing the public API of a class or library that other engineers will call: naming, small surfaces, contracts (inputs, outputs, errors, thread safety, complexity), exceptions versus result types, nullability, immutability of inputs and outputs, and how to evolve an API without breaking callers.
signals: "Design a library / SDK / client for…" (rate limiter, cache, logger, retry helper) | "What does this method return when…?" | "How would you add a feature without breaking existing users?" | Reviewing someone else's public interface

--- lesson
:::words
- **Public API**: the methods, types and behaviour other code is allowed to rely on. Everything else is an internal detail you can change.
- **Contract**: what a method promises: what it needs, what it returns, what it changes, what can go wrong, and how it behaves under concurrency.
- **Checked exception (Java)**: an exception type the compiler forces callers to catch or declare. **Unchecked**: a `RuntimeException`, no such requirement.
- **Result type**: a return value that holds either a success value or an error (`Result<Order, OrderError>`), instead of throwing.
- **Backward compatible**: a change after which existing callers still compile and behave as before.
- **Deprecation**: marking an API as "still works, but will be removed; use X instead".
- **Hyrum's law**: with enough users, every observable behaviour of your API will be depended on by somebody.
:::

## The problem in plain words

Inside one class, a bad method name costs you a minute. In a library used by fifty teams, it costs everyone, forever: you cannot rename or change it without breaking them. A public API is a **promise**. The skill is making promises that are easy to use correctly, hard to use incorrectly, and small enough that you can keep them while the implementation changes underneath.

:::eli5
A power socket is a great API: one shape, obvious use, hard to plug in wrong, and the power station behind it can change completely without anyone replacing their lamps. A bad API is a socket with seven holes where three combinations electrocute you.
:::

## Small, obvious, hard to misuse

- **Few public methods.** Every public method is a promise to maintain. Start minimal; it's easy to add, impossible to remove.
- **Names that say what happens:** `reserve(seat)` vs `process(seat)`; `tryAcquire()` returns a boolean, `acquire()` waits.
- **Types instead of primitives:** `transfer(AccountId from, AccountId to, Money amount)` cannot be called with arguments swapped the way `transfer(long, long, long)` can.
- **Required things in the constructor or method arguments**, optional things in a builder or options object, never "call `init()` before using".
- **Make illegal calls impossible** where you can (a `ClosedConnection` type has no `query` method) and fail fast where you can't.

## Writing the contract down

For each public method, the reader should be able to answer:

| Question | Example answer for `RateLimiter.tryAcquire(String key)` |
|---|---|
| Inputs and their rules | key non-null, any string; treated case-sensitively |
| Output | `true` if allowed now, `false` if over the limit |
| Side effects | consumes one permit when it returns true |
| Errors | `NullPointerException` for null key; never throws for over-limit |
| Thread safety | safe to call from many threads concurrently |
| Performance | O(1), no I/O, no blocking |

A Javadoc comment that answers these is part of the design. Interviewers often ask exactly these questions about your API.

## Errors: exceptions, results or Optional

- **Unchecked exceptions for programming errors:** null where not allowed, invalid arguments, calling methods in the wrong state. The caller can't sensibly recover; they must fix their code.
- **Expected outcomes are part of the return type:** "over the limit" is `false`, "not found" is `Optional.empty()`, "payment declined" is a `ChargeResult.declined(reason)` or a documented business exception.
- **Checked exceptions** force handling and suit recoverable conditions at boundaries (`IOException`), but they spread through signatures and don't work well with lambdas; many modern Java APIs avoid adding new ones.
- **Never return `null` from a public method** without making it explicit; prefer `Optional` for single values and **empty collections**, never null collections.
- **Translate errors at boundaries:** your library throws its own exception types, not the database driver's.

## Inputs and outputs that can't be corrupted

- **Copy mutable inputs** you keep (`List.copyOf(items)`), so callers can't change your state later.
- **Return immutable or copied outputs**, so callers can't change your state through them.
- **Prefer immutable value types** for anything crossing the API (`Money`, `TimeWindow`, records).

## Evolving without breaking callers

Changes that are safe: adding a new method, adding a new class, adding an overload with a sensible default, adding a field to an options builder with a default, adding a default method to an interface. Changes that break callers: removing or renaming anything, changing parameter or return types, adding a checked exception, adding an abstract method to an interface others implement, and **changing behaviour callers depend on** (ordering of results, timing, error types).

Practical techniques:

- **Options objects or builders** for parameters, so adding a parameter isn't a new overload each time.
- **Deprecate, then remove:** mark the old method `@Deprecated` pointing to the new one, keep it working for a release cycle, measure usage, then remove.
- **Hide implementation types:** return interfaces (`List`, `Map`) and your own types, so you can change the class behind them.
- **Version** at service boundaries (v1/v2 endpoints, protobuf field numbers that are never reused).

**Hyrum's law** (named after a Google engineer) is the warning: whatever your API *happens* to do (the order a map iterates in, the exact error message, how long a call takes), someone depends on it. Document what is guaranteed, and deliberately avoid promising more (Java's `HashMap` iteration order is explicitly unspecified; Go randomises map order so nobody can depend on it).

## What breaks

- **Boolean and primitive parameter soup:** `send(msg, true, false, 3)`.
- **Temporal coupling:** "must call `open()` then `configure()` before `send()`".
- **Leaking internal types** (a `HashMap` field returned directly, a vendor exception thrown).
- **Over-promising:** documenting or exposing behaviour you will want to change.
- **Removing or changing methods without a deprecation path.**

## Interview angles

- "Design the API of a rate-limiter library." `RateLimiter.create(config)`, `tryAcquire(key)` vs `acquire(key, timeout)`, clear thread-safety and performance contract, metrics hook.
- "A team wants a new parameter on `send`." Options object with a default; no breaking change.
- "What does your `get` return when the key is missing?" `Optional<V>` (or document `null`, but say why not).

--- revise
### Shape
? Why keep public APIs small? :: Every public member is a permanent promise; easy to add, impossible to remove.
? Why domain types instead of primitives? :: transfer(AccountId, AccountId, Money) can't be called with swapped longs.
? What is temporal coupling? :: Requiring calls in a hidden order ("call init() first"); avoid via constructors/builders/types.
? Six things a method contract states? :: Inputs and rules, output, side effects, errors, thread safety, performance.

### Errors and evolution
? Exceptions vs return values for errors? :: Unchecked exceptions for programming errors; expected outcomes in the return type (boolean, Optional, Result).
? Null in public APIs? :: Avoid: Optional for single values, empty collections never null.
? Safe API changes? :: Adding methods/classes, overloads or builder fields with defaults, default interface methods.
? Breaking changes? :: Removing/renaming, changing types, new checked exceptions, new abstract interface methods, changed observable behaviour.
? Deprecation path? :: @Deprecated pointing to the replacement, keep working a cycle, measure use, then remove.
? Hyrum's law? :: With enough users, every observable behaviour of your API is depended on by someone.

--- notes
## Shape
Few public methods; clear names (tryAcquire vs acquire); domain types; required in constructor; optional in builder.
No temporal coupling; impossible states unrepresentable; fail fast.
## Contract
Inputs, output, side effects, errors, thread safety, complexity. Write it in Javadoc.
## Errors
Programming errors → unchecked. Expected outcomes → boolean/Optional/Result/documented business exception.
Checked exceptions: recoverable boundary conditions; spread through signatures; awkward with lambdas.
No null returns; empty collections. Translate errors at boundaries.
## Data across the boundary
Copy mutable inputs; return immutable/copied outputs; immutable value types.
## Evolution
Safe: add methods, classes, defaulted overloads/builder fields, default methods.
Breaking: remove/rename, change types, add checked exceptions, add abstract methods, change observable behaviour.
Options objects; deprecate → measure → remove; return interfaces; version service APIs.
Hyrum's law: document guarantees, avoid accidental promises (unspecified HashMap order, Go map randomisation).

--- doubts
Q: Should a library throw or return an error for "not found"?
A: It depends on whether "not found" is a normal outcome for the caller. A cache's `get` missing a key is normal: return `Optional`. A `getAccount(id)` where the id came from your own database and must exist: a missing account is a bug or data corruption, so an exception is reasonable. Pick per method and document it; mixing styles at random is what confuses callers.

Q: Why do many modern Java libraries avoid checked exceptions?
A: Checked exceptions must be declared by every method in between, so a low-level detail (an `SQLException`) leaks into high-level signatures, and they don't fit functional interfaces (`Function` can't throw checked exceptions). Libraries like Guava and most of Google's Java code prefer unchecked exceptions plus clear documentation, and result types for expected failures.

Q: Is adding a method to an interface a breaking change?
A: For callers, no. For **implementers** outside your codebase, yes: their classes no longer compile. Java's default methods solve this: add the method with a default implementation. This is how `Collection.stream()` was added in Java 8 without breaking every collection ever written.

Q: How detailed should API documentation be?
A: Enough that a caller never needs to read your implementation: the contract table above, plus an example. Document what is guaranteed and explicitly say what is not (ordering, timing), so callers don't build on accidents.

--- exercises
[design] Design the public API of an in-process `RetryPolicy` utility that other teams use to call unreliable services. Show the main types and method signatures and its contract.
A: RetryPolicy.builder().maxAttempts(3).backoff(Backoff.exponential(Duration.ofMillis(100), 2.0, Duration.ofSeconds(2))).jitter(true).retryOn(e -> e instanceof TransientException).build() → immutable, thread-safe. <T> T call(Callable<T> op) throws the last exception after the final attempt (wrapped in RetriesExhausted with attempt count and causes). <T> CompletableFuture<T> callAsync(Supplier<CompletableFuture<T>> op, ScheduledExecutorService ex). Contract: op must be idempotent (stated loudly); no retry on InterruptedException; overall deadline option; metrics listener hook (onRetry(attempt, cause)). Validation in build(): maxAttempts ≥ 1, delays positive.

[break] `public List<Order> getOrders(long userId, boolean includeCancelled, boolean sortDesc, int page)` returns `null` when the user has no orders, and the internal `ArrayList` otherwise. List the problems.
A: Boolean parameter soup (call sites like getOrders(42, true, false, 0) are unreadable and easy to swap); a raw long id (could pass an order id by mistake); null for "no orders" instead of an empty list (forces null checks, NPE risk); returns the internal mutable list (callers can corrupt state); page as int without page size or a cursor (hard to evolve). Better: getOrders(UserId user, OrderQuery query) where OrderQuery is a builder (includeCancelled, sort, pageSize, pageToken), returning an immutable Page<Order> with items and nextPageToken.

[choose] Breaking or non-breaking for existing callers? (a) Adding `Optional<Item> peek()` to a concrete class. (b) Adding an abstract method to a public interface that customers implement. (c) Changing `search()` to return results in a different order when the docs never specified order. (d) Adding a timeout field with a default to an options builder.
A: (a) Non-breaking. (b) Breaking for implementers (use a default method). (c) Technically allowed, but Hyrum's law says someone depends on the old order: announce it, or randomise/document order from the start. (d) Non-breaking.

--- pitfalls
- Exposing many public methods "in case someone needs them"
- Boolean and primitive parameters that are easy to pass in the wrong order
- Returning null, or returning internal mutable collections
- Throwing implementation exceptions (driver, vendor) through the public API
- Removing or changing methods with no deprecation period

--- quiz
Q: Which change is safe for existing callers and implementers of a public interface?
- Adding an abstract method
- *Adding a default method
- Renaming a method
- Changing a parameter type
W: Default methods don't break existing implementations.
Q: A cache's `get(key)` misses. Best return?
- null without documentation
- Throw an exception
- *Optional.empty()
- An empty string
W: A miss is a normal outcome; make it explicit.
Q: Hyrum's law says…
- APIs should be versioned
- *Every observable behaviour of a widely used API will be depended on by someone
- Exceptions should be unchecked
- Interfaces should be small
W: Even unspecified behaviour becomes a de-facto contract.

--- sources
- article :: Hyrum's Law :: Hyrum Wright :: https://www.hyrumslaw.com/
- book :: Software Engineering at Google, ch. 1 and 21 (Hyrum's law, dependency management) :: Winters, Manshreck, Wright (O'Reilly) :: https://abseil.io/resources/swe-book
- article :: How to Design a Good API and Why it Matters :: Joshua Bloch (Google Tech Talk) :: https://research.google/pubs/how-to-design-a-good-api-and-why-it-matters/
- book :: Effective Java (3rd ed.), items 49–56 (methods: validity checks, defensive copies, signatures, Optional, docs) :: Joshua Bloch :: https://www.oreilly.com/library/view/effective-java-3rd/9780134686097/

=== modelling-data
blurb: How to model the data of a domain in code: entities (identity that lasts) versus value objects (defined by their values, immutable), enums for closed sets, IDs as types, money and time done right, and "make illegal states unrepresentable" with types instead of flags.
signals: Money, dates, quantities and IDs in a design | Several booleans describing one status | "What is the type of this field?" | Booking, payment and inventory models where wrong data costs money

--- lesson
:::words
- **Entity**: an object with an identity that stays the same while its data changes (a user, an order, a seat).
- **Value object**: an object defined entirely by its values, usually immutable, with no identity of its own (an amount of money, a date range, an address).
- **Identity**: what makes two objects "the same thing" (an id), as opposed to having equal data.
- **`equals` and `hashCode`**: Java methods that define when two objects are equal and how they are placed in hash maps; they must agree with each other.
- **Primitive obsession**: using raw `int`, `long`, `String` and `double` for domain ideas like money, ids and emails.
- **Sum type**: a type that is exactly one of several cases, each with its own data (a payment is a card payment *or* a UPI payment *or* a wallet payment). In Java: a `sealed` interface with records.
:::

## The problem in plain words

The commonest bugs in business code aren't algorithmic; they are **data that should be impossible**: an order that is both cancelled and shipped, a price of −₹40, a refund in dollars applied to a rupee account, a user id passed where a seat id was expected, ₹0.1 + ₹0.2 ≠ ₹0.3. Good data modelling uses the type system to make those states impossible to write, so whole classes of bugs never happen.

:::eli5
A shape-sorter toy for toddlers: the star only fits through the star hole. You don't need to remind the toddler "don't put the star in the circle"; it simply won't go. Good types are shape-sorter holes for data.
:::

## Entities vs value objects

| | Entity | Value object |
|---|---|---|
| Identity | Has an id; same thing even if data changes | None; defined by its values |
| Equality | By id | By all values |
| Mutability | Changes through domain operations | Immutable; "change" = new object |
| Examples | `Order`, `User`, `Seat`, `Account` | `Money`, `DateRange`, `Address`, `Coordinates`, `SeatNumber` |

In Java, value objects are perfect as `record`s (equality by value, immutable, compact). Entities are classes whose `equals` and `hashCode` use the id (or are left as identity) and whose state changes through methods with rules.

## IDs as types

```java
record UserId(long value) {}
record SeatId(String value) {}
void book(UserId user, SeatId seat) { ... }          // book(seat, user) no longer compiles
```

The cost is tiny; the payoff is that the compiler catches swapped arguments, and the type documents what the value is.

## Money, done right

```java
record Money(long minorUnits, Currency currency) {
  Money {
    Objects.requireNonNull(currency);
    if (minorUnits < 0) throw new IllegalArgumentException("negative amount");
  }
  Money plus(Money o)  { same(o); return new Money(minorUnits + o.minorUnits, currency); }
  Money times(long n)  { return new Money(Math.multiplyExact(minorUnits, n), currency); }
  private void same(Money o) { if (!currency.equals(o.currency)) throw new IllegalArgumentException("currency mismatch"); }
}
```

- **Never `double` for money:** binary floating point cannot represent 0.1 exactly; sums drift. Use integer minor units (paise, cents) or `BigDecimal` with an explicit scale and rounding mode.
- **Currency travels with the amount**, and mixing currencies fails loudly.
- **Rounding is a business rule** (per line or per total? half-up or banker's?), so it lives in one place.
- **Splitting** money (₹100 three ways) needs an allocation that distributes the leftover paisa (33.34 + 33.33 + 33.33), not three times 33.33.

## Time, done right

- Store **instants** (`Instant`, UTC) for "when did it happen"; convert to a time zone only for display or for rules that are about local time ("weekend pricing in IST").
- Use **`LocalDate`** for calendar dates without time (a birthday, a hotel night), **`Duration`** for elapsed time, **`ZonedDateTime`** when a rule depends on local clocks (daylight saving changes!).
- Inject a `Clock` (see the DIP page).
- Model ranges as half-open `[start, end)` so adjacent bookings don't overlap.

## Enums for closed sets

Vehicle types, seat classes, order statuses, coin denominations: an `enum` gives a fixed set, exhaustive `switch` checks and a place for per-value data (`VehicleType.TRUCK.needs = LARGE`). Strings for these invite typos (`"CANCELED"` vs `"CANCELLED"`).

Use an enum when the set changes with **code releases**; use data (a table, configuration) when it changes **at run time** (product categories added by staff).

## Make illegal states unrepresentable

Booleans multiply states: `isPaid`, `isShipped`, `isCancelled` allow 8 combinations, and maybe 4 are valid. Replace them with **one** status, and attach data to the states that have it:

```java
sealed interface PaymentState permits Pending, Paid, Refunded, Failed {}
record Pending() implements PaymentState {}
record Paid(ChargeId charge, Instant at) implements PaymentState {}
record Refunded(ChargeId charge, RefundId refund, Instant at) implements PaymentState {}
record Failed(String reason) implements PaymentState {}
```

Now "refunded without a charge id" cannot be constructed, and a `switch` over `PaymentState` must handle every case. Other examples: a `ContactMethod` that is an email *or* a phone (not two nullable fields), a `Shape` that is a circle with a radius *or* a rectangle with width and height.

## What breaks

- **`double` for money**, or amounts without currency.
- **`String` statuses** and boolean flag combinations.
- **Raw `long`/`String` ids** passed in the wrong order.
- **Mutable value objects** used as map keys (change the key, lose the entry).
- **Entities compared by all fields** (two different users with the same name are "equal").
- **Local times stored without zones**, breaking across daylight-saving changes.

## Interview angles

- "What's the type of `price`?" `Money` with minor units and currency; never `double`.
- "Can a ticket be paid and lost at once?" Show the status as one sealed type or enum, not flags.
- "How do you split ₹100 among three people?" Allocate remainders: 33.34, 33.33, 33.33.

--- revise
### Entities and values
? Entity vs value object? :: Entity: identity by id, changes over time. Value object: defined by values, immutable, equality by value.
? Best Java form for value objects? :: Records (value equality, immutability, compact constructor validation).
? Why IDs as types (UserId, SeatId)? :: The compiler rejects swapped arguments, and the type documents meaning.
? Danger of mutable map keys? :: Changing the key changes its hash, so the entry can't be found.

### Money, time, states
? Why never double for money? :: Binary floating point can't represent 0.1 exactly; sums drift. Use minor units or BigDecimal with explicit rounding.
? How to split ₹100 three ways? :: Allocate the leftover paisa: 33.34 + 33.33 + 33.33.
? Instant vs LocalDate vs ZonedDateTime? :: Instant for when it happened (UTC); LocalDate for calendar dates; ZonedDateTime for rules about local clocks.
? Why half-open ranges? :: [start, end) lets adjacent bookings touch without overlapping.
? Enum vs data for a set of values? :: Enum if it changes with code releases; data if it changes at run time.
? Make illegal states unrepresentable how? :: One status as an enum or sealed interface of records carrying per-state data, instead of boolean flags.

--- notes
## Entity vs value
Entity: id, mutable through rules, equality by id (Order, User, Seat).
Value: immutable, equality by value, records (Money, DateRange, Address).
IDs as types: record UserId(long value).
## Money
long minor units or BigDecimal + scale + rounding; currency with amount; mismatches fail.
Rounding = business rule in one place. Allocation for splits.
## Time
Instant (UTC) for events; LocalDate for dates; Duration elapsed; ZonedDateTime for local-time rules (DST).
Inject Clock. Half-open ranges.
## Enums
Closed sets changing with releases; per-constant data; exhaustive switch. Run-time sets → data.
## Illegal states
Flags (isPaid, isShipped, isCancelled) → one status.
Sealed interface of records with per-state data: Pending / Paid(charge, at) / Refunded / Failed(reason).
Either-or fields → sum types (ContactMethod = Email | Phone).
## Smells
double money; string statuses; raw ids; mutable keys; entity equality by fields; zone-less local times.

--- doubts
Q: Should entities be records too?
A: Usually not. Records compare by all fields and are immutable, which suits values. An entity's identity is its id, and it changes over time under rules (an `Order` gains lines and changes status). Make the entity a class with an id field, `equals`/`hashCode` on the id (or default identity), and mutation through methods. Records are still great for an entity's **snapshot** or for events about it.

Q: Is `BigDecimal` or `long` minor units better for money?
A: Both work. `long` minor units are fast, simple and exact for one currency's smallest unit; they struggle with currencies of different decimal places only if you forget to store the currency. `BigDecimal` handles fractional units (interest calculations, exchange rates) but you must always specify scale and rounding mode, and compare with `compareTo`, not `equals` (2.0 and 2.00 are not `equals`).

Q: How do I store a sealed-type status in a database?
A: As a status column (an enum string) plus columns for the per-state data that are null in other states, with a check constraint, or as a JSON column. The point of the sealed type is that the **code** can't build an invalid combination; the database mapping converts at the boundary.

Q: What's wrong with `LocalDateTime` for an event timestamp?
A: It has no zone, so "2026-03-29 02:30" may not exist (a daylight-saving gap) or may mean two different instants depending on where the server is. Store the instant (UTC), and keep the user's zone separately if you need to show or apply local rules.

--- exercises
[design] Model a hotel booking's data: guest, room, stay dates, price, and lifecycle (held for 10 minutes, confirmed with payment, cancelled with or without refund, checked in, checked out). Name the types.
A: Entities: Booking (BookingId, GuestId, RoomId, Stay, Money total, BookingState state), Guest, Room. Values: BookingId/GuestId/RoomId records; Stay(LocalDate checkIn, LocalDate checkOut) half-open with nights() and overlaps(); Money(minorUnits, currency). BookingState sealed: Held(Instant expiresAt), Confirmed(PaymentId payment), Cancelled(Instant at, Optional<RefundId> refund), CheckedIn(Instant at), CheckedOut(Instant at). Transitions are methods on Booking that check the current state; expiry is an event that only affects Held.

[break] `class Payment { double amount; String currency; String status; boolean refunded; String refundId; }`. List every problem.
A: double for money (rounding errors); currency as a free String (typos, no validation); status as a String (typos, no exhaustive handling); a refunded boolean plus a status allows contradictions (status "FAILED" with refunded = true); refundId may be null or set inconsistently with refunded; all fields mutable and public-ish. Fix: Money record with minor units and java.util.Currency; a sealed PaymentState (Pending, Captured(chargeId), Refunded(chargeId, refundId), Failed(reason)); immutable values, state changed only through methods.

[choose] Enum, sealed interface of records, or data table? (a) Seat classes: economy, premium, business, first. (b) Product categories that merchandisers add weekly. (c) A delivery address that is either a street address or a pickup point with an id and opening hours.
A: (a) Enum: fixed, changes with releases. (b) A data table: changes at run time without deploys. (c) Sealed interface with two records (StreetAddress, PickupPoint), each with its own fields.

--- pitfalls
- double for money, or amounts with no currency
- Statuses as strings or as several booleans
- Raw long or String ids that can be swapped
- Mutable objects used as hash-map keys
- Timestamps stored as local date-times without a zone

--- quiz
Q: Which pair is a value object and an entity, in that order?
- Order, Money
- *Money, Order
- User, Seat
- Address, Coordinates
W: Money is defined by its value; an order has a lasting identity.
Q: Why does `0.1 + 0.2 == 0.3` fail with doubles?
- Java bug
- *Binary floating point can't represent 0.1 and 0.2 exactly
- Doubles are 32-bit
- Integer overflow
W: Use integer minor units or BigDecimal for money.
Q: What best replaces `isPaid`, `isShipped`, `isCancelled` flags?
- More flags
- A status string
- *One status type (enum or sealed interface) with per-state data
- A comment
W: One status removes contradictory combinations.

--- sources
- article :: Value Object :: Martin Fowler :: https://martinfowler.com/bliki/ValueObject.html
- book :: Domain-Driven Design, ch. 5 "A model expressed in software" (entities, value objects) :: Eric Evans :: https://www.domainlanguage.com/ddd/
- article :: Effective ML: make illegal states unrepresentable :: Yaron Minsky (Jane Street) :: https://blog.janestreet.com/effective-ml-revisited/
- article :: java.time package overview :: Oracle Java SE 21 API :: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/time/package-summary.html

=== testability
blurb: Designing code that is easy to test: seams where dependencies can be swapped, the kinds of test doubles (dummy, stub, fake, spy, mock) and when to use each, why Google prefers fakes and real objects over heavy mocking, testing time and concurrency, and what to say when asked "how would you test this?".
signals: "How would you test this?" | Code that reads the clock, the network or a global | Tests that break when implementation details change | Concurrency code that "works on my machine"
widgets: doubles-lab

--- lesson
:::words
- **Unit test**: an automated test of a small piece of code (a class or a few) in isolation, fast and deterministic.
- **Integration test**: a test that exercises several real components together (your code with a real database).
- **Seam**: a place where you can change what code does without editing it, usually an injected interface.
- **Test double**: anything used in place of a real dependency in a test. Kinds: **dummy** (passed but never used), **stub** (returns canned answers), **fake** (a working lightweight implementation, like an in-memory repository), **spy** (records how it was called), **mock** (pre-programmed with expectations about calls, and verifies them).
- **Flaky test**: a test that sometimes passes and sometimes fails without code changes.
- **Deterministic**: gives the same result every run.
:::

## The problem in plain words

Code is only as good as your ability to check it. Code that creates its own database connection, reads the system clock, sends real emails and holds global state can only be tested by running the whole world, slowly and unreliably. Testable code isn't written with special tricks; it's simply **well-designed code**: small classes, injected dependencies, pure decision logic, side effects at the edges. Interviewers ask "how would you test this?" because the answer reveals the design.

:::eli5
A car factory tests the engine on a test bench before putting it in a car: fuel comes from a test tank, the "road" is a rolling drum, and sensors record everything. That only works because the engine connects to the car through standard fittings. Seams are those fittings.
:::

## Seams come from design

Every hidden dependency is a missing seam: `new MySqlRepo()` inside a method, `Instant.now()`, a static `Database.query()`, a singleton. Dependency injection (the DIP page) creates the seams: anything slow, external, non-deterministic or varying arrives through the constructor as an interface.

## The test doubles

| Double | What it is | Typical use |
|---|---|---|
| Dummy | A placeholder never actually used | Filling a required parameter |
| Stub | Returns fixed answers | "The rate service returns ₹82.5" |
| Fake | A real, simplified implementation | `InMemoryOrderRepository`, `FakeClock`, an in-memory message queue |
| Spy | A stub or fake that also records calls | "Was exactly one email sent, to whom?" |
| Mock | Programmed with expected calls; fails if they don't happen | Verifying an interaction that is the actual requirement |

See what each kind of double lets one test check, and what makes it brittle:

[[widget:doubles-lab]]

## Prefer real objects, then fakes, then mocks

Google's testing guidance (in *Software Engineering at Google* and the Google Testing Blog) is clear: use **real implementations** when they're fast and deterministic (value objects, pure logic, small collaborators), **fakes** for dependencies that are slow or external, and **mocks sparingly**. Heavy mocking ("verify that `repo.save` was called once with these arguments, then `cache.invalidate`...") tests **how** the code works rather than **what** it achieves, so every refactoring breaks the tests even when behaviour is unchanged. Test **state** (what's in the fake repository afterwards, what the method returned) over **interactions**, except when the interaction is the requirement (an email must be sent exactly once).

Fakes are worth maintaining: one well-tested `InMemoryBookingRepository`, owned by the team that owns the real one, serves hundreds of tests and the 90-minute machine-coding round alike.

## Testing time

```java
var clock = new MutableClock(Instant.parse("2026-11-28T10:00:00Z"));
var lot = new ParkingLot(assigner, new HourlyPricing(Money.of(20, INR)), clock);
Ticket t = lot.park(car);
clock.advance(Duration.ofMinutes(61));
assertEquals(Money.of(40, INR), lot.exit(t.id()));      // 61 minutes = 2 hours, rounded up
```

No `Thread.sleep`, no flakiness, boundaries tested exactly (59, 60, 61 minutes). The same goes for timeouts, expiry, rate-limit windows and retries with backoff (inject a scheduler or a sleeper).

## Testing concurrency

Concurrency bugs hide from ordinary tests. Practical techniques:

- **Stress tests with a start gate:** create N threads, make them all wait on a `CountDownLatch`, release them together, and assert the invariant afterwards (no seat sold twice, counter equals N × iterations). Run many iterations.
- **Deterministic hooks:** inject a callback between "check" and "act" in a test build to force the bad interleaving.
- **Keep the concurrent part small:** most logic stays single-threaded and pure; only a thin layer handles locks, and that layer gets the stress tests.
- **Tools:** thread sanitizers (C++), Java's jcstress for memory-model tests.

## What to test

- **Behaviour through the public API**, not private methods (if a private method needs its own tests, it probably wants to be a class).
- **Boundaries and edge cases:** empty, one, many, maximum, exactly at the limit, invalid input, illegal state transitions.
- **Each strategy on its own**, then the composition once.
- **The test pyramid:** many fast unit tests, fewer integration tests (real database, real adapters against sandboxes), very few end-to-end tests.

## What to say in an interview

"I'd unit-test each pricing strategy at its boundaries, test `ParkingLot` with an in-memory assigner and a fake clock for the happy path, lot-full and double-exit, add a stress test where 50 threads park simultaneously and assert no spot is shared, and integration-test the database repository separately." That one sentence shows seams, doubles, time, concurrency and the pyramid.

## What breaks

- **Hidden dependencies** that can't be replaced.
- **Over-mocking:** tests that mirror the implementation line by line.
- **Sleeping in tests** to wait for time or threads.
- **Testing private methods** via reflection.
- **Shared mutable state between tests** (statics, singletons), so tests pass alone and fail together.

## Interview angles

- "How would you test the rate limiter?" Fake clock; boundaries of the window; concurrent `tryAcquire` stress test counting successes ≤ limit.
- "Mock or fake for the repository?" A fake; assert resulting state, not call sequences.
- "This test is flaky." Look for real time, real network, shared state, or thread timing assumptions.

--- revise
### Seams and doubles
? What is a seam? :: A place to change behaviour without editing code, usually an injected interface.
? Dummy, stub, fake, spy, mock? :: Unused placeholder; canned answers; working lightweight implementation; records calls; pre-programmed expected calls that it verifies.
? Google's preference order? :: Real objects if fast and deterministic, then fakes, then mocks sparingly.
? Why is heavy mocking harmful? :: Tests verify how code works, not what it achieves, so refactoring breaks them without behaviour changes.
? State vs interaction testing? :: Prefer asserting resulting state; verify interactions only when the interaction is the requirement (email sent once).

### Time, concurrency, scope
? How to test time-based logic? :: Inject a Clock; use a fake/mutable clock; test exact boundaries; never sleep.
? Basic concurrency stress test? :: N threads released together by a CountDownLatch, many iterations, then assert the invariant.
? What to test? :: Public behaviour; boundaries and edge cases; each strategy alone; illegal transitions.
? Test pyramid? :: Many unit tests, fewer integration tests, very few end-to-end tests.
? Common causes of flaky tests? :: Real time, real network, shared mutable state, assumptions about thread timing.

--- notes
## Seams
Hidden dependency = missing seam. DI creates seams.
## Doubles
Dummy (unused), stub (canned), fake (working, in-memory), spy (records), mock (expectations verified).
Prefer real → fake → mock. State over interactions; interactions only when they're the requirement.
Fakes owned by the real implementation's team; reused across tests and machine coding.
## Time
MutableClock; advance(); exact boundaries (59/60/61 min). Inject schedulers/sleepers for retries.
## Concurrency
Latch-started stress tests; assert invariants; many iterations.
Deterministic hooks between check and act. Thin concurrent layer. jcstress, sanitizers.
## What to test
Public API behaviour; boundaries; each strategy; illegal transitions.
Pyramid: unit ≫ integration ≫ e2e.
## Interview line
Strategies at boundaries; lot with fake assigner + clock; full; double exit; 50-thread stress; repo integration test.
## Smells
Hidden deps; over-mocking; sleeps; reflection on privates; shared static state.

--- doubts
Q: What's the practical difference between a stub and a fake?
A: A stub returns whatever you told it for this test ("return ₹82.5"), with no logic. A fake actually works, in a simplified way: an in-memory repository really stores and finds orders, so a test can save, query and update through it. Fakes catch more bugs (a stub can't notice that you saved and then queried with the wrong id) and are reusable across tests.

Q: When is a mock the right tool?
A: When the call to a dependency **is** the behaviour you must guarantee and there's no state to inspect: an email must be sent exactly once, an audit event must be published, a payment must not be charged when validation fails. Even then, a spy (a fake that records) is often clearer than a strict mock.

Q: Should I test private methods?
A: Test through the public API. If a private method is complex enough to want its own tests, that's a sign it's a separate responsibility: extract it into a class with its own public API and test that.

Q: How do I test code that uses randomness?
A: Inject the random source (`RandomGenerator`) and use a seeded or scripted one in tests, or test properties that hold for any random choice ("the winner is one of the participants", "the distribution over 10,000 draws is roughly uniform").

--- exercises
[design] Describe the tests you would write for a `BookingService.book(showId, seats, user)` that holds seats, charges payment, then confirms; it must never double-book and must release seats if payment fails.
A: Unit (with fakes: InMemorySeatInventory, FakePaymentGateway, MutableClock): happy path → booking confirmed, seats sold, one charge; payment declined → seats released, no booking saved; seat already held → SeatUnavailable and no charge; hold expires (advance clock 11 min) → seats free again; idempotent retry with the same key → one booking, one charge. Concurrency: 100 threads booking the same seat released by a latch → exactly one success, 99 SeatUnavailable, seat sold once; repeat 1,000 times. Integration: the real database inventory's conditional update under concurrent transactions; the payment adapter against the provider's sandbox.

[break] A test does `when(repo.findById(1L)).thenReturn(order); service.ship(1L); verify(repo).findById(1L); verify(repo).save(order); verify(courier).book(order.address()); verify(repo, times(2)).save(any());`. After a refactor that loads the order once and saves once (same behaviour), the test fails. What is wrong with the test?
A: It verifies the implementation's call sequence and counts rather than the outcome, so a behaviour-preserving refactor breaks it (and the times(2) expectation even encoded a redundant save). Better: use a fake repository containing the order, call ship, then assert the order's state is SHIPPED in the fake, and that the courier spy received exactly one booking for that address (the interaction that is a real requirement).

[choose] Real object, fake, stub or mock? (a) `Money` in a pricing test. (b) The orders database in a service unit test. (c) An external exchange-rate API in a conversion test. (d) Checking that an audit event is published exactly once.
A: (a) Real object (a value). (b) Fake (in-memory repository). (c) Stub (return a fixed rate) or a fake with configurable rates. (d) A spy or mock: the interaction itself is the requirement.

--- pitfalls
- Dependencies created inside methods, leaving no seam for tests
- Mocking everything and verifying exact call sequences
- Thread.sleep in tests for time or concurrency
- Static or singleton state shared between tests
- Only testing happy paths, never boundaries or illegal states

--- quiz
Q: An in-memory repository that really stores and queries objects is a…
- Dummy
- Stub
- *Fake
- Mock
W: Fakes are working, simplified implementations.
Q: Why does Google's testing guidance discourage heavy mocking?
- Mocks are slow
- *Interaction-heavy tests break on refactoring without behaviour changes and miss real bugs
- Mocks are deprecated
- Mocks can't return values
W: Test what the code achieves, not how.
Q: Best way to test "a ticket held 61 minutes costs 2 hours"?
- Sleep for 61 minutes
- *Inject a fake clock and advance it 61 minutes
- Mock Instant.now() statically
- Skip the test
W: Controlled time makes boundaries exact and tests instant.

--- sources
- book :: Software Engineering at Google, ch. 12–14 (unit testing, test doubles, larger testing) :: Winters, Manshreck, Wright :: https://abseil.io/resources/swe-book/html/ch13.html
- article :: Mocks Aren't Stubs :: Martin Fowler :: https://martinfowler.com/articles/mocksArentStubs.html
- article :: Testing on the Toilet: Don't Overuse Mocks :: Google Testing Blog :: https://testing.googleblog.com/2013/05/testing-on-toilet-dont-overuse-mocks.html
- tool :: jcstress: Java concurrency stress tests :: OpenJDK :: https://github.com/openjdk/jcstress

=== smells-refactoring
blurb: The code smells interviewers and reviewers notice (long methods, god classes, feature envy, primitive obsession, switch statements, shotgun surgery, data clumps, comments explaining bad code) and the refactoring moves that fix each one safely, in small steps under tests.
signals: "What would you change about this code?" | A legacy class you must extend | Code review questions in an interview | Your own interview code getting messy mid-way

--- lesson
:::words
- **Code smell**: a surface sign in code that usually points to a deeper design problem. Not a bug; a reason to look closer.
- **Refactoring**: changing the structure of code without changing what it does, in small, safe steps.
- **Extract method / extract class**: moving part of a method into its own method, or part of a class into its own class.
- **Feature envy**: a method more interested in another class's data than its own.
- **Data clump**: the same group of values always passed around together (street, city, postcode).
- **Characterisation test**: a test written to pin down what existing code currently does, before changing it.
:::

## The problem in plain words

Code rarely starts bad; it gets bad one reasonable-looking change at a time: one more `if`, one more parameter, one more responsibility added to the class that was already open. Smells are the names for the patterns that result, and refactorings are the named, safe moves that undo them. Knowing both lets you say precisely **what** is wrong with a piece of code and **how** you'd fix it without breaking it, which is exactly what interviewers ask when they show you legacy code.

:::eli5
A messy room doesn't need demolition. You pick up one thing at a time and put it where it belongs, checking you didn't throw anything important away. Smells tell you which pile to tackle; refactorings are the tidy-up moves.
:::

## The smells that matter most in LLD

| Smell | What it looks like | Usual fix |
|---|---|---|
| **Long method** | 80 lines doing validation, pricing, saving, emailing | Extract method per step; then extract classes per responsibility |
| **God class** | `OrderManager` with 40 methods and 25 fields | Extract class by reason to change (SRP) |
| **Feature envy** | `invoice.total()` computed in `ReportService` from the invoice's fields | Move method to the class whose data it uses |
| **Primitive obsession** | `long userId`, `double price`, `String status` | Introduce value objects, enums, id types |
| **Data clump** | `(street, city, zip)` passed together everywhere | Introduce a parameter object (`Address`) |
| **Switch on type** | The same `switch (vehicle.type)` in several places | Replace conditional with polymorphism (or one sealed switch) |
| **Shotgun surgery** | One change needs small edits in ten classes | Move the scattered responsibility into one class |
| **Divergent change** | One class changes for many unrelated reasons | Split it (SRP) |
| **Long parameter list** | `create(a, b, c, d, e, f, g)` | Parameter object or builder |
| **Temporary field** | A field only set during one operation | Extract that operation into its own object |
| **Message chains** | `a.getB().getC().getD()` | Hide the delegate (Law of Demeter) |
| **Comments explaining unclear code** | `// subtract 5% if gold and weekday` above dense logic | Extract a well-named method; keep comments for *why* |
| **Dead code / speculative generality** | Unused parameters, one-implementation interfaces "for later" | Delete it |

## Refactoring safely

1. **Have tests first.** If the code has none, write **characterisation tests** that pin down its current behaviour (even odd behaviour), so you'll know if you change it.
2. **Take tiny steps:** one extract or move at a time, run tests after each.
3. **Separate refactoring from behaviour changes:** first restructure (tests stay green), then change behaviour in a separate step.
4. **Let the IDE do mechanical moves** (rename, extract, move, inline): they're reliable.

## A worked example

```java
// Before: a long method with feature envy, primitive obsession and a type switch
double checkout(Cart cart, String userType, String couponCode) {
  double total = 0;
  for (Item i : cart.items) total += i.price * i.qty;
  if (userType.equals("GOLD")) total *= 0.9;
  else if (userType.equals("SILVER")) total *= 0.95;
  if (couponCode != null && couponCode.startsWith("FEST")) total -= 100;
  if (total < 0) total = 0;
  db.save(new Order(cart, total));
  emailer.send(cart.user.email, "Order placed: " + total);
  return total;
}
```

Steps:

1. **Introduce `Money`** for prices and totals (primitive obsession), with `times` and `minus` that never go below zero.
2. **Move the subtotal into `Cart`** (feature envy): `cart.subtotal()`.
3. **Replace the user-type switch with a `MemberTier` enum** carrying its discount, or a `DiscountRule`.
4. **Extract coupon handling** into a `Promotion` strategy found by code (null object `NoPromotion` when absent).
5. **Extract persistence and notification** out of pricing: `Checkout` computes a `PriceBreakdown`; an application service saves and notifies.

```java
// After
PriceBreakdown price(Cart cart, Member member, Promotion promo) {
  Money subtotal = cart.subtotal();
  Money afterTier = member.tier().apply(subtotal);
  return promo.apply(cart, afterTier);           // never negative; lines kept for the receipt
}
```

Each step was small and testable; together they turn one untestable method into pieces with one job each.

## Interview angle: refactoring your own code

Mid-interview, your code will get messy. Saying "this method is doing three things; let me extract the fee calculation" and doing it in a minute is a **positive** signal: it shows you notice smells in your own work. Silently continuing with code you know is tangled is a negative one.

## What breaks

- **Big-bang rewrites** instead of small steps.
- **Refactoring without tests**, so behaviour changes slip in unnoticed.
- **Mixing refactoring with feature work** in one change, so reviewers can't tell which is which.
- **Abstracting too early** in the name of cleaning up.

## Interview angles

- "What's wrong with this class?" Name the smells precisely, then the fixes, in order of value.
- "How would you safely change this legacy method?" Characterisation tests, then small extracts, then the behaviour change.
- "Your `exit()` is getting long." Extract pricing and payment; show the result.

--- revise
### Smells
? What is a code smell? :: A surface sign that usually points to a deeper design problem; not itself a bug.
? Feature envy and its fix? :: A method using another class's data more than its own: move the method there.
? Data clump and its fix? :: The same values always passed together: introduce a parameter object (Address).
? Shotgun surgery vs divergent change? :: One change → edits in many classes, vs one class changing for many reasons. Fix: gather into one class, vs split the class.
? Fix for comments explaining unclear code? :: Extract a well-named method; keep comments for why.
? Fix for the same type switch in many places? :: Replace conditional with polymorphism (or one sealed switch).

### Refactoring
? What is refactoring? :: Changing structure without changing behaviour, in small safe steps.
? First step on untested legacy code? :: Characterisation tests that pin down current behaviour.
? Two rules for safe refactoring? :: Tiny steps with tests after each; never mix refactoring and behaviour changes in one step.
? Refactoring your own interview code mid-way: good or bad? :: Good, if stated and quick: it shows you notice smells.

--- notes
## Key smells → fixes
Long method → extract method/class. God class → extract class (SRP).
Feature envy → move method. Primitive obsession → value objects/enums/ids.
Data clump → parameter object. Type switch → polymorphism / sealed switch.
Shotgun surgery → gather. Divergent change → split. Long params → parameter object/builder.
Temporary field → extract operation object. Message chains → hide delegate.
Explaining comments → well-named methods. Dead/speculative code → delete.
## Safe refactoring
Tests first (characterisation tests for legacy). Tiny steps; tests each time.
Refactor and change behaviour separately. Use IDE refactorings.
## Example
checkout(): Money; cart.subtotal(); MemberTier; Promotion + NoPromotion; separate save/notify.
## Interview
Name smells precisely, fixes in value order. Refactor your own code out loud.
## Smells of refactoring itself
Big-bang rewrites; no tests; mixed with features; early abstraction.

--- doubts
Q: Is every long method a problem?
A: Length is a hint, not a rule. A long `switch` mapping 30 error codes to messages is long but simple. The real question is whether the method does one thing at one level of abstraction. A 15-line method that validates, prices and saves is worse than a 40-line method that only builds a report table.

Q: How do I refactor when there are no tests and no time?
A: Write the smallest characterisation tests that cover the path you're about to change (often a few), then limit yourself to mechanical, IDE-driven refactorings (rename, extract method) that are very unlikely to change behaviour. Leave larger restructurings for when you have coverage.

Q: Isn't "replace conditional with polymorphism" sometimes worse?
A: Yes, when the set of cases is closed and handled in one place, a switch (especially a sealed, exhaustive one) is simpler. Apply the refactoring when the same switch appears in several places or new cases arrive often.

--- exercises
[break] Name every smell in: `class UserService { void register(String name, String email, String street, String city, String zip, String phone, boolean isAdmin, boolean sendWelcome) { if (email.contains("@")) {...} db.insert(...); if (sendWelcome) { String body = "Hi " + name + ..." ; smtp.connect("smtp.prod", 25); smtp.send(email, body); } if (isAdmin) { audit.log(...); permissions.grantAll(...); } } }`.
A: Long method doing validation, persistence, email composition and sending, and admin setup (divergent change, SRP). Long parameter list with a data clump (street, city, zip → Address) and primitive obsession (email as String with an ad-hoc check → EmailAddress value object). Boolean flag parameters (isAdmin, sendWelcome) that switch behaviour → separate methods or a role type and a policy. Hard-coded infrastructure (smtp.connect with host and port) → an injected Mailer. Fix: register(NewUser user) with value types; a UserRepository; a WelcomeMailer listener (or explicit call) injected; admin provisioning in its own service.

[design] Plan the refactoring of a 300-line `PricingEngine.calculate()` that has no tests and is used by checkout, invoices and refunds. List the steps in order.
A: 1) Write characterisation tests: capture outputs for a broad sample of real carts (golden files), including odd cases. 2) Extract methods for each visible step (subtotal, tier discount, coupons, tax, rounding) without changing logic; tests green after each. 3) Introduce Money and replace doubles (check golden outputs: any difference is a found bug, decide deliberately). 4) Extract each step into a class (strategy) and compose them in a pipeline. 5) Point checkout, invoices and refunds at the same pipeline (removing any duplicated pricing elsewhere). 6) Only now make the behaviour change you were asked for, with new tests.

[choose] Which refactoring? (a) `distance(lat1, lon1, lat2, lon2)` appears in 12 signatures. (b) `ReportService` computes an invoice's tax from its line items. (c) The same `switch (paymentType)` appears in checkout, refunds and reconciliation.
A: (a) Introduce a parameter object: Coordinates (and distance(Coordinates a, Coordinates b)). (b) Move method: Invoice.tax() (feature envy). (c) Replace conditional with polymorphism: a PaymentMethod interface with refund/reconcile behaviour per type (or a sealed type with exhaustive switches if operations change more than types).

--- pitfalls
- Rewriting large areas at once instead of small, tested steps
- Refactoring code that has no tests without adding characterisation tests first
- Mixing structural changes and behaviour changes in one commit
- Naming smells vaguely ("this is messy") instead of precisely
- Continuing with code you know is tangled during an interview instead of fixing it

--- quiz
Q: A method uses another object's fields far more than its own. Which smell, and the fix?
- God class; split it
- *Feature envy; move the method to that object
- Data clump; parameter object
- Dead code; delete it
W: Put behaviour next to the data it uses.
Q: What should come first when refactoring untested legacy code?
- Rewrite it from scratch
- *Characterisation tests that pin down current behaviour
- Add more comments
- Change the behaviour you need
W: You need a safety net before moving anything.
Q: `(street, city, zip)` passed together through many methods is…
- Feature envy
- *A data clump: introduce an Address parameter object
- Shotgun surgery
- A message chain
W: Values that travel together want to be one type.

--- sources
- book :: Refactoring: Improving the Design of Existing Code (2nd ed.) :: Martin Fowler :: https://martinfowler.com/books/refactoring.html
- article :: Code smells catalogue :: Refactoring Guru :: https://refactoring.guru/refactoring/smells
- book :: Working Effectively with Legacy Code (characterisation tests, seams) :: Michael Feathers :: https://www.oreilly.com/library/view/working-effectively-with/0131177052/

=== code-layers
blurb: How code inside one service is organised into layers: presentation (controllers), application services (use cases), domain (entities and rules) and infrastructure (repositories, clients), the MVC pattern, the repository pattern, and hexagonal (ports and adapters) architecture, with the dependency rule that keeps business logic independent.
signals: "Where does this logic go: controller, service or entity?" | Business rules in controllers or SQL | Swapping a database or adding a new interface (API, CLI, queue consumer) | Machine-coding rounds graded on package structure
widgets: seq-layers

--- lesson
:::words
- **Layer**: a group of code with one kind of job, which may depend only on certain other layers.
- **Controller**: code that receives a request (HTTP, CLI, a message) and translates it into a call to the application.
- **Application service (use case)**: code that runs one user action end to end: load, call domain logic, save, publish.
- **Domain model**: entities, value objects and business rules, with no knowledge of databases or HTTP.
- **Repository**: an interface that looks like a collection of domain objects (`save`, `findById`), hiding how they're stored.
- **DTO (data transfer object)**: a plain data shape for crossing a boundary (a JSON request body), separate from domain objects.
- **Hexagonal architecture (ports and adapters)**: the domain and application in the middle define **ports** (interfaces); **adapters** at the edges implement them for HTTP, databases, queues.
:::

## The problem in plain words

As a service grows, code tends to slide into whichever file was open: SQL in controllers, HTTP status codes in business rules, discount logic in a database trigger. Then the same rule exists in three places, the domain can't be tested without a web server and a database, and replacing the database touches everything. Layers give every kind of code **a home**, and one rule about which direction dependencies may point keeps the business logic independent of the delivery mechanisms around it.

:::eli5
A restaurant: waiters (controllers) take orders and bring food; the head chef (application service) decides what to cook for each order; the recipes and cooking skills (domain) are the actual know-how; the storeroom and suppliers (infrastructure) provide ingredients. A waiter never cooks, and the recipes don't care which supplier the tomatoes came from.
:::

## The classic layers

```
Presentation   controllers, request/response DTOs, input validation, status codes
     │
Application    use cases: placeOrder, cancelBooking; transactions; calls domain + ports
     │
Domain         entities, value objects, domain services, rules; no frameworks, no I/O
     ▲
Infrastructure repositories (SQL), payment/email adapters, message publishers: implement domain/app interfaces
```

**The dependency rule:** source code dependencies point **inward**, toward the domain. The domain depends on nothing; the application depends on the domain and on **interfaces (ports)** it defines; infrastructure implements those interfaces (dependency inversion again). Follow a request through the layers, and see what happens when a rule leaks into the wrong one:

[[widget:seq-layers]]

## What goes where

| Code | Layer |
|---|---|
| Parse JSON, check required fields, map to a command, return 201/400/409 | Controller |
| "Load cart, price it, charge, save order, publish OrderPlaced" in one transaction | Application service |
| "Orders above ₹5,000 ship free", "a cancelled order can't ship", `Money`, `Order.cancel()` | Domain |
| SQL, ORM mappings, Stripe client, SMTP, Kafka producer | Infrastructure adapters |

A useful check: **could this rule be explained to a business person?** Then it belongs in the domain, not in a controller or a query.

## MVC

Model–View–Controller splits UI code three ways: the **model** holds data and rules, the **view** displays it, the **controller** handles input and updates the model. In server frameworks (Spring MVC, Rails, Django) the "view" is often a JSON response or a template, and "model" often means the domain plus services behind the controller. The lasting idea is the same as layering: presentation concerns separate from business logic.

## The repository pattern

```java
interface BookingRepository {                     // a port, owned by the domain/application
  Optional<Booking> findById(BookingId id);
  void save(Booking b);
  List<Booking> findActiveForShow(ShowId show);
}
final class JdbcBookingRepository implements BookingRepository { /* SQL here */ }
final class InMemoryBookingRepository implements BookingRepository { /* HashMap, for tests and machine coding */ }
```

The interface speaks the domain's language (find active bookings for a show), not SQL. Use cases depend on it; tests and machine-coding rounds use the in-memory version.

## Hexagonal: ports and adapters

Hexagonal architecture (Alistair Cockburn) generalises this: the application core defines **driving ports** (what the outside can ask it: `PlaceOrder` use case) and **driven ports** (what it needs from the outside: `OrderRepository`, `PaymentGateway`). **Adapters** connect the world to the ports: an HTTP controller, a CLI, a queue consumer all drive the same use case; a SQL adapter, a Stripe adapter, an in-memory adapter serve the driven ports. Benefits: the core is testable without any infrastructure, and adding a new way in (a gRPC endpoint, a batch job) or a new backend (another database) touches only adapters. "Clean architecture" and "onion architecture" are close relatives with the same dependency rule.

## In LLD interviews and machine coding

- A clean package layout signals design maturity: `model` (entities, values), `service` (use cases), `strategy` (pricing, assignment), `repository` (interfaces + in-memory), `controller` or `cli` (driver).
- Keep the domain free of I/O so the core logic is easy to show and test.
- Don't over-layer a 45-minute answer: entities, one or two services and the strategy interfaces are enough; mention repositories as the seam for storage.

## What breaks

- **Fat controllers:** business rules and SQL in request handlers.
- **Anemic domain:** entities as bags of getters/setters with all rules in services.
- **Domain depending on infrastructure:** `@Entity` ORM annotations and HTTP types throughout the core (a pragmatic compromise in some codebases, but it couples the model to the framework).
- **Layer skipping:** controllers calling repositories directly for "simple" cases, then rules creep in.
- **Too many layers** for a small program: five classes to save one record.

## Interview angles

- "Where does the late-fee rule live?" Domain (`Loan.fine(policy, today)`), not the controller or SQL.
- "We need a CLI and a REST API for the same feature." Two adapters driving the same use-case port.
- "How do you swap MySQL for Spanner?" A new repository adapter; the core is unchanged.

--- revise
### Layers
? Four classic layers? :: Presentation (controllers), application (use cases), domain (entities, rules), infrastructure (adapters).
? The dependency rule? :: Source dependencies point inward to the domain; infrastructure implements interfaces the inner layers own.
? What belongs in a controller? :: Parsing, input validation, mapping to a command, status codes; no business rules.
? What belongs in an application service? :: One use case end to end: load, call domain, save, publish, transaction boundary.
? Test for "is it a domain rule"? :: Could you explain it to a business person? Then it's domain.

### Patterns
? Repository pattern? :: A collection-like interface in domain language (save, findById, findActiveForShow) hiding storage; SQL and in-memory implementations.
? MVC? :: Model (data + rules), view (display), controller (input → model updates).
? Hexagonal architecture? :: Core defines driving and driven ports; adapters (HTTP, CLI, queue / SQL, payment) plug into them.
? Machine-coding package layout? :: model, service, strategy, repository (interfaces + in-memory), controller/cli driver.
? Anemic domain model? :: Entities with only getters/setters and all rules in services; a common criticism.

--- notes
## Layers
Presentation → application → domain ← infrastructure (implements ports).
Dependencies point inward; domain depends on nothing.
## Homes
Controller: JSON, validation, 201/400/409. Application: use case + transaction + publish.
Domain: rules, entities, values. Infrastructure: SQL, ORM, payment, email, queues.
## Repository
Domain-language interface; JdbcX and InMemoryX implementations.
## MVC
Model / view / controller; server "view" = JSON/template.
## Hexagonal (ports and adapters)
Driving ports (use cases) ← HTTP/CLI/queue adapters. Driven ports (repo, gateway) → SQL/Stripe/in-memory adapters.
Clean/onion architecture: same dependency rule.
## Interviews
Packages model/service/strategy/repository/cli. Domain free of I/O. Don't over-layer 45-min answers.
## Smells
Fat controllers; anemic domain; framework types in the core; layer skipping; ceremony for tiny programs.

--- doubts
Q: Is it wrong to put ORM annotations (`@Entity`) on domain classes?
A: It's a trade-off. Purists keep the domain free of frameworks and map to separate persistence classes in the adapter; many real codebases accept the annotations to avoid duplicating every class. The cost is that the database mapping can start dictating the domain's shape (public setters, no-arg constructors). Say which you'd choose and why.

Q: Where do transactions go?
A: In the application layer: one use case usually equals one transaction (load, change, save). The domain shouldn't know about transactions; the infrastructure provides them; the application service draws the boundary (or a decorator/annotation around it does).

Q: How do layers relate to microservices?
A: Orthogonally. Layers organise code inside one service; microservices split a system into services. Each microservice typically has the same internal layers, and calls to other services go through driven ports and adapters (clients) just like a database.

Q: When are layers overkill?
A: For scripts, small tools and prototypes, a couple of well-named classes are enough. Layers pay off when several people work on the code over time, when there are several ways in (API, jobs), or when infrastructure is likely to change.

--- exercises
[design] Lay out the packages and main classes for a 90-minute machine-coding round: "Build a library system with members, books, copies, loans, fines and a command-line interface."
A: model: Book, BookCopy (status), Member, Loan, Money, MemberType enum, ids as records. strategy: FinePolicy (PerDayFine), LoanPolicy (limits per member type). repository: interfaces BookRepository, MemberRepository, LoanRepository + InMemory implementations. service: CatalogService (add book/copies), LendingService (borrow, giveBack → fine, reserve), with a Clock injected. cli: a Main/CommandRunner that parses commands ("borrow M1 C7"), calls services and prints results; plus a few scripted demo commands or tests. Domain classes have no I/O.

[break] A Spring controller method: reads the request, opens a JDBC connection, runs `SELECT ... FOR UPDATE` on the seat, checks `if (user.isPremium() && show.isWeekend()) price *= 0.8`, inserts the booking, sends an email via SMTP, and returns 200. What's wrong and where does each piece go?
A: Everything is in the presentation layer: untestable without a web server, database and mail server; rules are not reusable by other entry points (mobile API, batch). Move: request parsing and response mapping stay in the controller; the use case (hold seat, price, save booking, publish BookingConfirmed) goes into a BookingService in the application layer with the transaction boundary; the premium-weekend discount becomes a domain PricingRule; seat locking goes behind a SeatInventory port with a JDBC adapter; email goes to a notifier adapter triggered by the event.

[choose] Which layer? (a) Converting a `SeatUnavailableException` into HTTP 409. (b) "A member may not hold more than 5 books". (c) The SQL for finding overdue loans. (d) Running borrow inside one transaction and publishing `LoanCreated`.
A: (a) Presentation (controller or its error handler). (b) Domain (LoanPolicy / Member). (c) Infrastructure (the repository adapter), behind a domain-language method like findOverdue(today). (d) Application service.

--- pitfalls
- Business rules inside controllers or SQL queries
- Entities with no behaviour and all rules in services
- Domain classes depending on HTTP, ORM or vendor types
- Controllers calling repositories directly and growing rules
- Adding layers and interfaces to tiny programs that don't need them

--- quiz
Q: Which way do source-code dependencies point in a layered/hexagonal design?
- Outward, from domain to database
- *Inward, toward the domain; infrastructure implements ports owned by inner layers
- Every layer depends on every other
- Only downward to the database
W: That's the dependency rule.
Q: Where does "orders over ₹5,000 ship free" belong?
- Controller
- SQL query
- *Domain model
- Email template
W: It's a business rule.
Q: In hexagonal architecture, an HTTP controller is…
- A port
- *A driving adapter
- A driven adapter
- A domain service
W: It drives the application through a use-case port.

--- sources
- article :: Hexagonal architecture (ports and adapters) :: Alistair Cockburn :: https://alistair.cockburn.us/hexagonal-architecture/
- article :: The Clean Architecture :: Robert C. Martin :: https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html
- article :: Repository (Patterns of Enterprise Application Architecture) :: Martin Fowler :: https://martinfowler.com/eaaCatalog/repository.html
- article :: PresentationDomainDataLayering :: Martin Fowler :: https://martinfowler.com/bliki/PresentationDomainDataLayering.html
