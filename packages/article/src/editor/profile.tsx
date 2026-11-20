'use client';

import type { ElementRegistry } from '@builderset/engine';
import { pickLocale, type EditorProfile } from '@builderset/engine/editor';

import {
  ARTICLE_CATEGORIES,
  checkArticle,
  kitchenSinkDocument,
  parseArticle,
  type ArticleDocument,
} from '../core';
import { renderDocument, type RenderMessages } from '../render';
import { DocumentSettings } from './document-settings';
import { ARTICLE_TEMPLATE_CATEGORIES, ARTICLE_TEMPLATES } from '../templates';
import { TitleField } from './title-field';

export interface ArticleProfileOptions {
  registry: ElementRegistry;
  /** Storage key → URL, for the canvas. */
  resolveMedia: (key: string) => string;
  /** The language the article is written in: the canvas reads in it unless another is being written. */
  contentLocale: string;
  /** The renderer's words by language code, for the language being drawn. English when missing. */
  renderWords?: Readonly<Record<string, RenderMessages | undefined>> | undefined;
  /** The languages an article may be written in; others block publishing. */
  contentLocales?: readonly string[] | undefined;
}

/**
 * The article editor: the canvas is the public site's renderer in editing
 * mode on a page with the title above it, the settings are the article's
 * General, SEO and Publishing, and publishing is blocked by `checkArticle`.
 */
export function articleProfile({
  registry,
  resolveMedia,
  contentLocale,
  renderWords,
  contentLocales,
}: ArticleProfileOptions): EditorProfile<ArticleDocument> {
  // Every element filled in: where the library's peek takes its samples from.
  let sink: ArticleDocument | null = null;
  return {
    renderCanvas: ({ doc, editText, locale }) => {
      const drawn = locale ?? contentLocale;
      return renderDocument(doc, registry, {
        editing: true,
        resolveMedia,
        locale: drawn,
        messages: pickLocale(drawn, renderWords),
        editText,
      });
    },
    renderPreview: ({ doc, locale }) => {
      const drawn = locale ?? contentLocale;
      return renderDocument(doc, registry, {
        editing: false,
        resolveMedia,
        locale: drawn,
        messages: pickLocale(drawn, renderWords),
      });
    },
    sampleOf: (type) => {
      sink ??= kitchenSinkDocument(registry);
      const sample = sink;
      const id = Object.keys(sample.nodes).find((key) => sample.nodes[key]?.type === type);
      const root = sample.nodes[sample.root];
      if (!id || !root) return null;
      const nodes: ArticleDocument['nodes'] = {};
      const collect = (key: string) => {
        const node = sample.nodes[key];
        if (!node) return;
        nodes[key] = node;
        node.children?.forEach(collect);
      };
      collect(id);
      nodes[sample.root] = { ...root, children: [id] };
      return { ...sample, nodes };
    },
    canvasFrame: 'page',
    canvasHeader: TitleField,
    settingsPanel: DocumentSettings,
    templates: ARTICLE_TEMPLATES,
    templateCategories: ARTICLE_TEMPLATE_CATEGORIES,
    check: (doc) => checkArticle(doc, registry, { locales: contentLocales }),
    parse: (raw) => {
      const parsed = parseArticle(raw, registry);
      return parsed.ok ? parsed.doc : null;
    },
    categories: ARTICLE_CATEGORIES,
    paragraphType: 'paragraph',
    titleOf: (doc) => doc.meta.title,
  };
}
