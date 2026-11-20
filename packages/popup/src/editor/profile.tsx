'use client';

import type { BuilderNode, ElementRegistry } from '@builderset/engine';
import { placeNewNodes, type EditorProfile } from '@builderset/engine/editor';
import { Braces } from 'lucide-react';

import {
  buildPopup,
  checkPopup,
  el,
  formatOf,
  parsePopup,
  POPUP_CATEGORIES,
  POPUP_FONTS,
  type PopupDocument,
  type PopupField,
  type PopupFont,
} from '../core';
import { PopupPicture } from '../render';
import { PopupDockItems } from './dock';
import { PopupNodePanel } from './inspector';
import type { PopupKitWords } from './messages';
import { PopupPreview } from './preview';
import { PopupSettingsPanel } from './settings-panel';
import { FieldsPanel, PopupTemplatesPanel } from './side-panels';
import { PopupLayers, PopupStage, PX, sizeOf } from './stage';

/**
 * The popup builder, as a profile of the shared editor: the board is the
 * engine's free canvas with the popup as its artboard (`PopupStage`), a
 * selected element gets the popup's own inspector (Style, Layout, Action),
 * settings are the popup's (Format, Display, Motion), the left rail lists
 * the layers topmost first, the variables and inputs (Fields) and the types
 * and templates, and the checks are `checkPopup`'s.
 */

export interface PopupProfileOptions {
  registry: ElementRegistry;
  words: PopupKitWords;
  /** The variables the host fills in. */
  fields: readonly PopupField[];
  /** The languages a popup may be written in; others block publishing. */
  contentLocales?: readonly string[] | undefined;
  /** Colours offered first in every colour field: `{ value: '#e06a1b', label: 'Brand', hex: '#e06a1b' }`. */
  colors?: readonly { value: string; label: string; hex: string }[] | undefined;
  assetUrl: (key: string) => string;
}

const FONT_CATEGORY: Record<PopupFont, string> = {
  poppins: 'sans',
  sora: 'sans',
  inter: 'sans',
  mono: 'mono',
  georgia: 'serif',
  system: 'sans',
};

/** One element on a popup of its own, for the library's peek at it. */
function sampleOf(registry: ElementRegistry, type: string): PopupDocument | null {
  if (type === 'root' || !registry.has(type)) return null;
  const size = sizeOf(type);
  try {
    return buildPopup(
      registry,
      {
        format: {
          type: 'inline',
          width: Math.max(160, size.w + 40),
          height: Math.max(60, size.h + 40),
        },
        stable: true,
      },
      [el(type, [20, 20, size.w, size.h])],
    );
  } catch {
    return null;
  }
}

/** A new input whose name another input already has gets its own: `email`, `email_2`. */
function giveOwnNames(draft: PopupDocument, ids: readonly string[]) {
  const taken = new Set<string>();
  const added = new Set(ids);
  for (const id of draft.nodes[draft.root]?.children ?? []) {
    const node = draft.nodes[id];
    if (node?.type === 'input' && !added.has(id)) taken.add(node.props.name as string);
  }
  for (const id of ids) {
    const node: BuilderNode | undefined = draft.nodes[id];
    if (node?.type !== 'input') continue;
    const base = (node.props.name as string) || 'field';
    let name = base;
    for (let n = 2; taken.has(name); n++) name = `${base.slice(0, 36)}_${String(n)}`;
    taken.add(name);
    if (name !== node.props.name) node.props = { ...node.props, name };
  }
}

export function popupProfile({
  registry,
  words,
  fields,
  contentLocales,
  colors,
  assetUrl,
}: PopupProfileOptions): EditorProfile<PopupDocument> {
  return {
    stage: PopupStage,
    layersPanel: PopupLayers,
    renderCanvas: ({ doc }) => (
      <PopupPicture document={doc} words={words.visitor} assetUrl={assetUrl} />
    ),
    renderPreview: ({ doc, viewport, locale }) => (
      <PopupPreview doc={doc} viewport={viewport} locale={locale} />
    ),
    sampleOf: (type) => sampleOf(registry, type),
    canvasFrame: 'none',
    canvasWidths: { desktop: 1100, tablet: 768, mobile: 390 },
    settingsPanel: PopupSettingsPanel,
    nodePanel: ({ id }) => <PopupNodePanel id={id} />,
    templatesPanel: PopupTemplatesPanel,
    mediaTab: false,
    sideTabs: [
      {
        id: 'fields',
        label: words.popup.fields,
        icon: <Braces aria-hidden="true" />,
        panel: FieldsPanel,
      },
    ],
    dockItems: PopupDockItems,
    onNodesAdded: (draft, ids) => {
      const format = formatOf(draft);
      placeNewNodes(
        draft,
        ids,
        { id: draft.root, width: format.width, height: format.height },
        sizeOf,
        {
          decimals: PX.decimals,
        },
      );
      giveOwnNames(draft, ids);
    },
    check: (doc) =>
      checkPopup(doc, registry, {
        locales: contentLocales,
        variables: fields.map((field) => field.path),
      }),
    parse: (raw) => parsePopup(raw, registry),
    categories: POPUP_CATEGORIES.filter((category) => category !== 'structure'),
    paragraphType: 'text',
    variables: fields.map((field) => ({ path: field.path, label: field.label ?? field.path })),
    fonts: Object.entries(POPUP_FONTS).map(([key, font]) => ({
      key,
      label: font.label,
      stack: font.stack,
      category: FONT_CATEGORY[key as PopupFont],
      web: key !== 'system' && key !== 'georgia',
    })),
    ...(colors ? { colorTokens: colors } : {}),
    titleOf: (doc) => doc.meta.name,
    summaryOf: (doc) => words.popup.summary(doc.nodes[doc.root]?.children?.length ?? 0),
    styleTab: false,
  };
}
