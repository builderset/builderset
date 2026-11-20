import { el, side } from '../../core';
import { defineCardTemplate } from '../categories';

/** A quiet black card: the logo alone on the front, the details on the back. */
export default defineCardTemplate({
  id: 'inspector-card',
  category: 'business',
  name: { en: 'Inspector, minimal', sq: 'Inspektor, minimal', de: 'Prüfer, minimal' },
  description: {
    en: 'A black front with the logo, the details in white on the back',
    sq: 'Përpara e zezë me logon, detajet në të bardhë prapa',
    de: 'Schwarze Vorderseite mit Logo, die Angaben hinten auf Weiß',
  },
  format: 'business',
  card: { source: 'Stafi', print: { material: 'paper', finish: 'matte' } },
  front: side('#111111', [
    el('logo', [22.5, 23.5, 40, 8], { size: 17, color: '#ffffff' }),
    el('line', [37.5, 34, 10, 0.5], { color: '#e06a1b' }),
  ]),
  back: side('#ffffff', [
    el(
      'field',
      [6, 8, 60, 6],
      { text: '{{member.name}}', font: 'sora', size: 12, weight: 700, color: '#111111' },
      { name: 'Name' },
    ),
    el(
      'label',
      [6, 15, 60, 3.4],
      { text: 'Inspektor teknik', size: 6.5, color: '#e06a1b' },
      { name: 'Role' },
    ),
    el('text', [6, 28, 45, 18], {
      text: '+355 69 400 2026\ninspektim@marrimauto.com\nmarrimauto.com',
      size: 7,
      color: '#374151',
      lineHeight: 1.6,
    }),
    el('qr', [62, 31, 17, 17], { data: 'https://marrimauto.com/kontakt' }),
  ]),
});
