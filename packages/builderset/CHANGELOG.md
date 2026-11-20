# builderset

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
