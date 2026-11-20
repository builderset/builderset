import { author, divider, heading, lead, paragraph, pullQuote } from '../blocks';
import { defineTemplate } from '../categories';

export default defineTemplate({
  id: 'opinion',
  category: 'essentials',
  name: { en: 'Opinion', sq: 'Opinion', de: 'Kommentar' },
  description: {
    en: 'A clear claim, the case for it, the other side and who wrote it',
    sq: 'Një pohim i qartë, argumentet, pala tjetër dhe autori',
    de: 'Eine klare These, die Gründe, die Gegenseite und wer schreibt',
  },
  blocks: [
    lead('State your view in one sentence the reader could quote.'),
    heading('Why I think so'),
    paragraph('Give your strongest reason first, with the fact or the story behind it.'),
    pullQuote('The line from this piece you most want people to remember.'),
    heading('The other side'),
    paragraph('Put the best argument against you fairly, then answer it.'),
    divider(),
    author(),
  ],
});
