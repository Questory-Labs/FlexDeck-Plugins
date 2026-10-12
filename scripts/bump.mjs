// Give a plugin a new version everywhere it is written down.
//
//   pnpm bump <id> <patch | minor | major | version>    e.g. pnpm bump obs patch
//
// plugin.json, package.json, the version the code declares (`version: "…"` in
// src/index.ts for a node plugin, Cargo.toml for a native one), or just
// plugin.json for a recipe. The packer refuses a package where they disagree.
//
// You rarely need this by hand: the Release plugin workflow bumps for you.
import { versionOrder } from "@flexdeck/plugin-sdk/repo";

import { nextVersion, setVersion, sources } from "./lib.mjs";

const [id, spec] = process.argv.slice(2);
if (!id || !spec) {
  console.error("usage: pnpm bump <id> <patch | minor | major | version>");
  process.exit(1);
}
const source = sources().find((candidate) => candidate.manifest.id === id);
if (!source) {
  console.error(`there is no plugin '${id}' under plugins/ or recipes/`);
  process.exit(1);
}
try {
  const current = source.manifest.version;
  const version = nextVersion(current, spec);
  if (versionOrder(version, current) <= 0) throw new Error(`${id} is at ${current}; ${version} is not newer`);
  for (const file of setVersion(source, version)) console.log(`${file}: ${current} → ${version}`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
