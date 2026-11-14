# 13 — Publishing and releases

## Goal

A release is one merged pull request. The first pre-release of every package is on the registry, and nobody has published from a laptop.

## Why

Four packages (and a Python package from step 15) must be released together with one version number, with a changelog, from a known commit. Done by hand, that is a checklist of twenty commands, and one skipped command publishes a kit that depends on an engine version that does not exist.

## Before you start

- Steps 09, 10, 11 and 12 are done; CI is green including the examples.
- Decisions D2 (licence), D3 (registry) and D4 (visibility before launch) from step 01 are made.

## The decision, once more

**Public npm.** [BLUEPRINT.md §14](../BLUEPRINT.md#14-where-it-is-published-npm-or-github-packages) has the comparison. In short: installing from GitHub Packages needs a GitHub token and an `.npmrc` line even for a public package, GitHub Packages cannot hold an unscoped name such as `builderset`, and MotorsAL's Docker builds would need a token in every build.

Part 7 has the GitHub Packages configuration, for the case where decision D4 keeps the code private until launch.

## The work

### 1. Changesets

```bash
pnpm add -Dw @changesets/cli @changesets/changelog-github
pnpm changeset init
```

`.changeset/config.json`:

```json
{
  "$schema": "https://unpkg.com/@changesets/config/schema.json",
  "changelog": ["@changesets/changelog-github", { "repo": "xhiti/builderset" }],
  "commit": false,
  "fixed": [["@builderset/*", "builderset"]],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "privatePackages": { "version": false, "tag": false }
}
```

- **`fixed`** is what gives every package one version number: when any of them is released, all are, at the same version.
- **`privatePackages`** keeps the examples and the docs app out of releases.

How it is used from now on: a pull request that changes a package includes a changeset file, written with `pnpm changeset` — which packages, patch, minor or major, and one sentence for the changelog written for a user, not for a maintainer. CI fails a pull request that touches `packages/*/src` and has no changeset (`pnpm changeset status --since=origin/main`).

### 2. Make the packages publishable

In each of the four manifests:

- remove `"private": true`;
- check `"publishConfig": { "access": "public" }` — a scoped package is private by default, and without this the first publish fails or asks for a paid plan;
- check `license`, `repository`, `homepage`, `bugs`, `description` and `keywords` are filled;
- copy `LICENSE` into each package folder: the tarball must contain it.

### 3. The release workflow

`.github/workflows/release.yml`:

```yaml
name: Release

on:
  push:
    branches: [main]

concurrency: release

permissions:
  contents: write # the version commit and the tags
  pull-requests: write # the "Version Packages" pull request
  id-token: write # trusted publishing and provenance

jobs:
  release:
    runs-on: ubuntu-latest
    environment: npm
    steps:
      - uses: actions/checkout@v5
      # pnpm and node setup as in ci.yml; registry-url: https://registry.npmjs.org
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: pnpm check:packages
      - uses: changesets/action@v1
        with:
          version: pnpm changeset version
          publish: pnpm changeset publish
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

What it does:

1. When changesets are waiting on `main`, it opens or updates a pull request named "Version Packages" that bumps every version and writes the changelogs.
2. When that pull request is merged, it publishes every package whose version is not yet on the registry and creates the git tags.

So a release is: read the "Version Packages" pull request, merge it.

`pnpm changeset publish` publishes through pnpm, which replaces every `workspace:*` with the real version. Never run `npm publish` inside a package folder: npm does not know the `workspace:` protocol and would publish it as written.

Create the `npm` environment in the repository's settings and require a reviewer for it. The publish step then waits for a person to approve.

On a free personal account, required reviewers on an environment are offered for public repositories. While `xhiti/builderset` is private, the environment still exists and still scopes the trusted publisher and any secret, but nothing pauses the job. The approval is then the merge of the "Version Packages" pull request itself: do not merge it until you mean to release. Add the reviewer rule when the repository becomes public.

### 4. Authentication: trusted publishing

npm can accept a publish from a named GitHub Actions workflow with no stored secret. The workflow proves who it is with a short-lived token that GitHub signs, and the registry attaches a provenance statement: this tarball was built from this commit by this workflow.

Set it up per package on npmjs.com: the package → _Settings_ → _Trusted publisher_ → GitHub Actions, with the repository owner `xhiti`, the repository `builderset`, the workflow file name `release.yml` and the environment `npm`. The owner is the personal GitHub account; it has nothing to do with the npm organisation the packages are published under.

Two things to know:

- **The package must exist before a publisher can be attached to it.** So the very first publish of each new name uses a token: create a granular access token, limited to the `@builderset` scope, write-only, expiring in a day; store it as the `NPM_TOKEN` secret of the `npm` environment; add `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}` to the publish step for that one run. Afterwards configure the trusted publisher for each package, delete the secret and revoke the token. The same applies each time a new kit is published for the first time.
- **It needs a recent npm CLI.** Check npm's trusted-publishing documentation for the minimum version and make the workflow install it. The documentation is also where to confirm the details above; this part of npm has changed more than once.

Then, in the npm organisation's settings on npmjs.com, set each package to require two-factor authentication and **disallow tokens**, so that only the workflow can publish.

### 5. The first pre-release

```bash
pnpm changeset pre enter alpha
pnpm changeset           # "First pre-release", minor, every package
git add .changeset && git commit -m "chore: enter alpha pre-release"
```

Open the pull request, merge it, then merge the "Version Packages" pull request the workflow opens. The result is `0.1.0-alpha.0` of every package, published under the `alpha` tag.

In pre-release mode `changeset publish` uses the mode's name as the tag, so `npm install @builderset/email` installs nothing yet: there is no `latest`. A person must ask for `@builderset/email@alpha`. That is the quiet period decision D4 wanted.

Leave the mode with `pnpm changeset pre exit` at milestone M4, for `0.5.0`.

| Tag      | Meaning                                         | Who uses it            |
| -------- | ----------------------------------------------- | ---------------------- |
| `alpha`  | May break at any time                           | MotorsAL, the examples |
| `beta`   | The stored format only changes with a migration | Early outside users    |
| `latest` | Public, from `0.5.0`                            | Everyone               |

### 6. After the first publish

Check what a user sees:

```bash
npm view @builderset/email@alpha                       # version, dependencies, the dist-tags
npm view @builderset/email@alpha dist.attestations     # the provenance statement
mkdir /tmp/try && cd /tmp/try && npm init -y && npm install @builderset/email@alpha react react-dom
node --input-type=module -e "const m = await import('@builderset/email/render'); console.log(typeof m.renderEmail)"
```

Open each package's page on npmjs.com: the README renders, the provenance badge is shown, the repository link works.

Change `tooling/test-examples.mjs` so that it can also run against the real registry (`--registry https://registry.npmjs.org --tag alpha`), and run it once after every release.

### 7. If the code must stay private: GitHub Packages

Only if decision D4 says so. It is a staging registry; the switch to npm comes at milestone M4.

**With a personal GitHub account this option fits badly.** GitHub Packages takes its scope from the account that owns the repository, so every package would be `@xhiti/email`, `@xhiti/article`, `@xhiti/builderset` — the personal name in every import, which is what the npm organisation exists to avoid — and every import would be rewritten again on the move to npm. If the code must stay unseen before launch, prefer npm pre-releases under the `alpha` tag (part 5): nobody installs them by accident. Use GitHub Packages only if even that is too public.

- GitHub Packages accepts only scoped names, and the scope must be the name of the account that owns the repository: `@xhiti`. The all-in-one package becomes `@xhiti/builderset` during this period and returns to `builderset` on npm.
- In each manifest: `"publishConfig": { "registry": "https://npm.pkg.github.com" }`.
- In the workflow: `registry-url: https://npm.pkg.github.com`, and `NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` with `permissions: packages: write`.
- Every project that installs — MotorsAL's developers, its CI and its Docker builds — needs this `.npmrc` and a token with `read:packages`:

```ini
@xhiti:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

In a Docker build, pass the token as a build secret, never as a build argument: an argument stays in the image's history.

### 8. The rules of a registry

Write these into `CONTRIBUTING.md`.

| Rule                                                                                                   | Why                                                                                              |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| A published version is never changed                                                                   | The registry refuses a second publish of the same version, and users' lockfiles record its hash  |
| A bad release is fixed by the next patch version, then `npm deprecate` on the bad one                  | Unpublishing is only allowed for a short time after publishing and breaks everyone who installed |
| A security fix is released on the latest minor only, before 1.0                                        | One maintainer                                                                                   |
| Every breaking change has a changeset that says what to change                                         | The changelog is the upgrade guide                                                               |
| A change to the stored format has a migration, a fixture of the old version, and a minor bump at least | [BLUEPRINT.md §15](../BLUEPRINT.md#15-versions-and-promises)                                     |
| Nobody publishes by hand                                                                               | The workflow is the only publisher                                                               |

### 9. A release checklist for the "Version Packages" pull request

Add it as the pull request template the action uses:

- [ ] Every package has the same version.
- [ ] The changelog reads correctly for a user.
- [ ] CI is green, the examples job included.
- [ ] If the stored format changed: the migration and the old-version fixture are in this release.
- [ ] If a public prop, entry point or CSS variable changed: the docs and the examples changed in the same release.

## Check

- The "Version Packages" pull request appears after a changeset is merged, and merging it publishes.
- `npm view <package>@alpha version` prints `0.1.0-alpha.0` for the four packages.
- The provenance statement exists for each.
- A fresh folder outside the repository installs `@builderset/email@alpha` and imports `@builderset/email/render` in Node.

## Done when

- [x] Changesets is configured with the fixed group.
- [x] CI fails a package change with no changeset.
- [x] `release.yml` exists; the `npm` environment requires approval. _(GitHub Packages: the `packages` environment; the approval is the merge — see below.)_
- [x] The four packages are published at `0.1.0-alpha.0` under the `alpha` tag. _(The three kits, at `0.1.0-alpha.20261114204535`; the all-in-one package waits for npm.)_
- [x] Trusted publishing is configured for each package; no publish token is stored anywhere; tokens are disallowed for the packages. _(GitHub Packages: no token is stored — the workflow publishes with its own. Trusted publishing comes with the move to npm.)_
- [x] `CONTRIBUTING.md` has the registry rules.
- [x] The examples pass against the real registry. _(Two of three: `next-shadcn` needs the all-in-one package.)_
- [ ] The first release, `0.1.0`, through the "Version packages" pull request on `production`.

**This is milestone M2.**

## Traps

- **Publishing `workspace:*`.** It happens when someone runs `npm publish`. The published manifest then names a dependency version that no registry can resolve, and that version number is spent. Only the workflow publishes.
- **Forgetting `access: public`.** The first publish of a scoped package fails with a payment error. Set it in both the changeset config and each `publishConfig`.
- **A pre-release published as `latest`.** Outside pre-release mode, a version such as `0.1.0-alpha.1` written by hand is published as `latest`. Use `changeset pre enter`; check `npm view <package> dist-tags` after the first release.
- **The token left in place.** After trusted publishing works, the bootstrap token is the only secret that could publish a malicious version. Revoke it the same day.
- **A release with a red examples job.** The workflow runs `check:packages` but not the slow examples job. Do not merge "Version Packages" until the last CI run on `main` is fully green.

## How it was done (2026-11-14)

Decided on 2026-11-14 ([DECISIONS.md](../DECISIONS.md)): GitHub Packages, private until launch (part 7 instead of parts 4–6); `staging` publishes pre-releases and `production` releases; the repository moves to a GitHub organisation named `builderset`, so the packages keep their `@builderset` scope — GitHub Packages names a package after the repository's owner.

| Part | What the plan said                                                         | What was done                                                                                                                                                                                                                                                                                                                                                                                              | Why                                                                                               |
| ---- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1    | Changesets, `fixed: [["@builderset/*", "builderset"]]`, `changelog-github` | Changesets 3.0.3, the four packages named in one fixed group, the examples ignored, `baseBranch: development`, the default changelog. CI runs `changeset status --since=origin/<base>` on every pull request — seen to exit 1 on a package change with no changeset; skipped on the "Version packages" pull request and on the merge of `production` back into `development`, which consume the changesets | GitHub-linked changelogs need the repository at its final address                                 |
| 2    | Remove `private`, `access: public`                                         | The three kits: `private` removed, `publishConfig.registry` is GitHub Packages. `builderset` stays private                                                                                                                                                                                                                                                                                                 | GitHub Packages holds scoped names only; the all-in-one package is published with the move to npm |
| 3    | `release.yml` on `main`                                                    | On `staging`: `changeset version --snapshot alpha` and `changeset publish --tag alpha` — `0.1.0-alpha.<datetime>`, never committed, nothing published when no changeset waits (tried locally). On `production`: `changesets/action`, a "Version packages" pull request, published when merged, then `production` is merged back into `development`. Only when the repository's owner is `builderset`       | Decision on the branches                                                                          |
| 4–6  | Trusted publishing on npm                                                  | Not needed on GitHub Packages: the workflow's own token, `packages: write`                                                                                                                                                                                                                                                                                                                                 | Part 7                                                                                            |
| —    | The `npm` environment requires approval                                    | An environment named `packages`. Required reviewers need a public repository on the free plan; until then the approval is the merge into `staging` or `production`                                                                                                                                                                                                                                         | —                                                                                                 |
| 8, 9 | Registry rules, release checklist                                          | In CONTRIBUTING.md, with how a project installs from GitHub Packages (`.npmrc`, a `read:packages` token, a build secret in Docker)                                                                                                                                                                                                                                                                         | The action writes its own pull request body, so the checklist lives where releases are described  |

**The first pre-release.** The organisation was created and the repository transferred into it; the commits' author email was rewritten at the transfer. `development` was merged into `staging`, and the Release workflow published `@builderset/engine`, `@builderset/email` and `@builderset/article` at `0.1.0-alpha.20261114204535`, tagged `alpha` only — no `latest`, so the trap above did not happen; it also means `npm view <package>` with no tag prints nothing.

**Checks.** `npm view <package>@alpha version` prints `0.1.0-alpha.20261114204535` for the three kits, read with a `read:packages` token. GitHub Packages keeps no provenance statement; it comes with npm. `pnpm test:examples` takes `--from <tag>` now: instead of building and publishing to a local registry, it asks each package's own registry which version the tag names, then installs the examples outside the repository as before. With `--from alpha`, `node-render` passes 11/11 — it installs `@builderset/email@alpha` and imports `@builderset/email/render` in Node — and `vite-react` 10/10 in Chromium. `next-shadcn` is skipped by name: it needs the all-in-one `builderset`, which GitHub Packages cannot hold.

**Still to do.** The first release, `0.1.0`: the organisation allows GitHub Actions to create pull requests (Settings → Actions → General → Workflow permissions); `staging` is merged into `production`; the workflow opens "Version packages"; merging it publishes `0.1.0` under `latest`; `production` is merged back into `development`.
