'use client';

import './kit-popup.css';

import { createPopupRegistry, type PopupDocument } from '@builderset/popup';
import { buildTemplatePopup, POPUP_TEMPLATES, PopupEditor } from '@builderset/popup/editor';
import { createMemoryHost } from '@builderset/popup/host';
import { useMemo } from 'react';

import { DRAFT, resolveMedia, useReady, type HeroKitProps } from './hero-ready';

const registry = createPopupRegistry();

/** The real popup editor with one of the kit's templates — shown, not used. */
export default function HeroPopup({ onReady }: HeroKitProps) {
  const { document, host } = useMemo(() => {
    const template =
      POPUP_TEMPLATES.find((candidate) => candidate.id === 'valuation-modal') ?? POPUP_TEMPLATES[0];
    const start = buildTemplatePopup(registry, template);
    const memory = createMemoryHost<PopupDocument>({ document: start });
    return { document: start, host: { ...memory, resolveMedia } };
  }, []);
  useReady(onReady);
  return (
    <PopupEditor
      document={document}
      registry={registry}
      host={host}
      record={DRAFT}
      theme="auto"
      className="h-full"
      onBack={() => undefined}
    />
  );
}
