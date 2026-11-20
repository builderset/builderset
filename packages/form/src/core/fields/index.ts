import { ElementRegistry, type ElementDefinition } from '@builderset/engine';

import { basicFields } from './basic';
import { choiceFields } from './choice';
import { layoutBlocks } from './layout';
import { peopleFields } from './people';
import { structureElements } from './structure';

export * from './basic';
export * from './choice';
export * from './common';
export * from './layout';
export * from './people';
export * from './structure';

/** The library's categories, in order. `structure` (the root and steps) is never offered. */
export const FORM_CATEGORIES = ['basic', 'choice', 'people', 'layout', 'structure'] as const;

/** Every element of a form. */
export const standardFormElements = [
  ...structureElements,
  ...basicFields,
  ...choiceFields,
  ...peopleFields,
  ...layoutBlocks,
] as unknown as readonly ElementDefinition<never>[];

/** A registry of the standard fields and, optionally, a host's own. */
export function createFormRegistry(
  plugins: readonly ElementDefinition<never>[] = [],
): ElementRegistry {
  return new ElementRegistry([...standardFormElements, ...plugins]);
}

/**
 * What kind of answer a field type takes — how the renderer reads it from the
 * inputs and how `validateAnswers` checks it:
 *
 * - `text`: a string — text, email, phone, a date, a choice, yes/no (`yes`, `no`), …
 * - `number`: a number — a number, stars, a score, a slider
 * - `list`: strings — the choices ticked
 * - `name`: `{ first, last }`; `address`: `{ street, city, zip }`
 * - `boolean`: consent given
 * - `files`: the files sent, as the host stored them
 * - `none`: a heading, a paragraph, a line, a picture
 */
export const ANSWER_KINDS = {
  text: 'text',
  textarea: 'text',
  email: 'text',
  phone: 'text',
  number: 'number',
  date: 'text',
  time: 'text',
  password: 'text',
  select: 'text',
  radio: 'text',
  checkbox: 'list',
  'yes-no': 'text',
  rating: 'number',
  scale: 'number',
  slider: 'number',
  name: 'name',
  address: 'address',
  consent: 'boolean',
  signature: 'text',
  file: 'files',
  hidden: 'text',
  heading: 'none',
  paragraph: 'none',
  divider: 'none',
  image: 'none',
} as const satisfies Record<string, string>;
export type AnswerKind = (typeof ANSWER_KINDS)[keyof typeof ANSWER_KINDS];

export function answerKindOf(type: string): AnswerKind {
  return (ANSWER_KINDS as Record<string, AnswerKind | undefined>)[type] ?? 'none';
}
