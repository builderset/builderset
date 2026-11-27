# @builderset/article

## 0.5.1

### Patch Changes

- Updated dependencies [f83fa89]
  - @builderset/engine@0.5.1

## 0.5.0

### Patch Changes

- Updated dependencies [36bbbf3]
  - @builderset/engine@0.5.0

## 0.4.0

### Minor Changes

- ed11020: The rest of the article builder's design, and templates organised by category.

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

- 4ed0022: A new workspace design, first for the article builder.

  - The frame: the panels sit on the page's background without borders; the canvas is an inset, rounded board with the page on it as a card, and a phone or tablet bezel on those screens.
  - The top bar: back, the blocks panel, "Articles / title" with its state (Draft, Scheduled, Published, Published · edited), a saved dot, a search box that opens the command menu, history, preview, the split publish button and the settings panel.
  - The dock: a floating toolbar at the foot of the canvas with undo and redo, the device, the zoom, words and reading time, the issues ("3 to check" or "Ready"), focus mode and the shortcuts. It replaces the status bar.
  - The command menu (Ctrl K): every action, every heading to jump to and every block to insert, filtered as you type.
  - Focus mode (Ctrl \\): both panels away, and back as they were.
  - The left panel's tabs and the inspector's are segmented, with a pill that slides to the chosen tab. The block library has three tiles across, counts per category, recent blocks as chips and `/` to search.
  - The inspector: "Document › Paragraph", the block's name and description with a close button; the Style tab's groups fold, and a setting with a few choices shows them all at once, "Auto" first.
  - The article's document settings start with what to fix before publishing, each with a Fix that jumps to the block.
  - The block toolbar on the canvas is light, like the rest of the workspace; the language switch is a bar over the canvas.
  - New messages for all of it, in English, Albanian and German. New exports: `SegmentedTabs` from `/ui`; `ReadyCard`, `IssueList`, `useIssues`, `useJumpToIssue` and `LanguageBar` from `/editor`.

### Patch Changes

- Updated dependencies [ed11020]
- Updated dependencies [4ed0022]
- Updated dependencies [3555dc8]
- Updated dependencies [da2252f]
- Updated dependencies [481559e]
  - @builderset/engine@0.4.0

## 0.3.0

### Minor Changes

- 7554288: The Python package, `builderset`, at the same version: `check_article`, `check_email` and `render_email` — the email rendered byte for byte as `renderEmail` writes it. Its wheel is attached to the GitHub release.

### Patch Changes

- Updated dependencies [7554288]
  - @builderset/engine@0.3.0

## 0.2.0

### Minor Changes

- d5ba0c6: Five new theme variables: `--builderset-sidebar`, the rail beside the canvas and the top bar; `--builderset-input`, a field's edge and fill; and `--builderset-state-draft`, `--builderset-state-scheduled` and `--builderset-state-published`, the status chip's colours. `theme/shadcn.css` maps shadcn's `--sidebar` and `--input`. Left unset, the editor looks as it did.

### Patch Changes

- Updated dependencies [d5ba0c6]
  - @builderset/engine@0.2.0

## 0.1.0

### Minor Changes

- ae906f6: The first release: the engine, the email and article kits — editors, renderers, hosts, the theme and the stylesheets — and the all-in-one package.

### Patch Changes

- Updated dependencies [ae906f6]
  - @builderset/engine@0.1.0
