import { pad, row, section } from '../../core';
import {
  button,
  coupon,
  details,
  footerSection,
  heading,
  image,
  logoHeader,
  note,
  outlineButton,
  paragraph,
  v,
} from '../blocks';
import { defineTemplate } from '../categories';

export default defineTemplate({
  id: 'booking-confirmed',
  category: 'events',
  name: { en: 'Booking confirmed', sq: 'Rezervimi u konfirmua', de: 'Buchungsbestätigung' },
  description: {
    en: 'A tick, the booking reference to quote, the details, a map and ways to change it',
    sq: 'Një shenjë, referenca e rezervimit, detajet, një hartë dhe si ta ndryshoni',
    de: 'Ein Haken, die Buchungsnummer, die Details, eine Karte und wie man umbucht',
  },
  subject: 'Booking confirmed: {{ booking.service }} on {{ booking.starts_at | date }}',
  preheader: 'Your reference is {{ booking.reference }}. We look forward to seeing you.',
  settings: { font: 'manrope', backdrop: '#f0fdf4' },
  variables: [
    'booking.reference',
    'booking.service',
    'booking.starts_at',
    'booking.guests',
    'booking.location',
    'booking.url',
    'booking.directions_url',
  ],
  sections: [
    logoHeader(),
    section({ padding: pad(16, 40, 8) }, [
      row('100', [
        [
          image('A green tick in a circle', { width: 72 }),
          heading('Your booking is confirmed', { size: 28, align: 'center' }),
          paragraph(
            [
              'Thank you, ',
              v('recipient.name', 'friend'),
              '. Everything is set and we look forward to seeing you.',
            ],
            { align: 'center' },
          ),
          coupon('{{ booking.reference }}', 'Your booking reference — quote it if you call us', {
            background: '#f0fdf4',
            borderColor: '#16a34a',
            textColor: '#14532d',
          }),
        ],
      ]),
    ]),
    section({ padding: pad(8, 40) }, [
      row('100', [
        [
          details([
            ['What', '{{ booking.service }}'],
            ['When', '{{ booking.starts_at | datetime }}'],
            ['Guests', '{{ booking.guests }}'],
            ['Where', '{{ booking.location }}'],
          ]),
          image('A map showing how to find us', { radius: 8 }),
        ],
      ]),
    ]),
    section({ padding: pad(8, 40, 24) }, [
      row('50-50', [
        [
          button('Manage booking', '{{ booking.url }}', {
            align: 'center',
            background: '#16a34a',
          }),
        ],
        [
          outlineButton('Get directions', '{{ booking.directions_url }}', {
            align: 'center',
            textColor: '#15803d',
            borderColor: '#15803d',
          }),
        ],
      ]),
      row('100', [
        [
          note(
            'Need to change something? You can change or cancel free of charge up to 24 hours before.',
            { align: 'center' },
          ),
        ],
      ]),
    ]),
    footerSection(),
  ],
});
