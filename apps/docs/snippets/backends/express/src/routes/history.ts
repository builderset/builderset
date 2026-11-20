import type { EngineDocument } from '@builderset/engine';
import { Router } from 'express';

import { recordActivity, recordRevision } from '../audit';
import { currentUser } from '../auth';
import { passed } from '../checks';
import { pool, transaction } from '../db';
import { bodyOf, notFound, pageOf, textOf } from '../http';
import { timelineOf } from '../models/activity';
import { getRow, isUuid } from '../models/base';
import type { DocumentModel, DocumentRow, RevisionKind } from '../models/document';

/** A revision in the editor's list. `author` is a name: the editor shows it as is. */
interface RevisionSummary {
  id: string;
  kind: RevisionKind;
  label: string | null;
  version: number;
  created_at: Date;
  author: string | null;
}

/**
 * A document's two histories: its revisions (what it said) and its activity
 * (what happened to it). A deleted document has neither: 404, as everywhere.
 */
export function historyRouter<D extends EngineDocument, R extends DocumentRow<D>>(
  model: DocumentModel<D, R>,
): Router {
  const router = Router();
  const { table, parent } = model.revisions;
  const findDocument = (id: string) => getRow<R>(pool, model.table, model.noun, id);

  /** GET /:id/revisions — the editor's loadRevisions, newest first. */
  router.get('/:id/revisions', async (req, res) => {
    const row = await findDocument(req.params.id);
    const { rows } = await pool.query<RevisionSummary>(
      `select r.uuid as id, r.kind, r.label, r.version, r.created_at, u.name as author
         from ${table} r
         left join app_user u on u.id = r.created_by_id
        where r.${parent} = $1
        order by r.created_at desc, r.id desc
        limit 100`,
      [row.id],
    );
    res.json(rows);
  });

  /** GET /:id/revisions/:rid — the editor's loadRevision. */
  router.get('/:id/revisions/:rid', async (req, res) => {
    const row = await findDocument(req.params.id);
    const { rows } = isUuid(req.params.rid)
      ? await pool.query<{ document: D }>(
          `select document from ${table} where uuid = $1 and ${parent} = $2`,
          [req.params.rid, row.id],
        )
      : { rows: [] };
    if (!rows[0]) throw notFound('revision');
    res.json({ document: rows[0].document });
  });

  /** POST /:id/revisions — the editor's saveRevision: a version someone named. */
  router.post('/:id/revisions', async (req, res) => {
    const actor = currentUser(req);
    const body = bodyOf(req);
    const label = textOf(body.label, 120);
    const id = await transaction(async (client) => {
      const row = await getRow<R>(client, model.table, model.noun, req.params.id);
      const document = passed(model.check(body.document, 'draft', row));
      const revision = await recordRevision(
        client,
        model.revisions,
        row,
        { kind: 'manual', document, label },
        actor,
      );
      await recordActivity(client, {
        subject: model.table,
        subjectId: row.id,
        action: 'saved',
        details: { revision, label },
        actor,
      });
      return revision;
    });
    res.status(201).json({ id });
  });

  /** GET /:id/activity — the document's timeline, for a History panel. */
  router.get('/:id/activity', async (req, res) => {
    const row = await findDocument(req.params.id);
    res.json(await timelineOf(pool, model.table, row.id, pageOf(req.query).limit));
  });

  return router;
}
