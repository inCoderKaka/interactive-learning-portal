// Runs a TypeScript script with the project's "@/" alias: node scripts/ts.mjs scripts/audit-content.ts [args]
import { createJiti } from "jiti";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "..");
const jiti = createJiti(root + "/", { alias: { "@": root } });
await jiti.import(resolve(process.argv[2]));
