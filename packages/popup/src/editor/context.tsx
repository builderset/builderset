'use client';

import { createContext, useContext, type ReactNode } from 'react';

import type { PopupField } from '../core';
import type { PopupWords } from '../render';
import type { PopupEditorWords } from './messages';

/** What the popup panels need beyond the shared editor's context. */
export interface PopupContextValue {
  words: PopupEditorWords;
  visitor: PopupWords;
  /** The variables the host fills in. */
  fields: readonly PopupField[];
  /** The canvas filled with the fields' examples. */
  exampleData: boolean;
  setExampleData: (on: boolean) => void;
  guides: boolean;
  setGuides: (on: boolean) => void;
  /** Bumped to play the entrance again on the canvas. */
  replays: number;
  replay: () => void;
  assetUrl: (key: string) => string;
}

const PopupContext = createContext<PopupContextValue | null>(null);

export function PopupProvider({
  value,
  children,
}: {
  value: PopupContextValue;
  children: ReactNode;
}) {
  return <PopupContext.Provider value={value}>{children}</PopupContext.Provider>;
}

export function usePopup(): PopupContextValue {
  const value = useContext(PopupContext);
  if (!value) throw new Error('Popup panels must be rendered inside <PopupEditor>.');
  return value;
}
