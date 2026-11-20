// The audit work every write shares: stamping who did it, and appending the
// activity line. Both go through the write's own transaction.
import type { AppUser, Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/db';
import type { Action, SubjectType } from '@/lib/vocabulary';

/** What `prisma.$transaction` hands its callback: every write of one request goes through it. */
export type Transaction = Prisma.TransactionClient;

/** The actor columns of a new row. */
export const createdBy = (user: AppUser) => ({ createdById: user.id, updatedById: user.id });

/** The actor column of any change. `updatedAt` follows by itself (`@updatedAt`). */
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

/** Live rows only. Every query on a table with `deletedAt` uses it, except the trash. */
export const live = { deletedAt: null } as const;

/** A person as answers name them: their public id and name. Null when nobody, or removed. */
export type Person = { id: string; name: string } | null;

/** The columns a relation to a person selects, for `include`. */
export const personColumns = { select: { uuid: true, name: true } } as const;

export const personOf = (user: { uuid: string; name: string } | null): Person =>
  user ? { id: user.uuid, name: user.name } : null;

export interface ActivityEntry {
  subjectType: SubjectType;
  subjectId: bigint;
  action: Action;
  fromStatus?: string | null;
  toStatus?: string | null;
  details?: Prisma.InputJsonObject;
}

/** Appends one line to the log. Never for an autosave. */
export async function recordActivity(tx: Transaction, actor: AppUser | null, entry: ActivityEntry) {
  await tx.activity.create({ data: { ...entry, actorId: actor?.id ?? null } });
}

/** One row's timeline, newest first, as `GET …/activity` answers it. */
export async function timeline(subjectType: SubjectType, subjectId: bigint, limit: number) {
  const entries = await prisma.activity.findMany({
    where: { subjectType, subjectId },
    include: { actor: personColumns },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit,
  });
  return entries.map((entry) => ({
    id: entry.uuid,
    action: entry.action,
    from_status: entry.fromStatus,
    to_status: entry.toStatus,
    details: entry.details,
    actor: personOf(entry.actor),
    created_at: entry.createdAt,
  }));
}
