# Changelog

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

- 3555dc8: The email builder's new design, and email templates organised by category.

  - The canvas is a mail window: the inbox's header — sender, recipient, subject and preheader, variables as chips — over the email.
  - Dock: "Example data" (Ctrl Shift E) fills the variables with the email type's sample, and "Preview dark mode" shows the email as a dark inbox draws it — custom dark colours when set, light backgrounds darkened and dark text lightened otherwise.
  - Left rail: Add, Layers, Modules, Variables. Variables lists what the email can say, grouped as the type declares it, with example values: click to insert where you were typing, or drag onto any text. Modules: Import HTML, templates by category (scaled-down previews; Add to end or Replace, which also sets the subject, preheader and look), copies of this email's sections and saved modules — all draggable.
  - Email settings in four tabs (General, Style, Dark, Tracking): what to fix before activating, the inbox preview with variables or example data, characters in the subject with example data, "All N variables"; the dark preview switch; every link in the email with its UTM parameters.
  - "Send test" in the top bar when the host passes `onSendTest(document, address)` to `EmailEditor`.
  - The inspector's crumb shows the whole way up — Email › Section › Row › Column › Text — each step selectable. Layers: "3 sections · 12 blocks" and Collapse all / Expand all.
  - Engine, for any kit: profiles can add left-rail tabs (`sideTabs`), name the third tab (`templatesTab`), hide Media (`mediaTab`), add dock buttons (`dockItems`, with `DockToggle`) and top-bar buttons (`topBarActions`); `canvasHeader` now draws on bare canvases too. Template blocks nest (`children`), and a template's `apply` sets what else Replace changes. `TemplateGallery` (list or grid), `templateFragment`, `templateDocument`, `insertVariableAtCaret`, `setVariableDragData`, `setActiveDrag`, `setDragChip` and `DRAG_TYPE_MIME` are exported.
  - The email's templates live in `src/templates/`, one folder per category (newsletters, codes & verification, welcome, account & security, orders & receipts, promotions, events & reminders) and one file per template, built from small block helpers; `EMAIL_TEMPLATES`, `EMAIL_TEMPLATE_CATEGORIES`, `defineTemplate`, `toTemplateSpec` and `buildTemplateEmail` (a new design from a template) are exported from `@builderset/email/editor`. A test builds and checks every template.

- da2252f: A new kit, `@builderset/form`: the form builder.

  - The model (`@builderset/form`): a form is steps of fields — short and long text, email, phone, number, date, time, password, dropdown, single and multiple choice, yes/no, rating, scale, slider, full name, address, consent, signature, file upload, and headings, paragraphs, dividers, images and hidden fields. Every field has a key (its column in the responses), checks (lengths, ranges, formats, how many choices) and logic (show only when earlier answers match). `checkForm` says what to fix before it goes live; `validateAnswers` checks a submission — on the server, with exactly the rules the form uses in the browser — and keeps only the answers to fields the visitor was shown. `buildForm`, `step` and `field` write a form from a short outline.
  - The renderer (`@builderset/form/render`): `FormView`, the working form — one step at a time, logic, checks before each step, prefill from the link, saved progress, a hidden trap field, the thank-you message or a redirect — and the parts it is drawn from. `@builderset/form/form.css` is its plain, reset-free stylesheet.
  - The editor (`@builderset/form/editor`): `FormEditor`, after the form mockup — the form on the canvas a step at a time, with its steps above it and its words typed in place; a field inspector with Field, Checks, Logic and More; form settings in General, Submit (message or page, auto-reply, team notifications, webhook), Rules (spam, limits, privacy) and Style; Add, Outline, Templates and Responses (`loadResponses`) on the left; the step and test answers in the dock; Share with `publicUrl`.
  - Templates in `src/templates/`, one folder per category (contact, bookings, feedback, sign-ups, applications, orders) and one file per template, each marking the fields it cannot do without: they stay required and cannot be removed.
  - Locales: English, Albanian and German.
  - Engine, for any kit: `canvasFrame: 'none'` (the kit draws its own card, on the canvas and in the preview), `summaryOf` (the dock's numbers), `defaultParent` (where a new block goes with nothing selected), `nodePanel` (a kit's own inspector for a block), `canRemove` (blocks that stay) and `onNodesAdded` (a step after blocks are added, in the same undo step); more element icons.
  - `builderset` re-exports the form kit as `builderset/form/…`.

### Patch Changes

- 481559e: The form kit's contract, for servers in any language — and forms in the Python package.

  - `@builderset/form/schema.json` (`toFormJSONSchema`): the form document as a JSON Schema, with the field placement, answer kinds, logic operators, formats and limits as data. `@builderset/form/fixtures/*`: a valid form per template and one with every field, broken forms with the issues each must produce, the draft rule, and answer cases with the result `validateAnswers` gives — what a port in another language must agree with.
  - The Python package checks forms and their answers: `builderset.form.check_form` and `validate_answers`, with the same codes and results as the TypeScript.
  - Safer forms: a redirect or webhook address that is not safe is refused (`url.unsafe`), and the form never navigates to one; a file answer without a name is a `fileType` error rather than a crash; answer keys named like built-in object members (`constructor`) behave like any other; `gt`/`lt` rules no longer match an empty or non-numeric answer; a single choice sent as a list is refused; a bad translation is `props.invalid`, as in the email kit.
  - The issue words for `meta.slugMissing` and `meta.slugTaken`, which a backend reports when a form is published without an address or with one already taken.
  - `BACKEND.md` names `saved_at` and lists the form's draft rule.

## 0.3.0

### Minor Changes

- 7554288: The Python package, `builderset`, at the same version: `check_article`, `check_email` and `render_email` — the email rendered byte for byte as `renderEmail` writes it. Its wheel is attached to the GitHub release.

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
