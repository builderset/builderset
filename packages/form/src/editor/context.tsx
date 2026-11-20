'use client';

import { createContext, useContext, type ReactNode } from 'react';

import type { FormEditorWords } from './messages';
import type { FormWords } from '../render';

/** A response as the Responses tab lists it. */
export interface FormResponseSummary {
  id: string;
  /** Who sent it, as the host names them: "Arben H.". */
  title: string;
  /** A line about it: "Volkswagen Golf · AA 123 BC". */
  detail?: string | undefined;
  /** When, as words: "14 min ago". */
  when: string;
  /** Where it is in the team's work: "New", "Called". */
  status?: string | undefined;
}

/** What `loadResponses` gives the Responses tab. */
export interface FormResponses {
  total: number;
  thisWeek?: number | undefined;
  /** Of those who started, how many sent it, 0–1. */
  completion?: number | undefined;
  /** Seconds to fill it in, on average. */
  averageSeconds?: number | undefined;
  /** Of those who started, how many reached each step, 0–1, step by step. */
  reached?: readonly number[] | undefined;
  latest: readonly FormResponseSummary[];
}

/** What the form panels need beyond the shared editor's context. */
export interface FormContextValue {
  words: FormEditorWords;
  visitor: FormWords;
  /** The language the form is written in. */
  locale: string;
  /** The step the canvas shows. */
  step: number;
  setStep: (step: number) => void;
  /** The canvas filled with example answers. */
  testAnswers: boolean;
  setTestAnswers: (on: boolean) => void;
  /** The form's public address for a slug: `https://example.com/f/<slug>`. */
  publicUrl?: ((slug: string) => string) | undefined;
  loadResponses?: (() => Promise<FormResponses>) | undefined;
  /** Opens one response, in the host's own screen. */
  onOpenResponse?: ((id: string) => void) | undefined;
  /** The template the form was made from, for the locked fields' explanation. */
  templateName?: string | undefined;
}

const FormContext = createContext<FormContextValue | null>(null);

export function FormProvider({
  value,
  children,
}: {
  value: FormContextValue;
  children: ReactNode;
}) {
  return <FormContext.Provider value={value}>{children}</FormContext.Provider>;
}

export function useForm(): FormContextValue {
  const value = useContext(FormContext);
  if (!value) throw new Error('Form panels must be rendered inside <FormEditor>.');
  return value;
}
