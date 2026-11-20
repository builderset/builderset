import type { QueryResultRow } from 'pg';

import type { Db } from '../db';
import { notFound } from '../http';

/**
 * What every table shares. `id` is for joins and never leaves the server;
 * `uuid` is the only id in URLs and answers, where it is called `id`. Then
 * who made the row, changed it and deleted it, and when.
 */
export interface Audited {
  id: number;
  uuid: string;
  created_at: Date;
  created_by_id: number | null;
  /** Kept by the touch_updated_at trigger on every change. */
  updated_at: Date;
  updated_by_id: number | null;
  /** Null while the row is live. */
  deleted_at: Date | null;
  deleted_by_id: number | null;
}

/** Every table with the audit columns. The activity log names a row by its table. */
export const AUDITED_TABLES = [
  'email_template',
  'article',
  'form',
  'form_response',
  'saved_section',
  'media',
] as const;
export type AuditedTable = (typeof AUDITED_TABLES)[number];

/** The columns that point at a person. Each is answered as `{ id, name }` under its name without `_id`. */
export type PersonColumn =
  | 'created_by_id'
  | 'updated_by_id'
  | 'deleted_by_id'
  | 'published_by_id'
  | 'closed_by_id'
  | 'author_id';

export const AUDIT_PEOPLE: readonly PersonColumn[] = [
  'created_by_id',
  'updated_by_id',
  'deleted_by_id',
];

/** A person in an answer: their public id and their name, or null. */
export type PersonRef = { id: string; name: string } | null;

/** SQL for one person column of `t`, as `{ id, name }`. Null once the person is removed. */
export function person(column: PersonColumn): string {
  const name = column.replace(/_id$/, '');
  return `(select json_build_object('id', u.uuid, 'name', u.name)
             from app_user u where u.id = t.${column}) as ${name}`;
}

/** A row as the API shows it: `uuid` as `id`, and no internal ids at all. */
export function toAnswer(row: Record<string, unknown>): Record<string, unknown> {
  const { id: _internal, uuid, ...rest } = row;
  const shown = Object.entries(rest).filter(([name]) => !name.endsWith('_id'));
  return { id: uuid, ...Object.fromEntries(shown) };
}

// ── Soft delete ──────────────────────────────────────────────────────────────
// Deleting stamps deleted_at; the row stays. So every query names which side
// it reads: the live rows (everything), or the trash (its list and restore).

export type Side = 'live' | 'trash';

export const sideFilter = (side: Side) =>
  side === 'live' ? 't.deleted_at is null' : 't.deleted_at is not null';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Whether a public id looks like one: anything else finds nothing, without asking Postgres. */
export const isUuid = (value: string) => UUID.test(value);

interface FindOptions {
  side?: Side;
  /** Lock the row until the transaction ends: what is checked is what is written. */
  lock?: boolean;
  /** Narrow to rows of one parent or one kind: `{ form_id: 3 }`. */
  where?: Record<string, unknown>;
}

/** One row by its public id, or null. A uuid that is not one finds nothing. */
export async function findRow<R extends QueryResultRow>(
  db: Db,
  table: AuditedTable,
  uuid: string,
  { side = 'live', lock = false, where = {} }: FindOptions = {},
): Promise<R | null> {
  if (!isUuid(uuid)) return null;
  const extra = Object.keys(where).map((name, index) => ` and t.${name} = $${String(index + 2)}`);
  const { rows } = await db.query<R>(
    `select * from ${table} t
      where t.uuid = $1 and ${sideFilter(side)}${extra.join('')}
      ${lock ? 'for update' : ''}`,
    [uuid, ...Object.values(where)],
  );
  return rows[0] ?? null;
}

/** As findRow, and 404 when there is no such row. */
export async function getRow<R extends QueryResultRow>(
  db: Db,
  table: AuditedTable,
  noun: string,
  uuid: string,
  options?: FindOptions,
): Promise<R> {
  const row = await findRow<R>(db, table, uuid, options);
  if (!row) throw notFound(noun);
  return row;
}

/** A row, by its internal id, as the API shows it: people as `{ id, name }`. */
export async function answerOf(
  db: Db,
  table: AuditedTable,
  id: number,
  people: readonly PersonColumn[] = AUDIT_PEOPLE,
) {
  const { rows } = await db.query(
    `select t.*, ${people.map(person).join(', ')} from ${table} t where t.id = $1`,
    [id],
  );
  return toAnswer(rows[0] as Record<string, unknown>);
}
