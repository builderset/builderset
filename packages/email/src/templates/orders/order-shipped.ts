import { pad, row, section } from '../../core';
import {
  bold,
  button,
  details,
  footerSection,
  forEach,
  heading,
  image,
  logoHeader,
  panel,
  paragraph,
  subheading,
  v,
  whenPresent,
} from '../blocks';
import { defineTemplate } from '../categories';

/** One stage of the delivery, filled in brand colour once it is reached. */
const stage = (label: string, reached: boolean) =>
  panel(
    [
      paragraph(reached ? `✓ ${label}` : label, {
        size: 14,
        weight: '700',
        align: 'center',
        color: reached ? '#ffffff' : 'brand.muted',
        padding: pad(0),
      }),
    ],
    { background: reached ? 'brand.primary' : 'brand.background', padding: pad(12), radius: 8 },
  );

export default defineTemplate({
  id: 'order-shipped',
  category: 'orders',
  name: { en: 'Order shipped', sq: 'Porosia u nis', de: 'Versandbestätigung' },
  description: {
    en: 'A parcel picture, the delivery stages, tracking details and what is in the box',
    sq: 'Një foto pakete, fazat e dërgesës, të dhënat e gjurmimit dhe çfarë ka në kuti',
    de: 'Ein Paketbild, die Lieferschritte, die Sendungsverfolgung und was im Paket ist',
  },
  subject: 'Your order {{ order.number }} is on its way',
  preheader: 'Expected {{ shipment.estimated_delivery | date }}. Track it any time.',
  settings: { font: 'inter', backdrop: '#f0f9ff' },
  variables: [
    'order.number',
    'order.items',
    'shipment.carrier',
    'shipment.tracking_number',
    'shipment.tracking_url',
    'shipment.estimated_delivery',
  ],
  sections: [
    logoHeader(),
    section({ padding: pad(0) }, [
      row('100', [[image('A parcel on its way', { padding: pad(0) })]]),
    ]),
    section({ padding: pad(32, 32, 8) }, [
      row('100', [
        [
          heading('Your order is on its way', { align: 'center' }),
          paragraph(
            [
              'Good news, ',
              v('recipient.name', 'there'),
              ' — order ',
              bold(v('order.number')),
              ' has left our warehouse and is with the carrier.',
            ],
            { align: 'center' },
          ),
        ],
      ]),
      row('33-33-33', [stage('Ordered', true), stage('Shipped', true), stage('Delivered', false)], {
        gap: 8,
        stackOnMobile: false,
        padding: pad(8, 0),
      }),
    ]),
    section({ padding: pad(8, 32) }, [
      row('100', [
        [
          details([
            ['Carrier', '{{ shipment.carrier }}'],
            ['Tracking number', '{{ shipment.tracking_number }}'],
            ['Expected delivery', '{{ shipment.estimated_delivery | date_long }}'],
          ]),
          whenPresent('shipment.tracking_url', [
            button('Track your parcel', '{{ shipment.tracking_url }}', {
              align: 'center',
              paddingX: 32,
            }),
          ]),
        ],
      ]),
    ]),
    section({ padding: pad(8, 32, 24) }, [
      row('100', [
        [
          subheading('In this parcel', { size: 18 }),
          forEach('order.items', [
            paragraph([v('item.name'), ' × ', v('item.quantity')], {
              size: 15,
              padding: pad(4, 0),
            }),
          ]),
        ],
      ]),
    ]),
    footerSection(),
  ],
});
