import {
  checkEmail,
  createEmailRegistry,
  isDraftBlocking,
  isPublishBlocking,
  parseEmail,
  type EmailDocument,
} from '@builderset/email';
import { eq } from 'drizzle-orm';

import { emailTemplate, type EmailTemplate } from '@/db/schema';
import { db } from '@/lib/db';

export const emailRegistry = createEmailRegistry();

type Issue = ReturnType<typeof checkEmail>[number];
type Checked = { ok: true; document: EmailDocument } | { ok: false; issues: Issue[] };

/**
 * The document in a request, checked before it is stored. A draft may be
 * unfinished but never unsafe (`isDraftBlocking`); publishing refuses every error.
 */
export function checkDocument(raw: unknown, level: 'draft' | 'publish'): Checked {
  const document = parseEmail(raw, emailRegistry);
  // parseEmail only says yes or no. checkEmail says why, so a refused document
  // comes back with its codes (`url.unsafe`, `element.unknown`) for the editor to show.
  const blocking = document && level === 'draft' ? isDraftBlocking : isPublishBlocking;
  const issues = checkEmail(raw as EmailDocument, emailRegistry, null).filter(blocking);
  return document && issues.length === 0 ? { ok: true, document } : { ok: false, issues };
}

export async function findEmail(id: string): Promise<EmailTemplate | null> {
  if (!/^\d{1,9}$/.test(id)) return null;
  const [row] = await db
    .select()
    .from(emailTemplate)
    .where(eq(emailTemplate.id, Number(id)));
  return row ?? null;
}

/** The record as the editor reads it: snake_case, timestamps as ISO strings. */
export function recordOf(row: EmailTemplate) {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    document: row.document,
    draft_document: row.draftDocument,
    saved_at: row.savedAt.toISOString(),
    published_at: row.publishedAt?.toISOString() ?? null,
  };
}

/** Whether the `expected_saved_at` the editor sent is the row's `saved_at`. */
export const sameInstant = (expected: string, savedAt: Date) =>
  new Date(expected).getTime() === savedAt.getTime();

export const notFound = () =>
  Response.json({ message: 'There is no such email template.' }, { status: 404 });

export const conflict = () =>
  Response.json(
    { message: 'Someone else saved this template since you opened it.' },
    { status: 409 },
  );

export const refused = (issues: Issue[]) => Response.json({ issues }, { status: 422 });
