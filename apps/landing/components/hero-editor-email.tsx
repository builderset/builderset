'use client';

import './kit-email.css';

import { createEmailRegistry, kitchenSinkEmail, type EmailDocument } from '@builderset/email';
import { EmailEditor } from '@builderset/email/editor';
import { createMemoryHost } from '@builderset/email/host';
import { DEFAULT_BRAND } from '@builderset/email/render';
import { useMemo } from 'react';

import { DRAFT, resolveMedia, useReady, type HeroKitProps } from './hero-ready';

const registry = createEmailRegistry();

/** The real email editor with the kit's richest template — shown, not used. */
export default function HeroEmail({ onReady }: HeroKitProps) {
  const { document, host } = useMemo(() => {
    const start = kitchenSinkEmail(registry);
    const memory = createMemoryHost<EmailDocument>({ document: start });
    return { document: start, host: { ...memory, resolveMedia } };
  }, []);
  useReady(onReady);
  return (
    <EmailEditor
      document={document}
      registry={registry}
      host={host}
      type={null}
      brand={DEFAULT_BRAND}
      record={DRAFT}
      // Light or dark with the page: the editor follows `data-theme` or the system.
      theme="auto"
      className="h-full"
      fontPreviews={false}
      onBack={() => undefined}
    />
  );
}
