import { eq } from 'drizzle-orm';

import { emailTemplate } from '@/db/schema';
import { db } from '@/lib/db';
import { findEmail, notFound } from '@/lib/emails';

type Context = { params: Promise<{ id: string }> };

/** POST /api/emails/:id/unpublish: back to a draft, so it is no longer sent. */
export async function POST(_request: Request, { params }: Context) {
  const row = await findEmail((await params).id);
  if (!row) return notFound();
  const [saved] = await db
    .update(emailTemplate)
    .set({ status: 'draft', savedAt: new Date() })
    .where(eq(emailTemplate.id, row.id))
    .returning();
  return Response.json({ saved_at: saved!.savedAt.toISOString(), status: saved!.status });
}
