import assert from "node:assert/strict";
import { test } from "node:test";

import { isPrerelease, nextVersion, packageFile } from "./lib.mjs";

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

test("a pre-release is packaged apart, where the index does not look", () => {
  assert.equal(isPrerelease("1.0.0-rc.1"), true);
  assert.equal(isPrerelease("1.0.0"), false);
  assert.match(packageFile({ id: "obs", version: "1.0.0-rc.1" }).replaceAll("\\", "/"), /packages\/pre\/obs-1\.0\.0-rc\.1\.fdpkg$/);
  assert.match(packageFile({ id: "obs", version: "1.0.0" }).replaceAll("\\", "/"), /packages\/obs-1\.0\.0\.fdpkg$/);
});
