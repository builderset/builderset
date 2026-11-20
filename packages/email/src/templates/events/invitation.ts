import { pad, row, section } from '../../core';
import {
  button,
  details,
  eyebrow,
  footerSection,
  formatted,
  heading,
  image,
  logoHeader,
  note,
  outlineButton,
  panel,
  paragraph,
  subheading,
  v,
  type Line,
} from '../blocks';
import { defineTemplate } from '../categories';

/** One of the three facts — date, time, place — on a tinted tile. */
const fact = (label: string, value: Line) =>
  panel(
    [
      eyebrow(label, { color: '#b45309', align: 'center', size: 11 }),
      paragraph(value, { weight: '700', align: 'center', size: 15, padding: pad(0) }),
    ],
    { background: '#fdf6ec', padding: pad(16, 12), radius: 8 },
  );

export default defineTemplate({
  id: 'invitation',
  category: 'events',
  name: { en: 'Invitation', sq: 'Ftesë', de: 'Einladung' },
  description: {
    en: 'An elegant invitation: the date, time and place on three tiles, the programme, and RSVP',
    sq: 'Një ftesë elegante: data, ora dhe vendi në tri pllaka, programi, dhe konfirmimi',
    de: 'Eine elegante Einladung: Datum, Uhrzeit und Ort auf drei Kacheln, das Programm und die Zusage',
  },
  subject: 'You’re invited: {{ event.name }}',
  preheader: '{{ event.starts_at | date_long }} at {{ event.location }}. We’d love to see you.',
  settings: {
    font: 'lato',
    backdrop: '#292524',
    background: '#fffbf5',
    headingColor: '#1c1917',
  },
  variables: [
    'event.name',
    'event.starts_at',
    'event.location',
    'event.rsvp_url',
    'event.calendar_url',
  ],
  sections: [
    logoHeader('center', { padding: pad(32, 24, 16) }),
    section({ padding: pad(0) }, [
      row('100', [[image('The venue, lit up in the evening', { padding: pad(0) })]]),
    ]),
    section({ padding: pad(36, 40, 8) }, [
      row('100', [
        [
          eyebrow('You’re invited', { color: '#b45309', align: 'center' }),
          heading([v('event.name')], {
            font: 'playfair-display',
            size: 40,
            weight: '600',
            align: 'center',
          }),
          paragraph(
            [
              'Dear ',
              v('recipient.name', 'friend'),
              ', we would be delighted to have you with us for an evening of good company, short talks and dinner.',
            ],
            { align: 'center' },
          ),
        ],
      ]),
      row(
        '33-33-33',
        [
          fact('Date', [formatted('event.starts_at', 'date')]),
          fact('Time', [formatted('event.starts_at', 'time')]),
          fact('Place', [v('event.location')]),
        ],
        { gap: 8, padding: pad(8, 0) },
      ),
    ]),
    section({ padding: pad(16, 40, 8) }, [
      row('100', [
        [
          subheading('The evening', { font: 'playfair-display', align: 'center' }),
          details(
            [
              ['18:30', 'Doors open, welcome drinks'],
              ['19:00', 'Short talks and a first look at what is next'],
              ['20:00', 'Dinner and conversation'],
            ],
            { borderColor: '#e7e0d4' },
          ),
        ],
      ]),
    ]),
    section({ padding: pad(16, 40, 32) }, [
      row('50-50', [
        [
          button('Accept the invitation', '{{ event.rsvp_url }}', {
            align: 'center',
            background: '#1c1917',
          }),
        ],
        [
          outlineButton('Add to calendar', '{{ event.calendar_url }}', {
            align: 'center',
            textColor: '#1c1917',
            borderColor: '#1c1917',
          }),
        ],
      ]),
      row('100', [
        [
          note('Please let us know by the end of the week, so we can save you a seat.', {
            align: 'center',
          }),
        ],
      ]),
    ]),
    footerSection({ marketing: true }),
  ],
});
