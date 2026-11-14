# 07 — Host adapters and the backend contract

## Goal

The line between the product and a project's backend is written down and packaged:

- a `host` entry with the adapter type and two ready-made adapters;
- the JSON Schema and the fixtures as files that belong to each kit, with nothing in a test reaching outside its package;
- a specification of the REST API the ready-made adapter talks to.

## Why

The adapter exists and is good ([builder-react/src/host.ts](../../../packages/builder-react/src/host.ts)), but three things make it hard for a second project:

- **Every project writes the whole adapter.** MotorsAL's email adapter is most of a 334-line file ([apps/admin/src/components/content/email-builder.tsx](../../../apps/admin/src/components/content/email-builder.tsx)). A new project, a demo or a test has nothing to start from.
- **The contract files are written by path into this repository's API.** The tests write to `../../api/tests/fixtures/builder/…`, `../../api/app/domains/content/builder_schema.json`, `../../api/app/domains/email_builder/email_schema.json` and more ([fixtures.test.ts](../../../packages/builder-core/src/fixtures.test.ts) lines 56 and 167, [email.test.ts](../../../packages/email-core/src/email.test.ts) lines 128 and 189, [golden.test.ts](../../../packages/email-render/src/golden.test.ts)). In another repository those paths do not exist.
- **What a backend must do is spread over ADR 0009 and the API's code.** A developer in another project cannot read either.

## Before you start

- Step 03 is merged (`BuilderHost` is generic over the document type).
- Step 05 is best merged first (language has left the host).

## The work

### Part A — the `host` entry

#### 1. Move the type

```
packages/engine/src/host/
├── index.ts
├── types.ts            BuilderHost and its result types, from editor/host.ts
├── memory.ts           createMemoryHost
└── rest.ts             createRestHost
```

Manifest entry: `"./host": "./src/host/index.ts"`. Nothing here imports React, so a test or a script can use it. The kits re-export it (`@motors/email/host`), so a developer never needs the engine's name.

#### 2. `createMemoryHost`

For tests, demos and the playground. It keeps everything in memory.

```ts
export function createMemoryHost<TDoc extends EngineDocument>(options?: {
  /** Wait this long before answering, to see loading states. Default 0. */
  latency?: number;
  /** Called on every change: log it, or keep it in localStorage. */
  onSave?: (document: TDoc, reason: SaveReason) => void;
}): BuilderHost<TDoc>;
```

| Method                                          | Does                                                                 |
| ----------------------------------------------- | -------------------------------------------------------------------- |
| `save`                                          | Stores the document; returns `{ ok: true, savedAt: now }`            |
| `upload`                                        | `URL.createObjectURL(file)`; reports progress in three ticks         |
| `resolveMedia`                                  | Returns the object URL for a key it issued, the key itself otherwise |
| `publish`, `unpublish`                          | Flip a status in memory                                              |
| `loadRevisions`, `loadRevision`, `saveRevision` | An array                                                             |
| `loadSections`, `saveSection`                   | An array                                                             |
| `toast`                                         | `console.info` unless one is passed in                               |

Use it in the editor tests in place of the hand-written fakes in `editor.test.tsx`.

#### 3. `createRestHost`

```ts
export function createRestHost<TDoc extends EngineDocument>(options: {
  /** The document's address: `/api/emails/42`. */
  baseUrl: string;
  /** Extra headers on every request: an Authorization header, a CSRF token. */
  headers?: () => Record<string, string> | Promise<Record<string, string>>;
  /** Passed to fetch. Default 'same-origin'. */
  credentials?: RequestCredentials;
  /** Where files are posted. Omit it and pass `upload` to do uploads yourself. */
  uploadUrl?: string;
  upload?: BuilderHost<TDoc>['upload'];
  resolveMedia: (key: string) => string;
  toast: BuilderHost<TDoc>['toast'];
  /** Change a path when the API differs from the default shape. */
  paths?: Partial<RestPaths>;
  /** For tests. Default: the global fetch. */
  fetch?: typeof fetch;
}): BuilderHost<TDoc>;
```

Uploads with a progress bar use `XMLHttpRequest`: `fetch` cannot report upload progress.

#### 4. The REST shape it speaks

This table is the specification. It goes into the engine's README and, in step 16, onto the docs site.

| Host method     | Request                                        | Body                                      | Success                                              | Failure                                                                                                       |
| --------------- | ---------------------------------------------- | ----------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `save`          | `PUT {base}/draft`                             | `{ document, reason, expected_saved_at }` | `200 { saved_at }`                                   | `409` someone else saved → `{ ok: false, conflict: true }`; `422 { issues }` → the message of the first issue |
| `reload`        | `GET {base}`                                   | —                                         | `200 { document, draft_document, saved_at, status }` |                                                                                                               |
| `publish`       | `POST {base}/publish`                          | `{ document, scheduled_at }`              | `200 { saved_at, status, published_at }`             | `422 { issues }`                                                                                              |
| `unpublish`     | `POST {base}/unpublish`                        | —                                         | `200 { saved_at, status }`                           |                                                                                                               |
| `loadRevisions` | `GET {base}/revisions`                         | —                                         | `200 [{ id, kind, label, created_at, author }]`      |                                                                                                               |
| `loadRevision`  | `GET {base}/revisions/{id}`                    | —                                         | `200 { document }`                                   |                                                                                                               |
| `saveRevision`  | `POST {base}/revisions`                        | `{ document, label }`                     | `201`                                                |                                                                                                               |
| `upload`        | `POST {uploadUrl}` (multipart: `file`, `kind`) | —                                         | `201 { key, url, width, height, mime, size, name }`  | `413`, `415` → a message                                                                                      |
| `importImage`   | `POST {uploadUrl}/import`                      | `{ url }`                                 | `201` as upload                                      |                                                                                                               |
| `oembed`        | `GET {base}/../oembed?url=…`                   | —                                         | `200 { provider, title, thumbnail }` or `204`        |                                                                                                               |
| `loadSections`  | `GET {base}/../sections`                       | —                                         | `200 [{ id, name, fragment }]`                       |                                                                                                               |
| `saveSection`   | `POST {base}/../sections`                      | `{ name, fragment }`                      | `201 { id, name, fragment }`                         |                                                                                                               |
| `previewUrl`    | `POST {base}/preview`                          | `{ document, locale }`                    | `200 { url }`                                        |                                                                                                               |

Rules:

- **Conflicts.** The editor sends back the `saved_at` it last received as `expected_saved_at`. If the server's value differs and the request does not carry `force: true`, the server answers `409`. This is the mechanism the admin uses today (`expected_draft_saved_at`).
- **Optional methods.** A method the API does not have is left out by passing `paths: { revisions: null }`; the editor hides that feature, as it already does for an absent host method.
- **Field names are snake_case on the wire** and camelCase in TypeScript; the adapter converts.

MotorsAL does **not** switch to `createRestHost`. Its API uses its own route style ([docs/development/conventions.md](../../development/conventions.md)) through server actions, and its two adapters stay as they are. The helper is for new projects; MotorsAL's adapters are the proof that a hand-written one works.

#### 5. Tests

- `createMemoryHost`: save then reload returns the same document; a revision saved is listed.
- `createRestHost` against a fake `fetch`: each row of the table; `409` becomes a conflict; `force` is sent on "keep mine"; a network error becomes `{ ok: false, message }` and never throws into the editor.

### Part B — the contract as package files

#### 1. Tests write only inside their own package

| File                                                 | Lives in                          |
| ---------------------------------------------------- | --------------------------------- |
| `article.schema.json` (today `document.schema.json`) | `packages/article/schema/`        |
| Valid and invalid article fixtures, `manifest.json`  | `packages/article/fixtures/`      |
| `email.schema.json`                                  | `packages/email/schema/`          |
| Valid and invalid email fixtures                     | `packages/email/fixtures/`        |
| Golden email cases (input, HTML, text)               | `packages/email/fixtures/golden/` |
| `render_data.json`                                   | `packages/email/fixtures/`        |

In the three fixture tests, delete every `expectFile('../../api/…')` line. Keep the lines that write inside the package.

Manifest entries: `"./schema.json"` and `"./fixtures/*"` in each kit.

#### 2. One script copies them into the API

`scripts/sync-builder-contract.mjs`, a plain copy with a table at the top:

| From                                           | To                                                      |
| ---------------------------------------------- | ------------------------------------------------------- |
| `packages/article/schema/article.schema.json`  | `api/app/domains/content/builder_schema.json`           |
| `packages/article/fixtures/`                   | `api/tests/fixtures/builder/`                           |
| `packages/email/schema/email.schema.json`      | `api/app/domains/email_builder/email_schema.json`       |
| `packages/email/fixtures/` (without `golden/`) | `api/tests/fixtures/email/`                             |
| `packages/email/fixtures/golden/`              | `api/tests/fixtures/email/golden/kit/`                  |
| `packages/email/fixtures/render_data.json`     | `api/app/domains/email_builder/render/render_data.json` |

- `node scripts/sync-builder-contract.mjs` copies.
- `node scripts/sync-builder-contract.mjs --check` exits with an error if any destination differs. Add it to CI ([.github/workflows/ci.yml](../../../.github/workflows/ci.yml)) beside the frontend tests.

The first run must change nothing under `api/`: the files were already there, written by the tests. `git status api/` clean is the proof the script copies what the tests used to write.

In step 14 this script changes its "from" column to `node_modules/@builderset/…`; in step 15 the Python package replaces it.

`packages/builder-presets` keeps writing its own MotorsAL files (`golden/motors/`, `staff_email.json`). That package never leaves this repository, so its paths are fine.

### Part C — what a backend must do

Write `packages/engine/src/host/BACKEND.md`. It is the source for the docs site page in step 16. Its contents:

1. **What to store** — the table in [BLUEPRINT.md §11](../BLUEPRINT.md#what-a-project-stores).
2. **Draft or live** — from ADR 0009:
   - A draft may be unfinished: a missing title, an image still uploading, an empty embed.
   - A draft may never be unsafe: an unsafe URL, media outside the document's own folders, a malformed tree.
   - Publishing checks strictly. Errors block it; warnings do not.
     Make that rule code, not prose. Today the check functions return every issue and the API decides which ones a draft may carry (`media.external`, `meta.titleMissing`, `embed.*`, `footnote.missing`, per ADR 0009). Export the decision from each kit — `isDraftBlocking(issue)` in TypeScript, the same in the Python package — with the list of codes in one place, so every backend is lenient in exactly the same way.

3. **Validating on every write** — never trust the browser:
   - Node: `checkEmail(parseEmail(body.document), registry)`.
   - Python: `validate_email(document)` from the package (step 15).
   - Any other language: validate against `schema.json`, then apply the structural rules listed in `fixtures/manifest.json`; the invalid fixtures say which error each must produce.
4. **Rendering on the server** — the browser never sends HTML. The server renders from the stored document.
5. **A security checklist**

   | Check                                                             | Why                                                                         |
   | ----------------------------------------------------------------- | --------------------------------------------------------------------------- |
   | The user may edit this document                                   | The editor cannot know                                                      |
   | The body is under a size limit (the schema's `x-limits`)          | A document is JSON of any size until checked                                |
   | Every media key in the document belongs to this tenant and folder | A key is a path into storage                                                |
   | Uploads are checked for type and size on the server               | The browser's check is for the writer's comfort only                        |
   | `oembed` and `importImage` fetch only public addresses            | A server fetching a URL a user typed can be pointed at the internal network |
   | Publishing is its own permission                                  | As in MotorsAL                                                              |

6. **Two complete examples** — placeholders now, written in step 16: Next.js route handlers, FastAPI.

### Part D — the server entries run on a server

The `core` and `render` entries must load in plain Node with no DOM.

- `importHTML` uses the browser's `DOMParser`. It must not be touched at import time; calling it without a DOM must fail with a message that says to pass a parser: `importHTML(html, { parser })`.
- No file under `src/core/` or `packages/email/src/render/` reads `window` or `document` at module level.

Add a test that proves it, run with Node directly, not through the test runner's browser-like environment:

```bash
node --input-type=module -e "const m = await import('@motors/email/render'); console.log(typeof m.renderEmail)"
```

While the packages export raw TypeScript, run it through `tsx` or as a Vitest test file with `// @vitest-environment node` at the top. Step 12 repeats it against the built package.

## Check

```bash
pnpm lint && pnpm typecheck && pnpm test
node scripts/sync-builder-contract.mjs --check
git status api/                        # clean
git grep -n "\.\./\.\./api/" -- packages/engine packages/article packages/email      # nothing
```

On screen: nothing changed in the admin; its adapters were not touched beyond imports.

## Done when

- [x] `@motors/engine/host` exports `BuilderHost`, `createMemoryHost` and `createRestHost`; each kit re-exports it.
- [x] Both helpers are tested, every row of the REST table included.
- [x] No test in the three generic packages writes or reads outside its package.
- [x] `sync-builder-contract.mjs --check` runs in CI.
- [x] `git status api/` is clean after the first sync.
- [x] `BACKEND.md` exists with the six sections.
- [x] The server entries load in Node with no DOM, and a test proves it.

## Traps

- **Designing the REST shape around MotorsAL's routes.** It is for projects that have no API yet. Keep it plain REST and small.
- **The sync script drifting.** If someone edits a file under `api/` directly, the next sync overwrites it. The header of each copied JSON file cannot hold a comment, so say it in the README of each destination folder: "generated — edit the package and run the sync".
- **`createRestHost` swallowing errors.** A failed save must reach the writer as a visible state. The editor already shows "could not save, retrying" for `{ ok: false }`; the helper must return that, not throw and not resolve as success.
- **Object URLs in the memory host.** They are valid only in the tab that made them. A document saved from the playground and pasted elsewhere has dead images; the playground should say so.

## How it was done (2026-11-11)

Two commits: the moves alone (`editor/host.ts` → `host/types.ts`, `document.schema.json` → `article.schema.json`), then everything else. Where the work differed from the parts above:

| Part | What the plan said                                       | What was done                                                                                                                                                                                                                                                                                                                                                                              | Why                                                                                                                 |
| ---- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| A.1  | Kits re-export the host                                  | `@motors/article/host` and `@motors/email/host` are one line each (`src/host.ts`). `@motors/engine/editor` still re-exports the types, so the admin's imports did not change. The lint rule gives `host/` the core's limits: no React, no `render` or `editor`                                                                                                                             | —                                                                                                                   |
| A.2  | `createMemoryHost({ latency, onSave })`                  | Also `document` (what `reload` returns before the first save) and `toast`; the returned host has a `state` a test can read. A manual save and a publish each record a version, as the admin's adapters do                                                                                                                                                                                  | Tests need to see what was saved                                                                                    |
| A.3  | `createRestHost` options                                 | Also `savedAt` (the page's `saved_at`, sent back as `expected_saved_at` on the first save) and `onRecord` (status, `published_at` after a write, for the editor's `record` prop). `reload`, `loadRevision` and `importImage` throw on failure, as `BuilderHost` expects; `save`, `publish` and `unpublish` never throw                                                                     | Without `savedAt` the first save cannot detect a conflict; without `onRecord` a publish could not reach the top bar |
| A.5  | Replace the fakes in `editor.test.tsx`                   | Both kits' editor tests run on `createMemoryHost`; the article's keeps a `vi.fn` `publish` where a test watches it                                                                                                                                                                                                                                                                         | —                                                                                                                   |
| B.1  | Manifest `./schema.json`, `./fixtures/*`                 | As planned; the old `./schema/<file>.json` entries are gone (nothing imported them)                                                                                                                                                                                                                                                                                                        | —                                                                                                                   |
| B.1  | —                                                        | Each kit also writes `fixtures/draft.json` (part C), and the email kit `fixtures/render_data.json` and `fixtures/golden/`                                                                                                                                                                                                                                                                  | —                                                                                                                   |
| B.2  | Copy with `--check`                                      | The script mirrors folders: a file the package no longer has is removed from the copy. It touches only the sub-folders the package has, so `builder/motors/` and `email/golden/motors/` (written by `packages/builder-presets`) are left alone, and it compares text with line endings normalised. The first run changed nothing under `api/` except adding the two new `draft.json` files | —                                                                                                                   |
| C.2  | `isDraftBlocking(issue)` from each kit                   | And `isPublishBlocking`, with the lists as `ARTICLE_DRAFT_TOLERATES` and `EMAIL_DRAFT_TOLERATES`. The API's article list moved from `content/service.py` (private) to `content/document.py` (`DRAFT_TOLERATES`, like the email's), and a unit test on each side holds it equal to `draft.json`                                                                                             | "The list of codes in one place": the kit's, with the API checked against it until step 15                          |
| C.6  | Two examples                                             | Placeholders, as planned; step 16 writes them                                                                                                                                                                                                                                                                                                                                              | —                                                                                                                   |
| D    | `importHTML(html, { parser })`                           | `importHTML(html, registry, { parser })`, and `importEmailHtml` already took one. Both look the parser up with the engine's `domParser()` when they run; without one, on a server, the error says to pass `{ parser }`                                                                                                                                                                     | —                                                                                                                   |
| D    | Run the check with `tsx` or a Node-environment test file | Each package's Vitest config has two projects: `dom` (jsdom, as before) and `node` (no DOM, no setup files) for `*.node.test.ts`. `server.node.test.ts` in the engine, the article and the email kit imports every server entry statically, so a module that touched the DOM while loading fails the file                                                                                  | The setup files themselves need a DOM; a dynamic `import()` inside a test timed out under a loaded full run         |

**Checks.** All 45 workspace tasks pass (twice, forced); `sync-builder-contract.mjs --check` passes; `git grep "../../api/"` finds nothing in the three packages. The API's 709 unit tests pass, with mypy and the import contracts clean. The admin's adapters changed only where step 06 moved two fields; nothing else in the admin was touched.
