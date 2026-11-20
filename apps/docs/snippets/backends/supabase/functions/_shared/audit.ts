// The audit columns in answers, and the writes every audited table shares.
import type { Member } from './auth.ts';
import type { Json } from './http.ts';
import { admin, rowsOf, write } from './supabase.ts';

/** The tables with the full audit columns: each can be deleted and restored. */
export type AuditedTable =
  'email_template' | 'article' | 'form' | 'form_response' | 'saved_section' | 'media';

/** A person in an answer. */
export interface Person {
  id: string;
  name: string;
}

/** The columns that hold a user id, and the field each becomes in an answer. */
const PEOPLE: Record<string, string> = {
  created_by: 'created_by',
  updated_by: 'updated_by',
  deleted_by: 'deleted_by',
  published_by: 'published_by',
  closed_by: 'closed_by',
  author_id: 'author',
  actor_id: 'actor',
};

/** The names of the people in some rows, from profiles: one query for a whole list. */
async function namesIn(rows: readonly Json[]): Promise<Map<string, string>> {
  const ids = new Set<string>();
  for (const row of rows)
    for (const column of Object.keys(PEOPLE)) {
      const value = row[column];
      if (typeof value === 'string') ids.add(value);
    }
  if (ids.size === 0) return new Map();
  const profiles = rowsOf<Person[]>(
    await admin
      .from('profiles')
      .select('id, name')
      .in('id', [...ids]),
  );
  return new Map(profiles.map((profile) => [profile.id, profile.name]));
}

/**
 * Rows as the API shows them: the uuid is the `id`, the internal id stays
 * here, and a user id becomes `{ id, name }`, or null. Someone no longer on
 * the team keeps their id and loses their name.
 */
export async function present(rows: readonly Json[]): Promise<Json[]> {
  const names = await namesIn(rows);
  return rows.map((row) => {
    const answer: Json = {};
    for (const [column, value] of Object.entries(row)) {
      if (column === 'id') continue;
      if (column === 'uuid') answer.id = value;
      else if (Object.hasOwn(PEOPLE, column))
        answer[PEOPLE[column]] =
          typeof value === 'string' ? { id: value, name: names.get(value) ?? '' } : null;
      else answer[column] = value;
    }
    return answer;
  });
}

export async function presentOne(row: Json): Promise<Json> {
  const [answer] = await present([row]);
  return answer;
}

/** Stamps deleted_at and deleted_by. A live document answers 409: unpublish it first. */
export const softDelete = (table: AuditedTable, id: string, actor: Member) =>
  write<null>('soft_delete', { p_table: table, p_uuid: id, p_actor: actor.id });

/** Clears them again. 409 when another live row took the address meanwhile. */
export const restore = (table: AuditedTable, id: string, actor: Member) =>
  write<null>('restore_deleted', { p_table: table, p_uuid: id, p_actor: actor.id });

/** One row's history, newest first: what happened, from which status to which, and who did it. */
export async function timelineOf(table: AuditedTable, rowId: number, limit: number) {
  const rows = rowsOf<Json[]>(
    await admin
      .from('activity')
      .select('uuid, action, from_status, to_status, details, actor_id, created_at')
      .eq('subject_type', table)
      .eq('subject_id', rowId)
      // One write logs its lines at the same instant; the id keeps their order.
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit),
  );
  return present(rows);
}
