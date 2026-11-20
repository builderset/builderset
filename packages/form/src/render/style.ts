import type { CSSProperties } from 'react';

import { FORM_FONTS, type FormSettings } from '../core';

/**
 * A form's look as the variables `form.css` reads, and the classes that
 * switch its label position, button width and phone layout. One place, so the
 * editor, the preview and a host's page cannot draw the same form two ways.
 */

const LOOKS = {
  light: { bg: '#ffffff', ink: '#1b1e22', mute: '#6b7280', line: '#e3e5ea', input: '#ffffff' },
  dark: { bg: '#16181d', ink: '#f3f4f6', mute: '#9ca3af', line: '#2e3138', input: '#1f2228' },
  warm: { bg: '#fff8f2', ink: '#1b1e22', mute: '#6b7280', line: '#f1d9c6', input: '#ffffff' },
} as const;

const RADII = { none: '0px', s: '6px', m: '10px', l: '16px' } as const;
const HEIGHTS = { s: '38px', m: '46px', l: '54px' } as const;

export type FormDevice = 'desktop' | 'mobile';

/** The variables on the form's outermost element. */
export function formStyle(
  style: FormSettings['style'],
  device: FormDevice = 'desktop',
): CSSProperties {
  const look = LOOKS[style.look];
  return {
    '--bsf-accent': style.accent,
    '--bsf-radius': RADII[style.radius],
    '--bsf-h': HEIGHTS[style.size],
    '--bsf-width': `${String(device === 'mobile' ? Math.min(390, style.width) : style.width)}px`,
    '--bsf-font': FORM_FONTS[style.font].stack,
    '--bsf-bg': look.bg,
    '--bsf-ink': look.ink,
    '--bsf-mute': look.mute,
    '--bsf-line': look.line,
    '--bsf-input': look.input,
  } as CSSProperties;
}

/** The form's classes: `bsf`, its label position, full-width buttons, the phone layout. */
export function formClassName(
  style: FormSettings['style'],
  device: FormDevice = 'desktop',
): string {
  return [
    'bsf',
    `bsf-labels-${style.labels}`,
    style.fullWidthButtons ? 'bsf-full-buttons' : '',
    device === 'mobile' ? 'bsf-mobile' : '',
  ]
    .filter(Boolean)
    .join(' ');
}
