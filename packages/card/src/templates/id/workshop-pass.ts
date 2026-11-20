import { el, side } from '../../core';
import { defineCardTemplate } from '../categories';

/** A pass for the workshop floor: who it is, which halls they may enter. */
export default defineCardTemplate({
  id: 'workshop-pass',
  category: 'id',
  name: { en: 'Workshop pass', sq: 'Leje për servisin', de: 'Werkstattausweis' },
  description: {
    en: 'Dark blue, a stripe for the access level',
    sq: 'Blu e errët, me shirit për nivelin e hyrjes',
    de: 'Dunkelblau, mit einem Streifen für die Zugangsstufe',
  },
  format: 'id',
  card: { source: 'Stafi' },
  front: side('#0f172a', [
    el('rect', [-3, 40, 91.6, 16.98], { fill: '#e06a1b', radius: 0 }, { name: 'Access stripe' }),
    el('logo', [4, 4, 26.7, 5], { size: 10.4 }),
    el('icon', [76.6, 4, 6, 6], { name: 'wrench', color: '#e06a1b' }),
    el('photo', [4, 13, 15, 18.5], { radius: 1.2, tone: '#334155' }),
    el('label', [23, 13.5, 40, 3], { text: 'Leje hyrjeje · Servisi', size: 6.1, color: '#94a3b8' }),
    el(
      'field',
      [23, 17, 59.6, 5.7],
      { text: '{{member.name}}', font: 'sora', size: 11, weight: 700, color: '#ffffff' },
      { name: 'Name' },
    ),
    el(
      'field',
      [23, 25, 40, 3.7],
      { text: '{{member.number}}', font: 'mono', size: 7, weight: 500, color: '#cbd5e1' },
      { name: 'Number' },
    ),
    el(
      'text',
      [4, 43.5, 50, 5],
      {
        text: 'Hyrje: Salla 1 · Salla 2 · Magazina',
        size: 7,
        weight: 700,
        color: '#111827',
        valign: 'middle',
      },
      { name: 'Access' },
    ),
    el(
      'field',
      [56, 43.5, 26.6, 5],
      {
        text: '{{member.valid_until}}',
        font: 'mono',
        size: 7,
        weight: 600,
        color: '#111827',
        align: 'right',
        valign: 'middle',
      },
      { name: 'Valid until' },
    ),
  ]),
  back: side('#ffffff', [
    el('heading', [4, 4, 60, 5], {
      text: 'Rregullat e servisit',
      size: 9,
      weight: 700,
      color: '#111827',
      font: 'sora',
    }),
    el('text', [4, 10.5, 56, 22], {
      text: 'Kartën e mbani të dukshme në çdo kohë. Hyrja në sallat e tjera bëhet vetëm me shoqërues. Mjetet e punës nuk dalin nga servisi.',
      size: 6.6,
      color: '#374151',
      lineHeight: 1.45,
    }),
    el('qr', [64.6, 4, 18, 18]),
    el('sign', [4, 38, 45, 7]),
    el('text', [53, 38, 29.6, 9], {
      text: 'Humbët kartën?\n+355 69 400 2026',
      size: 6.3,
      color: '#6b7280',
      align: 'right',
      lineHeight: 1.35,
    }),
  ]),
});
