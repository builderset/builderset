// A template's two histories: its revisions (what it said) and its activity
// (what happened to it).
import type { EmailDocument } from '@builderset/email';

import type { AppUser, EmailTemplateRevision } from '@/generated/prisma/client';
import { recordActivity, timeline } from '@/lib/audit';
import { prisma } from '@/lib/db';
import { addRevision, findLive, lockLive } from '@/lib/emails';
import { isUuid, notFound } from '@/lib/http';

/** How many revisions the editor's list shows. */
const REVISIONS_SHOWN = 100;

/** What the list shows of a revision: everything but the document. */
const summaryColumns = {
  uuid: true,
  kind: true,
  label: true,
  version: true,
  createdAt: true,
  createdBy: { select: { name: true } },
} as const;

type Summary = Pick<EmailTemplateRevision, 'uuid' | 'kind' | 'label' | 'version' | 'createdAt'>;

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
  const revisions = await prisma.emailTemplateRevision.findMany({
    where: { emailTemplateId: template.id },
    select: summaryColumns,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: REVISIONS_SHOWN,
  });
  return revisions.map((revision) => summaryOf(revision, revision.createdBy?.name ?? null));
}

/** `GET /api/emails/:id/revisions/:rid`: one revision, document and all. */
export async function getRevision(id: string, revisionId: string) {
  const template = await findLive(id);
  if (!isUuid(revisionId)) throw notFound();
  const revision = await prisma.emailTemplateRevision.findFirst({
    where: { uuid: revisionId, emailTemplateId: template.id },
    include: { createdBy: { select: { name: true } } },
  });
  if (!revision) throw notFound();
  return {
    ...summaryOf(revision, revision.createdBy?.name ?? null),
    document: revision.document,
  };
}

/** `POST /api/emails/:id/revisions`: a version someone named, from the editor's history panel. */
export async function saveNamedRevision(
  id: string,
  document: EmailDocument,
  label: string | null,
  user: AppUser,
) {
  return prisma.$transaction(async (tx) => {
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
