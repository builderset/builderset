import { defineElement, richTextToPlain, rt, UNPLACED_FRAME } from '@builderset/engine';
import { z } from 'zod';

import {
  actionIssues,
  ELEMENT_PARENTS,
  frameSchema,
  linkShape,
  TEXT_ACTIONS,
  textValue,
  typeShape,
} from './common';

/**
 * The words of a popup: a heading, a text, and a small label over a heading. Text is rich text with `{{visitor.first_name}}` style
 * variables in it; a click on it can open a link or close the popup ("Not now").
 */

const textShape = {
  frame: frameSchema,
  text: textValue(),
  ...typeShape,
  action: z.enum(TEXT_ACTIONS),
  ...linkShape,
};

function textDefaults(
  text: string,
  look: Partial<{
    font: 'poppins' | 'sora';
    size: number;
    weight: 400 | 500 | 600 | 700 | 800;
    color: string;
    lineHeight: number;
    letterSpacing: number;
    uppercase: boolean;
  }>,
) {
  return {
    frame: { ...UNPLACED_FRAME },
    text: rt(text),
    font: look.font ?? 'poppins',
    size: look.size ?? 14,
    weight: look.weight ?? 400,
    color: look.color ?? '',
    align: 'left' as const,
    lineHeight: look.lineHeight ?? 1.45,
    letterSpacing: look.letterSpacing ?? 0,
    uppercase: look.uppercase ?? false,
    highlight: '',
    highlightRadius: 0,
    action: 'none' as const,
    url: '',
    newTab: false,
  };
}

export const headingElement = defineElement({
  type: 'heading',
  version: 1,
  category: 'text',
  icon: 'heading',
  keywords: ['title', 'headline'],
  schema: z.object(textShape),
  defaults: () =>
    textDefaults('Heading', {
      font: 'sora',
      size: 26,
      weight: 700,
      lineHeight: 1.15,
      letterSpacing: -0.3,
    }),
  parents: ELEMENT_PARENTS,
  toPlainText: (props) => richTextToPlain(props.text),
  check: (props, { node }) => actionIssues(props, node),
});

export const textElement = defineElement({
  type: 'text',
  version: 1,
  category: 'text',
  icon: 'type',
  keywords: ['paragraph', 'body', 'words'],
  schema: z.object(textShape),
  defaults: () => textDefaults('Write your text here', {}),
  parents: ELEMENT_PARENTS,
  toPlainText: (props) => richTextToPlain(props.text),
  check: (props, { node }) => actionIssues(props, node),
});

export const labelElement = defineElement({
  type: 'label',
  version: 1,
  category: 'text',
  icon: 'tag',
  keywords: ['eyebrow', 'kicker', 'caption'],
  schema: z.object(textShape),
  defaults: () =>
    textDefaults('LABEL', {
      size: 13,
      weight: 600,
      color: '#9ca3af',
      lineHeight: 1.2,
      letterSpacing: 1.4,
      uppercase: true,
    }),
  parents: ELEMENT_PARENTS,
  toPlainText: (props) => richTextToPlain(props.text),
  check: (props, { node }) => actionIssues(props, node),
});

export const textElements = [headingElement, textElement, labelElement];
