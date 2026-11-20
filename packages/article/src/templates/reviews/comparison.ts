import { callout, heading, lead, paragraph, table } from '../blocks';
import { defineTemplate } from '../categories';

export default defineTemplate({
  id: 'comparison',
  category: 'reviews',
  name: { en: 'Comparison', sq: 'Krahasim', de: 'Vergleich' },
  description: {
    en: 'Two or three options side by side in a table, and which to choose',
    sq: 'Dy ose tre mundësi krah për krah në tabelë, dhe cilën të zgjidhni',
    de: 'Zwei oder drei Optionen nebeneinander in einer Tabelle, und welche passt',
  },
  blocks: [
    lead('The choice the reader faces, and the short answer.'),
    table(
      ['', 'Option A', 'Option B'],
      [
        ['Price', '', ''],
        ['What it is best at', '', ''],
        ['What it lacks', '', ''],
      ],
    ),
    heading('Choose option A if…'),
    paragraph('Who it is for, and why.'),
    heading('Choose option B if…'),
    paragraph('Who it is for, and why.'),
    callout('info', 'Our pick', 'Which one you would choose, and the one reason why.'),
  ],
});
