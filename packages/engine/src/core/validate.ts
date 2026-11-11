import { z } from 'zod';

import {
  DOCUMENT_SCHEMA,
  documentMetaSchema,
  nodeShapeSchema,
  type BuilderDocument,
  type BuilderNode,
  type NodeTree,
} from './document';
import { i18nSchema, localize, type ContentLocale, type Localizable } from './i18n';
import { ROOT_ID } from './ids';
import { error, warning, type Issue } from './issues';
import { LIMITS } from './limits';
import type { ElementRegistry } from './registry';
import { footnoteRefsOf, type RichText } from './rich-text';
import { isSafeUrl } from './url';

/**
 * Two questions, answered separately.
 *
 * `documentSchema(registry)` — is this a well-formed document of these
 * elements? A zod schema: every node's props checked against its element, and
 * the tree's shape checked as a whole. It is what the JSON Schema export and
 * the server mirror; failing it means "cannot be stored".
 *
 * `checkDocument(doc, registry)` — what should the writer know? Everything the
 * schema says as `error`s, plus the editorial `warning`s: missing alt text, a
 * heading that skips a level, an empty block. The status bar and the issues
 * panel show this list; publishing is refused while it holds an error.
 */

/** The typed schema of a document built from `registry`'s elements. */
export function documentSchema(registry: ElementRegistry) {
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
      meta: documentMetaSchema,
      i18n: i18nSchema.optional(),
    })
    .superRefine((doc, ctx) => {
      for (const issue of structuralIssues(doc as unknown as BuilderDocument, registry)) {
        ctx.addIssue({ code: 'custom', message: issue.code, path: ['nodes', issue.nodeId ?? ''] });
      }
      for (const issue of translationIssues(doc as unknown as BuilderDocument, registry)) {
        ctx.addIssue({ code: 'custom', message: issue.code, path: ['i18n', issue.path ?? ''] });
      }
    });
}

/**
 * Each language, read as a document of its own, must still be a valid one: a
 * translated heading within its length, a translated label still text. The
 * tree is shared, so only what a translation changed is checked again.
 */
export function translationIssues(doc: Localizable, registry: ElementRegistry): Issue[] {
  const i18n = doc.i18n;
  if (!i18n) return [];
  const issues: Issue[] = [];
  for (const [locale, translation] of Object.entries(i18n.translations)) {
    if (!translation) continue;
    const view = localize({ ...doc, i18n: { ...i18n, enabled: true } }, locale as ContentLocale);
    for (const id of Object.keys(translation.nodes ?? {})) {
      const node = view.nodes[id];
      if (!node || node === doc.nodes[id]) continue;
      const parsed = registry.get(node.type)?.schema.safeParse(node.props);
      if (parsed && !parsed.success) {
        for (const problem of parsed.error.issues) {
          issues.push(
            error('props.invalid', {
              nodeId: id,
              path: `${locale}.${problem.path.join('.')}`,
              params: { locale },
            }),
          );
        }
      }
    }
  }
  return issues;
}

/**
 * The shape of the TREE: one root, every child present, every node reachable
 * exactly once, placement rules kept, within the limits.
 */
export function structuralIssues(doc: NodeTree, registry: ElementRegistry): Issue[] {
  const issues: Issue[] = [];
  const root = doc.nodes[ROOT_ID];
  if (root?.type !== 'root') return [error('document.noRoot')];

  const count = Object.keys(doc.nodes).length;
  if (count > LIMITS.nodes)
    issues.push(error('document.tooManyNodes', { params: { max: LIMITS.nodes } }));

  const seen = new Set<string>();
  const visit = (node: BuilderNode, depth: number) => {
    if (seen.has(node.id)) {
      issues.push(error('document.duplicateReference', { nodeId: node.id }));
      return;
    }
    seen.add(node.id);
    if (node.id !== ROOT_ID && depth > LIMITS.depth) {
      issues.push(error('document.tooDeep', { nodeId: node.id, params: { max: LIMITS.depth } }));
    }
    const definition = registry.get(node.type);
    if (!definition) {
      issues.push(error('element.unknown', { nodeId: node.id, params: { type: node.type } }));
      return;
    }
    if (Boolean(definition.container) !== Array.isArray(node.children)) {
      issues.push(error('element.childrenMismatch', { nodeId: node.id }));
    }
    const children = node.children ?? [];
    const rule = definition.container;
    if (rule?.min !== undefined && children.length < rule.min) {
      issues.push(error('container.minimum', { nodeId: node.id, params: { min: rule.min } }));
    }
    if (rule?.max !== undefined && children.length > rule.max) {
      issues.push(error('container.full', { nodeId: node.id, params: { max: rule.max } }));
    }
    for (const childId of children) {
      const child = doc.nodes[childId];
      if (!child) {
        issues.push(error('document.missingChild', { nodeId: node.id, params: { id: childId } }));
        continue;
      }
      if (!registry.canContain(node.type, child.type)) {
        issues.push(
          error('placement.notAllowed', {
            nodeId: child.id,
            params: { parent: node.type, child: child.type },
          }),
        );
      }
      visit(child, depth + 1);
    }
  };
  visit(root, 0);

  for (const id of Object.keys(doc.nodes)) {
    if (!seen.has(id)) issues.push(error('document.orphan', { nodeId: id }));
  }

  const anchors = new Map<string, string>();
  for (const node of Object.values(doc.nodes)) {
    if (!node.anchor) continue;
    const other = anchors.get(node.anchor);
    if (other)
      issues.push(error('anchor.duplicate', { nodeId: node.id, params: { anchor: node.anchor } }));
    else anchors.set(node.anchor, node.id);
  }

  const bytes = new TextEncoder().encode(JSON.stringify(doc)).length;
  if (bytes > LIMITS.bytes)
    issues.push(error('document.tooLarge', { params: { max: LIMITS.bytes } }));
  return issues;
}

/** Every issue worth showing the writer, errors first. */
export function checkDocument(doc: BuilderDocument, registry: ElementRegistry): Issue[] {
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

  return issues.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'error' ? -1 : 1));
}

/** Headings must not skip a level going down: H2 → H4 hides an H3 that is not there. */
function headingIssues(doc: BuilderDocument): Issue[] {
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
function footnoteIssues(doc: BuilderDocument): Issue[] {
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
function metaIssues(doc: BuilderDocument): Issue[] {
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

export function hasErrors(issues: readonly Issue[]): boolean {
  return issues.some((issue) => issue.severity === 'error');
}
