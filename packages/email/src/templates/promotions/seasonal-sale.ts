import { pad, row, section } from '../../core';
import {
  button,
  eyebrow,
  footerSection,
  heading,
  image,
  logoHeader,
  note,
  paragraph,
  product,
  subheading,
} from '../blocks';
import { defineTemplate } from '../categories';

const SALE = '{{ brand.website }}/sale';

/** A reason to buy now, in a line: free shipping, easy returns. */
const perk = (text: string) => [
  paragraph(text, { size: 13, weight: '700', align: 'center', padding: pad(0) }),
];

export default defineTemplate({
  id: 'seasonal-sale',
  category: 'promotions',
  name: { en: 'Seasonal sale', sq: 'Ulje sezonale', de: 'Saisonschlussverkauf' },
  description: {
    en: 'A bold red banner, the bestsellers at their sale prices and the perks of buying now',
    sq: 'Një banderolë e kuqe e fortë, më të shiturat me çmimet e uljes dhe përfitimet e blerjes tani',
    de: 'Ein kräftiges rotes Banner, die Bestseller zum Aktionspreis und die Vorteile beim Kauf jetzt',
  },
  subject: 'Up to 40% off — our end-of-season sale starts now',
  preheader: 'This weekend only. No code needed: prices are already marked down.',
  settings: { font: 'montserrat', backdrop: '#fef2f2' },
  sections: [
    logoHeader('center', { background: '#ffffff', padding: pad(24, 24, 16) }),
    section({ background: '#991b1b', padding: pad(48, 32, 40) }, [
      row('100', [
        [
          eyebrow('The end-of-season sale', { color: '#fecaca', align: 'center' }),
          heading('Up to 40% off', {
            size: 52,
            weight: '900',
            transform: 'uppercase',
            color: '#ffffff',
            align: 'center',
          }),
          paragraph(
            'Our biggest sale of the season — this weekend only. No code needed: prices are already marked down.',
            { color: '#fee2e2', align: 'center' },
          ),
          button('Shop the sale', SALE, {
            align: 'center',
            background: '#ffffff',
            textColor: '#991b1b',
            weight: '700',
            paddingX: 40,
            transform: 'uppercase',
            letterSpacing: 1,
          }),
        ],
      ]),
    ]),
    section({ background: '#ffffff', padding: pad(0) }, [
      row('100', [[image('This season’s collection', { padding: pad(0) })]]),
    ]),
    section({ background: '#ffffff', padding: pad(32, 24, 16) }, [
      row('100', [[subheading('Bestsellers, now on sale', { align: 'center' })]]),
      row('33-33-33', [
        [
          product('Wool overshirt', '€69', 'Warm enough for autumn.', SALE, {
            oldPrice: '€115',
            buttonLabel: 'Shop now',
          }),
        ],
        [
          product('Leather boots', '€119', 'Resoled, not replaced.', SALE, {
            oldPrice: '€189',
            buttonLabel: 'Shop now',
          }),
        ],
        [
          product('Knit scarf', '€24', 'Soft merino, six colours.', SALE, {
            oldPrice: '€39',
            buttonLabel: 'Shop now',
          }),
        ],
      ]),
    ]),
    section({ background: 'brand.background', padding: pad(20, 24) }, [
      row(
        '33-33-33',
        [perk('Free shipping over €50'), perk('Free returns for 30 days'), perk('Secure checkout')],
        { verticalAlign: 'middle' },
      ),
    ]),
    section({ background: '#ffffff', padding: pad(16, 24, 8) }, [
      row('100', [
        [note('The sale ends Sunday at midnight, while stock lasts.', { align: 'center' })],
      ]),
    ]),
    footerSection({ marketing: true }),
  ],
});
