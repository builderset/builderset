import type { NodeTree } from './document';
import { valueAt } from './i18n';
import type { ElementRegistry } from './registry';
import { walk } from './tree';

/**
 * What a reader will read: plain text, word count and minutes. Hidden nodes
 * are skipped — a reader never sees them, so they are not part of the length.
 */

export function plainText(doc: NodeTree, registry: ElementRegistry): string {
  const parts: string[] = [];
  walk(doc, (node) => {
    if (node.hidden) return false;
    const text = registry.get(node.type)?.toPlainText?.(node.props);
    if (text?.trim()) parts.push(text.trim());
    return undefined;
  });
  return parts.join('\n\n');
}

export function countWords(text: string): number {
  return text.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
}

/**
 * Minutes to read at `wordsPerMinute`, never less than one — or the writer's
 * own figure, when the document's meta holds one (`meta.readingMinutes`).
 */
export function readingMinutes(
  doc: NodeTree & { meta: object },
  registry: ElementRegistry,
  wordsPerMinute = 220,
): number {
  const override = valueAt(doc.meta, 'readingMinutes');
  if (typeof override === 'number' && override) return override;
  return Math.max(1, Math.round(countWords(plainText(doc, registry)) / wordsPerMinute));
}
