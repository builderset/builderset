# What a backend must do

The editor runs in the browser and owns nothing: no database, no routes, no
login, no file storage, no mail. It asks its **host** (`BuilderHost`) for all
of it. This page is what the other side of that line must do: what it
stores, what it checks, what it renders, and how it stays safe. It is the
source of the docs site's backend page (step 16 of the plan).

A project either writes its own host adapter, against the API it already
has, or builds its API in the shape below and uses `createRestHost`
from `@builderset/engine/host` (re-exported as `@builderset/article/host` and
`@builderset/email/host`).

## 1. What to store

Any database with a JSON column works. One row per document, with:

| Column            | Why                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------ |
| `document`        | The live document: what the site renders or the mailer sends                               |
| `draft_document`  | Autosaves and work in progress. May be unfinished; never unsafe                            |
| `draft_saved_at`  | The editor sends back the value it last saw; a different value on the server is a conflict |
| `status`          | `draft`, `published` (and `scheduled`, `archived` where they apply)                        |
| `version`         | Counts publishes                                                                           |
| a revisions table | `document`, `kind` (`autosave`, `manual`, `publish`), `label`, author, time                |
| a sections table  | Saved fragments the writer reuses: `name`, `fragment`                                      |

## 2. Draft or live

- **A draft may be unfinished**: a missing title or subject, an image still
  uploading, an embed address half typed.
- **A draft may never be unsafe**: an unsafe link, media outside the
  document's own folders, a malformed tree.
- **Publishing checks strictly.** Every error blocks it; warnings never do.

This is code, not a judgement each backend makes. Each kit exports the rule
and the list of codes a draft may still carry:

```ts
import { checkEmail, isDraftBlocking, isPublishBlocking, parseEmail } from '@builderset/email';

const document = parseEmail(body.document, registry); // null: not an email at all
const issues = checkEmail(document, registry, type, { locales });
if (issues.some(isDraftBlocking)) refuse(issues); // on an autosave
if (issues.some(isPublishBlocking)) refuse(issues); // on publish
```

The lists are `ARTICLE_DRAFT_TOLERATES` and `EMAIL_DRAFT_TOLERATES`, and each
kit ships its list as a file too, `fixtures/draft.json`, for a backend in
another language.

## 3. Validate on every write

Never trust the browser: check the document on every save, publish and
revision, exactly as if the editor did not exist.

- **Node**: `parseEmail(body.document, registry)` (`null` when it is not an
  email at all), then `checkEmail(document, registry, type, { locales })`; or
  `parseArticle(body.document, registry)` (which also runs migrations), then
  `checkArticle(result.doc, registry, { locales })`.
- **Python**: the `builderset` package. `check_email` (`builderset.email`)
  and `check_article` (`builderset.article`) give the same answers, with the
  same issue codes, as the Node kits.
- **Any other language**: validate against the kit's `schema.json` (JSON
  Schema, draft 2020-12), then apply the structural rules. The invalid
  fixtures (`fixtures/invalid/`) are one broken document each, and
  `fixtures/invalid/manifest.json` names the error each must produce; the
  valid fixtures must pass. A port is done when all of them agree.

Pass the project's languages (`{ locales }`) so a document in a language the
project does not publish is refused (`i18n.locale.unknown`).

## 4. Render on the server

The browser never sends HTML. The server renders from the stored, checked
document: `renderEmail(document, { data, brand, locale, assetUrl })` at send
time, the article renderer in the site's own pages. An email's preview in the
editor and the email that is sent come from the same function.

## 5. Security checklist

| Check                                                             | Why                                                                         |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------- |
| The user may edit this document                                   | The editor cannot know                                                      |
| The body is under a size limit (the schema's `x-limits`)          | A document is JSON of any size until checked                                |
| Every media key in the document belongs to this tenant and folder | A key is a path into storage                                                |
| Uploads are checked for type and size on the server               | The browser's check is for the writer's comfort only                        |
| `oembed` and `importImage` fetch only public addresses            | A server fetching a URL a user typed can be pointed at the internal network |
| Publishing is its own permission                                  | Writing a draft and putting it in front of readers are different trust      |

## 6. Examples

Three complete backends, each tested against a real Postgres, are in
`examples/backends/`: Next.js route handlers with Drizzle, the same with
Prisma, and a FastAPI router with SQLAlchemy.

## The REST shape `createRestHost` speaks

For a project that has no API yet. Paths are relative to `baseUrl`, the
document's address (`/api/emails/42`); `{base}/../sections` is a sibling.

| Host method     | Request                                        | Body                                      | Success                                              | Failure                                                                                                       |
| --------------- | ---------------------------------------------- | ----------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `save`          | `PUT {base}/draft`                             | `{ document, reason, expected_saved_at }` | `200 { saved_at }`                                   | `409` someone else saved → `{ ok: false, conflict: true }`; `422 { issues }` → the message of the first issue |
| `reload`        | `GET {base}`                                   | —                                         | `200 { document, draft_document, saved_at, status }` |                                                                                                               |
| `publish`       | `POST {base}/publish`                          | `{ document, scheduled_at }`              | `200 { saved_at, status, published_at }`             | `422 { issues }`                                                                                              |
| `unpublish`     | `POST {base}/unpublish`                        | —                                         | `200 { saved_at, status }`                           |                                                                                                               |
| `loadRevisions` | `GET {base}/revisions`                         | —                                         | `200 [{ id, kind, label, created_at, author }]`      |                                                                                                               |
| `loadRevision`  | `GET {base}/revisions/{id}`                    | —                                         | `200 { document }`                                   |                                                                                                               |
| `saveRevision`  | `POST {base}/revisions`                        | `{ document, label }`                     | `201`                                                |                                                                                                               |
| `upload`        | `POST {uploadUrl}` (multipart: `file`, `kind`) | —                                         | `201 { key, url, width, height, mime, size, name }`  | `413`, `415` → a message                                                                                      |
| `importImage`   | `POST {uploadUrl}/import`                      | `{ url }`                                 | `201` as upload                                      |                                                                                                               |
| `oembed`        | `GET {base}/../oembed?url=…`                   | —                                         | `200 { provider, title, thumbnail }` or `204`        |                                                                                                               |
| `loadSections`  | `GET {base}/../sections`                       | —                                         | `200 [{ id, name, fragment }]`                       |                                                                                                               |
| `saveSection`   | `POST {base}/../sections`                      | `{ name, fragment }`                      | `201 { id, name, fragment }`                         |                                                                                                               |
| `previewUrl`    | `POST {base}/preview`                          | `{ document, locale }`                    | `200 { url }`                                        |                                                                                                               |

Rules:

- **Conflicts.** The editor sends back the `saved_at` it last received as
  `expected_saved_at` (seed it with the page's own through the `savedAt`
  option). If the server's value differs and the request does not carry
  `force: true` ("keep mine"), the server answers `409`.
- **Optional methods.** A method the API does not have is left out with
  `paths: { revisions: null }`; the editor hides that feature.
- **Field names are snake_case on the wire** and camelCase in TypeScript; the
  adapter converts its own fields, never the document.
- **Failures are answers, not exceptions.** `save`, `publish` and `unpublish`
  resolve to `{ ok: false, message }` on a refusal or a lost connection, and
  the editor shows "could not save" and retries. Lists that fail come back
  empty, with a toast.
- **What the server says about the record** (`status`, `published_at`) reaches
  the page through `onRecord`, for the editor's `record` prop.
