=== d-lld-parking-lot
--- words
- **Spot type / size**: the size class of a parking spot (small, regular, large) that decides which vehicles fit.
- **Ticket**: the record issued at entry (spot, vehicle, entry time) that is used to pay and exit.
- **Pricing strategy**: a swappable rule for computing the fee (hourly, flat, weekend, event).
- **Assignment strategy**: a swappable rule for picking a spot (nearest to the gate, lowest floor).
- **Free list**: a data structure of currently free spots per size, from which a spot is taken in one step.
- **Atomic claim**: finding and reserving a spot in one indivisible step so two gates can't get the same one.
--- flow
1. **0–5 min**: clarify: floors, spot sizes and vehicle types, several entry/exit gates, payment at exit, pricing rules that change, display boards. Out of scope: payment-provider internals, UI.
2. **5–12**: entities: ParkingLot, ParkingFloor, ParkingSpot, Vehicle, Ticket; enums SpotSize, VehicleType; interfaces PricingStrategy, SpotAssigner. Class diagram with composition (lot ◆ floors ◆ spots).
3. **12–17**: API: `park(vehicle) → Ticket`, `exit(ticketId) → fee`, `freeCount(floor, size)`; walk the entry and exit sequences.
4. **17–35**: code: spot invariants, atomic `take(size)`, ticket issuing, exit with pricing.
5. **35–45**: two gates at once, new pricing rules, EV spots, display boards (observer), tests.
--- req
**Actors**: driver, gate (entry/exit terminals), operator/admin.

**Use cases**: enter and get a ticket for a spot that fits; exit, pay the fee, free the spot; see free spots per floor and size; operator changes pricing.

**Rules to pin down**: a vehicle fits its own size or larger (a bike may use a regular spot only if the owner allows); lot full → entry refused; lost ticket policy; pricing changes by time and day.

**Out of scope**: payment-provider integration (behind an interface), reservations, number-plate recognition.
--- model
- `ParkingLot` (coordinator): floors, `SpotAssigner`, `PricingStrategy`, `Clock`, active tickets `Map<TicketId, Ticket>`.
- `ParkingFloor` owns its `ParkingSpot`s (composition).
- `ParkingSpot`: id, `SpotSize`, current `Vehicle` (or empty); `occupy(v)` / `release()` guard the invariant "at most one vehicle".
- `Vehicle(plate, VehicleType)`; `VehicleType` knows the `SpotSize` it needs.
- `Ticket(id, spot, vehicle, entryTime)`: an immutable record.
- `SpotAssigner` (interface): `take(size)` atomically claims a free spot; `giveBack(spot)`.
- `PricingStrategy` (interface): `fee(ticket, exitTime)`.
- `AvailabilityListener` (observer) for display boards.
--- patterns
- **Strategy** for pricing (hourly, flat, weekend, composite calendar pricing) and for spot assignment (nearest, lowest floor, EV-first). New rules are new classes; the lot never changes.
- **Observer** so floors notify display boards and apps when availability changes, without depending on them.
- **Factory** at the gate to turn scanner input (type code, plate) into a `Vehicle`.
- **Avoid singleton** for the lot: create one instance in `main` and inject it (tests need fresh lots).
- **State** only if tickets have a real lifecycle (active → paid → exited, with a 15-minute exit window after paying).
--- code
```java
interface SpotAssigner { Optional<ParkingSpot> take(SpotSize size); void giveBack(ParkingSpot s); }

final class NearestFirstAssigner implements SpotAssigner {
  private final Map<SpotSize, ConcurrentLinkedDeque<ParkingSpot>> free = new EnumMap<>(SpotSize.class);
  public Optional<ParkingSpot> take(SpotSize size) {
    for (SpotSize s : SpotSize.atLeast(size)) {                 // smallest size that fits first
      ParkingSpot spot = free.get(s).pollFirst();               // atomic claim
      if (spot != null) return Optional.of(spot);
    }
    return Optional.empty();
  }
  public void giveBack(ParkingSpot s) { free.get(s.size()).offerFirst(s); }
}

final class ParkingLot {
  Ticket park(Vehicle v) {
    ParkingSpot s = assigner.take(v.type().needs()).orElseThrow(() -> new LotFullException(v.type()));
    s.occupy(v);
    Ticket t = new Ticket(TicketId.next(), s, v, clock.instant());
    active.put(t.id(), t);
    floorOf(s).changed(s.size());                               // notify observers
    return t;
  }
  Money exit(TicketId id) {
    Ticket t = active.remove(id);                               // remove first: double exit fails
    if (t == null) throw new UnknownTicketException(id);
    Money fee = pricing.fee(t, clock.instant());
    t.spot().release();
    assigner.giveBack(t.spot());
    floorOf(t.spot()).changed(t.spot().size());
    return fee;
  }
}
```
--- ext
**Concurrency**: shared state is the free lists and the active-ticket map. `pollFirst` on a concurrent deque claims a spot atomically (no check-then-act); `ConcurrentHashMap.remove` makes exit idempotent-safe; `ParkingSpot.occupy` still checks its invariant as a last line of defence. Observers are notified outside any lock.

**Extensions**: EV spots (a size plus a capability, assigner prefers EV spots for EVs), reservations (a `Held` state with expiry), multiple lots (a `LotDirectory`), trucks taking several adjacent spots (assign runs of spots per row), lost tickets (fee policy + plate lookup).

**Tests**: assigner picks the smallest fitting size; full lot throws; fee with a fake clock at 59/60/61 minutes; double exit fails; 50 threads parking at once never share a spot.
--- variants
Q: Trucks and buses need 3–5 adjacent regular spots.
A: Spots get a row and position; the assigner keeps free runs per row (or scans a row's bitmap) and claims a contiguous run atomically under a per-row lock; the ticket holds a list of spots.
Q: Customers can reserve a spot for a time window from an app.
A: Add a Reservation entity and a Held state on spots with an expiry; the assigner excludes held spots; a timer releases no-shows; pricing may charge for the reservation.
Q: The operator runs 20 lots in a city and wants a city-wide availability app.
A: Each lot publishes availability events; a directory service aggregates them; this becomes an HLD question (eventual consistency of counts).
--- steer
Q: Two cars arrive at two gates at the same moment.
A: Atomic find-and-claim (concurrent deque poll or a lock per size), not "find free" then "occupy".
Q: Weekend and event pricing.
A: A PricingStrategy per rule, plus a calendar strategy that delegates; the lot is untouched.
Q: Display boards must update in real time.
A: Floors as subjects, boards as observers; notify outside locks, keep listeners fast.
Q: How do you test the fee?
A: Inject a Clock; test boundaries with a fake clock.
--- pitfalls
- One ParkingLotManager class holding pricing, assignment, storage and display logic
- Finding a free spot and occupying it in two separate, unsynchronised steps
- Hard-coding the hourly rate inside exit()
- Reading the system clock directly in pricing
- Inheritance hierarchies like CarSpot extends Spot with no behaviour differences
--- level
- **L4**: correct classes and relationships, working park/exit, enums for sizes and types.
- **L5**: strategies for pricing and assignment justified by the requirements, atomic spot claiming without being asked, observer for boards, clean errors, tests named.
- **L6**: multi-spot vehicles, reservations, evolution to a multi-lot service with persistence and event-driven availability, explicit non-goals.
--- prereqs
class-diagrams, behaviour-diagrams, ood-core-code, srp-ocp, factory-patterns, strategy-template, observer-pattern
--- paths
- [deep] How is a spot chosen for a vehicle? :: SpotAssigner strategy; free lists per size; smallest fitting size first; O(1) claim.
  - Make it the nearest spot to the entry gate :: Per-gate ordering (a heap or pre-sorted list per gate and size); trade-off with fairness across floors.
  - Prefer EV spots for electric cars, but let others use them when the lot is busy :: Capability flags on spots; assigner policy with a threshold; still one atomic claim.
- [failure] Two gates assign the same spot :: Check-then-act race; claim atomically (deque poll, lock per size, or CAS on spot state); occupy() still guards the invariant.
  - Now the lot spans 3 machines sharing a database :: Conditional update on the spot row (UPDATE … WHERE status = FREE) or a reservation table with a unique constraint.
- [variation] Pricing changes: weekends, events, monthly passes :: PricingStrategy per rule; calendar/composite strategy; passes as a separate entitlement check before pricing.
  - Prices change while a car is parked :: Snapshot the tariff on the ticket at entry, or price per time segment; state the policy.
- [deep] Display boards show free spots per floor in real time :: Observer on floors; push counts; listeners fast and isolated from failures.
- [variation] Trucks need several adjacent spots :: Rows and positions; contiguous-run allocation under a per-row lock; tickets hold several spots.
- [failure] A driver loses the ticket :: Plate lookup in active tickets; lost-ticket fee policy; audit.

=== d-lld-elevator
--- words
- **Car**: one elevator cabin. A building has a bank of cars.
- **Hall call**: a button pressed on a floor ("up" or "down"). **Car call**: a floor button pressed inside a car.
- **Dispatcher / scheduler**: the component that decides which car answers each hall call.
- **SCAN / LOOK**: the classic "keep going in one direction serving requests, then reverse" algorithm (LOOK reverses at the last request instead of the end of the shaft).
- **Direction**: up, down or idle; a car's state also includes whether its doors are open.
--- flow
1. **0–5**: clarify: number of cars and floors, hall and car calls, goals (short waits, fairness, energy), capacity/overload, emergency and maintenance modes. Simulation vs real hardware control.
2. **5–12**: entities: Building, ElevatorCar, Door, Request (HallCall, CarCall), Dispatcher, Direction and car state.
3. **12–17**: API: `callFromFloor(floor, dir)`, `pressInCar(carId, floor)`, `tick()` for simulation; sequence of a hall call.
4. **17–35**: code the dispatcher strategy and one car's stop-ordering (LOOK).
5. **35–45**: concurrency of button presses, peak-time strategies, failures, tests.
--- req
**Actors**: passengers (hall and car buttons), the building controller, maintenance staff.

**Use cases**: request a car from a floor with a direction; choose a destination inside the car; cars move, stop, open and close doors; display car position; take a car out of service.

**Goals**: minimise average wait and travel time without starving far floors; never move with doors open; respect capacity.

**Out of scope**: motor control, physics, accessibility features (mention).
--- model
- `Building`: floors, cars, `Dispatcher`.
- `ElevatorCar`: id, current floor, `Direction`, `CarState` (Idle, MovingUp, MovingDown, DoorsOpen, Maintenance), its set of stops (`TreeSet<Integer>` up-stops and down-stops), `Door`.
- `Request`: `HallCall(floor, direction)` and `CarCall(car, floor)` (records).
- `Dispatcher` (interface / strategy): `assign(HallCall, List<CarStatus>) → car`.
- `CarController` per car: applies stops and runs the LOOK loop each tick.
--- patterns
- **Strategy** for dispatching (nearest car, least-loaded, zone-based for peak hours) and possibly for stop ordering.
- **State** for the car (and the door): each state handles events like `arrive`, `doorTimeout`, `emergency` differently.
- **Observer** for floor displays and monitoring.
- **Command** if requests are queued, logged and replayed for simulation.
--- code
```java
final class ElevatorCar {
  private int floor; private Direction dir = Direction.IDLE;
  private final TreeSet<Integer> up = new TreeSet<>(), down = new TreeSet<>();

  synchronized void addStop(int f) { if (f > floor) up.add(f); else if (f < floor) down.add(f); else openDoors(); }

  synchronized void step() {                         // one tick of the LOOK algorithm
    if (dir == Direction.IDLE) dir = !up.isEmpty() ? Direction.UP : !down.isEmpty() ? Direction.DOWN : Direction.IDLE;
    if (dir == Direction.UP) {
      floor++;
      if (up.remove(floor)) openDoors();
      if (up.isEmpty()) dir = down.isEmpty() ? Direction.IDLE : Direction.DOWN;   // reverse at the last request
    } else if (dir == Direction.DOWN) {
      floor--;
      if (down.remove(floor)) openDoors();
      if (down.isEmpty()) dir = up.isEmpty() ? Direction.IDLE : Direction.UP;
    }
  }
}

final class NearestSuitableCar implements Dispatcher {
  public ElevatorCar assign(HallCall c, List<ElevatorCar> cars) {
    return cars.stream().filter(ElevatorCar::inService)
        .min(Comparator.comparingInt(car -> car.costTo(c)))      // distance, plus a penalty if moving away
        .orElseThrow(NoCarAvailable::new);
  }
}
```
--- ext
**Concurrency**: buttons are pressed from many threads (or events); each car's stop sets are guarded by the car's lock (or each car runs on its own event loop receiving messages); the dispatcher reads a snapshot of car statuses.

**Extensions**: peak-hour zoning (cars dedicated to floor ranges in the morning rush), destination dispatch (passengers enter the destination in the lobby; group by destination), capacity and overload sensors (skip hall calls when full), emergency/fire mode (State), VIP or service floors.

**Tests**: LOOK order for a set of stops; no reversal while requests remain ahead; dispatcher picks the expected car for given statuses; doors never open while moving (state tests).
--- variants
Q: Destination dispatch: passengers choose their floor in the lobby.
A: Hall calls carry destinations; the dispatcher groups passengers with similar destinations into the same car and tells each which car to take; fewer stops per trip.
Q: Morning rush: everyone goes up from the lobby.
A: Zoning strategy: cars serve floor bands and return to the lobby when empty; switch strategies by time of day.
Q: A car breaks down mid-shaft.
A: Car enters Maintenance/Fault state; its pending hall calls are reassigned; car calls of passengers inside trigger an alarm workflow.
--- steer
Q: Which car answers a hall call?
A: A Dispatcher strategy using a cost (distance, direction, load); swappable per time of day.
Q: In what order does a car serve its stops?
A: LOOK: continue in the current direction serving stops, reverse at the last one.
Q: Buttons pressed simultaneously on many floors.
A: Per-car locks or a single event queue per car; dispatcher works on snapshots.
--- pitfalls
- Serving requests first-come-first-served (zig-zagging up and down)
- One giant Elevator class that also dispatches the whole building
- State held in booleans (isMoving, isDoorOpen) that can contradict
- Ignoring starvation of far floors under nearest-first dispatching
--- level
- **L4**: entities, a working single-car LOOK loop, simple nearest-car dispatch.
- **L5**: dispatcher as a strategy with a cost function, car states, concurrency of calls, starvation and peak-hour discussion, tests.
- **L6**: destination dispatch, simulation for comparing strategies with metrics (average wait, max wait), fault handling.
--- prereqs
behaviour-diagrams, strategy-template, observer-pattern, state-pattern
--- paths
- [deep] Which car should answer a hall call? :: Dispatcher strategy with a cost: distance, direction, load; ties broken deterministically.
  - The nearest car is moving away from the caller :: Penalise opposite direction; estimate time to arrive including existing stops.
  - Some floors wait minutes during peak hours :: Starvation: add waiting time to the cost (aging) or zone the cars.
- [deep] In what order does a car serve its stops? :: LOOK with up/down sorted sets; reverse at the last request.
- [variation] Morning rush or destination dispatch :: Time-based strategy switching; destination dispatch groups passengers.
- [failure] A car stops working between floors :: Fault state; reassign hall calls; alarm; passengers' car calls preserved.
- [deep] Doors must never open while moving :: Car and door state machines; illegal transitions rejected; tests per (state, event).
- [failure] Many buttons pressed at the same time :: Per-car lock or per-car event queue; dispatcher uses consistent snapshots.

=== d-lld-vending-machine
--- words
- **Slot**: a numbered position holding one product with a price and a count.
- **Balance**: money inserted in the current session.
- **Change-making**: returning the difference using the coins available in the machine.
- **State**: the machine's mode (idle, has money, dispensing, sold out, maintenance) that changes how buttons behave.
--- flow
1. **0–5**: clarify: payment types (coins, notes, cards), one item per session or several, exact change, refunds, restocking.
2. **5–12**: entities: VendingMachine, Slot, Product, Coin enum, Inventory, CoinBank/ChangeMaker, states.
3. **12–17**: draw the state diagram: Idle → HasMoney → Dispensing → Idle / SoldOut; events insert, select, cancel, restock.
4. **17–35**: code the state classes and the machine delegating to them; change-making.
5. **35–45**: concurrent button presses, card payments, maintenance mode, tests per (state, event).
--- req
**Use cases**: insert coins/notes; select a product; get the product and change; cancel and get a refund; operator restocks and collects cash; display messages ("insert money", "sold out", "exact change only").

**Rules**: dispense only if balance ≥ price and the item is in stock; return change with available coins or refuse the sale ("exact change only"); refunds return exactly what was inserted.
--- model
- `VendingMachine` (context): current `VendingState`, `Inventory` (slots), balance, `CoinBank`, `Display`.
- `Slot(code, Product, count)`, `Product(name, Money price)`.
- `Coin` enum with values; `CoinBank` holds coin counts and `makeChange(amount) → Optional<List<Coin>>`.
- `VendingState` interface: `insert`, `select`, `cancel`, `restock`; implementations `Idle`, `HasMoney`, `SoldOut`, `Maintenance`.
--- patterns
- **State**: each state class handles every event; transitions are explicit returns.
- **Strategy** for payment (coins, card) if several methods exist: `PaymentMethod.authorize(amount)`.
- **Greedy or DP change-making** behind a `ChangeMaker` strategy (greedy works for canonical coin systems, DP for arbitrary ones).
--- code
```java
interface VendingState {
  VendingState insert(Machine m, Coin c);
  VendingState select(Machine m, String code);
  VendingState cancel(Machine m);
}
enum States implements VendingState {
  IDLE {
    public VendingState insert(Machine m, Coin c) { m.addBalance(c); return HAS_MONEY; }
    public VendingState select(Machine m, String code) { m.show("Insert money first"); return this; }
    public VendingState cancel(Machine m) { return this; }
  },
  HAS_MONEY {
    public VendingState insert(Machine m, Coin c) { m.addBalance(c); return this; }
    public VendingState select(Machine m, String code) {
      Slot s = m.slot(code);
      if (s.isEmpty()) { m.show("Sold out"); return this; }
      if (m.balance().lessThan(s.price())) { m.show("Need " + s.price().minus(m.balance())); return this; }
      Optional<List<Coin>> change = m.bank().makeChange(m.balance().minus(s.price()));
      if (change.isEmpty()) { m.show("Exact change only"); return this; }
      m.dispense(s); m.returnCoins(change.get()); m.resetBalance();
      return m.anyStock() ? IDLE : SOLD_OUT;
    }
    public VendingState cancel(Machine m) { m.refundInserted(); return IDLE; }
  },
  SOLD_OUT { /* insert → refund immediately; select → "Sold out"; restock → IDLE */ };
}

final class Machine {
  private VendingState state = States.IDLE;
  public synchronized void insert(Coin c)      { state = state.insert(this, c); }
  public synchronized void select(String code) { state = state.select(this, code); }
  public synchronized void cancel()            { state = state.cancel(this); }
}
```
--- ext
**Concurrency**: one physical machine usually has one input at a time, but if events come from several sources (keypad, card reader, network), synchronise the context's event methods or process events on one thread.

**Extensions**: card payments (an authorisation step and a Dispensing state that refunds if the motor fails), multi-item sessions, promotions, telemetry (observer for stock levels → restock alerts), maintenance mode.

**Tests**: table-driven over (state, event): select in Idle shows a message; exact payment dispenses; overpayment returns correct change; no change available refuses the sale; cancel refunds exactly the inserted coins; sold-out transitions.
--- variants
Q: Accept cards and mobile payments too.
A: PaymentMethod strategy; card flow authorises the price first, then dispenses, then captures; on dispense failure, void the authorisation.
Q: The machine can't make change for a 500 note.
A: ChangeMaker returns empty; show "exact change only" before accepting large notes (check feasible change up front).
Q: Dispensing motor jams.
A: Dispensing state with a sensor confirmation; on failure refund and mark the slot faulty.
--- steer
Q: What does "select" do when no money is inserted?
A: Depends on state: Idle shows "insert money"; state pattern makes this explicit.
Q: Return change with limited coins.
A: CoinBank with counts; greedy for canonical coins, DP otherwise; refuse sale if impossible.
Q: Add a maintenance mode.
A: A new state class; operator events in and out.
--- pitfalls
- Flags like isIdle, hasMoney, isDispensing that can contradict
- Dispensing before confirming change can be made
- Refunding a computed amount instead of the coins actually inserted
- Forgetting the sold-out and maintenance states
--- level
- **L4**: state diagram, basic states, select/insert/cancel working.
- **L5**: state pattern with complete (state, event) handling, change-making with limited coins, payment strategy, concurrency of inputs, table-driven tests.
- **L6**: hardware failure handling, telemetry and remote management, multi-currency.
--- prereqs
behaviour-diagrams, encapsulation, strategy-template, state-pattern
--- paths
- [deep] What happens on each button in each state? :: State pattern; every (state, event) handled; transitions returned explicitly.
  - Add a maintenance mode :: New state class; operator events; other states unchanged.
- [deep] Returning change with a limited coin supply :: CoinBank counts; greedy vs DP; refuse sale when impossible; check before accepting big notes.
- [variation] Accept card payments :: PaymentMethod strategy; authorise, dispense, capture; void on failure.
  - The card network is slow or down :: Timeout, show message, fall back to cash; never dispense before authorisation.
- [failure] The motor jams while dispensing :: Dispensing state with sensor confirmation; refund; mark slot faulty; alert operator.
- [deep] How do you test it? :: Table-driven tests over (state, event) with expected next state and side effects.

=== d-lld-splitwise
--- words
- **Expense**: a payment by one person shared among several.
- **Split type**: how an expense is divided: equally, by exact amounts, by percentages, by shares.
- **Balance**: what each person owes or is owed overall.
- **Settle up / simplify debts**: reducing the number of payments needed to clear all balances.
- **Minor units**: storing money as integer paise/cents to avoid rounding errors.
--- flow
1. **0–5**: clarify: groups and individual expenses, split types, currencies, settling, simplify debts, activity history.
2. **5–12**: entities: User, Group, Expense, Split (sealed variants), BalanceSheet, SplitStrategy.
3. **12–17**: API: `addExpense(paidBy, amount, participants, splitSpec)`, `balances(user)`, `settle(from, to, amount)`, `simplify(group)`.
4. **17–35**: code split validation and computation with exact rounding, balance updates.
5. **35–45**: simplify-debts algorithm, concurrency of edits, editing/deleting expenses, currencies.
--- req
**Use cases**: add an expense paid by one user for several; split equally/exact/percent/shares; see who owes whom; record a settlement; simplify group debts; edit or delete an expense (balances update).

**Rules**: splits must add up to the total exactly (to the paisa); percentages sum to 100; leftover paisa from equal splits assigned deterministically; one currency per group (or convert explicitly).
--- model
- `User`, `Group(members)`.
- `Expense(id, paidBy, Money total, List<Share> shares, createdAt, description)`.
- `SplitSpec` sealed: `Equal(participants)`, `Exact(Map<User, Money>)`, `Percent(Map<User, Integer>)`, `Shares(Map<User, Integer>)`.
- `SplitStrategy` per spec type: `validate(total, spec)`, `shares(total, spec) → List<Share>`.
- `BalanceSheet`: net balance per user (and per pair), updated by expenses and settlements.
--- patterns
- **Strategy** for split types (one class per type; adding "split by item" is a new class).
- **Sealed types + records** for split specs (modelling-data).
- **Command / event log**: expenses and settlements as events; balances derived (supports edit/delete by reversing).
- **Observer** for notifications ("Alice added an expense").
--- code
```java
final class EqualSplit implements SplitStrategy<Equal> {
  public List<Share> shares(Money total, Equal spec) {
    List<User> ps = spec.participants();
    long each = total.minorUnits() / ps.size(), rem = total.minorUnits() % ps.size();
    List<Share> out = new ArrayList<>();
    for (int i = 0; i < ps.size(); i++)                         // first `rem` people pay one extra paisa
      out.add(new Share(ps.get(i), Money.ofMinor(each + (i < rem ? 1 : 0), total.currency())));
    return out;
  }
}

final class Ledger {
  private final Map<UserId, Long> net = new HashMap<>();        // + is owed money, − owes money
  synchronized void apply(Expense e) {
    net.merge(e.paidBy(), e.total().minorUnits(), Long::sum);
    for (Share s : e.shares()) net.merge(s.user(), -s.amount().minorUnits(), Long::sum);
  }
  synchronized void reverse(Expense e) { /* the opposite of apply: used for edit and delete */ }
}

// simplify: greedy match of largest creditor with largest debtor
List<Payment> simplify(Map<UserId, Long> net) {
  PriorityQueue<Map.Entry<UserId, Long>> cred = maxHeap(positive(net)), debt = maxHeap(negatedNegative(net));
  List<Payment> out = new ArrayList<>();
  while (!cred.isEmpty()) {
    var c = cred.poll(); var d = debt.poll();
    long x = Math.min(c.getValue(), d.getValue());
    out.add(new Payment(d.getKey(), c.getKey(), x));
    if (c.getValue() > x) cred.add(Map.entry(c.getKey(), c.getValue() - x));
    if (d.getValue() > x) debt.add(Map.entry(d.getKey(), d.getValue() - x));
  }
  return out;
}
```
--- ext
**Concurrency**: two members adding expenses at once must not lose balance updates: synchronise ledger updates per group (or store expenses and derive balances).

**Extensions**: multiple currencies (convert at a recorded rate per expense), recurring expenses, receipts with item-level splits, activity feed, editing expenses (reverse then apply).

**Simplify debts**: greedy largest-creditor/largest-debtor gives at most n−1 payments; the true minimum is NP-hard in general (subset-sum flavour), so state the trade-off.

**Tests**: equal split of ₹100 three ways = 33.34 + 33.33 + 33.33; percent splits that don't sum to 100 rejected; balances sum to zero after any sequence; simplify preserves every net balance.
--- variants
Q: Split by items on a restaurant bill.
A: An ItemSplit spec: each item assigned to people; tax and tip distributed proportionally; still sums exactly via an allocation step.
Q: Multi-currency group trip.
A: Each expense keeps its currency and the rate used; balances shown per currency or converted at a chosen rate; settlements record currency.
Q: Edit an expense from last week.
A: Reverse the old expense's effect and apply the new one in one ledger transaction; keep history for audit.
--- steer
Q: ₹100 split three ways?
A: Integer minor units with remainder allocation; totals always exact.
Q: Add a new split type.
A: New SplitStrategy (and spec record); nothing else changes.
Q: Minimise the number of settlements.
A: Net balances, then greedy matching; mention the exact problem is NP-hard.
--- pitfalls
- double for money and splits that don't add up exactly
- Storing pairwise debts without netting, making simplification and edits error-prone
- Split logic in a switch inside the Expense class
- Updating balances without synchronisation when several users add expenses at once
--- level
- **L4**: entities, equal/exact/percent splits, balances.
- **L5**: exact money handling with remainder allocation, split strategies, balance invariants (sum to zero), simplify-debts with complexity discussion, edits via reversal, concurrency.
- **L6**: event-sourced ledger, multi-currency, scaling to a service with per-group partitioning.
--- prereqs
ood-requirements, srp-ocp, strategy-template, modelling-data
--- paths
- [deep] Split ₹100 equally among three people :: Minor units; remainder paisa allocated deterministically; shares sum exactly.
  - Percent splits like 33.33% each :: Compute in minor units with an allocation step; validate sum = 100%.
- [deep] Who owes whom, with the fewest payments? :: Net balances; greedy max-creditor vs max-debtor; at most n−1 payments; exact minimum NP-hard.
- [variation] Add split by items with tax and tip :: New SplitStrategy; proportional distribution of tax/tip; exact allocation.
- [variation] Editing or deleting an old expense :: Reverse then re-apply in one ledger transaction; audit history.
  - Two people edit the same expense at once :: Version field with optimistic concurrency; second edit gets a conflict.
- [failure] Balances drift and no longer sum to zero :: Invariant check; derive balances from the expense log; rounding bug hunt.

=== d-lld-lru-concurrent
--- words
- **Cache**: a fast, limited store that keeps recently or frequently used values to avoid recomputing or refetching them.
- **Eviction policy**: the rule for which entry to drop when full: LRU (least recently used), LFU (least frequently used), FIFO.
- **TTL (time to live)**: how long an entry stays valid.
- **Hit / miss**: found in the cache / not found.
- **Loader**: the function that computes or fetches a value on a miss.
- **Stampede**: many threads missing the same key at once and all calling the loader.
--- flow
1. **0–5**: clarify: capacity (entries or bytes), eviction policies, TTL, loader on miss, thread safety, metrics.
2. **5–12**: API: `get(k)`, `put(k, v)`, `get(k, loader)`, `invalidate(k)`; classes Cache, EvictionPolicy, Entry, Clock.
3. **12–30**: code LRU in O(1) with a hash map and a doubly linked list; TTL checks.
4. **30–45**: thread safety (one lock, then sharding), stampede protection, LFU, metrics, tests.
--- req
**Use cases**: get a value; put a value; compute on miss with a loader; expire entries after a TTL; evict when over capacity by a chosen policy; report hit rate.

**Non-functional**: O(1) get and put; safe under many threads; no duplicate loads for the same key at the same time; bounded memory.
--- model
- `Cache<K, V>` interface; `LocalCache<K, V>` implementation.
- `Entry<K, V>`: key, value, expiresAt, prev/next links (for LRU).
- `EvictionPolicy<K>` strategy: `onAccess`, `onInsert`, `onRemove`, `victim()`: LRU, LFU, FIFO.
- `Clock` injected for TTL; `CacheStats` (hits, misses, evictions, load time).
--- patterns
- **Strategy** for eviction (LRU, LFU, FIFO) and possibly for expiry.
- **Decorator / proxy** to add caching around a repository (`CachingUserRepository`).
- **Builder** for configuration (capacity, TTL, policy, stats on/off).
- **Observer** (removal listener) for evicted entries.
--- code
```java
final class LruCache<K, V> {
  private final int capacity; private final Clock clock; private final Duration ttl;
  private final Map<K, Node<K, V>> map = new HashMap<>();
  private final Node<K, V> head = new Node<>(), tail = new Node<>();   // sentinels; head.next = most recent
  private final ReentrantLock lock = new ReentrantLock();

  Optional<V> get(K k) {
    lock.lock();
    try {
      Node<K, V> n = map.get(k);
      if (n == null) return Optional.empty();
      if (clock.instant().isAfter(n.expiresAt)) { unlink(n); map.remove(k); return Optional.empty(); }
      moveToFront(n);
      return Optional.of(n.value);
    } finally { lock.unlock(); }
  }

  void put(K k, V v) {
    lock.lock();
    try {
      Node<K, V> n = map.get(k);
      if (n != null) { n.value = v; n.expiresAt = clock.instant().plus(ttl); moveToFront(n); return; }
      if (map.size() == capacity) { Node<K, V> lru = tail.prev; unlink(lru); map.remove(lru.key); }
      n = new Node<>(k, v, clock.instant().plus(ttl));
      map.put(k, n); addFront(n);
    } finally { lock.unlock(); }
  }
}
```
--- ext
**Concurrency**: every `get` reorders the list, so even reads need the lock; to scale, shard into N independent caches by key hash (each with its own lock), or use approximate LRU (sampled eviction, buffered access recording like Caffeine).

**Stampede**: `get(k, loader)` stores a `CompletableFuture` placeholder via `computeIfAbsent` so concurrent missers share one load; failed loads are removed so they can be retried.

**LFU in O(1)**: map key → node with frequency; map frequency → linked set; track minFreq.

**Tests**: eviction order with capacity 2; TTL expiry with a fake clock; concurrent gets/puts never exceed capacity; a slow loader runs once for 50 concurrent missers.
--- variants
Q: Evict by memory size, not entry count.
A: A weigher function per entry; track total weight; evict until under budget.
Q: Make it a distributed cache.
A: HLD question: consistent hashing across nodes, replication, invalidation; this class becomes the per-node store.
Q: Refresh popular entries before they expire.
A: Refresh-ahead: on access near expiry, trigger an async reload while serving the old value.
--- steer
Q: O(1) LRU?
A: Hash map + doubly linked list with sentinels; move-to-front on access.
Q: Make it thread-safe.
A: One lock (reads reorder too), then sharding by key; justify.
Q: 100 threads miss the same key.
A: Single-flight loading via computeIfAbsent with a future placeholder.
--- pitfalls
- Using a read-write lock when every get mutates the LRU order
- LinkedHashMap without synchronisation shared across threads
- Loading the same key many times concurrently
- Ignoring TTL checks on read (serving expired values until cleanup)
--- level
- **L4**: O(1) LRU with map + list; basic TTL.
- **L5**: pluggable eviction strategy, thread safety with justified locking and sharding, stampede protection, tests with fake clock and concurrency.
- **L6**: approximate policies (W-TinyLFU), memory-based weighing, observability, distributed extension.
--- prereqs
strategy-template, decorator-proxy, locks, concurrent-collections
--- paths
- [deep] Implement get and put in O(1) :: Hash map to nodes + doubly linked list with sentinels; move to front; evict tail.
  - Support LFU too :: Frequency buckets with minFreq; EvictionPolicy strategy.
- [failure] Many threads use the cache concurrently :: Single lock first (reads mutate order); then sharded caches; why RW locks don't help.
  - The single lock is a bottleneck at 1M ops/s :: Sharding by key hash; approximate LRU with buffered access events.
- [failure] A popular key expires and 500 requests miss at once :: Single-flight loads with a future placeholder; remove failed loads.
- [variation] Entries have different sizes :: Weigher; evict by total weight.
- [deep] Entries must expire after 10 minutes :: TTL stored per entry; check on read; optional background sweep; fake clock in tests.

=== d-lld-rate-limiter-lld
--- words
- **Rate limit**: a maximum number of requests allowed per key (user, IP, API key) in a time period.
- **Token bucket**: a bucket that refills tokens at a steady rate up to a capacity; each request spends a token; allows short bursts.
- **Fixed window**: count requests per calendar window (per minute); simple, bursty at window edges.
- **Sliding window log / counter**: count over the last N seconds exactly (log of timestamps) or approximately (two weighted windows).
- **Key**: what the limit applies to (user id, IP, API key, endpoint).
--- flow
1. **0–5**: clarify: in-process library or shared service, limits per key and per endpoint, algorithms required, behaviour when limited (reject vs wait), thread safety.
2. **5–12**: API: `tryAcquire(key)`, `acquire(key, timeout)`; classes RateLimiter, Algorithm strategy, LimitConfig, Clock.
3. **12–30**: code a token bucket with lazy refill, thread-safe per key.
4. **30–45**: other algorithms, memory for millions of keys, distributed limits, tests.
--- req
**Use cases**: check whether a request for a key is allowed now; configure limits per key class; optionally block until allowed (with timeout); report remaining quota.

**Non-functional**: O(1) per call, no background thread per key, safe from many threads, bounded memory for idle keys, testable without sleeping.
--- model
- `RateLimiter` (facade): `tryAcquire(key)`, holds a `ConcurrentHashMap<String, Limiter>`.
- `Limiter` strategy per algorithm: `TokenBucket`, `FixedWindow`, `SlidingWindowLog`, `SlidingWindowCounter`.
- `LimitConfig(capacity, refillPerSecond, window)`; `Clock` injected.
- `Decision(allowed, remaining, retryAfter)` returned for headers.
--- patterns
- **Strategy** for algorithms; **factory** to create a limiter for a key class from config.
- **Decorator / chain** to apply limits around a service or in a middleware pipeline.
- **Immutable state + CAS** for lock-free per-key updates.
--- code
```java
final class TokenBucket implements Limiter {
  private record State(double tokens, long lastNanos) {}
  private final AtomicReference<State> state;
  private final double capacity, perNano; private final LongSupplier nanos;

  TokenBucket(double capacity, double perSecond, LongSupplier nanos) {
    this.capacity = capacity; this.perNano = perSecond / 1e9; this.nanos = nanos;
    state = new AtomicReference<>(new State(capacity, nanos.getAsLong()));
  }
  public boolean tryAcquire() {
    while (true) {
      State s = state.get(); long now = nanos.getAsLong();
      double tokens = Math.min(capacity, s.tokens() + (now - s.lastNanos()) * perNano);   // lazy refill
      if (tokens < 1) return false;
      if (state.compareAndSet(s, new State(tokens - 1, now))) return true;              // retry on contention
    }
  }
}

final class RateLimiter {
  private final ConcurrentHashMap<String, Limiter> byKey = new ConcurrentHashMap<>();
  boolean tryAcquire(String key) { return byKey.computeIfAbsent(key, k -> factory.create(configFor(k))).tryAcquire(); }
}
```
--- ext
**Concurrency**: per-key state changes atomically (CAS on an immutable record, or a small lock per key); the key map is a `ConcurrentHashMap`.

**Memory**: millions of keys: evict idle limiters (last-access time, periodic sweep, or a bounded cache).

**Distributed**: a limit shared across servers needs shared state (Redis with an atomic script, or local limits = global/N with periodic rebalancing): the HLD rate-limiter question.

**Tests**: fake nanos supplier: burst of capacity allowed, next denied, refill after 1/rate seconds; 100 threads × 100 calls never exceed capacity + refill.
--- variants
Q: Limit per user AND per endpoint AND globally.
A: Several limiters checked in order (a chain); all must allow; consume tokens only if all allow (or refund on partial failure).
Q: Instead of rejecting, delay requests until allowed.
A: acquire(key, timeout) computes the wait from the deficit and sleeps (or schedules), bounded by the timeout.
Q: Share limits across 50 servers.
A: Central store with atomic operations, or approximate local limits; discuss accuracy vs latency.
--- steer
Q: Which algorithm and why?
A: Token bucket for smooth limits with bursts; sliding window counter for accurate per-minute quotas; fixed window when simplicity wins.
Q: Make it thread-safe without a global lock.
A: Per-key state with CAS or a per-key lock; ConcurrentHashMap for keys.
Q: Millions of idle keys.
A: Expire idle limiters; bounded cache.
--- pitfalls
- A background thread per key to refill tokens
- Check-then-act on counters without atomicity
- Using wall-clock time and Thread.sleep in tests
- Fixed windows without mentioning the edge burst (2× limit across a boundary)
--- level
- **L4**: one algorithm per key with a lock.
- **L5**: strategies for algorithms, lazy refill, lock-free or per-key locking, idle-key eviction, fake-clock tests, response headers.
- **L6**: hierarchical/multi-dimensional limits, distributed coordination trade-offs, fairness.
--- prereqs
strategy-template, library-api, atomics-cas, concurrent-collections
--- paths
- [deep] Choose and implement the algorithm :: Token bucket with lazy refill; compare fixed window, sliding log, sliding counter.
  - Fixed window lets 2× the limit through at the boundary :: Explain the edge burst; sliding window counter fixes it cheaply.
- [failure] Thousands of threads call tryAcquire for the same key :: CAS on immutable state or a per-key lock; no global lock.
- [failure] Memory grows with millions of keys :: Evict idle limiters by last access; bounded cache.
- [variation] Limits per user, per endpoint and global at once :: Chain of limiters; all-or-nothing consumption.
- [variation] The limit must hold across 50 servers :: Shared atomic store vs local approximations; latency vs accuracy.
- [deep] How do you test it? :: Injected nanos clock; boundaries; concurrent stress counting successes.

=== d-lld-logger
--- words
- **Log level**: severity of a message: TRACE, DEBUG, INFO, WARN, ERROR.
- **Appender (sink)**: where log events go: console, file, rolling file, network.
- **Formatter / layout**: turns an event into text or JSON.
- **Logger hierarchy**: loggers named by dotted paths (`com.app.orders`) inheriting levels and appenders from parents.
- **Asynchronous logging**: request threads enqueue events; a background thread writes them.
--- flow
1. **0–5**: clarify: levels, multiple destinations, per-package levels, formats (text/JSON), async, rolling files, thread safety.
2. **5–12**: classes: LoggerFactory, Logger (hierarchy), LogEvent, Level, Appender, Formatter, Filter.
3. **12–30**: code: level check, event creation, appender chain, async appender with a bounded queue.
4. **30–45**: performance (avoid building strings when disabled), rolling files, failures of a sink, configuration reload, tests.
--- req
**Use cases**: `log.info("order {} placed", id)`; set levels per logger name; send events to several appenders with different formats; rotate files by size/time; switch to async; reload config at run time.

**Non-functional**: almost zero cost when a level is disabled; never block or crash the application because of logging; thread-safe; ordered output per thread.
--- model
- `LoggerFactory.getLogger(name)` returns cached `Logger`s arranged in a tree by name.
- `Logger`: name, effective level (own or inherited), appenders (own + parents' unless additivity off).
- `LogEvent` (immutable): time, level, logger name, thread, message template, arguments, throwable, MDC context.
- `Appender` interface: `append(LogEvent)`; `ConsoleAppender`, `FileAppender`, `RollingFileAppender`, `AsyncAppender` (decorator).
- `Formatter` interface: `PatternFormatter`, `JsonFormatter`. `Filter` interface (level or marker based).
--- patterns
- **Chain of responsibility / hierarchy**: events bubble from a logger to its ancestors' appenders.
- **Strategy** for formatters and filters; **decorator** for `AsyncAppender` wrapping any appender.
- **Factory + flyweight-style caching** for loggers by name; **singleton-scoped** configuration (one per process, but injected).
- **Observer** for config reload.
--- code
```java
final class Logger {
  private final String name; private final Logger parent;
  private volatile Level level;                                  // null = inherit
  private final List<Appender> appenders = new CopyOnWriteArrayList<>();

  public void info(String template, Object... args) { log(Level.INFO, template, args, null); }

  private void log(Level lvl, String template, Object[] args, Throwable t) {
    if (!isEnabled(lvl)) return;                                  // cheap check first; no string building
    LogEvent e = new LogEvent(clock.instant(), lvl, name, Thread.currentThread().getName(), template, args, t, Mdc.copy());
    for (Logger l = this; l != null; l = l.additive ? l.parent : null)
      for (Appender a : l.appenders) a.append(e);                // each appender formats as it likes
  }
  boolean isEnabled(Level lvl) { return lvl.compareTo(effectiveLevel()) >= 0; }
}

final class AsyncAppender implements Appender {
  private final BlockingQueue<LogEvent> q = new ArrayBlockingQueue<>(10_000);
  private final AtomicLong dropped = new AtomicLong();
  public void append(LogEvent e) { if (!q.offer(e)) dropped.incrementAndGet(); }     // never block the app
  // worker thread: take(), drainTo(batch), inner.append(...) for each, flush per batch
}
```
--- ext
**Concurrency**: appenders shared by many threads must serialise writes (a lock in `FileAppender`, or a single writer thread behind `AsyncAppender`); `CopyOnWriteArrayList` for appender lists (rare changes); volatile levels for run-time changes.

**Failures**: a full disk or a dead network sink must not crash the app: catch, count, fall back (console), and report; async queue drops low levels first when full.

**Performance**: parameterised messages (format only if enabled), lazy suppliers for expensive arguments, batching in async writers.

**Tests**: a recording appender; level inheritance; additivity; async drop counting under a slow sink; formatter output.
--- variants
Q: Structured JSON logs with a request id on every line.
A: JsonFormatter plus MDC (thread-local context) copied into each event; propagate across async boundaries.
Q: Ship logs to a central system.
A: A network appender behind the async decorator with batching, retries and back-off; or write files and let an agent ship them.
Q: Change levels at run time without restart.
A: Volatile level fields updated by a config watcher (observer); effective levels recomputed for the subtree.
--- steer
Q: Logging must never slow requests.
A: Async appender with a bounded queue, offer() and drop counting.
Q: Different levels per package.
A: Logger hierarchy by name with inherited levels.
Q: Avoid cost when DEBUG is off.
A: Level check before building events; parameterised templates.
--- pitfalls
- String concatenation before checking the level
- Synchronous network appenders on request threads
- Unbounded async queues
- Logging failures propagating exceptions into business code
--- level
- **L4**: Logger with levels and multiple appenders.
- **L5**: hierarchy and inheritance, strategies for format/filters, async decorator with bounded queue and drop policy, thread safety, failure isolation.
- **L6**: MDC propagation, structured logging, run-time config, back-pressure policies per level, shipping pipeline.
--- prereqs
dip-di, factory-patterns, singleton-pool, decorator-proxy, chain-of-responsibility
--- paths
- [deep] How does an event reach its destinations? :: Logger hierarchy; effective level; appenders up the tree (additivity).
  - DEBUG only for one package :: Per-logger level overrides inherited from parents.
- [deep] Logging must not slow down requests :: Async appender decorator; bounded queue; offer + drop counter; batching writer thread.
  - The disk is slow and the queue fills :: Drop TRACE/DEBUG first; count drops; never block; alert.
- [variation] JSON logs with request ids :: JsonFormatter; MDC context copied into events; propagate across threads.
- [failure] The log file's disk is full :: Catch in the appender; fallback sink; error counter; app keeps running.
- [deep] Cost when the level is disabled :: Early level check; parameterised messages; lazy suppliers.

=== d-lld-file-system
--- words
- **Path**: a location like `/a/b/c.txt`, split into components by "/".
- **Directory (folder)** and **file** nodes in a tree.
- **Composite**: a pattern where files and directories share an interface so tree operations are recursive.
- **Path resolution**: walking from the root through each component to find a node.
- **mkdir -p**: create a directory and any missing parents.
--- flow
1. **0–5**: clarify: operations (mkdir, ls, create/write/read, delete, move, size, find), in-memory only, permissions, concurrency, sorting of ls.
2. **5–12**: classes: FileSystem (facade), Node (sealed: File, Directory), Path value object, PathResolver.
3. **12–30**: code path resolution, mkdir -p, write/read, ls sorted, size recursion.
4. **30–45**: move with cycle check, delete, find by pattern, concurrency, permissions.
--- req
**Use cases**: `mkdir(path)` (with parents); `ls(path)` sorted names (a file path lists itself); `write(path, data)` / `append`; `read(path)`; `rm(path, recursive)`; `mv(src, dst)`; `size(path)`; `find(path, predicate)`.

**Rules**: names unique within a directory; moving a directory into its own subtree is rejected; deleting a non-empty directory needs recursive.
--- model
- `FileSystem` facade over a root `Directory`.
- `sealed interface Node permits File, Directory` with `name()`, `parent()`, `size()`.
- `File`: content (byte array or a rope), timestamps. `Directory`: `TreeMap<String, Node>` children (sorted ls).
- `Path` value object: parsed components, `parent()`, `name()`.
- Optional `Permissions` (owner, mode) checked by a protection proxy.
--- patterns
- **Composite**: `size()`, `find()`, `delete()` recurse through directories.
- **Facade**: `FileSystem` hides tree navigation.
- **Visitor** (or sealed switch) for operations like `du`, search, export.
- **Proxy** for permission checks; **iterator** for lazy `find` over huge trees.
--- code
```java
final class FileSystem {
  private final Directory root = new Directory("", null);
  private final ReentrantReadWriteLock rw = new ReentrantReadWriteLock();

  void mkdir(String p) {
    rw.writeLock().lock();
    try {
      Directory d = root;
      for (String part : Path.of(p).parts()) {
        Node n = d.child(part);
        if (n == null) { Directory nd = new Directory(part, d); d.add(nd); d = nd; }
        else if (n instanceof Directory dir) d = dir;
        else throw new NotADirectory(part);
      }
    } finally { rw.writeLock().unlock(); }
  }

  List<String> ls(String p) {
    rw.readLock().lock();
    try {
      return switch (resolve(Path.of(p))) {
        case File f -> List.of(f.name());
        case Directory d -> List.copyOf(d.childNames());          // TreeMap keys: already sorted
      };
    } finally { rw.readLock().unlock(); }
  }

  void mv(String src, String dst) {
    rw.writeLock().lock();
    try {
      Node n = resolve(Path.of(src)); Directory target = (Directory) resolve(Path.of(dst).parent());
      for (Directory a = target; a != null; a = a.parent())
        if (a == n) throw new IllegalArgumentException("cannot move a directory into itself");
      if (target.child(Path.of(dst).name()) != null) throw new AlreadyExists(dst);
      n.parent().remove(n.name()); n.rename(Path.of(dst).name()); target.add(n);
    } finally { rw.writeLock().unlock(); }
  }
}
```
--- ext
**Concurrency**: a read-write lock over the tree is simple and correct (reads dominate); finer per-directory locks scale better but multi-directory operations (`mv`) then need ordered locking.

**Performance**: cache directory sizes, updating ancestors on change (O(depth)); `find` as a lazy iterator.

**Extensions**: permissions (proxy), symbolic links (cycle detection when resolving), file handles with offsets, quotas per directory, snapshots (copy-on-write trees).

**Tests**: mkdir -p creates parents; ls sorted; mv into own subtree rejected; rm non-empty without recursive fails; sizes after writes.
--- variants
Q: Support symbolic links.
A: A Link node with a target path; resolution follows links with a hop limit to detect cycles; ls shows links.
Q: Very large files with random writes.
A: Store file content in fixed-size blocks or a rope; writes touch only affected blocks.
Q: Snapshots of the whole tree.
A: Immutable nodes with structural sharing (copy-on-write paths); a snapshot is a root pointer.
--- steer
Q: How are files and folders modelled?
A: Composite with a sealed Node interface; directories hold sorted children.
Q: mv a folder into its own child.
A: Walk the destination's ancestors; reject if the source appears.
Q: Many threads reading and writing.
A: Read-write lock on the tree; ordered locks if finer-grained.
--- pitfalls
- instanceof checks scattered across every operation
- Leaf File objects with addChild methods that throw
- Forgetting cycle checks on move
- Unsorted ls when the spec asks for lexicographic order
--- level
- **L4**: tree of nodes, path resolution, mkdir/ls/read/write.
- **L5**: composite with sealed types, mv with cycle detection, recursive delete rules, read-write locking, cached sizes.
- **L6**: links, permissions via proxy, snapshots with structural sharing, block storage for big files.
--- prereqs
class-diagrams, encapsulation, polymorphism, composite-bridge-flyweight
--- paths
- [deep] Model files and directories :: Composite: sealed Node, File, Directory with sorted children; facade for paths.
  - size() is called constantly on huge trees :: Cache sizes per directory; update ancestors on writes.
- [deep] Implement mkdir -p and ls :: Walk components creating missing directories; ls returns sorted names or the file itself.
- [failure] Move a directory into its own subdirectory :: Ancestor walk; reject cycles; name clash rules.
- [variation] Add symbolic links :: Link nodes; resolution with hop limits.
- [failure] Concurrent mv and ls from many threads :: Read-write lock; ordered locks for multi-directory operations.
