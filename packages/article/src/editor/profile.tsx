'use client';

import type { ElementRegistry } from '@motors/engine';
import { pickLocale, type EditorProfile } from '@motors/engine/editor';

import { ARTICLE_CATEGORIES, checkArticle, parseArticle, type ArticleDocument } from '../core';
import { renderDocument, type RenderMessages } from '../render';
import { DocumentSettings } from './document-settings';
import { ARTICLE_TEMPLATES } from './templates';
import { TitleField } from './title-field';

export interface ArticleProfileOptions {
  registry: ElementRegistry;
  /** Storage key → URL, for the canvas. */
  resolveMedia: (key: string) => string;
  /** The language the article is written in: the canvas reads in it unless another is being written. */
  contentLocale: string;
  /** The renderer's words by language code, for the language being drawn. English when missing. */
  renderWords?: Readonly<Record<string, RenderMessages | undefined>> | undefined;
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
}: ArticleProfileOptions): EditorProfile<ArticleDocument> {
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
    canvasFrame: 'page',
    canvasHeader: TitleField,
    settingsPanel: DocumentSettings,
    templates: ARTICLE_TEMPLATES,
    check: (doc) => checkArticle(doc, registry),
    parse: (raw) => {
      const parsed = parseArticle(raw, registry);
      return parsed.ok ? parsed.doc : null;
    },
    categories: ARTICLE_CATEGORIES,
    paragraphType: 'paragraph',
    titleOf: (doc) => doc.meta.title,
  };
}
