# @builderset/form

The form builder: an editor for multi-step forms — fields with checks and logic, templates by category, the form's look and what happens after it is sent — a typed JSON document, a React renderer for the page that shows it, and `validateAnswers`, which checks a submission on the server with exactly the rules the form uses in the browser.

> **Not released yet.** Nothing is on npm; see the [repository](https://github.com/builderset/builderset).

## Install

```bash
npm install @builderset/form
```

Also inside [`builderset`](../builderset/README.md), with every other kit, as `builderset/form/…`. Install one or the other: both at different versions put two engines in the page.

`react` and `react-dom` 19 for the editor and the renderer. The core entry (`@builderset/form`) needs neither and runs on Node 20 or newer.

## The editor, in a back office

```tsx
'use client';
import { createFormRegistry, type FormDocument } from '@builderset/form';
import { FormEditor } from '@builderset/form/editor';
import { createRestHost } from '@builderset/form/host';
import '@builderset/form/styles.css';

const registry = createFormRegistry();
const host = createRestHost<FormDocument>({ baseUrl: `/api/forms/${id}` });

<FormEditor
  document={form}
  registry={registry}
  host={host}
  record={record}
  onBack={() => history.back()}
  publicUrl={(slug) => `https://example.com/f/${slug}`}
/>;
```

## The form, on a page

```tsx
import { FormView } from '@builderset/form/render';
import '@builderset/form/form.css';

<FormView
  document={form}
  locale="sq"
  prefill={Object.fromEntries(new URLSearchParams(location.search))}
  onSubmit={async ({ values, files, trap }) => {
    const response = await fetch(`/api/forms/${form.meta.slug}/responses`, {
      method: 'POST',
      body: JSON.stringify({ values, trap }),
    });
    return response.ok;
  }}
/>;
```

`form.css` is plain CSS under `.bsf`, with no reset: safe beside any other stylesheet.

## On the server

Never take the browser's word for it — check the answers again:

```ts
import { createFormRegistry, parseForm, validateAnswers } from '@builderset/form';

const form = parseForm(stored, createFormRegistry());
const { ok, errors, values } = validateAnswers(form, request.body.values);
// `values` holds only the fields the visitor was shown, numbers as numbers.
```

## What is in it

- **Fields** — short and long text, email, phone, number, date, time, password; dropdown, single and multiple choice, yes/no, stars, a 0–10 scale, a slider; full name, address, consent, signature, file upload; headings, paragraphs, lines, pictures and hidden fields.
- **Steps** — one at a time, with a progress bar or numbers.
- **Checks** — required, lengths, ranges, formats, how many choices, file types and sizes; the form's own error words.
- **Logic** — a field shows only when earlier answers match; a hidden field is never required and its stale answer is dropped.
- **Templates** — `src/templates/`, one folder per category and one file per template. A template marks the fields it cannot do without: they stay required and cannot be removed.
- **Settings** — the buttons, what happens after sending (a message, a page, an auto-reply, the team told), spam protection, limits, how long responses are kept, and the look.

## Licence

MIT
