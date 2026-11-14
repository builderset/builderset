# 14 — Adopt the packages in MotorsAL

## Goal

MotorsAL installs the builders from the registry like any other project. `packages/engine`, `packages/article` and `packages/email` are deleted from this repository.

## Why

- Two copies of the same code drift. The freeze from step 08 only holds for a few weeks.
- MotorsAL is the first real user. Whatever is awkward here — a missing export, a theme that does not match, a slow install — is fixed before a stranger meets it.
- It removes about 33,000 lines from this repository, with their build time and their tests.

## Before you start

- Milestone M2: `0.1.0-alpha.N` of every package is published and the examples pass against the real registry.
- Any urgent fix made in MotorsAL's frozen copies since step 08 has been ported to the new repository and released. List them in this step's pull request.
- Screenshots of both editors and a blog article from the current production build, light and dark, in `sq`, `en` and `de`.

## The work

Do this on a branch that is deployed to staging and used for a few days before it reaches production.

### 1. Let pnpm install a fresh release

MotorsAL's pnpm refuses packages published very recently; [pnpm-workspace.yaml](../../../pnpm-workspace.yaml) already lists exceptions under `minimumReleaseAgeExclude`. Add the product's packages, or a fix released in the morning cannot be installed until the next day:

```yaml
minimumReleaseAgeExclude:
  - '@builderset/*'
  - builderset
  # … the existing entries
```

Check pnpm's documentation for whether a pattern is accepted in the installed version; if not, list the four names. This is safe for these packages specifically because they are published only by the release workflow, with provenance.

### 2. Install

```bash
pnpm --filter @motors/admin add @builderset/email@alpha @builderset/article@alpha
pnpm --filter @motors/web   add @builderset/article@alpha
pnpm --filter @motors/builder-presets add @builderset/email@alpha @builderset/article@alpha
```

Install the kits separately, not `builderset`: the site needs only the article renderer and should not download the editors' dependencies.

Pin the exact version in each `package.json` while the packages are in alpha (`"0.1.0-alpha.3"`, no caret). [docs/VERSIONS.md](../../VERSIONS.md) records pinned versions; add these.

### 3. Rewrite the imports

| From                     | To                           |
| ------------------------ | ---------------------------- |
| `@motors/engine`         | `@builderset/engine`         |
| `@motors/engine/editor`  | `@builderset/engine/editor`  |
| `@motors/article`        | `@builderset/article`        |
| `@motors/article/render` | `@builderset/article/render` |
| `@motors/article/editor` | `@builderset/article/editor` |
| `@motors/email`          | `@builderset/email`          |
| `@motors/email/render`   | `@builderset/email/render`   |
| `@motors/email/editor`   | `@builderset/email/editor`   |

Where the apps import from the engine only for types or the host (`BuilderHost`, `SaveResult`), import from the kit (`@builderset/email/host`) and drop the direct engine dependency.

### 4. Remove what the workspace copies needed

| File                                                                      | Remove                                                                      |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| [apps/admin/next.config.ts](../../../apps/admin/next.config.ts)           | The three names from `transpilePackages`. The packages are compiled already |
| [apps/admin/src/app/globals.css](../../../apps/admin/src/app/globals.css) | The `@source` lines for the builder packages                                |
| [apps/web/src/app/globals.css](../../../apps/web/src/app/globals.css)     | The same                                                                    |
| `apps/admin/package.json`, `apps/web/package.json`                        | The `workspace:*` dependencies on the three packages                        |

### 5. Styles and theme

Import the compiled stylesheets where the editors and the article are rendered:

```ts
// apps/admin: the builder layout, src/app/(builder)/layout.tsx
import '@builderset/email/styles.css';
import '@builderset/article/styles.css';

// apps/web: the blog layout
import '@builderset/article/content.css';
```

Then give the product MotorsAL's look. The admin's tokens are complete colours and already have the shadcn names (`--background`, `--primary`, `--border`…), so start from the preset and add what differs, in the admin's `globals.css`:

```css
@import '@builderset/engine/theme/shadcn.css';

.builderset {
  --builderset-radius: var(--radius-control);
  --builderset-success: var(--ok);
  --builderset-warning: var(--warn);
  --builderset-font: var(--font-sans);
}
```

Pass `theme="auto"` to both editors. The admin sets `data-theme` on `<html>` ([packages/tokens/src/theme.css](../../../packages/tokens/src/theme.css)), which is one of the two markers `auto` follows.

On the site, `ArticleRenderer` follows the site's theme by default; map the same variables in the site's stylesheet.

Compare with the screenshots. Differences are expected in exactly one place: colours that were MotorsAL tokens with no public equivalent and are now derived. If one matters, set the variable; if a variable is missing for something that should be themeable, that is a finding for the product — open an issue there, do not patch around it here.

### 6. Language

The admin now passes what the host used to carry (step 05):

```tsx
import de from '@builderset/email/locales/de';
import sq from '@builderset/email/locales/sq';

<EmailEditor locale={locale} locales={{ sq, de }} contentLocales={['sq', 'en', 'de']} … />
```

### 7. The contract files

`scripts/sync-builder-contract.mjs` (step 07) copied the schema and fixtures from `packages/…`. Change its "from" column to the installed packages:

| From                                                          | To                                                |
| ------------------------------------------------------------- | ------------------------------------------------- |
| `node_modules/@builderset/article/schema/article.schema.json` | `api/app/domains/content/builder_schema.json`     |
| `node_modules/@builderset/article/fixtures/`                  | `api/tests/fixtures/builder/`                     |
| `node_modules/@builderset/email/schema/email.schema.json`     | `api/app/domains/email_builder/email_schema.json` |
| `node_modules/@builderset/email/fixtures/`                    | `api/tests/fixtures/email/` and `…/golden/kit/`   |

Resolve the paths through the package (`import.meta.resolve('@builderset/email/schema.json')`), not by a hard-coded `node_modules` path: pnpm's layout is not flat.

Upgrading the packages is now three commands, and CI's `--check` fails if the second is forgotten:

```bash
pnpm up "@builderset/*"
node scripts/sync-builder-contract.mjs
cd api && uv run pytest tests/unit/test_article_document.py tests/unit/test_email_document.py tests/unit/test_email_render_parity.py
```

If the parity test fails after an upgrade, the TypeScript renderer changed and the Python port in `api/` has not followed. That manual port is what step 15 removes.

`packages/builder-presets` stays, with its golden test for MotorsAL's designs. It now imports from `@builderset/email`.

### 8. Delete the copies

```bash
git rm -r packages/engine packages/article packages/email
pnpm install
```

Search for anything left:

```bash
git grep -nE "@motors/(engine|article|email)" -- . ':!docs'
git grep -nE "packages/(engine|article|email)\b" -- . ':!docs'
```

### 9. The deploy

MotorsAL deploys by building Docker images on a push ([docs/deployment/docker.md](../../deployment/docker.md)).

- **With public npm**, nothing changes: the image build installs the packages like any other dependency.
- **With GitHub Packages** (step 13, part 7), every build needs a token. Add an `.npmrc` with the scope's registry, pass the token to `docker build` as a secret mount, and add the secret to the deploy workflow. Remove all of it when the packages move to npm.

Deploy the branch to staging first and use both editors there before production.

### 10. Documents

- [docs/architecture/monorepo.md](../../architecture/monorepo.md): the builders are external packages; the package graph loses three nodes.
- [docs/VERSIONS.md](../../VERSIONS.md): the new pins.
- [docs/backend/email.md](../../backend/email.md): where the email renderer and its contract come from.
- [docs/development/troubleshooting.md](../../development/troubleshooting.md): "the parity test fails after upgrading `@builderset/*`" → run the sync, port the renderer change.
- A new ADR: the builders are consumed as packages from the registry; how to upgrade; where to report a bug.

## Check

```bash
pnpm install --frozen-lockfile
pnpm lint && pnpm typecheck && pnpm test
pnpm --filter @motors/admin build && pnpm --filter @motors/web build
node scripts/sync-builder-contract.mjs --check
```

The API's three contract tests pass.

On staging, against the screenshots:

| Screen                               | Expect                                                                              |
| ------------------------------------ | ----------------------------------------------------------------------------------- |
| Article editor                       | The same layout and behaviour; MotorsAL's colours; follows the admin's theme switch |
| Email editor                         | The same                                                                            |
| Both, in `sq`, `en` and `de`         | Fully translated                                                                    |
| An existing article and template     | Open, edit, save, publish, reopen                                                   |
| A multi-language article             | Every language still there                                                          |
| A published blog article on the site | Identical to production, light and dark                                             |
| A real email sent from staging       | Identical to one sent before the change                                             |
| The rest of the admin                | Unchanged: the product's stylesheet did not touch it                                |

Compare the size of the admin's builder routes before and after (`next build` prints it). It should not grow.

## Done when

- [ ] `packages/` has no `engine`, `article` or `email` folder.
- [ ] No file outside `docs/` names `@motors/engine`, `@motors/article` or `@motors/email`.
- [ ] `transpilePackages` and the `@source` lines no longer list the builders.
- [ ] The admin and the site import the compiled stylesheets and map MotorsAL's tokens.
- [ ] The sync script reads from the installed packages and its check runs in CI.
- [ ] Lint, type check, tests, both builds and the API's contract tests pass.
- [ ] Staging matches the screenshots in all eight rows.
- [ ] Production is deployed from this branch.
- [ ] The documents and the ADR are updated.

## Traps

- **Stored documents.** Nothing in this step changes the stored format, so no document needs converting. If an existing article or template fails to open, the published package differs from the frozen copy in a way that was not intended. Stop and compare; do not migrate data to make it work.
- **Two Radix versions.** The admin's `@motors/ui` and the product's UI kit each depend on Radix. If the versions differ, a dialog of the admin and a menu inside the editor disagree about focus and scroll locking. Align them — the admin's Radix versions to the range the product declares — and check the leave-guard dialog over the editor.
- **Two Tailwind outputs on one page.** The admin's Tailwind and the product's compiled CSS are both loaded. They cannot collide by design (prefix, no layers); if something does change in the admin outside the editors, it is a product bug, and the "parent is not disturbed" test in step 12 needs a new case.
- **The freshly published version is refused.** That is `minimumReleaseAge` (part 1).
- **Fixing a builder bug in MotorsAL.** There is no code here to fix any more. The fix goes to the product's repository and comes back as a version. For an emergency, pnpm's `patch` command can carry a small fix in MotorsAL until the release; remove the patch when the version arrives.
