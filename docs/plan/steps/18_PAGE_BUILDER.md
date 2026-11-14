# 18 — The page builder

## Goal

`@builderset/page`: a kit for building web pages from sections, with a site-wide theme and shared header and footer. It is the editor the portal's website builder is made of. The first milestone is one landing page, built in the editor and published.

## Why

It is the reason the whole product exists in the owner's plan: a portal where people build websites. Everything before this step makes it smaller:

| Already there after step 17                            | Used for                                |
| ------------------------------------------------------ | --------------------------------------- |
| The workspace, drag and drop, undo, inspector, layers  | The page editor's whole frame           |
| Per-screen-size styles with inheritance                | Responsive pages                        |
| Multi-language documents                               | Multi-language sites                    |
| The article kit's elements and renderer                | Text, media and layout blocks on a page |
| The popup kit's server-rendered HTML and generated CSS | The page's rendering approach           |
| The host adapter, revisions, saved and synced sections | Storage, history, reusable parts        |
| Theme variables                                        | The model for the site theme            |

## Before you start

- Milestone M5: 1.0 is released. The engine's API is stable; this kit must be built on it as it is.
- Decide who the first user is. A page builder for developers' back offices and a website builder for the portal's end customers overlap but are not the same product. This plan builds the kit; the portal is built on the kit and is not part of this plan.

## The size of it, honestly

This is the largest piece in the plan, larger than everything before it together if it is allowed to grow. Projects of this kind fail by trying to be Webflow in the first version.

So it is cut into five milestones, each of which is useful by itself and can be released. Do not start one before the previous one is in real use.

| Milestone | What a writer can do                                                            | Size |
| --------- | ------------------------------------------------------------------------------- | ---- |
| **P1**    | Build one landing page from a section library, and publish it                   | XL   |
| **P2**    | Set the site's colours, fonts and buttons once; edit the header and footer once | L    |
| **P3**    | Reuse a component across pages with small differences (symbols)                 | L    |
| **P4**    | Show the project's data on a page: a list of cars, a job post                   | XL   |
| **P5**    | Manage a whole site: page tree, navigation, redirects                           | L    |

## The design

### 1. Three kinds of thing, not one

| Thing           | What it is                                                       | Stored as                                |
| --------------- | ---------------------------------------------------------------- | ---------------------------------------- |
| **Page**        | One document: a tree of sections and elements, and page settings | `PageDocument`                           |
| **Site theme**  | Colours, fonts, spacing, radius, button styles, for every page   | One `SiteTheme` object per site          |
| **Global part** | A header, a footer, a reusable symbol                            | Its own small document, referenced by id |

A page does not contain the theme or the header. It refers to them. Changing the brand colour or the footer changes every page without touching any page document.

```ts
export interface PageDocument extends EngineDocument<PageMeta> {
  schema: 'page/document';
  settings: PageSettings;
}

interface PageMeta {
  title: string;
  slug: string;
  seo: SeoMeta; // the article kit's shape
}

interface PageSettings {
  header: string | null; // a global part's id, or none
  footer: string | null;
  width: 'full' | 'boxed';
}

export interface SiteTheme {
  colors: Record<
    'background' | 'surface' | 'text' | 'muted' | 'primary' | 'onPrimary' | 'accent' | 'border',
    string
  >;
  dark?: Partial<SiteTheme['colors']>;
  fonts: { heading: string; body: string };
  scale: { base: number; ratio: number }; // the type scale
  spacing: number; // the unit sections and gaps are multiples of
  radius: number;
  buttons: Record<'primary' | 'secondary' | 'ghost', ButtonStyle>;
}
```

### 2. The tree

```
page
└── section            full width; background, padding, anchor
    └── container      the content column
        └── row / grid columns per screen size
            └── element
```

The placement rules — a section only at the top level, a column only in a row — are registry rules, as in the other kits.

Elements in the first version: heading, text, list, image, video, button, button group, icon, divider, spacer, card, feature (icon, title, text), testimonial, logo strip, accordion, tabs, gallery, embed, form (from the form kit). Many exist in the article kit. Reuse the article kit's definitions and renderers where a block means the same thing in both; the page kit depending on the article kit is allowed only if the rule "a kit never imports another kit" is consciously changed. The better answer is to move the truly shared elements down into a `@builderset/blocks` package that both depend on. Decide at the start of P1 and write the decision into the blueprint.

### 3. Styles: free values, generated CSS

The article kit maps a small set of style tokens (`sm`, `md`, `lg`) to fixed classes. A page builder needs more: any padding, any colour, any size, per screen size.

- Node styles hold **values**, not tokens: `{ paddingTop: 96, background: 'theme.primary', maxWidth: 1200 }`, with the engine's per-breakpoint inheritance.
- A value may be a literal or a reference to the site theme (`theme.primary`, `theme.spacing * 4`). References are what keep a site consistent.
- The renderer produces **one CSS file per page**: a class per node that has styles, media queries for the breakpoints, and the theme as CSS variables on the page root. No Tailwind and no runtime styling on the visitor's page.

This is the approach step 17 used for popups, at a larger scale. Extend the engine's style model to carry values only if the popup kit's version of it cannot; otherwise build on that.

### 4. Rendering

| Entry                     | Gives                                                                                               | For                                        |
| ------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `@builderset/page/render` | `<PageView document theme parts … />` — React, safe in Server Components, islands only where needed | A Next.js site: the portal's own rendering |
| `@builderset/page/static` | `renderPage(document, { theme, parts })` → `{ html, css, head }`                                    | Static export; any server                  |

Both take the page, the theme and the global parts and return the complete page. `head` holds title, description, canonical, social tags and structured data.

The rules the article renderer already follows hold here too: no raw HTML, every URL checked, embeds from an allow-list and loaded on click, images with dimensions and lazy loading.

### 5. The editor

`<PageEditor>` is the workspace with a page profile, plus three things the workspace does not have yet:

| New                     | What                                                                                                                                   | Milestone |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| **Section library**     | The add panel offers whole sections — hero, features, pricing, testimonials, FAQ, contact — as well as single elements                 | P1        |
| **Theme panel**         | Edits the `SiteTheme`; the canvas updates live. It saves through its own host method, since the theme is not part of the page          | P2        |
| **Global part editing** | Clicking the header on the canvas opens the header's document in place, with a clear "you are editing the header for every page" frame | P2        |
| **Symbols**             | A selected group becomes a symbol; instances show which props are overridden                                                           | P3        |
| **Data panel**          | Binds an element's prop to a field of the project's data                                                                               | P4        |
| **Pages panel**         | The page tree, add, rename, reorder; navigation menus                                                                                  | P5        |

The host grows with them: `loadTheme` / `saveTheme`, `loadPart` / `savePart`, `listPages`, and for P4 `dataSources`.

### 6. Data binding (P4)

The portal's customers will want "a page that lists my cars" and "a page for one job post".

- The project declares **data sources**: a name, a schema of fields, and whether it is a list or a single item: `cars` (list), `car` (single, by slug).
- A **collection** element repeats its child for each item of a list source. A prop of any element inside can be bound to a field: the heading's text to `car.title`, the image to `car.cover`.
- A page can be a **template** for a single-item source: one document, rendered once per item, with the slug in the URL.
- The renderer receives the data from the project: `<PageView data={{ cars }} />`. The kit never fetches.

The email kit's variables, conditions and repeat blocks are the same idea in a smaller form ([variables.ts](../../../packages/email-core/src/variables.ts)). Lift that model; do not invent a second one.

### 7. What the portal adds on top

Not in this kit: accounts and billing, sites and custom domains, hosting and deployment, a template gallery for end customers, a media library with quotas. The kit gives the portal an editor component, a renderer and a document format; the portal is a normal application around them, with the hosted backend from [BLUEPRINT.md §11](../BLUEPRINT.md#later-a-hosted-backend).

## The work, milestone P1

Follow [19_ADDING_A_NEW_BUILDER.md](19_ADDING_A_NEW_BUILDER.md) for the mechanical parts. The P1 scope, exactly:

1. `PageDocument`, the tree, about fifteen elements, validation, schema, fixtures.
2. The value-based style model and the per-page CSS generator.
3. `<PageView>` and `renderPage`.
4. `<PageEditor>` with the section library (eight sections) and page settings (title, slug, SEO).
5. A fixed default theme. No theme panel, no header or footer, no symbols, no data.
6. An example: a landing page built in the editor, rendered by the Next example at a route.
7. Docs: a quick start and the element reference.

Out of P1, written down so that nobody adds them quietly: the theme editor, global parts, symbols, data binding, the page tree, animations, custom code, e-commerce, a template marketplace.

## Check

For P1:

| Case                                                                                                          | Expect                                                                                         |
| ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Build the reference landing page (hero, features, testimonials, pricing, FAQ, contact) from an empty document | Possible without leaving the editor, in under thirty minutes for someone who knows it          |
| The rendered page with JavaScript disabled                                                                    | Complete and readable                                                                          |
| Desktop, tablet and mobile                                                                                    | Each as designed in the editor's preview                                                       |
| A performance audit of the rendered page                                                                      | No layout shift from the page's own content; images sized; no unused CSS beyond a small margin |
| An accessibility audit                                                                                        | Headings in order, landmarks present, contrast passes, everything reachable by keyboard        |
| A page with 60 sections                                                                                       | The editor stays responsive: typing does not lag                                               |
| The email, article and popup kits                                                                             | Unchanged, their tests pass                                                                    |

## Done when — P1

- [ ] `@builderset/page` exists with `core`, `render`, `static` and `editor`, and is in the all-in-one package.
- [ ] The reference landing page is built in the editor and served by the Next example.
- [ ] The schema and fixtures exist; `renderPage` has golden fixtures.
- [ ] Every row of the check table passes.
- [ ] The decision about shared elements is written into the blueprint.
- [ ] The docs site has the quick start and the reference.

**This is milestone M6.** P2 to P5 each get their own step file when they start.

## Traps

- **Starting with the theme editor or data binding because they are interesting.** Without P1 there is no page to theme or to bind.
- **A second style system.** If the page kit's styles and the popup kit's styles are two models, the engine has to carry both for ever. One model, extended.
- **Free positioning.** Absolute positioning of elements by dragging looks powerful and produces pages that break on every other screen size. Sections, rows and columns only; that is a decision, not a missing feature.
- **Storing the theme inside each page.** Then a brand colour change means rewriting every page. Pages refer to the theme.
- **Breaking 1.0.** Any engine change this kit wants must be additive. If it cannot be, it waits for 2.0 and the kit works around it.
- **Building the portal inside the kit.** Sites, domains, users and billing belong to the application that uses the kit.
