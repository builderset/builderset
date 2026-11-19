# Contributing

## Set up

Node 24 (`.nvmrc`) and pnpm 11:

```bash
corepack enable
pnpm install
```

## Before a pull request

Every one of these passes:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm format:check
pnpm build
pnpm check:packages      # what was built: use client, imports, manifests, types
```

CI runs the same, and the tests on Node 20, 22 and 24 once merged.

## Branches

| Branch        | What it is                                                          |
| ------------- | ------------------------------------------------------------------- |
| `development` | Where work lands. The default branch; every pull request targets it |
| `staging`     | Promoted from `development` by a merge; pre-releases come from here |
| `production`  | Promoted from `staging` by a merge; releases come from here         |

A change starts on a short branch from `development` (`feat/…`, `fix/…`,
`chore/…`) and comes back through a pull request. Nothing is committed to
`staging` or `production` directly.

## Rules

1. **One change, one pull request.** A refactor and a feature in one pull
   request hide each other's regressions.
2. **Moves and changes are separate commits.** A commit that moves a file
   changes nothing in it; the next commit edits it. `git log --follow` keeps
   working and the diff can be read.
3. **The boundaries hold.** The engine imports no kit, a kit imports no other
   kit, a `core` folder imports no React and no `render` or `editor`, and a
   `render` folder imports no `editor`. ESLint enforces it
   (`tooling/eslint.config.js`).
4. **Contract files change on purpose.** Each kit's `schema/` and `fixtures/`
   are what backends in other languages test against. The tests that write
   them fail when they are stale; regenerate with `UPDATE_FIXTURES=1 pnpm test`
   and say in the pull request why they changed.
5. **Docs in the same change.** If a change alters what a README or
   `BACKEND.md` says, that file changes in the same pull request.

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org/): `feat(email): …`,
`fix(engine): …`, `refactor: …`, `docs: …`, `chore: …`. The scope is the
package's folder name.

## Releases

The packages are published to GitHub Packages, private until launch, by `.github/workflows/release.yml` — nobody publishes by hand.

1. A pull request into `development` that changes a package adds a changeset: `pnpm changeset`, the packages, patch, minor or major, and one sentence for the changelog, written for a user. CI fails the pull request without one. Every package moves together, at one version.
2. Merging `development` into `staging` publishes a pre-release of the waiting changesets under the `alpha` tag: `0.1.0-alpha.20261115093000`. It is not committed; the next one replaces it.
3. Merging `staging` into `production` makes the workflow open a **Version packages** pull request into `production`: the versions bumped, the changelogs written. Merging that pull request publishes the release, tags it, and attaches the Python wheel (same version, `tooling/sync-python-version.mjs`) to a GitHub release `v<version>`. Then merge `production` back into `development`, so the versions and changelogs are there too.

Before merging a **Version packages** pull request:

- [ ] Every package has the same version.
- [ ] The changelog reads correctly for a user.
- [ ] CI is green, the Examples workflow included.
- [ ] If the stored format changed: the migration and the old-version fixture are in this release.
- [ ] If a public prop, entry point or CSS variable changed: the docs and the examples changed in the same release.

### The rules of a registry

| Rule                                                                                                   | Why                                                                                                              |
| ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| A published version is never changed                                                                   | The registry refuses a second publish of the same version, and users' lockfiles record its hash                  |
| A bad release is fixed by the next patch version, then deprecated                                      | Deleting a version breaks everyone who installed it                                                              |
| Before 1.0, a security fix goes out on the latest minor only                                           | One maintainer                                                                                                   |
| Every breaking change has a changeset that says what to change                                         | The changelog is the upgrade guide                                                                               |
| A change to the stored format has a migration, a fixture of the old version, and a minor bump at least | Documents saved by users must keep opening ([BLUEPRINT.md §15](docs/plan/BLUEPRINT.md#15-versions-and-promises)) |
| Nobody publishes by hand                                                                               | The workflow is the only publisher                                                                               |

### Installing from GitHub Packages

A project that installs the kits — on a laptop, in CI, in a Docker build — needs a GitHub token with `read:packages` and this `.npmrc`:

```ini
@builderset:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

In a Docker build, pass the token as a build secret, never as a build argument: an argument stays in the image's history. `builderset`, the all-in-one package, is not on GitHub Packages, which holds scoped names only; it arrives with the move to npm at launch.

Until the first release, the kits carry only the `alpha` tag, with no `latest`: install `@builderset/email@alpha`, and `npm view @builderset/email` with no tag prints nothing.

To run the examples against what is published rather than what is in the repository, with the token in your own `.npmrc`: `pnpm test:examples --from alpha`. `next-shadcn` is skipped: it needs the all-in-one package.
