import { cta, heading, lead, paragraph, toc } from '../blocks';
import { defineTemplate } from '../categories';

export default defineTemplate({
  id: 'listicle',
  category: 'lists',
  name: { en: 'Listicle', sq: 'Listë', de: 'Liste' },
  description: {
    en: 'Numbered points under one promise, with contents and a next step',
    sq: 'Pika të numëruara nën një premtim, me përmbajtje dhe hapin tjetër',
    de: 'Nummerierte Punkte unter einem Versprechen, mit Inhalt und nächstem Schritt',
  },
  blocks: [
    lead('The promise of the list: what the reader gets from these points.'),
    toc(),
    heading('1. The first point'),
    paragraph('Why it is on the list, and what to do with it.'),
    heading('2. The second point'),
    paragraph('Why it is on the list, and what to do with it.'),
    heading('3. The third point'),
    paragraph('Why it is on the list, and what to do with it.'),
    cta('Ready for the next step?', 'One sentence on what to do now.', 'Get started'),
  ],
});
