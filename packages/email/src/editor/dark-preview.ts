import type { BuilderNode } from '@builderset/engine';

import type { EmailDocument } from '../core';
import type { BrandKit } from '../render';

/**
 * The email roughly as a dark inbox shows it, for the canvas's dark preview.
 *
 * With custom dark colours the document's own dark palette is used, as Apple
 * Mail and Outlook.com use it. Either way light backgrounds turn dark and dark
 * text turns light, block by block — what the mail apps that darken an email
 * themselves do. Buttons keep their colours: apps leave them alone. It is a
 * preview only: the stored email never changes.
 */

const BACKGROUNDS = new Set(['background', 'backdrop', 'headerBackground']);
const TEXTS = new Set(['color', 'textColor', 'labelColor', 'valueColor']);
const KEEP = new Set(['button', 'coupon', 'social']);

/** 0 (black) to 1 (white); 1 for anything that is not a #rrggbb colour. */
function luminance(hex: string): number {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match?.[1]) return 1;
  const value = parseInt(match[1], 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

export function darkened(doc: EmailDocument, brand: BrandKit): EmailDocument {
  const dark = doc.settings.dark;
  const hex = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    if (value.startsWith('brand.')) return brand.colors[value.slice(6)] ?? null;
    return value;
  };

  const nodes: Record<string, BuilderNode> = {};
  for (const [id, node] of Object.entries(doc.nodes)) {
    if (KEEP.has(node.type)) {
      nodes[id] = node;
      continue;
    }
    const props = { ...node.props };
    for (const [key, value] of Object.entries(props)) {
      const colour = hex(value);
      if (!colour) continue;
      if (BACKGROUNDS.has(key) && luminance(colour) > 0.6) {
        props[key] = key === 'backdrop' ? dark.backdrop : dark.background;
      } else if (TEXTS.has(key) && luminance(colour) < 0.4) {
        props[key] = dark.text;
      } else if (key === 'borderColor' && luminance(colour) > 0.6) {
        props[key] = '#3a3b40';
      }
    }
    nodes[id] = { ...node, props };
  }

  return {
    ...doc,
    nodes,
    settings: {
      ...doc.settings,
      backdrop: dark.backdrop,
      background: dark.background,
      textColor: dark.text,
      headingColor: dark.heading,
      linkColor: dark.link,
    },
  };
}
