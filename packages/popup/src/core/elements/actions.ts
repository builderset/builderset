import {
  defineElement,
  error,
  richTextToPlain,
  rt,
  warning,
  UNPLACED_FRAME,
} from '@builderset/engine';
import { z } from 'zod';

import { FONT_KEYS, hex, optionalHex } from '../document';
import {
  actionIssues,
  BUTTON_ACTIONS,
  ELEMENT_PARENTS,
  frameSchema,
  linkShape,
  textValue,
  weightSchema,
} from './common';

/**
 * What a visitor does with a popup: a button (a link, close, or send the
 * inputs), an input (a plate number, an email), the × that closes it, and a
 * countdown to the end of an offer.
 */

/** An input's name in a submission: `plate`, `first_name`. Empty is a mistake `checkPopup` names. */
export const INPUT_NAME = /^([a-z][a-z0-9_]{0,39})?$/;

/** What an input takes, which decides its keyboard and its check. */
export const INPUT_KINDS = ['text', 'email', 'tel', 'plate'] as const;
export type InputKind = (typeof INPUT_KINDS)[number];

export const buttonElement = defineElement({
  type: 'button',
  version: 1,
  category: 'actions',
  icon: 'square-mouse-pointer',
  keywords: ['call to action', 'cta', 'link', 'submit'],
  schema: z.object({
    frame: frameSchema,
    text: textValue(),
    font: z.enum(FONT_KEYS),
    size: z.number().int().min(8).max(64),
    weight: weightSchema,
    /** The words' colour. */
    color: hex(),
    fill: optionalHex(),
    radius: z.number().int().min(0).max(500),
    action: z.enum(BUTTON_ACTIONS),
    ...linkShape,
    /** Shown in the popup once the inputs are sent (`submit`). */
    thanks: z.string().max(300),
  }),
  defaults: () => ({
    frame: { ...UNPLACED_FRAME },
    text: rt('Get started'),
    font: 'poppins' as const,
    size: 15,
    weight: 600 as const,
    color: '#ffffff',
    fill: '#e06a1b',
    radius: 10,
    action: 'link' as const,
    url: '',
    newTab: false,
    thanks: 'Thank you! We will be in touch soon.',
  }),
  parents: ELEMENT_PARENTS,
  toPlainText: (props) => richTextToPlain(props.text),
  links: (props) => (props.action === 'link' && props.url ? [props.url] : []),
  check: (props, { node }) => actionIssues(props, node),
});

export const inputElement = defineElement({
  type: 'input',
  version: 1,
  category: 'actions',
  icon: 'text-cursor-input',
  keywords: ['field', 'email', 'plate', 'phone', 'lead'],
  schema: z.object({
    frame: frameSchema,
    /** The answer's name in a submission. */
    name: z.string().regex(INPUT_NAME),
    /** What a screen reader announces; the placeholder when empty. */
    label: z.string().max(120),
    placeholder: z.string().max(120),
    kind: z.enum(INPUT_KINDS),
    required: z.boolean(),
    size: z.number().int().min(10).max(32),
    color: hex(),
    fill: hex(),
    border: optionalHex(),
    radius: z.number().int().min(0).max(500),
  }),
  defaults: () => ({
    frame: { ...UNPLACED_FRAME },
    name: 'email',
    label: 'Email',
    placeholder: 'name@example.com',
    kind: 'email' as const,
    required: true,
    size: 15,
    color: '#111827',
    fill: '#ffffff',
    border: '#d1d5db',
    radius: 10,
  }),
  parents: ELEMENT_PARENTS,
  toPlainText: (props) => props.label || props.placeholder,
  check: (props, { node }) => {
    if (!props.name) return [error('input.nameMissing', { nodeId: node.id, path: 'name' })];
    if (!props.label.trim() && !props.placeholder.trim()) {
      return [warning('input.labelMissing', { nodeId: node.id, path: 'label' })];
    }
    return [];
  },
});

export const closeElement = defineElement({
  type: 'close',
  version: 1,
  category: 'actions',
  icon: 'x',
  keywords: ['dismiss', 'x', 'cross'],
  schema: z.object({ frame: frameSchema, color: hex(), fill: optionalHex() }),
  defaults: () => ({ frame: { ...UNPLACED_FRAME }, color: '#6b7280', fill: '#f3f4f6' }),
  parents: ELEMENT_PARENTS,
});

export const countdownElement = defineElement({
  type: 'countdown',
  version: 1,
  category: 'actions',
  icon: 'timer',
  keywords: ['timer', 'deadline', 'sale ends'],
  schema: z.object({
    frame: frameSchema,
    /** The moment it reaches zero, in the visitor's own time: `2026-11-30T23:59`. */
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
    font: z.enum(FONT_KEYS),
    size: z.number().int().min(10).max(96),
    color: hex(),
  }),
  defaults: () => ({
    frame: { ...UNPLACED_FRAME },
    to: '2026-12-31T23:59',
    font: 'sora' as const,
    size: 24,
    color: '#111827',
  }),
  parents: ELEMENT_PARENTS,
});

export const actionElements = [buttonElement, inputElement, closeElement, countdownElement];
