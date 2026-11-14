import { checkEmail, isPublishBlocking, parseEmail } from '@builderset/email';

import { emailRegistry, readEmail, writeEmail } from '@/lib/store';

type Context = { params: Promise<{ id: string }> };

/** POST {base}/publish: the strict check, then the draft becomes the live design. */
export async function POST(request: Request, { params }: Context) {
  const id = (await params).id;
  const record = await readEmail(id);
  if (!record) return Response.json({ error: 'not found' }, { status: 404 });
  const body = (await request.json()) as { document: unknown };
  const document = parseEmail(body.document, emailRegistry);
  if (!document) return Response.json({ issues: [{ code: 'not_an_email' }] }, { status: 422 });
  const issues = checkEmail(document, emailRegistry, null).filter(isPublishBlocking);
  if (issues.length) return Response.json({ issues }, { status: 422 });
  const now = new Date().toISOString();
  await writeEmail(id, {
    document,
    draft_document: null,
    saved_at: now,
    status: 'published',
    published_at: now,
  });
  return Response.json({ saved_at: now, status: 'published', published_at: now });
}
