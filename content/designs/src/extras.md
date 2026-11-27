=== d-trending
--- words
- **Top-K**: the K most frequent items, such as the 10 most-used hashtags.
- **Sliding window**: "the last 5 minutes", recomputed continuously as time moves.
- **Heavy hitters**: items much more frequent than the rest.
- **Count-Min sketch**: a small table of counters that estimates how often each item appeared, using a fixed amount of memory (may overcount slightly, never undercounts).
- **Trending vs popular**: popular = most mentions; trending = rising unusually fast compared with its normal level.
- **Pre-aggregation**: counting locally on each machine first, then merging the partial counts.
--- flow
1. **0–5**: top K hashtags/queries over the last 5 min / hour / day, globally and per country; refreshed every ~30 s; filter spam. Clarify "popular" vs "trending".
2. **5–10**: 500 k events/s, 100 M distinct terms/day.
3. **10–15**: event stream in; top-K lists per window and region out.
4. **15–25**: log → stream workers (pre-aggregate per partition) → merge stage → top-K per window → cache → API.
5. **25–40**: exact vs approximate counting (Count-Min + heap), sliding windows (bucketed sums), trend scoring vs baseline, hot terms, spam.
6. **40–45**: freshness monitoring, failure, cost.
--- variants
Q: YouTube "most viewed today" per country
A: Same pipeline with views; per-country windows; dedupe views; daily and hourly windows; exact counts acceptable at this cardinality with sharded counters.
Q: Real-time leaderboard for a game (top 100 players by score)
A: Scores change per player rather than counting events: a sorted set (Redis ZSET) sharded by score range or a single ranking per region, with rank queries for any player.
Q: "Trending searches" that must exclude evergreen terms
A: Score by growth over a baseline (current rate ÷ expected rate from history, with smoothing) rather than raw count.
--- level
- **L4**: stream counts per window and a heap for top-K.
- **L5**: pre-aggregation and hot terms, sliding windows from buckets, approximate counting with error bounds, trend vs popularity scoring, spam filtering.
- **L6**: multi-region merge semantics, freshness/cost trade-offs, product tuning and abuse resistance.

=== d-fraud-detection
--- words
- **Authorisation path**: the few hundred milliseconds between a card being swiped and the bank saying yes or no.
- **Rule**: a hand-written condition ("more than 5 purchases in 1 minute from new devices").
- **Model score**: a machine-learning probability that a transaction is fraud.
- **Feature**: an input to the model, such as "number of transactions by this card in the last hour".
- **Feature store**: a system that keeps features fresh for real-time scoring and consistent with training.
- **False positive**: blocking a genuine customer, which also costs money and trust.
--- flow
1. **0–5**: score every transaction within ~100 ms in the authorisation path; block, challenge or allow; learn from feedback (chargebacks). Clarify latency budget and the cost of false positives.
2. **5–10**: 10 k transactions/s, peaks 50 k; features over windows from seconds to months.
3. **10–15**: score API, feature store (online + offline), rules engine, model serving, decision log.
4. **15–25**: transaction → feature lookup (precomputed windows) → rules + model → decision → log; stream jobs keep features fresh; offline training.
5. **25–40**: real-time features with streaming windows, training/serving skew, delayed labels, fail-open policy, explainability.
6. **40–45**: monitoring drift and alert rates.
--- variants
Q: Account takeover detection at login
A: Signals are device, location, behaviour and credential breach status; decisions are step-up (MFA) rather than block; latency budget is similar.
Q: Detecting fake accounts at sign-up
A: Less latency pressure; graph features (shared devices/payment methods), velocity per IP, delayed review queues.
Q: Ads click fraud
A: Volume is far higher and decisions can be offline (don't bill later); see the ad-click design.
--- level
- **L4**: rules + model in the request path, feature lookups, logging.
- **L5**: streaming feature computation with windows, online/offline feature store consistency, latency budget and fail-open, feedback loops with delayed labels, human review.
- **L6**: cost of false positives vs fraud losses as the objective, adversarial adaptation, model governance and explainability.

=== d-auth-sso
--- words
- **Identity provider (IdP)**: the service that checks who you are and issues tokens (Google accounts, Okta).
- **SSO (single sign-on)**: logging in once and being signed in to many apps.
- **OIDC / OAuth 2.0**: the standards apps use to send users to the IdP and receive tokens back.
- **Session**: the IdP's record that you're logged in, referenced by a cookie.
- **Access / refresh token**: short-lived proof for APIs / long-lived credential to get new access tokens.
- **MFA / passkeys**: a second proof of identity / passwordless login with device-bound keys.
--- flow
1. **0–5**: sign-up, login (password, passkeys, MFA), SSO across apps, third-party login, sessions on web and mobile, logout everywhere. Clarify number of apps and users.
2. **5–10**: 100 M users, login peaks ~20 k/s, token validations ~1 M/s (done locally by services).
3. **10–15**: OIDC endpoints, user store, session store, token signing keys (KMS), client registry.
4. **15–25**: apps → IdP (authorisation code + PKCE) → session cookie on IdP domain → tokens to apps → services verify JWTs with published keys.
5. **25–40**: token lifetimes and revocation, key rotation, MFA/risk-based login, brute-force protection, logout everywhere.
6. **40–45**: availability (login is a dependency of everything), monitoring.
--- variants
Q: Enterprise SSO into your product for customer companies (SAML/OIDC federation)
A: Per-tenant IdP configuration, just-in-time user provisioning (SCIM), domain verification, mapping groups to roles.
Q: Service-to-service authentication
A: Workload identities (mTLS certificates from an internal CA, SPIFFE), short-lived tokens, no shared secrets.
Q: Passwordless only
A: Passkeys (WebAuthn) and magic links; account recovery becomes the hard, risky part.
--- level
- **L4**: login, sessions, JWT access tokens.
- **L5**: authorisation code + PKCE, refresh rotation and revocation, key rotation via JWKS, MFA and brute-force defences, the availability of the IdP.
- **L6**: federation for enterprise customers, risk-based authentication, account recovery design, multi-region identity data.

=== d-authz
--- words
- **Permission check**: "can user U do action A on object O?"
- **Relation tuple**: a stored fact like `doc:plan#viewer@user:bob`.
- **Namespace config**: rules for how relations combine (editors are viewers; folder viewers are document viewers).
- **Zookie**: a consistency token so a check is at least as fresh as the content it protects.
- **List / reverse lookup**: "which documents can Bob see?", much harder than a single check.
--- flow
1. **0–5**: checks for Docs/Drive-like products with sharing, groups, folders; < 10 ms p99; consistent after permission changes. Clarify list queries and scale.
2. **5–10**: trillions of tuples, millions of checks/s.
3. **10–15**: tuple store, namespace config, check API, read/expand/list APIs, zookies.
4. **15–25**: services → check API → cached graph walk over tuples in a globally consistent store → answer.
5. **25–40**: caching and denormalised group membership (Leopard), new enemy problem, list queries, hot objects.
6. **40–45**: availability, audit.
--- variants
Q: Simple RBAC for an internal admin tool
A: Roles and permissions in a database, checked in the service; Zanzibar would be overkill.
Q: Attribute-based rules (only during business hours, only in the EU)
A: A policy engine (OPA, IAM Conditions) evaluating attributes at request time, possibly combined with relationship checks.
Q: Search results filtered by permission
A: Pre-filter with an ACL field in the search index (group IDs), then verify the top results with checks; or ask the authorisation service for the accessible set.
--- level
- **L4**: tuples and a recursive check with caching.
- **L5**: namespace rewrites, consistency (zookies and the new enemy problem), group flattening, list-query strategy, latency budget.
- **L6**: global replication on Spanner-like storage, hot-spot handling, migration of existing ACLs, audit and debugging tools.

=== d-global-cart
--- words
- **Active-active**: every region accepts writes at the same time.
- **CRDT**: a data type (like a set of cart items) that merges concurrent changes from different regions automatically.
- **Oversell**: selling more units than exist in stock.
- **Reservation**: holding stock for an order for a short time.
- **Home region**: the one region that owns a piece of data (say, one warehouse's stock).
--- flow
1. **0–5**: carts writable in every region during a region failure; stock never oversold; low latency everywhere. Clarify which data needs strong consistency.
2. **5–10**: 50 M carts active, 20 k cart writes/s, stock updates per SKU per warehouse.
3. **10–15**: cart as an OR-set CRDT per user; stock per SKU per warehouse with reservations.
4. **15–25**: carts active-active with async replication and merges; inventory with a home region per warehouse (or consensus), reservations at checkout.
5. **25–40**: cart merge semantics, reservation expiry, region failure behaviour, quota splitting for hot SKUs.
6. **40–45**: reconciliation and monitoring.
--- variants
Q: Flash sale of a few thousand units worldwide
A: Allocate stock quotas per region from a central pool, refill them dynamically; a waiting room in front; small reserve for rebalancing.
Q: Single-region company that just wants a DR plan
A: Active-passive with async replication and a tested failover; much simpler.
Q: Digital goods (no stock)
A: Inventory disappears; only carts and payments remain; active-active is easy.
--- level
- **L4**: replicated carts and a central inventory database.
- **L5**: CRDT carts, home-region or consensus inventory with reservations, region-failure behaviour per data type, hot-SKU quota splitting.
- **L6**: business trade-offs (oversell risk vs availability), reconciliation, cost of global consensus.

=== d-dr-ledger
--- words
- **RPO / RTO**: how much data may be lost / how long you may be down after a disaster.
- **Synchronous replication**: a write is confirmed only when another location has it too.
- **Consensus (Paxos/Raft)**: a majority of replicas must agree on each write, so losing a minority loses nothing.
- **Failover**: moving service to another region.
- **Fencing**: guaranteeing the old primary can no longer write after failover.
- **Point-in-time recovery**: restoring to just before a bad change, using backups plus the change log.
--- flow
1. **0–5**: zero lost transactions (RPO 0), under 5 minutes downtime (RTO), survive a region loss. Clarify transaction rate and latency budget.
2. **5–10**: 5,000 ledger writes/s; regions 10–40 ms apart.
3. **10–15**: append-only ledger tables, idempotency keys, replication topology.
4. **15–25**: consensus across three regions (or sync replica + arbiter), automatic failover, idempotent clients, plus backups/PITR for logical errors.
5. **25–40**: latency cost of sync replication, region placement, fencing, client retries across failover, testing.
6. **40–45**: drills, monitoring, runbooks.
--- variants
Q: RPO of 1 minute is acceptable
A: Asynchronous replication to a warm standby with automated failover; cheaper and faster writes; document the loss window.
Q: Regulator requires data to stay in one country with two regions
A: Place all replicas in-country (two regions plus a witness/arbiter in a third zone or location within the country).
Q: Protect against a bad deploy that corrupts balances
A: Replication won't help: immutable ledger entries (reversals only), PITR backups, delayed replicas, invariant checks (books balance) that halt writes.
--- level
- **L4**: replicas in another region and a failover plan.
- **L5**: RPO/RTO-driven choice (consensus vs async), latency cost, fencing, idempotent retries across failover, backups for logical corruption, drills.
- **L6**: cost and regulatory constraints, multi-party sign-off on failover, continuous verification of the books.
