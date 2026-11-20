import { cta, faq, heading, lead, list, paragraph, toc } from '../blocks';
import { defineTemplate } from '../categories';

export default defineTemplate({
  id: 'buyers-guide',
  category: 'reviews',
  name: { en: 'Buyer’s guide', sq: 'Udhëzues blerjeje', de: 'Kaufberatung' },
  description: {
    en: 'What to look for before buying, what to avoid and what to ask',
    sq: 'Çfarë të shikoni para blerjes, çfarë të shmangni dhe çfarë të pyesni',
    de: 'Worauf man vor dem Kauf achtet, was man meidet und was man fragt',
  },
  blocks: [
    lead('Who is buying, and what they need to know before they do.'),
    toc(),
    heading('What to look for'),
    list(['The first thing to check.', 'The second.', 'The third.'], 'check'),
    heading('What to avoid'),
    paragraph('The traps, and how to spot them.'),
    faq('Before you buy', [
      ['How much should it cost?', 'A fair range, and what changes it.'],
      ['What should I ask the seller?', 'The questions that reveal the most.'],
    ]),
    cta('Want a second opinion?', 'One sentence on how you can help.', 'Ask us'),
  ],
});
