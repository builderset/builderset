// The email templates: every read and write the routes make. Each write is one
// transaction: the row with who made the change, a revision on a manual save
// or a publish, and an activity line for anything but an autosave.
import type { EmailDocument } from '@builderset/email';

import { Prisma, type AppUser, type EmailTemplate } from '@/generated/prisma/client';
import {
  createdBy,
  deletedBy,
  live,
  personColumns,
  personOf,
  recordActivity,
  restoredBy,
  updatedBy,
  type Transaction,
} from '@/lib/audit';
import { prisma } from '@/lib/db';
import { nameOf, toJson } from '@/lib/email-check';
import { conflict, isUuid, notFound } from '@/lib/http';
import type { EmailStatus, RevisionKind } from '@/lib/vocabulary';

const SUBJECT = 'email_template';

// ── Reading ──────────────────────────────────────────────────────────────────

const withPeople = {
  createdBy: personColumns,
  updatedBy: personColumns,
  publishedBy: personColumns,
  deletedBy: personColumns,
} satisfies Prisma.EmailTemplateInclude;

type EmailWithPeople = Prisma.EmailTemplateGetPayload<{ include: typeof withPeople }>;

/** One template as `GET /api/emails/:id` answers it: its public id, people as `{ id, name }`. */
function recordOf(row: EmailWithPeople) {
  return {
    id: row.uuid,
    name: row.name,
    type_key: row.typeKey,
    status: row.status,
    document: row.document,
    draft_document: row.draftDocument,
    saved_at: row.savedAt,
    version: row.version,
    published_at: row.publishedAt,
    published_by: personOf(row.publishedBy),
    created_at: row.createdAt,
    created_by: personOf(row.createdBy),
    updated_at: row.updatedAt,
    updated_by: personOf(row.updatedBy),
    deleted_at: row.deletedAt,
    deleted_by: personOf(row.deletedBy),
  };
}

/** A live template, for the editor. A deleted one is a 404, as if it never was. */
export async function getEmail(id: string) {
  if (!isUuid(id)) throw notFound();
  const row = await prisma.emailTemplate.findFirst({
    where: { uuid: id, ...live },
    include: withPeople,
  });
  if (!row) throw notFound();
  return recordOf(row);
}

/** A live template's row, for the routes that only read it: sending, history. */
export async function findLive(id: string): Promise<EmailTemplate> {
  if (!isUuid(id)) throw notFound();
  const row = await prisma.emailTemplate.findFirst({ where: { uuid: id, ...live } });
  if (!row) throw notFound();
  return row;
}

export interface ListQuery {
  status: EmailStatus | null;
  /** Part of the name. */
  q: string | null;
  /** The trash instead of the live templates. */
  deleted: boolean;
  limit: number;
  offset: number;
}

/** `GET /api/emails`: a page of templates, newest change first, and how many there are. */
export async function listEmails(query: ListQuery) {
  const where: Prisma.EmailTemplateWhereInput = {
    deletedAt: query.deleted ? { not: null } : null,
    ...(query.status ? { status: query.status } : {}),
    ...(query.q ? { name: { contains: query.q, mode: 'insensitive' } } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.emailTemplate.findMany({
      where,
      select: {
        uuid: true,
        name: true,
        status: true,
        savedAt: true,
        updatedAt: true,
        deletedAt: true,
        updatedBy: personColumns,
        deletedBy: personColumns,
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: query.limit,
      skip: query.offset,
    }),
    prisma.emailTemplate.count({ where }),
  ]);
  return {
    items: rows.map((row) => ({
      id: row.uuid,
      name: row.name,
      status: row.status,
      saved_at: row.savedAt,
      updated_at: row.updatedAt,
      updated_by: personOf(row.updatedBy),
      deleted_at: row.deletedAt,
      deleted_by: personOf(row.deletedBy),
    })),
    total,
  };
}

// ── Writing ──────────────────────────────────────────────────────────────────

/** The live row, locked until the transaction ends: two writes to one template take turns. */
export async function lockLive(tx: Transaction, id: string): Promise<EmailTemplate> {
  if (!isUuid(id)) throw notFound();
  // Prisma has no `for update`; this line of SQL takes the lock.
  await tx.$queryRaw`select 1 from email_template where uuid = ${id}::uuid for update`;
  const row = await tx.emailTemplate.findFirst({ where: { uuid: id, ...live } });
  if (!row) throw notFound();
  return row;
}

/** A version to come back to: the template's `version` then. Written once, never changed. */
export async function addRevision(
  tx: Transaction,
  template: EmailTemplate,
  kind: RevisionKind,
  document: EmailDocument,
  user: AppUser,
  label: string | null = null,
) {
  return tx.emailTemplateRevision.create({
    data: {
      emailTemplateId: template.id,
      kind,
      label,
      version: template.version,
      document: toJson(document),
      createdById: user.id,
    },
  });
}

/** `POST /api/emails`: a new template, as a draft. */
export async function createEmail(document: EmailDocument, typeKey: string | null, user: AppUser) {
  const id = await prisma.$transaction(async (tx) => {
    const row = await tx.emailTemplate.create({
      data: { name: nameOf(document), typeKey, document: toJson(document), ...createdBy(user) },
    });
    await recordActivity(tx, user, {
      subjectType: SUBJECT,
      subjectId: row.id,
      action: 'created',
      toStatus: row.status,
    });
    return row.uuid;
  });
  return getEmail(id);
}

// #region draft
export interface DraftSave {
  document: EmailDocument;
  /** An autosave is a draft and no more; a manual save is also a version to come back to. */
  reason: 'autosave' | 'manual';
  /** The `saved_at` the editor last saw. Without it, only `force` saves. */
  expectedSavedAt: Date | null;
  /** "Keep mine": save over someone else's save. */
  force: boolean;
}

/** `PUT /api/emails/:id/draft`. Readers still get the live document. */
export async function saveDraft(id: string, save: DraftSave, user: AppUser) {
  return prisma.$transaction(async (tx) => {
    const row = await lockLive(tx, id);
    // Another saved_at than the one the editor saw: someone else saved in
    // between. A save that names none cannot tell, so it is stale too.
    const stale = save.expectedSavedAt?.getTime() !== row.savedAt.getTime();
    if (stale && !save.force)
      throw conflict('Someone else saved this template since you opened it.');
    const saved = await tx.emailTemplate.update({
      where: { id: row.id },
      data: { draftDocument: toJson(save.document), savedAt: new Date(), ...updatedBy(user) },
    });
    if (save.reason === 'manual') {
      const revision = await addRevision(tx, row, 'manual', save.document, user);
      await recordActivity(tx, user, {
        subjectType: SUBJECT,
        subjectId: row.id,
        action: 'saved',
        details: { revision: revision.uuid },
      });
    }
    return { saved_at: saved.savedAt };
  });
}

// #endregion

// #region publish
/** `POST /api/emails/:id/publish`: the checked document goes live, as the next version. */
export async function publishEmail(id: string, document: EmailDocument, user: AppUser) {
  return prisma.$transaction(async (tx) => {
    const row = await lockLive(tx, id);
    await retireActive(tx, row, user);
    const now = new Date();
    const published = await tx.emailTemplate.update({
      where: { id: row.id },
      data: {
        name: nameOf(document),
        document: toJson(document),
        // SQL NULL; a plain null would be stored as the JSON value null.
        draftDocument: Prisma.DbNull,
        status: 'published' satisfies EmailStatus,
        version: { increment: 1 },
        savedAt: now,
        publishedAt: now,
        publishedById: user.id,
        ...updatedBy(user),
      },
    });
    await addRevision(tx, published, 'publish', document, user);
    await recordActivity(tx, user, {
      subjectType: SUBJECT,
      subjectId: row.id,
      action: 'published',
      fromStatus: row.status,
      toStatus: published.status,
      details: { version: published.version },
    });
    return {
      saved_at: published.savedAt,
      status: published.status,
      published_at: published.publishedAt,
    };
  });
}

/** One active design per email type: the one published before goes back to draft. */
async function retireActive(tx: Transaction, template: EmailTemplate, user: AppUser) {
  if (template.typeKey === null) return;
  const retired = await tx.emailTemplate.updateManyAndReturn({
    where: {
      typeKey: template.typeKey,
      status: 'published' satisfies EmailStatus,
      ...live,
      id: { not: template.id },
    },
    data: { status: 'draft' satisfies EmailStatus, ...updatedBy(user) },
    select: { id: true },
  });
  for (const { id } of retired) {
    await recordActivity(tx, user, {
      subjectType: SUBJECT,
      subjectId: id,
      action: 'unpublished',
      fromStatus: 'published',
      toStatus: 'draft',
      details: { replaced_by: template.uuid },
    });
  }
}

// #endregion

/** `POST /api/emails/:id/unpublish`: back to a draft, so the mailer no longer sends it. */
export async function unpublishEmail(id: string, user: AppUser) {
  return prisma.$transaction(async (tx) => {
    const row = await lockLive(tx, id);
    if (row.status === 'published') {
      await tx.emailTemplate.update({
        where: { id: row.id },
        data: { status: 'draft' satisfies EmailStatus, ...updatedBy(user) },
      });
      await recordActivity(tx, user, {
        subjectType: SUBJECT,
        subjectId: row.id,
        action: 'unpublished',
        fromStatus: 'published',
        toStatus: 'draft',
      });
    }
    // The document did not change, so neither does saved_at.
    return { saved_at: row.savedAt, status: 'draft' satisfies EmailStatus };
  });
}

// #region trash
/** `DELETE /api/emails/:id`: a soft delete, into the trash. */
export async function deleteEmail(id: string, user: AppUser) {
  await prisma.$transaction(async (tx) => {
    const row = await lockLive(tx, id);
    // A published design is what the mailer sends: deleting it would stop the emails.
    if (row.status === 'published')
      throw conflict('This template is published: unpublish it first.');
    await tx.emailTemplate.update({ where: { id: row.id }, data: deletedBy(user) });
    await recordActivity(tx, user, {
      subjectType: SUBJECT,
      subjectId: row.id,
      action: 'deleted',
      fromStatus: row.status,
    });
  });
}

/** `POST /api/emails/:id/restore`: out of the trash, as it was. */
export async function restoreEmail(id: string, user: AppUser) {
  if (!isUuid(id)) throw notFound();
  await prisma.$transaction(async (tx) => {
    // Only a draft is ever deleted, so the one-active-per-type index cannot refuse this.
    const [row] = await tx.emailTemplate.updateManyAndReturn({
      where: { uuid: id, deletedAt: { not: null } },
      data: restoredBy(user),
    });
    if (!row) throw notFound();
    await recordActivity(tx, user, {
      subjectType: SUBJECT,
      subjectId: row.id,
      action: 'restored',
      toStatus: row.status,
    });
  });
  return getEmail(id);
}
// #endregion
