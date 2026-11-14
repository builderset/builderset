import {
  error,
  warning,
  type Issue,
  defineElement,
  isRichTextEmpty,
  richTextToPlain,
  type RichText,
} from '@builderset/engine';
import { ARTICLE_LIMITS } from '../limits';
import { z } from 'zod';

import { richText, joinLinks, joinPlain, longText, safeUrl, shortText } from './fields';

/**
 * Text: the elements most of an article is made of.
 *
 * Headings stop at H2: the article's title is the page's H1, and a second one
 * inside the body would give the page two titles — which is also what search
 * engines and screen readers are told. H2–H4 is the outline; the table of
 * contents and the heading-order check both read it.
 */

const emptyText = (nodeId: string, path = 'text'): Issue => warning('text.empty', { nodeId, path });

export const headingElement = defineElement({
  type: 'heading',
  version: 1,
  category: 'text',
  icon: 'heading',
  keywords: ['title', 'h2', 'h3', 'h4', 'subtitle'],
  schema: z.object({
    level: z.union([z.literal(2), z.literal(3), z.literal(4)]),
    text: richText(),
  }),
  defaults: () => ({ level: 2 as const, text: [] as RichText }),
  toPlainText: (props) => richTextToPlain(props.text),
  links: (props) => joinLinks([props.text]),
  check: (props, { node }) => (isRichTextEmpty(props.text) ? [emptyText(node.id)] : []),
});

export const paragraphElement = defineElement({
  type: 'paragraph',
  version: 1,
  category: 'text',
  icon: 'pilcrow',
  keywords: ['text', 'body', 'p'],
  schema: z.object({
    text: richText(),
    /** A large first letter — for the opening paragraph. */
    dropCap: z.boolean(),
    /** The standfirst: a larger, quieter introduction. */
    lead: z.boolean(),
  }),
  defaults: () => ({ text: [] as RichText, dropCap: false, lead: false }),
  toPlainText: (props) => richTextToPlain(props.text),
  links: (props) => joinLinks([props.text]),
  check: (props, { node }) => {
    const issues: Issue[] = [];
    const words = richTextToPlain(props.text).split(/\s+/).filter(Boolean).length;
    if (words > 150) issues.push(warning('paragraph.long', { nodeId: node.id, params: { words } }));
    return issues;
  },
});

const listItemBase = z.object({ text: richText(), checked: z.boolean().optional() });

export const listElement = defineElement({
  type: 'list',
  version: 1,
  category: 'text',
  icon: 'list',
  keywords: ['bullets', 'numbered', 'checklist', 'ul', 'ol', 'todo'],
  schema: z.object({
    style: z.enum(['bullet', 'number', 'check']),
    items: z
      .array(
        listItemBase.extend({
          children: z.array(listItemBase).max(ARTICLE_LIMITS.listItems).optional(),
        }),
      )
      .max(ARTICLE_LIMITS.listItems),
  }),
  defaults: () => ({ style: 'bullet' as const, items: [{ text: [] as RichText }] }),
  toPlainText: (props) =>
    joinPlain(
      props.items.flatMap((item) => [item.text, ...(item.children ?? []).map((c) => c.text)]),
    ),
  links: (props) =>
    joinLinks(
      props.items.flatMap((item) => [item.text, ...(item.children ?? []).map((c) => c.text)]),
    ),
  check: (props, { node }) =>
    props.items.every((item) => isRichTextEmpty(item.text)) ? [emptyText(node.id, 'items')] : [],
});

export const quoteElement = defineElement({
  type: 'quote',
  version: 1,
  category: 'text',
  icon: 'quote',
  keywords: ['blockquote', 'citation'],
  schema: z.object({ text: richText(), cite: shortText(), source: safeUrl().or(z.literal('')) }),
  defaults: () => ({ text: [] as RichText, cite: '', source: '' }),
  toPlainText: (props) => joinPlain([props.text, props.cite]),
  links: (props) => [...joinLinks([props.text]), ...(props.source ? [props.source] : [])],
  check: (props, { node }) => (isRichTextEmpty(props.text) ? [emptyText(node.id)] : []),
});

export const pullQuoteElement = defineElement({
  type: 'pull-quote',
  version: 1,
  category: 'text',
  icon: 'message-square-quote',
  keywords: ['highlight', 'large quote', 'callout'],
  schema: z.object({ text: shortText(), cite: shortText(), align: z.enum(['start', 'center']) }),
  defaults: () => ({ text: '', cite: '', align: 'center' as const }),
  toPlainText: (props) => joinPlain([props.text, props.cite]),
  check: (props, { node }) => (props.text.trim() ? [] : [emptyText(node.id)]),
});

export const CALLOUT_TONES = ['info', 'tip', 'success', 'warning', 'danger'] as const;

export const calloutElement = defineElement({
  type: 'callout',
  version: 1,
  category: 'text',
  icon: 'info',
  keywords: ['note', 'alert', 'tip', 'warning', 'box', 'admonition'],
  schema: z.object({
    tone: z.enum(CALLOUT_TONES),
    title: shortText(),
    text: richText(),
    showIcon: z.boolean(),
  }),
  defaults: () => ({ tone: 'info' as const, title: '', text: [] as RichText, showIcon: true }),
  toPlainText: (props) => joinPlain([props.title, props.text]),
  links: (props) => joinLinks([props.text]),
  check: (props, { node }) =>
    isRichTextEmpty(props.text) && !props.title.trim() ? [emptyText(node.id)] : [],
});

export const CODE_LANGUAGES = [
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
] as const;

/** "1,3-5" → true for a valid highlight spec. */
function isLineSpec(value: string): boolean {
  return value === '' || /^\d+(-\d+)?(,\s*\d+(-\d+)?)*$/.test(value);
}

export const codeElement = defineElement({
  type: 'code',
  version: 1,
  category: 'text',
  icon: 'code',
  keywords: ['snippet', 'pre', 'source', 'terminal'],
  schema: z.object({
    code: longText(),
    language: z.enum(CODE_LANGUAGES),
    filename: shortText(),
    lineNumbers: z.boolean(),
    /** Lines to emphasise, as "1,3-5". */
    highlight: z.string().max(100).refine(isLineSpec, { message: 'code.highlightInvalid' }),
  }),
  defaults: () => ({
    code: '',
    language: 'plain' as const,
    filename: '',
    lineNumbers: false,
    highlight: '',
  }),
  toPlainText: (props) => props.code,
  check: (props, { node }) => (props.code.trim() ? [] : [emptyText(node.id, 'code')]),
});

const alignSchema = z.enum(['start', 'center', 'end']);

export const tableElement = defineElement({
  type: 'table',
  version: 1,
  category: 'text',
  icon: 'table',
  keywords: ['grid', 'data', 'rows', 'columns', 'spreadsheet'],
  schema: z
    .object({
      rows: z
        .array(z.array(richText()).min(1).max(ARTICLE_LIMITS.tableColumns))
        .min(1)
        .max(ARTICLE_LIMITS.tableRows),
      headerRow: z.boolean(),
      headerColumn: z.boolean(),
      striped: z.boolean(),
      align: z.array(alignSchema).max(ARTICLE_LIMITS.tableColumns),
      caption: shortText(),
    })
    .refine((table) => table.rows.every((row) => row.length === table.rows[0]?.length), {
      message: 'table.ragged',
    }),
  defaults: () => ({
    rows: [
      [[], [], []],
      [[], [], []],
      [[], [], []],
    ] as RichText[][],
    headerRow: true,
    headerColumn: false,
    striped: true,
    align: ['start', 'start', 'start'] as ('start' | 'center' | 'end')[],
    caption: '',
  }),
  toPlainText: (props) => joinPlain([...props.rows.flat(), props.caption]),
  links: (props) => joinLinks(props.rows.flat()),
  check: (props, { node }) => {
    const issues: Issue[] = [];
    if (props.rows.flat().every((cell) => isRichTextEmpty(cell)))
      issues.push(emptyText(node.id, 'rows'));
    if (props.align.length !== (props.rows[0]?.length ?? 0)) {
      issues.push(error('table.alignMismatch', { nodeId: node.id, path: 'align' }));
    }
    return issues;
  },
});

export const footnoteElement = defineElement({
  type: 'footnote',
  version: 1,
  category: 'text',
  icon: 'superscript',
  keywords: ['reference', 'note', 'source', 'citation'],
  schema: z.object({ text: richText() }),
  defaults: () => ({ text: [] as RichText }),
  toPlainText: (props) => richTextToPlain(props.text),
  links: (props) => joinLinks([props.text]),
  check: (props, { node }) => (isRichTextEmpty(props.text) ? [emptyText(node.id)] : []),
});

export const takeawaysElement = defineElement({
  type: 'takeaways',
  version: 1,
  category: 'text',
  icon: 'list-checks',
  keywords: ['summary', 'key points', 'tldr', 'highlights'],
  schema: z.object({
    title: shortText(),
    items: z.array(richText()).max(ARTICLE_LIMITS.listItems),
  }),
  defaults: () => ({ title: '', items: [[], [], []] as RichText[] }),
  toPlainText: (props) => joinPlain([props.title, ...props.items]),
  links: (props) => joinLinks(props.items),
  check: (props, { node }) =>
    props.items.every((item) => isRichTextEmpty(item)) ? [emptyText(node.id, 'items')] : [],
});

export const definitionListElement = defineElement({
  type: 'definitions',
  version: 1,
  category: 'text',
  icon: 'book-open',
  keywords: ['glossary', 'terms', 'dl', 'dictionary'],
  schema: z.object({
    items: z
      .array(z.object({ term: shortText(), description: richText() }))
      .max(ARTICLE_LIMITS.listItems),
  }),
  defaults: () => ({ items: [{ term: '', description: [] as RichText }] }),
  toPlainText: (props) => joinPlain(props.items.flatMap((item) => [item.term, item.description])),
  links: (props) => joinLinks(props.items.map((item) => item.description)),
  check: (props, { node }) =>
    props.items.every((item) => !item.term.trim()) ? [emptyText(node.id, 'items')] : [],
});

export const textElements = [
  headingElement,
  paragraphElement,
  listElement,
  quoteElement,
  pullQuoteElement,
  calloutElement,
  codeElement,
  tableElement,
  footnoteElement,
  takeawaysElement,
  definitionListElement,
] as const;
