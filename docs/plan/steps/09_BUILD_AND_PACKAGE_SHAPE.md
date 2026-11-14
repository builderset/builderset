# 09 — Build and package shape

## Goal

Each package builds to `dist/` and has the manifest of a published package: entry points, types, peer dependencies, a files list. A set of automatic checks proves the built package is correct before anyone installs it.

## Why

Today every package says `"main": "./src/index.ts"` and the apps compile the TypeScript themselves through `transpilePackages`. A package on a registry cannot ask that of its users. It must ship JavaScript that Node and every bundler can load, with type files beside it.

Three properties of the output are easy to get wrong and invisible until a user reports them:

- **`'use client'`.** 41 source files start with it. A bundler that merges files moves or drops the line, and a Next.js app then fails with "useState only works in a Client Component", or the article renderer silently becomes a client component and ships JavaScript it should not.
- **Plain Node.** `@builderset/email/render` must run in a Node script with no bundler. Node's ESM loader needs file extensions in relative imports; the source has none.
- **What is in the tarball.** Tests, fixtures of the wrong kind, source maps pointing at missing files.

## Before you start

- Step 08 is done.

## The work

### 1. Choose and configure the build tool

Use **tsdown**. It builds libraries, writes type files, rewrites relative imports with extensions, and can emit one output file per source file.

`packages/email/tsdown.config.ts`:

```ts
import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: [
    'src/core/index.ts',
    'src/render/index.ts',
    'src/editor/index.ts',
    'src/host.ts',
    'src/locales/*.ts',
  ],
  format: 'esm',
  outDir: 'dist',
  dts: true,
  sourcemap: true,
  clean: true,
  // One output file per source file. This is what keeps every 'use client'
  // line at the top of the file it belongs to.
  unbundle: true,
});
```

The option names are tsdown's at the time of writing; read its documentation for the installed version. What matters is the four requirements, which part 5 checks whatever the tool:

| Requirement                              | Why                                                  |
| ---------------------------------------- | ---------------------------------------------------- |
| ESM, with `.js` on every relative import | Plain Node                                           |
| One output file per source file          | `'use client'` stays where it was; tree shaking      |
| A `.d.ts` beside every `.js`             | Types                                                |
| Dependencies are not bundled             | The parent project deduplicates React, TipTap, Radix |

If the installed version drops the directives even without bundling, add a plugin that preserves them (`rollup-plugin-preserve-directives` is the usual one). Do not solve it by putting `'use client'` on a whole entry: for the article renderer that would turn every static element into client code.

The engine and the article package get the same file with their own entries. Add `"build": "tsdown"` and `"dev": "tsdown --watch"` to each manifest.

### 2. Rules the source must follow

Check these now; each would otherwise fail later in a user's project.

| Rule                                                                                            | Why                                                                                             |
| ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| A file with `'use client'` uses named exports only, never `export *`                            | Next.js refuses `export *` in a client boundary                                                 |
| An entry's `index.ts` lists what it exports by name                                             | The public API is then readable in one file. Replace the `export *` lines in today's core index |
| No code runs at import time: no top-level `window`, `document`, `localStorage`, no registration | Tree shaking and server rendering                                                               |
| `src/core/**` imports no React                                                                  | The lint rule from step 03 already enforces it                                                  |
| JSON is imported with an import attribute or read by the consumer                               | Node needs `with { type: 'json' }`                                                              |

### 3. Write the manifests

`packages/email/package.json`:

```json
{
  "name": "@builderset/email",
  "version": "0.0.0",
  "description": "Email template builder: a block editor, a typed document, and HTML that every mail client shows.",
  "license": "MIT",
  "type": "module",
  "sideEffects": ["**/*.css"],
  "files": ["dist", "schema", "fixtures", "icons"],
  "exports": {
    ".": { "types": "./dist/core/index.d.ts", "default": "./dist/core/index.js" },
    "./render": { "types": "./dist/render/index.d.ts", "default": "./dist/render/index.js" },
    "./editor": { "types": "./dist/editor/index.d.ts", "default": "./dist/editor/index.js" },
    "./host": { "types": "./dist/host.d.ts", "default": "./dist/host.js" },
    "./locales/*": { "types": "./dist/locales/*.d.ts", "default": "./dist/locales/*.js" },
    "./styles.css": "./dist/styles.css",
    "./schema.json": "./schema/email.schema.json",
    "./fixtures/*": "./fixtures/*",
    "./package.json": "./package.json"
  },
  "dependencies": {
    "@builderset/engine": "workspace:*"
  },
  "peerDependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "peerDependenciesMeta": {
    "react": { "optional": true },
    "react-dom": { "optional": true }
  },
  "engines": { "node": ">=20" },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/xhiti/builderset.git",
    "directory": "packages/email"
  },
  "homepage": "https://<docs site>",
  "bugs": "https://github.com/xhiti/builderset/issues",
  "keywords": ["email", "email-builder", "email-editor", "react", "newsletter", "drag-and-drop"],
  "publishConfig": { "access": "public" }
}
```

Decisions inside it:

- **`workspace:*` between the product's packages.** On publish it becomes the exact version, so a kit always runs on the engine it was tested with. With one version number for everything ([BLUEPRINT.md §15](../BLUEPRINT.md#15-versions-and-promises)), a project that keeps its `@builderset/*` packages on the same version has one engine.
- **Caret ranges for third-party dependencies** (`"zod": "^4.4.3"`), not the exact pins MotorsAL's manifests use. An application pins; a library gives a range so the parent's package manager can share one copy.
- **React is an optional peer.** A server that only renders emails has no React and should get no warning.
- **`./package.json` is exported.** Some tools read it.
- **No `main`, no `module`, no `types` at the top level.** `exports` is the only door. Every supported tool reads it.

The engine re-exports zod so that a project's custom elements use the same copy the editor uses: in `packages/engine/src/core/index.ts`, `export { z } from 'zod';`.

### 4. Development inside the repository

`exports` now points at `dist`, so a package must be built before a package that depends on it can be type-checked or tested. `turbo.json` already says so (`"dependsOn": ["^build"]` on `lint`, `typecheck` and `test`), and `"outputs": ["dist/**"]` caches the result.

For day-to-day work run `pnpm dev` at the root: every package rebuilds on change.

### 5. Check the built packages

Add a root script, `pnpm check:packages`, that runs three checks on every public package after `pnpm build`.

**a. `publint`** — the manifest against the files: every `exports` target exists, the types are found, the format matches `"type"`.

```bash
pnpm dlx publint --strict packages/email
```

**b. `@arethetypeswrong/cli`** — the types as each kind of consumer resolves them.

```bash
pnpm dlx @arethetypeswrong/cli --pack packages/email --profile esm-only
```

**c. `tooling/check-dist.mjs`** — the properties no general tool knows about. It walks `src/` and `dist/` of each package and fails on any of these:

| Check                                                                                                              | Catches                                     |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| Every `src` file whose first statement is `'use client'` has a `dist` file whose first statement is `'use client'` | A dropped directive                         |
| No `dist` file under `core/` contains `'use client'` or imports `react`                                            | Client code leaking into the server door    |
| `dist/render/index.js` of the email package imports nothing from `react` or from `../editor`                       | The same                                    |
| `dist/render/index.js` of the article package does not start with `'use client'`                                   | The renderer turned into a client component |
| Every relative import in `dist` ends in `.js` and the file exists                                                  | Plain Node failing to load                  |
| No file in `dist` contains `@motors/`, `/src/` or an absolute path from the build machine                          | Leftovers                                   |
| Every `exports` target exists                                                                                      | A door that leads nowhere                   |

It is about a hundred lines of Node with no dependency. Write it once; it runs in CI on every pull request.

**d. Look inside the tarball**, once by hand and then never again because (a) covers it:

```bash
cd packages/email && pnpm pack --pack-destination ../../.tarballs
tar -tf ../../.tarballs/builderset-email-0.0.0.tgz | sort
```

Expect `package.json`, `README.md`, `LICENSE`, `dist/**`, `schema/**`, `fixtures/**`, `icons/**` — and no `src/`, no `*.test.*`, no `tsconfig`, no `.turbo`.

### 6. One README per package

Merge what step 02 left (`src/core/README.md`, `src/render/README.md`, `src/editor/README.md`) into `packages/<name>/README.md`. The registry shows this file as the package's page. The same outline for every package:

1. What it is, in two sentences.
2. Install.
3. The smallest working example: an editor, then a render.
4. The stylesheet import, and the theme in three lines with a link.
5. The entry points, as a table.
6. Every prop of every exported component, as a table.
7. The host adapter, with a link to the backend page.
8. Custom elements.
9. Links: docs, changelog, licence.

The existing READMEs already have most of 3, 6 and 8 ([builder-render's](../../../packages/builder-render/README.md) is the model).

### 7. Add the build to CI

In `ci.yml`, after the tests: `pnpm build`, then `pnpm check:packages`.

## Check

```bash
pnpm build
pnpm check:packages
pnpm lint && pnpm typecheck && pnpm test
```

And one manual proof that plain Node loads the server doors:

```bash
node --input-type=module -e "
  const core = await import('./packages/email/dist/core/index.js');
  const render = await import('./packages/email/dist/render/index.js');
  console.log(typeof core.createEmailDocument, typeof render.renderEmail);
"
```

It must print `function function`.

## Done when

- [x] `pnpm build` writes `dist/` for the three packages.
- [x] Every manifest has `exports`, `files`, `peerDependencies`, `engines`, `repository` and `license`.
- [x] `publint --strict` and `attw` pass for the three packages.
- [x] `check-dist.mjs` passes, and was seen to fail when a `'use client'` line was removed from a `dist` file by hand.
- [x] The tarballs contain only what part 5d lists.
- [x] Plain Node imports the `core` and `render` doors.
- [x] Each package has one README with the nine sections.
- [ ] CI builds and checks the packages.

## Traps

- **Testing only through the workspace.** Inside the repository pnpm links packages by folder, so a missing `files` entry or a wrong `exports` path still works. Only the tarball tells the truth; step 12 makes that automatic.
- **A dependency used but not declared.** The workspace hoists packages, so an import of something listed only in another package's manifest works here and fails for a user. pnpm's strict layout catches most; `publint` and the example apps catch the rest.
- **Source maps that point outside the tarball.** Either include `sourcesContent` in the maps or do not ship maps. Maps that reference `../src/…` produce a warning in every user's console.
- **CSS and `sideEffects: false`.** With `false`, a bundler may drop `import '@builderset/email/styles.css'` as unused. The value must be `["**/*.css"]`.
- **React 19 only.** `^19.0.0` is the honest range. Do not widen it to 18 without running the example apps on 18: the code passes `ref` as a prop.

## How it was done (2026-11-14)

On the branch `feat/09-build`, as a pull request into `development`. Where the work differed from the parts above:

| Part | What the plan said                  | What was done                                                                                                                                                                                                                                                                                                                                                                                                 | Why                                                                                                                                        |
| ---- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1    | tsdown                              | tsdown 0.23.7, unbundled, `platform: 'neutral'`, `root: 'src'`, so `dist/` mirrors `src/`. The entry globs exclude `*.test.ts`: `locales/*.ts` had caught `locales.test.ts` and bundled Vitest                                                                                                                                                                                                                | —                                                                                                                                          |
| 1    | `.d.ts` beside every `.js`          | Type files for every module the public types reach (60 of 83 in the engine). The others are internal: no type refers to them, so a consumer never resolves them                                                                                                                                                                                                                                               | What tsdown's type bundler emits; attw resolves every door                                                                                 |
| 1    | `sourcemap: true`                   | JavaScript maps, with `sourcesContent`. No type maps (`dts: { sourcemap: false }`)                                                                                                                                                                                                                                                                                                                            | Type maps pointed at `../../src/*.ts`, which is not shipped (Traps)                                                                        |
| 2    | Named exports                       | A script wrote the lists from the TypeScript checker: values, then `type` names. The built entries export the same names as before, compared name by name; the one duplicate (`EmailRichText`, reached through two modules) is named once                                                                                                                                                                     | —                                                                                                                                          |
| 2    | `'use client'` files export by name | Already true: no `'use client'` file had `export *`                                                                                                                                                                                                                                                                                                                                                           | —                                                                                                                                          |
| 3    | The manifests                       | As planned, at `mkurtii/builderset` until the transfer. No `./styles.css` door yet: step 10 adds it with the file                                                                                                                                                                                                                                                                                             | publint fails on a door to a missing file                                                                                                  |
| 4    | `dependsOn: ["^build"]`             | `lint`, `typecheck` and `test` depend on the package's own `build` too                                                                                                                                                                                                                                                                                                                                        | Each `server.node.test.ts` imports the package by its name, which is now its `dist/`: the test proves the built output loads in plain Node |
| 5    | `pnpm check:packages`               | `check-dist.mjs` also fails on an import of a package that is not declared, and on a source map without its sources. It was seen to fail on four faults put into `dist/` by hand: a removed `'use client'`, React imported in `core/`, an import without `.js`, an undeclared package                                                                                                                         | Trap: "a dependency used but not declared"                                                                                                 |
| 5d   | The tarballs                        | `dist/`, `schema/`, `fixtures/`, `icons/`, `LICENSE`, `README.md`, `package.json`: nothing else. `workspace:*` becomes `0.0.0` in the packed manifest                                                                                                                                                                                                                                                         | —                                                                                                                                          |
| 6    | One README per package              | The nine sections, plus the reference the folder READMEs held (the document, the elements, checking, limits, the contract files), which were merged and removed. The props tables are generated from the built types by `tooling/readme-props.mjs` (`pnpm readme:props`); CI fails when one is stale. The UI kit's 46 components sit in a collapsed block                                                     | "Every prop of every exported component" stays true only if a machine writes it                                                            |
| 6    | —                                   | 126 props had no doc comment, and 20 more turned up; each now has one in the source, so the tables and the editor's hovers say what a prop does. `Button` and `Badge` declare their variant props by name (same types), because comments on a class-variance-authority config do not reach the type files. The generator writes a union's members in a fixed order: TypeScript's order changes between builds | —                                                                                                                                          |
| —    | —                                   | **For step 10:** `Badge` still has five tones named after the statuses of the app the kit came from (`pending`, `valuated`, `scheduled`, `finalized`, `refused`), coloured by that app's `--color-status-*` tokens. The top bar's status chip uses three of them. Renaming them to the document's own states and giving them colours of the package's own is a style change, so it waits for step 10          | Rule 5: the editor looks as before                                                                                                         |
| 6    | The stylesheet import               | Not yet: the READMEs say what a Tailwind 4 app adds today, and that step 10 replaces it                                                                                                                                                                                                                                                                                                                       | No stylesheet exists before step 10                                                                                                        |
| 7    | CI builds and checks                | The quality job runs `check:packages` and the README check. The test job installs and builds on Node 24, then switches to the version under test                                                                                                                                                                                                                                                              | tsdown needs Node 22                                                                                                                       |
| —    | The licence                         | MIT (decision D2, 2026-11-14): `LICENSE` at the root and in each package                                                                                                                                                                                                                                                                                                                                      | npm packs only the package's own folder                                                                                                    |

**Checks.** `pnpm build`, `check:packages`, `lint`, `typecheck` and `test` (222 tests) pass with forced runs; plain Node loads `core` and `render` (`function function`) and renders an email to HTML. The README tables are current (`readme-props.mjs --check`) across two forced rebuilds: 64 components, 247 props, none without a description. CI has not run these jobs yet: the pull request is their first run.
