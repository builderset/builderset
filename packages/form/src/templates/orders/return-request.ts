import { step } from '../../core';
import { defineTemplate } from '../categories';
import {
  choice,
  consent,
  date,
  dropdown,
  email,
  files,
  fullName,
  half,
  locked,
  paragraph,
  text,
  textarea,
  when,
} from '../fields';

export default defineTemplate({
  id: 'return-request',
  category: 'orders',
  name: { en: 'Return request', sq: 'Kërkesë për kthim', de: 'Rücksendung' },
  description: {
    en: 'The order and item, why it goes back — photos when it arrived damaged — and a refund or exchange',
    sq: 'Porosia dhe artikulli, pse kthehet — foto kur ka ardhur i dëmtuar — dhe rimbursim ose ndërrim',
    de: 'Bestellung und Artikel, der Grund — Fotos bei Beschädigung — und Erstattung oder Umtausch',
  },
  title: 'Return an item',
  intro:
    'You can return any item within 30 days of delivery. Fill this in and we will email you a free return label.',
  settings: {
    buttons: { submit: 'Request a return', next: 'Next' },
    after: {
      title: 'Return requested',
      message:
        'Thank you, {{name}}. Your return label for order {{order_number}} is on its way to {{email}}.',
    },
    autoReply: {
      enabled: true,
      to: 'email',
      subject: 'Your return for order {{order_number}}',
      body: 'Hello {{name}},\n\nWe got your return request for order {{order_number}}. Your free return label follows in a separate email within one working day. Pack the item in its original packaging if you still have it.\n\nOnce it arrives, we send {{resolution}} within five working days.\n\nThe team',
    },
  },
  steps: [
    step('Your order', [
      text('Order number', 'order_number', {
        ...half,
        placeholder: 'e.g. 10482',
        prefill: 'order',
        ...locked('Returns are matched to an order number'),
      }),
      date('Delivered on', 'delivered_on', half),
      fullName(),
      email({
        help: 'The one you ordered with.',
        ...locked('Return instructions go to this address'),
      }),
      text('Which item are you returning?', 'item', {
        required: true,
        placeholder: 'Name, colour and size',
      }),
    ]),
    step('The return', [
      choice(
        'Why are you returning it?',
        'reason',
        ['Wrong size', 'Not as described', 'Arrived damaged', 'Changed my mind', 'Something else'],
        'list',
        locked('A return needs a reason'),
      ),
      files('Photos of the damage', 'photos', ['jpg', 'png', 'heic'], {
        required: true,
        maxFiles: 5,
        ...when('reason', 'is', 'Arrived damaged'),
      }),
      textarea('Tell us more', 'reason_details', {
        rows: 3,
        required: true,
        ...when('reason', 'is', 'Something else'),
      }),
      choice(
        'What would you like instead?',
        'resolution',
        ['A refund', 'An exchange', 'Store credit'],
        'cards',
        {
          required: true,
        },
      ),
      dropdown(
        'New size',
        'new_size',
        ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
        when('resolution', 'is', 'An exchange'),
      ),
      paragraph(
        'Refunds go back to the way you paid, within five working days of the item reaching us.',
      ),
      consent(
        'I agree that my details are stored to handle my return, as described in the privacy policy.',
        'privacy policy',
      ),
    ]),
  ],
});
