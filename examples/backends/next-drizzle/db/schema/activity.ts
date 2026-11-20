import {
  bigint,
  check,
  index,
  jsonb,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { newestFirst, oneOf, rowId, userRef } from './base';

/** Every kind of row the log can describe. This example writes `email_template`. */
export const SUBJECT_TYPES = [
  'email_template',
  'article',
  'form',
  'form_response',
  'saved_section',
  'media',
] as const;
export type SubjectType = (typeof SUBJECT_TYPES)[number];

export const ACTIONS = [
  'created', // a new row
  'saved', // a manual save (autosaves are not logged)
  'renamed', // name, slug or title changed
  'published', // went live, or went live again
  'scheduled', // set to go live later
  'unpublished', // back to draft
  'closed', // a form stopped taking responses
  'reverted', // a revision restored
  'status_changed', // a response's triage
  'deleted', // soft-deleted
  'restored', // undeleted
] as const;
export type Action = (typeof ACTIONS)[number];

/**
 * Who did what, and when: one row per action, written in the same transaction
 * as the action and never changed. No foreign key to the subject, on purpose:
 * the log outlives what it describes.
 */
export const activity = pgTable(
  'activity',
  {
    id: rowId(),
    uuid: uuid('uuid').notNull().unique().defaultRandom(),

    // What it happened to
    subjectType: varchar('subject_type', { length: 30, enum: SUBJECT_TYPES }).notNull(),
    subjectId: bigint('subject_id', { mode: 'number' }).notNull(),

    // What happened
    action: varchar('action', { length: 30, enum: ACTIONS }).notNull(),
    fromStatus: varchar('from_status', { length: 30 }),
    toStatus: varchar('to_status', { length: 30 }),
    details: jsonb('details').$type<Record<string, unknown>>().notNull().default({}),

    // Who and when
    actorId: userRef('actor_id'), // null: a job, or a visitor
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('activity_subject_type_check', oneOf(table.subjectType, SUBJECT_TYPES)),
    check('activity_action_check', oneOf(table.action, ACTIONS)),
    // One document's timeline.
    index('activity_timeline').on(table.subjectType, table.subjectId, newestFirst(table.createdAt)),
    // One person's work.
    index('activity_by_actor').on(table.actorId, newestFirst(table.createdAt)),
  ],
);

export type Activity = typeof activity.$inferSelect;
