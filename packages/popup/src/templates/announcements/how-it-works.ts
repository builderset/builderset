import { el } from '../../core';
import { defineTemplate } from '../categories';

export default defineTemplate({
  id: 'how-it-works',
  category: 'announcements',
  name: { en: 'How it works card', sq: 'Karta “Si funksionon”', de: 'Karte „So funktioniert’s“' },
  description: {
    en: 'A card inside the blog’s articles, in the reading flow',
    sq: 'Kartë brenda artikujve të blogut, mes leximit',
    de: 'Eine Karte in den Blogartikeln, mitten im Lesefluss',
  },
  format: {
    type: 'inline',
    radius: 14,
    shadow: 'soft',
    background: '#fdf1e9',
    display: { trigger: 'load', pages: 'only', rules: ['/blog/*'], frequency: 'every' },
    motion: { enter: 'none' },
  },
  elements: [
    el('label', [20, 22, 300, 14], { text: 'SI FUNKSIONON', color: '#c2610c', weight: 700 }),
    el('heading', [20, 42, 320, 30], {
      text: 'Shitni makinën në tre hapa',
      size: 22,
      color: '#111827',
    }),
    el('text', [20, 80, 320, 66], {
      text: 'Plotësoni formularin, merrni ofertën brenda 24 orësh dhe paguhuni ditën e kontrollit.',
      lineHeight: 1.5,
      color: '#4b5563',
    }),
    el('button', [20, 170, 200, 44], { text: 'Fillo vlerësimin', size: 14, url: '/vleresim' }),
  ],
});
