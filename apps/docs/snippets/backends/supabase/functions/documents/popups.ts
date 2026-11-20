// A popup on the site or off it, for your team (visitors reach the popups function):
//   PATCH /documents/popups/:id/pause   { paused: true | false }
import { HttpError, json } from '../_shared/http.ts';
import { write } from '../_shared/supabase.ts';
import type { Call } from './call.ts';

/**
 * Off the site, kept as it is, or back on. 409 for a popup never published.
 * Only the status changes: the document and saved_at stay as they are.
 */
export async function pause({ params, body, member }: Call) {
  if (typeof body.paused !== 'boolean') throw new HttpError(400, 'paused is true or false.');
  const status = await write<string>('pause_popup', {
    p_uuid: params.id,
    p_paused: body.paused,
    p_actor: member.id,
  });
  return json({ status });
}
