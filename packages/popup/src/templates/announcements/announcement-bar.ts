import { el } from '../../core';
import { defineTemplate } from '../categories';

export default defineTemplate({
  id: 'announcement-bar',
  category: 'announcements',
  name: { en: 'Announcement bar', sq: 'Shiriti i njoftimit', de: 'Ankündigungsleiste' },
  description: {
    en: 'A strip above the page, until the visitor closes it',
    sq: 'Shirit mbi faqe, derisa vizitori ta mbyllë',
    de: 'Ein Streifen über der Seite, bis er geschlossen wird',
  },
  format: {
    type: 'bartop',
    display: { trigger: 'load', frequency: 'until' },
    motion: { enter: 'fade', duration: 240 },
  },
  elements: [
    el('icon', [24, 18, 28, 28], { name: 'megaphone' }),
    el('text', [64, 21, 760, 24], {
      text: 'Tani blejmë edhe makina elektrike dhe hibride — ofertë me shkrim brenda 24 orësh.',
      size: 15,
      color: '#ffffff',
    }),
    el('button', [864, 12, 170, 40], {
      text: 'Mësoni më shumë',
      size: 14,
      url: '/makina-elektrike',
    }),
    el('close', [1050, 17, 30, 30], { color: '#d1d5db', fill: '#1f2937' }),
  ],
});
