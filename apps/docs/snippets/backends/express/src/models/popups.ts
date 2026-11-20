import { formatOf, type PopupDisplay, type PopupDocument, type PopupType } from '@builderset/popup';

import { checkPopupDocument } from '../checks';
import type { Columns } from '../db';
import { AUDIT_PEOPLE, type Audited } from './base';
import type { DocumentColumns, DocumentModel, Revision } from './document';

/** `paused` takes a published popup off the site and keeps it as it is. */
export const POPUP_STATUSES = ['draft', 'published', 'paused'] as const;
export type PopupStatus = (typeof POPUP_STATUSES)[number];

/** A row of popup. */
export interface Popup extends Audited, DocumentColumns<PopupDocument, PopupStatus> {
  /** document.meta.name */
  name: string;
  /** modal, slidein, bartop…: how it sits on the page. */
  type: PopupType;
  // Copies of document.display, so the site asks one indexed question: which
  // popups may show today. The rest of the rules run in the browser.
  starts_at: Date | null;
  ends_at: Date | null;
  /** When two popups match a page, the higher one shows. */
  priority: number;
}

export interface PopupRevision extends Revision<PopupDocument> {
  popup_id: number;
}

/** A row of popup_submission: what a visitor typed into a popup's inputs. */
export interface PopupSubmission extends Audited {
  popup_id: number;
  popup_version: number;
  /** validateSubmission's values only: the popup's own inputs, trimmed. */
  answers: Record<string, string>;
  /** The page it was sent from. */
  page_path: string | null;
  locale: string | null;
  /** Your team's triage, as a form response's: new, called, done. */
  status: string;
  ip: string | null;
}

/** What PopupView's onEvent reports: each a counter of popup_daily_stat. */
export const POPUP_EVENTS = ['shown', 'closed', 'clicked', 'submitted'] as const;
export type PopupEvent = (typeof POPUP_EVENTS)[number];

/** A submission's ip is kept only when your privacy rules allow it. Off here. */
export const STORE_SUBMISSION_IP = false;

const HOUR_MS = 3_600_000;

/**
 * The display rules keep calendar days, `2026-11-30`, in the visitor's own
 * time zone. A day begins and ends at different instants around the world, so
 * the columns hold the widest window — from the first place the first day
 * begins (UTC+14) to the last place the last day ends (UTC−12) — and the
 * browser's shouldShow decides by the visitor's own day.
 */
function windowOf({ starts, ends }: PopupDisplay): Columns {
  // A draft may hold its dates the wrong way round (publishing refuses them):
  // no window until they are fixed.
  if (starts && ends && ends < starts) return { starts_at: null, ends_at: null };
  return {
    starts_at: starts ? new Date(Date.parse(starts) - 14 * HOUR_MS) : null,
    ends_at: ends ? new Date(Date.parse(ends) + 36 * HOUR_MS) : null,
  };
}

/** Whether visitors may see it now, as far as the server can tell. */
export const isShowing = (popup: Popup, now = new Date()) =>
  popup.status === 'published' &&
  (popup.starts_at === null || popup.starts_at <= now) &&
  (popup.ends_at === null || popup.ends_at > now);

export const popups: DocumentModel<PopupDocument, Popup> = {
  table: 'popup',
  revisions: { table: 'popup_revision', parent: 'popup_id' },
  kit: 'popup',
  noun: 'popup',
  statuses: POPUP_STATUSES,
  people: [...AUDIT_PEOPLE, 'published_by_id'],
  listColumns: ['name', 'type', 'priority', 'starts_at', 'ends_at'],

  check: (raw, level) => checkPopupDocument(raw, level),

  // The popup keeps its type and display rules on the root node's props.
  copies(document) {
    const { type, display } = formatOf(document);
    return {
      name: document.meta.name.slice(0, 120),
      type,
      priority: display.priority,
      ...windowOf(display),
    };
  },

  newRow: () => ({}),

  // Publishing a paused popup puts it back on the site too.
  publish: () => ({
    status: 'published',
    action: 'published',
    columns: { published_at: new Date() },
  }),

  unpublish: () => ({ status: 'draft', action: 'unpublished', columns: {} }),
};
