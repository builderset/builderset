import { currentUser } from '@/lib/auth';
import { deleteEmail, getEmail } from '@/lib/emails';
import { route } from '@/lib/http';

/** GET /api/emails/:id: the live document, the draft, and when they were saved. */
export const GET = route<{ id: string }>(async (request, { id }) => {
  await currentUser(request);
  return Response.json(await getEmail(id));
});

/** DELETE /api/emails/:id: into the trash. A published template is unpublished first. */
export const DELETE = route<{ id: string }>(async (request, { id }) => {
  await deleteEmail(id, await currentUser(request));
  return new Response(null, { status: 204 });
});
