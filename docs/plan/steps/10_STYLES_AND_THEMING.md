# 10 — Styles and theming

## Goal

Each package ships a compiled stylesheet. A parent project imports one CSS file and the editors work — with or without Tailwind in the parent, without changing the parent's own styles, and without being changed by them. The look comes from sixteen CSS variables with built-in light and dark defaults, and `theme="auto"` follows the parent.

## Why

The packages are written in Tailwind classes — 686 `className` uses — and expect the parent to compile them: an `@source` line per package and MotorsAL's token names ([builder-render/README.md](../../../packages/builder-render/README.md#theme-contract)). Outside MotorsAL that means an editor with no styles at all.

Shipping compiled CSS into someone else's page has four hazards. The design answers each; all of it was tried against Tailwind 4.3.3 ([BLUEPRINT.md §12](../BLUEPRINT.md#12-styles-without-tailwind-in-the-parent)).

| Hazard                                                                                            | Answer                                                                           |
| ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| The parent also has `.flex`, `.p-4`, `--spacing`                                                  | A prefix on every class and every Tailwind variable: `bst:flex`, `--bst-spacing` |
| The parent has global rules: `button { padding: 1rem }`, `h2 { font-size: 3rem }`                 | A reset scoped to `.builderset`, at class specificity, before the utilities      |
| The parent's own cascade layers are reordered, or its unlayered rules beat layered ones           | No `@layer` in the product's CSS                                                 |
| A theme value set on the editor's element is ignored because the variable was computed at `:root` | `@theme inline`: each class reads the public variable where it is used           |

## Before you start

- Step 09 is done.
- The example app from step 12, part 1 (a Vite app with no Tailwind), exists at least as an empty shell. This step cannot be judged inside a project that has Tailwind.
- Screenshots of both editors and a rendered article from MotorsAL, light and dark. They are the reference for the defaults.

## The work

### Part A — list the tokens in use

The classes use token names from MotorsAL's theme. Find every one:

```bash
git grep -ohE "\b(bg|text|border|ring|outline|fill|stroke|from|via|to|divide|shadow|decoration|accent|caret)-[a-z][a-z0-9-]*(/[0-9]+)?" -- 'packages/*/src' | sed 's#/[0-9]*$##' | sort | uniq -c | sort -rn
git grep -ohE "var\(--[a-z0-9-]+" -- 'packages/*/src' | sort | uniq -c | sort -rn
```

The second command finds raw variable references. When this plan was written there were 40 of `var(--radius-control)`, 33 of `var(--radius-card)`, 7 of `var(--maxw-prose)` and a few of `--primary`, `--border`, `--muted-foreground`, `--font-sans`, `--ease-enter` and `--dur-3`.

Sort the result into a table and keep it in `packages/engine/src/theme/README.md`:

| Internal name (in classes)                 | Comes from                                                                        |
| ------------------------------------------ | --------------------------------------------------------------------------------- |
| `background`                               | `--builderset-background`                                                         |
| `card`, `popover`                          | `--builderset-surface`                                                            |
| `foreground`, `card-foreground`            | `--builderset-foreground`                                                         |
| `muted`, `secondary`                       | `--builderset-muted`                                                              |
| `muted-foreground`, `secondary-foreground` | `--builderset-muted-foreground`                                                   |
| `border`                                   | `--builderset-border`                                                             |
| `border-strong`                            | `color-mix(in oklab, var(--builderset-border), var(--builderset-foreground) 25%)` |
| `primary`, `primary-foreground`            | `--builderset-primary`, `--builderset-primary-foreground`                         |
| `destructive`, `no`                        | `--builderset-danger`                                                             |
| `ok`                                       | `--builderset-success`                                                            |
| `warn`                                     | `--builderset-warning`                                                            |
| `ring`                                     | `--builderset-ring`                                                               |
| `radius-control`                           | `--builderset-radius`                                                             |
| `radius-card`                              | `calc(var(--builderset-radius) * 1.5)`                                            |
| `font-sans`, `font-mono`                   | `--builderset-font`, `--builderset-font-mono`                                     |
| `maxw-prose`                               | `--builderset-prose-width`                                                        |

**Many internal names, sixteen public variables.** The internal names stay so that the classes do not change; the public list stays short because each variable is a promise ([BLUEPRINT.md §9](../BLUEPRINT.md#the-variables)). A colour that is a shade of another is derived with `color-mix`, not given its own variable.

### Part B — the theme source

```
packages/engine/src/theme/
├── index.css          the Tailwind entry for the editor
├── theme.css          @theme inline: internal names → public variables with defaults
├── scheme.css         light, dark, auto
├── reset.css          the scoped reset
├── keyframes.css      bst-rise, bst-fade-in, bst-zoom-in, bst-pop
├── panel.css          the dense side-panel rules
├── shadcn.css         published as it is
├── shadcn-hsl.css     published as it is
└── README.md          the table from part A
```

`index.css` — the order matters: the reset must come before the utilities.

```css
@import 'tailwindcss/theme.css' prefix(bst);
@import './theme.css';
@import './scheme.css';
@import './reset.css';
@import './keyframes.css';
@import 'tailwindcss/utilities.css' prefix(bst);
@import './panel.css';

@source '../editor';
```

`theme.css` — every default has a light and a dark value on one line:

```css
@theme inline {
  --color-background: var(--builderset-background, light-dark(#f7f7f8, #0b0c0e));
  --color-card: var(--builderset-surface, light-dark(#ffffff, #1a1c1f));
  --color-foreground: var(--builderset-foreground, light-dark(#1b1e22, #e6e8eb));
  --color-muted: var(--builderset-muted, light-dark(#f1f2f4, #15171a));
  --color-muted-foreground: var(--builderset-muted-foreground, light-dark(#626569, #9aa0a8));
  --color-border: var(--builderset-border, light-dark(#e6e8eb, #2a2d31));
  --color-primary: var(--builderset-primary, light-dark(#2563eb, #6ea8fe));
  --color-primary-foreground: var(--builderset-primary-foreground, light-dark(#ffffff, #0b0c0e));
  /* … the rest of the table in part A … */
  --radius-control: var(--builderset-radius, 0.4rem);
  --font-sans: var(--builderset-font, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif);
}
```

Take the neutral values from MotorsAL's palette ([packages/tokens/src/theme.css](../../../packages/tokens/src/theme.css)), which was tuned for this editor, and replace only the brand colour with a neutral blue. Check every text and background pair for a contrast of at least 4.5 to 1, in both themes.

`scheme.css`:

```css
.builderset {
  color-scheme: light;
}
.builderset[data-builderset-theme='dark'] {
  color-scheme: dark;
}
.builderset[data-builderset-theme='auto'] {
  color-scheme: light dark;
}
:is(.dark, [data-theme='dark']) .builderset[data-builderset-theme='auto'] {
  color-scheme: dark;
}
:is(.light, [data-theme='light']) .builderset[data-builderset-theme='auto'] {
  color-scheme: light;
}
```

`auto` with no marker on any ancestor follows the operating system; with a `dark` or `light` class or `data-theme` attribute on an ancestor, it follows that. These two conventions cover Tailwind, shadcn and `next-themes`. A parent with another convention sets `theme` itself.

`reset.css` — Tailwind's own base styles, scoped. Copy `preflight.css` from the installed Tailwind and rewrite every selector `X` as `.builderset :where(X)`:

```css
.builderset :where(*, ::before, ::after) {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  border: 0 solid;
}
.builderset :where(button, input, select, textarea) {
  font: inherit;
  color: inherit;
  background-color: transparent;
}
.builderset :where(h1, h2, h3, h4, h5, h6) {
  font-size: inherit;
  font-weight: inherit;
}
.builderset :where(ol, ul, menu) {
  list-style: none;
}
/* … the rest of preflight, the same way … */
```

Why this exact form: `.builderset :where(button)` has the specificity of one class. That beats the parent's `button { … }`, and it equals a utility such as `.bst\:p-2`, which comes later in the file and therefore wins. The editors run under the admin's global Tailwind reset today, so the scoped copy reproduces the conditions they were built in.

`panel.css` — today's [`PANEL_CSS`](../../../packages/builder-react/src/chrome/panel-css.ts) is a string injected into a `<style>` element at run time. Make it a real CSS file in the bundle: a parent with a strict Content-Security-Policy blocks injected styles. Its selectors name Tailwind classes (`.bld-panel .text-sm`), which get the prefix in part C: `.bld-panel .bst\:text-sm`.

### Part C — prefix every class

686 `className` attributes, plus class strings in helper calls and constants. Do it with a script, not by hand, and let Tailwind decide what is a class.

#### 1. The codemod

`tooling/prefix-classes.mjs`, run once and then deleted. It uses the TypeScript compiler API to find strings and Tailwind's design system to judge them:

```js
import { __unstable__loadDesignSystem } from 'tailwindcss';

const design = await __unstable__loadDesignSystem(themeCss, { base, loadStylesheet });
const isUtility = (token) => design.candidatesToCss([token])[0] !== null;
```

`candidatesToCss` returns CSS for a real utility under this package's theme and `null` for anything else. Tried on 4.3.3: `flex`, `hover:bg-primary`, `sm:max-lg:mt-0`, `-mt-2`, `rounded-[var(--radius-control)]` and `data-[state=open]:bg-primary` are utilities; `bld-panel`, `group` and `peer` are not. The function is marked unstable; that is acceptable for a script that runs once.

**Only strings in a class position are rewritten.** A string is in a class position when it is:

- the value of a JSX `className` attribute, including strings inside a conditional or a template in it;
- an argument of `cn(…)`, `clsx(…)`, `cva(…)` or `twMerge(…)`, at any depth;
- a value in the generated `style-classes.ts`.

In such a string, split on white space and put `bst:` in front of every token that is a utility. Leave other tokens as they are.

**Never run it on `src/core/`.** The core has no classes, and it has many strings that are also Tailwind words: the element types `'table'`, `'container'`, `'columns'`, `'list'`; the values `'hidden'`, `'fixed'`, `'italic'`. Prefixing one of those would change the stored document format.

#### 2. What the codemod cannot see

| Case                                                                                       | What to do                                                                                                                                  |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Class strings in a constant used later: `const SIZES = { sm: 'h-8 px-2' }`                 | The script prints every string outside a class position whose tokens are **all** utilities and number two or more. Review that list by hand |
| The markers `group` and `peer` (14 uses)                                                   | By hand: `bst:group`, and the variants become `bst:group-hover:…`                                                                           |
| `dark:` variants (16 uses)                                                                 | Remove them. Every colour comes from a token that already has both values                                                                   |
| Raw `var(--radius-control)`, `var(--radius-card)`, `var(--maxw-prose)` in arbitrary values | Replace with the named utility (`bst:rounded-control`) or the public variable (`var(--builderset-radius)`)                                  |
| Keyframe names `ui-rise`, `ui-fade-in`, `ui-zoom-in`, `ui-pop`                             | Rename to `bst-…` and define them in `keyframes.css`. Today they are "ignored if absent"; now they are always present                       |
| `style-classes.ts`                                                                         | Change the generator (`scripts/generate-style-classes.mjs`) to emit prefixed classes and run it                                             |
| Classes in tests (`toHaveClass('flex')`)                                                   | Update the expectation, or better, assert on behaviour                                                                                      |
| `prettier-plugin-tailwindcss`                                                              | Tell it about the prefix through the stylesheet path in the Prettier config, or it will reorder nothing                                     |

#### 3. The test that keeps it true

`tooling/unprefixed.test.ts`, run with the other tests: for every `.tsx` file under `src/editor` and `src/render`, collect the strings in class positions the same way the codemod does, and fail on any token that is a utility **without** the prefix.

An unprefixed class is silent: Tailwind emits nothing for it and the element just loses a style. This test is the only thing that reports it.

### Part D — build the stylesheets

Add `@tailwindcss/cli` and a script to each package:

```json
"build:css": "tailwindcss -i src/styles.css -o dist/styles.css --minify"
```

| Stylesheet                        | Source file                  | Scans                                                           |
| --------------------------------- | ---------------------------- | --------------------------------------------------------------- |
| `@builderset/engine/styles.css`   | `engine/src/theme/index.css` | `engine/src/editor`                                             |
| `@builderset/email/styles.css`    | `email/src/styles.css`       | `engine/src/editor`, `email/src/editor`                         |
| `@builderset/article/content.css` | `article/src/content.css`    | `article/src/render`                                            |
| `@builderset/article/styles.css`  | `article/src/styles.css`     | `engine/src/editor`, `article/src/editor`, `article/src/render` |

A kit's source imports the engine's theme files by relative path and adds its own `@source` lines. The result is complete on its own: a developer imports one file per kit.

Make sure each build scans only the folders in the table. Tailwind also looks at the working directory by default; switch that off or run the command so that nothing else is found, and compare the size of the output before and after.

The email kit's `render` has no classes and no stylesheet: emails use inline styles.

`content.css` is for a rendered article on a site, where there is no editor. The renderer's root carries `class="builderset builderset-content"` and `data-builderset-theme`, and `content.css` contains the theme, the scheme rules, the reset scoped to `.builderset-content`, and the utilities the renderer uses.

Add the files to the manifests' `exports` and make `build` run both tsdown and `build:css`.

### Part E — the props

On `BuilderEditor`, and passed through by every kit's editor:

```ts
/** 'light' (default), 'dark', or 'auto' to follow the parent. */
theme?: 'light' | 'dark' | 'auto' | undefined;
/** Theme values from JavaScript. Keys are the public variables without the prefix. */
tokens?: Partial<Record<TokenName, string>> | undefined;
```

The workspace root becomes:

```tsx
<div
  className={cn('builderset', className)}
  data-builderset-theme={theme ?? 'light'}
  style={toVariables(tokens)} // { '--builderset-primary': '#da6c1e', … }
>
  <PortalProvider>{/* the workspace */}</PortalProvider>
</div>
```

`PortalProvider` (from step 04) renders its container **inside** this element, so every menu, popover, tooltip and dialog inherits the scheme and the variables without copying anything.

`ArticleRenderer` takes `theme` too, default `'auto'`: a rendered article should follow the site.

### Part F — the two shadcn files

```css
/* shadcn.css — for projects whose tokens are complete colours (Tailwind 4, shadcn's current form). */
.builderset {
  --builderset-background: var(--background);
  --builderset-surface: var(--card);
  --builderset-foreground: var(--foreground);
  --builderset-muted: var(--muted);
  --builderset-muted-foreground: var(--muted-foreground);
  --builderset-border: var(--border);
  --builderset-primary: var(--primary);
  --builderset-primary-foreground: var(--primary-foreground);
  --builderset-danger: var(--destructive);
  --builderset-ring: var(--ring);
  --builderset-radius: var(--radius);
  --builderset-font: var(--font-sans);
}
```

`shadcn-hsl.css` is the same with each colour as `hsl(var(--background))`, for projects that store bare HSL numbers.

If the parent does not define one of these, that `--builderset-*` variable is invalid and the built-in default is used. Nothing breaks.

### Part G — other run-time style injection

[`use-stylesheet.ts`](../../../packages/builder-react/src/use-stylesheet.ts) adds a `<link>` for font previews (`fontsPreviewUrl`), and the email kit does the same for Google Fonts on the canvas. Keep it, and:

- document it: a parent with a Content-Security-Policy must allow the font host;
- add an option to turn it off (`fontPreviews={false}`), for projects that may not call a third party.

## Check

```bash
pnpm build && pnpm check:packages && pnpm test
grep -c "@layer" packages/*/dist/*.css            # 0 for every file
grep -oE "\.[a-z][a-zA-Z0-9_-]*\{" packages/email/dist/styles.css | sort -u | head   # only .builderset, .bld-…, and .bst\:… classes
```

In the Vite example with no Tailwind:

| Case                                                                                                                                                       | Expect                                                  |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Import the stylesheet, render the editor                                                                                                                   | Looks like the MotorsAL screenshots, in neutral colours |
| `theme="dark"`                                                                                                                                             | Dark, menus and dialogs included                        |
| `theme="auto"`, toggle `class="dark"` on `<html>`                                                                                                          | The editor follows                                      |
| `theme="auto"`, no class, switch the operating system's theme                                                                                              | The editor follows                                      |
| `tokens={{ primary: '#da6c1e' }}`                                                                                                                          | Selection outlines and primary buttons turn orange      |
| Set `--builderset-primary` on `:root` in the page's CSS                                                                                                    | The same                                                |
| Add a hostile page stylesheet: `* { box-sizing: content-box } button { padding: 40px; text-transform: uppercase } h2 { font-size: 60px } a { color: red }` | The editor does not change                              |
| A button of the page's own, outside the editor, before and after importing the stylesheet                                                                  | Identical computed styles                               |

In the Next example with Tailwind and shadcn: import `shadcn.css`; the editor takes the project's colours and radius; the project's own pages do not change.

## Done when

- [ ] Every class in `src/editor` and `src/render` has the prefix; `unprefixed.test.ts` passes and was seen to fail on a missed class.
- [ ] The four stylesheets build; none contains `@layer`, an unprefixed utility, or an unprefixed Tailwind variable.
- [ ] No `dark:` variant, no raw MotorsAL variable name, no `ui-` keyframe name is left.
- [ ] `theme` and `tokens` work on the editors; `theme` works on the article renderer.
- [ ] Floating elements follow the theme.
- [ ] All eight cases in the table pass in the Vite example.
- [ ] Every default text and background pair has a contrast of at least 4.5 to 1 in both themes.
- [ ] `theme/README.md` holds the internal-to-public table.

## Traps

- **Running the codemod on the core.** It would rewrite element type names. The script must refuse any path containing `/core/`.
- **A missed class looks like a design change, not an error.** Compare screenshots panel by panel. The usual misses are class strings in constants and in `cva` variants.
- **A transform on the editor's root.** `transform`, `filter` or `contain` on an ancestor makes fixed-position menus measure from that ancestor. The root must have none, and the README must tell parents not to put the editor inside a transformed element (an animated route transition is the usual cause).
- **The reset reaching the canvas content.** The reset is inside `.builderset`, and the canvas is inside `.builderset`. That is intended — it is what the editors have today — but check the email canvas against a sent email: an inline style always wins over the reset, so they should match.
- **Specificity from a parent's id selector.** `#app button { … }` beats everything here. It cannot be defended against without Shadow DOM. Document it as a known limit and suggest `:where(#app) button`.
- **`light-dark()` in old browsers.** It needs browsers from 2024 on. Decision D5 accepted that; say it in the README.
- **Bundle size creeping.** Record the size of each stylesheet in the pull request. A file that doubles means the build scanned the wrong folder.
