// Company styles for mock interviews (req3 Craft pass: the behavioural round becomes "pick a company").
// Pure data, drawn from the Craft research notes: each company's behavioural round, values, what its interviewers
// probe, the rubric the scorecard uses, fictional interviewer teams, and the onsite loop by level.

import type { Kind, Level } from "./types.ts";

export interface CompanyRound { kind: Kind; minutes: number; title: string }
export interface CompanyStyle {
  id: string;
  name: string;
  /** The behavioural round as the company names it. */
  round: string;
  /** Who decides after the loop, in the company's own words where they have them. */
  decider: string;
  /** How the company runs behavioural questions, for the interviewer prompt. */
  style: string;
  /** The values or attributes answers are judged against. */
  values: string;
  /** Questions in the company's style the interviewer can draw on. */
  prompts: string[];
  /** Scorecard dimensions for the behavioural round. */
  dims: { key: string; label: string; what: string }[];
  /** Fictional interviewer teams. */
  teams: string[];
  /** The onsite for a level (mid = L4, senior = L5 in Google terms). */
  loop: (level: Level) => CompanyRound[];
}

const R = (kind: Kind, minutes: number, title: string): CompanyRound => ({ kind, minutes, title });
const D = (key: string, label: string, what: string) => ({ key, label, what });
const STRUCT = D("structure", "Structure", "a clear situation, their own actions and a result, in two or three minutes");
const IMPACT = D("impact", "Impact", "concrete, measurable outcomes at the scope expected for the level");

export const COMPANIES: CompanyStyle[] = [
  {
    id: "google", name: "Google", round: "Googleyness and leadership", decider: "hiring committee",
    style: "Reflective and hypothetical questions; the candidate must answer from real past experience, not opinions. Probe for comfort with ambiguity, collaboration, humility and emergent leadership (stepping up without a title). Avoid judging 'culture fit'.",
    values: "Google's interview attributes: general cognitive ability, role-related knowledge, leadership, and Googleyness (comfort with ambiguity, bias to action, collaboration, humility, doing the right thing for users).",
    prompts: ["Tell me about a time you had to deliver with very unclear requirements.", "Describe a time you led an effort you didn't formally own.", "Tell me about a time you disagreed with a teammate. What did you do?", "What would you do if your team strongly disagreed with a decision you'd made?", "Tell me about feedback that changed how you work."],
    dims: [STRUCT, D("leadership", "Leadership", "emergent leadership: stepping up, aligning others, enabling the team"), D("googleyness", "Googleyness", "comfort with ambiguity, collaboration, humility, doing right by users"), IMPACT, D("reflection", "Reflection", "what they learned and changed")],
    teams: ["Search quality", "Cloud networking", "Workspace admin tools", "Developer productivity", "Maps platform", "Ads infrastructure"],
    loop: (l) => l === "L3" ? [R("coding", 45, "Coding 1"), R("coding", 45, "Coding 2"), R("coding", 45, "Coding 3"), R("behavioral", 30, "Googleyness")]
      : l === "L4" ? [R("coding", 45, "Coding 1"), R("coding", 45, "Coding 2"), R("lld", 40, "Object-oriented design"), R("behavioral", 30, "Googleyness")]
      : l === "L5" ? [R("coding", 45, "Coding 1"), R("coding", 45, "Coding 2"), R("hld", 45, "System design"), R("behavioral", 30, "Googleyness and leadership")]
      : [R("coding", 45, "Coding"), R("hld", 45, "System design 1"), R("hld", 45, "System design 2"), R("lld", 40, "Object-oriented design"), R("behavioral", 30, "Leadership")],
  },
  {
    id: "amazon", name: "Amazon", round: "Leadership Principles", decider: "debrief led by the bar raiser with the hiring manager",
    style: "Every question maps to one or two of Amazon's 16 Leadership Principles. Ask for a specific past situation, then dig: 'what exactly did you do?', 'what data did you use?', 'what would you do differently?'. Push for numbers, real failures and ownership beyond the role. Two or three questions in the time, each probed deeply. A bar raiser asks for genuine mistakes and notices negativity about past managers.",
    values: "Customer Obsession, Ownership, Invent and Simplify, Are Right A Lot, Learn and Be Curious, Hire and Develop the Best, Insist on the Highest Standards, Think Big, Bias for Action, Frugality, Earn Trust, Dive Deep, Have Backbone; Disagree and Commit, Deliver Results, Strive to be Earth's Best Employer, Success and Scale Bring Broad Responsibility.",
    prompts: ["Tell me about a time you went beyond what a customer asked for. (Customer Obsession)", "Tell me about a time you took on something outside your area of responsibility. (Ownership)", "Tell me about a time you disagreed with your manager and what happened. (Have Backbone; Disagree and Commit)", "Tell me about a time you had to dig into data to find the root cause of a problem. (Dive Deep)", "Tell me about a time you failed to deliver on a commitment. (Deliver Results)", "Tell me about a time you made a decision with incomplete information. (Bias for Action)"],
    dims: [STRUCT, D("principles", "Leadership Principles", "clear evidence of the principles the question targets (customer obsession, ownership, dive deep, deliver results)"), D("ownership", "Ownership and data", "their own decisions, backed by data, beyond their role where needed"), IMPACT, D("reflection", "Self-criticism", "honest about mistakes and what changed")],
    teams: ["Prime Video playback", "Retail checkout", "AWS Lambda", "Alexa shopping", "Fulfilment routing", "Payments risk"],
    loop: (l) => l === "L3" ? [R("coding", 60, "Coding 1"), R("coding", 60, "Coding 2"), R("lld", 60, "Object-oriented design"), R("behavioral", 45, "Bar raiser")]
      : l === "L4" ? [R("coding", 60, "Coding 1"), R("coding", 60, "Coding 2"), R("hld", 60, "System design"), R("behavioral", 45, "Bar raiser")]
      : [R("coding", 60, "Coding"), R("hld", 60, "System design 1"), R("hld", 60, "System design 2"), R("behavioral", 45, "Bar raiser")],
  },
  {
    id: "meta", name: "Meta", round: "Behavioural", decider: "debrief and calibration",
    style: "Two core prompts: the candidate's proudest project and a genuine conflict. A disagreement with little tension doesn't count as conflict. Prefer work examples over side projects. Probe for speed, ownership, outcomes and willingness to raise better approaches even to senior leaders.",
    values: "Moving fast and taking ownership, focusing on outcomes and impact, raising better approaches directly (even to senior people), shipping pragmatically.",
    prompts: ["What's the project you're proudest of, and what was your part?", "Tell me about a real conflict with a colleague. How did it end?", "Tell me about a time you moved fast and it went wrong.", "Describe a time you changed a senior person's mind.", "Tell me about a time you had to choose between speed and quality."],
    dims: [STRUCT, D("ownership", "Ownership and speed", "moving fast, owning outcomes, pragmatic trade-offs"), D("conflict", "Conflict", "a real disagreement with tension, handled directly and resolved"), IMPACT, D("growth", "Growth", "learning and changed behaviour")],
    teams: ["Instagram Reels ranking", "WhatsApp messaging infrastructure", "Ads delivery", "Integrity ML", "Enterprise engineering tools", "Feed infrastructure"],
    loop: (l) => l === "L3" ? [R("coding", 45, "Coding 1"), R("coding", 45, "Coding 2"), R("behavioral", 45, "Behavioural")]
      : [R("coding", 45, "Coding 1"), R("coding", 45, "Coding 2"), R("hld", 45, "System design"), R("behavioral", 45, "Behavioural")],
  },
  {
    id: "microsoft", name: "Microsoft", round: "Behavioural (growth mindset)", decider: "hiring manager after the as-appropriate interview",
    style: "STAR with Reflection: after each story, ask what they learned and would do differently. Probe growth mindset (learning from failure, seeking feedback), collaboration across teams ('One Microsoft') and customer focus. Deflected failures, or failures spun into successes, are red flags. Expect 'why Microsoft?'.",
    values: "Growth mindset, being diverse and inclusive, One Microsoft (collaboration across teams), customer obsession.",
    prompts: ["Tell me about a time you failed. What did you learn?", "Describe feedback that was hard to hear and what you did with it.", "Tell me about working with another team that had different priorities.", "Tell me about a technical win you're proud of.", "Why Microsoft, and why this team?"],
    dims: [STRUCT, D("growth", "Growth mindset", "real failures, sought feedback, visible learning"), D("collaboration", "Collaboration", "working across teams and with different views"), IMPACT, D("reflection", "Reflection", "a clear reflection on each story")],
    teams: ["Azure storage", "Microsoft 365 Copilot", "Teams calling", "Azure Kubernetes Service", "Bing ranking", "Developer tools"],
    loop: (l) => l === "L3" || l === "L4" ? [R("coding", 45, "Coding 1"), R("coding", 45, "Coding 2"), R("lld", 45, "Design"), R("behavioral", 45, "Hiring manager")]
      : [R("coding", 45, "Coding"), R("hld", 60, "System design"), R("lld", 45, "Design"), R("behavioral", 45, "As-appropriate (hiring manager)")],
  },
  {
    id: "apple", name: "Apple", round: "Hiring manager and behavioural", decider: "hiring manager and team",
    style: "Team-specific and led by the hiring manager or a peer manager. 'Why Apple?' is a real evaluation. Probe customer focus, product judgement, ownership, conflict and discretion: the candidate should say what they can't share about confidential past work rather than overshare.",
    values: "Product and customer care, ownership, collaboration, attention to detail, confidentiality.",
    prompts: ["Why Apple, and why this team?", "Tell me about a product decision you influenced for the user's sake.", "Describe a time you owned a problem end to end.", "Tell me about a disagreement with a product manager.", "Tell me about a detail you sweated that others overlooked."],
    dims: [STRUCT, D("product", "Product judgement", "care for users and product quality"), D("ownership", "Ownership", "end-to-end responsibility"), IMPACT, D("discretion", "Discretion", "professional about confidential details")],
    teams: ["iOS frameworks", "Siri understanding", "iCloud storage", "Apple Pay", "Camera software", "Maps services"],
    loop: () => [R("coding", 60, "Coding 1"), R("coding", 60, "Coding 2"), R("hld", 60, "System design"), R("behavioral", 45, "Hiring manager")],
  },
  {
    id: "netflix", name: "Netflix", round: "Culture", decider: "hiring manager",
    style: "The culture memo is the rubric. Probe candour (giving and receiving hard feedback), judgement with incomplete context, selflessness, courage and independence (freedom and responsibility). Ask about the keeper test and about adapting to a new team and earning trust.",
    values: "Netflix culture memo: Dream Team, People over Process, Uncomfortably Exciting, Great and Always Better; selflessness, judgement, candour, creativity, courage, inclusion, curiosity, resilience; context not control; highly aligned, loosely coupled.",
    prompts: ["Tell me about the hardest feedback you've given a colleague.", "Describe a decision you made without full context. How did it turn out?", "Tell me about a time you put the team's interest above your own.", "How would you apply the keeper test to your current team?", "Tell me about joining a new team and earning their trust."],
    dims: [STRUCT, D("candour", "Candour", "direct, kind, timely feedback given and received"), D("judgement", "Judgement", "good decisions with incomplete information, independence"), IMPACT, D("culture", "Culture alignment", "selflessness, courage and freedom with responsibility")],
    teams: ["Playback encoding", "Personalisation", "Studio engineering", "Edge networking", "Experimentation platform", "Games platform"],
    loop: () => [R("coding", 60, "Coding"), R("hld", 60, "System design 1"), R("hld", 60, "System design 2"), R("behavioral", 60, "Culture")],
  },
  {
    id: "uber", name: "Uber", round: "Collaboration and leadership", decider: "debrief with a bar raiser",
    style: "Probe collaboration, leadership and ownership, using Uber's values as themes ('Trip Obsessed', 'One Uber'). Ask for real situations with measurable results and how the candidate worked across teams.",
    values: "Go get it, Trip obsessed, Build with heart, Stand for safety, One Uber (secondary sources list more).",
    prompts: ["Tell me about a time you obsessed over a rider's or customer's experience.", "Describe working with another team towards one goal.", "Tell me about a time you raised the bar on quality or safety.", "Tell me about a project you drove from start to finish.", "Tell me about a conflict and how you resolved it."],
    dims: [STRUCT, D("collaboration", "Collaboration", "working across teams, One Uber"), D("leadership", "Leadership", "driving outcomes, owning the problem"), IMPACT, D("reflection", "Reflection", "learning and change")],
    teams: ["Rides marketplace", "Delivery dispatch", "Payments", "Maps ETA", "Safety", "Adtech"],
    loop: () => [R("coding", 60, "Coding 1"), R("coding", 60, "Coding 2"), R("hld", 60, "System design"), R("behavioral", 60, "Collaboration and leadership")],
  },
  {
    id: "adobe", name: "Adobe", round: "Hiring manager and values", decider: "hiring manager",
    style: "Probe Adobe's values with specific examples and measurable impact; ask how the candidate uses AI to raise their impact (in their own voice).",
    values: "Create the future, Own the outcome, Raise the bar, Be genuine (2023).",
    prompts: ["Tell me about a time you owned an outcome nobody assigned you.", "Describe raising the quality bar on your team.", "Tell me how you've used AI to increase your impact at work.", "Tell me about a time you had to be candid about a problem.", "What's something you built that you'd call 'creating the future'?"],
    dims: [STRUCT, D("ownership", "Own the outcome", "responsibility for results end to end"), D("bar", "Raise the bar", "quality and improvement"), IMPACT, D("genuine", "Be genuine", "honest, specific, self-aware")],
    teams: ["Photoshop web", "Acrobat services", "Experience Platform", "Firefly serving", "Premiere Pro", "Document Cloud"],
    loop: () => [R("coding", 60, "Coding 1"), R("coding", 60, "Coding 2"), R("hld", 60, "System design"), R("behavioral", 45, "Hiring manager")],
  },
  {
    id: "intuit", name: "Intuit", round: "Values and craft", decider: "hiring manager and panel",
    style: "Probe Intuit's operating values, especially customer obsession ('fall in love with customers' problems') and integrity. Ask about AI use: what AI output the candidate accepted or rejected and why.",
    values: "Integrity Without Compromise, Courage, Customer Obsession, Stronger Together, We Care and Give Back.",
    prompts: ["Tell me about a time you fell in love with a customer's problem.", "Describe a time you did the right thing when nobody was watching.", "Tell me about a bold decision you made.", "Tell me about AI-generated code you rejected and why.", "Describe working with a team to achieve more together."],
    dims: [STRUCT, D("customer", "Customer obsession", "deep understanding of customer problems"), D("integrity", "Integrity and courage", "doing the right thing; bold, honest choices"), IMPACT, D("together", "Stronger together", "collaboration")],
    teams: ["TurboTax", "QuickBooks payments", "Credit Karma", "Mailchimp", "Intuit AI platform", "Data platform"],
    loop: () => [R("coding", 60, "Coding 1"), R("coding", 60, "Coding 2"), R("hld", 60, "System design"), R("behavioral", 45, "Values")],
  },
  {
    id: "goldman", name: "Goldman Sachs", round: "Managerial and values", decider: "team managers after the superday",
    style: "Probe the firm's core values and resume depth: SDLC, testing, production support, and 'why Goldman Sachs and not a tech company?'. Expect precise answers about past projects and how quality was ensured.",
    values: "Partnership, Client Service, Integrity, Excellence (from the firm's Business Principles).",
    prompts: ["Why Goldman Sachs and not a tech company?", "Walk me through a production incident you handled.", "Tell me how you ensured quality in your last release.", "Tell me about a time you put a client's interest first.", "Describe a time you worked closely with a non-engineering team."],
    dims: [STRUCT, D("client", "Client service", "focus on clients and stakeholders"), D("integrity", "Integrity and excellence", "honesty, quality, attention to risk"), IMPACT, D("partnership", "Partnership", "teamwork across functions")],
    teams: ["Marcus engineering", "Trade booking", "Risk platform", "Transaction banking", "Data engineering", "Core engineering"],
    loop: (l) => l === "L5" || l === "L6" ? [R("coding", 60, "Coding"), R("hld", 60, "System design"), R("lld", 60, "Design"), R("behavioral", 45, "Managerial")]
      : [R("coding", 60, "Coding 1"), R("coding", 60, "Coding 2"), R("lld", 60, "Design"), R("behavioral", 45, "Managerial")],
  },
  {
    id: "morgan-stanley", name: "Morgan Stanley", round: "Managerial and HR", decider: "team managers",
    style: "Probe core values and depth on past projects; expect questions on ownership of production systems, clients and doing the right thing.",
    values: "Do the Right Thing, Put Clients First, Lead with Exceptional Ideas, Commit to Diversity and Inclusion, Give Back.",
    prompts: ["Why Morgan Stanley?", "Tell me about a time you did the right thing under pressure.", "Describe an idea you proposed that changed how your team worked.", "Tell me about supporting a production system through a difficult incident.", "Tell me about a time you put a client first."],
    dims: [STRUCT, D("right", "Do the right thing", "integrity and judgement"), D("clients", "Clients first", "client and stakeholder focus"), IMPACT, D("ideas", "Exceptional ideas", "initiative and improvement")],
    teams: ["Wealth management platform", "Equities technology", "Risk technology", "Enterprise infrastructure", "Data platform", "Client onboarding"],
    loop: () => [R("coding", 60, "Coding 1"), R("coding", 60, "Coding 2"), R("lld", 60, "Design"), R("behavioral", 45, "Managerial")],
  },
  {
    id: "deshaw", name: "D. E. Shaw", round: "Fit and reasoning", decider: "hiring team",
    style: "Dig into how the candidate reasoned: why each decision, what they'd do differently. Expect clear, concise communication and intellectual curiosity; probe collaboration and high standards.",
    values: "Uphold high standards, analyse rigorously, communicate clearly and concisely, thrive on collaboration, demonstrate intellectual curiosity.",
    prompts: ["Walk me through the hardest technical decision you made last year and how you reasoned about it.", "What would you do differently on your last project?", "Tell me about something you learned recently out of curiosity.", "Describe a time you raised the standard of your team's work.", "Tell me about a collaboration that was hard."],
    dims: [STRUCT, D("rigour", "Rigorous reasoning", "clear reasoning behind decisions"), D("communication", "Clear communication", "concise, precise answers"), IMPACT, D("curiosity", "Curiosity", "learning and intellectual curiosity")],
    teams: ["Trading systems", "Research platform", "Risk technology", "Infrastructure", "Data engineering", "Portfolio analytics"],
    loop: () => [R("coding", 60, "Coding 1"), R("coding", 60, "Coding 2"), R("lld", 60, "Design and concurrency"), R("behavioral", 45, "Fit")],
  },
  {
    id: "flipkart", name: "Flipkart", round: "Hiring manager", decider: "hiring manager after the knockout rounds",
    style: "Hiring-manager round on past projects, career goals and Flipkart's values. Probe ownership, bias for action and customer focus with specific examples.",
    values: "Audacity, Bias for Action, Customer First with Integrity, Inclusion.",
    prompts: ["Walk me through the project you're proudest of.", "Tell me about a time you acted quickly without all the information.", "Describe a bold bet you made.", "Tell me about putting the customer first when it was hard.", "Where do you want to be in three years?"],
    dims: [STRUCT, D("audacity", "Audacity and bias for action", "bold, timely decisions"), D("customer", "Customer first", "customer focus with integrity"), IMPACT, D("ownership", "Ownership", "end-to-end responsibility")],
    teams: ["Search and browse", "Checkout and payments", "Supply chain", "Ads", "Flipkart Minutes", "Seller platform"],
    loop: () => [R("lld", 90, "Machine coding"), R("coding", 60, "Problem solving"), R("hld", 60, "System design"), R("behavioral", 45, "Hiring manager")],
  },
  {
    id: "atlassian", name: "Atlassian", round: "Values", decider: "independent hiring committee",
    style: "A values interview run by someone outside the team. Probe each of Atlassian's five values with real examples.",
    values: "Open company, no bullshit; Build with heart and balance; Don't #@!% the customer; Play, as a team; Be the change you seek.",
    prompts: ["Tell me about a time you were open about a problem others preferred to hide.", "Describe a time you protected a customer from a bad decision.", "Tell me about a time you changed something you didn't like at work.", "How do you keep balance during intense periods?", "Tell me about a time you played as a team when it cost you."],
    dims: [STRUCT, D("openness", "Open company", "transparency and honesty"), D("customer", "Customer care", "protecting customers"), IMPACT, D("team", "Team play", "collaboration and change")],
    teams: ["Jira platform", "Confluence editor", "Bitbucket pipelines", "Atlassian Intelligence", "Identity", "Data platform"],
    loop: () => [R("coding", 60, "Coding"), R("coding", 60, "Code design"), R("hld", 60, "System design"), R("behavioral", 45, "Values")],
  },
  {
    id: "airbnb", name: "Airbnb", round: "Core values", decider: "hiring committee",
    style: "Core-values interviews that can veto a strong technical result. Probe genuine alignment with the mission and with hosts and guests, and how the candidate collaborates.",
    values: "Airbnb's core values and mission of belonging, judged per value.",
    prompts: ["Why Airbnb?", "Tell me about a time you created a sense of belonging on a team.", "Describe going above and beyond for a user.", "Tell me about a time you took a risk that didn't work.", "Describe a disagreement and how you resolved it."],
    dims: [STRUCT, D("mission", "Mission alignment", "genuine connection to hosts, guests and belonging"), D("values", "Core values", "evidence across the core values"), IMPACT, D("collaboration", "Collaboration", "working well with others")],
    teams: ["Search ranking", "Payments", "Trust", "Host tools", "Experiences", "Infrastructure"],
    loop: () => [R("coding", 60, "Coding 1"), R("coding", 60, "Coding 2"), R("hld", 60, "System design"), R("behavioral", 45, "Core values")],
  },
];

export const companyById = (id?: string): CompanyStyle => COMPANIES.find((c) => c.id === id) ?? COMPANIES[0];
