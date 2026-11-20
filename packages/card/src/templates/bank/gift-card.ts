import { el, side } from '../../core';
import { defineCardTemplate } from '../categories';

/** A gift card for a service at the workshop, its code on the back. */
export default defineCardTemplate({
  id: 'gift-card',
  category: 'bank',
  name: { en: 'Gift card', sq: 'Kartë dhuratë', de: 'Geschenkkarte' },
  description: {
    en: 'A value on the front, a code to redeem on the back',
    sq: 'Vlera përpara, kodi për ta përdorur prapa',
    de: 'Der Betrag vorn, der Einlösecode hinten',
  },
  format: 'membership',
  front: side('#fdf1e9', [
    el('ellipse', [-20, 20, 60, 60], { fill: '#e06a1b' }, { name: 'Orange circle' }),
    el('icon', [8, 33, 9, 9], { name: 'gift', color: '#ffffff' }),
    el('logo', [4, 4, 26.7, 5], { size: 10.4, color: '#111827' }),
    el('label', [44, 14, 38.6, 3], {
      text: 'Kartë dhuratë',
      size: 6.5,
      color: '#c2610c',
      align: 'right',
    }),
    el('heading', [34, 18, 48.6, 12], {
      text: '50 €',
      font: 'sora',
      size: 26,
      weight: 800,
      color: '#111827',
      align: 'right',
    }),
    el('text', [34, 32, 48.6, 8], {
      text: 'Për një kontroll teknik të plotë ose një larje profesionale.',
      size: 6.6,
      color: '#374151',
      align: 'right',
      lineHeight: 1.4,
    }),
    el('field', [44, 44, 38.6, 3.7], {
      text: 'Vlen deri {{member.valid_until}}',
      font: 'mono',
      size: 6.6,
      color: '#6b7280',
      align: 'right',
    }),
  ]),
  back: side('#ffffff', [
    el('heading', [4, 4, 60, 5], {
      text: 'Si ta përdorni',
      size: 9,
      weight: 700,
      color: '#111827',
      font: 'sora',
    }),
    el('text', [4, 10.5, 50, 18], {
      text: 'Tregojeni kartën në çdo pikë kontrolli marrimauto. Vlera zbritet nga fatura; pjesa që mbetet ruhet për herën tjetër.',
      size: 6.6,
      color: '#374151',
      lineHeight: 1.45,
    }),
    el('qr', [62.6, 4, 20, 20]),
    el('barcode', [4, 33, 50, 8]),
    el(
      'field',
      [4, 42.5, 50, 3.7],
      {
        text: '{{member.number}}',
        font: 'mono',
        size: 7,
        color: '#111827',
        align: 'center',
        letterSpacing: 0.1,
      },
      { name: 'Code' },
    ),
    el('text', [58, 33, 24.6, 13], {
      text: 'Nuk këmbehet me para. Nuk zëvendësohet nëse humbet.',
      size: 6.1,
      color: '#9ca3af',
      align: 'right',
      lineHeight: 1.35,
    }),
  ]),
});
