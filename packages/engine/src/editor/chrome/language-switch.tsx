'use client';

import { documentLocales, type ContentLocale } from '../../core';
import { SegmentedControl, ToggleFlag } from '../ui';

import { useEditor, useEditorContext } from '../context';
import { languageName } from '../messages';

/** The base language of what is being edited: the document's own, else the editor's default. */
export function useBaseLocale(): ContentLocale {
  const { defaultContentLocale } = useEditorContext();
  const base = useEditor((state) => state.doc.i18n?.base);
  return base ?? defaultContentLocale;
}

/**
 * SQ | EN | DE in the top bar, once the document is multi-language: which
 * language the canvas shows and the typing goes to. The base comes first.
 */
export function LanguageSwitch({ className }: { className?: string }) {
  const { store, messages, contentLocales } = useEditorContext();
  const doc = useEditor((state) => state.doc);
  const lang = useEditor((state) => state.lang);
  const locales = documentLocales(doc, contentLocales);
  if (!doc.i18n?.enabled || locales.length < 2) return null;
  const base = doc.i18n.base;
  return (
    <SegmentedControl
      aria-label={messages.language}
      value={lang ?? base}
      onValueChange={(value) => {
        store.getState().setLang(value === base ? null : value);
      }}
      options={locales.map((locale) => ({
        value: locale,
        label: <span className="px-0.5 text-[11px] font-semibold">{locale.toUpperCase()}</span>,
        ariaLabel: languageName(locale, messages.languages),
      }))}
      {...(className ? { className } : {})}
    />
  );
}

/**
 * The document setting: one document in every language, or one language. Off
 * by default, and absent when the editor has only one content language.
 */
export function MultilingualToggle() {
  const { store, messages, contentLocales } = useEditorContext();
  const enabled = useEditor((state) => state.doc.i18n?.enabled === true);
  const base = useBaseLocale();
  if (contentLocales.length < 2) return null;
  return (
    <ToggleFlag
      title={messages.multilingual}
      description={messages.multilingualHelp}
      checked={enabled}
      onCheckedChange={(checked) => {
        store.getState().setMultilingual(checked, base);
        if (!checked) store.getState().setLang(null);
      }}
    />
  );
}
