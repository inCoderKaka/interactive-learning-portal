"use client";
/** Load-balancing visuals: what L4 and L7 balancers can see and route on, and a health-check detection timeline. */
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Lock, Unlock } from "lucide-react";
import { Btn, Chips, Frame, Predict, Slider, Stat } from "./kit";
import { cn } from "../../ui";

// ───────── L4 vs L7 ─────────
type Req = { key: string; name: string; port: number; http?: { method: string; path: string; cookie?: string }; grpc?: boolean; proto?: string };
const REQS: Req[] = [
  { key: "api", name: "GET /api/orders", port: 443, http: { method: "GET", path: "/api/orders", cookie: "beta=0" } },
  { key: "static", name: "GET /static/logo.png", port: 443, http: { method: "GET", path: "/static/logo.png" } },
  { key: "beta", name: "POST /api/pay (beta user)", port: 443, http: { method: "POST", path: "/api/pay", cookie: "beta=1" } },
  { key: "grpc", name: "gRPC: 600 calls on one connection", port: 443, http: { method: "POST", path: "/orders.v1.Orders/Get" }, grpc: true },
  { key: "pg", name: "PostgreSQL client", port: 5432, proto: "PostgreSQL wire protocol" },
];
const POOLS = [["api", "API pool", "#7aa7ff"], ["static", "Static pool", "#4fd1c5"], ["canary", "Canary pool", "#ffb454"], ["db", "DB replicas", "#b794f4"]] as const;

function routeL7(r: Req): { pool: string | null; why: string; field?: "path" | "cookie" } {
  if (!r.http) return { pool: null, why: `Not HTTP (${r.proto}): an HTTP proxy cannot parse it. Use an L4 balancer (or a database-aware proxy).` };
  if (r.http.path.startsWith("/static/")) return { pool: "static", why: "Rule 1 matched the path prefix /static/.", field: "path" };
  if (r.http.cookie === "beta=1") return { pool: "canary", why: "Rule 2 matched the cookie beta=1: this user is in the canary.", field: "cookie" };
  return { pool: "api", why: r.grpc ? "Rule 3 matched; each of the 600 calls is balanced separately across the API pool." : "Rule 3 matched the path prefix /api/.", field: "path" };
}

export function L4L7() {
  const [mode, setMode] = useState<"l4" | "l7">("l4");
  const [rk, setRk] = useState("static");
  const r = REQS.find((x) => x.key === rk)!;
  const l7 = routeL7(r);
  const backend = (Number(rk.length * 7 + 51522) % 4) + 1; // stand-in for hash(5-tuple) mod 4
  const spread = r.grpc ? (mode === "l4" ? [600, 0, 0, 0] : [151, 148, 152, 149]) : null;
  const seen = (f: "ip" | "tcp" | "tls" | "http") => (mode === "l4" ? f === "ip" || f === "tcp" : true);
  const layer = (f: "ip" | "tcp" | "tls" | "http", label: string, body: React.ReactNode, tone: string) => (
    <div className={cn("rounded-lg border px-3 py-2 transition", seen(f) ? "border-line bg-panel2" : "border-dashed border-[#2a2f44] bg-transparent opacity-60")}>
      <div className="flex items-center justify-between text-[10.5px] uppercase tracking-wider" style={{ color: tone }}><span>{label}</span><span className="normal-case tracking-normal text-faint">{seen(f) ? "visible to the balancer" : "hidden"}</span></div>
      <div className="mt-0.5 font-mono text-[12px]">{body}</div>
    </div>
  );
  return (
    <Frame title="What can the load balancer see?" q="Can a layer-4 balancer send /static requests to one pool and /api requests to another?"
      about="Pick a request and a balancer type. Hidden layers are dashed. Below, see which pool the request reaches and why."
      foot="L4 sees addresses and ports, so it can only pick a backend per connection. L7 terminates TLS, reads the request, and can route by path or cookie and balance each call separately, at a higher cost per request.">
      <div className="space-y-3">
        <Predict q="A gRPC client sends 600 calls over one long-lived connection through an L4 balancer with 4 backends. How are they spread?" options={["About 150 each", "All 600 to one backend"]} answer={1} why="L4 balances connections, not requests: everything on that connection follows the first decision." />
        <div className="flex flex-wrap items-center gap-3">
          <Chips label="Balancer" value={mode} options={[["l4", "Layer 4 (connections)"], ["l7", "Layer 7 (requests)"]]} onChange={setMode} />
        </div>
        <Chips label="Request" value={rk} options={REQS.map((x) => [x.key, x.name] as [string, string])} onChange={setRk} />
        <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
          <div className="space-y-1.5">
            <div className="text-[12px] text-faint">The packet, outside in</div>
            {layer("ip", "IP header", <>203.0.113.7 → 198.51.100.10</>, "#9096ad")}
            {layer("tcp", "TCP header", <>port 51522 → {r.port}</>, "#9096ad")}
            {r.http ? (
              <div className={cn("rounded-lg border p-2 transition", mode === "l7" ? "border-ok/40" : "border-dashed border-[#2a2f44]")}>
                <div className="mb-1 flex items-center gap-1.5 text-[10.5px] uppercase tracking-wider" style={{ color: mode === "l7" ? "var(--color-ok)" : "#5d637c" }}>
                  {mode === "l7" ? <Unlock size={11} /> : <Lock size={11} />}TLS {mode === "l7" ? "terminated here: decrypted" : "encrypted: unreadable"}
                </div>
                {mode === "l7" ? layer("http", "HTTP request", <>
                  <span className={cn(l7.field === "path" && "rounded bg-accent/20 px-1 text-accent")}>{r.http.method} {r.http.path}</span><br />Host: shop.example.com{r.http.cookie && <><br /><span className={cn(l7.field === "cookie" && "rounded bg-accent/20 px-1 text-accent")}>Cookie: {r.http.cookie}</span></>}
                </>, "#4fd1c5") : <div className="select-none rounded-md bg-[#0c0e15] px-3 py-3 font-mono text-[11px] text-[#3a4160]">8f3a 91c2 e07b 44d1 a9ff 0c13 …</div>}
              </div>
            ) : layer("http", "Payload", <>{r.proto}</>, "#b794f4")}
          </div>
          <div className="space-y-2">
            <div className="text-[12px] text-faint">{mode === "l7" ? "L7 routing rules: 1 /static/* → Static · 2 cookie beta=1 → Canary · 3 /api/* → API" : "L4: one pool of 4 backends, chosen by hash of addresses and ports"}</div>
            {mode === "l4" ? (
              <div className="space-y-1.5">
                {[1, 2, 3, 4].map((b) => (
                  <motion.div key={b} layout className={cn("flex items-center justify-between rounded-lg border px-3 py-2 text-[12.5px]", b === backend ? "border-accent/60 bg-accent/10" : "border-line")}>
                    <span>backend {b}</span>
                    {spread ? <span className="num font-mono text-[12px]">{spread[b - 1]} calls</span> : b === backend && <span className="text-[11.5px] text-accent">← this connection</span>}
                  </motion.div>
                ))}
                <p className="text-[12.5px] leading-relaxed text-mute">
                  {r.grpc ? "Every call on this connection lands on the same backend; the other three idle." : r.http ? "The balancer cannot see that this is a static file or a beta user; any backend may get it, so every backend must serve every kind of request." : "Works: L4 does not care what protocol the bytes carry."}
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {POOLS.map(([k, name, c]) => (
                  <div key={k} className={cn("flex items-center justify-between rounded-lg border px-3 py-2 text-[12.5px]", l7.pool === k ? "border-accent/60 bg-accent/10" : "border-line")}>
                    <span style={{ color: c }}>{name}</span>
                    {l7.pool === k && (spread ? <span className="num font-mono text-[12px]">{spread.join(" · ")}</span> : <span className="text-[11.5px] text-accent">← routed here</span>)}
                  </div>
                ))}
                <p className={cn("text-[12.5px] leading-relaxed", l7.pool ? "text-mute" : "text-bad")}>{l7.why}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Frame>
  );
}

// ───────── health-check timeline ─────────
const DUR = 60, FAIL = 13.3, PAUSE_AT = 38, PAUSE_LEN = 2.5;
export function HealthTimeline() {
  const [interval, setInterval_] = useState(5);
  const [thresh, setThresh] = useState(3);
  const [passive, setPassive] = useState(false);
  const [gc, setGc] = useState(false);
  const rps = 500, timeout = Math.min(2, interval * 0.6);

  const sim = useMemo(() => {
    // probes at k·interval; a probe fails if the server is dead, or (with the GC toggle) paused through its timeout
    const probes: { t: number; ok: boolean; server: "b" | "a" }[] = [];
    let removedAt: number | null = null, falseRemoval: number | null = null, fails = 0, failsB = 0;
    for (let t = interval; t <= DUR; t += interval) {
      // server A: healthy except a GC pause; server B: crashes at FAIL
      const aOk = !(gc && t >= PAUSE_AT - timeout && t < PAUSE_AT + PAUSE_LEN);
      probes.push({ t, ok: aOk, server: "a" });
      failsB = t >= FAIL ? failsB + 1 : 0;
      probes.push({ t, ok: t < FAIL, server: "b" });
      if (removedAt === null && failsB >= thresh) removedAt = t + timeout;
      fails = aOk ? 0 : fails + 1;
      if (falseRemoval === null && fails >= thresh) falseRemoval = t + timeout;
    }
    const detect = passive ? FAIL + 5 / rps : removedAt ?? DUR;
    return { probes, detect, failed: Math.round((detect - FAIL) * rps), falseRemoval };
  }, [interval, thresh, passive, gc, timeout]);

  const W = 600, x = (t: number) => 92 + (t / DUR) * (W - 108);
  const probesPerSec = (1 / interval) * 50 * 40; // 50 balancers × 40 backends
  return (
    <Frame title="How long until a dead server stops getting traffic?" q="A server crashes. How many user requests fail before the load balancer notices?"
      about="Server B crashes at 13 s. Probes (ticks) run every interval; B is removed after enough consecutive failures. Server A is healthy, but you can give it a brief garbage-collection pause."
      foot={`Detection takes ${(sim.detect - FAIL).toFixed(1)} s → about ${sim.failed.toLocaleString()} failed requests at ${rps} requests/s to this server.${passive ? " Passive outlier detection ejected it after 5 real errors." : ""}${sim.falseRemoval ? " Server A was removed by mistake during its pause: thresholds this tight cause flapping." : ""}`}>
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Slider label="Probe interval" value={interval} min={1} max={15} onChange={setInterval_} fmt={(v) => `${v} s`} />
          <Slider label="Failures in a row before removal" value={thresh} min={1} max={5} onChange={setThresh} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn on={passive} onClick={() => setPassive(!passive)}>Passive outlier detection (eject after 5 errors)</Btn>
          <Btn on={gc} onClick={() => setGc(!gc)}>Give server A a 2.5 s GC pause</Btn>
        </div>
        <div className="overflow-x-auto rounded-xl border border-line bg-bg p-2">
          <svg viewBox={`0 0 ${W} 150`} style={{ width: "100%", minWidth: 480 }} role="img" aria-label="Health check probes and detection over 60 seconds">
            {[0, 15, 30, 45, 60].map((t) => <g key={t}><line x1={x(t)} x2={x(t)} y1={10} y2={128} stroke="#1c2030" /><text x={x(t)} y={142} textAnchor="middle" className="fill-[#5d637c] text-[9px]">{t} s</text></g>)}
            {(["a", "b"] as const).map((sv, i) => {
              const y = 40 + i * 52;
              return (
                <g key={sv}>
                  <text x={6} y={y + 4} className="fill-[#e9ebf4] text-[11px] font-semibold">Server {sv.toUpperCase()}</text>
                  <line x1={x(0)} x2={x(DUR)} y1={y} y2={y} stroke="#262b3d" strokeWidth={6} strokeLinecap="round" />
                  {sv === "b" && <rect x={x(FAIL)} y={y - 3} width={x(DUR) - x(FAIL)} height={6} fill="#ff6b6b" fillOpacity={0.35} rx={3} />}
                  {sv === "b" && <motion.rect y={y - 3} height={6} fill="#ff6b6b" rx={3} x={x(FAIL)} animate={{ width: Math.max(2, x(Math.min(sim.detect, DUR)) - x(FAIL)) }} />}
                  {sv === "a" && gc && <rect x={x(PAUSE_AT)} y={y - 3} width={x(PAUSE_AT + PAUSE_LEN) - x(PAUSE_AT)} height={6} fill="#ffc857" rx={3} />}
                  {sim.probes.filter((p) => p.server === sv).map((p) => <line key={p.t} x1={x(p.t)} x2={x(p.t)} y1={y - 12} y2={y + 12} stroke={p.ok ? "#5be49b" : "#ff6b6b"} strokeWidth={1.6} />)}
                  {sv === "b" && sim.detect < DUR && <g><line x1={x(sim.detect)} x2={x(sim.detect)} y1={y - 20} y2={y + 20} stroke="#c8f547" strokeWidth={2} /><text x={x(sim.detect) + 4} y={y - 14} className="fill-[#c8f547] text-[10px]">removed</text></g>}
                  {sv === "b" && <text x={x(FAIL)} y={y + 24} textAnchor="middle" className="fill-[#ff6b6b] text-[9.5px]">crash</text>}
                  {sv === "a" && sim.falseRemoval && <g><line x1={x(sim.falseRemoval)} x2={x(sim.falseRemoval)} y1={y - 20} y2={y + 20} stroke="#ffc857" strokeWidth={2} /><text x={x(sim.falseRemoval) + 4} y={y - 14} className="fill-[#ffc857] text-[10px]">removed by mistake</text></g>}
                </g>
              );
            })}
          </svg>
        </div>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          <Stat k="Detection time" v={`${(sim.detect - FAIL).toFixed(1)} s`} tone={sim.detect - FAIL > 10 ? "var(--color-bad)" : "var(--color-ok)"} />
          <Stat k="Failed requests" v={sim.failed.toLocaleString()} tone={sim.failed > 2000 ? "var(--color-bad)" : undefined} />
          <Stat k="Healthy server removed" v={sim.falseRemoval ? "yes" : "no"} tone={sim.falseRemoval ? "var(--color-warn)" : undefined} />
          <Stat k="Probe load (50 LBs × 40 servers)" v={`${Math.round(probesPerSec).toLocaleString()}/s`} />
        </div>
      </div>
    </Frame>
  );
}
