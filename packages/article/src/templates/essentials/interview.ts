import { faq, image, lead, paragraph, quote, related } from '../blocks';
import { defineTemplate } from '../categories';

export default defineTemplate({
  id: 'interview',
  category: 'essentials',
  name: { en: 'Interview', sq: 'Intervistë', de: 'Interview' },
  description: {
    en: 'Who they are, a portrait, the questions and answers',
    sq: 'Kush është, një portret, pyetjet dhe përgjigjet',
    de: 'Wer es ist, ein Porträt, Fragen und Antworten',
  },
  blocks: [
    lead('Who you spoke to, and why their view matters now.'),
    image('Name, role — where and when the photo was taken.'),
    paragraph('Set the scene: where you met and what the conversation was about.'),
    quote('The answer that sums the interview up.', 'Name, role'),
    faq('The conversation', [
      ['Your first question?', 'Their answer, in their words.'],
      ['Your second question?', 'Their answer, in their words.'],
      ['Your third question?', 'Their answer, in their words.'],
    ]),
    related(),
  ],
});
