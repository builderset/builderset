import { prisma } from '@/lib/db';
import { findEmail, notFound } from '@/lib/emails';

type Context = { params: Promise<{ id: string }> };

/** POST /api/emails/:id/unpublish: back to a draft, so it is no longer sent. */
export async function POST(_request: Request, { params }: Context) {
  const row = await findEmail((await params).id);
  if (!row) return notFound();
  const saved = await prisma.emailTemplate.update({
    where: { id: row.id },
    data: { status: 'draft', savedAt: new Date() },
  });
  return Response.json({ saved_at: saved.savedAt.toISOString(), status: saved.status });
}
