import { defineElement, error, warning } from '@motors/builder-core';
import { z } from 'zod';

import {
  alignSchema,
  blockFont,
  color,
  defaultDisplay,
  displaySchema,
  media,
  optionalColor,
  pad,
  paddingSchema,
  px,
  templateText,
  templateUrl,
} from '../fields';
import { et, linksIn, plainOf, richText, v } from '../rich-text';
import { VARIABLE_PATH } from '../variables';
import { BLOCK_PARENTS } from './content';

/**
 * Data, commerce, compliance and logic blocks: the ones that turn a template
 * into an email about SOMETHING — an order, an appointment, an application.
 */

const common = { display: displaySchema, padding: paddingSchema };
const commonDefaults = (padding = pad(8, 0)) => ({ display: defaultDisplay(), padding });

export const productElement = defineElement({
  type: 'product',
  version: 1,
  category: 'commerce',
  icon: 'newspaper',
  keywords: ['card', 'item', 'offer', 'car'],
  schema: z.object({
    font: blockFont(),
    align: alignSchema.optional(),
    image: media(),
    alt: z.string().max(300),
    title: templateText(120),
    description: richText(),
    price: templateText(40),
    oldPrice: templateText(40),
    buttonLabel: templateText(40),
    href: templateUrl(),
    layout: z.enum(['stacked', 'side']),
    accent: color(),
    ...common,
  }),
  defaults: () => ({
    font: null,
    align: 'left' as const,
    image: null,
    alt: '',
    title: 'Product name',
    description: et('One or two lines about why it is worth a look.'),
    price: '€0',
    oldPrice: '',
    buttonLabel: 'View',
    href: '',
    layout: 'stacked' as const,
    accent: 'brand.primary',
    ...commonDefaults(pad(12, 0)),
  }),
  parents: BLOCK_PARENTS,
  media: (props) => (props.image ? [props.image] : []),
  links: (props) => [props.href, ...linksIn(props.description)],
  toPlainText: (props) => `${props.title} ${props.price}\n${plainOf(props.description)}`,
});

export const couponElement = defineElement({
  type: 'coupon',
  version: 1,
  category: 'commerce',
  icon: 'split',
  keywords: ['code', 'discount', 'voucher', 'promo'],
  schema: z.object({
    font: blockFont(),
    code: templateText(60),
    caption: templateText(160),
    background: optionalColor(),
    borderColor: color(),
    textColor: optionalColor(),
    align: alignSchema,
    ...common,
  }),
  defaults: () => ({
    font: null,
    code: 'WELCOME10',
    caption: 'Use this code at checkout',
    background: null,
    borderColor: 'brand.primary',
    textColor: null,
    align: 'center' as const,
    ...commonDefaults(pad(12, 0)),
  }),
  parents: BLOCK_PARENTS,
  toPlainText: (props) => `${props.caption}: ${props.code}`,
});

export const keyValueElement = defineElement({
  type: 'key-value',
  version: 1,
  category: 'data',
  icon: 'table',
  keywords: ['details', 'summary', 'info', 'rows', 'appointment'],
  schema: z.object({
    font: blockFont(),
    rows: z
      .array(z.object({ label: templateText(80), value: templateText(300) }))
      .min(1)
      .max(20),
    labelColor: optionalColor(),
    valueColor: optionalColor(),
    background: optionalColor(),
    borderColor: color(),
    size: px(11, 20),
    ...common,
  }),
  defaults: () => ({
    font: null,
    rows: [
      { label: 'Date', value: '{{ now | date }}' },
      { label: 'Reference', value: 'ABC-123' },
    ],
    labelColor: null,
    valueColor: null,
    background: null,
    borderColor: 'brand.border',
    size: 15,
    ...commonDefaults(pad(12, 0)),
  }),
  parents: BLOCK_PARENTS,
  toPlainText: (props) => props.rows.map((row) => `${row.label}: ${row.value}`).join('\n'),
});

export const lineItemsElement = defineElement({
  type: 'line-items',
  version: 1,
  category: 'data',
  icon: 'list-ordered',
  keywords: ['order', 'receipt', 'invoice', 'table', 'loop'],
  schema: z.object({
    font: blockFont(),
    /** The list variable to repeat over (`order.items`). */
    list: z.string().regex(VARIABLE_PATH),
    columns: z
      .array(
        z.object({
          header: templateText(40),
          /** A field of each item (`name`, `price`). */
          field: z.string().regex(/^[a-z_][a-z0-9_]*$/),
          align: alignSchema,
        }),
      )
      .min(1)
      .max(5),
    totalLabel: templateText(60),
    totalValue: templateText(60),
    max: px(1, 100),
    headerBackground: optionalColor(),
    borderColor: color(),
    size: px(11, 20),
    ...common,
  }),
  defaults: () => ({
    font: null,
    list: 'order.items',
    columns: [
      { header: 'Item', field: 'name', align: 'left' as const },
      { header: 'Qty', field: 'quantity', align: 'center' as const },
      { header: 'Price', field: 'price', align: 'right' as const },
    ],
    totalLabel: 'Total',
    totalValue: '{{ order.total | money }}',
    max: 50,
    headerBackground: null,
    borderColor: 'brand.border',
    size: 14,
    ...commonDefaults(pad(12, 0)),
  }),
  parents: BLOCK_PARENTS,
});

export const surveyElement = defineElement({
  type: 'survey',
  version: 1,
  category: 'data',
  icon: 'chart-no-axes-column-increasing',
  keywords: ['nps', 'rating', 'feedback', 'score'],
  schema: z.object({
    font: blockFont(),
    question: templateText(200),
    scale: z.union([z.literal(5), z.literal(10)]),
    /** `{score}` is replaced with each button's number. */
    href: templateUrl(),
    lowLabel: templateText(40),
    highLabel: templateText(40),
    color: color(),
    ...common,
  }),
  defaults: () => ({
    font: null,
    question: 'How likely are you to recommend us to a friend?',
    scale: 10 as const,
    href: '',
    lowLabel: 'Not likely',
    highLabel: 'Very likely',
    color: 'brand.primary',
    ...commonDefaults(pad(12, 0)),
  }),
  parents: BLOCK_PARENTS,
  links: (props) => [props.href],
});

export const footerElement = defineElement({
  type: 'footer',
  version: 1,
  category: 'compliance',
  icon: 'shield-alert',
  keywords: ['unsubscribe', 'address', 'legal', 'bottom'],
  schema: z.object({
    font: blockFont(),
    text: richText(),
    showAddress: z.boolean(),
    showUnsubscribe: z.boolean(),
    showPreferences: z.boolean(),
    showViewInBrowser: z.boolean(),
    align: alignSchema,
    color: optionalColor(),
    size: px(10, 16),
    ...common,
  }),
  defaults: () => ({
    font: null,
    text: [{ text: 'You are receiving this email from ' }, v('brand.name'), { text: '.' }],
    showAddress: true,
    showUnsubscribe: true,
    showPreferences: false,
    showViewInBrowser: true,
    align: 'center' as const,
    color: 'brand.muted',
    size: 12,
    ...commonDefaults(pad(16, 0)),
  }),
  parents: BLOCK_PARENTS,
  links: (props) => linksIn(props.text),
  toPlainText: (props) => plainOf(props.text),
});

export const conditionalElement = defineElement({
  type: 'conditional',
  version: 1,
  category: 'logic',
  icon: 'split',
  keywords: ['if', 'show', 'when', 'condition'],
  schema: z.object({ display: displaySchema }),
  defaults: () => ({
    display: { hideOn: 'none' as const, when: [{ var: 'recipient.name', op: 'exists' as const }] },
  }),
  parents: ['column', 'repeat'],
  container: {
    except: ['root', 'section', 'row', 'column', 'conditional'],
    initial: () => [{ type: 'text' }],
  },
  check: (props, { node }) =>
    props.display.when.length
      ? []
      : [warning('conditional.empty', { nodeId: node.id, path: 'display.when' })],
});

export const repeatElement = defineElement({
  type: 'repeat',
  version: 1,
  category: 'logic',
  icon: 'list-checks',
  keywords: ['loop', 'each', 'list', 'for'],
  schema: z.object({
    list: z.string().regex(VARIABLE_PATH),
    max: px(1, 100),
    display: displaySchema,
  }),
  defaults: () => ({ list: 'items', max: 20, display: defaultDisplay() }),
  parents: ['column', 'conditional'],
  container: {
    except: ['root', 'section', 'row', 'column', 'repeat'],
    initial: () => [{ type: 'text' }],
  },
  check: (props, { node }) =>
    props.list ? [] : [error('repeat.listMissing', { nodeId: node.id, path: 'list' })],
});

export const commerceElements = [
  productElement,
  couponElement,
  keyValueElement,
  lineItemsElement,
  surveyElement,
  footerElement,
  conditionalElement,
  repeatElement,
];
