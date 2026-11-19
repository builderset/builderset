// Uploaded files on the local disk, in uploads/. A real project keeps them in
// S3 or similar, often sent there by the browser with a pre-signed URL. Only
// this file changes: a document holds a file's key, never its URL.
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const ROOT = join(process.cwd(), 'uploads');

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** The images an email can show, known by their first bytes, never by the file's name. */
const IMAGE_TYPES = [
  { mime: 'image/png', extension: 'png', signature: [0x89, 0x50, 0x4e, 0x47] },
  { mime: 'image/jpeg', extension: 'jpg', signature: [0xff, 0xd8, 0xff] },
  { mime: 'image/gif', extension: 'gif', signature: [0x47, 0x49, 0x46, 0x38] },
];

export const imageTypeOf = (bytes: Uint8Array) =>
  IMAGE_TYPES.find((type) => type.signature.every((byte, index) => bytes[index] === byte)) ?? null;

/** Stores the image under a key of ours: a client's file name never becomes a path. */
export async function storeImage(bytes: Uint8Array, extension: string): Promise<string> {
  const key = `emails/${randomUUID()}.${extension}`;
  await mkdir(dirname(join(ROOT, key)), { recursive: true });
  await writeFile(join(ROOT, key), bytes);
  return key;
}

/** The stored file for a key, or null. Only keys of the shape `storeImage` makes are read. */
export async function readImage(key: string) {
  const match = /^emails\/[0-9a-f-]{36}\.(\w+)$/.exec(key);
  const type = IMAGE_TYPES.find((candidate) => candidate.extension === match?.[1]);
  if (!type) return null;
  try {
    return { bytes: await readFile(join(ROOT, key)), mime: type.mime };
  } catch {
    return null;
  }
}
