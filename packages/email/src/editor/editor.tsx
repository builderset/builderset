'use client';

import type { ElementRegistry } from '@motors/engine';
import {
  BuilderEditor,
  resolveMessages,
  useHtmlLang,
  type BuilderHost,
  type EditorMessages,
  type RecordFacts,
} from '@motors/engine/editor';
import type { EmailDocument, EmailType } from '../core';
import type { BrandKit } from '../render';
import { useMemo } from 'react';

import { EmailProvider } from './context';
import { en } from '../locales/en';
import type { EmailLocale, EmailMessages, EmailWords } from './messages';
import { emailProfile } from './profile';

export interface EmailEditorProps {
  document: EmailDocument;
  registry: ElementRegistry;
  host: BuilderHost<EmailDocument>;
  /** The email type this template is for: its variables and samples. */
  type: EmailType | null;
  brand: BrandKit;
  /** The public site, where the social block's icons are served from. */
  socialIconBase?: string | undefined;
  /** `status: 'published'` means the design is the ACTIVE one. */
  record: RecordFacts;
  onRecordChange?: ((patch: Partial<RecordFacts>) => void) | undefined;
  onBack: () => void;
  onDuplicate?: (() => void) | undefined;
  onDelete?: (() => Promise<boolean>) | undefined;
  /** The editor's own language. `'auto'` follows `<html lang>`. Default: `'en'`. */
  locale?: string | undefined;
  /** Other languages, by code: `{ sq }` from `@motors/email/locales/sq`. English is built in. */
  locales?: Readonly<Record<string, EmailLocale | undefined>> | undefined;
  /** Replace single words, in whatever language is active. */
  messages?: EmailMessages | undefined;
  /** The languages a design can be written in. One: no language switch. */
  contentLocales?: readonly string[] | undefined;
  /** The language a new design is written in. Default: the first of `contentLocales`. */
  defaultContentLocale?: string | undefined;
  storageKey?: string | undefined;
  savedAt?: string | null | undefined;
}

/**
 * The email builder: the shared editor with the email profile — the email
 * canvas, its settings, structures, modules, variables and checks.
 */
export function EmailEditor({
  document,
  registry,
  host,
  type,
  brand,
  socialIconBase,
  record,
  onRecordChange,
  onBack,
  onDuplicate,
  onDelete,
  storageKey,
  savedAt,
  locale: requested,
  locales,
  messages,
  contentLocales,
  defaultContentLocale: requestedContentLocale,
}: EmailEditorProps) {
  const htmlLang = useHtmlLang();
  const locale = requested === 'auto' ? htmlLang : (requested ?? 'en');
  const resolved = useMemo(
    () => resolveMessages<EmailLocale>(en, locale, locales, messages),
    [locale, locales, messages],
  );
  const words = useMemo<EmailWords>(
    () => ({ email: resolved.email, importHtml: resolved.importHtml }),
    [resolved],
  );
  const editorMessages = useMemo<EditorMessages>(
    () => ({
      ...resolved.engine,
      ...resolved.workspace,
      elements: resolved.elements,
      categories: resolved.categories,
    }),
    [resolved],
  );
  const contentLocale = requestedContentLocale ?? contentLocales?.[0] ?? locale;
  const profile = useMemo(
    () =>
      emailProfile({
        registry,
        type,
        brand,
        assetUrl: (key) => host.resolveMedia(key),
        socialIconBase,
        locale: contentLocale,
        words,
        contentLocales,
      }),
    [registry, type, brand, host, words, socialIconBase, contentLocale, contentLocales],
  );
  const sample = type?.samples.default ?? Object.values(type?.samples ?? {})[0] ?? {};

  return (
    <EmailProvider value={{ type, brand, words, locale: contentLocale, sample }}>
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
      />
    </EmailProvider>
  );
}
