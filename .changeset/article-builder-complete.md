---
'@builderset/engine': minor
'@builderset/article': minor
---

The rest of the article builder's design, and templates organised by category.

- The library: hover a block a moment and a card beside the panel shows it filled in (from the kit's `sampleOf`), with what it is for.
- Layers: a Blocks | Outline switch. Outline lists the sections the headings make — anywhere in the tree — with the words in each; click one to go to it.
- Templates: cards with a sketch of their blocks and a line on what they are for; Use asks "Add to end" or "Replace" (one undo brings the page back). Category chips and headers. Saved sections are cards too, and can be dragged onto the page.
- Media: a fourth tab with the pictures at hand — uploaded now, already in the document, and the project's library when the host has `listMedia()` (new, optional). Drag one onto the page, or click it, for an image block.
- Preview (Ctrl Shift P, or Preview in the top bar): the page as readers see it, over the editor, with a device switch and "Open on the site" when the host has `previewUrl`.
- History: a timeline; pick a version to see what changed from it to the draft — the title, blocks added, removed and changed, the old words struck through — then restore it.
- Dragging: a card follows the pointer, trailing and tilting; the dock steps aside and "Drop here to delete" takes its place for blocks already on the page.
- Several blocks selected: save them as a section, duplicate, hide from readers or delete them.
- Profiles: `renderPreview` and `sampleOf` (both optional), `templateCategories`; `TemplateSpec` has a required `category` and an optional `description`; `TemplateBlock` and `TemplateCategory` are exported.
- The article's templates live in `src/templates/`, one folder per category (essentials, guides, lists, reviews, news) and one file per template — 14 in all — built from small block helpers; `ARTICLE_TEMPLATE_CATEGORIES` and `defineTemplate` are exported, and a test builds every template against the elements' schemas.
