import { el } from '../../core';
import { defineTemplate } from '../categories';

export default defineTemplate({
  id: 'exit-offer',
  category: 'offers',
  name: { en: 'Exit offer', sq: 'Ofertë në largim', de: 'Angebot beim Verlassen' },
  description: {
    en: '€100 more for the car, when the mouse heads for the tab bar',
    sq: '100 € më shumë për makinën, kur miu shkon drejt skedave',
    de: '100 € mehr für das Auto, wenn die Maus zur Tableiste wandert',
  },
  format: {
    type: 'modal',
    display: { trigger: 'exit', frequency: 'days', days: 3 },
    motion: { enter: 'up' },
  },
  elements: [
    el('rect', [0, 0, 520, 8], { radius: 0 }, { name: 'Accent' }),
    el('icon', [32, 40, 32, 32], { name: 'gift' }),
    el('label', [76, 48, 300, 16], { text: 'PARA SE TË LARGOHENI', color: '#c2610c', weight: 700 }),
    el('heading', [32, 88, 456, 66], {
      text: 'Merrni 100 € më shumë për makinën tuaj',
      color: '#111827',
      lineHeight: 1.2,
    }),
    el('text', [32, 162, 456, 46], {
      text: 'Kërkoni vlerësimin sot dhe ne shtojmë 100 € në ofertën me shkrim. Vlen deri më {{offer.ends}}.',
      color: '#4b5563',
    }),
    el('button', [32, 236, 220, 46], { text: 'Merrni ofertën', url: '/vleresim?oferta=100' }),
    el(
      'button',
      [268, 236, 220, 46],
      { text: 'Jo, faleminderit', fill: '#f3f4f6', color: '#111827', action: 'close' },
      { name: 'No thanks' },
    ),
    el('close', [478, 16, 30, 30]),
  ],
});
