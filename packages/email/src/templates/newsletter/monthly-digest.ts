import { pad, row, section } from '../../core';
import {
  button,
  divider,
  eyebrow,
  footerSection,
  heading,
  image,
  masthead,
  outlineButton,
  paragraph,
  subheading,
  survey,
  v,
} from '../blocks';
import { defineTemplate } from '../categories';

/** One of the shorter stories: a picture on the left, the words on the right. */
const story = (title: string, text: string, href: string) =>
  row(
    '33-67',
    [
      [image('A picture for this story', { radius: 8, padding: pad(0) })],
      [
        subheading(title, { size: 18, padding: pad(0, 0, 4) }),
        paragraph(text, { size: 15, padding: pad(0) }),
        outlineButton('Read more', href, { size: 14, paddingX: 16, paddingY: 8 }),
      ],
    ],
    { verticalAlign: 'middle', padding: pad(8, 0) },
  );

export default defineTemplate({
  id: 'monthly-digest',
  category: 'newsletter',
  name: { en: 'Monthly digest', sq: 'Përmbledhja mujore', de: 'Monatsrückblick' },
  description: {
    en: 'A masthead, the lead story, three shorter ones and a quick question',
    sq: 'Kreu, lajmi kryesor, tre lajme më të shkurtra dhe një pyetje e shpejtë',
    de: 'Kopfzeile, Hauptthema, drei kürzere Beiträge und eine kurze Frage',
  },
  subject: 'This month at {{ brand.name }}: the story worth your time',
  preheader: 'The lead story, three quick reads and one question for you.',
  settings: { font: 'inter', backdrop: '#eef2f6' },
  sections: [
    masthead([
      ['Blog', '{{ brand.website }}/blog'],
      ['Shop', '{{ brand.website }}/shop'],
      ['About', '{{ brand.website }}/about'],
    ]),
    section({ padding: pad(0) }, [
      row('100', [[image('The lead story’s picture', { padding: pad(0) })]]),
    ]),
    section({ padding: pad(28, 32, 8) }, [
      row('100', [
        [
          eyebrow('The monthly digest'),
          heading('The story of the month, told in one clear line'),
          paragraph([
            'Hi ',
            v('recipient.name', 'there'),
            ', here is what happened this month. Start with the story below — it is the one we would read first — then take your pick of three quicker ones.',
          ]),
          button('Read the full story', '{{ brand.website }}/blog'),
        ],
      ]),
    ]),
    section({ padding: pad(8, 32, 16) }, [
      row('100', [[divider(), subheading('Also this month')]]),
      story(
        'What we learned from a thousand customer calls',
        'Three patterns came up again and again. Here is what we are changing because of them.',
        '{{ brand.website }}/blog',
      ),
      story(
        'Behind the scenes: a day with our support team',
        'Who answers your emails, how they decide what comes first, and their favourite tools.',
        '{{ brand.website }}/blog',
      ),
      story(
        'Five small changes that save you an hour a week',
        'Quick wins from readers like you, each one set up in under five minutes.',
        '{{ brand.website }}/blog',
      ),
    ]),
    section({ background: 'brand.background', padding: pad(24, 32) }, [
      row('100', [
        [
          survey('How useful was this issue?', '{{ brand.website }}/feedback?score={score}', {
            scale: 5,
            lowLabel: 'Not very',
            highLabel: 'Very useful',
          }),
        ],
      ]),
    ]),
    footerSection({ marketing: true }),
  ],
});
