import type { Scenario } from "../Seq";

/** Networking scenarios. Times are arrival times with a 100 ms round trip (50 ms each way). */
export const NET: Record<string, Scenario> = {
  "seq-connection": {
    title: "Setting up a secure connection",
    q: "How many round trips pass before the first byte of a web page arrives?",
    about: "The client is 50 ms from the server (100 ms round trip). Each run sends the same request; only the protocols differ. Watch the time column.",
    actors: [{ id: "c", label: "Client (browser)" }, { id: "s", label: "Server" }],
    predict: { q: "With TCP + TLS 1.2, when does the response start arriving (100 ms round trip)?", options: ["100 ms", "200 ms", "400 ms"], answer: 2, why: "1 round trip for TCP, 2 for TLS 1.2, 1 for the request itself: 4 × 100 ms." },
    variants: [
      {
        key: "tls12", label: "TCP + TLS 1.2", end: "Response after 400 ms: four round trips, three of them spent on setup.",
        steps: [
          { from: "c", to: "s", label: "SYN", t: 50, say: "TCP handshake, part 1: the client asks to open a connection and says where its byte numbering starts.", set: { c: "SYN sent" } },
          { from: "s", to: "c", label: "SYN-ACK", t: 100, say: "The server agrees and sends its own starting number. One round trip gone.", set: { s: "half open" } },
          { from: "c", to: "s", label: "ACK + ClientHello", t: 150, say: "The client completes TCP and immediately starts TLS: 'here are the encryption methods I support'.", set: { c: "TCP open" , s: "TCP open" } },
          { from: "s", to: "c", label: "ServerHello, Certificate", t: 200, say: "The server picks a method and sends its certificate, proving it owns the domain. Round trip two." },
          { from: "c", to: "s", label: "KeyExchange, Finished", t: 250, say: "The client checks the certificate, sends its key-exchange share and says it is ready to encrypt.", set: { c: "keys agreed" } },
          { from: "s", to: "c", label: "Finished", t: 300, say: "The server confirms. Three round trips have passed and not one byte of the page has been requested.", set: { s: "encrypted" , c: "encrypted" } },
          { from: "c", to: "s", label: "GET /index.html 🔒", t: 350, say: "Finally the encrypted request goes out." },
          { from: "s", to: "c", label: "200 OK + page 🔒", t: 400, kind: "ok", say: "The response arrives at 400 ms. On a 280 ms intercontinental round trip this would be over a second." },
        ],
      },
      {
        key: "tls13", label: "TCP + TLS 1.3", end: "Response after 300 ms: TLS 1.3 saves one round trip by sending key shares in its first message.",
        steps: [
          { from: "c", to: "s", label: "SYN", t: 50, say: "TCP handshake as before." },
          { from: "s", to: "c", label: "SYN-ACK", t: 100, say: "One round trip for TCP." },
          { from: "c", to: "s", label: "ACK + ClientHello (key share)", t: 150, say: "TLS 1.3's ClientHello already includes the client's half of the key exchange, guessing the method the server will pick.", set: { c: "TCP open", s: "TCP open" } },
          { from: "s", to: "c", label: "ServerHello, Cert, Finished", t: 200, say: "The server replies with its key share, certificate and Finished in one go: both sides can now compute the keys.", set: { s: "encrypted", c: "encrypted" } },
          { from: "c", to: "s", label: "Finished + GET 🔒", t: 250, say: "The client sends its Finished together with the encrypted request." },
          { from: "s", to: "c", label: "200 OK + page 🔒", t: 300, kind: "ok", say: "Response at 300 ms: three round trips instead of four." },
        ],
      },
      {
        key: "quic", label: "QUIC (HTTP/3)", end: "Response after 200 ms: transport and encryption handshakes are one.",
        steps: [
          { from: "c", to: "s", label: "Initial: ClientHello (key share)", t: 50, say: "QUIC runs on UDP and folds its own connection setup into the TLS 1.3 handshake: there is no separate TCP handshake." },
          { from: "s", to: "c", label: "ServerHello, Cert, Finished", t: 100, say: "After one round trip the connection is both open and encrypted.", set: { s: "encrypted", c: "encrypted" } },
          { from: "c", to: "s", label: "Finished + GET 🔒", t: 150, say: "The request goes out immediately." },
          { from: "s", to: "c", label: "200 OK + page 🔒", t: 200, kind: "ok", say: "Response at 200 ms: two round trips in total." },
        ],
      },
      {
        key: "zero", label: "QUIC resumed (0-RTT)", end: "Response after 100 ms. The catch: 0-RTT data can be replayed by an attacker, so only safe, repeatable requests may use it.",
        init: { c: "has ticket from last visit" },
        steps: [
          { from: "c", to: "s", label: "ClientHello + GET 🔒 (0-RTT)", t: 50, say: "The client talked to this server before and kept a resumption ticket, so it encrypts the request with keys derived from it and sends it in the very first packet." },
          { from: "s", to: "c", label: "ServerHello… + 200 OK 🔒", t: 100, kind: "ok", say: "The server answers straight away. One round trip, the physical minimum for a question and an answer." },
        ],
      },
      {
        key: "loss", label: "TCP: a lost packet", end: "One lost packet delayed the whole response by a round trip, and the data behind it sat waiting: head-of-line blocking.",
        init: { c: "encrypted", s: "encrypted" },
        steps: [
          { from: "c", to: "s", label: "GET /photo.jpg 🔒", t: 50, say: "An existing, encrypted TCP connection. The client asks for an image that needs three packets." },
          { from: "s", to: "c", label: "packet 1 (bytes 0–1,399)", t: 100, say: "Packet 1 arrives and is handed to the browser.", set: { c: "got 1" } },
          { from: "s", to: "c", label: "packet 2 (bytes 1,400–2,799)", t: 101, kind: "drop", say: "Packet 2 is dropped by a congested router somewhere. Nobody is told." },
          { from: "s", to: "c", label: "packet 3 (bytes 2,800–4,199)", t: 102, say: "Packet 3 arrives, but TCP must deliver bytes in order, so it is held in a buffer. The browser sees nothing new.", set: { c: "got 1 · holding 3" } },
          { from: "c", to: "s", label: "ACK 1,400 (duplicate)", t: 152, kind: "bad", say: "The client keeps acknowledging 'I have everything up to byte 1,400'. Repeated acknowledgements tell the server something is missing." },
          { from: "s", to: "s", label: "fast retransmit", t: 152, say: "After several duplicate acknowledgements the server resends packet 2 (if they never came, it would wait for a timeout of about a second)." },
          { from: "s", to: "c", label: "packet 2 (again)", t: 202, kind: "ok", say: "Packet 2 finally arrives, and packets 2 and 3 are released to the browser together, a full round trip late.", set: { c: "got 1, 2, 3" } },
        ],
      },
    ],
  },

  "seq-dns": {
    title: "Resolving a name",
    q: "What happens between typing maps.google.com and knowing which IP address to connect to?",
    about: "A cold lookup walks the hierarchy; a warm one is answered from a cache. Compare the times.",
    actors: [{ id: "b", label: "Browser / OS" }, { id: "r", label: "Resolver (ISP / 8.8.8.8)" }, { id: "root", label: "Root server" }, { id: "tld", label: ".com servers" }, { id: "auth", label: "google.com servers" }],
    variants: [
      {
        key: "cold", label: "Cold lookup", end: "About 100 ms, and every answer is now cached at the resolver for its TTL.",
        steps: [
          { from: "b", to: "b", label: "cache miss", t: 0, say: "The browser and the operating system check their caches: nothing for maps.google.com." },
          { from: "b", to: "r", label: "maps.google.com?", t: 5, say: "The OS asks its configured recursive resolver, which will do the legwork." },
          { from: "r", to: "root", label: "maps.google.com?", t: 15, say: "The resolver's cache is empty too, so it starts at the top: a root server (reached by anycast, so a nearby copy answers)." },
          { from: "root", to: "r", label: "ask .com: a.gtld-servers.net…", t: 25, say: "The root does not know the address. It refers the resolver to the servers for .com. TTL: 2 days.", set: { r: "knows .com" } },
          { from: "r", to: "tld", label: "maps.google.com?", t: 45, say: "The resolver asks a .com server." },
          { from: "tld", to: "r", label: "ask ns1.google.com…", t: 65, say: "The .com server refers it to Google's own name servers. Also cached for days.", set: { r: "knows google.com" } },
          { from: "r", to: "auth", label: "maps.google.com?", t: 85, say: "Now the authoritative servers for google.com." },
          { from: "auth", to: "r", label: "A 142.250.72.14, TTL 300", t: 100, kind: "ok", say: "The final answer, valid for 300 seconds. Google may pick an address near the resolver (GeoDNS).", set: { r: "cached 300 s" } },
          { from: "r", to: "b", label: "142.250.72.14", t: 105, kind: "ok", say: "The address reaches the browser, which caches it too and can start the TCP or QUIC handshake.", set: { b: "cached" } },
        ],
      },
      {
        key: "warm", label: "Warm resolver", end: "About 10 ms: one short round trip to the resolver.",
        init: { r: "cached 300 s" },
        steps: [
          { from: "b", to: "b", label: "cache miss", t: 0, say: "This device has not looked the name up recently." },
          { from: "b", to: "r", label: "maps.google.com?", t: 5, say: "It asks the resolver, which serves thousands of users and looked the name up moments ago for someone else." },
          { from: "r", to: "b", label: "142.250.72.14 (TTL 212 s left)", t: 10, kind: "ok", say: "Answered straight from the resolver's cache, with the remaining TTL. This is the common case, and why DNS scales.", set: { b: "cached" } },
        ],
      },
      {
        key: "stale", label: "After a migration", end: "Until the cached answer expires, users keep going to the old address. Lower TTLs before migrating and keep old servers working.",
        init: { r: "cached: OLD ip, TTL 1 day" },
        steps: [
          { from: "auth", to: "auth", label: "record changed to NEW ip", t: 0, say: "You moved the service and updated the record on your authoritative servers." },
          { from: "b", to: "r", label: "maps.google.com?", t: 5, say: "A user's device asks its resolver." },
          { from: "r", to: "b", label: "OLD ip (cached, 20 h left)", t: 10, kind: "bad", say: "The resolver still holds the old answer with a one-day TTL and has no reason to ask again. The user is sent to the old servers." },
          { from: "b", to: "b", label: "connects to OLD servers", t: 12, kind: "bad", say: "If the old servers are already switched off, this user is down until the cache expires: up to a day." },
        ],
      },
    ],
  },
};
