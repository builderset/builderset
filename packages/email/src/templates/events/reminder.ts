import { pad, row, section } from '../../core';
import {
  bullets,
  button,
  details,
  eyebrow,
  footerSection,
  formatted,
  heading,
  logoHeader,
  note,
  outlineButton,
  panel,
  paragraph,
  subheading,
  v,
} from '../blocks';
import { defineTemplate } from '../categories';

export default defineTemplate({
  id: 'reminder',
  category: 'events',
  name: { en: 'Appointment reminder', sq: 'Kujtesë takimi', de: 'Terminerinnerung' },
  description: {
    en: 'The day and time on a coloured tile beside the details, two buttons and what to bring',
    sq: 'Dita dhe ora në një pllakë me ngjyrë pranë detajeve, dy butona dhe çfarë të merrni me vete',
    de: 'Tag und Uhrzeit auf farbiger Kachel neben den Details, zwei Knöpfe und was mitzubringen ist',
  },
  subject: 'Reminder: {{ appointment.service }} on {{ appointment.starts_at | date }}',
  preheader: 'See you at {{ appointment.starts_at | time }}. Add it to your calendar in one tap.',
  settings: { font: 'inter', backdrop: '#f0f9ff' },
  variables: [
    'appointment.service',
    'appointment.starts_at',
    'appointment.with',
    'appointment.location',
    'appointment.calendar_url',
    'appointment.reschedule_url',
  ],
  sections: [
    logoHeader('left'),
    section({ padding: pad(16, 32, 8) }, [
      row('100', [
        [
          eyebrow('Reminder'),
          heading('Your appointment is coming up', { size: 26 }),
          paragraph([
            'Hi ',
            v('recipient.name', 'there'),
            ', this is a friendly reminder of your appointment with ',
            v('appointment.with'),
            '. Here are the details:',
          ]),
        ],
      ]),
      row(
        '33-67',
        [
          panel(
            [
              paragraph([formatted('appointment.starts_at', 'date')], {
                size: 14,
                align: 'center',
                color: '#e0f2fe',
                padding: pad(0),
              }),
              heading([formatted('appointment.starts_at', 'time')], {
                size: 32,
                align: 'center',
                color: '#ffffff',
                padding: pad(4, 0, 0),
              }),
            ],
            { background: 'brand.primary', padding: pad(24, 12) },
          ),
          [
            details([
              ['What', '{{ appointment.service }}'],
              ['With', '{{ appointment.with }}'],
              ['Where', '{{ appointment.location }}'],
            ]),
          ],
        ],
        { verticalAlign: 'middle', padding: pad(8, 0) },
      ),
      row('50-50', [
        [button('Add to calendar', '{{ appointment.calendar_url }}', { align: 'center' })],
        [outlineButton('Reschedule', '{{ appointment.reschedule_url }}', { align: 'center' })],
      ]),
    ]),
    section({ padding: pad(16, 32, 24) }, [
      row('100', [
        panel([
          subheading('Before you come', { size: 17, padding: pad(0, 0, 4) }),
          bullets(
            [
              'Arrive five minutes early to check in.',
              'Bring a photo ID and any documents we asked for.',
              'Running late? Call us and we will do our best to fit you in.',
            ],
            'check',
            { size: 15 },
          ),
        ]),
      ]),
      row('100', [
        [
          note(
            'Can’t make it? Please reschedule at least 24 hours before, so someone else can take the slot.',
          ),
        ],
      ]),
    ]),
    footerSection(),
  ],
});
