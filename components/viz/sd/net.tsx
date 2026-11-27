"use client";
/** Networking visuals: head-of-line blocking across HTTP versions, and push techniques racing on the same events. */
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Btn, Frame, Predict, SimControls, Slider, Stat, useSim } from "./kit";
import { cn } from "../../ui";

// ───────── head-of-line blocking ─────────
// Three responses (A, B, C) of four packets each. One packet is sent per time unit; each takes 5 units to arrive.
// A lost packet is noticed and resent, arriving one round trip (10 units) after it should have.
const STREAMS = ["A", "B", "C"] as const;
const SC: Record<string, string> = { A: "#7aa7ff", B: "#ffb454", C: "#ff8fb3" };
const PER = 4, ONE_WAY = 5, RTT = 10;
type Pkt = { s: string; n: number };
type Row = { label: string; sub: string; order: Pkt[]; perStream: boolean };
const interleaved: Pkt[] = Array.from({ length: PER }, (_, n) => STREAMS.map((s) => ({ s, n: n + 1 }))).flat();
const sequential: Pkt[] = STREAMS.flatMap((s) => Array.from({ length: PER }, (_, n) => ({ s, n: n + 1 })));
const ROWS: Row[] = [
  { label: "HTTP/1.1", sub: "one connection: ask for the next response only after the last one arrives", order: sequential, perStream: false },
  { label: "HTTP/2", sub: "streams interleaved on one TCP connection", order: interleaved, perStream: false },
  { label: "HTTP/3", sub: "streams interleaved on QUIC", order: interleaved, perStream: true },
];

function deliver(row: Row, lost: string | null) {
  // send times: HTTP/2 and 3 send all packets back to back. HTTP/1.1 (no pipelining) asks for the next response only
  // after the previous one has fully arrived, so each response also waits for a request to travel to the server.
  const out: Record<string, { arrive: number; at: number }> = {};
  const gate: Record<string, number> = {};
  let clock = 1;
  const release = (p: Pkt, sent: number) => {
    const id = p.s + p.n, arrive = sent + ONE_WAY + (id === lost ? RTT : 0);
    const key = row.perStream ? p.s : "all";
    const at = Math.max(arrive, gate[key] ?? 0);
    gate[key] = at;
    out[id] = { arrive, at };
  };
  if (row.label === "HTTP/1.1") {
    STREAMS.forEach((s, si) => {
      const ps = row.order.filter((p) => p.s === s);
      ps.forEach((p, k) => release(p, clock + k));
      const done = Math.max(...ps.map((p) => out[p.s + p.n].at));
      if (si < STREAMS.length - 1) clock = done + ONE_WAY + 1; // the next request travels to the server
    });
  } else row.order.forEach((p, i) => release(p, i + 1));
  return out;
}

export function HolBlocking() {
  const [lost, setLost] = useState<string | null>("A2");
  const rows = useMemo(() => ROWS.map((r) => ({ r, d: deliver(r, lost) })), [lost]);
  const T = Math.max(40, Math.ceil(Math.max(...rows.flatMap(({ d }) => Object.values(d).map((p) => p.at))) / 10) * 10 + 10);
  const W = 600, x = (t: number) => 70 + (t / T) * (W - 110);
  return (
    <Frame title="Head-of-line blocking" q="One packet is lost. Which responses have to wait for it?"
      about="Three responses (A, B, C) of four packets each travel over one connection. Click a packet in the strip to lose it (click again to deliver everything). Bars show when each response is complete; red is time spent holding data that already arrived."
      foot="HTTP/1.1 makes B and C wait for all of A, plus a trip for each new request, even with no loss. HTTP/2 fixes that, but TCP holds every stream behind a lost packet. HTTP/3 (QUIC) holds only the stream that lost it.">
      <div className="space-y-4">
        <Predict q="Packet A2 is lost. Under HTTP/2, which responses finish late?" options={["Only A", "A, B and C"]} answer={1} why="TCP releases bytes strictly in order, so everything sent after A2 waits for its retransmission, whatever stream it belongs to." />
        <div>
          <div className="mb-1.5 text-[12px] text-faint">Packets in the order HTTP/2 and HTTP/3 send them (click to lose one):</div>
          <div className="flex flex-wrap gap-1.5">
            {interleaved.map((p) => { const id = p.s + p.n, off = lost === id; return (
              <button key={id} onClick={() => setLost(off ? null : id)} aria-pressed={off}
                className={cn("grid h-8 w-9 place-items-center rounded-md border font-mono text-[11.5px] font-semibold transition", off ? "border-bad bg-bad/15 text-bad line-through" : "border-line hover:border-[#3a4160]")}
                style={off ? undefined : { color: SC[p.s] }}>{id}</button>
            ); })}
          </div>
        </div>
        <div className="overflow-x-auto rounded-xl border border-line bg-bg p-3">
          <svg viewBox={`0 0 ${W} ${rows.length * 92 + 20}`} style={{ width: "100%", minWidth: 480 }} role="img" aria-label="When each response completes under each HTTP version">
            {Array.from({ length: T / 10 + 1 }, (_, k) => k * 10).map((t) => <g key={t}><line x1={x(t)} x2={x(t)} y1={6} y2={rows.length * 92 + 6} stroke="#1c2030" /><text x={x(t)} y={rows.length * 92 + 18} textAnchor="middle" className="fill-[#5d637c] text-[9px]">t={t}</text></g>)}
            {rows.map(({ r, d }, ri) => {
              const y0 = ri * 92 + 8;
              return (
                <g key={r.label}>
                  <text x={4} y={y0 + 12} className="fill-[#e9ebf4] text-[11px] font-semibold">{r.label}</text>
                  <text x={x(0)} y={y0 + 12} className="fill-[#5d637c] text-[9.5px]">{r.sub}</text>
                  {STREAMS.map((s, si) => {
                    const ids = Array.from({ length: PER }, (_, n) => s + (n + 1));
                    const done = Math.max(...ids.map((id) => d[id].at)), y = y0 + 34 + si * 18;
                    return (
                      <g key={s}>
                        <text x={58} y={y + 4} textAnchor="end" className="font-mono text-[10px] font-semibold" fill={SC[s]}>{s}</text>
                        <motion.rect x={x(0)} y={y - 4} height={8} rx={4} fill={SC[s]} fillOpacity={0.18} animate={{ width: x(done) - x(0) }} transition={{ duration: 0.4 }} />
                        {ids.map((id) => { const p = d[id]; return (
                          <g key={id}>
                            {p.at > p.arrive && <motion.line x1={x(p.arrive)} y1={y} y2={y} stroke="#ff6b6b" strokeWidth={3} animate={{ x2: x(p.at) }} transition={{ duration: 0.4 }} />}
                            <motion.circle r={3.5} cy={y} fill={id === lost ? "#ff6b6b" : SC[s]} animate={{ cx: x(p.at) }} transition={{ duration: 0.4 }} />
                          </g>
                        ); })}
                        <motion.text y={y + 4} className="fill-[#9096ad] font-mono text-[9.5px]" animate={{ x: x(done) + 7 }} transition={{ duration: 0.4 }}>done {done}</motion.text>
                      </g>
                    );
                  })}
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </Frame>
  );
}

// ───────── push techniques ─────────
const EVENTS = [2.5, 3.1, 11.8, 19.4, 21, 21.6, 34.2, 47.9, 49.3, 56.5];
const LAT = 0.1; // one-way network delay, seconds
const DUR = 60;
type Method = { key: string; name: string; deliveries: { ev: number; at: number }[]; requests: number[]; empty: number };

function methods(interval: number, timeout: number): Method[] {
  // short polling: a request every `interval`; answers carry everything since the last poll
  const sp: Method = { key: "poll", name: "Short polling", deliveries: [], requests: [], empty: 0 };
  let last = 0;
  for (let t = interval; t <= DUR; t += interval) {
    sp.requests.push(t);
    const got = EVENTS.filter((e) => e > last && e <= t - LAT);
    if (!got.length) sp.empty++;
    got.forEach((e) => sp.deliveries.push({ ev: e, at: t + LAT }));
    last = t - LAT;
  }
  // long polling: a request is always waiting at the server; it returns on an event (or after `timeout`), and the
  // client immediately sends the next one. Events that happen while no request is waiting go out with the next one.
  const lp: Method = { key: "long", name: "Long polling", deliveries: [], requests: [0], empty: 0 };
  let open = LAT; // when the current waiting request reached the server
  let i = 0;
  while (open < DUR) {
    const e = EVENTS[i];
    if (e === undefined || e > open + timeout) { // nothing in time: empty response, ask again
      lp.empty++; const back = open + timeout + LAT; if (back > DUR) break;
      lp.requests.push(back); open = back + LAT; continue;
    }
    const at = Math.max(e, open) + LAT; // answered when the event happens (or when the request arrives, if later)
    while (i < EVENTS.length && EVENTS[i] <= Math.max(e, open)) lp.deliveries.push({ ev: EVENTS[i++], at });
    lp.requests.push(at); open = at + LAT;
  }
  const stream = (key: string, name: string): Method => ({ key, name, deliveries: EVENTS.map((e) => ({ ev: e, at: e + LAT })), requests: [0], empty: 0 });
  return [sp, lp, stream("sse", "Server-sent events"), stream("ws", "WebSocket")];
}

export function PushCompare() {
  const [interval, setInterval_] = useState(5);
  const timeout = 30;
  const ms = useMemo(() => methods(interval, timeout), [interval]);
  const sim = useSim<{ t: number }>(() => ({ t: 0 }), (s) => { s.t = Math.min(DUR, s.t + 0.05); }, [interval], 2);
  const now = sim.s.t;
  const W = 600, x = (t: number) => 118 + (t / DUR) * (W - 132);
  return (
    <Frame title="Four ways to push" q="The server has ten events to tell a client about. How late does each technique deliver them, and how many requests does it cost?"
      about="Top row: when events happen on the server. Each row below: requests the client makes (grey ticks) and when each event reaches it (coloured dots, with a line showing the delay). Drag the polling interval."
      foot={`Short polling every ${interval} s: average delay ≈ ${(interval / 2).toFixed(1)} s and most requests come back empty. Long polling and streams deliver in about one network trip; streams do it with a single long-lived connection.`}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[220px] flex-1"><Slider label="Short-polling interval" value={interval} min={1} max={15} onChange={setInterval_} fmt={(v) => `${v} s`} /></div>
          <SimControls sim={sim} stepLabel="+5 s" stepN={100} />
        </div>
        <div className="overflow-x-auto rounded-xl border border-line bg-bg p-2">
          <svg viewBox={`0 0 ${W} ${ms.length * 42 + 52}`} style={{ width: "100%", minWidth: 520 }} role="img" aria-label="Event delivery timeline per push technique">
            {[0, 15, 30, 45, 60].map((t) => <g key={t}><line x1={x(t)} x2={x(t)} y1={10} y2={ms.length * 42 + 36} stroke="#1c2030" /><text x={x(t)} y={ms.length * 42 + 48} textAnchor="middle" className="fill-[#5d637c] text-[9px]">{t} s</text></g>)}
            <text x={6} y={26} className="fill-[#c8f547] text-[10.5px] font-semibold">Server events</text>
            {EVENTS.map((e) => e <= now && <motion.path key={e} initial={{ scale: 0 }} animate={{ scale: 1 }} d={`M${x(e)} 16 l5 9 h-10z`} fill="#c8f547" />)}
            {ms.map((m, i) => {
              const y = 58 + i * 42;
              const done = m.deliveries.filter((d) => d.at <= now), reqs = m.requests.filter((r) => r <= now);
              const avg = m.deliveries.reduce((a, d) => a + (d.at - d.ev), 0) / m.deliveries.length;
              return (
                <g key={m.key}>
                  <text x={6} y={y + 3} className="fill-[#e9ebf4] text-[10.5px] font-semibold">{m.name}</text>
                  <text x={6} y={y + 15} className="fill-[#5d637c] text-[8.5px]">avg {avg < 1 ? `${Math.round(avg * 1000)} ms` : `${avg.toFixed(1)} s`} · {m.requests.length} req{m.key === "sse" || m.key === "ws" ? " (1 connection)" : ""}</text>
                  <line x1={x(0)} x2={x(DUR)} y1={y} y2={y} stroke="#262b3d" />
                  {reqs.map((r, k) => <line key={k} x1={x(r)} x2={x(r)} y1={y - 7} y2={y + 7} stroke="#4a5170" strokeWidth={1.2} />)}
                  {done.map((d) => (
                    <g key={d.ev}>
                      <line x1={x(d.ev)} x2={x(d.at)} y1={y} y2={y} stroke={d.at - d.ev > 1 ? "#ff6b6b" : "#4fd1c5"} strokeWidth={2} />
                      <circle cx={x(d.at)} cy={y} r={3.5} fill={d.at - d.ev > 1 ? "#ff6b6b" : "#4fd1c5"} />
                    </g>
                  ))}
                </g>
              );
            })}
            <line x1={x(now)} x2={x(now)} y1={8} y2={ms.length * 42 + 36} stroke="#c8f547" strokeOpacity={0.5} />
          </svg>
        </div>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {ms.map((m) => (
            <Stat key={m.key} k={m.name} v={`${m.requests.length} req`} sub={m.empty ? `${m.empty} came back empty` : m.key === "long" ? "one request per event" : m.key === "poll" ? "" : "one open connection"} tone={m.empty > 3 ? "var(--color-warn)" : undefined} />
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5"><Btn onClick={() => { sim.setPlaying(false); sim.step(1200); }}>Jump to the end</Btn></div>
      </div>
    </Frame>
  );
}

