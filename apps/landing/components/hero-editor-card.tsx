'use client';

import './kit-card.css';

import { createCardRegistry, type CardDocument } from '@builderset/card';
import { buildTemplateCard, CARD_TEMPLATES, CardEditor } from '@builderset/card/editor';
import { createMemoryHost } from '@builderset/card/host';
import { useMemo } from 'react';

import { DRAFT, resolveMedia, useReady, type HeroKitProps } from './hero-ready';

const registry = createCardRegistry();

/** The real card editor with the kit's own membership card — shown, not used. */
export default function HeroCard({ onReady }: HeroKitProps) {
  const { document, host } = useMemo(() => {
    const template =
      CARD_TEMPLATES.find((candidate) => candidate.id === 'gold-membership') ?? CARD_TEMPLATES[0];
    const start = buildTemplateCard(registry, template);
    const memory = createMemoryHost<CardDocument>({ document: start });
    return { document: start, host: { ...memory, resolveMedia } };
  }, []);
  useReady(onReady);
  return (
    <CardEditor
      document={document}
      registry={registry}
      host={host}
      record={DRAFT}
      memberCount={248}
      theme="auto"
      className="h-full"
      onBack={() => undefined}
    />
  );
}
