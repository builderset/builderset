// The values of the text columns, as the migration's check constraints allow
// them. Prisma keeps these columns as plain text, the same as the SQL schema,
// so the types live here.

export const EMAIL_STATUSES = ['draft', 'published'] as const;
export type EmailStatus = (typeof EMAIL_STATUSES)[number];

/** Why a revision was written. Manual saves and publishes always write one. */
export const REVISION_KINDS = ['autosave', 'manual', 'publish'] as const;
export type RevisionKind = (typeof REVISION_KINDS)[number];

/** Every kind of row the activity log can describe. This example writes `email_template`. */
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
