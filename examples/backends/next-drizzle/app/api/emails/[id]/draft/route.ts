import { and, eq } from 'drizzle-orm';

import { emailTemplate } from '@/db/schema';
import { db } from '@/lib/db';
import { checkDocument, conflict, findEmail, notFound, refused, sameInstant } from '@/lib/emails';

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
  // Written only if the row is still the one checked above, so two saves at
  // the same moment cannot both win.
  const [saved] = await db
    .update(emailTemplate)
    .set({ draftDocument: checked.document, savedAt: new Date() })
    .where(and(eq(emailTemplate.id, row.id), eq(emailTemplate.savedAt, row.savedAt)))
    .returning();
  return saved ? Response.json({ saved_at: saved.savedAt.toISOString() }) : conflict();
}
