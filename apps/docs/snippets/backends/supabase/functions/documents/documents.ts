// The documents themselves, the same for emails, articles and forms:
//   GET    /documents/{kind}                 your list: ?status, q, deleted=true, limit, offset
//   POST   /documents/{kind}                 your "New"
//   GET    /documents/{kind}/:id             what the editor reloads
//   PUT    /documents/{kind}/:id/draft       the editor's save
//   POST   /documents/{kind}/:id/publish
//   POST   /documents/{kind}/:id/unpublish
//   DELETE /documents/{kind}/:id             to the trash
//   POST   /documents/{kind}/:id/restore     out of it
import { error as issue } from 'npm:@builderset/engine@0.4.0';

import { present, presentOne, restore, softDelete } from '../_shared/audit.ts';
import {
  HttpError,
  intParam,
  isPostgresError,
  json,
  noContent,
  timeParam,
  UNIQUE_VIOLATION,
  type Json,
} from '../_shared/http.ts';
import { admin, rowsOf, write } from '../_shared/supabase.ts';
import { liveDocument, type Call } from './call.ts';
import { checkedDocument, Level, type Kind } from './kinds.ts';

/** The editor saves on its own (`autosave`) or when asked (`manual`); only the second is kept as a revision. */
const SaveReason = { autosave: 'autosave', manual: 'manual' } as const;

/** The whole row, as the editor and your screens read it. */
async function documentAnswer(kind: Kind, id: string): Promise<Json> {
  return presentOne(await liveDocument(kind, id, '*'));
}

/** An email is checked against its type's variables; the others need nothing from the row. */
export async function typeKeyOf(kind: Kind, id: string): Promise<string | null> {
  if (kind.table !== 'email_template') return null;
  const row = await liveDocument<{ type_key: string | null }>(kind, id, 'type_key');
  return row.type_key;
}

export async function list({ kind, query }: Call) {
  const trash = query.get('deleted') === 'true';
  const limit = intParam(query, 'limit', { fallback: 50, min: 1, max: 200 });
  const offset = intParam(query, 'offset', { fallback: 0, min: 0, max: Number.MAX_SAFE_INTEGER });

  // `name:title` reads an article's title as its name.
  const columns = `uuid, name:${kind.nameColumn}, status, saved_at, updated_at, updated_by`;
  let rows = admin
    .from(kind.table)
    .select(trash ? `${columns}, deleted_at, deleted_by` : columns, { count: 'exact' });
  rows = trash ? rows.not('deleted_at', 'is', null) : rows.is('deleted_at', null);

  const status = query.get('status');
  if (status !== null) {
    if (!kind.statuses.includes(status))
      throw new HttpError(400, `The status is one of: ${kind.statuses.join(', ')}.`);
    rows = rows.eq('status', status);
  }
  const search = query.get('q')?.trim();
  if (search) rows = rows.ilike(kind.nameColumn, `%${search.replace(/[\\%_]/g, '\\$&')}%`);

  const page = await rows
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);
  return json({ items: await present(rowsOf<Json[]>(page)), total: page.count ?? 0 });
}

export async function create({ kind, body, member }: Call) {
  const columns = kind.newColumns(body);
  const typeKey = typeof columns.p_type_key === 'string' ? columns.p_type_key : null;
  const document = checkedDocument(kind, body.document, Level.draft, typeKey);
  const id = await write<string>('create_document', {
    p_table: kind.table,
    p_document: document,
    p_actor: member.id,
    ...columns,
  });
  return json(await documentAnswer(kind, id), 201);
}

export async function get({ kind, params }: Call) {
  return json(await documentAnswer(kind, params.id));
}

export async function saveDraft({ kind, params, body, member }: Call) {
  const document = checkedDocument(
    kind,
    body.document,
    Level.draft,
    await typeKeyOf(kind, params.id),
  );
  // The saved_at the editor last saw: another one on the row, or none, is a
  // 409. "Keep mine" sends force, and the save goes in over the other.
  const savedAt = await write<string>('save_draft', {
    p_table: kind.table,
    p_uuid: params.id,
    p_document: document,
    p_expected_saved_at: timeParam(body, 'expected_saved_at'),
    p_force: body.force === true,
    p_manual: body.reason === SaveReason.manual,
    p_actor: member.id,
  });
  return json({ saved_at: savedAt });
}

export async function publish({ kind, params, body, member }: Call) {
  const document = checkedDocument(
    kind,
    body.document,
    Level.publish,
    await typeKeyOf(kind, params.id),
  );
  try {
    const answer = await write<Json>('publish_document', {
      p_table: kind.table,
      p_uuid: params.id,
      p_document: document,
      p_actor: member.id,
      // Only an article waits; a time already past publishes now.
      p_scheduled_at: kind.schedules ? timeParam(body, 'scheduled_at') : null,
    });
    return json(answer);
  } catch (error) {
    // Publishing copies a form's slug, and another live form may have it.
    if (kind.table === 'form' && isPostgresError(error) && error.code === UNIQUE_VIOLATION)
      throw new HttpError(422, 'That address is taken.', {
        issues: [issue('meta.slugTaken', { path: 'meta.slug' })],
      });
    throw error;
  }
}

export async function unpublish({ kind, params, member }: Call) {
  const answer = await write<Json>('unpublish_document', {
    p_table: kind.table,
    p_uuid: params.id,
    p_actor: member.id,
  });
  return json(answer);
}

export async function remove({ kind, params, member }: Call) {
  await softDelete(kind.table, params.id, member);
  return noContent();
}

export async function restoreFromTrash({ kind, params, member }: Call) {
  await restore(kind.table, params.id, member);
  return json(await documentAnswer(kind, params.id));
}
