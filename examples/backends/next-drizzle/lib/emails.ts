// The email templates: every read and write the routes make. Each write is one
// transaction: the row with who made the change, a revision on a manual save
// or a publish, and an activity line for anything but an autosave.
import type { EmailDocument } from '@builderset/email';
import { and, count, desc, eq, ilike, isNotNull, ne, type SQL } from 'drizzle-orm';

import {
  emailTemplate,
  emailTemplateRevision,
  isLive,
  type AppUser,
  type EmailStatus,
  type EmailTemplate,
  type RevisionKind,
} from '@/db/schema';
import {
  createdBy,
  deletedBy,
  joinedPerson,
  recordActivity,
  restoredBy,
  updatedBy,
  type Person,
} from '@/lib/audit';
import { db, type Transaction } from '@/lib/db';
import { nameOf } from '@/lib/email-check';
import { conflict, isUuid, notFound } from '@/lib/http';

const SUBJECT = 'email_template';

// ── Reading ──────────────────────────────────────────────────────────────────

const people = {
  createdBy: joinedPerson('created_by'),
  updatedBy: joinedPerson('updated_by'),
  publishedBy: joinedPerson('published_by'),
  deletedBy: joinedPerson('deleted_by'),
};

/** One template as `GET /api/emails/:id` answers it: its public id, people as `{ id, name }`. */
function recordOf(row: EmailTemplate, by: Record<keyof typeof people, Person>) {
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
    published_by: by.publishedBy,
    created_at: row.createdAt,
    created_by: by.createdBy,
    updated_at: row.updatedAt,
    updated_by: by.updatedBy,
    deleted_at: row.deletedAt,
    deleted_by: by.deletedBy,
  };
}

/** A template and the people its columns name. */
async function readRecord(where: SQL | undefined) {
  const [found] = await db
    .select({
      row: emailTemplate,
      createdBy: people.createdBy.person,
      updatedBy: people.updatedBy.person,
      publishedBy: people.publishedBy.person,
      deletedBy: people.deletedBy.person,
    })
    .from(emailTemplate)
    .leftJoin(people.createdBy.table, eq(people.createdBy.table.id, emailTemplate.createdById))
    .leftJoin(people.updatedBy.table, eq(people.updatedBy.table.id, emailTemplate.updatedById))
    .leftJoin(
      people.publishedBy.table,
      eq(people.publishedBy.table.id, emailTemplate.publishedById),
    )
    .leftJoin(people.deletedBy.table, eq(people.deletedBy.table.id, emailTemplate.deletedById))
    .where(where);
  if (!found) throw notFound();
  const { row, ...by } = found;
  return recordOf(row, by);
}

/** A live template, for the editor. A deleted one is a 404, as if it never was. */
export function getEmail(id: string) {
  if (!isUuid(id)) throw notFound();
  return readRecord(and(eq(emailTemplate.uuid, id), isLive(emailTemplate)));
}

/** A live template's row, for the routes that only read it: sending, history. */
export async function findLive(id: string): Promise<EmailTemplate> {
  if (!isUuid(id)) throw notFound();
  const [row] = await db
    .select()
    .from(emailTemplate)
    .where(and(eq(emailTemplate.uuid, id), isLive(emailTemplate)));
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
  const where = and(
    query.deleted ? isNotNull(emailTemplate.deletedAt) : isLive(emailTemplate),
    query.status ? eq(emailTemplate.status, query.status) : undefined,
    query.q ? ilike(emailTemplate.name, `%${escapeLike(query.q)}%`) : undefined,
  );
  const [rows, [counted]] = await Promise.all([
    db
      .select({
        row: {
          uuid: emailTemplate.uuid,
          name: emailTemplate.name,
          status: emailTemplate.status,
          savedAt: emailTemplate.savedAt,
          updatedAt: emailTemplate.updatedAt,
          deletedAt: emailTemplate.deletedAt,
        },
        updatedBy: people.updatedBy.person,
        deletedBy: people.deletedBy.person,
      })
      .from(emailTemplate)
      .leftJoin(people.updatedBy.table, eq(people.updatedBy.table.id, emailTemplate.updatedById))
      .leftJoin(people.deletedBy.table, eq(people.deletedBy.table.id, emailTemplate.deletedById))
      .where(where)
      .orderBy(desc(emailTemplate.updatedAt), desc(emailTemplate.id))
      .limit(query.limit)
      .offset(query.offset),
    db.select({ total: count() }).from(emailTemplate).where(where),
  ]);
  return {
    items: rows.map(({ row, updatedBy, deletedBy }) => ({
      id: row.uuid,
      name: row.name,
      status: row.status,
      saved_at: row.savedAt,
      updated_at: row.updatedAt,
      updated_by: updatedBy,
      deleted_at: row.deletedAt,
      deleted_by: deletedBy,
    })),
    total: counted.total,
  };
}

/** `%` and `_` in a search are letters, not wildcards. */
const escapeLike = (text: string) => text.replace(/[\\%_]/g, (character) => `\\${character}`);

// ── Writing ──────────────────────────────────────────────────────────────────

/** The live row, locked until the transaction ends: two writes to one template take turns. */
export async function lockLive(tx: Transaction, id: string): Promise<EmailTemplate> {
  if (!isUuid(id)) throw notFound();
  const [row] = await tx
    .select()
    .from(emailTemplate)
    .where(and(eq(emailTemplate.uuid, id), isLive(emailTemplate)))
    .for('update');
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
  const [revision] = await tx
    .insert(emailTemplateRevision)
    .values({
      emailTemplateId: template.id,
      kind,
      label,
      version: template.version,
      document,
      createdById: user.id,
    })
    .returning();
  return revision;
}

/** `POST /api/emails`: a new template, as a draft. */
export async function createEmail(document: EmailDocument, typeKey: string | null, user: AppUser) {
  const id = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(emailTemplate)
      .values({ name: nameOf(document), typeKey, document, ...createdBy(user) })
      .returning();
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
  return db.transaction(async (tx) => {
    const row = await lockLive(tx, id);
    // Another saved_at than the one the editor saw: someone else saved in
    // between. A save that names none cannot tell, so it is stale too.
    const stale = save.expectedSavedAt?.getTime() !== row.savedAt.getTime();
    if (stale && !save.force)
      throw conflict('Someone else saved this template since you opened it.');
    const [saved] = await tx
      .update(emailTemplate)
      .set({ draftDocument: save.document, savedAt: new Date(), ...updatedBy(user) })
      .where(eq(emailTemplate.id, row.id))
      .returning();
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
  return db.transaction(async (tx) => {
    const row = await lockLive(tx, id);
    await retireActive(tx, row, user);
    const now = new Date();
    const [published] = await tx
      .update(emailTemplate)
      .set({
        name: nameOf(document),
        document,
        draftDocument: null,
        status: 'published',
        version: row.version + 1,
        savedAt: now,
        publishedAt: now,
        publishedById: user.id,
        ...updatedBy(user),
      })
      .where(eq(emailTemplate.id, row.id))
      .returning();
    await addRevision(tx, published, 'publish', document, user);
    await recordActivity(tx, user, {
      subjectType: SUBJECT,
      subjectId: row.id,
      action: 'published',
      fromStatus: row.status,
      toStatus: 'published',
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
  const retired = await tx
    .update(emailTemplate)
    .set({ status: 'draft', ...updatedBy(user) })
    .where(
      and(
        eq(emailTemplate.typeKey, template.typeKey),
        eq(emailTemplate.status, 'published'),
        isLive(emailTemplate),
        ne(emailTemplate.id, template.id),
      ),
    )
    .returning({ id: emailTemplate.id });
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
  return db.transaction(async (tx) => {
    const row = await lockLive(tx, id);
    if (row.status === 'published') {
      await tx
        .update(emailTemplate)
        .set({ status: 'draft', ...updatedBy(user) })
        .where(eq(emailTemplate.id, row.id));
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
  await db.transaction(async (tx) => {
    const row = await lockLive(tx, id);
    // A published design is what the mailer sends: deleting it would stop the emails.
    if (row.status === 'published')
      throw conflict('This template is published: unpublish it first.');
    await tx.update(emailTemplate).set(deletedBy(user)).where(eq(emailTemplate.id, row.id));
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
  await db.transaction(async (tx) => {
    // Only a draft is ever deleted, so the one-active-per-type index cannot refuse this.
    const [row] = await tx
      .update(emailTemplate)
      .set(restoredBy(user))
      .where(and(eq(emailTemplate.uuid, id), isNotNull(emailTemplate.deletedAt)))
      .returning();
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
