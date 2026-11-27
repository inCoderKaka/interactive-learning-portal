import type { Scenario } from "../Seq";

/** Security scenarios: OAuth 2.0 authorisation code flow with and without PKCE, Zanzibar's new-enemy problem, envelope encryption. */
export const SECURITY: Record<string, Scenario> = {
  "seq-oauth": {
    title: "Sign in with Google: the authorisation code flow",
    q: "A malicious app on the same phone intercepts the one-time code. Can it get your tokens?",
    about: "A photo-printing app wants read access to your Google Photos. It never sees your password: Google's login page does the checking and hands the app a short-lived code, which the app trades for tokens.",
    actors: [{ id: "app", label: "Printing app" }, { id: "you", label: "You (browser)" }, { id: "as", label: "Google sign-in", sub: "authorisation server" }, { id: "api", label: "Photos API" }, { id: "evil", label: "Malicious app" }],
    predict: { q: "With PKCE, the attacker has the stolen code. What stops it?", options: ["The code is encrypted", "It doesn't know the secret 'verifier' that only the real app generated", "Google checks the attacker's IP"], answer: 1, why: "The authorisation server stored the hash of a random value the real app made. Exchanging the code requires the original value, which never left the real app." },
    variants: [
      {
        key: "pkce", label: "Normal flow with PKCE", end: "The app got a short-lived access token (and, with OpenID Connect, an ID token saying who you are) without ever seeing your password.",
        steps: [
          { from: "app", to: "app", label: "make verifier; challenge = hash", t: 0, say: "Before anything else, the app invents a random secret (the code verifier) and computes its hash (the code challenge). It keeps the verifier to itself.", set: { app: "holds verifier" } },
          { from: "app", to: "you", label: "redirect → accounts.google.com?scope=photos.read&challenge=…", t: 10, say: "The app sends your browser to Google's sign-in page, saying what it wants (scope) and including only the hash." },
          { from: "you", to: "as", label: "log in + consent 'allow read access to Photos'", t: 4000, say: "You sign in on Google's own page and approve. The printing app never sees your password." },
          { from: "as", to: "as", label: "code X ↔ challenge", t: 4010, say: "Google creates a one-time authorisation code and remembers which challenge it belongs to.", set: { as: "code X issued" } },
          { from: "as", to: "app", label: "redirect back: myapp://callback?code=X", t: 4050, say: "Google sends the browser back to the app with the code in the URL. This is the exposed moment: URLs can be seen by other apps or logs." },
          { from: "app", to: "as", label: "POST /token code=X + verifier", t: 4100, say: "The app exchanges the code, proving it is the same app by sending the original verifier." },
          { from: "as", to: "as", label: "hash(verifier) = challenge ✓", t: 4110, kind: "ok", say: "Google hashes the verifier and compares it with the stored challenge. They match.", set: { as: "code X used" } },
          { from: "as", to: "app", label: "access token (1 h) + refresh token (+ ID token)", t: 4120, kind: "ok", say: "The app receives a short-lived access token and a refresh token to get new ones later.", set: { app: "has tokens" } },
          { from: "app", to: "api", label: "GET /photos · Authorization: Bearer …", t: 4200, say: "The app calls the Photos API with the access token. The API checks the token and its scope." },
          { from: "api", to: "app", label: "200 photos", t: 4260, kind: "ok", say: "Read access only, as you approved." },
        ],
      },
      {
        key: "steal-no-pkce", label: "Stolen code, no PKCE", end: "Without PKCE, the code alone is enough. On a phone, a public app can't keep a client secret, so the attacker got full access. This is why PKCE is recommended for every client.",
        steps: [
          { from: "app", to: "you", label: "redirect → accounts.google.com?scope=photos.read", t: 0, say: "Same start, but no challenge is sent." },
          { from: "you", to: "as", label: "log in + consent", t: 4000, say: "You sign in and approve as normal." },
          { from: "as", to: "evil", label: "myapp://callback?code=X (intercepted)", t: 4050, kind: "bad", say: "The malicious app registered the same callback scheme and receives the redirect first.", set: { evil: "has code X" } },
          { from: "evil", to: "as", label: "POST /token code=X", t: 4100, kind: "bad", say: "It exchanges the code. Google has nothing else to check." },
          { from: "as", to: "evil", label: "access token + refresh token", t: 4120, kind: "bad", say: "The attacker now holds your tokens.", set: { evil: "has YOUR tokens" } },
          { from: "evil", to: "api", label: "GET /photos", t: 4200, kind: "bad", say: "And reads your photos." },
        ],
      },
      {
        key: "steal-pkce", label: "Stolen code, with PKCE", end: "The stolen code is useless without the verifier, and it is single-use and expires in minutes. The real app still finishes normally.",
        steps: [
          { from: "app", to: "app", label: "make verifier + challenge", t: 0, say: "The real app creates its verifier and sends only the hash.", set: { app: "holds verifier" } },
          { from: "app", to: "you", label: "redirect with challenge", t: 10, say: "The browser goes to Google with the challenge." },
          { from: "you", to: "as", label: "log in + consent", t: 4000, say: "You approve." },
          { from: "as", to: "evil", label: "callback?code=X (intercepted)", t: 4050, kind: "bad", say: "The malicious app intercepts the code again.", set: { evil: "has code X" } },
          { from: "evil", to: "as", label: "POST /token code=X + verifier=???", t: 4100, kind: "bad", say: "It must send a verifier, but it never saw one: only the hash travelled through the browser, and a hash can't be reversed." },
          { from: "as", to: "evil", label: "400 invalid_grant", t: 4110, kind: "ok", say: "SHA-256 of whatever it guessed doesn't match the stored challenge. Rejected.", set: { evil: "nothing" } },
        ],
      },
    ],
  },

  "seq-new-enemy": {
    title: "Zanzibar's 'new enemy' problem",
    q: "Alice removes Bob from a doc, then adds her secret plans. Could Bob still see the plans?",
    about: "Permission checks are served by replicas that may be a few seconds behind. The danger is the order: the removal and the new content must be seen together.",
    actors: [{ id: "alice", label: "Alice" }, { id: "docs", label: "Docs service" }, { id: "z", label: "Zanzibar (latest)" }, { id: "rep", label: "Zanzibar replica", sub: "a few seconds behind" }, { id: "bob", label: "Bob" }],
    init: { rep: "Bob = viewer (old)" },
    variants: [
      {
        key: "stale", label: "No consistency token", end: "Bob saw content added after he was removed, because the check used a snapshot from before his removal. Eventual consistency is not enough for permissions.",
        steps: [
          { from: "alice", to: "docs", label: "remove Bob from doc:plan", t: 0, say: "Alice removes Bob's access." },
          { from: "docs", to: "z", label: "write: delete doc:plan#viewer@bob", t: 10, say: "The removal is committed at time T1.", set: { z: "Bob removed @T1" } },
          { from: "alice", to: "docs", label: "add 'secret plans' paragraph", t: 2000, say: "Two seconds later she adds sensitive content." },
          { from: "bob", to: "docs", label: "open doc:plan", t: 2500, say: "Bob opens the doc." },
          { from: "docs", to: "rep", label: "Check(bob, viewer, doc:plan)", t: 2510, say: "The check goes to a nearby replica, which hasn't applied T1 yet." },
          { from: "rep", to: "docs", label: "allowed (snapshot before T1)", t: 2520, kind: "bad", say: "The replica still thinks Bob is a viewer." },
          { from: "docs", to: "bob", label: "doc with secret plans", kind: "bad", t: 2530, say: "Bob reads content that was added after his removal." },
        ],
      },
      {
        key: "zookie", label: "With a zookie", end: "The content version carries a zookie, so any check for it uses a snapshot at least as new as the removal. Checks stay fast: most can still use a slightly old snapshot, just never older than the content.",
        steps: [
          { from: "alice", to: "docs", label: "remove Bob from doc:plan", t: 0, say: "Same removal." },
          { from: "docs", to: "z", label: "write: delete doc:plan#viewer@bob", t: 10, say: "Committed at T1.", set: { z: "Bob removed @T1" } },
          { from: "alice", to: "docs", label: "add 'secret plans'", t: 2000, say: "Before saving new content, the Docs service asks Zanzibar for a content-change check." },
          { from: "z", to: "docs", label: "zookie = snapshot ≥ T2", t: 2010, kind: "ok", say: "Zanzibar returns a zookie: an opaque token meaning 'at least as fresh as now'. Docs stores it with this version of the content.", set: { docs: "v7 + zookie(T2)" } },
          { from: "bob", to: "docs", label: "open doc:plan", t: 2500, say: "Bob opens the doc." },
          { from: "docs", to: "rep", label: "Check(bob, viewer) at ≥ zookie", t: 2510, say: "The check includes the zookie. The replica is behind T2, so it can't answer from its snapshot." },
          { from: "rep", to: "z", label: "catch up / forward", t: 2515, say: "It waits for replication or forwards the check to a fresh enough copy." },
          { from: "z", to: "docs", label: "denied (snapshot T2 includes T1)", t: 2530, kind: "ok", say: "At a snapshot that includes the removal, Bob is not a viewer." },
          { from: "docs", to: "bob", label: "403", kind: "ok", t: 2540, say: "Bob can't see the secret plans." },
        ],
      },
    ],
  },

  "seq-envelope": {
    title: "Envelope encryption with a key management service",
    q: "How do you encrypt petabytes without ever letting the master key leave its vault?",
    about: "The KMS holds the master key (key-encryption key, KEK) inside hardware it never leaves. Data is encrypted locally with a fresh data key (DEK), and only the small DEK goes to the KMS.",
    actors: [{ id: "svc", label: "Storage service" }, { id: "kms", label: "KMS", sub: "KEK inside HSM" }, { id: "disk", label: "Disk / object store" }, { id: "audit", label: "Audit log" }],
    init: { kms: "KEK v1" },
    variants: [
      {
        key: "write", label: "Write", end: "On disk: ciphertext plus the wrapped DEK. Stealing the disk gives an attacker neither the data nor a usable key.",
        steps: [
          { from: "svc", to: "svc", label: "new random DEK", t: 0, say: "A new random data key, made locally for this file (or chunk).", set: { svc: "plain DEK in memory" } },
          { from: "svc", to: "svc", label: "AES-GCM encrypt 5 GB locally", t: 1, say: "The bulk encryption happens locally and fast. No large data travels to the KMS." },
          { from: "svc", to: "kms", label: "Encrypt(DEK) with key 'photos-kek'", t: 40, say: "Only the 32-byte DEK goes to the KMS." },
          { from: "kms", to: "audit", label: "svc-photos used photos-kek (encrypt)", t: 41, kind: "async", say: "Every use of the master key is checked against permissions and logged." },
          { from: "kms", to: "svc", label: "wrapped DEK (encrypted with KEK v1)", t: 45, say: "The KMS returns the DEK encrypted under the KEK. The KEK itself never leaves." },
          { from: "svc", to: "disk", label: "store ciphertext + wrapped DEK", t: 50, kind: "ok", say: "The wrapped key is stored right next to the data.", set: { disk: "ciphertext + wrapped DEK" } },
          { from: "svc", to: "svc", label: "wipe plain DEK", t: 51, say: "The plain DEK is wiped from memory.", set: { svc: "no keys held" } },
        ],
      },
      {
        key: "read", label: "Read", end: "Each read costs one small KMS call (often cached briefly), and access is enforced twice: by storage permissions and by permission to use the key.",
        steps: [
          { from: "svc", to: "disk", label: "read ciphertext + wrapped DEK", t: 0, say: "Fetch both from storage." },
          { from: "svc", to: "kms", label: "Decrypt(wrapped DEK)", t: 5, say: "Ask the KMS to unwrap the DEK." },
          { from: "kms", to: "kms", label: "may this caller use the key? ✓", t: 6, kind: "ok", say: "The KMS checks that this caller may use this key." },
          { from: "kms", to: "audit", label: "decrypt logged", t: 7, kind: "async", say: "Logged for audit." },
          { from: "kms", to: "svc", label: "plain DEK", t: 10, say: "The DEK comes back over an encrypted channel.", set: { svc: "plain DEK in memory" } },
          { from: "svc", to: "svc", label: "decrypt locally", t: 12, kind: "ok", say: "The service decrypts locally and serves the file, then forgets the DEK.", set: { svc: "no keys held" } },
        ],
      },
      {
        key: "rotate", label: "Rotate and crypto-shred", end: "Rotation re-wraps tiny keys instead of re-encrypting petabytes. Destroying a key makes all data under it unreadable everywhere, including in backups.",
        steps: [
          { from: "kms", to: "kms", label: "add KEK v2 (keep v1)", t: 0, say: "Rotation adds a new key version. New writes use v2; old wrapped DEKs still unwrap with v1.", set: { kms: "KEK v1 + v2" } },
          { from: "svc", to: "kms", label: "re-wrap DEKs: v1 → v2 (32 bytes each)", t: 100, say: "Optionally, a background job re-wraps each DEK under v2. Only keys move, never the data." },
          { from: "kms", to: "disk", label: "wrapped DEKs updated", t: 200, kind: "ok", say: "The big ciphertexts are untouched.", set: { disk: "DEKs wrapped by v2" } },
          { from: "kms", to: "kms", label: "destroy KEK v1", t: 300, say: "Once nothing needs v1, it can be destroyed.", set: { kms: "KEK v2" } },
          { from: "kms", to: "kms", label: "destroy tenant's KEK", t: 400, kind: "bad", say: "For a customer who leaves (or customer-managed keys that get revoked), destroying their KEK means their DEKs can never be unwrapped." },
          { from: "disk", to: "disk", label: "data + backups unreadable", t: 401, kind: "ok", say: "This is crypto-shredding: deletion by destroying the key, even for copies you can't find.", set: { disk: "crypto-shredded" } },
        ],
      },
    ],
  },
};
