# Example backend: Next.js, Drizzle, Postgres

The server side of the email editor: route handlers that speak the REST shape `createRestHost` uses, over Postgres tables defined with [Drizzle](https://orm.drizzle.team). The same routes are in [`next-prisma`](../next-prisma) with Prisma and in [`fastapi-sqlalchemy`](../fastapi-sqlalchemy) in Python. The editor's page is in [`next-shadcn`](../../next-shadcn).

It keeps the email part of the [data model](https://builderset.dev/docs/guides/backend/data-model): every row records who made it, changed it and deleted it, and when; deleting is a soft delete; each template has its revisions and an activity log. `:id` is the row's `uuid`.

| Route                                | For the host method | Answers                                                       |
| ------------------------------------ | ------------------- | ------------------------------------------------------------- |
| `GET /api/emails`                    | (your list)         | `{ items, total }` · `?deleted=true` lists the trash          |
| `POST /api/emails`                   | (your back office)  | `201` the record · `422 { issues }`                           |
| `GET /api/emails/:id`                | `reload`            | `{ document, draft_document, saved_at, status, … }`           |
| `PUT /api/emails/:id/draft`          | `save`              | `{ saved_at }` · `409` · `422 { issues }`                     |
| `POST /api/emails/:id/publish`       | `publish`           | `{ saved_at, status, published_at }` · `422`                  |
| `POST /api/emails/:id/unpublish`     | `unpublish`         | `{ saved_at, status }`                                        |
| `DELETE /api/emails/:id`             | (your list)         | `204` · `409` while published                                 |
| `POST /api/emails/:id/restore`       | (your trash)        | the record                                                    |
| `GET /api/emails/:id/revisions`      | `loadRevisions`     | `[{ id, kind, label, version, created_at, author }]`          |
| `GET /api/emails/:id/revisions/:rid` | `loadRevision`      | `{ document, … }`                                             |
| `POST /api/emails/:id/revisions`     | `saveRevision`      | `201`                                                         |
| `GET /api/emails/:id/activity`       | (your timeline)     | `[{ id, action, from_status, to_status, details, actor, … }]` |
| `POST /api/emails/:id/send`          | (your mailer)       | `{ subject, html, text, warnings }` · `409` if draft          |
| `POST /api/uploads`                  | `upload`            | `201 { key, url, mime, size, name }` · `413` · `415`          |
| `GET /api/uploads/:key`              | `resolveMedia`      | the file                                                      |

| File                   | What it shows                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------- |
| `db/schema/`           | The tables: the audit columns every one shares (`base.ts`), the templates, the activity log |
| `drizzle/`             | The migration `drizzle-kit generate` wrote from the schema                                  |
| `lib/email-check.ts`   | `checkDocument`: `parseEmail` and `checkEmail`, lenient for a draft, strict for publishing  |
| `lib/emails.ts`        | Every read and write of a template, each write one transaction                              |
| `lib/history.ts`       | The revisions and the activity of a template                                                |
| `lib/audit.ts`         | What every write shares: who did it, and the activity line                                  |
| `lib/auth.ts`          | The signed-in user. A stand-in that trusts a header: put your auth there                    |
| `lib/http.ts`          | The one place a refusal becomes `404`, `409` or `422`                                       |
| `app/api/…`            | The routes, a few lines each                                                                |
| `lib/uploads.ts`       | Images on the local disk, known by their bytes. A real project uses S3 or similar           |
| `tests/emails.test.ts` | Every route above, called against a real Postgres                                           |

## Run it

From the repository root, `pnpm install`, then in this folder:

```bash
export DATABASE_URL=postgresql://user:password@localhost:5432/emails
pnpm db:migrate   # creates the tables
pnpm dev          # http://localhost:5301
```

Every route answers `401` without a signed-in user. Until `lib/auth.ts` reads your session, send a user's `uuid` from `app_user` in an `X-User-Id` header. Point the editor at it; this API has no saved sections, previews or oEmbed, so those paths are `null` and the editor hides the features:

```ts
createRestHost<EmailDocument>({
  baseUrl: `/api/emails/${id}`, // the template's uuid
  uploadUrl: '/api/uploads',
  resolveMedia: (key) => `/api/uploads/${key}`,
  savedAt, // the record's saved_at, as the page loaded it
  toast,
  paths: { sections: null, oembed: null, preview: null },
});
```

After a change to `db/schema/`, `pnpm db:generate` writes the next migration.

## Test it

```bash
pnpm test:db
```

The tests need Docker: they start Postgres in a container ([Testcontainers](https://testcontainers.com)) and migrate it. With `TEST_DATABASE_URL` set they use that database instead, as CI does. They never read `DATABASE_URL`, which may be a database you care about.
