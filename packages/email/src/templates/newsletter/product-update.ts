import { pad, row, section } from '../../core';
import {
  bullets,
  button,
  eyebrow,
  footerSection,
  heading,
  image,
  logoHeader,
  paragraph,
  quote,
  subheading,
  video,
} from '../blocks';
import { defineTemplate } from '../categories';

/** A new feature: its name and what it does for the reader. */
const feature = (title: string, text: string) => [
  subheading(title, { size: 18, padding: pad(0, 0, 4) }),
  paragraph(text, { size: 15, padding: pad(0) }),
];

export default defineTemplate({
  id: 'product-update',
  category: 'newsletter',
  name: { en: 'Product update', sq: 'Përditësim produkti', de: 'Produktneuheiten' },
  description: {
    en: 'A dark hero, a short video, the new features side by side and a customer’s words',
    sq: 'Hapje e errët, një video e shkurtër, risitë krah për krah dhe fjalët e një klienti',
    de: 'Dunkler Aufmacher, kurzes Video, die Neuerungen nebeneinander und ein Kundenzitat',
  },
  subject: 'New in {{ brand.name }}: three things you asked for',
  preheader: 'Faster search, shared folders and a dark mode — all live today.',
  settings: { font: 'plus-jakarta-sans', backdrop: '#e0e7ff' },
  sections: [
    logoHeader('center', { background: '#ffffff' }),
    section({ background: '#1e1b4b', padding: pad(40, 40, 32) }, [
      row('100', [
        [
          eyebrow('Product update', { color: '#a5b4fc', align: 'center' }),
          heading('Three things you asked for, live today', {
            color: '#ffffff',
            size: 34,
            align: 'center',
          }),
          paragraph(
            'You told us what slows you down. This release fixes the three requests we heard most — and it is already switched on in your account.',
            { color: '#c7d2fe', align: 'center' },
          ),
          video('Watch the two-minute tour', '{{ brand.website }}/whats-new', {
            padding: pad(16, 0, 8),
          }),
        ],
      ]),
    ]),
    section({ background: '#ffffff', padding: pad(32, 32, 8) }, [
      row(
        '50-50',
        [
          [image('Faster search, in the app', { radius: 8 })],
          feature(
            'Search that keeps up with you',
            'Results appear as you type, and they now cover comments and attachments too.',
          ),
        ],
        { verticalAlign: 'middle', padding: pad(0, 0, 16) },
      ),
      row(
        '50-50',
        [
          feature(
            'Folders you can share',
            'Invite your team to a folder once, and everything you put in it is shared with them.',
          ),
          [image('A shared folder with three people', { radius: 8 })],
        ],
        { verticalAlign: 'middle', reverseOnMobile: true, padding: pad(0, 0, 16) },
      ),
      row(
        '50-50',
        [
          [image('The app in dark mode', { radius: 8 })],
          feature(
            'A dark mode that is easy on the eyes',
            'It follows your device’s setting, or you can switch it on yourself in Settings.',
          ),
        ],
        { verticalAlign: 'middle' },
      ),
    ]),
    section({ background: '#ffffff', padding: pad(8, 32, 32) }, [
      row('100', [
        [
          subheading('Also improved'),
          bullets(
            [
              'Exports to PDF keep your formatting.',
              'Notifications can be snoozed until the morning.',
              'Pages load up to twice as fast on slow connections.',
            ],
            'check',
          ),
          quote(
            '“Shared folders alone save our team an hour every week. We stopped emailing files to each other.”',
            'Maria, operations lead',
            { background: '#eef2ff', padding: pad(16) },
          ),
          button('See everything that is new', '{{ brand.website }}/whats-new', {
            align: 'center',
            background: '#4338ca',
          }),
        ],
      ]),
    ]),
    footerSection({ marketing: true }),
  ],
});
