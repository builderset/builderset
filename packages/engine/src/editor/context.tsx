'use client';

import type { ElementRegistry, EngineDocument } from '../core';
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
 *
 * The workspace is generic over the document type; a kit reads its own with
 * the type parameter (`useEditor<string, EmailDocument>(…)`,
 * `useEditorContext<ArticleDocument>()`), and `BuilderEditor` is what ties the
 * two together, so the parameter is always the type the editor was given.
 */
export interface EditorContextValue<TDoc extends EngineDocument = EngineDocument> {
  store: EditorStore<TDoc>;
  registry: ElementRegistry;
  host: BuilderHost<TDoc>;
  messages: EditorMessages;
  /** The editor's own language, resolved (`'auto'` has become `<html lang>`). */
  locale: string;
  /** The languages a document can be written in; one means no language switch. */
  contentLocales: readonly string[];
  /** The language a new document's tree is written in. */
  defaultContentLocale: string;
  /** The stored record's own facts the top bar shows; the document does not hold them. */
  record: RecordFacts;
  /** Changes to the record's facts, kept by the host (they are row columns, not document). */
  setRecord: (patch: Partial<RecordFacts>) => void;
  /** What kind of document this editor edits — see `EditorProfile`. */
  profile: EditorProfile<TDoc>;
}

/** What the top bar shows for any stored document: where it is in publishing. */
export interface RecordFacts {
  status: string;
  scheduledAt: string | null;
  publishedAt: string | null;
}

const EditorContext = createContext<EditorContextValue | null>(null);

export function EditorProvider<TDoc extends EngineDocument>({
  value,
  children,
}: {
  value: EditorContextValue<TDoc>;
  children: ReactNode;
}) {
  // One context for every document type: the value is stored with the type
  // erased and read back with it by `useEditorContext<TDoc>()`.
  return (
    <EditorContext.Provider value={value as unknown as EditorContextValue}>
      {children}
    </EditorContext.Provider>
  );
}

export function useEditorContext<
  TDoc extends EngineDocument = EngineDocument,
>(): EditorContextValue<TDoc> {
  const value = useContext(EditorContext);
  if (!value) throw new Error('The builder components must be rendered inside <BuilderEditor>.');
  // The provider holds the value `BuilderEditor<TDoc>` built; the parameter names that type.
  return value as unknown as EditorContextValue<TDoc>;
}

/** A slice of the editor state. Re-renders only when the slice changes. */
export function useEditor<T, TDoc extends EngineDocument = EngineDocument>(
  selector: (state: EditorState<TDoc> & EditorActions<TDoc>) => T,
): T {
  return useStore(useEditorContext<TDoc>().store, selector);
}

export function useProfile<TDoc extends EngineDocument = EngineDocument>(): EditorProfile<TDoc> {
  return useEditorContext<TDoc>().profile;
}

export function useMessages(): EditorMessages {
  return useEditorContext().messages;
}

/**
 * The record's facts as the kit knows them (`ArticleFacts`), and a setter.
 * The host passed them to `BuilderEditor`; this reads them back with the type
 * the kit gave them.
 */
export function useRecord<T extends RecordFacts = RecordFacts>(): [T, (patch: Partial<T>) => void] {
  const { record, setRecord } = useEditorContext();
  return [record as T, setRecord];
}
