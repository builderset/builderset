import { step } from '../../core';
import { defineTemplate } from '../categories';
import {
  choice,
  consent,
  dropdown,
  email,
  files,
  fullName,
  half,
  locked,
  phone,
  source,
  text,
  textarea,
} from '../fields';

export default defineTemplate({
  id: 'partnership',
  category: 'applications',
  name: { en: 'Partnership proposal', sq: 'Propozim partneriteti', de: 'Partnerschaftsanfrage' },
  description: {
    en: 'The company, the person, the kind of partnership and the proposal, with a deck',
    sq: 'Kompania, personi, lloji i partneritetit dhe propozimi, me një prezantim',
    de: 'Das Unternehmen, die Person, die Art der Partnerschaft und der Vorschlag, mit Präsentation',
  },
  title: 'Partner with us',
  intro: 'Resellers, integrations, co-marketing or sponsorship — tell us what you have in mind.',
  settings: {
    buttons: { submit: 'Send proposal', next: 'Next' },
    after: {
      title: 'Thank you, {{name}}',
      message:
        'Our partnerships team reads every proposal and will reply to {{email}} within five working days.',
    },
    autoReply: {
      enabled: true,
      to: 'email',
      subject: 'Your partnership proposal from {{company}}',
      body: 'Hello {{name}},\n\nThank you for your proposal. Our partnerships team will look at it and reply within five working days.\n\nBest wishes,\nThe partnerships team',
    },
    style: { accent: '#0f172a', font: 'inter' },
  },
  steps: [
    step('Your company', [
      text('Company', 'company', locked('A partnership needs the company')),
      text('Website', 'website', { ...half, placeholder: 'https://' }),
      dropdown(
        'Industry',
        'industry',
        ['Software', 'E-commerce', 'Agency', 'Media', 'Finance', 'Education', 'Other'],
        half,
      ),
      dropdown('Company size', 'company_size', [
        '1–10',
        '11–50',
        '51–200',
        '201–1000',
        'More than 1000',
      ]),
      fullName(),
      text('Your role', 'role', half),
      email({ ...half, ...locked('We reply to proposals at this address') }),
      phone(),
    ]),
    step('The proposal', [
      choice(
        'What kind of partnership?',
        'kind',
        ['Reseller', 'Integration', 'Co-marketing', 'Sponsorship', 'Something else'],
        'cards',
        { required: true },
      ),
      textarea('Your proposal', 'proposal', {
        rows: 6,
        help: 'What you suggest, what each side brings and what success looks like.',
        ...locked('A partnership request needs the proposal'),
      }),
      files('Deck or one-pager', 'deck', ['pdf', 'ppt', 'pptx', 'key'], { maxFiles: 1, maxMb: 25 }),
      consent(
        'I agree that these details are stored to answer the proposal, as described in the privacy policy.',
        'privacy policy',
      ),
      source(),
    ]),
  ],
});
