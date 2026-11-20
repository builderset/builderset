import { el } from '../../core';
import { defineTemplate } from '../categories';

export default defineTemplate({
  id: 'cookie-card',
  category: 'consent',
  name: { en: 'Cookie card', sq: 'Karta e cookies', de: 'Cookie-Karte' },
  description: {
    en: 'A small card in the bottom-left corner, with a link to the privacy policy',
    sq: 'Kartë e vogël në cepin poshtë majtas, me lidhje te politika e privatësisë',
    de: 'Eine kleine Karte unten links, mit Link zur Datenschutzerklärung',
  },
  format: {
    type: 'slidein',
    position: 'bottom-left',
    height: 230,
    display: { trigger: 'load', frequency: 'until' },
    motion: { enter: 'up', esc: false },
  },
  elements: [
    el('icon', [20, 20, 28, 28], { name: 'cookie' }),
    el('heading', [60, 22, 280, 26], { text: 'Cookies te marrimauto', size: 18, color: '#111827' }),
    el('text', [20, 60, 320, 58], {
      text: 'Cookies të nevojshme e mbajnë faqen në punë; me lejen tuaj përdorim edhe cookies për statistika.',
      size: 13,
      color: '#4b5563',
    }),
    el(
      'text',
      [20, 124, 320, 18],
      {
        text: 'Lexoni politikën e privatësisë',
        size: 13,
        color: '#c2610c',
        action: 'link',
        url: '/privatesia',
      },
      { name: 'Privacy policy' },
    ),
    el(
      'button',
      [20, 164, 140, 42],
      { text: 'Pranoj të gjitha', size: 13, action: 'close' },
      { name: 'Accept all' },
    ),
    el(
      'button',
      [168, 164, 172, 42],
      { text: 'Vetëm të nevojshmet', size: 13, fill: '#f3f4f6', color: '#111827', action: 'close' },
      { name: 'Necessary only' },
    ),
  ],
});
