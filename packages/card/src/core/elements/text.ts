import { defineElement } from '@builderset/engine';
import { z } from 'zod';

import { ELEMENT_PARENTS, textDefaults, textShape } from './common';

/**
 * Words on a card. The four differ in what they start as — a title, a
 * sentence, a small capital label, a member's value — and share every prop,
 * so one can be restyled into another.
 */

const textSchema = z.object(textShape);

export const headingElement = defineElement({
  type: 'heading',
  version: 1,
  category: 'text',
  icon: 'heading',
  keywords: ['title'],
  schema: textSchema,
  defaults: () => textDefaults({ text: 'Titulli', size: 12, weight: 700, font: 'sora' }),
  parents: ELEMENT_PARENTS,
  toPlainText: (props) => props.text,
});

export const textElement = defineElement({
  type: 'text',
  version: 1,
  category: 'text',
  icon: 'type',
  keywords: ['paragraph', 'words'],
  schema: textSchema,
  defaults: () => textDefaults({ text: 'Shkruani tekstin këtu', size: 7, lineHeight: 1.45 }),
  parents: ELEMENT_PARENTS,
  toPlainText: (props) => props.text,
});

export const labelElement = defineElement({
  type: 'label',
  version: 1,
  category: 'text',
  icon: 'tag',
  keywords: ['caption', 'small'],
  schema: textSchema,
  defaults: () =>
    textDefaults({
      text: 'Etiketa',
      size: 6,
      weight: 600,
      color: '#9ca3af',
      letterSpacing: 0.1,
      upper: true,
      lineHeight: 1.2,
    }),
  parents: ELEMENT_PARENTS,
  toPlainText: (props) => props.text,
});

export const fieldElement = defineElement({
  type: 'field',
  version: 1,
  category: 'text',
  icon: 'braces',
  keywords: ['member', 'variable', 'data', 'name', 'number'],
  schema: textSchema,
  defaults: () => textDefaults({ text: '{{member.name}}', size: 8.5, weight: 600 }),
  parents: ELEMENT_PARENTS,
  toPlainText: (props) => props.text,
});

export const textElements = [headingElement, textElement, labelElement, fieldElement];
