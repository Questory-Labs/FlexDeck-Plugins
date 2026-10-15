// A GitHub release for every package built in dist/ that does not have one yet.
//
//   node scripts/release.mjs                    create the missing releases (needs gh and GH_TOKEN)
//   node scripts/release.mjs --only obs         only that plugin's (what a release does)
//   node scripts/release.mjs --target <sha>     the commit the packages were built from (default: HEAD)
//   node scripts/release.mjs --dry-run          print what would be released, and the notes
//
// Each package `dist/<id>-<version>.fdpkg` becomes the tag `<id>-v<version>` on
// the commit it was built from, with the package attached: that attachment is
// where the index sends FlexDeck. The notes are the plugin's changes since its
// previous release: the typed lines (`feat(obs): …`) of the commits that touched
// its folder in between (see notes.mjs). A release counts from the previous
// release, skipping pre-releases, so 1.0.0 lists everything since 0.9.0 and not
// just what changed after 1.0.0-rc.2. Pre-releases are marked as such.
//
// A version that already has a release is skipped, so this is safe to run any
// number of times.
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";

import { versionOrder } from "@flexdeck/plugin-sdk/repo";

import { changes, notes, parsePackageName } from "./notes.mjs";
import { PUBLISHED, ROOT, builtPackages, isPrerelease, publishedVersions, releaseTag, taggedCommit } from "./lib.mjs";

const args = process.argv.slice(2);
const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const dryRun = args.includes("--dry-run");
const only = option("--only");
const git = (...args) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
const target = git("rev-parse", "--verify", `${option("--target") ?? "HEAD"}^{commit}`);

function gh(args, input) {
  const result = spawnSync("gh", args, { cwd: ROOT, encoding: "utf8", input, stdio: ["pipe", "pipe", "pipe"] });
  return { ok: result.status === 0, out: (result.stdout ?? "").trim(), err: (result.stderr ?? "").trim() };
}

/** The plugin's folder and manifest as they were at `commit`. */
function sourceAt(commit, id) {
  for (const group of PUBLISHED) {
    try {
      const text = execFileSync("git", ["show", `${commit}:${group}/${id}/plugin.json`], {
        cwd: ROOT,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
      const manifest = JSON.parse(text);
      return { rel: `${group}/${id}`, manifest };
    } catch {
      // Not in this group.
    }
  }
  return null;
}

let existing = null;
if (!dryRun) {
  const listed = gh(["release", "list", "--limit", "1000", "--json", "tagName", "--jq", ".[].tagName"]);
  if (!listed.ok) {
    console.error(`could not list the releases: ${listed.err}`);
    process.exit(1);
  }
  existing = new Set(listed.out.split("\n"));
}

let released = 0;
let failed = 0;
let seen = false;
for (const { file, abs } of builtPackages()) {
  const parsed = parsePackageName(file);
  if (!parsed) {
    console.warn(`skipping ${file}: not <id>-<version>.fdpkg`);
    continue;
  }
  const { id, version } = parsed;
  if (only && id !== only) continue;
  seen = true;
  const tag = releaseTag(parsed);
  if (existing?.has(tag)) {
    console.log(`${tag}: already released, skipped`);
    continue;
  }
  const source = sourceAt(target, id);
  if (!source) {
    console.error(`${tag}: no plugins/${id} or recipes/${id} at ${target.slice(0, 7)}`);
    failed++;
    continue;
  }
  if (source.manifest.version !== version) {
    console.error(`${tag}: ${source.rel} is at ${source.manifest.version} on ${target.slice(0, 7)}, not ${version}`);
    failed++;
    continue;
  }
  const prerelease = isPrerelease(version);
  // The changes since the previous release (any earlier version, for a
  // pre-release); all of them for the first.
  const earlier = publishedVersions(id, versionOrder).filter(
    (other) => versionOrder(other.version, version) < 0 && (prerelease || !isPrerelease(other.version)),
  );
  const previous = earlier.length ? taggedCommit(earlier.at(-1).tag) : "";
  const range = previous ? [`${previous}..${target}`] : [target];
  const log = git("log", "--format=%B%x00", ...range, "--", source.rel);
  const messages = log.split("\0").map((message) => message.trim()).filter(Boolean);

  const bytes = readFileSync(abs);
  const body = notes({
    manifest: source.manifest,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    size: statSync(abs).size,
    file,
    grouped: changes(id, messages),
    first: earlier.length === 0,
    prerelease,
  });
  const title = `${source.manifest.name ?? id} ${version}`;

  if (dryRun) {
    console.log(`\n=== ${tag} on ${target.slice(0, 7)}: ${title}${prerelease ? " (pre-release)" : ""}\n\n${body}`);
    released++;
    continue;
  }
  // Never "latest": that is one release for the whole repository, and every
  // plugin here has its own line of releases.
  const create = ["release", "create", tag, abs, "--target", target, "--title", title, "--notes-file", "-", "--latest=false"];
  if (prerelease) create.push("--prerelease");
  const result = gh(create, body);
  if (result.ok) {
    console.log(`released ${tag}: ${result.out}`);
    released++;
  } else {
    console.error(`${tag}: ${result.err}`);
    failed++;
  }
}

if (only && !seen) {
  console.error(`${only} has no package in dist/`);
  failed++;
}
console.log(`\n${released} ${dryRun ? "to release" : "released"}${failed ? `, ${failed} failed` : ""}`);
if (failed) process.exit(1);
