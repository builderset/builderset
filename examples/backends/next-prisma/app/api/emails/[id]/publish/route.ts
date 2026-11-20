import { currentUser } from '@/lib/auth';
import { checkDocument } from '@/lib/email-check';
import { publishEmail } from '@/lib/emails';
import { readJson, route } from '@/lib/http';

/** POST /api/emails/:id/publish: the strict check, then the document goes live. */
export const POST = route<{ id: string }>(async (request, { id }) => {
  const user = await currentUser(request);
  const body = await readJson(request);
  // An email has no schedule: `scheduled_at`, which the editor always sends, is not read.
  const document = checkDocument(body.document, 'publish');
  return Response.json(await publishEmail(id, document, user));
});
