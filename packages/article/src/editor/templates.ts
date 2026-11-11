import { rt } from '@motors/engine';
import type { TemplateSpec } from '@motors/engine/editor';

/** The article's starting layouts: the left rail's templates, above the saved sections. */
export const ARTICLE_TEMPLATES: readonly TemplateSpec[] = [
  {
    id: 'standard',
    name: { en: 'Standard article', sq: 'Artikull standard', de: 'Standardartikel' },
    blocks: [
      { type: 'paragraph', props: { lead: true } },
      { type: 'heading', props: { level: 2 } },
      { type: 'paragraph' },
      { type: 'image' },
      { type: 'heading', props: { level: 2 } },
      { type: 'paragraph' },
      { type: 'takeaways' },
    ],
  },
  {
    id: 'howto',
    name: { en: 'How-to guide', sq: 'Udhëzues', de: 'Anleitung' },
    blocks: [
      { type: 'paragraph', props: { lead: true } },
      { type: 'toc' },
      { type: 'howto' },
      { type: 'callout', props: { tone: 'tip' } },
      { type: 'faq' },
    ],
  },
  {
    id: 'listicle',
    name: { en: 'Listicle', sq: 'Listë', de: 'Liste' },
    blocks: [
      { type: 'paragraph', props: { lead: true } },
      { type: 'heading', props: { level: 2, text: rt('1.') } },
      { type: 'paragraph' },
      { type: 'heading', props: { level: 2, text: rt('2.') } },
      { type: 'paragraph' },
      { type: 'heading', props: { level: 2, text: rt('3.') } },
      { type: 'paragraph' },
      { type: 'cta' },
    ],
  },
  {
    id: 'review',
    name: { en: 'Review', sq: 'Recension', de: 'Test' },
    blocks: [
      { type: 'paragraph', props: { lead: true } },
      { type: 'gallery' },
      { type: 'rating' },
      { type: 'pros-cons' },
      { type: 'stats' },
      { type: 'heading', props: { level: 2 } },
      { type: 'paragraph' },
    ],
  },
  {
    id: 'news',
    name: { en: 'News', sq: 'Lajm', de: 'Nachricht' },
    blocks: [
      { type: 'paragraph', props: { lead: true } },
      { type: 'image' },
      { type: 'paragraph' },
      { type: 'quote' },
      { type: 'paragraph' },
      { type: 'related' },
    ],
  },
];
