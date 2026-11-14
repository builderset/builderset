# @builderset/email

The email builder: a block editor for email templates, a typed JSON document, and a renderer that writes the HTML and plain text every mail client shows — tables, inline styles, dark-mode hints, Outlook's conditional comments. The renderer is plain TypeScript, so a mailer on a server sends with it and needs no React.

> **Not released yet.** Nothing is on npm; see the [repository](https://github.com/mkurtii/builderset).

## Install

```bash
npm install @builderset/email
```

Also inside [`builderset`](../builderset/README.md), with every other kit, as `builderset/email/…`. Install one or the other: both at different versions put two engines in the page.

`react` and `react-dom` 19 for the editor only. The `core`, `render` and `host` entries need neither and run on Node 20 or newer.

## The smallest working example

The editor, in a back office:

```tsx
'use client';
import { createEmailRegistry, type EmailType } from '@builderset/email';
import { EmailEditor } from '@builderset/email/editor';
import { createRestHost } from '@builderset/email/host';
import { DEFAULT_BRAND } from '@builderset/email/render';

const registry = createEmailRegistry();
const host = createRestHost({
  baseUrl: `/api/emails/${id}`,
  uploadUrl: '/api/media',
  resolveMedia: (key) => `https://cdn.example.com/${key}`,
  toast: (kind, message) => console.log(kind, message),
});

export function EditEmail({ document, record, type }: { type: EmailType | null; … }) {
  return (
    <EmailEditor
      document={document}
      registry={registry}
      host={host}
      type={type} // the kind of email: its variables and preview samples
      brand={{ ...DEFAULT_BRAND, name: 'Example', website: 'https://example.com' }}
      record={record} // { status, scheduledAt, publishedAt }
      onBack={() => history.back()}
      storageKey={`email:${id}`}
    />
  );
}
```

Sending, on a server — no React:

```ts
import { createEmailRegistry, parseEmail } from '@builderset/email';
import { renderEmail } from '@builderset/email/render';

const registry = createEmailRegistry();
const document = parseEmail(row.document, registry); // null: not an email
if (!document) throw new Error('Not an email');

const { html, text, subject, preheader, warnings } = renderEmail(document, {
  assetUrl: (key) => `https://cdn.example.com/${key}`,
  brand,
  data: { recipient: { name: 'Ana' }, reset_url: link }, // what the variables are filled with
  locale: 'en',
});
await mailer.send({ to, subject, html, text });
```

## Styles and theme

The editor needs one stylesheet, complete on its own — no Tailwind, no configuration:

```ts
import '@builderset/email/styles.css';
```

The email itself is styled inline by the renderer and needs nothing from the page it is shown in; a dark editor still shows the email as a light inbox would, unless the design's own dark-mode settings say otherwise. The editor's look is set with sixteen CSS variables, `theme` and `tokens`, or `@builderset/email/theme/shadcn.css`; [the engine's README](../engine/README.md#styles) has the details and the known limits. The canvas loads the design's fonts from Google Fonts; `fontPreviews={false}` stops it.

## Entry points

| Import                               | What                                                                                                                           | Runs on            |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | ------------------ |
| `@builderset/email`                  | The document, the standard blocks, variables and email types, the checks, parsing, import from HTML, building a design in code | Browser and server |
| `@builderset/email/render`           | `renderEmail` (HTML, text, subject, preheader, warnings), the brand kit, the social icons' addresses                           | Browser and server |
| `@builderset/email/editor`           | `EmailEditor` and `EmailCanvas`                                                                                                | Browser            |
| `@builderset/email/host`             | `BuilderHost` and the two ready-made hosts, `createMemoryHost` and `createRestHost` (the engine's, under this kit's name)      | Browser and server |
| `@builderset/email/locales/<code>`   | The editor's words in another language: `sq`, `de` (English is built in)                                                       | Both               |
| `@builderset/email/styles.css`       | Everything the editor needs: theme, reset, the workspace and this kit's editor                                                 | Browser            |
| `@builderset/email/theme/shadcn.css` | The editor in a shadcn-themed project (`theme/shadcn-hsl.css` for HSL numbers)                                                 | Browser            |
| `@builderset/email/schema.json`      | The document's JSON Schema, for a backend in another language                                                                  | —                  |
| `@builderset/email/fixtures/*`       | Valid and invalid documents, golden renders (`golden/*.json` → `.html`, `.txt`) and `render_data.json`, for a port's tests     | —                  |

The social block's icons are in the package's `icons/social/` folder: 96px PNGs, since Gmail and Outlook show no SVG. Copy the folder anywhere public and pass `socialIcon: socialIconsAt('https://example.com/email/social')` to `renderEmail`; [icons/README.md](icons/README.md) has the details.

## Components

<!-- props: editor/index.d.ts EmailEditor EmailCanvas -->

#### `EmailEditor`

| Prop                   | Type                                                                       | Required | What it does                                                                                                                                                                                                        |
| ---------------------- | -------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `document`             | `EmailDocument`                                                            | yes      | The design to edit. Read once, when the editor mounts: to load another, remount it (a new `key`).                                                                                                                   |
| `registry`             | `ElementRegistry`                                                          | yes      | The blocks a design can hold — usually `createEmailRegistry()`.                                                                                                                                                     |
| `host`                 | `BuilderHost<EmailDocument>`                                               | yes      | The adapter for everything that leaves the browser: saving, publishing, uploads, media URLs, notices.                                                                                                               |
| `type`                 | `EmailType \| null`                                                        | yes      | The email type this template is for: its variables and samples.                                                                                                                                                     |
| `brand`                | `BrandKit`                                                                 | yes      | The brand kit the design's `brand.*` colours, its logo and the footer's address come from.                                                                                                                          |
| `socialIconBase`       | `string`                                                                   |          | The public site, where the social block's icons are served from.                                                                                                                                                    |
| `record`               | `RecordFacts`                                                              | yes      | `status: 'published'` means the design is the ACTIVE one.                                                                                                                                                           |
| `onRecordChange`       | `(patch: Partial<RecordFacts>) => void`                                    |          | Called with the facts the writer changed in the editor. Keep them and pass the updated record back as `record`; the change also counts as unsaved work.                                                             |
| `onBack`               | `() => void`                                                               | yes      | Called to leave the editor (the back button). With unsaved changes the writer is asked first; the editor does not navigate by itself.                                                                               |
| `onDuplicate`          | `() => void`                                                               |          | Adds "Duplicate" to the publish menu; called when the writer picks it.                                                                                                                                              |
| `onDelete`             | `() => Promise<boolean>`                                                   |          | Adds "Delete" to the publish menu; called once the writer confirms. Resolve `true` once it is deleted; leaving the editor afterwards is up to the host.                                                             |
| `locale`               | `string`                                                                   |          | The editor's own language. `'auto'` follows `<html lang>`. Default: `'en'`.                                                                                                                                         |
| `locales`              | `Readonly<Record<string, EmailLocale \| undefined>>`                       |          | Other languages, by code: `{ sq }` from `@builderset/email/locales/sq`. English is built in.                                                                                                                        |
| `messages`             | `{ engine?: { back?: string \| undefined; untitled?: string \| undefin…`   |          | Replace single words, in whatever language is active.                                                                                                                                                               |
| `contentLocales`       | `readonly string[]`                                                        |          | The languages a design can be written in. One: no language switch.                                                                                                                                                  |
| `defaultContentLocale` | `string`                                                                   |          | The language a new design is written in. Default: the first of `contentLocales`.                                                                                                                                    |
| `storageKey`           | `string`                                                                   |          | Where the crash-safety copy is kept in localStorage; omit to disable.                                                                                                                                               |
| `savedAt`              | `string \| null`                                                           |          | When the server copy was last saved — a local copy newer than this is offered back.                                                                                                                                 |
| `theme`                | `"auto" \| "dark" \| "light"`                                              |          | 'light' (the default), 'dark', or 'auto' to follow the page. Menus and dialogs follow it too.                                                                                                                       |
| `tokens`               | `Partial<Record<"font" \| "background" \| "surface" \| "foreground" \| "…` |          | Theme values by the public variables' names without their prefix: `{ primary: '#da6c1e' }`.                                                                                                                         |
| `className`            | `string`                                                                   |          | Applied to the editor's root element, the one that carries the theme.                                                                                                                                               |
| `fontPreviews`         | `boolean`                                                                  |          | Load fonts from Google Fonts: the ones the email uses, on the canvas, and previews of the choices in the font menu. `false`: never — for a page whose Content-Security-Policy allows no font host. Default: `true`. |

#### `EmailCanvas`

| Prop           | Type                                                 | Required | What it does                                                                                                                                          |
| -------------- | ---------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `document`     | `EmailDocument`                                      | yes      | The email to draw, as it is: a multi-language one is not switched to `locale` here.                                                                   |
| `editText`     | `(field: EditableField) => ReactNode`                |          | Editor only: draws an editable field in place of a rich-text value.                                                                                   |
| `mobile`       | `boolean`                                            |          | Lays the email out as a phone shows it: columns stacked.                                                                                              |
| `editing`      | `boolean`                                            |          | Editor only: marks every node so the overlay can find it.                                                                                             |
| `fontPreviews` | `boolean`                                            |          | Load the fonts the email uses from Google Fonts, as a mail client would. `false`: the fallback fonts, and no request to a third party. Default: true. |
| `brand`        | `BrandKit`                                           |          | The brand kit `brand.*` colours, the logo block and the footer's address come from. Default: `DEFAULT_BRAND`, a neutral placeholder.                  |
| `data`         | `Record<string, unknown>`                            |          | The values variables are filled with.                                                                                                                 |
| `assetUrl`     | `(key: string) => string`                            | yes      | Storage key → absolute URL.                                                                                                                           |
| `locale`       | `string`                                             |          | The reader's language: dates and money are formatted for it, and `renderEmail` shows a multi-language template in it. Default: `'en'`.                |
| `mode`         | `"preview-raw" \| "send"`                            |          | `send`: variables are replaced by their values. `preview-raw`: they stay visible as `{{ name }}` chips, for designing without sample data.            |
| `socialIcon`   | `(network: string, style: string) => string \| null` |          | A network → icon URL, for the social block. Without it, text links.                                                                                   |
| `currency`     | `string`                                             |          | For the currency format.                                                                                                                              |

<!-- /props -->

### `renderEmail(document, options)`

| Option       | What it does                                                                                                        |
| ------------ | ------------------------------------------------------------------------------------------------------------------- |
| `assetUrl`   | Storage key → absolute URL, for images and the logo. Required                                                       |
| `brand`      | The brand kit: name, website, address, logo (and a dark one), colours, font, social links. Default: `DEFAULT_BRAND` |
| `data`       | The values the variables are filled with                                                                            |
| `locale`     | Which language of a multi-language design to send, and the number and date formats                                  |
| `mode`       | `'send'` fills the variables; `'preview-raw'` leaves them visible as `{{ name }}`, for designing without data       |
| `socialIcon` | A network and a style → the icon's URL. Without it, the social block is text links                                  |
| `currency`   | For prices                                                                                                          |

`warnings` lists what the reader may notice, each with a code: `variable.noValue` (a variable `data` did not fill), `meta.preheaderMissing`, and `size.clipping` (over about 90 KB of HTML, which Gmail cuts off).

## The host adapter

The editor owns nothing: no database, no routes, no file storage. It asks its `host` to save, publish, upload, list versions and show messages. `createRestHost` speaks to an API of the shape in [BACKEND.md](../engine/src/host/BACKEND.md), which also says what a backend must store, check on every write and keep safe; `createMemoryHost` keeps everything in memory, for tests and demos. A project with its own API writes its own `BuilderHost`.

## Custom blocks

A block is an element: a type, a version, a zod schema for its props, and defaults. The editor builds its inspector from the schema. Register it with `createEmailRegistry([myBlock])`; [the article kit's README](../article/README.md#custom-elements) shows `defineElement` in full, and the standard blocks in `src/core/blocks/` are worked examples.

## The document

The same normalised tree as every Builderset document (a flat `nodes` record, the root's id `root`), with the email's own meta (subject, preheader) and settings (width, colours, fonts, dark mode, tracking). Inline text is `RichText` runs with marks, never HTML; uploads are referenced by storage key.

**The standard blocks.** `createEmailRegistry(plugins?)` returns a registry with all of them:

| Category  | Blocks                                                                                |
| --------- | ------------------------------------------------------------------------------------- |
| Structure | section, row (one to four columns in fixed layouts), column                           |
| Content   | heading, text, list, quote, button, image, logo, video, divider, spacer, menu, social |
| Commerce  | product, line items, coupon, key-value, survey, repeat, conditional, footer           |

**Variables and email types.** A template is written for an `EmailType`: its variables (with types, examples, and which are required), the paths it must use (a reset link), and realistic samples for the preview. Variables appear in text as chips and in links as `{{ name }}`; `SYSTEM_VARIABLES` are available in every template.

**Checking.** `checkEmail(document, registry, type, { locales })` returns errors, which block publishing, and warnings; `isDraftBlocking` and `isPublishBlocking` decide what an autosave and a publish refuse. `parseEmail(raw, registry)` returns the document, or `null` when it is not an email at all.

**Building a design in code.** `buildEmail(registry, { meta, settings, locale }, sections)` builds a document from plain data, with every text in several languages through `inLanguages({ en, de, … })` — for templates a project ships ready-made.

**Import.** `importEmailHtml(html, registry, { parser })` turns an existing email's HTML into blocks. On a server, pass a `parser`: there is no `DOMParser` there.

**The contract with a backend.** `schema/email.schema.json`, the fixtures and the golden renders are generated and checked by this package's tests. After an intentional change, run `UPDATE_FIXTURES=1 pnpm test` and commit the result: a port of the renderer to another language is done when it writes the same golden files.

## Links

- [The repository](https://github.com/mkurtii/builderset) · [what a backend must do](../engine/src/host/BACKEND.md) · [the engine](../engine/README.md)
- [Licence: MIT](LICENSE). The changelog starts with the first release.
