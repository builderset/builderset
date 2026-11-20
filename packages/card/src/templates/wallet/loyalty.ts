import { el, side } from '../../core';
import { defineCardTemplate } from '../categories';

/** A loyalty card in the wallet: five stamps, the sixth wash free. */
export default defineCardTemplate({
  id: 'wallet-loyalty',
  category: 'wallet',
  name: { en: 'Loyalty card', sq: 'Kartë besnikërie', de: 'Treuekarte' },
  description: {
    en: 'Five stamps and a reward, in the phone’s wallet',
    sq: 'Pesë vula dhe një shpërblim, në portofolin e telefonit',
    de: 'Fünf Stempel und eine Prämie, im Wallet des Telefons',
  },
  format: 'wallet',
  card: { sides: 2 },
  front: side('#e06a1b', [
    el('logo', [5, 5, 26.7, 5], { size: 10.4 }),
    el('text', [44, 5.5, 36.6, 4], {
      text: 'Kartë besnikërie',
      size: 7.5,
      weight: 600,
      color: '#ffffff',
      align: 'right',
    }),
    el('heading', [5, 15, 75.6, 7], {
      text: 'Larja e gjashtë falas',
      font: 'sora',
      size: 13,
      weight: 700,
      color: '#ffffff',
    }),
    el('icon', [5, 27, 9, 9], { name: 'star', color: '#ffffff' }, { name: 'Stamp 1' }),
    el('icon', [17, 27, 9, 9], { name: 'star', color: '#ffffff' }, { name: 'Stamp 2' }),
    el('icon', [29, 27, 9, 9], { name: 'star', color: '#ffffff' }, { name: 'Stamp 3' }),
    el('icon', [41, 27, 9, 9], { name: 'star', color: '#fde4d1' }, { name: 'Stamp 4' }),
    el('icon', [53, 27, 9, 9], { name: 'star', color: '#fde4d1' }, { name: 'Stamp 5' }),
    el('icon', [66, 26, 11, 11], { name: 'gift', color: '#111827' }, { name: 'Reward' }),
    el('field', [5, 42, 75.6, 4.5], {
      text: '{{member.name}} · {{member.number}}',
      size: 7.5,
      color: '#ffffff',
    }),
  ]),
  back: side('#ffffff', [
    el('qr', [5, 5, 26, 26]),
    el('heading', [36, 6, 44.6, 5], {
      text: 'Si funksionon',
      size: 9,
      weight: 700,
      color: '#111827',
      font: 'sora',
    }),
    el('text', [36, 12.5, 44.6, 20], {
      text: 'Çdo larje në një pikë marrimauto merr një vulë. Me pesë vula, larja e gjashtë është falas.',
      size: 7,
      color: '#374151',
      lineHeight: 1.45,
    }),
    el('field', [5, 40, 75.6, 4], {
      text: 'Vlen deri {{member.valid_until}}',
      font: 'mono',
      size: 7,
      color: '#6b7280',
    }),
  ]),
});
