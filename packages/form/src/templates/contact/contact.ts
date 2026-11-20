import { step } from '../../core';
import { defineTemplate } from '../categories';
import {
  checks,
  choice,
  consent,
  email,
  fullName,
  half,
  locked,
  message,
  source,
  text,
  when,
} from '../fields';

export default defineTemplate({
  id: 'contact',
  category: 'contact',
  name: { en: 'Contact us', sq: 'Na kontaktoni', de: 'Kontakt' },
  description: {
    en: 'Name, email, a topic and the message — with an auto-reply',
    sq: 'Emri, emaili, tema dhe mesazhi — me përgjigje automatike',
    de: 'Name, E-Mail, ein Thema und die Nachricht — mit automatischer Antwort',
  },
  title: 'Get in touch',
  intro: 'Ask us anything. We read every message and reply within one working day.',
  settings: {
    buttons: { submit: 'Send message' },
    after: {
      title: 'Thank you, {{name}}!',
      message: 'We got your message and will reply to {{email}} within one working day.',
    },
    autoReply: {
      enabled: true,
      to: 'email',
      subject: 'We got your message, {{name}}',
      body: 'Hello {{name}},\n\nThank you for writing to us about “{{topic}}”. We read every message and will reply within one working day.\n\nBest wishes,\nThe team',
    },
  },
  steps: [
    step('Contact', [
      fullName(half),
      email({ ...half, ...locked('Replies go to this address') }),
      choice(
        'What is it about?',
        'topic',
        ['A question', 'Sales', 'Support', 'Press', 'Something else'],
        'buttons',
      ),
      text('Order or account number', 'reference', {
        help: 'If it is about an order, we find it faster with the number.',
        ...when('topic', 'is', 'Support'),
      }),
      message('Your message', {
        rows: 6,
        placeholder: 'How can we help?',
        ...locked('A contact form needs the message'),
        ...checks({ minLength: 10, maxLength: 3000 }),
      }),
      consent(
        'I agree that my details are stored to answer my message, as described in the privacy policy.',
        'privacy policy',
      ),
      source(),
    ]),
  ],
});
