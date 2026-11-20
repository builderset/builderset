'use client';

import { createContext, useContext, type ReactNode } from 'react';

import type { CardDocument, CardField, CardRecord } from '../core';
import type { CardWords } from '../render';
import type { CardEditorWords } from './messages';

/** The side being designed. */
export type CardFace = 'front' | 'back';

/** What the card panels need beyond the shared editor's context. */
export interface CardContextValue {
  words: CardEditorWords;
  viewer: CardWords;
  /** The language the editor speaks: field labels are picked by it. */
  locale: string;
  /** The member fields the design may use. */
  fields: readonly CardField[];
  /** Members to design with: the example data and the preview's switch. */
  records: readonly CardRecord[];
  /** How many members the chosen list holds, as the host counts them. */
  memberCount?: number | undefined;
  /** The side the canvas shows. */
  face: CardFace;
  setFace: (face: CardFace) => void;
  /** The canvas filled in for the example member. */
  exampleData: boolean;
  setExampleData: (on: boolean) => void;
  /** Which example member. */
  recordIndex: number;
  setRecordIndex: (index: number) => void;
  /** The safe area, the bleed and the snap guides on the canvas. */
  guides: boolean;
  setGuides: (on: boolean) => void;
  showBleed: boolean;
  setShowBleed: (on: boolean) => void;
  showSafe: boolean;
  setShowSafe: (on: boolean) => void;
  /** A media key's address. */
  assetUrl: (key: string) => string;
  /** The host's print run for the card as it is now. Without one, the browser prints the example members. */
  onPrint?: ((document: CardDocument) => void) | undefined;
}

const CardContext = createContext<CardContextValue | null>(null);

export function CardProvider({
  value,
  children,
}: {
  value: CardContextValue;
  children: ReactNode;
}) {
  return <CardContext.Provider value={value}>{children}</CardContext.Provider>;
}

export function useCard(): CardContextValue {
  const value = useContext(CardContext);
  if (!value) throw new Error('Card panels must be rendered inside <CardEditor>.');
  return value;
}

/** The example member's data while example data is on; null otherwise. */
export function useShownRecord(): CardRecord | null {
  const { exampleData, records, recordIndex } = useCard();
  return exampleData ? (records[recordIndex] ?? records[0] ?? null) : null;
}
