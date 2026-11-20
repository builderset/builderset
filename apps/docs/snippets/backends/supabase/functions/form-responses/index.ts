// POST /form-responses/{slug}, body { answers, locale, trap }: a visitor's
// response, from FormView's onSubmit. Called with the project's anon key: no
// sign-in. The anon role cannot insert into form_response itself; this
// function checks the answers and then stores them with the service role.
import { validateAnswers, type FormDocument } from 'npm:@builderset/form@0.4.0';

import { admin, cors, json } from '../_shared/supabase.ts';

interface PublicForm {
  id: string;
  status: 'published' | 'closed';
  version: number;
  response_count: number;
  document: FormDocument;
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

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (request.method !== 'POST') return json({ message: 'Not found.' }, 404);
  const slug = new URL(request.url).pathname.split('/').filter(Boolean)[1] ?? '';

  // The PUBLISHED document, never the draft: that is what the visitor saw.
  const { data } = await admin
    .from('form')
    .select('id, status, version, response_count, document')
    .eq('slug', slug)
    .in('status', ['published', 'closed'])
    .maybeSingle();
  const form = data as PublicForm | null;
  if (!form) return json({ message: 'There is no such form.' }, 404);
  const closed = () => json({ message: form.document.settings.limits.closedMessage }, 410);
  if (isClosed(form)) return closed();

  const body = await request.json().catch(() => ({}));
  // The hidden trap field is filled only by bots. They are told it worked and
  // nothing is stored, so they learn nothing to work around.
  if (typeof body.trap === 'string' && body.trap !== '') return json({ id: null }, 201);

  const answers =
    typeof body.answers === 'object' && body.answers !== null && !Array.isArray(body.answers)
      ? body.answers
      : {};
  const result = validateAnswers(form.document, answers);
  if (!result.ok) return json({ errors: result.errors }, 422);

  // Counted and stored in one transaction (see the migration), so the last
  // places of maxResponses cannot be taken twice.
  const { data: id, error } = await admin.rpc('record_form_response', {
    p_form_id: form.id,
    p_form_version: form.version,
    // Only the shown fields' answers, numbers as numbers: never the raw body.
    p_answers: result.values,
    p_locale: typeof body.locale === 'string' ? body.locale.slice(0, 10) : null,
    p_ip: form.document.settings.privacy.storeIp
      ? (request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ?? null)
      : null,
    p_max_responses: form.document.settings.limits.maxResponses,
  });
  if (error) throw error;
  return id === null ? closed() : json({ id }, 201);
});
