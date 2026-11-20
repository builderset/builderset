import { currentUser } from '@/lib/auth';
import { checkDocument } from '@/lib/email-check';
import { saveDraft } from '@/lib/emails';
import { optionalInstant, readJson, route } from '@/lib/http';

/** PUT /api/emails/:id/draft: an autosave or a manual save. Readers still get the live document. */
export const PUT = route<{ id: string }>(async (request, { id }) => {
  const user = await currentUser(request);
  const body = await readJson(request);
  const saved = await saveDraft(
    id,
    {
      document: checkDocument(body.document, 'draft'),
      reason: body.reason === 'manual' ? 'manual' : 'autosave',
      expectedSavedAt: optionalInstant(body.expected_saved_at, 'expected_saved_at'),
      force: body.force === true,
    },
    user,
  );
  return Response.json(saved);
});
