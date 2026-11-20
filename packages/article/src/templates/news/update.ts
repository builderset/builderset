import { heading, lead, newsletter, paragraph, timeline } from '../blocks';
import { defineTemplate } from '../categories';

export default defineTemplate({
  id: 'update',
  category: 'news',
  name: { en: 'Progress update', sq: 'Përditësim', de: 'Fortschrittsbericht' },
  description: {
    en: 'What happened lately, in date order, and what comes next',
    sq: 'Çfarë ndodhi së fundmi, sipas datës, dhe çfarë vjen më pas',
    de: 'Was zuletzt geschah, nach Datum, und was als Nächstes kommt',
  },
  blocks: [
    lead('The period this covers, and the headline of it.'),
    timeline([
      ['Date', 'The first milestone', 'What happened, in a sentence.'],
      ['Date', 'The second milestone', 'What happened, in a sentence.'],
      ['Date', 'Today', 'Where things stand now.'],
    ]),
    heading('What comes next'),
    paragraph('The next steps, and when the reader will hear more.'),
    newsletter('Get the next update', 'One email when there is news. Nothing else.', 'Subscribe'),
  ],
});
