# Roadmap

The order of work, why it is in that order, and how to know each part is finished. What is being built is in [BLUEPRINT.md](BLUEPRINT.md); how to do each step is in [steps/](steps/00_INDEX.md).

## The idea behind the order

1. **Change the code where it can be tested for real.** MotorsAL's admin uses both editors every day. The changes that reshape the code (steps 02–07) happen in this repository, with the packages still in the workspace, so every step is checked against the real screens and MotorsAL stays deployable the whole time.
2. **Only then move it.** The new repository (steps 08–13) adds what a product needs and MotorsAL does not: a build, compiled styles, example apps, releases.
3. **Then MotorsAL becomes the first customer** (steps 14–15): it deletes its copies and installs the published packages. If that hurts, an outside developer would be hurt more, and it is fixed before anyone else sees it.
4. **New builders come last** (steps 17–19), smallest first. The popup builder is small and shows whether the engine is truly generic before the page builder, which is the largest piece of all.

## Sizes

Sizes are guesses for one developer who knows the code. They are for ordering the work, not for promising dates.

| Size | Means        |
| ---- | ------------ |
| S    | up to 2 days |
| M    | 3 to 5 days  |
| L    | 1 to 2 weeks |
| XL   | over 2 weeks |

## Phase A — Make it generic (inside MotorsAL)

The packages keep the `@motors/` scope and stay in the workspace. No registry, no build.

| Step                                        | What                                                                                         | Size | Needs |
| ------------------------------------------- | -------------------------------------------------------------------------------------------- | ---- | ----- |
| [01](steps/01_DECISIONS_AND_ACCOUNTS.md)    | Name, licence, registry, accounts                                                            | S    | —     |
| [02](steps/02_REGROUP_FOLDERS.md)           | Six packages become two folders (`engine`, `email`) with `core` / `render` / `editor` inside | S    | —     |
| [03](steps/03_SPLIT_ENGINE_FROM_ARTICLE.md) | `article` leaves the engine; the workspace becomes generic over the document type            | M    | 02    |
| [04](steps/04_EDITOR_UI_KIT.md)             | The editor gets its own UI kit; `@motors/ui` is no longer imported                           | L    | 02    |
| [05](steps/05_LANGUAGES.md)                 | One file per language; any content language; `locale`, `locales`, `contentLocales`           | M    | 03    |
| [06](steps/06_PRESETS_OUT.md)               | MotorsAL's email designs, legacy converter and record facts move into the apps               | S    | 03    |
| [07](steps/07_HOST_AND_BACKEND_CONTRACT.md) | `host` entry, `createRestHost`, `createMemoryHost`; schema and fixtures become package files | M    | 03    |

Steps 04, 05, 06 and 07 touch different files and can be done in any order after 03. Step 04 is the long one; start it early.

**Milestone M1 — generic.** All of these are true:

- `packages/engine`, `packages/article` and `packages/email` import nothing from `@motors/*` except each other.
- The admin's article and email editors look and behave as before, in light and dark, in `sq`, `en` and `de`.
- `pnpm lint`, `pnpm typecheck` and `pnpm test` pass; the API's contract tests pass; no fixture changed except where a step says it must.

**Checked 2026-11-11, on `builderset` after step 07.** The three packages import no `@motors/*` package but each other (the kits depend on the engine alone). Both editors were captured with Playwright from builds of `0a33e2a` (before step 02) and of step 07, against one scratch database: the first view of each editor in light and dark × `sq`, `en`, `de`, and in English the document settings tabs, the left panels, a block's inspector tabs and the publish menu — 52 screens. 45 are pixel-identical. Of the other seven, two are changes the steps made on purpose (the search preview reads the site's address from the settings, step 06; the email inspector's two neutral hints, step 05) and the rest are an animated sparkle caught at a different moment. The public article page (its preview route, light and dark, `sq` and `en`, desktop and phone) is identical in all eight captures. The workspace's 45 tasks, the API's 709 unit tests and the contract tests pass.

## Phase B — Make it a product (new repository)

| Step                                       | What                                                                                     | Size | Needs  |
| ------------------------------------------ | ---------------------------------------------------------------------------------------- | ---- | ------ |
| [08](steps/08_NEW_REPOSITORY.md)           | New repository with the three packages and their history; scope renamed to `@builderset` | S    | M1     |
| [09](steps/09_BUILD_AND_PACKAGE_SHAPE.md)  | Build to `dist/`, entry points, `'use client'` kept, package checks                      | M    | 08     |
| [10](steps/10_STYLES_AND_THEMING.md)       | Prefixed classes, compiled CSS, `--builderset-*` variables, light / dark / auto, portals | L    | 09     |
| [11](steps/11_ALL_IN_ONE_PACKAGE.md)       | The `builderset` package                                                                 | S    | 09     |
| [12](steps/12_EXAMPLES_AND_TEST_MATRIX.md) | Three example apps installed from tarballs; browser tests in CI                          | M    | 10     |
| [13](steps/13_PUBLISHING_AND_RELEASES.md)  | Changesets, release workflow, first pre-release                                          | S    | 11, 12 |

**Milestone M2 — installable.** All of these are true:

- `0.1.0-alpha.1` of every package is on the registry.
- A Vite app with no Tailwind and no Next runs both editors from the packed tarballs.
- A Next app with shadcn tokens and a dark-mode switch shows the editors following the theme with no configuration beyond one CSS import.
- A plain Node script renders an email with `@builderset/email/render`.

## Phase C — Adopt and document

| Step                                       | What                                                                             | Size | Needs |
| ------------------------------------------ | -------------------------------------------------------------------------------- | ---- | ----- |
| [14](steps/14_ADOPT_IN_MOTORSAL.md)        | MotorsAL installs the packages and deletes `packages/engine`, `article`, `email` | M    | M2    |
| [15](steps/15_PYTHON_PACKAGE.md)           | The API's validation and email rendering become the `builderset` PyPI package    | M    | 14    |
| [16](steps/16_DOCS_SITE_AND_PLAYGROUND.md) | Docs site, live playground, guides                                               | L    | M2    |

Step 16 does not depend on 14 or 15 and can run beside them.

**Milestone M3 — MotorsAL runs on it.** Staging and production build from the published packages; the API renders emails with the PyPI package; the golden tests pass in the new repository for both languages.

**Before M4: dates and numbers in any language.** Both email renderers format `{{ x | date }}`, `| money` and `| number` in three languages — `sq`, `en`, `de`, every other one as English — and in the `Europe/Tirane` time zone: MotorsAL's settings, still built in. A public package needs the locale as given and a time-zone option, in both renderers in the same pull request, with golden cases in more languages and the differences between `Intl` and the Python side written down (found in step 15, part 3).

**Milestone M4 — public.** The docs site is live, the playground works, the README of every package is complete, the licence is in place, and a developer who has never seen the code can add the email editor to a Next app by following the quick start. Release `0.5.0` under the `latest` tag.

## Phase D — Grow

| Step                                   | What                                                                        | Size | Needs |
| -------------------------------------- | --------------------------------------------------------------------------- | ---- | ----- |
| [17](steps/17_POPUP_BUILDER.md)        | `@builderset/popup`: elements, trigger and targeting rules, a small runtime | XL   | M3    |
| [18](steps/18_PAGE_BUILDER.md)         | `@builderset/page`: sections, site theme, global parts, data binding        | XL   | 17    |
| [19](steps/19_ADDING_A_NEW_BUILDER.md) | The recipe every later kit follows (forms first)                            | —    | 17    |

**Milestone M5 — the engine is proven.** The popup kit is in use on marrimauto.com, and building it needed no change to the engine that broke the email or article kits. If it did need such changes, they are made now. **Release 1.0 after this milestone, not before**: a third kit is the test of the engine's API, and 1.0 is the promise not to break it.

**Milestone M6 — pages.** A single landing page built in the page kit is published from the portal.

## The order as a picture

```
01 ─► 02 ─► 03 ─┬─► 04 ─┐
                ├─► 05 ─┤
                ├─► 06 ─┼─► M1 ─► 08 ─► 09 ─┬─► 10 ─► 12 ─┐
                └─► 07 ─┘                   └─► 11 ───────┴─► 13 ─► M2 ─┬─► 14 ─► 15 ─► M3 ─┐
                                                                        └─► 16 ─────────────┴─► M4 ─► 17 ─► M5 (1.0) ─► 18 ─► M6
```

## Version plan

| Version         | When            | Tag      | Promise                                                                                        |
| --------------- | --------------- | -------- | ---------------------------------------------------------------------------------------------- |
| `0.1.0-alpha.N` | M2              | `alpha`  | None. For MotorsAL and the example apps                                                        |
| `0.2.0-beta.N`  | M3              | `beta`   | The stored format only changes with a migration                                                |
| `0.5.0`         | M4              | `latest` | Public. The API may still change between minor versions                                        |
| `0.6` – `0.9`   | Popup kit work  | `latest` | Engine API changes the popup kit forces                                                        |
| `1.0.0`         | M5              | `latest` | Semantic versioning; the promises in [BLUEPRINT.md §15](BLUEPRINT.md#15-versions-and-promises) |
| `1.x`           | Page kit, forms | `latest` | New kits are new minor versions                                                                |

## Risks

| Risk                                                                                   | What reduces it                                                                                                                                                              |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **The UI-kit rewrite changes how the editors look or behave** (step 04)                | Replace one component family per pull request. Compare screenshots of both editors before and after each. The existing editor tests must pass untouched.                     |
| **A class is missed when prefixing** (step 10) and an element silently loses its style | The codemod asks Tailwind which strings are real classes instead of guessing. A test fails on any unprefixed class. The example apps have no Tailwind, so a miss is visible. |
| **The stored format gets locked in while it still has article-only assumptions**       | The format is reviewed in step 03, before anything is published. Nothing is published as `latest` before M4.                                                                 |
| **TypeScript and Python renderers drift apart**                                        | Both live in one repository from step 15, read the same golden fixtures, and are released under one version number.                                                          |
| **The page builder swallows everything**                                               | It is last, after 1.0, and split into five milestones of its own in [step 18](steps/18_PAGE_BUILDER.md).                                                                     |
| **One maintainer, a public package**                                                   | Go public at M4 only with the docs done. Keep the public surface small: few entry points, sixteen CSS variables, a short props table.                                        |
| **The `@builderset` scope turns out to be unavailable**                                | The unscoped npm name and PyPI are free, but a scope is only proven by creating the organisation. Step 01 does that before any code is renamed.                              |
| **MotorsAL is blocked on a package release during normal work**                        | Until step 14 MotorsAL uses its workspace copies and depends on nothing external. After it, a fix is released as a patch version within the hour by the release workflow.    |

## What not to do

- **Do not start with the page builder.** It is the most exciting and the most likely to never finish. Every earlier step makes it smaller.
- **Do not publish before the styles step.** A package that needs the parent to run Tailwind over it is not a product, and first impressions are hard to undo.
- **Do not build a backend package.** Ship the contract, the helpers and examples ([BLUEPRINT.md §11](BLUEPRINT.md#11-backend)).
- **Do not add features during phases A and B.** They are moves and reshaping. A new feature in the same pull request hides regressions.
- **Do not rename things twice.** The `@motors/` → `@builderset/` rename happens once, in step 08, by search and replace.
- **Do not keep two copies alive.** From step 14 the packages exist only in the new repository.

## After 1.0

The catalogue is in [FEATURES.md](FEATURES.md). The first candidates, by value for effort:

1. Content types for the article kit — news, job posts, case studies — as configuration, not new kits.
2. The form kit, which the popup and page kits both need.
3. AI assistance in the engine: write, rewrite, translate.
4. Email client previews and a pre-send checklist.
5. The hosted backend for the portal.
