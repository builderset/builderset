import { error, warning, type Issue, defineElement, type RichText } from '@motors/engine';
import { ARTICLE_LIMITS } from '../limits';
import { z } from 'zod';

import { EMBED_PROVIDERS, detectEmbedProvider } from '../embeds';
import { joinLinks, joinPlain, linkSchema, media, present, richText, shortText } from './fields';

/**
 * Media. Every piece is uploaded through the host and referenced by key.
 *
 * ── Alt text is required, and says so ────────────────────────────────────────
 * An image without alt text is invisible to a screen reader and to search. The
 * schema allows it (a writer drops the picture in first and describes it
 * second), the checker warns about it on every image, and the inspector puts
 * the field at the top.
 *
 * ── `pendingUrl` is a picture that is not ours yet ───────────────────────────
 * Pasting from another page brings `<img src="https://elsewhere/…">`. The
 * builder keeps that address in `pendingUrl` so the writer sees the picture
 * and can re-upload it with one click — but a document still holding one is
 * refused by the server: hot-linking someone else's image is a broken picture
 * waiting to happen and a privacy leak on every page view.
 */

const imageItem = z.object({ media: media(), alt: shortText(), caption: shortText() });

const pendingIssue = (nodeId: string): Issue => error('media.external', { nodeId, path: 'media' });
const altIssue = (nodeId: string, path = 'alt'): Issue =>
  warning('image.altMissing', { nodeId, path });

export const imageElement = defineElement({
  type: 'image',
  version: 1,
  category: 'media',
  icon: 'image',
  keywords: ['photo', 'picture', 'figure', 'img'],
  schema: z.object({
    media: media(),
    pendingUrl: z.string().max(2000).nullable(),
    alt: shortText(),
    caption: richText(),
    credit: shortText(),
    aspect: z.enum(['original', '16:9', '4:3', '1:1', '3:4']),
    /** Where the picture's subject is, for cropping, in percent. */
    focalX: z.number().min(0).max(100),
    focalY: z.number().min(0).max(100),
    size: z.enum(['prose', 'wide', 'full']),
    rounded: z.boolean(),
    lightbox: z.boolean(),
    link: linkSchema.nullable(),
  }),
  defaults: () => ({
    media: null,
    pendingUrl: null,
    alt: '',
    caption: [] as RichText,
    credit: '',
    aspect: 'original' as const,
    focalX: 50,
    focalY: 50,
    size: 'prose' as const,
    rounded: true,
    lightbox: true,
    link: null,
  }),
  toPlainText: (props) => joinPlain([props.caption, props.credit]),
  links: (props) => [...joinLinks([props.caption]), ...(props.link ? [props.link.href] : [])],
  media: (props) => present(props.media),
  check: (props, { node }) => {
    const issues: Issue[] = [];
    if (props.pendingUrl) issues.push(pendingIssue(node.id));
    else if (!props.media)
      issues.push(warning('media.missing', { nodeId: node.id, path: 'media' }));
    if ((props.media || props.pendingUrl) && !props.alt.trim()) issues.push(altIssue(node.id));
    return issues;
  },
});

export const galleryElement = defineElement({
  type: 'gallery',
  version: 1,
  category: 'media',
  icon: 'images',
  keywords: ['photos', 'grid', 'carousel', 'slider', 'album'],
  schema: z.object({
    images: z.array(imageItem).max(ARTICLE_LIMITS.galleryImages),
    layout: z.enum(['grid', 'masonry', 'carousel']),
    columns: z.union([z.literal(2), z.literal(3), z.literal(4)]),
    lightbox: z.boolean(),
  }),
  defaults: () => ({
    images: [] as z.infer<typeof imageItem>[],
    layout: 'grid' as const,
    columns: 3 as const,
    lightbox: true,
  }),
  toPlainText: (props) => joinPlain(props.images.map((image) => image.caption)),
  media: (props) => props.images.flatMap((image) => present(image.media)),
  check: (props, { node }) => {
    const issues: Issue[] = [];
    if (props.images.length < 2)
      issues.push(warning('gallery.tooFew', { nodeId: node.id, path: 'images' }));
    props.images.forEach((image, index) => {
      if (image.media && !image.alt.trim())
        issues.push(altIssue(node.id, `images.${String(index)}.alt`));
    });
    return issues;
  },
});

const compareSide = z.object({ media: media(), alt: shortText(), label: shortText() });

export const beforeAfterElement = defineElement({
  type: 'before-after',
  version: 1,
  category: 'media',
  icon: 'split',
  keywords: ['compare', 'comparison', 'slider', 'difference'],
  schema: z.object({
    before: compareSide,
    after: compareSide,
    /** Where the handle starts, in percent. */
    start: z.number().min(5).max(95),
    caption: shortText(),
  }),
  defaults: () => ({
    before: { media: null, alt: '', label: '' },
    after: { media: null, alt: '', label: '' },
    start: 50,
    caption: '',
  }),
  toPlainText: (props) => joinPlain([props.before.label, props.after.label, props.caption]),
  media: (props) => [...present(props.before.media), ...present(props.after.media)],
  check: (props, { node }) => {
    const issues: Issue[] = [];
    for (const side of ['before', 'after'] as const) {
      if (!props[side].media)
        issues.push(warning('media.missing', { nodeId: node.id, path: `${side}.media` }));
      else if (!props[side].alt.trim()) issues.push(altIssue(node.id, `${side}.alt`));
    }
    return issues;
  },
});

export const mediaTextElement = defineElement({
  type: 'media-text',
  version: 1,
  category: 'media',
  icon: 'layout-panel-left',
  keywords: ['image and text', 'side by side', 'feature'],
  schema: z.object({
    media: media(),
    alt: shortText(),
    side: z.enum(['start', 'end']),
    ratio: z.enum(['1-1', '1-2', '2-1']),
    title: shortText(),
    text: richText(),
    verticalAlign: z.enum(['start', 'center']),
  }),
  defaults: () => ({
    media: null,
    alt: '',
    side: 'start' as const,
    ratio: '1-1' as const,
    title: '',
    text: [] as RichText,
    verticalAlign: 'center' as const,
  }),
  toPlainText: (props) => joinPlain([props.title, props.text]),
  links: (props) => joinLinks([props.text]),
  media: (props) => present(props.media),
  check: (props, { node }) => (props.media && !props.alt.trim() ? [altIssue(node.id)] : []),
});

export const videoElement = defineElement({
  type: 'video',
  version: 1,
  category: 'media',
  icon: 'video',
  keywords: ['movie', 'clip', 'mp4', 'film'],
  schema: z.object({
    media: media(),
    poster: media(),
    title: shortText(),
    caption: shortText(),
    loop: z.boolean(),
    muted: z.boolean(),
  }),
  defaults: () => ({
    media: null,
    poster: null,
    title: '',
    caption: '',
    loop: false,
    muted: false,
  }),
  toPlainText: (props) => joinPlain([props.title, props.caption]),
  media: (props) => [...present(props.media), ...present(props.poster)],
  check: (props, { node }) =>
    props.media ? [] : [warning('media.missing', { nodeId: node.id, path: 'media' })],
});

export const audioElement = defineElement({
  type: 'audio',
  version: 1,
  category: 'media',
  icon: 'audio-lines',
  keywords: ['sound', 'podcast', 'mp3', 'music'],
  schema: z.object({ media: media(), title: shortText(), caption: shortText() }),
  defaults: () => ({ media: null, title: '', caption: '' }),
  toPlainText: (props) => joinPlain([props.title, props.caption]),
  media: (props) => present(props.media),
  check: (props, { node }) =>
    props.media ? [] : [warning('media.missing', { nodeId: node.id, path: 'media' })],
});

export const embedElement = defineElement({
  type: 'embed',
  version: 1,
  category: 'media',
  icon: 'square-play',
  keywords: ['youtube', 'vimeo', 'twitter', 'x', 'instagram', 'tiktok', 'spotify', 'map', 'iframe'],
  schema: z.object({
    url: z.string().max(2000),
    provider: z.enum(EMBED_PROVIDERS).nullable(),
    title: shortText(),
    caption: shortText(),
  }),
  defaults: () => ({ url: '', provider: null, title: '', caption: '' }),
  toPlainText: (props) => joinPlain([props.title, props.caption]),
  check: (props, { node }) => {
    if (!props.url.trim()) return [warning('embed.missing', { nodeId: node.id, path: 'url' })];
    const provider = detectEmbedProvider(props.url);
    if (!provider) return [error('embed.notAllowed', { nodeId: node.id, path: 'url' })];
    if (provider !== props.provider)
      return [error('embed.providerMismatch', { nodeId: node.id, path: 'url' })];
    return [];
  },
});

export const fileElement = defineElement({
  type: 'file',
  version: 1,
  category: 'media',
  icon: 'file-down',
  keywords: ['download', 'attachment', 'pdf', 'document'],
  schema: z.object({ media: media(), label: shortText(), description: shortText() }),
  defaults: () => ({ media: null, label: '', description: '' }),
  toPlainText: (props) => joinPlain([props.label, props.description]),
  media: (props) => present(props.media),
  check: (props, { node }) =>
    props.media ? [] : [warning('media.missing', { nodeId: node.id, path: 'media' })],
});

export const mediaElements = [
  imageElement,
  galleryElement,
  beforeAfterElement,
  mediaTextElement,
  videoElement,
  audioElement,
  embedElement,
  fileElement,
] as const;
