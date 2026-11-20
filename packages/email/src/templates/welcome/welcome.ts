import { pad, row, section } from '../../core';
import {
  button,
  footerSection,
  heading,
  image,
  logoHeader,
  note,
  paragraph,
  subheading,
  v,
} from '../blocks';
import { defineTemplate } from '../categories';

/** One reason to be glad they joined: a small picture, a title, a line. */
const reason = (alt: string, title: string, text: string) => [
  image(alt, { width: 64 }),
  subheading(title, { size: 17, align: 'center', padding: pad(4, 0) }),
  paragraph(text, { size: 14, align: 'center', padding: pad(0) }),
];

export default defineTemplate({
  id: 'welcome',
  category: 'welcome',
  name: { en: 'Welcome', sq: 'Mirëseardhje', de: 'Willkommen' },
  description: {
    en: 'A warm hello with a big picture, three reasons in three columns and one button',
    sq: 'Një përshëndetje e ngrohtë me një foto të madhe, tre arsye në tre kolona dhe një buton',
    de: 'Ein herzliches Hallo mit großem Bild, drei Gründen in drei Spalten und einem Knopf',
  },
  subject: 'Welcome to {{ brand.name }}, {{ recipient.name }}!',
  preheader: 'We’re glad you’re here. Here is what to look forward to.',
  settings: { font: 'nunito', backdrop: '#fff7ed' },
  sections: [
    logoHeader(),
    section({ padding: pad(0) }, [
      row('100', [[image('A warm welcome from the team', { padding: pad(0) })]]),
    ]),
    section({ padding: pad(32, 40, 16) }, [
      row('100', [
        [
          heading(['Welcome to ', v('brand.name'), ', ', v('recipient.name', 'friend'), '!'], {
            size: 32,
            align: 'center',
          }),
          paragraph(
            'We’re so glad you’re here. Your account is all set, and here is what you can look forward to:',
            { align: 'center' },
          ),
        ],
      ]),
    ]),
    section({ padding: pad(8, 24, 24) }, [
      row('33-33-33', [
        reason(
          'A small icon of a star',
          'Made for you',
          'Recommendations that get better the more you use us.',
        ),
        reason(
          'A small icon of a gift',
          'Members-only offers',
          'Early access to sales and the occasional surprise.',
        ),
        reason(
          'A small icon of a chat bubble',
          'Real people',
          'Questions? Our team answers within one working day.',
        ),
      ]),
      row('100', [
        [
          button('Start exploring', '{{ brand.website }}', { align: 'center', paddingX: 32 }),
          note('Questions? Just reply to this email — a real person reads every one.', {
            align: 'center',
          }),
        ],
      ]),
    ]),
    footerSection({ marketing: true }),
  ],
});
