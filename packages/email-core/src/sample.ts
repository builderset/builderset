import {
  createId,
  type BuilderNode,
  type ContentLocale,
  type ElementRegistry,
  type Translation,
} from '@motors/builder-core';

import { ROW_LAYOUTS, type RowLayout } from './blocks/structure';
import {
  createEmailDocument,
  type EmailDocument,
  type EmailMeta,
  type EmailSettings,
} from './document';
import { et, v } from './rich-text';

/**
 * Building emails from a compact outline — for the starter email, the test
 * fixtures and the ready-made template library, which would otherwise be
 * hundreds of lines of node bookkeeping each.
 *
 *   buildEmail(registry, { meta }, [
 *     section({ background: '#fff' }, [
 *       row('50-50', [[block('image')], [block('heading'), block('text')]]),
 *     ]),
 *   ])
 */

export interface BlockSpec {
  type: string;
  props?: Record<string, unknown>;
  children?: BlockSpec[];
}

export interface RowSpec {
  layout: RowLayout;
  props?: Record<string, unknown>;
  columns: (BlockSpec[] | { props: Record<string, unknown>; blocks: BlockSpec[] })[];
}

export interface SectionSpec {
  props?: Record<string, unknown>;
  rows: RowSpec[];
}

export const block = (
  type: string,
  props: Record<string, unknown> = {},
  children?: BlockSpec[],
): BlockSpec => ({ type, props, ...(children ? { children } : {}) });

export const row = (
  layout: RowLayout,
  columns: RowSpec['columns'],
  props: Record<string, unknown> = {},
): RowSpec => ({ layout, columns, props });

export const section = (props: Record<string, unknown>, rows: RowSpec[]): SectionSpec => ({
  props,
  rows,
});

/**
 * Words in every language, for the ready-made designs: `tr('Po', 'Yes', 'Ja')`.
 *
 * A design writes each sentence once, in all three languages, wherever a prop
 * or the subject takes words; `buildEmail` keeps the Albanian in the tree and
 * puts the others in the document's translations — the same place the
 * builder's multi-language switch writes them. A design with any `tr` comes
 * out multi-language.
 */
export interface Tr<T> {
  readonly __tr: { readonly sq: T; readonly en: T; readonly de: T };
}

export const tr = <T>(sq: T, en: T, de: T): Tr<T> => ({ __tr: { sq, en, de } });

export const isTr = (value: unknown): value is Tr<unknown> =>
  value !== null && typeof value === 'object' && '__tr' in value;

/** Words that may or may not be in every language. */
export type Words<T = string> = T | Tr<T>;

/** `f` applied to every language of `value` — `t` over a `tr` of strings, say. */
export function mapWords<T, U>(value: Words<T>, f: (value: T) => U): Words<U> {
  return isTr(value)
    ? tr(f(value.__tr.sq), f(value.__tr.en), f(value.__tr.de))
    : f(value);
}

const OTHER_LOCALES = ['en', 'de'] as const satisfies readonly ContentLocale[];

/**
 * Props with every `tr` replaced by its Albanian, and the other languages'
 * words by path — `text`, `rows.2.label` — for the translations.
 */
function splitWords(
  value: unknown,
  path: string,
  found: [string, Record<'en' | 'de', unknown>][],
): unknown {
  if (isTr(value)) {
    found.push([path, { en: value.__tr.en, de: value.__tr.de }]);
    return value.__tr.sq;
  }
  if (Array.isArray(value)) {
    return value.map((item, index) =>
      splitWords(item, path ? `${path}.${String(index)}` : String(index), found),
    );
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        splitWords(item, path ? `${path}.${key}` : key, found),
      ]),
    );
  }
  return value;
}

/** Sequential ids when `stable` (fixtures, snapshots); random otherwise. */
function idMaker(stable: boolean): () => string {
  let next = 0;
  return () => {
    if (!stable) return createId();
    next += 1;
    return `n${String(next)}`;
  };
}

export function buildEmail(
  registry: ElementRegistry,
  options: {
    meta?: { [K in keyof EmailMeta]?: Words<EmailMeta[K]> };
    settings?: Partial<EmailSettings>;
    stable?: boolean;
  },
  sections: SectionSpec[],
): EmailDocument {
  const translations: Record<'en' | 'de', Translation> = { en: {}, de: {} };
  const translate = (nodeId: string | null, found: [string, Record<'en' | 'de', unknown>][]) => {
    for (const [path, words] of found) {
      for (const locale of OTHER_LOCALES) {
        const target = translations[locale];
        const fields = nodeId ? ((target.nodes ??= {})[nodeId] ??= {}) : (target.meta ??= {});
        fields[path] = words[locale];
      }
    }
  };

  const metaWords: [string, Record<'en' | 'de', unknown>][] = [];
  const meta = splitWords(options.meta ?? {}, '', metaWords) as Partial<EmailMeta>;
  translate(null, metaWords);
  const doc = createEmailDocument(meta);
  doc.settings = { ...doc.settings, ...options.settings };
  const id = idMaker(options.stable === true);

  const make = (type: string, raw: Record<string, unknown>, children?: string[]): string => {
    const definition = registry.require(type);
    const words: [string, Record<'en' | 'de', unknown>][] = [];
    const props = splitWords(raw, '', words) as Record<string, unknown>;
    const parsed = definition.schema.safeParse({ ...definition.defaults(), ...props });
    if (!parsed.success) {
      throw new Error(`Invalid props for "${type}": ${parsed.error.message}`);
    }
    const nodeId = id();
    const node: BuilderNode = { id: nodeId, type, v: definition.version, props: parsed.data };
    if (definition.container) node.children = children ?? [];
    doc.nodes[nodeId] = node;
    translate(nodeId, words);
    return nodeId;
  };

  const makeBlock = (spec: BlockSpec): string =>
    make(spec.type, spec.props ?? {}, spec.children?.map(makeBlock));

  const root = doc.nodes[doc.root];
  if (!root) throw new Error('No root');
  root.children = sections.map((sectionSpec) =>
    make(
      'section',
      sectionSpec.props ?? {},
      sectionSpec.rows.map((rowSpec) => {
        const widths = ROW_LAYOUTS[rowSpec.layout];
        if (widths.length !== rowSpec.columns.length) {
          throw new Error(`Row "${rowSpec.layout}" needs ${String(widths.length)} columns.`);
        }
        return make(
          'row',
          { ...rowSpec.props, layout: rowSpec.layout },
          rowSpec.columns.map((column) =>
            Array.isArray(column)
              ? make('column', {}, column.map(makeBlock))
              : make('column', column.props, column.blocks.map(makeBlock)),
          ),
        );
      }),
    ),
  );
  if (translations.en.nodes ?? translations.en.meta) {
    doc.i18n = { enabled: true, base: 'sq', translations };
  }
  return doc;
}

/** A sensible first email: logo, headline, text, button, footer. */
export function starterEmail(
  registry: ElementRegistry,
  meta: Partial<EmailMeta> = {},
  stable = false,
): EmailDocument {
  return buildEmail(registry, { meta, stable }, [
    section({}, [row('100', [[block('logo')]])]),
    section({}, [
      row('100', [
        [
          block('heading', {
            text: [{ text: 'Hello ' }, v('recipient.name', 'there'), { text: ',' }],
          }),
          block('text'),
          block('button'),
        ],
      ]),
    ]),
    section({}, [row('100', [[block('divider'), block('footer')]])]),
  ]);
}

/** Every standard block once — the fixture the renderer and the server check. */
export function kitchenSinkEmail(registry: ElementRegistry): EmailDocument {
  const image = { key: 'email-image/2026/01/sample0000000000.jpg', width: 1200, height: 600 };
  return buildEmail(
    registry,
    {
      meta: {
        name: 'Kitchen sink',
        subject: 'Everything, {{ recipient.name }}',
        preheader: 'Every block once',
      },
      stable: true,
    },
    [
      section({ backdrop: '#eef2ff' }, [row('100', [[block('logo'), block('menu')]])]),
      section({}, [
        row('100', [
          [
            block('heading', { text: [{ text: 'Hi ' }, v('recipient.name', 'there')] }),
            block('text', { text: et('Some body text with a link.') }),
            block('list'),
            block('button'),
            block('image', { media: image, alt: 'A car' }),
            block('divider'),
            block('spacer'),
            block('quote'),
          ],
        ]),
        row('50-50', [
          [block('product', { image, alt: 'A product' })],
          [block('coupon'), block('video', { thumbnail: image })],
        ]),
        row('33-67', [
          [block('key-value')],
          [
            block('line-items', { list: 'order.items' }),
            block('conditional', {}, [block('text')]),
            block('repeat', { list: 'order.items' }, [block('text')]),
          ],
        ]),
        row('100', [[block('survey')]]),
      ]),
      section({}, [row('100', [[block('social'), block('footer')]])]),
    ],
  );
}
