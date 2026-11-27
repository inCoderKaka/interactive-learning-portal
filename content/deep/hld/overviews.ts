import { md } from "@/content/ai/md";

/**
 * Chapter overview pages for HLD, rewritten for first-time learners. They replace the old terse chapter lessons
 * (content/hld-concepts.ts) once a chapter's pages are written: a plain-words map of the chapter, not a summary in jargon.
 */
export const HLD_OVERVIEWS: Record<string, string> = {
  "hld-framework": md`
## What this chapter is about

In a system design interview you are asked to design something huge (YouTube, a chat app, a payment system) in about 45 minutes. Nobody expects a finished design. The interviewer is watching **how you think**: whether you narrow a vague question into a clear problem, build something that works, find its weak points yourself, and explain your choices.

This chapter is the playbook for those 45 minutes, in four pages:

1. **How the round runs and how it is scored.** The six phases and their timings, the five things interviewers write down, and what changes between a mid-level (L4), senior (L5) and staff (L6) answer.
2. **Requirements.** Turning "design Instagram" into 3–5 core features, explicit non-goals, and targets for scale, speed, availability and correctness, stated per feature.
3. **API and data model.** Writing the main operations and records first, because how data is looked up decides the database, the keys and how data is split across machines.
4. **Deep dives and failure.** Finding the genuinely hard parts yourself, going two levels below the boxes, and explaining what users see when each part fails or traffic spikes.

:::tip The one idea to keep
Every box you draw must solve a problem you named, and every choice is stated as "X instead of Y, because Z, at the cost of W".
:::

The chapters after this one teach the building blocks (networks, load balancers, caches, databases, queues) that you combine inside this framework.
`,
  estimation: md`
## What this chapter is about

Before choosing a design you need to know **how big the problem is**. Ten thousand users and one billion users need completely different systems. Estimation is the quick arithmetic that tells you which one you are building, and it rests on a few numbers about how fast computers, disks and networks are.

Four pages:

1. **Latency and throughput numbers.** How long memory, SSDs, disks and network trips take, shown on a ladder scaled to human time, and how much one machine can do per second. The gaps between them (1,000× and more) explain why caches, CDNs and precomputation exist.
2. **QPS, storage and bandwidth.** The recipe from daily users to requests per second, bytes per year and network traffic, with a full worked example and the habit of stopping once the numbers have made a decision for you.
3. **Capacity planning.** Turning those numbers into machines: which resource runs out first, how full machines should run, and the spare capacity needed to survive a failed machine or a whole data-centre zone.
4. **Queueing and tail latency.** Why a server gets slow long before it is "full", Little's law, and why the slowest 1% of requests dominates large systems. A live simulation lets you push a server toward 100% and watch.

:::tip The one idea to keep
Use round numbers, say every assumption out loud, and only compute numbers that change a decision.
:::
`,
};
