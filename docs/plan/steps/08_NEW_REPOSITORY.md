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

- [ ] The repository holds `packages/engine`, `packages/article`, `packages/email` with history.
- [ ] No file contains `@motors/`, and no code or comment names MotorsAL.
- [ ] Lint, type check and tests pass locally and in CI on Node 20, 22 and 24.
- [ ] The secret scan is clean.
- [ ] `LICENSE`, `README.md`, `CONTRIBUTING.md` and `SECURITY.md` exist.
- [ ] Branch protection and secret scanning are on, or, while the repository is private, their replacements from part 6 are in place.
- [ ] MotorsAL's three folders carry the "frozen" README.
- [ ] The plan is in the new repository.

## Traps

- **Running `filter-repo` in the real MotorsAL checkout.** It rewrites history in place. Always a fresh clone, in a different folder.
- **Forgetting the old paths.** History then starts at step 02's move commit and every file looks one commit old.
- **Tests that still reach for `../../api`.** Step 07 removed them; if one is left, it fails here with a missing file. Fix it here and copy the fix to MotorsAL.
- **Different line endings.** MotorsAL is developed on Windows. Add a `.gitattributes` with `* text=auto eol=lf` before the first commit in the new repository, or the fixture comparison tests fail on a Linux runner. The fixture tests already normalise `\r\n` when reading; the committed files should still be LF.
- **Making the repository public "just to test Actions".** Public is not reversible in practice: forks and caches keep the content. Decide it once, at M4.
