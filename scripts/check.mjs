// What a change must get right before it can merge.
//
// 1. plugin.json is readable, and package.json and the code say the same version.
// 2. Each published id appears once (an index with an id twice is refused whole).
// 3. The Release plugin workflow offers exactly the plugins there are.
//
// It also lists the plugins with changes nobody has released yet. That is
// fine: a plugin is released when someone runs Release plugin, which moves its
// version first. A published version itself never changes, because a package
// is never rebuilt, and a release refuses a version that already has one.
//
// The list reads git history, so CI checks out with full depth.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { versionOrder } from "@flexdeck/plugin-sdk/repo";

import { ROOT, publishedVersions, sources, versionSites } from "./lib.mjs";
import { parsePackageName } from "./notes.mjs";

/** Changes that do not reach the package, so they are not a reason to release. */
const UNPACKED = [":(exclude)*/test/**", ":(exclude)*/tsconfig.json", ":(exclude)*/scripts/**"];

const problems = [];
const unreleased = [];
const git = (...args) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();

const seen = new Map();
for (const { dir, rel, manifest, packageJson } of sources()) {
  if (!manifest.id || !manifest.version) {
    problems.push(`${rel}/plugin.json needs an id and a version`);
    continue;
  }
  for (const site of versionSites({ manifest, packageJson }).slice(1)) {
    const path = join(dir, site.file);
    const found = existsSync(path) ? site.pattern.exec(readFileSync(path, "utf8"))?.[2] : undefined;
    if (found !== undefined && found !== manifest.version) {
      problems.push(`${rel}: plugin.json says ${manifest.version}, ${site.file} says ${found} (pnpm bump ${manifest.id} <version> sets them all)`);
    }
  }
  if (seen.has(manifest.id)) problems.push(`'${manifest.id}' is both ${seen.get(manifest.id)} and ${rel}`);
  seen.set(manifest.id, rel);

  const newest = publishedVersions(manifest.id, parsePackageName, versionOrder).at(-1);
  if (!newest) {
    unreleased.push(`${manifest.id}: never released`);
    continue;
  }
  let added = "";
  try {
    added = git("log", "--diff-filter=A", "--format=%H", "-1", "--", newest.path);
  } catch {
    // Not a git checkout.
  }
  if (!added) continue; // Built here but not committed yet.
  const changed = git("diff", "--name-only", added, "--", rel, ...UNPACKED.map((spec) => spec.replace("*", rel)));
  if (changed) unreleased.push(`${manifest.id}: ${changed.split("\n").length} file(s) changed since ${newest.version}`);
}

// The workflow's plugin picker is a fixed list; keep it the same as the folders.
const workflow = join(ROOT, ".github", "workflows", "release.yml");
if (existsSync(workflow)) {
  const text = readFileSync(workflow, "utf8");
  const block = /plugin:[\s\S]*?options:\n((?:\s+- .+\n)+)/.exec(text);
  const offered = block ? [...block[1].matchAll(/- (\S+)/g)].map((match) => match[1]).sort() : [];
  const ids = [...seen.keys()].sort();
  if (offered.join(",") !== ids.join(",")) {
    problems.push(`release.yml offers [${offered.join(", ")}] but the plugins are [${ids.join(", ")}]; update its 'plugin' options`);
  }
}

if (unreleased.length) {
  console.log("Not released yet (run Release plugin when ready):");
  for (const line of unreleased) console.log(`  ${line}`);
}
if (problems.length) {
  for (const problem of problems) console.error(`✗ ${problem}`);
  process.exit(1);
}
console.log(`✓ ${seen.size} plugins check out`);
