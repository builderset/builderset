import {
  BREAKPOINTS,
  resolveStyle,
  type Breakpoint,
  type NodeStyle,
  type StyleValues,
} from '@motors/builder-core';
import type { CSSProperties } from 'react';

import { STYLE_CLASSES } from './style-classes';

/**
 * A node's `style` as classes and, for a background image, an inline style.
 *
 * Each value is resolved PER BREAKPOINT (inheritance included) and emitted for
 * the range it applies to: when all three agree, one unprefixed class; when
 * they differ, one class per range (`lg:`, `sm:max-lg:`, `max-sm:`). Ranges
 * rather than "min-width and up" is what makes a value set only for tablet
 * stop at desktop instead of leaking into it.
 */

type ClassKey = keyof typeof STYLE_CLASSES;
type Range = 'desktop' | 'tablet' | 'mobile';

const KEYS = Object.keys(STYLE_CLASSES) as ClassKey[];

function classFor(key: ClassKey, range: Range | 'all', value: unknown): string {
  // Tokens are strings, and `hidden` is a boolean; anything else (the
  // background image object) has no class of its own.
  if (typeof value !== 'string' && value !== true) return '';
  const table = STYLE_CLASSES[key][range] as Record<string, string>;
  return table[String(value)] ?? '';
}

export function styleClasses(style: NodeStyle | undefined): string {
  if (!style) return '';
  const resolved = Object.fromEntries(
    BREAKPOINTS.map((bp) => [bp, resolveStyle(style, bp)]),
  ) as Record<Breakpoint, StyleValues>;

  const classes: string[] = [];
  for (const key of KEYS) {
    const values = BREAKPOINTS.map((bp) => resolved[bp][key as keyof StyleValues]);
    const [desktop, tablet, mobile] = values;
    if (desktop === tablet && tablet === mobile) {
      classes.push(classFor(key, 'all', desktop));
      continue;
    }
    classes.push(
      classFor(key, 'desktop', desktop),
      classFor(key, 'tablet', tablet),
      classFor(key, 'mobile', mobile),
    );
  }
  return classes.filter(Boolean).join(' ');
}

/** The inline style a background image needs, darkened by its overlay. */
export function styleInline(
  style: NodeStyle | undefined,
  resolveMedia: (key: string) => string,
): CSSProperties | undefined {
  const image = resolveStyle(style, 'desktop').backgroundImage;
  if (!image) return undefined;
  const shade = Math.min(90, Math.max(0, image.overlay)) / 100;
  return {
    backgroundImage: `linear-gradient(rgba(0,0,0,${String(shade)}), rgba(0,0,0,${String(shade)})), url("${encodeURI(resolveMedia(image.media.key))}")`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };
}
