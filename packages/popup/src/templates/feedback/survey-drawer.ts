import { el } from '../../core';
import { defineTemplate } from '../categories';

export default defineTemplate({
  id: 'survey-drawer',
  category: 'feedback',
  name: { en: 'Three-question survey', sq: 'Anketë me tri pyetje', de: 'Umfrage mit drei Fragen' },
  description: {
    en: 'A drawer on the car pages, after half a minute, until it is answered or closed',
    sq: 'Panel anësor në faqet e makinave, pas gjysmë minute, derisa të përgjigjen ose ta mbyllin',
    de: 'Eine Seitenleiste auf den Autoseiten nach einer halben Minute, bis beantwortet oder geschlossen',
  },
  format: {
    type: 'drawer',
    position: 'left',
    overlay: 30,
    motion: { enter: 'side', duration: 420 },
    display: {
      trigger: 'delay',
      delay: 30,
      pages: 'only',
      rules: ['/makina/*'],
      frequency: 'until',
    },
  },
  elements: [
    el('label', [28, 40, 300, 14], { text: 'NJË MINUTË', color: '#c2610c', weight: 700 }),
    el('heading', [28, 62, 324, 72], {
      text: 'Na ndihmoni ta bëjmë shitjen më të lehtë',
      lineHeight: 1.2,
      color: '#111827',
    }),
    el('text', [28, 146, 324, 66], {
      text: 'Tri pyetje të shkurtra. Përgjigjet na tregojnë çfarë duhet t’u shpjegojmë më mirë shitësve.',
      color: '#4b5563',
    }),
    el('input', [28, 232, 324, 46], {
      name: 'car',
      label: 'Çfarë makine keni?',
      placeholder: 'p.sh. Volkswagen Golf 2017',
      kind: 'text',
    }),
    el('input', [28, 290, 324, 46], {
      name: 'missing',
      label: 'Çfarë ju mungoi në faqe?',
      placeholder: 'Çfarë ju mungoi në faqe?',
      kind: 'text',
      required: false,
    }),
    el('input', [28, 348, 324, 46], {
      name: 'email',
      label: 'Email, nëse doni përgjigje',
      placeholder: 'Email, nëse doni përgjigje',
      kind: 'email',
      required: false,
    }),
    el('button', [28, 414, 324, 48], {
      text: 'Dërgo përgjigjet',
      action: 'submit',
      thanks: 'Faleminderit! Kjo na ndihmon shumë.',
    }),
    el('close', [334, 14, 32, 32]),
  ],
});
