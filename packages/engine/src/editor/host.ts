import type { BuilderDocument, Fragment, MediaKind } from '@motors/builder-core';

/**
 * Everything the editor needs from the application it runs in.
 *
 * The editor knows nothing about URLs, tokens, buckets or the API: it asks the
 * host. That is the line that keeps the package usable by any back office — the
 * admin's adapter turns each of these into its own server actions.
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

export interface BuilderHost {
  /** The editor's own UI language. */
  locale: string;
  /** The language the article is written in. */
  contentLocale: string;
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
    document: BuilderDocument,
    reason: SaveReason,
    options?: { force?: boolean | undefined },
  ): Promise<SaveResult>;
  /** The server's current copy — "Load theirs" after a conflict. */
  reload?(): Promise<BuilderDocument>;
  publish?(document: BuilderDocument, scheduledAt?: string | null): Promise<SaveResult>;
  unpublish?(): Promise<SaveResult>;
  loadRevisions?(): Promise<RevisionSummary[]>;
  loadRevision?(id: string): Promise<BuilderDocument>;
  saveRevision?(document: BuilderDocument, label: string): Promise<boolean>;
  /** `locale`: the language being written, when it is not the base one. */
  previewUrl?(document: BuilderDocument, locale?: string): Promise<string>;
  oembed?(url: string): Promise<OEmbedInfo | null>;
  /** Copy a picture from another server into our storage (an imported email's images). */
  importImage?(url: string): Promise<UploadResult>;
  loadSections?(): Promise<SavedSection[]>;
  saveSection?(name: string, fragment: Fragment): Promise<SavedSection | null>;
  toast(kind: 'success' | 'error' | 'info', message: string): void;
}
