import type { Db } from '../db';
import { AUDITED_TABLES, type AuditedTable, type PersonRef } from './base';

/**
 * Activity: what happened to a row, who did it, and when. One table for every
 * kind of row, appended in the same transaction as what it records and never
 * edited. It names its subject by table and id, with no foreign key, so it
 * outlives what it describes.
 */

/** A subject is named by its table. */
export const SUBJECT_TYPES = AUDITED_TABLES;
export type SubjectType = AuditedTable;

export const ACTIONS = [
  'created', // a new row
  'saved', // a manual save; autosaves are not logged
  'renamed', // name, slug or title changed
  'published', // went live, or went live again
  'scheduled', // set to go live later
  'unpublished', // back to draft
  'closed', // a form stopped taking responses
  'paused', // a popup taken off the site, kept as it is
  'issued', // a card made out to a member
  'revoked', // a member's card cancelled
  'reverted', // a revision restored
  'status_changed', // a response's triage
  'deleted', // soft-deleted
  'restored', // undeleted
] as const;
export type Action = (typeof ACTIONS)[number];

/** A row of activity. */
export interface Activity {
  id: number;
  uuid: string;
  subject_type: SubjectType;
  subject_id: number;
  action: Action;
  from_status: string | null;
  to_status: string | null;
  /** What else matters: the old slug, the revision written. */
  details: Record<string, unknown>;
  /** Null for a job, or a visitor. */
  actor_id: number | null;
  created_at: Date;
}

/** One line of a timeline, as the API shows it. */
export interface TimelineEntry {
  id: string;
  action: Action;
  from_status: string | null;
  to_status: string | null;
  details: Record<string, unknown>;
  actor: PersonRef;
  created_at: Date;
}

/** One row's activity, newest first, with the people's names. */
export async function timelineOf(
  db: Db,
  subject: SubjectType,
  subjectId: number,
  limit: number,
): Promise<TimelineEntry[]> {
  const { rows } = await db.query<TimelineEntry>(
    `select a.uuid as id, a.action, a.from_status, a.to_status, a.details, a.created_at,
            case when u.id is null then null
                 else json_build_object('id', u.uuid, 'name', u.name) end as actor
       from activity a
       left join app_user u on u.id = a.actor_id
      where a.subject_type = $1 and a.subject_id = $2
      order by a.created_at desc, a.id desc
      limit $3`,
    [subject, subjectId, limit],
  );
  return rows;
}
