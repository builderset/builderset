'use client';

import type { ElementRegistry, ThemeMode, ThemeTokens } from '@builderset/engine';
import {
  BuilderEditor,
  resolveMessages,
  useHtmlLang,
  type BuilderHost,
  type EditorMessages,
  type RecordFacts,
} from '@builderset/engine/editor';
import { useCallback, useMemo, useState } from 'react';

import { POPUP_FIELDS, type PopupDocument, type PopupField } from '../core';
import { en } from '../locales/en';
import { PopupProvider } from './context';
import type { PopupKitWords, PopupLocale, PopupMessages } from './messages';
import { popupProfile } from './profile';

export interface PopupEditorProps {
  /**
   * The popup to edit. Read once, when the editor mounts: to load another,
   * remount it (a new `key`).
   */
  document: PopupDocument;
  /** The elements a popup can hold — usually `createPopupRegistry()`. */
  registry: ElementRegistry;
  /** The adapter for everything that leaves the browser: saving, publishing, uploads, notices. */
  host: BuilderHost<PopupDocument>;
  /** `status: 'published'` means the popup is live. */
  record: RecordFacts;
  onRecordChange?: ((patch: Partial<RecordFacts>) => void) | undefined;
  /** Called to leave the editor (the back button). The editor does not navigate by itself. */
  onBack: () => void;
  onDuplicate?: (() => void) | undefined;
  onDelete?: (() => Promise<boolean>) | undefined;
  /** The variables your pages fill in, with an example each. Default: `POPUP_FIELDS`. */
  fields?: readonly PopupField[] | undefined;
  /** Colours offered first in every colour field (hex values): your brand's. */
  colors?: readonly { value: string; label: string; hex: string }[] | undefined;
  /** The editor's own language. `'auto'` follows `<html lang>`. Default: `'en'`. */
  locale?: string | undefined;
  /** Other languages, by code: `{ sq }` from `@builderset/popup/locales/sq`. English is built in. */
  locales?: Readonly<Record<string, PopupLocale | undefined>> | undefined;
  /** Replace single words, in whatever language is active. */
  messages?: PopupMessages | undefined;
  /** The languages a popup can be written in. One: no language switch. */
  contentLocales?: readonly string[] | undefined;
  defaultContentLocale?: string | undefined;
  /** Where the crash-safety copy is kept in localStorage; omit to disable. */
  storageKey?: string | undefined;
  savedAt?: string | null | undefined;
  theme?: ThemeMode | undefined;
  tokens?: ThemeTokens | undefined;
  className?: string | undefined;
}

/**
 * The popup builder: the shared editor with the popup profile — the popup on
 * a free canvas, its elements placed at their own x and y, its format,
 * display rules and motion, templates by purpose, and a preview on a page.
 */
export function PopupEditor({
  document,
  registry,
  host,
  record,
  onRecordChange,
  onBack,
  onDuplicate,
  onDelete,
  fields = POPUP_FIELDS,
  colors,
  storageKey,
  savedAt,
  theme,
  tokens,
  className,
  locale: requested,
  locales,
  messages,
  contentLocales,
  defaultContentLocale: requestedContentLocale,
}: PopupEditorProps) {
  const htmlLang = useHtmlLang();
  const locale = requested === 'auto' ? htmlLang : (requested ?? 'en');
  const resolved = useMemo(
    () => resolveMessages<PopupLocale>(en, locale, locales, messages),
    [locale, locales, messages],
  );
  const words = useMemo<PopupKitWords>(
    () => ({ popup: resolved.popup, visitor: resolved.visitor }),
    [resolved],
  );
  const editorMessages = useMemo<EditorMessages>(
    () => ({
      ...resolved.engine,
      ...resolved.workspace,
      issueText: { ...resolved.engine.issueText, ...resolved.workspace.issueText },
      fieldLabels: { ...resolved.engine.fieldLabels, ...resolved.workspace.fieldLabels },
      elements: resolved.elements,
      categories: resolved.categories,
    }),
    [resolved],
  );
  const contentLocale = requestedContentLocale ?? contentLocales?.[0] ?? locale;

  const [exampleData, setExampleData] = useState(false);
  const [guides, setGuides] = useState(true);
  const [replays, setReplays] = useState(0);
  const replay = useCallback(() => {
    setReplays((count) => count + 1);
  }, []);
  const assetUrl = useCallback((key: string) => host.resolveMedia(key), [host]);

  const profile = useMemo(
    () => popupProfile({ registry, words, fields, contentLocales, colors, assetUrl }),
    [registry, words, fields, contentLocales, colors, assetUrl],
  );

  return (
    <PopupProvider
      value={{
        words: words.popup,
        visitor: words.visitor,
        fields,
        exampleData,
        setExampleData,
        guides,
        setGuides,
        replays,
        replay,
        assetUrl,
      }}
    >
      <BuilderEditor
        document={document}
        registry={registry}
        host={host}
        record={record}
        onRecordChange={onRecordChange}
        onBack={onBack}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        storageKey={storageKey}
        savedAt={savedAt}
        locale={locale}
        messages={editorMessages}
        contentLocales={contentLocales}
        defaultContentLocale={contentLocale}
        profile={profile}
        theme={theme}
        tokens={tokens}
        className={className}
      />
    </PopupProvider>
  );
}
