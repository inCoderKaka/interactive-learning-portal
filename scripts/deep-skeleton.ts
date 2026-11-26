/** Prints each subtopic's lesson headings and size: a quick map when writing cheat sheets. Usage: node scripts/ts.mjs scripts/deep-skeleton.ts dsa/dp */
import { DEEP_FILES } from "../content/deep/files";
const file = process.argv[3] ?? process.argv[2];
DEEP_FILES[file]().then((all) => {
  for (const [id, d] of Object.entries(all)) {
    const total = d.lesson.length + d.revise.length + d.doubts.reduce((n, [q, a]) => n + q.length + a.length, 0);
    console.log(`\n## ${id}  (lesson ${d.lesson.length}, total ${total}, notes ${d.notes?.length ?? 0})`);
    console.log("  " + d.lesson.split("\n").filter((l) => /^#{2,3} /.test(l)).map((l) => l.replace(/^#+ /, "")).join(" | "));
  }
});
