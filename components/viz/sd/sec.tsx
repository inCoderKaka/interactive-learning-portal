"use client";
/**
 * Security visuals: a real JWT tamper lab (HMAC-SHA-256 via Web Crypto), a Zanzibar permission check that walks
 * relation tuples, a noisy-neighbour job queue (FIFO vs fair queueing vs per-tenant caps) and a layered DDoS funnel.
 */
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Btn, Chips, Frame, Predict, SimControls, Stat, useSim } from "./kit";
import { cn } from "../../ui";

// ───────── JWT tamper lab ─────────
const enc = new TextEncoder();
const b64u = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const b64s = (s: string) => b64u(enc.encode(s));
async function hs256(key: string, msg: string) {
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64u(new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(msg))));
}
const SERVER_SECRET = "k3y-only-the-server-knows-7f2a91";
const ISSUED = { sub: "user42", role: "viewer", exp: 1030 };
const hhmm = (v: number) => `${Math.floor(v / 100)}:${String(v % 100).padStart(2, "0")}`;
type SigMode = "keep" | "guess" | "none";

export function JwtLab() {
  const [role, setRole] = useState("viewer");
  const [sub, setSub] = useState("user42");
  const [sig, setSig] = useState<SigMode>("keep");
  const [strict, setStrict] = useState(true);
  const [now, setNow] = useState(1020);
  const [out, setOut] = useState<{ token: string[]; expected: string; issuedSig: string } | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      const hIssued = b64s(JSON.stringify({ alg: "HS256", typ: "JWT" }));
      const pIssued = b64s(JSON.stringify(ISSUED));
      const issuedSig = await hs256(SERVER_SECRET, `${hIssued}.${pIssued}`);
      const header = b64s(JSON.stringify({ alg: sig === "none" ? "none" : "HS256", typ: "JWT" }));
      const payload = b64s(JSON.stringify({ sub, role, exp: ISSUED.exp }));
      const signature = sig === "keep" ? issuedSig : sig === "guess" ? await hs256("password123", `${header}.${payload}`) : "";
      const expected = await hs256(SERVER_SECRET, `${header}.${payload}`);
      if (live) setOut({ token: [header, payload, signature], expected, issuedSig });
    })();
    return () => { live = false; };
  }, [role, sub, sig]);

  const edited = role !== ISSUED.role || sub !== ISSUED.sub;
  let verdict: { ok: boolean; why: string } = { ok: false, why: "…" };
  const checks: [string, boolean | null | "warn"][] = [];
  if (out) {
    const algNone = sig === "none";
    const algOk = !algNone || !strict;
    checks.push([strict ? "Algorithm is the one the server expects (HS256), not whatever the header says" : "Algorithm taken from the token's own header", algNone && !strict ? "warn" : algOk]);
    const sigOk = algNone ? !strict : out.token[2] === out.expected;
    checks.push([algNone && !strict ? "Signature skipped: the header said alg = none" : "Recompute HMAC(header.payload, server secret) and compare", algNone && !strict ? "warn" : algOk ? sigOk : null]);
    const expOk = now < ISSUED.exp;
    checks.push([`Not expired (exp ${hhmm(ISSUED.exp)}, now ${hhmm(now)})`, algOk && sigOk ? expOk : null]);
    if (!algOk) verdict = { ok: false, why: "401: the token asks for alg = none, and this server only accepts HS256." };
    else if (!sigOk) verdict = { ok: false, why: "401: the signature doesn't match. Change one character of the payload and the correct signature changes completely; without the secret, nobody can make a matching one." };
    else if (!expOk) verdict = { ok: false, why: "401: the token is genuine but expired. This is why access tokens live minutes: there's no way to cancel one early without a lookup." };
    else verdict = { ok: true, why: algNone ? "200, and it's a disaster: a sloppy verifier trusted the token's own claim that it needs no signature. Anyone can now be admin. Pin the algorithm." : edited ? "200" : `200: accepted as ${sub} (${role}), with no database lookup.` };
  }
  const colors = ["#ff8fb3", "#b794f4", "#4fd1c5"];
  return (
    <Frame title="Tamper with a JWT" q="You hold a token that says role = viewer. Can you change it to admin?"
      about="This is a real token, signed with HMAC-SHA-256 by a server whose secret you don't have (big systems use a private/public key pair instead; the idea is the same). Edit the claims, choose how to sign, and watch the server's checks."
      foot="Anyone can decode a JWT: the middle part is just base64. Its safety comes only from the signature, so never put secrets in it, always verify the signature with a pinned algorithm, and keep lifetimes short.">
      <div className="space-y-3">
        <Predict q="You change role to admin and keep the original signature. What does the server say?" options={["200, you're admin", "401, signature mismatch", "It can't tell"]} answer={1} why="The signature was computed over the original payload; the server recomputes it over the edited one and they differ." />
        <div className="grid gap-2 sm:grid-cols-2">
          <Chips label="role" value={role} options={[["viewer", "viewer"], ["admin", "admin"]]} onChange={setRole} />
          <Chips label="sub" value={sub} options={[["user42", "user42"], ["user7", "user7 (someone else)"]]} onChange={setSub} />
          <Chips label="Signature" value={sig} options={[["keep", "Keep original"], ["guess", "Re-sign with a guessed key"], ["none", "alg: none, no signature"]]} onChange={setSig} />
          <Chips label="Server" value={strict ? "strict" : "lax"} options={[["strict", "Pins HS256"], ["lax", "Trusts header alg"]]} onChange={(v) => setStrict(v === "strict")} />
        </div>
        <label className="block max-w-xs text-[12.5px] text-mute">Server clock: <span className="num font-semibold text-text">{hhmm(now)}</span>
          <input type="range" min={1000} max={1045} value={now} onChange={(e) => { const v = +e.target.value; setNow(v % 100 >= 60 ? v - (v % 100) + 59 : v); }} className="w-full" />
        </label>
        {out && (
          <div className="rounded-xl border border-line bg-bg p-3">
            <div className="mb-1 text-[10.5px] uppercase tracking-wider text-faint">The token (header . payload . signature)</div>
            <div className="break-all font-mono text-[11.5px] leading-relaxed">
              {out.token.map((p, i) => <span key={i}><span style={{ color: colors[i] }}>{p || "(empty)"}</span>{i < 2 && <span className="text-faint">.</span>}</span>)}
            </div>
            <div className="mt-2 grid gap-1.5 text-[12px] sm:grid-cols-2">
              <div className="rounded-lg border border-line px-2 py-1.5"><span className="text-faint">Anyone can decode the payload: </span><span className="font-mono">{JSON.stringify({ sub, role, exp: hhmm(ISSUED.exp) })}</span></div>
              <div className="rounded-lg border border-line px-2 py-1.5"><span className="text-faint">Signature the server expects: </span><span className="font-mono" style={{ color: colors[2] }}>{out.expected.slice(0, 22)}…</span></div>
            </div>
          </div>
        )}
        <div className="space-y-1">
          {checks.map(([label, ok], i) => (
            <div key={i} className="flex items-start gap-2 text-[13px]">
              <span className={cn("mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold", ok === null ? "bg-line text-faint" : ok === "warn" ? "bg-warn/20 text-warn" : ok ? "bg-ok/20 text-ok" : "bg-bad/20 text-bad")}>{ok === null ? "–" : ok === "warn" ? "!" : ok ? "✓" : "✕"}</span>
              <span className={ok === null ? "text-faint" : ""}>{label}</span>
            </div>
          ))}
        </div>
        <div className={cn("rounded-xl border px-3 py-2 text-[13.5px]", verdict.ok && sig === "none" ? "border-bad/50 bg-bad/10" : verdict.ok ? "border-ok/40 bg-ok/5" : "border-bad/40 bg-bad/5")}>{verdict.why}</div>
      </div>
    </Frame>
  );
}

// ───────── Zanzibar check ─────────
type Tuple = { id: string; obj: string; rel: string; user: string };
const TUPLES: Tuple[] = [
  { id: "t1", obj: "doc:plan", rel: "owner", user: "user:alice" },
  { id: "t2", obj: "doc:plan", rel: "parent", user: "folder:marketing" },
  { id: "t3", obj: "folder:marketing", rel: "viewer", user: "group:mkt#member" },
  { id: "t4", obj: "folder:marketing", rel: "editor", user: "user:dan" },
  { id: "t5", obj: "group:mkt", rel: "member", user: "user:bob" },
  { id: "t6", obj: "group:mkt", rel: "member", user: "group:design#member" },
  { id: "t7", obj: "group:design", rel: "member", user: "user:carol" },
];
type Rule = ["this"] | ["computed", string] | ["parent", string];
const RULES: Record<string, Record<string, Rule[]>> = {
  doc: { owner: [["this"]], editor: [["this"], ["computed", "owner"], ["parent", "editor"]], viewer: [["this"], ["computed", "editor"], ["parent", "viewer"]] },
  folder: { owner: [["this"]], editor: [["this"], ["computed", "owner"]], viewer: [["this"], ["computed", "editor"]] },
  group: { member: [["this"]] },
};
type Hop = { tuple?: string; say: string };
function check(obj: string, rel: string, user: string, ts: Tuple[], seen = new Set<string>()): Hop[] | null {
  const key = `${obj}#${rel}`;
  if (seen.has(key)) return null;
  seen.add(key);
  const rules = RULES[obj.split(":")[0]]?.[rel] ?? [];
  for (const r of rules) {
    if (r[0] === "this") {
      for (const t of ts.filter((t) => t.obj === obj && t.rel === rel)) {
        if (t.user === user) return [{ tuple: t.id, say: `${user.slice(5)} is a direct ${rel} of ${obj}` }];
        if (t.user.includes("#")) {
          const [o, r2] = t.user.split("#");
          const sub = check(o, r2, user, ts, seen);
          if (sub) return [...sub, { tuple: t.id, say: `every ${r2} of ${o} is ${rel} of ${obj}` }];
        }
      }
    } else if (r[0] === "computed") {
      const sub = check(obj, r[1], user, ts, seen);
      if (sub) return [...sub, { say: `rule: every ${r[1]} of a ${obj.split(":")[0]} is also its ${rel}` }];
    } else {
      for (const t of ts.filter((t) => t.obj === obj && t.rel === "parent")) {
        const sub = check(t.user, r[1], user, ts, seen);
        if (sub) return [...sub, { tuple: t.id, say: `${t.user} is the parent of ${obj}, and a ${r[1]} of the parent is a ${rel} of the doc` }];
      }
    }
  }
  return null;
}
const NODES: Record<string, [number, number]> = {
  "user:alice": [60, 40], "user:bob": [60, 110], "user:carol": [60, 180], "user:dan": [60, 250], "user:eve": [60, 300],
  "group:design": [215, 180], "group:mkt": [215, 110], "folder:marketing": [370, 175], "doc:plan": [520, 110],
};
export function Zanzibar() {
  const [user, setUser] = useState("user:bob");
  const [rel, setRel] = useState("viewer");
  const [off, setOff] = useState<Set<string>>(new Set());
  const ts = TUPLES.filter((t) => !off.has(t.id));
  const path = useMemo(() => check("doc:plan", rel, user, ts), [user, rel, off]); // eslint-disable-line react-hooks/exhaustive-deps
  const onPath = new Set(path?.map((h) => h.tuple).filter(Boolean));
  const toggle = (id: string) => setOff((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  return (
    <Frame title="A Zanzibar permission check" q="Is Bob allowed to view doc:plan? Nobody ever shared it with Bob directly."
      about="Permissions are stored as relation tuples (object#relation@user). Rules say how relations combine: owners are editors, editors are viewers, and a folder's viewers can view its docs. The check walks the tuples like a graph. Pick a person, then switch tuples off to see access disappear."
      foot={path ? `Allowed. The check found a path of ${path.length} hops. Zanzibar answers millions of these per second by caching sub-results and flattening nested groups ahead of time (the Leopard index).` : "Denied: no chain of tuples connects this person to the doc with that relation. Deny is the default."}>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-3">
          <Chips label="Who" value={user} options={[["user:alice", "Alice"], ["user:bob", "Bob"], ["user:carol", "Carol"], ["user:dan", "Dan"], ["user:eve", "Eve"]]} onChange={setUser} />
          <Chips label="Wants to" value={rel} options={[["viewer", "view"], ["editor", "edit"]]} onChange={setRel} />
        </div>
        <div className="overflow-x-auto rounded-xl border border-line bg-[#0c0e15] p-2">
          <svg viewBox="0 0 600 330" style={{ width: "100%", minWidth: 520 }} role="img" aria-label="Relation tuples drawn as a graph">
            {TUPLES.map((t) => {
              const a = NODES[t.user.split("#")[0]], b = NODES[t.obj];
              const isOff = off.has(t.id), hot = onPath.has(t.id);
              return (
                <g key={t.id}>
                  <motion.line x1={a[0] === b[0] ? a[0] : a[0] + 44} y1={a[0] === b[0] ? a[1] - 13 : a[1]} x2={a[0] === b[0] ? b[0] : b[0] - 50} y2={a[0] === b[0] ? b[1] + 13 : b[1]} animate={{ stroke: isOff ? "#262b3d" : hot ? "#c8f547" : "#3a4160", strokeWidth: hot ? 2.4 : 1.2 }} strokeDasharray={isOff ? "4 4" : undefined} />
                  <text x={(a[0] + b[0]) / 2 + (a[0] === b[0] ? 6 : 0)} y={(a[1] + b[1]) / 2 - 4} textAnchor={a[0] === b[0] ? "start" : "middle"} className="text-[9.5px]" fill={isOff ? "#3a4160" : hot ? "#c8f547" : "#8a90a8"}>{t.rel}</text>
                </g>
              );
            })}
            {Object.entries(NODES).map(([id, [x, y]]) => {
              const me = id === user, target = id === "doc:plan";
              return (
                <g key={id}>
                  <rect x={x - 48} y={y - 13} width={96} height={26} rx={7} fill={me ? "rgb(122 167 255 / .18)" : target ? (path ? "rgb(91 228 155 / .16)" : "rgb(255 107 107 / .12)") : "#151826"} stroke={me ? "#7aa7ff" : target ? (path ? "#5be49b" : "#ff6b6b") : "#2f3550"} />
                  <text x={x} y={y + 4} textAnchor="middle" className="text-[10.5px] font-semibold" fill="#e9ebf4">{id}</text>
                </g>
              );
            })}
          </svg>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <div>
            <div className="mb-1 text-[10.5px] uppercase tracking-wider text-faint">Stored tuples (click to remove or restore)</div>
            <div className="space-y-1">
              {TUPLES.map((t) => (
                <button key={t.id} onClick={() => toggle(t.id)} className={cn("block w-full rounded-lg border px-2 py-1 text-left font-mono text-[11.5px] transition", off.has(t.id) ? "border-line text-faint line-through" : onPath.has(t.id) ? "border-accent/50 text-accent" : "border-line text-mute hover:text-text")}>{t.obj}#{t.rel}@{t.user}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1 text-[10.5px] uppercase tracking-wider text-faint">Check({user.slice(5)}, {rel}, doc:plan)</div>
            {path ? (
              <ol className="space-y-1 text-[13px]">{path.map((h, i) => <li key={i} className="flex gap-2"><span className="num text-faint">{i + 1}.</span><span>{h.say}</span></li>)}<li className="font-semibold text-ok">→ allowed</li></ol>
            ) : <div className="text-[13px] font-semibold text-bad">→ denied</div>}
          </div>
        </div>
      </div>
    </Frame>
  );
}

// ───────── noisy neighbour: tenant job queue ─────────
type QMode = "fifo" | "fair" | "cap";
type Job = { tenant: number; at: number };
type QS = { t: number; queue: Job[]; workers: (Job & { done: number } | null)[]; waits: number[][]; aDone: number | null; aLeft: number; next: number };
const WORKERS = 4, JOB = 5, IMPORT = 240, TCOL = ["#ff8fb3", "#4fd1c5", "#7aa7ff"], TNAME = ["Tenant A (bulk import)", "Tenant B", "Tenant C"];
export function TenantQueue() {
  const [mode, setMode] = useState<QMode>("fifo");
  const sim = useSim<QS>(() => ({ t: 0, queue: Array.from({ length: IMPORT }, () => ({ tenant: 0, at: 0 })), workers: Array(WORKERS).fill(null), waits: [[], [], []], aDone: null, aLeft: IMPORT, next: 0 }), (s) => {
    if (s.aDone !== null && s.t > s.aDone + 40) return;
    s.t++;
    if (s.t % 10 === 0) s.queue.push({ tenant: 1, at: s.t });
    if (s.t % 10 === 5) s.queue.push({ tenant: 2, at: s.t });
    s.workers = s.workers.map((w) => { if (w && w.done <= s.t) { if (w.tenant === 0 && --s.aLeft === 0) s.aDone = s.t; return null; } return w; });
    for (let i = 0; i < WORKERS; i++) {
      if (s.workers[i] || !s.queue.length) continue;
      let idx = 0;
      if (mode === "fair") {
        for (let k = 0; k < 3; k++) { const ten = (s.next + k) % 3; const j = s.queue.findIndex((q) => q.tenant === ten); if (j >= 0) { idx = j; s.next = (ten + 1) % 3; break; } }
      } else if (mode === "cap") {
        const aBusy = s.workers.filter((w) => w?.tenant === 0).length;
        idx = aBusy >= 2 ? s.queue.findIndex((q) => q.tenant !== 0) : 0;
        if (idx < 0) continue;
      }
      const [job] = s.queue.splice(idx, 1);
      s.waits[job.tenant].push(s.t - job.at);
      s.workers[i] = { ...job, done: s.t + JOB };
    }
  }, [mode], 1);
  const s = sim.s;
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const sec = (ticks: number) => `${(ticks / 10).toFixed(1)} s`;
  const bc = [...s.waits[1], ...s.waits[2]];
  return (
    <Frame title="One tenant's import vs everyone's emails" q={`Tenant A queues ${IMPORT} heavy jobs at once. Tenants B and C each send one small job a second. How long do B and C wait?`}
      about={`A shared pool of ${WORKERS} workers; each job takes 0.5 s. Compare one shared first-come-first-served queue with fair queueing (take turns between tenants) and a per-tenant cap (A may use at most 2 workers).`}
      foot={mode === "fifo" ? "First come, first served: B and C's jobs sit behind A's whole import. Nothing is broken, yet A has taken the service away from everyone else: the noisy neighbour." : mode === "fair" ? "Fair queueing gives each tenant with waiting work a turn, so B and C almost never wait. A's import finishes somewhat later because it now shares, but it still uses every worker B and C don't need." : "A cap guarantees room for others and bounds A's share even when nobody else is busy, so A's import takes longer. Caps are simple and predictable; fair queueing uses idle capacity better."}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Chips label="Scheduling" value={mode} options={[["fifo", "Shared FIFO"], ["fair", "Fair queueing"], ["cap", "Cap A at 2 workers"]]} onChange={setMode} />
          <SimControls sim={sim} stepLabel="+1 s" stepN={10} />
        </div>
        <div className="rounded-xl border border-line bg-bg p-3">
          <div className="mb-1.5 text-[10.5px] uppercase tracking-wider text-faint">Workers</div>
          <div className="flex gap-1.5">{s.workers.map((w, i) => <motion.div key={i} className="flex h-9 flex-1 items-center justify-center rounded-lg text-[11px] font-semibold" animate={{ backgroundColor: w ? TCOL[w.tenant] : "#1d2132", color: w ? "#0b0d14" : "#5d637c" }}>{w ? ["A", "B", "C"][w.tenant] : "idle"}</motion.div>)}</div>
          <div className="mb-1 mt-3 text-[10.5px] uppercase tracking-wider text-faint">Waiting jobs, in queue order (first 80)</div>
          <div className="flex flex-wrap gap-[3px]">{s.queue.slice(0, 80).map((q, i) => <span key={i} className="h-3 w-3 rounded-[3px]" style={{ background: TCOL[q.tenant], outline: q.tenant ? "1.5px solid #fff" : undefined }} />)}{s.queue.length > 80 && <span className="text-[11px] text-faint">+{s.queue.length - 80}</span>}</div>
          <div className="mt-2 flex flex-wrap gap-3 text-[11.5px] text-mute">{TNAME.map((n, i) => <span key={n} className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: TCOL[i] }} />{n}</span>)}</div>
        </div>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          <Stat k="Clock" v={sec(s.t)} />
          <Stat k="B & C average wait" v={sec(avg(bc))} tone={avg(bc) > 20 ? "var(--color-bad)" : "var(--color-ok)"} />
          <Stat k="B & C worst wait" v={sec(Math.max(0, ...bc))} />
          <Stat k="A's import done" v={s.aDone !== null ? sec(s.aDone) : `${IMPORT - s.aLeft}/${IMPORT}`} />
        </div>
      </div>
    </Frame>
  );
}

// ───────── layered DDoS defence ─────────
type Atk = "udp" | "http" | "stuff";
type Layer = "edge" | "waf" | "rate" | "cache" | "shed" | "mfa";
const LAYERS: [Layer, string, string][] = [
  ["edge", "Anycast edge", "hundreds of sites share the flood; non-web traffic dropped"],
  ["waf", "WAF + bot scoring", "blocks known bot fingerprints and bad IP reputation"],
  ["rate", "Rate limits", "10 req/s per IP; 5 logins/min per account"],
  ["cache", "Edge cache", "repeat requests answered without the origin"],
  ["shed", "Priority shedding", "when overloaded, signed-in users go first"],
  ["mfa", "Breached-password check + MFA", "a stolen password alone no longer opens an account"],
];
const LEGIT = 60_000, CAP = 100_000;
const fmt = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : `${Math.round(n)}`);
export function DefenceLayers() {
  const [atk, setAtk] = useState<Atk>("http");
  const [on, setOn] = useState<Set<Layer>>(new Set(["edge", "waf", "rate", "cache", "shed", "mfa"]));
  const tog = (l: Layer) => setOn((s) => { const n = new Set(s); if (n.has(l)) n.delete(l); else n.add(l); return n; });
  const r = useMemo(() => {
    const stages: { layer: string; attack: number; legit: number; note: string }[] = [];
    let attack = atk === "udp" ? 1200 : atk === "http" ? 3_000_000 : 5_000;
    let legit = atk === "udp" ? 5 : LEGIT;
    const unit = atk === "udp" ? "Gbit/s" : "req/s";
    stages.push({ layer: "Arriving", attack, legit, note: atk === "udp" ? "1.2 Tbit/s of UDP reflection junk; your data centre link is 100 Gbit/s" : atk === "http" ? "200,000 bots, 15 random search requests/s each (cache-busting)" : "5,000 logins/s from 50,000 home-router IPs, using leaked email/password pairs" });
    let legitOk = 1, damage = "";
    if (atk === "udp") {
      if (on.has("edge")) { stages.push({ layer: "Anycast edge", attack: 0, legit, note: "spread over ~200 sites (6 Gbit/s each) and dropped: it isn't web traffic" }); attack = 0; }
      else { legitOk = 100 / (attack + legit); stages.push({ layer: "Your 100 Gbit/s link", attack: attack * legitOk, legit: legit * legitOk, note: "the pipe is full; packets are dropped at random, real users included" }); }
      damage = on.has("edge") ? "none" : "site unreachable";
      return { stages, unit, legitOk, damage, origin: 0 };
    }
    const step = (l: Layer, fa: number, fl: number, note: string, skip?: string) => {
      if (!on.has(l)) return;
      if (skip) { stages.push({ layer: LAYERS.find((x) => x[0] === l)![1], attack, legit, note: skip }); return; }
      attack *= fa; legit *= fl; stages.push({ layer: LAYERS.find((x) => x[0] === l)![1], attack, legit, note });
    };
    step("edge", 1, 1, "", "web requests pass through, but the load is spread across sites so the next layers can run at the edge");
    if (atk === "http") {
      step("waf", 0.2, 0.995, "80% of bots recognised; 0.5% of real users wrongly challenged (the cost of scoring)");
      step("rate", 2 / 3, 1, "each bot capped from 15 to 10 req/s: helps, but bots spread across many IPs");
      let fromCache = 0;
      if (on.has("cache")) { fromCache = legit * 0.7; legit *= 0.3; stages.push({ layer: "Edge cache", attack, legit, note: "70% of real traffic served from cache; random bot queries all miss" }); }
      const load = attack + legit;
      let originLegit: number;
      if (load <= CAP) originLegit = legit;
      else if (on.has("shed")) originLegit = Math.min(legit, CAP);
      else originLegit = legit * (CAP / load);
      stages.push({ layer: "Origin (100k req/s)", attack: load <= CAP ? attack : on.has("shed") ? Math.max(0, CAP - originLegit) : attack * (CAP / load), legit: originLegit, note: load <= CAP ? "within capacity" : on.has("shed") ? "overloaded: anonymous traffic is shed first, signed-in users kept" : "overloaded: requests fail at random, real users included" });
      legitOk = (fromCache + originLegit) / LEGIT;
      damage = load <= CAP ? "none" : on.has("shed") ? "only anonymous traffic shed" : `${Math.round((1 - CAP / load) * 100)}% of uncached requests fail`;
      return { stages, unit, legitOk, damage, origin: load };
    }
    // credential stuffing: small volume, the harm is account takeover
    step("waf", 0.4, 0.995, "60% caught by headless-browser fingerprints");
    step("rate", 0.9, 1, "barely helps: each IP tries once every 10 s and each account is tried once");
    step("cache", 1, 1, "", "logins can't be cached");
    step("shed", 1, 1, "", "no overload: 5,000 req/s is small");
    const success = on.has("mfa") ? 0.00002 : 0.005;
    if (on.has("mfa")) stages.push({ layer: "Breached-password check + MFA", attack, legit, note: "leaked pairs forced to reset; the rest need a second factor" });
    damage = `${fmt(attack * 3600 * success)} accounts taken over per hour`;
    return { stages, unit, legitOk: 0.995 ** (on.has("waf") ? 1 : 0), damage, origin: attack + legit };
  }, [atk, on]);
  const max = Math.max(...r.stages.map((s) => s.attack + s.legit));
  const w = (v: number) => `${v <= 0 ? 0 : Math.max(1.5, (Math.log10(1 + v) / Math.log10(1 + max)) * 100)}%`;
  return (
    <Frame title="Layers of defence against an attack" q="Which layer stops which attack? Turn layers off and see what reaches you."
      about="Three attacks against a site with 60,000 real requests a second and an origin that can serve 100,000. Bars use a log scale (each step is 10×). Red is attack traffic, green is real users."
      foot="No single layer stops everything: the edge absorbs floods, scoring and limits thin out bots, caching and shedding keep real users served under load, and credential stuffing is barely touched by rate limits; it is stopped by what a stolen password is worth (breach checks, MFA, passkeys).">
      <div className="space-y-3">
        <Chips label="Attack" value={atk} options={[["udp", "Network flood (1.2 Tbit/s)"], ["http", "HTTP flood from a botnet"], ["stuff", "Credential stuffing"]]} onChange={setAtk} />
        <div className="flex flex-wrap gap-1.5">{LAYERS.map(([k, name, what]) => <Btn key={k} on={on.has(k)} onClick={() => tog(k)} title={what}>{on.has(k) ? "✓ " : ""}{name}</Btn>)}</div>
        <div className="space-y-2 rounded-xl border border-line bg-bg p-3">
          {r.stages.map((s, i) => (
            <div key={i}>
              <div className="flex justify-between gap-2 text-[12px]"><span className="font-semibold">{s.layer}</span><span className="num text-faint">attack {fmt(s.attack)} · real {fmt(s.legit)} {r.unit}</span></div>
              <div className="mt-1 space-y-0.5">
                <div className="h-1.5 overflow-hidden rounded-full bg-[#1d2132]"><motion.div className="h-full rounded-full bg-bad/80" animate={{ width: w(s.attack) }} /></div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[#1d2132]"><motion.div className="h-full rounded-full bg-ok/80" animate={{ width: w(s.legit) }} /></div>
              </div>
              <div className="mt-0.5 text-[11.5px] text-mute">{s.note}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <Stat k="Real users served" v={`${Math.round(r.legitOk * 100)}%`} tone={r.legitOk > 0.95 ? "var(--color-ok)" : r.legitOk > 0.6 ? "var(--color-warn)" : "var(--color-bad)"} />
          <Stat k="Damage" v={r.damage} tone={r.damage === "none" || r.damage.startsWith("0 ") ? "var(--color-ok)" : r.damage.startsWith("only") ? "var(--color-warn)" : "var(--color-bad)"} />
        </div>
      </div>
    </Frame>
  );
}
