import { el } from '../../core';
import { defineTemplate } from '../categories';

export default defineTemplate({
  id: 'countdown-sale',
  category: 'offers',
  name: { en: 'Countdown sale', sq: 'Ofertë me afat', de: 'Countdown-Aktion' },
  description: {
    en: 'A full-screen week of offers, with the time left counting down',
    sq: 'Java e ofertave në ekran të plotë, me kohën që mbetet',
    de: 'Eine Aktionswoche im Vollbild, mit ablaufender Zeit',
  },
  format: {
    type: 'fullscreen',
    overlay: 0,
    display: {
      trigger: 'delay',
      delay: 3,
      frequency: 'session',
      starts: '2026-11-23',
      ends: '2026-11-30',
    },
    motion: { enter: 'fade', duration: 480 },
  },
  elements: [
    el('label', [400, 150, 300, 16], {
      text: 'VETËM KËTË JAVË',
      align: 'center',
      color: '#f5a25d',
      weight: 700,
    }),
    el('heading', [200, 176, 700, 64], {
      text: 'Java e ofertave te marrimauto',
      size: 48,
      align: 'center',
      color: '#ffffff',
    }),
    el('text', [250, 252, 600, 52], {
      text: 'Për çdo makinë të shitur deri të dielën, kalimi i pronësisë te noteri është falas.',
      size: 17,
      align: 'center',
      color: '#d1d5db',
    }),
    el('countdown', [400, 328, 300, 64], { to: '2026-11-30T23:59', size: 30, color: '#ffffff' }),
    el('button', [460, 418, 180, 52], { text: 'Shiko ofertën', url: '/oferta' }),
    el(
      'text',
      [400, 486, 300, 20],
      { text: 'Ndoshta më vonë', align: 'center', size: 13, color: '#9ca3af', action: 'close' },
      { name: 'Later' },
    ),
    el('close', [1036, 28, 36, 36], { color: '#d1d5db', fill: '#1f2937' }),
  ],
});
