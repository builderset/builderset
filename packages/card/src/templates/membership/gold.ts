import { el, side } from '../../core';
import { defineCardTemplate } from '../categories';

/** The dark membership card with an orange sun in the corner: the concept's own. */
export default defineCardTemplate({
  id: 'gold-membership',
  category: 'membership',
  name: { en: 'Gold membership', sq: 'Anëtarësi Gold', de: 'Gold-Mitgliedschaft' },
  description: {
    en: 'Dark card, orange accent, the member’s photo',
    sq: 'Kartë e errët, theks portokalli, fotoja e anëtarit',
    de: 'Dunkle Karte, orangefarbener Akzent, Foto des Mitglieds',
  },
  format: 'membership',
  card: { source: 'Anëtarët aktivë' },
  front: side('#111827', [
    el('ellipse', [57.3, -18.3, 50, 50], { fill: '#e06a1b' }, { name: 'Orange circle' }),
    el(
      'ellipse',
      [65.6, -10, 33.3, 33.3],
      { fill: '', stroke: '#ffffff', strokeWidth: 0.25, opacity: 0.35 },
      { name: 'Ring' },
    ),
    el('logo', [4, 3.7, 26.7, 5], { size: 10.4 }),
    el(
      'text',
      [64.3, 3.7, 17.3, 4.7],
      {
        text: '{{member.tier}}',
        size: 6.5,
        weight: 700,
        color: '#111827',
        align: 'center',
        valign: 'middle',
        letterSpacing: 0.1,
        upper: true,
        background: '#ffffff',
        backgroundRadius: 2.3,
      },
      { name: 'Tier' },
    ),
    el('label', [4, 25, 26.7, 3], { text: 'Anëtari', size: 6.1 }),
    el(
      'field',
      [4, 28.3, 55, 5.7],
      { text: '{{member.name}}', font: 'sora', size: 11.3, weight: 700, color: '#ffffff' },
      { name: 'Member name' },
    ),
    el('label', [4, 38, 30, 3], { text: 'Nr. anëtarësie', size: 6.1 }),
    el(
      'field',
      [4, 42, 33.3, 3.7],
      {
        text: '{{member.number}}',
        font: 'mono',
        size: 7,
        weight: 500,
        color: '#ffffff',
        letterSpacing: 0.05,
      },
      { name: 'Member number' },
    ),
    el('label', [39.3, 38, 18.3, 3], { text: 'Vlen deri', size: 6.1 }),
    el(
      'field',
      [39.3, 42, 18.3, 3.7],
      { text: '{{member.valid_until}}', font: 'mono', size: 7, weight: 500, color: '#ffffff' },
      { name: 'Valid until' },
    ),
    el('photo', [67.6, 32.6, 14, 17.3]),
    el('nfc', [58.7, 41.7, 3.7, 3.7], { color: '#9ca3af' }),
  ]),
  back: side('#ffffff', [
    el('rect', [-3, -3, 91.6, 13.7], { fill: '#111827', radius: 0 }, { name: 'Top band' }),
    el('text', [4, 3.3, 43.3, 3.7], {
      text: 'Karta e anëtarësisë',
      size: 6.6,
      weight: 600,
      color: '#ffffff',
    }),
    el('logo', [62.6, 3, 20, 4.3], { size: 8.5 }),
    el('qr', [4, 14.3, 18.7, 18.7]),
    el('text', [26, 14, 55, 11], {
      text: 'Paraqiteni këtë kartë në çdo pikë kontrolli marrimauto për përparësi në takim dhe vlerësim falas.',
      size: 6.6,
      color: '#374151',
      lineHeight: 1.45,
    }),
    el('barcode', [26, 26.3, 38.3, 6.7]),
    el('sign', [4, 35.3, 43.7, 7]),
    el('text', [4, 44.3, 77.6, 6], {
      text: 'Karta është personale. Nëse e gjeni, kthejeni në çdo pikë kontrolli ose në marrimauto.com.',
      size: 6.1,
      color: '#6b7280',
      lineHeight: 1.35,
    }),
  ]),
});
