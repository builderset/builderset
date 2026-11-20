import { step } from '../../core';
import { defineTemplate } from '../categories';
import { choice, choices, consent, email, locked, source, text } from '../fields';

export default defineTemplate({
  id: 'newsletter',
  category: 'signup',
  name: { en: 'Newsletter', sq: 'Buletini', de: 'Newsletter' },
  description: {
    en: 'An email, a first name and the topics they want — one sign-up per address',
    sq: 'Emaili, emri dhe temat që dëshirojnë — një regjistrim për çdo adresë',
    de: 'E-Mail, Vorname und die gewünschten Themen — eine Anmeldung pro Adresse',
  },
  title: 'Subscribe to our newsletter',
  intro: 'The best of what we do, straight to your inbox. No spam — unsubscribe whenever you like.',
  settings: {
    marker: 'optional',
    buttons: { submit: 'Subscribe' },
    after: {
      title: 'You’re subscribed!',
      message: 'Thank you, {{first_name}}. The first issue is on its way to {{email}}.',
    },
    autoReply: {
      enabled: true,
      to: 'email',
      subject: 'Welcome to our newsletter',
      body: 'Hello {{first_name}},\n\nThank you for subscribing. You will hear from us {{frequency}}, about: {{topics}}.\n\nYou can unsubscribe at any time with the link at the bottom of every email.\n\nSee you in your inbox!',
    },
    spam: { blockDisposable: true },
    limits: { oncePer: 'email' },
    style: { width: 480, fullWidthButtons: true },
  },
  steps: [
    step('Subscribe', [
      email({
        placeholder: 'you@example.com',
        ...locked('A newsletter needs an address to send to'),
      }),
      text('First name', 'first_name', { help: 'So we can greet you properly.' }),
      choices(
        'What would you like to hear about?',
        'topics',
        ['News', 'Offers', 'Events', 'Tips & guides'],
        'buttons',
      ),
      choice('How often?', 'frequency', ['Weekly', 'Monthly'], 'buttons', {
        defaultValue: 'Monthly',
      }),
      consent(
        'Yes, send me the newsletter. I can unsubscribe at any time; see the privacy policy.',
        'privacy policy',
      ),
      source(),
    ]),
  ],
});
