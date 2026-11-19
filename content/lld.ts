import { Q, T } from "./h";
import type { ClassBox, ClassRel, Design, Tier, Topic } from "@/lib/types";

export const lldTopics: Topic[] = [
  T("lld", "oop-solid", "OOP & SOLID in practice", 1, 35, "Encapsulation, composition over inheritance, and the five principles with concrete smells.", {
    signals: ["Any object-oriented design round", "Code review style questions: 'what is wrong with this class?'"],
    lesson: `**The four pillars, as design tools**
- *Encapsulation:* hide state behind behaviour so invariants live in one place.
- *Abstraction:* depend on what something does (interface), not how.
- *Inheritance:* "is-a" with substitutability; use sparingly.
- *Polymorphism:* replace \`if type == …\` chains with dispatch.

**Composition over inheritance:** inheritance couples you to a parent's implementation and explodes with combinations (\`ElectricSportsCar\`). Compose behaviours (\`Car\` has an \`Engine\`, a \`PricingStrategy\`).

**SOLID**

| | Principle | Smell when violated |
|---|---|---|
| S | Single responsibility: one reason to change | God classes, \`Manager\` doing parsing + storage + email |
| O | Open/closed: extend without modifying | A switch statement edited for every new type |
| L | Liskov substitution: subtypes honour the contract | \`Square extends Rectangle\`, \`throw UnsupportedOperation\` |
| I | Interface segregation: small role interfaces | Implementers leaving methods empty |
| D | Dependency inversion: depend on abstractions | \`new MySqlRepo()\` inside business logic; untestable code |

**Other heuristics:** DRY (but avoid premature abstraction), YAGNI, Law of Demeter (talk to friends, not friends of friends), immutability by default, favour value objects (Money, Position), make illegal states unrepresentable (enums, state objects).

**In the interview:** start from requirements → nouns become candidate classes, verbs become methods → assign each responsibility to exactly one class → identify what varies and put it behind an interface.`,
    pitfalls: ["Deep inheritance trees for code reuse", "Anemic models: classes with only getters/setters and a giant service", "Applying patterns before there is variation to justify them", "Public mutable fields"],
    quiz: [
      Q("A `Bird` base class has `fly()`; `Penguin` throws an exception in it. Which principle is violated?", ["SRP", "OCP", "*LSP", "DIP"], "A subtype must be usable wherever the base type is expected."),
      Q("Adding a new payment method requires editing a switch in `PaymentProcessor`. Remedy?", ["More comments", "*Strategy interface per method (open/closed)", "Singleton", "Inheritance from PaymentProcessor"], "New behaviour becomes a new class, not an edit."),
      Q("Business logic constructs its own database client. What does this hurt most?", ["Performance", "*Testability and flexibility (dependency inversion)", "Security", "Memory"], "Inject an interface so tests and alternative stores can plug in."),
    ],
  }),
  T("lld", "patterns-creational-structural", "Design patterns I: creational & structural", 1, 35, "Factory, Builder, Singleton, Adapter, Decorator, Facade, Proxy, Composite.", {
    signals: ["Object creation is complex or varies", "You need to wrap, adapt or layer behaviour without changing a class"],
    lesson: `**Creational**
- **Factory method / abstract factory:** creation behind an interface; callers do not know concrete classes (\`VehicleFactory.create(type)\`, UI toolkits per OS).
- **Builder:** step-by-step construction of objects with many optional parts; produces immutable results (\`Pizza.builder().size(L).addTopping(..).build()\`).
- **Singleton:** exactly one instance (config, registry). Prefer dependency injection; if needed, make it thread-safe (enum in Java, \`static\` local in C++11, double-checked locking with \`volatile\`). It is global state: hard to test.
- **Prototype:** clone preconfigured objects.
- **Object pool:** reuse expensive objects (connections, threads).

**Structural**
- **Adapter:** make an incompatible interface fit (wrap a third-party SDK).
- **Decorator:** add responsibilities by wrapping, same interface (\`BufferedInputStream(GzipInputStream(File))\`, coffee add-ons). Alternative to subclass explosion.
- **Facade:** one simple entry point to a subsystem.
- **Proxy:** stand-in controlling access: lazy loading, caching, access control, remote stub.
- **Composite:** treat leaves and containers uniformly (file system: File and Directory are both \`Node\`).
- **Bridge:** split abstraction and implementation hierarchies so they vary independently.
- **Flyweight:** share intrinsic state among many small objects (glyphs, chess piece types).

**How to cite a pattern in an interview:** name the *force* first ("pricing rules vary by vehicle type and will change"), then the pattern, then its cost.`,
    pitfalls: ["Singleton everywhere", "Factory for a single concrete type", "Decorator vs Proxy confusion (add behaviour vs control access)", "Pattern names without the problem they solve"],
    quiz: [
      Q("File and Directory should both support size() and be nested arbitrarily. Pattern?", ["Decorator", "*Composite", "Adapter", "Bridge"], "Uniform treatment of part and whole."),
      Q("Add compression, then encryption, to any stream without subclassing each combination.", ["Factory", "*Decorator", "Singleton", "Observer"], "Stackable wrappers with the same interface."),
      Q("Main risk of the Singleton pattern?", ["Slow", "*Hidden global state, hard to test, concurrency pitfalls", "Too many objects", "None"], "It couples callers to a global."),
    ],
  }),
  T("lld", "patterns-behavioral", "Design patterns II: behavioural", 1, 35, "Strategy, Observer, State, Command, Chain of Responsibility, Template Method, Iterator.", {
    signals: ["Algorithms that vary, objects whose behaviour depends on state, events and undo"],
    lesson: `- **Strategy:** interchangeable algorithms behind one interface (pricing, routing, eviction policy, split type in Splitwise). Removes conditionals; chosen at runtime.
- **Observer / pub-sub:** subjects notify subscribers of changes (UI events, stock tickers, notification service). Watch for ordering, re-entrancy and memory leaks from forgotten unsubscribes.
- **State:** each state is a class handling events and deciding transitions (vending machine, elevator, order lifecycle, TCP connection). Replaces giant \`switch(state)\` blocks; illegal transitions become explicit.
- **Command:** encapsulate a request as an object with \`execute()\` / \`undo()\` → undo/redo stacks, job queues, macros, transactions.
- **Chain of responsibility:** pass a request along handlers until one handles it (logging levels, middleware, approval workflows, ATM cash dispensing).
- **Template method:** fixed algorithm skeleton, subclasses fill steps (game loop, data import pipeline). Prefer strategy when composition suffices.
- **Iterator:** traverse without exposing structure.
- **Mediator:** central coordinator reducing many-to-many coupling (chat room, air-traffic control).
- **Memento:** snapshot state for restore.
- **Visitor:** add operations over a fixed class hierarchy (AST evaluation).

**State vs Strategy:** same shape; State objects know about transitions and change over the object's life; a Strategy is usually set once by the client.

**Typical combos:** Parking lot = Strategy (pricing, spot assignment) + Factory (vehicles/tickets). Vending machine = State. Text editor = Command + Memento. Logger = Chain of responsibility + Singleton + Observer (appenders).`,
    pitfalls: ["State machine as nested if/else on enums scattered across methods", "Observers invoked while holding locks (deadlocks)", "Command objects without enough information to undo"],
    quiz: [
      Q("Undo/redo in a text editor is most naturally modelled with…", ["Observer", "*Command (with undo) + two stacks", "Singleton", "Adapter"], "Each edit is an object that knows how to reverse itself."),
      Q("A vending machine behaves differently when idle, has-money, dispensing. Pattern?", ["Strategy", "*State", "Decorator", "Facade"], "Behaviour and transitions depend on the current state object."),
      Q("HTTP middleware (auth → rate limit → logging → handler) is an example of…", ["Composite", "*Chain of responsibility", "Builder", "Flyweight"], "Each handler processes or passes along."),
    ],
  }),
  T("lld", "concurrency", "Concurrency & thread safety", 1, 40, "Races, locks, deadlocks, producer–consumer, thread pools and lock-free basics.", {
    signals: ["'Make it thread-safe'", "Shared mutable state, background workers, rate limiters, caches, booking systems"],
    lesson: `**Vocabulary:** race condition (outcome depends on timing), critical section, atomicity, visibility (memory model), deadlock, livelock, starvation.

**Tools**
- *Mutex / synchronized:* one thread in the critical section. Keep it short; never call unknown code while holding it.
- *Read–write lock:* many readers or one writer; good for read-heavy state.
- *Condition variables:* wait for a predicate (\`while (!cond) wait()\`: always loop, spurious wakeups).
- *Semaphores:* permits (bounded resources, rate limiting).
- *Atomics / CAS:* lock-free counters and flags; beware ABA.
- *Concurrent collections:* ConcurrentHashMap, BlockingQueue; compound actions still need care (\`computeIfAbsent\`, not check-then-put).
- *Immutability and confinement:* the simplest thread safety is not sharing.

**Deadlock** needs all four: mutual exclusion, hold-and-wait, no preemption, circular wait. Break one: **global lock ordering**, tryLock with timeout, lock coarsening.

**Classic problems:** bounded buffer (producer–consumer), readers–writers, dining philosophers, print-in-order / FizzBuzz multithreaded, thread-safe singleton, rate limiter, blocking queue, thread pool with work queue.

**Granularity:** one global lock (simple, contended) → lock striping / per-bucket locks → lock-free. State the progression rather than jumping to the most complex.

**Thread pools:** fixed workers pulling from a queue; bounded queues give backpressure; rejection policies.

**Async models:** event loop (single-threaded, non-blocking I/O), futures/promises, actors (message passing, no shared state), coroutines.

**Testing:** stress tests, thread sanitizers, deterministic schedulers; reasoning by invariants ("count == sum of per-key counts").`,
    template: `template <class T> class BlockingQueue {
  std::mutex m; std::condition_variable notFull, notEmpty; std::deque<T> q; size_t cap;
public:
  explicit BlockingQueue(size_t c) : cap(c) {}
  void put(T x) {
    std::unique_lock<std::mutex> lk(m);
    notFull.wait(lk, [&] { return q.size() < cap; });
    q.push_back(std::move(x)); notEmpty.notify_one();
  }
  T take() {
    std::unique_lock<std::mutex> lk(m);
    notEmpty.wait(lk, [&] { return !q.empty(); });
    T x = std::move(q.front()); q.pop_front(); notFull.notify_one(); return x;
  }
};`,
    pitfalls: ["Check-then-act without atomicity", "if instead of while around wait()", "Inconsistent lock ordering", "Holding a lock during I/O or callbacks", "Double-checked locking without volatile/atomic"],
    quiz: [
      Q("Two threads transfer money A→B and B→A, each locking source then destination. Risk and fix?", ["Race; add volatile", "*Deadlock; always lock accounts in a global order (e.g. by id)", "Starvation; use sleep", "None"], "Circular wait is broken by consistent ordering."),
      Q("Why must condition waits be in a loop?", ["Performance", "*Spurious wakeups and stolen conditions", "Compiler requirement", "To avoid deadlock"], "The predicate may be false again when the thread actually runs."),
      Q("`if (!map.containsKey(k)) map.put(k, v)` on a ConcurrentHashMap is…", ["Thread-safe", "*A check-then-act race; use putIfAbsent/computeIfAbsent", "A deadlock", "A compile error"], "Each call is atomic; the pair is not."),
    ],
  }),
  T("lld", "lld-framework", "The LLD interview framework & API design", 1, 30, "From vague prompt to classes, relationships and working core logic in 45 minutes.", {
    signals: ["'Design a parking lot / elevator / library…'", "'Design the classes for…'"],
    lesson: `**Flow**
1. **Clarify (3–5 min):** actors, core use cases, scale of the object model (one lot or many?), what is out of scope (payments, UI, persistence).
2. **Use cases → entities:** underline nouns (entities) and verbs (operations).
3. **Class diagram:** attributes, methods, relationships (association, aggregation, composition, inheritance), multiplicities. Enums for fixed sets.
4. **Identify variation points:** apply a pattern only where behaviour varies (strategy for pricing, state for lifecycle, observer for notifications).
5. **Walk through a main flow** (sequence): e.g. vehicle enters → spot assigned → ticket → exit → fee.
6. **Write the core code:** the 2–3 most interesting methods fully; stubs for the rest.
7. **Extensions & concurrency:** what changes for new requirement X? Where are the races?

**API design principles:** small surface, intention-revealing names, no leaking internals, validate at boundaries, return values over output parameters, consistent error strategy (exceptions vs result types), idempotent operations where retries happen, immutability for value types.

**Relationships cheat sheet**
- *Composition (filled diamond):* part cannot outlive whole (Floor–ParkingSpot).
- *Aggregation (hollow):* shared lifetime (Team–Player).
- *Association:* uses/knows.
- *Dependency (dashed):* transient use.

**What Google looks for:** clean decomposition, reasonable abstractions (not over-engineered), correct core logic, testability (interfaces + injection), handling of edge cases and extensibility questions without rewrites.

**Testing talk track:** unit tests around pure logic (fee calculation), fakes for clocks and repositories, concurrency tests for shared state.`,
    pitfalls: ["Starting to code before agreeing on use cases", "One giant class named System/Manager", "Patterns for their own sake", "Ignoring concurrency until asked and then bolting on a global lock without discussion"],
    quiz: [
      Q("First step when asked to 'design an elevator system'?", ["Draw classes", "*Clarify actors, use cases and scope (one car or many? scheduling goals?)", "Pick patterns", "Write the scheduler"], "Scope drives the model."),
      Q("ParkingFloor and ParkingSpot: which relationship?", ["Inheritance", "*Composition", "Dependency", "None"], "Spots do not exist without their floor."),
    ],
  }),
];

const LASK = {
  req: "Clarify scope: actors, core use cases, and what is explicitly out of scope.",
  model: "List the main classes/interfaces with their key fields, methods and relationships.",
  patterns: "Where does behaviour vary? Which patterns apply, and why (and what do they cost)?",
  code: "Write the core logic for the most interesting flow.",
  ext: "Concurrency, edge cases, and how the design absorbs new requirements.",
};

export function L(
  id: string, title: string, tier: Tier, prompt: string,
  s: { req: string; model: string; patterns: string; code: string; ext: string },
  steer: [string, string][], pitfalls: string[],
  boxes: (string | ClassBox)[], rels: string[],
): Design {
  return {
    id: `d-lld-${id}`, area: "lld", topic: "lld-framework", title, tier, est: 45, prompt,
    stages: (Object.keys(LASK) as (keyof typeof LASK)[]).map((k) => ({
      key: k,
      title: { req: "Requirements", model: "Class model", patterns: "Patterns & variation", code: "Core code", ext: "Extensions & concurrency" }[k],
      ask: LASK[k],
      model: s[k],
    })),
    steer, pitfalls,
    classes: {
      // box: "Name:kind|field;field|method;method"
      boxes: boxes.map((b) => {
        if (typeof b !== "string") return b;
        const [head, f, m] = b.split("|");
        const [name, kind] = head.split(":");
        return { name, kind: (kind as ClassBox["kind"]) || "class", fields: f ? f.split(";") : [], methods: m ? m.split(";") : [] };
      }),
      // rel: "A>B:type:label"
      rels: rels.map((r) => {
        const [path, type, label] = r.split(":");
        const [a, b] = path.split(">");
        return { a, b, type: type as ClassRel["type"], label };
      }),
    },
  };
}

export const lldDesigns: Design[] = [
  L("parking-lot", "Parking lot", 1, "Design a multi-floor parking lot with different vehicle and spot types, tickets and fees.",
    {
      req: "Actors: driver, attendant/admin, system. Use cases: enter (assign spot, issue ticket), exit (compute fee, pay, free spot), show availability per floor/type. Vehicle types: motorcycle, car, truck; spot types: compact, regular, large, (EV). Out of scope: payment gateway internals, UI.",
      model: "`ParkingLot` (floors, entry/exit gates) → `ParkingFloor` → `ParkingSpot` (id, type, vehicle?). `Vehicle` (plate, type). `Ticket` (id, spot, vehicle, entryTime). `SpotAssignmentStrategy`, `PricingStrategy` interfaces. `Payment`. Availability index: per spot type a free-list (stack/heap of nearest spots).",
      patterns: "**Strategy** for pricing (hourly, flat, per-type, weekend) and for spot assignment (nearest to entrance, lowest floor). **Factory** for vehicles/tickets. **Singleton** only if a single lot instance is truly required (prefer injection). **Observer** for display boards updating on availability changes.",
      code: "```java\nTicket park(Vehicle v) {\n  ParkingSpot s = assignment.findSpot(v.type());   // may throw LotFullException\n  s.occupy(v);                                     // atomic check-and-set\n  Ticket t = new Ticket(ids.next(), s, v, clock.now());\n  active.put(t.id(), t);\n  return t;\n}\nMoney exit(String ticketId) {\n  Ticket t = active.remove(ticketId);\n  Money fee = pricing.fee(t, clock.now());\n  t.spot().release();\n  return fee;\n}\n```",
      ext: "**Concurrency:** two gates assigning the same spot → per-type concurrent free-list (poll is atomic) or lock per floor. **Extensions:** EV charging spots, reservations, monthly passes, multiple lots, lost ticket policy, vehicles spanning multiple spots (trucks/buses).",
    },
    [
      ["'Find the nearest spot to the entrance efficiently'", "Min-heap of free spots per (entrance, type); O(log n) assign/release"],
      ["'Two cars arrive at two gates simultaneously'", "Atomic removal from the free structure; no check-then-act"],
      ["'Pricing changes on weekends and for EVs'", "Swap PricingStrategy; compose rules (decorator/chain)"],
      ["'A bus needs 5 consecutive spots'", "Model spot runs; interval search per row"],
    ],
    ["Inheritance tree per spot type with duplicated logic", "Scanning all spots on each entry", "Fee logic inside Ticket or ParkingLot"],
    ["ParkingLot|floors: List<ParkingFloor>;active: Map<id, Ticket>|park(v): Ticket;exit(ticketId): Money", "ParkingFloor|level;spots|freeCount(type)", "ParkingSpot|id;type: SpotType;vehicle?|occupy(v);release()", "Vehicle:abstract|plate;type: VehicleType|", "Ticket|id;entryTime;spot;vehicle|", "PricingStrategy:interface||fee(ticket, now): Money", "SpotAssignmentStrategy:interface||findSpot(type): ParkingSpot", "HourlyPricing||fee()"],
    ["ParkingLot>ParkingFloor:has:1..*", "ParkingFloor>ParkingSpot:has:1..*", "ParkingSpot>Vehicle:uses:0..1", "Ticket>ParkingSpot:uses", "ParkingLot>PricingStrategy:uses", "ParkingLot>SpotAssignmentStrategy:uses", "HourlyPricing>PricingStrategy:implements"]),

  L("elevator", "Elevator system", 1, "Design the control software for a bank of elevators in a building.",
    {
      req: "Hall calls (floor + direction), car calls (destination), multiple cars, doors, capacity. Goals: minimise wait time, avoid starvation. Out of scope: hardware drivers. Clarify: number of floors/cars, destination-dispatch panels or classic up/down buttons?",
      model: "`ElevatorSystem` (cars, dispatcher). `ElevatorCar` (id, currentFloor, direction, state, stops: two ordered sets up/down, load). `Request` (floor, direction | destination). `Dispatcher`/`SchedulingStrategy`. `Door`. Enums: `Direction {UP, DOWN, IDLE}`, `CarState {MOVING, STOPPED, DOORS_OPEN, MAINTENANCE}`.",
      patterns: "**State** for car lifecycle (idle → moving → doors open). **Strategy** for dispatch (nearest car, least cost, zoning). **Observer** for floor displays and sensors. **Command** for requests queued to cars.",
      code: "SCAN/LOOK inside a car:\n```java\nvoid step() {\n  if (stopsInDirection().contains(currentFloor)) { openDoors(); removeStop(currentFloor); return; }\n  if (hasStopsAhead()) move(direction);\n  else if (hasStopsBehind()) direction = direction.reverse();\n  else direction = IDLE;\n}\n```\nDispatcher cost: `|car.floor − req.floor|` if the car is idle or moving toward the request in the same direction; otherwise distance to its turnaround plus back.",
      ext: "**Concurrency:** requests arrive from many floors while cars step on timers → per-car lock or single-threaded event loop per car with a concurrent inbox. **Extensions:** VIP/express, fire mode, weight sensor skip, peak-hour zoning, destination dispatch (group passengers by destination).",
    },
    [
      ["'Which car answers a hall call?'", "Cost function per car; discuss nearest-car vs load balancing"],
      ["'How do you prevent starvation of the top floor?'", "LOOK/SCAN guarantees service in sweep order; aging"],
      ["'Morning rush: everyone goes up from lobby'", "Zoning strategy, idle cars return to lobby"],
      ["'One car goes into maintenance mid-ride'", "State transition; reassign its hall calls"],
    ],
    ["FIFO request queue (thrashing between floors)", "Central loop controlling every car's motion step by step with shared state and no locking"],
    ["ElevatorSystem|cars;dispatcher|requestPickup(floor, dir);step()", "ElevatorCar|floor;direction;state;upStops;downStops|addStop(f);step()", "Dispatcher:interface||assign(req, cars): ElevatorCar", "NearestCarDispatcher||assign()", "Request|floor;direction|", "CarState:enum|IDLE;MOVING;DOORS_OPEN;MAINTENANCE|", "Door||open();close()"],
    ["ElevatorSystem>ElevatorCar:has:1..*", "ElevatorSystem>Dispatcher:uses", "NearestCarDispatcher>Dispatcher:implements", "ElevatorCar>Door:has", "ElevatorCar>CarState:uses", "Dispatcher>Request:uses"]),

  L("vending-machine", "Vending machine", 1, "Design a vending machine that accepts coins/notes, dispenses products and returns change.",
    {
      req: "Select product, insert money, dispense, return change, cancel/refund, admin restock and collect cash. Edge cases: sold out, insufficient funds, cannot make change.",
      model: "`VendingMachine` (inventory, cashBox, currentState, balance, selected). `Inventory` (slot → product, qty). `Product`. `Coin/Note` enum. `State` interface: `selectProduct`, `insertMoney`, `dispense`, `cancel`. States: `Idle`, `HasSelection`, `HasMoney`, `Dispensing`, `OutOfService`.",
      patterns: "**State** is the centrepiece: each state implements the events and performs transitions; invalid events are rejected in one place. **Strategy** for change-making (greedy for canonical coin systems, DP when limited coin counts). **Chain of responsibility** for dispensing notes/coins by denomination.",
      code: "```java\nclass HasMoneyState implements State {\n  public void insertMoney(VendingMachine m, Coin c) { m.addBalance(c); tryDispense(m); }\n  private void tryDispense(VendingMachine m) {\n    if (m.balance() < m.selected().price()) return;\n    List<Coin> change = m.cashBox().makeChange(m.balance() - m.selected().price());\n    if (change == null) { m.refund(); m.setState(new IdleState()); return; }   // cannot make change\n    m.setState(new DispensingState()); m.dispense(change);\n  }\n  public void cancel(VendingMachine m) { m.refund(); m.setState(new IdleState()); }\n}\n```",
      ext: "Change-making with limited coins (bounded coin change DP). Card payments (new state path / payment strategy). Remote telemetry (observer). Atomicity: dispense failure after payment → refund path. Concurrency is minimal (single user) but admin vs user access needs a mode lock.",
    },
    [
      ["'Machine cannot return exact change'", "Check feasibility before accepting / before dispensing; refund"],
      ["'Add card payments'", "Payment abstraction; states unchanged or new AwaitingAuth state"],
      ["'Product gets stuck'", "Sensor confirmation; Dispensing → refund transition"],
    ],
    ["Boolean flags instead of states", "Greedy change with limited coin inventory"],
    ["VendingMachine|state: State;balance;selected;inventory;cashBox|select(slot);insert(coin);cancel()", "State:interface||selectProduct();insertMoney();dispense();cancel()", "IdleState||", "HasMoneyState||", "DispensingState||", "Inventory|slots: Map<Slot, Item>|isAvailable(slot);take(slot)", "CashBox|coins: Map<Coin, int>|makeChange(amount): List<Coin>", "Product|name;price|"],
    ["VendingMachine>State:uses:current", "IdleState>State:implements", "HasMoneyState>State:implements", "DispensingState>State:implements", "VendingMachine>Inventory:has", "VendingMachine>CashBox:has", "Inventory>Product:has"]),

  L("splitwise", "Expense sharing (Splitwise)", 1, "Design an app to record shared expenses and compute who owes whom.",
    {
      req: "Users, groups, add expense (payer(s), participants, split equal/exact/percent/shares), view balances, settle up, simplify debts. Out of scope: payments integration.",
      model: "`User`, `Group` (members, expenses). `Expense` (id, amount, paidBy, splits: List<Split>, metadata). `Split` (user, amount) created by a `SplitStrategy` (Equal, Exact, Percent, Share) which also validates. `BalanceSheet`: map (debtor, creditor) → amount, or net balance per user per group. `Settlement` is a special expense.",
      patterns: "**Strategy** for split computation/validation. **Factory** to pick the strategy from the request type. **Observer** to notify participants. Money as an integer minor-unit value object; distribute rounding remainders deterministically.",
      code: "Debt simplification (minimise transactions heuristically):\n```python\ndef simplify(net):                     # user -> net amount (+ is owed money)\n    cred = [(-a, u) for u, a in net.items() if a > 0]   # max-heap\n    debt = [(a, u) for u, a in net.items() if a < 0]    # most negative first\n    heapify(cred); heapify(debt); out = []\n    while cred and debt:\n        c, cu = heappop(cred); d, du = heappop(debt)\n        pay = min(-c, -d); out.append((du, cu, pay))\n        if -c - pay: heappush(cred, (c + pay, cu))\n        if -d - pay: heappush(debt, (d + pay, du))\n    return out\n```\nGreedy gives ≤ n−1 transactions; the true minimum is NP-hard (subset-sum partition; LC 465 uses backtracking for small n).",
      ext: "Concurrency: two expenses updating the same pair balance → transactional updates / per-group lock / event-sourced ledger recomputed from expenses. Multi-currency, recurring expenses, expense edits/deletes (reverse and reapply), activity feed, audit.",
    },
    [
      ["'Minimise the number of settlements'", "Greedy n−1 vs optimal (NP-hard); state the bound"],
      ["'₹100 split three ways'", "Integer minor units; assign leftover paise deterministically"],
      ["'Edit an old expense'", "Derive balances from the expense log; or apply reverse delta"],
    ],
    ["Floats for money", "Storing only pairwise balances with no expense history"],
    ["Group|members;expenses|addExpense(e);balances()", "User|id;name|", "Expense|amount: Money;paidBy;splits|", "Split|user;amount|", "SplitStrategy:interface||split(amount, participants, params): List<Split>", "EqualSplit||", "PercentSplit||", "BalanceSheet|net: Map<User, Money>|apply(expense);simplify()"],
    ["Group>User:has:members", "Group>Expense:has", "Expense>Split:has", "Expense>SplitStrategy:uses", "EqualSplit>SplitStrategy:implements", "PercentSplit>SplitStrategy:implements", "Group>BalanceSheet:has"]),

  L("lru-concurrent", "Thread-safe cache with eviction & TTL", 1, "Design an in-memory cache library with pluggable eviction, TTL and thread safety.",
    {
      req: "`get`, `put`, `delete`; capacity bound; eviction policy (LRU default, LFU/FIFO pluggable); optional TTL per entry; thread-safe; stats (hits/misses). Clarify: read/write ratio, loader function on miss?",
      model: "`Cache<K,V>` interface. `InMemoryCache` (storage map, `EvictionPolicy<K>`, capacity, clock). `EvictionPolicy` interface: `keyAccessed`, `keyAdded`, `keyRemoved`, `evictKey()`. `LRUPolicy` (doubly linked list + map). `Entry` (value, expiresAt). `CacheLoader`.",
      patterns: "**Strategy** for eviction. **Decorator** for cross-cutting features (stats, TTL, loading) around a base cache. **Builder** for configuration. Dependency-inject a `Clock` for testable TTL.",
      code: "```java\npublic V get(K key) {\n  lock.lock();\n  try {\n    Entry<V> e = map.get(key);\n    if (e == null || e.expired(clock.now())) { if (e != null) removeInternal(key); misses++; return null; }\n    policy.keyAccessed(key); hits++; return e.value;\n  } finally { lock.unlock(); }\n}\npublic void put(K key, V value) {\n  lock.lock();\n  try {\n    if (!map.containsKey(key) && map.size() >= capacity) removeInternal(policy.evictKey());\n    map.put(key, new Entry<>(value, clock.now() + ttl)); policy.keyAdded(key);\n  } finally { lock.unlock(); }\n}\n```",
      ext: "**Concurrency ladder:** single lock (LRU mutates on reads so a read–write lock does not help) → lock striping by key hash with per-segment LRU → buffered access recording drained in batches (Caffeine's approach). **Stampede protection:** per-key futures so one loader runs. **TTL expiry:** lazy on access + periodic sweeper / timing wheel. Bridge to distributed cache (HLD).",
    },
    [
      ["'Why can't reads share a read lock?'", "LRU reorders on every get: it is a write"],
      ["'Throughput under 64 threads'", "Segments or batched recency updates; approximate LRU"],
      ["'100 threads miss the same key'", "Coalesce with a per-key future (computeIfAbsent)"],
    ],
    ["Read lock around LRU get", "Eviction logic hard-coded in the cache class"],
    ["Cache:interface||get(k);put(k, v);delete(k)", "InMemoryCache|map;policy;capacity;clock;lock|get();put()", "EvictionPolicy:interface||keyAccessed(k);keyAdded(k);evictKey()", "LRUPolicy|list;nodes|", "LFUPolicy|freqLists;minFreq|", "Entry|value;expiresAt|expired(now)", "StatsDecorator|inner: Cache;hits;misses|"],
    ["InMemoryCache>Cache:implements", "InMemoryCache>EvictionPolicy:uses", "LRUPolicy>EvictionPolicy:implements", "LFUPolicy>EvictionPolicy:implements", "InMemoryCache>Entry:has", "StatsDecorator>Cache:implements", "StatsDecorator>Cache:uses:wraps"]),

  L("rate-limiter-lld", "Rate limiter library", 1, "Design an in-process rate limiter component with multiple algorithms.",
    {
      req: "`allow(clientId)` returns whether the request may proceed. Configurable per client/endpoint. Algorithms: token bucket, fixed window, sliding window log/counter. Thread-safe, low overhead. Clarify: in-process only or pluggable shared store?",
      model: "`RateLimiter` interface (`allow(key)`). `TokenBucketLimiter`, `SlidingWindowLimiter`. `RateLimitConfig` (limit, window, burst). `LimiterRegistry` (key → limiter state, lazily created, evicts idle keys). `Clock` abstraction. Optional `StateStore` interface (local map vs Redis).",
      patterns: "**Strategy** for the algorithm; **Factory** from config; **Decorator** to compose limits (per-user AND per-IP); dependency-injected clock.",
      code: "```java\nclass TokenBucket {\n  private final long capacity; private final double refillPerNano;\n  private double tokens; private long last;\n  synchronized boolean tryAcquire(long now, int cost) {\n    tokens = Math.min(capacity, tokens + (now - last) * refillPerNano);\n    last = now;\n    if (tokens < cost) return false;\n    tokens -= cost; return true;\n  }\n}\n```\nPer-key bucket in a `ConcurrentHashMap.computeIfAbsent`; lock per bucket, not global.",
      ext: "Lock-free variant with CAS on a packed (tokens, timestamp). Memory: evict idle buckets (LRU/TTL). Distributed: same interface over Redis Lua. Return `retryAfter`. Weighted costs. Testing with a fake clock.",
    },
    [
      ["'Compare the algorithms'", "Burst behaviour, memory per key, accuracy at boundaries"],
      ["'Millions of client ids'", "Lazy creation + idle eviction; compact state"],
      ["'Make it distributed'", "StateStore abstraction; atomic script; local pre-check"],
    ],
    ["Global lock for all keys", "Background refill thread per bucket instead of lazy refill"],
    ["RateLimiter:interface||allow(key): Decision", "TokenBucketLimiter|buckets: Map<key, TokenBucket>|allow()", "SlidingWindowLimiter|windows|allow()", "TokenBucket|tokens;last;capacity|tryAcquire(now, cost)", "RateLimitConfig|limit;window;burst|", "Clock:interface||now()", "CompositeLimiter|limiters|allow()"],
    ["TokenBucketLimiter>RateLimiter:implements", "SlidingWindowLimiter>RateLimiter:implements", "CompositeLimiter>RateLimiter:implements", "TokenBucketLimiter>TokenBucket:has", "TokenBucketLimiter>Clock:uses", "TokenBucketLimiter>RateLimitConfig:uses", "CompositeLimiter>RateLimiter:uses:all must allow"]),

  L("logger", "Logging framework", 2, "Design a logging library like log4j/slf4j.",
    {
      req: "Log levels, multiple destinations (console, file, network), formatting, per-logger configuration with hierarchy, thread-safe, minimal overhead on the calling thread (async option).",
      model: "`Logger` (name, level, appenders, parent). `LogManager` (registry/factory of loggers). `LogEvent` (timestamp, level, message, thread, context). `Appender` interface (`append(event)`): `ConsoleAppender`, `FileAppender` (rolling), `AsyncAppender` (queue + worker). `Formatter/Layout`. `Filter`.",
      patterns: "**Singleton/registry** for LogManager. **Observer**: appenders subscribe to a logger. **Chain of responsibility**: event bubbles to parent loggers; filters. **Strategy** for layout. **Decorator**: AsyncAppender wraps any appender. **Builder** for configuration.",
      code: "```java\nvoid log(Level lvl, String msg) {\n  if (lvl.ordinal() < effectiveLevel().ordinal()) return;          // cheap early exit\n  LogEvent e = new LogEvent(clock.now(), lvl, name, msg, Thread.currentThread().getName());\n  for (Logger l = this; l != null; l = l.additive ? l.parent : null)\n    for (Appender a : l.appenders) a.append(e);\n}\n// AsyncAppender\nvoid append(LogEvent e) { if (!queue.offer(e)) dropped.incrementAndGet(); }   // bounded: drop or block policy\n```",
      ext: "Backpressure policy when the async queue is full (block, drop, drop low levels). File rolling by size/time. Structured logging (JSON), MDC/context propagation, sampling, flush on shutdown, lazy message construction (lambdas).",
    },
    [
      ["'Logging slows the request thread'", "Async appender with bounded queue and explicit overflow policy"],
      ["'Ensure ordering across threads'", "Single writer thread per appender; timestamps + sequence"],
      ["'Crash loses buffered logs'", "Flush policy trade-off; sync for ERROR and above"],
    ],
    ["Synchronous file I/O under a global lock", "String formatting before the level check"],
    ["Logger|name;level;appenders;parent|log(level, msg);info();error()", "LogManager|loggers: Map|getLogger(name)", "Appender:interface||append(event)", "ConsoleAppender||", "FileAppender|path;rollPolicy|", "AsyncAppender|queue;inner: Appender|", "Formatter:interface||format(event): String", "LogEvent|ts;level;message;thread|"],
    ["LogManager>Logger:has", "Logger>Appender:uses:0..*", "ConsoleAppender>Appender:implements", "FileAppender>Appender:implements", "AsyncAppender>Appender:implements", "AsyncAppender>Appender:uses:wraps", "Appender>Formatter:uses", "Logger>LogEvent:uses"]),

  L("file-system", "In-memory file system", 2, "Design an in-memory file system supporting mkdir, ls, create/read/write files and search.",
    {
      req: "Paths, directories, files with content, `ls`, `mkdir -p`, `addContentToFile`, `read`, delete/move; find by name/size/extension (Unix `find`). Out of scope: permissions (unless asked), persistence.",
      model: "`Node` abstract (name, parent, createdAt). `File` (content/bytes). `Directory` (children: sorted map name → Node). `FileSystem` (root, `resolve(path)`). For find: `Filter` interface (`NameFilter`, `SizeFilter`, `ExtensionFilter`) and combinators `And/Or/Not`.",
      patterns: "**Composite** (File and Directory are Nodes). **Specification / Strategy** for search filters, composable. **Visitor** or iterator for traversal. **Command** if undo is requested.",
      code: "```python\ndef resolve(self, path, create=False):\n    node = self.root\n    for part in filter(None, path.split('/')):\n        if part not in node.children:\n            if not create: raise FileNotFoundError(path)\n            node.children[part] = Directory(part, node)\n        node = node.children[part]\n    return node\n\ndef find(self, start, spec):\n    stack, out = [start], []\n    while stack:\n        n = stack.pop()\n        if spec.matches(n): out.append(n)\n        if isinstance(n, Directory): stack.extend(n.children.values())\n    return out\n```",
      ext: "Concurrency: per-directory read–write locks, lock ordering by path depth to avoid deadlock on move. Symlinks (cycle detection), hard links (inode indirection), permissions, quotas, large files (chunks), snapshots (copy-on-write).",
    },
    [
      ["'Implement find with size > 5 MB AND extension .log'", "Composable filter objects"],
      ["'Move a directory into its own child'", "Validate ancestry; cycles"],
      ["'Two threads create the same path'", "Lock parent directory; putIfAbsent"],
    ],
    ["Storing full paths as map keys (rename is O(n))", "One class for files and directories with a flag"],
    ["FileSystem|root: Directory|mkdir(path);ls(path);write(path, data);find(path, filter)", "Node:abstract|name;parent|path()", "File|content|read();append(data)", "Directory|children: SortedMap|add(node);get(name)", "Filter:interface||matches(node): bool", "NameFilter|pattern|", "SizeFilter|min;max|", "AndFilter|filters|"],
    ["File>Node:extends", "Directory>Node:extends", "Directory>Node:has:children", "FileSystem>Directory:has:root", "NameFilter>Filter:implements", "SizeFilter>Filter:implements", "AndFilter>Filter:implements", "FileSystem>Filter:uses"]),

  L("pub-sub", "In-memory pub/sub message broker", 2, "Design an in-process message broker with topics, publishers and subscribers.",
    {
      req: "Create topics, publish messages, subscribers consume independently at their own pace (offset per subscriber), at-least-once delivery, replay from an offset, multiple consumers. Clarify push vs pull, ordering per topic.",
      model: "`Broker` (topics). `Topic` (name, append-only `List<Message>`, subscribers). `Message` (id, payload, timestamp). `Subscription` (subscriber, topic, offset: AtomicInteger). `Subscriber` interface (`onMessage`). `SubscriberWorker` (thread waking on new messages). Optional `ConsumerGroup` (shared offset).",
      patterns: "**Observer** (topic → subscriptions). **Producer–consumer** with condition variables. **Iterator** over the log from an offset. **Strategy** for delivery (push worker vs pull API) and retry policy.",
      code: "```java\nvoid publish(String topic, Message m) {\n  Topic t = topics.get(topic);\n  synchronized (t) { t.log.add(m); }\n  for (Subscription s : t.subscriptions) s.worker.wakeUp();\n}\n// worker loop per subscription\nwhile (running) {\n  synchronized (sub) { while (sub.offset.get() >= topic.size()) sub.wait(); }\n  Message m = topic.get(sub.offset.get());\n  try { sub.subscriber.onMessage(m); sub.offset.incrementAndGet(); }   // ack after success → at-least-once\n  catch (Exception e) { retryOrDeadLetter(sub, m); }\n}\n```",
      ext: "Slow subscriber isolation (one worker per subscription, bounded retries, DLQ). Reset offset for replay. Retention/compaction. Partitions for parallelism with per-key ordering. Persisting the log → Kafka-like design (bridge to HLD).",
    },
    [
      ["'One subscriber is slow'", "Independent offsets and workers; no head-of-line blocking for others"],
      ["'Subscriber crashes mid-message'", "Offset advanced only after success → redelivery; idempotent consumers"],
      ["'Replay yesterday's messages'", "Offsets into a retained log"],
    ],
    ["Delivering synchronously on the publisher thread", "Deleting messages after first delivery when multiple subscribers exist"],
    ["Broker|topics: Map|createTopic();publish(topic, msg);subscribe(topic, sub)", "Topic|name;log: List<Message>;subscriptions|append(m)", "Message|id;payload;ts|", "Subscription|offset: AtomicInt;worker|resetOffset(n)", "Subscriber:interface||onMessage(m)", "SubscriberWorker|thread|run();wakeUp()"],
    ["Broker>Topic:has", "Topic>Message:has", "Topic>Subscription:has", "Subscription>Subscriber:uses", "Subscription>SubscriberWorker:has"]),

  L("board-game", "Board games: Tic-tac-toe → Chess", 2, "Design a two-player turn-based board game engine; start with tic-tac-toe, extend toward chess.",
    {
      req: "Players alternate moves, validate moves, detect win/draw, n×n board for tic-tac-toe; for chess: piece movement rules, check/checkmate, special moves (scope explicitly). Undo and move history as extensions.",
      model: "`Game` (board, players, turn, status, history). `Board` (grid of `Cell`/`Piece?`). `Player` (human/AI). `Move` (from, to, piece, captured). `Piece` abstract with `validMoves(board)`: `King, Queen, Rook, Bishop, Knight, Pawn`. `Rules`/`WinStrategy`. Enums: `Color`, `GameStatus`.",
      patterns: "**Polymorphism/Strategy** for piece movement. **Command** for moves (execute/undo → history, takeback). **Factory** for initial setup. **State** for game status. **Observer** for UI updates.",
      code: "O(1) tic-tac-toe win check:\n```java\nint[] rows = new int[n], cols = new int[n]; int diag, anti;\nint move(int r, int c, int player) {            // player = +1 / −1\n  rows[r] += player; cols[c] += player;\n  if (r == c) diag += player;\n  if (r + c == n - 1) anti += player;\n  return (Math.abs(rows[r]) == n || Math.abs(cols[c]) == n || Math.abs(diag) == n || Math.abs(anti) == n) ? player : 0;\n}\n```\nChess legality: generate pseudo-legal moves per piece, apply, reject if own king is attacked.",
      ext: "Connect-k on m×n (count in four directions from the last move). AI player (minimax + alpha-beta). Online play (bridge to HLD: matchmaking, game state sync). Timers, draw rules, serialisation (FEN/PGN).",
    },
    [
      ["'Detect a winner in O(1) per move'", "Row/column/diagonal counters"],
      ["'Support undo'", "Command objects with captured state on a stack"],
      ["'Add a new piece type'", "New Piece subclass; no changes to Board/Game"],
    ],
    ["Giant switch on piece type inside Board", "Scanning the whole board after each move"],
    ["Game|board;players;turn;status;history|makeMove(move);undo()", "Board|grid|get(pos);apply(move);isAttacked(pos, by)", "Piece:abstract|color;position|validMoves(board)", "Knight||validMoves()", "Rook||validMoves()", "Move|from;to;piece;captured|execute(board);undo(board)", "Player|name;color|", "GameStatus:enum|ACTIVE;CHECK;MATE;DRAW|"],
    ["Game>Board:has", "Game>Player:has:2", "Game>Move:has:history", "Board>Piece:has:0..32", "Knight>Piece:extends", "Rook>Piece:extends", "Move>Piece:uses", "Game>GameStatus:uses"]),

  L("text-editor", "Text editor with undo/redo", 2, "Design the core of a text editor: insert, delete, cursor movement, undo and redo.",
    {
      req: "Insert/delete at cursor, move cursor, select, undo/redo unlimited, large documents. Clarify: single user? what granularity of undo (keystroke vs word)?",
      model: "`Editor` (buffer, cursor, undoStack, redoStack). `TextBuffer` interface: implementations **gap buffer**, **piece table** or **rope**. `Command` interface (`execute`, `undo`): `InsertCommand(pos, text)`, `DeleteCommand(pos, len, removedText)`. `Cursor/Selection`.",
      patterns: "**Command** + two stacks for undo/redo (new command clears redo). **Memento** as an alternative for snapshots. **Strategy** for buffer implementation. **Composite command** to group keystrokes into one undo unit.",
      code: "```java\nvoid run(Command c) { c.execute(buffer); undo.push(c); redo.clear(); }\nvoid undo() { if (undo.isEmpty()) return; Command c = undo.pop(); c.undo(buffer); redo.push(c); }\nvoid redo() { if (redo.isEmpty()) return; Command c = redo.pop(); c.execute(buffer); undo.push(c); }\n\nclass DeleteCommand implements Command {\n  int pos, len; String removed;\n  public void execute(TextBuffer b) { removed = b.substring(pos, len); b.delete(pos, len); }\n  public void undo(TextBuffer b) { b.insert(pos, removed); }\n}\n```\nData structure trade-offs: gap buffer (O(1) local edits, O(n) cursor jumps), piece table (append-only originals, cheap undo), rope (O(log n) everything, large files).",
      ext: "Coalescing typing into word-level undo. Memory bounds on history. Collaborative editing (OT/CRDT → HLD). Syntax highlighting via incremental parsing. Two-stack 'LeetCode 2296' variant as a coding question.",
    },
    [
      ["'Document is 2 GB'", "Rope or piece table; lazy loading"],
      ["'Undo should revert a whole word'", "Composite / merged commands with time threshold"],
      ["'Redo after a new edit?'", "Redo stack cleared: explain why"],
    ],
    ["Snapshotting the full document on each keystroke", "A single string with O(n) inserts"],
    ["Editor|buffer;cursor;undoStack;redoStack|type(text);delete(n);undo();redo()", "TextBuffer:interface||insert(pos, s);delete(pos, len);substring()", "GapBuffer||", "PieceTable||", "Command:interface||execute(buf);undo(buf)", "InsertCommand|pos;text|", "DeleteCommand|pos;len;removed|"],
    ["Editor>TextBuffer:uses", "GapBuffer>TextBuffer:implements", "PieceTable>TextBuffer:implements", "Editor>Command:has:stacks", "InsertCommand>Command:implements", "DeleteCommand>Command:implements"]),

  L("kv-transactions", "In-memory key-value store with transactions", 2, "Design an in-memory database supporting get/set/delete and nested transactions (begin, commit, rollback).",
    {
      req: "`get`, `set`, `delete`, `count(value)`; `begin`, `rollback`, `commit` with nesting. Clarify: single-threaded? TTL? Often asked in progressive levels (basic → TTL → transactions → concurrency).",
      model: "`Database` (store: map, valueCounts: map, txStack: List<Transaction>). `Transaction` holds an **undo log** (key → previous value or ABSENT) or a write-set overlay. Optional `Entry` (value, expiresAt) and `Clock`.",
      patterns: "**Command/undo log** for rollback. **Memento** alternative (copy-on-begin is O(n): reject it). **Strategy** for expiry. Layered design so each interview 'level' adds a decorator rather than a rewrite.",
      code: "```python\nclass DB:\n    def __init__(self): self.data, self.tx = {}, []\n    def set(self, k, v):\n        if self.tx and k not in self.tx[-1]: self.tx[-1][k] = self.data.get(k, ABSENT)   # first write wins\n        self.data[k] = v\n    def begin(self): self.tx.append({})\n    def rollback(self):\n        for k, old in self.tx.pop().items():\n            if old is ABSENT: self.data.pop(k, None)\n            else: self.data[k] = old\n    def commit(self):\n        log = self.tx.pop()\n        if self.tx:                                   # merge into parent, keep the oldest value\n            for k, old in log.items(): self.tx[-1].setdefault(k, old)\n```",
      ext: "`count(value)` index maintained on every mutation including rollback. TTL with lazy expiry + heap. Concurrency: global lock → MVCC snapshots (versioned values, snapshot timestamp) for isolation between concurrent transactions; conflict detection at commit (optimistic).",
    },
    [
      ["'Nested transactions'", "Stack of undo logs; commit merges into parent"],
      ["'Rollback must be O(changes), not O(data)'", "Undo log, not full copy"],
      ["'Two clients with concurrent transactions'", "MVCC / snapshot isolation, first-committer-wins"],
    ],
    ["Copying the whole map at begin", "Forgetting secondary indexes during rollback"],
    ["Database|data: Map;valueCount: Map;txStack|get(k);set(k, v);delete(k);begin();commit();rollback()", "Transaction|undoLog: Map<key, old>|record(k, old)", "Entry|value;expiresAt|", "Clock:interface||now()"],
    ["Database>Transaction:has:stack", "Database>Entry:has", "Database>Clock:uses"]),

  L("meeting-scheduler", "Meeting room scheduler / calendar", 2, "Design a calendar system to book meeting rooms and schedule meetings for participants.",
    {
      req: "Rooms with capacity/features, book a room for a time range, find available rooms, invite participants and detect conflicts, recurring meetings, notifications, cancel/reschedule.",
      model: "`Calendar` per user/room (sorted intervals). `Room` (id, capacity, features, calendar). `Meeting` (id, organiser, participants, room, interval, recurrence). `Interval` value object. `Scheduler` (book, findRooms, suggestSlots). `RoomSelectionStrategy`. `Notifier`.",
      patterns: "**Strategy** for room selection (smallest fitting, nearest). **Observer** for invites/notifications. **Builder** for meetings. Interval tree / ordered map per calendar for O(log n) conflict checks.",
      code: "```java\nsynchronized boolean book(TreeMap<Instant, Instant> cal, Instant s, Instant e) {   // half-open [s, e)\n  var prev = cal.floorEntry(s); var next = cal.ceilingEntry(s);\n  if (prev != null && prev.getValue().isAfter(s)) return false;\n  if (next != null && next.getKey().isBefore(e)) return false;\n  cal.put(s, e); return true;\n}\n```\nSuggest slots: merge all participants' busy intervals, scan gaps ≥ duration within working hours.",
      ext: "Concurrency: lock per room calendar; booking room + all participants atomically → ordered locking or optimistic versioning. Recurrence: store rule (RRULE) and expand lazily; exceptions. Time zones and DST. Scale-out → calendar HLD.",
    },
    [
      ["'Find a slot for 8 people'", "Merge busy intervals; sweep line"],
      ["'Recurring weekly meeting forever'", "Store the rule, expand on query window"],
      ["'Two people book the same room simultaneously'", "Per-room lock / conditional insert"],
    ],
    ["Checking conflicts by scanning all meetings", "Expanding infinite recurrences eagerly"],
    ["Scheduler|rooms;calendars|book(req): Meeting;findRooms(interval, capacity);suggestSlots(users, duration)", "Room|id;capacity;features;calendar|", "Calendar|busy: TreeMap<start, end>|isFree(interval);add(interval)", "Meeting|organiser;participants;room;interval;recurrence|", "Interval|start;end|overlaps(other)", "RoomSelectionStrategy:interface||choose(candidates): Room", "Notifier:interface||notify(users, meeting)"],
    ["Scheduler>Room:has", "Room>Calendar:has", "Scheduler>RoomSelectionStrategy:uses", "Scheduler>Notifier:uses", "Meeting>Room:uses", "Meeting>Interval:has", "Calendar>Interval:has"]),

  L("task-scheduler-lld", "In-process task scheduler / thread pool", 3, "Design a scheduler that runs tasks at a given time or periodically using a pool of worker threads.",
    {
      req: "`schedule(task, delay)`, `scheduleAtFixedRate(task, period)`, cancellation, bounded worker pool, graceful shutdown. Tasks may throw. Clarify precision and behaviour when all workers are busy.",
      model: "`Scheduler` (delay queue: min-heap by runAt, lock + condition). `ScheduledTask` (runnable, runAt, period, cancelled flag). `WorkerPool` (threads, blocking queue). `Clock`. `Future/Handle` for cancellation.",
      patterns: "**Producer–consumer**; **Command** (tasks). **Strategy** for rejection policy. Timer thread waits until the earliest deadline with `awaitUntil`, re-armed when an earlier task is inserted.",
      code: "```java\nvoid timerLoop() {\n  lock.lock();\n  try {\n    while (running) {\n      if (heap.isEmpty()) { available.await(); continue; }\n      long wait = heap.peek().runAt - clock.now();\n      if (wait > 0) { available.awaitNanos(wait); continue; }          // woken early if a sooner task arrives\n      ScheduledTask t = heap.poll();\n      if (t.cancelled) continue;\n      pool.submit(() -> { try { t.run(); } finally { if (t.period > 0) reschedule(t); } });\n    }\n  } finally { lock.unlock(); }\n}\n```",
      ext: "Fixed-rate vs fixed-delay semantics; long tasks overlapping their next run. Hierarchical timing wheels for millions of timers. Persistence and distribution → distributed job scheduler (HLD).",
    },
    [
      ["'A task scheduled sooner arrives while the timer sleeps'", "Signal the condition; recompute the wait"],
      ["'Task throws an exception'", "Isolate; periodic task policy (continue or cancel)"],
      ["'1 M timers'", "Timing wheel instead of a heap"],
    ],
    ["One thread per scheduled task", "Busy-wait polling loop"],
    ["Scheduler|heap;lock;available;pool|schedule(task, delay);scheduleAtFixedRate();shutdown()", "ScheduledTask|runAt;period;cancelled|run();cancel()", "WorkerPool|threads;queue|submit(r)", "Clock:interface||now()"],
    ["Scheduler>ScheduledTask:has:heap", "Scheduler>WorkerPool:has", "Scheduler>Clock:uses"]),
];
