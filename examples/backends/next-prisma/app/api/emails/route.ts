import { prisma } from '@/lib/db';
import { checkDocument, recordOf, refused, toJson } from '@/lib/emails';

/** POST /api/emails: a new template, as a draft. The back office sends a starter document. */
export async function POST(request: Request) {
  const body = (await request.json()) as { name?: unknown; document?: unknown };
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name || name.length > 120)
    return Response.json({ message: 'The name is 1 to 120 characters.' }, { status: 422 });
  const checked = checkDocument(body.document, 'draft');
  if (!checked.ok) return refused(checked.issues);
  const row = await prisma.emailTemplate.create({
    data: { name, document: toJson(checked.document), savedAt: new Date() },
  });
  return Response.json(recordOf(row), { status: 201 });
}
