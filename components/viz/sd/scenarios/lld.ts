import type { Scenario } from "../Seq";

/** LLD sequence scenarios: object collaborations shown as calls between objects (not machines). */
export const LLD: Record<string, Scenario> = {
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
