// The audit work every write shares: stamping who did it, and appending the
// activity line. Both go through the write's own transaction.
import { and, desc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import { activity, appUser, type Action, type AppUser, type SubjectType } from '@/db/schema';
import { db, type Transaction } from '@/lib/db';

/** The actor columns of a new row. */
export const createdBy = (user: AppUser) => ({ createdById: user.id, updatedById: user.id });

/** The actor column of any change. `updated_at` follows by itself. */
export const updatedBy = (user: AppUser) => ({ updatedById: user.id });

/** A soft delete: the row stays, so it can be restored and its history still reads. */
export const deletedBy = (user: AppUser) => ({
  deletedAt: new Date(),
  deletedById: user.id,
  updatedById: user.id,
});

export const restoredBy = (user: AppUser) => ({
  deletedAt: null,
  deletedById: null,
  updatedById: user.id,
});

/** A person as answers name them: their public id and name. Null when nobody, or removed. */
export type Person = { id: string; name: string } | null;

/**
 * The users table under another name, to join it once per column
 * (`created_by_id`, `updated_by_id`, …) and select that person.
 */
export function joinedPerson(name: string) {
  const table = alias(appUser, name);
  return { table, person: { id: table.uuid, name: table.name } };
}

export interface ActivityEntry {
  subjectType: SubjectType;
  subjectId: number;
  action: Action;
  fromStatus?: string | null;
  toStatus?: string | null;
  details?: Record<string, unknown>;
}

/** Appends one line to the log. Never for an autosave. */
export async function recordActivity(tx: Transaction, actor: AppUser | null, entry: ActivityEntry) {
  await tx.insert(activity).values({ ...entry, actorId: actor?.id ?? null });
}

/** One row's timeline, newest first, as `GET …/activity` answers it. */
export async function timeline(subjectType: SubjectType, subjectId: number, limit: number) {
  const actor = joinedPerson('actor');
  const rows = await db
    .select({ entry: activity, actor: actor.person })
    .from(activity)
    .leftJoin(actor.table, eq(actor.table.id, activity.actorId))
    .where(and(eq(activity.subjectType, subjectType), eq(activity.subjectId, subjectId)))
    .orderBy(desc(activity.createdAt), desc(activity.id))
    .limit(limit);
  return rows.map(({ entry, actor }) => ({
    id: entry.uuid,
    action: entry.action,
    from_status: entry.fromStatus,
    to_status: entry.toStatus,
    details: entry.details,
    actor,
    created_at: entry.createdAt,
  }));
}
