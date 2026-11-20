'use client';

import type { ElementRegistry } from '@builderset/engine';
import { placeNewNodes, type EditorProfile } from '@builderset/engine/editor';
import { Users } from 'lucide-react';
import type { RefObject } from 'react';

import {
  buildCard,
  CARD_CATEGORIES,
  cardSizeOf,
  checkCard,
  el,
  formatOf,
  parseCard,
  roundTo,
  side,
  sideOf,
  type CardDocument,
  type CardField,
} from '../core';
import { CardView, type CardWords } from '../render';
import type { CardFace } from './context';
import { CardDockItems } from './dock';
import { CardLayers } from './layers';
import { MembersPanel } from './members-panel';
import type { CardEditorWords } from './messages';
import { CardNodePanel, CardSelectionPanel } from './node-panel';
import { CardPreview } from './preview';
import { CardSettingsPanel } from './settings-panel';
import { CardStage } from './stage';
import { CardTemplatesPanel } from './templates-panel';

/**
 * The card builder, as a profile of the shared editor: the board is the side
 * being designed on the engine's free canvas (`CardStage`), the layers are
 * that side's, a selected element gets the card's inspector (Style, Layout,
 * Data), the settings are the card's (Format, Print, Data), the left rail
 * adds the members, and a new element lands on the side shown, sized for a
 * card and centred on it.
 */

export interface CardProfileOptions {
  registry: ElementRegistry;
  words: CardEditorWords;
  viewer: CardWords;
  /** The member fields a design may use: what the checks hold variables to. */
  fields: readonly CardField[];
  /** The languages a design may be written in; others block approval. */
  contentLocales?: readonly string[] | undefined;
  /** The side the canvas shows, for where a new element goes. */
  faceRef: RefObject<CardFace>;
  assetUrl: (key: string) => string;
}

/** The brand palette the colour fields offer first: the concept's swatches. */
const PALETTE = [
  '#111827',
  '#1f2937',
  '#374151',
  '#6b7280',
  '#d1d5db',
  '#ffffff',
  '#e06a1b',
  '#c2610c',
  '#f5a25d',
  '#fdf1e9',
  '#d8b75e',
];

/** One element on a card of its own, for the library's peek at it. */
function sampleOf(registry: ElementRegistry, type: string): CardDocument | null {
  if (type === 'side' || type === 'root' || !registry.has(type)) return null;
  const size = cardSizeOf(type);
  const w = Math.min(size.w, 75);
  const h = Math.min(size.h, 44);
  try {
    return buildCard(registry, {
      stable: true,
      card: { sides: 1 },
      front: side('#111827', [
        el(type, [size.x ?? (85.6 - w) / 2, size.y ?? (53.98 - h) / 2, w, h]),
      ]),
    });
  } catch {
    return null;
  }
}

export function cardProfile({
  registry,
  words,
  viewer,
  fields,
  contentLocales,
  faceRef,
  assetUrl,
}: CardProfileOptions): EditorProfile<CardDocument> {
  return {
    renderCanvas: ({ doc }) => (
      <CardView document={doc} scale={4} markVariables assetUrl={assetUrl} words={viewer} />
    ),
    renderPreview: ({ doc }) => <CardPreview doc={doc} />,
    sampleOf: (type) => sampleOf(registry, type),
    canvasFrame: 'none',
    stage: CardStage,
    layersPanel: CardLayers,
    templatesPanel: CardTemplatesPanel,
    settingsPanel: CardSettingsPanel,
    nodePanel: ({ id }) => <CardNodePanel id={id} />,
    selectionPanel: ({ ids }) => <CardSelectionPanel ids={ids} />,
    mediaTab: false,
    sideTabs: [
      {
        id: 'members',
        label: words.members,
        icon: <Users aria-hidden="true" />,
        panel: MembersPanel,
      },
    ],
    dockItems: CardDockItems,
    colorTokens: PALETTE.map((hex) => ({ value: hex, label: hex, hex })),
    defaultParent: (doc) => sideOf(doc, faceRef.current)?.id ?? sideOf(doc, 'front')?.id ?? null,
    onNodesAdded: (draft, ids) => {
      const format = formatOf(draft);
      for (const face of ['front', 'back'] as const) {
        const board = sideOf(draft, face);
        if (!board) continue;
        placeNewNodes(
          draft,
          ids,
          { id: board.id, width: format.width, height: format.height },
          (type) => cardSizeOf(type, format.width),
        );
      }
    },
    check: (doc) => checkCard(doc, registry, { fields, locales: contentLocales }),
    parse: (raw) => parseCard(raw, registry),
    categories: CARD_CATEGORIES.filter((category) => category !== 'structure'),
    paragraphType: 'text',
    titleOf: (doc) => doc.meta.name,
    summaryOf: (doc) => {
      const format = formatOf(doc);
      return `${String(roundTo(format.width))} × ${String(roundTo(format.height))} mm`;
    },
    styleTab: false,
  };
}
