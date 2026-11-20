'use client';

import './kit-article.css';

import {
  createArticleRegistry,
  kitchenSinkDocument,
  type ArticleDocument,
} from '@builderset/article';
import { ArticleEditor } from '@builderset/article/editor';
import { createMemoryHost } from '@builderset/article/host';
import { useMemo } from 'react';

import { DRAFT, resolveMedia, useReady, type HeroKitProps } from './hero-ready';

const registry = createArticleRegistry();
const RECORD = { ...DRAFT, slug: 'a-tour-of-the-editor', locale: 'en' };

/** The real article editor with the kit's richest sample — shown, not used. */
export default function HeroArticle({ onReady }: HeroKitProps) {
  const { document, host } = useMemo(() => {
    const start = kitchenSinkDocument(registry);
    const memory = createMemoryHost<ArticleDocument>({ document: start });
    return { document: start, host: { ...memory, resolveMedia } };
  }, []);
  useReady(onReady);
  return (
    <ArticleEditor
      document={document}
      registry={registry}
      host={host}
      record={RECORD}
      onRecordChange={() => undefined}
      theme="auto"
      className="h-full"
      fontPreviews={false}
      onBack={() => undefined}
    />
  );
}
