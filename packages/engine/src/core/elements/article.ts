import { z } from 'zod';

import { warning, type Issue } from '../issues';
import { LIMITS } from '../limits';
import { defineElement } from '../registry';
import { isRichTextEmpty, type RichText } from '../rich-text';
import { joinLinks, joinPlain, media, present, richText, safeUrl, shortText } from './fields';

/**
 * The elements that make a document an ARTICLE rather than a page: the
 * outline, the questions a reader brings, the steps they follow, the verdict
 * they came for, who wrote it and where to go next.
 *
 * Several of them emit structured data in the renderer (FAQ → `FAQPage`,
 * how-to → `HowTo`, rating → `Review`), which is why their fields are typed as
 * the schemas need them rather than as free text.
 */

const noItems = (nodeId: string, path = 'items'): Issue => warning('list.empty', { nodeId, path });

export const tocElement = defineElement({
  type: 'toc',
  version: 1,
  category: 'article',
  icon: 'list-tree',
  keywords: ['table of contents', 'outline', 'contents', 'navigation'],
  schema: z.object({
    title: shortText(),
    /** The deepest heading level listed. */
    depth: z.union([z.literal(2), z.literal(3), z.literal(4)]),
    numbered: z.boolean(),
    /** Follows the reader down the page on wide screens. */
    sticky: z.boolean(),
  }),
  defaults: () => ({ title: '', depth: 3 as const, numbered: false, sticky: false }),
  toPlainText: () => '',
});

export const faqElement = defineElement({
  type: 'faq',
  version: 1,
  category: 'article',
  icon: 'message-circle-question',
  keywords: ['questions', 'answers', 'q&a', 'accordion'],
  schema: z.object({
    title: shortText(),
    items: z.array(z.object({ question: shortText(), answer: richText() })).max(LIMITS.listItems),
    firstOpen: z.boolean(),
  }),
  defaults: () => ({
    title: '',
    items: [{ question: '', answer: [] as RichText }],
    firstOpen: true,
  }),
  toPlainText: (props) =>
    joinPlain([props.title, ...props.items.flatMap((item) => [item.question, item.answer])]),
  links: (props) => joinLinks(props.items.map((item) => item.answer)),
  check: (props, { node }) => {
    const issues: Issue[] = [];
    props.items.forEach((item, index) => {
      if (!item.question.trim() || isRichTextEmpty(item.answer)) {
        issues.push(warning('faq.incomplete', { nodeId: node.id, path: `items.${String(index)}` }));
      }
    });
    if (props.items.length === 0) issues.push(noItems(node.id));
    return issues;
  },
});

export const howToElement = defineElement({
  type: 'howto',
  version: 1,
  category: 'article',
  icon: 'list-ordered',
  keywords: ['steps', 'guide', 'tutorial', 'instructions', 'how to'],
  schema: z.object({
    title: shortText(),
    /** Total minutes the task takes, for `HowTo.totalTime`. 0 = not stated. */
    totalMinutes: z.number().int().min(0).max(10_000),
    steps: z
      .array(z.object({ title: shortText(), text: richText(), media: media(), alt: shortText() }))
      .max(LIMITS.listItems),
  }),
  defaults: () => ({
    title: '',
    totalMinutes: 0,
    steps: [{ title: '', text: [] as RichText, media: null, alt: '' }],
  }),
  toPlainText: (props) =>
    joinPlain([props.title, ...props.steps.flatMap((step) => [step.title, step.text])]),
  links: (props) => joinLinks(props.steps.map((step) => step.text)),
  media: (props) => props.steps.flatMap((step) => present(step.media)),
  check: (props, { node }) => {
    const issues: Issue[] = [];
    if (props.steps.length === 0) issues.push(noItems(node.id, 'steps'));
    props.steps.forEach((step, index) => {
      if (!step.title.trim()) {
        issues.push(
          warning('howto.stepUntitled', { nodeId: node.id, path: `steps.${String(index)}.title` }),
        );
      }
      if (step.media && !step.alt.trim()) {
        issues.push(
          warning('image.altMissing', { nodeId: node.id, path: `steps.${String(index)}.alt` }),
        );
      }
    });
    return issues;
  },
});

export const timelineElement = defineElement({
  type: 'timeline',
  version: 1,
  category: 'article',
  icon: 'milestone',
  keywords: ['history', 'events', 'dates', 'chronology', 'roadmap'],
  schema: z.object({
    items: z
      .array(z.object({ date: shortText(), title: shortText(), text: richText() }))
      .max(LIMITS.listItems),
  }),
  defaults: () => ({ items: [{ date: '', title: '', text: [] as RichText }] }),
  toPlainText: (props) =>
    joinPlain(props.items.flatMap((item) => [item.date, item.title, item.text])),
  links: (props) => joinLinks(props.items.map((item) => item.text)),
  check: (props, { node }) => (props.items.length === 0 ? [noItems(node.id)] : []),
});

export const prosConsElement = defineElement({
  type: 'pros-cons',
  version: 1,
  category: 'article',
  icon: 'scale',
  keywords: ['advantages', 'disadvantages', 'comparison', 'for and against'],
  schema: z.object({
    prosTitle: shortText(),
    consTitle: shortText(),
    pros: z.array(shortText()).max(LIMITS.listItems),
    cons: z.array(shortText()).max(LIMITS.listItems),
  }),
  defaults: () => ({ prosTitle: '', consTitle: '', pros: [''], cons: [''] }),
  toPlainText: (props) =>
    joinPlain([props.prosTitle, ...props.pros, props.consTitle, ...props.cons]),
  check: (props, { node }) =>
    [...props.pros, ...props.cons].every((line) => !line.trim()) ? [noItems(node.id, 'pros')] : [],
});

export const statsElement = defineElement({
  type: 'stats',
  version: 1,
  category: 'article',
  icon: 'chart-no-axes-column-increasing',
  keywords: ['numbers', 'figures', 'metrics', 'kpi', 'statistics'],
  schema: z.object({
    items: z
      .array(
        z.object({
          value: z.string().max(24),
          label: shortText(),
          trend: z.enum(['none', 'up', 'down']),
          note: shortText(),
        }),
      )
      .min(1)
      .max(4),
  }),
  defaults: () => ({
    items: [
      { value: '', label: '', trend: 'none' as const, note: '' },
      { value: '', label: '', trend: 'none' as const, note: '' },
      { value: '', label: '', trend: 'none' as const, note: '' },
    ],
  }),
  toPlainText: (props) =>
    joinPlain(props.items.flatMap((item) => [item.value, item.label, item.note])),
  check: (props, { node }) =>
    props.items.every((item) => !item.value.trim()) ? [noItems(node.id)] : [],
});

export const ratingElement = defineElement({
  type: 'rating',
  version: 1,
  category: 'article',
  icon: 'star',
  keywords: ['review', 'score', 'verdict', 'stars'],
  schema: z
    .object({
      title: shortText(),
      scale: z.union([z.literal(5), z.literal(10)]),
      score: z.number().min(0).max(10),
      summary: richText(),
      criteria: z.array(z.object({ label: shortText(), score: z.number().min(0).max(10) })).max(12),
      /** What is being reviewed — for `Review.itemReviewed`. */
      itemName: shortText(),
    })
    .refine(
      (rating) =>
        rating.score <= rating.scale && rating.criteria.every((c) => c.score <= rating.scale),
      {
        message: 'rating.aboveScale',
      },
    ),
  defaults: () => ({
    title: '',
    scale: 5 as const,
    score: 4,
    summary: [] as RichText,
    criteria: [] as { label: string; score: number }[],
    itemName: '',
  }),
  toPlainText: (props) =>
    joinPlain([props.title, props.summary, ...props.criteria.map((criterion) => criterion.label)]),
  links: (props) => joinLinks([props.summary]),
  check: (props, { node }) =>
    props.itemName.trim()
      ? []
      : [warning('rating.itemMissing', { nodeId: node.id, path: 'itemName' })],
});

export const authorElement = defineElement({
  type: 'author',
  version: 1,
  category: 'article',
  icon: 'user-round',
  keywords: ['bio', 'writer', 'about', 'profile', 'byline'],
  schema: z.object({
    name: shortText(),
    role: shortText(),
    avatar: media(),
    bio: richText(),
    links: z.array(z.object({ label: z.string().max(40), href: safeUrl() })).max(6),
  }),
  defaults: () => ({
    name: '',
    role: '',
    avatar: null,
    bio: [] as RichText,
    links: [] as { label: string; href: string }[],
  }),
  toPlainText: (props) => joinPlain([props.name, props.role, props.bio]),
  links: (props) => [...joinLinks([props.bio]), ...props.links.map((link) => link.href)],
  media: (props) => present(props.avatar),
  check: (props, { node }) =>
    props.name.trim() ? [] : [warning('author.nameMissing', { nodeId: node.id, path: 'name' })],
});

export const articleElements = [
  tocElement,
  faqElement,
  howToElement,
  timelineElement,
  prosConsElement,
  statsElement,
  ratingElement,
  authorElement,
] as const;
