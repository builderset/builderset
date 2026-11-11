import {
  error,
  footnoteRefsOf,
  i18nSchema,
  isSafeUrl,
  nodeShapeSchema,
  ROOT_ID,
  structuralIssues,
  translationIssues,
  warning,
  type BuilderNode,
  type ElementRegistry,
  type Issue,
  type Localizable,
  type NodeTree,
  type RichText,
  unknownLocaleIssues,
} from '@motors/engine';
import { z } from 'zod';

import { DOCUMENT_SCHEMA, articleMetaSchema, type ArticleDocument } from './document';

/**
 * Two questions, answered separately.
 *
 * `articleSchema(registry)` — is this a well-formed document of these
 * elements? A zod schema: every node's props checked against its element, and
 * the tree's shape checked as a whole. It is what the JSON Schema export and
 * the server mirror; failing it means "cannot be stored".
 *
 * `checkArticle(doc, registry)` — what should the writer know? Everything the
 * schema says as `error`s, plus the editorial `warning`s: missing alt text, a
 * heading that skips a level, an empty block. The status bar and the issues
 * panel show this list; publishing is refused while it holds an error.
 */

/** The typed schema of a document built from `registry`'s elements. */
export function articleSchema(registry: ElementRegistry) {
  const variants = registry.all().map((definition) =>
    nodeShapeSchema.extend({
      type: z.literal(definition.type),
      props: definition.schema,
    }),
  );
  const nodeSchema =
    variants.length > 1
      ? z.discriminatedUnion(
          'type',
          variants as unknown as [
            z.ZodObject<{ type: z.ZodLiteral<string> }>,
            ...z.ZodObject<{ type: z.ZodLiteral<string> }>[],
          ],
        )
      : (variants[0] ?? nodeShapeSchema);

  return z
    .object({
      schema: z.literal(DOCUMENT_SCHEMA),
      version: z.number().int().min(1),
      root: z.literal(ROOT_ID),
      nodes: z.record(z.string(), nodeSchema),
      meta: articleMetaSchema,
      i18n: i18nSchema.optional(),
    })
    .superRefine((doc, ctx) => {
      for (const issue of structuralIssues(doc as NodeTree, registry)) {
        ctx.addIssue({ code: 'custom', message: issue.code, path: ['nodes', issue.nodeId ?? ''] });
      }
      for (const issue of translationIssues(doc as Localizable, registry)) {
        ctx.addIssue({ code: 'custom', message: issue.code, path: ['i18n', issue.path ?? ''] });
      }
    });
}

/** Every issue worth showing the writer, errors first. */
/** What a project tells the check: the languages its articles may be written in. */
export interface CheckArticleOptions {
  /** Languages outside this list are `i18n.locale.unknown` errors. Omitted: any language. */
  locales?: readonly string[] | undefined;
}

export function checkArticle(
  doc: ArticleDocument,
  registry: ElementRegistry,
  options: CheckArticleOptions = {},
): Issue[] {
  const issues: Issue[] = [...structuralIssues(doc, registry), ...translationIssues(doc, registry)];
  const nodes = Object.values(doc.nodes);

  // Props against each element's schema, reported per node and field.
  for (const node of nodes) {
    const definition = registry.get(node.type);
    if (!definition) continue;
    const parsed = definition.schema.safeParse(node.props);
    if (!parsed.success) {
      for (const problem of parsed.error.issues) {
        issues.push(
          error(problem.message.startsWith('url.') ? problem.message : 'props.invalid', {
            nodeId: node.id,
            path: problem.path.join('.'),
          }),
        );
      }
      continue;
    }
    for (const href of definition.links?.(parsed.data) ?? []) {
      if (!isSafeUrl(href)) issues.push(error('url.unsafe', { nodeId: node.id, params: { href } }));
    }
    if (!node.hidden) {
      issues.push(...(definition.check?.(parsed.data, { node, document: doc }) ?? []));
    }
  }

  issues.push(...headingIssues(doc), ...footnoteIssues(doc), ...metaIssues(doc));
  if (options.locales) issues.push(...unknownLocaleIssues(doc, options.locales));

  return issues.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'error' ? -1 : 1));
}

/** Headings must not skip a level going down: H2 → H4 hides an H3 that is not there. */
function headingIssues(doc: ArticleDocument): Issue[] {
  const issues: Issue[] = [];
  let previous = 1;
  const order: BuilderNode[] = [];
  const collect = (id: string) => {
    const node = doc.nodes[id];
    if (!node || node.hidden) return;
    order.push(node);
    for (const child of node.children ?? []) collect(child);
  };
  collect(doc.root);
  for (const node of order) {
    if (node.type !== 'heading') continue;
    const level = (node.props as { level: number }).level;
    if (level > previous + 1) {
      issues.push(
        warning('heading.skipped', { nodeId: node.id, params: { from: previous, to: level } }),
      );
    }
    previous = level;
  }
  return issues;
}

/** A footnote reference must point at a footnote in this document. */
function footnoteIssues(doc: ArticleDocument): Issue[] {
  const footnotes = new Set(
    Object.values(doc.nodes)
      .filter((node) => node.type === 'footnote')
      .map((node) => node.id),
  );
  const issues: Issue[] = [];
  for (const node of Object.values(doc.nodes)) {
    const text = (node.props as { text?: RichText }).text;
    if (!Array.isArray(text)) continue;
    for (const ref of footnoteRefsOf(text)) {
      if (!footnotes.has(ref))
        issues.push(error('footnote.missing', { nodeId: node.id, params: { ref } }));
    }
  }
  return issues;
}

/** Document settings: what search and sharing will show. */
function metaIssues(doc: ArticleDocument): Issue[] {
  const issues: Issue[] = [];
  const { meta } = doc;
  if (!meta.title.trim()) issues.push(error('meta.titleMissing', { path: 'meta.title' }));
  if (!meta.excerpt?.trim()) issues.push(warning('meta.excerptMissing', { path: 'meta.excerpt' }));
  if (!meta.cover) issues.push(warning('meta.coverMissing', { path: 'meta.cover' }));
  else if (!meta.cover.alt.trim())
    issues.push(warning('image.altMissing', { path: 'meta.cover.alt' }));
  const seoTitle = meta.seo?.title ?? meta.title;
  if (seoTitle.length > 60)
    issues.push(
      warning('seo.titleLong', { path: 'meta.seo.title', params: { length: seoTitle.length } }),
    );
  const description = meta.seo?.description ?? meta.excerpt ?? '';
  if (description && (description.length < 50 || description.length > 160)) {
    issues.push(
      warning('seo.descriptionLength', {
        path: 'meta.seo.description',
        params: { length: description.length },
      }),
    );
  }
  return issues;
}
