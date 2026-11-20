import { step } from '../../core';
import { defineTemplate } from '../categories';
import { consent, email, locked, scale, source, textarea, when, yesNo } from '../fields';

export default defineTemplate({
  id: 'nps-survey',
  category: 'feedback',
  name: { en: 'NPS survey', sq: 'Anketë NPS', de: 'NPS-Umfrage' },
  description: {
    en: 'The 0–10 recommendation score, the reason, and a follow-up question that depends on it',
    sq: 'Nota 0–10 e rekomandimit, arsyeja dhe një pyetje vijuese sipas notës',
    de: 'Der Empfehlungswert von 0 bis 10, der Grund und eine Folgefrage, die davon abhängt',
  },
  title: 'How are we doing?',
  intro: 'One question, maybe two. It takes thirty seconds and helps us a lot.',
  settings: {
    progress: 'none',
    marker: 'optional',
    buttons: { submit: 'Send feedback' },
    after: {
      title: 'Thank you for your feedback',
      message: 'We read every answer, and it shapes what we work on next.',
    },
    limits: { oncePer: 'device' },
  },
  steps: [
    step('Your score', [
      scale(
        'How likely are you to recommend us to a friend or colleague?',
        'score',
        ['Not at all likely', 'Extremely likely'],
        locked('An NPS survey is built on this score'),
      ),
      textarea('What is the main reason for your score?', 'reason', { rows: 3 }),
      textarea('What would make it a 10?', 'improve', { rows: 3, ...when('score', 'lt', '9') }),
      textarea('What do you like most about us?', 'favourite', {
        rows: 3,
        ...when('score', 'gt', '8'),
      }),
      yesNo('May we contact you about your answer?', 'follow_up'),
      email({ help: 'Only to talk about your feedback.', ...when('follow_up', 'is', 'yes') }),
      consent(
        'I agree to be contacted about my feedback, as described in the privacy policy.',
        'privacy policy',
        when('follow_up', 'is', 'yes'),
      ),
      source(),
    ]),
  ],
});
