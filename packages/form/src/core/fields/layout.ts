import { defineElement, mediaRefSchema, warning } from '@builderset/engine';
import { z } from 'zod';

import { answerKey, FIELD_PARENTS, layoutDefaults, layoutShape } from './common';

/**
 * What a form shows besides questions: a heading over a part of it, a
 * paragraph that explains, a line, a picture — and a hidden field, which the
 * visitor never sees but which is sent with the answers (where they came
 * from, a code from the link).
 */

export const headingBlock = defineElement({
  type: 'heading',
  version: 1,
  category: 'layout',
  icon: 'heading',
  keywords: ['title', 'section', 'part'],
  schema: z.object({ ...layoutShape, text: z.string().max(300) }),
  defaults: () => ({ ...layoutDefaults(), text: 'A part of the form' }),
  parents: FIELD_PARENTS,
  toPlainText: (props) => props.text,
});

export const paragraphBlock = defineElement({
  type: 'paragraph',
  version: 1,
  category: 'layout',
  icon: 'pilcrow',
  keywords: ['text', 'explain', 'description', 'note'],
  schema: z.object({ ...layoutShape, text: z.string().max(3000) }),
  defaults: () => ({
    ...layoutDefaults(),
    text: 'A sentence or two that explains this part of the form.',
  }),
  parents: FIELD_PARENTS,
  toPlainText: (props) => props.text,
});

export const dividerBlock = defineElement({
  type: 'divider',
  version: 1,
  category: 'layout',
  icon: 'minus',
  keywords: ['line', 'separator', 'rule'],
  schema: z.object(layoutShape),
  defaults: layoutDefaults,
  parents: FIELD_PARENTS,
});

export const imageBlock = defineElement({
  type: 'image',
  version: 1,
  category: 'layout',
  icon: 'image',
  keywords: ['picture', 'photo', 'illustration'],
  schema: z.object({ ...layoutShape, media: mediaRefSchema.nullable(), alt: z.string().max(300) }),
  defaults: () => ({ ...layoutDefaults(), media: null, alt: '' }),
  parents: FIELD_PARENTS,
  media: (props) => (props.media ? [props.media] : []),
  check: (props, { node }) =>
    props.media && !props.alt.trim()
      ? [warning('image.altMissing', { nodeId: node.id, path: 'alt' })]
      : [],
});

export const hiddenField = defineElement({
  type: 'hidden',
  version: 1,
  category: 'layout',
  icon: 'eye-off',
  keywords: ['utm', 'source', 'tracking', 'prefill', 'invisible'],
  schema: z.object({
    /** Its name in the responses. */
    label: z.string().max(300),
    key: answerKey(),
    /** Sent as it is, unless the link fills it. */
    value: z.string().max(500),
    prefill: z
      .string()
      .regex(/^[A-Za-z0-9_]*$/)
      .max(40),
  }),
  defaults: () => ({ label: 'Source', key: 'source', value: '', prefill: 'utm_source' }),
  parents: FIELD_PARENTS,
  toPlainText: (props) => props.label,
});

export const layoutBlocks = [headingBlock, paragraphBlock, dividerBlock, imageBlock, hiddenField];
