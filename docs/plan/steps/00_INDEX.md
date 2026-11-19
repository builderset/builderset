# 00 — Index: how to use the steps

Nineteen steps take the builders from six private workspace packages to a published product. Each step is one file with the same layout. Do them in order unless the table says two can run side by side.

Read [BLUEPRINT.md](../BLUEPRINT.md) first: the steps say _how_, the blueprint says _what_ and _why_.

## The steps

| #   | Step                                                                      | Phase | Where    | Size | Needs  | When it is finished                                               |
| --- | ------------------------------------------------------------------------- | ----- | -------- | ---- | ------ | ----------------------------------------------------------------- |
| 01  | [Decisions and accounts](01_DECISIONS_AND_ACCOUNTS.md)                    | A     | —        | S    | —      | `DECISIONS.md` is filled in; the npm organisation exists          |
| 02  | [Regroup the folders](02_REGROUP_FOLDERS.md)                              | A     | MotorsAL | S    | —      | `packages/engine` and `packages/email` replace six packages       |
| 03  | [Split the engine from the article kit](03_SPLIT_ENGINE_FROM_ARTICLE.md)  | A     | MotorsAL | M    | 02     | `packages/article` exists; no casts between document types        |
| 04  | [The editor's own UI kit](04_EDITOR_UI_KIT.md)                            | A     | MotorsAL | L    | 02     | No builder package imports `@motors/ui` or `@motors/i18n`         |
| 05  | [Languages](05_LANGUAGES.md)                                              | A     | MotorsAL | M    | 03     | One file per language; any content language                       |
| 06  | [Move MotorsAL content out](06_PRESETS_OUT.md)                            | A     | MotorsAL | S    | 03     | Nothing about marrimauto.com is left in the three packages        |
| 07  | [Host adapters and the backend contract](07_HOST_AND_BACKEND_CONTRACT.md) | A     | MotorsAL | M    | 03     | `host` entry and helpers; no test writes outside its package      |
| 08  | [The new repository](08_NEW_REPOSITORY.md)                                | B     | New repo | S    | 02–07  | The code, with history, under `@builderset/`, tests green         |
| 09  | [Build and package shape](09_BUILD_AND_PACKAGE_SHAPE.md)                  | B     | New repo | M    | 08     | `dist/` builds; package checks pass                               |
| 10  | [Styles and theming](10_STYLES_AND_THEMING.md)                            | B     | New repo | L    | 09     | Compiled prefixed CSS; light, dark and auto work with no Tailwind |
| 11  | [The all-in-one package](11_ALL_IN_ONE_PACKAGE.md)                        | B     | New repo | S    | 09     | `builderset` builds and re-exports every kit                      |
| 12  | [Example apps and the test matrix](12_EXAMPLES_AND_TEST_MATRIX.md)        | B     | New repo | M    | 10     | Three examples pass in CI from packed tarballs                    |
| 13  | [Publishing and releases](13_PUBLISHING_AND_RELEASES.md)                  | B     | New repo | S    | 11, 12 | The first pre-release is on the registry                          |
| 14  | [Adopt the packages in MotorsAL](14_ADOPT_IN_MOTORSAL.md)                 | C     | MotorsAL | M    | 13     | MotorsAL has no copy of the builders                              |
| 15  | [The Python package](15_PYTHON_PACKAGE.md)                                | C     | Both     | M    | 14     | The API imports `builderset` from PyPI                            |
| 16  | [Docs site and playground](16_DOCS_SITE_AND_PLAYGROUND.md)                | C     | New repo | L    | 13     | A stranger can follow the quick start                             |
| 17  | [The popup builder](17_POPUP_BUILDER.md)                                  | D     | New repo | XL   | 15     | A popup built in the editor runs on marrimauto.com                |
| 18  | [The page builder](18_PAGE_BUILDER.md)                                    | D     | New repo | XL   | 17     | A landing page is published from the portal                       |
| 19  | [Recipe: adding a new builder](19_ADDING_A_NEW_BUILDER.md)                | D     | New repo | —    | 17     | A checklist, used for forms and every later kit                   |

Sizes: S up to 2 days, M 3 to 5 days, L 1 to 2 weeks, XL more. Guesses for one developer who knows the code.

## How each step file is laid out

| Section              | What is in it                                                 |
| -------------------- | ------------------------------------------------------------- |
| **Goal**             | One or two sentences: what is different when the step is done |
| **Why**              | The problem in today's code, with the file that shows it      |
| **Before you start** | What must already be true                                     |
| **The work**         | Numbered instructions, with the commands and the code shapes  |
| **Check**            | The commands and the screens that prove it works              |
| **Done when**        | A checklist. Every box, or the step is not done               |
| **Traps**            | What goes wrong in this step, and how to notice               |

## Rules for every step

1. **One step, one branch, one pull request.** A large step (04, 10) is several pull requests, one per numbered part. Branch names and commit messages follow [docs/development/branching.md](../../development/branching.md).
2. **A step ends green.** The checks below pass before the next step starts. Never carry a red test into the next step "to fix later".
3. **Moves and changes are separate commits.** A commit that moves a file changes nothing in it; the next commit edits it. `git log --follow` then keeps working and a reviewer can read the diff.
4. **No features.** Phases A and B reshape code. A new feature in the same pull request hides regressions.
5. **Behaviour does not change unless the step says so.** The admin's editors look and work the same after every step in phase A.
6. **Fixtures change only when a step says they will.** After every other step, `git status api/` shows nothing.
7. **Docs in the same change.** If a step moves a package, the documents that name it are updated in the same pull request ([docs/README.md](../../README.md#conventions)).
8. **No step in this plan changes the database.** If one seems to need a migration, stop: something has gone beyond the plan.

## What "green" means

### In MotorsAL (steps 02–07, 14, 15)

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test                                   # every package and app
pnpm --filter @motors/admin build
pnpm --filter @motors/web build
```

The API's contract tests — unit tests, no database:

```bash
cd api
uv run pytest tests/unit/test_article_document.py tests/unit/test_email_document.py tests/unit/test_email_render_parity.py
```

Run API tests the way [docs/development/testing.md](../../development/testing.md) describes, never inside the running `api` container.

Then the screens, in the admin:

| Screen                          | Look at                                                                                             |
| ------------------------------- | --------------------------------------------------------------------------------------------------- |
| Content → Articles → edit       | Top bar and its menus, add panel, layers, templates, canvas selection and drag, every inspector tab |
| Content → Emails → edit         | The same, plus email settings, structures, modules, variables, HTML import                          |
| Both                            | Light and dark theme; `sq`, `en`, `de`; desktop, tablet and mobile preview                          |
| The public site: a blog article | The rendered article, light and dark                                                                |

Take screenshots before a step and compare after it. Steps 04 and 10 depend on this.

### In the new repository (steps 08–13, 16–19)

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check:packages                         # publint, are-the-types-wrong, 'use client' lines — added in step 09
pnpm test:examples                          # the example apps from packed tarballs — added in step 12
```

## Names used in the steps

| Name                                                 | Is                                                                  |
| ---------------------------------------------------- | ------------------------------------------------------------------- |
| `builderset`, `@builderset/*`                        | The product's name, chosen on 2026-11-10                            |
| `@motors/engine`, `@motors/article`, `@motors/email` | The packages while they still live in this repository (steps 02–07) |
| `bst:`                                               | The class prefix: `bst:flex`                                        |
| `--builderset-*`                                     | The public CSS variables                                            |
| The admin                                            | `apps/admin`                                                        |
| The site                                             | `apps/web`                                                          |
| The API                                              | `api/`                                                              |

## Progress

Tick a step when every box in its **Done when** list is ticked.

- [ ] 01 Decisions and accounts — D1–D4, D6, D7 and D9 are decided; D5, D8 and the npm and PyPI accounts are open: [DECISIONS.md](../DECISIONS.md)
- [x] 02 Regroup the folders
- [x] 03 Split the engine from the article kit
- [x] 04 The editor's own UI kit
- [x] 05 Languages
- [x] 06 Move MotorsAL content out
- [x] 07 Host adapters and the backend contract
- [x] **M1 — generic**
- [x] 08 The new repository
- [x] 09 Build and package shape
- [x] 10 Styles and theming
- [x] 11 The all-in-one package
- [x] 12 Example apps and the test matrix
- [x] 13 Publishing and releases — every release on GitHub Packages under `latest`, the latest `0.3.0`, with the Python wheel on its GitHub release
- [x] **M2 — installable**
- [x] 14 Adopt the packages in MotorsAL — in production since 2026-11-16, now on `0.3.0`
- [x] 15 The Python package — `builderset` 0.3.0, the wheel on the GitHub release (D9); MotorsAL's API runs on it
- [x] **M3 — MotorsAL runs on it** — 2026-11-19: the editors on `@builderset/*` and the API on `builderset`, both 0.3.0, in production
- [ ] 16 Docs site and playground — built: every page of the tree (guides, the three backend examples, the generated and hand-written reference), the playground, the landing page (`apps/landing`), the repository's files. Left: both Vercel projects connected (docs-builderset, builderset), the backends workflow's first CI run, the stranger test (two developers), then M4
- [ ] **M4 — public**
- [ ] 17 The popup builder
- [ ] **M5 — the engine is proven; release 1.0**
- [ ] 18 The page builder
- [ ] **M6 — pages**
- [ ] 19 Recipe used for the form kit
