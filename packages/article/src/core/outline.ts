import {
  richTextToPlain,
  slugifyAnchor,
  walk,
  type NodeId,
  type NodeTree,
  type RichText,
} from '@builderset/engine';

/** The headings an article's table of contents lists. Hidden headings are skipped. */

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
export function outline(doc: NodeTree): OutlineEntry[] {
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
