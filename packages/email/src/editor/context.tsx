'use client';

import type { EmailType } from '@motors/email-core';
import type { BrandKit } from '@motors/email-render';
import { createContext, useContext, type ReactNode } from 'react';

import type { EmailWords } from './messages';

/** What the email panels need beyond the shared editor's context. */
export interface EmailContextValue {
  type: EmailType | null;
  brand: BrandKit;
  words: EmailWords;
  locale: string;
  /** Sample data by name, for the inbox preview. */
  sample: Record<string, unknown>;
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
