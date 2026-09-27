# @motors/builder-react

The article builder's editor: a full-screen workspace that edits a
`@motors/builder-core` document and renders it through `@motors/builder-render`,
so the canvas looks exactly like the published page.

```tsx
import { createStandardRegistry } from '@motors/builder-core';
import { BuilderEditor } from '@motors/builder-react';

<BuilderEditor
  document={doc}
  registry={createStandardRegistry()}
  host={host} // BuilderHost — uploads, saving, publishing, revisions
  article={facts} // the row's own columns: slug, status, category, featured…
  onArticleChange={(patch) => setFacts((f) => ({ ...f, ...patch }))}
  onBack={() => router.push('/content/articles')}
  storageKey={`article-builder:${uuid}`} // crash-safety copy in localStorage
/>;
```

The host app must render it inside `<I18nProvider>` (from `@motors/i18n/react`),
because the shared `@motors/ui` controls read their words from there. It must
also add the package to Tailwind's sources:
`@source '…/packages/builder-react/src';`

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
  - With nothing selected: **Document settings** (General, SEO with a snippet
    preview and length meters, Publishing).
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

Drag and drop uses native HTML drag events rather than a DnD library. The
canvas already knows where every block is (the overlay measures them), and
keyboard moves go through `Alt+↑/↓`.
