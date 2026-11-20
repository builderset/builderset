# @builderset/card

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
