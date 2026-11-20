import { pad, row, section } from '../../core';
import {
  button,
  details,
  divider,
  eyebrow,
  footerSection,
  formatted,
  heading,
  lineItems,
  logoHeader,
  note,
  v,
} from '../blocks';
import { defineTemplate } from '../categories';

export default defineTemplate({
  id: 'receipt',
  category: 'orders',
  name: { en: 'Payment receipt', sq: 'Faturë pagese', de: 'Zahlungsbeleg' },
  description: {
    en: 'The amount paid up top, then what it was for, how it was paid and a PDF to keep',
    sq: 'Shuma e paguar lart, pastaj për çfarë ishte, si u pagua dhe një PDF për ta ruajtur',
    de: 'Der bezahlte Betrag oben, dann wofür, wie bezahlt wurde und ein PDF zum Aufbewahren',
  },
  subject: 'Your receipt from {{ brand.name }} — {{ receipt.number }}',
  preheader: 'Paid {{ receipt.amount | money }} on {{ receipt.paid_at | date }}.',
  settings: { font: 'ibm-plex-sans', backdrop: '#f4f4f5' },
  variables: [
    'receipt.number',
    'receipt.amount',
    'receipt.paid_at',
    'receipt.payment_method',
    'receipt.items',
    'receipt.pdf_url',
  ],
  sections: [
    logoHeader('left'),
    section({ padding: pad(16, 32, 8) }, [
      row(
        '67-33',
        [
          [
            eyebrow('Receipt', { color: 'brand.muted' }),
            heading([formatted('receipt.amount', 'money')], { size: 40, padding: pad(0) }),
            note(['Paid on ', formatted('receipt.paid_at', 'date_long')], { padding: pad(0) }),
          ],
          [
            note(['Receipt', '\n', v('receipt.number')], {
              align: 'right',
              color: 'brand.text',
              size: 14,
            }),
          ],
        ],
        { verticalAlign: 'bottom' },
      ),
      row('100', [[divider()]]),
    ]),
    section({ padding: pad(0, 32, 8) }, [
      row('100', [
        [
          lineItems(
            'receipt.items',
            [
              ['Description', 'description'],
              ['Amount', 'amount', 'right'],
            ],
            ['Total paid', '{{ receipt.amount | money }}'],
          ),
          details([
            ['Receipt number', '{{ receipt.number }}'],
            ['Payment method', '{{ receipt.payment_method }}'],
            ['Billed to', '{{ recipient.email }}'],
          ]),
        ],
      ]),
    ]),
    section({ padding: pad(8, 32, 24) }, [
      row('100', [
        [
          button('Download the PDF', '{{ receipt.pdf_url }}', { background: 'brand.text' }),
          note(
            'Keep this email for your records. Need an invoice with your company’s details? Reply and we will send one.',
          ),
        ],
      ]),
    ]),
    footerSection(),
  ],
});
