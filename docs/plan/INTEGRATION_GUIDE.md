# Integration guide

For a developer adding a builder to their own project: what to set up in the frontend, what to build in the backend, and exactly which fields to store.

> **This describes the product as it will be.** The names (`@builderset/email`, `createRestHost`, the `theme` prop) are the target API from [BLUEPRINT.md](BLUEPRINT.md). The table shapes, the document format, the host methods and the limits are today's, taken from MotorsAL's working code. When the docs site exists ([step 16](steps/16_DOCS_SITE_AND_PLAYGROUND.md)) this file moves there.

## Contents

1. [What you build](#1-what-you-build)
2. [Frontend](#2-frontend)
3. [What to store](#3-what-to-store)
4. [The routes](#4-the-routes)
5. [Validation](#5-validation)
6. [Sending an email](#6-sending-an-email)
7. [Showing an article](#7-showing-an-article)
8. [Permissions and tenants](#8-permissions-and-tenants)
9. [Upgrading](#9-upgrading)
10. [Checklists](#10-checklists)
11. [Questions](#11-questions)

---

## 1. What you build

Three things. The package supplies the rest.

| You build                          | Size                                                                          | The package supplies                                        |
| ---------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------- |
| **One page** that shows the editor | About 40 lines                                                                | The whole editor                                            |
| **A host adapter**                 | 20 lines with the helper; about 150 by hand                                   | The interface, a REST helper, an in-memory helper for demos |
| **A table and a few routes**       | One table, 3 routes at the least; 3 tables and about 10 routes for everything | The document format, validation, rendering                  |

```
Your back office                    Your server                          Your database / storage
────────────────                    ───────────                          ───────────────────────
<EmailEditor host={host} />
        │  host.save(document)
        ├───────────────────────►   PUT  /emails/42/draft                email_template.draft_document
        │  host.upload(file)
        ├───────────────────────►   POST /uploads                        S3 / MinIO / disk
        │  host.publish(document)
        └───────────────────────►   POST /emails/42/publish              email_template.document

                                    renderEmail(document, { data })  ──► your mail provider
```

The editor never calls a URL by itself. Everything it needs from outside goes through the adapter you give it.

---

## 2. Frontend

### 2.1 Install

| You need            | Install                     |
| ------------------- | --------------------------- |
| The email builder   | `npm i @builderset/email`   |
| The article builder | `npm i @builderset/article` |
| Everything          | `npm i builderset`          |

Requirements: React 19, a bundler that reads `exports` (Next.js, Vite, and every current one), a browser from 2024 or later. **No Tailwind is needed.**

### 2.2 The stylesheet

Import one file, once, where the editor is rendered.

```ts
import '@builderset/email/styles.css'; // the email editor
import '@builderset/article/styles.css'; // the article editor
import '@builderset/article/content.css'; // only a rendered article, on your site
```

It cannot change your own pages: every class is prefixed, and it contains no global reset.

### 2.3 The editor page

**Next.js, App Router.** The page loads the row on the server; a client component shows the editor.

```tsx
// app/admin/emails/[id]/edit/page.tsx — Server Component
import { notFound } from 'next/navigation';

import { TemplateEditor } from './template-editor';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const template = await loadTemplate(id); // your own data access; check the permission here
  if (!template) notFound();
  return <TemplateEditor template={template} brand={await loadBrand()} />;
}
```

```tsx
// app/admin/emails/[id]/edit/template-editor.tsx
'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';

import { createRestHost } from '@builderset/email/host';
import '@builderset/email/styles.css';

// The editor uses the browser's selection and storage, and is large. Load it in the browser only.
const EmailEditor = dynamic(() => import('@builderset/email/editor').then((m) => m.EmailEditor), {
  ssr: false,
  loading: () => <p>Loading the editor…</p>,
});

export function TemplateEditor({ template, brand }: Props) {
  const router = useRouter();
  const host = useMemo(
    () =>
      createRestHost({
        baseUrl: `/api/emails/${template.id}`,
        uploadUrl: '/api/uploads',
        resolveMedia: (key) => `${process.env.NEXT_PUBLIC_MEDIA_URL}/${key}`,
        toast: (kind, message) => showToast(kind, message),
      }),
    [template.id],
  );

  return (
    <div style={{ height: '100dvh' }}>
      <EmailEditor
        document={template.draft_document ?? template.document}
        host={host}
        brand={brand}
        variables={template.variables}
        record={{ status: template.status, scheduledAt: null, publishedAt: template.published_at }}
        savedAt={template.draft_saved_at ?? template.updated_at}
        storageKey={`email:${template.id}`}
        theme="auto"
        onBack={() => router.push('/admin/emails')}
      />
    </div>
  );
}
```

**Vite or any other React app.** The same component without `next/dynamic`; use `React.lazy` to load the editor only on its route.

Three rules for the page:

| Rule                                                               | Why                                                                                 |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Give the editor a container with a height                          | It fills its container. A container with no height gives an editor zero pixels tall |
| Do not put it inside an element with a CSS `transform` or `filter` | Its menus are positioned from the viewport; a transformed ancestor moves them       |
| Give it its own route, outside your usual page layout              | It is a full-screen workspace with its own top bar                                  |

### 2.4 The props

| Prop                      | Needed | What to pass                                                                                                    |
| ------------------------- | ------ | --------------------------------------------------------------------------------------------------------------- |
| `document`                | yes    | The stored JSON: the draft if there is one, otherwise the live document. For a new row, `createEmailDocument()` |
| `host`                    | yes    | The adapter ([2.7](#27-the-host-adapter))                                                                       |
| `onBack`                  | yes    | Where the back button goes. The editor asks about unsaved work first                                            |
| `record`                  | no     | `{ status, scheduledAt, publishedAt }` from your row, for the top bar                                           |
| `onRecordChange`          | no     | Called when the writer changes one of them                                                                      |
| `savedAt`                 | no     | When your server last saved the document. A newer crash-safety copy in the browser is offered back              |
| `storageKey`              | no     | A unique key per document. With it, unsaved work survives a crashed tab                                         |
| `theme`                   | no     | `'light'` (default), `'dark'`, `'auto'`                                                                         |
| `tokens`                  | no     | Theme values from JavaScript                                                                                    |
| `locale`                  | no     | The editor's own language. Default `'en'`; `'auto'` follows `<html lang>`                                       |
| `locales`                 | no     | Other languages you imported                                                                                    |
| `messages`                | no     | Single strings to replace                                                                                       |
| `contentLocales`          | no     | The languages a document can be written in. Default: one                                                        |
| `elements`                | no     | Your own block types                                                                                            |
| `onDuplicate`, `onDelete` | no     | Shown in the publish menu when passed                                                                           |

Email only: `brand` and `variables` ([2.8](#28-email-brand-variables-fonts)). Article only: `siteUrl`, `settingsSections` ([2.9](#29-article-settings-and-rendering)).

### 2.5 Theme

Pick one. Details in [BLUEPRINT.md §9](BLUEPRINT.md#9-look-deriving-the-theme-from-the-parent).

| Your project                                                     | Do this                                                           |
| ---------------------------------------------------------------- | ----------------------------------------------------------------- |
| No design system, or you are just trying it                      | Nothing. Light theme, built-in look                               |
| shadcn/ui or the same token names (`--background`, `--primary`…) | `import '@builderset/engine/theme/shadcn.css'` and `theme="auto"` |
| Your own tokens                                                  | Map them once in your CSS (below) and `theme="auto"`              |
| The theme comes from JavaScript (a tenant's brand)               | `tokens={{ primary: tenant.color }}`                              |

```css
.builderset {
  --builderset-background: var(--my-page);
  --builderset-surface: var(--my-panel);
  --builderset-foreground: var(--my-text);
  --builderset-border: var(--my-line);
  --builderset-primary: var(--my-brand);
  --builderset-primary-foreground: var(--my-on-brand);
  --builderset-radius: 8px;
  --builderset-font: var(--my-font);
}
```

Dark mode: `theme="auto"` follows a `dark` class or `data-theme="dark"` on any ancestor, and the operating system when there is neither. If your project marks dark mode another way, pass `theme={isDark ? 'dark' : 'light'}`.

### 2.6 Language

```tsx
// One language, English: nothing to do.
<EmailEditor … />

// The editor in your user's language.
import de from '@builderset/email/locales/de';
import sq from '@builderset/email/locales/sq';

<EmailEditor locale={user.locale} locales={{ sq, de }} … />

// Documents written in several languages.
<EmailEditor contentLocales={['en', 'de', 'sq']} … />
```

The first is the language of the buttons and menus. The second is which languages a template or article itself is written in; with more than one, the editor shows a language switch, and the document stores the extra words beside its tree ([3.6](#36-what-a-document-looks-like)).

### 2.7 The host adapter

Every method, when the editor calls it, and what to return. Only four are required; the editor hides the feature of any optional one you leave out.

| Method                                          | Needed | Called when                                                                                                          | Return                                                                                        |
| ----------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `save(document, reason, { force })`             | yes    | 2 seconds after the last change (`'autosave'`); when the tab is hidden; when the writer saves a version (`'manual'`) | `{ ok: true, savedAt }` · `{ ok: false, conflict: true, message }` · `{ ok: false, message }` |
| `upload(file, kind, onProgress, signal)`        | yes    | An image, video, audio or file is added. `kind` is one of those four                                                 | `{ key, url, width?, height?, mime?, size?, name? }`                                          |
| `resolveMedia(key)`                             | yes    | The canvas shows a stored file                                                                                       | A URL. Not async: build it from the key                                                       |
| `toast(kind, message)`                          | yes    | The editor has something to tell the writer                                                                          | Nothing. Show it with your own toasts                                                         |
| `reload()`                                      | no     | The writer chooses "load theirs" after a conflict                                                                    | The server's current document                                                                 |
| `publish(document, scheduledAt)`                | no     | Publish, update, or schedule                                                                                         | As `save`                                                                                     |
| `unpublish()`                                   | no     | Unpublish                                                                                                            | As `save`                                                                                     |
| `loadRevisions()`                               | no     | The history panel opens                                                                                              | `[{ id, kind, label, createdAt, author }]`                                                    |
| `loadRevision(id)`                              | no     | A revision is previewed or restored                                                                                  | That document                                                                                 |
| `saveRevision(document, label)`                 | no     | The writer names a version                                                                                           | `true` when stored                                                                            |
| `loadSections()`, `saveSection(name, fragment)` | no     | The templates panel; "save as section"                                                                               | `[{ id, name, fragment }]`; the stored section                                                |
| `previewUrl(document, locale)`                  | no     | Preview                                                                                                              | A URL that shows this document                                                                |
| `oembed(url)`                                   | no     | A link is pasted into an embed block                                                                                 | `{ provider, title, thumbnail }` or `null`                                                    |
| `importImage(url)`                              | no     | An existing email's HTML is imported and its images must be copied                                                   | As `upload`                                                                                   |

How `save` must behave:

- **`'autosave'`** writes the draft only.
- **`'manual'`** writes the draft and records a revision the writer can find again.
- **Never throw.** A failed request returns `{ ok: false, message }`; the editor shows "could not save" and retries after 8 seconds.
- **A conflict** — someone else saved since this editor loaded — returns `{ ok: false, conflict: true }`. The editor asks the writer: keep mine (it calls `save` again with `force: true`) or load theirs (`reload`).

**With the helper**, if your API follows the routes in [section 4](#4-the-routes):

```ts
import { createRestHost } from '@builderset/email/host';

const host = createRestHost({
  baseUrl: `/api/emails/${id}`,
  headers: () => ({ Authorization: `Bearer ${token}` }),
  uploadUrl: '/api/uploads',
  resolveMedia: (key) => `https://cdn.example.com/${key}`,
  toast,
});
```

**By hand**, the required four:

```ts
import type { BuilderHost, EmailDocument } from '@builderset/email';

export function createHost(id: string, initialSavedAt: string | null): BuilderHost<EmailDocument> {
  let lastSavedAt = initialSavedAt;

  return {
    async save(document, reason, options) {
      try {
        const response = await fetch(`/api/emails/${id}/draft`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            document,
            reason,
            expected_saved_at: options?.force ? null : lastSavedAt,
          }),
        });
        if (response.status === 409)
          return { ok: false, conflict: true, message: 'Changed by someone else.' };
        if (!response.ok) return { ok: false, message: 'Could not save.' };
        const { saved_at } = await response.json();
        lastSavedAt = saved_at;
        return { ok: true, savedAt: saved_at };
      } catch {
        return { ok: false, message: 'You are offline.' };
      }
    },

    async upload(file, kind, onProgress, signal) {
      const body = new FormData();
      body.append('file', file);
      body.append('kind', kind);
      const response = await fetch('/api/uploads', { method: 'POST', body, signal });
      if (!response.ok) throw new Error('Upload failed.');
      onProgress(1);
      return response.json(); // { key, url, width, height, mime, size, name }
    },

    resolveMedia: (key) => `https://cdn.example.com/${key}`,

    toast: (kind, message) => showToast(kind, message),
  };
}
```

**For a demo or a test**, no backend at all:

```ts
import { createMemoryHost } from '@builderset/email/host';

const host = createMemoryHost();
```

### 2.8 Email: brand, variables, fonts

**Brand.** A mail client cannot read your CSS, so an email is painted with real values. A document stores names (`brand.primary`), and the brand supplies the values — change the brand once and every template follows.

```ts
const brand: BrandKit = {
  name: 'Acme',
  website: 'https://acme.example',
  address: 'Street 1, City', // shown in the footer; many countries require it in marketing email
  logo: { key: 'brand/logo.png', width: 240, height: 64 },
  logoDark: null,
  colors: {
    primary: '#111827',
    secondary: '#374151',
    accent: '#2563eb',
    text: '#1f2937',
    muted: '#6b7280',
    background: '#f4f4f5',
    surface: '#ffffff',
    border: '#e5e7eb',
  },
  font: 'system',
  social: [{ network: 'instagram', href: 'https://instagram.com/acme' }],
};
```

Store it as one JSON value ([3.4](#34-shared-tables)). Pass the same object to the editor and to `renderEmail`.

**Variables.** What a writer may insert as `{{ … }}`. Each kind of email you send declares its own.

```ts
const variables: VariableSpec[] = [
  {
    name: 'recipient',
    label: { en: 'Recipient' },
    type: 'string',
    children: [
      { name: 'name', label: { en: 'Name' }, type: 'string', example: 'Ana' },
      { name: 'email', label: { en: 'Email' }, type: 'email', example: 'ana@example.com' },
    ],
  },
  {
    name: 'order',
    label: { en: 'Order' },
    type: 'string',
    children: [
      { name: 'total', label: { en: 'Total' }, type: 'money', example: 120 },
      { name: 'date', label: { en: 'Date' }, type: 'date', example: '2026-03-01' },
      {
        name: 'items',
        label: { en: 'Items' },
        type: 'list',
        fields: [
          { name: 'title', label: { en: 'Title' }, type: 'string', example: 'Brake pads' },
          { name: 'price', label: { en: 'Price' }, type: 'money', example: 60 },
        ],
      },
    ],
  },
];
```

| Part          | Values                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------ |
| Types         | `string`, `url`, `email`, `date`, `datetime`, `money`, `number`, `boolean`, `list`         |
| In a template | `{{ recipient.name }}`, `{{ order.total \| money }}`                                       |
| Formats       | `date`, `date_long`, `time`, `datetime`, `money`, `number`, `upper`, `lower`, `capitalize` |

There is no expression language. A variable is a path, with an optional format from that list. The `example` values fill the preview in the editor.

Keep the list in code, next to the code that sends that email, so the data you pass at send time and the variables you offer cannot disagree.

**Fonts.** The editor offers web-safe fonts and web fonts with a safe fallback each. Web fonts load in the clients that support them; Gmail and Outlook show the fallback.

**Social icons.** The social block uses PNG files that must be at a public address. Copy the `icons/social` folder of the package to your site or CDN and pass that address as `socialIconBase`.

### 2.9 Article: settings and rendering

In the editor:

```tsx
<ArticleEditor
  document={article.draft_document ?? article.document}
  host={host}
  record={{
    status: article.status,
    scheduledAt: article.scheduled_at,
    publishedAt: article.published_at,
    slug: article.slug,
  }}
  onRecordChange={(patch) => updateRow(patch)}
  siteUrl="https://example.com/blog" // shown in the search-result preview
  settingsSections={[{ id: 'category', title: 'Category', render: () => <CategorySelect /> }]} // your own columns
  onBack={() => router.push('/admin/articles')}
/>
```

On the site: [section 7](#7-showing-an-article).

### 2.10 Your own block

```ts
// blocks/price-tag.ts — shared by the editor, the renderer and the server
import { defineElement, z } from '@builderset/engine';

export const priceTag = defineElement({
  type: 'price-tag',
  version: 1,
  category: 'plugin',
  icon: 'tag',
  schema: z.object({ amount: z.number().min(0), currency: z.string().length(3) }),
  defaults: () => ({ amount: 0, currency: 'EUR' }),
});
```

| Where        | Pass                                                                                   |
| ------------ | -------------------------------------------------------------------------------------- |
| The editor   | `elements={[priceTag]}` — its inspector is generated from the schema                   |
| The renderer | `elements={{ 'price-tag': PriceTagView }}` — your component                            |
| Your server  | `createArticleRegistry([priceTag])` when validating, or documents using it are refused |

---

## 3. What to store

### 3.1 The four rules

1. **Store the document as JSON, exactly as the editor gives it.** Do not reshape it, split it into rows, or strip fields you do not recognise.
2. **Never store HTML from the browser.** HTML is produced on your server from the document, when it is needed.
3. **Keep two copies: live and draft.** The live one is what readers get. The draft is what the writer is working on. Autosave must never change what readers see.
4. **Keep a timestamp for the draft** and send it back and forth. It is how two people editing the same document are noticed.

### 3.2 Email templates

| Column                     | Type            | Null | What it is                                                                                     |
| -------------------------- | --------------- | ---- | ---------------------------------------------------------------------------------------------- |
| `id`                       | integer or UUID | no   | The key                                                                                        |
| `name`                     | text, up to 120 | no   | The working name in your back office. Also in `document.meta.name`                             |
| `type_key`                 | text            | no   | Which email this is: `welcome`, `order_receipt`, `password_reset`. Your code sends by this key |
| `locale`                   | text            | no   | The language the template's tree is written in                                                 |
| `status`                   | text            | no   | `draft` or `published` (MotorsAL calls it `active`). Send only published templates             |
| `document`                 | JSON            | no   | **The live document.** Created with `createEmailDocument()`                                    |
| `draft_document`           | JSON            | yes  | **The working copy.** `null` means "no unpublished changes"                                    |
| `draft_saved_at`           | timestamp       | yes  | When the draft was last written. The conflict check compares it                                |
| `version`                  | integer         | no   | Counts publishes, from 1                                                                       |
| `published_at`             | timestamp       | yes  | When it last went live                                                                         |
| `created_at`, `updated_at` | timestamp       | no   |                                                                                                |
| `created_by`, `updated_by` | your user key   | yes  | For the history panel's author and for audit                                                   |
| `deleted_at`               | timestamp       | yes  | If you delete softly                                                                           |

A rule worth a unique index: at most one published template per `type_key` and `locale`. Sending is then a lookup, not a choice.

```sql
create table email_template (
  id              bigint generated always as identity primary key,
  name            varchar(120) not null,
  type_key        varchar(64)  not null,
  locale          varchar(10)  not null default 'en',
  status          varchar(16)  not null default 'draft' check (status in ('draft', 'published')),
  document        jsonb        not null,
  draft_document  jsonb,
  draft_saved_at  timestamptz,
  version         integer      not null default 1,
  published_at    timestamptz,
  created_at      timestamptz  not null default now(),
  updated_at      timestamptz  not null default now(),
  created_by      bigint,
  updated_by      bigint,
  deleted_at      timestamptz
);

create unique index email_template_one_live
  on email_template (type_key, locale)
  where status = 'published' and deleted_at is null;
```

### 3.3 Articles

The same columns for the document, plus the columns your site lists and searches by.

| Column                          | Type            | Null | What it is                                                                        |
| ------------------------------- | --------------- | ---- | --------------------------------------------------------------------------------- |
| `id`                            | integer or UUID | no   |                                                                                   |
| `slug`                          | text, up to 160 | no   | The address. Unique per language                                                  |
| `locale`                        | text            | no   | The language the article's tree is written in                                     |
| `status`                        | text            | no   | `draft`, `scheduled`, `published`, `archived`                                     |
| `document`                      | JSON            | yes  | **The live document.** `null` until first published                               |
| `draft_document`                | JSON            | yes  | **The working copy**, and the content waiting for a scheduled time                |
| `draft_saved_at`                | timestamp       | yes  | For the conflict check                                                            |
| `published_at`                  | timestamp       | yes  |                                                                                   |
| `scheduled_at`                  | timestamp       | yes  | When a scheduled article should go live. A job of yours publishes it at that time |
| `title`                         | text, up to 200 | no   | **A copy of `document.meta.title`**                                               |
| `excerpt`                       | text            | no   | **A copy of `document.meta.excerpt`**                                             |
| `cover_key`, `cover_alt`        | text            | yes  | **A copy of `document.meta.cover`**                                               |
| `reading_minutes`               | integer         | no   | Computed from the document on save                                                |
| your own                        |                 |      | Category, tags, author, featured — whatever your site needs                       |
| the timestamps and user columns |                 |      | As for email                                                                      |

**The copies.** Lists, search and cards read `title`, `excerpt` and the cover from columns, not from inside the JSON. Write them from `document.meta` in the same transaction on every save and every publish, so the two can never disagree. The document is the source; the columns are an index of it.

### 3.4 Shared tables

**Revisions** — one table per document table, or one for all with a type column.

| Column                       | Type                  | What it is                                |
| ---------------------------- | --------------------- | ----------------------------------------- |
| `id`                         |                       |                                           |
| `template_id` / `article_id` | foreign key           | Delete with its parent                    |
| `kind`                       | text                  | `autosave`, `manual`, `publish`           |
| `label`                      | text, up to 120, null | The name the writer gave a manual version |
| `document`                   | JSON                  | The whole document at that moment         |
| `created_at`, `created_by`   |                       | Shown in the history panel                |

Record a revision on every `manual` save and every publish. For autosaves, keep few — one every ten minutes, or the last twenty — or the table grows by a full document every two seconds of typing.

**Saved sections** — reusable pieces a writer saved.

| Column     | Type            | What it is                                                                |
| ---------- | --------------- | ------------------------------------------------------------------------- |
| `id`       |                 |                                                                           |
| `name`     | text, up to 120 |                                                                           |
| `fragment` | JSON            | A piece of a document: a few nodes and their root, as the editor gives it |
| `synced`   | boolean         | Email only: a change to the section changes every template that uses it   |

**Brand** — the email brand kit from [2.8](#28-email-brand-variables-fonts).

| Column     | Type | What it is                                 |
| ---------- | ---- | ------------------------------------------ |
| `key`      | text | `default`, or one per tenant or per sender |
| `settings` | JSON | The `BrandKit` object                      |

### 3.5 Files

The document never contains a file or a URL to one. It contains a **key** — a path in your storage — and a few facts about the file:

```json
{
  "key": "articles/42/cover.jpg",
  "width": 1600,
  "height": 900,
  "mime": "image/jpeg",
  "size": 184220,
  "name": "cover.jpg"
}
```

| Field                  | Limit                | Used for                                   |
| ---------------------- | -------------------- | ------------------------------------------ |
| `key`                  | up to 400 characters | Finding the file                           |
| `width`, `height`      | up to 20,000         | Reserving space, so the page does not jump |
| `mime`, `size`, `name` |                      | A download card                            |

Your `resolveMedia(key)` turns a key into a URL. Because the document holds keys, you can move storage or change CDN without touching a single document.

You decide the folders. A good rule: one folder per document (`emails/42/…`, `articles/42/…`), and the server refuses a document that names a key outside its own folder.

A table for uploads is optional. Add one if you want a media library, to find unused files, or to count storage per tenant: `key`, `mime`, `size`, `width`, `height`, `name`, `owner`, `created_at`.

### 3.6 What a document looks like

An email, shortened:

```json
{
  "schema": "email/document",
  "version": 1,
  "root": "root",
  "nodes": {
    "root": { "id": "root", "type": "root", "v": 1, "props": {}, "children": ["s1"] },
    "s1": {
      "id": "s1",
      "type": "section",
      "v": 1,
      "props": { "padding": { "top": 32, "bottom": 32 } },
      "children": ["r1"]
    },
    "r1": { "id": "r1", "type": "row", "v": 1, "props": { "layout": "1" }, "children": ["c1"] },
    "c1": { "id": "c1", "type": "column", "v": 1, "props": {}, "children": ["h1", "b1"] },
    "h1": {
      "id": "h1",
      "type": "heading",
      "v": 1,
      "props": {
        "level": 1,
        "text": [{ "text": "Welcome, " }, { "text": "", "var": { "path": "recipient.name" } }]
      }
    },
    "b1": {
      "id": "b1",
      "type": "button",
      "v": 1,
      "props": {
        "label": "Open your account",
        "href": "{{ account.url }}",
        "color": "brand.primary"
      }
    }
  },
  "meta": {
    "name": "Welcome",
    "subject": "Welcome to {{ brand.name }}",
    "preheader": "Your account is ready."
  },
  "settings": {
    "width": 600,
    "backdrop": "#f4f4f5",
    "background": "#ffffff",
    "font": "system",
    "fontSize": 16,
    "lineHeight": 1.6,
    "textColor": "brand.text",
    "headingColor": "brand.text",
    "linkColor": "brand.primary",
    "darkMode": "auto",
    "dark": {
      "backdrop": "#0b0c0e",
      "background": "#1a1c1f",
      "text": "#e6e8eb",
      "heading": "#ffffff",
      "link": "#6ea8fe"
    },
    "utm": { "enabled": false, "source": "", "medium": "email", "campaign": "" }
  },
  "i18n": {
    "enabled": true,
    "base": "en",
    "translations": {
      "de": {
        "meta": { "subject": "Willkommen bei {{ brand.name }}" },
        "nodes": { "b1": { "label": "Konto öffnen" } }
      }
    }
  }
}
```

The prop names inside each block are illustrative; the schema file is the reference. The structure is exact:

| Field      | What it is                                                                                                                     |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `schema`   | Which kind of document: `email/document`, `builder/document` (article)                                                         |
| `version`  | The format version. The package migrates older versions when it reads them                                                     |
| `root`     | The id of the top node                                                                                                         |
| `nodes`    | **A flat record**, by id. A container lists its children's ids in order. Not a nested tree                                     |
| a node     | `id`, `type`, `v` (the block's own version), `props`, and optionally `style`, `children`, `hidden`, `locked`, `name`, `anchor` |
| `meta`     | Email: `name`, `subject`, `preheader`. Article: `title`, `excerpt`, `cover`, `seo`, `readingMinutes`                           |
| `settings` | Email only: width, colours, font, dark mode, link tracking                                                                     |
| `i18n`     | Optional. `base` is the language of the tree; `translations` holds only the words that differ, by node id and prop path        |

You do not need to understand the inside to store it. You need to: keep it whole, validate it with the package, and read `meta` for your list columns.

### 3.7 Sizes

The article kit's limits today. The server enforces the same ones; a document over a limit is refused.

| Limit                       | Value         |
| --------------------------- | ------------- |
| Nodes in a document         | 1,000         |
| Nesting depth               | 8             |
| Document size as JSON       | 200,000 bytes |
| Characters in one rich text | 10,000        |
| A short text field          | 300           |
| A long text field           | 20,000        |
| List items                  | 40            |
| Table rows × columns        | 60 × 8        |
| Images in a gallery         | 24            |

So: a `jsonb` column is enough; set your request body limit a little above 200 kB for document routes; a revision row is at most that size.

---

## 4. The routes

The smallest backend is three routes: **save the draft**, **publish**, **upload**. Add the others when you want their feature.

| Route                                | For the host method           | Body                                      | Answer                                              |
| ------------------------------------ | ----------------------------- | ----------------------------------------- | --------------------------------------------------- |
| `GET    /emails/:id`                 | `reload`                      | —                                         | `{ document, draft_document, saved_at, status }`    |
| `PUT    /emails/:id/draft`           | `save`                        | `{ document, reason, expected_saved_at }` | `200 { saved_at }` · `409` · `422 { issues }`       |
| `POST   /emails/:id/publish`         | `publish`                     | `{ document, scheduled_at }`              | `200 { saved_at, status, published_at }` · `422`    |
| `POST   /emails/:id/unpublish`       | `unpublish`                   | —                                         | `200 { saved_at, status }`                          |
| `GET    /emails/:id/revisions`       | `loadRevisions`               | —                                         | `[{ id, kind, label, created_at, author }]`         |
| `GET    /emails/:id/revisions/:rid`  | `loadRevision`                | —                                         | `{ document }`                                      |
| `POST   /emails/:id/revisions`       | `saveRevision`                | `{ document, label }`                     | `201`                                               |
| `POST   /emails/:id/preview`         | `previewUrl`                  | `{ document, locale }`                    | `{ url }`                                           |
| `POST   /uploads`                    | `upload`                      | multipart: `file`, `kind`                 | `201 { key, url, width, height, mime, size, name }` |
| `POST   /uploads/import`             | `importImage`                 | `{ url }`                                 | as upload                                           |
| `GET    /sections`, `POST /sections` | `loadSections`, `saveSection` | `{ name, fragment }`                      | the sections                                        |
| `GET    /oembed?url=`                | `oembed`                      | —                                         | `{ provider, title, thumbnail }` or `204`           |

Your routes may look different. Then write the adapter by hand ([2.7](#27-the-host-adapter)); the helper is only a convenience.

### Save the draft

```
PUT /emails/:id/draft        { document, reason, expected_saved_at }

1. Check the user may edit this template.                              → 403
2. Load the row.                                                       → 404
3. If expected_saved_at is not null and differs from row.draft_saved_at → 409
4. Check the document, leniently (section 5).                          → 422 { issues }
5. In one transaction:
     row.draft_document = document
     row.draft_saved_at = now
     if reason = 'manual': insert a revision (kind 'manual')
     if reason = 'autosave': insert a revision only if the last autosave revision is old enough
6. Answer 200 { saved_at: row.draft_saved_at }
```

Step 3 is the whole conflict mechanism. The editor sends the timestamp it last received; if the row has a different one, someone else saved in between. "Keep mine" sends `expected_saved_at: null`.

As a Next.js route handler:

```ts
// app/api/emails/[id]/draft/route.ts
import { checkEmail, createEmailRegistry, isDraftBlocking, parseEmail } from '@builderset/email';

const registry = createEmailRegistry();

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(request);
  if (!user.can('emails.edit')) return new Response(null, { status: 403 });

  const { document: raw, reason, expected_saved_at } = await request.json();
  const row = await db.emailTemplate.find(id);
  if (!row) return new Response(null, { status: 404 });

  if (expected_saved_at !== null && expected_saved_at !== row.draft_saved_at?.toISOString()) {
    return new Response(null, { status: 409 });
  }

  const document = parseEmail(raw); // null when the shape is wrong
  if (!document) return Response.json({ issues: [{ code: 'document.invalid' }] }, { status: 422 });

  // A draft may be unfinished, never unsafe: `isDraftBlocking` keeps only the issues a draft must not have.
  const blocking = checkEmail(document, registry, null).filter(isDraftBlocking);
  if (blocking.length > 0) return Response.json({ issues: blocking }, { status: 422 });

  const saved = await db.emailTemplate.saveDraft(id, document, { reason, userId: user.id });
  return Response.json({ saved_at: saved.draft_saved_at });
}
```

### Publish

```
POST /emails/:id/publish     { document, scheduled_at }

1. Check the user may publish. A separate permission from editing.     → 403
2. Check the document, strictly (section 5).                           → 422 { issues }
3. If scheduled_at is in the future:
     row.draft_document = document; row.scheduled_at = scheduled_at; row.status = 'scheduled'
   Otherwise, in one transaction:
     row.document = document
     row.draft_document = null
     row.status = 'published'; row.published_at = now; row.version += 1
     copy meta to the list columns (articles)
     insert a revision (kind 'publish')
4. Answer 200 { saved_at, status, published_at }
```

A scheduled document needs a job of yours that runs every minute, finds rows whose `scheduled_at` has passed, and performs the "otherwise" branch.

### Upload

```
POST /uploads                multipart: file, kind

1. Check the user.
2. Check the type against what `kind` allows, by reading the file, not its name.
3. Check the size against your limit.
4. For an image: read its width and height.
5. Store it under a key you build: <folder>/<document id>/<random>.<ext>. Never use the client's file name as the path.
6. Answer 201 { key, url, width, height, mime, size, name }
```

For large files, answer with a pre-signed URL and let the browser send the file straight to storage; your `upload` function then makes two requests instead of one.

### Two routes that fetch a URL the user typed

`oembed` and `importImage` make your server request an address a user supplied. Without limits, that is a way to reach your internal network.

- Allow only `http` and `https`, and only public addresses: resolve the host name and refuse private, loopback and link-local ranges.
- For `oembed`, call only the providers on an allow-list (YouTube, Vimeo…); never fetch the pasted URL itself.
- Set a short timeout and a size limit; do not follow redirects to other hosts.

---

## 5. Validation

**Check every document on the server, every time, before storing it.** The editor produces valid documents, but a request to your API does not have to come from the editor.

| Server                   | How                                                                                                                                                                                                                                                  |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node, Next.js, Bun, Deno | `parseEmail(raw)` then `checkEmail(document, registry, …)` from the same package the editor uses                                                                                                                                                     |
| Python                   | `check_email(document)` from the `builderset` package on PyPI                                                                                                                                                                                        |
| Anything else            | Validate against `schema.json` with a JSON Schema library (draft 2020-12), then apply the structural rules. The package's `fixtures/` folder holds valid and invalid documents and names the error each invalid one must give — make them your tests |

Two levels:

| When           | Level   | Accepts                                                                                                | Always refuses                                                                                                                   |
| -------------- | ------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Saving a draft | Lenient | Work in progress: a missing title, an image still uploading, an empty embed, an unfinished translation | A malformed tree; an unsafe URL (`javascript:`, `data:`); a media key outside the document's folders; anything over a size limit |
| Publishing     | Strict  | Only a document with no errors. Warnings — a missing alt text, a skipped heading level — do not block  | Everything a draft refuses, and every error                                                                                      |

An issue looks like `{ severity: 'error' | 'warning', code, nodeId?, path?, params? }`. Send the list back with `422`; the editor shows each issue on the block it belongs to.

For email, also check the variables: a template may use only the variables its `type_key` declares. `checkEmail` does it when you pass the email type.

---

## 6. Sending an email

```ts
import { renderEmail } from '@builderset/email/render';

export async function sendWelcome(user: User) {
  const template = await db.emailTemplate.findLive('welcome', user.locale); // status = 'published'
  const brand = await db.emailBrand.get('default');

  const email = renderEmail(template.document, {
    brand,
    data: {
      recipient: { name: user.name, email: user.email },
      account: { url: `https://acme.example/account/${user.id}` },
    },
    locale: user.locale, // picks the translation, and formats dates and money
    currency: 'EUR',
    assetUrl: (key) => `https://cdn.acme.example/${key}`, // must be absolute and public
    socialIcon: socialIconUrl('https://cdn.acme.example'),
  });

  await mailer.send({
    to: user.email,
    subject: email.subject, // variables already filled
    html: email.html,
    text: email.text, // always send the text part too
  });

  if (email.warnings.length > 0)
    log.warn('email.render', { template: template.id, warnings: email.warnings });
}
```

| Rule                                                          | Why                                                       |
| ------------------------------------------------------------- | --------------------------------------------------------- |
| Render at send time, from the **live** document               | A draft must never be sent                                |
| Every URL absolute and public                                 | A mail client has no idea what `/media/logo.png` means    |
| Pass every variable the template may use                      | A missing one renders empty and is reported in `warnings` |
| Send `text` with `html`                                       | Spam filters and some readers want it                     |
| Keep the unsubscribe link and your address in marketing email | The law in most places. The footer block has both         |
| Do not cache the HTML across recipients                       | It contains the recipient's data                          |

The package renders. It does not send, queue, retry or track; those are yours.

---

## 7. Showing an article

```tsx
// app/blog/[slug]/page.tsx — a Server Component
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { createArticleRegistry, parseArticle } from '@builderset/article';
import { ArticleRenderer, jsonLdString, structuredData } from '@builderset/article/render';
import '@builderset/article/content.css';

const registry = createArticleRegistry();

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await db.article.findPublished(slug);
  const document = article && parseArticle(article.document);
  if (!document) notFound();

  const resolveMedia = (key: string) => `https://cdn.example.com/${key}`;
  const data = structuredData(document, registry, {
    url: `https://example.com/blog/${slug}`,
    resolveMedia,
  });

  return (
    <article>
      <h1>{document.meta.title}</h1>
      <ArticleRenderer
        document={document}
        registry={registry}
        resolveMedia={resolveMedia}
        locale="en"
        linkComponent={Link}
        imageComponent={Image}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(data) }} />
    </article>
  );
}
```

- It renders on the server. Static blocks send no JavaScript; a few interactive ones (tabs, carousel, copy button) load a small script each.
- Read `document`, the live column, and only for `status = 'published'`. For a preview, a separate route that checks a signed token and reads `draft_document`.
- `parseArticle` runs any format migration, so an article written with an older version still renders.
- Cache the page as you cache any page; clear it when the article is published.

A backend in another language serves the document as JSON to a JavaScript front end, which renders it. There is no article renderer outside React.

---

## 8. Permissions and tenants

The editor has no idea who the user is. Your server decides everything.

| Decide on the server                                | Notes                                                                                                                                    |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Who may open the editor                             | In the page that loads the row                                                                                                           |
| Who may save                                        | In the draft route                                                                                                                       |
| Who may publish                                     | A separate permission. Leave `publish` out of the host for users without it and the button is not shown — but the route must still check |
| Who may delete, restore a revision, manage sections |                                                                                                                                          |

With several tenants:

- Every table has a tenant column, and every query filters by it.
- Storage keys start with the tenant (`t/17/emails/42/…`), and validation refuses a key from another tenant.
- The brand kit is per tenant.
- `storageKey` for the crash-safety copy includes the tenant and the user, so two accounts in one browser do not see each other's unsaved work.

---

## 9. Upgrading

- Keep every `@builderset/*` package on the same version. They are released together.
- **Stored documents keep working.** Each carries its format version; `parseEmail` and `parseArticle` bring an older one up to date in memory when it is read. Nothing in your database has to change when you upgrade.
- A document is written in the new format the next time it is saved. To convert everything at once — for a backend in another language that reads the JSON — run `parse…` over each row and write it back, in a script.
- An older package refuses a document written by a newer one, with a clear message. So upgrade the server and the back office together, and the server first if you must choose.
- Read the changelog for anything marked breaking before 1.0.

---

## 10. Checklists

**Frontend**

- [ ] The package and its stylesheet are imported.
- [ ] The editor has its own route and a container with a height.
- [ ] The editor is loaded only on that route, in the browser.
- [ ] The host has `save`, `upload`, `resolveMedia` and `toast`; `save` never throws.
- [ ] The theme matches the back office in light and dark.
- [ ] `storageKey` is unique per document and user.
- [ ] Email: the brand and the variables for each email type are passed.

**Backend**

- [ ] `document`, `draft_document` and `draft_saved_at` columns exist.
- [ ] The draft route checks the permission, the timestamp and the document, in that order.
- [ ] The publish route checks strictly, and is a separate permission.
- [ ] Publishing copies `meta` to the list columns in the same transaction (articles).
- [ ] Uploads are checked for type and size on the server and stored under a key the server builds.
- [ ] No route stores HTML sent by the browser.
- [ ] Routes that fetch a user's URL refuse private addresses.
- [ ] Revisions are recorded on manual saves and publishes, and autosave revisions are limited.

**Before going live**

- [ ] Two browsers editing one document: the second save shows the conflict dialog.
- [ ] Pull the network cable while typing: "could not save", then it recovers.
- [ ] Close the tab with unsaved work, reopen: the work is offered back.
- [ ] A request with a hand-made invalid document is refused with `422`.
- [ ] Email: a test send in Gmail, Outlook and Apple Mail, light and dark, with real data and with the longest values you can think of.
- [ ] Article: the page with JavaScript disabled; the structured data in a validator.

---

## 11. Questions

**Do I need Tailwind?** No. The stylesheet is compiled.

**Does it work without Next.js?** Yes: any React 19 app. The server parts (`render`, validation) run in plain Node.

**My backend is not JavaScript.** Store and validate with the JSON Schema; Python has a package with validation and the email renderer. For other languages, an email can be rendered by a small Node service or function that your backend calls with the document and the data.

**Can I use MongoDB, MySQL, SQLite?** Yes. The document is one JSON value under 200 kB. Nothing queries inside it.

**Can I skip drafts and revisions?** You can skip revisions: leave those host methods out. Do not skip the draft column if the document is ever live: without it, autosave changes what readers see.

**Can I edit the JSON myself, from a script?** Yes — it is your data — but run it through `check…` afterwards, and prefer the package's operations to hand-written changes.

**Can the writer paste HTML?** Not as raw HTML: the document has no HTML in it, by design, which is why it is safe to render. The email kit can import an existing email's HTML into blocks, and the article kit imports HTML and Markdown into elements.

**Where do variables come from at send time?** From your code: the `data` you pass to `renderEmail`. The list you gave the editor only says what a writer may use.

**Two kits in one project?** Install both, or `builderset`. Keep the versions equal.
