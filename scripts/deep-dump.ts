/** Prints lessons (and doubt questions) of some pages: node scripts/ts.mjs scripts/deep-dump.ts dsa/dp id1,id2 */
import { DEEP_FILES } from "../content/deep/files";
const [file, ids] = process.argv.slice(-2);
DEEP_FILES[file]().then((all) => {
  for (const id of ids.split(",")) {
    const d = all[id];
    console.log(`\n=== ${id}\n${d.lesson.trim()}\nDOUBTS: ${d.doubts.map(([q]) => q).join(" | ")}\nREVISE: ${d.revise.split("\n").filter((l) => l.startsWith("?")).length} items; widgets ${JSON.stringify(d.widgets ?? [])}`);
  }
});
