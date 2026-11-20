import { el } from '../../core';
import { defineTemplate } from '../categories';

export default defineTemplate({
  id: 'newsletter-modal',
  category: 'newsletter',
  name: { en: 'Weekly newsletter', sq: 'Buletini i së enjtes', de: 'Wöchentlicher Newsletter' },
  description: {
    en: 'A first name and an email, after twenty seconds, until they sign up or close it',
    sq: 'Emri dhe emaili pas njëzet sekondash, derisa të regjistrohen ose ta mbyllin',
    de: 'Vorname und E-Mail nach zwanzig Sekunden, bis zur Anmeldung oder zum Schließen',
  },
  format: {
    type: 'modal',
    display: { trigger: 'delay', delay: 20, audience: 'new', frequency: 'until' },
  },
  elements: [
    el('rect', [0, 0, 520, 110], { fill: '#fdf1e9', radius: 0 }, { name: 'Band' }),
    el('icon', [32, 38, 36, 36], { name: 'mail' }),
    el('heading', [32, 132, 456, 34], { text: 'Mos humbisni asnjë ofertë', color: '#111827' }),
    el('text', [32, 172, 456, 44], {
      text: 'Çdo të enjte: makinat më të kërkuara të javës dhe një këshillë për ta shitur më mirë.',
      color: '#4b5563',
    }),
    el('input', [32, 230, 160, 44], {
      name: 'first_name',
      label: 'Emri',
      placeholder: 'Emri',
      kind: 'text',
      required: false,
    }),
    el('input', [200, 230, 288, 44], {
      name: 'email',
      label: 'Email',
      placeholder: 'emri@shembull.com',
      kind: 'email',
    }),
    el('button', [32, 282, 456, 44], {
      text: 'Regjistrohu',
      action: 'submit',
      thanks: 'Faleminderit! Shihemi të enjten.',
    }),
    el('close', [478, 12, 30, 30], { fill: '#ffffff' }),
  ],
});
