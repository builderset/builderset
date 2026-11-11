'use client';

import type { ElementRegistry } from '@motors/engine';
import { BuilderEditor, type BuilderHost, type RecordFacts } from '@motors/engine/editor';
import type { EmailDocument, EmailType } from '../core';
import type { BrandKit } from '../render';
import { useMemo } from 'react';

import { EmailProvider } from './context';
import { emailWords } from './messages';
import { emailProfile } from './profile';

export interface EmailEditorProps {
  document: EmailDocument;
  registry: ElementRegistry;
  host: BuilderHost<EmailDocument>;
  /** The email type this template is for: its variables and samples. */
  type: EmailType | null;
  brand: BrandKit;
  /** The public site, where the social block's icons are served from. */
  socialIconBase?: string | undefined;
  /** `status: 'published'` means the design is the ACTIVE one. */
  record: RecordFacts;
  onRecordChange?: ((patch: Partial<RecordFacts>) => void) | undefined;
  onBack: () => void;
  onDuplicate?: (() => void) | undefined;
  onDelete?: (() => Promise<boolean>) | undefined;
  storageKey?: string | undefined;
  savedAt?: string | null | undefined;
}

/**
 * The email builder: the shared editor with the email profile — the email
 * canvas, its settings, structures, modules, variables and checks.
 */
export function EmailEditor({
  document,
  registry,
  host,
  type,
  brand,
  socialIconBase,
  record,
  onRecordChange,
  onBack,
  onDuplicate,
  onDelete,
  storageKey,
  savedAt,
}: EmailEditorProps) {
  const words = useMemo(() => emailWords(host.locale), [host.locale]);
  const profile = useMemo(
    () =>
      emailProfile({
        registry,
        type,
        brand,
        assetUrl: (key) => host.resolveMedia(key),
        socialIconBase,
        locale: host.contentLocale,
        words,
      }),
    [registry, type, brand, host, words, socialIconBase],
  );
  const sample = type?.samples.default ?? Object.values(type?.samples ?? {})[0] ?? {};
  const { email, ...messages } = words;
  void email;

  return (
    <EmailProvider value={{ type, brand, words, locale: host.contentLocale, sample }}>
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
        messages={messages}
        profile={profile}
      />
    </EmailProvider>
  );
}
