# The theme

The editor's classes use internal names (`bst:bg-card`, `bst:text-muted-foreground`, `bst:rounded-control`). Each one reads one of sixteen public variables, or a mix of them, with a built-in light and dark default. The public variables are the promise; the internal names can change.

## Internal name → public variable

| Internal name (in classes)                          | Comes from                                                     |
| --------------------------------------------------- | -------------------------------------------------------------- |
| `background`                                        | `--builderset-background`                                      |
| `card`, `popover`                                   | `--builderset-surface`                                         |
| `foreground`, `*-foreground` of the surfaces        | `--builderset-foreground`                                      |
| `muted`                                             | `--builderset-muted`                                           |
| `muted-foreground`                                  | `--builderset-muted-foreground`                                |
| `secondary`                                         | `muted` with 6% (light) or 12% (dark) of `foreground`          |
| `accent` (hover)                                    | `foreground` at 6% (light) or 10% (dark)                       |
| `input`                                             | `surface` with 5% (light) or 4% (dark) of `foreground`         |
| `sidebar`                                           | `surface` 85%, `background` 15%                                |
| `border`                                            | `--builderset-border`                                          |
| `border-strong`                                     | `border` with 45% of `foreground`                              |
| `ring`                                              | `--builderset-ring`, else `foreground`                         |
| `primary`, `primary-foreground`                     | `--builderset-primary`, `--builderset-primary-foreground`      |
| `destructive`, `no`                                 | `--builderset-danger`                                          |
| `ok`                                                | `--builderset-success`                                         |
| `warn`                                              | `--builderset-warning`                                         |
| `radius-card`, `radius-lg` … `radius-4xl`           | `--builderset-radius`                                          |
| `radius-control`, `radius-sm`, `radius-md`          | `--builderset-radius` × 0.7                                    |
| `shadow-pop`, `shadow-modal`                        | `foreground` at 7–22%: a shadow in light, a soft bloom in dark |
| `font-sans`, `font-mono`                            | `--builderset-font`, `--builderset-font-mono`                  |
| `max-w-measure`                                     | `--builderset-prose-width`                                     |
| `destructive-foreground`                            | Not public: near-white in light, near-black in dark            |
| `state-draft`, `state-scheduled`, `state-published` | Not public: the status chip's three hues                       |
| `chart-1`                                           | Not public: one accent in the article's callouts               |

`--builderset-radius` is a card's corner, like shadcn's `--radius`; a control's is 0.7 of it, so `shadcn.css` gives the editor the project's own corners. Defaults: 0.625rem and 0.4375rem.

The public variables have their defaults in [defaults.css](defaults.css), as `--bst-d-*`, each with a light and a dark value in one `light-dark()`. Every text and background pair clears 4.5:1 in both themes; [contrast.node.test.ts](contrast.node.test.ts) measures them from that file.

## The files

| File                           | What                                                                                                                  |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| [index.css](index.css)         | The engine's stylesheet: the order below, and the folders Tailwind scans                                              |
| [theme.css](theme.css)         | `@theme inline`: the table above. Each class reads its variable where it is used                                      |
| [defaults.css](defaults.css)   | The built-in light and dark values                                                                                    |
| [scheme.css](scheme.css)       | `light`, `dark`, `auto`: sets `color-scheme`, which picks a side of every `light-dark()`                              |
| [reset.css](reset.css)         | Tailwind's preflight under `.builderset`, written by `tooling/scope-preflight.mjs`                                    |
| [base.css](base.css)           | Before the utilities: motion constants, the focus ring, the disabled surface, scrollbars                              |
| [keyframes.css](keyframes.css) | `bst-fade-in`, `bst-zoom-in`, `bst-rise` and the rest the classes name                                                |
| [rules.css](rules.css)         | After the utilities: the focus glow (`.bld-focus`), the invalid field (`.bld-invalid`), overlay bands, reduced motion |
| [panel.css](panel.css)         | After the utilities: the dense side panels (`.bld-panel`)                                                             |

Nothing is in a `@layer`, so a page's own layers cannot reorder this file, and every selector is inside `.builderset`, so nothing reaches the page around the editor.
