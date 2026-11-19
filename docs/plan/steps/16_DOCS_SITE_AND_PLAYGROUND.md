# 16 — Docs site and playground

## Goal

A developer who has never seen the code can put the email editor into a Next.js project, save a template to their own database and send it, by following the site. They can try both editors in the browser before installing anything.

## Why

A package without documentation is used only by its author. For a product whose pitch is "it fits into your project", the documentation is where a developer finds out whether that is true, and the playground is the fastest proof.

This plan folder is not that documentation. It explains how the product is built; the site explains how it is used.

## Before you start

- Milestone M2: the packages are published and the examples exist. The examples are the source of most code on the site.
- This step does not depend on steps 14 or 15 and can run beside them. The Python page waits for step 15.

## The work

### 1. The site

`apps/docs` in the product's repository: a Next.js app with a documentation framework that reads MDX — Fumadocs or Nextra. Next.js, because the playground and every live example on the site are the product's own React components, used through the published entry points. The site is the fourth example app.

- It installs the packages the way the examples do in dev mode (workspace links), and the release workflow deploys it after each release.
- Host it on any static-capable host. Point the domain from step 01 at it.
- Search: the framework's built-in search is enough at this size.

### 2. The page tree

```
Getting started
├── What it is                 one page: the engine, the kits, what a project supplies
├── Quick start: email         install → editor page → host → send. Next.js, 10 minutes
├── Quick start: article       install → editor page → host → show on the site
└── Install                    every package, what each is for, the all-in-one package

Guides
├── Frontend setup             the editor in Next.js (App Router), in Vite; client boundaries; lazy loading
├── Theme                      the 16 variables; light, dark, auto; the shadcn preset; tokens from JavaScript
├── Language                   the editor's language; content languages
├── The host adapter           every method; createRestHost; createMemoryHost; writing one
├── Backend setup              what to store; the routes; validation; conflicts; publishing; uploads
│   ├── Next.js + Drizzle      a complete, tested example
│   ├── Next.js + Prisma
│   └── FastAPI + SQLAlchemy
├── Sending email              render on the server; variables; brand; fonts; social icons; dark mode
├── Showing articles           the renderer; next/link and next/image; structured data; content.css
├── Custom elements            define, register, render; the inspector from the schema
├── Content types              news, job posts: extra fields and a restricted element set
├── Security                   the checklist; Content-Security-Policy; what the server must never trust
└── Upgrading                  versions; the stored format and migrations; the changelog

Reference
├── Email                      document shape, every block, variables, formats, renderEmail options
├── Article                    document shape, every element, renderer options
├── Engine                     EditorProfile, registry, operations — for people building a kit
├── Props                      every prop of every exported component
├── CSS variables              the list, with defaults
├── Host                       the BuilderHost interface; the REST shape
├── Issues                     every issue code, what causes it, how to fix it
└── Python                     builderset on PyPI

Playground
```

The content of **Frontend setup**, **Backend setup** and **The host adapter** is already drafted in [INTEGRATION_GUIDE.md](../INTEGRATION_GUIDE.md). Move it to the site, then keep one copy: the site.

### 3. Rules for the content

| Rule                                                                                        | Why                                                                                                                         |
| ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Every code block on the site is a file in `examples/` or `apps/docs`, included by reference | Code that is compiled and tested cannot go stale. Typed-in snippets do                                                      |
| A quick start ends with something working on screen                                         | "Now build your backend" is where people leave                                                                              |
| Each guide starts with what the reader will have at the end, and how long it takes          |                                                                                                                             |
| The reference is generated where it can be                                                  | Props from the TypeScript types; elements from the registry; issue codes from the catalogue; CSS variables from `theme.css` |
| Every page says which version it describes                                                  | The API changes before 1.0                                                                                                  |
| Plain words; short sentences                                                                | Many readers are not native English speakers                                                                                |

Write a generator for the three reference pages that can be produced from the code, and run it in the docs build:

| Page                    | Generated from                                                                                                                                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Every block and element | `createEmailRegistry()` and `createArticleRegistry()`: type, category, props from the zod schema (`z.toJSONSchema`), defaults, where it may be placed, plus the name and description from the English locale |
| Issues                  | The issue codes in the locale file, with their messages                                                                                                                                                      |
| CSS variables           | `packages/engine/src/theme/theme.css`                                                                                                                                                                        |

### 4. The playground

One page, `/playground`, with both editors running on `createMemoryHost`. Nothing is sent anywhere.

| Control                    | Does                                                                                                                                      |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Kit                        | Email or article                                                                                                                          |
| Template                   | A few starting documents, the "kitchen sink" with every block among them                                                                  |
| Theme                      | Light, dark, auto; and a toggle for the page's own `dark` class, to show "auto" following it                                              |
| Brand colour, radius, font | Sets `--builderset-primary`, `--builderset-radius`, `--builderset-font` live                                                              |
| Editor language            | The languages that ship                                                                                                                   |
| Content languages          | One, or several, to show the language switch appearing                                                                                    |
| **Output**, a side panel   | Three tabs: the document as JSON; for email, the rendered HTML in a sandboxed frame and the plain text; for an article, the rendered page |
| Copy                       | The JSX for the current settings, and the CSS for the current theme                                                                       |
| Reset                      | Back to the template                                                                                                                      |

Keep the document in `localStorage` so a reload does not lose it. Say on the page that uploaded images live only in this tab.

The "Copy" control is the bridge from trying to installing: what the developer saw is what they paste.

### 5. The three backend examples

Each is a complete, small project in `examples/backends/`, tested in CI against a real database in a container:

| Example              | Contains                                                                                                                                                    |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `next-drizzle`       | The tables as a Drizzle schema with a migration; route handlers for the REST shape; uploads to local disk with a note for S3; `renderEmail` in a send route |
| `next-prisma`        | The same with Prisma                                                                                                                                        |
| `fastapi-sqlalchemy` | The same in Python with the PyPI package; an Alembic migration                                                                                              |

Each test: create a template, save a draft, save again with a stale `expected_saved_at` and expect `409`, publish, render, and check an invalid document is refused with `422` and the right issue code.

The table shapes came from the integration guide's "What to store" (now [Backend setup](https://docs-builderset.vercel.app/docs/guides/backend)), which took them from MotorsAL's working tables.

### 6. The landing page

One screen, in this order:

1. One sentence: what it is.
2. A live editor, not a screenshot — the playground's email editor, small.
3. Three facts: one engine for every kind of content; takes your theme and language; your database, your API.
4. `npm install` and the ten-line example.
5. The kits, with their state: available, coming.
6. Links: docs, GitHub, npm.

No pricing, no sign-up, until there is something to price.

### 7. The repository's own files

Before the repository becomes public:

| File                 | Contains                                                                                      |
| -------------------- | --------------------------------------------------------------------------------------------- |
| `README.md`          | The landing page's content in short form, a picture, the badge row (npm version, CI, licence) |
| `CONTRIBUTING.md`    | How to run it; how to add a changeset; the registry rules from step 13; how to add a language |
| `SECURITY.md`        | Where to report a vulnerability, and what answer to expect and when                           |
| `CODE_OF_CONDUCT.md` | A standard one                                                                                |
| Issue templates      | Bug (version, kit, framework, a reproduction link — a fork of an example), feature request    |
| `docs/plan/`         | This folder. Leave it in: how a project was designed is useful to contributors                |

Read the whole git history once more for anything private before changing the visibility (step 08, part 2).

### 8. Going public — milestone M4

On one day:

1. `pnpm changeset pre exit`, a changeset for `0.5.0`, release. The packages get a `latest` tag for the first time.
2. Make the repository public.
3. Deploy the site to its domain.
4. Check from a clean machine: the quick start, top to bottom, with a stopwatch.

Then tell people. Where, and whether to, is a decision for the owner, not for this plan.

## Check

**The stranger test.** Give the quick start to a developer who has not seen the code. Say nothing. Watch.

| They must be able to                                          | Within     |
| ------------------------------------------------------------- | ---------- |
| See the email editor running in a new Next.js app             | 10 minutes |
| Make it match their app's colours and dark mode               | 5 more     |
| Save a template to their own database through their own route | 30 more    |
| Send that template as an email with a variable filled in      | 15 more    |

Every place they stop, guess or go to read the source is a bug in the docs. Fix and repeat with a second person.

Automatic checks, in the docs build: every internal link resolves; every included code file exists; the generated reference pages are up to date; the playground's page passes the same browser smoke test as the examples.

## Done when

- [ ] `apps/docs` builds and is deployed; the domain points at it.
- [x] Every page in the tree exists. The reference pages for elements, issues and CSS variables are generated.
- [x] No code block on the site is typed in by hand.
- [ ] The playground runs both editors with all the controls, and its "Copy" output works when pasted into the Vite example.
- [ ] The three backend examples pass their tests in CI.
- [ ] Two developers passed the stranger test within the times.
- [x] The repository's own files are in place. (SECURITY.md and CODE_OF_CONDUCT.md report through GitHub's private reporting until step 01 decides the project's email.)
- [ ] `0.5.0` is published as `latest`, the repository is public, the site is live.

## Traps

- **Writing the reference first.** It is the easiest to write and the last thing a new reader needs. Write the two quick starts first, test them on a person, then the guides, then the reference.
- **Explaining the architecture in the quick start.** A new reader wants an editor on screen. "What it is" is one page they can skip.
- **A playground that needs a backend.** Then it needs hosting, limits and moderation. `createMemoryHost` and `localStorage` are enough.
- **Documentation for features that do not exist.** The popup and page kits are "coming" on the landing page and have no guide until they ship.
- **Two copies of the integration guide.** When its content moves to the site, replace the file in the plan folder with a link.

## How it was done (2026-11-19)

**The site** (`apps/docs`, Fumadocs 16 on Next 16.4.6 for this app only). Builderset's own look: electric indigo on cool neutrals, the three-block mark and its tints, Geist, a hero whose document assembles from blocks, scroll-driven reveals, a steps timeline; every animation is off under `prefers-reduced-motion`. Vercel builds it as the project `docs-builderset` (root `apps/docs`; `apps/docs/vercel.json` has the monorepo commands).

**The pages.** Getting started (What it is, both quick starts, Install); eleven guides plus Going live, which took the integration guide's checklists and questions; the backend guide with one page per example; the reference: Email, Article, Engine, Host by hand, and Email blocks, Article elements, Props, CSS variables and Issues generated by `scripts/generate-reference.mjs` from the built kits and the READMEs' prop tables (the docs build writes them; `pnpm test` fails when one is stale). `INTEGRATION_GUIDE.md` is now a map from its old sections to the pages.

**No hand-typed code.** Every block is `<include cwd>` of an example, a type-checked snippet in `apps/docs/snippets/` (the Python one runs in `python/tests/test_docs_snippets.py`), or a `// #region` of a package source. `BACKEND.md` is included section by section, so the backend page and the package's copy are one text. The link check (`scripts/check-links.mjs`) counts an included Markdown file's headings as the page's own.

**The backend examples** (`examples/backends/`): `next-drizzle`, `next-prisma`, `fastapi-sqlalchemy`, the same routes and answers. Nine tests each against a real Postgres (Testcontainers locally, a service container in `.github/workflows/backends.yml`): create, draft, a stale save → 409, publish, send, every invalid fixture → 422 with its code, a draft that saves but cannot publish, uploads. The tests read `TEST_DATABASE_URL`, never `DATABASE_URL`. The conflict column is `saved_at` and changes on publish too, or the save after a publish would be a false 409.

**The landing page** (`apps/landing`, builderset.vercel.app, Vercel project `builderset`, root `apps/landing`): one screen in the order of part 6. The live editor is the real email editor with a memory host, fetched when its frame nears the screen (a note and the playground link on a phone), in a box with `contain: layout` and no transform above it. The install line and the example are highlighted by shiki at build time from files.

**The repository's files.** README with badges (they resolve once the repository and npm packages are public), the editor's picture and the landing page's three facts; CONTRIBUTING's "Adding a language"; CODE_OF_CONDUCT (Contributor Covenant 2.1); SECURITY's supported versions; a bug template asking for the kit, the framework and a reproduction.

**Left:** the deployment and domains (the owner connects both Vercel projects), the backends workflow's first run on GitHub, the playground's "Copy" pasted into the Vite example by hand, the stranger test with two developers, and M4.

**Known gaps written into the docs**: the article editor has no `elements` prop, so a custom element is blank on the canvas; `renderEmail` draws only its own blocks; email formats are sq/en/de in Europe/Tirane (ROADMAP); the generated Issues page lists only codes with an English message (`i18n.locale.unknown` has none); `next-shadcn`'s draft route answers `not_an_email` without codes where the backend examples return the real issues.
