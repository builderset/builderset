import { el } from '../../core';
import { defineTemplate } from '../categories';

export default defineTemplate({
  id: 'valuation-drawer',
  category: 'leads',
  name: { en: 'Valuation drawer', sq: 'Vlerësimi anash', de: 'Bewertung als Seitenleiste' },
  description: {
    en: 'Slides in from the right once a visitor has read half the page',
    sq: 'Hyn nga e djathta kur vizitori ka lexuar gjysmën e faqes',
    de: 'Gleitet von rechts herein, wenn die Hälfte der Seite gelesen ist',
  },
  format: {
    type: 'drawer',
    position: 'right',
    overlay: 35,
    motion: { enter: 'side', duration: 420 },
    display: {
      trigger: 'scroll',
      scroll: 50,
      pages: 'only',
      rules: ['/blog/*'],
      frequency: 'days',
      days: 14,
    },
  },
  elements: [
    el('image', [0, 0, 380, 220], { tone: '#1f2937', radius: 0 }, { name: 'Car photo' }),
    el('label', [28, 252, 200, 14], { text: 'VLERËSIM FALAS', color: '#c2610c', weight: 700 }),
    el('heading', [28, 274, 324, 64], { text: 'Sa vlen makina juaj?', size: 28, color: '#111827' }),
    el('text', [28, 344, 324, 64], {
      text: 'Merrni një ofertë me shkrim brenda 24 orësh. Pa detyrime, pa pazare.',
      size: 15,
      color: '#4b5563',
    }),
    el('input', [28, 424, 324, 46], {
      name: 'plate',
      label: 'Targa e makinës',
      placeholder: 'Targa, p.sh. AA 123 BC',
      kind: 'plate',
    }),
    el('button', [28, 482, 324, 48], {
      text: 'Vlerëso makinën',
      action: 'submit',
      thanks: 'Faleminderit! Ju kontaktojmë brenda 24 orësh.',
    }),
    el('text', [28, 548, 324, 40], {
      text: 'Oferta vlen një javë. Pagesa bëhet ditën e kontrollit.',
      size: 13,
      color: '#6b7280',
    }),
    el('close', [334, 14, 32, 32], { color: '#ffffff', fill: '#111827' }),
  ],
});
