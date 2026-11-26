/** One line per page: lesson widgets/links and existing doubt questions. node scripts/ts.mjs scripts/deep-brief.ts dsa/<file> */
import { DEEP_FILES } from "../content/deep/files";
const file = process.argv[process.argv.length - 1];
DEEP_FILES[file]().then((all) => {
  for (const [id, d] of Object.entries(all)) {
    const tags = [...d.lesson.matchAll(/\[\[(?:widget|yt):[^\]]+\]\]|\]\(\/learn\/[\w-]+\)/g)].map((m) => m[0]);
    console.log(`${id} [${d.lesson.length}] ${tags.join(" ")} | ${d.doubts.map(([q]) => q).join(" / ")}`);
  }
});
