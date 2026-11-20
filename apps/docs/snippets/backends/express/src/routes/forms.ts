import { error } from '@builderset/engine';
import { validateAnswers } from '@builderset/form';
import { Router, type Request } from 'express';

import { recordActivity, softDelete, updatedBy } from '../audit';
import { currentUser } from '../auth';
import { insertRow, pool, transaction, updateRow } from '../db';
import { bodyOf, HttpError, notFound, oneOf, refused, textOf } from '../http';
import { answerOf, getRow, sideFilter } from '../models/base';
import { RESPONSE_STATUSES, type Form, type FormResponse } from '../models/forms';

// ── The public side: no sign-in ──────────────────────────────────────────────

/**
 * The form a visitor sees, by its address. A response is checked against
 * this PUBLISHED document, never the draft, and only what validateAnswers
 * keeps is stored.
 */
async function findPublicForm(slug: string): Promise<Form> {
  const { rows } = await pool.query<Form>(
    `select * from form t
      where t.slug = $1 and t.status in ('published', 'closed') and ${sideFilter('live')}`,
    [slug],
  );
  if (!rows[0]) throw notFound('form');
  return rows[0];
}

/** Whether the form takes no responses now: closed by hand, full, or outside its dates. */
function isClosed(form: Form, now = Date.now()) {
  const { maxResponses, opensAt, closesAt } = form.document.settings.limits;
  return (
    form.status === 'closed' ||
    (maxResponses !== null && form.response_count >= maxResponses) ||
    (opensAt !== null && Date.parse(opensAt) > now) ||
    (closesAt !== null && Date.parse(closesAt) <= now)
  );
}

/** 410, with the form's own closed message for the visitor. */
const closed = (form: Form) =>
  new HttpError(410, form.document.settings.limits.closedMessage, { closed: true });

export const publicForms = Router();

/** GET /api/public/forms/:slug — the form, for the page that shows it. */
publicForms.get('/:slug', async (req, res) => {
  const form = await findPublicForm(req.params.slug);
  // Closed, the page still gets the document: <FormView closed> shows the
  // closed message in the form's own look.
  res.status(isClosed(form) ? 410 : 200).json({ document: form.document, closed: isClosed(form) });
});

/**
 * POST /api/public/forms/:slug/responses — `{ answers, locale, trap }` from
 * FormView's onSubmit. Put a rate limit in front of it (your proxy, or
 * express-rate-limit), answering 429.
 */
publicForms.post('/:slug/responses', async (req, res) => {
  const form = await findPublicForm(req.params.slug);
  if (isClosed(form)) throw closed(form);
  const body = bodyOf(req);

  // The hidden trap field is filled only by bots. They are told it worked
  // and nothing is stored, so they learn nothing to work around.
  if (typeof body.trap === 'string' && body.trap !== '') {
    res.status(201).json({ id: null });
    return;
  }

  const answers =
    typeof body.answers === 'object' && body.answers !== null && !Array.isArray(body.answers)
      ? (body.answers as Record<string, unknown>)
      : {};
  const result = validateAnswers(form.document, answers);
  if (!result.ok) {
    res.status(422).json({ errors: result.errors });
    return;
  }

  const id = await storeResponse(req, form, result.values);
  if (id === null) throw closed(form);
  res.status(201).json({ id });
});

/** The response, and the count that limits them, in one transaction. Null when the form filled up meanwhile. */
async function storeResponse(req: Request, form: Form, values: Record<string, unknown>) {
  // A signed-in visitor is the response's creator; anyone else leaves it null.
  const visitor = req.user ?? null;
  const { maxResponses } = form.document.settings.limits;
  return transaction(async (client) => {
    // Counted and limited in one statement: two last responses at once cannot both get in.
    const counted = await client.query(
      `update form set response_count = response_count + 1
        where id = $1 and status = 'published' and ($2::int is null or response_count < $2)`,
      [form.id, maxResponses],
    );
    if (counted.rowCount === 0) return null;
    const response = await insertRow<FormResponse>(client, 'form_response', {
      form_id: form.id,
      form_version: form.version,
      // Only the shown fields' answers, numbers as numbers: never the raw body.
      answers: values,
      locale: textOf(bodyOf(req).locale, 10),
      ip: form.document.settings.privacy.storeIp ? (req.ip ?? null) : null,
      created_by_id: visitor?.id ?? null,
    });
    await recordActivity(client, {
      subject: 'form_response',
      subjectId: response.id,
      action: 'created',
      to: response.status,
      details: { form: form.uuid },
      actor: visitor,
    });
    return response.uuid;
  });
}

// ── Your team's side: the inbox ──────────────────────────────────────────────

export const formResponses = Router();

const findForm = (id: string) => getRow<Form>(pool, 'form', 'form', id);

/** A line for the Responses tab: the first text answer, as the editor lists it. */
function titleOf(answers: Record<string, unknown>, fallback: string) {
  const first = Object.values(answers).find((value) => typeof value === 'string' && value.trim());
  return typeof first === 'string' ? first.slice(0, 80) : fallback;
}

/** GET /api/forms/:id/responses — the editor's loadResponses, and your inbox. */
formResponses.get('/:id/responses', async (req, res) => {
  const form = await findForm(req.params.id);
  const live = sideFilter('live');
  const [counts, latest] = await Promise.all([
    pool.query<{ total: number; this_week: number }>(
      `select count(*)::int as total,
              count(*) filter (where t.created_at > now() - interval '7 days')::int as this_week
         from form_response t where t.form_id = $1 and ${live}`,
      [form.id],
    ),
    pool.query<FormResponse>(
      `select * from form_response t where t.form_id = $1 and ${live}
        order by t.created_at desc limit 20`,
      [form.id],
    ),
  ]);
  res.json({
    ...counts.rows[0],
    latest: latest.rows.map((row) => ({
      id: row.uuid,
      title: titleOf(row.answers, `Response ${row.uuid.slice(0, 8)}`),
      when: row.created_at,
      status: row.status,
    })),
  });
});

/** PATCH /api/forms/:id/responses/:rid — your team's triage: `{ status, note }`. */
formResponses.patch('/:id/responses/:rid', async (req, res) => {
  const actor = currentUser(req);
  const body = bodyOf(req);
  const form = await findForm(req.params.id);
  const answer = await transaction(async (client) => {
    const row = await getRow<FormResponse>(client, 'form_response', 'response', req.params.rid, {
      lock: true,
      where: { form_id: form.id },
    });
    const status = body.status ?? row.status;
    const note = body.note === undefined ? row.note : textOf(body.note, 4000);
    if (!oneOf(RESPONSE_STATUSES, status))
      throw refused([error('status.unknown', { path: 'status' })]);
    if (note === null) throw refused([error('note.invalid', { path: 'note' })]);

    await updateRow(client, 'form_response', row.id, { status, note, ...updatedBy(actor) });
    // The log's word for any triage; a note alone says so in its details.
    if (status !== row.status || note !== row.note) {
      await recordActivity(client, {
        subject: 'form_response',
        subjectId: row.id,
        action: 'status_changed',
        from: row.status,
        to: status,
        details: note === row.note ? {} : { note: true },
        actor,
      });
    }
    return answerOf(client, 'form_response', row.id);
  });
  res.json(answer);
});

/** DELETE /api/forms/:id/responses/:rid — into the trash; your retention job deletes for good. */
formResponses.delete('/:id/responses/:rid', async (req, res) => {
  const actor = currentUser(req);
  const form = await findForm(req.params.id);
  await transaction(async (client) => {
    const row = await getRow<FormResponse>(client, 'form_response', 'response', req.params.rid, {
      lock: true,
      where: { form_id: form.id },
    });
    await softDelete(client, 'form_response', row, actor);
  });
  res.status(204).end();
});
