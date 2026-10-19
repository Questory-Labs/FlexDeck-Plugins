// Rewrite repository.min.json (and repository.json) from the GitHub releases.
//
//   node scripts/index.mjs
//
// Each plugin's highest released version is listed, pre-releases left out, with
// its package's address on the release. The packages are downloaded from those
// same addresses to read and checksum them, so a listed address is known to work.
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { buildRepository, versionOrder } from "@flexdeck/plugin-sdk/repo";

import { ICON_PACKS_TAG, REPO, ROOT, iconPacksAt, iconPackVersions, isPrerelease, packageName, releaseUrl, releases } from "./lib.mjs";

const newest = new Map();
for (const release of releases()) {
  if (isPrerelease(release.version)) continue;
  const current = newest.get(release.id);
  if (!current || versionOrder(release.version, current.version) > 0) newest.set(release.id, release);
}

const iconPacksVersion = iconPackVersions(versionOrder)
  .filter((version) => !isPrerelease(version))
  .at(-1);
const iconPacksTag = iconPacksVersion && `${ICON_PACKS_TAG}${iconPacksVersion}`;
const iconPackUrl = (id) => `${REPO.website}/releases/download/${iconPacksTag}/${id}.zip`;

async function download(url, file) {
  const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`${url}: ${response.status} ${response.statusText}`);
  writeFileSync(file, Buffer.from(await response.arrayBuffer()));
}

const work = mkdtempSync(join(tmpdir(), "flexdeck-index-"));
try {
  for (const release of newest.values()) await download(releaseUrl(release), join(work, packageName(release)));
  const packs = join(work, "icon-packs");
  mkdirSync(packs);
  for (const id of iconPacksTag ? iconPacksAt(iconPacksTag) : []) await download(iconPackUrl(id), join(packs, `${id}.zip`));

  const icons = join(ROOT, "icons");
  const index = buildRepository(work, { out: ROOT, ...REPO, icons: existsSync(icons) ? icons : undefined, iconPacks: packs });
  for (const plugin of index.plugins) plugin.package.url = releaseUrl(plugin);
  for (const pack of index.iconPacks ?? []) pack.package.url = iconPackUrl(pack.id);
  writeFileSync(join(ROOT, "repository.min.json"), JSON.stringify(index));
  writeFileSync(join(ROOT, "repository.json"), `${JSON.stringify(index, null, 2)}\n`);

  console.log(`repository.min.json: ${index.plugins.length} plugins`);
  for (const plugin of index.plugins) console.log(`  ${plugin.id} ${plugin.version}`);
  for (const pack of index.iconPacks ?? []) console.log(`  icon pack ${pack.id} ${pack.version}`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
