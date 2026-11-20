// A backend for the editors, as small as it can be: one JSON file per document
// in .data/. A real project keeps the same fields in its database.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { createEmailRegistry, starterEmail, type EmailDocument } from '@builderset/email';
import {
  createArticleRegistry,
  kitchenSinkDocument,
  type ArticleDocument,
} from '@builderset/article';

// #region stored-email
export interface StoredEmail {
  document: EmailDocument;
  draft_document: EmailDocument | null;
  saved_at: string;
  status: 'draft' | 'published';
  published_at: string | null;
}
// #endregion stored-email

export const emailRegistry = createEmailRegistry();
export const articleRegistry = createArticleRegistry();

const folder = (kind: string) => join(process.cwd(), '.data', kind);
/** Ids are path segments: keep them to letters, digits and dashes. */
const safe = (id: string) => (/^[a-z0-9-]+$/i.test(id) ? id : null);

export async function readEmail(id: string): Promise<StoredEmail | null> {
  if (!safe(id)) return null;
  try {
    return JSON.parse(await readFile(join(folder('emails'), `${id}.json`), 'utf8')) as StoredEmail;
  } catch {
    // Every id starts as the starter design, so the example needs no seeding.
    const document = starterEmail(emailRegistry, { name: id, subject: 'Welcome aboard' });
    const record: StoredEmail = {
      document,
      draft_document: null,
      saved_at: new Date().toISOString(),
      status: 'draft',
      published_at: null,
    };
    await writeEmail(id, record);
    return record;
  }
}

export async function writeEmail(id: string, record: StoredEmail): Promise<void> {
  await mkdir(folder('emails'), { recursive: true });
  await writeFile(join(folder('emails'), `${id}.json`), JSON.stringify(record, null, 2));
}

/** The articles are the package's kitchen sink: the example shows the renderer, not an article store. */
export function readArticle(slug: string): ArticleDocument | null {
  return slug === 'kitchen-sink' ? kitchenSinkDocument(articleRegistry) : null;
}
