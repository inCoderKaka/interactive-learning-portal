=== d-lld-payment-gateway
title: Payment processing library
topic: lld-quality
tier: 2
est: 45
prompt: Design the payment module of an e-commerce app: charge customers through several payment methods and providers, handle refunds, avoid double charges on retries, and keep a correct record of every payment's state.
--- words
- **Payment method**: card, UPI, wallet, net banking.
- **Provider (processor)**: the external company that moves the money (Stripe, Razorpay, Adyen).
- **Authorise / capture**: reserve money on a card, then actually take it (can be one step).
- **Idempotency key**: a unique id per payment attempt so retries don't charge twice.
- **Webhook**: the provider calling you back later with the final status.
--- flow
1. **0–5**: clarify: methods, providers and routing, auth-capture vs direct charge, refunds (full/partial), currencies, async confirmations (UPI), reconciliation.
2. **5–12**: classes: PaymentService, Payment (state machine), PaymentMethod (sealed), ProviderGateway (adapter), Router (strategy), IdempotencyStore, Ledger.
3. **12–30**: code the charge flow with idempotency, the state machine, provider adapters.
4. **30–45**: unknown outcomes and webhooks, refunds, failover between providers, reconciliation, tests.
--- req
**Use cases**: create a payment for an order; charge via a chosen method; handle success, decline and pending (async methods); receive webhooks; refund fully or partially; query status; retry safely.

**Rules**: never charge twice for the same order attempt; a payment's state only moves along allowed transitions; refunds never exceed the captured amount; every money movement is recorded.
--- model
- `Payment(id, orderId, Money amount, PaymentMethod method, PaymentStatus status, providerRef, refunds)`.
- `PaymentStatus`: CREATED → PENDING → SUCCEEDED / FAILED; SUCCEEDED → PARTIALLY_REFUNDED → REFUNDED.
- `PaymentMethod` sealed: `Card(token)`, `Upi(vpa)`, `Wallet(id)`.
- `ProviderGateway` interface (adapters per provider): `charge`, `refund`, `status(ref)`, parse webhooks.
- `ProviderRouter` strategy: choose provider by method, cost, health.
- `IdempotencyStore`: key → payment id/result.
- `PaymentService` (use cases), `LedgerWriter` (append-only records).
--- patterns
- **State** for the payment lifecycle; **strategy** for routing; **adapter** per provider; **facade** for the module API; **decorator** for retries/metrics around gateways; **observer** (PaymentSucceeded event) for order fulfilment.
--- code
```java
final class PaymentService {
  Payment charge(ChargeRequest r) {
    return idempotency.getOrCompute(r.idempotencyKey(), () -> {          // same key → same payment, no second charge
      Payment p = Payment.create(ids.next(), r.orderId(), r.amount(), r.method());
      repo.save(p);
      ProviderGateway gw = router.choose(r.method(), r.amount());
      p.markPending(gw.name());
      repo.save(p);
      ProviderResult res = gw.charge(p.id(), r.amount(), r.method());   // provider also gets p.id() as its idempotency key
      switch (res) {
        case Succeeded s -> p.succeed(s.ref());
        case Declined d  -> p.fail(d.reason());
        case Pending pd  -> p.awaitConfirmation(pd.ref());              // webhook will finish it
      }
      repo.save(p); ledger.record(p);
      return p;
    });
  }

  void onWebhook(ProviderEvent e) {
    Payment p = repo.byProviderRef(e.ref());
    if (p.status().isFinal()) return;                                  // duplicates and late events are harmless
    if (e.succeeded()) p.succeed(e.ref()); else p.fail(e.reason());
    repo.save(p); ledger.record(p); events.publish(new PaymentSettled(p.id(), p.status()));
  }
}
```
--- ext
**Unknown outcomes**: a timeout from the provider doesn't mean failure: mark UNKNOWN/PENDING, query status by our id (the provider's idempotency), and reconcile; never retry with a new key.

**Failover**: route to a second provider only when the first definitely didn't charge (declined before reaching the bank, or provider down at connect); otherwise risk double charges.

**Refunds**: a `Refund` entity with its own idempotency key and states; sum of refunds ≤ captured.

**Reconciliation**: a daily job compares the ledger with provider settlement reports and flags mismatches.

**Tests**: same idempotency key twice → one provider call; webhook before/after the synchronous response; invalid transitions rejected; refund limits.
--- variants
Q: Split a payment between a wallet balance and a card.
A: A composite payment with two legs; charge wallet first, card second; reverse the wallet leg if the card fails.
Q: Subscriptions with monthly charges.
A: Stored payment method tokens, scheduled charges, dunning (retry schedule) on failure.
Q: Add a new provider in a new country.
A: New adapter + routing rule; no changes to the service.
--- steer
Q: The client retried and the customer was charged twice.
A: Idempotency keys end to end (client → our service → provider).
Q: The provider timed out.
A: Unknown state; status query; reconcile; don't blindly retry with a new key.
Q: Add UPI with async confirmation.
A: PENDING state completed by webhooks; idempotent webhook handling.
--- pitfalls
- Treating timeouts as failures and retrying with a new charge
- Status as a free string updated from anywhere
- Provider SDK types leaking into the order service
- Refunds without checking the captured total
--- level
- **L4**: payment entity, methods, provider call, success/failure.
- **L5**: idempotency end to end, state machine with webhooks and unknown outcomes, adapter + routing strategy, refunds with limits, ledger.
- **L6**: reconciliation, multi-provider failover safety, split payments, compliance (tokenisation, PCI scope).
--- boxes
PaymentService:class|router;idempotency;repo;ledger|charge(req);refund();onWebhook(e)
Payment:class|id;orderId;amount;method;status|succeed();fail();awaitConfirmation()
PaymentMethod:interface||
ProviderGateway:interface||charge();refund();status(ref)
StripeGateway:class||charge()
ProviderRouter:interface||choose(method, amount)
IdempotencyStore:class||getOrCompute(key, fn)
--- rels
PaymentService>ProviderRouter:uses
PaymentService>IdempotencyStore:uses
PaymentService>Payment:uses:creates
ProviderRouter>ProviderGateway:uses
StripeGateway>ProviderGateway:implements
Payment>PaymentMethod:has
--- prereqs
adapter-facade, strategy-template, state-pattern, library-api, modelling-data, testability
--- paths
- [deep] Charge without double charges :: Idempotency key per attempt; store result; pass our id to the provider.
  - The client retries after a timeout :: Same key returns the original payment; no new charge.
- [deep] Payment lifecycle :: State machine with allowed transitions; webhooks finish pending payments; duplicate events ignored.
- [failure] The provider times out mid-charge :: Unknown outcome; status query; reconciliation; no blind retry.
  - Failover to a second provider :: Only when the first definitely did not charge.
- [variation] Partial refunds :: Refund entities with own keys; sum ≤ captured; states.
- [variation] Add a provider for a new country :: Adapter + routing rule.

=== d-lld-hotel-booking
title: Hotel reservation system
topic: lld-quality
tier: 2
est: 45
prompt: Design a hotel reservation system: guests search room types for dates, book rooms with a temporary hold during payment, cancel with policies, check in and check out; overbooking must not happen.
--- words
- **Room type vs room**: a category (deluxe double) vs a specific room number.
- **Inventory per night**: how many rooms of a type are free on each date.
- **Hold**: a short temporary reservation while the guest pays.
- **Cancellation policy**: rules for refunds depending on how early the guest cancels.
--- flow
1. **0–5**: clarify: room types vs specific rooms, date ranges (nights), holds during payment, cancellation policies, pricing by date, overbooking policy, concurrency.
2. **5–12**: classes: Hotel, RoomType, Room, Stay (date range), Reservation (states), InventoryCalendar (type × night counts), PricingStrategy, CancellationPolicy.
3. **12–30**: code availability check and atomic hold across nights; confirm; expire holds.
4. **30–45**: concurrency, room assignment at check-in, cancellations and refunds, tests.
--- req
**Use cases**: search availability by type and dates; hold rooms for 10 minutes; confirm after payment; cancel (refund by policy); check in (assign a room number); check out (invoice extras); no-shows.

**Rules**: for every night of the stay, booked + held ≤ rooms of that type; holds expire; a reservation's state changes only along allowed transitions.
--- model
- `RoomType(id, capacity, baseRate)`, `Room(number, type, status)`.
- `Stay(checkIn, checkOut)` LocalDate half-open, `nights()`.
- `InventoryCalendar`: per (type, date) counters (total, held, booked).
- `Reservation(id, guest, type, stay, count, status, holdExpiresAt)`; statuses HELD → CONFIRMED → CHECKED_IN → CHECKED_OUT; HELD → EXPIRED; CONFIRMED → CANCELLED / NO_SHOW.
- `PricingStrategy` (per-night rates, seasons), `CancellationPolicy` (refund % by notice).
- `ReservationService`, `HoldExpiryJob`, `Clock`.
--- patterns
- **State** for reservations; **strategy** for pricing, cancellation and room assignment; **value objects** for stays and money; **scheduler** for hold expiry.
--- code
```java
final class InventoryCalendar {
  private final Map<RoomTypeId, Map<LocalDate, int[]>> byType = new HashMap<>();   // [total, held, booked]
  synchronized boolean tryHold(RoomTypeId t, Stay s, int count) {
    for (LocalDate d : s.nights()) {                                     // check every night first
      int[] c = cell(t, d);
      if (c[1] + c[2] + count > c[0]) return false;
    }
    for (LocalDate d : s.nights()) cell(t, d)[1] += count;              // then apply: all or nothing
    return true;
  }
  synchronized void confirm(RoomTypeId t, Stay s, int count) { for (LocalDate d : s.nights()) { int[] c = cell(t, d); c[1] -= count; c[2] += count; } }
  synchronized void releaseHold(RoomTypeId t, Stay s, int count) { for (LocalDate d : s.nights()) cell(t, d)[1] -= count; }
}

final class ReservationService {
  Reservation hold(GuestId g, RoomTypeId t, Stay s, int count) {
    if (!inventory.tryHold(t, s, count)) throw new NoAvailability(t, s);
    Reservation r = Reservation.held(ids.next(), g, t, s, count, clock.instant().plus(Duration.ofMinutes(10)));
    repo.save(r); expiry.schedule(r.id(), r.holdExpiresAt());
    return r;
  }
  void confirm(ReservationId id, PaymentId p) {
    Reservation r = repo.get(id);
    r.confirm(p, clock.instant());                                     // throws if not HELD or expired
    inventory.confirm(r.type(), r.stay(), r.count());
    repo.save(r);
  }
}
```
--- ext
**Atomicity across nights**: check all nights then apply under one lock (or per-type lock; in a database, one transaction with row locks or conditional updates per night).

**Hold expiry**: scheduled job (or delay queue) moves HELD → EXPIRED and releases inventory; confirmation after expiry fails (or re-checks availability).

**Room assignment** at check-in: a strategy (floor preference, adjacency for groups), from rooms of the type not occupied that night.

**Overbooking**: deliberate overbooking (allow booked ≤ total × 1.05) is a business policy with walk-out compensation; state it as a variant.

**Tests**: multi-night availability; concurrent holds on the last room (one wins); hold expiry with fake clock; cancellation refunds by policy.
--- variants
Q: Hotel chain with many properties and channel managers (Booking.com, Expedia).
A: Inventory per property; channel sync with allotments; HLD for distributed inventory consistency.
Q: Dynamic pricing per night.
A: PricingStrategy summing per-night rates from a rate calendar; price locked at hold time.
Q: Group bookings of 20 rooms.
A: Same atomic multi-night check with count; group policies (deposits, release dates).
--- steer
Q: Prevent overbooking across a 5-night stay.
A: Check every night, then apply, atomically.
Q: Guest abandons payment.
A: Hold with expiry; job releases inventory.
Q: Cancellation refunds.
A: CancellationPolicy strategy by notice period.
--- pitfalls
- Checking only the first night's availability
- Holds without expiry (inventory leaks)
- Assigning specific rooms at booking when type-level inventory suffices
- Closed date ranges (checkout day counted as a night)
--- level
- **L4**: entities, search, book, cancel.
- **L5**: per-night inventory with atomic multi-night holds, state machine with expiry, strategies for pricing and cancellation, concurrency tests.
- **L6**: chain-wide inventory and channel managers, deliberate overbooking policy, dynamic pricing.
--- boxes
ReservationService:class|inventory;repo;expiry;clock|hold();confirm();cancel();checkIn()
InventoryCalendar:class|counts per type and night|tryHold();confirm();releaseHold()
Reservation:class|id;guest;type;stay;count;status;holdExpiresAt|confirm();cancel();expire()
Stay:class|checkIn;checkOut|nights();overlaps()
RoomType:class|id;capacity;baseRate|
Room:class|number;type;status|
CancellationPolicy:interface||refund(res, at): Money
PricingStrategy:interface||price(type, stay): Money
--- rels
ReservationService>InventoryCalendar:uses
ReservationService>Reservation:uses:creates
ReservationService>CancellationPolicy:uses
ReservationService>PricingStrategy:uses
Reservation>Stay:has
Reservation>RoomType:has
Room>RoomType:has
--- prereqs
modelling-data, state-pattern, strategy-template, code-layers, race-conditions
--- paths
- [deep] Check availability for a multi-night stay :: Per (type, night) counters; check all nights, then apply atomically.
  - Two guests grab the last room for overlapping dates :: One lock per type or DB transaction; one wins.
- [deep] Holds during payment :: HELD with expiry; scheduled release; confirm checks state and expiry.
  - Payment completes 1 second after expiry :: Re-check availability or reject; refund if charged.
- [variation] Cancellation policies :: Strategy by notice; refunds; state transition.
- [variation] Assign room numbers at check-in :: Assignment strategy among free rooms of the type.
- [failure] Inventory drifts from reservations :: Rebuild counters from reservations; invariant checks.

=== d-lld-inventory
title: Inventory management system
topic: concurrency
tier: 2
est: 45
prompt: Design an inventory management system for an online store with several warehouses: track stock per product per warehouse, reserve stock for orders, release on cancellation, restock, and alert when stock runs low.
--- words
- **SKU**: a stock-keeping unit: one sellable product variant.
- **On hand / reserved / available**: units physically present / promised to orders not yet shipped / on hand minus reserved.
- **Reservation**: holding units for an order until it ships or is cancelled.
- **Reorder point**: the stock level at which to restock.
--- flow
1. **0–5**: clarify: warehouses, reservations vs immediate deduction, order flow (reserve → ship / release), restocking, low-stock alerts, concurrency level, audit.
2. **5–12**: classes: Sku, Warehouse, StockLevel(onHand, reserved), Reservation, InventoryService, AllocationStrategy, StockListener.
3. **12–30**: code atomic reserve across lines, ship and release, restock; low-stock observer.
4. **30–45**: concurrency (oversell), multi-warehouse allocation, audit log, tests.
--- req
**Use cases**: add stock (receive shipment); reserve stock for an order (all lines or none); ship (convert reservation to deduction); cancel (release); adjust (damaged, lost); query availability; alert when available < reorder point.

**Rules**: available never negative; reservations expire if the order isn't paid in time; every change is recorded (who, why, when).
--- model
- `StockLevel(onHand, reserved)` per (warehouse, sku); `available()`.
- `Reservation(id, orderId, lines: List<(sku, warehouse, qty)>, status, expiresAt)`.
- `InventoryService`: `reserve(order)`, `ship(reservationId)`, `release(reservationId)`, `receive(warehouse, sku, qty)`.
- `AllocationStrategy`: pick warehouses for each line (nearest, single-warehouse preference, split).
- `StockListener` (observer) for low-stock alerts; `StockMovement` audit records.
--- patterns
- **Strategy** for allocation; **observer** for low-stock events; **command/event log** for stock movements; **state** for reservations; ordered **locking** for multi-line reservations.
--- code
```java
final class InventoryService {
  private final Map<StockKey, StockLevel> levels = new ConcurrentHashMap<>();   // StockLevel has its own lock

  Reservation reserve(Order o) {
    List<Line> plan = allocation.allocate(o, this::available);
    List<StockLevel> locked = plan.stream().map(l -> levels.get(l.key())).sorted(Comparator.comparing(StockLevel::key)).toList();
    locked.forEach(StockLevel::lock);                                   // global order: no deadlocks
    try {
      for (Line l : plan) if (levels.get(l.key()).available() < l.qty()) throw new OutOfStock(l.key());
      for (Line l : plan) levels.get(l.key()).reserve(l.qty());         // all lines or none
    } finally { locked.reversed().forEach(StockLevel::unlock); }
    Reservation r = Reservation.of(ids.next(), o.id(), plan, clock.instant().plus(Duration.ofMinutes(15)));
    movements.record(r, "RESERVED");
    plan.forEach(l -> checkLow(l.key()));
    return r;
  }
}
```
--- ext
**Concurrency**: a hot SKU with many concurrent orders → per-(warehouse, sku) locks, acquired in key order for multi-line orders; at scale, a database with conditional updates (`UPDATE … SET reserved = reserved + q WHERE on_hand - reserved >= q`) per line in one transaction.

**Expiry**: unpaid reservations released by a scheduled job.

**Low stock**: observer fired after changes, outside locks; debounced so alerts aren't spammed.

**Audit**: append-only movements allow rebuilding stock levels and investigating discrepancies.

**Tests**: concurrent orders for the last units never oversell; multi-line all-or-nothing; release restores; low-stock alert fires once when crossing the threshold.
--- variants
Q: Split an order across warehouses to ship faster.
A: AllocationStrategy minimising shipments or distance; reservation lines per warehouse.
Q: Flash sale: 100,000 people for 1,000 units.
A: Fast path: atomic decrement counter per SKU; queue orders; reject quickly when sold out; HLD for distributed counters.
Q: Physical counts reveal differences.
A: Adjustment movements with reasons; reconcile against audit log.
--- steer
Q: Two orders take the last unit.
A: Lock per stock key (or conditional update); check and reserve atomically.
Q: An order with 5 lines.
A: Lock all keys in a global order, check all, apply all.
Q: Low-stock alerts.
A: Observer after changes, outside locks, debounced.
--- pitfalls
- Deducting on_hand at order time instead of reserving
- Locking multi-line orders in arbitrary order (deadlocks)
- Firing alerts inside locks
- No expiry for unpaid reservations
--- level
- **L4**: stock per sku and warehouse, reserve/ship/release.
- **L5**: atomic multi-line reservations with ordered locking, expiry, allocation strategy, observer alerts, audit trail, concurrency tests.
- **L6**: flash-sale design, distributed inventory, reconciliation processes.
--- boxes
InventoryService:class|levels;allocation;movements;clock|reserve(order);ship(id);release(id);receive()
StockLevel:class|key;onHand;reserved|available();reserve(q);release(q);lock();unlock()
Reservation:class|id;orderId;lines;status;expiresAt|
AllocationStrategy:interface||allocate(order, availability)
StockListener:interface||lowStock(key, available)
StockMovement:class|key;delta;reason;at|
--- rels
InventoryService>StockLevel:has
InventoryService>AllocationStrategy:uses
InventoryService>Reservation:uses:creates
InventoryService>StockListener:uses:notifies
InventoryService>StockMovement:uses:records
--- prereqs
modelling-data, observer-pattern, race-conditions, locks, deadlock
--- paths
- [deep] Reserve stock for an order :: Available = on hand − reserved; all lines or none; atomic per key.
  - A 5-line order :: Lock all keys in a global order; check then apply.
- [failure] Two orders race for the last unit :: Per-key lock or conditional update; one fails cleanly.
- [deep] Unpaid orders hold stock forever :: Reservation expiry job; release.
- [variation] Several warehouses :: Allocation strategy; split shipments.
- [variation] Flash sale with 100× demand :: Atomic counters, fast rejection, queueing.

=== d-lld-movie-booking
title: Movie ticket booking (BookMyShow)
topic: concurrency
tier: 2
est: 45
prompt: Design a movie ticket booking system: users browse shows, pick specific seats on a seat map, hold them while paying, and confirm; the same seat must never be sold twice.
--- words
- **Show**: one screening of a movie in a screen at a time.
- **Seat map**: the layout of seats for a screen, with categories and prices.
- **Seat hold**: seats temporarily locked for one user while they pay (e.g. 8 minutes).
- **Booking**: a confirmed purchase of seats.
--- flow
1. **0–5**: clarify: cities, theatres, screens, shows; seat selection; hold duration; payment; cancellations; concurrency (popular shows).
2. **5–12**: classes: Movie, Theatre, Screen, Seat, Show, ShowSeat (state per show), Booking, SeatHoldService, PricingStrategy.
3. **12–30**: code atomic multi-seat hold, confirm after payment, expiry.
4. **30–45**: concurrency at scale, partial failure, cancellations, tests.
--- req
**Use cases**: search shows by movie/city/date; view seat map with availability; select seats and hold them; pay; confirm booking; cancel (refund by policy); release holds on timeout.

**Rules**: a seat is AVAILABLE, HELD (by one user until expiry) or BOOKED for a given show; holds are all-or-nothing for the selected seats; max seats per booking.
--- model
- `Movie`, `Theatre`, `Screen(layout of Seat)`, `Seat(row, number, category)`.
- `Show(id, movie, screen, startTime)` with `Map<SeatId, ShowSeat>`.
- `ShowSeat(seatId, status, heldBy, holdExpiresAt, bookingId)`.
- `Booking(id, user, show, seats, amount, status)`.
- `SeatHoldService`, `BookingService`, `PricingStrategy` (category, time, demand), `PaymentGateway` (port).
--- patterns
- **State** per show seat; **strategy** for pricing; **facade** for booking; **observer** for seat-map updates to other viewers; ordered **locking** or per-show lock for holds.
--- code
```java
final class Show {
  private final Map<SeatId, ShowSeat> seats; private final ReentrantLock lock = new ReentrantLock();

  boolean hold(UserId u, List<SeatId> wanted, Instant now, Duration ttl) {
    lock.lock();                                                         // one lock per show: simple, contention only within a show
    try {
      for (SeatId id : wanted) if (!seats.get(id).isAvailable(now)) return false;   // expired holds count as available
      for (SeatId id : wanted) seats.get(id).hold(u, now.plus(ttl));
      return true;
    } finally { lock.unlock(); }
  }

  void confirm(UserId u, List<SeatId> ids, BookingId b, Instant now) {
    lock.lock();
    try {
      for (SeatId id : ids) if (!seats.get(id).isHeldBy(u, now)) throw new HoldExpired(id);
      for (SeatId id : ids) seats.get(id).book(b);
    } finally { lock.unlock(); }
  }
}
```
--- ext
**Concurrency**: per-show lock makes multi-seat holds atomic; contention only among users of the same show. At larger scale: per-seat conditional updates in a database inside one transaction (`UPDATE show_seats SET status='HELD', held_by=? WHERE show_id=? AND seat_id IN (...) AND status='AVAILABLE'` and check the row count), or a distributed lock per show.

**Expiry**: lazy (a HELD seat past its expiry counts as available) plus a cleanup job for display accuracy.

**Payment**: charge with idempotency key = hold id; if payment succeeds after the hold expired and seats were taken, refund automatically.

**Tests**: concurrent holds on overlapping seat sets → exactly one wins; expiry with fake clock; confirm after expiry fails; refund path.
--- variants
Q: A blockbuster opening: 200,000 users hit one show.
A: Virtual waiting room / queue, per-show sharded locks or seat-level CAS, cached seat maps with versioning; HLD ticketing design.
Q: Auto-select the best available seats together.
A: Seat-finding strategy over the layout (contiguous seats in the best rows); then the same atomic hold.
Q: Cancellations with partial refunds.
A: Booking state machine; policy by time to show; seats return to AVAILABLE.
--- steer
Q: Two users pick overlapping seats at the same moment.
A: Atomic all-or-nothing hold (per-show lock or conditional update).
Q: User abandons payment.
A: Hold expiry: lazy availability + cleanup job.
Q: Payment succeeds after the hold expired.
A: Confirm fails; automatic refund.
--- pitfalls
- Holding seats one at a time (partial holds)
- Holds without expiry
- Booking before payment confirmation, or confirming without checking the hold owner
- A global lock across all shows
--- level
- **L4**: entities, seat selection, booking.
- **L5**: per-show seat states, atomic multi-seat holds with expiry, idempotent payment and refund on late success, concurrency tests.
- **L6**: flash-crowd handling (waiting rooms), seat-map caching and consistency, distributed locking trade-offs.
--- boxes
Show:class|id;movie;screen;startTime;seats|hold(user, seats);confirm();release()
ShowSeat:class|seatId;status;heldBy;holdExpiresAt|isAvailable(now);hold();book()
Seat:class|row;number;category|
Screen:class|id;layout: List<Seat>|
Booking:class|id;user;show;seats;amount;status|
BookingService:class|payments;pricing|book(user, show, seats)
PricingStrategy:interface||price(show, seats): Money
--- rels
Show>ShowSeat:has:1..*
ShowSeat>Seat:has
Screen>Seat:has
Show>Screen:has
BookingService>Show:uses
BookingService>PricingStrategy:uses
Booking>Show:has
--- prereqs
state-pattern, modelling-data, race-conditions, locks
--- paths
- [deep] Hold several seats atomically :: Per-show lock; check all then hold all; or conditional updates in one transaction.
  - Users pick overlapping seats at the same instant :: Exactly one succeeds; others get a clear conflict.
- [deep] Seat holds expire :: Lazy availability + cleanup; confirm checks owner and expiry.
  - Payment succeeds after expiry :: Reject confirm; automatic refund via idempotent payment id.
- [variation] 200,000 users for one show :: Waiting room/queue; seat-level CAS; cached seat maps.
- [variation] Auto-pick the best seats together :: Seat-finding strategy over the layout; same atomic hold.

=== d-lld-auction
title: Online auction
topic: patterns-behavioral
tier: 2
est: 45
prompt: Design an online auction system: sellers list items with a reserve price and end time; bidders place bids that must beat the current highest by a minimum increment; late bids extend the auction; the winner is notified at close.
--- words
- **Reserve price**: the minimum price below which the item won't be sold.
- **Increment**: the minimum amount a new bid must exceed the current highest by.
- **Anti-sniping**: extending the end time when a bid arrives in the last minute.
- **Proxy bidding**: the system bids on your behalf up to a maximum you set.
--- flow
1. **0–5**: clarify: auction types (English ascending), reserve, increments, extensions, proxy bids, payment after win, cancellations, concurrency.
2. **5–12**: classes: Auction (mediator + state), Bid, Bidder, Seller, Item, IncrementPolicy, AuctionScheduler, Notifier.
3. **12–30**: code placeBid under a per-auction lock, extension, close.
4. **30–45**: proxy bidding, concurrency, clock and timers, notifications, tests.
--- req
**Use cases**: list an item with start, end, starting price, reserve, increment rules; place a bid; see current price and leader; auto-extend on late bids; close at end time; declare winner if reserve met; notify outbid bidders and the winner.

**Rules**: bids after close rejected; seller can't bid; a bid must be ≥ current + increment (or ≥ start price for the first); ties broken by earlier time.
--- model
- `Auction(id, item, seller, startPrice, reserve, endsAt, AuctionStatus, highestBid, bids)`; statuses SCHEDULED → OPEN → CLOSED (SOLD or UNSOLD) / CANCELLED.
- `Bid(bidder, Money amount, Instant at)`.
- `IncrementPolicy` (tiered increments by price), `ExtensionPolicy` (anti-sniping).
- `AuctionService`, `AuctionScheduler` (close timers), `Notifier` (outbid, won).
--- patterns
- **Mediator**: bidders interact only through the Auction, which applies the rules.
- **State** for auction lifecycle; **strategy** for increments and extensions; **observer** for notifications; **command** for bid history.
--- code
```java
final class Auction {
  private final ReentrantLock lock = new ReentrantLock();
  BidResult placeBid(UserId bidder, Money amount, Instant now) {
    UserId outbid = null;
    lock.lock();
    try {
      if (status != AuctionStatus.OPEN || !now.isBefore(endsAt)) return BidResult.rejected("auction closed");
      if (bidder.equals(seller)) return BidResult.rejected("seller cannot bid");
      Money min = highest == null ? startPrice : highest.amount().plus(increments.step(highest.amount()));
      if (amount.lessThan(min)) return BidResult.rejected("minimum is " + min);
      outbid = highest == null ? null : highest.bidder();
      highest = new Bid(bidder, amount, now); history.add(highest);
      Instant newEnd = extension.adjust(endsAt, now);                     // e.g. +2 min if within the last minute
      if (!newEnd.equals(endsAt)) { endsAt = newEnd; scheduler.reschedule(id, endsAt); }
    } finally { lock.unlock(); }
    if (outbid != null && !outbid.equals(bidder)) notifier.outbid(outbid, id, amount);   // notify outside the lock
    return BidResult.accepted(amount);
  }
}
```
--- ext
**Concurrency**: one lock per auction; bids on different auctions run in parallel; notifications outside the lock.

**Timers**: close scheduled at endsAt; rescheduled on extension; the close handler re-checks the time under the lock (a stale timer does nothing if the auction was extended).

**Proxy bidding**: store each bidder's maximum; on a new bid, automatically raise the leader's bid up to their max by the increment; the price is the second-highest max + increment.

**Tests**: increments; seller can't bid; late bid extends; concurrent bids → consistent leader and price; close with/without reserve met.
--- variants
Q: Sealed-bid (Vickrey) auction.
A: Different strategy: bids hidden until close; highest wins at the second-highest price.
Q: Millions of watchers see live prices.
A: Publish price-change events; fan-out via pub/sub/WebSockets (HLD live comments-style).
Q: Winner doesn't pay.
A: Payment deadline; offer to the second-highest bidder; penalties.
--- steer
Q: Two bids arrive in the same millisecond.
A: Per-auction lock serialises; earlier accepted, later must beat it.
Q: Last-second sniping.
A: Extension policy and timer rescheduling.
Q: Notify the outbid bidder.
A: Observer/notifier after releasing the lock.
--- pitfalls
- Checking the highest bid and updating it without atomicity
- Notifying inside the lock
- Timers that close an extended auction early
- Letting bidders reference each other directly
--- level
- **L4**: auction, bids, highest bid, close.
- **L5**: mediator with per-auction lock, increments and anti-sniping strategies, timer rescheduling, notifications outside locks, tests.
- **L6**: proxy bidding, sealed-bid variants, real-time fan-out at scale, non-payment handling.
--- boxes
Auction:class|id;item;seller;status;highest;endsAt|placeBid(bidder, amount, now);close(now)
Bid:class|bidder;amount;at|
IncrementPolicy:interface||step(current): Money
ExtensionPolicy:interface||adjust(endsAt, now): Instant
AuctionScheduler:class||schedule(id, at);reschedule(id, at)
Notifier:interface||outbid();won()
--- rels
Auction>Bid:has:history
Auction>IncrementPolicy:uses
Auction>ExtensionPolicy:uses
Auction>AuctionScheduler:uses
Auction>Notifier:uses
--- prereqs
observer-pattern, state-pattern, mediator-null-object, locks
--- paths
- [deep] Accept or reject a bid :: State and time checks; increments; seller rule; per-auction lock.
  - Two bids at the same instant :: Serialised by the lock; the second must beat the first.
- [deep] Last-minute sniping :: Extension policy; reschedule close; close handler re-checks time.
- [variation] Proxy bidding :: Store max bids; auto-raise by increments; price = second max + increment.
- [failure] The winner doesn't pay :: Deadline; second-highest offer; penalties.
- [variation] Sealed-bid auction :: Strategy swap; reveal at close; second-price rule.

=== d-lld-ride-matching
title: Ride matching (Uber, low-level)
topic: concurrency
tier: 2
est: 45
prompt: Design the classes for matching riders with drivers in one city: drivers report locations and availability, riders request rides, the system offers the ride to the best nearby driver, and trips move through their states.
--- words
- **Driver availability**: online and free, on a trip, or offline.
- **Matching strategy**: the rule for picking a driver: nearest, best-rated nearby, shortest estimated pickup time.
- **Offer**: sending a ride request to one driver who can accept or decline within seconds.
- **Grid / geohash cell**: a square area used to find nearby drivers quickly.
--- flow
1. **0–5**: clarify: one city, matching rule, driver accept/decline with timeout, trip states, pricing (out of scope or simple), cancellations, concurrency.
2. **5–12**: classes: Rider, Driver (state), Location, DriverIndex (grid), RideRequest, Trip (state machine), MatchingStrategy, Dispatcher.
3. **12–30**: code nearby search with a grid index, atomic driver reservation, offer with timeout and fallback.
4. **30–45**: concurrency (one driver, two requests), stale locations, surge pricing as a variant, tests.
--- req
**Use cases**: drivers go online/offline and send location updates every few seconds; riders request a ride from A to B; the system offers it to drivers in order until one accepts (each has 10 s); trip states: REQUESTED → DRIVER_ASSIGNED → ARRIVED → IN_PROGRESS → COMPLETED (or CANCELLED); fares computed at the end.

**Rules**: a driver is offered at most one ride at a time; a ride is assigned to exactly one driver; declined/timeout moves to the next candidate; give up after N tries.
--- model
- `Driver(id, Location, DriverStatus, rating, vehicleType)`; statuses OFFLINE, AVAILABLE, OFFERED, ON_TRIP.
- `DriverIndex`: grid cells → set of available driver ids; updated on location/status changes.
- `RideRequest(id, rider, pickup, drop, vehicleType)`; `Trip(id, request, driver, TripStatus, timestamps)`.
- `MatchingStrategy`: rank candidates. `Dispatcher`: offers with timeouts via a scheduler. `FareStrategy`.
--- patterns
- **Strategy** for matching and fares; **state** for drivers and trips; **observer** for trip status updates to rider apps; **CAS** on driver status to reserve.
--- code
```java
final class Dispatcher {
  void dispatch(RideRequest r) {
    List<Driver> candidates = matching.rank(index.nearby(r.pickup(), 3_000 /* m */, r.vehicleType()), r);
    offerNext(r, candidates.iterator(), 0);
  }
  private void offerNext(RideRequest r, Iterator<Driver> it, int tries) {
    while (it.hasNext() && tries < 5) {
      Driver d = it.next();
      if (!d.tryReserve(DriverStatus.AVAILABLE, DriverStatus.OFFERED)) continue;   // CAS: one request per driver
      index.remove(d);
      offers.send(d, r);
      scheduler.schedule(() -> onTimeout(r, d, it, tries + 1), 10, TimeUnit.SECONDS);
      return;
    }
    trips.fail(r, "no drivers");
  }
  void onAccept(RideRequest r, Driver d) {
    if (d.tryReserve(DriverStatus.OFFERED, DriverStatus.ON_TRIP)) trips.assign(r, d);   // a late accept after timeout fails
  }
  private void onTimeout(RideRequest r, Driver d, Iterator<Driver> it, int tries) {
    if (d.tryReserve(DriverStatus.OFFERED, DriverStatus.AVAILABLE)) { index.add(d); offerNext(r, it, tries); }
  }
}
```
--- ext
**Concurrency**: driver status as an `AtomicReference`/CAS so two requests can't reserve the same driver; offer/accept/timeout races resolved by the same CAS (whoever moves the status first wins).

**Index**: grid cells keyed by (lat, lng) rounded; nearby search checks the cell and neighbours; location updates move drivers between cells (remove + add); stale locations (no update for 30 s) mark drivers unavailable.

**Tests**: two requests racing for one driver → one offer; timeout moves to the next driver; late accept after timeout rejected; trip state transitions.
--- variants
Q: Batch matching every 2 seconds to optimise globally.
A: Collect requests and available drivers; solve an assignment problem (Hungarian or greedy by cost); then reserve drivers.
Q: Surge pricing.
A: FareStrategy uses demand/supply per cell; multiplier locked at request time.
Q: Many cities, millions of drivers.
A: HLD: partition by city/geocell, location service, matching service; this design becomes one partition's logic.
--- steer
Q: Find nearby drivers fast.
A: Grid/geohash index of available drivers; search neighbouring cells.
Q: Two riders get the same driver.
A: CAS on driver status: AVAILABLE → OFFERED.
Q: Driver doesn't respond.
A: Offer timeout; CAS back to AVAILABLE; next candidate.
--- pitfalls
- Scanning all drivers for every request
- Offering one driver several rides at once
- Timeouts and accepts racing without a single atomic transition
- Trip status as free strings
--- level
- **L4**: entities, nearest driver selection, trip states.
- **L5**: spatial index, CAS-based driver reservation, offer/timeout/accept race handling, matching strategy, tests.
- **L6**: batch/global matching, surge pricing, partitioning for scale.
--- boxes
Dispatcher:class|index;matching;offers;scheduler|dispatch(req);onAccept();onTimeout()
Driver:class|id;location;status: AtomicReference;rating|tryReserve(from, to)
DriverIndex:class|cells: Map<Cell, Set<DriverId>>|nearby(loc, radius);add();remove()
RideRequest:class|id;rider;pickup;drop;vehicleType|
Trip:class|id;request;driver;status|arrive();start();complete();cancel()
MatchingStrategy:interface||rank(drivers, request)
--- rels
Dispatcher>DriverIndex:uses
Dispatcher>MatchingStrategy:uses
Dispatcher>Driver:uses
Dispatcher>Trip:uses:assigns
Trip>Driver:has
Trip>RideRequest:has
--- prereqs
strategy-template, state-pattern, observer-pattern, race-conditions, atomics-cas
--- paths
- [deep] Find candidate drivers :: Grid/geohash index of available drivers; neighbouring cells; ranking strategy.
  - Drivers move between cells every few seconds :: Remove/add on update; stale-location expiry.
- [failure] Two requests pick the same driver :: CAS AVAILABLE → OFFERED; loser tries next candidate.
- [deep] Offer, accept and timeout :: Scheduled timeout; CAS transitions decide accept vs timeout races.
  - Driver accepts one second after the timeout :: CAS from OFFERED fails; accept rejected.
- [variation] Batch matching for better global assignment :: Collect requests; assignment algorithm; reserve.
- [variation] Surge pricing :: Fare strategy using demand/supply per cell; locked multiplier.

=== d-lld-connection-pool
title: Database connection pool
topic: concurrency-practice
tier: 2
est: 45
prompt: Design a thread-safe connection pool library: callers borrow a connection, use it and return it; the pool bounds the number of connections, waits with a timeout when all are busy, validates and replaces broken connections, and shrinks when idle.
--- words
- **Connection**: an open, authenticated session to a database: expensive to create (network round trips, TLS, auth).
- **Borrow / return (lease)**: take a connection from the pool and give it back.
- **Validation**: checking a connection still works (a quick ping) before reuse.
- **Leak**: a borrowed connection never returned.
- **Min idle / max size**: connections kept warm / the hard upper bound.
--- flow
1. **0–5**: clarify: max size, min idle, borrow timeout, validation policy, idle eviction, leak detection, metrics.
2. **5–12**: API: `ConnectionPool.borrow(timeout)` → `PooledConnection` (AutoCloseable); config builder; ConnectionFactory interface.
3. **12–30**: code borrow/return with a semaphore + idle deque, lazy creation up to max, validation, try-with-resources.
4. **30–45**: leak detection, idle eviction, broken connections, shutdown, tests.
--- req
**Use cases**: borrow a connection (waiting up to a timeout when exhausted); return it (by closing the lease); create connections lazily up to max; keep min idle warm; validate before handing out; discard broken connections; evict idle ones above min after a period; detect and report leaks; shut down closing everything.

**Non-functional**: thread-safe; never exceed max; fast path without global locks; never hand the same connection to two callers.
--- model
- `PoolConfig` (builder): maxSize, minIdle, borrowTimeout, idleTimeout, validationQuery, leakThreshold.
- `ConnectionFactory` interface (creates real connections).
- `ConnectionPool`: `Semaphore permits(maxSize)`, `ConcurrentLinkedDeque<PooledEntry> idle`, `AtomicInteger total`, a housekeeping scheduler.
- `PooledConnection` (proxy implementing the connection interface): `close()` returns to the pool instead of closing; tracks borrow time and stack for leak detection.
--- patterns
- **Object pool**; **proxy** (pooled connection whose close returns it); **factory** for creation; **builder** for config; **semaphore** for bounding; **scheduler** for housekeeping.
--- code
```java
final class ConnectionPool implements AutoCloseable {
  private final Semaphore permits; private final ConcurrentLinkedDeque<Connection> idle = new ConcurrentLinkedDeque<>();
  private final ConnectionFactory factory; private final PoolConfig cfg;

  PooledConnection borrow() throws InterruptedException, SQLException {
    if (!permits.tryAcquire(cfg.borrowTimeout().toMillis(), TimeUnit.MILLISECONDS))
      throw new SQLTransientConnectionException("pool exhausted after " + cfg.borrowTimeout());
    try {
      Connection c;
      while ((c = idle.pollFirst()) != null) {                          // most recently used first (warm)
        if (isValid(c)) return new PooledConnection(c, this, clock.instant());
        closeQuietly(c);                                                 // broken: discard and try the next
      }
      return new PooledConnection(factory.create(), this, clock.instant());   // permit guarantees ≤ maxSize
    } catch (SQLException | RuntimeException e) {
      permits.release();                                                 // creation failed: give the permit back
      throw e;
    }
  }

  void giveBack(Connection c, boolean broken) {
    if (broken || closed) closeQuietly(c); else { resetState(c); idle.offerFirst(c); }
    permits.release();                                                   // exactly one release per borrow
  }
}

final class PooledConnection implements AutoCloseable {
  private final AtomicBoolean returned = new AtomicBoolean();
  public void close() { if (returned.compareAndSet(false, true)) pool.giveBack(raw, broken); }   // double close is harmless
}
```
--- ext
**Invariants**: permits = connections that may still be handed out; each borrow takes one permit and each return releases exactly one (double close guarded by CAS).

**Reset on return**: roll back open transactions, restore auto-commit and isolation, clear warnings, so the next borrower gets a clean connection.

**Housekeeping**: a scheduled task evicts idle connections beyond minIdle after idleTimeout, tops up to minIdle, and logs leaks (borrowed longer than the threshold, with the borrower's stack trace).

**Tests**: max never exceeded under 100 threads; timeout when exhausted; broken connection replaced; double close releases once; leak reported with a fake clock.
--- variants
Q: Size the pool for a service with 200 threads.
A: Pool size is bounded by the database's capacity, not thread count; often cores × 2 + disks on the DB side; requests wait briefly or fail fast.
Q: Several databases (primary + replicas).
A: A pool per target; a router choosing by read/write.
Q: Fairness: callers served in arrival order.
A: Fair semaphore; trade-off with throughput.
--- steer
Q: How do you bound connections?
A: Semaphore(maxSize) taken on borrow, released on return.
Q: Caller forgets to return.
A: try-with-resources proxy; leak detection by borrow age.
Q: Connection died while idle.
A: Validate on borrow (or periodically); discard and create.
--- pitfalls
- Releasing the permit twice on double close
- Not releasing the permit when creation fails
- Handing out connections with leftover transactions
- Unbounded waiting for a connection
--- level
- **L4**: blocking queue of connections, borrow/return.
- **L5**: semaphore + idle deque with lazy creation, proxy with idempotent close, validation and reset, timeouts, leak detection, tests.
- **L6**: housekeeping policies, sizing rationale, metrics, multi-target routing.
--- boxes
ConnectionPool:class|permits: Semaphore;idle: Deque;factory;config|borrow(): PooledConnection;giveBack(c, broken);close()
PooledConnection:class|raw;pool;borrowedAt;returned: AtomicBoolean|close()
ConnectionFactory:interface||create(): Connection
PoolConfig:class|maxSize;minIdle;borrowTimeout;idleTimeout|
Housekeeper:class|scheduler|evictIdle();topUp();reportLeaks()
--- rels
ConnectionPool>ConnectionFactory:uses
ConnectionPool>PoolConfig:has
ConnectionPool>PooledConnection:uses:creates
PooledConnection>ConnectionPool:uses:returns to
Housekeeper>ConnectionPool:uses
--- prereqs
singleton-pool, decorator-proxy, producer-consumer, sync-primitives
--- paths
- [deep] Borrow and return safely :: Semaphore bound; idle deque; lazy creation; proxy close returns; one release per borrow.
  - Two closes on the same connection :: CAS guard; release once.
- [failure] All connections busy :: Timed tryAcquire; fail fast with a clear error; metrics.
- [failure] A connection broke while idle :: Validate on borrow; discard and replace; release permit on creation failure.
- [deep] Leaks :: Borrow timestamps and stacks; housekeeping reports; try-with-resources.
- [variation] How big should the pool be? :: Database capacity, not thread count; measure.

=== d-lld-web-crawler-mt
title: Multithreaded web crawler
topic: concurrency-practice
tier: 2
est: 45
prompt: Given a start URL and an HtmlParser that returns a page's links, crawl all pages under the same host using several threads, visiting each URL exactly once, and return when the crawl is complete.
--- words
- **Frontier**: the set of URLs discovered but not yet fetched.
- **Visited set**: URLs already claimed for crawling.
- **Termination detection**: knowing that no tasks are running and none are queued.
- **Politeness**: limiting how fast you hit one host.
--- flow
1. **0–5**: clarify: same host only, parser blocking and slow, thread count, output order irrelevant, politeness limits, failures.
2. **5–12**: design: concurrent visited set, executor, in-flight counter (Phaser), result collection.
3. **12–30**: code the crawl with atomic claims and termination detection.
4. **30–45**: politeness, retries, depth limits, normalisation, cancellation, tests.
--- req
**Use cases**: crawl from a start URL; return all reachable URLs on the same host; each URL fetched once; finish when all work is done; bound concurrency; tolerate fetch failures.

**Constraints**: `HtmlParser.getUrls(url)` is blocking (I/O-bound, ~100 ms), so many threads help; the result is a set (order doesn't matter).
--- model
- `Crawler`: `ExecutorService` (fixed pool or virtual threads), `Set<String> visited = ConcurrentHashMap.newKeySet()`, `Phaser inFlight`, `HtmlParser`, `UrlNormaliser`, `HostFilter`.
- Optional `RateLimiter` per host; `RetryPolicy` for transient failures.
--- patterns
- **Producer–consumer** via the executor's queue; **concurrent collections** for dedup; **phaser** for termination; **strategy** for URL filtering and normalisation; **decorator** for rate-limited/retrying parsers.
--- code
```java
final class Crawler {
  private final Set<String> visited = ConcurrentHashMap.newKeySet();
  private final Phaser inFlight = new Phaser(1);                          // party 1 = the caller
  private final ExecutorService pool;
  private final HtmlParser parser; private final String host;

  List<String> crawl(String start) {
    submit(normalise(start));
    inFlight.arriveAndAwaitAdvance();                                     // returns when every task has finished
    pool.shutdown();
    return List.copyOf(visited);
  }

  private void submit(String url) {
    if (!hostOf(url).equals(host) || !visited.add(url)) return;           // add() is the atomic claim
    inFlight.register();                                                  // register BEFORE submitting
    pool.execute(() -> {
      try { for (String next : parser.getUrls(url)) submit(normalise(next)); }
      catch (RuntimeException e) { log.warn("fetch failed {}", url, e); }
      finally { inFlight.arriveAndDeregister(); }
    });
  }
}
```
--- ext
**Why it terminates correctly**: each task registers before it's submitted and deregisters after it has submitted all its children, so the phaser can only advance when nothing is running or queued. Waiting for "queue empty" instead would stop early while tasks are still discovering links.

**Politeness**: a per-host rate limiter (token bucket) and a cap on concurrent fetches per host (semaphore) wrapped around the parser.

**Normalisation**: lower-case host, remove fragments, resolve relative links, strip tracking parameters, so duplicates are caught.

**Failures**: retries with backoff for transient errors; a failed URL stays in visited (or a separate failed set) to avoid infinite retry loops.

**Tests**: a fake parser with a known link graph (including cycles and other hosts); result equals the reachable same-host set; each URL fetched once (counting fake); completes with 1 and 16 threads.
--- variants
Q: Crawl billions of pages across many machines.
A: HLD web crawler: distributed frontier, URL partitioning by host, politeness queues, dedup with Bloom filters, content dedup.
Q: Limit depth to 3 from the start.
A: Carry depth with each URL; stop expanding beyond the limit.
Q: Stop the crawl on demand.
A: Cancellation flag checked before submitting; shutdownNow; tasks honour interrupts.
--- steer
Q: Visit each URL once.
A: visited.add(url) on a concurrent set is the atomic claim.
Q: How do you know you're done?
A: In-flight counting (Phaser or AtomicInteger + latch); not queue emptiness.
Q: How many threads?
A: I/O-bound: many (or virtual threads), bounded by politeness.
--- pitfalls
- contains() then add() on the visited set
- Terminating when the queue is momentarily empty
- Registering in-flight work after submitting (race to zero)
- Hammering one host with all threads
--- level
- **L4**: BFS with a thread pool and a synchronized visited set.
- **L5**: atomic claims, correct termination detection, thread count reasoning, normalisation, failure handling, deterministic tests with a fake parser.
- **L6**: politeness per host, cancellation, distribution to many machines.
--- boxes
Crawler:class|visited: Set;inFlight: Phaser;pool;parser;host|crawl(start): List<String>;submit(url)
HtmlParser:interface||getUrls(url): List<String>
UrlNormaliser:class||normalise(url)
PoliteParser:class|inner;limiter|getUrls(url)
--- rels
Crawler>HtmlParser:uses
Crawler>UrlNormaliser:uses
PoliteParser>HtmlParser:implements
PoliteParser>HtmlParser:has:wraps
--- prereqs
thread-pools, concurrent-collections, sync-primitives, concurrency-puzzles
--- paths
- [deep] Visit each URL exactly once :: Concurrent set add() as the atomic claim; normalisation.
  - Links differ only by #fragment or trailing slash :: Normaliser before claiming.
- [deep] Detect when the crawl is complete :: Register before submit; deregister after children submitted; await phaser.
  - Why not wait for the queue to be empty? :: Running tasks may still add URLs.
- [failure] The parser throws or hangs on some pages :: Catch per task; timeouts; retries with limits.
- [variation] Be polite to the host :: Per-host token bucket and concurrency cap via a decorator.
- [variation] Scale to billions of pages :: HLD crawler: distributed frontier and dedup.
