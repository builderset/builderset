import { currentUser } from '@/lib/auth';
import { checkDocument } from '@/lib/email-check';
import { createEmail, listEmails } from '@/lib/emails';
import { optionalText, pageOf, readJson, route } from '@/lib/http';
import { EMAIL_STATUSES } from '@/lib/vocabulary';

/** GET /api/emails: the templates, newest change first; `?deleted=true` for the trash. */
export const GET = route(async (request) => {
  await currentUser(request);
  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const list = await listEmails({
    status: EMAIL_STATUSES.find((known) => known === status) ?? null,
    q: url.searchParams.get('q')?.trim() || null,
    deleted: url.searchParams.get('deleted') === 'true',
    ...pageOf(url),
  });
  return Response.json(list);
});

/** POST /api/emails: a new template, as a draft. The back office sends a starter document. */
export const POST = route(async (request) => {
  const user = await currentUser(request);
  const body = await readJson(request);
  const typeKey = optionalText(body.type_key, 'type_key', 60);
  const document = checkDocument(body.document, 'draft');
  return Response.json(await createEmail(document, typeKey, user), { status: 201 });
});
