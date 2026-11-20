import { pad, row, section } from '../../core';
import {
  button,
  coupon,
  eyebrow,
  footerSection,
  heading,
  logoHeader,
  note,
  paragraph,
  v,
} from '../blocks';
import { defineTemplate } from '../categories';

export default defineTemplate({
  id: 'coupon-code',
  category: 'promotions',
  name: { en: 'Coupon code', sq: 'Kod zbritjeje', de: 'Gutscheincode' },
  description: {
    en: 'A personal discount: the code in a dashed box, until when it works, and a button',
    sq: 'Një zbritje personale: kodi në një kuti me vija, deri kur vlen, dhe një buton',
    de: 'Ein persönlicher Rabatt: der Code im gestrichelten Rahmen, bis wann er gilt, und ein Knopf',
  },
  subject: '{{ recipient.name }}, here is {{ coupon.discount }} off your next order',
  preheader: 'Your code: {{ coupon.code }}. Valid until {{ coupon.expires_at | date }}.',
  settings: { font: 'poppins', backdrop: '#fdf2f8', background: '#fdf2f8' },
  variables: ['coupon.code', 'coupon.discount', 'coupon.expires_at'],
  sections: [
    logoHeader(),
    section({ background: '#ffffff', radius: 20, padding: pad(40, 40, 32) }, [
      row('100', [
        [
          eyebrow('A little thank-you', { color: '#e11d48', align: 'center' }),
          heading(['Here’s ', v('coupon.discount'), ' off your next order'], {
            size: 30,
            align: 'center',
          }),
          paragraph(
            [
              'Thanks for being with us, ',
              v('recipient.name', 'friend'),
              '. Use this code at checkout — it’s yours alone.',
            ],
            { align: 'center' },
          ),
          coupon('{{ coupon.code }}', 'Valid until {{ coupon.expires_at | date_long }}', {
            background: '#fff1f2',
            borderColor: '#e11d48',
            textColor: '#9f1239',
            padding: pad(16, 24),
          }),
          button('Shop now', '{{ brand.website }}', {
            align: 'center',
            background: '#e11d48',
            radius: 40,
            paddingX: 40,
          }),
          note('One use per customer. Cannot be combined with other offers.', {
            align: 'center',
          }),
        ],
      ]),
    ]),
    footerSection({ marketing: true }),
  ],
});
