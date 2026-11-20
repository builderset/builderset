import { el } from '../../core';
import { defineTemplate } from '../categories';

export default defineTemplate({
  id: 'newsletter-slidein',
  category: 'newsletter',
  name: {
    en: 'Market prices newsletter',
    sq: 'Buletini i çmimeve',
    de: 'Newsletter mit Marktpreisen',
  },
  description: {
    en: 'A corner card asking for an email, halfway down the page',
    sq: 'Kartë në cep që kërkon emailin, në gjysmë të faqes',
    de: 'Eine Eckkarte, die auf halber Seite nach der E-Mail fragt',
  },
  format: {
    type: 'slidein',
    position: 'bottom-right',
    motion: { enter: 'up' },
    display: { trigger: 'scroll', scroll: 50, frequency: 'days', days: 14 },
  },
  elements: [
    el('label', [20, 22, 200, 14], { text: 'BULETINI', color: '#c2610c', weight: 700 }),
    el('heading', [20, 42, 290, 28], {
      text: 'Çmimet e tregut, çdo muaj',
      size: 20,
      color: '#111827',
    }),
    el('text', [20, 76, 320, 40], {
      text: 'Një email në muaj me çmimet reale të makinave të përdorura në Shqipëri.',
      size: 13,
      color: '#4b5563',
    }),
    el('input', [20, 126, 196, 42], {
      name: 'email',
      label: 'Email',
      placeholder: 'emri@shembull.com',
      kind: 'email',
      size: 14,
    }),
    el('button', [224, 126, 116, 42], {
      text: 'Abonohu',
      size: 14,
      action: 'submit',
      thanks: 'Faleminderit! Emaili i parë vjen në fillim të muajit.',
    }),
    el('text', [20, 180, 320, 20], {
      text: 'Pa spam. Çabonohuni kur të doni.',
      size: 12,
      color: '#6b7280',
    }),
    el('close', [320, 12, 28, 28]),
  ],
});
