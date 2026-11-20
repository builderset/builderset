import { step } from '../../core';
import { defineTemplate } from '../categories';
import {
  choice,
  consent,
  date,
  email,
  fullName,
  half,
  locked,
  paragraph,
  phone,
  textarea,
  time,
  yesNo,
} from '../fields';

export default defineTemplate({
  id: 'appointment',
  category: 'bookings',
  name: { en: 'Appointment', sq: 'Takim', de: 'Termin' },
  description: {
    en: 'The service, a day and a time, then the person’s details — with a confirmation email',
    sq: 'Shërbimi, dita dhe ora, pastaj të dhënat e personit — me email konfirmimi',
    de: 'Die Leistung, Tag und Uhrzeit, dann die Angaben zur Person — mit Bestätigungs-E-Mail',
  },
  title: 'Book an appointment',
  intro: 'Choose a service and a time that suits you. We confirm every booking by email.',
  settings: {
    progress: 'numbers',
    buttons: { submit: 'Book', next: 'Next' },
    after: {
      title: 'See you on {{date}} at {{time}}',
      message:
        'Thank you, {{name}}. We have your request for {{service}} and will confirm it by email shortly.',
    },
    autoReply: {
      enabled: true,
      to: 'email',
      subject: 'Your appointment on {{date}} at {{time}}',
      body: 'Hello {{name}},\n\nThank you for booking {{service}} on {{date}} at {{time}}. We will confirm the time within a few hours. If you need to change it, just reply to this email.\n\nSee you soon,\nThe team',
    },
    style: { accent: '#0d9488' },
  },
  steps: [
    step('Service', [
      choice(
        'Which service would you like?',
        'service',
        ['Consultation (30 min)', 'Full appointment (60 min)', 'Follow-up (15 min)'],
        'cards',
        locked('A booking needs a service'),
      ),
      yesNo('Have you been here before?', 'returning'),
    ]),
    step('Date & time', [
      date('Date', 'date', { ...half, ...locked('Bookings need a date') }),
      time('Time', 'time', { ...half, ...locked('Bookings need a time') }),
      paragraph(
        'We confirm every booking within a few hours. If your time is already taken, we suggest the nearest free one.',
      ),
    ]),
    step('Your details', [
      fullName(),
      email({ ...half, ...locked('The confirmation goes to this address') }),
      phone({ ...half, required: true, help: 'Only to reach you if something changes.' }),
      textarea('Anything we should know?', 'notes', { rows: 3 }),
      consent(
        'I agree that my details are stored to manage my booking, as described in the privacy policy.',
        'privacy policy',
      ),
    ]),
  ],
});
