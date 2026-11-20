import { pad, row, section } from '../../core';
import {
  button,
  eyebrow,
  footerSection,
  heading,
  logoHeader,
  outlineButton,
  panel,
  paragraph,
  subheading,
  v,
} from '../blocks';
import { defineTemplate } from '../categories';

/** A numbered step: a big number on the left, what to do on the right. */
const step = (number: string, title: string, text: string) =>
  row(
    '25-75',
    [
      [
        heading(number, {
          size: 44,
          weight: '800',
          color: 'brand.primary',
          align: 'center',
          padding: pad(0),
        }),
      ],
      [
        subheading(title, { size: 18, padding: pad(0, 0, 4) }),
        paragraph(text, { size: 15, padding: pad(0) }),
      ],
    ],
    { verticalAlign: 'middle', padding: pad(12, 0) },
  );

export default defineTemplate({
  id: 'getting-started',
  category: 'welcome',
  name: { en: 'Getting started', sq: 'Hapat e parë', de: 'Erste Schritte' },
  description: {
    en: 'Three numbered steps to get set up, and where to find help',
    sq: 'Tre hapa të numëruar për t’u nisur, dhe ku të gjeni ndihmë',
    de: 'Drei nummerierte Schritte zum Einrichten, und wo es Hilfe gibt',
  },
  subject: 'Three steps to get the most out of {{ brand.name }}',
  preheader: 'Most people are set up in under ten minutes. Here is how.',
  settings: { font: 'inter', backdrop: '#f8fafc' },
  variables: ['account.url'],
  sections: [
    logoHeader('left'),
    section({ padding: pad(16, 32, 8) }, [
      row('100', [
        [
          eyebrow('Getting started'),
          heading(['Let’s get you set up, ', v('recipient.name', 'friend')]),
          paragraph(
            'Most people are up and running in under ten minutes. These three steps are the fastest way there.',
          ),
        ],
      ]),
      step(
        '01',
        'Complete your profile',
        'Add a photo and a few details, so the people you work with know it’s you.',
      ),
      step(
        '02',
        'Bring in what you already have',
        'Import your contacts and files in one go — we keep everything exactly as it was.',
      ),
      step(
        '03',
        'Invite your team',
        'Work is better together. Invite up to five people free on every plan.',
      ),
      row('100', [[button('Open your dashboard', '{{ account.url }}', { paddingX: 32 })]], {
        padding: pad(8, 0, 16),
      }),
    ]),
    section({ padding: pad(8, 32, 24) }, [
      row('100', [
        panel([
          subheading('Need a hand?', { size: 18, padding: pad(0, 0, 4) }),
          paragraph(
            'Our help centre answers the most common questions, and our team replies to every email within one working day.',
            { size: 15 },
          ),
          outlineButton('Visit the help centre', '{{ brand.website }}/help', { size: 14 }),
        ]),
      ]),
    ]),
    footerSection({ marketing: true }),
  ],
});
