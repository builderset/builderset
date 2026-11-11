import { warning, defineElement, SPACE } from '@motors/engine';
import { z } from 'zod';

import { media, present } from './fields';

/**
 * Layout: the elements that hold other elements.
 *
 * The nesting rules are what keep a document READABLE rather than merely
 * valid: a section is a band across the page, so sections do not nest; a
 * column exists only inside columns; columns do not go inside columns, because
 * a four-deep grid on a phone is a single-letter-wide column of text.
 */

/** Everything a section-level container accepts, minus these. */
const NOT_IN_BLOCK = ['section', 'column', 'accordion-item', 'tab-item'] as const;

export const rootElement = defineElement({
  type: 'root',
  version: 1,
  category: 'layout',
  icon: 'file-text',
  internal: true,
  schema: z.object({}),
  defaults: () => ({}),
  container: { except: ['root', 'column', 'accordion-item', 'tab-item'] },
});

export const sectionElement = defineElement({
  type: 'section',
  version: 1,
  category: 'layout',
  icon: 'rectangle-horizontal',
  keywords: ['band', 'block', 'background', 'hero', 'row'],
  schema: z.object({
    background: z.enum(['none', 'muted', 'card', 'inverted', 'primary', 'image']),
    image: media(),
    /** Darkening over a background image, so text on it stays legible. */
    overlay: z.number().int().min(0).max(90),
    paddingY: z.enum(SPACE),
    /** Content width inside the band. */
    width: z.enum(['prose', 'wide', 'full']),
  }),
  defaults: () => ({
    background: 'muted' as const,
    image: null,
    overlay: 40,
    paddingY: 'lg' as const,
    width: 'wide' as const,
  }),
  container: {
    except: [...NOT_IN_BLOCK, 'root'],
    initial: () => [{ type: 'paragraph' }],
  },
  media: (props) => present(props.image),
  check: (props, { node }) =>
    props.background === 'image' && !props.image
      ? [warning('section.imageMissing', { nodeId: node.id, path: 'image' })]
      : [],
});

export const containerElement = defineElement({
  type: 'container',
  version: 1,
  category: 'layout',
  icon: 'square-dashed',
  keywords: ['wrapper', 'box', 'width'],
  schema: z.object({ width: z.enum(['prose', 'wide', 'full']) }),
  defaults: () => ({ width: 'prose' as const }),
  container: { except: [...NOT_IN_BLOCK, 'root'], initial: () => [{ type: 'paragraph' }] },
});

/** Column presets, as fractions of twelve. */
export const COLUMN_LAYOUTS = {
  '1-1': [6, 6],
  '1-2': [4, 8],
  '2-1': [8, 4],
  '1-1-1': [4, 4, 4],
  '1-2-1': [3, 6, 3],
  '1-1-1-1': [3, 3, 3, 3],
} as const satisfies Record<string, readonly number[]>;

export type ColumnLayout = keyof typeof COLUMN_LAYOUTS;

export const columnsElement = defineElement({
  type: 'columns',
  version: 1,
  category: 'layout',
  icon: 'columns-2',
  keywords: ['grid', 'side by side', 'split', 'row'],
  schema: z.object({
    layout: z.enum(['1-1', '1-2', '2-1', '1-1-1', '1-2-1', '1-1-1-1', 'custom']),
    gap: z.enum(['sm', 'md', 'lg']),
    verticalAlign: z.enum(['start', 'center', 'end', 'stretch']),
    /** The breakpoint at and below which columns stack into one. */
    stackOn: z.enum(['tablet', 'mobile', 'never']),
    /** On a stacked layout, put the last column first. */
    reverseOnStack: z.boolean(),
  }),
  defaults: () => ({
    layout: '1-1' as const,
    gap: 'md' as const,
    verticalAlign: 'start' as const,
    stackOn: 'mobile' as const,
    reverseOnStack: false,
  }),
  container: {
    only: ['column'],
    min: 2,
    max: 4,
    initial: () => COLUMN_LAYOUTS['1-1'].map((span) => ({ type: 'column', props: { span } })),
  },
});

export const columnElement = defineElement({
  type: 'column',
  version: 1,
  category: 'layout',
  icon: 'rectangle-vertical',
  internal: true,
  parents: ['columns'],
  schema: z.object({ span: z.number().int().min(1).max(12) }),
  defaults: () => ({ span: 6 }),
  container: {
    except: [...NOT_IN_BLOCK, 'root', 'container', 'columns'],
    initial: () => [{ type: 'paragraph' }],
  },
});

export const groupElement = defineElement({
  type: 'group',
  version: 1,
  category: 'layout',
  icon: 'group',
  keywords: ['stack', 'wrap', 'box'],
  schema: z.object({
    direction: z.enum(['vertical', 'horizontal']),
    gap: z.enum(['none', 'sm', 'md', 'lg']),
    align: z.enum(['start', 'center', 'end', 'stretch']),
    wrap: z.boolean(),
  }),
  defaults: () => ({
    direction: 'vertical' as const,
    gap: 'md' as const,
    align: 'stretch' as const,
    wrap: true,
  }),
  container: { except: [...NOT_IN_BLOCK, 'root'], initial: () => [{ type: 'paragraph' }] },
});

export const spacerElement = defineElement({
  type: 'spacer',
  version: 1,
  category: 'layout',
  icon: 'move-vertical',
  keywords: ['gap', 'space', 'empty'],
  schema: z.object({ size: z.enum(SPACE) }),
  defaults: () => ({ size: 'md' as const }),
});

export const dividerElement = defineElement({
  type: 'divider',
  version: 1,
  category: 'layout',
  icon: 'minus',
  keywords: ['line', 'separator', 'hr', 'rule'],
  schema: z.object({
    variant: z.enum(['line', 'dashed', 'dots', 'ornament']),
    width: z.enum(['short', 'medium', 'full']),
  }),
  defaults: () => ({ variant: 'line' as const, width: 'full' as const }),
});

export const layoutElements = [
  rootElement,
  sectionElement,
  containerElement,
  columnsElement,
  columnElement,
  groupElement,
  spacerElement,
  dividerElement,
] as const;
