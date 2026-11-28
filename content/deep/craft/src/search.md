=== resume
blurb: What actually happens to your resume: applicant tracking systems store and search it but rarely auto-reject it, while knockout questions and a 30-second human skim do the filtering. One page, impact bullets with numbers (Google's X-Y-Z formula), keywords from the posting, and India conventions (no photo, no date of birth, no CTC).
signals: You're applying online and hearing nothing back | Someone tells you to "beat the ATS" | Your resume lists duties, not results | You're unsure whether to add a photo or CTC
prereq: hiring-pipeline

--- lesson
:::words
- **ATS (applicant tracking system)**: the software recruiters use to receive, store, search and track applications. Examples: Greenhouse, Lever, Workday, Ashby.
- **Knockout question**: a yes/no question on the application form that can filter you automatically ("Do you need visa sponsorship?", "Can you work in Bengaluru?", "Is your notice period under 60 days?").
- **Screener**: the recruiter or sourcer who first reads your resume.
- **Impact bullet**: a resume line that says what you achieved and how it was measured, not just your duties.
- **X-Y-Z formula**: Google's bullet pattern: "Accomplished X, as measured by Y, by doing Z."
- **Pedigree**: well-known company and college names.
:::

## The problem in plain words

A resume has one job: in about thirty seconds, make a busy person believe you are worth an interview at a particular level. Most resume advice online is about fooling software. The evidence says software is not the main filter; people skimming fast, knockout questions and sheer volume are. So write for a human who will glance at it for half a minute.

:::eli5
A resume is a shop window, not a catalogue. People walk past in seconds. Put your three best products in front, with price tags (numbers), and make the shop's name readable from across the street (recognisable companies, the role you want).
:::

## The "ATS rejects 75% of resumes" myth

Enhancv traced the popular "75% of resumes are rejected by software" claim to a 2012 sales pitch from a vendor that shut down in 2013, not to any study. In Enhancv's 2025 interviews with 25 US recruiters, **23 of 25 (92%) said their systems do not auto-reject resumes for formatting, content or design**; only 2 configured content-based rejection, and only for strict criteria. 44% had an AI "fit score" in their ATS, mostly used as a guide (reputable, but a small sample from a company that sells resume tools).

What does filter automatically: **knockout questions**. For Indian candidates the riskiest knockout fields are **location** and **notice period** (inference from the research).

The real problem is **volume**. Ashby's data show each hire now needs about twice as many interviewed applicants as in 2021 (reputable), and recruiters skim.

## How humans actually read resumes

interviewing.io and the Learning Collider research lab had 76 technical recruiters evaluate over 1,000 engineer resumes, then compared their picks with how the candidates actually performed in interviews (reputable):

- Recruiters picked correctly **55%** of the time, "just slightly better than a coin flip".
- Two recruiters agreed on the same resume only **64%** of the time.
- Median time per resume: **31 seconds** (25 seconds for those advanced).
- Experience at a top-tier company made a candidate **35% more likely** to be picked.

interviewing.io's conclusion: polishing helps most if you already look good on paper; otherwise, stop relying only on online applications and use referrals and direct outreach (see [Referrals and cold outreach](/learn/referrals-outreach)).

## The rules that hold up

**One page.** Tech Interview Handbook: "Use only 1 page for your resume" (reputable). Two pages only at very senior levels with many relevant roles.

**Impact bullets with numbers.** Google recruiters' X-Y-Z formula: "Accomplished [X] as measured by [Y], by doing [Z]" (official, via Google recruiters and press). Amazon India (2024): Amazon is "a data-driven company", so quantify results wherever possible, list accomplishments not duties, though not every bullet needs a metric (official).

| Weak (duty) | Strong (impact) |
|---|---|
| Worked on the payments service | Cut payment failures 38% (from 2.1% to 1.3%) by adding idempotent retries and a dead-letter queue to the payments service |
| Responsible for search | Improved search click-through 12% across 40 M monthly users by adding a learning-to-rank model with 30 features |
| Did code reviews and mentoring | Mentored 3 engineers to promotion; introduced design reviews adopted by 4 teams |

**Mirror the job description.** Lift the posting's key words where they're true (languages, systems, "distributed systems", "ML ranking"); spell out abbreviations once ("Amazon Web Services (AWS)"); don't stuff (Tech Interview Handbook, Amazon India).

**Simple layout.** Text-forward, black and white (Amazon India); standard fonts at 10 points or more, standard section headings, no tables or text in headers/footers, submitted as PDF (Tech Interview Handbook). This helps both parsing and skimming.

**Order.** Experience first once you've worked for three years or more; education first only if you're a student or early-career (Tech Interview Handbook).

## What goes where (one page)

1. **Header**: name, city, phone, email, LinkedIn, GitHub or portfolio. No photo.
2. **Experience**: for each recent role, 3–5 impact bullets, most impressive first. Company names and titles readable at a glance.
3. **Skills**: languages, frameworks, systems, ML tools. Only ones you'd be happy to be quizzed on.
4. **Education**: degree, college, year.
5. **Optional**: notable projects, open source, publications, competitive programming ranks, patents.

## Senior resumes

There's no data on how senior resumes are read differently, but the level rules (see [How your level is decided](/learn/levels-decided)) suggest: show **scope** (services owned, teams influenced, engineers mentored, design decisions led) as well as results. "Led the design of…" and "drove a migration across 3 teams…" read senior; "implemented features" reads mid.

## India conventions

Modern Indian tech resumes omit **photo, date of birth, marital status and religion**; older "biodata" and government formats still include them (anecdotal, resume-vendor guides). **Current and expected CTC** belong on the application form or in the recruiter call, not on the resume. Some IT-services firms still ask for a photo; you can comply where required, but don't add one for product companies or GCCs.

**Dates must match your records.** Background verification in India compares your stated dates and employers with provident-fund (UAN) records; a vendor study put white-collar discrepancy rates at about 6% (reputable press reporting a vendor study). Be exact.

## Tailoring without rewriting

Build one general resume from 3–5 target job descriptions, then adjust emphasis (reorder bullets, swap a skill) per role rather than writing a new resume each time (Tech Interview Handbook, Amazon India). Don't apply to many roles at the same company at once; recruiters see all your applications.

## For ML and AI engineers

Lead with shipped models and measured outcomes (online metrics, latency, cost), not only model names: "Shipped a two-tower retrieval model that raised watch time 4% in an A/B test across 20 M users, serving at p99 18 ms". Papers and Kaggle ranks go in an optional section.

--- revise
### Myths and reality
? Where does "ATS rejects 75%" come from? :: A 2012 vendor sales pitch, not a study.
? What did Enhancv's 2025 recruiter interviews find? :: 92% said their ATS doesn't auto-reject for format or content.
? What really filters automatically? :: Knockout questions (location, visa, notice period) and volume.
? interviewing.io recruiter study: accuracy and time? :: 55% correct, 64% agreement, median 31 seconds; top-company experience +35%.

### Writing
? Google's X-Y-Z formula? :: Accomplished X, as measured by Y, by doing Z.
? Length rule? :: One page (two only for very senior candidates).
? How do you use the job description? :: Mirror true keywords, spell out abbreviations once, don't stuff.
? What makes a senior resume read senior? :: Scope: services owned, designs led, teams influenced, people mentored.

### India
? What to leave off an Indian tech resume? :: Photo, date of birth, marital status, religion, CTC.
? Why must dates match exactly? :: Background checks compare them with UAN/provident-fund records.
? Riskiest knockout fields for Indian candidates? :: Location and notice period.

--- notes
## Myth
"75% auto-rejected" = 2012 vendor pitch. Enhancv 2025: 23/25 recruiters no auto-reject; 44% have AI fit score (guide).
Real filters: knockout questions (location, visa, notice) + volume (Ashby: ~2× interviews per hire vs 2021).
## Humans (interviewing.io, 76 recruiters)
55% accurate · 64% agree · 31 s median · top-tier employer +35%.
## Rules
One page (TIH). X-Y-Z bullets (Google). Quantify, accomplishments not duties (Amazon India 2024).
Mirror job keywords; spell out abbreviations; no stuffing. Plain layout, ≥10 pt, PDF, standard headings.
Experience first after ~3 years.
## Layout
Header (no photo) → experience (3–5 impact bullets/role) → skills → education → optional projects/papers.
## Senior
Show scope: owned, led design, cross-team, mentored.
## India
No photo/DOB/marital/religion/CTC. Dates exact (UAN-based BGV; ~6% discrepancy rate).
## Tailor
One base from 3–5 postings; reorder per role; don't spray one company.

--- doubts
Q: Should I use an "ATS-friendly" resume template or tool?
A: Simple, single-column, text-based layouts are worth using because they parse cleanly and skim well. You don't need keyword-stuffing tools; recruiters read the resume, and stuffing makes it worse for them.

Q: My company is not well known. How do I compete with FAANG resumes?
A: Make the work legible: what the company does (one phrase), the scale (users, requests, money), and your measurable results. Then lean on referrals and direct outreach, which interviewing.io found matter most when your resume lacks brand names.

Q: Should I list every technology I've touched?
A: No. List what you'd be comfortable being questioned on. A long list invites questions on things you barely know and dilutes the strong items.

--- exercises
[fix] Rewrite as an X-Y-Z bullet: "Worked on improving the performance of the checkout API."
A: Example: "Reduced checkout API p99 latency from 1.2 s to 300 ms for 2 M daily orders by replacing N+1 database queries with batched reads and adding a Redis cache." X = reduced latency, Y = 1.2 s → 300 ms at 2 M orders/day, Z = batching and caching. Use your real numbers.

[fix] An Indian resume has a photo, date of birth, "Current CTC: 18 LPA, Expected: 30 LPA", and four pages of project descriptions. Fix it for a Google application.
A: Remove photo, date of birth and CTC (CTC goes on the form or in the recruiter call). Cut to one page: latest roles first with 3–5 impact bullets each, skills, education, and one optional line for notable projects. Make sure dates match UAN records.

[plan] Pick three target job postings and list the five keywords that appear in at least two of them. Where on your resume will each one appear, truthfully?
A: Example output: "distributed systems" → current-role bullet about the order service; "Kafka" → skills plus the streaming-migration bullet; "Java" → skills; "system design" → "led the design of…" bullet; "mentoring" → mentoring bullet. Only include keywords you can back up.

--- pitfalls
- Listing duties instead of measured results
- Multi-page resumes at mid level
- Keyword stuffing for imaginary software filters
- Photo, date of birth or CTC on a product-company resume
- Dates that don't match provident-fund records
- Relying only on online applications with a low-brand resume

--- quiz
Q: In Enhancv's 2025 recruiter interviews, how many said their ATS auto-rejects resumes for formatting or content?
- Most of them
- About half
- *Very few (2 of 25)
- All of them
W: Knockout questions and volume do most of the filtering.

Q: Which bullet follows Google's X-Y-Z formula?
- "Responsible for the payments team"
- *"Cut payment failures 38% by adding idempotent retries"
- "Java, Kafka, Kubernetes"
- "Hard-working team player"
W: Achievement (X), measure (Y), method (Z).

Q: In interviewing.io's study, recruiters spent a median of about how long per resume?
- 3 minutes
- *31 seconds
- 6 minutes
- 2 seconds
W: Write for a 30-second skim.

--- sources
- article :: Does an ATS reject resumes? (recruiter interviews, 2025) :: Enhancv :: https://enhancv.com/ats-hub/
- article :: Are recruiters better than a coin flip at judging resumes? :: interviewing.io :: https://interviewing.io/blog/are-recruiters-better-than-a-coin-flip-at-judging-resumes
- article :: Google recruiters share the formula for stronger resumes :: CNBC (2018) :: https://www.cnbc.com/2018/08/16/google-recruiters-share-the-3-part-formula-for-stronger-resumes.html
- article :: 4 ways to write your Amazon resume :: About Amazon India (2024) :: https://www.aboutamazon.in/news/workplace/amazon-india-job-resume-tips
- article :: Resume guide :: Tech Interview Handbook :: https://www.techinterviewhandbook.org/resume/

=== referrals-outreach
blurb: Referrals are about 1% of applications but get interviewed about 13 times as often as cold applications. Who to ask, what to send so the referral is easy and strong, why referrals from strangers help little, and how to write short outreach to hiring managers and recruiters.
signals: You've applied online to ten companies and heard nothing | You know someone at a target company | You're considering messaging strangers on LinkedIn for referrals | A recruiter messaged you
prereq: resume

--- lesson
:::words
- **Referral**: an employee formally recommends you through the company's system. Most companies pay employees a referral bonus if you're hired.
- **Warm referral**: from someone who has worked with you or knows your work.
- **Cold referral**: from someone who doesn't know you (for example a stranger on LinkedIn).
- **Inbound application**: applying through the careers website.
- **Sourced candidate**: someone a recruiter found and contacted.
- **Hiring manager (HM)**: the manager who owns the role.
:::

## The problem in plain words

Applying online often feels like posting letters into a void. A referral puts your resume in front of a person with an employee's name attached. The data say it matters enormously, but only when the referrer can vouch for you.

:::eli5
A restaurant gets a hundred job applications and one friend of the chef saying "this cook worked with me for two years, she's great". Who gets the first trial? The friend's recommendation, because someone the chef trusts has seen the cook work.
:::

## What the data say

**Ashby** (an ATS vendor) analysed over 38 million applications across 93,000 jobs from 2021 to 2024 (reputable, vendor data):

| Source | Share of applications | Application → interview | Interview → offer |
|---|---|---|---|
| Referred | ~1% | **40%** | **16%** |
| Sourced by a recruiter | — | 25% | 6% |
| Inbound (applied online) | most | **3%** | 6% |

So a referral got about 13 times the interview rate of a cold application, and a much better chance of an offer after interviewing. Inbound still produced the most hires in absolute numbers, because there are so many inbound applications.

**interviewing.io** surveyed about 500 mostly experienced engineers (average 8 years) on what actually got them in the door (reputable):

- **Effective**, best first: warm referrals → in-house recruiters contacting you → applying online → cold outreach to hiring managers.
- **Ineffective**: cold outreach to recruiters, **cold referrals from strangers**, and agency recruiters contacting you (worst).
- Cold referrals were net negative at FAANG and small startups, because they are often logged as "leads" rather than genuine referrals.

## Who to ask, in order

1. People who have **worked with you**: ex-colleagues, former managers, team leads who moved companies.
2. People who **know your work**: college batchmates, open-source collaborators, people from meetups or study groups.
3. Second-degree connections introduced by someone in groups 1–2.
4. Strangers: only as a last resort, and expect little.

## Make it easy for the referrer

Send, in one message:
- The **exact job link or ID**.
- Your **one-page resume** (PDF).
- **Two or three lines they can paste** about why you fit.
- Your notice period and location if relevant.

Suggested message (not from a source):

> Hi Ananya! Hope the new team is going well. I'm applying for the Senior Backend Engineer role on Flipkart's payments team (job ID 12345, link). I've spent four years on settlement systems at Razorpay, most recently leading the move to streaming settlement. Would you be comfortable referring me? Resume attached; here's a short blurb you could use: "Worked with Arun for two years at X; strong on distributed systems and owns production well." No worries at all if not.

Then thank them, and tell them how it went: referrers like knowing.

## Cold outreach that works better than cold referrals

interviewing.io's follow-up argues that **cold outreach to hiring managers** (not recruiters) gives the best mix of effectiveness and control when done well: short, personalised messages about your work, ideally by email rather than LinkedIn (reputable, opinion). Generic cold recruiting messages are quoted at 1–5% response rates by recruiting-tool blogs; no engineer-to-engineer LinkedIn response-rate study exists (anecdotal).

A good hiring-manager message:
- Subject or first line names the role and one concrete reason you fit.
- Two or three sentences on relevant, measurable work.
- One link (GitHub, a write-up, a talk).
- A small ask: "Would you be open to passing my profile to your recruiter, or a 15-minute call?"
- Under 120 words.

Suggested example (not from a source):

> Subject: Senior SWE, Search Ranking: ranking work at 40 M users
> Hi Vikram, I saw the Search Ranking opening on your team. At Meesho I led the learning-to-rank rollout that lifted search conversion 9% across 40 M monthly users, and cut p99 ranking latency to 25 ms. Short write-up here: [link]. If it looks relevant, would you be open to passing my profile to your recruiter? Thanks, Arun

## When a recruiter contacts you

In-house recruiters reaching out ranked second-best in interviewing.io's survey. Reply promptly, confirm interest, give your target level, location and notice period, and ask for the process and timeline (see [The recruiter call](/learn/recruiter-call)). Agency (third-party) recruiters ranked worst; they can help in some markets but check what they're actually offering.

## Referrals and the rest of the process

A referral gets you **read**, not hired. After the referral, the bar is the same. One other effect: referred candidates sometimes get a slightly more personal recruiter experience and faster scheduling (inference). Apply to all your target companies within about a week so processes run in parallel (see [Running many processes at once](/learn/parallel-processes)).

--- revise
### Data
? Ashby: referred vs inbound application-to-interview rates? :: About 40% vs 3%.
? Ashby: interview-to-offer for referred vs inbound? :: About 16% vs 6%.
? Share of applications that are referrals? :: About 1%.
? interviewing.io: most effective channel? :: Warm referrals.
? interviewing.io: are cold referrals from strangers effective? :: No; often logged as leads, net negative at FAANG.

### Asking
? Who should you ask first? :: People who have worked with you, then people who know your work.
? Four things to send a referrer? :: Job link/ID, one-page resume, a pasteable 2–3-line blurb, notice period and location.
? Better alternative to cold referrals? :: Short, personalised outreach to the hiring manager.

### Outreach
? Shape of a good hiring-manager message? :: Role + reason in line one, measurable work, one link, small ask, under ~120 words.
? Does a referral lower the interview bar? :: No; it gets you read, not hired.

--- notes
## Data (Ashby, 38 M applications 2021–24)
Referrals ~1% of applications. App→interview: referred 40%, sourced 25%, inbound 3%. Interview→offer: 16% / 6% / 6%. Inbound = most hires overall.
## interviewing.io survey (~500, avg 8 yrs)
Effective: warm referral > in-house recruiter > online > cold HM outreach.
Ineffective: cold recruiter outreach, cold referrals (net negative at FAANG), agency recruiters (worst).
## Ask order
Worked with you → know your work → second-degree intro → strangers (last resort).
## Make it easy
Job link/ID · 1-page PDF · 2–3-line blurb · notice + location. Thank and update them.
## Hiring-manager outreach
Role + one reason · 2–3 sentences of measurable work · one link · small ask · <120 words · email > LinkedIn.
Generic cold messages: 1–5% replies (blogs).
## After
Referral = read, not hired. Apply to all targets within a week.

--- doubts
Q: Is it awkward to ask an ex-colleague for a referral?
A: Rarely. Many companies pay referral bonuses, and good referrals reflect well on the referrer. Make it easy, give them an easy way to say no, and only ask people who can genuinely vouch for you.

Q: Should I message 50 strangers at Google asking for referrals?
A: The survey data say cold referrals help little and can even be counted as weak leads. Spend that time on a few warm contacts, short hiring-manager outreach, and a strong application.

Q: Can I be referred to several roles at once?
A: Usually one referral for the most relevant role is best; recruiters can route you to other teams. Many applications to one company can look unfocused.

--- exercises
[say] Write a referral request to a former teammate now at Atlassian for a P50 backend role.
A: Suggested wording (not from a source): "Hi Neha, hope Atlassian is treating you well! I'm applying for the Senior Backend Engineer (P50) role on Jira's platform team: [link]. You saw my work on the notification service at X; since then I've led our migration to event-driven delivery (3 teams, 40% lower infra cost). Would you be comfortable referring me? Resume attached, and here's a two-line blurb you could paste: '…'. Totally fine if not!"

[fix] Improve this LinkedIn message to a stranger: "Hi, I am looking for job change. Please refer me to any suitable role in your company. Resume attached."
A: Better to target a hiring manager and be specific: "Hi Rohan, I saw the ML Engineer opening on your Ads Ranking team (link). At Swiggy I built the CTR model behind restaurant ranking (+6% orders in an A/B test, 25 ms p99). If relevant, would you be open to passing my profile to your recruiter? Thanks." Specific role, evidence, one small ask.

[plan] List your top 10 target companies and, for each, the warmest contact you have. What will you do for the three with no contact?
A: Example: for each company write a name and relationship (ex-colleague, batchmate) or "none". For the "none" companies: find the hiring manager for the specific team, send short outreach by email, and submit a strong online application at the same time.

--- pitfalls
- Asking strangers for referrals en masse
- Sending a referrer only "please refer me" with no job link or blurb
- Asking someone who can't vouch for your work
- Long, generic outreach messages
- Treating a referral as a guarantee

--- quiz
Q: In Ashby's data, referred applicants were interviewed about how often compared with inbound applicants?
- About the same
- Twice as often
- *About 13 times as often (40% vs 3%)
- Less often
W: Referrals are a tiny share of applications but convert far better.

Q: Which channel ranked among the least effective in interviewing.io's survey?
- Warm referrals
- *Cold referrals from strangers
- In-house recruiters contacting you
- Applying online
W: Often logged as mere leads.

Q: The best thing to include in a referral request is…
- A long cover letter
- *The exact job link, a one-page resume and a short blurb they can paste
- Your salary expectations
- A list of every job at the company
W: Make the referral easy and specific.

--- sources
- article :: Talent Trends Report: referrals (2025) :: Ashby :: https://www.ashbyhq.com/talent-trends-report/reports/referrals
- article :: How to get in the door at top companies, part 1 :: interviewing.io :: https://interviewing.io/blog/how-to-get-in-the-door-at-top-companies-part-1
- article :: How to get in the door, part 2: cold outreach to hiring managers :: interviewing.io :: https://interviewing.io/blog/how-to-get-in-the-door-at-top-companies-cold-out-reach-to-hiring-managers-part-2

=== recruiter-call
blurb: The first call with a recruiter: what it's for, what they need from you, and the questions you should ask. How to handle "current CTC" and "expected CTC", notice period, level, timeline and other companies without hurting your negotiation later.
signals: A recruiter has scheduled a "quick chat" | They ask your current and expected CTC | They ask about your notice period | They ask which other companies you're talking to
prereq: referrals-outreach

--- lesson
:::words
- **Recruiter screen**: a 20–30 minute call to check fit, level, logistics and interest. Usually not technical, though some recruiters ask a few basic questions.
- **Current CTC / expected CTC**: your present Indian package and what you want. Recruiters ask both, often in the first call.
- **Band**: the pay range for a level at that company.
- **Notice period**: how long your current contract makes you wait before leaving (often 30–90 days in India).
:::

## The problem in plain words

The recruiter call feels casual, but it sets three things that are hard to change later: the **level** you interview for, your **timeline**, and the **anchor** for pay. Recruiters are usually on your side (they want to fill the role), but they also work for the company. Go in knowing what you want to say about each topic.

:::eli5
The first phone call with a wedding planner sets the budget, the date and the size of the event. Change those later and everything shifts. Be clear about the date and size; be careful about naming the budget too early.
:::

## What the recruiter needs from you

- **Motivation**: why this company and role (30 seconds, specific).
- **Background**: a short summary of your experience at the right level.
- **Level**: which level you're targeting (see [How your level is decided](/learn/levels-decided)).
- **Logistics**: location, hybrid preference, notice period, earliest joining date, visa needs.
- **Timeline**: when you can interview, and whether other processes are running.

Have a 60–90 second "about me" ready (see [Interviewer biases](/learn/interviewer-biases) on first impressions).

## Questions you should ask

- What are the rounds, in what order, and how long is each? Is any round in person? Are AI tools allowed in any round? Which language or environment will I code in?
- Which level is this loop calibrated for?
- Who makes the decision (committee, bar raiser, hiring manager)? What's the usual timeline?
- Is there team matching after the loop? Which teams are hiring?
- What preparation material does the company share? (Google, Amazon, Meta and others send prep guides.)
- What's the cool-down if it doesn't work out this time?

## Current and expected CTC

Recruiters often ask about compensation "very early… maybe even during the first call" (interviewing.io, reputable). In India, current and expected CTC are standard questions, often on the application form too.

What the sources advise:
- **Early, try not to name a number.** Aline Lerner (interviewing.io co-founder) suggests: "At this point, I don't feel equipped to throw out a number", then say you want to learn more and will discuss once there's an offer. She ends every script with: "I promise not to accept other offers until I have a chance to discuss them with you." (reputable)
- **Don't reveal your target or floor.** Haseeb Qureshi: asking for a specific number reveals your floor; if you must disclose current pay, give the total package and frame it as "looking for a step up" (reputable, 2016).
- **Counter-view:** "never say the first number" is an oversimplification; what matters is that any anchor is a good one. A middle path is to try once to get their band; if pressed, give a researched range whose bottom is your true target (anecdotal).
- **Amazon-specific:** avoid an exact number early; wait until you know your level (levels.fyi ex-Amazon recruiter, reputable).

**India reality:** you'll often have to state current CTC, and many companies later ask for payslips, so be accurate. Separate it from your expectation, and anchor the expectation on **market data for the new level**, not a percentage hike on current pay (see [Biases in evaluating offers](/learn/offer-biases)).

Suggested wording (not from a source):

> "My current CTC is ₹28 lakh, of which ₹24 lakh is fixed. For expected, I'd like to understand the level first; once we've confirmed it, I'd expect to be in line with the market for that level in Bengaluru."

If pressed for a number: give a researched range whose bottom is your real target, for the level you're targeting.

## Notice period

State it honestly and early, with your flexibility: "My notice period is 90 days; my employer allows a buyout, and I could likely join in 45–60 days." Notice period is a common knockout field, and many companies prefer 30–45-day joiners (anecdotal). Know your contract's buyout clause before the call. More in [India offer-stage norms](/learn/india-offer-norms).

## "Which other companies are you talking to?"

You don't have to name them. Career sources advise briefly saying whether you are interviewing elsewhere, without naming competitors or bluffing (reputable career sites). interviewing.io suggests a timeline framing that reveals nothing specific: "I expect to get through all my interviews and onsites in the next six weeks" (reputable).

Suggested wording (not from a source): "Yes, I'm in a couple of processes at a similar stage. This role is high on my list, so it would help to know your timeline."

Never invent offers.

## After the call

- Send a short thank-you email confirming the next steps and dates.
- Write down what they told you about rounds, level and timeline.
- Ask for any prep material they mentioned.

--- revise
### Purpose
? Three things the recruiter call sets? :: The level, the timeline and the pay anchor.
? Five things the recruiter needs from you? :: Motivation, background, target level, logistics (location, notice, visa), timeline.
? Six questions to ask the recruiter? :: Rounds and format, level, who decides and timeline, team match, prep material, cool-down.

### Money
? Lerner's early-stage script? :: "At this point, I don't feel equipped to throw out a number"; promise not to accept elsewhere without talking to them.
? Why not name a specific expected number early? :: It reveals your floor and anchors low.
? In India, how should you handle current CTC? :: State it accurately (payslips may be checked), but anchor expectation on market data for the new level.
? Amazon-specific advice? :: No exact number before you know your level.

### Logistics
? How do you state a 90-day notice? :: Honestly, with flexibility: buyout possibility and realistic joining date.
? "Which other companies?" — what do you say? :: That you're in a few processes at a similar stage, no names, no bluffing, and ask their timeline.

--- notes
## Sets
Level · timeline · pay anchor.
## They need
Motivation · background · level · location/notice/visa · timeline. 60–90 s about-me.
## Ask
Rounds/order/length · in-person? · AI rules · coding environment · level · who decides + timeline · team match · prep guides · cool-down.
## Money
Early: "not equipped to throw out a number" (Lerner); promise to discuss before accepting elsewhere.
Don't reveal floor (Qureshi). Counter-view: good anchor fine; give range with bottom = target.
Amazon: wait for level. India: current CTC accurate (payslips); expected = market for new level, not % hike.
## Notice
State honestly + buyout + realistic join date. Knockout field (30–45-day joiners preferred).
## Other companies
"A couple of processes at a similar stage"; no names; no bluffing; ask their timeline.
## After
Thank-you email confirming steps; notes; request prep material.

--- doubts
Q: The application form forces me to enter an expected CTC. What do I put?
A: Enter a researched figure for the level you're targeting, using levels.fyi and peers, with the bottom of your range as the floor you'd accept. Avoid a percentage hike on your current pay when moving to a higher-paying tier.

Q: Is the recruiter on my side?
A: Mostly: they're rewarded when roles are filled and offers accepted, so they want you to succeed. But they represent the company in negotiation. Be friendly and honest, and keep your numbers and alternatives to yourself until the right moment.

Q: Can the recruiter screen reject me?
A: Yes, usually for fit or logistics: wrong level, location, notice period, or unclear motivation. Prepare those answers as carefully as a technical question.

--- exercises
[say] The recruiter asks: "What's your current CTC and what are you expecting?" You earn ₹32 lakh (₹26 lakh fixed) and target a senior role at a higher-paying company. Write your answer.
A: Suggested wording (not from a source): "My current CTC is ₹32 lakh, ₹26 lakh fixed plus bonus and stock. On expectations, I'd like to confirm the level first. Assuming this is the senior level, I'd expect to be in line with the market for that level in Bengaluru, and I'm happy to discuss specifics once we're at the offer stage."

[plan] Write your one-page recruiter-call prep sheet.
A: Include: a 60-second about-me; why this company and role (two specific reasons); target level and one-line evidence; location, notice period, buyout clause and earliest join date; timeline of other processes (no names); your researched pay range for the level (not to say early); and your six questions (rounds/format/AI/environment, level, decision and timeline, team match, prep material, cool-down).

[fix] A candidate says in the first call: "I'm at 20 LPA, I want 40% hike, so 28 LPA." What's wrong and what would be better?
A: It anchors on current pay and reveals the floor. If the level's market is ₹40–50 lakh, they've just priced themselves far below it. Better: state current CTC if required, defer expectations until the level is set, and later anchor on market data for that level.

--- pitfalls
- Naming a specific expected number before the level is known
- Anchoring expectations as a percentage hike on current CTC
- Being vague about notice period and buyout
- Naming or inventing other offers
- Not asking about rounds, level, decision process and AI rules

--- quiz
Q: The recruiter call mainly sets…
- Your final offer
- *The level, the timeline and the pay anchor
- Your coding score
- The team you'll join
W: All three are hard to change later.

Q: Best way to answer "expected CTC?" in a first call, when you don't yet know the level?
- Name your current CTC plus 30%
- *Defer until the level is clear, then anchor on market data for that level
- Refuse to answer anything
- Say "whatever you think is fair"
W: Early specific numbers reveal your floor.

Q: "Which other companies are you interviewing with?" A good answer…
- Names every company and the stage
- Invents an offer to create urgency
- *Says you're in a few processes at a similar stage and asks their timeline
- Says none
W: Honest, specific about timing, no names, no bluffing.

--- sources
- article :: Don't sabotage your salary negotiation before it even starts :: Aline Lerner, interviewing.io :: https://interviewing.io/blog/sabotage-salary-negotiation-before-even-start
- article :: Ten rules for negotiating a job offer :: Haseeb Qureshi (2016) :: https://haseebq.com/my-ten-rules-for-negotiating-a-job-offer/
- article :: Amazon salary negotiation (ex-recruiter) :: levels.fyi blog :: https://www.levels.fyi/blog/amazon-salary-negotiation.html
- article :: How to answer "what other companies are you interviewing with?" :: The Muse :: https://www.themuse.com/advice/how-to-answer-what-other-companies-are-you-interviewing-with

=== prep-timeline
blurb: How long preparation takes and in what order: about 100 hours of coding practice to be well prepared, more weeks for senior design and behavioural work, mock interviews from early on, and real interviews as practice. Week-by-week plans for mid and senior engineers, and a planner you can adjust.
signals: You have an interview in four weeks and don't know where to start | You're senior and wonder how much LeetCode to do | You keep postponing mocks | A recruiter offers an interview date
widgets: prep-planner
prereq: recruiter-call

--- lesson
:::words
- **Mock interview**: a practice interview with a person (or an AI interviewer) under real conditions: timed, talking aloud, watched.
- **Reps**: repetitions. Here, the number of real or mock interviews you've done.
- **Pattern**: a family of problems solved the same way (sliding window, BFS, DP on intervals).
- **Story bank**: your prepared set of behavioural stories (see [STAR answers and a story bank](/learn/star-stories)).
:::

## The problem in plain words

Two questions trouble everyone: *how long* and *in what order*. The honest answer to "how long" is "longer than you think" (the planning fallacy). The answer to "in what order" depends on your level: mid-level loops are coding-heavy; senior loops are decided by design and behavioural rounds.

:::eli5
Training for a 10 km run: you don't only run 10 km every day. You build base fitness, add speed sessions, and do a few practice races before the real one. Coding practice is base fitness, design is the long run, and mock interviews are practice races.
:::

## How long

Tech Interview Handbook (reputable): about **30 hours** covers "the bare minimum" and about **100 hours** to be "well prepared"; it recommends about **3 months at 2–3 hours a day** for holistic preparation. At about 3 hours a day, the average person completes about 160 questions in 3–4 weeks.

There is no sourced data on prep length for senior versus mid engineers specifically. A reasonable default (inference from the sources):

| Level | Calendar time (working full time) | Split |
|---|---|---|
| Mid (L4 equivalent) | 8–10 weeks | ~60–70% coding, ~20% design, ~10–15% behavioural |
| Senior (L5 equivalent) | 10–12 weeks | ~40% coding, ~35–40% design, ~20% behavioural |
| ML engineer | add 2–4 weeks | ML breadth, ML system design and ML coding on top |

Add a 1.5–2× buffer for the planning fallacy (see [Biases in how you prepare](/learn/prep-biases)). interviewing.io suggests being conservative, "possibly tripling your own estimate" (reputable).

## Postponing is usually fine

interviewing.io: postponing is "almost always OK" at large companies with centralised hiring; recruiters "don't really care when you interview"; the risk is only at tiny companies hiring for one seat. Script: "I think I'll realistically need a couple of months to prepare." (reputable)

## What raises pass rates: reps

interviewing.io's data (≥150 respondents per company, about 2020–2022; reputable):
- For Google phone screens, the number of mock interviews was the clearest predictor: predicted pass rate **69% after 2 mocks, 76% after 3**.
- Prior **real** interviews mattered too: Amazon phone-screen pass rate 65% with 1–4 prior real interviews vs **81% with 5+**; Facebook 40% vs **71%**.
- Their readiness rule: "experience five or more real technical interviews", though direct interviewer feedback matters more than any count.

Combined with the variance data (only about 20% of people perform consistently), this is the data-backed case for **starting mocks early** and **interviewing at lower-priority companies first**.

## The order of work

Tech Interview Handbook's recommended order (reputable): pick one language → plan topics by importance → study a concept, then immediately practise it → cheat sheets → prepare a self-introduction and closing questions → mock interviews → (if time) learn question patterns.

A combined plan for a working engineer:

**Mid level, 8–10 weeks**
- Weeks 1–6: coding patterns, one new pattern a few times a week, every session starting with re-solving old problems from a blank page. Mixed, timed sets from week 2.
- Week 3: start the story bank (six to eight stories).
- Weeks 4–10: one or two design sessions a week (object-oriented design and basic system design, depending on the company).
- Week 5 on: one mock a week; two a week in the last two weeks.
- Last 2 weeks: company-specific prep (their round types, values, recent question styles).

**Senior level, 10–12 weeks**
- From week 1: design at about 35–40% of time (one full design question out loud per session, then compare with a model answer).
- Weeks 1–2: behavioural "scope" stories, because they set the level.
- Coding: keep the habit (four or five sessions a week), mixed and timed, aiming at clean code and clear trade-offs rather than volume.
- Week 3 on: mocks weekly (alternate coding and design); twice weekly from week 8.

**ML engineer**: add ML breadth (losses, metrics, training, transformers), ML system design and ML coding (implementing attention or k-means from scratch); see the AI area.

These splits are inferences from the sources, not measured data.

## Plan it

Set your level, weeks available and hours per week, and the planner lays out a week-by-week mix with mock-interview dates and a buffer week.

[[widget:prep-planner]]

## How much coding volume

Tech Interview Handbook's pace (about 160 questions in 3–4 weeks at 3 hours a day) suggests **100–200 well-reviewed problems** is a realistic target; beyond that, returns diminish (a third-party claim; unverified). Quality markers matter more than count: can you solve it cold a week later, explain why it works, and handle a twist?

## Schedule the interviews to fit the plan

- Put **lower-priority companies first** as warm-ups (see [Running many processes at once](/learn/parallel-processes)).
- Leave a few days between onsites.
- Keep the last 2–3 days before an important onsite light: review, one mock, sleep (see [Nerves and energy](/learn/nerves-energy)).

## Using this portal

- DSA area: patterns with Revise sheets and spaced review.
- HLD and LLD areas: design pages and design questions with mock interviews.
- AI area: ML breadth, ML design and ML coding questions.
- Mock interview room: coding, design, ML and behavioural rounds, with a "pick a company" behavioural round.

--- revise
### Time
? Tech Interview Handbook's hour estimates? :: About 30 hours for the bare minimum, about 100 hours to be well prepared.
? Holistic plan length (TIH)? :: About 3 months at 2–3 hours a day.
? Suggested calendar time for mid vs senior? :: About 8–10 weeks vs 10–12 weeks (plus buffer).
? Is postponing an interview risky at big companies? :: Almost always fine; risk mainly at tiny companies.

### Reps
? Google phone-screen predicted pass rate after 2 and 3 mocks? :: About 69% and 76%.
? Facebook phone-screen pass rate with 1–4 vs 5+ prior real interviews? :: About 40% vs 71%.
? interviewing.io readiness rule? :: Experience five or more real technical interviews; feedback matters most.

### Order
? Senior plan: what starts in week 1? :: Design (~35–40% of time) and behavioural scope stories.
? Mid plan: when do mocks start? :: Around week 5, weekly, then twice weekly in the last two weeks.
? Realistic coding volume? :: About 100–200 well-reviewed problems.

--- notes
## How long (TIH)
30 h bare minimum · ~100 h well prepared · ~3 months at 2–3 h/day · ~160 questions in 3–4 weeks at 3 h/day.
Mid 8–10 weeks (coding ~60–70%); senior 10–12 weeks (design ~35–40%); ML +2–4 weeks. Buffer 1.5–2× (or triple your estimate).
## Postpone
Almost always OK at large companies (interviewing.io). "I'll realistically need a couple of months."
## Reps (interviewing.io)
Google screen: 2 mocks → 69%, 3 → 76%. Amazon: 1–4 real 65% vs 5+ 81%. Facebook 40% vs 71%.
Start mocks early; warm up on lower-priority companies.
## Order (TIH)
Language → topics by importance → concept + practice → cheat sheets → intro + closing questions → mocks → patterns.
## Mid plan
Wk 1–6 patterns (re-solve old first; mixed from wk 2) · story bank wk 3 · design 1–2×/wk from wk 4 · mocks weekly from wk 5, 2×/wk last 2 · company-specific last 2.
## Senior plan
Design from wk 1 · scope stories wk 1–2 · coding 4–5×/wk mixed · mocks weekly from wk 3, 2×/wk from wk 8.
## Volume
100–200 well-reviewed problems; solve cold a week later.

--- doubts
Q: I have only three weeks. What do I cut?
A: Keep mixed, timed coding practice on the most common patterns, two or three mocks, a minimal story bank (five stories) and, for senior roles, a few design questions out loud. Cut breadth (rare topics). Or ask to postpone: at big companies it's usually fine.

Q: Should I stop working on DSA once I start design?
A: No. Keep a lighter coding habit throughout (re-solving old problems and mixed sets), because coding skill fades quickly without retrieval. Shift the balance, don't switch off.

Q: How do I know I'm ready?
A: When your mock scores are consistently at the bar for your level across several interviewers, and you can solve medium problems cold within the time. interviewing.io's rule of thumb is five or more real interviews' experience, with feedback mattering more than counts.

--- exercises
[plan] You're a senior engineer with 10 hours a week and 10 weeks until a Google onsite. Draft the weekly split.
A: Example: coding 4 h (four 1-hour mixed sessions, each starting with re-solving), design 4 h (two full questions out loud with comparison), behavioural 1 h (story bank and practice aloud), mocks 1 h weekly from week 3 (alternating coding and design), two mocks a week in weeks 9–10 (borrowing coding time). Week 10 is lighter; keep a buffer by moving any slipped topics there.

[estimate] TIH says ~100 hours to be well prepared. At 12 hours a week, how many weeks? With a 1.5× buffer?
A: 100 / 12 ≈ 8.3 weeks; with the buffer ≈ 12.5 weeks. Plan for about 12–13 weeks, or raise weekly hours.

[choose] Your dream company offers an onsite in 2 weeks; you need 6. Accept the date, or postpone?
A: Postpone: at large companies it's almost always fine. Say "I'll realistically need about six weeks to prepare; could we schedule the onsite for [date]?" Meanwhile book lower-priority interviews as warm-ups.

--- pitfalls
- Starting mocks only in the last week
- Doing coding only, even for senior roles
- Planning without a buffer
- Taking your top company's interview first
- Chasing problem counts instead of cold-solve quality

--- quiz
Q: According to Tech Interview Handbook, about how many hours of practice does it take to be "well prepared"?
- 10
- *About 100
- About 1,000
- 30 is always enough
W: About 30 hours is the bare minimum.

Q: What did interviewing.io find predicted passing Google phone screens most clearly?
- Years of experience
- *The number of mock interviews done
- The candidate's college
- Number of LeetCode problems solved
W: Predicted pass rate rose from 69% after 2 mocks to 76% after 3.

Q: For a senior candidate, design and behavioural prep should start…
- In the final week
- *From week one
- Only after 300 coding problems
- Never; coding is enough
W: These rounds decide senior level.

--- sources
- article :: Coding interview preparation study plan :: Tech Interview Handbook :: https://www.techinterviewhandbook.org/coding-interview-prep/
- article :: How do I know if I'm ready to interview at FAANG? :: interviewing.io :: https://interviewing.io/blog/how-know-ready-interview-faang
- article :: It's OK to postpone your interviews if you're not ready :: interviewing.io :: https://interviewing.io/blog/its-ok-to-postpone-your-interviews-if-youre-not-ready

=== parallel-processes
blurb: Running several interview processes at once: tiering companies, warming up on lower-priority ones, batching screens, stacking onsites so offers land together, asking for extensions, telling others you have a deadline, cool-downs before reapplying, and how India's notice periods shape all of it.
signals: You're applying to more than two companies | An offer arrived while others are mid-loop | A recruiter wants an answer in 48 hours | You have a 90-day notice period
widgets: parallel-timeline
prereq: prep-timeline

--- lesson
:::words
- **Tier**: your own ranking of target companies (tier 1 = dream; tier 3 = good, lower priority).
- **Warm-up company**: a lower-priority company you interview with early, partly for practice.
- **Exploding offer**: an offer with a very short deadline (under about a week).
- **Extension**: asking for more time to decide on an offer.
- **Cool-down**: how long a company makes you wait before reapplying after a rejection.
- **Notice buyout**: paying (or having the new employer pay) your current employer to shorten your notice period.
:::

## The problem in plain words

Interviewing at one company at a time is slow and fragile: one bad round or one frozen headcount resets months of work. Running several processes at once gives you practice, multiple chances, and offers that land close enough together to compare and negotiate. It takes planning, because different companies move at very different speeds.

:::eli5
Planning a dinner with several dishes: the rice takes 20 minutes, the dal 40, the rotis 5. You start the dal first and the rotis last so everything is hot at the same time. Start slow companies first and fast ones later, so offers arrive together.
:::

## Why parallel

- **Variance**: single rounds are noisy, so several companies turn a coin flip into a high chance of at least one offer (see [Interviewer variance](/learn/interviewer-variance)).
- **Reps**: pass rates rise with real interviews done: Facebook phone screens 40% with 1–4 prior real interviews vs 71% with 5+ (interviewing.io, reputable).
- **Leverage**: offers that arrive together can be compared and negotiated (see [Negotiating](/learn/negotiation)).
- **It's normal**: Ashby's data show each hire now takes about twice as many interviewed candidates as in 2021 (reputable).

## The plan

1. **List 8–12 companies in tiers** (inference from the research; adjust to your energy).
2. **Apply to all within about a week**, referrals first.
3. **Order by speed and priority**: slow processes (Google with committees, banks, GCCs with long approvals) start first; take lower-priority screens first as warm-ups (Rutgers career services; consistent forum advice).
4. **Batch phone screens** into a 2–3 week window.
5. **Stack onsites** so final rounds fall in the same 2–3 weeks, ideally with a few days between them (some advise never two onsites in one week; anecdotal).
6. **Ask fast companies to slow down and slow ones to speed up**, using a timeline that reveals nothing specific: "I expect to get through all my interviews and onsites in the next six weeks." (interviewing.io)

Try the timeline yourself: set when each process starts and how long its stages take, and see when offers land.

[[widget:parallel-timeline]]

## When an offer arrives early

- **Ask once, promptly, for a specific new date**, and keep to it. Ask only for as much time as your remaining final rounds need. Polite, specific extension requests rarely get offers pulled (anecdotal, career glossaries). An offer expiring in under a week is "exploding"; two weeks or more is standard (Wellfound, reputable).
- **Tell the other companies** you have a live deadline and ask whether they can speed up: "I've just received an offer from [company] which is quite strong" (Haseeb Qureshi, reputable). Time is "the most valuable thing to ask for early on."
- **Never invent an offer.**
- Some firms publish exploding-offer policies (Jane Street has a page about it; official).

Suggested extension wording (not from a source):

> Thank you, I'm genuinely excited about this offer. I'm completing two final rounds that finish on the 18th. Could I have until the 21st to give you a final answer?

## When you're rejected

Most big companies let you reapply after a cool-down, but **no official cool-down pages were found** for Google, Amazon, Meta or Microsoft. Forum reports (anecdotal): Google 6–12 months after an onsite; Amazon 6–12 months (some reports up to 24); Meta about 6 months; Microsoft often reported as no cool-down across different teams. Rule of thumb: none after a resume rejection, 3–6 months after a phone screen, 6–12 months after an onsite. **Ask your recruiter** for the actual rule and date.

Don't apply to many roles at once at the same company; recruiters see all your applications (Tech Interview Handbook).

## India: notice periods shape everything

- Notice periods: about **1 in 3 Indian IT roles has a 90-day notice period**; 54% of organised-sector jobs have one month or less (Analytics India Magazine 2022, reputable; methodology not disclosed). Startups are often about 15–30 days; large companies and IT services 60–90.
- Recruiters increasingly prefer 30–45-day joiners and use notice length as an early filter (anecdotal).
- Many product companies and GCCs reimburse a **notice buyout**, often capped and paid as a joining bonus; services firms are less likely to (anecdotal). Get it **in writing** before resigning.
- Because notice runs *after* you resign, the usual sequence is: interview → written offer → (background check started) → resign → serve or buy out notice → join. Many candidates keep interviewing during notice, which is why companies fear drop-outs.
- State your notice period and earliest joining date up front; it's a knockout field.

## Staying organised

Keep a simple tracker: company, tier, stage, next date, recruiter contact, level discussed, deadlines, notes after each round. It prevents double-booking and helps you tell each recruiter a consistent story.

## Managing energy

Parallel processes are tiring. Protect sleep, avoid more than one onsite in two or three days, keep practising between interviews, and stop adding companies once you have enough in flight to land offers together.

--- revise
### Why and how
? Four reasons to run processes in parallel? :: Variance, reps, leverage and that it's now normal.
? Which companies go first? :: Slow processes and lower-priority warm-ups.
? Screens and onsites: how do you batch them? :: Screens in a 2–3 week window; onsites stacked in the same 2–3 weeks.
? Timeline phrase that reveals nothing? :: "I expect to get through all my interviews and onsites in the next six weeks."

### Offers and deadlines
? What counts as an exploding offer? :: One that expires in under about a week; two weeks or more is standard.
? How do you ask for an extension? :: Once, promptly, for a specific date that your remaining rounds need.
? What do you tell other companies when an offer arrives? :: That you have a strong offer with a deadline, and ask if they can speed up.

### Cool-downs and India
? Are cool-down periods officially published by big tech? :: No; forum reports say about 6–12 months after an onsite; ask the recruiter.
? Share of Indian IT roles with 90-day notice (AIM 2022)? :: About 1 in 3.
? Usual India sequence after an offer? :: Written offer → BGV started → resign → serve or buy out notice → join.
? What must be in writing before resigning? :: The offer, and any notice-buyout commitment.

--- notes
## Why
Variance (1 − (1 − p)ⁿ) · reps (Facebook screens 40% → 71% with 5+ real) · leverage · normal (Ashby: ~2× interviews per hire).
## Plan
8–12 companies in tiers → apply within a week (referrals first) → slow + low-priority first → screens in 2–3 weeks → onsites stacked, days apart → timeline phrase to speed/slow.
## Early offer
One specific extension request; tell others "strong offer, deadline"; never invent offers. <1 week = exploding; ≥2 weeks standard.
## Rejection
No official cool-downs found. Reports: Google 6–12 mo after onsite; Amazon 6–12 (up to 24); Meta ~6; Microsoft often none across teams. Ask recruiter. Don't spray one company.
## India notice
~1/3 IT roles 90 days (AIM 2022); startups 15–30. 30–45-day joiners preferred. Buyout often reimbursed as joining bonus (in writing).
Sequence: offer → BGV → resign → notice/buyout → join. State notice up front.
## Organise
Tracker: company, tier, stage, dates, recruiter, level, deadlines, notes.
Max one onsite per 2–3 days; stop adding companies once enough are in flight.
Tell each recruiter a consistent timeline; never invent offers.
Warm-ups count: you may end up preferring a 'practice' company after meeting the team.
Extension wording: excited + remaining rounds end on date X + "could I have until date Y?".

--- doubts
Q: Is it unethical to interview with companies I'm less interested in?
A: No, as long as you're genuinely open to joining them if the offer and team are right. Many people end up preferring a "warm-up" company after meeting the team. Don't accept offers you intend to break.

Q: What if a company pulls an offer because I asked for an extension?
A: It's rare when the request is polite, specific and reasonable. A company that pulls an offer for that is showing you how it treats people. Still, decide in advance what you'd do if the answer is no.

Q: Can I keep interviewing during my notice period?
A: Legally that's between you and your contract, and many people do. But accepting an offer and then dropping it for another damages trust, and Indian companies increasingly track drop-outs. Be honest with recruiters about your situation.

--- exercises
[plan] Order these processes so offers land within two weeks of each other: Google (about 8 weeks to offer), Flipkart (about 4 weeks), a startup (about 2 weeks), Microsoft (about 5 weeks). Which do you start when?
A: Start Google in week 0, Microsoft in week 3, Flipkart in week 4, and the startup in week 6. Expected offers: Google week 8, Microsoft week 8, Flipkart week 8, startup week 8. In practice, start the startup a little earlier as a warm-up, and ask it to slow down if it moves faster.

[say] Write the email to Google's recruiter after receiving a Flipkart offer expiring in 7 days, while your Google committee review is pending.
A: Suggested wording (not from a source): "Hi Meera, thanks again for all your help. I wanted to let you know I've received an offer from another company with a deadline next Friday. Google remains my top choice; is there any way the committee review and team match could be completed before then? Happy to make myself available for any calls."

[choose] You have a 90-day notice period and an offer requiring joining in 45 days. What are your options?
A: Ask your employer for early release or a buyout; ask the new company to reimburse the buyout (often as a joining bonus) or extend the joining date; get the agreement in writing before resigning. Check that background verification has started and the offer is written before you resign.

--- pitfalls
- Interviewing with your dream company first
- Letting fast processes finish before slow ones start
- Asking for vague or repeated extensions
- Inventing competing offers
- Resigning before a written offer and buyout agreement
- Too many onsites in too few days

--- quiz
Q: Which company should usually start first in a parallel search?
- The fastest-moving startup
- *The slowest process (for example one with a hiring committee) and lower-priority warm-ups
- Your dream company, alone
- It doesn't matter
W: Slow processes need a head start for offers to land together.

Q: An offer arrives with a 48-hour deadline while you have two onsites next week. Best move?
- Accept immediately
- Ignore the deadline
- *Ask once for a specific short extension and tell the other companies you have a deadline
- Invent a higher offer
W: Specific, polite extension requests are usually accepted.

Q: About what share of Indian IT roles have a 90-day notice period (AIM 2022)?
- 5%
- *About one in three
- About 90%
- None
W: It's a major factor in Indian job-switch timing.

--- sources
- article :: How to deal with exploding offers :: Wellfound :: https://wellfound.com/blog/how-to-deal-with-exploding-offers
- article :: Ten rules for negotiating a job offer :: Haseeb Qureshi :: https://haseebq.com/my-ten-rules-for-negotiating-a-job-offer/
- article :: Report: notice periods in India IT (2022) :: Analytics India Magazine :: https://analyticsindiamag.com/ai-features/report-notice-periods-in-india-it
- article :: How do I know if I'm ready to interview at FAANG? :: interviewing.io :: https://interviewing.io/blog/how-know-ready-interview-faang
- article :: Interviewing :: Rutgers USACS career resources :: https://usacs.cs.rutgers.edu/resources/career/interviewing
