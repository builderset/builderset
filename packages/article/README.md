# @builderset/article

The article builder: a block editor for long-form writing, a typed JSON document, and a renderer that turns the document into semantic React — Server Component safe, with no HTML stored anywhere. The editor's canvas is drawn by the same renderer as the published page, so what the writer sees is what the reader gets.

> **Not released yet.** Nothing is on npm; see the [repository](https://github.com/mkurtii/builderset).

## Install

```bash
npm install @builderset/article
```

`react` and `react-dom` 19 for the editor and the renderer. The `core` and `host` entries need neither and run on Node 20 or newer.

## The smallest working example

The editor, in a back office:

```tsx
'use client';
import { ArticleEditor } from '@builderset/article/editor';
import { createRestHost } from '@builderset/article/host';

const host = createRestHost({
  baseUrl: `/api/articles/${id}`,
  uploadUrl: '/api/media',
  resolveMedia: (key) => `https://cdn.example.com/${key}`,
  toast: (kind, message) => console.log(kind, message),
});

export function EditArticle({ document, record, setRecord }) {
  return (
    <ArticleEditor
      document={document}
      host={host}
      record={record} // { status, scheduledAt, publishedAt, slug, locale }
      onRecordChange={(patch) => setRecord((r) => ({ ...r, ...patch }))}
      onBack={() => history.back()}
      storageKey={`article:${id}`}
    />
  );
}
```

The page, on the site — a Server Component:

```tsx
import { createArticleRegistry } from '@builderset/article';
import { ArticleRenderer } from '@builderset/article/render';

const registry = createArticleRegistry();

export default async function Article({ params }) {
  const { document } = await loadArticle(params.slug);
  return (
    <ArticleRenderer
      document={document}
      registry={registry}
      resolveMedia={(key) => `https://cdn.example.com/${key}`}
      locale="en"
    />
  );
}
```

## Styles and theme

The package ships no stylesheet yet. Its classes are Tailwind 4 utilities on shadcn-style colour tokens — `background`, `foreground`, `card`, `muted`, `muted-foreground`, `primary`, `primary-foreground`, `secondary`, `secondary-foreground`, `border`, `border-strong`, `destructive`, plus `ok`, `warn`, `no` and `chart-1` for callout and pros/cons tones — so an app that uses Tailwind 4 and those tokens adds the package to its sources:

```css
@source '../node_modules/@builderset/*/dist';
```

Optional variables, with their fallbacks: `--radius-card` (0.625rem), `--radius-control` (0.4rem), `--maxw-prose` (68ch). The editor also relies on a few global rules the app supplies today; [the engine's README](../engine/README.md#styles) lists them. A compiled, prefixed stylesheet that needs no Tailwind replaces all of this before the first release.

## Entry points

| Import                               | What                                                                                                                      | Runs on            |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| `@builderset/article`                | The document, the standard elements, the checks, parsing with migrations, the outline, import from HTML and Markdown      | Browser and server |
| `@builderset/article/render`         | `ArticleRenderer`, structured data (`structuredData`, `jsonLdString`), the parts custom renderers use                     | Browser and server |
| `@builderset/article/editor`         | `ArticleEditor` and the pieces of its settings panel                                                                      | Browser            |
| `@builderset/article/host`           | `BuilderHost` and the two ready-made hosts, `createMemoryHost` and `createRestHost` (the engine's, under this kit's name) | Browser and server |
| `@builderset/article/locales/<code>` | The editor's and the renderer's words in another language: `sq`, `de` (English is built in)                               | Both               |
| `@builderset/article/schema.json`    | The document's JSON Schema, for a backend in another language                                                             | —                  |
| `@builderset/article/fixtures/*`     | Valid and invalid documents, with the error each must produce, for a backend's contract test                              | —                  |

## Components

### The editor

<!-- props: editor/index.d.ts ArticleEditor -->

#### `ArticleEditor`

| Prop                   | Type                                                                       | Required | What it does                                                                                                                                            |
| ---------------------- | -------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `document`             | `ArticleDocument`                                                          | yes      | The article to edit. Read once, when the editor mounts: to load another, remount it (a new `key`).                                                      |
| `host`                 | `BuilderHost<ArticleDocument>`                                             | yes      | The adapter for everything that leaves the browser: saving, publishing, uploads, media URLs, notices.                                                   |
| `registry`             | `ElementRegistry`                                                          |          | Defaults to `createArticleRegistry()`.                                                                                                                  |
| `record`               | `ArticleFacts`                                                             | yes      | The stored row's facts — status, schedule, slug, language — shown and edited beside the article.                                                        |
| `onRecordChange`       | `(patch: Partial<ArticleFacts>) => void`                                   | yes      | Called with the facts the writer changed (the slug, a project's own fields). Keep them and pass the updated record back as `record`.                    |
| `onBack`               | `() => void`                                                               | yes      | Called to leave the editor (the back button). With unsaved changes the writer is asked first; the editor does not navigate by itself.                   |
| `onDuplicate`          | `() => void`                                                               |          | Adds "Duplicate" to the publish menu; called when the writer picks it.                                                                                  |
| `onDelete`             | `() => Promise<boolean>`                                                   |          | Adds "Delete" to the publish menu; called once the writer confirms. Resolve `true` once it is deleted; leaving the editor afterwards is up to the host. |
| `locale`               | `string`                                                                   |          | The editor's own language. `'auto'` follows `<html lang>`. Default: `'en'`.                                                                             |
| `locales`              | `Readonly<Record<string, ArticleLocale \| undefined>>`                     |          | Other languages, by code: `{ sq }` from `@builderset/article/locales/sq`. English is built in.                                                          |
| `messages`             | `{ engine?: { back?: string \| undefined; untitled?: string \| undefin…`   |          | Replace single words, in whatever language is active.                                                                                                   |
| `contentLocales`       | `readonly string[]`                                                        |          | The languages an article can be written in. One: no language switch.                                                                                    |
| `defaultContentLocale` | `string`                                                                   |          | The language a new article is written in. Default: the first of `contentLocales`.                                                                       |
| `storageKey`           | `string`                                                                   |          | Where the crash-safety copy is kept in localStorage; omit to disable.                                                                                   |
| `savedAt`              | `string \| null`                                                           |          | When the server copy was last saved — a local copy newer than this is offered back.                                                                     |
| `siteUrl`              | `string`                                                                   |          | Where articles are published, for the slug and the search preview: `https://example.com/blog`.                                                          |
| `settingsSections`     | `readonly SettingsSection[]`                                               |          | A project's own fields in Document settings, each in its tab and place.                                                                                 |
| `theme`                | `"auto" \| "dark" \| "light"`                                              |          | 'light' (the default), 'dark', or 'auto' to follow the page. Menus and dialogs follow it too.                                                           |
| `tokens`               | `Partial<Record<"font" \| "background" \| "surface" \| "foreground" \| "…` |          | Theme values by the public variables' names without their prefix: `{ primary: '#da6c1e' }`.                                                             |
| `className`            | `string`                                                                   |          | Applied to the editor's root element, the one that carries the theme.                                                                                   |

<!-- /props -->

`record` is the row the document belongs to — `status`, `scheduledAt`, `publishedAt`, `slug` and `locale` — and `onRecordChange` receives every change the writer makes to it. A project adds its own fields to Document settings with `settingsSections`, built from these:

<!-- props: editor/index.d.ts SettingsFieldRow -->

#### `SettingsFieldRow`

| Prop       | Type                        | Required | What it does                                                             |
| ---------- | --------------------------- | -------- | ------------------------------------------------------------------------ |
| `label`    | `string`                    | yes      | The field's label, above it.                                             |
| `hint`     | `ReactNode`                 |          | A note under the field.                                                  |
| `children` | `(id: string) => ReactNode` | yes      | Draws the field, given the id the label points at — put it on the input. |

<!-- /props -->

### The renderer

<!-- props: render/index.d.ts ArticleRenderer -->

#### `ArticleRenderer`

| Prop               | Type                                                                    | Required | What it does                                                                                                                                                                                                            |
| ------------------ | ----------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `document`         | `ArticleDocument`                                                       | yes      | The article to render.                                                                                                                                                                                                  |
| `registry`         | `ElementRegistry`                                                       | yes      | The elements it may hold — usually `createArticleRegistry()`. A node whose type is missing here, or whose props do not pass its schema, is left out.                                                                    |
| `className`        | `string`                                                                |          | Applied to the wrapping `<div>`, beside `builderset builderset-content`.                                                                                                                                                |
| `theme`            | `"auto" \| "dark" \| "light"`                                           |          | 'auto' (the default) follows the site: an ancestor marked `dark` or `light` (a class, or `data-theme`), else the operating system. 'light' and 'dark' pin it.                                                           |
| `resolveMedia`     | `(key: string) => string`                                               | yes      | Storage key → URL.                                                                                                                                                                                                      |
| `locale`           | `string`                                                                |          | The visitor's language. A multi-language article is shown in it, its base language filling any gaps; numbers are formatted for it (default `'en'`).                                                                     |
| `messages`         | `Partial<RenderMessages>`                                               |          | The renderer's own words — button labels, the notes heading — replaced singly or with a language's `render` words. English is built in.                                                                                 |
| `linkComponent`    | `import("react").ComponentClass<LinkProps, any> \| import("react").Fu…` |          | Draws every link — the router's own, such as `next/link`. Default: a plain `<a>`.                                                                                                                                       |
| `imageComponent`   | `import("react").ComponentClass<ImageProps, any> \| import("react").F…` |          | Draws every picture — such as `next/image`. Default: a plain `<img>`, loaded lazily.                                                                                                                                    |
| `related`          | `readonly RelatedItem[]`                                                |          | The site's own articles for a `related` element in automatic mode.                                                                                                                                                      |
| `newsletterAction` | `string`                                                                |          | Where a newsletter form posts. Omitted, the form is shown but inert.                                                                                                                                                    |
| `editing`          | `boolean`                                                               |          | The editor's canvas renders through the same components, with this set: links do not navigate, forms do not submit, embeds show their placeholder.                                                                      |
| `elements`         | `Readonly<Record<string, ElementRenderer<Record<string, unknown>>>>`    |          | Extra renderers for a host's own elements, by type.                                                                                                                                                                     |
| `editText`         | `(field: EditableTextField) => ReactNode`                               |          | Editor only: draws an editable field in place of a rich-text value. The text elements name which prop they are showing (`{ nodeId, path }`), so the editor can write straight back to it; everything else stays static. |

<!-- /props -->

**Safety.** No `dangerouslySetInnerHTML` anywhere in the package (a test enforces it). A node renders only if its props pass its element's schema; links are checked with `isSafeUrl` again at render time and external links get `rel="noopener noreferrer"`. Embeds are built from the id in an allow-listed URL (YouTube through `youtube-nocookie.com`), load only after the reader clicks, and are sandboxed. An image still waiting to be uploaded (`pendingUrl`) is never loaded.

**Structured data.** `structuredData(doc, registry, { url, resolveMedia, … })` returns Schema.org objects — `Article`, plus `FAQPage`, `HowTo` and `Review` when the document has those elements. Write them yourself, escaped:

```tsx
<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(data) }} />
```

**Parts for custom renderers.** `Picture`, `ButtonLink` and `RichTextView` draw an image, a button and rich text the way the standard elements do:

<!-- props: render/index.d.ts Picture ButtonLink RichTextView -->

#### `Picture`

| Prop        | Type                                                                     | Required | What it does                                                                             |
| ----------- | ------------------------------------------------------------------------ | -------- | ---------------------------------------------------------------------------------------- |
| `media`     | `{ key: string; width?: number \| undefined; height?: number \| undefi…` | yes      | The stored media; without it nothing is drawn.                                           |
| `alt`       | `string`                                                                 | yes      | The image's alternative text; `''` for a decorative one.                                 |
| `context`   | `RenderContext`                                                          | yes      | The render context, for the host's image component and the media's URL.                  |
| `className` | `string`                                                                 |          | Passed to the image.                                                                     |
| `style`     | `import("react").CSSProperties`                                          |          | Inline style, passed to the image.                                                       |
| `sizes`     | `string`                                                                 |          | The image's `sizes` attribute, for picking a responsive source.                          |
| `eager`     | `boolean`                                                                |          | Loads the image straight away rather than lazily — for a picture at the top of the page. |

#### `ButtonLink`

| Prop        | Type                                                                     | Required | What it does                                                                               |
| ----------- | ------------------------------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------ |
| `button`    | `{ label: string; href: string; variant: "primary" \| "secondary" \| "…` | yes      | The button as stored: its label, link, look and icon. An external link opens in a new tab. |
| `context`   | `RenderContext`                                                          | yes      | The render context, for the host's link component; in the editor the link goes nowhere.    |
| `size`      | `"lg" \| "md" \| "sm"`                                                   |          | Its height and text size. Default: `'md'`.                                                 |
| `className` | `string`                                                                 |          | Added to the link's own classes.                                                           |

#### `RichTextView`

| Prop      | Type                                                    | Required | What it does                                                             |
| --------- | ------------------------------------------------------- | -------- | ------------------------------------------------------------------------ |
| `value`   | `RichText \| null`                                      | yes      | The text. Empty draws nothing, unless the editor is editing it in place. |
| `context` | `RenderContext`                                         | yes      | The render context, for links, footnote numbers and editing in place.    |
| `field`   | `{ node: string; path: string; placeholder?: string; }` |          | Which prop this is — lets the editor edit it in place.                   |

<!-- /props -->

## The host adapter

The editor owns nothing: no database, no routes, no file storage. It asks its `host` to save, publish, upload, list versions and show messages. `createRestHost` speaks to an API of the shape in [BACKEND.md](../engine/src/host/BACKEND.md), which also says what a backend must store, check on every write and keep safe; `createMemoryHost` keeps everything in memory, for tests and demos. A project with its own API writes its own `BuilderHost`.

## Custom elements

An element is data: a type, a version, a zod schema for its props, defaults, and what the checks and the server need to know. The editor builds its inspector from the schema.

```ts
import { defineElement, warning, z } from '@builderset/engine';
import { createArticleRegistry } from '@builderset/article';

export const noteElement = defineElement({
  type: 'note',
  version: 1,
  category: 'plugin',
  icon: 'sticky-note', // a lucide icon name
  keywords: ['memo'],
  schema: z.object({ body: z.string().max(300) }),
  defaults: () => ({ body: '' }),
  toPlainText: (props) => props.body,
  check: (props, { node }) =>
    props.body.trim() ? [] : [warning('text.empty', { nodeId: node.id, path: 'body' })],
});

const registry = createArticleRegistry([noteElement]);
```

- `container` makes it hold other elements (`only` / `except`, `min`, `max`, `initial` children); `parents` restricts where it may be placed.
- `migrate(fromVersion, props)` upgrades old props when `version` is bumped; `parseArticle` walks every node forward one version at a time.
- `links` and `media` expose URLs and media for the checks and the server.

Then give the renderer a component for it. `frame` carries the node's anchor and its style as classes; `frameProps` merges them over your defaults, so the node's own style wins:

```tsx
function NoteView({ props, frame }: ElementRenderProps<{ body: string }>) {
  return <p {...frameProps(frame, 'my-6 italic')}>{props.body}</p>;
}

<ArticleRenderer {...rest} elements={{ note: NoteView }} />;
```

## The document

A normalised tree: every node lives in one flat `nodes` record keyed by id, a container lists its children's ids in order, and the root's id is `root`.

```ts
interface ArticleDocument {
  schema: 'builder/document';
  version: number;
  root: 'root';
  nodes: Record<NodeId, BuilderNode>;
  meta: ArticleMeta; // title, excerpt, cover, seo, readingMinutes
}

interface BuilderNode {
  id: string;
  type: string; // the element's registry key
  v: number; // the element version the props were written for
  props: Record<string, unknown>;
  style?: NodeStyle; // tokens per breakpoint, never raw CSS
  children?: string[]; // containers only
  hidden?: boolean;
  locked?: boolean;
  name?: string;
  anchor?: string;
}
```

- **No HTML.** Inline formatting is `RichText`: runs of text with marks (`bold`, `italic`, `underline`, `strike`, `code`, `highlight`, `sub`, `sup`, `link`, `footnote`). Links are checked by `isSafeUrl` on the way in; pasted HTML is converted to nodes and thrown away.
- **Media by key.** Uploads are referenced by their storage key; `resolveMedia(key)` turns a key into a URL when rendering.
- **Style by token.** `NodeStyle` holds spacing, width, surface, border, radius, shadow and type-scale _tokens_ per breakpoint (`desktop` → `tablet` → `mobile`, inherited downwards). The theme decides what a token looks like.

**The standard elements.** `createArticleRegistry(plugins?)` returns a registry with all of them:

| Category   | Elements                                                                                                                                                 |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Layout     | section, container, columns (+ column), group, spacer, divider                                                                                           |
| Text       | heading (H2–H4), paragraph, list (bullet / number / check, one nesting level), quote, pull-quote, callout, code, table, footnote, takeaways, definitions |
| Media      | image, gallery, before-after, media-text, video, audio, embed (allow-listed providers), file                                                             |
| Article    | toc, faq, howto, timeline, pros-cons, stats, rating, author                                                                                              |
| Engagement | cta, buttons, related, newsletter, accordion (+ accordion-item), tabs (+ tab-item), disclaimer                                                           |

**Checking and reading.** `checkArticle(doc, registry, { locales })` returns errors, which block publishing, and warnings (missing alt text, skipped heading levels, empty blocks, SEO lengths); `isDraftBlocking` and `isPublishBlocking` decide what an autosave and a publish refuse. `parseArticle(raw, registry)` parses, migrates and checks a stored document. `plainText`, `countWords`, `readingMinutes` and `outline` (headings with unique anchors, for a table of contents) read it.

**Editing without the editor.** The engine's operations run on an immer draft with undo; see [the engine's README](../engine/README.md).

**Clipboard and import.** `copyNodes` writes the builder's own JSON (`application/x-builder-fragment+json`), plain text and escaped HTML. `readClipboard` reads, in order of fidelity, that JSON, HTML (Word, Google Docs, web pages — `importHTML`), Markdown (`importMarkdown`) and plain text. A pasted image keeps its address as `pendingUrl` until it is uploaded again; a backend refuses a document that still holds one. On a server, pass `importHTML` a `{ parser }`: there is no `DOMParser` there.

**Limits.** The engine's `LIMITS` hold for every document: 1 000 nodes, depth 8, 200 KB serialised, 10 000 characters per rich text, 200 undo steps. `ARTICLE_LIMITS` add the article's own: 300 characters in a short field, 20 000 in a long one, 40 list items, 60 × 8 table cells, 24 gallery images. A backend enforces the same numbers.

**The contract with a backend.** `schema/article.schema.json` and `fixtures/` are generated and checked by this package's tests. After an intentional change, run `UPDATE_FIXTURES=1 pnpm test` and commit the result: every backend's contract test reads these files.

## Links

- [The repository](https://github.com/mkurtii/builderset) · [what a backend must do](../engine/src/host/BACKEND.md) · [the engine](../engine/README.md)
- [Licence: MIT](LICENSE). The changelog starts with the first release.
