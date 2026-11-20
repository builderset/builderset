import { el } from '../../core';
import { defineTemplate } from '../categories';

/** The concept's own: a car on the left, the plate and one button on the right. */
export default defineTemplate({
  id: 'valuation-modal',
  category: 'leads',
  name: { en: 'Free valuation', sq: 'Vlerësim falas', de: 'Kostenlose Bewertung' },
  description: {
    en: 'A modal asking for the plate number, after six seconds, to new visitors',
    sq: 'Modal që kërkon targën pas gjashtë sekondash, për vizitorët e rinj',
    de: 'Ein Modal, das nach sechs Sekunden neue Besucher nach dem Kennzeichen fragt',
  },
  format: {
    type: 'modal',
    display: {
      trigger: 'delay',
      delay: 6,
      pages: 'except',
      rules: ['/vleresim', '/llogaria/*'],
      audience: 'new',
      frequency: 'days',
      days: 7,
    },
  },
  elements: [
    el('image', [0, 0, 200, 340], { tone: '#1f2937', radius: 0 }, { name: 'Car photo' }),
    el('label', [224, 38, 200, 14], { text: 'VLERËSIM FALAS', color: '#c2610c', weight: 700 }),
    el('heading', [224, 58, 272, 34], { text: 'Sa vlen makina juaj?', color: '#111827' }),
    el('text', [224, 100, 272, 46], {
      text: 'Merrni një ofertë me shkrim brenda 24 orësh. Pa detyrime, pa pazare.',
      color: '#4b5563',
    }),
    el('input', [224, 162, 272, 44], {
      name: 'plate',
      label: 'Targa e makinës',
      placeholder: 'Targa, p.sh. AA 123 BC',
      kind: 'plate',
    }),
    el('button', [224, 216, 272, 46], {
      text: 'Vlerëso makinën',
      action: 'submit',
      thanks: 'Faleminderit! Ju kontaktojmë brenda 24 orësh.',
    }),
    el(
      'text',
      [224, 276, 272, 20],
      { text: 'Jo tani', align: 'center', size: 13, color: '#6b7280', action: 'close' },
      { name: 'Not now' },
    ),
    el('close', [478, 12, 30, 30]),
  ],
});
