# @builderset/form

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

- da2252f: A new kit, `@builderset/form`: the form builder.

  - The model (`@builderset/form`): a form is steps of fields — short and long text, email, phone, number, date, time, password, dropdown, single and multiple choice, yes/no, rating, scale, slider, full name, address, consent, signature, file upload, and headings, paragraphs, dividers, images and hidden fields. Every field has a key (its column in the responses), checks (lengths, ranges, formats, how many choices) and logic (show only when earlier answers match). `checkForm` says what to fix before it goes live; `validateAnswers` checks a submission — on the server, with exactly the rules the form uses in the browser — and keeps only the answers to fields the visitor was shown. `buildForm`, `step` and `field` write a form from a short outline.
  - The renderer (`@builderset/form/render`): `FormView`, the working form — one step at a time, logic, checks before each step, prefill from the link, saved progress, a hidden trap field, the thank-you message or a redirect — and the parts it is drawn from. `@builderset/form/form.css` is its plain, reset-free stylesheet.
  - The editor (`@builderset/form/editor`): `FormEditor`, after the form mockup — the form on the canvas a step at a time, with its steps above it and its words typed in place; a field inspector with Field, Checks, Logic and More; form settings in General, Submit (message or page, auto-reply, team notifications, webhook), Rules (spam, limits, privacy) and Style; Add, Outline, Templates and Responses (`loadResponses`) on the left; the step and test answers in the dock; Share with `publicUrl`.
  - Templates in `src/templates/`, one folder per category (contact, bookings, feedback, sign-ups, applications, orders) and one file per template, each marking the fields it cannot do without: they stay required and cannot be removed.
  - Locales: English, Albanian and German.
  - Engine, for any kit: `canvasFrame: 'none'` (the kit draws its own card, on the canvas and in the preview), `summaryOf` (the dock's numbers), `defaultParent` (where a new block goes with nothing selected), `nodePanel` (a kit's own inspector for a block), `canRemove` (blocks that stay) and `onNodesAdded` (a step after blocks are added, in the same undo step); more element icons.
  - `builderset` re-exports the form kit as `builderset/form/…`.

- 481559e: The form kit's contract, for servers in any language — and forms in the Python package.

  - `@builderset/form/schema.json` (`toFormJSONSchema`): the form document as a JSON Schema, with the field placement, answer kinds, logic operators, formats and limits as data. `@builderset/form/fixtures/*`: a valid form per template and one with every field, broken forms with the issues each must produce, the draft rule, and answer cases with the result `validateAnswers` gives — what a port in another language must agree with.
  - The Python package checks forms and their answers: `builderset.form.check_form` and `validate_answers`, with the same codes and results as the TypeScript.
  - Safer forms: a redirect or webhook address that is not safe is refused (`url.unsafe`), and the form never navigates to one; a file answer without a name is a `fileType` error rather than a crash; answer keys named like built-in object members (`constructor`) behave like any other; `gt`/`lt` rules no longer match an empty or non-numeric answer; a single choice sent as a list is refused; a bad translation is `props.invalid`, as in the email kit.
  - The issue words for `meta.slugMissing` and `meta.slugTaken`, which a backend reports when a form is published without an address or with one already taken.
  - `BACKEND.md` names `saved_at` and lists the form's draft rule.

### Patch Changes

- Updated dependencies [ed11020]
- Updated dependencies [4ed0022]
- Updated dependencies [3555dc8]
- Updated dependencies [da2252f]
- Updated dependencies [481559e]
  - @builderset/engine@0.4.0
