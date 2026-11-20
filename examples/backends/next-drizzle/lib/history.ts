// A template's two histories: its revisions (what it said) and its activity
// (what happened to it).
import type { EmailDocument } from '@builderset/email';
import { and, desc, eq } from 'drizzle-orm';

import {
  appUser,
  emailTemplateRevision,
  type AppUser,
  type EmailTemplateRevision,
} from '@/db/schema';
import { recordActivity, timeline } from '@/lib/audit';
import { db } from '@/lib/db';
import { addRevision, findLive, lockLive } from '@/lib/emails';
import { isUuid, notFound } from '@/lib/http';

/** How many revisions the editor's list shows. */
const REVISIONS_SHOWN = 100;

/** What the list shows of a revision: everything but the document. */
const summaryColumns = {
  uuid: emailTemplateRevision.uuid,
  kind: emailTemplateRevision.kind,
  label: emailTemplateRevision.label,
  version: emailTemplateRevision.version,
  createdAt: emailTemplateRevision.createdAt,
};

type Summary = Pick<EmailTemplateRevision, keyof typeof summaryColumns>;

/** A revision as the editor lists it. `author` is the name it shows. */
function summaryOf(revision: Summary, author: string | null) {
  return {
    id: revision.uuid,
    kind: revision.kind,
    label: revision.label,
    version: revision.version,
    created_at: revision.createdAt,
    author,
  };
}

/** `GET /api/emails/:id/revisions`: newest first. */
export async function listRevisions(id: string) {
  const template = await findLive(id);
  const rows = await db
    .select({ revision: summaryColumns, author: appUser.name })
    .from(emailTemplateRevision)
    .leftJoin(appUser, eq(appUser.id, emailTemplateRevision.createdById))
    .where(eq(emailTemplateRevision.emailTemplateId, template.id))
    .orderBy(desc(emailTemplateRevision.createdAt), desc(emailTemplateRevision.id))
    .limit(REVISIONS_SHOWN);
  return rows.map(({ revision, author }) => summaryOf(revision, author));
}

/** `GET /api/emails/:id/revisions/:rid`: one revision, document and all. */
export async function getRevision(id: string, revisionId: string) {
  const template = await findLive(id);
  if (!isUuid(revisionId)) throw notFound();
  const [found] = await db
    .select({ revision: emailTemplateRevision, author: appUser.name })
    .from(emailTemplateRevision)
    .leftJoin(appUser, eq(appUser.id, emailTemplateRevision.createdById))
    .where(
      and(
        eq(emailTemplateRevision.uuid, revisionId),
        eq(emailTemplateRevision.emailTemplateId, template.id),
      ),
    );
  if (!found) throw notFound();
  return { ...summaryOf(found.revision, found.author), document: found.revision.document };
}

/** `POST /api/emails/:id/revisions`: a version someone named, from the editor's history panel. */
export async function saveNamedRevision(
  id: string,
  document: EmailDocument,
  label: string | null,
  user: AppUser,
) {
  return db.transaction(async (tx) => {
    const template = await lockLive(tx, id);
    const revision = await addRevision(tx, template, 'manual', document, user, label);
    await recordActivity(tx, user, {
      subjectType: 'email_template',
      subjectId: template.id,
      action: 'saved',
      details: { revision: revision.uuid, label },
    });
    return summaryOf(revision, user.name);
  });
}

/** `GET /api/emails/:id/activity`: the template's timeline. */
export async function emailActivity(id: string, limit: number) {
  const template = await findLive(id);
  return timeline('email_template', template.id, limit);
}
