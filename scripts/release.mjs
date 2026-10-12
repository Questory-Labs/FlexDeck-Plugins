// A GitHub release for every published package that does not have one yet.
//
//   node scripts/release.mjs            create the missing releases (needs gh and GH_TOKEN)
//   node scripts/release.mjs --only obs only that plugin's (what a release does)
//   node scripts/release.mjs --dry-run  print what would be released, and the notes
//
// Each package `packages/<id>-<version>.fdpkg` becomes the tag `<id>-v<version>`,
// on the commit that added the package, with the package attached. The notes are
// the plugin's changes since its previous release: the typed lines (`feat(obs): …`)
// of the commits that touched its folder in between (see notes.mjs). A release
// counts from the previous release, skipping pre-releases, so 1.0.0 lists everything
// since 0.9.0 and not just what changed after 1.0.0-rc.2. Pre-releases (packages/pre/)
// are marked as such.
//
// Releases are derived from packages/, never the other way round, so this is
// safe to run any number of times: a package that has a release is skipped, and
// one whose release failed last time is released on the next run.
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";

import { versionOrder } from "@flexdeck/plugin-sdk/repo";

import { changes, notes, parsePackageName } from "./notes.mjs";
import { PUBLISHED, ROOT, allPackages, isPrerelease } from "./lib.mjs";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : undefined;
const git = (...args) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();

function gh(args, input) {
  const result = spawnSync("gh", args, { cwd: ROOT, encoding: "utf8", input, stdio: ["pipe", "pipe", "pipe"] });
  return { ok: result.status === 0, out: (result.stdout ?? "").trim(), err: (result.stderr ?? "").trim() };
}

/** The commit that added `path`, or "" if it is not committed. */
const addedIn = (path) => git("log", "--diff-filter=A", "--format=%H", "-1", "--", path);

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

// Every package, grouped by plugin, oldest version first.
const byId = new Map();
for (const { file, path, abs } of allPackages()) {
  const parsed = parsePackageName(file);
  if (!parsed) {
    console.warn(`skipping ${file}: not <id>-<version>.fdpkg`);
    continue;
  }
  if (only && parsed.id !== only) continue;
  if (!byId.has(parsed.id)) byId.set(parsed.id, []);
  byId.get(parsed.id).push({ ...parsed, file, path, abs });
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
for (const [id, versions] of [...byId].sort(([a], [b]) => (a < b ? -1 : 1))) {
  versions.sort((a, b) => versionOrder(a.version, b.version));
  versions.forEach(({ version, file, path, abs }, position) => {
    const tag = `${id}-v${version}`;
    if (existing?.has(tag)) return;
    const commit = addedIn(path);
    if (!commit) {
      console.log(`${tag}: ${path} is not committed yet, skipped`);
      return;
    }
    const source = sourceAt(commit, id);
    if (!source) {
      console.error(`${tag}: no plugins/${id} or recipes/${id} at ${commit.slice(0, 7)}`);
      failed++;
      return;
    }
    const prerelease = isPrerelease(version);
    // The changes since the previous release (any earlier version, for a
    // pre-release); all of them for the first.
    const earlier = versions.slice(0, position).filter((other) => prerelease || !isPrerelease(other.version));
    const previous = earlier.length ? addedIn(earlier[earlier.length - 1].path) : "";
    const range = previous ? [`${previous}..${commit}`] : [commit];
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
      console.log(`\n=== ${tag} on ${commit.slice(0, 7)}: ${title}${prerelease ? " (pre-release)" : ""}\n\n${body}`);
      released++;
      return;
    }
    // Never "latest": that is one release for the whole repository, and every
    // plugin here has its own line of releases.
    const args = ["release", "create", tag, abs, "--target", commit, "--title", title, "--notes-file", "-", "--latest=false"];
    if (prerelease) args.push("--prerelease");
    const result = gh(args, body);
    if (result.ok) {
      console.log(`released ${tag}: ${result.out}`);
      released++;
    } else {
      console.error(`${tag}: ${result.err}`);
      failed++;
    }
  });
}

if (only && !byId.has(only)) console.log(`${only} has no package yet`);
console.log(`\n${released} ${dryRun ? "to release" : "released"}${failed ? `, ${failed} failed` : ""}`);
if (failed) process.exit(1);
