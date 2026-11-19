import { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/db';
import { checkDocument, findEmail, notFound, refused, toJson } from '@/lib/emails';

type Context = { params: Promise<{ id: string }> };

/** POST /api/emails/:id/publish: the strict check, then the document goes live. */
export async function POST(request: Request, { params }: Context) {
  const row = await findEmail((await params).id);
  if (!row) return notFound();
  const body = (await request.json()) as { document: unknown };
  const checked = checkDocument(body.document, 'publish');
  if (!checked.ok) return refused(checked.issues);
  const now = new Date();
  const saved = await prisma.emailTemplate.update({
    where: { id: row.id },
    data: {
      document: toJson(checked.document),
      // SQL NULL; a plain null would be stored as the JSON value null.
      draftDocument: Prisma.DbNull,
      status: 'published',
      savedAt: now,
      publishedAt: now,
    },
  });
  return Response.json({
    saved_at: saved.savedAt.toISOString(),
    status: saved.status,
    published_at: saved.publishedAt?.toISOString() ?? null,
  });
}
