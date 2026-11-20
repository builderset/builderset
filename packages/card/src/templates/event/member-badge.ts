import { el, side } from '../../core';
import { defineCardTemplate } from '../categories';

/** A portrait badge on a lanyard: the photo large, the name under it. */
export default defineCardTemplate({
  id: 'member-badge',
  category: 'event',
  name: { en: 'Member badge', sq: 'Bexh anëtari', de: 'Mitglieds-Badge' },
  description: {
    en: 'Portrait, a lanyard slot, the photo large',
    sq: 'Vertikal, me vend për kordonin, foto e madhe',
    de: 'Hochformat, Schlitz für das Band, großes Foto',
  },
  format: 'badge',
  card: { source: 'Anëtarët aktivë' },
  front: side('#111827', [
    el('rect', [-3, -3, 59.98, 28], { fill: '#e06a1b', radius: 0 }, { name: 'Top band' }),
    el(
      'rect',
      [21.3, 3.7, 11.3, 2],
      { fill: '#ffffff', radius: 1, opacity: 0.85 },
      { name: 'Lanyard slot' },
    ),
    el('logo', [4, 11, 46, 5], { size: 10.4 }),
    el('photo', [16.6, 25, 20.7, 25], { radius: 2.3 }),
    el(
      'field',
      [3.3, 53, 47.3, 5.7],
      {
        text: '{{member.name}}',
        font: 'sora',
        size: 10.4,
        weight: 700,
        color: '#ffffff',
        align: 'center',
      },
      { name: 'Member name' },
    ),
    el(
      'text',
      [17, 60, 20, 4.7],
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
    el('label', [3.3, 70, 47.3, 3], { text: 'Nr. anëtarësie', size: 6.1, align: 'center' }),
    el(
      'field',
      [3.3, 73.3, 47.3, 3.7],
      {
        text: '{{member.number}}',
        font: 'mono',
        size: 7,
        weight: 500,
        color: '#ffffff',
        align: 'center',
        letterSpacing: 0.05,
      },
      { name: 'Member number' },
    ),
  ]),
  back: side('#ffffff', [
    el('logo', [4, 5, 46, 5], { size: 9.5, color: '#111827' }),
    el('qr', [13.7, 16.7, 26.7, 26.7]),
    el('barcode', [5, 47.7, 44, 7.3]),
    el('text', [4, 58.7, 46, 11.7], {
      text: 'Paraqiteni këtë kartë në hyrje dhe në çdo pikë kontrolli marrimauto.',
      size: 6.6,
      color: '#374151',
      align: 'center',
      lineHeight: 1.45,
    }),
    el('field', [4, 74.7, 46, 3.7], {
      text: 'Vlen deri {{member.valid_until}}',
      font: 'mono',
      size: 6.6,
      color: '#6b7280',
      align: 'center',
    }),
  ]),
});
