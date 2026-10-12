// Build against a local checkout of the FlexDeck app instead of the published
// SDKs — for working on the SDK and a plugin together, or before a release.
//
//   pnpm link-sdk [../flexdeck]
//
// Installs with @flexdeck/plugin-sdk linked from the checkout (no lockfile is
// written, so the link never gets committed) and writes .cargo/config.toml,
// which is gitignored, patching the Rust SDK crates to the checkout. Delete
// .cargo/config.toml and run `pnpm install` to go back to the published ones.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { ROOT } from "./lib.mjs";

const sdk = resolve(ROOT, process.argv[2] ?? "../flexdeck");
for (const part of ["packages/plugin-sdk/package.json", "crates/flexdeck-plugin-sdk/Cargo.toml"]) {
  if (!existsSync(join(sdk, part))) {
    console.error(`${sdk} is not a FlexDeck checkout (no ${part})`);
    process.exit(1);
  }
}

// One command string: on Windows pnpm is a .cmd, which only runs through a shell.
const install = spawnSync("pnpm install --config.lockfile=false", {
  cwd: ROOT,
  env: { ...process.env, FLEXDECK_SDK: sdk },
  stdio: "inherit",
  shell: true,
});
if (install.status !== 0) process.exit(install.status ?? 1);

const crate = (name) => JSON.stringify(join(sdk, "crates", name).replaceAll("\\", "/"));
mkdirSync(join(ROOT, ".cargo"), { recursive: true });
writeFileSync(
  join(ROOT, ".cargo", "config.toml"),
  `# Written by scripts/link-sdk.mjs; gitignored.\n[patch.crates-io]\nflexdeck-plugin-sdk = { path = ${crate("flexdeck-plugin-sdk")} }\nflexdeck-plugin-abi = { path = ${crate("flexdeck-plugin-abi")} }\n`,
);
console.log(`\nlinked the SDKs from ${sdk}`);
