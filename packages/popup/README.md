# @builderset/popup

The popup builder: an editor for modals, slide-ins, top and bottom bars, full-screen offers, side drawers and cards inside a page — each element placed at its own x and y on a free canvas, with display rules, motion and templates by purpose — a typed JSON document, a React renderer for the site, and two functions a server shares with the page: `shouldShow`, the display rules, and `validateSubmission`, which checks what a visitor sends with exactly the rules the popup uses in the browser.

> **Not released yet.** Nothing is on npm; see the [repository](https://github.com/builderset/builderset).

## Install

```bash
npm install @builderset/popup
```

Also inside [`builderset`](../builderset/README.md), with every other kit, as `builderset/popup/…`. Install one or the other: both at different versions put two engines in the page.

`react` and `react-dom` 19 for the editor and the renderer. The core entry (`@builderset/popup`) needs neither and runs on Node 20 or newer.

## The editor, in a back office

```tsx
'use client';
import { createPopupRegistry, type PopupDocument } from '@builderset/popup';
import { PopupEditor } from '@builderset/popup/editor';
import { createRestHost } from '@builderset/popup/host';
import sq from '@builderset/popup/locales/sq';
import '@builderset/popup/styles.css';

const registry = createPopupRegistry();
const host = createRestHost<PopupDocument>({ baseUrl: `/api/popups/${id}` });

<PopupEditor
  document={popup}
  registry={registry}
  host={host}
  record={record}
  onBack={() => history.back()}
  locale="sq"
  locales={{ sq }}
  fields={[
    { path: 'visitor.first_name', label: 'First name', example: 'Arben' },
    { path: 'offer.ends', label: 'Offer ends', example: '30 nëntor' },
  ]}
/>;
```

| Prop                                     | What                                                                                                |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `document`                               | The popup. Read once on mount; remount (a new `key`) to load another                                |
| `registry`                               | `createPopupRegistry()`, with your own elements if you have any                                     |
| `host`                                   | Saving, publishing, uploads, notices (`@builderset/popup/host`)                                     |
| `record`, `onRecordChange`               | The stored row's status (`published` is live), schedule and publish time                            |
| `onBack`, `onDuplicate`, `onDelete`      | The top bar's back button and the document menu                                                     |
| `fields`                                 | The variables your pages fill in, each with an example. Default: `POPUP_FIELDS`                     |
| `colors`                                 | Colours offered first in every colour field: `{ value: '#e06a1b', label: 'Brand', hex: '#e06a1b' }` |
| `locale`, `locales`, `messages`          | The editor's language (`'auto'` follows `<html lang>`), other languages, single words replaced      |
| `contentLocales`, `defaultContentLocale` | The languages a popup is written in; one hides the language switch                                  |
| `storageKey`, `savedAt`                  | The crash-safety copy in `localStorage`, and when the server copy was saved                         |
| `theme`, `tokens`, `className`           | `'light'`, `'dark'` or `'auto'`; theme values from JavaScript                                       |

## The popup, on a page

```tsx
import { PopupView } from '@builderset/popup/render';
import '@builderset/popup/popup.css';

<PopupView
  document={popup.document}
  storageKey={popup.id}
  locale="sq"
  data={{ visitor: { first_name: user?.firstName }, offer: { ends: '30 nëntor' } }}
  onEvent={(event) => navigator.sendBeacon(`/api/popups/${popup.id}/events`, event)}
  onSubmit={async (values) => {
    const response = await fetch(`/api/popups/${popup.id}/submissions`, {
      method: 'POST',
      body: JSON.stringify(values),
    });
    return response.ok;
  }}
/>;
```

It waits for its display rules and its trigger (on load, after a delay, at a scroll depth, when the mouse heads for the tab bar, on a click on a selector), comes in with its motion, and closes with its ×, a "close" click, a click on the dimmed page, Esc or by itself. The browser remembers when it was shown, closed and filled in, for its frequency — in `localStorage` by default, or in any `store` you pass (`memoryStore()` for tests). A modal takes the keyboard while open and gives it back after; everything moves without motion under `prefers-reduced-motion`; a popup wider than the screen is scaled down to fit.

| Prop                        | What                                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------------------- |
| `document`                  | The popup                                                                                               |
| `storageKey`, `store`       | Under which name and where the browser remembers it. Default store: `localStorage` and `sessionStorage` |
| `locale`, `words`           | The visitor's language: the popup's words in it, and the built-in words (`en`, `sq`, `de`) or your own  |
| `data`                      | The variables' values: `{ visitor: { first_name: 'Ana' } }`. A missing one reads as nothing             |
| `assetUrl`                  | Storage key → address, for pictures and logos                                                           |
| `context`                   | Facts for the rules in place of the browser's: `path`, `device`, `language`, `returning`, `now`         |
| `onSubmit(values, details)` | The checked answers; resolve `false` or throw to stay on the form, anything else shows the thank-you    |
| `onEvent(event)`            | `'shown'`, `'closed'`, `'clicked'`, `'submitted'` — for counting                                        |
| `onClick(click)`, `onClose` | Which element was clicked (its id and its layer name: "Accept all"), and why it closed                  |
| `rules`, `maxDelay`         | Off: only the trigger decides; the longest a delay waits — what the editor's preview uses               |
| `contained`, `scope`        | Drawn inside its parent element, its triggers watching `scope` — a page inside a page                   |

`popup.css` is plain CSS under `.bsp`, with no reset: safe beside any other stylesheet. `PopupPicture` draws a popup still, for a list or a thumbnail.

## On the server

```ts
import {
  createPopupRegistry,
  parsePopup,
  pickPopup,
  shouldShow,
  validateSubmission,
} from '@builderset/popup';

// Which popups go with this page: the rules a server can apply, the highest priority first.
const popup = pickPopup(candidates, { path: '/makina/golf', device: 'mobile', now: Date.now() });

// Never take the browser's word for it — check the answers again.
const { ok, errors, values } = validateSubmission(popup, request.body);
```

`checkPopup(document, registry)` is what publishing checks: a way to close it, a link on every link, a name on every input and no two alike, a button that sends the inputs, display rules that can match — and, as warnings, shown on every visit, a modal the moment the page opens (Google ranks such pages lower), a variable your pages do not fill in. `popupTips(document)` says what happens on a phone. Python has the same: `check_popup`, `should_show`, `pick_popup`, `validate_submission` (`from builderset.popup import …`).

## What is in it

- **Types** — modal (S, M, L), slide-in in any corner, top and bottom bars, full screen, a side drawer left or right, a card inside the page. A bar or a full screen stretches to the page; its elements stay in a box of the design's width, centred.
- **Elements** — heading, text, label (rich text with variables, a click can link or close), button (link, close or send), input (text, email, phone, plate number), close button, countdown; rectangle, circle, line, image, icon, logo, QR code (a real one, encoded here).
- **Display rules** — the trigger; pages (all, only these, all except, `*` for any part); new or returning visitors; a language; every visit, once a visit, once every few days, or until closed or filled in; first and last day; computers and phones; a priority between popups.
- **Motion** — fade, grow, slide up, from the side; how long; fade or slide down on the way out; which ways close it; closing by itself.
- **Templates** — `src/templates/`, one folder per purpose (lead capture, offers and sales, announcements, newsletter, cookies and consent, feedback, app download), one file per template, fourteen across the seven types.
- **The contract** — `schema/popup.schema.json` and `fixtures/` (valid and invalid popups with the codes they are refused with, submissions and display cases with their results), for a backend in another language.

## Licence

MIT
