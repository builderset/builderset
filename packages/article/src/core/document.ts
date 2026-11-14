import {
  i18nSchema,
  isSafeUrl,
  mediaRefSchema,
  nodeShapeSchema,
  ROOT_ID,
  type EngineDocument,
} from '@builderset/engine';
import { z } from 'zod';

/**
 * The article document: the engine's node tree with an article's meta — its
 * title, excerpt, cover and what search and sharing show.
 */

/** Stored inside every article row. Renaming it needs a migration and a version bump. */
export const DOCUMENT_SCHEMA = 'builder/document' as const;
/** Bump on every breaking change to the document shape, with a migration. */
export const DOCUMENT_VERSION = 1;

export const seoSchema = z
  .object({
    title: z.string().max(70),
    description: z.string().max(170),
    image: mediaRefSchema.nullable(),
    canonical: z.string().refine(isSafeUrl, { message: 'url.unsafe' }).nullable(),
    noindex: z.boolean(),
    focusKeyword: z.string().max(60),
  })
  .partial();

export type SeoMeta = z.infer<typeof seoSchema>;

export const articleMetaSchema = z.object({
  title: z.string().max(200),
  excerpt: z.string().max(600).optional(),
  cover: z
    .object({ media: mediaRefSchema, alt: z.string().max(300) })
    .nullable()
    .optional(),
  seo: seoSchema.optional(),
  /** Minutes to read, when the writer overrides the computed estimate. */
  readingMinutes: z.number().int().min(1).max(240).nullable().optional(),
});

export type ArticleMeta = z.infer<typeof articleMetaSchema>;

export interface ArticleDocument extends EngineDocument<ArticleMeta> {
  schema: typeof DOCUMENT_SCHEMA;
}

export const articleShapeSchema = z.object({
  schema: z.literal(DOCUMENT_SCHEMA),
  version: z.number().int().min(1),
  root: z.literal(ROOT_ID),
  nodes: z.record(z.string(), nodeShapeSchema),
  meta: articleMetaSchema,
  i18n: i18nSchema.optional(),
});

/** A fresh, empty article. */
export function createArticleDocument(meta: Partial<ArticleMeta> = {}): ArticleDocument {
  return {
    schema: DOCUMENT_SCHEMA,
    version: DOCUMENT_VERSION,
    root: ROOT_ID,
    nodes: { [ROOT_ID]: { id: ROOT_ID, type: 'root', v: 1, props: {}, children: [] } },
    meta: { title: '', ...meta },
  };
}
