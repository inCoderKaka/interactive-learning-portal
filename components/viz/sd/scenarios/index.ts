import type { Scenario } from "../Seq";
import { NET } from "./net";

/** Sequence scenarios by widget id. Each file holds one chapter's scenarios. */
export const SCENARIOS: Record<string, Scenario> = {
  ...NET,
};
