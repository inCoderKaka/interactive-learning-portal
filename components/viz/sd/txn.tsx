"use client";
/** Transaction visuals: the isolation lab (anomaly × level), and a Raft cluster simulator. */
import { useState } from "react";
import { Btn, Chips, Frame, SimControls, rng, useSim } from "./kit";
import { Seq } from "./Seq";
import { ISOLATION } from "./scenarios/transactions";
import { cn } from "../../ui";

export function IsolationLab() {
  const [a, setA] = useState<keyof typeof ISOLATION>("lost");
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-panel2/50 px-3 py-2">
        <span className="text-[12px] text-faint">Anomaly</span>
        <Chips value={a} options={[["lost", "Lost update"], ["dirty", "Dirty read"], ["skew", "Write skew"]]} onChange={setA} />
      </div>
      <Seq key={a} sc={{ ...ISOLATION[a], title: `Isolation lab: ${ISOLATION[a].title}`, q: "Pick an isolation level (Run) and step through the interleaving. Is the anomaly prevented?" }} />
    </div>
  );
}

// ───────── Raft ─────────
type Role = "follower" | "candidate" | "leader";
type Entry = { term: number; cmd: string };
type Msg = { id: number; from: number; to: number; sent: number; at: number; kind: "vote" | "voteResp" | "append" | "appendResp"; term: number; granted?: boolean; success?: boolean; prev?: number; prevTerm?: number; entries?: Entry[]; leaderCommit?: number; match?: number; lastIdx?: number; lastTerm?: number };
type Nd = { id: number; role: Role; term: number; voted: number | null; log: Entry[]; commit: number; deadline: number; alive: boolean; votes: number[]; next: number[]; match: number[]; hb: number };
type RS = { t: number; nodes: Nd[]; msgs: Msg[]; r: () => number; seq: number; events: string[]; split: boolean; cmd: number };
const NN = 5, MAJ = 3, HB = 60, NAMES = ["A", "B", "C", "D", "E"];
const timeout = (s: RS) => s.t + 160 + Math.floor(s.r() * 160);
const group = (s: RS, i: number) => (s.split ? (i < 2 ? 0 : 1) : 0);
const link = (s: RS, a: number, b: number) => s.nodes[a].alive && s.nodes[b].alive && group(s, a) === group(s, b);
function send(s: RS, m: Omit<Msg, "id" | "sent" | "at">) { if (!link(s, m.from, m.to)) return; s.msgs.push({ ...m, id: ++s.seq, sent: s.t, at: s.t + 30 + Math.floor(s.r() * 30) }); }
function ev(s: RS, e: string) { s.events.unshift(`${(s.t / 1000).toFixed(2)} s · ${e}`); if (s.events.length > 9) s.events.pop(); }
function stepDown(n: Nd, term: number, s: RS) { if (term > n.term) { n.term = term; n.voted = null; if (n.role !== "follower") n.role = "follower"; n.deadline = timeout(s); } }

function tick(s: RS) {
  s.t += 5;
  const due = s.msgs.filter((m) => m.at <= s.t);
  s.msgs = s.msgs.filter((m) => m.at > s.t);
  for (const m of due) {
    const n = s.nodes[m.to];
    if (!n.alive || group(s, m.from) !== group(s, m.to)) continue;
    stepDown(n, m.term, s);
    if (m.kind === "vote") {
      const myLastTerm = n.log.length ? n.log[n.log.length - 1].term : 0;
      const upToDate = m.lastTerm! > myLastTerm || (m.lastTerm === myLastTerm && m.lastIdx! >= n.log.length);
      const grant = m.term === n.term && (n.voted === null || n.voted === m.from) && upToDate;
      if (grant) { n.voted = m.from; n.deadline = timeout(s); }
      send(s, { from: n.id, to: m.from, kind: "voteResp", term: n.term, granted: grant });
    } else if (m.kind === "voteResp") {
      if (n.role === "candidate" && m.term === n.term && m.granted && !n.votes.includes(m.from)) {
        n.votes.push(m.from);
        if (n.votes.length >= MAJ) {
          n.role = "leader"; n.next = Array(NN).fill(n.log.length + 1); n.match = Array(NN).fill(0); n.match[n.id] = n.log.length; n.hb = s.t;
          ev(s, `${NAMES[n.id]} won term ${n.term} with votes from ${n.votes.map((v) => NAMES[v]).join(", ")}`);
        }
      }
    } else if (m.kind === "append") {
      if (m.term < n.term) { send(s, { from: n.id, to: m.from, kind: "appendResp", term: n.term, success: false }); continue; }
      n.role = "follower"; n.deadline = timeout(s);
      const ok = m.prev === 0 || (n.log.length >= m.prev! && n.log[m.prev! - 1].term === m.prevTerm);
      if (!ok) { send(s, { from: n.id, to: m.from, kind: "appendResp", term: n.term, success: false }); continue; }
      if (m.entries!.length) {
        // Raft's rule: if an existing entry conflicts with a new one (same index, different term), delete it and
        // everything after it; then append any new entries not already in the log.
        m.entries!.forEach((e, j) => {
          const k = m.prev! + j;
          if (k < n.log.length && n.log[k].term !== e.term) { n.log = n.log.slice(0, k); ev(s, `${NAMES[n.id]} had a conflicting entry at ${k + 1}: dropped its divergent tail`); }
          if (k >= n.log.length) n.log = [...n.log, e];
        });
      }
      n.commit = Math.max(n.commit, Math.min(m.leaderCommit!, n.log.length));
      send(s, { from: n.id, to: m.from, kind: "appendResp", term: n.term, success: true, match: m.prev! + m.entries!.length });
    } else if (m.kind === "appendResp") {
      if (n.role !== "leader" || m.term !== n.term) continue;
      if (m.success) {
        n.match[m.from] = Math.max(n.match[m.from], m.match!); n.next[m.from] = n.match[m.from] + 1;
        for (let k = n.log.length; k > n.commit; k--) {
          if (n.log[k - 1].term === n.term && n.match.filter((x, i) => (i === n.id ? n.log.length : x) >= k).length >= MAJ) { ev(s, `Entry ${k} (${n.log[k - 1].cmd}) committed: stored on ${MAJ} of ${NN}`); n.commit = k; break; }
        }
      } else n.next[m.from] = Math.max(1, n.next[m.from] - 1);
    }
  }
  for (const n of s.nodes) {
    if (!n.alive) continue;
    if (n.role === "leader") {
      n.match[n.id] = n.log.length;
      if (s.t >= n.hb) {
        n.hb = s.t + HB;
        for (let p = 0; p < NN; p++) if (p !== n.id) {
          const prev = n.next[p] - 1;
          send(s, { from: n.id, to: p, kind: "append", term: n.term, prev, prevTerm: prev ? n.log[prev - 1].term : 0, entries: n.log.slice(prev), leaderCommit: n.commit });
        }
      }
    } else if (s.t >= n.deadline) {
      n.role = "candidate"; n.term++; n.voted = n.id; n.votes = [n.id]; n.deadline = timeout(s);
      ev(s, `${NAMES[n.id]} heard no leader: starts an election for term ${n.term}`);
      for (let p = 0; p < NN; p++) if (p !== n.id) send(s, { from: n.id, to: p, kind: "vote", term: n.term, lastIdx: n.log.length, lastTerm: n.log.length ? n.log[n.log.length - 1].term : 0 });
    }
  }
}

const POS = Array.from({ length: NN }, (_, i) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / NN; return [210 + 135 * Math.cos(a), 170 + 125 * Math.sin(a)]; });
const TERM_COL = ["#4a5170", "#7aa7ff", "#ffb454", "#ff8fb3", "#b794f4", "#4fd1c5", "#c8f547", "#f6ad55"];

export function Raft() {
  const sim = useSim<RS>(() => {
    const r = rng(42);
    const s: RS = { t: 0, nodes: [], msgs: [], r, seq: 0, events: [], split: false, cmd: 0 };
    s.nodes = Array.from({ length: NN }, (_, id) => ({ id, role: "follower" as Role, term: 0, voted: null, log: [], commit: 0, deadline: 0, alive: true, votes: [], next: [], match: [], hb: 0 }));
    s.nodes.forEach((n) => { n.deadline = timeout(s); });
    ev(s, "Five followers, no leader yet. Each waits a random 160–320 ms for a heartbeat.");
    return s;
  }, tick, [], 1);
  const s = sim.s;
  const leaderOf = (st: RS) => st.nodes.find((n) => n.alive && n.role === "leader" && !st.nodes.some((o) => o.alive && o.role === "leader" && o.term > n.term));
  const write = () => sim.act((st) => {
    const ld = leaderOf(st);
    if (!ld) { ev(st, "Client write rejected: no leader reachable right now"); return; }
    const cmd = `x=${++st.cmd}`;
    ld.log.push({ term: ld.term, cmd });
    ld.hb = st.t; // replicate right away
    ev(st, `Client sent ${cmd} to leader ${NAMES[ld.id]} (term ${ld.term})`);
  });
  const toggle = (i: number) => sim.act((st) => {
    const n = st.nodes[i];
    n.alive = !n.alive;
    if (n.alive) { n.role = "follower"; n.deadline = timeout(st); ev(st, `${NAMES[i]} restarted as a follower (term ${n.term})`); }
    else { ev(st, `${NAMES[i]} crashed${n.role === "leader" ? " (it was the leader)" : ""}`); st.msgs = st.msgs.filter((m) => m.to !== i && m.from !== i); }
  });
  const split = () => sim.act((st) => { st.split = !st.split; ev(st, st.split ? "Network partition: {A, B} cut off from {C, D, E}" : "Partition healed"); });

  return (
    <Frame title="Raft: leader election and log replication" q="Kill the leader or cut the network. Does the cluster agree on one leader and keep every committed entry?"
      about="Five nodes. Click a node to crash or restart it. Dots are messages in flight (votes in orange, heartbeats/appends in blue). Squares under a node are its log, coloured by term; filled squares are committed."
      foot="A leader is elected by a majority (3 of 5) for a numbered term; an entry is committed once a majority stores it. During a partition, only the side with 3 nodes can elect a leader and commit; the 2-node side's writes never commit, and its old leader steps down when it sees a higher term.">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <SimControls sim={sim} stepLabel="+50 ms" stepN={10} />
          <Btn on onClick={write}>Client write</Btn>
          <Btn tone={s.split ? "ok" : "bad"} onClick={split}>{s.split ? "Heal partition" : "Partition {A,B} | {C,D,E}"}</Btn>
          <span className="num text-[12px] text-faint">t = {(s.t / 1000).toFixed(2)} s</span>
        </div>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="rounded-xl border border-line bg-[#0c0e15]">
            <svg viewBox="0 0 420 345" className="w-full" role="img" aria-label="Raft cluster">
              {s.split && <line x1={60} y1={250} x2={360} y2={70} stroke="#ff6b6b" strokeDasharray="6 6" strokeOpacity={0.6} />}
              {s.msgs.map((m) => {
                const [x1, y1] = POS[m.from], [x2, y2] = POS[m.to], f = Math.min(1, Math.max(0, (s.t - m.sent) / (m.at - m.sent)));
                return <circle key={m.id} cx={x1 + (x2 - x1) * f} cy={y1 + (y2 - y1) * f} r={m.kind === "append" && m.entries?.length ? 5 : 3.5} fill={m.kind.startsWith("vote") ? "#ffb454" : m.kind === "append" ? "#7aa7ff" : "#5d637c"} />;
              })}
              {s.nodes.map((n, i) => {
                const [x, y] = POS[i];
                const prog = n.alive && n.role !== "leader" ? Math.max(0, Math.min(1, 1 - (n.deadline - s.t) / 320)) : 0;
                const col = !n.alive ? "#ff6b6b" : n.role === "leader" ? "#c8f547" : n.role === "candidate" ? "#ffb454" : "#7d849e";
                return (
                  <g key={i} onClick={() => toggle(i)} className="cursor-pointer">
                    <circle cx={x} cy={y} r={27} fill="#141724" stroke={col} strokeWidth={n.role === "leader" ? 3 : 2} strokeDasharray={n.alive ? undefined : "4 3"} />
                    {prog > 0 && <circle cx={x} cy={y} r={31} fill="none" stroke="#ffb454" strokeOpacity={0.5} strokeWidth={2} strokeDasharray={`${prog * 195} 195`} transform={`rotate(-90 ${x} ${y})`} />}
                    <text x={x} y={y - 3} textAnchor="middle" className="text-[13px] font-bold" fill={col}>{NAMES[i]}</text>
                    <text x={x} y={y + 11} textAnchor="middle" className="fill-[#9096ad] text-[9px]">{n.alive ? `${n.role === "leader" ? "leader" : n.role === "candidate" ? "candidate" : "follower"} · t${n.term}` : "crashed"}</text>
                    <g>{n.log.slice(-8).map((e, k) => { const idx = n.log.length - Math.min(8, n.log.length) + k + 1; return <rect key={k} x={x - 34 + k * 8.5} y={y + 33} width={7} height={9} rx={1.5} fill={idx <= n.commit ? TERM_COL[e.term % TERM_COL.length] : "transparent"} stroke={TERM_COL[e.term % TERM_COL.length]} />; })}</g>
                  </g>
                );
              })}
            </svg>
          </div>
          <div className="space-y-1 rounded-xl border border-line bg-bg p-2.5">
            <div className="text-[10.5px] uppercase tracking-wider text-faint">What just happened</div>
            {s.events.map((e, i) => <div key={i} className={cn("text-[12px] leading-snug", i ? "text-mute" : "text-text")}>{e}</div>)}
          </div>
        </div>
      </div>
    </Frame>
  );
}
