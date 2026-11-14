'use client';

import type { ElementRegistry } from '@builderset/engine';
import {
  BuilderEditor,
  resolveMessages,
  useHtmlLang,
  type BuilderHost,
  type EditorMessages,
} from '@builderset/engine/editor';
import { useMemo } from 'react';

import { createArticleRegistry, type ArticleDocument } from '../core';
import type { RenderMessages } from '../render';
import { en } from '../locales/en';
import type { ArticleFacts } from './hooks';
import { articleProfile } from './profile';
import { ArticleSettingsProvider, type SettingsSection } from './settings';
import { ArticleWordsProvider, type ArticleLocale, type ArticleMessages } from './words';

export interface ArticleEditorProps {
  /**
   * The article to edit. Read once, when the editor mounts: to load another,
   * remount it (a new `key`).
   */
  document: ArticleDocument;
  /** The adapter for everything that leaves the browser: saving, publishing, uploads, media URLs, notices. */
  host: BuilderHost<ArticleDocument>;
  /** Defaults to `createArticleRegistry()`. */
  registry?: ElementRegistry | undefined;
  /** The stored row's facts — status, schedule, slug, language — shown and edited beside the article. */
  record: ArticleFacts;
  /**
   * Called with the facts the writer changed (the slug, a project's own
   * fields). Keep them and pass the updated record back as `record`.
   */
  onRecordChange: (patch: Partial<ArticleFacts>) => void;
  /**
   * Called to leave the editor (the back button). With unsaved changes the
   * writer is asked first; the editor does not navigate by itself.
   */
  onBack: () => void;
  /** Adds "Duplicate" to the publish menu; called when the writer picks it. */
  onDuplicate?: (() => void) | undefined;
  /**
   * Adds "Delete" to the publish menu; called once the writer confirms. Resolve
   * `true` once it is deleted; leaving the editor afterwards is up to the host.
   */
  onDelete?: (() => Promise<boolean>) | undefined;
  /** The editor's own language. `'auto'` follows `<html lang>`. Default: `'en'`. */
  locale?: string | undefined;
  /** Other languages, by code: `{ sq }` from `@builderset/article/locales/sq`. English is built in. */
  locales?: Readonly<Record<string, ArticleLocale | undefined>> | undefined;
  /** Replace single words, in whatever language is active. */
  messages?: ArticleMessages | undefined;
  /** The languages an article can be written in. One: no language switch. */
  contentLocales?: readonly string[] | undefined;
  /** The language a new article is written in. Default: the first of `contentLocales`. */
  defaultContentLocale?: string | undefined;
  /** Where the crash-safety copy is kept in localStorage; omit to disable. */
  storageKey?: string | undefined;
  /** When the server copy was last saved — a local copy newer than this is offered back. */
  savedAt?: string | null | undefined;
  /** Where articles are published, for the slug and the search preview: `https://example.com/blog`. */
  siteUrl?: string | undefined;
  /** A project's own fields in Document settings, each in its tab and place. */
  settingsSections?: readonly SettingsSection[] | undefined;
}

/** The article builder: the shared editor with the article profile. */
export function ArticleEditor({
  registry: given,
  host,
  locale: requested,
  locales,
  messages,
  siteUrl,
  settingsSections,
  ...props
}: ArticleEditorProps) {
  const htmlLang = useHtmlLang();
  const locale = requested === 'auto' ? htmlLang : (requested ?? 'en');
  const words = useMemo(
    () => resolveMessages<ArticleLocale>(en, locale, locales, messages),
    [locale, locales, messages],
  );
  const editorMessages = useMemo<EditorMessages>(
    () => ({
      ...words.engine,
      ...words.workspace,
      elements: words.elements,
      categories: words.categories,
    }),
    [words],
  );
  // The canvas writes its few words (placeholders, "Contents") in the language
  // being written, as the site does — not in the editor's own.
  const renderWords = useMemo(() => {
    const byCode: Record<string, RenderMessages | undefined> = { en: en.render };
    for (const [code, entry] of Object.entries(locales ?? {})) byCode[code] = entry?.render;
    return byCode;
  }, [locales]);
  const defaultContentLocale = props.defaultContentLocale ?? props.contentLocales?.[0] ?? locale;
  const registry = useMemo(() => given ?? createArticleRegistry(), [given]);
  const profile = useMemo(
    () =>
      articleProfile({
        registry,
        resolveMedia: (key) => host.resolveMedia(key),
        contentLocale: defaultContentLocale,
        renderWords,
        contentLocales: props.contentLocales,
      }),
    [registry, host, defaultContentLocale, renderWords, props.contentLocales],
  );
  const settings = useMemo(() => ({ siteUrl, settingsSections }), [siteUrl, settingsSections]);
  return (
    <ArticleSettingsProvider value={settings}>
      <ArticleWordsProvider value={words.article}>
        <BuilderEditor
          {...props}
          defaultContentLocale={defaultContentLocale}
          locale={locale}
          messages={editorMessages}
          registry={registry}
          host={host}
          profile={profile}
        />
      </ArticleWordsProvider>
    </ArticleSettingsProvider>
  );
}
