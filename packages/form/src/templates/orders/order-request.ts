import { step } from '../../core';
import { defineTemplate } from '../categories';
import {
  address,
  checks,
  choice,
  consent,
  date,
  dropdown,
  email,
  fullName,
  half,
  locked,
  number,
  phone,
  source,
  textarea,
  when,
} from '../fields';

export default defineTemplate({
  id: 'order-request',
  category: 'orders',
  name: { en: 'Order request', sq: 'Kërkesë për porosi', de: 'Bestellanfrage' },
  description: {
    en: 'A product and quantity, delivery or pickup, payment, then the buyer — in three steps',
    sq: 'Produkti dhe sasia, dorëzim apo marrje në dyqan, pagesa, pastaj blerësi — në tre hapa',
    de: 'Produkt und Menge, Lieferung oder Abholung, Zahlung, dann die Kundendaten — in drei Schritten',
  },
  title: 'Place an order',
  intro:
    'Choose what you would like and how you want to get it. We confirm every order by email before we prepare it.',
  settings: {
    progress: 'numbers',
    buttons: { submit: 'Place order', next: 'Next' },
    after: {
      title: 'Order received, {{name}}',
      message:
        'We will confirm your order of {{quantity}} × {{product}} by email within a few hours.',
    },
    autoReply: {
      enabled: true,
      to: 'email',
      subject: 'We got your order: {{quantity}} × {{product}}',
      body: 'Hello {{name}},\n\nThank you for your order of {{quantity}} × {{product}} ({{delivery}}). We will check availability and confirm it, with the total, within a few hours.\n\nBest wishes,\nThe team',
    },
    style: { accent: '#dc2626' },
  },
  steps: [
    step('Your order', [
      dropdown(
        'Product',
        'product',
        ['Classic box', 'Premium box', 'Family pack', 'Gift box'],
        locked('An order needs a product'),
      ),
      number('Quantity', 'quantity', {
        ...half,
        defaultValue: 1,
        ...locked('An order needs a quantity'),
        ...checks({ min: 1, max: 100 }),
      }),
      choice('Size', 'size', ['S', 'M', 'L', 'XL'], 'buttons', half),
      textarea('Notes for the order', 'notes', {
        rows: 3,
        placeholder: 'A gift message, a colour, anything else',
      }),
    ]),
    step('Delivery & payment', [
      choice(
        'Delivery or pickup?',
        'delivery',
        ['Delivery to my address', 'Pickup in store'],
        'cards',
        { required: true },
      ),
      address('Delivery address', {
        required: true,
        ...when('delivery', 'is', 'Delivery to my address'),
      }),
      date('Preferred date', 'delivery_date', { help: 'We do our best to meet it.' }),
      choice(
        'Payment',
        'payment',
        ['Cash on delivery', 'Card on delivery', 'Bank transfer'],
        'list',
        {
          required: true,
        },
      ),
    ]),
    step('Your details', [
      fullName(),
      email({ ...half, ...locked('The order confirmation goes to this address') }),
      phone({ ...half, required: true, help: 'For the courier.' }),
      consent('I agree to the terms of sale and the privacy policy.', 'terms of sale'),
      source(),
    ]),
  ],
});
