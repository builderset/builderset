import { gallery, heading, lead, paragraph, prosCons, rating, stats } from '../blocks';
import { defineTemplate } from '../categories';

export default defineTemplate({
  id: 'review',
  category: 'reviews',
  name: { en: 'Review', sq: 'Recension', de: 'Test' },
  description: {
    en: 'Photos, the verdict, what was good and bad, the numbers',
    sq: 'Foto, vlerësimi, të mirat dhe të këqijat, shifrat',
    de: 'Bilder, das Urteil, Stärken und Schwächen, die Zahlen',
  },
  blocks: [
    lead('What you reviewed, for whom, and your verdict in a sentence.'),
    gallery(),
    rating('The product', 4, 'The verdict in one sentence.'),
    prosCons(['A strength.', 'Another strength.'], ['A weakness.']),
    stats([
      ['0', 'The first number that matters'],
      ['0', 'The second'],
      ['0', 'The third'],
    ]),
    heading('Living with it'),
    paragraph('What it was like over days or weeks, beyond the first impression.'),
  ],
});
