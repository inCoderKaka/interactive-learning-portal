/** Widget ids served by components/viz/Ai.tsx (kept separate so pages can check an id without loading the widgets). */
export const AI_WIDGET_IDS = new Set([
  "ai-timeline", "threshold", "gradient-descent", "convolution", "embedding-space", "bpe", "attention", "sampling", "lora", "context-budget",
  "chunking", "retrieval", "hnsw", "react-agent", "mcp-handshake", "clip", "diffusion", "vram", "rlhf", "prompt-surgery", "scaling",
]);
/** Widget ids served by components/viz/AiDeep.tsx (the req3 AI deep-pass visuals, Ai3.tsx onward). */
export const AI_DEEP_WIDGET_IDS = new Set([
  "matrix-transform", "likelihood", "ab-test-sim", "bias-variance", "loss-shapes", "regularisation-paths",
]);
