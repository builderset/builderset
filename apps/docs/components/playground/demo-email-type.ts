import type { EmailType } from '@builderset/email';

/**
 * The playground's email type: a few things an email can say — a code, an
 * order, an appointment, a coupon — with sample values, so "Example data" and
 * the Variables tab have something to show. A real project declares one type
 * per email its code sends (see the Email types guide).
 */
export const demoEmailType: EmailType = {
  key: 'playground',
  label: { en: 'Playground', sq: 'Playground', de: 'Playground' },
  category: 'demo',
  kind: 'transactional',
  variables: [
    { name: 'code', label: { en: 'One-time code' }, type: 'string' },
    { name: 'code_expires_minutes', label: { en: 'Code expires in (minutes)' }, type: 'number' },
    {
      name: 'order',
      label: { en: 'Order' },
      type: 'string',
      children: [
        { name: 'number', label: { en: 'Number' }, type: 'string' },
        { name: 'date', label: { en: 'Date' }, type: 'date' },
        { name: 'total', label: { en: 'Total' }, type: 'money' },
        { name: 'url', label: { en: 'Order page' }, type: 'url' },
        {
          name: 'items',
          label: { en: 'Items' },
          type: 'list',
          fields: [
            { name: 'name', label: { en: 'Name' }, type: 'string' },
            { name: 'quantity', label: { en: 'Quantity' }, type: 'number' },
            { name: 'price', label: { en: 'Price' }, type: 'money' },
          ],
        },
      ],
    },
    {
      name: 'appointment',
      label: { en: 'Appointment' },
      type: 'string',
      children: [
        { name: 'service', label: { en: 'Service' }, type: 'string' },
        { name: 'starts_at', label: { en: 'Starts at' }, type: 'datetime' },
        { name: 'with', label: { en: 'With' }, type: 'string' },
        { name: 'location', label: { en: 'Location' }, type: 'string' },
      ],
    },
    {
      name: 'coupon',
      label: { en: 'Coupon' },
      type: 'string',
      children: [
        { name: 'code', label: { en: 'Code' }, type: 'string' },
        { name: 'discount', label: { en: 'Discount' }, type: 'string' },
        { name: 'expires_at', label: { en: 'Expires on' }, type: 'date' },
      ],
    },
  ],
  samples: {
    default: {
      recipient: { name: 'Arben', email: 'arben@example.com' },
      code: '482 913',
      code_expires_minutes: 10,
      order: {
        number: 'A-1042',
        date: '2026-11-18',
        total: 129.9,
        url: 'https://example.com/orders/A-1042',
        items: [
          { name: 'Brake pads', quantity: 2, price: 59.95 },
          { name: 'Wiper blades', quantity: 1, price: 10 },
        ],
      },
      appointment: {
        service: 'Annual inspection',
        starts_at: '2026-11-26T09:30:00Z',
        with: 'Elira',
        location: 'Rruga e Durrësit 12, Tiranë',
      },
      coupon: { code: 'WINTER20', discount: '20%', expires_at: '2026-12-31' },
    },
  },
};
