import { currentUser } from '@/lib/auth';
import { emailActivity } from '@/lib/history';
import { pageOf, route } from '@/lib/http';

/** GET /api/emails/:id/activity: who did what to the template, newest first. */
export const GET = route<{ id: string }>(async (request, { id }) => {
  await currentUser(request);
  const { limit } = pageOf(new URL(request.url));
  return Response.json(await emailActivity(id, limit));
});
