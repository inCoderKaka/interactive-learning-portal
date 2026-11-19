import type { Topic } from "@/lib/types";
import { aiTopics1 } from "./part1";
import { aiTopics2 } from "./part2";
import { aiTopics3 } from "./part3";
import { aiTopics4 } from "./part4";
import { aiTopics5 } from "./part5";

/** The AI area, in reading order. Cards live in content/cards/ai.ts, references in ./refs.ts, designs in ./designs.ts. */
export const aiTopics: Topic[] = [...aiTopics1, ...aiTopics2, ...aiTopics3, ...aiTopics4, ...aiTopics5];
export { aiDesigns } from "./designs";
export { AI_REFS } from "./refs";
