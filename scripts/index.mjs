// Rewrite repository.min.json (and repository.json) from the GitHub releases.
//
//   node scripts/index.mjs
//
// Each plugin's highest released version is listed, pre-releases left out, with
// its package's address on the release. The packages are downloaded from those
// same addresses to read and checksum them, so a listed address is known to work.
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { buildRepository, versionOrder } from "@flexdeck/plugin-sdk/repo";

import { REPO, ROOT, isPrerelease, packageName, releaseUrl, releases } from "./lib.mjs";

const newest = new Map();
for (const release of releases()) {
  if (isPrerelease(release.version)) continue;
  const current = newest.get(release.id);
  if (!current || versionOrder(release.version, current.version) > 0) newest.set(release.id, release);
}

const work = mkdtempSync(join(tmpdir(), "flexdeck-index-"));
try {
  for (const release of newest.values()) {
    const url = releaseUrl(release);
    const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
    if (!response.ok) throw new Error(`${url}: ${response.status} ${response.statusText}`);
    writeFileSync(join(work, packageName(release)), Buffer.from(await response.arrayBuffer()));
  }

  const icons = join(ROOT, "icons");
  const index = buildRepository(work, { out: ROOT, ...REPO, icons: existsSync(icons) ? icons : undefined });
  for (const plugin of index.plugins) plugin.package.url = releaseUrl(plugin);
  writeFileSync(join(ROOT, "repository.min.json"), JSON.stringify(index));
  writeFileSync(join(ROOT, "repository.json"), `${JSON.stringify(index, null, 2)}\n`);

  console.log(`repository.min.json: ${index.plugins.length} plugins`);
  for (const plugin of index.plugins) console.log(`  ${plugin.id} ${plugin.version}`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
