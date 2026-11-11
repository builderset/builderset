import type { BuilderNode, NodeTree } from './document';
import { localize, type ContentLocale, type Localizable } from './i18n';
import { ROOT_ID } from './ids';
import { error, type Issue } from './issues';
import { LIMITS } from './limits';
import type { ElementRegistry } from './registry';

/**
 * The checks every kind of document shares: the shape of the tree, and each
 * translation read as a document of its own. A kit adds its own on top — the
 * article's `checkArticle`, the email's `checkEmail`.
 */

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

export function hasErrors(issues: readonly Issue[]): boolean {
  return issues.some((issue) => issue.severity === 'error');
}
