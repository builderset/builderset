'use client';

import {
  useEditor,
  useRecord,
  type EditorActions,
  type EditorState,
  type RecordFacts,
} from '@builderset/engine/editor';

import type { ArticleDocument } from '../core';

/**
 * The row's own columns that every article has — what the document settings
 * show beside `meta`. A project's other columns (a category, a "featured"
 * flag) go in the same record and are edited in its `settingsSections`.
 */
export interface ArticleFacts extends RecordFacts {
  slug: string;
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
