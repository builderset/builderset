# Builderset

One engine for block editors, and one kit per kind of document: emails and
articles today, popups, pages and forms later.

A developer installs the kit they need, places one editor component in their
React back office, and renders the saved document on their server or their
site. The editor never talks to a backend by itself: the project hands it a
small adapter for saving and uploading.

- **One engine for every kind of document.** The same workspace, undo, drag and
  drop, inspector and multi-language writing for each kit.
- **A typed document, not HTML.** Documents are JSON checked by a JSON Schema,
  so any backend in any language can validate and store them.
- **It belongs to the project it runs in.** No iframe and no hosted account:
  the project's storage, theme and language.

> **Status: not released.** Nothing is on npm yet. The packages work, but the
> build, the stylesheet and the published shape are still being made. The plan
> and its progress are in [docs/plan](docs/plan/README.md).

## Packages

| Package                                   | What                                                                                                             |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| [`@builderset/engine`](packages/engine)   | The node tree, operations with undo, the host contract, the generic editor and its UI kit                        |
| [`@builderset/article`](packages/article) | Articles: elements, renderer for the web, editor, schema and contract fixtures                                   |
| [`@builderset/email`](packages/email)     | Emails: elements, renderer to email HTML and text, editor, schema and golden files                               |
| [`builderset`](packages/builderset)       | Every kit in one install, under `builderset/email/…`, `builderset/article/…`, and one stylesheet for all of them |

Every kit has the same entries: `core` (the document, no React, runs on a
server), `render`, `editor`, `host` and `locales/*`. What a backend must store,
check and render is in
[packages/engine/src/host/BACKEND.md](packages/engine/src/host/BACKEND.md).

Targets: React 19; Node 20 or newer for `core`, `render` and `host`; ES modules
only; current browsers.

## Working on it

Node 24 (`.nvmrc`) and pnpm 11 (`corepack enable`).

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm format:check
pnpm build
pnpm check:packages      # what was built: use client, imports, manifests, types
```

[CONTRIBUTING.md](CONTRIBUTING.md) has the rules for a change.
