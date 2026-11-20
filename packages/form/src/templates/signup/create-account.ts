import { step } from '../../core';
import { defineTemplate } from '../categories';
import {
  checks,
  choice,
  consent,
  dropdown,
  email,
  fullName,
  half,
  locked,
  number,
  password,
  phone,
  source,
  when,
  yesNo,
} from '../fields';

export default defineTemplate({
  id: 'create-account',
  category: 'signup',
  name: { en: 'Create an account', sq: 'Krijo llogari', de: 'Konto erstellen' },
  description: {
    en: 'Email and password first, then a short profile — with a robot check',
    sq: 'Fillimisht emaili dhe fjalëkalimi, pastaj një profil i shkurtër — me kontroll kundër robotëve',
    de: 'Zuerst E-Mail und Passwort, dann ein kurzes Profil — mit Roboter-Prüfung',
  },
  title: 'Create your account',
  intro: 'It takes a minute. You can change everything later in your settings.',
  settings: {
    buttons: { submit: 'Create account', next: 'Next' },
    after: {
      title: 'Welcome, {{name}}!',
      message: 'Your account for {{email}} is ready. Check your inbox to confirm the address.',
    },
    autoReply: {
      enabled: true,
      to: 'email',
      subject: 'Confirm your email address',
      body: 'Hello {{name}},\n\nWelcome aboard! Please confirm your email address with the link in the next email, and your account is ready to use.\n\nIf you did not create this account, you can ignore this message.',
    },
    spam: { captcha: 'checkbox', blockDisposable: true },
    limits: { oncePer: 'email' },
  },
  steps: [
    step('Your account', [
      email({ ...locked('The account signs in with this address') }),
      password('Password', {
        help: 'At least 8 characters.',
        ...locked('An account needs a password'),
        ...checks({ minLength: 8, maxLength: 128 }),
      }),
    ]),
    step('About you', [
      fullName(),
      phone(half),
      dropdown(
        'Country',
        'country',
        [
          'Albania',
          'Kosovo',
          'North Macedonia',
          'Germany',
          'Austria',
          'Switzerland',
          'Italy',
          'United Kingdom',
          'United States',
          'Other',
        ],
        half,
      ),
      choice('How will you use it?', 'use', ['For myself', 'For my team', 'For a client'], 'cards'),
      number('How many people are in your team?', 'team_size', {
        unit: 'people',
        ...when('use', 'is', 'For my team'),
        ...checks({ min: 2, max: 1000 }),
      }),
      yesNo('Send me product news now and then', 'product_news'),
      consent('I accept the terms of service and the privacy policy.', 'terms of service'),
      source(),
    ]),
  ],
});
