import { randomInt } from 'node:crypto';

import { formatOf, type CardDocument, type CardFormat, type CardRecord } from '@builderset/card';

import { checkCardDocument } from '../checks';
import { AUDIT_PEOPLE, type Audited, type PersonColumn } from './base';
import type { DocumentColumns, DocumentModel, Revision } from './document';

/** `published` is the design approved for print: the one new cards are made from. */
export const CARD_STATUSES = ['draft', 'published'] as const;
export type CardStatus = (typeof CARD_STATUSES)[number];

/** A row of card_design: a card, designed once and issued to many members. */
export interface CardDesign extends Audited, DocumentColumns<CardDocument, CardStatus> {
  /** document.meta.name */
  name: string;
  /** membership, id, bank…: its size, corners and print rules. */
  format: CardFormat;
  // Copies of the document's size, for lists and the print order.
  width_mm: number;
  height_mm: number;
  /** 1: front only; 2: front and back. */
  sides: 1 | 2;
}

export interface CardDesignRevision extends Revision<CardDocument> {
  card_design_id: number;
}

export const CARD_ISSUE_STATUSES = ['issued', 'printed', 'revoked'] as const;
export type CardIssueStatus = (typeof CARD_ISSUE_STATUSES)[number];

/** On plastic, or a wallet pass. */
export const CARD_DELIVERIES = ['print', 'wallet'] as const;
export type CardDelivery = (typeof CARD_DELIVERIES)[number];

/**
 * A row of card_issue: one card made out to one member. The design's version
 * and the member's data are frozen when it is issued, so a reprint matches the
 * card in their hand, whatever the design became since.
 */
export interface CardIssue extends Audited {
  card_design_id: number;
  /** The design's version then: its publish revision is what the card was printed from. */
  design_version: number;
  /** Your member's id, as your system knows it. */
  member_ref: string;
  /** Printed on the card. Never reused, not even after a revoke. */
  number: string;
  /** The fields filled in: `{ "member.name": "Arben Hoxha" }`. */
  data: CardRecord;
  status: CardIssueStatus;
  delivery: CardDelivery;
  /** A day, `2027-12-31`, printed on the card. */
  valid_until: string | null;
  printed_at: Date | null;
  revoked_at: Date | null;
  revoked_by_id: number | null;
  revoke_reason: string | null;
}

/** The person columns a card's answer names. */
export const ISSUE_PEOPLE: readonly PersonColumn[] = [
  'created_by_id',
  'updated_by_id',
  'revoked_by_id',
];

// The unique indexes of 07_cards.sql, by name: each refusal means something else.
/** A member holds one card of a design that is not revoked. */
export const ONE_VALID_CARD = 'card_issue_one_valid';
/** A number is never given out twice. */
export const CARD_NUMBER = 'card_issue_number';

/**
 * Twelve random digits in groups of four, `0248 1173 5521`: nothing to guess
 * another member's card from. The unique index refuses the rare repeat.
 */
export function newCardNumber(): string {
  const digits = Array.from({ length: 12 }, () => String(randomInt(10))).join('');
  return `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8)}`;
}

export const cardDesigns: DocumentModel<CardDocument, CardDesign> = {
  table: 'card_design',
  revisions: { table: 'card_design_revision', parent: 'card_design_id' },
  kit: 'card',
  noun: 'card design',
  statuses: CARD_STATUSES,
  people: [...AUDIT_PEOPLE, 'published_by_id'],
  listColumns: ['name', 'format', 'width_mm', 'height_mm', 'sides'],

  check: (raw, level) => checkCardDocument(raw, level),

  // The card keeps its format on the root node's props.
  copies(document) {
    const { format, width, height, sides } = formatOf(document);
    return {
      name: document.meta.name.slice(0, 120),
      format,
      width_mm: width,
      height_mm: height,
      sides,
    };
  },

  newRow: () => ({}),

  // Approved for print: new cards are made from this version.
  publish: () => ({
    status: 'published',
    action: 'published',
    columns: { published_at: new Date() },
  }),

  // Withdrawn: no new cards. The ones issued keep their version.
  unpublish: () => ({ status: 'draft', action: 'unpublished', columns: {} }),
};
