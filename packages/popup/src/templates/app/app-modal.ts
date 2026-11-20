import { el } from '../../core';
import { defineTemplate } from '../categories';

export default defineTemplate({
  id: 'app-modal',
  category: 'app',
  name: { en: 'Get the app', sq: 'Shkarkoni aplikacionin', de: 'Hol dir die App' },
  description: {
    en: 'A QR code to scan from a desktop, once a month',
    sq: 'Kod QR për ta skanuar nga kompjuteri, një herë në muaj',
    de: 'Ein QR-Code zum Scannen am Desktop, einmal im Monat',
  },
  format: {
    type: 'modal',
    display: { trigger: 'delay', delay: 10, frequency: 'days', days: 30, mobile: false },
  },
  elements: [
    el('qr', [32, 48, 160, 160], { data: 'https://marrimauto.com/app' }),
    el('text', [32, 216, 160, 36], {
      text: 'Skanoni me kamerën e telefonit',
      size: 12,
      align: 'center',
      color: '#6b7280',
    }),
    el('label', [224, 52, 260, 14], { text: 'APLIKACIONI', color: '#c2610c', weight: 700 }),
    el('heading', [224, 72, 264, 64], {
      text: 'Oferta në xhep, njoftim kur vjen çmimi',
      size: 24,
      lineHeight: 1.2,
      color: '#111827',
    }),
    el('text', [224, 146, 264, 66], {
      text: 'Ndiqni vlerësimin hap pas hapi, ngarkoni foto dhe flisni me ekipin nga telefoni.',
      color: '#4b5563',
    }),
    el('button', [224, 234, 128, 44], {
      text: 'App Store',
      size: 14,
      fill: '#111827',
      url: 'https://apps.apple.com/',
      newTab: true,
    }),
    el('button', [360, 234, 128, 44], {
      text: 'Google Play',
      size: 14,
      fill: '#111827',
      url: 'https://play.google.com/store',
      newTab: true,
    }),
    el('close', [478, 12, 30, 30]),
  ],
});
