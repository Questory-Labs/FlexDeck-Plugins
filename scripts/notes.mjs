// Release notes for one plugin version, from its commits. Pure: release.mjs
// does the git calls.
//
// Commits follow the app's convention: a plain subject, and one typed line per
// change, `feat(obs): …`, `fix: …`. A line reaches the notes when its type is a
// user-facing one and its scope is this plugin, or it has no scope (the commit
// touched the plugin's folder, so an unscoped line is about it).

const LINE = /^(\w+)(?:\(([^)]+)\))?!?:\s+(.+)$/;
const GROUPS = { feat: "Added", perf: "Improved", fix: "Fixed", sec: "Security" };
const ORDER = ["Added", "Improved", "Fixed", "Security"];

/** A package file name, `<id>-<version>.fdpkg`, read back. */
export function parsePackageName(name) {
  const match = /^([a-z][a-z0-9_-]*?)-(\d+\.\d+\.\d+[0-9A-Za-z.+-]*)\.fdpkg$/.exec(name);
  return match ? { id: match[1], version: match[2] } : null;
}

/** The changes in `messages` (whole commit messages) that are about `id`, grouped. */
export function changes(id, messages) {
  const groups = new Map();
  const seen = new Set();
  for (const message of messages) {
    for (const raw of message.split("\n")) {
      const match = LINE.exec(raw.trim());
      if (!match) continue;
      const [, type, scope, text] = match;
      const group = GROUPS[type.toLowerCase()];
      if (!group) continue;
      const scopes = scope ? scope.split(",").map((part) => part.trim().toLowerCase()) : [];
      if (scopes.length > 0 && !scopes.includes(id)) continue;
      const line = text.trim();
      if (seen.has(line)) continue;
      seen.add(line);
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group).push(line);
    }
  }
  return ORDER.filter((group) => groups.has(group)).map((group) => ({ group, lines: groups.get(group) }));
}

/** The release body. */
export function notes({ manifest, sha256, size, file, grouped, first, prerelease = false }) {
  const out = [];
  if (manifest.description) out.push(manifest.description, "");
  if (prerelease) {
    out.push("> **Pre-release.** The marketplace does not offer it; download the package below to try it.", "");
  }
  if (grouped.length === 0) {
    out.push(first ? "First release." : "Maintenance release: no user-facing changes.", "");
  }
  for (const { group, lines } of grouped) {
    out.push(`### ${group}`, "");
    for (const line of lines) out.push(`- ${line}`);
    out.push("");
  }
  out.push(
    "### Install",
    "",
    prerelease
      ? `Download \`${file}\` below and open it in FlexDeck under **Plugins → Other ways to install**.`
      : `Install *${manifest.name}* from the **Marketplace** in FlexDeck; once this is the newest version, FlexDeck offers it as an update within six hours. Or download \`${file}\` below and open it under **Other ways to install**.`,
    "",
    "| | |",
    "| --- | --- |",
    `| Plugin ABI | ${manifest.abi} |`,
    `| Runtime | ${manifest.runtime} |`,
    `| Permissions | ${(manifest.permissions ?? []).join(", ") || "none"} |`,
    `| Size | ${size} bytes |`,
    `| SHA-256 | \`${sha256}\` |`,
    "",
  );
  return out.join("\n");
}
