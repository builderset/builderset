# 02 — Regroup the folders

## Goal

Six packages become two folders, each with `core`, `render` and `editor` inside. Files move; nothing in them changes except import paths.

```
before                               after
──────                               ─────
packages/builder-core                packages/engine      @motors/engine
packages/builder-render                ├─ src/core        ← builder-core
packages/builder-react                 ├─ src/render      ← builder-render   (leaves in step 03)
packages/email-core                    └─ src/editor      ← builder-react
packages/email-render                packages/email       @motors/email
packages/email-react                   ├─ src/core        ← email-core
                                       ├─ src/render      ← email-render (HTML and text)
                                       └─ src/editor      ← email-react, and email-render's canvas
```

## Why

Each builder is three top-level packages today. A third builder would make nine folders, and nothing in the folder names says which three belong together. One folder per builder with the same three sub-folders is the shape of the product ([BLUEPRINT.md §4](../BLUEPRINT.md#4-the-repository)), and doing the move first means every later step edits files that are already where they will stay.

The article renderer goes into `engine` for now. The workspace imports it (`canvas/canvas.tsx`, `profile.ts`, `text/inline-text.tsx`), so a separate `article` package today would import the engine and be imported by it. Turborepo refuses a dependency cycle. Step 03 cuts that tie and creates `packages/article`.

## Before you start

- A clean working tree on a new branch.
- Screenshots of both editors and one blog article, light and dark ([00_INDEX.md](00_INDEX.md#what-green-means)).

## The work

### 1. Move the files

Use `git mv` so history follows. Run from the repository root.

```bash
mkdir -p packages/engine/src packages/email/src/editor

# engine
git mv packages/builder-core/src      packages/engine/src/core
git mv packages/builder-render/src    packages/engine/src/render
git mv packages/builder-react/src     packages/engine/src/editor
git mv packages/builder-core/schema   packages/engine/schema
git mv packages/builder-core/fixtures packages/engine/fixtures
git mv packages/builder-render/scripts packages/engine/scripts

# email
git mv packages/email-core/src        packages/email/src/core
git mv packages/email-core/schema     packages/email/schema
git mv packages/email-core/fixtures   packages/email/fixtures
git mv packages/email-render/src      packages/email/src/render
git mv packages/email-react/src/*     packages/email/src/editor/

# the canvas is a React view for the editor, not part of HTML rendering
git mv packages/email/src/render/canvas.tsx         packages/email/src/editor/canvas.tsx
git mv packages/email/src/render/render.test.tsx    packages/email/src/editor/canvas.test.tsx
git mv packages/email/src/render/use-stylesheet.ts  packages/email/src/editor/use-stylesheet.ts
```

Then by hand:

- **READMEs.** `builder-core`, `builder-render` and `builder-react` each have one. Move them to `packages/engine/src/core/README.md`, `…/render/README.md`, `…/editor/README.md`. They are merged into one package README in step 09.
- **CHANGELOGs.** Join the three into `packages/engine/CHANGELOG.md`, newest first.
- **Test setup files.** `render` and `editor` each have a `test-setup.ts`. Keep both where they are and list both in the new `vitest.config.ts` (part 2).
- **Commit now**, before any edit: `refactor(builders): move the builder packages into engine and email`. The commit has only renames.

Confirm `packages/email/src/render/html.ts` and `context.ts` import nothing from `react`. They should not; if one does, that import belongs in the editor.

### 2. Write the two package manifests

Delete the six old `package.json`, `tsconfig.json` and `vitest.config.ts` files and write these.

`packages/engine/package.json`:

```json
{
  "name": "@motors/engine",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "sideEffects": false,
  "exports": {
    ".": "./src/core/index.ts",
    "./render": "./src/render/index.ts",
    "./editor": "./src/editor/index.ts",
    "./schema/document.schema.json": "./schema/document.schema.json"
  },
  "scripts": {
    "lint": "eslint src",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "fixtures": "vitest run src/core/fixtures.test.ts"
  }
}
```

- `dependencies`: the union of the three old packages' dependencies, minus `@motors/builder-core` and `@motors/builder-render`. Keep every version exactly as it was.
- `peerDependencies`: `react` and `react-dom` `^19`.
- `devDependencies`: the union.

`packages/email/package.json`: the same shape, `"name": "@motors/email"`, the schema export `"./schema/email.schema.json"`, and one workspace dependency, `"@motors/engine": "workspace:*"`, in place of the four `builder-*` and `email-*` ones.

One `tsconfig.json` per package, copied from an old one (`"extends": "@motors/config/tsconfig/library"`, `"include": ["src"]`).

One `vitest.config.ts` per package. The old React packages used `jsdom` with a setup file; use that for the whole package:

```ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./src/render/test-setup.ts', './src/editor/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
```

### 3. Rewrite the imports

| Old import               | From another package    | From inside the same package |
| ------------------------ | ----------------------- | ---------------------------- |
| `@motors/builder-core`   | `@motors/engine`        | a relative path to `core`    |
| `@motors/builder-render` | `@motors/engine/render` | a relative path to `render`  |
| `@motors/builder-react`  | `@motors/engine/editor` | a relative path to `editor`  |
| `@motors/email-core`     | `@motors/email`         | a relative path to `core`    |
| `@motors/email-render`   | `@motors/email/render`  | a relative path to `render`  |
| `@motors/email-react`    | `@motors/email/editor`  | —                            |

Inside a package use relative paths to the folder (`../core`, `../../core`), never the package's own name. A file in `src/editor/canvas/` reaches the core with `../../core`.

One import does not follow the table: `EmailCanvas`, `EmailCanvasProps` and `EditableField` came from `@motors/email-render` and now come from `@motors/email/editor`. Remove them from `src/render/index.ts` and export them from `src/editor/index.ts`.

Do the rewrite with search and replace or a throw-away script. The type checker finds every miss, so there is no need to be clever.

### 4. Update what points at the old folders

| File                                                                                                                 | Change                                                                                                                                                                                                                                                                   |
| -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [apps/admin/package.json](../../../apps/admin/package.json), [apps/web/package.json](../../../apps/web/package.json) | Replace the six workspace dependencies with `@motors/engine` and, in the admin, `@motors/email`                                                                                                                                                                          |
| [apps/admin/next.config.ts](../../../apps/admin/next.config.ts) lines 37–42                                          | `transpilePackages`: replace the six names with `'@motors/engine', '@motors/email'`                                                                                                                                                                                      |
| [apps/admin/src/app/globals.css](../../../apps/admin/src/app/globals.css) lines 14–16                                | `@source` the folders scanned before, no more: `packages/engine/src/render`, `packages/engine/src/editor`, `packages/email/src/editor`. Scanning whole packages would add the cores' strings to the stylesheet                                                           |
| [apps/web/src/app/globals.css](../../../apps/web/src/app/globals.css) line 24                                        | `@source '../../../../packages/engine/src/render';` — only the renderer, as before; the public site must not pick up the editor's classes                                                                                                                                |
| The fixture tests (`core/fixtures.test.ts`, `core/email.test.ts`, `render/golden.test.ts`)                           | Each joins paths to a `root` constant computed as `src/..`. The test files are now one folder deeper (`src/core/`, `src/render/`), so `root` becomes `join(…, '..', '..')`; the package folders are at the old depth, so `../../api/…` relative to `root` is still right |
| `packages/engine/scripts/generate-style-classes.mjs`                                                                 | Its output path: `src/render/style-classes.ts`                                                                                                                                                                                                                           |
| `.prettierignore`                                                                                                    | Any line naming an old package folder                                                                                                                                                                                                                                    |
| Python comments that name a TypeScript file                                                                          | `api/app/domains/email_builder/render/html.py` and `js.py` name `packages/email-render`; update the paths                                                                                                                                                                |

The ten app files that import the builders:

```
apps/admin/src/app/(builder)/content/emails/[uuid]/edit/page.tsx
apps/admin/src/components/content/article-builder.tsx
apps/admin/src/components/content/articles-screen.tsx
apps/admin/src/components/content/email-builder.tsx
apps/admin/src/components/content/email-templates-screen.tsx
apps/web/src/app/blog/[slug]/page.tsx
apps/web/src/app/blog/preview/[token]/page.tsx
apps/web/src/components/home/structured-data.tsx
apps/web/src/lib/blog.ts
apps/web/src/lib/builder.ts
```

Find anything left:

```bash
git grep -nE "builder-(core|render|react)|email-(core|render|react)" -- ':!docs/builder_packages' ':!**/CHANGELOG.md' ':!docs/architecture/decisions/0009*'
```

That command should print nothing but lines you chose to keep (old plan documents such as `docs/article-builder-prompt.md`).

### 5. Update the documents

- [docs/architecture/monorepo.md](../../architecture/monorepo.md): the package graph.
- [docs/backend/email.md](../../backend/email.md): the package names.
- A new ADR, `docs/architecture/decisions/0010-builders-as-engine-and-kits.md`: the builders are regrouped as an engine and kits, on the way to their own repository; it supersedes the package names in ADR 0009, not its decision. Link this folder. ADR 0009 itself is not edited.
- [docs/builder_packages/README.md](../README.md): the "Where the code is today" table.

## Check

```bash
pnpm install
pnpm lint && pnpm typecheck && pnpm test
pnpm --filter @motors/admin build && pnpm --filter @motors/web build
git status api/            # nothing: no fixture changed
```

Then the screens in [00_INDEX.md](00_INDEX.md#what-green-means). Nothing should look different; the screenshots are compared to be sure Tailwind still finds every class through the new `@source` paths.

## Done when

- [x] `packages/` has `engine` and `email` and none of the six old folders.
- [x] The first commit is renames only.
- [x] `git grep` for the old package names finds only historical documents (and migration 0019, which is not edited).
- [x] Lint, type check, tests and both app builds pass.
- [x] No fixture or generated file under `api/` changed. (Comments in the API that name a TypeScript path were updated, as part 4 asks.)
- [x] The editors and a blog article look the same as the screenshots, light and dark. (2026-11-11: checked by comparing the compiled CSS of both app builds, rule for rule, before and after — identical. No screenshot pass was run.)
- [x] ADR 0010 is written and the monorepo document is updated.

## Traps

- **A missing `@source` line shows up as unstyled elements, not as an error.** If part of an editor loses its styling, the path in `globals.css` is wrong.
- **`git mv packages/email-react/src/* …` skips dot-files.** There are none today; check with `ls -A` before deleting the old folder.
- **`.turbo` and `tsconfig.tsbuildinfo`** in the old folders are build leftovers. Delete them; do not move them.
- **Pinned versions.** [docs/VERSIONS.md](../../VERSIONS.md) lists the pinned dependencies. Merging manifests must not change a version; compare `pnpm-lock.yaml` before and after — only the workspace package names should differ.
- **Do not fix anything on the way.** A cast that looks wrong, a file in the wrong place: write it down for step 03. This step is only a move.
