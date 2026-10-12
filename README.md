# FlexDeck plugins

The official plugin repository for [FlexDeck](https://flex-deck.com). The FlexDeck app reads it to fill its marketplace:

```
https://raw.githubusercontent.com/Questory-Labs/FlexDeck-Plugins/main/repository.min.json
```

| Plugin | What it does | Kind |
| --- | --- | --- |
| [OBS Studio](plugins/obs) | Scenes, recording, streaming, input mutes and volumes | Node |
| [Discord](plugins/discord) | Mute, deafen, push-to-talk, voice channels, volumes, the soundboard | Node |
| [Spotify](plugins/spotify) | Likes, playlists, volume, devices, album art | Node |
| [Streamer.bot](plugins/streamerbot) | Run and toggle actions, show global variables | Node |
| [Soundboard](plugins/soundboard) | Clips to your headphones and, through a virtual cable, your mic | Native (Windows) |
| [Weather](recipes/weather) | The weather per key, from Open-Meteo | Recipe |
| [Calendar](recipes/calendar) | Your next event, from an iCal address | Recipe |
| [Crypto](recipes/crypto) | A coin's price and its last day, from CoinGecko | Recipe |
| [Home Assistant](recipes/home-assistant) | Any Home Assistant entity's state, on your network | Recipe |

## Layout

| Path | What |
| --- | --- |
| `plugins/<id>/` | A plugin's source: `plugin.json`, `package.json`, `src/`, `test/` |
| `recipes/<id>/` | A recipe: `plugin.json` and `recipe.json`, no code |
| `examples/` | Reference plugins that are tested but not published. `weather-node` is the ABI 4 reference in TypeScript (the published `weather` is the recipe) |
| `icons/` | `<id>.png` and `<id>-<px>.png`, picked up by the index |
| `packages/` | Every released `<id>-<version>.fdpkg`, written by CI and never changed. Pre-releases go in `packages/pre/`, which the index doesn't read |
| `repository.min.json`, `repository.json` | The index the app reads, written by CI |
| `repositories.min.json` | The community repositories FlexDeck has reviewed (the app's *Community* list) |

## Changing a plugin

Merging a change doesn't ship it. Each plugin is released on its own, when you choose.

1. Change the code and its tests. Describe each change for users in the commit, one typed line per change: `feat(obs): …`, `fix(obs): …`, `perf(obs): …` or `sec(obs): …`. These lines become the release notes. A line without a scope counts for the plugin whose folder the commit touches, and `chore`, `test`, `docs` and `ci` lines are left out. If you squash-merge, keep these lines in the squash message.
2. Open a pull request. CI runs `pnpm check`, the typechecks and every test, and dry-runs the release script. `pnpm check` also lists the plugins with unreleased changes.
3. Merge it. Main can hold unreleased changes for any number of plugins.

## Releasing a plugin

**Actions → Release plugin → Run workflow.** Pick the plugin, and the version: `patch`, `minor`, `major`, an exact one (`1.2.0`, `1.2.0-rc.1`), or blank to release the version already in the code. It then:

1. writes the version into `plugin.json`, `package.json` and the code (`src/index.ts`, or `Cargo.toml` for a native plugin), tests the plugin, and commits `release(<id>): v<version>` to `main`;
2. builds and packs only that plugin, on Windows for a native one and on Linux otherwise;
3. adds the package to `packages/` and rewrites `repository.min.json` so it lists this version as the plugin's newest, then commits both to `main`. FlexDeck offers the update within six hours;
4. cuts the GitHub release `<id>-v<version>`, with the `.fdpkg` attached and the notes from the plugin's typed lines since its previous release.

A version that is already released, or older than the newest one, is refused. A pre-release (`1.2.0-rc.1`) gets a GitHub pre-release only. It stays out of the index, so nobody is updated to it, and the final `1.2.0` lists everything since the release before the rc. Other plugins in the index never change when you release one. Two releases can run at once: the publish step retries on a moved `main`.

If a run fails after step 1, run it again with the version blank. To set a version without releasing, use `pnpm bump <id> <patch | minor | major | version>`.

## Working locally

```sh
pnpm install
pnpm test                 # every plugin's tests, and the soundboard's cargo tests
pnpm typecheck
pnpm check                # the rules above
pnpm build                # pack each new version into packages/ and rewrite the index
pnpm bump <id> patch      # a new version, everywhere the plugin writes it
```

Plugins are built with the published SDKs: [`@flexdeck/plugin-sdk`](https://www.npmjs.com/package/@flexdeck/plugin-sdk) on npm and [`flexdeck-plugin-sdk`](https://crates.io/crates/flexdeck-plugin-sdk) on crates.io. To build against a checkout of the app instead, for example while changing the SDK:

```sh
pnpm link-sdk ../flexdeck # links the npm SDK and patches the crates (.cargo/config.toml, gitignored)
```

Delete `.cargo/config.toml` and run `pnpm install` to go back to the published SDKs.

To check a package against the FlexDeck on your computer:

```sh
flexdeck verify-plugin packages/obs-0.4.0.fdpkg
```

To try the whole repository in the app, serve this folder (for example `npx serve -l 8799`) and start the agent with `FLEXDECK_OFFICIAL_REPO=http://127.0.0.1:8799/repository.min.json`.

## Pipeline

| Workflow | Runs on | Does |
| --- | --- | --- |
| `ci.yml` | pull requests, pushes to `main` | `pnpm check`, typecheck and tests (Linux); soundboard tests (Windows); a dry run of the release script |
| `release.yml` | by hand: *Release plugin* | releases one plugin (above) |
| `publish.yml` | by hand: *Publish all* | builds every version that has no package yet, rewrites the index, commits, and creates every missing GitHub release. Use it for the repository's first publish, or to repair a release that failed |

Releases are derived from `packages/`, so a package never gets two releases, and a missing one is made the next time either workflow runs. None is marked *latest*, since each plugin has its own line of releases. To preview the notes locally, run `node scripts/release.mjs --dry-run [--only <id>]`.

Before the first push, the SDKs must be on npm and crates.io (the app repository's *Plugin SDKs* workflow). Then run `pnpm install` and `cargo generate-lockfile` without `link-sdk`, and commit `pnpm-lock.yaml` and `Cargo.lock`: CI installs with `--frozen-lockfile`. Then run *Publish all* once to release every plugin's first version.

The workflows need *Settings → Actions → General → Workflow permissions: Read and write*, so Publish can commit. If `main` is protected, let `github-actions[bot]` push to it.

## Licence

MIT. See [LICENSE](LICENSE). Each plugin is MIT too, unless its folder says otherwise.
