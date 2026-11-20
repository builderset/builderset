import { error } from '@builderset/engine';
import {
  formatOf,
  languageMatches,
  pathMatches,
  validateSubmission,
  type PopupDocument,
} from '@builderset/popup';
import { Router } from 'express';

import { recordActivity, updatedBy } from '../audit';
import { publisher } from '../auth';
import { insertRow, pool, transaction, updateRow } from '../db';
import { bodyOf, conflict, HttpError, notFound, oneOf, refused, textOf } from '../http';
import { findRow, getRow, sideFilter } from '../models/base';
import {
  isShowing,
  POPUP_EVENTS,
  STORE_SUBMISSION_IP,
  type Popup,
  type PopupSubmission,
} from '../models/popups';

// ── The public side: no sign-in ──────────────────────────────────────────────

/**
 * Whether a popup is for this page: its pages and its language, the rules a
 * server can apply. shouldShow checks them again in the browser, with the
 * rest. A request without a path is answered for every page.
 */
function isForPage(document: PopupDocument, path: string | null, locale: string | null) {
  const { display } = formatOf(document);
  if (!languageMatches(display.language, locale ?? undefined)) return false;
  if (display.pages === 'all' || path === null) return true;
  const listed = display.rules.some((rule) => rule.trim() !== '' && pathMatches(rule, path));
  return display.pages === 'only' ? listed : !listed;
}

/** A popup that is published or paused, for its events and submissions: a draft has never been on the site. */
async function findSitePopup(id: string): Promise<Popup> {
  const popup = await findRow<Popup>(pool, 'popup', id);
  if (!popup || popup.status === 'draft') throw notFound('popup');
  return popup;
}

export const publicPopups = Router();

/** GET / — `?path=&locale=`: the popups that may show on this page, highest priority first. */
publicPopups.get('/', async (req, res) => {
  const path = textOf(req.query.path, 500);
  const locale = textOf(req.query.locale, 10);
  // One indexed question for the status and the dates (popup_live)…
  const { rows } = await pool.query<Pick<Popup, 'uuid' | 'version' | 'document'>>(
    `select t.uuid, t.version, t.document from popup t
      where t.status = 'published' and ${sideFilter('live')}
        and (t.starts_at is null or t.starts_at <= now())
        and (t.ends_at is null or t.ends_at > now())
      order by t.priority desc, t.id`,
  );
  // …then the page's own rules. The browser's shouldShow decides the rest:
  // the audience, how often, the device.
  res.json(
    rows
      .filter((row) => isForPage(row.document, path, locale))
      .map(({ uuid, version, document }) => ({ id: uuid, version, document })),
  );
});

/** POST /:id/events — `{ event }` from PopupView's onEvent: one more on today's counter. */
publicPopups.post('/:id/events', async (req, res) => {
  const { event } = bodyOf(req);
  if (!oneOf(POPUP_EVENTS, event)) throw refused([error('event.unknown', { path: 'event' })]);
  const popup = await findSitePopup(req.params.id);
  // One statement, so two visitors at the same moment both count. The column
  // is named by the event, which is one of POPUP_EVENTS by now.
  await pool.query(
    `insert into popup_daily_stat (popup_id, day, ${event}) values ($1, current_date, 1)
     on conflict (popup_id, day) do update set ${event} = popup_daily_stat.${event} + 1`,
    [popup.id],
  );
  res.status(204).end();
});

/**
 * POST /:id/submissions — `{ values, path, locale }` from PopupView's
 * onSubmit, checked against the live popup by the same validateSubmission
 * the browser ran. Put a rate limit in front of it, answering 429.
 */
publicPopups.post('/:id/submissions', async (req, res) => {
  const popup = await findSitePopup(req.params.id);
  if (!isShowing(popup)) throw new HttpError(410, 'This popup is no longer on the site.');
  const body = bodyOf(req);
  const result = validateSubmission(popup.document, body.values);
  if (!result.ok) {
    res.status(422).json({ errors: result.errors });
    return;
  }

  // A signed-in visitor is the submission's creator; anyone else leaves it null.
  const visitor = req.user ?? null;
  const id = await transaction(async (client) => {
    const submission = await insertRow<PopupSubmission>(client, 'popup_submission', {
      popup_id: popup.id,
      popup_version: popup.version,
      // Only the popup's own inputs, trimmed: never the raw body.
      answers: result.values,
      page_path: textOf(body.path, 500),
      locale: textOf(body.locale, 10),
      ip: STORE_SUBMISSION_IP ? (req.ip ?? null) : null,
      created_by_id: visitor?.id ?? null,
    });
    await recordActivity(client, {
      subject: 'popup_submission',
      subjectId: submission.id,
      action: 'created',
      to: submission.status,
      details: { popup: popup.uuid },
      actor: visitor,
    });
    return submission.uuid;
  });
  res.status(201).json({ id });
});

// ── Your team's side ─────────────────────────────────────────────────────────

export const popupPause = Router();

/**
 * PATCH /:id/pause — `{ paused }`: off the site, kept as it is, or back on.
 * Only the status changes: the document and saved_at stay as they are.
 */
popupPause.patch('/:id/pause', async (req, res) => {
  const actor = publisher(req);
  const { paused } = bodyOf(req);
  if (typeof paused !== 'boolean') throw refused([error('paused.invalid', { path: 'paused' })]);

  const status = await transaction(async (client) => {
    const popup = await getRow<Popup>(client, 'popup', 'popup', req.params.id, { lock: true });
    if (popup.status === 'draft')
      throw conflict('This popup has never been published: publish it first.');
    const wanted = paused ? 'paused' : 'published';
    if (popup.status === wanted) return wanted;
    await updateRow(client, 'popup', popup.id, { status: wanted, ...updatedBy(actor) });
    await recordActivity(client, {
      subject: 'popup',
      subjectId: popup.id,
      action: paused ? 'paused' : 'published',
      from: popup.status,
      to: wanted,
      actor,
    });
    return wanted;
  });
  res.json({ status });
});
