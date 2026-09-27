import { createId, type BuilderNode, type ElementRegistry } from '@motors/builder-core';

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
    meta?: Partial<EmailMeta>;
    settings?: Partial<EmailSettings>;
    stable?: boolean;
  },
  sections: SectionSpec[],
): EmailDocument {
  const doc = createEmailDocument(options.meta);
  doc.settings = { ...doc.settings, ...options.settings };
  const id = idMaker(options.stable === true);

  const make = (type: string, props: Record<string, unknown>, children?: string[]): string => {
    const definition = registry.require(type);
    const parsed = definition.schema.safeParse({ ...definition.defaults(), ...props });
    if (!parsed.success) {
      throw new Error(`Invalid props for "${type}": ${parsed.error.message}`);
    }
    const nodeId = id();
    const node: BuilderNode = { id: nodeId, type, v: definition.version, props: parsed.data };
    if (definition.container) node.children = children ?? [];
    doc.nodes[nodeId] = node;
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
