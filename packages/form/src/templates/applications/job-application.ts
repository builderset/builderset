import { step } from '../../core';
import { defineTemplate } from '../categories';
import {
  checks,
  choice,
  consent,
  date,
  email,
  files,
  fullName,
  half,
  locked,
  number,
  phone,
  source,
  text,
  textarea,
  when,
  yesNo,
} from '../fields';

export default defineTemplate({
  id: 'job-application',
  category: 'applications',
  name: { en: 'Job application', sq: 'Aplikim për punë', de: 'Stellenbewerbung' },
  description: {
    en: 'The applicant, their experience, then the CV — in three numbered steps',
    sq: 'Kandidati, përvoja, pastaj CV-ja — në tre hapa të numëruar',
    de: 'Die Person, ihre Erfahrung, dann der Lebenslauf — in drei nummerierten Schritten',
  },
  title: 'Apply for this job',
  intro:
    'Tell us about yourself and send your CV. It takes about five minutes, and you can come back to it later.',
  settings: {
    progress: 'numbers',
    buttons: { submit: 'Send application', next: 'Next' },
    after: {
      title: 'Thank you for applying, {{name}}',
      message:
        'We have your application for {{position}} and reply to every applicant within two weeks.',
    },
    autoReply: {
      enabled: true,
      to: 'email',
      subject: 'Your application: {{position}}',
      body: 'Hello {{name}},\n\nThank you for applying for {{position}}. We have your application and read every one of them carefully. You will hear from us within two weeks, whatever the outcome.\n\nBest wishes,\nThe hiring team',
    },
    privacy: { keepMonths: 6 },
  },
  steps: [
    step('About you', [
      text('Position', 'position', {
        prefill: 'position',
        help: 'Filled in from the job ad.',
        ...locked('Applications are sorted by position'),
      }),
      fullName(),
      email({ ...half, ...locked('We reply to applicants at this address') }),
      phone({ ...half, required: true }),
      text('LinkedIn or portfolio', 'portfolio', { placeholder: 'https://' }),
    ]),
    step('Experience', [
      choice(
        'Years of experience',
        'experience',
        ['Less than 1', '1–3', '3–5', '5–10', 'More than 10'],
        'buttons',
        { required: true },
      ),
      text('Current or last job title', 'current_role', half),
      text('Current or last employer', 'current_employer', half),
      choice('When could you start?', 'start', [
        'Right away',
        'Within a month',
        'In 1–3 months',
        'Later',
      ]),
      date('From which date?', 'start_date', when('start', 'is', 'Later')),
      number('Salary expectation', 'salary', {
        unit: '€ / month',
        help: 'Gross. Optional.',
        ...half,
      }),
      yesNo('Do you need a work permit?', 'permit', half),
      textarea('Why would you like to join us?', 'motivation', {
        rows: 5,
        ...checks({ maxLength: 2000 }),
      }),
    ]),
    step('Files', [
      files('CV', 'cv', ['pdf', 'doc', 'docx'], {
        maxFiles: 1,
        maxMb: 10,
        ...locked('An application needs a CV'),
      }),
      files('Cover letter or other documents', 'documents', ['pdf', 'doc', 'docx', 'jpg', 'png'], {
        maxFiles: 3,
      }),
      consent(
        'I agree that my application is stored for this and future openings, as described in the privacy policy.',
        'privacy policy',
      ),
      source(),
    ]),
  ],
});
