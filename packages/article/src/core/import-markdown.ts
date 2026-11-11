import {
  type Fragment,
  type ElementRegistry,
  normalizeRichText,
  type Mark,
  type RichText,
  isSafeUrl,
} from '@motors/engine';
import { ARTICLE_LIMITS } from './limits';
import { fragmentFromBlocks, type ImportedBlock } from './import-html';

/**
 * Pasted Markdown → nodes, for the writer who drafts in a notes app.
 *
 * A pragmatic subset, not CommonMark: ATX headings, paragraphs, bullet /
 * numbered / task lists with one level of nesting, block quotes, fenced code,
 * rules, pipe tables and standalone images; inline bold, italic, strike,
 * highlight, code and links. That covers what people actually paste; anything
 * else arrives as the paragraph text it would have been.
 */

interface InlineRule {
  pattern: RegExp;
  /** The text inside the delimiters. */
  inner: (match: RegExpExecArray) => string;
  mark: (match: RegExpExecArray) => Mark | null;
}

const INLINE: InlineRule[] = [
  { pattern: /`([^`]+)`/, inner: (m) => m[1] ?? '', mark: () => ({ type: 'code' }) },
  {
    pattern: /\[([^\]]+)\]\(([^)\s]+)\)/,
    inner: (m) => m[1] ?? '',
    mark: (m) => {
      const href = m[2] ?? '';
      return isSafeUrl(href) ? { type: 'link', href } : null;
    },
  },
  {
    pattern: /\*\*([^*]+)\*\*|__([^_]+)__/,
    inner: (m) => m[1] ?? m[2] ?? '',
    mark: () => ({ type: 'bold' }),
  },
  { pattern: /~~([^~]+)~~/, inner: (m) => m[1] ?? '', mark: () => ({ type: 'strike' }) },
  { pattern: /==([^=]+)==/, inner: (m) => m[1] ?? '', mark: () => ({ type: 'highlight' }) },
  {
    pattern: /\*([^*]+)\*|_([^_]+)_/,
    inner: (m) => m[1] ?? m[2] ?? '',
    mark: () => ({ type: 'italic' }),
  },
];

/** Inline Markdown → rich text. The earliest match wins; marks nest. */
export function inlineMarkdown(text: string, inherited: Mark[] = []): RichText {
  let best: { index: number; length: number; inner: string; mark: Mark | null } | null = null;
  for (const rule of INLINE) {
    const match = rule.pattern.exec(text);
    if (!match || (best && match.index >= best.index)) continue;
    best = {
      index: match.index,
      length: match[0].length,
      inner: rule.inner(match),
      mark: rule.mark(match),
    };
  }
  if (!best) return text ? [inherited.length ? { text, marks: inherited } : { text }] : [];
  const before = text.slice(0, best.index);
  const after = text.slice(best.index + best.length);
  const marks = best.mark ? [...inherited, best.mark] : inherited;
  const inner =
    best.mark?.type === 'code' ? [{ text: best.inner, marks }] : inlineMarkdown(best.inner, marks);
  return normalizeRichText([
    ...(before ? inlineMarkdown(before, inherited) : []),
    ...inner,
    ...inlineMarkdown(after, inherited),
  ]);
}

const LIST_ITEM = /^(\s*)([-*+]|\d+[.)])\s+(\[( |x|X)\]\s+)?(.*)$/;
const TABLE_ROW = /^\s*\|.*\|\s*$/;

const KNOWN_LANGUAGES = new Set([
  'plain',
  'bash',
  'css',
  'html',
  'javascript',
  'json',
  'jsx',
  'markdown',
  'python',
  'sql',
  'tsx',
  'typescript',
  'yaml',
]);

const ALIASES: Record<string, string> = {
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  js: 'javascript',
  ts: 'typescript',
  md: 'markdown',
  py: 'python',
  yml: 'yaml',
  text: 'plain',
  txt: 'plain',
};

function codeLanguage(tag: string): string {
  const language = tag.toLowerCase();
  if (KNOWN_LANGUAGES.has(language)) return language;
  return ALIASES[language] ?? 'plain';
}

function tableCells(row: string): string[] {
  return row.trim().replace(/^\|/, '').replace(/\|$/, '').split('|');
}

interface ListEntry {
  text: RichText;
  checked?: boolean;
  children?: { text: RichText; checked?: boolean }[];
}

export function importMarkdown(markdown: string, registry: ElementRegistry): Fragment {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const line = (index: number): string => lines[index] ?? '';
  const blocks: ImportedBlock[] = [];
  let paragraph: string[] = [];

  const flush = () => {
    const text = paragraph.join(' ').trim();
    if (text) blocks.push({ type: 'paragraph', props: { text: inlineMarkdown(text) } });
    paragraph = [];
  };

  let i = 0;
  while (i < lines.length) {
    const current = line(i);

    const fence = /^```\s*([\w+-]*)\s*$/.exec(current);
    if (fence) {
      flush();
      const code: string[] = [];
      i += 1;
      while (i < lines.length && !/^```\s*$/.test(line(i))) {
        code.push(line(i));
        i += 1;
      }
      blocks.push({
        type: 'code',
        props: {
          code: code.join('\n').slice(0, ARTICLE_LIMITS.longText),
          language: codeLanguage(fence[1] ?? ''),
        },
      });
      i += 1;
      continue;
    }

    if (current.trim() === '') {
      flush();
      i += 1;
      continue;
    }

    const heading = /^(#{1,6})\s+(.*?)\s*#*$/.exec(current);
    if (heading) {
      flush();
      const depth = (heading[1] ?? '').length;
      blocks.push({
        type: 'heading',
        props: {
          level: depth <= 2 ? 2 : depth === 3 ? 3 : 4,
          text: inlineMarkdown(heading[2] ?? ''),
        },
      });
      i += 1;
      continue;
    }

    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(current)) {
      flush();
      blocks.push({ type: 'divider', props: {} });
      i += 1;
      continue;
    }

    const image = /^!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)\s*$/.exec(current.trim());
    if (image) {
      flush();
      blocks.push({
        type: 'image',
        props: { pendingUrl: image[2] ?? '', alt: (image[1] ?? '').slice(0, 300) },
      });
      i += 1;
      continue;
    }

    if (/^\s*>/.test(current)) {
      flush();
      const quote: string[] = [];
      while (i < lines.length && /^\s*>/.test(line(i))) {
        quote.push(line(i).replace(/^\s*>\s?/, ''));
        i += 1;
      }
      blocks.push({ type: 'quote', props: { text: inlineMarkdown(quote.join(' ').trim()) } });
      continue;
    }

    if (TABLE_ROW.test(current) && /^\s*\|?\s*:?-{3,}/.test(line(i + 1))) {
      flush();
      const header = tableCells(current);
      const width = Math.min(ARTICLE_LIMITS.tableColumns, header.length);
      const align = tableCells(line(i + 1)).map((spec) => {
        const s = spec.trim();
        if (s.startsWith(':') && s.endsWith(':')) return 'center';
        return s.endsWith(':') ? 'end' : 'start';
      });
      const rows = [header];
      i += 2;
      while (i < lines.length && TABLE_ROW.test(line(i))) {
        rows.push(tableCells(line(i)));
        i += 1;
      }
      blocks.push({
        type: 'table',
        props: {
          rows: rows
            .slice(0, ARTICLE_LIMITS.tableRows)
            .map((row) =>
              Array.from({ length: width }, (_, c) => inlineMarkdown((row[c] ?? '').trim())),
            ),
          headerRow: true,
          align: Array.from({ length: width }, (_, c) => align[c] ?? 'start'),
        },
      });
      continue;
    }

    const opening = LIST_ITEM.exec(current);
    if (opening) {
      flush();
      const numbered = /\d/.test(opening[2] ?? '');
      const checklist = Boolean(opening[3]);
      const items: ListEntry[] = [];
      let match = LIST_ITEM.exec(line(i));
      while (i < lines.length && match) {
        const entry = {
          text: inlineMarkdown((match[5] ?? '').trim()),
          ...(match[3] ? { checked: (match[4] ?? '').toLowerCase() === 'x' } : {}),
        };
        const parent = items[items.length - 1];
        if ((match[1] ?? '').length >= 2 && parent) (parent.children ??= []).push(entry);
        else items.push(entry);
        i += 1;
        match = LIST_ITEM.exec(line(i));
      }
      blocks.push({
        type: 'list',
        props: {
          style: checklist ? 'check' : numbered ? 'number' : 'bullet',
          items: items.slice(0, ARTICLE_LIMITS.listItems),
        },
      });
      continue;
    }

    paragraph.push(current.trim());
    i += 1;
  }
  flush();
  return fragmentFromBlocks(blocks, registry);
}

/** Whether a pasted string is worth reading as Markdown rather than as text. */
export function looksLikeMarkdown(text: string): boolean {
  return (
    /^(#{1,6}\s|[-*+]\s|\d+[.)]\s|>\s|```|\|.*\|)/m.test(text) ||
    /\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)/.test(text)
  );
}
