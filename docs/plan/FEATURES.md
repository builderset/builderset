# Features

What each builder does today, and what can be added. This is a catalogue to choose from, not a commitment. The order of the engineering work is in [ROADMAP.md](ROADMAP.md).

## How to read the tables

| Column   | Values                                                                                                       |
| -------- | ------------------------------------------------------------------------------------------------------------ |
| **When** | **Next**: worth doing soon after the packages are public. **Later**: after 1.0. **Maybe**: only if asked for |
| **Size** | S up to 2 days · M 3 to 5 days · L 1 to 2 weeks · XL more                                                    |
| **In**   | Which package the work lands in                                                                              |

A feature built in the **engine** is free in every kit. That is the reason to prefer engine features.

---

## 1. The engine — in every builder

### Today

From [packages/builder-react/README.md](../../packages/builder-react/README.md) and the source:

- **Workspace.** Top bar, left rail (add, layers, templates), canvas, inspector, status bar.
- **Canvas.** Click and multi-select, hover outlines, a block toolbar, drag and drop with a live drop indicator and placement rules, inline rich-text editing, Enter splits and Backspace merges, Markdown shortcuts, a `/` insert menu.
- **Inspector.** Generated from each element's schema, so every prop can be edited and none can be made invalid. Style per screen size with desktop → tablet → mobile inheritance.
- **History.** Undo and redo with named steps; revisions; a conflict dialog when someone else saved.
- **Saving.** Autosave after two seconds and when the tab is hidden, a crash-safety copy in `localStorage`, a leave guard.
- **Multi-language writing.** One document, its words written again per language.
- **Devices and zoom.** Desktop, tablet and mobile preview.
- **Checks.** Live issues in the status bar; errors block publishing.
- **Keyboard.** A shortcut list behind `?`.
- **Clipboard.** Copy and paste of blocks; saved sections.

### To add

| Feature                             | What the writer or developer gets                                                                                                                                | When  | Size | In     |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ---- | ------ |
| **AI assistant**                    | Write, rewrite, shorten, fix, change tone, translate a block or the whole document. The host supplies the model call (`host.ai`), so no key lives in the package | Next  | L    | engine |
| **AI translate**                    | Fill another content language in one click, then edit. Uses the existing translation storage                                                                     | Next  | M    | engine |
| **Command palette**                 | `Ctrl+K`: insert, find a block, run any action                                                                                                                   | Next  | M    | engine |
| **Find and replace**                | Across the document, with rich text kept                                                                                                                         | Next  | M    | engine |
| **Revision compare**                | Two revisions side by side, changed blocks marked                                                                                                                | Next  | M    | engine |
| **Comments**                        | A thread on a block; resolve; the host stores them (`host.comments`)                                                                                             | Later | L    | engine |
| **Synced sections**                 | A saved section used in many documents; change it once. The email kit's `synced` modules show the model                                                          | Next  | M    | engine |
| **Locked regions and roles**        | A template with parts a writer cannot change; an `editor` and a `designer` mode                                                                                  | Next  | M    | engine |
| **Accessibility checker**           | Contrast, missing alt text, heading order, link text — as issues in the status bar                                                                               | Next  | M    | engine |
| **Media library**                   | Browse and reuse uploads instead of uploading again (`host.listMedia`)                                                                                           | Next  | M    | engine |
| **Image editing**                   | Crop, focal point, rotate before upload                                                                                                                          | Later | M    | engine |
| **Stock images**                    | Search a provider from the media field; the host supplies the search                                                                                             | Maybe | S    | engine |
| **Right-to-left**                   | Arabic, Hebrew: the UI and the content direction                                                                                                                 | Later | L    | engine |
| **Touch editing**                   | Usable on a tablet: larger handles, a bottom sheet for the inspector                                                                                             | Later | L    | engine |
| **Real-time collaboration**         | Several writers in one document. Needs a shared-state layer (Yjs or similar) and a server                                                                        | Later | XL   | engine |
| **Presence, light version**         | "Ana is editing this" and a lock, without merging edits. A fraction of the cost of real collaboration                                                            | Next  | M    | engine |
| **Plugin API for panels**           | A third party adds a left-rail tab or an inspector section, not only an element                                                                                  | Later | M    | engine |
| **Iframe embed**                    | The editor in an iframe with a `postMessage` API, for parents that are not React                                                                                 | Later | L    | engine |
| **Import and export**               | Download and upload a document as a JSON file                                                                                                                    | Next  | S    | engine |
| **Paste from Word and Google Docs** | Clean paste into blocks. An HTML importer exists; this hardens it                                                                                                | Next  | M    | engine |
| **Usage events**                    | `onEvent('block.inserted', …)` so the parent can measure how the editor is used                                                                                  | Next  | S    | engine |
| **Custom fonts**                    | The parent registers its fonts once; every font field offers them                                                                                                | Next  | S    | engine |
| **Theme designer**                  | A page on the docs site that produces the `--builderset-*` values from a brand colour                                                                            | Later | M    | docs   |

---

## 2. Email builder

### Today

- **24 blocks.** Structure: section, row, column. Content: heading, text, list, button, image, divider, spacer, quote, video, logo, social, menu. Commerce and logic: product, coupon, key-value, line items, survey, footer, conditional, repeat ([packages/email-core/src/blocks/](../../packages/email-core/src/blocks/)).
- **Variables.** `{{ recipient.name }}`, `{{ order.total | money }}` — a closed list of formats, declared per email type, inserted as chips ([variables.ts](../../packages/email-core/src/variables.ts)).
- **Conditions and loops.** Show a block when a variable holds a value; repeat a block per list item.
- **Brand kit.** Named colours, logo, dark logo, font, social links; a document stores `brand.primary`, not a hex value.
- **Fonts.** Web-safe and Google fonts, each with a safe fallback stack ([fonts.ts](../../packages/email-core/src/fonts.ts)).
- **Output.** Table layout with inline styles, ghost tables and VML buttons for Outlook, a plain-text part, dark-mode settings.
- **Link tracking.** UTM source, medium and campaign added to every external link, from one setting ([document.ts](../../packages/email-core/src/document.ts)).
- **Import from HTML.** An existing email's HTML becomes blocks, and its images are copied into the project's storage.
- **Saved modules**, including synced ones.
- **Multi-language** subject, preheader and content.
- **A Python renderer** that produces the same bytes.

### To add

| Feature                         | What it gives                                                                                                         | When  | Size | In    |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ----- | ---- | ----- |
| **Client previews**             | The canvas framed as Gmail, Outlook and Apple Mail, light and dark, with each client's known limits simulated         | Next  | L    | email |
| **Pre-send checklist**          | Subject length, preheader present, alt text, links reachable, unsubscribe link present, size under Gmail's clip limit | Next  | M    | email |
| **Send a test**                 | A button that calls `host.sendTest(html, to)`                                                                         | Next  | S    | email |
| **Sample data sets**            | Several named sets of variable values to preview with: "new customer", "long name", "empty cart"                      | Next  | S    | email |
| **Starter templates**           | A neutral gallery: welcome, receipt, password reset, newsletter, invitation. Replaces the MotorsAL designs            | Next  | M    | email |
| **Countdown block**             | A timer image from an endpoint the host supplies                                                                      | Later | M    | email |
| **Dynamic content block**       | A slot filled at send time: recommended products, latest articles                                                     | Later | M    | email |
| **A/B subject and content**     | Variants in one document; the host picks at send time                                                                 | Later | M    | email |
| **Export**                      | Download the HTML; export with Handlebars or Liquid tags for other senders                                            | Next  | S    | email |
| **MJML import**                 | Open an MJML template as blocks                                                                                       | Maybe | M    | email |
| **AMP for email**               | Interactive emails in Gmail                                                                                           | Maybe | L    | email |
| **Provider adapters**           | `sendWithResend`, `sendWithSes`, `sendWithSmtp` as a separate optional package                                        | Later | M    | new   |
| **Transactional type registry** | A typed way to declare email types and their variables, generating the sample data and TypeScript types               | Later | M    | email |

---

## 3. Article builder

### Today

- **44 elements.** Layout: section, container, columns, group, divider, spacer. Text: heading, paragraph, list, quote, pull quote, callout, code, table, definitions, footnote, takeaways. Media: image, gallery, video, audio, file, embed, media with text, before and after. Article: table of contents, author, FAQ, how-to, pros and cons, rating, stats, timeline. Engagement: buttons, call to action, accordion, tabs, newsletter form, related, disclaimer ([packages/builder-core/src/elements/](../../packages/builder-core/src/elements/)).
- **Rendering.** React that is safe in Server Components; static elements ship no JavaScript; seven small islands hydrate ([packages/builder-render/README.md](../../packages/builder-render/README.md)).
- **Safety.** No raw HTML anywhere; links checked at render time; embeds from an allow-list, loaded on click, sandboxed.
- **SEO.** Title, description, canonical, noindex, focus keyword, a snippet preview with length meters, and Schema.org data for Article, FAQPage, HowTo and Review.
- **Publishing.** Draft, publish, schedule, unpublish, revisions.
- **Import.** From HTML and from Markdown.
- **Word count and reading time.**

### To add

| Feature                     | What it gives                                                                                                                                                                                                                                                                        | When  | Size | In      |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----- | ---- | ------- |
| **Content types**           | News, job post, case study, event, recipe: the parent declares a type as a schema for its extra fields and the set of elements it allows. The settings panel is generated from the schema, as the inspector already is. **One kit, many kinds of content — no new builder per kind** | Next  | M    | article |
| **Export**                  | Markdown, clean HTML, plain text                                                                                                                                                                                                                                                     | Next  | S    | article |
| **RSS and JSON-LD helpers** | Functions that turn a document into a feed item and into structured data for the type (JobPosting, NewsArticle, Event)                                                                                                                                                               | Next  | S    | article |
| **SEO score**               | Checks against the focus keyword: in title, in first paragraph, heading structure, internal links, image alt text                                                                                                                                                                    | Next  | M    | article |
| **Outline panel**           | The heading tree as a left-rail tab; drag a heading to move its section                                                                                                                                                                                                              | Next  | S    | article |
| **Reading extras**          | Progress bar, "copy link to heading", estimated time left — as renderer options                                                                                                                                                                                                      | Next  | S    | article |
| **More elements**           | Chart, map, comparison table, pricing table, code with tabs, math, poll, quiz, audio with chapters                                                                                                                                                                                   | Later | M    | article |
| **Social preview**          | How the article looks when shared on each network                                                                                                                                                                                                                                    | Next  | S    | article |
| **Editorial workflow**      | States beyond draft and published: in review, approved; the host decides who may move a document                                                                                                                                                                                     | Later | M    | engine  |
| **PDF export**              | A print stylesheet and a server-side PDF recipe                                                                                                                                                                                                                                      | Maybe | M    | article |
| **Paywall marker**          | A block that splits free and paid parts; the renderer cuts at it when told to                                                                                                                                                                                                        | Maybe | S    | article |

---

## 4. Popup builder — new, [step 17](steps/17_POPUP_BUILDER.md)

| Feature                   | What it gives                                                                                          | When          | Size |
| ------------------------- | ------------------------------------------------------------------------------------------------------ | ------------- | ---- |
| **Layouts**               | Centre modal, slide-in corner, top or bottom bar, full screen, inline slot                             | First version | —    |
| **Triggers**              | On load, after a delay, on scroll depth, on exit intent, on click, after inactivity, on a custom event | First version | —    |
| **Targeting**             | Page URL rules, device, new or returning visitor, referrer, UTM values, language                       | First version | —    |
| **Frequency**             | Once per session, once per N days, never again after closing or after converting                       | First version | —    |
| **Schedule**              | Start and end date                                                                                     | First version | —    |
| **Elements**              | Heading, text, image, button, email form, coupon, countdown, close, columns                            | First version | —    |
| **A small runtime**       | Plain JavaScript, no React on the visitor's page, isolated styles, accessible dialog behaviour         | First version | —    |
| **Events**                | `shown`, `closed`, `converted`, sent to the parent's analytics                                         | First version | —    |
| **Templates**             | Newsletter signup, promotion, exit offer, announcement bar, cookie notice, age gate                    | Next          | M    |
| **A/B testing**           | Variants with a traffic split                                                                          | Later         | M    |
| **Form integrations**     | Send a signup to the parent's endpoint; adapters for common list providers                             | Later         | M    |
| **Multi-step popups**     | Question, then form, then thank-you                                                                    | Later         | M    |
| **Spin-to-win and games** | Gamified capture                                                                                       | Maybe         | L    |

---

## 5. Page builder — new, [step 18](steps/18_PAGE_BUILDER.md)

| Feature                    | What it gives                                                                            | When          | Size |
| -------------------------- | ---------------------------------------------------------------------------------------- | ------------- | ---- |
| **Sections and layout**    | Section → row → column → element, with the per-screen style model the engine already has | First version | —    |
| **Section library**        | Hero, features, pricing, testimonials, FAQ, contact, footer                              | First version | —    |
| **Site theme**             | Colours, fonts, spacing, radius and button styles set once; every page follows           | First version | —    |
| **Global parts**           | Header and footer edited once, used on every page                                        | First version | —    |
| **Page settings**          | Slug, SEO, social image, noindex                                                         | First version | —    |
| **Symbols**                | A reusable component with overridable text                                               | Next          | L    |
| **Data binding**           | A list or a detail page filled from the parent's data: cars, jobs, news                  | Next          | XL   |
| **Forms**                  | From the form kit                                                                        | Next          | —    |
| **Navigation editor**      | Menus as data, used by the header                                                        | Next          | M    |
| **Animations**             | Reveal on scroll, hover states                                                           | Later         | M    |
| **Static export**          | A page as HTML and CSS files                                                             | Later         | M    |
| **Custom code block**      | HTML and CSS a developer adds, sandboxed                                                 | Later         | M    |
| **Multi-site and domains** | The portal's concern, built on the kit                                                   | Later         | XL   |

---

## 6. Form builder — new, after the popup kit

Needed by the popup kit (email capture), the page kit (contact forms) and job posts (applications).

| Feature               | What it gives                                                                                         | When          |
| --------------------- | ----------------------------------------------------------------------------------------------------- | ------------- |
| **Fields**            | Text, email, phone, number, select, radio, checkbox, date, file, consent                              | First version |
| **Validation**        | Required, patterns, lengths — the same rules checked in the browser and on the server from one schema | First version |
| **Submission**        | Posts to the parent's endpoint; the parent stores and notifies                                        | First version |
| **Spam protection**   | Honeypot, and a slot for the parent's captcha                                                         | First version |
| **Conditional logic** | Show a field when another has a value                                                                 | Next          |
| **Multi-step**        | Pages with a progress bar                                                                             | Next          |
| **File uploads**      | Through the host's upload                                                                             | Next          |
| **Calculated fields** | Totals, scores                                                                                        | Later         |
| **Payment field**     | The host supplies the provider                                                                        | Maybe         |

---

## 7. For developers

| Feature                   | What it gives                                                                                               | When  | Size |
| ------------------------- | ----------------------------------------------------------------------------------------------------------- | ----- | ---- |
| **`create-builderset`**   | `npm create builderset` scaffolds an editor page, a host adapter and a route for a chosen kit and framework | Next  | M    |
| **Reference backends**    | Next.js with Drizzle, Next.js with Prisma, FastAPI with SQLAlchemy — complete and tested                    | Next  | M    |
| **Typed variables**       | Generate TypeScript types for an email type's variables from its declaration                                | Later | S    |
| **Testing helpers**       | `createMemoryHost`, document builders and a `render` helper for a project's own tests                       | Next  | S    |
| **Storybook of elements** | Every element in every state, public on the docs site                                                       | Next  | M    |
| **CLI**                   | `builderset validate file.json`, `builderset render email.json --data data.json`, `builderset migrate`      | Later | M    |
| **Ports**                 | PHP and Go validators and email renderers, tested against the same fixtures                                 | Maybe | L    |
| **Hosted backend**        | Storage, revisions, uploads and sending behind `createCloudHost({ apiKey })`                                | Later | XL   |
| **Template marketplace**  | Share and sell templates and custom elements                                                                | Maybe | XL   |

---

## 8. Choosing what to build next

Three questions, in this order:

1. **Does MotorsAL or the portal need it?** A feature with a real user is finished properly; a speculative one is not.
2. **Can it live in the engine?** Then every kit gets it.
3. **Does it add to the public surface?** A new prop, variable or host method is a promise. Prefer features that add none (client previews, checks) over those that add several (collaboration, comments).

By those questions the first five after 1.0 are: content types, the form kit, AI assistance, the email pre-send checklist with client previews, and synced sections.
