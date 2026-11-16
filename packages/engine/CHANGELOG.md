# Changelog

## 0.2.0

### Minor Changes

- d5ba0c6: Five new theme variables: `--builderset-sidebar`, the rail beside the canvas and the top bar; `--builderset-input`, a field's edge and fill; and `--builderset-state-draft`, `--builderset-state-scheduled` and `--builderset-state-published`, the status chip's colours. `theme/shadcn.css` maps shadcn's `--sidebar` and `--input`. Left unset, the editor looks as it did.

## 0.1.0

### Minor Changes

- ae906f6: The first release: the engine, the email and article kits — editors, renderers, hosts, the theme and the stylesheets — and the all-in-one package.

Nothing is published yet. The entries below are from before the packages had
this name, when the engine was three private packages: `builder-core` (now
`src/core`), `builder-render` (now `src/render`) and `builder-react` (now
`src/editor`).

## Before 0.0.0

### Core (`builder-core`)

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

### Render (`builder-render`)

- `ArticleRenderer` / `renderDocument`: every standard element rendered as
  semantic, Server-Component-safe React, with per-breakpoint style classes.
- Client islands for copy, click-to-load embeds, tabs, carousel, before/after,
  lightbox and newsletter.
- Numbered footnotes, table-of-contents anchors, `structuredData` (Article,
  FAQPage, HowTo, Review) and `jsonLdString`.
- Messages in English, Albanian and German.

### Editor (`builder-react`)

- First version of the editor: top bar, left rail (add, layers, templates),
  canvas with inline editing and drag and drop, schema-driven inspector,
  document settings, autosave, crash-safety copy, conflicts, history, shortcuts.
