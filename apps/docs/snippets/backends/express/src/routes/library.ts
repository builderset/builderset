import { createHash } from 'node:crypto';

import { error, MEDIA_KINDS } from '@builderset/engine';
import express, { Router } from 'express';

import { createdBy, recordActivity, softDelete } from '../audit';
import { currentUser } from '../auth';
import { checkSection, passed } from '../checks';
import { insertRow, pool, transaction } from '../db';
import { bodyOf, HttpError, oneOf, refused, textOf } from '../http';
import { getRow, sideFilter } from '../models/base';
import {
  mediaAnswer,
  sectionAnswer,
  type Media,
  type SavedSection,
  type SectionKit,
} from '../models/library';
import { dimensionsOf, fileTypeOf, MAX_UPLOAD_BYTES, storeFile, urlOf } from '../storage';

// ── Saved sections: /api/{kind}/sections ─────────────────────────────────────

/** One builder's library. Deleting a section hides it; documents that used it keep their copy. */
export function sectionsRouter(kit: SectionKit): Router {
  const router = Router();

  /** GET / — the editor's loadSections. */
  router.get('/', async (_req, res) => {
    const { rows } = await pool.query<SavedSection>(
      `select * from saved_section t where t.kit = $1 and ${sideFilter('live')} order by t.name`,
      [kit],
    );
    res.json(rows.map(sectionAnswer));
  });

  /** POST / — the editor's saveSection: `{ name, fragment }`. */
  router.post('/', async (req, res) => {
    const actor = currentUser(req);
    const body = bodyOf(req);
    const name = textOf(body.name, 120)?.trim();
    if (!name) throw refused([error('name.missing', { path: 'name' })]);
    const fragment = passed(checkSection(body.fragment, kit));
    const section = await transaction(async (client) => {
      const row = await insertRow<SavedSection>(client, 'saved_section', {
        kit,
        name,
        fragment,
        ...createdBy(actor),
      });
      await recordActivity(client, {
        subject: 'saved_section',
        subjectId: row.id,
        action: 'created',
        actor,
      });
      return row;
    });
    res.status(201).json(sectionAnswer(section));
  });

  /** DELETE /:sid — your library screen. */
  router.delete('/:sid', async (req, res) => {
    const actor = currentUser(req);
    await transaction(async (client) => {
      const row = await getRow<SavedSection>(client, 'saved_section', 'section', req.params.sid, {
        lock: true,
        where: { kit },
      });
      await softDelete(client, 'saved_section', row, actor);
    });
    res.status(204).end();
  });

  return router;
}

// ── Uploads: /api/uploads ────────────────────────────────────────────────────

export const uploads = Router();

/**
 * POST / — the editor's upload: multipart `file` and `kind`. The body is read
 * whole, up to the limit (413 past it), and parsed by Node's own FormData, so
 * no multipart library is needed.
 */
uploads.post(
  '/',
  express.raw({ type: 'multipart/form-data', limit: MAX_UPLOAD_BYTES + 64 * 1024 }),
  async (req, res) => {
    const actor = currentUser(req);
    if (!Buffer.isBuffer(req.body))
      throw new HttpError(415, 'Send the file as multipart form data.');
    const form = await new Response(new Uint8Array(req.body), {
      headers: { 'content-type': req.get('content-type') ?? '' },
    }).formData();
    const file = form.get('file');
    const asked = form.get('kind');
    if (!(file instanceof File) || !oneOf(MEDIA_KINDS, asked))
      throw new HttpError(415, 'Send one file, as `file`, and its `kind`.');

    const bytes = new Uint8Array(await file.arrayBuffer());
    const type = fileTypeOf(bytes);
    // `file` takes any type we know; the others must be what they say.
    if (!type || (asked !== 'file' && type.kind !== asked))
      throw new HttpError(415, `This is not a file of the kind "${asked}" the library takes.`);

    const media = await transaction(async (client) => {
      // The same bytes twice are one file: hand back the one already stored.
      const sha256 = createHash('sha256').update(bytes).digest('hex');
      const { rows } = await client.query<Media>(
        `select * from media t where t.sha256 = $1 and ${sideFilter('live')} limit 1`,
        [sha256],
      );
      if (rows[0]) return rows[0];

      const row = await insertRow<Media>(client, 'media', {
        key: await storeFile(bytes, type.extension),
        kind: type.kind,
        mime: type.mime,
        size: bytes.length,
        ...dimensionsOf(bytes, type.mime),
        name: file.name.slice(0, 300),
        sha256,
        ...createdBy(actor),
      });
      await recordActivity(client, {
        subject: 'media',
        subjectId: row.id,
        action: 'created',
        actor,
      });
      return row;
    });
    res.status(201).json(mediaAnswer(media, urlOf(media.key)));
  },
);
