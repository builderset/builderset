import { step } from '../../core';
import { defineTemplate } from '../categories';
import {
  checks,
  choice,
  consent,
  dropdown,
  email,
  files,
  locked,
  scale,
  text,
  textarea,
  when,
  yesNo,
} from '../fields';

export default defineTemplate({
  id: 'product-feedback',
  category: 'feedback',
  name: { en: 'Product feedback', sq: 'Mendime për produktin', de: 'Produkt-Feedback' },
  description: {
    en: 'Ideas, bugs and praise, with screenshots for bugs and an invitation to the beta',
    sq: 'Ide, defekte dhe lavdërime, me pamje ekrani për defektet dhe ftesë për versionin beta',
    de: 'Ideen, Fehler und Lob, mit Screenshots bei Fehlern und einer Einladung zur Beta',
  },
  title: 'Help us make it better',
  intro: 'Found a bug, have an idea or just love something? We want to hear it.',
  settings: {
    progress: 'numbers',
    buttons: { submit: 'Send feedback', next: 'Next' },
    after: {
      title: 'Thank you — we got it',
      message: 'Every piece of feedback goes to the people who build the product.',
    },
    style: { accent: '#2563eb', font: 'inter' },
  },
  steps: [
    step('The product', [
      dropdown('Which product is it about?', 'product', [
        'Mobile app',
        'Website',
        'Desktop app',
        'Something else',
      ]),
      choice('How often do you use it?', 'frequency', [
        'Every day',
        'A few times a week',
        'A few times a month',
        'Rarely',
      ]),
      scale('How easy is it to use?', 'ease', ['Very hard', 'Very easy'], { from: 1, to: 5 }),
    ]),
    step('Your feedback', [
      choice(
        'What kind of feedback is it?',
        'kind',
        ['An idea', 'A bug', 'Praise', 'A question'],
        'cards',
      ),
      textarea('Your feedback', 'feedback', {
        rows: 5,
        placeholder: 'What happened, or what would you like to see?',
        ...locked('Product feedback needs the feedback itself'),
        ...checks({ minLength: 10, maxLength: 4000 }),
      }),
      text('Device and version', 'device', {
        placeholder: 'iPhone 15, iOS 18.2',
        ...when('kind', 'is', 'A bug'),
      }),
      files('Screenshots or a recording', 'screenshots', ['png', 'jpg', 'gif', 'mp4'], {
        maxFiles: 3,
        maxMb: 25,
        ...when('kind', 'is', 'A bug'),
      }),
    ]),
    step('Stay in touch', [
      choice(
        'What describes you best?',
        'role',
        ['Personal use', 'Small business', 'Larger company'],
        'buttons',
      ),
      yesNo('Would you like to try new features before anyone else?', 'beta'),
      email({ help: 'We send beta invitations here.', ...when('beta', 'is', 'yes') }),
      consent(
        'I agree to receive beta invitations by email, as described in the privacy policy.',
        'privacy policy',
        when('beta', 'is', 'yes'),
      ),
    ]),
  ],
});
