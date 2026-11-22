// The cards made out from a design, for your team:
//   GET  /documents/cards/:id/issues                   ?status, member, limit, offset
//   POST /documents/cards/:id/issues                   { member_ref, data, delivery, valid_until }
//   GET  /documents/cards/:id/issues/:issueId          one card, filled in for a reprint
//   POST /documents/cards/:id/issues/:issueId/revoke   { reason }
import { FIELD_PATH, fieldsUsed, fillCard, type CardDocument } from 'npm:@builderset/card@0.5.0';
import { error as issue, type Issue } from 'npm:@builderset/engine@0.5.0';

import { present, presentOne } from '../_shared/audit.ts';
import {
  HttpError,
  intParam,
  isPostgresError,
  json,
  notFound,
  UNIQUE_VIOLATION,
  type Json,
} from '../_shared/http.ts';
import { admin, rowsOf, write } from '../_shared/supabase.ts';
import { liveDocument, type Call } from './call.ts';
import { kindOf } from './kinds.ts';

const cards = kindOf('cards');

const ISSUE_STATUSES = ['issued', 'printed', 'revoked'];
/** On plastic, or a wallet pass. */
const DELIVERIES = ['print', 'wallet'];
/** The longest value a card's field takes: a name, a number, a photo's address. */
const FIELD_MAX_LENGTH = 500;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
/** How many numbers are drawn before giving up: two cards drawing the same one is one in a trillion. */
const NUMBER_ATTEMPTS = 3;

/** What a card shows: never its internal ids. */
const ISSUE_COLUMNS =
  'uuid, design_version, member_ref, number, data, status, delivery, valid_until, printed_at, ' +
  'revoked_at, revoked_by, revoke_reason, created_at, created_by, updated_at, updated_by';

type Design = { id: number; uuid: string; status: string; document: CardDocument };

const designOf = (id: string) => liveDocument<Design>(cards, id, 'id, uuid, status, document');

/** One live card of one design: another design's id in the path is a 404. */
async function issueRow(design: Design, id: string, columns = ISSUE_COLUMNS): Promise<Json> {
  const row = rowsOf<Json | null>(
    await admin
      .from('card_issue')
      .select(columns)
      .eq('uuid', id)
      .eq('card_design_id', design.id)
      .is('deleted_at', null)
      .maybeSingle(),
  );
  if (!row) throw notFound('card');
  return row;
}

/** A card as the API shows it: its design by public id, people as `{ id, name }`. */
async function issueAnswer(design: Design, id: string): Promise<Json> {
  return { ...(await presentOne(await issueRow(design, id))), design: design.uuid };
}

/**
 * Twelve random digits in groups of four, `0248 1173 5521`: nothing to guess
 * another member's card from. The unique index refuses the rare repeat.
 */
function newCardNumber(): string {
  const digits = Array.from(crypto.getRandomValues(new Uint32Array(12)), (n) => n % 10).join('');
  return `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8)}`;
}

/**
 * What a new card takes from the request, checked: a 422 with every problem at
 * once. The data must fill every field the design prints, so no card leaves
 * with `{{member.name}}` on it, and fields it does not print are dropped
 * before they are frozen into the card.
 */
function issueColumns(body: Json, design: CardDocument): Json {
  const issues: Issue[] = [];
  const memberRef = typeof body.member_ref === 'string' ? body.member_ref.trim() : '';
  if (!memberRef || memberRef.length > 120)
    issues.push(issue('member_ref.invalid', { path: 'member_ref' }));
  const delivery = body.delivery ?? 'print';
  if (typeof delivery !== 'string' || !DELIVERIES.includes(delivery))
    issues.push(issue('delivery.unknown', { path: 'delivery' }));
  const validUntil = body.valid_until ?? null;
  if (validUntil !== null && (typeof validUntil !== 'string' || !DAY.test(validUntil)))
    issues.push(issue('valid_until.invalid', { path: 'valid_until' }));

  const given =
    typeof body.data === 'object' && body.data !== null && !Array.isArray(body.data)
      ? (body.data as Json)
      : {};
  for (const [path, value] of Object.entries(given)) {
    if (!FIELD_PATH.test(path) || typeof value !== 'string' || value.length > FIELD_MAX_LENGTH)
      issues.push(issue('data.fieldInvalid', { path: `data.${path}` }));
  }
  const data: Record<string, string> = {};
  for (const path of fieldsUsed(design)) {
    const value = Object.hasOwn(given, path) ? given[path] : undefined;
    if (typeof value === 'string' && value.trim()) data[path] = value.trim();
    else issues.push(issue('data.fieldMissing', { path: `data.${path}` }));
  }

  if (issues.length > 0) throw new HttpError(422, 'The card was refused.', { issues });
  return {
    p_member_ref: memberRef,
    p_data: data,
    p_delivery: delivery,
    p_valid_until: validUntil,
  };
}

export async function listIssues({ params, query }: Call) {
  const design = await designOf(params.id);
  const limit = intParam(query, 'limit', { fallback: 50, min: 1, max: 200 });
  const offset = intParam(query, 'offset', { fallback: 0, min: 0, max: Number.MAX_SAFE_INTEGER });

  let rows = admin
    .from('card_issue')
    .select(ISSUE_COLUMNS, { count: 'exact' })
    .eq('card_design_id', design.id)
    .is('deleted_at', null);
  const status = query.get('status');
  if (status !== null) {
    if (!ISSUE_STATUSES.includes(status))
      throw new HttpError(400, `The status is one of: ${ISSUE_STATUSES.join(', ')}.`);
    rows = rows.eq('status', status);
  }
  const memberRef = query.get('member');
  if (memberRef) rows = rows.eq('member_ref', memberRef);

  const page = await rows
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  const items = await present(rowsOf<Json[]>(page));
  return json({
    items: items.map((item) => ({ ...item, design: design.uuid })),
    total: page.count ?? 0,
  });
}

/** 422 while the design is a draft, 409 when the member already holds one (issue_card). */
export async function issueCard({ params, body, member }: Call) {
  const design = await designOf(params.id);
  if (design.status !== 'published')
    throw new HttpError(422, 'The design is a draft: approve it for print first.', {
      issues: [issue('design.notPublished')],
    });
  const columns = issueColumns(body, design.document);

  for (let attempt = 1; ; attempt++) {
    try {
      const id = await write<string>('issue_card', {
        p_design: design.uuid,
        ...columns,
        p_number: newCardNumber(),
        p_actor: member.id,
      });
      return json(await issueAnswer(design, id), 201);
    } catch (error) {
      // issue_card turns the member's index into a 409; a 23505 left is the
      // number's: another card drew it in the same instant. Draw again.
      if (isPostgresError(error) && error.code === UNIQUE_VIOLATION && attempt < NUMBER_ATTEMPTS)
        continue;
      throw error;
    }
  }
}

/**
 * One card, with the card itself: the design as it was when the card was
 * issued, its member's data written in by fillCard. A reprint draws this,
 * never the design as it is now.
 */
export async function getIssue({ params }: Call) {
  const design = await designOf(params.id);
  const row = await issueRow(design, params.issueId, 'design_version, data');
  const revision = rowsOf<{ document: CardDocument } | null>(
    await admin
      .from('card_design_revision')
      .select('document')
      .eq('card_design_id', design.id)
      .eq('version', row.design_version)
      .eq('kind', 'publish')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  );
  if (!revision) throw notFound('design version');
  return json({
    ...(await issueAnswer(design, params.issueId)),
    document: fillCard(revision.document, row.data as Record<string, string>),
  });
}

/** The row stays: the number printed on the card still points at it. 409 when it is revoked already. */
export async function revokeIssue({ params, body, member }: Call) {
  const given = body.reason ?? null;
  const reason = typeof given === 'string' ? given.trim() : null;
  if (given !== null && (reason === null || reason.length > 200))
    throw new HttpError(400, 'A reason is text of 200 characters at most.');
  await write<null>('revoke_card', {
    p_design: params.id,
    p_issue: params.issueId,
    p_reason: reason || null,
    p_actor: member.id,
  });
  return json(await issueAnswer(await designOf(params.id), params.issueId));
}
