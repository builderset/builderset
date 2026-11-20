# Example backend: Next.js, Prisma, Postgres

The server side of the email editor: route handlers that speak the REST shape `createRestHost` uses, over Postgres tables defined with [Prisma](https://www.prisma.io). The same routes are in [`next-drizzle`](../next-drizzle) with Drizzle and in [`fastapi-sqlalchemy`](../fastapi-sqlalchemy) in Python. The editor's page is in [`next-shadcn`](../../next-shadcn).

It keeps the email part of the [data model](https://builderset.dev/docs/guides/backend/data-model): every row records who made it, changed it and deleted it, and when; deleting is a soft delete; each template has its revisions and an activity log. `:id` is the row's `uuid`. The routes and their answers are those of [`next-drizzle`](../next-drizzle#readme).

| File                   | What it shows                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------- |
| `prisma/schema/`       | The models, one file per group: your users (`base.prisma`), the templates, the activity log |
| `prisma/migrations/`   | The migration that creates them, with the check constraints a Prisma schema cannot hold     |
| `lib/db.ts`            | One Prisma client, with the `pg` driver adapter                                             |
| `lib/vocabulary.ts`    | The values of the text columns: statuses, revision kinds, actions                           |
| `lib/email-check.ts`   | `checkDocument`: `parseEmail` and `checkEmail`, lenient for a draft, strict for publishing  |
| `lib/emails.ts`        | Every read and write of a template, each write one transaction                              |
| `lib/history.ts`       | The revisions and the activity of a template                                                |
| `lib/audit.ts`         | What every write shares: who did it, and the activity line                                  |
| `lib/auth.ts`          | The signed-in user. A stand-in that trusts a header: put your auth there                    |
| `lib/http.ts`          | The one place a refusal becomes `404`, `409` or `422`                                       |
| `app/api/…`            | The routes, a few lines each                                                                |
| `lib/uploads.ts`       | Images on the local disk, known by their bytes. A real project uses S3 or similar           |
| `tests/emails.test.ts` | Every route, called against a real Postgres                                                 |

## Run it

From the repository root, `pnpm install`, then in this folder:

```bash
export DATABASE_URL=postgresql://user:password@localhost:5432/emails
pnpm db:migrate   # creates the tables
pnpm dev          # http://localhost:5302
```

Every route answers `401` without a signed-in user: until `lib/auth.ts` reads your session, send a user's `uuid` from `app_user` in an `X-User-Id` header. The editor's host is the same as for [`next-drizzle`](../next-drizzle#run-it).

After a change to `prisma/schema/`, `pnpm exec prisma migrate dev --name <what changed>` writes the next migration. `prisma generate` writes the client to `generated/`; the scripts here run it first.

## Test it

```bash
pnpm test:db
```

The tests need Docker: they start Postgres in a container ([Testcontainers](https://testcontainers.com)) and migrate it. With `TEST_DATABASE_URL` set they use that database instead, as CI does. They never read `DATABASE_URL`, which may be a database you care about.
