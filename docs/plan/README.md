# Builder packages — from MotorsAL code to an installable product

The article builder and the email builder in this repository are good enough to be used in other projects. This folder is the plan for turning them into a standalone product: one engine, one package per builder (email, article, later popup, page, form), installable from npm into any React or Next.js project, taking its colours, fonts, theme mode and language from the project it is placed in.

**Status: plan only.** Nothing under `packages/` has been changed by these documents.

> **The name is Builderset**, chosen on 2026-11-10: a set of builders. It gives the npm scope `@builderset`, the all-in-one package `builderset`, the PyPI package `builderset`, the CSS variables `--builderset-*` and the class prefix `bst:`.
>
> **Where it lives.** The code is in the owner's personal GitHub account, `github.com/xhiti/builderset`. The packages are published under an npm organisation, `@builderset`, so no package name carries a personal name.
>
> Checked that day: the npm name, the PyPI name and the GitHub name are free, and no public npm package uses `@builderset` as a scope. Still to confirm in [steps/01_DECISIONS_AND_ACCOUNTS.md](steps/01_DECISIONS_AND_ACCOUNTS.md): the scope itself (by creating the npm organisation), the domain and a trademark search.

## The answers in short

| Question                                | Answer                                                                                                                                                                                                                                           |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| One package or many?                    | Both. One repository, one package per builder (`@builderset/email`, `@builderset/article`, …) on a shared `@builderset/engine`, plus `builderset`, an all-in-one package that contains them all. A developer installs one builder or everything. |
| Where are they published?               | **The public npm registry.** GitHub Packages only as a private staging registry before launch, if at all. Reasons in [BLUEPRINT.md §14](BLUEPRINT.md#14-where-it-is-published-npm-or-github-packages).                                           |
| Who owns the database and the API?      | The project that installs the builder. The product ships the document format (JSON + JSON Schema), server-side validation and rendering, and example backends. It never ships tables or routes.                                                  |
| How does it take the parent's look?     | CSS variables with built-in fallbacks. Nothing set: light theme, built-in look. `theme="auto"` follows the parent's dark mode. One optional CSS file maps shadcn-style tokens automatically.                                                     |
| How does it take the parent's language? | A `locale` prop, English by default. Other languages are separate imports. One content language by default; pass a list to switch multi-language writing on.                                                                                     |
| Does the parent project need Tailwind?  | No. Each package ships a compiled stylesheet with prefixed classes, so it works without Tailwind and cannot collide with a parent that uses it.                                                                                                  |
| Where does the work start?              | Inside this repository, where the admin is the test bed, and only then in a new repository. Order in [ROADMAP.md](ROADMAP.md).                                                                                                                   |

## Read in this order

| Document                                         | What it is                                                                                                                   |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| **[BLUEPRINT.md](BLUEPRINT.md)**                 | The target: repository layout, packages and entry points, public API, theme and language, backend, styles, build, publishing |
| **[ROADMAP.md](ROADMAP.md)**                     | The order of work: four phases, six milestones, sizes, risks, version plan                                                   |
| **[FEATURES.md](FEATURES.md)**                   | What each builder does today and what can be added later: the feature catalogue, with priority and size                      |
| **[INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)** | Moved to the docs site's guides (step 16); the file maps each old section to its page                                        |
| **[steps/](steps/00_INDEX.md)**                  | Nineteen step files with exact instructions, one per piece of work. Start at [00_INDEX.md](steps/00_INDEX.md)                |

**What is done now and what is later.** Steps 01–16 are the product: extraction, packaging, publishing, adoption, documentation. Steps 17–19 and everything in [FEATURES.md](FEATURES.md) are later work, in the order [ROADMAP.md](ROADMAP.md#after-10) gives.

**File names.** Every Markdown file in this folder is upper case with underscores, and step files start with their two-digit number: `07_HOST_AND_BACKEND_CONTRACT.md`. New files follow the same rule.

## The steps

| #   | Step                                                                            | Where    |
| --- | ------------------------------------------------------------------------------- | -------- |
| 00  | [Index: how to use the steps](steps/00_INDEX.md)                                | —        |
| 01  | [Decisions and accounts](steps/01_DECISIONS_AND_ACCOUNTS.md)                    | —        |
| 02  | [Regroup the folders](steps/02_REGROUP_FOLDERS.md)                              | MotorsAL |
| 03  | [Split the engine from the article kit](steps/03_SPLIT_ENGINE_FROM_ARTICLE.md)  | MotorsAL |
| 04  | [The editor's own UI kit](steps/04_EDITOR_UI_KIT.md)                            | MotorsAL |
| 05  | [Languages](steps/05_LANGUAGES.md)                                              | MotorsAL |
| 06  | [Move MotorsAL content out](steps/06_PRESETS_OUT.md)                            | MotorsAL |
| 07  | [Host adapters and the backend contract](steps/07_HOST_AND_BACKEND_CONTRACT.md) | MotorsAL |
| 08  | [The new repository](steps/08_NEW_REPOSITORY.md)                                | New repo |
| 09  | [Build and package shape](steps/09_BUILD_AND_PACKAGE_SHAPE.md)                  | New repo |
| 10  | [Styles and theming](steps/10_STYLES_AND_THEMING.md)                            | New repo |
| 11  | [The all-in-one package](steps/11_ALL_IN_ONE_PACKAGE.md)                        | New repo |
| 12  | [Example apps and the test matrix](steps/12_EXAMPLES_AND_TEST_MATRIX.md)        | New repo |
| 13  | [Publishing and releases](steps/13_PUBLISHING_AND_RELEASES.md)                  | New repo |
| 14  | [Adopt the packages in MotorsAL](steps/14_ADOPT_IN_MOTORSAL.md)                 | MotorsAL |
| 15  | [The Python package](steps/15_PYTHON_PACKAGE.md)                                | Both     |
| 16  | [Docs site and playground](steps/16_DOCS_SITE_AND_PLAYGROUND.md)                | New repo |
| 17  | [The popup builder](steps/17_POPUP_BUILDER.md)                                  | New repo |
| 18  | [The page builder](steps/18_PAGE_BUILDER.md)                                    | New repo |
| 19  | [Recipe: adding a new builder](steps/19_ADDING_A_NEW_BUILDER.md)                | New repo |

## Where the code is today

Three workspace packages since step 03: `@motors/engine`, `@motors/article` and `@motors/email`, all private, all exporting raw TypeScript; since step 06 nothing in them is about marrimauto.com, and MotorsAL's own designs are in `@motors/builder-presets`, which never leaves this repository ([ADR 0010](../architecture/decisions/0010-builders-as-engine-and-kits.md)). The engine imports no kit, and a kit imports no other kit; an ESLint rule in [packages/config](../../packages/config/eslint.config.js) enforces it. Line counts are `src` with tests.

| Folder                                                              | Entry                     | Lines  | What it holds                                                                                                                             |
| ------------------------------------------------------------------- | ------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| [packages/engine/src/core](../../packages/engine/src/core/)         | `@motors/engine`          | 2,357  | Node tree, element registry, operations with undo, structural checks, reading and migrating                                               |
| [packages/engine/src/host](../../packages/engine/src/host/)         | `@motors/engine/host`     | 1,194  | `BuilderHost`, `createMemoryHost`, `createRestHost`, and what a backend must do ([BACKEND.md](../../packages/engine/src/host/BACKEND.md)) |
| [packages/engine/src/editor](../../packages/engine/src/editor/)     | `@motors/engine/editor`   | 11,262 | The workspace, generic over the document: canvas, panels, inspector, top bar, autosave                                                    |
| [packages/article/src/core](../../packages/article/src/core/)       | `@motors/article`         | 4,346  | Article document and meta, the article elements, checks, parsing, schema, importers                                                       |
| [packages/article/src/render](../../packages/article/src/render/)   | `@motors/article/render`  | 4,325  | Article document → React, safe in Server Components                                                                                       |
| [packages/article/src/editor](../../packages/article/src/editor/)   | `@motors/article/editor`  | 1,369  | The article editor: profile, document settings, title field, templates                                                                    |
| [packages/email/src/core](../../packages/email/src/core/)           | `@motors/email`           | 3,400  | Email document, blocks, variables, fonts, outlines for sample emails                                                                      |
| [packages/email/src/render](../../packages/email/src/render/)       | `@motors/email/render`    | 1,800  | Email document → HTML and plain text                                                                                                      |
| [packages/email/src/editor](../../packages/email/src/editor/)       | `@motors/email/editor`    | 2,619  | The email editor: the workspace with the email profile, and the canvas view                                                               |
| [packages/builder-presets/src](../../packages/builder-presets/src/) | `@motors/builder-presets` | 3,887  | MotorsAL's own: ten email designs in its colours, the legacy article converter. Stays here                                                |

Each kit's tests write its contract (`schema/`, `fixtures/`, and the email's golden cases) inside the package only; `scripts/sync-builder-contract.mjs` copies them into the API, and CI checks the copies with `--check`. On the server, the API validates both document kinds and renders emails with a Python port of the TypeScript renderer: [api/app/domains/email_builder/](../../api/app/domains/email_builder/) and [api/app/domains/content/document.py](../../api/app/domains/content/document.py).

## Rules for these documents

They follow this repository's documentation rules ([docs/README.md](../README.md#conventions)): claims about today's code name the file, and a step that changes behaviour updates the documents in the same change. When a decision in the blueprint changes, change the blueprint first, then the step that depends on it.
