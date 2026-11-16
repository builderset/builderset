# 04 — The editor's own UI kit

## Goal

The engine has its own small set of UI components. No builder package imports `@motors/ui`, `@motors/i18n`, `@motors/utils` or `next`. The editors look the same.

## Why

This is the largest tie to MotorsAL. The editors are built from the admin's design system:

- 40 names from `@motors/ui`, imported in 19 files (16 in the workspace, 3 in the email editor).
- `@motors/ui` depends on `@motors/i18n`, `@motors/query`, `@motors/notifications`, `@motors/tokens` and `@motors/utils`, and has `next` as a peer dependency ([packages/ui/package.json](../../../packages/ui/package.json)).
- Five of the components the editors use read their words from the admin's translation provider (`useT` from `@motors/i18n/react`): the date picker, the time picker, the sheet, the confirm dialog and the empty state. That is why [the workspace's README](../../../packages/builder-react/README.md) says the host "must render it inside `<I18nProvider>`".

A package that needs MotorsAL's design system, translation provider and Next.js cannot be installed anywhere else.

## Before you start

- Step 02 is merged. This step does not depend on step 03 and can run beside it; if both are open, this one touches `src/editor/**` and `packages/email/src/editor/**` only.
- A full set of screenshots: every menu, dialog, panel and field type, light and dark. This step is judged by comparing them.

## What is used today

| Family           | Names                                                                                                                          | Built on (Radix)                                            |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| Plain controls   | `Button`, `Input`, `Textarea`, `Label`, `Badge`, `Spinner`, `Progress`                                                         | `react-slot`, `react-label`                                 |
| Toggles          | `Switch`, `SegmentedControl`, `ToggleFlag`                                                                                     | `react-switch`, `react-toggle-group` or `react-radio-group` |
| Select           | `Select`                                                                                                                       | `react-select`                                              |
| Tabs             | `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`                                                                               | `react-tabs`                                                |
| Menus            | `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuLabel`, `DropdownMenuSeparator` | `react-dropdown-menu`                                       |
| Popover, tooltip | `Popover`, `PopoverTrigger`, `PopoverContent`, `Tooltip`, `TooltipProvider`                                                    | `react-popover`, `react-tooltip`                            |
| Dialogs          | `Overlay`, `OverlayHeader`, `OverlayTitle`, `OverlayDescription`, `OverlayBody`, `OverlayFooter`, `ConfirmDialog`              | `react-dialog`                                              |
| Side sheets      | `Sheet`, `DrawerPanel`                                                                                                         | `react-dialog`                                              |
| Date and time    | `DatePicker`, `TimePicker`                                                                                                     | `react-popover`                                             |
| Empty state      | `EmptyState`                                                                                                                   | —                                                           |
| Helpers          | `barButtonClass`, `useMediaQuery`                                                                                              | —                                                           |

Find where each lives with `git grep -n "export function Button\b" packages/ui/src` (and so on); they are under `packages/ui/src/primitives`, `overlays`, `feedback` and `layout`.

## The work

### 1. Create the kit's folder

```
packages/engine/src/editor/ui/
├── index.ts            the names the rest of the editor imports
├── button.tsx
├── input.tsx           Input, Textarea, Label
├── toggles.tsx         Switch, SegmentedControl, ToggleFlag
├── select.tsx
├── tabs.tsx
├── menu.tsx            DropdownMenu and its parts
├── popover.tsx         Popover, Tooltip
├── dialog.tsx          Overlay and its parts, ConfirmDialog
├── sheet.tsx           Sheet, DrawerPanel
├── date-time.tsx       DateField, TimeField
├── feedback.tsx        Badge, Spinner, Progress, EmptyState
├── portal.tsx          PortalProvider, usePortalContainer
└── use-media-query.ts
```

Add an entry to the engine's manifest so the kits can use it: `"./ui": "./src/editor/ui/index.ts"`.

Add the Radix packages the table names to `packages/engine/package.json`, at exactly the versions [packages/ui/package.json](../../../packages/ui/package.json) uses, plus `class-variance-authority` if the copied components use it.

### 2. Copy, then cut the ties

**Copy each component's file from `packages/ui/src`; do not rewrite it.** A rewrite changes spacing, focus behaviour and keyboard handling in ways that are found weeks later. A copy with its imports changed looks the same on the first try.

For each copied file, change four things:

| The file imports                                                 | Replace with                                                                                                                                                                                                          |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cn` from `@motors/utils`                                        | The engine's own `cn` ([builder-react/src/cn.ts](../../../packages/builder-react/src/cn.ts) already exists)                                                                                                           |
| `useT`, `useFormat` from `@motors/i18n/react`                    | The editor's `useMessages()` ([context.tsx](../../../packages/builder-react/src/context.tsx)). Add the words the component needs to `EditorMessages`: `close`, `cancel`, `confirm`, and so on, in all three languages |
| Anything from `next/*`, `@motors/query`, `@motors/notifications` | Remove. The editor shows toasts through `host.toast` and needs none of these                                                                                                                                          |
| Another `@motors/ui` component                                   | The copy in this folder                                                                                                                                                                                               |

Keep every `data-slot="…"` attribute. The side panels' dense layout is written against them ([chrome/panel-css.ts](../../../packages/builder-react/src/chrome/panel-css.ts): `.bld-panel [data-slot=button]`, `[data-slot=tabs-content]`, …).

Keep the class names exactly. They use MotorsAL's token names (`bg-card`, `text-muted-foreground`, `border-border`, `rounded-[var(--radius-control)]`). Step 10 maps them to the product's variables; this step must not touch them.

### 3. Replace in this order — one pull request each

| Part | Replace                                                        | Used in                                                             | Risk      |
| ---- | -------------------------------------------------------------- | ------------------------------------------------------------------- | --------- |
| a    | Plain controls, toggles, helpers                               | Nearly every file                                                   | Low       |
| b    | Tabs, tooltip, popover, menus, select                          | Top bar, inspector, insert menu, settings panels                    | Medium    |
| c    | Dialogs, sheets, confirm, empty state                          | History sheet, conflict dialog, HTML import, templates, side drawer | Medium    |
| d    | Date and time                                                  | The schedule dialog (two files)                                     | See below |
| e    | Remove the dependencies, add the lint rule, update the READMEs | —                                                                   | Low       |

In each part: copy the components, switch the imports in the files that use them from `@motors/ui` to `./ui` (or `@motors/engine/ui` from the email and article kits), run the tests, compare the screenshots.

**Part d — date and time.** `DatePicker` and `TimePicker` are the heaviest components in the list and the most tied to the admin's translations. They are used only where a writer schedules publishing. Replace them with styled native inputs:

```tsx
/** A date and a time. The browser draws the picker, in the reader's own language. */
export function DateTimeField({ value, onChange, min, ...rest }: DateTimeFieldProps) {
  return (
    <Input
      type="datetime-local"
      value={toLocalInput(value)}
      min={min ? toLocalInput(min) : undefined}
      onChange={(event) => onChange(fromLocalInput(event.target.value))}
      {...rest}
    />
  );
}
```

It is a few dozen lines, has no words to translate and is accessible by default. A custom picker can come back later as a feature if anyone asks; it should not block the extraction.

### 4. Add the portal container

Menus, popovers, tooltips and dialogs render into `<body>` by default. Step 10 needs them inside an element the editor controls, so that the theme reaches them. Build the mechanism now, while every one of these components is open:

```tsx
// ui/portal.tsx
const PortalContext = createContext<HTMLElement | null>(null);

/** Rendered once by <BuilderEditor>. Everything that floats is portalled into its element. */
export function PortalProvider({ children }: { children: ReactNode }) {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  return (
    <PortalContext.Provider value={container}>
      {children}
      <div ref={setContainer} data-builderset-portal="" />
    </PortalContext.Provider>
  );
}

export const usePortalContainer = () => useContext(PortalContext);
```

Every `…Portal` in the kit passes `container={usePortalContainer()}`. In this step the container is an empty `<div>` at the end of the editor; nothing looks different.

### 5. Remove the dependencies and guard the door

- Delete `@motors/ui`, `@motors/i18n` and `@motors/utils` from the `dependencies` of `packages/engine`, `packages/article` and `packages/email`.
- Remove the `I18nProvider` wrapper from the editor tests (`editor.test.tsx` in the workspace and in the email editor). **The tests passing without it is the proof this step worked.**
- Remove the "must render it inside `<I18nProvider>`" paragraph from the workspace's README.
- Extend the import rule from step 03:

| Files                                                            | May not import                                                                                                              |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `packages/engine/**`, `packages/article/**`, `packages/email/**` | `@motors/ui`, `@motors/i18n`, `@motors/utils`, `@motors/tokens`, `@motors/query`, `@motors/notifications`, `next`, `next/*` |

The admin still wraps its pages in `I18nProvider` for its own screens. Nothing changes there.

## Check

```bash
pnpm lint && pnpm typecheck && pnpm test
git grep -nE "from '(@motors/(ui|i18n|utils|tokens|query|notifications)|next)" -- packages/engine packages/article packages/email   # nothing
pnpm --filter @motors/admin build
```

On screen, compare against the screenshots, light and dark:

| Where           | Look at                                                                                                                              |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Top bar         | Every button and tooltip; the publish menu; the device and zoom controls; the save state                                             |
| Schedule dialog | The date and time field; choosing a time in the past is refused                                                                      |
| Left rail       | Add (search, categories), layers (rename, hide, lock), templates (empty state, saved sections)                                       |
| Inspector       | Content, Style and Advanced tabs; every field type: text, number, select, switch, segmented, colour, spacing, font, media, rich text |
| Canvas          | The block toolbar and its menu; the `/` insert menu; the text formatting bar and its link popover                                    |
| Dialogs         | History sheet; conflict dialog; leave guard; delete confirmation; shortcuts list                                                     |
| Email editor    | Settings panel; modules panel; HTML import dialog; variables menu                                                                    |
| Keyboard        | Tab order, Escape closes the top-most layer, focus returns to the button that opened it                                              |

## Done when

- [x] `packages/engine/src/editor/ui/` holds every component in the table above (the date and time pickers as one `DateTimeField`).
- [x] No file in the three packages imports `@motors/ui`, `@motors/i18n`, `@motors/utils`, `@motors/tokens` or `next`.
- [x] The three packages' manifests do not list them.
- [x] The editor tests pass with no `I18nProvider`.
- [x] The lint rule forbids those imports and was seen to fail on one.
- [x] Every floating element renders inside the editor's portal container.
- [x] The screenshots match, light and dark, apart from the date and time field. (Compared at milestone M1, 2026-11-11: 52 screens of both editors, from before step 02 and after step 07, differ only where steps 05 and 06 meant them to — [ROADMAP.md](../ROADMAP.md). The rendered DOM had been compared at the time of this step; see below.)

## Traps

- **Rewriting "while I am here".** The fastest way to lose a week. Copy, cut imports, compare.
- **A component that pulls half the library.** If a copied file imports something not in the table (a command palette, a data table), the editor is using more than it needs. Replace that use with a smaller component from the table; do not copy the dependency.
- **Words left in English.** When `useT('common.close')` becomes `messages.close`, the word must be added in `sq` and `de` too. Step 05 adds a test for this; until then, switch the admin to each language and open every dialog.
- **Two copies of Radix.** If the engine's Radix versions differ from the admin's, a dialog opened from the admin and a menu inside the editor fight over focus and scroll lock. Use the admin's exact versions until MotorsAL has left the workspace (step 14).
- **`panel-css.ts` selectors.** They target `data-slot` values and Tailwind class names such as `.text-sm` and `.space-y-4`. A component copied without its `data-slot` loses its compact size inside the panels.
- **`@motors/ui` changes after the copy.** From this step the editor's kit is its own code. A fix made in `@motors/ui` later does not reach it, and should not: the two will drift apart on purpose.

## How it was done (2026-11-11)

Five commits on the `builderset` branch, one per part (a–e). Where the work differed from the parts above:

| Part | What the plan said                                                            | What was done                                                                                                                                                                                                                                                                                                                                                                                                                                         | Why                                                                                                                                                                                                                                                                                                                                            |
| ---- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | New file names (`toggles.tsx`, `popover.tsx`, `dialog.tsx`, `feedback.tsx` …) | The copies keep `@motors/ui`'s file names (`button.tsx`, `popover.tsx`, `overlay.tsx`, `states.tsx`, `misc.tsx` …)                                                                                                                                                                                                                                                                                                                                    | A `diff` against the source stays readable while the two are still side by side                                                                                                                                                                                                                                                                |
| 2    | Copy each file                                                                | Whole components the editor does not use are left out where they would pull in more: `Separator`, `Avatar` (`misc.tsx`), `Checkbox`, `RadioGroup` (`toggles.tsx`), `ErrorState`, `TableSkeleton`, `LoadingPanel` (`states.tsx`)                                                                                                                                                                                                                       | The trap "a component that pulls half the library": four Radix packages fewer                                                                                                                                                                                                                                                                  |
| 2    | Add the words to `EditorMessages`                                             | `close`, `cancel` and `confirm` were already there; `somethingWentWrong`, `noResults` and `noResultsHint` are new, with the admin's exact texts in sq, en and de                                                                                                                                                                                                                                                                                      | —                                                                                                                                                                                                                                                                                                                                              |
| 3d   | `DateTimeField`                                                               | As planned, in `ui/date-time.tsx`, with a test. It also mends a mismatch: the old date and time pair split an instant into its UTC date and its local time                                                                                                                                                                                                                                                                                            | —                                                                                                                                                                                                                                                                                                                                              |
| —    | Screenshots before and after each part                                        | The rendered DOM of both editors was compared before and after each part instead. A throwaway jsdom script opened the editors and took 33 snapshots of `document.body`: blocks inserted, every inspector tab, the document settings tabs, the publish menu, the schedule dialog, the left rail tabs, the zoom menu, the shortcuts, and the email editor's settings tabs and modules panel. With the CSS unchanged, the same DOM means the same screen | No database-backed admin was run for screenshots. The only differences were the expected ones: the portal container, the two pickers becoming native fields, and run-to-run noise (the clock, the autosave state, an animation caught midway). The HTML import dialog, the history sheet and the conflict dialog were not opened by the script |

The Radix packages are added at `@motors/ui`'s exact version ranges, so the lockfile resolves no second copy.
