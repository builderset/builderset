'use client';

import type { DeepPartial, EditorMessages, ElementText } from '@builderset/engine/editor';
import { createContext, useContext } from 'react';

import type { RenderMessages } from '../render';

/** The article editor's own words: its document settings. */
export interface ArticleWords {
  publishing: string;
  nothingSelected: string;
  slug: string;
  slugFrozen: string;
  excerpt: string;
  coverAlt: string;
  seoTitle: string;
  seoDescription: string;
  canonical: string;
  noindex: string;
  noindexHint: string;
  focusKeyword: string;
  readingMinutes: string;
  readingMinutesHint: string;
}

/**
 * Everything the article kit says in one language — what a locale file
 * (`@builderset/article/locales/sq`) exports and `locales` takes.
 */
export interface ArticleLocale {
  code: string;
  /** The workspace's words (`@builderset/engine/locales/…`). */
  engine: EditorMessages;
  /** Workspace words the article editor says its own way: "Articles", "Untitled article". */
  workspace: Partial<EditorMessages>;
  /** The article elements' names and descriptions, by type. */
  elements: Record<string, ElementText>;
  /** The insert panel's groups, by category. */
  categories: Record<string, string>;
  article: ArticleWords;
  /** What the renderer writes on the page: "Contents", "Read next". */
  render: RenderMessages;
}

/** What a host may replace, in whatever language is active. */
export type ArticleMessages = DeepPartial<Omit<ArticleLocale, 'code'>>;

const ArticleWordsContext = createContext<ArticleWords | null>(null);
export const ArticleWordsProvider = ArticleWordsContext.Provider;

/** The article editor's words in the active language. */
export function useArticleWords(): ArticleWords {
  const words = useContext(ArticleWordsContext);
  if (!words) throw new Error('The article settings must be rendered inside <ArticleEditor>.');
  return words;
}
