import { step } from '../../core';
import { defineTemplate } from '../categories';
import {
  choice,
  consent,
  date,
  dropdown,
  fullName,
  half,
  locked,
  phone,
  textarea,
} from '../fields';

export default defineTemplate({
  id: 'call-me-back',
  category: 'contact',
  name: { en: 'Call me back', sq: 'Më telefononi', de: 'Rückruf' },
  description: {
    en: 'A short form for a phone number and the best time to call',
    sq: 'Një formular i shkurtër për numrin e telefonit dhe orën më të mirë për t’u telefonuar',
    de: 'Ein kurzes Formular für die Telefonnummer und die beste Zeit für den Rückruf',
  },
  title: 'We call you back',
  intro: 'Leave your number and tell us when suits you. It takes less than a minute.',
  settings: {
    buttons: { submit: 'Call me back' },
    after: {
      title: 'We will call you, {{name}}',
      message: 'Expect our call on {{phone}} — {{best_time}}.',
    },
    style: { width: 480, accent: '#0f9d58', fullWidthButtons: true },
  },
  steps: [
    step('Call back', [
      fullName(),
      phone({
        help: 'With the country code if you are abroad.',
        ...locked('We need a number to call'),
      }),
      choice(
        'When suits you best?',
        'best_time',
        ['Morning (9–12)', 'Afternoon (12–17)', 'Evening (17–19)'],
        'buttons',
        { required: true },
      ),
      date('Which day?', 'call_day', half),
      dropdown('Language', 'language', ['English', 'Albanian', 'German', 'Italian'], half),
      textarea('What is it about?', 'topic', {
        rows: 3,
        help: 'A line is enough — so the right person calls you.',
      }),
      consent('I agree to be called about my request and to the privacy policy.', 'privacy policy'),
    ]),
  ],
});
