import { el, side } from '../../core';
import { defineCardTemplate } from '../categories';

/** A staff ID with a large photo, laid out like an identity card. */
export default defineCardTemplate({
  id: 'staff-id',
  category: 'id',
  name: { en: 'Photo ID', sq: 'Kartë identifikimi', de: 'Lichtbildausweis' },
  description: {
    en: 'A large photo and an ID layout, for inspectors and staff',
    sq: 'Foto e madhe dhe paraqitje ID, për inspektorët dhe stafin',
    de: 'Großes Foto im Ausweis-Layout, für Prüfer und Personal',
  },
  format: 'id',
  card: { source: 'Stafi' },
  front: side('#f3f4f6', [
    el('rect', [-3, -3, 91.6, 12.7], { fill: '#111827', radius: 0 }, { name: 'Top band' }),
    el('logo', [4, 3.2, 26.7, 4.5], { size: 9.5 }),
    el('text', [44, 3.6, 38.6, 3.7], {
      text: 'Kartë identifikimi',
      size: 6.6,
      weight: 600,
      color: '#ffffff',
      align: 'right',
    }),
    el('photo', [4, 12.7, 18.3, 22.7], { radius: 1.2, tone: '#9ca3af' }),
    el('label', [26, 13, 30, 3], { text: 'Emri', size: 6.1, color: '#6b7280' }),
    el(
      'field',
      [26, 16.3, 56.6, 5.7],
      { text: '{{member.name}}', font: 'sora', size: 11, weight: 700, color: '#111827' },
      { name: 'Name' },
    ),
    el('label', [26, 24.5, 30, 3], { text: 'Detyra', size: 6.1, color: '#6b7280' }),
    el(
      'text',
      [26, 27.8, 56.6, 3.7],
      { text: 'Inspektor teknik · Tiranë', size: 7, weight: 500, color: '#111827' },
      { name: 'Role' },
    ),
    el('label', [26, 34, 26, 3], { text: 'Nr. personal', size: 6.1, color: '#6b7280' }),
    el(
      'field',
      [26, 37.3, 26, 3.7],
      { text: '{{member.number}}', font: 'mono', size: 7, weight: 500, color: '#111827' },
      { name: 'Number' },
    ),
    el('label', [56, 34, 26.6, 3], { text: 'Vlen deri', size: 6.1, color: '#6b7280' }),
    el(
      'field',
      [56, 37.3, 26.6, 3.7],
      { text: '{{member.valid_until}}', font: 'mono', size: 7, weight: 500, color: '#111827' },
      { name: 'Valid until' },
    ),
    el('barcode', [4, 43, 78.6, 6]),
  ]),
  back: side('#ffffff', [
    el('qr', [4, 4, 22, 22]),
    el('heading', [30, 4.5, 52.6, 5], {
      text: 'Pronë e marrimauto',
      size: 9,
      weight: 700,
      color: '#111827',
      font: 'sora',
    }),
    el('text', [30, 10.5, 52.6, 16], {
      text: 'Kjo kartë hap dyert e pikave të kontrollit dhe të servisit. Mbajeni të dukshme gjatë punës dhe mos ia jepni askujt.',
      size: 6.6,
      color: '#374151',
      lineHeight: 1.45,
    }),
    el('line', [4, 31, 78.6, 0.3], { color: '#e5e7eb' }),
    el('text', [4, 34, 78.6, 13], {
      text: 'Nëse e gjeni këtë kartë, ju lutemi kthejeni në çdo pikë kontrolli marrimauto ose telefononi +355 69 400 2026.',
      size: 6.3,
      color: '#6b7280',
      lineHeight: 1.4,
    }),
  ]),
});
