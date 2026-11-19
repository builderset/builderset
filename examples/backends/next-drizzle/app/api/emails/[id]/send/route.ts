import { renderEmail } from '@builderset/email/render';

import { findEmail, notFound } from '@/lib/emails';

type Context = { params: Promise<{ id: string }> };

/**
 * POST /api/emails/:id/send: what your mailer does, rendered on the server
 * from the live document. Answers with the email instead of sending it.
 */
export async function POST(request: Request, { params }: Context) {
  const row = await findEmail((await params).id);
  if (!row) return notFound();
  // A draft is never sent.
  if (row.status !== 'published')
    return Response.json({ message: 'Only a published template is sent.' }, { status: 409 });
  const body = (await request.json()) as { data?: Record<string, unknown> };
  const origin = new URL(request.url).origin;
  const email = renderEmail(row.document, {
    data: body.data ?? {},
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
}
