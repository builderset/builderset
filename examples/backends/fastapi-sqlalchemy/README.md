# Example backend: FastAPI, SQLAlchemy, Postgres

The server side of the email editor in Python: the REST shape `createRestHost` uses, with [FastAPI](https://fastapi.tiangolo.com), SQLAlchemy 2 and an [Alembic](https://alembic.sqlalchemy.org) migration. Documents are checked and emails rendered by the `builderset` Python package, with the same issue codes and the same HTML as the TypeScript packages. The editor's routes are also in [`next-drizzle`](../next-drizzle) and [`next-prisma`](../next-prisma).

It keeps the email part of the [data model](https://docs-builderset.vercel.app/docs/guides/backend/data-model): every row records who made it, changed it and deleted it, and when; deleting is a soft delete; each template has its revisions and an activity log. `:id` is the row's `uuid`.

| Route                                | For the host method | Answers                                                |
| ------------------------------------ | ------------------- | ------------------------------------------------------ |
| `GET /api/emails`                    | (your list)         | `{ items, total }` · `?deleted=true` lists the trash   |
| `POST /api/emails`                   | (your back office)  | `201` the record · `422 { issues }`                    |
| `GET /api/emails/:id`                | `reload`            | `{ document, draft_document, saved_at, status, … }`    |
| `PUT /api/emails/:id/draft`          | `save`              | `{ saved_at }` · `409` · `422 { issues }`              |
| `POST /api/emails/:id/publish`       | `publish`           | `{ saved_at, status, published_at }` · `422`           |
| `POST /api/emails/:id/unpublish`     | `unpublish`         | `{ saved_at, status }`                                 |
| `DELETE /api/emails/:id`             | (your list)         | `204` · `409` while published                          |
| `POST /api/emails/:id/restore`       | (your trash)        | the record                                             |
| `GET /api/emails/:id/revisions`      | `loadRevisions`     | `[{ id, kind, label, version, created_at, author }]`   |
| `GET /api/emails/:id/revisions/:rid` | `loadRevision`      | `{ document }`                                         |
| `POST /api/emails/:id/revisions`     | `saveRevision`      | `201`                                                  |
| `GET /api/emails/:id/activity`       | (your timeline)     | `[{ id, action, from_status, to_status, details, … }]` |
| `POST /api/emails/:id/send`          | (your mailer)       | `{ subject, html, text, missing }` · `409` if draft    |
| `POST /api/uploads`                  | `upload`            | `201 { key, url, mime, size, name }` · `413` · `415`   |
| `GET /api/uploads/:key`              | `resolveMedia`      | the file                                               |

| File                   | What it shows                                                                                   |
| ---------------------- | ----------------------------------------------------------------------------------------------- |
| `app/models/`          | The tables: the audit columns every one shares (`base.py`), the templates, the activity log     |
| `migrations/versions/` | The Alembic migration that creates them                                                         |
| `app/checks.py`        | `check_email`, lenient for a draft (`DRAFT_TOLERATES`), strict for publishing                   |
| `app/deps.py`          | The session, the signed-in user (a stand-in: put your auth there), the template from its `uuid` |
| `app/audit.py`         | What every write shares: who did it, the revision, the activity, soft delete and restore        |
| `app/errors.py`        | The one place a refusal becomes `404`, `409` or `422`                                           |
| `app/routers/`         | The routes: the templates, their history, the uploads                                           |
| `app/storage.py`       | Images on the local disk, known by their bytes. A real project uses S3 or similar               |
| `tests/`               | Every route above, called against a real Postgres                                               |

The package comes from this repository (`[tool.uv.sources]` in `pyproject.toml`). In a project of your own, depend on the released one.

## Run it

With [uv](https://docs.astral.sh/uv/), in this folder:

```bash
export DATABASE_URL=postgresql://user:password@localhost:5432/emails
uv run alembic upgrade head          # creates the tables
uv run uvicorn app.main:app --reload # http://localhost:8000
```

Point the editor at it as in [`next-drizzle`](../next-drizzle#run-it), with the API's origin in front of each path. After a change to `app/models/`, `uv run alembic revision --autogenerate -m "<what changed>"` writes the next migration.

## Test it

```bash
uv run pytest
uv run ruff check . && uv run mypy
```

The tests need Docker: they start Postgres in a container ([Testcontainers](https://testcontainers.com)) and migrate it with Alembic. With `TEST_DATABASE_URL` set they use that database instead, as CI does. They never read `DATABASE_URL`, which may be a database you care about.
