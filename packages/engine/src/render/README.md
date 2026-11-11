# @motors/builder-render

Renders a `@motors/builder-core` document as React. Server Component safe:
static elements ship no JavaScript; only a few small islands hydrate (copy
button, click-to-load embed, tabs, carousel, before/after slider, lightbox,
newsletter form).

```tsx
import { createStandardRegistry } from '@motors/builder-core';
import { ArticleRenderer } from '@motors/builder-render';

const registry = createStandardRegistry();

<ArticleRenderer
  document={doc}
  registry={registry}
  resolveMedia={(key) => mediaUrls[key] ?? ''}
  locale="en"
  linkComponent={MyLink} // optional — defaults to <a>
  imageComponent={MyImage} // optional — defaults to <img loading="lazy">
  related={relatedArticles} // for `related` elements in automatic mode
  newsletterAction="/api/subscribe" // where the newsletter form POSTs { email }
/>;
```

## Options

| Option             | Purpose                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------ |
| `resolveMedia`     | Storage key → URL. Required.                                                                     |
| `locale`           | `en`, `sq` or `de` ship; anything else falls back to English.                                    |
| `messages`         | Override any of the renderer's own words (`RenderMessages`).                                     |
| `linkComponent`    | Your router's link (`next/link`). Receives `href`, `className`, `target`, `rel`, `children`.     |
| `imageComponent`   | Your image component. Receives `src`, `alt`, `width`, `height`, `className`, `style`, `loading`. |
| `related`          | Items for the `related` element in automatic mode.                                               |
| `newsletterAction` | URL the newsletter form posts `{ email }` to. Omitted, the form is inert.                        |
| `elements`         | Renderers for your own element types (see _Custom elements_).                                    |
| `editing`          | Used by the editor canvas: links do not navigate, forms do not submit, embeds stay placeholders. |

## Safety

- No `dangerouslySetInnerHTML` anywhere in the package (a test enforces it).
- A node renders only if its props pass its element's schema; invalid or unknown
  nodes render nothing.
- Links are checked with `isSafeUrl` again at render time; external links get
  `rel="noopener noreferrer"`.
- Embeds are built from the id in an allow-listed URL (YouTube via
  `youtube-nocookie.com`), load only after the reader clicks, and are sandboxed.
- An image still waiting to be uploaded (`pendingUrl`) is never loaded on the site.

## Structured data

`structuredData(doc, registry, { url, resolveMedia, … })` returns Schema.org
objects: `Article`, plus `FAQPage`, `HowTo` and `Review` when the document has
those elements. Write them yourself, escaped with `jsonLdString`:

```tsx
<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(data) }} />
```

## Theme contract

The classes use the shadcn-style semantic Tailwind colours — `background`,
`foreground`, `card`, `muted`, `muted-foreground`, `primary`,
`primary-foreground`, `secondary`, `secondary-foreground`, `border`,
`border-strong`, `destructive` — plus `ok`, `warn`, `no` and `chart-1` for
callout and pros/cons tones. Optional CSS variables with fallbacks:
`--radius-card` (0.625rem), `--radius-control` (0.4rem), `--maxw-prose` (68ch).
Keyframes `ui-rise`, `ui-fade-in`, `ui-zoom-in`, `ui-pop` animate small
transitions and are ignored if absent.

Tailwind scans the importing app, so add the package to its sources:

```css
@source '../node_modules/@motors/builder-render/src';
```

`src/style-classes.ts` (style tokens → literal classes per breakpoint range) is
generated: `node scripts/generate-style-classes.mjs`.

## Custom elements

Register the definition with the core registry, then pass a renderer:

```tsx
function NoteView({ props, frame }: ElementRenderProps<{ body: string }>) {
  return <p {...frameProps(frame, 'my-6 italic')}>{props.body}</p>;
}

<ArticleRenderer … elements={{ note: NoteView }} />
```

`frame` carries the node's anchor id and its style as classes; `frameProps`
merges them over your defaults so the node's own style wins.
