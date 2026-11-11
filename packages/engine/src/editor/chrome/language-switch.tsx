'use client';

import { documentLocales, isContentLocale, type ContentLocale } from '../../core';
import { SegmentedControl, ToggleFlag } from '@motors/ui';

import { useEditor, useEditorContext } from '../context';

/** The base language of what is being edited: the article's or template's own. */
export function useBaseLocale(): ContentLocale {
  const { host } = useEditorContext();
  const base = useEditor((state) => state.doc.i18n?.base);
  return base ?? (isContentLocale(host.contentLocale) ? host.contentLocale : 'sq');
}

/**
 * SQ | EN | DE in the top bar, once the document is multi-language: which
 * language the canvas shows and the typing goes to. The base comes first.
 */
export function LanguageSwitch({ className }: { className?: string }) {
  const { store, messages } = useEditorContext();
  const doc = useEditor((state) => state.doc);
  const lang = useEditor((state) => state.lang);
  const locales = documentLocales(doc);
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
        ariaLabel: messages.languages[locale],
      }))}
      {...(className ? { className } : {})}
    />
  );
}

/** The document setting: one document in every language, or one language. Off by default. */
export function MultilingualToggle() {
  const { store, messages } = useEditorContext();
  const enabled = useEditor((state) => state.doc.i18n?.enabled === true);
  const base = useBaseLocale();
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
