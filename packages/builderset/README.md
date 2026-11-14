# builderset

Block editors for React, on one engine: an email builder and an article builder today, popups, pages and forms later. Each saves a typed JSON document that any backend can validate, and renders it on the server — email HTML, or semantic React for a site.

> **Not released yet.** Nothing is on npm; see the [repository](https://github.com/mkurtii/builderset).

## Install

```bash
npm install builderset           # every kit
npm install @builderset/email    # or only the one you need
```

Every kit also installs alone, under its own name. Use one or the other, not both: two installs at different versions put two engines in the page.

## An editor, and a render

```tsx
'use client';
import 'builderset/styles.css';
import { EmailEditor } from 'builderset/email/editor';

<EmailEditor
  document={doc}
  registry={registry}
  host={host}
  type={null}
  brand={brand}
  record={record}
  onBack={back}
/>;
```

```ts
import { renderEmail } from 'builderset/email/render';

const { html, text, subject } = renderEmail(doc, {
  assetUrl: (key) => `https://cdn.example.com/${key}`,
});
```

There is no `import … from 'builderset'`: the path says which side the code is for — `…/editor` in the browser, `…/render`, `…/host` and the kit's own path on a server too.

## What is inside

| Path                                                                                              | The same as                                                 |
| ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `builderset/email`, `/email/render`, `/email/editor`, `/email/host`, `/email/locales/*`           | [`@builderset/email`](../email/README.md)                   |
| `builderset/article`, `/article/render`, `/article/editor`, `/article/host`, `/article/locales/*` | [`@builderset/article`](../article/README.md)               |
| `builderset/engine`, `/engine/editor`, `/engine/ui`, `/engine/host`, `/engine/locales/*`          | [`@builderset/engine`](../engine/README.md)                 |
| `builderset/styles.css`                                                                           | Every editor and the rendered article; each rule once       |
| `builderset/article/content.css`                                                                  | A rendered article on a site, with no editor (much smaller) |
| `builderset/theme/shadcn.css`, `/theme/shadcn-hsl.css`                                            | The look of a shadcn-themed project                         |

The kits' READMEs have the props, the theme and the backend contract. The JSON Schemas and the contract fixtures are in each kit, not here: a backend that needs them depends on the kit.

## Links

- [The repository](https://github.com/mkurtii/builderset) · [what a backend must do](../engine/src/host/BACKEND.md)
- [Licence: MIT](LICENSE). The changelog starts with the first release.
