import { validateAnswers, type FormDocument } from '@builderset/form';
import { Router, type Request, type Response } from 'express';

import { pool, transaction } from './db';

/**
 * The routes visitors use, without signing in: the published form, and a
 * response to it. The answers are checked against the PUBLISHED document,
 * never the draft, and only what `validateAnswers` keeps is stored.
 */

interface PublicForm {
  id: number;
  status: 'published' | 'closed';
  version: number;
  response_count: number;
  document: FormDocument;
}

async function findPublic(slug: string): Promise<PublicForm | null> {
  const { rows } = await pool.query<PublicForm>(
    `select id, status, version, response_count, document from form
     where slug = $1 and status in ('published', 'closed')`,
    [slug],
  );
  return rows[0] ?? null;
}

/** Whether the form takes no responses now: closed by hand, full, or outside its dates. */
function isClosed(form: PublicForm, now = Date.now()) {
  const { maxResponses, opensAt, closesAt } = form.document.settings.limits;
  return (
    form.status === 'closed' ||
    (maxResponses !== null && form.response_count >= maxResponses) ||
    (opensAt !== null && Date.parse(opensAt) > now) ||
    (closesAt !== null && Date.parse(closesAt) <= now)
  );
}

/** 410, with the form's own closed message for the visitor. */
const gone = (res: Response, form: PublicForm) =>
  res.status(410).json({ message: form.document.settings.limits.closedMessage });

export const publicForms = Router();

/** GET /api/public/forms/:slug — the form, for the page that shows it. */
publicForms.get('/:slug', async (req, res) => {
  const form = await findPublic(req.params.slug);
  if (!form) return res.status(404).json({ message: 'There is no such form.' });
  if (!isClosed(form)) return res.json({ document: form.document });
  // Closed, the page still gets the document: <FormView closed> shows the
  // closed message in the form's own look.
  return res.status(410).json({ closed: true, document: form.document });
});

/** POST /api/public/forms/:slug/responses — `{ answers, locale, trap }` from FormView's onSubmit. */
publicForms.post('/:slug/responses', async (req, res) => {
  const form = await findPublic(req.params.slug);
  if (!form) return res.status(404).json({ message: 'There is no such form.' });
  if (isClosed(form)) return gone(res, form);
  const body = (req.body ?? {}) as { answers?: unknown; locale?: unknown; trap?: unknown };

  // The hidden trap field is filled only by bots. They are told it worked
  // and nothing is stored, so they learn nothing to work around.
  if (typeof body.trap === 'string' && body.trap !== '') return res.status(201).json({ id: null });

  const answers =
    typeof body.answers === 'object' && body.answers !== null && !Array.isArray(body.answers)
      ? (body.answers as Record<string, unknown>)
      : {};
  const result = validateAnswers(form.document, answers);
  if (!result.ok) return res.status(422).json({ errors: result.errors });

  const { maxResponses } = form.document.settings.limits;
  const id = await transaction(async (client) => {
    // Counted and limited in one statement: two last responses at once cannot both get in.
    const counted = await client.query(
      `update form set response_count = response_count + 1
       where id = $1 and status = 'published' and ($2::int is null or response_count < $2)`,
      [form.id, maxResponses],
    );
    if (counted.rowCount === 0) return null;
    const { rows } = await client.query<{ id: number }>(
      `insert into form_response (form_id, form_version, answers, locale, ip)
       values ($1, $2, $3, $4, $5) returning id`,
      [
        form.id,
        form.version,
        // Only the shown fields' answers, numbers as numbers: never the raw body.
        result.values,
        typeof body.locale === 'string' ? body.locale.slice(0, 10) : null,
        form.document.settings.privacy.storeIp ? (req.ip ?? null) : null,
      ],
    );
    return rows[0].id;
  });
  return id === null ? gone(res, form) : res.status(201).json({ id });
});

/** A line for the Responses tab: the first text answer, as the editor lists it. */
function titleOf(answers: Record<string, unknown>, id: number) {
  const first = Object.values(answers).find((value) => typeof value === 'string' && value.trim());
  return typeof first === 'string' ? first.slice(0, 80) : `Response ${String(id)}`;
}

/** GET /api/forms/:id/responses — for the editor's `loadResponses`, and your inbox. */
export async function listResponses(req: Request<{ id: string }>, res: Response) {
  if (!/^\d{1,15}$/.test(req.params.id)) return res.status(404).json({ message: 'No such form.' });
  const [counts, latest] = await Promise.all([
    pool.query<{ total: number; this_week: number }>(
      `select count(*)::int as total,
              count(*) filter (where created_at > now() - interval '7 days')::int as this_week
       from form_response where form_id = $1`,
      [req.params.id],
    ),
    pool.query<{ id: number; answers: Record<string, unknown>; status: string; created_at: Date }>(
      `select id, answers, status, created_at from form_response
       where form_id = $1 order by created_at desc limit 20`,
      [req.params.id],
    ),
  ]);
  return res.json({
    ...counts.rows[0],
    latest: latest.rows.map((row) => ({
      id: String(row.id),
      title: titleOf(row.answers, row.id),
      when: row.created_at.toISOString(),
      status: row.status,
    })),
  });
}
