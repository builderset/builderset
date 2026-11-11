import type { EngineDocument, Fragment, MediaKind } from '../core';

/**
 * Everything the editor needs from the application it runs in.
 *
 * The editor knows nothing about URLs, tokens, buckets or the API: it asks the
 * host. That is the line that keeps the package usable by any back office: a
 * project writes an adapter that turns each method into a call to its own API,
 * or starts from `createRestHost` (an API of the shape in `BACKEND.md`) or
 * `createMemoryHost` (tests, demos).
 */

export interface UploadResult {
  key: string;
  url: string;
  width?: number | undefined;
  height?: number | undefined;
  mime?: string | undefined;
  size?: number | undefined;
  name?: string | undefined;
}

export type SaveReason = 'autosave' | 'manual' | 'publish';

export type SaveResult =
  { ok: true; savedAt: string } | { ok: false; conflict?: boolean | undefined; message: string };

export interface RevisionSummary {
  id: string;
  kind: 'autosave' | 'manual' | 'publish';
  label?: string | null | undefined;
  createdAt: string;
  author?: string | null | undefined;
}

export interface OEmbedInfo {
  provider: string;
  title?: string | null | undefined;
  thumbnail?: string | null | undefined;
}

export interface SavedSection {
  id: string;
  name: string;
  fragment: Fragment;
}

/**
 * Language is not the host's business: the editor's own language and the
 * languages a document is written in are props of the editor (`locale`,
 * `contentLocales`).
 */
export interface BuilderHost<TDoc extends EngineDocument = EngineDocument> {
  upload(
    file: File,
    kind: MediaKind,
    onProgress: (fraction: number) => void,
    signal: AbortSignal,
  ): Promise<UploadResult>;
  /** Storage key → URL, for the canvas. */
  resolveMedia(key: string): string;
  /**
   * Keep the document. `autosave` writes the draft only; `manual` also records
   * a named version the writer can find again; `publish` is handled by
   * `publish` below and never reaches here.
   */
  save(
    document: TDoc,
    reason: SaveReason,
    options?: { force?: boolean | undefined },
  ): Promise<SaveResult>;
  /** The server's current copy — "Load theirs" after a conflict. */
  reload?(): Promise<TDoc>;
  publish?(document: TDoc, scheduledAt?: string | null): Promise<SaveResult>;
  unpublish?(): Promise<SaveResult>;
  loadRevisions?(): Promise<RevisionSummary[]>;
  loadRevision?(id: string): Promise<TDoc>;
  saveRevision?(document: TDoc, label: string): Promise<boolean>;
  /** `locale`: the language being written, when it is not the base one. */
  previewUrl?(document: TDoc, locale?: string): Promise<string>;
  oembed?(url: string): Promise<OEmbedInfo | null>;
  /** Copy a picture from another server into our storage (an imported email's images). */
  importImage?(url: string): Promise<UploadResult>;
  loadSections?(): Promise<SavedSection[]>;
  saveSection?(name: string, fragment: Fragment): Promise<SavedSection | null>;
  toast(kind: 'success' | 'error' | 'info', message: string): void;
}
