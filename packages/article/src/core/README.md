# @builderset/article

The model of the article builder: the article document and its meta, the
standard elements, the article's checks, parsing with migrations, pasting,
and import from HTML and Markdown. It is built on `@builderset/engine`, which
holds what every builder shares: the node tree, the element registry, every
editing operation with undo/redo, and the structural checks.

Pure TypeScript — no React. The same code runs in the editor
(`@builderset/article/editor`), the renderer (`@builderset/article/render`), tests, and
anything else that needs to read or write an article.

## Concepts

**Document.** A normalized tree: every node lives in one flat `nodes` record
keyed by id, and a container lists its children's ids in order. The root node
always has the id `root`.

```ts
interface ArticleDocument {
  schema: 'builder/document';
  version: number; // DOCUMENT_VERSION
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

**No HTML, anywhere.** Inline formatting is `RichText` — runs of text with
marks (`bold`, `italic`, `underline`, `strike`, `code`, `highlight`, `sub`,
`sup`, `link`, `footnote`). Links are checked by `isSafeUrl` on the way in.
Pasted HTML is converted to nodes and thrown away.

**Media by key.** Uploaded media is referenced by its storage key; the host's
`resolveMedia(key)` turns a key into a URL at render time.

**Style by token.** `NodeStyle` holds spacing, width, surface, border, radius,
shadow and type-scale _tokens_ per breakpoint (`desktop` → `tablet` → `mobile`,
inherited downwards). The host's theme decides what a token looks like.

## Elements

`createArticleRegistry(plugins?)` returns a registry with the standard library:

| Category   | Elements                                                                                                                                                 |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Layout     | section, container, columns (+ column), group, spacer, divider                                                                                           |
| Text       | heading (H2–H4), paragraph, list (bullet / number / check, one nesting level), quote, pull-quote, callout, code, table, footnote, takeaways, definitions |
| Media      | image, gallery, before-after, media-text, video, audio, embed (allow-listed providers), file                                                             |
| Article    | toc, faq, howto, timeline, pros-cons, stats, rating, author                                                                                              |
| Engagement | cta, buttons, related, newsletter, accordion (+ accordion-item), tabs (+ tab-item), disclaimer                                                           |

### Writing an element

An element is data. The editor and renderer register their own components
against the same `type`.

```ts
import { defineElement, warning } from '@builderset/engine';
import { z } from 'zod';

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

- `container` makes it hold other elements (`only` / `except`, `min`, `max`,
  `initial` children).
- `parents` restricts where it may be placed.
- `migrate(fromVersion, props)` upgrades old props when `version` is bumped;
  `parseArticle` walks every node forward one version at a time.
- `links` / `media` expose URLs and media for the checker and the server.

## Editing

Operations run on an immer draft and return forward and inverse patches:

```ts
const history = new History(doc);
const [id] = history.commit(
  (draft) => insert(draft, registry, draft.root, 0, createFragment(registry, 'heading')),
  { label: 'Add heading' },
);
history.commit((draft) => update(draft, registry, id, { props: { level: 3 } }), {
  label: 'Heading level',
});
history.undo();
```

`insert`, `move`, `remove`, `duplicate`, `update`, `wrap`, `unwrap` and
`replaceType` enforce placement, depth, node count, minimum/maximum children
and locks themselves, and throw a `BuilderError` (with a message `code`) when
refused — leaving the document untouched.

`History` merges consecutive edits sharing a `coalesceKey` (typing) within
750 ms, groups a `transaction` into one step, restores selection with each
step, and keeps 200 steps.

## Checking and reading

- `documentSchema(registry)` — the full zod schema (also exported as JSON
  Schema by `toJSONSchema`, committed to `schema/article.schema.json`).
- `checkArticle(doc, registry)` — errors (block saving/publishing) and
  warnings (missing alt text, skipped heading levels, empty blocks, SEO lengths).
- `parseArticle(raw, registry)` — parse, migrate, check.
- `plainText`, `countWords`, `readingMinutes`, `outline` (headings with unique
  anchors for a table of contents).

## Clipboard and import

`copyNodes` writes the builder's own JSON (`application/x-builder-fragment+json`),
plain text and escaped HTML. `readClipboard` reads, in order of fidelity, our
JSON, HTML (Word, Google Docs and web pages — `importHTML`), Markdown
(`importMarkdown`) and plain text. Pasted images keep their address as
`pendingUrl` until re-uploaded; the server refuses a document still holding one.

## Limits

`LIMITS`: 1 000 nodes, depth 8, 200 KB serialized, 10 000 characters per rich
text, 40 list items, 60 × 8 table cells, 24 gallery images, 200 undo steps. The
server enforces the same numbers.

## Contract fixtures

`fixtures/valid/*.json` and `fixtures/invalid/*.json` (with `manifest.json`
naming the error each must produce) are what the API's contract test reads.
They and the JSON Schema are generated and checked by `src/fixtures.test.ts`;
after an intentional change run `UPDATE_FIXTURES=1 pnpm test` (PowerShell:
`$env:UPDATE_FIXTURES=1; pnpm test`) and commit the result.
