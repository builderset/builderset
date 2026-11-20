import { callout, cta, heading, image, lead, list } from '../blocks';
import { defineTemplate } from '../categories';

export default defineTemplate({
  id: 'announcement',
  category: 'news',
  name: { en: 'Announcement', sq: 'Njoftim', de: 'Ankündigung' },
  description: {
    en: 'What is new, what it means for the reader, and what to do',
    sq: 'Çfarë ka të re, çfarë do të thotë për lexuesin, dhe çfarë të bëjë',
    de: 'Was neu ist, was es für den Leser bedeutet, und was zu tun ist',
  },
  blocks: [
    lead('The news in one sentence, and the date it starts.'),
    image(),
    heading('What changes for you'),
    list(['The first change.', 'The second change.', 'What stays the same.']),
    callout('info', 'When', 'The date and time, and anything to do before then.'),
    cta('Try it now', 'One sentence on where to start.', 'Find out more'),
  ],
});
