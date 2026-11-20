import { error, type EngineDocument } from '@builderset/engine';
import { Router, type Request } from 'express';
import type { PoolClient } from 'pg';

import {
  createdBy,
  recordActivity,
  recordAutosave,
  recordRevision,
  restore,
  softDelete,
  updatedBy,
} from '../audit';
import { currentUser, publisher, type User } from '../auth';
import { passed } from '../checks';
import { insertRow, isUniqueViolation, pool, transaction, updateRow } from '../db';
import { bodyOf, conflict, instantOf, oneOf, pageOf, refused, type Body } from '../http';
import { answerOf, getRow, person, sideFilter, type Side } from '../models/base';
import { PUBLISHED, UNPUBLISHABLE, type DocumentModel, type DocumentRow } from '../models/document';

/**
 * The routes every builder shares, written once: /api/emails, /api/articles
 * and /api/forms differ only in their model. Handlers read the request and
 * answer; the work is in the functions below them.
 */
export function documentRouter<D extends EngineDocument, R extends DocumentRow<D>>(
  model: DocumentModel<D, R>,
): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    res.json(await listDocuments(model, req.query));
  });
  router.post('/', async (req, res) => {
    res.status(201).json(await createDocument(model, bodyOf(req), currentUser(req)));
  });
  router.get('/:id', async (req, res) => {
    const row = await getRow<R>(pool, model.table, model.noun, req.params.id);
    res.json(await answerOf(pool, model.table, row.id, model.people));
  });
  router.put('/:id/draft', async (req, res) => {
    res.json(await saveDraft(model, req.params.id, bodyOf(req), currentUser(req)));
  });
  router.post('/:id/publish', async (req, res) => {
    res.json(await publishDocument(model, req.params.id, bodyOf(req), publisher(req)));
  });
  router.post('/:id/unpublish', async (req, res) => {
    res.json(await unpublishDocument(model, req.params.id, publisher(req)));
  });
  router.delete('/:id', async (req, res) => {
    await deleteDocument(model, req.params.id, currentUser(req));
    res.status(204).end();
  });
  router.post('/:id/restore', async (req, res) => {
    res.json(await restoreDocument(model, req.params.id, currentUser(req)));
  });

  return router;
}

/** GET / — `?status=&q=&deleted=true&limit=&offset=`, newest change first. */
async function listDocuments<D extends EngineDocument, R extends DocumentRow<D>>(
  model: DocumentModel<D, R>,
  query: Request['query'],
) {
  const side: Side = query.deleted === 'true' ? 'trash' : 'live';
  const { limit, offset } = pageOf(query);
  const where = [sideFilter(side)];
  const params: unknown[] = [];
  if (oneOf(model.statuses, query.status)) {
    params.push(query.status);
    where.push(`t.status = $${String(params.length)}`);
  }
  if (typeof query.q === 'string' && query.q.trim()) {
    params.push(`%${query.q.trim().replace(/[\\%_]/g, '\\$&')}%`);
    where.push(`t.${model.listColumns[0]} ilike $${String(params.length)}`);
  }
  const filter = where.join(' and ');
  const shown = [
    't.uuid as id',
    ...model.listColumns.map((column) => `t.${column}`),
    't.status',
    't.saved_at',
    't.updated_at',
    person('updated_by_id'),
    ...(side === 'trash' ? ['t.deleted_at', person('deleted_by_id')] : []),
  ];
  const [counted, items] = await Promise.all([
    pool.query<{ total: number }>(
      `select count(*) as total from ${model.table} t where ${filter}`,
      params,
    ),
    pool.query(
      `select ${shown.join(', ')} from ${model.table} t where ${filter}
        order by t.updated_at desc, t.id desc
        limit $${String(params.length + 1)} offset $${String(params.length + 2)}`,
      [...params, limit, offset],
    ),
  ]);
  return { items: items.rows, total: counted.rows[0].total };
}

/** POST / — a new document, as a draft. */
async function createDocument<D extends EngineDocument, R extends DocumentRow<D>>(
  model: DocumentModel<D, R>,
  body: Body,
  actor: User,
) {
  const columns = model.newRow(body, actor);
  const document = passed(model.check(body.document, 'draft', columns));
  try {
    return await transaction(async (client) => {
      const row = await insertRow<R>(client, model.table, {
        ...columns,
        ...model.copies(document),
        document,
        ...createdBy(actor),
      });
      await recordActivity(client, {
        subject: model.table,
        subjectId: row.id,
        action: 'created',
        to: row.status,
        actor,
      });
      return answerOf(client, model.table, row.id, model.people);
    });
  } catch (failure) {
    // Only an article chooses its address when it is made: another live one has it.
    if (isUniqueViolation(failure)) throw refused([error('slug.taken', { path: 'slug' })]);
    throw failure;
  }
}

// #region draft
/**
 * PUT /:id/draft — an autosave or a manual save. Readers still get the live
 * document. The row is locked first, so the saved_at compared is the one
 * overwritten: two saves at the same moment cannot both win.
 */
async function saveDraft<D extends EngineDocument, R extends DocumentRow<D>>(
  model: DocumentModel<D, R>,
  id: string,
  body: Body,
  actor: User,
) {
  return transaction(async (client) => {
    const row = await getRow<R>(client, model.table, model.noun, id, { lock: true });
    // The editor sends back the saved_at it last saw; "keep mine" sends force.
    const expected = instantOf(body.expected_saved_at);
    if (body.force !== true && expected && expected.getTime() !== row.saved_at.getTime())
      throw conflict(`Someone else saved this ${model.noun} since you opened it.`);

    const document = passed(model.check(body.document, 'draft', row));
    const saved = await updateRow<R>(client, model.table, row.id, {
      draft_document: document,
      saved_at: new Date(),
      ...updatedBy(actor),
    });

    if (body.reason === 'manual') {
      const revision = await recordRevision(
        client,
        model.revisions,
        saved,
        { kind: 'manual', document },
        actor,
      );
      await recordActivity(client, {
        subject: model.table,
        subjectId: row.id,
        action: 'saved',
        details: { revision },
        actor,
      });
    } else {
      // Autosaves are not logged: a revision now and then is enough.
      await recordAutosave(client, model.revisions, saved, document, actor);
    }
    return { saved_at: saved.saved_at };
  });
}
// #endregion

// #region publish
/** POST /:id/publish — the strict check, then the document goes live with its revision and log line. */
async function publishDocument<D extends EngineDocument, R extends DocumentRow<D>>(
  model: DocumentModel<D, R>,
  id: string,
  body: Body,
  actor: User,
) {
  const requested = instantOf(body.scheduled_at);
  const scheduledAt = requested && requested.getTime() > Date.now() ? requested : null;
  try {
    return await transaction(async (client) => {
      const row = await getRow<R>(client, model.table, model.noun, id, { lock: true });
      const document = passed(model.check(body.document, 'publish', row));
      const next = model.publish(row, document, scheduledAt);
      await model.beforePublish?.(client, row, actor);

      const published = await updateRow<R>(client, model.table, row.id, {
        ...model.copies(document),
        ...next.columns,
        document,
        draft_document: null,
        status: next.status,
        version: row.version + 1,
        saved_at: new Date(),
        published_by_id: actor.id,
        ...updatedBy(actor),
      });
      const revision = await recordRevision(
        client,
        model.revisions,
        published,
        { kind: 'publish', document },
        actor,
      );
      await recordActivity(client, {
        subject: model.table,
        subjectId: row.id,
        action: next.action,
        from: row.status,
        to: next.status,
        details: { revision, version: published.version },
        actor,
      });
      await recordRenames(client, model, row, published, actor);

      return {
        saved_at: published.saved_at,
        status: published.status,
        published_at: published.published_at,
        // An article also says when it goes live, when it is scheduled.
        ...('scheduled_at' in published ? { scheduled_at: published.scheduled_at } : {}),
      };
    });
  } catch (failure) {
    // Only a form's address can collide on publish: another live form has it.
    if (isUniqueViolation(failure)) throw refused([error('meta.slugTaken', { path: 'meta.slug' })]);
    throw failure;
  }
}
// #endregion

/** The columns a rename changes, logged with what they were. */
const RENAMEABLE = ['name', 'title', 'slug'] as const;

async function recordRenames<D extends EngineDocument, R extends DocumentRow<D>>(
  client: PoolClient,
  model: DocumentModel<D, R>,
  before: R,
  after: R,
  actor: User,
) {
  const was = before as Record<string, unknown>;
  const is = after as Record<string, unknown>;
  const changed = RENAMEABLE.filter((column) => column in was && was[column] !== is[column]);
  if (changed.length === 0) return;
  await recordActivity(client, {
    subject: model.table,
    subjectId: before.id,
    action: 'renamed',
    details: Object.fromEntries(
      changed.map((column) => [column, { from: was[column], to: is[column] }]),
    ),
    actor,
  });
}

/** POST /:id/unpublish — readers no longer get it; the document is kept. */
async function unpublishDocument<D extends EngineDocument, R extends DocumentRow<D>>(
  model: DocumentModel<D, R>,
  id: string,
  actor: User,
) {
  return transaction(async (client) => {
    const row = await getRow<R>(client, model.table, model.noun, id, { lock: true });
    if (!UNPUBLISHABLE.includes(row.status)) return { saved_at: row.saved_at, status: row.status };
    const next = model.unpublish(actor);
    // Only the status changes: saved_at moves only when the document is written.
    const changed = await updateRow<R>(client, model.table, row.id, {
      ...next.columns,
      status: next.status,
      ...updatedBy(actor),
    });
    await recordActivity(client, {
      subject: model.table,
      subjectId: row.id,
      action: next.action,
      from: row.status,
      to: next.status,
      actor,
    });
    return { saved_at: changed.saved_at, status: changed.status };
  });
}

// #region delete
/** DELETE /:id — a soft delete. A published document is refused: unpublish it first. */
async function deleteDocument<D extends EngineDocument, R extends DocumentRow<D>>(
  model: DocumentModel<D, R>,
  id: string,
  actor: User,
) {
  await transaction(async (client) => {
    const row = await getRow<R>(client, model.table, model.noun, id, { lock: true });
    if (row.status === PUBLISHED)
      throw conflict(`This ${model.noun} is live: unpublish it before deleting it.`);
    await softDelete(client, model.table, row, actor);
  });
}

/** POST /:id/restore — out of the trash. 409 when its address was taken meanwhile. */
async function restoreDocument<D extends EngineDocument, R extends DocumentRow<D>>(
  model: DocumentModel<D, R>,
  id: string,
  actor: User,
) {
  return transaction(async (client) => {
    const row = await getRow<R>(client, model.table, model.noun, id, { side: 'trash', lock: true });
    await restore(client, model.table, row, actor);
    return answerOf(client, model.table, row.id, model.people);
  });
}
// #endregion
