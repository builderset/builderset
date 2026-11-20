import {
  createId,
  rt,
  type BuilderNode,
  type ElementRegistry,
  type FreeFrame,
} from '@builderset/engine';

import {
  createPopupDocument,
  defaultFormat,
  type PopupDisplay,
  type PopupDocument,
  type PopupFormat,
  type PopupMeta,
  type PopupMotion,
  type PopupType,
} from './document';
import { frame } from './elements';

/**
 * Building popups from a short outline — for templates, tests and a project's
 * own ready-made popups, which would otherwise be pages of node bookkeeping:
 *
 *   buildPopup(registry, { format: { type: 'slidein' } }, [
 *     el('heading', [20, 22, 300, 28], { text: 'Oferta brenda 24 orësh' }),
 *     el('button', [20, 150, 180, 42], { text: 'Fillo', url: '/vleresim' }),
 *     el('close', [320, 12, 28, 28]),
 *   ])
 *
 * A `text` given as a string becomes rich text. Every element's props are
 * checked against its schema, so a mistake in an outline fails loudly where
 * it is written.
 */

export interface ElementSpec {
  type: string;
  frame: FreeFrame;
  props: Record<string, unknown>;
  /** The name in the layers panel. */
  name?: string | undefined;
  hidden?: boolean | undefined;
  locked?: boolean | undefined;
}

/** `[x, y, w, h]` or `[x, y, w, h, rotation]`, in CSS pixels. */
export type FrameTuple = readonly [number, number, number, number, number?];

export const el = (
  type: string,
  where: FrameTuple,
  props: Record<string, unknown> = {},
  extra: Pick<ElementSpec, 'name' | 'hidden' | 'locked'> = {},
): ElementSpec => ({
  type,
  frame: frame(where[0], where[1], where[2], where[3], where[4] ?? 0),
  props,
  ...extra,
});

/** A format with some parts changed: `{ display: { trigger: 'exit' } }` keeps the rest of `display`. */
export type FormatPatch = Partial<Omit<PopupFormat, 'display' | 'motion'>> & {
  display?: Partial<PopupDisplay> | undefined;
  motion?: Partial<PopupMotion> | undefined;
};

/** A type's default format with a patch merged in, `display` and `motion` key by key. */
export function formatWith(patch: FormatPatch = {}): PopupFormat {
  const type: PopupType = patch.type ?? 'modal';
  const base = defaultFormat(type);
  const { display, motion, ...rest } = patch;
  return {
    ...base,
    ...rest,
    display: { ...base.display, ...display },
    motion: { ...base.motion, ...motion },
  };
}

export function buildPopup(
  registry: ElementRegistry,
  options: { meta?: Partial<PopupMeta>; format?: FormatPatch; stable?: boolean },
  elements: readonly ElementSpec[],
): PopupDocument {
  const doc = createPopupDocument(options.meta);
  let next = 0;
  const id = () => {
    if (!options.stable) return createId();
    next += 1;
    return `n${String(next)}`;
  };
  const make = (spec: ElementSpec): string => {
    const definition = registry.require(spec.type);
    const props: Record<string, unknown> = { ...spec.props };
    if (typeof props.text === 'string' && spec.type !== 'logo') props.text = rt(props.text);
    const parsed = definition.schema.safeParse({
      ...definition.defaults(),
      ...props,
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

  const root = doc.nodes[doc.root];
  if (!root) throw new Error('No root');
  root.props = formatWith(options.format);
  root.children = elements.map(make);
  return doc;
}
