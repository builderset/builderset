import { step } from '../../core';
import { defineTemplate } from '../categories';
import {
  checks,
  choices,
  consent,
  email,
  fullName,
  half,
  locked,
  phone,
  slider,
  source,
  textarea,
  when,
  yesNo,
} from '../fields';

export default defineTemplate({
  id: 'volunteer',
  category: 'applications',
  name: { en: 'Volunteer sign-up', sq: 'Bëhu vullnetar', de: 'Ehrenamt-Anmeldung' },
  description: {
    en: 'Who they are, where they want to help, when they are free and how many hours',
    sq: 'Kush janë, ku duan të ndihmojnë, kur janë të lirë dhe sa orë',
    de: 'Wer sie sind, wo sie helfen möchten, wann sie Zeit haben und wie viele Stunden',
  },
  title: 'Become a volunteer',
  intro:
    'Every hour counts. Tell us how you would like to help and we will find the right place for you.',
  settings: {
    buttons: { submit: 'Sign me up', next: 'Next' },
    after: {
      title: 'Thank you, {{name}}!',
      message: 'We will be in touch within a week about helping with {{areas}}.',
    },
    autoReply: {
      enabled: true,
      to: 'email',
      subject: 'Thank you for volunteering, {{name}}',
      body: 'Hello {{name}},\n\nThank you for offering your time. Our volunteer coordinator will call or write within a week to find the right place for you.\n\nWith gratitude,\nThe team',
    },
    style: { look: 'warm', accent: '#16a34a' },
  },
  steps: [
    step('About you', [
      fullName(),
      email({ ...half, ...locked('Volunteer shifts are sent to this address') }),
      phone({ ...half, required: true }),
      yesNo('Are you 18 or older?', 'adult', {
        required: true,
        help: 'Some roles are only open to adults.',
      }),
    ]),
    step('How you can help', [
      choices(
        'Where would you like to help?',
        'areas',
        ['Events', 'Fundraising', 'Office & admin', 'Social media', 'Driving', 'Mentoring'],
        'cards',
        { ...locked('Volunteers are placed by the areas they choose'), ...checks({ min: 1 }) },
      ),
      yesNo('Do you have a driving licence?', 'licence', when('areas', 'is', 'Driving')),
      choices(
        'When are you free?',
        'availability',
        ['Weekday mornings', 'Weekday afternoons', 'Weekday evenings', 'Weekends'],
        'buttons',
      ),
      slider('Hours a month', 'hours', { min: 2, max: 40, step: 2, start: 8, unit: 'h' }),
      textarea('Any skills or experience we should know about?', 'skills', { rows: 3 }),
      consent(
        'I agree that my details are stored to organise volunteering, as described in the privacy policy.',
        'privacy policy',
      ),
      source(),
    ]),
  ],
});
