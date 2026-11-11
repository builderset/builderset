# Changelog

## 0.1.0

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
