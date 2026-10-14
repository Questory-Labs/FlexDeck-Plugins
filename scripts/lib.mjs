// What this repository publishes, read from the folders and the release tags.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = fileURLToPath(new URL("..", import.meta.url));
/** Where packages are built, before they are released. Not committed: a package lives on its GitHub release. */
export const DIST = join(ROOT, "dist");
/** The folders whose plugins are published. `examples/` is tested but never published. */
export const PUBLISHED = ["plugins", "recipes"];

export const REPO = {
  name: "FlexDeck",
  description: "FlexDeck's own plugins and recipes.",
  website: "https://github.com/Questory-Labs/FlexDeck-Plugins",
};

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

/** Every plugin folder under `groups`: `{ dir, rel, manifest, packageJson }`. */
export function sources(groups = PUBLISHED) {
  const found = [];
  for (const group of groups) {
    const base = join(ROOT, group);
    if (!existsSync(base)) continue;
    for (const name of readdirSync(base).sort()) {
      const dir = join(base, name);
      if (!existsSync(join(dir, "plugin.json"))) continue;
      const pkgPath = join(dir, "package.json");
      found.push({
        dir,
        rel: relative(ROOT, dir).split(sep).join("/"),
        manifest: readJson(join(dir, "plugin.json")),
        packageJson: existsSync(pkgPath) ? readJson(pkgPath) : null,
      });
    }
  }
  return found;
}

/**
 * Where a source writes its version down, each as a file in its folder and a
 * pattern whose groups are (before, version, after). The first match counts.
 */
export function versionSites({ manifest, packageJson }) {
  const json = { pattern: /("version"\s*:\s*")([^"]*)(")/ };
  const sites = [{ file: "plugin.json", ...json }];
  if (packageJson) sites.push({ file: "package.json", ...json });
  // definePlugin({ id, name, version: "…" }) — the manifest the code reports.
  if (manifest.runtime === "node") sites.push({ file: "src/index.ts", pattern: /(\bversion:\s*")([^"]*)(")/ });
  // The binary reports env!("CARGO_PKG_VERSION").
  if (manifest.runtime === "native") sites.push({ file: "Cargo.toml", pattern: /(^version\s*=\s*")([^"]*)(")/m });
  return sites;
}

export const isPrerelease = (version) => version.includes("-");

/** The package file name of `version` of plugin `id`. */
export const packageName = ({ id, version }) => `${id}-${version}.fdpkg`;

/** Where `version` of plugin `id` is built. */
export const packageFile = (plugin) => join(DIST, packageName(plugin));

/** The release tag of `version` of plugin `id`. */
export const releaseTag = ({ id, version }) => `${id}-v${version}`;

/** Where the index sends FlexDeck for a released package: the file attached to its GitHub release. */
export const releaseUrl = (plugin) => `${REPO.website}/releases/download/${releaseTag(plugin)}/${packageName(plugin)}`;

/** A release tag, `<id>-v<version>`, read back. */
export function parseTag(tag) {
  const match = /^([a-z][a-z0-9_-]*?)-v(\d+\.\d+\.\d+[0-9A-Za-z.+-]*)$/.exec(tag);
  return match ? { id: match[1], version: match[2], tag } : null;
}

/** Every built package in dist/: `{ file, abs }`. */
export function builtPackages() {
  if (!existsSync(DIST)) return [];
  return readdirSync(DIST)
    .filter((file) => file.endsWith(".fdpkg"))
    .sort()
    .map((file) => ({ file, abs: join(DIST, file) }));
}

/**
 * Every released version, from the release tags. Each release made here tags
 * its commit, so a checkout needs the tags (CI fetches with full depth).
 */
export function releases() {
  const listed = execFileSync("git", ["tag", "--list", "*-v*"], { cwd: ROOT, encoding: "utf8" });
  return listed.split("\n").map((tag) => parseTag(tag.trim())).filter(Boolean);
}

/** The released versions of plugin `id`, oldest first. */
export function publishedVersions(id, order) {
  return releases()
    .filter((entry) => entry.id === id)
    .sort((a, b) => order(a.version, b.version));
}

/** The commit a release tag is on. */
export const taggedCommit = (tag) => execFileSync("git", ["rev-list", "-n", "1", tag], { cwd: ROOT, encoding: "utf8" }).trim();

const SEMVER = /^(\d+)\.(\d+)\.(\d+)([0-9A-Za-z.+-]*)$/;

/**
 * The version `spec` asks for, from `current`: `patch`, `minor` or `major`
 * (from the release part of `current`, so `patch` of 1.0.0-rc.1 is 1.0.1), or
 * an exact version like `1.2.0` or `1.2.0-rc.1`.
 */
export function nextVersion(current, spec) {
  const kinds = ["major", "minor", "patch"];
  if (kinds.includes(spec)) {
    const match = SEMVER.exec(current);
    if (!match) throw new Error(`'${current}' is not a version 'patch', 'minor' or 'major' can count from`);
    const parts = match.slice(1, 4).map(Number);
    const at = kinds.indexOf(spec);
    parts[at]++;
    for (let index = at + 1; index < 3; index++) parts[index] = 0;
    return parts.join(".");
  }
  if (!SEMVER.test(spec) || spec.includes("..")) throw new Error(`'${spec}' is not a version (like 1.2.3 or 1.2.3-rc.1) nor patch, minor or major`);
  return spec;
}

/** Write `version` everywhere `source` writes its version down; returns the files changed. */
export function setVersion(source, version) {
  const changed = [];
  for (const site of versionSites(source)) {
    const path = join(source.dir, site.file);
    if (!existsSync(path)) continue;
    const text = readFileSync(path, "utf8");
    if (!site.pattern.test(text)) throw new Error(`${source.rel}/${site.file}: no version found to change`);
    const next = text.replace(site.pattern, (_, before, _old, after) => `${before}${version}${after}`);
    if (next !== text) {
      writeFileSync(path, next);
      changed.push(`${source.rel}/${site.file}`);
    }
  }
  return changed;
}
