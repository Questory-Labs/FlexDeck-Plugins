// Build every plugin version that is not released yet into dist/.
//
//   node scripts/build.mjs                    build what is not released
//   node scripts/build.mjs --only obs         only one plugin (what a release does)
//   node scripts/build.mjs --runtime native   only native plugins (they build on Windows)
//
// A released version is never rebuilt: its bytes are what the index pins, and a
// native build is not byte-for-byte repeatable. The index is written by
// scripts/index.mjs, from the releases.
import { execSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { relative } from "node:path";

import { pack } from "@flexdeck/plugin-sdk/pack";

import { DIST, ROOT, packageFile, releaseTag, releases, sources } from "./lib.mjs";

const args = process.argv.slice(2);
const option = (name) => {
  const at = args.indexOf(name);
  return at === -1 ? undefined : args[at + 1];
};
const runtimes = option("--runtime")?.split(",");
const only = option("--only");

if (only && !sources().some((source) => source.manifest.id === only)) {
  console.error(`there is no plugin '${only}' under plugins/ or recipes/`);
  process.exit(1);
}
mkdirSync(DIST, { recursive: true });

const released = new Set(releases().map((release) => release.tag));
const built = [];
for (const source of sources()) {
  const { manifest, dir, rel } = source;
  if (runtimes && !runtimes.includes(manifest.runtime)) continue;
  if (only && manifest.id !== only) continue;
  if (released.has(releaseTag(manifest))) continue;
  const out = packageFile(manifest);
  if (existsSync(out)) continue;
  console.log(`\n== ${manifest.id} ${manifest.version} (${rel})`);
  // A native plugin compiles its binary first; a node plugin is bundled by pack.
  if (manifest.runtime === "native") execSync("pnpm run build", { cwd: dir, stdio: "inherit" });
  const result = await pack(dir, { out });
  console.log(`packed ${relative(ROOT, result.file)}  ${result.size} bytes  sha256 ${result.sha256}`);
  built.push(`${manifest.id} ${manifest.version}`);
}
console.log(built.length ? `\nbuilt ${built.join(", ")}` : "\nevery version is already released or built");
