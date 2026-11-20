'use client';

import './kit-form.css';

import { createFormRegistry, type FormDocument } from '@builderset/form';
import { buildTemplateForm, FORM_TEMPLATES, FormEditor } from '@builderset/form/editor';
import { createMemoryHost } from '@builderset/form/host';
import { useMemo } from 'react';

import { DRAFT, resolveMedia, useReady, type HeroKitProps } from './hero-ready';

const registry = createFormRegistry();

/** The real form editor with one of the kit's longest templates — shown, not used. */
export default function HeroForm({ onReady }: HeroKitProps) {
  const { document, host } = useMemo(() => {
    const template =
      FORM_TEMPLATES.find((candidate) => candidate.id === 'job-application') ?? FORM_TEMPLATES[0];
    const start = buildTemplateForm(registry, template);
    const memory = createMemoryHost<FormDocument>({ document: start });
    return { document: start, host: { ...memory, resolveMedia } };
  }, []);
  useReady(onReady);
  return (
    <FormEditor
      document={document}
      registry={registry}
      host={host}
      record={DRAFT}
      theme="auto"
      className="h-full"
      onBack={() => undefined}
      publicUrl={(slug) => `https://example.com/f/${slug}`}
    />
  );
}
