import type { EngineDocument } from '@builderset/engine';
import type { PoolClient } from 'pg';

import type { User } from '../auth';
import type { Checked, Kit, Level } from '../checks';
import type { Columns } from '../db';
import type { Body } from '../http';
import type { Action } from './activity';
import type { Audited, PersonColumn } from './base';

/**
 * What the three document tables share: the live document, the draft since,
 * and the two clocks. `updated_at` follows any change to the row; `saved_at`
 * only a write of the document, and is what the editor sends back to catch a
 * stale save.
 */
export interface DocumentColumns<D, S extends string> {
  status: S;
  document: D;
  /** Work in progress since the last publish; null when there is none. */
  draft_document: D | null;
  saved_at: Date;
  /** Counts publishes: a revision and a form response record the one they belong to. */
  version: number;
  published_at: Date | null;
  published_by_id: number | null;
}

export type DocumentRow<D = EngineDocument> = Audited & DocumentColumns<D, string>;

/** In front of readers. Deleting a published document is refused: unpublish it first. */
export const PUBLISHED = 'published';

/** What unpublishing takes back: live now, or set to go live. */
export const UNPUBLISHABLE: readonly string[] = ['published', 'scheduled'];

// ── Revisions ────────────────────────────────────────────────────────────────

export const REVISION_KINDS = ['autosave', 'manual', 'publish'] as const;
export type RevisionKind = (typeof REVISION_KINDS)[number];

/** A version of a document. Written once and never changed: no updated_* or deleted_*. */
export interface Revision<D> {
  id: number;
  uuid: string;
  kind: RevisionKind;
  /** A name someone gave it: "Before the legal review". */
  label: string | null;
  /** The document's version then. */
  version: number;
  document: D;
  created_at: Date;
  created_by_id: number | null;
}

// ── What makes each builder different ───────────────────────────────────────

/** A change of status: where the row goes, what the log calls it, what else is written. */
export interface Transition<S extends string> {
  status: S;
  action: Action;
  columns: Columns;
}

/**
 * Everything the shared routes need to know about one builder. Table and
 * column names come from here and are written into the SQL; nothing from a
 * request ever is.
 */
export interface DocumentModel<D extends EngineDocument, R extends DocumentRow<D>> {
  table: 'email_template' | 'article' | 'form';
  revisions: {
    table: 'email_template_revision' | 'article_revision' | 'form_revision';
    parent: 'email_template_id' | 'article_id' | 'form_id';
  };
  kit: Kit;
  noun: string;
  statuses: readonly R['status'][];
  /** The person columns an answer names: the audit ones and this table's own. */
  people: readonly PersonColumn[];
  /** What the list shows besides the shared columns; the first is what `?q=` searches. */
  listColumns: readonly [keyof R & string, ...(keyof R & string)[]];
  /** The kit's check. `row` is the stored row, or the columns of a new one. */
  check(raw: unknown, level: Level, row: Partial<R>): Checked<D>;
  /** Copies of the live document's meta, written in the same statement as the document. */
  copies(document: D): Columns;
  /** What a new row takes from the request besides its document; refuses what it cannot take. */
  newRow(body: Body, actor: User): Partial<R>;
  /** Where publishing leaves it. `scheduledAt` is a future instant or null. */
  publish(row: R, document: D, scheduledAt: Date | null): Transition<R['status']>;
  /** Where unpublishing leaves it. */
  unpublish(actor: User): Transition<R['status']>;
  /** Anything else a publish changes, in the same transaction, before the row is written. */
  beforePublish?(client: PoolClient, row: R, actor: User): Promise<void>;
}
