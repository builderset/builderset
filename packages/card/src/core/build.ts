import {
  createId,
  type BuilderNode,
  type ElementRegistry,
  type MediaRef,
} from '@builderset/engine';

import {
  createCardDocument,
  type CardDocument,
  type CardFormatProps,
  type CardMeta,
} from './document';
import type { CardFrame } from './elements';
import type { CardFormat } from './formats';

/**
 * Building cards from a short outline — for templates, tests and a project's
 * own designs, which would otherwise be pages of node bookkeeping:
 *
 *   buildCard(registry, { format: 'membership', front: side('#111827', [
 *     el('logo', [4, 3.7, 26, 5]),
 *     el('field', [4, 28, 55, 5.7], { text: '{{member.name}}', size: 11 }, { name: 'Name' }),
 *   ]) })
 *
 * A frame is `[x, y, w, h]` or `[x, y, w, h, rotation]`, in millimetres.
 * Every element's props are checked against its schema, so a mistake in an
 * outline fails loudly where it is written.
 */

export interface ElementSpec {
  type: string;
  frame: CardFrame;
  props: Record<string, unknown>;
  name?: string | undefined;
  hidden?: boolean | undefined;
  locked?: boolean | undefined;
}

export interface SideSpec {
  background: string;
  image?: MediaRef | null | undefined;
  elements: ElementSpec[];
}

type FrameTuple = readonly [x: number, y: number, w: number, h: number, r?: number];

export const el = (
  type: string,
  [x, y, w, h, r = 0]: FrameTuple,
  props: Record<string, unknown> = {},
  extra: { name?: string; hidden?: boolean; locked?: boolean } = {},
): ElementSpec => ({ type, frame: { x, y, w, h, r }, props, ...extra });

export const side = (
  background: string,
  elements: ElementSpec[],
  image: MediaRef | null = null,
): SideSpec => ({ background, elements, image });

/** The root's props to change from the format's: `{ sides: 1, print: { bleed: 2 } }`. */
export type CardPatch = Partial<Omit<CardFormatProps, 'print'>> & {
  print?: Partial<CardFormatProps['print']> | undefined;
};

export interface BuildCardOptions {
  meta?: Partial<CardMeta> | undefined;
  format?: CardFormat | undefined;
  card?: CardPatch | undefined;
  front?: SideSpec | undefined;
  back?: SideSpec | undefined;
  /** Ids `n1`, `n2`… in order, for fixtures that must not change between runs. */
  stable?: boolean | undefined;
}

export function buildCard(registry: ElementRegistry, options: BuildCardOptions): CardDocument {
  const doc = createCardDocument({ meta: options.meta, format: options.format });
  const root = doc.nodes[doc.root];
  if (!root) throw new Error('No root');
  const format = root.props as CardFormatProps;
  const { print, ...rest } = options.card ?? {};
  root.props = { ...format, ...rest, print: { ...format.print, ...print } };

  let next = 0;
  const id = () => {
    if (!options.stable) return createId();
    next += 1;
    return `n${String(next)}`;
  };
  const make = (spec: ElementSpec): string => {
    const definition = registry.require(spec.type);
    const parsed = definition.schema.safeParse({
      ...definition.defaults(),
      ...spec.props,
      frame: spec.frame,
    });
    if (!parsed.success) {
      throw new Error(`Invalid props for "${spec.type}": ${parsed.error.message}`);
    }
    const nodeId = id();
    const node: BuilderNode = {
      id: nodeId,
      type: spec.type,
      v: definition.version,
      props: parsed.data,
    };
    if (spec.name) node.name = spec.name;
    if (spec.hidden) node.hidden = true;
    if (spec.locked) node.locked = true;
    doc.nodes[nodeId] = node;
    return nodeId;
  };

  for (const [sideId, spec] of [
    ['front', options.front],
    ['back', options.back],
  ] as const) {
    const node = doc.nodes[sideId];
    if (!node || !spec) continue;
    node.props = { ...node.props, background: spec.background, image: spec.image ?? null };
    node.children = spec.elements.map(make);
  }
  return doc;
}
