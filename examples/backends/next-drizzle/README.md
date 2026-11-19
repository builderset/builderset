# Example backend: Next.js, Drizzle, Postgres

The server side of the email editor: route handlers that speak the REST shape `createRestHost` uses, over a Postgres table defined with [Drizzle](https://orm.drizzle.team). The same routes are in [`next-prisma`](../next-prisma) with Prisma and in [`fastapi-sqlalchemy`](../fastapi-sqlalchemy) in Python. The editor's page is in [`next-shadcn`](../../next-shadcn).

| Route                            | For the host method | Answers                                              |
| -------------------------------- | ------------------- | ---------------------------------------------------- |
| `POST /api/emails`               | (your back office)  | `201` the record · `422 { issues }`                  |
| `GET /api/emails/:id`            | `reload`            | `{ document, draft_document, saved_at, status, … }`  |
| `PUT /api/emails/:id/draft`      | `save`              | `{ saved_at }` · `409` · `422 { issues }`            |
| `POST /api/emails/:id/publish`   | `publish`           | `{ saved_at, status, published_at }` · `422`         |
| `POST /api/emails/:id/unpublish` | `unpublish`         | `{ saved_at, status }`                               |
| `POST /api/emails/:id/send`      | (your mailer)       | `{ subject, html, text, warnings }` · `409` if draft |
| `POST /api/uploads`              | `upload`            | `201 { key, url, mime, size, name }` · `413` · `415` |
| `GET /api/uploads/:key`          | `resolveMedia`      | the file                                             |

| File                   | What it shows                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------- |
| `db/schema.ts`         | The `email_template` table: the live document, the draft, `saved_at` for the conflict check |
| `drizzle/`             | The migration `drizzle-kit generate` wrote from the schema                                  |
| `lib/emails.ts`        | `checkDocument`: `parseEmail` and `checkEmail`, lenient for a draft, strict for publishing  |
| `app/api/emails/…`     | The routes. The draft route answers `409` when someone else saved in between                |
| `…/send/route.ts`      | `renderEmail` on the server, from the live document only                                    |
| `lib/uploads.ts`       | Images on the local disk, known by their bytes. A real project uses S3 or similar           |
| `tests/emails.test.ts` | Every route above, called against a real Postgres                                           |

## Run it

From the repository root, `pnpm install`, then in this folder:

```bash
export DATABASE_URL=postgresql://user:password@localhost:5432/emails
pnpm db:migrate   # creates the table
pnpm dev          # http://localhost:5301
```

Point the editor at it. This API has no versions, saved sections, previews or oEmbed, so those paths are `null` and the editor hides the features:

```ts
createRestHost<EmailDocument>({
  baseUrl: `/api/emails/${id}`,
  uploadUrl: '/api/uploads',
  resolveMedia: (key) => `/api/uploads/${key}`,
  savedAt, // the record's saved_at, as the page loaded it
  toast,
  paths: { revisions: null, sections: null, oembed: null, preview: null },
});
```

After a change to `db/schema.ts`, `pnpm db:generate` writes the next migration.

## Test it

```bash
pnpm test:db
```

The tests need Docker: they start Postgres in a container ([Testcontainers](https://testcontainers.com)) and migrate it. With `TEST_DATABASE_URL` set they use that database instead, as CI does. They never read `DATABASE_URL`, which may be a database you care about.
