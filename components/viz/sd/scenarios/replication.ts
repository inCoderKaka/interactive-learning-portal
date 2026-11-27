import type { Scenario } from "../Seq";

/** Replication scenarios: failover and its failure modes, multi-leader conflicts, linearisability, session anomalies. */
export const REPLICATION: Record<string, Scenario> = {
  "seq-failover": {
    title: "Leader failover",
    q: "The leader dies. Which acknowledged writes survive, and what stops two leaders appearing?",
    about: "One leader, two asynchronous followers, and a coordinator (like etcd or ZooKeeper) that tracks who the leader is.",
    actors: [{ id: "c", label: "Client" }, { id: "l", label: "Leader (zone A)" }, { id: "f1", label: "Follower (zone B)" }, { id: "f2", label: "Follower (zone C)" }, { id: "co", label: "Coordinator" }],
    init: { l: "log up to #100", f1: "log up to #100", f2: "log up to #99" },
    variants: [
      {
        key: "clean", label: "Clean failover", end: "About 20 s of failed writes, no data lost because the promoted follower had everything.",
        steps: [
          { from: "c", to: "l", label: "write #101", t: 0, say: "A client writes. The leader applies it and acknowledges.", set: { l: "log up to #101" } },
          { from: "l", to: "f1", label: "replicate #101", t: 2, kind: "async", say: "The change streams to the followers.", set: { f1: "log up to #101" } },
          { from: "l", to: "l", label: "💥 crash", t: 5000, kind: "bad", say: "The leader's machine fails.", set: { l: "DEAD" } },
          { from: "co", to: "co", label: "no heartbeat for 15 s", t: 20000, say: "The coordinator notices missing heartbeats after its timeout. Writes have been failing meanwhile." },
          { from: "co", to: "f1", label: "promote: you lead, term 8", t: 20010, say: "It promotes the most up-to-date follower and bumps the term (epoch) number.", set: { f1: "LEADER term 8", co: "leader = zone B" } },
          { from: "f2", to: "f1", label: "replicate from you now", t: 20020, kind: "async", say: "The other follower now copies from the new leader and catches up.", set: { f2: "log up to #101" } },
          { from: "c", to: "f1", label: "write #102", t: 20100, kind: "ok", say: "Clients discover the new leader through the coordinator and retry their failed writes (with idempotency keys)." },
        ],
      },
      {
        key: "lost", label: "Async lag: lost writes", end: "The client was told #101 and #102 were saved. They are gone. Synchronous (or majority) replication prevents this.",
        steps: [
          { from: "c", to: "l", label: "write #101", t: 0, say: "Under heavy load, followers are a few hundred milliseconds behind.", set: { l: "log up to #101" } },
          { from: "l", to: "c", label: "ok", t: 1, kind: "ok", say: "Asynchronous replication: the leader acknowledges before any follower has the write." },
          { from: "c", to: "l", label: "write #102", t: 3, say: "Another write, also acknowledged.", set: { l: "log up to #102" } },
          { from: "l", to: "l", label: "💥 crash", t: 5, kind: "bad", say: "The leader dies before streaming #101 and #102.", set: { l: "DEAD (had #102)" } },
          { from: "co", to: "f1", label: "promote (term 8)", t: 15000, say: "The best follower only has up to #100.", set: { f1: "LEADER, up to #100" } },
          { from: "c", to: "f1", label: "read order #101", t: 16000, kind: "bad", say: "The client looks for the order it was told was saved: not found." },
        ],
      },
      {
        key: "split", label: "Split brain, then fencing", end: "The term number let storage and clients reject the old leader. Without it, two leaders would have diverged.",
        steps: [
          { from: "l", to: "co", label: "heartbeat", t: 0, kind: "drop", say: "A network fault cuts the leader off from the coordinator and the followers, but it is still running and some clients can still reach it." },
          { from: "co", to: "f1", label: "promote: term 8", t: 15000, say: "The coordinator thinks the leader died and promotes zone B with term 8.", set: { f1: "LEADER term 8", co: "leader = zone B" } },
          { from: "c", to: "l", label: "write #105 (to old leader)", t: 15500, kind: "bad", say: "A client still connected to the old leader (term 7) sends a write. Two nodes now believe they lead: split brain." },
          { from: "l", to: "l", label: "lease expired → step down", t: 15600, say: "Defence 1: the old leader's lease from the coordinator expired 10 s after it lost contact, so it refuses writes and steps down.", set: { l: "follower (term 7)" } },
          { from: "l", to: "c", label: "error: not leader", t: 15601, kind: "ok", say: "The client is told to find the current leader." },
          { from: "f1", to: "f2", label: "replicate term 8", t: 15700, say: "Defence 2: replicas and storage reject any message carrying an older term (a fencing token), so even a confused old leader cannot overwrite term 8's data." },
        ],
      },
    ],
  },

  "seq-conflict": {
    title: "Two leaders, one record",
    q: "Europe and the US both change the same document before replication catches up. What happens to the two edits?",
    about: "Multi-leader replication: each region accepts writes locally and copies them to the other asynchronously.",
    actors: [{ id: "ue", label: "User in Europe" }, { id: "eu", label: "Leader EU" }, { id: "us", label: "Leader US" }, { id: "uu", label: "User in US" }],
    init: { eu: "title = 'Draft'", us: "title = 'Draft'" },
    variants: [
      {
        key: "lww", label: "Last-writer-wins", end: "Both regions agree, but the European edit vanished without anyone being told.",
        steps: [
          { from: "ue", to: "eu", label: "title = 'Plan A' (10:00:00.120)", t: 0, say: "A user in Europe renames the document. Their local leader accepts at once.", set: { eu: "title = 'Plan A' @.120" } },
          { from: "uu", to: "us", label: "title = 'Plan B' (10:00:00.150)", t: 30, say: "30 ms later, before the EU change arrives, a US user renames it too.", set: { us: "title = 'Plan B' @.150" } },
          { from: "eu", to: "us", label: "replicate 'Plan A' @.120", t: 90, kind: "async", say: "The EU change reaches the US. Its timestamp is older than the US value, so the US keeps 'Plan B'." },
          { from: "us", to: "eu", label: "replicate 'Plan B' @.150", t: 110, kind: "async", say: "The US change reaches Europe. Its timestamp is newer, so Europe switches to 'Plan B'.", set: { eu: "title = 'Plan B'" } },
          { from: "ue", to: "eu", label: "refresh", t: 2000, kind: "bad", say: "The European user's rename is silently lost. And if the EU server's clock had been 50 ms fast, the *earlier* edit would have won instead." },
        ],
      },
      {
        key: "merge", label: "Detect and merge", end: "Neither edit is lost: the conflict is detected with version vectors and both values are kept for the app or user to resolve.",
        steps: [
          { from: "ue", to: "eu", label: "title = 'Plan A' [EU:1, US:0]", t: 0, say: "This time every version carries a version vector: one counter per leader.", set: { eu: "'Plan A' [1,0]" } },
          { from: "uu", to: "us", label: "title = 'Plan B' [EU:0, US:1]", t: 30, say: "The US edit is based on the original [0,0], not on the EU edit.", set: { us: "'Plan B' [0,1]" } },
          { from: "eu", to: "us", label: "replicate [1,0]", t: 90, kind: "async", say: "Neither vector is ≥ the other in every position: [1,0] vs [0,1]. These writes were concurrent: a real conflict." },
          { from: "us", to: "us", label: "keep both siblings", t: 91, say: "Instead of discarding one, the store keeps both versions.", set: { us: "conflict: A | B" } },
          { from: "us", to: "uu", label: "show: 'Plan A' or 'Plan B'?", t: 500, kind: "ok", say: "The application merges automatically if it can (a set union, a CRDT) or asks the user, as Google Drive does with conflicting offline edits." },
        ],
      },
      {
        key: "home", label: "Avoid: home region", end: "No conflict is possible because only one leader ever accepts writes for this document.",
        steps: [
          { from: "uu", to: "us", label: "title = 'Plan B'", t: 0, say: "The document's home region is Europe (where it was created)." },
          { from: "us", to: "eu", label: "forward write to home leader", t: 45, say: "The US region forwards the write to the EU leader instead of applying it locally. Slower for the US user (one transatlantic trip)…" },
          { from: "eu", to: "eu", label: "apply in order after 'Plan A'", t: 46, say: "…but the EU leader orders both edits, so the result is well-defined.", set: { eu: "'Plan B' (after 'Plan A')" } },
          { from: "eu", to: "us", label: "replicate", t: 100, kind: "async", say: "The US region receives the ordered result.", set: { us: "'Plan B'" } },
        ],
      },
    ],
  },

  "seq-linearizable": {
    title: "Is this read allowed?",
    q: "Alice's write has finished. Bob reads afterwards. Can Bob see the old value?",
    about: "Two clients and a database with a leader and an asynchronous follower. Under linearisability, once a write completes, every later read must see it.",
    actors: [{ id: "a", label: "Alice" }, { id: "l", label: "Leader" }, { id: "f", label: "Follower" }, { id: "b", label: "Bob" }],
    init: { l: "score = 1", f: "score = 1" },
    variants: [
      {
        key: "stale", label: "Read from a follower", end: "Not linearisable: a read that started after a completed write returned the older value.",
        steps: [
          { from: "a", to: "l", label: "SET score = 2", t: 0, say: "Alice updates the score.", set: { l: "score = 2" } },
          { from: "l", to: "a", label: "ok", t: 5, kind: "ok", say: "Her write has completed: she has been told it succeeded." },
          { from: "a", to: "b", label: "(phones Bob: 'check the score!')", t: 10, say: "Alice tells Bob through another channel. Bob's read starts strictly after Alice's write finished." },
          { from: "b", to: "f", label: "GET score", t: 20, say: "Bob's read is routed to the follower, which hasn't received the update yet." },
          { from: "f", to: "b", label: "1", t: 25, kind: "bad", say: "Bob sees the old score. With a single copy this would be impossible, so the system is not linearisable." },
          { from: "l", to: "f", label: "replicate score = 2", t: 60, kind: "async", say: "The update arrives at the follower a moment too late.", set: { f: "score = 2" } },
        ],
      },
      {
        key: "leader", label: "Read from the leader", end: "Linearisable for this read: the leader has every completed write. The cost is that all such reads go to one place.",
        steps: [
          { from: "a", to: "l", label: "SET score = 2", t: 0, say: "Alice updates the score.", set: { l: "score = 2" } },
          { from: "l", to: "a", label: "ok", t: 5, kind: "ok", say: "Completed." },
          { from: "b", to: "l", label: "GET score (strong read)", t: 20, say: "Bob's read goes to the leader (in consensus systems, the leader also confirms it still leads before answering)." },
          { from: "l", to: "b", label: "2", t: 25, kind: "ok", say: "Bob sees 2." },
        ],
      },
    ],
  },

  "seq-session": {
    title: "Anomalies a single user can see",
    q: "One user, three read replicas with different lag. What can go wrong on refresh, and how is it fixed?",
    about: "The leader takes writes; replicas lag by different amounts. Badges show what each replica has applied.",
    actors: [{ id: "u", label: "User" }, { id: "l", label: "Leader" }, { id: "r1", label: "Replica 1 (fresh)" }, { id: "r2", label: "Replica 2 (lagging)" }],
    init: { l: "bio v1", r1: "bio v1", r2: "bio v1" },
    variants: [
      {
        key: "ryw", label: "Read-your-writes broken", end: "The user's own change vanished: they will think the save failed and try again.",
        steps: [
          { from: "u", to: "l", label: "update bio → v2", t: 0, say: "The user saves a new bio.", set: { l: "bio v2" } },
          { from: "l", to: "r1", label: "replicate v2", t: 20, kind: "async", say: "Replica 1 gets it quickly.", set: { r1: "bio v2" } },
          { from: "u", to: "r2", label: "GET my profile", t: 100, say: "The page refreshes; the load balancer picks replica 2, which is seconds behind." },
          { from: "r2", to: "u", label: "bio v1", t: 105, kind: "bad", say: "The user sees their old bio." },
        ],
      },
      {
        key: "ryw-fix", label: "Fix: read position", end: "Only this user's read was constrained; everyone else still reads from any replica.",
        steps: [
          { from: "u", to: "l", label: "update bio → v2", t: 0, say: "The user saves a new bio.", set: { l: "bio v2 @ log 5120" } },
          { from: "l", to: "u", label: "ok, position 5120", t: 5, say: "The response includes the write's log position, stored in the user's session.", set: { u: "needs ≥ 5120" } },
          { from: "u", to: "r2", label: "GET my profile (needs ≥ 5120)", t: 100, say: "The read carries the position it requires." },
          { from: "r2", to: "u", label: "I'm at 5090: redirect", t: 102, say: "Replica 2 is behind, so it redirects (or waits briefly)." },
          { from: "u", to: "r1", label: "GET my profile (needs ≥ 5120)", t: 104, say: "Replica 1 has applied position 5120.", set: { r1: "bio v2 @ 5120" } },
          { from: "r1", to: "u", label: "bio v2", t: 108, kind: "ok", say: "The user sees their own write." },
        ],
      },
      {
        key: "mono", label: "Monotonic reads broken", end: "Data went backwards in time. Fix: keep each user on one replica (sticky routing) or track the newest version they've seen.",
        init: { l: "3 comments", r1: "3 comments", r2: "2 comments" },
        steps: [
          { from: "u", to: "r1", label: "GET comments", t: 0, say: "First load hits the fresh replica." },
          { from: "r1", to: "u", label: "3 comments", t: 5, kind: "ok", say: "The user sees three comments." },
          { from: "u", to: "r2", label: "GET comments (refresh)", t: 3000, say: "A refresh lands on the lagging replica." },
          { from: "r2", to: "u", label: "2 comments", t: 3005, kind: "bad", say: "A comment the user just read has disappeared." },
        ],
      },
    ],
  },
};
