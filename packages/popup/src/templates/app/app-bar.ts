import { el } from '../../core';
import { defineTemplate } from '../categories';

/** Designed at a phone's width: on phones only, it is drawn at its own size. */
export default defineTemplate({
  id: 'app-bar',
  category: 'app',
  name: { en: 'Open in the app', sq: 'Hape në aplikacion', de: 'In der App öffnen' },
  description: {
    en: 'A bar at the bottom of phones, once a session',
    sq: 'Shirit në fund të ekranit të telefonit, një herë për vizitë',
    de: 'Eine Leiste unten auf dem Handy, einmal pro Sitzung',
  },
  format: {
    type: 'barbottom',
    width: 358,
    height: 64,
    background: '#ffffff',
    display: { trigger: 'delay', delay: 2, frequency: 'session', desktop: false },
    motion: { enter: 'up', duration: 280 },
  },
  elements: [
    el('icon', [16, 16, 32, 32], { name: 'smartphone' }),
    el('text', [58, 12, 160, 40], {
      text: 'Më shpejt dhe më lehtë në aplikacion',
      size: 13,
      weight: 600,
      lineHeight: 1.3,
      color: '#111827',
    }),
    el('button', [224, 14, 90, 36], { text: 'Hape', size: 14, url: 'https://marrimauto.com/app' }),
    el('close', [322, 17, 30, 30]),
  ],
});
