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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  CARD_FIELDS,
  EXAMPLE_MEMBERS,
  type CardDocument,
  type CardField,
  type CardRecord,
} from '../core';
import { CARD_FONTS_URL } from '../render';
import { en } from '../locales/en';
import { CardProvider, type CardFace } from './context';
import type { CardLocale, CardMessages } from './messages';
import { cardProfile } from './profile';

export interface CardEditorProps {
  /**
   * The design to edit. Read once, when the editor mounts: to load another,
   * remount it (a new `key`).
   */
  document: CardDocument;
  /** The elements a card can hold — usually `createCardRegistry()`. */
  registry: ElementRegistry;
  /** The adapter for everything that leaves the browser: saving, approving, uploads, media URLs, notices. */
  host: BuilderHost<CardDocument>;
  /** `status: 'published'` means the design is approved for print. */
  record: RecordFacts;
  /** Called with the facts the designer changed (approving, withdrawing). Keep them and pass them back as `record`. */
  onRecordChange?: ((patch: Partial<RecordFacts>) => void) | undefined;
  /** Called to leave the editor (the back button). The editor does not navigate by itself. */
  onBack: () => void;
  /** Adds "Duplicate design" to the approve menu. */
  onDuplicate?: (() => void) | undefined;
  /** Adds "Delete design" to the approve menu; resolve `true` once it is deleted. */
  onDelete?: (() => Promise<boolean>) | undefined;
  /**
   * The member fields a design may use, each a path, a label and its kind
   * (`text`, or `photo` for a picture). Default: the member's name, number,
   * tier, since, valid until, QR value and photo (`CARD_FIELDS`).
   */
  fields?: readonly CardField[] | undefined;
  /** Members to design with: the example data, the preview's switch. Default: three example members. */
  records?: readonly CardRecord[] | undefined;
  /** How many members the chosen list holds: "248 in Anëtarët aktivë", "Print 248 cards". */
  memberCount?: number | undefined;
  /**
   * Print the cards: the host's own print run, one card per member. Without
   * one, "Print-ready sheet" opens the sheet of the example members in a
   * window and the browser's print dialog over it.
   */
  onPrint?: ((document: CardDocument) => void) | undefined;
  /** The editor's own language. `'auto'` follows `<html lang>`. Default: `'en'`. */
  locale?: string | undefined;
  /** Other languages, by code: `{ sq }` from `@builderset/card/locales/sq`. English is built in. */
  locales?: Readonly<Record<string, CardLocale | undefined>> | undefined;
  /** Replace single words, in whatever language is active. */
  messages?: CardMessages | undefined;
  /** The languages a design can be written in. One: no language switch. */
  contentLocales?: readonly string[] | undefined;
  /** The language a new design is written in. Default: the first of `contentLocales`. */
  defaultContentLocale?: string | undefined;
  /** Where the crash-safety copy is kept in localStorage; omit to disable. */
  storageKey?: string | undefined;
  /** When the server copy was last saved: a newer local copy is offered back. */
  savedAt?: string | null | undefined;
  /** 'light' (the default), 'dark', or 'auto' to follow the page. */
  theme?: ThemeMode | undefined;
  /** Theme values by the public variables' names without their prefix: `{ primary: '#da6c1e' }`. */
  tokens?: ThemeTokens | undefined;
  /** Applied to the editor's root element, the one that carries the theme. */
  className?: string | undefined;
  /**
   * Load the card's web fonts (Poppins, Sora, Inter, Geist Mono) from Google
   * Fonts. `false`: never — for a page that loads them itself or whose
   * Content-Security-Policy allows no font host. Default: `true`.
   */
  fontPreviews?: boolean | undefined;
}

/**
 * The card builder: the shared editor with the card profile — a side of the
 * card on a free canvas in millimetres, its elements, the card's format and
 * print settings, member data, templates and a preview in the hand.
 */
export function CardEditor({
  document,
  registry,
  host,
  record,
  onRecordChange,
  onBack,
  onDuplicate,
  onDelete,
  fields = CARD_FIELDS,
  records = EXAMPLE_MEMBERS,
  memberCount,
  onPrint,
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
  fontPreviews = true,
}: CardEditorProps) {
  const htmlLang = useHtmlLang();
  const locale = requested === 'auto' ? htmlLang : (requested ?? 'en');
  const resolved = useMemo(
    () => resolveMessages<CardLocale>(en, locale, locales, messages),
    [locale, locales, messages],
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

  // The side the canvas shows: state for the panels, a ref for the profile,
  // which decides where a new element goes without being rebuilt each time.
  const [face, setFaceState] = useState<CardFace>('front');
  const faceRef = useRef<CardFace>('front');
  const setFace = useCallback((next: CardFace) => {
    faceRef.current = next;
    setFaceState(next);
  }, []);
  const [exampleData, setExampleData] = useState(false);
  const [recordIndex, setRecordIndex] = useState(0);
  const [guides, setGuides] = useState(true);
  const [showBleed, setShowBleed] = useState(true);
  const [showSafe, setShowSafe] = useState(true);
  const assetUrl = useCallback((key: string) => host.resolveMedia(key), [host]);

  useEffect(() => {
    if (!fontPreviews || window.document.querySelector(`link[href="${CARD_FONTS_URL}"]`)) return;
    const link = window.document.createElement('link');
    link.rel = 'stylesheet';
    link.href = CARD_FONTS_URL;
    window.document.head.append(link);
  }, [fontPreviews]);

  const profile = useMemo(
    () =>
      cardProfile({
        registry,
        words: resolved.card,
        viewer: resolved.viewer,
        fields,
        contentLocales,
        faceRef,
        assetUrl,
      }),
    [registry, resolved, fields, contentLocales, assetUrl],
  );

  return (
    <CardProvider
      value={{
        words: resolved.card,
        viewer: resolved.viewer,
        locale,
        fields,
        records,
        memberCount,
        face,
        setFace,
        exampleData,
        setExampleData,
        recordIndex,
        setRecordIndex,
        guides,
        setGuides,
        showBleed,
        setShowBleed,
        showSafe,
        setShowSafe,
        assetUrl,
        onPrint,
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
    </CardProvider>
  );
}
