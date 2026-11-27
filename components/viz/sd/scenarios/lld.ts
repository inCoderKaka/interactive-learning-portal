import type { Scenario } from "../Seq";

/** LLD sequence scenarios: object collaborations shown as calls between objects (not machines). */
export const LLD: Record<string, Scenario> = {
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
