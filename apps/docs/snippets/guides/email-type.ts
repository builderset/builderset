import type { EmailType } from '@builderset/email';

/**
 * One kind of email your code sends, and the variables it fills in. Keep it
 * next to the code that sends this email, so the data you pass at send time
 * and the variables the editor offers cannot disagree.
 */
export const orderShipped: EmailType = {
  key: 'order_shipped',
  label: { en: 'Order shipped' },
  category: 'orders',
  kind: 'transactional',
  variables: [
    {
      name: 'order',
      label: { en: 'Order' },
      type: 'string',
      children: [
        { name: 'number', label: { en: 'Number' }, type: 'string', required: true },
        { name: 'total', label: { en: 'Total' }, type: 'money' },
        { name: 'shipped_on', label: { en: 'Shipped on' }, type: 'date' },
        {
          name: 'items',
          label: { en: 'Items' },
          type: 'list',
          fields: [
            { name: 'title', label: { en: 'Title' }, type: 'string' },
            { name: 'price', label: { en: 'Price' }, type: 'money' },
          ],
        },
      ],
    },
    { name: 'tracking_url', label: { en: 'Tracking link' }, type: 'url', required: true },
  ],
  // A template for this type must use the tracking link somewhere.
  mustUse: ['tracking_url'],
  samples: {
    default: {
      order: {
        number: 'A-1042',
        total: 120,
        shipped_on: '2026-03-01',
        items: [{ title: 'Brake pads', price: 60 }],
      },
      tracking_url: 'https://track.example/A-1042',
    },
  },
};
