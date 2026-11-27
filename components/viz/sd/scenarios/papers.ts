import type { Scenario } from "../Seq";

/** Google-papers scenarios: GFS read/append/failure, ZooKeeper-style leader election, Dynamo quorums and hinted handoff. */
export const PAPERS: Record<string, Scenario> = {
  "seq-gfs": {
    title: "Inside GFS: metadata from the master, bytes from chunkservers",
    q: "A MapReduce worker reads a 10 GB file and another appends log records. How much traffic goes through the single master?",
    about: "One master with all metadata in memory; chunkservers storing 64 MB chunks, three replicas each.",
    actors: [{ id: "c", label: "Client" }, { id: "m", label: "Master", sub: "metadata only" }, { id: "p", label: "Chunkserver A", sub: "primary" }, { id: "s1", label: "Chunkserver B" }, { id: "s2", label: "Chunkserver C" }],
    variants: [
      {
        key: "read", label: "Read", end: "The master answered one small question; the 64 MB came straight from a chunkserver. Clients cache locations, so the next reads skip the master entirely.",
        steps: [
          { from: "c", to: "c", label: "byte offset 200 MB → chunk index 3", t: 0, say: "The client turns the file offset into a chunk index: 200 MB ÷ 64 MB = chunk 3." },
          { from: "c", to: "m", label: "(/logs/web.0, chunk 3)?", t: 1, say: "It asks the master for that chunk." },
          { from: "m", to: "c", label: "handle 0x2f1, replicas A, B, C", t: 2, kind: "res", say: "The master replies with the chunk's ID and replica locations from memory. Tiny message." },
          { from: "c", to: "s1", label: "read 0x2f1, bytes 8–72 MB", t: 3, say: "The client reads from the nearest replica (B), directly." },
          { from: "s1", to: "c", label: "data + checksums verified", t: 700, kind: "ok", say: "B verifies 64 KB block checksums as it sends: corrupt blocks would be reported and served from another replica." },
        ],
      },
      {
        key: "append", label: "Record append", end: "Data travelled down a pipeline; ordering came from the lease-holding primary. If B had failed, the client would retry, and A and C might hold the record twice: at-least-once.",
        steps: [
          { from: "c", to: "m", label: "who holds the lease for the last chunk?", t: 0, say: "The client asks which replica is primary for the file's last chunk." },
          { from: "m", to: "c", label: "primary A (lease 60 s), secondaries B, C", t: 1, kind: "res", say: "The master granted A a 60-second lease. It won't be asked again for this chunk until the lease changes." },
          { from: "c", to: "s1", label: "push record (data flow)", t: 2, say: "The client pushes the data to the nearest replica, B…" },
          { from: "s1", to: "p", label: "forward while receiving", t: 3, say: "…which forwards it to A as it arrives, …" },
          { from: "p", to: "s2", label: "forward while receiving", t: 4, say: "…which forwards to C. Each link carries the data once, at full speed." },
          { from: "c", to: "p", label: "append (control flow)", t: 6, say: "With data buffered everywhere, the client asks the primary to commit." },
          { from: "p", to: "p", label: "offset 61.2 MB, serial #9041", t: 7, say: "The primary picks the offset and a serial number: this is what orders concurrent appends from many clients." },
          { from: "p", to: "s1", label: "apply #9041 at 61.2 MB", t: 8, say: "It tells the secondaries to apply in the same order." },
          { from: "p", to: "s2", label: "apply #9041 at 61.2 MB", t: 8, say: "Both secondaries apply." },
          { from: "p", to: "c", label: "ok, offset 61.2 MB", t: 10, kind: "ok", say: "Success, and the client learns where its record landed." },
        ],
      },
      {
        key: "fail", label: "Chunkserver dies", end: "No human involved: heartbeats detected the loss, the most endangered chunks were re-copied first, and version numbers kept stale replicas out.",
        steps: [
          { from: "s2", to: "m", label: "heartbeat", t: 0, say: "Chunkservers report to the master regularly, listing the chunks they hold." },
          { from: "s2", to: "s2", label: "disk controller fails", t: 5000, kind: "bad", say: "Chunkserver C dies.", set: { s2: "dead" } },
          { from: "m", to: "m", label: "C missed heartbeats → 12,000 chunks under-replicated", t: 65000, say: "The master notices missing heartbeats and finds every chunk that had a replica on C." },
          { from: "m", to: "m", label: "prioritise chunks with 1 replica left", t: 65010, say: "Chunks that lost two replicas (only one left) go first; then ones blocking clients." },
          { from: "m", to: "p", label: "copy chunk 0x2f1 to D", t: 65020, say: "The master tells a healthy replica to clone the chunk to a new chunkserver, limiting how many clones run at once." },
          { from: "m", to: "m", label: "chunk 0x2f1: A, B, D (version 7)", t: 66000, kind: "ok", say: "Three replicas again. If C returns with version 6, it's stale and garbage-collected.", set: { m: "re-replicated" } },
        ],
      },
    ],
  },

  "seq-chubby": {
    title: "Leader election with ephemeral sequential nodes",
    q: "Three schedulers want to be leader. The leader crashes. Who takes over, and how many get woken up?",
    about: "A ZooKeeper (or Chubby-like) ensemble. Each candidate creates an ephemeral sequential node under /election and watches only its predecessor.",
    actors: [{ id: "w1", label: "Scheduler 1" }, { id: "w2", label: "Scheduler 2" }, { id: "w3", label: "Scheduler 3" }, { id: "zk", label: "ZooKeeper", sub: "5-node ensemble" }, { id: "store", label: "Job store" }],
    variants: [
      {
        key: "elect", label: "Elect and fail over", end: "One crash woke exactly one waiter. The new leader's higher token stops anything the old one might still send.",
        steps: [
          { from: "w1", to: "zk", label: "create /election/n_ (ephemeral, sequential)", t: 0, say: "Each candidate creates an ephemeral sequential node.", set: { zk: "n_17 (w1)" } },
          { from: "w2", to: "zk", label: "create → n_18", t: 2, say: "Scheduler 2 gets the next number.", set: { zk: "n_17, n_18" } },
          { from: "w3", to: "zk", label: "create → n_19", t: 3, say: "Scheduler 3 gets n_19.", set: { zk: "n_17, n_18, n_19" } },
          { from: "w1", to: "w1", label: "lowest = me → leader (token 17)", t: 5, kind: "ok", say: "Scheduler 1 lists the children: its node is lowest, so it leads, using 17 as its fencing token.", set: { w1: "leader", w2: "watching n_17", w3: "watching n_18" } },
          { from: "w1", to: "store", label: "assign job 51 (token 17)", t: 10, say: "It assigns jobs, stamping each with its token." },
          { from: "w1", to: "w1", label: "crash", t: 3000, kind: "bad", say: "Scheduler 1 crashes. Its KeepAlives stop.", set: { w1: "dead" } },
          { from: "zk", to: "zk", label: "session expired → delete n_17", t: 13000, say: "After the session timeout, ZooKeeper deletes the ephemeral node automatically.", set: { zk: "n_18, n_19" } },
          { from: "zk", to: "w2", label: "watch fired: n_17 deleted", t: 13001, say: "Only scheduler 2 was watching n_17, so only it is notified. Scheduler 3 sleeps on: no herd." },
          { from: "w2", to: "w2", label: "lowest = me → leader (token 18)", t: 13003, kind: "ok", say: "Scheduler 2 confirms it's now lowest and takes over.", set: { w2: "leader" } },
          { from: "w2", to: "store", label: "assign job 52 (token 18)", t: 13010, kind: "ok", say: "The job store records 18 as the highest token seen." },
        ],
      },
      {
        key: "pause", label: "Paused leader wakes up", end: "The session lease told the cluster the old leader was gone; the fencing token told the job store. Both are needed.",
        steps: [
          { from: "w1", to: "w1", label: "leader with token 17", t: 0, say: "Scheduler 1 is leader.", set: { w1: "leader (17)", w2: "watching n_17" } },
          { from: "w1", to: "w1", label: "40 s garbage-collection pause", t: 100, kind: "bad", say: "It freezes for 40 seconds: no KeepAlives, but it doesn't know it." },
          { from: "zk", to: "w2", label: "n_17 expired → you're next", t: 12000, say: "Its session expires; scheduler 2 is notified and becomes leader.", set: { w2: "leader (18)" } },
          { from: "w2", to: "store", label: "assign job 60 (token 18)", t: 12100, kind: "ok", say: "The new leader starts assigning work.", set: { store: "max token 18" } },
          { from: "w1", to: "store", label: "assign job 60 (token 17)", t: 40100, kind: "bad", say: "Scheduler 1 wakes up still believing it's leader and sends a stale assignment." },
          { from: "store", to: "w1", label: "rejected: 17 < 18", t: 40101, kind: "ok", say: "The job store rejects the lower token. Scheduler 1 checks its session, finds it expired, and steps down.", set: { w1: "stepped down" } },
        ],
      },
    ],
  },

  "seq-dynamo": {
    title: "Dynamo: quorums, hinted handoff and siblings",
    q: "One replica of a cart is down during a write. Does 'add to cart' fail?",
    about: "N = 3, W = 2, R = 2. The key's preference list is nodes A, B, C; D is the next node on the ring.",
    actors: [{ id: "u", label: "Client" }, { id: "a", label: "Node A", sub: "coordinator" }, { id: "b", label: "Node B" }, { id: "c", label: "Node C" }, { id: "d", label: "Node D", sub: "next on ring" }],
    variants: [
      {
        key: "normal", label: "Normal write", end: "Two acknowledgements were enough; C caught up a moment later. A read of any two of A, B, C overlaps the write.",
        steps: [
          { from: "u", to: "a", label: "put(cart:42, +book)", t: 0, say: "The write goes to the first node of the key's preference list, which coordinates." },
          { from: "a", to: "a", label: "version [A:1]", t: 1, say: "A increments its entry in the vector clock and stores the version locally (that's one ack).", set: { a: "[A:1]" } },
          { from: "a", to: "b", label: "replicate [A:1]", t: 2, say: "It sends the new version to B and C." },
          { from: "a", to: "c", label: "replicate [A:1]", t: 2, say: "In parallel." },
          { from: "b", to: "a", label: "ack", t: 6, kind: "res", say: "B acknowledges: two of three, W = 2 reached.", set: { b: "[A:1]" } },
          { from: "a", to: "u", label: "ok", t: 7, kind: "ok", say: "The client gets success without waiting for C." },
          { from: "c", to: "a", label: "ack (late)", t: 15, kind: "res", say: "C acknowledges later.", set: { c: "[A:1]" } },
        ],
      },
      {
        key: "handoff", label: "Node down: hinted handoff", end: "The write succeeded despite a failed replica. Until handoff, a read of B and C might miss it: sloppy quorums trade consistency for availability.",
        steps: [
          { from: "c", to: "c", label: "down", t: 0, kind: "bad", say: "Node C is unreachable.", set: { c: "down" } },
          { from: "u", to: "a", label: "put(cart:42, +lamp)", t: 10, say: "A new write arrives." },
          { from: "a", to: "b", label: "replicate", t: 12, say: "A writes locally and sends to B." },
          { from: "a", to: "c", label: "replicate", t: 12, kind: "drop", say: "The message to C fails." },
          { from: "a", to: "d", label: "replicate (hint: for C)", t: 14, say: "Instead of failing, A sends C's copy to the next node on the ring, D, with a hint naming C." , set: { d: "holds hint for C" } },
          { from: "b", to: "a", label: "ack", t: 18, kind: "res", say: "B acknowledges." },
          { from: "a", to: "u", label: "ok", t: 19, kind: "ok", say: "W = 2 (A and B): success. The cart stays writable." },
          { from: "c", to: "c", label: "back online", t: 60000, kind: "ok", say: "C recovers.", set: { c: "up (stale)" } },
          { from: "d", to: "c", label: "hinted handoff: +lamp", t: 60100, kind: "ok", say: "D delivers the hinted write to C and deletes its copy.", set: { c: "up to date", d: "-" } },
        ],
      },
      {
        key: "conflict", label: "Concurrent writes: siblings", end: "Nothing was silently lost: the client saw both versions and merged them. A union can also bring back deleted items, which is why later designs use OR-sets.",
        steps: [
          { from: "u", to: "a", label: "put(+book) via A", t: 0, say: "During a network split, one client write is coordinated by A…" , set: { a: "[A:2]" } },
          { from: "u", to: "b", label: "put(+pen) via B", t: 5, say: "…and another, on an older version, by B. Neither saw the other.", set: { b: "[A:1, B:1]" } },
          { from: "u", to: "a", label: "get(cart:42)", t: 1000, say: "After the split heals, a read collects versions from R = 2 nodes." },
          { from: "a", to: "u", label: "siblings: [A:2] {book}, [A:1,B:1] {pen}", t: 1010, kind: "bad", say: "Neither vector clock descends from the other: concurrent. Both versions are returned." },
          { from: "u", to: "u", label: "merge: {book, pen}", t: 1011, say: "The application merges (the cart takes the union)." },
          { from: "u", to: "a", label: "put(merged, context [A:2, B:1])", t: 1020, kind: "ok", say: "Writing back with a clock that dominates both resolves the conflict.", set: { a: "[A:3, B:1]" } },
        ],
      },
    ],
  },
};
