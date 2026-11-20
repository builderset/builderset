import { rt, type RichText } from '@builderset/engine';
import type { TemplateBlock } from '@builderset/engine/editor';

/*
 * Small builders for template blocks, so a template file reads as the
 * article it lays out. Each gives only the props that differ from the
 * element's defaults; the editor fills in the rest, and checks them against
 * the element's schema, when the template is used (`templates.test.ts` does
 * the same for every template).
 *
 * The words are prompts for the writer — what goes here — in English.
 */

const text = (value: string): RichText => rt(value);

export const heading = (value: string, level: 2 | 3 = 2): TemplateBlock => ({
  type: 'heading',
  props: { level, text: text(value) },
});

/** The opening paragraph, set larger. */
export const lead = (value: string): TemplateBlock => ({
  type: 'paragraph',
  props: { lead: true, text: text(value) },
});

export const paragraph = (value: string): TemplateBlock => ({
  type: 'paragraph',
  props: { text: text(value) },
});

export const list = (
  items: readonly string[],
  style: 'bullet' | 'number' | 'check' = 'bullet',
): TemplateBlock => ({
  type: 'list',
  props: { style, items: items.map((item) => ({ text: text(item) })) },
});

export const quote = (value: string, cite = ''): TemplateBlock => ({
  type: 'quote',
  props: { text: text(value), cite },
});

export const pullQuote = (value: string): TemplateBlock => ({
  type: 'pull-quote',
  props: { text: value },
});

export const callout = (
  tone: 'info' | 'tip' | 'success' | 'warning' | 'danger',
  title: string,
  value: string,
): TemplateBlock => ({
  type: 'callout',
  props: { tone, title, text: text(value) },
});

export const image = (caption = ''): TemplateBlock => ({
  type: 'image',
  props: caption ? { caption: text(caption) } : {},
});

export const gallery = (): TemplateBlock => ({ type: 'gallery' });

export const divider = (): TemplateBlock => ({ type: 'divider' });

export const toc = (title = 'In this article'): TemplateBlock => ({
  type: 'toc',
  props: { title },
});

export const takeaways = (title: string, items: readonly string[]): TemplateBlock => ({
  type: 'takeaways',
  props: { title, items: items.map(text) },
});

export const faq = (
  title: string,
  items: readonly (readonly [string, string])[],
): TemplateBlock => ({
  type: 'faq',
  props: {
    title,
    items: items.map(([question, answer]) => ({ question, answer: text(answer) })),
  },
});

export const howto = (
  title: string,
  totalMinutes: number,
  steps: readonly (readonly [string, string])[],
): TemplateBlock => ({
  type: 'howto',
  props: {
    title,
    totalMinutes,
    steps: steps.map(([stepTitle, value]) => ({
      title: stepTitle,
      text: text(value),
      media: null,
      alt: '',
    })),
  },
});

export const timeline = (items: readonly (readonly [string, string, string])[]): TemplateBlock => ({
  type: 'timeline',
  props: {
    items: items.map(([date, title, value]) => ({ date, title, text: text(value) })),
  },
});

export const definitions = (items: readonly (readonly [string, string])[]): TemplateBlock => ({
  type: 'definitions',
  props: { items: items.map(([term, value]) => ({ term, description: text(value) })) },
});

export const table = (
  header: readonly string[],
  rows: readonly (readonly string[])[],
): TemplateBlock => ({
  type: 'table',
  props: {
    rows: [header, ...rows].map((row) => row.map(text)),
    headerRow: true,
    align: header.map(() => 'start'),
  },
});

export const prosCons = (pros: readonly string[], cons: readonly string[]): TemplateBlock => ({
  type: 'pros-cons',
  props: { prosTitle: 'What we liked', consTitle: 'What could be better', pros, cons },
});

export const stats = (items: readonly (readonly [string, string])[]): TemplateBlock => ({
  type: 'stats',
  props: {
    items: items.map(([value, label]) => ({ value, label, trend: 'none', note: '' })),
  },
});

export const rating = (itemName: string, score: number, summary: string): TemplateBlock => ({
  type: 'rating',
  props: { title: 'Our verdict', itemName, score, scale: 5, summary: text(summary) },
});

export const author = (): TemplateBlock => ({ type: 'author' });

export const cta = (title: string, value: string, label: string): TemplateBlock => ({
  type: 'cta',
  props: {
    title,
    text: text(value),
    buttons: [{ label, href: '/', variant: 'primary', icon: 'arrow-right', newTab: false }],
  },
});

export const related = (title = 'Keep reading'): TemplateBlock => ({
  type: 'related',
  props: { title },
});

export const newsletter = (title: string, value: string, button: string): TemplateBlock => ({
  type: 'newsletter',
  props: { title, text: text(value), button },
});

export const disclaimer = (value: string): TemplateBlock => ({
  type: 'disclaimer',
  props: { text: text(value) },
});
