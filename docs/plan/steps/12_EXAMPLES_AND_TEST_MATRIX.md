# 12 — Example apps and the test matrix

## Goal

Three small projects use the packages the way a stranger would — installed from a registry, not linked from the workspace — and browser tests on them run in CI. If a release would break a real project, a test fails first.

## Why

Inside the repository everything is linked by folder, compiled by the same tools and styled by nothing foreign. Every bug a user would meet first is invisible there:

- a file missing from the tarball;
- an import that only works because another package hoisted the dependency;
- a `'use client'` line lost in the build;
- a style that depended on Tailwind being in the page;
- a parent stylesheet that bends the editor;
- a server entry that touches `window`.

The examples are also the first documentation. A developer copies an example long before reading a guide.

## Before you start

- Step 09 is done. Step 10 uses the first example while it is being built, so create the shells (part 1) early.

## The work

### 1. The three examples

| Example                | What it is                                                             | What it proves                                                                            |
| ---------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `examples/vite-react`  | Vite, React 19, **no Tailwind**, a plain CSS file, no router           | The packages need nothing from the parent. A hostile stylesheet does not bend the editor  |
| `examples/next-shadcn` | Next.js App Router, Tailwind 4, shadcn tokens, `next-themes` dark mode | Client and server boundaries; theme following; the parent's own Tailwind is not disturbed |
| `examples/node-render` | A plain Node script, no bundler, no React                              | The `core` and `render` doors load and run in Node                                        |

Keep each one small enough to read in five minutes. No example may contain a workaround; if one is needed, the package is wrong.

#### `examples/vite-react`

| Route                | Shows                                                                                                       |
| -------------------- | ----------------------------------------------------------------------------------------------------------- |
| `/email`             | `<EmailEditor>` with `createMemoryHost`, the default brand and a sample variable list                       |
| `/article`           | `<ArticleEditor>` with `createMemoryHost`                                                                   |
| `/article/view`      | The saved article through `<ArticleRenderer>` and `content.css`                                             |
| `/hostile`           | The email editor on a page with the hostile stylesheet from step 10                                         |
| A bar on every route | Switches for theme (light, dark, auto), the page's own `dark` class, the editor language and a brand colour |

#### `examples/next-shadcn`

| Route                   | Kind                                                                                                   | Shows                                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `/emails/[id]/edit`     | Client component                                                                                       | `<EmailEditor>` loaded with `next/dynamic` and `ssr: false`; `theme="auto"`; `shadcn.css`       |
| `/articles/[id]/edit`   | Client component                                                                                       | `<ArticleEditor>`, imported from `builderset/article/editor` to exercise the all-in-one package |
| `/blog/[slug]`          | Server Component                                                                                       | `<ArticleRenderer>` with `next/link` and `next/image` passed in                                 |
| `/api/emails/[id]/…`    | Route handlers                                                                                         | The REST shape from step 07, backed by JSON files on disk; `createRestHost` talks to it         |
| `/api/emails/[id]/send` | Route handler                                                                                          | `renderEmail` on the server; returns the HTML                                                   |
| `/` and a settings page | The project's own pages with shadcn buttons and a theme toggle — the "is the parent disturbed" control |

This example is also the reference Next.js backend that step 16 documents.

#### `examples/node-render`

```js
// render.mjs
import { readFileSync } from 'node:fs';

import { checkEmail, createEmailRegistry, parseEmail } from '@builderset/email';
import { renderEmail } from '@builderset/email/render';

const document = parseEmail(JSON.parse(readFileSync('./welcome.json', 'utf8')));
const issues = checkEmail(document, createEmailRegistry(), null);
if (issues.some((issue) => issue.severity === 'error')) throw new Error(JSON.stringify(issues));

const { html, text } = renderEmail(document, {
  data: { recipient: { name: 'Ana' } },
  locale: 'en',
  assetUrl: (key) => `https://cdn.example.com/${key}`,
});
process.stdout.write(html);
```

Match the argument lists to the real functions when writing it; the shape is what matters here.

### 2. Two ways to run an example

| Mode     | How the packages are resolved                                      | Used for                                   |
| -------- | ------------------------------------------------------------------ | ------------------------------------------ |
| **Dev**  | Workspace links (`"@builderset/email": "workspace:*"`)             | Working on a package and seeing it at once |
| **Test** | Installed from a local registry, in a folder outside the workspace | CI. The truth                              |

The test mode is a script, `tooling/test-examples.mjs`:

1. `pnpm build`.
2. Start a local registry — [Verdaccio](https://verdaccio.org) — on a free port, with a configuration that allows publishing `@builderset/*` and `builderset` without a login and proxies everything else to npm.
3. Publish every public package to it: `pnpm -r publish --registry http://localhost:<port> --no-git-checks`.
4. For each example: copy it to a temporary folder outside the repository, replace `workspace:*` with the version just published, and run `npm install --registry http://localhost:<port>`.
5. Build the example; run its tests.
6. Stop the registry.

Using **`npm`** in step 4, not pnpm, on purpose: most users use npm, and its flat `node_modules` behaves differently from pnpm's. Run one example with pnpm and one with npm if time allows.

A local registry is used, not `file:` tarballs, because it is the same command a user types and it also tests that a kit's dependency on the engine resolves.

Root script: `"test:examples": "node tooling/test-examples.mjs"`.

### 3. Browser tests

Playwright, in each web example. Keep them few and about behaviour.

| Test                                 | Steps                                                                                                              | Passes when                                                               |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| The editor mounts                    | Open `/email`                                                                                                      | Top bar, add panel and canvas are visible; the console has no error       |
| Insert, type, undo                   | Add a heading from the add panel, type, press undo                                                                 | The text appears, then the heading is gone                                |
| Save reaches the host                | Type, wait two seconds                                                                                             | The memory host's `onSave` was called; the save state says saved          |
| A menu opens styled                  | Open the publish menu                                                                                              | It is visible, inside the viewport, with the surface colour as background |
| Dark                                 | Set `theme="dark"`                                                                                                 | The top bar's computed background is the dark default                     |
| Auto follows the page                | `theme="auto"`, add `class="dark"` to `<html>`                                                                     | The same                                                                  |
| A token applies                      | `tokens={{ primary: '#da6c1e' }}`, select a block                                                                  | The selection outline's computed colour is that orange                    |
| Language                             | `locale="sq"` with the locale passed                                                                               | A known label is in Albanian                                              |
| One content language                 | Default props                                                                                                      | No language switch in the top bar                                         |
| Hostile page                         | Open `/hostile`                                                                                                    | A screenshot of the editor equals the screenshot from `/email`            |
| The parent is not disturbed          | In the Next example, read a shadcn button's computed styles on `/` with and without the editor stylesheet imported | They are equal                                                            |
| Server rendering                     | Request `/blog/[slug]` with JavaScript disabled                                                                    | The article's text is in the HTML                                         |
| The editor is not in the blog bundle | Inspect the JavaScript files requested by `/blog/[slug]`                                                           | None contains a string that only the editor has                           |
| REST host                            | Edit an email in the Next example, reload                                                                          | The change is still there                                                 |
| Conflict                             | Change the stored file's `saved_at` behind the editor's back, then type                                            | The conflict dialog appears                                               |

Run the web tests in Chromium, Firefox and WebKit. `light-dark()`, `color-mix` and `:where` are what differ between engines.

`examples/node-render` has one test: the output equals the golden HTML for the same document in `@builderset/email/fixtures/golden/`. Run it on Node 20, 22 and 24.

### 4. Add it to CI

A third job in `ci.yml`, after `quality` and `test`:

```yaml
examples:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v5
    # pnpm and node setup as in the other jobs
    - run: pnpm install --frozen-lockfile
    - run: pnpm exec playwright install --with-deps
    - run: pnpm test:examples
    - uses: actions/upload-artifact@v4
      if: failure()
      with:
        name: playwright-report
        path: examples/*/playwright-report
```

It is the slow job. Run it on every pull request that touches `packages/`, and always before a release.

### 5. Keep the examples honest

- An example's `package.json` lists only what a user would install. No `@builderset/engine` unless the example really imports it.
- When a public prop or entry point changes, the example changes in the same pull request. A broken example is a failed build, which is the point.
- Each example has a README of ten lines: what it shows and how to run it.

## Check

```bash
pnpm test:examples
```

Then break things on purpose and see the right test fail:

| Break                                                        | The test that must fail        |
| ------------------------------------------------------------ | ------------------------------ |
| Remove `"icons"` or `"dist"` from a package's `files`        | Install or build of an example |
| Delete the `'use client'` line from a built editor file      | The Next example's build       |
| Remove the prefix from one class in the top bar              | "Hostile page" or a screenshot |
| Add `document.title` at the top level of a file under `core` | `node-render`                  |
| Import `@motors/…` or an undeclared dependency in a package  | Install of an example          |

## Done when

- [x] The three examples exist, each with a README.
- [x] `pnpm test:examples` installs them from a local registry outside the workspace and passes.
- [ ] The fifteen browser tests pass in Chromium, Firefox and WebKit.
- [x] `node-render` passes on Node 20, 22 and 24.
- [x] The `examples` job runs in CI and uploads its report on failure.
- [x] Each of the five deliberate breaks made the expected test fail.

## Traps

- **An example inside the workspace during the test.** If the copy stays under the repository root, the package manager finds the workspace and links folders again. The temporary folder must be outside.
- **Screenshots that differ between machines.** Fonts and anti-aliasing differ between Windows and the Linux runner. Create the reference screenshots in CI, or compare computed styles and not pixels where possible.
- **The local registry's cache.** A second run that publishes the same version is refused. Start it with an empty storage folder every time.
- **Examples growing into applications.** Authentication, a database, a design system — each makes the example harder to read and adds a reason to fail that is not about the packages. The reference backends belong in the docs.

## How it was done (2026-11-14)

On the branch `feat/12-examples`, stacked on step 11's. Where the work differed from the parts above:

| Part  | What the plan said                             | What was done                                                                                                                                                                                                                                                                                                                | Why                                                                                           |
| ----- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 1     | `vite-react`                                   | Step 10's shell, finished: the bar also switches the language and counts the saves that reached the memory host (made once for the page). Its tsconfig no longer extends the repository's                                                                                                                                    | An example is copied out of the repository to be tested                                       |
| 1     | `next-shadcn`                                  | As planned. The article pages read the package's kitchen sink rather than an article store; the email routes keep JSON files in `.data/` and leave out versions, sections, previews and oEmbed (`paths: { …: null }`)                                                                                                        | Kept small enough to read in five minutes                                                     |
| 1     | `node-render`                                  | `render.mjs` and `test.mjs` (`node --test`): every golden case the email package ships, rendered and compared byte for byte, and the script's own output                                                                                                                                                                     | —                                                                                             |
| 2     | `tooling/test-examples.mjs`                    | As planned, with npm for every example. The packages stay `private` in the repository; the script clears the flag in the packed copy it publishes. It unpacks the tarballs in Node                                                                                                                                           | Step 13 decides when the real packages are public; Git Bash's `tar` reads `C:` as a host name |
| 3     | Fifteen browser tests                          | Ten in `vite-react`, five in `next-shadcn`. Two compare with tolerance: the hostile-page screenshots with pixelmatch (the PNG encoder writes identical pictures differently, and 10 pixels differed by anti-aliasing), and the parent's button ignores Tailwind's `--tw-*` `@property` registrations, which CSS cannot scope | Exact bytes and exact property lists failed on things that are not a difference               |
| 3     | —                                              | The "parent not disturbed" test found the stylesheet's theme variables declared on `:root`; `finish-css.mjs` now declares them on `.builderset`                                                                                                                                                                              | Nothing the editor uses may reach the page                                                    |
| 4     | A third job in `ci.yml`                        | A separate `examples.yml`, on changes to `packages/`, `examples/`, `tooling/` and on pushes to the release branches; `node-render` also runs on Node 20 in `ci.yml`'s test matrix                                                                                                                                            | A path filter is per workflow                                                                 |
| Check | Delete `'use client'` from a built editor file | Deleted from a built renderer island (`render/client/copy-button.js`): the Next build fails, "importing a module that depends on `useEffect` into a React Server Component". The example imports every editor inside a client component, so an editor file's line is not what a server page reaches                          | —                                                                                             |
| Check | An unprefixed class fails "Hostile page"       | The prefix test fails (`top-bar.tsx:58  size-4`). The hostile test compares two pages of the same build, so a class missing from both is not a difference to it                                                                                                                                                              | —                                                                                             |

**Checks.** `pnpm test:examples` passes: all three examples installed with npm from Verdaccio in the system's temporary folder; in Chromium, `vite-react` 10/10 and `next-shadcn` 5/5; `node-render` 11/11 on Node 26. The deliberate breaks: no `dist` in the email package's `files` → `node-render` fails (`ERR_MODULE_NOT_FOUND`); `document.title` at the top of a core file → `node-render` fails (`document is not defined`); an import of `@motors/ui` → `node-render` fails (`Cannot find package`); a renderer island without `'use client'` → the Next build fails; a top-bar class without the prefix → the prefix test fails. Firefox and WebKit, and Node 20 and 22, ran for the first time in CI on 2026-11-14 (commit `1092cce`), green — after two fixes: the all-in-one package's tests became a `node` project for the Node 20 run, and the Examples job was pinned to Ubuntu 24.04, since `ubuntu-latest` (26.04) is a system Playwright 1.58 cannot install its browsers on.

**Correction, the same day.** The first Examples run in CI failed two Next tests in Firefox and WebKit: the blog fetched its pictures from picsum.photos through Next's image service, the requests timed out on the runner, and the page's `load` never came within 30 s (Chromium got there after 14 s). An example makes no request to a third party now: both serve one sample image from `public/`, and the server-HTML test waits for the HTML only. The box above is unticked until a green run shows all three browsers.
