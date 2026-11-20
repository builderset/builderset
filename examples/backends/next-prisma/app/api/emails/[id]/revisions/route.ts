import { currentUser } from '@/lib/auth';
import { checkDocument } from '@/lib/email-check';
import { listRevisions, saveNamedRevision } from '@/lib/history';
import { optionalText, readJson, route } from '@/lib/http';

/** GET /api/emails/:id/revisions: the editor's history panel. */
export const GET = route<{ id: string }>(async (request, { id }) => {
  await currentUser(request);
  return Response.json(await listRevisions(id));
});

/** POST /api/emails/:id/revisions: a version someone named, to come back to. */
export const POST = route<{ id: string }>(async (request, { id }) => {
  const user = await currentUser(request);
  const body = await readJson(request);
  const label = optionalText(body.label, 'label', 120);
  const document = checkDocument(body.document, 'draft');
  return Response.json(await saveNamedRevision(id, document, label, user), { status: 201 });
});
