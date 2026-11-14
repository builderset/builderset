import { readEmail } from '@/lib/store';

type Context = { params: Promise<{ id: string }> };

/** GET {base}: the document, its draft, and when it was saved. */
export async function GET(_request: Request, { params }: Context) {
  const record = await readEmail((await params).id);
  if (!record) return Response.json({ error: 'not found' }, { status: 404 });
  return Response.json({
    document: record.document,
    draft_document: record.draft_document,
    saved_at: record.saved_at,
    status: record.status,
  });
}
