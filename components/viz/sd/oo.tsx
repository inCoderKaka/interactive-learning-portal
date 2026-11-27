"use client";
/**
 * LLD visuals, chapter 1 (the interview framework): finding classes in a prompt, the six class relationships,
 * and a clickable state machine (configs shared with later chapters).
 */
import { useMemo, useState } from "react";
import { Btn, Chips, Frame } from "./kit";
import { cn } from "../../ui";

// ───────────────────────── noun-verb ─────────────────────────

type Tag = "n" | "f" | "x" | "v" | "t";
const TAG: Record<Tag, { name: string; color: string; becomes: string }> = {
  n: { name: "Noun → class", color: "#7aa7ff", becomes: "class" },
  f: { name: "Noun → just a field", color: "#9aa3b8", becomes: "field" },
  x: { name: "Out of scope", color: "#ff6b6b", becomes: "dropped" },
  v: { name: "Verb → method", color: "#c8f547", becomes: "method" },
  t: { name: "\"Types of\" / changing rule → enum or interface", color: "#ffb454", becomes: "enum / interface" },
};
// [word|tag:what it becomes]
const PROMPTS: Record<string, { title: string; text: string }> = {
  library: {
    title: "Library",
    text: "A [member|n:Member (entity with an id, a member type and current loans)] can [search|x:Search is out of scope for this interview: say so] the catalogue and [borrow|v:LendingService.borrow(member, copy): touches a member, a copy and a new loan, so a coordinating service owns it] a [copy|n:BookCopy (the physical item, with a status)] of a [book|n:Book (title, author, ISBN: shared by all its copies)]. Each [loan|n:Loan (links member and copy, holds the dates and the returned flag)] has a [due date|f:A field of Loan, not a class]. [Students|t:MemberType enum, or a LoanPolicy interface if limits differ per type] may hold 3 books and [staff|t:Another MemberType value] may hold 10. Members [return|v:LendingService.giveBack(copy) → the fine] copies and [pay|v:Member.payFine(amount) or a FineService] a [fine|f:A Money value returned by FinePolicy.fine(loan, today), not a class] if late; [fines are computed per day and the rate may change|t:FinePolicy interface: the rule varies, so it goes behind an interface]. A member can [reserve|v:LendingService.reserve(member, book) → Reservation] a book whose copies are all out. The [librarian|n:Librarian (actor; often just a role on a staff account)] [adds|v:Catalogue.addBook / addCopy] books and copies. [Reminder emails|x:Notifications are out of scope; mention a Notifier interface] are sent before the due date.",
  },
  parking: {
    title: "Parking lot",
    text: "A parking [lot|n:ParkingLot (the coordinator: owns floors, gates and the active tickets)] has several [floors|n:ParkingFloor (owns its spots: composition)], each with [spots|n:ParkingSpot (id, size, the parked vehicle)] of [three sizes|t:SpotSize enum {SMALL, REGULAR, LARGE}]. [Bikes, cars and trucks|t:VehicleType enum, each knowing the spot size it needs] [enter|v:ParkingLot.park(vehicle) → Ticket] through any of the [entry gates|n:EntryGate (only if gates have behaviour, e.g. a display; otherwise an id on the ticket)], get a [ticket|n:Ticket (id, spot, vehicle, entry time)] with the [entry time|f:A field of Ticket], and [pay|v:ParkingLot.exit(ticketId) → fee, via PricingStrategy] at exit. [The hourly rate is different on weekends|t:PricingStrategy interface: HourlyPricing, WeekendPricing…]. [Display boards|n:DisplayBoard (an observer of availability changes)] show free spots per floor. The [owner|x:Admin and reporting are out of scope] wants monthly reports.",
  },
  vending: {
    title: "Vending machine",
    text: "A [vending machine|n:VendingMachine (holds the current state, the balance and the slots)] sells [products|n:Product (name, price)] from [slots|n:Slot (product, count: the machine owns them)]. A [customer|x:An actor, not a class inside the machine] [selects|v:VendingMachine.select(code)] a product and [inserts|v:VendingMachine.insert(coin)] [coins|t:Coin enum {NICKEL, DIME, QUARTER, DOLLAR} with their values] until the [balance|f:A field of VendingMachine] covers the [price|f:A field of Product]; the machine [dispenses|v:VendingMachine.dispense() (internal step of select/insert)] the item and [returns change|v:ChangeMaker.makeChange(amount): a separate job]. The customer may [cancel|v:VendingMachine.cancel() → refund]. [When the machine is out of the item, has no change, or is waiting for money, the buttons behave differently|t:State: Idle, HasMoney, Dispensing, SoldOut: an enum or the State pattern]. An [operator|n:Operator (actor) using restock(slot, count) and collectCash()] [restocks|v:VendingMachine.restock(code, count)] it.",
  },
};

type Tok = { w: string; tag?: Tag; info?: string };
function parse(text: string) {
  const out: Tok[] = [];
  const re = /\[([^|\]]+)\|([nfxvt]):([^\]]+)\]/g;
  let last = 0, m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ w: text.slice(last, m.index) });
    out.push({ w: m[1], tag: m[2] as Tag, info: m[3] });
    last = re.lastIndex;
  }
  out.push({ w: text.slice(last) });
  return out;
}

export function NounVerb() {
  const [pk, setPk] = useState<keyof typeof PROMPTS>("library");
  const [show, setShow] = useState<Record<Tag, boolean>>({ n: true, f: true, x: true, v: true, t: true });
  const [pick, setPick] = useState<number | null>(null);
  const toks = useMemo(() => parse(PROMPTS[pk].text), [pk]);
  const classes = toks.flatMap((t) => (t.tag === "n" ? [t.info!.split(" (")[0]] : []));
  const methods = toks.flatMap((t) => (t.tag === "v" ? [t.info!.split(":")[0].split(" →")[0]] : []));
  const kinds = toks.flatMap((t) => (t.tag === "t" ? [t.info!.split(":")[0]] : []));
  const sel = pick !== null ? toks[pick] : null;
  return (
    <Frame title="From a prompt to classes" q="Which words in a prompt become classes, which become methods, and which should be thrown away?"
      about="Each underlined word is tagged by what it becomes. Click one to see why. Turn tag kinds off to see each list on its own."
      foot="The habit: nouns are candidates, not decisions. Fields, synonyms and out-of-scope nouns are pruned; verbs land on the class that has the data; anything described as 'types of' or 'may change' goes behind an enum or an interface.">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Chips value={pk} onChange={(k) => { setPk(k); setPick(null); }} options={Object.entries(PROMPTS).map(([k, p]) => [k, p.title]) as [keyof typeof PROMPTS, string][]} label="Prompt" />
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(TAG) as Tag[]).map((k) => (
            <button key={k} onClick={() => setShow((s) => ({ ...s, [k]: !s[k] }))} className={cn("rounded-lg border px-2 py-0.5 text-[11.5px] transition", show[k] ? "border-line text-text" : "border-line/50 text-faint line-through")}>
              <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: TAG[k].color }} />{TAG[k].name}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-3 rounded-xl border border-line bg-bg p-3.5 text-[14.5px] leading-[1.9]">
        {toks.map((t, i) => t.tag && show[t.tag]
          ? <button key={i} onClick={() => setPick(i)} className={cn("rounded px-0.5 underline decoration-2 underline-offset-4 transition", pick === i && "bg-panel2")} style={{ textDecorationColor: TAG[t.tag].color, color: t.tag === "x" ? "#ff9b9b" : undefined }}>{t.w}</button>
          : <span key={i}>{t.w}</span>)}
      </p>
      <div className="mt-2 min-h-[44px] rounded-xl border border-line bg-panel2/40 px-3 py-2 text-[13px]">
        {sel?.tag ? <><span className="font-semibold" style={{ color: TAG[sel.tag].color }}>"{sel.w}" → {TAG[sel.tag].becomes}:</span> <span className="text-mute">{sel.info}</span></> : <span className="text-faint">Click an underlined word.</span>}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {[["Classes", classes, "#7aa7ff"], ["Methods", methods, "#c8f547"], ["Enums / interfaces", kinds, "#ffb454"]].map(([h, xs, c]) => (
          <div key={h as string} className="rounded-xl border border-line bg-bg p-2.5">
            <div className="text-[10.5px] uppercase tracking-wider" style={{ color: c as string }}>{h as string}</div>
            <ul className="mt-1 space-y-0.5 font-mono text-[12px]">{(xs as string[]).map((x) => <li key={x}>{x}</li>)}</ul>
          </div>
        ))}
      </div>
    </Frame>
  );
}

// ───────────────────────── rel-lab ─────────────────────────

type Rel = "dependency" | "association" | "aggregation" | "composition" | "inheritance" | "realisation";
const RELS: Record<Rel, { a: string; b: string; read: string; line: "solid" | "dashed"; head: "arrow" | "triangle" | "none"; diamond?: "hollow" | "filled"; code: string; del: string; parts: "die" | "live" | "na"; mult?: [string, string] }> = {
  dependency: { a: "PricingStrategy", b: "Ticket", read: "PricingStrategy uses a Ticket for one call.", line: "dashed", head: "arrow", code: "interface PricingStrategy {\n  long feeCents(Ticket t, Instant exit);   // parameter only\n}", del: "Nothing to delete: the strategy never stored the ticket. It only needed it during fee().", parts: "na" },
  association: { a: "Ticket", b: "ParkingSpot", read: "A Ticket knows (stores) the spot it was issued for.", line: "solid", head: "arrow", code: "record Ticket(String id,\n              ParkingSpot spot,      // a field: lasting reference\n              Instant entry) {}", del: "Deleting the ticket leaves the spot untouched: the spot never belonged to the ticket.", parts: "live", mult: ["*", "1"] },
  aggregation: { a: "Team", b: "Employee", read: "A Team has Employees, but they exist on their own.", line: "solid", head: "none", diamond: "hollow", code: "final class Team {\n  private final List<Employee> members;\n  Team(List<Employee> members) {   // created elsewhere, passed in\n    this.members = List.copyOf(members);\n  }\n}", del: "The team is disbanded; the employees are still employees and can join another team.", parts: "live", mult: ["1", "*"] },
  composition: { a: "ParkingFloor", b: "ParkingSpot", read: "A Floor owns its Spots: they live and die with it.", line: "solid", head: "none", diamond: "filled", code: "final class ParkingFloor {\n  private final List<ParkingSpot> spots = new ArrayList<>();\n  ParkingFloor(int n) {             // the whole creates its parts\n    for (int i = 0; i < n; i++) spots.add(new ParkingSpot(i));\n  }\n  // never hands a spot to anyone who keeps it\n}", del: "The floor is demolished, so its spots cease to exist: they must also leave the availability index.", parts: "die", mult: ["1", "1..*"] },
  inheritance: { a: "Truck", b: "Vehicle", read: "A Truck is a Vehicle: usable anywhere a Vehicle is expected.", line: "solid", head: "triangle", code: "abstract class Vehicle { abstract SpotSize needs(); }\nfinal class Truck extends Vehicle {\n  SpotSize needs() { return SpotSize.LARGE; }\n}", del: "Not about lifetime: a Truck object is one object that is also a Vehicle. The test is substitutability.", parts: "na" },
  realisation: { a: "HourlyPricing", b: "PricingStrategy", read: "HourlyPricing promises to behave like a PricingStrategy.", line: "dashed", head: "triangle", code: "final class HourlyPricing implements PricingStrategy {\n  public long feeCents(Ticket t, Instant exit) { ... }\n}", del: "Not about lifetime: any class implementing the interface can be plugged in where the interface is used.", parts: "na" },
};

export function RelLab() {
  const [r, setR] = useState<Rel>("composition");
  const [gone, setGone] = useState(false);
  const x = RELS[r];
  const W = 520, H = 150, ax = 40, bx = 330, bw = 150, y = 45;
  const x1 = ax + bw, x2 = bx;
  const partsShown = x.parts !== "na";
  return (
    <Frame title="The six relationships" q="What does each line on a class diagram mean, and what happens to the parts when the whole goes away?"
      about="Pick a relationship to see its notation, a real example and the Java it becomes. For the 'has' relationships, delete the whole and watch what survives."
      foot="Composition and aggregation are both just fields in Java. The difference is who creates the parts, whether anyone else may hold them, and what deleting the whole must do.">
      <Chips value={r} onChange={(k) => { setR(k); setGone(false); }} options={(Object.keys(RELS) as Rel[]).map((k) => [k, k[0].toUpperCase() + k.slice(1)])} label="Relationship" />
      <div className="mt-3 grid gap-3 lg:grid-cols-[1.1fr_1fr]">
        <div className="rounded-xl border border-line bg-bg p-2">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${x.a} ${r} ${x.b}`}>
            <defs>
              <marker id="oo-arrow" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10" fill="none" stroke="#c9d1e6" strokeWidth="1.4" /></marker>
              <marker id="oo-tri" markerWidth="14" markerHeight="14" refX="13" refY="7" orient="auto"><path d="M0,0 L13,7 L0,14 Z" fill="#11141c" stroke="#c9d1e6" strokeWidth="1.4" /></marker>
            </defs>
            <g opacity={gone ? 0.15 : 1} style={{ transition: "opacity .5s" }}>
              <rect x={ax} y={y} width={bw} height={56} rx={8} fill="#161a24" stroke="#7aa7ff" />
              <text x={ax + bw / 2} y={y + 33} textAnchor="middle" fontSize="14" fill="#e6ebf5" fontWeight={600}>{x.a}</text>
            </g>
            <g opacity={gone && x.parts === "die" ? 0.12 : 1} style={{ transition: "opacity .5s" }}>
              <rect x={bx} y={y} width={bw} height={56} rx={8} fill="#161a24" stroke={x.parts === "die" && gone ? "#ff6b6b" : "#4fd1c5"} />
              <text x={bx + bw / 2} y={y + 33} textAnchor="middle" fontSize="14" fill="#e6ebf5" fontWeight={600}>{x.b}</text>
            </g>
            {!(gone && partsShown) && (
              <line x1={x.diamond ? x1 + 18 : x1} y1={y + 28} x2={x.head === "none" ? x2 : x2 - 2} y2={y + 28} stroke="#c9d1e6" strokeWidth={1.6} strokeDasharray={x.line === "dashed" ? "6 5" : undefined}
                markerEnd={x.head === "arrow" ? "url(#oo-arrow)" : x.head === "triangle" ? "url(#oo-tri)" : undefined} />
            )}
            {x.diamond && !(gone && partsShown) && <path d={`M${x1},${y + 28} l9,-7 l9,7 l-9,7 Z`} fill={x.diamond === "filled" ? "#c9d1e6" : "#11141c"} stroke="#c9d1e6" strokeWidth={1.4} />}
            {x.mult && !gone && <><text x={x1 + 24} y={y + 20} fontSize="12" fill="#9aa3b8">{x.mult[0]}</text><text x={x2 - 30} y={y + 20} fontSize="12" fill="#9aa3b8">{x.mult[1]}</text></>}
            {gone && partsShown && <text x={W / 2} y={y + 95} textAnchor="middle" fontSize="12.5" fill={x.parts === "die" ? "#ff8f8f" : "#5be49b"}>{x.parts === "die" ? `${x.b}s destroyed with the ${x.a}` : `${x.b} still exists`}</text>}
            <text x={W / 2} y={H - 8} textAnchor="middle" fontSize="12" fill="#9aa3b8">{x.read}</text>
          </svg>
          {partsShown && <div className="mt-1 flex gap-1.5"><Btn tone="bad" onClick={() => setGone(true)} disabled={gone}>Delete the {x.a}</Btn><Btn onClick={() => setGone(false)} disabled={!gone}>Undo</Btn></div>}
          {gone && <p className="mt-2 text-[13px] leading-relaxed text-mute">{x.del}</p>}
          {!partsShown && <p className="mt-2 text-[13px] leading-relaxed text-mute">{x.del}</p>}
        </div>
        <pre className="code overflow-x-auto rounded-xl border border-line bg-bg p-3 text-[12px] leading-relaxed">{x.code}</pre>
      </div>
    </Frame>
  );
}

// ───────────────────────── state-lab ─────────────────────────

type Vars = Record<string, number>;
type Tr = { from: string; ev: string; to: string; guard?: (v: Vars, arg: number) => boolean; gtext?: string; act?: (v: Vars, arg: number) => string | void; atext?: string };
type Machine = { title: string; q: string; about: string; foot: string; start: string; states: { id: string; x: number; y: number; final?: boolean }[]; events: { ev: string; label: string; arg?: number }[]; trs: Tr[]; vars?: Vars; show?: (v: Vars) => string };

const MACHINES: Record<string, Machine> = {
  "state-lab": {
    title: "An order's lifecycle",
    q: "Which events are legal in each state, and what should the code do with an illegal one?",
    about: "Send events to the order. Legal ones move it along an arrow; illegal ones are rejected, exactly as the code's state checks would.",
    foot: "Everything not drawn is forbidden. In code this is a whitelist: each operation checks that the current state is one it may run from, and throws IllegalStateException otherwise. Notice that 'pay' twice is rejected, and that cancel after payment also refunds.",
    start: "CREATED",
    states: [{ id: "CREATED", x: 90, y: 60 }, { id: "PAID", x: 290, y: 60 }, { id: "SHIPPED", x: 490, y: 60 }, { id: "DELIVERED", x: 680, y: 60, final: true }, { id: "CANCELLED", x: 190, y: 180, final: true }],
    events: [{ ev: "pay", label: "pay()" }, { ev: "ship", label: "ship()" }, { ev: "deliver", label: "deliver()" }, { ev: "cancel", label: "cancel()" }],
    trs: [
      { from: "CREATED", ev: "pay", to: "PAID", atext: "charge card" },
      { from: "PAID", ev: "ship", to: "SHIPPED", atext: "hand to courier" },
      { from: "SHIPPED", ev: "deliver", to: "DELIVERED" },
      { from: "CREATED", ev: "cancel", to: "CANCELLED" },
      { from: "PAID", ev: "cancel", to: "CANCELLED", atext: "refund" },
    ],
  },
  "vending-state": {
    title: "A vending machine's states",
    q: "Why does the same button do different things depending on the machine's state?",
    about: "Insert coins, select, cancel. Guards (in brackets) check the balance; actions (after the slash) dispense or refund. Item price: 75¢, 2 left in stock.",
    foot: "Each state answers every event differently: 'select' in Idle says 'insert money first', in HasMoney it dispenses if the balance covers the price. When behaviour per state grows like this, the State pattern gives each state its own class.",
    start: "Idle",
    vars: { balance: 0, stock: 2 },
    show: (v) => `balance ${v.balance}¢ · stock ${v.stock}`,
    states: [{ id: "Idle", x: 100, y: 120 }, { id: "HasMoney", x: 380, y: 120 }, { id: "SoldOut", x: 660, y: 120, final: true }],
    events: [{ ev: "coin", label: "insert 25¢", arg: 25 }, { ev: "select", label: "select()" }, { ev: "cancel", label: "cancel()" }],
    trs: [
      { from: "Idle", ev: "coin", to: "HasMoney", act: (v, a) => { v.balance += a; }, atext: "balance += coin" },
      { from: "HasMoney", ev: "coin", to: "HasMoney", act: (v, a) => { v.balance += a; }, atext: "balance += coin" },
      { from: "HasMoney", ev: "select", to: "SoldOut", guard: (v) => v.balance >= 75 && v.stock === 1, gtext: "balance ≥ 75 ∧ last item", act: (v) => { const c = v.balance - 75; v.balance = 0; v.stock -= 1; return `dispensed, change ${c}¢`; }, atext: "dispense" },
      { from: "HasMoney", ev: "select", to: "Idle", guard: (v) => v.balance >= 75 && v.stock > 1, gtext: "balance ≥ 75", act: (v) => { const c = v.balance - 75; v.balance = 0; v.stock -= 1; return `dispensed, change ${c}¢`; }, atext: "dispense" },
      { from: "HasMoney", ev: "cancel", to: "Idle", act: (v) => { const r = v.balance; v.balance = 0; return `refunded ${r}¢`; }, atext: "refund" },
    ],
  },
};

export function StateLab({ id = "state-lab" }: { id?: string }) {
  const m = MACHINES[id];
  const [cur, setCur] = useState(m.start);
  const [vars, setVars] = useState<Vars>({ ...(m.vars ?? {}) });
  const [log, setLog] = useState<{ ok: boolean; text: string }[]>([]);
  const [last, setLast] = useState<Tr | null>(null);
  const pos = (s: string) => m.states.find((x) => x.id === s)!;
  const send = (ev: string, arg = 0) => {
    const tr = m.trs.find((t) => t.from === cur && t.ev === ev && (!t.guard || t.guard(vars, arg)));
    if (!tr) {
      const anyFrom = m.trs.some((t) => t.from === cur && t.ev === ev);
      const why = anyFrom ? `guard failed in ${cur}${id === "vending-state" && ev === "select" ? ": insert more money" : ""}` : `${ev}() not allowed in ${cur}`;
      setLog((l) => [...l.slice(-7), { ok: false, text: `✗ ${why} → IllegalStateException` }]); setLast(null);
      return;
    }
    const v2 = { ...vars };
    const note = tr.act?.(v2, arg);
    setVars(v2); setCur(tr.to); setLast(tr);
    setLog((l) => [...l.slice(-7), { ok: true, text: `✓ ${ev}: ${tr.from} → ${tr.to}${note ? ` (${note})` : tr.atext ? ` / ${tr.atext}` : ""}` }]);
  };
  const reset = () => { setCur(m.start); setVars({ ...(m.vars ?? {}) }); setLog([]); setLast(null); };
  const W = 760, H = 240, BW = 112, BH = 38;
  // pair up transitions between the same two states so the labels don't overlap
  const edges = m.trs.reduce<{ from: string; to: string; labels: string[]; trs: Tr[] }[]>((acc, t) => {
    const e = acc.find((x) => x.from === t.from && x.to === t.to);
    const lab = `${t.ev}${t.gtext ? ` [${t.gtext}]` : ""}${t.atext ? `\n/ ${t.atext}` : ""}`;
    if (e) { e.labels.push(lab); e.trs.push(t); } else acc.push({ from: t.from, to: t.to, labels: [lab], trs: [t] });
    return acc;
  }, []);
  return (
    <Frame title={m.title} q={m.q} about={m.about} foot={m.foot}>
      <div className="rounded-xl border border-line bg-bg p-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`State machine, current state ${cur}`}>
          <defs><marker id={`sm-${id}`} markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" fill="#9aa3b8" /></marker></defs>
          {edges.map((e, i) => {
            const a = pos(e.from), b = pos(e.to);
            const hot = !!last && e.trs.includes(last);
            if (e.from === e.to) {
              return <g key={i}><path d={`M${a.x - 20},${a.y - BH / 2} C${a.x - 40},${a.y - 75} ${a.x + 40},${a.y - 75} ${a.x + 20},${a.y - BH / 2}`} fill="none" stroke={hot ? "#c8f547" : "#5a6275"} strokeWidth={hot ? 2.2 : 1.4} markerEnd={`url(#sm-${id})`} />
                <text x={a.x} y={a.y - 62} textAnchor="middle" fontSize="10.5" fill={hot ? "#c8f547" : "#9aa3b8"}>{e.labels.map((l) => l.replace("\n", " ")).join(" · ")}</text></g>;
            }
            const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
            const sx = a.x + ux * (Math.abs(ux) > 0.5 ? BW / 2 : BH / 1.2), sy = a.y + uy * (Math.abs(uy) > 0.5 ? BH / 2 : BH / 2.2);
            const ex = b.x - ux * (Math.abs(ux) > 0.5 ? BW / 2 + 2 : BH / 1.2), ey = b.y - uy * (Math.abs(uy) > 0.5 ? BH / 2 + 2 : BH / 2.2);
            const two = edges.some((o) => o.from === e.to && o.to === e.from), off = two ? 11 : 0;
            const px = -uy * off, py = ux * off;
            const mx = (sx + ex) / 2 + px, my = (sy + ey) / 2 + py;
            return <g key={i}>
              <line x1={sx + px} y1={sy + py} x2={ex + px} y2={ey + py} stroke={hot ? "#c8f547" : "#5a6275"} strokeWidth={hot ? 2.2 : 1.4} markerEnd={`url(#sm-${id})`} />
              {e.labels.flatMap((l) => l.split("\n")).map((l, j, all) => <text key={j} x={Math.abs(uy) > 0.3 ? mx + (ux < 0 ? -8 : 8) : mx} y={Math.abs(uy) > 0.3 ? my - (all.length - 1 - j) * 12 : py > 0 ? my + 14 + j * 12 : my - 6 - (all.length - 1 - j) * 12} textAnchor={Math.abs(uy) > 0.3 ? (ux < 0 ? "end" : "start") : "middle"} fontSize="10.5" fill={hot ? "#c8f547" : "#9aa3b8"}>{l}</text>)}
            </g>;
          })}
          {m.states.map((s) => (
            <g key={s.id}>
              <rect x={s.x - BW / 2} y={s.y - BH / 2} width={BW} height={BH} rx={19} fill={cur === s.id ? "rgba(200,245,71,.14)" : "#161a24"} stroke={cur === s.id ? "#c8f547" : s.final ? "#9aa3b8" : "#5a6275"} strokeWidth={cur === s.id ? 2 : 1.2} />
              {s.final && <rect x={s.x - BW / 2 + 3} y={s.y - BH / 2 + 3} width={BW - 6} height={BH - 6} rx={16} fill="none" stroke="#5a6275" strokeWidth={0.8} />}
              <text x={s.x} y={s.y + 4.5} textAnchor="middle" fontSize="12.5" fontWeight={600} fill={cur === s.id ? "#c8f547" : "#e6ebf5"}>{s.id}</text>
            </g>
          ))}
          {(() => { const s = pos(m.start); return <path d={`M${s.x - BW / 2 - 26},${s.y} L${s.x - BW / 2 - 3},${s.y}`} stroke="#9aa3b8" strokeWidth={1.4} markerEnd={`url(#sm-${id})`} />; })()}
        </svg>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {m.events.map((e) => <Btn key={e.ev + (e.arg ?? "")} onClick={() => send(e.ev, e.arg ?? 0)}>{e.label}</Btn>)}
        <Btn onClick={reset}>Reset</Btn>
        {m.show && <span className="ml-2 font-mono text-[12px] text-mute">{m.show(vars)}</span>}
      </div>
      <div className="mt-2 min-h-[64px] rounded-xl border border-line bg-panel2/40 p-2 font-mono text-[12px]">
        {log.length ? log.map((l, i) => <div key={i} className={l.ok ? "text-ok" : "text-bad"}>{l.text}</div>) : <span className="text-faint">Current state: {cur}. Send an event.</span>}
      </div>
    </Frame>
  );
}

export const VendingState = () => <StateLab id="vending-state" />;
