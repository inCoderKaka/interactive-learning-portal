=== d-ml-spam
title: Design Gmail spam filtering
topic: ai-metrics
tier: 1
est: 45
prompt: Design the system that decides whether each incoming Gmail message goes to the inbox or the spam folder, for over a billion users.
--- words
- **Spam filter**: a classifier that gives each email a probability of being spam and moves it when that probability passes a threshold.
- **False positive**: a real email sent to spam. Much worse than a false negative here, because the user may never see it.
- **Adversarial drift**: spammers change their messages as soon as the filter learns them, so the data keeps moving.
- **Reputation feature**: a running score for a sender, domain or IP, built from how past mail from it was treated.
- **Label delay**: the "this is spam" or "not spam" click arrives hours or days after the email, if at all.
--- flow
1. **0–5**: who decides (per user or global), cost of each error, latency budget at delivery time, languages, what signals we may use.
2. **5–12**: labels (user reports, "not spam" rescues, honeypots, raters) and their biases; features (sender reputation, authentication, content, user relationship).
3. **12–22**: layered model: cheap rules and reputation first, then a gradient-boosted or neural content model, then per-user personalisation.
4. **22–30**: metrics: false-positive rate at fixed catch rate, precision–recall, per-language slices; online: rescue rate, report rate.
5. **30–40**: serving at delivery time, feedback loop, adversarial adaptation, retraining cadence.
6. **40–45**: deep dive the interviewer picks: new spam campaign, phishing, personalisation.
--- frame
**Goal**: keep spam and phishing out of the inbox without ever hiding mail the user wanted.

**ML task**: binary classification per (message, recipient): P(spam). Decision = threshold, tuned so the **false-positive rate stays below a target (say 0.05%)** while catching as much spam as possible. Phishing and malware are separate heads with stricter actions (warning banners, blocking links).

**Metrics**:
- Offline: recall at a fixed false-positive rate; precision–recall AUC (positives are not rare overall, but the costs are lopsided); calibration.
- Online: **"not spam" rescue rate** (false positives users found), **"report spam" rate from the inbox** (false negatives), complaints, time-to-catch for new campaigns.
- Guardrails: delivery latency, false positives on transactional mail (receipts, 2FA codes) and on first-time senders.
--- data
**Labels**: user "report spam" and "not spam" clicks (noisy: some users report newsletters they subscribed to), honeypot inboxes that only spammers write to, human raters for a sample, and implicit signals (opened, replied, deleted unread). Weight explicit labels above implicit ones and clean reporters with a history of disagreement.

**Splits**: always **by time**: train on weeks 1–4, test on week 5, because spam changes weekly; a random split leaks tomorrow's campaign into training.

**Features**:
- *Sender*: domain and IP reputation (rolling spam rates), SPF/DKIM/DMARC authentication results, sending volume spikes, age of the domain.
- *Content*: subject and body text (embeddings from a small text encoder), links and their domains' reputation, attachments, HTML tricks (hidden text, image-only mail).
- *Relationship*: has the recipient written to this sender, is it in contacts, past interactions.
- *Campaign*: near-duplicate counts across users in the last hour (locality-sensitive hashes of the body).
--- model
1. **Rules and blocklists** first: known-bad IPs and failed authentication are cheap and catch the bulk.
2. **Global model**: start with logistic regression on hashed features as a baseline; production uses gradient-boosted trees on reputation and count features plus a text encoder (a small transformer, distilled for latency) whose output feeds the final model. Loss: weighted log loss, with false positives weighted higher.
3. **Personal layer**: a per-user adjustment (user's own reports, their contacts) so one person's newsletter is another's spam.
4. **Retraining**: reputation features update in near real time; the content model retrains daily or faster, with a fast path that adds hashes of a fresh campaign within minutes.
--- eval
- Offline on the next time window: recall at the target false-positive rate, broken down by language, by sender type (bulk, transactional, personal) and by new vs known senders.
- **Shadow mode** before launch: score live traffic without acting, compare decisions with the current model.
- **A/B test** on a small share of users: rescue rate and report rate are the primary metrics; guardrails on latency and complaints from senders (legitimate bulk senders).
- Measure **time-to-catch**: how long a new campaign reaches inboxes before the filter adapts.
--- serve
- Scoring happens **at delivery time** inside the mail pipeline: budget ~50 ms per message; features fetched from a reputation store keyed by IP and domain; text encoder runs on CPU or a small accelerator pool.
- Billions of messages a day, so the cheap layers drop most spam before the expensive model runs.
- **Monitoring**: share of mail sent to spam per hour (sudden jumps mean a bad model or a campaign), rescue rate per language, feature freshness, model score distribution drift.
- **Failure mode**: if the model service is down, fall back to rules and reputation, and fail towards the inbox for authenticated senders the user knows.
--- deep
**A new campaign appears**: near-duplicate detection across users catches the same body sent to millions within minutes; early reports from a few users raise the cluster's score for everyone; reputation of newly seen domains starts low.

**Adversaries**: spammers test against the filter, so do not expose scores, add randomness to borderline decisions, and use features that are expensive to fake (authentication, sending history, recipient relationships).

**Phishing**: higher cost per miss; link-level analysis, look-alike domains (paypa1.com), brand impersonation classifiers, warning banners instead of silent moves.
--- variants
Q: Only enterprise customers (Workspace)
A: Admins can set policy, tenants have their own allow and block lists, and data from one tenant must not leak into another tenant's model beyond aggregate signals.
Q: SMS spam on a phone
A: Very short text, little sender metadata, on-device inference for privacy, and label from "report junk" taps.
Q: Make it explainable to users
A: Show the main reason ("this sender failed authentication", "similar to messages people reported"), which also needs features that map to human reasons.
--- steer
Q: A bank's 2FA codes start landing in spam.
A: False positives on transactional mail: authentication and sender history features, a guardrail slice for transactional senders, and a fast override path.
Q: How do you get labels for mail nobody reports?
A: Honeypots, raters on a sample, implicit signals, and weighting by reporter reliability.
Q: Spam rate in the inbox doubled overnight.
A: Check for a new campaign versus a broken feature or model push; roll back if a push; near-duplicate clusters and fast hashes for a campaign.
Q: Why not one big model for everything?
A: Latency and cost at billions of messages; cheap layers first, and separate heads for phishing with stricter actions.
--- pitfalls
- Random train/test split on data that changes weekly
- Optimising accuracy instead of catch rate at a fixed false-positive rate
- Ignoring that user labels are noisy and biased
- One global threshold for every language and sender type
- No fallback when the model service fails
--- level
- **L4**: binary classifier with sensible features, precision and recall, retraining.
- **L5**: false-positive-constrained thresholding, time-based splits, layered cascade for cost, label noise handling, adversarial drift and campaign detection, shadow mode and A/B guardrails.
- **L6**: the whole abuse platform shared across Gmail, Chat and Drive; adversary economics; privacy limits on content features.
--- nodes
mta|Incoming mail (MTA)|client|0|150|Receives SMTP mail and starts the delivery pipeline.
rules|Rules & reputation|service|180|150|Blocklists, authentication checks, IP and domain reputation. Drops the obvious bulk.
model|Spam model service|service|380|150|Text encoder plus boosted trees; personal adjustment per recipient.
rep|Reputation store|db|180|20|Rolling spam rates per IP, domain and sender, updated in near real time.
dedupe|Campaign detector|worker|380|20|Near-duplicate hashes across users in the last hour.
box|Mailbox|store|580|150|Inbox or spam folder, with banners for phishing.
fb|Feedback & training|worker|580|290|Reports, rescues, raters; time-split training and evaluation.
--- edges
mta>rules|message
rules>model|survivors
rules>rep|lookup
model>dedupe|cluster counts
model>box|verdict
box~fb|reports and rescues
fb~model|new model
fb~rep|reputation updates
--- prereqs
ml-framing, class-imbalance, feature-engineering, classification-metrics
--- paths
- [deep] Choosing the threshold :: Fix a false-positive target, maximise recall under it; tune per language and sender type.
  - Transactional mail is being caught :: Slice guardrail for transactional senders; authentication and history features; fast override.
- [deep] Where labels come from :: Reports, rescues, honeypots, raters, implicit signals; reporter reliability weights.
  - Users report newsletters they signed up for :: Treat as personal preference: personal layer, not global spam labels.
- [failure] A new campaign floods inboxes :: Near-duplicate clustering across users, early reports boost the cluster, fast hash push.
- [deep] Spammers adapt to the filter :: Hard-to-fake features, no exposed scores, randomised borderline decisions, frequent retraining.
- [variation] SMS spam on device :: Short text, on-device model, privacy, report-junk labels.
- [failure] The model service is down :: Fall back to rules and reputation; fail towards inbox for known senders.

=== d-ml-fraud
title: Design payment fraud detection
topic: ai-metrics
tier: 2
est: 45
prompt: Design a system that decides, in real time, whether to approve, challenge or decline each card payment for an online payments company processing millions of transactions a day.
--- words
- **Chargeback**: the customer's bank reverses a payment as fraud weeks later. It is the main fraud label, and it is late.
- **Challenge**: an extra check (3-D Secure, one-time code) instead of a hard decline.
- **Velocity feature**: a count over a recent window, like payments from this card in the last hour.
- **Graph feature**: a signal from linked entities: cards, devices, emails and addresses that share something.
- **Cost-sensitive decision**: choosing the action that minimises expected money lost, not the one with the best accuracy.
--- flow
1. **0–5**: actions (approve, challenge, decline), latency budget (~100 ms), fraud rate (~0.1%), cost of fraud vs cost of a lost good customer.
2. **5–12**: labels (chargebacks, confirmed fraud, manual review) and their delay; features: velocity, device, graph, merchant.
3. **12–22**: rules + gradient-boosted trees, decision by expected cost, graph and sequence models later.
4. **22–30**: metrics: dollar-weighted recall, false-positive rate on good customers, precision at the review queue's capacity.
5. **30–40**: real-time feature store, serving, feedback, adversaries, retraining.
6. **40–45**: deep dive: label delay, account takeover, explainability for declines.
--- frame
**Goal**: lose as little money to fraud as possible while blocking as few genuine customers as possible.

**ML task**: P(fraud | transaction, history). Turn it into an action with **expected cost**: decline if P × amount × (1 + fees) > cost of declining a good customer (lost margin, lost lifetime value); challenge in the middle band where a challenge costs little.

**Metrics**:
- Offline: precision–recall AUC (positives are ~0.1%, so ROC-AUC flatters), **recall weighted by amount**, false-positive rate on good transactions, precision at the manual review queue's daily capacity.
- Online: fraud loss in basis points of volume, approval rate, challenge completion rate, customer complaints.
--- data
**Labels**: chargebacks arrive 30–90 days later; confirmed fraud from manual review and customer reports arrive sooner. Train with a **label maturity window** (only use transactions old enough that most chargebacks have arrived) and add early labels for recent data.

**Selection bias**: declined transactions never get a label. Keep a tiny random **holdout of approvals** in low-risk bands, or use reviewed outcomes, to learn what would have happened.

**Imbalance**: ~1 fraud per 1,000; down-sample good transactions for training and correct the probabilities afterwards (or weight the loss), and evaluate on the real ratio.

**Features**:
- *Velocity*: payments per card, device, IP and email in the last 1 minute, hour and day; amount vs the card's usual amount.
- *Device and session*: device fingerprint, emulator signals, typing and navigation speed, IP geolocation vs billing address.
- *Graph*: how many cards this device has used, whether linked entities had chargebacks.
- *Merchant*: category, its fraud rate, digital goods (instant resale) vs shipped goods.
--- model
1. **Rules** for known patterns and regulatory blocks; they also give fast reaction to a new attack.
2. **Gradient-boosted trees** on tabular velocity, device and graph features: strong baseline, fast, handles missing values, and gives feature attributions for explanations.
3. Later: a sequence model over the account's recent events, and a graph neural network or label propagation for fraud rings.
4. Retrain weekly on matured labels; recalibrate probabilities after down-sampling so expected-cost decisions stay right.
--- eval
- Time-based backtest on matured labels: amount-weighted recall at the current approval rate.
- **Replay**: run the candidate model on last month's traffic and compute the money it would have saved and the good customers it would have blocked.
- A/B or champion–challenger on a slice of traffic with loss and approval rate as primary metrics; careful: fraud outcomes come late, so read early proxies (review outcomes, challenge failures) first.
--- serve
- Real-time **feature store** with streaming aggregates (counts per key over sliding windows) updated from the payment stream in seconds; the same definitions compute training features from logs, so there is no training–serving skew.
- Scoring service under 100 ms p99 including feature fetches; a timeout falls back to rules plus a conservative default per merchant.
- **Monitoring**: score distribution, approval rate by merchant and country, feature freshness, and fraud loss as labels arrive; alerts on sudden spikes in one merchant or BIN range.
- Analysts see **reason codes** (top feature attributions) for review and customer support.
--- deep
**Label delay and feedback loop**: the model only learns from what it approved; holdouts and reviewed declines reduce the bias; weight recent early labels.

**Fraud rings**: many cards, few devices and addresses; graph features (shared device, shared shipping address) catch them; connected-component jobs flag clusters for review.

**Account takeover** is different from stolen cards: the account history looks good; use login risk (new device, password reset, changed shipping address just before a big purchase).
--- variants
Q: Peer-to-peer payments instead of cards
A: Scams where the real user is tricked into paying: the user authorises it, so device signals look fine; add recipient risk, relationship history and warnings instead of declines.
Q: Merchants want to set their own risk appetite
A: Per-merchant thresholds on the same calibrated probability; explain the trade-off curve to them.
Q: Regulation requires explaining a decline
A: Reason codes from attributions, simpler monotonic models for regulated decisions, and an appeal path.
--- steer
Q: Why not optimise accuracy?
A: 99.9% accuracy by approving everything; use amount-weighted recall and expected cost.
Q: Your training data only has labels for approved payments.
A: Selection bias: random holdouts, reviewed outcomes, and how to correct for it.
Q: A new attack costs $1M overnight.
A: Rules for immediate response, fast feature-based alerting, then retrain with the new labels.
Q: How do you keep features consistent between training and serving?
A: One definition in a feature store computing both streaming and backfill values.
--- pitfalls
- Using accuracy or ROC-AUC on a 0.1%-positive problem
- Training on recent data whose chargebacks haven't arrived
- Ignoring that declined payments never get labels
- Thresholds that ignore transaction amount
- Features computed differently offline and online
--- level
- **L4**: imbalanced classifier, velocity features, precision and recall.
- **L5**: expected-cost decisions with calibrated probabilities, label maturity, selection bias and holdouts, streaming feature store without skew, graph features, champion–challenger.
- **L6**: the risk platform across products, adversary economics, regulatory constraints and fairness across countries.
--- nodes
pay|Payment request|client|0|150|Card, amount, merchant, device and session data.
api|Risk API|edge|170|150|Under 100 ms; returns approve, challenge or decline with reason codes.
fs|Feature store|cache|360|20|Streaming velocity counts and graph features, same definitions offline.
model|Model + decision|service|360|150|Boosted trees → calibrated P(fraud) → expected-cost action. Rules alongside.
stream|Payment stream|queue|360|290|Every event updates aggregates and is logged.
review|Manual review|worker|560|150|Analysts handle the challenge band within queue capacity.
lab|Labels & training|worker|560|290|Chargebacks, reviews, holdouts; matured-label training.
--- edges
pay>api|authorise
api>model|score
model>fs|fetch features
api~stream|log event
stream~fs|update counts
model>review|borderline
review~lab|outcomes
stream~lab|chargebacks later
lab~model|new model
--- prereqs
class-imbalance, gradient-boosting, classification-metrics, ab-testing-ml
--- paths
- [deep] Turning a score into an action :: Calibrated probability × amount vs the cost of declining a good customer; challenge band.
  - The model was trained on down-sampled data :: Correct probabilities for the sampling rate before using expected cost.
- [deep] Labels arrive 60 days late :: Label maturity window, early labels from review, weighting recent data.
  - Declined payments never get labels :: Random holdouts in low-risk bands, reviewed declines, counterfactual estimates.
- [deep] Real-time features :: Streaming sliding-window counts in a feature store with the same definitions offline.
- [failure] A new attack overnight :: Rules for immediate blocking, alerting on merchant and BIN spikes, retrain.
- [variation] Account takeover :: Login and session risk, recent changes to shipping address or credentials.
- [variation] Regulators require explanations :: Reason codes, monotonic constraints, appeal path.

=== d-ml-eta
title: Design ETA prediction for Google Maps
topic: ai-metrics
tier: 2
est: 45
prompt: Design the system that predicts how long a drive will take when a user asks Google Maps for directions, and keeps updating it during the trip.
--- words
- **ETA**: estimated time of arrival: the predicted travel time for a route.
- **Segment**: a stretch of road between two intersections; routes are chains of segments.
- **Regression**: predicting a number (seconds), not a class.
- **Quantile loss**: a loss that trains the model to predict, say, the 90th percentile instead of the average.
- **Live traffic**: current speeds on segments, estimated from phones that share location anonymously.
--- flow
1. **0–5**: when it's predicted (before the trip, during), accuracy target, latency (route planning calls ETA many times), global coverage.
2. **5–12**: labels = actual trip times; features: live and historical speeds per segment, time of day, events, weather.
3. **12–22**: baseline sum of segment times; model per segment plus route-level correction; graph neural network for traffic spread.
4. **22–30**: metrics: MAPE, share of trips within ±10%, bias (late vs early), slices by city and road type.
5. **30–40**: serving inside the router, caching, updates during the trip, data freshness.
6. **40–45**: deep dive: rare events, new roads, uncertainty ranges.
--- frame
**Goal**: users trust the arrival time, and the router picks genuinely faster routes.

**ML task**: regression: travel time for a route at a departure time. Two consumers: the **router** (needs segment costs fast, millions of times) and the **user display** (needs one accurate number, maybe a range).

**Metrics**:
- Offline: **MAPE** (mean absolute percentage error), share of trips within ±10%, signed bias (users hate being late more than early), worst-case slices by city, road type and time.
- Online: ETA accuracy on completed trips, rerouting acceptance, user complaints; guardrail: routing latency.
--- data
**Labels**: completed trips from users who share location: actual time per segment and for the whole route. Clean out stops (coffee breaks), wrong turns and GPS noise; trips where users left the route are not the predicted route's label.

**Features**:
- *Segment*: historical speed by time of week, current live speed, speed trend over the last minutes, road class, speed limit, length, turns and traffic lights.
- *Context*: departure time, holidays, weather, incidents, events (stadium games), road closures.
- *Route*: number of turns, left turns across traffic, highway merges.

**Splits**: by time (future weeks) and also by **region** to check generalisation to cities with little data.
--- model
1. **Baseline**: sum of segment times from historical average speeds for that time of week, adjusted by live speed. Already decent.
2. **Segment model**: gradient-boosted trees predicting each segment's time from its features; train on the per-segment labels.
3. **Traffic propagation**: a **graph neural network** over the road graph (segments as nodes, connections as edges) to predict how congestion will spread over the next 10–60 minutes, which matters for long trips (DeepMind's published Maps work did this with "supersegments").
4. **Route correction**: a small model on top that fixes systematic route-level bias (turn penalties, intersection delays).
5. Optional **quantile heads** (P10, P50, P90) to show a range for uncertain trips.
--- eval
- Offline on future weeks: MAPE overall and by slice; the worst 10 cities matter more than the average.
- Compare against the baseline per slice, so a better global number doesn't hide a regression in one city.
- A/B: accuracy on completed trips, route choice changes, latency. Watch for the **feedback effect**: if ETAs change routes, traffic itself changes.
--- serve
- The router needs segment costs, so predicted segment times are **precomputed** every few minutes for each time bucket and stored in a fast map service; the router reads them while searching.
- The final ETA for the chosen route is computed once with the full model (more features, route correction).
- **During the trip**: refresh every minute with the remaining segments and live speed; smooth changes so the number doesn't jump around.
- Monitoring: live data coverage per region (fewer phones at night), error on completed trips per hour, feature freshness.
--- deep
**Sparse data** (rural roads, night): fall back to historical and road-class priors; the graph model shares information from neighbouring segments.

**Sudden events** (accident, closure): live speeds drop before the model knows why; incident reports and user reports raise segment costs immediately.

**Bias**: if the model is late-biased users leave earlier and trust it; early-biased loses trust fast; tune for low signed bias and report P90.
--- variants
Q: Food delivery ETA (restaurant + courier)
A: Add preparation time (restaurant-specific, order size), courier assignment and pickup wait; labels from each stage's timestamps.
Q: Ride-hailing pickup ETA
A: Driver to rider time on short urban routes, plus driver acceptance delays.
Q: Cyclists and walkers
A: Different speeds, elevation, few live signals; mostly historical and elevation-based models.
--- steer
Q: Why not a single model on the whole route?
A: The router needs segment costs for search; segment models compose; route correction handles what composition misses.
Q: A stadium event ends and traffic jams in minutes.
A: Event calendars as features, live speeds, propagation model, quick refresh during trips.
Q: How do you clean the labels?
A: Remove stops, detours and GPS jumps; only use trips that followed the route.
Q: Users say ETAs are always optimistic.
A: Measure signed bias by slice; adjust loss or quantile; show ranges.
--- pitfalls
- Using full trip times that include coffee stops and detours as labels
- Reporting only a global average error
- A model the router can't query fast enough
- Ignoring that predictions change traffic itself
- No fallback where live data is thin
--- level
- **L4**: regression with time-of-day and live speed features, MAE.
- **L5**: segment decomposition for the router, label cleaning, propagation over the road graph, quantiles, slice evaluation, precompute plus final-route scoring, in-trip updates.
- **L6**: the whole routing stack and how ETAs change traffic; global data quality.
--- nodes
user|Maps app|client|0|150|Asks for directions; shares location (opt-in) during trips.
route|Router|service|200|150|Searches the road graph with predicted segment costs.
segs|Segment time store|cache|200|20|Predicted time per segment per time bucket, refreshed every few minutes.
eta|ETA model|service|420|150|Full model on the chosen route: segment times + route correction + quantiles.
live|Live traffic pipeline|queue|420|290|Anonymous location pings → live speeds per segment.
gnn|Propagation model|worker|420|20|Graph model over the road network; predicts congestion spread.
train|Trip labels & training|worker|640|290|Cleaned completed trips; time- and region-based evaluation.
--- edges
user>route|directions
route>segs|segment costs
route>eta|best route
eta>user|ETA and range
live~segs|live speeds
gnn~segs|future speeds
live~train|completed trips
train~eta|new model
--- prereqs
feature-engineering, gradient-boosting, regression-business-metrics
--- paths
- [deep] Labels from real trips :: Remove stops, detours and GPS jumps; per-segment and per-route labels.
- [deep] Serving inside the router :: Precomputed segment costs per time bucket; full model only on the chosen route.
  - The router calls ETA 100,000 times per request :: Read cached segment costs; never call the full model in the search loop.
- [deep] Long trips through changing traffic :: Propagation over the road graph to predict speeds when you'll reach each segment.
- [failure] Sparse data at night or in rural areas :: Historical and road-class priors; neighbours in the graph.
- [variation] Food delivery ETA :: Prep time, courier assignment, pickup wait; stage timestamps as labels.
- [deep] Users find ETAs optimistic :: Signed bias by slice, quantile predictions, ranges.

=== d-ml-ads-ctr
title: Design ads click-through rate prediction
topic: ai-recsys
tier: 2
est: 45
prompt: Design the model that predicts the probability that a user clicks an ad, used to rank ads in an auction for a search engine that serves billions of queries a day.
--- words
- **CTR (click-through rate)**: clicks divided by impressions. The model predicts pCTR, the probability of a click for one impression.
- **Auction**: ads are ranked by bid × pCTR (plus quality), so pCTR directly sets prices and revenue.
- **Calibration**: a predicted 2% should really be clicked 2% of the time. Auctions need calibrated numbers, not just a good order.
- **Sparse features**: huge categorical ids (query, ad, advertiser) turned into embeddings.
- **Normalised cross-entropy (NE)**: log loss divided by the log loss of always predicting the average CTR; lower is better.
--- flow
1. **0–5**: where pCTR is used (auction ranking and pricing), latency, scale, cold-start ads, privacy limits.
2. **5–12**: labels (click within a window), position bias, features (query, ad, user context, crosses).
3. **12–22**: logistic regression baseline → deep model with embeddings and feature crosses (DCN, wide & deep), multi-task with conversions.
4. **22–30**: offline log loss/NE and calibration; online revenue, CTR, advertiser value, user experience guardrails.
5. **30–40**: online training, serving thousands of candidates per query, monitoring calibration.
6. **40–45**: deep dive: calibration, position bias, delayed conversions.
--- frame
**Goal**: show ads users find useful, while advertisers get value and the platform earns revenue.

**ML task**: binary classification per (query, ad, context): P(click). Used in the auction as **expected value = bid × pCTR**, so it must be **calibrated**, not only well ordered.

**Metrics**:
- Offline: **log loss / normalised cross-entropy**, calibration (predicted vs observed CTR by bucket and by advertiser), AUC as a secondary ordering check.
- Online: revenue per thousand queries, CTR, conversion rate for advertisers, ad load, user-experience guardrails (long-term query volume, ad blindness, bad-click rate).
--- data
**Labels**: click within, say, 30 seconds of the impression; dedupe accidental double clicks and remove invalid (bot) clicks.

**Position bias**: ads at the top get clicked more regardless of quality. Add **position as a training feature** and set it to a fixed value at serving, or train a separate position-bias tower whose output is dropped at serving.

**Features**:
- *Query*: tokens, query embedding, category, commercial intent.
- *Ad*: ad id, advertiser, creative text embedding, landing page quality, historical CTR (smoothed).
- *Context*: device, location, time, page layout.
- *User* (within privacy rules): coarse interests, recent queries in the session.
- *Crosses*: query × ad keyword match type, query category × advertiser.

**Volume**: billions of impressions a day; down-sample non-clicks (and correct the probability) to save training compute.
--- model
1. **Baseline**: logistic regression on hashed sparse features and crosses, trained online (FTRL), the classic production approach. Easy to calibrate.
2. **Deep model**: embeddings for ids, a cross network (DCN-v2) for explicit feature interactions plus an MLP; or wide & deep. Loss: log loss.
3. **Multi-task**: heads for click, conversion and long click (user stayed on the landing page); shared lower layers.
4. **Calibration layer**: isotonic regression or Platt scaling per segment after training, and correction for negative down-sampling: p = p' / (p' + (1 − p') / w) where w is the negative sampling rate.
5. **Online/continuous training**: new ads appear constantly, so the model updates every few minutes to hours from the click stream.
--- eval
- Offline NE and calibration on the next day's logs; calibration broken down by advertiser size, new ads, devices.
- A/B test with revenue, CTR and advertiser conversions as primary metrics; user guardrails (query volume per user over weeks) because more ads can earn more today and lose users later.
- Long-term holdouts to measure ad blindness.
--- serve
- Per query: retrieval selects a few thousand eligible ads (keyword and embedding match), a light model filters to hundreds, the full pCTR model scores those, the auction ranks and prices.
- Latency budget ~10–20 ms for scoring: batch candidates, cache ad-side embeddings, run on accelerators or optimised CPU.
- **Monitoring**: calibration drift per hour (predicted vs actual CTR), feature coverage, spend anomalies per advertiser.
--- deep
**Calibration**: even small miscalibration moves money between advertisers; monitor by segment, recalibrate frequently, and test in A/B with advertiser-level metrics.

**Cold start ads**: no history, so rely on creative text, advertiser history and similar ads; add small exploration so new ads get impressions to learn from.

**Delayed conversions**: conversions arrive hours or days later; use a delayed-feedback model or wait windows, and don't treat "not yet converted" as negative.
--- variants
Q: Display ads on publisher sites (no query)
A: Context is the page and user interests; more emphasis on user features and frequency capping; viewability matters.
Q: Video ads with a skip button
A: Predict watch-through or not-skip instead of click; labels are continuous watch time.
Q: Privacy rules remove user-level ids
A: Contextual features, cohort-level interests, on-device signals, aggregated measurement.
--- steer
Q: Why does calibration matter if AUC is high?
A: The auction multiplies bid × pCTR; ordering alone doesn't set prices or compare ads from different advertisers.
Q: You down-sampled negatives by 10×. What breaks?
A: Probabilities are inflated; correct them with the sampling-rate formula before the auction.
Q: Top positions get more clicks. Does the model learn that?
A: Position bias: position feature at training, fixed at serving, or a bias tower.
Q: CTR went up, revenue went up, but users search less after a month.
A: Long-term guardrails and holdouts; ad load and quality trade-off.
--- pitfalls
- Optimising AUC and ignoring calibration
- Forgetting to correct down-sampled probabilities
- Letting position bias leak into the ad quality estimate
- No exploration for new ads
- Short-term revenue metrics without user guardrails
--- level
- **L4**: logistic regression or deep model with sparse features, log loss, A/B test.
- **L5**: calibration and its auction role, down-sampling correction, position bias handling, cross networks, continuous training, cascade serving, long-term guardrails.
- **L6**: marketplace effects across advertisers, auction design interplay, privacy-preserving measurement.
--- nodes
q|Search query|client|0|150|Query plus context: device, location, page.
ret|Ad retrieval|service|180|150|Keyword and embedding match: thousands of eligible ads.
light|Light ranker|service|360|150|Cheap model filters to a few hundred.
ctr|pCTR model|service|540|150|Embeddings + cross network, calibrated per segment.
auc|Auction|service|540|20|Rank by bid × pCTR × quality; price.
emb|Ad embedding cache|cache|360|20|Precomputed ad-side embeddings and stats.
logs|Impression & click logs|queue|540|290|Every impression and click, deduped, invalid clicks removed.
train|Continuous training|worker|720|290|Updates every few hours; calibration checks before push.
--- edges
q>ret|eligible ads
ret>light|candidates
light>ctr|top hundreds
ctr>emb|ad features
ctr>auc|pCTR
auc~logs|shown ads
logs~train|labels
train~ctr|new model
--- prereqs
classification-metrics, ab-testing-ml, ranking-models
--- paths
- [deep] Calibration :: Bid × pCTR sets prices; isotonic or Platt per segment; monitor predicted vs actual CTR.
  - Negatives were down-sampled :: Correct with p = p' / (p' + (1 − p') / w) before the auction.
- [deep] Position bias :: Position as a training-only feature or a bias tower; fixed position at serving.
- [deep] Model architecture :: Logistic regression baseline → embeddings + cross network; multi-task click and conversion.
- [variation] New ads with no history :: Creative and advertiser features, similar ads, exploration budget.
- [failure] Calibration drifts after a model push :: Hourly calibration monitors, recalibration, rollback.
- [deep] Revenue up but users search less :: Long-term holdouts, user guardrails, ad load control.

=== d-ml-video-recs
title: Design YouTube video recommendations
topic: ai-recsys
tier: 2
est: 45
prompt: Design the home-page recommendation system for a video platform with billions of users and hundreds of millions of videos.
--- words
- **Candidate generation (retrieval)**: picking a few hundred videos out of hundreds of millions, fast.
- **Ranking**: scoring those few hundred carefully with a bigger model.
- **Two-tower model**: one network embeds the user, another embeds the video; similar vectors mean a good match.
- **Watch time**: how long the user watched. Better signal than clicks, which reward clickbait.
- **Exploration**: deliberately showing some less certain items to learn about them.
--- flow
1. **0–5**: surface (home feed), goal (long-term satisfaction, not just clicks), latency (~200 ms), cold start, freshness.
2. **5–12**: implicit feedback labels, negatives, features for users and videos.
3. **12–25**: funnel: several retrieval sources (two-tower, co-watch, subscriptions, fresh) → light ranker → heavy multi-task ranker → re-ranking for diversity and policy.
4. **25–32**: offline recall@k and NDCG; online watch time, satisfaction surveys, retention.
5. **32–40**: serving: ANN index, feature store, caching; training cadence.
6. **40–45**: deep dive: clickbait, cold start, feedback loops and diversity.
--- frame
**Goal**: users find videos they're glad they watched, so they come back. Clicks alone reward clickbait; total watch time alone rewards long, addictive videos.

**ML task**: rank candidate videos for a user at a moment. The ranker predicts several outcomes (click, watch time, like, share, "not interested", survey satisfaction) and combines them with a tuned **value formula**.

**Metrics**:
- Offline: retrieval recall@k on future watches; ranking NDCG or AUC per head; calibration of watch-time predictions.
- Online: daily active users and return rate (primary, long-term), watch time, satisfaction survey scores, "not interested" rate, diversity; guardrails: policy-violating content exposure, creator fairness.
--- data
**Labels**: implicit: impressions with click/no-click, watch time, completion, likes, dislikes, shares, "not interested", and periodic in-app surveys ("were you satisfied?") that calibrate the value formula.

**Negatives**: impressions not clicked; for retrieval, in-batch negatives plus sampled random videos (with a correction for popularity, since in-batch sampling over-represents popular items).

**Features**:
- *User*: watch history (sequence of video embeddings), searches, subscriptions, demographics where allowed, device, time.
- *Video*: id embedding, title and thumbnail embeddings, channel, age, length, topic, historical engagement.
- *Context*: time of day, device, what was just watched.

**Leakage**: build features as of the impression time; never use future watches.
--- model
**Retrieval** (several sources merged): two-tower model trained with sampled softmax over watches; co-watch graph ("people who watched X watched Y"); subscriptions; fresh uploads from followed channels; trending. Video embeddings indexed in an **ANN index**; the user tower runs per request.

**Light ranker**: small model reduces ~1,000 candidates to ~200.

**Heavy ranker**: multi-task deep network (shared bottom or mixture-of-experts, e.g. MMoE) with heads for click, watch time, like, dismiss, survey score; plus a **position-bias tower** (shallow, uses position, dropped at serving). Final score = weighted combination tuned with online experiments.

**Re-ranking**: diversity (not 10 videos from one channel), freshness, policy filters (borderline content demoted).
--- eval
- Offline: retrieval recall@500 on next-day watches; ranker heads' AUC and NDCG; replay on logged data with off-policy estimators to compare formulas.
- Online A/B for 1–2 weeks: return rate and satisfaction first, watch time second; long-running holdout for long-term effects.
- Slices: new users, new videos, small creators, languages.
--- serve
- Request: user features from a feature store → user tower → ANN lookup per source → merge and dedupe → light ranker → heavy ranker on accelerators (batch the 200 candidates) → re-rank → response under ~200 ms.
- Video embeddings re-indexed hourly; fresh uploads get content-based embeddings immediately.
- Training: ranker retrains daily (or continuously) on recent logs; retrieval weekly or daily.
- Monitoring: recall of each source, latency per stage, prediction drift, share of feed from each source.
--- deep
**Clickbait**: click-trained models love it; watch time and satisfaction heads plus dislikes and "not interested" penalise it; surveys tune the weights.

**Cold start**: new videos use title, thumbnail and audio embeddings plus channel history and a small exploration budget; new users get popular-in-region and onboarding topics, then fast session-based updates.

**Feedback loops**: the model only sees reactions to what it showed; exploration, position-bias modelling and diversity constraints stop it narrowing users into a bubble.
--- variants
Q: Short videos (a vertical feed)
A: One item at a time, very fast feedback (skip in 1 s), session-level sequence models and stronger exploration.
Q: "Up next" after a video
A: Strong context from the current video: co-watch and content similarity matter more than the home-feed user profile.
Q: Kids' version
A: Strict content policy filters, no personalised ads, parent controls, different satisfaction signals.
--- steer
Q: Why not one model over all videos?
A: Hundreds of millions of videos × 200 ms: retrieval with ANN, then rankers on hundreds.
Q: How do you choose the weights between click, watch time and likes?
A: Tune against long-term metrics in A/B tests and satisfaction surveys; off-policy replay to narrow choices.
Q: The model keeps recommending the same few genres.
A: Feedback loop: exploration, diversity re-ranking, topic-level holdouts.
Q: A new creator uploads; how do they get seen?
A: Content embeddings, exploration budget, measured fairness to small creators.
--- pitfalls
- Optimising clicks only
- Ranking all items with one heavy model
- In-batch negatives without popularity correction
- No plan for position bias or feedback loops
- Short A/B tests that miss long-term effects
--- level
- **L4**: retrieval then ranking, two-tower, watch time.
- **L5**: multiple retrieval sources, sampled softmax with correction, multi-task ranker with a position tower, value formula tuned by experiments and surveys, cold start and exploration, feedback loops.
- **L6**: long-term user value, creator ecosystem effects, policy and responsibility trade-offs across the platform.
--- nodes
app|App home feed|client|0|150|Requests recommendations, logs impressions and watches.
fs|Feature store|cache|180|20|User history, video stats, freshness-safe features.
ret|Retrieval sources|service|180|150|Two-tower ANN, co-watch, subscriptions, fresh, trending.
ann|ANN index|db|180|290|Video embeddings, re-indexed hourly.
rank|Light + heavy rankers|service|380|150|Multi-task heads; position tower dropped at serving.
rr|Re-ranker|service|560|150|Diversity, freshness, policy demotions.
logs|Event logs|queue|380|290|Impressions, watches, likes, dismissals, surveys.
train|Training pipelines|worker|560|290|Daily ranker, weekly retrieval, A/B and holdouts.
--- edges
app>ret|request
ret>fs|user features
ret>ann|nearest videos
ret>rank|~1,000 candidates
rank>rr|scored
rr>app|feed
app~logs|events
logs~train|labels
train~rank|new models
train~ann|new embeddings
--- prereqs
two-tower-retrieval, ranking-models, recsys-problems
--- paths
- [deep] The funnel :: Multiple retrieval sources with ANN, light then heavy ranker, re-ranking.
  - Training the retrieval tower :: Sampled softmax with in-batch negatives and popularity correction.
- [deep] What the ranker optimises :: Multi-task heads combined by a value formula tuned on long-term metrics and surveys.
  - Clickbait is winning :: Watch time, satisfaction, dislikes and dismissals in the formula.
- [deep] Position bias :: Shallow position tower at training, dropped at serving.
- [variation] Short-video vertical feed :: Session sequence models, fast skip signals, more exploration.
- [failure] Users get stuck in one topic :: Exploration, diversity constraints, holdouts.
- [variation] A brand-new creator :: Content embeddings, exploration budget, fairness measurement.

=== d-ml-search-ranking
title: Design search ranking for an app store or shopping search
topic: ai-recsys
tier: 2
est: 45
prompt: Design the ranking system that orders results when a user types a query into a large product search engine with 100 million items.
--- words
- **Learning to rank**: training a model to order results, from pairs or lists rather than single labels.
- **NDCG**: a ranking metric that rewards putting the most relevant results at the very top.
- **Query understanding**: spelling fixes, synonyms, categories and intent extracted from the raw query.
- **Pairwise loss**: the model is trained so a better item scores above a worse one for the same query.
- **Human relevance ratings**: raters grade results for a query on a scale (perfect, good, fair, bad).
--- flow
1. **0–5**: query volume, latency (~150 ms), what "good" means (relevance, purchases), personalisation, freshness.
2. **5–12**: labels: clicks, add-to-cart, purchases, human ratings; position bias; features.
3. **12–22**: retrieval (lexical + embedding) → learning-to-rank (GBDT with LambdaMART, then neural) → business re-ranking.
4. **22–30**: NDCG on rated sets, online purchases per search, zero-result rate.
5. **30–40**: serving, index updates, caching heavy queries.
6. **40–45**: deep dive: position bias, tail queries, personalisation.
--- frame
**Goal**: users find what they want quickly; success = a purchase or install soon after the search, without reformulating.

**ML task**: given query and candidates, produce an ordered list. Learning-to-rank optimising a ranking metric.

**Metrics**:
- Offline: **NDCG@10** on human-rated query sets; NDCG on click/purchase-derived labels; MRR for navigational queries.
- Online: purchases (or installs) per search, click-through on the first page, **reformulation rate**, zero-result rate, time to first click; guardrails: latency, seller fairness.
--- data
**Labels**:
- Behavioural: click, add-to-cart, purchase with graded weights (purchase > cart > click > skip). Huge volume but biased by position and presentation.
- Human ratings: smaller, cleaner, used for evaluation and for tail queries.

**Position bias**: correct with randomisation experiments (swap results on a small share of traffic) to estimate how much each position is examined, then **inverse propensity weighting** in the loss.

**Features**:
- *Query–item text match*: BM25 scores on title and description, embedding similarity from a two-tower or cross-encoder.
- *Item*: popularity, rating, price, availability, freshness, conversion rate (smoothed).
- *Query*: category intent, length, head vs tail.
- *User* (light): past categories, price range, location.
--- model
1. **Retrieval**: lexical index (inverted index with BM25) plus embedding retrieval (two-tower) to catch synonyms and misspellings; union ~1,000 candidates.
2. **Ranker**: **LambdaMART** (gradient-boosted trees with a listwise objective that targets NDCG) as the strong baseline on hand-built features.
3. **Neural re-ranker** for the top ~50: a cross-encoder (BERT-like) reading the query and item text together, distilled to a small model for latency.
4. **Business re-ranking**: deduplicate near-identical listings, diversity across sellers, sponsored slot rules kept separate from organic ranking.
--- eval
- Offline NDCG@10 on a fixed rated set (head, torso and tail queries reported separately) plus counterfactual evaluation on logs with propensity weights.
- **Interleaving** experiments (mix results from two rankers in one list and see which gets clicks): far more sensitive than A/B for ranking changes.
- A/B for purchases per search and reformulation rate.
--- serve
- Query understanding (spell, synonyms, category) → parallel lexical and vector retrieval → feature fetch → GBDT on 1,000 → neural re-ranker on 50 → response.
- Cache results for head queries (short TTL because of price and stock changes).
- Index updates stream in for price and availability within minutes; embeddings refresh daily.
- Monitoring: zero-result rate, latency per stage, NDCG on a daily rated sample, click entropy.
--- deep
**Tail queries** (most distinct queries are rare): no behavioural data, so text match, embeddings and human ratings carry them; query rewriting maps them to head queries.

**Position bias**: without correction the model learns "items at the top are good" and freezes the ranking; propensity weighting and randomised swaps fix it.

**Personalisation**: small boosts from user history; never override strong relevance; avoid filter bubbles in search.
--- variants
Q: Web search instead of products
A: Much larger index, authority signals (links), freshness for news, spam pages, query intents (navigational, informational).
Q: App store search
A: Installs as labels, app quality and ratings, brand queries for a specific app must put it first.
Q: Voice search with one answer
A: Only the top result matters: precision@1, confidence thresholds, fall back to asking.
--- steer
Q: Why not train on clicks directly?
A: Position and presentation bias; propensity weighting, randomisation, graded labels, human ratings.
Q: How do you compare two rankers quickly?
A: Interleaving, then A/B for business metrics.
Q: A misspelled query returns nothing.
A: Spell correction, embedding retrieval, query rewriting.
Q: Latency is too high with the cross-encoder.
A: Apply only to the top 50, distil it, cache head queries.
--- pitfalls
- Training on raw clicks without bias correction
- Only lexical retrieval (misses synonyms) or only embeddings (misses exact ids)
- Running a heavy model on every candidate
- Evaluating only head queries
- Mixing sponsored results into the organic ranker's labels
--- level
- **L4**: retrieval + ranker with text match features, NDCG.
- **L5**: graded behavioural labels with position-bias correction, LambdaMART, distilled cross-encoder for the top results, interleaving, head/tail slices.
- **L6**: query understanding as a platform, marketplace effects on sellers, multi-objective ranking with ads.
--- nodes
user|Search box|client|0|150|Query plus user context.
qu|Query understanding|service|170|150|Spelling, synonyms, category intent.
lex|Lexical index|db|340|40|Inverted index, BM25.
vec|Vector index|db|340|260|Two-tower embeddings, ANN.
rank|LTR ranker|service|500|150|LambdaMART on 1,000 candidates.
ce|Neural re-ranker|service|660|150|Distilled cross-encoder on the top 50; business rules.
logs|Search logs|queue|500|300|Impressions, clicks, carts, purchases, randomised swaps.
--- edges
user>qu|query
qu>lex|terms
qu>vec|embedding
lex>rank|candidates
vec>rank|candidates
rank>ce|top 50
ce>user|results
user~logs|behaviour
logs~rank|propensity-weighted labels
--- prereqs
ranking-metrics, ranking-models, embedding-similarity
--- paths
- [deep] Labels from behaviour :: Graded purchase > cart > click; position bias via propensity weighting and randomised swaps.
- [deep] The ranker :: LambdaMART on hand-built features; distilled cross-encoder for the top 50.
  - Latency budget is 150 ms :: Cascade, cache head queries, distil the cross-encoder.
- [deep] Evaluating a new ranker :: NDCG on rated sets by head/tail, interleaving, then A/B.
- [failure] Tail and misspelled queries return junk :: Embedding retrieval, rewriting, human-rated tail sets.
- [variation] Web search :: Authority signals, freshness, spam, query intent types.

=== d-ml-pymk
title: Design "People you may know"
topic: ai-recsys
tier: 2
est: 45
prompt: Design the friend or connection suggestion feature for a social network with a billion users.
--- words
- **Social graph**: users are nodes and friendships are edges.
- **Friends of friends (FoF)**: people two steps away; most new connections come from here.
- **Link prediction**: predicting which missing edges in a graph will form.
- **Graph embedding**: a vector per node learned so that connected nodes have similar vectors.
- **Acceptance rate**: share of sent requests that get accepted. The real goal, not just requests sent.
--- flow
1. **0–5**: goal (accepted connections that lead to interaction), surfaces, scale (billion nodes, hundreds of friends each), privacy.
2. **5–12**: labels (request sent, accepted, later interaction), features (mutual friends, shared groups, schools, contact uploads).
3. **12–22**: candidate generation (FoF, graph embeddings, contacts, shared groups) → ranking model → filtering.
4. **22–30**: offline recall and AUC; online accepted connections, interactions, complaints.
5. **30–40**: batch precompute vs real time, graph processing at scale.
6. **40–45**: deep dive: privacy, cold start, fairness and abuse.
--- frame
**Goal**: help users connect with people they actually know, leading to meaningful interaction, without creepy or unwanted suggestions.

**ML task**: link prediction: for user u and candidate v, P(u sends a request and v accepts). Ranking per user.

**Metrics**:
- Offline: recall@k of connections formed in the next week; AUC of the ranker.
- Online: **accepted connections per user**, interactions between new connections in the following weeks, "remove suggestion" and block rates, complaints; guardrail: unwanted requests received by any one user (no spamming popular people).
--- data
**Labels**: positive = request sent and accepted; weak negative = shown and ignored; strong negative = removed or request declined. Labels from suggestions shown have **exposure bias**; also learn from connections users made organically (search, profile visits).

**Features** for the pair (u, v):
- *Graph*: number of mutual friends, Adamic–Adar (mutual friends weighted by how few friends each has), shared groups, overlap in interactions.
- *Profile*: same school, employer, city, age band (where users permit).
- *Activity*: profile views, contact upload match (with consent), tagged in the same photos.
- *Candidate*: how many requests they receive and accept, account age (spam risk).
--- model
1. **Candidates**: FoF is the main source, but a user with 500 friends has ~100,000 FoF; take FoF ranked by mutual count, plus graph-embedding neighbours (node2vec or a GNN embedding in an ANN index), plus contacts and group co-members. Total ~1,000.
2. **Baseline**: rank by mutual friend count, which is surprisingly strong.
3. **Ranker**: gradient-boosted trees or a deep model on pair features, two heads: P(request) and P(accept | request); score = product, optionally weighted by expected later interaction.
4. Filters: blocked, declined before, privacy settings, minors' rules.
--- eval
- Offline: hold out a week's new connections; recall@k of candidate generation, AUC of the ranker.
- A/B: accepted connections per user and downstream interaction; guardrails on blocks, removals and requests per popular user.
- Slices: new users, users with few friends, different countries.
--- serve
- Candidate generation is heavy graph work: **batch daily** (Spark-like or graph processing jobs) computes FoF and embedding neighbours per user and stores the top ~500 in a key-value store.
- Online ranking at request time with fresh features (just joined a group, new friend added) on the precomputed candidates; new events trigger incremental refresh for active users.
- Monitoring: acceptance rate trends, candidate coverage, request volume per receiver.
--- deep
**Privacy and creepiness**: suggestions can reveal sensitive links (a therapist's clients share a contact); exclude sensitive signals, let users opt out of contact matching, and never explain a suggestion with private data.

**Cold start**: new users have no graph; contact upload (with consent), onboarding questions (school, workplace), and quick feedback from their first few connections.

**Popular people**: everyone is two steps from a celebrity; cap suggestions of high in-degree accounts and use acceptance probability, not request probability.
--- variants
Q: Professional network (LinkedIn-style)
A: Shared employers and schools weigh more, people search by title; connections across companies; recruiter abuse.
Q: Suggest groups or communities instead
A: User–group bipartite graph; membership of friends; activity level of the group.
Q: Follows on a creator platform (asymmetric)
A: No acceptance step; predict follow and later engagement; more interest-based than graph-based.
--- steer
Q: FoF for a user with 1,000 friends is huge. How do you generate candidates?
A: Rank FoF by mutual count with sampling, plus embedding ANN; precompute in batch.
Q: Why two heads?
A: A request isn't success; acceptance (and later interaction) is; also protects receivers from spam.
Q: A user complains a suggestion revealed a secret relationship.
A: Sensitive signal exclusion, no explanations from private data, opt-outs.
Q: How fresh must suggestions be?
A: Batch daily plus incremental updates on new edges for active users.
--- pitfalls
- Optimising requests sent instead of accepted connections
- Enumerating full FoF online at request time
- Ignoring privacy leaks in suggestions and explanations
- Suggesting the same popular accounts to everyone
- No strong negatives from removals and declines
--- level
- **L4**: FoF candidates, mutual friends features, ranking model.
- **L5**: scalable candidate generation (FoF ranking, graph embeddings), two-head objective with downstream interaction, exposure bias, batch + incremental serving, privacy safeguards.
- **L6**: network-level effects (graph density, growth in new markets), abuse and safety across the platform.
--- nodes
app|Suggestions UI|client|0|150|Shows suggestions; logs shown, sent, removed.
api|PYMK service|service|200|150|Ranks precomputed candidates with fresh features.
cand|Candidate store|db|200|20|Top ~500 candidates per user, refreshed daily and on new edges.
graph|Graph jobs|worker|420|20|FoF counts, Adamic–Adar, node embeddings + ANN.
rank|Ranker|service|420|150|P(request) × P(accept); filters for privacy and blocks.
logs|Event logs|queue|420|290|Shown, requested, accepted, removed, blocked.
train|Training|worker|620|290|Weekly ranker, embedding refresh.
--- edges
app>api|request
api>cand|candidates
api>rank|score
rank>app|suggestions
graph~cand|batch candidates
app~logs|events
logs~train|labels
train~rank|new model
--- prereqs
collaborative-filtering, two-tower-retrieval
--- paths
- [deep] Candidate generation at scale :: FoF ranked by mutual friends, graph-embedding ANN, contacts; batch precompute.
  - A user has 1,000 friends :: Sample and rank FoF by mutual count; cap per source.
- [deep] What to predict :: Two heads, P(request) × P(accept), weighted by later interaction.
- [failure] A suggestion reveals something private :: Sensitive signal exclusion, opt-outs, no private explanations.
- [variation] Asymmetric follows :: No acceptance step; interest signals; engagement after follow.
- [deep] New users with no friends :: Contacts with consent, onboarding facts, fast feedback.

=== d-ml-feed
title: Design news feed ranking
topic: ai-recsys
tier: 2
est: 45
prompt: Design the ranking of posts in the home feed of a social network where each user has thousands of eligible posts from friends, groups and pages each time they open the app.
--- words
- **Eligible inventory**: all posts a user could see now (friends', groups', pages' recent posts).
- **Engagement prediction**: probabilities of like, comment, share, hide, report for each post.
- **Value model**: the weighted sum of predicted engagements used as the ranking score.
- **Integrity**: removing or demoting harmful, misleading or spammy content.
- **Session**: one visit to the app; feed ranking happens at the start and as the user scrolls.
--- flow
1. **0–5**: what success is (meaningful interactions, time well spent), latency, scale, freshness.
2. **5–12**: labels (likes, comments, shares, dwell time, hides), features (author affinity, content, recency).
3. **12–22**: inventory → light ranker → multi-task heavy ranker → value model → re-ranking (diversity, integrity).
4. **22–30**: offline AUC per head; online sessions, meaningful interactions, hides; long-term holdouts.
5. **30–40**: serving at app open, fan-out vs pull of inventory, caching.
6. **40–45**: deep dive: clickbait and integrity, weights, creators.
--- frame
**Goal**: show posts that lead to meaningful interactions and a feed users are glad they checked, not compulsive scrolling.

**ML task**: rank eligible posts per user; multi-task prediction of P(like), P(comment), P(share), expected dwell time, P(hide), P(report); **score = Σ weight × prediction**, negative weights on hide and report.

**Metrics**:
- Offline: AUC/log loss per head, calibration (the value model sums probabilities, so they must be calibrated).
- Online: daily active users and sessions, meaningful interactions (comments, shares between friends), hide and report rates, survey "worth your time"; guardrails: integrity exposure, creator reach distribution.
--- data
**Labels**: impression logs with each engagement; dwell time (filter accidental scrolls); hides, unfollows and reports as strong negatives; surveys sample users to calibrate what "meaningful" means.

**Features**:
- *Author–viewer affinity*: past interactions, messaging, profile visits, friendship strength.
- *Post*: type (photo, video, link, text), age, early engagement velocity, text and image embeddings, author's history, integrity classifier scores.
- *Viewer*: preferred content types, session context, device and connection speed (video on slow networks).

**Bias**: you only observe engagement on posts shown and seen; log viewport visibility so unseen posts don't become negatives.
--- model
1. **Inventory**: pull recent posts from friends, groups, pages (~thousands) from a timeline store.
2. **Light ranker**: small model or simple affinity × recency to cut to ~500.
3. **Heavy ranker**: multi-task deep model (shared layers with task towers, MMoE) predicting each engagement; inputs include embeddings of author, post and viewer.
4. **Value model**: weights chosen through experiments and surveys; separate integrity demotions multiply the score.
5. **Re-ranking**: diversity of authors and types, no runs of the same author, ads slots inserted by a separate system.
--- eval
- Offline: per-head AUC and calibration; counterfactual replay of value-model weights on logged data.
- A/B tests with long-term holdouts (months), because engagement-maximising changes can hurt retention and well-being later.
- Slices: light vs heavy users, new users, content types, creators of different sizes.
--- serve
- At app open: fetch inventory (pull from the timeline store plus precomputed candidate lists for heavy authors) → features from a feature store → rankers on accelerators → first page in ~300 ms; prefetch the next page while the user scrolls.
- Real-time features: early engagement counts on fresh posts updated in seconds.
- Monitoring: head calibration, distribution of content types, integrity exposure rate, latency.
--- deep
**Weights**: there is no ground truth for the weights; tune them by A/B tests against long-term metrics and survey answers, and review changes as product decisions.

**Clickbait and outrage**: engagement predictions reward provocative posts; integrity classifiers demote them, negative weights on hides and reports, and "worth your time" surveys counterbalance.

**Fresh posts**: no engagement history yet; use author affinity and early-velocity features with a recency boost.
--- variants
Q: Chronological option
A: Show latest first for users who choose it; ranking only for filtering spam and integrity.
Q: Interest-based (non-friend) content in the feed
A: Add a recommendation source like the video system; balance with friend content through the value model.
Q: Ranking stories (24-hour, horizontal tray)
A: Rank authors, not posts; strong affinity weights; freshness critical.
--- steer
Q: How do you pick the weights in the value model?
A: Experiments on long-term metrics plus surveys; product review; counterfactual replay to shortlist.
Q: Engagement went up, but users report feeling worse.
A: Long-term holdouts, survey metrics, demote outrage and clickbait, integrity weights.
Q: A post that was scrolled past quickly: negative label?
A: Only if seen (viewport logging) and with dwell thresholds; otherwise unknown.
Q: Why calibration here?
A: The value model adds probabilities across heads; miscalibrated heads distort the sum.
--- pitfalls
- A single engagement label (clicks) as the objective
- Uncalibrated heads summed in a value model
- Treating unseen posts as negatives
- Short-term A/B tests only
- Integrity as an afterthought instead of part of the score
--- level
- **L4**: multi-head engagement model, ranking by weighted score.
- **L5**: inventory → light → heavy funnel, calibrated multi-task heads with a value model tuned on long-term metrics, viewport-aware labels, integrity demotions, freshness features.
- **L6**: societal effects, creator ecosystem, product governance of objectives.
--- nodes
app|Feed app|client|0|150|Opens feed, scrolls, logs visible impressions.
inv|Inventory service|service|180|150|Recent posts from friends, groups, pages.
tl|Timeline store|db|180|20|Recent posts per author.
fs|Feature store|cache|380|20|Affinities, post stats, early engagement counts.
rank|Rankers + value model|service|380|150|Light → multi-task heavy → weighted score with integrity demotions.
rr|Re-ranker|service|580|150|Diversity, author spacing, ad slots.
logs|Engagement logs|queue|380|290|Impressions with viewport, engagements, hides, surveys.
train|Training|worker|580|290|Daily heads, value-model experiments, holdouts.
--- edges
app>inv|open feed
inv>tl|recent posts
inv>rank|candidates
rank>fs|features
rank>rr|scored
rr>app|feed page
app~logs|events
logs~train|labels
train~rank|new model
--- prereqs
ranking-models, recsys-problems, ab-testing-ml
--- paths
- [deep] Multi-task prediction and the value model :: Calibrated heads, weights from long-term experiments and surveys.
  - Heads are miscalibrated :: Recalibrate per head; the sum is meaningless otherwise.
- [deep] Labels :: Viewport-aware impressions, dwell thresholds, strong negatives from hides and reports.
- [failure] Outrage posts dominate :: Integrity demotions, negative weights, survey metrics.
- [deep] Serving at app open :: Inventory pull, cascade, prefetch next page, real-time early engagement.
- [variation] Chronological feed option :: Latest first with spam and integrity filtering only.
- [variation] Adding unconnected recommended content :: New retrieval source balanced in the value model.
