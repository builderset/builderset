import { pad, row, section } from '../../core';
import {
  button,
  coupon,
  footerSection,
  heading,
  image,
  logoHeader,
  panel,
  paragraph,
  subheading,
  survey,
  v,
} from '../blocks';
import { defineTemplate } from '../categories';

/** Something that changed since they last came. */
const change = (title: string, text: string) =>
  panel(
    [
      subheading(title, { size: 17, padding: pad(0, 0, 4) }),
      paragraph(text, { size: 14, padding: pad(0) }),
    ],
    { background: '#ffffff', padding: pad(20) },
  );

export default defineTemplate({
  id: 'we-miss-you',
  category: 'promotions',
  name: { en: 'We miss you', sq: 'Na mungon', de: 'Wir vermissen Sie' },
  description: {
    en: 'A win-back: what is new since their last visit, a welcome-back code and a quick question',
    sq: 'Për rikthim: çfarë ka të re që nga vizita e fundit, një kod mirëseardhjeje dhe një pyetje e shpejtë',
    de: 'Zur Rückgewinnung: was seit dem letzten Besuch neu ist, ein Willkommenscode und eine kurze Frage',
  },
  subject: 'We miss you, {{ recipient.name }}',
  preheader: 'A lot has changed since your last visit — and here is 15% off to see it.',
  settings: { font: 'nunito', backdrop: '#eff6ff' },
  sections: [
    logoHeader(),
    section({ padding: pad(24, 40, 8) }, [
      row('100', [
        [
          heading(['We miss you, ', v('recipient.name', 'friend'), '!'], {
            size: 34,
            align: 'center',
          }),
          paragraph(
            'It has been a while since your last visit, and a lot has changed. Here is what’s new — and a little something to welcome you back.',
            { align: 'center' },
          ),
          image('A friendly picture to say hello again', { radius: 12 }),
        ],
      ]),
    ]),
    section({ background: '#dbeafe', padding: pad(24, 24) }, [
      row('50-50', [
        change('A faster checkout', 'Pay in two taps, and save your details for next time.'),
        change('Free returns', 'Changed your mind? Send it back free, within 30 days.'),
      ]),
    ]),
    section({ padding: pad(24, 40, 16) }, [
      row('100', [
        [
          coupon('COMEBACK15', '15% off your next order, valid for 14 days'),
          button('Come back and see', '{{ brand.website }}', { align: 'center', paddingX: 32 }),
        ],
      ]),
    ]),
    section({ background: 'brand.background', padding: pad(24, 40) }, [
      row('100', [
        [
          survey(
            'If something made you stay away, we’d like to know. How was your last visit?',
            '{{ brand.website }}/feedback?score={score}',
            { scale: 5, lowLabel: 'Poor', highLabel: 'Great' },
          ),
        ],
      ]),
    ]),
    footerSection({
      marketing: true,
      text: [
        'Not interested any more? You can unsubscribe below — no hard feelings. ',
        v('brand.name'),
        ' will stop writing right away.',
      ],
    }),
  ],
});
