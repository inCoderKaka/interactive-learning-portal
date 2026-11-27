"use client";
/**
 * LLD visuals, chapter 2 (OOP and SOLID): an invariant with and without encapsulation, the inheritance explosion,
 * dynamic dispatch, the cost of a new case with and without open/closed, the Liskov square test, and swapping
 * injected dependencies in a test.
 */
import { useState } from "react";
import { Btn, Chips, Frame, Stat } from "./kit";
import { cn } from "../../ui";

const Log = ({ lines }: { lines: { ok: boolean; t: string }[] }) => (
  <div className="mt-2 min-h-[72px] rounded-xl border border-line bg-panel2/40 p-2 font-mono text-[11.5px] leading-relaxed">
    {lines.length ? lines.slice(-5).map((l, i) => <div key={i} className={l.ok ? "text-ok" : "text-bad"}>{l.t}</div>) : <span className="text-faint">Nothing yet.</span>}
  </div>
);

// ───────────────────────── invariant-guard ─────────────────────────

export function InvariantGuard() {
  const [open, setOpen] = useState({ bal: 100, log: [] as { ok: boolean; t: string }[] });
  const [enc, setEnc] = useState({ bal: 100, log: [] as { ok: boolean; t: string }[] });
  const act = (k: "dep" | "wd" | "big" | "bug") => {
    const amt = k === "dep" ? 50 : k === "wd" ? 80 : 1000;
    setOpen((s) => {
      if (k === "bug") return { bal: -500, log: [...s.log, { ok: false, t: "report.fix(): account.balance = -500   // compiles, runs" }] };
      if (k === "dep") return { bal: s.bal + amt, log: [...s.log, { ok: true, t: `caller: account.balance += ${amt}` }] };
      const nb = s.bal - amt;
      return { bal: nb, log: [...s.log, { ok: nb >= 0, t: `caller: account.balance -= ${amt}${nb < 0 ? "   // nobody checked" : ""}` }] };
    });
    setEnc((s) => {
      if (k === "bug") return { ...s, log: [...s.log, { ok: false, t: "account.balance = -500  ✗ compile error: balance is private" }] };
      if (k === "dep") return { bal: s.bal + amt, log: [...s.log, { ok: true, t: `account.deposit(${amt}) ✓` }] };
      if (amt > s.bal) return { ...s, log: [...s.log, { ok: false, t: `account.withdraw(${amt}) ✗ InsufficientFundsException` }] };
      return { bal: s.bal - amt, log: [...s.log, { ok: true, t: `account.withdraw(${amt}) ✓` }] };
    });
  };
  const reset = () => { setOpen({ bal: 100, log: [] }); setEnc({ bal: 100, log: [] }); };
  const Panel = ({ title, s, sub }: { title: string; s: { bal: number; log: { ok: boolean; t: string }[] }; sub: string }) => (
    <div className="rounded-xl border border-line bg-bg p-3">
      <div className="text-[13px] font-semibold">{title}</div>
      <div className="text-[11.5px] text-faint">{sub}</div>
      <div className={cn("num display mt-2 text-[26px] font-semibold", s.bal < 0 ? "text-bad" : "text-text")}>{s.bal}¢</div>
      <div className={cn("text-[12px]", s.bal < 0 ? "text-bad" : "text-ok")}>{s.bal < 0 ? "invariant broken: balance < 0" : "invariant holds: balance ≥ 0"}</div>
      <Log lines={s.log} />
    </div>
  );
  return (
    <Frame title="One rule, checked in one place" q="Can any line of code anywhere in the program make this balance negative?"
      about="Press the same buttons for both accounts. The left one has a public field; the right one has a private field and only deposit/withdraw."
      foot="With a public field, every caller must remember the rule, and one forgetful line (the 'bug elsewhere' button) breaks it for everyone. With encapsulation the compiler blocks direct writes, and withdraw() checks the rule every time.">
      <div className="flex flex-wrap gap-1.5">
        <Btn onClick={() => act("dep")}>deposit 50</Btn><Btn onClick={() => act("wd")}>withdraw 80</Btn><Btn onClick={() => act("big")}>withdraw 1000</Btn>
        <Btn tone="bad" onClick={() => act("bug")}>bug elsewhere: set balance to −500</Btn><Btn onClick={reset}>Reset</Btn>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Panel title="public long balance;" s={open} sub="any code may write it" />
        <Panel title="private long balance; + deposit/withdraw" s={enc} sub="only the class may write it" />
      </div>
    </Frame>
  );
}

// ───────────────────────── combo-explosion ─────────────────────────

const ADDONS = ["Milk", "Sugar", "Caramel", "Cream", "ExtraShot", "Oat"];
export function ComboExplosion() {
  const [on, setOn] = useState<string[]>(["Milk", "Sugar", "Caramel"]);
  const n = on.length;
  const subsets: string[] = [];
  for (let m = 0; m < 1 << n && subsets.length < 40; m++) subsets.push("Coffee" + (m === 0 ? "" : "With" + on.filter((_, i) => m & (1 << i)).join("And")));
  return (
    <Frame title="One class per combination" q="How many classes does each design need as optional features are added?"
      about="Turn add-ons on and off. Inheritance needs a class for every combination; composition needs one class per add-on plus the coffee."
      foot="Inheritance grows as 2ⁿ because each combination is its own type. Composition grows as n + 1 because a coffee simply holds a list of add-ons, and any combination is built at run time.">
      <div className="flex flex-wrap gap-1.5">
        {ADDONS.map((a) => <Btn key={a} on={on.includes(a)} onClick={() => setOn((xs) => (xs.includes(a) ? xs.filter((x) => x !== a) : [...xs, a]))}>{a}</Btn>)}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat k="Add-ons" v={n} />
        <Stat k="Inheritance classes" v={2 ** n} tone="#ff8f8f" sub="2ⁿ" />
        <Stat k="Composition classes" v={n + 1} tone="#5be49b" sub="n + 1" />
        <Stat k="Adding one more" v={`+${2 ** n} vs +1`} />
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-line bg-bg p-2.5">
          <div className="text-[10.5px] uppercase tracking-wider text-bad">Inheritance: classes to write</div>
          <div className="mt-1 flex max-h-44 flex-wrap gap-1 overflow-y-auto font-mono text-[10.5px]">{subsets.map((s) => <span key={s} className="rounded border border-bad/30 px-1.5 py-0.5 text-mute">{s}</span>)}{2 ** n > subsets.length && <span className="text-faint">… {2 ** n - subsets.length} more</span>}</div>
        </div>
        <div className="rounded-xl border border-line bg-bg p-2.5">
          <div className="text-[10.5px] uppercase tracking-wider text-ok">Composition: classes to write</div>
          <pre className="code mt-1 text-[11px] leading-relaxed">{`interface AddOn { Money price(); String name(); }\n${on.map((a) => `record ${a}() implements AddOn {…}`).join("\n")}\n\nfinal class Coffee {\n  private final List<AddOn> addOns;\n  Money price() { return base.plus(sum of addOns); }\n}\n\nnew Coffee(List.of(${on.map((a) => `new ${a}()`).join(", ")}))`}</pre>
        </div>
      </div>
    </Frame>
  );
}

// ───────────────────────── dispatch-lab ─────────────────────────

const RATES = { Bike: "return 10 * h;", Car: "return 20 * h;", Truck: "return 50 * h + 100;" } as const;
type RK = keyof typeof RATES;
export function DispatchLab() {
  const [mode, setMode] = useState<"override" | "overload">("override");
  const [obj, setObj] = useState<RK>("Truck");
  const [step, setStep] = useState(0);
  const [decl, setDecl] = useState<"Object" | "String">("Object");
  const fee = (k: RK, h: number) => (k === "Bike" ? 10 * h : k === "Car" ? 20 * h : 50 * h + 100);
  const STEPS = [
    "Compile time: is fee(long) declared on the variable's type, Rate? Yes, so the call compiles. The compiler does not know which object r will hold.",
    `Run time: follow r to the actual object. It is a ${obj}Rate.`,
    `Look up fee in ${obj}Rate's method table (its vtable).`,
    `Run ${obj}Rate.fee(3) → ${fee(obj, 3)}.`,
  ];
  return (
    <Frame title="Which method body runs?" q="The variable says Rate; the object is a TruckRate. Who decides what runs, and when?"
      about="Overriding: choose the object, then step through the call. Overloading: choose the variable's declared type and see which print() the compiler picks."
      foot="Overridden methods are chosen at run time from the object's real class: that is polymorphism. Overloaded methods are chosen at compile time from the declared types, so an Object variable holding a String still calls print(Object).">
      <Chips value={mode} onChange={(m) => { setMode(m); setStep(0); }} options={[["override", "Overriding (run time)"], ["overload", "Overloading (compile time)"]]} />
      {mode === "override" ? (
        <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1.2fr]">
          <div className="rounded-xl border border-line bg-bg p-3">
            <div className="text-[12px] text-faint">r points to:</div>
            <div className="mt-1"><Chips value={obj} onChange={(k) => { setObj(k); setStep(0); }} options={(Object.keys(RATES) as RK[]).map((k) => [k, `new ${k}Rate()`])} /></div>
            <pre className="code mt-3 text-[12px]">{`Rate r = new ${obj}Rate();\nlong fee = r.fee(3);`}</pre>
            <div className="mt-2 flex gap-1.5"><Btn onClick={() => setStep((s) => Math.min(4, s + 1))} disabled={step >= 4}>Next step</Btn><Btn onClick={() => setStep(0)}>Reset</Btn></div>
            <ol className="mt-2 space-y-1 text-[12.5px]">{STEPS.slice(0, step).map((s, i) => <li key={i} className={cn(i === step - 1 ? "text-text" : "text-mute")}>{i + 1}. {s}</li>)}</ol>
          </div>
          <div className="space-y-2">
            {(Object.keys(RATES) as RK[]).map((k) => (
              <div key={k} className={cn("rounded-xl border p-2.5 transition", step >= 3 && k === obj ? "border-accent bg-accent/10" : step >= 2 && k === obj ? "border-accent/50" : "border-line bg-bg")}>
                <div className="font-mono text-[12px] font-semibold">{k}Rate implements Rate</div>
                <pre className="code mt-1 text-[11.5px]">{`public long fee(long h) { ${RATES[k]} }`}</pre>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-line bg-bg p-3">
            <div className="text-[12px] text-faint">Declared type of x (the object is always the String "hi"):</div>
            <div className="mt-1"><Chips value={decl} onChange={setDecl} options={[["Object", "Object x"], ["String", "String x"]]} /></div>
            <pre className="code mt-3 text-[12px]">{`void print(Object o) { System.out.println("object"); }\nvoid print(String s) { System.out.println("string"); }\n\n${decl} x = "hi";\nprint(x);`}</pre>
          </div>
          <div className="rounded-xl border border-line bg-bg p-3">
            <div className="text-[12px] text-faint">Output</div>
            <div className="num display mt-1 text-[24px] font-semibold">{decl === "Object" ? "object" : "string"}</div>
            <p className="mt-2 text-[13px] text-mute">{decl === "Object" ? "The compiler only sees an Object, so it binds the call to print(Object). The object being a String at run time does not matter: overloads are not dynamic." : "Declared as String, so the compiler picks the more specific print(String)."}</p>
          </div>
        </div>
      )}
    </Frame>
  );
}

// ───────────────────────── ocp-lab ─────────────────────────

const PROMOS = ["10% off", "Free shipping", "Buy 2 get 1", "First order ₹100 off", "Festival 20%", "Student 15%"];
export function OcpLab() {
  const [n, setN] = useState(2);
  const added = PROMOS.slice(0, n);
  return (
    <Frame title="The cost of the next case" q="When marketing adds a promotion, which design forces you to edit and retest code that already works?"
      about="Add promotions one at a time. The switch design edits Checkout every time; the open/closed design adds a new class and leaves Checkout alone."
      foot="Both designs end up with the same behaviour. The difference is risk: every edit to Checkout can break the promotions that already worked, so all of them must be retested. With an interface, existing code and its tests are untouched; only the new class needs tests.">
      <div className="flex flex-wrap items-center gap-1.5"><Btn onClick={() => setN((x) => Math.min(PROMOS.length, x + 1))} disabled={n >= PROMOS.length}>Add a promotion</Btn><Btn onClick={() => setN(2)}>Reset</Btn><span className="text-[12px] text-faint">{n} promotions</span></div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-line bg-bg p-3">
          <div className="text-[12.5px] font-semibold text-bad">switch inside Checkout</div>
          <pre className="code mt-1 text-[11px] leading-relaxed">{`Money total(Cart c) {\n  Money t = c.subtotal();\n  for (Promo p : c.promos()) switch (p.type()) {\n${added.map((a, i) => `${i === n - 1 && n > 2 ? "+" : " "}   case "${a}" -> t = …;`).join("\n")}\n  }\n  return t;\n}`}</pre>
          <div className="mt-2 grid grid-cols-2 gap-2"><Stat k="Existing file edited" v={n > 2 ? "Checkout.java" : "–"} tone="#ff8f8f" /><Stat k="Promotions to retest" v={n > 2 ? n : 0} tone="#ff8f8f" /></div>
        </div>
        <div className="rounded-xl border border-line bg-bg p-3">
          <div className="text-[12.5px] font-semibold text-ok">interface Promotion (open/closed)</div>
          <pre className="code mt-1 text-[11px] leading-relaxed">{`Money total(Cart c) {            // never changes\n  Money t = c.subtotal();\n  for (Promotion p : promos) t = p.apply(c, t);\n  return t;\n}\n\n${added.map((a, i) => `${i === n - 1 && n > 2 ? "+ " : "  "}class ${a.replace(/[^A-Za-z0-9]/g, "")} implements Promotion`).join("\n")}`}</pre>
          <div className="mt-2 grid grid-cols-2 gap-2"><Stat k="Existing file edited" v="none" tone="#5be49b" /><Stat k="Promotions to retest" v={n > 2 ? 1 : 0} tone="#5be49b" sub="only the new one" /></div>
        </div>
      </div>
    </Frame>
  );
}

// ───────────────────────── lsp-lab ─────────────────────────

export function LspLab() {
  const [k, setK] = useState<"rect" | "square" | "imm">("rect");
  const [step, setStep] = useState(0);
  // start 2×2; step 1 setWidth(5); step 2 setHeight(4)
  const dims = (() => {
    let w = 2, h = 2;
    if (k === "imm") return step >= 2 ? { w: 5, h: 4, note: "new Rectangle(5, 4)" } : { w: 2, h: 2, note: "new Square(2)" };
    if (step >= 1) { if (k === "square") { w = 5; h = 5; } else w = 5; }
    if (step >= 2) { if (k === "square") { w = 4; h = 4; } else h = 4; }
    return { w, h, note: "" };
  })();
  const area = dims.w * dims.h;
  const done = step >= 2;
  const pass = area === 20;
  const code = k === "imm"
    ? "Shape s = new Square(2);\n// no setters: to get a 5×4 shape you make one\nShape t = new Rectangle(5, 4);\nassert t.area() == 20;"
    : `Rectangle r = new ${k === "rect" ? "Rectangle" : "Square"}(2);\nr.setWidth(5);\nr.setHeight(4);\nassert r.area() == 20;   // Rectangle's promise`;
  return (
    <Frame title="Can a Square stand in for a Rectangle?" q="Code written against Rectangle sets width 5, then height 4, and expects area 20. Does it still work when handed a Square?"
      about="Pick the object the test receives and step through the calls."
      foot="Rectangle promises that setWidth leaves the height alone. A mutable Square must break that promise to stay square, so correct code written for Rectangle fails. That is a Liskov violation. Making shapes immutable removes the promise that could not be kept.">
      <Chips value={k} onChange={(x) => { setK(x); setStep(0); }} options={[["rect", "Rectangle"], ["square", "Square extends Rectangle"], ["imm", "Immutable shapes"]]} />
      <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-xl border border-line bg-bg p-3">
          <pre className="code text-[12px]">{code}</pre>
          <div className="mt-2 flex gap-1.5"><Btn onClick={() => setStep((s) => Math.min(2, s + 1))} disabled={done}>Next call</Btn><Btn onClick={() => setStep(0)}>Reset</Btn></div>
          {done && <div className={cn("mt-2 text-[13px] font-semibold", pass ? "text-ok" : "text-bad")}>{pass ? "✓ area 20: test passes" : `✗ area ${area}: test fails`}</div>}
        </div>
        <div className="grid place-items-center rounded-xl border border-line bg-bg p-3">
          <svg viewBox="0 0 220 150" className="w-full max-w-[260px]">
            <rect x={110 - dims.w * 10} y={75 - dims.h * 10} width={dims.w * 20} height={dims.h * 20} fill={done ? (pass ? "rgba(91,228,155,.15)" : "rgba(255,107,107,.15)") : "rgba(122,167,255,.15)"} stroke={done ? (pass ? "#5be49b" : "#ff6b6b") : "#7aa7ff"} strokeWidth={2} style={{ transition: "all .4s" }} />
            <text x={110} y={145} textAnchor="middle" fontSize="12" fill="#9aa3b8">{dims.w} × {dims.h} = {area}{dims.note ? ` (${dims.note})` : ""}</text>
          </svg>
        </div>
      </div>
    </Frame>
  );
}

// ───────────────────────── di-swap ─────────────────────────

type Gw = "stripe" | "ok" | "decline";
type Repo = "mysql" | "mem";
type Ck = "sys" | "fixed" | "late";
export function DiSwap() {
  const [wired, setWired] = useState<"hard" | "inj">("hard");
  const [gw, setGw] = useState<Gw>("ok");
  const [repo, setRepo] = useState<Repo>("mem");
  const [ck, setCk] = useState<Ck>("fixed");
  const [out, setOut] = useState<{ ok: boolean; t: string }[]>([]);
  const run = () => {
    const lines: { ok: boolean; t: string }[] = [];
    if (wired === "hard") {
      lines.push({ ok: false, t: "new MySqlOrderRepository(\"jdbc:mysql://prod\") → connection refused (no database on the test machine)" });
      lines.push({ ok: false, t: "Instant.now() → today's real time: the expiry test can't be set up" });
      lines.push({ ok: false, t: "new StripeClient(env STRIPE_KEY) → needs a live key; would charge a real card" });
      lines.push({ ok: false, t: "Test failed after 2.4 s. Can't test 'payment declined' at all." });
      setOut(lines); return;
    }
    const g = gw, r = repo, c = ck;
    if (r === "mysql") lines.push({ ok: false, t: "MySqlOrderRepository → no database here (use it in an integration test instead)" });
    if (g === "stripe") lines.push({ ok: false, t: "StripeGateway → network call from a unit test: slow, flaky, costs money" });
    if (r === "mysql" || g === "stripe") { lines.push({ ok: false, t: "Swap in fakes for a unit test." }); setOut(lines); return; }
    lines.push({ ok: true, t: `clock = ${c === "sys" ? "Clock.systemUTC()" : c === "fixed" ? "Clock.fixed(10:00)" : "Clock.fixed(after cart expiry)"}` });
    if (c === "late") { lines.push({ ok: true, t: "place(cart) → CartExpired thrown before charging ✓" }); lines.push({ ok: true, t: "assert gateway.charges == 0 ✓  assert repo.count == 0 ✓  (3 ms)" }); setOut(lines); return; }
    if (c === "sys") lines.push({ ok: true, t: "works today, but the test depends on the real time (could flake near expiry)" });
    if (g === "decline") { lines.push({ ok: true, t: "place(cart) → PaymentDeclined ✓" }); lines.push({ ok: true, t: "assert repo.count == 0 ✓  nothing saved for a failed payment (2 ms)" }); }
    else { lines.push({ ok: true, t: "place(cart) → Order#1 ✓" }); lines.push({ ok: true, t: "assert gateway.charged == cart.total ✓  assert repo.count == 1 ✓  (2 ms)" }); }
    setOut(lines);
  };
  return (
    <Frame title="Swap the collaborators" q="How do you test 'a declined payment saves nothing' without a database, a payment provider or the real clock?"
      about="Choose hard-wired or injected. With injection, pick what to plug in and run the unit test."
      foot="Hard-wired code creates its own database, payment client and clock, so it can only be tested against the real things, if at all. Injected code receives them, so a test plugs in an in-memory repository, a gateway that declines on demand and a fixed clock, and runs in milliseconds.">
      <Chips value={wired} onChange={(w) => { setWired(w); setOut([]); }} options={[["hard", "Hard-wired (new inside)"], ["inj", "Injected (constructor)"]]} />
      <div className="mt-3 grid gap-3 lg:grid-cols-[1.1fr_1fr]">
        <div className="rounded-xl border border-line bg-bg p-3">
          <pre className="code text-[11.5px] leading-relaxed">{wired === "hard"
            ? "Order place(Cart cart) {\n  var repo = new MySqlOrderRepository(\"jdbc:mysql://prod\");\n  if (Instant.now().isAfter(cart.expiry())) throw new CartExpired();\n  new StripeClient(System.getenv(\"STRIPE_KEY\")).charge(cart.total());\n  return repo.save(Order.from(cart));\n}"
            : "OrderService(OrderRepository orders,\n             PaymentGateway payments,\n             Clock clock) { … }\n\nOrder place(Cart cart) {\n  if (clock.instant().isAfter(cart.expiry())) throw new CartExpired();\n  payments.charge(cart.total());\n  return orders.save(Order.from(cart));\n}"}</pre>
          {wired === "inj" && (
            <div className="mt-3 space-y-2">
              <Chips label="PaymentGateway" value={gw} onChange={setGw} options={[["stripe", "StripeGateway"], ["ok", "Fake: approves"], ["decline", "Fake: declines"]]} />
              <Chips label="OrderRepository" value={repo} onChange={setRepo} options={[["mysql", "MySql…"], ["mem", "InMemory"]]} />
              <Chips label="Clock" value={ck} onChange={setCk} options={[["sys", "systemUTC"], ["fixed", "fixed 10:00"], ["late", "fixed, after expiry"]]} />
            </div>
          )}
          <div className="mt-3"><Btn onClick={run}>Run the unit test</Btn></div>
        </div>
        <div><Log lines={out} /></div>
      </div>
    </Frame>
  );
}
