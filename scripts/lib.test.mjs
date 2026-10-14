import assert from "node:assert/strict";
import { test } from "node:test";

import { isPrerelease, nextVersion, packageFile, parseTag, releaseUrl } from "./lib.mjs";

test("patch, minor and major count from the release part", () => {
  assert.equal(nextVersion("0.4.0", "patch"), "0.4.1");
  assert.equal(nextVersion("0.4.7", "minor"), "0.5.0");
  assert.equal(nextVersion("0.4.7", "major"), "1.0.0");
  assert.equal(nextVersion("1.0.0-rc.2", "patch"), "1.0.1");
});

test("an exact version is taken as it is, and nonsense is refused", () => {
  assert.equal(nextVersion("0.4.0", "1.0.0-rc.1"), "1.0.0-rc.1");
  assert.throws(() => nextVersion("0.4.0", "next"), /not a version/);
  assert.throws(() => nextVersion("0.4.0", "1.0"), /not a version/);
});

test("a package is built into dist/ and installed from its GitHub release", () => {
  assert.equal(isPrerelease("1.0.0-rc.1"), true);
  assert.equal(isPrerelease("1.0.0"), false);
  assert.match(packageFile({ id: "obs", version: "1.0.0-rc.1" }).replaceAll("\\", "/"), /dist\/obs-1\.0\.0-rc\.1\.fdpkg$/);
  assert.equal(
    releaseUrl({ id: "home-assistant", version: "1.0.2" }),
    "https://github.com/Questory-Labs/FlexDeck-Plugins/releases/download/home-assistant-v1.0.2/home-assistant-1.0.2.fdpkg",
  );
});

test("a release tag reads back as its plugin and version", () => {
  assert.deepEqual(parseTag("home-assistant-v1.0.2"), { id: "home-assistant", version: "1.0.2", tag: "home-assistant-v1.0.2" });
  assert.deepEqual(parseTag("obs-v1.0.0-rc.1"), { id: "obs", version: "1.0.0-rc.1", tag: "obs-v1.0.0-rc.1" });
  assert.equal(parseTag("v0.1.0"), null);
  assert.equal(parseTag("obs-1.0.0"), null);
});
