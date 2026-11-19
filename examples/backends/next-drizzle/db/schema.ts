import type { EmailDocument } from '@builderset/email';
import { integer, jsonb, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';

// Milliseconds, like a JavaScript Date: the `saved_at` the editor sends back
// must compare equal to the one stored.
const instant = (name: string) => timestamp(name, { withTimezone: true, precision: 3 });

export const emailTemplate = pgTable('email_template', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: varchar('name', { length: 120 }).notNull(),
  // Only a published template is sent.
  status: text('status', { enum: ['draft', 'published'] })
    .notNull()
    .default('draft'),
  // The live document: what a recipient gets. Stored whole, exactly as the editor sent it.
  document: jsonb('document').$type<EmailDocument>().notNull(),
  // The working copy; null when there are no unpublished changes.
  draftDocument: jsonb('draft_document').$type<EmailDocument>(),
  // Changes on every write. The editor sends it back, and a different one means
  // someone else saved in between.
  savedAt: instant('saved_at').notNull(),
  publishedAt: instant('published_at'),
  createdAt: instant('created_at').notNull().defaultNow(),
});

export type EmailTemplate = typeof emailTemplate.$inferSelect;
