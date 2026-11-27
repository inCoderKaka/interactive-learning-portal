import { md } from "@/content/ai/md";

/**
 * Chapter overview pages for HLD, rewritten for first-time learners. They replace the old terse chapter lessons
 * (content/hld-concepts.ts) once a chapter's pages are written: a plain-words map of the chapter, not a summary in jargon.
 */
export const HLD_OVERVIEWS: Record<string, string> = {
  "hld-framework": md`
## What this chapter is about

In a system design interview you are asked to design something huge (YouTube, a chat app, a payment system) in about 45 minutes. Nobody expects a finished design. The interviewer is watching **how you think**: whether you narrow a vague question into a clear problem, build something that works, find its weak points yourself, and explain your choices.

This chapter is the playbook for those 45 minutes, in four pages:

1. **How the round runs and how it is scored.** The six phases and their timings, the five things interviewers write down, and what changes between a mid-level (L4), senior (L5) and staff (L6) answer.
2. **Requirements.** Turning "design Instagram" into 3–5 core features, explicit non-goals, and targets for scale, speed, availability and correctness, stated per feature.
3. **API and data model.** Writing the main operations and records first, because how data is looked up decides the database, the keys and how data is split across machines.
4. **Deep dives and failure.** Finding the genuinely hard parts yourself, going two levels below the boxes, and explaining what users see when each part fails or traffic spikes.

:::tip The one idea to keep
Every box you draw must solve a problem you named, and every choice is stated as "X instead of Y, because Z, at the cost of W".
:::

The chapters after this one teach the building blocks (networks, load balancers, caches, databases, queues) that you combine inside this framework.
`,
  estimation: md`
## What this chapter is about

Before choosing a design you need to know **how big the problem is**. Ten thousand users and one billion users need completely different systems. Estimation is the quick arithmetic that tells you which one you are building, and it rests on a few numbers about how fast computers, disks and networks are.

Four pages:

1. **Latency and throughput numbers.** How long memory, SSDs, disks and network trips take, shown on a ladder scaled to human time, and how much one machine can do per second. The gaps between them (1,000× and more) explain why caches, CDNs and precomputation exist.
2. **QPS, storage and bandwidth.** The recipe from daily users to requests per second, bytes per year and network traffic, with a full worked example and the habit of stopping once the numbers have made a decision for you.
3. **Capacity planning.** Turning those numbers into machines: which resource runs out first, how full machines should run, and the spare capacity needed to survive a failed machine or a whole data-centre zone.
4. **Queueing and tail latency.** Why a server gets slow long before it is "full", Little's law, and why the slowest 1% of requests dominates large systems. A live simulation lets you push a server toward 100% and watch.

:::tip The one idea to keep
Use round numbers, say every assumption out loud, and only compute numbers that change a decision.
:::
`,
  networking: md`
## What this chapter is about

Every system design starts with a user's device sending a request across the internet to your servers. This chapter follows that journey and explains each step in plain terms, because each step costs time and can fail.

1. **TCP, UDP and QUIC.** How data is chopped into packets, how TCP makes delivery reliable and ordered (at the cost of a handshake and waiting on lost packets), when UDP's "just send it" is better, and how QUIC rebuilds TCP's job faster on top of UDP.
2. **HTTP and TLS.** The request–response language of the web, how encryption keeps it private and proves who you are talking to, and how HTTP/1.1, HTTP/2 and HTTP/3 send many requests at once.
3. **DNS.** How a name becomes an IP address through a chain of servers and caches, why changes take time to spread, and how DNS steers users to nearby data centres.
4. **REST, gRPC and GraphQL.** Three ways programs talk to each other, and which fits public APIs, internal services and mobile apps.
5. **API design.** The habits that make an API safe in the real world: pagination that does not skip items, idempotency keys so retries never charge twice, versioning, clear errors, and handling slow operations.
6. **Real-time push.** How a server tells clients about new events (polling, long polling, server-sent events, WebSockets), and how to run millions of open connections.

:::tip The one idea to keep
Every network round trip costs time set by distance, so good designs reuse connections, set them up close to users, and avoid making requests one after another.
:::
`,
  "load-balancing": md`
## What this chapter is about

One server is never enough: it has limited capacity and it will eventually fail. So you run many identical copies, and you need something in front of them that gives clients one address, spreads requests across the copies, and quietly stops using broken ones. This chapter covers that layer, from one data centre up to the whole planet.

1. **L4 vs L7 load balancing.** Balancing whole connections by looking only at addresses and ports (fast, works for any protocol) versus reading each HTTP request to route by path or cookie (smarter, costlier). An explorer shows what each can see.
2. **Balancing algorithms.** Round robin, least connections and the power of two choices, raced on identical traffic, so you can watch why a slow server ruins round robin and why "always pick the least busy" can cause a stampede.
3. **Health checks and draining.** How quickly a dead server is noticed and how many requests fail meanwhile, why health checks must not depend on shared services, and how to remove servers without dropping requests.
4. **API gateways and service meshes.** The single front door that checks identity, applies rate limits and routes requests for many services, and how it differs from a mesh of proxies that handles traffic between services.
5. **Global traffic.** Getting users to the nearest healthy region with GeoDNS or anycast, setting up connections at the edge, and what happens when a whole region fails.

:::tip The one idea to keep
A load balancer must itself never be the single point of failure, and the strategy it uses decides whether one slow server becomes everyone's problem.
:::
`,
  caching: md`
## What this chapter is about

Reading from memory is about a thousand times faster than reading from disk, and a database can only answer so many questions per second. A **cache** keeps copies of frequently used data in memory so most reads never reach the database. It is the most common way to make a system both faster and able to serve far more users, and also a reliable source of subtle bugs, because you now have two copies of the same data.

1. **Cache patterns.** The four ways an application and a cache share reads and writes (cache-aside, read-through, write-through, write-back), and what each loses when something crashes.
2. **Eviction and sizing.** What to throw out when the cache is full (LRU, LFU, modern admission policies), raced on the same traffic, and how big a cache needs to be.
3. **Invalidation.** Why caches end up holding old data even when every rule is followed, and the fixes used at scale: TTLs, leases, versions and invalidation from the database's change log.
4. **Failure modes.** Stampedes when a popular entry expires, requests for things that do not exist, mass expiry, and single keys too popular for one server.
5. **Redis and Memcached.** How the two common caches work inside, how they are spread across machines, and what happens when one fails.
6. **CDNs.** Caches in hundreds of cities that serve images, video and files near users, and how to control and update what they hold.

:::tip The one idea to keep
A cache makes the database depend on the hit rate, so design for the moments when the hit rate drops: expiry, restarts and failures.
:::
`,
  databases: md`
## What this chapter is about

Almost every design question comes down to "where does the data live, and how is it found again?" This chapter builds that judgement from the ground up: how databases store data on disk, how they find it quickly, and how to choose and shape a database for each kind of data in a design.

1. **Choosing a database by access pattern.** Relational, key-value, document, wide-column, graph, search, time-series and object storage: what each is good and bad at, and a step-by-step way to choose per kind of data.
2. **Data modelling.** Tables, keys and relationships; when to store a fact once and when to copy it on purpose; how to design keys for stores without joins.
3. **Indexes.** How a B-tree finds one row among billions in a few reads, why the order of columns in an index matters, and what every index costs on writes. An explorer shows which rows each query reads.
4. **B-trees vs LSM trees.** The two storage-engine designs behind nearly every database: update in place, or append and merge later. Step through both with the same writes.
5. **Column stores and analytics.** Why reports over billions of rows need a separate, column-oriented copy of the data, and how data flows there.
6. **Inside the NoSQL families.** Partition keys, sort keys, documents, wide-column rows and graphs, with the design rules for each.

:::tip The one idea to keep
Start from how the data is read and written, how much of it there is and what must never go wrong; the database follows from those answers.
:::
`,
};
