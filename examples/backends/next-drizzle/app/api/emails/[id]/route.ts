import { findEmail, notFound, recordOf } from '@/lib/emails';

type Context = { params: Promise<{ id: string }> };

/** GET /api/emails/:id: the live document, the draft, and when they were saved. */
export async function GET(_request: Request, { params }: Context) {
  const row = await findEmail((await params).id);
  return row ? Response.json(recordOf(row)) : notFound();
}
