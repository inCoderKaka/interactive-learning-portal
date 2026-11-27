=== sd-round
blurb: What actually happens in a system design interview at Google, minute by minute, and what separates an L4 answer from an L5 and an L6 one.
signals: Any "design X" interview question | You are about to start a system design round and want a plan | You keep running out of time before the interesting part

--- lesson
:::words
- **System design interview**: a 45–60 minute conversation where you design a large software system (a chat app, a URL shortener) on a whiteboard or shared doc. There is no single right answer; you are judged on how you reason.
- **Requirements**: what the system must do and how well it must do it.
- **Component**: one box on your diagram, such as a database, a cache or a service.
- **Deep dive**: going into the details of one component: its data structures, its failure cases, its numbers.
- **Trade-off**: choosing one benefit at the cost of another.
- **L4, L5, L6**: Google's engineering levels. L3 is a new graduate, L4 a mid-level engineer, L5 a senior engineer, L6 a staff engineer.
:::

## The problem in plain words

Someone says "design YouTube" and gives you 45 minutes. Nobody can design YouTube in 45 minutes; YouTube took thousands of engineers many years. So the interviewer is not checking whether you produce the "correct" design. They are watching *how you think* when a problem is far too big and too vague: do you narrow it down, pick sensible numbers, build something that works, find its weak points and fix the ones that matter?

:::eli5
Imagine being asked to plan a city in an afternoon. A good planner does not start by drawing street lamps. They ask how many people will live there, sketch the main roads, water and power, check that a fire truck can reach every house, and then spend the remaining time on the hardest problem (say, the bridge over the river). That is exactly the shape of a good system design interview.
:::

## How 45 minutes is usually spent

| Minutes | Phase | What you produce |
|---|---|---|
| 0–5 | Requirements | 3–5 core features, what is out of scope, and targets for scale, speed, availability and correctness |
| 5–10 | Estimation | A few numbers that change decisions: requests per second, storage per year, read-to-write ratio |
| 10–15 | API and data | The main operations (for example `POST /videos`, `GET /feed`) and the main records and how they are looked up |
| 15–25 | High-level design | Boxes and arrows that make every core feature work end to end. Walk one request through them |
| 25–40 | Deep dives | The 2–3 hardest parts, in detail. This is where the level is decided |
| 40–45 | Wrap-up | Bottlenecks, what fails and what happens then, what you would monitor, what changes at 10× the load |

The clock matters because the most common failure is spending 25 minutes on requirements and boxes and never reaching a deep dive. The deep dive is where an interviewer sees whether you understand anything below the surface.

:::tip Say the plan out loud
Start with one sentence: "I'll spend a few minutes on requirements and rough numbers, sketch an end-to-end design, then go deep on the parts that are hardest at this scale." The interviewer now knows you have a plan, and can redirect you early if they want something else.
:::

## What the interviewer writes down

Google does not publish the rubric, but candidate reports and interviewer guides consistently describe the same dimensions. Think of them as five questions the interviewer must answer in their written feedback:

1. **Problem navigation.** Did you turn a vague prompt into a clear, scoped problem without being led? Did you ask questions whose answers change the design (and skip ones that do not)?
2. **Solution design.** Does the design actually work for every core feature? Does it meet the numbers you estimated?
3. **Technical depth.** On any box you drew, can you go two levels down? "We use a cache" is level zero. Level one: what is cached, under which key, with which expiry. Level two: what happens when that entry expires while 50,000 requests a second are reading it.
4. **Trade-offs.** Every important choice is stated as a decision with a reason and a cost: "I'll store messages in a wide-column store over a relational database because the access pattern is 'latest messages of one chat', which is a single sorted range read; the cost is that cross-chat queries become hard, and we don't need them."
5. **Communication.** The interviewer always knows where you are and why. You think out loud, check in, and respond to hints.

## What changes with level

The same question is asked at L4, L5 and L6. The difference is not the difficulty of the question but **who drives** and **how far you see**.

| | L4 (mid-level) | L5 (senior) | L6 (staff) |
|---|---|---|---|
| Who drives | Interviewer steers; you build a working design with hints | You run the session; the interviewer mostly asks "why?" and "what if?" | You run it and reframe it: which requirements matter, what to build first, what not to build |
| Depth | One solid deep dive when asked | Two or three deep dives you choose yourself, because you spotted they are the hard parts | Depth plus breadth: migrations, multi-team boundaries, cost |
| Failure | Mentions that servers can fail | Explains how the system *degrades* when each part fails, and at peak load | Designs for failure from the start; blast radius, rollout, recovery |
| Trade-offs | Knows the options | Picks one and defends it with numbers | Ties the choice to business needs and long-term evolution |

A sentence often used by interviewers: an L4 can design a system that works; an L5 can design it, defend it, and explain how it fails. Interviewers also like to change a constraint halfway ("traffic just went up 10×", "the data must now stay in Europe") to see whether you adapt the design or start again.

## A worked opening

Prompt: *Design a URL shortener.*

A strong opening, about two minutes:

> "Core features: create a short link from a long URL, and redirect a short link to its long URL. Optional: custom aliases, expiry, click analytics; I'll treat analytics as out of scope unless you want it. Users: assume 100 million new links a month and a 100-to-1 read-to-write ratio, so redirects dominate. Redirects should be fast, under 50 ms at p99, and highly available; a redirect that fails is a broken link on someone's web page. Creating links can be a little slower. A short code must never point to two different URLs, so creation needs uniqueness; redirects can tolerate a few seconds of staleness. Does that match what you had in mind?"

Notice what is there: features, non-goals, a number for scale, the read/write split, a latency target with a percentile, availability, and a consistency statement for each operation. Each of those changes the design later.

## Where time goes wrong

- **Designing before scoping.** You draw a message queue before knowing whether the system even needs asynchronous work.
- **Numbers that drive nothing.** Ten minutes computing bandwidth to three significant figures, then never using it.
- **Box soup.** Twelve boxes (Kafka, Redis, Elasticsearch, a CDN) without a sentence on why each exists. Every box must earn its place by solving a problem you named.
- **No request walk-through.** Boxes are not a design until you trace one read and one write through them.
- **Waiting to be asked.** At L5, you name the hard parts yourself: "the interesting problems here are generating unique codes without coordination, and serving hot links."

## Interview angles

- "What would you do differently if you had a year?" They want to hear priorities: what you would measure first, what you would build first, and what you would deliberately postpone.
- "What is the first thing to break?" Name the bottleneck from your own numbers, not a generic "the database".
- "How would you test this?" Load tests at peak multiples, failure injection (kill a node, slow a dependency), and a staged rollout.

## Connections

This chapter's other pages expand each phase: [requirements](/learn/sd-requirements), [API and data model](/learn/sd-api-data), and [deep dives and failure modes](/learn/sd-deep-dives). The estimation chapter covers the numbers.

--- revise
### The clock
? The six phases of a 45-minute design round, in order? :: Requirements (≈5) → estimation (≈5) → API and data model (≈5) → high-level design (≈10) → deep dives (≈15) → wrap-up (≈5).
? The most common way to fail on time? :: Never reaching a deep dive because requirements and boxes took 25+ minutes.
? What do you say in the first 20 seconds? :: Your plan: requirements and numbers, end-to-end sketch, then deep dives on the hardest parts.

### What is scored
? The five things an interviewer writes feedback on? :: Problem navigation, solution design, technical depth, trade-offs, communication.
? What does "two levels down" mean for a cache? :: Level 1: key, value, expiry. Level 2: what happens on expiry under heavy load (stampede) and how you prevent it.
? The shape of a well-stated trade-off? :: "X over Y because Z; the cost is W (and we can live with it because …)."

### Levels
? L4 vs L5 in one line? :: L4 designs a working system with hints; L5 drives, picks the deep dives, and explains how it degrades when parts fail.
? What does L6 add? :: Reframing the problem, sequencing what to build, migrations, cross-team boundaries, cost and blast radius.
? Why do interviewers change a constraint mid-way? :: To see whether you adapt the existing design rationally instead of starting over.

--- notes
## Timeline
0–5 requirements: features, non-goals, scale, latency, availability, consistency.
5–10 estimation: only numbers that change a decision.
10–15 API and data model: operations, records, access patterns.
15–25 high-level design; walk one read and one write through it.
25–40 deep dives on the 2–3 hardest parts; this decides the level.
40–45 bottlenecks, failure modes, monitoring, 10× growth.
## Scored dimensions
Problem navigation · solution design · technical depth · trade-offs · communication.
Depth = two levels below any box you drew.
Trade-off = decision + reason + cost.
## Levels
L4: works, with hints. L5: drives, defends, explains degradation. L6: reframes, sequences, migrates, costs.
## Anti-patterns
Designing before scoping; numbers that drive nothing; box soup; no request walk-through; waiting to be asked.

--- doubts
Q: Is there a "correct" answer the interviewer is looking for?
A: No. Most prompts have several good designs. The interviewer has a list of *signals* (did you scope, estimate, find the hard parts, handle failure, state trade-offs), not an answer key. Two candidates with different databases can both get a strong hire; a candidate with the "textbook" design who cannot defend it will not.

Q: Should I ask lots of clarifying questions?
A: Ask the ones whose answers change the design, and propose a default for each so the conversation moves: "I'll assume 100M daily users; tell me if it's very different." Five sharp questions in three minutes beat fifteen in ten. Questions like "what language should I use?" waste time.

Q: What if the interviewer interrupts and takes me somewhere else?
A: Follow them. Interruptions are usually a hint that they want to see a specific signal (often a deep dive), or that you are heading somewhere unproductive. Briefly note where you were ("I'll come back to the cache layer") and go.

Q: Do I need to know specific products like Kafka or Cassandra?
A: You need to know the *ideas* (a replicated log, a leaderless wide-column store) and roughly what they cost. Naming a well-known product is a useful shorthand, but if you name one, expect "how does it work inside?" and "why that one?". Saying "a durable, partitioned log such as Kafka or Pub/Sub" is fine; claiming facts about a product you do not know is not.

Q: How much detail should the high-level diagram have?
A: Enough that every core feature works end to end, and no more. Typically 5–8 boxes: clients, an entry point (load balancer or gateway), one or two services, the main data stores, a cache, and any asynchronous pipeline. Extra boxes cost you time and invite questions you did not plan for.

Q: Is it bad to change my design halfway?
A: No, it is good when you say why: "with 10× writes, a single primary database won't keep up, so I'll partition by user ID." Changing because the numbers or the new constraint demand it is exactly the adaptability interviewers look for. Changing randomly, without a reason, is not.

Q: How do I show "senior" without sounding arrogant?
A: Drive with questions and proposals rather than declarations: "I think the hard part is fan-out for celebrities; shall I go deep there?" You are leading, but you are checking in. Seniority shows in what you choose to look at, not in how confidently you speak.

Q: What if I don't know something the interviewer asks?
A: Say so and reason from first principles: "I don't know Spanner's exact commit protocol, but if it needs globally ordered timestamps, it has to wait out clock uncertainty somehow, so I'd expect…". Reasoning out loud from what you do know is a strong signal; bluffing is a strong negative one.

--- exercises
[design] You are asked "Design Google Docs" and have 45 minutes. Write your one-sentence plan, then list the three deep dives you would propose, in order.
A: Plan: "Requirements and numbers, an end-to-end design for opening, editing and sharing a document, then deep dives on the hardest parts." Deep dives, in order of how much they shape the design: (1) concurrent editing: how two people typing in the same paragraph converge (operational transformation or CRDTs, a per-document server ordering edits); (2) real-time delivery of edits to everyone viewing the document (long-lived connections, routing all editors of a document to the same server); (3) storage and history: snapshots plus an append-only log of edits, so you can load fast and show version history. Permissions and search are worth a sentence each but are not the hard part.

[choose] Halfway through a design, the interviewer says "traffic just grew 10×". Your design has one relational database. What do you say first?
A: Recompute the numbers before reaching for a solution: "10× takes writes from about 2,000 to 20,000 per second, beyond what one primary comfortably handles; reads from 50,000 to 500,000 per second." Then fix the specific bottleneck: reads with more replicas and a cache; writes by partitioning (by user or document ID) or by moving the hot write path to a store built for it. State the cost: cross-partition queries and transactions become hard. Interviewers want to see the numbers drive the change, not a reflex.

[break] A candidate's diagram has: client → load balancer → API service → Kafka → worker → Cassandra, plus Redis and Elasticsearch on the side. Asked why Kafka is there, they say "for scalability". What is wrong, and what should they have said?
A: "For scalability" names no problem. Every box must solve a named problem. Kafka is justified if, for example, writes must be accepted quickly and processed later (absorbing bursts), several consumers need the same events (analytics, notifications, search indexing), or work must survive a worker crash. If none applies, a direct write is simpler, faster and has fewer failure modes. The same question applies to Redis (what is cached, what hit rate) and Elasticsearch (which query needs full-text search).

[estimate] You have 45 minutes. You have used 22 minutes and are still refining the high-level diagram. What do you do?
A: Stop polishing and go deep now: "This end-to-end design works; I'd like to spend the next 15 minutes on the two hardest parts: X and Y. Which would you prefer first?" Leave 5 minutes for failures and scaling. An imperfect diagram with two strong deep dives scores better than a perfect diagram with none.

[design] Write the 2-minute opening for "Design a rate limiter for a public API": features, non-goals, scale, latency, consistency.
A: Features: limit each API key to N requests per time window, return HTTP 429 with a Retry-After header when over, allow different limits per plan. Non-goals: billing, abuse detection by behaviour. Scale: 1M API keys, 500k requests/s at peak across many servers. Latency: the check adds under 1–2 ms at p99, because it sits on every request. Availability: if the limiter is down, fail open (let traffic through) for most endpoints, fail closed for expensive ones. Consistency: approximate is acceptable; letting through 1–2% extra in a burst is fine, which allows local counters synced periodically instead of a central counter on every request.

--- pitfalls
- Drawing boxes before agreeing on requirements and numbers
- Spending more than 10 minutes before the first end-to-end design exists
- Adding a component (queue, cache, search index) without naming the problem it solves
- Never walking a single request through the design
- Waiting for the interviewer to choose the deep dives (an L4 signal)
- Bluffing about how a specific product works instead of reasoning from principles

--- quiz
Q: Which phase most often decides the level in a system design round?
- Requirements
- *Deep dives
- Estimation
- Drawing the high-level diagram
W: Anyone can draw boxes; going two levels down on the hard parts, and choosing them yourself, is what separates L4 from L5.
Q: An L5 candidate is expected to…
- Wait for the interviewer to pick what to discuss
- Produce the one correct design
- *Drive the session, choose deep dives and explain how the system degrades under failure
- Name as many technologies as possible
W: Ownership is the senior signal: you lead, defend choices and reason about failure.
Q: Which is a well-formed trade-off statement?
- "Cassandra is better than MySQL"
- "We use Kafka for scalability"
- *"A wide-column store over a relational DB, because reads are one sorted range per chat; the cost is hard cross-chat queries, which we don't need"
- "NoSQL scales, SQL doesn't"
W: Decision, reason tied to the access pattern, cost, and why the cost is acceptable.
Q: The interviewer says traffic grew 10×. The best first move is…
- Start a new design from scratch
- *Recompute the numbers and fix the bottleneck they reveal
- Add a cache everywhere
- Say the design already handles it
W: Let the numbers name the bottleneck, then change only what they demand.

--- sources
- article :: How we hire (Google Careers) :: Google :: https://www.google.com/about/careers/applications/how-we-hire/
- article :: Google L5 interview guide :: Hello Interview :: https://www.hellointerview.com/guides/google/l5
- article :: What does a Google L5 system design interview cover? :: DesignGurus :: https://www.designgurus.io/answers/detail/what-does-a-google-l5-system-design-interview-cover
- article :: Google system design interview :: Exponent :: https://www.tryexponent.com/blog/google-system-design-interview
- book :: System Design Interview: An Insider's Guide, vol. 1, ch. 3 (A framework for system design interviews) :: Alex Xu :: https://bytebytego.com/courses/system-design-interview/a-framework-for-system-design-interviews

=== sd-requirements
blurb: Turning "design X" into a precise problem: the few features that matter, what is deliberately left out, and the targets for scale, speed, availability and correctness that every later decision depends on.
signals: The prompt is one vague sentence | You are not sure which features to include | You need numbers to decide between designs
prereq: sd-round

--- lesson
:::words
- **Functional requirement**: something users can do with the system ("send a message", "see my feed").
- **Non-functional requirement**: how well it must work: how many users, how fast, how often it may be down, how correct the data must be.
- **Non-goal**: a feature you explicitly decide not to design, so you can spend your time elsewhere.
- **Latency**: how long one operation takes, as the user feels it.
- **p99**: the 99th percentile. If p99 latency is 200 ms, 99 out of 100 requests take 200 ms or less.
- **Availability**: the share of time the system works, written in "nines": 99.9% is "three nines".
- **Consistency**: whether everyone reading the data sees the same, latest version.
- **Durability**: once the system says "saved", the data is never lost.
:::

## The problem in plain words

"Design Instagram" could mean a hundred different systems: photo storage, a feed, stories, direct messages, search, ads, reels. If you try to design all of them, you will design none of them well. Requirements are how you choose *which* Instagram you are designing, and how good it has to be. Everything later (which database, whether you need a cache, how many servers) follows from these answers, so getting them wrong wastes the whole interview.

:::eli5
Before building a bridge, an engineer asks: how many cars a day, how heavy are the trucks, and must it stay open during storms? A footbridge and a motorway bridge look completely different, and you cannot pick one until you know those three answers.
:::

## Step 1: functional requirements (what it does)

Pick the **3–5 core actions** without which the product does not exist. For a photo-sharing app:

1. Upload a photo with a caption.
2. Follow other users.
3. See a feed of recent photos from people you follow.
4. Like and comment.

Then name the **non-goals** out loud: "I'll leave out stories, direct messages, ads and search unless you want them." This is not laziness; it is scoping, and it is scored. If the interviewer wants one of them, they will say so now, which is far better than discovering it at minute 30.

How to find the core: ask "what would a user do in the first minute?" and "what makes this product different from a generic one?" For a ride-hailing app, the differentiator is matching riders to nearby drivers in real time; that will be your deep dive.

## Step 2: non-functional requirements (how well)

These are the numbers and qualities that drive architecture. Go through them as a checklist:

| Quality | Question to ask | Why it changes the design |
|---|---|---|
| **Scale** | How many daily active users? How many actions each per day? | Decides whether one database is enough or data must be split across many machines |
| **Read/write ratio** | Is it read-heavy (a feed: 100 reads per write) or write-heavy (metrics: almost all writes)? | Read-heavy designs lean on caches and copies; write-heavy ones on logs and partitioning |
| **Latency** | How fast must the main action feel, at p99? | A 100 ms budget rules out several sequential network hops; it pushes you to precompute |
| **Availability** | How bad is downtime? Which features can degrade? | High availability means copies in several places and accepting some stale data |
| **Consistency** | Must every reader see the latest write immediately? | Strong consistency costs latency and availability; most features don't need it |
| **Durability** | Can we ever lose an accepted write? | Payments: never. View counts: a few lost is fine |
| **Data size and retention** | How big is each item, and how long do we keep it? | Decides storage tier (memory, SSD, cheap object storage) and cost |
| **Geography** | One country or global? Data-residency laws? | Global means multiple regions and harder consistency |

The key skill is **per-feature** requirements. Not "the system is strongly consistent", but:

- Posting a photo: must not be lost (durable); can take a second or two to appear in followers' feeds (eventually consistent).
- Like counts: can be approximate and a few seconds behind.
- Following someone: you should see your own follow immediately (read-your-writes), others can see it later.
- Payment for a promoted post: exactly once, strongly consistent.

This per-feature view is what lets you use cheap, fast designs almost everywhere and expensive, careful ones only where they are needed. It is one of the clearest senior signals.

## Why percentiles, not averages

Suppose 99 requests take 10 ms and one takes 5 seconds. The average is about 60 ms, which sounds fine, but one user in a hundred waited five seconds. Worse, one page load often makes dozens of requests, so most *page views* include at least one slow request. That is why targets are stated as **p99** (or p99.9) rather than averages: "feed loads in under 300 ms at p99".

## Availability in minutes

| Availability | Downtime per year | Per 30-day month |
|---|---|---|
| 99% (two nines) | 3.65 days | 7.2 hours |
| 99.9% (three nines) | 8.8 hours | 43 minutes |
| 99.99% (four nines) | 53 minutes | 4.3 minutes |
| 99.999% (five nines) | 5.3 minutes | 26 seconds |

Each extra nine is roughly ten times harder and more expensive. Four nines is hard to reach with any single machine or data centre, because hardware failures and deploys alone exceed it, so it implies redundancy across zones and automated failover. If you ask for five nines, you should be able to say where the redundancy comes from.

## Turning answers into design pressure

Write the requirements in a corner of the board and refer back to them. Each later choice should point at one:

- "Because reads outnumber writes 100 to 1, I'll precompute feeds and cache them."
- "Because the redirect p99 target is 50 ms, the redirect path can make at most one network call to storage, ideally to a cache."
- "Because likes can be approximate, I'll count them in memory and flush every few seconds."

## A worked example: a chat app

- Functional: one-to-one and group messages (up to 500 members), delivery and read receipts, message history on any device. Non-goals: voice and video calls, end-to-end encryption details (mention them as out of scope).
- Scale: 500M daily users, 40 messages each per day: 20 billion messages a day, about 230,000 per second on average, perhaps 3× that at peak.
- Latency: a message reaches an online recipient within 500 ms at p99.
- Ordering: messages in one chat appear in the same order for everyone.
- Durability: an acknowledged message is never lost.
- Availability: sending must keep working during a single data-centre failure; read receipts may lag.

Every line of that list reappears later: 230k writes per second rules out a single database, ordering within a chat suggests partitioning by chat ID, and 500 ms delivery means persistent connections rather than polling.

## Interview angles

- "What are your non-functional requirements?" is often asked directly. Answer per feature, with numbers.
- "Is strong consistency needed here?" The answer is almost always "for this one operation, yes; for these others, no, and here is what users would notice."
- "What if the interviewer refuses to give numbers?" Propose them: "I'll assume 100M daily users, and I'll revisit if that changes."

--- revise
### Two kinds
? Functional vs non-functional requirement? :: Functional = what users can do (send a message). Non-functional = how well (scale, latency, availability, consistency, durability).
? How many core features should you pick? :: 3–5, plus explicit non-goals said out loud.
? Why say non-goals? :: It scopes the problem and lets the interviewer redirect you now, not at minute 30.

### Checklist
? The non-functional checklist? :: Scale, read/write ratio, latency (p99), availability, consistency, durability, data size and retention, geography.
? Why state requirements per feature? :: Most features can be cheap and eventually consistent; only a few (payments, uniqueness) need strong guarantees.
? Why p99 instead of the average? :: Averages hide the slow tail, and one page makes many requests, so most users hit the tail.

### Numbers
? Downtime per month at 99.9%? :: About 43 minutes.
? Downtime per year at 99.99%? :: About 53 minutes.
? What does four nines imply architecturally? :: Redundancy across zones and automatic failover; one machine or zone cannot reach it.

--- notes
## Functional
3–5 core actions; ask "what does a user do in minute one?" and "what makes this product special?".
Say non-goals aloud (stories, DMs, ads, search) so the interviewer can redirect early.
## Non-functional checklist
Scale (DAU × actions) · read/write ratio · p99 latency · availability · consistency · durability · size and retention · geography and residency.
State them per feature: a post must be durable but can appear in feeds late; likes can be approximate; payments exactly once.
## Percentiles
Targets use p99 or p99.9: averages hide the slow tail, and pages fan out to many requests.
## Nines
99.9% ≈ 43 min/month, 8.8 h/year. 99.99% ≈ 4.3 min/month, 53 min/year. 99.999% ≈ 5 min/year.
Each nine is ~10× harder; ≥ four nines means multi-zone redundancy and automated failover.
## Use them
Write requirements on the board and justify each later choice by pointing at one.

--- doubts
Q: How do I know which features are "core"?
A: Ask what the product cannot exist without, and what makes it different from a generic app. For a feed product, posting and reading the feed are core; profile editing is not. If unsure, propose a list and ask: "I'll focus on upload, follow and feed; is that what you want?"

Q: What if the interviewer says "you decide" for every number?
A: Then decide, out loud, with round numbers that are plausible for the product: "a large social app: 500M daily users, 20 feed views each". The interviewer mostly wants to see that you know which numbers matter and that you will use them.

Q: What is the difference between availability and durability?
A: Availability is "can I use it right now?"; durability is "is my data still there?". A system can be down for an hour and lose nothing (available: no, durable: yes). A cache that answers instantly but loses entries on restart is available but not durable. Payments need both; a view counter needs neither strictly.

Q: What does "consistency" mean here? The C in ACID?
A: Usually not. In system design, consistency means "do all readers see the latest write?" (strong consistency) or "might some see an older version for a while?" (eventual consistency). The C in ACID means a transaction keeps the data valid according to its rules (no negative balances). Same word, different idea; say which one you mean.

Q: Should latency targets be the same for every operation?
A: No. User-facing reads on the main path (open the app, load the feed) need tight targets, often 100–300 ms at p99. Writes users wait for (send a message) need moderate ones. Background work (generate thumbnails, update recommendations) can take seconds or minutes, which lets you move it off the request path into a queue.

Q: Is it OK to change requirements later?
A: Yes, if the interviewer changes them, or if your estimate reveals one is unrealistic. Say so explicitly: "with 100 KB messages at this rate we'd store 2 PB a day; can I assume text only, with media stored separately?"

--- exercises
[design] Write the requirements for "Design YouTube" in under two minutes: 4 core features, 3 non-goals, and a per-feature consistency or durability statement for each core feature.
A: Core: upload a video; watch a video (streamed at the right quality for the network); see video details (title, views, likes); search or browse a home feed. Non-goals: live streaming, comments moderation, monetisation and ads. Per feature: an uploaded video must never be lost once confirmed (durable), but may take minutes to become watchable (processing). Watching must be highly available and fast to start (under 2 s to first frame at p99) and can serve slightly stale metadata. View counts can be approximate and minutes behind. Search results can lag new uploads by minutes.

[estimate] Your SLO is 99.95% availability per month. How many minutes of downtime is that, and can you afford a 15-minute maintenance window every week?
A: 0.05% of 30 days = 0.0005 × 43,200 minutes ≈ 21.6 minutes per month. Four 15-minute windows are 60 minutes, almost three times the budget. You need maintenance without downtime: rolling deploys across redundant servers, and schema changes that are backwards compatible.

[choose] For a banking app, list which of these need strong consistency and which can be eventually consistent: account balance shown on the home screen, transferring money, transaction history list, the "you have a new statement" notification.
A: Transferring money: strongly consistent and exactly once (a transaction across both accounts, with an idempotency key so retries do not pay twice). Account balance: should reflect the user's own last transfer (read-your-writes), but it is acceptable to show a balance a second old with a "pending" item. Transaction history: eventually consistent is fine as long as the user's own just-made transfer appears (read-your-writes). Notification: eventually consistent, best effort.

[break] A candidate writes "the system should be strongly consistent and highly available with 10 ms latency globally". Why will the interviewer push back?
A: These conflict. Strong consistency across regions means agreeing with replicas far away; light alone takes about 70–100 ms for a round trip across an ocean, so a globally strongly consistent write cannot take 10 ms. During a network split, strong consistency also means some requests must fail (not available). The fix is to state requirements per operation: local, fast, eventually consistent reads for most things; strongly consistent writes only where needed, accepting their latency.

[estimate] A page load makes 30 backend requests in parallel and waits for all of them. Each request is slower than 200 ms 1% of the time, independently. What share of page loads see at least one slow request?
A: 1 − 0.99³⁰ ≈ 1 − 0.74 = 26%. Over a quarter of page loads are slow even though each request is "fast 99% of the time". This is why tail latency matters, and why fan-out designs need p99.9 targets or techniques like hedged requests.

--- pitfalls
- Designing all features of the product instead of 3–5 core ones
- Giving non-functional requirements for the whole system rather than per feature
- Stating latency as an average rather than a percentile
- Asking for five nines or global strong consistency without saying what it costs
- Confusing availability (usable now) with durability (data not lost)
- Collecting numbers you never use later

--- quiz
Q: Which is a non-functional requirement?
- Users can follow each other
- Users can upload photos
- *The feed loads in under 300 ms at p99
- Users can like a post
W: Non-functional requirements describe how well the system works, not what it lets users do.
Q: 99.99% availability allows roughly how much downtime per month?
- 43 minutes
- *4.3 minutes
- 26 seconds
- 7 hours
W: 0.01% of 43,200 minutes ≈ 4.3 minutes.
Q: Why state consistency needs per feature?
- Interviewers require it
- *Most features can use cheap, eventually consistent designs; only a few need strong guarantees
- Strong consistency is always free
- Databases only support one mode
W: Matching guarantees to features lets you pay the cost of strong consistency only where users would notice.
Q: Durability means…
- The service answers quickly
- The service is up 99.9% of the time
- *Once a write is acknowledged, it is never lost
- All readers see the same data
W: Durability is about data surviving crashes; availability is about being usable now.

--- sources
- book :: Designing Data-Intensive Applications, ch. 1 (Reliable, Scalable and Maintainable Applications) :: Martin Kleppmann :: https://dataintensive.net/
- book :: Site Reliability Engineering, ch. 4 (Service Level Objectives) :: Google :: https://sre.google/sre-book/service-level-objectives/
- article :: The Tail at Scale (CACM 2013) :: Jeffrey Dean, Luiz André Barroso :: https://research.google/pubs/the-tail-at-scale/
- article :: Delivering a system design interview: requirements :: Hello Interview :: https://www.hellointerview.com/learn/system-design/in-a-hurry/delivery

=== sd-api-data
blurb: Before drawing servers, pin down the operations the system offers and the records it stores, because how data is looked up decides the database, the keys and the partitioning.
signals: You have requirements and need to move toward a design | You are unsure which database to pick | Your design has boxes but no clear data flow
prereq: sd-requirements

--- lesson
:::words
- **API**: the list of operations a service offers, with the exact inputs and outputs of each. For example `POST /messages` takes a chat ID and text and returns a message ID.
- **Endpoint**: one operation of an API.
- **Entity**: a kind of record the system stores: a User, a Message, a Chat.
- **Primary key**: the field that uniquely identifies a record, like `user_id`.
- **Access pattern**: a specific way the data is read or written, such as "get the 50 newest messages of one chat". It is the single most important input to choosing storage.
- **Index**: an extra sorted structure that lets a database find records by a field quickly instead of scanning everything.
- **Pagination**: returning a long list in pages.
:::

## The problem in plain words

A diagram of boxes says nothing about what the system actually does. Two minutes spent writing the main operations and the main records makes everything after concrete: you know which data each request needs, how it will be found, and therefore what kind of storage can serve it fast. Many weak designs pick a database first ("we'll use MongoDB") and then discover it cannot answer the question the product asks most often.

:::eli5
A library decides how to shelve books by how people look for them. If readers search by author, books are sorted by author. If they mostly ask for "the newest arrivals", there is a new-arrivals shelf. Deciding the shelves before knowing how people search gives you a beautiful library where nobody finds anything.
:::

## Step 1: the API, briefly

Write one line per core operation: method, path or name, key inputs, output. Keep it to the core features.

For a URL shortener:

```
POST /links           { long_url, custom_alias? }  → { code }
GET  /{code}                                         → 301/302 redirect to long_url
```

For a chat app:

```
POST /chats/{chat_id}/messages   { text, client_msg_id }        → { message_id, sent_at }
GET  /chats/{chat_id}/messages?before={cursor}&limit=50          → { messages[], next_cursor }
WS   /connect   (a long-lived connection for receiving new messages)
```

Notice three habits that interviewers look for:

- **A client-generated ID on writes** (`client_msg_id`). If the phone's request times out and it retries, the server sees the same ID and does not store the message twice. This is an *idempotency key*, and it is how you make retries safe.
- **Cursor pagination** (`before=…`) rather than "page 7". A cursor says "messages older than this one", which stays correct while new messages arrive; page numbers shift as data is added.
- **The right transport for each operation.** Plain request–response for sending; a long-lived connection (WebSocket) for receiving, because the server must push.

## Step 2: the entities

List the main records with their key fields, and **which field identifies each one**:

| Entity | Key | Important fields |
|---|---|---|
| User | user_id | name, created_at |
| Chat | chat_id | type (direct or group), member list |
| Message | (chat_id, message_id) | sender_id, text, sent_at |
| Membership | (user_id, chat_id) | last_read_message_id |

The Message key is a pair on purpose: messages are always read *within one chat*, newest first. If they are stored sorted by (chat_id, message_id) and message IDs increase over time, "the 50 newest messages of chat 42" becomes one contiguous range read from one place, the fastest possible query.

## Step 3: access patterns drive storage

For each core operation, write how it touches the data:

1. Send message: append one row to chat 42's messages. *Very frequent write.*
2. Open a chat: read the newest 50 messages of chat 42. *The most frequent read.*
3. Chat list: for user 7, list their chats sorted by latest activity.
4. Unread count: compare each membership's last-read ID with the chat's newest ID.

Now choose storage by matching patterns to what each kind of store does well:

- Pattern 2 is a **range read on a sorted key** within one partition: a wide-column store (Bigtable, Cassandra) or a relational table with a (chat_id, message_id) index both serve it well.
- Pattern 1 at 200,000+ writes per second needs the data **split across many machines**, and chat_id is a natural split key: all of one chat's messages live together, so pattern 2 stays a single-machine read.
- Pattern 3 is per user, not per chat, so it needs **a second copy of the data organised by user** (a per-user "inbox" table updated on each message). This is denormalisation: storing data twice so each read is cheap, and accepting the work of keeping both copies in step.

This is the core move of the whole interview: **access patterns → keys → storage → partitioning**. Doing it explicitly is a senior signal, because it means your database choice has a reason.

## Relational or not?

You do not have to pick a camp. A practical rule:

- Start from a **relational database** when the data has many relationships, you need transactions across several records (move money between accounts, book a seat), or you need flexible queries you cannot predict.
- Move to a **key-value or wide-column store** when one or two access patterns dominate, they are lookups by key or ranges within a key, and the write rate or data size is beyond what one machine handles.
- Add **special-purpose stores** for special queries: a search index for full-text search, object storage for big files (photos, videos), a cache for hot reads.

Write down why: "messages: wide-column store, partitioned by chat_id, sorted by message_id; reason: 230k writes/s and the dominant read is a range within one chat."

## Common data-model traps

- **Auto-increment IDs across many machines.** A single counter becomes a bottleneck and a single point of failure. Use IDs that can be made independently (time-ordered IDs such as Snowflake, or UUIDs) — the partitioning chapter covers this.
- **Storing big blobs in the database.** Put photos and videos in object storage and keep only the URL and metadata in the database.
- **Counting by scanning.** "Number of likes" computed with a count over millions of rows on every view. Keep a counter and update it as likes arrive.
- **Unbounded lists inside one record.** A user record holding the IDs of all their followers breaks for a celebrity with 100 million followers. Store followers as separate rows.

## Interview angles

- "Why that key?" Answer with the access pattern it serves.
- "How do you get page 2?" Cursors, and why offsets break with inserts and get slower the deeper you go.
- "What if the phone retries a send?" Idempotency key; the server remembers recent IDs per chat and returns the original result for a duplicate.

--- revise
### API habits
? Why put a client-generated ID on write requests? :: It is an idempotency key: a retry carries the same ID, so the server recognises it and does not apply the write twice.
? Why cursor pagination over page numbers? :: A cursor ("older than X") stays correct while new items arrive and stays fast at any depth; offsets shift and get slower.
? Request–response or long-lived connection for receiving chat messages? :: Long-lived (WebSocket): the server must push without being asked.

### Data
? What is an access pattern? :: A concrete read or write, e.g. "newest 50 messages of one chat". It decides keys and storage.
? Why key messages by (chat_id, message_id)? :: The dominant read becomes one contiguous range in one partition.
? What is denormalisation and when do you accept it? :: Storing data twice, organised for different reads; when one copy cannot serve a frequent read cheaply.
? The central chain of reasoning? :: Access patterns → keys → storage → partitioning.

### Traps
? Why not a global auto-increment ID? :: One counter is a bottleneck and a single point of failure; use independently generated IDs.
? Where do photos and videos go? :: Object storage; the database keeps metadata and the URL.

--- notes
## API
One line per core operation: method/name, key inputs, output.
Writes carry a client ID (idempotency key) so retries are safe.
Lists use cursor pagination (before/after an item), not page numbers.
Pick the transport per operation: request–response, long-lived push (WebSocket/SSE), or async (queue).
## Entities
List each entity with its key and key fields.
Choose keys so the most common read is a single lookup or one contiguous range.
## Access patterns → storage
Write each core operation as a read or write pattern; mark the frequent ones.
Relational: many relationships, multi-record transactions, unpredictable queries.
Key-value / wide-column: dominant key lookups or ranges, very high write rate or size.
Special stores: search index (full text), object storage (big files), cache (hot reads).
Denormalise when a frequent read needs data organised another way (per-user inbox vs per-chat log).
## Traps
Global auto-increment IDs; blobs in the database; counting by scanning; unbounded lists inside one record.

--- doubts
Q: Do I need to write the full API with every field?
A: No. One line per core operation with the important inputs and outputs is enough. The point is to make the data flow concrete and to show habits (idempotency keys, pagination, the right transport), not to write documentation.

Q: REST or gRPC for the API?
A: For the public API (apps, browsers), REST over HTTP with JSON is the usual default: universal, easy to cache and debug. Between internal services, gRPC is common because it is compact, typed and supports streaming. In an interview, one sentence is enough; the networking chapter compares them.

Q: Why not just use one database for everything?
A: Often you should, at first. A single relational database handles a surprising amount (tens of thousands of simple queries per second on good hardware). You split storage only when a specific access pattern or number demands it: a write rate too high for one machine, files too big for a database, or a query type (full-text search) it does poorly.

Q: What is the difference between a primary key and an index?
A: The primary key identifies a row uniquely and, in many databases, decides the order rows are stored in. An index is an additional sorted structure on other fields (say email) so you can find rows by them without scanning. Every index speeds some reads and costs space plus extra work on every write.

Q: How do I make "unread count" fast?
A: Do not count unread messages on every view. Store, per (user, chat), the last message ID the user read, and per chat the newest message ID (or a running counter). The unread count is a subtraction or a small range count. Precomputing small summaries instead of counting raw rows is a pattern you will use constantly.

Q: When is it worth storing the same data twice?
A: When a frequent read needs the data organised differently from how it is written, and computing it at read time is too slow. The chat example stores messages per chat (for opening a chat) and a per-user list of chats with latest activity (for the chat list). The cost is that each write updates two places, and the copies can briefly disagree.

--- exercises
[design] Write the API (3–4 lines) and entities with keys for "Design a URL shortener with click counts".
A: API: `POST /links {long_url, alias?} → {code}`; `GET /{code} → 302 to long_url`; `GET /links/{code}/stats → {clicks_total, clicks_by_day}`. Entities: Link (key: code; long_url, owner_id, created_at, expires_at); ClickCount (key: (code, day); count). Access patterns: redirect = lookup by code (the hottest path, cacheable); create = insert if the code is not taken (needs uniqueness); stats = small range read of one code's days. Clicks are not written one row each on the redirect path; they are counted in memory or a stream and flushed as per-day counters.

[break] A design stores each user as one document containing an array of all follower IDs. What breaks, and for whom?
A: Celebrities. A user with 100M followers has a document of hundreds of megabytes; every follow rewrites or locks it, reads load it all, and most databases cap document size (often 16 MB). Store follows as separate rows keyed by (followee_id, follower_id), plus the reverse (follower_id, followee_id) for "who do I follow", and keep follower counts as a separate counter.

[choose] Messages: relational database with an index on (chat_id, sent_at), or a wide-column store keyed by (chat_id, message_id)? Assume 230k writes per second at peak.
A: At 230k writes/s you need data split across many machines either way. A wide-column store partitioned by chat_id and sorted by message_id fits the dominant pattern (append to a chat, read its newest range) and scales writes by adding machines. A sharded relational setup can do it too, but you build the sharding yourself and gain little, since you need no cross-chat transactions. Choose the wide-column store; the cost is weaker ad-hoc querying, which this product does not need.

[estimate] Offset pagination: `LIMIT 50 OFFSET 100000` on a table sorted by time. Roughly how many rows does the database touch, compared with a cursor query `WHERE id < X LIMIT 50`?
A: The offset query walks past 100,000 rows to discard them, then returns 50: about 100,050 rows touched. The cursor query seeks straight to X in the index and reads 50. The offset cost grows with depth; the cursor cost is constant. Offsets also skip or repeat items if rows are inserted between page loads.

[design] A phone sends a message, the request times out, and the app retries. Describe exactly how the server avoids storing it twice.
A: The app generates `client_msg_id` (a UUID) once per message and sends it with every attempt. The server stores messages with a uniqueness constraint on (chat_id, client_msg_id), or keeps a short-lived record of recent client IDs per chat. On a retry, the insert finds the existing row and the server returns the original message_id and timestamp instead of inserting again. Both attempts get the same answer, so the client cannot tell a retry from the first try.

--- pitfalls
- Choosing a database before listing the access patterns
- Keys that do not match the dominant read (forcing scans or cross-partition queries)
- Page-number pagination for feeds and chats that change constantly
- Writes without an idempotency key, so retries create duplicates
- Unbounded lists stored inside a single record
- Storing large files inside the database

--- quiz
Q: The most important input when choosing a database for a feature is…
- The team's favourite technology
- *The access patterns: how the data is read and written, and how often
- Whether it is SQL or NoSQL
- The size of each record alone
W: Keys, storage engine and partitioning all follow from the dominant reads and writes.
Q: Why does a chat app key messages by (chat_id, message_id)?
- It makes message IDs unique globally
- *The newest messages of a chat become one contiguous range in one place
- It allows full-text search
- It reduces storage size
W: Matching the key to the dominant read turns it into a single fast range scan.
Q: A client-generated ID on a "send" request is there to…
- Encrypt the message
- Sort messages
- *Let the server detect retries and not store duplicates
- Pick the server
W: It is an idempotency key: same ID, same result.
Q: Why prefer cursor pagination for a feed?
- It is easier to implement
- *It stays correct when new items arrive and costs the same at any depth
- It returns more items per page
- Browsers require it
W: Offsets shift with inserts and get slower the deeper you go.

--- sources
- book :: Designing Data-Intensive Applications, ch. 2 (Data Models and Query Languages) :: Martin Kleppmann :: https://dataintensive.net/
- article :: API Design Guide (Google Cloud) :: Google :: https://cloud.google.com/apis/design
- article :: AIP-158: Pagination :: Google API Improvement Proposals :: https://google.aip.dev/158
- article :: AIP-155: Request identification (idempotency) :: Google API Improvement Proposals :: https://google.aip.dev/155

=== sd-deep-dives
blurb: The part of the interview that decides your level: finding the genuinely hard parts yourself, going two levels down, and explaining how the system behaves at peak load and when each piece fails.
signals: You have an end-to-end design and 20 minutes left | The interviewer asks "what happens if this fails?" | You want to show senior-level depth
prereq: sd-api-data

--- lesson
:::words
- **Bottleneck**: the part that limits how much the whole system can do, like the narrowest point of a funnel.
- **Single point of failure**: a component whose failure stops the whole system.
- **Degrade gracefully**: keep the most important features working, with reduced quality, when something fails.
- **Blast radius**: how much of the system (and how many users) a single failure affects.
- **Hot spot**: one machine or key receiving far more traffic than the others.
- **Fan-out**: one action causing many follow-on actions, like one post being delivered to millions of feeds.
:::

## The problem in plain words

By minute 25 you have a design that works on paper. Now the interviewer wants to know whether it works in reality: with real traffic, real failures and real numbers. A deep dive takes one component and asks the uncomfortable questions: what exactly is stored, how fast is it, what happens when it is overloaded, and what happens when it dies. Seniors are expected to **pick** these components themselves, because spotting where the difficulty lies is itself the skill.

:::eli5
A new car design looks fine in the drawing. Then the test team drives it at top speed, in snow, with a flat tyre, fully loaded, and crashes it into a wall. The deep dive is the test drive. You want to be the engineer who says "let's test the brakes on ice" before anyone asks.
:::

## Step 1: find the hard parts

Hard parts come from a small number of sources. Run through this list against your design:

| Source of difficulty | Question | Typical examples |
|---|---|---|
| **Scale of one dimension** | Which number is extreme? | 1M writes/s (metrics), 100M followers (celebrity fan-out), 10 PB storage (video) |
| **Contention** | Where do many requests fight over the same thing? | The last seats of a concert, a viral post's like counter, one hot key |
| **Correctness** | Where would a mistake cost money or trust? | Double charging, two users getting the same short code, lost messages |
| **Latency** | Which path has a tight budget? | Typeahead under 100 ms, redirect under 50 ms, ride matching in seconds |
| **Real-time or ordering** | What must arrive fast, or in order? | Chat delivery, live location, collaborative editing |
| **Failure** | What has no backup? | One database primary, one region, one coordinator |

Then say it: "The two hardest parts here are delivering posts from celebrities to 100M feeds, and keeping like counts fast for viral posts. I'd like to go deep on fan-out first." Proposing, with a reason, is the L5 move.

## Step 2: go two levels down

Take "we cache the feed" through the levels:

- **Level 0**: "There's a cache."
- **Level 1**: what is cached (the first 500 post IDs of each user's feed), under which key (`feed:{user_id}`), how big it is (500 × 8 bytes × 200M active users ≈ 800 GB, so a cluster of cache servers), how long entries live, and how it is filled (on each new post, or on read).
- **Level 2**: what goes wrong. A celebrity posts and 100M feeds must be updated: too slow to write synchronously, so precompute feeds for normal users and **merge** celebrity posts in at read time. A cache server dies: its users' feeds are rebuilt from the database, so cap that rebuild rate or the database drowns. A popular key expires: thousands of simultaneous misses (a stampede), so let only one request rebuild it.

You do not need every level for every box. You need it for the two or three boxes that matter, and you need to get there without being dragged.

## Step 3: peak load, not average load

Designs are usually sized from average numbers. Real traffic has peaks: evenings, New Year's Eve, a goal in a World Cup final, a celebrity post. For each deep-dive component, ask:

- **What is the peak multiple?** 2–3× daily average is typical; event spikes can be 10× or more for minutes.
- **What absorbs the burst?** A queue in front of slow work, extra capacity provisioned ahead of known events, or autoscaling (which takes minutes, so it cannot absorb a spike that lasts seconds).
- **What do you shed?** If everything cannot be served, which requests get rejected first? Serve "read my feed", delay "update recommendations".

## Step 4: failure, one component at a time

The senior habit is a short **failure walk**: point at each box and say what happens when it fails, how you detect it, and how users experience it.

| Component fails | What users see | Mitigation |
|---|---|---|
| One app server | Nothing (the load balancer stops sending to it within seconds) | Stateless servers, health checks, spare capacity |
| Cache cluster node | Slower requests for some users; heavy load on the database | Several cache replicas, limit the rebuild rate, keep the database sized for some cache loss |
| Database primary | Writes fail for seconds to a minute; reads continue from replicas | Automated failover to a replica; writes retried with idempotency keys |
| Message queue | New work piles up at producers | A replicated queue; producers buffer briefly; consumers catch up later |
| A whole data centre or zone | Traffic moves to others; possibly a few seconds of lost writes if replication was asynchronous | Multi-zone deployment; decide and state how much data loss is acceptable |
| A slow dependency (not dead, slow) | Requests pile up, threads run out, everything gets slow | Timeouts, circuit breakers, separate resource pools: "slow is worse than dead" |

That last row is the one candidates miss. A dependency that hangs ties up your threads and connections and can take down services that do not even need it. Timeouts on every call are not optional.

## Step 5: say what you would measure

End each deep dive with how you would know it is working: "I'd alert on p99 feed latency, cache hit rate dropping below 90%, and queue lag above 30 seconds." Monitoring is part of the design, not an afterthought, and it shows you think about running the system, not only drawing it.

## A worked deep dive: unique short codes

Problem: generate a 7-character code for each new link, unique forever, at 1,000 creations per second, from many servers.

- Option A, **hash the long URL** and take 7 characters: the same URL always gives the same code (nice), but different URLs can collide, so you must check the database and retry on collision; collisions become more frequent as the table fills.
- Option B, **a global counter** turned into base-62 characters: no collisions, but the counter is a bottleneck and a single point of failure, and codes are guessable in sequence.
- Option C, **counter ranges**: a coordination service hands each server a block of 10,000 numbers; servers generate codes locally from their block. No collisions, no per-request coordination; if a server dies, its unused numbers are lost (fine: 62⁷ is 3.5 trillion codes).

Decision: C, because it removes coordination from the hot path; add a shuffle (a reversible scramble of the number) if codes must not be guessable. Failure: if the coordination service is down, servers keep using their current block, so creation keeps working for a while. That is a complete deep dive: options, decision, cost, failure.

## Interview angles

- "What is your bottleneck?" Name it from your numbers.
- "What happens if X fails?" Use the failure walk: detection, user impact, mitigation, data loss.
- "How would this change at 10× scale?" Identify which component breaks first and what replaces it.

--- revise
### Finding the hard parts
? Six sources of difficulty to scan for? :: Extreme scale in one dimension, contention, correctness, tight latency, real-time/ordering, single points of failure.
? How does an L5 start the deep dives? :: Names the 2–3 hardest parts with a reason and proposes an order.

### Depth
? Level 1 vs level 2 for a cache? :: Level 1: what, key, size, expiry, fill policy. Level 2: failures: fan-out, node loss, stampede on expiry.
? Celebrity fan-out fix? :: Precompute feeds for normal authors; merge celebrity posts at read time.

### Load and failure
? Why can't autoscaling absorb a 30-second spike? :: New capacity takes minutes to start; bursts need queues, headroom or shedding.
? The failure walk, per box? :: What users see, how it is detected, how it is mitigated, how much data can be lost.
? Why is "slow" worse than "dead"? :: A slow dependency holds threads and connections until everything backs up; a dead one fails fast and gets routed around.
? Three defences against a slow dependency? :: Timeouts, circuit breakers, separate resource pools (bulkheads).
? Short-code generation without a hot-path bottleneck? :: Counter ranges: each server gets a block of IDs and encodes them in base 62.

--- notes
## Hard parts
Extreme scale · contention · correctness · tight latency · real-time/ordering · single points of failure.
Propose them yourself, with a reason, in order.
## Two levels down
L0 "a cache" → L1 what/key/size/expiry/fill → L2 fan-out, node loss, stampede.
## Peak load
Peaks are 2–3× average daily, 10×+ for events. Bursts are absorbed by queues and headroom; autoscaling takes minutes.
Decide what to shed first.
## Failure walk
Per component: user impact, detection, mitigation, data loss.
Stateless servers + health checks; replicated caches + capped rebuild; database failover + idempotent retries; replicated queues; multi-zone.
Slow is worse than dead: timeouts on every call, circuit breakers, bulkheads.
## Close each dive
Name the metrics and alerts that tell you it works (p99, hit rate, queue lag).
## Short codes
Hash + collision check · global counter (bottleneck) · counter ranges per server (chosen); base 62; 62⁷ ≈ 3.5 trillion.

--- doubts
Q: How many deep dives should I do?
A: Two or three in about 15 minutes. One is usually not enough to show breadth of depth; five means none of them went deep. If the interviewer picks one, do that first, then propose the next.

Q: What if I pick a deep dive the interviewer doesn't care about?
A: Propose, then check: "I think fan-out is the hardest part; is that where you'd like me to go, or somewhere else?" Interviewers often have a specific deep dive in mind; asking costs five seconds and avoids spending ten minutes on the wrong thing.

Q: How detailed should failure handling be?
A: For the components in your deep dive, detailed: detection time, what users see, how recovery works, and how much data might be lost. For the rest, one line each in the wrap-up is enough. Always state data loss explicitly for asynchronous replication: "a primary crash can lose the last second of writes."

Q: Is it OK to say "I'd use a managed service for that"?
A: Yes, as a practical choice, but expect "how does it work inside?" Saying "Cloud Pub/Sub, which is a replicated log; consumers acknowledge messages and unacknowledged ones are redelivered" shows you know what you are buying. Using a product name to skip the reasoning does not work.

Q: How do I talk about cost?
A: Briefly, with orders of magnitude, where it changes a decision: "keeping 10 PB of video on SSD would be very expensive; older videos move to cheaper storage tiers, popular ones are served from the CDN." Cost becomes more important at L6, but one sentence at L5 shows maturity.

Q: The interviewer keeps asking "why?" Am I doing badly?
A: Usually the opposite. Repeated "why?" means they are probing your depth and you are giving them something to probe. Answer with mechanism and numbers, and it is fine to end with "beyond that I'd need to measure".

--- exercises
[design] Deep dive: a "like" button on posts, where a viral post can receive 100,000 likes per second. Give level 1 and level 2.
A: Level 1: store likes as rows (post_id, user_id) to prevent double-liking and allow "who liked"; keep a separate like counter per post for display. Level 2: one counter row receiving 100k increments per second is a hot spot (every write locks or contends on the same key). Fix: split the counter into, say, 100 sub-counters (post_id, shard) and pick a shard at random per like; reads sum the shards (cached for a second or two). Or aggregate in memory per app server and flush every second. The display count can be a few seconds behind; uniqueness (one like per user) is enforced on the (post_id, user_id) rows asynchronously.

[break] Your service calls a recommendations service with no timeout. Recommendations becomes slow (5 s per call) but does not fail. Walk through what happens to your service.
A: Each request now holds a thread or connection for 5 seconds instead of 50 ms, so the number of in-flight requests grows by about 100× at the same traffic (Little's law). The thread pool or connection pool fills up; new requests queue and then time out at the load balancer, including requests that never needed recommendations. Your service appears down. Fix: a short timeout (say 200 ms) with a fallback (show the page without recommendations), a circuit breaker to stop calling it while it is unhealthy, and a separate pool for that dependency so it cannot starve the rest.

[estimate] Your feed cache holds 200M users × 500 post IDs × 8 bytes. How much memory is that, and roughly how many cache servers with 64 GB usable each, keeping 2 copies?
A: 200M × 500 × 8 B = 800 GB. Two copies = 1.6 TB. At 64 GB per server: 1.6 TB / 64 GB = 25 servers, plus headroom (say 30–35) for overhead and growth. Mention that real caches have per-entry overhead (keys, pointers), often 1.5–2× the raw size.

[choose] Short codes: hash of the long URL, or counter ranges? The product requires that the same long URL created twice by different users gets different codes (so each user's stats are separate).
A: Counter ranges. Hashing makes identical URLs produce identical codes, which the requirement forbids (you would have to add the user ID to the hash and still handle collisions). Counter ranges produce a fresh unique code for every creation with no collision checks and no coordination on the hot path.

[design] Do a 90-second failure walk for: client → load balancer → stateless API servers → Redis cache → one PostgreSQL primary with two replicas.
A: Load balancer: run two in an active–standby or anycast pair; a failure moves traffic in seconds. API server: health checks remove it within seconds; others absorb the load. Redis: replicated, with failover; on a full cache loss the database sees every read, so cap the rate of rebuilds and keep the database sized for partial cache loss. PostgreSQL primary: automated failover promotes a replica in tens of seconds; writes fail meanwhile and are retried with idempotency keys; with asynchronous replication, the last few hundred milliseconds of writes can be lost. State that, or use synchronous replication to one replica if that loss is unacceptable. Replicas: reads move to the other replica or the primary. Everything: metrics on p99, error rate, replication lag.

--- pitfalls
- Waiting for the interviewer to choose every deep dive
- Staying at level 1 (what) without reaching level 2 (what goes wrong)
- Sizing everything for average load and ignoring peaks
- Treating failure as "it's replicated" without saying what users see and what data can be lost
- Forgetting that slow dependencies are more dangerous than dead ones
- Ending a deep dive without saying how you would monitor it

--- quiz
Q: Which is the most senior way to start the deep-dive phase?
- "What would you like me to look at?"
- *"The hardest parts are celebrity fan-out and hot like counters; I'll start with fan-out unless you'd prefer otherwise."
- Start drawing more boxes
- List every technology in the design
W: Naming the hard parts with a reason, and checking in, is the L5 behaviour.
Q: A dependency that becomes very slow (not down) is dangerous because…
- It returns wrong data
- *Requests hold threads and connections while waiting, so the caller runs out and fails too
- It triggers failover
- It uses more disk
W: Without timeouts, slowness spreads upstream; a dead service at least fails fast.
Q: A 30-second traffic spike is best absorbed by…
- Autoscaling alone
- *Queues, provisioned headroom and load shedding
- Adding an index
- Bigger log files
W: Autoscaling takes minutes; bursts need buffers or spare capacity.
Q: Counter ranges for short codes avoid…
- All storage
- *A coordination step on every request
- The need for base-62 encoding
- Any chance of losing unused codes
W: Each server encodes numbers from its own block; coordination happens only once per block.

--- sources
- article :: The Tail at Scale (CACM 2013) :: Jeffrey Dean, Luiz André Barroso :: https://research.google/pubs/the-tail-at-scale/
- book :: Site Reliability Engineering, ch. 22 (Addressing Cascading Failures) :: Google :: https://sre.google/sre-book/addressing-cascading-failures/
- book :: Release It!, 2nd ed., ch. 4–5 (Stability antipatterns and patterns) :: Michael T. Nygard :: https://pragprog.com/titles/mnee2/release-it-second-edition/
- article :: System design: deep dives and common patterns :: Hello Interview :: https://www.hellointerview.com/learn/system-design/in-a-hurry/introduction

=== latency-numbers
blurb: The handful of speed and size numbers that let you judge a design in your head: how long memory, disks and networks take, how much a machine can do, and how the times feel when scaled to human life.
signals: Deciding whether a cache or a precomputed answer is needed | Checking whether a latency target is even physically possible | Comparing memory, SSD, disk and network for a hot path
widgets: latency-ladder

--- lesson
:::words
- **Nanosecond (ns)**: a billionth of a second. **Microsecond (µs)**: a millionth. **Millisecond (ms)**: a thousandth.
- **RAM**: a computer's working memory: very fast, lost when the power goes off.
- **SSD**: solid-state drive, storage on flash chips. Much faster than a spinning disk, slower than RAM.
- **HDD**: a hard disk drive with spinning platters and a moving arm. Cheap and big, slow to jump around.
- **Sequential vs random access**: reading data in order from one place, versus jumping to many scattered places. Sequential is far faster on every device.
- **Round trip**: a message going to another machine and the reply coming back.
- **Throughput**: how much work per second, as opposed to how long each piece takes.
:::

## The problem in plain words

Every design question eventually becomes "is this fast enough?". Without rough numbers you cannot answer: is it fine to read from disk on every request? Can a page call five services one after another and still load in 200 ms? Can a user in India write to a database in Iowa and get a reply in 50 ms? You do not need exact figures; you need the **order of magnitude**, because the gaps between memory, disk and network are not 2× but 1,000× and 1,000,000×.

:::eli5
If reading from your desk drawer (memory) takes one second, fetching from the cupboard down the hall (SSD) takes about a day, and posting a letter overseas and waiting for the reply (a network round trip across an ocean) takes several years. You would plan your work very differently once you knew that.
:::

## The ladder, scaled to human time

The visual below takes real latencies and stretches them so that one CPU cycle lasts one second. Step through it: the jumps between rungs are the whole lesson.

[[widget:latency-ladder]]

## The numbers worth memorising

Round, order-of-magnitude values (real hardware varies by 2–3×; the ratios are what matter):

| Operation | Time | Remember it as |
|---|---|---|
| Read from the CPU's L1 cache | ~1 ns | "free" |
| Read from main memory (RAM) | ~100 ns | 100× L1 |
| Read 1 MB sequentially from memory | ~5–10 µs | |
| Random read from an SSD (4 KB) | ~20–150 µs | ~1,000× RAM |
| Read 1 MB sequentially from an SSD | ~0.2–1 ms | |
| Round trip inside one data centre | ~0.5 ms | |
| Disk (HDD) seek | ~5–10 ms | ~100× an SSD read |
| Read 1 MB sequentially from an HDD | ~5 ms | |
| Round trip between nearby cities | ~5–20 ms | |
| Round trip across a continent | ~40–80 ms | |
| Round trip across an ocean | ~70–150 ms | |

Three facts follow, and you will use them constantly:

1. **Memory is about 1,000× faster than SSD, which is about 100× faster than a disk seek.** That is why hot data lives in caches in memory, why databases keep their indexes in memory, and why spinning disks are used only for big, sequential, cold data.
2. **Inside a data centre, a network round trip (~0.5 ms) is cheaper than a random disk seek (~5 ms).** Reading from another machine's memory beats reading from your own disk. This single fact is why distributed in-memory caches exist.
3. **Across the world, the speed of light dominates.** Light in fibre travels about 200,000 km per second, so a 10,000 km path takes 50 ms one way, 100 ms there and back, before any processing. No software can beat that. If a user on another continent must wait for a write to be confirmed in your home region, that write takes at least one long round trip.

## Throughput numbers

How much one piece of hardware can do per second, again roughly:

| Resource | Rough throughput |
|---|---|
| One modern server handling simple web requests | ~10,000–100,000 requests/s (depends heavily on the work per request) |
| One in-memory cache server (Redis, Memcached) | ~100,000+ simple operations/s per instance; Memcached more with many threads |
| One relational database primary (simple indexed queries) | ~10,000–50,000 queries/s on good hardware; writes fewer than reads |
| One network link | 1 Gbit/s ≈ 125 MB/s; 10 Gbit/s ≈ 1.25 GB/s; 100 Gbit/s is common between servers in big data centres |
| SSD (NVMe) sequential | ~2–7 GB/s |
| HDD sequential | ~100–250 MB/s |

Use these to decide **how many machines** you need and **where the bottleneck is**. If one database handles about 20,000 writes per second and you need 200,000, you need to split the data across at least 10 machines (more with headroom).

## Handy conversions

- A day has 86,400 seconds; round it to **100,000** (10⁵). So 1 million events a day is about **12 per second**, 1 billion a day about **12,000 per second**.
- A month is about 2.6 million seconds; a year about 31.5 million (≈ π × 10⁷).
- Powers of two: 2¹⁰ ≈ 1 thousand (KB), 2²⁰ ≈ 1 million (MB), 2³⁰ ≈ 1 billion (GB), 2⁴⁰ ≈ 1 trillion (TB).
- Characters: an English character is 1 byte in UTF-8; a typical tweet-sized text is ~100–300 bytes; a compressed photo ~200 KB–2 MB; one minute of 1080p video ~50–100 MB.

## How to use the numbers in an interview

- **Count the hops on the critical path.** Five sequential calls inside one data centre at ~1 ms each (network plus work) is fine; five sequential calls to another continent is half a second.
- **Do the work before the user asks.** If a request would need 50 random disk reads (500 ms on HDD), precompute the answer or keep the data in memory.
- **Batch and go sequential.** Writing 1,000 small records one by one to disk is slow; appending them to a log in one sequential write is fast. Log-structured storage, Kafka and write-ahead logs all exploit this.
- **Check targets against physics.** "Strongly consistent writes across three continents in 20 ms" is impossible; say so and propose what is possible.

:::dyk
These lists descend from "Numbers Everyone Should Know", a slide Google's Jeff Dean showed in talks around 2009. The exact numbers have moved (memory bandwidth and SSDs improved enormously; the speed of light did not), but the order of the rungs has stayed the same.
:::

## Interview angles

- "Can this request meet 100 ms p99?" Add up the hops and storage reads on its path.
- "Why do you need a cache here?" Because a database read is ~1–10 ms and the hot path makes several; memory makes them ~0.1 ms, and the database could not take the load anyway.
- "Why not store this on disk?" Sequential disk is fine for logs and big files; random disk reads on a hot path are not.

--- revise
### Orders of magnitude
? RAM read vs SSD random read vs HDD seek? :: ~100 ns, ~100 µs, ~10 ms: each step roughly 1,000× then 100×.
? Round trip inside a data centre? :: ~0.5 ms.
? Round trip across an ocean? :: ~70–150 ms, set by the speed of light in fibre.
? Why can another machine's memory beat your own disk? :: A data-centre round trip (~0.5 ms) is faster than a disk seek (~5–10 ms).
? Speed of light in fibre? :: About 200,000 km/s: 1 ms per 200 km one way.

### Throughput
? One simple web server? :: ~10k–100k requests/s, depending on work per request.
? One cache server? :: ~100k+ simple operations/s.
? 1 Gbit/s in bytes? :: ~125 MB/s.

### Conversions
? 1 million events a day per second? :: About 12/s (a day ≈ 10⁵ s).
? 1 billion a day per second? :: About 12,000/s.
? Seconds in a year? :: ~3 × 10⁷ (≈ π × 10⁷).

--- notes
## Ladder
L1 ~1 ns · RAM ~100 ns · SSD random ~100 µs · data-centre round trip ~0.5 ms · HDD seek ~10 ms · cross-continent ~50 ms · cross-ocean ~100+ ms.
Memory ≈ 1,000× SSD ≈ 100,000× HDD seek for random access.
Sequential access is far faster than random on every device.
Light in fibre ≈ 200,000 km/s: ~5 µs per km one way.
## Throughput
Web server 10k–100k req/s · cache 100k+ ops/s · DB primary 10k–50k simple queries/s.
1 Gbit/s ≈ 125 MB/s · NVMe 2–7 GB/s · HDD 100–250 MB/s sequential.
## Conversions
Day ≈ 10⁵ s; 1M/day ≈ 12/s; 1B/day ≈ 12k/s. Year ≈ 3 × 10⁷ s.
2¹⁰ ≈ 10³ (K), 2²⁰ ≈ 10⁶ (M), 2³⁰ ≈ 10⁹ (G), 2⁴⁰ ≈ 10¹² (T).
Text ~100s of bytes · photo ~0.2–2 MB · 1 min 1080p video ~50–100 MB.
## Use
Count sequential hops on the critical path; precompute what would need many random reads; batch writes sequentially; check targets against the speed of light.

--- doubts
Q: Do I need to memorise exact numbers?
A: No. Interviewers care that you know the orders of magnitude and the gaps between rungs: memory in nanoseconds, SSD in tens to hundreds of microseconds, a data-centre hop in about half a millisecond, a disk seek in milliseconds, a continent in tens of milliseconds. Being within 2–3× is fine.

Q: Why is sequential access so much faster than random?
A: On a spinning disk, a random read means physically moving an arm and waiting for the platter to rotate (milliseconds); sequential reads stream data as the platter turns. SSDs have no moving parts but still read and write in large pages and blocks, and memory and CPUs prefetch data that sits next to what you just read. Every layer rewards locality.

Q: If networks inside a data centre are so fast, why not call other services freely?
A: Each call is cheap on its own (~0.5–1 ms), but calls add up when made one after another, each has its own tail latency, and each is a new way to fail. A request that makes 20 sequential calls is slow and fragile. Make calls in parallel where possible, and keep the critical path short.

Q: Is "one server handles 10k–100k requests per second" reliable?
A: It is a planning range, not a promise. A server returning a cached 1 KB response can do far more; one that runs a heavy database query per request may do hundreds. In an interview, state your assumption ("say 5,000 requests/s per server for this workload") and derive the server count from it.

Q: Why does the speed of light matter if my servers are fast?
A: Because it sets a floor no hardware can lower. A user in Sydney talking to a server in Virginia pays roughly 200 ms per round trip just in travel time. A TCP plus TLS connection setup takes one or two round trips before the first byte of data; that is why CDNs and regional servers exist, and why global strong consistency is expensive.

--- exercises
[estimate] A request reads 20 records by key from a database on HDDs (each a random seek) one after another. Roughly how long, and how long if the data were in memory on a cache server in the same data centre (one round trip per read)?
A: HDD: 20 × ~10 ms = ~200 ms. Cache over the network: 20 × ~0.5 ms = ~10 ms, and far less if the 20 keys are fetched in one batched request (~1 ms). The fix is both: move the hot data to memory, and batch the reads.

[estimate] A user in Mumbai writes to a database whose primary is in Iowa (about 13,000 km away by fibre). What is the minimum time for a confirmed write, ignoring processing?
A: One way: 13,000 km ÷ 200,000 km/s ≈ 65 ms. Round trip ≈ 130 ms. If a new TLS connection must be set up first, add one or two more round trips (≈ 260–390 ms). Hence regional write endpoints, or accepting the write locally and replicating asynchronously.

[choose] You need to store 50 TB of logs written continuously and read rarely, in large scans. SSD or HDD, and why?
A: HDD (or cheap object storage). The access is sequential (append, then big scans), where HDDs reach 100–250 MB/s per drive at a fraction of the cost per terabyte of SSDs. SSDs earn their price on random reads, which this workload does not do.

[estimate] Your service handles 120,000 requests per second at peak, and you measure 8,000 requests per second per server at 60% CPU. How many servers, with room to lose one zone out of three?
A: At 60% CPU each server does 8,000 req/s, so you need 120,000 / 8,000 = 15 servers' worth of capacity. To survive losing one of three zones, the remaining two must carry everything: 15 servers across 2 zones, so 7.5 per zone, rounded to 8 per zone, 24 in total. Add a little headroom for deploys.

[break] A design promises a 30 ms p99 for a write that must be confirmed by replicas in Europe, the US and Asia. What is wrong?
A: Confirmation from replicas on three continents needs at least one long-distance round trip, which is roughly 70–150 ms or more by the speed of light alone. A 30 ms p99 is physically impossible. Options: confirm in one region (fast, with asynchronous replication to the others and a small risk of loss), or confirm by a majority of nearby replicas, or accept a higher latency for the operations that truly need global agreement.

--- pitfalls
- Treating memory, SSD and network as roughly similar speeds
- Forgetting that sequential calls add their latencies together
- Promising cross-continent latencies below the speed-of-light floor
- Quoting per-server throughput as a fact instead of an assumption tied to the workload
- Forgetting connection setup round trips (TCP, TLS) on cold connections

--- quiz
Q: Roughly how much faster is a RAM read than a random SSD read?
- 2×
- 10×
- *About 1,000×
- 1,000,000×
W: ~100 ns versus ~100 µs.
Q: Inside one data centre, which is usually faster?
- *Reading from another machine's memory over the network
- A random read from your own spinning disk
- They are the same
- It depends only on the CPU
W: ~0.5 ms for the round trip versus ~5–10 ms for a disk seek.
Q: 1 billion events per day is about how many per second?
- 1,200
- *12,000
- 120,000
- 1.2 million
W: A day is about 10⁵ seconds: 10⁹ / 10⁵ = 10⁴, more precisely ~11,600.
Q: What sets the minimum latency of a round trip between continents?
- CPU speed
- Disk speed
- *The speed of light in fibre
- The number of servers
W: About 200,000 km/s in fibre; no software can beat it.

--- sources
- article :: Numbers Everyone Should Know (LADIS 2009 keynote, "Designs, Lessons and Advice from Building Large Distributed Systems") :: Jeff Dean :: https://www.cs.cornell.edu/projects/ladis2009/talks/dean-keynote-ladis2009.pdf
- tool :: Latency numbers every programmer should know (interactive, by year) :: Colin Scott :: https://colin-scott.github.io/personal_website/research/interactive_latency.html
- book :: Systems Performance, 2nd ed., ch. 2 (Methodologies: latency scale) :: Brendan Gregg :: https://www.brendangregg.com/systems-performance-2nd-edition-book.html
- book :: The Datacenter as a Computer, 3rd ed. :: Barroso, Clidaras, Hölzle :: https://research.google/pubs/the-datacenter-as-a-computer-designing-warehouse-scale-machines-third-edition/

=== capacity-math
blurb: Back-of-the-envelope estimation done properly: from users to requests per second, storage per year and bandwidth, with round numbers, stated assumptions, and only the figures that change a design decision.
signals: Requirements are agreed and you need scale numbers | You must decide whether one database or one server is enough | The interviewer asks "how much storage?"
widgets: estimator
prereq: latency-numbers

--- lesson
:::words
- **DAU**: daily active users, the number of distinct people who use the product on a given day.
- **QPS**: queries (requests) per second, the standard unit of load. Also written RPS.
- **Peak**: the busiest moment, usually 2–3× the daily average.
- **Read/write ratio**: how many reads happen for each write. A feed might be 100:1.
- **Replication factor**: how many copies of each piece of data are kept (often 3).
- **Order of magnitude**: a factor of ten. 3,000 and 8,000 are the same order of magnitude; 3,000 and 300,000 are not.
:::

## The problem in plain words

Estimation answers one question: **how big is this, really?** Big enough that one machine is fine, or big enough that the data must be split over hundreds? The answer changes the whole design, so you work it out early. But it is not a maths test. You use round numbers, say every assumption out loud, and stop as soon as the number has told you what you need to know.

:::eli5
Planning a party, you do not count crumbs. You think: about 50 guests, each eats 3 slices, so 150 slices, so about 20 pizzas. That's enough to decide whether to order from one shop or three. Estimation in system design is exactly that, just with users and bytes.
:::

## The recipe

Go from people to load to bytes, writing each step on the board:

1. **Users**: daily active users (DAU).
2. **Actions per user per day**, separately for reads and writes.
3. **Average QPS** = DAU × actions per day ÷ 100,000 (a day is ≈ 86,400 s; round up to 10⁵ for easy maths).
4. **Peak QPS** = average × a peak factor (2–3× normally; more for events).
5. **Storage per day** = writes per day × size per write.
6. **Total storage** = per day × days retained × replication factor (plus indexes and overhead).
7. **Bandwidth** = QPS × size per response (for reads) or per request (for writes).

Then ask of each number: **does it change a decision?** If not, drop it.

## A full worked example: a photo-sharing app

Assumptions (said aloud): 500M DAU; each user views 50 photos and uploads 0.1 photos a day (1 in 10 users posts one photo); average photo after compression 500 KB, plus 3 thumbnails totalling 100 KB; keep photos forever; 3 copies.

| Quantity | Working | Result |
|---|---|---|
| Uploads/day | 500M × 0.1 | 50M |
| Upload QPS (avg) | 50M ÷ 10⁵ | ≈ 500/s |
| Upload QPS (peak, 3×) | | ≈ 1,500/s |
| Views/day | 500M × 50 | 25B |
| View QPS (avg) | 25B ÷ 10⁵ | ≈ 250,000/s |
| View QPS (peak) | | ≈ 750,000/s |
| New storage/day | 50M × 600 KB | 30 TB/day |
| Storage/year (×3 copies) | 30 TB × 365 × 3 | ≈ 33 PB/year |
| Read bandwidth (avg, thumbnails ~30 KB per view) | 250,000 × 30 KB | ≈ 7.5 GB/s ≈ 60 Gbit/s |

What each number tells you:

- **500 uploads/s** is modest: the upload path does not need exotic scaling, but uploads are big, so they should go straight to object storage (clients upload with a signed URL) rather than through your app servers.
- **750,000 views/s at peak** is huge and read-only: photos must be served from a CDN and caches; your servers should handle only metadata.
- **33 PB/year** rules out keeping everything on fast disks. Use object storage with cheaper tiers for old, rarely viewed photos. Erasure coding instead of 3 full copies would cut the raw size by roughly half.
- **60 Gbit/s** confirms the CDN decision: you do not want that leaving your own data centres.

Four numbers, four design decisions. That is a good estimate.

## Rules that keep it fast

- **Round aggressively.** 86,400 → 100,000. 365 → 400 if it helps. 500 KB → 0.5 MB. You are looking for powers of ten.
- **Use scientific notation.** 25 × 10⁹ ÷ 10⁵ = 2.5 × 10⁵. Fewer zeros to lose.
- **Separate reads from writes.** They differ by orders of magnitude and drive different parts of the design.
- **Estimate the hot set, not just the total.** Often a small share of the data receives most reads (the last day of photos, the top 1% of videos). The hot set decides cache size; the total decides storage.
- **Say the assumption, then the number.** "Assume 20% of daily users are online at peak; that's 100M concurrent connections." If the interviewer disagrees with the assumption, you change one input, not the reasoning.
- **Sanity-check against reality.** If your estimate says a chat app sends more messages per day than there are people on Earth times 1,000, an input is wrong.

## Estimates that come up again and again

- **Concurrent connections** = DAU × share online at peak. For a chat app with 500M DAU and 20% online: 100M open connections. At ~100k–1M connections per server (connections are mostly idle), that is 100–1,000 servers just to hold connections.
- **Cache size** = hot items × size per item. "The last 24 hours of feed entries for active users" is a typical hot set.
- **Number of servers** = peak QPS ÷ QPS per server (state the per-server figure), plus headroom for a zone failure.
- **Number of database partitions** = peak write QPS ÷ writes one partition handles (or total size ÷ size one machine holds), whichever is larger.

## When to stop

Stop estimating when the numbers have classified the problem: read-heavy or write-heavy, fits on one machine or not, CDN needed or not, storage tiering needed or not. Five minutes is plenty. If a later deep dive needs a more precise figure (cache size, connection count), compute it then.

[[widget:estimator]]

## Interview angles

- "Why 3× for peak?" Typical diurnal peaks are 2–3× the daily average; event spikes need separate thought.
- "Does this fit on one machine?" Compare total size and peak write QPS to what one machine handles.
- "How big is the cache?" Hot set × item size × overhead, not the whole dataset.

--- revise
### Recipe
? From DAU to average QPS? :: DAU × actions per day ÷ ~10⁵ seconds.
? Typical peak factor? :: 2–3× the daily average (more for events).
? Total storage formula? :: Writes/day × size × days retained × replication factor (+ indexes, overhead).
? What decides cache size? :: The hot set (items read often) × item size × overhead, not total data.

### Judgement
? When do you stop estimating? :: When the numbers have classified the problem (read/write heavy, one machine or many, CDN or not, tiering or not).
? Why separate reads and writes? :: They differ by orders of magnitude and drive different components.
? Concurrent connections estimate? :: DAU × share online at peak.
? How many partitions? :: The larger of peak writes ÷ writes per partition and total size ÷ size per machine.

### The photo example
? 25B views/day is how many per second? :: ~250k/s average, ~750k/s at 3× peak: CDN territory.
? 30 TB/day × 3 copies for a year? :: ~33 PB: object storage with cold tiers (and erasure coding).

--- notes
## Recipe
DAU → actions/day (reads and writes separately) → avg QPS (÷ 10⁵) → peak (× 2–3) → storage/day → × retention × replication → bandwidth = QPS × size.
## Habits
Round to powers of ten; use scientific notation; say each assumption before the number.
Estimate the hot set for caches; total size for storage.
Sanity-check against the real world.
## Recurring estimates
Concurrent connections = DAU × online share; ~100k–1M idle connections per server.
Servers = peak QPS ÷ per-server QPS (+ zone-failure headroom).
Partitions = max(peak writes ÷ per-partition writes, total size ÷ per-machine size).
## Photo app example
500M DAU · 50 views, 0.1 uploads each · 500 uploads/s · 250k views/s (750k peak) · 30 TB/day · 33 PB/year with 3 copies · ~60 Gbit/s read.
Decisions: direct-to-object-storage uploads; CDN for reads; storage tiering; metadata-only servers.
## Stop when
The numbers classify the problem; compute more precise figures only inside a deep dive.

--- doubts
Q: What if my numbers are wrong?
A: That's expected. Interviewers judge whether your *method* and *assumptions* are reasonable and whether you use the result. Being off by 2× changes nothing; being off by 1,000× usually means a wrong assumption (bytes vs kilobytes, per day vs per second), which a sanity check catches.

Q: Should I compute bandwidth every time?
A: Only when it might drive a decision: large media (video, photos), very high QPS, or cross-region traffic. For a chat app sending 200-byte messages, bandwidth is rarely the bottleneck; connection count is.

Q: Why multiply by the replication factor?
A: Because each copy is real disk you pay for. Three copies of 10 PB is 30 PB of raw disk. Erasure coding (storing data pieces plus parity) gives similar durability with roughly 1.4–1.5× overhead instead of 3×, which is why huge blob stores use it for cold data.

Q: How do I estimate "actions per user per day" without data?
A: Reason from behaviour: "a typical user opens the app 10 times a day and scrolls 5 screens of 10 posts: 500 post views". Say it, write it, move on. If the interviewer has a number in mind, they will correct you.

Q: Is peak always 3× average?
A: No; it depends on the product. A global service sees a smoother daily curve than a single-country one. A ticket sale or a sports event can be 10–100× for minutes. State your factor and, for spiky products, design separately for the spike (queues, waiting rooms, pre-scaling).

Q: Do I need to include metadata and indexes in storage?
A: Mention them when they are large relative to the data. For photos, metadata (a few hundred bytes per photo) is negligible next to the image. For small records (likes, follows), indexes can double the size, so add a factor of about 1.5–2.

--- exercises
[estimate] A messaging app has 200M DAU, each sending 30 messages a day of 200 bytes, kept for 2 years with 3 copies. Compute write QPS (average and peak) and total storage.
A: Messages/day = 200M × 30 = 6B. Average QPS = 6 × 10⁹ / 10⁵ = 60,000/s; peak (3×) ≈ 180,000/s. Storage/day = 6B × 200 B = 1.2 TB. Two years ≈ 730 days: 1.2 TB × 730 ≈ 876 TB; × 3 copies ≈ 2.6 PB (more with indexes, perhaps 4–5 PB). Decision: writes far beyond one database primary, so partition (by chat ID).

[estimate] A URL shortener creates 100M links per month and serves 10B redirects per month. Each link record is about 500 bytes. Compute create QPS, redirect QPS and 5-year storage.
A: Month ≈ 2.6 × 10⁶ s. Creates: 10⁸ / 2.6 × 10⁶ ≈ 40/s. Redirects: 10¹⁰ / 2.6 × 10⁶ ≈ 3,900/s average, ~12,000/s peak. Storage: 100M × 12 × 5 = 6B links × 500 B = 3 TB (9 TB with 3 copies). Decisions: writes are tiny; redirects are read-heavy and cacheable; data fits on a handful of machines, so the hard parts are code generation and redirect latency, not size.

[estimate] 500M DAU, 10% online at peak, each holding one WebSocket. One server holds 200,000 idle connections. How many connection servers, keeping capacity for one of three zones to fail?
A: Concurrent = 50M. Servers = 50M / 200k = 250. Surviving one zone of three means two zones carry everything: 250 / 2 = 125 per zone, 375 in total. Add headroom for deploys (≈ 400).

[choose] Your estimate shows 2,000 writes/s, 20,000 reads/s and 2 TB of data. One database or a partitioned store?
A: One primary relational database with a few read replicas and a cache. 2,000 writes/s and 2 TB fit on a single well-provisioned machine; 20,000 reads/s are spread over replicas and a cache. Partitioning would add complexity (cross-shard queries, rebalancing) with no benefit yet. State when you would revisit it: writes approaching ~10–20k/s or data approaching what one machine holds comfortably.

[estimate] Video platform: 1M uploads a day, 10 minutes each on average, stored in 4 qualities totalling about 1 GB per 10-minute video. Storage per year?
A: 1M × 1 GB = 1 PB per day. Per year ≈ 365 PB before replication. This number dominates the design: erasure-coded object storage, aggressive tiering (popular videos on fast storage and CDNs, the long tail on cold storage), and possibly not keeping every quality for rarely watched videos.

--- pitfalls
- Precision theatre: three significant figures on numbers that only need a power of ten
- Mixing per-day and per-second, or bytes and bits (1 Gbit/s is 125 MB/s, not 1 GB/s)
- Forgetting replication and indexes in storage
- Using the total dataset as the cache size instead of the hot set
- Computing numbers and never using them in a decision
- Silent assumptions the interviewer cannot correct

--- quiz
Q: 100M DAU each performing 20 reads a day gives roughly what average read QPS?
- 2,000
- *20,000
- 200,000
- 2 million
W: 100M × 20 = 2 × 10⁹ per day ÷ 10⁵ s = 2 × 10⁴.
Q: Cache size should be based on…
- The total dataset
- *The hot set that receives most reads
- The number of servers
- The write QPS
W: Caches hold what is read often; the long tail stays in storage.
Q: Which estimate most changes a photo-sharing design?
- CPU per thumbnail
- *Hundreds of thousands of image views per second and petabytes per year
- Number of engineers
- Length of captions
W: These force a CDN and tiered object storage.
Q: 1 Gbit/s is about…
- 1 GB/s
- *125 MB/s
- 8 MB/s
- 1,000 MB/s
W: 8 bits per byte: 1,000 Mbit ÷ 8 = 125 MB.

--- sources
- book :: System Design Interview: An Insider's Guide, vol. 1, ch. 2 (Back-of-the-envelope estimation) :: Alex Xu :: https://bytebytego.com/courses/system-design-interview/back-of-the-envelope-estimation
- article :: Numbers Everyone Should Know (LADIS 2009) :: Jeff Dean :: https://www.cs.cornell.edu/projects/ladis2009/talks/dean-keynote-ladis2009.pdf
- book :: Site Reliability Engineering, ch. 18 (Software Engineering in SRE: capacity planning) :: Google :: https://sre.google/sre-book/software-engineering-in-sre/
- article :: Estimation in system design interviews :: Hello Interview :: https://www.hellointerview.com/learn/system-design/in-a-hurry/core-concepts

=== capacity-planning
blurb: From estimates to hardware: how many servers, shards, cache nodes and connections a design needs, with headroom for peaks and failures, and how to tell which resource runs out first.
signals: You have peak QPS and storage and must size the system | Deciding how many partitions or cache nodes | The interviewer asks "what's your bottleneck?"
prereq: capacity-math

--- lesson
:::words
- **Capacity**: the most work a component can do before it gets too slow or fails.
- **Headroom**: spare capacity kept free on purpose, for peaks, failures and deploys.
- **N+1 / N+2**: having one (or two) more units than you need, so any one (or two) can fail.
- **Bottleneck**: the resource that runs out first: CPU, memory, disk, network or connections.
- **Shard (partition)**: one slice of a dataset; each machine holds some shards.
- **Working set (hot set)**: the part of the data that is actively used.
:::

## The problem in plain words

Estimation told you "750,000 requests per second" and "30 PB". Capacity planning turns those into concrete hardware: how many web servers, how many database machines, how many cache nodes. Then it asks the questions that keep the system alive: what happens at peak, what happens when a machine or a whole zone dies, and which resource will run out first?

:::eli5
A restaurant expects 200 customers at dinner. Each table seats 4 and turns over twice, so they need 25 tables. But a few tables break, a big group arrives at once, and a waiter calls in sick. So they keep 30 tables and an extra waiter. Capacity planning is choosing that 30.
:::

## Step 1: find the resource that runs out first

Every component is limited by one resource before the others. Identify it, because that is what you size for:

| Component | Usually limited by | Sized by |
|---|---|---|
| Stateless API servers | CPU (or threads waiting on I/O) | Peak QPS ÷ QPS per server at a safe utilisation |
| Cache nodes | Memory, then network | Hot set × overhead ÷ memory per node; check QPS per node too |
| Database primaries | Write throughput, then disk I/O | Peak writes ÷ writes per primary; total size ÷ size per machine |
| Connection servers (chat, push) | Memory per connection and file descriptors | Concurrent connections ÷ connections per server |
| Blob storage | Disk capacity, then disk throughput | Total bytes × overhead ÷ capacity per disk |
| Load balancers / proxies | Network bandwidth, connections per second | Peak bandwidth ÷ bandwidth per box |

## Step 2: decide the safe utilisation

You never plan to run machines at 100%. Latency rises sharply as utilisation approaches 100% (the queueing page shows why), and you need room for spikes. Common planning targets:

- **CPU-bound services: 50–70% at peak.**
- **Memory-bound caches: 70–80% of memory** (leave room for fragmentation and growth).
- **Disks: 70–80% full** (databases slow down near full; compaction and rebalancing need free space).

If one server handles 10,000 QPS at 100% CPU, plan for about 6,000 QPS at 60%.

## Step 3: add failure headroom

Plan for losing capacity, not just for traffic:

- **N+1 for small fleets**: if you need 4 servers, run 5.
- **Zone failure**: if you run in 3 zones and must survive losing one, the other 2 must carry 100% of the peak. Each zone needs half the peak capacity, so you deploy 150% of what you need.
- **Deploys**: rolling deploys take a slice of servers out at a time (say 10%), which must also fit.
- **Region failure**: for multi-region active–active systems, each region must absorb the traffic of the region that fails, which can mean 2× capacity per region.

## A worked example: sizing a chat backend

From estimation: 180,000 messages/s at peak, 50M concurrent connections, 2.6 PB of messages over 2 years, the hot set is the last 7 days of messages for active chats.

**Connection servers.** Each idle WebSocket costs ~10–50 KB of memory plus a file descriptor. Assume 200,000 connections per server (memory-bound). 50M ÷ 200k = 250 servers. Three zones, survive one: 250 ÷ 2 per zone × 3 zones = 375.

**Message store.** Assume one partition (a machine in a wide-column store) sustains 10,000 writes/s comfortably. 180,000 ÷ 10,000 = 18 partitions for throughput. For size: 2.6 PB ÷ ~5 TB usable per machine = 520 machines. **Size wins by far**, so the store needs ~520 machines (or fewer with denser storage or tiering old messages to cheaper storage), and throughput is not the bottleneck.

**Cache for recent messages.** 7 days of messages ≈ 7 × 1.2 TB = 8.4 TB raw; with ~1.5× overhead ≈ 12.6 TB. At 64 GB usable per node: ~200 nodes, perhaps 2 replicas each for availability: 400. Is that worth it? Ask what the cache saves: if the message store handles recent reads fine, a smaller cache for only the hottest chats may be better. Capacity planning is also about **not** buying what you do not need.

The interesting output is the observation that **storage size, not write rate, dominates the message store**. That is what an interviewer wants to hear: you computed both and saw which one wins.

## Step 4: check the other resources

After sizing by the main limit, sanity-check the others:

- **Network**: 180,000 messages/s × 200 bytes is only 36 MB/s for writes, but delivery fans out to group members: at an average group size of 10, that is 1.8M deliveries/s.
- **Per-node QPS on caches**: 1M reads/s across 200 nodes is 5,000/s each, trivial for a cache.
- **Hot keys**: averages hide skew. One huge group chat or one celebrity can put 100× the average load on a single partition. Plan to split hot keys (see the partitioning chapter).

## How the plan evolves

Capacity planning is not done once. Real systems do it continuously:

- **Load testing** to measure real per-server capacity instead of assuming it.
- **Forecasting** from growth trends, with lead time for buying hardware or raising cloud quotas.
- **Autoscaling** for stateless tiers with predictable warm-up; stateful tiers (databases, caches) are scaled deliberately, because adding a node means moving data.
- **Graceful degradation plans** for when demand exceeds even the headroom: what to turn off first.

## Interview angles

- "What's your bottleneck?" Name the limiting resource per component, with the number.
- "How many shards?" Compute from both throughput and size; say which wins.
- "What if a zone goes down?" Show that the remaining zones carry peak load.

--- revise
### Method
? First step in sizing a component? :: Find the resource that runs out first (CPU, memory, disk, network, connections).
? Safe peak utilisation for CPU-bound servers? :: About 50–70%.
? Surviving the loss of 1 of 3 zones requires? :: The other 2 carry 100% of peak: deploy ~150% of the needed capacity.
? How do you size a partitioned store? :: The larger of peak writes ÷ writes per partition and total size ÷ size per machine.

### Lessons from the chat example
? Which dominated the message store, writes or size? :: Size: ~520 machines for 2.6 PB vs ~18 for write throughput.
? What do averages hide in capacity plans? :: Hot keys and skew (one huge group, one celebrity).
? Which tiers autoscale easily? :: Stateless ones; stateful tiers need data movement and are scaled deliberately.

--- notes
## Limits per component
API servers: CPU/threads · caches: memory then network · DB primaries: writes then disk I/O · connection servers: memory per connection, file descriptors · blob stores: disk capacity · proxies: bandwidth.
## Safe utilisation
CPU 50–70% at peak · memory 70–80% · disks 70–80% full.
## Failure headroom
N+1 for small fleets · zone loss (1 of 3): deploy 150% · deploys take a slice out · multi-region: each region absorbs a failed one.
## Chat example
50M connections ÷ 200k = 250 (+ zone headroom = 375) · 180k writes/s ÷ 10k = 18 partitions · 2.6 PB ÷ 5 TB = 520 machines: size dominates.
## Check the rest
Fan-out multiplies deliveries; per-node QPS on caches; hot keys break averages.
## Over time
Load-test real capacity; forecast with lead time; autoscale stateless tiers; plan degradation.

--- doubts
Q: Why not run servers at 90% to save money?
A: Because waiting time explodes near full utilisation: at 90% busy, a request waits on average about 10× its service time in a simple queue model; at 95%, about 20×. A small traffic bump at 90% pushes you into seconds of latency. Running at 50–70% keeps latency flat and leaves room for spikes and failures.

Q: How do I know how many connections one server can hold?
A: It depends on memory per connection (kernel buffers plus your application state, often tens of kilobytes) and the operating system's limits on open files. Hundreds of thousands to a few million idle connections per well-tuned server are achievable; in an interview, state an assumption like 100k–500k and size from it.

Q: Should every component have N+1?
A: Every component whose failure would hurt should have redundancy, but the form varies: stateless servers get spare instances; databases get replicas with failover; caches get replicas or are sized so the database survives losing a node; whole zones get spare capacity in the others. The question to answer is "if this one thing fails, what carries its load?"

Q: Why can't I autoscale my database like my web servers?
A: Adding a database or cache node means moving data onto it (rebalancing), which takes time and adds load exactly when you are already busy. Web servers are stateless, so a new one can start serving immediately. Stateful tiers are therefore provisioned ahead of demand, with growth forecasts.

Q: Is cloud capacity infinite, so I can skip this?
A: No. Cloud regions have quotas and finite hardware, new instances take minutes to start, and stateful systems still need rebalancing. More importantly, cost scales with what you provision. Capacity planning in the cloud is about lead time, quotas and spend rather than buying servers.

--- exercises
[estimate] A cache must hold 2 TB of hot data. Each node has 128 GB of RAM; you use 75% for data and keep 2 replicas. How many nodes?
A: Usable per node = 96 GB. 2 TB / 96 GB ≈ 21 nodes for one copy; 2 replicas = 42 nodes. Check throughput too: if peak reads are 2M/s, that is about 48k/s per node across 42, comfortable for a cache.

[estimate] Peak 300,000 requests/s. Load testing shows 12,000 requests/s per server at 100% CPU. You target 60% CPU and must survive losing 1 of 3 zones. How many servers?
A: Per server at 60%: 7,200 req/s. Needed: 300,000 / 7,200 ≈ 42 servers. Two zones must carry all of it: 21 per zone, 63 in total across 3 zones.

[choose] A metrics system writes 2M data points per second, each 20 bytes, kept for 30 days with 3 copies. Is the bottleneck write throughput or storage?
A: Storage: 2M × 20 B = 40 MB/s ≈ 3.5 TB/day; 30 days × 3 copies ≈ 300 TB, which at 5 TB per machine is ~60 machines. Writes: if one node handles 100k points/s, you need 20 nodes. Storage dominates (≈ 60 machines), though time-series compression (often 10× or more for metrics) can cut it drastically, at which point write throughput becomes the limit. Say both and the role of compression.

[break] A team sizes a 3-zone deployment so that peak traffic uses 90% of all servers. A zone fails during peak. What happens?
A: The remaining two zones receive 100% of the traffic with two-thirds of the servers: 90% / (2/3) = 135% of their capacity. Queues grow without bound, latency explodes, health checks fail as servers time out, and the load balancer may remove more servers, making it worse (a cascading failure). They needed each zone sized to carry half the peak, i.e. ~60% utilisation or less at peak with all three zones up.

[design] You expect a 10× traffic spike for 15 minutes during a product launch. Autoscaling takes 5 minutes. What do you do?
A: Pre-scale the stateless tiers before the launch rather than relying on autoscaling. Warm the caches with the content that will be popular. Put a queue in front of non-urgent work (emails, analytics). Prepare load shedding: a priority order of what to reject or degrade if demand exceeds even the pre-scaled capacity, and possibly a waiting room for the purchase flow. Check quotas with the cloud provider ahead of time.

--- pitfalls
- Sizing for average load instead of peak
- Planning at 90–100% utilisation, leaving no room for spikes or failures
- Computing only throughput (or only size) for a store, missing the other limit
- Forgetting zone or region failure headroom
- Assuming stateful tiers can autoscale like stateless ones
- Ignoring hot keys hidden by averages

--- quiz
Q: You need 30 servers' worth of capacity and run in 3 zones, needing to survive the loss of one. How many servers?
- 30
- 40
- *45
- 90
W: Two zones must carry everything: 15 per zone, 45 in total.
Q: A partitioned store needs 20 partitions for write throughput and 300 for data size. How many do you plan?
- 20
- 160
- *300
- 320
W: The larger requirement wins; size dominates here.
Q: Why plan CPU-bound services at 50–70% peak utilisation?
- To save power
- *Latency rises sharply near full utilisation, and you need room for spikes and failures
- Cloud providers require it
- It makes deploys faster
W: Queueing delay grows like 1/(1 − utilisation).
Q: Which tier is hardest to autoscale quickly?
- Stateless API servers
- *Databases and caches, because new nodes need data moved onto them
- Load balancers
- CDN edge nodes
W: Stateful tiers rebalance data before a new node helps.

--- sources
- book :: Site Reliability Engineering, ch. 18 (capacity planning case study) :: Google :: https://sre.google/sre-book/software-engineering-in-sre/
- book :: The Site Reliability Workbook, ch. 11 (Managing load) :: Google :: https://sre.google/workbook/managing-load/
- book :: The Art of Capacity Planning, 2nd ed. :: Arun Kejariwal, John Allspaw :: https://www.oreilly.com/library/view/the-art-of/9781491939154/
- book :: The Datacenter as a Computer, 3rd ed. :: Barroso, Clidaras, Hölzle :: https://research.google/pubs/the-datacenter-as-a-computer-designing-warehouse-scale-machines-third-edition/

=== queueing
blurb: Why systems get slow long before they are "full": Little's law, how waiting time explodes as utilisation nears 100%, why tail latency dominates at scale, and the tricks (hedging, timeouts, shedding) that keep the tail short.
signals: Latency is fine at low load but terrible at peak | Deciding how much headroom to keep | A request fans out to many servers and is slow | Choosing timeouts and retry policies
widgets: queueing
prereq: capacity-planning

--- lesson
:::words
- **Queue**: requests waiting their turn because the server is busy.
- **Service time**: how long the server actually works on one request.
- **Arrival rate**: how many requests arrive per second (written λ, "lambda").
- **Utilisation**: the share of time the server is busy (written ρ, "rho"). 0.8 means busy 80% of the time.
- **Response time**: waiting time in the queue plus service time: what the user feels.
- **Tail latency**: the response time of the slowest requests, such as p99.
- **Fan-out**: one request that calls many servers and must wait for all of them.
:::

## The problem in plain words

A server that can handle 1,000 requests per second is not fine at 950 requests per second. Long before it is "full", requests start waiting behind each other, and the waits grow dramatically as you approach full. This page explains why, how to calculate it roughly, and why the slowest 1% of requests (not the average) is what large systems must fight.

:::eli5
A supermarket checkout can serve one customer a minute. If customers arrive exactly one a minute, evenly, nobody waits. But real customers arrive in clumps: three at once, then none for a while. When the cashier is idle, that time is gone forever; when a clump arrives, a line forms. The busier the cashier is on average, the less idle time there is to clear the lines, so the lines get long very quickly as you approach "fully busy".
:::

## Little's law: the one formula you always use

For any stable system (requests arriving and leaving at the same average rate):

> **items inside = arrival rate × time each spends inside**, written **L = λ × W**.

It holds for any system, whatever the arrival pattern, and it is wonderfully practical:

- 2,000 requests/s that each take 50 ms means **100 requests in flight** at any moment. So you need about 100 worker threads or connections, not 2,000.
- If a dependency slows from 50 ms to 2 s, in-flight requests rise from 100 to **4,000**, which is why slow dependencies exhaust thread pools.
- A queue holding 10,000 messages drained at 500/s means each new message waits about **20 s**.

## Why waiting explodes near 100%

The simplest model of a single server with random arrivals and random service times (the "M/M/1 queue") gives the average response time:

> **response time = service time ÷ (1 − utilisation)**

| Utilisation | Response time (service time = 10 ms) |
|---|---|
| 50% | 20 ms |
| 80% | 50 ms |
| 90% | 100 ms |
| 95% | 200 ms |
| 99% | 1,000 ms |

From 50% to 90% busy, latency goes up 5×; from 90% to 99%, another 10×. The curve is gentle and then a wall. Real servers are not exactly this model, but the shape always holds, and the **more variable** the arrivals and service times, the earlier the wall comes (Kingman's formula makes this precise: waiting grows with the variability of both).

Watch it happen: raise the arrival rate and see the queue and the p99 climb.

[[widget:queueing]]

Two lessons for design:

1. **Headroom is not waste.** Running at 60% instead of 90% buys you flat latency and room for spikes.
2. **Reduce variability.** Separating slow, heavy requests (reports, exports) from fast ones (page loads) into different queues or server pools stops the heavy ones from making everyone wait.

## The tail at scale

In 2013, Google's Jeff Dean and Luiz André Barroso described a problem that grows with system size. Suppose each server is fast 99% of the time and slow (say 1 s) 1% of the time. A request that **fans out** to 100 servers and must wait for all of them is slow whenever *any* of them is slow:

> P(at least one slow) = 1 − 0.99¹⁰⁰ ≈ **63%**.

A rare problem on one server becomes the common case for the whole request. Search, feeds and any scatter–gather query hit this. The causes of occasional slowness are everywhere: garbage-collection pauses, background compactions, a noisy neighbour on the same machine, a network blip, a queue behind one heavy request.

Techniques from the paper that every senior should know:

- **Hedged requests.** Send the request to one replica; if no reply arrives within the p95 latency, send it to a second replica and use whichever answers first. In the paper's Bigtable example, hedging after a short delay cut the 99.9th-percentile latency for reading 1,000 keys from 1,800 ms to 74 ms while adding only about 2% more requests.
- **Tied requests.** Send to two replicas at once, each knowing about the other; whichever starts work first tells the other to cancel. Removes queueing delay at the cost of a little extra messaging.
- **Micro-partitioning.** Split data into many more small partitions than machines, so load can be moved in small pieces when one machine is slow or hot.
- **Good-enough answers.** For search-like systems, return results when 99% of shards have answered rather than waiting for the slowest.

## Timeouts and retries, through this lens

- A **timeout** caps how long a request can sit in your system. Without one, Little's law says in-flight work grows without limit when a dependency slows.
- A **retry** adds load. If a server is slow because it is overloaded, retries push it further over the wall. Retries need limits, exponential backoff with jitter, and ideally a retry budget (say, at most 10% extra requests). The reliability chapter covers this in depth.
- **Queues must be bounded.** An unbounded queue in front of an overloaded server only converts "fast rejection" into "slow failure", because by the time a request reaches the front its client has given up. Shed load at the door instead.

## Interview angles

- "Why keep servers at 60%?" Response time ≈ service time ÷ (1 − utilisation); near 100% it explodes.
- "This fans out to 200 shards; what's the p99?" Most requests will hit at least one shard's tail; use hedging, partial results, or reduce fan-out.
- "How many threads do you need?" Little's law: arrival rate × latency.

--- revise
### Little's law
? Little's law? :: Items in the system = arrival rate × time in system (L = λW).
? 2,000 req/s at 50 ms each: how many in flight? :: 100.
? A dependency slows from 50 ms to 2 s at the same traffic: in-flight requests? :: 40× more (100 → 4,000): thread pools run out.

### Utilisation
? Simple single-server response time vs utilisation? :: Service time ÷ (1 − utilisation).
? At 90% utilisation, response time ≈ ? :: 10× the service time.
? What makes the wall come earlier? :: More variability in arrivals and service times.
? Why separate heavy and light requests? :: Heavy ones increase variability and make light ones wait.

### Tail at scale
? Fan-out to 100 servers, each slow 1% of the time: share of slow requests? :: ≈ 63% (1 − 0.99¹⁰⁰).
? Hedged request? :: Send to a second replica if no reply by ~p95; use the first answer.
? Why must queues be bounded? :: An overloaded unbounded queue turns fast rejections into slow failures; clients give up before being served.

--- notes
## Little's law
L = λW: in flight = rate × latency. Size thread and connection pools with it.
A slowdown multiplies in-flight work by the same factor.
## Utilisation
Response ≈ service ÷ (1 − ρ): 50% → 2×, 80% → 5×, 90% → 10×, 95% → 20×, 99% → 100×.
Variability (bursty arrivals, mixed request sizes) moves the wall earlier (Kingman).
Keep headroom; isolate heavy requests in their own queues or pools.
## Tail at scale (Dean & Barroso 2013)
Fan-out to N: P(slow) = 1 − (1 − p)ᴺ; 1% × 100 servers ≈ 63%.
Causes: GC pauses, compaction, noisy neighbours, network blips, head-of-line queueing.
Hedged requests (after ~p95 delay): 99.9th pct 1,800 → 74 ms for ~2% extra load.
Tied requests, micro-partitioning, good-enough partial results.
## Timeouts, retries, queues
Timeouts bound in-flight work. Retries add load: cap them, back off with jitter, use a retry budget.
Bound queues and shed at the door.

--- doubts
Q: Why does waiting grow so suddenly instead of gradually?
A: Because idle time is what clears backlogs, and idle time shrinks to zero as utilisation approaches 100%. At 50% busy, half of all time is available to catch up after a burst; at 95%, only 5% is, so a burst takes 10× longer to clear and new bursts arrive before the old ones are gone. Mathematically, the 1 ÷ (1 − ρ) term blows up as ρ → 1.

Q: Does this apply to things other than servers?
A: Yes, to anything with work arriving and a finite rate of doing it: database connection pools, disk I/O queues, network links, message consumers, even a team's ticket backlog. Little's law in particular applies to every stable system.

Q: Isn't a hedged request just wasting resources?
A: A little, by design. Hedging only after the p95 delay means at most about 5% extra requests (2% in Google's example), and it cuts the worst latencies dramatically because a second replica is unlikely to be slow at the same moment. It must only be used for idempotent reads (or writes with idempotency keys), and you should cancel the losing request when possible.

Q: What is the difference between latency and throughput here?
A: Throughput is how many requests per second the server completes; latency is how long each one takes. A server can keep its throughput high while latency explodes: it is completing requests at full speed, but each one waited a long time in the queue. That is exactly what happens near 100% utilisation.

Q: Why not just make the queue bigger to avoid rejecting requests?
A: A bigger queue only helps with short bursts. Under sustained overload, it fills anyway, and each request waits longer before it is even started, often longer than the client's timeout, so the server does work for clients who have already left. Rejecting early (with a clear error that tells clients to back off) keeps the requests you do serve fast.

Q: How do I estimate p99 rather than the average from this model?
A: In the simple model, response times are spread out exponentially, and the p99 is about 4.6× the mean (ln 100 ≈ 4.6). So at 80% utilisation with 10 ms of service, the mean is ~50 ms and the p99 is around 230 ms. Real systems are messier, but "p99 is several times the mean, and both explode together" is a safe rule.

--- exercises
[estimate] A service receives 5,000 requests/s and each takes 40 ms on average. How many requests are in flight? If each uses one thread, how many threads do you need with 2× headroom?
A: L = 5,000 × 0.04 s = 200 in flight. With 2× headroom, 400 threads (spread across servers). If the average latency doubles to 80 ms, 400 are in flight and the headroom is gone, which is why latency spikes exhaust pools.

[estimate] A single-server queue with 20 ms service time runs at 70% utilisation. Traffic grows by 25%. Using response ≈ service ÷ (1 − ρ), how does the average response time change?
A: Before: ρ = 0.7, response = 20 / 0.3 ≈ 67 ms. After: ρ = 0.875, response = 20 / 0.125 = 160 ms. A 25% traffic increase more than doubled the latency, because the system moved toward the wall.

[estimate] A search request fans out to 50 shards and waits for all. Each shard exceeds 100 ms 0.5% of the time. What share of searches exceed 100 ms? What if you wait for 49 of 50?
A: All 50: 1 − 0.995⁵⁰ ≈ 1 − 0.78 = 22%. Waiting for 49 of 50 means a search is slow only if two or more shards are slow: P(0 slow) ≈ 0.778, P(exactly 1) = 50 × 0.005 × 0.995⁴⁹ ≈ 0.196, so P(≥ 2) ≈ 2.6%. Accepting one missing shard (a slightly less complete result) cuts slow searches about 8×.

[design] Reports that take 5 s each and page loads that take 20 ms share one pool of 200 threads. During month-end, reports surge and page loads get slow. Fix it.
A: Isolate them: a separate, bounded pool (or separate servers) for reports, with a queue and a cap on concurrent reports, so they cannot occupy all threads. Page loads get their own pool sized by Little's law. Optionally move reports to an asynchronous job ("we'll email you when it's ready"). This removes the variability that was making the fast requests wait.

[break] A team reacts to rising latency by doubling every client's retry count and lengthening timeouts. What happens at the next traffic peak?
A: The servers are slow because they are near their utilisation wall. Retries add more load at exactly that moment, pushing them further over; longer timeouts keep more requests in flight (Little's law), exhausting threads and connections. Latency and error rates spiral (a retry storm). Correct approach: keep timeouts short and consistent with the latency budget, cap retries with backoff and jitter and a retry budget, and shed load or add capacity.

--- pitfalls
- Assuming a server is fine until it reaches 100% utilisation
- Sizing thread pools by QPS instead of QPS × latency
- Unbounded queues in front of overloaded services
- Retrying aggressively when the cause is overload
- Mixing very slow and very fast requests in one pool
- Ignoring how fan-out turns a rare slow server into a common slow request

--- quiz
Q: By Little's law, 1,000 requests/s with 200 ms latency means how many in flight?
- 5
- 50
- *200
- 1,000
W: L = λW = 1,000 × 0.2.
Q: In the simple queue model, going from 50% to 90% utilisation multiplies response time by…
- 1.8×
- *5×
- 10×
- 40×
W: 1/(1−0.5) = 2 versus 1/(1−0.9) = 10: a factor of 5.
Q: A request fans out to 100 servers, each slow 1% of the time. Roughly what share of requests are slow?
- 1%
- 10%
- *63%
- 99%
W: 1 − 0.99¹⁰⁰ ≈ 0.63.
Q: Hedged requests are safe to use for…
- Any write
- *Idempotent reads (or writes with idempotency keys)
- Only batch jobs
- Requests without timeouts
W: The same request may run twice, so it must not cause double effects.

--- sources
- article :: The Tail at Scale (CACM 2013) :: Jeffrey Dean, Luiz André Barroso :: https://research.google/pubs/the-tail-at-scale/
- paper :: A Proof for the Queuing Formula L = λW (Operations Research, 1961) :: John D. C. Little :: https://doi.org/10.1287/opre.9.3.383
- book :: Performance Modeling and Design of Computer Systems: Queueing Theory in Action :: Mor Harchol-Balter :: https://www.cs.cmu.edu/~harchol/PerformanceModeling/book.html
- book :: Site Reliability Engineering, ch. 21 (Handling Overload) :: Google :: https://sre.google/sre-book/handling-overload/
- article :: Kingman's formula :: Wikipedia :: https://en.wikipedia.org/wiki/Kingman%27s_formula
