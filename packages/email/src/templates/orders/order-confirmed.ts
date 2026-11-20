import { pad, row, section } from '../../core';
import {
  button,
  details,
  eyebrow,
  footerSection,
  heading,
  lineItems,
  logoHeader,
  note,
  paragraph,
  subheading,
  v,
} from '../blocks';
import { defineTemplate } from '../categories';

export default defineTemplate({
  id: 'order-confirmed',
  category: 'orders',
  name: { en: 'Order confirmed', sq: 'Porosia u konfirmua', de: 'Bestellbestätigung' },
  description: {
    en: 'The order’s number and date, its lines and totals, where it goes and how it was paid',
    sq: 'Numri dhe data e porosisë, artikujt dhe totali, ku dërgohet dhe si u pagua',
    de: 'Nummer und Datum der Bestellung, Positionen und Summen, Lieferadresse und Zahlungsart',
  },
  subject: 'Order {{ order.number }} confirmed — thank you!',
  preheader: 'We’re getting it ready. Here is everything you ordered.',
  settings: { font: 'inter', backdrop: '#f1f5f9' },
  variables: [
    'order.number',
    'order.date',
    'order.items',
    'order.subtotal',
    'order.shipping',
    'order.tax',
    'order.total',
    'order.shipping_address',
    'order.payment_method',
    'order.url',
  ],
  sections: [
    logoHeader('left'),
    section({ padding: pad(16, 32, 8) }, [
      row('100', [
        [
          eyebrow('Order confirmed', { color: '#15803d' }),
          heading(['Thanks for your order, ', v('recipient.name', 'friend'), '!'], { size: 26 }),
          paragraph(
            'We’ve received your order and are getting it ready. We’ll email you again as soon as it ships.',
          ),
          details([
            ['Order number', '{{ order.number }}'],
            ['Order date', '{{ order.date | date_long }}'],
          ]),
        ],
      ]),
    ]),
    section({ padding: pad(8, 32) }, [
      row('100', [
        [
          subheading('Your order'),
          lineItems(
            'order.items',
            [
              ['Item', 'name'],
              ['Qty', 'quantity', 'center'],
              ['Price', 'price', 'right'],
            ],
            ['Subtotal', '{{ order.subtotal | money }}'],
            { headerBackground: 'brand.background' },
          ),
          details([
            ['Shipping', '{{ order.shipping | money }}'],
            ['Tax', '{{ order.tax | money }}'],
            ['Total', '{{ order.total | money }}'],
          ]),
        ],
      ]),
    ]),
    section({ padding: pad(8, 32) }, [
      row(
        '50-50',
        [
          [
            subheading('Shipping to', { size: 16, padding: pad(0, 0, 4) }),
            paragraph([v('order.shipping_address')], { size: 15, padding: pad(0) }),
          ],
          [
            subheading('Paid with', { size: 16, padding: pad(0, 0, 4) }),
            paragraph([v('order.payment_method')], { size: 15, padding: pad(0) }),
          ],
        ],
        { background: 'brand.background', padding: pad(20) },
      ),
    ]),
    section({ padding: pad(16, 32, 24) }, [
      row('100', [
        [
          button('View your order', '{{ order.url }}', { align: 'center', paddingX: 32 }),
          note('Questions about your order? Reply to this email and we will help.', {
            align: 'center',
          }),
        ],
      ]),
    ]),
    footerSection(),
  ],
});
