// What a document said, and what happened to it:
//   GET  /documents/{kind}/:id/revisions              the editor's versions
//   GET  /documents/{kind}/:id/revisions/:revisionId  one of them, whole
//   POST /documents/{kind}/:id/revisions              a version saved by name
//   GET  /documents/{kind}/:id/activity               your timeline: ?limit
import { present, timelineOf, type Person } from '../_shared/audit.ts';
import { HttpError, intParam, json, notFound, type Json } from '../_shared/http.ts';
import { admin, rowsOf, write } from '../_shared/supabase.ts';
import { liveDocument, type Call } from './call.ts';
import { typeKeyOf } from './documents.ts';
import { checkedDocument, Level, type Kind } from './kinds.ts';

/** Each builder keeps its revisions in its own table, with a real foreign key. */
const revisions = (kind: Kind) => ({
  table: `${kind.table}_revision`,
  parent: `${kind.table}_id`,
});

/** The internal id the history tables point at. */
async function rowIdOf(kind: Kind, id: string): Promise<number> {
  return (await liveDocument<{ id: number }>(kind, id, 'id')).id;
}

export async function listRevisions({ kind, params }: Call) {
  const { table, parent } = revisions(kind);
  const rows = rowsOf<Json[]>(
    await admin
      .from(table)
      .select('uuid, kind, label, version, created_at, created_by')
      .eq(parent, await rowIdOf(kind, params.id))
      .order('created_at', { ascending: false })
      .limit(100),
  );
  // The editor names the author; the rest is as the table has it.
  const answers = await present(rows);
  return json(
    answers.map(({ created_by, ...revision }) => ({
      ...revision,
      author: (created_by as Person | null)?.name ?? null,
    })),
  );
}

export async function getRevision({ kind, params }: Call) {
  const { table, parent } = revisions(kind);
  const revision = rowsOf<{ document: Json } | null>(
    await admin
      .from(table)
      .select('document')
      .eq('uuid', params.revisionId)
      .eq(parent, await rowIdOf(kind, params.id))
      .maybeSingle(),
  );
  if (!revision) throw notFound('version');
  return json({ document: revision.document });
}

export async function saveRevision({ kind, params, body, member }: Call) {
  const document = checkedDocument(
    kind,
    body.document,
    Level.draft,
    await typeKeyOf(kind, params.id),
  );
  const label = typeof body.label === 'string' ? body.label.trim() : '';
  if (label.length > 120) throw new HttpError(400, 'A version’s name is 120 characters at most.');
  const id = await write<string>('save_revision', {
    p_table: kind.table,
    p_uuid: params.id,
    p_document: document,
    p_label: label || null,
    p_actor: member.id,
  });
  return json({ id }, 201);
}

export async function activity({ kind, params, query }: Call) {
  const limit = intParam(query, 'limit', { fallback: 50, min: 1, max: 200 });
  return json(await timelineOf(kind.table, await rowIdOf(kind, params.id), limit));
}
