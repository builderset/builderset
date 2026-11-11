'use client';

import type { ElementRegistry } from '@motors/engine';
import { BuilderEditor, type BuilderHost, type EditorMessages } from '@motors/engine/editor';
import { useMemo } from 'react';

import { createArticleRegistry, type ArticleDocument } from '../core';
import type { ArticleFacts } from './hooks';
import { articleProfile } from './profile';

export interface ArticleEditorProps {
  document: ArticleDocument;
  host: BuilderHost<ArticleDocument>;
  /** Defaults to `createArticleRegistry()`. */
  registry?: ElementRegistry | undefined;
  record: ArticleFacts;
  onRecordChange: (patch: Partial<ArticleFacts>) => void;
  onBack: () => void;
  onDuplicate?: (() => void) | undefined;
  onDelete?: (() => Promise<boolean>) | undefined;
  messages?: Partial<EditorMessages> | undefined;
  /** Where the crash-safety copy is kept in localStorage; omit to disable. */
  storageKey?: string | undefined;
  /** When the server copy was last saved — a local copy newer than this is offered back. */
  savedAt?: string | null | undefined;
}

/** The article builder: the shared editor with the article profile. */
export function ArticleEditor({ registry: given, host, ...props }: ArticleEditorProps) {
  const registry = useMemo(() => given ?? createArticleRegistry(), [given]);
  const profile = useMemo(
    () =>
      articleProfile({
        registry,
        resolveMedia: (key) => host.resolveMedia(key),
        contentLocale: host.contentLocale,
      }),
    [registry, host],
  );
  return <BuilderEditor {...props} registry={registry} host={host} profile={profile} />;
}
