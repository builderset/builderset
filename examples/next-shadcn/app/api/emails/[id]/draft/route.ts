import { checkEmail, isDraftBlocking, parseEmail } from '@builderset/email';

import { emailRegistry, readEmail, writeEmail } from '@/lib/store';

type Context = { params: Promise<{ id: string }> };

/** PUT {base}/draft: an autosave or a manual save, checked like any write. */
export async function PUT(request: Request, { params }: Context) {
  const id = (await params).id;
  const record = await readEmail(id);
  if (!record) return Response.json({ error: 'not found' }, { status: 404 });
  const body = (await request.json()) as {
    document: unknown;
    expected_saved_at?: string | null;
    force?: boolean;
  };
  // Someone else saved since this editor last did: answer 409, unless "keep mine".
  if (!body.force && body.expected_saved_at && body.expected_saved_at !== record.saved_at)
    return Response.json({ error: 'conflict' }, { status: 409 });
  const document = parseEmail(body.document, emailRegistry);
  if (!document) return Response.json({ issues: [{ code: 'not_an_email' }] }, { status: 422 });
  const issues = checkEmail(document, emailRegistry, null).filter(isDraftBlocking);
  if (issues.length) return Response.json({ issues }, { status: 422 });
  const saved_at = new Date().toISOString();
  await writeEmail(id, { ...record, draft_document: document, saved_at });
  return Response.json({ saved_at });
}
