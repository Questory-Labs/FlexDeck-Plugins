// What this repository publishes, read from the folders.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = fileURLToPath(new URL("..", import.meta.url));
/** Where built packages are kept. Each `<id>-<version>.fdpkg` is written once and never again. */
export const PACKAGES = join(ROOT, "packages");
/**
 * Pre-releases (`1.0.0-rc.1`). Kept apart so the index, which lists the highest
 * version in packages/, never offers one to everybody; they ship only as a
 * GitHub pre-release.
 */
export const PRERELEASES = join(PACKAGES, "pre");
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

/** The package file `version` of plugin `id` is published as. */
export function packageFile({ id, version }) {
  return join(isPrerelease(version) ? PRERELEASES : PACKAGES, `${id}-${version}.fdpkg`);
}

/** Every package file, pre-releases included: `{ path, file }`, path relative to the root. */
export function allPackages() {
  const found = [];
  for (const [dir, prefix] of [[PACKAGES, "packages/"], [PRERELEASES, "packages/pre/"]]) {
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir).sort()) if (file.endsWith(".fdpkg")) found.push({ file, path: `${prefix}${file}`, abs: join(dir, file) });
  }
  return found;
}

/** The published versions of plugin `id`, oldest first. */
export function publishedVersions(id, parse, order) {
  return allPackages()
    .map((entry) => ({ ...entry, ...parse(entry.file) }))
    .filter((entry) => entry.id === id)
    .sort((a, b) => order(a.version, b.version));
}

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
