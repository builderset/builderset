import { definitions, faq, heading, image, lead, paragraph, takeaways } from '../blocks';
import { defineTemplate } from '../categories';

export default defineTemplate({
  id: 'explainer',
  category: 'guides',
  name: { en: 'Explainer', sq: 'Shpjegues', de: 'Erklärstück' },
  description: {
    en: 'A topic from the ground up: the short answer, the terms, the questions',
    sq: 'Një temë nga fillimi: përgjigjja e shkurtër, termat, pyetjet',
    de: 'Ein Thema von Grund auf: die kurze Antwort, die Begriffe, die Fragen',
  },
  blocks: [
    lead('The question this answers, and the answer in one sentence.'),
    takeaways('The short version', [
      'What it is.',
      'Why it matters to the reader.',
      'What to do about it.',
    ]),
    heading('How it works'),
    paragraph('Walk through it in plain words, as you would to a friend.'),
    image('A diagram or photo that makes it clearer.'),
    heading('Words you will meet'),
    definitions([
      ['A term', 'What it means, in one sentence.'],
      ['Another term', 'What it means, in one sentence.'],
    ]),
    faq('Common questions', [
      ['The question everyone asks?', 'The plain answer.'],
      ['The follow-up?', 'The plain answer.'],
    ]),
  ],
});
