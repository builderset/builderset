import { renderEmail } from '@builderset/email/render';

import { currentUser } from '@/lib/auth';
import { findLive } from '@/lib/emails';
import { conflict, readJson, route } from '@/lib/http';

/**
 * POST /api/emails/:id/send: what your mailer does, rendered on the server
 * from the live document. Answers with the email instead of sending it.
 */
export const POST = route<{ id: string }>(async (request, { id }) => {
  await currentUser(request);
  const template = await findLive(id);
  // A draft is never sent.
  if (template.status !== 'published') throw conflict('Only a published template is sent.');
  const body = await readJson(request);
  const origin = new URL(request.url).origin;
  const email = renderEmail(template.document, {
    data: (body.data ?? {}) as Record<string, unknown>,
    locale: 'en',
    // A mail client has no page to resolve a path against: every URL is absolute.
    assetUrl: (key) => `${origin}/api/uploads/${key}`,
  });
  // Here a real project hands subject, html and text to its mailer. A variable
  // with no value renders empty and is listed in warnings.
  return Response.json({
    subject: email.subject,
    html: email.html,
    text: email.text,
    warnings: email.warnings,
  });
});
