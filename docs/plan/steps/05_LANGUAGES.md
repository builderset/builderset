# 05 — Languages

## Goal

The editor speaks English unless it is told otherwise, and another language is a separate file a project imports. A document can be written in any language a project chooses, or in one, which is the default.

## Why

Two different things are fixed to MotorsAL's three languages today.

**The editor's own words.** [builder-react/src/messages.ts](../../../packages/builder-react/src/messages.ts) is 1,035 lines: the `EditorMessages` interface, then English, Albanian and German in one file, joined in `CATALOGUE = { en, sq, de }`. Every project would ship all three. The email editor has the same shape in 434 lines ([email-react/src/messages.ts](../../../packages/email-react/src/messages.ts)) and the article renderer in 147 ([builder-render/src/messages.ts](../../../packages/builder-render/src/messages.ts)).

**The languages a document can hold.** [builder-core/src/i18n.ts](../../../packages/builder-core/src/i18n.ts) declares `CONTENT_LOCALES = ['sq', 'en', 'de'] as const`, and the `ContentLocale` type and the JSON Schema are built from it. A French document is invalid. The Python side repeats the list: `CONTENT_LOCALES = ("sq", "en", "de")` in [api/app/core/content_i18n.py](../../../api/app/core/content_i18n.py).

The editor's language also arrives through the host today (`host.locale`, `host.contentLocale`, read in nine places), although language has nothing to do with saving or uploading.

## Before you start

- Step 03 is merged (the element names move to the kits here).
- Step 04 is best merged first: it adds words to `EditorMessages`.

## The work

### Part A — the editor's own words

#### 1. One file per language

```
packages/engine/src/
├── editor/messages.ts          the EditorMessages interface, resolveMessages(), nothing else
└── locales/
    ├── en.ts                   export const en: EditorMessages
    ├── sq.ts
    └── de.ts

packages/article/src/locales/   en.ts, sq.ts, de.ts   element names, document-settings words, renderer words
packages/email/src/locales/     en.ts, sq.ts, de.ts   block names, settings words
```

Move by cutting, not retyping: lines 339–596 of `messages.ts` are English, 597–846 Albanian, 847–1018 German; the element names are at 201–338.

- The engine's catalogue keeps only what the workspace says: the top bar, panels, inspector, dialogs, save states.
- **Element names leave the engine.** `EN_ELEMENTS`, `SQ_ELEMENTS` and `DE_ELEMENTS` name article elements (`heading`, `gallery`, `faq`); they go to the article kit. The email kit already keeps its own.
- The renderer's words (`RENDER_MESSAGES`) go into the article kit's locale files, under their own key.

#### 2. What a locale file exports

A kit's file contains everything that kit's editor needs, so a developer imports one file per language:

```ts
// packages/email/src/locales/sq.ts
import { sq as engine } from '@motors/engine/locales/sq';

import type { EmailLocale } from '../editor/messages';

const sq: EmailLocale = {
  code: 'sq',
  engine,
  email: {/* the email editor's words */},
  elements: {/* block names and descriptions */},
};

export default sq;
```

Add the entries to the manifests: `"./locales/*": "./src/locales/*.ts"`.

Typing every file as `EmailLocale` (or `EditorMessages`) is what catches a missing key: the type checker fails the build.

#### 3. The props

On `BuilderEditor` and on every kit's editor:

```ts
/** The editor's own language. `'auto'` follows <html lang>. Default: 'en'. */
locale?: string | undefined;
/** Other languages, by code. English is built in. */
locales?: Record<string, Locale> | undefined;
/** Replace single strings, in whatever language is active. */
messages?: DeepPartial<EditorMessages> | undefined;
```

`resolveMessages(locale, locales, messages)`:

1. Start from English.
2. Lay the chosen language over it, key by key. A missing key keeps the English word.
3. Lay `messages` over that.
4. For a code with a region (`sq-AL`) and no exact match, try the language alone (`sq`).

The engine imports only `locales/en.ts`. Check the result: a build of an app that passes no `locales` must not contain an Albanian or German string.

#### 4. `locale="auto"`

```ts
/** <html lang>, kept up to date. */
export function useHtmlLang(): string {
  return useSyncExternalStore(
    (notify) => {
      const observer = new MutationObserver(notify);
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
      return () => observer.disconnect();
    },
    () => document.documentElement.lang || 'en',
    () => 'en',
  );
}
```

#### 5. Language leaves the host

Remove `locale` and `contentLocale` from `BuilderHost`. Replace the nine `host.locale` and `host.contentLocale` reads with the values from the editor's context. The admin's two adapters stop setting them and pass props instead.

#### 6. Dates, numbers and relative time

`EditorMessages` has functions such as `minutesAgo(minutes)` and `savedAgo(when)`. Replace them with `Intl.RelativeTimeFormat` and `Intl.DateTimeFormat` for the active locale, and delete those keys. Fewer strings to translate, and every language the browser knows is correct without a catalogue.

#### 7. Tests

- Every locale file has a non-empty value for every key (walk the object; an empty string fails).
- `resolveMessages('fr', {}, {})` returns English.
- `resolveMessages('sq-AL', { sq }, {})` returns Albanian.
- An editor rendered with no `locale` shows English words.

### Part B — the languages a document is written in

#### 1. Any language code

In `packages/engine/src/core/i18n.ts`:

- Delete `CONTENT_LOCALES` and `isContentLocale`.
- `export type ContentLocale = string;`
- Validate a code by shape, not by list:

```ts
/** A BCP 47 tag, as far as we need it: `en`, `sq`, `pt-BR`, `zh-Hant`. */
export const LOCALE_CODE = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8}){0,2}$/;
```

- `translations` becomes `z.record(z.string().regex(LOCALE_CODE), translationSchema)`.

Which languages a _project_ allows is a second question, answered by the project:

```ts
checkArticle(document, registry, { locales: ['sq', 'en', 'de'] });
```

A document holding a language outside that list gets the issue `i18n.locale.unknown` — a warning on a draft, an error on publish.

#### 2. The props

```ts
/** The languages a document can be written in. One language: no language switch. Default: [locale]. */
contentLocales?: readonly string[] | undefined;
/** The language a new document's tree is written in. Default: the first of `contentLocales`. */
defaultContentLocale?: string | undefined;
```

With one content language, `LanguageSwitch` and `MultilingualToggle` ([chrome/language-switch.tsx](../../../packages/builder-react/src/chrome/language-switch.tsx)) render nothing. The admin passes `contentLocales={['sq', 'en', 'de']}` and looks as it does today.

#### 3. The contract changes — the one place fixtures are regenerated

The JSON Schema's list of three languages becomes a pattern. This is a deliberate change to the generated files:

```bash
UPDATE_FIXTURES=1 pnpm --filter @motors/article test
UPDATE_FIXTURES=1 pnpm --filter @motors/email test
git diff --stat api/
```

Read the diff. It should show the locale enum replaced by the pattern in the two schema files and nothing else. A changed golden HTML file means something else changed too.

On the Python side:

- [api/app/core/content_i18n.py](../../../api/app/core/content_i18n.py): `CONTENT_LOCALES` becomes MotorsAL's configuration, passed in by the callers, not a constant of the module that will become a package in step 15.
- The two validators ([content/document.py](../../../api/app/domains/content/document.py), [email_builder/document.py](../../../api/app/domains/email_builder/document.py)) accept the allowed list as an argument and report `i18n.locale.unknown`.

Stored documents need no migration: `sq`, `en` and `de` are valid codes under the new rule.

#### 4. Formats in emails

An email formats dates and money for the reader's language (`{{ order.total | money }}`). In TypeScript that is `Intl`, which knows every language. In Python it is a table ([render/formats.py](../../../api/app/domains/email_builder/render/formats.py)) that knows three. Do not change it here; write it down for step 15, where the Python package needs a general answer.

## Check

```bash
pnpm lint && pnpm typecheck && pnpm test
cd api && uv run pytest tests/unit/test_article_document.py tests/unit/test_email_document.py tests/unit/test_email_render_parity.py
```

On screen:

| Case                                                                     | Expect                                                           |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| The admin in `sq`, `en` and `de`                                         | Each editor fully in that language, element names included       |
| A scratch page that renders the editor with no `locale`                  | English                                                          |
| The same with `locale="auto"` and `<html lang="de">`, `locales={{ de }}` | German; change the attribute in dev tools and the editor follows |
| The same with `contentLocales={['en']}`                                  | No language switch, no multi-language toggle                     |
| An existing multi-language article and email                             | Open, switch language, edit a word, save, reopen                 |

## Done when

- [x] `messages.ts` holds types and `resolveMessages` only; each language is its own file in each package.
- [x] The engine imports English only; other languages arrive through `locales`.
- [x] `locale`, `locales`, `messages`, `contentLocales` and `defaultContentLocale` are props; `BuilderHost` has no language field.
- [x] `CONTENT_LOCALES` is gone from the TypeScript core and is configuration in the API.
- [x] The schema files changed only where the locale list was.
- [x] The four tests in part A.7 exist and pass.
- [x] The admin looks the same in all three languages. (2026-11-11: the editors' rendered DOM in sq, en and de compared with the previous commit; see below.)

## Traps

- **A key translated in the wrong file.** After the split, a word used by the workspace but left in the article's file shows English in the email editor. Open both editors in `sq` and look for English.
- **Regenerating fixtures hides a real change.** Always read `git diff api/` after `UPDATE_FIXTURES=1`. The parity test passing only says both sides agree, not that the output is what it was.
- **`auto` on the server.** `document` does not exist during server rendering. `useSyncExternalStore`'s third argument covers it; do not read `document` anywhere else.
- **Base language of old documents.** `i18n.base` is `'sq'` in existing rows. Do not default it to `'en'` when reading; the default applies to new documents only.
- **Right-to-left languages.** Any code is now valid, including `ar` and `he`. The layout does not mirror yet. That is a feature ([FEATURES.md](../FEATURES.md)), not a bug of this step; say so in the README.

## How it was done (2026-11-11)

Two commits: part A (the editor's words), then part B (the languages a document holds). Where the work differed from the parts above:

| Part | What the plan said                                 | What was done                                                                                                                                                                                                                                                                                                                                                   | Why                                                                                                                                                                         |
| ---- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A.1  | The engine's catalogue keeps the workspace's words | It also lost its article wording: `back`, `untitled`, `anchorHint`, `hiddenHint`, `scheduleHint`, `conflictTitle`, `noSections`, `deleteTitle`, `deleteBody` are neutral ("Untitled", "Delete this?"), and `duplicateArticle`/`deleteArticle` became `duplicateDocument`/`deleteDocument`. The article kit says them as before through its locale's `workspace` | The engine must not say "article". The email editor already replaced most of them; two hints it did not replace are neutral now instead of mentioning articles and `/blog/` |
| A.1  | Element names go to the article kit                | Also the article's categories, and the 16 words only the article's settings read (`slug`, `seoTitle` …), in `ArticleWords`                                                                                                                                                                                                                                      | —                                                                                                                                                                           |
| A.2  | `{ code, engine, email, elements }`                | `ArticleLocale` is `{ code, engine, workspace, elements, categories, article, render }`; `EmailLocale` is `{ code, engine, workspace, elements, categories, email, importHtml }`. Albanian and German spread English, as the catalogues did                                                                                                                     | `workspace` holds the engine words a kit says its own way                                                                                                                   |
| A.6  | Replace `savedAgo` and the like with `Intl`        | `justNow`, `minutesAgo` and `hoursAgo` are gone; `savedAgo` stays as the sentence ("Saved · …") around `Intl.RelativeTimeFormat`. Language names come from `Intl.DisplayNames` when the catalogue has none                                                                                                                                                      | —                                                                                                                                                                           |
| A    | Renderer words in the article's locale files       | The renderer keeps English built in (`RENDER_EN`), so the site's bundle does not carry the editor's words; the site passes `messages={renderWordsFor(post.locale)}`. The editor's canvas still writes its few words in the language being written                                                                                                               | —                                                                                                                                                                           |
| B.1  | `checkArticle(document, registry, { locales })`    | As planned, and `checkEmail(document, registry, type, { locales })`. Both editors pass their `contentLocales`. `documentLocales(doc, locales?)` lists the project's languages, or without them the ones the document holds                                                                                                                                      | —                                                                                                                                                                           |
| B.3  | Python validators take the list                    | `check_document(document, locales=…)` and `check_email(document, spec, locales=…)`; the services pass `app.core.site_locales.CONTENT_LOCALES`, MotorsAL's own module, and drafts tolerate `i18n.locale.unknown`                                                                                                                                                 | `settings.supported_locales` is a different list (it has `it`, for the site)                                                                                                |
| B.3  | —                                                  | The email sender only switches to a reader's language when it is one of MotorsAL's (`sending.py`)                                                                                                                                                                                                                                                               | A unit test caught it: an Italian reader would otherwise get Italian dates over Albanian words                                                                              |

**Checks.** The regenerated contract changed only the two schema files and their API copies, and only the language part: the `enum` became the pattern and `translations` became a map keyed by it. Every fixture and golden email came out byte for byte the same. The API's 704 unit tests pass, and the article, email-template, invitation and newsletter integration tests (38) pass against a scratch database. The editors' rendered DOM was compared in English with the step 04 baseline, and in Albanian and German with a checkout of the previous commit: the same, apart from `Intl`'s number and relative-time formatting ("vor 7.546 Std.") and the email editor's two neutral hints. No screenshot pass was run.
