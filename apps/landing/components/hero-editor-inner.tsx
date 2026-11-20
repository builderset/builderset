'use client';

import '@builderset/email/styles.css';

import { createEmailRegistry, kitchenSinkEmail, type EmailDocument } from '@builderset/email';
import { EmailEditor } from '@builderset/email/editor';
import { createMemoryHost } from '@builderset/email/host';
import { DEFAULT_BRAND } from '@builderset/email/render';
import { useMemo } from 'react';

const registry = createEmailRegistry();

/** The real email editor with the kit's richest template — shown, not used. */
export function HeroEditorInner() {
  const { document, host } = useMemo(() => {
    const start = kitchenSinkEmail(registry);
    const memory = createMemoryHost<EmailDocument>({ document: start });
    return { document: start, host: { ...memory, resolveMedia: () => '/sample.png' } };
  }, []);
  return (
    <EmailEditor
      document={document}
      registry={registry}
      host={host}
      type={null}
      brand={DEFAULT_BRAND}
      record={{ status: 'draft', scheduledAt: null, publishedAt: null }}
      // Light or dark with the page: the editor follows `data-theme` or the system.
      theme="auto"
      className="h-full"
      fontPreviews={false}
      onBack={() => undefined}
    />
  );
}
