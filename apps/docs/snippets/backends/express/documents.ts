import { randomUUID } from 'node:crypto';

import type { ArticleDocument } from '@builderset/article';
import type { EmailDocument } from '@builderset/email';
import { error, type EngineDocument, type Issue } from '@builderset/engine';
import type { FormDocument } from '@builderset/form';
import { Router, type Request, type Response } from 'express';
import type pg from 'pg';

import {
  checkArticleDocument,
  checkEmailDocument,
  checkFormDocument,
  EMAIL_TYPES,
  type Checked,
  type Level,
} from './checks';
import { isUniqueViolation, pool, transaction } from './db';

/** Who is signed in. Your session middleware puts them on `res.locals.user`. */
export interface Editor {
  id: number;
  /** Publishing is its own permission: a draft and a page in front of readers are different trust. */
  canPublish: boolean;
}
export const editorOf = (res: Response) => res.locals.user as Editor;

type Body = Record<string, unknown>;
type Row = Body & { id: number; status: string; saved_at: Date; version: number };

/**
 * What differs between emails, articles and forms. Table and column names
 * come from here and are written into the SQL; nothing from a request ever is.
 */
export interface DocumentKind<D extends EngineDocument> {
  table: 'email_template' | 'article' | 'form';
  noun: string;
  /** The columns the list shows. */
  list: string[];
  /** The kit's check. `row` is the stored row, or the request body of a new one. */
  check(raw: unknown, level: Level, row: Body): Checked<D>;
  /** Copies of the live document's meta, written in the same statement as the document. */
  copies(document: D): Body;
  /** The columns a new row takes from the request; null when it lacks them. */
  create(body: Body, document: D, editor: Editor): Body | null;
  needs: string;
  /** Where unpublishing leaves it. */
  unpublished: string;
  /** Whether `scheduled_at` may put it live later. */
  schedules?: boolean;
  beforePublish?: (client: pg.PoolClient, row: Row) => Promise<void>;
}

const bodyOf = (request: Request): Body =>
  typeof request.body === 'object' && request.body !== null ? (request.body as Body) : {};

/** Every write gets a new `saved_at`; the editor sends it back on its next save. */
const sameInstant = (expected: unknown, savedAt: Date) =>
  typeof expected === 'string' && new Date(expected).getTime() === savedAt.getTime();

function recordOf(row: Row) {
  return {
    id: row.id,
    status: row.status,
    document: row.document,
    draft_document: row.draft_document,
    saved_at: row.saved_at.toISOString(),
    published_at: row.published_at ?? null,
  };
}

/** `"a" = $1, "b" = $2` for an UPDATE, from columns this file names. */
function assignments(columns: Body, first = 1) {
  return Object.keys(columns)
    .map((name, index) => `${name} = $${String(first + index)}`)
    .join(', ');
}

export function documentRouter<D extends EngineDocument>(kind: DocumentKind<D>): Router {
  const router = Router();

  const find = async (id: string): Promise<Row | null> => {
    if (!/^\d{1,15}$/.test(id)) return null;
    const { rows } = await pool.query<Row>(`select * from ${kind.table} where id = $1`, [id]);
    return rows[0] ?? null;
  };
  const notFound = (res: Response) =>
    res.status(404).json({ message: `There is no such ${kind.noun}.` });
  const conflict = (res: Response) =>
    res.status(409).json({ message: `Someone else saved this ${kind.noun} since you opened it.` });
  const refused = (res: Response, issues: Issue[]) => res.status(422).json({ issues });

  /** GET / — the list, newest first. */
  router.get('/', async (_req, res) => {
    const { rows } = await pool.query(
      `select ${kind.list.join(', ')} from ${kind.table} order by saved_at desc limit 200`,
    );
    res.json(rows);
  });

  /** POST / — a new document, as a draft. */
  router.post('/', async (req, res) => {
    const body = bodyOf(req);
    const checked = kind.check(body.document, 'draft', body);
    if (!checked.ok) return refused(res, checked.issues);
    const columns = kind.create(body, checked.document, editorOf(res));
    if (!columns)
      return res.status(400).json({ message: `A new ${kind.noun} needs ${kind.needs}.` });
    const values: Body = {
      ...kind.copies(checked.document),
      ...columns,
      document: checked.document,
      saved_at: new Date(),
    };
    const names = Object.keys(values);
    try {
      const { rows } = await pool.query<Row>(
        `insert into ${kind.table} (${names.join(', ')})
         values (${names.map((_, index) => `$${String(index + 1)}`).join(', ')}) returning *`,
        Object.values(values),
      );
      return res.status(201).json(recordOf(rows[0]));
    } catch (failure) {
      if (isUniqueViolation(failure))
        return res.status(409).json({ message: 'That address is taken.' });
      throw failure;
    }
  });

  /** GET /:id — what `reload` reads: the live document, the draft and `saved_at`. */
  router.get('/:id', async (req, res) => {
    const row = await find(req.params.id);
    return row ? res.json(recordOf(row)) : notFound(res);
  });

  // #region draft
  /** PUT /:id/draft — an autosave or a manual save. Readers still get the live document. */
  router.put('/:id/draft', async (req, res) => {
    const row = await find(req.params.id);
    if (!row) return notFound(res);
    const body = bodyOf(req);
    // The editor sends back the saved_at it last saw. Another one here means
    // someone else saved in between; "keep mine" sends force.
    if (
      body.force !== true &&
      body.expected_saved_at &&
      !sameInstant(body.expected_saved_at, row.saved_at)
    )
      return conflict(res);
    const checked = kind.check(body.document, 'draft', row);
    if (!checked.ok) return refused(res, checked.issues);
    // Written only if the row is still the one read above, so two saves at
    // the same moment cannot both win.
    const { rows } = await pool.query<Row>(
      `update ${kind.table} set draft_document = $1, saved_at = $2
       where id = $3 and saved_at = $4 returning saved_at`,
      [checked.document, new Date(), row.id, row.saved_at],
    );
    return rows[0] ? res.json({ saved_at: rows[0].saved_at.toISOString() }) : conflict(res);
  });
  // #endregion

  // #region publish
  /** POST /:id/publish — the strict check, then the document goes live. */
  router.post('/:id/publish', async (req, res) => {
    if (!editorOf(res).canPublish) return res.status(403).json({ message: 'You may not publish.' });
    const row = await find(req.params.id);
    if (!row) return notFound(res);
    const body = bodyOf(req);
    const checked = kind.check(body.document, 'publish', row);
    if (!checked.ok) return refused(res, checked.issues);
    const now = new Date();
    const later =
      kind.schedules && typeof body.scheduled_at === 'string' && new Date(body.scheduled_at) > now
        ? new Date(body.scheduled_at)
        : null;
    const columns: Body = {
      ...kind.copies(checked.document),
      document: checked.document,
      draft_document: null,
      // A scheduled article waits for your job to set it live at scheduled_at.
      status: later ? 'scheduled' : 'published',
      ...(kind.schedules ? { scheduled_at: later } : {}),
      published_at: later ? null : now,
      saved_at: now,
    };
    try {
      const saved = await transaction(async (client) => {
        await kind.beforePublish?.(client, row);
        const { rows } = await client.query<Row>(
          `update ${kind.table} set ${assignments(columns)}, version = version + 1
           where id = $${String(Object.keys(columns).length + 1)} returning *`,
          [...Object.values(columns), row.id],
        );
        return rows[0];
      });
      return res.json({
        saved_at: saved.saved_at.toISOString(),
        status: saved.status,
        published_at: saved.published_at ?? null,
        ...(kind.schedules ? { scheduled_at: saved.scheduled_at ?? null } : {}),
      });
    } catch (failure) {
      // Another form already lives at this address.
      if (isUniqueViolation(failure))
        return refused(res, [error('meta.slugTaken', { path: 'meta.slug' })]);
      throw failure;
    }
  });
  // #endregion

  /** POST /:id/unpublish — readers no longer get it; the document is kept. */
  router.post('/:id/unpublish', async (req, res) => {
    if (!editorOf(res).canPublish) return res.status(403).json({ message: 'You may not publish.' });
    const row = await find(req.params.id);
    if (!row) return notFound(res);
    const { rows } = await pool.query<Row>(
      `update ${kind.table} set status = $1, saved_at = $2 where id = $3 returning status, saved_at`,
      [kind.unpublished, new Date(), row.id],
    );
    return res.json({ saved_at: rows[0].saved_at.toISOString(), status: rows[0].status });
  });

  return router;
}

// #region kinds
// ── The three kinds ─────────────────────────────────────────────────────────

export const emails: DocumentKind<EmailDocument> = {
  table: 'email_template',
  noun: 'email template',
  list: ['id', 'name', 'type_key', 'status', 'saved_at', 'published_at'],
  // The type's variables are checked too: a reset email must use the reset link.
  check: (raw, level, row) =>
    checkEmailDocument(raw, level, typeof row.type_key === 'string' ? row.type_key : null),
  copies: (document) => ({ name: document.meta.name }),
  create: (body, _document, editor) => ({
    // Only a type the project has: its key picks the variables checked.
    type_key:
      typeof body.type_key === 'string' && Object.hasOwn(EMAIL_TYPES, body.type_key)
        ? body.type_key
        : null,
    created_by: editor.id,
  }),
  needs: 'a document',
  unpublished: 'draft',
  // One active design per email type: the one before it steps down.
  async beforePublish(client, row) {
    if (row.type_key === null) return;
    await client.query(
      `update email_template set status = 'draft', saved_at = now()
       where type_key = $1 and status = 'published' and id <> $2`,
      [row.type_key, row.id],
    );
  },
};

export const articles: DocumentKind<ArticleDocument> = {
  table: 'article',
  noun: 'article',
  list: ['id', 'slug', 'locale', 'title', 'status', 'saved_at', 'published_at', 'scheduled_at'],
  check: (raw, level) => checkArticleDocument(raw, level),
  copies: ({ meta }) => ({
    title: meta.title,
    excerpt: meta.excerpt ?? '',
    cover_key: meta.cover?.media.key ?? null,
    cover_alt: meta.cover?.alt ?? null,
  }),
  // The address is the article's, not the document's: it is chosen when the article is made.
  create: (body, _document, editor) =>
    typeof body.slug === 'string' &&
    /^[a-z0-9-]{1,200}$/.test(body.slug) &&
    typeof body.locale === 'string' &&
    /^[a-z]{2}(-[A-Z]{2})?$/.test(body.locale)
      ? { slug: body.slug, locale: body.locale, author_id: editor.id }
      : null,
  needs: 'a slug and a locale',
  unpublished: 'draft',
  schedules: true,
};

export const forms: DocumentKind<FormDocument> = {
  table: 'form',
  noun: 'form',
  list: ['id', 'slug', 'name', 'status', 'response_count', 'saved_at', 'published_at'],
  check(raw, level) {
    const checked = checkFormDocument(raw, level);
    // A live form needs its address; a draft may not have one yet.
    if (checked.ok && level === 'publish' && !checked.document.meta.slug)
      return { ok: false, issues: [error('meta.slugMissing', { path: 'meta.slug' })] };
    return checked;
  },
  copies: ({ meta }) => ({ name: meta.name, slug: meta.slug }),
  // The slug column is unique and required, and a new form often has none yet:
  // it holds a placeholder until the form is published with its own.
  create: (_body, { meta }, editor) => ({
    slug: meta.slug || `draft-${randomUUID()}`,
    created_by: editor.id,
  }),
  needs: 'a document',
  // A closed form keeps its link and shows its closed message.
  unpublished: 'closed',
};
// #endregion
