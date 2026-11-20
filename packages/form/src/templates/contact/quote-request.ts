import { step } from '../../core';
import { defineTemplate } from '../categories';
import {
  checks,
  choice,
  consent,
  date,
  dropdown,
  email,
  files,
  fullName,
  half,
  locked,
  phone,
  slider,
  source,
  text,
  textarea,
} from '../fields';

export default defineTemplate({
  id: 'quote-request',
  category: 'contact',
  name: { en: 'Quote request', sq: 'Kërkesë për ofertë', de: 'Angebotsanfrage' },
  description: {
    en: 'What they need, the budget and timing, then how to reach them — in three steps',
    sq: 'Çfarë u duhet, buxheti dhe afati, pastaj si t’i kontaktoni — në tre hapa',
    de: 'Was gebraucht wird, Budget und Zeitrahmen, dann die Kontaktdaten — in drei Schritten',
  },
  title: 'Request a quote',
  intro:
    'Tell us about your project and we will send you a tailored quote within two working days.',
  settings: {
    progress: 'numbers',
    buttons: { submit: 'Request my quote', next: 'Next' },
    after: {
      title: 'Thank you, {{name}}',
      message: 'We will send your quote for {{service}} to {{email}} within two working days.',
    },
    autoReply: {
      enabled: true,
      to: 'email',
      subject: 'Your quote request: {{service}}',
      body: 'Hello {{name}},\n\nThank you for your request. We are looking at the details and will send your quote within two working days. If anything is unclear, we will call or write before then.\n\nBest wishes,\nThe team',
    },
  },
  steps: [
    step('What you need', [
      choice(
        'What can we help with?',
        'service',
        ['Website', 'Online shop', 'Branding', 'Marketing', 'Something else'],
        'cards',
        locked('A quote starts from the service'),
      ),
      text('Your project in one line', 'summary', {
        placeholder: 'A new website for our bakery',
        ...checks({ maxLength: 120 }),
      }),
    ]),
    step('Details', [
      slider(
        'Budget',
        'budget',
        { min: 1000, max: 50000, step: 500, start: 5000, unit: '€' },
        { help: 'A rough figure is fine.' },
      ),
      dropdown(
        'When do you need it?',
        'timeline',
        [
          'As soon as possible',
          'Within a month',
          'In 1–3 months',
          'In 3–6 months',
          'No fixed date',
        ],
        half,
      ),
      date('Ideal start date', 'start_date', half),
      textarea('Details', 'details', {
        rows: 6,
        help: 'Goals, examples you like, anything we should know.',
      }),
      files('Briefs or examples', 'attachments', ['pdf', 'doc', 'docx', 'jpg', 'png'], {
        maxFiles: 5,
        maxMb: 20,
      }),
    ]),
    step('Your details', [
      fullName(half),
      text('Company', 'company', half),
      email({ ...half, ...locked('The quote is sent to this address') }),
      phone(half),
      choice('How should we reach you?', 'contact_by', ['Email', 'Phone'], 'buttons'),
      consent(
        'I agree that my details are stored to prepare the quote, as described in the privacy policy.',
        'privacy policy',
      ),
      source(),
    ]),
  ],
});
