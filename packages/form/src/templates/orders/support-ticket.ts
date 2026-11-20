import { step } from '../../core';
import { defineTemplate } from '../categories';
import {
  checks,
  choice,
  consent,
  email,
  files,
  fullName,
  half,
  locked,
  text,
  textarea,
  when,
  yesNo,
} from '../fields';

export default defineTemplate({
  id: 'support-ticket',
  category: 'orders',
  name: { en: 'Support ticket', sq: 'Kërkesë për mbështetje', de: 'Support-Ticket' },
  description: {
    en: 'A topic, how urgent it is, a subject and description — with steps to reproduce for technical problems',
    sq: 'Tema, sa urgjente është, subjekti dhe përshkrimi — me hapat për ta përsëritur për problemet teknike',
    de: 'Thema, Dringlichkeit, Betreff und Beschreibung — mit Schritten zum Nachstellen bei technischen Problemen',
  },
  title: 'Contact support',
  intro:
    'Tell us what is wrong and we will get on it. The more detail you give, the faster we can help.',
  settings: {
    buttons: { submit: 'Open ticket' },
    after: {
      title: 'Ticket received',
      message:
        'Thank you, {{name}}. We will reply to {{email}} — urgent tickets within four hours.',
    },
    autoReply: {
      enabled: true,
      to: 'email',
      subject: 'We got your ticket: {{subject}}',
      body: 'Hello {{name}},\n\nThank you for contacting support. We have your ticket “{{subject}}” (priority: {{priority}}) and will reply as soon as we can — urgent tickets within four hours.\n\nTo add anything, just reply to this email.\n\nThe support team',
    },
    style: { accent: '#0891b2' },
  },
  steps: [
    step('Ticket', [
      fullName(half),
      email({ ...half, ...locked('Replies to the ticket go to this address') }),
      choice(
        'What is it about?',
        'topic',
        ['Billing', 'Technical problem', 'Account', 'Feature request', 'Other'],
        'buttons',
        { required: true },
      ),
      choice(
        'How urgent is it?',
        'priority',
        ['Low', 'Normal', 'High', 'Urgent — nothing works'],
        'list',
        {
          defaultValue: 'Normal',
        },
      ),
      text('Subject', 'subject', {
        placeholder: 'One line that sums it up',
        ...locked('A ticket needs a subject'),
        ...checks({ maxLength: 120 }),
      }),
      textarea('Describe the problem', 'description', {
        rows: 6,
        help: 'What you did, what you expected and what happened instead.',
        ...locked('A ticket needs a description'),
      }),
      text('Browser and device', 'environment', {
        placeholder: 'Chrome 131 on Windows 11',
        ...when('topic', 'is', 'Technical problem'),
      }),
      yesNo(
        'Can you make it happen again?',
        'reproducible',
        when('topic', 'is', 'Technical problem'),
      ),
      textarea('Steps to make it happen', 'steps', {
        rows: 4,
        placeholder: '1. Open…\n2. Click…\n3. See the error',
        ...when('reproducible', 'is', 'yes'),
      }),
      files('Screenshots or logs', 'attachments', ['png', 'jpg', 'pdf', 'txt', 'log', 'zip'], {
        maxFiles: 5,
        maxMb: 20,
      }),
      consent(
        'I agree that my details are stored to handle my ticket, as described in the privacy policy.',
        'privacy policy',
      ),
    ]),
  ],
});
