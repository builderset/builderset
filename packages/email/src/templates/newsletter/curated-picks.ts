import { pad, row, section } from '../../core';
import {
  button,
  eyebrow,
  footerSection,
  heading,
  masthead,
  paragraph,
  product,
  subheading,
} from '../blocks';
import { defineTemplate } from '../categories';

const SHOP = '{{ brand.website }}/shop';

export default defineTemplate({
  id: 'curated-picks',
  category: 'newsletter',
  name: { en: 'Curated picks', sq: 'Zgjedhjet tona', de: 'Unsere Auswahl' },
  description: {
    en: 'Hand-picked products in a two-column grid, then three small gifts',
    sq: 'Produkte të zgjedhura në dy kolona, pastaj tre dhurata të vogla',
    de: 'Ausgewählte Produkte in zwei Spalten, danach drei kleine Geschenkideen',
  },
  subject: 'Six things we can’t stop using this season',
  preheader: 'Our team’s favourites, picked by hand — plus three gifts under €25.',
  settings: { font: 'dm-sans', backdrop: '#f5f5f4' },
  sections: [
    masthead([
      ['New in', '{{ brand.website }}/new'],
      ['Shop', SHOP],
      ['Gifts', '{{ brand.website }}/gifts'],
    ]),
    section({ padding: pad(32, 32, 8) }, [
      row('100', [
        [
          eyebrow('Picked for you', { align: 'center' }),
          heading('Six things we can’t stop using', { align: 'center' }),
          paragraph(
            'Every season our team picks the things they actually use, day in, day out. No sponsored spots — just what we would buy again.',
            { align: 'center' },
          ),
        ],
      ]),
    ]),
    section({ padding: pad(8, 32, 16) }, [
      row('50-50', [
        [
          product(
            'The everyday tote',
            '€59',
            'Waxed canvas that gets better with age, and a pocket that fits a laptop.',
            SHOP,
          ),
        ],
        [
          product(
            'Stoneware mug, set of two',
            '€32',
            'Thick walls keep coffee hot for longer. Made by a small studio in Portugal.',
            SHOP,
          ),
        ],
      ]),
      row('50-50', [
        [
          product(
            'Linen throw',
            '€74',
            'Soft from the first wash, warm enough for cool evenings on the balcony.',
            SHOP,
            { oldPrice: '€89' },
          ),
        ],
        [
          product(
            'Pocket notebook',
            '€14',
            'Dot-grid pages that lie flat, with a cover that survives a year in a bag.',
            SHOP,
          ),
        ],
      ]),
    ]),
    section({ background: 'brand.background', padding: pad(24, 32) }, [
      row('100', [[subheading('Small gifts under €25', { align: 'center' })]]),
      row('33-33-33', [
        [product('Beeswax candle', '€18', 'Burns for 30 hours.', SHOP, { align: 'center' })],
        [product('Olive wood spoon', '€12', 'Carved by hand.', SHOP, { align: 'center' })],
        [product('Wool socks', '€22', 'Warm, and they last.', SHOP, { align: 'center' })],
      ]),
    ]),
    section({ padding: pad(24, 32, 8) }, [
      row('100', [[button('Browse the whole collection', SHOP, { align: 'center' })]]),
    ]),
    footerSection({ marketing: true }),
  ],
});
