// POST /form-responses/{slug}, body { answers, locale, trap }: a visitor's
// response, from FormView's onSubmit. Called with the project's anon key, or a
// signed-in visitor's token. Nobody may insert into form_response through the
// REST API: this function checks the answers, then stores them with the
// service role. Deploy it with `supabase functions deploy form-responses`.
import { validateAnswers, type Answers, type FormDocument } from 'npm:@builderset/form@0.4.0';

import { userIdOf } from '../_shared/auth.ts';
import {
  answerError,
  cors,
  HttpError,
  json,
  notFound,
  readJson,
  segmentsAfter,
} from '../_shared/http.ts';
import { admin, rowsOf, write } from '../_shared/supabase.ts';

interface PublicForm {
  uuid: string;
  status: 'published' | 'closed';
  version: number;
  response_count: number;
  document: FormDocument;
}

/** The form the visitor saw: the PUBLISHED document, never the draft. */
async function publicForm(slug: string): Promise<PublicForm> {
  const form = rowsOf<PublicForm | null>(
    await admin
      .from('form')
      .select('uuid, status, version, response_count, document')
      .eq('slug', slug)
      .in('status', ['published', 'closed'])
      .is('deleted_at', null)
      .maybeSingle(),
  );
  if (!form) throw notFound('form');
  return form;
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

/** The visitor's address, kept only when the form asks for it. */
const ipOf = (request: Request, form: PublicForm) =>
  form.document.settings.privacy.storeIp
    ? (request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ?? null)
    : null;

async function respond(request: Request): Promise<Response> {
  const [slug = ''] = segmentsAfter(request, 'form-responses');
  const form = await publicForm(slug);
  const closed = new HttpError(410, form.document.settings.limits.closedMessage);
  if (isClosed(form)) throw closed;

  const body = await readJson(request);
  // The hidden trap field is filled only by bots. They are told it worked and
  // nothing is stored, so they learn nothing to work around.
  if (typeof body.trap === 'string' && body.trap !== '') return json({ id: null }, 201);

  const answers: Answers =
    typeof body.answers === 'object' && body.answers !== null && !Array.isArray(body.answers)
      ? (body.answers as Answers)
      : {};
  const result = validateAnswers(form.document, answers);
  if (!result.ok) return json({ errors: result.errors }, 422);

  // Counted and stored in one transaction (07_writes.sql), so the last places
  // of maxResponses cannot be taken twice. Null: it closed or filled meanwhile.
  const id = await write<string | null>('record_form_response', {
    p_form: form.uuid,
    p_form_version: form.version,
    // Only the shown fields' answers, numbers as numbers: never the raw body.
    p_answers: result.values,
    p_locale: typeof body.locale === 'string' ? body.locale.slice(0, 10) : null,
    p_ip: ipOf(request, form),
    p_max_responses: form.document.settings.limits.maxResponses,
    // A signed-in visitor is the response's created_by; the anon key is nobody.
    p_visitor: await userIdOf(request),
  });
  if (id === null) throw closed;
  return json({ id }, 201);
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (request.method !== 'POST') return answerError(notFound());
  try {
    return await respond(request);
  } catch (error) {
    return answerError(error);
  }
});
