// The first step of releasing the icon packs (the Release icon packs workflow).
//
//   node scripts/prepare-icons.mjs [patch | minor | major | version]
//
// Works out the version from the one in icon-packs/ and the icon-packs/v* tags,
// refusing one that is already published or not newer than the newest. The
// tags are icon-packs/v<version>, not <id>-v<version>, so the plugin index never
// takes them for a plugin. On GitHub Actions it hands version, tag and
// prerelease to the next steps as outputs.
import { appendFileSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

import { versionOrder } from "@flexdeck/plugin-sdk/repo";

import { ROOT, isPrerelease, nextVersion } from "./lib.mjs";

function fail(message) {
  console.error(`::error::${message}`);
  process.exit(1);
}

const PREFIX = "icon-packs/v";
const spec = (process.argv[2] ?? "").trim();
const current = JSON.parse(readFileSync(join(ROOT, "icon-packs", "flexdeck-essentials", "manifest.json"), "utf8")).Version;

let version;
try {
  version = spec ? nextVersion(current, spec) : current;
} catch (error) {
  fail(error.message);
}
if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version)) fail(`'${version}' is not a version the icon packs take (like 2.1.0 or 2.1.0-rc.1)`);

const published = execFileSync("git", ["tag", "--list", `${PREFIX}*`], { cwd: ROOT, encoding: "utf8" })
  .split("\n")
  .map((tag) => tag.trim().slice(PREFIX.length))
  .filter(Boolean)
  .sort(versionOrder);
if (published.includes(version)) fail(`icon packs ${version} are already published. Pick a newer version (patch, minor, major or an exact one).`);
const newest = published.at(-1);
if (newest && versionOrder(version, newest) <= 0) fail(`icon packs ${version} are not newer than ${newest}, the newest published.`);
if (versionOrder(version, current) < 0) fail(`the icon packs are at ${current}; ${version} would go backwards.`);

const outputs = { version, tag: `${PREFIX}${version}`, prerelease: String(isPrerelease(version)) };
console.log(`releasing the icon packs ${version}${newest ? ` (after ${newest})` : " (their first release)"}`);
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(outputs).map(([key, value]) => `${key}=${value}\n`).join(""));
}
