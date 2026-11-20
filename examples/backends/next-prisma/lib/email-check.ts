import {
  checkEmail,
  createEmailRegistry,
  isDraftBlocking,
  isPublishBlocking,
  parseEmail,
  type EmailDocument,
} from '@builderset/email';

import type { Prisma } from '@/generated/prisma/client';
import { refused } from '@/lib/http';

export const emailRegistry = createEmailRegistry();

/** How strictly a document is checked: a draft may be unfinished, a published one may not. */
export type CheckLevel = 'draft' | 'publish';

/**
 * The document in a request, checked before it is stored, or a 422 with the
 * reasons. A draft may be unfinished but never unsafe (`isDraftBlocking`);
 * publishing refuses every error.
 */
export function checkDocument(raw: unknown, level: CheckLevel): EmailDocument {
  const document = parseEmail(raw, emailRegistry);
  // parseEmail only says yes or no. checkEmail says why, so a refused document
  // comes back with its codes (`url.unsafe`, `element.unknown`) for the editor
  // to show. With email types, pass the template's type instead of null: its
  // variables are then checked too.
  const blocking = document && level === 'draft' ? isDraftBlocking : isPublishBlocking;
  const issues = checkEmail(raw as EmailDocument, emailRegistry, null).filter(blocking);
  if (!document || issues.length > 0) throw refused(issues);
  return document;
}

/** The `name` column: a copy of `document.meta.name`, for the list. */
export const nameOf = (document: EmailDocument) => document.meta.name.trim() || 'Untitled';

/**
 * Prisma types a JSON column as any JSON, which a document's interface is not
 * to TypeScript. Both casts are safe: every document in the table was checked
 * by `checkDocument` before it was stored.
 */
export const toJson = (document: EmailDocument) => document as unknown as Prisma.InputJsonValue;
export const storedEmail = (json: Prisma.JsonValue) => json as unknown as EmailDocument;
