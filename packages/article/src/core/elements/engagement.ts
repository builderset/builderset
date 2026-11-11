import { warning, defineElement, isRichTextEmpty, type RichText } from '@motors/engine';
import { z } from 'zod';

import {
  buttonIssues,
  buttonSchema,
  joinLinks,
  joinPlain,
  richText,
  safeUrl,
  shortText,
  type ButtonSpec,
} from './fields';

/**
 * Engagement: what a reader does NEXT — a button to press, an article to read,
 * a list to join — and the collapsible containers that keep long reference
 * material out of the way until it is wanted.
 */

const NOT_IN_PANEL = [
  'section',
  'column',
  'accordion-item',
  'tab-item',
  'root',
  'accordion',
  'tabs',
] as const;

const emptyButton = (): ButtonSpec => ({
  label: '',
  href: '/',
  variant: 'primary',
  icon: 'arrow-right',
  newTab: false,
});

export const ctaElement = defineElement({
  type: 'cta',
  version: 1,
  category: 'engagement',
  icon: 'megaphone',
  keywords: ['call to action', 'banner', 'promo', 'conversion'],
  schema: z.object({
    title: shortText(),
    text: richText(),
    buttons: z.array(buttonSchema).min(1).max(2),
    tone: z.enum(['neutral', 'primary', 'inverted']),
    layout: z.enum(['card', 'band']),
    align: z.enum(['start', 'center']),
  }),
  defaults: () => ({
    title: '',
    text: [] as RichText,
    buttons: [emptyButton()],
    tone: 'neutral' as const,
    layout: 'card' as const,
    align: 'center' as const,
  }),
  toPlainText: (props) =>
    joinPlain([props.title, props.text, ...props.buttons.map((b) => b.label)]),
  links: (props) => [...joinLinks([props.text]), ...props.buttons.map((button) => button.href)],
  check: (props, { node }) => [
    ...(props.title.trim()
      ? []
      : [warning('cta.titleMissing', { nodeId: node.id, path: 'title' })]),
    ...buttonIssues(props.buttons, node.id),
  ],
});

export const buttonsElement = defineElement({
  type: 'buttons',
  version: 1,
  category: 'engagement',
  icon: 'mouse-pointer-click',
  keywords: ['button', 'link', 'action'],
  schema: z.object({
    buttons: z.array(buttonSchema).min(1).max(4),
    align: z.enum(['start', 'center', 'end', 'stretch']),
    size: z.enum(['sm', 'md', 'lg']),
  }),
  defaults: () => ({ buttons: [emptyButton()], align: 'start' as const, size: 'md' as const }),
  toPlainText: (props) => joinPlain(props.buttons.map((button) => button.label)),
  links: (props) => props.buttons.map((button) => button.href),
  check: (props, { node }) => buttonIssues(props.buttons, node.id),
});

export const relatedElement = defineElement({
  type: 'related',
  version: 1,
  category: 'engagement',
  icon: 'newspaper',
  keywords: ['read next', 'more articles', 'recommended', 'posts'],
  schema: z.object({
    title: shortText(),
    mode: z.enum(['auto', 'manual']),
    /** Hand-picked entries, by the host's own ids, when `mode` is manual. */
    items: z
      .array(z.object({ id: z.string().max(80), title: shortText(), href: safeUrl() }))
      .max(6),
    count: z.number().int().min(2).max(6),
  }),
  defaults: () => ({
    title: '',
    mode: 'auto' as const,
    items: [] as { id: string; title: string; href: string }[],
    count: 3,
  }),
  toPlainText: (props) => joinPlain([props.title]),
  links: (props) => props.items.map((item) => item.href),
  check: (props, { node }) =>
    props.mode === 'manual' && props.items.length === 0
      ? [warning('related.empty', { nodeId: node.id, path: 'items' })]
      : [],
});

export const newsletterElement = defineElement({
  type: 'newsletter',
  version: 1,
  category: 'engagement',
  icon: 'mail',
  keywords: ['subscribe', 'email', 'signup', 'mailing list'],
  schema: z.object({
    title: shortText(),
    text: richText(),
    placeholder: z.string().max(60),
    button: z.string().max(40),
  }),
  defaults: () => ({ title: '', text: [] as RichText, placeholder: '', button: '' }),
  toPlainText: (props) => joinPlain([props.title, props.text]),
  links: (props) => joinLinks([props.text]),
});

export const accordionElement = defineElement({
  type: 'accordion',
  version: 1,
  category: 'engagement',
  icon: 'chevrons-down-up',
  keywords: ['collapse', 'expand', 'toggle', 'details'],
  schema: z.object({ allowMultiple: z.boolean(), firstOpen: z.boolean() }),
  defaults: () => ({ allowMultiple: false, firstOpen: true }),
  container: {
    only: ['accordion-item'],
    min: 1,
    max: 20,
    initial: () => [
      { type: 'accordion-item', props: { title: '' } },
      { type: 'accordion-item', props: { title: '' } },
    ],
  },
});

export const accordionItemElement = defineElement({
  type: 'accordion-item',
  version: 1,
  category: 'engagement',
  icon: 'chevron-down',
  internal: true,
  parents: ['accordion'],
  schema: z.object({ title: shortText() }),
  defaults: () => ({ title: '' }),
  container: { except: [...NOT_IN_PANEL], initial: () => [{ type: 'paragraph' }] },
  toPlainText: (props) => props.title,
  check: (props, { node }) =>
    props.title.trim() ? [] : [warning('panel.titleMissing', { nodeId: node.id, path: 'title' })],
});

export const tabsElement = defineElement({
  type: 'tabs',
  version: 1,
  category: 'engagement',
  icon: 'panels-top-left',
  keywords: ['tabbed', 'switch', 'panels'],
  schema: z.object({ align: z.enum(['start', 'center', 'stretch']) }),
  defaults: () => ({ align: 'start' as const }),
  container: {
    only: ['tab-item'],
    min: 1,
    max: 8,
    initial: () => [
      { type: 'tab-item', props: { title: '' } },
      { type: 'tab-item', props: { title: '' } },
    ],
  },
});

export const tabItemElement = defineElement({
  type: 'tab-item',
  version: 1,
  category: 'engagement',
  icon: 'panel-top',
  internal: true,
  parents: ['tabs'],
  schema: z.object({ title: shortText() }),
  defaults: () => ({ title: '' }),
  container: { except: [...NOT_IN_PANEL], initial: () => [{ type: 'paragraph' }] },
  toPlainText: (props) => props.title,
  check: (props, { node }) =>
    props.title.trim() ? [] : [warning('panel.titleMissing', { nodeId: node.id, path: 'title' })],
});

export const disclaimerElement = defineElement({
  type: 'disclaimer',
  version: 1,
  category: 'engagement',
  icon: 'shield-alert',
  keywords: ['small print', 'legal', 'terms', 'notice'],
  schema: z.object({ text: richText() }),
  defaults: () => ({ text: [] as RichText }),
  toPlainText: (props) => joinPlain([props.text]),
  links: (props) => joinLinks([props.text]),
  check: (props, { node }) =>
    isRichTextEmpty(props.text) ? [warning('text.empty', { nodeId: node.id, path: 'text' })] : [],
});

export const engagementElements = [
  ctaElement,
  buttonsElement,
  relatedElement,
  newsletterElement,
  accordionElement,
  accordionItemElement,
  tabsElement,
  tabItemElement,
  disclaimerElement,
] as const;
