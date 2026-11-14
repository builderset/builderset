# 06 — Move MotorsAL content out

## Goal

Nothing in `packages/engine`, `packages/article` or `packages/email` is about marrimauto.com. What is MotorsAL's own lives in one private package that stays in this repository for good.

## Why

Sixteen files in the generic packages mention MotorsAL or marrimauto:

```bash
git grep -liE "marrimauto|blejm|MotorsAL" -- packages/builder-core packages/builder-render packages/builder-react packages/email-core packages/email-render packages/email-react
```

(After step 03 the folders are `packages/engine`, `packages/article` and `packages/email`.) They fall into five groups:

| What                                 | Where today                                                                                                                                                                                | Why it cannot be published                                                                                                               |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Ten email designs                    | [email-core/src/designs/](../../../packages/email-core/src/designs/): valuation offer, member invitation, application received…                                                            | MotorsAL's emails, in marrimauto.com's colours ([palette.ts](../../../packages/email-core/src/designs/palette.ts): `ORANGE = '#da6c1e'`) |
| Golden cases built on those designs  | [email-render/src/golden.test.ts](../../../packages/email-render/src/golden.test.ts), which also writes `api/app/domains/notifications/staff_email.json`                                   | A generic package's test writes a MotorsAL application file                                                                              |
| The old article body converter       | [builder-core/src/legacy.ts](../../../packages/builder-core/src/legacy.ts)                                                                                                                 | It converts MotorsAL's pre-builder article format                                                                                        |
| Article fields in the settings panel | [builder-react/src/inspector/document-settings.tsx](../../../packages/builder-react/src/inspector/document-settings.tsx): category, featured, and the site's address in the search preview | MotorsAL's article columns                                                                                                               |
| Social icons for emails              | Served from the site: `<site>/email/social/<network>-<style>.png`, files in `apps/web/public/email/` ([email-render/src/context.ts](../../../packages/email-render/src/context.ts))        | Another project has no such files                                                                                                        |

## Before you start

- Step 03 is merged.

## The work

### 1. Create the package that stays

`packages/builder-presets` — `@motors/builder-presets`, private, never extracted. It depends on `@motors/email` and `@motors/article`.

```
packages/builder-presets/
├── src/
│   ├── email-designs/      the ten designs, palette.ts, parts.ts
│   ├── index.ts
│   └── golden.test.ts      the golden cases that use the designs
└── package.json
```

### 2. Move the email designs

```bash
git mv packages/email/src/core/designs packages/builder-presets/src/email-designs
```

Then:

- Remove the ten `export * from './designs/…'` lines from `packages/email/src/core/index.ts`.
- **`sample.ts`.** Every design imports it (`block`, `mapWords`, `tr`, `Words`). Split by use: `starterEmail` and helpers that build a block or a sample document for any email stay in the email kit and are exported; helpers that only the designs use move with them.
- **The importers.** No app imports the design functions (`newsletterEmail`, `valuationOfferEmail`, …). The only caller is `golden.test.ts`, which renders each design and writes the result as JSON files the API reads. So the designs reach MotorsAL as generated files, and moving them changes one test file (part 3). The admin's `starterEmail`, `createEmailDocument` and `createEmailRegistry` imports are generic and stay as they are.

### 3. Split the golden test

`golden.test.ts` has one list of cases. Some are neutral documents that test the renderer; others render MotorsAL's designs.

| Cases                                        | Stay in / move to                             | Written to                                                                                  |
| -------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Neutral documents: every block, every layout | `packages/email/src/render/golden.test.ts`    | `api/tests/fixtures/email/golden/kit/`                                                      |
| The ten designs, `staff_email.json`          | `packages/builder-presets/src/golden.test.ts` | `api/tests/fixtures/email/golden/motors/`, `api/app/domains/notifications/staff_email.json` |

- Move the fixture files with `git mv` into the two sub-folders, so their content is seen not to change.
- [api/tests/unit/test_email_render_parity.py](../../../api/tests/unit/test_email_render_parity.py) reads both sub-folders.
- If the neutral cases alone do not cover every block and every `RowLayout`, add neutral cases until they do. After the extraction they are the only thing holding the two renderers together in the new repository.

`render_data.json` (data the Python renderer needs: fonts, layouts) is generic. It stays with the email kit's test.

### 4. The legacy converter

`fromLegacyBody` is imported only by the package's own tests (`fixtures.test.ts`, `import.test.ts`) and exported from the index. No app imports it.

Decide by ADR 0009's last line — "`body` stays for now as the fallback the site renders while `document` is NULL":

- **If every article row has a `document`** and the `body` column is no longer read: delete `legacy.ts`, its tests and its fixture cases, here and on the Python side.
- **If `body` is still read anywhere:** move `legacy.ts` and its tests to `packages/builder-presets/src/legacy.ts`.

Either way, the fixture cases named for legacy documents leave the article kit's fixtures.

### 5. The article's extra fields

`document-settings.tsx` (in the article kit since step 03) mixes two kinds of field:

| Field                                                     | Belongs to               |
| --------------------------------------------------------- | ------------------------ |
| Title, excerpt, cover, SEO fields, slug, status, schedule | Any article: stay        |
| Category, the category list, featured                     | MotorsAL's article table |
| The site address shown in the search preview              | The project: an option   |

Give the article editor two options:

```ts
export interface ArticleEditorProps {
  // …
  /** Shown in the search-result preview: `https://example.com/blog`. */
  siteUrl?: string | undefined;
  /** Extra sections in Document settings, below the built-in ones. */
  settingsSections?: readonly SettingsSection[] | undefined;
}

export interface SettingsSection {
  id: string;
  title: string;
  render: () => ReactNode;
}
```

`ArticleFacts` loses `category`, `categories` and `featured`. The admin's `article-builder.tsx` keeps them in its own state and passes one section that renders its category select and featured switch. The fields look the same and sit in the same place.

This is the small version of the "content types" feature in [FEATURES.md](../FEATURES.md); a schema-driven version can replace it later without changing what the admin stores.

### 6. Social icons

The email renderer builds icon addresses from a base the project passes (`socialIconBase`), and the PNG files are in the site's `public/` folder. A published package must carry its own files.

- Copy the PNG files into `packages/email/icons/social/` and list the folder in the manifest's `files` (step 09).
- Keep `socialIconBase` as the option. A project copies the folder to any public address and passes that address. Emails need absolute public addresses, so there is no default that works without hosting the files somewhere.
- After publishing, a CDN that mirrors npm serves the files at a versioned address (`https://cdn.jsdelivr.net/npm/@builderset/email@<version>/icons/social/`). Document it as the zero-setup option, with its cost: a third party's server in every email. MotorsAL keeps serving its own copies.

### 7. Sweep the comments

The remaining matches are comments and test data: `registry.ts` ("the MotorsAL elements are written against nothing else"), `convert.test.ts`, addresses in fixtures. Reword comments to speak of "the built-in elements" and "the host"; replace marrimauto.com in test data with `example.com`. Changing test data changes fixtures: regenerate, and read the diff.

## Check

```bash
pnpm lint && pnpm typecheck && pnpm test
git grep -liE "marrimauto|blejm|MotorsAL" -- packages/engine packages/article packages/email     # nothing
cd api && uv run pytest tests/unit/test_email_render_parity.py tests/unit/test_designed_email_data.py
```

On screen: create an email template from each ready-made design in the admin and compare with a screenshot from before; open an article's Document settings and check category and featured still save.

## Done when

- [x] `packages/builder-presets` holds the designs, their golden cases and (if kept) the legacy converter.
- [x] The search above finds nothing in the three generic packages.
- [x] The email kit's golden cases are neutral and cover every block and layout.
- [x] The parity test reads `golden/kit/` and `golden/motors/` and passes.
- [x] `ArticleFacts` has no MotorsAL column; the admin supplies its fields through `settingsSections`.
- [x] The social icons are files inside the email package.
- [x] Creating a template from each design gives the same email as before.

## Traps

- **The designs import private helpers.** If a design reaches into `../fields` or `../rich-text` by relative path, it needs those names exported from `@motors/email`. Export them; do not copy the helpers.
- **Golden files that "moved" but also changed.** Use `git mv` and check `git diff --stat -M` shows renames at 100%.
- **Deleting `legacy.ts` too early.** Check the database, not the code: `SELECT count(*) FROM content.article WHERE document IS NULL` on production must be zero before the converter and the `body` fallback go. This is a read; it changes nothing.
- **The coverage gap.** The designs were, by accident, a thorough test of the renderer. When they leave, look at the coverage of `html.ts` under the neutral cases alone and fill what dropped.

## How it was done (2026-11-11)

Two commits: the moves alone (`git mv`, every file a 100% rename), then the changes that make them build. Where the work differed from the parts above:

| Part | What the plan said                                                  | What was done                                                                                                                                                                                                                                                                                                                                                                                                                       | Why                                                                                                                                           |
| ---- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 2    | Split `sample.ts` by use                                            | `buildEmail`, `starterEmail` and the outline helpers stay in the email kit. The words-in-every-language helper became generic: `inLanguages({ en, de })` and a `locale` option on `buildEmail` (default `en`). MotorsAL's `tr('Po', 'Yes', 'Ja')` is now two lines in the presets' `palette.ts` on top of it, and every design passes `locale: DESIGN_LOCALE` (`sq`)                                                                | The kit had `sq`/`en`/`de` written into `buildEmail`; a design-only helper could not be moved without the builder it feeds                    |
| 3    | Neutral cases until every block and layout is covered               | One new neutral email, `layouts`, rendered in `en`, `de` and `fr` (the fallback): the three row layouts nothing else used (`25-75`, `75-25`, `33-33-33`), boxed columns, a row that does not stack, a block font, a variable falling back, a translated menu and a footer with every link off. With it the neutral cases alone reach the same lines and branches of the Python renderer and `content_i18n.py` as all cases together | Measured with `pytest --cov --cov-branch` on `-k kit/` against all cases; the first measurement showed exactly these gaps                     |
| 3    | Neutral cases keep their data                                       | `starter-sq` and `edges` used the site's brand kit; they now use `example.com`, which changed only the brand name and address lines in those two cases                                                                                                                                                                                                                                                                              | Part 7                                                                                                                                        |
| 4    | Delete or move `legacy.ts`                                          | Moved to `packages/builder-presets/src/legacy.ts` with its test. The legacy fixture is now `api/tests/fixtures/builder/motors/legacy.json` (same content), written by the presets' test; the API's tests read it from there                                                                                                                                                                                                         | The site still renders `body` when `document` is NULL (`apps/web/src/app/blog/[slug]/page.tsx`), so the database question did not need asking |
| 5    | `settingsSections` below the built-in ones, `{ id, title, render }` | `{ id, tab, before?, render }`: a section names its tab and the built-in field it goes above (`SETTINGS_FIELDS`), or the end. `SettingsFieldRow` is exported so a host's field has the same label. The admin passes the category before the cover and "featured" before the reading time, and changes them with `useRecord()`, which marks the work unsaved as before                                                               | So the fields "sit in the same place": category was in the middle of General, featured at the top of Publishing                               |
| 5    | —                                                                   | `siteUrl` drives the slug field too (`/blog/<slug>` came from it), not only the search preview. The admin passes `${siteUrl}/blog`                                                                                                                                                                                                                                                                                                  | The slug field had `/blog/` written in                                                                                                        |
| 5    | —                                                                   | The words went with the fields: `category` left the engine's messages, `featured`/`featuredHint` left the article kit's, and the admin's catalogue has them under `editorial`. German "featuredHint" was missing and read English; it is translated now                                                                                                                                                                             | —                                                                                                                                             |
| 6    | Copy the icons; keep `socialIconBase`                               | As planned, plus `socialIconsAt(folder)` for icons served from any folder (`socialIconUrl(site)` is it with `<site>/email/social`). `packages/email/icons/README.md` says how to host them and gives the CDN address with its cost. Listing the folder in `files` waits for step 09                                                                                                                                                 | —                                                                                                                                             |
| 7    | Sweep the comments                                                  | Also the editor UI kit's header and the engine README, which named MotorsAL's `@motors/ui`. The lint rule now refuses `@motors/builder-presets` in the three packages                                                                                                                                                                                                                                                               | —                                                                                                                                             |

**Checks.** The presets' golden test, run before anything was regenerated, produced all 35 design cases, `staff_email.json` and the legacy fixture byte for byte; it runs in Node with no DOM. The API's parity test reads `golden/kit/` (9 cases) and `golden/motors/` (35); the API's 707 unit tests and the 38 article and email integration tests pass, the latter against a scratch database. The article editor's DOM, with the admin's two fields passed as sections, matches a checkout of the previous commit in every settings tab; the only differences were the autosave indicator, which also differs between two runs of the old code. No screenshot pass was run, and the admin has no "create from a ready-made design" screen: the designs reach it as these golden files.
