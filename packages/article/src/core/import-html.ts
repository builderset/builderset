import type { BuilderNode, Fragment } from './document';
import type { NodeId } from './ids';
import { LIMITS } from './limits';
import { createFragment } from './operations';
import type { ElementRegistry } from './registry';
import { normalizeRichText, type Mark, type RichText } from './rich-text';
import { isSafeUrl } from './url';

/**
 * Pasted HTML → nodes. The HTML itself is thrown away.
 *
 * Word, Google Docs and web pages all put HTML on the clipboard, each in its
 * own dialect: Word writes lists as paragraphs with a bullet character and a
 * `MsoListParagraph` class, Google Docs wraps everything in a `<b>` it then
 * un-bolds with `font-weight:normal`, and pages nest text in any number of
 * `<div>`s and `<span>`s. What survives is structure (headings, paragraphs,
 * lists, quotes, code, tables, images, rules) and the inline marks the builder
 * has — bold, italic, underline, strike, code, highlight, sub/sup, links. Every
 * attribute, class, style and script is dropped on the way.
 *
 * Images keep their address in `pendingUrl`: they are someone else's until
 * re-uploaded (see the image element).
 */

interface Block {
  type: string;
  props: Record<string, unknown>;
}

const BLOCK_TAGS = new Set([
  'P',
  'DIV',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'UL',
  'OL',
  'BLOCKQUOTE',
  'PRE',
  'TABLE',
  'FIGURE',
  'IMG',
  'HR',
  'SECTION',
  'ARTICLE',
  'MAIN',
  'HEADER',
  'FOOTER',
  'LI',
]);

function styleMarks(element: HTMLElement): Mark[] {
  const marks: Mark[] = [];
  const style = element.getAttribute('style') ?? '';
  if (/font-weight\s*:\s*(bold|[6-9]00)/i.test(style)) marks.push({ type: 'bold' });
  if (/font-style\s*:\s*italic/i.test(style)) marks.push({ type: 'italic' });
  if (/text-decoration[^;]*underline/i.test(style)) marks.push({ type: 'underline' });
  if (/text-decoration[^;]*line-through/i.test(style)) marks.push({ type: 'strike' });
  if (/vertical-align\s*:\s*super/i.test(style)) marks.push({ type: 'sup' });
  if (/vertical-align\s*:\s*sub/i.test(style)) marks.push({ type: 'sub' });
  return marks;
}

function tagMarks(element: HTMLElement): Mark[] | 'unbold' {
  switch (element.tagName) {
    case 'STRONG':
      return [{ type: 'bold' }];
    case 'B':
      // Google Docs' wrapper: a <b> that says it is not bold.
      return /font-weight\s*:\s*normal/i.test(element.getAttribute('style') ?? '')
        ? 'unbold'
        : [{ type: 'bold' }];
    case 'EM':
    case 'I':
      return [{ type: 'italic' }];
    case 'U':
      return [{ type: 'underline' }];
    case 'S':
    case 'STRIKE':
    case 'DEL':
      return [{ type: 'strike' }];
    case 'CODE':
    case 'KBD':
      return [{ type: 'code' }];
    case 'MARK':
      return [{ type: 'highlight' }];
    case 'SUB':
      return [{ type: 'sub' }];
    case 'SUP':
      return [{ type: 'sup' }];
    case 'A': {
      const href = element.getAttribute('href') ?? '';
      if (!isSafeUrl(href)) return [];
      return [
        {
          type: 'link',
          href,
          ...(element.getAttribute('target') === '_blank' ? { newTab: true } : {}),
        },
      ];
    }
    default:
      return [];
  }
}

/** The inline content of an element as rich text. */
export function inlineOf(element: Node, inherited: Mark[] = []): RichText {
  const runs: RichText = [];
  element.childNodes.forEach((child) => {
    if (child.nodeType === 3) {
      const text = (child.textContent ?? '').replace(/\s+/g, ' ');
      if (text) runs.push(inherited.length ? { text, marks: [...inherited] } : { text });
      return;
    }
    if (!(child instanceof HTMLElement)) return;
    if (child.tagName === 'BR') {
      runs.push({ text: ' ' });
      return;
    }
    if (['SCRIPT', 'STYLE', 'TEMPLATE', 'NOSCRIPT'].includes(child.tagName)) return;
    const own = tagMarks(child);
    const marks =
      own === 'unbold'
        ? inherited.filter((mark) => mark.type !== 'bold')
        : [...inherited, ...own, ...styleMarks(child)];
    runs.push(...inlineOf(child, marks));
  });
  return runs;
}

function trimRichText(value: RichText): RichText {
  const runs = normalizeRichText(value);
  const last = runs.length - 1;
  return normalizeRichText(
    runs.map((run, index) => {
      let text = run.text;
      if (index === 0) text = text.replace(/^\s+/, '');
      if (index === last) text = text.replace(/\s+$/, '');
      return { ...run, text };
    }),
  );
}

function hasBlockChild(element: HTMLElement): boolean {
  return [...element.children].some((child) => BLOCK_TAGS.has(child.tagName));
}

function listItems(
  list: HTMLElement,
): { text: RichText; checked?: boolean; children?: { text: RichText }[] }[] {
  return [...list.children]
    .filter((child): child is HTMLLIElement => child.tagName === 'LI')
    .map((item) => {
      const nested = [...item.children].find(
        (child) => child.tagName === 'UL' || child.tagName === 'OL',
      );
      const clone = item.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('ul, ol').forEach((inner) => {
        inner.remove();
      });
      const checkbox = clone.querySelector('input[type="checkbox"]');
      const text = trimRichText(inlineOf(clone));
      const children = nested
        ? listItems(nested as HTMLElement).map((child) => ({ text: child.text }))
        : undefined;
      return {
        text,
        ...(checkbox ? { checked: (checkbox as HTMLInputElement).checked } : {}),
        ...(children?.length ? { children } : {}),
      };
    })
    .filter((item) => item.text.length > 0 || item.children?.length);
}

function imageBlock(image: HTMLImageElement, caption: RichText = []): Block | null {
  const src = image.getAttribute('src') ?? '';
  if (!/^https?:\/\//i.test(src)) return null;
  return {
    type: 'image',
    props: {
      pendingUrl: src.slice(0, 2000),
      alt: (image.getAttribute('alt') ?? '').slice(0, 300),
      caption,
    },
  };
}

function tableBlock(table: HTMLTableElement): Block | null {
  const rows = [...table.querySelectorAll('tr')]
    .slice(0, LIMITS.tableRows)
    .map((row) =>
      [...row.children].slice(0, LIMITS.tableColumns).map((cell) => trimRichText(inlineOf(cell))),
    );
  if (rows.length === 0) return null;
  const width = Math.max(...rows.map((row) => row.length));
  if (width === 0) return null;
  const padded = rows.map((row) => [
    ...row,
    ...Array.from({ length: width - row.length }, () => [] as RichText),
  ]);
  const headerRow =
    Boolean(table.querySelector('thead')) ||
    Array.from(table.querySelector('tr')?.children ?? []).every((cell) => cell.tagName === 'TH');
  const caption = table.querySelector('caption')?.textContent.trim() ?? '';
  return {
    type: 'table',
    props: {
      rows: padded,
      headerRow,
      align: Array.from({ length: width }, () => 'start'),
      caption: caption.slice(0, 300),
    },
  };
}

/** Word writes each bullet as its own paragraph; this recognises one. */
function isWordListParagraph(element: HTMLElement): boolean {
  return (
    /MsoListParagraph/i.test(element.className) ||
    /mso-list\s*:/i.test(element.getAttribute('style') ?? '')
  );
}

function blocksOf(container: HTMLElement): Block[] {
  const blocks: Block[] = [];
  let wordList: { text: RichText }[] | null = null;
  const flushWordList = () => {
    if (wordList?.length)
      blocks.push({ type: 'list', props: { style: 'bullet', items: wordList } });
    wordList = null;
  };

  container.childNodes.forEach((child) => {
    if (child.nodeType === 3) {
      const text = (child.textContent ?? '').trim();
      if (text) {
        flushWordList();
        blocks.push({ type: 'paragraph', props: { text: [{ text }] } });
      }
      return;
    }
    if (!(child instanceof HTMLElement)) return;
    const tag = child.tagName;

    if (tag === 'P' && isWordListParagraph(child)) {
      const clone = child.cloneNode(true) as HTMLElement;
      // Word's own bullet glyph and the spacing after it.
      clone
        .querySelectorAll('[style*="mso-list:Ignore"], [style*="mso-list: Ignore"]')
        .forEach((node) => {
          node.remove();
        });
      const text = trimRichText(inlineOf(clone));
      if (text.length) (wordList ??= []).push({ text });
      return;
    }
    flushWordList();

    if (/^H[1-6]$/.test(tag)) {
      const level = tag === 'H1' || tag === 'H2' ? 2 : tag === 'H3' ? 3 : 4;
      const text = trimRichText(inlineOf(child));
      if (text.length) blocks.push({ type: 'heading', props: { level, text } });
      return;
    }
    if (tag === 'UL' || tag === 'OL') {
      const items = listItems(child);
      if (items.length) {
        const checklist = items.some((item) => item.checked !== undefined);
        blocks.push({
          type: 'list',
          props: { style: checklist ? 'check' : tag === 'OL' ? 'number' : 'bullet', items },
        });
      }
      return;
    }
    if (tag === 'BLOCKQUOTE') {
      const text = trimRichText(inlineOf(child));
      if (text.length) blocks.push({ type: 'quote', props: { text } });
      return;
    }
    if (tag === 'PRE') {
      const code = child.textContent.replace(/\n$/, '');
      if (code.trim())
        blocks.push({ type: 'code', props: { code: code.slice(0, LIMITS.longText) } });
      return;
    }
    if (tag === 'TABLE') {
      const table = tableBlock(child as HTMLTableElement);
      if (table) blocks.push(table);
      return;
    }
    if (tag === 'HR') {
      blocks.push({ type: 'divider', props: {} });
      return;
    }
    if (tag === 'IMG') {
      const image = imageBlock(child as HTMLImageElement);
      if (image) blocks.push(image);
      return;
    }
    if (tag === 'FIGURE') {
      const image = child.querySelector('img');
      const caption = child.querySelector('figcaption');
      const block = image
        ? imageBlock(image, caption ? trimRichText(inlineOf(caption)) : [])
        : null;
      if (block) blocks.push(block);
      return;
    }
    if (['SCRIPT', 'STYLE', 'TEMPLATE', 'NOSCRIPT', 'IFRAME', 'OBJECT', 'EMBED'].includes(tag))
      return;

    // A wrapper: descend when it holds blocks, otherwise it IS a paragraph.
    if (hasBlockChild(child)) {
      blocks.push(...blocksOf(child));
      return;
    }
    const text = trimRichText(inlineOf(child));
    if (text.length) blocks.push({ type: 'paragraph', props: { text } });
  });
  flushWordList();
  return blocks;
}

/** Build a fragment from converted blocks, skipping any the registry lacks. */
export function fragmentFromBlocks(blocks: readonly Block[], registry: ElementRegistry): Fragment {
  const roots: NodeId[] = [];
  const nodes: Record<NodeId, BuilderNode> = {};
  for (const block of blocks) {
    if (Object.keys(nodes).length >= LIMITS.nodes - 1) break;
    if (!registry.has(block.type)) continue;
    try {
      const fragment = createFragment(registry, block.type, block.props);
      roots.push(...fragment.roots);
      Object.assign(nodes, fragment.nodes);
    } catch {
      // A block the element refuses (too long, malformed) is dropped rather
      // than failing the whole paste.
    }
  }
  return { roots, nodes };
}

export function importHTML(html: string, registry: ElementRegistry): Fragment {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  return fragmentFromBlocks(blocksOf(parsed.body), registry);
}

export type { Block as ImportedBlock };
