import type { Scenario } from "../Seq";

/** Caching scenarios: read/write patterns with crashes, the invalidation race and its fixes, and CDN tiers. */
export const CACHING: Record<string, Scenario> = {
  "seq-cache-patterns": {
    title: "Four ways to use a cache",
    q: "When the data changes, who updates the cache, and what is lost if the cache crashes?",
    about: "The app reads and writes user 42's profile. Badges under each box show what each store holds.",
    actors: [{ id: "app", label: "App server" }, { id: "c", label: "Cache" }, { id: "db", label: "Database" }],
    init: { db: "name = Ada (v1)" },
    variants: [
      {
        key: "aside", label: "Cache-aside read", end: "The first read paid the database's price; every read after it, until the TTL, is a fast hit.",
        steps: [
          { from: "app", to: "c", label: "GET user:42", t: 0, say: "The app always checks the cache first." },
          { from: "c", to: "app", label: "miss", t: 1, kind: "bad", say: "Not there yet: a miss." },
          { from: "app", to: "db", label: "SELECT … WHERE id = 42", t: 2, say: "On a miss, the app itself reads the database." },
          { from: "db", to: "app", label: "Ada (v1)", t: 10, say: "The database answers in about 8 ms." },
          { from: "app", to: "c", label: "SET user:42 = Ada, TTL 1 h", t: 11, say: "The app puts the value in the cache with a TTL, so it expires even if an invalidation is ever missed.", set: { c: "Ada (v1), TTL 1 h" } },
          { from: "app", to: "c", label: "GET user:42 (next request)", t: 500, say: "The next request for this profile…" },
          { from: "c", to: "app", label: "hit: Ada (v1)", t: 501, kind: "ok", say: "…is served from memory in about half a millisecond. The database is not touched." },
        ],
      },
      {
        key: "asidew", label: "Cache-aside write", end: "Deleting (not updating) the cached copy means the next read loads the truth from the database.",
        init: { c: "Ada (v1)", db: "name = Ada (v1)" },
        steps: [
          { from: "app", to: "db", label: "UPDATE name = 'Ada L.'", t: 0, say: "The user renames themself. The app writes the database first, the source of truth.", set: { db: "name = Ada L. (v2)" } },
          { from: "db", to: "app", label: "ok", t: 6, say: "Committed." },
          { from: "app", to: "c", label: "DEL user:42", t: 7, say: "Then it deletes the cached copy, which is now wrong.", set: { c: "(empty)" } },
          { from: "app", to: "c", label: "GET user:42 (later)", t: 300, say: "The next read misses…" },
          { from: "app", to: "db", label: "SELECT …", t: 301, say: "…reads the new value from the database…" },
          { from: "app", to: "c", label: "SET user:42 = Ada L.", t: 310, kind: "ok", say: "…and caches it.", set: { c: "Ada L. (v2)" } },
        ],
      },
      {
        key: "through", label: "Write-through", end: "Reads right after writes are fresh. The price: every write waits for two stores.",
        init: { c: "Ada (v1)", db: "name = Ada (v1)" },
        steps: [
          { from: "app", to: "c", label: "SET user:42 = Ada L.", t: 0, say: "With write-through, the app writes through the cache layer…" },
          { from: "c", to: "db", label: "UPDATE name = 'Ada L.'", t: 1, say: "…which writes the database before confirming.", set: { db: "name = Ada L. (v2)" } },
          { from: "db", to: "c", label: "ok", t: 7, say: "The database commits.", set: { c: "Ada L. (v2)" } },
          { from: "c", to: "app", label: "ok", t: 8, kind: "ok", say: "Only now is the write acknowledged. Cache and database agree; a read immediately after sees the new name." },
        ],
      },
      {
        key: "back", label: "Write-back + crash", end: "The user was told 'saved', but the change is gone. Write-back trades durability for write speed.",
        init: { c: "Ada (v1)", db: "name = Ada (v1)" },
        steps: [
          { from: "app", to: "c", label: "SET user:42 = Ada L.", t: 0, say: "With write-back, the write goes only to the cache…", set: { c: "Ada L. (dirty)" } },
          { from: "c", to: "app", label: "ok", t: 1, kind: "ok", say: "…and is acknowledged at once: about 1 ms. The database will be updated later, in a batch." },
          { from: "c", to: "c", label: "flush scheduled in 5 s", t: 2, say: "The cache plans to write dirty entries to the database every few seconds." },
          { from: "c", to: "c", label: "💥 cache node crashes", t: 3000, kind: "bad", say: "Three seconds later the cache node crashes before flushing.", set: { c: "(lost)" } },
          { from: "app", to: "db", label: "SELECT … (after restart)", t: 4000, say: "After recovery, reads go to the database…" },
          { from: "db", to: "app", label: "Ada (v1)", t: 4008, kind: "bad", say: "…which still has the old name. An acknowledged write was lost." },
        ],
      },
    ],
  },

  "seq-invalidation": {
    title: "The stale-set race",
    q: "Both operations follow the rules. How does the cache still end up wrong?",
    about: "Reader A and writer B work on the same key at the same time. Watch the order of the last two steps.",
    actors: [{ id: "a", label: "Reader A" }, { id: "b", label: "Writer B" }, { id: "c", label: "Cache" }, { id: "db", label: "Database" }],
    init: { db: "price = 10 (v1)" },
    variants: [
      {
        key: "race", label: "The race", end: "Stale until the TTL expires: nothing will ever correct it sooner.",
        steps: [
          { from: "a", to: "c", label: "GET price:7", t: 0, kind: "bad", say: "Reader A checks the cache: miss." },
          { from: "a", to: "db", label: "SELECT price", t: 1, say: "A reads the database…" },
          { from: "db", to: "a", label: "10 (v1)", t: 5, say: "…and gets the current price, 10. Then A is delayed (a GC pause, a slow network) before writing it to the cache.", set: { a: "holding 10 (v1)" } },
          { from: "b", to: "db", label: "UPDATE price = 12", t: 6, say: "Meanwhile writer B changes the price to 12 in the database.", set: { db: "price = 12 (v2)" } },
          { from: "b", to: "c", label: "DEL price:7", t: 9, say: "B deletes the cache key, as cache-aside says. There was nothing to delete." },
          { from: "a", to: "c", label: "SET price:7 = 10", t: 40, kind: "bad", say: "A wakes up and caches the value it read earlier: the old price.", set: { c: "10 (stale!)" } },
          { from: "a", to: "a", label: "every reader now sees 10", t: 41, kind: "bad", say: "The database says 12, the cache says 10, and every reader gets 10 until the TTL runs out." },
        ],
      },
      {
        key: "lease", label: "Fix: leases", end: "The invalidation cancelled the lease, so the late, stale set was refused.",
        steps: [
          { from: "a", to: "c", label: "GET price:7", t: 0, say: "Reader A misses…" },
          { from: "c", to: "a", label: "miss + lease #881", t: 1, say: "…and the cache hands A a lease token, recorded for this key.", set: { c: "lease #881 open" } },
          { from: "a", to: "db", label: "SELECT price", t: 2, say: "A reads the database." },
          { from: "db", to: "a", label: "10 (v1)", t: 5, say: "A gets 10 and is delayed.", set: { a: "holding 10, lease #881" } },
          { from: "b", to: "db", label: "UPDATE price = 12", t: 6, say: "B writes 12.", set: { db: "price = 12 (v2)" } },
          { from: "b", to: "c", label: "DEL price:7", t: 9, say: "B's delete invalidates the key and cancels any outstanding lease for it.", set: { c: "lease #881 cancelled" } },
          { from: "a", to: "c", label: "SET price:7 = 10 (lease #881)", t: 40, say: "A tries to set the old value with its lease." },
          { from: "c", to: "a", label: "rejected: lease invalid", t: 41, kind: "ok", say: "Refused. The next reader will miss, get a fresh lease and load 12." },
        ],
      },
      {
        key: "version", label: "Fix: versioned sets", end: "Old data can never overwrite newer data, whatever the timing.",
        init: { c: "12 (v2)", db: "price = 12 (v2)" },
        steps: [
          { from: "a", to: "db", label: "SELECT price, version", t: 0, say: "Here the cache already holds version 2 (from another reader), and A read version 1 a moment before the update." , set: { a: "holding 10 (v1)" } },
          { from: "a", to: "c", label: "SET price:7 = 10 IF version > cached", t: 40, say: "A's set carries the row version it read: v1." },
          { from: "c", to: "a", label: "rejected: v1 < v2", t: 41, kind: "ok", say: "The cache compares versions and keeps the newer value." },
        ],
      },
    ],
  },

  "seq-cdn": {
    title: "A photo through a CDN",
    q: "Who actually sends the bytes when a million people view the same photo?",
    about: "Your origin is object storage in the US. Users are in Europe. The CDN has a Paris edge, a Lyon edge and an origin shield in Frankfurt.",
    actors: [{ id: "u", label: "User" }, { id: "e", label: "Edge (Paris)" }, { id: "e2", label: "Edge (Lyon)" }, { id: "sh", label: "Shield (Frankfurt)" }, { id: "o", label: "Origin (us-east)" }],
    variants: [
      {
        key: "first", label: "First view", end: "One slow trip to the origin, after which both the edge and the shield hold a copy.",
        steps: [
          { from: "u", to: "e", label: "GET /p/9f3a.jpg", t: 5, say: "A Paris user requests a photo; the request reaches the nearest edge." },
          { from: "e", to: "e", label: "miss", t: 6, kind: "bad", say: "The Paris edge does not have it." },
          { from: "e", to: "sh", label: "GET /p/9f3a.jpg", t: 15, say: "It asks the regional origin shield instead of going to the origin directly." },
          { from: "sh", to: "o", label: "GET /p/9f3a.jpg", t: 60, say: "The shield misses too and fetches from the origin across the Atlantic." },
          { from: "o", to: "sh", label: "200 · Cache-Control: public, max-age=31536000", t: 110, say: "The origin returns the photo with a one-year cache lifetime (the URL contains a content hash, so it never changes).", set: { sh: "cached" } },
          { from: "sh", to: "e", label: "200", t: 120, say: "The shield stores it and passes it on.", set: { e: "cached" } },
          { from: "e", to: "u", label: "200 photo", t: 125, kind: "ok", say: "About 125 ms for the very first view." },
        ],
      },
      {
        key: "hit", label: "Next viewers", end: "Most views never leave the city they are in. The origin sent this photo once.",
        init: { e: "cached", sh: "cached" },
        steps: [
          { from: "u", to: "e", label: "GET /p/9f3a.jpg", t: 5, say: "Another Paris user requests the same photo." },
          { from: "e", to: "u", label: "200 photo (hit)", t: 10, kind: "ok", say: "Served from the Paris edge in about 10 ms." },
          { from: "u", to: "e2", label: "GET /p/9f3a.jpg (from Lyon)", t: 20, say: "A Lyon user's request goes to the Lyon edge, which has never seen this photo." },
          { from: "e2", to: "sh", label: "GET /p/9f3a.jpg", t: 30, say: "Lyon misses, but asks the shield…" },
          { from: "sh", to: "e2", label: "200 (shield hit)", t: 40, say: "…which has it. The origin is not contacted.", set: { e2: "cached" } },
          { from: "e2", to: "u", label: "200 photo", t: 45, kind: "ok", say: "45 ms, and the origin still saw only one request." },
        ],
      },
      {
        key: "update", label: "Changing an image", end: "With versioned URLs, nothing needs to be purged: old and new files simply have different names.",
        init: { e: "cached /p/9f3a.jpg", sh: "cached" },
        steps: [
          { from: "o", to: "o", label: "user uploads a new avatar → /p/c41d.jpg", t: 0, say: "The user replaces their photo. The new file gets a new name derived from its content." },
          { from: "u", to: "e", label: "GET /profile (HTML, max-age 60)", t: 5, say: "The profile page (short TTL) now references /p/c41d.jpg." },
          { from: "u", to: "e", label: "GET /p/c41d.jpg", t: 8, say: "The browser requests the new name. It is a miss everywhere, fetched once, then cached for a year like the old one." },
          { from: "e", to: "u", label: "200 new photo", t: 130, kind: "ok", say: "Nobody sees the old image, and no purge was needed. The old file expires from caches on its own." },
        ],
      },
    ],
  },
};
