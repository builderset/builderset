// The library every builder shares:
//   GET    /documents/{kind}/sections             the editor's saved sections
//   POST   /documents/{kind}/sections             a piece of a document, saved to reuse
//   DELETE /documents/{kind}/sections/:sectionId
//   POST   /documents/uploads                     a file, from the editor
import { encodeHex } from 'jsr:@std/encoding@1/hex';
import { error as issue, readFragmentJson, type MediaKind } from 'npm:@builderset/engine@0.4.0';
import { imageSize } from 'npm:image-size@2.0.4';

import { softDelete } from '../_shared/audit.ts';
import { HttpError, json, noContent, type Json } from '../_shared/http.ts';
import { admin, rowsOf, write } from '../_shared/supabase.ts';
import type { Call } from './call.ts';

// ── Saved sections ──────────────────────────────────────────────────────────

export async function listSections({ kind }: Call) {
  const rows = rowsOf<{ uuid: string; name: string; fragment: Json }[]>(
    await admin
      .from('saved_section')
      .select('uuid, name, fragment')
      .eq('kit', kind.kit)
      .is('deleted_at', null)
      .order('name'),
  );
  return json(rows.map(({ uuid, name, fragment }) => ({ id: uuid, name, fragment })));
}

export async function saveSection({ kind, body, member }: Call) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name || name.length > 120)
    throw new HttpError(400, 'A section needs a name of 120 characters at most.');
  // Read the way a paste is: elements this kit does not have, or whose props
  // fail their schema, are dropped.
  const envelope = { schema: 'builder/fragment', version: 1, fragment: body.fragment };
  const fragment = readFragmentJson(JSON.stringify(envelope), kind.registry);
  if (!fragment || fragment.roots.length === 0)
    throw new HttpError(422, 'The section was refused.', { issues: [issue('document.malformed')] });

  const id = await write<string>('create_section', {
    p_kit: kind.kit,
    p_name: name,
    p_fragment: fragment,
    p_actor: member.id,
  });
  return json({ id, name, fragment }, 201);
}

export async function deleteSection({ params, member }: Call) {
  await softDelete('saved_section', params.sectionId, member);
  return noContent();
}

// ── Uploads ─────────────────────────────────────────────────────────────────

const BUCKET = 'media';

/** The bucket's own limit (05_library.sql), checked before the bytes go anywhere. */
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

interface FileType {
  mime: string;
  kind: MediaKind;
  extension: string;
  /** The bytes that start a file of this type, and where. */
  signature: { at: number; bytes: number[] };
}

/** The types the bucket takes, by their first bytes: a name and a browser's type are only claims. */
const FILE_TYPES: FileType[] = [
  {
    mime: 'image/png',
    kind: 'image',
    extension: 'png',
    signature: { at: 0, bytes: [0x89, 0x50, 0x4e, 0x47] },
  },
  {
    mime: 'image/jpeg',
    kind: 'image',
    extension: 'jpg',
    signature: { at: 0, bytes: [0xff, 0xd8, 0xff] },
  },
  {
    mime: 'image/gif',
    kind: 'image',
    extension: 'gif',
    signature: { at: 0, bytes: [0x47, 0x49, 0x46, 0x38] },
  },
  {
    mime: 'image/webp',
    kind: 'image',
    extension: 'webp',
    signature: { at: 8, bytes: [0x57, 0x45, 0x42, 0x50] },
  },
  {
    mime: 'video/mp4',
    kind: 'video',
    extension: 'mp4',
    signature: { at: 4, bytes: [0x66, 0x74, 0x79, 0x70] },
  },
  {
    mime: 'video/webm',
    kind: 'video',
    extension: 'webm',
    signature: { at: 0, bytes: [0x1a, 0x45, 0xdf, 0xa3] },
  },
  {
    mime: 'audio/mpeg',
    kind: 'audio',
    extension: 'mp3',
    signature: { at: 0, bytes: [0x49, 0x44, 0x33] },
  },
  {
    mime: 'application/pdf',
    kind: 'file',
    extension: 'pdf',
    signature: { at: 0, bytes: [0x25, 0x50, 0x44, 0x46] },
  },
];

const typeOf = (bytes: Uint8Array) =>
  FILE_TYPES.find(({ signature: { at, bytes: start } }) =>
    start.every((byte, index) => bytes[at + index] === byte),
  );

/** An image's size, for the editor to keep its space while it loads. */
function dimensionsOf(bytes: Uint8Array, type: FileType) {
  if (type.kind !== 'image') return { width: null, height: null };
  try {
    const { width, height } = imageSize(bytes);
    return { width, height };
  } catch {
    throw new HttpError(415, 'The image could not be read.');
  }
}

interface MediaRow {
  key: string;
  mime: string;
  size: number;
  width: number | null;
  height: number | null;
  name: string;
}

/** What the editor keeps: the key, never the URL, which is built when the file is shown. */
const uploadAnswer = (row: MediaRow) => ({
  ...row,
  url: admin.storage.from(BUCKET).getPublicUrl(row.key).data.publicUrl,
});

export async function upload({ request, member }: Call) {
  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) throw new HttpError(400, 'Send the file as `file`.');
  if (file.size > MAX_UPLOAD_BYTES) throw new HttpError(413, 'The file is larger than 10 MB.');

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = typeOf(bytes);
  // The editor says what it wants the file for; `file` takes any type.
  const wanted = form.get('kind');
  if (!type || (wanted !== 'file' && wanted !== type.kind))
    throw new HttpError(415, 'This kind of file is not accepted here.');

  // The same file twice is one row, and one object in the bucket.
  const sha256 = encodeHex(await crypto.subtle.digest('SHA-256', bytes));
  const same = rowsOf<MediaRow | null>(
    await admin
      .from('media')
      .select('key, mime, size, width, height, name')
      .eq('sha256', sha256)
      .is('deleted_at', null)
      .limit(1)
      .maybeSingle(),
  );
  if (same) return json(uploadAnswer(same), 201);

  const now = new Date();
  const month = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const row: MediaRow = {
    // A new name for every file: a key never changes, so it is never reused.
    key: `${month}/${crypto.randomUUID()}.${type.extension}`,
    mime: type.mime,
    size: file.size,
    ...dimensionsOf(bytes, type),
    name: file.name.slice(0, 300),
  };
  const stored = await admin.storage
    .from(BUCKET)
    .upload(row.key, bytes, { contentType: type.mime, upsert: false });
  if (stored.error) throw stored.error;

  await write<string>('record_media', {
    p_key: row.key,
    p_kind: type.kind,
    p_mime: row.mime,
    p_size: row.size,
    p_width: row.width,
    p_height: row.height,
    p_name: row.name,
    p_sha256: sha256,
    p_actor: member.id,
  });
  return json(uploadAnswer(row), 201);
}
