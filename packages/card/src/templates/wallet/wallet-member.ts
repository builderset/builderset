import { el, side } from '../../core';
import { defineCardTemplate } from '../categories';

/** The membership card for a phone's wallet: edge to edge, a large code. */
export default defineCardTemplate({
  id: 'wallet-member',
  category: 'wallet',
  name: { en: 'Wallet membership', sq: 'Anëtarësi në portofol', de: 'Mitgliedschaft im Wallet' },
  description: {
    en: 'For Apple and Google Wallet: a large QR code to scan',
    sq: 'Për Apple dhe Google Wallet: kod QR i madh për t’u skanuar',
    de: 'Für Apple und Google Wallet: ein großer QR-Code zum Scannen',
  },
  format: 'wallet',
  front: side('#111827', [
    el('ellipse', [55, -25, 50, 50], { fill: '#e06a1b' }, { name: 'Orange circle' }),
    el('logo', [5, 5, 26.7, 5], { size: 10.4 }),
    el('label', [5, 26, 30, 3], { text: 'Anëtari', size: 6.5, color: '#9ca3af' }),
    el(
      'field',
      [5, 29.5, 60, 6],
      { text: '{{member.name}}', font: 'sora', size: 12, weight: 700, color: '#ffffff' },
      { name: 'Member name' },
    ),
    el(
      'field',
      [5, 40, 30, 4],
      {
        text: '{{member.tier}}',
        size: 7.5,
        weight: 700,
        color: '#e06a1b',
        upper: true,
        letterSpacing: 0.1,
      },
      { name: 'Tier' },
    ),
    el(
      'field',
      [40, 40, 40.6, 4],
      { text: '{{member.number}}', font: 'mono', size: 7.5, color: '#d1d5db', align: 'right' },
      { name: 'Member number' },
    ),
  ]),
  back: side('#ffffff', [
    el('qr', [27.8, 4, 30, 30]),
    el('field', [5, 37, 75.6, 4], {
      text: '{{member.number}}',
      font: 'mono',
      size: 7.5,
      color: '#111827',
      align: 'center',
    }),
    el('text', [5, 43, 75.6, 6], {
      text: 'Tregojeni ekranin në pikën e kontrollit.',
      size: 7,
      color: '#6b7280',
      align: 'center',
    }),
  ]),
});
