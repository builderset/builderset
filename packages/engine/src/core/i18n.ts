import { z } from 'zod';

import type { BuilderNode, NodeTree } from './document';
import type { NodeId } from './ids';

/**
 * One document, every language.
 *
 * An article or an email is written ONCE — its blocks, layout, images and
 * links are shared — and, when the writer turns multi-language on, its words
 * are written again for each language. Those words live beside the tree, not
 * in it:
 *
 *   i18n.translations.en.nodes[<node id>]['text']          = [...rich text]
 *   i18n.translations.en.nodes[<node id>]['items.0.label'] = 'Blog'
 *   i18n.translations.en.meta['subject']                   = 'Your offer is ready'
 *
 * The base language (`i18n.base`, the article's or template's own) is the
 * tree itself. `localize(doc, 'en')` lays the English words over it and
 * returns an ordinary document every renderer already knows how to draw;
 * whatever has not been translated reads in the base language rather than
 * disappearing. A path is a leaf's place in the props, dots between keys and
 * list indexes — so a link changed in the base language changes for every
 * language, and only the words differ.
 *
 * The API's Python port (`app/core/content_i18n.py`) applies exactly these
 * rules; the email golden fixtures hold the two together.
 */

export const CONTENT_LOCALES = ['sq', 'en', 'de'] as const;
export type ContentLocale = (typeof CONTENT_LOCALES)[number];

export const isContentLocale = (value: unknown): value is ContentLocale =>
  typeof value === 'string' && (CONTENT_LOCALES as readonly string[]).includes(value);

/** One language's words: per node, per prop path; and the document's own (title, subject…). */
export interface Translation {
  meta?: Record<string, unknown> | undefined;
  nodes?: Record<NodeId, Record<string, unknown>> | undefined;
}

export interface DocumentI18n {
  /** The writer's switch. Off: one language, the translations kept but unused. */
  enabled: boolean;
  /** The language the tree itself is written in. */
  base: ContentLocale;
  translations: Partial<Record<ContentLocale, Translation | undefined>>;
}

const PATH = /^[A-Za-z][\w-]*(\.(\d{1,3}|[A-Za-z][\w-]*)){0,6}$/;

const translationSchema = z.object({
  meta: z.record(z.string().regex(PATH), z.unknown()).optional(),
  nodes: z
    .record(
      z.string().regex(/^[a-z][a-z0-9]{0,39}$/),
      z.record(z.string().regex(PATH), z.unknown()),
    )
    .optional(),
});

export const i18nSchema = z.object({
  enabled: z.boolean(),
  base: z.enum(CONTENT_LOCALES),
  translations: z.object({
    sq: translationSchema.optional(),
    en: translationSchema.optional(),
    de: translationSchema.optional(),
  }),
});

/** Meta fields that are words, per document kind; everything else in meta is shared. */
export const TRANSLATABLE_META = [
  'title',
  'excerpt',
  'seo.title',
  'seo.description',
  'cover.alt',
  'subject',
  'preheader',
] as const;

/** Anything with a tree, meta and possibly translations: an article or an email. */
export interface Localizable extends NodeTree {
  meta: object;
  i18n?: DocumentI18n | undefined;
}

/** The languages a document is written in: the base, then the others when switched on. */
export function documentLocales(doc: Localizable): ContentLocale[] {
  const i18n = doc.i18n;
  if (!i18n?.enabled) return i18n ? [i18n.base] : [];
  return [i18n.base, ...CONTENT_LOCALES.filter((locale) => locale !== i18n.base)];
}

/** Whether `locale` is a translation (not the base) of this multi-language document. */
export function isTranslating(doc: Localizable, locale: string | null | undefined): boolean {
  const i18n = doc.i18n;
  return Boolean(i18n?.enabled && locale && locale !== i18n.base && isContentLocale(locale));
}

/** A translated value counts only when it says something; an empty one falls back. */
export function hasWords(value: unknown): boolean {
  if (typeof value === 'string') return value.trim() !== '';
  if (Array.isArray(value)) {
    return value.some(
      (run) =>
        run !== null &&
        typeof run === 'object' &&
        typeof (run as { text?: unknown }).text === 'string' &&
        (run as { text: string }).text.trim() !== '',
    );
  }
  return false;
}

/** Read a leaf at a dot path; `undefined` when any step is missing. */
export function valueAt(value: unknown, path: string): unknown {
  let current: unknown = value;
  for (const part of path.split('.')) {
    if (Array.isArray(current)) {
      if (!/^\d+$/.test(part)) return undefined;
      current = current[Number(part)];
    } else if (current !== null && typeof current === 'object') {
      if (!Object.prototype.hasOwnProperty.call(current, part)) return undefined;
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return current;
}

/** A copy of `value` with the leaf at `path` replaced — copying only the way down. */
export function withValueAt<T>(value: T, path: string, leaf: unknown): T {
  const [head, ...rest] = path.split('.');
  if (head === undefined) return value;
  const next = (current: unknown) =>
    rest.length ? withValueAt(current, rest.join('.'), leaf) : leaf;
  if (Array.isArray(value)) {
    const items = [...(value as unknown[])];
    items[Number(head)] = next(items[Number(head)]);
    return items as T;
  }
  const record = { ...(value as Record<string, unknown>) };
  record[head] = next(record[head]);
  return record as T;
}

/** Same kind of leaf: text for text, rich text for rich text. */
const sameKind = (current: unknown, value: unknown) =>
  (typeof current === 'string' && typeof value === 'string') ||
  (Array.isArray(current) && Array.isArray(value));

/**
 * The document as it reads in `locale`.
 *
 * The same object back when there is nothing to lay over it — the base
 * language, a document that is not multi-language, a language with no words
 * yet — so a caller can compare identities. Otherwise a copy in which only
 * the translated nodes, and the meta, are new.
 *
 * `keepEmpty` is the editor's: a field the writer has emptied while
 * translating shows empty there (with its placeholder) rather than snapping
 * back to the base language mid-sentence. Everything that is READ — the site,
 * the email — falls back.
 */
export function localize<D extends Localizable>(
  doc: D,
  locale: string | null | undefined,
  options: { keepEmpty?: boolean } = {},
): D {
  const counts = options.keepEmpty
    ? (value: unknown) => typeof value === 'string' || Array.isArray(value)
    : hasWords;
  if (!isTranslating(doc, locale)) return doc;
  const translation = doc.i18n?.translations[locale as ContentLocale];
  if (!translation) return doc;

  let nodes: Record<NodeId, BuilderNode> | null = null;
  for (const [id, fields] of Object.entries(translation.nodes ?? {})) {
    const node = doc.nodes[id];
    if (!node) continue;
    let props = node.props;
    for (const [path, value] of Object.entries(fields)) {
      if (!counts(value)) continue;
      const current = valueAt(props, path);
      if (current === undefined || !sameKind(current, value)) continue;
      props = withValueAt(props, path, value);
    }
    if (props !== node.props) {
      nodes ??= { ...doc.nodes };
      nodes[id] = { ...node, props };
    }
  }

  let meta = doc.meta as Record<string, unknown>;
  for (const [path, value] of Object.entries(translation.meta ?? {})) {
    if (!(TRANSLATABLE_META as readonly string[]).includes(path)) continue;
    if (typeof value !== 'string' || !counts(value)) continue;
    const current = valueAt(meta, path);
    if (current === undefined ? !metaSlotFree(meta, path) : typeof current !== 'string') continue;
    meta = withValueAt(meta, path, value);
  }

  if (!nodes && meta === doc.meta) return doc;
  return { ...doc, nodes: nodes ?? doc.nodes, meta };
}

/**
 * Where a translated meta field may go although the base has none: an excerpt,
 * or an SEO line when the base has no SEO block yet. A cover's alt needs the
 * cover itself, which only the base can have.
 */
function metaSlotFree(meta: Record<string, unknown>, path: string): boolean {
  const [head, tail] = path.split('.');
  if (tail === undefined) return true;
  if (head !== 'seo') return false;
  const seo = meta.seo;
  return seo === undefined || (seo !== null && typeof seo === 'object' && !Array.isArray(seo));
}
