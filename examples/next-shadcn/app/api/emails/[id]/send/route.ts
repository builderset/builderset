import { renderEmail } from '@builderset/email/render';

import { readEmail } from '@/lib/store';

type Context = { params: Promise<{ id: string }> };

/** POST {base}/send: what a mailer does — render on the server, no React. Returns the HTML. */
export async function POST(request: Request, { params }: Context) {
  const record = await readEmail((await params).id);
  if (!record) return Response.json({ error: 'not found' }, { status: 404 });
  const data = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const { html } = renderEmail(record.document, {
    assetUrl: (key) => `https://cdn.example.com/${key}`,
    data,
    locale: 'en',
  });
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
}
