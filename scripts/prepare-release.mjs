// The first step of releasing one plugin (the Release plugin workflow).
//
//   node scripts/prepare-release.mjs <id> [patch | minor | major | version]
//
// Works out the version to release and writes it into the plugin (as `pnpm bump`
// does). With no version, the plugin's own is released, which suits a version
// bumped in a pull request. Refuses a version that is already published or is
// not newer than the newest one that is. Prints what it decided and, on GitHub
// Actions, hands it to the next steps as outputs:
//
//   id, version, tag, runtime, package (the npm name, for `pnpm --filter`),
//   dir, prerelease, runner (where it builds: windows-latest for a native plugin)
import { appendFileSync } from "node:fs";

import { versionOrder } from "@flexdeck/plugin-sdk/repo";

import { isPrerelease, nextVersion, publishedVersions, setVersion, sources } from "./lib.mjs";
import { parsePackageName } from "./notes.mjs";

function fail(message) {
  console.error(`::error::${message}`);
  process.exit(1);
}

const [id, spec = ""] = process.argv.slice(2);
if (!id) fail("usage: prepare-release.mjs <id> [patch | minor | major | version]");
const source = sources().find((candidate) => candidate.manifest.id === id);
if (!source) fail(`there is no plugin '${id}' under plugins/ or recipes/`);

const current = source.manifest.version;
let version;
try {
  version = spec.trim() ? nextVersion(current, spec.trim()) : current;
} catch (error) {
  fail(error.message);
}

const published = publishedVersions(id, parsePackageName, versionOrder);
if (published.some((entry) => entry.version === version)) {
  fail(`${id} ${version} is already published. Pick a newer version (patch, minor, major or an exact one).`);
}
const newest = published.at(-1);
if (newest && versionOrder(version, newest.version) <= 0) {
  fail(`${id} ${version} is not newer than ${newest.version}, its newest published version.`);
}
if (version !== current) {
  if (versionOrder(version, current) < 0) fail(`${id} is at ${current} in the code; ${version} would go backwards.`);
  for (const file of setVersion(source, version)) console.log(`${file}: ${current} → ${version}`);
}

const runtime = source.manifest.runtime;
const outputs = {
  id,
  version,
  tag: `${id}-v${version}`,
  runtime,
  package: source.packageJson?.name ?? "",
  dir: source.rel,
  prerelease: String(isPrerelease(version)),
  runner: runtime === "native" ? "windows-latest" : "ubuntu-latest",
};
console.log(`releasing ${id} ${version}${newest ? ` (after ${newest.version})` : " (its first release)"}, built on ${outputs.runner}`);
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(outputs).map(([key, value]) => `${key}=${value}\n`).join(""));
}
