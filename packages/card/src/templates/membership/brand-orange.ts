import { el, side } from '../../core';
import { defineCardTemplate } from '../categories';

/** The brand's orange on the whole front, dark circles behind the words. */
export default defineCardTemplate({
  id: 'brand-orange',
  category: 'membership',
  name: { en: 'Brand orange', sq: 'Portokalli i markës', de: 'Markenorange' },
  description: {
    en: 'A full orange front with dark circles',
    sq: 'Pjesa e përparme krejt portokalli, me rrathë të errët',
    de: 'Ganz orange Vorderseite mit dunklen Kreisen',
  },
  format: 'membership',
  card: { source: 'Anëtarët aktivë' },
  front: side('#e06a1b', [
    el('ellipse', [52, -22, 56, 56], { fill: '#111827' }, { name: 'Dark circle' }),
    el(
      'ellipse',
      [62, 30, 34, 34],
      { fill: '', stroke: '#111827', strokeWidth: 0.4, opacity: 0.5 },
      { name: 'Ring' },
    ),
    el('logo', [4, 3.7, 26.7, 5], { size: 10.4 }),
    el('icon', [74.6, 4, 5, 5], { name: 'star', color: '#e06a1b' }),
    el('label', [4, 25, 30, 3], { text: 'Anëtari', size: 6.1, color: '#fde4d1' }),
    el(
      'field',
      [4, 28.3, 52, 5.7],
      { text: '{{member.name}}', font: 'sora', size: 11.3, weight: 700, color: '#ffffff' },
      { name: 'Member name' },
    ),
    el('label', [4, 38, 30, 3], { text: 'Nr. anëtarësie', size: 6.1, color: '#fde4d1' }),
    el(
      'field',
      [4, 42, 33.3, 3.7],
      { text: '{{member.number}}', font: 'mono', size: 7, weight: 500, color: '#ffffff' },
      { name: 'Member number' },
    ),
    el('label', [39.3, 38, 18.3, 3], { text: 'Niveli', size: 6.1, color: '#fde4d1' }),
    el(
      'field',
      [39.3, 42, 18.3, 3.7],
      { text: '{{member.tier}}', size: 7, weight: 700, color: '#ffffff', upper: true },
      { name: 'Tier' },
    ),
  ]),
  back: side('#111827', [
    el('logo', [4, 4, 30, 5.5], { size: 11.5 }),
    el('text', [4, 12, 46, 18], {
      text: 'Një kartë, çdo pikë kontrolli: vlerësim falas, radhë me përparësi dhe ofertë me shkrim brenda 24 orësh.',
      size: 6.6,
      color: '#d1d5db',
      lineHeight: 1.45,
    }),
    el('qr', [61.6, 4, 21, 21], { color: '#111827', background: '#ffffff' }),
    el('barcode', [4, 33, 46, 7], { color: '#ffffff' }),
    el('field', [4, 44, 46, 3.7], {
      text: 'Vlen deri {{member.valid_until}}',
      font: 'mono',
      size: 6.6,
      color: '#9ca3af',
    }),
    el('text', [53, 44, 28.6, 3.7], {
      text: 'marrimauto.com',
      size: 6.6,
      weight: 600,
      color: '#e06a1b',
      align: 'right',
    }),
  ]),
});
