import type { BuilderDocument } from './document';
import type { NodeId } from './ids';
import type { ElementRegistry } from './registry';
import { richTextToPlain, type RichText } from './rich-text';
import { slugifyAnchor } from './url';
import { walk } from './tree';

/**
 * What a reader will read: plain text, word count, minutes, and the outline.
 * Hidden nodes are skipped — a reader never sees them, so they are not part
 * of the article's length or its table of contents.
 */

export function plainText(doc: BuilderDocument, registry: ElementRegistry): string {
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

/** Minutes to read at `wordsPerMinute`, never less than one. */
export function readingMinutes(
  doc: BuilderDocument,
  registry: ElementRegistry,
  wordsPerMinute = 220,
): number {
  if (doc.meta.readingMinutes) return doc.meta.readingMinutes;
  return Math.max(1, Math.round(countWords(plainText(doc, registry)) / wordsPerMinute));
}

export interface OutlineEntry {
  id: NodeId;
  level: 2 | 3 | 4;
  text: string;
  /** The `#fragment` the TOC links to: the node's anchor, or one made from its text. */
  anchor: string;
}

/**
 * The headings, in order, with a unique anchor each. Two headings with the
 * same words get `-2`, `-3` … so every TOC link lands on its own heading.
 */
export function outline(doc: BuilderDocument): OutlineEntry[] {
  const entries: OutlineEntry[] = [];
  const used = new Set<string>();
  walk(doc, (node) => {
    if (node.hidden) return false;
    if (node.type !== 'heading') return undefined;
    const props = node.props as { level: 2 | 3 | 4; text: RichText };
    const text = richTextToPlain(props.text).trim();
    if (!text) return undefined;
    let anchor = node.anchor ?? slugifyAnchor(text);
    if (used.has(anchor)) {
      let n = 2;
      while (used.has(`${anchor}-${String(n)}`)) n += 1;
      anchor = `${anchor}-${String(n)}`;
    }
    used.add(anchor);
    entries.push({ id: node.id, level: props.level, text, anchor });
    return undefined;
  });
  return entries;
}
