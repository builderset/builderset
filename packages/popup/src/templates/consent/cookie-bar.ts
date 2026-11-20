import { el } from '../../core';
import { defineTemplate } from '../categories';

/**
 * A notice, not a consent manager: both buttons close it, and a host that
 * records the choice reads which one was clicked (`onAction`, by the
 * elements' names).
 */
export default defineTemplate({
  id: 'cookie-bar',
  category: 'consent',
  name: { en: 'Cookie bar', sq: 'Shiriti i cookies', de: 'Cookie-Leiste' },
  description: {
    en: 'A strip at the bottom of every page until the visitor chooses',
    sq: 'Shirit në fund të çdo faqeje derisa vizitori të zgjedhë',
    de: 'Ein Streifen unten auf jeder Seite, bis eine Wahl getroffen ist',
  },
  format: {
    type: 'barbottom',
    height: 64,
    display: { trigger: 'load', frequency: 'until' },
    motion: { enter: 'up', duration: 280, esc: false },
  },
  elements: [
    el('icon', [24, 18, 28, 28], { name: 'cookie', color: '#f5a25d' }),
    el('text', [64, 12, 640, 40], {
      text: 'Përdorim cookies për të matur vizitat dhe për ta bërë faqen më të mirë. Zgjidhni ç’na lejoni.',
      size: 14,
      lineHeight: 1.4,
      color: '#d1d5db',
    }),
    el(
      'button',
      [720, 12, 176, 40],
      { text: 'Vetëm të nevojshmet', size: 13, fill: '#1f2937', action: 'close' },
      { name: 'Necessary only' },
    ),
    el(
      'button',
      [908, 12, 168, 40],
      { text: 'Pranoj të gjitha', size: 13, action: 'close' },
      { name: 'Accept all' },
    ),
  ],
});
