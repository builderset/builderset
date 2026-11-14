# Blueprint

What the product is when it is finished: its packages, its public API, how it takes its look and language from the project it runs in, what the backend does, and where it is published. The order of work is in [ROADMAP.md](ROADMAP.md); the instructions are in [steps/](steps/00_INDEX.md).

The product is named Builderset — see the note in [README.md](README.md) for what was checked and what is still to confirm.

## Contents

1. [The product](#1-the-product)
2. [What exists today](#2-what-exists-today)
3. [What stops it being a product](#3-what-stops-it-being-a-product)
4. [The repository](#4-the-repository)
5. [Packages and entry points](#5-packages-and-entry-points)
6. [The all-in-one package](#6-the-all-in-one-package)
7. [Rules that keep the code readable](#7-rules-that-keep-the-code-readable)
8. [The public API](#8-the-public-api)
9. [Look: deriving the theme from the parent](#9-look-deriving-the-theme-from-the-parent)
10. [Language](#10-language)
11. [Backend](#11-backend)
12. [Styles without Tailwind in the parent](#12-styles-without-tailwind-in-the-parent)
13. [Build and package format](#13-build-and-package-format)
14. [Where it is published: npm or GitHub Packages](#14-where-it-is-published-npm-or-github-packages)
15. [Versions and promises](#15-versions-and-promises)
16. [Licence and business model](#16-licence-and-business-model)
17. [Not in scope](#17-not-in-scope)
18. [Words used in these documents](#18-words-used-in-these-documents)

---

## 1. The product

One engine for block editors, and one **kit** per kind of document: emails, articles, and later popups, pages and forms.

A developer installs the kit they need, places one editor component in their React or Next.js back office, and renders the saved document on their server or their site. The editor takes its colours, fonts, theme mode and language from the project it is placed in. It never talks to a backend by itself: the project hands it a small adapter for saving and uploading.

Three things make it different from what exists (Unlayer, GrapesJS, Puck, react-email, TipTap-based editors):

- **One engine for every kind of document.** The same workspace, undo, drag and drop, inspector and multi-language writing for an email, an article, a popup and a page. A team learns one editor.
- **A typed document, not HTML.** Documents are JSON checked by a JSON Schema, so any backend in any language can validate and store them, and the same document renders the same on every server.
- **It belongs to the parent project.** No iframe, no hosted account, no foreign look: the parent's theme and language, the parent's storage.

## 2. What exists today

| Package                                          | Role                                        | Imports from the workspace                                          |
| ------------------------------------------------ | ------------------------------------------- | ------------------------------------------------------------------- |
| [builder-core](../../packages/builder-core/)     | Model. Pure TypeScript, no React            | nothing                                                             |
| [builder-render](../../packages/builder-render/) | Article → React. Seven small client islands | `builder-core`                                                      |
| [builder-react](../../packages/builder-react/)   | The editor workspace                        | `builder-core`, `builder-render`, **`@motors/ui`** (16 files)       |
| [email-core](../../packages/email-core/)         | Email model                                 | `builder-core`                                                      |
| [email-render](../../packages/email-render/)     | Email → HTML and text                       | `email-core`, `builder-core`                                        |
| [email-react](../../packages/email-react/)       | Email editor                                | `builder-react`, `email-core`, `email-render`, **`@motors/ui`** (3) |

Four parts of the design are already what a product needs. They are kept as they are.

- **`EditorProfile`** — [builder-react/src/profile.ts](../../packages/builder-react/src/profile.ts). What makes an editor an article editor or an email editor: how the canvas draws the document, what "document settings" are, which checks block publishing, which variables, colours and fonts are offered. A popup builder is a third profile, not a third editor.
- **`BuilderHost`** — [builder-react/src/host.ts](../../packages/builder-react/src/host.ts). Everything that leaves the browser — upload, save, publish, revisions, saved sections, toasts — is a function the parent project supplies. The editor knows no URL.
- **The element registry** — [builder-core/src/registry.ts](../../packages/builder-core/src/registry.ts). An element is data: a zod schema for its props, defaults, placement rules, a migration, checks. The inspector is generated from the schema, so a third party adds an element the same way the built-in ones are written.
- **The contract as files** — [ADR 0009](../architecture/decisions/0009-article-builder-documents.md). The core exports a JSON Schema and valid and invalid fixtures; the API validates with the same file; golden fixtures hold the TypeScript and Python email renderers to the same bytes.

## 3. What stops it being a product

| #   | Problem                                                                                                                                                                                                                                                                                                                                                                                     | Fixed in                                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| 1   | **The editor is built from `@motors/ui`.** 40 names — `Button`, `Tabs`, `DropdownMenu`, `Popover`, `Overlay`, `Sheet`, `DatePicker`, `TimePicker`… — imported in 19 files. `@motors/ui` depends on `@motors/i18n`, `@motors/query`, `@motors/notifications`, `@motors/tokens` and has `next` as a peer ([packages/ui/package.json](../../packages/ui/package.json)).                        | [Step 04](steps/04_EDITOR_UI_KIT.md)             |
| 2   | **The parent must run Tailwind over the package source.** 686 `className=` uses across three packages. The apps add `@source` lines ([apps/admin/src/app/globals.css](../../apps/admin/src/app/globals.css) lines 14–16) and must define the token names listed in [builder-render/README.md](../../packages/builder-render/README.md#theme-contract).                                      | [Step 10](steps/10_STYLES_AND_THEMING.md)        |
| 3   | **No build.** Every package is `"private": true` with `"main": "./src/index.ts"`; the apps compile them through `transpilePackages` ([apps/admin/next.config.ts](../../apps/admin/next.config.ts) lines 31–43).                                                                                                                                                                             | [Step 09](steps/09_BUILD_AND_PACKAGE_SHAPE.md)   |
| 4   | **Engine and article are one thing.** `builder-core` holds the generic tree and 44 article elements. The workspace imports the article renderer and takes an `ArticleFacts` prop. The email packages cast between the two document types (`as unknown as BuilderDocument`) in twelve places, and the admin in three more.                                                                   | [Step 03](steps/03_SPLIT_ENGINE_FROM_ARTICLE.md) |
| 5   | **Languages are fixed.** `CONTENT_LOCALES = ['sq', 'en', 'de']` in [builder-core/src/i18n.ts](../../packages/builder-core/src/i18n.ts); the editor's words for all three languages are one 1,035-line file ([builder-react/src/messages.ts](../../packages/builder-react/src/messages.ts)).                                                                                                 | [Step 05](steps/05_LANGUAGES.md)                 |
| 6   | **MotorsAL content inside generic packages.** Ten email designs painted in marrimauto.com's colours ([email-core/src/designs/palette.ts](../../packages/email-core/src/designs/palette.ts)); the converter from the old article body ([builder-core/src/legacy.ts](../../packages/builder-core/src/legacy.ts)); a golden test that writes `api/app/domains/notifications/staff_email.json`. | [Step 06](steps/06_PRESETS_OUT.md)               |
| 7   | **The contract is mirrored by path.** The tests write fixtures into `../../api/…` because the API containers mount only `api/`.                                                                                                                                                                                                                                                             | [Step 07](steps/07_HOST_AND_BACKEND_CONTRACT.md) |
| 8   | **Each builder is three packages at the top level.** Six folders for two builders; a third builder would make nine.                                                                                                                                                                                                                                                                         | [Step 02](steps/02_REGROUP_FOLDERS.md)           |

## 4. The repository

One repository, a pnpm workspace with Turborepo — the same tools this repository uses, so the code moves without being rewritten.

```
builderset/
├── packages/
│   ├── engine/                    @builderset/engine     shared by every kit
│   │   ├── src/
│   │   │   ├── core/              tree, registry, operations, history, validation, rich text, content languages
│   │   │   ├── editor/            the workspace: canvas, panels, inspector, top bar, autosave
│   │   │   │   └── ui/            the editor's own small UI kit
│   │   │   ├── host/              BuilderHost, createRestHost, createMemoryHost
│   │   │   ├── theme/             tokens.css, shadcn.css, the Tailwind entry
│   │   │   └── locales/           en.ts, sq.ts, de.ts
│   │   ├── README.md
│   │   └── package.json
│   ├── article/                   @builderset/article
│   │   ├── src/
│   │   │   ├── core/              article elements, document, checks, import from HTML and Markdown
│   │   │   ├── render/            document → React (site); client islands in render/client/
│   │   │   ├── editor/            <ArticleEditor>, the article profile
│   │   │   └── locales/
│   │   ├── schema/                article.schema.json (generated)
│   │   └── fixtures/              valid/, invalid/ (generated)
│   ├── email/                     @builderset/email
│   │   ├── src/
│   │   │   ├── core/              blocks, document, variables, fonts, checks, import from HTML
│   │   │   ├── render/            document → HTML and text. No React
│   │   │   ├── editor/            <EmailEditor>, the canvas, the email profile
│   │   │   └── locales/
│   │   ├── schema/                email.schema.json (generated)
│   │   └── fixtures/              valid/, invalid/, golden/ (generated)
│   ├── popup/                     @builderset/popup      later
│   ├── page/                      @builderset/page       later
│   ├── form/                      @builderset/form       later
│   └── builderset/                    builderset             the all-in-one package
├── python/                        the PyPI package: validation and email rendering
├── examples/
│   ├── vite-react/                no Tailwind, no Next
│   ├── next-shadcn/               Next App Router, Tailwind, shadcn tokens, dark mode
│   └── node-render/               a plain Node script that renders an email
├── apps/
│   └── docs/                      the documentation site and playground
├── tooling/                       shared tsconfig, eslint, build and check scripts
├── .changeset/
└── .github/workflows/             ci.yml, release.yml
```

**Every kit has the same three folders** — `core`, `render`, `editor`. Someone who has read one kit knows where everything is in the next.

## 5. Packages and entry points

A package has several doors. A server that only renders never loads editor code, because it imports a different door.

### `@builderset/engine`

| Import                                | Holds                                                                                                 | React  |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------ |
| `@builderset/engine`                  | Tree, registry, `defineElement`, operations, history, structural checks, rich text, content languages | no     |
| `@builderset/engine/editor`           | `BuilderEditor` (the workspace), `EditorProfile`, hooks, inspector fields                             | client |
| `@builderset/engine/ui`               | The editor's UI kit, for kits and for custom panels                                                   | client |
| `@builderset/engine/host`             | `BuilderHost`, `createRestHost`, `createMemoryHost`                                                   | no     |
| `@builderset/engine/locales/<code>`   | The editor's words in one language                                                                    | no     |
| `@builderset/engine/theme/shadcn.css` | Maps shadcn-style tokens to the editor's                                                              | —      |

Most developers never import the engine. A kit depends on it and re-exports what a developer needs.

### `@builderset/email`

| Import                             | Holds                                                                                  | React  |
| ---------------------------------- | -------------------------------------------------------------------------------------- | ------ |
| `@builderset/email`                | `EmailDocument`, blocks, variables, fonts, `checkEmail`, `parseEmail`, starter designs | no     |
| `@builderset/email/render`         | `renderEmail(document, options)` → `{ html, text, warnings }`, `BrandKit`              | no     |
| `@builderset/email/editor`         | `<EmailEditor>`, `<EmailCanvas>`, `emailProfile`                                       | client |
| `@builderset/email/host`           | The same as `@builderset/engine/host`, re-exported                                     | no     |
| `@builderset/email/locales/<code>` | Engine and email words together, one import per language                               | no     |
| `@builderset/email/styles.css`     | Everything the email editor needs, engine included                                     | —      |
| `@builderset/email/schema.json`    | The JSON Schema                                                                        | —      |
| `@builderset/email/fixtures/*`     | Valid, invalid and golden fixtures, for ports to other languages                       | —      |

### `@builderset/article`

| Import                               | Holds                                                                       | React            |
| ------------------------------------ | --------------------------------------------------------------------------- | ---------------- |
| `@builderset/article`                | `ArticleDocument`, the elements, `createArticleRegistry`, checks, importers | no               |
| `@builderset/article/render`         | `<ArticleRenderer>`, `renderDocument`, `structuredData`                     | server + islands |
| `@builderset/article/editor`         | `<ArticleEditor>`, `articleProfile`                                         | client           |
| `@builderset/article/host`           | The host helpers, re-exported                                               | no               |
| `@builderset/article/locales/<code>` | Engine, renderer and article words                                          | no               |
| `@builderset/article/content.css`    | Styles for a rendered article on a site                                     | —                |
| `@builderset/article/styles.css`     | Everything the article editor needs, `content.css` included                 | —                |
| `@builderset/article/schema.json`    | The JSON Schema                                                             | —                |
| `@builderset/article/fixtures/*`     | Valid and invalid fixtures                                                  | —                |

### What a developer installs

| They want                                        | They install          | They import                                                     |
| ------------------------------------------------ | --------------------- | --------------------------------------------------------------- |
| An email template editor in a back office        | `@builderset/email`   | `@builderset/email/editor`, `@builderset/email/styles.css`      |
| To send those emails from a Node or Next backend | `@builderset/email`   | `@builderset/email/render`                                      |
| To send them from a Python backend               | `builderset` (PyPI)   | `from builderset.email import render_email`                     |
| A news, blog or job-post editor                  | `@builderset/article` | `@builderset/article/editor`, `@builderset/article/styles.css`  |
| To show those articles on a site                 | `@builderset/article` | `@builderset/article/render`, `@builderset/article/content.css` |
| Everything                                       | `builderset`          | `builderset/email/editor`, `builderset/article/render`, …       |

### Why one package per kit, not three

Today's split (`email-core`, `email-render`, `email-react`) gives three versions to keep in step, three installs and three READMEs for one feature. Entry points give the same separation — the `render` door cannot reach editor code — with one install and one version.

The cost: a server that only renders emails still downloads the editor's dependencies (TipTap, Radix). That is install size, not runtime: nothing from the editor is loaded. React is an optional peer dependency, so a server without React gets no warning.

## 6. The all-in-one package

`builderset` depends on every kit at the same version and re-exports each door under the kit's name:

```ts
import { EmailEditor } from 'builderset/email/editor';
import { renderEmail } from 'builderset/email/render';
import { ArticleRenderer } from 'builderset/article/render';
import 'builderset/styles.css'; // every editor, each rule once
```

It has **no root entry**. `import { … } from 'builderset'` would pull editor code into a server bundle and server code into the browser; the path says which side the code is for.

Two reasons to offer it: a project that uses several kits writes one line in `package.json`, and `builderset/styles.css` holds each CSS rule once, where two separate kit stylesheets repeat the engine's rules.

## 7. Rules that keep the code readable

**Imports go one way.**

```
core  ←  render  ←  editor          inside a kit
engine  ←  kit                      between packages
```

- `core` imports nothing from `render` or `editor`. `render` imports nothing from `editor`.
- A kit imports the engine. The engine never imports a kit. A kit never imports another kit.
- A lint rule fails the build on a wrong import ([step 03](steps/03_SPLIT_ENGINE_FROM_ARTICLE.md) adds it).

**One public door per entry.** Each entry is one `index.ts` that lists what it exports by name. No `export *` from a file whose contents are not all meant to be public. What is not in an `index.ts` is private and free to change.

**The same names in every kit.**

| Thing             | Name                                                     |
| ----------------- | -------------------------------------------------------- |
| The document type | `EmailDocument`, `ArticleDocument`, `PopupDocument`      |
| A new document    | `createEmailDocument()`, `createArticleDocument()`       |
| Read stored JSON  | `parseEmail(raw)`, `parseArticle(raw)` — runs migrations |
| Check a document  | `checkEmail(doc, …)`, `checkArticle(doc, …)` → `Issue[]` |
| The registry      | `createEmailRegistry()`, `createArticleRegistry()`       |
| The editor        | `<EmailEditor>`, `<ArticleEditor>`                       |
| The profile       | `emailProfile(options)`, `articleProfile(options)`       |

**Files stay small.** A file has one job and a comment at the top that says what it is for and why it is shaped that way — the style the packages already use. Over about 400 lines, split it. The current exceptions are named in the steps that touch them (`messages.ts` in [step 05](steps/05_LANGUAGES.md)).

**Tests sit beside the code** (`thing.ts`, `thing.test.ts`). Fixtures are generated by tests and committed; a stale fixture fails CI.

**Every package has a README** with: what it is in two sentences, install, the smallest working example, every prop of its components in a table, and a link to the docs site.

**No casts between document types.** After [step 03](steps/03_SPLIT_ENGINE_FROM_ARTICLE.md) the workspace is generic over the document type, and `as unknown as` between documents is a lint error.

## 8. The public API

### The editor

```tsx
'use client';

import { EmailEditor } from '@builderset/email/editor';
import '@builderset/email/styles.css';

export function TemplateEditor({ template, host }: Props) {
  return (
    <EmailEditor
      document={template.document}
      host={host}
      brand={brand} // colours, logo and fonts the email is painted with
      variables={variables} // what {{ … }} the writer may insert
      onBack={() => router.push('/emails')}
    />
  );
}
```

Props every editor shares. All except `document` and `host` are optional.

| Prop             | Default      | What it does                                                                             |
| ---------------- | ------------ | ---------------------------------------------------------------------------------------- |
| `document`       | —            | The document to edit                                                                     |
| `host`           | —            | The adapter to the parent project: save, upload, publish, revisions ([§11](#11-backend)) |
| `locale`         | `'en'`       | The editor's own language. `'auto'` reads `<html lang>`                                  |
| `locales`        | `{}`         | Extra languages: `{ sq, de }` from `…/locales/sq`. English is built in                   |
| `messages`       | `{}`         | Replace single strings                                                                   |
| `contentLocales` | one language | The languages a document can be written in. One: the language switch is hidden           |
| `theme`          | `'light'`    | `'light'`, `'dark'` or `'auto'` (follow the parent)                                      |
| `tokens`         | `{}`         | Theme values from JavaScript: `{ primary: '#da6c1e', radius: '8px' }`                    |
| `elements`       | `[]`         | The project's own elements, added to the kit's                                           |
| `record`         | —            | The stored row's facts the top bar shows: status, schedule, when it was published        |
| `onRecordChange` | —            | Called when the writer changes one of them                                               |
| `onBack`         | —            | The back button; it guards unsaved work first                                            |
| `storageKey`     | —            | Where the crash-safety copy is kept in `localStorage`. Omitted: no copy                  |
| `savedAt`        | —            | When the server copy was last saved; a newer local copy is offered back                  |

### Rendering

```ts
// Server: a route handler, a server action, a queue worker, a plain Node script.
import { renderEmail } from '@builderset/email/render';

const { html, text, warnings } = renderEmail(document, {
  brand,
  data: { recipient: { name: 'Ana' }, order: { total: 120 } },
  locale: 'en',
  assetUrl: (key) => `https://cdn.example.com/${key}`,
});
```

```tsx
// A Server Component on the site.
import { ArticleRenderer } from '@builderset/article/render';
import '@builderset/article/content.css';

<ArticleRenderer
  document={article.document}
  resolveMedia={(key) => mediaUrl(key)}
  linkComponent={Link} // next/link; optional, <a> by default
  imageComponent={Image} // next/image; optional, <img loading="lazy"> by default
/>;
```

### A custom element

```ts
// `z` is zod, re-exported by the engine so a project's schemas and the editor use one copy of it.
import { defineElement, z } from '@builderset/engine';

export const priceTag = defineElement({
  type: 'price-tag',
  version: 1,
  category: 'plugin',
  icon: 'tag',
  schema: z.object({ amount: z.number().min(0), currency: z.string().length(3) }),
  defaults: () => ({ amount: 0, currency: 'EUR' }),
});
```

The inspector for it is generated from the schema. The project passes the definition to the editor (`elements={[priceTag]}`) and a component for it to the renderer (`elements={{ 'price-tag': PriceTagView }}`).

## 9. Look: deriving the theme from the parent

There are two different surfaces, and they take their look in different ways.

| Surface                 | Where it is seen         | How it is themed                                                        |
| ----------------------- | ------------------------ | ----------------------------------------------------------------------- |
| The editor's own UI     | The parent's back office | CSS variables, following the parent's theme and dark mode               |
| A rendered article      | The parent's site        | The same CSS variables, set by the site                                 |
| An email                | A mail client            | **Literal values** from `brand`. Mail clients do not read CSS variables |
| A popup or page (later) | A visitor's browser      | A theme object written out as CSS variables on the popup or page root   |

### The variables

The editor reads only its own variables. Each has a light and a dark default, so nothing has to be set.

| Variable                          | Used for                                   |
| --------------------------------- | ------------------------------------------ |
| `--builderset-background`         | The workspace ground                       |
| `--builderset-surface`            | Panels, menus, dialogs                     |
| `--builderset-foreground`         | Text                                       |
| `--builderset-muted`              | Quiet surfaces: hover, selected rows       |
| `--builderset-muted-foreground`   | Secondary text                             |
| `--builderset-border`             | Lines                                      |
| `--builderset-primary`            | Selection outlines, primary buttons, links |
| `--builderset-primary-foreground` | Text on primary                            |
| `--builderset-danger`             | Delete, errors                             |
| `--builderset-success`            | Saved, valid                               |
| `--builderset-warning`            | Warnings                                   |
| `--builderset-ring`               | Focus ring                                 |
| `--builderset-radius`             | Corner radius of controls                  |
| `--builderset-font`               | The UI font                                |
| `--builderset-font-mono`          | Code                                       |
| `--builderset-prose-width`        | The reading measure of an article          |

This list is the public contract. It is kept short on purpose: every variable is a promise.

### Three ways to set them, from least to most work

**1. Nothing.** Light theme, built-in look.

**2. One import, for a parent that uses shadcn-style tokens** (`--background`, `--foreground`, `--primary`, `--border`, `--radius`…):

```ts
import '@builderset/engine/theme/shadcn.css';
```

```css
/* What that file contains. */
.builderset {
  --builderset-background: var(--background);
  --builderset-foreground: var(--foreground);
  --builderset-primary: var(--primary);
  --builderset-border: var(--border);
  --builderset-radius: var(--radius);
  --builderset-font: var(--font-sans);
}
```

It is an explicit import and not automatic, because older shadcn projects store colours as bare HSL numbers (`--primary: 222 47% 11%`), which would paint nothing. A second file, `shadcn-hsl.css`, wraps each value in `hsl()` for those projects.

**3. By hand**, in the parent's CSS or from JavaScript:

```css
.builderset {
  --builderset-primary: #da6c1e;
  --builderset-font: 'Poppins', sans-serif;
}
```

```tsx
<EmailEditor tokens={{ primary: '#da6c1e', font: "'Poppins', sans-serif" }} />
```

### Light and dark

| `theme`   | Result                                                                                                                                                    |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `'light'` | Always light. The default                                                                                                                                 |
| `'dark'`  | Always dark                                                                                                                                               |
| `'auto'`  | Follows the parent: an ancestor with class `dark` or `data-theme="dark"` (and the `light` forms), otherwise the operating system. No JavaScript is needed |

The defaults are written with CSS `light-dark()`, the technique [packages/tokens/src/theme.css](../../packages/tokens/src/theme.css) already uses: both values on one line, chosen by `color-scheme`. A token cannot exist in one theme and be missing in the other.

### Things that are easy to get wrong

- **Menus and dialogs render outside the editor's element** (Radix portals go to `<body>`), where the editor's variables do not reach. The editor creates its own portal container carrying the same class, theme attribute and tokens, and every menu, popover and dialog renders into it.
- **The canvas is not the UI.** An email on the canvas is painted with `brand`, not with the editor's variables. A dark editor still shows a light email unless the email's own dark-mode settings say otherwise.
- **No `dark:` utility classes** in the packages. Colours come from tokens that already switch.

## 10. Language

There are two different languages, and they are set separately.

### The editor's own language

- English is built in. `locale` defaults to `'en'`; a project in one language passes nothing.
- Another language is an import, so a project that does not use it does not ship it:

```tsx
import sq from '@builderset/email/locales/sq';
import de from '@builderset/email/locales/de';

<EmailEditor locale={currentLocale} locales={{ sq, de }} />;
```

- `locale="auto"` reads `<html lang>` and follows it when it changes.
- `messages` replaces single strings, in any language.
- A missing string falls back to English. It never shows a raw key.
- Dates and numbers in the editor are formatted with `Intl` for the same locale.

### The languages a document is written in

- One language by default. The language switch and the multi-language toggle are not shown.
- `contentLocales={['sq', 'en', 'de']}` turns multi-language writing on. The document is written once — blocks, layout, images and links are shared — and its words are written again per language, stored beside the tree. This model exists today: [builder-core/src/i18n.ts](../../packages/builder-core/src/i18n.ts).
- A language code is any BCP 47 tag the project passes, not a fixed list.
- The renderers take the reader's language: `renderEmail(doc, { locale: 'de' })`. Words not yet translated read in the base language.

## 11. Backend

**The product does not own the database, the routes, the authentication, the file storage or the mail sending.** These differ in every project, and a package that brought its own would fight each project's setup. The line already exists in the code: `BuilderHost`.

### What the product ships for the backend

| Layer              | What                                                                                               | Form                                                    |
| ------------------ | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| **The contract**   | The document is JSON. A JSON Schema says what is valid. Fixtures show valid and invalid documents  | Files in each kit: `schema.json`, `fixtures/`           |
| **Server helpers** | Check a document, run migrations, render an email, render an article                               | The same npm package on Node; a PyPI package for Python |
| **Host helpers**   | `createRestHost` (talks to a REST API of a documented shape), `createMemoryHost` (demos and tests) | `@builderset/engine/host`                               |
| **Examples**       | Table shapes, Next.js route handlers, a FastAPI router                                             | Code to copy, in `examples/` and on the docs site       |

### How the pieces talk

```
Browser                              Parent project's server                Storage
───────                              ───────────────────────                ───────
<EmailEditor>
   │ host.save(document, 'autosave')
   ├──────────────────────────────►  route: check the user's permission
   │                                 checkEmail(document)  ← schema         ──► JSON column (draft)
   │ ◄──────────────────────────────  { ok, savedAt }  or  { conflict }
   │ host.upload(file)
   ├──────────────────────────────►  route: store the file                  ──► S3 / MinIO / disk
   │ ◄──────────────────────────────  { key, url }
   │ host.publish(document)
   └──────────────────────────────►  route: strict check, copy draft → live ──► JSON column (live)

At send time                         load the live document
                                     renderEmail(document, { data, brand })
                                     hand { html, text } to the mail provider
```

### What a project stores

The shape MotorsAL uses ([api/app/db/models/emails.py](../../api/app/db/models/emails.py)) is the reference. Any database with a JSON column works.

| Column            | Why                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------ |
| `document`        | The live document: what the site renders or the mailer sends                               |
| `draft_document`  | Autosaves and work in progress. May be incomplete; never unsafe                            |
| `draft_saved_at`  | The editor sends back the value it last saw; a different value on the server is a conflict |
| `status`          | `draft`, `published` (and `scheduled`, `archived` where they apply)                        |
| `version`         | Counts publishes                                                                           |
| a revisions table | `document`, `kind` (`autosave`, `manual`, `publish`), `label`, author, time                |
| a sections table  | Saved fragments the writer reuses: `name`, `fragment`                                      |

### The host adapter

A project either writes the adapter (about 300 lines today in [apps/admin/src/components/content/email-builder.tsx](../../apps/admin/src/components/content/email-builder.tsx)) or, if its API follows the documented shape, uses the helper:

```ts
import { createRestHost } from '@builderset/email/host';

const host = createRestHost({
  baseUrl: `/api/emails/${id}`,
  headers: () => ({ Authorization: `Bearer ${token}` }),
  uploadUrl: '/api/uploads',
  resolveMedia: (key) => `https://cdn.example.com/${key}`,
  toast: (kind, message) => toast[kind](message),
});
```

The routes it calls are specified in [step 07](steps/07_HOST_AND_BACKEND_CONTRACT.md).

### Python

The API here already validates both documents and renders emails in Python, byte for byte the same as the TypeScript renderer. That code becomes a PyPI package in the same repository, tested against the same fixtures and released with the same version number ([step 15](steps/15_PYTHON_PACKAGE.md)). Other languages can port against the fixtures.

### Later: a hosted backend

For the portal, `createCloudHost({ apiKey })` would give a project storage, revisions, uploads and sending with no backend of its own. The packages stay free; the hosted service is what is paid for. It is not part of this plan and nothing here depends on it.

## 12. Styles without Tailwind in the parent

The packages are written with Tailwind classes and will stay that way. What changes is who compiles them.

- **Today:** the parent's Tailwind scans the package source. It needs Tailwind 4, an `@source` line per package and MotorsAL's token names.
- **Target:** each package compiles its own stylesheet at build time and ships it. The parent imports one CSS file.

Five rules make the compiled CSS safe to load next to anything:

1. **Every class is prefixed.** `bst:flex`, `bst:hover:bg-primary`. A parent that also uses Tailwind has a `.flex` of its own; `.bst\:flex` cannot collide with it.
2. **Every Tailwind theme variable is prefixed.** `--bst-spacing`. A parent's own `--spacing` is not overwritten.
3. **No global reset.** Only Tailwind's theme and utilities are imported, never its base layer, so the parent's headings, buttons and lists are untouched. The editor resets only its own elements, inside `.builderset`.
4. **No cascade layers.** Tailwind normally puts its output in `@layer theme, base, components, utilities`. Two things go wrong with that in someone else's page. A parent that also uses Tailwind declares the same layer names, and a stylesheet loaded first that declares them in a different order changes the parent's own cascade. And any parent rule written outside a layer — `button { padding: 1rem }` in a plain CSS file — beats every layered rule, whatever its specificity. So the product's CSS is not layered, and ordinary specificity applies: a class beats an element selector.
5. **Theme values are read where the class is used.** The theme is declared `inline`, so a class carries `var(--builderset-primary, …)` itself and not a variable computed once at the top of the page. A value set on the editor's own element, or passed through the `tokens` prop, then takes effect.

This was tried against the version the repository pins (Tailwind 4.3.3). This source:

```css
@import 'tailwindcss/theme.css' prefix(bst);
@import 'tailwindcss/utilities.css' prefix(bst);

@theme inline {
  --color-primary: var(--builderset-primary, light-dark(#2563eb, #6ea8fe));
  --radius-control: var(--builderset-radius, 0.4rem);
}
```

compiles to this, with no `@layer` anywhere and no reset:

```css
:root,
:host {
  --bst-spacing: 0.25rem;
}
.bst\:bg-primary {
  background-color: var(--builderset-primary, light-dark(#2563eb, #6ea8fe));
}
.bst\:rounded-control {
  border-radius: var(--builderset-radius, 0.4rem);
}
.bst\:p-4 {
  padding: calc(var(--bst-spacing) * 4);
}
```

An unprefixed `flex` in the source compiles to nothing, which is why [step 10](steps/10_STYLES_AND_THEMING.md) adds a test that fails on any unprefixed class.

The public variables (`--builderset-*`) and Tailwind's internal ones (`--bst-*`) use different prefixes on purpose, so a public name can never collide with one Tailwind generates.

Emails are not affected: the email renderer writes inline styles and has no classes at all.

## 13. Build and package format

| Choice                       | Decision                                                                                                                                |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Module format                | ESM only                                                                                                                                |
| Output                       | `dist/`, one file per source file, with `.d.ts` beside each                                                                             |
| Client boundaries            | `'use client'` stays at the top of every file that has it today. The `editor` door is client; `core` and `render` doors are not         |
| React                        | `react` and `react-dom` 19 as peer dependencies, marked optional so a server-only install does not warn                                 |
| Node                         | 20 or newer for the server doors                                                                                                        |
| CSS                          | Compiled, prefixed, minified; listed in `sideEffects` so bundlers keep it                                                               |
| Tree shaking                 | `"sideEffects": ["**/*.css"]`; no code runs at import time                                                                              |
| What is published            | `dist/`, `schema/`, `fixtures/`, `README.md`, `LICENSE`. Never `src/` or tests                                                          |
| Checked before every release | `publint`, `@arethetypeswrong/cli`, a script that asserts the `'use client'` lines, and the example apps installed from packed tarballs |

A parent project needs no `transpilePackages`, no `@source` line and no Tailwind.

## 14. Where it is published: npm or GitHub Packages

**Publish to the public npm registry.** Keep the source on GitHub.

Two accounts are involved, and they are independent of each other:

| What         | Where                                                    | Shows as                                                     |
| ------------ | -------------------------------------------------------- | ------------------------------------------------------------ |
| The code     | The owner's personal GitHub account                      | `github.com/xhiti/builderset`                                |
| The packages | An npm organisation named `builderset`, on the free plan | `@builderset/email`, `@builderset/article`, and `builderset` |

The npm organisation is what keeps a personal name out of every package name and import. It does not need a GitHub organisation to exist. The only place the personal account appears to a user is the repository link on each package's page.

| Question                                               | npm (public)                            | GitHub Packages                                                                         |
| ------------------------------------------------------ | --------------------------------------- | --------------------------------------------------------------------------------------- |
| Can anyone run `npm install` with no setup?            | Yes                                     | **No.** Installing needs a GitHub token and an `.npmrc` line, even for a public package |
| Unscoped all-in-one name (`builderset`)                | Yes                                     | No. Only scoped names, and the scope must be the GitHub owner's name                    |
| Where developers look for packages                     | npmjs.com, and every tool reads it      | Rarely                                                                                  |
| Cost for public packages                               | Free                                    | Free                                                                                    |
| Private packages                                       | Needs a paid plan                       | Included with the GitHub plan, within its storage limits                                |
| Publishing from GitHub Actions without a stored secret | Yes, trusted publishing with provenance | Yes, the workflow's own token                                                           |
| MotorsAL's Docker builds                               | Install with no credentials             | Need a token passed into every build                                                    |

The first row decides it. The goal is that any developer installs the package in one command; GitHub Packages cannot do that.

**Before launch**, while the packages are not meant to be seen yet, there are two honest options:

- **Publish early to npm with a pre-release tag** (`0.1.0-alpha.1` under the `alpha` tag). `npm install @builderset/email` still gives nothing until a `latest` version exists; nobody finds it by accident, and MotorsAL can install it with no token. This is the recommended path if the code will be open anyway.
- **GitHub Packages as a private staging registry**, if the code must stay closed until the licence is decided. It fits badly with a personal GitHub account: the scope would be the account's name (`@xhiti/email`), and MotorsAL's builds need a token until the switch to npm. [Step 13](steps/13_PUBLISHING_AND_RELEASES.md) has the configuration for both.

Do not publish to both registries permanently: two places to keep in step, for no gain.

The Python package goes to PyPI the same way: public, published from GitHub Actions with trusted publishing.

## 15. Versions and promises

**One version number for everything.** `@builderset/engine`, every kit, `builderset` and the Python package are released together with the same version. Two kits in one project then always share one engine, and "which versions work together" has one answer.

**Semantic versioning, strict from 1.0.** Before 1.0, minor versions may break the JavaScript API, never the stored format without a migration.

**The document format is the strongest promise.** Other people's databases will hold these documents.

- Every document carries `schema` and `version`; every node carries the version of its element (`v`). Both exist today ([builder-core/src/document.ts](../../packages/builder-core/src/document.ts)).
- A format change always comes with a migration. `parseEmail` and `parseArticle` run migrations when a document is read; a document written by any released version must open in every later one.
- A fixture of every released format version is kept forever and tested.
- A newer document opened by an older package is refused with a clear message, never half-read.

**Other promises**

- The CSS variable names in [§9](#the-variables).
- The names exported from each `index.ts`.
- The JSON Schema file and the fixture layout.
- What is not exported, and anything under `unstable_`, may change in any release.

## 16. Licence and business model

A decision for [step 01](steps/01_DECISIONS_AND_ACCOUNTS.md). The options:

| Option                                  | For                                                                | Against                                                     |
| --------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------- |
| **MIT** for every package (recommended) | The easiest to adopt; companies install it without asking a lawyer | Anyone may build a competing service on it                  |
| MIT core, paid "pro" kits               | Income from packages                                               | Two code bases, licence keys, support for both              |
| Source-available (BSL, Elastic-style)   | Blocks competing hosted services                                   | Many companies will not install it; not "open source"       |
| Closed, paid npm packages               | Full control                                                       | Slow adoption; a private registry and licence server to run |

The recommendation is MIT packages and a paid hosted service later ([§11](#later-a-hosted-backend)): the packages bring developers, the portal earns.

## 17. Not in scope

- A backend package with tables and routes. Examples, yes.
- Sending email, subscriber lists, queues, analytics storage.
- Vue, Svelte or Angular editors. React only. A non-React parent can embed the editor in an iframe later ([FEATURES.md](FEATURES.md)).
- CommonJS builds, React 18, Tailwind 3.
- Real-time collaboration in the first version.
- The portal itself. The page builder is a kit the portal will use.

## 18. Words used in these documents

| Word          | Meaning                                                                                                 |
| ------------- | ------------------------------------------------------------------------------------------------------- |
| **Engine**    | The shared package: the document tree, the operations, the workspace                                    |
| **Kit**       | One kind of document on top of the engine: its elements, its renderer, its editor                       |
| **Workspace** | The editor screen: top bar, side panels, canvas, inspector                                              |
| **Profile**   | What a kit gives the workspace to make it that kit's editor (`EditorProfile`)                           |
| **Host**      | The adapter the parent project supplies for everything that leaves the browser (`BuilderHost`)          |
| **Parent**    | The project the package is installed in                                                                 |
| **Element**   | One block type: a schema, defaults, placement rules. Emails call them blocks                            |
| **Registry**  | The set of elements a document may contain                                                              |
| **Document**  | The saved JSON: a flat record of nodes, a root, `meta`, and the words in other languages                |
| **Fixture**   | A committed example document that both the TypeScript and the Python side must accept, refuse or render |
| **Door**      | An entry point of a package: `@builderset/email/render`                                                 |
