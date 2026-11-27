=== d-lld-card-game
title: Deck of cards and Blackjack
topic: oop-solid
tier: 1
est: 45
prompt: Design a generic deck of cards that can be shuffled and dealt, and use it to implement Blackjack between a dealer and several players.
--- words
- **Suit / rank**: the four suits (hearts, diamonds, clubs, spades) and thirteen ranks (2–10, J, Q, K, A).
- **Shoe**: several decks shuffled together, used by casinos.
- **Hand**: the cards a player holds; in Blackjack its score counts aces as 1 or 11.
- **Bust**: a hand scoring over 21.
--- flow
1. **0–5**: clarify: generic deck reusable by other games, number of decks, Blackjack rules (hit, stand, dealer stands on 17, blackjack pays 3:2), betting in scope?
2. **5–12**: classes: Card (record), Suit/Rank enums, Deck, Hand, BlackjackHand, Player, Dealer, Game.
3. **12–30**: code deck (shuffle with injected Random, deal), hand scoring with soft aces, the round.
4. **30–45**: extensibility to other games, betting, splitting pairs, testing with a seeded deck.
--- req
**Use cases**: create and shuffle a deck (or a shoe of N decks); deal cards; play a Blackjack round: deal two cards each, players hit or stand, dealer plays by fixed rules, settle results.

**Rules**: ace counts as 11 unless that busts the hand, then 1; dealer hits below 17 and stands on 17; natural blackjack (ace + ten-value on the first two cards) beats 21 made with more cards.
--- model
- `Suit`, `Rank` enums (Rank knows its base value); `Card(Rank, Suit)` record.
- `Deck`: list of cards, `shuffle(RandomGenerator)`, `deal() → Card`, `remaining()`.
- `Hand`: cards; `BlackjackHand extends/wraps Hand` with `score()`, `isBust()`, `isBlackjack()`.
- `Participant` → `Player` (decides via a `Strategy`: human input or a bot), `Dealer` (fixed rules).
- `BlackjackGame`: shoe, players, dealer, `playRound()`, `Outcome` per player.
--- patterns
- **Composition**: a generic `Deck`/`Hand` reused by different games; game-specific scoring outside the card classes.
- **Strategy** for player decisions (human, basic-strategy bot) and for the dealer's rule (stand on soft 17 or not).
- **Template method** or a game interface if several card games share a round structure.
- **Injected randomness** (RandomGenerator) for testable shuffles.
--- code
```java
enum Rank { TWO(2), THREE(3), FOUR(4), FIVE(5), SIX(6), SEVEN(7), EIGHT(8), NINE(9), TEN(10), JACK(10), QUEEN(10), KING(10), ACE(11);
  final int value; Rank(int v) { value = v; } }
record Card(Rank rank, Suit suit) {}

final class Deck {
  private final Deque<Card> cards = new ArrayDeque<>();
  Deck(int decks) { for (int d = 0; d < decks; d++) for (Suit s : Suit.values()) for (Rank r : Rank.values()) cards.add(new Card(r, s)); }
  void shuffle(RandomGenerator rnd) { List<Card> l = new ArrayList<>(cards); Collections.shuffle(l, Random.from(rnd)); cards.clear(); cards.addAll(l); }
  Card deal() { Card c = cards.pollFirst(); if (c == null) throw new IllegalStateException("deck empty"); return c; }
}

final class BlackjackHand {
  private final List<Card> cards = new ArrayList<>();
  void add(Card c) { cards.add(c); }
  int score() {
    int total = 0, aces = 0;
    for (Card c : cards) { total += c.rank().value; if (c.rank() == Rank.ACE) aces++; }
    while (total > 21 && aces-- > 0) total -= 10;                   // count aces as 1 as needed
    return total;
  }
  boolean isBust() { return score() > 21; }
  boolean isBlackjack() { return cards.size() == 2 && score() == 21; }
}
```
--- ext
**Extensions**: betting (`Wallet`, bets per round, payouts 1:1 and 3:2), doubling down, splitting pairs (a player owns several hands), insurance; other games (poker hand ranking as a separate evaluator) reusing Deck and Card.

**Shoe management**: reshuffle when a cut card is reached (e.g. 75% dealt).

**Tests**: seeded RandomGenerator gives a known order; ace scoring (A+A+9 = 21, A+K = blackjack); dealer stands on 17; outcomes for every combination.
--- variants
Q: Reuse the deck for poker.
A: Deck and Card unchanged; a PokerHandEvaluator ranks 5-card hands (flush, straight, pairs) with tie-breaking.
Q: Players can split pairs and double down.
A: A player owns a list of hands each with its own bet; actions validated per hand state.
Q: Online casino with many tables.
A: Table objects with their own shoe; server-side randomness; HLD for scale and fairness audits.
--- steer
Q: How do aces work?
A: Count as 11, then subtract 10 per ace while over 21.
Q: Make shuffling testable.
A: Inject the random generator; seed it in tests.
Q: Reuse for other games.
A: Generic Deck/Card; game-specific rules in separate classes.
--- pitfalls
- Hard-coding Blackjack scoring inside Card or Deck
- Using Math.random() directly, making tests non-deterministic
- Inheritance like BlackjackCard extends Card
- Forgetting soft aces
--- level
- **L4**: cards, deck, a working round.
- **L5**: generic reusable deck, correct ace scoring, strategies for players/dealer rules, injected randomness, clean outcomes, tests.
- **L6**: betting, splits, shoe/cut card, extension to other games with shared abstractions.
--- boxes
Card:class|rank: Rank;suit: Suit|
Rank:enum|TWO…ACE;value|
Deck:class|cards: Deque<Card>|shuffle(rnd);deal(): Card
BlackjackHand:class|cards: List<Card>|score();isBust();isBlackjack()
Player:class|hand;strategy|decide(): Action
Dealer:class|hand|play(deck)
DecisionStrategy:interface||decide(hand, upCard): Action
BlackjackGame:class|deck;players;dealer|playRound(): Outcomes
--- rels
Deck>Card:has:1..*
BlackjackHand>Card:has:holds
Player>BlackjackHand:has
Dealer>BlackjackHand:has
Player>DecisionStrategy:uses
BlackjackGame>Deck:has
BlackjackGame>Player:has:1..*
BlackjackGame>Dealer:has
--- prereqs
ood-core-code, encapsulation, inheritance-composition, polymorphism
--- paths
- [deep] Model cards and the deck :: Enums for suit/rank, Card record, Deck with injected randomness, deal/remaining.
  - Use 6 decks with a cut card :: Shoe of N decks; reshuffle threshold.
- [deep] Score a Blackjack hand :: Aces as 11 then 1 while busting; blackjack vs 21.
- [variation] Add betting and payouts :: Wallet, bets, 1:1 and 3:2 payouts, push on ties.
  - Splitting pairs :: Several hands per player, each with its own bet and actions.
- [variation] Reuse the deck for poker :: Same Deck/Card; separate hand evaluator.
- [deep] Make the game testable :: Seeded random; scripted decks; outcome tables.

=== d-lld-snake-ladder
title: Snake and Ladder
topic: oop-solid
tier: 1
est: 45
prompt: Design a Snake and Ladder game for 2–4 players on a configurable board with snakes, ladders and a dice, and make it easy to change rules.
--- words
- **Board**: squares 1..N; snakes move a player down from head to tail, ladders move up from bottom to top.
- **Dice strategy**: how a roll is produced (one die, two dice, a loaded die for tests).
- **Rule variants**: exact roll needed to finish, extra turn on a six, three sixes forfeit.
--- flow
1. **0–5**: clarify: board size, snakes/ladders configurable, number of players, dice count, finishing rules, extra turns.
2. **5–12**: classes: Game, Board, Jump (snake/ladder), Player, Dice (strategy), RuleSet, TurnResult.
3. **12–30**: code board validation, a turn, winning.
4. **30–45**: rule variants as strategies, testing with a scripted dice, extensions.
--- req
**Use cases**: configure a board (size, snakes, ladders); add players; take turns rolling and moving; apply snakes and ladders; detect the winner; optional rules (exact finish, extra turn on six).

**Validation**: no snake head or ladder bottom on the last square; no two jumps starting on the same square; no cycles of jumps.
--- model
- `Board(size, Map<Integer, Integer> jumps)` with `destination(square)`; built by a `BoardBuilder` that validates.
- `Jump(from, to)`: snake if to < from, ladder if to > from (one class, not two).
- `Player(name, position)`.
- `Dice` interface: `roll()`; `RandomDice(count, RandomGenerator)`, `ScriptedDice` for tests.
- `Game`: board, players queue, dice, `RuleSet`, `takeTurn() → TurnResult`, `winner()`.
--- patterns
- **Strategy** for dice and for rules (finish rule, extra-turn rule).
- **Builder** for validated boards.
- **Iterator/queue** for turn order; **observer** for UI events (moved, climbed, bitten, won).
--- code
```java
final class Board {
  private final int size; private final Map<Integer, Integer> jumps;   // validated by BoardBuilder
  int destination(int square) { return jumps.getOrDefault(square, square); }
  int size() { return size; }
}

final class Game {
  private final Board board; private final Dice dice; private final RuleSet rules;
  private final Deque<Player> turns; private Player winner;

  TurnResult takeTurn() {
    if (winner != null) throw new IllegalStateException("game over");
    Player p = turns.pollFirst();
    int roll = dice.roll();
    int target = p.position() + roll;
    if (target > board.size()) target = rules.overshoot(p.position(), roll, board.size());   // stay, or bounce back
    int landed = board.destination(target);
    p.moveTo(landed);
    if (landed == board.size()) winner = p;
    else if (rules.extraTurn(roll)) turns.addFirst(p); else turns.addLast(p);
    return new TurnResult(p, roll, target, landed, winner != null);
  }
}
```
--- ext
**Validation**: the builder rejects jumps from square N, overlapping starts, and chains that loop (follow jumps from each start; detect revisits).

**Rules**: `RuleSet` composed of small strategies (exact finish vs bounce-back, extra turn on six, three sixes lose the turn).

**Tests**: `ScriptedDice` returning a fixed sequence; ladder climbs, snake bites, exact finish, extra turns, game-over rejection.
--- variants
Q: Special squares: skip a turn, swap places.
A: A Square effect interface (Jump, SkipTurn, Swap) instead of a jumps map; board holds effects.
Q: Play online with friends.
A: Server-held game state, turn validation, randomness on the server, reconnection.
Q: Generate random valid boards.
A: Builder with constraints; retry generation until validation passes.
--- steer
Q: Snake and ladder classes?
A: One Jump with from/to (or a Square effect), not two near-identical classes.
Q: Make it testable.
A: Inject Dice; scripted rolls.
Q: Rule variants.
A: RuleSet strategies.
--- pitfalls
- Separate Snake and Ladder classes with identical behaviour
- Math.random inside the game loop
- No validation of jump cycles or jumps from the final square
- Mixing console I/O into Game
--- level
- **L4**: board, players, dice, a working loop.
- **L5**: validated board builder, dice and rule strategies, clean turn result, testability with scripted dice.
- **L6**: square-effect abstraction, online play considerations.
--- boxes
Game:class|board;dice;rules;turns|takeTurn(): TurnResult;winner()
Board:class|size;jumps: Map|destination(square)
Jump:class|from;to|
Player:class|name;position|moveTo(sq)
Dice:interface||roll(): int
RuleSet:interface||overshoot();extraTurn(roll)
BoardBuilder:class||addJump();build(): Board
--- rels
Game>Board:has
Game>Dice:uses
Game>RuleSet:uses
Game>Player:has:2..4
Board>Jump:has
BoardBuilder>Board:uses:creates
--- prereqs
ood-requirements, class-diagrams, encapsulation, polymorphism, srp-ocp
--- paths
- [deep] Model the board :: Jumps map (or square effects); validated by a builder.
  - Reject boards with jump cycles :: Follow jumps from each start; detect revisits.
- [deep] Implement a turn :: Roll, overshoot rule, apply jump, win check, turn order.
- [variation] Extra turn on six; three sixes forfeit :: RuleSet strategies; track consecutive sixes per player.
- [deep] Make it testable :: Dice interface with ScriptedDice; deterministic tests.
- [variation] Special squares (skip turn, swap) :: Square effect interface; polymorphic effects.

=== d-lld-library
title: Library management system
topic: oop-solid
tier: 1
est: 45
prompt: Design a library management system: members borrow and return book copies, reserve books that are out, and pay late fines; librarians manage the catalogue.
--- words
- **Book vs copy**: a book is the title (ISBN, author); a copy is one physical item with its own barcode and status.
- **Loan**: a record of a member borrowing a copy, with due date and return date.
- **Reservation (hold)**: a member's place in a queue for a book whose copies are all out.
- **Fine policy**: the rule for late fees.
--- flow
1. **0–5**: clarify: actors, member types and limits, loan period, reservations queue, fines, search in scope?
2. **5–12**: entities: Book, BookCopy, Member, Loan, Reservation; enums; FinePolicy, LoanPolicy; LendingService.
3. **12–30**: code borrow, return (with fine and hand-over to the next reservation), reserve.
4. **30–45**: concurrency on the last copy, notifications, tests, persistence.
--- req
**Use cases**: search catalogue (simple); borrow a copy; return a copy (fine if late); reserve a book whose copies are all out (FIFO queue); renew a loan if no one is waiting; librarian adds books/copies and registers members.

**Rules**: member limits by type (student 3, staff 10); loan period 14 days; fines per day late with a cap; members with unpaid fines above a threshold can't borrow; reserved copies are held for 2 days for the first in the queue.
--- model
- `Book(isbn, title, authors)`, `BookCopy(barcode, book, CopyStatus)`; `CopyStatus` AVAILABLE, ON_LOAN, ON_HOLD, LOST.
- `Member(id, MemberType, loans, finesDue)`.
- `Loan(id, copy, member, borrowedAt, dueAt, returnedAt?)` with `fine(FinePolicy, today)`.
- `Reservation(member, book, createdAt)`; `ReservationQueue` per book.
- `LoanPolicy` (limits, period per member type), `FinePolicy` (per day, cap).
- `LendingService` (use cases), repositories behind interfaces, `Notifier`, `Clock`.
--- patterns
- **Strategy** for loan and fine policies; **observer/notifier** for "your reservation is ready"; **repository** interfaces; **state** (enum) for copy status.
--- code
```java
final class LendingService {
  synchronized Loan borrow(MemberId mid, Barcode code) {             // one lock: simple and safe for a branch
    Member m = members.get(mid); BookCopy c = copies.get(code);
    if (m.finesDue().greaterThan(policy.maxUnpaidFines())) throw new FinesOutstanding(m);
    if (m.activeLoans() >= loanPolicy.limit(m.type())) throw new LimitReached(m);
    if (c.status() == CopyStatus.ON_HOLD && !c.heldFor(mid)) throw new CopyReserved(code);
    if (c.status() != CopyStatus.AVAILABLE && c.status() != CopyStatus.ON_HOLD) throw new CopyUnavailable(code);
    Loan loan = new Loan(ids.next(), c, m, clock.instant(), clock.instant().plus(loanPolicy.period(m.type())));
    c.markOnLoan(); m.addLoan(loan); loans.save(loan);
    return loan;
  }

  synchronized Money giveBack(Barcode code) {
    Loan loan = loans.activeFor(code).orElseThrow(() -> new NotOnLoan(code));
    loan.close(clock.instant());
    Money fine = loan.fine(finePolicy, clock.instant());
    loan.member().addFine(fine);
    BookCopy c = loan.copy();
    reservations.nextFor(c.book()).ifPresentOrElse(
        r -> { c.holdFor(r.member(), clock.instant().plus(Duration.ofDays(2))); notifier.holdReady(r); },
        c::markAvailable);
    return fine;
  }
}
```
--- ext
**Concurrency**: two kiosks borrowing the last copy: the check-and-mark is atomic (one lock per branch here; per-copy locks or a conditional update in a database at scale).

**Holds**: expired holds (member didn't come in 2 days) are released by a scheduled job: next in queue or available.

**Extensions**: multiple branches and transfers, e-books with concurrent-loan licences, renewals, digital notifications.

**Tests**: limits per member type; fines with a fake clock (cap); return hands copy to the next reservation; expired hold releases.
--- variants
Q: Several branches; books can be transferred.
A: Copies belong to a branch; reservations can be fulfilled from any branch with a transfer state; branch-level locking.
Q: E-books with 5 concurrent licences.
A: A licence pool per e-book (semaphore-like count), loans expire automatically.
Q: Fines differ for students and staff.
A: FinePolicy per member type (strategy lookup).
--- steer
Q: Two people borrow the last copy simultaneously.
A: Atomic check-and-mark; lock or conditional update.
Q: What happens on return when someone is waiting?
A: Hold the copy for the first reservation; notify; expire after 2 days.
Q: Change fine rules.
A: FinePolicy strategy.
--- pitfalls
- Treating Book and BookCopy as the same thing
- Fine calculation duplicated in several places
- Holds that never expire
- A god LibraryManager with all logic
--- level
- **L4**: entities and borrow/return with limits.
- **L5**: book vs copy, reservation queue with holds and expiry, policies as strategies, atomic borrow, fake-clock fine tests.
- **L6**: multi-branch transfers, e-book licences, persistence and reporting.
--- boxes
Book:class|isbn;title;authors|
BookCopy:class|barcode;status: CopyStatus|markOnLoan();holdFor(m, until);markAvailable()
Member:class|id;type: MemberType;finesDue|addLoan();addFine()
Loan:class|copy;member;borrowedAt;dueAt;returnedAt|close(at);fine(policy, today)
Reservation:class|member;book;createdAt|
LendingService:class|policies;repos;clock|borrow();giveBack();reserve()
FinePolicy:interface||fine(loan, today): Money
LoanPolicy:interface||limit(type);period(type)
--- rels
BookCopy>Book:has:copy of
Loan>BookCopy:has
Loan>Member:has
Reservation>Book:has
LendingService>FinePolicy:uses
LendingService>LoanPolicy:uses
LendingService>Loan:uses:creates
--- prereqs
ood-requirements, class-diagrams, ood-core-code, encapsulation, srp-ocp, dip-di
--- paths
- [deep] Borrow a copy :: Member limits, fines threshold, copy status checks, loan creation; book vs copy distinction.
  - Two kiosks borrow the last copy at once :: Atomic check-and-mark (lock or conditional update).
- [deep] Return with a waiting reservation :: Fine calculation; hold for first in queue; notify; expiry job.
  - The member never collects the hold :: Scheduled expiry; next in queue or available.
- [variation] Different fine and loan rules per member type :: Policy strategies keyed by member type.
- [variation] E-books with licence limits :: Licence pool per title; auto-expiring loans.
- [deep] Test the fines :: Fake clock; boundary days; cap.

=== d-lld-notification
title: Notification service (notify me)
topic: patterns-behavioral
tier: 1
est: 45
prompt: Design an in-process notification library that sends messages to users over email, SMS and push, respects user preferences and quiet hours, and supports "notify me when this item is back in stock".
--- words
- **Channel**: a way to deliver a message (email, SMS, push).
- **Template**: a message text with placeholders filled per user.
- **Preferences**: which channels a user allows for which kinds of messages; quiet hours.
- **Subscription**: a user's request to be told when an event happens (back in stock).
--- flow
1. **0–5**: clarify: channels, message types (transactional vs marketing), preferences, quiet hours, retries, rate limits, back-in-stock subscriptions.
2. **5–12**: classes: NotificationService, Notification, Channel (interface), ChannelFactory, PreferenceService, TemplateRenderer, StockSubject + subscribers.
3. **12–30**: code send flow: resolve preferences → render → deliver via channel adapters with retries; back-in-stock observer.
4. **30–45**: failures, rate limits, async delivery, dedup, tests.
--- req
**Use cases**: send a notification of a type to a user (e.g. ORDER_SHIPPED); choose channels by preference and type; render templates with data; respect quiet hours (except urgent); retry failed sends; "notify me" when a product is back in stock (one-shot).

**Non-functional**: callers don't wait for slow providers; no duplicate sends on retry; adding a channel doesn't change the service.
--- model
- `Notification(id, userId, NotificationType, Map<String, Object> data, Priority)`.
- `Channel` interface: `send(Recipient, RenderedMessage)`; adapters `EmailChannel`, `SmsChannel`, `PushChannel`.
- `ChannelRegistry` (factory) by `ChannelType`.
- `PreferenceService`: allowed channels per type, quiet hours, contact details.
- `TemplateRenderer`: per type and channel.
- `NotificationService`: orchestration; `DeliveryQueue` + workers; `RetryPolicy`.
- `StockSubject` per product with a set of waiting users; `BackInStockNotifier` observer.
--- patterns
- **Strategy/adapter** for channels; **factory/registry** to pick them; **observer** for stock events; **producer–consumer** for async delivery; **decorator** for retries and rate limits around channels; **template method** for rendering.
--- code
```java
final class NotificationService {
  void notify(Notification n) {
    Preferences p = prefs.of(n.userId());
    for (ChannelType ct : p.channelsFor(n.type())) {
      if (p.inQuietHours(clock.instant()) && n.priority() != Priority.URGENT) { scheduler.deferUntil(p.quietEnd(), n, ct); continue; }
      RenderedMessage m = templates.render(n.type(), ct, n.data());
      Delivery d = new Delivery(n.id() + ":" + ct, p.contact(ct), m, ct);   // id doubles as dedup key
      if (!queue.offer(d)) metrics.dropped(ct);                              // bounded; never block callers
    }
  }
}

final class DeliveryWorker implements Runnable {
  public void run() {
    while (!Thread.currentThread().isInterrupted()) {
      Delivery d = queue.take();
      if (!sentLog.markIfNew(d.id())) continue;                              // idempotency
      retry.run(() -> registry.get(d.channel()).send(d.recipient(), d.message()));
    }
  }
}

final class BackInStock implements StockListener {
  public void changed(ProductId p, int before, int after) {
    if (before == 0 && after > 0) for (UserId u : waitlist.drain(p))         // one-shot subscriptions
      service.notify(new Notification(ids.next(), u, NotificationType.BACK_IN_STOCK, Map.of("product", p), Priority.NORMAL));
  }
}
```
--- ext
**Failures**: provider down → retries with backoff, then fall back to another channel for urgent messages; dead-letter for inspection.

**Rate limits**: per user (no more than N marketing messages a day) and per provider (API quotas) as decorators.

**Durability**: in-memory queues lose work on crash: for important notifications, persist deliveries (outbox) and process with at-least-once + dedup by delivery id.

**Tests**: fake channels recording sends; quiet hours with a fake clock; dedup on retries; back-in-stock fires once per subscription.
--- variants
Q: Digest mode: group low-priority notifications into one daily email.
A: Buffer per user and type; a scheduled job renders a digest; preferences choose digest vs immediate.
Q: A provider's API is down for an hour.
A: Breaker on the channel; queue grows within bounds; failover provider; alert.
Q: Millions of back-in-stock subscribers for a hot item.
A: Fan out in batches through the queue; rate-limit to protect providers; HLD notification system.
--- steer
Q: Add WhatsApp.
A: New Channel adapter registered; nothing else changes.
Q: Don't send twice on retry.
A: Delivery id as dedup key; sent log.
Q: Notify me when back in stock.
A: Observer on stock changes; one-shot waitlist; transition 0 → positive.
--- pitfalls
- Calling providers synchronously from business code
- if/else on channel type in the service
- Retrying without idempotency (duplicate SMS)
- Keeping back-in-stock subscriptions after notifying
--- level
- **L4**: channels as classes, send by preference.
- **L5**: channel strategy + registry, async bounded delivery, retries with dedup, quiet hours, observer for stock, tests.
- **L6**: digests, provider failover and quotas, durable outbox, scale-out considerations.
--- boxes
NotificationService:class|prefs;templates;queue|notify(n)
Channel:interface||send(recipient, msg)
EmailChannel:class||send()
SmsChannel:class||send()
ChannelRegistry:class|channels: Map|get(type): Channel
PreferenceService:class||channelsFor(type);inQuietHours()
DeliveryWorker:class|queue;retry;sentLog|run()
BackInStock:class|waitlist|changed(product, before, after)
--- rels
EmailChannel>Channel:implements
SmsChannel>Channel:implements
ChannelRegistry>Channel:has
NotificationService>PreferenceService:uses
NotificationService>DeliveryWorker:uses:enqueues for
DeliveryWorker>ChannelRegistry:uses
BackInStock>NotificationService:uses
--- prereqs
dip-di, factory-patterns, adapter-facade, observer-pattern
--- paths
- [deep] Route a notification to the right channels :: Preferences per type; channel registry; templates per channel.
  - Add a new channel (WhatsApp) :: New adapter + registration; no changes to the service.
- [deep] Notify me when back in stock :: Observer on stock transitions 0 → positive; one-shot waitlist; fan-out through the queue.
- [failure] The SMS provider is slow or down :: Async bounded queue; retries with backoff; breaker; failover provider for urgent messages.
  - Retries send duplicate SMS :: Delivery ids as idempotency keys; sent log.
- [variation] Quiet hours and digests :: Deferral scheduling; per-user digest buffers.
- [deep] How would you test it? :: Recording fake channels; fake clock; dedup tests.

=== d-lld-atm
title: ATM
topic: patterns-behavioral
tier: 1
est: 45
prompt: Design the software of an ATM: card and PIN authentication, balance enquiry, cash withdrawal with the right mix of notes, and deposits, talking to the bank's systems.
--- words
- **Session**: one customer's interaction from card insertion to ejection.
- **Cassette**: a container of notes of one denomination inside the ATM.
- **Note dispensing**: choosing how many notes of each denomination to give.
- **Bank gateway**: the interface to the bank that verifies PINs and debits accounts.
--- flow
1. **0–5**: clarify: operations (balance, withdraw, deposit, change PIN), denominations, daily limits, PIN attempts, offline behaviour, hardware failures.
2. **5–12**: classes: ATM (context with states), CardReader, Keypad, Screen, CashDispenser, Cassette, BankGateway, Transaction types.
3. **12–30**: state machine for the session; withdrawal flow with debit-then-dispense and reversal; note selection via a chain of handlers.
4. **30–45**: failures (dispenser jam, network down), concurrency with the bank, audit, tests.
--- req
**Use cases**: insert card; enter PIN (3 attempts, then retain card); check balance; withdraw an amount (multiple of the smallest note, within limits and cash available); deposit; eject card; operator refills cash.

**Rules**: never dispense without a successful debit; if dispensing fails after debit, reverse the debit; audit every step.
--- model
- `ATM` context with `AtmState` (Idle, CardInserted, Authenticated, Transaction, OutOfService).
- Hardware abstractions: `CardReader`, `Keypad`, `Screen`, `CashDispenser` (cassettes), `DepositSlot`.
- `BankGateway` (adapter to the bank): `verifyPin`, `balance`, `debit(account, amount, txnId)`, `reverse(txnId)`.
- `Transaction` (sealed: Withdrawal, Deposit, BalanceEnquiry) with ids for idempotency.
- `NoteHandler` chain (2000 → 500 → 200 → 100) computing the note mix.
--- patterns
- **State** for the session; **chain of responsibility** for note dispensing; **adapter/facade** for the bank and hardware; **command** for transactions (audit log); **template method** for transaction steps.
--- code
```java
abstract class NoteHandler {
  private final int denom; private NoteHandler next;
  NoteHandler then(NoteHandler n) { next = n; return n; }
  Map<Integer, Integer> plan(int amount, Map<Integer, Integer> available, Map<Integer, Integer> out) {
    int use = Math.min(amount / denom, available.getOrDefault(denom, 0));
    if (use > 0) out.put(denom, use);
    int rest = amount - use * denom;
    if (rest == 0) return out;
    if (next == null) throw new CannotDispense(amount);
    return next.plan(rest, available, out);
  }
}

final class WithdrawalFlow {
  void withdraw(Session s, int amount) {
    Map<Integer, Integer> notes = chain.plan(amount, dispenser.inventory(), new TreeMap<>());   // check cash first
    TxnId id = TxnId.random();
    bank.debit(s.account(), Money.of(amount), id);                 // may throw: nothing dispensed
    try { dispenser.dispense(notes); audit.log(id, "DISPENSED", notes); }
    catch (DispenseFailure e) { bank.reverse(id); audit.log(id, "REVERSED", e); throw e; }
  }
}
```
--- ext
**Greedy note selection** can fail with limited cassettes (e.g. 600 with only 500s and 200s: greedy takes 500 and can't finish, but 3×200 works): fall back to a small search/DP over denominations when greedy fails.

**Failures**: network down → offline mode only for balance from cache? (usually service unavailable); dispenser jam → reverse debit, OutOfService; card retained after 3 wrong PINs.

**Concurrency**: one session per ATM at a time; the bank handles concurrent debits on the same account (two ATMs, a joint account) with its own transactions; debits are idempotent by txn id.

**Tests**: state transitions per event; note plans; reversal on dispense failure (fake dispenser that throws); PIN lockout.
--- variants
Q: Cardless withdrawal with a code from the bank app.
A: New authentication strategy (code + phone number) leading to the same Authenticated state.
Q: The ATM loses network mid-transaction.
A: Debit outcome unknown → retry status check by txn id; never dispense on unknown; reconcile later.
Q: Recommend a note mix the customer asks for.
A: Customer-chosen mix validated against inventory; fallback to default chain.
--- steer
Q: Debit or dispense first?
A: Debit first (idempotent id), dispense, reverse on dispense failure.
Q: Which notes to give?
A: Chain of handlers by denomination; fallback search when greedy fails.
Q: Wrong PIN three times.
A: State machine counts attempts; retain card; notify bank.
--- pitfalls
- Dispensing before the debit is confirmed
- No reversal path when the dispenser fails
- Greedy note selection without checking feasibility
- Session logic as flags instead of states
--- level
- **L4**: card/PIN/withdraw flow with classes for hardware.
- **L5**: state machine, debit-dispense-reverse with idempotent ids, note chain with feasibility, hardware abstractions, tests with fakes.
- **L6**: unknown-outcome handling and reconciliation, offline policies, security (PIN never leaves encrypted hardware).
--- boxes
ATM:class|state: AtmState;session|insertCard();enterPin();withdraw();eject()
AtmState:interface||insertCard();enterPin();select()
BankGateway:interface||verifyPin();debit(acc, amt, id);reverse(id)
CashDispenser:class|cassettes|dispense(notes);inventory()
NoteHandler:abstract|denom;next|plan(amount, available)
WithdrawalFlow:class|bank;dispenser;chain|withdraw(session, amount)
Transaction:interface|id|
--- rels
ATM>AtmState:has
ATM>WithdrawalFlow:uses
WithdrawalFlow>BankGateway:uses
WithdrawalFlow>CashDispenser:uses
WithdrawalFlow>NoteHandler:uses
NoteHandler>NoteHandler:has:next
--- prereqs
behaviour-diagrams, encapsulation, adapter-facade, state-pattern, chain-of-responsibility
--- paths
- [deep] Model the session :: State pattern: Idle, CardInserted, Authenticated, Transaction, OutOfService.
  - Three wrong PINs :: Attempt counter in state; retain card; notify bank.
- [deep] Withdraw cash safely :: Plan notes first; idempotent debit; dispense; reverse on failure; audit.
- [deep] Which notes to dispense? :: Chain of handlers by denomination; greedy with feasibility fallback.
  - Greedy fails with limited 500s and 200s :: Small search/DP over counts.
- [failure] Network drops after the debit request :: Unknown outcome; query by txn id; never dispense on unknown.
- [failure] The dispenser jams :: Reverse debit; OutOfService; alert operator.

=== d-lld-car-rental
title: Car rental system
topic: lld-quality
tier: 2
est: 45
prompt: Design a car rental system: customers search available cars by location and dates, reserve, pick up, return, and pay based on duration, distance and extras; the fleet spans several branches.
--- words
- **Reservation**: a booking of a car (or car class) for a date range at a branch.
- **Vehicle class**: economy, SUV, luxury; customers usually book a class, not a specific car.
- **Date range overlap**: two bookings of the same car whose time intervals intersect.
- **Pricing rule**: per day, per km, late-return fees, insurance extras.
--- flow
1. **0–5**: clarify: book specific car or class, pick-up/return at different branches, pricing components, cancellation, damage/fuel, concurrency.
2. **5–12**: entities: Branch, Vehicle, VehicleClass, Customer, Reservation (with states), Rental, Invoice; PricingStrategy; AvailabilityIndex.
3. **12–30**: code availability search, reserve with conflict check, return and invoice.
4. **30–45**: concurrency on the last car, one-way rentals, late returns, tests.
--- req
**Use cases**: search cars (or classes) available at a branch for [start, end); reserve; cancel (fees by time); pick up (assign a specific car if booked by class); return (possibly at another branch); compute invoice (days, km, extras, late fees); maintenance blocks.

**Rules**: no overlapping reservations per car; a class booking guarantees some car of that class; late return beyond a grace period charges extra.
--- model
- `Branch`, `Vehicle(id, VehicleClass, branch, odometer, status)`, `Customer`.
- `DateRange(start, end)` value object (half-open).
- `Reservation(id, customer, class or vehicle, branch, range, ReservationStatus)`; statuses RESERVED, PICKED_UP, RETURNED, CANCELLED, NO_SHOW.
- `VehicleCalendar` per vehicle (sorted map of ranges) for conflicts.
- `PricingStrategy` (base daily + per km + extras + late fee rules), `Invoice`.
- `RentalService` (use cases), `Clock`.
--- patterns
- **Strategy** for pricing and for vehicle assignment; **state** (enum) for reservations; **value objects** for date ranges and money; **observer** for notifications.
--- code
```java
final class VehicleCalendar {
  private final TreeMap<Instant, Reservation> byStart = new TreeMap<>();
  synchronized boolean tryReserve(Reservation r) {
    DateRange d = r.range();
    var before = byStart.floorEntry(d.start());
    if (before != null && before.getValue().range().overlaps(d)) return false;
    var after = byStart.ceilingEntry(d.start());
    if (after != null && after.getValue().range().overlaps(d)) return false;
    byStart.put(d.start(), r);
    return true;
  }
}

final class RentalService {
  Reservation reserve(CustomerId c, VehicleClass cls, BranchId b, DateRange range) {
    for (Vehicle v : fleet.at(b, cls)) {                              // assignment strategy may order these
      Reservation r = Reservation.forVehicle(ids.next(), c, v, b, range);
      if (calendars.of(v).tryReserve(r)) { repo.save(r); return r; }
    }
    throw new NoAvailability(cls, b, range);
  }

  Invoice giveBack(ReservationId id, long odometer, BranchId returnedAt) {
    Reservation r = repo.get(id); r.markReturned(clock.instant());
    return pricing.invoice(r, odometer - r.startOdometer(), clock.instant(), returnedAt);
  }
}
```
--- ext
**Concurrency**: atomic per-vehicle check-and-insert; class bookings with many cars try each car in turn; at scale, a database with exclusion constraints or conditional inserts.

**One-way rentals**: the vehicle's future availability moves to the return branch; drop-off fees.

**Late returns**: the next reservation on that car may conflict: reassign another car of the class, or notify.

**Tests**: overlap rules (back-to-back allowed); concurrent reservations for the last car → one wins; invoice for days/km/late fees with a fake clock.
--- variants
Q: Customers book a class, and the specific car is chosen at pick-up.
A: Class-level capacity per day (count of cars minus bookings) checked atomically; assign a concrete car at pick-up.
Q: Dynamic pricing by demand.
A: PricingStrategy using utilisation forecasts; price locked at reservation time.
Q: Car breaks down during a rental.
A: Replacement flow: close the rental segment, open a new one with another car, pro-rate pricing.
--- steer
Q: Prevent double booking.
A: Per-vehicle calendar with atomic overlap check.
Q: Pricing with km, days, extras, late fee.
A: PricingStrategy composing components; invoice line items.
Q: Different return branch.
A: Vehicle's location updates; availability shifts; one-way fee.
--- pitfalls
- Checking availability and booking in separate steps
- Closed date ranges making same-day turnaround conflict
- Pricing hard-coded in the reservation class
- Ignoring the next booking when a car returns late
--- level
- **L4**: entities, search, reserve, return.
- **L5**: per-vehicle calendars with atomic reservation, pricing strategy with components, reservation states, late-return handling, tests.
- **L6**: class-level capacity, dynamic pricing, fleet rebalancing across branches.
--- boxes
RentalService:class|fleet;calendars;pricing;clock|search();reserve();pickUp();giveBack()
Vehicle:class|id;class: VehicleClass;branch;odometer|
Reservation:class|id;customer;vehicle;range: DateRange;status|markPickedUp();markReturned()
DateRange:class|start;end|overlaps(other)
VehicleCalendar:class|byStart: TreeMap|tryReserve(r)
PricingStrategy:interface||invoice(res, km, returnedAt, branch): Invoice
Branch:class|id;address|
--- rels
RentalService>VehicleCalendar:uses
RentalService>PricingStrategy:uses
Reservation>Vehicle:has
Reservation>DateRange:has
Vehicle>Branch:has:located at
VehicleCalendar>Reservation:has
--- prereqs
ood-requirements, strategy-template, state-pattern, modelling-data
--- paths
- [deep] Search and reserve without double booking :: Half-open ranges; per-vehicle sorted calendars; atomic check-and-insert.
  - Two customers grab the last SUV :: Lock per vehicle or conditional insert; only one succeeds.
- [deep] Compute the invoice :: Strategy: days (rounded rules), km, extras, late fee; line items; fake-clock tests.
- [variation] Book by class, assign the car at pick-up :: Daily class capacity checked atomically; assignment strategy.
- [failure] A car comes back late and the next customer is waiting :: Reassign another car of the class; notify; late fee.
- [variation] Return at another branch :: Location update; availability shift; drop-off fee.

=== d-lld-cart-coupons
title: Shopping cart with coupons and offers
topic: lld-quality
tier: 1
est: 45
prompt: Design a shopping cart that supports adding products, quantity limits, and stacking coupons and offers (percentage off, flat off, buy X get Y, category discounts, free shipping), producing a clear price breakdown.
--- words
- **Coupon**: a code the customer enters for a discount. **Offer**: a discount applied automatically.
- **Stacking**: applying several discounts in a defined order.
- **Price breakdown**: subtotal, each discount line, shipping, tax, total.
- **Eligibility**: conditions for a discount (minimum spend, category, first order, user segment).
--- flow
1. **0–5**: clarify: discount types, stacking rules (order, exclusivity, max discount), per-item vs per-cart, tax and shipping, coupon usage limits, concurrency on limited coupons.
2. **5–12**: classes: Cart, CartItem, Product, Money, Promotion (interface), PromotionEngine, PriceBreakdown, CouponRepository.
3. **12–30**: code promotions as strategies applied in priority order to a breakdown.
4. **30–45**: exclusivity, rounding and allocation per item (for refunds), usage limits under concurrency, tests.
--- req
**Use cases**: add/remove/update items with stock and per-customer limits; apply a coupon code (validate eligibility and expiry); auto-apply offers; compute the price breakdown; checkout locks prices.

**Rules**: discounts never make a line negative; some coupons are exclusive; a coupon may be used once per user and N times in total; discount allocated to items proportionally (needed for partial refunds).
--- model
- `Cart(userId, items: Map<Sku, CartItem>, appliedCodes)`, `CartItem(product, qty, unitPrice)`.
- `Promotion` interface: `priority()`, `exclusive()`, `applies(CartContext)`, `apply(CartContext, PriceBreakdown) → Adjustment`.
- Implementations: `PercentOff`, `FlatOff`, `BuyXGetY`, `CategoryDiscount`, `FreeShipping`, `FirstOrder`.
- `PromotionEngine`: collects applicable promotions, orders, handles exclusivity and caps, produces `PriceBreakdown` with lines.
- `CouponService`: validates codes and usage limits (atomic redemption at checkout).
--- patterns
- **Strategy** per promotion type; **chain/pipeline** applying them in order; **decorator**-like adjustments on the breakdown; **interpreter**-style eligibility rules for marketing-configured conditions; **null object** for "no promotion".
--- code
```java
interface Promotion {
  int priority(); boolean exclusive();
  boolean applies(CartContext ctx);
  Adjustment apply(CartContext ctx, PriceBreakdown current);
}

final class BuyXGetY implements Promotion {
  private final Sku sku; private final int buy, free;
  public Adjustment apply(CartContext ctx, PriceBreakdown b) {
    CartItem it = ctx.cart().item(sku);
    long freeUnits = (it.qty() / (buy + free)) * free;
    return Adjustment.onItem(sku, it.unitPrice().times(freeUnits), "Buy " + buy + " get " + free);
  }
}

final class PromotionEngine {
  PriceBreakdown price(CartContext ctx, List<Promotion> candidates) {
    PriceBreakdown b = PriceBreakdown.of(ctx.cart());                 // subtotal + shipping
    List<Promotion> ps = candidates.stream().filter(p -> p.applies(ctx)).sorted(Comparator.comparingInt(Promotion::priority)).toList();
    Optional<Promotion> excl = ps.stream().filter(Promotion::exclusive).findFirst();
    for (Promotion p : excl.map(List::of).orElse(ps)) b = b.with(p.apply(ctx, b).cappedAt(b.remaining()));   // never below zero
    return b.allocateDiscountsToItems();                               // per-item shares for refunds
  }
}
```
--- ext
**Order matters**: percentage then flat vs flat then percentage give different totals: define and document the order (priority) and test it.

**Usage limits**: "first 1,000 users" coupons need atomic redemption at checkout (`AtomicInteger` or a conditional database update), not at "apply" time; release on cancelled orders.

**Allocation**: distribute cart-level discounts to items by value (with paisa remainders) so partial returns refund the right amount.

**Tests**: each promotion alone; stacking order; exclusivity; caps; never negative; allocation sums; concurrent redemption of a limited coupon.
--- variants
Q: Marketing wants to define new offers without deploys.
A: Data-driven promotions: eligibility as an expression tree (interpreter/CEL) + a small set of parameterised actions.
Q: Partial refund of one item.
A: Use per-item allocated discounts; refund line price minus its share.
Q: Flash sale coupon limited to 1,000 uses with 50,000 users trying.
A: Atomic counter/conditional update at checkout; fast rejection; idempotent per user.
--- steer
Q: Add a new kind of discount.
A: New Promotion class; engine unchanged.
Q: Percent then flat, or flat then percent?
A: Defined priority order; tests lock it in.
Q: Limited-use coupon under heavy concurrency.
A: Atomic redemption at checkout.
--- pitfalls
- A switch over coupon types in the cart
- Discounts that can push totals negative
- Validating usage limits at apply time but not at checkout
- No per-item allocation, making refunds wrong
--- level
- **L4**: cart with items and a couple of discount types.
- **L5**: promotion strategies with ordering, exclusivity and caps, money correctness and allocation, atomic redemption, tests.
- **L6**: data-driven rule engine, experimentation, cross-service pricing consistency.
--- boxes
Cart:class|userId;items;appliedCodes|add(sku, qty);remove(sku)
CartItem:class|product;qty;unitPrice|lineTotal()
Promotion:interface|priority;exclusive|applies(ctx);apply(ctx, breakdown)
PercentOff:class||apply()
BuyXGetY:class|sku;buy;free|apply()
PromotionEngine:class||price(ctx, promos): PriceBreakdown
PriceBreakdown:class|subtotal;lines;shipping;total|with(adj);allocateDiscountsToItems()
CouponService:class||validate(code, user);redeem(code, user)
--- rels
Cart>CartItem:has:0..*
PercentOff>Promotion:implements
BuyXGetY>Promotion:implements
PromotionEngine>Promotion:uses
PromotionEngine>PriceBreakdown:uses:produces
CouponService>Promotion:uses:looks up
--- prereqs
strategy-template, decorator-proxy, chain-of-responsibility, modelling-data
--- paths
- [deep] Apply several promotions to a cart :: Promotion strategies; priority order; exclusivity; caps; breakdown lines.
  - The order changes the total :: Define and document priority; tests for both orders.
- [deep] Money correctness :: Minor units; never negative; allocation of cart discounts to items.
  - Partial refund of one item :: Refund using that item's allocated discount.
- [failure] 50,000 users race for a 1,000-use coupon :: Atomic redemption at checkout; release on cancel; idempotent per user.
- [variation] Marketing defines offers without deploys :: Data-driven eligibility expressions + parameterised actions.

=== d-lld-spreadsheet
title: Spreadsheet with formulas
topic: patterns-behavioral
tier: 2
est: 45
prompt: Design the core of a spreadsheet: cells hold values or formulas referencing other cells (=A1+B2*2, =SUM(A1:A10)); changing a cell recomputes everything that depends on it; cycles are rejected.
--- words
- **Cell reference**: an address like B3 (column letter, row number).
- **Formula**: an expression over numbers, references, ranges and functions.
- **Dependency graph**: which cells each cell reads (and, reversed, which cells depend on it).
- **Topological order**: an order where every cell comes after the cells it depends on.
- **Cycle**: A1 depends on B1 which depends on A1: impossible to evaluate.
--- flow
1. **0–5**: clarify: value types (numbers, strings), formula syntax, functions (SUM, AVG, MIN), ranges, error values (#REF!, #CYCLE!, #DIV/0!), size of sheet, undo.
2. **5–12**: classes: Sheet, Cell, CellRef, Expr (interpreter tree), Parser, DependencyGraph, Evaluator.
3. **12–30**: code parsing into an expression tree, evaluation, dependency tracking, recalculation in topological order, cycle detection.
4. **30–45**: incremental recalculation, errors, undo, large sheets, concurrency.
--- req
**Use cases**: set a cell to a number, text or formula; get a cell's displayed value; recompute dependants on change; reject (or mark) cycles; support ranges and a few functions; show errors for bad references or division by zero.

**Non-functional**: recalculation touches only affected cells; sheets of a million mostly empty cells (sparse storage).
--- model
- `CellRef(col, row)` value object with parsing ("B3").
- `Cell(ref, raw input, Expr parsed, cached value)`; sparse `Map<CellRef, Cell>` in `Sheet`.
- `Expr` sealed interface (interpreter): `Num`, `Ref`, `Range`, `BinOp`, `Func(name, args)`; `eval(EvalContext)`; `refs()` lists dependencies.
- `Parser` (recursive descent) → `Expr`.
- `DependencyGraph`: `dependsOn: Map<CellRef, Set<CellRef>>`, `dependents: Map<CellRef, Set<CellRef>>`.
--- patterns
- **Interpreter** (expression tree) + **composite** structure; **visitor** or pattern matching for evaluation and reference extraction.
- **Observer**-like propagation via the dependency graph; **command** for undo (old raw value).
- **Flyweight**/sparse storage for empty cells.
--- code
```java
sealed interface Expr permits Num, Ref, Range, BinOp, Func {
  double eval(Sheet s);
  Set<CellRef> refs();
}
record BinOp(char op, Expr l, Expr r) implements Expr {
  public double eval(Sheet s) {
    double a = l.eval(s), b = r.eval(s);
    return switch (op) { case '+' -> a + b; case '-' -> a - b; case '*' -> a * b;
      case '/' -> { if (b == 0) throw new CellError("#DIV/0!"); yield a / b; } default -> throw new IllegalStateException(); };
  }
  public Set<CellRef> refs() { Set<CellRef> s = new HashSet<>(l.refs()); s.addAll(r.refs()); return s; }
}

final class Sheet {
  void set(CellRef at, String raw) {
    Expr e = parser.parse(raw);
    Set<CellRef> deps = e.refs();
    if (graph.wouldCycle(at, deps)) throw new CycleException(at);        // DFS from deps looking for `at`
    graph.setDependencies(at, deps);
    cells.put(at, new Cell(at, raw, e));
    for (CellRef c : graph.topoOrderFrom(at)) cells.get(c).recompute(this);   // at and its transitive dependents
  }
}
```
--- ext
**Recalculation**: collect `at` plus all transitive dependents (BFS over `dependents`), order them topologically (Kahn's algorithm within that subgraph), recompute each once. Cost proportional to affected cells, not the sheet.

**Cycles**: before accepting a formula, DFS from its references along `dependsOn`; if it reaches the cell itself, reject (or store and show #CYCLE!).

**Ranges**: SUM(A1:A1000) depends on 1,000 cells; store range dependencies compactly (an interval index) to avoid huge sets.

**Undo**: a command storing the previous raw input.

**Tests**: arithmetic and precedence; update propagation chain; diamond dependencies recomputed once; cycle rejection; #DIV/0! propagation.
--- variants
Q: Several users edit the same sheet.
A: Operations to a server; per-cell versioning or OT; recalculation on the server; HLD collaborative editor.
Q: Volatile functions like NOW() and RAND().
A: Mark volatile cells; recompute them (and dependents) on every recalculation tick.
Q: A sheet with 10 million formulas.
A: Compile expressions, cache parsed trees, parallel recalculation by independent levels of the DAG.
--- steer
Q: How do you parse formulas?
A: Recursive descent into an expression tree (interpreter).
Q: What recomputes when A1 changes?
A: Transitive dependents in topological order.
Q: =A1 in A1.
A: Cycle detection by DFS before accepting.
--- pitfalls
- Re-evaluating the whole sheet on every change
- Recomputing a cell several times in a diamond dependency
- Storing a dense 2D array for a sparse sheet
- No cycle detection (infinite recursion)
--- level
- **L4**: cells with values and simple formulas, recursive evaluation.
- **L5**: expression tree with a parser, dependency graph with incremental topological recalculation, cycle detection, error values, sparse storage.
- **L6**: range indexing, volatile functions, parallel recalculation, collaboration.
--- boxes
Sheet:class|cells: Map<CellRef, Cell>;graph;parser|set(ref, raw);get(ref)
Cell:class|ref;raw;expr;value|recompute(sheet)
CellRef:class|col;row|parse(s)
Expr:interface||eval(sheet);refs()
BinOp:class|op;l;r|eval()
Func:class|name;args|eval()
Parser:class||parse(raw): Expr
DependencyGraph:class|dependsOn;dependents|wouldCycle();topoOrderFrom(ref)
--- rels
Sheet>Cell:has
Sheet>DependencyGraph:has
Sheet>Parser:uses
Cell>Expr:has
BinOp>Expr:implements
Func>Expr:implements
BinOp>Expr:has:operands
--- prereqs
composite-bridge-flyweight, observer-pattern, command-memento, iterator-visitor, mediator-null-object
--- paths
- [deep] Parse and evaluate formulas :: Recursive descent parser; expression tree; operator precedence; functions.
- [deep] Recompute after a change :: Dependents graph; transitive set; topological order; each cell once.
  - A diamond: B and C depend on A, D on both :: Topological order recomputes D once after B and C.
- [failure] A user enters a circular reference :: DFS before accepting; #CYCLE! or reject.
- [variation] SUM over 100,000-cell ranges :: Range dependencies stored as intervals; incremental sums.
- [variation] Undo a cell edit :: Command with the previous raw input; recompute dependents.

=== d-lld-qa-site
title: Q&A site (Stack Overflow)
topic: lld-quality
tier: 2
est: 45
prompt: Design the core of a Q&A site: users ask questions with tags, post answers and comments, vote, accept an answer, earn reputation that unlocks privileges, and search questions.
--- words
- **Reputation**: points earned from votes and accepted answers; it unlocks privileges (voting down, editing, closing).
- **Vote**: +1/−1 on a post; one per user per post, changeable.
- **Accepted answer**: the answer the asker marks as solving the question.
- **Bounty**: reputation offered to attract answers.
--- flow
1. **0–5**: clarify: posts (question, answer, comment), voting rules, reputation rules, privileges by reputation, tags and search, moderation (close, flag).
2. **5–12**: classes: User, Post (abstract) → Question, Answer; Comment, Vote, Tag; ReputationPolicy; PrivilegeChecker; services.
3. **12–30**: code voting with idempotent changes and reputation events; accept answer; privilege checks.
4. **30–45**: concurrency on votes, search index, notifications, abuse (voting rings), layering.
--- req
**Use cases**: ask a question with tags; answer; comment; up/down vote (change or retract); accept an answer; reputation changes (+10 answer upvote, +5 question upvote, −2 downvote received, +15 accepted); privileges (comment at 50, downvote at 125, edit at 2,000); search by text and tag; close/reopen questions; notifications to askers and watchers.

**Rules**: no self-votes; one vote per user per post; reputation never below 1; votes reversible.
--- model
- `User(id, reputation)`; `Post` (abstract: id, author, body, score, createdAt) → `Question(title, tags, status, acceptedAnswerId)`, `Answer(questionId)`; `Comment`.
- `Vote(userId, postId, value)` with uniqueness per (user, post).
- `ReputationPolicy` strategy: events → points. `ReputationEvent` (UPVOTED, DOWNVOTED, ACCEPTED, BOUNTY).
- `Privilege` enum with thresholds; `PrivilegeChecker`.
- Services: `PostService`, `VoteService`, `SearchService` (inverted index), `Notifier`.
--- patterns
- **Strategy** for reputation rules; **observer/event** for reputation and notifications on votes/accepts; **state** for question lifecycle (open, closed, deleted); **layering** (controllers/services/repositories); **proxy** for privilege checks.
--- code
```java
final class VoteService {
  synchronized void vote(UserId voter, PostId postId, int value) {       // value ∈ {−1, 0, +1}; 0 retracts
    Post p = posts.get(postId);
    if (p.author().equals(voter)) throw new SelfVote();
    if (value < 0) privileges.require(voter, Privilege.DOWNVOTE);
    int previous = votes.get(voter, postId).orElse(0);
    if (previous == value) return;                                     // idempotent
    votes.put(voter, postId, value);
    p.adjustScore(value - previous);
    events.publish(new VoteChanged(postId, p.author(), voter, previous, value));   // reputation listener applies delta
  }
}

final class ReputationListener {
  void on(VoteChanged e) {
    int delta = policy.points(e.postType(), e.previous(), e.current());  // e.g. answer: +10 up, −2 down
    users.adjustReputation(e.author(), delta);                          // clamps at 1
  }
}
```
--- ext
**Concurrency**: many users voting on the same post: per-post locking or atomic score updates; vote uniqueness enforced by a unique key (user, post).

**Search**: inverted index over titles/bodies/tags with ranking (votes, recency); updated on post changes (async).

**Abuse**: detect voting rings (pairs of users repeatedly voting for each other) and reverse; rate-limit votes.

**Tests**: self-vote rejected; vote change from +1 to −1 applies the right delta; reputation floor; privilege thresholds; accept only by the asker.
--- variants
Q: Bounties.
A: Asker escrows reputation; awarded to an answer within a time window; expiry rules.
Q: Edits with history and rollback.
A: Revision list per post (command/memento); suggested edits for low-reputation users go through review.
Q: Hot questions list.
A: Score from votes, answers and age; recomputed periodically; cached.
--- steer
Q: Change a vote from up to down.
A: Store per (user, post) vote; apply the difference; idempotent.
Q: Reputation rules change.
A: ReputationPolicy strategy; events recomputable.
Q: Privileges by reputation.
A: Thresholds in one checker; enforced at the service boundary.
--- pitfalls
- Incrementing scores without tracking who voted (double votes)
- Reputation computed in several places
- Allowing users to vote on their own posts
- Search by scanning all posts
--- level
- **L4**: posts, votes, accept, basic reputation.
- **L5**: idempotent vote changes, event-driven reputation with a policy, privilege checks, uniqueness under concurrency, search index sketch.
- **L6**: abuse detection, bounties and revisions, ranking and caching at scale.
--- boxes
Post:abstract|id;author;body;score|adjustScore(d)
Question:class|title;tags;status;acceptedAnswer|accept(answer)
Answer:class|questionId|
User:class|id;reputation|
Vote:class|userId;postId;value|
VoteService:class|votes;posts;events|vote(voter, post, value)
ReputationPolicy:interface||points(type, prev, curr)
PrivilegeChecker:class||require(user, privilege)
--- rels
Question>Post:extends
Answer>Post:extends
Question>Answer:has:0..*
VoteService>Vote:uses
VoteService>PrivilegeChecker:uses
VoteService>ReputationPolicy:uses:via listener
Post>User:has:author
--- prereqs
class-diagrams, observer-pattern, state-pattern, modelling-data, code-layers
--- paths
- [deep] Voting and reputation :: One vote per (user, post); apply differences; events update reputation via a policy.
  - A user changes an upvote to a downvote :: Delta −1−(+1) = −2 on score; reputation delta from the policy.
- [deep] Privileges by reputation :: Threshold enum; checks at service boundary; tests.
- [failure] Two users vote at the same moment :: Atomic score updates; unique (user, post) votes.
- [variation] Voting rings :: Detection of reciprocal patterns; reversal; rate limits.
- [variation] Search and hot questions :: Inverted index; ranking; periodic hot score.
