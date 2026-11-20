import { heading, image, lead, paragraph, takeaways } from '../blocks';
import { defineTemplate } from '../categories';

export default defineTemplate({
  id: 'standard',
  category: 'essentials',
  name: { en: 'Standard article', sq: 'Artikull standard', de: 'Standardartikel' },
  description: {
    en: 'An opening, two sections, a picture and what to remember',
    sq: 'Hyrje, dy pjesë, një foto dhe çfarë të mbahet mend',
    de: 'Einstieg, zwei Abschnitte, ein Bild und das Wichtigste',
  },
  blocks: [
    lead('Open with the one thing the reader came for, in two or three sentences.'),
    heading('The first point'),
    paragraph('Explain it plainly. One idea per paragraph; short sentences read faster.'),
    image('What the picture shows, and why it is here.'),
    heading('The second point'),
    paragraph('Add the detail, an example, or what most people get wrong about it.'),
    takeaways('In short', [
      'The first thing to remember.',
      'The second thing to remember.',
      'What to do next.',
    ]),
  ],
});
