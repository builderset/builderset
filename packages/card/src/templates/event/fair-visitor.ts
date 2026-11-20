import { el, side } from '../../core';
import { defineCardTemplate } from '../categories';

/** A visitor badge for the car fair: the day and the hall, a code at the gate. */
export default defineCardTemplate({
  id: 'fair-visitor',
  category: 'event',
  name: { en: 'Fair visitor', sq: 'Vizitor në panair', de: 'Messebesucher' },
  description: {
    en: 'The event in large type, a QR code scanned at the gate',
    sq: 'Eventi me shkrim të madh, kodi QR skanohet në hyrje',
    de: 'Die Veranstaltung groß, ein QR-Code für den Einlass',
  },
  format: 'badge',
  card: { sides: 2, print: { material: 'paper', quantity: 1500 } },
  front: side('#ffffff', [
    el('rect', [-3, 62, 59.98, 26.6], { fill: '#111827', radius: 0 }, { name: 'Bottom band' }),
    el('rect', [21.3, 3.7, 11.3, 2], { fill: '#d1d5db', radius: 1 }, { name: 'Lanyard slot' }),
    el('logo', [4, 10, 46, 5], { size: 9.5, color: '#e06a1b' }),
    el('label', [4, 22, 46, 3], { text: 'Panairi i Makinave 2026', size: 6.5, color: '#6b7280' }),
    el('heading', [4, 26, 46, 12], {
      text: 'Vizitor',
      font: 'sora',
      size: 24,
      weight: 800,
      color: '#111827',
    }),
    el(
      'field',
      [4, 41, 46, 5.5],
      { text: '{{member.name}}', size: 10, weight: 600, color: '#111827' },
      { name: 'Visitor name' },
    ),
    el('text', [4, 48, 46, 8], {
      text: 'Pallati i Kongreseve, Tiranë\n14–16 maj · 10:00–20:00',
      size: 6.6,
      color: '#374151',
      lineHeight: 1.4,
    }),
    el('icon', [4, 67, 5, 5], { name: 'ticket', color: '#e06a1b' }),
    el('text', [11, 67, 39, 5], {
      text: 'Hyrje e lirë në të gjitha sallat',
      size: 7,
      weight: 600,
      color: '#ffffff',
      valign: 'middle',
    }),
    el(
      'field',
      [4, 75, 46, 4],
      { text: '{{member.number}}', font: 'mono', size: 7, color: '#9ca3af' },
      { name: 'Ticket number' },
    ),
  ]),
  back: side('#111827', [
    el('heading', [4, 6, 46, 6], {
      text: 'Skanoni në hyrje',
      size: 10,
      weight: 700,
      color: '#ffffff',
      align: 'center',
      font: 'sora',
    }),
    el('qr', [10, 16, 34, 34], {
      data: '{{member.qr}}',
      color: '#111827',
      background: '#ffffff',
      level: 'Q',
    }),
    el('text', [4, 56, 46, 14], {
      text: 'Mbajeni bexhin të dukshëm gjatë gjithë kohës. Programi i plotë: marrimauto.com/panairi',
      size: 6.6,
      color: '#d1d5db',
      align: 'center',
      lineHeight: 1.45,
    }),
    el('logo', [14, 75, 26, 5], { size: 9.5 }),
  ]),
});
