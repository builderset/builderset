import { readEmail, writeEmail } from '@/lib/store';

type Context = { params: Promise<{ id: string }> };

/** POST {base}/unpublish */
export async function POST(_request: Request, { params }: Context) {
  const id = (await params).id;
  const record = await readEmail(id);
  if (!record) return Response.json({ error: 'not found' }, { status: 404 });
  const saved_at = new Date().toISOString();
  await writeEmail(id, { ...record, status: 'draft', saved_at });
  return Response.json({ saved_at, status: 'draft' });
}
