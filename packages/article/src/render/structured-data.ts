import {
  plainText,
  richTextToPlain,
  walk,
  type ElementRegistry,
  type RichText,
} from '@motors/engine';
import type { ArticleDocument } from '../core/document';

/**
 * Schema.org data for an article, as plain objects.
 *
 * The HOST writes them into the page — `<script type="application/ld+json">`
 * with its own escaping — so this package never produces HTML. `Article` is
 * always there; `FAQPage`, `HowTo` and `Review` are added when the document
 * holds a FAQ, a how-to or a rating, which is what earns those rich results.
 */

export interface StructuredDataOptions {
  url: string;
  resolveMedia: (key: string) => string;
  locale?: string | undefined;
  datePublished?: string | null | undefined;
  dateModified?: string | null | undefined;
  authorName?: string | null | undefined;
  publisherName?: string | null | undefined;
  publisherLogo?: string | null | undefined;
}

type JsonLd = Record<string, unknown>;

export function structuredData(
  document: ArticleDocument,
  registry: ElementRegistry,
  options: StructuredDataOptions,
): JsonLd[] {
  const { meta } = document;
  const image = meta.seo?.image ?? meta.cover?.media;
  const article: JsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: (meta.seo?.title ?? meta.title).slice(0, 110),
    description: meta.seo?.description ?? meta.excerpt ?? undefined,
    mainEntityOfPage: options.url,
    inLanguage: options.locale,
    ...(image ? { image: [options.resolveMedia(image.key)] } : {}),
    ...(options.datePublished ? { datePublished: options.datePublished } : {}),
    ...(options.dateModified ? { dateModified: options.dateModified } : {}),
    ...(options.authorName ? { author: { '@type': 'Person', name: options.authorName } } : {}),
    ...(options.publisherName
      ? {
          publisher: {
            '@type': 'Organization',
            name: options.publisherName,
            ...(options.publisherLogo
              ? { logo: { '@type': 'ImageObject', url: options.publisherLogo } }
              : {}),
          },
        }
      : {}),
    wordCount: plainText(document, registry).split(/\s+/).filter(Boolean).length,
  };

  const out: JsonLd[] = [article];
  walk(document, (node) => {
    if (node.hidden) return false;
    const props = node.props;
    if (node.type === 'faq') {
      const items = (props.items as { question: string; answer: RichText }[]).filter(
        (item) => item.question.trim() && richTextToPlain(item.answer).trim(),
      );
      if (items.length) {
        out.push({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: items.map((item) => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: { '@type': 'Answer', text: richTextToPlain(item.answer) },
          })),
        });
      }
    }
    if (node.type === 'howto') {
      const steps = props.steps as {
        title: string;
        text: RichText;
        media: { key: string } | null;
      }[];
      out.push({
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name: typeof props.title === 'string' && props.title ? props.title : meta.title,
        ...((props.totalMinutes as number) > 0
          ? { totalTime: `PT${String(props.totalMinutes)}M` }
          : {}),
        step: steps.map((step, index) => ({
          '@type': 'HowToStep',
          position: index + 1,
          name: step.title,
          text: richTextToPlain(step.text),
          ...(step.media ? { image: options.resolveMedia(step.media.key) } : {}),
        })),
      });
    }
    if (node.type === 'rating' && (props.itemName as string).trim()) {
      out.push({
        '@context': 'https://schema.org',
        '@type': 'Review',
        itemReviewed: { '@type': 'Thing', name: props.itemName },
        reviewRating: {
          '@type': 'Rating',
          ratingValue: props.score,
          bestRating: props.scale,
          worstRating: 0,
        },
        ...(options.authorName ? { author: { '@type': 'Person', name: options.authorName } } : {}),
        reviewBody: richTextToPlain(props.summary as RichText) || undefined,
      });
    }
    return undefined;
  });
  return out;
}

/**
 * JSON for inside a `<script>` tag: `<`, `>` and `&` escaped as unicode so a
 * value containing `</script>` cannot end the tag early.
 */
export function jsonLdString(data: JsonLd | JsonLd[]): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}
