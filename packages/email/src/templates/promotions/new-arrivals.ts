import { pad, row, section } from '../../core';
import {
  button,
  divider,
  eyebrow,
  footerSection,
  heading,
  image,
  masthead,
  paragraph,
  product,
} from '../blocks';
import { defineTemplate } from '../categories';

const NEW = '{{ brand.website }}/new';

export default defineTemplate({
  id: 'new-arrivals',
  category: 'promotions',
  name: { en: 'New arrivals', sq: 'Të sapoardhurat', de: 'Neuheiten' },
  description: {
    en: 'A big picture, then each new product beside its own photo',
    sq: 'Një foto e madhe, pastaj secili produkt i ri pranë fotos së vet',
    de: 'Ein großes Bild, dann jedes neue Produkt neben seinem eigenen Foto',
  },
  subject: 'Just landed: new this week at {{ brand.name }}',
  preheader: 'Three new pieces we think you’ll love — in limited numbers.',
  settings: { font: 'outfit', backdrop: '#f5f5f4' },
  sections: [
    masthead([
      ['Women', '{{ brand.website }}/women'],
      ['Men', '{{ brand.website }}/men'],
      ['New in', NEW],
    ]),
    section({ padding: pad(0) }, [
      row('100', [[image('The new collection, photographed outdoors', { padding: pad(0) })]]),
    ]),
    section({ padding: pad(32, 32, 8) }, [
      row('100', [
        [
          eyebrow('Just landed'),
          heading('New this week', { size: 34 }),
          paragraph(
            'Three pieces we have been waiting all season for. They are made in small batches, so when they are gone, they are gone.',
          ),
        ],
      ]),
    ]),
    section({ padding: pad(8, 32, 16) }, [
      row('100', [
        [
          product(
            'The field jacket',
            '€149',
            'Waxed cotton, a corduroy collar and pockets that fit everything you carry.',
            NEW,
            { layout: 'side', buttonLabel: 'Shop now' },
          ),
          divider(),
          product(
            'Relaxed linen shirt',
            '€65',
            'Washed for softness, cut a little loose, and cool on the warmest days.',
            NEW,
            { layout: 'side', buttonLabel: 'Shop now' },
          ),
          divider(),
          product(
            'Everyday trainers',
            '€95',
            'Recycled materials, a cushioned sole, and white that stays white.',
            NEW,
            { layout: 'side', buttonLabel: 'Shop now' },
          ),
        ],
      ]),
    ]),
    section({ padding: pad(8, 32, 24) }, [
      row('100', [[button('See all new arrivals', NEW, { align: 'center', paddingX: 32 })]]),
    ]),
    footerSection({ marketing: true }),
  ],
});
