"use client";
// Interview Craft visuals (req3 Craft pass): level map, variance simulator, prep planner, parallel timeline, offer comparer,
// story-bank grid and the round clock. Data come from the research notes summarised on the Craft pages.
import { useEffect, useMemo, useState, type ComponentType } from "react";
import { cn } from "../ui";
import { Chips, Frame, Slider, Stat, gauss, pct, rand } from "./ai-kit";

const T = "var(--color-craft)";
const MID = "#7cc4ff";
const SEN = "#c8f547";
const BAD = "var(--color-bad)";

// ---------- level map ----------

type Co = { n: string; g: string; ladder: string[]; mid: string; sen: string; pay?: [number, number, number, number] };
// pay: India mid, India senior, US mid, US senior: median total pay, thousands of USD (levels.fyi, queried 2026-11-28)
const COS: Co[] = [
  { n: "Google", g: "Big tech", ladder: ["L3", "L4", "L5", "L6", "L7"], mid: "L4", sen: "L5", pay: [69, 126, 315, 417] },
  { n: "Amazon", g: "Big tech", ladder: ["SDE I (L4)", "SDE II (L5)", "SDE III (L6)", "Principal (L7)"], mid: "SDE II (L5)", sen: "SDE III (L6)", pay: [65, 135, 270, 371] },
  { n: "Meta", g: "Big tech", ladder: ["E3", "E4", "E5", "E6", "E7"], mid: "E4", sen: "E5", pay: [87, 125, 300, 430] },
  { n: "Microsoft", g: "Big tech", ladder: ["59–60", "61–62", "63–64", "65–67", "68"], mid: "61–62", sen: "63–64", pay: [66, 110, 215, 267] },
  { n: "Apple", g: "Big tech", ladder: ["ICT2", "ICT3", "ICT4", "ICT5", "ICT6"], mid: "ICT3", sen: "ICT4", pay: [78, 115, 238, 340] },
  { n: "Netflix", g: "Big tech", ladder: ["L3", "L4", "L5", "L6", "L7"], mid: "L4", sen: "L5", pay: [0, 0, 300, 515] },
  { n: "Uber", g: "Product", ladder: ["SWE I", "SWE II", "Senior (5a)", "Staff (5b)", "Sr Staff"], mid: "SWE II", sen: "Senior (5a)", pay: [75, 144, 265, 410] },
  { n: "Adobe", g: "Product", ladder: ["P10", "P20", "P30", "P40", "P50", "P60"], mid: "P30", sen: "P40", pay: [58, 77, 249, 266] },
  { n: "Salesforce", g: "Product", ladder: ["AMTS", "MTS", "SMTS", "LMTS", "PMTS"], mid: "SMTS", sen: "LMTS", pay: [86, 117, 262, 300] },
  { n: "Atlassian", g: "Product", ladder: ["P30", "P40", "P50", "P60", "P70"], mid: "P40", sen: "P50", pay: [72, 113, 252, 400] },
  { n: "LinkedIn", g: "Product", ladder: ["IC1", "IC2", "IC3", "IC4", "IC5"], mid: "IC2", sen: "IC3", pay: [68, 117, 252, 311] },
  { n: "Nvidia", g: "Product", ladder: ["IC1", "IC2", "IC3", "IC4", "IC5"], mid: "IC3", sen: "IC4", pay: [65, 89, 269, 336] },
  { n: "Oracle", g: "Product", ladder: ["IC-1", "IC-2", "IC-3", "IC-4", "IC-5"], mid: "IC-3", sen: "IC-4", pay: [41, 92, 220, 291] },
  { n: "Stripe", g: "Product", ladder: ["L1", "L2", "L3", "L4", "L5"], mid: "L2", sen: "L3", pay: [105, 162, 274, 420] },
  { n: "Databricks", g: "Product", ladder: ["L3", "L4", "L5", "L6", "L7"], mid: "L4", sen: "L5", pay: [111, 183, 413, 588] },
  { n: "Airbnb", g: "Product", ladder: ["G7", "G8", "G9", "G10", "G11"], mid: "G8", sen: "G9", pay: [94, 143, 300, 461] },
  { n: "Coinbase", g: "Product", ladder: ["IC3", "IC4", "IC5", "IC6", "IC7"], mid: "IC4", sen: "IC5", pay: [78, 120, 263, 395] },
  { n: "Goldman Sachs", g: "Finance", ladder: ["Analyst", "Associate", "VP", "ED", "MD"], mid: "Associate", sen: "VP" },
  { n: "Morgan Stanley", g: "Finance", ladder: ["Analyst", "Associate", "VP", "ED", "MD"], mid: "Associate", sen: "VP" },
  { n: "D. E. Shaw", g: "Finance", ladder: ["Member", "Senior Member", "Lead Member", "Principal"], mid: "Senior Member", sen: "Lead Member" },
  { n: "Flipkart", g: "India", ladder: ["SDE 1", "SDE 2", "SDE 3", "SDE 4", "Architect"], mid: "SDE 2", sen: "SDE 3" },
  { n: "PhonePe", g: "India", ladder: ["SE 1", "SE 2", "Senior SE", "Staff"], mid: "SE 2", sen: "Senior SE" },
  { n: "Swiggy", g: "India", ladder: ["L6 SE I", "L7 SE II", "L8 SE III", "L9"], mid: "L7 SE II", sen: "L8 SE III" },
  { n: "Razorpay", g: "India", ladder: ["SDE 1", "SDE 2", "Senior SDE", "Lead"], mid: "SDE 2", sen: "Senior SDE" },
];

function LevelMap() {
  const [pick, setPick] = useState<string[]>(["Google", "Amazon", "Meta", "Microsoft", "Flipkart", "Goldman Sachs"]);
  const [where, setWhere] = useState<"India" | "US">("India");
  const toggle = (n: string) => setPick((p) => (p.includes(n) ? p.filter((x) => x !== n) : [...p, n].slice(-8)));
  const rows = COS.filter((c) => pick.includes(c.n));
  const k = (v: number) => (v ? `${v}K` : "thin data");
  return (
    <Frame tone={T} title="Levels side by side" about="Tap companies to compare their ladders. Blue is the mid rung (Google L4 equivalent), lime the senior rung (Google L5 equivalent). Pay is median total pay in thousands of US dollars from levels.fyi (self-reported; use the ratio, not exact figures)."
      drive={() => [{ say: "Amazon's SDE II, Meta's E4 and Microsoft's 61 or 62 all sit at the mid rung, next to Google L4.", act: () => setPick(["Google", "Amazon", "Meta", "Microsoft"]) }, { say: "Banks use corporate titles: an Associate is mid, a Vice President is senior.", act: () => setPick(["Google", "Goldman Sachs", "Morgan Stanley"]) }]}>
      <div className="flex flex-wrap gap-1.5">
        {COS.map((c) => <button key={c.n} onClick={() => toggle(c.n)} className={cn("rounded-full border px-2.5 py-1 text-[12px] transition", pick.includes(c.n) ? "border-craft/60 bg-craft/15 text-text" : "border-line text-mute hover:text-text")}>{c.n}</button>)}
      </div>
      <div className="mt-3"><Chips tone={T} value={where} onChange={setWhere} options={[{ id: "India", label: "India pay" }, { id: "US", label: "US pay" }]} /></div>
      <div className="mt-3 space-y-2">
        {rows.map((c) => (
          <div key={c.n} className="rounded-xl border border-line bg-bg px-3 py-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-semibold">{c.n} <span className="text-[11px] font-normal text-faint">{c.g}</span></span>
              {c.pay && <span className="num text-[12px] text-mute">mid {k(where === "India" ? c.pay[0] : c.pay[2])} → senior {k(where === "India" ? c.pay[1] : c.pay[3])}</span>}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {c.ladder.map((l) => <span key={l} className="rounded-md border px-2 py-0.5 text-[12px]" style={l === c.mid ? { borderColor: MID, color: MID } : l === c.sen ? { borderColor: SEN, color: SEN } : { borderColor: "var(--color-line)", color: "var(--color-faint)" }}>{l}</span>)}
            </div>
          </div>
        ))}
        {!rows.length && <p className="text-sm text-faint">Pick a company above.</p>}
      </div>
      <p className="mt-3 text-[11.5px] text-faint">Mid/senior picks are inferred from titles and pay; no company publishes a cross-company map. Typical years: mid ≈ 2–4 (US) / 3–6 (India), senior ≈ 4–8 (US) / 6–10 (India).</p>
    </Frame>
  );
}

// ---------- interviewer variance simulator ----------

function VarianceSim() {
  const [skill, setSkill] = useState(3.1);
  const [noise, setNoise] = useState(0.7);
  const [rounds, setRounds] = useState(4);
  const [rule, setRule] = useState<"all" | "one" | "avg">("one");
  const res = useMemo(() => {
    const r = rand(7);
    let loops = 0, single = 0;
    const N = 4000;
    for (let i = 0; i < N; i++) {
      const s = Array.from({ length: rounds }, () => skill + noise * gauss(r));
      const pass = s.filter((x) => x >= 3).length;
      single += pass;
      const ok = rule === "all" ? pass === rounds : rule === "one" ? pass >= rounds - 1 : s.reduce((a, b) => a + b, 0) / rounds >= 3;
      if (ok) loops++;
    }
    return { loop: loops / N, round: single / (N * rounds) };
  }, [skill, noise, rounds, rule]);
  const atLeast = (n: number) => 1 - Math.pow(1 - res.loop, n);
  return (
    <Frame tone={T} title="How luck moves interview results" about="Each round scores your true skill plus interviewer and question noise on a 1–4 scale; 3 or more passes the round. Thousands of simulated loops show your chance per loop, and of at least one offer across several companies (assuming companies are independent, an upper bound)."
      drive={() => [{ say: "A candidate just above the bar, with typical noise and a strict every-round rule, fails many loops.", act: () => { setSkill(3.1); setNoise(0.7); setRule("all"); } }, { say: "With five companies, the chance of at least one offer climbs a lot.", act: () => setRule("one") }]}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Slider label="Your true skill (1–4)" value={skill} min={2.4} max={3.8} step={0.05} onChange={setSkill} fmt={(v) => v.toFixed(2)} hint="3.0 is exactly the bar" />
        <Slider label="Noise per round" value={noise} min={0.1} max={1.2} step={0.05} onChange={setNoise} fmt={(v) => v.toFixed(2)} hint="interviewer strictness, question fit, nerves" />
        <Slider label="Rounds in the loop" value={rounds} min={2} max={6} onChange={setRounds} />
        <div><div className="mb-1 text-[12.5px] text-mute">Company&apos;s rule</div>
          <Chips tone={T} value={rule} onChange={setRule} options={[{ id: "all", label: "every round must pass" }, { id: "one", label: "one weak round allowed" }, { id: "avg", label: "average ≥ bar" }]} /></div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat k="Pass one round" v={pct(res.round)} tone={MID} />
        <Stat k="Pass the loop" v={pct(res.loop)} tone={T} />
        <Stat k="≥1 offer from 5 companies" v={pct(atLeast(5))} tone={SEN} />
      </div>
      <div className="mt-4 flex h-28 items-end gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
          <div key={n} className="flex flex-1 flex-col items-center gap-1">
            <div className="num text-[10.5px] text-mute">{pct(atLeast(n))}</div>
            <div className="w-full rounded-t-md" style={{ height: `${Math.max(2, atLeast(n) * 80)}px`, background: `color-mix(in srgb, ${T} ${30 + n * 8}%, transparent)` }} />
            <div className="text-[10.5px] text-faint">{n}</div>
          </div>
        ))}
      </div>
      <p className="mt-1 text-center text-[11px] text-faint">companies applied to → chance of at least one offer</p>
    </Frame>
  );
}

// ---------- prep planner ----------

type Lvl = "mid" | "senior" | "ml";
const SPLIT: Record<Lvl, { coding: number; design: number; beh: number; ml: number }> = {
  mid: { coding: 0.65, design: 0.2, beh: 0.15, ml: 0 },
  senior: { coding: 0.4, design: 0.38, beh: 0.22, ml: 0 },
  ml: { coding: 0.33, design: 0.27, beh: 0.15, ml: 0.25 },
};

function PrepPlanner() {
  const [lvl, setLvl] = useState<Lvl>("mid");
  const [weeks, setWeeks] = useState(10);
  const [hours, setHours] = useState(12);
  const plan = useMemo(() => {
    const sp = SPLIT[lvl];
    const work = Math.max(1, weeks - 1); // last week is a buffer and taper
    const behStart = lvl === "mid" ? Math.ceil(work * 0.25) : 1;
    const mockStart = lvl === "mid" ? Math.ceil(work * 0.45) : Math.ceil(work * 0.25);
    const double = Math.max(1, Math.round(work * 0.2));
    return Array.from({ length: weeks }, (_, i) => {
      const w = i + 1;
      if (w === weeks) return { w, coding: hours * 0.3, design: hours * 0.15, beh: hours * 0.1, ml: lvl === "ml" ? hours * 0.1 : 0, mocks: 1, note: "Buffer and taper: catch up on slipped topics, light review, sleep." };
      const beh = w >= behStart ? sp.beh : 0;
      const spare = sp.beh - beh;
      const mocks = w >= work - double + 1 ? 2 : w >= mockStart ? 1 : 0;
      const note = w === 1 ? (lvl === "mid" ? "Pick one language; core patterns; re-solve from blank." : "Design out loud from week one; draft scope stories.") : w === behStart && lvl === "mid" ? "Start the story bank (six to eight stories)." : w === mockStart ? "Mocks start: weekly, real conditions." : w === work - double + 1 ? "Two mocks a week; company-specific prep." : "";
      return { w, coding: hours * (sp.coding + spare), design: hours * sp.design, beh: hours * beh, ml: hours * sp.ml, mocks, note };
    });
  }, [lvl, weeks, hours]);
  const total = weeks * hours;
  const codingTotal = plan.reduce((a, p) => a + p.coding, 0);
  const max = hours;
  return (
    <Frame tone={T} title="Plan your preparation" about="Set your level, weeks and weekly hours. The plan splits time across coding, design, behavioural and ML work, schedules mock interviews and keeps the last week as a buffer. The splits are a sensible default inferred from the research, not measured data."
      drive={() => [{ say: "A senior plan moves a large share of time to design from the very first week.", act: () => setLvl("senior") }, { say: "An ML engineer plan adds ML breadth, ML design and ML coding.", act: () => setLvl("ml") }]}>
      <Chips tone={T} value={lvl} onChange={setLvl} options={[{ id: "mid", label: "Mid (L4)" }, { id: "senior", label: "Senior (L5)" }, { id: "ml", label: "ML engineer" }]} />
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Slider label="Weeks until the interviews" value={weeks} min={3} max={16} onChange={setWeeks} />
        <Slider label="Hours per week" value={hours} min={4} max={30} onChange={setHours} />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat k="Total hours" v={Math.round(total)} tone={T} sub="TIH: ~100 h well prepared" />
        <Stat k="Coding hours" v={Math.round(codingTotal)} tone={MID} />
        <Stat k="Mock interviews" v={plan.reduce((a, p) => a + p.mocks, 0)} tone={SEN} />
      </div>
      {total < 80 && <p className="mt-2 text-[12px]" style={{ color: BAD }}>Under ~80 hours: consider asking to postpone; at big companies it is almost always fine.</p>}
      <div className="mt-3 space-y-1.5">
        {plan.map((p) => (
          <div key={p.w} className="grid grid-cols-[3rem_1fr] items-center gap-2 text-[12px]">
            <span className="text-faint">wk {p.w}</span>
            <div>
              <div className="flex h-3.5 overflow-hidden rounded-full bg-line/40">
                {([["coding", MID], ["design", T], ["beh", SEN], ["ml", "#f0a6ff"]] as const).map(([key, c]) => <div key={key} title={`${key}: ${p[key].toFixed(1)} h`} style={{ width: `${(p[key] / max) * 100}%`, background: c }} />)}
              </div>
              <div className="mt-0.5 flex justify-between text-[11px] text-faint"><span>{p.note}</span><span>{p.mocks ? `${p.mocks} mock${p.mocks > 1 ? "s" : ""}` : ""}</span></div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-faint"><span style={{ color: MID }}>■ coding</span><span style={{ color: T }}>■ design</span><span style={{ color: SEN }}>■ behavioural</span>{lvl === "ml" && <span style={{ color: "#f0a6ff" }}>■ ML breadth and ML coding</span>}</div>
    </Frame>
  );
}

// ---------- parallel timeline ----------

type Proc = { n: string; stages: [string, number][]; start: number };
const PROCS: Proc[] = [
  { n: "Google", stages: [["apply → screen", 2], ["screen → onsite", 3], ["committee + team match", 3]], start: 0 },
  { n: "Microsoft", stages: [["apply → screen", 1.5], ["screen → loop", 2], ["decision", 1]], start: 2 },
  { n: "Amazon", stages: [["apply → OA/screen", 1.5], ["screen → loop", 2], ["debrief", 1]], start: 2 },
  { n: "Flipkart", stages: [["apply → machine coding", 1], ["rounds", 2], ["HM + offer", 1]], start: 3 },
  { n: "Startup", stages: [["apply → screen", 0.5], ["rounds", 1], ["offer", 0.5]], start: 5 },
];
const STAGE_COL = [MID, T, SEN];

function ParallelTimeline() {
  const [starts, setStarts] = useState<Record<string, number>>(Object.fromEntries(PROCS.map((p) => [p.n, p.start])));
  const [on, setOn] = useState<string[]>(PROCS.map((p) => p.n));
  const span = 14;
  const live = PROCS.filter((p) => on.includes(p.n));
  const offerAt = (p: Proc) => starts[p.n] + p.stages.reduce((a, s) => a + s[1], 0);
  const offers = live.map(offerAt);
  const spread = offers.length ? Math.max(...offers) - Math.min(...offers) : 0;
  return (
    <Frame tone={T} title="Make the offers land together" about="Slide each company's start week. Slow processes (committees, team matching) need a head start; fast ones start later. Durations are illustrative: ask each recruiter for theirs."
      drive={() => [{ say: "If everything starts in week zero, the startup's offer arrives weeks before Google's.", act: () => setStarts(Object.fromEntries(PROCS.map((p) => [p.n, 0]))) }, { say: "Staggering the starts brings the offers within about two weeks.", act: () => setStarts(Object.fromEntries(PROCS.map((p) => [p.n, p.start]))) }]}>
      <div className="flex flex-wrap gap-1.5">{PROCS.map((p) => <button key={p.n} onClick={() => setOn((o) => (o.includes(p.n) ? o.filter((x) => x !== p.n) : [...o, p.n]))} className={cn("rounded-full border px-2.5 py-1 text-[12px]", on.includes(p.n) ? "border-craft/60 bg-craft/15" : "border-line text-mute")}>{p.n}</button>)}</div>
      <div className="mt-3 space-y-3">
        {live.map((p) => {
          let t = starts[p.n];
          return (
            <div key={p.n}>
              <div className="flex items-center justify-between text-[12px]"><span className="font-medium">{p.n}</span><span className="num text-faint">offer ≈ week {offerAt(p).toFixed(1)}</span></div>
              <div className="relative mt-1 h-4 rounded-full bg-line/30">
                {p.stages.map(([label, d], i) => { const left = t; t += d; return <div key={label} title={`${label}: ${d} wk`} className="absolute top-0 h-4" style={{ left: `${(left / span) * 100}%`, width: `${(d / span) * 100}%`, background: STAGE_COL[i % 3], borderRadius: 6, opacity: 0.85 }} />; })}
                <div className="absolute -top-0.5 h-5 w-0.5 bg-text" style={{ left: `${(Math.min(offerAt(p), span) / span) * 100}%` }} />
              </div>
              <input type="range" min={0} max={8} step={0.5} value={starts[p.n]} onChange={(e) => setStarts((s) => ({ ...s, [p.n]: +e.target.value }))} className="mt-1 w-full" aria-label={`${p.n} start week`} />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[10.5px] text-faint">{Array.from({ length: span / 2 + 1 }, (_, i) => <span key={i}>wk {i * 2}</span>)}</div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Stat k="Offer spread" v={`${spread.toFixed(1)} weeks`} tone={spread <= 2 ? SEN : BAD} sub={spread <= 2 ? "close enough to compare and negotiate" : "early offers may expire"} />
        <Stat k="Last offer" v={offers.length ? `week ${Math.max(...offers).toFixed(1)}` : "—"} tone={T} />
      </div>
    </Frame>
  );
}

// ---------- offer comparer ----------

const VEST = { even: [25, 25, 25, 25], amazon: [5, 15, 40, 40], front: [33, 33, 22, 12] } as const;
type Vest = keyof typeof VEST;
type Offer = { base: number; variable: number; join: number; y2: number; stock: number; vest: Vest; haircut: number };
const DEF: Record<"A" | "B", Offer> = {
  A: { base: 40, variable: 0, join: 10, y2: 0, stock: 60, vest: "amazon", haircut: 0 },
  B: { base: 44, variable: 0, join: 0, y2: 0, stock: 48, vest: "even", haircut: 0 },
};
const years = (o: Offer) => VEST[o.vest].map((v, i) => o.base * (1 + o.variable / 100) + (i === 0 ? o.join : i === 1 ? o.y2 : 0) + (o.stock * v / 100) * (1 - o.haircut / 100));

function Num({ label, value, onChange, step = 1 }: { label: string; value: number; onChange: (v: number) => void; step?: number }) {
  return <label className="flex items-center justify-between gap-2 text-[12px]"><span className="text-mute">{label}</span><input type="number" value={value} step={step} min={0} onChange={(e) => onChange(Math.max(0, +e.target.value || 0))} className="w-20 rounded-md border border-line bg-bg px-2 py-0.5 text-right num" /></label>;
}

function OfferCompare() {
  const [o, setO] = useState(DEF);
  const set = (k: "A" | "B", patch: Partial<Offer>) => setO((s) => ({ ...s, [k]: { ...s[k], ...patch } }));
  const ya = years(o.A), yb = years(o.B);
  const max = Math.max(...ya, ...yb, 1);
  const tot = (y: number[]) => y.reduce((a, b) => a + b, 0);
  return (
    <Frame tone={T} title="Compare offers year by year" about="Enter two offers in lakh rupees (or any one currency). Stock is the total grant over four years; pick its vesting shape. A haircut discounts private-company stock for risk and illiquidity. Raises, refreshers and stock-price changes are ignored."
      drive={() => [{ say: "Offer A has a joining bonus and back-loaded vesting: year one looks fine, year two dips.", act: () => setO(DEF) }, { say: "Discounting startup stock by half changes the four-year picture.", act: () => set("B", { haircut: 50 }) }]}>
      <div className="grid gap-4 sm:grid-cols-2">
        {(["A", "B"] as const).map((k) => (
          <div key={k} className="space-y-1.5 rounded-xl border border-line bg-bg p-3">
            <div className="font-semibold" style={{ color: k === "A" ? MID : SEN }}>Offer {k}</div>
            <Num label="Base per year" value={o[k].base} onChange={(v) => set(k, { base: v })} />
            <Num label="Variable bonus, % of base" value={o[k].variable} onChange={(v) => set(k, { variable: v })} />
            <Num label="Joining bonus (year 1)" value={o[k].join} onChange={(v) => set(k, { join: v })} />
            <Num label="Second-year cash bonus" value={o[k].y2} onChange={(v) => set(k, { y2: v })} />
            <Num label="Stock, total 4-year grant" value={o[k].stock} onChange={(v) => set(k, { stock: v })} />
            <Chips tone={T} value={o[k].vest} onChange={(v) => set(k, { vest: v })} options={[{ id: "even", label: "25% a year" }, { id: "amazon", label: "5/15/40/40" }, { id: "front", label: "33/33/22/12" }]} />
            <Slider label="Stock haircut (private company)" value={o[k].haircut} min={0} max={90} step={5} onChange={(v) => set(k, { haircut: v })} fmt={(v) => `${v}%`} />
          </div>
        ))}
      </div>
      <div className="mt-4 flex h-32 items-end gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-1 items-end justify-center gap-1">
            {[ya[i], yb[i]].map((v, j) => <div key={j} className="flex w-1/2 flex-col items-center"><span className="num text-[10.5px] text-mute">{v.toFixed(0)}</span><div className="w-full rounded-t-md" style={{ height: `${(v / max) * 96}px`, background: j ? SEN : MID }} /></div>)}
          </div>
        ))}
      </div>
      <div className="mt-1 flex text-center text-[11px] text-faint">{[1, 2, 3, 4].map((y) => <span key={y} className="flex-1">year {y}</span>)}</div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat k="A: 4-year total" v={tot(ya).toFixed(0)} tone={MID} />
        <Stat k="B: 4-year total" v={tot(yb).toFixed(0)} tone={SEN} />
        <Stat k="A: lowest year" v={Math.min(...ya).toFixed(0)} tone={MID} />
        <Stat k="B: lowest year" v={Math.min(...yb).toFixed(0)} tone={SEN} />
      </div>
    </Frame>
  );
}

// ---------- story bank grid ----------

const THEMES = ["Hardest technical problem", "Conflict or disagreement", "Failure or incident", "Leading without authority", "Ambiguity", "Tight deadline trade-off", "Mentoring someone", "Customer focus", "Going beyond scope", "Hard feedback received", "Influencing a decision with data", "Changing your mind"];
const KEY = "ascent.craft.storybank";

function StoryBank() {
  const [stories, setStories] = useState<string[]>(["Payments migration", "Checkout outage", "Onboarding a new hire"]);
  const [cells, setCells] = useState<Record<string, boolean>>({ "0:0": true, "0:3": true, "0:10": true, "1:2": true, "1:5": true, "2:6": true });
  const [draft, setDraft] = useState("");
  useEffect(() => { try { const s = JSON.parse(localStorage.getItem(KEY) ?? "null"); if (s?.stories) { setStories(s.stories); setCells(s.cells ?? {}); } } catch { /* first visit */ } }, []);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify({ stories, cells })); } catch { /* storage off */ } }, [stories, cells]);
  const cover = THEMES.map((_, t) => stories.filter((_, s) => cells[`${s}:${t}`]).length);
  const covered = cover.filter((c) => c > 0).length;
  return (
    <Frame tone={T} title="Your story bank" about="Add your stories (a short name each) and tick which themes each one can answer. Aim for every theme covered by at least one story, and no story carrying more than three or four themes. It is saved on this device."
      drive={() => [{ say: "Each column is a story; each row is a theme interviewers ask about. Red rows are gaps to fill before your loop." }]}>
      <div className="flex gap-2">
        <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && draft.trim() && stories.length < 8) { setStories([...stories, draft.trim()]); setDraft(""); } }} placeholder="Add a story name, press Enter" className="flex-1 rounded-lg border border-line bg-bg px-3 py-1.5 text-[13px]" maxLength={40} />
        <Stat k="Themes covered" v={`${covered}/${THEMES.length}`} tone={covered === THEMES.length ? SEN : T} />
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead><tr><th />{stories.map((s, i) => <th key={i} className="max-w-[6rem] px-1 pb-1 align-bottom font-medium"><div className="truncate" title={s}>{s}</div><button onClick={() => { setStories(stories.filter((_, j) => j !== i)); setCells(Object.fromEntries(Object.entries(cells).flatMap(([k, v]) => { const [a, b] = k.split(":").map(Number); return a === i ? [] : [[`${a > i ? a - 1 : a}:${b}`, v]]; }))); }} className="text-[10px] text-faint hover:text-bad">remove</button></th>)}</tr></thead>
          <tbody>{THEMES.map((th, t) => (
            <tr key={th} className="border-t border-line">
              <td className="py-1 pr-2" style={{ color: cover[t] ? undefined : BAD }}>{th}</td>
              {stories.map((_, s) => { const k = `${s}:${t}`; return <td key={s} className="text-center"><input type="checkbox" checked={!!cells[k]} onChange={() => setCells({ ...cells, [k]: !cells[k] })} aria-label={`${stories[s]}: ${th}`} /></td>; })}
            </tr>))}</tbody>
        </table>
      </div>
    </Frame>
  );
}

// ---------- round clock ----------

type Seg = [from: number, to: number, what: string, say: string];
const ROUNDS: Record<string, { min: number; segs: Seg[] }> = {
  "Coding (45 min)": { min: 45, segs: [[0, 3, "Intro", "Short hello; 30-second background if asked."], [3, 8, "Clarify", "Restate; 2–4 questions on size, duplicates, empty input; write two examples."], [8, 13, "Approach", "Brute force and its cost, then the better idea with complexity; get buy-in."], [13, 33, "Code", "Top-down with named helpers; narrate intent and invariants, not syntax."], [33, 39, "Test", "Dry-run your example; empty, single, duplicates, extremes; fix bugs aloud."], [39, 42, "Follow-up", "Optimisations, streaming or scale variants."], [42, 45, "Your questions", "One or two questions for the interviewer."]] },
  "System design (45 min)": { min: 45, segs: [[0, 2, "Intro", "Hello; agree the time plan."], [2, 7, "Requirements", "Functional (3–5 core features) and non-functional (scale, latency, availability, consistency)."], [7, 10, "Estimates", "Users, QPS, storage, bandwidth: only what changes the design."], [10, 14, "API and data model", "Main endpoints and the core entities with keys."], [14, 24, "High-level design", "Boxes and arrows for the main flows; say why each piece exists."], [24, 38, "Deep dives", "The two hardest parts: scaling, consistency, failure handling, trade-offs."], [38, 42, "Bottlenecks", "Single points of failure, hot keys, monitoring, what you'd do next."], [42, 45, "Your questions", "One or two questions."]] },
  "Machine coding (90 min)": { min: 90, segs: [[0, 10, "Requirements", "List features; confirm in-memory, no UI; agree the must-haves."], [10, 20, "Model", "Entities, relationships and interfaces; a quick class sketch."], [20, 70, "Build", "Working end-to-end first, then features; small classes; validation and errors."], [70, 80, "Demo", "Run the main flows with a driver; show edge cases."], [80, 90, "Extend", "The interviewer adds a feature; show the design absorbs it."]] },
  "ML system design (45 min)": { min: 45, segs: [[0, 6, "Frame", "Product goal → ML task; success metrics online and offline."], [6, 12, "Data", "Labels and where they come from; features; sampling and leakage."], [12, 20, "Model", "Baseline first, then the main model; loss and why."], [20, 28, "Evaluate", "Offline metrics, A/B test, guardrails, slices."], [28, 38, "Serve", "Retrieval and ranking stages, latency, feature store, monitoring and retraining."], [38, 45, "Deep dive", "Cold start, bias, drift or scale; then your questions."]] },
  "Behavioural (45 min)": { min: 45, segs: [[0, 3, "Intro", "Short, relevant introduction."], [3, 15, "Story 1", "STAR: 2-sentence situation, your actions (most time), measurable result, reflection."], [15, 27, "Story 2", "Expect two or three probes: 'what would you do differently?', 'what did they think?'"], [27, 39, "Story 3", "Pick stories that show different themes."], [39, 45, "Your questions", "Questions about the team and how success is measured."]] },
};

function RoundClock() {
  const [r, setR] = useState<keyof typeof ROUNDS>("Coding (45 min)");
  const [m, setM] = useState(10);
  const cfg = ROUNDS[r];
  const cur = cfg.segs.find(([a, b]) => m >= a && m < b) ?? cfg.segs[cfg.segs.length - 1];
  useEffect(() => setM((x) => Math.min(x, cfg.min - 1)), [cfg.min]);
  return (
    <Frame tone={T} title="Where should you be by now?" about="Pick a round type and drag the clock. The bar shows how strong candidates usually spend the time; the box says what to do and what to say at that minute. Timings are a guide, not a rule."
      drive={() => [{ say: "In a 45-minute coding round, coding usually starts only after about thirteen minutes of clarifying and agreeing an approach.", act: () => { setR("Coding (45 min)"); setM(14); } }, { say: "In system design, deep dives take the biggest block.", act: () => { setR("System design (45 min)"); setM(30); } }]}>
      <Chips tone={T} value={r} onChange={(v) => setR(v)} options={(Object.keys(ROUNDS) as (keyof typeof ROUNDS)[]).map((id) => ({ id, label: id }))} />
      <div className="relative mt-4 flex h-6 overflow-hidden rounded-full">
        {cfg.segs.map(([a, b, what], i) => <div key={what + a} title={`${what}: ${a}–${b} min`} className="h-6 border-r border-bg text-center text-[10px] leading-6 text-bg" style={{ width: `${((b - a) / cfg.min) * 100}%`, background: cur[0] === a ? T : [MID, SEN, "#f0a6ff", "#ffd479"][i % 4], opacity: cur[0] === a ? 1 : 0.55 }}>{b - a >= 5 ? what : ""}</div>)}
        <div className="absolute top-0 h-6 w-0.5 bg-text" style={{ left: `${(m / cfg.min) * 100}%` }} />
      </div>
      <div className="mt-3"><Slider label="Minute" value={m} min={0} max={cfg.min - 1} onChange={setM} fmt={(v) => `${v} of ${cfg.min}`} /></div>
      <div className="mt-3 rounded-xl border border-line bg-bg p-3">
        <div className="text-[11px] uppercase tracking-wider text-faint">{cur[0]}–{cur[1]} min</div>
        <div className="display text-[16px] font-semibold" style={{ color: T }}>{cur[2]}</div>
        <p className="mt-1 text-[13px] text-mute">{cur[3]}</p>
      </div>
    </Frame>
  );
}

export const CRAFT_WIDGETS: Record<string, ComponentType> = {
  "level-map": LevelMap,
  "variance-sim": VarianceSim,
  "prep-planner": PrepPlanner,
  "parallel-timeline": ParallelTimeline,
  "offer-compare": OfferCompare,
  "story-bank": StoryBank,
  "round-clock": RoundClock,
};
