# builderset

## 0.5.2

### Patch Changes

- Updated dependencies [9f137d0]
  - @builderset/engine@0.5.2
  - @builderset/email@0.5.2
  - @builderset/article@0.5.2
  - @builderset/form@0.5.2
  - @builderset/card@0.5.2
  - @builderset/popup@0.5.2

## 0.5.1

### Patch Changes

- Updated dependencies [f83fa89]
  - @builderset/engine@0.5.1
  - @builderset/email@0.5.1
  - @builderset/article@0.5.1
  - @builderset/card@0.5.1
  - @builderset/form@0.5.1
  - @builderset/popup@0.5.1

## 0.5.0

### Minor Changes

- 36bbbf3: Two new kits on a free canvas: `@builderset/card` and `@builderset/popup`.

  - **Engine — the free canvas.** `FreeStage` places each element at its own x, y, size and rotation (`props.frame`, in the kit's units), with eight resize handles and a rotate handle, pink snap guides to the edges, centre, safe lines and other elements, marquee and Shift selection, arrow nudges, a dimension tag and a position tooltip; one gesture is one undo step. `FreeLayersPanel` (topmost first, hide, lock, rename, drag to restack), `FreeArrange` (align, spread, bring forward), `FreeLayoutFields`, `placeNewNodes` and the geometry helpers come with it; `frameOf`, `freeFrameSchema` and `UNPLACED_FRAME` are in the core. New profile hooks: `stage` (a kit's own board in place of the page canvas), `layersPanel` and `selectionPanel`; `activeDrag` and `readPayload` are exported for a stage's drops; the dock hides the device buttons on a free canvas.
  - **`@builderset/card`** — membership, ID, bank, business, badge, wallet and custom cards in millimetres, front and back: ISO ID-1 formats, bleed and safe area, the ISO chip and stripe positions, member fields filled from a record (`fillCard`, `fieldsUsed`), real QR codes and Code 128 barcodes, and `checkCard` (outside the safe area, text under 6 pt, a QR under 15 mm, a bank card without a chip, unsafe links, unknown fields). `CardView` and `CardPrintSheet` (crop marks, one page per side per member) render it; `CardEditor` edits it, with Format, Print and Data settings, a Members tab, 13 templates in six categories and a 3D preview at actual size.
  - **`@builderset/popup`** — modals, slide-ins, top and bottom bars, full screen, side drawers and inline cards: display rules (trigger, pages, audience, language, how often, dates, devices, priority) as a pure `shouldShow` shared by the browser and the server, motion in and out, closing by ×, outside or Esc, inputs checked by `validateSubmission`, and `checkPopup` (no way to close, a button without a link, an input without a name, shown on every visit, an interstitial on page load). `PopupView` runs it on a real page — triggers, frequency, focus trap, `onSubmit` and `onEvent`; `PopupEditor` edits it, with Format, Display and Motion settings, 14 templates in seven categories and a preview on a mock site, desktop and phone.
  - Both kits: English, Albanian and German; a JSON Schema and fixtures for any backend; `card.css` and `popup.css` under their own prefixes.
  - `builderset` re-exports both kits as `builderset/card/…` and `builderset/popup/…`.

### Patch Changes

- Updated dependencies [36bbbf3]
  - @builderset/engine@0.5.0
  - @builderset/card@0.5.0
  - @builderset/popup@0.5.0
  - @builderset/article@0.5.0
  - @builderset/email@0.5.0
  - @builderset/form@0.5.0

## 0.4.0

### Minor Changes

- da2252f: A new kit, `@builderset/form`: the form builder.

  - The model (`@builderset/form`): a form is steps of fields — short and long text, email, phone, number, date, time, password, dropdown, single and multiple choice, yes/no, rating, scale, slider, full name, address, consent, signature, file upload, and headings, paragraphs, dividers, images and hidden fields. Every field has a key (its column in the responses), checks (lengths, ranges, formats, how many choices) and logic (show only when earlier answers match). `checkForm` says what to fix before it goes live; `validateAnswers` checks a submission — on the server, with exactly the rules the form uses in the browser — and keeps only the answers to fields the visitor was shown. `buildForm`, `step` and `field` write a form from a short outline.
  - The renderer (`@builderset/form/render`): `FormView`, the working form — one step at a time, logic, checks before each step, prefill from the link, saved progress, a hidden trap field, the thank-you message or a redirect — and the parts it is drawn from. `@builderset/form/form.css` is its plain, reset-free stylesheet.
  - The editor (`@builderset/form/editor`): `FormEditor`, after the form mockup — the form on the canvas a step at a time, with its steps above it and its words typed in place; a field inspector with Field, Checks, Logic and More; form settings in General, Submit (message or page, auto-reply, team notifications, webhook), Rules (spam, limits, privacy) and Style; Add, Outline, Templates and Responses (`loadResponses`) on the left; the step and test answers in the dock; Share with `publicUrl`.
  - Templates in `src/templates/`, one folder per category (contact, bookings, feedback, sign-ups, applications, orders) and one file per template, each marking the fields it cannot do without: they stay required and cannot be removed.
  - Locales: English, Albanian and German.
  - Engine, for any kit: `canvasFrame: 'none'` (the kit draws its own card, on the canvas and in the preview), `summaryOf` (the dock's numbers), `defaultParent` (where a new block goes with nothing selected), `nodePanel` (a kit's own inspector for a block), `canRemove` (blocks that stay) and `onNodesAdded` (a step after blocks are added, in the same undo step); more element icons.
  - `builderset` re-exports the form kit as `builderset/form/…`.

### Patch Changes

- Updated dependencies [ed11020]
- Updated dependencies [4ed0022]
- Updated dependencies [3555dc8]
- Updated dependencies [da2252f]
- Updated dependencies [481559e]
  - @builderset/engine@0.4.0
  - @builderset/article@0.4.0
  - @builderset/email@0.4.0
  - @builderset/form@0.4.0

## 0.3.0

### Minor Changes

- 7554288: The Python package, `builderset`, at the same version: `check_article`, `check_email` and `render_email` — the email rendered byte for byte as `renderEmail` writes it. Its wheel is attached to the GitHub release.

### Patch Changes

- Updated dependencies [7554288]
  - @builderset/engine@0.3.0
  - @builderset/email@0.3.0
  - @builderset/article@0.3.0

## 0.2.0

### Minor Changes

- d5ba0c6: Five new theme variables: `--builderset-sidebar`, the rail beside the canvas and the top bar; `--builderset-input`, a field's edge and fill; and `--builderset-state-draft`, `--builderset-state-scheduled` and `--builderset-state-published`, the status chip's colours. `theme/shadcn.css` maps shadcn's `--sidebar` and `--input`. Left unset, the editor looks as it did.

### Patch Changes

- Updated dependencies [d5ba0c6]
  - @builderset/engine@0.2.0
  - @builderset/email@0.2.0
  - @builderset/article@0.2.0

## 0.1.0

### Minor Changes

- ae906f6: The first release: the engine, the email and article kits — editors, renderers, hosts, the theme and the stylesheets — and the all-in-one package.

### Patch Changes

- Updated dependencies [ae906f6]
  - @builderset/engine@0.1.0
  - @builderset/email@0.1.0
  - @builderset/article@0.1.0
