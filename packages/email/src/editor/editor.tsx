'use client';

import type { ElementRegistry } from '@builderset/engine';
import {
  BuilderEditor,
  resolveMessages,
  useHtmlLang,
  type BuilderHost,
  type EditorMessages,
  type RecordFacts,
} from '@builderset/engine/editor';
import type { EmailDocument, EmailType } from '../core';
import type { BrandKit } from '../render';
import { useMemo } from 'react';

import { EmailProvider } from './context';
import { en } from '../locales/en';
import type { EmailLocale, EmailMessages, EmailWords } from './messages';
import { emailProfile } from './profile';

export interface EmailEditorProps {
  /**
   * The design to edit. Read once, when the editor mounts: to load another,
   * remount it (a new `key`).
   */
  document: EmailDocument;
  /** The blocks a design can hold — usually `createEmailRegistry()`. */
  registry: ElementRegistry;
  /** The adapter for everything that leaves the browser: saving, publishing, uploads, media URLs, notices. */
  host: BuilderHost<EmailDocument>;
  /** The email type this template is for: its variables and samples. */
  type: EmailType | null;
  /** The brand kit the design's `brand.*` colours, its logo and the footer's address come from. */
  brand: BrandKit;
  /** The public site, where the social block's icons are served from. */
  socialIconBase?: string | undefined;
  /** `status: 'published'` means the design is the ACTIVE one. */
  record: RecordFacts;
  /**
   * Called with the facts the writer changed in the editor. Keep them and pass
   * the updated record back as `record`; the change also counts as unsaved work.
   */
  onRecordChange?: ((patch: Partial<RecordFacts>) => void) | undefined;
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
  /** Other languages, by code: `{ sq }` from `@builderset/email/locales/sq`. English is built in. */
  locales?: Readonly<Record<string, EmailLocale | undefined>> | undefined;
  /** Replace single words, in whatever language is active. */
  messages?: EmailMessages | undefined;
  /** The languages a design can be written in. One: no language switch. */
  contentLocales?: readonly string[] | undefined;
  /** The language a new design is written in. Default: the first of `contentLocales`. */
  defaultContentLocale?: string | undefined;
  /** Where the crash-safety copy is kept in localStorage; omit to disable. */
  storageKey?: string | undefined;
  /** When the server copy was last saved — a local copy newer than this is offered back. */
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
