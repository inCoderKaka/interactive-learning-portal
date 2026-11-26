# Deep Learn / Revise pages, visuals, every channel video, topic tree

Requirement: `inputs/req3.txt` (the user's words) and `inputs/req3.formal.txt`. Research done 2026-11-26.

## 1. Decisions the user made (2026-11-26)

| # | Question | Answer |
|---|---|---|
| 1 | Order of work | Area by area, no pilot: DSA → HLD → LLD → AI → Craft |
| 2 | LeetCode problems with a channel video that the portal lacks (about 1,500) | Each gets its own problem page: video-backed, with no hand-written approaches |
| 3 | When a problem page shows its videos | Behind the existing "I have tried: show approaches" gate, in non-blind mode only |
| 4 | Extra channels counted as "yours" | NeetCodeIO, Techdose Engineering, Hindi channels among my picks, and the existing one-off videos kept |
| 5 | Where the topic tree appears | A 4th view on /learn (next to Map, List only, Flashcards) **and** a collapsible left sidebar on lesson and problem pages |
| 6 | Learn vs Revise | A Learn / Revise switch on every subtopic page, plus a Revise mode in the tree that runs through sheets back to back |
| 7 | New problem pages and the plan | Extra practice: shown in the tree, on topic pages and in search, marked "extra"; outside the plan, roadmap and totals until started |
| 8 | Shipping | One feature branch and PR; deploy to production after each area passes checks |
| 9 | Interview Craft | Same treatment, done last |

## 2. What exists today

- 89 topics (DSA 32, HLD 17, LLD 6, Craft 4, AI 30). Lessons run 2–3.5k characters (AI 4–8k). Example: "MST, bridges, SCC & Eulerian paths" is a single 3.1k-character page with no visual.
- 178 problems, each with one walkthrough video behind the approaches gate. Topic pages embed a gallery of 1–6 videos. 423 video ids in total.
- 31 widgets: step players in `components/viz/algos.ts`, plus HLD and AI widgets.

## 3. Reference sites (inspected in a browser)

| Site | What is worth taking | What it lacks |
|---|---|---|
| Algo Lab (byte-sized-algorithms) | A left **course tree** of collapsible folders with done/total counts. A lesson is a **numbered step strip** under an isometric animated stage. A right panel holds a narrative step, a "notice" callout, pseudocode and a "steps taken" counter | Each lesson has ~7 steps; Graphs has 13 lessons in all; no doubts, proofs or variants |
| Designed to Scale | The same tree, plus a **live metrics strip** (DNS / connect / download / total ms) that fills as you step, a "What changed" diff list per step, and a "You'll learn" checklist that ticks itself | Beginner depth |
| Protocol Explorer | A network stage with a **packet-flow table** (time, source, destination, protocol, info), synchronised with the animation, and a protocol fact sheet | Protocols only |
| SimuVeda | "**Break it and watch**": push traffic, crash a server, flush a cache, with real numbers | 5–9 minute topics |
| Engineering Atlas | Granularity: HLD as 9 parts · 86 chapters · 314 topics; breakdowns with 20–40 diagrams | Paywalled; static diagrams |

Patterns adopted: the course tree; step strip plus narration; "what changed" per step; a live metrics strip for HLD flows; a packet or event log under protocol animations; break-it controls on HLD simulations; a "you'll learn" checklist that doubles as the revision outline.

## 4. Learning-science research and how it shapes the design

| Finding | Source | Design consequence |
|---|---|---|
| Practice testing and distributed practice are the two highest-utility techniques; rereading and highlighting are low utility | Dunlosky et al. 2013, *Psychological Science in the Public Interest* 14(1) ([doi](https://doi.org/10.1177/1529100612453266); [AFT summary](https://www.aft.org/ae/fall2013/dunlosky)) | **Revise is active, not a reread.** Each must-remember fact is a cloze or Q/A that stays hidden until you try it. Rating a sheet feeds the existing spaced-repetition scheduler (`lib/srs.ts`). |
| Learner engagement predicts algorithm-visualisation effectiveness more than what the visual shows; passive viewing is the weakest form | Hundhausen, Douglas & Stasko 2002, *JVLC* 13(3) ([doi](https://doi.org/10.1006/jvlc.2002.0237)); Naps et al. 2002 engagement taxonomy (ITiCSE WG) | Visuals are steppable and editable, never autoplay-only. They include **predict-the-next-step** prompts (the "responding" level) and editable inputs (the "changing" level). |
| Animation beats static pictures by a medium effect when it is representational, not decorative | Höffler & Leutner 2007, *Learning and Instruction* ([doi](https://doi.org/10.1016/j.learninstruc.2007.09.013)) | Animate only what changes state (low-link values, a DP table filling, a quorum vote). No decorative motion. |
| Expertise reversal: guidance that helps novices hurts experts | Kalyuga 2007 (animated vs static diagrams by prior knowledge); [overview](https://en.wikipedia.org/wiki/Expertise_reversal_effect) | Visuals can be hidden per element or globally, which is the user's own request. Static summaries in Revise; full animations in Learn. Trivial topics (binary search, two pointers) get no new animation. |
| Worked examples help novices; self-explanation and elaborative interrogation add value | Dunlosky 2013; [worked-example effect](https://en.wikipedia.org/wiki/Worked-example_effect) | Learn pages carry dry runs and a **"Common doubts"** section of why-questions with answers. |
| Interleaving helps discrimination between similar methods | Dunlosky 2013 (interleaved practice, moderate utility) | A Revise run across a whole chapter mixes sheets; "which algorithm?" drills compare neighbours (Kosaraju vs Tarjan, Prim vs Kruskal). |

Learn page anatomy (per subtopic):

1. Hook and "Reach for this when".
2. Intuition first, with a visual where it earns its place.
3. Formal definitions.
4. The algorithm or mechanism, step by step, with a dry run.
5. Correctness or why it works (proof sketch, invariants).
6. Complexity, with derivation.
7. Implementation and template, plus implementation traps.
8. Variants and disguises.
9. **Common doubts** (Q&A).
10. Interview angles and follow-ups.
11. Connections to other topics.
12. Primary sources (papers, textbook chapters, official docs).
13. Videos.
14. Quiz.
15. Practice problems.

Revise sheet anatomy: one screen of must-remember facts as hidden-answer prompts; the key formula or template; complexity table; pitfalls; a "you can now" checklist; then rate it (Again / Hard / Good / Easy) to schedule the next revision.

## 5. Videos

### 5.1 Channels (catalogs fetched with yt-dlp on 2026-11-26)

User's channels: NeetCode (376), NeetCodeIO (650), Aryan Mittal (953), codestorywithMIK (1,598), WilliamFiset (144), Abdul Bari (116), Techdose (847), Techdose Engineering (51), codeWithAryan = `@codeWithAryanBhai` (64, LLD/HLD), Concept && Coding by Shrayansh (346), Krish Naik (1,849).

Picked from research, judged on catalog content rather than list rankings (lists disagree, e.g. [LearnPath 2026](https://learnwithpath.com/blog/best-youtube-channels-for-system-design-2026), [Analytics Vidhya](https://www.analyticsvidhya.com/blog/2026/03/youtube-channels-to-learn-machine-learning/)):

- **HLD:** ByteByteGo (145), Hussein Nasser (878), Gaurav Sen (273), Hello Interview (67), Jordan has no life (325), Arpit Bhayani (252), Tech Dummies Narendra L (40), sudoCODE (94, Hindi/English), Martin Kleppmann's distributed-systems lectures (39), MIT 6.824 (20), CMU Database Group (599), Google Cloud Tech (official, 1,794: relevant videos only).
- **LLD:** Concept && Coding, codeWithAryan, Christopher Okhravi (210, design patterns), Udit Agarwal (58), Coder Army (427, Hindi), Engineering Digest (612, Hindi backend).
- **AI:** Krish Naik, Andrej Karpathy (17), 3Blue1Brown (155), StatQuest (265), CampusX (1,277, Hindi), Umar Jamil (25), Yannic Kilcher (467, papers), Welch Labs (81), Serrano.Academy (82), Stanford Online (3,046: AI lectures only), Google DeepMind (390), Google for Developers (4,658: relevant only), Anthropic (147).

"All related videos" is applied to every listed channel: a video is included when it teaches a concept of the page or solves a question of the page. Off-topic uploads (career, news, shorts) are excluded.

### 5.2 Matching pipeline (`scripts/videos/`)

1. Fetch every channel's uploads (`yt-dlp --flat-playlist`) into `scripts/videos/catalog/*.tsv`, committed so builds are reproducible.
2. Fetch the LeetCode problem list with topic tags from LeetCode's public GraphQL endpoint (4,124 problems), and keep only fields (number, slug, title, difficulty, premium, tags). No statements are copied.
3. Question videos: parse "Leetcode 1192", "LC 1192", "1192." or the exact problem title → LeetCode number → chapter and subtopic through a tag-priority map plus hand overrides.
4. Concept videos: keyword rules per subtopic, then a **manual pass over every remaining title of every channel** (the "check for missing videos" pass the user asked for). Unmatched titles are listed in a report, so nothing is silently dropped.
5. Every id is verified over oEmbed (`npm run audit -- --net`).
6. Output: `content/videos/*.json`, loaded per area on demand, keeping the main bundle small.

### 5.3 Showing hundreds of videos without clutter (the user's 2-click flow)

- Topic page: one collapsed card, "Videos · 46 (9 concept · 37 question)". **Click 1** expands it: chips by channel, kind and language, concept videos first, question videos grouped by problem. **Click 2** plays a thumbnail in place, using a youtube-nocookie facade so no YouTube script loads before the click ([Lighthouse third-party facades](https://developer.chrome.com/docs/lighthouse/performance/third-party-facades)).
- Problem page: every channel's video for that problem, inside the approaches gate.

## 6. Topic tree

- Follows the [WAI-ARIA tree view pattern](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/): arrow keys, Home/End, type-ahead, and `aria-expanded`.
- Hierarchy: area › chapter (today's topic) › subtopic page › problems (core, then extra).
- Shows done/total counts, a filter box and a Learn/Revise mode. Expansion state persists.
- Children render only when expanded, so ~1,700 problem leaves cost nothing until opened.
- Appears as the 4th /learn view and as a sidebar on topic and problem pages (collapsible; a drawer under the `lg` breakpoint).

## 7. Visual controls

- Every visual is wrapped in a frame with a **hide** button. Hidden ids are stored in settings, which sync to the account.
- Global setting: visuals shown / collapsed / off, plus a "reduce motion" option that defaults to the OS `prefers-reduced-motion`.
- Settings lists the hidden visuals so they can be restored.

## 8. Data model

- Existing topic ids stay as **chapters**, keeping their progress, cards, drills and URLs. A chapter page becomes an overview with links to its subtopics.
- New `Topic` fields: `chapter?` (parent id), `revise?` (sheet markdown), `doubts?` ([q, a][]), `sources?` (Ref[]). The `[[widget:id]]` inline visuals already used in AI lessons now work in every area.
- `Problem` gains `extra?: true` for the video-backed pages (id `p-<lc>`). Extra problems are left out of `ITEMS`, so the plan, roadmap and totals stay unchanged.

## 9. Order of work

1. Infrastructure: data model, tree, Learn/Revise switch and Revise run, video pipeline and library, visual frame and settings, extra problem pages.
2. DSA: split 32 chapters into ~150 subtopics, with deep lessons, revise sheets, doubts, sources and new visuals (MST, low-link, SCC, Hierholzer, flow, segment tree, Fenwick, KMP/Z, AVL rotations, LCA/binary lifting, interval DP, knapsack table, …). Then ship.
3. HLD, then LLD, then AI, then Craft. Each area ships on completion.
