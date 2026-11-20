import type { EmailDocument } from '@builderset/email';
import { sql } from 'drizzle-orm';
import {
  bigint,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { auditColumns, newestFirst, oneOf, rowId, userRef } from './base';

export const EMAIL_STATUSES = ['draft', 'published'] as const;
export type EmailStatus = (typeof EMAIL_STATUSES)[number];

/** Why a revision was written. Manual saves and publishes always write one. */
export const REVISION_KINDS = ['autosave', 'manual', 'publish'] as const;
export type RevisionKind = (typeof REVISION_KINDS)[number];

export const emailTemplate = pgTable(
  'email_template',
  {
    id: rowId(),

    // What it is
    name: varchar('name', { length: 120 }).notNull(), // document.meta.name
    typeKey: varchar('type_key', { length: 60 }), // password_reset, newsletter: its variables
    status: varchar('status', { length: 16, enum: EMAIL_STATUSES }).notNull().default('draft'),

    // The document
    document: jsonb('document').$type<EmailDocument>().notNull(), // live: what the mailer sends
    draftDocument: jsonb('draft_document').$type<EmailDocument>(), // null when there is no draft
    // Milliseconds, like a JavaScript Date: the `saved_at` the editor sends
    // back must compare equal to the one stored.
    savedAt: timestamp('saved_at', { withTimezone: true, precision: 3 }).notNull().defaultNow(),
    version: integer('version').notNull().default(0), // counts publishes
    publishedAt: timestamp('published_at', { withTimezone: true }),
    publishedById: userRef('published_by_id'),

    ...auditColumns(),
  },
  (table) => [
    check('email_template_status_check', oneOf(table.status, EMAIL_STATUSES)),
    // One active design per email type: the one the mailer sends.
    uniqueIndex('email_template_one_active_per_type')
      .on(table.typeKey)
      .where(sql`status = 'published' and deleted_at is null`),
    // The list: newest change first.
    index('email_template_list')
      .on(newestFirst(table.updatedAt))
      .where(sql`deleted_at is null`),
  ],
);

/**
 * A version to go back to: every manual save and publish. Written once and
 * never changed, so it has no `updated_*` or `deleted_*`.
 */
export const emailTemplateRevision = pgTable(
  'email_template_revision',
  {
    id: rowId(),
    uuid: uuid('uuid').notNull().unique().defaultRandom(),
    emailTemplateId: bigint('email_template_id', { mode: 'number' })
      .notNull()
      .references(() => emailTemplate.id, { onDelete: 'cascade' }),
    kind: varchar('kind', { length: 16, enum: REVISION_KINDS }).notNull(),
    label: varchar('label', { length: 120 }), // "Before the legal review"
    version: integer('version').notNull(), // the template's version then
    document: jsonb('document').$type<EmailDocument>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    createdById: userRef('created_by_id'),
  },
  (table) => [
    check('email_template_revision_kind_check', oneOf(table.kind, REVISION_KINDS)),
    index('email_template_revision_history').on(
      table.emailTemplateId,
      newestFirst(table.createdAt),
    ),
  ],
);

export type EmailTemplate = typeof emailTemplate.$inferSelect;
export type EmailTemplateRevision = typeof emailTemplateRevision.$inferSelect;
