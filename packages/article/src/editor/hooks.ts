'use client';

import {
  useEditor,
  useRecord,
  type EditorActions,
  type EditorState,
  type RecordFacts,
} from '@motors/engine/editor';

import type { ArticleDocument } from '../core';

/** The row's own columns — what the document settings edit beside `meta`. */
export interface ArticleFacts extends RecordFacts {
  slug: string;
  category: string;
  categories: string[];
  featured: boolean;
  locale: string;
}

/** A slice of the editor state, typed as an article. */
export function useArticle<T>(
  selector: (state: EditorState<ArticleDocument> & EditorActions<ArticleDocument>) => T,
): T {
  return useEditor<T, ArticleDocument>(selector);
}

/** The article's row facts and a setter that also marks the work unsaved. */
export function useArticleFacts(): [ArticleFacts, (patch: Partial<ArticleFacts>) => void] {
  return useRecord<ArticleFacts>();
}
