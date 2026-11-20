import { step } from '../../core';
import { defineTemplate } from '../categories';
import {
  checks,
  choice,
  choices,
  consent,
  dropdown,
  email,
  fullName,
  half,
  locked,
  source,
  text,
  when,
  yesNo,
} from '../fields';

export default defineTemplate({
  id: 'event-registration',
  category: 'bookings',
  name: { en: 'Event registration', sq: 'Regjistrim në eveniment', de: 'Event-Anmeldung' },
  description: {
    en: 'Who is coming, in person or online, the sessions and any needs — capped at 200 places',
    sq: 'Kush vjen, fizikisht apo online, seancat dhe nevojat — deri në 200 vende',
    de: 'Wer kommt, vor Ort oder online, die Sessions und besondere Wünsche — begrenzt auf 200 Plätze',
  },
  title: 'Register for the event',
  intro: 'Save your place in a minute. Your ticket arrives by email right after you register.',
  settings: {
    buttons: { submit: 'Register', next: 'Next' },
    after: {
      title: 'You’re in, {{name}}!',
      message: 'Your {{ticket}} ticket is on its way to {{email}}. We look forward to seeing you.',
    },
    autoReply: {
      enabled: true,
      to: 'email',
      subject: 'Your ticket: {{ticket}}',
      body: 'Hello {{name}},\n\nYou are registered. Your place is saved for: {{sessions}}.\n\nWe will send the programme and the practical details a week before the event.\n\nSee you there,\nThe team',
    },
    limits: {
      oncePer: 'email',
      maxResponses: 200,
      closedMessage: 'Registration is closed — every place is taken. Thank you for your interest!',
    },
    style: { accent: '#7c3aed' },
  },
  steps: [
    step('You', [
      fullName(),
      email({ ...half, ...locked('The ticket is sent to this address') }),
      text('Organisation', 'organisation', half),
      text('Job title', 'job_title', half),
    ]),
    step('Your place', [
      choice(
        'How will you attend?',
        'ticket',
        ['In person', 'Online'],
        'cards',
        locked('Registration needs a ticket type'),
      ),
      choices(
        'Which sessions will you join?',
        'sessions',
        ['Morning keynote', 'Workshops', 'Panel discussion', 'Evening networking'],
        'list',
        { required: true, ...checks({ min: 1 }) },
      ),
      dropdown(
        'Dietary needs',
        'diet',
        ['None', 'Vegetarian', 'Vegan', 'Gluten-free', 'Halal', 'Other'],
        when('ticket', 'is', 'In person'),
      ),
      yesNo('Do you need step-free access?', 'access', when('ticket', 'is', 'In person')),
      consent(
        'I agree that my details are stored to organise the event, as described in the privacy policy.',
        'privacy policy',
      ),
      source(),
    ]),
  ],
});
