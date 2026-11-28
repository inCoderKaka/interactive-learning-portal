/** Widget ids served by components/viz/Ai.tsx (kept separate so pages can check an id without loading the widgets). */
export const AI_WIDGET_IDS = new Set([
  "ai-timeline", "threshold", "gradient-descent", "convolution", "embedding-space", "bpe", "attention", "sampling", "lora", "context-budget",
  "chunking", "retrieval", "hnsw", "react-agent", "mcp-handshake", "clip", "diffusion", "vram", "rlhf", "prompt-surgery", "scaling",
]);
/** Widget ids served by components/viz/AiDeep.tsx (the req3 AI deep-pass visuals, Ai3.tsx onward). */
export const AI_DEEP_WIDGET_IDS = new Set([
  "matrix-transform", "likelihood", "ab-test-sim", "bias-variance", "loss-shapes", "regularisation-paths",
  "feature-hashing", "least-squares", "logistic-boundary", "tree-split", "boosting-residuals", "knn-boundary", "kmeans", "pca-projection",
  "calibration", "ndcg-ranking", "activations", "backprop-steps", "lr-schedules", "activation-stats", "resnet-block", "loss-doctor", "broadcasting", "roofline", "receptive-field", "iou-nms",
  "contrastive-batch", "matrix-factorisation", "recsys-funnel", "multitask-score", "explore-exploit", "token-cost", "causal-mask", "transformer-flow", "rope",
  "transformer-families", "gqa-heads", "moe-router", "data-pipeline", "parallelism", "training-memory", "chat-template", "dpo-margin", "self-consistency", "grpo-group",
  "adapt-decision", "distill-temp", "constrained-decoding", "speculative", "kv-cache", "continuous-batching", "quantization", "llm-capacity", "prompt-eval", "memory-store", "ivf-pq", "hybrid-search", "rerank", "agentic-rag", "rag-eval", "plan-execute", "orchestrator", "agent-permissions",
  "serving-modes", "drift-monitor", "eval-pipeline", "fairness-threshold", "gan-game", "spectrogram", "vlm-tokens", "judge-bias", "injection-lab", "guardrail-stack", "ml-design-flow", "genai-design-flow", "ml-coding-plan", "ml-pipeline", "rnn-unroll", "seq2seq-align",
]);
/** Widget ids served by components/viz/Craft.tsx (the req3 Interview Craft visuals). */
export const CRAFT_WIDGET_IDS = new Set(["level-map", "variance-sim", "prep-planner", "parallel-timeline", "offer-compare", "story-bank", "round-clock"]);
