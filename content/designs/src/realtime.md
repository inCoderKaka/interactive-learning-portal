=== d-ride-hailing
est: 45
--- words
- **Location update**: each driver's phone sending its GPS position every few seconds.
- **Matching (dispatch)**: choosing which nearby driver gets a ride request.
- **Geo index / cell**: dividing the map into cells (geohash, S2, H3 hexagons) so "drivers near me" is a lookup of a few cells.
- **ETA (estimated time of arrival)**: how long a driver will take to reach the rider, computed on the road network, not as the crow flies.
- **Trip state machine**: the fixed steps a ride goes through: requested → matched → driver arriving → in progress → completed (or cancelled).
- **Surge pricing**: raising prices in an area when demand exceeds supply.
--- flow
1. **0–5, requirements**: riders request rides, see nearby drivers, get matched in seconds, track the driver live, pay at the end. Clarify: shared rides? scheduled rides? surge?
2. **5–10, estimates**: 5 M active drivers sending a location every 4 s ≈ 1.25 M updates/s; 20 M rides/day ≈ 230 requests/s (peaks much higher locally).
3. **10–15, API and data**: location stream, ride request, trip records, driver state.
4. **15–25, high level**: location service (in-memory geo index per city) ← driver updates; dispatch service queries nearby available drivers, ranks by ETA, offers the ride; trip service holds the state machine; tracking via WebSocket.
5. **25–40, deep dives**: the location index under 1 M writes/s, matching without double-booking a driver, ETA computation, surge, failure of a city's dispatcher.
6. **40–45, wrap**: payments, monitoring, regional isolation.
--- req
**Functional**
- Drivers go online and send their location continuously.
- Riders see nearby cars, request a ride, get a driver within seconds, and track the driver live.
- A trip progresses through clear states; fare computed at the end; payment charged.
- Cancellation, rating, trip history.

**Non-functional**
- **Fast matching**: a driver offered within a few seconds of the request.
- **High write rate** of locations, but each location matters only for seconds.
- **A driver is never given two rides at once**: correctness on assignment.
- **Highly available per city**: an outage in one city must not affect others.
- Location data is sensitive: privacy and retention limits.
--- est
- **Location updates**: 5 M online drivers ÷ 4 s ≈ **1.25 M writes/s** of ~100 bytes ≈ 125 MB/s. Kept in memory; only sampled history goes to storage.
- **Ride requests**: 20 M rides/day ≈ 230/s average, big city peaks of thousands per second.
- **Nearby-driver queries**: every rider app open shows cars nearby: maybe 50,000 queries/s.
- **Trips stored**: 20 M/day × 2 KB ≈ 40 GB/day; location traces for completed trips (for fares and disputes) much larger, compressed into cold storage.

These say: the location index must be in memory, partitioned by city/region; trips need a transactional store.
--- api
- Driver: `WS /driver/stream` sending `{lat, lng, heading, speed, ts}` every ~4 s; receiving ride offers; `POST /offers/{id}/accept`.
- Rider: `GET /drivers/nearby?lat&lng` (for the map), `POST /rides {pickup, dropoff, product}` → `{ride_id}`, then `WS /rides/{id}` for status and driver location.
- Trip: `POST /rides/{id}/start`, `/complete`, `/cancel`.

**Data**
- In memory, per city shard: `cell → set of available driver IDs` and `driver → {lat, lng, status, updated_at}`.
- `drivers` (profile, vehicle), `rides` (state, rider, driver, timestamps, fare) in a transactional DB; ride events to a log for analytics and billing.
--- hl
1. **Ingest**: driver phones keep a connection to a **gateway**; updates go to the **location service** for that city (partitioned by city or by S2/H3 cell range), which updates the in-memory index and publishes positions for riders who are tracking.
2. **Request**: the rider's request goes to the **ride service**, which creates a ride in state *requested* and asks **dispatch** for a driver.
3. **Dispatch**: queries available drivers in the cells around the pickup (expanding rings), computes **ETAs** with the routing service, picks the best (and may batch several requests to optimise globally), and **offers** the ride to one driver, reserving that driver.
4. **Accept**: the driver accepts within ~15 s, or the offer goes to the next candidate. On accept, the ride becomes *matched* and the driver's status *on trip*.
5. **Track**: rider receives driver positions over WebSocket.
6. **Complete**: the trip service computes the fare from the route and time, then the **payment service** charges asynchronously.
--- deep
**1. Location index at 1 M writes/s**: updates replace the previous position; durability doesn't matter (the next update comes in 4 s), so keep it in memory, partitioned by geography (a city fits on a few machines). Each update moves a driver between cells if needed. Stale drivers expire if no update for ~30 s. Uber's H3 (hexagons) or S2 cells give uniform neighbours.

**2. No double assignment**: dispatch must atomically move a driver from *available* to *offered*; use a single owner per city (or per driver) for state changes, or a compare-and-set on the driver's status. An offer has a timeout; if it expires, the driver returns to available.

**3. ETA**: straight-line distance is misleading (rivers, one-way streets). A routing service on the road graph with live traffic (contraction hierarchies or similar precomputation) returns ETAs in milliseconds; cache ETAs for cell pairs to cut cost.

**4. Matching quality**: nearest-first is greedy; batching requests for a second or two and solving a small assignment problem lowers total pickup time across riders.

**5. Surge**: count requests and available drivers per cell every minute; when demand/supply exceeds thresholds, raise the multiplier; show it to riders before they request (and lock the price for the request).

**6. Isolation**: shard everything by city/region so a failure or bug stays local; stateless services are replicated, and the in-memory location state is rebuilt within seconds from the next round of driver updates after a failover.
--- wrap
**Failures**: location service node dies → drivers' next updates repopulate a replacement within seconds; dispatch failure → requests retried, offers time out safely; payment failure → trip completed, payment retried idempotently later.

**Monitoring**: time to match, offer acceptance rate, ETA accuracy (predicted vs actual), location update lag, cancellations, per-city health.

**At 10×**: more city shards, smarter batching, regional data centres near cities.
--- variants
Q: Food delivery (restaurant prep time + courier)
A: Three parties: the order goes to the restaurant, a courier is dispatched timed to the predicted prep time, and batching multiple orders per courier matters. ETAs combine prep and travel.
Q: Shared rides (pool)
A: Matching becomes route insertion: can this new rider be added to an existing trip with small detours for everyone? A harder optimisation with time windows.
Q: Scheduled rides for tomorrow morning
A: Store the booking, then start dispatch ~15 minutes before with a reserved priority; forecast supply.
Q: Show friends' live locations (Find My Friends)
A: Similar ingest, but privacy and consent dominate; fan out updates only to approved viewers; coarser precision.
--- steer
Q: 1.25 million location updates per second: where do they go?
A: In-memory geo index sharded by city/cell, overwriting positions, no durable write per update.
Q: Two riders' requests pick the same driver.
A: Atomic status change (available → offered) with a single owner or compare-and-set, offer timeouts.
Q: How do you find drivers near the pickup?
A: Cells covering the pickup with expanding rings, then rank by road-network ETA.
Q: The dispatch server for a city crashes.
A: Replicated stateless dispatch, state rebuilt from driver updates and the rides DB; in-flight offers time out and retry.
Q: How does surge pricing work?
A: Supply and demand per cell per minute, multiplier thresholds, price locked at request time.
--- pitfalls
- Writing every location update to a database
- Matching by straight-line distance
- No protection against assigning one driver twice
- Global (not per-city) components that make outages global
- Forgetting the trip state machine and cancellations
--- level
- **L4**: driver location ingest, nearby search with geohash, a ride flow with states.
- **L5**: in-memory per-city index with numbers, atomic assignment with offer timeouts, ETA via routing, batching, surge, failure recovery per city.
- **L6**: marketplace optimisation and forecasting, privacy and retention, multi-region city placement, experimentation on dispatch.

=== d-notification
est: 45
--- words
- **Notification**: a message to a user through a channel: mobile push, email, SMS, or in-app.
- **APNs / FCM**: Apple's and Google's services that deliver push notifications to phones; you send to them, they send to the device.
- **Device token**: the address of one app install on one phone, given by APNs/FCM.
- **Fan-out**: turning one event ("a sale started") into messages for many users.
- **Idempotency**: sending the same request twice has the same effect as once, so retries don't spam users.
- **Preferences / quiet hours**: what the user has opted into, and times they don't want to be disturbed.
- **Rate limiting (per user)**: capping how many notifications a person gets, so the product doesn't become noise.
--- flow
1. **0–5, requirements**: send transactional (password reset, order shipped) and marketing notifications across push/email/SMS, respecting preferences; templates; scheduling; delivery tracking.
2. **5–10, estimates**: 1 B notifications/day ≈ 12,000/s average, campaign peaks of 500,000/s.
3. **10–15, API and data**: `POST /notify`, templates, preferences, device tokens, delivery log.
4. **15–25, high level**: API → validation + preferences → priority queues per channel → channel workers → providers (APNs, FCM, email, SMS) → delivery status.
5. **25–40, deep dives**: no duplicates under retries, priority isolation (password resets never wait behind a campaign), provider limits and failures, large fan-outs, user-level throttling.
6. **40–45, wrap**: monitoring and analytics.
--- req
**Functional**
- Other services ask to notify a user (or a segment) with a template and data.
- Deliver via push (iOS/Android), email, SMS and in-app inbox, according to user preferences and opt-outs.
- Schedule sends (time zones), and bulk campaigns to millions.
- Track delivery, opens and clicks; manage device tokens.

**Non-functional**
- **Transactional messages are fast and reliable** (password reset within seconds).
- **No duplicate notifications** to a user for one event.
- **Marketing never delays transactional** traffic.
- **Respect limits**: provider rate limits, per-user caps, quiet hours, legal opt-outs.
- **At-least-once to providers with dedupe** is the realistic guarantee.
--- est
- **Volume**: 1 B notifications/day ≈ **12,000/s** average; a campaign to 100 M users in 10 minutes ≈ **170,000/s**.
- **Channels**: ~70% push, 25% email, 5% SMS (SMS is costly: cents each).
- **Storage**: delivery log 1 B × 300 bytes ≈ 300 GB/day (kept 30–90 days); device tokens: 2 B devices × 200 B ≈ 400 GB.
- **Providers**: APNs/FCM accept high throughput over persistent HTTP/2 connections; email/SMS providers have per-account limits that shape the sending rate.
--- api
- `POST /v1/notifications {idempotency_key, user_id | segment_id, template_id, data, channels?, priority, send_at?}` → `{notification_id}`.
- `PUT /v1/users/{id}/preferences`, `POST /v1/devices {user_id, platform, token}`.
- Provider callbacks/webhooks for delivery, bounces and invalid tokens.

**Data**
- `templates` (per channel, per language), `preferences` (opt-ins per category and channel, quiet hours, time zone), `devices` (tokens, platform, last seen), `notifications` (status per channel, provider message IDs), `idempotency` keys with TTL.
--- hl
1. The **notification API** validates the request and checks the **idempotency key** (same key → return the existing notification).
2. A **router** loads preferences and devices, decides channels, applies quiet hours (delay to morning) and per-user rate limits, renders templates, and enqueues one job per channel into **priority queues** (transactional and marketing separated).
3. **Channel workers** (push, email, SMS) pull jobs, call providers with retries and backoff, respecting provider rate limits.
4. Results and provider callbacks update the **delivery log**; invalid tokens are removed.
5. **Campaigns**: a scheduler expands a segment into batches of users (streamed from the user database) and feeds them through the same pipeline at a controlled rate.
6. **In-app inbox**: notifications written to a per-user store and pushed over the app's live connection if open.
--- deep
**1. Duplicates**: retries happen at every step (client → API, worker → provider). The idempotency key at the API, a per-(notification, channel, device) send record checked before calling the provider, and idempotent provider APIs where available keep duplicates rare. Some providers can still deliver twice: accept "at least once" with dedupe as far as you control.

**2. Priority isolation**: separate queues and worker pools for transactional vs bulk traffic; bulk workers have quotas; transactional workers have reserved provider capacity. Otherwise a 100 M campaign delays every password reset by an hour.

**3. Provider limits and failures**: token-bucket rate limiting per provider account; exponential backoff on 429/5xx; circuit breakers; secondary providers for SMS and email; dead-letter queues for poison messages.

**4. Large fan-out**: don't load 100 M users into memory: stream the segment in pages, enqueue in batches, and pace the campaign (both to respect providers and to avoid a traffic spike when everyone taps the notification at once).

**5. User experience**: per-user caps (no more than N marketing pushes a day), collapse similar notifications ("5 new likes"), quiet hours by the user's time zone, easy opt-out (and legally required unsubscribe links).

**6. Token hygiene**: devices uninstall apps; APNs/FCM report invalid tokens; remove them to save cost and keep metrics honest.
--- wrap
**Monitoring**: queue depth and age per priority, send latency for transactional messages, provider error rates, delivery and open rates, opt-out rate (a signal of spam).

**Failures**: provider outage → failover provider or delayed retries; queue backlog → scale workers, shed marketing; router bug → kill switch to pause campaigns.

**At 10×**: shard queues by user, more provider connections, regional sending.
--- variants
Q: In-app real-time notifications only (no push/email)
A: A per-user inbox store + a WebSocket/SSE connection; unread counts; mark-as-read sync across devices.
Q: Notify a user's 10 M followers when they go live
A: Fan-out through the pipeline with pacing; deduplicate per user; consider pull (users see it when they open the app) for the long tail.
Q: Exactly-once financial alerts by SMS
A: True exactly-once across a third-party SMS gateway is impossible; aim for idempotent requests with provider message IDs, reconcile delivery reports, and prefer at-least-once with dedupe and clear message IDs.
Q: Digest emails (one daily summary)
A: Accumulate events per user and send a scheduled digest job by time zone; suppress individual emails.
--- steer
Q: A service retries the notify call after a timeout.
A: Idempotency key returns the original notification; no second send.
Q: A marketing campaign to 100 M users starts; a user requests a password reset.
A: Separate priority queues and worker pools with reserved capacity for transactional.
Q: APNs starts returning errors.
A: Backoff with jitter, circuit breaker, queue retries, alert; tokens marked invalid are removed.
Q: How do you avoid annoying users?
A: Preferences, per-user caps, collapsing, quiet hours by time zone, opt-out monitoring.
Q: How do you send to 100 M users without melting anything?
A: Stream the segment in batches, pace sends, respect provider limits.
--- pitfalls
- One queue for everything
- No idempotency, so retries spam users
- Sending synchronously from the calling service
- Ignoring provider rate limits and invalid tokens
- No per-user throttling or quiet hours
--- level
- **L4**: API → queue → channel workers → providers, with preferences.
- **L5**: idempotency at each hop, priority isolation, provider limits with backoff and failover, campaign fan-out pacing, token hygiene, user caps.
- **L6**: multi-provider cost optimisation, experimentation on engagement, compliance (consent, unsubscribe laws), regional delivery.

=== d-ticketing
est: 45
--- words
- **Inventory**: the seats (or tickets) available for an event.
- **Hold (reservation)**: a seat temporarily set aside for one buyer while they pay, released if they don't finish in time.
- **Overselling**: selling the same seat twice, the one thing that must never happen.
- **Virtual waiting room (queue)**: making buyers wait in line before entering the purchase flow when demand is huge.
- **Optimistic vs pessimistic locking**: assume no conflict and check at write time, vs lock the row first.
- **Idempotency key**: a unique ID for a purchase attempt, so retries don't charge twice.
--- flow
1. **0–5, requirements**: browse events, see seat maps, hold seats for ~10 minutes, pay, get tickets; survive massive spikes for popular events. Clarify: assigned seats or general admission? limits per buyer? resale?
2. **5–10, estimates**: normally ~100 purchases/s, but a superstar on-sale: 10 M people for 50,000 seats in minutes.
3. **10–15, API and data**: seat inventory with states (available / held / sold), holds with expiry, orders.
4. **15–25, high level**: event catalogue (cached, read-heavy) separate from the booking service (strongly consistent); waiting room in front; payment integration.
5. **25–40, deep dives**: preventing double booking, hold expiry, the waiting room, payment failures and idempotency, seat map freshness.
6. **40–45, wrap**: bots and fairness, monitoring.
--- req
**Functional**
- Browse events and venues; view a seat map with availability.
- Select seats → hold them for a limited time (e.g. 10 minutes) → pay → receive tickets.
- Release seats if payment isn't completed; cancel/refund rules.
- Limit tickets per buyer for popular events.

**Non-functional**
- **No overselling**: a seat is sold at most once (strong consistency on inventory).
- **Survive on-sale spikes** of millions of users for a few thousand seats, fairly.
- **Fast browsing** (eventual consistency OK for seat maps; a seat shown free may fail to hold).
- **Payments are exactly-once from the user's view**.
--- est
- **Normal load**: 10 M tickets/day ≈ 115 purchases/s; browsing ~100× more.
- **Spike**: 10 M users arrive in 5 minutes for 50,000 seats. Inventory writes are only ~50,000 successful holds, but **attempts** could be millions per second if unthrottled.
- **Inventory size**: an event has up to ~100,000 seats × ~50 bytes = 5 MB: one event's inventory fits on one database shard (or in memory), which simplifies consistency.
- **Holds**: at most #seats concurrent holds per event.

These say: shard inventory by event, protect it with a waiting room, serve browsing from caches.
--- api
- `GET /events?city&date`, `GET /events/{id}/seats` (cached seat map, refreshed every few seconds).
- `POST /events/{id}/holds {seat_ids, idempotency_key}` → `{hold_id, expires_at}` or `409` for seats no longer available.
- `POST /orders {hold_id, payment_method, idempotency_key}` → `{order_id, status}`.
- `DELETE /holds/{id}` (release early).

**Data**
- `seats(event_id, seat_id, status: available|held|sold, hold_id, hold_expires_at, version)` in a transactional DB, sharded by `event_id`.
- `holds(hold_id, user, seats, expires_at)`, `orders(order_id, hold_id, payment_status, tickets)`.
--- hl
1. **Browsing** goes to the catalogue service and cached seat maps (CDN + cache), never to the inventory database.
2. For high-demand events, buyers pass through a **virtual waiting room**: a queue service admits users at a rate the booking system can handle, issuing signed admission tokens.
3. With a token, the user picks seats; the **booking service** runs a transaction on the event's shard: for each seat, `UPDATE seats SET status='held', hold_id=..., expires_at=now()+10min WHERE seat_id IN (...) AND status='available'` and checks all rows were updated; else roll back and return 409.
4. The user pays: the **order service** calls the payment provider with an idempotency key; on success, a transaction marks seats *sold* (only if the hold is still valid) and issues tickets.
5. A **hold reaper** (or lazy expiry on read) returns expired holds to *available*.
6. Seat-map caches refresh from inventory changes (change stream) every few seconds.
--- deep
**1. No double booking**: the conditional update (`WHERE status='available'`) inside a transaction on one shard is enough: two buyers racing for a seat, one update succeeds and the other affects zero rows. Alternatives: `SELECT ... FOR UPDATE` (pessimistic, holds locks longer), or a version column (optimistic). Distributed locks in Redis are unnecessary and riskier when the database can do it.

**2. Hold expiry**: store `expires_at`; treat expired holds as available in queries (`status='available' OR (status='held' AND expires_at < now())`) so expiry doesn't depend on a background job running on time; the reaper just cleans up. The payment confirmation must re-check the hold is still valid (and refund if it expired mid-payment).

**3. Waiting room**: the only way to survive 10 M users for 50 k seats. Users get a random or arrival-ordered position, the page polls cheaply (served from CDN/edge), and admission tokens are released at a controlled rate. It also enables fairness rules and bot filtering before anyone reaches inventory.

**4. Payments**: the hold → pay → confirm flow is a small saga: if payment succeeds but the confirm step fails, retry the confirm (idempotent); if the hold expired, refund. Idempotency keys stop double charges on retries.

**5. Hot event**: all traffic hits one event's shard: keep inventory on a strong primary with in-memory seat state (or a single-threaded actor per event); the waiting room caps the rate.

**6. General admission (no seat numbers)**: a counter of remaining tickets decremented atomically (`UPDATE ... SET remaining = remaining - n WHERE remaining >= n`), possibly split into sub-counters to reduce contention.
--- wrap
**Bots and fairness**: CAPTCHAs/attestation in the waiting room, per-account and per-card limits, verified-fan presales, cancelling suspicious orders.

**Monitoring**: hold success rate, hold-to-purchase conversion, expired holds, waiting-room admission rate and wait times, payment error rate, inventory DB latency.

**Failures**: inventory primary failover (replicated, synchronous within region); payment provider outage → pause new holds or extend hold times; waiting room is static and cacheable, so it stays up.
--- variants
Q: Hotel or airline booking (inventory per night/flight, overbooking allowed)
A: Inventory is counts per date and room type; airlines deliberately overbook based on no-show predictions; holds become "pending" bookings; integration with external systems (GDS) adds latency.
Q: Flash sale of 1,000 phones to millions of shoppers
A: Same as general admission: waiting room, atomic counter, per-user limits, async order processing after the stock is reserved.
Q: Resale marketplace
A: Ownership transfer of a ticket between users with escrow; listings and price caps; ticket barcodes rotate to prevent screenshots being resold.
Q: Seat map must update in real time for everyone viewing
A: Push seat status changes over WebSocket/SSE per event (throttled batches); still re-check at hold time.
--- steer
Q: Two people click the same seat at the same moment.
A: Conditional update in a transaction on the event's shard; exactly one wins; the other gets 409 and picks again.
Q: A user holds seats and walks away.
A: Holds with expiry; expired holds count as available in queries; reaper cleans up; confirm re-checks the hold.
Q: 10 million people arrive for 50,000 seats.
A: Virtual waiting room with rate-controlled admission tokens; cached browsing; inventory protected.
Q: Payment succeeded but the confirmation call timed out.
A: Idempotent confirm retried; if the hold expired, refund; payment idempotency key prevents double charges.
Q: Why not Redis locks for seats?
A: The database's conditional update already gives atomicity with durability; extra distributed locks add failure modes.
--- pitfalls
- Read-then-write seat checks without atomicity
- Holds that never expire, or expiry that depends on a cron job running on time
- Letting a spike hit the inventory database directly
- Charging cards without idempotency keys
- Serving seat maps from the inventory database
--- level
- **L4**: seats table with status, holds with expiry, payment step.
- **L5**: atomic conditional updates per event shard, lazy expiry, waiting room with numbers, payment saga with idempotency, cached browsing, bots and fairness.
- **L6**: fairness policy design, dynamic pricing and presales, multi-region strategy for global events, operational playbooks for on-sale days.
