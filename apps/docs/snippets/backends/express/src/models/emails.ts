import type { EmailDocument } from '@builderset/email';
import { error } from '@builderset/engine';

import { recordActivity } from '../audit';
import { checkEmailDocument, EMAIL_TYPES } from '../checks';
import { refused } from '../http';
import { AUDIT_PEOPLE, type Audited } from './base';
import type { DocumentColumns, DocumentModel, Revision } from './document';

export const EMAIL_STATUSES = ['draft', 'published'] as const;
export type EmailStatus = (typeof EMAIL_STATUSES)[number];

/** A row of email_template: one design for an email your app sends. */
export interface EmailTemplate extends Audited, DocumentColumns<EmailDocument, EmailStatus> {
  /** document.meta.name */
  name: string;
  /** The email type it is for: its variables and checks. Null for a design not tied to one. */
  type_key: string | null;
}

export interface EmailTemplateRevision extends Revision<EmailDocument> {
  email_template_id: number;
}

export const emailTemplates: DocumentModel<EmailDocument, EmailTemplate> = {
  table: 'email_template',
  revisions: { table: 'email_template_revision', parent: 'email_template_id' },
  kit: 'email',
  noun: 'email template',
  statuses: EMAIL_STATUSES,
  people: [...AUDIT_PEOPLE, 'published_by_id'],
  listColumns: ['name', 'type_key'],

  // The type's variables are checked too: a reset email must use the reset link.
  check: (raw, level, row) => checkEmailDocument(raw, level, row.type_key ?? null),

  copies: (document) => ({ name: document.meta.name.slice(0, 120) }),

  // Only a type the project has: its key picks the variables checked.
  newRow({ type_key: typeKey = null }) {
    if (typeKey === null) return { type_key: null };
    if (typeof typeKey === 'string' && Object.hasOwn(EMAIL_TYPES, typeKey))
      return { type_key: typeKey };
    throw refused([error('type_key.unknown', { path: 'type_key' })]);
  },

  publish: () => ({
    status: 'published',
    action: 'published',
    columns: { published_at: new Date() },
  }),

  unpublish: () => ({ status: 'draft', action: 'unpublished', columns: {} }),

  // One active design per email type: the one before it steps back to draft.
  async beforePublish(client, row, actor) {
    if (row.type_key === null) return;
    const { rows } = await client.query<{ id: number }>(
      `update email_template set status = 'draft', updated_by_id = $3
        where type_key = $1 and status = 'published' and deleted_at is null and id <> $2
       returning id`,
      [row.type_key, row.id, actor.id],
    );
    for (const replaced of rows) {
      await recordActivity(client, {
        subject: 'email_template',
        subjectId: replaced.id,
        action: 'unpublished',
        from: 'published',
        to: 'draft',
        details: { replaced_by: row.uuid },
        actor,
      });
    }
  },
};
