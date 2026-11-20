import { el, side } from '../../core';
import { defineCardTemplate } from '../categories';

/** A light card in black type: prints well on recycled PVC and on paper. */
export default defineCardTemplate({
  id: 'clean-white',
  category: 'membership',
  name: { en: 'Clean white', sq: 'E bardhë e pastër', de: 'Klares Weiß' },
  description: {
    en: 'Light card, black type, a thin orange line',
    sq: 'Kartë e çelët, shkronja të zeza, një vijë e hollë portokalli',
    de: 'Helle Karte, schwarze Schrift, eine feine orange Linie',
  },
  format: 'membership',
  card: { source: 'Anëtarët aktivë', print: { material: 'recycled-pvc' } },
  front: side('#ffffff', [
    el('rect', [-3, -3, 4.5, 59.98], { fill: '#e06a1b', radius: 0 }, { name: 'Edge' }),
    el('logo', [6, 4.5, 26.7, 5], { size: 10.4, color: '#111827' }),
    el(
      'text',
      [62.3, 4.5, 19.3, 4.7],
      {
        text: '{{member.tier}}',
        size: 6.5,
        weight: 700,
        color: '#ffffff',
        align: 'center',
        valign: 'middle',
        letterSpacing: 0.1,
        upper: true,
        background: '#111827',
        backgroundRadius: 2.3,
      },
      { name: 'Tier' },
    ),
    el('label', [6, 24, 30, 3], { text: 'Anëtari', size: 6.1, color: '#6b7280' }),
    el(
      'field',
      [6, 27.3, 60, 5.7],
      { text: '{{member.name}}', font: 'sora', size: 11.3, weight: 700, color: '#111827' },
      { name: 'Member name' },
    ),
    el('line', [6, 35.5, 75.6, 0.3], { color: '#e5e7eb' }),
    el('label', [6, 38.5, 30, 3], { text: 'Nr. anëtarësie', size: 6.1, color: '#6b7280' }),
    el(
      'field',
      [6, 42, 33.3, 3.7],
      { text: '{{member.number}}', font: 'mono', size: 7, weight: 500, color: '#111827' },
      { name: 'Member number' },
    ),
    el('label', [42, 38.5, 18.3, 3], { text: 'Anëtar që nga', size: 6.1, color: '#6b7280' }),
    el(
      'field',
      [42, 42, 18.3, 3.7],
      { text: '{{member.since}}', font: 'mono', size: 7, weight: 500, color: '#111827' },
      { name: 'Member since' },
    ),
    el('label', [63, 38.5, 18.6, 3], { text: 'Vlen deri', size: 6.1, color: '#6b7280' }),
    el(
      'field',
      [63, 42, 18.6, 3.7],
      { text: '{{member.valid_until}}', font: 'mono', size: 7, weight: 500, color: '#111827' },
      { name: 'Valid until' },
    ),
  ]),
  back: side('#f9fafb', [
    el('qr', [4, 4, 20, 20]),
    el('heading', [28, 4.5, 50, 5], {
      text: 'Mirë se erdhët në klub',
      size: 9,
      weight: 700,
      color: '#111827',
      font: 'sora',
    }),
    el('text', [28, 10.5, 53.6, 12], {
      text: 'Skanoni kodin në pikën e kontrollit: vlerësimi falas dhe radha me përparësi janë të përfshira.',
      size: 6.6,
      color: '#374151',
      lineHeight: 1.45,
    }),
    el('barcode', [4, 29, 45, 7]),
    el('sign', [4, 39.5, 45, 7]),
    el('text', [53, 39.5, 28.6, 7.5], {
      text: 'marrimauto.com\n+355 69 400 2026',
      size: 6.3,
      color: '#6b7280',
      align: 'right',
      lineHeight: 1.35,
    }),
  ]),
});
