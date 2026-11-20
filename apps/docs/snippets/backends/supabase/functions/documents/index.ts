// The editor's routes for all three builders, as one Edge Function:
//   POST /documents/{kind}               a new document
//   GET  /documents/{kind}/{id}          what the editor reloads
//   PUT  /documents/{kind}/{id}/draft    a save
//   POST /documents/{kind}/{id}/publish
//   POST /documents/{kind}/{id}/unpublish
// {kind} is emails, articles or forms. Lists read the tables directly: the
// team's RLS policy lets them.
import { admin, cors, isUniqueViolation, json } from '../_shared/supabase.ts';
import { KINDS, type Kind } from './kinds.ts';

type Row = Record<string, unknown> & { id: string; saved_at: string; version: number };
interface Member {
  id: string;
  role: 'editor' | 'publisher';
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** The signed-in user, if they are on the team (a row in profiles). */
async function memberOf(request: Request): Promise<Member | null> {
  const token = request.headers.get('Authorization')?.replace(/^Bearer /, '');
  if (!token) return null;
  const { data } = await admin.auth.getUser(token);
  if (!data.user) return null;
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .maybeSingle();
  return profile ? { id: data.user.id, role: profile.role } : null;
}

const recordOf = (row: Row) => ({
  id: row.id,
  status: row.status,
  document: row.document,
  draft_document: row.draft_document,
  saved_at: row.saved_at,
  published_at: row.published_at ?? null,
});

async function create(kind: Kind, body: Record<string, unknown>, member: Member) {
  const checked = kind.check(body.document, 'draft', body);
  if (!checked.ok) return json({ issues: checked.issues }, 422);
  const columns = kind.create(body, checked.document, member.id);
  if (!columns) return json({ message: `This ${kind.noun} needs a slug and a locale.` }, 400);
  const { data, error } = await admin
    .from(kind.table)
    .insert({ ...kind.copies(checked.document), ...columns, document: checked.document })
    .select()
    .single();
  if (isUniqueViolation(error)) return json({ message: 'That address is taken.' }, 409);
  if (error) throw error;
  return json(recordOf(data as Row), 201);
}

// #region draft
async function saveDraft(kind: Kind, row: Row, body: Record<string, unknown>) {
  // The editor sends back the saved_at it last saw. Another one here means
  // someone else saved in between; "keep mine" sends force.
  const expected = body.expected_saved_at;
  if (
    body.force !== true &&
    typeof expected === 'string' &&
    new Date(expected).getTime() !== new Date(row.saved_at).getTime()
  )
    return json({ message: 'Someone else saved this since you opened it.' }, 409);
  const checked = kind.check(body.document, 'draft', row);
  if (!checked.ok) return json({ issues: checked.issues }, 422);
  // Written only if the row is still the one read above, so two saves at the
  // same moment cannot both win.
  const { data, error } = await admin
    .from(kind.table)
    .update({ draft_document: checked.document, saved_at: new Date().toISOString() })
    .eq('id', row.id)
    .eq('saved_at', row.saved_at)
    .select('saved_at');
  if (error) throw error;
  return data.length
    ? json({ saved_at: data[0].saved_at })
    : json({ message: 'Someone else saved this since you opened it.' }, 409);
}
// #endregion

// #region publish
async function publish(kind: Kind, row: Row, body: Record<string, unknown>) {
  const checked = kind.check(body.document, 'publish', row);
  if (!checked.ok) return json({ issues: checked.issues }, 422);
  const now = new Date();
  const later =
    kind.schedules && typeof body.scheduled_at === 'string' && new Date(body.scheduled_at) > now
      ? body.scheduled_at
      : null;
  // One active design per email type: the one before steps down. If two
  // publish at once, the unique index refuses the second.
  if (kind.table === 'email_template' && row.type_key) {
    await admin
      .from('email_template')
      .update({ status: 'draft', saved_at: now.toISOString() })
      .eq('type_key', row.type_key)
      .eq('status', 'published')
      .neq('id', row.id);
  }
  const { data, error } = await admin
    .from(kind.table)
    .update({
      ...kind.copies(checked.document),
      document: checked.document,
      draft_document: null,
      // A scheduled article waits for your job (pg_cron) to set it live.
      status: later ? 'scheduled' : 'published',
      ...(kind.schedules ? { scheduled_at: later } : {}),
      published_at: later ? null : now.toISOString(),
      saved_at: now.toISOString(),
      version: row.version + 1,
    })
    .eq('id', row.id)
    .select()
    .single();
  if (isUniqueViolation(error))
    return json({ issues: [{ code: 'meta.slugTaken', path: 'meta.slug' }] }, 422);
  if (error) throw error;
  const saved = data as Row;
  return json({
    saved_at: saved.saved_at,
    status: saved.status,
    published_at: saved.published_at,
    ...(kind.schedules ? { scheduled_at: saved.scheduled_at } : {}),
  });
}
// #endregion

async function unpublish(kind: Kind, row: Row) {
  const { data, error } = await admin
    .from(kind.table)
    .update({ status: kind.unpublished, saved_at: new Date().toISOString() })
    .eq('id', row.id)
    .select('status, saved_at')
    .single();
  if (error) throw error;
  return json(data);
}

// #region serve
Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
  const member = await memberOf(request);
  if (!member) return json({ message: 'Sign in as a member of the team.' }, 401);

  const [, kindName = '', id, action = ''] = new URL(request.url).pathname
    .split('/')
    .filter(Boolean);
  const kind = Object.hasOwn(KINDS, kindName) ? KINDS[kindName] : undefined;
  if (!kind) return json({ message: 'Not found.' }, 404);
  // A document is JSON of any size until it is checked.
  if (Number(request.headers.get('Content-Length') ?? 0) > 2_000_000)
    return json({ message: 'The document is too large.' }, 413);
  const body = request.method === 'GET' ? {} : await request.json().catch(() => ({}));

  if (id === undefined && request.method === 'POST') return create(kind, body, member);
  if (!id || !UUID.test(id)) return json({ message: 'Not found.' }, 404);
  const { data: row } = await admin.from(kind.table).select('*').eq('id', id).maybeSingle();
  if (!row) return json({ message: `There is no such ${kind.noun}.` }, 404);

  // Publishing is its own permission.
  if ((action === 'publish' || action === 'unpublish') && member.role !== 'publisher')
    return json({ message: 'You may not publish.' }, 403);

  switch (`${request.method} ${action}`) {
    case 'GET ':
      return json(recordOf(row as Row));
    case 'PUT draft':
      return saveDraft(kind, row as Row, body);
    case 'POST publish':
      return publish(kind, row as Row, body);
    case 'POST unpublish':
      return unpublish(kind, row as Row);
    default:
      return json({ message: 'Not found.' }, 404);
  }
});
// #endregion
