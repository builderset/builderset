import { el, side } from '../../core';
import { defineCardTemplate } from '../categories';

/** A payment card: the chip and the stripe where ISO 7816 and 7811 put them. */
export default defineCardTemplate({
  id: 'payment-card',
  category: 'bank',
  name: { en: 'Payment card', sq: 'Kartë pagese', de: 'Zahlungskarte' },
  description: {
    en: 'Chip, contactless and stripe in their ISO places',
    sq: 'Çipi, pagesa pa kontakt dhe shiriti në vendet ISO',
    de: 'Chip, Kontaktlos-Symbol und Streifen an ihren ISO-Positionen',
  },
  format: 'bank',
  front: side('#1e293b', [
    el('ellipse', [40, -40, 80, 80], { fill: '#334155', opacity: 0.6 }, { name: 'Glow' }),
    el('logo', [4, 4, 26.7, 5], { size: 10.4 }),
    el('text', [56, 4.4, 26.6, 4], {
      text: 'DEBIT',
      size: 7,
      weight: 700,
      color: '#e06a1b',
      align: 'right',
      letterSpacing: 0.12,
    }),
    el('chip', [10.25, 19.23, 11, 9]),
    el('nfc', [24.5, 21, 5, 5], { color: '#cbd5e1' }),
    el(
      'field',
      [4, 32, 70, 5],
      {
        text: '{{member.number}}',
        font: 'mono',
        size: 10,
        weight: 500,
        color: '#ffffff',
        letterSpacing: 0.08,
      },
      { name: 'Card number' },
    ),
    el('label', [4, 39.5, 20, 3], { text: 'Vlen deri', size: 6.1, color: '#94a3b8' }),
    el(
      'field',
      [4, 42.7, 20, 3.7],
      { text: '{{member.valid_until}}', font: 'mono', size: 7, color: '#ffffff' },
      { name: 'Valid until' },
    ),
    el(
      'field',
      [28, 42.7, 54.6, 3.7],
      {
        text: '{{member.name}}',
        size: 7.5,
        weight: 600,
        color: '#ffffff',
        upper: true,
        letterSpacing: 0.06,
      },
      { name: 'Cardholder' },
    ),
  ]),
  back: side('#f8fafc', [
    el('stripe', [0, 5.54, 85.6, 12.7]),
    el('sign', [4, 21.5, 55, 7.5]),
    el('text', [62, 21.5, 20.6, 7.5], {
      text: 'CVV\n•••',
      font: 'mono',
      size: 7,
      weight: 600,
      color: '#111827',
      align: 'center',
      valign: 'middle',
      background: '#ffffff',
      backgroundRadius: 0.8,
    }),
    el('text', [4, 32, 78.6, 10], {
      text: 'Karta lëshohet nga marrimauto dhe mbetet pronë e saj. Për bllokim të menjëhershëm telefononi +355 69 400 2026, ditë e natë.',
      size: 6.3,
      color: '#475569',
      lineHeight: 1.4,
    }),
    el('logo', [4, 44.5, 26.7, 4.5], { size: 9, color: '#1e293b' }),
  ]),
});
