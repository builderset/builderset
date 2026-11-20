import { step } from '../../core';
import { defineTemplate } from '../categories';
import { choice, half, locked, paragraph, rating, source, textarea, when, yesNo } from '../fields';

export default defineTemplate({
  id: 'customer-satisfaction',
  category: 'feedback',
  name: { en: 'Customer satisfaction', sq: 'Kënaqësia e klientit', de: 'Kundenzufriedenheit' },
  description: {
    en: 'An overall rating, stars for quality, delivery, service and value, then what went wrong',
    sq: 'Një vlerësim i përgjithshëm, yje për cilësinë, dorëzimin, shërbimin dhe çmimin, pastaj çfarë shkoi keq',
    de: 'Eine Gesamtbewertung, Sterne für Qualität, Lieferung, Service und Preis, dann was schiefging',
  },
  title: 'How was your experience?',
  intro: 'Tell us how we did. Your answers are anonymous and take about two minutes.',
  settings: {
    buttons: { submit: 'Send answers', next: 'Next' },
    after: {
      title: 'Thank you!',
      message: 'Your answers help us do better — for you and for everyone else.',
    },
    limits: { oncePer: 'device' },
    style: { accent: '#e06a1b' },
  },
  steps: [
    step('Your experience', [
      rating(
        'Overall, how satisfied are you?',
        'satisfaction',
        locked('The survey is built on this rating'),
      ),
      choice(
        'How did you buy from us?',
        'channel',
        ['Online', 'In a store', 'By phone'],
        'buttons',
      ),
      paragraph('How would you rate us on…'),
      rating('Quality of the product', 'quality', half),
      rating('Speed of delivery', 'delivery', half),
      rating('Friendliness of our team', 'service', half),
      rating('Value for money', 'value', half),
    ]),
    step('Tell us more', [
      yesNo('Did something go wrong?', 'problem'),
      textarea('Details of the problem', 'problem_details', {
        rows: 4,
        required: true,
        help: 'What happened, and when? We look into every problem.',
        ...when('problem', 'is', 'yes'),
      }),
      yesNo('Would you buy from us again?', 'again'),
      textarea('Anything else you would like to tell us?', 'comments', { rows: 3 }),
      source(),
    ]),
  ],
});
