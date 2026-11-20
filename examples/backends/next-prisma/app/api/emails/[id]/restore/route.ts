import { currentUser } from '@/lib/auth';
import { restoreEmail } from '@/lib/emails';
import { route } from '@/lib/http';

/** POST /api/emails/:id/restore: out of the trash. The only route a deleted template answers. */
export const POST = route<{ id: string }>(async (request, { id }) => {
  return Response.json(await restoreEmail(id, await currentUser(request)));
});
