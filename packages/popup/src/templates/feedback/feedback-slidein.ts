import { el } from '../../core';
import { defineTemplate } from '../categories';

export default defineTemplate({
  id: 'feedback-slidein',
  category: 'feedback',
  name: { en: 'Quick feedback', sq: 'Mendim i shpejtë', de: 'Kurzes Feedback' },
  description: {
    en: 'One question in a corner, near the end of the page',
    sq: 'Një pyetje në cep, afër fundit të faqes',
    de: 'Eine Frage in der Ecke, kurz vor dem Seitenende',
  },
  format: {
    type: 'slidein',
    position: 'bottom-right',
    display: { trigger: 'scroll', scroll: 80, frequency: 'until' },
    motion: { enter: 'side' },
  },
  elements: [
    el('heading', [20, 22, 290, 26], {
      text: 'Gjetët atë që kërkonit?',
      size: 18,
      color: '#111827',
    }),
    el('text', [20, 54, 320, 36], {
      text: 'Një fjali na mjafton. E lexojmë çdo përgjigje.',
      size: 13,
      color: '#4b5563',
    }),
    el('input', [20, 100, 320, 44], {
      name: 'comment',
      label: 'Mendimi juaj',
      placeholder: 'Çfarë mund të bëjmë më mirë?',
      kind: 'text',
      size: 14,
    }),
    el('button', [20, 158, 140, 42], {
      text: 'Dërgo',
      size: 14,
      action: 'submit',
      thanks: 'Faleminderit për mendimin!',
    }),
    el(
      'text',
      [172, 168, 168, 22],
      { text: 'Jo tani', size: 13, color: '#6b7280', action: 'close' },
      { name: 'Not now' },
    ),
    el('close', [320, 12, 28, 28]),
  ],
});
