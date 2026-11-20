'use client';

import { FreeLayersPanel, useEditor, useEditorContext } from '@builderset/engine/editor';

import { elementsOf, sideOf, type CardDocument } from '../core';
import { useCard } from './context';

/** The Layers tab: the side shown, topmost first — "Front · 12 layers". */
export function CardLayers() {
  const { messages } = useEditorContext<CardDocument>();
  const { words, face } = useCard();
  const side = useEditor<string, CardDocument>((state) => sideOf(state.doc, face)?.id ?? '');
  const count = useEditor<number, CardDocument>((state) => elementsOf(state.doc, face).length);
  if (!side) return null;
  return (
    <FreeLayersPanel
      artboardId={side}
      summary={`${face === 'front' ? words.front : words.back} · ${messages.free.layerCount(count)}`}
    />
  );
}
