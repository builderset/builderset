import { step } from '../../core';
import { defineTemplate } from '../categories';
import {
  checks,
  consent,
  date,
  dropdown,
  email,
  fullName,
  half,
  heading,
  locked,
  number,
  phone,
  text,
  textarea,
  time,
  when,
  yesNo,
} from '../fields';

export default defineTemplate({
  id: 'table-reservation',
  category: 'bookings',
  name: { en: 'Table reservation', sq: 'Rezervim tavoline', de: 'Tischreservierung' },
  description: {
    en: 'A day, a time and how many guests, with seating, occasions and allergies',
    sq: 'Dita, ora dhe sa vetë, me vendin, rastin e veçantë dhe alergjitë',
    de: 'Tag, Uhrzeit und Anzahl der Gäste, mit Sitzplatz, Anlass und Allergien',
  },
  title: 'Reserve a table',
  intro: 'Book your table online. For groups larger than twelve, please call us.',
  settings: {
    buttons: { submit: 'Reserve a table' },
    after: {
      title: 'A table for {{guests}} on {{date}}',
      message: 'Thank you, {{name}}. We will confirm your table for {{time}} by email shortly.',
    },
    autoReply: {
      enabled: true,
      to: 'email',
      subject: 'Your table for {{guests}} on {{date}}',
      body: 'Hello {{name}},\n\nThank you for your reservation: a table for {{guests}} on {{date}} at {{time}}. We will confirm it shortly. If your plans change, just reply to this email.\n\nWe look forward to welcoming you.',
    },
    style: { look: 'warm', accent: '#b45309', font: 'georgia' },
  },
  steps: [
    step('Reservation', [
      heading('Your table'),
      date('Date', 'date', { ...half, ...locked('A reservation needs a date') }),
      time('Time', 'time', { ...half, ...locked('A reservation needs a time') }),
      number('Guests', 'guests', {
        ...half,
        defaultValue: 2,
        ...locked('We need to know how many to seat'),
        ...checks({ min: 1, max: 12, message: 'For more than 12 guests, please call us.' }),
      }),
      dropdown('Seating', 'seating', ['No preference', 'Inside', 'Terrace', 'At the bar'], half),
      yesNo('Is it a special occasion?', 'occasion'),
      text('What are you celebrating?', 'occasion_note', {
        placeholder: 'A birthday, an anniversary…',
        ...when('occasion', 'is', 'yes'),
      }),
      heading('Your details'),
      fullName(),
      phone({ ...half, required: true }),
      email({ ...half, ...locked('The confirmation goes to this address') }),
      textarea('Allergies or requests', 'requests', { rows: 3 }),
      consent(
        'I agree that my details are stored to manage my reservation, as described in the privacy policy.',
        'privacy policy',
      ),
    ]),
  ],
});
