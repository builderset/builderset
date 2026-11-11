'use client';

import type { ElementRegistry } from '@motors/builder-core';
import { createContext, useContext, type ReactNode } from 'react';
import { useStore } from 'zustand';

import type { BuilderHost } from './host';
import type { EditorProfile } from './profile';
import type { EditorMessages } from './messages';
import type { EditorActions, EditorState, EditorStore } from './store';

/**
 * What every part of the editor reads: the store, the element registry, the
 * host adapter and the words. One context rather than four, because they are
 * created together and never change independently.
 */
export interface EditorContextValue {
  store: EditorStore;
  registry: ElementRegistry;
  host: BuilderHost;
  messages: EditorMessages;
  /** Article-level facts the settings panel shows but the document does not hold. */
  article: ArticleFacts;
  /** Changes to those facts, kept by the host (they are row columns, not document). */
  setArticle: (patch: Partial<ArticleFacts>) => void;
  /** What kind of document this editor edits — see `EditorProfile`. */
  profile: EditorProfile;
}

/** The row's own columns — what the document settings edit beside `meta`. */
export interface ArticleFacts {
  slug: string;
  status: string;
  category: string;
  categories: string[];
  featured: boolean;
  scheduledAt: string | null;
  publishedAt: string | null;
  locale: string;
}

const EditorContext = createContext<EditorContextValue | null>(null);

export function EditorProvider({
  value,
  children,
}: {
  value: EditorContextValue;
  children: ReactNode;
}) {
  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

export function useEditorContext(): EditorContextValue {
  const value = useContext(EditorContext);
  if (!value) throw new Error('The builder components must be rendered inside <BuilderEditor>.');
  return value;
}

/** A slice of the editor state. Re-renders only when the slice changes. */
export function useEditor<T>(selector: (state: EditorState & EditorActions) => T): T {
  return useStore(useEditorContext().store, selector);
}

export function useProfile(): EditorProfile {
  return useEditorContext().profile;
}

export function useMessages(): EditorMessages {
  return useEditorContext().messages;
}
