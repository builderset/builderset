import { pad, row, section } from '../../core';
import {
  details,
  eyebrow,
  footerSection,
  formatted,
  heading,
  logoHeader,
  outlineButton,
  panel,
  paragraph,
  subheading,
  v,
} from '../blocks';
import { defineTemplate } from '../categories';

export default defineTemplate({
  id: 'refund-issued',
  category: 'orders',
  name: { en: 'Refund issued', sq: 'Rimbursimi u krye', de: 'Erstattung veranlasst' },
  description: {
    en: 'How much is coming back, to where, and when the reader will see it',
    sq: 'Sa kthehet, ku, dhe kur do ta shohë lexuesi',
    de: 'Wie viel zurückkommt, wohin, und wann es ankommt',
  },
  subject: 'Your refund for order {{ order.number }} is on its way',
  preheader: 'We have refunded {{ refund.amount | money }} to {{ refund.method }}.',
  settings: { font: 'inter', backdrop: '#f5f3ff' },
  variables: ['order.number', 'order.url', 'refund.amount', 'refund.method', 'refund.issued_at'],
  sections: [
    logoHeader('left'),
    section({ padding: pad(16, 32, 8) }, [
      row('100', [
        [
          eyebrow('Refund issued', { color: '#6d28d9' }),
          heading(['We’ve refunded ', formatted('refund.amount', 'money')], { size: 30 }),
          paragraph([
            'Hi ',
            v('recipient.name', 'there'),
            ', your refund for order ',
            v('order.number'),
            ' is on its way back to you. Sorry it didn’t work out this time.',
          ]),
          details([
            ['Order', '{{ order.number }}'],
            ['Refund', '{{ refund.amount | money }}'],
            ['Refunded to', '{{ refund.method }}'],
            ['Issued on', '{{ refund.issued_at | date_long }}'],
          ]),
        ],
      ]),
    ]),
    section({ padding: pad(8, 32, 24) }, [
      row('100', [
        panel(
          [
            subheading('When will I see it?', { size: 17, padding: pad(0, 0, 4) }),
            paragraph(
              'Refunds usually show up within 5–10 business days, depending on your bank. If it hasn’t arrived after that, reply to this email and we’ll chase it for you.',
              { size: 15, padding: pad(0) },
            ),
          ],
          { background: '#ede9fe' },
        ),
      ]),
      row('100', [[outlineButton('View your order', '{{ order.url }}', { size: 15 })]], {
        padding: pad(12, 0, 0),
      }),
    ]),
    footerSection(),
  ],
});
