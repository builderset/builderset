import { pad, row, section } from '../../core';
import {
  button,
  details,
  eyebrow,
  footerSection,
  heading,
  logoHeader,
  note,
  outlineButton,
  paragraph,
  v,
} from '../blocks';
import { defineTemplate } from '../categories';

export default defineTemplate({
  id: 'new-sign-in',
  category: 'account',
  name: { en: 'New sign-in', sq: 'Hyrje e re', de: 'Neue Anmeldung' },
  description: {
    en: 'A security alert: the device, place and time of a new sign-in, and two clear answers',
    sq: 'Një alarm sigurie: pajisja, vendi dhe koha e një hyrjeje të re, dhe dy përgjigje të qarta',
    de: 'Ein Sicherheitshinweis: Gerät, Ort und Zeit einer neuen Anmeldung, und zwei klare Antworten',
  },
  subject: 'New sign-in to your {{ brand.name }} account',
  preheader: 'From {{ sign_in.device }} in {{ sign_in.location }}. Was this you?',
  settings: { font: 'inter', backdrop: '#fefce8' },
  variables: [
    'sign_in.at',
    'sign_in.device',
    'sign_in.browser',
    'sign_in.location',
    'sign_in.ip',
    'account.url',
    'account.security_url',
  ],
  sections: [
    logoHeader('left', { background: '#fef3c7', padding: pad(20, 32) }),
    section({ padding: pad(28, 32, 8) }, [
      row('100', [
        [
          eyebrow('Security alert', { color: '#b45309' }),
          heading('New sign-in to your account', { size: 26 }),
          paragraph([
            'Hi ',
            v('recipient.name', 'there'),
            ', we noticed a sign-in to your ',
            v('brand.name'),
            ' account from a device we haven’t seen before.',
          ]),
          details(
            [
              ['When', '{{ sign_in.at | datetime }}'],
              ['Device', '{{ sign_in.device }}'],
              ['Browser', '{{ sign_in.browser }}'],
              ['Location', '{{ sign_in.location }}'],
              ['IP address', '{{ sign_in.ip }}'],
            ],
            { background: '#fffbeb', borderColor: '#fde68a' },
          ),
        ],
      ]),
    ]),
    section({ padding: pad(8, 32, 24) }, [
      row('100', [[paragraph('Was this you?', { weight: '700', padding: pad(0) })]]),
      row('50-50', [
        [outlineButton('Yes, it was me', '{{ account.url }}', { align: 'center' })],
        [
          button('No, secure my account', '{{ account.security_url }}', {
            align: 'center',
            background: '#b91c1c',
          }),
        ],
      ]),
      row('100', [
        [
          note(
            'If it was you, you can ignore this email. If not, change your password now — we will sign out every device but this one.',
          ),
        ],
      ]),
    ]),
    footerSection(),
  ],
});
