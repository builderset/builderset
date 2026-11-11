# Changelog

`@motors/engine` joins three earlier packages: `@motors/builder-core` (now
`src/core`), `@motors/builder-render` (now `src/render`) and
`@motors/builder-react` (now `src/editor`). Their entries are kept below.

## 0.1.0

### Core (`@motors/builder-core`)

- Document format v1: normalized node tree, rich text with marks, media by key,
  token-based per-breakpoint styles, document meta (title, excerpt, cover, SEO).
- Element registry with `defineElement`, placement rules, per-element
  migrations, plain text, links, media and editorial checks.
- Standard library of 45 elements across layout, text, media, article and
  engagement.
- Operations (`insert`, `move`, `remove`, `duplicate`, `update`, `wrap`,
  `unwrap`, `replaceType`) with rule enforcement and immer patches.
- `History` with coalesced typing, transactions and selection restore.
- Validation (`documentSchema`, `checkDocument`), parsing with migrations,
  JSON Schema export, reading time and outline.
- Clipboard format, HTML import (Word, Google Docs, web), Markdown import,
  legacy article body conversion.
- Contract fixtures and the committed JSON Schema for the server.

### Render (`@motors/builder-render`)

- `ArticleRenderer` / `renderDocument`: every standard element rendered as
  semantic, Server-Component-safe React, with per-breakpoint style classes.
- Client islands for copy, click-to-load embeds, tabs, carousel, before/after,
  lightbox and newsletter.
- Numbered footnotes, table-of-contents anchors, `structuredData` (Article,
  FAQPage, HowTo, Review) and `jsonLdString`.
- Messages in English, Albanian and German.

### Editor (`@motors/builder-react`)

- First version of the editor: top bar, left rail (add, layers, templates),
  canvas with inline editing and drag and drop, schema-driven inspector,
  document settings, autosave, crash-safety copy, conflicts, history, shortcuts.
