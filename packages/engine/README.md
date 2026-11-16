# @builderset/engine

What every Builderset kit is built on: a typed node tree, an element registry, every editing operation with undo, the structural and translation checks, reading stored documents with migrations — and the editor's workspace, generic over the document. A project usually installs a kit ([`@builderset/article`](../article/README.md), [`@builderset/email`](../email/README.md)), which brings this package with it.

> **Not released yet.** Nothing is on npm; see the [repository](https://github.com/builderset/builderset).

## Install

```bash
npm install @builderset/engine
```

Also inside [`builderset`](../builderset/README.md), with every other kit, as `builderset/engine/…`. Install one or the other: both at different versions put two engines in the page.

Installed directly to write a project's own elements, or a new kit. `react` and `react-dom` 19 for the editor; the core and `host` entries need neither and run on Node 20 or newer.

## The smallest working example

Editing a document without the editor — the same operations the editor runs, with undo:

```ts
import { createFragment, History, insert, update } from '@builderset/engine';
import { createArticleDocument, createArticleRegistry } from '@builderset/article';

const registry = createArticleRegistry();
const history = new History(createArticleDocument({ title: 'Hello' }));

const [id] = history.commit(
  (draft) => insert(draft, registry, draft.root, 0, createFragment(registry, 'heading')),
  { label: 'Add heading' },
);
history.commit((draft) => update(draft, registry, id, { props: { level: 3 } }), {
  label: 'Heading level',
});
history.undo();
```

`insert`, `move`, `remove`, `duplicate`, `update`, `wrap`, `unwrap` and `replaceType` enforce placement, depth, node count, minimum and maximum children, and locks; a refusal throws a `BuilderError` with a message `code` and leaves the document untouched. `History` merges consecutive edits that share a `coalesceKey` (typing) within 750 ms, groups a `transaction` into one step, restores the selection with each step, and keeps 200 steps.

The editor is used through a kit: `ArticleEditor`, `EmailEditor`. A kit is `BuilderEditor` with an `EditorProfile` — how the canvas draws the document, its settings panel, what blocks publishing, its categories.

## Styles

A project imports its kit's stylesheet once — `@builderset/email/styles.css` or `@builderset/article/styles.css` — and needs nothing else: no Tailwind, no configuration. This package's own, `@builderset/engine/styles.css`, is for a kit being written. Every class is prefixed (`bst:flex`), every rule is inside `.builderset`, and nothing is in a `@layer`, so the page's styles and the editor's do not touch each other.

The look is twenty-one CSS variables, each with a light and a dark default; [src/theme/README.md](src/theme/README.md) lists them. Three ways to set them, from least to most work:

1. **Nothing.** The built-in look: neutral greys and a blue accent.
2. **One import, in a project themed the shadcn way:** `@builderset/<kit>/theme/shadcn.css` maps `--background`, `--primary`, `--radius` and the rest; `theme/shadcn-hsl.css` is for tokens kept as bare HSL numbers.
3. **By hand**, in CSS or from JavaScript:

```css
.builderset {
  --builderset-primary: #da6c1e;
  --builderset-font: 'Poppins', sans-serif;
}
```

```tsx
<EmailEditor tokens={{ primary: '#da6c1e', font: "'Poppins', sans-serif" }} />
```

`theme` is `'light'` (the default), `'dark'`, or `'auto'`, which follows a `dark` or `light` class or `data-theme` on an ancestor, and otherwise the operating system. Menus, popovers and dialogs follow it: they render inside the editor's root.

**Known limits**

- A page rule with an id (`#app button { … }`) outranks the editor's rules. Write it as `:where(#app) button`.
- Do not mount the editor inside an element with `transform`, `filter` or `contain` (an animated route transition is the usual one): its menus are placed against the viewport and would be measured from that element instead.
- The defaults use CSS `light-dark()`: browsers from 2024 on.
- The email kit loads fonts from Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`). A page with a Content-Security-Policy allows them in `style-src` and `font-src`, or passes `fontPreviews={false}`.

## Entry points

| Import                                | What                                                                                                                                                                                       | Runs on            |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------ |
| `@builderset/engine`                  | The node tree, the registry, operations, `History`, the checks, parsing with migrations, rich text, styles, media, languages, the clipboard format; `z`, the zod the editor validates with | Browser and server |
| `@builderset/engine/host`             | `BuilderHost`, the editor's contract with a backend, and two ready-made hosts: `createMemoryHost`, `createRestHost`                                                                        | Browser and server |
| `@builderset/engine/editor`           | `BuilderEditor`, the inspector's fields for custom elements, and the hooks a kit builds on                                                                                                 | Browser            |
| `@builderset/engine/ui`               | The editor's own UI kit: buttons, fields, menus, dialogs, sheets — what the kits' panels are made of                                                                                       | Browser            |
| `@builderset/engine/locales/<code>`   | The editor's words in another language: `sq`, `de` (English is built in)                                                                                                                   | Both               |
| `@builderset/engine/styles.css`       | The stylesheet of the workspace and its UI kit, for a kit being written; a project imports its kit's instead                                                                               | Browser            |
| `@builderset/engine/theme/shadcn.css` | The editor in a shadcn-themed project (`theme/shadcn-hsl.css` for HSL numbers)                                                                                                             | Browser            |

## Components

### The workspace and the inspector's fields

<!-- props: editor/index.d.ts -->

#### `AlignButtons`

| Prop       | Type                      | Required | What it does                                                                                           |
| ---------- | ------------------------- | -------- | ------------------------------------------------------------------------------------------------------ |
| `value`    | `string`                  | yes      | The selected option, if any.                                                                           |
| `options`  | `readonly string[]`       | yes      | The alignments offered, in order (`'left'`, `'center'`, …); each is drawn as its icon.                 |
| `onChange` | `(value: string) => void` | yes      | Called with the option the writer clicks.                                                              |
| `label`    | `string`                  | yes      | The group's accessible name.                                                                           |
| `tone`     | `"panel" \| "toolbar"`    |          | `panel`: a full-width framed strip; `toolbar`: bare buttons for the block toolbar. Default: `'panel'`. |

#### `BuilderEditor`

| Prop                   | Type                                                                       | Required | What it does                                                                                                                                                                                                                                                    |
| ---------------------- | -------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `document`             | `TDoc`                                                                     | yes      | The document to edit. Read once, when the editor mounts: to load another, remount it (a new `key`).                                                                                                                                                             |
| `registry`             | `ElementRegistry`                                                          | yes      | The elements a document can hold: how each is drawn, edited and checked.                                                                                                                                                                                        |
| `host`                 | `BuilderHost<TDoc>`                                                        | yes      | The adapter for everything that leaves the browser: saving, publishing, uploads, media URLs, notices.                                                                                                                                                           |
| `profile`              | `EditorProfile<TDoc>`                                                      | yes      | What kind of document this is: the kit's canvas, checks and panels.                                                                                                                                                                                             |
| `record`               | `TRecord`                                                                  |          | The stored record's facts (status, schedule), when it has any. Default: a draft.                                                                                                                                                                                |
| `onRecordChange`       | `(patch: Partial<TRecord>) => void`                                        |          | Called with the facts the writer changed in the editor. Keep them and pass the updated record back as `record`; the change also counts as unsaved work.                                                                                                         |
| `onBack`               | `() => void`                                                               | yes      | Called to leave the editor (the back button). With unsaved changes the writer is asked first; the editor does not navigate by itself.                                                                                                                           |
| `onDuplicate`          | `() => void`                                                               |          | Adds "Duplicate" to the publish menu; called when the writer picks it.                                                                                                                                                                                          |
| `onDelete`             | `() => Promise<boolean>`                                                   |          | Adds "Delete" to the publish menu; called once the writer confirms. Resolve `true` once it is deleted; leaving the editor afterwards is up to the host.                                                                                                         |
| `locale`               | `string`                                                                   |          | The editor's own language. `'auto'` follows `<html lang>`. Default: `'en'`.                                                                                                                                                                                     |
| `locales`              | `Readonly<Record<string, { back?: string \| undefined; untitled?: str…`    |          | Other languages for the editor's words, by code (`@builderset/engine/locales/sq`). English is built in.                                                                                                                                                         |
| `messages`             | `{ back?: string \| undefined; untitled?: string \| undefined; undo?: …`   |          | Replace single words, in whatever language is active.                                                                                                                                                                                                           |
| `contentLocales`       | `readonly string[]`                                                        |          | The languages a document can be written in. One language: no language switch and no multi-language setting. Default: `[defaultContentLocale]`.                                                                                                                  |
| `defaultContentLocale` | `string`                                                                   |          | The language a document's tree is written in when it does not say (a new document). Default: the first of `contentLocales`, else the editor's language.                                                                                                         |
| `storageKey`           | `string`                                                                   |          | Where the crash-safety copy is kept in localStorage; omit to disable.                                                                                                                                                                                           |
| `savedAt`              | `string \| null`                                                           |          | When the server copy was last saved — a local copy newer than this is offered back.                                                                                                                                                                             |
| `theme`                | `"auto" \| "dark" \| "light"`                                              |          | 'light' (the default), 'dark', or 'auto' to follow the page: an ancestor marked `dark` or `light` (a class, or `data-theme`), else the operating system. Menus and dialogs follow it too.                                                                       |
| `tokens`               | `Partial<Record<"font" \| "background" \| "surface" \| "foreground" \| "…` |          | Theme values from JavaScript, by the public variables' names without their prefix: `{ primary: '#da6c1e' }` sets `--builderset-primary`. CSS on the page can set the same variables instead.                                                                    |
| `className`            | `string`                                                                   |          | Applied to the editor's root element, the one that carries the theme.                                                                                                                                                                                           |
| `fontPreviews`         | `boolean`                                                                  |          | Previews of the font choices, loaded from the address the kit names (the email kit's: Google Fonts) when a font menu opens. `false`: never — for a page whose Content-Security-Policy allows no font host, or that may not call a third party. Default: `true`. |

#### `ColorField`

| Prop       | Type                              | Required | What it does                                                                     |
| ---------- | --------------------------------- | -------- | -------------------------------------------------------------------------------- |
| `name`     | `string`                          | yes      | The prop's name, which picks the field's label.                                  |
| `value`    | `string \| null`                  | yes      | The colour: a hex value or one of the profile's colour tokens; empty means none. |
| `onChange` | `(value: string \| null) => void` | yes      | Called with a hex value, a token's value, or `null` for none.                    |
| `nullable` | `boolean`                         | yes      | Offers a "none" swatch first, which clears the colour.                           |

#### `FontField`

| Prop       | Type                              | Required | What it does                                                                       |
| ---------- | --------------------------------- | -------- | ---------------------------------------------------------------------------------- |
| `value`    | `string \| null`                  | yes      | The selected font's key, from the profile's fonts; empty means the inherited font. |
| `onChange` | `(value: string \| null) => void` | yes      | Called with the picked font's key, or `null` for the inherited font.               |
| `nullable` | `boolean`                         | yes      | Offers the inherited font at the top of the list, which clears the choice.         |

#### `LanguageSwitch`

| Prop        | Type     | Required | What it does                      |
| ----------- | -------- | -------- | --------------------------------- |
| `className` | `string` |          | Applied to the segmented control. |

#### `MediaField`

| Prop       | Type                                                                     | Required | What it does                                                                        |
| ---------- | ------------------------------------------------------------------------ | -------- | ----------------------------------------------------------------------------------- |
| `value`    | `{ key: string; width?: number \| undefined; height?: number \| undefi…` | yes      | The current media, if any: an image is previewed, other kinds show their file name. |
| `onChange` | `(value: MediaRef \| null) => void`                                      | yes      | Called with the new reference once an upload finishes, or `null` when cleared.      |
| `kind`     | `"audio" \| "file" \| "image" \| "video"`                                |          | What may be uploaded: sets the file types offered and the icon. Default: `'image'`. |
| `id`       | `string`                                                                 |          | The hidden file input's id, so a label can point at it.                             |

#### `MultilingualToggle`

No props.

#### `NumberStepper`

| Prop            | Type                              | Required | What it does                                                                                                          |
| --------------- | --------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------- |
| `value`         | `number \| null`                  | yes      | The number shown; empty shows a dash.                                                                                 |
| `onChange`      | `(value: number \| null) => void` | yes      | Called on each step, as soon as a typed value is a number in range, and with `null` when a `nullable` box is cleared. |
| `min`           | `number`                          |          | The lowest value. Stepping stops there, and a typed value is clamped to it on blur.                                   |
| `max`           | `number`                          |          | The highest value. Stepping stops there, and a typed value is clamped to it on blur.                                  |
| `step`          | `number`                          |          | 1 by default; 0.1 steps (and rounds) to one decimal.                                                                  |
| `integer`       | `boolean`                         |          | Whole numbers only — the decimal point is refused while typing.                                                       |
| `nullable`      | `boolean`                         |          | Clearing the box means "no value" rather than snapping back.                                                          |
| `suffix`        | `string`                          |          | Shown after the figure while not editing — "px", "min".                                                               |
| `id`            | `string`                          |          | The input's id, so a label can point at it.                                                                           |
| `aria-label`    | `string`                          |          | The accessible name, when there is no visible label.                                                                  |
| `decreaseLabel` | `string`                          |          | The − button's accessible name and tooltip. Default: `'Decrease'`.                                                    |
| `increaseLabel` | `string`                          |          | The + button's accessible name and tooltip. Default: `'Increase'`.                                                    |
| `size`          | `"md" \| "sm"`                    |          | `sm` is a shorter box with narrower buttons, for tight rows. Default: `'md'`.                                         |
| `className`     | `string`                          |          | Applied to the outer box.                                                                                             |

#### `RichTextInput`

| Prop        | Type                        | Required | What it does                                                                |
| ----------- | --------------------------- | -------- | --------------------------------------------------------------------------- |
| `value`     | `RichText`                  | yes      | The text shown. A different value from outside replaces what is in the box. |
| `onChange`  | `(value: RichText) => void` | yes      | Called with the whole text after each edit.                                 |
| `id`        | `string`                    |          | The editable box's id, so a label can point at it.                          |
| `multiline` | `boolean`                   |          | Enter adds a line break; when false it does not. Default: `true`.           |

#### `SpacingField`

| Prop       | Type                       | Required | What it does                                                                  |
| ---------- | -------------------------- | -------- | ----------------------------------------------------------------------------- |
| `name`     | `string`                   | yes      | The prop's name, which picks the field's label.                               |
| `value`    | `Padding`                  | yes      | The four sides, in pixels.                                                    |
| `onChange` | `(value: Padding) => void` | yes      | Called with all four sides on each change, each a whole number from 0 to 160. |

<!-- /props -->

### The UI kit

The kit's panels are built from these. They follow Radix underneath; everything that floats is portalled into an element the editor renders (`data-builderset-portal`), not into `<body>`.

<details>
<summary>Every component of <code>@builderset/engine/ui</code></summary>

<!-- props: editor/ui/index.d.ts -->

#### `Badge`

| Prop   | Type                                                                         | Required | What it does                                                                                                                            |
| ------ | ---------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `tone` | `"brand" \| "danger" \| "draft" \| "neutral" \| "ok" \| "published" \| "sc…` |          | The colour: `neutral`, `brand`, `ok`, `warn`, `danger`, or a document's state: `draft`, `scheduled`, `published`. Default: `'neutral'`. |
| `size` | `"default" \| "dense" \| null`                                               |          | `dense`: 9px bold capitals, for a status in a table row. Default: `'default'`.                                                          |

Plus the props of the element it draws (React).

#### `Button`

| Prop      | Type                                                                         | Required | What it does                                                                                                                                                                                  |
| --------- | ---------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `variant` | `"danger" \| "destructive" \| "ghost" \| "link" \| "outline" \| "primary"…`  |          | The look: `primary`, `secondary`, `outline`, `ghost`, `destructive`, `warning`, `danger` or `link`. Default: `'primary'`.                                                                     |
| `size`    | `"default" \| "icon-lg" \| "icon-sm" \| "icon-xs" \| "icon" \| "lg" \| "md…` |          | The height: `default` (36px, every control's), `sm`, `xs` (inside another object), `md` and `lg` (a site's scale), or a square `icon`, `icon-xs`, `icon-sm`, `icon-lg`. Default: `'default'`. |
| `asChild` | `boolean`                                                                    |          | Render as the child element — for a link that looks like a button.                                                                                                                            |
| `loading` | `boolean`                                                                    |          | Shows a spinner in the icon's place, marks the button busy and disables it; the label stays.                                                                                                  |
| `icon`    | `ReactNode`                                                                  |          | Rendered before the label, and replaced by the spinner while loading.                                                                                                                         |

Plus the props of the element it draws (React).

#### `ConfirmDialog`

| Prop             | Type                                                           | Required | What it does                                                                                                                                                                                                                                                                                                                      |
| ---------------- | -------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `open`           | `boolean`                                                      | yes      | Whether the dialog is shown.                                                                                                                                                                                                                                                                                                      |
| `onOpenChange`   | `(open: boolean) => void`                                      | yes      | Called with `false` to close it: Cancel, Escape, the backdrop, or a confirm that succeeded.                                                                                                                                                                                                                                       |
| `title`          | `string`                                                       | yes      | The question, as the heading.                                                                                                                                                                                                                                                                                                     |
| `description`    | `ReactNode`                                                    |          | More on what will happen, under the title.                                                                                                                                                                                                                                                                                        |
| `children`       | `ReactNode`                                                    |          | Something to look at before deciding — a list of what is about to go.                                                                                                                                                                                                                                                             |
| `confirmLabel`   | `string`                                                       |          | The confirm button's text. Default: the editor's word for "Confirm".                                                                                                                                                                                                                                                              |
| `cancelLabel`    | `string`                                                       |          | The cancel button's text. Default: the editor's word for "Cancel".                                                                                                                                                                                                                                                                |
| `secondaryLabel` | `string`                                                       |          | A third answer — "save a copy", "discard and continue". Some questions genuinely have three, and the alternative is a second dialog behind the first. When present the bar stacks rather than sitting in a row: three full-height buttons side by side are 33% each, which is not enough width for a label that is a verb phrase. |
| `onSecondary`    | `() => void`                                                   |          | Called when the third answer is pressed; shown only with `secondaryLabel`. The dialog stays open — close it here if the answer should.                                                                                                                                                                                            |
| `tone`           | `ConfirmTone`                                                  |          | The colour of the icon disc and the confirm button, and the icon. Default: `'default'`.                                                                                                                                                                                                                                           |
| `onConfirm`      | `() => Promise<string \| null \| undefined> \| string \| null` | yes      | Resolves to a message on failure, or nothing on success. A returned string is rendered in the dialog and the dialog STAYS OPEN — the reader is one click from trying again, with the reason in front of them. A dialog that closes on failure and raises a toast somewhere else makes them find their way back to the row first.  |
| `dismissible`    | `boolean`                                                      |          | Escape and backdrop. Always blocked while busy, whatever this says.                                                                                                                                                                                                                                                               |
| `icon`           | `ReactNode`                                                    |          | Replaces the tone's icon in the disc above the title.                                                                                                                                                                                                                                                                             |

#### `DateTimeField`

| Prop       | Type                            | Required | What it does                                                                                                                                                                                                                  |
| ---------- | ------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `value`    | `string \| null`                | yes      | The instant, as an ISO string; `null` shows an empty field.                                                                                                                                                                   |
| `onChange` | `(iso: string \| null) => void` | yes      | Called with the edited instant as an ISO string, or `null` while the field is empty or unfinished.                                                                                                                            |
| `min`      | `string \| null`                |          | The earliest instant that can be picked, as an ISO string.                                                                                                                                                                    |
| `invalid`  | `boolean`                       |          | Sets `aria-invalid` AND the error treatment together. One prop rather than two because they were never independently useful: a field that looks wrong and does not say so to a screen reader is a bug, and so is the reverse. |

Plus the props of the element it draws (React).

#### `DialogPanel`

| Prop         | Type                  | Required | What it does                                                              |
| ------------ | --------------------- | -------- | ------------------------------------------------------------------------- |
| `hideClose`  | `boolean`             |          | Leaves out the ✕ in the top corner, for a panel that draws its own close. |
| `closeLabel` | `string`              | yes      | The ✕ button's accessible name.                                           |
| `pad`        | `"0" \| "lg" \| "md"` |          | Cancels the panel's own padding for the flush bands. See the CSS.         |

Plus the props of the element it draws (Radix, React).

#### `DrawerPanel`

| Prop         | Type                  | Required | What it does                                                              |
| ------------ | --------------------- | -------- | ------------------------------------------------------------------------- |
| `side`       | `"bottom" \| "right"` |          | Which edge it comes from. Bottom is the phone shape.                      |
| `hideClose`  | `boolean`             |          | Leaves out the ✕ in the top corner, for a panel that draws its own close. |
| `closeLabel` | `string`              | yes      | The ✕ button's accessible name.                                           |
| `pad`        | `"0" \| "lg" \| "md"` |          | Cancels the panel's own padding for the flush bands. See the CSS.         |

Plus the props of the element it draws (Radix, React).

#### `DropdownMenu`

Takes the props of the element it draws (Radix).

#### `DropdownMenuContent`

Takes the props of the element it draws (React, Radix).

#### `DropdownMenuGroup`

Takes the props of the element it draws (React, Radix).

#### `DropdownMenuItem`

| Prop          | Type      | Required | What it does                                             |
| ------------- | --------- | -------- | -------------------------------------------------------- |
| `destructive` | `boolean` |          | Draws the item in the destructive colour — for a delete. |

Plus the props of the element it draws (React, Radix).

#### `DropdownMenuLabel`

Takes the props of the element it draws (React, Radix).

#### `DropdownMenuSeparator`

Takes the props of the element it draws (React, Radix).

#### `DropdownMenuTrigger`

Takes the props of the element it draws (React, Radix).

#### `EmptyState`

| Prop          | Type                     | Required | What it does                                                                                                                                                                                                                               |
| ------------- | ------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `title`       | `string`                 |          | The heading, naming what is missing. Default: the editor's "No results".                                                                                                                                                                   |
| `description` | `string`                 |          | One sentence under the title on what would go here. Default: the editor's hint for no results.                                                                                                                                             |
| `icon`        | `ReactNode`              |          | Shown in the tile at the centre. Default: an inbox.                                                                                                                                                                                        |
| `action`      | `ReactNode`              |          | The way out of the empty state — "Add the first line", "Create".                                                                                                                                                                           |
| `size`        | `"compact" \| "default"` |          | `default` holds the same floor as the loading and error states, so a table does not change height between them. `compact` is for an empty SECTION inside a form or a card, where that floor would push everything below it off the screen. |
| `bordered`    | `boolean`                |          | A dashed card around it — for an empty state standing on its own in a form, where there is no table or panel edge to frame it. Off inside a table, which already has one.                                                                  |
| `className`   | `string`                 |          | Applied to the outer block.                                                                                                                                                                                                                |

#### `Input`

| Prop      | Type      | Required | What it does                                                                                                                                                                                                                  |
| --------- | --------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `invalid` | `boolean` |          | Sets `aria-invalid` AND the error treatment together. One prop rather than two because they were never independently useful: a field that looks wrong and does not say so to a screen reader is a bug, and so is the reverse. |

Plus the props of the element it draws (React).

#### `Label`

Takes the props of the element it draws (React, Radix).

#### `Overlay`

Takes the props of the element it draws (Radix).

#### `OverlayBody`

Takes the props of the element it draws (React).

#### `OverlayClose`

Takes the props of the element it draws (React, Radix).

#### `OverlayDescription`

Takes the props of the element it draws (React, Radix).

#### `OverlayFooter`

Takes the props of the element it draws (React).

#### `OverlayHeader`

Takes the props of the element it draws (React).

#### `OverlayTitle`

Takes the props of the element it draws (React, Radix).

#### `OverlayTrigger`

Takes the props of the element it draws (React, Radix).

#### `Popover`

Takes the props of the element it draws (Radix).

#### `PopoverAnchor`

Takes the props of the element it draws (React, Radix).

#### `PopoverContent`

Takes the props of the element it draws (Radix, React).

#### `PopoverTrigger`

Takes the props of the element it draws (React, Radix).

#### `PortalProvider`

| Prop       | Type        | Required | What it does                                                                          |
| ---------- | ----------- | -------- | ------------------------------------------------------------------------------------- |
| `children` | `ReactNode` | yes      | What is shown; the floating parts inside it portal into an element rendered after it. |

#### `Progress`

| Prop    | Type     | Required | What it does                                                  |
| ------- | -------- | -------- | ------------------------------------------------------------- |
| `value` | `number` |          | 0–100. Omit for an indeterminate bar.                         |
| `label` | `string` |          | Announced to assistive technology — "Importing", "Uploading". |

Plus the props of the element it draws (React).

#### `SegmentedControl`

| Prop            | Type                            | Required | What it does                                                                               |
| --------------- | ------------------------------- | -------- | ------------------------------------------------------------------------------------------ |
| `value`         | `T`                             | yes      | The selected option's value.                                                               |
| `onValueChange` | `(value: T) => void`            | yes      | Called with the option the reader picks; pressing the selected one again does not call it. |
| `options`       | `readonly SegmentedOption<T>[]` | yes      | The choices, in order.                                                                     |
| `className`     | `string`                        |          | Applied to the group.                                                                      |
| `aria-label`    | `string`                        |          | The accessible name, when there is no visible label.                                       |

#### `Select`

| Prop               | Type                      | Required | What it does                                                                                   |
| ------------------ | ------------------------- | -------- | ---------------------------------------------------------------------------------------------- |
| `value`            | `string`                  |          | The selected value, for a controlled select. `''` is a value like any other (an "All" option). |
| `defaultValue`     | `string`                  |          | The value it starts with, for an uncontrolled select; ignored when `value` is set.             |
| `onValueChange`    | `(value: string) => void` |          | Called with the value of the option the reader picks.                                          |
| `options`          | `readonly SelectOption[]` | yes      | The choices, in order; a `disabled` one is shown but cannot be picked.                         |
| `placeholder`      | `string`                  |          | Shown while nothing is selected.                                                               |
| `id`               | `string`                  |          | The trigger's id, so a label can point at it.                                                  |
| `name`             | `string`                  |          | The form field the value is submitted under.                                                   |
| `required`         | `boolean`                 |          | Marks the form field as required.                                                              |
| `disabled`         | `boolean`                 |          | Stops the select being opened.                                                                 |
| `invalid`          | `boolean`                 |          | Sets `aria-invalid` and the error look on the trigger together.                                |
| `className`        | `string`                  |          | Applied to the trigger.                                                                        |
| `aria-describedby` | `string`                  |          | The id of the hint or error message that describes the field.                                  |
| `aria-label`       | `string`                  |          | The accessible name, when there is no visible label.                                           |

#### `Sheet`

| Prop          | Type         | Required | What it does                                                                      |
| ------------- | ------------ | -------- | --------------------------------------------------------------------------------- |
| `open`        | `boolean`    | yes      | Whether the sheet is shown.                                                       |
| `onClose`     | `() => void` | yes      | Called when the reader closes it: the ✕, Escape or the backdrop.                  |
| `title`       | `string`     | yes      | What is being chosen. Also the panel's accessible name.                           |
| `description` | `string`     |          | One sentence on what the choice actually changes.                                 |
| `children`    | `ReactNode`  | yes      | The sheet's body, under the heading; it scrolls when it is taller than the sheet. |
| `className`   | `string`     |          | Applied to the panel.                                                             |

#### `SheetAction`

| Prop          | Type         | Required | What it does                                                           |
| ------------- | ------------ | -------- | ---------------------------------------------------------------------- |
| `icon`        | `ReactNode`  |          | Shown in a disc before the name.                                       |
| `name`        | `string`     | yes      | The action, as the row's heading.                                      |
| `description` | `string`     |          | One line under the name.                                               |
| `destructive` | `boolean`    |          | Draws the row in the destructive colour — for signing out or deleting. |
| `onSelect`    | `() => void` | yes      | Called when the row is pressed.                                        |

#### `SheetOption`

| Prop          | Type         | Required | What it does                                               |
| ------------- | ------------ | -------- | ---------------------------------------------------------- |
| `icon`        | `ReactNode`  |          | Shown in a disc before the name.                           |
| `name`        | `string`     | yes      | The choice, as the row's heading.                          |
| `description` | `string`     |          | One line on what the choice changes.                       |
| `selected`    | `boolean`    | yes      | Marks the current choice: a filled dot and `aria-current`. |
| `onSelect`    | `() => void` | yes      | Called when the row is pressed.                            |

#### `Skeleton`

Takes the props of the element it draws (React).

#### `Spinner`

| Prop    | Type     | Required | What it does                                                         |
| ------- | -------- | -------- | -------------------------------------------------------------------- |
| `label` | `string` |          | Announced to assistive technology. Omit only when a sibling says it. |

Plus the props of the element it draws (React).

#### `Switch`

Takes the props of the element it draws (Radix, React).

#### `Tabs`

Takes the props of the element it draws (Radix, React).

#### `TabsContent`

Takes the props of the element it draws (Radix, React).

#### `TabsList`

Takes the props of the element it draws (Radix, React).

#### `TabsTrigger`

Takes the props of the element it draws (Radix, React).

#### `Textarea`

| Prop      | Type      | Required | What it does                                                    |
| --------- | --------- | -------- | --------------------------------------------------------------- |
| `invalid` | `boolean` |          | Sets `aria-invalid` and the error look together, as on `Input`. |

Plus the props of the element it draws (React).

#### `ToggleFlag`

| Prop              | Type                         | Required | What it does                                                             |
| ----------------- | ---------------------------- | -------- | ------------------------------------------------------------------------ |
| `title`           | `string`                     | yes      | The setting, as the card's heading.                                      |
| `description`     | `string`                     |          | One sentence on what switching it changes.                               |
| `name`            | `string`                     |          | The form field. A hidden input under this name carries `true` / `false`. |
| `defaultChecked`  | `boolean`                    |          | Uncontrolled, like every other field in a drawer — see `FormDrawer`.     |
| `checked`         | `boolean`                    |          | Controlled, for a surface that owns the value itself.                    |
| `onCheckedChange` | `(checked: boolean) => void` |          | Called with the new state each time it is switched.                      |
| `id`              | `string`                     |          | The switch's id, so a validation message or a `Field` can point at it.   |
| `disabled`        | `boolean`                    |          | Dims the card and stops it being switched.                               |
| `className`       | `string`                     |          | Applied to the card.                                                     |

#### `Tooltip`

| Prop       | Type                                     | Required | What it does                                                    |
| ---------- | ---------------------------------------- | -------- | --------------------------------------------------------------- |
| `content`  | `import("react").ReactNode`              | yes      | What the tooltip says.                                          |
| `children` | `import("react").ReactNode`              | yes      | The trigger: one element that can hold a ref, such as a button. |
| `side`     | `"bottom" \| "left" \| "right" \| "top"` |          | Which side of the trigger it opens on. Default: `'top'`.        |

#### `TooltipProvider`

Takes the props of the element it draws (Radix).

<!-- /props -->

</details>

## The host adapter

`BuilderHost` is everything the editor asks of the application it runs in: uploads, media addresses, saving (with conflicts), publishing and scheduling, versions, saved sections, messages. [BACKEND.md](src/host/BACKEND.md) is the other side of that line — what a backend must store, check on every write and keep safe, and the REST shape `createRestHost` speaks.

```ts
import { createRestHost } from '@builderset/engine/host';

const host = createRestHost({
  baseUrl: `/api/articles/${id}`, // GET, PUT, publish, versions… below it
  uploadUrl: '/api/media',
  resolveMedia: (key) => `https://cdn.example.com/${key}`,
  toast: (kind, message) => notify(kind, message),
  savedAt, // the server copy's saved_at, so the first save can detect a conflict
});
```

## Custom elements

`defineElement` describes an element as data — type, version, a zod schema for its props, defaults, placement rules, migrations, and what the checks and the server need — and a kit's registry takes it: `createArticleRegistry([note])`. The editor's inspector is generated from the schema; `ColorField`, `MediaField`, `SpacingField` and the other fields above are what it is generated with, for an element that wants its own panel. [The article kit's README](../article/README.md#custom-elements) has a worked example.

## What the editor has

- **Top bar**: back (guards unsaved work), title and status, undo and redo (the tooltips name the step), device preview, zoom, save state, history, preview, and Publish / Update with a menu (save draft, schedule, unpublish, duplicate, delete).
- **Left rail**: _Add_ (search, categories, recently used; click to insert or drag onto the canvas), _Layers_ (a tree with rename, hide, lock and drag to reorder or reparent), _Templates_ (starting layouts and saved sections).
- **Canvas**: click to select, Shift or Ctrl-click for several; hover outlines and a block toolbar (drag handle, move, duplicate, select parent, turn into, hide, lock, delete) with a "+" to insert after; drag and drop with a live drop indicator, placement rules enforced; inline rich-text editing (TipTap) with a formatting bar and links; Enter splits a block and Backspace merges; Markdown shortcuts (`## `, `- `, `1. `, `[] `, `> `, `---`) and a `/` insert menu.
- **Inspector**: _Content_, generated from each element's schema, so every prop can be edited and none into an invalid state; _Style_, per screen size with desktop → tablet → mobile inheritance; _Advanced_ (name, anchor, turn into, hidden, locked). With nothing selected, the kit's settings panel.
- **Status bar**: word count, reading time, and live issues with "Show" buttons; errors block publishing.
- **Saving**: autosave 2 s after the last change and when the tab is hidden, with a retry; a localStorage copy of unsaved work, offered back on reopen; a leave guard; a conflict dialog (keep mine or load theirs).
- **Shortcuts**: `?` lists them.

**Languages.** The editor speaks English unless told otherwise. Another language is a file the project imports and passes (`locales={{ sq }}` with `locale="sq"`); a word a language leaves out stays English, and `sq-AL` falls back to `sq`. `contentLocales` are the languages a document is written in: with one there is no language switch and no multi-language setting. Any language code works; right-to-left languages are not mirrored yet.

**Libraries.** zustand (the store), TipTap's core extensions (inline editing only — the stored format is the engine's own `RichText`), motion (animations), zod (schemas, and the inspector through `z.toJSONSchema`), Radix (under the UI kit). Drag and drop uses native drag events: the canvas already measures every block, and keyboard moves go through `Alt+↑/↓`.

## Links

- [The repository](https://github.com/builderset/builderset) · [what a backend must do](src/host/BACKEND.md) · [the article kit](../article/README.md) · [the email kit](../email/README.md)
- [Changelog](CHANGELOG.md) · [Licence: MIT](LICENSE)
