"use client";
/**
 * Multi-region visuals: a region-failover explorer (latency and what's lost per topology), a CRDT lab comparing
 * last-writer-wins, version-vector siblings and CRDT merges on the same offline edits, and an RPO/RTO timeline.
 */
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Btn, Chips, Frame, Predict, Stat } from "./kit";
import { cn } from "../../ui";

// ───────── region failover ─────────
type R = "us" | "eu" | "as";
const RN: Record<R, string> = { us: "US (Iowa)", eu: "Europe (Belgium)", as: "Asia (Tokyo)" };
const RTT: Record<string, number> = { "us-eu": 85, "us-as": 140, "eu-as": 220 };
const LOCAL = 15;
const rtt = (a: R, b: R) => (a === b ? LOCAL : RTT[[a, b].sort((x, y) => ["us", "eu", "as"].indexOf(x) - ["us", "eu", "as"].indexOf(y)).join("-")] + LOCAL);
type Topo = "single" | "ap-async" | "ap-sync" | "home" | "multi" | "consensus";
type Out = { read: Record<R, number | null>; write: Record<R, number | null>; lost: string; down: string; note: string; links: [R, R, "async" | "sync"][]; data: R[] };
const nearest = (from: R, alive: R[]) => alive.reduce((b, r) => (rtt(from, r) < rtt(from, b) ? r : b), alive[0]);
function topoOut(t: Topo, fail: R | null): Out {
  const users: R[] = ["us", "eu", "as"];
  const map = (f: (u: R) => number | null) => Object.fromEntries(users.map((u) => [u, f(u)])) as Record<R, number | null>;
  const alive = users.filter((r) => r !== fail);
  if (t === "single") {
    const up = fail !== "us";
    return { read: map((u) => (up ? rtt(u, "us") : null)), write: map((u) => (up ? rtt(u, "us") : null)), data: ["us"], links: [],
      lost: up ? "nothing" : "everything since the last off-region backup", down: up ? "none" : "hours to days (rebuild elsewhere from backups)",
      note: up ? "Simple and cheap. Far users pay the full trip to Iowa on every request." : "All three zones were in the lost region. Service returns only after rebuilding in another region." };
  }
  if (t === "ap-async" || t === "ap-sync") {
    const sync = t === "ap-sync";
    if (fail === "us") return { read: map((u) => rtt(u, "eu")), write: map((u) => rtt(u, "eu")), data: ["eu"], links: [],
      lost: sync ? "nothing (every write was confirmed by Europe)" : "the last ~1 s of writes that hadn't shipped", down: "2–5 minutes (detect, fence, promote, move traffic)",
      note: "The standby became the primary. It must be sized to take all the traffic." };
    if (fail === "eu") return { read: map((u) => rtt(u, "us")), write: map((u) => (sync ? null : rtt(u, "us"))), data: ["us"], links: [],
      lost: "nothing", down: sync ? "writes stall until the standby is dropped from sync replication" : "none",
      note: sync ? "Synchronous replication waits for a standby that can't answer: writes block (or you fall back to async and give up the guarantee)." : "No user impact, but there's no standby until Europe is back." };
    return { read: map((u) => rtt(u, "us")), write: map((u) => rtt(u, "us") + (sync ? RTT["us-eu"] : 0)), data: ["us", "eu"], links: [["us", "eu", sync ? "sync" : "async"]],
      lost: "nothing", down: "none", note: sync ? "Every write also waits ~85 ms for Europe to confirm." : "Writes return before Europe has them: the gap is the data at risk." };
  }
  if (t === "home") {
    const links: [R, R, "async"][] = [["us", "eu", "async"], ["eu", "as", "async"], ["us", "as", "async"]];
    return { read: map((u) => (u === fail ? rtt(u, nearest(u, alive)) : LOCAL)), write: map((u) => (u === fail ? rtt(u, nearest(u, alive)) : LOCAL)), data: alive, links: fail ? links.filter(([a, b]) => a !== fail && b !== fail) : links,
      lost: fail ? `the last ~1 s of ${RN[fail].split(" ")[0]} users' writes` : "nothing", down: fail ? `2–5 minutes, only for users homed in ${RN[fail].split(" ")[0]}` : "none",
      note: fail ? "Only the failed region's users are affected: a replica of their data elsewhere is promoted to be their new home." : "Each user reads and writes in their home region; copies go elsewhere asynchronously for disaster recovery. One writer per user: no conflicts." };
  }
  if (t === "multi") {
    const links: [R, R, "async"][] = [["us", "eu", "async"], ["eu", "as", "async"], ["us", "as", "async"]];
    return { read: map((u) => (u === fail ? rtt(u, nearest(u, alive)) : LOCAL)), write: map((u) => (u === fail ? rtt(u, nearest(u, alive)) : LOCAL)), data: alive, links: fail ? links.filter(([a, b]) => a !== fail && b !== fail) : links,
      lost: fail ? "writes not yet shipped are stuck until the region returns (and may then conflict)" : "nothing", down: fail ? "seconds (traffic simply goes elsewhere)" : "none",
      note: "Everyone writes locally to any item. Fastest everywhere, but two regions can change the same item at once: conflicts must be resolved (next page)." };
  }
  // consensus: replicas in all three; leader in US unless it fails (then EU)
  const leader: R = fail === "us" ? "eu" : "us";
  const quorumPeer = (l: R) => alive.filter((r) => r !== l).reduce((b, r) => (rtt(l, r) < rtt(l, b) ? r : b));
  const peer = quorumPeer(leader);
  return { read: map((u) => (u === fail ? rtt(u, nearest(u, alive)) : LOCAL)), write: map((u) => rtt(u, leader) + rtt(leader, peer) - LOCAL), data: alive,
    links: alive.filter((r) => r !== leader).map((r) => [leader, r, "sync"] as [R, R, "sync"]),
    lost: "nothing (a write counts only once a majority has it)", down: fail === "us" ? "~10 seconds (the survivors elect a new leader)" : fail ? "none" : "none",
    note: fail === "us" ? "Europe became leader. Its nearest partner is now Tokyo (220 ms away), so writes slow down until Iowa returns." : `Leader in Iowa; a write needs the leader plus one more region (${RN[peer].split(" ")[0]}). Reads can be served locally at a slightly older timestamp.` };
}
const POS: Record<R, [number, number]> = { us: [120, 90], eu: [300, 70], as: [480, 110] };
export function RegionFailover() {
  const [t, setT] = useState<Topo>("ap-async");
  const [fail, setFail] = useState<R | null>(null);
  const o = useMemo(() => topoOut(t, fail), [t, fail]);
  const fmt = (v: number | null) => (v === null ? "down" : `${v} ms`);
  const tone = (v: number | null) => (v === null ? "var(--color-bad)" : v > 150 ? "var(--color-warn)" : "var(--color-ok)");
  return (
    <Frame title="Lose a region" q="Iowa goes dark. What does each design lose, and how long are users down?"
      about="Users in three places. Pick a topology, then fail a region. Numbers are request round trips from each user group (assuming ~15 ms to a local region); the panel says what data is lost and how long recovery takes."
      foot={o.note}>
      <div className="space-y-3">
        <Predict q="Active-passive with asynchronous replication: Iowa (the primary) fails. What's lost?" options={["Nothing", "The last moment of writes not yet shipped", "Everything since last night"]} answer={1} why="Writes are confirmed before they're copied, so whatever was in flight is gone." />
        <Chips label="Topology" value={t} options={[["single", "One region"], ["ap-async", "Active-passive, async"], ["ap-sync", "Active-passive, sync"], ["home", "Home region per user"], ["multi", "Multi-leader, write anywhere"], ["consensus", "Consensus (Spanner-style)"]]} onChange={setT} />
        <div className="flex flex-wrap items-center gap-1.5"><span className="mr-1 text-[12px] text-faint">Fail</span>
          <Btn on={fail === null} onClick={() => setFail(null)}>No failure</Btn>
          {(["us", "eu", "as"] as R[]).map((r) => <Btn key={r} tone="bad" on={fail === r} onClick={() => setFail(r)}>{RN[r]}</Btn>)}
        </div>
        <div className="overflow-x-auto rounded-xl border border-line bg-[#0c0e15] p-2">
          <svg viewBox="0 0 600 170" style={{ width: "100%", minWidth: 480 }} role="img" aria-label="Regions and replication links">
            {o.links.map(([a, b, k], i) => (
              <motion.line key={`${a}${b}${i}`} x1={POS[a][0]} y1={POS[a][1]} x2={POS[b][0]} y2={POS[b][1]} stroke={k === "sync" ? "#c8f547" : "#7aa7ff"} strokeWidth={1.6}
                strokeDasharray="6 5" initial={{ strokeDashoffset: 0 }} animate={{ strokeDashoffset: -22 }} transition={{ repeat: Infinity, duration: k === "sync" ? 0.7 : 1.6, ease: "linear" }} />
            ))}
            {(Object.keys(POS) as R[]).map((r) => {
              const [x, y] = POS[r], dead = r === fail, has = o.data.includes(r);
              return (
                <g key={r}>
                  <circle cx={x} cy={y} r={30} fill={dead ? "#2a1418" : has ? "rgb(200 245 71 / .12)" : "#151826"} stroke={dead ? "#ff6b6b" : has ? "#c8f547" : "#2f3550"} strokeWidth={1.5} />
                  <text x={x} y={y - 2} textAnchor="middle" className="text-[10px] font-semibold" fill={dead ? "#ff6b6b" : "#e9ebf4"}>{dead ? "✕ down" : RN[r].split(" ")[0]}</text>
                  <text x={x} y={y + 11} textAnchor="middle" className="text-[8.5px]" fill="#8a90a8">{dead ? "" : has ? (t === "consensus" && r === (fail === "us" ? "eu" : "us") ? "leader + data" : "data") : "not used"}</text>
                </g>
              );
            })}
            <text x={300} y={160} textAnchor="middle" className="text-[9px]" fill="#5d637c">dashed lines: replication (green = waits for it, blue = in the background)</text>
          </svg>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-[12.5px]">
            <thead><tr className="text-left text-[10.5px] uppercase tracking-wider text-faint"><th className="py-1">Users in</th><th>Read</th><th>Write</th></tr></thead>
            <tbody>{(["us", "eu", "as"] as R[]).map((u) => <tr key={u} className="border-t border-line"><td className="py-1.5">{RN[u]}</td><td className="num font-semibold" style={{ color: tone(o.read[u]) }}>{fmt(o.read[u])}</td><td className="num font-semibold" style={{ color: tone(o.write[u]) }}>{fmt(o.write[u])}</td></tr>)}</tbody>
          </table>
        </div>
        <div className="grid gap-1.5 sm:grid-cols-2">
          <Stat k="Data lost (RPO)" v={<span className="text-[13px]">{o.lost}</span>} tone={o.lost.startsWith("nothing") ? "var(--color-ok)" : "var(--color-bad)"} />
          <Stat k="Downtime (RTO)" v={<span className="text-[13px]">{o.down}</span>} tone={o.down === "none" ? "var(--color-ok)" : "var(--color-warn)"} />
        </div>
      </div>
    </Frame>
  );
}

// ───────── CRDT lab ─────────
type Op = { r: "A" | "B"; ts: number; kind: "like" | "add" | "rem"; item?: string; tag?: string; seen?: string[] };
const BASE_LIKES = 10;
const BASE_TAGS: [string, string][] = [["milk", "m0"]];
function viewOf(ops: Op[]) {
  const tags = new Map<string, string>(BASE_TAGS.map(([i, t]) => [t, i]));
  let likes = BASE_LIKES;
  for (const o of ops) {
    if (o.kind === "like") likes++;
    if (o.kind === "add") tags.set(o.tag!, o.item!);
    if (o.kind === "rem") o.seen!.forEach((t) => tags.delete(t));
  }
  return { likes, items: [...new Set(tags.values())].sort(), tags };
}
type View = ReturnType<typeof viewOf>;
function Replica({ r, v, n, skew, act }: { r: "A" | "B"; v: View; n: number; skew: boolean; act: (r: "A" | "B", kind: Op["kind"], item?: string) => void }) {
  return (
    <div className="rounded-xl border border-line bg-bg p-3">
      <div className="flex items-baseline justify-between"><span className="display text-[14px] font-semibold">Replica {r} <span className="text-[11.5px] font-normal text-faint">({r === "A" ? "Europe" : "US"})</span></span><span className="num text-[11px] text-faint">{r === "B" && skew ? "clock +5 s fast" : "clock ok"}</span></div>
      <div className="mt-2 text-[13px]">Likes: <span className="num font-semibold">{v.likes}</span></div>
      <div className="mt-1 flex flex-wrap gap-1 text-[12px]">Cart: {v.items.length ? v.items.map((i) => <span key={i} className="rounded-md border border-line px-1.5">{i}</span>) : <span className="text-faint">empty</span>}</div>
      <div className="mt-2 flex flex-wrap gap-1">
        <Btn onClick={() => act(r, "like")}>+1 like</Btn>
        <Btn onClick={() => act(r, "add", r === "A" ? "bread" : "eggs")}>add {r === "A" ? "bread" : "eggs"}</Btn>
        {v.items.includes("milk") ? <Btn onClick={() => act(r, "rem", "milk")}>remove milk</Btn> : <Btn onClick={() => act(r, "add", "milk")}>add milk</Btn>}
      </div>
      <div className="mt-2 text-[11px] text-faint">{n} change{n === 1 ? "" : "s"} since the network split</div>
    </div>
  );
}
const Row = ({ name, likes, items, note, bad }: { name: string; likes: string; items: string; note: string; bad: boolean }) => (
  <tr className="border-t border-line align-top"><td className="py-1.5 pr-2 font-semibold">{name}</td><td className="num pr-2">{likes}</td><td className="pr-2">{items}</td><td className={cn("text-[12px]", bad ? "text-bad" : "text-ok")}>{note}</td></tr>
);
export function CrdtLab() {
  const [ops, setOps] = useState<Op[]>([]);
  const [skew, setSkew] = useState(false);
  const [synced, setSynced] = useState(false);
  const clock = ops.length + 1;
  const mine = (r: "A" | "B") => ops.filter((o) => o.r === r);
  const act = (r: "A" | "B", kind: Op["kind"], item?: string) => {
    setSynced(false);
    const ts = clock + (r === "B" && skew ? 5 : 0);
    if (kind === "rem") { const v = viewOf(mine(r)); setOps([...ops, { r, ts, kind, item, seen: [...v.tags].filter(([, i]) => i === item).map(([t]) => t) }]); return; }
    setOps([...ops, { r, ts, kind, item, tag: kind === "add" ? `${item![0]}${ops.length + 1}${r}` : undefined }]);
  };
  const A = viewOf(mine("A")), B = viewOf(mine("B"));
  const lastTs = (r: "A" | "B") => Math.max(0, ...mine(r).map((o) => o.ts));
  const res = useMemo(() => {
    const aTs = lastTs("A"), bTs = lastTs("B");
    const lwwWin = !mine("A").length ? "B" : !mine("B").length ? "A" : bTs > aTs ? "B" : "A";
    const lww = lwwWin === "A" ? A : B;
    const aChanged = mine("A").length > 0, bChanged = mine("B").length > 0;
    const vv = { A: mine("A").length, B: mine("B").length };
    const union = [...new Set([...A.items, ...B.items])].sort();
    const crdt = viewOf(ops); // OR-set: all adds minus observed removes; G-counter: base + all increments
    const trueLikes = BASE_LIKES + ops.filter((o) => o.kind === "like").length;
    return { lwwWin, lww, aChanged, bChanged, vv, union, crdt, trueLikes };
  }, [ops]); // eslint-disable-line react-hooks/exhaustive-deps
  const lostLikes = res.trueLikes - res.lww.likes;
  const milkResurrected = res.union.includes("milk") && !res.crdt.items.includes("milk");
  return (
    <Frame title="Same edits, three ways to merge" q="Europe and the US can't talk. Both change the like count and the shared cart. What happens when they reconnect?"
      about="Make changes on each replica while the network is split, then press Reconnect. The table merges the same edits with last-writer-wins, with version vectors (keep both, let the app merge by union) and with CRDTs (a G-counter and an observed-remove set)."
      foot="Last-writer-wins converges but silently drops the other side's changes, and trusts clocks. Version vectors notice the conflict but leave the merge to the app, where a naive union brings back removed items. CRDTs keep every increment and honour removes, with no coordination.">
      <div className="space-y-3">
        <Predict q="Each replica adds one like, starting from 10. What does last-writer-wins end with?" options={["12", "11", "10"]} answer={1} why="Each side writes the whole value 11; one of the two writes wins, so one like disappears." />
        <div className="grid gap-2 sm:grid-cols-2"><Replica r="A" v={A} n={mine("A").length} skew={skew} act={act} /><Replica r="B" v={B} n={mine("B").length} skew={skew} act={act} /></div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Btn on onClick={() => setSynced(true)} disabled={!ops.length}>Reconnect and merge</Btn>
          <Btn on={skew} onClick={() => { setSkew(!skew); setSynced(false); }}>US clock 5 s fast</Btn>
          <Btn onClick={() => { setOps([]); setSynced(false); }}>Reset</Btn>
        </div>
        {synced && (
          <div className="overflow-x-auto rounded-xl border border-line bg-bg p-3">
            <table className="w-full min-w-[520px] text-[12.5px]">
              <thead><tr className="text-left text-[10.5px] uppercase tracking-wider text-faint"><th className="py-1">Strategy</th><th>Likes</th><th>Cart</th><th>What happened</th></tr></thead>
              <tbody>
                <Row name="Last-writer-wins" likes={String(res.lww.likes)} items={res.lww.items.join(", ") || "empty"} bad={lostLikes > 0 || (res.aChanged && res.bChanged)}
                  note={res.aChanged && res.bChanged ? `Replica ${res.lwwWin}'s last write had the later timestamp${skew && res.lwwWin === "B" ? " (thanks to its fast clock)" : ""}; everything replica ${res.lwwWin === "A" ? "B" : "A"} did is gone${lostLikes ? `, including ${lostLikes} like${lostLikes > 1 ? "s" : ""}` : ""}.` : "Only one side changed, so nothing conflicted."} />
                <Row name="Version vectors" likes={res.aChanged && res.bChanged ? `${A.likes} | ${B.likes}` : String(res.crdt.likes)} items={res.aChanged && res.bChanged ? res.union.join(", ") || "empty" : res.crdt.items.join(", ") || "empty"} bad={res.aChanged && res.bChanged && milkResurrected}
                  note={res.aChanged && res.bChanged ? `{A:${res.vv.A}, B:0} vs {A:0, B:${res.vv.B}}: concurrent. Both versions kept as siblings; the app picked the union for the cart${milkResurrected ? ", which brought back the removed milk" : ""}${A.likes !== B.likes ? ", and must still decide the like count (it can't tell what the base was)" : ""}.` : "One version includes the other: keep the newer, no conflict."} />
                <Row name="CRDTs" likes={String(res.crdt.likes)} items={res.crdt.items.join(", ") || "empty"} bad={false}
                  note={`Every like counted (${res.crdt.likes - BASE_LIKES} added). Removes deleted only the additions they had seen${res.crdt.items.includes("milk") && ops.some((o) => o.kind === "rem") ? "; a concurrent 'add milk' survived" : ""}. Both replicas now hold exactly this.`} />
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Frame>
  );
}

// ───────── RPO / RTO timeline ─────────
type Strat = "nightly" | "pitr" | "replica" | "replica-pitr" | "consensus" | "consensus-pitr";
type Dis = "region" | "corrupt";
const STRATS: [Strat, string, string][] = [
  ["nightly", "Nightly backup", "$"], ["pitr", "Backups + log shipping (PITR)", "$$"], ["replica", "Async replica in another region", "$$$"],
  ["replica-pitr", "Async replica + PITR", "$$$"], ["consensus", "Consensus replicas (3 regions)", "$$$$"], ["consensus-pitr", "Consensus + PITR", "$$$$"],
];
const hh = (h: number) => `${String(Math.floor(h) % 24).padStart(2, "0")}:${String(Math.round((h % 1) * 60) % 60).padStart(2, "0")}`;
const dur = (h: number) => (h < 1 / 60 ? `${Math.max(1, Math.round(h * 3600))} s` : h < 1 ? `${Math.round(h * 60)} min` : `${h.toFixed(1)} h`);
export function RpoRto() {
  const [s, setS] = useState<Strat>("nightly");
  const [d, setD] = useState<Dis>("region");
  const [at, setAt] = useState(15.5);
  const r = useMemo(() => {
    const hasPitr = s === "nightly" || s.includes("pitr");
    const sinceBackup = (at - 2 + 24) % 24;
    if (d === "region") {
      if (s === "nightly") return { lost: sinceBackup, down: 1.7, ok: false, why: "Everything written since the 02:00 backup is gone; restoring 2 TB takes about 70 minutes plus provisioning." };
      if (s === "pitr") return { lost: 5 / 60, down: 2, ok: true, why: "Logs shipped every 5 minutes: at most 5 minutes lost. Restore + replay ≈ 2 h." };
      if (s.startsWith("replica")) return { lost: 2 / 3600, down: 5 / 60, ok: true, why: "The replica was ~2 s behind; promoting it takes a few minutes." };
      return { lost: 0, down: 10 / 3600, ok: true, why: "A write counted only once two regions had it; survivors elect a leader in seconds." };
    }
    // logical corruption at `at`, noticed 20 minutes later
    if (!hasPitr) return { lost: Infinity, down: Infinity, ok: false, why: "Every replica applied the bad migration within seconds. With no backups, there's no copy from before the damage." };
    if (s === "nightly") return { lost: sinceBackup, down: 1.7, ok: false, why: "The newest clean copy is 02:00's backup: hours of good writes are lost (or must be re-entered)." };
    return { lost: 1 / 3600, down: 1.5, ok: true, why: "Restore to one second before the migration into a new instance, copy the damaged table back. Other writes made since are kept." };
  }, [s, d, at]);
  const W = 600, x = (h: number) => 20 + (h / 24) * (W - 40);
  const lostStart = Number.isFinite(r.lost) ? Math.max(0, at - r.lost) : 0;
  const downEnd = Number.isFinite(r.down) ? Math.min(24, at + (d === "corrupt" ? 1 / 3 : 0) + r.down) : 24;
  return (
    <Frame title="What a disaster costs you" q="A disaster strikes mid-afternoon. How much data is lost, and how long are you down?"
      about="A 2 TB orders database. Choose the protection, the kind of disaster and when it happens. Red is data lost (RPO); amber is downtime (RTO). The corruption case is a bad migration that's noticed 20 minutes later."
      foot={r.why}>
      <div className="space-y-3">
        <Predict q="Synchronous consensus replicas across three regions, no backups. A bad migration corrupts a table. What can you recover?" options={["Everything, replicas are perfect", "Nothing from before the corruption", "The last 5 minutes"]} answer={1} why="Replicas copy the damage too. Only a copy from before the change (a backup or PITR) helps." />
        <Chips label="Protection" value={s} options={STRATS.map(([k, n]) => [k, n] as [Strat, string])} onChange={setS} />
        <Chips label="Disaster" value={d} options={[["region", "Region destroyed"], ["corrupt", "Bad migration corrupts data"]]} onChange={setD} />
        <label className="block max-w-xs text-[12.5px] text-mute">Disaster at <span className="num font-semibold text-text">{hh(at)}</span>
          <input type="range" min={3} max={23} step={0.25} value={at} onChange={(e) => setAt(+e.target.value)} className="w-full" />
        </label>
        <div className="overflow-x-auto rounded-xl border border-line bg-bg p-2">
          <svg viewBox={`0 0 ${W} 90`} style={{ width: "100%", minWidth: 500 }} role="img" aria-label="Timeline of data lost and downtime">
            <line x1={x(0)} x2={x(24)} y1={45} y2={45} stroke="#2f3550" strokeWidth={6} strokeLinecap="round" />
            {[0, 6, 12, 18, 24].map((h) => <text key={h} x={x(h)} y={84} textAnchor="middle" className="text-[9px]" fill="#5d637c">{hh(h)}</text>)}
            {(s === "nightly" || s.includes("pitr")) && <g><circle cx={x(2)} cy={45} r={5} fill="#7aa7ff" /><text x={x(2)} y={30} textAnchor="middle" className="text-[9px]" fill="#7aa7ff">backup</text></g>}
            {s.includes("pitr") ? <line x1={x(2)} x2={x(at)} y1={55} y2={55} stroke="#7aa7ff" strokeDasharray="2 3" /> : null}
            {(s.startsWith("replica") || s.startsWith("consensus")) && <line x1={x(0)} x2={x(at)} y1={37} y2={37} stroke="#4fd1c5" strokeWidth={1.2} />}
            <motion.rect y={40} height={10} fill="#ff6b6b" animate={{ x: x(lostStart), width: Math.max(2, x(at) - x(lostStart)) }} />
            <motion.rect y={40} height={10} fill="#ffc857" opacity={0.8} animate={{ x: x(at), width: Math.max(2, x(downEnd) - x(at)) }} />
            <line x1={x(at)} x2={x(at)} y1={18} y2={66} stroke="#ff6b6b" strokeWidth={1.5} />
            <text x={x(at)} y={14} textAnchor="middle" className="text-[9.5px] font-semibold" fill="#ff6b6b">{d === "region" ? "region lost" : "bad migration"}</text>
            <text x={20} y={70} className="text-[8.5px]" fill="#5d637c">{s.startsWith("replica") || s.startsWith("consensus") ? "teal: live replica" : ""}{s.includes("pitr") ? "   blue dots: logs shipped every 5 min" : ""}</text>
          </svg>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <Stat k="Data lost (RPO)" v={Number.isFinite(r.lost) ? (r.lost === 0 ? "none" : dur(r.lost)) : "unrecoverable"} tone={r.ok ? "var(--color-ok)" : "var(--color-bad)"} />
          <Stat k={d === "region" ? "Down (RTO)" : "Time to repair (RTO)"} v={Number.isFinite(r.down) ? dur(r.down) : "—"} tone={r.down < 0.2 ? "var(--color-ok)" : "var(--color-warn)"} />
          <Stat k="Relative cost" v={STRATS.find((z) => z[0] === s)![2]} />
        </div>
      </div>
    </Frame>
  );
}
