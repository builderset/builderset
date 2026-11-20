import { callout, faq, howto, lead, toc } from '../blocks';
import { defineTemplate } from '../categories';

export default defineTemplate({
  id: 'howto',
  category: 'guides',
  name: { en: 'How-to guide', sq: 'Udhëzues hap pas hapi', de: 'Anleitung' },
  description: {
    en: 'Numbered steps with a time, a tip and the questions people ask',
    sq: 'Hapa të numëruar me kohë, një këshillë dhe pyetjet e zakonshme',
    de: 'Nummerierte Schritte mit Zeitangabe, ein Tipp und häufige Fragen',
  },
  blocks: [
    lead('What the reader will be able to do at the end, and how long it takes.'),
    toc(),
    howto('How to do it', 15, [
      ['Get ready', 'What to have at hand before you start.'],
      ['Do the first part', 'The step, in one or two sentences.'],
      ['Finish', 'The last step, and how to tell it worked.'],
    ]),
    callout('tip', 'Tip', 'The shortcut, or the mistake most people make here.'),
    faq('Questions people ask', [
      ['What if it does not work?', 'What to check first.'],
      ['Can I skip a step?', 'Which ones, and what happens if you do.'],
    ]),
  ],
});
