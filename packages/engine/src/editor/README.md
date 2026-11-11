# @motors/engine/editor

The workspace every builder shares: a full-screen editor for any
`EngineDocument`. A kit supplies an `EditorProfile` — how the canvas draws
the document, its settings panel, what blocks publishing, its categories —
and wraps the workspace in its own component: `ArticleEditor` in
`@motors/article/editor`, `EmailEditor` in `@motors/email/editor`. The article
kit draws its canvas with the public site's renderer, so the canvas looks
exactly like the published page.

```tsx
import { ArticleEditor } from '@motors/article/editor';

<ArticleEditor
  document={doc}
  host={host} // BuilderHost — uploads, saving, publishing, revisions
  record={facts} // the row's own columns: slug, status, category, featured…
  onRecordChange={(patch) => setFacts((f) => ({ ...f, ...patch }))}
  onBack={() => router.push('/content/articles')}
  storageKey={`article-builder:${uuid}`} // crash-safety copy in localStorage
/>;
```

The editor needs no provider around it: its words come from `EditorMessages`
(the `locale` of the host adapter), and its controls from its own UI kit. The
host app must add the package to Tailwind's sources:
`@source '…/packages/engine/src/editor';`

## What is in it

- **Top bar**: back (guards unsaved work), title and status, undo and redo
  (the tooltips name the step), device preview, zoom, save state, history,
  preview, and Publish / Update with a menu (save draft, schedule, unpublish,
  duplicate, delete).
- **Left rail**:
  - **Add**: search, categories, recently used; click to insert or drag onto
    the canvas.
  - **Layers**: tree view with rename, hide, lock, and drag to reorder or
    reparent.
  - **Templates**: starting layouts and saved sections.
- **Canvas**:
  - Click to select, Shift or Ctrl-click to multi-select.
  - Hover outlines and a block toolbar (drag handle, move, duplicate, select
    parent, turn into, hide, lock, delete) with a "+" to insert after.
  - Drag and drop with a live drop indicator; placement rules are enforced.
  - Inline rich-text editing (TipTap) with a formatting bar and links.
  - Enter splits a block and Backspace merges.
  - Markdown shortcuts (`## `, `- `, `1. `, `[] `, `> `, `---`) and a `/`
    insert menu.
- **Inspector**:
  - **Content**, generated from each element's schema, so every prop of every
    element can be edited and nothing can be edited into an invalid state.
  - **Style**, per screen size with desktop → tablet → mobile inheritance.
  - **Advanced**: name, anchor, turn into, hidden, locked.
  - With nothing selected: the kit's settings panel (the article's General,
    SEO with a snippet preview and length meters, Publishing).
- **Status bar**: word count, reading time, and live issues with "Show"
  buttons. Errors block publishing.
- **Saving**:
  - Autosave 2 s after the last change and when the tab is hidden, with a
    retry on failure.
  - A localStorage copy of unsaved work, offered back on reopen.
  - A leave guard (`beforeunload` plus an in-app confirm).
  - A conflict dialog: keep mine or load theirs.
- **Shortcuts**: `?` lists them.

## Libraries

- **zustand**: the editor store, with per-slice subscriptions.
- **TipTap**, core extensions only: inline editing. The stored format is ours
  (`RichText` runs); `text/convert.ts` is the only place TipTap JSON exists.
- **motion**: panel, toolbar and indicator animations.
- **zod**: `z.toJSONSchema` turns an element's schema into its inspector.
- **Radix UI** under the editor's own kit, `src/editor/ui` (`@motors/engine/ui`):
  buttons, fields, toggles, tabs, menus, popovers, tooltips, dialogs and
  sheets, copied from MotorsAL's `@motors/ui` and now separate from it. The
  kits use it too. Everything that floats is portalled into an element the
  editor renders (`data-builderset-portal`), not into `<body>`.

Drag and drop uses native HTML drag events rather than a DnD library. The
canvas already knows where every block is (the overlay measures them), and
keyboard moves go through `Alt+↑/↓`.
