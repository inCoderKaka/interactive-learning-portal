import type { Topic } from "@/lib/types";
import { aiTopics1 } from "./part1";
import { aiTopics2 } from "./part2";
import { aiTopics3 } from "./part3";
import { aiTopics4 } from "./part4";
import { aiTopics5 } from "./part5";
import { aiTopics6 } from "./part6";

/** Course order of the AI chapters (req3 AI deep pass). Every id must exist in part1–part6. */
const ORDER = [
  "ai-history", "ai-math", "ai-ml-basics", "ai-data", "ai-classic-models", "ai-metrics", "ai-neural-nets", "ai-pytorch",
  "ai-cnn", "ai-rnn", "ai-embeddings", "ai-recsys", "ai-tokenization", "ai-transformers", "ai-llm-training", "ai-alignment",
  "ai-reasoning", "ai-fine-tuning", "ai-decoding", "ai-inference", "ai-prompting", "ai-context-engineering", "ai-vector-search",
  "ai-rag", "ai-kg-rag-case", "ai-agents", "ai-mcp", "ai-multimodal", "ai-generative-images", "ai-evals", "ai-safety",
  "ai-production", "ai-system-design", "ai-at-google",
];
const BY_ID = new Map([...aiTopics1, ...aiTopics2, ...aiTopics3, ...aiTopics4, ...aiTopics5, ...Object.values(aiTopics6)].map((t) => [t.id, t]));
if (BY_ID.size !== ORDER.length) throw new Error(`AI chapter order lists ${ORDER.length} of ${BY_ID.size} chapters`);

/** The AI area, in reading order. Cards live in content/cards/ai.ts, references in ./refs.ts, designs in ./designs.ts. */
export const aiTopics: Topic[] = ORDER.map((id) => { const t = BY_ID.get(id); if (!t) throw new Error(`unknown AI chapter ${id}`); return t; });
export { aiDesigns } from "./designs";
export { AI_REFS } from "./refs";
