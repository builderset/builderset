import { createDocument, type BuilderDocument, type DocumentMeta } from './document';
import { createFragment } from './operations';
import type { ElementRegistry } from './registry';
import { rt } from './rich-text';

/**
 * The article body the product stored before the builder: a flat list of five
 * block kinds, plain text only. Converted once by the data migration, and on
 * the fly for any row the migration has not reached.
 *
 * The mapping is exact — every legacy block has a builder element that renders
 * it the same way — so a converted article looks as it did the day before.
 * Legacy headings had no level (they were all section headings under the
 * title), which is an H2 here.
 */

export type LegacyBlock =
  | { kind: 'paragraph'; text: string }
  | { kind: 'heading'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'quote'; text: string }
  | { kind: 'image'; key: string; alt?: string | null; caption?: string | null };

export function fromLegacyBody(
  blocks: readonly LegacyBlock[],
  registry: ElementRegistry,
  meta: Partial<DocumentMeta> = {},
): BuilderDocument {
  const doc = createDocument(meta);
  const order: string[] = [];

  const add = (type: string, props: Record<string, unknown>) => {
    const fragment = createFragment(registry, type, props);
    Object.assign(doc.nodes, fragment.nodes);
    order.push(...fragment.roots);
  };

  for (const block of blocks) {
    switch (block.kind) {
      case 'paragraph':
        add('paragraph', { text: rt(block.text) });
        break;
      case 'heading':
        add('heading', { level: 2, text: rt(block.text) });
        break;
      case 'list':
        add('list', { style: 'bullet', items: block.items.map((item) => ({ text: rt(item) })) });
        break;
      case 'quote':
        add('quote', { text: rt(block.text) });
        break;
      case 'image':
        add('image', {
          media: { key: block.key },
          alt: block.alt ?? '',
          caption: rt(block.caption ?? ''),
        });
        break;
    }
  }
  doc.nodes[doc.root] = { id: doc.root, type: 'root', v: 1, props: {}, children: order };
  return doc;
}
