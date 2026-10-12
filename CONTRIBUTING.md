# Contributing

## A plugin in this repository

Plugins here are maintained by the FlexDeck project and ship to everyone who uses
the app. Open an issue first if you want to add one, so we can agree it belongs
here and not in a repository of your own.

A pull request needs:

- passing CI: `pnpm check`, `pnpm typecheck` and `pnpm test`
- one `feat(<id>): …` / `fix(<id>): …` line per user-facing change in the commit messages, written for users: they become the release notes
- tests that run without the real program (see how `plugins/obs/test` fakes OBS)
- only the permissions the plugin needs (`network`, `notifications`, `processes`, `filesystem`)
- `flexdeck verify-plugin` passing on the package (`npm run verify` in the plugin's folder)
- a `README.md` in its folder shaped like the others: what it does, every setup step a person needs, its actions and values, and troubleshooting for the errors it can show. Add its strip of keys to `scripts/gen-art.mjs` and run `pnpm art`

A pull request doesn't change versions: a maintainer releases each plugin when it's ready, with *Release plugin*.

Contributions are MIT licensed, like the rest of this repository.

## Your own repository

You don't need to be listed here to publish a plugin. A repository is just a
static `repository.min.json` and its packages. The
[guide](https://github.com/santoshpanna/FlexDeck/blob/main/docs/plugins.md#host-your-own-repository)
shows how to host one on GitHub Pages, and anyone can add it in FlexDeck under
*Repositories → Add a repository by address*.

To have your repository listed under *Community* in the app, open a pull request
that adds it to `repositories.min.json`:

```json
{ "url": "https://you.github.io/your-plugins/repository.min.json", "name": "…", "description": "…", "maintainer": "…" }
```

We review who runs the repository as well as its plugins, because a listing is a
recommendation.
