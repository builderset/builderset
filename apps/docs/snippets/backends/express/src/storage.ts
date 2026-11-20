import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

import type { MediaKind } from '@builderset/engine';

/**
 * Uploaded files on the local disk. A real project keeps them in S3 or
 * similar; only this file changes, because a document holds a file's key,
 * never its URL.
 */
export const UPLOAD_DIR = resolve(process.env.UPLOAD_DIR ?? 'uploads');
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Where the browser gets a key's bytes. */
export const urlOf = (key: string) => `/api/uploads/${key}`;

/** The same, absolute: for an email, which is read far from your site. */
export const absoluteUrlOf = (key: string) =>
  new URL(urlOf(key), process.env.PUBLIC_ORIGIN ?? 'http://localhost:3000').href;

interface FileType {
  mime: string;
  kind: MediaKind;
  extension: string;
  /** The first bytes; null matches any byte. */
  signature: (number | null)[];
}

/** The files the library takes, known by their first bytes, never by their name. */
const FILE_TYPES: FileType[] = [
  { mime: 'image/png', kind: 'image', extension: 'png', signature: [0x89, 0x50, 0x4e, 0x47] },
  { mime: 'image/jpeg', kind: 'image', extension: 'jpg', signature: [0xff, 0xd8, 0xff] },
  { mime: 'image/gif', kind: 'image', extension: 'gif', signature: [0x47, 0x49, 0x46, 0x38] },
  {
    mime: 'image/webp',
    kind: 'image',
    extension: 'webp',
    signature: [0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x45, 0x42, 0x50],
  },
  {
    mime: 'video/mp4',
    kind: 'video',
    extension: 'mp4',
    signature: [null, null, null, null, 0x66, 0x74, 0x79, 0x70],
  },
  { mime: 'video/webm', kind: 'video', extension: 'webm', signature: [0x1a, 0x45, 0xdf, 0xa3] },
  { mime: 'audio/mpeg', kind: 'audio', extension: 'mp3', signature: [0x49, 0x44, 0x33] },
  { mime: 'application/pdf', kind: 'file', extension: 'pdf', signature: [0x25, 0x50, 0x44, 0x46] },
];

export const fileTypeOf = (bytes: Uint8Array) =>
  FILE_TYPES.find((type) =>
    type.signature.every((byte, index) => byte === null || bytes[index] === byte),
  ) ?? null;

/**
 * An image's size, from its header, so the editor can hold its space before it
 * loads. PNG and GIF say it in fixed places; for the rest read it with an
 * image library such as sharp.
 */
export function dimensionsOf(bytes: Uint8Array, mime: string) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (mime === 'image/png' && bytes.length >= 24)
    return { width: view.getUint32(16), height: view.getUint32(20) };
  if (mime === 'image/gif' && bytes.length >= 10)
    return { width: view.getUint16(6, true), height: view.getUint16(8, true) };
  return { width: null, height: null };
}

/** Stores the bytes under a key of ours: a client's file name never becomes a path. */
export async function storeFile(bytes: Uint8Array, extension: string): Promise<string> {
  const now = new Date();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const key = `${String(now.getUTCFullYear())}/${month}/${randomUUID()}.${extension}`;
  const path = join(UPLOAD_DIR, key);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, bytes);
  return key;
}
