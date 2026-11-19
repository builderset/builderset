'use client';

import '@builderset/email/styles.css';

import { createEmailRegistry, starterEmail, type EmailDocument } from '@builderset/email';
import { EmailEditor } from '@builderset/email/editor';
import { createMemoryHost } from '@builderset/email/host';
import { DEFAULT_BRAND } from '@builderset/email/render';
import { useMemo } from 'react';

const registry = createEmailRegistry();

/**
 * The real email editor, small: the playground's, with nothing kept. It keeps
 * everything in memory — no backend, no account, gone on reload.
 */
export function LiveEditor() {
  const { document, host } = useMemo(() => {
    const start = starterEmail(registry, { name: 'Welcome', subject: 'Welcome aboard' });
    const memory = createMemoryHost<EmailDocument>({ document: start });
    // The starter's pictures are made-up keys: show the site's sample instead.
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
      theme="auto"
      // The editor fills its root; the root is as tall as the frame (see .bs-frame).
      className="h-full"
      onBack={() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }}
    />
  );
}
