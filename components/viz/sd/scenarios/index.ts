import type { Scenario } from "../Seq";
import { NET } from "./net";
import { TRAFFIC } from "./traffic";
import { CACHING } from "./caching";
import { REPLICATION } from "./replication";
import { PARTITIONING } from "./partitioning";
import { TRANSACTIONS } from "./transactions";
import { MESSAGING } from "./messaging";
import { PROTECTION } from "./protection";
import { OPS } from "./ops";
import { SECURITY } from "./security";

/** Sequence scenarios by widget id. Each file holds one chapter's scenarios. */
export const SCENARIOS: Record<string, Scenario> = {
  ...NET,
  ...TRAFFIC,
  ...CACHING,
  ...REPLICATION,
  ...PARTITIONING,
  ...TRANSACTIONS,
  ...MESSAGING,
  ...PROTECTION,
  ...OPS,
  ...SECURITY,
};
