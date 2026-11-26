import type { Deep } from "./types";
import { advancedGraphs } from "./dsa/advanced-graphs";

/** Every written subtopic body, keyed by subtopic id. A subtopic without a body is not a page yet. */
export const DEEP: Record<string, Deep> = {
  ...advancedGraphs,
};
