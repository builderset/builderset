'use client';

import { documentLocales, type ContentLocale } from '../../core';
import { SegmentedControl, ToggleFlag } from '../ui';
import { Globe } from 'lucide-react';

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
export function LanguageSwitch({
  className,
}: {
  /** Applied to the segmented control. */
  className?: string;
}) {
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
        label: (
          <span className="bst:px-0.5 bst:text-[11px] bst:font-semibold">
            {locale.toUpperCase()}
          </span>
        ),
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

/**
 * Over the canvas, once the document is multi-language: "Editing in" and the
 * language switch, in a pill that stays at the top while the page scrolls.
 * Each language other than the base shows how much of it is written.
 */
export function LanguageBar() {
  const { store, messages, contentLocales } = useEditorContext();
  const doc = useEditor((state) => state.doc);
  const lang = useEditor((state) => state.lang);
  const locales = documentLocales(doc, contentLocales);
  if (!doc.i18n?.enabled || locales.length < 2) return null;
  const base = doc.i18n.base;
  const current = lang ?? base;
  return (
    <div
      data-language-bar=""
      className="bst:absolute bst:top-3 bst:left-1/2 bst:z-20 bst:flex bst:max-w-[calc(100%-24px)] bst:-translate-x-1/2 bst:animate-[bst-rise_300ms_var(--bst-ease-enter)] bst:items-center bst:gap-2.5 bst:rounded-xl bst:border bst:border-border bst:bg-card bst:py-1 bst:pr-1 bst:pl-3 bst:shadow-[0_1px_2px_rgb(20_23_30/0.06),0_8px_24px_rgb(20_23_30/0.08)]"
    >
      <span className="bst:inline-flex bst:items-center bst:gap-1.5 bst:text-xs bst:whitespace-nowrap bst:text-muted-foreground">
        <Globe className="bst:size-3.5" aria-hidden="true" />
        {messages.editingIn}
      </span>
      <div
        className="bst:flex bst:flex-wrap bst:gap-0.5"
        role="group"
        aria-label={messages.language}
      >
        {locales.map((locale) => {
          const on = locale === current;
          return (
            <button
              key={locale}
              type="button"
              aria-pressed={on}
              onClick={() => {
                store.getState().setLang(locale === base ? null : locale);
              }}
              className={
                on
                  ? 'bld-focus bst:inline-flex bst:h-7 bst:cursor-pointer bst:items-center bst:gap-1.5 bst:rounded-lg bst:bg-foreground bst:px-2.5 bst:text-[12.5px] bst:font-semibold bst:text-background'
                  : 'bld-focus bst:inline-flex bst:h-7 bst:cursor-pointer bst:items-center bst:gap-1.5 bst:rounded-lg bst:px-2.5 bst:text-[12.5px] bst:font-semibold bst:text-muted-foreground bst:transition-colors bst:hover:bg-accent bst:hover:text-foreground'
              }
            >
              {languageName(locale, messages.languages)}
              {locale === base ? null : (
                <em className="bst:font-mono bst:text-[10.5px] bst:font-semibold bst:not-italic bst:opacity-65">
                  {locale.toUpperCase()}
                </em>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
