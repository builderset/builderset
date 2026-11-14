# 08 — The new repository

## Goal

The three generic packages live in their own repository, with their git history, under the product's scope, and their tests pass there. MotorsAL's copies are frozen until step 14 replaces them.

## Why

Steps 02–07 made the packages independent of MotorsAL in code. They are still inside MotorsAL's repository, built by MotorsAL's tools and versioned with MotorsAL. A product needs its own releases, its own issues and its own continuous integration.

## Before you start

- Milestone M1: steps 02–07 are merged and deployed. The admin has run on the reshaped packages for at least a few days.
- Step 01 is done: the name is final, the npm organisation exists, and the empty repository `xhiti/builderset` exists in the personal GitHub account.
- `git-filter-repo` is installed (`pip install git-filter-repo`).

## The work

### 1. Extract the history

Work on a fresh clone. `git filter-repo` rewrites history and refuses to run on a repository that is not a fresh clone, on purpose.

```bash
git clone <MotorsAL's remote URL> builderset
cd builderset

git filter-repo \
  --path packages/engine --path packages/article --path packages/email \
  --path packages/builder-core --path packages/builder-render --path packages/builder-react \
  --path packages/email-core --path packages/email-render --path packages/email-react
```

The second and third lines of paths are the folders the files lived in before step 02. Without them, history would stop at the commit that moved them.

Check it worked:

```bash
git log --oneline | wc -l                                         # a few dozen commits, not thousands
git log --follow --oneline -- packages/email/src/core/document.ts # goes back past the move
ls                                                                # only packages/
```

### 2. Scan the result for secrets before it goes anywhere

[docs/README.md](../../README.md) records that live production credentials sit in MotorsAL's git history. The filter keeps only the nine package folders, so those files are not carried over — but check, because this repository will become public:

```bash
gitleaks detect --source . --log-opts="--all"
```

Also search by hand for anything a scanner cannot know is private:

```bash
git log --all -p | grep -inE "marrimauto|blejm|password|secret|api[_-]?key|token" | head -50
```

Fixture and test data that name marrimauto.com were replaced in step 06, but older commits still contain them. A site's name in old test data is not a secret; a credential is. If a real credential appears, stop and remove it with `git filter-repo --replace-text` before pushing.

### 3. Add the root of the workspace

```
builderset/
├── packages/            engine, article, email (from the filter)
├── examples/            empty for now
├── apps/                empty for now
├── tooling/
│   ├── tsconfig/        base.json, library.json   ← copied from MotorsAL's packages/config/tsconfig
│   ├── eslint.config.js                           ← copied from packages/config, with the import rules from steps 03 and 04
│   └── prettier.config.js
├── .github/
│   ├── workflows/ci.yml
│   └── ISSUE_TEMPLATE/
├── .changeset/          added in step 13
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── .gitignore  .editorconfig  .nvmrc  .prettierignore
├── README.md
├── LICENSE              the licence from decision D2
├── CONTRIBUTING.md
└── SECURITY.md          how to report a vulnerability: the project email from step 01
```

- **Use the same tool versions as MotorsAL**: pnpm 11, Turborepo, TypeScript, Vitest, ESLint, Prettier, all at the versions in MotorsAL's manifests. The code was written against them; changing a tool and moving the code in one step makes a failure impossible to place.
- `package.json`: `"private": true`, the `packageManager` field, scripts `build`, `lint`, `typecheck`, `test`, `format`, `format:check` that call Turborepo.
- `pnpm-workspace.yaml`: `packages/*`, `examples/*`, `apps/*`.
- `turbo.json`: copy MotorsAL's `build`, `lint`, `typecheck` and `test` tasks.
- The packages took their TypeScript and ESLint settings from `@motors/config`. Point them at `tooling/` instead and remove that dependency.

### 4. Rename the scope

One search and replace over the whole repository:

| From              | To                    |
| ----------------- | --------------------- |
| `@motors/engine`  | `@builderset/engine`  |
| `@motors/article` | `@builderset/article` |
| `@motors/email`   | `@builderset/email`   |

Then:

```bash
git grep -n "@motors/"          # nothing
git grep -inE "motors|marrimauto|blejm" -- . ':!**/CHANGELOG.md'     # nothing in code, comments or tests
```

Set every package's version to `0.0.0`. Keep `"private": true` for now; step 13 removes it.

Rename the data attribute and class the editor puts on its root, if steps 04 and 10 used `motors` anywhere, to `builderset`.

### 5. Continuous integration

`.github/workflows/ci.yml`, on every pull request and on pushes to `main`:

| Job       | Runs                                               | On                 |
| --------- | -------------------------------------------------- | ------------------ |
| `quality` | `pnpm lint`, `pnpm typecheck`, `pnpm format:check` | Node 24            |
| `test`    | `pnpm test`                                        | Node 20, 22 and 24 |

Three Node versions for the tests, because the `core` and `render` doors are promised to run on Node 20 and newer ([BLUEPRINT.md §13](../BLUEPRINT.md#13-build-and-package-format)).

Use `pnpm/action-setup` and `actions/setup-node` with its pnpm cache. Give the workflow `permissions: contents: read` and nothing more.

### 6. Repository settings

| Setting                             | Value                                                         |
| ----------------------------------- | ------------------------------------------------------------- |
| Default branch                      | `main`                                                        |
| Branch protection on `main`         | Pull request required; CI must pass; no force push            |
| Merge method                        | Squash                                                        |
| Secret scanning and push protection | On                                                            |
| Dependency updates                  | Dependabot or Renovate, weekly, grouped                       |
| Visibility                          | Private until milestone M4, unless decision D4 says otherwise |
| Discussions                         | On (decision D8)                                              |

**While the repository is private.** It is in a personal account. On the free plan, branch protection rules and secret scanning with push protection are offered for public repositories, so two rows of the table cannot be switched on until milestone M4. Check GitHub's current plan table, and until then:

| Missing           | Do this in its place                                                                                                         |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Branch protection | Keep the habit anyway: every change through a pull request, merged only when CI is green                                     |
| Secret scanning   | Run `gitleaks` in the `quality` job of `ci.yml`, on every pull request                                                       |
| Actions minutes   | A private repository has a monthly allowance. Run the three-version test matrix on `main` only, one version on pull requests |

Turn the real settings on the day the repository becomes public, before announcing it.

### 7. Push

```bash
git remote add origin git@github.com:xhiti/builderset.git
git push -u origin main
```

### 8. Freeze MotorsAL's copies

Between this step and step 14 the same code exists in two places. Without a rule they drift.

- **The new repository is the source of truth from now on.** New work happens there.
- **MotorsAL's `packages/engine`, `packages/article` and `packages/email` are frozen.** Add a `README.md` at the top of each: "Moved to `<repository URL>`. Do not change this copy. An urgent fix goes to the new repository first and is then copied here."
- An urgent fix made in MotorsAL anyway is recorded in a list at the top of step 14's pull request, so that it is not lost when the copies are deleted.

Keep the gap short. Steps 09–13 are about three weeks of work; do not start a large MotorsAL feature in the builders during them.

### 9. Move this plan

Copy `docs/builder_packages/` into the new repository as `docs/plan/`. In MotorsAL, leave `docs/builder_packages/README.md` with one paragraph and a link, and keep the two step files that are carried out in MotorsAL (14 and 15) in both places.

## Check

```bash
pnpm install
pnpm lint && pnpm typecheck && pnpm test
```

- The CI run on `main` is green on all three Node versions.
- `git log --follow` on a file in each package reaches commits from before step 02.
- `gitleaks` reports nothing.

## Done when

- [x] The repository holds `packages/engine`, `packages/article`, `packages/email` with history.
- [x] No file contains `@motors/`, and no code or comment names MotorsAL (outside `docs/plan/`, see below).
- [x] Lint, type check and tests pass locally and in CI on Node 20, 22 and 24.
- [x] The secret scan is clean.
- [x] `LICENSE`, `README.md`, `CONTRIBUTING.md` and `SECURITY.md` exist.
- [x] Branch protection and secret scanning are on, or, while the repository is private, their replacements from part 6 are in place.
- [x] MotorsAL's three folders carry the "frozen" README.
- [x] The plan is in the new repository.

## Traps

- **Running `filter-repo` in the real MotorsAL checkout.** It rewrites history in place. Always a fresh clone, in a different folder.
- **Forgetting the old paths.** History then starts at step 02's move commit and every file looks one commit old.
- **Tests that still reach for `../../api`.** Step 07 removed them; if one is left, it fails here with a missing file. Fix it here and copy the fix to MotorsAL.
- **Different line endings.** MotorsAL is developed on Windows. Add a `.gitattributes` with `* text=auto eol=lf` before the first commit in the new repository, or the fixture comparison tests fail on a Linux runner. The fixture tests already normalise `\r\n` when reading; the committed files should still be LF.
- **Making the repository public "just to test Actions".** Public is not reversible in practice: forks and caches keep the content. Decide it once, at M4.

## How it was done (2026-11-14)

Parts 1–5 and 7–9 are done. The repository is `github.com/mkurtii/builderset` for now, private; it moves to `xhiti/builderset` by a GitHub transfer later, and the links and the trusted publishers follow it then (step 01, part 3). Part 6 waits for that account; `LICENSE` and the security email wait for step 01.

| Part | What the plan said                                        | What was done                                                                                                                                                                                                                                                                                                                                         | Why                                                                                                |
| ---- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| —    | Start after M1 is merged and deployed                     | Started before the merge, with the owner's go-ahead after trying the editors on the reshaped packages                                                                                                                                                                                                                                                 | MotorsAL keeps its own copies until step 14, so nothing here can change the live admin             |
| 1    | Clone MotorsAL's remote                                   | Cloned the local `builderset` branch (`--no-local --single-branch`), which is not on the remote yet; `git filter-repo` ran through `uvx`. The six old folders were the only places the packages ever lived (first commit 2026-09-27). 47 commits; `git log --follow` reaches back past step 02                                                        | The branch holds steps 02–07 and exists only locally                                               |
| 2    | `gitleaks detect`                                         | `gitleaks` 8.24.3 in Docker: no leaks. The search by hand found sample data only (`+355 69 123 4567`, `arta@example.com`). **Every commit's author email is a work address**; kept on the owner's word until the transfer, when `git filter-repo --mailmap` rewrites it to the personal address (a force push, while the repository is still private) | A public repository shows the author of every commit                                               |
| 3    | `tooling/` with tsconfig, ESLint, Prettier                | As planned. The packages extend `../../tooling/tsconfig/library.json`; the root `eslint.config.js` and `prettier.config.js` re-export `tooling/`. The lockfile started as MotorsAL's and was pruned: pnpm downloaded nothing, so every dependency is the version MotorsAL tested                                                                      | Same versions, so a failure here is the move's, not a tool's                                       |
| 3    | —                                                         | A one-character formatting fix in `language-switch.tsx`, the only file `format:check` refused (MotorsAL's CI does not run it)                                                                                                                                                                                                                         | A step ends green                                                                                  |
| 4    | `git grep -inE "motors\|marrimauto\|blejm"` finds nothing | True for every file except `docs/plan/`, which is this plan and is about the app it was written in. Comments that named MotorsAL's `@motors/tokens` now say "the theme stylesheet", and the engine's README lists the global rules the hosting app has to supply until step 10                                                                        | Those rules are a real dependency step 10 must remove, not only a name                             |
| 5    | `test` on Node 20, 22 and 24                              | Node 22 and 24 run every suite; Node 20 runs the `*.node.test.ts` suites only (`--project node`). pnpm runs standalone                                                                                                                                                                                                                                | jsdom 30 needs Node 22.22, pnpm 11 needs Node 22.13; only `core`, `render`, `host` promise Node 20 |
| 6    | Default branch `main`                                     | Three branches from the same commit: `development` (the default, where work lands), `staging` and `production`, promoted by merges as in the app the packages came from. CI runs the full matrix on a push to any of them. The other settings wait for the transfer                                                                                   | The owner's model; step 13 releases pre-releases from `staging` and releases from `production`     |
| 7    | Push to `xhiti/builderset`                                | Pushed to `mkurtii/builderset`                                                                                                                                                                                                                                                                                                                        | The owner's current account; the transfer comes later                                              |
| 8    | Freeze MotorsAL's copies                                  | Each of the three folders has the notice at the top of its README. MotorsAL's `docs/builder_packages/` keeps its README (now a pointer) and steps 14 and 15                                                                                                                                                                                           | —                                                                                                  |
| 9    | Move the plan                                             | Copied to `docs/plan/`, kept here from now on. MotorsAL's folder becomes the pointer on the day of the push                                                                                                                                                                                                                                           | —                                                                                                  |

**Checks.** `pnpm lint`, `typecheck`, `test` and `format:check` pass on Node 26 (the only one on the machine): 222 tests in 26 files, the same counts as in MotorsAL, and no schema, fixture or golden file changed. The one lint warning (an unused `eslint-disable` in the article editor's test) came with the code. Node 20, 22 and 24 run for the first time in CI.

**For decision D5.** Node 20 reached its end of life on 2026-04-30. Promising it means testing a version that no longer gets security fixes, through the workaround above. Node 22 or newer would let every suite run on every version in the matrix.
