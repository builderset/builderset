import { fillCard, type CardDocument } from '@builderset/card';
import { error, type Issue } from '@builderset/engine';
import { Router } from 'express';

import { createdBy, recordActivity, updatedBy } from '../audit';
import { currentUser, type User } from '../auth';
import { checkCardData } from '../checks';
import {
  type Columns,
  type Db,
  insertRow,
  isUniqueViolation,
  pool,
  transaction,
  updateRow,
} from '../db';
import {
  bodyOf,
  conflict,
  dayOf,
  notFound,
  oneOf,
  pageOf,
  refused,
  textOf,
  type Body,
} from '../http';
import { getRow, person, sideFilter, toAnswer } from '../models/base';
import {
  CARD_DELIVERIES,
  CARD_ISSUE_STATUSES,
  CARD_NUMBER,
  ISSUE_PEOPLE,
  newCardNumber,
  ONE_VALID_CARD,
  type CardDesign,
  type CardIssue,
} from '../models/cards';

/**
 * The cards made out from a design: /api/cards/:id/issues. Issuing freezes the
 * design's version and the member's data; revoking cancels a card for good,
 * and its number is never given out again.
 */
export const cardIssues = Router();

/** How many numbers are drawn before giving up: two cards drawing the same one is one in a trillion. */
const NUMBER_ATTEMPTS = 3;

/** A card as the API shows it: its design by public id, people as `{ id, name }`. */
const ISSUE_SELECT = `select t.*, d.uuid as design, ${ISSUE_PEOPLE.map(person).join(', ')}
   from card_issue t join card_design d on d.id = t.card_design_id`;

async function issueAnswer(db: Db, id: number) {
  const { rows } = await db.query(`${ISSUE_SELECT} where t.id = $1`, [id]);
  return toAnswer(rows[0] as Record<string, unknown>);
}

const findDesign = (db: Db, id: string, lock = false) =>
  getRow<CardDesign>(db, 'card_design', 'card design', id, { lock });

/** One live card of one design: another design's id in the path is a 404. */
const findIssue = (db: Db, design: CardDesign, id: string, lock = false) =>
  getRow<CardIssue>(db, 'card_issue', 'card', id, { lock, where: { card_design_id: design.id } });

/** GET /:id/issues — `?status=&member=&limit=&offset=`, newest first. */
cardIssues.get('/:id/issues', async (req, res) => {
  const design = await findDesign(pool, req.params.id);
  const { limit, offset } = pageOf(req.query);
  const where = ['t.card_design_id = $1', sideFilter('live')];
  const params: unknown[] = [design.id];
  if (oneOf(CARD_ISSUE_STATUSES, req.query.status)) {
    params.push(req.query.status);
    where.push(`t.status = $${String(params.length)}`);
  }
  if (typeof req.query.member === 'string' && req.query.member) {
    params.push(req.query.member);
    where.push(`t.member_ref = $${String(params.length)}`);
  }
  const filter = where.join(' and ');
  const [counted, items] = await Promise.all([
    pool.query<{ total: number }>(
      `select count(*) as total from card_issue t where ${filter}`,
      params,
    ),
    pool.query(
      `${ISSUE_SELECT} where ${filter}
        order by t.created_at desc, t.id desc
        limit $${String(params.length + 1)} offset $${String(params.length + 2)}`,
      [...params, limit, offset],
    ),
  ]);
  res.json({ items: items.rows.map(toAnswer), total: counted.rows[0].total });
});

/** POST /:id/issues — `{ member_ref, data, delivery, valid_until }`: a card for one member. */
cardIssues.post('/:id/issues', async (req, res) => {
  res.status(201).json(await issueCard(req.params.id, bodyOf(req), currentUser(req)));
});

/**
 * GET /:id/issues/:iid — one card, with the card itself: the design as it was
 * when the card was issued, its member's data written in by fillCard. A
 * reprint draws this, never the design as it is now.
 */
cardIssues.get('/:id/issues/:iid', async (req, res) => {
  const design = await findDesign(pool, req.params.id);
  const issue = await findIssue(pool, design, req.params.iid);
  const { rows } = await pool.query<{ document: CardDocument }>(
    `select document from card_design_revision
      where card_design_id = $1 and version = $2 and kind = 'publish'
      order by created_at desc limit 1`,
    [design.id, issue.design_version],
  );
  if (!rows[0]) throw notFound('design version');
  res.json({
    ...(await issueAnswer(pool, issue.id)),
    document: fillCard(rows[0].document, issue.data),
  });
});

/** POST /:id/issues/:iid/revoke — `{ reason }`. The row stays: the number on the card still points at it. */
cardIssues.post('/:id/issues/:iid/revoke', async (req, res) => {
  const actor = currentUser(req);
  const given = bodyOf(req).reason ?? null;
  const reason = given === null ? null : textOf(given, 200);
  if (given !== null && reason === null)
    throw refused([error('reason.invalid', { path: 'reason' })]);

  const answer = await transaction(async (client) => {
    const design = await findDesign(client, req.params.id);
    const issue = await findIssue(client, design, req.params.iid, true);
    if (issue.status === 'revoked') throw conflict('This card is revoked already.');
    await updateRow(client, 'card_issue', issue.id, {
      status: 'revoked',
      revoked_at: new Date(),
      revoked_by_id: actor.id,
      revoke_reason: reason,
      ...updatedBy(actor),
    });
    await recordActivity(client, {
      subject: 'card_issue',
      subjectId: issue.id,
      action: 'revoked',
      from: issue.status,
      to: 'revoked',
      details: reason ? { reason } : {},
      actor,
    });
    return issueAnswer(client, issue.id);
  });
  res.json(answer);
});

/**
 * A card, from the design's live version. 422 while the design is a draft,
 * 409 when the member already holds one; a number another card drew in the
 * same instant is drawn again.
 */
async function issueCard(designId: string, body: Body, actor: User) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await transaction(async (client) => {
        // Locked, so the design cannot be withdrawn while its card is made.
        const design = await findDesign(client, designId, true);
        if (design.status !== 'published') throw refused([error('design.notPublished')]);
        const issue = await insertRow<CardIssue>(client, 'card_issue', {
          ...issueColumns(design, body),
          number: newCardNumber(),
          ...createdBy(actor),
        });
        await recordActivity(client, {
          subject: 'card_issue',
          subjectId: issue.id,
          action: 'issued',
          to: issue.status,
          details: { design: design.uuid, version: issue.design_version, number: issue.number },
          actor,
        });
        return issueAnswer(client, issue.id);
      });
    } catch (failure) {
      if (isUniqueViolation(failure, ONE_VALID_CARD))
        throw conflict('This member already holds a card of this design: revoke it first.');
      if (isUniqueViolation(failure, CARD_NUMBER) && attempt < NUMBER_ATTEMPTS) continue;
      throw failure;
    }
  }
}

/** What a new card takes from the request, checked; a 422 with every problem at once. */
function issueColumns(design: CardDesign, body: Body): Columns {
  const issues: Issue[] = [];
  const memberRef = textOf(body.member_ref, 120)?.trim() ?? '';
  if (!memberRef) issues.push(error('member_ref.invalid', { path: 'member_ref' }));
  const delivery = body.delivery ?? 'print';
  if (!oneOf(CARD_DELIVERIES, delivery))
    issues.push(error('delivery.unknown', { path: 'delivery' }));
  const validUntil = body.valid_until ?? null;
  if (validUntil !== null && dayOf(validUntil) === null)
    issues.push(error('valid_until.invalid', { path: 'valid_until' }));
  // Only the fields the design prints, every one of them.
  const data = checkCardData(body.data, design.document);
  if (!data.ok) issues.push(...data.issues);
  if (issues.length > 0 || !data.ok) throw refused(issues);

  return {
    card_design_id: design.id,
    design_version: design.version,
    member_ref: memberRef,
    data: data.document,
    delivery,
    valid_until: validUntil,
  };
}
