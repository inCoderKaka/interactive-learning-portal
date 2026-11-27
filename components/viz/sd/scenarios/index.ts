import type { Scenario } from "../Seq";
import { NET } from "./net";
import { TRAFFIC } from "./traffic";
import { CACHING } from "./caching";
import { REPLICATION } from "./replication";

/** Sequence scenarios by widget id. Each file holds one chapter's scenarios. */
export const SCENARIOS: Record<string, Scenario> = {
  ...NET,
  ...TRAFFIC,
  ...CACHING,
  ...REPLICATION,
};
