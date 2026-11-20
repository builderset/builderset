import { randomUUID } from 'node:crypto';

import type { FormDocument } from '@builderset/form';

import { checkFormDocument } from '../checks';
import { AUDIT_PEOPLE, type Audited } from './base';
import type { DocumentColumns, DocumentModel, Revision } from './document';

export const FORM_STATUSES = ['draft', 'published', 'closed'] as const;
export type FormStatus = (typeof FORM_STATUSES)[number];

/** A row of form. */
export interface Form extends Audited, DocumentColumns<FormDocument, FormStatus> {
  /** example.com/f/<slug>. `draft-<uuid>` until the first publish copies document.meta.slug. */
  slug: string;
  /** document.meta.name */
  name: string;
  /** Kept by the response route, for the list and maxResponses. */
  response_count: number;
  closed_at: Date | null;
  closed_by_id: number | null;
}

export interface FormRevision extends Revision<FormDocument> {
  form_id: number;
}

/** Your team's own triage of a response. Change the words to your team's. */
export const RESPONSE_STATUSES = ['new', 'called', 'done'] as const;
export type ResponseStatus = (typeof RESPONSE_STATUSES)[number];

/** A row of form_response: one submission. */
export interface FormResponse extends Audited {
  form_id: number;
  /** The version answered: its publish revision is the form the visitor saw. */
  form_version: number;
  /** What validateAnswers kept: shown fields only, never the raw body. */
  answers: Record<string, unknown>;
  locale: string | null;
  status: ResponseStatus;
  note: string;
  /** Only when the form's settings.privacy.storeIp is on. */
  ip: string | null;
}

export const forms: DocumentModel<FormDocument, Form> = {
  table: 'form',
  revisions: { table: 'form_revision', parent: 'form_id' },
  kit: 'form',
  noun: 'form',
  statuses: FORM_STATUSES,
  people: [...AUDIT_PEOPLE, 'published_by_id', 'closed_by_id'],
  listColumns: ['name', 'slug', 'response_count'],

  check: (raw, level) => checkFormDocument(raw, level),

  copies: ({ meta }) => ({ name: meta.name.slice(0, 120) }),

  // The slug is unique and required, and a new form has none yet.
  newRow: () => ({ slug: `draft-${randomUUID()}` }),

  // The check made sure meta.slug is there; the unique index makes sure it is free.
  publish: (_row, { meta }) => ({
    status: 'published',
    action: 'published',
    columns: { slug: meta.slug, published_at: new Date(), closed_at: null, closed_by_id: null },
  }),

  // A closed form keeps its link and shows its closed message.
  unpublish: (actor) => ({
    status: 'closed',
    action: 'closed',
    columns: { closed_at: new Date(), closed_by_id: actor.id },
  }),
};
