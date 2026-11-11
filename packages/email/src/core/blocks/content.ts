import { defineElement, error, warning } from '@motors/engine';
import { z } from 'zod';

import {
  alignSchema,
  color,
  defaultDisplay,
  displaySchema,
  blockFont,
  media,
  optionalColor,
  pad,
  paddingSchema,
  px,
  templateText,
  templateUrl,
} from '../fields';
import { et, linksIn, plainOf, richText, type EmailRichText } from '../rich-text';

/**
 * The blocks that carry content. Every block has `display` (hide on a device,
 * show on a condition) and its own padding, because in email every gap is a
 * cell's padding — there is no margin that Outlook respects.
 */

/** Blocks sit in a column, or in a conditional / repeat inside one. */
export const BLOCK_PARENTS = ['column', 'conditional', 'repeat'] as const;

const common = {
  display: displaySchema,
  padding: paddingSchema,
};
const commonDefaults = (padding = pad(8, 0)) => ({ display: defaultDisplay(), padding });

export const headingElement = defineElement({
  type: 'heading',
  version: 1,
  category: 'content',
  icon: 'heading',
  keywords: ['title', 'h1', 'h2', 'headline'],
  schema: z.object({
    /** A web font for this block; absent follows the email's. */
    font: blockFont(),
    weight: z.enum(['300', '400', '500', '600', '700', '800', '900']).optional(),
    letterSpacing: z.number().min(-2).max(12).optional(),
    transform: z.enum(['none', 'uppercase', 'lowercase', 'capitalize']).optional(),
    text: richText(),
    level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    align: alignSchema,
    color: optionalColor(),
    size: px(14, 56),
    ...common,
  }),
  defaults: () => ({
    font: null,
    letterSpacing: 0,
    transform: 'none' as const,
    weight: '700' as const,
    text: et('A clear, short headline'),
    level: 1 as const,
    align: 'left' as const,
    color: null,
    size: 28,
    ...commonDefaults(),
  }),
  parents: BLOCK_PARENTS,
  toPlainText: (props) => plainOf(props.text),
  links: (props) => linksIn(props.text),
  check: (props, { node }) =>
    plainOf(props.text).trim() ? [] : [warning('text.empty', { nodeId: node.id, path: 'text' })],
});

export const textElement = defineElement({
  type: 'text',
  version: 1,
  category: 'content',
  icon: 'pilcrow',
  keywords: ['paragraph', 'body', 'copy'],
  schema: z.object({
    /** A web font for this block; absent follows the email's. */
    font: blockFont(),
    weight: z.enum(['300', '400', '500', '600', '700', '800', '900']).optional(),
    letterSpacing: z.number().min(-2).max(12).optional(),
    transform: z.enum(['none', 'uppercase', 'lowercase', 'capitalize']).optional(),
    text: richText(),
    align: z.enum(['left', 'center', 'right', 'justify']),
    color: optionalColor(),
    size: px(11, 28),
    lineHeight: z.number().min(1).max(2.4).nullable(),
    ...common,
  }),
  defaults: () => ({
    font: null,
    letterSpacing: 0,
    transform: 'none' as const,
    weight: '400' as const,
    text: et('Write something your reader will want to read.'),
    align: 'left' as const,
    color: null,
    size: 16,
    lineHeight: null,
    ...commonDefaults(),
  }),
  parents: BLOCK_PARENTS,
  toPlainText: (props) => plainOf(props.text),
  links: (props) => linksIn(props.text),
  check: (props, { node }) =>
    plainOf(props.text).trim() ? [] : [warning('text.empty', { nodeId: node.id, path: 'text' })],
});

export const listElement = defineElement({
  type: 'list',
  version: 1,
  category: 'content',
  icon: 'list',
  keywords: ['bullets', 'numbered', 'steps', 'checklist'],
  schema: z.object({
    font: blockFont(),
    align: alignSchema.optional(),
    style: z.enum(['bullet', 'number', 'check']),
    items: z
      .array(z.object({ text: richText() }))
      .min(1)
      .max(30),
    color: optionalColor(),
    markerColor: color(),
    size: px(11, 24),
    ...common,
  }),
  defaults: () => ({
    font: null,
    align: 'left' as const,
    style: 'bullet' as const,
    items: [{ text: et('First point') }, { text: et('Second point') }],
    color: null,
    markerColor: 'brand.primary',
    size: 16,
    ...commonDefaults(),
  }),
  parents: BLOCK_PARENTS,
  toPlainText: (props) => props.items.map((item) => plainOf(item.text)).join('\n'),
  links: (props) => props.items.flatMap((item) => linksIn(item.text)),
});

export const buttonElement = defineElement({
  type: 'button',
  version: 1,
  category: 'content',
  icon: 'mouse-pointer-click',
  keywords: ['cta', 'link', 'action'],
  schema: z.object({
    /** A web font for this block; absent follows the email's. */
    font: blockFont(),
    weight: z.enum(['300', '400', '500', '600', '700', '800', '900']).optional(),
    letterSpacing: z.number().min(-2).max(12).optional(),
    transform: z.enum(['none', 'uppercase', 'lowercase', 'capitalize']).optional(),
    label: templateText(80),
    href: templateUrl(),
    align: alignSchema,
    background: color(),
    textColor: color(),
    borderColor: optionalColor(),
    borderWidth: px(0, 6),
    radius: px(0, 40),
    paddingX: px(8, 64),
    paddingY: px(6, 32),
    size: px(12, 24),
    /** A full-width button on phones, where a thumb has to hit it. */
    fullWidthMobile: z.boolean(),
    ...common,
  }),
  defaults: () => ({
    font: null,
    letterSpacing: 0,
    transform: 'none' as const,
    weight: '600' as const,
    label: 'Get started',
    href: '',
    align: 'left' as const,
    background: 'brand.primary',
    textColor: '#ffffff',
    borderColor: null,
    borderWidth: 0,
    radius: 8,
    paddingX: 24,
    paddingY: 12,
    size: 16,
    fullWidthMobile: true,
    ...commonDefaults(pad(12, 0)),
  }),
  parents: BLOCK_PARENTS,
  toPlainText: (props) => props.label,
  links: (props) => [props.href],
  check: (props, { node }) => [
    ...(props.label.trim()
      ? []
      : [error('button.labelMissing', { nodeId: node.id, path: 'label' })]),
    ...(props.href.trim() && props.href !== 'https://'
      ? []
      : [warning('button.linkMissing', { nodeId: node.id, path: 'href' })]),
  ],
});

export const imageElement = defineElement({
  type: 'image',
  version: 1,
  category: 'media',
  icon: 'image',
  keywords: ['picture', 'photo', 'banner', 'gif'],
  schema: z.object({
    media: media(),
    alt: z.string().max(300),
    href: templateUrl(),
    /** Display width in px; null fills the column. */
    width: px(20, 800).nullable(),
    align: alignSchema,
    radius: px(0, 40),
    ...common,
  }),
  defaults: () => ({
    media: null,
    alt: '',
    href: '',
    width: null,
    align: 'center' as const,
    radius: 0,
    ...commonDefaults(pad(8, 0)),
  }),
  parents: BLOCK_PARENTS,
  media: (props) => (props.media ? [props.media] : []),
  links: (props) => (props.href ? [props.href] : []),
  check: (props, { node }) => [
    ...(props.media ? [] : [warning('media.missing', { nodeId: node.id, path: 'media' })]),
    ...(props.media && !props.alt.trim()
      ? [warning('image.altMissing', { nodeId: node.id, path: 'alt' })]
      : []),
  ],
});

export const dividerElement = defineElement({
  type: 'divider',
  version: 1,
  category: 'content',
  icon: 'minus',
  keywords: ['line', 'rule', 'separator'],
  schema: z.object({
    align: alignSchema.optional(),
    color: color(),
    thickness: px(1, 8),
    width: px(10, 100),
    style: z.enum(['solid', 'dashed', 'dotted']),
    ...common,
  }),
  defaults: () => ({
    align: 'center' as const,
    color: 'brand.border',
    thickness: 1,
    width: 100,
    style: 'solid' as const,
    ...commonDefaults(pad(16, 0)),
  }),
  parents: BLOCK_PARENTS,
});

export const spacerElement = defineElement({
  type: 'spacer',
  version: 1,
  category: 'content',
  icon: 'move-vertical',
  keywords: ['gap', 'space', 'blank'],
  schema: z.object({
    height: px(4, 200),
    mobileHeight: px(0, 200).nullable(),
    display: displaySchema,
  }),
  defaults: () => ({ height: 24, mobileHeight: null, display: defaultDisplay() }),
  parents: BLOCK_PARENTS,
});

export const quoteElement = defineElement({
  type: 'quote',
  version: 1,
  category: 'content',
  icon: 'quote',
  keywords: ['testimonial', 'review', 'citation'],
  schema: z.object({
    font: blockFont(),
    align: alignSchema.optional(),
    text: richText(),
    cite: templateText(120),
    accent: color(),
    background: optionalColor(),
    size: px(13, 28),
    ...common,
  }),
  defaults: () => ({
    font: null,
    align: 'left' as const,
    text: et('“The best decision we made this year.”'),
    cite: 'A happy customer',
    accent: 'brand.primary',
    background: null,
    size: 18,
    ...commonDefaults(pad(12, 0)),
  }),
  parents: BLOCK_PARENTS,
  toPlainText: (props) => `${plainOf(props.text)} — ${props.cite}`,
  links: (props) => linksIn(props.text),
});

export const videoElement = defineElement({
  type: 'video',
  version: 1,
  category: 'media',
  icon: 'square-play',
  keywords: ['youtube', 'vimeo', 'play', 'movie'],
  schema: z.object({
    align: alignSchema.optional(),
    /** Display width in px; null fills the column. */
    width: px(80, 800).nullable().optional(),
    /** Email clients do not play video: a picture with a play button, linked. */
    thumbnail: media(),
    href: templateUrl(),
    alt: z.string().max(300),
    playColor: color(),
    radius: px(0, 32),
    ...common,
  }),
  defaults: () => ({
    align: 'center' as const,
    width: null,
    thumbnail: null,
    href: '',
    alt: 'Watch the video',
    playColor: '#ffffff',
    radius: 8,
    ...commonDefaults(),
  }),
  parents: BLOCK_PARENTS,
  media: (props) => (props.thumbnail ? [props.thumbnail] : []),
  links: (props) => [props.href],
  check: (props, { node }) =>
    props.thumbnail ? [] : [warning('media.missing', { nodeId: node.id, path: 'thumbnail' })],
});

export const logoElement = defineElement({
  type: 'logo',
  version: 1,
  category: 'brand',
  icon: 'star',
  keywords: ['brand', 'header', 'mark'],
  schema: z.object({
    /** Null uses the brand kit's logo. */
    media: media(),
    width: px(24, 400),
    align: alignSchema,
    href: templateUrl(),
    ...common,
  }),
  defaults: () => ({
    media: null,
    width: 140,
    align: 'center' as const,
    href: '{{ brand.website }}',
    ...commonDefaults(pad(12, 0)),
  }),
  parents: BLOCK_PARENTS,
  media: (props) => (props.media ? [props.media] : []),
});

export const SOCIAL_NETWORKS = [
  'facebook',
  'instagram',
  'x',
  'linkedin',
  'youtube',
  'tiktok',
  'whatsapp',
  'telegram',
  'website',
  'email',
] as const;

export const socialElement = defineElement({
  type: 'social',
  version: 1,
  category: 'brand',
  icon: 'message-circle-question',
  keywords: ['facebook', 'instagram', 'follow', 'icons'],
  schema: z.object({
    items: z
      .array(z.object({ network: z.enum(SOCIAL_NETWORKS), href: templateUrl() }))
      .min(1)
      .max(10),
    /**
     * Round icons (PNG, hosted on the site — mail clients do not draw SVG) or
     * the networks' names as text pills. Optional: a block saved before the
     * choice existed keeps showing text.
     */
    appearance: z.enum(['icons', 'text']).optional(),
    style: z.enum(['color', 'dark', 'light', 'outline']),
    size: px(20, 48),
    gap: px(0, 24),
    align: alignSchema,
    ...common,
  }),
  defaults: () => ({
    items: [
      { network: 'facebook' as const, href: 'https://facebook.com/' },
      { network: 'instagram' as const, href: 'https://instagram.com/' },
      { network: 'linkedin' as const, href: 'https://linkedin.com/' },
    ],
    appearance: 'icons' as const,
    style: 'dark' as const,
    size: 28,
    gap: 10,
    align: 'center' as const,
    ...commonDefaults(pad(12, 0)),
  }),
  parents: BLOCK_PARENTS,
  links: (props) => props.items.map((item) => item.href),
});

export const menuElement = defineElement({
  type: 'menu',
  version: 1,
  category: 'brand',
  icon: 'list-tree',
  keywords: ['nav', 'navigation', 'links', 'header'],
  schema: z.object({
    font: blockFont(),
    items: z
      .array(z.object({ label: templateText(40), href: templateUrl() }))
      .min(1)
      .max(8),
    align: alignSchema,
    color: optionalColor(),
    size: px(11, 20),
    separator: z.enum(['none', 'dot', 'bar']),
    ...common,
  }),
  defaults: () => ({
    font: null,
    items: [
      { label: 'Home', href: '{{ brand.website }}' },
      { label: 'Blog', href: '' },
      { label: 'Contact', href: '' },
    ],
    align: 'center' as const,
    color: null,
    size: 14,
    separator: 'dot' as const,
    ...commonDefaults(pad(8, 0)),
  }),
  parents: BLOCK_PARENTS,
  links: (props) => props.items.map((item) => item.href),
});

export const contentElements = [
  headingElement,
  textElement,
  listElement,
  buttonElement,
  imageElement,
  dividerElement,
  spacerElement,
  quoteElement,
  videoElement,
  logoElement,
  socialElement,
  menuElement,
];

export type { EmailRichText };
