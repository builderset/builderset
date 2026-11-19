import { eq } from 'drizzle-orm';

import { emailTemplate } from '@/db/schema';
import { db } from '@/lib/db';
import { checkDocument, findEmail, notFound, refused } from '@/lib/emails';

type Context = { params: Promise<{ id: string }> };

/** POST /api/emails/:id/publish: the strict check, then the document goes live. */
export async function POST(request: Request, { params }: Context) {
  const row = await findEmail((await params).id);
  if (!row) return notFound();
  const body = (await request.json()) as { document: unknown };
  const checked = checkDocument(body.document, 'publish');
  if (!checked.ok) return refused(checked.issues);
  const now = new Date();
  const [saved] = await db
    .update(emailTemplate)
    .set({
      document: checked.document,
      draftDocument: null,
      status: 'published',
      savedAt: now,
      publishedAt: now,
    })
    .where(eq(emailTemplate.id, row.id))
    .returning();
  return Response.json({
    saved_at: saved!.savedAt.toISOString(),
    status: saved!.status,
    published_at: saved!.publishedAt?.toISOString() ?? null,
  });
}
