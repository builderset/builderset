import { callout, heading, lead, list, paragraph } from '../blocks';
import { defineTemplate } from '../categories';

export default defineTemplate({
  id: 'checklist',
  category: 'guides',
  name: { en: 'Checklist', sq: 'Listë kontrolli', de: 'Checkliste' },
  description: {
    en: 'Everything to have and to do, in ticked groups',
    sq: 'Gjithçka që duhet pasur dhe bërë, në grupe me shenja',
    de: 'Alles, was man braucht und tun muss, in abhakbaren Gruppen',
  },
  blocks: [
    lead('What this checklist is for, and when to go through it.'),
    heading('Before'),
    list(['The first thing to have ready.', 'The second.', 'The third.'], 'check'),
    heading('On the day'),
    list(['What to do first.', 'What to check.', 'What to keep.'], 'check'),
    callout('warning', 'Do not forget', 'The one item people most often miss.'),
    paragraph('What happens after, and where to get help.'),
  ],
});
