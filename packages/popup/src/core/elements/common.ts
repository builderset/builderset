import {
  error,
  freeFrameSchema,
  isSafeUrl,
  richTextSchema,
  type BuilderNode,
  type FreeFrame,
  type Issue,
} from '@builderset/engine';
import { z } from 'zod';

import { FONT_KEYS, optionalHex } from '../document';

/**
 * What every placed element shares — its frame — and what the text elements
 * and the clickable ones share: the type's look, and what a click does.
 */

/** Placed elements sit in the popup (the root), never inside one another. */
export const ELEMENT_PARENTS = ['root'] as const;

/**
 * Where an element sits in the popup, in CSS pixels from its top-left corner,
 * and its rotation in degrees: the engine's free-canvas frame. An element may
 * reach past the popup's edge; what is outside is cut off.
 */
export const frameSchema = freeFrameSchema;

export const frame = (x: number, y: number, w: number, h: number, r = 0): FreeFrame => ({
  x,
  y,
  w,
  h,
  r,
});

/**
 * A new element's size, in CSS pixels, before the person building it drags
 * it: what the editor's library places (its `sizeOf`).
 */
export const POPUP_ELEMENT_SIZES: Record<string, { w: number; h: number }> = {
  heading: { w: 280, h: 40 },
  text: { w: 240, h: 44 },
  label: { w: 150, h: 18 },
  button: { w: 220, h: 46 },
  input: { w: 270, h: 44 },
  close: { w: 30, h: 30 },
  countdown: { w: 230, h: 52 },
  rect: { w: 140, h: 90 },
  ellipse: { w: 100, h: 100 },
  line: { w: 180, h: 2 },
  image: { w: 170, h: 115 },
  icon: { w: 32, h: 32 },
  logo: { w: 150, h: 30 },
  qr: { w: 100, h: 100 },
};

export const WEIGHTS = [400, 500, 600, 700, 800] as const;
export const weightSchema = z.union([
  z.literal(400),
  z.literal(500),
  z.literal(600),
  z.literal(700),
  z.literal(800),
]);

/** The look of a piece of text: heading, text, label. */
export const typeShape = {
  font: z.enum(FONT_KEYS),
  size: z.number().int().min(6).max(200),
  weight: weightSchema,
  /** Empty: dark or light, whichever reads on the popup's background. */
  color: optionalHex(),
  align: z.enum(['left', 'center', 'right']),
  lineHeight: z.number().min(0.8).max(3),
  letterSpacing: z.number().min(-5).max(20),
  uppercase: z.boolean(),
  /** A colour behind the words; empty: none. */
  highlight: optionalHex(),
  highlightRadius: z.number().int().min(0).max(64),
};

// #region action
/** What a click on a text does. Buttons may also `submit` the popup's inputs. */
export const TEXT_ACTIONS = ['none', 'link', 'close'] as const;
export const BUTTON_ACTIONS = ['none', 'link', 'close', 'submit'] as const;
export type PopupAction = (typeof BUTTON_ACTIONS)[number];

export const linkShape = {
  /** Where `link` goes: a web address, or a path on this site. */
  url: z.string().max(2000),
  newTab: z.boolean(),
};
// #endregion action

export const textValue = () => richTextSchema;

/** A link that goes nowhere, or somewhere it must not: before it goes live. */
export function actionIssues(props: { action: string; url: string }, node: BuilderNode): Issue[] {
  if (props.action !== 'link') return [];
  if (!props.url.trim()) return [error('action.linkMissing', { nodeId: node.id, path: 'url' })];
  if (!isSafeUrl(props.url)) return [error('url.unsafe', { nodeId: node.id, path: 'url' })];
  return [];
}

/** Whether a node is one of the popup's inputs. */
export const isInput = (node: BuilderNode): boolean => node.type === 'input';
