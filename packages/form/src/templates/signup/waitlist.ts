import { step } from '../../core';
import { defineTemplate } from '../categories';
import {
  choice,
  consent,
  email,
  fullName,
  locked,
  slider,
  source,
  text,
  textarea,
} from '../fields';

export default defineTemplate({
  id: 'waitlist',
  category: 'signup',
  name: { en: 'Waitlist', sq: 'Lista e pritjes', de: 'Warteliste' },
  description: {
    en: 'A place in line for a launch: who they are, their team size and what they would use it for',
    sq: 'Një vend në radhë për një lansim: kush janë, sa i madh është ekipi dhe për çfarë do ta përdorin',
    de: 'Ein Platz in der Warteschlange für einen Launch: wer sie sind, die Teamgröße und wofür sie es nutzen',
  },
  title: 'Join the waitlist',
  intro:
    'We are letting people in a few at a time. Save your place and we will email you when it is your turn.',
  settings: {
    buttons: { submit: 'Join the waitlist' },
    after: {
      title: 'You’re on the list',
      message: 'We will email {{email}} as soon as your invitation is ready.',
    },
    spam: { blockDisposable: true },
    limits: { oncePer: 'email' },
    style: { look: 'dark', accent: '#8b5cf6', font: 'sora', width: 520 },
  },
  steps: [
    step('Waitlist', [
      email({ ...locked('Your place in line is held by this address') }),
      fullName({ required: false }),
      text('Company', 'company'),
      choice(
        'What describes you best?',
        'role',
        ['Founder', 'Developer', 'Designer', 'Marketer', 'Other'],
        'buttons',
      ),
      slider('How many people would use it?', 'team_size', {
        min: 1,
        max: 100,
        step: 1,
        start: 5,
        unit: 'people',
      }),
      textarea('What would you use it for?', 'use_case', {
        rows: 3,
        help: 'The best answers get their invitation first.',
      }),
      consent(
        'Email me when my invitation is ready. I agree to the privacy policy.',
        'privacy policy',
      ),
      source(),
    ]),
  ],
});
