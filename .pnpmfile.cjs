// Build against a local checkout of the SDK instead of the published one:
//
//   FLEXDECK_SDK=../flexdeck pnpm install --config.lockfile=false
//
// Without FLEXDECK_SDK this does nothing, so CI and the lockfile only ever see
// the published @flexdeck/plugin-sdk. (Keep the lockfile out of it, as above:
// a link to someone's disk must never be committed.)
const { resolve } = require("node:path");

function readPackage(pkg) {
  const sdk = process.env.FLEXDECK_SDK;
  if (sdk && pkg.dependencies?.["@flexdeck/plugin-sdk"]) {
    pkg.dependencies["@flexdeck/plugin-sdk"] = `link:${resolve(__dirname, sdk, "packages", "plugin-sdk")}`;
  }
  return pkg;
}

module.exports = { hooks: { readPackage } };
