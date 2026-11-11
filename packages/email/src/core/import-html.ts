import {
  createId,
  domParser,
  isSafeUrl,
  type BuilderNode,
  type ElementRegistry,
} from '@motors/engine';

import { ROW_LAYOUTS, type RowLayout } from './blocks/structure';
import { createEmailDocument, type EmailDocument, type EmailMeta } from './document';
import { pad } from './fields';
import { EMAIL_FONTS, type FontKey } from './fonts';
import { EMAIL_LIMITS } from './limits';
import type { EmailRun } from './rich-text';
import { TEMPLATE_TOKEN, VARIABLE_PATH } from './variables';

/**
 * HTML → an email of OUR blocks.
 *
 * For moving an existing email (from Mailchimp, Stripo, a designer's file, the
 * old templates) into the builder. Nothing of the HTML is kept: it is read for
 * its STRUCTURE and CONTENT — bands, columns, headings, paragraphs, buttons,
 * images, lists, links, `{{ variables }}` — and rebuilt as blocks, with the
 * inline styles that map onto block settings (colours, sizes, alignment,
 * weight, font). Scripts, forms, event handlers and anything unsafe cannot
 * survive, because nothing is copied verbatim.
 *
 * Images come back as a list to import: they point at someone else's server,
 * and an email must show pictures from our own storage.
 */

export interface ImportedImage {
  nodeId: string;
  /** The prop that receives the key: `media` on an image, `thumbnail` on a video. */
  field: 'media' | 'thumbnail';
  src: string;
}

export interface HtmlImport {
  document: EmailDocument;
  images: ImportedImage[];
  /** How many blocks were made — "nothing recognised" is 0. */
  blocks: number;
}

// ── reading styles ───────────────────────────────────────────────────────────

const NAMED: Record<string, string> = {
  white: '#ffffff',
  black: '#000000',
  red: '#ff0000',
  blue: '#0000ff',
  green: '#008000',
  gray: '#808080',
  grey: '#808080',
  transparent: '',
};

function hex(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (v in NAMED) {
    const named = NAMED[v];
    return named === undefined || named === '' ? null : named;
  }
  let match = /^#([0-9a-f]{3})$/.exec(v);
  if (match?.[1]) {
    const [r, g, b] = match[1];
    return `#${r ?? '0'}${r ?? '0'}${g ?? '0'}${g ?? '0'}${b ?? '0'}${b ?? '0'}`;
  }
  match = /^#([0-9a-f]{6})$/.exec(v);
  if (match) return v;
  const rgb = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,/\s]+([\d.]+))?\s*\)$/.exec(v);
  if (rgb) {
    if (rgb[4] !== undefined && Number(rgb[4]) === 0) return null;
    return `#${[rgb[1], rgb[2], rgb[3]].map((part) => Number(part).toString(16).padStart(2, '0')).join('')}`;
  }
  return null;
}

function styleOf(element: Element, property: string): string {
  const style = (element as Partial<HTMLElement>).style;
  return style ? style.getPropertyValue(property).trim() : '';
}

function px(value: string, min: number, max: number): number | null {
  const match = /^(-?[\d.]+)px$/.exec(value.trim());
  if (!match) return null;
  return Math.max(min, Math.min(max, Math.round(Number(match[1]))));
}

/** The nearest alignment: `text-align`, then the `align` attribute, up the tree. */
function alignOf(element: Element | null): 'left' | 'center' | 'right' {
  for (let current = element; current; current = current.parentElement) {
    const value = (
      styleOf(current, 'text-align') ||
      (current.getAttribute('align') ?? '')
    ).toLowerCase();
    if (value === 'center' || value === 'right' || value === 'left') return value;
    if (current.tagName === 'CENTER') return 'center';
    if (current.tagName === 'BODY') break;
  }
  return 'left';
}

function backgroundOf(element: Element): string | null {
  return hex(styleOf(element, 'background-color')) ?? hex(element.getAttribute('bgcolor'));
}

/** The nearest background of a band, for splitting the email into sections. */
function bandOf(element: Element | null): string {
  for (let current = element; current; current = current.parentElement) {
    if (current.tagName === 'BODY') return '';
    const background = backgroundOf(current);
    if (background) return background;
  }
  return '';
}

function fontOf(element: Element): FontKey | null {
  const family = styleOf(element, 'font-family')
    .split(',')[0]
    ?.replace(/['"]/g, '')
    .trim()
    .toLowerCase();
  if (!family) return null;
  for (const [key, font] of Object.entries(EMAIL_FONTS)) {
    const label = font.label.split(' / ')[0]?.toLowerCase();
    if (label === family || key === family.replace(/\s+/g, '-')) return key as FontKey;
  }
  return null;
}

function weightOf(element: Element): string | undefined {
  const value = styleOf(element, 'font-weight');
  if (value === 'bold') return '700';
  const number = Number(value);
  return number >= 300 && number <= 900 ? String(Math.round(number / 100) * 100) : undefined;
}

// ── inline content ───────────────────────────────────────────────────────────

type Mark = NonNullable<EmailRun['marks']>[number];

const SKIP = new Set([
  'SCRIPT',
  'STYLE',
  'HEAD',
  'META',
  'TITLE',
  'NOSCRIPT',
  'TEMPLATE',
  'IFRAME',
  'OBJECT',
  'EMBED',
  'FORM',
  'INPUT',
  'BUTTON',
  'SELECT',
  'TEXTAREA',
  'SVG',
  'CANVAS',
  'VIDEO',
  'AUDIO',
  'LINK',
]);

const TOKENS = new RegExp(TEMPLATE_TOKEN.source, 'g');

/** Text into runs, turning `{{ path }}` into variable chips. */
function textRuns(text: string, marks: Mark[]): EmailRun[] {
  const runs: EmailRun[] = [];
  let last = 0;
  for (const match of text.matchAll(TOKENS)) {
    const [whole, path, format] = match;
    if (match.index > last) runs.push(withMarks(text.slice(last, match.index), marks));
    if (path && VARIABLE_PATH.test(path)) {
      runs.push({
        text: `{{${path}}}`,
        marks: [
          ...marks,
          { type: 'variable', path, ...(format ? { format: format as never } : {}) },
        ],
      });
    } else {
      runs.push(withMarks(whole, marks));
    }
    last = match.index + whole.length;
  }
  if (last < text.length) runs.push(withMarks(text.slice(last), marks));
  return runs;
}

function withMarks(text: string, marks: Mark[]): EmailRun {
  return marks.length ? { text, marks: [...marks] } : { text };
}

function inlineRuns(nodes: Iterable<Node>, marks: Mark[] = []): EmailRun[] {
  const runs: EmailRun[] = [];
  for (const node of nodes) {
    if (node.nodeType === 3) {
      const text = (node.textContent ?? '').replace(/\s+/g, ' ');
      if (text) runs.push(...textRuns(text, marks));
      continue;
    }
    if (node.nodeType !== 1) continue;
    const element = node as Element;
    if (SKIP.has(element.tagName)) continue;
    if (element.tagName === 'BR') {
      runs.push({ text: '\n' });
      continue;
    }
    const next = [...marks];
    const tag = element.tagName;
    if (tag === 'B' || tag === 'STRONG' || Number(weightOf(element)) >= 600)
      next.push({ type: 'bold' });
    if (tag === 'I' || tag === 'EM' || styleOf(element, 'font-style') === 'italic')
      next.push({ type: 'italic' });
    if (tag === 'U' || styleOf(element, 'text-decoration').includes('underline')) {
      if (tag !== 'A') next.push({ type: 'underline' });
    }
    if (tag === 'S' || tag === 'STRIKE' || tag === 'DEL') next.push({ type: 'strike' });
    if (tag === 'CODE') next.push({ type: 'code' });
    if (tag === 'SUP') next.push({ type: 'sup' });
    if (tag === 'SUB') next.push({ type: 'sub' });
    if (tag === 'MARK') next.push({ type: 'highlight' });
    // A font on part of the text (`<span style="font-family:…">`), when it
    // is one of ours.
    const family = fontOf(element);
    if (family) next.push({ type: 'font', family });
    if (tag === 'A') {
      const href = (element.getAttribute('href') ?? '').trim();
      if (href && isSafeUrl(href)) {
        next.push({
          type: 'link',
          href,
          ...(element.getAttribute('target') === '_blank' ? { newTab: true } : {}),
        });
      }
    }
    runs.push(...inlineRuns(element.childNodes, dedupe(next)));
  }
  return merge(runs);
}

function dedupe(marks: Mark[]): Mark[] {
  const seen = new Set<string>();
  return marks.filter((mark) => {
    const key =
      mark.type === 'link' ? `link:${mark.href}` : mark.type === 'font' ? 'font' : mark.type;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function merge(runs: EmailRun[]): EmailRun[] {
  const out: EmailRun[] = [];
  for (const run of runs) {
    const previous = out[out.length - 1];
    const variable = run.marks?.some((mark) => mark.type === 'variable');
    const previousVariable = previous?.marks?.some((mark) => mark.type === 'variable');
    if (
      previous &&
      !variable &&
      !previousVariable &&
      JSON.stringify(previous.marks ?? []) === JSON.stringify(run.marks ?? [])
    ) {
      previous.text += run.text;
    } else {
      out.push({ ...run });
    }
  }
  return out;
}

/** Trim the leading and trailing whitespace of a whole run list. */
function trimRuns(runs: EmailRun[]): EmailRun[] {
  const out = runs.map((run) => ({ ...run }));
  while (
    out[0] &&
    !out[0].marks?.some((mark) => mark.type === 'variable') &&
    !out[0].text.replace(/^[\s\n]+/, '')
  )
    out.shift();
  while (
    out.length &&
    !out[out.length - 1]?.marks?.some((mark) => mark.type === 'variable') &&
    !out[out.length - 1]?.text.replace(/[\s\n]+$/, '')
  )
    out.pop();
  const first = out[0];
  if (first && !first.marks?.some((mark) => mark.type === 'variable'))
    first.text = first.text.replace(/^[\s\n]+/, '');
  const last = out[out.length - 1];
  if (last && !last.marks?.some((mark) => mark.type === 'variable'))
    last.text = last.text.replace(/[\s\n]+$/, '');
  return out.filter((run) => run.text !== '');
}

function plainLength(runs: EmailRun[]): number {
  return runs.reduce((sum, run) => sum + run.text.trim().length, 0);
}

// ── blocks ───────────────────────────────────────────────────────────────────

interface BlockItem {
  kind: 'block';
  type: string;
  props: Record<string, unknown>;
  image?: { src: string; field: 'media' | 'thumbnail' } | undefined;
  band: string;
}

interface RowItem {
  kind: 'row';
  columns: BlockItem[][];
  widths: number[];
  band: string;
}

type Item = BlockItem | RowItem;

const BLOCK_TAGS = new Set([
  'ADDRESS',
  'ARTICLE',
  'ASIDE',
  'BLOCKQUOTE',
  'CENTER',
  'DIV',
  'DL',
  'FIGURE',
  'FIGCAPTION',
  'FOOTER',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'HEADER',
  'HR',
  'IMG',
  'LI',
  'MAIN',
  'NAV',
  'OL',
  'P',
  'PRE',
  'SECTION',
  'TABLE',
  'TBODY',
  'TD',
  'TFOOT',
  'TH',
  'THEAD',
  'TR',
  'UL',
]);

function isBlockish(node: Node): boolean {
  if (node.nodeType !== 1) return false;
  const element = node as Element;
  if (BLOCK_TAGS.has(element.tagName)) return true;
  if (element.tagName === 'A' && (looksLikeButton(element) || element.querySelector('img')))
    return true;
  // An inline element holding blocks (a <span> around a table) is a block too.
  return Array.from(element.children).some((child) => BLOCK_TAGS.has(child.tagName));
}

function looksLikeButton(element: Element): boolean {
  if (element.tagName !== 'A') return false;
  const text = element.textContent.trim();
  if (!text || text.length > 60 || element.querySelector('img')) return false;
  const background =
    backgroundOf(element) ?? (element.parentElement ? backgroundOf(element.parentElement) : null);
  const padded =
    /\d/.test(styleOf(element, 'padding')) || /\d/.test(styleOf(element, 'padding-top'));
  const display = styleOf(element, 'display');
  const classed = /\b(btn|button|cta)\b/i.test(element.getAttribute('class') ?? '');
  return (
    classed ||
    (!!background && (padded || display.includes('block'))) ||
    (padded && display.includes('inline-block'))
  );
}

function textBlock(element: Element, runs: EmailRun[], band: string): BlockItem | null {
  const trimmed = trimRuns(runs);
  if (
    plainLength(trimmed) === 0 &&
    !trimmed.some((run) => run.marks?.some((mark) => mark.type === 'variable'))
  )
    return null;
  const size = px(styleOf(element, 'font-size'), 11, 28);
  const lineHeight = Number(styleOf(element, 'line-height'));
  return {
    kind: 'block',
    type: 'text',
    props: {
      text: trimmed,
      align: alignOf(element),
      ...(hex(styleOf(element, 'color')) ? { color: hex(styleOf(element, 'color')) } : {}),
      ...(size ? { size } : {}),
      ...(lineHeight >= 1 && lineHeight <= 2.4 ? { lineHeight } : {}),
      ...(fontOf(element) ? { font: fontOf(element) } : {}),
      ...(weightOf(element) ? { weight: weightOf(element) } : {}),
      padding: pad(8, 0),
    },
    band,
  };
}

function collect(element: Element): Item[] {
  const items: Item[] = [];
  let inline: Node[] = [];
  const flush = () => {
    if (inline.length) {
      const block = textBlock(element, inlineRuns(inline), bandOf(element));
      if (block) items.push(block);
      inline = [];
    }
  };
  for (const child of Array.from(element.childNodes)) {
    if (child.nodeType === 1 && SKIP.has((child as Element).tagName)) continue;
    if (!isBlockish(child)) {
      inline.push(child);
      continue;
    }
    flush();
    items.push(...blockOf(child as Element));
  }
  flush();
  return items;
}

function imageItem(img: Element, href: string | null): BlockItem | null {
  const src = (img.getAttribute('src') ?? '').trim();
  if (!/^https?:\/\//i.test(src)) return null;
  const width = Number(img.getAttribute('width')) || px(styleOf(img, 'width'), 20, 800);
  return {
    kind: 'block',
    type: 'image',
    props: {
      alt: (img.getAttribute('alt') ?? '').slice(0, 300),
      href: href && isSafeUrl(href) ? href : '',
      ...(width && width >= 20 ? { width: Math.min(800, Math.round(width)) } : {}),
      align: alignOf(img),
      padding: pad(8, 0),
    },
    image: { src, field: 'media' },
    band: bandOf(img),
  };
}

function blockOf(element: Element): Item[] {
  const band = bandOf(element);
  switch (element.tagName) {
    case 'H1':
    case 'H2':
    case 'H3':
    case 'H4':
    case 'H5':
    case 'H6': {
      const level = Math.min(3, Number(element.tagName[1]));
      const runs = trimRuns(inlineRuns(element.childNodes));
      if (!plainLength(runs)) return [];
      const size = px(styleOf(element, 'font-size'), 14, 56);
      return [
        {
          kind: 'block',
          type: 'heading',
          props: {
            text: runs,
            level,
            align: alignOf(element),
            size: size ?? (level === 1 ? 28 : level === 2 ? 22 : 18),
            ...(hex(styleOf(element, 'color')) ? { color: hex(styleOf(element, 'color')) } : {}),
            ...(fontOf(element) ? { font: fontOf(element) } : {}),
            ...(weightOf(element) ? { weight: weightOf(element) } : {}),
            padding: pad(8, 0),
          },
          band,
        },
      ];
    }
    case 'P':
    case 'PRE':
    case 'ADDRESS':
    case 'FIGCAPTION': {
      // A paragraph holding only a picture or a button is that, not text.
      const children = Array.from(element.children);
      const only =
        children.length === 1 &&
        !element.textContent.replace(children[0]?.textContent ?? '', '').trim()
          ? children[0]
          : undefined;
      if (
        only &&
        (only.tagName === 'IMG' ||
          (only.tagName === 'A' && (looksLikeButton(only) || only.querySelector('img'))))
      ) {
        return blockOf(only);
      }
      const block = textBlock(element, inlineRuns(element.childNodes), band);
      return block ? [block] : [];
    }
    case 'UL':
    case 'OL': {
      const items = Array.from(element.children)
        .filter((child) => child.tagName === 'LI')
        .map((li) => ({ text: trimRuns(inlineRuns(li.childNodes)) }))
        .filter((item) => plainLength(item.text) > 0)
        .slice(0, 30);
      if (!items.length) return [];
      return [
        {
          kind: 'block',
          type: 'list',
          props: {
            style: element.tagName === 'OL' ? 'number' : 'bullet',
            items,
            align: alignOf(element),
            padding: pad(8, 0),
          },
          band,
        },
      ];
    }
    case 'IMG': {
      const item = imageItem(element, null);
      return item ? [item] : [];
    }
    case 'HR':
      return [
        {
          kind: 'block',
          type: 'divider',
          props: {
            ...((hex(styleOf(element, 'border-top-color')) ??
            hex(styleOf(element, 'background-color')))
              ? {
                  color:
                    hex(styleOf(element, 'border-top-color')) ??
                    hex(styleOf(element, 'background-color')),
                }
              : {}),
            padding: pad(16, 0),
          },
          band,
        },
      ];
    case 'BLOCKQUOTE': {
      const runs = trimRuns(inlineRuns(element.childNodes));
      if (!plainLength(runs)) return [];
      return [
        {
          kind: 'block',
          type: 'quote',
          props: { text: runs, cite: '', padding: pad(12, 0) },
          band,
        },
      ];
    }
    case 'A': {
      const href = (element.getAttribute('href') ?? '').trim();
      const img = element.querySelector('img');
      if (img) {
        const item = imageItem(img, href);
        return item ? [item] : [];
      }
      if (looksLikeButton(element)) {
        const cell = element.parentElement;
        const background = backgroundOf(element) ?? (cell ? backgroundOf(cell) : null);
        const radius =
          px(styleOf(element, 'border-radius'), 0, 40) ??
          (cell ? px(styleOf(cell, 'border-radius'), 0, 40) : null);
        const size = px(styleOf(element, 'font-size'), 12, 24);
        return [
          {
            kind: 'block',
            type: 'button',
            props: {
              label: element.textContent.replace(/\s+/g, ' ').trim().slice(0, 80),
              href: isSafeUrl(href) || href.startsWith('{{') ? href : '',
              align: alignOf(element),
              ...(background ? { background } : {}),
              ...(hex(styleOf(element, 'color'))
                ? { textColor: hex(styleOf(element, 'color')) }
                : {}),
              ...(radius !== null ? { radius } : {}),
              ...(size ? { size } : {}),
              ...(fontOf(element) ? { font: fontOf(element) } : {}),
              padding: pad(12, 0),
            },
            band: bandOf(cell ?? element),
          },
        ];
      }
      const block = textBlock(element.parentElement ?? element, inlineRuns([element]), band);
      return block ? [block] : [];
    }
    case 'TABLE':
      return tableOf(element);
    default:
      return collect(element);
  }
}

/** The direct rows of a table (not those of tables nested inside it). */
function rowsOf(table: Element): Element[] {
  const rows: Element[] = [];
  for (const child of Array.from(table.children)) {
    if (child.tagName === 'TR') rows.push(child);
    else if (['TBODY', 'THEAD', 'TFOOT'].includes(child.tagName)) {
      rows.push(...Array.from(child.children).filter((row) => row.tagName === 'TR'));
    }
  }
  return rows;
}

function hasContent(cell: Element): boolean {
  return !!cell.textContent.trim() || !!cell.querySelector('img');
}

function tableOf(table: Element): Item[] {
  const items: Item[] = [];
  for (const row of rowsOf(table)) {
    const cells = Array.from(row.children).filter(
      (cell) => cell.tagName === 'TD' || cell.tagName === 'TH',
    );
    const filled = cells.filter(hasContent);
    if (filled.length >= 2 && filled.length <= 4) {
      // Side by side in the original: a row of columns here.
      const columns = filled.map((cell) => flatten(collect(cell)));
      const widths = filled.map((cell) => {
        const attr = cell.getAttribute('width') ?? styleOf(cell, 'width');
        const value = Number.parseFloat(attr);
        return Number.isFinite(value) && value > 0 ? value : 1;
      });
      if (columns.every((column) => column.length > 0)) {
        items.push({ kind: 'row', columns, widths, band: bandOf(row) });
        continue;
      }
    }
    for (const cell of cells) items.push(...collect(cell));
  }
  return items;
}

/** Columns hold blocks, not rows: a nested row's columns are read one after another. */
function flatten(items: Item[]): BlockItem[] {
  return items.flatMap((item) => (item.kind === 'block' ? [item] : item.columns.flat()));
}

function layoutFor(widths: number[]): RowLayout {
  const total = widths.reduce((sum, width) => sum + width, 0) || 1;
  const shares = widths.map((width) => (width / total) * 100);
  const candidates = (Object.entries(ROW_LAYOUTS) as [RowLayout, readonly number[]][]).filter(
    ([, layout]) => layout.length === widths.length,
  );
  let best: RowLayout = candidates[0]?.[0] ?? '100';
  let score = Number.POSITIVE_INFINITY;
  for (const [key, layout] of candidates) {
    const distance = layout.reduce(
      (sum, share, index) => sum + Math.abs(share - (shares[index] ?? 0)),
      0,
    );
    if (distance < score) {
      score = distance;
      best = key;
    }
  }
  return best;
}

// ── assembling the document ──────────────────────────────────────────────────

export function importEmailHtml(
  html: string,
  registry: ElementRegistry,
  options: { meta?: Partial<EmailMeta> | undefined; parser?: DOMParser | undefined } = {},
): HtmlImport {
  const parser = domParser(options.parser, 'importEmailHtml');
  const parsed = parser.parseFromString(html, 'text/html');
  const doc = createEmailDocument({
    name: options.meta?.name ?? '',
    subject: options.meta?.subject ?? (parsed.title || ''),
    preheader: options.meta?.preheader ?? '',
  });
  const bodyBackground = backgroundOf(parsed.body);
  if (bodyBackground) doc.settings.backdrop = bodyBackground;

  const items = collect(parsed.body);
  const images: ImportedImage[] = [];
  let blocks = 0;

  const node = (
    type: string,
    props: Record<string, unknown>,
    children?: string[],
  ): string | null => {
    if (Object.keys(doc.nodes).length >= EMAIL_LIMITS.nodes - 4) return null;
    const definition = registry.get(type);
    if (!definition) return null;
    const merged = { ...definition.defaults(), ...props };
    const result = definition.schema.safeParse(merged);
    // Props the element refuses (a colour it cannot read) are dropped, not
    // the block: fall back to the defaults for everything but the content.
    const valid = result.success
      ? result.data
      : definition.schema.safeParse({
          ...definition.defaults(),
          ...Object.fromEntries(
            Object.entries(props).filter(([key]) =>
              ['text', 'items', 'label', 'href', 'alt', 'level', 'style'].includes(key),
            ),
          ),
        }).data;
    if (!valid) return null;
    const id = createId();
    const created: BuilderNode = { id, type, v: definition.version, props: valid };
    if (definition.container) created.children = children ?? [];
    doc.nodes[id] = created;
    return id;
  };

  const makeBlock = (item: BlockItem): string | null => {
    const id = node(item.type, item.props);
    if (id) {
      blocks += 1;
      if (item.image) images.push({ nodeId: id, field: item.image.field, src: item.image.src });
    }
    return id;
  };

  const sections: { band: string; rows: string[] }[] = [];
  const sectionFor = (band: string) => {
    const last = sections[sections.length - 1];
    if (last?.band === band) return last;
    const created = { band, rows: [] as string[] };
    sections.push(created);
    return created;
  };

  let pending: BlockItem[] = [];
  let pendingBand = '';
  const flushPending = () => {
    if (!pending.length) return;
    const ids = pending.map(makeBlock).filter((id): id is string => !!id);
    pending = [];
    if (!ids.length) return;
    const column = node('column', {}, ids);
    const row = column ? node('row', { layout: '100' }, [column]) : null;
    if (row) sectionFor(pendingBand).rows.push(row);
  };

  for (const item of items) {
    if (item.kind === 'block') {
      if (pending.length && item.band !== pendingBand) flushPending();
      pendingBand = item.band;
      pending.push(item);
      continue;
    }
    flushPending();
    const columns = item.columns.map((column) => {
      const ids = column.map(makeBlock).filter((id): id is string => !!id);
      return node('column', {}, ids);
    });
    if (columns.some((column) => !column)) continue;
    const row = node('row', { layout: layoutFor(item.widths) }, columns as string[]);
    if (row) sectionFor(item.band).rows.push(row);
  }
  flushPending();

  const root = doc.nodes[doc.root];
  if (root) {
    root.children = sections
      .filter((entry) => entry.rows.length)
      .map((entry) => node('section', entry.band ? { background: entry.band } : {}, entry.rows))
      .filter((id): id is string => !!id);
  }
  return { document: doc, images, blocks };
}
