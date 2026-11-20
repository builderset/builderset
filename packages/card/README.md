# @builderset/card

The card builder: an editor for membership, ID, bank, business and wallet cards — a front and a back designed in millimetres on a free canvas, with bleed, safe area, member data and print checks — a typed JSON document, a React renderer that draws a card at any size or as a print-ready sheet, and `checkCard`, which a server runs before anything is printed.

> **Not released yet.** Nothing is on npm; see the [repository](https://github.com/builderset/builderset).

## Install

```bash
npm install @builderset/card
```

`react` and `react-dom` 19 for the editor and the renderer. The core entry (`@builderset/card`) needs neither and runs on Node 20 or newer.

## The editor, in a back office

```tsx
'use client';
import { createCardRegistry, type CardDocument } from '@builderset/card';
import { CardEditor } from '@builderset/card/editor';
import { createRestHost } from '@builderset/card/host';
import { sq } from '@builderset/card/locales/sq';
import '@builderset/card/styles.css';

const registry = createCardRegistry();
const host = createRestHost<CardDocument>({ baseUrl: `/api/cards/${id}` });

<CardEditor
  document={card}
  registry={registry}
  host={host}
  record={record}
  onBack={() => history.back()}
  locale="sq"
  locales={{ sq }}
  memberCount={248}
/>;
```

The member data a card may use is yours to name: pass `fields` (`{ path: 'member.plan', label: { en: 'Plan' }, kind: 'text' }`, `kind: 'photo'` for a picture) and `records` to design with. Without them the card uses a member's name, number, tier, since, valid until, QR value and photo, with three example members.

<!-- props: editor/index.d.ts CardEditor -->

#### `CardEditor`

| Prop                   | Type                                                                       | Required | What it does                                                                                                                                                                                                |
| ---------------------- | -------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `document`             | `CardDocument`                                                             | yes      | The design to edit. Read once, when the editor mounts: to load another, remount it (a new `key`).                                                                                                           |
| `registry`             | `ElementRegistry`                                                          | yes      | The elements a card can hold — usually `createCardRegistry()`.                                                                                                                                              |
| `host`                 | `BuilderHost<CardDocument>`                                                | yes      | The adapter for everything that leaves the browser: saving, approving, uploads, media URLs, notices.                                                                                                        |
| `record`               | `RecordFacts`                                                              | yes      | `status: 'published'` means the design is approved for print.                                                                                                                                               |
| `onRecordChange`       | `(patch: Partial<RecordFacts>) => void`                                    |          | Called with the facts the designer changed (approving, withdrawing). Keep them and pass them back as `record`.                                                                                              |
| `onBack`               | `() => void`                                                               | yes      | Called to leave the editor (the back button). The editor does not navigate by itself.                                                                                                                       |
| `onDuplicate`          | `() => void`                                                               |          | Adds "Duplicate design" to the approve menu.                                                                                                                                                                |
| `onDelete`             | `() => Promise<boolean>`                                                   |          | Adds "Delete design" to the approve menu; resolve `true` once it is deleted.                                                                                                                                |
| `fields`               | `readonly CardField[]`                                                     |          | The member fields a design may use, each a path, a label and its kind (`text`, or `photo` for a picture). Default: the member's name, number, tier, since, valid until, QR value and photo (`CARD_FIELDS`). |
| `records`              | `readonly Readonly<Record<string, string>>[]`                              |          | Members to design with: the example data, the preview's switch. Default: three example members.                                                                                                             |
| `memberCount`          | `number`                                                                   |          | How many members the chosen list holds: "248 in Anëtarët aktivë", "Print 248 cards".                                                                                                                        |
| `onPrint`              | `(document: CardDocument) => void`                                         |          | Print the cards: the host's own print run, one card per member. Without one, "Print-ready sheet" opens the sheet of the example members in a window and the browser's print dialog over it.                 |
| `locale`               | `string`                                                                   |          | The editor's own language. `'auto'` follows `<html lang>`. Default: `'en'`.                                                                                                                                 |
| `locales`              | `Readonly<Record<string, CardLocale \| undefined>>`                        |          | Other languages, by code: `{ sq }` from `@builderset/card/locales/sq`. English is built in.                                                                                                                 |
| `messages`             | `{ code?: string \| undefined; engine?: { back?: string \| undefined; …`   |          | Replace single words, in whatever language is active.                                                                                                                                                       |
| `contentLocales`       | `readonly string[]`                                                        |          | The languages a design can be written in. One: no language switch.                                                                                                                                          |
| `defaultContentLocale` | `string`                                                                   |          | The language a new design is written in. Default: the first of `contentLocales`.                                                                                                                            |
| `storageKey`           | `string`                                                                   |          | Where the crash-safety copy is kept in localStorage; omit to disable.                                                                                                                                       |
| `savedAt`              | `string \| null`                                                           |          | When the server copy was last saved: a newer local copy is offered back.                                                                                                                                    |
| `theme`                | `"auto" \| "dark" \| "light"`                                              |          | 'light' (the default), 'dark', or 'auto' to follow the page.                                                                                                                                                |
| `tokens`               | `Partial<Record<"font" \| "background" \| "surface" \| "foreground" \| "…` |          | Theme values by the public variables' names without their prefix: `{ primary: '#da6c1e' }`.                                                                                                                 |
| `className`            | `string`                                                                   |          | Applied to the editor's root element, the one that carries the theme.                                                                                                                                       |
| `fontPreviews`         | `boolean`                                                                  |          | Load the card's web fonts (Poppins, Sora, Inter, Geist Mono) from Google Fonts. `false`: never — for a page that loads them itself or whose Content-Security-Policy allows no font host. Default: `true`.   |

<!-- /props -->

## A card, on a page or a printer

```tsx
import { CardPrintSheet, CardView } from '@builderset/card/render';
import '@builderset/card/card.css';

// One side, at actual size on a screen, filled in for one member.
<CardView document={card} face="front" record={member} assetUrl={(key) => cdn(key)} />;

// Every side of every member's card at real size, with bleed and crop marks:
// print the page with margins off, or save it as a PDF.
<CardPrintSheet document={card} records={members} />;
```

`card.css` is plain CSS under `.bsc`, with no reset: safe beside any other stylesheet. Every length is millimetres times one variable, `--bsc-mm`, so the same rules draw a thumbnail, the editor at any zoom, a card at actual size and a sheet in real millimetres.

<!-- props: render/index.d.ts CardView CardPrintSheet -->

#### `CardView`

| Prop            | Type                                       | Required | What it does                                                                                 |
| --------------- | ------------------------------------------ | -------- | -------------------------------------------------------------------------------------------- |
| `document`      | `CardDocument`                             | yes      | The card to draw.                                                                            |
| `face`          | `"back" \| "front"`                        |          | Which side. Default: the front.                                                              |
| `scale`         | `number \| string`                         |          | Pixels per millimetre, or a CSS length (`'1mm'` to print). Default: actual size on a screen. |
| `record`        | `Readonly<Record<string, string>> \| null` |          | The member the card is filled in for. Without one, variables show as written.                |
| `markVariables` | `boolean`                                  |          | Mark each `{{variable}}` where it is not filled in.                                          |
| `bleed`         | `number`                                   |          | Draw this many millimetres past the cut line, for printing. Default: none — the card as cut. |
| `assetUrl`      | `(key: string) => string`                  |          | A media key's address: side pictures, images and logo files.                                 |
| `words`         | `CardWords`                                |          | The words for screen readers. Default: English.                                              |
| `label`         | `string`                                   |          | The name a screen reader hears. Default: the side's ("Front").                               |
| `className`     | `string`                                   |          | Added to the card's own `bsc` class.                                                         |
| `style`         | `CSSProperties`                            |          | Merged over the card's variables: a position, a shadow.                                      |

#### `CardPrintSheet`

| Prop        | Type                                          | Required | What it does                                                                |
| ----------- | --------------------------------------------- | -------- | --------------------------------------------------------------------------- |
| `document`  | `CardDocument`                                | yes      | The card to print: its printed sides, at its own size and bleed.            |
| `records`   | `readonly Readonly<Record<string, string>>[]` |          | One card per member, in order. Default: one card, its variables as written. |
| `assetUrl`  | `(key: string) => string`                     |          | A media key's address: side pictures, images and logo files.                |
| `cropMarks` | `boolean`                                     |          | Crop marks at the corners. Default: on.                                     |
| `words`     | `CardWords`                                   |          | The words for screen readers. Default: English.                             |
| `className` | `string`                                      |          | Added to the sheet's own `bsc-sheet` class.                                 |

<!-- /props -->

## On the server

Check a design before it is printed, and issue a member's card with the data frozen in it:

```ts
import { checkCard, createCardRegistry, fieldsUsed, fillCard, parseCard } from '@builderset/card';

const registry = createCardRegistry();
const card = parseCard(stored, registry);
const issues = checkCard(card, registry, { fields }); // the same codes in Python: check_card
const needs = fieldsUsed(card); // ['member.name', 'member.number', 'member.photo', …]
const issued = fillCard(card, { 'member.name': 'Arben Hoxha', 'member.number': 'MA 0248 1173' });
```

## What is in it

- **Formats** — ISO/IEC 7810 ID-1 (85.60 × 53.98 mm, 3.18 mm corners) for membership, ID and bank cards, a portrait event badge, an 85 × 55 mm business card, a wallet card, any size. A bank card has its chip spot (ISO 7816) and stripe (ISO 7811) marked.
- **Elements** — headings, text, labels and member fields; the logo, the member's photo, a QR code, a Code 128 barcode, the chip, the contactless mark, the magnetic stripe, a signature strip; rectangles, circles, lines, images and icons. Each sits at its own frame in millimetres, turned to any angle.
- **Codes that scan** — the QR encoder (byte mode, versions 1–40, all four error correction levels) and the Code 128 encoder are this package's own, with no dependency; their output is held to an independent implementation's in the tests.
- **Print** — bleed and safe margin, 300 or 600 dpi, CMYK or RGB, material, finish and quantity, and a print-ready sheet with crop marks.
- **Checks** — words and codes inside the safe area, type no smaller than 6 pt, QR codes of 15 mm or more, a chip on a bank card, QR links a phone may open, variables the member data has, an image in every picture frame.
- **Templates** — `src/templates/`, one folder per category (membership, ID and staff, bank and gift, business, event badges, wallet) and one file per design, front and back.
- **Units** — `mmToPt`, `ptToMm`, `mmToPx`, `pxToMm` for whatever else a host draws.

## Licence

MIT
