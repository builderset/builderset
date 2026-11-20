import { pad, row, section } from '../../core';
import {
  bold,
  divider,
  eyebrow,
  footerSection,
  heading,
  logoHeader,
  note,
  paragraph,
  quote,
  subheading,
  v,
} from '../blocks';
import { defineTemplate } from '../categories';

export default defineTemplate({
  id: 'editorial',
  category: 'newsletter',
  name: { en: 'Editorial letter', sq: 'Letër editoriale', de: 'Editorial' },
  description: {
    en: 'A long, personal letter in a serif face: no pictures, one quote, a signature',
    sq: 'Një letër e gjatë, personale me shkronja serif: pa foto, një citim, një nënshkrim',
    de: 'Ein langer, persönlicher Brief in Serifenschrift: ohne Bilder, ein Zitat, eine Unterschrift',
  },
  subject: 'A letter from us: why we are slowing down on purpose',
  preheader: 'Five minutes on what we are changing this year, and why.',
  settings: {
    font: 'lora',
    fontSize: 17,
    lineHeight: 1.75,
    backdrop: '#f3efe7',
    background: '#fffdf8',
    textColor: '#292524',
    headingColor: '#1c1917',
    linkColor: '#9a3412',
  },
  sections: [
    logoHeader('left', { padding: pad(40, 48, 8) }),
    section({ padding: pad(16, 48, 8) }, [
      row('100', [
        [
          eyebrow('A letter from the founder', { color: '#9a3412' }),
          heading('Why we are slowing down on purpose', { size: 34, weight: '600' }),
          note('Issue 12 · A five-minute read'),
          divider({ width: 20, align: 'left', color: '#d6d3d1' }),
          paragraph(['Dear ', v('recipient.name', 'friend'), ',']),
          paragraph(
            'This time last year we shipped something new every week. It felt like progress. Looking back, most of it was noise: features few people used, and changes that made the things you relied on harder to find.',
          ),
          paragraph(
            'So this year we are doing less, on purpose. Fewer releases, each one finished properly. More time listening before we build. And a promise that what works for you today will keep working tomorrow.',
          ),
          quote('“The best thing we can build next year might be nothing at all.”', '', {
            size: 22,
            accent: '#9a3412',
            padding: pad(16, 0),
          }),
          subheading('What this means for you'),
          paragraph(
            'You will hear from us less often, and when you do it will be about something worth your time. We will tell you what is coming months ahead, and ask you before we change anything you use every day.',
          ),
          paragraph(
            'If there is one thing you would like us to fix before anything else, tell us. Every reply lands in my inbox, and I read all of them.',
          ),
          paragraph(
            ['Until next month,', '\n', bold('Your name'), ', founder of ', v('brand.name')],
            {
              padding: pad(16, 0, 8),
            },
          ),
          note('P.S. Just hit reply — this letter comes from a real address, and a real person.'),
        ],
      ]),
    ]),
    footerSection({ marketing: true }),
  ],
});
