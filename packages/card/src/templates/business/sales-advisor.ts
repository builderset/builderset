import { el, side } from '../../core';
import { defineCardTemplate } from '../categories';

/** A sales advisor's business card: contact lines with icons, the brand on the back. */
export default defineCardTemplate({
  id: 'sales-advisor',
  category: 'business',
  name: { en: 'Sales advisor', sq: 'Këshilltar shitjesh', de: 'Verkaufsberater' },
  description: {
    en: 'Name, role and contact lines; an orange back with a QR code',
    sq: 'Emri, detyra dhe kontaktet; prapa portokalli me kod QR',
    de: 'Name, Funktion und Kontakt; orange Rückseite mit QR-Code',
  },
  format: 'business',
  card: { source: 'Stafi', print: { material: 'paper', finish: 'soft-touch' } },
  front: side('#ffffff', [
    el('logo', [4, 4, 26.7, 5], { size: 10.4, color: '#e06a1b' }),
    el(
      'field',
      [4, 17, 60, 6],
      { text: '{{member.name}}', font: 'sora', size: 12, weight: 700, color: '#111827' },
      { name: 'Name' },
    ),
    el(
      'text',
      [4, 23.5, 60, 4],
      { text: 'Këshilltar shitjesh', size: 7.5, color: '#6b7280' },
      { name: 'Role' },
    ),
    el('line', [4, 30, 12, 0.5], { color: '#e06a1b' }),
    el('icon', [4, 34, 3.2, 3.2], { name: 'phone', color: '#e06a1b' }),
    el('text', [9, 34, 50, 3.4], {
      text: '+355 69 400 2026',
      size: 7,
      color: '#111827',
      valign: 'middle',
    }),
    el('icon', [4, 39.5, 3.2, 3.2], { name: 'mail', color: '#e06a1b' }),
    el('text', [9, 39.5, 50, 3.4], {
      text: 'shitje@marrimauto.com',
      size: 7,
      color: '#111827',
      valign: 'middle',
    }),
    el('icon', [4, 45, 3.2, 3.2], { name: 'map-pin', color: '#e06a1b' }),
    el('text', [9, 45, 60, 3.4], {
      text: 'Rruga e Durrësit 142, Tiranë',
      size: 7,
      color: '#111827',
      valign: 'middle',
    }),
  ]),
  back: side('#e06a1b', [
    el('logo', [6, 19.5, 40, 8], { size: 17 }),
    el('text', [6, 29, 40, 8], {
      text: 'Shitni makinën tuaj sot. Ofertë me shkrim brenda 24 orësh.',
      size: 7,
      color: '#fdf1e9',
      lineHeight: 1.4,
    }),
    el('qr', [60, 17, 20, 20], {
      data: 'https://marrimauto.com/vleresim',
      color: '#111827',
      background: '#ffffff',
    }),
  ]),
});
