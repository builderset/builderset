// A form's responses, for your team (visitors send them to form-responses):
//   GET    /documents/forms/:id/responses               the editor's Responses tab
//   PATCH  /documents/forms/:id/responses/:responseId   triage: { status, note }
//   DELETE /documents/forms/:id/responses/:responseId
import { presentOne, softDelete } from '../_shared/audit.ts';
import { HttpError, json, noContent, notFound, type Json } from '../_shared/http.ts';
import { admin, rowsOf, write } from '../_shared/supabase.ts';
import { liveDocument, type Call } from './call.ts';
import { kindOf } from './kinds.ts';

const forms = kindOf('forms');
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** What a response shows in your inbox: never its ip. */
const RESPONSE_COLUMNS =
  'uuid, form_version, answers, locale, status, note, created_at, created_by, updated_at, updated_by';

/** One live response of one live form: another form's id in the path is a 404. */
async function responseOf(formId: string, responseId: string): Promise<Json> {
  const form = await liveDocument<{ id: number }>(forms, formId, 'id');
  const row = rowsOf<Json | null>(
    await admin
      .from('form_response')
      .select(RESPONSE_COLUMNS)
      .eq('uuid', responseId)
      .eq('form_id', form.id)
      .is('deleted_at', null)
      .maybeSingle(),
  );
  if (!row) throw notFound('response');
  return row;
}

/** A line for the Responses tab: the first answer that is text, usually a name. */
function titleOf(answers: Json): string {
  const first = Object.values(answers).find((value) => typeof value === 'string' && value.trim());
  return typeof first === 'string' ? first.slice(0, 80) : 'Response';
}

export async function summary({ params }: Call) {
  const form = await liveDocument<{ id: number }>(forms, params.id, 'id');
  const weekAgo = new Date(Date.now() - WEEK_MS).toISOString();
  const [latest, thisWeek] = await Promise.all([
    admin
      .from('form_response')
      .select('uuid, answers, status, created_at', { count: 'exact' })
      .eq('form_id', form.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(10),
    // Only the count: `head` asks for no rows.
    admin
      .from('form_response')
      .select('uuid', { count: 'exact', head: true })
      .eq('form_id', form.id)
      .is('deleted_at', null)
      .gte('created_at', weekAgo),
  ]);
  const rows =
    rowsOf<{ uuid: string; answers: Json; status: string; created_at: string }[]>(latest);
  if (thisWeek.error) throw thisWeek.error;
  return json({
    total: latest.count ?? 0,
    this_week: thisWeek.count ?? 0,
    latest: rows.map((row) => ({
      id: row.uuid,
      title: titleOf(row.answers),
      when: row.created_at,
      status: row.status,
    })),
  });
}

export async function triage({ params, body, member }: Call) {
  const status = body.status ?? null;
  const note = body.note ?? null;
  if (status !== null && (typeof status !== 'string' || !/^[a-z_]{1,30}$/.test(status)))
    throw new HttpError(400, 'A status is one word of 30 letters at most: new, called, done.');
  if (note !== null && typeof note !== 'string') throw new HttpError(400, 'A note is text.');

  await write<null>('triage_response', {
    p_form: params.id,
    p_response: params.responseId,
    p_status: status,
    p_note: note,
    p_actor: member.id,
  });
  return json(await presentOne(await responseOf(params.id, params.responseId)));
}

export async function remove({ params, member }: Call) {
  await responseOf(params.id, params.responseId);
  await softDelete('form_response', params.responseId, member);
  return noContent();
}
