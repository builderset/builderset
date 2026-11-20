---
'@builderset/form': minor
'@builderset/engine': patch
---

The form kit's contract, for servers in any language — and forms in the Python package.

- `@builderset/form/schema.json` (`toFormJSONSchema`): the form document as a JSON Schema, with the field placement, answer kinds, logic operators, formats and limits as data. `@builderset/form/fixtures/*`: a valid form per template and one with every field, broken forms with the issues each must produce, the draft rule, and answer cases with the result `validateAnswers` gives — what a port in another language must agree with.
- The Python package checks forms and their answers: `builderset.form.check_form` and `validate_answers`, with the same codes and results as the TypeScript.
- Safer forms: a redirect or webhook address that is not safe is refused (`url.unsafe`), and the form never navigates to one; a file answer without a name is a `fileType` error rather than a crash; answer keys named like built-in object members (`constructor`) behave like any other; `gt`/`lt` rules no longer match an empty or non-numeric answer; a single choice sent as a list is refused; a bad translation is `props.invalid`, as in the email kit.
- The issue words for `meta.slugMissing` and `meta.slugTaken`, which a backend reports when a form is published without an address or with one already taken.
- `BACKEND.md` names `saved_at` and lists the form's draft rule.
