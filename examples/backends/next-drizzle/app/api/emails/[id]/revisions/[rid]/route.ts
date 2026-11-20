import { currentUser } from '@/lib/auth';
import { getRevision } from '@/lib/history';
import { route } from '@/lib/http';

/** GET /api/emails/:id/revisions/:rid: one revision's document, to look at or restore. */
export const GET = route<{ id: string; rid: string }>(async (request, { id, rid }) => {
  await currentUser(request);
  return Response.json(await getRevision(id, rid));
});
