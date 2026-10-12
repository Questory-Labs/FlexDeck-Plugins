import assert from "node:assert/strict";
import { test } from "node:test";

import { changes, notes, parsePackageName } from "./notes.mjs";

test("a package name reads back as its id and version, hyphens and pre-releases included", () => {
  assert.deepEqual(parsePackageName("obs-0.4.0.fdpkg"), { id: "obs", version: "0.4.0" });
  assert.deepEqual(parsePackageName("home-assistant-1.0.0.fdpkg"), { id: "home-assistant", version: "1.0.0" });
  assert.deepEqual(parsePackageName("obs-1.0.0-rc.1.fdpkg"), { id: "obs", version: "1.0.0-rc.1" });
  assert.equal(parsePackageName("readme.txt"), null);
});

test("only user-facing lines about this plugin reach its notes, grouped", () => {
  const grouped = changes("obs", [
    "Faster OBS reconnects\nperf(obs): reconnect within a second after OBS restarts\nfix: a scene with a slash in its name switches\ntest(obs): cover reconnects",
    "Discord and OBS\nfeat(discord, obs): show who is live\nfeat(discord): only Discord\nchore: tidy",
    "sec(obs): never log the websocket password",
  ]);
  assert.deepEqual(grouped, [
    { group: "Added", lines: ["show who is live"] },
    { group: "Improved", lines: ["reconnect within a second after OBS restarts"] },
    { group: "Fixed", lines: ["a scene with a slash in its name switches"] },
    { group: "Security", lines: ["never log the websocket password"] },
  ]);
});

test("the notes carry the checksum, and say so when there is nothing to list", () => {
  const body = notes({
    manifest: { name: "OBS Studio", description: "Scenes.", abi: 4, runtime: "node", permissions: ["network"] },
    sha256: "ab".repeat(32),
    size: 123,
    file: "obs-0.4.0.fdpkg",
    grouped: [],
    first: false,
  });
  assert.match(body, /Maintenance release/);
  assert.match(body, new RegExp(`\`${"ab".repeat(32)}\``));
  assert.match(body, /\| Permissions \| network \|/);
});
