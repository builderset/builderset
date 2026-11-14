# 17 — The popup builder

## Goal

`@builderset/popup`: a writer designs a popup in the same workspace as an email or an article, sets when and to whom it appears, and a small script shows it on a site. The first real one runs on marrimauto.com.

## Why

Two reasons, and the second matters more.

- Popups are a feature the portal needs: newsletter signup, promotions, announcements, cookie notices.
- **It is the test of the engine.** The email and article kits grew up together with the engine, so the engine fits them by construction. A third kit, built after the split, shows whether `EditorProfile`, the registry and the document model are truly generic. Whatever has to bend is fixed here, while the product is still before 1.0 — and before the page builder, which is ten times larger and would hide the same problems inside its own size.

A popup is small: one screen, a dozen element types, no multi-page structure. It is the cheapest honest test there is.

## Before you start

- Milestone M3: MotorsAL runs on the published packages.
- [19_ADDING_A_NEW_BUILDER.md](19_ADDING_A_NEW_BUILDER.md) is the checklist for the mechanical parts (folders, manifest, exports, the all-in-one package, docs). This file is the design.

## What is new compared with an email or an article

| Thing               | Email, article                        | Popup                                                                                        |
| ------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------- |
| Where it is shown   | A mail client; the project's own page | **Someone else's page**, on top of it, among styles and scripts the product does not control |
| Who renders it      | The project's server                  | **A script in the visitor's browser**                                                        |
| Besides the content | Settings                              | **Rules**: when, where, to whom, how often                                                   |
| Result              | It was sent; it was published         | **Events**: shown, closed, converted                                                         |
| Size budget         | None in particular                    | **A few kilobytes**: it loads on every page view of the site                                 |

## The design

### 1. The document

```ts
export interface PopupDocument extends EngineDocument<PopupMeta> {
  schema: 'popup/document';
  settings: PopupSettings;
  rules: PopupRules;
}

interface PopupMeta {
  name: string; // the working name in the back office
}

interface PopupSettings {
  layout: 'modal' | 'slide-in' | 'bar' | 'fullscreen' | 'inline';
  position: 'center' | 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  width: number; // px, clamped on small screens
  background: string;
  radius: number;
  padding: Padding;
  overlay: { enabled: boolean; color: string; closeOnClick: boolean };
  closeButton: { enabled: boolean; position: 'inside' | 'outside'; delaySeconds: number };
  animation: 'none' | 'fade' | 'slide' | 'zoom';
  /** Per screen size, with the engine's desktop → tablet → mobile inheritance. */
  mobile?: Partial<Pick<PopupSettings, 'layout' | 'position' | 'width' | 'padding'>>;
}

interface PopupRules {
  trigger:
    | { type: 'load' }
    | { type: 'delay'; seconds: number }
    | { type: 'scroll'; percent: number }
    | { type: 'exit-intent' }
    | { type: 'inactivity'; seconds: number }
    | { type: 'click'; selector: string }
    | { type: 'event'; name: string };
  /** Every group must match; within a group any line may match. */
  targeting: {
    pages: {
      op: 'is' | 'starts-with' | 'contains' | 'matches';
      value: string;
      exclude?: boolean;
    }[];
    devices: ('desktop' | 'tablet' | 'mobile')[];
    visitors: 'all' | 'new' | 'returning';
    languages: string[];
    referrer: { op: 'contains' | 'is'; value: string }[];
    utm: { name: 'source' | 'medium' | 'campaign'; value: string }[];
  };
  frequency: {
    show: 'always' | 'once-per-session' | 'once-per-days' | 'once';
    days?: number;
    afterClose: 'same' | 'never' | 'wait-days';
    afterConvert: 'never' | 'same';
  };
  schedule: { start: string | null; end: string | null };
}
```

Everything in `rules` is data a script can evaluate with no network request. There is no expression language; each rule is a closed choice, like the email kit's variable formats.

### 2. The elements

| Element                        | Notes                                                                                                                                               |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `heading`, `text`, `list`      | Rich text, the engine's                                                                                                                             |
| `image`                        | A media reference                                                                                                                                   |
| `button`                       | An action: open a link, close the popup, go to a step                                                                                               |
| `columns`, `spacer`, `divider` | Layout                                                                                                                                              |
| `form`                         | Email capture: a small fixed set of fields (email, name, consent checkbox) and a submit button. Replaced by the form kit's element when that exists |
| `coupon`                       | A code with a copy button                                                                                                                           |
| `countdown`                    | To a date, or for N minutes from first view                                                                                                         |
| `video`                        | A click-to-load embed, from the allow-list the article kit uses                                                                                     |
| `html`                         | **Not in the first version.** Raw HTML on someone else's site is a security decision of its own                                                     |

The definitions are written with `defineElement`, as every element is. Share the schemas of `heading`, `text`, `image` and `button` with the other kits only if that turns out to be natural; do not force a "common elements" package into existence for four elements.

### 3. Rendering: three outputs from one document

| Entry                       | Gives                                                                          | For                                         |
| --------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------- |
| `@builderset/popup/render`  | `renderPopup(document, { locale, assetUrl, theme })` → `{ html, css, config }` | A server that prepares popups ahead of time |
| `@builderset/popup/runtime` | A script with no dependency: `mount(popups, options)`                          | The visitor's page                          |
| `@builderset/popup/react`   | `<Popups popups={…} />`, a thin wrapper that calls the runtime                 | A React or Next.js site                     |

`html` and `css` are static strings. `config` is the part of the document the runtime needs: settings and rules, nothing else. The runtime never receives the editor's document and never parses it.

**The popup is rendered to static HTML and CSS on the server, and the runtime only decides when to show it.** That keeps the runtime small and makes what the writer saw exactly what the visitor sees.

**Styles for a foreign page.** The popup's CSS is generated per document, with literal values — not Tailwind classes, not the editor's stylesheet. The runtime mounts each popup inside a Shadow DOM root, so the site's styles cannot reach in and the popup's cannot leak out. The site's fonts still inherit, which is usually wanted; a popup that sets its own font carries it.

### 4. The runtime

One file, plain JavaScript, built separately with its own size budget: **under 8 kB compressed**, checked in CI.

| It does                                      | How                                                                                                                                                             |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chooses which popups apply to this page view | Evaluates `targeting`, `schedule` and `frequency`                                                                                                               |
| Waits for the trigger                        | Timers; a scroll listener; `mouseout` at the top edge for exit intent on desktop, and a quick scroll-up on mobile; a click listener; a custom event on `window` |
| Shows one popup at a time                    | A queue; a `priority` number on the document breaks ties                                                                                                        |
| Behaves as a dialog                          | `role="dialog"`, `aria-modal`, a label from the heading, focus moved in and trapped, Escape closes, focus returned, page scroll locked for a modal              |
| Respects the visitor                         | No animation under `prefers-reduced-motion`; a visible close button always, for a modal                                                                         |
| Remembers                                    | `localStorage` and `sessionStorage` under one namespaced key, with dates, not counters of personal data                                                         |
| Reports                                      | `options.onEvent({ type: 'shown'                                                                                                                                | 'closed' | 'converted' | 'submitted', popupId, … })`and a`CustomEvent`on`window` |
| Submits a form                               | `POST` as JSON to the URL in the popup's config, with a honeypot field                                                                                          |

It does **not**: call any server of the product's; set a cookie; load a font; collect anything about the visitor.

**Consent.** Remembering "this visitor closed popup 12" in `localStorage` is storage on the visitor's device. Whether that needs consent depends on the site's jurisdiction and purpose. Give the site the control — `mount(popups, { storage: 'local' | 'session' | 'none' })` — and say in the docs that the choice is the site's.

### 5. The editor

`<PopupEditor>` is the engine's workspace with a popup profile. What the profile supplies:

| Profile member   | For the popup                                                                                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `renderCanvas`   | The popup at its real size and position over a stand-in page: a neutral wireframe, or a screenshot the project passes (`backdropImage`)                                        |
| `canvasFrame`    | `'bare'`: the profile draws everything                                                                                                                                         |
| `canvasWidths`   | The device widths; the mobile preview applies `settings.mobile`                                                                                                                |
| `settingsPanel`  | Four tabs with nothing selected: **Design** (layout, position, size, overlay, close, animation), **Trigger**, **Targeting**, **Frequency and schedule**                        |
| `check`          | `checkPopup`: a modal has a way to close; a form has a submit URL; a `click` trigger has a selector; the schedule's end is after its start; contrast of text on the background |
| `paragraphType`  | `'text'`                                                                                                                                                                       |
| `categories`     | Content, layout, capture                                                                                                                                                       |
| `templatesPanel` | Newsletter signup, promotion, exit offer, announcement bar                                                                                                                     |

A preview button plays the popup in the canvas as a visitor would see it, animation included.

### 6. What the engine may have to learn

Write down every change the engine needs while building this kit. Expected candidates:

| Likely need                                                          | Why the email and article kits never needed it |
| -------------------------------------------------------------------- | ---------------------------------------------- |
| A canvas that positions the document inside a larger scene           | Both fill the canvas                           |
| Settings tabs supplied by the profile with their own icons and order | Both have one settings panel                   |
| A preview mode the profile controls                                  | Both preview through the host                  |
| Element actions (`close`, `go to step`) as a shared concept          | Both only have links                           |
| Per-device overrides of document settings, not only of node styles   | Only nodes had responsive styles               |

Each one is a change to `@builderset/engine` with a changeset. **Each must leave the email and article kits working without edits to them**, or with a mechanical edit described in the changeset. If a need cannot be met that way, the engine's design has a real gap; stop and solve it in the engine, not with a special case for popups.

When the list is finished and all three kits pass their tests, the engine's API has been proven by three different users. That is the condition for 1.0.

### 7. The backend

A project stores popups like any other document ([INTEGRATION_GUIDE.md](../INTEGRATION_GUIDE.md)), plus:

| What                               | Shape                                                                                                                               |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| A `priority` and an `enabled` flag | Columns beside the document                                                                                                         |
| An endpoint for the site           | `GET /popups/active` → `[{ id, html, css, config }]` for every enabled, published popup. Cache it; it is the same for every visitor |
| Or no endpoint                     | Render the same list at build time into the page. Fewer requests, a rebuild to change a popup                                       |
| A submissions endpoint             | `POST` with the form's fields and the popup's id. The project validates, stores, and answers `{ ok }`                               |
| Counters, optional                 | `shown`, `closed`, `converted` per popup per day, fed from `onEvent` through the project's own analytics                            |

Targeting is evaluated in the browser, from `config`. A project that must not reveal a popup's existence to visitors who do not match (a private offer) filters on the server instead; the docs say how.

### 8. The first real popup

A newsletter signup on marrimauto.com:

1. A popup section in the admin (list, create, edit with `<PopupEditor>`, enable). A table, a permission, routes — the usual MotorsAL work, with a migration that needs the owner's go-ahead like any other.
2. The site ([apps/web](../../../apps/web/)) loads the active popups and mounts `<Popups>`.
3. The form posts to the existing newsletter subscription endpoint.
4. `onEvent` feeds whatever the site uses for analytics.

## Check

| Case                                                                        | Expect                                                                       |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Each trigger type, in a test page                                           | The popup appears at the right moment, once                                  |
| Each targeting rule, with matching and non-matching page views              | Shown only when every group matches                                          |
| Frequency: close it, reload                                                 | Not shown again, per the setting                                             |
| Keyboard only                                                               | Focus moves in, Tab stays inside, Escape closes, focus returns               |
| A screen reader                                                             | Announced as a dialog with its heading                                       |
| A hostile host page (the stylesheet from step 10, plus `* { all: revert }`) | The popup looks as designed                                                  |
| The host page's own layout                                                  | Unchanged before, during and after                                           |
| Runtime size                                                                | Under the budget, in CI                                                      |
| The email and article kits                                                  | Their tests and examples pass, unchanged or with the documented edits        |
| A site with a Content-Security-Policy that forbids inline styles            | Document what the site must allow; offer a mode that loads the CSS as a file |

## Done when

- [ ] `@builderset/popup` has `core`, `render`, `runtime`, `react` and `editor`, and is in the all-in-one package.
- [ ] The schema, valid and invalid fixtures, and render fixtures exist and are tested.
- [ ] The runtime is under 8 kB compressed and has no dependency.
- [ ] Every row of the check table passes.
- [ ] Every engine change made for this kit has a changeset, and the other kits pass.
- [ ] The docs site has a quick start, a guide for rules, and the reference.
- [ ] A popup made in the editor is live on marrimauto.com.

**This is milestone M5. Release 1.0 after it.**

## Traps

- **Building the runtime in React.** It would add React to every page of the visitor's site. The runtime is plain JavaScript; React users get a wrapper.
- **Letting the runtime render from the document.** Then the element set, the style model and the registry all ship to the visitor. Render on the server; the runtime shows and hides.
- **Exit intent on mobile.** There is no mouse to leave the window. The usual substitutes — a fast upward scroll, the back button — are approximations. Offer one, name it honestly in the editor, and let the writer choose a different trigger for mobile.
- **A popup that cannot be closed.** A modal with the close button disabled and no overlay click is a trap for the visitor and a complaint for the site. `checkPopup` makes it an error, not a warning.
- **Special-casing the engine.** `if (profile.kind === 'popup')` anywhere in the engine means the abstraction failed. The engine does not know which kits exist.
- **Scope.** A/B tests, multi-step flows, integrations with mailing-list services and games are in [FEATURES.md](../FEATURES.md). The first version is one popup, shown at the right time, that looks right and can be closed.
