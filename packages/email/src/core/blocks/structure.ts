import { defineElement } from '@builderset/engine';
import { z } from 'zod';

import { color, displaySchema, media, optionalColor, pad, paddingSchema, px } from '../fields';

/**
 * The email's skeleton: sections hold rows, rows hold 1–4 columns, columns
 * hold blocks. The same three levels every email builder uses, because they
 * map directly onto the nested tables email clients need — and because the
 * rules keep a layout that will stack cleanly on a phone.
 */

/** The block types; everything that may sit in a column. */
export const STRUCTURE = ['root', 'section', 'row', 'column'] as const;

export const emailRootElement = defineElement({
  type: 'root',
  version: 1,
  category: 'structure',
  icon: 'mail',
  internal: true,
  schema: z.object({}),
  defaults: () => ({}),
  container: { only: ['section'] },
});

export const sectionElement = defineElement({
  type: 'section',
  version: 1,
  category: 'structure',
  icon: 'rectangle-horizontal',
  keywords: ['band', 'background', 'wrapper', 'stripe'],
  schema: z.object({
    /** Across the whole width of the email window, behind the content column. */
    backdrop: optionalColor(),
    /** Behind this section's content, inside the column. */
    background: optionalColor(),
    backgroundImage: media(),
    /** Stretch to the window rather than the content width. */
    fullWidth: z.boolean(),
    padding: paddingSchema,
    radius: px(0, 32),
    /**
     * Show the whole band on a condition — a welcome note only on the first
     * email, a stats box only when there are stats. Optional, so a document
     * saved before it existed is still valid.
     */
    display: displaySchema.optional(),
  }),
  defaults: () => ({
    backdrop: null,
    background: null,
    backgroundImage: null,
    fullWidth: false,
    padding: pad(24, 24),
    radius: 0,
  }),
  container: { only: ['row'], min: 1, initial: () => [{ type: 'row' }] },
  media: (props) => (props.backgroundImage ? [props.backgroundImage] : []),
});

/** Row layouts as column widths in percent. */
export const ROW_LAYOUTS = {
  '100': [100],
  '50-50': [50, 50],
  '33-67': [33, 67],
  '67-33': [67, 33],
  '25-75': [25, 75],
  '75-25': [75, 25],
  '33-33-33': [33.33, 33.33, 33.34],
  '25-25-25-25': [25, 25, 25, 25],
} as const;
export type RowLayout = keyof typeof ROW_LAYOUTS;

export const rowElement = defineElement({
  type: 'row',
  version: 1,
  category: 'structure',
  icon: 'columns-2',
  keywords: ['columns', 'layout', 'grid', 'structure'],
  schema: z.object({
    layout: z.enum(Object.keys(ROW_LAYOUTS) as [RowLayout, ...RowLayout[]]),
    /** Space between columns, in px. */
    gap: px(0, 48),
    stackOnMobile: z.boolean(),
    /** Stack the last column first — an image-right row puts its image on top. */
    reverseOnMobile: z.boolean(),
    verticalAlign: z.enum(['top', 'middle', 'bottom']),
    background: optionalColor(),
    padding: paddingSchema,
  }),
  defaults: () => ({
    layout: '100' as const,
    gap: 16,
    stackOnMobile: true,
    reverseOnMobile: false,
    verticalAlign: 'top' as const,
    background: null,
    padding: pad(0),
  }),
  parents: ['section'],
  container: { only: ['column'], min: 1, max: 4, initial: () => [{ type: 'column' }] },
});

export const columnElement = defineElement({
  type: 'column',
  version: 1,
  category: 'structure',
  icon: 'rectangle-vertical',
  internal: true,
  schema: z.object({
    background: optionalColor(),
    padding: paddingSchema,
    radius: px(0, 32),
    borderWidth: px(0, 8),
    borderColor: color(),
  }),
  defaults: () => ({
    background: null,
    padding: pad(0),
    radius: 0,
    borderWidth: 0,
    borderColor: 'brand.border',
  }),
  parents: ['row'],
  container: { except: [...STRUCTURE] },
});

export const structureElements = [emailRootElement, sectionElement, rowElement, columnElement];
