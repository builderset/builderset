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
import { useCallback, useMemo, useRef, useState } from 'react';

import type { FormDocument } from '../core';
import { en } from '../locales/en';
import { FormProvider, type FormResponses } from './context';
import type { FormKitWords, FormLocale, FormMessages } from './messages';
import { formProfile } from './profile';

export interface FormEditorProps {
  /**
   * The form to edit. Read once, when the editor mounts: to load another,
   * remount it (a new `key`).
   */
  document: FormDocument;
  /** The fields a form can hold — usually `createFormRegistry()`. */
  registry: ElementRegistry;
  /** The adapter for everything that leaves the browser: saving, publishing, uploads, notices. */
  host: BuilderHost<FormDocument>;
  /** `status: 'published'` means the form is live. */
  record: RecordFacts;
  onRecordChange?: ((patch: Partial<RecordFacts>) => void) | undefined;
  /** Called to leave the editor (the back button). The editor does not navigate by itself. */
  onBack: () => void;
  onDuplicate?: (() => void) | undefined;
  onDelete?: (() => Promise<boolean>) | undefined;
  /** The editor's own language. `'auto'` follows `<html lang>`. Default: `'en'`. */
  locale?: string | undefined;
  /** Other languages, by code: `{ sq }` from `@builderset/form/locales/sq`. English is built in. */
  locales?: Readonly<Record<string, FormLocale | undefined>> | undefined;
  /** Replace single words, in whatever language is active. */
  messages?: FormMessages | undefined;
  /** The languages a form can be written in. One: no language switch. */
  contentLocales?: readonly string[] | undefined;
  defaultContentLocale?: string | undefined;
  /** Where the crash-safety copy is kept in localStorage; omit to disable. */
  storageKey?: string | undefined;
  savedAt?: string | null | undefined;
  theme?: ThemeMode | undefined;
  tokens?: ThemeTokens | undefined;
  className?: string | undefined;
  /**
   * The form's public address for a slug — `(slug) => \`https://example.com/f/${slug}\``.
   * Shows the address in the settings and adds "Share" to the top bar.
   */
  publicUrl?: ((slug: string) => string) | undefined;
  /** Fills the Responses tab: totals, how far people get, the latest responses. */
  loadResponses?: (() => Promise<FormResponses>) | undefined;
  /** Opens one response in the host's own screen. */
  onOpenResponse?: ((id: string) => void) | undefined;
  /** The template the form was made from, named in its locked fields' explanation. */
  templateName?: string | undefined;
}

/**
 * The form builder: the shared editor with the form profile — steps on the
 * canvas, fields with checks and logic, the form's settings, templates and
 * responses.
 */
export function FormEditor({
  document,
  registry,
  host,
  record,
  onRecordChange,
  onBack,
  onDuplicate,
  onDelete,
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
  publicUrl,
  loadResponses,
  onOpenResponse,
  templateName,
}: FormEditorProps) {
  const htmlLang = useHtmlLang();
  const locale = requested === 'auto' ? htmlLang : (requested ?? 'en');
  const resolved = useMemo(
    () => resolveMessages<FormLocale>(en, locale, locales, messages),
    [locale, locales, messages],
  );
  const words = useMemo<FormKitWords>(
    () => ({ form: resolved.form, visitor: resolved.visitor }),
    [resolved],
  );
  const editorMessages = useMemo<EditorMessages>(
    () => ({
      ...resolved.engine,
      ...resolved.workspace,
      issueText: { ...resolved.engine.issueText, ...resolved.workspace.issueText },
      elements: resolved.elements,
      categories: resolved.categories,
    }),
    [resolved],
  );
  const contentLocale = requestedContentLocale ?? contentLocales?.[0] ?? locale;

  // The step the canvas shows: state for the panels, a ref for the profile,
  // which decides where a new field goes without being rebuilt each time.
  const [step, setStepState] = useState(0);
  const stepRef = useRef(0);
  const setStep = useCallback((next: number) => {
    stepRef.current = Math.max(0, next);
    setStepState(Math.max(0, next));
  }, []);
  const [testAnswers, setTestAnswers] = useState(false);

  const profile = useMemo(
    () =>
      formProfile({
        registry,
        words,
        locale: contentLocale,
        contentLocales,
        stepRef,
        assetUrl: (key) => host.resolveMedia(key),
      }),
    [registry, words, contentLocale, contentLocales, host],
  );

  return (
    <FormProvider
      value={{
        words: words.form,
        visitor: words.visitor,
        locale: contentLocale,
        step,
        setStep,
        testAnswers,
        setTestAnswers,
        publicUrl,
        loadResponses,
        onOpenResponse,
        templateName,
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
    </FormProvider>
  );
}
