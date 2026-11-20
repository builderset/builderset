// The popups your site shows, for visitors. Called with the project's anon
// key, or a signed-in visitor's token:
//   GET  /popups?path=&locale=     the popups that may show on this page
//   POST /popups/:id/submissions   { values, path, locale }, from PopupView's onSubmit
// PopupView's onEvent needs no function: the page calls record_popup_event
// through the REST API (10_popups.sql). Deploy it with
// `supabase functions deploy popups`.
import {
  formatOf,
  languageMatches,
  pathMatches,
  validateSubmission,
  type PopupDocument,
} from 'npm:@builderset/popup@0.4.0';

import { userIdOf } from '../_shared/auth.ts';
import {
  answerError,
  cors,
  HttpError,
  json,
  matchPath,
  notFound,
  readJson,
  segmentsAfter,
} from '../_shared/http.ts';
import { admin, rowsOf, visitor, write } from '../_shared/supabase.ts';

/** A submission's address is kept only when your privacy rules allow it. Off here. */
const STORE_IP = false;

interface SitePopup {
  uuid: string;
  status: 'published' | 'paused';
  version: number;
  document: PopupDocument;
  starts_at: string | null;
  ends_at: string | null;
}

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

/**
 * The popups that may show on this page, highest priority first. They are
 * read with the anon key: the policy of 10_popups.sql lets through only the
 * published ones inside their dates, and only their public columns.
 */
async function forPage(url: URL): Promise<Response> {
  const path = url.searchParams.get('path');
  const locale = url.searchParams.get('locale');
  const rows = rowsOf<{ uuid: string; version: number; document: PopupDocument }[]>(
    await visitor
      .from('popup')
      .select('uuid, version, document')
      .order('priority', { ascending: false })
      .order('uuid'),
  );
  return json(
    rows
      .filter((row) => isForPage(row.document, path, locale))
      .map(({ uuid, version, document }) => ({ id: uuid, version, document })),
  );
}

/** A popup that is published or paused: a draft has never been on the site. */
async function sitePopup(id: string): Promise<SitePopup> {
  const popup = rowsOf<SitePopup | null>(
    await admin
      .from('popup')
      .select('uuid, status, version, document, starts_at, ends_at')
      .eq('uuid', id)
      .in('status', ['published', 'paused'])
      .is('deleted_at', null)
      .maybeSingle(),
  );
  if (!popup) throw notFound('popup');
  return popup;
}

/** Whether visitors may see it now, as far as the server can tell. */
const isShowing = (popup: SitePopup, now = Date.now()) =>
  popup.status === 'published' &&
  (popup.starts_at === null || Date.parse(popup.starts_at) <= now) &&
  (popup.ends_at === null || Date.parse(popup.ends_at) > now);

/**
 * What the visitor typed, checked against the live popup by the same
 * validateSubmission the browser ran; only its values are stored. It has no
 * rate limit: the 429 of the data model needs a counter by address, in a
 * table or at your edge.
 */
async function submit(request: Request, id: string): Promise<Response> {
  const popup = await sitePopup(id);
  const gone = new HttpError(410, 'This popup is no longer on the site.');
  if (!isShowing(popup)) throw gone;

  const body = await readJson(request);
  const result = validateSubmission(popup.document, body.values);
  if (!result.ok) return json({ errors: result.errors }, 422);

  // Null: it was paused or ended meanwhile.
  const submission = await write<string | null>('record_popup_submission', {
    p_popup: popup.uuid,
    p_popup_version: popup.version,
    // Only the popup's own inputs, trimmed: never the raw body.
    p_answers: result.values,
    p_page_path: typeof body.path === 'string' ? body.path.slice(0, 500) : null,
    p_locale: typeof body.locale === 'string' ? body.locale.slice(0, 10) : null,
    p_ip: STORE_IP ? (request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ?? null) : null,
    // A signed-in visitor is the submission's created_by; the anon key is nobody.
    p_visitor: await userIdOf(request),
  });
  if (submission === null) throw gone;
  return json({ id: submission }, 201);
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
  try {
    const segments = segmentsAfter(request, 'popups');
    if (request.method === 'GET' && segments.length === 0)
      return await forPage(new URL(request.url));
    const params = matchPath(':id/submissions', segments);
    if (request.method === 'POST' && params) return await submit(request, params.id);
    throw notFound();
  } catch (error) {
    return answerError(error);
  }
});
