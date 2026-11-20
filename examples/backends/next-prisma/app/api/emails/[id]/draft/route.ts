import { prisma } from '@/lib/db';
import {
  checkDocument,
  conflict,
  findEmail,
  notFound,
  refused,
  sameInstant,
  toJson,
} from '@/lib/emails';

type Context = { params: Promise<{ id: string }> };

/** PUT /api/emails/:id/draft: an autosave or a manual save. Readers still get the live document. */
export async function PUT(request: Request, { params }: Context) {
  const row = await findEmail((await params).id);
  if (!row) return notFound();
  const body = (await request.json()) as {
    document: unknown;
    expected_saved_at?: string | null;
    force?: boolean;
  };
  // The editor sends back the saved_at it last saw. Another one here means
  // someone else saved in between; "keep mine" sends force.
  if (!body.force && body.expected_saved_at && !sameInstant(body.expected_saved_at, row.savedAt))
    return conflict();
  const checked = checkDocument(body.document, 'draft');
  if (!checked.ok) return refused(checked.issues);
  const savedAt = new Date();
  // Written only if the row is still the one checked above, so two saves at
  // the same moment cannot both win.
  const { count } = await prisma.emailTemplate.updateMany({
    where: { id: row.id, savedAt: row.savedAt },
    data: { draftDocument: toJson(checked.document), savedAt },
  });
  return count === 1 ? Response.json({ saved_at: savedAt.toISOString() }) : conflict();
}
