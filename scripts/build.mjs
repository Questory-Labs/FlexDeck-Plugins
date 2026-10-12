// Build every plugin version that is not published yet, then rewrite the index.
//
//   node scripts/build.mjs                 build what is missing, then index
//   node scripts/build.mjs --only obs      only one plugin (what a release does)
//   node scripts/build.mjs --runtime native   only native plugins (they build on Windows)
//   node scripts/build.mjs --no-index      build only
//   node scripts/build.mjs --index-only    index what is in packages/
//
// A package that already exists is never rebuilt: a published version's bytes
// are what the index pins, and a native build is not byte-for-byte repeatable.
//
// A pre-release goes to packages/pre/, which the index does not read: the index
// lists each plugin's highest version in packages/, and that must be a release.
import { execSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";

import { pack } from "@flexdeck/plugin-sdk/pack";
import { buildRepository } from "@flexdeck/plugin-sdk/repo";

import { PACKAGES, REPO, ROOT, packageFile, sources } from "./lib.mjs";

const args = process.argv.slice(2);
const option = (name) => {
  const at = args.indexOf(name);
  return at === -1 ? undefined : args[at + 1];
};
const runtimes = option("--runtime")?.split(",");
const only = option("--only");
const indexOnly = args.includes("--index-only");
const noIndex = args.includes("--no-index");

if (only && !sources().some((source) => source.manifest.id === only)) {
  console.error(`there is no plugin '${only}' under plugins/ or recipes/`);
  process.exit(1);
}
mkdirSync(PACKAGES, { recursive: true });

const built = [];
if (!indexOnly) {
  for (const source of sources()) {
    const { manifest, dir, rel } = source;
    if (runtimes && !runtimes.includes(manifest.runtime)) continue;
    if (only && manifest.id !== only) continue;
    const out = packageFile(manifest);
    if (existsSync(out)) continue;
    mkdirSync(dirname(out), { recursive: true });
    console.log(`\n== ${manifest.id} ${manifest.version} (${rel})`);
    // A native plugin compiles its binary first; a node plugin is bundled by pack.
    if (manifest.runtime === "native") execSync("pnpm run build", { cwd: dir, stdio: "inherit" });
    const result = await pack(dir, { out });
    console.log(`packed ${relative(ROOT, result.file)}  ${result.size} bytes  sha256 ${result.sha256}`);
    built.push(`${manifest.id} ${manifest.version}`);
  }
  console.log(built.length ? `\nbuilt ${built.join(", ")}` : "\nevery version is already packaged");
}

if (!noIndex) {
  const icons = join(ROOT, "icons");
  const index = buildRepository(PACKAGES, {
    out: ROOT,
    ...REPO,
    icons: existsSync(icons) ? icons : undefined,
  });
  console.log(`\nrepository.min.json: ${index.plugins.length} plugins`);
  for (const plugin of index.plugins) console.log(`  ${plugin.id} ${plugin.version}`);
}
