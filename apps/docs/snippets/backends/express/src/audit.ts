import type { PoolClient } from 'pg';

import type { User } from './auth';
import { type Columns, type Db, insertRow, updateRow } from './db';
import type { Action, SubjectType } from './models/activity';
import type { Audited } from './models/base';
import type { RevisionKind, RevisionTarget } from './models/document';

/**
 * The audit work every write shares: who to stamp on the row, the activity
 * line, the revision, and the soft delete and its undoing. The routes call
 * these inside their transaction, so the row and its history are written
 * together or not at all.
 */

/** The actor columns of a new row. Never taken from the request. */
export const createdBy = (actor: User | null): Columns => ({
  created_by_id: actor?.id ?? null,
  updated_by_id: actor?.id ?? null,
});

/** The actor column of a change. updated_at is the trigger's. */
export const updatedBy = (actor: User | null): Columns => ({ updated_by_id: actor?.id ?? null });

export interface ActivityEntry {
  subject: SubjectType;
  subjectId: number;
  action: Action;
  from?: string | null;
  to?: string | null;
  details?: Record<string, unknown>;
  /** Null for a job, or a visitor. */
  actor: User | null;
}

/** Append one line to the activity log. */
export async function recordActivity(db: Db, entry: ActivityEntry): Promise<void> {
  await insertRow(db, 'activity', {
    subject_type: entry.subject,
    subject_id: entry.subjectId,
    action: entry.action,
    from_status: entry.from ?? null,
    to_status: entry.to ?? null,
    details: entry.details ?? {},
    actor_id: entry.actor?.id ?? null,
  });
}

/** Keep a version of a document. Returns the revision's public id. */
export async function recordRevision(
  db: Db,
  target: RevisionTarget,
  row: { id: number; version: number },
  revision: { kind: RevisionKind; document: unknown; label?: string | null },
  actor: User,
): Promise<string> {
  const saved = await insertRow<{ uuid: string }>(db, target.table, {
    [target.parent]: row.id,
    kind: revision.kind,
    label: revision.label ?? null,
    version: row.version,
    document: revision.document,
    created_by_id: actor.id,
  });
  return saved.uuid;
}

/**
 * An autosave becomes a revision at most every ten minutes: enough to go back
 * to, without a whole document every few seconds of typing.
 */
export async function recordAutosave(
  db: Db,
  target: RevisionTarget,
  row: { id: number; version: number },
  document: unknown,
  actor: User,
): Promise<void> {
  const { rows } = await db.query(
    `select 1 from ${target.table}
      where ${target.parent} = $1 and kind = 'autosave'
        and created_at > now() - interval '10 minutes'
      limit 1`,
    [row.id],
  );
  if (rows.length === 0)
    await recordRevision(db, target, row, { kind: 'autosave', document }, actor);
}

type SoftDeletable = Audited & { status?: string };

/** Stamp who deleted the row and when; the row stays, and so does its history. */
export async function softDelete(
  client: PoolClient,
  subject: SubjectType,
  row: SoftDeletable,
  actor: User,
): Promise<void> {
  await updateRow(client, subject, row.id, {
    deleted_at: new Date(),
    deleted_by_id: actor.id,
    ...updatedBy(actor),
  });
  await recordActivity(client, {
    subject,
    subjectId: row.id,
    action: 'deleted',
    from: row.status ?? null,
    actor,
  });
}

/**
 * Bring a deleted row back. A partial unique index refuses it when another
 * live row took its address meanwhile; the error middleware answers that 409.
 */
export async function restore<R extends SoftDeletable>(
  client: PoolClient,
  subject: SubjectType,
  row: R,
  actor: User,
): Promise<R> {
  const restored = await updateRow<R>(client, subject, row.id, {
    deleted_at: null,
    deleted_by_id: null,
    ...updatedBy(actor),
  });
  await recordActivity(client, {
    subject,
    subjectId: row.id,
    action: 'restored',
    to: row.status ?? null,
    actor,
  });
  return restored;
}
