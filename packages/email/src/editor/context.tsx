'use client';

import type { EmailDocument, EmailType } from '../core';
import type { BrandKit } from '../render';
import { createContext, useContext, type ReactNode } from 'react';

import type { EmailWords } from './messages';

/** How the canvas shows the email: as written, or filled in; in light or a dark inbox. */
export interface EmailView {
  /** Variables filled in with the type's sample. The text cannot be edited meanwhile. */
  exampleData: boolean;
  /** The email as a dark inbox draws it. */
  dark: boolean;
}

/** What the email panels need beyond the shared editor's context. */
export interface EmailContextValue {
  type: EmailType | null;
  brand: BrandKit;
  words: EmailWords;
  locale: string;
  /** Sample data by name, for the inbox preview and the example-data canvas. */
  sample: Record<string, unknown>;
  view: EmailView;
  setView: (patch: Partial<EmailView>) => void;
  /** Sends the design as it is to an address; without it there is no "Send test". */
  onSendTest?: ((document: EmailDocument, address: string) => Promise<boolean>) | undefined;
}

/** Window event that opens the Import HTML drawer from anywhere in the editor. */
export const OPEN_IMPORT_HTML = 'email-builder:import-html';

const EmailContext = createContext<EmailContextValue | null>(null);

export function EmailProvider({
  value,
  children,
}: {
  value: EmailContextValue;
  children: ReactNode;
}) {
  return <EmailContext.Provider value={value}>{children}</EmailContext.Provider>;
}

export function useEmail(): EmailContextValue {
  const value = useContext(EmailContext);
  if (!value) throw new Error('Email panels must be rendered inside <EmailEditor>.');
  return value;
}
