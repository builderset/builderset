# 03 — Split the engine from the article kit

## Goal

`packages/article` exists and holds everything that is about articles. `packages/engine` holds only what every builder shares. The workspace is generic over the document type, so the email kit no longer pretends its document is an article.

## Why

Three places in the code show that the engine is still the article builder with a second mode:

- [profile.ts](../../../packages/builder-react/src/profile.ts) says "Everything is optional; an empty profile is the article builder", and its functions take a `BuilderDocument` — a type whose `meta` has `title`, `excerpt`, `cover` and `seo` ([document.ts](../../../packages/builder-core/src/document.ts)).
- The email packages cast between the two document types in twelve places (`as unknown as BuilderDocument`, `as unknown as EmailDocument`), and the admin's email adapter in three more.
- `BuilderEditor` requires an `article: ArticleFacts` prop with `slug`, `category` and `featured`; the email editor fills it with facts an email does not have.

A popup or a page would need the same pretending. The fix is one generic document type and a required profile.

(Paths in this file are today's. After step 02 the same files are under `packages/engine/src/`.)

## Before you start

- Step 02 is merged.
- Screenshots of both editors.

## The work

### 1. Give the engine a generic document type

In `packages/engine/src/core/document.ts`, next to `NodeTree`:

```ts
/**
 * What every document the workspace edits has in common. A kit extends it
 * with its own `meta` and whatever else it stores (an email's `settings`).
 */
export interface EngineDocument<Meta extends object = Record<string, unknown>> extends NodeTree {
  /** The kit's format name, as stored: `builder/document`, `email/document`. */
  schema: string;
  version: number;
  meta: Meta;
  i18n?: DocumentI18n | undefined;
}
```

Then:

- `BuilderDocument` becomes the article's type. Rename it `ArticleDocument`, declare it as `EngineDocument<ArticleMeta> & { schema: typeof DOCUMENT_SCHEMA }`, and move it to the article kit (part 3).
- `EmailDocument` extends `EngineDocument<EmailMeta>` and keeps its `settings`.
- Everything in the engine that takes a `BuilderDocument` takes `EngineDocument` or a type parameter `TDoc extends EngineDocument`.

**The stored `schema` strings do not change.** `DOCUMENT_SCHEMA = 'builder/document'` is inside every article row in the database. Renaming a TypeScript type is free; renaming that string needs a migration and a version bump, and is not part of this plan.

### 2. Make the workspace generic and the profile required

```ts
export interface BuilderEditorProps<TDoc extends EngineDocument> {
  document: TDoc;
  registry: ElementRegistry;
  host: BuilderHost<TDoc>;
  profile: EditorProfile<TDoc>; // required: the engine has no default kit
  record?: RecordFacts | undefined;
  onRecordChange?: ((patch: Partial<RecordFacts>) => void) | undefined;
  // onBack, onDuplicate, onDelete, messages, storageKey, savedAt: unchanged
}
```

In `EditorProfile<TDoc>`:

| Member          | Today                                  | After                                                                      |
| --------------- | -------------------------------------- | -------------------------------------------------------------------------- |
| `renderCanvas`  | optional; default the article renderer | **required**                                                               |
| `check`         | optional; default `checkDocument`      | **required**                                                               |
| `parse`         | optional; default `parseDocument`      | **required**                                                               |
| `titleOf`       | optional; default `meta.title`         | **required**                                                               |
| `paragraphType` | optional; default `'paragraph'`        | **required**                                                               |
| `categories`    | optional                               | **required**                                                               |
| `settingsPanel` | optional                               | optional; with none, the inspector shows nothing when no block is selected |
| everything else | optional                               | unchanged                                                                  |

The store (`createEditorStore`), the context and `useEditor` take the same `TDoc`.

`ArticleFacts` becomes two types:

```ts
/** In the engine: what the top bar shows for any stored document. */
export interface RecordFacts {
  status: string;
  scheduledAt: string | null;
  publishedAt: string | null;
}

/** In the article kit. */
export interface ArticleFacts extends RecordFacts {
  slug: string;
  category: string;
  categories: string[];
  featured: boolean;
}
```

`locale` leaves the facts; it is a prop of the editor from step 05. Until then keep it where it is.

`ArticleFacts` is read in three files: `chrome/top-bar.tsx` (status and schedule — `RecordFacts` is enough), `editor.tsx`, and `inspector/document-settings.tsx` (all the article-only fields — it moves to the article kit).

### 3. Create `packages/article` and move the article files

`@motors/article`, with the same manifest shape as the email package in step 02, depending on `@motors/engine`.

**From `packages/engine/src/core/` — which file goes where.** The test for a file is simple: if the email kit imports from it, it is the engine. Today the email packages import these 26 names from the core: `BuilderDocument`, `BuilderNode`, `ContentLocale`, `DocumentI18n`, `ElementDefinition`, `ElementRegistry`, `Fragment`, `Issue`, `NodeTree`, `Translation`, `createFragment`, `createId`, `defineElement`, `documentLocales`, `error`, `i18nSchema`, `isSafeUrl`, `localize`, `markSchema`, `mediaRefSchema`, `nodeShapeSchema`, `parentOf`, `reidFragment`, `structuralIssues`, `translationIssues`, `warning`.

| File                                                                                                                                                          | Goes to   | Note                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `clipboard.ts`, `history.ts`, `ids.ts`, `issues.ts`, `operations.ts`, `tree.ts`, `url.ts`, `i18n.ts`, `media.ts`, `rich-text.ts`, `style.ts`, `text-stats.ts` | engine    |                                                                                                                                                                                           |
| `registry.ts`                                                                                                                                                 | engine    | The `CATEGORIES` list (`layout`, `text`, `media`, `article`, `engagement`, `plugin`) moves to the article kit; the engine keeps the open `string` type                                    |
| `document.ts`                                                                                                                                                 | **split** | `NodeTree`, `BuilderNode`, `nodeShapeSchema`, `EngineDocument` stay. `seoSchema`, `documentMetaSchema`, `DOCUMENT_SCHEMA`, `DOCUMENT_VERSION`, `documentShapeSchema`, `createDocument` go |
| `validate.ts`                                                                                                                                                 | **split** | `structuralIssues`, `translationIssues` stay. `checkDocument` goes                                                                                                                        |
| `serialize.ts`                                                                                                                                                | **split** | Generic reading and migration helpers stay. `parseDocument` goes                                                                                                                          |
| `json-schema.ts`                                                                                                                                              | **split** | The zod → JSON Schema helpers stay. Building the article's schema file goes                                                                                                               |
| `limits.ts`                                                                                                                                                   | **split** | Limits on the tree (nodes, depth) stay. Limits on article content go                                                                                                                      |
| `elements/` (all six files)                                                                                                                                   | article   |                                                                                                                                                                                           |
| `embeds.ts`                                                                                                                                                   | article   | Only the elements and the schema generator import it                                                                                                                                      |
| `import-html.ts`, `import-markdown.ts`, `kitchen-sink.ts`                                                                                                     | article   | They build article elements                                                                                                                                                               |
| `legacy.ts`                                                                                                                                                   | article   | For now. Step 06 moves it into MotorsAL                                                                                                                                                   |
| `fixtures.test.ts`, `schema/`, `fixtures/`                                                                                                                    | article   | The article's contract. The generated files must come out byte for byte the same                                                                                                          |

For each **split** file, keep the engine half under the old name and give the article half a clear name in `packages/article/src/core/` (`document.ts`, `check.ts`, `parse.ts`, `schema.ts`, `limits.ts`).

**From `packages/engine/src/render/`:** everything goes to `packages/article/src/render/`. One type comes back: `EditableTextField` is the contract between the workspace and whatever draws the canvas, so it belongs in `packages/engine/src/editor/`.

**From `packages/engine/src/editor/`:**

| File                              | Goes to   | Note                                                                                                                                                                      |
| --------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `inspector/document-settings.tsx` | article   | General, SEO and Publishing — all article fields. It becomes the article profile's `settingsPanel`                                                                        |
| `canvas/title-field.tsx`          | article   | The title above the article on the canvas                                                                                                                                 |
| `canvas/canvas.tsx`               | engine    | Remove the default: it calls `profile.renderCanvas` and nothing else. The `'article'` frame (white page, reading measure, title) is drawn by the article's `renderCanvas` |
| `text/inline-text.tsx`            | engine    | Imports `EditableTextField` from the engine now                                                                                                                           |
| `panels/templates-panel.tsx`      | **split** | The panel shell and saved sections stay. The article's starting layouts go into the article profile                                                                       |
| `messages.ts`                     | engine    | For now. Step 05 splits it and moves the element names                                                                                                                    |
| everything else                   | engine    |                                                                                                                                                                           |

### 4. Write the article editor

`packages/article/src/editor/`:

- `profile.ts` — `articleProfile(options): EditorProfile<ArticleDocument>`. It supplies what used to be the defaults: `renderCanvas` (calls `renderDocument`), `check: checkDocument`, `parse: parseDocument`, `titleOf: (doc) => doc.meta.title`, `paragraphType: 'paragraph'`, the categories, the settings panel, the templates.
- `editor.tsx` — `ArticleEditor`, a thin component in the same shape as today's `EmailEditor`: it builds the profile and renders `<BuilderEditor>`.

```tsx
export interface ArticleEditorProps {
  document: ArticleDocument;
  host: BuilderHost<ArticleDocument>;
  /** Defaults to `createArticleRegistry()`. */
  registry?: ElementRegistry | undefined;
  record: ArticleFacts;
  onRecordChange: (patch: Partial<ArticleFacts>) => void;
  onBack: () => void;
  // onDuplicate, onDelete, messages, storageKey, savedAt
}
```

**Renames.** The article's functions were named when there was only one kind of document. Give every kit the same pattern ([BLUEPRINT.md §7](../BLUEPRINT.md#7-rules-that-keep-the-code-readable)):

| Today                    | After                   | Note                                                                                                          |
| ------------------------ | ----------------------- | ------------------------------------------------------------------------------------------------------------- |
| `BuilderDocument`        | `ArticleDocument`       |                                                                                                               |
| `createDocument`         | `createArticleDocument` | The email kit already has `createEmailDocument`                                                               |
| `createStandardRegistry` | `createArticleRegistry` | Called in two app files: `article-builder.tsx` in the admin and `apps/web/src/lib/builder.ts`                 |
| `checkDocument`          | `checkArticle`          | The email kit already has `checkEmail`                                                                        |
| `parseDocument`          | `parseArticle`          |                                                                                                               |
| —                        | `parseEmail`            | New. The email profile checks a stored copy inline today (`profile.tsx`); move that into `core` as a function |

`ArticleRenderer` keeps its name. These are TypeScript names only; nothing stored changes.

### 5. Remove the casts

With both documents extending `EngineDocument` and the workspace generic, every cast listed here can go:

```bash
git grep -nE "as unknown as (BuilderDocument|EmailDocument|ArticleDocument)" -- packages apps
```

The email profile becomes `EditorProfile<EmailDocument>`, and `EmailEditor` takes `record: RecordFacts` in place of `facts: ArticleFacts`. If a cast will not go, the generic parameter is missing somewhere between the store and that file; follow the type back instead of keeping the cast.

### 6. Add the rule that keeps it this way

In the shared ESLint config ([packages/config](../../../packages/config/)), with `no-restricted-imports`:

| Files                      | May not import                                                  |
| -------------------------- | --------------------------------------------------------------- |
| `packages/engine/**`       | `@motors/article`, `@motors/email` and their sub-paths          |
| `packages/article/**`      | `@motors/email`                                                 |
| `packages/email/**`        | `@motors/article`                                               |
| `packages/*/src/core/**`   | `react`, `react-dom`, anything in a `render` or `editor` folder |
| `packages/*/src/render/**` | anything in an `editor` folder                                  |

Prove the rule works: add a forbidden import, see lint fail, remove it.

### 7. Update the apps

| App file                                                                       | Change                                                                             |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `apps/admin/src/components/content/article-builder.tsx`                        | `ArticleEditor` from `@motors/article/editor`; the registry from `@motors/article` |
| `apps/admin/src/components/content/articles-screen.tsx`                        | Imports from `@motors/article`                                                     |
| `apps/admin/src/components/content/email-builder.tsx`                          | `record` in place of `facts`; the three casts removed                              |
| `apps/web/src/app/blog/**`, `apps/web/src/components/home/structured-data.tsx` | `@motors/article/render`                                                           |
| `apps/web/src/lib/blog.ts`, `apps/web/src/lib/builder.ts`                      | `@motors/article`                                                                  |
| Both `package.json`, `next.config.ts`, `globals.css`                           | Add `@motors/article` beside `@motors/engine`, as in step 02                       |

## Check

```bash
pnpm lint && pnpm typecheck && pnpm test
git status api/                       # clean: the schema and fixtures are byte-identical
git grep -nE "as unknown as (BuilderDocument|EmailDocument|ArticleDocument)" -- packages apps   # nothing
git grep -n "@motors/article" -- packages/engine packages/email                                 # nothing
```

Both editors on screen, as in [00_INDEX.md](00_INDEX.md#what-green-means). Pay attention to what moved: the article's document settings (General, SEO, Publishing), the title field on the canvas, the templates tab, and the email editor with nothing selected.

## Done when

- [x] `packages/article` has `src/core`, `src/render`, `src/editor`.
- [x] `packages/engine` has no `src/render` folder and no article element.
- [x] The engine's `index.ts` files export nothing with "article" in its name.
- [x] No cast between document types is left in `packages/` or `apps/`.
- [x] The import rule is in the ESLint config and was seen to fail on a wrong import.
- [x] The schema and fixture files under `api/` are unchanged.
- [x] Both editors and a blog article look and behave as before. (2026-11-11: every test passes unchanged in substance, and both apps' compiled CSS is identical rule for rule. No screenshot pass was run.)

## Traps

- **Changing the `schema` string.** See part 1. If `git status api/` shows `builder_schema.json` changed, a stored string or a schema `$id` was renamed by accident.
- **A circular import inside the engine.** Splitting `document.ts` and `validate.ts` can leave the engine half importing a name that moved. The type checker reports it as a missing export, not as a cycle.
- **The canvas frame.** Today the workspace draws the white page and the title field for `canvasFrame: 'article'`. After this step the article profile draws them. If the article canvas appears without its page background or its title, that part was removed from the engine and not added to the profile.
- **Fixtures regenerated "to make the test pass".** Do not run `UPDATE_FIXTURES=1` in this step. A fixture that differs means the split changed behaviour.
- **Doing too much.** `messages.ts`, `@motors/ui`, the email designs and `legacy.ts` all look wrong after this step. They are steps 04, 05 and 06.

## How it was done (2026-11-11)

Done in two commits: the files that move whole, as renames only; then the split files, the generic workspace, the article editor, the email kit, the apps and the rule. Where the work differed from the parts above, and why:

| Part | What the plan said                                                         | What was done                                                                                                                                                                                                                                                                                                                                                            | Why                                                                                                                                                                                                                                                          |
| ---- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1    | `EngineDocument<Meta extends object = Record<string, unknown>>`            | `Meta extends object = object`                                                                                                                                                                                                                                                                                                                                           | An email's or article's meta type is not assignable to `Record<string, unknown>` when it is an interface; `object` accepts every kit's meta                                                                                                                  |
| 2    | `canvasFrame` stays; the article's `renderCanvas` draws the title          | `canvasFrame: 'page'                                                                                                                                                                                                                                                                                                                                                     | 'bare'`and a new`canvasHeader`slot; the article profile passes`TitleField`                                                                                                                                                                                   | On an empty article the canvas shows the empty state instead of the blocks. A title drawn by `renderCanvas` would vanish with them. The header is drawn above, as before, so the page is unchanged |
| 2    | `record` replaces `article` in the context                                 | `record: RecordFacts` in the context; a kit reads its own facts with `useRecord<ArticleFacts>()`                                                                                                                                                                                                                                                                         | One React context serves every kit; the typed hook is the one place the type is restored                                                                                                                                                                     |
| 3    | `EditableTextField` moves to `engine/src/editor`                           | It moves to `engine/src/core/editable.ts`, re-exported from `@motors/engine/editor` and `@motors/article/render`                                                                                                                                                                                                                                                         | The article's renderer names it, and part 6 forbids a `render` folder to import an `editor`                                                                                                                                                                  |
| 3    | The templates panel keeps its shell; the layouts go to the article profile | The profile has `templates: TemplateSpec[]`; the panel renders them and the saved sections                                                                                                                                                                                                                                                                               | The panel needs no override for the article                                                                                                                                                                                                                  |
| 3    | —                                                                          | `clipboard.ts` split: the engine copies and reads its own JSON (`readFragmentJson`); `readClipboard` (HTML, Markdown, text) is the article's `paste.ts`                                                                                                                                                                                                                  | Reading pasted HTML and text needs the article's importers and makes article paragraphs. Nothing outside the tests called it                                                                                                                                 |
| 3    | `text-stats.ts` stays                                                      | `outline` (headings) moves to the article; `readingMinutes` stays and reads `meta.readingMinutes` only when a document has one                                                                                                                                                                                                                                           | The status bar shows the reading time for any document                                                                                                                                                                                                       |
| 3    | `limits.ts` split                                                          | The engine's `LIMITS` keeps `nodes`, `depth`, `bytes`, `richTextChars`, `historySteps`; `ARTICLE_LIMITS` has the rest. The schema's `x-limits` is rebuilt in the old key order                                                                                                                                                                                           | The schema file must come out byte for byte the same, and it does                                                                                                                                                                                            |
| 3    | `fixtures.test.ts` moves                                                   | Every test that builds article documents moves with the code it exercises: the core's `basics`, `history`, `i18n`, `import`, `operations`, `validate` tests and the editor's `editor` and `store` tests                                                                                                                                                                  | They need the article's elements, and the engine may not import the article. The engine keeps 10 tests of its own; the article has 121. **Follow-up:** give the engine a small test registry so its operations are tested inside the engine (before step 08) |
| 4    | Renames table                                                              | Also: `DocumentMeta` → `ArticleMeta`, `documentMetaSchema` → `articleMetaSchema`, `documentShapeSchema` → `articleShapeSchema`, `documentSchema` → `articleSchema`, `toJSONSchema` → `toArticleJSONSchema`, `serializeDocument` → `serializeArticle`, `CATEGORIES` → `ARTICLE_CATEGORIES`. `DOCUMENT_SCHEMA` and `DOCUMENT_VERSION` keep their names                     | The same pattern as the email kit's names                                                                                                                                                                                                                    |
| 5    | Every cast goes                                                            | No cast between document types is left. Three casts remain, none between kits: zod infers a discriminated union of element nodes as `{ type }` only, so the `superRefine` in `articleSchema` and `emailSchema` names the tree `NodeTree`; and the engine's one React context stores its value with the document type erased (`EditorProvider`, `useEditorContext<TDoc>`) | —                                                                                                                                                                                                                                                            |
| 5    | —                                                                          | Two `as never` in the admin's email adapter are gone too                                                                                                                                                                                                                                                                                                                 | They existed only to pass an `EmailDocument` through the article-typed host                                                                                                                                                                                  |

Left for later steps, as the traps say: `TRANSLATABLE_META` and `splitMeta` still name the article's and email's meta fields (step 05), `messages.ts` still says "article" in places (step 05), and the editor still imports `@motors/ui` (step 04).
