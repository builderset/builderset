import { currentUser } from '@/lib/auth';
import { unpublishEmail } from '@/lib/emails';
import { route } from '@/lib/http';

/** POST /api/emails/:id/unpublish: back to a draft, so it is no longer sent. */
export const POST = route<{ id: string }>(async (request, { id }) => {
  return Response.json(await unpublishEmail(id, await currentUser(request)));
});
