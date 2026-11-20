import type { Fragment, MediaKind } from '@builderset/engine';

import type { Audited } from './base';

/** The builders with a library of saved sections. A card or a popup is one free canvas: no sections. */
export const SECTION_KITS = ['email', 'article', 'form'] as const;
export type SectionKit = (typeof SECTION_KITS)[number];

/** A row of saved_section: a piece of a document saved to reuse. */
export interface SavedSection extends Audited {
  /** Which builder's library it belongs to. */
  kit: SectionKit;
  /** What the editor lists it as. */
  name: string;
  /** The editor's { roots, nodes }. */
  fragment: Fragment;
  /** An email section kept in step everywhere it is used. */
  synced: boolean;
}

/** A row of media: every uploaded file, by the key the documents store. */
export interface Media extends Audited {
  /** Where the bytes are. A document holds the key, never a URL. */
  key: string;
  kind: MediaKind;
  /** Known by the file's first bytes, not by its name. */
  mime: string;
  size: number;
  width: number | null;
  height: number | null;
  /** The name it was uploaded with. */
  name: string;
  alt: string;
  /** The same file uploaded twice becomes one row. */
  sha256: string;
}

/** A section as the editor reads it. */
export const sectionAnswer = (row: SavedSection) => ({
  id: row.uuid,
  name: row.name,
  fragment: row.fragment,
});

/** A file as the editor's upload reads it. */
export const mediaAnswer = (row: Media, url: string) => ({
  id: row.uuid,
  key: row.key,
  url,
  kind: row.kind,
  mime: row.mime,
  size: row.size,
  width: row.width,
  height: row.height,
  name: row.name,
  alt: row.alt,
});
